/**
 * The page a person sees when a sign-in attempt ends in an error rather than a
 * redirect. WEB owns it.
 *
 * A ROUTE HANDLER'S RESPONSE DOES NOT GO THROUGH THE APP'S CSS PIPELINE, so this
 * is a self-contained HTML document with inline styles — no Tailwind, no
 * `next/font`, and deliberately NO external requests of any kind: the same
 * argument the public pages make, held to on the page that renders when things
 * break. Colours are the desk tokens by value.
 *
 * These are the transient / invalid states, NOT refusal. Refusal (a valid
 * sign-in for an uninvited person) happens at the gate, on the board, with its
 * own screen; it never reaches here. So each message here points at the one
 * action that can actually change the outcome — signing in again — which is a
 * real door, not the wall that "try again" is on a refusal.
 */

import { EMAIL_LINK_WORDS } from '@/lib/auth/emailLinkWords';

interface ErrorCopy {
  heading: string;
  message: string;
}

const COPY: Record<number, ErrorCopy> = {
  400: {
    heading: 'That sign-in link didn’t work',
    message:
      'The link may have expired or already been used. Head back to the sign-in screen and start again.',
  },
  503: {
    heading: 'Google didn’t respond',
    message: 'That is on Google’s side, not yours. Give it a moment and sign in again.',
  },
  500: {
    heading: 'Something went wrong on our side',
    message: 'This one is ours. Sign in again, and if it keeps happening, let us know.',
  },
  // Two existing accounts hold this verified address (his one-account rule):
  // refused, never merged. The words are the email-link flow's, one source.
  409: {
    heading: EMAIL_LINK_WORDS.ambiguousHeading,
    message: EMAIL_LINK_WORDS.ambiguousBody,
  },
};

const FALLBACK: ErrorCopy = {
  heading: 'Sign-in could not be completed',
  message: 'Head back to the sign-in screen and start again.',
};

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

export function authErrorPage(status: number): string {
  const copy = COPY[status] ?? FALLBACK;
  const heading = escapeHtml(copy.heading);
  const message = escapeHtml(copy.message);

  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Sign in | ${heading}</title>
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
  a {
    align-self: flex-start; margin-top: 6px;
    color: #4d93ff; text-decoration: none; font-size: 15px;
  }
  a:hover { text-decoration: underline; }
  a:focus-visible { outline: 2px solid #4d93ff; outline-offset: 3px; border-radius: 2px; }
</style>
</head>
<body>
<main>
  <svg viewBox="0 0 64 64" aria-hidden="true" focusable="false">
    <polyline points="9,52 21,19 32,34 43,10 55,52" fill="none" stroke="#4d93ff" stroke-width="7.5" stroke-linejoin="miter" stroke-miterlimit="3"/>
  </svg>
  <h1>${heading}</h1>
  <p>${message}</p>
  <a href="/signin">&larr; Back to sign in</a>
</main>
</body>
</html>`;
}
