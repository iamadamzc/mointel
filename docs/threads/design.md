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
Proposal: revisit after item 13 ships. Owner concurred 2026-08-23.

**REVERSED the same day — the owner wants it, for Monday's open.** He asked for
sortable columns on RVOL, price change, price and float. Design's deferral comes
off the plan rather than being argued; it was a proposal and he ruled against it.

**It is far smaller than the audit implied.** `SortKey` (`lib/dashboard/view.ts:30`)
is already `priority | ticker | price | changePct | volume | float`, with working
comparators, a `SortState`, and header controls in `MomentumTable.tsx`.
`DiscoveryBoard.tsx` has **no** sort references at all. So the work is wiring an
existing mechanism to a second surface and adding one key — not building sorting.

**Null placement is the real design decision, and the current default is the
wrong answer.** `compareNumeric` (`view.ts:98`) returns `1` for null in *both*
directions, so unknowns always sink. Float is `number | null` and goes null
whenever the Sheet says `UNKNOWN` or `DIRTY FLOAT` — a material share of rows.
A trader sorting float ascending to find the tightest names would see a clean top
of list that is actually *"the ones we know about"*, with nothing saying so.

**Chosen: nulls stay last, and the absence becomes visible in the sort control.**
When a sort is active on a nullable column the header carries the count —
`Float ▲ · 6 unknown`. Keeping nulls last preserves a predictable, stable order;
the count removes the false clean top. This is the same move §7 already makes for
the researched-names header (`6 researched · 2 not in Discovery`) — the product
already has a precedent for telling the trader what he is *not* seeing, and this
reuses it rather than inventing a treatment.

**RVOL is already the board's order**, so an RVOL sort is a direction toggle
rather than a re-rank — except when the board is ranked on AH participation
instead, where it is a genuine re-rank. Worth saying in the UI rather than
shipping a control that looks inert.

**`changePct` was ambiguous at premarket** — AH %, PM % and change against prior
close are three different numbers at 04:00 ET. **Answered by the owner: prior
close, including after hours.** That is already what the field does:
`MarketTelemetry.percentChange` is session-aware by construction
(`lib/market/types.ts:310`) — measured against the prior session's close during
premarket and RTH, against the current day's close once the bell has gone. So
nothing needed computing. What needed doing was **labelling**, because one field
means three things across a session and a fixed header would be wrong twice a
day.

### The principle behind it, stated by the owner: *the app changes with the market time*

This is now a design rule, not a one-column answer. The desk already honours it
in places — Discovery re-ranks on after-hours participation and says so, VWAP is
session-scoped and refuses to carry the premarket average into RTH. **Any field
whose meaning moves with the session must carry a label that moves with it.**
Re-deriving such a field per surface is the failure mode: it produces a second
number under the same name.

### Built 2026-08-23, gated, handed to Ops

| Decision | Choice | Why |
| --- | --- | --- |
| Where sorting lives | One control in the board header, not column headers | Float has no Discovery column; two mechanisms would be worse than one |
| Sort vs. Top N order | **Sort the tracked set, then take Top N** | "Top 25 by float" should be the 25 tightest on the board, not the tightest of the 25 busiest |
| Nulls | **Last in both directions**, with a live `n unknown` count beside the control | A name with no float is not the smallest float. The count is what stops a false clean top |
| Ties | Board rank, then ticker | A total order, so rows do not shuffle between 4-second polls |
| Float column | Appears **only while float sort is active** | A sort whose column is off-screen hides why the order is what it is; a permanent column spends width the eight-field board does not have |
| Override visibility | `sorted by float` marker in the header while active | Discovery's order is owned by the session (`DiscoveryState.board`: *"a function of the session, not a user preference"*). A user sort is an override and has to look like one; `Rank` returns it |
| `Move` label | `Move vs prior close` / `Move today` / `Move since close` | The session-time principle above |

`lib/dashboard/view.ts` gained `DiscoverySortKey`, `sortDiscoveryRows`,
`discoveryValueFor`, `discoveryMissingCount`. `components/DiscoveryBoard.tsx`
carries the control. Seven tests in `tests/dashboard/discoverySort.test.ts`,
covering both null directions, tie stability and non-mutation.

