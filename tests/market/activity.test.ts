import { describe, expect, it } from 'vitest';

import {
  DEFAULT_ACTIVITY_CONFIG,
  deadLineFor,
  minuteSlot,
  peakTradesPerMinute,
  resolveActivity,
  type ActivityConfig,
  type ActivityState,
} from '@/lib/market/activity';

/**
 * The continuing condition, and mostly the ways it must NOT fire.
 *
 * Every failure mode here is one this desk has already paid for once at a
 * different grain: a partial bar read as a finished one, missing data read as
 * a measurement, an aggregate that cannot distinguish a thing from its
 * failure. The rule removes names from the trader's board, so a false DEAD is
 * the expensive direction and most of these tests are about that.
 */

const NOW = Date.parse('2026-09-03T14:30:30Z'); // mid-minute on purpose

/** Trades in the minute `back` minutes before NOW. */
function at(back: number, trades: number): [string, number] {
  return [minuteSlot(NOW - back * 60_000), trades];
}

function read(entries: Array<[string, number]>, over: Partial<{
  previous: ActivityState;
  deadSince: string | null;
  config: ActivityConfig;
}> = {}) {
  return resolveActivity({
    minuteTrades: new Map(entries),
    now: NOW,
    previous: over.previous ?? 'UNKNOWN',
    deadSince: over.deadSince ?? null,
    config: over.config,
  });
}

/** Minutes 2..6 back are the judged window: 5 dead minutes after 1 settle. */
const JUDGED = [2, 3, 4, 5, 6];

describe('the dead line is derived, never configured twice', () => {
  it('is the active line over the trader\'s ratio', () => {
    expect(deadLineFor(DEFAULT_ACTIVITY_CONFIG)).toBe(30);
  });

  it('follows the active line when it moves, so the 10x cannot drift', () => {
    // The ratio is his. A separately configured dead line could be edited to
    // something that is no longer a tenth, and nothing would notice.
    expect(deadLineFor({ ...DEFAULT_ACTIVITY_CONFIG, activeTradesPerMinute: 500 })).toBe(50);
  });
});

describe('resolveActivity — refusing to call a name dead', () => {
  it('reports UNKNOWN, never DEAD, when nothing has been observed', () => {
    /*
     * The failure this prevents is a worker restart mid-session declaring the
     * whole board dead at once: after a restart every map is empty, and empty
     * must not read as silent. Absence of detection is not detection of
     * absence.
     */
    const reading = read([]);
    expect(reading.state).toBe('UNKNOWN');
    expect(reading.reason).toContain('no minute bars observed');
  });

  it('does not judge the in-flight minute, or the one still arriving', () => {
    /*
     * A minute in progress is not a dead minute, and a just-closed minute may
     * not have delivered its bar yet. Counting either as zero would
     * manufacture death every minute on every name. Here the name is busy
     * across the whole judged window and silent only in the two most recent
     * minutes -- which is what a healthy name looks like at any instant.
     */
    const reading = read([...JUDGED.map((back) => at(back, 900)), at(1, 0), at(0, 0)]);
    expect(reading.state).toBe('ACTIVE');

    /*
     * NON-VACUITY, asserted rather than inferred. If the fixture's minute keys
     * did not line up with the slots the resolver computes, every lookup would
     * miss, every window would be all zeros, and every DEAD test in this file
     * would pass for entirely the wrong reason. This is the assertion that
     * makes the zero-windows below mean something.
     */
    expect(reading.window).toEqual([900, 900, 900, 900, 900]);
  });

  it('holds state inside the band rather than asserting either verdict', () => {
    // Between 30 and 300: proves nothing, so nothing changes. That band is
    // what the trader's 10x ratio actually buys.
    const band = JUDGED.map((back) => at(back, 100));
    expect(read(band, { previous: 'ACTIVE' }).state).toBe('ACTIVE');
    expect(read(band, { previous: 'UNKNOWN' }).state).toBe('UNKNOWN');
  });

  it('does not promote UNKNOWN to ACTIVE on a merely quiet minute', () => {
    // A minute that failed to prove death has not proved life either.
    expect(read(JUDGED.map((back) => at(back, 100))).state).toBe('UNKNOWN');
  });
});

