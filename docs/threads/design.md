# Thread: Design & Frontend

**Owns the trader-facing surface.** The audit remediation plan, the Discovery
board, the watchlist, the dossier drawer, and the visual system.

Last worked: **2026-08-21**. Written up 2026-08-23.

## The design authority

[`../Design/design-audit-report.md`](../Design/design-audit-report.md) — a full
UI/UX audit of the live desk. Its findings, its §9 prioritized plan and its §10
acceptance criteria are the specification. Read it completely before changing
anything.

The brief that produced it is [`../Design/designaudit.md`](../Design/designaudit.md).

Both were committed on 2026-08-23 in `c8f95a3`, and the stray duplicate of the
brief at `docs/designaudit.md` was removed. `docs/Design/` is the canonical home
for design documents.

## Scope

- §9 items 12–26 (Phase 2 structural, Phase 3 enhancements)
- Component work in `components/` and `app/`
- The visual system in §8: colour precedence, type scale, contrast, density
- Meeting §10's acceptance criteria — measured at **1,022 × 551 CSS px**, the
  viewport actually used

## Not this thread

- Deploying → [ops.md](ops.md). Produce commits; Ops puts them on the server.
- What the dossier *says* — grades, evidence, interpreter output → [research.md](research.md)

## State as of 2026-08-21

**Phase 1 — Immediate Corrections (§9 items 1–11) is complete and live in
`32e47c9`.** Verified against six real dossiers in production, not fixtures.

Shipped:

- session-scoped VWAP with distance in dollars and percent, labelled PM/RTH/AH
- verified blue-sky states, all five occurring on real tickers
- the 7-field compact surface at 40 px rows, no horizontal scroll at 1,022 px
- keyboard access to the dossier with a real focus trap
- hover bubbles restored for any truncated long text
- fixed chrome 199 px → 99 px
- dashboard payload 413 KB → 78.5 KB, unchanged polls now cost nothing
- no `SCREAMING_SNAKE` and no raw UTC ISO anywhere trader-facing, guarded at
  compile time

One honest note carried forward from that session: the enum leak was reported as
fixed when local fixtures could not have tested it. It was caught in production
and the guard now fails at build time. Verify UI claims against the live desk.

## Open items

**Phase 2 — structural (§9 items 12–19).** Not started.

| # | Change | Size |
| --- | --- | --- |
| 12 | Persistent **Changes rail** — the product's differentiator | L |
| 13 | Re-target filters at Discovery; workflow filters, not enum filters | M |
| 14 | Tab the drawer (Read / Catalyst / Structure / Cycle / Evidence) | L |
| 15 | Single conflict signal with a jump link | M |
| 16 | Human labels for remaining enums; ET timestamps throughout | M |
| 17 | Unified float presentation — one number, one qualifier, one reason | M |
| 18 | Colour precedence — one saturated element per row | M |
| 19 | Auto-expand the researched table when Discovery is empty | M |

**Phase 3 — later enhancements (§9 items 20–26).** Full keyboard model,
checkpoint diff view, EDGAR citation links, definition popovers, density
toggle, SSE instead of polling, `aria-live` announcements.

## The §11 decisions — three settled, three open

Settled with the desk owner on **2026-08-23**. The full answers, with the
reasoning and the measurements behind them, are recorded **beside each question
in audit §11** — that is the authoritative copy; this is the index.

| §11 | Question | Status |
| --- | --- | --- |
| 1 | Is the Google Sheet permanent or a migration artefact? | **Settled — migration artefact.** Question was mis-premised |
| 2 | Should `Confirmation` be built or removed? | **Settled** — collapses into 1; not built |
| 3 | Which briefed-but-unbuilt concepts are wanted? | **Settled — none in Phase 2.** Three routed to R&D Q7; Absorption declined outright |
| 4 | What is the real target resolution? | **Settled — standard breakpoints.** "This will be a product" |
| 5 | Should Discovery be re-rankable? | **Settled — deferred** past item 13, owner concurred |
| 6 | Does the 09:25 assessment get a validated score? | **Handed to R&D** as register Q6 |