**Gate: 1,238 tests pass, typecheck, lint and build clean.** Deployed by Ops in
`f383ddd`, 15:38 ET Sunday.

### Verified on the live desk — and it found a defect the gate did not

First use of the post-deploy verification rule (`README.md`, `abf38e1`). What it
caught had passed a green gate, 1,238 tests and a source review.

**The `Move` label was hover-only.** The session wording lived in a `title`
attribute and the visible button always read `Move`. That is content reachable
*only* by hover, which **§10 rules out**, and it was the one thing the owner
asked for by name. Design's own commit message described it as a visible label.
Live for one deploy; fixed the same evening.

**The fix is not a moved string.** The wording became a tooltip in the first
place because of width — the control is five buttons that must survive the
1,024 px floor, and `Move vs prior close` on a button does not. So the visible
labels are short and trader-native: **`Gap`** (premarket — the desk's own word
for the prior-close-to-premarket move), **`Move`** (RTH), **`AH move`** (after
the bell). The sentence stays in the tooltip as a supplement, never as the only
route. A regression test asserts the visible text differs by session, which a
tooltip-only implementation cannot satisfy.

**What could not be verified, and why it was not market hours.** The review
transport serves **no JavaScript**: every `/_next/static/*` chunk returns `401`,
because Basic Auth is applied at the server level and only `/review/`, `/mcp/`
and `/.well-known/` turn it off. The page renders server-side HTML and never
hydrates, so **every control on it is inert** and the CSS 401s too. Confirmed by
clicking with real mouse events, not inferred. Handed to Ops.

**Two consequences worth keeping separate.** Design cannot verify *interactive*
behaviour through a review session at all — only that markup renders. And
`Top 12/25/50`, which shipped in Phase 1, has been dead in every review session
since, and nobody knew because nobody had clicked it. `AWS_DEPLOYMENT.md:180`
presents review sessions as the answer for automated browsing; they can display
the desk but cannot exercise it.

**Second look, after Ops fixed the asset 401 in `c36b840`.** Assets return 200
with the right MIME type and **the page hydrates** — `Top 12/25/50`, dead in
every review session since Phase 1, responds. *(A first re-check said it was
still inert; that was a stale browser cache holding the failed script loads, not
a failed fix. Corrected here so the false alarm does not outlive it.)*

**Verified interactively, on the live desk:**

| | |
| --- | --- |
| Control renders, five keys, correct order | ✅ |
| `Rank` default, `aria-pressed=true`, ascending | ✅ |
| Clicking `Float` → pressed flips, `▼` descending default for non-rank keys | ✅ |
| `sorted by float` override marker appears | ✅ |
| Clicking `Rank` → returns ascending, marker disappears | ✅ |

**Still unverified, and all four need a populated board:** actual row reordering,
the unknown count against real null floats, Top N applied after the sort, and
the `Gap` label — which additionally needs `aa98b70` deployed, since production
is still `f383ddd`. Discovery reads *"populates from 04:00 ET on 2026-08-24"*, so
there is nothing to sort until premarket.

**A scheduling trap, since resolved.** The token first issued for this look
expired **03:56 ET Monday**, four minutes before `PREMARKET_START_MIN` opens the
session at 04:00 — a twelve-hour session issued Sunday afternoon lands there by
arithmetic. Ops reissued as session 13, running to 11:59 ET Monday and sized
against `PREMARKET_START_MIN` rather than eyeballed. **Resolved; recorded because
the failure mode is a class, not an incident.**

### Third look — `aa98b70` deployed as `5ee47d8`, 16:17 ET Sunday

**The new build is live, confirmed by content rather than by report:** the `Move`
button's tooltip reads *"Change from the most recent session close"*, a string
that exists only in `aa98b70`. Session phase `CLOSED`, so the button reads
`Move`.

**This does NOT verify the label fix, and the reason is worth stating.** At
`CLOSED` the new code's default branch renders `Move` — which is exactly what
the old hover-only code rendered too. **The two are indistinguishable at this
session phase.** Confirming the deploy landed is not confirming the behaviour
changed; the only phase that proves the visible text moves with the session is
one where it differs, and the first is premarket's `Gap` at 04:00.

A check that cannot fail is not a check. Recorded so nobody reads "looked at it
after the deploy" as "verified".

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

