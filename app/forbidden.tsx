import { cookies } from 'next/headers';

import { NotAdmitted } from '@/components/NotAdmitted';
import { getIdentityDb } from '@/lib/auth/db';
import { SESSION_COOKIE } from '@/lib/auth/cookie';
import { admissionForSession } from '@/lib/auth/requestGate';
import { canStartTrial, verifiedEmailFor } from '@/lib/billing/store';
import { purchaseOpen } from '@/lib/public/purchaseOpen';

/**
 * What `forbidden()` renders, with a 403. Only `/desk` calls it, for a signed-in
 * person the allowlist does not admit.
 *
 * Purchase switch closed: today's screen, with no address (the gate returns none, so
 * the `email` prop is optional for that reason).
 * Open: the purchase screen, which needs the person's own verified address and whether
 * they may still start a trial. Both are Billing's reads by user id, made here on the
 * page, so the gate itself never learns about payment (lib/auth/gate.ts). A failed read
 * falls back to today's screen rather than a 500 on a refusal.
 */
export default async function Forbidden() {
  if (!purchaseOpen()) return <NotAdmitted />;
  return <NotAdmitted purchase={await purchaseFacts()} />;
}

/** The two facts the purchase screen needs, or null (today's screen) if either is missing. */
async function purchaseFacts(): Promise<{ email: string; canTrial: boolean } | null> {
  try {
    const db = getIdentityDb();
    const admission = admissionForSession((await cookies()).get(SESSION_COOKIE)?.value, db);
    if (admission.state !== 'refused') return null;
    const email = verifiedEmailFor(db, admission.userId);
    if (!email) return null;
    return { email, canTrial: canStartTrial(db, admission.userId) };
  } catch {
    return null;
  }
}
