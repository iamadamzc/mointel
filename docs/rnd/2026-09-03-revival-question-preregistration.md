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

## Amendment 1 — the population, which the original omitted

**Caught before running, not after.** The definitions above fix *active*, *dead*,
*revived* and the episode unit, and **say nothing about which symbols are in
scope.** That is a denominator, and this thread has spent two days on the cost of
an unfixed one.

| | |
| --- | --- |
| **Primary population** | **Board symbol-days** — symbols present in `symbol_desk_day` for that date. **This is what he is watching when he sees a name die**, and a revival on a name that was never on his screen is not the phenomenon he described. |
| **Secondary, reported for context** | The full tracked universe on the same dates, stated separately and **never pooled with the primary.** |

**Fixed now because the two populations will not agree**, and choosing between
them afterwards would be picking the number. **If they disagree materially that
is itself reportable** — it would mean the board selects for names whose deaths
behave differently, which is a finding about the board rather than about
revival.

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


## Amendment 2 — the retention disagreement, settled by probe

**Research and I contradicted each other on a load-bearing fact.** I said minute
bars are re-fetchable for past dates; Research (item 38, `0b8417a`) said stored
trade counts exist for roughly three days and **"nothing further back at any
price."** Integration held the design and offered a reconciling hypothesis: that
my 13-session backfill had been **daily** bars, which would make re-fetchability
irrelevant to minute-level trade counts.

**Settled by reading one line and running one call rather than waiting.**

**The hypothesis is wrong.** `worker/archive-backfill.ts` fetches
`timeframe: '1Min'` — minute bars, explicitly.

**And the vendor returns trade counts on historical minute bars.** A probe for
`AAPL`, **2026-08-25 — nine days back, well outside the three-day retention**:

    {"t":"2026-08-25T14:00:00Z","o":310.46,"h":310.56,"l":309.65,
     "c":309.685,"v":192975,"n":3808,"vw":310.141083}

    6 of 6 bars carried a trade count.

> **Both of us were right about different objects. Research's "nothing further
> back at any price" is true of the local STORE and false of the VENDOR.** The
> desk prunes `minute_bars.trade_count` to three days; Alpaca still has it, and
> `AlpacaDailyBar` already declares `n`.

**WHAT THIS UNBLOCKS, and it is more than a window.** Research established that
**minute trade count is parsed on every bar, persisted, read back, and scored on
by nothing.** It is the measure the viscosity programme *confirmed*, and it is a
better answer to *is this name alive right now* than volume alone — volume is one
block print away from lying, and a trade count is not.

**So the revival question can be re-asked at minute grain on trade count, over
the full 13 sessions, with no capture clock.** That is a better instrument than
the volume threshold the pilot used, on a longer window, at no cost.

**What it does NOT resolve: his 10-second grain.** The bars endpoint still has a
one-minute floor and the trades endpoint is still unimplemented and unprobed.
**That probe remains the only item here with a possible clock on it.**

**Method note, because it is the point.** I inferred from a type declaration that
`n` was available and then **did not stop there** — a declared optional field is
not proof the vendor populates it, and inferring capability from a type is the
exact error this thread has made repeatedly this week. **One call settled what
two threads had been asserting at each other.**

## Amendment 3 — trade-count thresholds, fixed before the re-run

**The trades probe came back deep** — BTCT returns trades to its 2020 listing —
so **nothing on this question is observable-once, no capture decision is
needed, and the 10s version is a build with no clock.** It queues behind the
scorecard and Q1 like anything else.

**And the minute-grain window is not gated.** My probe settled that: historical
minute bars nine days back returned `n` on 6 of 6 bars. **The re-run can go now,
on trade count, over 13 sessions.**

### A surprise I checked instead of publishing

An early scratch pass suggested volume and trade count were **inverted** —
30,000-share bars showing fewer trades than 3,000-share bars. **That would have
been a striking finding and it was a bug in my own script**: I sorted the
trade-count list in place for quantiles and then zipped it against the unsorted
volume list, destroying the correspondence.