## Research's independence result — three design consequences

Routed 2026-08-23. Measured by Research, verified in code here.

**1. RETRACTED 2026-08-23 — the prior was never shown to move the grade.** This
section previously read: *"the two graders are not independent — measured.
Removing the Sheet's prior changed the catalyst grade on 2 of 6 names against a
control variance of 0 of 6."* **Withdrawn.** At four runs per arm, **0 of 6**
tickers are stable-in-both-arms-but-different; the two reported as moved are the
two that vary *within the control set anyway*. The original came from single
runs and could not separate the prior's effect from the model's own variance.
Retraction record: `research.md` item 10, `ca1c90c`.

**Do not over-correct — the exposure is confirmed, only the effect is not.**
`sheetPrior` reaches the interpreter on **every** call: `bundle.ts:426` →
`buildInput` at `:102` → `JSON.stringify(bundle)` at `:107`, on the main path at
`:188`. Design verified that path independently earlier the same day. A null at
n=6 on a field now known to be **2 of 6 unstable on identical evidence** is a
weak instrument — it says the earlier positive was indistinguishable from noise,
not that the prior is inert. **The honest state is UNMEASURED, not CLEAN.**

**The asymmetry claim goes with it.** Design wrote that agreement is "the null
result" and that any wording implying two sources vouching for each other "is now
false". **That over-claimed.** It rested on a demonstrated effect that no longer
exists. `intelligence.ts:166` rendering agreement as corroboration is **not
established as false — it is unverified**, which is a weaker and different
statement. It should not be rewritten *because agreement is uninformative*; that
was never shown.

