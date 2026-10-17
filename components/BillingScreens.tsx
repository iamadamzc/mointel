'use client';

import { BILLING_WORDS, type BillingDeskView } from '@/lib/dashboard/billingView';

/*
 * THE SCREENS THAT REPLACE THE BOARD (Integration 42nd's approved scope; words with his verbatim yes, Marketing
 * b227a882 section 3 and 1b11c496 sections 2 and 3). Each replaces the board entirely: nothing that looks live stays
 * on screen. The header stays, so the desk is still recognisably the desk.
 */

const PRIMARY =
  'inline-block rounded-sm border border-accent/50 bg-accent/15 px-4 py-2 text-[12px] font-semibold tracking-wide text-accent uppercase hover:bg-accent/25';
const SECONDARY = 'text-[12px] text-ink-2 hover:text-ink';

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
        <button type="button" onClick={onUpdateCard} className={`mt-5 ${PRIMARY}`}>
          {card.button}
        </button>
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

/** The checking screen: a headline and a line, no button (a button would be an escape from a check of moments). */
export function CheckingScreen({ checking }: { checking: NonNullable<BillingDeskView['checking']> }) {
  return (
    <main className="flex min-h-0 flex-1 items-center justify-center bg-desk px-6" data-billing-screen="checking">
      <div className="max-w-md text-center" role="status">
        <h2 className="text-[17px] font-semibold text-ink">{checking.headline}</h2>
        <p className="mt-2 text-[13px] leading-relaxed text-ink-2">{checking.line}</p>
      </div>
    </main>
  );
}

export function BuyScreen({
  buy,
  pricingHref,
  trialHref,
  onAddCard,
}: {
  buy: NonNullable<BillingDeskView['buy']>;
  pricingHref: string;
  trialHref: string;
  onAddCard: () => void;
}) {
  return (
    <main className="flex min-h-0 flex-1 items-center justify-center bg-desk px-6" data-billing-screen={buy.variant}>
      <div className="max-w-md text-center">
        <h2 className="text-[17px] font-semibold text-ink">{buy.headline}</h2>
        <p className="mt-2 text-[13px] leading-relaxed text-ink-2">{buy.line}</p>
        <div className="mt-5 flex flex-wrap items-center justify-center gap-3">
          {buy.buttons.map((button, index) => {
            const style = index === 0 ? PRIMARY : SECONDARY;
            if (button.action === 'add_card') {
              // The card is added through the same portal Update card opens.
              return (
                <button key={button.action} type="button" onClick={onAddCard} className={style}>
                  {button.label}
                </button>
              );
            }
            if (button.action === 'sign_out') {
              // A form POST, as on the refusal screen: /auth/signout is a POST so a cross-site request cannot sign anyone out.
              return (
                <form key={button.action} method="post" action="/auth/signout">
                  <button type="submit" className={style}>
                    {button.label}
                  </button>
                </form>
              );
            }
            // Pricing and the trial start are Web's pages (Integration's split): plain links.
            return (
              <a key={button.action} href={button.action === 'trial' ? trialHref : pricingHref} className={style}>
                {button.label}
              </a>
            );
          })}
        </div>
      </div>
    </main>
  );
}

/** The trial's end, a small chip in the header that opens the billing page; no countdown and no colour change. */
export function TrialChip({ chip, onOpen }: { chip: BillingDeskView['trialChip']; onOpen?: () => void }) {
  if (!chip) return null;
  return (
    <button
      type="button"
      onClick={onOpen}
      title={chip.hover}
      aria-label={chip.hover}
      className="rounded-sm border border-line-2 bg-panel-2 px-2 py-0.5 text-[11px] font-semibold text-ink-2 hover:text-ink"
      data-billing-trial
    >
      {chip.text}
    </button>
  );
}
