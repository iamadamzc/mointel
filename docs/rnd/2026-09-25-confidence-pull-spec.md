# Spec — production `research_analysis_versions` read-only copy-down

**Status: SPEC. NOT RUN. Awaiting his confirmation that this is ONE decision.**

Written 2026-09-25 by R&D at Integration's request, after he ruled on the
grade-confidence question against this seat's recommendation. His words,
relayed verbatim:

> *"'not answerable without a new pull' may be the most unhelpful thing to show
> to a trader. if that's the case then pull."*

**The objection is to the OUTPUT, not to the measurement.** "We cannot answer
this" is not a finding a trader can use. This spec exists so the alternative
sentence — *here is what the pull buys and here is what it does not* — is on the
table before the read happens rather than after.

**Why spec and not run.** In the same message he asked Integration to explain
"do you want the grade-confidence pull at all?", which is **this same pull**. He
answered it under one item and asked what it was under the next, which reads as
two decisions where there is one. Speccing is free and reversible; the read is
not. **Confirmation needed that he is authorising one thing, not two.**

---

## 1. What is read

**Store:** production market database.
**Table:** `research_analysis_versions` — **this table only.**

| Column | Why |
| --- | --- |
| `id` | ordering within a ticker-day only. **Never joined across stores** — it is a per-store sequence position, not an identity. |
| `ticker` | join key |
| `generated_at` | join key; converted to a trading date by **session logic, not `substr()`** (see §5) |
| `dossier` | the JSON carrying `catalyst.confidence`, the grade, and the write-up fields |
| `model`, `analysis_version` | so a grader-behaviour change mid-window is detectable rather than pooled across |

**Take the whole `dossier`, not just the confidence field.** Two reasons, and the
second is new this week:

1. `catalyst.confidence` is inside the JSON; extracting one path server-side is
   more work than copying the column and is a transformation Ops would have to
   get right.
2. The same dossier carries `summary`, `whyTradersMayCare`, `unknowns`,
   `freshness` and `plausiblyExplainsMove` — **the current write-up.** He asked
   on 2026-09-25 for a deeper read on catalysts, and any change there needs a
   baseline of what the interpreter writes today. **Without this, a second pull
   gets asked for within the fortnight.**

## 2. What "read-only" means, concretely

- A **copy out** of the named table to a file on the desk machine. No write, no
  schema change, no DDL, no deletion, nothing touching live desk behaviour.
- **The export tool's `id`-preserving insert must not be "simplified".** The
  copy supplies `id` explicitly against an `AUTOINCREMENT` destination; omitting
  it renumbers and silently binds later joins to the wrong rows. Recorded at
  `lib/archive/export.ts:161-171` and in the register's standing item.
- Destination `data/analysis-versions-prod-<date>.db`. **The existing snapshots
  are not overwritten** — `market-prod-2026-08-23.db` stays, because it is the
  only pre-change arm for other measurements.

## 3. What this does NOT rest on

**This is a FRESH NAMED EXCEPTION and requires his by-name word to Ops.**

- **It is NOT covered by `8f331ed`.** That grant is a read-only copy-down of
  **`research_sources`**, for the EX-99 acceptance-latency instrument. Different
  table, different measurement. **Reaching a different table under it would be
  the spent-exception failure this register already recorded once**, when a
  two-basis request was sent that contradicted itself and Ops was right to hold.
- **It is NOT covered by the 2026-09-23 assessments extract authorisation.** That
  was named, unbounded, and **spent** on `assessments-prod-2026-09-23.db`.
- **A requester does not relay its own approval.** R&D is the requester here.

**If Ops is running the `8f331ed` `research_sources` copy-down in the same
window, that is an Ops scheduling convenience and nothing more.** The two grants
stay separate in the record, and using the `research_sources` copy for any
question other than the EX-99 latency read is **not** assumed here.

## 4. What the pull buys — and what it does not. MEASURED, not estimated.

**Basis: `market-prod-2026-08-23.db`, the only production snapshot on disk —
325 analysis versions over 5 sessions (2026-08-17…08-21). Projections to 26
sessions are linear off 5 early sessions and could be wrong if grader behaviour
moved; that is the weakest assumption in this document and it is stated rather
than buried.**

    analysis versions                      325
    distinct ticker-days                   251   (1.29 versions each)
    ticker-days with an outcome row        185   = 73.7% scoreable
    scoreable first-analyses per session   37.0  ->  ~962 over 26 sessions

### IT BUYS: the confidence field, on roughly 960 scoreable ticker-days.

