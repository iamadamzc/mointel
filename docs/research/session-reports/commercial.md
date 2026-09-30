# Session reports — where commentary ends and advice begins

**Commercial's section of the four-seat design Research assembles for him.**
Written 2026-09-27 (checks run 12:15–15:40 UTC), against `7e2a5ef`. Integration's brief:
for a paid product sold to strangers, where does market commentary end and
personalised advice begin; what wording keeps these reports as general commentary;
is a disclaimer needed and where; what changes if the reports are emailed or pushed
instead of shown in the app. **Public sources only — statute, case law, the desk's own
adopted terms and code, and one comparable's published terms, all quoted. No counsel
engaged, nobody contacted.** Returns to Research; not for him piecemeal.

**Two concrete phrases Marketing flagged, ruled below rather than left open:** *"what
to keep an eye on for RH pop"* and the forward-looking frame of a "going into [session]"
report at all. Both are answered in §3 and §4.

---

## 0. THE ANSWER IN ONE PARAGRAPH, BEFORE THE LAW THAT SUPPORTS IT

**The legal risk here is real but narrower than the intuitive fear, and the desk's own
existing rules already sit inside the safe zone rather than at its edge.** US law
distinguishes an "investment adviser" (regulated, must register) from a publisher of
general commentary (exempt) on exactly one axis: **is the content tailored to an
individual reader's portfolio or needs, or is it the same content sold to the general
public?** Discussing specific tickers, even with "advice and comment" about them, does
**not** by itself cross the line — the Supreme Court has said so directly (§1). **This
desk's own architecture already answers the axis that matters**: Gate 2 rules one board,
identical for every subscriber, and these reports inherit that shape by construction —
nobody's report differs because of what they hold or watch. **The genuine tension is not
legal, it is a design tension he set up himself**: he wants the reports to feel like *"an
assistant working for you"* — a personal register — while the law's protection depends
on the content being impersonal. **Those are different axes and both can be satisfied at
once**: voice and tone can be warm and personal; content and selection must stay
identical across every reader. **Say this to him plainly, because it resolves the
apparent contradiction in his own brief rather than leaving it for Research to discover
under deadline.**

---

## 1. THE LAW, QUOTED, NOT CHARACTERISED

**The applicable exclusion — 15 U.S.C. § 80b-2(a)(11)(D)**, Investment Advisers Act of
1940, read at `law.cornell.edu/uscode/text/15/80b-2`. The Act defines "investment
adviser" broadly — *"any person who, for compensation... issues or promulgates analyses
or reports concerning securities"* — **which would, read alone, catch this product
outright.** But the same section excludes:

> *"(D) the publisher of any bona fide newspaper, news magazine or business or
> financial publication of general and regular circulation"*

**The controlling gloss — Lowe v. SEC, 472 U.S. 181 (1985)**, read at
`supreme.justia.com/cases/federal/us/472/181`. A publisher of paid investment
newsletters, covering specific stocks with specific comment, was held **outside** the
Act's reach:

> *"The mere fact that a publication contains advice and comment about specific
> securities does not give it the personalized character that identifies a professional
> investment adviser... because they do not offer individualized advice attuned to any
> specific portfolio or to any client's particular needs. On the contrary, they
> circulate for sale to the public in a free, open market."*

> *"Congress was primarily interested in regulating the business of rendering
> personalized investment advice... Congress... wanted to make clear that it did not
> seek to regulate the press through the licensing of nonpersonalized publishing
> activities."*

**What this settles, precisely:** naming tickers, describing catalysts, and commenting
on what a name is doing does not, by itself, make a publication regulated investment
advice. **What would:** content that varies by reader based on their portfolio or
stated needs, or that is delivered as individualised counsel rather than general
circulation. **A comparable already operating at this exact shape says the identical
thing in its own terms** — Seeking Alpha, `about.seekingalpha.com/terms`, paid and free
tiers both selling specific-security commentary to the general public:

> *"To the extent that any of the content published on the Site may be deemed to be
> investment advice or recommendations in connection with a particular security, such
> information is impersonal and not tailored to the investment needs of any specific
> person."*

**Named plainly: this is federal law and one comparable's published posture, not a
clearance.** State securities law ("Blue Sky" statutes) defines "investment adviser"
independently in each state, and this document did not check fifty statutes — see §6.

---

## 2. WHAT THE DESK ALREADY HAS THAT DOES MOST OF THIS WORK