**Item 15's direction survives, on the mechanism rather than the measurement.**
The *reduction* half proceeds (strip the duplicate `CONFLICT` marks and both
`SOURCES DISAGREE` chips — F-16's nine renderings), and conflict is **never
promoted to a first-class alarm** — because an alarm implies a tally of
independent votes, and `AUTO` still sees `SHEET`'s answer on every call. That is
a code fact and it does not depend on the retracted figure. Still not built in
Phase 2.

**2. `structureClassification` is unstable — half of it moves on identical
evidence.** Four runs over byte-identical evidence disagree on **3 of 6** names
(revised from 2 of 6, which came off two runs). **Catalyst is not the stable
counter-example it was reported to be** — it is **2 of 6** unstable on the same
four-run data, revised from 0 of 6. Structure is worse, not uniquely afflicted.

**It is not a property of the stock; it is one reading of it**, and the product
has no representation for that today. It sits in the Desk Read strip
(`deskRead.ts:370`), both `DIRTY_FLOAT` and `STRUCTURE_CAUTION` branches of the
risk chip (`risk.ts:146,187`), and the completeness check
(`intelligence.ts:79`) — all of which state it flatly.

**This retroactively justifies the risk-chip decision made the same day.**
`8M FREE TO SELL` is a share count read out of filings; `DIRTY FLOAT` is a model
verdict that moves one time in three on the same inputs. The row now leads with
the deterministic fact and relegates the unstable verdict. That was chosen for
legibility before this result existed; it is now also the correctness choice.
**General rule for Phase 2: where a deterministic fact and a model verdict say
the same thing, the row shows the fact.**

**3. The Changes rail must carry only attributable change — and the defect is
live, not hypothetical.** `lib/desk/assessment.ts:269` pushes `STRUCTURE_CHANGED`
on a bare `previous.structure !== current.structure`, with **no evidence gate**,
and writes a note `structure X → Y`. Twelve lines below, `NEW_EVIDENCE` **is**
gated on `evidenceFingerprint` changing (`:277`). The machinery to distinguish a
re-read from a real change already exists in the same function and structure
does not use it.

**Corrected 2026-08-23 by measurement — the claim above was overstated.** Design
wrote that `STRUCTURE_CHANGED` "fires on model variance today, and has been doing
so into every stored checkpoint." R&D then measured **1,248 consecutive
checkpoint pairs**: **0** structure moves across 1,192 same-version pairs, **29**
across 56 version changes. Every structure move in the stored record coincides
with a new analysis version and none occurs without one — and catalyst moved on
the identical 29, which (catalyst being stable on fixed evidence) says those are
real evidence change rather than noise.

So **the archive is not contaminated**. The missing gate is real; the exposure
Design inferred from it was not. A re-read that produces no new analysis version
never writes a new value, so variance had no route into the record.

**The gate is still required, for a narrower reason.** A new analysis version
does *not* imply new evidence — escalation re-adjudicates a disputed field over
the *same* sources, which is precisely where Research's 1-in-3 instability lives.
The stored zero holds because the pipeline is designed not to re-analyse on an
unchanged fingerprint, not because version change and evidence change are the
same thing.

**Rule, restated:** gate on the **evidence fingerprint**, not the version id.
R&D noted version id is a cheaper proxy that currently coincides, but the
fingerprint is already in hand at `assessment.ts:277`, so there is no saving to
buy with a proxy. And when a reading changes with no evidence change, the rail
must not word it as a change *about the stock* — what changed is the desk's
read, not the company. Item 12 may surface it, worded as a re-read, or stay
silent; it may never say "structure changed".

**Design rule for item 12:** a classification change earns a rail line **only
when the evidence fingerprint also changed**. Otherwise it is a re-read and the
rail stays silent. Deterministic market fields — rank, RVOL, price, float,
volume, halt — need no such gate.

**The catalyst carve-out is withdrawn.** This rule previously exempted catalyst
"because catalyst is measured stable". Catalyst is **2 of 6 unstable** on the
four-run data. **The gate now applies uniformly to every classification —
catalyst, structure, cycle — with no exemptions**, which is simpler than the
version it replaces and does not depend on any field's measured stability. That
is the point: a rule that has to be re-checked every time a stability figure is
revised is not a rule. This settles Integration's "which fields earn a place"
by the nature of the field rather than by its current noise estimate.

**Archive contamination: raised, measured, and closed.** Design handed this to
R&D as a data-integrity question. R&D's 1,248-pair measurement answers it — the
stored record is clean. Nothing further is owed.

**`CYCLE_CHANGED` (`:273`) is now measured, and the shape of it matters more than
the rate.** `cycleClassification` is **2 of 6** unstable — the same order as
structure. But **both flips are classified-to-`UNKNOWN`**, not direction flips:
OLOX `YELLOW_FRONTSIDE_WARNING` → `UNKNOWN`, CDTG `RED_BACKSIDE` → `UNKNOWN`.

**REVERSED 2026-08-23 by a properly powered measurement — the paragraph that
stood here was wrong, and wrong in the safe-sounding direction.** It read:
*"Nothing reads as 'the stock turned' … a materially less dangerous failure than
a frontside/backside flip would be."* **Direction flips do happen.** The six-name
null was underpowered, and an underpowered null leaves a claim unresolved rather
than refuted. Source `b4078d1`.

**236 archive-backing versions, 5 draws each, byte-identical as-of evidence,
prior-free:**

| | |
| --- | --- |
| Unanimous 5/5 | **127 of 236** — so **46% of cycle classifications are not reproducible** |
| Of the 109 that vary — class ↔ `UNKNOWN` | 81 |
| Of the 109 that vary — **direction ↔ direction** | **28** |
| `RED_BACKSIDE` vs `YELLOW_FRONTSIDE_WARNING` | **17 — 7.2% of all versions** |
| `GREEN_FRESH_FRONTSIDE` vs `YELLOW_FRONTSIDE_WARNING` | 11 |
| `GREEN_FRESH_FRONTSIDE` vs `RED_BACKSIDE` | **0** |

**Read this as a resampling rate, not a production rate.** It is not a
checkpoint-pair figure and must not be quoted as "what a trader sees between
checkpoints" — that depends on how often re-analysis actually runs.

**The 17 are the ones that matter.** Frontside against backside is the
distinction the playbook acts on. On identical evidence the same model returns
one or the other depending on the draw, so **a name really can read as having
turned when nothing about it has.** Measured against a field that is `UNKNOWN` on
75% of 325 stored dossiers — so among versions that *do* commit to a direction,
the rate is correspondingly higher than 7.2%.

**One part of the softening survives and it is load-bearing: the instability is
one step on the scale, never end to end.** Nothing goes `GREEN_FRESH_FRONTSIDE`
straight to `RED_BACKSIDE`. The scale is ordinal and the model resolves it to
±1 step, which means **displaying a single point on it asserts more precision
than exists.**

### The two failures need different answers, and only one is Design's

**The 81 (class ↔ `UNKNOWN`) — solved, and the earlier treatment stands.**
Losing a cycle classification renders as **the desk losing confidence, never as a
cycle change.** The product already separates `NOT YET ANALYZED` from `UNKNOWN`;
this needs the same care between *unknown* and *changed*.

**The 28 (direction ↔ direction) — not solvable in the UI, and Design should say
so rather than invent a plaster.** The failure is a *confident wrong direction*.
No display treatment distinguishes a real turn from a resampling artefact,
because the artefact is indistinguishable by construction. The fingerprint gate
helps but is not sufficient: it suppresses a flip with no evidence change, and
says nothing about a re-analysis that both saw new evidence *and* flipped on the
draw.

**Design's requirement, handed to Research: the desk should not display a
direction the model cannot reproduce.** The mechanism is theirs — repeat draws
and commit only on agreement, degrading to `UNKNOWN` otherwise — and so is the
cost, since it multiplies calls on a thread that already fights its token
budget. Design states the requirement and does not choose the sampling policy.

**Until then, the row leads with arithmetic.** Position against the recent cycle
high is deterministic — `lib/data/cycleLevels.ts` already computes a giveback
only from an affirmatively current-cycle high — while the cycle badge is a
verdict that is 46% irreproducible. **This is the fourth independent application
of the same rule: where a deterministic fact and a model verdict say the same
thing, the row shows the fact.**

**And structure is worse than cycle, not better.** The same run puts
`structureClassification` at **45% unanimous, 84% mean agreement — the least
reproducible of the three fields the desk displays.** Every argument above
applies to it at least as strongly.

The fingerprint gate covers the rail for all three fields regardless.

### Two numbers about this field, and only one is a noise figure

Recorded because two measurements of `structureClassification` arrived an hour
apart from different threads, and they are not comparable.

| Source | Figure | What it measures |
| --- | --- | --- |
| Research — **236 versions, 5 draws** | **45% unanimous, 84% mean agreement** | Reproducibility on **byte-identical** evidence. **This is the noise figure to cite.** |
| Research — 6 names, 4 runs | 3 of 6 | Same thing, underpowered. Superseded by the row above; itself a revision of an earlier 2 of 6 off two runs. |
| R&D | 29 of 56 | Structure moves across **version changes** in the stored record |

**Three figures, one field, three instruments.** Cite the 236-version row. The
six-name figure moved twice in a day (2 → 3 of 6) purely by adding runs, which is
what an underpowered instrument does. **R&D's 52% is not a competing estimate of
noise and must never be quoted as one** — R&D said so explicitly.

**None of the three is a production rate.** All measure resampling or stored
version-to-version movement. What a trader actually sees between two checkpoints
depends on how often re-analysis runs, and nobody has measured that.

**R&D's supporting inference is weaker than when it was written**, and that is
worth carrying rather than dropping. The argument that the 29 are dominated by
*real* evidence change rested on catalyst having moved on the same 29 while
catalyst was stable on fixed evidence. Catalyst is now 2 of 6 unstable, so
"catalyst also moved" is no longer strong evidence that the evidence itself
changed. **The archive-clean conclusion is unaffected** — it rests on the zero
row (0 structure moves across 1,192 same-version pairs), which stands on its own
and needs no assumption about catalyst.

**Base rate, which is what makes the noise figure matter.** Structure takes three
values across 1,459 non-null rows: `CAUTION` 871, `UNKNOWN` 365, `DIRTY_FLOAT`
223. The mode is 60% of the mass. Against a three-value field with that little
resolution, a 1-in-3 flip rate is **large**, not marginal — which is the
quantitative case for the rule already adopted above: **where a deterministic
fact and a model verdict say the same thing, the row shows the fact.**

## Cycle becomes arithmetic — and needs six trader-facing words

The desk owner's call, routed 2026-08-23: `lib/market/cycle.ts` computes the
cycle from daily bars and the model's version is **deleted**, not kept alongside.
The evidence is the reproducibility run — 75% `UNKNOWN` in production, 46%
irreproducible across five draws, and on every disagreement where both committed
the arithmetic won **8–0 with 1 unclear**. MYSZ was labelled
`YELLOW_FRONTSIDE_WARNING` while it had retraced 177% and sat 54 sessions past
its high.

The six `CyclePhase` values are engine names. This is exactly the class the first
working rule rejects — `LATCH` was removed for being pipeline vocabulary — so
each needs a word in the language of the stock.

| Engine | What it means | **Proposed** | Why |
| --- | --- | --- | --- |
| `DAY_ONE` | Start day is today | **`DAY 1`** | Already trader-native. Carries more than "moving now": day one means no overhead from a prior run — the setup he wants. |
| `FRONTSIDE` | Still making the cycle high, >1 session in | **`FRONTSIDE`** | Genuine trader vocabulary, not engine vocabulary. The old defect was `YELLOW_FRONTSIDE_WARNING` — colour and verdict baked into an enum — not the word. |
| `PULLBACK` | Off the high, <half the move given back | **`OFF HIGH`** | **Must be renamed. See below.** |
| `BACKSIDE` | Half the move or more given back, still in play | **`BACKSIDE`** | Trader vocabulary and the state he acts on. Keep. |
| `SHADOW` | Move over, volume normal, old high overhead | **`PRIOR RUN`** | See below. |
| `NO_CYCLE` | No qualifying start day | **`NO RUN`** | An absence, not a judgement. Must not read as a verdict, and must stay distinct from `NOT YET ANALYZED` and `UNKNOWN`. |

**`PULLBACK` is not a naming preference — it is a collision, and a dangerous
one.** In this trader's playbook *pullback* means the micro pullback on rising
volume that is his **entry trigger**. As a cycle phase it means a multi-session
position in the arc. Same word, two meanings, one of which says *buy* and the
other says *context*. That is worse than jargon: jargon is opaque, this is
confidently misread. **`OFF HIGH`** is factual, pairs with the retracement figure
beside it, and cannot be mistaken for a signal.

**`SHADOW` is the hardest and the proposal is the least certain.** The state
carries two facts — the name is not in play *and* its old high is still
resistance — and a badge can only say one. `SHADOW` is evocative but coined; no
trader would read it cold. **`PRIOR RUN`** is chosen because it is already this
desk's vocabulary (the Sheet's `Prior Runner` column), it puts the move in the
past, and "run" implies the high that is still overhead. It leads with the
trade-relevant half; the arithmetic beside it — sessions since high, advance —
supplies the rest. The alternative put to the owner was `FADED`, which says the
volume half better and the resistance half worse. **He chose `PRIOR RUN`,
2026-08-23 — settled.** All six words are now decided; none is a proposal.

