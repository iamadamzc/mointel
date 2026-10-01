import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import {
  LEVELS_REFRESH_KILL_MS,
  maybeStartLevelsRefresh,
  nextLevelsRefreshAt,
  spawnLevelsRefreshChild,
  startLevelsRefreshLoop,
  type ChildLike,
} from '@/lib/research/levelsRefreshJob';
import { latestFiveMinuteClose } from '@/lib/market/levels';
import { addDays, etDateString } from '@/lib/market/session';
import { openDatabase } from '@/lib/market/store/db';
import { openHistoryStore, readResistanceLevels } from '@/lib/market/store/historyStore';
import { upsertMinuteBars } from '@/lib/market/store/repo';

/*
 * The levels refresh loop in the research worker: one child per 5m close +
 * 20 s, never two at once, killed at 270 s, stopped (and its child killed) on
 * both of the worker's exits. Timers and the clock are a fake driven by hand;
 * the child is a fake whose exit the test delivers.
 */

const at = (iso: string) => Date.parse(iso);

class FakeClock {
  current: number;
  private nextId = 1;
  readonly timers = new Map<number, { at: number; run: () => void }>();

  constructor(start: number) {
    this.current = start;
  }

  now = () => this.current;

  setTimer = (run: () => void, ms: number) => {
    const id = this.nextId++;
    this.timers.set(id, { at: this.current + ms, run });
    return id;
  };

  clearTimer = (handle: unknown) => {
    this.timers.delete(handle as number);
  };

  /** Fires every timer due by `target`, in time order, with the clock at each one's moment. */
  advanceTo(target: number) {
    for (;;) {
      const due = [...this.timers.entries()]
        .filter(([, timer]) => timer.at <= target)
        .sort((a, b) => a[1].at - b[1].at || a[0] - b[0])[0];
      if (!due) break;
      this.timers.delete(due[0]);
      this.current = due[1].at;
      due[1].run();
    }
    this.current = target;
  }

  pendingAt(): string[] {
    return [...this.timers.values()].map((timer) => new Date(timer.at).toISOString()).sort();
  }
}

class FakeChild implements ChildLike {
  readonly pid: number | undefined = 4242;
  readonly kills: Array<NodeJS.Signals | undefined> = [];
  private exitListeners: Array<(code: number | null, signal: NodeJS.Signals | null) => void> = [];
  private errorListeners: Array<(error: Error) => void> = [];

  on(event: 'exit' | 'error', listener: never): this {
    if (event === 'exit') this.exitListeners.push(listener);
    else this.errorListeners.push(listener);
    return this;
  }

  kill(signal?: NodeJS.Signals): boolean {
    this.kills.push(signal);
    return true;
  }

  exit(code: number | null, signal: NodeJS.Signals | null = null) {
    for (const listener of this.exitListeners) listener(code, signal);
  }

  error(message: string) {
    for (const listener of this.errorListeners) listener(new Error(message));
  }
}

function harness(start = at('2026-09-29T16:02:30.000Z')) {
  const clock = new FakeClock(start);
  const children: FakeChild[] = [];
  const lines: string[] = [];
  const handle = startLevelsRefreshLoop({
    spawnRefresh: () => {
      const child = new FakeChild();
      children.push(child);
      return child;
    },
    now: clock.now,
    setTimer: clock.setTimer,
    clearTimer: clock.clearTimer,
    log: (line) => lines.push(line),
  });
  return { clock, children, lines, handle };
}

describe('nextLevelsRefreshAt: the next 5m close + 20 s', () => {
  it('is strictly after the moment, on UTC epoch multiples of 300 s', () => {
    expect(new Date(nextLevelsRefreshAt(at('2026-09-29T16:02:30.000Z'))).toISOString()).toBe('2026-09-29T16:05:20.000Z');
    expect(new Date(nextLevelsRefreshAt(at('2026-09-29T16:00:00.000Z'))).toISOString()).toBe('2026-09-29T16:00:20.000Z');
    expect(new Date(nextLevelsRefreshAt(at('2026-09-29T16:00:19.999Z'))).toISOString()).toBe('2026-09-29T16:00:20.000Z');
    expect(new Date(nextLevelsRefreshAt(at('2026-09-29T16:00:20.000Z'))).toISOString()).toBe('2026-09-29T16:05:20.000Z');
  });
});

