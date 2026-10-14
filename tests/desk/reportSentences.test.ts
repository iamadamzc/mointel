import { describe, expect, it } from 'vitest';

import type { ReportKind } from '@/lib/desk/reports/contract';
import { capNarrative, capSentences, isCountSentence, NARRATIVE_MAX_SENTENCES, splitSentences } from '@/lib/desk/reports/sentences';
import COUNT_KEEP_DRAFTS from './fixtures/count-keep-drafts-2026-10-14.json';

/* The Summary's length backstop: abbreviation-safe sentences, the first N kept after the check, never a strike. */

/** Report 23, the first live v6 EVENING (2026-10-07), as published: seven sentences. */
const REPORT_23 =
  'Seven names ran at least 50 percent above the prior close by the regular-session high; none of them gave the entire move back, and four kept at least half of the peak gain at the close. SXTC ran to 667 percent above the prior close and closed up 126 percent from the prior close, with only older or secondary news found in our sources. PFAI ran to 200 percent above the prior close and closed up 117 percent from the prior close, with no catalyst found in our sources. After the close, DKI was up 16 percent, with shareholders approving the October 6 meeting matters, including a share-consolidation framework, while a September 30 F-1 proposes an offering of up to 4,166,666 units with ordinary shares or pre-funded warrants. Fresh news was found for 5 of the 12 names the desk covers. SXTC closed at $2.83, its regular-session high was $9.59, stored support was $1.56, stored resistance was $9.59, and open supply was a recent offering (active), warrants (possibly active), and an equity purchase agreement (possibly active). The desk covers 12 names into the next session.';

/** luna, the 10-06 paid run (d8bbf8a8), PREMARKET run 1: six sentences, one "U.S." before a capital. */
const LUNA_6 =
  'Twelve names ran at least 50 percent above the prior close; none of them gave the entire move back, and five kept at least half of the peak gain at the close. XHG ran to 190 percent above the prior close and closed up 25 percent from the prior close, with fresh news on a proposed U.S. AI business expansion and a gradual reduction of mainland China operations. VCIG ran to 59 percent above the prior close and closed up 55 percent from the prior close, with fresh news on the launch of its VGAIN Compute AI Token Platform. After the close, MTEN was up 83 percent, with the company reporting completion of an acquisition for $15.0 million. Fresh news was found for 6 of the 12 names the desk covers, while 1 of the covered 50 percent movers had no fresh news found. XHG closed at $2.38 versus a session high of $5.51, with stored support at $1.81, stored resistance at $5.51, and open supply from an equity purchase agreement and shelf capacity; the desk covers 12 names into the next session.';

/** luna, PREMARKET run 2: eight sentences. */
const LUNA_8 =
  'At least 50 percent above the prior close, 12 names ran on the day. None of them gave the entire move back, while 5 kept at least half of the peak gain at the close. XHG ran to 190 percent above the prior close and closed up 25 percent from the prior close, with a proposed U.S. AI business expansion and a planned reduction of mainland China operations. VCIG ran to 59 percent above the prior close and closed up 55 percent from the prior close, with the launch of its VGAIN Compute AI Token Platform for AI infrastructure and LLM services. After the close, MTEN was up 83 percent after the close, with the reported completion of its acquisition of 100% of the Target Company for $15.0 million. One of the covered 50 percent movers had no fresh news found in our sources, while fresh news was found for 6 of the 12 names the desk covers. XHG closed at $2.38 against a session high of $5.51, with stored support at $1.81, stored resistance at $5.51, and open supply from an equity purchase agreement and shelf capacity, both possibly active. The desk covers 12 names into the next session.';

/** luna, AFTER_HOURS run 2: four sentences against the intraday three. */
const LUNA_AH_4 =
  'XHG is up 25 percent from the prior close, with a proposed U.S. AI-business expansion, a planned reduction of mainland China operations, and an intended U.S. investment; it is up 11.7% since the previous checkpoint. IPDN is up 50 percent from the prior close, with an equipment lease and financing arrangement for two NVIDIA B300 systems representing approximately $1.177 million of initial commitments. OLOX is up 45 percent from the prior close, with no catalyst found in our sources; it lost $1.31 support since the previous checkpoint. Fresh news was found for 8 of the 12 names the desk covers.';