**Measured correctly, Spearman(volume, trade_count) = +0.921** on 25,466 board
minute bars, and shares-per-trade rises monotonically with volume — 72 at the
bottom band to 145 at the top. **No block-print distortion at these levels.**

    volume band        n     median trades   median shares/trade
    1-999           7,234          5                  72
    3,000-14,999    6,179         54                 121
    30,000-59,999   1,819        293                 147
    60,000+         3,635      1,010                 145

**So switching to trade count is principled but should NOT be expected to move
the pilot's numbers**, and saying so now is what stops an unchanged result being
presented as confirmation by a second instrument. **At rho +0.92 the two
measures largely agree; trade count is preferred because it cannot be moved by a
single print, not because it disagrees.**

### Thresholds and persistence, fixed now

**Calibrated from the predictor's own distribution, before any revival outcome
was computed on it.** Bars near his 30,000 shares/min carry a median of **293
trades/min**, so:

| | |
| --- | --- |
| **Active** | **300 trades/min**, with sensitivity at **150** and **600** |
| **Dead** | Active ÷ 10 — **30, 15, 60** — his ratio, kept |
| **Persistence** | **5 consecutive dead minutes**, pre-registered this time rather than explored |
| **Population** | Board symbol-days, per Amendment 1 |
| **Window** | All 13 sessions, re-fetched |

**Persistence is fixed at 5 minutes because the pilot showed it is the variable
that matters, and leaving it free would let me pick it afterwards.** Five is the
low end of the pilot's 5-10 minute crossover — **deliberately the value least
favourable to his prior**, so that a result agreeing with him cannot be an
artifact of a threshold I chose to agree with him.

**Decision rule unchanged: revival ≥25% across all three thresholds refutes.**
The full persistence curve is reported beside it as exploratory, as before.

---

# RESULT — pilot on 2 sessions, 2026-09-03

**This is a PILOT on 08-17 and 08-18 only** — the two dates of minute bars the
desk still holds locally. **Not the 13-session window.** The full window needs a
vendor re-fetch, which is cheap and has not been run. **Every figure below is
n=2 sessions and must be quoted that way.**

## The pre-registered verdict: HIS PRIOR IS REFUTED ON HIS STATED DEFINITION

    population         threshold        episodes   revived    rate
    board sym-days     active>=15,000        498       416    83.5%
    board sym-days     active>=30,000        385       307    79.7%
    board sym-days     active>=60,000        267       200    74.9%
    full universe      active>=30,000     16,554    12,701    76.7%

**The rule required ≥25% across all three thresholds. Observed 74.9–83.5%, about
three times the bar, and the secondary population agrees at 69.7–82.0%.**

**This is the direction minute grain is allowed to license.** The
pre-registration fixed that revivals-common **refutes decisively** because a
floor that high cannot be a smearing artifact. **79.7% is not an artifact.**

**Median 9 minutes dead before revival; p90 196 minutes.**

## But the definition does not capture what he means, and that is the real finding

**NTWO on 08-18 generated nineteen death episodes in one session**, oscillating
208k → 600 → 65k → 1,450 → 156k within minutes. **44% of its bars sit below the
dead line and 25% sit above the active line.** That is a bursty tape, not a name
that died.

**A single sub-threshold minute is not death.** The missing element is
**persistence**, and it is not in his stated numbers because he was describing
what he sees, not writing a filter.

**EXPLORATORY — not pre-registered, and not promoted to confirmatory.** Revival
rate as a function of how long a name must stay quiet before it counts as dead,
board symbol-days, active ≥30,000:

    quiet for    episodes   revived     rate    median dead-min before revival
      1 min           385       307    79.7%          9
      2 min           277       199    71.8%         11
      3 min           248       170    68.5%         11
      5 min           182       104    57.1%         46
     10 min           138        60    43.5%        135
     15 min           128        50    39.1%        226
     30 min           120        42    35.0%        277
     60 min           105        27    25.7%        283

> **He is right about real deaths and the stated threshold is not measuring
> them.** A name quiet for one minute comes back 80% of the time. **A name quiet
> for an hour comes back 26% of the time, and takes about five hours to do it.**

