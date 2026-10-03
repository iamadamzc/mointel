# Reproducing the Sheet in the app: Priority grades and a model-researched float, a claims and terms read

**Commercial, 2026-10-03.** Integration's ask (24th seat), on his ruling typed to it
2026-10-03T17:20:45Z: *"we need to reproduce what the sheet does in the app. its that
simple. the sheet is nothing more than a repository of model outputs. its not a holy
grail."* Read against: `docs/sheet-removal-plan-2026-10-03.md`, the grade definitions in
`docs/After-Hours Momentum Recap.md` lines 20 to 24, `docs/legal/terms.md` section 7, the
landing page copy, and this seat's standing rulings. Public text and the desk's own files
only; nothing run, nothing contacted. Marketing owns the final wording.

## 1. Do the Priority grades conflict with "nothing displayed is a recommendation"?

**Yes with the definitions as written, and no with the same four grades worded
differently. It is a fixable design input, not a blocker.**

**What it is not.** It is not a problem with the law's publisher exclusion. A grade that
is the same for every reader is impersonal commentary on specific securities, which is the
shape `session-reports/commercial.md` section 1 (Lowe v. SEC, Seeking Alpha) already
covers, and the grades do not vary by what a reader holds. The conflict is with the
desk's own stricter rules and its own public statements.

**What conflicts, in order of weight.**

1. **The words are directive and promissory.** The definitions are *"A: PRIMARY: strongest
   next-session opportunity,"* *"B: potentially tradable,"* *"C: BACKSIDE / OPPORTUNISTIC,"*
   *"AVOID."* `lib/desk/assessment.ts` bars buy and sell language outright (*"describe
   observed state, not what to do about it"*) and section 3 of the session-reports ruling
   struck "keep an eye on X" on the test of verb and object. **"AVOID" is an imperative.**
   "Next-session opportunity" predicts a next session and names a trade. Both are the
   struck class.
2. **The site says the opposite, twice.** Terms section 7: *"Nothing the desk displays is
   a recommendation, an endorsement, a solicitation, or a suggestion to buy or sell any
   security."* The registered plain statement: *"It is not a scanner and it is not a
   signal service."* A column that sorts every name A, B, C or AVOID, shown to paying
   strangers, is the nearest thing this product could contain to a signal list. With the
   current words, one of the two statements is arguably false on the day it ships.
3. **An opportunity grade is an outcome claim in waiting.** Section 2f rule 1 bars outcome
   claims in any form. "Strongest opportunity" will be read as expected performance, and
   the recap prompt itself says *"do not call a one-session observation a verified edge."*
   No measurement shows the grades predict anything.

**What would make them consistent, cheapest first. These are inputs for Research's design
and Marketing's words, not a rewrite by this seat.**

- **Reword the four grades as the desk's reading of a setup, not an instruction.** The
  rubric already exists in the prompt (structure, catalyst, volume, liquidity, tradable
  supply). Describe the grade as a reading of those five, for example "strongest
  structure and catalyst on the desk's criteria at report time," and the lowest grade as
  a state ("structure, liquidity or supply risk outweighs the setup"), not "AVOID." The
  desk already has the right concept: its Why Not framing (*"research for the avoid"*,
  his own phrase, cleared in section 2f item 4 as a rule he set). Name the grade for what
  is wrong with the setup, not for what to do.
- **Drop the forward tense.** "Next-session" is a prediction. Grade the setup as of the
  report's checkpoint, the same recap-versus-premarket discipline as section 10 item 1.
- **One standing legend sentence, once**, the pattern the short interest label uses: the
  grades are the desk's own automatic reading at the time shown, not a prediction and not
  a recommendation, and they have not been tested against outcomes. No per-line disclaimer.
- **Keep it the same for every reader.** Personalised grades (by watchlist or holdings)
  would leave the publisher exclusion. Gate 2's same board already forbids it.
- **Show the rubric.** Publishing the five criteria makes the grade a described measure
  and not an oracle.
- **Fallback, not recommended:** show the grades only on the operator's own view. That is
  a second class of viewer, which Gate 2 rules out for the board, and he asked for the
  app.

**The registered plain statement stays true** if the grades are worded as readings and are
never called picks, signals or opportunities anywhere on the site, in marketing copy or in
a report. That is the line to hold.

## 2. Does a model-researched float, labelled with source and date, raise a claim or terms issue?

**Yes, three, and all three are design inputs.**

1. **It is a number whose reliability the desk has not measured, replacing one it measured
   as wrong.** The standing default (Integration, order-and-process, 2026-09-17) is that
   the desk narrates the float verdict and never the number, because the vendor float
   contradicted the filed share count on roughly one name in six. A model-researched float
   is the same kind of object (the Sheet's float was itself a model task's output), and its
   own error rate is unknown. **Before it reaches paying users, Research should measure
   the same thing on it: how often the researched float exceeds the filed share count
   from the same date, which float cannot do.** Report that rate beside the label, as a
   count and not a threshold. Until it exists, the report-layer default (verdict, not
   number) stands unchanged; this read does not lift it.
2. **Label it as what it is, and let UNKNOWN stay unknown.** No filing carries a float; every
   float is somebody's computation (naming document 2f item 3). So the cell reads as the
   desk's research estimate, with the source it cites and its as-of date, never bare
   "Float." The recap prompt's own rules carry over unchanged: Float Quality is CLEAN,
   DIRTY or UNKNOWN, *"never call an unverified tiny float clean,"* and when it cannot be
   verified the cell shows unknown and not a number. The existing float-bound check
   (float above filed shares outstanding is refused) stays as the gate.
3. **The terms risk is in how the model finds the number, not in showing it.** A researched
   float is not licensed vendor data, so there is no redistribution question on display.
   But a model browsing to a vendor float page is an automated fetch of a site whose
   terms may bar it, and standing memory says stockanalysis.com bars automated access and
   competing-product use. **A float built from such a page and shown to paying users is
   derived from data the desk was not permitted to take.** The research prompt needs a
   source allow-list (SEC filings, the company's own releases, exchange notices) and an
   explicit ban on vendor float aggregators, and the stored source field must name what
   was actually cited so this can be audited. Any other source used regularly needs its
   terms read first.

**What it does not raise.** No licence issue on display; no change to the accepted
exposures already on file (the tape, Alpaca News, clause 2.2 of FINRA's terms).

## 3. What this seat did not do

It did not review the wording of the grades or the float cell (Marketing's, after this
read), the cost of the model research (Research's and his), or whether the grades predict
anything (not studied; his call if ever).
