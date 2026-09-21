# Jev for news analysis on the mointel desk

*Research seat, 2026-09-21. An assessment, not a build. Prior art read:
`A:\jev-test\CLAUDE.md` (settled findings), the live TypeSafe docs, and this
desk's own catalyst pipeline.*

## The fit is about CADENCE, not about judgment quality

`config.ts:26` states the binding constraint in its own words: **"Discovery costs
a model call, so it is spaced far wider than source polling."**

That is why the desk reads `CATALYST UNKNOWN` on a name that is moving. The RCON
case is the whole argument: **rank 7, +24.04%, `CATALYST UNKNOWN`, while a PR
Newswire release had gone out at 08:00 ET.** The resolver found no durable company
source and added nothing. And the audit's count — **642 of 935 citations, 69%, on
domains this desk has never collected from** — concluded *"the input gap is
discovery, not policy."*

**Jev's proven shape addresses exactly that.** `A:\jev-test` Track B:

> *"Jev works as triage, not extraction. Screening 604 transcript passages took
> **22 seconds and $0.03**, cutting reading volume **93%** and independently
> rediscovering the strategy-dense transcripts."*

**22 seconds and three cents for 604 judgments is a different cadence class.** It
converts discovery from a budgeted occasional call into something affordable per
candidate, per cycle, through the 07:00–10:00 window. **The claim is not that Jev
judges a headline better than the current interpreter. It is that it can judge
five hundred of them before the interpreter judges one.**

## Where it slots

The tier already exists. `ModelConfig.changeDetectModel` is documented as the
**"low-cost tier for change detection and source location"** — which is triage by
another name. Jev belongs there and in front of
`lib/research/catalyst/discovery.ts`, **not** in place of the interpreter.

```
feeds / wires / IR pages / EDGAR     many candidates, cheap to fetch
        |
   [ JEV ]  typed judgments, per candidate, per cycle
        |
   a ranked shortlist + a durability verdict
        |
   existing interpreter                few candidates, expensive, unchanged
```

## The question shapes that work, in this desk's terms

From the prior project's working rules: **questions about what a passage *says*
work; questions about whether it suffices for a purpose outside the text return
flat non-answers.** So:

| Ask | Primitive | Why it is safe |
| --- | --- | --- |
| Is this document issued by the company itself, rather than reporting on it? | **Noul** | A property of the text. This is the `companySourceContract` question and the one RCON failed. |
| Which of these announces a financing / offering / clinical result / contract / guidance change / nothing? | **Choice** | The desk already has a catalyst taxonomy; a Choice over a defined set with a no-match option is the exact primitive. |
| How specific is this about amounts, dates and parties? | **Score** | Ordered levels, and it separates a durable disclosure from a syndicated echo. |
| Does this describe an event that has occurred, rather than one that may occur? | **Noul** | Text property. Separates a completed financing from a shelf registration. |

**Never ask, and the reasons are different for each:**

- **"Is this bullish?" / "Will this move the stock?"** — the prior project names
  this as **contaminated**, and it is also the `g(render(...))` problem: the desk's
  own price data answers it better.
- **"Is this catalyst tradeable?" / "Is this enough to enter on?"** — the
  *suffices-for-a-purpose* shape that **returns flat non-answers.** The diagnostic
  is published: **a Noul with std < 0.10 across varied inputs is declining to
  answer, not discriminating.** It caught three broken questions there; run it on
  every question here before trusting any of them.

## The contamination problem is WORSE for news than for tape, and it decides the method

**Jev has an unpublished training cutoff.** For tape you can defend yourself by
stripping the symbol, the date and absolute prices. **For news you cannot: the
company IS the content.** A press release names the issuer in its first line, and
a model that has seen the period may recall what the stock did next.

And because the cutoff is **unpublished**, you cannot carve a provably safe
historical window either.

⇒ **Any historical benchmark of "did Jev grade this catalyst correctly" is
contaminated and must not be run as the validation.**

⇒ **But contamination bites EVALUATION, not USE.** Live triage — *"which of these
forty URLs is an issuer-originated document about this symbol"* — has no outcome
to leak, because the outcome has not happened. **So the design is: use it live,
validate it forward.** mointel runs every trading day and already stores dossiers
with versions; it can measure this natively without a backtest.

## One structural constraint, from this desk's own finding

The interpreter **already** receives another model's conclusion by default — the
Sheet prior, `RESEARCH_OMIT_SHEET_PRIOR` defaults off. My own conclusion on file:
**agreement between two model pipelines is weak evidence and conflict is strong**,
which is the opposite of how a symmetric merge reads it.

⇒ **Jev must SELECT EVIDENCE, never ADD AN OPINION.** If it returns "this looks
like a real catalyst" and that reaches the interpreter as an input, the desk has
three correlated model voices and a conflict apparatus that cannot tell which is
independent. If it returns *"these four of forty documents are issuer-originated
and specific"*, the interpreter still does the grading, on better evidence, and
the dependency structure stays clean.

## Smallest decisive test

Cheap, live-forward, and it answers the cadence claim rather than a quality claim.

1. **Take one morning's candidates.** For every name that entered the top 50, take
   every URL the feeds and IR registry produced — including the 69% of domains the
   desk never reaches — without fetching anything new.
2. **Ask Jev the four questions above per candidate**, in one request per document
   (independent questions over one state run in parallel).
3. **Measure three things: wall-clock, dollars, and the shortlist.**
4. **Kill criterion, stated before looking:** if Jev's shortlist does not contain
   the document the desk eventually cited — on the names where it cited one — for
   at least 8 of 10 names, stop. And if the run costs more than a dollar or takes
   longer than the premarket window allows, stop regardless of accuracy.
5. **The RCON case is the single best test row.** A PR Newswire release existed at
   08:00 ET and the resolver added nothing. If Jev's triage surfaces it, the
   cadence claim is demonstrated on the exact failure that motivated this.

## Operational facts, from the prior project — adopt, do not rediscover

- **Pin `jev-1.13.0`.** Never `jev-latest`.
- **There is no seed parameter.** Reproducibility comes only from caching every
  answer by `sha256(model‖state‖questions)`. `A:\jev-test\.jev_cache\` already
  does this and makes re-runs free; mointel needs the same before any measurement
  is quoted twice.
- **The Python SDK crashes on this machine** — truststore/3.12 SSL recursion on
  Windows. **Call the HTTP API directly.** mointel is TypeScript, so this is moot
  here, but it is why `jev-test` does.
- **Key is in `A:\jev-test\jev.txt`.** It is not in mointel's env. **If this ships
  in mointel it needs its own credential handling** under the desk's existing rule
  — never printed, logged, committed or moved.

## What this is not

- **Not a replacement for the interpreter.** The interpreter reads a bundle and
  grades; Jev decides what goes in the bundle.
- **Not a price or tape judgment.** `A:\jev-test\CLAUDE.md`: *"Feed Jev price
  series, bar data, dates or arithmetic. It fails all of these by design."*
- **Not a way to reach new domains.** Triage ranks what discovery finds. **If the
  desk never fetches a domain, Jev cannot judge it** — the 69% gap is a collection
  problem first, and triage only becomes valuable once more candidates arrive.