### Three consequences, and the first is a simplification

**1. The fingerprint gate drops cycle — and the carve-out is earned this time.**
Same bars, same answer, with a test asserting 25 runs return one result. There is
no model re-read to suppress, so `CYCLE_CHANGED` on the board will mean **the
tape changed** — a property it never had. The gate still applies to catalyst and
structure, and structure is now the worst of the three at 45% unanimous / 84%
mean agreement. **This is the distinction Design drew earlier and it holds:** the
withdrawn catalyst carve-out was bought with a stability number that then moved;
this one is bought with determinism, which cannot.

**2. Any giveback shown must be retracement of the MOVE, never distance below the
high.** `CycleArc` carries both, and they diverge badly at ordinary prices: a
name based at $1.00 that ran to $1.20 has given back half its **move** at $1.10,
while half-below-the-high is $0.60. `givebackPct` at $1.10 reads **8%** while
`retracementPct` reads **50%**. **The below-high number reads reassuringly small
on exactly the names that have broken**, so it must not be the one on screen.
`retracementPct` is also what decides the phase, so showing it keeps the number
and the badge consistent.

Note the current surface has the wrong one: `flushFromHighPct` (`rows.ts:296`,
`:361`) is a *from-high* measure and it is **Sheet-sourced**, so it retires with
the Sheet. The arithmetic replaces it with the correct measure rather than
merely a derived one.