### IT DOES NOT BUY more rows.

Board capture already yields **848** graded ticker-days with outcomes over 26
sessions. The analysis store projects **~962**. **Comparable populations.** The
value of this pull is the confidence column, essentially nothing else.

### IT DOES NOT FIX THE `STRONG` PROBLEM, AND THIS IS THE POINT HE SHOULD SEE.

    STRONG first-analyses per session      0.40  ->  ~10 over 26 sessions

**Measured at n=8 from board capture; projected at ~10 from the analysis store.
The same answer.** The rarity is a property of the grader, not an artifact of
what the board captured. **So the STRONG vs LEGITIMATE_POSITIVE half of the
question stays unanswerable after the pull.** He is spending a production read
to avoid an unhelpful sentence; he should not discover this afterwards.

### AND CONFIDENCE IS LARGELY COLLINEAR WITH THE GRADE.

Confidence x grade, scoreable first-analyses, 5 sessions:

    grade                       MEDIUM  HIGH  LOW
    UNKNOWN                          4     0   50
    NONE                            10     0    0
    STRONG                           0     2    0
    LEGITIMATE_POSITIVE              9     9    0     <- never LOW
    MODERATE_MIXED_SECONDARY        57    14   12
    WEAK_NEGATIVE_DILUTIVE           7    10    1

**`UNKNOWN` is LOW 93% of the time, `NONE` is always MEDIUM, and
`LEGITIMATE_POSITIVE` is never LOW.** So "does confidence track reality" partly
re-asks "does the grade track reality", which is already answered at ~+7pp.

**The question that survives, and it is narrower than the one he authorised:**
**within legitimate-positive names, do the HIGH-confidence ones beat the
MEDIUM-confidence ones on the 09:30–10:00 move?** Projected **~47 against ~47**
over 26 sessions, from 18 scoreable LEGITIMATE_POSITIVE first-analyses in 5
sessions. **That is a real test and it is worth running.** Session-pairing will
be thin — at ~3.6 legitimate-positives a session, many sessions carry only one
confidence level — so expect a pooled test with the clustering caveat stated,
plus a sign test over whichever sessions carry both.

> **HONEST SUMMARY FOR HIM, WHICH IS THE SENTENCE HE ASKED FOR:** *the pull
> answers whether the grader's HIGH confidence means anything on legitimate-
> positive names, at roughly 47 against 47. It does not answer whether STRONG
> beats LEGITIMATE_POSITIVE — STRONG is ~10 names in 26 sessions either way —
> and it does not add materially more data, only the confidence column.*

## 5. Two traps carried from `DATA-ARCHIVE.md`, restated because this spec will be executed by someone else

1. **`generated_at` → trading date is a SESSION-BOUNDARY conversion.** A grade
   generated at 19:25 ET and one generated premarket belong to different
   sessions than a naive UTC date slice implies. `substr(generated_at,1,10)` is
   wrong. This spec's own projection used the session conversion.
2. **Never join on `id` / `analysis_version_id` across stores.** Join on
   `(ticker, trading_date)` and content.

And one this seat added on 2026-09-25, which applies directly here:

3. **First analysis of a ticker-day is not the same as "available before the
   window".** 37% of board first-entries landed after 09:30 ET. **Cut the
   confidence test on the clock, not on the ordinal**, or it rebuilds the
   look-ahead this question has already been retracted for once.

## 6. What runs after the file lands

Pre-registered here, before the data exists:

- **Primary:** among first-analysis `LEGITIMATE_POSITIVE` ticker-days whose
  analysis was generated **before 09:30 ET**, contrast `confidence = HIGH`
  against `confidence = MEDIUM` on `gain_open_30_pct`. Pooled difference with
  the clustering caveat; sign test over sessions carrying both.
- **Reported with its power either way. A null counts.**
- **Not run:** any contrast involving `STRONG`. The n is known in advance to be
  ~10 and a test on it would be a fishing licence, not a result.
- **Secondary, no new data needed:** does confidence add anything *beyond* the
  grade? If the HIGH/MEDIUM split inside legitimate-positive is flat, confidence
  is a restatement of the grade and should not be surfaced as a second signal.

## Related

- [2026-09-22-grade-the-grader.md](2026-09-22-grade-the-grader.md) — the question, part (a) settled
- [../DATA-ARCHIVE.md](../DATA-ARCHIVE.md) — the capture spec and both join traps
- [../threads/rnd.md](../threads/rnd.md) — the register's standing item on spent exceptions