describe('splitSentences', () => {
  it('counts the real outputs: report 23 seven, luna six and eight, the after-hours run four', () => {
    expect(splitSentences(REPORT_23)).toHaveLength(7);
    expect(splitSentences(LUNA_6)).toHaveLength(6);
    expect(splitSentences(LUNA_8)).toHaveLength(8);
    expect(splitSentences(LUNA_AH_4)).toHaveLength(4);
  });

  it('never cuts at "U.S." before a capital, a company abbreviation, a month or a.m.', () => {
    expect(splitSentences('A proposed U.S. AI expansion. Next.')).toEqual(['A proposed U.S. AI expansion.', 'Next.']);
    expect(splitSentences('Acme Inc. Reported results. Then more.')).toEqual(['Acme Inc. Reported results.', 'Then more.']);
    expect(splitSentences('The meeting on Oct. 6 approved it. Then more.')).toEqual(['The meeting on Oct. 6 approved it.', 'Then more.']);
    expect(splitSentences('It filed at 6:10 a.m. ET on the day. Then more.')).toEqual(['It filed at 6:10 a.m. ET on the day.', 'Then more.']);
  });

  it('never cuts a decimal, a dollar figure or a thousands separator', () => {
    expect(splitSentences('It closed at $2.83 with 4,166,666 units and 11.7% more. Next one.')).toHaveLength(2);
  });

  it('cuts at a single capital letter that ends a sentence, and at ! and ?', () => {
    expect(splitSentences('It is plan B. Next. Really? Yes!')).toEqual(['It is plan B.', 'Next.', 'Really?', 'Yes!']);
  });

  it('cuts before a sentence that opens with a digit or a dollar sign', () => {
    expect(splitSentences('One. 12 names ran. $5 was the high.')).toEqual(['One.', '12 names ran.', '$5 was the high.']);
  });
});

describe('capSentences', () => {
  it('returns the SAME string when within the cap (no trim, no rewrite)', () => {
    const text = ' Two sentences.  Here. ';
    expect(capSentences(text, 2)).toBe(text);
    expect(capSentences(LUNA_AH_4, 4)).toBe(LUNA_AH_4);
  });

  it('keeps the first N sentences of report 23 verbatim, through the after-hours sentence', () => {
    const kept = capSentences(REPORT_23, 4);
    expect(splitSentences(kept)).toHaveLength(4);
    expect(REPORT_23.startsWith(kept)).toBe(true);
    expect(kept.endsWith('with ordinary shares or pre-funded warrants.')).toBe(true);
  });

  it('cuts the six and eight sentence luna outputs to four, from the front, verbatim', () => {
    for (const text of [LUNA_6, LUNA_8]) {
      const kept = capSentences(text, 4);
      expect(splitSentences(kept)).toHaveLength(4);
      expect(text.startsWith(kept)).toBe(true);
    }
    expect(capSentences(LUNA_6, 4).endsWith('completion of an acquisition for $15.0 million.')).toBe(true);
    expect(capSentences(LUNA_8, 4).endsWith('for AI infrastructure and LLM services.')).toBe(true);
  });
});

describe('capNarrative', () => {
  it('recap kinds keep 4, intraday kinds keep 3, when the cut drops no count sentence', () => {
    // LUNA_8's count is joined to a mover clause ("One of the covered 50 percent movers ..., while fresh news was found
    // for 6 of the 12 names the desk covers."), so it is not the count sentence and nothing is appended.
    expect(NARRATIVE_MAX_SENTENCES).toEqual({ recap: 4, intraday: 3 });
    expect(splitSentences(capNarrative('EVENING', LUNA_8)!)).toHaveLength(4);
    expect(splitSentences(capNarrative('PREMARKET', LUNA_8)!)).toHaveLength(4);
    expect(splitSentences(capNarrative('AFTER_HOURS', LUNA_8)!)).toHaveLength(3);
    expect(splitSentences(capNarrative('INTO_RTH', LUNA_8)!)).toHaveLength(3);
    expect(splitSentences(capNarrative('INTO_POWER_HOUR', LUNA_8)!)).toHaveLength(3);
  });

  it('never strikes: a non-empty narrative stays non-empty, and null stays null', () => {
    expect(capNarrative('EVENING', 'One sentence only.')).toBe('One sentence only.');
    expect(capNarrative('EVENING', null)).toBeNull();
  });
});

/*
 * The count keep (Commercial read 124, Integration's defect fix, 2026-10-14): when the cut drops the checked count
 * sentence, capNarrative appends it verbatim after the first N. Every kind; the controls of read 124 (b).
 */

