/**
 * An all-unknown live-feed report reads as absent (Integration 35th; Commercial's condition; Research
 * 347f167a: the evening reports record no feed by construction). EXACT SCOPE: the per-card "feed not
 * recorded" mark and the header line drop ONLY when every named line is null; any recorded feed keeps
 * today's behaviour in full.
 */

import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';

import { NameCard } from '@/components/SessionReports';
import { coverageText, feedUnknownShown, reportBlocks, reportCoverage } from '@/lib/dashboard/sessionReports';
import type { SessionReport } from '@/lib/desk/reports/contract';

const report = (feeds: Array<boolean | null>): SessionReport =>
  ({
    kind: 'EVENING',
    rangeId: '1-20',
    range: { min: 1, max: 20 },
    tradingDate: '2026-10-07',
    targetTradingDate: null,
    checkpoints: [],
    publishedAt: '2026-10-08T00:31:48.440Z',
    late: false,
    headline: null,
    watchCount: feeds.length,
    narrative: null,
    sections: [{ heading: '', lines: feeds.map((liveFeed, i) => ({ ticker: `T${i}`, liveFeed, text: 'x.' })) }],
  }) as unknown as SessionReport;

const cards = (r: SessionReport) =>
  reportBlocks(r).flatMap((block) =>
    block.kind === 'NAME'
      ? [renderToStaticMarkup(createElement(NameCard, { block, report: r, outsideRange: false, nowMs: 0, onSelectTicker: () => {} }))]
      : [],
  );

describe('all null: absent', () => {
  it('no header line and no per-card mark', () => {
    const r = report([null, null, null]);
    expect(coverageText(reportCoverage(r))).toBeNull();
    expect(feedUnknownShown(reportCoverage(r))).toBe(false);
    for (const html of cards(r)) expect(html).not.toContain('feed not recorded');
  });
});

describe('mixed: today in full', () => {
  it('the counted header with "not recorded for N more", the null mark, and minute data', () => {
    const r = report([true, false, null]);
    expect(coverageText(reportCoverage(r))).toBe('1 of 2 names had live trade data; not recorded for 1 more');
    const html = cards(r);
    expect(html[2]).toContain('feed not recorded');
    expect(html[1]).toContain('minute data');
    expect(html[0]).not.toMatch(/feed not recorded|minute data/);
  });
});

describe('all known: today in full', () => {
  it('the counted header, minute data on a false, no null mark anywhere', () => {
    const r = report([true, false]);
    expect(coverageText(reportCoverage(r))).toBe('1 of 2 names had live trade data');
    const html = cards(r);
    expect(html[1]).toContain('minute data');
    for (const card of html) expect(card).not.toContain('feed not recorded');
  });
});