**The crossover sits around 5–10 minutes.** Below it revival is the norm; past
about 30 minutes death is the norm. **That also explains why he has rarely seen
a revival: he is watching for sustained death, and sustained deaths mostly stay
dead.** His instinct is calibrated to the phenomenon; his stated criterion
catches a much larger and more ordinary one.

## A defect found and fixed mid-run, which changed the durations and not the rate

**The first detector iterated over stored bars. Alpaca emits no bar for a minute
with no trades**, so true silence was invisible: NTWO showed `14:14 DEAD` then
`18:52 REVIVED` counted as **one dead minute** when it was 278. **88% of that
symbol-day's session minutes have no bar at all.**

**Rebuilt on a continuous minute grid with silence as zero volume.** The
durations changed enormously — p90 went from single digits to 196 minutes — and
**the revival rate barely moved, 78.0% to 79.7%.** Recorded because the rate
being robust to a serious bug is luck, not design, and **the durations would have
been published badly wrong.**

## What is still not answered

**His actual grain.** All of this is minute bars; a death-and-revival inside one
minute remains invisible, so **every rate here is a floor.** That strengthens the
refutation at 1-minute persistence and says nothing about the 60-minute end.

**The full window.** Two sessions. The 13-session re-fetch is cheap and unrun.

**And the persistence result is exploratory.** It is the number that would change
what he does, which is exactly why it must not be quoted as though it had been
pre-registered. **The honest next step is to pre-register a persistence
threshold and re-run on the full window.**


---

# RESULT 2 — full 13 sessions, trade count, 2026-09-03

**Supersedes the two-session volume pilot.** 939 board symbol-days, **zero with
no bars at all**, minute bars re-fetched from the vendor and persisted nowhere.
`npm run archive:revival`, detector in `lib/archive/revival.ts`, 10 tests.

## Pre-registered verdict: REFUTED, and by a much narrower margin

    measure   active>=   persist   episodes   revived     rate   median   p90
    trades         150         5      1,123       597    53.2%      51    278
    trades         300         5        913       437    47.9%      60    265
    trades         600         5        705       305    43.3%      66    257

**Rule required ≥25% across all three. Observed 43.3–53.2%.** Refuted — **but at
roughly half the pilot's 74.9–83.5%**, and the gap is not noise.

## My pre-registered expectation about the instrument was WRONG

I wrote, before running: *at rho +0.92 the two measures largely agree, so
switching to trade count should NOT be expected to move the pilot's numbers.*
**It moved them 14 points.** Isolated with a volume control on the same 13
sessions, so window and measure separate cleanly:

    volume, persist 5, active 30,000    pilot 2 sessions    57.1%
    volume, persist 5, active 30,000    full 13 sessions    62.1%     window  +5.0
    trades, persist 5, active 300       full 13 sessions    47.9%     measure -14.2

> **Rank correlation is not threshold agreement.** Two series can sit at
> Spearman +0.92 on levels and still disagree about *which minutes fall below a
> cut*, because a correlation is dominated by the bulk and a threshold is
> decided at the boundary. **I reasoned from the first to the second and it does
> not follow.**

**That vindicates trade count on substance rather than on principle.** The
instruments genuinely disagree by 14 points, and **the one that cannot be moved
by a single block print is the one to believe.**

## The exploratory curve, and where his instinct becomes right

**Not pre-registered.** Persistence at the middle threshold, 300 trades/min:

    quiet for    episodes   revived     rate    median dead-min before revival
      1 min         1,557     1,062    68.2%          22
      2 min         1,305       816    62.5%          27
      3 min         1,213       727    59.9%          25
      5 min           913       437    47.9%          60
     10 min           694       236    34.0%         100
     15 min           616       170    27.6%         116
     30 min           515        99    19.2%         167
     60 min           428        47    11.0%         236

**The curve crosses the refutation bar between 15 and 30 minutes.** Above that
his prior is not merely unrefuted — **it is supported: a name quiet for half an
hour comes back 19% of the time, and quiet for an hour, 11%.**

> **The answer to his question is a threshold, not a yes or a no.** Under about
> ten minutes of quiet, revival is the norm and he is looking at burstiness.
> **Past about thirty, death is the norm and he is right.**

