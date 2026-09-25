# Spec — catalyst qualifiers: why this is weaker (or stronger) than its headline

**Status: SPEC, from R&D to Research Pipeline (build) and Design (surface).
R&D owns the definition and the measurement and builds neither.**

Written 2026-09-25 from his own worked examples. **The request is his, twice:**

> *"so instead of just a labeling of a headline and a label (that can be a part)
> a true digestion of what is being reported. this would be tremendously
> beneficial to traders."*

> *"i think we have much to be improved in our catalyst reporting"*

He supplied two real cases — ATYR and AIFF, both from a ChatGPT session he ran
**outside the desk, on a morning the desk was running.** That is the benchmark:
not a hypothetical, a thing he actually did instead of using the product.

---

## The finding that shapes this, and it changed R&D's own recommendation

**First instinct was to build a novelty check** — *"was this already disclosed?"*,
the ATYR insight. **Measurement says that is too narrow.** Of 350 board names
that ran 50%+ across 26 sessions, 257 never got a positive catalyst grade, and:

    researched, found news, graded moderate or weak/dilutive   166   64.6%
    researched, came up empty (grade stayed blank)              56   21.8%
    researched, explicitly NONE                                 18    7.0%
    never researched at all                                     17    6.6%

**Two thirds of the time the system found the news and marked it down.** It did
not miss it. **It graded it down and never said why.**

> ## RETRACTION, SAME DAY — HE REFUTED THE PREMISE AND HE IS RIGHT
>
> **This section originally claimed ChatGPT reached the same verdict our grader
> did and "did not find a catalyst the desk missed". WRONG, in two independent
> ways.**
>
> **1. I compared VERDICTS and inferred the CATALYSTS matched.** Both said
> "moderate". **Two analyses can agree on a grade while naming completely
> different events** — which is what he reports for AIFF on the **2026-09-25**
> session: *"look at the catalyst for AIFF at this time vs the one that was
> printed on the desk. completely different."* **No store on this machine holds
> the 09-25 session, so his actual case is unchecked here.**
>
> **2. The find-rate under it used "EVER during the day", re-admitting the
> look-ahead I had removed from part (a) the same morning.** I called it *"the
> honest cut"*. It counts a catalyst found at 15:00 ET as a find on a name that
> ran at 09:40. **Corrected, at decision time:**
>
>       50%+ movers, positive catalyst    at first entry 13.7%
>                                         before 09:30   14.6%
>                                         EVER           26.6%   <- what I quoted
>
> **~15% of the big movers carry a positive catalyst when it matters, not 27%.
> Of names that DO eventually get one, 45% had nothing positive before the open
> — 50% among the 100%+ movers.**
>
> **A worked instance, found while checking him, and NOT his case.** AIFF
> 2026-09-17, `intelligence_status = INTELLIGENCE_AVAILABLE` throughout:
>
>       09:25 ET  $1.03  +10.7%   catalyst NONE
>       14:30 ET  $1.17  +25.8%   catalyst NONE
>       15:00 ET  $1.37  +47.1%   catalyst NONE -> LEGITIMATE_POSITIVE
>
> The change log at 15:00 records `CATALYST_CHANGED` and `NEW_EVIDENCE`.
> **Research had run, returned NONE through a 47% move, and corrected itself
> after it was over.** Not a downgrade missing its reason — **a wrong answer
> that later fixed itself, which is a different defect with a different fix.**
>
> **Two failure modes, separated, measured on 26 sessions:**
> - **Arrives late** — ~45% of eventual positives had nothing positive before
>   09:30.
> - **Says NONE, then flips** — ~17% were shown `NONE`/blank first. **Worse: the
>   desk actively told him there was nothing there.**
>
> **THE CAPTURE GAP, WHICH IS THE REAL FINDING.**
> `desk_assessment_tickers` stores the catalyst **label and nothing else.** The
> catalyst TEXT — *which event the desk named* — exists only in the `dossier` in
> the production market store. **So "the desk named the wrong catalyst" is
> invisible to every instrument this desk has.** Every find-rate figure in this
> register measures whether a GRADE was present, never whether the named event
> was the right one. **His complaint is about something nothing here can see.**
>
> **What survives:** the qualifier work is still worth doing — 166 researched
> downgrades is a real population and a reasonless downgrade is a real defect.
> **But it is SECOND.** A reason attached to the wrong catalyst, or attached at
> 15:00, is worth nothing. **Latency and correctness come first.**

