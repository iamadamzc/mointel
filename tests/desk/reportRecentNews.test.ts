import { describe, expect, it } from 'vitest';

import { SECTION_ORDER } from '@/lib/desk/reports/sections';
import { isCountSentence } from '@/lib/desk/reports/sentences';
import { SYSTEM_V5 } from '@/lib/desk/reports/writerV5';
import { SYSTEM_V6 } from '@/lib/desk/reports/writerV6';
import { SYSTEM_V7, VOICE_PARAGRAPH, VOICE_SPECIMEN } from '@/lib/desk/reports/writerV7';

/*
 * The FRESH_FOUND group is "recent news" (his "b", Integration chat uuid 2c3c548c, and his "yes" to the exact strings,
 * Research chat uuid ba8a0b2f, 2026-10-16; Marketing 7266c0d7, Commercial read 148). The group holds RECENT
 * (yesterday) names as well as FRESH ones: 11 of the 56 lines under "FRESH NEWS FOUND" in reports 40 to 55 were RECENT
 * at their checkpoint, so "fresh" was not true of them and "recent" is.
 */

describe('the recent-news words', () => {
  it('the report section heading', () => {
    expect(SECTION_ORDER.find((s) => s.key === 'FRESH_FOUND')?.label).toBe('RECENT NEWS FOUND');
  });

  it('the count sentence is read in all four shapes, in the new word and (for stored and in-flight reports) the old', () => {
    // Commercial read 148 condition 2: the four shapes Marketing lists (7266c0d7), each in both words.
    for (const word of ['recent', 'fresh']) {
      const cap = word[0]!.toUpperCase() + word.slice(1);
      expect(isCountSentence(`Of the 12 names the desk covers, 5 had ${word} news in our sources.`), word).toBe(true);
      expect(isCountSentence(`Eight of the 12 names the desk covers had ${word} news in our sources.`), word).toBe(true);
      expect(isCountSentence(`None of the names the desk covers had ${word} news we could find.`), word).toBe(true);
      expect(isCountSentence(`${cap} news was found for 5 of the 12 names the desk covers.`), word).toBe(true);
    }
    // Not a count: "Each" is no count word, and another word for the news is not the sentence.
    expect(isCountSentence('Each of the names the desk covers had recent news in our sources.')).toBe(false);
    expect(isCountSentence('Of the 12 names the desk covers, 5 had new news in our sources.')).toBe(false);
  });

  it('no writer prompt still calls the group "fresh news" or "a fresh catalyst"', () => {
    // The whole v7 prompt, voice paragraph included: its tense example now says "had recent news" (v7 15, his yes,
    // Integration chat uuid 0114ba50).
    for (const [name, prompt] of [['v5', SYSTEM_V5], ['v6', SYSTEM_V6], ['v7', SYSTEM_V7]] as const) {
      expect(prompt, name).not.toMatch(/fresh news|fresh catalyst/i);
    }
    expect(VOICE_PARAGRAPH).toContain('Speak of the checkpoint in the past tense ("was up", "had recent news"), so a report read later does not state a market condition as now;');
    expect(SYSTEM_V7).toContain('and how many of the names the desk covers had recent news in our sources.');
    expect(VOICE_SPECIMEN).toContain('Of the 12 names the desk covers, 2 had recent news in our sources.');
    expect(VOICE_SPECIMEN).toContain('had recent news in our sources: a license agreement with Genentech');
  });
});
