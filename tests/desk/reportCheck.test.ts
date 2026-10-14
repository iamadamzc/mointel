import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

import {
  applyStrikes,
  buildCheckerPrompt,
  checkReport,
  draftLines,
  parseVerdicts,
  ruleStrikes,
  type CheckInput,
  type CheckerModel,
  type LineId,
  type Strike,
} from '@/lib/desk/reports/check';
import type { ReportFact } from '@/lib/desk/reports/facts';
import { NOTHING_LINE, factSheet, type ReportDraft } from '@/lib/desk/reports/writer';

/**
 * The deterministic rules decide on every line and the model cannot overrule
 * them, so each rule is tested in BOTH directions: it strikes its case, and it
 * admits a faithful line. A rule that strikes everything passes the first
 * half and fails the pass bar's control.
 */

const fact = (over: Partial<ReportFact> & { ticker: string }): ReportFact => ({
  assessmentRank: 1,
  price: null,
  percentChange: null,
  rvol: null,
  sessionHigh: null,
  sessionLow: null,
  referenceClose: null,
  ahPercentChange: null,
  ahVolume: null,
  volume: null,
  referenceBasis: 'PRIOR_SESSION',
  cycle: null,
  catalyst: null,
  structure: null,
  haltState: null,
  warnings: [],
  changeSummary: '',
  liveFeed: null,
  ...over,
});

// FFAI and SANG at 09:25 on 2026-09-29 (#556 on the prod copy), as stored.
const FFAI = fact({
  ticker: 'FFAI',
  assessmentRank: 9,
  price: 1.56,
  percentChange: 10.6,
  sessionHigh: 1.85,
  sessionLow: 1.47,
  rvol: 2.8,
  volume: 8_699_238,
  catalyst: 'MODERATE_MIXED_SECONDARY',
  structure: 'UNKNOWN',
  cycle: 'UNKNOWN',
  changeSummary: 'FFAI: -15.7% off session high.',
});
const SANG = fact({
  ticker: 'SANG',
  assessmentRank: 2,
  price: 4.97,
  percentChange: 38.5,
  sessionHigh: 5.17,
  catalyst: 'STRONG',
  cycle: 'GREEN_FRESH_FRONTSIDE',
});
// The 22:00 recap: CURRENT_SESSION, so its percent is the after-hours move.
const IMCC_RECAP = fact({
  ticker: 'IMCC',
  assessmentRank: 3,
  price: 3.17,
  percentChange: -25.06,
  ahPercentChange: -25.06,
  referenceClose: 4.23,
  referenceBasis: 'CURRENT_SESSION',
});

const CHECKPOINT = { id: 556, type: 'OPEN_SPIKE_ASSESSMENT' as const, completedAt: '2026-09-29T13:25:06.433Z' };

function input(lines: Array<{ ticker: string | null; text: string }>, headline = 'At 09:25 ET, SANG led the range.'): CheckInput {
  return {
    kind: 'INTO_RTH',
    range: { min: 1, max: 20 },
    checkpoint: CHECKPOINT,
    rows: [FFAI, SANG, IMCC_RECAP],
    draft: { headline, sections: [{ heading: 'Names', lines }] },
  };
}

const reasons = (lines: Array<{ ticker: string | null; text: string }>, headline?: string) =>
  ruleStrikes(input(lines, headline)).map((s) => `${s.id}:${s.reason}`);

