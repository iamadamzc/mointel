/**
 * The evening report's 10 pm edition on the surface (his "same report, just edited with new information",
 * 2026-10-07T02:41:47.719Z; Research's R2 at 1226d409). Words: Marketing v2 at 98b22b36, passed by
 * Commercial 30a. Every string says what the REPORT did, never that the market or a filing changed.
 */

import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';

import { NameCard } from '@/components/SessionReports';
import { cardRevisionMark, replacesLine, reportBlocks, reportTimeline, revisionLine } from '@/lib/dashboard/sessionReports';
import { buildReportsPayload, type StoredReportRow } from '@/lib/desk/reports/api';
import type { SessionReport } from '@/lib/desk/reports/contract';
import { DEFAULT_REPORT_RANGES } from '@/lib/desk/reports/ranges';

const EM_DASH = String.fromCharCode(0x2014);
// 02:02Z is 10:02 pm EDT; 00:30Z is 8:30 pm EDT, both on Sep 28 in ET.
const TEN = '2026-09-29T02:02:00.000Z';
const EIGHT_THIRTY = '2026-09-29T00:30:00.000Z';
const SAME_EVENING = Date.parse('2026-09-29T03:00:00.000Z'); // 11:00 pm ET, Sep 28
const NEXT_MORNING = Date.parse('2026-09-29T12:00:00.000Z'); // 8:00 am ET, Sep 29

const edition = (changedTickers: string[], narrativeChanged: boolean) => ({
  publishedAt: TEN,
  revisionOf: { publishedAt: EIGHT_THIRTY, changedTickers, narrativeChanged },
});

describe('the revision line', () => {
  it('nothing written for this edition: published again, everything carried', () => {
    expect(revisionLine(edition([], false), ['AAA', 'BBB'], SAME_EVENING)).toBe(
      'Published again at 10:02 pm ET; every line and the summary are carried from the 8:30 pm edition.',
    );
  });

  it('names written, the others carried; singular and plural', () => {
    expect(revisionLine(edition(['AAA', 'BBB'], false), ['AAA', 'BBB', 'CCC'], SAME_EVENING)).toBe(
      'Revised at 10:02 pm ET: 2 names have a line written for this edition and the others carry their 8:30 pm line.',
    );
    expect(revisionLine(edition(['AAA'], false), ['AAA', 'BBB'], SAME_EVENING)).toBe(
      'Revised at 10:02 pm ET: 1 name has a line written for this edition and the others carry their 8:30 pm line.',
    );
  });

  it('every name on the report written for this edition: the carry clause is dropped', () => {
    expect(revisionLine(edition(['AAA', 'BBB'], false), ['AAA', 'BBB'], SAME_EVENING)).toBe(
      'Revised at 10:02 pm ET: 2 names have a line written for this edition.',
    );
  });

  it('names and the summary; the summary alone', () => {
    expect(revisionLine(edition(['AAA'], true), ['AAA', 'BBB'], SAME_EVENING)).toBe(
      'Revised at 10:02 pm ET: 1 name has a line written for this edition and the others carry their 8:30 pm line. The summary was written for this edition.',
    );
    expect(revisionLine(edition([], true), ['AAA'], SAME_EVENING)).toBe(
      'Revised at 10:02 pm ET: the summary was written for this edition; every line is carried from the 8:30 pm edition.',
    );
  });

  it('read on another ET day: both times carry their date, and "at" goes', () => {
    expect(revisionLine(edition(['AAA'], false), ['AAA', 'BBB'], NEXT_MORNING)).toBe(
      'Revised Sep 28, 10:02 pm ET: 1 name has a line written for this edition and the others carry their Sep 28, 8:30 pm line.',
    );
  });

  it('a duplicate ticker counts once', () => {
    expect(revisionLine(edition(['AAA', 'AAA'], false), ['AAA', 'BBB'], SAME_EVENING)).toContain('1 name has');
  });

  it('no revisionOf, or an unreadable time: no line', () => {
    expect(revisionLine({ publishedAt: TEN }, ['AAA'], SAME_EVENING)).toBeNull();
    expect(revisionLine({ publishedAt: TEN, revisionOf: null }, ['AAA'], SAME_EVENING)).toBeNull();
    expect(revisionLine({ publishedAt: 'soon', revisionOf: edition([], false).revisionOf }, ['AAA'], SAME_EVENING)).toBeNull();
  });

  it('never says again, changed, updated or no change, and no em dash', () => {
    const all = [
      revisionLine(edition([], false), ['A'], SAME_EVENING),
      revisionLine(edition(['A'], true), ['A', 'B'], NEXT_MORNING),
      revisionLine(edition([], true), ['A'], SAME_EVENING),
    ] as string[];
    for (const s of all) {
      expect(s).not.toMatch(/again,|written again|changed|updated|no change/i);
      expect(s.includes(EM_DASH)).toBe(false);
    }
  });
});

