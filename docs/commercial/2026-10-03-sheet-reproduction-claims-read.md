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

**5b. Items 5 and 6 settled, 2026-10-05.** (Item 5) The rule text was read at source (17 CFR 240.13d-3, via Cornell LII), not taken from memory: paragraph (d)(1)(i) deems a person the beneficial owner of a security if that person *"has the right to acquire beneficial ownership of such security ... within sixty days,"* and paragraph (a) also counts any person who *"has or shares"* voting power or investment power. So "has the right to acquire within 60 days, or controls the voting or investment of" is accurate; "can still acquire" is looser than the rule. (Item 6) Research answered from the code that ran (`float-comparison/run.ts`): the insider subtraction covers every reporting owner on a single-owner Form 3, 4 or 5, whatever the role (director, officer, 10 percent owner, or other), direct non-derivative common shares only, and joint filings are not attributed (which can only leave the number higher). **The page names that, not "officers and directors":** for example, "the insiders who report to the SEC on Forms 3, 4 and 5, officers, directors and large holders." Item 7 (the issuance refusal) stays open for the next Research seat, with Research's view that it is sound.

**5c. Float draft v2 reviewed, 2026-10-05: PASS on eight of nine, three small corrections, one of them a new overbreadth of the same class.** The hedged world-claims, "computed from SEC filings," the conditional wording, Rule 13d-3 wording, the 10-K description, Unknown versus Cannot verify, the issuance rule and dropping the citation promise all pass.

1. **"Companies are not required to report a float" is false in the SEC's own vocabulary.** Rule 12b-2 (17 CFR 240.12b-2, read at source) defines *"public float"* as measured *"as of the last business day of the issuer's most recently completed second fiscal quarter and computed by multiplying the aggregate worldwide number of shares of its voting and non-voting common equity held by non-affiliates by the price,"* and 10-K filers do report it. It is a dollar value, not a share count. Say "companies are not required to file a count of floating shares," and the page can add that the SEC's own term, "public float," is a dollar value on one past date. This appears in the page's opening and in "Where a float number comes from."
2. **The earlier-version story has two inaccuracies.** The earlier bound went *below zero*, not "below the filed share count" (subtracting anything goes below the filed count). And it was the large holders' *combined* totals (102.8M against a 46.3M filed count, Research's result), not "a large holder's." Say: "went below zero on one test name, where the large holders' combined beneficial totals exceeded the filed share count."
3. **Attach the condition where the bound is stated.** "What is left is the most shares that could be trading" reads absolute before the conditional paragraph arrives. Write "When the inputs line up, what is left is the most shares that could be trading."

**Still gating, unchanged:** the insider-only validation sample before any surface or the public page; the precise insider set from Research (answered, in section 5b); Cannot verify after active issuance confirmed by the next Research seat; Web builds only after the gate and his sight of the draft.

**5d. Float draft v2 plus the 5c, 5b corrections, final re-read 2026-10-05 (this seat's last act before retiring): PASS, two small items.** The public-float wording (SEC term, Rule 12b-2, a dollar value on one past date), "went below zero ... where the large holders' combined beneficial totals exceeded the filed share count," the condition beside the bound, the Rule 13d-3 prong ("right to acquire within 60 days" and shares whose "voting or investment the holder controls," both read at source), and the direct-holdings versus beneficial-total distinction all pass.

1. **"Companies are not required to file a count of floating shares" is a negative universal about every SEC form.** This seat opened Form 10-K's cover instruction and Rule 12b-2 (both dollar-based) and found no form requiring a share count, but did not search every form. Under standing rule 8 either accept it as "we know of no SEC filing that requires a count of floating shares" (matching the page's other hedges) or keep it only if the next Commercial seat searches the forms. Preferred: the hedge.
2. **The subtraction set understates itself.** Research's code subtracts every reporting owner on a single-owner Form 3, 4 or 5 whatever the role, including "other." The page says "the officers, directors and large holders who file Forms 3, 4 and 5." Add "and anyone else who reports on those forms," so the description is not narrower than the method.

**Still gating, unchanged:** the insider-only validation sample (Research, not run) before any surface or the public page; Cannot verify after active issuance (next Research seat); his sight of the draft.

## 5e. The float cell faces and Research's contract, third tenure, 2026-10-05

*Read: Marketing's cell strings (relayed by Integration 25th), `docs/research/float-contract/contract-2026-10-05.md` and `validation-prereg-2026-10-05.md` at `c624aeec` (on local main, not yet on origin when read), and at `origin/main` the constant `FILED_SHARES_CURRENT_DAYS = 45` in `lib/research/float.ts` and the `SupplyBlockType` and `SupplyBlockStatus` members in `lib/research/types.ts`. The `guardrails.ts` and `schema.ts` lines about `KNOWN_ACTIVE` were read as grep lines, not the whole files. Wording only: nothing here passes a surface. The validation sample and the unbuilt as-of alignment rule still gate it.*

**The faces:** "≤ 12.3M", "Unknown", "Cannot verify" (two lines), and the contract's fourth state "not researched yet". Marketing withdrew "Unverified", which removes the near-synonym with "Unknown".

**Item 7 (date in the cell): the date in the popover passes, on one stated condition.** Test: what does a trader who never hovers read, and can it rest on an old count? The date was the only defence when nothing bounded the count's age. The contract now bounds it by state: a number appears only if the count's as-of date is at most 45 days before the checkpoint (read at source), and an older count reads "Cannot verify". So the cell cannot show a number built on a count older than that. **The ruling holds only while the maximum age is 45 days.** If he moves it to 90 or 120 the date returns to the cell face (size grade, section 13f: 120 days only with the date wording). **Wherever the number appears without a popover** (report text, MCP tool output, exports, any stored copy) **it carries "as of {date}" inline**; the popover is not a place a persisted number can lean on.

**Item 3 (the conditional behind a bare "≤ 12.3M"): passes if three things hold.** (a) The column header or the once-only legend says the figure is computed from SEC filings and is an upper bound when the filings line up; the header is not a bare "Float". (b) The aria-label carries the same conditional; "no more than 12.3 million shares" alone is the bare claim for the readers who never reach the popover. (c) Recommended, not required: the popover says in one clause what "line up" means (a recent filed count, no known share issuance, holdings dated at or before the count), since "when the inputs line up" tells the reader nothing about what to check.

