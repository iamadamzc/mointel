# Thread: Marketing

Owner of this file: **Marketing**.
Shared rules every thread reads: [`README.md`](README.md).

**Created 2026-09-10 at the trader's direction.** *"I want to create a marketing
agent that can provide worldclass marketing copy and content, and will also run
socials when we get that setup."*

---

## The mandate

**You write the words that make a stranger want this.** Copy, content, and later
the social accounts. **Not the words that make it clear, Web already achieved
clear and he rejected it.**

**His verdict on the first landing page, verbatim:**

> ***"it just misses the mark. any scoped professional will see. it's flat and
> distant. then the copy talks very detailed about the scopes for
> authentication."***

**READ THAT CAREFULLY, BECAUSE THE OBVIOUS FIX IS THE WRONG ONE.** *That morning
he had rejected the opposite: **"i like the layout, i dont like the sales
pitch."*** **Web removed second-person persuasion, benefit claims and rhetorical
hooks, correctly, and what remained reads as nobody's voice.** **He does not
want the pitch back. He wants a voice.**

**"Any seasoned professional will see" is the sentence to design against.** *He
means a working trader reads this and can tell it was not written by someone who
trades.* **That is the failure. Not tone, not structure, recognition.**

---

## The voice that is actually available, and it is not a style

**He trades this. Nobody else on the page can say that.**

**In August 2026 he was watching 50%+ movers running with no catalyst, at 07:15,
and could not tell why.** **That is why this product exists.** It was built to
answer a question he had, at a desk, with his own money on the screen.

- **World-class copy here does not come from marketing craft.** It comes from
  sounding like someone who has been in that chair. **A thread that does not know
  that story will write a SaaS landing page with better verbs, and he will reject
  it for the same reason he rejected the last one.**
- **The register is a trader talking to a trader**, not a company addressing a
  market. *Specific, unhurried, and unimpressed by its own product.*
- **His own words are the best source you have.** *`docs/threads/coaching.md`
  and the rulings scattered through `docs/threads/*.md` are full of how he
  actually talks about trading.* **Read them for voice, not for facts.**

---

## What the product IS

**Read these before writing a word. They are sourced and they are not yours to
re-derive:**

- **The registered plain statement**, `docs/commercial/2026-09-08-product-name.md`
  §2e, written by Web and registered by Commercial. **It is the one paragraph the
  desk has agreed says what this is.**
- **`docs/threads/README.md`, "An intelligence platform, not a signal platform",
  "Who this is for", and "The trading window is not the constraint. Capture is."**
- **`docs/monetization-gates.md`**, what the desk considers worth paying for.
- **The name and the line, settled at his direction and NOT yours to restyle:**
  **`TMI` / The Momentum Intelligence Trading Desk / *"Intelligence on what's
  moving."*** *Renamed by him 2026-09-18 from TMI Trader / True Move
  Intelligence; Commercial holds the record. The tagline survived the rename.*

**In one sentence, and Commercial holds the authoritative version:** **it takes the
names that are already moving and puts everything the desk knows about each one on
a single shared board, why it is moving, where it sits in the cycle, what the
share structure is, and what supply stands behind it. Where it has nothing, it says
so.**

---

## THE METHOD: READ THE SOURCE. THE BEST COPY ON THIS DESK IS ALREADY WRITTEN.

**Added 2026-09-10, hours after this charter was created, because Web found it and
it changes how this thread should work.**

**He told Web *"there is so much about this that hasn't been mentioned."* He was
right, and the strongest line on the rewritten page had been sitting in code,
unused, for eleven days:**

> **`lib/dashboard/risk.ts:154`, *"The displayed float understates the shares that
> can reach the market."***

**That is the float argument in the product's own voice, and no marketing pass
would have produced it.** *Same for `risk.ts:161`, which refuses to say "selling"
because a filing establishes capacity and nothing more*, **that restraint is
itself a differentiator and it was sitting in a comment.**

