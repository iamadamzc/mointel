/**
 * Two rulings on what a catalyst row says, 2026-09-29T14:46:55Z ("2, your recs"):
 *
 * 1. An OLD catalyst row (older than yesterday, not believed to explain the
 *    move) stops leading with its grade: the letter DIMS and the headline reads
 *    "No fresh catalyst · latest: <date> · <summary>". `OLD` stays; rows where
 *    no catalyst was found are unchanged.
 * 2. When the Sheet and the desk's own research disagree on the catalyst, the
 *    Discovery row MARKS it. The row's letter and headline come from the Sheet
 *    first, so the disagreement was visible only in the drawer.
 *
 * Every case is checked from both sides: the row that should change and the
 * row that should not.
 */

import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';

import { NO_CATALYST_MARK, WhyCell, WhyMarks } from '@/components/DecisionCells';
import { buildDeskRow } from '@/lib/dashboard/merge';
import { etDay, resolveWhy } from '@/lib/dashboard/why';
import { normalizeSheetRows } from '@/lib/data/rows';
import type { AutoIntelligence } from '@/lib/research/view';

/** A bare ET date `days` ago (the shape 77% of stored timestamps have). */
function etDaysAgo(days: number): string {
  const et = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/New_York',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date());
  return new Date(Date.parse(`${et}T12:00:00Z`) - days * 86_400_000).toISOString().slice(0, 10);
}

function intel(options: {
  grade?: string;
  days?: number;
  explainsMove?: boolean | null;
  status?: string;
  summary?: string | null;
}): AutoIntelligence {
  return {
    ticker: 'SLND',
    state: 'ACCEPTED',
    generatedAt: new Date().toISOString(),
    coverageIncomplete: false,
    analysis: {
      dossier: {
        ticker: 'SLND',
        catalyst: {
          catalystGrade: options.grade ?? 'WEAK_NEGATIVE_DILUTIVE',
          catalystStatus: options.status ?? 'SECONDARY_STALE',
          freshness: 'STALE',
          confidence: 'HIGH',
          summary: options.summary === undefined ? 'NYSE American notice of non-compliance.' : options.summary,
          whyTradersMayCare: null,
          eventTimestamp: etDaysAgo(options.days ?? 4),
          plausiblyExplainsMove: options.explainsMove === undefined ? false : options.explainsMove,
          unknowns: [],
          citations: [],
        },
        structure: { structureClassification: 'CLEAN', supplyLedger: [], structuralWarnings: [] },
        cycle: { cycleClassification: 'UNKNOWN' },
      },
    },
  } as unknown as AutoIntelligence;
}

/** A row with the Sheet's catalyst grade (and line) behind it, or none. */
function row(auto: AutoIntelligence, sheet?: { grade: string; line?: string }) {
  if (!sheet) return buildDeskRow('SLND', null, null, null, auto);
  const cells: string[] = new Array(27).fill('');
  cells[0] = 'A - PRIMARY';
  cells[1] = 'SLND';
  cells[9] = sheet.grade;
  cells[10] = sheet.line ?? '';
  const ticker = normalizeSheetRows([cells], []).tickers[0]!;
  return buildDeskRow('SLND', ticker, null, null, auto);
}