**Two things already exist and were not built for this question, but answer most of
it:**

- **`lib/desk/assessment.ts`, read verbatim rather than characterised:** *"No buy/sell
  language, ever. These lines describe observed state, not what to do about it."* This
  is a stricter rule than the law requires — it bars not just personalisation but any
  directive verb at all, regardless of audience. **The report layer should inherit this
  rule, not a new one**, because it already sits well inside the legal safe zone and
  gives the checker (Research's design, §2) something concrete to strike against.
- **`docs/legal/terms.md` §7, adopted 2026-09-11, live today:** *"We are not a
  broker-dealer. We are not an investment adviser. We are not your fiduciary. Nothing
  the desk displays is a recommendation, an endorsement, a solicitation, or a
  suggestion to buy or sell any security."* **This already covers the session reports**
  — they are something the desk displays — without any new text, so long as they are
  read inside the app where this page is one click away. §4 covers where that stops
  being true.

---

## 3. WORDING — RULING ON THE TWO PHRASES MARKETING FLAGGED

**1. "What to keep an eye on for RH pop" (his words) / "one to watch."** **Ruled:
strike the directive form, keep the setup it describes.** Legally, per §1, even
"advice and comment" naming this would likely survive — but the desk's own stricter
rule (§2) already bars it on separate grounds, and that is the rule to apply, because
it does the job with no legal argument required at all. The test is **verb tense and
object**: does the sentence describe a state that already exists, or instruct the
reader toward a future action?

| directive (struck) | descriptive (compliant) |
| --- | --- |
| "keep an eye on X for a pop" | "X is at its premarket high, support has held on both pullbacks, and the catalyst has not been priced out" |
| "one to watch" | "X's setup, at this checkpoint: [state]" |
| "watch for a break of Y" | "X is trading within $0.02 of Y, unresolved" |

**The right-hand column is not a softened version of the left — it is a different kind
of sentence.** It commits to nothing about what happens next; it states what the store
already holds, in the same register `changeSummary` (Research's own design.md, §1) uses
today. **A reader can act on either sentence. Only the left one tells them to.**

**2. The forward-looking frame of a "going into [session]" report at all — does the
frame itself need a disclaimer, separate from the wording inside it?** **Ruled: no new
disclaimer for the frame; §1 and §2 already establish that forward-looking commentary
about specific securities, general-circulation and impersonal, is squarely inside the
exclusion.** A report titled "going into Power Hour" is not different in kind from a
newspaper's "what to watch this afternoon" column. **What actually needs attention is
not the frame, it's where the frame travels (§4)** — a title alone, seen in a push
banner with none of the descriptive sentence beneath it, is the one place this desk's
own rule could be silently violated by the medium rather than the words.

---

## 4. THE DISCLAIMER — WHERE IT ALREADY IS, AND WHERE IT STOPS REACHING

**Not a new document. `terms.md` §7 already says everything a disclaimer needs to say,
adopted and live.** The open question is not text, it's **reach**: does a reader
actually encounter it at the moment they read a report that names specific tickers?

- **In the app:** yes, by construction — the terms are one link away on every page,
  and nothing here changes that.
- **Emailed:** **no, not automatically.** An email client renders the message content;
  it does not carry the site's footer or its terms link into the reader's inbox unless
  the email itself does. **Recommendation, sized rather than drafted: the email carries
  a short, one-line restatement, not the full clause** — Seeking Alpha's own emailed
  commentary does exactly this, restating the substance of its site terms in every
  dispatched piece rather than only linking to them once. **This is a line of copy, not
  a new legal document; Web owns the wording, this seat rules that one should exist at
  all, in the artifact itself, every time it leaves the app.**
- **Pushed (a phone notification):** **the sharpest practical risk in this whole
  design, and it has nothing to do with legal wording.** A push banner is the shortest
  format the report will ever appear in — often one line, sometimes truncated by the
  OS before the sentence finishes. **The entire discipline in §3 (state, not action)
  can be defeated by truncation alone**: a compliant sentence ending in "...has not
  been priced out" reads as complete and inert; a banner that cuts it to "X is at its
  premarket high" and stops there reads as an implicit tip, not because anyone wrote it
  that way but because the medium removed the qualifying half. **This is Design's and
  Web's to solve (how much of a report's opening sentence is safe to show standalone),
  named here because it is a disclaimer problem in substance even though it looks like
  a layout problem.**

---

## 5. WHAT CHANGES IF THE REPORTS ARE EMAILED OR PUSHED — THE REST OF IT

- **CAN-SPAM, briefly, because it is a real federal statute and a five-minute check.**
  A periodic report to a paying subscriber, primarily delivering subscribed content
  rather than advertising a product, sits closer to a transactional/relationship
  message than a commercial solicitation under the Act's own test — but this document
  did not verify that classification against the statute's full text, and it is a
  compliance question independent of the investment-adviser question this section
  otherwise answers. **Named as unresolved rather than assumed clear.**
- **Personalisation creeps in through delivery before it creeps in through content.**
  The moment a report is filtered per subscriber — "only the tickers in your
  portfolio," a natural instinct for an email or push product — it stops being
  general-circulation in the sense §1 requires, regardless of how careful the wording
  is. **Gate 2's "same board" ruling already forecloses this for the live board; this
  document extends the same constraint to the reports by name, because email and push
  are exactly the delivery shapes most likely to reintroduce it as a feature request
  nobody flags as a legal question.**

---

## 6. ADDED 2026-09-27, ON RESEARCH'S OWN FLAG — A DIRECTIONAL SIGNAL RENDERED NEUTRALLY CAN STILL IMPLY THE UNTESTED TRADE

**CORRECTED 2026-09-27 by Research, and the correction is the kind that propagates
rather than the kind that matters: the citations below originally read `cycle.ts:456`
and `:471` with no path, and there are two files named `cycle.ts` that do opposite
jobs.** `lib/market/cycle.ts` computes the *phase* (`BACKSIDE_RETRACEMENT = 0.5` at
line 81; `phase = 'BACKSIDE'` set at line 445) — lines 456 and 471 in **that** file are
unrelated code, not a definition. **The English definitions this section relies on
live in `lib/dashboard/cycle.ts`**, verified there directly: line 456,
`BACKSIDE: 'Most of the advance has been given back.'`; line 471, `'OFF HIGH':
'Price is more than one spread below the high this move is measured against.'`
**Every citation below now carries its full path, because a bare filename shared by
two files is worse than no citation — the next reader who opens the wrong one has to
decide whether the ruling or the receipt was wrong, and it was neither.**

**Research's point itself, and it is a real one, distinct from §3.** §3 struck
directive *verbs* ("keep an eye on," "watch"). This is different: **a purely
descriptive sentence can still carry an implied direction if the thing it describes
was defined for a decision this product does not make.**
`lib/coaching/fills/roundtrips.ts:13` states plainly, verified rather than taken from
the relay: *"is long-only."* The board's own cycle taxonomy
(`lib/dashboard/cycle.ts:48-53`) renders `BACKSIDE` — defined at
`lib/dashboard/cycle.ts:456` as *"Most of the advance has been given back"* — and
`OFF HIGH` — defined at `lib/dashboard/cycle.ts:471` as *"Price is more than one
spread below the high this move is measured against."* **Both definitions are
already direction-neutral as written: they describe what price did, not what to do
about it, and neither says "bearish," "short," or "sell."** The risk Research names
is not in the code's own definitions — it is in what a stranger, without this
product's long-only frame, could read into a bare label like `BACKSIDE` appearing in
a personal-feeling narrative report: exhaustion of an upward move can be misread as a
signal to reverse into, not merely a signal this desk would not enter fresh.

**Ruling, sharpened by Research past what this seat first wrote: the report layer
should render through the EXISTING RENDERER, not compose a fresh phrasing of the
definition.** `lib/dashboard/cycle.ts:99`, `cycleDetail()`, already produces exactly
this from live data: *`` `${pct(current.retracementPct * 100)} of the move given
back` ``*. **"Write the definition" invites a second hand-composed phrasing that can
drift from the first one; pointing at the renderer keeps one source of truth** — the
same discipline `lib/dashboard/language.ts` already applies to labels generally, per
Research. This seat's reasoning is unchanged; the instruction is cheaper to obey.
**Marketing's own never-use list independently reaches the same place**
(`docs/research/session-reports/marketing.md:119`), and its specimen already
satisfies this in substance — printing *"60% off its high"* beside the label,
framed as exit-and-avoid rather than a setup.

**And the existing disclaimer already reaches this, textually, without new
drafting.** `terms.md` §7, quoted already in §2: *"a suggestion to buy **or sell**
any security"* — the clause is already bidirectional. **What it does not do is
prevent a stranger from misreading a neutral sentence as a short thesis in the
moment of reading it; a disclaimer clears the desk's liability, it does not clear
the sentence's ambiguity.** So this is a wording fix (above), not a text-of-terms
fix — nothing in §4's recommendation changes.

**One further option, sized rather than drafted, because it is cheap and this
product has never said it out loud:** a single standing sentence, appearing once in
the report format's own explanation (not repeated per-sentence) — something to the
effect that *the desk evaluates entries for the long side only, and a name marked
`BACKSIDE` or `OFF HIGH` is a fact about that name's move, not a short recommendation
this desk has ever measured.* **This is Web's or Marketing's copy to write, not
this seat's — named here because Research asked for the judgement call on whether
"BACKSIDE" sits inside or outside the existing rule, and the honest answer is: the
label alone risks sitting outside it, the definition sits inside it, and one
sentence stated once closes the gap between them for a reader encountering it cold.**

## 7. WHETHER THIS NEEDS A LAWYER — HIS CALL, NAMED PLAINLY

**Federal law and one comparable's practice both support the shape this design already
has.** That is not the same as clearance, and this seat says so directly rather than
letting a confident-sounding memo stand in for one:

- **State-level "investment adviser" definitions were not checked.** Most states track
  the federal publisher's exclusion closely, but this document verified the federal
  statute and one Supreme Court case, not fifty state statutes, and does not claim to.
- **This is the same posture the desk already took on the trademark search** (naming
  document, waived 2026-09-09, his word: *"2, waive."*) — a real flag, named rather
  than resolved, with the decision to commission review or accept the risk left to him.
  **This seat's read: the wording discipline in §3 and the disclaimer reach in §4 are
  worth building regardless of whether counsel is ever engaged, because they cost
  nothing and they are also simply the honest way to write the thing** — but a lawyer's
  review before this reaches paying strangers at scale is a real option, not a
  formality, and it is priced the same way the rest of this desk prices legal
  uncertainty: named, not invented around.

---

## 8. ADDENDUM 2026-09-30 — HIS RULING ON THE #551 SAMPLE ADDS RICHER NARRATIVE; THE BOUNDARY EXTENDED BEFORE THE WRITER IS BUILT

*His ruling, first-hand, `integration.md` `b563207`, independently verified at his own
turn (2026-09-30 ~04:06–04:07Z, three separate transcripts): the reports gain an
opening narrative, catalyst commentary beyond classification ("what we think about the
catalyst"), richer float/structure narrative, company facts, and a literal price path
("3.5 --> 5.00 --> 4.25") in place of repeated prose. Integration routed the advice
boundary here before Research builds the next sample, so the rule exists from the
first draft rather than being found by a strike after the fact.*

**§3's test still governs, unchanged, and covers every new field the same way it
covers the ticker readout: does the sentence describe a state that already exists, or
commit to what happens next?** Applied to what's new:

1. **Catalyst commentary ("what we think about the catalyst") — describe the
   catalyst's own characteristics, never its expected effect on the stock.** "What
   the filing says, how quantified it is, whether it's the kind of fact this desk's
   own taxonomy treats as material" is descriptive of the catalyst. "Why this catalyst
   should move the stock further" or "whether the market has finished pricing it in"
   is a prediction about future price behaviour wearing catalyst language — struck by
   the same test as "keep an eye on X for a pop," just with more words in front of it.
2. **Float/structure narrative — the standing default (Integration, order-and-process,
   2026-09-17, recorded in `docs/threads/commercial.md`) applies with full force to
   prose, not just to a labelled cell: narrate the desk's verdict on the float
   (*refused*, *bounded*, *unverifiable*), never the float number.** "Richer" cannot
   mean "the number, now in a sentence" — the reason for the rule (the desk's own
   measurement that a shown float can be wrong) doesn't change because the field
   grows from a badge to a paragraph.
3. **Company facts (sector, location, what the company makes) — no new rule needed.**
   Public-company description carries no more risk in prose than in a table cell;
   §1's "general circulation, not tailored to a reader" test is unaffected by adding
   facts of this kind.
4. **The literal price path ("3.5 --> 5.00 --> 4.25") is not an advice question —
   it is the licence question §2g of the naming document already ruled, now made
   concrete rather than hypothetical, and it needs naming here so it is recorded
   rather than discovered later.** A report that narrates prices in writing, delivered
   to a paying subscriber, is the fee-liable single-security class — "a harder
   evidentiary object than a live board, because it persists and forwards" (§2g,
   verbatim). **Not prohibited — already ruled his call under the accepted-exposure
   posture** (gates map, top), and he asked for this shape himself, which reads as
   exercising that call rather than a fresh question. **Named so nobody on this desk
   is surprised by it**, not to relitigate it: the field list a writer produces is
   also the licence posture, same as the day §2g was written, and a literal price
   sequence is squarely inside the class that ruling already priced.

**Nothing above blocks Research's build.** It is the rule the writer should carry
from the draft, per Integration's ask, so the review against this document (§3–§4)
before it reaches him is a check against a known standard, not a first encounter with
one.

---

## 9. RULED 2026-09-30 — SHARES OUTSTANDING IS NOT THE BANNED NUMBER

*Research's question, ahead of the writer build: rule 2 above bars the float
NUMBER in prose. Does it also bar shares outstanding — `structure.sharesOutstanding`
+ `sharesOutstandingDate`, EDGAR-reported, present on 36 of 48 report rows checked?
Research's own lean was option (a), printable with its as-of date and never called
float; this seat's ruling is (a), with one addition below.*

**Ruled: printable, dated, never labelled float — because it is a different
quantity from a different source, not the same number under a gentler rule.** The
float-number ban (§2f item 3, naming document `2026-09-10`) exists for a specific,
narrow reason, re-read to be sure before answering: it struck a defect **rate** about
a **vendor's** float, because the desk's own measurement is that a vendor-sourced
float can be wrong — its conditions are *"no vendor named or inferable; no rate,
ratio or count."* The 2026-09-17 standing default (*"narrate the verdict, never the
number"*) extends that same reasoning to the board's own displayed float: the
number comes from the Sheet, relayed from a vendor, and the desk's own check is that
it contradicts the filed share count on roughly one name in six — so publishing it
as fact would mean knowingly printing a number the desk itself distrusts.

**Shares outstanding, as Research describes it, is neither of those things.** It is
not a vendor's computed float — it is the company's own SEC-filed count, dated. It
is not a number the desk has measured to be unreliable; the desk's own float module
uses exactly this figure as the reference it checks a vendor float *against* (naming
doc §2f item 3: *"the desk checks the float it is shown against the filed share
count and refuses the one that cannot be right"*). Banning shares outstanding by the
same rule that bans the float number would strike the very yardstick the desk uses
to justify not trusting the other one — a different failure than the one either rule
was written to prevent.

**The one real risk is Research's, not this seat's, and Research named it
correctly: a reader may take a share count for float, and a stale one can mislead.**
Both are solved by form, not by suppression:

1. **Always dated, no exception.** `sharesOutstandingDate` prints with the number,
   every time — a share count with no as-of date is where the staleness risk
   actually lives, not in the number itself.
2. **Never called float, and never adjacent to a float verdict without the
   distinction stated.** "12.3M shares outstanding (SEC, as of 08-11)" is a company
   fact in the same register as §8 item 3. If the same paragraph also carries the
   desk's float verdict, the two must be visibly different things on the page — a
   labelled share count next to a labelled verdict, not one flowing into the other
   as if they answer the same question. The checker Research proposes (strike any
   line calling it float) is the right instrument; add to it: strike any line where
   the two appear together with no distinguishing label.

**v5 may print the share count under those two conditions.**

---

## 10. REVIEWED 2026-09-30 — THE SANG EXAMPLE BLOCK, `marketing.md` `06dfd1e` — PASS, ONE NON-BLOCKING FLAG

*Integration's request, before it reaches him: four specific clauses in Marketing's
hand-written v4 example (report #551, Sangoma/SANG, the 22:00 recap shape). Read
the block itself, not the summary, against §3, §8 and §9.*

1. **"fresh and timely enough to explain today's move" (`plausiblyExplainsMove`) —
   PASS, descriptive, not predictive.** This is the 22:00 recap — the after-hours
   arc it sits beside ($3.59 → $6.01 → $5.10) has already completed by the time a
   reader sees the sentence. "Explains today's move" grades the fit between a
   catalyst's timing and a move that already happened, the same backward-looking
   relationship §3's table already permits ("X's setup, at this checkpoint: [state]").
   It does not say what the stock does next.

   **Non-blocking flag, for the template rather than this instance: this exact
   phrasing does not survive unchanged into the 07:00 premarket report.** At 07:00
   "today's move" has not happened yet — the identical sentence would either read as
   nonsense (no move to explain) or, worse, as a forecast that a move is coming,
   which is the class §3 exists to keep out. Whoever adapts this block for the
   premarket shape needs a different tense for this clause, not just a different
   timestamp. Named now so it is caught at that build, not discovered in a premarket
   report later.
2. **"does not read it as a positive catalyst" (`catalystStatus` CONFLICTING,
   `whyTradersMayCare`) — PASS.** This grades the catalyst's own valence (is the
   news good or bad), the same kind of characteristic as "moderate / mixed /
   secondary" two clauses earlier, which is already cleared. It says nothing about
   what the stock will do with that news — no different from a wire service
   captioning an earnings miss as disappointing.
3. **The dated shares-outstanding figure — PASS, and it exceeds §9's bar rather
   than meeting it.** *"33,338,932 shares outstanding as of June 30, 2026 — that is
   the outstanding count, not a float"* — dated, and the distinguishing label §9
   required sits in the same sentence rather than merely nearby.
4. **"registered-resale capacity ... capacity, not proof of selling" — PASS.**
   Describes a structural fact (an effective shelf registration exists) and
   explicitly declines to claim the predictive step (that shares have been or will
   be sold under it). This is the discipline §8 asks for, applied correctly to a
   fact type neither §8 nor §9 named directly.

**Nothing here needs a wording change. Reply is PASS on all four**, with the one
flag above carried forward for whoever builds the 07:00 shape.

---

## 11. REVIEWED 2026-09-30 — THE V5 SAMPLE (voice-run-v5b, `v5-PREMARKET-as-read.txt`) — PASS, ELEVEN NAMES, TWO NON-BLOCKING NOTES

*Research's request, before he sees a sample tonight: all eleven entries checked
against §3, §8, §9 and §10, not spot-checked. Three changes landed after this
sample (`2e8450f`, not visible here — country in the company line, "a positive (or
negative) analyst rating" wording, `SECONDARY_STALE` alignment) and are not part of
this review; flagged for the sample that carries them.*

1. **Catalyst commentary — PASS, all eleven.** Every catalyst sentence describes
   what the filing says and how the desk reads its fit, never what the stock will
   do. Two forms worth naming because they generalise: *"the desk reads the event
   as timely but conflicting with the positive reaction"* (SANG) grades fit against
   a reaction that has already happened (the price path beside it already shows the
   completed move) — the same backward-looking shape §10 cleared, not the
   forward-tense risk flagged there for the 07:00 build. *"The desk does not read
   [X] as explaining the present activity"* (the seven no-catalyst names) is a
   negation, the safest possible form: it states what the desk does NOT conclude,
   which cannot be a prediction of anything.
2. **Catalyst valence — PASS.** *"The desk grades that as a legitimate positive
   development milestone"* (SER) classifies the news's own character, same class as
   the SANG example's "does not read it as a positive catalyst," already cleared —
   grading what kind of news it is, not what the stock does with it.
3. **Float — PASS, uniformly.** *"The desk has no float it can independently
   verify"* appears in all eleven entries, verbatim or near it, and never once
   attaches a number to it. "Dirty float" (SER) is the structure classification
   label, not a number — allowed under the standing default the same way a board
   cell's verdict is.
4. **Shares outstanding — PASS where present, correctly absent where not.** Every
   instance that prints a share count carries both conditions from §9 in the same
   clause: dated, and explicitly *"(the outstanding count, not a float)"* — KNRX,
   YMT, FFAI, TRSG and BNKK's opening sentence(!) omit the figure entirely rather
   than print it undated or unlabelled, consistent with the field being genuinely
   absent for those names (dossier coverage, not a writer choice).
5. **Supply/structure — PASS, and a note on form rather than substance.** No
   sentence claims a sale has happened or will happen; every registration or shelf
   fact carries a status qualifier (*"possibly active," "unknown," "not yet
   active"*) instead of asserting activity. **This is terser than the hand-written
   SANG example's explicit "capacity, not proof of selling"** — the writer lists
   the structural facts with status qualifiers and stops, rather than adding the
   disclaiming clause. **Not a defect: a sentence that never claims selling at all
   satisfies the rule at least as well as one that claims it and then disclaims
   it.** Named so it is a deliberate reading, not an oversight on re-check.
6. **The literal price path — present throughout, as already ruled (§8 item 4),
   not a fresh question.** No action needed; recorded here only so the review
   doesn't read as having missed it.

**Two non-blocking notes, not compliance findings, for whoever owns copy quality:**
a punctuation artefact where a company name ending in a legal suffix collides with
the sentence's own period (*"KNOREX LTD.."*, *"BeyondSpring Inc.."*, *"Yimutian
Inc.."*) — cosmetic, not this seat's to rule, flagged so it doesn't ship unnoticed.

**PASS, no lines to change. Reports may ship tonight on this review.**

---

## 12. RULED 2026-09-30 — AN ENTRY GATE, NOT JUST A LINK, HIS INSTRUCTION DIRECT

**His words, direct to this seat, not relayed:** *"regarding disclaimer, let's add a
disclaimer entry. attached is warrior tradings. this is required before you can
enter the platform."* Attached: Warrior Trading's own disclaimer modal — a dark
full-screen dialog, title "Disclaimer," three short paragraphs, a link to their full
disclaimer, and two buttons, **ACCEPT** and **DECLINE**, required before the
platform is reached.

**This changes §4's answer for "in the app," not just adds a new document.** §4 said
the disclaimer reaches an app reader *"by construction — the terms are one link
away on every page."* A link one click away and a gate that must be accepted before
entry are different things: one is available, the other is unavoidable. **His
instruction is to move from the first to the second — for the whole platform, not
only the session reports this document was written about.** Recorded here because
this document is where the desk's disclaimer reach already lives; the gate is
broader than reports and Web/Design build it once, platform-wide.

**What this does NOT require: new legal drafting.** `terms.md` §7 is already adopted
and already says everything the gate needs to say — *"We are not a broker-dealer. We
are not an investment adviser. We are not your fiduciary. Nothing the desk displays
is a recommendation, an endorsement, a solicitation, or a suggestion to buy or sell
any security."* The gate is a **presentation** change (how the existing text reaches
a reader), which is explicitly the kind of change `terms.md`'s own banner rule
(quoted in its header comment) does not touch `adopted` for — only a redraft of the
words does that.

**Where our posture differs from Warrior's model, named so the short form isn't
copied wholesale:**

- **Warrior's second paragraph is about one named person's results** (*"Ross's
  results are NOT typical... do not attempt to mirror trade or blindly follow Ross or
  anyone else"*). **This desk has no equivalent clause to write, not a weaker one** —
  §2f's standing rule already prohibits any outcome or performance claim in any
  form (`docs/threads/commercial.md`, *"Outcome claims are prohibited in any form,
  loss statements included"*), so there is no "past results" claim anywhere on this
  product for a disclaimer to qualify. Including a results disclaimer here would
  imply a results claim exists to be disclaimed, which is the opposite of the
  desk's actual posture.
- **"Trade in a simulator before trading with real money"** is Warrior's own
  practice recommendation, not a legal requirement either of us is under. Optional
  for this desk to include in its own voice — Marketing's call, not this seat's to
  require.
- **The referral clause maps directly and should be kept in substance:** *"A
  referral to a stock or commodity is not an indication to buy or sell"* is the same
  thing terms.md §7 already says, just phrased for a first-entry reader rather than
  a terms page.

**Short-form text for the gate, drafted from the already-adopted §7 language, not
new drafting — for Web/Design to build and Marketing to voice-check:**

> **Disclaimer**
>
> What TMI shows is for educational and informational purposes only and is not
> tax, legal, or investment advice. Naming a stock or its price moving is not a
> suggestion to buy or sell it.
>
> TMI is not a broker-dealer, an investment adviser, or your fiduciary. Nothing it
> displays is a recommendation, an endorsement, or a solicitation.
>
> This does not represent our full Terms of Service. [Read the full terms.]

**Build note, not a ruling:** whether ACCEPT is required once (stored, like a
cookie or an account flag) or every session is Design's and Web's implementation
choice — Warrior's own screenshot doesn't resolve it either way, and nothing in
this desk's legal position turns on the choice. What does matter, and is this
seat's to state: **DECLINE must actually withhold the platform** for the gate to
be the "unavoidable" thing this ruling calls for — a DECLINE that still lets
someone through by another route (back button, direct link) is the old "one click
away" shape wearing a gate's costume, not the gate his instruction asked for.
