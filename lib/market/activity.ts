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
   *     1 consecutive       32.8%  (244)       7.0%  (17 of 244)
   *     2 consecutive       24.3%  (177)       7.9%  (14 of 177)
   *     3 consecutive       15.3%  (118)       8.5%  (10 of 118)
   *
   * At 2 the rule discards 67 of 244 revival events — 27% of the flicker —
   * and gives up 3 of 17 genuine +25% returns, 18% of the opportunity. Going
   * to 3 costs 7 of 17, 41%, so 2 is the knee rather than the extreme.
   *
   * THE QUALITY COLUMN IS FLAT, NOT RISING, AND THE RAW COUNTS ARE WHY.
   * 7.0 → 7.9 → 8.5 looks like a trend and is 17, 14 and 10 events: Fisher
   * gives p = 0.71 for 1-vs-2 and p = 0.67 for 1-vs-3, which is the same rate
   * measured three times. So the honest claim is that quality does NOT FALL
   * as the requirement tightens — **the 27% flicker reduction is FREE on
   * quality rather than positive on it**, which is still a good trade and is
   * all the data will carry.
   *
   * *An earlier version of this comment said the mix IMPROVES. It does not;
   * that was a direction read as a finding, and it sat above a pinned test as
   * the strongest sentence here. The counts are quoted beside the percentages
   * deliberately — the next reader will otherwise quote 7.0 → 7.9 and not
   * 17 → 14. A count of 244 discarded events is solid; a ratio between two
   * counts that small is not, and the two halves of this table are not
   * equally strong.*
   *
   * *Premarket-derived, like the thresholds, while the rule itself is uniform
   * — so by-session reporting is what would reveal these rates not holding
   * elsewhere.*
   */
  reviveMinutes: number;
  /**
   * Most recent minutes excluded as still arriving.
   *
   * A minute in progress is not a dead minute, and a just-closed minute may not
   * have delivered its bar yet. Either read as zero trades is a slot the feed
   * never spoke for, so the rule judges only what is finished — the same
   * principle as `lastSettledTradingDate` at a different grain. It costs one
   * minute of detection latency, so a five-minute rule decides at six, and that
   * is stated rather than hidden.
   *
   * WAS 1 UNTIL 2026-09-08, ON NO MEASUREMENT AT ALL, AND THE EARLIER VERSION
   * OF THIS COMMENT IS WHY IT SURVIVED. It claimed a late bar "would manufacture
   * death every minute, on every name". IT WOULD NOT, and that is still the
   * load-bearing argument here rather than any latency figure: `deadMinutes`
   * requires FIVE CONSECUTIVE slots at or below the dead line, so one late slot
   * read as zero cannot produce a death on a live name — one of five is not
   * five of five. It can only break a revival run, which needs `reviveMinutes`
   * consecutive. **THE COST OF A LATE SLOT IS A DELAYED REVIVAL, NOT A FALSE
   * DEATH**, and it self-corrects on the next evaluation.
   *
   * Then measured, across a full session including the open — original bars,
   * delay after their own minute closes:
   *
   *     premarket        74,833     p99 0.216s    max 0.413s
   *     first ten RTH    30,961     p99 0.549s    max 0.575s
   *     regular 6.5h    814,999     p99 0.498s    max 0.673s
   *
   * **THE LOOP DOES NOT DEGRADE UNDER LOAD.** The objection that premarket was
   * the easy case was worth raising and is answered: the open is 0.575s against
   * premarket's 0.413s, and the worst minute of the day is 0.673s. A 60-second
   * margin was covering a 0.673-second event — about ninety times over.
   *
   * SO THE MARGIN ONLY EVER COVERED THE BAND 0.673s..60s, AND NO ORIGINAL BAR
   * WAS EVER OBSERVED IN IT. A reconnect gap longer than 60s defeats 1 and 0
   * equally, so the setting was never buying reconnect protection either.
   *
   * WHAT LOWERING IT COSTS, STATED RATHER THAN WAVED PAST. Corrections land at
   * 30.004s-30.195s — a second population, cleanly separated, present all day.
   * At 1 the newest slot was read after any correction; at 0 it may be read
   * before one. **The newest bar is therefore PROVISIONAL for up to 30 seconds
   * and can revise under the reader.** Immaterial to the verdict — a correction
   * does not move a count across the dead line — but visible on the sparkline,
   * which is why Design owns how that is shown.
   *
   * AND WHAT IS NOT BOUNDED: no reconnect occurred on the measured day. That is
   * observed-absent, not ruled out, and it is weaker evidence than a clean
   * number looks.
   *
   * A count of SLOTS, so 0 is the floor: the minute in progress is never
   * judged, because it has not finished. There is no sub-minute setting and no
   * measurement could produce one.
   *
   * ── WHY IT IS NOW 0 ─────────────────────────────────────────────────────
   *
   * **THE MARGIN DID NOTHING IN THE SITUATION IT WAS WRITTEN FOR.** Six cases
   * run through this function at both settings: steady state, genuine death,
   * revival, AND the missing-bar case all returned identical verdicts. Two
   * differed, and only one mattered:
   *
   *     a name quiet for four minutes whose fifth minute is BUSY, bar arrived
   *       settle=1 -> DEAD      settle=0 -> ACTIVE
   *
   * **NOT A MINUTE APART — OPPOSITE, AT THE SAME INSTANT, AND THE STALE ONE IS
   * WRONG.** And under hysteresis that wrong DEAD is STICKY: revival needs
   * `reviveMinutes` consecutive minutes at or above the active line, so a name
   * waking into the band between the lines never earns it back. **The only
   * measurable effect of the margin was to mislabel the quiet-then-loud
   * transition the desk exists to catch** — and everything downstream reads it,
   * including the high-res subscription gate at `engine.ts:1707`.
   *
   * ── WHAT IT COSTS, SIZED TO THE EVIDENCE AND NO FURTHER ──────────────────
   *
   * A name acquiring ACTIVE from UNKNOWN for the FIRST time waits one extra
   * evaluation when the newest bar has not landed. **In normal operation that
   * is one cycle — original bars were measured landing 0.005s–0.673s after
   * their own minute closes, across a full session including the open.**
   *
   * **DURING A DELIVERY GAP IT COSTS THE LENGTH OF THE GAP, AND THAT IS NOT
   * BOUNDED.** No reconnect occurred on the measured day; observed-absent is
   * weaker than cannot-occur, and this is the one case a stall makes worse.
   * *Stated this way deliberately: the comment that defended `1` for three
   * months was false, and the replacement must not inherit a claim stronger
   * than the measurement.*
   */
  settleMinutes: number;
}