describe('ruleStrikes admits faithful lines', () => {
  it('lines taken from the first live draft (luna, 09-29 09:25), after the giveback note fix', () => {
    expect(
      reasons([
        { ticker: 'SANG', text: 'SANG was $4.97, up 38.5% from the prior close and now 3.9% under its session high.' },
        { ticker: 'FFAI', text: 'FFAI was $1.56, up 10.6% from the prior close; since the previous checkpoint it slipped to 15.7% under its session high.' },
        { ticker: 'FFAI', text: 'FFAI: catalyst our sources found: moderate / mixed / secondary; structure: analysis reached no conclusion.' },
        { ticker: 'IMCC', text: 'IMCC is down 25.1% after hours, from the regular-session close of $4.23, ranked #3 in this range.' },
        { ticker: null, text: NOTHING_LINE },
      ]),
    ).toEqual([]);
  });

  it('every line of the writer\'s own sheet, set as a line about its name', () => {
    for (const row of [FFAI, SANG, IMCC_RECAP]) {
      // Each sheet line as a one-name line: "FFAI: price: $1.56". The first
      // sheet line already opens with the ticker.
      const lines = factSheet(row).map((text) => ({
        ticker: row.ticker,
        text: text.startsWith(row.ticker) ? text : `${row.ticker}: ${text}`,
      }));
      expect(lines.length, row.ticker).toBeGreaterThan(5);
      expect(reasons(lines), row.ticker).toEqual([]);
    }
  });

  it('a line need not name its own ticker: the surface prints it as the lead', () => {
    expect(reasons([{ ticker: 'SANG', text: 'Up 38.5% from the prior close, at $4.97.' }])).toEqual([]);
  });

  it('both approved forms of "no catalyst": "found in our sources" and "... on file" (marketing.md)', () => {
    expect(
      reasons([
        { ticker: 'SANG', text: 'SANG printed a new high of day; the desk has not researched it, with no catalyst, structure or cycle on file.' },
        { ticker: 'SANG', text: 'SANG: we found no catalyst on file.' },
        { ticker: 'SANG', text: 'SANG has no catalyst found in our sources.' },
      ]),
    ).toEqual([]);
  });

  it('"exit-and-avoid", the ruled long-only phrase, is not "exit"', () => {
    expect(reasons([{ ticker: 'SANG', text: 'SANG reads as an exit-and-avoid read, not a setup.' }])).toEqual([]);
  });
});

describe('ruleStrikes strikes', () => {
  it.each([
    ['a number not in the row', 'SANG was up 48.5% from the prior close.', 'S1L1:NUMBER_NOT_IN_ROW'],
    ['a rank from another list', 'SANG ranked #1 in this range, up 38.5% from the prior close.', 'S1L1:RANK_NOT_IN_ROW'],
    ['a time that is not the checkpoint\'s', 'At 09:30 ET SANG was $4.97.', 'S1L1:TIME_NOT_CHECKPOINT'],
    ['advice', 'SANG is one to watch at $4.97.', 'S1L1:FORBIDDEN_WORDING'],
    ['a prediction', 'SANG will hold $4.97.', 'S1L1:FORBIDDEN_WORDING'],
    ['a bare "no catalyst"', 'SANG has no catalyst.', 'S1L1:FORBIDDEN_WORDING'],
    ['"the real catalyst"', 'SANG\'s real catalyst is strong.', 'S1L1:FORBIDDEN_WORDING'],
    ['"quiet"', 'SANG went quiet at $4.97.', 'S1L1:FORBIDDEN_WORDING'],
    ['an engine constant', 'SANG reads GREEN_FRESH_FRONTSIDE.', 'S1L1:FORBIDDEN_WORDING'],
    ['a halt with none observed', 'SANG was not halted.', 'S1L1:FORBIDDEN_WORDING'],
    ['"entered" the board', 'SANG entered the board at $4.97.', 'S1L1:FORBIDDEN_WORDING'],
    ['a line that leans on another', 'It was $4.97, SANG says.', 'S1L1:NOT_SELF_CONTAINED'],
    ['an em dash (his hard rule)', 'SANG ran to $6.01 — and came back.', 'S1L1:FORBIDDEN_WORDING'],
    ['an em dash as an entity', 'SANG ran to $6.01 &mdash; and came back.', 'S1L1:FORBIDDEN_WORDING'],
    ['a spaced hyphen used as a dash', 'SANG ran to $6.01 - and came back.', 'S1L1:FORBIDDEN_WORDING'],
    ['a written count of names', 'SANG led 12 names into the premarket.', 'S1L1:FORBIDDEN_WORDING'],
    ['a count of names in words', 'SANG led twelve names into the premarket.', 'S1L1:FORBIDDEN_WORDING'],
  ])('%s', (_, text, expected) => {
    expect(reasons([{ ticker: 'SANG', text }])).toContain(expected);
  });

  it('admits what the dash and count rules must not strike: an en-dash range, a negative number, "a name"', () => {
    expect(reasons([{ ticker: 'SANG', text: 'SANG traded in the $1–$20 range from 04:00–20:00.' }])).not.toContain(
      'S1L1:FORBIDDEN_WORDING',
    );
    expect(reasons([{ ticker: 'SANG', text: 'SANG was -25.1% after hours, a name that gave back.' }])).not.toContain(
      'S1L1:FORBIDDEN_WORDING',
    );
  });

  it('"on file" in ANOTHER sentence does not rescue a bare "no catalyst"', () => {
    expect(reasons([{ ticker: 'SANG', text: 'SANG has no catalyst. Its structure is on file as caution.' }])).toContain(
      'S1L1:FORBIDDEN_WORDING',
    );
  });

  it('a line naming a second name in scope', () => {
    expect(reasons([{ ticker: 'SANG', text: 'SANG was $4.97, ahead of FFAI.' }])).toContain('S1L1:NOT_SELF_CONTAINED');
  });

  it('"prior close" on the after-hours basis', () => {
    expect(reasons([{ ticker: 'IMCC', text: 'IMCC is down 25.1% from the prior close.' }])).toContain(
      'S1L1:BASIS_CONTRADICTED',
    );
  });

  it('a line about a name with no row', () => {
    expect(reasons([{ ticker: 'TCRT', text: 'TCRT was $1.50.' }])).toContain('S1L1:NO_ROW_FOR_TICKER');
  });

  it('a number in a line with no row to trace it to, headline included', () => {
    expect(reasons([], 'At 09:25 ET, 12 names led the range.')).toContain('H:NUMBER_WITHOUT_ROW');
    expect(reasons([{ ticker: null, text: 'Three names were up 38.5%.' }])).toContain('S1L1:NUMBER_WITHOUT_ROW');
  });

  it('a ticker-less line that names a ticker (the headline may)', () => {
    expect(reasons([{ ticker: null, text: 'SANG led.' }], 'At 09:25 ET, SANG led the range.')).toEqual([
      'S1L1:NOT_SELF_CONTAINED',
    ]);
  });

  it('a halt IS sayable when the desk observed one', () => {
    const halted = { ...input([{ ticker: 'SANG', text: 'SANG was halted at $4.97.' }]) };
    halted.rows = [{ ...SANG, haltState: 'HALTED' }];
    expect(ruleStrikes(halted)).toEqual([]);
  });
});

