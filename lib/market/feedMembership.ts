/**
 * When each name's trades were actually being counted -- the membership
 * intervals that make a 10 s bucket's ZERO a measurement.
 *
 * WHY THIS EXISTS. `trade_buckets` gets a row only when a trade prints, so a
 * silent watched name and an unwatched one are both "no row". His Now column
 * (2026-09-29: "i want the trade counts, dots and direction color") shows a
 * zero as a zero, so the desk must know, per bucket, that it was listening.
 *
 * MEMBERSHIP IS THE INTERSECTION OF TWO SETS, AND NEITHER ALONE IS ENOUGH:
 *
 * - the stream's ACKED trades set (`alpaca/stream.ts`, the `subscription`
 *   message) -- the moment trades can actually arrive. The engine's flag flips
 *   before the subscription is live, so an interval opened on the flag would
 *   claim silence for seconds nobody was subscribed.
 * - the engine's `highRes` flag -- the counting gate (`engine.ts`, the bucket
 *   is only incremented while it is set). Subscribed but not flagged means
 *   prints arrive and are not counted.
 *
 * A DISCONNECT CLOSES EVERYTHING: no socket, no prints, whatever either set
 * says. The acked set is cleared with it; the reconnect's own acknowledgement
 * is what re-opens.
 *
 * Pure: it returns the changes, and the runtime persists them. The store
 * heartbeats open intervals every flush, so a crash cannot leave one claiming
 * coverage past the last flush.
 */

export interface MembershipChange {
  symbol: string;
  kind: 'OPEN' | 'CLOSE';
  /** Epoch ms. */
  at: number;
  /**
   * The interval's identity in `feed_intervals` (Ops's v2 keys a row by its
   * open time). Equal to `at` on an OPEN; the original open time on a CLOSE.
   */
  openedMs: number;
}

export class FeedMembership {
  private acked = new Set<string>();
  private highRes = new Set<string>();
  private readonly open = new Map<string, number>();

  /** The stream acknowledged this exact trades subscription. */
  setAcked(symbols: Iterable<string>, at: number): MembershipChange[] {
    this.acked = new Set(symbols);
    return this.reconcile(at);
  }

  /** The engine's counting set changed. */
  setHighRes(symbols: Iterable<string>, at: number): MembershipChange[] {
    this.highRes = new Set(symbols);
    return this.reconcile(at);
  }

  /** The socket is gone: nothing is being received, whatever was acked. */
  disconnect(at: number): MembershipChange[] {
    this.acked = new Set();
    return this.reconcile(at);
  }

  /**
   * The trading date rolled: every open interval closes under the old date and
   * re-opens under the new one, at the same instant. Returns [closes, opens].
   */
  rollover(at: number): { closed: MembershipChange[]; opened: MembershipChange[] } {
    const symbols = [...this.open.keys()].sort();
    const closed = symbols.map((symbol) => ({
      symbol,
      kind: 'CLOSE' as const,
      at,
      openedMs: this.open.get(symbol) as number,
    }));
    for (const symbol of symbols) this.open.set(symbol, at);
    return {
      closed,
      opened: symbols.map((symbol) => ({ symbol, kind: 'OPEN' as const, at, openedMs: at })),
    };
  }

  /** Symbols with an open interval, and since when. */
  openSince(): ReadonlyMap<string, number> {
    return this.open;
  }

  private reconcile(at: number): MembershipChange[] {
    const live = new Set([...this.highRes].filter((symbol) => this.acked.has(symbol)));
    const changes: MembershipChange[] = [];

    for (const symbol of [...this.open.keys()].sort()) {
      if (live.has(symbol)) continue;
      const openedMs = this.open.get(symbol) as number;
      this.open.delete(symbol);
      changes.push({ symbol, kind: 'CLOSE', at, openedMs });
    }
    for (const symbol of [...live].sort()) {
      if (this.open.has(symbol)) continue;
      this.open.set(symbol, at);
      changes.push({ symbol, kind: 'OPEN', at, openedMs: at });
    }
    return changes;
  }
}
