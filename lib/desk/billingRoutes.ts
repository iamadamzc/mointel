import { NextResponse } from 'next/server';

import { getIdentityDb } from '@/lib/auth/db';
import { admissionForSession, sessionIdFromCookieHeader } from '@/lib/auth/requestGate';
import { stripeFromEnv } from '@/lib/billing/stripeClient';

/*
 * THE DESK'S BILLING ROUTES, SHARED PIECES (Integration 42nd's ruling, 2026-10-17). Every route under /api/billing
 * except Ops's webhook is signed-in and calls gateApiRequest first (tests/auth/requestGate.test.ts enforces it); these
 * helpers run after that gate. The library is Billing's (lib/billing/*); this file only adapts it to a request.
 */

export const NO_STORE = { 'Cache-Control': 'no-store, max-age=0' } as const;

/** Where Stripe's portal sends the buyer back. Ops may override it per box; Billing's sandbox default otherwise. */
export const PORTAL_RETURN_ENV = 'BILLING_PORTAL_RETURN_URL';
export const PORTAL_RETURN_DEFAULT = 'https://tmitrader.com/desk';

/** The admitted user's id. Call only after gateApiRequest has admitted the request; null otherwise. */
export function sessionUserId(request: Request): number | null {
  const admission = admissionForSession(sessionIdFromCookieHeader(request.headers.get('cookie')));
  return admission.state === 'admitted' ? admission.userId : null;
}

/**
 * A POST from another site is refused. The session cookie is SameSite=Lax, so a cross-site POST does not carry it in
 * the first place; this is the second check, on the Origin header when the browser sends one.
 */
export function crossSiteRefusal(request: Request): NextResponse | null {
  const origin = request.headers.get('origin');
  if (!origin) return null;
  // nginx passes the browser's Host through (proxy_set_header Host $host), so Host is the site the page came from.
  const host = request.headers.get('host');
  try {
    if (host && new URL(origin).host === host) return null;
  } catch {
    // An unreadable Origin is refused below.
  }
  return NextResponse.json({ error: 'cross-site request refused' }, { status: 403, headers: NO_STORE });
}

/** Billing's database and Stripe client; a missing or refused key is "billing unavailable", never a 500 with detail. */
export function billingDeps(): { db: ReturnType<typeof getIdentityDb>; stripe: ReturnType<typeof stripeFromEnv> } | null {
  try {
    return { db: getIdentityDb(), stripe: stripeFromEnv() };
  } catch {
    return null;
  }
}

export function unavailable(): NextResponse {
  return NextResponse.json({ error: 'billing unavailable' }, { status: 503, headers: NO_STORE });
}