describe('the levels refresh loop', () => {
  it('schedules the first run at the next close + 20 s, then one per close', () => {
    const { clock, children, lines } = harness();
    expect(clock.pendingAt()).toEqual(['2026-09-29T16:05:20.000Z']);

    clock.advanceTo(at('2026-09-29T16:05:19.999Z'));
    expect(children).toHaveLength(0);
    clock.advanceTo(at('2026-09-29T16:05:20.000Z'));
    expect(children).toHaveLength(1);

    clock.advanceTo(at('2026-09-29T16:06:00.000Z'));
    children[0]!.exit(0);
    expect(lines).toContain('[levels] child exited code=0 signal=null ms=40000');

    clock.advanceTo(at('2026-09-29T16:10:20.000Z'));
    expect(children).toHaveLength(2);
    expect(clock.pendingAt()).toContain('2026-09-29T16:15:20.000Z');
  });

  it('SKIPS a tick while a child runs: never two children at once', () => {
    const { clock, children, lines } = harness();
    clock.advanceTo(at('2026-09-29T16:05:20.000Z'));
    expect(children).toHaveLength(1);

    // Killed at 270 s, but its exit has not been delivered by the next tick.
    clock.advanceTo(at('2026-09-29T16:10:20.000Z'));
    expect(children).toHaveLength(1);
    expect(lines.filter((line) => line.includes('tick skipped'))).toHaveLength(1);

    clock.advanceTo(at('2026-09-29T16:12:00.000Z'));
    children[0]!.exit(null, 'SIGKILL');
    clock.advanceTo(at('2026-09-29T16:15:20.000Z'));
    expect(children).toHaveLength(2);
  });

  it('KILLS a child still running at 270 s (SIGKILL), and logs it; one that exits first is never killed', () => {
    const { clock, children, lines } = harness();
    clock.advanceTo(at('2026-09-29T16:05:20.000Z'));
    const stuck = children[0]!;

    clock.advanceTo(at('2026-09-29T16:05:20.000Z') + LEVELS_REFRESH_KILL_MS - 1);
    expect(stuck.kills).toEqual([]);
    clock.advanceTo(at('2026-09-29T16:05:20.000Z') + LEVELS_REFRESH_KILL_MS);
    expect(LEVELS_REFRESH_KILL_MS).toBe(270_000);
    expect(stuck.kills).toEqual(['SIGKILL']);
    expect(lines.some((line) => /still running at 270 s: killed \(SIGKILL\)/.test(line))).toBe(true);
    stuck.exit(null, 'SIGKILL');
    expect(lines).toContain('[levels] child exited code=null signal=SIGKILL ms=270000');

    clock.advanceTo(at('2026-09-29T16:10:20.000Z'));
    const quick = children[1]!;
    clock.advanceTo(at('2026-09-29T16:11:00.000Z'));
    quick.exit(0);
    clock.advanceTo(at('2026-09-29T16:15:19.000Z'));
    expect(quick.kills).toEqual([]);
  });

  it('stop() clears the timer and kills a running child', () => {
    const { clock, children, handle, lines } = harness();
    clock.advanceTo(at('2026-09-29T16:05:20.000Z'));
    handle.stop();
    expect(children[0]!.kills).toEqual(['SIGKILL']);
    expect(lines.some((line) => line.includes('stopping: killing the running refresh'))).toBe(true);
    expect(clock.pendingAt()).toEqual([]);

    clock.advanceTo(at('2026-09-29T17:00:00.000Z'));
    expect(children).toHaveLength(1);
  });

  it('stop() with no child running clears the timer and spawns nothing', () => {
    const { clock, children, handle } = harness();
    handle.stop();
    expect(clock.pendingAt()).toEqual([]);
    clock.advanceTo(at('2026-09-29T17:00:00.000Z'));
    expect(children).toHaveLength(0);
  });

  it('a spawn that fails is logged and the next close tries again', () => {
    const clock = new FakeClock(at('2026-09-29T16:02:30.000Z'));
    const lines: string[] = [];
    let attempts = 0;
    startLevelsRefreshLoop({
      spawnRefresh: () => {
        attempts += 1;
        if (attempts === 1) throw new Error('EAGAIN');
        const child = new FakeChild() as FakeChild & { pid: number | undefined };
        return child;
      },
      now: clock.now,
      setTimer: clock.setTimer,
      clearTimer: clock.clearTimer,
      log: (line) => lines.push(line),
    });
    clock.advanceTo(at('2026-09-29T16:05:20.000Z'));
    expect(lines).toContain('[levels] refresh not started: spawn failed: EAGAIN');
    clock.advanceTo(at('2026-09-29T16:10:20.000Z'));
    expect(attempts).toBe(2);
  });
});