**Required: reason strings per cause.** The contract gives CANNOT_VERIFY three causes (count too old, active issuance, bound failing the range check) and UNKNOWN three (no filed count, no CIK, a count spread across several filings). The strings as sent fit only some of them. "Cannot verify: shares may have been issued since the filed count" is true for age and issuance and false for a range-check failure, which is a reconciliation alarm. "No filed share count" is false for a name whose count is spread across filings. Each cause needs a string that is true of it, or a generic one that is true of all three.

**Finding: the issuance refusal rests on a model's label, and its absence is not evidence.** `KNOWN_ACTIVE` is an interpreter-assigned status (enum in `schema.ts`, guardrailed against the cited text in `guardrails.ts`). A name with no `KNOWN_ACTIVE` block may still have issued shares: the model missed it, or the ledger is empty because the name was never researched. So PRODUCED means "no flag raised", not "no issuance", and no surface or the page may say or imply the second. The contract's section 5 does not say what state a name with no ledger at all takes. Open for Research: which state, and why.

**Finding: the contract's list of issuance types is narrower than the type set, and the list is this seat's.** Section 5 names ATM, equity line, warrant, convertible and preferred. Those map to `ATM`, `EQUITY_PURCHASE_AGREEMENT`, `WARRANTS`, `CONVERTIBLES`, `PREFERRED_CONVERSION`. The ledger also has `RECENT_OFFERING`, `PIPE`, `ACQUISITION_SHARES`, `OTHER_ISSUED_SHARES`, `REGISTERED_RESALE` and `SHELF_CAPACITY`. A closed offering after the count date is a count that is too low, exactly the case the rule exists for. The list came from section 13f's wording, and nobody compared it with the members. Open for Research: which types create shares after a count date and whether `RECENT_OFFERING`, `PIPE` and `ACQUISITION_SHARES` belong.

**Page seam.** The page draft says the cell reads "no more than X shares, from SEC filings as of ..." and "Cannot verify". It must name the face a trader sees ("≤ 12.3M"), "Unknown", "Cannot verify" and the fourth state, and must not say or imply the validation sample has run.

**Contract text, for Research.** Section 3's "the cell's 'as of' is the filed count's date" becomes the popover (and inline wherever there is no popover). Section 1's "makes no claim about what trades" sits beside a popover that says "freely tradable"; as an upper bound that is consistent, but the two should not read as contradicting each other. The contract's "safe" (section 2, joint filings and unaligned holdings) is internal and must not reach a surface.

## 5f. Float page and cell draft v5 re-read, third tenure, 2026-10-05: NOT READY, five required changes

*Read: `docs/marketing/float-page-draft.md` at `b6484909` (local main, not on origin when read), against 5e. One counterexample search was run and opened (below). Words only: nothing here passes a surface, and the validation sample and the unbuilt as-of rule still gate it.*

**Passes.** The four faces; the per-cause reasons for Unknown (three) and Cannot verify (three) and the single string for not researched yet; the legend ("Float: computed from SEC filings. An upper bound when the filings line up."); the aria-label with the conditional; the popover for the bound and its "lined up means" clause; the 12b-2 paragraph; the 13d-3 paragraph and the below-zero story as 5c corrected it; "A name with nothing flagged may still have issued shares."

**Required changes.**

1. **The off-popover string drops the conditional.** "no more than {X} shares, from SEC filings as of {filed-count date}" is the bare claim in exactly the places with no popover (report text, MCP output, exports, stored copies). Add "when the filings line up".
2. **The closing paragraph states the bound without its condition.** "shown as the most shares that could be trading" in "What this is, and is not" is the 5c item 3 fault again. Add "when the filings line up".
3. **Two comparisons assert how other floats are made or shown.** "What differs is what it is computed from and how we show it", and "shown as a bound rather than a single figure presented as fact" (twice), say others differ in sources and presentation. No source supports that, and the readers' inferable third parties are float vendors (standing rule 2). Say what ours is and stop: "Ours is an estimate too. Here is what it is computed from and how we show it."
4. **"We know of no public source that states a count of freely tradable shares" is contradicted by a source this seat opened,** and the sentence before it ("So a quoted float is an estimate, not a filed fact") is the same universal. Global Cash Access Holdings' S-1 (2006, `sec.gov/Archives/edgar/data/1318568/000095013406009584/f20324orsv1.htm`, read in the browser pane 2026-10-05) says that "approximately 30,130,351 shares ... will be freely tradable without restriction under the Securities Act, unless held by our 'affiliates'". It is a point-in-time count at an offering, in a "shares eligible for future sale" passage, not a current one, and prospectuses commonly carry such a passage (one prospectus read; how common is not measured). Delete the "no public source" sentence and write: "So a float number on a quote page is an estimate someone computed, unless a filing happens to state it." The live landing sentence ("No filing reports the current number of tradable shares") is unaffected, because of "current". Also change "almost every stock" to "many stocks": it is a coverage claim nobody measured.
5. **"We flag share issuance when we find it in the company's filings, and a flagged name reads Cannot verify" claims two things not established.** The ledger's evidence sources are not confirmed to be filings only (open for Research), and a name carrying a POSSIBLY_ACTIVE block, or a type the rule does not act on (5e, Research's open type question), is flagged in the ledger yet still reads a number. Say: "When we find that shares are being issued, the name reads Cannot verify. A name with nothing found may still have issued shares." Drop "in the company's filings" unless Research confirms it.

**Marketing's four open points.**
1. "No share issuance we know of": change to "no share issuance the desk has flagged". "We know of" claims the writer's awareness; the check is a model's label.
2. "Can only leave the number higher": state the arithmetic instead, "leaving a holding out never lowers our number". It does not claim the number errs high against the truth.
3. Splits: do not remove the line yet. The pre-registration (check 5) treats "a split between the holding's date and the count's date" as a dangerous failure, and the contract's section 2 describes the harness's split check without saying whether the built rule keeps it. Arithmetic, not a measurement: a reverse split makes a pre-split holding too large against a post-split count, which lowers the bound. Research says whether the built rule refuses it; if yes, the page needs nothing, if no, "lined up" must include "no share split between the holding and the count".
4. "Figure fails its check": "against the filed count" covers half of the range check (above zero, and not above the count). Use "did not pass the desk's own sanity check on the figure".

**Recommended.** "Large holders" in the subtraction list sits one section above "13D or 13G"; say "10 percent owners" so the reader does not read them as the same set.

**Not reviewed:** the voice; Design's cell sizing for "not researched yet".