**Item 1 — settled: the Sheet is a MIGRATION ARTEFACT.** The trader's intent is
for the application to absorb the four-task workflow.

**The question was mis-premised and the premise is retracted.** §11 item 1 asked
whether *human review* is permanent. **No human has ever reviewed any of it.**
The trader does not write to the Sheet and never has. Four scheduled ChatGPT
tasks write it on weekdays — 22:00, 06:10, 09:25, 16:15 ET — over 204 research
rows, 96 archive rows, 148 graded-outcome rows and nine dated tabs, with its own
forecast-versus-outcome ledger. Not a fossil, not a ceremony. Established by
Integration, commits `3263615` and `7f892e7`.

So the conflict apparatus adjudicates **two automated research pipelines** with
different universes ($2–$10 / float < 20 M versus this desk's $1–$20 RVOL
ranking) and different discovery methods — not a human against a machine.

**Settled:** no review workflow. Nothing built that assumes the Sheet is
permanent; nothing polished that exists only because a spreadsheet is the source.

**Not settled, and not Design's to pre-empt: when the apparatus comes out.**
Migration artefact means the Sheet goes eventually, not that the machinery is
deletable now. Two Research findings gate it — whether `sheetPrior` feeds this
desk's interpreter, and whether the conflict display is partly a timing
artefact. Design established the first in code on 2026-08-23 and handed the
evidence to [research.md](research.md) item 7: **it does feed it, and the two
reads are therefore not independent.** Whether it changes the output is
empirical and Research's.

**Standing constraint until Research reports:** no design may present
Sheet-vs-Auto conflict as a meaningful disagreement.

**Item 4 — settled, and the answer retired the question.** Asked for the
maximised viewport measurement, the owner answered: *"Do whatever is standard —
this will be a product."*

**No number off one machine is the target any more.** The audit's method —
measure the owner's window, write acceptance against it — was right for a
personal tool and is wrong for a product. Do not chase the measurement.

**Standard desktop breakpoints:** floor **1,024 px** (eight-column core
readable, zero horizontal scroll), baseline **1,280–1,440 px** (the design
target; where layout is authored and reviewed), wide **1,920 px +** (optional
columns `Halt`, `Spread`, `Float Turn`, `Δ since checkpoint`). Width buys rows
before columns at every band. Below 1,024 px is **out of scope** and should be
stated rather than degraded into — a phone layout is a different product
decision nobody has asked for.

**§10 is restated, not re-numbered.** Acceptance moves to the 1,280 px baseline,
re-checked at the 1,024 px floor. Its existing targets survive the move — they
were written against a harder number, so they hold at an easier one. Its second
premise also fails: "measured with the desk owner, no training" is a
personal-tool acceptance test.

**"A product" does NOT unsettle the one-trading-style premise.** Design raised
that as a cross-thread question and **the owner ruled against it the same day** —
*"designed for momentum style traders only at this point. My style. It's a
niche, which is where this will start."* The flag to Integration is withdrawn;
the README's *Who this is for* stands unchanged. Widening the audience inside
the niche is not widening the style, and a decision that suits a general trading
audience but not this one is still wrong.

**What does change is narrower.** The reader is no longer the author. Item 24
(density toggle) stops being a convenience and becomes how one layout serves
several machines; §10's accessibility criteria become obligations owed to people
who are not the author; and §10's "measured with the desk owner, no training" is
not an acceptance test a product can keep. Terminology stays in this style's
language — it stops being safe to assume one trader's personal shorthand.
Neither item is Phase 2 work.

**Item 3 — still open, and Absorption looks self-answering.** The booklet's
absorption is a live Level 2 / Time & Sales read at second granularity, used as
a *gate* ("wait for hidden sellers to get absorbed"), at a specific price level.
The desk's grain is a 4 s poll over filings and session aggregates, and Level 2
/ T&S are architectural non-goals. A desk-computed "Absorption" would be a
slower copy of something already on the adjacent screen, competing with a
truthful live read at the moment it matters. What the desk *can* contribute is
the other half — the supply ledger says where a dam may exist and how big. The
live question is therefore narrower: **should the §6 Risk chip carry that
magnitude in trader vocabulary rather than `DIRTY 10.9×`?** Chop Risk, Flush
Risk and Effective Float Turnover each need a definition the owner would stand
behind before they earn a column; Design's recommendation is **none of the three
in Phase 2** absent one. See [integration.md](integration.md) item 1 — the only
written default on these sits in a stale paragraph.

