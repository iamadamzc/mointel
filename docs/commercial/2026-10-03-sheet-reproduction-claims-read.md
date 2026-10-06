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

**7b. Pass recorded, 2026-10-06.** Warning Shot design at `26597e9d` (`docs/research/warning-shot/design-2026-10-06.md`, read as a diff against `6840b616`): both 7a additions and the recommendation are applied as written (rule 4 now removes on issuance, dilute, dilutes, diluted, dilutive, dilution, raised, converted and exercised unless a cited block is KNOWN_ACTIVE; the prompt says "as of the bundle's date" and every surface, stored report and export prints the sentence with "as of {checkpoint time} ET"; the cycle "reads as" a phase and the catalyst is "the desk reads as" stale). **PASS: the committed design text is the prompt text and word list as designed.** The good example still passes rules 3 and 4 (no word of either in it). Still owed to this seat before any real-name run: the built code's literal prompt string and word list, read against this text; and Marketing's label, Unknown face and Confirmation words.

## 5p. The measured issuance miss rate and what it changes in 5i and 5k, third tenure, 2026-10-06

*Read: `docs/research/float-contract/slot-results-2026-10-06.md` at `32754f0d`, whole. Not re-derived: the measurements. Asked by Integration 28th, who has ruled a direct submissions check (424B and 8-K item 3.02 filed after the count, refusing on any hit) before the float is ever on.*

**What the result says, in its own words.** The issuance flag misses at least 7 of 34 unflagged names under the narrow rule (20.6 percent, 95 percent upper bound 35.2) and 4 of 14 under the contract's wide rule; one of the five rows the cell would print (BKYI, 2026-09-23) had an 8-K item 3.02 filed two days after its count with no flag. It is a lower bound (ATM sales between supplements and conversions that file nothing are invisible to the instrument), n is small, and one of the six narrow-rule misses may be an ATM set-up supplement, which is capacity and not a sale (the file says it did not check).

