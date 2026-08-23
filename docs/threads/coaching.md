# Thread: Coaching

**Owns the trader's own execution.** Daily fills, adherence to the playbook, and
the gap between the system as written and the system as traded.

Opened 2026-08-23. Nothing built yet.

## Scope

- Daily ingest of fills
- Measuring execution against the playbook's own rules
- Surfacing patterns: by time of day, price, float, setup type, day of week
- Bucket 1 of the archive — which qualifying names were actually traded

## Not this thread

- Market structure, catalysts, the archive itself — [research.md](research.md)
- Anything that ships to the server — [ops.md](ops.md)

## The boundary, and it matters

This thread measures **adherence to the trader's own written rules** and reports
what the record shows. It does not recommend trades, size positions, set targets
or give financial advice. The value here is that the playbook is written down and
the fills are recorded, so divergence between them is measurable — almost nobody
has both halves. Keep the work on that line.

The trader is working toward consistent profitability and has said so. Report
findings plainly, including unwelcome ones. Do not soften a result, and do not
editorialise about it either.

## Why this is tractable

Most of the failure modes in the playbook's own section 9 leave a **signature in
the fills**. They do not need to be self-reported:

| Failure mode | Signature |
| --- | --- |
| Moving stops | realised loss per share above the stated $0.15-$0.25 maximum |
| Revenge trading | short gap after a loss, with size going *up* |
| Three strikes ignored | a 4th or later trade after three reds |
| Overtrading | trade count against the trader's own baseline; trades after 11:00 |
| FOMO entry | entry price against how far the move had already extended — needs the archive |
| Size drift | position size against the risk the setup justified |

Two findings are usually available before any market research pays off, and are
worth checking first: **whether the losers are bigger than the rule allows**, and
**whether money made before 10:00 is given back after 11:00**.

## What the archive adds

With [../DATA-ARCHIVE.md](../DATA-ARCHIVE.md) tier C in place, the harder
question opens up: were the trades taken the *best* qualifying setups that day,
or the ones that happened to be on screen? That is bucket 2, the
missed-opportunity set, and no journal can answer it — it is about names that
were never seen.

## Handling

**Fills never go in the repo.** They are personal financial records and get the
same treatment as credentials: the database or a gitignored directory alongside,
never in git. Easy to get wrong once and permanent when you do.

## The trader's actual rules

The playbook is `A:\extract_daytrade\Manual\DAY_TRADING_INSTRUCTION_BOOKLET.md`.
Read it before measuring anything. Where the trader's live practice differs from
the booklet, the live practice governs:

- **Hold time is seconds, at most 1-2 minutes.** Not a swing or a day hold.
- **Risk $0.15-$0.25 per share.**
- **Price $1-$20, RVOL 2-5+**, small caps. The booklet says $2-$20 and 5x.
- **Entry: micro pullback on increasing volume**, plus flat top, ABCD and VWAP
  reclaim.
- **Absorption is a gate, not a trigger** — do not enter while a large presence
  sits unconsumed on the tape.
- **Exit on weakness**: volume weakening on 10-second candles, price reversing,
  or simple satisfaction with the gain. The last is discretionary and cannot be
  reconstructed — measure the excursion available and let the trader judge the
  exit rather than pretending to model it.
- **07:00-10:00 ET is where the profit is**; after 11:00 is to be avoided.
  Exceptions: dip trades, and RTH when there is a strong mover.

## Opening message for a new chat

> This is the **Coaching thread** for the trading desk at `A:\mointel`. Read
> `docs/threads/coaching.md` and `docs/threads/README.md` first, then
> `A:\extract_daytrade\Manual\DAY_TRADING_INSTRUCTION_BOOKLET.md` — that is the
> system being measured against.
>
> You own daily fills and execution analysis. You measure adherence to my own
> written rules and report what the record shows. You do not recommend trades,
> size positions, or give financial advice. Report findings plainly, including
> unwelcome ones.
>
> Fills are personal financial records: they go in the database or a gitignored
> directory, never in the repo.
>
> Nothing is built yet. Start by telling me what the fill export needs to
> contain for the adherence checks in the charter to work, and what you can
> measure on day one before the market archive exists.