## 5g. Float page and cell draft v6 re-read, third tenure, 2026-10-05: PASS on the five 5f changes and the four points, two small corrections, three items held for Research

*Read: `docs/marketing/float-page-draft.md` at `198d47d2` (local main, not on origin when read). Words only; the validation sample, the unbuilt as-of rule, his sight of the draft and Design's sizing of "not researched yet" still gate any surface.*

**Passes.** All five 5f required changes are applied as asked: the conditional is in the off-popover string and the closing paragraph; the comparison with other floats is gone; the "no public source" sentence is replaced by "an estimate someone computed, unless a filing happens to state it"; "many stocks"; "the desk has flagged"; "never lowers our number"; "10 percent owners". **"10 percent owners" checked against the insider set (5b):** the list reads "the officers, directors, 10 percent owners and anyone else who files Forms 3, 4 and 5", and the catch-all keeps the description as wide as the method (any role, including "other"), so it is not narrower than the code.

**Two small corrections.**
1. **The list is now wider than the method in one place.** Research subtracts only single-owner filings; a joint filing is not attributed (contract section 1). "Anyone else who files Forms 3, 4 and 5" reads as including joint filers. Say "who files Forms 3, 4 and 5 on their own". The direction is safe (leaving a holding out never lowers the number); the claim should still match the method.
2. **The popover string repeats itself:** "did not pass the desk's own sanity check on the figure". Say "did not pass the desk's own sanity check, so it is not shown".

**Held for Research, none of them a Marketing fault.**
1. **Splits.** The page restores "a holding is dated before a share split" as a Cannot verify cause, but the contract defines Cannot verify by three causes (age, issuance, a range failure) and no popover string exists for a fourth. Three outcomes, each changing the page: no built refusal (the line goes and "lined up" gains "no share split between the holding and the count"); a per-owner refusal (it moves to "left out", not Cannot verify); a whole-name refusal (it needs its own popover string). The page cannot ship until Research says which.
2. **"When we find that shares are being issued, the name reads Cannot verify."** True only for the block types the rule acts on. Per the contract those are ATM, equity line, warrant, convertible and preferred, at KNOWN_ACTIVE; a closed offering (`RECENT_OFFERING`) or a PIPE is not on that list (5e). If Research does not widen the list, the sentence is false for those names and must say which issuance it means.
3. **Ledger evidence sources** (whether "in the company's filings" may return): open, unchanged.

**Recommendation for the route.** After the two corrections the wording is ready for his sight. Items 1 and 2 above should reach him as open, not as settled sentences.

## 5h. Float contract at `55af05eb` and float draft v8 at `d05141ad`, third tenure, 2026-10-05: PASS with one required change, one precision, two items for Research