**What this changes in my reads.**
1. **5i's framing of the age choice is incomplete.** 5i said a longer maximum age widens the window for an unflagged issuance and that the validation pass says nothing about the flag. Now measured: BKYI's count is dated 2026-08-11 and the row is 2026-09-23, 43 days, inside even the 45-day maximum. So the age limit is not what keeps an issued-shares count off the cell; the flag and the direct check are, and the flag misses often. His 90-day ruling was made with the risk stated and unmeasured. The measured number is a changed fact that bears on it, and whether 90 still stands is his; it should reach him with the 43-day case beside it, so it is not read as only a 90-day problem.
2. **The page and popover must say what the new check is, and still never say "none".** The popover's "no share issuance the desk has flagged" is still literally true but now reads as comfort it has not earned. With the direct check, the lined-up clause names it: no flagged issuance, and no prospectus supplement or unregistered-sale report filed since the count. Marketing words it. The page's "A name with nothing found may still have issued shares" stays and gains what the desk looks at. The check cannot see ATM sales between supplements, conversions or exercises that file nothing (Research's own limit), so no surface may say or imply that no shares were issued.
3. **No new refusal reason is needed for words.** "Cannot verify: shares may have been issued since the filed count." is true of a direct-check hit as well. If Research stores a separate reason for its own bookkeeping, the surface may use the same string; a separate string must say that a filing since the count date may have added shares, name the date, and never say shares were issued (a 424B5 can be an ATM set-up, which is capacity).
4. **Nothing on any surface says "audited" or "verified"** about the float, as already ruled; the measurement is the reason.

**What does not change.** 5k (reuse, the as-of date, the insider-sale rule) and the passes in 5m to 5o: the faces, the dated claim, FILINGS_NOT_REREAD, the legend and the date label are about arithmetic and dating, and the measurement does not touch them.


## 5q. Float draft v17 (`7b6c9786`, the issuance check named), fourth tenure, 2026-10-06: PASS on the structure, two required changes, one dependency on the build

*Read: `docs/marketing/float-page-draft.md` and `docs/marketing/float-wording-batch-2026-10-05.md` section 9 as a diff of `7b6c9786` (local main, not on origin when read). Opened for the facts the new words rely on: `docs/research/float-contract/issuance-miss-prereg-2026-10-06.md` (event definitions E1 and E2, the 424B3 and 424B2 exclusion, the blind spots), the SEC Form 8-K (sec.gov/files/form8-k.pdf, Item 3.02 text, read with pymupdf), and 17 CFR 230.424(b) (law.cornell.edu). Not opened: any built check; none exists yet, and Integration's ruling is quoted to me as "424B and 8-K item 3.02", with no form-type list.*

**Passes.**
- The structure: the lined-up clause names the check, the page names the two kinds of filing and what the check cannot see, nothing says "none", "audited" or "verified", and no new refusal string is added. 5p items 2 to 4 are met.
- The one line for him carries the cannot-see sentence and says a hit reads Cannot verify.
- Marketing's own reading that "Cannot verify: shares may have been issued since the filed count." covers a hit (a 424B5 can be a shelf set-up, which is capacity) is right.

**Required change 1: the words claim a wider check than the one that was measured, and that is the comfortable direction.**
"No prospectus or prospectus supplement filed since the count" reads as every prospectus-type filing. The only definition of the check that exists in the tree is the measurement's: E1 is a 424B1, 424B4 or 424B5 (a final prospectus for an offering or a shelf takedown) and E2 is an 8-K with item 3.02. **A 424B3 and a 424B2 are explicitly not events** (prereg, "424B3 (resale), 424B2, S-3 and S-1 filings alone are NOT events"). A 424B3 is a prospectus supplement in the filer's own words (the validation names carry "424B3 prospectus supplement"; Rule 424(b)(3) covers a prospectus "that reflects facts or events other than" the pricing cases, so it is the routine update, with a resale or a 10-Q attached, and it creates no shares). So if the built check follows the measured one, a name with a 424B3 filed since the count still prints a number under a popover that says no prospectus supplement was filed. That is a true-sounding sentence about a hazard stated wider than what the desk looks at. It is the same class as 5e to 5j (a bound whose condition is not the one the desk tests).
- Marketing's "for Commercial to confirm" (a 424B1 or 424B4 is a prospectus and a 424B5 a supplement): **not confirmed as a mapping.** Under Rule 424(b) the paragraphs are distinguished by what triggered the filing (price determination under Rule 430A, a Rule 415 takedown, other changes), not by prospectus versus supplement; "prospectus supplement" names a 424B3 as correctly as a 424B5.
- **The cure is to word the check from the built form list, not from the ruling's shorthand.** Either (a) the build refuses on every 424B, and "no prospectus or prospectus supplement filed since the count" is then true (an over-refusal is conservative, and the refusal string already says "may have been"); or (b) it refuses on 424B1, 424B4 and 424B5 only, and the clause must say what those are: "no final prospectus or pricing prospectus for an offering of shares" (not "any prospectus or supplement"). Research or Integration states which in one line; Marketing words from that line. Until it is stated the popover clause and the one line for him do not pass.

**Required change 2: the page's cannot-see list omits the largest blind spot the 8-K half has.**
Item 3.02 does not require a report for every unregistered sale. Form 8-K, Item 3.02: no report need be filed if the equity securities sold, in the aggregate since the last Item 3.02 report or last periodic report, are **less than 1 percent of the shares outstanding of the class, or less than 5 percent for a smaller reporting company**. Most names on this board are smaller reporting companies, so a private placement of up to a twentieth of the class files no 8-K at all. "No report of an unregistered sale filed since the count" is true of the check and still silent on that. The page's list ("sales under an open at-the-market program between supplements, and conversions or exercises that file nothing") should gain it: "private placements below the size that requires a report". The popover clause may stay as drafted (it says only what the desk looks for), and the page is where the limit belongs, as 5p item 2 asked.

**One precision, not a required change.** The page says "a prospectus or prospectus supplement, and a report of an unregistered sale of shares" are "two kinds made after the count". "Filed after the count" is what the check tests; a report is due four business days after the event, so a sale in the last days before the fetch date can be unreported yet. "Filings read on {fetch date}" already carries this and no edit is needed.

**What does not change.** 5p item 1: whether the 90-day maximum stands is his, with the 43-day BKYI case beside it. He ruled (2026-10-06, "keep 90, yes reset"; verified at his own turn: a human `enqueue` record in transcript d947056e at 2026-10-06T01:31:38.586Z, typed to Integration) that 90 stands; "yes reset" in the same line is Integration's seat reset. Nothing here reopens it. The note for him on the 90 days is Integration's to carry.

**Dependency.** Form B (the S1 present-tense wording) is separate and unchanged.


## 5r. The built form list, and the wording it licenses (5q required change 1 resolved), fourth tenure, 2026-10-06

*Read: `lib/research/floatJob.ts` lines 84 to 148 at `46b00886` (research/float-job), opened by me; Integration's relay of the same list was not relied on.*

**What the code does.** The check refuses when the submissions listing holds, filed on or after the count's as-of date (the count's own date inclusive) and up to the reading date D: a form that is exactly `424B1`, `424B4` or `424B5` (the code's own comment: "Final prospectuses for an offering or a shelf takedown. NOT 424B2, 424B3 (resale), S-1, S-3 or S-8"), or an `8-K` or `8-K/A` whose items include `3.02`. Every other form is not an event, including 424B2, 424B3, 424B7, 424B8, S-1, S-3 and S-8. The listing is the recent page only; if its earliest filing is later than the count date the job throws (`listingReaches`) and does not print a "no hit".

**Verdict on 5q required change 1: the build matches the measured list, so the cure is (b).** The clause "no prospectus or prospectus supplement" is false of this build (a 424B3 supplement and a 424B2 pass the check). The words must name what is checked, in terms true of that list, and must not use "prospectus supplement" as the description of the checked set. A wording this seat would pass: "no final prospectus for an offering of shares (SEC form 424B1, 424B4 or 424B5) and no report of an unregistered sale of shares (Form 8-K item 3.02) filed on or after the count date". "Filed since the count" is also acceptable and slightly understates the coverage (a filing on the count's own date refuses); the exact form is better.

**Does a resale 424B3 have to refuse for the claim to be safe? No.** A 424B3 registers resale of shares that already exist, so it adds none; a private placement that created them reports on item 3.02 if it is large enough, and below that size (required change 2) it files nothing, so refusing on 424B3 would not close that gap either. The surface only has to say what is checked and what is not. No design change is asked of Research.

**What the page may say about forms not checked.** Nothing is required. If Marketing wants to head off the "what about supplements" question, one true clause is: "resale prospectuses and routine prospectus supplements do not trigger it."

**Still owed on required change 2.** The page sentence on private placements below the item 3.02 reporting size (1 percent of the class, 5 percent for a smaller reporting company). The one line for him waits on both.


## 5s. Float draft v19 (`d5ca0adc`, the issuance check released), fourth tenure, 2026-10-06: PASS

*Read: `docs/marketing/float-page-draft.md` and `docs/marketing/float-wording-batch-2026-10-05.md` section 9b as the diff of `d5ca0adc` (local main, not on origin when read), plus every line of the draft that describes issuance (grep of the whole file). The build's form list is 5r, which I opened in the code; Marketing opened it too.*

**PASS.** The popover clause names the check as the code runs it: "no final prospectus for an offering of shares (SEC form 424B1, 424B4 or 424B5) and no report of an unregistered sale of shares (Form 8-K item 3.02) filed on or after the count date". The page names the same two kinds with the same forms, says resale prospectuses and routine prospectus supplements do not trigger the check (true of 424B2, 424B3, 424B7 and 424B8 in the code), adds the private-placement item with its 1 percent and 5 percent thresholds (Form 8-K item 3.02, read at the SEC form by me in 5q and by Marketing), and keeps the ATM and conversions sentence. Nothing says "none", "audited" or "verified". No other surface in the draft describes the check differently (the legend, aria-label, off-popover string and tooltip carry only "when the filings line up"; the Cannot verify strings say "may have been issued"). The one line for him in batch section 9b is true of the build and of the page. No em dash in either file (bytes, with a control).

**Two precisions, neither required.**
1. "Routine prospectus supplements do not trigger the check" sits one sentence after a 424B5 (a prospectus supplement in common usage) is named as a trigger. The words are true because of "routine", and the sentence before names the triggering forms, but a reader who stops at "supplements" could take a 424B5 as excluded; that is the safe direction (it understates what the check refuses on). If Marketing wants it exact: "Resale prospectuses and prospectus updates (such as forms 424B2 and 424B3) do not trigger the check."
2. "Item 3.02 requires none below 1 percent of the class" omits that the thresholds are measured in aggregate since the last item 3.02 report or periodic report, so a series of small sales can reach a report. Also the safe direction (the desk sees more than the sentence says), and the sentence is a cannot-see list, not a promise.

**Handoff.** Web may place the page and popover for his private preview on this pass. The one line for him goes through Integration. The pass covers wording only; the build, his sight of the page, and Form B are not part of it.


## 7c. Warning Shot and morning check words v2 (Marketing `842733f8`), fourth tenure, 2026-10-06: NOT READY, two required changes, one of my own passes withdrawn

*Read: `docs/marketing/warning-shot-confirmation-words-2026-10-06.md` at `842733f8`, whole; against the Warning Shot design at `26597e9d` and the Confirmation spec at `6840b616`, in particular the state definitions (design section 2 "States", section 6 "Reused dossiers stay NOT_YET"; spec sections 2 to 4). Not read: any built code. Both specs are on local main only.*

**Required change 1: drop "Main" from the label.** "Main risk in the evidence" asserts a ranking (the principal risk) that no guardrail can check (design section 4), which is the claim 7 item 4 asked the label not to make. The hover disclaims it ("not a ranking the desk checked"), but the label is what travels into reports and exports without the hover, and "main" carries what "largest" would have. Say "Risk in the evidence" (or "A risk in the evidence") and, in the hover, "its reading of a risk the evidence shows for this name". **This is partly my own doing:** 7 item 4 itself said "the desk's reading of the main risk in the evidence" next to "does not claim the risk is the largest"; the constraint contradicted itself and Marketing built to its first half.

**Required change 2: the Unknown hover is false for one of its two causes.** "The desk could not establish a risk from its research for this name." The state UNKNOWN is "the model returned null, **or a guardrail removed the text**" (design section 2). A removed sentence means the desk did establish a risk and withheld its wording; "could not establish" is untrue of that name, and the face "Unknown" reads the same way. The ruling I wrote in 7 item 4 ("must say the desk could not establish a risk") was too narrow for a state I had read the definition of. Say: "The desk is not showing a risk for this name. That is not a finding that there is no risk." True of both causes, and it still never reads as "none".

**Passes, and one pass of mine withdrawn.**
- **"Not recorded" for NOT_YET: passed, and the spec's "not researched yet" is withdrawn.** NOT_YET is "the dossier predates schema version 3", and design section 6 recommends that reused dossiers stay NOT_YET, so a researched name carries it for as long as its evidence is unchanged. "Not researched yet" is false of those names and promises something is coming, as Marketing says. 7 passed the spec's string after reading sections 1 to 4 of the design; the case that breaks it was in section 6, which I had not opened. The hover "This name's research was written before the desk recorded this field." is true of both a reused and an old dossier.
- The Unknown face "Unknown", NO_EVENING_CALL printing nothing, UNKNOWN on the morning check printing "Unknown" with no reason, and the four state names never printing: pass.
- "Morning check" as the label and its hover (names the four parts compared and says nothing else is): pass. "Confirmed" appears in no printed string.
- CONFIRMED: "Catalyst and setup grade unchanged since {evening ET}" with "Compared: {evening ET} and {morning ET}" always under it: pass (it names what was compared and dates both ends). Its detail says "The desk re-read this name's research after the evening checkpoint"; the spec counts a re-check as a new version or a COMPLETE job in the window, and a job whose evidence is unchanged reuses the interpretation. "Re-read" is fair for the job having run and the interpretation standing; no change required.
- NOT_RECHECKED "Not re-read since {evening ET}" with "The setup grade is the same" (true by the spec's order: a grade change reads REVISED first), NOT_YET "No morning check yet" with "No morning checkpoint has completed for this date", REVISED with from and to and "not stated" for a null, and the rule that REVISED never says the research was re-read: pass.
- Design's two points in section 3 (the grade through the Setup mapping so AVOID and "Priority" do not leak; catalyst enums through the board's display words): correct, and they are claims points as well as build points.

**Recommended, not required.** "Compares the evening call (the {evening ET} recap)" uses "call", which on a named stock reads as a trade call. "The evening reading" or just "the {evening ET} recap" says it without the advice register.

**Still owed to this seat before any real-name run** (unchanged from 7b): the built code's literal prompt string and word list, read against the design text.


## 8. Two small drawer hovers (Marketing's `drawer-rows-words-2026-10-05.md` and `drawer-rows-18-13-24-words-2026-10-06.md` at `0e1e90e7`), fourth tenure, 2026-10-06

**The country hover: not passed; true of one source and the build reads another.** The hover is "Country is where the company's business address is, from its SEC filings." That is exact for EDGAR's `addresses.business.stateOrCountry` (`lib/research/sec/submissions.ts:131`), decoded by `lib/research/sec/stateCountry.ts` (US state codes read as the United States, and "CA" is California, not Canada). But the field contract maps row 4 to **dossier `country`** (`docs/research/sheet-reproduction/proposal-2026-10-04.md:94`, final in `field-contract-final-2026-10-05.md:61`), and `stateCountry.ts` says in its own comment that `dossier.country` "is MODEL-WRITTEN and mixed": on 2,500 prod versions mostly EDGAR codes copied from the bundle, but also names the model wrote ("Cayman Islands" 67, "Israel" 27, "United States" 16, "US" 15), and `countryName` maps a name to a country without checking it against EDGAR (not re-measured by me; the counts are the file's). So for roughly one dossier in twenty the printed country is the model's word, and "from its SEC filings" is not established for it. Two ways to make it true, and which is a build choice for Design and Research: (a) the drawer's country is `edgarCountry` of the registry code (`issuer_registry.country`), which is the SEC business address by construction, and the hover stands as written; or (b) it stays `dossier.country` and the hover says what is true of it ("Country as recorded in the desk's research"), with the SEC claim dropped. Until one is stated the hover does not pass. The hover is otherwise well made: it says business address, not origin or incorporation.

**The empty supply-group hover: pass, conditional on one fact I did not open.** "The desk's research holds nothing here. Either it found none or it did not read for this group; the record does not say which." with the face "Nothing recorded for this group." is true of both causes and never reads as "none exist". It rests on a negative about the record ("does not say which"). The interpretation bundle carries a deterministic `coverage` summary (`lib/research/interpret/bundle.ts:150`); I did not open whether any per-group "searched, found none" marker reaches the stored dossier the drawer reads. If one does, the hover understates it for those groups and Design should show it; if none does, the sentence stands. Marketing or Design state which in one line.


## 5t and 7d. Pass recorded for float draft v20 and Warning Shot words v3 (Marketing `6fed4658`), fourth tenure, 2026-10-06

*Read: the diff of `6fed4658` (local main, not on origin when read), four files under `docs/marketing/`.*

**5t. Float draft v20: PASS.** It is v19 (5s) plus the two optional precisions, applied as worded: "Resale prospectuses and prospectus updates (such as forms 424B2 and 424B3) do not trigger the check" and the item 3.02 thresholds "counted in total since the last report". Nothing else in the page or popover changed.

**7d. Warning Shot and morning check words v3: PASS on the three 7c changes.** The label is "Risk in the evidence" (no "Main"); the hover is "One sentence from the desk's research: its reading of a risk the evidence shows for this name. It is the desk's reading and not a recommendation."; the Unknown hover is "The desk is not showing a risk for this name. That is not a finding that there is no risk." (true of a null and of a guardrail removal); the morning check's hover says "the {evening ET} recap". Nothing else changed. Still owed to this seat before any real-name run: the built prompt string and word list, read against the design text.

**Still open from 8, both with Design:** the country hover (the hover stands only if row 4 reads `edgarCountry` of the registry code; if it stays `dossier.country` the hover is "Country as recorded in the desk's research."), and the empty supply-group hover (Marketing found `supplyLedger` in `lib/research/interpret/schema.ts:137` is a plain array with no per-group coverage field, and read the schema only; Design or Research confirm nothing else stores one).


## 8a. The country hover and the empty-group hover, resolved with Design, fourth tenure, 2026-10-06

*Read: Design's reply (code reads of `TickerDrawer.tsx`, `researchRepo.ts`, `lib/research/types.ts` at `385e6129`), and by me `lib/research/interpret/schema.ts:174` and `bundle.ts:538`.*

**Empty supply-group hover: PASS, unconditional.** Design read the stored types: `StructureFindings` and `SupplyBlock` carry only the ledger's blocks, no per-group searched or found-none marker reaches the stored dossier, and the 8-K / 6-K group is filled from cited evidence links. "Either it found none or it did not read for this group; the record does not say which" is true.

**Country hover.** Design found two further facts: the drawer line also falls back to the Sheet's country (`TickerDrawer.tsx` passes `sheetCountry`), which is not SEC at all, and `issuer_registry.country` is server-side only, so the SEC-sourced form (a) needs an Ops or Research field before it can be built. So for now form (b).
- **Dossier-sourced value: "Country as recorded in the desk's research."** True of every dossier value, a code or a written-out name.
- **Sheet fallback value: no hover.** The Sheet's country is not the desk's research either.
- **Design's proposal (show the SEC hover when the value decoded from a two-character EDGAR code) is not accepted.** A two-character value in `dossier.country` is the model's copy of the bundle's code: the field is a plain `nullableString` (`schema.ts:174`) and no step checks it against `bundle.country` (`bundle.ts:538`) or the registry. The measurement in `stateCountry.ts` says the codes are mostly copied, which makes the SEC claim probably true, not established; this seat has passed no such claim since 5e. The SEC hover returns when the registry's code reaches the payload and the row reads `edgarCountry` of it.
- **Cut 3 (`385e6129`) already shows the SEC hover unhidden.** It must not ship that way: either the hover is the string above (dossier case) with none on a Sheet value, or no hover on row 4's country in cut 3. Either is true; the SEC sentence is not.


## 7e. The built Warning Shot strings (Research `1822d376`, branch research/warning-shot), fourth tenure, 2026-10-06: PASS on the strings with one required change before a real-name run

*Read: `lib/research/interpret/evidenceRisk.ts` whole, the diffs to `schema.ts`, `openaiInterpreter.ts`, `pipeline.ts` and `guardrails.ts`, the build note, and the names of the tests, at `1822d376` (not on origin when read). Compared with the design at `26597e9d` by script (it extracted the 8 rule parts from the code and the rule paragraph from the design and compared the two strings). Not read: the test bodies beyond the em dash and May cases, and nothing has run: the build note says no tsc, eslint or vitest has run, so this pass covers the strings and lists, not that the build works.*

**Verbatim and complete.**
- `EVIDENCE_RISK_RULE` equals the design's section 3 rule byte for byte (1121 characters, 8 parts joined by one space); the good and bad examples are the design's. The rule is in both the prompt (`evidenceRiskPromptBlock`) and the schema description, under the neutral key `evidenceRisk`.
- `EVIDENCE_RISK_FORBIDDEN` carries every group from 7 item 2: the report checker's shapes (copied, and each one compared by eye against `lib/desk/reports/check.ts` `FORBIDDEN` at origin; the omissions are the report-only shapes "quiet", fit as a forecast and a count of names, as the code comment says) plus "avoid", all eighteen modals and likelihood words, all nine exposure and danger words, all seven characterisation words, the engine-constant shape and the em dash with its entity forms. `EVIDENCE_RISK_ACTIVITY` carries the 7a words (issued, issuing, issuance, sold, selling, sells, dilute, dilutes, diluted, diluting, dilutive, dilution, raised, converted, exercised; "being sold" is covered by "sold" and "selling"). The 40-word cap and the one-sentence rule are in. The em dash pattern in the source holds its escape (`\u2014`), and the test builds the glyph with `String.fromCharCode(0x2014)` and expects a sentence containing it to be removed, so the check can see a planted case once the tests run.
- Guardrail 4 reads the corrected ledger; guardrail 5 carries `float` beside a number and a dated share count.
- States: UNKNOWN covers null and a removal, never the removed text; NOT_YET is schema below 3. This matches the Unknown hover (v3) and the Not recorded string.

**The narrowing is accepted: "May" before a number is the month.** `\bmay\b(?!\s+\d)` removes the modal in every grammatical use (a modal is followed by a verb, never a digit) and keeps "effective on May 5, 2026" and "filed in May 2026". It only narrows a removal and errs safe elsewhere ("In May, ..." is still removed).

**Required change before a real-name run: the good example carries a concrete figure and a claim of absence the model can copy.** "The supply ledger shows an open at-the-market program of $25 million, with no sales recorded." is in the prompt for every name. No guardrail checks a dollar amount (guardrail 5 checks share counts and "float" only), so if the model reuses "$25 million" on a name whose program is a different size, or "with no sales recorded" on a name whose ledger is KNOWN_ACTIVE ("sales" is not an activity word), the sentence passes every rule and states something false about a named company. This is a claim about how the model uses an example, not measured here; the cure costs one string. Use a placeholder and drop the tail: "The supply ledger shows an open at-the-market program of {amount}." (still passes every rule: no modal, no activity word, no number). The bad example stays. **This is my own: the tail was in my 7 item 1 example and I passed the design's figure in 7a, checking the example against the rules and never against being copied.** The test that the good example survives (V1) is unaffected by the change.

**Precision, not required.** The lists do not carry the noun "risk" or the near words "threat", "threats", "warning", "warns", "concern". "At risk of", "faces" and "risks" are removed; "a delisting risk exists" passes and is a condition stated, which is what the field is for. The removal audit at ship will show whether any of these appears; if one does, add it then.

**For the surface build (Design), a requirement that the code cannot show yet.** The stored `evidenceRisk.removed.text` is a sentence a guardrail removed, which by construction can be a forecast or characterisation of a named company. It must never reach a browser payload, an MCP tool result, a report, an export or a log a user reads: every surface takes `evidenceRiskState` only (it returns the rule that removed it, never the text), and a test pins that a payload built from a dossier with a removal carries no part of `removed.text`. Nothing reads the field today but the validator; the payload does not exist yet, so this is a condition on it.

**Release.** With the example changed, the strings and word lists are released from this seat for the first real-name run, in an Ops slot, with the ship conditions in the build note (his yes by literal sha, the at-ship cost measure). The Warning Shot's sentence still needs "as of {checkpoint time} ET" on every surface (7a item 2) and the cited sources beside it or no "cited" claim (7 item 5): Design's.

**Recorded here, 2026-10-06: his ruling on the country hover.** "yes, ship it" at 2026-10-06T01:43:44.168Z (human `enqueue` record in transcript c9a1acbc, Integration's chat), to a question that carried this seat's hold and its acceptable forms accurately. Cut 3 ships with whichever country hover is in it; the SEC-sourced sentence is then live and wrong for the dossier-written and Sheet-fallback cases until Design's fix (`e105d9e6` carries it) is released. The hold was a recommendation and his ruling stands; nothing further is owed from this seat on the string except the read of the built string when the fix is built.


## 5u and 8b. The built strings in cut 4 (`f0748725`, tag design/cut4-candidate-f0748725), fourth tenure, 2026-10-06: PASS

*Read at the commit: `lib/dashboard/companyLine.ts:30`, `components/TickerDrawer.tsx:340`, `lib/dashboard/floatBound.ts:150-260`. Cut 3 (`385e6129`) ships with the old country string on his "yes, ship it" (7e); `e105d9e6` is superseded.*

**8b. Country hover: PASS.** `countryHover` is "Country as recorded in the desk's research." and `TickerDrawer.tsx:340` sets it as the title only when `company.countryFromDossier`, so a Sheet country has none, which is form (b) of 8a. A grep for "business address" and "from its SEC filings" over `components`, `lib` and `app` finds no occurrence.

**5u. Float popover and aria-label: PASS against v20.** The popover's first paragraph and the "Lined up means" paragraph are v20's text, with the clause "no final prospectus for an offering of shares (SEC form 424B1, 424B4 or 424B5) and no report of an unregistered sale of shares (Form 8-K item 3.02) filed on or after the count date", and the aria-label is v20's ("no more than {X} shares as of {date}, computed from SEC filings, when the filings line up"). A bound with no usable number or no count date reads Cannot verify and never prints a bare "at most". The words match what the code checks (5r). **Precision, not required:** "at most 90 days" is typed into the string, not read from the contract's constant, so a later change to the maximum age would leave the popover stale; Design may tie it to the constant.


## 7f. The Warning Shot example changed (Research `f468e044`, branch research/warning-shot), fourth tenure, 2026-10-06: PASS, strings released

*Read: the diff of `f468e044` against `1822d376` for `evidenceRisk.ts` and both test files. Not run: Research's note says tsc, eslint and vitest still wait on an Ops slot.*

7e's required change is made: `EVIDENCE_RISK_GOOD` is "The supply ledger shows an open at-the-market program of {amount}." (no figure, no stated absence). Research added one removal I had not asked for and was right to: a `{` or `}` in the text removes it as `RISK_FORBIDDEN_WORDING`, detail "template placeholder", because the placeholder I introduced passes every other rule and could otherwise reach a surface verbatim. The control test now uses the example with its placeholder filled and asserts that the example copied as written is removed (mutant W28). Nothing else in the rule, the examples or the lists changed. **The strings and word lists are released from this seat for the first real-name run** (an Ops slot, his yes by literal sha, the build note's ship conditions), subject to the surface conditions in 7e, which are Design's.


## 7g. What "Risk in the evidence" is dated to, fourth tenure, 2026-10-06 (Design's question; corrects 7a item 2)

*Read: `lib/research/interpret/pipeline.ts` lines 180 (the bundle's sources read) and 383 (`generatedAt` set after the model call), `lib/research/types.ts:606` (`generatedAt` on the dossier), and Design's account of `readModel.ts:996-1014` (the live drawer reads the current dossier version, not a checkpoint's).*

**The sentence is "as of the bundle's date", and the bundle is read at interpretation time.** So the instant the sentence is true of is the dossier version's own time, `generatedAt` (set a minute or less after the bundle was read; at the minute, the two are the same). It is not a checkpoint's `completed_at`. A checkpoint row cites a version that can have been written days before the checkpoint (a version stays current while its evidence is unchanged), so printing the checkpoint time beside the sentence dates it to an instant its evidence may not reach. **7a item 2 asked for "as of {checkpoint time} ET" by analogy with the grade tooltip; that was wrong for this field**: the grade is computed at the checkpoint, the sentence is not.

**Ruling.** On every surface (live drawer, MCP `get_ticker`, frozen board, reports, exports) the sentence carries "as of {the dossier version's generatedAt, ET, to the minute}" with the date when it is not the reader's day. On a checkpoint surface the version is the one the row cites. A sentence whose version has no `generatedAt` is not shown (an undated sentence is not printed, as with the float's count date). The checkpoint time may appear elsewhere on the row for the grade; it does not date this sentence.

**Ledger.** Entry 5 of the fourth-tenure ledger in the charter.


## 9. Drawer row 5 words (Marketing `7bfc267d`, `drawer-row-5-words-2026-10-06.md`): close, after hours, premarket, fourth tenure, 2026-10-06: NOT READY, three required changes

*Read: the file whole at `7bfc267d` (local main, not on origin when read); against `lib/market/engine.ts` (the rth close and after-hours coverage code: lines 452-466, 812-860, 880-990, 1070-1110), `lib/market/types.ts:55-93`, `docs/ARCHITECTURE.md:59`, and `lib/desk/view.ts:134`. Alpaca's own documentation was fetched on two pages (WebFetch's summary, not the pages read in full): it does not say whether daily bars include extended hours or whether the daily close is the official close. Nothing in the premarket strings is built, and I did not read them.*

**Required change 1: the "16:00 ET" clock is false on an early-close day.** The engine takes the regular-session close as an input (`rthCloseMinutes`, "Defaults to 16:00; an early-close day must pass the calendar's real close"), the schedule takes `closeMinutes`, and the session description has an `earlyClose` flag, so the desk models days when the bell is earlier. Strings that say "16:00 ET" are then wrong: the after-hours face "Today's after hours begins after the 16:00 ET close", the C3 hover "as of the 16:00 ET bell", the volume hover "after the 16:00 ET bell", the prior-session hover. Say it without the clock (or print the day's real close time from the same calendar value Design already holds): "Today's after hours begins after the regular-session close", "as of the bell on {date}", "Counts only trades after the bell".

**Required change 2: the close is called a regular-session close where its source does not say so.** `RthCloseSource` has four values: the two daily-bar sources, `simulator` and `sheet`. C5 ("The regular-session close for {date}, as stored. The desk does not show its source.") asserts "regular-session" for a value whose source is the Sheet or unknown, and the percent hover ("Measured from the regular-session close shown above") repeats it for every source. Use: sheet source, "The close for {date} as the Sheet recorded it."; unknown source with a value, "A close for {date}. The desk did not record where it came from."; and the percent hover "Measured from the close shown above, for {date}." A `simulator` value must not reach a user surface at all.

**Required change 3: the "not recording" hover (A5) does not match what the engine's NONE means.** In the engine `ahCoverage` is NONE only while the regular session has not closed (it is the reset state at `setRthClosed(false)` and the initial value before the bell); after the bell it is COMPLETE (the desk watched the bell, or a seed filled the window) or PARTIAL (the desk started after the bell and has not been seeded). So "The desk was not recording after hours on {date}" is not the meaning of any state the engine produces after the bell. Design states in one line which payload state A5 is for (a stored row of a day the desk was not running, a missing row, something else) and Marketing words it from that; before the bell, NONE must read as the schedule fact (A1), never as a recording gap.

**Recommended, not required.** (a) **A4's cause.** "The desk began recording after the bell on {date}" names one cause. PARTIAL is "observed live: false" and unseeded, which is a process that began after the bell; if the stored row can reach PARTIAL by any other route, a string true of every cause is safer: "The desk did not see every trade after the bell on {date}, so a volume would leave out some." (b) **C3** rests on the engine's own comment that the frozen close "starts as the last regular-session trade the desk saw"; the freeze takes `todayRthClose.close ?? runtime.price` when the session is told it has ended, so Design confirms that the price at that moment is the last trade before the bell and not one after it.

**Passes.** The group label "Sessions" and the line labels; C1 and C2 "The regular-session close from the daily bar for {date}." (see below); C3 apart from the clock, with "The daily bar's close can differ"; C4 "Unknown" with "The desk has no regular-session close recorded for {date}."; A3 "No close" with "The desk has no regular-session close to measure the change from." and no "yet"; no "official" and no "closing auction" anywhere; no forward tense.

**Marketing's question (official close or last trade?).** Keep "official" and "closing auction" out. The repo's own check says the daily bar's close was "verified against minute bars to be the official closing-auction print" (`types.ts:70-75`, `ARCHITECTURE.md:59`), but that is an internal verification (the number of names and the date are not stated) and Alpaca's public pages do not say it. "From the daily bar" is attributive and true; it credits no definition to Alpaca, and that is why it passes.


## 9b. Drawer row 5, additions A6 and PARTIAL-with-no-trade (Marketing `f35d945f`), fourth tenure, 2026-10-06

*Read: the diff of `f35d945f` against `7bfc267d` (local main, not on origin when read). The file still carries the three 9 required changes (the "16:00 ET" clock, the "regular-session" close on a Sheet or unknown source, the A5 "not recording" hover); Marketing's message predates 9 and none of those is re-read here.*

**A6 (after the bell, complete coverage, no after-hours trade seen): two required changes.**
1. **The clock** ("No trade seen since the 16:00 ET bell"; "after the 16:00 ET bell on {date}"): 9 required change 1 applies. "No trade seen since the bell"; "... saw no trade after the bell on {date}."
2. **"The desk was recording" is not what COMPLETE means.** In the engine COMPLETE is "observed live from the close" or "seeded" (`seedAfterHours` fills the window a restarted desk missed, and sets COMPLETE), so on a seeded name the desk was not recording the whole time. A string true of both: "The desk's after-hours record for {date} is complete and holds no trade after the bell." The face "No trade seen since the bell" is fine: "seen" keeps the claim about the record, not the market, which is the right instinct.

**One thing the words depend on and I cannot read from here:** what "no trade seen" is computed from. It must be "no trade with a timestamp at or after the bell in the record", not an empty price, a price equal to the close, or a zero volume. Design confirms which, because the wrong test prints "no trade seen" on a name that traded and whose price came back to the close.

**PARTIAL with no trade seen (price and percent "Unknown"): pass in meaning, with the clock-free form and the cause caveat from 9.** "The desk began recording after the bell on {date}, so it cannot say whether trades occurred before it started." says what it cannot say, which is the claim; it names one cause of PARTIAL (a process that started after the bell), and 9 recommended (a) the cause-neutral form ("The desk did not see every trade after the bell on {date}, so it cannot say whether trades occurred.") if any other route can reach PARTIAL.

**Design's seven placeholders mapped to the words:** the mapping is consistent with 9 and moves nothing, except that `closeOther` still maps to the C5 hover 9 required change 2 rewrites, and `afterHoursNotRecorded` to the A5 hover 9 required change 3 holds.


## 9c. Drawer row 5 words after 9 (Marketing `83c8193c`), fourth tenure, 2026-10-06: PASS on 9 required changes 1 and 2; A6 hover and A5 still open

*Read: the diff of `83c8193c` against `f35d945f` (local main, not on origin when read), and a grep of the whole file for "16:00" (the only remaining mentions are in the note that records the change).*

**9 required change 1 (no clock): applied, PASS.** Every string says "the bell" or "the regular-session close", including the A1 face "Today's after hours begins after the regular-session close", the C3 hover, the volume hover and the prior-session hover.

**9 required change 2 (source honesty): applied, PASS.** Sheet source "The close for {date} as the Sheet recorded it."; unknown source with a value "A close for {date}. The desk did not record where it came from."; percent hover "Measured from the close shown above, for {date}." The C5 line's bold markup is broken (nested asterisks); cosmetic, Marketing fixes it before Design reads it.

**A4 and the PARTIAL hovers: PASS.** Volume "The desk did not see every trade after the bell on {date}, so a volume would leave out some."; price and percent "The desk did not see every trade after the bell on {date}, so it cannot show an after-hours price or change." Both are true of every route to PARTIAL.

**Still open.**
1. **A6 hover:** "The desk was recording and saw no trade after the bell on {date}." was not changed (9b required change 2: COMPLETE is also reached by seeding, so "was recording" is not what it means). Use "The desk's after-hours record for {date} is complete and holds no trade after the bell." The face "No trade seen since the bell" passes. Design's one-line answer on what "no trade seen" is computed from (a trade timestamp at or after the bell) is still owed.
2. **A5 and the prior-session NONE string:** A5 is held, correctly, and the prior-session section still lists "The desk was not recording after hours on {date}." for NONE; that is the same string and is held with it.
3. **Design's confirmations from 9:** A5's payload state, and that the C3 freeze price is the last trade before the bell.


## 9d. Drawer row 5: Design's code answers (cut 4), fourth tenure, 2026-10-06

*Read: Design's account of `engine.ts` 799, 945, 950, 1213, 1617-1619, 1629, `worker/runtime.ts:1688-1689`, `config.ts:142`, `types.ts:561` and `readModel.ts:663`. I read `engine.ts` 799-990 and the freeze code myself in 9; the later lines are Design's reading, which I did not open.*

**(a) The clock.** Strings are clock-free after 9 and may stay so. If Design adds the day's real close time, it comes only from `MarketSnapshot.discovery.rthClose`; where `readModel.ts:663` falls back to the constant '16:00' (session summary missing) the string carries no time. Design's handling is right.

**(b) A5 is unreachable live.** Accepted: the NONE-after-the-bell branch is a defensive "Unknown" with no hover. Marketing's A5 and the prior-session NONE string stay unbuilt until a source can produce the state.

**(c) C3: the string is not true as worded, and a required change follows.** The freeze runs in the flush that first sees the clock past the close (about one second), and `runtime.price` takes any newer print regardless of its time, so the frozen price can be a print up to about a second AFTER the bell. "The last regular-session trade the desk saw, as of the bell" claims a trade at or before the bell. Say what is true: "The last trade the desk saw around the bell on {date}. The daily bar's close can differ." (No "regular-session": a print just after the bell may not be one. The line label "Regular session close" stays; the hover says this value is provisional and can differ, which is what carries it until the daily bar arrives.)

**A6: the test is right, and the hover must claim only what the test establishes.** "No trade seen" is `afterHours.high === null`, where `ahHigh` is set only by a trade, minute bar or seed timestamped at or after the bell. That is the right test (not price, not volume, not equality with the close). Its known edge: the freeze resets `ahHigh`, so a print in the up-to-one-second gap between the bell and the freeze is absent until that minute's bar re-adds it, so for up to about a minute a name that printed only in that second can read as having none. The strings must therefore claim the record and not completeness or the market: **hover "The desk's after-hours figures for {date} include no trade."** (replacing both "was recording and saw no trade" and 9b's "record is complete and holds no trade", since "complete" is also untrue in that window); the face "No trade seen since the bell" is acceptable, and "No after-hours trade recorded" is exact if Marketing prefers. The edge is recorded here as a known limitation and needs no wording on a face.

**(d) Simulator.** Agreed: a `simulator` close prints no close (Unknown, no hover); C5 splits Sheet and unknown source.


## 9e. Drawer row 5 words: PASS (Marketing `9f4f2196`), fourth tenure, 2026-10-06

*Read: the diff of `9f4f2196` against `c9c2fcb4` (local main, not on origin when read) and a grep of the whole file for the replaced strings; the only remaining occurrences are in the notes that log 9c and 9d as history.*

**PASS.** C3 is "The last trade the desk saw around the bell on {date}. The daily bar's close can differ." The A6 face is "No after-hours trade recorded" and its hover "The desk's after-hours figures for {date} include no trade." The clock is gone, the source strings are honest (9c), A4 and the PARTIAL hovers are cause-neutral, and A5 and the prior-session NONE string are held, unworded and unbuilt (unreachable live). No em dash (bytes and entity form, 0). Row 5's words are released to Design to build. One leftover in a note, not a string: the A6 line still explains "seen" beside the new face "recorded"; harmless. A later clock on a face needs the server to send null instead of the '16:00' fallback (9d; not a dependency).


## 9f. The built row 5 strings (Design `563c947e`, tag design/row5-candidate-563c947e), fourth tenure, 2026-10-06: PASS on the strings, one required change, one older footnote found

*Read: `lib/dashboard/sessionsView.ts` whole, `SessionsGroup` and the market section's footnote in `components/TickerDrawer.tsx`, and the engine's after-hours volume and state code (`engine.ts` 1728-1770) at origin. Not read: the tests, the premarket strings (not built), the build's rendering.*

**Strings.** Every string in `SESSIONS_WORDS` is the passed text of 9e (C1/C2, C3 "around the bell", the Sheet and unknown-source closes, C4, A1, the percent hover without "regular-session", the volume hovers, the PARTIAL price and percent hover, the A6 face and hover); there is no clock; a `simulator` close returns Unknown with no hover; coverage NONE after the bell returns a bare Unknown with no claim; A5 has no string. A6 is `afterHours.high === null` with coverage COMPLETE, as ruled. After the bell the volume is null only when coverage is not COMPLETE (`afterHoursVolume`, engine.ts:1746-1750), so "did not see every trade" on a null volume is true whenever it prints.

**Required change: the percent cell says "No close" beside a visible close.** When the bell has passed and the daily bar has not arrived, the close line shows the provisional value (hover "The last trade the desk saw around the bell"), but the after-hours percent is measured only from the daily bar's close (`afterHoursStateOf` takes `todayRthClose.close`, null until the bar), so the percent cell reads "No close" with "The desk has no regular-session close to measure the change from." on the same screen as a close. Each string is literally defensible and the pair reads as a contradiction. Marketing words the pair; a true form: face "No final close", hover "The change is measured from the daily bar's close for {date}, which the desk does not have." (state fact, no "yet", true in both situations the cell arises: no close at all, and a provisional one.)

**Found while reading, not introduced by this build: an older footnote in the same market section** (`TickerDrawer.tsx` 566-579). It says the percent is measured against "the current/prior session's 16:00 ET regular-session close ... source {demand.referenceRthCloseSource}", which prints the raw engine constant (for example `alpaca-daily-bar-rth-close`), asserts "16:00 ET" (false on an early-close day) and "regular-session close" whatever the source (the Sheet or unknown, 9 required change 2), and now duplicates and can contradict the Sessions group above it. Before testers see this drawer, that sentence is removed (the Sessions group carries the facts, with the ruled words) or reworded by Marketing; the rest of the footnote (baseline, volume source, "Level 1 spread only") is outside this read. Placement is Integration's.


## 9g. The percent cell pair, the drawer footnote and the AH Gap title (Marketing `36ffacd2`), fourth tenure, 2026-10-06: PASS, one small condition

*Read: the file at `36ffacd2` (local main, not on origin when read), `lib/dashboard/view.ts:530-548` at origin and the footnote at `TickerDrawer.tsx` as quoted by Marketing and read by me in 9f.*

- **Percent cell: PASS.** Face "No final close", hover "The change is measured from the daily bar's close for {date}, which the desk does not have." (my 9f wording, adopted).
- **Footnote: PASS with one condition.** "Percent change is measured from the {current|prior} session's close ({date}), taken from {the daily bar | the Sheet | a source the desk did not record}. Prior session close {price}." has no clock and no engine constant. **Condition:** the third phrase is for a null or unknown source only. A `simulator` source is recorded, so "did not record" would be false of it; for a simulator source the sentence is omitted, as the Sessions group prints no close for it (9). The remaining raw parts of that footnote (the baseline adjustment word, the ISO calculation time) were not asked and are not read here; if the adjustment word is an engine constant it reaches a reader raw, which is Design's and Marketing's to judge.
- **`view.ts:540` AH Gap title: PASS as "Change from today's close".** "Regular-session close" was false for a Sheet or unknown source, and the new title is true of every source. The sibling titles ("Change from the prior session's close", "Change from the prior session close, including after hours") are unchanged and were not read for more than the word "close".


## 9h. The split percent faces (Marketing `387b2ff0`), fourth tenure, 2026-10-06: PASS

Two faces, one per case: a provisional close shown and the daily bar's close absent reads "No final close" ("The change is measured from the daily bar's close for {date}, which the desk does not have."); no close shown at all reads "No close". The "No close" hover is true in either form, "The desk has no close to measure the change from." or the earlier "...no regular-session close..." (nothing is shown, so no source is claimed); the file at `387b2ff0` still carries the longer one as its primary string with the shorter given as the alternative, so the shorter is the string to build. The split is more exact than one string and passes with 9g's conditions unchanged (footnote sentence omitted for a simulator source).


## 9i. The built row 5 revisions (Design `146168ac`, tag design/row5-candidate-146168ac; the AH Gap title in `eec1f530`), fourth tenure, 2026-10-06: PASS

*Read: the diff of `146168ac` against `563c947e` for `sessionsView.ts` and `TickerDrawer.tsx`, `view.ts` at the commit, and the adjustment values in `lib/market/alpaca/rest.ts:218` (raw, split, dividend, all). Not read: the tests.*

- **Percent cell:** "No final close" with "The change is measured from the daily bar's close for {date}, which the desk does not have." when the close line shows the provisional trade, decided by the same test `closeLine` uses (so the two lines cannot disagree), and "No close" with "The desk has no close to measure the change from." otherwise. As ruled in 9h.
- **Footnote:** "Percent change is measured from the {current|prior} session's close ({date}), taken from {the daily bar | the Sheet | a source the desk did not record}. Prior session close $X." with no clock and no engine constant; the sentence is omitted for a simulator source or no reference close (9g condition met); the adjustment prints only as "split-adjusted" (split) or "unadjusted" (raw), both true of Alpaca's values, and is omitted for any other; the calculation time is ET with its date ("Oct 6, 16:11 ET"); the raw volume source is no longer printed, which is the safe side. "Level 1 spread only. This is not depth." is unchanged and not part of this read.
- **AH Gap title:** "Change from today's close" at `view.ts` in `146168ac`.


## 7h. The built Warning Shot surface (Design `ce4e297d`, tag design/warning-shot-candidate-ce4e297d), fourth tenure, 2026-10-06: PASS

*Read: `lib/dashboard/evidenceRiskView.ts` whole; the section in `components/AutomaticIntelligence.tsx`; `lib/mcp/tools.ts` at the two lines that publish the risk and the dossier; `lib/dashboard/merge.ts` `readableIntelligence` (what reaches the browser); and Research's `e0e96953` (the removed sentence is no longer stored) against the candidate's `evidenceRisk.ts`. Not read: the tests beyond their names and the removal fixture.*

- **Strings** are Marketing v3 exactly: label "Risk in the evidence"; label hover "One sentence from the desk's research: its reading of a risk the evidence shows for this name. It is the desk's reading and not a recommendation."; Unknown "The desk is not showing a risk for this name. That is not a finding that there is no risk."; Not recorded "This name's research was written before the desk recorded this field."; sources label "Sources the desk read". The Sheet's "Warning Shot" prints nowhere.
- **Dating (7g) is built as ruled.** "(as of {time} ET)" is the research version's `generatedAt` (a bare clock on the reader's day, the date with it otherwise); a sentence whose version has no usable `generatedAt` is not shown and reads Unknown. It is never a checkpoint time.
- **Sources (7 item 5):** the label shows only when a cited id resolves against the version's evidence; otherwise there is no sources label and nothing implies the sentence is sourced.
- **The removed sentence (7e condition): met at the source, and the build is consistent with it.** The drawer view reads `evidenceRiskState`, so it prints nothing from a removal (a null and a removal read the same, "Unknown"), and the MCP tool drops the raw `evidenceRisk` from the published dossier. The board payload does carry the whole dossier to the browser (`readableIntelligence` strips only citations and em dashes), which would have been the leak path; Research's `e0e96953` closes it at the source: a removal stores only `{ rule, detail }`, never the sentence, and the candidate's `evidenceRisk.ts` carries that change. What a PRODUCED sentence and a removal's rule and matched word put in the browser payload is the dossier's ordinary content.
- **Not built, so not read:** the frozen board, reports and exports (7g covers them: the same dating and sources conditions apply when a surface that stores or exports the sentence is built). Which commits ship together is Integration's; the candidate already carries Research's final example (`{amount}`) and the no-text removal.


## 10. The one-day run wording (Marketing `3409b2c2`, asked by Integration 29th), fourth tenure, 2026-10-06: not as worded, one required change

*Read: the diff of `3409b2c2` (local main, not on origin when read) and `lib/market/cycle.ts` at origin (`isCycleStart`, `resolveCycle`, the prior-cycles loop, the `CycleArc` fields).*

**What the computed cycle's one-day run is.** A run's start is the most recent session that closed at least 20 percent above the prior session's close on at least 5 times normal volume (`isCycleStart`: `closeChangePct` and `dailyRvol`). Its high is the highest intraday high at or after the start in the settled daily bars (`cycleHigh`, `cycleHighDate`), bounded for a prior run by the next start; the advance is from the prior session's close (`baseClose`) to that high; "sessions ago" counts from the high to the latest settled bar, and the bar set never contains the live session. A "one-day run" is a run whose start date equals its high date.

**"Began and peaked that day" is true of the stored dates and is not safe as a statement about the move.**
1. **"Began" is the desk's start rule, not when the move began.** The session qualifies by its own close-to-close change and volume. The stock can have been rising the session before without qualifying (the base close is then already higher), so "began that day" claims a fact about the market the cycle does not establish.
2. **"Peaked" is the highest high so far in the settled bars, and for a current run it can be stale.** The high is the latest settled session when the run is a day old (phase DAY_ONE, "the latest session"), and the live session is not in the data, so a name that started yesterday and is higher this morning still reads "peaked" yesterday. For a prior run, "peaked" is within its own bounded window and is fine.

**Required change: state the two stored dates, as Marketing's own note says the words do, and keep the market fact out.** "Current run: {date}, start and high on the same day: up {X}% from the base close to the high, high was {N} sessions ago" (and "{date}, start and high on the same day: ..." in Prior runs). The "N sessions ago" tail and its rules ("1 session", "the latest session") stand; the range form for differing dates stands. No wording of the form "began", "peaked", "ran and faded" or "one-day wonder" for this case.