**Item 5 — Design proposes deferring.** Re-ranking is cheap to build, but the
Discovery caption is a defended opinion and re-rank by float or freshness
quietly turns it into a preference. Most of the use case is item 13's workflow
filters (`fresh catalyst only`, `float < N`, `changed since checkpoint`).
Proposal: revisit after item 13 ships. **Owner concurred 2026-08-23 — settled,
deferred.**

**Item 3 — settled: none of the four in Phase 2.** The §6 column set is
therefore **final at eight** and no row design waits on this. Chop Risk, Flush
Risk and Effective Float Turnover were routed by the owner to the viscosity
programme — *"none yet, this needs to go to the viscosity study"* — and are now
[rnd.md](rnd.md) register Q7. **Overhang Absorption was deliberately not routed
with them**: Design's position is that it should not be built in this product at
any phase, because the booklet's absorption is a live Level 2 / T&S read at
second granularity used as a gate, and a desk-computed version would compete
with a truthful live read the trader already has beside him. Still open and
separate: whether the `Risk` chip should carry the supply ledger's magnitude —
a presentation question, not a new signal.

## Next session — item 16a, and only 16a

Chosen by the owner 2026-08-23. Scope is fixed by the table above: replace the
five false "human review" strings and swap the now-empty `automatic` contrast
for **desk research / outside research** across the ~20 rendered sites. Enum
identifiers do not change. Nothing else ships in the same commit.

Three conditions carried in from this session:

1. **Verify the rendered result on the live desk before reporting it done.** The
   string list was read from source. The one Phase 1 defect that reached
   production was invisible to local fixtures, and this change is nothing but
   strings.
2. **Do not touch item 15.** Deferred pending Research, not reduced.
3. **Two code-level falsehoods are flagged, not fixed** — `sheetTable.ts:165`
   and `openaiInterpreter.ts:150`. Neither is trader-facing, so neither belongs
   in 16a. They want a separate commit and `openaiInterpreter.ts` is arguably
   Research's file, not Design's.

## The immediate piece — five false labels

**Verified in source 2026-08-23.** Five trader-facing strings assert that a
human did work no human has ever done:

| Site | String |
| --- | --- |
| `lib/dashboard/language.ts:23` | `SHEET_ONLY` → "only the human review reached a conclusion" |
| `lib/dashboard/intelligence.ts:158` | "The human review and the automatic layer disagree (…). Both conclusions are kept." |
| `lib/dashboard/intelligence.ts:166` | "Human review and automatic analysis both present and not in material disagreement" |
| `lib/dashboard/intelligence.ts:167` | "Human review present; automatic analysis did not establish …" |
| `lib/dashboard/intelligence.ts:171` | "Human-reviewed research only; no accepted automatic dossier" |

Integration named two; the sweep found five. This is a worse failure than the
engine enums removed in Phase 1 — `LATCH` was jargon, this is **untrue**, and it
is untrue about *who did the work*, which is the one thing a provenance label
exists to tell the trader. **Fixing it does not wait for item 1, for Research,
or for anything else.**

Two further falsehoods are in code rather than on screen, **flagged not fixed**
(this thread wrote no code on 2026-08-23):

- `lib/data/sheetTable.ts:165` — the comment justifying preserved row order
  asserts "the sheet's order is the trader's priority order and re-sorting it
  would be a silent editorial change." The trader does not author that order. A
  comment asserting a false fact about the trader's behaviour will mislead the
  next reader, and it is load-bearing for a real decision.
- `lib/research/interpret/openaiInterpreter.ts:150` — instructs the model not to
  adopt the prior *"because a person wrote it"*. No person wrote it. *(Design
  first cited `:148`; Research corrected it in `7b2553e` and the correction is
  verified — `:148` is blank.)*

### The vocabulary — chosen by the desk owner, 2026-08-23

