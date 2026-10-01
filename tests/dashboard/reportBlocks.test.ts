import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { describe, expect, it } from 'vitest';

import type { ReportCheckpointRef, ReportLine, ReportPath, ReportSection } from '@/lib/desk/reports/contract';
import { NOTHING_LINE } from '@/lib/desk/reports/writer';
import {
  EMPTY_REPORT_LINE,
  emptyReportLine,
  figureSegments,
  pathText,
  pathView,
  reportBlocks,
  reportCoverage,
} from '@/lib/dashboard/sessionReports';

/*
 * Report window, row A (his pick "a now, then b"; the mock's artboard "A"), and
 * his "b" of 2026-10-01T02:24:33Z: the model-written section HEADINGS ARE HIDDEN
 * until v6 computes them. Written from those rules, not from the code:
 *
 * - one list in the writer's order, a card per name (a name's later lines join
 *   its card where it first appeared); nothing stands in for a heading;
 * - an empty section contributes nothing, and the writer's NOTHING_LINE is
 *   dropped (its truth is judged against the hidden heading);
 * - the path is three labelled points, the figures beside it computed from them;
 * - figures in the prose are set apart; dates, years and names are not figures.
 */

const line = (ticker: string | null, text: string, extra: Partial<ReportLine> = {}): ReportLine => ({
  ticker,
  text,
  liveFeed: true,
  ...extra,
});
const section = (heading: string, lines: ReportLine[]): ReportSection => ({ heading, lines });
const checkpoint = (completedAt: string): ReportCheckpointRef => ({
  id: 1,
  type: 'OPEN_SPIKE' as ReportCheckpointRef['type'],
  completedAt,
});
const intraday: ReportPath = { from: 3.59, high: 6.01, now: 5.1, fromBasis: 'PRIOR_CLOSE' };

describe('the body with the headings hidden', () => {
  const report = {
    sections: [
      section('Fresh and material news', [line('GOW', 'GOW one.'), line('ABC', 'ABC one.')]),
      section('Struck to nothing', []),
      section('Quiet', [line(null, NOTHING_LINE)]),
      section('Faded', [line(null, 'A sentence about no name.'), line('GOW', 'GOW two.'), line('XYZ', 'XYZ one.')]),
    ],
  };
  const blocks = reportBlocks(report);

  it("keeps the writer's order across sections, one card per name", () => {
    expect(blocks.map((block) => (block.kind === 'NAME' ? block.ticker : block.text))).toEqual([
      'GOW',
      'ABC',
      'A sentence about no name.',
      'XYZ',
    ]);
  });

  it("joins a name's later sentence to its first card, in order", () => {
    const gow = blocks[0];
    expect(gow.kind === 'NAME' && gow.texts).toEqual(['GOW one.', 'GOW two.']);
  });

  it('prints no heading: no block carries any section heading', () => {
    const printed = JSON.stringify(blocks);
    for (const s of report.sections) expect(printed).not.toContain(s.heading);
  });

  it("drops an empty section and the writer's NOTHING_LINE, and nothing else", () => {
    expect(JSON.stringify(blocks)).not.toContain(NOTHING_LINE);
    expect(blocks).toHaveLength(4);
  });

  it("takes a name's company and path from the first line that has them", () => {
    const company = { name: 'Acme Inc.', country: 'Canada', business: null };
    const [card] = reportBlocks({
      sections: [
        section('a', [line('ACM', 'one', { company: null, path: null })]),
        section('b', [line('ACM', 'two', { company, path: intraday })]),
        section('c', [line('ACM', 'three', { company: { ...company, name: 'Other' }, path: { ...intraday, now: 1 } })]),
      ],
    });
    expect(card.kind === 'NAME' && [card.company, card.path]).toEqual([company, intraday]);
  });

  // The header's rule (reportCoverage): a name counts as live if ANY line had
  // the feed, unknown if any could not say, else without; the header and the
  // marks are ONE fact. A card must therefore say what the header counts.
  it("gives each card the feed state the header counts for that name, for every pair of lines", () => {
    const flags = [true, false, null] as const;
    for (const a of flags) {
      for (const b of flags) {
        const report = { sections: [section('x', [line('N', 'one', { liveFeed: a })]), section('y', [line('N', 'two', { liveFeed: b })])] };
        const [card] = reportBlocks(report);
        const header = reportCoverage(report);
        const expected = header.withLiveFeed === 1 ? true : header.unknown === 1 ? null : false;
        expect(card.kind === 'NAME' && card.liveFeed, `${a} + ${b}`).toBe(expected);
      }
    }
    const one = (a: boolean | null, b: boolean | null) => {
      const [card] = reportBlocks({ sections: [section('x', [line('N', '1', { liveFeed: a }), line('N', '2', { liveFeed: b })])] });
      return card.kind === 'NAME' ? card.liveFeed : 'prose';
    };
    expect([one(true, false), one(false, null), one(false, false)]).toEqual([true, null, false]);
  });
});