const MAX: Record<ReportKind, number> = { PREMARKET: 4, EVENING: 4, INTO_RTH: 3, INTO_POWER_HOUR: 3, AFTER_HOURS: 3 };
const KINDS = Object.keys(MAX) as ReportKind[];

const move = (n: number) => `NAME${n} is up ${n}0 percent from the prior close, with no catalyst found in our sources.`;
const moves = (count: number) => Array.from({ length: count }, (_, i) => move(i + 1));

const COUNT = 'Of the 12 names the desk covers, 5 had fresh news in our sources.';
const COUNT_WORDED = 'Eight of the 12 names the desk covers had fresh news in our sources.';
const LOOK_ALIKE = 'XHG was the first of the names the desk covers to report fresh news.';

describe('isCountSentence', () => {
  it('matches both shapes the writers produce, digits and number words, and the v6 shapes', () => {
    for (const sentence of [
      COUNT,
      COUNT_WORDED,
      '5 of the 12 names the desk covers had fresh news in our sources.',
      'One of the 12 names the desk covers had fresh news in our sources.',
      'Of the 12 names the desk covers, none had fresh news in our sources.',
      'None of the names the desk covers had fresh news we could find.',
      'Fresh news was found for 5 of the 12 names the desk covers.',
    ]) {
      expect(isCountSentence(sentence), sentence).toBe(true);
    }
  });

  it('does not match a look-alike about the covered names, or a count joined to another clause', () => {
    for (const sentence of [
      LOOK_ALIKE,
      'Of the names the desk covers, XHG ran the furthest.',
      'Most of the 12 names the desk covers had fresh news in our sources.',
      'The desk covers 12 names into the next session.',
      // Joined counts (83d99065 has nine such drafts): not self-contained, so never appended on their own.
      'MI was up 14 percent after the close, and 5 of the 12 names the desk covers had fresh news in our sources.',
      'Of the 12 names the desk covers, 5 had fresh news in our sources: XHG, IPDN, VCIG, MTEN and LCFY.',
    ]) {
      expect(isCountSentence(sentence), sentence).toBe(false);
    }
  });
});

describe('capNarrative: the count keep', () => {
  it('count already within N: kept in place, not appended twice', () => {
    const intraday = [move(1), COUNT, move(2), move(3), COUNT].join(' ');
    const published = capNarrative('INTO_RTH', intraday)!;
    expect(published).toBe([move(1), COUNT, move(2)].join(' '));
    expect(published.split(COUNT)).toHaveLength(2);
    const recap = [...moves(3), COUNT, move(4), move(5)].join(' ');
    expect(capNarrative('EVENING', recap)).toBe([...moves(3), COUNT].join(' '));
  });

  it('count cut: appended verbatim, last, for every kind (recap five sentences, intraday four)', () => {
    for (const kind of KINDS) {
      const max = MAX[kind];
      const published = capNarrative(kind, [...moves(max + 1), COUNT_WORDED].join(' '))!;
      expect(published, kind).toBe([...moves(max), COUNT_WORDED].join(' '));
      expect(splitSentences(published), kind).toHaveLength(max + 1);
      expect(published.endsWith(COUNT_WORDED), kind).toBe(true);
    }
  });

  it('the real outputs: report 23 publishes five, the after-hours run its four', () => {
    const fresh = 'Fresh news was found for 5 of the 12 names the desk covers.';
    expect(capNarrative('EVENING', REPORT_23)).toBe(`${capSentences(REPORT_23, 4)} ${fresh}`);
    expect(splitSentences(capNarrative('EVENING', REPORT_23)!)).toHaveLength(5);
    for (const kind of ['AFTER_HOURS', 'INTO_RTH', 'INTO_POWER_HOUR'] as const) {
      expect(capNarrative(kind, LUNA_AH_4), kind).toBe(LUNA_AH_4);
    }
  });

  it('count absent: nothing appended', () => {
    const text = moves(6).join(' ');
    for (const kind of KINDS) expect(capNarrative(kind, text), kind).toBe(capSentences(text, MAX[kind]));
  });

  it('a look-alike after the cut: nothing appended', () => {
    const intraday = [...moves(3), LOOK_ALIKE].join(' ');
    expect(capNarrative('AFTER_HOURS', intraday)).toBe(moves(3).join(' '));
    const recap = [...moves(4), 'Of the names the desk covers, XHG ran the furthest.', LOOK_ALIKE].join(' ');
    expect(capNarrative('PREMARKET', recap)).toBe(moves(4).join(' '));
  });

  it('more than one count after the cut: only the first is appended', () => {
    const second = 'Six of the 12 names the desk covers had fresh news in our sources.';
    const published = capNarrative('PREMARKET', [...moves(5), COUNT, move(6), second].join(' '))!;
    expect(published).toBe([...moves(4), COUNT].join(' '));
    expect(published).not.toContain(second);
  });
});