## What to build: `catalystQualifiers`

A new array on the catalyst object in
[`lib/research/interpret/schema.ts`](../../lib/research/interpret/schema.ts),
beside `unknowns`. **Each element is three things and nothing else:**

    {
      code:      <enum, from the closed list below>
      statement: <one sentence, EXTRACTED from a document, not characterised>
      sourceIds: <the evidence ids the statement comes from>
    }

**Direction is carried by the code, not by prose.** Most codes deflate; two
inflate. A name with an empty array has a catalyst the interpreter found nothing
to qualify — **which is itself information and must render as such**, not as a
blank.

### THE DESIGN RULE, AND IT IS THE `freshness` LESSON APPLIED

The schema already carries a comment recording that `freshness` was asked of the
model with no threshold defined, and **52 of 325 analyses claimed FRESH on
something the event date refuted**. It is now arithmetic over a fact the model
extracts.

> **Every qualifier must be anchored to an extractable, citable fact. Ask the
> model for what a document SAYS; never for whether something is good, weak,
> promotional or likely.** *"The release states no contract value, purchase
> commitment, minimum or revenue split"* is an extraction and is checkable
> against the release. *"This partnership looks thin"* is a judgement, is not
> checkable, and will not survive the first time it is wrong.

**A qualifier with no `sourceIds` is invalid and must be rejected by
`validateDossier`, not rendered.** An unsourced reason is worse than no reason:
it reads as authority.

## The closed list, derived from his two examples

Every code below is taken from something ChatGPT actually told him. **This is
not a brainstorm; it is a transcription of what he found worth having.**

| Code | The extraction test — what must be in a document |
| --- | --- |
| `RESTATES_PRIOR_DISCLOSURE` | the substance appears in an earlier filing or release; cite both. *ATYR: the 372-patient / 54-week / same-endpoint trial was disclosed in May.* |
| `SOFT_LANGUAGE_NOT_FORMAL_STATUS` | the release uses industry language short of a formal designation, and the formal version is nameable. *ATYR: "alignment with FDA" is not a Special Protocol Assessment and not approval.* |
| `NO_DISCLOSED_ECONOMICS` | no contract value, purchase commitment, minimum, exclusivity or revenue split stated. *AIFF.* |
| `CREDIT_BELONGS_TO_THIRD_PARTY` | the achievement named is the counterparty's, not the issuer's. *AIFF: Monarch was already cleared; AIFF received no new clearance.* |
| `CATALYST_REQUIRES_CAPITAL` | the release or filing states the programme needs financing. *ATYR: must obtain capital via equity, debt, partnership or licensing — **dilution inside the catalyst**.* |
| `ADVERSE_HISTORY_ON_THE_SAME_PROGRAMME` | a prior filing records failure or a regulator's negative view of the same programme. *ATYR: prior Phase 3 missed its primary endpoint; the 10-Q records the FDA's view.* |
| `THIN_EVIDENTIARY_BASIS` | the claim rests on a stated small n or a subgroup. *ATYR: a 44-patient subgroup.* |
| `DISTANT_RESOLUTION` | the stated read-out or close is far out; carry the date. *ATYR: 372 patients, ~1 year of treatment.* |
| `SUPPLY_REGISTERED_OR_UNLOCKING` | resale registration, lockup release or warrants, with **share counts and strikes**. *AIFF: 20.5M registered for resale against 15.69M outstanding; warrants at $1.88 and $2.50.* |
| `GOING_CONCERN_OR_THIN_CASH` | the filing states going-concern doubt or cash short of stated burn. *AIMD: $1.42M cash, $7.05M half-year loss, going-concern warning, active ATM.* |

**Two that raise rather than lower**, because a list that only ever deflates is a
pessimism generator and he will stop reading it:

| Code | Test |
| --- | --- |
| `ECONOMICS_DISCLOSED` | a contract value, minimum or committed volume is stated. |
| `FORMAL_STATUS_GRANTED_TO_ISSUER` | a designation, clearance or approval granted **to this issuer**, cited. |

**The list is CLOSED.** An open vocabulary cannot be counted, and counting it is
the whole of the evaluation below. **Additions come back through R&D**, with the
case that prompted them.

## Second, smaller piece: levels must carry their reason

