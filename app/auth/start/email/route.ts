/**
 * POST /auth/start/email: the sign-in screen's "email me a link" form.
 * All logic is in lib/auth/emailFlow.ts (startEmailSignIn).
 */

import { getIdentityDb } from '@/lib/auth/db';
import { sendFailedResponse, startEmailSignIn } from '@/lib/auth/emailFlow';
import { emailSignInOpen, formField, linkOrigin, notFound, requestIpHash, respondFlow } from '@/lib/auth/emailRoute';
import { sendEmail } from '@/lib/email/ses';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function POST(request: Request): Promise<Response> {
  if (!emailSignInOpen()) return notFound();
  const origin = linkOrigin();
  if (!origin) {
    console.error('[/auth/start/email] not configured: OAUTH_REDIRECT_URI is unset or invalid');
    return respondFlow(sendFailedResponse(503));
  }
  try {
    const result = await startEmailSignIn({
      db: getIdentityDb(),
      rawEmail: await formField(request, 'email'),
      ipHash: requestIpHash(request),
      origin,
      send: (email) => sendEmail(email),
    });
    return respondFlow(result);
  } catch (error) {
    console.error('[/auth/start/email] unexpected:', (error as Error).message);
    return respondFlow(sendFailedResponse(500));
  }
}