/*
 * Read 124 (a): every real draft Summary in three stored raw sets (f71c48c2 writer-retest v6 and v7, 7c2d8514
 * recap-check raw-3, 83d99065 summary-length), extracted verbatim by fixtures/extract-count-keep-drafts.py. The totals
 * below were computed by that script with its own splitter port and a Python regex of the same shape. Cross-check:
 * 83d99065's own records mark 7 drafts whose count was cut by the cap (countDraft, not countPublished, narrative not
 * struck); they are exactly its 7 cut-and-appended here.
 */

type Draft = { source: string; tag: string; kind: ReportKind; draft: string };
const DRAFTS = COUNT_KEEP_DRAFTS as Draft[];

function keep(row: Draft) {
  const max = MAX[row.kind];
  const sentences = splitSentences(row.draft);
  const kept = capSentences(row.draft, max);
  const published = capNarrative(row.kind, row.draft)!;
  return { max, sentences, kept, published, matched: sentences.some(isCountSentence), appended: published !== kept };
}

describe('the count keep on every real draft (read 124 (a))', () => {
  it('per set: matched, cut and appended, unmatched', () => {
    const totals: Record<string, { drafts: number; matched: number; cutAndAppended: number; unmatched: number }> = {};
    for (const row of DRAFTS) {
      const t = (totals[row.source] ??= { drafts: 0, matched: 0, cutAndAppended: 0, unmatched: 0 });
      const { matched, appended } = keep(row);
      t.drafts += 1;
      if (matched) t.matched += 1;
      else t.unmatched += 1;
      if (appended) t.cutAndAppended += 1;
    }
    expect(totals).toEqual({
      f71c48c2: { drafts: 23, matched: 18, cutAndAppended: 11, unmatched: 5 },
      '7c2d8514': { drafts: 9, matched: 9, cutAndAppended: 9, unmatched: 0 },
      '83d99065': { drafts: 36, matched: 27, cutAndAppended: 7, unmatched: 9 },
    });
  });

  it('a cut count publishes N + 1 sentences ending with the first cut count; every other draft the plain cap', () => {
    for (const row of DRAFTS) {
      const { max, sentences, kept, published } = keep(row);
      const cut = sentences.length > max && !sentences.slice(0, max).some(isCountSentence);
      const count = cut ? sentences.slice(max).find(isCountSentence) : undefined;
      if (count === undefined) {
        expect(published, row.tag).toBe(kept);
      } else {
        expect(published, row.tag).toBe(`${kept} ${count}`);
        expect(splitSentences(published), row.tag).toHaveLength(max + 1);
      }
    }
  });

  it('the unmatched drafts append nothing: five v6 drafts with no count, nine with the count joined inside the cap', () => {
    const unmatched = DRAFTS.filter((row) => !keep(row).matched);
    for (const row of unmatched) expect(keep(row).published, row.tag).toBe(keep(row).kept);
    expect(unmatched.map((row) => `${row.source} ${row.tag}`)).toEqual([
      'f71c48c2 2026-10-02-AFTER_HOURS-v6-w_luna',
      'f71c48c2 2026-10-05-INTO_POWER_HOUR-v6-w_luna',
      'f71c48c2 2026-10-05-INTO_RTH-v6-w_luna',
      'f71c48c2 2026-10-06-AFTER_HOURS-v6-w_luna',
      'f71c48c2 2026-10-06-INTO_POWER_HOUR-v6-w_luna',
      '83d99065 2026-10-02-AFTER_HOURS-v7-run1',
      '83d99065 2026-10-02-INTO_POWER_HOUR-v7-run1',
      '83d99065 2026-10-02-PREMARKET-v7-run1',
      '83d99065 2026-10-02-PREMARKET-v7-run3',
      '83d99065 2026-10-05-AFTER_HOURS-v7-run2',
      '83d99065 2026-10-05-INTO_RTH-v7-run2',
      '83d99065 2026-10-06-PREMARKET-v7-run1',
      '83d99065 2026-10-06-PREMARKET-v7-run2',
      '83d99065 2026-10-06-PREMARKET-v7-run3',
    ]);
  });
});
