import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

/**
 * The on-box runner alert (deploy/aws/runner-alert.sh), driven against stubs for
 * sqlite3, the notifier and logger, as watchdog.test.ts drives the watchdog.
 *
 * His ruling 2026-10-06T15:48:13Z (via Integration 32nd): "yes build the 100%
 * runner alert. but make it $1-$10 and at 125, 150, 200, 250, 300, 350, 400,
 * 500, 600, 700, 800, 900, 1000." Volume floor 500,000 shares (his yes to
 * Integration's recommendation). Every "silent" case has a sibling that fires,
 * so an alert that never fires cannot pass.
 *
 * The stubbed reader returns rows as the real query does:
 *   SYMBOL|price|previous_close|percent_change|cumulative_volume
 * The SQL's own cost and plan are measured on the box, not here.
 */

const ROOT = process.cwd();
const SCRIPT = path.join(ROOT, 'deploy', 'aws', 'runner-alert.sh').replace(/\\/g, '/');

let sandbox: string;
let bin: string;
let state: string;
let sent: string;
let journal: string;

const fwd = (p: string) => p.replace(/\\/g, '/');

beforeEach(() => {
  sandbox = fs.mkdtempSync(path.join(os.tmpdir(), 'mointel-runner-'));
  bin = path.join(sandbox, 'bin');
  state = path.join(sandbox, 'state');
  sent = path.join(sandbox, 'sent.txt');
  journal = path.join(sandbox, 'journal.txt');
  fs.mkdirSync(bin);
  fs.writeFileSync(
    path.join(bin, 'sqlite3'),
    ['#!/usr/bin/env bash', `[ -f "${fwd(sandbox)}/reader-fails" ] && exit 1`, `cat "${fwd(sandbox)}/rows.txt" 2>/dev/null`, ''].join('\n'),
    { mode: 0o755 },
  );
  fs.writeFileSync(path.join(sandbox, 'notifier.sh'), ['#!/usr/bin/env bash', `printf '%s\\n' "$1" >> "${fwd(sent)}"`, ''].join('\n'));
  fs.writeFileSync(path.join(bin, 'logger'), ['#!/usr/bin/env bash', `echo "$*" >> "${fwd(journal)}"`, ''].join('\n'), {
    mode: 0o755,
  });
});

afterEach(() => {
  fs.rmSync(sandbox, { recursive: true, force: true });
});

function rows(lines: string[]) {
  fs.writeFileSync(path.join(sandbox, 'rows.txt'), lines.join('\n') + (lines.length ? '\n' : ''));
}

/** One tick. Clock is "ISO-weekday HHMM YYYY-MM-DD" in ET. */
function tick(clock = '2 0815 2026-10-06', extra: Record<string, string> = {}) {
  execFileSync('bash', [SCRIPT], {
    env: {
      ...process.env,
      PATH: `${bin}${path.delimiter}${process.env.PATH}`,
      RUNNER_STATE_DIR: fwd(state),
      RUNNER_SQLITE: fwd(path.join(bin, 'sqlite3')),
      RUNNER_DB: fwd(path.join(sandbox, 'market.db')),
      RUNNER_NOTIFIER: fwd(path.join(sandbox, 'notifier.sh')),
      RUNNER_CLOCK: clock,
      ...extra,
    },
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
  });
}

function messages(): string[] {
  return fs.existsSync(sent) ? fs.readFileSync(sent, 'utf8').split('\n').filter(Boolean) : [];
}

