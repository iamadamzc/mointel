import { describe, expect, it } from 'vitest';

import { capNarrative, capSentences, NARRATIVE_MAX_SENTENCES, splitSentences } from '@/lib/desk/reports/sentences';

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
  it('recap kinds keep 4, intraday kinds keep 3', () => {
    expect(NARRATIVE_MAX_SENTENCES).toEqual({ recap: 4, intraday: 3 });
    expect(splitSentences(capNarrative('EVENING', REPORT_23)!)).toHaveLength(4);
    expect(splitSentences(capNarrative('PREMARKET', LUNA_8)!)).toHaveLength(4);
    expect(splitSentences(capNarrative('AFTER_HOURS', LUNA_AH_4)!)).toHaveLength(3);
    expect(splitSentences(capNarrative('INTO_RTH', LUNA_AH_4)!)).toHaveLength(3);
    expect(splitSentences(capNarrative('INTO_POWER_HOUR', LUNA_AH_4)!)).toHaveLength(3);
  });

  it('never strikes: a non-empty narrative stays non-empty, and null stays null', () => {
    expect(capNarrative('EVENING', 'One sentence only.')).toBe('One sentence only.');
    expect(capNarrative('EVENING', null)).toBeNull();
  });
});