describe('an empty body', () => {
  const empty = { sections: [section('a', []), section('b', [line(null, NOTHING_LINE)])] };

  it('says nothing more on v5 when the watch line already says nothing is on watch', () => {
    expect(emptyReportLine({ ...empty, watchCount: 0 })).toBeNull();
  });

  it('gets one neutral line about the report otherwise', () => {
    expect(emptyReportLine({ ...empty })).toBe(EMPTY_REPORT_LINE);
    expect(emptyReportLine({ ...empty, watchCount: 3 })).toBe(EMPTY_REPORT_LINE);
    expect(EMPTY_REPORT_LINE).not.toMatch(/sources|nothing|market/i);
  });

  it('is silent when anything prints', () => {
    expect(emptyReportLine({ sections: [section('a', [line(null, 'One sentence.')])] })).toBeNull();
  });
});

describe('the path as three labelled points', () => {
  const at = { checkpoints: [checkpoint('2026-09-28T13:27:10Z')] };

  it("uses exactly pathText's words, so the card and the line cannot disagree", () => {
    const view = pathView(intraday, at);
    expect(view?.points.map((p) => `${p.price} ${p.label}`).join(' → ')).toBe(pathText(intraday, at));
    const premarket: ReportPath = { from: 0.3125, high: 0.4, now: 0.35, fromBasis: 'TODAY_CLOSE' };
    expect(pathView(premarket, at)?.points.map((p) => p.label)).toEqual(['prior close', 'AH high', 'AH close']);
  });

  it('computes both figures from the printed values', () => {
    // 5.10 / 3.59 - 1 = 42.06%; (6.01 - 5.10) / 6.01 = 15.14%
    expect(pathView(intraday, at)).toMatchObject({
      direction: 'UP',
      change: '+42.1% vs prior close',
      fromHigh: '15.1% under the high',
    });
    expect(pathView({ ...intraday, now: 3.0 }, at)).toMatchObject({
      direction: 'DOWN',
      change: '−16.4% vs prior close',
    });
  });

  it('names a flat close and a close at the high without a signed zero', () => {
    expect(pathView({ ...intraday, now: 3.59 }, at)).toMatchObject({ direction: 'FLAT', change: 'flat vs prior close' });
    expect(pathView({ ...intraday, now: 6.01 }, at)?.fromHigh).toBe('at the high');
    expect(pathView({ from: 1, high: 2, now: 1.5, fromBasis: 'TODAY_CLOSE' }, at)?.fromHigh).toBe(
      '25.0% under the AH high',
    );
  });

  it('is absent wherever the one-line path is', () => {
    expect(pathView(null, at)).toBeNull();
    expect(pathView({ ...intraday, high: 0 }, at)).toBeNull();
    expect(pathView({ ...intraday, fromBasis: 'NEW' as ReportPath['fromBasis'] }, at)).toBeNull();
  });
});

describe('figures in the prose', () => {
  const figures = (text: string) => figureSegments(text).filter((s) => s.figure).map((s) => s.text);

  it('rejoins to exactly the sentence it split', () => {
    for (const text of [
      'Net profit was US$22.8 million, EPS US$0.56, up 366.7%.',
      'Filed an 8-K and a 10-Q on June 3, 2026 at 08:00 ET.',
      '',
      '57,401,944 shares; 9.44x the float.',
    ]) {
      expect(figureSegments(text).map((s) => s.text).join('')).toBe(text);
    }
  });

  it('sets apart money, percents, multiples, separated counts and decimals', () => {
    expect(figures('Net profit was US$22.8 million, EPS $0.56, up 366.7%.')).toEqual([
      'US$22.8 million',
      '$0.56',
      '366.7%',
    ]);
    expect(figures('57,401,944 shares, 9.44x the float, +85.5% on the day, a 1.5M block.')).toEqual([
      '57,401,944',
      '9.44x',
      '+85.5%',
      '1.5M',
    ]);
    expect(figures('Up 35% on 2x volume.')).toEqual(['35%', '2x']);
  });

  it('leaves dates, years, clock times, plain counts and names as prose', () => {
    expect(figures('On June 3, 2026 at 08:00 ET, Week 4, 12 names.')).toEqual([]);
    expect(figures('An 8-K, a 10-Q, an F-3, Q4 results, a 424B5, 5m candles, v5.1.')).toEqual([]);
    expect(figures('A 3.5mg dose and a 2.0L engine.')).toEqual([]);
  });
});

describe('the window', () => {
  const source = readFileSync(join(process.cwd(), 'components/SessionReports.tsx'), 'utf8')
    .replace(/\{\/\*[\s\S]*?\*\/\}/g, '')
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/^\s*\/\/.*$/gm, '');

  it('never prints a section heading', () => {
    expect(source).not.toMatch(/\.heading\b/);
    expect(source).toContain('reportBlocks(report)');
  });
});
