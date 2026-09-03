/**
 * Death and revival episodes, on a continuous minute grid.
 *
 * The specification is
 * `docs/rnd/2026-09-03-revival-question-preregistration.md` and this file
 * implements it. Thresholds are the caller's; the shape of an episode is fixed
 * here.
 *
 * **The grid is the whole point, and it is what the first version got wrong.**
 * Alpaca emits no bar for a minute with no trades, so a detector that iterates
 * stored bars cannot see silence — which is the exact quantity it exists to
 * measure. In the pilot, NTWO read `14:14 dead` then `18:52 revived` as ONE
 * dead minute when it was 278, and 88% of that symbol-day's minutes had no bar
 * at all. **Absence of detection standing in for detection of absence, inside a
 * purpose-built instrument.**
 *
 * So callers pass a DENSE series with silence already filled as zero, and
 * `buildGrid` below is the only supported way to make one.
 */

/** One minute of activity. `value` is trades or shares; the caller decides. */
export interface MinuteSample {
  /** Minutes since the session's first minute. Dense, no gaps. */
  index: number;
  value: number;
}

export interface Episode {
  /** Consecutive dead minutes before revival, or before the session ended. */
  deadMinutes: number;
  revived: boolean;
  /** Minute index at which the death was confirmed. */
  startIndex: number;
}

export interface RevivalThresholds {
  /** At or above this, the name is active. */
  active: number;
  /**
   * The dead line is DERIVED as `active / deadRatio`, never configured
   * separately — adopted from `lib/market/activity.ts`, and the reason is not
   * tidiness.
   *
   * **The 10x is the TRADER'S choice**, from his own description of a name
   * dying: ~5,000 shares on a 10-second candle dropping below ~500. Two
   * separately configured numbers can drift apart until they no longer express
   * that ratio, **with nothing anywhere to notice** — a plausible edit to
   * either one destroys his choice silently.
   *
   * Deriving it makes the ratio structurally unforgettable. **Keep this comment
   * if you touch this type**: the next person to simplify will configure both,
   * and the justification is the only thing standing between his ratio and a
   * well-meaning refactor.
   */
  deadRatio: number;
  /**
   * Consecutive dead minutes required before a death is confirmed.
   *
   * **Not cosmetic.** At persistence 1 the pilot found 79.7% revival; at 60 it
   * found 25.7%. A single quiet minute in a bursty name is not death, and
   * NTWO produced nineteen "episodes" in one session without ever going quiet
   * for long. The trader's stated numbers omit this because he was describing
   * what he sees, not writing a filter.
   */
  persistence: number;
}

/** The derived dead line. Exported so a caller can state it beside a rate. */
export function deadLineFor(t: RevivalThresholds): number {
  return t.active / t.deadRatio;
}

/**
 * Fills a sparse minute series onto a dense grid, silence as zero.
 *
 * `bars` maps minute-offset to value. `length` is the session's full minute
 * count. **A minute absent from `bars` is zero activity, not a missing
 * observation** — no trades printed is a fact, not a gap.
 */
export function buildGrid(bars: ReadonlyMap<number, number>, length: number): number[] {
  const grid = new Array<number>(length);
  for (let i = 0; i < length; i += 1) grid[i] = bars.get(i) ?? 0;
  return grid;
}

/**
 * Episodes in one symbol-day.
 *
 * A death is confirmed only after `persistence` consecutive dead minutes, and
 * the run resets on any minute at or above `dead` — a name flickering back to
 * moderate activity has not stayed quiet, whatever the volume says.
 */
export function findEpisodes(grid: readonly number[], t: RevivalThresholds): Episode[] {
  const dead = deadLineFor(t);
  const out: Episode[] = [];
  let state: 'seek' | 'active' | 'dead' = 'seek';
  let run = 0;
  let deadMinutes = 0;
  let startIndex = 0;

  for (let i = 0; i < grid.length; i += 1) {
    const v = grid[i];
    if (state === 'seek') {
      if (v >= t.active) state = 'active';
    } else if (state === 'active') {
      if (v < dead) {
        run += 1;
        if (run >= t.persistence) {
          state = 'dead';
          deadMinutes = run;
          startIndex = i - run + 1;
          run = 0;
        }
      } else {
        run = 0;
      }
    } else {
      if (v >= t.active) {
        out.push({ deadMinutes, revived: true, startIndex });
        state = 'active';
      } else {
        deadMinutes += 1;
      }
    }
  }

  if (state === 'dead') out.push({ deadMinutes, revived: false, startIndex });
  return out;
}

export interface RevivalSummary {
  episodes: number;
  revived: number;
  ratePct: number | null;
  medianDeadMinutes: number | null;
  p90DeadMinutes: number | null;
  symbolDays: number;
}

export function summarise(perSymbolDay: readonly Episode[][]): RevivalSummary {
  const all = perSymbolDay.flat();
  const contributing = perSymbolDay.filter((e) => e.length > 0).length;
  const durations = all.filter((e) => e.revived).map((e) => e.deadMinutes).sort((a, b) => a - b);
  const pick = (f: number) =>
    durations.length === 0 ? null : durations[Math.floor(f * (durations.length - 1))];
  return {
    episodes: all.length,
    revived: durations.length,
    ratePct: all.length === 0 ? null : (100 * durations.length) / all.length,
    medianDeadMinutes: pick(0.5),
    p90DeadMinutes: pick(0.9),
    symbolDays: contributing,
  };
}