describe('the model reading', () => {
  it('is shown the stored fields, never the writer\'s sheet, and every line by id', () => {
    const prompt = buildCheckerPrompt(input([{ ticker: 'FFAI', text: 'FFAI was $1.56.' }]));
    expect(prompt.user).toContain('"referenceBasis": "PRIOR_SESSION"');
    expect(prompt.user).toContain('"notes": "FFAI: -15.7% off session high."');
    expect(prompt.user).not.toContain('slipped to');
    expect(prompt.user).toContain('H: At 09:25 ET, SANG led the range.');
    expect(prompt.user).toContain('S1L1 [FFAI]: FFAI was $1.56.');
    expect(prompt.user).toContain('Checkpoint time: 09:25 ET.');
  });

  it('carries the three run-1 admissions from their sources: note semantics, the report moment, the red-backside reading', () => {
    const prompt = buildCheckerPrompt(input([{ ticker: 'FFAI', text: 'FFAI was $1.56.' }]));
    expect(prompt.system).toContain('EVERY note is a change between the previous checkpoint and this one');
    expect(prompt.system).toContain('"lost $X support" (price fell below that level since the previous checkpoint)');
    expect(prompt.system).toContain('"an exit-and-avoid read, not a setup"');
    expect(prompt.system).toContain("THE REPORT'S OWN MOMENT");
    expect(prompt.user).toContain('Report: the briefing into the regular-session open, built at 09:25 for the 09:30 open.');
    const powerHour = buildCheckerPrompt({ ...input([]), kind: 'INTO_POWER_HOUR' });
    expect(powerHour.user).toContain('built at 14:30 for the last hour of the regular session');
  });

  const ids = draftLines(input([{ ticker: 'SANG', text: 'x' }, { ticker: 'FFAI', text: 'y' }]).draft).map((l) => l.id);
  const verdict = (id: string, supported = true) => ({ id, supported, note: supported ? '' : 'why' });

  it('parses a verdict for every line', () => {
    const raw = JSON.stringify({ verdicts: [verdict('H'), verdict('S1L1', false), verdict('S1L2')] });
    expect(parseVerdicts(raw, ids)).toEqual({ ok: true, unsupported: [{ id: 'S1L1', note: 'why' }] });
  });

  it.each([
    ['not JSON', 'nope'],
    ['a line has no verdict', JSON.stringify({ verdicts: [verdict('H'), verdict('S1L1')] })],
    ['duplicate id S1L1', JSON.stringify({ verdicts: [verdict('H'), verdict('S1L1'), verdict('S1L1'), verdict('S1L2')] })],
    ['unknown id S9L9', JSON.stringify({ verdicts: [verdict('H'), verdict('S1L1'), verdict('S1L2'), verdict('S9L9')] })],
  ])('fails closed: %s', (error, raw) => {
    expect(parseVerdicts(raw, ids)).toEqual({ ok: false, error });
  });

  /*
   * A draft with no headline has no 'H' line. The Claude checker answered for one anyway in both checker failures of
   * the L13 re-check (raw 0374313a); each reply was otherwise complete, and the whole report fell to CHECKER_FAILED.
   */
  const realReplies = JSON.parse(
    fs.readFileSync(path.join(process.cwd(), 'tests/desk/fixtures/checker-h-verdict-2026-10-14.json'), 'utf8'),
  ) as Array<{ source: string; ids: LineId[]; raw: string }>;

  it.each(realReplies.map((r) => [r.source, r]))('a real reply with a stray H verdict parses: %s', (_source, reply) => {
    expect(reply.ids).not.toContain('H');
    expect(JSON.parse(reply.raw).verdicts.some((v: { id: string }) => v.id === 'H')).toBe(true);
    const parsed = parseVerdicts(reply.raw, reply.ids, { secondRead: true });
    expect(parsed.ok).toBe(true);
  });

  const noHeadline: LineId[] = ['O', 'S1L1'];
  it('with no headline, an H verdict is ignored and every expected id is still required', () => {
    const complete = JSON.stringify({ verdicts: [verdict('H', false), verdict('O'), verdict('S1L1', false)] });
    expect(parseVerdicts(complete, noHeadline)).toEqual({ ok: true, unsupported: [{ id: 'S1L1', note: 'why' }] });
    const missing = JSON.stringify({ verdicts: [verdict('H'), verdict('O')] });
    expect(parseVerdicts(missing, noHeadline)).toEqual({ ok: false, error: 'a line has no verdict' });
  });

  it('with no headline, any other unknown id still fails closed', () => {
    const raw = JSON.stringify({ verdicts: [verdict('H'), verdict('O'), verdict('S1L1'), verdict('S9L9')] });
    expect(parseVerdicts(raw, noHeadline)).toEqual({ ok: false, error: 'unknown id S9L9' });
  });
});

