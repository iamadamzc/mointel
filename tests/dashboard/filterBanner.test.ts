import { describe, expect, it } from 'vitest';

import { FILTER_BANNER_WORDS, filterBannerView } from '@/lib/dashboard/filterBanner';
import { activeFilters, CATALYST_GRADE_C_TITLE, CATALYST_GRADE_OPTIONS, FILTER_GROUP_LABEL } from '@/lib/dashboard/filterLabels';
import { DEFAULT_FILTERS, isFilterActive, type FilterState } from '@/lib/dashboard/view';

/*
 * His ask after IPDN (2026-10-06): the filter must be impossible to miss, and the
 * moving names it hides must be named. Words: Marketing filter-banner v2
 * (5df2d9b2), Commercial 17b.
 */

const EM_DASH = String.fromCharCode(0x2014);
type Row = { ticker: string; demand: Record<string, unknown> | null };

const mover = (ticker: string, pct: number, over: Record<string, unknown> = {}): Row => ({
  ticker,
  demand: { boardReason: 'MOVER', referenceRthCloseBasis: 'PRIOR_SESSION', percentChange: pct, cumulativeVolume: 19_300_000, ...over },
});
const ranked = (ticker: string, pct: number): Row => ({
  ticker,
  demand: { moving: true, referenceRthCloseBasis: 'PRIOR_SESSION', percentChange: pct, cumulativeVolume: 5_000_000 },
});
const plain = (ticker: string): Row => ({ ticker, demand: { referenceRthCloseBasis: 'PRIOR_SESSION', percentChange: 80 } });

const fresh: FilterState = { ...DEFAULT_FILTERS, catalyst: 'FRESH' };
const view = (filters: FilterState, board: Row[], matching: string[]) =>
  filterBannerView(filters, isFilterActive(filters), board as never, matching.map((ticker) => ({ ticker })));

describe('the label, one place for chip and banner', () => {
  it('the catalyst letter group is "Catalyst grade", and C carries its title', () => {
    expect(FILTER_GROUP_LABEL.grade).toBe('Catalyst grade');
    expect(CATALYST_GRADE_OPTIONS.find((o) => o.value === 'C')?.title).toBe(
      "C includes names with no company event in the desk's evidence.",
    );
    expect(activeFilters({ ...DEFAULT_FILTERS, grade: 'C' })).toEqual([{ text: 'Catalyst grade: C', title: CATALYST_GRADE_C_TITLE }]);
    expect(activeFilters({ ...DEFAULT_FILTERS, grade: 'A' })).toEqual([{ text: 'Catalyst grade: A', title: null }]);
  });

  it('names every active group in FilterBar order, the search upper-cased, and leaves out All and an empty search', () => {
    const items = activeFilters({ ...DEFAULT_FILTERS, search: ' ipd ', catalyst: 'FRESH', cycle: 'BACKSIDE', structure: 'DIRTY' });
    expect(items.map((i) => i.text)).toEqual(['Search: IPD', 'Cycle: Backside', 'Structure: Dirty', 'Freshness: Fresh']);
    expect(activeFilters({ ...DEFAULT_FILTERS, search: '   ' })).toEqual([]);
    expect(activeFilters({ ...DEFAULT_FILTERS, catalyst: 'STALE' }).map((i) => i.text)).toEqual(['Freshness: Old']);
  });
});

describe('the banner', () => {
  it('is not drawn while no filter is on', () => {
    expect(view(DEFAULT_FILTERS, [plain('A')], ['A'])).toBeNull();
  });

  it('counts the names that MATCH against every name on the board, never "Showing"', () => {
    const v = view(fresh, [plain('A'), plain('B'), plain('C')], ['A']);
    expect(v?.match).toBe('1 of 3 names match.');
    expect(v?.matchHover).toBe('3 is every name on the board before these filters. 1 match; the table shows the first 12, 25 or 50 of them, plus any moving names among the rest.');
    expect(JSON.stringify(v)).not.toContain('Showing');
    expect(view(fresh, [plain('A')], [])?.match).toBe('0 of 1 name matches.');
    // More matches than Top 12 shows: the count is every match, not the rows on screen.
    const many = Array.from({ length: 31 }, (_, i) => plain(`T${i}`));
    expect(view(fresh, many, many.slice(0, 20).map((r) => r.ticker))?.match).toBe('20 of 31 names match.');
  });

  it('names the moving names the filters remove, ranked or not, biggest move first; IPDN is listed', () => {
    const board = [plain('KEEP'), ranked('IPDN', 70.04), mover('AIXI', 116.2), mover('PASS', 40)];
    const v = view(fresh, board, ['KEEP', 'PASS']);
    expect(v?.hidden?.movers.map((m) => `${m.ticker} ${m.move}`)).toEqual(['AIXI +116%', 'IPDN +70%']);
    expect(v?.hidden?.more).toBeNull();
    expect(v?.hidden?.movers[1].hover).toBe(
      'IPDN: up 70.0% from the prior close on 5M shares since 04:00 ET. Opens its drawer; the filters stay on.',
    );
  });

  it('never lists a mover the filters keep, a non-mover, or a row not measured from the prior close', () => {
    const board = [mover('KEPT', 50), plain('NOTMOVER'), mover('LATE', 60, { referenceRthCloseBasis: 'CURRENT_SESSION' })];
    expect(view(fresh, board, ['KEPT'])?.hidden).toBeNull();
  });

  it('stops at five, then "and {n} more"; exactly five has no overflow', () => {
    const six = ['A', 'B', 'C', 'D', 'E', 'F'].map((t, i) => mover(t, 10 + i));
    const v6 = view(fresh, six, []);
    expect(v6?.hidden?.movers).toHaveLength(5);
    expect(v6?.hidden?.movers[0].ticker).toBe('F');
    expect(v6?.hidden?.more).toBe('and 1 more');
    expect(view(fresh, six.slice(0, 5), [])?.hidden?.more).toBeNull();
  });

  it('carries no em dash', () => {
    const v = view({ ...fresh, grade: 'C' }, [ranked('IPDN', 70), mover('AIXI', 116)], []);
    expect(JSON.stringify(v)).not.toContain(EM_DASH);
    expect(Object.values(FILTER_BANNER_WORDS).filter((w) => typeof w === 'string').join(' ')).not.toContain(EM_DASH);
  });
});
