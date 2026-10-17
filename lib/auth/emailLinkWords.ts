/**
 * EVERY WORD the email-link sign-in shows or sends, in one place.
 *
 * PLACEHOLDERS. The approved wording comes from Marketing's file
 * (docs/marketing/email-link-signin-words-2026-10-17.md) once Commercial has
 * passed it and he has approved it verbatim; it replaces these values in a
 * single later commit. Nothing ships with these placeholders: the release that
 * carries this feature waits on his verbatim yes.
 *
 * Two lines are already settled by Commercial read 152a and Marketing a163817c
 * and are marked SETTLED; the rest are PLACEHOLDER.
 */

export const EMAIL_LINK_SENDER = 'signin@tmitrader.com';
/** His support mailbox (his word 2026-10-17T02:05:50Z via Integration). */
export const EMAIL_LINK_REPLY_TO = 'desk@tmitrader.com';

export const EMAIL_LINK_WORDS = {
  /** PLACEHOLDER */
  emailSubject: 'Your TMI sign-in link',
  /** PLACEHOLDER. {link} is replaced with the sign-in URL. */
  emailText:
    'Use this link to sign in to TMI. It works once and expires in 15 minutes.\n\n{link}\n\n' +
    'If you did not ask for this, you can ignore this email.',

  /** PLACEHOLDER: the page after a request is accepted. */
  sentHeading: 'Check your email',
  sentMessage: 'If that address can sign in, we have sent a link to it. The link works once and expires in 15 minutes.',

  /** SETTLED (Marketing a163817c): the send call itself failed. Identical for any address. */
  sendFailedHeading: 'We couldn’t send the email',
  /** PLACEHOLDER */
  sendFailedMessage: 'Give it a moment and try again.',

  /** SETTLED (Commercial 152a, Marketing a163817c): N is 1. */
  rateLimitedOne: 'There have been too many link requests. You can ask again in 1 minute.',
  /** SETTLED (Commercial 152a, Marketing a163817c): N is 2 or more; {n} is replaced. */
  rateLimitedMany: 'There have been too many link requests. You can ask again in {n} minutes.',
  /** PLACEHOLDER */
  rateLimitedHeading: 'Please wait a moment',

  /** PLACEHOLDER: the one-button confirm page. */
  confirmHeading: 'Sign in to TMI',
  confirmButton: 'Sign in',
  /** SETTLED (Marketing a163817c): under the button; the two links are added by the page. */
  confirmTerms: 'By signing in you agree to the terms and the privacy policy.',

  /** PLACEHOLDER: a link that is unknown, expired or already used. */
  invalidHeading: 'That sign-in link didn’t work',
  invalidMessage: 'It may have expired or already been used. Ask for a new link from the sign-in screen.',
  /** PLACEHOLDER: a link replaced by a newer one. */
  supersededMessage: 'A newer link was sent to this address. Use the newest one, or ask for another.',

  /** PLACEHOLDER: two existing accounts share the address; never merged. */
  ambiguousHeading: 'We need to sort out your account',
  ambiguousMessage: 'More than one account uses this email address. Write to desk@tmitrader.com and we will fix it.',

  /** PLACEHOLDER: the address did not look like one. */
  badAddressHeading: 'Check the email address',
  badAddressMessage: 'That doesn’t look like an email address. Go back and try again.',

  backToSignIn: 'Back to sign in',
} as const;

export function rateLimitedMessage(waitMinutes: number): string {
  return waitMinutes <= 1
    ? EMAIL_LINK_WORDS.rateLimitedOne
    : EMAIL_LINK_WORDS.rateLimitedMany.replace('{n}', String(waitMinutes));
}
