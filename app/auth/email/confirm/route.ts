/**
 * GET  /auth/email/confirm?t=...  shows the one-button page; never uses the link.
 * POST /auth/email/confirm        (the button) uses the link once and signs in.
 * All logic is in lib/auth/emailFlow.ts.
 */

import { getIdentityDb } from '@/lib/auth/db';
import { completeEmailSignIn, showConfirm } from '@/lib/auth/emailFlow';
import { formField, respondFlow } from '@/lib/auth/emailRoute';
import { authErrorPage } from '@/lib/auth/authErrorPage';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

function ourFault(where: string, error: unknown): Response {
  console.error(`[/auth/email/confirm] ${where}:`, (error as Error).message);
  return new Response(authErrorPage(500), {
    status: 500,
    headers: { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store' },
  });
}

export async function GET(request: Request): Promise<Response> {
  try {
    const token = new URL(request.url).searchParams.get('t');
    return respondFlow(showConfirm({ db: getIdentityDb(), token }));
  } catch (error) {
    return ourFault('GET', error);
  }
}

export async function POST(request: Request): Promise<Response> {
  try {
    return respondFlow(completeEmailSignIn({ db: getIdentityDb(), token: await formField(request, 't') }));
  } catch (error) {
    return ourFault('POST', error);
  }
}
