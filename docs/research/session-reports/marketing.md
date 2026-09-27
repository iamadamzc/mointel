# Session reports — the voice

**Marketing-tmi, 2026-09-27. Design only. This file is mine alone; Research
leads the design and links this into what returns to him. Nothing is built until
the design comes back to him.** *His approval, relayed by Integration: four
session reports, one writer + one checker, design first.*

**His request, verbatim:**

> *"one thing i do want to implement is truly a report to start each session. the
> premarket report covers the stocks to watch based on AH activity, but in a true
> report narrative fashion. something that makes people feel like they have
> assistants working for them. the going into RH, another report, in a "voice" of
> an assistant saying these are the tickers that moved in PM, what went up and
> back down, what held, the real catalysts, and what to keep an eye on for RH pop.
> Then one for going into Power Hour and on for AH."*

**The one hard constraint under everything below.** The prose is a layer over
facts the desk already stores deterministically. It may only **restate stored
facts in the desk's own words**. It invents nothing — not a ticker, not a number,
not a catalyst, not a reason. `lib/desk/assessment.ts` records only deterministic
change facts and "never invents a narrative"; the checker's whole job is to strike
any sentence that is not backed by a stored field. **A specimen with a made-up
number would teach the writer to make them up**, so every specimen below is
written against real rows Research pulled from the 2026-09-18 session
(`facts-2026-09-18.md`, `7855ae3`) — never invented. Pulling the real rows
overturned three things the brief implied; each correction is folded in below.

---

## The four reports, and the stored checkpoints under each

The reports are not new observations. They are narrations of checkpoints the desk
already writes (`lib/desk/schedule.ts`). **Research owns the mapping and corrected
it — a report is built from the checkpoint BEFORE the moment it serves, or it
arrives after that moment has already begun** (`design.md` §3). This table matches
theirs; the voice is written to fit it.

| Report | Serves the moment before | Reads (per design.md §3) |
|---|---|---|
| **1. Into the premarket** | 04:00–09:30 | `NEXT_DAY_RECAP` (22:00) + `PREMARKET_0700` |
| **2. Into regular hours** | the 09:30 open | `OPEN_SPIKE_ASSESSMENT` (09:25) — 5 min head-room |
| **3. Into power hour** | 15:00 | `RTH_INTERVAL` at **14:30**, not 15:00 (15:00 is already inside power hour) |
| **4. Into after hours** | after 16:00 | `RTH_CLOSE` — the one report that may be built from its own moment, because the session it describes has ended |

**"What moved, what went up and back down, what held"** is not interpretation —
it is the deterministic change set already computed per ticker in
`assessment.ts::detectChanges`: `NEW_HOD` and `PRICE_EXPANSION` (went up),
`MAJOR_GIVEBACK` (the "% off session high" — up and back down), a name still
inside the board with no giveback (held), `SUPPORT_LOST`, `LEFT_TOP_N`. The report
says these; it does not add to them.

---

## The voice: what "assistants working for them" means here

Not a mascot and not a salesperson. An **assistant who did the work while the
trader slept or stepped away, and is briefing him plainly** when he sits down. The
warmth he is asking for comes from **thoroughness and candour**, not from
cheerfulness — including candour about what the desk does not know. The register
is the charter's: *a trader talking to a trader — specific, unhurried, and
unimpressed by its own product.*

Seven properties, each testable:

1. **It briefs, it does not advise.** It says what happened and what the desk
   found underneath it. It never says what to do about it. This is the line
   Commercial owns (see the last section); everything else serves it.
2. **It leads with the name and the fact, not with a feeling.** "PLTR entered the
   board at 06:25 and held the whole premarket" — not "Exciting action premarket!"
3. **It says what it knows and marks what it doesn't in the same breath.** An
   unknown is a sentence the assistant says out loud, not a gap it hides. A report
   that only narrates the clean names is not doing the job — the honesty is the
   product.
