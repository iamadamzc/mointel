/**
 * The email-link sign-in, as pure functions of their inputs, like callback.ts:
 * the routes in app/auth/... only read the request and write the response.
 *
 * THREE STEPS.
 * 1. POST /auth/start/email: an address arrives. Rate limits are checked, a
 *    token is recorded, the email is sent. Every address that passes the limits
 *    gets the same page, sent or not known, so the page cannot be used to learn
 *    which addresses have accounts. The only other outcomes are the rate-limit
 *    page (about the request, never an account) and the send-failed page (the
 *    provider's failure, identical for any address).
 * 2. GET /auth/email/confirm?t=...: shows a page with one button. It does NOT
 *    use the link. Mail scanners and link previewers fetch links on their own,
 *    and a GET that signed in would burn the link before the person clicked.
 * 3. POST /auth/email/confirm: the button. Uses the link once, resolves the
 *    address to a user, issues the same session a Google sign-in issues.
 *
 * Nothing here decides access; the gate does, at the point of use, exactly as
 * for Google.
 */

import { sessionCookie, cookieSecureDefault } from '@/lib/auth/cookie';
import {
  consumeEmailLink,
  looksLikeEmail,
  peekEmailLink,
  requestEmailLink,
  resolveEmailSignIn,
} from '@/lib/auth/emailLink';
import { EMAIL_LINK_REPLY_TO, EMAIL_LINK_SENDER, EMAIL_LINK_WORDS as W, rateLimitedMessage } from '@/lib/auth/emailLinkWords';
import { sessionExpiry } from '@/lib/auth/expiry';
import { afterSignIn } from '@/lib/auth/signInHook';
import { createSession, type IdentityDatabase } from '@/lib/auth/store';
import type { OutgoingEmail, SendResult } from '@/lib/email/ses';

export interface FlowResponse {
  status: number;
  location?: string;
  html?: string;
  setCookies: string[];
}

