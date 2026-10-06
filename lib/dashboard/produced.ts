/**
 * WHEN A ROW WAS PRODUCED (contract row 24, `producedAt`): the OLDER of its parts.
 * A row built from a dossier and from a checkpoint is only as fresh as the
 * older of the two, so one stamp says how old the whole reading can be.
 *
 * Today the desk shows the dossier's time alone ("Generated"). Once the grade is
 * wired the checkpoint's time is on the row too, and this is the older of them.
 * With only one time known, that one is the answer; with neither, nothing is
 * claimed.
 *
 * The time prints as the checkpoint time does: a bare ET clock on the reader's
 * ET day, the date with it on any other day (a clock time alone is a value with
 * no frame).
 *
 * Words: Marketing's (drawer-rows-18-13-24-words-2026-10-06.md, 0e1e90e7). The
 * older time understates the row's age, never overstates it.
 */

import { checkpointTimeET } from '@/lib/dashboard/setupGrade';

export const PRODUCED_WORDS = {
  label: 'Produced',
  hover: "The older of when the desk's research was written and when the checkpoint it rests on ran.",
} as const;

export interface Produced {
  iso: string;
  text: string;
}

const valid = (iso: string | null | undefined): iso is string => typeof iso === 'string' && Number.isFinite(Date.parse(iso));

export function producedAt(
  dossierAt: string | null | undefined,
  checkpointAt: string | null | undefined,
  nowIso: string,
): Produced | null {
  const times = [dossierAt, checkpointAt].filter(valid);
  if (times.length === 0) return null;
  const older = times.reduce((a, b) => (Date.parse(a) <= Date.parse(b) ? a : b));
  return { iso: older, text: `${checkpointTimeET(older, nowIso)} ET` };
}