**`SHEET` → "outside research"** (outside this application). **`AUTO` →
"desk research"** (this desk's own, filing-linked). Chosen over naming ChatGPT
directly and over a traceability-based pair. It is true today, names no vendor,
and the *outside* states simply stop occurring once the app absorbs the
workflow — so the words fall out of use rather than needing renaming again.

**The choice exposed something larger than the five strings.** The whole `AUTO`
vocabulary was built to contrast with *human*. With the human gone, **"automatic"
no longer distinguishes anything** — both pipelines are automatic. It is not
false the way "human review" is false, but it has stopped carrying meaning, so
16a is a **contrast-pair swap across ~20 trader-facing sites**, not five string
edits. Measured 2026-08-23:

| Site | Now | Proposed |
| --- | --- | --- |
| `language.ts:23` | "only the human review reached a conclusion" | "only the outside research reached a conclusion" |
| `language.ts:24` | "only the automatic analysis reached a conclusion" | "only the desk research reached a conclusion" |
| `language.ts:21` | "the automatic pass had not seen the newer source" | "the desk research had not seen the newer source" |
| `intelligence.ts:158` | "The human review and the automatic layer disagree…" | "The desk research and the outside research disagree…" |
| `intelligence.ts:166` | "Human review and automatic analysis both present…" | "Desk and outside research both present…" |
| `intelligence.ts:167` | "Human review present; automatic analysis did not establish…" | "Outside research present; desk research did not establish…" |
| `intelligence.ts:171` | "Human-reviewed research only; no accepted automatic dossier" | "Outside research only; no accepted desk dossier" |
| `intelligence.ts:175,181` | "Accepted automatic dossier / intelligence…" | "Accepted desk dossier / research…" |
| `deskRead.ts:307` | "Automatic research is under way…" | "Desk research is under way…" |
| `DeskRead.tsx:51,98,159` | "the automatic layer" / `AUTO: 'automatic'` | "the outside research" / `AUTO: 'desk'` |
| `AutomaticIntelligence.tsx:61,104` | "Automatic" / "Sheet vs Automatic" | "Desk" / "Desk vs outside" |
| `AutomaticIntelligence.tsx:251,317,411` | "Automatic Research" / "— Automatic" | "Desk Research" / "— Desk" |

Enum *identifiers* (`SHEET`, `AUTO`, `SHEET_ONLY`) stay as they are — they are
code, not trader-facing, and renaming them is churn with no reader benefit. Only
the rendered strings change. The component filename
`components/AutomaticIntelligence.tsx` likewise stays until the migration makes
a bigger rename worthwhile.

**Not yet verified against the live desk.** Every string above was read from
source. Per this thread's standing rule, the rendered result gets checked on
production before the change is reported as done — that is exactly how the Phase
1 enum leak escaped.

## Phase 2, re-sized on the migration answer

Integration's read was that items 13, 15, 16 and 17 get smaller. **Design's read
differs on two of them**, and the difference matters more than the sizing.

| §9 | Effect of the migration answer | Status |
| --- | --- | --- |
| 12 | None — the Changes rail has nothing to do with the Sheet | **Ready**, still L |
| 13 | Clarified, not shrunk | **Ready**, still M |
| 14 | Cycle merge shrinks; build the Sheet half as a removable slice | **Ready**, still L |
| 15 | **Deferred, not reduced** | **Blocked on Research** |
| 16 | **Grows, and splits** — 16a is the false labels above | **16a ready now**, 16b M |
| 17 | **Grows** — a derived float gives it a second number to reconcile | **Ready**, M |
| 18 | None — pure visual system | **Ready**, M |
| 19 | None in the work; the name "Researched names" stays right | **Ready**, M |

**Item 15 is the important disagreement.** A single prominent conflict signal
*promotes* Sheet-vs-Auto disagreement to a first-class alarm. Two open Research
questions say that disagreement may not be real — the reads are not independent
(`research.md` item 7), and three of four task times coincide with this desk's
checkpoints with the tasks observed 11–18 minutes late. Building item 15 now
would spend design effort making an artefact louder. **Defer until Research
reports.** F-16's nine-renderings problem is still real, so the *reduction* half
of item 15 (remove the duplicate `CONFLICT` marks and both `SOURCES DISAGREE`
chips) can proceed — it is the *promotion* half that waits.

**Item 16 grows rather than shrinks**, because it now carries the five false
labels and the SHEET/AUTO vocabulary rewrite on top of the remaining enums and
ET timestamps. Split it: **16a** the false labels, unconditional and small;
**16b** the rest, as planned.

**Item 17 gets more urgent, not less** — and an earlier line in this file said
the contradiction "may resolve itself entirely at migration." **That was wrong
and is retracted.** It resolves itself only if float survives the migration, and
today it would not.

**Every float on the desk is the Sheet's.** `resolveDisplayedFloat`
(`lib/dashboard/merge.ts:143`) has exactly two branches — the Sheet's `RESEARCH`
tab, then its `TODAY` tab — and the type enumerates nothing else:
`displayedFloatSource: 'RESEARCH' | 'TODAY' | null` (`merge.ts:87`). No third
source exists in the tree. Raised by Research, verified by Integration in
`4b06764`, re-verified here.

**The failure is silent, and it lands on Design's own component.** Retire the
Sheet with no replacement and every float resolves `null` — which
`lib/dashboard/risk.ts:172` reads as `floatUnknown` and renders as the
`FLOAT UNKNOWN` risk chip. That is a legitimate state, not an error, so nothing
breaks and nothing alerts. **The §6 `Risk` chip — column 6, the cell whose whole
purpose is making rejection cheap — would render `FLOAT UNKNOWN` on every row,
for ever, and look like it was working.** Float under 10 M is one of the five
pillars; it would leave the product without a single log line.

**Sequencing, not re-planning.** This does not reverse the migration decision.
Nothing that removes the Sheet ships before a float source replaces it. The
owner has approved the direction — float derived from SEC filings already
collected, shares outstanding less affiliate and restricted holdings from
SC 13D/13G and Forms 3/4 — and Research is scoping it.

**Two design consequences, both binding:**

1. **Design against the derived float arriving, not against today's.** A derived
   float turns F-19 from *one number and one absence* into **two numbers worth
   reconciling** — Sheet-displayed versus desk-derived — which is a better
   version of item 17, not a smaller one. The "one number, one qualifier, one
   reason" shape still holds; the qualifier becomes meaningful.
2. **The `Risk` chip must not assume a float number exists.** Its design has to
   degrade honestly when float is null, and `FLOAT UNKNOWN` on every row must be
   distinguishable from `FLOAT UNKNOWN` on one. This also constrains the open
   presentation question above — whether the chip carries the supply ledger's
   magnitude — because supply overhang is knowable when float is not.

**Unblocked and startable now:** 16a, then 12, 18, 19 — none touch the Sheet.

## Working rules

- **Terminology is trader-facing.** Labels that describe engine internals get
  rejected — `LATCH` was removed for exactly this. Say it in the language of the
  stock, not the pipeline.
- **Verify on the live desk**, not fixtures. The one Phase 1 defect that reached
  production was invisible to local fixtures.
- **Commit each approved piece separately** and report the hash.
- Gate before every commit: `npm test`, `npm run lint`, `npm run typecheck`,
  `npm run build`.

## Opening message for a new chat

> This is the **Design thread** for the Momentum Intelligence desk at
> `A:\mointel`. Read `docs/threads/design.md` and `docs/threads/README.md`,
> then `docs/Design/design-audit-report.md` completely — that audit is the
> design authority.
>
> Phase 1 (§9 items 1–11) is done and live in `32e47c9`. Phase 2 is §9 items
> 12–19 and has not started.
>
> The §11 decisions were worked on 2026-08-23: **items 1, 2 and 4 are settled,
> item 6 went to R&D as register Q6, and items 3 and 5 are still open.** The
> answers are recorded beside each question in audit §11 and indexed in
> `design.md`. Read them before planning — item 1 in particular changes the size
> of half of Phase 2. Do not re-ask a settled item.
>
> You do not deploy; the Ops thread does. Produce commits and hand them over.
>
> Start by telling me what you think Phase 2 should tackle first, given what
> item 1 settled. Do not write code until we have settled that.