export const DEFAULT_ACTIVITY_CONFIG: ActivityConfig = {
  activeTradesPerMinute: 300,
  deadRatio: 10,
  deadMinutes: 5,
  reviveMinutes: 2,
  settleMinutes: 0,
};

/**
 * What the verdict excluded, phrased so it stays true at zero.
 *
 * `(most recent 0 excluded as still arriving)` would claim an exclusion that is
 * not happening. The minute in progress is never judged at any setting — it has
 * not finished — so that floor is stated rather than counted. Written now so
 * the value can move without the verdict string starting to lie.
 */
function settleNote(config: ActivityConfig): string {
  return config.settleMinutes > 0
    ? ` (most recent ${config.settleMinutes} excluded as still arriving)`
    : ' (the minute in progress is never judged; nothing beyond it is excluded)';
}

/** The derived dead line. Exported so a surface can state it with a verdict. */
/**
 * The minute slots the window judges, oldest first.
 *
 * EXPORTED so a second series can cover exactly the same minutes rather than
 * building its own and agreeing by coincidence. The price sparkline's honesty
 * is a property of the PAIR — a flat price beside a zero-trade bar reads as
 * "nothing happened", which is true; a flat price beside nothing at all is a
 * claim the price line has no business making.
 */
export function windowSlots(now: number, config: ActivityConfig): readonly string[] {
  /*
   * MEMOIZED, because the engine asks this for every ticker on every flush (twice: the verdict and the price
   * window) and the answer depends only on the minute and the window's shape. Building it per ticker was a
   * measured share of the 1 s flush, which runs on the SIP socket's thread (Ops flush profile, 2026-10-10,
   * docs/ops-readings/flush-profile-2026-10-10.txt). The key is the whole input: the minute `now` falls in
   * plus every config field the loop reads. The result is shared, hence `readonly`.
   */
  const minute = Math.floor(now / 60_000);
  const span = Math.max(config.deadMinutes, config.reviveMinutes);
  const key = `${minute}|${config.settleMinutes}|${span}`;
  if (slotsMemo !== null && slotsMemo.key === key) return slotsMemo.slots;
  const slots: string[] = [];
  for (let back = config.settleMinutes + span; back > config.settleMinutes; back -= 1) {
    slots.push(minuteSlot(now - back * 60_000));
  }
  slotsMemo = { key, slots };
  return slots;
}

let slotsMemo: { key: string; slots: readonly string[] } | null = null;

