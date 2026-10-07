import { readFileSync } from 'node:fs';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';

import { FloatCell } from '@/components/FloatCell';
import { FLOAT_PAGE_HREF, type FloatBound } from '@/lib/dashboard/floatBound';
import { buildDeskRow } from '@/lib/dashboard/merge';
import { discoveryMissingCount, discoveryValueFor, sortDiscoveryRows } from '@/lib/dashboard/view';

const bound = (over: Partial<FloatBound> = {}): FloatBound => ({
  state: 'PRODUCED',
  reason: null,
  bound: 8_100_000,
  countAsOf: '2026-09-22',
  countFiled: '2026-09-25',
  subtractedHolders: 1,
  filingsReadOn: '2026-10-05',
  holdingsFiledOn: ['2026-09-18'],
  countShares: 9_000_000,
  countForm: '10-Q',
  insiders: [],
  ...over,
});

const render = (b: FloatBound | null | undefined) => renderToStaticMarkup(createElement(FloatCell, { bound: b }));

describe('FloatCell, server-rendered', () => {
  it('prints the bound and its m/d date on one line, as a button with the long accessible name', () => {
    const html = render(bound());
    expect(html).toContain('8.10M');
    expect(html).toContain('>9/22<');
    expect(html).toContain('<button');
    expect(html).toContain('whitespace-nowrap');
    // v25: the claim's date is the board's ({D-label}; "the checkpoint" with no board date), the count's date an input.
    expect(html).toContain(
      'aria-label="no more than 8.10M shares as of the checkpoint, computed from the share count dated Sep 22, 2026 and insider holdings filed through Oct 5, 2026, when the filings line up; details on click"',
    );
  });

  it('prints the words for the other states, and "Not computed" for no state at all', () => {
    expect(render({ ...bound({ bound: null, countAsOf: null }), state: 'UNKNOWN', reason: 'NO_FILED_COUNT' })).toContain('>Unknown<');
    expect(render({ ...bound({ bound: null }), state: 'CANNOT_VERIFY', reason: 'ISSUANCE_FLAGGED' })).toContain('>Cannot verify<');
    for (const none of [null, undefined]) expect(render(none)).toContain('>Not computed<');
  });

  it('carries only the trigger on the server; the popover and its link are built when it opens', () => {
    expect(render(bound())).not.toContain('role="dialog"');
    expect(render(bound())).not.toContain('Are float quotes real?');
  });

  it('links the public page in a new tab with noopener, from one constant', () => {
    const source = readFileSync('components/FloatCell.tsx', 'utf8');
    expect(source).toContain('href={FLOAT_PAGE_HREF}');
    expect(source).toContain('target="_blank"');
    expect(source).toContain('rel="noopener noreferrer"');
    expect(FLOAT_PAGE_HREF).toBe('/are-float-quotes-real');
  });
});

describe('sorting by float', () => {
  const row = (ticker: string, b: FloatBound | null, wired: boolean, displayed: number | null = null) => ({
    ...buildDeskRow(ticker, null, null, null),
    floatBound: b,
    floatBoundWired: wired,
    displayedFloat: displayed,
  });

  it('wired: orders by the SEC bound and gives a refused or absent float no number', () => {
    const rows = [
      row('BIG', bound({ bound: 90_000_000 }), true, 5),
      row('SMALL', bound({ bound: 3_000_000 }), true, 99),
      row('REF', { ...bound({ bound: null }), state: 'CANNOT_VERIFY', reason: 'COUNT_TOO_OLD' }, true, 1),
      row('NONE', null, true, 2),
    ];
    const order = sortDiscoveryRows(rows, { key: 'float', direction: 'asc' }, 'DAILY_RVOL').map((r) => r.ticker);
    expect(order.slice(0, 2)).toEqual(['SMALL', 'BIG']);
    expect(discoveryMissingCount(rows, 'float', 'DAILY_RVOL')).toBe(2);
  });

  it('not wired: unchanged, the Sheet float', () => {
    const r = row('AAA', bound({ bound: 3_000_000 }), false, 42);
    expect(discoveryValueFor(r, 'float', 'DAILY_RVOL')).toBe(42);
  });
});

describe('the board shows the column always once wired, and the legend once', () => {
  const board = readFileSync('components/DiscoveryBoard.tsx', 'utf8');

  it('always on when wired, sort-driven otherwise', () => {
    expect(board).toContain("const floatWired = rows.some((row) => row.floatBoundWired);");
    expect(board).toContain("const showFloat = floatWired || SORT_KEYS.find((entry) => entry.key === sort.key)?.column === 'float';");
  });

  it('renders the new cell only when wired, and the legend under the board', () => {
    expect(board).toContain('row.floatBoundWired ? (');
    expect(board).toContain('<FloatCell bound={row.floatBound} dateShown={dateShown} />');
    expect(board).toContain('floatWired ? <p className="mt-1.5 text-[11px] text-ink-3">{FLOAT_LEGEND}</p> : null');
  });
});