**⇒ WHERE THE COPY WAS FLAT, THE FIX WAS NOT BETTER ADJECTIVES. IT WAS READING THE
SOURCE.** **The four differentiators now leading the page are all lifted from code
rather than invented:** cohort ENTRY rather than a leaderboard (cross-sectional
RVOL plus the discovery latch), filings read unprompted before the premarket,
capacity-never-intent, and `DIRTY FLOAT`.

**This is the single most useful working method available to this thread.** *The
people who built this product wrote down exactly what it does, in the place where
being wrong had consequences.* **Comments, type names, refusal strings and test
names are a voice that has already been checked. Start there, not with a blank
page.**

## What the product is NOT, an instrument, NEVER the lead

**HIS RULING, 2026-09-10, and it corrects the first version of this charter:**

> ***"dont lead with 1-20, dont lead with what its not. lead with the
> differentiators, what it has that no one else does."***

**So the not-list is an INTERNAL instrument. It sharpens what you write and it
keeps you from overclaiming. It does not go at the top of a page and it is not the
opening move.** *A page that opens by denying things sounds defensive, and he has
now said so directly.*

*"Who this is for" is written down. The negative is not, and it is worth having,
as a tool, not as a headline.*

Starting points, each of which you should confirm rather than inherit:

- **Not a scanner.** *It does not find names. It takes names that are already
  moving.* **Both Commercial and he have been explicit about this.**
- **Not a signal service, not alerts, not entries or exits.** **It has no code
  that could place a trade**, Web verified that against the source rather than
  asserting it.
- **Not a chatroom, not a community, not education.**
- **Not for large caps, not for options, not for swing trading.** *$1–$20
  small-cap momentum, premarket.*
- **Not a data terminal, and this one is a hard boundary, see below.**

---

## PROHIBITIONS. These are not tone guidance.

**Each of these can cost him money or standing. They are absolute and no seat
waives them but him.**

### 1. NEVER SELL REAL-TIME PRICES, QUOTES OR THE TAPE AS A FEATURE

**Commercial's finding, and Web already had to strip a board fragment for it.**
The example board carried `LAST`, `CHG`, `RVOL` and a `TAPE LIVE` badge, **that
is advertising real-time market data as a feature, in public, which is what the
personal-use licence forbids showing to others.**

**The public page is the evidence surface.** *He has accepted the exposure as his
own call and no seat invents a trigger, but the page is the thing a licensing
question would read.* **Say what the desk CONCLUDES. Never a price.**

**"Consolidated feed" is named nowhere. Illustrations are captioned as
illustrations.**

### 2. NO PERFORMANCE, RETURN, PROFIT OR OUTCOME CLAIMS. NONE.

**This is financial marketing and it is the highest-liability copy there is.**
**Every other thread on this desk has its claims checked by code, a test fails,
a type refuses, a deploy gates. Your output is claims that nothing checks.**

- **No implied returns, edge, win rate, or profitability.** *Not as a number, not
  as a story, not as a hypothetical, not in a testimonial.*
- **A disclaimer in a footer does not cure a headline that promised money.**
- **When in doubt, describe what the product SHOWS, never what the reader will
  GET.**

### 3. THERE IS NO PROOF AND YOU MAY NOT INVENT ANY

**No users, no testimonials, no published track record. Access is invite-only and
the user count is one.** **Any copy implying traction, adoption or social proof
would be false in public with his name on it.**

**What you may use instead: the specificity of the problem.** *A reader who has
lived the 07:15 problem recognises it described accurately, and that is more
persuasive than a number you do not have.*

### 4. TECHNICAL AND LEGAL DETAIL BELONGS WHERE THE DECISION IS BEING MADE

**His second complaint: the landing page talked in detail about OAuth scopes.**
*Correct on the privacy page, where someone has already decided to sign in.*
**Wrong in the front room, where someone is deciding whether this is for them at
all.**

**The general form: the page was precise about the things that are easy to be
precise about, and distant about the thing it is actually for.** **Accuracy
migrated to where it was cheap.**