*Read: the whole contract at `55af05eb` (it carries `eba2922b`, `33b2d781`, `4c02162d`; local main, not on origin when read) and `docs/marketing/float-page-draft.md` at `d05141ad`. Not re-derived: the section 4 age figures (Research's `age-rederive` output was not opened; I rely on its statement of method and on the `float.ts` comment read earlier). The contract's own gate 2 ("Commercial re-reads this contract's claims") is met for every claim that reaches a surface, with the exceptions below. Words only; the validation sample, the unbuilt rules, his sight of the draft and Design's sizing still gate any surface.*

**Passes.** All three new strings and the lines that follow from them, except one required change. **Splits:** the holding rule (a holding across a split is refused, never a Cannot verify cause) and the count-level `SPLIT_SINCE_COUNT` are both stated and the page now matches: the Cannot verify list carries "a split may have changed the share units", the split string is true of both of its causes ("or we could not rule one out"), and the lined-up clause carries "no share split since the count". **Issuance:** the sentence "When we find that shares have been issued since the count, or may be, the name reads Cannot verify" is true of the contract's rule (KNOWN_ACTIVE and POSSIBLY_ACTIVE; closed-issuance types only when dated after the count or undated). **Evidence sources:** "in the company's filings" stays out, correctly: the contract shows a block may cite any source type, and no check reads the type. The legend and bound claims are unchanged and still hold.

**Required change: the `ISSUANCE_NOT_CHECKED` string collides with the "not researched yet" face.** "the desk has no research on this name as of this checkpoint, so share issuance was not checked" and "The desk has not computed this name yet" read to a trader as the same thing, and they are different states: the contract's test is whether the bound job ran. In the first the desk HAS fetched the count and computed the bound but holds no dossier, so what is missing is a review of the company's share supply. Say: "Cannot verify: we have not yet reviewed this company's share supply, so share issuance was not checked." That keeps "research" out of the one and reserves "not computed" for the other.

**Precision (recommended).** "A holding dated after the filed count, or before a share split, is left out": the contract refuses a holding only when a split fell between it and the count. Say "or before a share split that fell between it and the count".

**For Research, from reading the contract.**
1. **`effectiveDate` is a registration date, not necessarily an issue date.** Section 5 treats a closed-issuance block as already in the count if its `effectiveDate` is on or before the count's as-of date. Shares from an offering are created at closing, which can follow effectiveness by days. I have not opened what the field holds for `RECENT_OFFERING`, `PIPE` and `ACQUISITION_SHARES`. Say what it holds; if it can precede the closing, the rule has a gap of a few days for those types.
2. **Two internal sentences are unconditional and must not be quoted on a surface:** "If every holding is refused, the bound equals the count, which is still a true upper bound" (section 2) is true only when the filings line up, like every other bound statement here, and "the harmless direction" (section 2) is the "safe" register the contract already keeps internal.

**For Marketing, hygiene only.** The draft's header still says "Title carries v6", still lists items (a), (b), (c) as held, and the v4 to v5 and v5 to v6 lists are stacked below the current one. A reader, and Integration, should not have to work out which is current; keep one change list.

**Open points of Marketing's, answered.** (1) "Not researched yet" against "we did not check for issuance": answered by the contract's row test (section 3), and by the required change above. (2) The wider issuance rule: still Integration's and his, on Research's table; the string loses nothing either way. (3) The three new strings: read, one change.

## 6. Setup grade words draft v1 (Marketing `7e0472d1`) against Research's rubric draft (`d63a00aa`), third tenure, 2026-10-05: NOT READY, four required changes

*Read: `docs/marketing/setup-grade-words-draft.md` at `7e0472d1`, the rubric draft and `simulate-out-2026-10-05.json` at `d63a00aa` (both on local main, not on origin when read), and sections 1 and 4 above. Not read: the code that will compute the grades. The thresholds and the five decisions are his; nothing here ranks them.*

**Passes.** The shape (one tooltip form for all four letters, reading then basis); C ("the cycle reads as a backside", which is exactly the rule that produces C); D (as passed in section 4); the five readings for cycle, catalyst, liquidity and share supply; "Rests on", never "drove"; no forward tense and no word from the struck list; the surface sweep (section 5 of the draft); the choice to write no sentence about how rare A is, and the rule that a dated measurement would come back here; the legend's claims ("the same for every reader", "not a prediction, not a recommendation"); the criterion names, which hold whichever way decision 1 goes.

**Required changes.**
1. **B's reading is false for a large share of B rows.** The rubric makes B "otherwise" (rule 5): everything that is not unreadable, D, C or A. That includes a name with several criteria strong and one that could not be read, because A needs all five readable. "Meaningful limits on one or more criteria" says the criteria read limited. The simulation puts 293 rows in B, and the cycle alone is unreadable on 419 of 719 rows, so a B whose only shortfall is an unreadable criterion is common, not marginal. Say: "One or more criteria read below the strongest, or could not be read." The {Basis} line already separates "Limited" from "Not readable".
2. **A's reading overstates.** "The strongest reading of the five criteria" reads as all five at the top. Rubric rule 4 needs only four strong and the fifth readable and not unknown, and share supply cannot read strong until the float bound ships (no stored row reads clean), so every A today carries Limited share supply in its own basis line. The tooltip would contradict itself. Say: "The highest grade on these criteria." That stays true whichever way decision 2 (how hard A is) goes.
3. **"Light against its normal" is false for part of its band.** Relative volume is a multiple of normal. The draft's Risk cut is under 2, so a name at 1.5 trades above its normal and would read "Light against its normal". "Heavy" and "Moderate" against normal have the same problem at their edges. Use words true across each band and tied to the scale, not to normal: "Relative volume reads heavy on the desk's scale", "moderate", "light". The cuts are decision 3; the words must hold wherever he puts them.
4. **The dash state and its tooltip are false for the rows they are meant for, and the rubric does not produce the state.** "The desk has not read this name at this checkpoint" is false for a name with no research: volume reads on all 719 simulated rows (none unreadable, none not-yet) and liquidity is readable on 507, so the desk read what it could. And no rule in rubric section 2 yields a grade of NOT_YET: a no-dossier name has only volume and liquidity readable, so rule 1 stores it UNKNOWN; this is why the simulation's 213 not-graded rows contain all 147 no-dossier rows. So there is nothing for the dash to mean until Research defines which rows are NOT_YET. Until then: no dash state, no dash sentence in the legend (that sentence makes the same false claim), and two strings for stored UNKNOWN, one per cause: **"Not graded as of {time} ET. The desk has no research on this name at this checkpoint, so fewer than three of the five criteria could be read."** and **"Not graded as of {time} ET. Fewer than three of the five criteria could be read."** The second alone implies the desk tried and failed on a name it never researched, which is the per-cause rule from the float read (5e).

**Marketing's three open items, answered.**
1. *No-dossier row, dash or "Not graded":* "Not graded", with the cause-specific string above. If Research later defines a real NOT_YET, the dash comes back with Research's definition and a string true of it.
2. *The legend's link to a rubric page that does not exist:* ship the legend without the link. Remove the link and its sentence entirely; do not write "see the rubric" or leave a placeholder. The legend still names the five criteria, and the tooltip readings in words describe the measure. When the rubric page exists (it carries decision 3's thresholds, so after he approves them), the page and the link come here for a read before they ship.
3. *"Not tested against outcomes" expiring:* the condition stands and is tied to a flag, changed in the same commit as the first outcome test. At expiry the sentence is deleted, not replaced with a result: any statement of how grades did against outcomes is an outcome claim (section 2f rule 1) and comes back to this seat. Research's simulation measures no outcome and does not trigger it.

**Not reviewed:** the voice; the rubric page when written; the board's behaviour once graded.

**6a. Passes recorded, 2026-10-05.** Setup grade words v2 (`4a04b132`): the four section 6 changes are applied as written, the legend ships without the rubric link, the outcomes sentence is deleted at expiry and never replaced; PASS. Setup grade words v3 (`5855bf61`), read against rubric rule 0 (`3ca325bd`, "no research row (no dossier) at this checkpoint: stored NOT_YET, no letter", read in the rubric text): the dash state for NOT_YET only, its string "The desk has no research on this name at this checkpoint.", the legend sentence "A dash in this column means the desk has no research on the name at that checkpoint.", and the single Not graded string "Fewer than three of the five criteria could be read." (the no-research Not graded string removed, now unreachable) are each true of the state they describe, and the dash says what is true of the research, not of the name; PASS. Both earlier passes had been given to Integration by message only.

## 5i. What changes if the maximum filed-count age is 90 days instead of 45: float draft v12 (`9c6b0ed4`), third tenure, 2026-10-05

*Asked by Integration 26th before the age goes to him. Read: v12 at `9c6b0ed4`, sections 1 to 3, against 5e (item 7) and 5h. Words only; the age is his.*

**What breaks, by sentence.** My 5e ruling put the filed count's date in the popover only because the age was bounded and enforced as a state: at 45 days the cell cannot show a number built on a count older than that. At 90 the ruling reverses (as 5e said it would, and as the size grade's 120-day rule requires): **the date goes on the cell face.** The sentences that change:
1. **The face itself** (section 1 table, the bound row): "≤ 12.3M" becomes "≤ 12.3M" with the count's date beside it. Form and fit in the 102 px column are Design's; the requirement is a date a trader sees without hovering, not its format.
2. **The aria-label on the bound face** carries the date too: "no more than {X} shares, computed from SEC filings as of {filed-count date}, when the filings line up".
3. **"Lined up means: a recent filed count ..." in the popover.** "Recent" stretches to a quarter at 90 days and reads as fresh. Say "a filed count dated {filed-count date}" or name the limit ("filed within the last 90 days").
4. **The page's cell bullet** "The date of the filed count is in the detail" (section 3) becomes false once the date is on the face. Say "The date of the filed count is shown beside it."
5. **The legend** ("Float: computed from SEC filings. An upper bound when the filings line up.") gains a clause saying what the date is: "The date is the filed share count's."
6. **v12's header** "Standing condition from 5e" is then spent and goes.