The desk currently stores a level as two bare numbers:

    {"support":1.53,"resistance":3.11,"label":"1.53 / 3.11"}

ChatGPT gave him *"$1.88 is both a historical high-volume area and the exercise
price for millions of financing warrants, so substantial selling could appear
there"* and *"$1.44 is where the September 17 announcement's 11-million-share
spike faded."*

**That is a join the desk can already make and does not.** Warrant strikes and
resale registrations are in structural intelligence; prior-spike levels are in
the archive. **Attach a reason and its source to each level.** Smaller than the
qualifiers and probably cheaper.

## Cost — the constraint that decides the shape

**Interpretation is the only stage that writes**, and at Anthropic's 5x output
weighting it is ~26% of the bill. **Asking it to write five times as much lands
entirely there.**

**This is why the qualifier is an enum plus one sentence plus ids, not a
paragraph.** A closed code with a short extracted statement is a fraction of the
tokens of free prose, is renderable as a chip rather than an essay, and is the
only form that can be counted. **Do not let this become "write more".**

Research should cost a sample before rollout. **If the increase is material it
belongs in the model-and-cost comparison he asked for on 2026-08-24, not in a
separate decision** — the two are now the same question.

## How we will know it worked — R&D owns this, and it needs NO grader

**The hard part of "is the write-up better" is that judging it needs a grader,
and this desk's grader disagrees with itself ~45% of the time.** So the register
already refuses quality comparisons. **Qualifiers escape that, because each one
is a prediction and predictions are scoreable against outcomes.**

**Pre-registered here, before the feature exists:**

1. **Primary — does deflation predict the fade?** Among names graded
   `LEGITIMATE_POSITIVE` or `STRONG`, contrast those carrying **one or more
   deflating qualifier** against those carrying **none**, on `gain_open_30_pct`
   and on retracement from the session high. Session-paired, the same statistic
   part (a) used, **cut on qualifiers present BEFORE 09:30 ET** — never on the
   end-of-day value.
2. **Per-code, once n allows** — which codes actually predict the fade. **Some
   will not, and those should stop being shown.** That is the point of a closed
   list.
3. **A null counts.** If deflated positives run exactly like clean positives,
   the qualifiers are decoration and should be surfaced as context, not as a
   warning.
4. **Coverage held constant first**, per the archive's standing rule — a name
   with no qualifiers because nothing was found is not a name with a clean
   catalyst, and the two must not pool. **`NOT_ANALYZED` names are excluded
   before any contrast.**

**The population is already large enough to test on.** 166 of the 50%+ movers in
26 sessions are researched downgrades — exactly the rows that would carry
qualifiers.

## Ownership

- **Research Pipeline builds it** — schema, prompt, `validateDossier` rejection
  of unsourced qualifiers, cost sample.
- **Design surfaces it** — including the empty case, which must not render as a
  gap, and the levels-with-reasons join.
- **R&D (this seat) defines the vocabulary and runs the evaluation.** No build.

## What NOT to do

- **Do not widen the grade vocabulary.** The grade is fine; his own example
  agreed with it. The reasons are missing, not the labels.
- **Do not ask the model for a confidence in each qualifier.** Confidence is
  already largely collinear with the grade (measured 2026-09-25), and a second
  collinear field is cost without information.
- **Do not reopen the wire licence.** His ruling stands: free EX-99 path only.
  Some catalysts — AIFF's among them, which is why he had to paste the wire in
  from elsewhere — **never reach SEC filings at all**, and no qualifier work
  fixes that. **Measuring the size of that blind spot is a separate R&D item and
  it does not reopen the decision.**
- **Do not build a chat.** He asked ChatGPT a follow-up — *"what if it breaks
  1.60?"* — and part of the quality he liked came from steering it. **Whether
  the board needs a follow-up affordance is a Design question and a much larger
  one; it is deliberately out of scope here** and should not be smuggled in as a
  text box.

## Related

- [2026-09-22-grade-the-grader.md](2026-09-22-grade-the-grader.md) — the grade carries ~+7pp; the label alone is a weak instrument
- [../DATA-ARCHIVE.md](../DATA-ARCHIVE.md) — the wire ruling and the free EX-99 path
- [../threads/research.md](../threads/research.md) — the pipeline that builds this
- `docs/chatwgpt.md` — his own ChatGPT session, the benchmark for all of the above