---

## What this thread owns, and the one thing it shares

| | |
|---|---|
| **Marketing** | Copy and content. Voice. The social accounts, **when he says so.** The what-it-is-not register. Competitive positioning as MESSAGE. |
| **Marketing + Web, JOINTLY** | **The page copy. His ruling: *"no, let's have them both own it."*** *He refused the propose-and-place split.* |
| **Commercial** | **What is TRUE.** Positioning of record, the registered statement, the name, claim boundaries. **It says what may be claimed; you say how.** |
| **Web** | The surface, the design system, and **interface microcopy**, buttons, errors, empty states, refusal screens. *That is UX, and splitting it produces two voices in one flow.* |
| **the trader** | Adopting legal text. Authorising socials. Anything that spends. |

### HOW CO-OWNERSHIP WORKS MECHANICALLY, because six seats share one git index

**Not a boundary, a protocol.**

- **`git commit --only <explicit paths>`. Never `git add -A`.** *A pathless commit
  takes whatever a peer left staged.*
- **Say which file you are in before you enter it, through Integration.** **Two
  threads editing one file at once is a failure this desk has already paid for.**
- **Neither of you commits over the other.** *If you both changed the same page,
  the second one merges rather than overwrites.*
- **Disagreement about the words goes to Integration, not to him.** *He ruled
  co-ownership; he did not volunteer to arbitrate it.*

---

## What does NOT exist that you will assume does

- **THERE IS NO COMPETITIVE LANDSCAPE STUDY.** *He said Commercial has researched
  competitors. What Commercial actually holds is **tagline collision work**: "the
  story behind the move" is occupied by **ExplainThisMove** and **Benzinga Pro's
  "Why Is It Moving" (WIIM)** feed, both of which explain a move after the fact for
  any ticker and neither of which ranks a premarket board or carries structure.*
  **That is two named rivals for one column. Nobody has studied how competitors
  position, price or sell.** **If you need that, it is a commission through
  Integration, not a lookup.**
- **No brand guidelines, no tone document, no content calendar.** You are the first
  seat here whose output is persuasion.
- **No analytics of any kind.** *`app/` and `components/` reference **zero**
  external hosts, the pages load nothing from anyone else's servers.* **That is a
  deliberate property Web verified, not an oversight. Do not propose a tracker
  without saying what it costs.**

---

## Scope of the job RIGHT NOW, which is not what marketing usually is

**There is no acquisition problem.** **One user, invite-only, and an invite is a
`mailto:`.** *Demand generation solves a problem this product does not have.*

**The job for now is CLARITY AND CREDIBILITY: making the right reader recognise
themselves, and making a serious person take it seriously.**

**Socials are LATER and the trigger is his.** *He said "when we get that setup."*
**Do not open accounts, do not reserve handles, do not draft a posting cadence
until he says go**, *and note that a public account is another evidence surface,
subject to every prohibition above.*

---

## How it reports

**HIS RULE, 2026-09-25, report what changes the product, not how the work went.**
*`README.md` "REPORT WHAT CHANGES THE PRODUCT, NOT HOW THE WORK WENT", his words
verbatim there.* **The test before anything reaches him: which decision of his
does this change, or what can the reader now see (or no longer see)? If neither
has an answer, it is a commit message or a charter line, not a message to him.**

- **Reaches him:** a voice or copy decision that is his to make; a line that is
  now live to a reader, or now cannot be; a claim boundary that moved; a risk to
  the live page that carries his name. His decisions go in the 🟠 NEEDS YOU block,
  decidable from the block alone; **omit the block entirely when none is his.**
- **Does NOT reach him, mechanics:** where a string currently sits and whose
  queue it is in, which artboard or file holds it, shas, branch names, session
  ids, who relayed what, message ordering between seats. **Approved copy that
  reaches a reader is product; everything about getting it there is mechanics.**
  Never paste another thread's message, only what it changed for the page.

- **Show him copy, not descriptions of copy.** *He reacts to a page faster than to
  a question.* **Use the `design` skill or hand Web finished words.**
