import { readFileSync } from 'node:fs';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';

import { FeedBanner } from '@/components/FeedBanner';
import { bannerTime, feedBanner, type FeedBannerInput } from '@/lib/dashboard/feedBanner';

// 15:58:07 ET on 2026-10-05 (EDT, UTC-4).
const AT = '2026-10-05T19:58:07.000Z';
const NOW = '2026-10-05T20:10:00.000Z';
const EM_DASH = String.fromCharCode(0x2014);

const base = (over: Partial<FeedBannerInput> = {}): FeedBannerInput => ({
  failure: null,
  hasSnapshot: true,
  receivedAt: AT,
  health: { freshness: 'FRESH', messageAgeSeconds: 3 },
  dataAt: AT,
  nowIso: NOW,
  ...over,
});
const transport = { kind: 'TRANSPORT' as const, detail: 'boom' };

describe('the three banner texts, in the approved words', () => {
  it('UNREACHABLE: the time of the last number received, and no age', () => {
    const banner = feedBanner(base({ failure: transport }));
    expect(banner?.cause).toBe('UNREACHABLE');
    expect(banner?.text).toBe('This page cannot reach the desk. The numbers below are the last ones received, at 15:58:07 ET.');
    expect(banner?.text).not.toMatch(/minute/);
  });

  it('NEVER: failing with no number received since the page opened', () => {
    expect(feedBanner(base({ failure: transport, hasSnapshot: false, receivedAt: null }))?.text).toBe(
      'This page cannot reach the desk. No numbers have been received since this page opened.',
    );
  });

  it('DATA_OLD: the desk answered, its market data is older than the staleness threshold, with the measured age', () => {
    const banner = feedBanner(base({ health: { freshness: 'STALE', messageAgeSeconds: 14 * 60 + 20 } }));
    expect(banner?.cause).toBe('DATA_OLD');
    expect(banner?.text).toBe(
      "The desk's market data was last updated at 15:58:07 ET, 14 minutes ago. The numbers below are as of then.",
    );
  });

  it('says "1 minute" rather than "1 minutes"', () => {
    expect(feedBanner(base({ health: { freshness: 'STALE', messageAgeSeconds: 61 } }))?.text).toContain('1 minute ago');
  });
});

describe('the time is the desk clock, and carries its date when it is not the reader ET day', () => {
  it('prints a bare time on the same ET day and the date on another', () => {
    expect(bannerTime(AT, NOW)).toBe('15:58:07');
    expect(bannerTime('2026-10-02T19:58:07.000Z', NOW)).toBe('Oct 2, 15:58:07');
    expect(feedBanner(base({ failure: transport, receivedAt: '2026-10-02T19:58:07.000Z' }))?.text).toContain('at Oct 2, 15:58:07 ET.');
  });

  it('judges the day in ET, not UTC: 21:00 ET is already tomorrow in UTC', () => {
    expect(bannerTime('2026-10-06T01:00:00.000Z', '2026-10-05T23:00:00.000Z')).toBe('21:00:00');
  });

  it('never invents a time it cannot read', () => {
    expect(bannerTime('not a time', NOW)).toBeNull();
    expect(feedBanner(base({ failure: transport, receivedAt: 'nope' }))?.cause).toBe('NEVER');
    expect(feedBanner(base({ health: { freshness: 'STALE', messageAgeSeconds: 600 }, dataAt: null }))).toBeNull();
    expect(feedBanner(base({ health: { freshness: 'STALE', messageAgeSeconds: null } }))).toBeNull();
  });
});

describe('when it stays silent', () => {
  it('is silent for a current board, a degraded one inside the threshold, and a quiet market', () => {
    for (const freshness of ['FRESH', 'DEGRADED', 'NOT_EXPECTED'] as const) {
      expect(feedBanner(base({ health: { freshness, messageAgeSeconds: 900 } })), freshness).toBeNull();
    }
  });

  it('is silent for a signed-out session, which has its own line, and for a simulated feed', () => {
    expect(feedBanner(base({ failure: { kind: 'UNAUTHORIZED' } }))).toBeNull();
    // Even with old data behind it: waiting never fixes a signed-out session, so this is not the old-data sentence.
    expect(feedBanner(base({ failure: { kind: 'UNAUTHORIZED' }, health: { freshness: 'STALE', messageAgeSeconds: 900 } }))).toBeNull();
    expect(feedBanner(base({ health: { freshness: 'STALE', messageAgeSeconds: 900 }, simulated: true }))).toBeNull();
  });

  it('is silent before any payload when nothing has failed (first load)', () => {
    expect(feedBanner(base({ hasSnapshot: false, receivedAt: null, health: null }))).toBeNull();
  });

  it('a failing poll wins over old data: one cause at a time', () => {
    expect(feedBanner(base({ failure: transport, health: { freshness: 'STALE', messageAgeSeconds: 900 } }))?.cause).toBe('UNREACHABLE');
  });
});

describe('the words stay inside what Marketing allowed', () => {
  it('no live, reconnecting, will update, refresh, delayed, stale, no instruction, no em dash', () => {
    const texts = [
      feedBanner(base({ failure: transport }))!.text,
      feedBanner(base({ failure: transport, hasSnapshot: false, receivedAt: null }))!.text,
      feedBanner(base({ health: { freshness: 'STALE', messageAgeSeconds: 900 } }))!.text,
    ];
    for (const text of texts) {
      expect(text, text).not.toMatch(/\blive\b|reconnect|will update|refresh|delayed|\bstale\b|try again|please/i);
      expect(text.includes(EM_DASH), text).toBe(false);
    }
  });
});

describe('the component and its place', () => {
  it('prints nothing when there is no banner and one status line when there is', () => {
    expect(renderToStaticMarkup(createElement(FeedBanner, { banner: null }))).toBe('');
    const html = renderToStaticMarkup(createElement(FeedBanner, { banner: { cause: 'DATA_OLD', text: 'x' } }));
    expect(html).toContain('role="status"');
    expect(html).toContain('whitespace-nowrap');
    expect(html).toContain('data-feed-banner="DATA_OLD"');
  });

  it('sits directly under the counts and filters, above the main area, and reads the desk own stamps', () => {
    const shell = readFileSync('components/DashboardShell.tsx', 'utf8');
    expect(shell).toMatch(/<\/MarketSummary>\s*<FeedBanner banner=\{banner\} \/>/);
    expect(shell).toContain('receivedAt: market.snapshot?.fetchedAt ?? null');
    expect(shell).toContain('dataAt: market.snapshot?.health.lastMessageAt ?? null');
  });
});
