/**
 * POST /auth/accept: record that this person accepted the entry gate's text.
 *
 * WEB owns this handler (D3, like /auth/signout). The form on /enter posts a
 * single field, `version`: the version of the text the person was SHOWN.
 *
 * - Not signed in -> 303 /signin. Not invited -> 303 /desk, which answers 403.
 *   Already accepted -> 303 /desk, nothing written.
 * - A STALE version (a tab opened before the text changed) -> 303 /enter,
 *   nothing written: nobody accepts text they were not shown.
 * - Otherwise one append-only row (user, version, time, session hash) and
 *   303 /desk.
 *
 * CSRF: the same protection /auth/signout relies on. The session cookie is
 * SameSite=Lax, so a cross-site POST arrives without it and is answered as
 * anonymous; no other site can make a signed-in browser accept on its behalf.
 *
 * Redirects are relative Location headers (RFC 9110 allows them), so the
 * answer is right behind nginx whatever host the app sees.
 */

import { getIdentityDb } from '@/lib/auth/db';
import { admissionForSession, sessionIdFromCookieHeader } from '@/lib/auth/requestGate';
import { recordEntryAcceptance } from '@/lib/auth/store';
import { ENTRY_GATE_VERSION } from '@/lib/legal/entryGate';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

function seeOther(location: string): Response {
  return new Response(null, { status: 303, headers: { Location: location, 'Cache-Control': 'no-store' } });
}

export async function POST(request: Request): Promise<Response> {
  const sessionId = sessionIdFromCookieHeader(request.headers.get('cookie'));
  const db = getIdentityDb();
  const admission = admissionForSession(sessionId, db);

  if (admission.state === 'anonymous') return seeOther('/signin');
  if (admission.state !== 'unaccepted') return seeOther('/desk');

  let version: string | null = null;
  try {
    const value = (await request.formData()).get('version');
    version = typeof value === 'string' ? value : null;
  } catch {
    version = null;
  }
  if (version !== ENTRY_GATE_VERSION) return seeOther('/enter');

  recordEntryAcceptance(db, admission.userId, ENTRY_GATE_VERSION, sessionId);
  return seeOther('/desk');
}
