'use client';

import { createContext, useContext, useEffect, useRef, useState, type FormEvent, type ReactNode } from 'react';

/**
 * A form that posts once, for the forms whose route calls Stripe (/checkout/start, /trial/start).
 *
 * Why (Ops's nginx lines, 2026-10-17): the route answers 303 to Stripe in about 0.3 s, but while
 * Chrome loads Stripe's page the old page stays on screen and clickable with no sign of work. A
 * second click aborts that load (nginx 499) and posts again, and each post made a Checkout Session.
 * His words: "the button to actually buy does not react, i thought it was frozen" (Ops chat
 * 38cd4446, uuid d8da7d02). Layout ruled by Integration 43rd: no new words, the button keeps its
 * approved label, disables at once with a spinner and aria-busy; repeat clicks and Enter do nothing.
 *
 * Still a plain document POST: with no script the form submits as before.
 */

/** Whether this form has posted; exported so a test can render the busy button. */
export const SubmitPending = createContext(false);

/** The submit gate, apart from React so a test can drive it: the first submit passes, the rest are stopped. */
export function submitGate() {
  let sent = false;
  return {
    submit(event: { preventDefault(): void }): boolean {
      if (sent) {
        event.preventDefault();
        return false;
      }
      sent = true;
      return true;
    },
    reset() {
      sent = false;
    },
  };
}

export function SubmitOnceForm({ action, className, children }: { action: string; className?: string; children: ReactNode }) {
  const gate = useRef(submitGate());
  const [pending, setPending] = useState(false);

  useEffect(() => {
    // Back from Stripe can restore this page from the back-forward cache, still busy; open it again.
    const onShow = (event: PageTransitionEvent) => {
      if (!event.persisted) return;
      gate.current.reset();
      setPending(false);
    };
    window.addEventListener('pageshow', onShow);
    return () => window.removeEventListener('pageshow', onShow);
  }, []);

  const onSubmit = (event: FormEvent<HTMLFormElement>) => {
    if (gate.current.submit(event)) setPending(true);
  };

  return (
    <form method="post" action={action} onSubmit={onSubmit} aria-busy={pending} className={className}>
      <SubmitPending.Provider value={pending}>{children}</SubmitPending.Provider>
    </form>
  );
}

export function SubmitOnceButton({ className, children }: { className: string; children?: ReactNode }) {
  const pending = useContext(SubmitPending);
  return (
    <button type="submit" disabled={pending} className={`${className} gap-2.5 disabled:cursor-progress disabled:opacity-70`}>
      {pending ? (
        <span aria-hidden="true" className="h-4 w-4 shrink-0 animate-spin rounded-full border-2 border-current border-t-transparent" />
      ) : null}
      {children}
    </button>
  );
}
