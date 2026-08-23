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

Not established, and not to be assumed either way: whether the task is still
running. `lib/data/providers/googleSheets.ts:112` already fetches the Sheet's
Drive `modifiedTime`, so that is readable off the live desk without new code.
Ops revoked a `chatgpt-mcp-7d` review session on 2026-08-23 that had been
unused since 19 August — a different path, almost certainly unrelated to a
Sheet writer, and named here only so nobody links them by coincidence later.

**4. `RESEARCH_RESOLVER_SEARCH_CONTEXT` stays at its current default.** Low-context
resolver searches were explicitly not enabled. Do not turn them on without
asking.

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
