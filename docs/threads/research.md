# Thread: Research Pipeline

**Owns what the desk knows and what it pays to know it.** Evidence collection,
source resolution, the interpreter, dossier quality, and the OpenAI bill.

Last worked: **2026-08-21**. Written up 2026-08-23.

## Why this is its own thread

Every one of these arrived looking like a production incident and was actually a
research-pipeline decision about cost:

| Date | What happened |
| --- | --- |
| 2026-08-18 | 403 research jobs in a day, >12M input tokens — duplicate recovery and qualification work |
| 2026-08-19 | Interpreter dead on an empty OpenAI balance; diagnosis cost a live API probe |
| 2026-08-20 | 6.68M input tokens drained the balance again |
| 2026-08-21 | Whole Top 12 dark from 04:00–08:00 ET; 58 failed jobs across 21 tickers, 112 model calls, 0 tokens |

Ops kept absorbing these. The fix is always in `lib/research/`.

## Scope

- `lib/research/` — queue, retry policy, provider errors, interpreter
- Source resolution and catalyst collection; the resolver-first path and the
  urgent first-qualification path for a newly qualifying Top-12 name
- Dossier grading and honesty: `UNKNOWN` and `PARTIAL` are real verdicts, not
  failures
- Model selection and token budget

Background on how the pipeline was built and why:
[../RESEARCH-MILESTONE-PLAN.md](../RESEARCH-MILESTONE-PLAN.md).

## Not this thread

- Deploying → [ops.md](ops.md)
- How dossiers are *presented* → [design.md](design.md)
- **The market archive and the market-structure question** →
  [rnd.md](rnd.md). Split out 2026-08-23: this thread generates incidents, and a
  thread owning both an incident stream and an open research question will only
  ever work on the incidents. This thread's job is that the pipeline produces
  honest catalyst grades at a defensible cost. What those grades *mean* is R&D.

## State as of 2026-08-21

Research is running normally after a manual recovery at 08:11 ET. Seven of the
board's twelve names carried a fresh grade within minutes; IBG recovered on its
own and the two failures around the release were the credit refresh propagating.

Token ceiling is now **10M** (up from 4M on the 19th).

Diagnosis of the 21st took a single query, because `372f5eb` records
`credit_balance_exhausted` rather than a bare `HTTP 429`. That was worth it.

Recovery was done **by criteria, never by ticker name** — `last_error LIKE 'HTTP
429%'` **and** on today's Top 12 or focus list **and** no analysis today. Seven
released, twenty-one obsolete movers correctly left blocked. Repeat that pattern
if it happens again.

## Open items

**1. Billing-class failures should not consume the retry budget.** This is the
one concrete piece of unfinished code in the project.

`evaluateRetry` in [`../../lib/research/retry.ts`](../../lib/research/retry.ts)
releases a blocked ticker only when the *evidence fingerprint* changes. A
billing failure does not change evidence, so a name that fails three times on an
empty balance stays hard-blocked after you top up — and the whole board needs a
manual release.

`BILLING_ERROR_CODES` already exists in
[`../../lib/research/providerError.ts`](../../lib/research/providerError.ts) and
tags these correctly. Excluding billing-class failures from the attempt count
makes a top-up self-healing.

**Done 2026-08-23 in `2433470`, and now deployed.** Ops shipped it as part of
`fd9556f` on 2026-08-23; the research worker restarted onto it, so the exemption
is live in production. Billing failures back off and record but never become
terminal, so a top-up heals the board on its own; backoff is capped at fifteen
minutes so an exempt failure cannot schedule a name past the close.

Worth doing next, and deliberately not built here: **the cooldown is per-ticker
when the fact is global.** "The account is empty" is one truth, and twenty-one
tickers each discovering it separately is twenty-one probes for one answer. A
single global gate would be strictly better.

**2. Ten QUEUED jobs the health endpoint does not see.** *Handed over from Ops,
2026-08-23 — found while verifying a deploy, not investigated here.*