describe('an OLD catalyst row', () => {
  it('dims the letter and leads with "No fresh catalyst", dated from the event', () => {
    const why = resolveWhy(row(intel({ days: 4 })));
    expect(why.code).toBe('OLD_CATALYST');
    expect(why.tone).toBe('dim');
    expect(why.headline).toBe(
      `No fresh catalyst · latest: ${etDay(etDaysAgo(4))} · NYSE American notice of non-compliance.`,
    );
    // The grade itself is not hidden; it is dimmed.
    expect(why.grade).toBe('C');
  });

  it('says in its hover why the letter is dim, not that the colour is freshness', () => {
    const title = resolveWhy(row(intel({ days: 4 }))).title;
    expect(title).toMatch(/Dimmed/);
    expect(title).not.toMatch(/The colour is its FRESHNESS/);
  });

  it('keeps the OLD tag on the rendered row', () => {
    const html = renderToStaticMarkup(createElement(WhyCell, { why: resolveWhy(row(intel({ days: 4 }))) }));
    expect(html).toMatch(/>\s*old\s*</);
    expect(html).toContain('No fresh catalyst · latest:');
  });

  it('uses the DESK item for both date and summary, never the Sheet line under the desk date', () => {
    const why = resolveWhy(row(intel({ days: 4 }), { grade: 'C', line: 'Sheet says something else' }));
    expect(why.headline).toContain('NYSE American notice of non-compliance.');
    expect(why.headline).not.toContain('Sheet says something else');
  });

  it('still reads as dated when the desk left no summary', () => {
    const why = resolveWhy(row(intel({ days: 4, summary: null })));
    expect(why.headline).toBe(`No fresh catalyst · latest: ${etDay(etDaysAgo(4))}`);
  });

  it('is unchanged when the old catalyst is believed to explain the move', () => {
    const why = resolveWhy(row(intel({ days: 4, explainsMove: true })));
    expect(why.code).toBe('GRADED');
    expect(why.tone).not.toBe('dim');
    expect(why.headline).toBe('NYSE American notice of non-compliance.');
  });

  it('is unchanged for a FRESH catalyst', () => {
    const why = resolveWhy(row(intel({ days: 0 })));
    expect(why.tone).toBe('pos');
    expect(why.headline).not.toMatch(/No fresh catalyst/);
  });

  it('leaves a NONE_FOUND row as it was', () => {
    const why = resolveWhy(row(intel({ days: 4, status: 'NONE_FOUND' })));
    expect(why.code).toBe('NO_FRESH_CATALYST');
    expect(why.headline).not.toMatch(/No fresh catalyst · latest/);
    expect(why.tone).toBe('warn');
  });
});

describe('a Sheet / desk disagreement on the catalyst', () => {
  it('is marked with both letters when the families differ', () => {
    const why = resolveWhy(row(intel({ grade: 'LEGITIMATE_POSITIVE', days: 0, explainsMove: true }), { grade: 'C' }));
    // The row's own letter is still the Sheet's, as before...
    expect(why.grade).toBe('C');
    // ...and now it says the desk disagrees.
    expect(why.disagreement).toEqual({ sheet: 'C', desk: 'A' });
    const html = renderToStaticMarkup(createElement(WhyCell, { why }));
    expect(html).toContain('>sheet C · desk A</span>');
  });

  it('is not marked when they agree', () => {
    const why = resolveWhy(row(intel({ grade: 'LEGITIMATE_POSITIVE', days: 0, explainsMove: true }), { grade: 'A' }));
    expect(why.disagreement).toBeNull();
    expect(renderToStaticMarkup(createElement(WhyCell, { why }))).not.toContain('· desk');
  });

  it('is not marked when only one side has a grade', () => {
    expect(resolveWhy(row(intel({ grade: 'LEGITIMATE_POSITIVE', days: 0 }))).disagreement).toBeNull();
  });

  it('prints the desk NONE as "none", never as a second C', () => {
    const why = resolveWhy(row(intel({ grade: 'NONE', days: 0, explainsMove: true }), { grade: 'C' }));
    expect(why.disagreement).toEqual({ sheet: 'C', desk: 'none' });
  });

  it('follows the merge verdict, so the row and the drawer cannot disagree about it', () => {
    const r = row(intel({ grade: 'LEGITIMATE_POSITIVE', days: 0, explainsMove: true }), { grade: 'C' });
    const catalyst = r.comparison?.comparisons.find((c) => c.field === 'catalyst');
    expect(catalyst?.agreement).toBe('DISAGREE');
    // Flip the merge's verdict and the mark follows it.
    const agreed = {
      ...r,
      comparison: r.comparison && {
        ...r.comparison,
        comparisons: r.comparison.comparisons.map((c) =>
          c.field === 'catalyst' ? { ...c, agreement: 'AGREE' as const } : c,
        ),
      },
    };
    expect(resolveWhy(agreed).disagreement).toBeNull();
  });
});

describe('the no-catalyst mark: full words on the report card, the short form on the board (Integration, 2026-10-07)', () => {
  const why = () => resolveWhy(row(intel({ days: 4, status: 'NONE_FOUND' })));

  it("the report card (full) prints Commercial 13's words, no catalyst found in our sources", () => {
    const html = renderToStaticMarkup(createElement(WhyMarks, { why: why(), full: true }));
    expect(html).toContain('>no catalyst found in our sources<');
    expect(NO_CATALYST_MARK.full).toBe('no catalyst found in our sources');
  });

  it("the board's Why cell keeps the short form, with the hover that says it searched its sources", () => {
    const html = renderToStaticMarkup(createElement(WhyCell, { why: why() }));
    expect(html).toContain('>no catalyst found<');
    expect(html).not.toContain('in our sources<');
    expect(html).toContain('The desk searched its sources and found no catalyst for this move.');
  });
});