describe('the card mark', () => {
  it('only on a name in changedTickers, with the hover naming both editions', () => {
    expect(cardRevisionMark(edition(['AAA'], false), 'AAA', SAME_EVENING)).toEqual({
      label: 'Line written for this edition',
      title: 'This line was written for the 10:02 pm ET edition, not carried from the 8:30 pm one.',
    });
    expect(cardRevisionMark(edition(['AAA'], false), 'BBB', SAME_EVENING)).toBeNull();
    expect(cardRevisionMark({ publishedAt: TEN }, 'AAA', SAME_EVENING)).toBeNull();
  });
});

describe('the replaces line (the other kinds, and an EVENING slot with no revisionOf)', () => {
  it('one or several older editions, 12-hour ET, with the date rule', () => {
    expect(replacesLine([{ publishedAt: EIGHT_THIRTY }], SAME_EVENING)).toBe('Replaces the edition published at 8:30 pm ET.');
    expect(replacesLine([{ publishedAt: EIGHT_THIRTY }, { publishedAt: '2026-09-29T01:10:00.000Z' }], SAME_EVENING)).toBe(
      'Replaces the editions published at 8:30 pm ET, 9:10 pm ET.',
    );
    expect(replacesLine([{ publishedAt: EIGHT_THIRTY }], NEXT_MORNING)).toBe('Replaces the edition published Sep 28, 8:30 pm ET.');
    expect(replacesLine([], SAME_EVENING)).toBeNull();
  });
});

describe('a stored 22:00 row filed under EVENING, through the card: no per-line research note', () => {
  const RECAP = { tradingDate: '2026-09-28', targetTradingDate: '2026-09-29', scheduledFor: '2026-09-29T02:00:00.000Z' };
  const row = (kind: SessionReport['kind'], publishedAt: string, lines: object[], extra: object = {}): StoredReportRow => ({
    kind,
    range_key: '1-20',
    trading_date: '2026-09-28',
    status: 'PUBLISHED',
    missed_cause: null,
    payload: JSON.stringify({
      kind,
      rangeId: '1-20',
      range: { min: 1, max: 20 },
      tradingDate: '2026-09-28',
      targetTradingDate: kind === 'PREMARKET' ? '2026-09-29' : null,
      checkpoints: [{ id: 551, type: 'NEXT_DAY_RECAP', completedAt: '2026-09-29T02:00:09.248Z' }],
      publishedAt,
      late: false,
      headline: null,
      sections: [{ heading: '', lines }],
      watchCount: 1,
      narrative: null,
      ...extra,
    }),
  });

  it("the 8:30 edition's note shows on its card; the 10 pm edition, the shape the pipeline writes for PREMARKET, shows none", () => {
    // The 8:30 EVENING row: the pipeline sets researchUpdatedAt for slot EVENING only (pipeline.ts:477 at 8df6fec9).
    const evening = row('EVENING', EIGHT_THIRTY, [{ ticker: 'SANG', liveFeed: true, text: 'x.', researchUpdatedAt: '2026-09-29T00:12:00.000Z' }]);
    // The 22:00 PREMARKET row: no researchUpdatedAt key on its lines (the pipeline adds none for that slot).
    const ten = row('PREMARKET', TEN, [{ ticker: 'SANG', liveFeed: true, text: 'y.', researchVersionId: 7 }], {
      revisionOf: { publishedAt: EIGHT_THIRTY, changedTickers: ['SANG'], narrativeChanged: false },
    });
    const payload = buildReportsPayload(RECAP, [evening, ten], DEFAULT_REPORT_RANGES, '1-20');
    const view = reportTimeline(payload, '1-20', SAME_EVENING);
    const current = view.current?.report;
    expect(current?.kind).toBe('EVENING');
    expect(current?.publishedAt).toBe(TEN);
    expect(view.current?.superseded.map((r) => r.publishedAt)).toEqual([EIGHT_THIRTY]);

    const render = (report: SessionReport) => {
      const block = reportBlocks(report).find((b) => b.kind === 'NAME');
      if (!block || block.kind !== 'NAME') throw new Error('no card');
      return renderToStaticMarkup(
        createElement(NameCard, { block, report, outsideRange: false, nowMs: SAME_EVENING, onSelectTicker: () => {} }),
      );
    };
    const tenHtml = render(current as SessionReport);
    expect(tenHtml).not.toContain('Research written again');
    expect(tenHtml).toContain('Line written for this edition');
    // Control: the same card code prints the note for the 8:30 edition's line.
    expect(render(view.current?.superseded[0] as SessionReport)).toContain('Research written again at 8:12 pm ET, after this checkpoint.');
  });
});
