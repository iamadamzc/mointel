# Thread: Design & Frontend

**Model, and why it is recorded here.** Added 2026-09-04 so the choice is
explicit rather than drifting. **The honest state of the evidence: there is
none yet supporting differentiation.** Every thread on 2026-09-04 caught a
subtle defect in its own work that a weaker model plausibly misses, and the
capacity actually burned that night was message VOLUME, not model strength.
**A downgrade recorded as a saving without a measurement would be this desk's
"constant dressed as a measurement".** What would settle it: run a thread's
next self-contained task at a smaller model and compare what it catches.

**Model: Opus 5.** On 2026-09-04 it found its own new test was vacuous, because a fixture accepted a key it does not have and the assertion could not fail; and it refused to call a string absent when the component rendering it never mounted.

**Owns the trader-facing surface.** The audit remediation plan, the Discovery
board, the watchlist, the dossier drawer, and the visual system.

Last worked: **2026-09-03**.

## The design authority

[`../Design/design-audit-report.md`](../Design/design-audit-report.md) — a full
UI/UX audit of the live desk. Its findings, its §9 prioritized plan and its §10
acceptance criteria are the specification. Read it completely before changing
anything.

The brief that produced it is [`../Design/designaudit.md`](../Design/designaudit.md).

Both were committed on 2026-08-23 in `c8f95a3`, and the stray duplicate of the
brief at `docs/designaudit.md` was removed. `docs/Design/` is the canonical home
for design documents.

## Scope

- §9 items 12–26 (Phase 2 structural, Phase 3 enhancements)
- Component work in `components/` and `app/`
- The visual system in §8: colour precedence, type scale, contrast, density
- Meeting §10's acceptance criteria — measured at the **1,280 px baseline** and
  re-checked at the **1,024 px floor**. *(This line read "1,022 × 551 CSS px, the
  viewport actually used" until 2026-08-23. That viewport was accidental, not
  chosen, and §11 item 4 retired it — see the breakpoint table below.)*

## Not this thread

- Deploying → [ops.md](ops.md). Produce commits; Ops puts them on the server.
- What the dossier *says* — grades, evidence, interpreter output → [research.md](research.md)

## Live state — 2026-09-25 20:13 UTC / 16:13 ET

**LIVE ON THE DESK, VERIFIED BY THIS SEAT ON THE BOARD:**

    49efd1a   the sort accent            cutover 11:49:43 ET
    0a17601   the FRESH prior-close      cutover 12:17:07 ET, verified 12:18

*The boundary's effect was read at 12:18 ET after a reload:* `catalystFreshFrom`
**absent at 12:05, `'2026-09-24T20:00:00.000Z'` at 12:18**; `INLF` amber `16h`
→ **green** `19h`; `MGLD` amber and unmoved three hours eighteen the wrong side
of the same close; `LFS`/`KITT` green and unmoved; **one row changed, zero
demotions.** *That is the full section above under "What he ruled" — do not
re-derive it.*

**COMMITTED, GATED, AND PARKED ON HIS WORD — NEITHER IS LIVE:**

    design/now-header-gated  363f40d   `Now` -> `TRADES`, gated at the sha
    (untagged)               36bbddd   the Monday `3d`-in-green fix

**ONE DECISION OWED BY HIM, THREE PARTS, AND IT SHIPS AS ONE CHANGE** because
all three land in the same cells:

1. **The column tooltips.** His direction, and his own limiter is *"if it makes
   sense"* — which excludes a tooltip restating its header (`Price` /
   *"Last price"*). The mechanism exists; the content is uneven. **`Gap`'s
   empty static `title` is NOT a hole** — it carries `resolve: baselineLabel`,
   which supplies a phase-resolved title, so filling it would change nothing
   while looking like a fix.
2. **Does `Now` → `TRADES` still earn its place** once a tooltip carries the
   depth? A tooltip answers *what is this column*; it does not answer *why does
   this head name a TIME where every other names a QUANTITY*. **His tooltip
   message does not mention the rename and must not be read as approving it.**
3. **Does `since Thu close` replace the age on WITHIN-DAY promoted rows**, or
   only where it misleads by days? **That question exists because the
   generalisation is MINE, not his** — see the verbatim section above.

*`36bbddd` has until Monday premarket, which is the first session where a
promoted row can read `3d` in green.*

**VERIFICATION ACCESS IS SOLVED. This was the biggest standing limit on the
seat and it is gone.**

    scripts\aws-create-review.ps1 -ServerHost mointel-ssm -Hours 6 -Label design

*That line held a literal **BEL byte** where its backslash belongs until
2026-09-25 — `scripts` + `0x07` + `ws-...`, i.e. `\a` interpreted once on the
way in. It renders as `scriptsws-create-review.ps1` in every reader and as a
correct-looking path in none. **Three repair attempts failed and reported
success**: `perl -0pi -e s/\x07/.../`, and two Python text-mode writes whose
re-read returned the ORIGINAL length. Only a byte-mode read/replace/write took.
A path is the worst place for this — the damage is invisible, because a mangled
filename still looks like a filename.*

*SSH on port 22 times out from this host — his egress IP moved off the
allowlist and nobody retired SSH — but Session Manager goes straight through.*
**The URL prints ONCE. Capture it or the token is orphaned** (I lost one that
way; revoke with `-Action revoke -Id N`). Read-only, time-limited, and the only
way this seat sees production: the desk is otherwise behind one shared password
it must never type.

**READ A REVIEW LINK BY CONTENT, NEVER BY STATUS.** A dead or expired token
answers **HTTP 200** with ~11 KB. The live desk is ~1.1 MB with `RVOL` present.

## What is verified ON THE LIVE BOARD

*Nothing below is inferred from tests.* Sessions of 2026-09-22 and 2026-09-25.

- **The cycle badge's three renders** (`a9df280`) — `NO RUN`, `OFF HIGH $1.50 →
  $1.46`, `DAY 1 $6.41 → $4.82`.
- **The cross-table cycle contradiction is CLOSED** (`72b8c1b`), and it took
  premarket to close: 2026-09-25 07:36 ET, five tickers on both tables, **five
  agreeing, zero disagreeing**, pair included. *The after-hours attempt found
  zero shared tickers, and a no-overlap "no disagreements" is a check that
  cannot fail — it was recorded as partially verified for three days rather
  than counted.*
- **The float verdict** — `FLOAT 5,680,000 CONSISTENT · under 8.14M shares
  outstanding filed 2026-08-11` on TOMZ, independently corroborated: the desk's
  filed count equals the `8.14M provider SO` the vendor wrote in its own cell.
  **It speaks on 3 of 9 researched rows; the other 6 say CANNOT VERIFY for want
  of a filed count.** An SEC collection gap, not a render fault.
- **The DCOY fix with its silent control** (`42c9a73`) — ten qualified rows
  moved to `OFF HIGH <today's high>`, and TBPH, `NO_CYCLE` with
  `todayStart: NOT_QUALIFIED`, still reads `NO RUN`.
- **The change sentence** (`new HOD`, not `NEW_HOD`), the persistent events
  band, the sort-following headline, the `Now` column and its sort.

## What the live board showed that no test could

- **DCOY: rank 1 at 3,105× RVOL, trading 4 times a minute**, while rank 3 ran
  at 346. The whole argument for the `Now` column, on one row.
- **The market payload is 802 KB and 1.29 s per poll.** F-10 targets under
  15 KB. It is also why the board reads "Waiting for the first market payload"
  for seconds on load — which I briefly mistook for a defect and measured
  before saying so.
- **The TODAY float cell refuses 7 of 9 live rows** — `provider SO`,
  `filing SO`, `pro forma SO`, `post-split SO` are unrecognised tails and
  refuse the whole cell, float included. The desk recovers via the RESEARCH
  tab, so nothing is lost today. **That is luck, not design**, and the parser
  is Research's.
- **A page loaded BEFORE a deploy keeps its old bundle.** I read DCOY as still
  broken three minutes after the fix shipped and reported it. *"Verify after
  the deploy" means RELOAD, not look.*

## The payload fields this seat is waiting on

**The shape: ask the producer for the ANSWER, and let the reader sit on safe
behaviour until it arrives.** `qualified.observed` proved the pattern works, and
**`catalystFreshFrom` is the second proof — declared here, built by Research at
`7a0ad0c`, consumed at `bd509e9` with no renegotiation.** One remains.

1. ~~**`MarketSnapshot.catalystFreshFrom`**~~ — **ARRIVED `7a0ad0c`, WIRED
   `bd509e9`.** It goes on the ROW, via `DeskRowContext`, not through
   `resolveWhy` as a fourth argument: `resolveWhy` has four callers and this is
   the reading that has already produced a colour disagreeing with the words
   beside it twice, so the instant arrives WITH the row and no caller can
   forget it. Read off `market`, **not** off `market.discovery`, which is where
   `sessionPhase` and `tradingDate` beside it in the same context object come
   from. Null still means the day bands, and that is a rule rather than a
   fallback.
2. **`MarketSnapshot.lastCheckpointChanges`** — §9 item 12's rail. Per-ticker
   `changedFields` + `changeSummary` + the checkpoint's `completedAt`.
   **`AssessmentSummary.notes` is NOT a substitute**: it is `commentary()`'s
   lines joined into one string, truncated at 2,000 characters, and
   `commentary` drops every row whose summary is empty — exactly the set
   `f303e14` exists to word. **Rows with an empty summary must be INCLUDED;
   empty array ≠ absent.**


## What he ruled, verbatim

**HIS WORDS, NOT A SUMMARY OF THEM.** *This thread has written a false "he
ruled it" into the repo before — the premarket-frame claim appeared four times
before it was true — and a ruling attributed to him that he never made cannot
be refuted by anything in the tree.*

**2026-09-25, on the Monday `3d`-in-green pairing:**

> *"1, agreed wit option a."*

**That is the whole of it: seven words selecting a labelled option by
reference.** So the binding content is the OPTION TEXT he selected, and it is
recorded here beside his words rather than left in a transcript:

> **(a) replace the age with the reason on a promoted row — `since Fri close`
> instead of `3d`.**