**And the two-session pilot overstated revival throughout** — 79.7% against
68.2% at the same persistence-1 setting, and 57.1% against 47.9% at
persistence 5. **A 2-session pilot was not a small version of this; it was a
different answer**, which is the argument for running the full window rather
than trusting a cheap look.

## What still is not answered

**His 10-second grain.** Everything here is minute bars, so **every rate remains
a floor** — a death and revival inside one minute is still invisible. The trades
endpoint is deep enough to build it and carries **no clock**; it needs
`daily_bars.split_factor` to be comparable across a reverse split, and its page
cost lands entirely on the runner days this question is about.


---

## Amendment 4 — the trader found a definition gap, and it bounds every published rate

**His catch, and it is his not mine:** *what are we defining as "comeback" — if
they do not come back to +25%, they can stay off the board; being up 5% or 10%
is not enough validated momentum.*

**He is right and my definition has no price in it.** Revival was volume back to
30,000 shares/min, then trade count back to ~300/min. **Both are pure ACTIVITY.**
Nothing in the instrument separates a name reviving into a real move from one
reviving into a **flush** — and a flush is activity returning *while price
falls*, which my definition scores as a comeback.

> **So every rate published above is a CEILING on what he cares about, at the
> same time as being a FLOOR for grain reasons. The two bounds run in opposite
> directions and both must travel with the number.** 19% at thirty dead minutes
> is *activity* returning; **the tradeable subset is necessarily smaller.**

**This is the third bound on the same figure** — floor from minute grain, ceiling
from missing price, and the pilot-versus-full-window gap on top. **A rate with
three bounds is not a rate, it is a range**, and it should be read as one.

### Design, fixed before computing

**Revival becomes: activity back AND price at a validated-momentum level.** Same
data, no new fetch.

**The measurement basis is ambiguous and I am NOT resolving it by assumption.**
*Gap* loosely means percent change from prior close; *gap* strictly is fixed at
the open. **For a name reviving at 11:00 those diverge.** Rather than wait or
guess, **both are computed and reported side by side** — and the divergence is
itself the answer to which he meant:

| reading | definition |
| --- | --- |
| **(a) live** | percent change from `reference_close` **at the minute of revival** |
| **(b) gap** | `rth_open` against `reference_close`, **fixed at the open**, same for every revival that day |

**Threshold +25%**, his number, on both readings.

**Reported as three curves side by side, never folded together:** activity-only,
activity-plus-(a), activity-plus-(b). **The cost of the price condition must be
visible.** His prior almost certainly strengthens under it, **which is exactly
why the unconditional numbers stay on the page beside it** — a condition that
only ever moves a result toward the person who proposed it needs its effect
shown, not absorbed.

### The asymmetry, stated deliberately rather than discovered later

**The re-entry bar is HIGHER than the entry bar.** The pillars admit a name at
up 10%+; he proposes **25% for a returning name.**

**That is defensible — a name that already ran and died should have to prove
more — and it is still an asymmetry**, so it is recorded here as a deliberate
choice rather than left to be found in the code by someone assuming one
criterion governs both. **Anything built on this inherits two different bars and
should say so on its face.**


---

# RESULT 3 — with his price condition. His instinct is right.

**939 board symbol-days, same data, no new fetch. Three curves side by side as
pre-registered, never folded.**

    quiet for    activity only    + live +25%     + open gap +25%
      1 min       68.2% (1557)     28.4% (442)      19.1% (298)
      5 min       47.9% ( 913)     14.6% (133)       7.9% ( 72)
     10 min       34.0% ( 694)      8.4% ( 58)       3.3% ( 23)
     15 min       27.6% ( 616)      6.8% ( 42)       2.8% ( 17)
     30 min       19.2% ( 515)      5.2% ( 27)       1.4% (  7)
     60 min       11.0% ( 428)      3.7% ( 16)       0.7% (  3)

## The verdict inverts, and the earlier one was answering a different question

**Under his own definition, revival is rare at every level.** At the
pre-registered persistence of five minutes: **14.6% on the live reading, 7.9% on
the gap reading.** At thirty minutes: **5.2% and 1.4%.** At an hour: **3.7% and
0.7%.**

