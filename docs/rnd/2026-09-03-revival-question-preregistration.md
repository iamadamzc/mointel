# The revival question — pre-registration, before looking

**Commissioned by the trader, 2026-09-03:** once a name goes dead intraday, does
it come back?

**His definition, in his numbers, not reinterpreted:** a name doing **~5,000
shares on a 10-second candle** dropping below **~500** — a 10x collapse — and
whether it returns to **~5,000**. His instinct is that he has rarely seen it and
that once something dies it is usually dead, **stated by him as an instinct and
explicitly offered for investigation rather than confirmation.**

**No result is in this document.**

---

## The constraint that decides everything: he is the instrument, and so am I

**His evidence cannot distinguish *does not happen* from *I was not watching*.**
Once a name dies he stops looking at it, so **revivals are systematically
invisible to him.** Absence of detection, not detection of absence.

**The same trap is available to me one level down, and it is worse because it
looks like data.** Which is the whole of the grain problem below.

---

## Grain: minute bars CANNOT answer the question as asked

**His observation is at 10-second grain and it matches his own exit rule.** The
desk's stored history is minute bars.

**A minute smears exactly the transition he is describing.** At 10s grain, 5,000
shares is 30,000/minute and 500 is 3,000/minute — so a collapse that *persists a
full minute* is visible. **A death-and-revival lasting less than a minute
aggregates back to ordinary volume and is invisible.**

> **Brief revivals are precisely the exception we were told to hunt, and minute
> grain destroys exactly those. A minute-grain study is biased toward finding
> "once dead, stays dead" — which is his prior.**

**A measurement that can only agree with him is worth nothing to him.** So
minute grain fails the commission's first constraint **by construction**, not by
bad luck.

### But the bias has a direction, and that makes one study worth running

**Minute grain can REFUTE and cannot CONFIRM.** It undercounts revivals, so:

| observed at minute grain | what it licenses |
| --- | --- |
| revivals **common** | **His prior is refuted, decisively.** A floor that high cannot be an artifact of smearing. |
| revivals **rare** | **Nothing.** Indistinguishable from the grain hiding them. Reported as uninformative, not as agreement. |

**That asymmetry is the only reason to run the cheap version**, and it is
pre-registered here so a rare result cannot later be written up as support.

---

## Retention: checked before promising a window

    MARKET_MINUTE_BAR_RETENTION_DAYS   default 3
    lib/market/store/db.ts             "3-day live-state retention"
    local minute_bars                  2 dates, 08-17..08-18

**The desk keeps roughly three trading days of minute bars.** But the honest
answer is better than *forward only*, and I would not have him told otherwise:

- **Minute bars are RE-FETCHABLE from the vendor for past dates.** The archive
  backfill already did exactly this over 13 sessions. **The desk's pruning is
  not a loss of history; it is a loss of local copies.**
- **10-second bars are NOT available from the bars endpoint at any date.**
  Alpaca's `/v2/stocks/bars` smallest timeframe is one minute. His grain needs
  `/v2/stocks/trades` aggregated by hand, and **`lib/market/alpaca/rest.ts`
  implements no trades method** — that is a build, not a query.
- **Whether the trades endpoint has usable depth is UNVERIFIED.** If it is
  shallow, the 10s question genuinely becomes forward-only and observable-once,
  and every day without capture is lost. **If it is deep, nothing is lost and
  this is a build with no clock.** *That single check should happen before
  anyone schedules capture, and it is Ops's or Research's to run against the
  vendor.*

---

## Definitions, fixed now

| term | definition |
| --- | --- |
| **Bar** | One minute of consolidated volume for one symbol, RTH and premarket, from raw bars. |
| **Active** | A bar at or above **30,000 shares/minute** — his 5,000/10s, scaled. |
| **Dead** | A bar below **3,000 shares/minute** — his <500/10s — **following an Active bar within the same session.** |
| **Revived** | A later bar in the same session at or above **30,000/minute**, after at least one Dead bar. |
| **Death episode** | The unit of analysis: one Active→Dead transition. A symbol-day may contribute several. |
| **Revival rate** | Episodes revived / episodes, per symbol-day and pooled. |

**Sensitivity is part of the design, not an afterthought.** The 10x ratio is his
and is kept; **the absolute level is scaled from his numbers and is the arbitrary
part**, so the whole thing is re-run at **half and double** the Active threshold
and all three are reported. **If the answer moves with the threshold, the answer
is about the threshold.**

## Decision rule, fixed now

| | |
| --- | --- |
| **Refutes his prior** | Pooled revival rate **≥ 25%** of death episodes, holding across all three thresholds. |
| **Uninformative** | Anything below that. **Reported as *the instrument cannot see it*, never as agreement**, because the grain guarantees an undercount. |
| **Reported regardless** | Episode count, symbol-days contributing, the per-threshold spread, and **the time-to-revival distribution** — because *how long dead before it comes back* is the part that would change what he does, and a rate alone would not. |

**Pre-registered expectation: I do not have one, and that is deliberate.** For Q6
I predicted a null and was wrong, which is the only reason that result carries
weight. **Here the honest position is that his instinct is plausible, my
instrument is biased toward it, and I therefore cannot form an expectation that
is worth writing down.**

---

## What this is not

**It does not measure tradability**, and a revived name is not an enterable one.
His exits run on volume weakening at 10-second grain; **nothing at minute grain
speaks to an entry or an exit**, and this thread has refused that inference
before.

**Priority: below the scorecard and Q1**, per the commission. **The one thing
that should not wait is the trades-endpoint depth check**, because that is what
decides whether his real question has a clock on it.