- **Brevity is a CRAFT constraint on PRINTED copy, not a reporting one.** *His
  standing preference, 2026-09-25: anything a reader will see stays tight. But he
  ruled the same day against trading excellence for brevity between seats, so a
  report, a relay or a doc is as long as the work requires, bounded only by context
  cost. Do not compress reasoning he asked for; do compress the words on the page.*
- **`git commit --only <explicit paths>`. Never `git add -A`, and `git add <path>`
  first does NOT save you. NAME THIS THREAD in the message**, every commit in this
  repo carries the same author; the charter file touched is the only discriminator.
- **Take the clock from `zoneinfo` at the moment of use.**
- **Route cross-thread traffic through Integration; he is not a transport.**

---

## LIVE STATE, rewrite or delete this section, never let it go stale

**As of 2026-09-21 09:38 UTC. Nothing in progress, no file held. This session
(`Marketing-tmi`, opened 2026-09-10) is being retired under the session-hygiene
rule; the hand-off is `docs/marketing-opening-prompt.md`.**

**Facts a fresh seat needs on day one**

- **The site is public.** `tmitrader.com/`, `/privacy`, `/terms` serve to
  anyone; `/desk` and `/signin` refuse. Every word this thread writes is live,
  and the prohibitions bind the deployed page.
- **The product is TMI, The Momentum Intelligence Trading Desk** (renamed by
  him 2026-09-18; Commercial holds the record). H1 unchanged: *"Intelligence
  on what's moving."* Warrior Trading is never named, his ruling 2026-09-16.
- **Public copy lives in two places that do not sync:** the design canvas
  (`docs/web/canvas/*.dc.html`, published at
  https://claude.ai/artifact/MydyXGM4MpDZtwixpUXjvs with a `note-build` sha
  stamp) and the page source `app/page.tsx` / `app/layout.tsx`. A canvas
  republish never reaches the site. Verify every copy claim in both, by grep
  and by curl of the live page as a stranger.
- **His standard for the words:** a working trader can tell it was written by
  one. His two verdicts: *"flat and distant"* and *"SCREAMS AI"* (the
  setup-and-payoff sentence). Rule: no clause whose only job is to land the
  clause before it.
- **Instruments, all in `docs/marketing/`:** `what-it-is-not.md` (the negation
  list, an internal tool never a lead); `2026-09-10-landing-copy-pass.md`;
  `2026-09-11-pre-session-research.md`; `2026-09-17-open-graph-copy.md`;
  `voice-reference-warrior-trading.md` (the reader, not a prose style).

**Open items**

| item | owner | waits on |
|---|---|---|
| The two meta descriptions still name three things; the share card names four (supply). Reconciled strings are in `2026-09-17-open-graph-copy.md`. | Web / Ops | next deploy |
| The sessions paragraph says the board runs 04:00 through after hours; the cycle badge is built on a 09:30–16:00 bar. He ruled the frame moves to the full session. If that does not ship, the caveat *"The cycle read is taken on the regular session."* goes in. | Research (code), this seat (caveat) | Integration reporting the frame change landed or dropped |
| The canvas artboards still say TMI Trader. | Web |, |
| *"Research for the avoid"* is cleared as a claim and is the research section's header the day the Why Not Report renders. | this seat | Design shipping the report |
| Socials: not started, no accounts, no handles. Trigger is his. | him | his word |

**Archive, 2026-09-10 to 09-21, for the record.** Commits carry the detail:
`d73de05` not-list and copy pass; `21ddd04` Commercial's rulings on both
artboards; `d87be21` research section; `0ec51ad` fourth reading rule;
`fe26b0a` "None of this is on the chart"; `c353cbd` sessions paragraph;
`f1269cd` voice reference; `ea1a8e6` Open Graph strings; `b8b600b` tagline
back after the rename.

---

## LIVE STATE (2026-10-05, this Marketing seat handing off)