/**
 * Closes over the same slots, trimmed to the first minute that TRADED.
 *
 * TWO CONSTRAINTS, both measured rather than chosen — and one of the two
 * measurements needs its store named.
 *
 * **36-42% is from `data/market.db` — the LOCAL desk, not production — measured
 * on 2026-08-17/18. The CONSTRAINT does not depend on it: absent-then-rising is
 * not flat-then-rising at any rate, and this line would not change if it came
 * back 12%.**
 *
 * IT SAID "PENDING A RE-TAKE ON PRODUCTION'S BARS" AND THAT PROMISE CANNOT BE
 * KEPT AS WRITTEN. Production's `minute_bars` holds 2026-09-02 and 2026-09-03
 * and nothing else — the two dates restored on 09-06 — because the table has
 * been empty from 09-04 onward. So a re-take can only ever run on those two
 * sessions, and only if they carry `RVOL_RANK_ENTRY` events with complete
 * minute coverage. **If they do not, this figure is a local-desk number
 * permanently, and that is the honest status rather than a queue item.**
 *
 * Left as a local figure with its store named, which is what it always was.
 * "Pending" read as work someone would get to, and a caveat that cannot be
 * discharged has to say so or it decays into a promise.
 *
 * It starts at the first traded minute and never at the window edge. 36-42% of
 * top-12 rows begin with a hole, and a line drawn from the edge shows
 * FLAT-THEN-RISING where the truth is ABSENT-THEN-RISING — on precisely the
 * setup a momentum trader is hunting, a name that sits silent and then moves.
 *
 * And a hole is `null`, never a carried price. The activity window's zeros are
 * OBSERVATIONS: that minute genuinely had zero trades. These holes are
 * ABSENCES: there is no price, because nothing traded. Same missing slot,
 * opposite meaning, so the two series cannot share a fill convention.
 *
 * `covered` travels with it so the pair dependency is CHECKABLE rather than
 * trusted: a renderer can refuse a line it should not draw without re-counting.
 */
export function buildPriceWindow(
  minuteCloses: ReadonlyMap<string, number>,
  slots: readonly string[],
): PriceWindow | null {
  const startsAt = slots.findIndex((slot) => minuteCloses.has(slot));
  if (startsAt === -1) return null;

  const closes = slots.slice(startsAt).map((slot) => minuteCloses.get(slot) ?? null);
  return { startsAt, closes, covered: closes.filter((close) => close !== null).length };
}

export function deadLineFor(config: ActivityConfig): number {
  return config.activeTradesPerMinute / config.deadRatio;
}

/**
 * Minute closes over the activity window, aligned to it by `startsAt`.
 *
 * Separate from `ActivityReading` because it answers a different question and
 * fails differently: an absent close is no price, an absent trade count is zero
 * trades.
 */
export interface PriceWindow {
  /** Index into the activity window where the first TRADED minute sits. */
  startsAt: number;
  /** Closes from that minute forward. `null` is a minute that did not trade. */
  closes: (number | null)[];
  /** How many of `closes` are real prices. */
  covered: number;
}

export interface ActivityReading {
  state: ActivityState;
  /** When the name went DEAD, carried across evaluations. Null unless DEAD. */
  deadSince: string | null;
  /** Trades per minute over the judged window, oldest first. For display. */
  window: number[];
  /**
   * Why this reading came out as it did — stating the FULL predicate, not a
   * summary of it.
   *
   * It names the settle window as well as the threshold and the run length,
   * because those three together are what makes this rule fire LESS OFTEN than
   * the obvious approximation ("no bar in five minutes") that anyone reaches
   * for when counting dead names by hand. A baseline taken with the loose
   * predicate reads HIGHER, and comparing the two without noticing looks
   * exactly like a regression.
   *
   * That caveat has been relayed between threads repeatedly, which is a sign
   * nobody trusts a relay to carry it. **So it travels with every verdict
   * instead** — a number's basis belongs beside the number, and a verdict is a
   * number wearing a word.
   */
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
  const slots = windowSlots(options.now, config);

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
      reason:
        `${config.deadMinutes} consecutive settled minute(s) at or below ${deadLine} trades/min` +
        settleNote(config),
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
      reason:
        `${config.reviveMinutes} consecutive settled minute(s) at or above ${config.activeTradesPerMinute} trades/min` +
        settleNote(config),
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
    reason:
      `between ${deadLine} and ${config.activeTradesPerMinute} trades/min over ${config.deadMinutes} settled minute(s) — state held`,
  };
}
