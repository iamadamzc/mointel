/**
 * EVERY WORD the email-link sign-in shows or sends, in one place.
 *
 * APPROVED VERBATIM: his yes (Integration chat, uuid 91dfe64b,
 * 2026-10-17T03:54:19.866Z) to Marketing's docs/marketing/email-link-signin-words-2026-10-17.md
 * at b227a882 (sections 2, 3 and 4 are these pages and the email; section 1,
 * the sign-in page itself, is Web's) with Commercial's strings at 60caccb5.
 *
 * DO NOT EDIT A STRING HERE WITHOUT A NEW YES. Where a page needs a heading and
 * the approved text is two sentences, the split is at the full stop; no word
 * changes.
 */

export const EMAIL_LINK_SENDER = 'TMI <signin@tmitrader.com>';
/** His support mailbox (his word 2026-10-17T02:05:50Z via Integration). */
export const EMAIL_LINK_REPLY_TO = 'desk@tmitrader.com';

export const EMAIL_LINK_WORDS = {
  // Section 3: the email.
  emailSubject: 'Your sign-in link for TMI',
  /** {link} is replaced with the sign-in URL. */
  emailText: [
    'Open this link, then press Sign in:',
    '',
    '{link}',
    '',
    'It works once and expires in 15 minutes. If you ask for another link, only the newest one works.',
    '',
    "Don't forward it: anyone who opens it can sign in as you.",
    '',
    "If you didn't ask for this, ignore this email. Nothing happens unless you open the link and press Sign in.",
    '',
    'TMI, The Momentum Intelligence Trading Desk',
    'Questions: desk@tmitrader.com',
  ].join('\n'),

  // Section 2: the "check your email" screen. {email} is replaced (escaped).
  sentHeading: 'Check your email.',
  sentBody: "If that address can sign in, we've sent a link to {email}. It works once and expires in 15 minutes. Only the newest link works.",
  sentSpam: 'If it does not arrive, check your spam folder.',
  sendAnother: 'Send another link',
  differentEmail: 'Use a different email',

  // Section 4: the one-button page.
  confirmHeading: 'Sign in to TMI',
  confirmBody: 'Press the button to finish signing in.',
  confirmButton: 'Sign in',
  /** The two links are added by the page (read 152a). */
  confirmTerms: 'By signing in you agree to the terms and the privacy policy.',

  // Section 4: an older link.
  supersededHeading: 'Use the newest link.',
  supersededBody: 'A newer sign-in link was sent to this address. Open the newest email and use that link.',

  // Section 4: an expired or used link (the email link's own page).
  invalidHeading: 'That link has expired or was already used.',
  invalidBody: 'Go back to sign in and ask for a new link.',

  backToSignIn: 'Back to sign in',

  // Section 4: too many requests. Split at the full stop for the page heading.
  rateLimitedHeading: 'There have been too many link requests.',
  rateLimitedOne: 'You can ask again in 1 minute.',
  rateLimitedMany: 'You can ask again in {n} minutes.',

  // Section 4: an address that is not an address.
  badAddress: 'Enter a valid email address.',

  // Section 4: the send failed. Split at the full stop for the page heading.
  sendFailedHeading: "We couldn't send the email.",
  sendFailedBody: 'Try again, or sign in with Google.',

  // Section 4: two accounts on one address.
  ambiguousHeading: 'We need to sort out your account.',
  ambiguousBody: "More than one account uses this address, so we can't sign you in yet. Email desk@tmitrader.com and we will sort it out with you.",
} as const;

/** The second sentence of the rate-limit line, by N (whole minutes, rounded up). */
export function rateLimitedMessage(waitMinutes: number): string {
  return waitMinutes <= 1
    ? EMAIL_LINK_WORDS.rateLimitedOne
    : EMAIL_LINK_WORDS.rateLimitedMany.replace('{n}', String(waitMinutes));
}