Item `1` was the only item in that block. Implemented at `36bbddd`.

**ONE GENERALISATION IS MINE AND IS MARKED AS MINE.** His example names the
Monday case. The option's own wording is general — *"on a promoted row"* — so
the build applies it to EVERY promoted row, including within-day ones: today's
`INLF` would read `since Thu close` rather than `19h`. **That follows from the
option text and not from his example, and the distinction is written down here
so nobody later finds `since Thu close` on a Tuesday and reads it as a
defect.** If he meant it only where the age is misleading by days, it is a
one-line threshold and he should say so.

**2026-09-25, on column tooltips** (relayed by Integration, quoted there
verbatim and not re-paraphrased here): tooltips are welcome on column names
*"if it makes sense"* — his own limiter, and it excludes a tooltip that
restates the header.

**2026-09-25, on sub-minute:**

> *"1, both. 2, now with updated tooltip. but 1 is going to impact 2, at least
> on messging."*

**`1` and `2` are the two items in that block; `both` selects both options
under item 1, which read:**

> **(i) The rolling 60-second count** — same grain, no capture needed, removes
> 60–120s of lag from the number and from the sort. Days, not weeks.
>
> **(ii) True 10s grain** — needs sub-minute CAPTURE first, which is R&D's Q2
> and currently blocked. Weeks, and it is a Research build before it is a
> Design one.
>
> *My recommendation is (i) now and (ii) commissioned.*

**So the capture is commissioned by his word, not by my characterisation of
it** — and `2, now` is the header ruling, where `now` is the WORD `Now` and
not an instruction about timing, which the clause that follows confirms.

> ### ⚠ SUPERSEDED THE SAME EVENING: HE REJECTED THE 60-SECOND COLUMN.
>
> **Reported to Integration in his own words — *"I honestly don't understand
> the purpose of a 60 second column… unless somebody can convince me why we
> need that, no"* — and confirmed by him directly when Integration asked:
> *"yes i rejected the 60s."*** **THIS SEAT HAS NOT SEEN EITHER SENTENCE
> FIRST-HAND**, which is recorded because that is the standard Research held
> me to four messages earlier and it applies to a rejection exactly as it
> applies to an approval.
>
> **A LATER RULING WINS. `1, both` is spent on the 60s half.** *It was given
> against my own labelled option, and the option I wrote described a rolling
> 60-second count as days of work that would fix the sort — so he approved a
> thing, saw it argued again, and said no. **Nothing about that is a
> contradiction and it needs no reconciling: he changed his mind, which is
> what a ruling is for.***
>
> **WHAT SURVIVES: the 10-second CAPTURE.** *Both halves were selected by one
> word and only one half was rejected, so I am not reading the rejection any
> wider than its sentence — but I am also not treating the capture as
> unambiguously live off `1, both` alone. **It needs one clean question to
> him, in a block, and it is in the open items as needing that rather than as
> commissioned.***

*Research declined to start a storage-bearing build on my summary and asked
for the words. That was correct and the omission was mine: I wrote "his
ruling: commissioned" into the open items ONE MESSAGE after recording that
this thread has published a false "he ruled it" before. **A standard I state
and then do not apply to my own next entry is not a standard.***

## The 10-second question, measured 2026-09-25

**HIS CLAIM, AND HE ASKED FOR IT ON THE RECORD:** *"im a thousand percent
certain a 10s shows you something a minute doesn't. ive seen stocks go up 50
percent and volume quintuple inside 30 seconds."*

**HE IS RIGHT ON THE DATES, AND IT MATTERS LESS THAN THE SCOPE.** R&D closed
`NO_SUBMINUTE_INCREMENTAL_SIGNAL` on **2026-08-21**; `activityWindow` shipped
**2026-09-04** (`fce254c`) and the `Now` column **2026-09-22** (`3d611d4`) —
so the verdict predates the column by a month. *That alone does not overturn
it: the study had its own data and did not need this column.* **What settles
it is that the register already says the null closed a PREDICTIVE line only,
and that sub-minute data is still required for MEASUREMENT and was never
tested.** His question was never the one that was closed.

**MEASURED ON `data/market.db`, 782,393 minute bars with ≥10 trades, three
sessions (2026-08-17/18/19), local desk store and not production:**

    intra-minute range >= 10%    974 bars      >= 25%   87 bars
                       >= 50%      7 bars      >= 100%   0 bars

    the largest: JAB  $10.955 -> $19.00 in ONE minute  (73.4%, 1,153 trades)
                 OABI  $3.39  ->  $5.90                (74.0%,   248 trades)

**A ≥50% move inside a single minute is real and it happens.** *Minute bars
cannot prove 30 seconds — only capture can — but they prove ≤60, seven times
in three sessions.* His "quintuple" is real too: **403 of 124,720
minute-over-minute transitions from a base of ≥100 trades quintupled (0.32%).**

**THE FINDING THAT DECIDES IT IS NOT THE MOVE, IT IS WHAT THE COLUMN WAS
SHOWING DURING THE MOVE.** `Now` renders the most recent SETTLED minute, so
during minute *M* it displays *M−1*:

    sym    the >=25% minute        this minute   was ON SCREEN
    GNPX   2026-08-18T11:08        6,951 trades        128
    VOGX   2026-08-18T08:04          722 trades         11
    YYAI   2026-08-17T13:01          808 trades         24
    APUS   2026-08-17T10:44        2,348 trades        236

**Median jump over the prior minute across all 79 such events: 3.1×. So the
number on screen while the move was happening was about 32% of what that
minute actually produced, and it did not update until the move was over.**

**AND THE SORT IS THE REAL CASUALTY, WHICH IS HIS OWN POINT SHARPENED.** He
sorts by `Now` because *"it self sorts once selected so you can see what's
active"* — the ordering is live. **A name exploding right now cannot sort to
the top until its minute closes.** The column is least informative at exactly
the moment it exists for, and the sort he uses most is the one the lag damages
most.

**WHAT THIS DOES AND DOES NOT ESTABLISH.** It establishes that minute grain
hides moves he would act on, and that the column's lag is worst during them.
**It does not establish that a 10s series PREDICTS anything** — that is the
line R&D closed and nothing here reopens it. *The case for sub-minute is
measurement and currency, not prediction, and it should be argued that way or
it will be refused on evidence that does not apply.*

*Limits, stated: three sessions, the LOCAL store, the whole universe rather
than ranked names, and `high-low` carries a spread component on thin names —
though the named examples all cleared 248 trades in the minute.*

## SUB-MINUTE CAPTURE IS FOR THE COLUMN, NOT FOR A STUDY

**HIS CORRECTION, 2026-09-25, and he is right:** *"The whole idea and what I
understood behind all of this was that if we can get sub one minute capture,
then the now column can be near live."*

**I HAD FILED IT AS A MEASUREMENT QUESTION AND THAT LOST THE POINT.** The
register entry read "unblocks R&D Q2" and my question to him argued it as what
would let someone measure a 30-second move. *Both true, and neither is why he
wants it.* **The product purpose is a live column, and the research value is a
by-product.**

**WHY HE IS RIGHT, MECHANICALLY.** The column lags because `engine.ts:1026`
fills its counts from `bar.tradeCount` on minute BARS, and a bar does not exist
until its minute closes. **`ingestTrade` counts nothing today** — it updates
price and the session highs and retains no timestamps. So:

    capture        = a per-symbol time-bucketed COUNTER + persistence
    live column    = the same COUNTER + a read of the newest bucket

**The counter is the shared part and it is the whole of the work.** Once the
engine buckets trades at 10s, the column reads the newest settled bucket and
the figure is **10–20s behind instead of 60–120s**, plus the 4s poll. *That is
why "capture, then the column is near live" is the correct model and my
"capture is for measurement" was the wrong one.*

**THE ONE REAL CONSTRAINT IS COVERAGE, AND IT IS UNCHANGED BY THE GRAIN.**
Only names carrying the hi-res trade subscription can be counted — about 6 of
12 rows on a live board. **A 10s figure is roughly a sixth of a 60s figure for
identical activity, so a counted row and an uncounted row cannot share one
sort without the uncounted names sorting to the top.** *That is his open
question and it is the thing to settle before the reader is built, not after.*

## ~~FIELD SPEC — `DemandState.tradesLast60s`~~ — REJECTED 2026-09-25

**⚠ HE REJECTED THIS THE SAME EVENING. KEPT, NOT DELETED, because the
reasoning about WHY 60s and not 10s is the part a successor would otherwise
re-derive — and because a spec that vanishes leaves no record that it was
considered and refused.** *Nothing was built: no field, no code, no payload
change. `63325a4`, whose title names the rolling 60s, contains only the header
revert and this spec — there is no 60-second behaviour anywhere in the tree.*

**The superseded ruling:** *"1, both. 2, now with updated tooltip. but 1 is going to
impact 2, at least on messging."*

**THE PRODUCER'S HALF, for the engine seat — same shape as
`catalystFreshFrom`: ask for the ANSWER, and let the reader sit on safe
behaviour until it arrives.**

    DemandState.tradesLast60s: number | null

    the count of trades in the 60 seconds ENDING AT `updatedAt`, for names
    carrying the hi-res (trade-level) subscription.

    NULL = not available for this name. It is NOT zero, and it is not an
    error: outside the hi-res cap there is no trade stream to count.

**WHY 60 SECONDS AND NOT 10, WHEN 10 IS WHAT HE ASKED ABOUT.** *Because the
UNIT has to survive being mixed in one ordering.* Only hi-res names can carry
this — about 6 of 12 rows on a live board — so the column will hold two
populations whatever we do. **A rolling 60s and a settled minute are the same
unit measured over the same span, differing only in where the window ENDS, so
they sort against each other honestly. A 10s count against a 60s count does
not — it is a sixth of the number for the same activity, and the sort would
put every non-hi-res name on top.** That is the whole reason (i) can ship
before capture and (ii) cannot.