describe('checkReport', () => {
  const at = () => new Date('2026-09-29T13:26:00.000Z');
  const reply = (body: unknown): CheckerModel => ({ complete: async () => JSON.stringify(body) });
  const draft = input([
    { ticker: 'SANG', text: 'SANG will hold $4.97.' },
    { ticker: 'FFAI', text: 'FFAI was $1.56 on FDA news.' },
  ]);

  it('the model adds strikes; it cannot remove a rule\'s', async () => {
    const result = await checkReport(
      draft,
      reply({
        verdicts: [
          { id: 'H', supported: true, note: '' },
          { id: 'S1L1', supported: true, note: '' },
          { id: 'S1L2', supported: false, note: 'catalyst content not stored' },
        ],
      }),
      at,
    );
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.strikes.map((s) => `${s.id}:${s.reason}:${s.by}`)).toEqual([
      'S1L1:FORBIDDEN_WORDING:rule',
      'S1L2:UNSUPPORTED:model',
    ]);
    expect(result.lines).toBe(3);
  });

  it('a model error or a partial reply is CHECKER_FAILED, never a pass', async () => {
    const failed = { ok: false, cause: { kind: 'CHECKER_FAILED', at: '2026-09-29T13:26:00.000Z' } };
    await expect(checkReport(draft, { complete: async () => Promise.reject(new Error('x')) }, at)).resolves.toEqual(failed);
    await expect(checkReport(draft, reply({ verdicts: [{ id: 'H', supported: true, note: '' }] }), at)).resolves.toEqual(
      failed,
    );
  });
});