describe('maybeStartLevelsRefresh: the flag', () => {
  it('returns null and starts nothing unless LEVELS_REFRESH_ENABLED is "1"', () => {
    for (const value of [undefined, '', '0', 'true', 'yes']) {
      const setTimer = vi.fn();
      const spawnRefresh = vi.fn();
      const handle = maybeStartLevelsRefresh(
        value === undefined ? {} : { LEVELS_REFRESH_ENABLED: value },
        { log: () => {}, setTimer, spawnRefresh, now: () => 0, clearTimer: () => {} },
      );
      expect(handle, `LEVELS_REFRESH_ENABLED=${value}`).toBeNull();
      expect(setTimer).not.toHaveBeenCalled();
      expect(spawnRefresh).not.toHaveBeenCalled();
    }
  });

  it('"1" starts the loop', () => {
    const clock = new FakeClock(at('2026-09-29T16:02:30.000Z'));
    const handle = maybeStartLevelsRefresh(
      { LEVELS_REFRESH_ENABLED: '1' },
      { log: () => {}, setTimer: clock.setTimer, clearTimer: clock.clearTimer, now: clock.now, spawnRefresh: () => new FakeChild() },
    );
    expect(handle).not.toBeNull();
    expect(clock.pendingAt()).toEqual(['2026-09-29T16:05:20.000Z']);
    handle!.stop();
  });
});

describe('the research worker stops the loop on BOTH exits, before it exits', () => {
  it('the signal handler and the end of the job loop each call levelsRefresh?.stop()', () => {
    /*
     * Asserted against source: the worker is a process entry point that no
     * test constructs. stop() kills a running child (above), so a call here
     * is what keeps a non-systemd exit from orphaning a writer.
     */
    const source = fs.readFileSync(path.join(process.cwd(), 'worker/research.ts'), 'utf8');
    expect(source).toMatch(/const levelsRefresh = maybeStartLevelsRefresh\(process\.env, \{ log \}\);/);

    const handler = source.slice(source.indexOf('const shutdown = (signal: string) =>'));
    const handlerBody = handler.slice(0, handler.indexOf('};'));
    expect(handlerBody).toContain('levelsRefresh?.stop();');
    expect(handlerBody.indexOf('levelsRefresh?.stop();')).toBeLessThan(handlerBody.indexOf('process.exit(0);'));

    const tail = source.slice(source.indexOf("log('[research] worker stopped');"));
    expect(tail).toContain('levelsRefresh?.stop();');
    expect(tail.indexOf('levelsRefresh?.stop();')).toBeLessThan(tail.indexOf('db.close();'));
  });
});

/* ------------------------------------------------------------ real processes */

let dir: string;
beforeEach(() => {
  dir = fs.mkdtempSync(path.join(os.tmpdir(), 'mointel-levels-job-'));
});
afterEach(() => {
  vi.unstubAllEnvs();
  try {
    fs.rmSync(dir, { recursive: true, force: true });
  } catch {
    /* Windows may hold the handle briefly. */
  }
});

function waitForExit(child: ChildLike): Promise<{ code: number | null; signal: NodeJS.Signals | null }> {
  return new Promise((resolve) => child.on('exit', (code, signal) => resolve({ code, signal })));
}