**What does not break.** The popover strings for Unknown and every Cannot verify cause (the too-old string states a cause, not a number of days); the tooltip; the off-popover string (it already carries the date); the issuance sentence ("A name with nothing found may still have issued shares" stays true and matters more); the 13D, Rule 12b-2 and Rule 13d-3 paragraphs.

**One point for the decision, not a wording change.** The validation sample that passed (`af660d29`) tests holdings, ownership, class, as-of alignment, splits, double counting and the range (the prereg's seven checks). It does not test share issuance since the count, and the miss rate of the issuance flag at any age is unmeasured. So the pass says nothing about whether 90 days is safer or riskier than 45 for the "at most" claim; a longer age widens the window in which an unflagged issuance can make the number too low, and the conditional "when the filings line up" is what carries that risk on the page.

## 6b. The legend after the outcome test, third tenure, 2026-10-05: delete "not tested against outcomes", publish no result in the legend

*Asked by Integration 27th (`local_78f8e5f7`). Read: `docs/research/priority-rubric/outcome-test-result-2026-10-05.md` at `adae1e89` (local main, not on origin when read). I read the file whole; I did not re-derive its statistics or open its report. The test ran on his ruling of 2026-10-05T21:50:53.964Z, as the file records.*

**The sentence is now false.** "The grades have not been tested against outcomes" expired the day this test ran (the condition in 6, item 3). It must be out of the legend in the same commit that publishes the legend.

**Ruling: delete it and put nothing in its place.** The legend then reads, with nothing else changed: *"Setup grade is the desk's own automatic reading of five criteria at the checkpoint shown: cycle, catalyst, relative volume, liquidity and share supply. It is the same for every reader. It is not a prediction and not a recommendation. A dash in this column means the desk has no research on the name at that checkpoint. Not graded means fewer than three of the five criteria could be read."* This is the rule 6 already stated (at expiry the sentence is deleted, never replaced with a result), now applied.

**Why not a one-sentence result in the legend.** The file says what any statement of the result must carry, and no legend sentence can carry it: the population (the after-hours board's leaders at 22:00 ET, $1 to $20, seven weeks, one season), the outcome measured (the next trading day's high, 04:00 through the close), that the test could see a separation of 10 to 30 points and not a few, that the approved rule's A (5 rows) and C (9 rows) could not be tested, and that the quiet ungraded names are selection by the research queue. Every short form fails one way or the other: "tested" reads as support, "did not separate" reads as "no effect" or as "the grades do not work", and both overstate. A statement of how graded names traded is also an outcome statement (section 2f rule 1); a dated aggregate with its population is a fact of record, a bare sentence about the grades is not.

**If he wants the result published, it is a separate dated page, not the legend, and it comes here first.** What it must carry: the dates and the population above; the measure; the result as the file states it ("the grades did not order how far the names ran among the testable groups"); the power limit in the file's words, so "does not separate" is never read as "no effect"; the untested groups; the selection point; and that it is not about any entry, exit, cost or fill. Whether to publish a negative result about the product's own grades is his decision, not a claims one. My recommendation is not now: one season, one narrow population, no power for a few-point effect, and the approved A untested.

**What must not be said anywhere, in the legend, a tooltip, the page or marketing copy:** that the grades were "tested" without the page above; that they "did not work" or "do not predict"; that the grades "have been validated". Nothing in the test changes the wording passed in 6a and 5: D, the readings and the tooltips state the desk's reading of five criteria, not an expectation of how a name will trade.

**Sweep for Marketing.** Every place the old sentence or its idea appears: the legend, any tooltip, the rubric page draft, MCP and API descriptions, report text. The old sentence is gone from all of them in the same commit.

## 5j. Float draft v13 (`226fbf72`) and the legend commit (`e1220516`) read, third tenure, 2026-10-05: legend PASS; v13 five of six pass, one required change

*Read as diffs: v13 against v12 (`9c6b0ed4`), and section 4 of the setup grade words at `e1220516` against the text ruled in 6b. Both on local main, not on origin when read.*

**Setup grade legend (`e1220516`): PASS.** It prints the 6b text exactly: the outcomes clause is deleted and nothing is in its place, and section 4a records the deletion. The old sentence survives only in the draft's own change history and in 4a, which are not reader-facing. Marketing's sweep found two stale non-reader-facing mentions that are not Marketing's: the comment at `lib/research/priorityGrade.ts:7` ("has not been tested against outcomes") and a dated historical line at `docs/sheet-removal-plan-2026-10-03.md:86`. The comment is Research's or Design's to fix with the code; I did not open either file.

**Float draft v13: the date on the face, five of the six sentences pass.** The bound face with the filed count's date beside it (format and fit Design's), the aria-label with "as of {filed-count date}", the page bullet "shown beside it", the legend clause "The date is the filed share count's.", and the removed 5e standing-condition line all match 5i. 0 em dashes.

**Required change: "within the last 90 days" is not what the rule measures.** The popover now reads "a filed count dated {filed-count date}, within the last 90 days" (and the table's When column says "filed within the last 90 days"). Two faults. (1) "The last 90 days" is relative to now, and the contract measures the count's as-of date to the CHECKPOINT date, in whole days, so a row does not change state between the checkpoint and the page load; a count 89 days old at the checkpoint is more than 90 days old a day later, and a stored copy read months later would say something false. (2) The date shown is the count's as-of date, which can precede its filing date, so "filed within" is a different quantity from "dated within". Say: "a filed count dated {filed-count date}, at most 90 days before the checkpoint" in the popover, and "dated within 90 days of the checkpoint" in the table. Nothing else in the draft changes.

## 5k. Does the float wording survive reusing a fetched row (build plan option B)? Third tenure, 2026-10-05

*Asked by Integration 27th. Read: `docs/research/float-contract/build-plan-2026-10-05.md` at `09d262b9`, section 3 in full and sections 1, 2, 4 and 5 for context; the contract at `55af05eb` section 2 (the as-of rule); Marketing's v14 (`65603d38`) for the quoted sentences. I read the plan and contract text, not the code. Option B as the plan states it: the board takes the newest stored row on or before the display date D and recomputes the cell at D (age to D, split proof through D, the ledger current at D).*

**Short answer.** The date and age wording holds if D is fixed per checkpoint. Two other things break, and one of them is not caused by reuse.

**1. "Dated within 90 days of the checkpoint" holds, on one condition.** B recomputes the age to D, so a row fetched the evening before does not make the age claim false. It holds only if D is the checkpoint's date, fixed when the checkpoint is written (the contract's own rule, so a row does not change state between the checkpoint and the page load), and not the render date. If D is the render date, "the checkpoint" is wrong everywhere it appears; say "the date shown" and show that date. A stored report or export carries its own D.

