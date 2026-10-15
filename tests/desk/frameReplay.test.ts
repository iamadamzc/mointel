import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

import { unframedPercentClauses } from '@/lib/desk/reports/check';

/*
 * Commercial read 131 item 1, replayed free over every recorded Summary draft: the 68 drafts of the count-keep fixture
 * (L12 f71c48c2, re-check 3 7c2d8514, summary-length 83d99065) and the 3 live 10-14 v7 intraday drafts struck whole
 * (reports 45 to 47, A:/mointel-scratch/report-{45,46,47}.json, the Summary text the checker struck).
 * Before the fix, a Python port of the old rule found UNFRAMED_PERCENT in 2 of the 71 (reports 46 and 47, the
 * MaxCyte "up 26 percent year over year" and NXGL's "down 23.2 percent since the previous checkpoint"). After it: none,
 * and none newly fails. This test pins the AFTER on the shipped rule itself.
 */
type Draft = { source: string; tag: string; kind: string; draft: string | null };
const load = (file: string) => JSON.parse(fs.readFileSync(path.resolve(__dirname, 'fixtures', file), 'utf8')) as Draft[];
const drafts = [...load('count-keep-drafts-2026-10-14.json'), ...load('frame-replay-live-2026-10-14.json')];

describe('read 131 replay: UNFRAMED_PERCENT over every recorded Summary', () => {
  it('reads all 71 drafts, the three live ones among them', () => {
    expect(drafts).toHaveLength(71);
    expect(drafts.filter((d) => d.source === 'live-a966a517-reports').map((d) => d.tag)).toEqual([
      'report-45-INTO_RTH',
      'report-46-INTO_POWER_HOUR',
      'report-47-AFTER_HOURS',
    ]);
  });

  it('after the fix, no recorded draft has an unframed percent (reports 46 and 47 newly pass)', () => {
    const struck = drafts.filter((d) => unframedPercentClauses(d.draft ?? '').length > 0).map((d) => d.tag);
    expect(struck).toEqual([]);
  });

  it('control: the same read sees a planted bare market percent in a live draft', () => {
    const live46 = drafts.find((d) => d.tag === 'report-46-INTO_POWER_HOUR')!.draft!;
    expect(unframedPercentClauses(`${live46} BBB was up 26 percent.`)).toEqual(['BBB was up 26 percent']);
  });
});