`research_jobs` on production holds `QUEUED` 10, `COMPLETE` 120, `PARTIAL` 619,
`FAILED` 215, while `/api/health` reports `research.queuedJobs: 0` and
`state: IDLE`. Either those ten are abandoned rows from an earlier trading date
that nothing will ever pick up, or the health count is scoped in a way that
hides real backlog. Both are worth knowing, and they want opposite fixes.

Related and probably the same scoping question: `research.lastCompletedAt` read
`2026-08-21T22:25:11.901Z` before the worker restarted and `null` after, while
`max(completed_at)` in the store still returns that same timestamp. No job ran in
between. Ops did not dig further — it is display logic over this thread's data.

**3. Interpreter tiering was designed but never exercised.** `Terra` is the
default full research model. The abstraction was deliberately preserved so `Sol`
could take difficult or conflicting dossiers and `Luna` could do low-cost change
detection. Nothing routes to them today, and cheap change detection is the
obvious lever on a 6M-token day.

**5. The Sheet is written by a ChatGPT scheduled task, and the desk calls it a
human review.** *Handed over by Integration 2026-08-23, after the trader said
he has never reviewed anything in the Sheet and does not put anything into it.
The label question is Design's; the merge semantics are this thread's.*

Verified in the code, not inferred: the desk's access is
`spreadsheets.readonly` and `drive.metadata.readonly`
(`lib/data/providers/googleSheets.ts:22`), and **nothing in `lib/`, `worker/`
or `app/` writes to the Sheet**. So the input is produced entirely outside this
system, by an automation no charter mentions and no thread owns.

That makes `SHEET` provenance not hollow but **mislabelled**.
`lib/dashboard/language.ts:23` renders `SHEET_ONLY` as *"only the human review
reached a conclusion"*, and `lib/dashboard/intelligence.ts:171` as
*"Human-reviewed research only"*. Both describe another model's output. This
thread's first working rule is that facts come from deterministic parsing and
the model only interprets, with `UNKNOWN` preferred to a fabricated
classification. A surface that reports one model's output as human review is
the same defect wearing a label.

**The question that decides how far it reaches, and it is not answered here.**
`lib/research/merge/sheetAuto.ts:361` only *compares* the Sheet's catalyst
bucket against the automatic grade — that is conflict detection and it changes
nothing. But `lib/research/merge/sheetPrior.ts:57` reads
`catalystGrade: ticker.catalyst.gradeRaw`, and the file is named for a prior.
**If that prior reaches the interpreter's context, the automatic catalyst grade
is influenced by the ChatGPT task's output rather than independent of it.** Read
`sheetPrior` and settle it plainly, because two other threads are downstream:
R&D's Q1 treats the stored catalyst grade as its independent variable, and the
conflict apparatus Design is deciding whether to delete rests on the two being
independent.

**Established 2026-08-23: it is not one task, it is four, and they are live.**
The trader produced a report from the ChatGPT side listing four weekday tasks
writing the workbook at **22:00, 06:10, 09:25 and 16:15 ET**, and describing a
substantial corpus — 204 `RESEARCH` rows, 96 `ARCHIVE`, 148 graded `OUTCOMES`,
nine dated tabs. **The Sheet is not a fossil and it is not empty.** What is
false is only the word *human*.

**Read that report's own §13 before using any of it.** It was written with no
access to this repository and with the MomoIntel connection expired — the
`chatgpt-mcp-7d` session Ops revoked. It is **first-hand on the Sheet and
second-hand on this application**; its architecture section comes from readouts,
not from the code, and it says so. Treat its Sheet numbers as evidence and its
claims about our pipeline as hearsay to check. It also calls the Sheet's output
*human conclusions* throughout, so the mislabel is not confined to our side.

**~~The timing collision.~~ Wrong, and retracted by Integration 2026-08-23.**
The claim was that because three of the four task times are this desk's
checkpoints and the tasks run 11-18 minutes late, a checkpoint reads a Sheet
stage before it has been written — `STRUCTURAL_REFRESH` at 06:10 seeing `T:AA`
blank. It is left here rather than deleted because it was written as *concrete
and checkable*, and it was checked, and it was false. Three separate reasons,
any one of which sinks it:

