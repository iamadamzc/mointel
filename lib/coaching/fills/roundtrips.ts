/**
 * Flat-to-flat round-trip reconstruction from fills.
 *
 * FIFO, per symbol, in fill order. A round trip opens when position goes from
 * flat and closes when it returns to flat; scaling in and out in between is
 * folded into that one trip. This is the honest unit for a trader who works a
 * position rather than taking one entry and one exit — but it means the entry
 * and exit prices are VWAPs, so a trip that scaled out can hide a worse
 * individual exit inside an acceptable average. Any check reading
 * `pnlPerShare` inherits that caveat.
 *
 * Shorts are handled (a trip that opens with a sell), though the record so far
 * is long-only.
 *
 * A position still open when the fills run out is returned with `closedAt`
 * null and only its realised portion in `pnl`. It is never silently closed at
 * the last price — that would invent a fill.
 */

export interface FillRow {
  symbol: string;
  side: 'Buy' | 'Sell';
  filledTime: string;
  qty: number;
  price: number;
}

export interface RoundTrip {
  symbol: string;
  direction: 'LONG' | 'SHORT';
  openedAt: string;
  closedAt: string | null;
  holdSeconds: number | null;
  qty: number;
  entryVwap: number;
  exitVwap: number | null;
  exitQty: number;
  pnl: number;
  pnlPerShare: number;
  entryLegs: number;
  exitLegs: number;
}

interface Lot {
  qty: number; // signed: positive long, negative short
  price: number;
}

interface Building {
  symbol: string;
  direction: 'LONG' | 'SHORT';
  openedAt: string;
  entryQty: number;
  entryNotional: number;
  entryLegs: number;
  exitQty: number;
  exitNotional: number;
  exitLegs: number;
  lastExitAt: string | null;
  pnl: number;
}

function seconds(from: string, to: string): number {
  return Math.round((Date.parse(`${to}Z`) - Date.parse(`${from}Z`)) / 1000);
}

function finish(building: Building, closedAt: string | null): RoundTrip {
  return {
    symbol: building.symbol,
    direction: building.direction,
    openedAt: building.openedAt,
    closedAt,
    holdSeconds: closedAt ? seconds(building.openedAt, closedAt) : null,
    qty: building.entryQty,
    entryVwap: building.entryNotional / building.entryQty,
    exitVwap: building.exitQty > 0 ? building.exitNotional / building.exitQty : null,
    exitQty: building.exitQty,
    pnl: building.pnl,
    pnlPerShare: building.exitQty > 0 ? building.pnl / building.exitQty : 0,
    entryLegs: building.entryLegs,
    exitLegs: building.exitLegs,
  };
}

export function buildRoundTrips(fills: readonly FillRow[]): RoundTrip[] {
  const bySymbol = new Map<string, FillRow[]>();
  for (const fill of fills) {
    if (fill.qty <= 0 || !Number.isFinite(fill.price)) continue;
    const list = bySymbol.get(fill.symbol) ?? [];
    list.push(fill);
    bySymbol.set(fill.symbol, list);
  }

  const trips: RoundTrip[] = [];

  for (const [symbol, list] of bySymbol) {
    list.sort((a, b) => a.filledTime.localeCompare(b.filledTime));

    const lots: Lot[] = [];
    let building: Building | null = null;

    for (const fill of list) {
      let signed = fill.side === 'Buy' ? fill.qty : -fill.qty;

      while (signed !== 0) {
        const opening = lots.length === 0 || lots[0].qty > 0 === signed > 0;

        if (opening) {
          if (!building) {
            building = {
              symbol,
              direction: signed > 0 ? 'LONG' : 'SHORT',
              openedAt: fill.filledTime,
              entryQty: 0,
              entryNotional: 0,
              entryLegs: 0,
              exitQty: 0,
              exitNotional: 0,
              exitLegs: 0,
              lastExitAt: null,
              pnl: 0,
            };
          }
          lots.push({ qty: signed, price: fill.price });
          building.entryQty += Math.abs(signed);
          building.entryNotional += Math.abs(signed) * fill.price;
          building.entryLegs += 1;
          signed = 0;
          continue;
        }

        // Closing against the oldest lot. `building` is non-null here: a lot
        // cannot exist without the trip that opened it.
        const lot = lots[0];
        const take = Math.min(Math.abs(lot.qty), Math.abs(signed));
        const open = building as Building;

        open.pnl += lot.qty > 0 ? (fill.price - lot.price) * take : (lot.price - fill.price) * take;
        open.exitQty += take;
        open.exitNotional += take * fill.price;
        // One sell fill can consume several lots; that is one leg, not three.
        if (open.lastExitAt !== fill.filledTime) {
          open.exitLegs += 1;
          open.lastExitAt = fill.filledTime;
        }

        lot.qty += lot.qty > 0 ? -take : take;
        signed += signed < 0 ? take : -take;
        if (lot.qty === 0) lots.shift();

        if (lots.length === 0) {
          trips.push(finish(open, fill.filledTime));
          building = null;
        }
      }
    }

    if (building) trips.push(finish(building, null));
  }

  trips.sort((a, b) => a.openedAt.localeCompare(b.openedAt) || a.symbol.localeCompare(b.symbol));
  return trips;
}