> **He was right, and my activity-only instrument was measuring something he
> never asked about.** *Comeback* to him means back to a tradeable level. Back to
> being busy is not the same event, and the gap between 68.2% and 19.1% at one
> minute of quiet is how much not-the-same it is.

**Per the pre-registered rule this is UNINFORMATIVE rather than agreement** —
below 25%, and minute grain still undercounts, so I will not claim it as
confirmation. **But one thing here is NOT subject to the grain caveat**, and it
is the number worth carrying:

> **The ratio between the price-conditional and activity-only curves is robust
> to undercounting, because both are undercounted the same way.** Of names whose
> activity returns, **only 28% / 19% are back at +25% after a minute of quiet,
> and 5% / 1% after thirty.** That is a measured proportion, not a rate against
> an unknown denominator.

## The two readings diverge, and the divergence is informative

**Live is more permissive than gap at every level** — 28.4% against 19.1% at one
minute — because a name can climb to +25% intraday without having opened there.
**The gap reading asks a materially different question**: it conditions on the
whole day, so a name reviving at 11:00 that gapped only 10% fails it even while
trading up 30%.

**Both are on the page and neither is assumed.** Which one he means is his to
say, and **the 9-point spread at one minute is the cost of the ambiguity** —
worth knowing before anyone builds on either.

## What this does to the earlier verdicts

**Result 2 stands as measured and its meaning narrows.** Its curve is the
activity-only column above, correct for what it measured and **a ceiling on what
he cares about** — which is what Amendment 4 said before this ran.

**Q10's verdict needs re-reading, not retracting.** *Revival is a threshold, not
a rule* holds; **what changed is where the threshold sits.** On activity it was
around thirty minutes. **On his definition there is no persistence level at
which a comeback is likely** — the curve starts low and falls.

**The instrument was never wrong. The question it answered was.** Three bounds
were already recorded on those numbers; **the trader supplied the fourth, and it
is the one that mattered most.**


---

# Amendment 5 — the session question, and the pooled curve should not be used

**Asked by the trader through Integration: is this all premarket?** It is not,
and answering it exposed two defects in every pooled number above.

## (1) The window, stated plainly

**04:00–20:00 ET, all three phases pooled.** `worker/revival.ts` starts each
grid at 08:00 UTC and runs 960 minutes. **Premarket, RTH and after-hours in one
series.** No phase was ever excluded and none was ever reported separately —
**the window was never stated in anything I sent, which is the omission that
allowed the question to be necessary.**

Episodes **do not** cross trading dates: each symbol-day is its own grid and an
unrevived death at 20:00 is recorded as unrevived.

## (2) Episodes DO span the open, and Integration was right that it matters

**At persistence 30, 104 of 515 episodes straddle 09:30.** A death confirmed at
09:15 and revived at 09:31 is **the open reasserting itself, not a name coming
back** — and a 30-minute persistence window laid across the bell is measuring
the bell.

## (3) The phase spread is enormous, and the pooled curve describes no session

    persist   premarket        RTH        after-hours
      1 min    74.4% (367)   82.8% (877)   20.1% (313)
      5 min    62.3% (244)   65.6% (395)    9.5% (274)
     15 min    49.1% (167)   37.3% (193)    6.3% (256)
     30 min    42.5% (127)   24.8% (137)    4.4% (251)

> **At five minutes: premarket 62.3%, RTH 65.6%, after-hours 9.5%. The pooled
> figure was 47.9%, which is no session's answer.** And after-hours supplies
> **251 of 515 episodes at persistence 30** — nearly half the count, at a rate
> an order of magnitude below the others.

**A board rule calibrated on the pooled curve would be calibrated on a blend
that describes nothing.** Integration's phrase, and it is exactly right.

## (4) Right-censoring, measured — real but the smaller effect

**A death starting late has less session left to revive in**, and unrevived is
recorded as a failure regardless.

    persist 5     >=0 min left  47.9%    >=240 min left  59.4%
    persist 30    >=0 min left  19.2%    >=240 min left  27.1%

