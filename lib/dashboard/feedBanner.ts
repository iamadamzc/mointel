/**
 * THE "NOT UPDATING" BANNER (beta path T3): a board that has stopped moving must
 * not look live. One line above the board, in one of three states, in Marketing's
 * words (2026-10-05), and silent when the board is current.
 *
 * Two different facts, kept apart because a trader acts differently on them:
 *
 *   UNREACHABLE  this PAGE cannot reach the desk (the market poll is failing).
 *                The numbers are the last ones received. There is no age here:
 *                a count of minutes would be a figure the page can no longer
 *                verify, so it states only the time of the last number received.
 *   NEVER        the same, and no number has been received since the page opened.
 *   DATA_OLD     the desk answered, but its market data is older than the feed's
 *                own staleness threshold. The poll succeeded, so the age was true
 *                when measured and is stated.
 *
 * NOT A STATE HERE: a signed-out session (`UNAUTHORIZED`). That is not a
 * transport fault and waiting never fixes it; the header already says so.
 *
 * THE TIMES ARE THE DESK'S, NEVER THE PAGE'S CLOCK: the server's stamp on the
 * last payload (A) and the market data's own timestamp (B). A time that is not
 * the reader's ET day carries its date, as the checkpoint time does.
 *
 * NOT in the words, on purpose: "live", "reconnecting", "will update",
 * "refresh", "delayed", "stale", any vendor name, any instruction.
 */

import type { FeedFailure } from '@/lib/dashboard/feedFailure';
import type { MarketHealthView } from '@/lib/market/health';

export type FeedBannerCause = 'UNREACHABLE' | 'NEVER' | 'DATA_OLD';

export interface FeedBanner {
  cause: FeedBannerCause;
  text: string;
}

const CLOCK = new Intl.DateTimeFormat('en-US', {
  timeZone: 'America/New_York',
  hour: '2-digit',
  minute: '2-digit',
  second: '2-digit',
  hourCycle: 'h23',
});
const DAY = new Intl.DateTimeFormat('en-US', {
  timeZone: 'America/New_York',
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
});
const DAY_LABEL = new Intl.DateTimeFormat('en-US', {
  timeZone: 'America/New_York',
  month: 'short',
  day: 'numeric',
});

/** "15:58:07", or "Oct 2, 15:58:07" when it is not the reader's ET day. Null when unparseable. */
export function bannerTime(iso: string | null | undefined, nowIso: string): string | null {
  if (!iso) return null;
  const at = new Date(iso);
  if (Number.isNaN(at.getTime())) return null;
  const clock = CLOCK.format(at);
  return DAY.format(at) === DAY.format(new Date(nowIso)) ? clock : `${DAY_LABEL.format(at)}, ${clock}`;
}

export interface FeedBannerInput {
  /** The market poll's current failure, or null. */
  failure: FeedFailure | null;
  /** True once any market payload has been received since the page opened. */
  hasSnapshot: boolean;
  /** The server's stamp on the last payload received (`MarketSnapshot.fetchedAt`). */
  receivedAt: string | null;
  /** The last payload's health, when there is one. */
  health: Pick<MarketHealthView, 'freshness' | 'messageAgeSeconds'> | null;
  /** The market data's own timestamp (`MarketFeedHealth.lastMessageAt`). */
  dataAt: string | null;
  /** Simulated or test feeds are not a market feed and never trigger this. */
  simulated?: boolean;
  /** Only to decide whether a time carries its date. */
  nowIso: string;
}

export function feedBanner(input: FeedBannerInput): FeedBanner | null {
  const { failure } = input;

  if (failure && failure.kind === 'TRANSPORT') {
    if (!input.hasSnapshot) {
      return { cause: 'NEVER', text: 'This page cannot reach the desk. No numbers have been received since this page opened.' };
    }
    const at = bannerTime(input.receivedAt, input.nowIso);
    // A last-received time that cannot be read is the NEVER sentence's honest twin, not a guessed time.
    if (at === null) {
      return { cause: 'NEVER', text: 'This page cannot reach the desk. No numbers have been received since this page opened.' };
    }
    return { cause: 'UNREACHABLE', text: `This page cannot reach the desk. The numbers below are the last ones received, at ${at} ET.` };
  }
  if (failure) return null; // UNAUTHORIZED: its own line, not this one.

  if (!input.hasSnapshot || input.simulated || !input.health) return null;
  // STALE is beyond the feed's own staleness threshold and only in a session
  // where data is expected: the classification returns NOT_EXPECTED overnight,
  // at weekends and from 20:00 to 22:00, so a quiet market never prints this.
  if (input.health.freshness !== 'STALE') return null;

  const at = bannerTime(input.dataAt, input.nowIso);
  const age = input.health.messageAgeSeconds;
  if (at === null || age === null) return null;
  const minutes = Math.floor(age / 60);
  return {
    cause: 'DATA_OLD',
    text: `The desk's market data was last updated at ${at} ET, ${minutes} ${minutes === 1 ? 'minute' : 'minutes'} ago. The numbers below are as of then.`,
  };
}
