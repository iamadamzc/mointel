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
2. **Label it as what it is, and let UNKNOWN stay unknown.** No filing reports the current
   number of tradable shares; every float is somebody's computation (naming document 2f
   item 3; see section 4 for a correction to the shorter form used there). So the cell reads as the
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

## 4. Marketing's wording, reviewed 2026-10-03: PASS with two required changes and one correction of mine

**Passes.** Renaming the column "Setup grade" (or "Desk reading"); the four grades as readings of the five criteria at the checkpoint with no forward tense; D, "risk outweighs the setup," in place of AVOID (it names the problem and gives no instruction); the once-only legend carrying the rubric; the header "Float (research estimate)"; "Unknown" where unverified. Two notes for Research and Design: D replaces a stored value, so every place that holds or filters on AVOID or "Priority" changes; and the legend's "have not been tested against outcomes" is a factual claim that expires the day any test of the grades is run, so whoever runs one updates the sentence in the same change.

**Required change 1: the float cell must not say "per {source}."** "{figure}, per {source}" reads as the source stating the figure. The source is what the estimate was computed from. Use "{figure}, estimated from {source}, as of {date}." Attributing a number to a document that does not contain it is the same fault as "in FINRA's own words."

**Required change 2: "No filing reports a float" is overbroad.** A 10-K's cover reports the aggregate market value of shares held by non-affiliates, which XBRL tags `dei:EntityPublicFloat` (Research read it in the SEC data for CATO, `short-interest-calibration/result.md`). It is a dollar value, annual, as of the second fiscal quarter's end, and it is a filed public float. What no filing reports is **the current number of tradable shares.** Use that: "No filing reports the current number of tradable shares, so this is a computed estimate." The legend's "not a filed or vendor figure" stays only if the source allow-list in section 2 item 3 is enforced and the stored source field can be audited; if it cannot, drop "or vendor."

**Correction of mine, and it is on the public site.** The landing page (`app/page.tsx` line 280) says *"Every float is somebody's computation. No filing carries one."* This seat cleared that form in the naming document (2f item 3) without checking the counterexample above. The sentence is defensible read as "no filing carries the current tradable share count," and a sceptic can answer it with the 10-K cover. **Recommend Web change it at the next copy touch to "No filing reports the current number of tradable shares."** Not urgent and not a licence or advice issue; it is a claim stated wider than its evidence.

## 5. Review of the "Are float quotes real?" draft (Marketing, off his 2026-10-05 ruling), 2026-10-05: NOT READY, nine changes

*Read against Research's 10-name result (`759465bc`), the proposal's float section (`8eb6e51a`), and the SEC filing text. His ruling: float is the SEC upper bound from insiders only, with a tooltip linking to a public page. Marketing's draft keeps vendors unnamed and undisparaged, which is right. The problems are claims about how floats exist everywhere, and an absolute safety claim.*

**The 10-K cover description is accurate, with one precision.** The cover reports *"the aggregate market value of the voting and non-voting common equity held by non-affiliates"* as of *"the last business day of the registrant's most recently completed second fiscal quarter,"* a dollar figure (read in filed 10-K covers and the SEC's instruction text). Say "as of the last business day of the company's second fiscal quarter," and say it describes companies that file a 10-K; foreign filers on Form 20-F have no such figure.

**Required changes.**

1. **Universal claims about the world.** "Because no company files it," "No SEC filing states a float as a share count," "every float number quoted anywhere is a calculation, built from filings and assumptions," "the actual count ... sits with the transfer agent and the clearing system, and they do not publish it," "There is no public float share count to look up," and "which no public source holds" each assert something about every filing, every vendor or third parties' records that no source we hold supports. This is the same fault as the landing-page sentence corrected in section 4. Replace with what is provable: companies are not required to file a float, and the closest required figure is the 10-K's dollar value; "so a quoted float is an estimate, not a filed fact"; "we know of no public source that states a count of freely tradable shares." Delete the transfer agent and clearing sentence. Say nothing about how vendors build theirs.
2. **"An upper bound we can prove" is too strong.** It is a bound computed from SEC filings under conditions. Use "computed."
3. **"Wrong only in the safe direction" and "We never make a stock look tighter than it is" are absolute and framed as safety.** Research's own result says the bound errs high only in its insider half and only when the share count is current and the holdings line up with it; it goes too LOW on a stale count under dilution, on a holding stated before a split, or when an insider's holding is dated after the count. "Safe" also reads as advice about trading risk. Replace with a conditional, directional statement: when the inputs line up the true float is at most our number, because each holder we do not subtract makes the number larger; when they do not line up the cell reads Cannot verify. No "safe," no "never."
4. **The below-zero story must describe what was tested.** The negative bound came from the earlier version that also subtracted large holders (WCT: their filed totals, 102.8M shares, exceeded the filed count, 46.3M, which was also dated before a split). Say "an earlier version of the method that also subtracted large holders produced a negative number on one of ten stocks," not "the method." The insider-only version has not yet been run on a validation sample; the page must not say or imply it has, and must not go live before that sample exists (Integration's and Research's own gate).
5. **"A holder can still acquire" is looser than the rule.** Beneficial ownership counts shares a holder has the right to acquire within 60 days (Rule 13d-3). Use that, or keep "can acquire" only if Research confirms the wording.
6. **"Officers and directors" may understate the insider family.** Forms 3, 4 and 5 are also filed by 10% holders. Research confirms exactly whom the subtraction covers; the page names that, no more and no less.
7. **The cell's "as of {date}" must be the filed share count's date,** with the insider holdings' dates in the tooltip. And "no more than" is false after issuance, so the same rule as the size grade (session-reports section 13f) applies: no number, and "Cannot verify (shares may have been issued since the filed count)," for a name with an active ATM or equity line or a KNOWN_ACTIVE warrant, convertible or preferred block.
8. **Make "Unknown" and "Cannot verify" mean one thing each, on the page and in the cell.** The page's "no recent filed share count" overlaps its "old enough" case. No filed count at all reads Unknown; a count too old to trust reads Cannot verify.
9. **"Every share we subtracted traces to a filing you can open" is a promise about the UI.** It is true only if the tooltip or page shows the citations (accession links). If the build will not, delete the sentence.

**Not a problem.** No vendor is named or disparaged. Nothing in the draft is advice once "safe" goes. The title, "Are float quotes real?", is his phrase; the body must not answer it "no" about any vendor, and after the changes above it does not.

**Not reviewed:** the voice, and whether the validation sample passes (Research's, before any surface).