describe('the real child', () => {
  it('spawnLevelsRefreshChild runs node on the release tsx cli, and relays stdout and stderr lines', async () => {
    const cli = path.join(dir, 'node_modules', 'tsx', 'dist', 'cli.mjs');
    fs.mkdirSync(path.dirname(cli), { recursive: true });
    fs.writeFileSync(
      cli,
      [
        "const script = process.argv[2].split(/[\\\\/]/).slice(-2).join('/');",
        "console.log('[levels] refresh ran ' + script);",
        "console.error('[levels] on stderr');",
        'process.exitCode = 3;',
      ].join('\n'),
    );
    const lines: string[] = [];
    const child = spawnLevelsRefreshChild((line) => lines.push(line), dir);
    const exited = await waitForExit(child);
    // The exit can land before the last relayed line; give readline a turn.
    await new Promise((resolve) => setTimeout(resolve, 50));
    expect(exited).toEqual({ code: 3, signal: null });
    expect(lines).toContain('[levels] refresh ran worker/levels-refresh.ts');
    expect(lines).toContain('[levels] on stderr');
  });

  it('worker/levels-refresh.ts: one refresh into history.db, one line, exit 0; market.db untouched', async () => {
    const marketPath = path.join(dir, 'market.db');
    const historyPath = path.join(dir, 'scratch', 'history.db');
    const market = openDatabase(marketPath);
    // The child computes at its own wall clock, so the bar sits in YESTERDAY's
    // session (10:00 ET), which every moment of today can read as its price.
    const today = etDateString(new Date(latestFiveMinuteClose(Date.now())));
    const yesterday = addDays(today, -1);
    const barTs = new Date(`${yesterday}T14:00:00.000Z`);
    upsertMinuteBars(market, yesterday, [
      {
        symbol: 'AAA',
        ts: barTs.toISOString(),
        open: 2,
        high: 2,
        low: 2,
        close: 2,
        volume: 100,
        tradeCount: 1,
        vwap: 2,
        source: 'live-bar',
        receivedAt: barTs.toISOString(),
      },
    ]);
    market
      .prepare(
        `INSERT INTO ticker_session (symbol, trading_date, rvol_rank, ah_rank, feed, updated_at)
         VALUES (?, ?, 1, NULL, 'sip', ?), (?, ?, 2, NULL, 'sip', ?)`,
      )
      .run('AAA', today, barTs.toISOString(), 'NONE', today, barTs.toISOString());
    market.close();
    const before = fs.statSync(marketPath).mtimeMs;

    vi.stubEnv('MARKET_DB_PATH', marketPath);
    vi.stubEnv('HISTORY_DB_PATH', historyPath);
    const lines: string[] = [];
    const child = spawnLevelsRefreshChild((line) => lines.push(line), process.cwd());
    const exited = await waitForExit(child);
    await new Promise((resolve) => setTimeout(resolve, 50));

    expect(exited, lines.join('\n')).toEqual({ code: 0, signal: null });
    expect(lines).toHaveLength(1);
    expect(lines[0]).toMatch(
      new RegExp(`^\\[levels\\] refresh ${today} t=\\S+ names=2 written=1 absent=1 totalMs=\\d+$`),
    );
    expect(fs.statSync(marketPath).mtimeMs).toBe(before);

    const history = openHistoryStore(historyPath);
    const stored = readResistanceLevels(history, today, ['AAA', 'NONE']);
    history.close();
    expect([...stored.keys()]).toEqual(['AAA']);
  }, 60_000);

  it('worker/levels-refresh.ts: a missing market.db prints one failure line and exits 1', async () => {
    vi.stubEnv('MARKET_DB_PATH', path.join(dir, 'missing', 'market.db'));
    vi.stubEnv('HISTORY_DB_PATH', path.join(dir, 'scratch', 'history.db'));
    const lines: string[] = [];
    const child = spawnLevelsRefreshChild((line) => lines.push(line), process.cwd());
    const exited = await waitForExit(child);
    await new Promise((resolve) => setTimeout(resolve, 50));
    expect(exited).toEqual({ code: 1, signal: null });
    expect(lines).toHaveLength(1);
    expect(lines[0]).toMatch(/^\[levels\] refresh failed: /);
    expect(fs.existsSync(path.join(dir, 'missing', 'market.db'))).toBe(false);
  }, 60_000);
});
