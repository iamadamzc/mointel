import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { describe, expect, it } from 'vitest';

import {
  COLUMN_TITLE,
  NO_TITLE_NEEDED,
  priceColumnTitle,
  rankingQuantity,
} from '@/lib/dashboard/columnTitles';

/**
 * HIS DIRECTION, 2026-09-25: a tooltip on each column name "if it makes sense".
 *
 * The limiter is the interesting half. A tooltip that restates its header costs
 * a 500ms hover and teaches nothing, and this board shipped one of those
 * already (`Price` / "Last price"). So these assert the DISCIPLINE, not the
 * prose: one source for both tables, a baseline that cannot drift from the
 * number above it, nothing that repeats its own header, and no engine words.
 */

const read = (file: string) => readFileSync(join(process.cwd(), file), 'utf8');
const strip = (text: string) =>
  text.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');

/*
 * `as const` makes each value its own LITERAL type, so a `[string, string]`
 * predicate is not assignable and `tsc` rejects it. Mapped instead of
 * narrowed — every value here is a string by construction.
 */
const TITLES: Array<[string, string]> = Object.entries(COLUMN_TITLE).map(
  ([column, title]) => [column, title as string],
);

describe('one source, so the board cannot explain a column differently from the shared titles', () => {
  it('the board types no column explanation of its own', () => {
    /*
     * `MomentumTable` already broke the one-grammar promise once with a
     * hand-typed header WORD, and that was visible on screen the moment the
     * two disagreed. A hand-typed EXPLANATION breaks it more quietly: you
     * would have to hover both tables to find it.
     */
    for (const file of ['components/DiscoveryBoard.tsx']) {
      const code = strip(read(file));
      expect(code).toContain('COLUMN_TITLE');
    }
    /*
     * SCOPED TO HEADERS, and the first pass was not — it matched every
     * `title="..."` in the file and failed on three legitimate ELEMENT
     * tooltips: the frozen badge, the rank-movement chip, the no-float cell.
     * Those are not column explanations and the rule was never about them.
     * A guard that fires on correct code is a guard someone deletes.
     */
    const discovery = strip(read('components/DiscoveryBoard.tsx'));
    /*
     * `[^>]` STOPS AT THE TAG, and that is the whole correctness of this.
     * `[\s\S]*?` was lazy but unbounded, so it walked out of the `<Th` and
     * matched the frozen badge's legitimate literal title two hundred lines
     * below — a guard reporting a defect in code that has none. A character
     * class matches newlines already, so the `s` flag it needed was itself
     * the tell that the pattern was reaching too far.
     */
    expect(discovery).not.toMatch(/<Th[^>]*title=['"`][A-Z]/);
  });

  it('gives the shared columns their shared words', () => {
    const discovery = strip(read('components/DiscoveryBoard.tsx'));
    for (const column of ['why', 'risk', 'cycle']) {
      expect(discovery).toContain(`COLUMN_TITLE.${column}`);
    }
    /*
     * `rvol` IS THE ONE EXCEPTION AND IT IS A REAL ONE, not a drift.
     *
     * Discovery swaps that column to after-hours participation at the bell,
     * so its hover resolves on the BOARD; the watchlist has no evening board
     * and keeps the constant. **They must still say the identical thing
     * whenever they are showing the identical quantity**, which is what this
     * asserts rather than a string appearing in two files.
     */
    expect(discovery).toContain('rankingQuantity(board).title');
    expect(rankingQuantity('DAILY_RVOL').title).toBe(COLUMN_TITLE.rvol);
    expect(rankingQuantity('AFTER_HOURS').title).not.toBe(COLUMN_TITLE.rvol);
  });
});

describe('the price tooltip names the baseline the number was measured from', () => {
  it('follows the session rather than stating one', () => {
    /*
     * The defect this exists for: he questioned a row carrying `+18.1%` above
     * `+0.0%`, both correct, against two different denominators, and the row
     * named neither. A tooltip that named a FIXED baseline would be a third
     * copy of that mistake — right in one session and wrong in the others.
     */
    expect(priceColumnTitle('PREMARKET')).toContain('including after hours');
    expect(priceColumnTitle('RTH')).toContain("prior session's close");
    expect(priceColumnTitle('AFTER_HOURS')).toContain("today's regular-session close");
  });

  it('names the label the header is actually showing', () => {
    expect(priceColumnTitle('PREMARKET')).toContain('PM Gap');
    expect(priceColumnTitle('RTH')).toContain('RTH Gap');
  });

  it('explains VWAP in every session, since that is the part no header can carry', () => {
    for (const phase of ['PREMARKET', 'RTH', 'AFTER_HOURS', 'CLOSED'] as const) {
      expect(priceColumnTitle(phase)).toContain('VWAP');
      expect(priceColumnTitle(phase)).toContain('volume-weighted');
    }
  });
});

describe('"if it makes sense" is his limiter and it is enforced', () => {
  it('leaves the self-evident columns alone, and says which on purpose', () => {
    /*
     * A deliberate absence, listed rather than omitted — so a later reader
     * finds a decision instead of a column somebody forgot. `Ticker` is the
     * name; a hover restating that is the shape being avoided.
     */
    expect(NO_TITLE_NEEDED).toContain('ticker');
    expect(Object.keys(COLUMN_TITLE)).not.toContain('ticker');
  });

  it('never restates its own header word and stops', () => {
    /*
     * `Price` / "Last price" is the failure this rules out: true, useless, and
     * indistinguishable from a real tooltip until you have spent the hover.
     * A real one says what the column is NOT, which no header can.
     */
    for (const [column, title] of TITLES) {
      expect(title.length).toBeGreaterThan(60);
      expect(title.toLowerCase()).not.toBe(column.toLowerCase());
    }
  });

  it('says what each column is NOT, which is the part the screen cannot show', () => {
    // Each of these is a mistake someone has actually made on this desk.
    /*
     * ASSERTED AS FACTS, NOT AS PHRASES. These pinned exact wording and broke
     * when he sent two of the strings back to be rewritten -- a test failing
     * on copy it was never guarding. What each column must still SAY:
     */
    // RVOL: that it is cumulative, so a dead name keeps a big number.
    expect(COLUMN_TITLE.rvol).toMatch(/never decays|cumulative/i);
    // WHY: that the letter and the colour are different quantities.
    expect(COLUMN_TITLE.why).toMatch(/different question|two quantities/i);
    // RISK: capacity is not flow -- permission to sell is not selling.
    expect(COLUMN_TITLE.risk).toMatch(/not evidence anyone|permission to sell/i);
    // RISK: an unestablished structure is not a cleared one.
    expect(COLUMN_TITLE.risk).toMatch(/not the same as finding nothing/i);
    // FLOAT: what a float IS, and that blank does not mean small.
    expect(COLUMN_TITLE.float).toMatch(/available to trade/i);
    expect(COLUMN_TITLE.float).toMatch(/never that the float is small/i);
  });
});

describe('trader language, not pipeline language', () => {
  it('carries no engine vocabulary', () => {
    /*
     * §10, and automatable exactly as the audit says: no SCREAMING_SNAKE
     * token anywhere in the trader-facing UI. `LATCH` was removed from this
     * product for being engine vocabulary on a trader's screen — a tooltip is
     * no more exempt than a badge.
     *
     * The chip words the risk column really renders are allowed, because they
     * are what he reads on the row: DIRTY FLOAT, SUPPLY OVERHEAD, STRUCTURE
     * CAUTION, STRUCTURE UNKNOWN, NO FLAG FOUND, and the cycle phases.
     */
    const onScreen = new Set([
      'DIRTY', 'FLOAT', 'SUPPLY', 'OVERHEAD', 'STRUCTURE', 'CAUTION', 'UNKNOWN',
      'NO', 'FLAG', 'FOUND', 'RUN', 'DAY', 'FRONTSIDE', 'OFF', 'HIGH', 'BACKSIDE',
      'PRIOR', 'VWAP', 'RVOL', 'PM', 'RTH', 'AH', 'A', 'B', 'C',
    ]);
    for (const [, title] of TITLES) {
      expect(title).not.toMatch(/[A-Z]+_[A-Z]/); // no SCREAMING_SNAKE at all
      for (const word of title.match(/\b[A-Z]{2,}\b/g) ?? []) {
        expect(onScreen.has(word), `${word} is not a word on the row`).toBe(true);
      }
    }
  });

  it('names no module, field or command', () => {
    for (const [, title] of TITLES) {
      expect(title).not.toMatch(/\.ts\b|\bnpm \b|[a-z]+\.[a-z]+\(/);
    }
  });
});

describe('the ranking quantity changes identity at the bell', () => {
  it('names what the board actually ranked on, in both sessions', () => {
    /*
     * His ruling, 2026-09-25, after the rank column went: the column that
     * answers "why does this rank" has to show the quantity that ranked it.
     * Daily RVOL stops moving at 16:00 and keeps what the day earned, so on
     * the evening board it is the STALE number, not merely the less useful
     * one.
     */
    expect(rankingQuantity('DAILY_RVOL').label).toBe('RVOL');
    expect(rankingQuantity('AFTER_HOURS').label).toBe('Part');
  });

  it('says in the evening hover that Daily RVOL is NOT what ranked it', () => {
    // The part a four-letter header can never carry.
    expect(rankingQuantity('AFTER_HOURS').title).toMatch(/Daily RVOL is not/i);
  });

  it('keeps the evening label short enough to survive being the active sort', () => {
    /*
     * MEASURED at the 1,024px floor, Geist 600 / 11px / 0.08em, uppercased:
     * `AH PART ▼` is 67.7px and needs 83.7 with padding in a 68px cell,
     * and after the bell this column usually IS the sort. `PART ▼` is 63.1.
     * Four characters is the constraint, so the test states it.
     */
    expect(rankingQuantity('AFTER_HOURS').label.length).toBeLessThanOrEqual(4);
  });
});
