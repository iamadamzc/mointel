import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

import { PRODUCED_WORDS, producedAt } from '@/lib/dashboard/produced';

const NOW = '2026-10-05T20:10:00.000Z';
const DOSSIER = '2026-10-05T19:42:00.000Z'; // 15:42 ET
const CHECKPOINT = '2026-10-05T20:00:00.000Z'; // 16:00 ET

describe('producedAt is the older of its parts', () => {
  it('takes the dossier when it is older, and the checkpoint when it is older', () => {
    expect(producedAt(DOSSIER, CHECKPOINT, NOW)).toEqual({ iso: DOSSIER, text: '15:42 ET' });
    expect(producedAt(CHECKPOINT, DOSSIER, NOW)?.iso).toBe(DOSSIER);
  });

  it('prints another ET day with its date, never a bare clock', () => {
    expect(producedAt('2026-10-04T00:05:00.000Z', CHECKPOINT, NOW)?.text).toBe('Oct 3, 20:05 ET');
  });

  it('with one known part that one is the answer, with none nothing is claimed', () => {
    expect(producedAt(null, CHECKPOINT, NOW)?.iso).toBe(CHECKPOINT);
    expect(producedAt(DOSSIER, undefined, NOW)?.iso).toBe(DOSSIER);
    expect(producedAt(null, null, NOW)).toBeNull();
    expect(producedAt('not a time', 'nope', NOW)).toBeNull();
  });
});

describe('the drawer', () => {
  it('shows Produced only when the grade supplies a checkpoint time, beside the existing Generated row', () => {
    const source = readFileSync('components/AutomaticIntelligence.tsx', 'utf8');
    expect(source).toContain('checkpointAt ? producedNow(intel.generatedAt, checkpointAt) : null');
    expect(source).toContain('<Field label="Generated" value={generatedAt} />');
    const drawer = readFileSync('components/TickerDrawer.tsx', 'utf8');
    expect(drawer).toContain('row.setupGradeWired ? (row.setupGrade?.checkpointCompletedAt ?? null) : null');
    expect(PRODUCED_WORDS.label).toBe('Produced');
    expect(PRODUCED_WORDS.hover).toBe(
      "The older of when the desk's research was written and when the checkpoint it rests on ran.",
    );
  });
});