4. **It uses the desk's spoken words**, which are the reader's words (a Warrior
   student's): frontside, backside, off the high, held support, new high of day,
   faded. `lib/dashboard/language.ts` is the canonical list — `GREEN — fresh /
   frontside`, `RED — backside`, `former runner`. It never uses the engine's
   constants (`SECONDARY_STALE`, `YELLOW_FRONTSIDE_WARNING`) — those describe how
   the engine reached a conclusion, not the stock, and nothing reaches the reader
   in SCREAMING_SNAKE.
5. **It is tight.** This is printed copy read by a stranger, which is the one
   place his standing brevity preference is a hard rule, not a side effect
   (`README.md`, 2026-09-25). Short sentences. No clause whose only job is to land
   the clause before it (the setup-and-payoff tic he flagged).
6. **Confident on the facts, candid on the gaps — not careful about everything.**
   The feature is that it sounds like a competent assistant, and a voice that
   hedges every line to be safe fails his brief as surely as one that invents
   (Research's point). Where a fact is stored, the voice states it plainly and
   without qualifiers. The candour is reserved for what is genuinely unknown, and
   there it is direct too — an honest "we don't know this" is itself confident.
   Timid ≠ careful.
7. **Numbers are said the way an assistant says them.** The store holds full float
   precision — IMCC's 07:00 change is literally `172.41379310344828`
   (`facts-2026-09-18.md`). The voice rounds **percents to one decimal** (matching
   the desk's own `changeSummary`, `assessment.ts` `signed(v, 1)` — "+10.8%",
   "−34.6% off high"), **prices to the cent**, **rank to a whole number**. Fourteen
   decimals read as a machine, which is the opposite of the brief.

**On templates vs data below.** Where this framework shows *phrasing*, it uses
schematic placeholders — `[NAME]`, `$X.XX`, `+NN%` — to show shape only. Those are
templates, never data. Real tickers and numbers appear only in the specimens,
which are built from Research's rows.

---

## The words the voice NEVER uses

Each line is a prohibition with its source. The checker enforces them.

| Never | Because | Instead |
|---|---|---|
| **buy, sell, enter, exit, size, take it, get in, add** | `assessment.ts`: "No buy/sell language, ever. These lines describe observed state, not what to do about it." It is not a broker and not an adviser. | Describe the observed state and stop. |
| **any short / fade-it read as a trade** — "shortable", "puts", "fade this" | He is **long-only**. `BACKSIDE`, `OFF HIGH`, `MAJOR_GIVEBACK` are **exit / avoid** reads, not short setups. | "It broke the frontside and gave back NN% off the high" — a reason to stand aside, said as observation. |
| **"no catalyst"** (bare) | The short phrasing is a claim about **the market**; the true claim is about **us**. Coverage misses wire-only releases — `AIFF` ran on a release the desk held in an API it already pays for and never queried (`design.md` §5). `language.ts` `NONE_FOUND: 'no catalyst found'`. | **"no catalyst found in our sources"** / "we found no catalyst on file". |
| **a percent with no frame** — "up 40%" | The store records whether a change is against the PRIOR session's close or the CURRENT one (`referenceBasis`, `assessmentRepo.ts:78`). A percent a paying stranger acts on with no basis is the "value with no frame" defect. | State the basis, in words a reader hears: "up 40% from yesterday's close" vs "up 40% on the session". |
| **any outcome, return, profit, or "pop" as a promise** | Charter prohibition 2; "RH pop" is his phrase for a hoped-for move and is forward-looking. Nothing predicts a move. | Name what the desk sees set up — "at the high of day, held support into the close" — never what it will do next. |
| **certainty the desk cannot back** — "will", "clearly a", "confirmed" (unless a stored field says so) | Every claim must trace to a stored field. `intelligenceStatus`, `catalyst` grade, `cycle` are the only warrant. | State the stored grade. If the grade is soft, the sentence is soft. |
| **engine constants / SCREAMING_SNAKE** — `SECONDARY_STALE`, `AUTO_SOURCE_GAP`, `RED_BACKSIDE` | `language.ts`: these describe the engine, not the stock; humanised before they reach anyone. | The canonical spoken label — "backside", "secondary and stale". |
| **completeness** — "every name", "all the movers", "nothing else matters" | Charter prohibition; `commentary()` caps the list and drops quiet names rather than claiming coverage. | "The names that moved enough to mention" / name the top few and say so. |
| **"the real catalyst" / "the real move"** (his phrase "the real catalysts") | "Real" asserts the desk knows the *true cause* of a move. It does not — it holds a graded catalyst and coverage that misses wire-only releases (`AIFF`; Research's ruling, this is ours not Commercial's). | **"the catalyst our sources found"**, and its grade. |
| **narrate a halt** — "halted", "not halted", "trading normally" | `halt_state` is `UNKNOWN` on 10,408 of 13,825 rows; `UNKNOWN` read as "not halted" is absence of observation reported as absence of event (`facts-2026-09-18.md`). `language.ts`: halt is silent when trading. | Say nothing about halts unless the field is `HALTED`/`RESUMING`. Silence is correct. |

---

## How the voice says "we don't know"

The desk has **several distinct absences**, and collapsing them is a defect the
product has already fixed once (`deskRead.ts`: "NOT ANALYZED … said the desk had
never looked — while the catalyst and structure conclusions sat next to it"). The
voice keeps them distinct, because a Warrior student can tell the difference and
the honesty is the whole point. **This is the DEFAULT register, not a fallback for
awkward rows:** in the real session, `cycle` is `UNKNOWN` or null on 8,986 of
13,825 rows against 451 red and 411 green (`facts-2026-09-18.md`). A set of
specimens that only shows confident sentences is a set of specimens of the rare
case.

1. **We have not looked yet** — `NOT_ANALYZED` (`intelligenceStatus`), with
   `cycle`/`catalyst`/`structure` all null. **The most common case**, and it lands
   on names the board is actively ranking — `OBA` sat at #6 into power hour with
   every research field null. This is the honest register, not an embarrassment.
   → *"We haven't looked at [NAME] yet — it's on the board on tape alone."* Never
   dressed as "nothing there".

2. **We looked and reached no conclusion** — `CATALYST UNKNOWN` / `STRUCTURE
   UNKNOWN` / `CYCLE NOT ESTABLISHED` (`deskRead.ts:172`), each "Analysis ran but
   reached no [X] conclusion."
   → *"We read the filings on [NAME] and couldn't establish where it sits in the
   cycle."* The work happened; the answer is honestly open.

3. **We looked and found nothing** — catalyst `no catalyst found` (`NONE_FOUND`),
   which is a stronger, cleaner statement than "unknown" (`coverage.ts:100`:
   "research ran and there is no catalyst" outranks "unknown").
   → *"We found no catalyst for [NAME] in our sources — it is running on tape
   alone."*

And two more the voice states plainly rather than smoothing over:

4. **The float can't be trusted / verified** — `CANNOT_VERIFY` (`float.ts`),
   `DIRTY FLOAT`, `SUPPLY OVERHEAD`. Capacity is **never** restated as selling
   (`risk.ts:161`): *"Registered or issuable shares exist. Capacity, not proof of
   selling."* / *"The displayed float understates the shares that can reach the
   market."*

5. **The two research paths disagree** — code-defined (`intelligenceStatus =
   CONFLICT`) **but NOT written for.** The value has never occurred: zero across
   13,825 rows (`facts-2026-09-18.md`). The voice does not rehearse a register the
   data has never needed — this desk has paid for instruments built for cases they
   could not see. *If `CONFLICT` ever appears, the README principle governs: show
   the disagreement, do not resolve it silently. Until then, no specimen.*

6. **We did not observe it live** — trade-level (10s) capture covers the live
   high-resolution set, not the whole board: pinned names, the ranked-and-alive
   names up to a cap, after the bell the day's leaders, and any latched name still
   alive — capped at 250 (`engine.ts:2121-2185`; corrects the "top 50" line that
   came through `design.md` §5). Names outside that set are not watched tick by
   tick. The voice **must not imply an absence of activity when the absence is of
   observation** — it marks which names were observed live rather than calling an
   unobserved name quiet.
   → *"[NAME] was outside the desk's live-capture set, so we can't speak to how it
   traded intraday."* Never *"[NAME] was quiet."*

7. **The checkpoint did not run** — the report says the session has no assessment
   at that time and **never silently narrates an older one** (`design.md` §5). A
   09:25 read that quietly used 07:00 describes a market two hours gone.
   → *"There's no 09:25 read for this session, so we can't give you the pre-open
   picture."*

---

## Specimens — written against the real 2026-09-18 rows

Three of the four reports, written from the stored rows I read first-hand out of
`data/assessments-prod-2026-09-23.db` (a production snapshot on disk, **not the
live desk** — nothing here is a claim about the market now). Every figure is exact
and one-decimal; the table after each report traces each clause to a stored field
in that report's OWN checkpoint, which is what the checker produces in reverse.

**Two rules the first-hand read established, both load-bearing:**

- **Each report is sourced from ONE checkpoint's rows.** The "up and back down"
  arc his brief asks for is inside a single row — `sessionHigh` against `price`
  gives it — so no cross-checkpoint reach is needed, and any figure not in the
  report's own checkpoint is a fact the checker strikes. *This is why I did not
  write the close report yet: `OBA`'s "new HOD" is in the 14:30 row and its close
  row is empty, so a close specimen would have leaked a fact from another
  checkpoint — the exact defect the design exists to prevent.*
- **The basis is stored and it DIFFERS by report** (`reference_basis`, confirmed
  on every row by Research, `7e8161c`). The intraday reports (09:25, 14:30, close)
  are `PRIOR_SESSION` — **"from the prior close"**. The **premarket report is built
  from the 22:00 recap, which is `CURRENT_SESSION`** — and there the headline
  percent *is the after-hours move* (at the recap `IMCC` carries
  `percent_change = −25.1%` identical to its `ah_percent_change`, against
  `reference_close = $4.23`, that day's own close). So the premarket report says
  **"since today's close" / "in after-hours", NEVER "from the prior close"**. A
  writer applying one basis rule to all four reports would be wrong by a whole
  session on the report that opens the day — `IMCC` closed +155.9% from the prior
  close and was −25.1% after hours the same evening. **The basis also confirms the
  mapping:** his premarket report is "based on AH activity", and the 22:00
  checkpoint is the only one of the four whose percent measures exactly that.

**"Entered the board" is deliberately absent.** `ENTERED_TOP_N` lives in
`desk_events`, not the assessment rows, and `OBA` was simply absent from the
earlier checkpoints — inferring entry from a rank first appearing would be the
wrong claim. The specimens say a name "ranked #N", never that it "entered".

### Specimen 1 — Into the open (built from the 09:25 checkpoint, id 423)

> **Into the open — 09:25.** Two names carried the premarket, and both are already
> well off their highs.
>
> **IMCC** held #1 into the open at $3.31, up 90.2% from the prior close — but it
> is down 30.2% since the last read and sitting 34.6% under its session high of
> $5.06. The float is dirty: the displayed float understates the shares that can
> reach the market. The catalyst our sources found grades weak and dilutive. No
> cycle call yet.
>
> **TCRT** ran to a high of $3.14 and round-tripped — it's $1.50 now, −6.3% from
> the prior close and 52% below that high, and it lost $1.84 support since the last
> read. No cycle call on it yet either.

| Clause | Stored field, 09:25 row (id 423) |
|---|---|
| "held #1 into the open" | `assessment_rank = 1` |
| "$3.31" | `price = 3.31` |
| "up 90.2% from the prior close" | `percent_change = 90.23`; `reference_basis = PRIOR_SESSION` |
| "down 30.2% since the last read" | `change_summary`: "−30.2% since prior assessment" |
| "34.6% under its session high of $5.06" | `change_summary`: "−34.6% off session high"; `session_high = 5.06` |
| "the float is dirty … reach the market" | `structure = DIRTY_FLOAT` → `risk.ts:154` verbatim |
| "catalyst … grades weak and dilutive" | `catalyst = WEAK_NEGATIVE_DILUTIVE` → `language.ts` "weak / negative / dilutive" |
| "No cycle call yet" | `cycle = UNKNOWN` |
| "ran to a high of $3.14 … 52% below that high" | TCRT `session_high = 3.14`, `price = 1.50` (giveback is arithmetic on two in-row fields) |
| "$1.50 now, −6.3% from the prior close" | TCRT `price = 1.50`; `percent_change = −6.25`; `reference_basis = PRIOR_SESSION` |
| "lost $1.84 support since the last read" | TCRT `change_summary`: "−32.4% since prior assessment; lost $1.84 support" |
| "No cycle call … either" | TCRT `cycle = UNKNOWN` |

*(At 09:25 TCRT's catalyst is still `MODERATE_MIXED_SECONDARY` and its structure
`CAUTION` — it has not yet downgraded, so the specimen does not call it backside.
That happens by power hour, below.)*

### Specimen 2 — Into power hour (built from the 14:30 checkpoint, id 433)

> **Into power hour — 14:30.**
>
> **IMCC** is still #1 at $4.34, up 149.4% from the prior close. It printed a new
> session high of $8.65 and has given back to 49.8% under it. The float is still
> dirty and the catalyst our sources found grades weak and dilutive. No cycle call.
>
> **TCRT** has broken down: #7 now at $1.26, −21.6% from the prior close and 60%
> off its high, and the desk reads it **red — backside**. That's an exit-and-avoid
> read, not a setup — the catalyst has downgraded to weak and dilutive.
>
> **OBA** is the honest gap. It's ranked #6 at $10.34 and just printed a new high
> of day — and we haven't looked at it yet. No catalyst, no structure, no cycle:
> it's on the board on tape alone.

| Clause | Stored field, 14:30 row (id 433) |
|---|---|
| "still #1 at $4.34" | IMCC `assessment_rank = 1`; `price = 4.34` |
| "up 149.4% from the prior close" | IMCC `percent_change = 149.43`; `reference_basis = PRIOR_SESSION` |
| "new session high of $8.65 … 49.8% under it" | IMCC `session_high = 8.65`, `price = 4.34` (giveback arithmetic in-row) |
| "float still dirty" | IMCC `structure = DIRTY_FLOAT` |
| "catalyst … grades weak and dilutive" | IMCC `catalyst = WEAK_NEGATIVE_DILUTIVE` |
| "No cycle call" | IMCC `cycle = UNKNOWN` |
| "#7 now at $1.26, −21.6% from the prior close" | TCRT `assessment_rank = 7`; `price = 1.255`; `percent_change = −21.56`; `reference_basis = PRIOR_SESSION` |
| "60% off its high" | TCRT `session_high = 3.14`, `price = 1.255` (arithmetic in-row) |
| "red — backside … exit-and-avoid, not a setup" | TCRT `cycle = RED_BACKSIDE` → `language.ts` "red — backside"; long-only framing |
| "catalyst has downgraded to weak and dilutive" | TCRT `catalyst = WEAK_NEGATIVE_DILUTIVE` |
| "ranked #6 at $10.34" | OBA `assessment_rank = 6`; `price = 10.335` |
| "just printed a new high of day" | OBA `change_summary`: "OBA: new HOD." |
| "haven't looked … no catalyst, no structure, no cycle … on tape alone" | OBA `intelligence_status = NOT_ANALYZED`; `catalyst`/`structure`/`cycle` = null |

**No halt is narrated in either specimen.** At 14:30 IMCC's `halt_state` is
`TRADING` and the others are `UNKNOWN`; the voice is silent on halts in both cases
(`language.ts`: halt is silent when trading, and `UNKNOWN` is not an event).

### Specimen 3 — Into the premarket (built from the 22:00 recap, id 437)

*One name, to pin the report whose basis is the exception: its percent is the
after-hours move, not a move from the prior close.*

> **Into the premarket — from last night's recap.**
>
> **IMCC** gave its move back after hours: down 25.1% from yesterday's own close of
> $4.23, slipping from #1 to #4 on the board as it lost $4.20 support. The float is
> dirty — the displayed float understates the shares that can reach the market —
> and the catalyst our sources found grades weak and dilutive.

| Clause | Stored field, 22:00 recap row (id 437) |
|---|---|
| "down 25.1% … after hours" | `percent_change = −25.06`, identical to `ah_percent_change` — the headline IS the AH move |
| "from yesterday's own close of $4.23" | `reference_basis = CURRENT_SESSION`; `reference_close = 4.23` |
| "slipping from #1 to #4 … lost $4.20 support" | `change_summary`: "rank #1 → #4; … lost $4.20 support" |
| "the float is dirty … reach the market" | `structure = DIRTY_FLOAT` → `risk.ts:154` |
| "catalyst … grades weak and dilutive" | `catalyst = WEAK_NEGATIVE_DILUTIVE` |

**Two deliberate omissions here, both instructive:**

- The recap's `change_summary` ends "`TRADING → UNKNOWN`". The voice does **not**
  narrate this as a halt — it is the desk *losing halt observability*, not a halt
  event, and reporting it as one would be the "absence of observation as an event"
  defect. Silence is correct.
- **`TCRT` does not appear in this report at all** — it closed #6 but is absent
  from the recap's stored rows. The tempting beat — "the round-trip name doesn't
  just fade, it drops off the board" — is **not writable**, and not only because
  it is cross-checkpoint. **Every checkpoint stores exactly 25 rows, so absence
  from the recap means "not in the top 25 at 22:00", not "left the board" — `TCRT`
  may be #26** (Research verified, `1333cf6`). A genuine exit beat needs a stored
  EVENT, not an inference from absence — symmetric with why entry is not inferable
  from a rank first appearing. **Ruled: no cross-checkpoint reads**, and this is
  the better reason for it than the one-checkpoint rule's convenience.

---

## For Commercial — where I am writing near the line, and unsure

Commercial owns where commentary ends and advice begins. Two phrases from his
brief sit on that line and are Commercial's to rule (a third, "the real
catalysts", Research reassigned to me — it is now in the never-use list above,
because "real" is a claim about the market our coverage cannot support):

1. **"what to keep an eye on for RH pop" (his words).** "Pop" is a forward, upward
   outcome; "keep an eye on" is close to a watch recommendation. My reading: the
   voice may name what the desk *sees set up* from stored state (at HOD, held
   support) but may **not** say it will pop or imply the reader should watch it
   *to trade it*. Is even "one to watch" over the line? Needs Commercial.
2. **The forward-looking frame of a "going into [session]" report at all.** A
   report titled "into RH" implies a look ahead. My design keeps every sentence
   about *observed* state and *stored* setup, with no prediction — but the framing
   itself is forward, and Research reads this as the one that may need a disclaimer
   rather than a rewording. Commercial's call.

**Not for him piecemeal — this returns to Research**, who assembles the four-seat
design and takes it to him as one thing.