**2. "The most recent filed share count" breaks under B.** The popover's "a filed count dated ..." is fine, but the tooltip ("the most recent filed share count") and the page ("the share count the company most recently filed") say the newest count that exists. Under B it is the newest the desk fetched. A 10-Q filed after the fetch is not seen. Say "the latest filed share count we have". **The plan's own reasoning about this is not right:** it says a later count not seen is "on the safe side" because the older count ages out. A later count with more shares (issuance since) makes the stored bound too LOW, which is the dangerous direction; it is the same unflagged-issuance risk the page already carries, now with the fetch's staleness added. So the maximum reuse span (Integration's second condition) matters to the claim, not only to the build. The same holds for the plan's "a late Form 4 not seen: the bound stays higher": an unseen Form 4 reporting a disposition dated on or before the count means the holding we subtracted is too large, and the bound too low.

**3. Where the reader sees it: the popover carries the date the desk read the filings.** One clause: "Filings read on {fetch date}." A reused row then cannot read as fresh. It is not needed on the face.

**4. "Upper bound" needs one more condition, and it is not about reuse.** The contract subtracts each insider's holding as of the count's date and ignores any later filing: "per owner, use the holding with the latest as-of date that is at or before the count's as-of date." So an insider who SOLD after the count date is still subtracted at the larger count-date holding, and the true float today is larger than the stored bound. The page says "the true float is at most that number" (present tense) and its list of what "lined up" means covers issuance, splits and holding dates, not insider sales since the count. This holds for a fresh row as much as a reused one; Integration's first condition (a sale filed after the fetch) is the same fault, seen from reuse. The validation pass does not cover it: the prereg's seven checks and the 50-holding audit test the arithmetic and alignment against the count's date, not what insiders did afterwards. With a 90-day maximum age the window is long.