*Everything in flight from this seat. Peer seat ids churn every few hours: look them up fresh (list_sessions), reply to the from= address, route cross-thread through Integration. Hard rules: no em dashes anywhere (chat, docs, copy); no buy/sell/advice/forecast/outcome in copy; float is a verdict or a bound, never a bare number; stay BLIND to the v6 checker code; `git commit --only`; this PC checks out CRLF, normalise before matching source. As of now Integration 24th (local_f26376f1) and Research (local_ab66f9f3) are retiring with successors opening; Commercial local_2ce868d2.*

### 1. Reports v6 narrative (the big one, his "drastically lacking" verdict)
TWO TARGET EXAMPLES ARE FINAL, verified against the 10-01 store, whole-number move percents (cards keep exact), <=3 named tickers each, each with a checked fact, no cause/advice/forecast, cycle in PROSE form in prose. In `docs/research/reports-v6/narrative-redesign-proposal.md` and my Research messages.
- PREMARKET (recap), final: "Nine names ran at least 50 percent above the prior close, then faded: none round-tripped entirely, but only four of the nine held even half their peak gain by the close. The three biggest the desk covered carried fresh news: NXL, a 10-year Brazil and South America distribution agreement; SSM, a Schedule 13D filing, with a 21.5 percent stake reported in secondary coverage; NAMM, first-half results and revised production guidance. Of the twelve the desk covered, seven had fresh news in our sources. The desk carries twelve names forward." (v2 adds per-mover high/close, a labeled after-hours line "After the close, AMOD added 62 percent", a catalyst-type count "three were deals or contracts", and a forward-context line. See the proposal doc for the v2 shape and the power-hour example.)
- RULES the writer/checker build to: named ticker needs a checked fact (bare roster struck NOT_SELF_CONTAINED); F6 is "ran at least 50 percent ABOVE the prior close" (not "off"); "gave the entire move back" = "closed the regular session at or below the prior close", paired with its definition IN the fact sheet so the checker never equates two wordings; band ordinals ("entered the top 12") dropped by the writer allowlist, use "printed a new high of day"; a struck card keeps company/tags/path with NO prose and no mark (section 3a), so card count equals the narrative's covered count; themes limited to a FIXED catalyst-type list (deal/contract, financing, results, clinical, filing/stake, corporate action, none), sector themes NOT available (SIC empty).
- NEXT: Research builds the fact sheet + writer rules to the examples, runs the writer comparison WITH CLAUDE MODELS (his ask), produces step-5 samples for his read; then the checker FREEZES and this seat authors a FRESH BLIND seed set: narrative classes N1 to N11 + card-prose guardrails (L-float, L-SO, L-sell, L-advice, plus number-not-in-store, date-not-held, clock-no-source, causation, company/country contradiction, em dash) + the supply-restatement class (a ledger figure in prose not in catalyst.summary). Stay blind to the checker; only the pass-bar classes come before the freeze. Discipline: field-trace every control, format first / hash last, file intact, LF-pin, N=3, raw before read.

