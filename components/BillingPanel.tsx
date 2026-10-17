'use client';

import { useEffect, useState } from 'react';

import { BILLING_PAGE_WORDS as W, billingPageView, etStamp, historyRow, type BilledDay } from '@/lib/dashboard/billingPageView';
import type { DeskBillingState } from '@/lib/dashboard/billingView';
import { useDeskMode } from '@/lib/hooks/useDeskMode';

/*
 * THE DESK'S BILLING PAGE (Marketing sections 4 and 5), a panel at the right edge opened from the header. Cancel plan
 * and Remove card are one step each: the click does it, and the confirmation is the screen after (section 5). No "are
 * you sure". Billing history is the desk's own list (a daily charge makes no invoice); plan buyers also get Stripe's
 * invoice page in a new tab.
 */

type Done = { kind: 'cancelled'; endsOn: string | null } | { kind: 'removed' } | null;

export function BillingPanel({
  state,
  paidThroughDaily,
  onClose,
  onChanged,
  onPortal,
}: {
  state: DeskBillingState;
  paidThroughDaily: string | null;
  onClose: () => void;
  onChanged: () => void;
  onPortal: () => void;
}) {
  const { apiBase } = useDeskMode();
  const [tab, setTab] = useState<'billing' | 'history'>('billing');
  const [history, setHistory] = useState<BilledDay[] | null>(null);
  const [failed, setFailed] = useState(false);
  const [done, setDone] = useState<Done>(null);
  const [busy, setBusy] = useState(false);
  const view = billingPageView(state, paidThroughDaily);

  useEffect(() => {
    if (tab !== 'history' || history !== null) return;
    let cancelled = false;
    fetch(`${apiBase}/billing/history`, { cache: 'no-store', credentials: 'same-origin' })
      .then(async (response) => {
        if (!response.ok) throw new Error(String(response.status));
        return (await response.json()) as BilledDay[];
      })
      .then((rows) => !cancelled && setHistory(rows))
      .catch(() => !cancelled && setFailed(true));
    return () => {
      cancelled = true;
    };
  }, [apiBase, tab, history]);

  const act = async (path: 'cancel' | 'card/remove') => {
    setBusy(true);
    try {
      const response = await fetch(`${apiBase}/billing/${path}`, { method: 'POST', credentials: 'same-origin' });
      if (!response.ok) throw new Error(String(response.status));
      const body = (await response.json()) as { kind: string; endsOn?: string | null };
      setDone(path === 'cancel' ? { kind: 'cancelled', endsOn: body.endsOn ?? null } : { kind: 'removed' });
      onChanged();
    } catch {
      setFailed(true);
    } finally {
      setBusy(false);
    }
  };

  const confirmation =
    done?.kind === 'cancelled'
      ? W.cancelledConfirm(etStamp(done.endsOn) ?? '')
      : done?.kind === 'removed'
        ? state.plan
          ? W.removedCancelledPlan(etStamp(state.plan.endsOn ?? state.plan.currentPeriodEnd) ?? '')
          : W.removedDaily(etStamp(paidThroughDaily))
        : null;

  return (
    <aside
      role="dialog"
      aria-label={W.headline}
      className="fixed inset-y-0 right-0 z-40 flex w-full max-w-[460px] flex-col border-l border-line-2 bg-panel shadow-2xl"
      data-billing-panel
    >
      <div className="flex items-center justify-between border-b border-line px-5 py-3">
        <h2 className="text-[15px] font-semibold text-ink">{tab === 'history' ? W.historyHeadline : W.headline}</h2>
        <button type="button" onClick={onClose} aria-label="Close" className="text-[12px] font-semibold text-ink-3 uppercase hover:text-ink">
          ESC
        </button>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4 text-[13px]">
        {confirmation ? (
          <p className="text-ink" role="status" data-billing-confirmation>
            {confirmation}
          </p>
        ) : tab === 'billing' ? (
          <>
            <dl className="grid grid-cols-[8rem_1fr] gap-y-2">
              {view.rows.map((row) => (
                <div key={row.label} className="contents">
                  <dt className="text-[11px] tracking-wide text-ink-3 uppercase">{row.label}</dt>
                  <dd className="text-ink">{row.value}</dd>
                </div>
              ))}
            </dl>
            <div className="mt-5 flex flex-wrap gap-2">
              {view.canCancel ? (
                <button type="button" disabled={busy} onClick={() => void act('cancel')} className="rounded-sm border border-line-2 bg-panel-2 px-3 py-1.5 text-[12px] font-semibold text-ink hover:border-accent/50">
                  {W.cancelPlan}
                </button>
              ) : null}
              {view.canRemoveCard ? (
                <button type="button" disabled={busy} onClick={() => void act('card/remove')} className="rounded-sm border border-line-2 bg-panel-2 px-3 py-1.5 text-[12px] font-semibold text-ink hover:border-accent/50">
                  {W.removeCard}
                </button>
              ) : null}
              <button type="button" onClick={() => setTab('history')} className="rounded-sm border border-line-2 bg-panel-2 px-3 py-1.5 text-[12px] font-semibold text-ink hover:border-accent/50">
                {W.billingHistory}
              </button>
            </div>
            {view.removeCardLine ? <p className="mt-2 text-[12px] text-ink-2">{view.removeCardLine}</p> : null}
            <p className="mt-4 text-[12px] text-ink-3">{W.underButtons}</p>
          </>
        ) : (
          <>
            {history && history.length > 0 ? (
              <table className="w-full text-[12px]">
                <thead>
                  <tr className="text-left text-[11px] tracking-wide text-ink-3 uppercase">
                    <th className="py-1 font-semibold">{W.colDate}</th>
                    <th className="py-1 font-semibold">{W.colAmount}</th>
                    <th className="py-1 font-semibold">{W.colCovers}</th>
                    <th className="py-1 font-semibold">{W.colStatus}</th>
                    <th />
                  </tr>
                </thead>
                <tbody>
                  {history.map(historyRow).map((row, i) => (
                    <tr key={`${row.date}-${i}`} className="border-t border-line">
                      <td className="num py-1.5">{row.date}</td>
                      <td className="num py-1.5">{row.amount}</td>
                      <td className="py-1.5">{row.covers}</td>
                      <td className="py-1.5">{row.status}</td>
                      <td className="py-1.5 text-right">
                        {row.receiptUrl ? (
                          <a href={row.receiptUrl} target="_blank" rel="noreferrer" className="text-accent hover:underline">
                            {W.receipt}
                          </a>
                        ) : null}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : null}
            <p className="mt-3 text-[12px] text-ink-3">{W.receiptLine}</p>
            {state.plan ? (
              <button type="button" onClick={onPortal} title={W.planInvoicesHover} className="mt-3 text-[12px] text-accent hover:underline">
                {W.planInvoices}
              </button>
            ) : null}
          </>
        )}
        {failed ? <p className="mt-4 text-[12px] text-neg">{W.unreachable}</p> : null}
      </div>
    </aside>
  );
}
