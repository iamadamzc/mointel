/**
 * A TIME ON HIS SURFACE IS AN ET TIME AND SAYS SO.
 *
 * Live defect, 2026-09-14 07:49 ET, ELMT on the premarket board:
 *
 *     PM Move +43.6%  THIN
 *     "PM Move from 16.24 at 08:55 on 5 trades in the anchoring minute"
 *
 * The price was right -- 23.32 / 16.24 = +43.6%, exactly what the row showed --
 * and the THIN tag was doing its job on a five-trade anchor. But 08:55 was the
 * raw UTC of a 04:55 ET print, so at 07:49 ET the tooltip named a time that had
 * not happened. He read the row as broken.
 *
 * THAT IS THE `PM Gap` DEFECT IN A DIFFERENT FIELD: a correct value presented in
 * a way that asserts something false, and the presentation destroying the value.
 * The board's whole job is to be trusted at a glance in his window.
 */
import { describe, expect, it } from 'vitest';

import { formatEtDay, formatEtMinute } from '@/lib/format';

describe('formatEtMinute', () => {
  it('converts UTC to ET rather than slicing the characters out', () => {
    // The live case. `.slice(11, 16)` on this string returns '08:55'.
    expect(formatEtMinute('2026-09-14T08:55:00.000Z')).toBe('04:55 ET');
  });

  it('names the frame, because an unlabelled time is a guessed one', () => {
    expect(formatEtMinute('2026-09-14T08:55:00.000Z')).toContain('ET');
  });

  it('follows DST rather than a fixed offset', () => {
    // Same wall-clock UTC, one in EDT (-4) and one in EST (-5). A hardcoded
    // offset passes one of these and fails the other.
    expect(formatEtMinute('2026-09-14T13:30:00.000Z')).toBe('09:30 ET');
    expect(formatEtMinute('2026-12-14T13:30:00.000Z')).toBe('08:30 ET');
  });

  it('keeps minute grain, so it does not assert seconds a bar does not carry', () => {
    const out = formatEtMinute('2026-09-14T08:55:00.000Z');
    expect(out).toBe('04:55 ET');
    expect(out).not.toMatch(/:\d\d:\d\d/);
  });

  it('returns null for absent or unparseable input, so a caller can say nothing', () => {
    expect(formatEtMinute(null)).toBeNull();
    expect(formatEtMinute(undefined)).toBeNull();
    expect(formatEtMinute('')).toBeNull();
    expect(formatEtMinute('not a timestamp')).toBeNull();
  });

  it('crosses midnight in the right direction', () => {
    // 00:30 UTC is the PREVIOUS evening in ET -- 20:30, inside after-hours.
    expect(formatEtMinute('2026-09-15T00:30:00.000Z')).toBe('20:30 ET');
  });
});

/* ------------------------------------------------------------------------- *
 * THE GUARD, WHICH IS ABOUT THE SURFACE RATHER THAN THIS ONE TOOLTIP
 * ------------------------------------------------------------------------- */