Two ways to make the claim true:
- **Fix the rule (Research's):** an insider with any Form 3, 4 or 5 dated after the count's as-of date is not subtracted. That is the safe direction (the bound stays higher) and the desk already reads those filings. Then "lined up" can include "no sale by a subtracted insider since the count", and the desk checks it.
- **Until then, date the claim:** "no more than {X} shares as of {filed-count date}" in the popover and tooltip (past, not "is"), and add "or insiders may have sold" to the page's "A name with nothing found may still have issued shares." The legend and aria-label already carry "as of".

**What does not change.** The faces and reasons; the 13D, 12b-2 and 13d-3 paragraphs; "when the filings line up" as the standing conditional; the gate re-run at D (a reused row can only move toward Cannot verify). Item 4 needs Research before Marketing words it.

## 5l. Research's insider-sale registration (sections 2 and 3), third tenure, 2026-10-05: S1 and S0 both pass; the wording that breaks; requirements for `FILINGS_NOT_REREAD`

*Read: `docs/research/float-contract/insider-sale-registration-2026-10-05.md` at `53502953` (registration `d47b26ca`, amendment 1), sections 1 to 5, with sections 2 and 3 for claims. Asked by Research-tmi `local_dd23765d` (verified by `get_session`, created 22:03:52Z). Not read: the code, the measurement (not yet run).*

**The rule passes on claims, S1 or S0.** I walked S1 through on the arithmetic: with no issuance the count at D is at most the stored count, and S1 subtracts at most what each insider holds at D (a sale lowers `hD`, a purchase or grant leaves `h0`, which is no more than they hold), so the stored count minus the subtraction is at least the float at D. That is an upper bound at D when the filings read are complete and no shares were issued, the conditions the registration states. S0 is also safe and simpler to word. The choice between them is Integration's and the measurement's, not a claims one. Research's own limit stands and must reach the reader: a sale not yet filed by the date the filings were read is invisible to both.

**Wording that breaks under S1 (and under S0 in a different way), for Marketing.** The approved float draft says the holdings are "dated at or before the count" in three places: the popover's "Lined up means: ... holdings dated at or before the count", the page's "each holding taken from that filer's own filing and dated at or before the count", and the page's "A holding dated after the filed count ... is left out". Under S1 a later holding is USED when it is lower (a sale), and left out only when it is higher. Under S0 an insider who filed a trade after the count is dropped whole. Say, for S1: "we subtract the smaller of the shares an insider held at the count's date and the shares their latest filing shows". The popover's lined-up list should read "insider holdings as filed through {fetch date}" in place of "holdings dated at or before the count". "Leaving a holding out never lowers our number" stays true as arithmetic.

**The unfiled-sale limit must reach the reader,** as Research proposes: "A sale not yet filed by the date the filings were read can still make the float larger than the bound" belongs in the page's "What a number does not tell you", beside the issuance sentence. With S1 built, the present-tense "the true float is at most this" is true at D under the stated conditions, and my 5k interim of dating the claim ("no more than {X} as of {date}") is no longer needed once S1 ships; until it ships it stands.

**`FILINGS_NOT_REREAD` (section 3), requirements for the string; the words are Marketing's.** It must (1) name the date the filings were last read; (2) say only what is true of the cause, that the desk has not read this company's filings since that date, and not that the filings are old, wrong or changed; (3) not say "not researched" or "not computed" (the desk did read them); (4) read as a Cannot verify reason distinct from the other five. The reader is not built until it has words and my pass, as the registration says.

**The 4-day span:** nothing on the page depends on its length; the claims depend on there being a stated maximum and on the popover carrying the fetch date, both of which the registration provides.

## 5m. Marketing's float wording batch (`891de4f7`, amended for 5l): FORM A, `FILINGS_NOT_REREAD` and its page bullet, third tenure, 2026-10-05

*Read: `docs/marketing/float-wording-batch-2026-10-05.md` at `891de4f7` (local main, not on origin when read). Asked: a pass on FORM A (the claim dated to the count, true under today's rule), the new Cannot verify string and its page bullet. FORM B waits for the rule choice and was not passed here beyond confirming it carries the 5l wording.*

**Passes.** The new string, "Cannot verify: the desk has not read this company's filings since {fetch date}.", meets the four requirements in 5l (names the date; claims only that the filings were not read since; says neither "not researched" nor "not computed"; distinct from the count-too-old reason). Its page bullet clause, "the desk has not read the company's filings since the date given in the detail", passes. FORM A's popover, tooltip and four page edits are true under today's rule: the dated claim ("no more than {X} shares as of {filed-count date}"), "Filings read on {fetch date}", "Insider sales after the count date are not reflected", the tooltip's "the true float as of the count's date is at most this", and the page sentence that insiders may have sold since and that "today's float can be larger than the figure". The batch correctly leaves "holdings dated at or before the count" alone while the rule is today's.

**Three required changes, all places FORM A leaves the claim in the present tense.**
1. **The legend.** "Float: computed from SEC filings. An upper bound when the filings line up. The date is the filed share count's." says "an upper bound" with no date on the claim. Say: "An upper bound as of the date shown, when the filings line up. The date is the filed share count's." The batch's five edits do not touch the legend.
2. **The off-popover string and the aria-label.** "no more than {X} shares when the filings line up, from SEC filings as of {filed-count date}" and "no more than {X} shares, computed from SEC filings as of {filed-count date}, when the filings line up" hang "as of" on the filings or the computation, so the claim itself reads as today's. The off-popover string is the one that travels into reports and exports, where nothing else carries the caveat. Put the date on the claim: "no more than {X} shares as of {filed-count date}, when the filings line up, from SEC filings" and "no more than {X} shares as of {filed-count date}, computed from SEC filings, when the filings line up".
3. **The line for him misdescribes the defect.** "a sale by an insider after the count is not subtracted, so today's float can be larger than the figure" has it backwards: the sold shares ARE still subtracted, at the larger count-date holding. Say: "a sale by an insider after the count is not reflected, so the shares sold are still subtracted and today's float can be larger than the figure." That sentence reaches him, so it has to be right.

**Not changed.** The other sentences in the batch; the 4-day span; the date label ("the checkpoint" on stored copies, "the date shown" on the live board, with the date printed).

**5n. Pass recorded, 2026-10-05.** Marketing's float wording batch at `22bc856f` (`docs/marketing/float-wording-batch-2026-10-05.md`, local main, read as a diff against `415abee3` and `891de4f7`): all three 5m required changes are applied as written (the legend dated "as of the date shown", "as of {filed-count date}" on the claim in the aria-label and the off-popover string, and the line for him now says the sale "is not reflected, so the shares sold are still subtracted"). **PASS on FORM A, the FILINGS_NOT_REREAD string and its page bullet, the legend, the aria-label, the off-popover string, the line for him (Integration rewords it, since the cell never shipped and "no longer says" would be false), and the date label** ("at most 90 days before the checkpoint" on stored reports and exports, "the date shown" on the live board, with that date printed). FORM B is passed only as drafted for later; it needs a pass when S1 is built and measured. The earlier `51e7dd52` is superseded: its FILINGS_NOT_REREAD string ("too long ago to rely on") is not the one passed. S1 is Integration's ruling (S0 only if the measurement's controls fail); I have no claims objection, and "holdings dated at or before the count" in FORM A is true under today's rule and goes when S1 ships.

**5o. FORM B read ahead of the build (S1 is ruled; it ships only once S1 is built and measured), 2026-10-05.** Read: section 2 of `docs/marketing/float-wording-batch-2026-10-05.md` at `22bc856f`. **One required change before it can pass: the lined-up clause "no sale by a subtracted insider filed since the count" is false under S1.** S1 does not require that no sale was filed; it counts it (the insider is still subtracted, at the smaller of the count-date holding and the latest filed one). So a name with a filed sale shows a number while the clause says there was none. Under S0 the clause is true by construction (an insider with a later filing is not subtracted), which is why it read right for the fallback. For S1 delete it and let the holdings clause carry the condition: "insider holdings as filed through {fetch date}, counting any sale filed since the count". The rest of FORM B passes on the same reading as 5l: the present-tense claim, "A sale not yet filed cannot be seen.", the page's "smaller of" sentence, the unfiled-sale sentence beside the issuance sentence, and removal of "A holding dated after the filed count ... is left out". It needs a final pass when the revised batch comes back and S1 is built.

## 7. Warning Shot (prompt rule and guardrails) and the Confirmation state names, third tenure, 2026-10-06: NOT READY for a real-name run, five required changes

*Asked by Integration 28th on his ruling "yes, build both" (2026-10-06T00:22:29.450Z). Read: `docs/research/warning-shot/design-2026-10-06.md` at `43ad2bf2`, sections 1 to 4 (the price table only to place it); `docs/research/confirmation/spec-2026-10-06.md` at `616aac92`, sections 1 to 4; and, at `origin/main`, the `FORBIDDEN` list in `lib/desk/reports/check.ts` (lines 125 to 175) that guardrail 3 reuses. Not read: the code that will run the prompt, and the confirmation spec past section 4. The build can proceed with the corrected rule text and word list; no real-name run until the final prompt text and list come back here.*

**Question: can the Warning Shot sentence, as instructed, read as a forecast, an imperative or a recommendation on a named stock? Yes, as instructed, by three routes.**

1. **The forecast ban is a short list and the guardrail inherits a shorter one.** Section 3 bans "will", "could fall", "expect", "avoid", "buy", "sell", "enter", "exit". Guardrail 3 reuses the report checker's `FORBIDDEN` list, which catches `will`, `pop`, `clearly`, `confirmed`, `guaranteed`, the buy/sell/enter/exit and directive shapes, and `could|may|might|should|would|is likely to|set to|poised to` only when followed by explain, drive, fuel, support, power, push, lift, carry or extend. So "Shares may be issued under the open ATM", "Dilution is likely", "The company faces a reverse split" and "The name is at risk of a halt" all pass the guardrail, and each is a forecast or exposure statement about a named company. The word "risk" itself invites them: the field is a danger a stock could hit, so a model asked to name it reaches for what could happen.
2. **"Warning" is an instruction-shaped word on a named stock.** "Warning Shot" on a ticker reads as a caution to act. The label is Marketing's, but it is a claims point because it carries the field's whole meaning to a reader.
3. **A supply sentence can claim issuance the ledger does not show.** "Open dilution capacity" is a fact; "is diluting" or "has issued" is a claim that needs a `KNOWN_ACTIVE` block, as the existing resale rule already requires (`guardrails.ts:134-148`, read as grep lines earlier). Capacity is not proof (the ruled phrase for registered resale and shelf capacity).

**Required changes.**
1. **The prompt rule says what the sentence is, not only what it is not.** Add: the sentence states a condition that exists in the bundle as of the checkpoint, never what it could cause or lead to, and uses no verb of likelihood or exposure. Give the model two examples, one good ("The supply ledger shows an open at-the-market program of {amount}, with no sales recorded.") and one bad ("The open program may dilute holders."). The existing bans stay.
2. **Extend guardrail 3's word list** (removal, not repair, as designed): modals and likelihood (may, might, could, should, would, can, likely, unlikely, probably, expected, poised, set to, about to, going to, bound to, soon, imminent, upcoming); exposure and danger verbs (risks, faces, threatens, at risk of, exposed to, vulnerable to, danger, dangerous, beware); and characterisations of a named company or person as wrongdoing (fraud, scam, pump, dump, manipulation, toxic, predatory), which no cited source has the standing to make through this field. Reuse the report checker's other rules that apply to prose: engine constants (no `KNOWN_ACTIVE` or `DIRTY_FLOAT` on a surface), the bare "no catalyst" shape, and the float and shares rules (`SHARES_AS_FLOAT`, `SHARES_UNDATED`: no float number, shares outstanding dated and never called float, session-reports section 9). Research's mutants should include one sentence per added shape.
3. **Issuance and selling wording follows the ledger.** A sentence may say shares were issued, sold or are being sold only when a cited block is `KNOWN_ACTIVE`; otherwise it says capacity or program, not activity. How that is enforced is Research's; the rule is stated here.
4. **The label is not "Warning Shot".** Marketing words it; the constraints are that it names the field as the desk's reading of the main risk in the evidence, does not claim the risk is the largest (no guardrail can check it, as section 4 says), and does not read as a caution to act. The Unknown face must say the desk could not establish a risk, never that there is none (section 3's "null is never a claim that there is no risk" must reach the reader in words).
5. **The sources reach the reader or the field does not promise them.** The sentence is "cited"; if the surface does not show the cited sources next to it, nothing may say or imply it is sourced (the same rule as 5 item 9).

**Passes.** One sentence naming a risk as a fact about the evidence, in the past or present tense; null as the answer when no risk is established; "Unknown" for UNKNOWN only and "not researched yet" for NOT_YET; the 40-word cap; the source requirement; the em-dash reader; every example in section 3 being a field the dossier already holds (a summary of the bundle, no new kind of claim); the order in section 7 (Commercial reads before a real-name run). The price is not a claims point.

**Confirmation: the state names print, and three of them need other words.** The state names are internal (all caps, some with underscores, which the checker already bans on a surface), so none may print as written; the printed words are Marketing's. Constraints from this read:
1. **"Confirmed" is out.** It is on the checker's own forbidden list as a certainty word, and next to a grade or a catalyst it reads as the desk verifying the call is right. The state means the compared parts are the same, so the words describe the comparison: "Unchanged since 22:00", naming what was compared (the catalyst and the grade), not "still stands", which claims the whole setup.
2. **If it ships before the grade is stored, it names the catalyst only** ("Catalyst unchanged since 22:00"). The spec's own warning stands: printing a bare "Confirmed" there would claim a grade comparison nobody made.
3. **"REVISED" and "NOT_RECHECKED" are fine in meaning** ("Revised since 22:00"; "Not re-read since 22:00", the spec's own rule that an un-re-read catalyst is never worded as confirmed). `NO_EVENING_CALL` printing nothing is right (a name new this morning is not unconfirmed). `UNKNOWN` prints "Unknown" and never its reason (`GRADE_NOT_STORED`, `VERSION_UNREADABLE` are engine constants). `NOT_YET` (no morning checkpoint yet) must not read as a promise; "No morning check yet" is true and promises only what the schedule does.
4. **The feature label "Confirmation" implies the evening call is being confirmed.** A neutral label ("Since 22:00", "Morning check") is Marketing's to choose; the claims constraint is the same as for "Warning Shot".

**7a. Re-read of the amended Warning Shot design (`6840b616`, sections 1 to 4), third tenure, 2026-10-06: PASS on 1, 2, 3 and 5 with two required additions to the word list and one to the surface.** *Read: the design at `6840b616` and the Confirmation spec line 44 at the same commit. Not read: the code. No real-name run until the two additions below are made and the final prompt text and list are committed.*

**Applied as asked.** The rule states a condition present in the bundle, never what it could cause, with no verb of likelihood or exposure, and carries my good and bad examples (changes 1 and 3 in the prompt text). The neutral schema key `evidenceRisk` is a sound addition, since the model reads the key. Guardrail 3 carries my four groups in full plus the checker's prose shapes, engine constants and bare "no catalyst". Rule 5 carries `SHARES_AS_FLOAT` and `SHARES_UNDATED`. The sources are stated as a Design constraint (change 5). The stated cost of `can` and `may` removing a true restatement of terms is the safe side and I accept it; the removal rate at ship says whether it is too dear. The Confirmation spec line 44 carries my constraints for Marketing's words. The good example passes its own guardrails (checked word by word against groups 1 to 4; "sales" is not an activity word and the sentence contains no modal).

**Required additions.**
1. **Rule 4's activity words miss the effect words.** The list is issued, issuing, sold, selling, sells, being sold, diluted, diluting. "The open program dilutes holders", "a dilutive program" and "the issuance has begun" pass it, and each states an effect or an activity the ledger status does not show (an open program is capacity; nothing is diluted until shares are issued). Add dilute, dilutes, dilutive, dilution, issuance, and "raised", "converted", "exercised" (each is an act that has happened or is happening). Dilution as a noun then removes "dilution capacity" unless a cited block is `KNOWN_ACTIVE`; that errs safe, and the good example already says "program".
2. **The sentence is dated on the surface, not by "as of now".** "As of now" in the prompt means nothing to a stored copy or an export. The surface carries the checkpoint time with the sentence ("as of {checkpoint time} ET", the grade tooltip's form). The prompt may say "as of the bundle's date".

**Recommended, not required.** The cycle and the catalyst grade are the desk's readings, not facts in a filing: "a backside cycle" and "a catalyst that is stale" in the prompt's examples read as facts about the stock. Say the cycle "reads as" a backside, the same wording passed for the grade.

**Still Marketing's:** the label, the Unknown face and the Confirmation words. Nothing else changes.
