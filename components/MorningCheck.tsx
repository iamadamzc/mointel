'use client';

/**
 * The drawer's Morning check (row 22) with, beneath it and only when it
 * applies, the Catalyst in the morning research (row 21). Both read the one
 * frame `MarketSnapshot.morningRead`; the words and every state decision are in
 * `lib/dashboard/morningCheckView.ts` and `morningCatalystView.ts`, so this
 * file only lays them out. A HIDDEN Morning check (a name new this morning)
 * renders nothing at all, not an empty section.
 */

import { MORNING_CATALYST_WORDS, morningCatalystView } from '@/lib/dashboard/morningCatalystView';
import { MORNING_CHECK_WORDS, morningCheckView } from '@/lib/dashboard/morningCheckView';
import type { MorningReadPayload } from '@/lib/market/types';

export function MorningCheck({
  payload,
  ticker,
  Section,
}: {
  payload: MorningReadPayload | null | undefined;
  ticker: string;
  Section: React.ComponentType<{ title: string; titleHover?: string; children: React.ReactNode }>;
}) {
  const nowIso = new Date().toISOString();
  const check = morningCheckView(payload, ticker, nowIso);
  if (check.state === 'HIDDEN') return null;
  const catalyst = morningCatalystView(payload, ticker, nowIso);

  return (
    <Section title={MORNING_CHECK_WORDS.label} titleHover={check.labelHover}>
      <p className="mt-0 mb-1 text-[12px] font-semibold leading-snug text-ink">{check.face}</p>
      {check.detail ? <p className="mt-0 mb-1 text-[12px] leading-relaxed text-ink-2">{check.detail}</p> : null}
      {check.changes.length > 0 ? (
        <ul className="m-0 mb-1 flex list-none flex-col gap-0.5 p-0">
          {check.changes.map((line) => (
            <li key={line} className="text-[12px] leading-snug text-ink-2">
              {line}
            </li>
          ))}
        </ul>
      ) : null}
      {check.compared ? <p className="mt-1 mb-0 text-[11px] leading-relaxed text-ink-3">{check.compared}</p> : null}

      {catalyst ? (
        <div className="mt-3 border-t border-line pt-2">
          <span
            className="text-[9px] font-medium tracking-[0.1em] text-ink-3 uppercase"
            title={catalyst.labelHover}
          >
            {MORNING_CATALYST_WORDS.label}
          </span>
          {catalyst.summary ? <p className="mt-1 mb-1 text-[12px] leading-relaxed text-ink">{catalyst.summary}</p> : null}
          {catalyst.facts.map((fact) => (
            <p key={fact} className="mt-0 mb-0.5 text-[12px] leading-snug text-ink-2">
              {fact}
            </p>
          ))}
          {catalyst.eventDate ? <p className="mt-0 mb-0.5 text-[12px] leading-snug text-ink-2">{catalyst.eventDate}</p> : null}
          {catalyst.unchanged ? <p className="mt-1 mb-0.5 text-[12px] leading-relaxed text-ink-2">{catalyst.unchanged}</p> : null}
          <p className="mt-1 mb-0 text-[11px] leading-relaxed text-ink-3">{catalyst.written}</p>
        </div>
      ) : null}
    </Section>
  );
}
