import { createHash } from 'node:crypto';

/**
 * THE ENTRY GATE'S TEXT: the one source. Server-side only (the version is
 * computed with node:crypto); the screen receives it as props.
 *
 * Commercial's final text, `docs/research/session-reports/commercial.md`
 * section 12b (776f1415). Every sentence but the last line is section 7 of
 * `docs/legal/terms.md` VERBATIM, which is why it needs no adoption of its own:
 * `tests/auth/entryGate.test.ts` asserts each sentence is in the adopted terms,
 * so "verbatim" is a checked property rather than a promise. Change a word here
 * and it is new legal text, which goes to Commercial and then to him.
 *
 * Section 7's last sentence ("Past movement in any security...") is left out on
 * purpose; the reason is in 12b.
 *
 * HOW OFTEN: once per version of this text (his ruling, 2026-10-05T19:09:04Z,
 * "once"). The version is a hash of the text itself, so any edit re-asks every
 * user and nobody has to remember to bump a number.
 */
export const ENTRY_GATE = {
  title: 'Disclaimer',
  paragraphs: [
    'We are not a broker-dealer. We are not an investment adviser. We are not your fiduciary. Nothing the desk displays is a recommendation, an endorsement, a solicitation, or a suggestion to buy or sell any security.',
    'Every trading decision you make is yours. Trading low-float small-cap equities carries a substantial risk of loss, and you can lose more than you expect to.',
  ],
  summary: 'This is a summary of one section of our Terms of Service, not all of them.',
  termsLink: { label: 'Read the full terms.', href: '/terms' },
  accept: 'Accept',
  decline: 'Decline',
} as const;

export type EntryGateText = typeof ENTRY_GATE;

export const ENTRY_GATE_VERSION: string = createHash('sha256')
  .update(JSON.stringify(ENTRY_GATE))
  .digest('hex')
  .slice(0, 16);