describe('runner alert: crossings', () => {
  it('a crossing alerts once, and the same level on the next tick does not repeat', () => {
    rows(['ABC|4.6|2|130|1000000']);
    tick();
    expect(messages()).toHaveLength(1);
    expect(messages()[0]).toContain('ABC');
    expect(messages()[0]).toContain('+125%');
    tick('2 0816 2026-10-06');
    expect(messages()).toHaveLength(1);
  });

  it('a jump across several levels in one minute sends ONE message naming the highest, then the next level alerts later', () => {
    rows(['JMP|9|2|350|2000000']);
    tick();
    expect(messages()).toHaveLength(1);
    expect(messages()[0]).toContain('+350%');
    expect(messages()[0]).not.toContain('+300%');
    rows(['JMP|10.2|2|410|3000000']);
    tick('2 0817 2026-10-06');
    expect(messages()).toHaveLength(2);
    expect(messages()[1]).toContain('+400%');
  });

  it('under the first level is silent; at exactly +125% it fires', () => {
    rows(['LOW|4.48|2|124|1000000']);
    tick();
    expect(messages()).toHaveLength(0);
    rows(['LOW|4.5|2|125|1000000']);
    tick('2 0816 2026-10-06');
    expect(messages()).toHaveLength(1);
  });

  it('a new trading date starts fresh: the same level alerts again on the next day', () => {
    rows(['ABC|4.6|2|130|1000000']);
    tick('2 0815 2026-10-06');
    tick('3 0815 2026-10-07');
    expect(messages()).toHaveLength(2);
  });

  it('two names crossing in the same tick get one message each', () => {
    rows(['AAA|4.6|2|130|1000000', 'BBB|6|2|200|1000000']);
    tick();
    expect(messages()).toHaveLength(2);
  });
});

describe('runner alert: filters', () => {
  it('the $1-$10 band applies to the PRIOR close by default: a $1.50 name running to $15 still alerts; $12 and $0.80 closes are silent', () => {
    rows(['RUN|15|1.5|900|1000000', 'DEAR|30|12|150|1000000', 'CHEAP|2|0.8|150|1000000']);
    tick();
    expect(messages()).toHaveLength(1);
    expect(messages()[0]).toContain('RUN');
  });

  it('band on the CURRENT price (setting): $15 is silent, $9 alerts', () => {
    rows(['RUN|15|1.5|900|1000000', 'MID|9|3|200|1000000']);
    tick(undefined, { RUNNER_BAND_ON: 'current' });
    expect(messages()).toHaveLength(1);
    expect(messages()[0]).toContain('MID');
  });

  it('under 500,000 shares is silent; exactly 500,000 alerts', () => {
    rows(['THIN|4.6|2|130|499999', 'ENOUGH|4.6|2|130|500000']);
    tick();
    expect(messages()).toHaveLength(1);
    expect(messages()[0]).toContain('ENOUGH');
  });

  it('outside 04:00-20:00 ET on a weekday it is silent; inside it fires', () => {
    rows(['ABC|4.6|2|130|1000000']);
    tick('2 0359 2026-10-06');
    tick('2 2000 2026-10-06');
    tick('6 1000 2026-10-10');
    expect(messages()).toHaveLength(0);
    tick('2 0400 2026-10-06');
    expect(messages()).toHaveLength(1);
  });

  it('baseline PRIOR close (default) computes from price and previous_close, ignoring the stored percent', () => {
    rows(['ABC|4.6|2|10|1000000']); // stored % is from today's close after the flip; price/prior = +130%
    tick();
    expect(messages()).toHaveLength(1);
  });

  it('baseline STORED (setting) uses the stored percent_change', () => {
    rows(['ABC|4.6|2|10|1000000', 'DEF|5|2|160|1000000']);
    tick(undefined, { RUNNER_BASELINE: 'stored' });
    expect(messages()).toHaveLength(1);
    expect(messages()[0]).toContain('DEF');
  });
});

describe('runner alert: the message and failures', () => {
  it('names the ticker, % up, price, volume, time ET and the baseline, with a prefix and no dollar sign', () => {
    rows(['ABC|4.6|2|130|1234567']);
    tick('2 0815 2026-10-06');
    const m = messages()[0];
    expect(m.startsWith('RUNNER ')).toBe(true);
    expect(m).toContain('ABC');
    expect(m).toContain('+125%');
    expect(m).toContain('now +130%');
    expect(m).toContain('4.60');
    expect(m).toContain('1,234,567');
    expect(m).toContain('08:15 ET');
    expect(m).toContain('prior close 2.00');
    expect(m).not.toContain('$');
  });

  it('a reader failure sends nothing and is logged', () => {
    rows(['ABC|4.6|2|130|1000000']);
    fs.writeFileSync(path.join(sandbox, 'reader-fails'), '');
    tick();
    expect(messages()).toHaveLength(0);
    expect(fs.readFileSync(journal, 'utf8')).toContain('could not read');
  });
});