**THE COUNTER MUST NOT SIT WHERE A COUNTER WOULD NATURALLY GO — Research's
finding, verified here at `engine.ts:1394`.** `ingestTrade` runs three guards
before it records anything, and **two of them are PRICE semantics that a COUNT
must not inherit:**

    price === null || price <= 0      price validity
    !this.inSessionWindow(ts)         session membership   <- the only one a count owns
    !isNewerObservation(priceAt, ts)  MONOTONICITY

`isNewerObservation` is `candidate >= current`, so same-millisecond trades
survive and **OUT-OF-ORDER ARRIVALS ARE DROPPED.** A counter added inside the
existing flow sits below that and undercounts — **worst during the
highest-rate minutes, when out-of-order arrival is most likely, which is
precisely the minute this field exists to reveal.** *It would ship a fix for
undercounting that undercounts, and the error would look like the defect.*

**The count's only legitimate predicate is session membership.** Research
named the monotonicity guard; the price guard sits ABOVE the session check
too, so counting after `inSessionWindow` still inherits it. **Cleanest is to
test the session first, count, then apply both price guards** — but that
ordering is the engine seat's call and not mine to make in their file.
**Either way: if the number arrives and reads low, these three lines are the
first place to look.**

*And `ingestTrade` retains no timestamps at all today — it updates price,
`priceAt` and the session highs. So this is genuinely NEW state, a rolling
window per hi-res symbol, not a projection of something already counted. The
spec must not read as "expose what the engine already has": it counts
nothing.*

**WHAT THE READER DOES, AND IT IS SAFE AT EVERY STAGE:**

- **The NUMBER** uses `tradesLast60s` when present, and the settled minute
  otherwise. Same unit either way.
- **The BARS DO NOT CHANGE.** They stay minute-grain, because they are the
  ACTIVE/DEAD verdict's own array and that identity is what stops the chart
  disagreeing with the badge beside it. **The number is the live reading; the
  bars are the last five minutes of context.**
- **The SUB-LINE NAMES WHICH ONE IS ON SCREEN** — `60s` when rolling, `−1m`
  when settled. That is the one thing that must never be silent, because the
  two look identical and only one is current.
- **The SORT follows the number**, which is the entire point: he sorts by this
  column for its live ordering, and today a name exploding now cannot reach
  the top until its minute closes.

**WHAT IT IS WORTH, MEASURED RATHER THAN ARGUED** — see the section above:
during a ≥25% minute the figure on screen is a median **3.1× short** of what
that minute produces, and does not update until the move is over.

**AND THE HEAD STAYS `Now`, WHICH THIS MAKES TRUE.** It is a slight overclaim
today at the last settled minute; with a rolling window ending at `updatedAt`
it is exact. *I argued for `TRADES` on the ground that the head named a time;
he kept `Now` and the field turns his word into the accurate one.*

## ASSIGNED — the price-window control and header (his ruling, 2026-09-25)

**HIS SHAPE: the desk RECORDS $0–$50 and the user PICKS a window inside it.
Record wide, show narrow.** Research splits capture from qualification in the
engine; Ops holds the config; **the control and the header are mine.**

**VERIFIED, not relayed — one predicate, four readers:** `inPriceRange`
(`engine.ts:1612`) is `price >= priceMin && price <= priceMax` and is read at
`988` (CAPTURE), `1650` (QUALIFICATION) and `1690` (the after-hours latch).
`readModel.ts:157` projects the same pair onto `DiscoveryState`, and
`DiscoveryBoard.tsx:332` prints it: `Daily RVOL rank · $1–$20`. **Widening the
config today would put $45 names on his board AND rewrite that caption. The
header is the tell that one knob is doing three jobs.**

**THE PROBLEM NOBODY HAS NAMED, AND IT IS THE REAL DESIGN DECISION.** The
board's `rank` is `rvolRank`, computed in the ENGINE over everything that
qualifies. **If the engine qualifies $0–$50 and he views $1–$20, the rank
column runs 1, 4, 7, 12 — gapped, because the missing numbers are the names
his window hides.** *He has already read a gapped rank column as "the board
isn't sorting": on a correctly ordered board he saw 3, 2, 21, 8, 5 and
concluded nothing was working. That cost a fix and a second pass.* Three ways
out, and the difference is what `Rank` MEANS:

    keep engine ranks   honest about the universe; gapped, and he has
                        misread exactly this before
    re-rank in window   runs 1,2,3; but then two people with different
                        windows see different "rank 1" for the same session
    show both           #3 of 41 in view / #7 overall — costs width in the
                        narrowest column on the board

**Not guessed. It is his, and it is in the NEEDS YOU block.**

**TWO CONSTRAINTS I AM TAKING AS SETTLED, both raised by Integration and both
right:**

1. **The header states the WINDOW HE IS LOOKING AT, never the recording
   band.** They diverge the moment this ships, and a caption naming the
   recorded band above rows showing a narrower one is the `3d`-in-green
   pairing defect again — a number beside a word, computed from a different
   quantity, agreeing until the day it does not.
2. **The default window is TODAY'S band, $1–$20, not the new one.** A
   stranger, or he at 07:00 on Monday, sees exactly today's desk unless they
   move the control. **Always-on in the store, opt-in on the screen.**

*Scale, for what the control is choosing within: 13,398 symbols in the
universe, BRK.A among them at $759,200. Above $20 is 7,811 symbols; a $50
ceiling is ~1,100. **The price band is the only thing keeping this desk
small-cap**, which is why the control cannot quietly become the capture knob.*

**NOTHING SHIPS UNTIL THE ENGINE SPLIT LANDS.** Same pattern as
`catalystFreshFrom` and `tradesLast60s`: ask the producer for the answer,
build the reader to be safe without it.

## VERIFIED ON THE BOARD after `5254bca` — 2026-09-25 21:44 ET

**Live and read after a reload, on the AFTER-HOURS board:**

    header row   CHANGED | TICKER | PRICE·AH GAP·VWAP | RVOL | NOW −1m | WHY | RISK | CYCLE
                 EIGHT columns. **No rank column.** `Rank▲` survives as the
                 first sort chip and is the active sort.
    tooltips     present and reading the corrected copy.

**AND THE EVENING DEFECT `e7e629f` FIXES IS VISIBLE RIGHT NOW, WHICH IS THE
CONFIRMATION I WAS HOLDING IT FOR.** The board is ordered by AH participation
and that figure descends cleanly in the ticker cell — **407x, 333x, 286x,
45.5x, 31.5x, 29.3x, 24.8x, 20.1x.** Beside it the RVOL column reads:

    1555x   5369x   1414x   47.3x   1152x   15.0x   14.9x   192x

**In no order at all.** *A trader scanning down the ranking column on the
evening board sees numbers that jump — which is exactly the "the board isn't
sorting" complaint he raised twice, live, every night, on the column that is
supposed to say why a name ranks.*

**ONE OF MY OWN ARGUMENTS FOR THAT FIX WAS WRONG AND THE FIX IS RIGHT ANYWAY.**
I told him participation was *"a hover and nothing else"* after the rank column
went. **It is not: it renders in the ticker cell as `11.19M · 407x`,** volume
and participation, visible without hovering. *So the §10 hover-only argument
does not apply and I should not have made it.* **The real case is the one on
screen: the column headed with the ranking quantity shows a number that orders
nothing.** Stronger than what I argued, and found by looking rather than by
reasoning.

## Open items

| Item | Owner | Waiting on |
| --- | --- | --- |
| ~~Deploy of the FRESH boundary~~ | ~~Ops~~ | **DONE** `0a17601` live 12:17 ET, verified on the board 12:18 |
| ~~`catalystFreshFrom` on the payload~~ | ~~Research~~ | **DONE** `7a0ad0c` producer, `bd509e9` consumer |
| `lastCheckpointChanges` on the payload | Engine/Research seat | Spec above; §9 item 12's rail blocks on it |
| ~~`tradesLast60s` on the payload~~ | ~~Engine seat~~ | **REJECTED by him 2026-09-25.** Nothing was built |
| `e7e629f` — PART after the bell | Ops | **Evening defect now SEEN: RVOL column orders nothing on the AH board.** Ready to enumerate |
| Price-window control + header | Design | Engine split first; the `Rank`-meaning question is moot now the column is gone |
| Sub-minute capture -> a near-live `Now` | Engine, then Design | **ON. His confirmation 2026-09-25: "Sub minute capture absolutely still on."** The counting is shared: capture stores the buckets, the column reads the newest |
| ~~The `Now` column HEADER label~~ | ~~Design~~ | Built `ccaf77b`, tagged `363f40d`, **PARKED on his word** |
| ~~Confirm the boundary's VISIBLE effect~~ | ~~Design~~ | **DONE** one row moved, zero demotions, discriminating pair |
| The package: tooltips + `TRADES` + the within-day question | His call | One decision, three parts, ships as one change |
| A fourth freshness band past 21 days | His call | Research left 21 unimplemented: it currently divides nothing |
| §9 item 12 — the 320 px rail layout | Design | The rail restructures the board into two columns |
| §9 items 13–19 (rest of Phase 2) | Design | Unstarted |
| §9 items 20–26 (Phase 3) | Design | Not scoped |
| The mark on a real handset | Design | His phone; nobody has looked |
| Manual spine — the dozen things a user would misread | Design | His yes; drafted from the log |
| `anchorLateScope` render (row mark + board statement) | Research builds the field | The field; ships with the render, never half |

**The `Now` header is DONE at `ccaf77b`.** The head reads `TRADES` over `−1m` —
what, then when — and takes its word from the `SORT_KEYS` entry so it cannot
drift from the control that sorts it.

