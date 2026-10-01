/**
 * The levels refresh loop: at each 5m close + 20 s the research worker spawns
 * ONE child process, `worker/levels-refresh.ts`, which reads market.db
 * read-only, computes the board's resistance levels and writes them to
 * history.db (spec section 2). Behind LEVELS_REFRESH_ENABLED, which is OFF
 * unless it is exactly "1": shipping this code changes nothing until the flag
 * is set.
 *
 * WHY A CHILD. The refresh is synchronous SQLite reads and compute, tens of
 * seconds disk-cold. Run in the research worker it would block that worker's
 * event loop (its job loop, its timers, its shutdown handler) for as long as
 * it runs. In a child, the research worker only schedules, spawns, relays the
 * child's lines and waits for its exit.
 *
 * BOUNDS.
 *   - At most ONE child at a time: a tick while one runs is skipped and logged.
 *   - A child still running 270 s after it was spawned is killed (SIGKILL) and
 *     logged, so a stuck refresh never reaches the next close's slot twice.
 *   - `stop()` clears the timer and kills a running child. The research worker
 *     calls it in BOTH shutdown paths before it exits, so a non-systemd exit
 *     never orphans a writer on history.db.
 *
 * Per run the log carries the child's own summary line (names, written,
 * totalMs, or its failure) and one line from here with the child's exit code
 * or signal and its wall time.
 */

import { spawn } from 'node:child_process';
import path from 'node:path';
import { createInterface } from 'node:readline';

/** The cadence: UTC epoch multiples of 300 s, the 5m closes. */
export const LEVELS_REFRESH_CADENCE_MS = 300_000;
/** After each close: the close's last 1m bar reaches the store a few seconds late. */
export const LEVELS_REFRESH_OFFSET_MS = 20_000;
/** A child still running this long after its spawn is killed. */
export const LEVELS_REFRESH_KILL_MS = 270_000;

/** The parts of a ChildProcess the loop uses. Tests inject a fake. */
export interface ChildLike {
  /** Undefined when the process could not be spawned. */
  readonly pid?: number;
  on(event: 'exit', listener: (code: number | null, signal: NodeJS.Signals | null) => void): unknown;
  on(event: 'error', listener: (error: Error) => void): unknown;
  kill(signal?: NodeJS.Signals): boolean;
}

export interface LevelsRefreshLoopOptions {
  spawnRefresh: () => ChildLike;
  now: () => number;
  setTimer: (run: () => void, ms: number) => unknown;
  clearTimer: (handle: unknown) => void;
  log: (message: string) => void;
}

export interface LevelsRefreshHandle {
  stop(): void;
}

/** The first 5m close + 20 s strictly after `afterMs`. */
export function nextLevelsRefreshAt(afterMs: number): number {
  const at =
    Math.floor(afterMs / LEVELS_REFRESH_CADENCE_MS) * LEVELS_REFRESH_CADENCE_MS + LEVELS_REFRESH_OFFSET_MS;
  return at > afterMs ? at : at + LEVELS_REFRESH_CADENCE_MS;
}

function errorLine(error: unknown): string {
  return (error instanceof Error ? error.message : String(error)).split('\n')[0]!.slice(0, 300);
}

export function startLevelsRefreshLoop(options: LevelsRefreshLoopOptions): LevelsRefreshHandle {
  const { spawnRefresh, now, setTimer, clearTimer, log } = options;
  let stopped = false;
  let timer: unknown = null;
  let killTimer: unknown = null;
  let running: { child: ChildLike; startedAt: number } | null = null;

  const release = (child: ChildLike) => {
    if (running?.child !== child) return;
    running = null;
    if (killTimer !== null) {
      clearTimer(killTimer);
      killTimer = null;
    }
  };

  const run = () => {
    let child: ChildLike;
    try {
      child = spawnRefresh();
    } catch (error) {
      log(`[levels] refresh not started: spawn failed: ${errorLine(error)}`);
      return;
    }
    const startedAt = now();
    running = { child, startedAt };
    child.on('exit', (code, signal) => {
      log(`[levels] child exited code=${code ?? 'null'} signal=${signal ?? 'null'} ms=${Math.round(now() - startedAt)}`);
      release(child);
    });
    child.on('error', (error) => {
      log(`[levels] child error: ${errorLine(error)}`);
      // A child that never started will never exit; one that did still holds the slot until it does.
      if (child.pid === undefined) release(child);
    });
    killTimer = setTimer(() => {
      killTimer = null;
      if (running?.child !== child) return;
      log(`[levels] refresh still running at ${LEVELS_REFRESH_KILL_MS / 1000} s: killed (SIGKILL)`);
      child.kill('SIGKILL');
    }, LEVELS_REFRESH_KILL_MS);
  };

  const schedule = (afterMs: number) => {
    const at = nextLevelsRefreshAt(afterMs);
    timer = setTimer(() => {
      timer = null;
      if (stopped) return;
      // The next slot first, from the later of now and this slot, so a timer
      // that fires a little early never schedules this same slot again.
      schedule(Math.max(now(), at));
      if (running) {
        log(
          `[levels] tick skipped: the previous refresh is still running ` +
            `(${Math.round((now() - running.startedAt) / 1000)} s)`,
        );
        return;
      }
      run();
    }, Math.max(0, at - now()));
  };

  schedule(now());

  return {
    stop() {
      stopped = true;
      if (timer !== null) {
        clearTimer(timer);
        timer = null;
      }
      if (killTimer !== null) {
        clearTimer(killTimer);
        killTimer = null;
      }
      if (running) {
        log('[levels] stopping: killing the running refresh (SIGKILL)');
        running.child.kill('SIGKILL');
        running = null;
      }
    },
  };
}

