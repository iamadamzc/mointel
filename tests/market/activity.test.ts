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

/**
 * The judged window, DERIVED from the config rather than restated as [2..6].
 *
 * It was hardcoded, and that is why `settleMinutes` survived three months of
 * being 300x larger than the delay it covers: **every test in this file agreed
 * with the constant because both had been written down separately and neither
 * could disagree.** Tuning the constant broke nine tests that were asserting
 * the fixture rather than the rule. `sparkline.test.ts` already learned this
 * one function away — *"the previous version read the live config and asserted
 * the result against it, which passes just as well for a hardcoded string."*
 *
 * Now the fixtures follow the rule. A change to `settleMinutes` moves this
 * window and the suite still tests what it says it tests.
 */
const SPAN = Math.max(DEFAULT_ACTIVITY_CONFIG.deadMinutes, DEFAULT_ACTIVITY_CONFIG.reviveMinutes);
const JUDGED = Array.from(
  { length: SPAN },
  (_, index) => DEFAULT_ACTIVITY_CONFIG.settleMinutes + 1 + index,
);

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

  it('never judges the minute in progress, at any settle', () => {
    /*
     * A minute in progress is not a dead minute: `windowSlots` starts at
     * `settleMinutes + 1`, so t-0 is unreachable at every setting. Asserted
     * against the DERIVED window so it stays true if the constant moves.
     *
     * IT USED TO CLAIM MORE THAN THIS. The previous version also silenced the
     * just-closed minute and said counting it "would manufacture death every
     * minute on every name". **That is false and it was measured false:** a
     * dead run needs `deadMinutes` CONSECUTIVE slots, so one zero cannot
     * produce a death -- and the scenario it described returns DEAD at both
     * settle=1 and settle=0, because the other four slots are already quiet.
     * The sentence defended a parameter nobody then re-examined.
     */
    const reading = read([...JUDGED.map((back) => at(back, 900)), at(0, 0)]);
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

    /*
     * The verdict must state its FULL predicate, not a summary of it. All
     * three parts are asserted because all three are what make this rule fire
     * LESS than the obvious approximation ("no bar in five minutes") someone
     * reaches for when counting dead names by hand — and a baseline taken with
     * the loose predicate reads higher, which without this looks like a
     * regression rather than a definition change.
     *
     * That caveat has crossed thread boundaries repeatedly by relay. This test
     * is what stops it being dropped from the verdict it belongs to.
     */
    expect(reading.reason).toContain('5 consecutive settled minute(s)');
    expect(reading.reason).toContain('at or below 30 trades/min');
    /*
     * The settle clause is asserted by SHAPE rather than by its exact words,
     * because the words legitimately differ at `settleMinutes: 0` — there is
     * nothing excluded beyond the minute in progress, and saying "most recent 0
     * excluded" would claim an exclusion that is not happening. A dropped
     * clause still fails this; a re-worded one does not.
     */
    expect(reading.reason).toMatch(/excluded as still arriving|never judged/);
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
    // Offsets DERIVED: the two most recent judged minutes are busy, the rest
    // silent. JUDGED is newest-first, so [0] and [1] are the revival run.
    const reading = read(
      JUDGED.map((back, index) => at(back, index < DEFAULT_ACTIVITY_CONFIG.reviveMinutes ? 900 : 0)),
      { previous: 'DEAD', deadSince: '2026-09-03T14:20:00.000Z' },
    );
    expect(reading.state).toBe('ACTIVE');
    expect(reading.deadSince).toBeNull();
  });

  it('keeps a name that woke up, instead of burying it a minute late', () => {
    /*
     * CASE D, AND IT IS WHY `settleMinutes` IS 0. Nothing asserted this before,
     * which is exactly why the parameter survived: four quiet minutes and a
     * BUSY most-recent one whose bar has arrived.
     *
     * At `settleMinutes: 1` the busy minute sat outside the window and this
     * returned DEAD — and under hysteresis that DEAD is STICKY, because
     * revival then needs `reviveMinutes` consecutive minutes at or above the
     * active line. A name waking into the band between the lines never earned
     * it back. The quiet-then-loud transition is the one the desk exists to
     * catch, so mislabelling it is the expensive direction.
     */
    const reading = read(
      JUDGED.map((back, index) => at(back, index === 0 ? 900 : 5)),
      { previous: 'ACTIVE' },
    );
    expect(reading.state).not.toBe('DEAD');
    expect(reading.window[reading.window.length - 1]).toBe(900);
  });

  it('is asymmetric: leaving takes five minutes, returning takes two', () => {
    /*
     * Stated as an assertion rather than left to the config, because the
     * asymmetry IS the design and a symmetric edit would look reasonable.
     *
     * The exact value is pinned rather than merely bounded because it is
     * MEASURED: at 2, R&D's premarket figures discard 27% of revival flicker
     * (67 of 244 events) for 18% of the genuine +25% returns (3 of 17), and
     * quality does not fall — 7.0%, 7.9%, 8.5% are 17, 14 and 10 events and
     * sit within noise, so the flicker reduction is FREE on quality rather
     * than positive on it. Anyone moving this should have to see the numbers
     * and go and find newer ones.
     */
    expect(DEFAULT_ACTIVITY_CONFIG.deadMinutes).toBe(5);
    expect(DEFAULT_ACTIVITY_CONFIG.reviveMinutes).toBe(2);
    expect(DEFAULT_ACTIVITY_CONFIG.reviveMinutes).toBeLessThan(
      DEFAULT_ACTIVITY_CONFIG.deadMinutes,
    );
  });
});
