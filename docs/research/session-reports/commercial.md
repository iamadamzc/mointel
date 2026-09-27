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

**Research's point, and it is a real one, distinct from §3.** §3 struck directive
*verbs* ("keep an eye on," "watch"). This is different: **a purely descriptive
sentence can still carry an implied direction if the thing it describes was defined
for a decision this product does not make.** `lib/coaching/fills/roundtrips.ts:13`
states plainly, verified rather than taken from the relay: *"is long-only."* The
board's own cycle taxonomy (`lib/dashboard/cycle.ts:48-53`) renders `BACKSIDE` —
defined at line 456 as *"Most of the advance has been given back"* — and `OFF HIGH`
— defined at line 471 as *"Price is more than one spread below the high this move is
measured against."* **Both definitions are already direction-neutral as written: they
describe what price did, not what to do about it, and neither says "bearish,"
"short," or "sell."** The risk Research names is not in the code's own definitions —
it is in what a stranger, without this product's long-only frame, could read into
a bare label like `BACKSIDE` appearing in a personal-feeling narrative report:
exhaustion of an upward move can be misread as a signal to reverse into, not merely
a signal this desk would not enter fresh.

**Ruling: the report layer should always render the DEFINITION, never the bare
label, for exactly this reason — and this is not a new rule, it is §3's rule applied
to labels the same way it applies to verbs.** *"BACKSIDE"* alone, in a sentence
built to feel like an assistant talking to you, reads as a signal name; *"most of
X's advance has been given back since its high"* reads as what it is — a fact about
price, with no direction implied past the fact itself. **The store's own language
already supports this**: `cycle.ts`'s definitions are written this way already; the
report's job is to keep using them rather than compress back down to the enum.

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
