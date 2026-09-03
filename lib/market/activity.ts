/**
 * Is a name still trading, right now?
 *
 * The board ranks by Daily RVOL, which is CUMULATIVE and cannot fall: a name
 * that ran at 06:00 and died by 07:00 carries its whole morning in the
 * numerator for the rest of the session, and `latched` keeps it price-eligible
 * besides. Two independent one-way latches, so board presence is a one-time
 * qualification in fact as well as in name.
 *
 * This is the continuing condition that sits BESIDE that ranking. It never
 * replaces it: `rvol.ts` carries a standing instruction that the RVOL
 * definition is fixed by completed backtesting and must not be windowed, and
 * that constraint holds.
 *
 * The measure is minute TRADE COUNT — the one the viscosity research confirmed
 * as meaningful, already parsed off every wildcard bar and already persisted,
 * and until now scored on by nothing. No subscription change and no second SIP
 * connection: this reads data the desk was already throwing away.
 *
 * THE MECHANIC THAT SHAPES EVERYTHING HERE: A DEAD MINUTE HAS NO BAR.
 *
 * Alpaca emits no minute bar for a minute with no trades — measured, not
 * assumed: BTCT on 2025-06-03 returns bars at 13:30, 13:32 and 13:33 with
 * `limit=3`, so 13:31 was not displaced by the limit, it does not exist. Death
 * therefore arrives as an ABSENT ROW rather than a low count.
 *
 * So the window is WALL-CLOCK over minute slots, and a missing slot counts as
 * ZERO trades. Reading "the last five bars" instead would span an arbitrary
 * and expanding stretch of real time — the rule would get slower exactly as a
 * name got deader, which is the opposite of what it is for.
 */

export type ActivityState =
  /** Trading at or above the active line recently enough to hold its place. */
  | 'ACTIVE'
  /** Silent for the full window. Earned, never assumed from missing data. */
  | 'DEAD'
  /** Not enough observation to say. Distinct from DEAD, and it must stay so. */
  | 'UNKNOWN';

export interface ActivityConfig {
  /** Trades per minute at or above which a minute is active. The trader's ~300. */
  activeTradesPerMinute: number;
  /**
   * The dead line is DERIVED as `active / deadRatio`, never configured
   * separately, because the 10x is the trader's and a second number could
   * drift away from the ratio he actually chose.
   */
  deadRatio: number;
  /** Consecutive dead minutes before presence is lost. His 5. */
  deadMinutes: number;
  /**
   * Consecutive active minutes before presence returns — deliberately NOT 5.
   *
   * MEASURED, not reasoned. R&D quantified this on premarket at dead = 5
   * minutes, and the numbers below are why the value is 2:
   *
   *     revival needs      revival events     of those, live +25%
   *     1 consecutive       32.8%  (244)       7.0%  (17)
   *     2 consecutive       24.3%  (177)       7.9%  (14)
   *     3 consecutive       15.3%  (118)       8.5%  (10)
   *
   * At 2 the rule discards 67 of 244 revival events — 27% of the flicker —
   * and gives up 3 of 17 genuine +25% returns, 18% of the opportunity.
   * Favourable on its own.
   *
   * AND THE SURVIVORS ARE BETTER, WHICH IS MORE THAN THE ORIGINAL ARGUMENT
   * CLAIMED. Conditional quality rises 7.0% → 7.9% as the requirement
   * tightens, because sustained activity filters flickers more effectively
   * than it filters real moves. The first version of this comment said only
   * that a fast return buys flicker rather than opportunity; the data says it
   * also buys a WORSE MIX.
   *
   * Going to 3 keeps improving the mix and costs 41% of the opportunity, so 2
   * is the knee rather than the extreme.
   *
   * *Premarket-derived, like the thresholds, while the rule itself is uniform
   * — so by-session reporting is what would reveal these rates not holding
   * elsewhere.*
   */
  reviveMinutes: number;
  /**
   * Most recent minutes excluded as still arriving.
   *
   * A minute in progress is not a dead minute, and a just-closed minute may
   * not have delivered its bar yet — either read as zero trades would
   * manufacture death every minute, on every name. This is the same rule as
   * `lastSettledTradingDate` at a different grain: judge only what is
   * finished. It costs one minute of detection latency, so a five-minute rule
   * decides at six, and that is stated rather than hidden.
   */
  settleMinutes: number;
}

export const DEFAULT_ACTIVITY_CONFIG: ActivityConfig = {
  activeTradesPerMinute: 300,
  deadRatio: 10,
  deadMinutes: 5,
  reviveMinutes: 2,
  settleMinutes: 1,
};