function escapeHtml(value: string): string {
  return value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

/**
 * The page shell, in the same look as authErrorPage. `body` is trusted markup
 * built in this file; every value placed into it is escaped first.
 */
export function emailFlowPage(heading: string, body: string): string {
  const title = escapeHtml(heading);
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="robots" content="noindex">
<meta name="referrer" content="no-referrer">
<title>Sign in | ${title}</title>
<style>
  :root { color-scheme: dark; }
  * { box-sizing: border-box; }
  body {
    margin: 0; min-height: 100vh;
    display: flex; align-items: center; justify-content: center;
    padding: 24px;
    background: #06080b; color: #e9edf3;
    font-family: ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, sans-serif;
    -webkit-font-smoothing: antialiased;
  }
  main { width: 100%; max-width: 420px; display: flex; flex-direction: column; gap: 18px; }
  svg { width: 26px; height: 26px; }
  h1 { margin: 0; font-size: 24px; font-weight: 600; line-height: 1.2; letter-spacing: -0.02em; }
  p { margin: 0; font-size: 16px; line-height: 1.6; color: #97a1b0; }
  p.small { font-size: 13px; }
  a { color: #4d93ff; text-decoration: none; }
  a:hover { text-decoration: underline; }
  a.back { align-self: flex-start; margin-top: 6px; font-size: 15px; }
  a:focus-visible, button:focus-visible { outline: 2px solid #4d93ff; outline-offset: 3px; border-radius: 2px; }
  button {
    align-self: flex-start; padding: 10px 18px; border: 0; border-radius: 6px;
    background: #4d93ff; color: #06080b; font-size: 15px; font-weight: 600; cursor: pointer;
  }
  form { display: flex; flex-direction: column; gap: 12px; }
</style>
</head>
<body>
<main>
  <svg viewBox="0 0 64 64" aria-hidden="true" focusable="false">
    <polyline points="9,52 21,19 32,34 43,10 55,52" fill="none" stroke="#4d93ff" stroke-width="7.5" stroke-linejoin="miter" stroke-miterlimit="3"/>
  </svg>
  <h1>${title}</h1>
  ${body}
</main>
</body>
</html>`;
}

const back = `<a class="back" href="/signin">&larr; ${escapeHtml(W.backToSignIn)}</a>`;
const messagePage = (heading: string, message: string | null, withBack = true) =>
  emailFlowPage(heading, `${message === null ? '' : `<p>${escapeHtml(message)}</p>`}${withBack ? back : ''}`);

const page = (status: number, html: string): FlowResponse => ({ status, html, setCookies: [] });

/** The send-failed page, for the route's own failures (not configured, unexpected). Same for any address. */
export function sendFailedResponse(status: number): FlowResponse {
  return page(status, messagePage(W.sendFailedHeading, W.sendFailedBody));
}

/** The sign-in URL the email carries. */
export function confirmUrl(origin: string, token: string): string {
  return `${origin.replace(/\/+$/, '')}/auth/email/confirm?t=${encodeURIComponent(token)}`;
}

/**
 * The "check your email" screen. It echoes the address the person typed (so it
 * is the same for a known and an unknown address apart from that echo), and
 * offers "Send another link" (the same address, posted again, still subject to
 * the limits) and "Use a different email".
 */
function sentPage(email: string): string {
  const body = `<p>${escapeHtml(W.sentBody).replace('{email}', `<strong>${escapeHtml(email)}</strong>`)}</p>
  <p>${escapeHtml(W.sentSpam)}</p>
  <form method="post" action="/auth/start/email">
    <input type="hidden" name="email" value="${escapeHtml(email)}">
    <button type="submit">${escapeHtml(W.sendAnother)}</button>
  </form>
  <a class="back" href="/signin">${escapeHtml(W.differentEmail)}</a>`;
  return emailFlowPage(W.sentHeading, body);
}

export interface StartDeps {
  db: IdentityDatabase;
  rawEmail: string | null;
  ipHash: string;
  origin: string;
  send: (email: OutgoingEmail) => Promise<SendResult>;
  log?: (line: string) => void;
  now?: Date;
}

export async function startEmailSignIn(deps: StartDeps): Promise<FlowResponse> {
  const log = deps.log ?? ((line: string) => console.log(line));
  const raw = deps.rawEmail ?? '';
  if (!looksLikeEmail(raw)) return page(400, messagePage(W.badAddress, null));

  const request = requestEmailLink(deps.db, { email: raw, ipHash: deps.ipHash, now: deps.now });
  if (request.kind === 'rate_limited') {
    return page(429, messagePage(W.rateLimitedHeading, rateLimitedMessage(request.waitMinutes)));
  }

  const link = confirmUrl(deps.origin, request.token);
  const sent = await deps.send({
    from: EMAIL_LINK_SENDER,
    to: request.email,
    replyTo: EMAIL_LINK_REPLY_TO,
    subject: W.emailSubject,
    text: W.emailText.replace('{link}', link),
  });
  if (!sent.ok) {
    // The reason is for the server log only; the page is the same for any address and any cause.
    log(`[auth/email] send failed: ${sent.reason}`);
    return page(503, messagePage(W.sendFailedHeading, W.sendFailedBody));
  }
  return page(200, sentPage(request.email));
}

function invalidPage(reason: string): FlowResponse {
  return reason === 'superseded'
    ? page(400, messagePage(W.supersededHeading, W.supersededBody))
    : page(400, messagePage(W.invalidHeading, W.invalidBody));
}

export function showConfirm(deps: { db: IdentityDatabase; token: string | null; now?: Date }): FlowResponse {
  if (!deps.token) return invalidPage('unknown');
  const state = peekEmailLink(deps.db, deps.token, deps.now);
  if (!state.ok) return invalidPage(state.reason);
  const body = `<p>${escapeHtml(W.confirmBody)}</p>
  <form method="post" action="/auth/email/confirm">
    <input type="hidden" name="t" value="${escapeHtml(deps.token)}">
    <button type="submit">${escapeHtml(W.confirmButton)}</button>
  </form>
  <p class="small">${escapeHtml(W.confirmTerms)
    .replace('terms', '<a href="/terms">terms</a>')
    .replace('privacy policy', '<a href="/privacy">privacy policy</a>')}</p>`;
  return page(200, emailFlowPage(W.confirmHeading, body));
}

export function completeEmailSignIn(deps: {
  db: IdentityDatabase;
  token: string | null;
  now?: Date;
  secure?: boolean;
  log?: (line: string) => void;
}): FlowResponse {
  const log = deps.log ?? ((line: string) => console.log(line));
  if (!deps.token) return invalidPage('unknown');
  const now = deps.now ?? new Date();
  const state = consumeEmailLink(deps.db, deps.token, now);
  if (!state.ok) return invalidPage(state.reason);

  const resolved = resolveEmailSignIn(deps.db, state.email, now);
  if (!resolved.ok) {
    log('[auth/email] refused: more than one user holds this verified address');
    return page(409, messagePage(W.ambiguousHeading, W.ambiguousBody));
  }

  const expiry = sessionExpiry(now);
  const issued = createSession(deps.db, resolved.userId, expiry, now);
  // Open the paid day (lib/auth/signInHook.ts); never blocks the sign-in.
  afterSignIn(deps.db, resolved.userId, now);
  const maxAge = Math.max(1, Math.floor((expiry.expiresAt.getTime() - now.getTime()) / 1000));
  return {
    status: 303,
    location: '/desk',
    setCookies: [sessionCookie(issued.id, maxAge, deps.secure ?? cookieSecureDefault())],
  };
}