describe('applyStrikes', () => {
  const at = () => new Date('2026-09-29T13:26:00.000Z');
  const strike = (id: string): Strike => ({ id: id as Strike['id'], reason: 'UNSUPPORTED', by: 'model', detail: '' });
  const d: ReportDraft = {
    headline: 'Headline.',
    sections: [
      { heading: 'Held', lines: [{ ticker: 'SANG', text: 'SANG held.' }] },
      { heading: 'Gave back', lines: [{ ticker: 'FFAI', text: 'FFAI gave back.' }, { ticker: 'IMCC', text: 'IMCC gave back.' }] },
      { heading: 'Halts', lines: [{ ticker: null, text: NOTHING_LINE }] },
    ],
  };

  it('a section emptied by strikes keeps its heading with no lines (the surface prints the neutral line), never NOTHING_LINE', () => {
    const out = applyStrikes(d, [strike('S1L1'), strike('S2L1')], at);
    expect(out).toEqual({
      ok: true,
      headline: 'Headline.',
      sections: [
        { heading: 'Held', lines: [] },
        { heading: 'Gave back', lines: [{ ticker: 'IMCC', text: 'IMCC gave back.' }] },
        { heading: 'Halts', lines: [{ ticker: null, text: NOTHING_LINE }] },
      ],
      overall: null,
      watchCount: 1,
    });
  });

  describe('v5: no headline, an overall sentence, ALL_STRUCK on the body only (Design 6fb68956)', () => {
    const v5: ReportDraft = {
      headline: '',
      overall: 'Across the $1–$20 range, 2,454 traded after hours, 749 up, 569 down.',
      sections: [{ heading: 'Moved', lines: [{ ticker: 'SANG', text: 'Ran and gave back part of it.' }] }],
    };

    it('checks no headline line, and returns headline null with the overall kept', () => {
      const out = applyStrikes(v5, [], at);
      expect(out).toMatchObject({ ok: true, headline: null, overall: v5.overall, watchCount: 1 });
    });

    it('a struck overall is dropped, never replaced; the report stands on its lines', () => {
      expect(applyStrikes(v5, [strike('O')], at)).toMatchObject({ ok: true, overall: null, watchCount: 1 });
    });

    it('every BODY line struck is ALL_STRUCK, even with the overall standing', () => {
      expect(applyStrikes(v5, [strike('S1L1')], at)).toEqual({
        ok: false,
        cause: { kind: 'ALL_STRUCK', at: '2026-09-29T13:26:00.000Z' },
      });
    });
  });

  it('counts the DISTINCT names on surviving lines: struck names drop out, a repeat counts once, a NOTHING_LINE counts none', () => {
    const repeated: ReportDraft = {
      ...d,
      sections: [...d.sections, { heading: 'Also held', lines: [{ ticker: 'IMCC', text: 'IMCC held too.' }] }],
    };
    expect(applyStrikes(repeated, [], at)).toMatchObject({ ok: true, watchCount: 3 });
    expect(applyStrikes(repeated, [strike('S2L2')], at)).toMatchObject({ ok: true, watchCount: 3 });
    expect(applyStrikes(repeated, [strike('S2L2'), strike('S4L1')], at)).toMatchObject({ ok: true, watchCount: 2 });
    expect(applyStrikes(repeated, [strike('S1L1'), strike('S2L1'), strike('S2L2'), strike('S4L1')], at)).toMatchObject({
      ok: true,
      watchCount: 0,
    });
  });

  it('a struck headline is not replaced', () => {
    const out = applyStrikes(d, [strike('H')], at);
    expect(out.ok && out.headline).toBeNull();
  });

  it('a struck NOTHING_LINE is never re-published: its section keeps its heading with no lines', () => {
    const out = applyStrikes(d, [strike('S3L1')], at);
    expect(out.ok && out.sections[2]).toEqual({ heading: 'Halts', lines: [] });
  });

  it('everything struck is ALL_STRUCK', () => {
    expect(applyStrikes(d, ['H', 'S1L1', 'S2L1', 'S2L2', 'S3L1'].map(strike), at)).toEqual({
      ok: false,
      cause: { kind: 'ALL_STRUCK', at: '2026-09-29T13:26:00.000Z' },
    });
  });
});