describe('resolveActivity — the removal it exists for', () => {
  it('calls DEAD after five consecutive silent minutes', () => {
    const reading = read([at(7, 5000), ...JUDGED.map((back) => at(back, 0))], {
      previous: 'ACTIVE',
    });
    expect(reading.state).toBe('DEAD');
    expect(reading.reason).toContain('5 consecutive minute(s)');
  });

  it('treats a MISSING minute as zero trades, which is how death arrives', () => {
    /*
     * The decisive mechanic. Alpaca emits no bar for a minute with no trades
     * -- measured: BTCT 2025-06-03 has 13:30, 13:32, 13:33 and no 13:31. So
     * the window here contains NO keys for the dead minutes at all, and the
     * name must still read DEAD. Reading "the last five bars" instead would
     * find the five busy minutes before the silence and report ACTIVE forever.
     */
    const reading = read([at(7, 5000), at(8, 4000), at(9, 4000), at(10, 4000), at(11, 4000)], {
      previous: 'ACTIVE',
    });
    expect(reading.state).toBe('DEAD');
    expect(reading.window).toEqual([0, 0, 0, 0, 0]);
  });

  it('one busy minute inside the window is enough to survive', () => {
    const reading = read(
      [at(2, 0), at(3, 0), at(4, 31), at(5, 0), at(6, 0)],
      { previous: 'ACTIVE' },
    );
    // 31 is above the dead line of 30, so the run is broken and nothing is
    // asserted -- the name keeps its place without having to prove liveness.
    expect(reading.state).toBe('ACTIVE');
  });

  it('holds deadSince across evaluations, so the clock reports the death', () => {
    /*
     * Re-deriving it every cycle would report when the name was last LOOKED
     * AT, which reads identically on screen and is a different quantity --
     * this desk's basis rule, at minute grain.
     */
    const first = read(JUDGED.map((back) => at(back, 0)), { previous: 'ACTIVE' });
    expect(first.state).toBe('DEAD');

    const later = read(JUDGED.map((back) => at(back, 0)), {
      previous: 'DEAD',
      deadSince: first.deadSince,
    });
    expect(later.deadSince).toBe(first.deadSince);
  });
});

describe('peakTradesPerMinute — what the graveyard shows beside the clock', () => {
  it('is null on a name with no bars, rather than zero', () => {
    // Zero is a measurement: "its busiest minute had no trades". Null is the
    // truth: nothing was observed. The graveyard must not print the first.
    expect(peakTradesPerMinute(new Map())).toBeNull();
  });

  it('reads the busiest minute held', () => {
    expect(peakTradesPerMinute(new Map([at(2, 40), at(3, 1240), at(4, 900)]))).toBe(1240);
  });

  it('follows a downward correction, which a running maximum would not', () => {
    /*
     * `updatedBars` can revise a minute down. A running max would keep the
     * withdrawn figure for the rest of the session with nothing to reveal it,
     * so the peak is computed from the map instead — the map is what the
     * correction actually changes.
     */
    const trades = new Map([at(2, 40), at(3, 1240)]);
    trades.set(minuteSlot(NOW - 3 * 60_000), 90); // the correction
    expect(peakTradesPerMinute(trades)).toBe(90);
  });
});

describe('resolveActivity — hysteresis, because a third of deaths revive', () => {
  it('does NOT return on a single busy minute', () => {
    // 33% of five-minute deaths see activity return and only 7% reach +25%,
    // so a one-minute return buys flicker rather than opportunity.
    const reading = read([at(2, 900), ...JUDGED.slice(1).map((back) => at(back, 0))], {
      previous: 'DEAD',
      deadSince: '2026-09-03T14:20:00.000Z',
    });
    expect(reading.state).toBe('DEAD');
    expect(reading.deadSince).toBe('2026-09-03T14:20:00.000Z');
  });

  it('returns once activity is sustained, and clears the clock', () => {
    const reading = read([at(2, 900), at(3, 900), at(4, 0), at(5, 0), at(6, 0)], {
      previous: 'DEAD',
      deadSince: '2026-09-03T14:20:00.000Z',
    });
    expect(reading.state).toBe('ACTIVE');
    expect(reading.deadSince).toBeNull();
  });

  it('is asymmetric: leaving takes five minutes, returning takes two', () => {
    /*
     * Stated as an assertion rather than left to the config, because the
     * asymmetry IS the design and a symmetric edit would look reasonable.
     *
     * The exact value is pinned rather than merely bounded because it is
     * MEASURED: at 2, R&D's premarket figures discard 27% of revival flicker
     * for 18% of the genuine +25% returns, and the conditional quality of the
     * survivors rises 7.0% → 7.9%. Anyone moving it should have to see this
     * test and go and find newer numbers.
     */
    expect(DEFAULT_ACTIVITY_CONFIG.deadMinutes).toBe(5);
    expect(DEFAULT_ACTIVITY_CONFIG.reviveMinutes).toBe(2);
    expect(DEFAULT_ACTIVITY_CONFIG.reviveMinutes).toBeLessThan(
      DEFAULT_ACTIVITY_CONFIG.deadMinutes,
    );
  });
});