- **No checkpoint reads the Sheet.** `lib/desk/` mentions the spreadsheet once,
  in the historical comment at `schedule.ts:5`. Assessments are built from the
  market store.
- **The merge is not on the checkpoint clock.** The Sheet reaches it only
  through the research worker's poll loop — `loadSheetPriors()` at
  `worker/research.ts:213`, `POLL_MS` default 5000 — decoupled from the
  schedule entirely.
- **The overnight clear misses the fields that matter.** `T:AA` is the
  premarket block; Catalyst Grade is column J, Structure Flags P, Cycle D. The
  three fields the comparison uses survive it. What degrades falls back
  gracefully to the RTH values (`lib/data/rows.ts:264`), thinner rather than
  blank.

The checkpoint-time inheritance is still real and still worth knowing; it just
has no data consequence. What *was* found in that area is `sheetStale` — see
item 7.

**The migration has a hard dependency nobody had written down: float.**
*Raised by Research 2026-08-23, verified here.* `resolveDisplayedFloat`
(`lib/dashboard/merge.ts:143`) has exactly two branches — the Sheet's RESEARCH
tab, then its TODAY tab — and the type enumerates nothing else:
`displayedFloatSource: 'RESEARCH' | 'TODAY' | null` (`merge.ts:87`). There is no
third source in the tree.

So **every float on the desk is the Sheet's**, and float under 10M is one of the
five pillars the product exists to encode. `displayedFloatTurnover`
(`merge.ts:217`) and a branch of `risk.ts:174` hang off the same number. Retire
the Sheet without replacing it and pillar 5 leaves the product silently — every
float resolves null, which the code treats as a legitimate unknown rather than
an error.

This does not reverse the migration decision; it sequences it. **Nothing that
removes the Sheet ships before a float source replaces it.** The trader has
approved the direction for that replacement — derive float from SEC filings
already collected, shares outstanding less affiliate and restricted holdings
from SC 13D/13G and Forms 3/4 — and this thread is scoping it before writing
code. The surface that consumes it is Design's; the derivation is this thread's.

**~~Freshness is readable off the live desk without new code.~~ Also false,
also Integration's, corrected 2026-08-23.** `fetchSourceUpdatedAt`
(`lib/data/providers/googleSheets.ts:112`) does call the Drive API — and it
**403s with `SERVICE_DISABLED`**, because the Drive API was never enabled on
the Google Cloud project. The failure is caught and returns null, so
`meta.sourceUpdatedAt` is **always null** and nothing surfaces it. We cannot
currently see when the Sheet was last written. Enabling it is a console action
and has gone to [ops.md](ops.md), not here: it is not a code change.
Ops revoked a `chatgpt-mcp-7d` review session on 2026-08-23 that had been
unused since 19 August — a different path, almost certainly unrelated to a
Sheet writer, and named here only so nobody links them by coincidence later.

**4. `RESEARCH_RESOLVER_SEARCH_CONTEXT` stays at its current default.** Low-context
resolver searches were explicitly not enabled. Do not turn them on without
asking.

**6. Which of the 65 Sheet fields does the app have to absorb?** *Handed over from
Design, 2026-08-23.* Audit §11 item 1 is settled: **the Sheet is a migration
artefact and the trader's intent is for the application to absorb the four-task
workflow.** Design will not build a review workflow. But Design cannot say how
long "eventually" is, because the answer is about what the interpreter produces.

*Corrected the same day.* An earlier version of this item asked which fields are
"irreducibly human". **That framing was wrong and is retracted** — no human
writes any of it. `Analyst Notes`, `Warning Shot`, `Confirmation` and the rest
are task-authored, not human judgement, so the inventory is not
human-versus-machine. It is: **for each of the 65 fields, does this desk's
pipeline already produce it, could it, or would absorbing it mean building
something new?**

The measured shape: `lib/data/rows.ts` reads two tables and 65 fields — 28
columns on `TODAY!A:AA`, 37 on `RESEARCH!A:AK`. That inventory is the retirement
plan for the Sheet, and nothing after Phase 2 can be scheduled without it. Not
urgent — Design's Phase 2 proceeds without it — but it gates the phase after.

