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
written against real rows Research pulls from one past session — never invented.

---

## The four reports, and the stored checkpoints under each

The reports are not new observations. They are narrations of checkpoints the desk
already writes (`lib/desk/schedule.ts`). Each report reads across the checkpoints
in its window and says, in plain words, what the stored facts already say.

| Report | Fired going into | Reads from (schedule.ts) | His brief for it |
|---|---|---|---|
| **1. Into the premarket** | the trading day | `NEXT_DAY_RECAP` (22:00) + `STRUCTURAL_REFRESH` (06:10) + premarket scans (06:25/06:45/07:00) | "stocks to watch based on AH activity, in a true report narrative fashion" |
| **2. Into regular hours** | the 09:30 open | `OPEN_SPIKE_ASSESSMENT` (09:25) reading across the PM scans | "moved in PM, what went up and back down, what held, the real catalysts, what to keep an eye on" |
| **3. Into power hour** | ~15:00 | the `RTH_INTERVAL` checkpoints since the open | (same voice, RTH window) |
| **4. Into after hours** | the close | `RTH_CLOSE` freezing the regular session | (same voice, close of RTH) |

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

Five properties, each testable:

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
| **"no catalyst"** (bare) | The desk never claims none exists — only that its sources did not surface one. `language.ts` `NONE_FOUND: 'no catalyst found'`; the brief makes it explicit. | **"no catalyst found in our sources"** / "we found no catalyst on file". |
| **any outcome, return, profit, or "pop" as a promise** | Charter prohibition 2; "RH pop" is his phrase for a hoped-for move and is forward-looking. Nothing predicts a move. | Name what the desk sees set up — "at the high of day, held support into the close" — never what it will do next. |
| **certainty the desk cannot back** — "will", "clearly a", "confirmed" (unless a stored field says so) | Every claim must trace to a stored field. `intelligenceStatus`, `catalyst` grade, `cycle` are the only warrant. | State the stored grade. If the grade is soft, the sentence is soft. |
| **engine constants / SCREAMING_SNAKE** — `SECONDARY_STALE`, `AUTO_SOURCE_GAP`, `RED_BACKSIDE` | `language.ts`: these describe the engine, not the stock; humanised before they reach anyone. | The canonical spoken label — "backside", "secondary and stale". |
| **completeness** — "every name", "all the movers", "nothing else matters" | Charter prohibition; `commentary()` caps the list and drops quiet names rather than claiming coverage. | "The names that moved enough to mention" / name the top few and say so. |

---

## How the voice says "we don't know"

The desk has **three different absences**, and collapsing them is a defect the
product has already fixed once (`deskRead.ts`: "NOT ANALYZED … said the desk had
never looked — while the catalyst and structure conclusions sat next to it"). The
voice keeps them distinct, because a Warrior student can tell the difference and
the honesty is the whole point.

1. **We have not looked yet** — `NOT RESEARCHED` (`risk.ts:105`). The name is new
   or the research pass has not reached it.
   → *"The desk hasn't researched [NAME] yet."* Never dressed as "nothing there".

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

5. **The two research paths disagree** — `intelligenceStatus = CONFLICT`
   (`assessment.ts`: "research conflict appeared"). The voice **shows the
   disagreement, does not resolve it silently** (README, "An intelligence
   platform, not a signal platform"):
   → *"Our two reads on [NAME] disagree on the catalyst — we're flagging it rather
   than picking one."*

---

## Specimens — PENDING Research's rows

**Blocked on one input only:** real checkpoint rows for one past session, requested
from Research-tmi 2026-09-27. I will not write specimens against invented data.
When the rows arrive I will fill at least two of the four reports here and commit
again, so this file returns to Research complete.

Each specimen, when written, will be built strictly from stored fields
(`ticker`, `assessmentRank`, `price`, `sessionHigh/Low`, `haltState`, `catalyst`,
`structure`, `cycle`, `intelligenceStatus`, and the deterministic `changeSummary`)
and will be annotated line-by-line with the field each sentence restates, so the
checker can verify nothing was invented. The two I will write first:

- **Into regular hours (09:25)** — the fullest of his brief: what moved in PM,
  what held, what gave back off the high (exit read, not a short), the real
  catalysts by grade, and — inside Commercial's line — what is set up to watch,
  never a promised pop. It needs a session with at least one entry-and-held, one
  new-high-then-giveback, and one no-catalyst-found or conflict name, which is why
  I asked Research for texture.
- **Into the premarket** — the recap-plus-AH narration, showing the "we don't
  know" register on a name the desk has not yet researched.

---

## For Commercial — where I am writing near the line, and unsure

Commercial owns where commentary ends and advice begins. I am writing inside that
line; these are the specific phrases where his brief sits closest to it, flagged
for a ruling before build:

1. **"what to keep an eye on for RH pop" (his words).** "Pop" is a forward, upward
   outcome; "keep an eye on" is close to a watch recommendation. My reading: the
   voice may name what the desk *sees set up* from stored state (at HOD, held
   support, fresh frontside) but may **not** say it will pop or imply the reader
   should watch it *to trade it*. Is even "one to watch" over the line? Needs
   Commercial.
2. **"the real catalysts" (his words).** I read "real" as the stored catalyst
   *grade* (legitimate-positive vs secondary/stale vs none-found), which is
   supportable. Confirming that rendering a grade the desk assigned is commentary,
   not advice.
3. **The forward-looking frame of a "going into [session]" report at all.** A
   report titled "into RH" implies a look ahead. My design keeps every sentence
   about *observed* state and the *stored* setup, with no prediction — but the
   framing itself is forward, and Commercial should confirm the frame is safe.

**Not for him piecemeal — this returns to Research**, who assembles the four-seat
design and takes it to him as one thing.
