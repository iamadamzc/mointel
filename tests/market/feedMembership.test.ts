import { describe, expect, it } from 'vitest';

import { FeedMembership } from '@/lib/market/feedMembership';

/*
 * Membership = the stream's ACKED trades set AND the engine's highRes flag.
 * Written from the scope agreed with Design and Ops, 2026-09-29.
 */

describe('FeedMembership', () => {
  it('opens only when BOTH the flag and the acknowledgement are present', () => {
    const m = new FeedMembership();
    // The engine flags it first: nothing is subscribed yet, so nothing opens.
    expect(m.setHighRes(['AAA'], 1_000)).toEqual([]);
    // The stream acknowledges it: now prints can arrive AND be counted.
    expect(m.setAcked(['AAA'], 1_400)).toEqual([{ symbol: 'AAA', kind: 'OPEN', at: 1_400 }]);
    expect(m.openSince().get('AAA')).toBe(1_400);
  });

  it('acked but not flagged is not counted, so it does not open', () => {
    const m = new FeedMembership();
    expect(m.setAcked(['AAA'], 1_000)).toEqual([]);
  });

  it('closes when the engine drops it, even while still subscribed', () => {
    const m = new FeedMembership();
    m.setHighRes(['AAA', 'BBB'], 0);
    m.setAcked(['AAA', 'BBB'], 100);
    expect(m.setHighRes(['BBB'], 5_000)).toEqual([{ symbol: 'AAA', kind: 'CLOSE', at: 5_000 }]);
  });

  it('closes when the stream drops it, even while still flagged', () => {
    const m = new FeedMembership();
    m.setHighRes(['AAA'], 0);
    m.setAcked(['AAA'], 100);
    expect(m.setAcked([], 7_000)).toEqual([{ symbol: 'AAA', kind: 'CLOSE', at: 7_000 }]);
  });

  it('A DISCONNECT CLOSES EVERYTHING, and only the reconnect ack re-opens', () => {
    const m = new FeedMembership();
    m.setHighRes(['AAA', 'BBB'], 0);
    m.setAcked(['AAA', 'BBB'], 100);
    expect(m.disconnect(9_000).map((c) => [c.symbol, c.kind])).toEqual([
      ['AAA', 'CLOSE'],
      ['BBB', 'CLOSE'],
    ]);
    // The flag alone does not re-open after a disconnect.
    expect(m.setHighRes(['AAA', 'BBB'], 9_500)).toEqual([]);
    expect(m.setAcked(['AAA'], 12_000)).toEqual([{ symbol: 'AAA', kind: 'OPEN', at: 12_000 }]);
  });

  it('an unchanged set produces no churn', () => {
    const m = new FeedMembership();
    m.setHighRes(['AAA'], 0);
    m.setAcked(['AAA'], 100);
    expect(m.setHighRes(['AAA'], 200)).toEqual([]);
    expect(m.setAcked(['AAA'], 300)).toEqual([]);
    expect(m.openSince().get('AAA')).toBe(100);
  });

  it('a date rollover closes and re-opens every open interval at one instant', () => {
    const m = new FeedMembership();
    m.setHighRes(['AAA', 'BBB'], 0);
    m.setAcked(['AAA', 'BBB'], 100);
    const { closed, opened } = m.rollover(50_000);
    expect(closed.map((c) => [c.symbol, c.kind, c.at])).toEqual([
      ['AAA', 'CLOSE', 50_000],
      ['BBB', 'CLOSE', 50_000],
    ]);
    expect(opened.map((c) => [c.symbol, c.kind, c.at])).toEqual([
      ['AAA', 'OPEN', 50_000],
      ['BBB', 'OPEN', 50_000],
    ]);
    expect(m.openSince().get('AAA')).toBe(50_000);
  });
});