/**
 * The real child: `node --import tsx worker/levels-refresh.ts` from `cwd` (the
 * release directory on the server), its stdout and stderr relayed line by line
 * into `log`.
 *
 * NOT `tsx/dist/cli.mjs`, which the systemd units use: that CLI is a wrapper
 * that runs the script in a SECOND process (measured 2026-10-01: the spawned
 * pid was the script's ppid). A SIGKILL to the wrapper cannot be relayed, so
 * the 270 s kill and `stop()` would hit the wrapper and could leave the real
 * refresh running. With `--import tsx` the spawned pid IS the refresh.
 */
export function spawnLevelsRefreshChild(log: (message: string) => void, cwd: string = process.cwd()): ChildLike {
  const child = spawn(
    process.execPath,
    ['--import', 'tsx', path.join(cwd, 'worker', 'levels-refresh.ts')],
    { cwd, env: process.env, stdio: ['ignore', 'pipe', 'pipe'] },
  );
  for (const stream of [child.stdout, child.stderr]) {
    if (stream) createInterface({ input: stream }).on('line', (line) => log(line));
  }
  return child;
}

export interface StartLevelsRefreshOptions {
  log: (message: string) => void;
  /** Injected for tests; default: the real child. */
  spawnRefresh?: () => ChildLike;
  now?: () => number;
  setTimer?: (run: () => void, ms: number) => unknown;
  clearTimer?: (handle: unknown) => void;
  /** Injected for tests; default: `process.once('exit', listener)`. */
  onProcessExit?: (listener: () => void) => void;
}

/**
 * The gate. Returns null, having started nothing (no timer, no child), unless
 * LEVELS_REFRESH_ENABLED is exactly "1".
 */
export function maybeStartLevelsRefresh(
  env: Record<string, string | undefined>,
  options: StartLevelsRefreshOptions,
): LevelsRefreshHandle | null {
  if (env.LEVELS_REFRESH_ENABLED?.trim() !== '1') {
    options.log('[levels] refresh disabled (LEVELS_REFRESH_ENABLED is not 1)');
    return null;
  }
  options.log(
    `[levels] refresh enabled: one child at each 5m close + ${LEVELS_REFRESH_OFFSET_MS / 1000} s, ` +
      `killed at ${LEVELS_REFRESH_KILL_MS / 1000} s`,
  );
  const handle = startLevelsRefreshLoop({
    spawnRefresh: options.spawnRefresh ?? (() => spawnLevelsRefreshChild(options.log)),
    now: options.now ?? (() => Date.now()),
    setTimer:
      options.setTimer ??
      ((run, ms) => {
        const timer = setTimeout(run, ms);
        timer.unref?.();
        return timer;
      }),
    clearTimer: options.clearTimer ?? ((timer) => clearTimeout(timer as NodeJS.Timeout)),
    log: options.log,
  });
  // EVERY exit path, including a fatal rejection out of main() where the
  // shutdown handlers never run: a running child is killed, never orphaned
  // as a writer on history.db (Ops's condition). `stop()` is synchronous, as
  // an 'exit' listener must be, and a second call is a no-op.
  (options.onProcessExit ?? ((listener) => process.once('exit', listener)))(() => handle.stop());
  return handle;
}
