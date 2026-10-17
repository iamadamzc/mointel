'use client';

import { BILLING_WORDS, type BillingDeskView } from '@/lib/dashboard/billingView';

/*
 * THE TWO SCREENS THAT REPLACE THE BOARD (Integration 42nd's approved scope; words Marketing b227a882 section 3, and
 * placeholders for the buy screen). Each one replaces the board entirely: nothing that looks live stays on screen.
 * The header stays, so the desk is still recognisably the desk.
 */

export function CardRequiredScreen({ card, onUpdateCard }: { card: NonNullable<BillingDeskView['card']>; onUpdateCard: () => void }) {
  return (
    <main className="flex min-h-0 flex-1 items-center justify-center bg-desk px-6" data-billing-screen="card_required">
      <div className="max-w-md text-center">
        <h2 className="text-[17px] font-semibold text-ink">{card.headline}</h2>
        {card.lines.map((line) => (
          <p key={line} className="mt-2 text-[13px] leading-relaxed text-ink-2">
            {line}
          </p>
        ))}
        {card.checking ? (
          <p className="mt-4 text-[12px] text-ink-3" role="status">
            {card.checking}
          </p>
        ) : (
          <button
            type="button"
            onClick={onUpdateCard}
            className="mt-5 rounded-sm border border-accent/50 bg-accent/15 px-4 py-2 text-[12px] font-semibold tracking-wide text-accent uppercase hover:bg-accent/25"
          >
            {card.button}
          </button>
        )}
        <p className="mt-3 text-[11px] text-ink-3">{card.under}</p>
        <p className="mt-4 text-[11px]">
          <a href={`mailto:${BILLING_WORDS.contactAddress}`} className="text-accent underline-offset-2 hover:underline">
            {BILLING_WORDS.contactUs}
          </a>
        </p>
      </div>
    </main>
  );
}

const PRIMARY =
  'mt-5 inline-block rounded-sm border border-accent/50 bg-accent/15 px-4 py-2 text-[12px] font-semibold tracking-wide text-accent uppercase hover:bg-accent/25';

export function BuyScreen({
  buy,
  buyHref,
  onAddCard,
}: {
  buy: NonNullable<BillingDeskView['buy']>;
  buyHref: string;
  onAddCard: () => void;
}) {
  return (
    <main className="flex min-h-0 flex-1 items-center justify-center bg-desk px-6" data-billing-screen={buy.variant}>
      <div className="max-w-md text-center">
        <h2 className="text-[17px] font-semibold text-ink">{buy.headline}</h2>
        {buy.line ? <p className="mt-2 text-[13px] leading-relaxed text-ink-2">{buy.line}</p> : null}
        {buy.variant === 'add_card' ? (
          // Case D: the card is added through the same portal Update card opens.
          <button type="button" onClick={onAddCard} className={PRIMARY}>
            {buy.button}
          </button>
        ) : (
          // A plain link to Web's pricing page: buying happens there (Integration's split).
          <a href={buyHref} className={PRIMARY}>
            {buy.button}
          </a>
        )}
        {buy.signOut ? (
          // A form POST, as on the refusal screen: /auth/signout is a POST so a cross-site request cannot sign anyone out.
          <form method="post" action="/auth/signout" className="mt-3">
            <button type="submit" className="text-[12px] text-ink-2 hover:text-ink">
              {buy.signOut}
            </button>
          </form>
        ) : null}
      </div>
    </main>
  );
}

/** The trial's end, a small chip in the header (words: placeholder until Marketing writes them). */
export function TrialChip({ text }: { text: string | null }) {
  if (!text) return null;
  return (
    <span className="rounded-sm border border-line-2 bg-panel-2 px-2 py-0.5 text-[11px] font-semibold text-ink-2" data-billing-trial>
      {text}
    </span>
  );
}