describe('no trader-facing component slices a timestamp', () => {
  it('scans every component, because the invariant is the surface not the file', async () => {
    /*
     * Written to the shape the `Price · Move · VWAP` guard had to be widened
     * into: a guard matched to ONE FILE passed while a second component carried
     * the same defect. `reading.at.slice(11, 16)` is one instance of a family --
     * any ISO string cut with string indices is a timestamp rendered in
     * whatever frame it was stored in, which on this desk is always UTC and on
     * his screen is never right.
     */
    const fs = await import('node:fs');
    const dir = 'components';
    const files = fs.readdirSync(dir).filter((f) => f.endsWith('.tsx'));
    expect(files.length).toBeGreaterThan(5);

    /* Comments stripped first -- this guard quotes the defect it fixes, and the
     * component it fixes explains it too. A source-scanning guard that does not
     * strip comments tests prose. */
    const code = (f: string) =>
      fs
        .readFileSync(`${dir}/${f}`, 'utf8')
        .replace(/\/\*[\s\S]*?\*\//g, '')
        .replace(/^\s*\/\/.*$/gm, '');

    /*
     * THE RECEIVER IS THE TELL, NOT THE INDEX -- AND THE FIRST VERSION OF THIS
     * GUARD GOT THAT WRONG. Keying on `.slice(0,` flagged four components that
     * were slicing ARRAYS (`sorted.slice(0, size)`, `activeJobs.slice(0, 2)`),
     * which is a guard that cries on ordinary code and therefore gets deleted.
     * A name ending `At`/`ts`/`date`/`time`/`iso` is a timestamp, and slicing
     * one is wrong at ANY index.
     *
     * TWO ARMS BECAUSE A BARE `at` IS LOWERCASE. The first draft matched only
     * camelCase (`publishedAt`) and missed `reading.at.slice(11, 16)` -- the
     * exact line that was live. Third case-blind guard on this desk; the first
     * two reached production. The probe below caught this one.
     *
     * Known limit, stated rather than hidden: this catches the idiom
     * `thing.publishedAt.slice(...)`, not a timestamp first copied into a
     * neutrally-named local. It is a guard against the shape that has actually
     * shipped twice, not a proof.
     */
    const SLICED_ISO =
      /(?:\.\s*(?:at|ts|date|time|iso)|[A-Za-z_$]\w*(?:At|Ts|Time|Date|Iso|ISO))\s*\.\s*(?:slice|substring|substr)\(/;

    const offenders = files.filter((f) => SLICED_ISO.test(code(f)));
    expect(offenders).toEqual([]);
  });

  it('proves the guard can see the defect it was written for', () => {
    /*
     * A GUARD THAT CANNOT FAIL CERTIFIES EVERYTHING. This desk has shipped two
     * of those -- a check keyed on a hardcoded zero, and a `not.toContain`
     * blind to case. The exact line that was live on Monday, run through the
     * same regex the scan uses.
     */
    const SLICED_ISO =
      /(?:\.\s*(?:at|ts|date|time|iso)|[A-Za-z_$]\w*(?:At|Ts|Time|Date|Iso|ISO))\s*\.\s*(?:slice|substring|substr)\(/;

    // The two lines that were actually live.
    expect(SLICED_ISO.test('` at ${reading.at.slice(11, 16)}`')).toBe(true);
    expect(SLICED_ISO.test('${source.publishedAt.slice(0, 10)}')).toBe(true);
    expect(SLICED_ISO.test('bar.ts.slice(11, 16)')).toBe(true);

    /* And silent on ordinary slicing -- the four false positives the first
     * version of this guard produced, verbatim. A guard that fires on these
     * gets suppressed, and a suppressed guard protects nothing. */
    expect(SLICED_ISO.test('merged.discovery.slice(0, rank)')).toBe(false);
    expect(SLICED_ISO.test('sorted.slice(0, size)')).toBe(false);
    expect(SLICED_ISO.test('health.activeJobs.slice(0, 2)')).toBe(false);
    expect(SLICED_ISO.test('item.slice(0, 24)')).toBe(false);
  });

  it('the catalyst citation renders an ET day, not a UTC one', async () => {
    /*
     * The second leak, found by the scan rather than by the report -- which is
     * the point of scanning the surface instead of the file that was reported.
     * A source published 21:00 ET cited itself as the following day.
     */
    const fs = await import('node:fs');
    const src = fs
      .readFileSync('components/AutomaticIntelligence.tsx', 'utf8')
      .replace(/\/\*[\s\S]*?\*\//g, '')
      .replace(/^\s*\/\/.*$/gm, '');

    expect(src).toContain('formatEtDay(source.publishedAt)');
    expect(src).not.toContain('publishedAt.slice');
  });

  it('the Move tooltip renders through the formatter, not through indices', async () => {
    const fs = await import('node:fs');
    const src = fs
      .readFileSync('components/DecisionCells.tsx', 'utf8')
      .replace(/\/\*[\s\S]*?\*\//g, '')
      .replace(/^\s*\/\/.*$/gm, '');

    expect(src).toContain('formatEtMinute(reading.at)');
    expect(src).not.toContain('reading.at.slice');
  });
});

describe('formatEtDay', () => {
  it('uses the ET calendar day, not the UTC one', () => {
    // 21:00 ET on the 13th is 01:00 UTC on the 14th. The slice said the 14th.
    expect(formatEtDay('2026-09-14T01:00:00.000Z')).toBe('2026-09-13');
  });

  it('keeps a date-only source on its stored day', () => {
    /*
     * `citationDates.test.ts`: a date-only page is stored at NOON UTC so it
     * lands on the right calendar day. Noon UTC is 08:00 EDT and 07:00 EST, so
     * one ET conversion serves both precisions and no branch is needed. If the
     * storage convention ever moves toward midnight, this test fails first.
     */
    expect(formatEtDay('2026-09-14T12:00:00.000Z')).toBe('2026-09-14');
    expect(formatEtDay('2026-12-14T12:00:00.000Z')).toBe('2026-12-14');
  });

  it('returns null rather than a broken date', () => {
    expect(formatEtDay(null)).toBeNull();
    expect(formatEtDay('nonsense')).toBeNull();
  });
});
