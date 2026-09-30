/**
 * The configured report ranges. CONFIGURATION, NOT CONSTANTS (design.md, his
 * "set ranges" ruling 2026-09-27): Commercial's tier scope may redraw them, so
 * the list is read at runtime. Built and tested against $1-$20 first, his own
 * range and the default.
 *
 * `REPORT_RANGES`, when set: comma-separated `id:min:max`, e.g.
 * "1-20:1:20,20-50:20:50". An entry that does not parse is skipped, never
 * guessed; if none parse, the default stands.
 */

import type { ReportRange } from './contract';

export const DEFAULT_REPORT_RANGES: readonly ReportRange[] = [{ id: '1-20', label: '$1–$20', min: 1, max: 20 }];

function label(min: number, max: number): string {
  const format = (value: number) => (Number.isInteger(value) ? `$${value}` : `$${value.toFixed(2)}`);
  return `${format(min)}–${format(max)}`;
}

export function reportRanges(
  env: Record<string, string | undefined> = process.env,
): { ranges: ReportRange[]; defaultRangeId: string } {
  const raw = env.REPORT_RANGES?.trim();
  const parsed: ReportRange[] = [];
  if (raw) {
    for (const entry of raw.split(',')) {
      const [id, minText, maxText] = entry.trim().split(':');
      const min = Number(minText);
      const max = Number(maxText);
      if (!id || !Number.isFinite(min) || !Number.isFinite(max) || min < 0 || max <= min) continue;
      parsed.push({ id, label: label(min, max), min, max });
    }
  }
  const ranges = parsed.length > 0 ? parsed : [...DEFAULT_REPORT_RANGES];
  const preferred = env.REPORT_DEFAULT_RANGE?.trim();
  const defaultRangeId = ranges.some((r) => r.id === preferred) ? preferred! : ranges[0]!.id;
  return { ranges, defaultRangeId };
}