/** The derived dead line. Exported so a surface can state it with a verdict. */
export function deadLineFor(config: ActivityConfig): number {
  return config.activeTradesPerMinute / config.deadRatio;
}

export interface ActivityReading {
  state: ActivityState;
  /** When the name went DEAD, carried across evaluations. Null unless DEAD. */
  deadSince: string | null;
  /** Trades per minute over the judged window, oldest first. For display. */
  window: number[];
  /** Why this reading came out as it did, in one clause. */
  reason: string;
}

/** The minute slot a timestamp belongs to, as the ISO key bars are stored under. */
export function minuteSlot(ms: number): string {
  return new Date(Math.floor(ms / 60_000) * 60_000).toISOString();
}

/**
 * The busiest minute a name has had, from the bars actually held.
 *
 * Computed on demand rather than maintained as a running maximum, and the
 * reason is corrections: `updatedBars` can revise a minute downward, and a
 * running max would keep the withdrawn figure forever with nothing to reveal
 * it. Reading the map is O(one session of minutes) and this is called once,
 * when a name dies — the moment the number stops changing anyway.
 */
export function peakTradesPerMinute(minuteTrades: ReadonlyMap<string, number>): number | null {
  let peak: number | null = null;
  for (const trades of minuteTrades.values()) {
    if (peak === null || trades > peak) peak = trades;
  }
  return peak;
}

/**
 * Resolves the activity state for one symbol.
 *
 * `minuteTrades` is keyed by minute-bar timestamp exactly as the engine stores
 * it, and a key ABSENT from it means no bar arrived for that minute — which is
 * to say no trades occurred. That reading is the whole design and it is only
 * safe because the write path never omits a bar it received.
 *
 * The band between the dead line and the active line is neither: it neither
 * confirms death nor earns a return, so the previous state persists. That is
 * what the trader's 10x ratio buys — it is a hysteresis band rather than two
 * unrelated numbers, which is also why the dead line is derived from it.
 */
export function resolveActivity(options: {
  minuteTrades: ReadonlyMap<string, number>;
  now: number;
  previous: ActivityState;
  deadSince: string | null;
  config?: ActivityConfig;
}): ActivityReading {
  const config = options.config ?? DEFAULT_ACTIVITY_CONFIG;
  const { previous, deadSince } = options;

  /*
   * A symbol with no minute data at all has not been observed, and an
   * unobserved name is UNKNOWN rather than dead. This is what stops a worker
   * restart mid-session from declaring the entire board dead at once: after a
   * restart the maps are empty, and empty must never read as silent.
   */
  if (options.minuteTrades.size === 0) {
    return { state: 'UNKNOWN', deadSince: null, window: [], reason: 'no minute bars observed' };
  }

  const deadLine = deadLineFor(config);
  const span = Math.max(config.deadMinutes, config.reviveMinutes);
  const slots: string[] = [];
  for (let back = config.settleMinutes + span; back > config.settleMinutes; back -= 1) {
    slots.push(minuteSlot(options.now - back * 60_000));
  }

  // A missing slot is zero trades. The single most important line in the file.
  const window = slots.map((slot) => options.minuteTrades.get(slot) ?? 0);
  const last = (count: number) => window.slice(window.length - count);

  const deadRun = last(config.deadMinutes);
  const isDead = deadRun.length === config.deadMinutes && deadRun.every((n) => n <= deadLine);
  if (isDead) {
    return {
      state: 'DEAD',
      // Held from the earlier reading, so the clock reports when it DIED and
      // not when it was last looked at.
      deadSince: previous === 'DEAD' && deadSince ? deadSince : slots[slots.length - config.deadMinutes]!,
      window,
      reason: `${config.deadMinutes} consecutive minute(s) at or below ${deadLine} trades/min`,
    };
  }

  const reviveRun = last(config.reviveMinutes);
  const isActive =
    reviveRun.length === config.reviveMinutes &&
    reviveRun.every((n) => n >= config.activeTradesPerMinute);
  if (isActive) {
    return {
      state: 'ACTIVE',
      deadSince: null,
      window,
      reason: `${config.reviveMinutes} consecutive minute(s) at or above ${config.activeTradesPerMinute} trades/min`,
    };
  }

  /*
   * In the band. Neither threshold was met, so nothing is asserted and the
   * previous state stands -- including UNKNOWN, which must not be upgraded to
   * ACTIVE by a quiet minute that merely failed to prove death.
   */
  return {
    state: previous,
    deadSince: previous === 'DEAD' ? deadSince : null,
    window,
    reason: `between ${deadLine} and ${config.activeTradesPerMinute} trades/min — state held`,
  };
}
