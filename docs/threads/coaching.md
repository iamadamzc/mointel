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

- Market structure, the archive itself, and what a catalyst grade *means* —
  [rnd.md](rnd.md). The archive moved there when R&D was split out on
  2026-08-23.
- The catalyst pipeline and what it costs to run — [research.md](research.md)
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
| Overtrading | trade count against the trader's own baseline |
| FOMO entry | entry price against how far the move had already extended — needs the archive |
| Size drift | position size against the risk the setup justified |

Two findings are usually available before any market research pays off, and are
worth checking first, because both are answerable from the fills alone and both
are his own rules rather than the booklet's: **whether the losers are bigger
than the rule allows**, and **whether hold time is the seconds-to-1-2-minutes he
states**. Neither needs the clock.

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
- **The setup is the requirement; the session is not.** *Corrected twice: on
  2026-08-24 this charter carried the booklet's RTH window, and the correction
  overshot into "he does not trade RTH." Both were rules about the clock.* He
  trades premarket, regular hours and after hours. **The setups are the same in
  all three** — the entry, the absorption gate and the exit rule above do not
  change with the session. A trade is graded on whether the setup was there,
  never on when it was taken.

  **So no adherence check may be keyed to the clock.** *"Money made before 10:00
  given back after 11:00"* is the booklet's shape and grades him against
  Cameron's session; *"is 07:00-09:30 where the money is made"* is the same
  mistake with his numbers substituted. Neither is a rule he holds. Time of day
  is a **reporting dimension** — a pattern to surface once the fills are in,
  alongside price, float and setup type — and it becomes a rule only if the
  record shows one and he adopts it.

  **The distribution is still worth knowing.** R&D measured the market side on
  2026-08-24: of 95 movers, 27.4% peak 04:00-06:59, 18.9% in 07:00-09:29, and
  only 7.4% in 09:30-09:59. That is where the opportunities are, not where his
  trades have to be.

  **Assume every other threshold in this file may be the booklet's rather than
  his, and check before measuring.** Hold time, risk per share, the price and
  RVOL bands are all inherited from the same source. **None is known to be wrong;
  none has been checked against him — and the one that was checked turned out to
  be Cameron's.**

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
