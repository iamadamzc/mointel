# Reports v6: plan and sequence

*Seat `local_5f4bfcf8` (Research-tmi), 2026-10-02. Integration's order: v6 is Research's next task, ahead of everything else.*

**His words** (a queued input in Integration's `1bfab363`, 2026-10-02T02:34:22Z): "what about the session report updates? there's still no opening narrative and no design element, its hard to read, this was brought up."

**His earlier ruling** (2026-10-01T01:44:16Z, verified by the previous seat): "a now, then b. but what i dont see in this report is an intro narrative. i dscusssed having an opening with a general narrative of the session which is being reported on, then down to the details of the tickers."

## What v6 is: ONE writer change, ONE checker re-freeze, ONE Commercial sample

| Part | What it is | Source of the requirement |
|---|---|---|
| **N. Opening session narrative** | A short opening paragraph about the session, above the ticker details, built ONLY from facts the store holds as of the checkpoint, each traced by the checker | His two rulings above; Marketing's candidate menu (research.md LIVE STATE, REPORTS v5 bullet) |
| **B. The design element** | Design's option B: computed tags on each report line (catalyst grade, whether the catalyst plausibly explains the move, cycle verdict, supply by ledger status, float verdict) instead of prose restating them, plus the reserved opening block for N | `design-archive-2026-09.md:6978` (row B), with Marketing's guardrails: never "sell"/"selling"; float only as a verdict; shares outstanding always dated; cycle in comma form |
| **a. Headings computed** | Section headings from stored status and grade, not model text. Design's (A) hides the model's headings until then | His ruling "b", 2026-10-01T02:24:33Z; research.md queue item (1)(a) |
| **b. Dates** | Date-only values printed as calendar dates, never shifted by a midnight-UTC conversion | Queue item (1)(b); proven on HIT |
| **c. Clocks** | A clock time prints only when a cited EXACT or INFERRED source carries that instant | Queue item (1)(c); proven false on CMCT #588 |
| **d. Citation tokens** | The citation strip in the report's research input, using the rule already built (`citations.ts`, including `a58aa866`), plus a checker guard | Queue item (1)(d) |
| **Checker input trim** | Cut the checker's input to what it checks (cost) | His "a, keep them running", 2026-10-01T01:27:53Z |
| **Stability probe** | Before the re-freeze, measure how often the model strikes TRUE lines on a re-run (run 3's single-run strikes) | Queue item (1); approved within his "3 yes", cap $10 |

## Sequence, with what each step needs and who it waits on

| Step | What | Needs | Waits on |
|---|---|---|---|
| **1** | **Research's proposal, no build.** (i) For each report kind, which session facts are checkable as of the checkpoint, and from which stored field: totals, the leader and its move, how many names cleared a threshold, catalyst mix by grade, halts. (ii) The tag fields for B, each from a named dossier field. (iii) The a to d fixes, by file. | Code and stored data only; no model call, no box read | Nothing. **This is the first step tomorrow morning, and it fits his 07:00 to 10:00 ET window** (reading and writing only). |
| **2** | **Stability probe**, pre-registered before any call | Model calls, cap $10 | Nothing; can run beside step 1's replies (API only, no box, no suite) |
| **3** | **Marketing:** the narrative's voice and length, and the tags' words (against the guardrails). **Design:** where the narrative and the tags sit on B, and which tags. | Step 1's proposal | Marketing-tmi and Design-tmi (both open) |
| **4** | **Build:** contract (narrative block plus tag fields, computed), writer v6, checker v6 (traces every narrative fact; citation guard; input trim), tests and mutants | Step 3's answers; step 2's result if it says the model half needs a change | Steps 2 and 3 |
| **5** | **Voice run on stored data** (harness committed before any call), then sample reports to Marketing and Design; **Design renders B with the real output** | Step 4 | Step 4 |
| **6** | **Checker frozen, pass bar pre-registered**, Marketing's fresh blind seed set (new classes: a false narrative fact, a wrong tag), N = 3, raw output committed before it is read | Step 5 passed by Marketing and Design | Marketing's set |
| **7** | Commercial reviews a sample | Step 6 passed | Commercial-tmi |
| **8** | Ops cuts (one full-suite slot), Design renders the cut, **his yes**, ship | Step 7 | Ops, Design, him |

## When he could first SEE it

- **First sight: step 5.** A narrative report rendered in Design's option B, on stored data. A sample to read, not yet live. It needs no gate to pass, only Marketing's and Design's answers in step 3 and the build in step 4.
- **Live: step 8.** The uncertain step is 6. v5's pass bar took four runs in one evening, and three failed, all on checker faults.
- **No clock time is given for either.** Each depends on two other seats' answers and on a pass bar that has failed more often than it has passed.

## Pre-registrations this plan commits to

- **Step 2:** the probe's design and its pass rule, before any call.
- **Step 1:** the narrative fact list, each fact with its stored source and how the checker traces it, BEFORE the writer prompt is written.
- **Step 6:** the pass bar, with the seeds' classes promised to Marketing before the freeze.