### 2. Sheet reproduction (Priority -> Setup grade on the main board; "Researched Names" table removed)
- SETUP GRADE is a BADGE in the Ticker cell with a TOOLTIP, computed from five criteria. Display mapping over the UNCHANGED stored PriorityBucket enum: AVOID -> "D" (A/B/C unchanged). Readings (my PROPOSALS, not yet his-approved): A strongest reading; B strong with limits; C weaker/backside; D risk outweighs the setup. Never pick/signal/opportunity/buy/sell/avoid; no "next-session".
- TOOLTIP per grade: "Setup grade {A..D} as of {checkpoint ET}. {reading}; {which criteria it rests on}." Needs the per-criterion basis exposed in the contract (STRONG/LIMITED/RISK/UNKNOWN/NOT_YET per criterion). "which criteria it rests on", never "drove" (no-cause). His words were only "badge on the ticker, it needs a tooltip"; the contents are the proposal.
- SURFACE SWEEP (Commercial acceptance list): the mapping must reach EVERY user-reachable surface, column, filter option, URL value, aria/tooltip, drawer badge, MCP output (lib/mcp/tools.ts), API/export, report tags; no "AVOID"/"Priority" may leak.
- UNGRADED cell (N-states rule): the empty-cell dash maps ONLY to not-yet-produced; produced-UNKNOWN gets a word; EXCLUDED its own word if it can occur; "not yet" never prints as UNKNOWN. HELD until the next Research field contract names which states a Priority cell can be in. A legend writes "A dash in this column means ...", never opens with the glyph.
- RUBRIC TABLE: NOT approved. He ruled only "compute from five criteria". Research drafts the table, this seat words it, he approves ONCE. Legend: "the desk's own automatic reading of five criteria ... not a prediction, not a recommendation, and have not been tested against outcomes" (that last clause must be tied to a tested flag; it expires the day any test runs).
- Docs: `docs/research/sheet-reproduction/proposal-2026-10-04.md` s3; `docs/commercial/2026-10-03-sheet-reproduction-claims-read.md` s5/5b/5c; sheet plan 4a6d8b6e, b60a6bb3.

### 3. Float cell + public page "Are float quotes real?"
**PUSH CLEARANCE (Marketing, 2026-10-05): cleared to ride the next push, by sha: `7e0472d1`, `4a04b132`, `5855bf61`, `a9ea26a4`, `226fbf72`, `2c93a226`, and this line's own commit. Each touches only `docs/marketing/float-page-draft.md`, `docs/marketing/setup-grade-words-draft.md` or `docs/threads/marketing.md`. Commercial's passes: float 5i rewrite not yet read (226fbf72 goes to Commercial for six sentences); Setup grade words v2 and v3 passed, `067dae18` (6a).**
**UPDATE 2026-10-05 21:30 UTC-ish (Marketing, from the transcript clock 21:22:37Z): HIS RULING "90 days, approve the badge draft, yes hand off"** (read at his own turn in the Integration seat transcript 125cfd6b, human origin). (1) Float maximum filed-count age is 90 days: float draft **v13, `226fbf72`**, rewrites the six sentences in Commercial 5i (b757236d); back to Commercial for those sentences only, then to Web for the rendered page. (2) The Setup grade words are FINAL with the approved rubric: **v3 `5855bf61` + `a9ea26a4`** (rule 0 at db44c74e). Commercial's written dash pass is still owed by sha (relayed by message only). **OWED to the next Integration-tmi: push clearance for `226fbf72`.** The older paragraphs below are superseded where they differ.
**UPDATE 2026-10-05 (Marketing successor): the float WORDING is approved by him** (2026-10-05T16:01:43Z, "float wording is fine but i want to see the webpage"; Web is rendering a private preview). The live draft is `docs/marketing/float-page-draft.md` v12, `9c6b0ed4` (v11 `56cdc9dc`; Commercial passed through 5h). Faces: "≤ 12.3M", "Unknown", "Cannot verify", "Not computed", all one line in the 102 px Float column Design approved. **OWED: push clearance by sha for 56cdc9dc, 96eb3935, 9c6b0ed4 (the earlier five were cleared to Integration 25th); the 25th retired before it could be sent, so the NEXT Integration-tmi needs it.** Still gated on Research's validation sample and the NOT_COMPUTED versus ISSUANCE_NOT_CHECKED boundary; page and tooltip link ship in one release. The older paragraphs below are superseded where they differ.
Draft COMMITTED at `docs/marketing/float-page-draft.md` (v4, e79e295a). Commercial's retiring seat gave a FINAL re-read (s5d): PASS, two items now applied, so the PAGE is Commercial-clean: the universal hedged ("We know of no SEC filing that requires a count of floating shares"), and the subtraction set broadened ("the officers, directors, large holders and anyone else who files Forms 3, 4 and 5"). The float CELL words were sent to Integration 25th (`local_ef410868`), budget-fit for Design's 68px/11px cell: "≤ 12.3M" in the cell with "no more than ... from SEC filings as of {filed-count date}" in the popover; "Unknown" (no filed count); "Cannot verify" on two lines (stale or active issuance; full reason in the popover). Page v4 + cell words route to Integration 25th, then him; GATED on Research's insider-only validation sample. The NEW Commercial seat (by title, `docs/commercial-opening-prompt.md`) owes one claims judgment: whether date-in-popover satisfies claims item 7 (the cell face keeps "Cannot verify", two lines, so there is no renamed-state judgment). The compact cell face also waits on the next Research seat's maximum filed-count age. Item 7 (Cannot verify after active issuance) is also open for the next Research seat. Rebuildable from `docs/research/float-comparison/result-2026-10-05.md` (759465bc).
- CELL: "No more than {X} shares, from SEC filings as of {date}" ({X} = filed count minus insiders' DIRECT non-derivative common from Forms 3/4/5; filer set = officers, directors and large holders; {date} = the filed count's date); "Unknown" (no filed count); "Cannot verify (shares may have been issued since the filed count)" (stale, or active ATM/equity line/known-active block).
- PAGE, provable only: companies are not required to file a COUNT of floating shares; the SEC's "public float" (Rule 12b-2) is a DOLLAR value on the 10-K cover as of Q2; a quoted float is an estimate not a filed fact; "we know of no public source that states a count of freely tradable shares"; the method is an upper bound COMPUTED from filings (not "prove"); "when the inputs line up ... at most that number"; 13D/13G BENEFICIAL totals NOT subtracted (Rule 13d-3: right to acquire within 60 days, or controls voting/investment); the EARLIER version that also subtracted large holders went BELOW ZERO on one test name (combined large-holder totals exceeded the filed count). No "safe"/"never", no "nobody measures", no vendor named/disparaged, body never answers "no".
- GATING: DOES NOT SHIP before the insider-only method has a VALIDATION SAMPLE (next Research seat). Item 7 (Cannot verify after active issuance) OPEN for the next Research seat; items 5 and 6 settled at source by Commercial.
- The float page, the grade words and the tooltip route to the NEW Integration seat (not the 24th), then to him.