**3. New material for the row, none of which existed before.** `CycleArc` gives
`startDate`, `cycleHigh` + `cycleHighDate`, `sessionsSinceHigh`,
`retracementPct`, `advancePct`, `recentRvol`. The model established a
`currentCycleHigh` on **40 of 325** dossiers; this has one whenever a cycle
exists at all. So a row can show **why** a name is backside rather than only
that it is — `BACKSIDE · −62% of move · 9 sessions` — which is what §9 item 12
wanted and could not have. It also further vindicates the standing rule: the
badge is now arithmetic *and* the number beside it is arithmetic, so cycle stops
being a verdict at all.

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
| 12 | **Constrained** — only evidence-gated changes earn a rail line | **Ready**, still L |
| 13 | Clarified, not shrunk | **Ready**, still M |
| 14 | Cycle merge shrinks; build the Sheet half as a removable slice | **Ready**, still L |
| 15 | **Reduction only** — independence disproven, never promote conflict | **Direction decided**, not built in Phase 2 |
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
   distinguishable from `FLOAT UNKNOWN` on one. Supply overhang is knowable when
   float is not, which is part of why the chip now leads with magnitude.

**The chip's wording is settled, and settling it found a defect in the number.**
Full reasoning sits beside audit §11 item 3; the short form:

| Ledger status | Chip | Counted |
| --- | --- | --- |
| `POSSIBLY_ACTIVE` | `8M FREE TO SELL` | yes |
| `KNOWN_ACTIVE` | `8M SELLING` | yes — earned only here |
| `NOT_YET_ACTIVE` | **no chip** | **no** |
| `UNKNOWN` | `8M SUPPLY ?` | yes |

`NOT_YET_ACTIVE` is excluded because it cannot reach the tape inside a
seconds-long hold, so under the one-saturated-element rule it would crowd out a
risk that can. It stays in the drawer's Structure tab; the moment it *stops*
being locked, that transition is a Changes rail event (item 12). The event is
the signal, not the state.

**Defect, owned here by the owner's decision:** `knownSupplyShares`
(`lib/dashboard/risk.ts:78`) sums every block with a share count and applies
**no status filter**, so a name with 30 M locked and 8 M free renders `38M` and
calls all of it overhead. **The magnitude on screen today is inflated**, under
the existing `SUPPLY OVERHEAD` label as much as any new one. Correctness bug in
the number, not the label — kept inside item 17 so the filter and the wording
are fixed together rather than by two threads touching one number.

**Not verified:** whether any live name carries `NOT_YET_ACTIVE` blocks, so the
practical size of the inflation is unknown. Needs the live desk.

**Unblocked and startable now:** 16a, then 12, 18, 19 — none touch the Sheet.

## Working rules

- **Terminology is trader-facing.** Labels that describe engine internals get
  rejected — `LATCH` was removed for exactly this. Say it in the language of the
  stock, not the pipeline.
- **Verify on the live desk**, not fixtures. The one Phase 1 defect that reached
  production was invisible to local fixtures.
- **And verify it *after* the deploy, not only before.** Added 2026-08-23 with
  the shared rule in `README.md` (`abf38e1`), after the trader asked why Design
  would not be looking at its own work. It could not — a change cannot be checked
  on production before it is on production — and nothing sent it back afterwards.
  **Ops confirms the deploy; Design confirms the behaviour.** A change is not
  finished at the handoff. It is finished when this thread has looked at the real
  board.
- **Check a review link by content, never by status code.** A revoked, expired
  or invalid token returns **200 with an error page**, not 401 or 404 — found by
  Ops, recorded 2026-08-23. A valid session is ~535 KB with `RVOL` present; a
  dead one is ~9.5 KB with zero occurrences. So a link that dies mid-verification
  gives no signal in the status, and a "page loaded" check would pass against a
  desk that is correctly withholding everything. Verify the payload is the desk
  before trusting anything read from it. `lib/review/` is Ops's.
- **Design cannot authenticate to the live desk, and that is a standing limit on
  the rule above.** The desk is behind Basic Auth and returns `401`; entering a
  password into a field is not something this thread does, on any
  infrastructure, with any authorization. **So live verification needs the owner
  to authenticate the browser first**, after which Design can drive and report.
  Recorded here because the rule was written without it and would otherwise look
  like a lapse the first time it is not met.
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