Distinct from item 5, which is about the input's reliability today.

**7. `sheetPrior` does reach the interpreter — the two reads are not
independent.** *Established in code by Design, 2026-08-23, and handed over
because the empirical half is this thread's.*

This is one of the two findings Integration named as gating the removal of the
conflict apparatus. The code path is confirmed:

`worker/research.ts:375` and `worker/research-interpret.ts:147` pass
`prior?.analysis` (from `lib/research/merge/sheetPrior.ts`) as
`priorHumanAnalysis` → `lib/research/interpret/pipeline.ts:198` →
`lib/research/interpret/bundle.ts:93`, where it is labelled
`HUMAN_REVIEWED_PRIOR_ANALYSIS` → into the prompt.

**Those two prompt sites understate the reach — corrected 2026-08-23, raised by
Research and verified from source here.** `openaiInterpreter.ts:95` is the
system prompt and `:146` is inside `buildAdjudicationInput` (`:142`), which
runs only on escalation. Citing those two makes it read as though the prior
reaches the model only on disputed fields. It does not. `priorHumanAnalysis` is
a **field on the bundle** (`bundle.ts:426`), and `buildInput` (`:102`)
serialises the whole bundle with `JSON.stringify(bundle)` at `:107` — the main
interpret path, called at `:188`. **The prior is in the context window of every
`Terra` call for any ticker carrying a TODAY row**, not just adjudications. The
contaminated surface, and this item's open question, are correspondingly
larger.

**The design is careful and that must be said**: the prior is presented as an
opinion and explicitly denied the status of evidence ("Do not adopt its
conclusions without support in the collected sources"), and adjudication
re-decides from sources rather than voting between two opinions.

**Two things remain true anyway.** First, `AUTO` has seen `SHEET`'s conclusion
before reaching its own, so whatever the UI shows, the two are not independent
opinions. Second, the prompt's own justification is now false: `:150` instructs
the model not to adopt the prior *"because a person wrote it"*. No person wrote
it.

**Two things measured since, from stored metadata in the local `market.db`, and
both change the weight of what was routed elsewhere:**

- **`AUTO_NEWER` has never fired.** Zero occurrences across 94 stored analyses
  carrying `sheetProvenance`. `SHEET_NEWER` appears 7 times. So the dead branch
  is dead by measurement rather than by reasoning, and the default fall-through
  is the one reaching the trader.
- **Half of all escalations are caused by the Sheet.** 14 escalations, 7 of them
  `SHEET_AUTO_CONFLICT` — more than any other single reason. Disagreeing with
  the ChatGPT tasks is the **largest driver of expensive-model spend on this
  desk**. This thread's charter makes cost a completion criterion, and that
  number was not previously known.

What Design cannot answer and this thread can: **does the prior actually change
the output?** That needs a run, not a read. Until it is answered, Design has
deferred §9 item 15 (single conflict signal) rather than reducing it — promoting
a conflict signal that may be an artefact would be worse than the buried one.

## Working rules

- **Facts come from deterministic parsing; the model only interprets.** Never
  fabricate a classification to fill a gap — `UNKNOWN`/`PARTIAL` with provenance
  instead.
- **Shares outstanding is not float. Market cap is not float.** Unknown float
  stays unknown.
- **Credentials stay worker-side.** `tests/security.test.ts` enforces this.
- Cost is a completion criterion, not an afterthought: job count, model calls
  and tokens are part of "done".

## Opening message for a new chat

> This is the **Research thread** for the Momentum Intelligence desk at
> `A:\mointel`. Read `docs/threads/research.md` and `docs/threads/README.md`
> first.
>
> You own `lib/research/` — evidence collection, source resolution, the
> interpreter, dossier quality, and the OpenAI bill. You do not deploy; the Ops
> thread does. UI presentation belongs to the Design thread.
>
> The top open item is the billing-class retry exclusion in
> `lib/research/retry.ts` — billing failures consume the retry budget, so a
> top-up does not self-heal and the board needs a manual release. It has bitten
> twice. Start there: show me the change you would make and what it costs to
> test, but do not write it until I agree on the approach.