**THE FLOOR MEASUREMENT THIS FILE CARRIED WAS WRONG, AND WRONG IN THE DIRECTION
THAT INVENTS ROOM.** It said *"the table is 990 px inside a 1,014 px container,
so the unit has about 24 px to live in."* Measured on the live board at the
1,024 px floor: the container is **1,014.2 px, the table is 982.2 px, and the
32 px between them is the parent's own `px-4`** — the table is `w-full
table-fixed`, so it is already exactly as wide as it can be and **there is no
slack at all**. Every added pixel comes out of `Why` and `Risk`, the two
columns with no declared width.

*That is not a reason not to spend it.* `Why` and `Risk` carry prose measured
at **1,300–2,300 px truncated to a single line**, so 20 px each costs about
four characters of a sentence already cut to a tenth of itself, and **row
height does not move** (56.9 px either way, so no row is lost). **Size the cost
in what the cell is actually rendering, not in pixels** — a column losing 11%
of its width and a column losing 11% of its content are different facts, and
here they are 40 px apart.


**Hazards that cost something and are not obvious from the code:**

- **The cycle frame is ahead of its data, and HOW FAR ahead is unsettled.**
  **THE FRAME IS RULED AND WHOLE: ALL THREE SESSIONS, 04:00–20:00 ET.**
  After-hours 2026-09-17; **premarket 2026-09-22, confirmed by him directly to
  this seat** — asked plainly ("did you rule premarket into the cycle frame
  today?") and answered "yes i ruled premarket in today". **That is the source
  to cite, and the FIRST first-hand one.**

  *The claim was written into this repo four times before it was true.* This
  file said he ruled it on 2026-09-21; he had not. `f0048eb`, `3308fb1` and
  `bb2901d` are the corrections, and a fifth arrived by peer relay before this
  confirmation. **Design declined to record the relay and asked him instead** —
  which cost two words and is the only thing that could have ended it, because
  nothing in the tree can refute a sentence about what he said. **If a later
  seat finds this line, its basis is a direct answer in the Design session of
  2026-09-22, not a forwarded one.* The same false record
  appeared in `research-opening-prompt.md:87`, was corrected once at `f0048eb`,
  came back, and the new Research seat caught it again at `3308fb1` before
  acting on it — **so this is the third appearance of one invented ruling, and
  my copy is the one nobody had checked.** A ruling attributed to him that he
  never made is the worst thing this record can carry: it cannot be refuted by
  anything in the tree, it arrives with his authority, and every seat that
  repeats it makes it harder to doubt. **The ruled frame is after-hours plus
  RTH; whether premarket joins it is HIS to say and has not been asked.**
  `daily_bars.high` is neither.
  Today's high includes every session and the prior high does not, so the two
  sides of that comparison are in different frames. It errs safe in DIRECTION —
  an understated prior high makes a name look closer to its high, never further
  — but the SIZE of the understatement is an open question, and it decides
  whether the label needs a scope clause.

  **TWO MEASUREMENTS BY THE SAME SEAT DISAGREE AND NOBODY HAS RECONCILED THEM.**
  On 2026-09-18 the daily high was measured as premarket+RTH: 17 discriminating
  rows supporting 04:00–16:00 and zero supporting after-hours-inclusive, and
  independently `session_high` matched `max(minute_bars.high)` over 04:00–16:00
  on 6,889 of 6,889 rows. On 2026-09-21 Research's hand-off states it is
  09:30–16:00 plus the closing cross — which excludes premarket as well. Those
  cannot both hold. If the second is right the understatement is much larger and
  lands on the session he actually trades, which is the case a scope clause
  exists for.

  **What settles it:** the same discriminating-population query, restricted to
  rows where PREMARKET set a higher high than RTH, comparing `daily_bars.high`
  against `max(minute_bars.high)` for the same date. Research's query shape, one
  filter changed. Until then `PRIOR HIGH` carries no scope clause, on the ruled
  frame rather than on the measured one, and the tooltip says the highs before
  today exclude after-hours. `lib/market/cycle.ts:44` carries the frame
  warning.
- **The vendor float never touches the server.** `stockanalysis.com` bars
  automated access AND use of its data in a competing product; the second clause
  holds however politely you fetch. It arrives by his desktop path through the
  Sheet. Nothing under `app/` may reach it.
- **The desk and a review link mount the same `DashboardShell`.** Anything added
  to the board renders to whoever holds a token. `tests/dashboard/reviewLeak.test.ts`
  guards the import; the rule it enforces is about what the board RENDERS, not
  only what a column stores.
- **A derived boolean leaks the number behind it.** "Red stop: touched" says his
  P&L reached a figure without printing it.

## Where the rest of the record is

The week-by-week working record to 2026-09-21 is in
[`design-archive-2026-09.md`](design-archive-2026-09.md). Read it only to answer
"why is it like that"; every conclusion is also in a commit message, with the
code beside it. Rulings that still bind were carried above.

## Reporting to him — his rule, 2026-09-25

**HIS WORDS, VERBATIM, AND THEY OVERRIDE EVERY REPORTING HABIT BELOW:**

> *"Everyone is over communicating. I don't care about how the back end
> conversations or the mechanics go relative to code or conflicts or Qnumbers,
> et cetera, et cetera. I care about the information that impacts the app
> relative to my decisions and what we're doing with the product."*

**THE TEST BEFORE ANYTHING REACHES HIM: which decision of his does this
change, or what can the product now do? If neither has an answer, it is a
commit message.**

**IT IS A RELEVANCE FILTER, NOT A LENGTH LIMIT, AND HE SAID SO HIMSELF WITHIN
MINUTES OF THE RULE:**

> *"i dont care what you say to each other and unless that has to be printed,
> be as long as you need to be. don't sacrifice excellence for brevity. i just
> am having trouble understanding what's going on when i have to read through
> all the shop chatter."*

**So a long message to him is fine if every part of it changes a decision or
the product; a short one is wrong if it is mechanics.** *The first reading of
his rule in this folder extended it to seat-to-seat traffic and to length —
neither is what he said. Between seats and in this file: as long as the work
requires, bounded only by context cost.*

**AND THE ONE PLACE LENGTH IS HIS INSTRUCTION IS MINE: ANYTHING PRINTED STAYS
TIGHT.** *That is this seat's surfaces — labels, headers, badges, and the
column tooltips. They shipped at 68 and 78 words on `Why` and `Risk`, five
sentences each, for a trader hovering at 07:30. Cut to 55 and 58 by removing
self-reference and restatement; the clause saying what the column is NOT was
kept, because a header can never carry it.* **A tooltip is printed copy, and
the excellence he does not want sacrificed is in what it says, not in how
much of it there is.**

**THIS SEAT IS THE HARDEST CASE AND IT CUTS BOTH WAYS.** *The board IS the
product, so my output is closer to his attention than any other seat's — and
that makes it easier, not harder, to smuggle mechanics in beside it.*

    PRODUCT, and his          what a row now SAYS. what a column MEANS.
                              what he can read off the board that he could
                              not. what the board now refuses to claim.

    MECHANICS, and NOT his    which argument the value rides on. how the
                              payload carries it. widths, unless a column
                              got cut. gate numbers, mutation counts, shas,
                              tags, cherry-picks, bundle staleness.
                              control rows, discriminating pairs, and every
                              near-miss that made a verification sound.

**A MEASUREMENT REACHES HIM ONLY AS ITS CONSEQUENCE.** *"During a 25% minute
the number on screen is a median 3.1× short and does not update until the move
is over"* is product — it says what the board cannot do. **The population,
the store, the bar filter and the three sessions are the method, and the
method belongs in this file.** State the limit in one clause if the limit
changes how far he should trust it; otherwise it is here.

**A PEER'S CORRECTION NEVER REACHES HIM — only what it changed.** *Today I
reported a guard I had written wrongly, a gate command that lied, an escape
level lost three times, and which seat caught which. **None of it changed a
row on his board.*** Say what shipped; the record of how is `git log`.

**AND MY OWN ERRORS ARE MECHANICS TOO, WHICH IS THE PART THAT WILL BE HARDEST
TO KEEP.** *Reporting them reads as honesty and costs him the same attention
as any other narration. It is honesty owed to THIS FILE.* **The exception is
an error that reached, or could have reached, the app — that is product and
he hears it first.**

## Working rules

- **ONE SENTENCE CAN NAME ONE BASE AND CARRY FIGURES FROM TWO, AND EVERY
  FIGURE IN IT IS CORRECT.** I wrote *"over `757cf6a`: 3 and 4 commits, 10 and
  13 files."* The commit counts were over `757cf6a`; the file counts were over
  `49efd1a`. **Nothing was miscounted — the two halves were measured against
  different bases and joined by one preposition.** Caught by Integration, in a
  hand-off that had already been corrected once.
  **A wrong number gets challenged; a right number under the wrong frame gets
  RE-DERIVED, disagreed with, and costs the reader their trust in the whole
  hand-off rather than in the figure.** So a count travels with its base
  attached to it, not to the paragraph — and when there are two bases, print
  the table and stop writing the sentence.
- **I APPLIED THE CONE RULE CORRECTLY TWICE AND THEN TOLD OPS TO DEPLOY A
  TIP.** *Same day. I wrote the rule below, sent Integration a correction built
  on it before lunch, and in the evening handed Ops five shas with "cut
  whatever set you want from the tip — nothing between `757cf6a` and here that
  belongs to me touches auth."* **`d0bc78c..main` is 250 commits carrying 10
  auth commits from other seats.** Ops refused it.
  - **THE CHECK WAS RIGHT AND POINTED AT THE WRONG OBJECT.** "Nothing of MINE
    touches auth" answers *is my work auth-free* and says **nothing** about
    what the sha carries. It is the identical shape to the finding I had sent
    Integration that morning — a by-path check belongs on the PICKED FILES and
    never on the cone.
  - **KNOWING A RULE IS NOT THE SAME AS HAVING IT AT THE MOMENT OF THE HAND-OFF,
    AND THAT IS THE DURABLE PART.** *The rule was in this file, in my memory and
    in a message I had already sent. What defeated it was a sentence that FELT
    like the check — it contained the words "auth", "by path" and a verified
    negative — while measuring a different set.* **Say which set the check ran
    over, in the sentence, every time: "picked files: zero" and "cone: 250
    commits, 10 auth" are the same discipline pointed at two objects, and only
    one of them decides whether a tip is safe.**
  - **AND I RELAYED HIS "ok" TO OPS AS DEPLOY AUTHORITY.** It was approval of
    the WORK; the enumeration is Integration's. **An approval and an
    enumeration are different objects too**, which is the same error twice in
    one message.
- **HAND OVER AN ARTEFACT, NEVER A RECIPE — AND GATE THE SHA THAT SHIPS.**
  I gave Ops three shas and the instruction to cherry-pick them, having gated
  an **uncommitted** `cherry-pick -n` onto the production base and then reset it
  away. The numbers were true of a tree that existed for four minutes and is
  committed nowhere, so **every sha Ops would actually deploy was ungated.**
  A tag whose CONE IS THE SHIP SET fixes both halves at once: the tip is safe to
  deploy, and the thing gated is the thing that ships. *This is the worktree
  rule's blind side — I had the pinned tree, the clean status and the literal
  sha, and still produced a gate with no artefact behind it.*
  - **AN ENUMERATION OF SHAS IS READ AS SHAS, whatever sentence sits above it.**
    `bd509e9`'s cone over production was 66 commits carrying 10 auth commits,
    and `0170418` is the record of that misreading already happening once. **A
    prohibition does not survive being quoted; a bounded ref does.**
  - **ANCESTRY AND CONTENT ANSWER DIFFERENT QUESTIONS — NAME WHICH ONE YOU ARE
    ASKING.** Both of the day's failures are that one root in opposite
    directions: `34cf6f3` had innocent content and dangerous ancestry;
    `0a17601` had the needed content and no ancestry a `--contains` query could
    follow. Ops's and Integration's halves are in `README.md` (`16d77b4`).
  - **AND A BRANCH NAME IS A SHARED WRITABLE RESOURCE, LIKE THE INDEX.** Mine
    were under `ops/`, which is why Ops read one as free and came a worktree
    lock away from force-updating my unpushed work. **A ref I create goes under
    `design/`, and to pin a sha it is a TAG.**
- **A MUTATION THAT SURVIVES IS NOT ALWAYS A VACUOUS CHECK — LOOK FOR THE
  SECOND DEFENCE BEFORE REWRITING THE ASSERTION.** Six mutants on the FRESH
  boundary, five killed singly; removing the `age.precision === 'CLOCK'` guard
  killed nothing. **The shortfall was right and the test was fine**: `time.ts`
  already documents that the guard is defended TWICE — `tsc` rejects
  `age.elapsedMs` on the DATE arm, and at runtime `NaN >= boundary` is false —
  so no single mutation can reach the rule. A two-part mutation (guard removed
  AND the bare arm given a zero elapsed span) does kill it. **Predicting the
  count is still the discipline; the reading of a shortfall is "find the other
  defence or admit the check is vacuous", and both answers are common.**
- **A WRITE THAT RAISES MID-CALL LEAVES THE FILE EMPTY, AND REPORTS NOTHING.**
  A Python `open(p, 'w')` truncates before it writes; a `UnicodeEncodeError` on
  a surrogate pair in the replacement string then ended the process with the
  file at **zero bytes**. My own new test file, 240 lines, gone — and the
  traceback named the encoding, not the destruction. **Sibling of *never `cat >`
  a path without knowing it is new*: the danger is not the tool, it is that
  TRUNCATION HAPPENS FIRST and is not conditional on the write succeeding.**
  Read-modify-write a file you care about in BYTE mode to a temp path, then
  move it — the same day proved the other half, that a text-mode write on this
  host can silently fail to take at all (three attempts, all reporting success,
  the re-read returning the ORIGINAL length).
- **`npm test` GREEN IS NOT THE GATE GREEN. Vitest does not typecheck.** 2,431
  tests passed on a test file whose import `tsc` rejects outright — the suite
  ran the code and never checked the types, so the only thing that caught it was
  running the whole gate. *The gate's four commands are not four opinions about
  the same question.*
- **A FACT SHOWN ONLY UNDER A CONDITION TEACHES NOBODY WHO HAS NOT MET IT.**
  The units of the `Now` column lived in the sort caption, which renders only
  while that sort is ALREADY ACTIVE. So the column explained itself to every
  reader except the one who had not yet chosen it and was asking what it was —
  which is the entire population of the question. **The previous fix satisfied
  §10's no-hover-only rule and missed the rule behind it**, because a caption
  gated on a click is hover-only wearing different clothes.
  - **AND THE TEST PINNED THE CONDITIONAL SURFACE.** `filters.test.ts` asserted
    the exact caption string `trades in the last settled minute`, so it passed
    on the defect and would have failed on the repair. **An assertion inherits
    the blind spot of the surface it reads**: it cannot notice that the string
    it found is behind a condition, because a string match has no idea what
    renders. When a check reads a rendering, name the STATE the rendering
    requires, or the check is about the string and not about the reader.
- **A COMMENT BETWEEN `{` AND `key:` DELETED AN ENTRY FROM A SOURCE-READING
  TEST.** `filters.test.ts:252` enumerates the sort keys with
  `/\{\s*key:\s*'(\w+)'/`. Documenting the `now` entry from inside its own brace
  dropped it out of that set, and the failure read **"declares a column for
  every sort key"** — which points at the wiring, not at a comment. *The fifth
  time a comment and code have been confused in this thread, and the first where
  the comment was invisible to the TEST rather than to the reader.* The comment
  sits outside the brace now and says why.
- **Never state what is deployed. State what is COMMITTED.** Both pending lists
  I gave Integration were wrong — three pieces live when I said none, and
  `b2399a2` live when I called it pending. Design has no deploy signal, and a
  bundle can be composed, fail, and be RESTORED FORWARD without any of it
  reaching this thread. Say "my head is `<sha>`" and let Ops say what is live:
  that removes the failure rather than asking me to be more careful about a fact
  I cannot observe. **A list I cannot verify is a guess with a shape.**
- **A test written by copying the implementation cannot disagree with it.** Two
  instances in one session, both mine: a suite asserting `toContain('high is
  today')` on a string that could never be about today, and one asserting
  `state === 'LIVE' ? null` — each DEFENDING the defect it should have caught.
  Write the test from the RULE, not from the code. The repair shape is the same
  both times: assert the mapping over every input, which is the half a
  single-case check cannot reach.
- **A check that only exercises the FIRING case cannot tell you the predicate is
  right.** I confirmed an abnormal market state renders words and called the
  header verified — while the screen was displaying the very defect, because
  "worker offline" was itself an out-of-hours state I had wrongly classified.
  Exercise both sides: the case that should speak AND the case that should be
  silent.
- **Enumerate what is THERE, not what you are changing.** The header audit
  changed two components and missed a third printing a pure constant onto the
  row he complained about. The addition-plan rule inverted — and the reason the
  fix took two rounds.
- **A status row and a working set are looked at in different moments.** That,
  not "no room", is why the tick budget belongs in the Focus strip rather than
  the header. The header reports whether the desk is functioning; a working set
  is what he is doing. The distinction is durable and will survive the next
  request to put something in the header — including one from me.
- **Prefer making it IMPOSSIBLE over making it VISIBLE.** Three times in one
  night the better answer was structural rather than disclosed: the sparkline
  reads the verdict's OWN array, so it cannot disagree with the graveyard rather
  than agreeing by discipline; the tick budget defines the auto set as the
  REMAINDER, so there is no silent degradation to announce because nothing
  degrades; and the sparkline view exposes no field that could carry a tone, so
  adding a verdict fails a test rather than requiring restraint. **A disclosure
  is a promise someone has to keep. A structure keeps itself.**
- **A collapse keyed on the wrong proxy fires on a false negative.** The Focus
  strip hides itself on "no pins", which meant "nothing to say" only while pins
  were the only content. Naming the case where a requirement usually holds,
  instead of naming the requirement — and the tell was that its empty state
  holds INSTRUCTIONAL TEXT: a constant dressed as content, in a band collapsed
  for saying nothing.
- **Never gate work on a wall time you derived. Gate it on an OBSERVABLE.**
  I reported 03:31 and then 03:42 when the true times were ~03:06 and 03:25 —
  drifting because I was adding elapsed time by feel between messages instead of
  reading a clock. The box's UTC was correct throughout; the arithmetic was not.
  A "run it at 04:00" plan would have fired at ~03:42 actual and repeated the
  03:02 failure exactly. **The gate for the owed reads is
  `sessionPhase !== 'NEXT_DAY_PREP'` and `intelligence` non-empty** — a
  CONDITION rather than a MOMENT, and it cannot drift. Same rule as the header
  predicate: derive nominal from the session, not from a literal.
  When a time is genuinely needed, take it from `date -u` or the API's
  `fetchedAt` at the moment of use, never from memory of an earlier message.
- **Reverse the edit, never the file.** `git checkout <file>` to undo a
  deliberate mutation took the whole change with it. Same class as `git stash`
  on this tree, which is already forbidden here for the same reason: a
  destructive command aimed at a small target.
- **Mutation-test every new assertion before trusting it.** Four vacuous checks
  in one night; the fourth was the first caught by mutation rather than luck. It
  asserted a null turnover against a fixture with no volume, so it PASSED with
  the refusal removed entirely — it was asserting the fixture, not the code.
- **I reported a MECHANISM as a FINDING, and it was wrong.** I observed that a
  wrong-module import passed `npx tsc --noEmit` and failed `next build`, then
  said tsc "does not cover the test files". **It does** — probed it myself:
  planting `const probe: number = 'not a number'` in `tests/` produces TS2322.
  The real mechanisms are `incremental: true` with a stamped
  `tsconfig.tsbuildinfo` (a pass can SKIP files it believes unchanged), and
  `.next/types/**` being in the include list, so the same command covers
  different things depending on whether a build has run.
  **The symptom was real; the explanation was invented.** Separate what you SAW
  from what you CONCLUDED when reporting, because a plausible mechanism travels
  as fact and my wrong one would have sent someone to widen an include list that
  was already correct — a fix changing nothing while looking like it did.
  Mitigation: `rm tsconfig.tsbuildinfo` before a decisive check; run the full
  build before reporting clean or shipping.
- **A scope is a claim that something does not exist — check the tree first.**
  It is the cheapest claim on this desk to test: one `git log`, one `grep`.
  Integration scoped the activity indicator as unbuilt while it had been
  shipping since `2b3ddd9`, and the same seat had done it once before in the
  same week. **Apply this to every hand-off, including ones that arrive with
  detailed constraints** — the constraints are what make an unbuilt premise
  convincing.
- **A wrong finding stays visible; a discharged caveat does not.** Research's
  addition to my caveat rule, and it is the half that decides how to write one.
  Its rule — *a mechanism that explains the class is not evidence about the
  instance* — and mine are the same error pointed at a CLAIM and at a DOUBT: one
  over-claims a finding, the other under-claims a risk. **Mine is worse, because
  a wrong finding gets corrected while a deleted warning leaves no trace it was
  ever there.** So when the mechanism behind a doubt is uncertain, write the
  doubt so that clearing one cause cannot delete the sentence.
- **Put the argument at the point of temptation, and NAME WHAT IT RESTS ON.**
  The points-not-a-line reasoning sits in `lib/dashboard/sparkline.ts` because
  that is the file someone edits to draw a line — not beside the engine line it
  depends on, where no one proposing a mark change is looking. **And it names
  that dependency explicitly** (`activity.ts:261` maps a missing slot to zero, so
  the spacing is time rather than sequence), so a future change to the dependency
  meets a reader instead of silently invalidating an argument two modules away.
  A rule someone must remember is weaker than a note where the mistake is made.
- **Report a near-miss as a FAILURE, not as a fixed bug.** Ops's note on why its
  control technique travelled and landed: the useful part was not that it
  corrected the error, it was that **the wrong object was named**, so I knew
  which way the trap pointed. A "fixed, no action needed" carries the same facts
  and none of the warning. This is the counterpart to *an unmarked guess becomes
  an instruction once relayed* — both are about what survives a hand-off, and
  the reporting choice decides it.
- **Where a field lives may be a STORAGE ACCIDENT, not a design statement.**
  `universeFreshness` sits on `MarketFeedHealth` and not on `DiscoveryState`
  beside `universeMode`, because `feed_health` is persisted whole while the
  discovery snapshot is projected field by field. Every instinct — the sibling
  concept, the board already destructuring discovery, the caveat belonging near
  the counts — points at the wrong object. **Read from the object the field is
  ON, and check a known-present field alongside it** so "absent" means something
  before you act on it.
- **Two annotations describing DIFFERENT properties of one field silently add
  up.** `screen` says nothing leaves the board when the PM columns go; `live?`
  says the frozen-at-a-moment value is lost. Both true, one loss — and a reader
  scanning two populated columns counts it twice. **Say explicitly that they do
  not compose**, because neither column can say it alone and the cells cannot
  say it at all.
- **Count the fields the desk must PRODUCE, not the columns the source USES.**
  `rows.ts` folds Priority+Revised, Catalyst+PM Catalyst and Warning Shot+PM
  Warning Shot into three fields. A plan counting seven would build six things
  where three exist — **a spreadsheet needs a second column for a revision where
  a record needs a flag.** The pairing is a shape of the source, not of the
  problem.
- **The control for a RENDERER is a sibling element you know should be present.**
  On the payload the control is a known field — `universeMode` beside the three
  new ones. In the DOM it is a neighbouring cell or column. **"I looked and it
  was not there" is never a finding on its own:** searching every row for the
  sparkline bars and finding none looked like a defect, and the truth was that
  the whole table was unmounted because the board had no rows. **An absent
  renderer and an absent value are indistinguishable without a control.**
- **A verification that fails at its object can still confirm what stands in the
  object's place.** Going to read the colour and finding no table instead
  confirmed the empty state live for the first time — including the trading date
  across a holiday Monday, which every thread had got wrong in prose for two
  days while the code had it right. **Report what the failed attempt did
  establish**, rather than only that it failed.
- **A label's WORDING can disguise which quantity computed it.** `OFF HIGH` is
  selected by `retracementPct` — fraction of the run surrendered — while sounding
  like a distance below the high. **Pairing it with the distance figure would
  make that mismatch invisible rather than resolving it**, because a number
  beside a word reads as the word's evidence. When deciding what to show beside
  a label, ask what COMPUTES the label, not what the label sounds like.
- **A caveat that can only move a number ONE WAY is a BOUND, and must be
  reported as one.** "The true rate may be higher" reads as uncertainty and gets
  discounted symmetrically; "2.7% is a floor" cannot be. I flagged the RTH-only
  question as unresolved rather than estimating it, which was right — but the
  answer was already in the repo at `types.ts:62-68`, verified against minute
  bars by someone who checked it precisely because it matters. **Search the repo
  for the answer before recording a question as open.**
- **Compare at the precision of the INPUTS, not the precision of the type.**
  `1.5 - 1.49` is `0.010000000000000009` and reads as outside a one-cent spread,
  so a name exactly one spread off its high would have flipped on the arithmetic
  rather than on the price. Quotes are never finer than four decimals, so
  rounding at six cannot change a real decision. **A threshold derived from
  measured quantities inherits their resolution, and the gap between that and
  the float's is pure noise sitting exactly where the decision is closest.**
- **A defect removed BY CONSTRUCTION beats one caught by a branch.**
  `max(cycleHigh, sessionHigh)` makes "price above its own reference high"
  impossible rather than handled — one operator instead of one more condition.
  It fell out of the shape he asked for; **saying it fell out rather than
  claiming it as design is what makes it usable as a rule.**
- **Two READ sites are not two sources.** I read `repo.ts` and `engine.ts` as
  independent origins for `priceWindow` and concluded a store sweep could not
  settle whether it ever rendered. They are two consumers of ONE producer
  (`engine.ts:1155`), so the sweep settled it completely. **Trace to where a
  value is WRITTEN and count those.**
- **Print the shape next to the number** (Ops's). Its aggregate query used a
  JSON path that could not match the stored shape, returned NULL for every row,
  and printed `0` — which read exactly as "no defect". It caught itself only
  because the raw rows were printed two lines above and contained 3, 6 and 11.
  **A block that shows its input refutes itself in one glance.**
- **A writer-side finding must reach the reader-side seat BEFORE their next
  observation, not after it.** The colour being inert was only findable because
  Ops's sweep arrived before I read the board; had I looked first I would have
  seen grey, confirmed it against an empty payload, and written a partial pass.
  **That ordering was luck. Make it a rule.**
- **THE SPREAD IS THE MOST LICENCE-EXPENSIVE INPUT ON THE BOARD. Name it at
  design time.** Two verdicts lean on it — the flat band (`sparkline.ts:204`)
  and the NEW HIGH override (`cycle.ts:221`) — and both were chosen this
  weekend, independently, with no way to know. Not forbidden: **a cost to state
  in the scope**, like a width measurement or an empty state.
  **And a derived quote is not a worse verdict, it is a DIFFERENT one.** A real
  quote from any venue subset has a spread AT LEAST AS WIDE as the NBBO, so a
  partial-venue feed calls FLAT more often and NEW HIGH more readily —
  **one-directionally.** Direction knowable, magnitude not: a bound, not a
  caveat.
  **The failure mode is silence, not error** — both features return neutral
  without a spread rather than guessing a band. So losing the quote makes the
  board say less, never something false. That is worth knowing when costing it:
  **the downside of the cheap feed is two dark features, not two wrong ones.**
- **NEVER CONVERT UTC TO ET BY ARITHMETIC — AND `TZ=` DOES NOT WORK ON THIS
  HOST.** Minus four is EDT; **EST is minus five and DST ends 2026-11-01**, so
  the habit of reading `date -u` and subtracting starts producing a
  wrong-by-one-hour reading in eight weeks, silently, looking exactly as
  authoritative as it does today.
  **And the obvious fix fails here in a worse way.** `TZ=America/New_York date`
  on this box returns **GMT** — it ignores the variable and hands back UTC *with
  a timezone label attached*, which reads as converted. **Tested, not assumed.**
  **Use Python's `zoneinfo`, which is correct on this host** — verified across
  the transition: `2026-10-30 13:00Z → 09:00 EDT`, `2026-11-02 13:00Z → 08:00
  EST`.

      python -c "from zoneinfo import ZoneInfo; from datetime import datetime,timezone;         print(datetime.now(timezone.utc).astimezone(ZoneInfo('America/New_York')))"

  **A conversion constant with an expiry date is a defect with a start date.**
  Every `04:00 ET = 08:00 UTC` I have reasoned with becomes wrong on 11-01.
- **A removed SOURCE goes false FORWARDS; a removed MEANING goes misread
  BACKWARDS.** Same family, opposite directions — and only the first is visible
  in new data. **The backwards one is worse for exactly that reason: nothing
  about an old row looks wrong later.** The `focus` badge was the second kind.
- **"RENDER FIRST" MEANS RENDER *LIVE* FIRST, NOT RENDER *COMMITTED* FIRST.**
  A ruling in the charter is a decision, not a deployed change — the badge is
  still serving while `e609139` sits in the log. **A downstream thread waiting on
  "the render is gone" is waiting on a DEPLOY, and must never read my sha as the
  green light.** Same root as *a sha is a timestamp, not a selection*: I control
  what I push, not what is live, so I say which one I mean.
- **AN ANNOUNCED DATE CARRIES NO ZONE.** Three clock errors here were the same
  shape — carrying a reading rather than taking one. **The fourth is different
  and worse:** two threads in non-ET zones both rolled to Tuesday and announced
  it on Monday evening ET, independently, and a third repeated it as fact.
  **Nobody misread a clock; nobody read one.** A reading you take is wrong only
  if you take it wrong; **an ambient date is wrong for everyone downstream at
  once**, and it arrives with the confidence of an observation. Every thread on
  this desk runs in a non-ET environment, so this recurs by default.
- **NEVER `cat >` A PATH WITHOUT KNOWING IT IS NEW.** This destroyed 18 test
  cases at `4110599` — not pruned, OVERWRITTEN, so no judgement was made and
  none could be defended. `Write` and `cat >` are silent on an existing file.
  **Check first, or append.** Sibling of *reverse the edit, never the file*:
  both are a destructive operation aimed at a target I had not looked at.
- **THE COLLATERAL IS ADJACENT TO THE FILE, NOT TO THE FEATURE.** Twelve of the
  eighteen had nothing to do with pins — they covered `selectFocusRows`,
  `retentionNote` and `buildDeskRead`, and `retentionNote` is code I had changed
  myself two days earlier. **I deleted the tests for my own recent change.**
  When reasoning about blast radius, the unit is the FILE the operation touches,
  not the concept I have in mind.
- **`git add <path>` GUARDS THE ADD. THE EXPOSURE IS IN THE COMMIT.** I staged
  one file by explicit path — obeying the rule — and `f598564` still landed with
  **four of Ops's `git rm`'d files in it**, 444 deletions under a message about
  a sparkline. **`git commit` commits THE INDEX, and in a shared working tree
  the index is not mine.** The rule I had was written against `git add -A`, and
  **it named the wrong step**: staging was never where the risk lived.
  - **THE FIX IS ONE FLAG: `git commit --only <paths>`.** It commits exactly
    those paths and leaves the rest of the index untouched. Verified — the very
    next commit came back `1 file changed` with a peer's work still staged.
  - **AUDITED RATHER THAN ASSUMED:** all ten of my other commits that night are
    `1 file changed`. **One occurrence, not a pattern** — because it needed a
    peer's staged work to coincide with my commit, which is exactly why it will
    recur and why the flag is not optional.
  - **AND IT IS THE MIRROR OF A COURTESY.** Ops left Research's uncommitted
    files alone an hour earlier. **Leaving a peer's work alone only works if the
    peer also does not sweep yours** — one-sided care in a shared index is not
    care, it is luck.
  - **THE DAMAGE IS ATTRIBUTION, NOT CORRECTNESS.** The deletions were right and
    intended; **anyone searching history for where `POST /api/focus` went will
    not find it under a message about the `Now` column.** Not rewritten — it is
    on `origin/main` — and Ops recorded the pointer from the other end.
- **A GATE IN THE SHARED TREE GATES A MOMENT, NOT A SHA.** My run read
  `lib/research/interpret/` while another thread was mid-edit and produced a
  failure that was not reproducible. **Before trusting or reporting a gate,
  check `git status` for other threads' uncommitted files and say so.** The
  structural fix is a pinned worktree; the cheap discipline is the status check,
  and it is what caught it tonight. **Taken: `A:/mointel-design` is a detached
  worktree** (`git worktree add A:/mointel-design --detach origin/main`) — it
  shares the object store, so it cannot see another thread's uncommitted edits.
  Verified at `38e7d4b`: **125 files / 1871 tests, matching the shared tree**,
  and the worktree stayed clean through the run.
  - **BUT A WORKTREE PINS SOURCE AND DOES NOT PIN `node_modules`.** It arrives
    empty; `npm ci` from the committed lockfile (17s, 461 packages) closes most
    of the gap, `npm install` would not. **If a gate result ever fails to
    transfer between two threads on identical trees, look there first.**
- **THE SIX `focusRepo` TESTS ARE EXPECTED TO GO.** `seedFocus`,
  `isFocusSeeded`, `pinFocus`, `unpinFocus`, `readFocus` — Ops removes the repo
  in step 3 and they leave with the code, not before it. They were **not**
  obsolete when restored.
  - **CORRECTION — IT IS ELEVEN, NOT SIX, AND I TOOK SIX FROM OPS WITHOUT
    OPENING THE FILE.** That is the same generator: **a number accepted rather
    than looked at.** The enumeration, by name:
    **`focus persistence` is 10 cases and every one of them touches the repo**
    (`seedFocus`, `isFocusSeeded`, `pinFocus`, `unpinFocus`, `readFocus`), plus
    **`renders one card per pinned name, in pin order`** in `focus cards`, which
    calls `focusRepo` directly. **11.** The other 7 `focus cards` cases touch no
    repo function and must survive.
  - **THE MCP SIDE CONTRIBUTES ZERO.** `get_focus` appears in `readOnly.test.ts`
    and `sideEffects.test.ts` **inside arrays and call lists within existing
    cases**, never as an `it()` of its own. Removing the tool changes assertions
    **inside** cases and **does not move the count.** So Ops's `−9` cannot be
    reached by adding an MCP contribution to six.
  - **AND THE FILE'S MODULE-LEVEL IMPORT OF `focusRepo` BREAKS ON REMOVAL**, so
    the file must be edited regardless — which is the mechanism by which a
    careless fix takes the other 7 with it. **That is precisely how the original
    eighteen died.**
  - **CORRECTION AGAIN — IT IS TEN, AND MY DETECTOR READ MY OWN COMMENT AS CODE.**
    Ops opened the eleventh; `renders one card per pinned name, in pin order`
    uses a **literal array**, `buildDeskRow` and `selectFocusRows`, and **no repo
    symbol at all** — `selectFocusRows` takes the ticker list as an argument, it
    does not fetch one. **My script appended every matching token to the
    last-seen `it()` with no block-end tracking**, so the word `focusRepo` in the
    restoration comment BELOW that case was attributed to it. **THE FOURTH TIME
    TONIGHT A COMMENT HAS BEEN READ AS CODE, AND THE FIRST TIME IT WAS A COMMENT
    I WROTE MYSELF.**
  - **AND `MCP CONTRIBUTES ZERO` WAS WRONG TOO, FOR A DIFFERENT REASON: I
    SEARCHED FOR THE WRONG TOKEN.** I grepped `get_focus`, found it only inside
    arrays, and generalised to the whole surface. **Two real cases exist under
    other names** — `passes no seed candidates when reading Focus`
    (`tests/mcp/readOnly.test.ts:91`) and `never seeds Focus from a review read`
    (`tests/review/readOnly.test.ts:126`), the second a **hard delete**: it
    `readFileSync`s `[token]/api/focus/route.ts`, which the atom removes, so it
    throws rather than passing vacuously. **A negative from one token is not a
    negative for the subject.**
  - **THE RECONCILED ARITHMETIC: removed 12 (10 + 2), added 3 guards, NET −9.**
    Ops's number is right. **I will not dress this up as a scope difference —
    my removals-only figure for that file should have been 10, and the MCP claim
    was an error of search term rather than of boundary.** What IS a genuine
    scope point is worth keeping: **a shared number that means two things is its
    own failure**, so the pre-registration now reads **net over the atom**.
  - **THE ALARM STILL STANDS AND IS THE PART THAT MATTERED:** **`−18` means the
    file went again.** Ops is removing the 10 plus the module-scope import and
    keeping 13, and is **reporting the actual rather than the expected.**
- **A COUNT IS A DETECTOR, NOT A MEASURE.** The suite total went UP to 1871
  while the coverage of pin/unpin/limit went DOWN — those moved from exercised
  (against the repo) to source-asserted (against the hook), and no total can
  show that. **The file count is the control for the test count**: a real
  deletion moves the test count alone, a torn-down worker moves both.
- **Terminology is trader-facing.** Labels that describe engine internals get
  rejected — `LATCH` was removed for exactly this. Say it in the language of the
  stock, not the pipeline.
- **An observation sent to the routing seat comes back as an instruction, with
  authority attached.** On 2026-09-04 I sized a supply fallback against a blank
  screen I had never opened; Integration turned that sizing into a build order
  without opening it either, and only a render-path check before writing code
  stopped it. **Mark the confidence of a claim when reporting it** — "I have not
  looked at this screen" travels, and an unmarked guess is indistinguishable
  from a finding once it has been relayed once.
- **Check the screen state before designing against it.** The design was for a
  blank that did not exist: `AutomaticIntelligence.tsx:361` already rendered the
  ledger. Same class as sizing the masked risk chip from four rows that
  short-circuited two branches earlier — describing a surface instead of opening
  it.
- **A grep for a leaf name misses every path that reaches it through the
  parent**, and from inside the search "nothing carries this" and "I searched
  for the wrong token" look identical. `supplyPair` was reported unreachable
  because it is not named in `deskRead.ts` — but `deskRead.ts:351` already binds
  the object it hangs off (`row.intelligence?.analysis?.dossier.structure`), so
  it was one property access away the whole time. **Search for the PARENT you
  would traverse, not the field you want.** Verified before accepting: the
  rendering is a small change in this thread's own file.
- **A test can pin a defect.** `cycleDetail`'s suite asserted
  `toContain('high is today')` on a string that could never be about today. The
  fixture-encodes-a-dead-world rule shows up as an ASSERTION too, and there it
  is worse: a fixture merely fails to catch, an assertion actively defends.
- **Verify on the live desk**, not fixtures. The one Phase 1 defect that reached
  production was invisible to local fixtures.
- **And verify it *after* the deploy, not only before.** Added 2026-08-23 with
  the shared rule in `README.md` (`abf38e1`), after the trader asked why Design
  would not be looking at its own work. It could not — a change cannot be checked
  on production before it is on production — and nothing sent it back afterwards.
  **Ops confirms the deploy; Design confirms the behaviour.** A change is not
  finished at the handoff. It is finished when this thread has looked at the real
  board.
- **The deploy window does not constrain this thread's work.** Reframed by the
  owner 2026-08-23 (`233c11f`): the desk is *a product being built, not a tool
  being depended on*, and a board broken during RTH costs him a board, not a
  trade. **But the constraint that replaced it is stronger, not weaker** — *"a
  premarket the desk fails to capture is permanently gone"*, because the record
  grows only in real time. The question before a deploy is **"can this interrupt
  capture?"**, and for everything in `components/` and `lib/dashboard/` the
  answer is no. **Do not read this as "market hours are free"** — it is narrower
  than that and the README says so explicitly. Research's schema deletion after
  the cycle cutover touches the store and keeps the old care.
- **Live verification is any trading morning, not one window.** Discovery
  populates from 04:00 every session, and 10:30 on any weekday gives more names
  than premarket does, with no token expiring underneath the work. Planning
  around a single premarket slot was a self-imposed constraint.
- **A string count over a page conflates controls with data — only a count over
  rows means anything.** Established 2026-08-24, and the evidence for it is that
  Ops broke it *while checking this thread's work*, an hour after reading and
  endorsing the refusal that stated it. Design declined to count `DAY 1` and
  `OFF HIGH` as a phase-name pass because they were **filter chips, not badges**;
  Ops then counted `given back` ×3 as an anomaly when all three were chip
  tooltips. Same trap, different string, one hour apart. **A rule its own
  endorser breaks within the hour is structural, not careless** — which is the
  same conclusion this desk reached about why no thread finds its own defects.
- **He trades PREMARKET, 04:00–09:30 ET, profit concentrated from 07:00. He does
  not trade RTH** — that is the exception, a dip trade or a genuinely strong
  mover. **So "before the open" is not a safety margin; the opening bell is
  roughly when his session ENDS.** Looking at the live board between 04:00 and
  10:00 ET means working in front of him. *(This file said "the only one seen
  during 07:00–10:00" — the README's window, wrong at both ends. Corrected
  2026-08-24.)*
- **Where the booklet and Adam differ, believe Adam — and check this file for
  places it restates the booklet.** Research found its own notes saying
  *"9:30–10:00 is the core"*, which is Cameron's core rather than his, sitting
  directly beneath the rule written to prevent exactly that. **A restated
  playbook fact is the failure mode; a linked one is not.** Design carried one
  instance, now fixed. The audit carries none — checked, not assumed.
- **This host is UTC+2 — every tool timestamp is SIX HOURS ahead of New York.**
  A vitest header reading `10:36`, a shell `date`, a commit time: all CEST.
  Verified 2026-08-24: local `10:51`, UTC `08:51`, **ET `04:51`**. Read it
  explicitly rather than inferring it —
  `node -e "console.log(new Date().toLocaleString('en-US',{timeZone:'America/New_York'}))"`.
  **It survived a whole night because a wrong timezone produces a *plausible*
  time**, so nothing prompts a check — the same shape as a correct-but-narrow
  number. Two threads called the market open at 04:45. **And `PREMARKET` means
  premarket *capture* is live, not that trading is.** The codebase is clean; the
  hazard is entirely in reading tool output.
- **A fixture can encode a world that has stopped existing, and stay green
  through the outage it should have caught.** `resolveRisk`'s tests all passed a
  dossier `displayedFloat` of 4 M or 12 M. That field went null in production on
  **2026-08-20** and stayed null, so the suite tested a shape the live desk no
  longer had — and remained green for thirteen days while two branches, including
  the board's only positive chip, were unreachable. **A fixture's job is to carry
  the production shape, not a convenient one**, and when a field's real
  distribution changes the fixtures are stale even though nothing edited them.
  Fixed at `d8794da` by adding the null case.

  **This is the third instance of one shape in this thread** — with the `Move`
  label at `CLOSED` and the four-row risk-chip sample — and it is the most
  durable, because a fixture outlives whoever wrote it and is trusted by people
  who never saw the world it was written in.
- **An addition plan is a list of readers too — and unlike a deletion, it fails
  SILENTLY.** A deletion breaks its readers loudly; an addition simply never
  reaches them. Design sits at the end of these chains, so **this thread is where
  an addition silently fails to arrive.** Proven 2026-09-03: the activity columns
  were written, populated and climbing in production — 8,476 `UNKNOWN`, 328
  `DEAD` — while `toDemandState` never assigned the field, so the key was absent
  from `/api/market` entirely. Write path complete, read path never written.
  **Never assume a shipped column reaches this surface: check that the key
  exists on the payload, not that the migration landed.**
- **When a word has several numeric definitions, prefer a predicate that needs
  none.** Choosing one of them correctly still leaves the next reader choosing
  again. Established 2026-09-04: "the board" means `discoveryRank` 12
  (`config.ts:69`), the archive's ranks 1–25, and the UI's Top 12/25/50 — three
  live meanings differing by 4x. The graveyard filters on `deadAtRank !== null`,
  **presence rather than a threshold**, so it cannot pick the wrong number and
  does not move when he changes the view size. **Assert the absence of a
  threshold in the module**, not the correctness of one — the same way asserting
  a constant *references* config beats asserting its value.
- **A model consumer cannot ask a clarifying question, so a label must be true
  without context.** The `chatgpt-*` review routes were built so ChatGPT could
  read this desk — and ChatGPT is what *writes* the Sheet, so for a day in
  August the desk told the Sheet's own author that the Sheet was human-reviewed.
  That instance was a loop rather than a deception, because the one consumer able
  to know it was false was the thing producing it. **The general case is not.** A
  human reader who finds a label odd can ask; a model ingests it as a fact and
  propagates it. **So "he already knows better" is never a defence for a false
  label** — it holds only while every reader is him, and this is a product.
- **State what the count is RIGHT NOW before choosing a threshold.** Two triggers
  written on this desk in one day were keyed to a state the world was already in
  — "a second login" had already fired and could never fire again. The same
  family: expired tokens counted as active, `undefined` read as `UNKNOWN`, a
  `200` on a dead page, a key present with no value. **Four shapes of one
  failure, and the only reliable catch has been measuring the baseline rather
  than re-reading the rule.**
- **A check that cannot fail is not a check.** Before reporting anything
  verified, ask what result would have proved it *broken*. If the answer is
  "none available right now", the observation confirms nothing — say so instead
  of reporting a pass. Three instances surfaced on 2026-08-23 alone: a review
  link answering `200` while dead, a replay reporting stable versions having made
  no model calls, and this thread looking at the `Move` button at `CLOSED` phase,
  where the fixed and unfixed code render identically. Confirming a build is on
  the box is not confirming its behaviour changed.
- **Thread-to-thread traffic goes through Integration, not the trader.** Set at
  his instruction 2026-08-23 (`159baab`), after he was asked three times in one
  evening to carry a message between two threads.

  **Look the address up every time; never cache it.** `list_sessions` is the
  directory — it returns real titles (`Integration`, `Research`, `Ops`, `R&D`,
  `Coaching`) with their `sessionId` and `cwd`. Send with `send_message` using
  that `session_id`.

  **Four routes that do NOT work**, each recorded because this file asserted one
  of them: `ListAgents` names are opaque handles (`mointel-8c`, `claude-1a`) that
  map to no thread; `SendMessage` to a bare name works only while a session
  happens to surface in `ListAgents`, then fails *"No agent named … is
  reachable"*; copying a received message's `from` attribute as the `to` **WORKED ON
  2026-09-14** and this file was wrong to call it broken -- two sends by `from`
  address were answered substantively the same hour (`SendMessage` reported
  *"delivered; its turn has started"*), so it is the one route here proven by a
  reply rather than by a status code; and **as of 2026-08-27 a bare name
  can fail a fourth way — *"matches 2 agents by prefix"*, because retired
  sessions keep their titles (`Integration-retired1`, `Integration-retired2`) and
  the LIVE session does not win its own name.** Retirements accumulate, so this
  one gets worse with time rather than better.

  **A FIFTH ROUTE THAT FAILS SILENTLY, AND IT IS THE ONE THAT ACTUALLY BIT
  (2026-09-14): A CACHED NAME THAT RESOLVES TO A DORMANT SESSION.** *Three
  messages went to the seat titled `R&D` — the field spec, the constant-vs-lie
  finding, and the histogram request. `R&D` has been dormant since 2026-09-10.
  The live thread is `Research-tmi`.*

  **THE TOOL REPORTED SUCCESS EVERY TIME** — *`success: true`, "queued until that
  machine reconnects"* — **so nothing surfaced as a failure and I reported the
  messages as sent.** *That is not a broken tool; it is a queue to a seat that
  never comes back, and it is indistinguishable from delivery unless the caveat
  in the result is read as the finding rather than as boilerplate.*

  **THE CAUSE WAS CACHING THE NAME, WHICH THIS FILE WARNS ABOUT TWO LINES
  ABOVE.** *I carried `R&D` forward from a context summary instead of opening
  `list_sessions`, where `Research-tmi` sat one row away with a `cwd` of
  `A:\mointel` and activity twenty minutes old.* **The constellation renamed to
  `-tmi` suffixes and my address book did not.**

  **NOTHING WAS LOST, AND THE REASON IS THE METHOD RATHER THAN LUCK: every one of
  those three messages was COMMITTED TO THIS FILE BEFORE IT WAS SENT.** *Research
  read the spec off `7df7d17` and is building the engine half. A message is a
  courtesy; the file is the channel.*

  **Integration-tmi's redirect was right in substance — look the seat up in
  `list_sessions` and send by `sessionId` — and too broad in its claim that
  `SendMessage` fails on this machine.** *It does not: it delivered to two live
  local seats the same hour and both replied. What fails is addressing a seat
  that is not there, by any tool.*

  **This file previously said to address it by name and listed the `ListAgents`
  entries. That was verified true on 2026-08-23 and had drifted by 2026-08-24** —
  which is the reason for the lookup rule rather than an argument against
  verifying. A checked fact about a moving thing has a shelf life, and this one's
  was under a day.

  Integration relays with context the receiver lacks — but **relaying is not
  deciding**: anything needing the trader's judgement goes to him under *What I
  need from you*, directly, with no hop in between.
- **Check a review link by content, never by status code.** A revoked, expired
  or invalid token returns **200 with an error page**, not 401 or 404 — found by
  Ops, recorded 2026-08-23. A valid session is ~535 KB with `RVOL` present; a
  dead one is ~9.5 KB with zero occurrences. So a link that dies mid-verification
  gives no signal in the status, and a "page loaded" check would pass against a
  desk that is correctly withholding everything. Verify the payload is the desk
  before trusting anything read from it. `lib/review/` is Ops's.
- **Design cannot authenticate to the live desk, and that is a standing limit on
  the rule above.** The desk is behind Basic Auth and returns `401`; entering a
  password into a field is not something this thread does, on any
  infrastructure, with any authorization. **So live verification needs the owner
  to authenticate the browser first**, after which Design can drive and report.
  Recorded here because the rule was written without it and would otherwise look
  like a lapse the first time it is not met.
- **Commit each approved piece separately** and report the hash.
- Gate before every commit: `npm test`, `npm run lint`, `npm run typecheck`,
  `npm run build`.