### 4. Short-interest label (words LOCKED; build and ship gated)
Locked through Commercial R1 to R6 + 13f; his trend word "Falling". SIZE (of the filed share count, date inline when >45d): "under 5% of the filed share count" / "5% to under 10% ..." / "Elevated (10% to under 20% ...)" / "Heavy (20% or more ...)". DEPTH (days to cover, normal volume): Shallow <3 / Moderate depth 3 to <5 / Deep 5 to <10 / Very deep 10+. TREND: Building / Steady / Falling, shown only Above-normal and up. CHIP SIZE-ONLY: "SHORTS: HEAVY · 17d" (age = days since settlement; no Very-deep chip, depth can overstate on a fast mover). Legend names FINRA owner and source, grades the desk's own, not a prediction/recommendation; float footer; "squeeze" nowhere. WAITING on: his display-mode choice (always-shown vs exception-only; exception-only legend "No short interest line means nothing large was found, or the size could not be measured"); the FINRA coverage check; calibration of the bands against his board. Docs: `docs/research/short-interest-label-design.md`, `short-interest-classification-2026-10-02.md`, commercial.md s13/13c-f.

### 5. Shipped / queued
- BLUE-SKY level lines + hover: SHIPPED (window lines, UNVERIFIED reasons, isolated-spike line, named-split sub-line; hover shows the AS-TRADED price "about $X as it traded on {date}, before share consolidations totaling {N}-to-1"; c535dce7). Nothing owed.
- BOTH-SURFACES TAG WORDING: this seat's clearer cycle/grade/explains/supply words queued as ONE post-v6 change updating the board AND the report together, checked at the board's 1,024 floor. Not before v6.
- The older Open-items table above (meta descriptions naming three/four things; the cycle-frame caveat; the canvas TMI-Trader strings; the Why-Not header; socials) still stands.