**Requiring four hours of remaining session lifts the rate 11.5 and 7.9
points.** So censoring inflated the *stays-dead* reading, but **the phase spread
is several times larger.**

**And the two cannot be fully separated here.** The ≥240-minute filter excludes
after-hours almost entirely, so *late* and *after-hours* are nearly the same set
in this design. **After-hours is low for both reasons and this instrument cannot
apportion them.** Stated rather than resolved.

## What this does to everything above

**Every pooled figure in Results 1, 2 and 3 is a blend of three regimes and
should not be quoted alone** — including the price-conditional curves, which
were pooled the same way.

**Nothing is retracted as measured.** The numbers are what they are for the
window stated; **what changes is that the window was not stated, and pooled was
the wrong unit.** The instrument needs a phase argument and the open needs a
boundary, and neither is a re-fetch — the grids carry the index.

**Not re-run pending his answer**, because it turns on a distinction only he can
draw: whether he means **the board's universe is premarket-selected gappers** (a
claim about which names qualify) or **premarket is the only window he cares
about** (a claim about when he trades, which would supersede the recorded
finding at `0595b2c` that *the setup is the requirement and the session is
not*). **Different instruments, and assuming would be the error this whole
document exists to avoid.**


---

# RESULT 4 — premarket only, his scope. 2026-09-03

**His decision: *let's keep everything to premarket.*** Re-scoped to
**04:00–09:29 ET**, and **no episode can straddle the open** — the grid ends at
09:29, so the defect Integration identified is structurally impossible rather
than filtered out.

**782 symbol-days of 939.** The 157 that drop out have no premarket bars at all,
which is a denominator change worth stating rather than absorbing.

    quiet for    activity only        + live +25%
      1 min       46.6% (367 eps)     13.6% (50)
      5 min       32.8% (244 eps)      7.0% (17)
     10 min       27.5% (189 eps)      4.8% ( 9)
     15 min       21.0% (167 eps)      3.6% ( 6)
     30 min       18.4% (125 eps)      3.2% ( 4)

> **Under his scope and his definition: 7.0% at five minutes of quiet, 3.2% at
> thirty.** His instinct holds, and it holds more cleanly than in any earlier
> cut because the open is no longer in the measurement.

**The counts get thin fast and that must travel with them — four revivals at
persistence 30.** A rate on four events is a direction, not a number, and it
should not be quoted to three significant figures by anyone including me.

**The pooled figures above are OUT OF WINDOW, not wrong.** Marked, not deleted,
per the stamp discipline: *checked-and-true*, *checked-and-unknowable* and
*never-checked* are three states, and **out-of-scope is a fourth** — the
measurement was sound for a window the desk has since narrowed.

## Which other verdicts the scope reaches — my read, asked for by Integration

**Unaffected. No outcome variable in them; they measure the pipeline, not the
tape.**

- **S2** time to intelligence — timestamps only
- **S4** coverage honesty — classifications only
- **S5** grade freshness — analysis version ages only

**Out of window, and CHEAP to re-run — `premarket_high` is already stored on 715
of 939 rows, so no re-fetch.** All four use a full-session outcome:

- **S1** board timeliness — `time_of_max_gain` over 04:00–20:00
- **S3** catalyst separation — `max_gain_pct` decides mover status
- **Q1** — same mover definition
- **Q5** `BOARD_IS_LATE_TO_THE_MOVE` — same

**The mover population itself changes: 122 premarket movers against 195
full-session.** So these are not re-runs of the same cross-section with a
different lens; **they are a different cross-section**, and the results may move
for that reason alone.

## Q6 is the one that does not merely go out of window

**Q6 scored the 09:25 pre-open assessment against RTH excursion.** Under a
premarket scope **there is no forward window left to score it against** — the
assessment fires five minutes before the open, and everything after it is out of
scope.

> **Q6 cannot be re-run in premarket. Its predictor sits on the boundary and
> everything it predicts into has been scoped out.**

**Its verdict stands as measured and describes a window the desk no longer
prioritises.** And it raises a product question that is not mine to answer:
**an instrument that fires at 09:25 and predicts into RTH is, under this scope,
an instrument aimed outside it.** Flagged for whoever owns that assessment.
