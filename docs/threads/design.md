# Thread: Design & Frontend

**Model, and why it is recorded here.** Added 2026-09-04 so the choice is
explicit rather than drifting. **The honest state of the evidence: there is
none yet supporting differentiation.** Every thread on 2026-09-04 caught a
subtle defect in its own work that a weaker model plausibly misses, and the
capacity actually burned that night was message VOLUME, not model strength.
**A downgrade recorded as a saving without a measurement would be this desk's
"constant dressed as a measurement".** What would settle it: run a thread's
next self-contained task at a smaller model and compare what it catches.

**Model: Opus 5.** On 2026-09-04 it found its own new test was vacuous, because a fixture accepted a key it does not have and the assertion could not fail; and it refused to call a string absent when the component rendering it never mounted.

**Owns the trader-facing surface.** The audit remediation plan, the Discovery
board, the watchlist, the dossier drawer, and the visual system.

Last worked: **2026-09-03**.

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
- Meeting §10's acceptance criteria — measured at the **1,280 px baseline** and
  re-checked at the **1,024 px floor**. *(This line read "1,022 × 551 CSS px, the
  viewport actually used" until 2026-08-23. That viewport was accidental, not
  chosen, and §11 item 4 retired it — see the breakpoint table below.)*

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

## Incoming — the 65-field survival audit, and what it does to item 17

The owner is retiring the ChatGPT tasks (`9437928`). Tasks 3 and 4 stop; **tasks
1 and 2 cannot, because task 1 is the sole writer of `TODAY!A:S` where float is
column I** — the workflow being retired is what keeps pillar 5 on the board. So
Phase C, the SEC-derived float, is the critical path.

**Design annotates which of the 65 fields must survive on screen.** Research
produces the inventory, R&D annotates what the archive needs, and this thread is
the only one that can say what a trader would miss. **The failure mode is not a
field nobody wanted being dropped — it is one dropped for looking machine-ish in
an inventory when it was answering a question on the board.** Annotations go
through Integration, not into `research.md`: one table, three annotators.

**Method when it arrives:** annotate against §2's workflow phases — Sweep,
Triage, Investigate, Verify, Monitor, Prepare. A field survives if it answers a
question in one of them. "Looks useful" is not a phase.

### What a refused float looks like on a row

Research is deriving float from filings and will emit **three states, not one
number**: a value; a **refusal with a reason** (impossible, unit mismatch,
derivative inheriting its underlying); and genuinely absent. `research.md` item
14, `161f15f`.

**The scale of the problem is the part that reframes it.** Across 58 hand-pulled
names, **float exceeds shares outstanding on one name in six**. On ADRs a
unit-mismatch test fires on 8 of 11. STKH reported a float of **3.86 billion
against 915 million shares out**. F-19's contradiction is a symptom of that, not
a presentation inconsistency.

> **Corrected 2026-08-24 (`9b1b16b`).** An earlier version of this section called
> that *"arithmetically impossible"*, taking the phrase from Integration, which
> has since withdrawn it. It overstates. **Same source, same instant** — which is
> what the Scanz pull measured — proves the **vendor contradicts itself** and one
> of its two numbers is wrong; that finding stands. **Across sources with
> different as-of dates** it proves nothing without the dates, because a company
> that has issued shares since its last filing legitimately exceeds the filed
> count. So: **inconsistent, and sometimes merely unverifiable** — not impossible
> as a fact about the company.

**A refusal is a finding, and must not render as an absence.** *"We looked and
this number is wrong"* and *"we do not have it"* are different statements and
only the first is intelligence. This is the third instance of a distinction the
product already makes twice — `NOT YET ANALYZED` against `UNKNOWN`, and *unknown*
against *changed* for cycle — and the most consequential, because float is a
pillar.

**The refusal side then splits, and there are four states rather than three.**
Research measured the filed share count across 209 issuers: **39% are over 180
days old, median 82, oldest 3,065.** So the check cannot refuse on a stale
denominator — it has to say it cannot tell.

| State | Row reads | Means |
| --- | --- | --- |
| value, verified | the figure | a float the desk stands behind |
| **value, unverifiable** | **the figure + `filed 82d ago`** | the number may be right; the count to check it against is too old |
| **contradicted** | **`FLOAT WRONG`**, figure suppressed to the drawer | the source disagrees with itself at one instant |
| absent | `FLOAT UNKNOWN` *(existing)* | no float on file |

**"Cannot tell" keeps the number and qualifies it with the age of the
denominator, rather than becoming a fourth state word.** Two reasons. `FLOAT
UNVERIFIED` beside `FLOAT UNKNOWN` is two long words differing in their second
half, at 11 px, in a 150 px cell — scannable in a spec, not down a column. And
the freshness scale in §8 already exists for exactly this: every other stale
thing on the desk carries an age, so this one should too instead of inventing a
parallel vocabulary.

**Why `WRONG` suppresses the figure and `unverifiable` does not.** A contradicted
number is demonstrably not usable, so showing it invites use. An unverified one
may well be correct — withholding it would hide a fact the desk has, and the
trader can weigh a number whose provenance is dated.

**The direction of the staleness is why this distinction is not cosmetic.** A
filed count goes stale fastest on the names that have issued the most shares
since filing — **so "cannot verify" fires hardest on the names that dilute
hardest.** Render that as `FLOAT WRONG` and the highest-supply-risk names get
flagged as defective data and disappear. The age qualifier does real work here: a
long-stale denominator sitting next to a supply overhang is exactly the pairing
worth seeing.

**It must not be read the other way either.** "Cannot verify" is not evidence of
dilution, and the design must not imply it is — that would convert an absence
into a claim, which is the same discipline that keeps registered resale capacity
from being restated as selling.

**`FLOAT WRONG` over the alternatives, for one reason each.** Not `BAD FLOAT` —
it would be read as `DIRTY FLOAT`, a real and different concept this product
already carries, and a collision between "dilution overhang" and "the number is
untrue" is the worst possible confusion in this field. Not `FLOAT REJECTED` —
that describes what the pipeline did, not what is true of the stock. *Wrong* is
what a trader would say, and the reason line carries the arithmetic:
`reported 3.86B against 915M shares out`.

**Why this is worth more than the number would have been.** The vendor float is
the one every screener shows — so when it is impossible, *the crowd's read of
that name is built on a number that cannot be true*. A low-float thesis on such a
name is unfounded, and the desk is the only place saying so. That is a stronger
claim than a corrected figure, and it should not be buried in a qualifier.

**Two consequences in code already written.**

1. **The sort's `n unknown` count becomes ambiguous.** `discoveryMissingCount`
   (`view.ts`) counts nulls, and under three states a refusal and an absence
   would collapse into one number. That reintroduces the exact failure the count
   exists to prevent — absence implied rather than stated. It needs to separate
   them, or say the weaker thing honestly.
2. **The `Risk` chip must not let a refusal read as a small float.** It already
   must not assume a float number exists; now it must also not treat a refused
   one as zero, missing, or tight.

### A stale cycle: measured against the last COMPLETED session, not today

`CycleHistory.asOfTradingDate` (Research, `163ef90`) says which session a cycle
was resolved through. `ecb7a74` made `readDailyBars` hide unfinished bars — right
call, since a running high and a part-day volume are worse than being one session
behind — but it moved the silence from the data to the timestamp: a cycle through
Friday and one through Thursday were the same object at every consumer.
**133 symbols carry a stale tail**, and the eight stranded recap jobs among them
will never self-heal because nothing will re-analyse them.

Research deliberately shipped a **date, not a flag**, and left the trader-facing
string to Design. Here it is.

**The trap first, because it is subtler than the one Ops already found.**
`latestDate` reads clean on stale names, so anything keyed on *"latestDate equals
the current trading date"* passes them — Ops established that. **But keying on
`asOfTradingDate == today` is wrong too, and wrong in the opposite direction.**
At premarket every cycle is as-of the previous session, because today's bar does
not exist yet. That test would mark **the entire board** stale every morning,
which is the `warning`-on-every-row failure in a new costume.

**The reference is the most recent COMPLETED session.** As-of Friday at Monday
premarket is *current*. As-of Thursday is *stale*. The unit is **sessions**,
because the input is daily bars — not hours, and not the `live · 12m · 3h` scale,
which measures tape and would be a category error here.

| Condition | Row reads |
| --- | --- |
| as-of = last completed session | `BACKSIDE` — **no qualifier at all** |
| older | `BACKSIDE · thru Thu` |
| no cycle resolved | existing `CYCLE NOT ESTABLISHED` |

**Silent when current, explicit when not** — the same shape as the `stale` price
chip and the `n unknown` count, and it keeps the one-saturated-element budget
intact on the ordinary row.

**The as-of belongs in the tooltip on EVERY row, current or not.** That is the
intelligence-platform position: the qualifier fires only when it matters, but the
story is always available. It costs nothing and answers *"which question did you
answer?"* without the trader having to suspect anything first.

**Not proposed: a staleness threshold.** Research's reason for shipping a date
was that tolerance differs at 07:00 and 16:00. Design should not immediately
re-collapse that into a boolean by picking a number — the row shows how many
sessions behind, and the trader decides. **Two sessions behind on a name he is
about to size is his call, not a constant in this file.**

## The Graveyard — commissioned 2026-09-03

The desk is adding a continuing board-presence condition: a name dead for five
consecutive minutes leaves the active board. Dead is minute **trade count**
(active ~300/min, dead = active ÷ 10). Research determines and exposes
(`activityState`, `deadSince`); **the surface is Design's.** His one constraint:
**not in the main view with active names.**

**Why it exists at all:** today unranked means invisible — a dropped name
vanishes and cannot be told from one that was never there. He rejected that as
the inverse of intelligence-not-signal.

**Three structural facts that drive every decision below.**

1. **RVOL is cumulative and never decays**, so a revived name returns
   **instantly at its old rank** — the numerator was frozen, not lost.
2. **A dead minute produces no bar at all**, so absence is the signal.
3. **33% of dead-5-minute names see activity return, but only 7% come back at
   +25% or better** (n=17, premarket). Every rate is a **floor**, because minute
   grain cannot see a sub-minute revival.

### OPEN: is the active line the right floor, or the dead line?

**Shipped at the ACTIVE line (`b560aa4`) and not settled.** Recorded here because
it currently exists only in a cross-thread exchange, and an open question nobody
holds is one nobody answers.

**Why it shipped that way, honestly stated: it was a LABEL argument, not a
substantive one.** The header already read `never active`, so the dead-line
filter was listing names it simultaneously described as never active. That
forced label and filter to agree — but the label could equally have changed. It
settled an inconsistency, not the threshold.

**The argument for the dead line, which has more force than Design first gave
it.** A name peaking at 50 trades/min never reached the bar he trades at, but it
*did* transition from not-dead to dead. Filtering at 300 hides that death.

**And the fact that decides it has not been measured: board presence is RVOL
RANK, not trade count.** A name can be ranked, on his board, and trading well
under 300/min. **If that is common, filtering at the active line hides exactly
the drops this surface exists to surface** — names he was watching that vanished.

**The question, for R&D or Research from the archive:** *among names the rule
kills, does peak trades/min track RVOL rank?* The first live reading cannot
answer it — zero of 71 dead names were in the top 50, and rank was not recorded
against peak before the token was revoked.

**If board-ranked names routinely peak under 300, revert to the dead line and
change the header label to match.** Both thresholds are documented against each
other in `lib/dashboard/graveyard.ts` so the reversal is a one-line change with
its reasoning already beside it.

### Pre-registered: how the graveyard reading will be read

**Written before `6518e72` deploys and before any reading exists.** The
three-outcome protocol further down was written for the risk chip; these
outcomes are different and need saying first.

**It is TWO readings, not one, and they must not be run together.**

**Stage 1 — does the surface work?** That is a question about Design's code.

| | Reading |
| --- | --- |
| **Not wired** | Header says `not recording yet`. Already happened once, on 2026-09-03, and was correct — 328 names were dead in the store while `toDemandState` never mapped the field. |
| **Wired, no rows** | Nothing has gone quiet. Honest and uninformative. |
| **Wired, rows** | The surface works. **Integration expects this**, since 328 names were DEAD after the bell — so the null everyone originally expected is now the least likely. |
| **Negative** | Any of: a row whose `activity` is undefined appears at all; elapsed reads under the six-minute settle window; a still-dead name marked `running`; a rank-less row rendered as broken rather than as `—`. |

**Stage 2 — is the DROP RULE right?** Only readable once stage 1 says *wired,
rows*. **A finding about the rule read off an unverified surface would be a
finding about the surface.**

- **`died 2+` climbing** → churn; the threshold or the settle window is too tight.
- **`running` non-zero** → a miss; the drop cost a trade.
- **Both zero across a populated graveyard** → the rule is doing its job, and
  that is a genuine result rather than an absence.

**Expect most rows to carry no rank.** `deadAtRank` is captured at the flip and
only ~250 of ~8,800 names are ranked at any instant, so a rank-less row is the
**common case, not a gap**. Ops nearly filed that as a capture failure. It
renders `—`.

**And `running` will read zero tonight for a reason that is not the rule.** The
`ACTIVE` threshold is 300 trades/min, calibrated on RTH and read after the bell,
so nothing can revive. **A zero there is uninformative until RTH** and must not
be reported as evidence the rule is sound.

### The decision that matters most: revived rows STAY, marked

The graveyard is **the rule's own falsification surface**. Getting that right is
worth more than every other choice in it.

**So a revived name does not silently leave.** It stays for the session, marked
revived, with the time it came back. **The graveyard's own composition then
becomes the evidence**, and the header carries it as a live count:

    GRAVEYARD · 14 dead · 4 revived · 1 ran

**He never has to open it.** If that middle number runs at half the rows, the
threshold is wrong and he sees it without counting anything. **A check that can
fail, rendered as chrome.**

**And `revived` alone would overstate the error five-fold — which is why there
are two numbers, not one.** 33% see activity return; only 7% return at +25%+. A
name that twitches back at +2% was **correctly dropped**. **The rule is wrong
only when dropped names come back and RUN**, so `ran` is the falsifying count and
`revived` is context for it. A single "revived" tally would have read as a 33%
miss rate against a real one nearer 7%.

### Where it lives, and why not the rail

**Below the researched names, collapsed by default, count in the header.** Not
the §6 Changes rail: **the rail is for events — things that happened; the
graveyard is a population — things that are.** Merging them costs the rail its
one job.

Collapsed-with-a-count is what makes it free: the falsification signal is in the
header, so the section earns its place without ever being opened.

### The row

The question a graveyard row answers is **not** *what died* — a memorial is
useless. It is **"if this comes back, does it matter?"**

| Field | Why |
| --- | --- |
| Ticker | — |
| **Dead for** | Decays in relevance; the primary sort key. |
| **Rank held** (`deadAtRank`) | How high it got. **Corrected below — it is NOT where it re-enters.** Captured at the flip and unrecoverable later. |
| **What it did** | Peak move while alive. The "was it worth anything" axis. |
| **Revived at** | Time, and whether it ran. Present only once revived. |

**CORRECTED 2026-09-03: `deadAtRank` is not a prediction of re-entry.** An
earlier version of this section said RVOL is frozen so *"a name that died at rank
3 returns at rank 3."* **Wrong.** The dead name's numerator is frozen — but every
*living* name keeps accumulating past it, so **the dead name's rank decays while
it is dead**, and the longer it lies there the lower it re-enters. `deadAtRank`
records **how high it got**, not where it comes back.

That is worth more than the mistaken version, because the drift is itself
information: **a long-dead name returning is returning weaker**, and the gap
between `deadAtRank` and its live rank on revival measures how much the field
moved on without it.

### The contract, and what `deathCount` changes

Research built and exposed it (`6e18c83`, inert, live-only): `activity`,
`deadSince`, `deadAtRank`, `deadAtPeakTrades`, `deathCount`.

**`deathCount` is better than the header's `revived` count and replaces it as the
primary signal.** A row reading **"died 4 times today"** is the finding itself —
it names *which* name the threshold is wrong for, where a population count only
says *some*. And you can only die twice by reviving in between, so `deathCount`
encodes the same events with identity attached.

**But `ran` survives, because the two falsify different things and want different
fixes:**

| Signal | What is wrong | The fix it argues for |
| --- | --- | --- |
| **`deathCount` high** | **Churn** — the name is being killed and revived repeatedly | The dead threshold or the settle window is too tight |
| **revived AND ran** | **A miss** — the drop cost a trade | The rule is wrong for that class of name |

A name that died four times and never ran on any revival was **correctly dropped
each time** — irritating, not expensive. A name that died once and came back +40%
is the costly one. **Collapsing them into a single "the rule is wrong" number
would hide which of the two is happening.**

### `dead_at_price` overwrites on each death — keep it that way

Research added it (`c93f321`), captured at the same flip as `deadAtRank`, so the
**revived-and-ran** miss signal is computable. It is **overwritten on each
death**, so it measures from the *latest* death only. Design's call: **keep the
overwrite, add no cumulative field.**

**The cost is real and is accepted rather than waved off.** Overwrite understates
misses, and understates them **specifically on the churniest names** — a name
with `deathCount` 5 that ran after revival 2 and is quiet on revival 5 shows
`ran: 0`, and those are exactly the names the rule is most wrong about. **Same
shape as `CANNOT_VERIFY` firing hardest on the heaviest diluters: the measurement
is weakest where the failure concentrates.**

Three reasons it stays, in ascending order:

1. **Two questions, two homes.** *"Is this name running now after we dropped
   it"* is live and belongs on the board. *"How often was the rule wrong today"*
   is an archive question, and `desk_assessments` answers it better than a header
   ever will.
2. **A session tally contradicts a decision already made here.** The graveyard
   clears at session end because its central promise expires. A cumulative count
   would outlive the surface carrying it.
3. **A cumulative count would force the ENGINE to decide what "ran" means.** To
   increment at death it must evaluate the prior revival against a threshold —
   R&D's +25%, presumably — which then freezes in a column and changes only by
   migration. **Overwrite keeps `dead_at_price` a fact and leaves "did that count
   as a run" a judgement made by the surface**, where it can change when he
   changes his mind about what a run is.

> **A stored fact plus a surface judgement beats a stored judgement.** This desk
> has already paid for the alternative: the model's cycle classification was a
> stored judgement, and replacing it cost a cutover, a schema deletion, and
> thirteen days of a masked risk chip.

**So the header says what it means and no more.** The count is **"running now,
after a drop"** — not *"misses this session"*. The session-long miss rate is
R&D's, from the archive, rather than a number invented in chrome.

**Owed, and easy to lose between threads:** the surface does **not** consume
`dead_at_price` yet. Research shipping the column does not make the count appear
— that is a further small Design change, and it is exactly the seam that goes
missing between *the data shipped* and *the number is on screen*.

### Two things the surface must not paper over

**`undefined` and `'UNKNOWN'` are different, and a row whose `activity` is
`undefined` MUST NOT APPEAR IN THE GRAVEYARD AT ALL.** `undefined` means the
field did not survive a store round-trip — nobody asked. `UNKNOWN` means the
engine looked and could not say. Only the second is a measurement. Rendering them
alike would show *"status unknown"* where the truth is *"we never asked"*.

**This is the sixth instance of one distinction on this desk** — after
`NOT YET ANALYZED` vs `UNKNOWN`, *unknown* vs *changed* for cycle, *wrong* vs
*absent* for float, *cannot tell* as its own state, and a bound as a sixth
position. **It keeps arriving because it keeps being the thing that matters**,
and it should be checked for on every new field rather than rediscovered.

**Elapsed time shows from `deadSince`, never from detection.** The rule decides at
six minutes for a five-minute death, so a row **appears already reading "dead
6m"** and never "dead 0m". That looks like an off-by-one and is not: the minute
is real and Research asks it not be hidden. **Recorded here so nobody later
"fixes" it into a lie.**

### Ordering and lifetime

**Default: most recently dead first.** Revival probability decays with time dead,
so recency is the actionable order — a name dead six minutes is a candidate, one
dead three hours is history. **Second key: rank held**, which is the "does it
matter" axis. Reuse the Discovery sort control rather than inventing a second
mechanism.

**It clears at session end, and not arbitrarily.** RVOL resets between sessions,
so `rank held` stops predicting where a name re-enters — **the row's central
promise expires**, and a surface that outlives its own claim is the thing this
thread keeps removing. The record persists in the archive; the surface does not.

### Revival must announce itself on the main board too

A name silently reappearing among active names is the same information loss he
just rejected, inverted. **The revival is a Changes rail event** (§9 item 12) —
`SUIG revived · dead 14m · back at rank 4` — which is exactly what the rail is
for and avoids inventing a second notification path.

**Open, and not Design's to answer alone:** whether the displayed revival rate
should be labelled a floor. It is one, by Research's own statement. Showing
`4 revived` without that caveat slightly understates; a caveat in the header
costs space on a number whose job is to be glanced at. Leaning toward the caveat
living in hover or the drawer rather than the header.

### Pre-registered: how the `d8794da` verification will be read

**Written before the deploy and before any reading exists**, so the reading
cannot be interpreted to suit it. `d8794da` is aboard window 2 (`97f5fbd`).

**A null is NOT a failed fix, and on a small board it is the likely outcome.**
`resolveRisk` returns at the first matching branch, so a researched row only
reaches `CAUTION` or `CLEAN` if it is neither dirty nor carrying supply shares.
On 2026-08-25 all four researched rows were `DIRTY FLOAT` — they short-circuited
two branches early, which is exactly why the sizing done from them was wrong.
**The same board would produce a null today with the fix working perfectly.**

| Outcome | Reading |
| --- | --- |
| **Positive** | `STRUCTURE CAUTION` or `NO FLAG FOUND` on any researched row. Both unreachable before `d8794da`, so either evidences the fix. `NO FLAG FOUND` is the stronger — the only `tone: 'pos'` outcome in the function; `CAUTION` the likelier, at 54% of dossiers. |
| **Null** | Every researched row renders `DIRTY FLOAT` or `SUPPLY OVERHEAD`. **Evidences nothing in either direction.** Report the row count and the branch each row took, so the null is legible rather than merely absent. |
| **Negative** | A row that is not dirty, carries no supply, and still renders `FLOAT UNKNOWN`. That falsifies the fix. |

**Report which of the three, with counts — not a verdict word.**

**A FOURTH outcome, added 2026-09-03 after it occurred.** All three above
presuppose the measurement *arriving*. The fourth is **the surface correctly
reporting it has none** — which is what the graveyard did on its first live
exercise, while 328 names were dead in the store. The state was designed for and
simply not enumerated as a reading: **the code was ahead of the protocol.** Any
pre-registration over a new field needs it, because "the measurement did not
reach me" is neither a pass nor a fail.

**Composition:** both positive strings come from the gate change alone. The Q9
`sheet_float` capture reads a different key and is **not** aboard this bundle, so
the reading cannot borrow credit from it. Were it aboard, a positive could not be
attributed to either piece.

### READING, 2026-09-03 on `97f5fbd`: **NULL** — six rows, none reached the branch

Ran as pre-registered. Six Discovery rows, no researched-names table rendered.
**Every row short-circuited before `CAUTION` / `CLEAN`, so the reading evidences
nothing in either direction.**

| Ticker | dossier class | float null | supply | sheet state | chip | branch |
| --- | --- | --- | --- | --- | --- | --- |
| TLYS | CAUTION | yes | **yes** | CLEAN | SUPPLY OVERHEAD | `:161` supply |
| CHPT | **CAUTION** | yes | no | **DIRTY_FLOAT** | DIRTY FLOAT | `:145` sheet-dirty |
| INDO | **CAUTION** | yes | no | **DIRTY_FLOAT** | DIRTY FLOAT | `:145` sheet-dirty |
| GPRO | UNKNOWN | yes | no | **UNKNOWN_STRUCTURE** | FLOAT UNKNOWN | `:176` — **the surviving Sheet trigger** |
| NCT | *(no dossier)* | — | — | DIRTY_FLOAT | DIRTY FLOAT | `:145` sheet-dirty |
| BRNX | UNKNOWN | yes | yes | DIRTY_FLOAT | DIRTY FLOAT | `:145` sheet-dirty |

**GPRO is NOT the negative outcome, and it was the one to check rather than
assume.** Negative required *not dirty, no supply, and still `FLOAT UNKNOWN`*.
GPRO meets the first two — but its Sheet state is `UNKNOWN_STRUCTURE`, which is
the condition `d8794da` deliberately **kept**. The chip is correct.

**CHPT and INDO are the fix working and still invisible.** Both are dossier
`CAUTION` with no supply — they would render `STRUCTURE CAUTION` today were the
Sheet not saying `DIRTY_FLOAT` first. **That is the 08-25 mechanism confirmed a
second time: the defect was hidden behind the Sheet, and so is the repair.** Two
of six rows are queued to change the day the Sheet's structure state retires, and
nothing about that transition will announce it.

**So the fix is unfalsified rather than confirmed.** A positive needs a board
carrying a researched row that is neither dirty nor supply-bearing, and this
board had none. That is not a defect in the fix or in the reading — it is what
the pre-registration said would happen on a board of dirty floats.

### CORRECTED: the masked chip is LIVE, and my sizing could not have found it

**Design sized this as latent on 2026-08-25 and was wrong.** Ops sized it in
substance (`1e8acd4`) and the defect is live now.

**My error is worth naming precisely, because it is the rule I wrote turned on
me.** I sampled four board rows, found all four rendering `DIRTY FLOAT`, and
concluded the mask was not biting. **Every one of those rows short-circuited at
`:145`, two branches before the one under test.** A sample in which no row can
reach the code being examined cannot report on it — *a check that cannot fail is
not a check*, applied to my own sizing. I then generalised from it to the whole
population.

**What is actually true.** `structure.displayedFloat` has been null on **every
version since id 237, 2026-08-20T16:32Z**. So for any researched row that is not
dirty and carries no supply shares, `resolveRisk` returns `FLOAT_UNKNOWN` at
`:176` and **both `STRUCTURE_CAUTION` (`:187`) and `STRUCTURE_CLEAN` (`:198`) are
dead branches.**

> **`tone: 'pos'` appears exactly ONCE in `risk.ts` — at `:203`, inside
> `STRUCTURE_CLEAN`. So the board has had no way to tell the trader a researched
> name is structurally CLEAN since 2026-08-20.** That is a missing positive
> signal, which is worse than a mislabelled warning: a warning that reads wrong
> gets questioned, and an absent all-clear never gets missed.

**The collision fits in two lines.** `displayedFloat` occurs exactly twice in the
file: `structure.displayedFloat` at `:174`, the **dossier's**, null — and
`row.displayedFloat` at `:201`, the **Sheet's**, populated. **The gate reads one;
the value it gates reads the other.** `STRUCTURE_CLEAN` would have displayed a
real float the whole time; the field that suppresses it is a different field with
the same name. The desk's fifth name collision (`7d5b3ed`), actively suppressing
the board's only positive signal.

**Two independence warnings to carry into any fix:**

- **The Q9 capture column (`sheet_float`) will not unmask this.** `:174` reads
  the dossier key, not the new column. Fixing one will *look* like fixing both
  — R&D's warning and it is the dangerous kind, because the second defect would
  then be believed fixed.
- **`c61c937`'s naming work must not close the collision without noticing the
  dead branches behind it.** Renaming the two floats apart is right and would
  make `:174` and `:201` obviously different — and a rename that leaves the gate
  intact removes the *evidence* while leaving the *defect*.

**Precedence answer stands unchanged, and is independent of why the float went
null.** Even a revived float pipeline leaves the order
`DIRTY → FLOAT_UNKNOWN → CAUTION → CLEAN` to be judged.

### The masked risk chip: latent today, LIVE the day the Sheet retires

R&D's reading (`0d4c46b`) is structurally right: `risk.ts:173` sets
`floatUnknown` when `structure !== null && structure.displayedFloat === null`,
and that is **null on 249 of 249 live versions**, so `FLOAT_UNKNOWN` returns at
`:176` and `STRUCTURE_CAUTION` at `:187` is unreachable on that path. `CAUTION`
is 54% of dossiers.

**Measured on the live desk 2026-08-25, which is the query R&D left for Design.**
Four board rows; every one renders `DIRTY FLOAT`. So **the mask is not what he is
seeing today** — but the reason is the finding:

| Ticker | dossier class | `displayedFloat` | supply | renders |
| --- | --- | --- | --- | --- |
| MIMI | CAUTION | null | yes | DIRTY FLOAT |
| **DAIC** | **CAUTION** | **null** | **no** | **DIRTY FLOAT** |
| WNW | DIRTY_FLOAT | null | yes | DIRTY FLOAT |

**DAIC is the masked case** — CAUTION, null float, no supply — and it renders
`DIRTY FLOAT` only because `:145` also fires on **the Sheet's**
`row.research.structure.state`, which says `DIRTY_FLOAT` while the dossier says
`CAUTION`.

> **So the defect is hidden behind the Sheet, and the Sheet is a migration
> artefact. The day the Sheet's structure state stops arriving, every CAUTION
> name with a null float and no supply shares drops straight through to
> `FLOAT UNKNOWN`.** Latent now, live at retirement, and nothing about that
> transition would announce it.

**Precedence answer: `STRUCTURE CAUTION` wins.**

Both readings on record are true, and the tie-break is which one *varies*.
`FLOAT UNKNOWN` from the dossier condition is true of **every row with a
structure** — 249 of 249. **A chip identical on every row cannot make rejection
cheap, which is the entire job F-05 gives it.** It is the wall-of-amber failure
the audit opened with, in one cell. `CAUTION` is a judgement about *this* name
and it discriminates.

**The general rule, and it is the one to keep:** *when two conditions both hold,
the chip shows the one that distinguishes this row from its neighbours. An
invariant fact belongs in the detail line, never in the row's one saturated
element.*

**Minimal fix, and it is narrower than deleting the branch.** Split the
condition. Keep `row.research?.structure.state === 'UNKNOWN_STRUCTURE'` — the
Sheet's, which genuinely varies. **Drop the `structure.displayedFloat === null`
half until a float source exists**, because it is not reporting a fact about the
stock, only that the desk has no float for anybody. That is Research's item 9
point preserved exactly: `FLOAT UNKNOWN` is the correct answer while there is no
float source, and it is precisely *because* it is correct for everyone that it
cannot be a per-row chip.

**Not shipped.** Sizing and precedence were what was asked. It is a real defect
with a known trigger date rather than an urgent one, and it should land with the
Sheet retirement it is coupled to.

### Full-depth blue sky: render the post-consolidation ceiling, put depth in text

The owner chose full-depth lookback — *"as deep as you can go"* — and Research's
probe found raw depth alone is unusable on serial reverse-splitters. **BTCT's
all-history split-adjusted ceiling is $14,249.94, on a bar that traded four
shares.** The honest post-consolidation ceiling is **$26.58**, about ten times
the current price, against the **$1.80** the 90-session window showed.

**Never render the raw all-history figure as the ceiling.** `$14,249.94` on a
$1.71 stock reads as a broken product, and it would cost the whole ladder its
credibility the way `VERIFIED BLUE SKY` cost this one — same week, same surface.
**A number that is arithmetically correct and obviously absurd is worse than no
number**, because the reader cannot tell which of the two it is.

**Four shares is not a ceiling in the only sense that matters.** A ceiling
matters because *trapped holders* sit above it. Four shares means nobody is
trapped there. `blueSky.ts` already rejects this class for the 90-session window
— bad print, isolated spike (`:164`, `:175`) — and **a full-depth ceiling needs
the same guards, plus a volume floor**, or depth simply buys deeper artefacts.

**Render: `ABOVE PRIOR CEILING $26.58` — the post-consolidation number.** It is
the deepest figure that survives the guards, and it is decision-relevant in a way
neither neighbour is: `$1.80` implies he is near the top of the range, and
`$14,249.94` implies nothing at all. **Ten times overhead is a different trade
from clear sky, and only the middle number says so.**

**Depth goes in the text beside it, per his instruction — and the split factor is
the story, not a footnote.** *"Highest across N sessions since 2019 · after
1-for-50 of consolidation"* explains **why** the deep number is meaningless: the
holders it would have trapped were diluted out of existence. That is exactly the
`float_basis` and `asOfTradingDate` move — the number, its basis, and the fact
that discounts it, in text.

**Both numbers, then — but not as equals.** One is the ceiling; the other is
context for why the ceiling is where it is. Rendering them side by side as two
ceilings would repeat the mistake this section opens with.

### `VERIFIED BLUE SKY` — the word qualifies the ceiling, never the sky

**Reported by the desk owner mid-session, 2026-08-24:** BTCT at $1.71 rendering
`IN VERIFIED BLUE SKY — PRIOR CEILING $1.48`. *"This is not bluesky territory.
This is a major error."* He is right.

**In `lib/market/blueSky.ts`, `verified` means the CEILING is a real traded
level** — it cleared `MIN_SESSIONS`, it is not a bad print, it is not an isolated
spike (`:148–175`). Every guard is about whether $1.48 was genuinely traded.
**None says anything about whether the sky above is clear.** The headline at
`:228` attaches the word to the blue‑sky claim, so a word that honestly qualifies
the ceiling is read as qualifying the absence of overhead supply.

**Why it is a real error and not pedantry.** Blue sky is a claim about *trapped
holders* — nobody overhead who bought higher and wants out at breakeven. It is
the reason the state matters to this trader at all.

**The 90-session cap makes it unfixable by correct operation.**
`DEFAULT_CYCLE_HISTORY_TRADING_DAYS = 90` (`lib/research/history.ts:18`, read at
`readModel.ts:305`). **That is a configuration cap for every symbol, not BTCT's
data edge.** Research's sharpening, kept verbatim: *this is not a case where the
instrument failed to see higher prices — the instrument cannot see past 90
sessions by design, so `VERIFIED` is asserting something no amount of correct
operation could ever establish.*

**Design's item 3 is withdrawn.** It proposed separating *window-bounded* from
*data-bounded* — whether the lookback reached the earliest retained row. Under a
90-session cap **essentially every symbol older than 90 sessions is
data-bounded**, so that split separates new listings from everything else rather
than deep history from shallow. It buys almost nothing.

**So the fix is two things, and the first is the only one that changes his
screen:**

1. **Drop `VERIFIED` from the headline.** One string.
2. **Put the window in the headline, not only the caveat** —
   `ABOVE $1.48 · HIGHEST IN 90 HELD SESSIONS`. With item 3 gone this is the real
   fix rather than a stopgap, because the honest sentence is the same for nearly
   the whole board.

**And the reverse-split point makes it worse than marginal.** Retained history is
already split-adjusted, and a small cap's likely history is a *reverse* split,
which **raises** old prices. If pre-window history exists the true ceiling is
probably far above $1.71 — the claim may be inverted rather than slightly wrong.

### A partial bar's HIGH is legitimate for a ceiling, though its close is not

Research flagged this as a different call from the one it made for cycles and
declined to make it unilaterally. **Design's answer: include it.**

**The two cases are asymmetric and the asymmetry decides it.** For a cycle, a
partial bar distorts `retracementPct`, `advancePct` and `sessionsSinceHigh` — a
running high and a part-day volume make the phase wrong in an **unpredictable
direction**, which is why hiding them was right. For a ceiling the question is
only *has this price traded*, and **a high can only rise during a session, never
fall.** So a partial high is a **lower bound** on the true high, and including it
is conservative in the safe direction: a higher ceiling makes blue sky fire
**less** often.

**Excluding it is anti-conservative and it is exactly the BTCT case** — the
$1.57 high on 2026-08-20 was hidden as partial, dropping the displayed ceiling to
$1.48. A hidden partial high understates a ceiling, and an understated ceiling is
the direction that manufactures a false blue sky.

### `stalledJobs`: the count is not trader-facing, but it exposes a row that IS

Research landed `stalledJobs` (`a3464d8`) — non-terminal jobs from a trading date
other than today — as a **second** number beside `queuedJobs`, and left the view
to Design. `queuedJobs` was reporting `0` against ten stuck jobs and was not
false: `publishHealth` counts `MAX(trading_date)`, and the ten are dated 08-21
and 08-17, so they stopped being counted when the date rolled. **An aged backlog
goes invisible exactly when it has aged.**

**Design's answer, in two halves.**

**The count belongs on diagnostics, not on the board.** This is the F-27 shape
exactly — `hi-res 6`, `q 0 · a 0`, `msg Ns` were moved off the header because
operator counters are noise in a trader's product. *"Ten jobs stalled"* is
something he can do nothing about, and a number he cannot act on is volume rather
than intelligence. The framing licenses **story that is useful**, and the word
*useful* is the limit.

**But its CONSEQUENCE is trader-facing, and it is currently rendered as a lie.**
`resolveDisplayStatus` (`lib/research/view.ts:116`) maps `job.status === 'QUEUED'`
to `ANALYSIS_PENDING` — **with no trading-date check.** So a job stuck QUEUED
since Friday renders `ANALYSIS PENDING`, indistinguishable from one queued thirty
seconds ago.

**That is wrong by tense.** *Pending* means coming. A job from Friday that
nothing will re-run is not coming, and the trader reading `ANALYSIS PENDING` at
07:00 waits for a dossier that will never arrive — on a name he might otherwise
have dismissed or researched himself. **He cannot act on the count; he can very
much act on knowing this row is not going to improve.**

It is the five-states-of-knowing failure again, in the in-flight family:
**"looked, in flight" collapsed with "will never arrive."** A ninth display
status, or a qualifier on the existing one — `ANALYSIS STALLED`, or
`PENDING SINCE FRI` — separates them. Wording not settled; the distinction is.

**What it needs, and this is a handover rather than a claim:** the row-level fix
requires the job's **trading date** to be reachable where `resolveDisplayStatus`
runs. `stalledJobs` is an aggregate and cannot answer *which* rows. Whether that
date is already on the job view is Research's to say.

**One behaviour that supports putting it on the row rather than only in a
health light:** when the heartbeat is stale the projection **overrides**
`stalledJobs` rather than reading the `OFFLINE` literal's zero — Research
asserted the opposite, its test failed, and the code was right. A worker that
died holding ten stuck jobs is exactly when the fact matters. **The field is live
in the state a surface would most want to suppress it**, and so should the row
label be.

### Corrected 2026-08-24: coverage is 7%, and the right name is the true one

Two corrections from Research, before either reached a surface.

**`filedShares` cannot make the float sort meaningful — it is not that
quantity.** It is shares outstanding. *"The float sort starts working"* is not
what Phase C delivers, and this file implied it did.

**Coverage tracks RANK, steeply, because `SEC_COMPANY_FACTS` is collected per
researched ticker rather than per ranked name:**

| Population | With a filed count |
| --- | --- |
| Top 12 | **10 of 12** |
| Top 50 | 28 of 50 |
| Top 200 | 53 of 200 |
| all ranked | **201 of 2,821 — 7%** |

**So: do NOT build a supply-bound sort on Discovery.** A 7%-populated sort column
is *worse* than the float sort it would replace. The float sort has 0% coverage,
which the `51 unknown` readout makes obvious at a glance. A 7% column **looks
like it works** — it returns 201 correctly ordered names with 2,620 silently
beneath them — and the count would read `2,620 unknown` beside a top that still
looks authoritative. **Coverage that is high where he looks and near-zero
overall is the most dangerous shape a sort can have**, because the Top 12 he
checks it against is 10 of 12.

**As a field on rows where it exists, yes. As an ordering over the board, no.**

**And the naming question answers itself: call it `Shares out`.** An earlier
entry here proposed `≤ 915M` to stop a bound reading as a float. Better: **use
the quantity's real name.** Every screener shows shares outstanding beside float
and no momentum trader confuses the two — the confusion only arises from coining
a term like *"supply bound"* that has to be learned. This is the charter rule
doing its job: say it in the language of the stock. The **bound relationship**
belongs in the risk chip if anywhere (*float is at most this*), not in the column
heading.

**Staleness is a constraint, not a preference.** Of the 28 at Top 50, **16 carry
a count inside 45 days and 12 carry a dated one**. Under the owner's framing the
dated twelve are not failures — *"filed as of 2024-12-31"* is story he can
discount himself. **The failure would be rendering those twelve
indistinguishably from the sixteen**, which is the signal-shaped version, and it
is why the as-of ships **beside** the number rather than behind it.

**Research's reading of the framing, carried verbatim because it is the sharpest
anyone has given:** *"as much of the story as is useful" cuts both ways — it
argues against suppressing a dated bound, and equally against **dressing a supply
bound as a float because the column is empty and something would look better
there than nothing.***

### Phase C ships a BOUND, not a float — and a bound must never read as one

The owner's framing, `8c2d2d5`: *"we are an intelligence platform, not a signal
platform — so give the user as much of the story as we can that is useful."* The
bar is **useful, not certain**, which reverses the defensive default several
decisions below were taken under.

**It changes the float answer.** Phase C ships **shares outstanding**, not float:
a bounded proxy with `float_basis`, an as-of, a staleness gate, and
`CANNOT_VERIFY` where the denominator cannot be trusted. Under this framing the
question is no longer *whether* to show it — *"supply bounded at X, from filed
shares as of DATE"* is story, and an empty column is not.

**So the design question is how to render a bound so it cannot be misread as a
float.** Shares outstanding is always ≥ float, so a bare figure in the float slot
is the worst possible outcome: a trader scanning for a tight float sees a large
number and rejects a name whose actual float may be small. **The operator carries
the meaning:**

    ≤ 915M · filed 2026-05-12

`≤` is one character, cannot be read as an exact figure, and says the true value
is somewhere below. **A bound never occupies the float slot unqualified.**

**And a bound refines the five-state ladder below — it is a sixth position.** It
is strictly more than *"looked, cannot judge"* and strictly less than *"have
it"*: the desk cannot give the number but can say what it is under. That is the
intelligence-platform position in one cell, and it is the state the old design
had no room for, because it only asked whether a value was known.

**What the framing argues against**, and these are the failure modes to check a
float design against: collapsing a computation to a label and discarding the
working; suppressing a value because it is uncertain instead of **labelling the
uncertainty**; and *"we will show it once it is reliable"*, which withholds the
story until it has stopped being one.

**The limit is the word *useful*.** Terminology stays trader-facing, engine
internals stay rejected, and a field nobody would ask about is still not worth
showing. The test is what he would want if he were doing this by hand.

### The pattern underneath, for §8: the desk's five states of knowing

This is now the **fourth** time the same distinction has had to be drawn, each
time separately: `NOT YET ANALYZED` against `UNKNOWN`; *unknown* against
*changed* for cycle; *wrong* against *absent* for float; and now *cannot tell*
against both. Solving it a fifth time in isolation would be the mistake.

**Every field that can be absent sits in one of five states, and no two may
collapse:**

| | The desk's position | Float, as an example |
| --- | --- | --- |
| 1 | **Not looked yet** | `NOT YET ANALYZED` *(whole ticker)* |
| 2 | **Looked, found nothing** | `FLOAT UNKNOWN` |
| 3 | **Looked, cannot judge** | the figure + `filed 82d ago` |
| 4 | **Looked, it is wrong** | `FLOAT WRONG` |
| 5 | **Have it** | the figure |

States 3 and 4 are the ones a product usually loses — collapsed into 2, because
"we have no good number" feels like one condition. It is three, and the
difference between them is most of what this desk is for. **State 4 is the
strongest claim on the list**, not the weakest: it says the number every screener
is showing cannot be relied on.

Belongs in audit §8 beside the badge shapes, since it is a rule about the visual
system rather than about float. Proposed here; not written into the audit until
the float build confirms the vocabulary survives contact.

### Item 17 changes shape, and the usual framing is wrong

Phase C's float **will not match** the Sheet's, and the reason matters: the
Sheet's is a **vendor-displayed** number (StockAnalysis 157 times against SEC 10
across the workbook); Phase C's is **filing-computed**. Two different definitions
of the same word, not a correction of one by the other.

Item 17 was *"one number, one qualifier, one reason"*. **That shape may be wrong
once both exist**, and not because the qualifier is hard to word:

**The vendor float is not merely the worse-provenanced number — it is the one
other market participants are looking at.** It is what the screeners show. A name
that screens at 0.70 M draws the crowd whether or not 0.70 M is tradeable, and
for a momentum trader *what everyone else believes the float is* has value
independent of what it is. Pillar 5 selects on the screened number; the risk of
being wrong lives in the filing-computed one.

So the two may **both** belong on screen, labelled by **what each is** rather
than by which is trusted — which is a different design from picking a winner and
qualifying it. Deciding that needs Phase C to exist. Recorded now so item 17 is
not built against today's one-number-and-one-absence and then rebuilt.

**And item 17's stated shape breaks outright on a refused float.** *"One number,
one qualifier, one reason"* presumes a number. On one name in six there is none
to present — there is a state and a reason, and the reason is the intelligence.
Item 17 needs a **fourth shape** for that case rather than an awkward qualifier
on an absent figure. It was written before any of this was known and is the item
this changes most.

F-19's contradiction is the same disagreement already visible in miniature.

## Incoming — the cycle migration switch

Scoped by Integration 2026-08-23 (`research.md` item 13, `bce1a8b`). Nothing is
due until Research wires the computed cycle into the pipeline.

**Design's files:** `components/AutomaticIntelligence.tsx`, `TickerDrawer.tsx`,
`lib/dashboard/deskRead.ts`, `intelligence.ts`, `merge.ts` — **plus four the
handover missed**, established here by grep and sent back:

- **`components/DiscoveryBoard.tsx`** — the largest omission. It renders the
  Cycle badge on the primary board (`:499`) and reads `conclusions.cycle.tone`
  at `:405` to set `backside`, which drives the one-saturated-element colour
  precedence for the whole row. The most visible cycle surface in the product,
  and the only one on screen during his trading session.
- **`lib/dashboard/view.ts`**, **`components/MarketSummary.tsx`**,
  **`components/FilterBar.tsx`** — the cycle filter and its three segments.

**A design decision is hiding inside what was scoped as a switch.** `CycleFilter`
is `'ALL' | 'FRESH' | 'WARNING' | 'BACKSIDE'` (`view.ts:10`) — the *old* model's
classes. The arithmetic phases are six, and **only `BACKSIDE` survives by name**;
`FRESH` and `WARNING` have no arithmetic counterpart at all.

### `CycleFilter` — decided 2026-08-23, minimal and reversible

Integration's ordering call: decide now rather than defer to §9 item 13.

| | Filter | Phase |
| --- | --- | --- |
| | `ALL` | — |
| ← was `FRESH` | **`DAY 1`** | `DAY_ONE` |
| new | **`FRONTSIDE`** | `FRONTSIDE` |
| ← was `BACKSIDE` | **`BACKSIDE`** | `BACKSIDE` |
| ← was `WARNING` | **dropped** | *(none)* |

Four values replacing four, each mapping to exactly **one** phase. No bucketing,
no new controls, no new capability — the shape of the existing filter, pointed at
things that exist.

**`WARNING` is dropped, and that is a finding rather than a mapping failure.**
`YELLOW_FRONTSIDE_WARNING` meant *frontside, but with concerns* — a **model
opinion**, not a geometry. Arithmetic has no opinions, so there is nothing for it
to become. It should not be faked into a threshold to preserve a chip. This is
the same field that measured 46% irreproducible across five draws, and `WARNING`
was where much of that lived: the flips were one step on the scale, and this is
the step they flipped across.

**`OFF HIGH`, `PRIOR RUN` and `NO RUN` get no chip and stay reachable under
`ALL`** — matching how the current filter already treats everything outside its
three buckets. `OFF HIGH` is the one with a case for promotion, since a dip trade
is a named exception in the playbook. Not added unasked; flagged to the owner.

**`largestPriorAdvancePct` hands Design a threshold it used to inherit.** The
surface can now set what counts as a former superrunner rather than taking
Research's 200% cut. **Keeping 200% for the switch** — changing a threshold and a
data source in one commit means a later disagreement has two candidate causes.

This still collides with §9 item 13's workflow-filter rewrite, which will re-cut
this set. Decided minimally *because* of that: a small, reversible mapping is
cheap to throw away, and a redesign done twice is not.

**Not Design's, and correctly so:** `lib/data/cycleLevels.ts` and
`lib/research/merge/sheetAuto.ts` are Research's. Sitting inside the apparatus
Design is deciding about is not the same as owning it. **The schema deletion
comes after this switch is deployed *and verified*, not merged** — deleting the
fields while the switch still has a defect leaves nothing to fall back to.

## What can actually be falsified before premarket

Ops asked which cycle surfaces can fail a test at `CLOSED`, rather than looking
at all of them and learning nothing from most. Working it out changed the plan in
both directions.

**The measurement that reframes it:** of **231 current dossiers, 0 carry
`computedCycle`** (Ops, against production). So the cycle column reads
`CYCLE NOT ESTABLISHED` on **every row**, not on some.

*Design's share of that error: the caveat handed over said "names whose dossiers
predate `computedCycle`" without asking how many. That is all of them, and
"some" and "all" are different mornings.*

### RUN 2026-08-24 on `c48e199` — checks 3 and 4 both PASSED

Ops shipped `c48e199` (Design's re-cut plus Research's guard and healing) and
**not** `a259e8c`, so the overlay is unshipped and check 4's window was open
after all. The retirement below was reasoned on both commits shipping together;
they did not. Integration held the overlay deploy until this ran, which was the
right call — a weak test that is free now and permanently gone later is worth one
look.

| | Result |
| --- | --- |
| **Check 3** — researched table shows no `FRONTSIDE — WARNING` | **PASSED.** Neither that string nor `FRESH / FRONTSIDE` appears anywhere on the page. |
| **Check 4** — a row **with** a sheet cycle rendering `CYCLE NOT ESTABLISHED` | **PASSED**, on all 9 rows. |

**Why check 4 is airtight rather than inferred.** The same nine rows were
observed earlier in the same session, before the deploy, rendering
`FRONTSIDE — WARNING` ×6 and `BACKSIDE` ×3. They now render
`CYCLE NOT ESTABLISHED` ×9, with the tooltip *"Analysis ran but did not
establish a cycle boundary for this name"* — `UNRESOLVED_DETAIL.cycle`, reachable
only through the new path. **The old path rendered the sheet label whenever one
existed**, so it could not produce this on these rows. Before-and-after on
identical rows, not a snapshot compared against an expectation.

**Not claimed — the phase names.** `DAY 1` and `OFF HIGH` do appear on the page,
but they are the **filter chips**, already passed separately, not rendered cycle
badges. No row carries a phase label, because no dossier carries a computed
cycle. The phase-name and retracement tests still wait for `a259e8c`.

### RUN 2026-08-24 on `a259e8c` — the two stronger tests PASSED tonight

Integration relayed that these could not be checked until a populated board,
because Discovery holds 0 rows with an RVOL rank. **That is true of Discovery and
false of the researched table**, whose nine rows come from `market.intelligence`
and do not depend on a rank. They ran.

**Retracement is of the MOVE — PASSED, and decisively.** OLOX's cycle tooltip
reads *"up 1.3% from 4.92 · high 11.40 on 2026-06-02 · **143.7% of the move given
back**"*. A distance-below-the-high figure is **mathematically capped at 100%**;
only retracement-of-the-move can exceed it. So the number proves the definition
rather than merely being consistent with it. CDTG reads 104.1%, DXST 61.7%.

**Phase names render — PASSED, with the claim stated narrowly.** Observed:
`BACKSIDE` ×3, `NO RUN` ×3, `CYCLE NOT ESTABLISHED` ×3. **`NO RUN` is decisive**
— it is a string the old code cannot produce anywhere. `BACKSIDE` alone would
have been ambiguous, since the old path emitted it too.

**Not claimed: that all six names render.** Only two phases occur in this data,
so `DAY 1`, `FRONTSIDE`, `OFF HIGH` and `PRIOR RUN` are unobserved — not failed.
The label map is exercised and reachable; four of its entries have never been
seen on a screen.

### The mechanism was wrong; the observation stands. Both reconcile on one parameter.

Ops could not reproduce the pass and traced `market.intelligence` to a rank gate:
`readDemandStates` selects `WHERE trading_date = ? AND rvol_rank IS NOT NULL`
(`repo.ts:583`), which returns nothing on 2026-08-24, so `readIntelligence`
returns `{}`. **That trace is correct.** Design's stated mechanism — *"the nine
rows do not depend on a rank at all"* — **was wrong.**

**The reconciling fact is a query parameter neither thread had named.** The page
does not call the bare endpoint. It calls:

    /review/<token>/api/market?symbols=OLOX,PMI,DXST,CYPH,PLAG,BTOG,GAUZ,CDTG,BTCS

Measured on the live desk, same instant, same token:

| Call | intelligence entries | with `computedCycle` | demand states |
| --- | --- | --- | --- |
| `/api/market` **no `symbols`** | **0** | 0 | 0 |
| `/api/market?symbols=…` | **6** | **6** | 9 |

**Both readings were true of what each measured.** The bare endpoint is
rank-gated exactly as Ops traced; the page supplies its watchlist symbols
explicitly and bypasses the gate. Ops read server-rendered HTML, which is
produced before that fetch — hence `CYCLE NOT ESTABLISHED` ×9 there — while the
hydrated page shows 6 populated and 3 not, which is precisely what renders:
3 `BACKSIDE`, 3 `NO RUN`, 3 `CYCLE NOT ESTABLISHED`.

**So the rule Design gave Integration was incomplete and is corrected here.** Not
*"which endpoint feeds a surface"* but **"which endpoint, and with which
parameters"**. An endpoint's behaviour on a bare call is not its behaviour in the
app, and checking it bare gives a confident wrong answer — the same class of
error as reading `/api/dashboard` for a dossier field.

**The loose thread is closed, and it closed as CONFIRMATION of the finding it
appeared to contradict.** Ops counted `given back` ×3 in server-rendered HTML
with `NO RUN` ×0. Those three are **static control labels**, verified here:
`FilterBar.tsx:118` and `:123` are filter-chip `title`s, `MarketSummary.tsx:93`
is a segment hint — all three written by this thread. The only data-bearing
instance is `lib/dashboard/cycle.ts:93`, gated on `retracementPct > 0`.

So server-rendered HTML with zero populated cycle data is **exactly** nine
`CYCLE NOT ESTABLISHED`, zero `NO RUN`, and three chrome labels. There was never
a contradiction to explain.

**A better test would not exist later.** These arrived on a nine-row table at
`CLOSED`, not on a populated board — the assumption that a phase-dependent
surface needs the phase to be *busy* was wrong here, because the researched table
is fed by research rather than by the tape.

### PREMARKET 2026-08-24 — every remaining check run, all passed

Board populated: 867 eligible, 12/50 rows, phase `Premarket`.

| Check | Result |
| --- | --- |
| **`Gap` label** — needs `PREMARKET` specifically | **PASSED.** Button reads `Gap`, title *"Change from the prior session close, including after hours"*. The old code had that word only in a `title` and could never render it as visible text, so this is the string that separates the paths — seen in the only hour it exists. |
| **Row reordering** | **PASSED.** Rank order `OSPR, OLOX, TMCR, PMI, SDEV`; price order `OSPR 19.74, SDOT 16.08, BBCQ 10.63, SSEA 10.50, NBRG 10.05`. |
| **Top N applied after the sort** | **PASSED, decisively.** With price sort active, `Top 12` returns the twelve highest-priced names **on the whole board** — 19.74 down to 6.70 — including SDOT, BBCQ, SSEA, NBRG, SUPX, HVII, JLHL and ELAB, **none of which were in the rank-based top 12.** Slice-then-sort could not produce that set. |
| **Unknown count against real null floats** | **PASSED** as a mechanism: Float column appears only while float sort is active, `sorted by float` marker shows, readout reads `51 unknown`. |
| **Phase names** | **five of six.** `BACKSIDE` 8, `NO RUN` 14, `FRONTSIDE` 3, **`DAY 1`** (USDE), **`PRIOR RUN`** (NCTY) at Top 50. `OFF HIGH` still unobserved — data-dependent, not code-dependent. |

**The float sort works and has nothing to sort.** `51 unknown` out of a 51-row
board population: **every ranked name has a null float.** Float is Sheet-sourced,
and Discovery names are mostly not on the Sheet. So the control is honest — it
says so loudly, which is what the count was built for — and **useless until the
SEC-derived float lands.** This is the case §9 item 17 was already recorded
against; it is now observed rather than predicted.

**`NO RUN` — corrected 2026-08-24. It is ELEVEN genuine and THREE stale**, and
the three are the interesting half. Design first recorded this as *"genuine, not
short-series"*, which was Integration's summary and true only of the majority.

- **11 of 14 genuine** — every bar finished, `latest_finished` 2026-08-21,
  complete series through Friday, no qualifying cycle start.
- **3 of 14 one session stale** — **ADXN, LSTA, ZKH**: 101 bars, 100 finished,
  `latest_finished` 2026-08-20 while `latest_any` is 2026-08-21. Their Friday bar
  is partial and hidden, so **the cycle resolves through Thursday**. Not a
  short-series artefact — 100 bars is far past any minimum — but **a phase
  computed on data one day old**, which may not still be `NO_CYCLE` once Friday
  lands.

**Those three are the live examples for the `asOfTradingDate` surface above.**
They are exactly the rows that would carry a Thursday as-of while rendering
identically to a Friday one.

**Unresolved, and recorded so nobody later cites it as agreement:** Ops's
three-of-fourteen is over **28 intelligence entries**; Design's `NO RUN` ×3 was
over a **12-row Discovery board**. **Whether they are the same three is unknown.**
A 3 meeting a 3 reads as confirmation without being it.

### Segment fix VERIFIED on the live desk

`d375c28` shipped inside `567557b`. Checked on the live board rather than
reported: segments now read `0 day 1 · 1 frontside · 4 backside` — down from
`1 · 3 · 10` — and **clicking `4 backside` returns exactly 4 rows, all
`BACKSIDE`.** Count and filter now read one population, confirmed by the click
that found the defect rather than by the count alone.

**Running total: 6 of 6 available checks passed.** Outstanding and genuinely
gated on a populated board: the four sort checks, and the `Gap` label, which
needs `PREMARKET` specifically.

**Superseded, kept because its premise was right — check 4 would have been
retired had both commits shipped together.** Research's read-time fix landed as an **overlay**: the stored
dossier is untouched, so replays and archived assessments keep their `asOf`
boundary while the live board gets a fresh cycle. Every name with two or more
stored daily bars now gets a computed cycle on the next render.

Integration read that as *"check 4's window closes, so run it in the same sitting
as check 3."* **Closer to: if both commits ship in one deploy, check 4 cannot be
run at all** — the condition it needs is a row with a sheet cycle **and no**
computed one, and the overlay removes the second half everywhere it can. There is
no window to be quick about.

**That is a gain, not a loss, and the table should say so.** Check 4 was always a
weak positive: `CYCLE NOT ESTABLISHED` only distinguishes the paths on rows that
*have* a sheet cycle, and proves nothing about whether the new vocabulary
renders. The overlay replaces it with the two tests previously listed as
non-falsifiable — **the six phase names and the retracement figure** — and those
are strictly stronger: `DAY 1`, `OFF HIGH` and `PRIOR RUN` are strings the old
code cannot produce **anywhere**, on any row, under any data. They also arrive on
every row at once rather than trickling.

**So the sitting to plan for is: deploy, then check 3 and the phase names
together.** Check 4 is retired unless `a5a3a98` somehow ships without `a259e8c`.

**And the contract held on all seven fields** — `phase`, `advancePct`,
`baseClose`, `cycleHigh`, `cycleHighDate`, `retracementPct`, `sessionsSinceHigh`
are all present on the overlaid shape, so nothing in `components/` changes. The
three fields no surface reads are carried rather than dropped.

**Superseded, for the record: the backfill is cancelled.** The owner chose Research's
read-time fix — *"fix the path"* — over re-analysing 231 dossiers. **So the
0 → 231 counter is not going to run and the column does not fill overnight.** Two
consequences, and they pull in opposite directions:

- **Check 4 gets stronger, not weaker.** It never needed a populated
  `computedCycle` — it needs the *opposite*, a row with a sheet cycle and no
  computed one. That condition is now indefinite rather than expiring at Monday's
  re-analysis, so the check stays available for as long as it takes to run.
- **The two non-falsifiable ones stay non-falsifiable for longer**, and are now
  gated on the read-time fix landing rather than on a counter climbing. When it
  does land they should become checkable on **every row at once** rather than
  trickling, which is a better verification than the backfill would have given.

### Research claims Design's surfaces need no change — here is what to check it against

Research's item 16 states: *"Design's surfaces keep reading
`dossier.computedCycle` unchanged provided the read path populates it."*
**Probably true, and worth making checkable rather than trusted.** Every field
this thread reads, and nothing else:

| Path | Used for |
| --- | --- |
| `computedCycle.current.phase` | the badge label, its tone, the filter, the counts |
| `.current.advancePct`, `.current.baseClose` | `up 20.0% from 1.00` |
| `.current.cycleHigh`, `.current.cycleHighDate` | `high 1.20 on 2026-08-12` |
| `.current.retracementPct` | the giveback — **of the move, never below the high** |
| `.current.sessionsSinceHigh` | `9 sessions since the high` |

`priorCycles`, `formerRunnerStatus` and `largestPriorAdvancePct` are **not read
by any surface yet**. If the read-time path populates the five rows above with
the same shapes, nothing here changes. If it differs, this table is the diff.

**That question had an answer, and it was pointed at the wrong layer.** The
Changes rail is safe: `cycle_fingerprint` is a bucketed hash of **live tape** —
price against session high and low, halt state, rank, participation, supportLost
(`lib/desk/assessment.ts:68`) — and never touched `computedCycle`. The same
sentence is true one layer down, where it matters more: `computedCycle` is
deliberately **as-of bounded** (`pipeline.ts:362`), and Research's own comment
says why — *"a replay that resolved the cycle against today's bars would know how
the move turned out."* A read-time computation has no `asOf`. The stored field is
currently the only thing holding that boundary. Relayed to Research mid-build.

### The snapshot board renders a different cycle, and my cutover did not touch it

Established here 2026-08-24, and it belongs to Design's surface even though the
writer does not.

`AssessmentHistory.tsx:218` renders `row.cycle` — a **stored** string, written by
`worker/desk-assessments.ts:275` as `dossier?.cycle.cycleClassification`. That is
**the model's classification, not `computedCycle`**. So:

- **It did not switch with the cutover**, because it is a stored value written by
  a worker rather than a display resolution. The live board now says `DAY 1` and
  `BACKSIDE` while a checkpoint snapshot says whatever the model said. **Two
  vocabularies in one product**, on two surfaces a trader moves between.
- **It is rendered raw** — `{row.cycle ?? '—'}`, no label map — so it prints the
  enum. That is the same class as F-08's `changedFields.join(', ')` two lines
  above it, and the same class Phase 1 removed everywhere else.
- **When Research deletes `dossier.cycle`, that writer THROWS — it does not go
  null.** *Design first wrote "goes null"; corrected by Integration 2026-08-24
  and verified here.* `dossier?.cycle.cycleClassification ?? null` guards **only
  `dossier`**: with the dossier present and `cycle` deleted, `.cycleClassification`
  is a TypeError and the `?? null` never runs. `cycle: CycleFindings`
  (`lib/research/types.ts:550`) is **not optional**, so nothing at that call site
  warns once the field is gone at runtime.

  **And it throws EARLIER than first traced.** That writer reads `dossier.cycle`
  at **four** sites, not one — `:239 currentCycleHigh`, `:240
  historicalResistance`, `:275 cycleClassification`, `:308 cycleWarnings` — so
  `:239` fires first and the throw lands before the site Design originally
  named. Established by Research, verified here. The find was **understated**.

  **That makes it a capture failure, not an empty column.** The throw is inside
  `captureAssessment` (`worker/desk-assessments.ts:171`), called at `:588` —
  **before** `insertAssessmentTickers` at `:595`. So the checkpoint's ticker
  records are never written, for every ticker carrying a dossier, at every
  checkpoint. `desk_assessments` is append-only, begins 2026-08-17T20:00Z, and
  **no run buys back a day of it**. *Not traced above `:546`; whether the process
  survives the rethrow is not claimed by anyone yet.*

  It is named nowhere in the deletion plan.

**Not fixed here.** `worker/` is not Design's. The fix is a pair — the writer
stores the computed phase, the renderer maps it — and **the writer half is
Research's, in the same commit as the deletion, never after**. If the two ever
land apart, writer first. Design owns the rendering half; it belongs with item
12, which rebuilds this surface anyway.

**The general rule this produced**, now in the README: *a deletion plan is a list
of **readers** — and so is a rename, and a type change.* This one was found by
the thread that owns none of the three files involved.

### The Sheet and the dossier use the same field names, and Design renders both

Worth naming because this thread is the most exposed to it. `StructuralResearch`
(the Sheet's row) carries `cycleClassificationRaw`, `cycleState`,
`cycleReasoning` and `recentMajorRuns` — **Sheet fields with dossier-shaped
names**, within a few lines of each other.

**So a grep by field name cannot tell the two vocabularies apart.** Every one of
the false positives in Research's `dossier.cycle` reader inventory was this one
collision rather than several near-misses. `TickerDrawer.tsx:708` reads
`research?.recentMajorRuns ?? ''` — the *Sheet's* `string` (`lib/data/types.ts:183`),
not the dossier's `string[]` (`lib/research/types.ts:535`). Confirmed for
Research 2026-08-24.

**The shape of the fallback identifies the source** where a type lookup is
inconvenient: `?? ''` cannot be defaulting a `string[]`.

**This is the trap that caught Design's own cutover**, from the other direction.
The scope list was checked with a grep for `cycleClassification` and
`conclusions.cycle`, which missed three surfaces that said `ticker.cycle.display`
— searching for the dossier's names and missing the Sheet's. **Any inventory over
these fields must be typed, not grepped.**

### Falsifiable at CLOSED

| Test | Why it can fail | Status |
| --- | --- | --- |
| Filter chips read `All · Day 1 · Frontside · Off high · Backside` | `Fresh` and `Warning` cannot be produced by the new code at all | **PASSED** 2026-08-24, live |
| Summary segments carry no `warning` | same | **PASSED** |
| Researched table shows no `FRONTSIDE — WARNING` | same | **FAILS today** — `a5a3a98` not yet deployed |
| A row **with** a sheet cycle showing `CYCLE NOT ESTABLISHED` | **the old path cannot produce this**: with a sheet cycle present it rendered the sheet label. Only the new path reaches unresolved here | available the moment `a5a3a98` lands |

**That last row corrects Integration's reading.** An empty cycle column is not
falsifiable *in general* — it looks identical to a broken one. But on a row that
*has* a Sheet cycle, `CYCLE NOT ESTABLISHED` is a string only the new code can
put there. The distinguishing case exists; it is narrower than "the column is
empty".

### NOT falsifiable until dossiers carry `computedCycle`

Integration listed *"the six phase names rendering"* and *"the retracement figure
being of the MOVE"* as checkable before premarket. **Neither is.** Both require a
dossier with a computed cycle, and there are none — so no phase label and no
retracement detail can render at all, at `CLOSED` or at 04:00, until re-analysis
has run. They are gated on the 0 → 231 counter, not on the clock.

**Nor is the cycle tone**, for the same reason, plus the `Move`-label problem:
`BACKSIDE` renders `neg` under both old and new code.

### The sort checks, restated

Row reordering, the unknown count against real null floats, and Top N after the
sort all need a populated Discovery board — 04:00 at the earliest, and more
comfortably 10:30 on any trading morning. The `Gap` label needs `PREMARKET`
specifically and cannot be seen at any other hour.

**Nothing on this page counts as verified until it is on the falsifiable list and
marked passed.**

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

## Two surfaces that exist behind nothing — raised by Integration 2026-09-04

Research found both answering the Sheet-exit question (`0cdd8de`, items 42–43).
Neither is instructed by the trader. **Not built and built-but-unwired are
different problems**, and these are the second: work already paid for that
reaches no screen.

Both claims verified in code before answering. `supplyPair` (`lib/research/supply.ts:58`,
declared `types.ts:512`) has no reader anywhere in `lib/dashboard/` or
`components/`. `deriveCycleLevels` (`lib/data/cycleLevels.ts:164`) reads the
Sheet's `recentCycleHigh` and `recentRunHigh`, is called once from
`merge.ts:178`, and renders in exactly one place — `TickerDrawer.tsx:174`.

**Order: supply first.** Supply delivers nothing at all; cycle levels delivers
something correct from a source we want to retire. A value gap outranks a
dependency gap. Supply also carries the trader's own settled decision — floor
AND total as a pair, exclusions counted rather than hidden — so it starts at
zero design cost.

### The supply pair — TWO NULLS, and the decision covers only one

Coverage is 17.4%, so the pair is null on five rows in six. **The design
question is therefore not how to render the pair. It is what the other 82.6%
renders**, and that is not what the trader decided.

| Case | Meaning | Sentence |
| --- | --- | --- |
| Pair present, `floorShares` null | Measured; nothing established | "no live supply proven" — his decision |
| Pair absent | Never measured — no share count, or no comparable block | **Owed. Does not exist yet.** |

Collapsing these is the failure the graveyard's `wired` flag exists to prevent,
and the same shape as `UNKNOWN` against `undefined`. A blank across 82.6% of
rows reads as *no supply* — the surface would make a STRONGER claim while wired
to LESS data. `supply.ts:69-73` already documents the first case ("at least 0%"
is an absence wearing a number's clothes); the second has no line and needs one
before anything ships.

### ANSWERED 2026-09-04 — the absent pair has ONE cause, and it is the denominator

I told Integration the pair is absent when there is "no share count **or** no
comparable block." **The second half is wrong.** `computeSupplyPair` returns
null on exactly one condition — `sharesOutstanding` missing or non-positive
(`supply.ts:166`), guarded at the call site by `reported`
(`pipeline.ts:409`), which is `bundle.reportedSharesOutstanding`: a FILED
figure carrying a concept and a source id.

A ledger with no usable blocks **still produces a pair** — `floorShares` and
`totalShares` null, `excluded` populated with `NO_SHARE_COUNT`,
`BASIS_UNVERIFIABLE` or `BASIS_DIFFERS`. That case is already covered by the
trader's exclusions-counted decision.

**So the 82.6% is not a supply-research gap. It is a missing denominator.** The
blocks may be fully researched; there is nothing to divide them by. A reader
seeing a blank would conclude *we do not know this company's supply*, when the
truth is *we know the blocks and cannot express them as a ratio* — a different
statement, and a more useful one. It is also the same hole as float: a ratio
needs a denominator and this desk has none. Same root, and it says so.

**The copy therefore names the missing denominator, never the missing answer.**

| Case | Cause | What it says |
| --- | --- | --- |
| Pair, floor null | Measured; no established live block | "no live supply proven" + exclusions counted |
| **No pair** | **No filed share count** | **names the absent denominator, not absent knowledge** |

### The consequence worth more than the sentence

The pair is a RATIO surface. A missing denominator kills the ratio — **it does
not kill the share counts.** If the ledger carries blocks on those rows, the
honest fallback is to show them as SHARES with no percentage, which converts
five rows in six from a blank into something readable.

**Conditional on a measurement I do not have:** how many rows with no filed
share count still carry a populated `supplyLedger`. If that number is small the
fallback is not worth building and the sentence stands alone. Ask before
designing the fallback — this is exactly the "state what the count is RIGHT NOW
before choosing a threshold" rule, and I have not stated it.

### SIZED 2026-09-04 — the stale cycle high, and which number leads

Research confirmed the bar set ends at the last SETTLED session, so `cycleHigh`
cannot contain today's high. Sizing it myself gives a NARROWER blast radius and
a WORSE symptom than the report.

**Narrower.** Grepping `cycleHigh` outside `lib/market/cycle.ts` returns exactly
one trader-facing reader — `lib/dashboard/cycle.ts:89`, inside `cycleDetail`.
Not "everywhere it is read", and the intelligence panel does not render it.

**Worse.** `cycleHigh` feeds `retracementPct`, and `retracementPct` decides the
PHASE (`cycle.ts:136-140`). So the defect is not the hover string — **it is the
chip LABEL**: DAY 1 / FRONTSIDE / OFF HIGH / BACKSIDE. A name gapping premarket
above yesterday's cycle high reads OFF HIGH while it is making new highs. On a
board of 50%+ gappers that is not an edge case; it is near the normal case, in
the window he actually trades.

**But it is stale, not inconsistent.** `cycleHigh` and `latestClose` are both
settled, so the arc is a CORRECT statement about the last settled session,
rendered with no date during a window where the name has usually moved. The
falsehood is the implied "now", not the arithmetic.

**A THIRD exclusion mechanism, at the surface.** Beyond the write guard and the
read filter: `merge.ts:229-230` nulls `sessionHigh` during PREMARKET and routes
the value to `premarketHigh`. A composition reading `sessionHigh` gets null in
exactly the window that matters. (Checked `DeskRead.tsx:238` for the same trap —
safe: `t` is `read.telemetry`, upstream of the split.)

**`overlayLiveCycle` contains no live session data.** The name will be believed.
Rename it with the work.

### Which number leads — the question dissolves

They do not disagree, and treating this as arbitration is the error. `cycleHigh`
is *the highest high since the cycle started, through the last settled session*.
`sessionHigh` is *today's high so far*. **Two halves of one maximum, not two
estimates of one quantity.** The composed high is the larger, and that IS the
cycle high correctly computed. There is nothing to tie-break.

So the surface shows **one number and the date it was set** — `cycleHighDate`
exists already. **When that date is today, the name is making its cycle high
right now, which is the most tradeable fact on the board rather than an
ambiguity to resolve.** The supposed conflict case is the signal case.

One honesty constraint: today's high is partial and can be exceeded a minute
later, so it must read as *so far*. The date carries that if the copy says it.

### Sequencing — and a cheap fix that does not wait

The composition IS the defect fix; there is no separate cheaper version of it.
But there is a smaller honest step available NOW, independent of any of it:
**date the claim.** A chip whose detail says "through Wednesday's close" stops
being a false present-tense statement and becomes a true past-tense one. That is
this thread's own rule — a label must be true without context — and it costs one
string. It is worth doing before the composition rather than after, because it
removes the falsehood without waiting on the work that removes the staleness.

### NOT BUILT 2026-09-04 — the fallback I proposed already exists

Research's count came back 38 of 46 and cleared the threshold I set, and
Integration asked for the fallback. **Checked the render path first and did not
build it: `AutomaticIntelligence.tsx:361-381` already renders the whole supply
ledger** — type, status, `amountShares`, dollar capacity, registration status,
source ids.

**So the 38 names do not show a blank. They show their blocks, as shares, with
no percentage — which is exactly the fallback I described.** Building it would
duplicate a live surface, and the comment at `:383` on that very element warns
about the last time this card printed the same sentence twice.

`Shares outstanding` at `:345` already renders "unknown" when the count is null,
so the desk **already says** the denominator is missing. It simply never
connects that to the absent ratio.

### What is actually missing, re-derived

Four states, and the ledger covers the blocks in all of them:

| Rows | State | Rendered today |
| --- | --- | --- |
| ~85 | Pair with a real floor | **nothing — `supplyPair` has no reader** |
| ~100 | Pair, floor null | **nothing — same** |
| 38 | No pair, ledger present | blocks ✓, no reason for the missing ratio |
| 8 | No pair, no ledger | nothing, correctly |

**The gap is the pair itself on 185 rows, not a fallback on 38.** For the 38 the
owed thing is one clause connecting the absent ratio to the absent count — not a
surface.

**And it belongs WITH the ledger, not beside it.** A ratio panel in a different
card from the blocks it divides would make the reader carry the join. That is a
placement decision, and getting it wrong is rework, which is why this went back
before anything was written.

### The proportion that must not leak into the copy

Integration retracted a 91/231 figure (the model's transcription, not the parsed
value the code divides by; the real one is 185/231). The binding constraint is
the NUMERATOR — **146 names lack a priced active block against 46 lacking a
count.** So the dominant reading on this surface is "we have a denominator and
nothing established to divide", not "we cannot divide". The copy must not imply
the missing count is the main story. It is the smaller gap.

### The cycle levels — a layer removed, not a pointer redirected

Two consequences, both deliberate-or-not rather than free:

1. **A coverage hole.** `resolveCycle` returns `{ phase: 'NO_CYCLE' }` with no
   `CycleArc` and therefore no `cycleHigh` at all (`cycle.ts:215`, `:228`,
   `:237`). A name outside a cycle can show a Sheet level today and would show
   nothing after. That is probably right — a cycle high for a name in no cycle
   is the FIEE error `:220` warns about — but it is a loss to state, not to
   discover.
2. **`classifyLevel` goes dead on this path.** Its HISTORICAL/CURRENT/UNVERIFIED
   sorting and the historical-twin inheritance at `:186-194` exist because a
   Sheet level carries no bounded basis. The desk's `cycleHigh` is bounded to
   the current cycle by construction and needs none. A real simplification — and
   the reason this is bigger than a source swap.

### The gating question, which is NOT Design's

`cycleHigh` is computed over **daily** bars. The Sheet's second reading is
`TODAY · Recent Run High` — intraday. **If the bars behind `CycleHistory.current`
end at yesterday's close, the desk's number misses today's high — the level he
is trading against between 04:00 and 09:30.** The Sheet reading would then not
be redundant; it would be the only one covering the session he actually trades.

Research or R&D must settle that before item 2 is scheduled. If the answer is
no, item 2 is **blocked, not ready**, and must not sit on a list as though it
were wiring.

## The float parser's blast radius on Design's surfaces — read 2026-09-04

Integration asked whether any surface of mine assumes float is usually absent,
ahead of Research's Sheet float parser (`33e7bb8`). Enumerated the readers
rather than reasoned about them. **One claim is wrong, and there is one real
defect the addition makes reachable.**

### The chip does NOT stop appearing — that claim is wrong

`FLOAT_UNKNOWN` is gated on `row.research?.structure.state ===
'UNKNOWN_STRUCTURE'` (`risk.ts:194`) — the SHEET'S STRUCTURE STATE, not the
float value. `structureState` (`normalize.ts:234`) reads Sheet TEXT for the word
UNKNOWN and `33e7bb8` does not touch it. A parsed float changes no text.

**The change Integration feared was already prevented by `d8794da`**, which
removed the `displayedFloat === null` half of that gate. Had the parser landed
before that fix, the effect would have been real and inverted — the chip would
have vanished from twelve names for the wrong reason.

### THE REAL DEFECT: the chip is named for a field it does not read

`FLOAT_UNKNOWN` gates on STRUCTURE state and its detail says **"No sourced float
figure."** After the parser, a row can carry `UNKNOWN_STRUCTURE` in the
structure cell AND a parsed float from the float cell — different columns.

**Then the chip says "No sourced float figure" while the same drawer renders
that float.** A contradiction inside one screen.

This was unreachable while `displayedFloat` was null on 49 of 50 rows. At 12 of
50 it becomes reachable, and it is a MISLABEL rather than a logic error: the
condition is right, the word `FLOAT` is wrong. It should say the STRUCTURE is
unknown, because that is what it gates on.

**Not measured.** I cannot count rows with both `UNKNOWN_STRUCTURE` and a
parseable float without live data — the condition is reachable, the frequency is
unknown, and I am marking that rather than implying a size. (The rule from
last night: an unmarked guess becomes an instruction once relayed.)

### Clear on inspection

- **Float sort** (`view.ts:317`, `DiscoveryBoard.tsx:125`) — the "N unknown"
  count is computed live from the rows, not worded as a constant. It improves
  silently and needs nothing.
- **`STRUCTURE_CLEAN`'s value** (`risk.ts:221`) — already conditional on
  `row.displayedFloat`; clean rows gain a float figure where they showed none.
  Additive and intended, and the code path already existed.
- **`buildStructureSummary`** (`deskRead.ts:359`) — "Unknown" or the number, per
  row. Correct in both worlds.

## LIVE VERIFICATION 2026-09-04 — one confirmed, two unobservable, one surprise

Ran against the live desk on a 2-hour review token (id 18, revoked). Three of my
four pieces are in `fff1f1d`; `b2399a2` is not. **I had told the trader "Ops has
none of them" and that was wrong** — verified by `git merge-base --is-ancestor`
rather than by memory.

| Piece | Status |
| --- | --- |
| Header chrome `97fc68a` | **CONFIRMED LIVE** |
| Dated cycle reading `e76d654` | **UNOBSERVABLE** at this hour |
| Supply pair `46794fb` | **UNOBSERVABLE** at this hour |
| Structure chip `b2399a2` | not deployed; 0 live instances of its defect |

### Confirmed: the header rule works exactly as designed

`Market: worker offline` renders its words — an abnormal state, so it speaks.
`Research:` renders **no label at all** — the normal state, suppressed to a dot.
`Market: Alpaca SIP` and `Research: idle` appear nowhere in the page. That is
the rule holding in both directions on one screen.

### Unobservable, and NOT the same as verified

`intelligence` is `{}` on `/api/market` at 01:35 ET, so no dossier reaches a
row: `resolveComputedCycle` returns null, the cycle chip does not render, and
`AutomaticIntelligence` never mounts. Confirmed by absence of `of the move given
back` and `sessions since the high` anywhere in the HTML — the chip is not
rendering a bad string, it is not rendering.

**So `high is today` returning 0 hits is NOT evidence the fix works.** A string
absent because its component never mounted looks identical to a string absent
because it was corrected. Both remain owed a premarket check, when research has
run and the board carries dossiers.

### The surprise: the float parser returns null on all eleven rows

I looked for the row `b2399a2` fixes — `UNKNOWN_STRUCTURE` plus a parsed float.
Four rows carry `UNKNOWN_STRUCTURE` (INLF, MODD, PLAG, PRHI) and **every one has
`float.value === null`.** So the contradiction is reachable and currently
unrealised: **0 live instances.**

The cause is not the fix. `33e7bb8` IS in `fff1f1d` (checked), and every float
cell on this watchlist ends `"...displayed; N SO"` — a shares-outstanding
suffix. Ran the deployed `parseSheetFloat` against the exact live strings:

```
"537,665 displayed; 785,655 SO"  -> null
"11.79M displayed; 13.1M SO"     -> null
"7.14M displayed; 8.15M SO"      -> null
"6,109 displayed; ~1.05M SO"     -> null
"2.46M displayed; 3.75M SO"      -> null
```

**The allowlist is refusing correctly** — unrecognised trailing text refuses by
design, which is the property that makes it safe. But "twelve floats that were
null are numbers now" does not hold on this board, AKAN included. Whether the
12-of-50 figure was measured on a different population (top-50 discovery rather
than this 11-row watchlist) is Research's to say; what is observable here is
0 of 11.

**`b2399a2` is still right and still worth shipping.** The condition is
reachable the moment one cell lacks the suffix, and the chip is named for a
field it does not read regardless of how many rows expose it today.

### The rule

**A surface that renders nothing cannot verify a string.** Check that the
component MOUNTS before reading meaning into the absence of its text — otherwise
"the bad label is gone" and "the feature never drew" are the same observation.

## SCOPE — the current-activity indicator (2026-09-04, not built)

His complaint: the board cannot tell him what is moving NOW. RVOL is cumulative,
so at 10:00 a name that ran at 07:15 and died still carries a large number. Real
defect, and the discrimination a 07:00–10:00 trader needs most.

### The finding: it is computed, labelled for display, and thrown away

`ActivityReading.window` (`activity.ts:118-119`) is **"Trades per minute over the
judged window, oldest first. For display."** Built at `:202`, one line under the
comment calling it the most important in the file.

It is not persisted. `ticker_session` carries `activity`, the `dead_at_*` trio
and `activity_config` (`db.ts:174-180`) — **no window column.** So the sparkline's
input is produced every evaluation, used to decide ACTIVE/DEAD, and discarded.

Worse than built-and-unwired: **built, named for the surface, and deleted.**

### Shape

**Persist the array; do not re-query at render.** The `ticker_session` row is
already read for every board row, so the sparkline costs ZERO extra queries. The
alternative — `readMinuteBars` per symbol — is 25–50 queries per poll, each
`SELECT *` over the WHOLE trading date (`repo.ts:188`, no time predicate, up to
~390 rows), to draw five points.

**Reuse the verdict's own array, exactly.** Same numbers that produced ACTIVE or
DEAD. This is the requirement not to invent a second liveness notion, and
persisting the array satisfies it structurally rather than by discipline.

### The window is 5 minutes ending 2 minutes ago — and that must be on screen

`span = max(deadMinutes 5, reviveMinutes 2) = 5`; slots run t−6 … t−2
(`:195-199`). The most recent minute is excluded on purpose — an unsettled
minute undercounts.

**He holds for seconds.** A picture of t−6…t−2 is still enormously better than a
cumulative figure covering the whole morning, but it is NOT "now", and a
sparkline reads as now unless it says otherwise. Label the span.

**If he wants a longer visual, lengthen ONLY the display array.** The judged
window is fixed by completed backtesting (`:12`, "must not be windowed"). A
display array and a verdict window are different objects; widening the second to
serve the first would silently redefine ACTIVE.

### The gap in the ask, which needs his answer

He said "going up **and** has some volume" — TWO claims. Trades-per-minute
answers volume only. Direction needs minute CLOSES, a second series the activity
engine does not compute. **Scope decision, his:** one sparkline of activity, or
activity plus a direction mark. I would not silently render trade count and let
a rising line read as a rising price — the shapes are indistinguishable and the
mistake is expensive.

### DEAD versus quiet versus not-measured

Three states, and only the third is a trap:

| State | Window | Renders |
| --- | --- | --- |
| ACTIVE, quiet | low bars | the bars — low is information |
| DEAD | at/below the dead line | the bars; the graveyard already owns the verdict |
| UNKNOWN | `[]` (`:191`) | **"not measured" — never a flat zero line** |

An empty window means no minute bars were observed. Drawing that as a flat line
would show "no trading" where the truth is "not looked at" — the `wired`
distinction again, and a flat line is the most confident-looking null there is.

### The claim boundary

**Descriptive only.** A picture of the last five minutes is falsifiable against
any chart in seconds, so it needs no study. **The moment it becomes a colour
verdict, a score, or a rank, it claims prediction** and inherits the bar the dial
had to clear. Show what happened; do not grade it.

### Not a constraint: retention

Pruning is by trading DATE (`pruneMinuteBars`, `repo.ts:207`), so the whole
session is retained intraday. Moot anyway if the array is persisted.

## SCOPE — sparkline on every row, and the focus separation (2026-09-04)

### 1. The data reaches the board today — nothing to plumb

`fce254c` landed `activity_window`, and `repo.ts:451` maps it to
`activityWindow` on `DemandState` — the SAME type `merge.ts:19` imports. So
`row.demand?.activityWindow` is already on every board row. **No store change,
no mapping, no new query.** Pure surface work.

Its stored semantics match what the scope asked for, verbatim in `db.ts:182-194`:
the array is the one the verdict came from, NULL means not-measured, and a DEAD
row's zeros are a real measurement that must not share a representation with it.
`repo.ts:444-451` maps NULL to `undefined` rather than `[]` for that reason.

### THE FINDING THAT DECOUPLES THE TWO SURFACES

**Minute bars are whole-market, not per-subscription.** `minuteTrades` is filled
from the bar stream (`engine.ts:913`), which covers every tracked name — not
from the tick feed the top 5 will get.

**So a sparkline on rank 25 is exactly as good as one on rank 1.** The tick
change does not improve the sparklines of the names it subscribes, and the two
surfaces do not interact on data quality.

That mattered enough to check: had ticks fed the sparkline, twenty-five
identical-looking charts would have carried two different resolutions, and
nothing on screen would have said which — the worst class of surface, because
the reader cannot see the seam.

### Empty is a first-class case, not an edge

`tradeCount` is recorded ONLY when the feed supplies it (`engine.ts:907-913`) —
a null is "not reported" and is deliberately not written as 0. So absence has
two upstream causes before it ever reaches a row, and the count of board rows
with a populated window is unknown. **Design the empty state as normal.**

| Value | Meaning | Renders |
| --- | --- | --- |
| `undefined` | not measured | an explicit absence — never a line |
| all zeros | measured, silent | a flat line at zero, truthfully |
| low numbers | alive and quiet | the bars |

### 2. The focus separation — two things currently sharing one mechanism

Today Focus is a MANUAL PIN: `focusStore.ts` is the one place the browser writes
rather than the worker, seeded once per trading date from A-priority candidates
(`:122-131`), capped at `focusMaxTickers` 6 (`config.ts:84`).

His change separates them: **what the engine watches closely follows rank
automatically; what HE has decided to watch stays a human act.** Scope it as the
separation, not as a number.

**The design hazard is CHURN.** Rank oscillates. If board membership of the
automatic top 5 is rendered as a badge, it will flicker on and off rows as ranks
cross — motion in the one row he is scanning, carrying no decision. **Either
render the subscription state quietly or not at all.** It is an engine fact, not
a trading fact, and he did not choose it.

**And the claim boundary bites harder here than on the sparkline.** A sparkline
he reads is description. A top-5 marker presented as "these are the ones worth
watching" is a RECOMMENDATION and inherits the dial's bar. Rank is an existing
fact and may be shown; endorsement is not. The safe form: show rank, let the
subscription be invisible or near-invisible, and let HIS pin be the only thing
on screen that says a name matters.

**Cap:** 5 fits inside 6 with room, and this design needs no more. Not proposing
a change — ticks are every trade and quote through the one SIP connection that
IS capture, and nobody has measured whether 6 is a ceiling or a cautious default.

## SCOPE — a float that fails the desk's own check (2026-09-04, not built)

INLF reads `6,109 displayed; ~1.05M SO` — 0.58% of shares outstanding, under the
2% `UNIT_MISMATCH_RATIO` (`float.ts:82`) that calls a float a UNIT ERROR rather
than a small float. **A live row.**

**The error direction is what makes this a safety decision.** Pillar 5 is float
under 10M. 6,109 does not merely pass it — it is the most bullish structural
reading this desk can produce. A float wrongly too LARGE makes him skip a name;
a float wrongly too SMALL puts him IN one.

### I agree it must not stand as a bare number. I disagree with suppression.

**Suppressing it collapses a DETECTION into an ABSENCE.** The board already
shows "unknown" on the names with no float at all. Blanking a UNIT_MISMATCH
makes the strongest structural finding the desk has ever made look identical to
never having looked — the wired-versus-empty error, in the one place where the
desk actually knows something.

**So: replace the number with the verdict, do not annotate it.** The cell must
read as a PROBLEM whose evidence happens to include digits, never as a number
wearing a caveat. `6,109 ⚠` still scans as 6,109; the mark is what gets lost at
a glance, and the glance is the whole risk.

Three renderings, all distinguishable:

| Case | Renders |
| --- | --- |
| Float, checked, consistent | the number |
| Float, checked, FAILS | the verdict, with both figures as its evidence |
| No float | "unknown" — unchanged |

### The two consumers that amplify it, and neither is on screen as a float

**Float sort** (`view.ts:317`) returns `row.displayedFloat`. A suspect 6,109
sorts to the **top of a tightest-float sort** — the single most dangerous place
to put a number the desk believes is wrong.

**Turnover** (`derive.ts:133`) is `volume / displayedFloat`. INLF's ratio is
172:1, so a float 172x too small makes turnover **172x too large** — and high
turnover is another bullish reading.

**Both must drop the value, not caveat it.** A verdict rendered in the float
cell while the sort and the turnover still use the number would be a caveat that
does not travel — the exact shape of the masked risk chip, where a gate read one
field and the value it gated read another.

### The check is valid HERE for a reason that did not hold before

Item 28 recorded that this pair could not be assembled: float from a live read,
share count from a days-old dossier, "asynchronous by construction". **The
trader dissolved that by changing his own sheet format** — both halves now
arrive in one cell, one source, one instant.

That distinction is load-bearing and I got it wrong once before: the same source
at one instant proves inconsistency; across sources with different as-of dates
it proves nothing. **This is the first case.**

### The open question, which is Research's

`assessFloat` expects a `FiledShareCount` — `shares`, `asOf`, `concept`,
`sourceId`. The Sheet's SO figure has **none of those**. Its freshness gate
exists because a stale denominator produces a false verdict, and a same-cell
figure has no date to gate on.

**Do not fabricate an `asOf` to make the types fit.** Either the sheet pair gets
its own narrow check — internal inconsistency between two numbers one person
wrote at one instant, which needs no freshness at all — or `FloatClaim` gains an
explicit sheet-pair provenance. My surface consumes a verdict either way, but
the answer changes which verdicts are reachable, and `IMPOSSIBLE` and
`CANNOT_VERIFY` both depend on the denominator's age.

## The float pair is BLOCKED on one field, and a wrong one sits beside it (2026-09-04)

Agreed with Research on placement: **null the value at `resolveDisplayedFloat`,
not at the consumers.** Verified it does not cost the detection —
`resolveDisplayedFloat` (`merge.ts:143`) returns only `{ value, source }` and
reads `.float.value`; the raw string lives on `.float.raw` and is untouched. So
the number is refused where it would be COMPUTED WITH, and the verdict cell
still renders in full. Sort and turnover then have nothing to use without either
having to remember, which is the masked-chip shape closed structurally.

### Blocked: the same-cell share count reaches no row

`sheetSharesOutstandingField` (`normalize.ts:225`) parses the SO figure out of
the float cell. **It is called from nothing but its own test.** Both row
builders use `floatField` alone (`rows.ts:295` TODAY, `:350` RESEARCH), so the
pair cannot be assembled at the resolver. Built and unwired — the third tonight.

The fix belongs in `lib/data/rows.ts`, not here. Re-parsing `float.raw` inside
`lib/dashboard` would put sheet grammar in the wrong layer and give it a second
implementation to drift from.

### THE TRAP: there is already a `sharesOutstanding`, and it is the wrong one

`StructuralResearch.sharesOutstanding` (`types.ts:170`, built at `rows.ts:353`)
is **column 11 — a separate cell**, with its own `floatSourceDate`. It is not
same-instant with the TODAY float cell.

**Whoever wires this will reach for it, because it has the right name and the
right type.** Using it silently resurrects item 28's objection: float from one
cell, share count from another, written at different times — asynchronous by
construction, which is exactly the objection the trader's format change
dissolved and the ONLY reason the check is sound.

**A same-instant pair must come from ONE cell.** The check's validity is a
property of provenance, not of the two numbers, and nothing in the types
distinguishes the safe field from the unsafe one. That distinction has to be
carried by a name or a comment, or it will be lost.

## FOLLOW-UP SCOPE — say TRANSPORT when transport failed (2026-09-04, not built)

`e67e89d` relabels the placeholder from `Market: worker offline` to
`Market: not loaded`. That fixes the FLASH. **It does not fix the persistent
case, which is the one that misattributes.**

When `/api/market` fails, `useMarket.ts:49-54` sets `transportError` and never
touches `snapshot`, so the placeholder stands. The browser cannot reach the
desk — and the header names the MARKET WORKER, a different subsystem with a
different remedy. `transportError` is set and sitting unused by these
placeholders.

**The remedy the wrong label implies is actively harmful here.** Restarting the
market worker drops and re-establishes the SIP connection, and that connection
IS capture. A false "worker offline" during premarket invites him to break the
thing it claims is broken.

So: when `transportError` is set, the header should say the DESK IS UNREACHABLE,
not that a worker is down. Three states, not two — reachable-and-loading,
unreachable, and a real worker verdict from `health.ts`.

### The premise this corrects

The stand-down reasoning was that a persistent failure arrives with an obviously
broken board, so the cost is a wrong diagnosis on a desk he can already see is
dead. **`/api/market` and `/api/dashboard` are separate fetches** —
`useMarket.ts:39` and `useDashboard.ts:66`, different hooks, different routes,
and `/api/dashboard` does not read the market store.

So `/api/market` down with `/api/dashboard` up renders a **fully populated
board** — tickers, float, catalyst, structure, warnings — with stale or absent
telemetry and a red header naming the wrong subsystem. That is not an obviously
broken desk; it is a working-looking one.

**And that split is not hypothetical: it is what happened last night.** The
deploy failed on a LOCKED market database — exactly the condition that fails
`/api/market` while `/api/dashboard` serves normally.

## SCOPE — the placeholder family, as ONE change (after Friday's close)

Three rounds, three fixes, siblings missed every time. **Fixing one at a time is
what produced three rounds.** The remaining work goes in as one piece.

### Two still live, and one is louder than anything fixed so far

**`OFFLINE_HEALTH` (`:49`)** — the raw object directly above the view I
repaired. `offline: true` reaches `marketOffline` and renders, at
`DiscoveryBoard.tsx:259`: *"Market feed is not running. Discovery cannot
populate until it reconnects."* **Verbatim the claim my own commit said I had
removed**, one component over, as a full sentence instead of a label.

It also MASKS the phase defect: `marketOffline` takes priority at `:255`, so the
`sessionPhase === 'CLOSED'` branch at `:260` is unreachable from the
placeholder. Fixing the phase alone would change nothing on screen.

**`OFFLINE_DISCOVERY` (`:135`)** — not one lie, seven. Beyond `sessionPhase`,
`eligibleCount: 0` and `trackedCount: 0` render at `DiscoveryBoard.tsx:188` as
**"0 eligible · 0 tracked"** — a MEASUREMENT, STATED, FROM NO MEASUREMENT — and
no phase change touches it. Also `tradingDate: ''`, `rankedCount`,
`baselineCount`, `calculatedAt`.

### The fix is a NULLABLE PROP, not a new enum member

Research measured both. Adding `'UNKNOWN'` to `SessionPhase` produces ONE
compiler error; every other reader compiles clean and answers WRONGLY —
`isMarketDataExpected` returns false for UNKNOWN and yields IDLE, the exact
answer the change existed to prevent. `market.snapshot?.discovery ?? null`
produces TWO errors, both at prop sites in `DashboardShell`, so **the compiler
stops it at the boundary.**

`DiscoveryState | null` through `DashboardHeader`, `MarketStatus`,
`DiscoveryBoard`. `SessionPhase` does not change.

**The framing, Research's and worth keeping in the comment: UNKNOWN IS NOT A
PHASE OF THE MARKET, IT IS A PROPERTY OF THE OBSERVER.** The market always has a
phase; the browser has sometimes not loaded.

### The end state is that these constants stop existing

A nullable prop represents "no data" as null rather than as a fabricated object.
Then there is nothing to lie. **Policing the placeholders is worse than deleting
them** — and this is the fifth time tonight the answer has been to make the
wrong state unrepresentable rather than to keep it honest by discipline.

### MY ENUMERATION TEST IS AIMED ONE STEP SHORT, AND THAT IS THE BEST FINDING

It extracts every `OFFLINE_` constant by pattern and asserts the exact five
reviewed — so **it proves they were ENUMERATED, not that they were FIXED.** Two
of the five assert faults from no observation right now and the test is GREEN.

Same shape as my vacuous checks: the test runs, passes, and answers a question
that does not cover the defect. **The assertion has to be about what each
constant CLAIMS** — no fault label, no stated count, no market-state assertion —
not that the set is known. If the nullable fix lands, most of it becomes moot,
which is the better outcome than a stricter police test.

## The placeholder family, part 2 — the UI ruling and the split (not built)

**My test asserts an absence that is false one file over.** It runs
`not.toContain("label: 'Assessments: scheduler offline'")` against
`components/DashboardShell.tsx`. The literal lives at `lib/desk/view.ts:70` and
`:83` and reaches production through `readModel.ts:217`, where `OFFLINE_PANEL =
emptyAssessmentPanel()` takes no override.

**Absence of detection is not detection of absence — in a test written to catch
that class, and it is green.** My fix went to the CALLER (spread the panel,
override the scheduler) rather than the source; the server path calls the same
function with no override. One function, two callers, one fixed.

### The UI ruling asked of me: can the shell render nothing until a snapshot exists?

**Yes — but "render nothing" is the wrong target, and choosing it would repeat
tonight's mistake in a new costume.**

The board's data has TWO sources. `/api/dashboard` (sheet: tickers, float,
catalyst, structure) and `/api/market` (telemetry, discovery, health) are
separate fetches from separate hooks. **A blank page while the sheet half is
fully loaded would discard real data and claim less than the desk knows** — the
mirror of claiming more, and equally false.

So the ruling is per-element, not per-page:

| Element | Source | With no snapshot |
| --- | --- | --- |
| Rows, float, catalyst, structure | `/api/dashboard` | render normally |
| Counts, session phase, health, discovery | `/api/market` | explicit not-loaded |

**Every element sourced from the absent snapshot says so; every element sourced
elsewhere renders.** That is achievable and it is stronger than blanking,
because the failure it prevents is the one that actually occurs — a populated
board with a header describing a different desk.

### `OFFLINE_PANEL` cannot simply be deleted — it serves two meanings

`readModel.ts:366` and `:545` return it AFTER the store failed to open or read.
**That is a real observation and an honest fault verdict.** Only the
`buildAssessmentPanel` early return — `!assessmentTablesPresent(db) ||
!options.tradingDate`, with the DB OPEN and fine — is the family.

So the change is a SPLIT, not a removal: keep a fault panel for the failed
store, return null for not-observed. **A constant used for both a fault and an
absence is the whole bug in miniature**, and deleting it wholesale would turn a
true verdict into silence.

### Research's test form supersedes the one I was given

I was told to assert what each constant CLAIMS. **That is enumeration-by-memory
one level up** — and enumeration-by-memory is what produced rounds two and
three. The stronger form: **a test asserting there are NO placeholder constants
cannot silently pass a new lie; a test asserting there are exactly the five
known ones always can — and just did, twice.**

If the nullable fix removes the category, the assertion becomes emptiness and
the problem dissolves rather than being policed.

### Root cause, uniform, and worth the comment

Every one of these is forced to pick a value from a type that cannot express NOT
OBSERVED, and each picks the most plausible-looking one. **`eligibleCount:
number` cannot say "not counted", so it says 0 — and 0 is a MEASUREMENT.** Not
fixable by choosing better constants; only by making absence representable.

## The price sparkline's sparse case — no threshold, and no gradient either (not built)

> **PROVENANCE (2026-09-05, answered — and the risk is NOT the one I first
> recorded).**
>
> **The window is clean.** Research measured 11:00–14:00 UTC — his 07:00–10:00
> ET — and got **180 of 180 minutes on both 08-17 and 08-18**. Every gap in that
> store falls outside the traded window, and the gaps are not a defect at all:
> the local worker was stopped and restarted three times. Nothing in production
> is implicated. **My earlier warning named the hole, and the hole is not the
> problem.**
>
> **The store is.** These were measured on `data/market.db` — **the LOCAL
> split-brain desk, not production.** AWS has been production since 08-17, and a
> second SIP connection is a documented hazard in its own right. So these
> percentages describe **a desk running alongside the one he trades on.**
>
> **And a frozen one.** That store was last written **2026-08-20** — sixteen days
> stale. In the window where it recorded nine events, production recorded
> **10,489**. So it is not merely a different desk; it is one that stopped, and
> the divergence is three orders of magnitude on the one comparison anyone has
> taken.
>
> **Directionally right; not the numbers.** Re-take on production's minute bars
> once Monday's capture fills, before any of them reaches a rendered figure
> rather than an argument.

Research's finding stands and I am not arguing with it: **coverage is a FIDELITY
measure being recruited to answer a RELEVANCE question.** It honestly answers
"how much of this line did the fill rule draw" and says nothing about "is this
row worth looking at".

### A caveat that names the wrong mechanism can be DISCHARGED by the wrong answer

The first version of this warning said the risk was the 08-18 hole. Research then
established the window is clean — **and on that answer alone the warning would
have been deleted, taking the split-brain problem with it silently.** The
percentages would have read as verified BECAUSE a question that was never the
real one came back negative.

**A caveat is only as good as the mechanism it names.** Where the mechanism is
uncertain, say what is unverified rather than why — "measured somewhere whose
provenance is unconfirmed" cannot be discharged by clearing one candidate cause.

### The two loads are separable, and only one depends on the numbers

**THE COUNTEREXAMPLE — robust, and it carries the conclusion alone.** A name
trading 29,379 times inside a handful of minutes **is not a fidelity problem at
any coverage figure.** Whatever its true percentage turns out to be, a threshold
computed on coverage would suppress it, because coverage is not what makes it
worth looking at. **This survives whatever the archive question decides**, and it
is sufficient on its own to reject a threshold.

**THE BAND ARGUMENT — dependent, and quarantined.** "Two opposite populations
share the 20% band" — TGL barely trading at 3% against AIXC trading violently at
8% — needs the percentages to be right about WHICH band each row sits in. **If
the figures move, this argument moves with them.** It is the more vivid of the
two and the more fragile, which is exactly the combination that gets quoted.

Same for "a cut at 40% would have dimmed three of the most heavily traded rows":
the DIRECTION holds, the COUNT of three does not, pending the same answer.

Relevance is already answered beside it, by a different measurement: the
activity series.

### The gate is rejected — and so is its smooth twin

**The obvious next idea after "no threshold" is a GRADIENT: opacity tied to
coverage.** That is the same error made continuous instead of stepwise. AIXC
would render at 8% opacity — suppressed just as effectively as by a cut, and
harder to notice because nothing declares a rule. **Reject the gradient with the
threshold.** Sparsity is rendered per-segment, never as a property of the whole
line.

### The mark type IS the claim, and a line is the wrong one here

**A line asserts continuity between its points. Discrete marks assert only the
points.** At 8% coverage a dashed or dimmed line is still 92% non-data wearing
the shape of data — the reader's eye follows the stroke, not its texture.

So the honest mark for a sparse row is **points at traded minutes**, not a
styled line. That has three consequences worth the build:

1. **The first-traded-minute rule becomes STRUCTURAL rather than enforced.** No
   trade, no point — so a line cannot start at the window edge, because there is
   no line. The rule that 36-42% of top-12 rows depend on stops needing a
   guard.
2. **It aligns with the activity sparkline directly beneath it.** Price gaps and
   activity gaps land on the same minutes, so the reader can SEE that the
   absence is corroborated by a second, independent measurement.
3. **The burst pattern becomes visible rather than degraded.** Which is
   Research's point below.

### Sparse-and-violent is a PATTERN, not a defect

AIXC at 8% coverage with 2,099 trades per covered minute is close to what he
originally asked for: RVOL is cumulative and cannot say what is active NOW, and
a row that is mostly silent and violent in bursts is a distinct thing.

**Do not design the sparse case as degradation only.** Not building on it — but
a rendering that treats sparsity purely as damage would erase the signal while
apologising for it, and that decision gets baked in at the mark type, before any
of it is measured.

## SCOPE — the one-sided-search warning and dated citations (post-close bundle)

CMND, live, up 18.8%: the card reports a $696k conversion (SUPPLY, an SEC
filing) and misses a robotics acquisition (DEMAND, not an SEC filing). The
SEC-only coverage asymmetry, on a real row, in his window.

### What my layer can and cannot fix

**"COUNTERBALANCED BY" IS NOT IN THIS CODEBASE.** It is model-authored prose
inside the dossier text. So the sentence asserting the two sides were WEIGHED
cannot be corrected here — **Design can annotate the card, not rewrite the
claim.** The durable fix is at the prompt: an interpreter that knows only SEC
was searched must not reach for the vocabulary of balance. That is Research's.

I am flagging this because it is the shape I REJECTED for the float — a caveat
beside a confident claim rather than a claim that does not overreach. The
difference that makes it acceptable here: the float was a NUMBER scanned at a
glance, where a mark gets dropped; this is PROSE he reads, where a line above it
is read too. **Weaker than fixing the source, stronger than nothing, and not a
substitute for the prompt change.**

### Renderable today, verified

- `coverageIncomplete` is on `row.intelligence` and already consumed at
  `deskRead.ts:586`, with a qualifier string at `:471`. Boolean granularity, no
  persistence or schema change.
- `catalystEvidenceLatest` (`merge.ts:41-46`) ALREADY joins the cited evidence
  ids against `intelligence.evidence` filtering on `link.publishedAt`. The join
  exists; nobody rendered the date. `publishedPrecision` rides with it.
  Only `fetchedAt` is genuinely missing from the projection.

### The copy constraint, which decides whether this helps or harms

**Not "our coverage is incomplete".** That is a data-quality apology and it
invites him to discount the whole row — including the supply side, which was
searched properly and is correct.

**"The other side of this was not looked for."** A fact about the SEARCH, not a
confession about the desk, and it tells him where to go. Same distinction as the
header placeholder: name what was not observed rather than assert a state.

### Leave room for LAST CHECKED beside LAST CHANGED

`interpretTicker` returns `REUSED_UNCHANGED` on an unmoved fingerprint without
minting a version, so `generatedAt` stays old. **"3d" is therefore ambiguous
between two OPPOSITE facts** — nobody looked for three days, or looked TODAY and
found nothing because only SEC is searched. On CMND it is the second.

Staleness and blindness are different failures with different fixes, and the
card renders them identically. The repair is two dates, not one; the second
needs a projection change from Research. **Design the citation block to take a
second date now** rather than retrofitting it.

### And his framing is the rule for the dates

**The observation is a DATE. Whether three days is fresh is an OPINION** — and
his differs from the model's. Show the date, do not grade it. Same boundary as
the sparkline.

## The coverage ladder has FOUR rungs (for the warning, when it is built)

1. **No route known** — no IR or newsroom address at all. 69% of issuers.
2. **A route known but not durable** — a homepage, not a listing page. The nine
   names where the desk believes it can see and cannot.
3. **A DURABLE route that returned nothing.** 34 of the archive's 43 hold a
   verified FEED or INDEX address and collected nothing from it.
4. **Both sides genuinely searched.**

**Rung 3 is the alarming one and the only state that indicts the DESK rather
than the ISSUER.** "Searched and empty is evidence" is right, and this is its
strongest form: not merely that we looked, but that **we looked somewhere we had
verified was the right place** and came back with nothing.

**And CMND sits in a fifth position none of these name.** Verified live: it has
a `COMPANY_NEWSROOM` source whose URL is a `/news-release/<slug>` LEAF ARTICLE —
the very release the card quotes. A route is known, it returned something, and
what it returned is the same thing as last time. **Invisible to any count of
sources**, and `coverageIncomplete` reads FALSE, so the warning would have been
silent on the one name that needed it.

## Two consequences for the surface, from the CMND mechanism (2026-09-04)

**RETRACTED 2026-09-04 — the expiry mechanism does not explain CMND, and I
should not have accepted it over my own read.**

CMND's article is `eventTimestamp 2026-09-01`, read on the 4th: **THREE DAYS
OLD, against a 45-day expiry.** Nothing had expired, and ageing undated items by
first-seen would have KEPT it, correctly. Checked the subtraction myself this
time.

**My ORIGINAL diagnosis was right and I let a better story displace it.** The
stored source is a `/news-release/<slug>` LEAF — a collection point that can
surface exactly one article, forever. The desk reads one real, recent release
and concludes nothing else happened. That is the whole CMND story.

**The lesson is mine, not Research's:** I had seen the leaf URL with my own eyes
in a live read, then accepted a mechanism that explained a DIRECTION as though
it explained THIS ROW. A mechanism that fits the shape of a failure is not
evidence about the instance in front of you — and I had the disconfirming date
in my own message.

**What survives:** the feed half. A feed's entries carry the ISSUER's dates,
which can be months old whatever the store's age, so dated-entries-expire still
explains the 85% of feeds that collected nothing. And the undated-immortality
defect is REAL but LATENT — all 87 undated company sources were first seen
within 4 days and production began 08-17, so nothing reaches 45 days before
about 2026-10-01.

### The fourth-state predicate needs `contentHash`, not `documentFingerprint`

`documentFingerprint` is `hashContent('company|' + url)` — **over the URL, not
the body.** It reports "same document" for a page whose content changed
entirely. So the "returned the same thing again" state cannot be built on it;
`contentHash` is the operative field.

**And the store cannot answer it either — this is not a projection gap.**
`insertResearchSources` (`researchRepo.ts:533,550`) is `INSERT OR IGNORE` on
`(ticker, document_fingerprint)`. **A re-collected article writes nothing at
all**, so there is exactly ONE observation per document, ever, and `content_hash`
is written once and compared to nothing.

So adding the hash to `EvidenceLink` (`view.ts:70-80`, nine fields, no hash)
would expose a value that CANNOT answer the question. **Frozen-content detection
needs forward instrumentation — a second observation that does not currently
exist** — wherever it runs. Not a render change at all.

### The bound and the pair will DISAGREE on most rows, and that is correct

The supply pair is present on 23 of 40 live dossiers and **22 of those 23 have
both `floorRatio` and `totalRatio` null** — a denominator and nothing else.

The float bound needs NO blocks: only the share count, its date and the split
factor. **So it produces an answer exactly where the pair is empty.** Laid out
together they will look inconsistent on most rows — one speaking, one silent —
and that is the two measures doing their jobs, not a defect.

**Design consequence:** they must not be laid out as a matched pair of numbers,
or the reader will read the silence as a failure of the row rather than as the
absence of established blocks. The bound answers "can supply exceed float"; the
pair answers "how much is proven live". Different questions, and only the second
is usually unanswerable.

## Two fixes that destroy each other silently (carry this to whoever writes either)

**The expiry fix needs `fetched_at` to remain FIRST-SEEN. Frozen-content
detection needs a LAST-SEEN.** If anyone repairs re-collection by UPSERTING
`fetched_at`, every undated item's age resets on each pass, **immortality
returns, and the field still looks correct.** Two repairs that are each right
alone, with no error raised and no test failing.

**The new column must be `last_seen_at`, never a mutation of `fetched_at`** —
and the comment belongs at the write site, not only in a scope document, because
the person who breaks it will be reading the write and not the plan.

### Refinement: re-collection is not why the leaf article persists

The bundle is rebuilt from `readSources(db, ticker)` (`collector.ts:640`) — from
the STORE, after the insert. So the leaf article reaches every pass because it
is a **persisted, append-only source**, not because collection re-presents it.
`INSERT OR IGNORE` writing nothing changes nothing here.

That matters for the repair: **stopping re-collection would not remove it.**
Even if the collector never ran again, `readSources` would return that row on
every pass forever. The fix has to be at what ADMITS a leaf as a collection
point, or at what can retire a stored source — not at the write path.

### And the guard that was fixed is not the guard that failed

CMND's source arrived via BOUNDED DISCOVERY, not the registry. The `sourceShape`
guard protects registry-resolved addresses, and this one never went through it.
**Whatever admits a leaf article on the discovery path is the repair**, and it is
different code from what was already fixed.

## Rung 3 is not one state — it is three, and only one indicts the desk

I recorded "a durable route that returned nothing" as the alarming rung, on the
grounds that it is the only state indicting the DESK rather than the ISSUER.
**That was true of the state as I described it and false of the population.**

Ops probed all thirteen never-collected feed names: **CUTOFF 6, OK 5, PARSER 2.**

| Probe result | What it means | Who it indicts |
| --- | --- | --- |
| CUTOFF | the feed parses and its newest entry is old — **a DEAD SOURCE** | the issuer |
| OK | fetched and parsed fine, and the desk collected nothing anyway | **the desk** |
| PARSER | the feed could not be read | the desk, differently |

**AKAN is the concrete case and it is on his screenshot.** Its newsroom feed has
not published since last November while the company files normally. **Nothing is
broken.** A warning saying "we looked and found nothing" would be true; one
implying the desk failed would be false, and it is the name he is looking at.

So the honest warning needs to distinguish **"the source is dead"** from
**"we failed to read a live source"** — and it can, because the probe's own
categories already separate them. Five of thirteen are a real collector gap.

**The design consequence:** a single "searched and found nothing" sentence
flattens an issuer problem into a desk problem. On a card he reads to decide
whether to trust a row, those point in opposite directions — a dead newsroom
means look elsewhere; a collector gap means the desk is lying to him about its
reach.

**And it re-rates rung 3 downward as an alarm.** 6 of 13 are dead sources, so
the majority of "durable route, nothing collected" is the issuer, not us. My
"only state that indicts the desk" framing overstated it by roughly two to one,
on a population I had not looked at when I wrote it.

## The activity indicator EXISTS — and what he asked for next is a different instrument

**Built and in HEAD:** `3921a50` (activity bars, trades/min, full height = the
active line) and `2b3ddd9` (minute closes as points above them, same slots).
Column header **"Now"**, beside RVOL because it is the correction to RVOL.
`DiscoveryBoard.tsx:508`.

### What is genuinely new: "direction, flat/up/down, colour coded for volume"

That is **a reduction, not a variant**. What is built preserves SHAPE — the eye
reads the arc. An arrow claims only the SIGN matters. Both are defensible; they
are not the same claim, and at row height the arrow is legible where a 5-point
series is small.

**But the colour half has a concrete collision, and it is not a taste
objection.** On a trading surface red and green already mean DOWN and UP. Encode
*volume* in colour while *direction* is encoded in the glyph, and **a
high-volume decline renders green** — the strongest bearish reading on the board
wearing the bullish colour. He would misread it at a glance, which is the only
speed this cell is read at.

If colour is used at all it must encode the SAME quantity the glyph does, or the
two conventions fight. Volume belongs in a non-colour channel — height, weight,
or the bars that already carry it.

### THE REAL PROBLEM IS THE GRAIN, AND HE SPOTTED IT HIMSELF

*"we already have ticks tho dont we? yes a two minute lag is kind of not good."*

**He is right and the number is exact.** `resolveActivity` judges slots t−6 … t−2:
`span = max(deadMinutes 5, reviveMinutes 2)`, offset by `settleMinutes = 1`. The
most recent point is **two minutes old, by construction** — the newest minute is
excluded because a minute still filling undercounts.

**He holds for seconds.** So no mark drawn from the minute table can answer
"what is active RIGHT NOW"; it answers "what was active two minutes ago", which
is still far better than a cumulative figure covering the whole morning but is
not what he asked for.

**That is a data-grain question, not a mark question**, and changing the mark
cannot fix it. Routed rather than designed around.

### The empty state is already designed, and already tested

`sparklineView` returns null for a missing window and renders an em dash, never
a chart; `pricePointsView` returns null and draws NO AXIS. A measured silence
renders a flat line at zero because there it is TRUE. So the `minute_bars`
outage does not block the design — it blocks live verification only, and the
absent case is the one path that is fully exercised without data.

## The x-axis is TIME, not sequence — verified, and it is why points beat a line

The `bars[peakIndex + 10]` trap — ten ROWS read as ten MINUTES — does not reach
these series. **Both map over the same wall-clock slot array**, built at
`activity.ts:122-124` as `minuteSlot(now - back * 60_000)`, one entry per minute:

- activity: `slots.map(slot => minuteTrades.get(slot) ?? 0)` (`:261`, whose own
  comment calls it the most important line in the file)
- price: `slots.slice(startsAt).map(slot => minuteCloses.get(slot) ?? null)`
  (`:153`)

**A missing minute OCCUPIES its slot; it is never skipped.** So even horizontal
spacing is not a claim here — it is the truth, because every position IS one
minute. `startsAt` is an index into that same array, which is why the two series
align without reconciliation.

### Gap and flat ARE distinguishable, and only because the mark is points

| On screen | Means |
| --- | --- |
| **No mark** at a slot | not observed — the minute did not trade |
| A mark **level with its neighbour** | traded and unchanged |

**A line could not express this.** It would interpolate across the gap and draw
the two identically — a stroke between two traded minutes asserts prices that
were never observed. That is a second, independent reason for points, arrived at
from a direction I had not considered when I chose them.

**Honest caveat:** at 4px slot pitch and 2px dots, a ONE-minute gap inside an
otherwise flat run is a small visual difference. It is correct, not
prominent — worth knowing before anyone reads a single hole off the row rather
than the shape.

## SCOPE — the stale-universe signal (2026-09-05, not built)

Checked the tree first: **no `universeFresh`/`universeStale` anywhere.** Not
built. The sibling `universeMode` renders at `MarketStatus.tsx:150` as a warn
badge whenever it is not `FULL`, so there is an existing pattern to reason from.

**The difficulty, stated exactly:** a board missing names looks IDENTICAL to a
quiet morning. A missing name is invisible by construction, so **the indicator
is the only thing that can say the absence is not real.** He cannot ever detect
this himself from the rows.

### NOT the market indicator, and this is the load-bearing decision

The market light answers **"is the feed working"**. A stale universe is not a
feed fault — the feed is streaming perfectly, delivering correct data about the
**wrong set of names**. Folding it in would make a HEALTHY feed render degraded,
which is two different facts under one light: the exact conflation removed from
this header three times this week.

It would also train him to distrust the market light for a reason it is not
about, which is how a real feed warning gets ignored later.

### NOT diagnostics either

The whole property of this failure is that it is **undetectable from the board**.
A signal he must go and look for requires him to suspect first — and there is
nothing to suspect from. Diagnostics-only is equivalent to no signal.

### So: its own marker, ON THE COUNTS IT INVALIDATES

The Discovery header already renders `N eligible · N tracked`. **A stale
universe means those numbers are yesterday's**, so the marker belongs on them —
the same rule as the provenance warning sitting at the figures and the
interpolation note sitting at the point of temptation. **A caveat belongs on the
thing it qualifies**, not in a corner of the chrome.

### THE STATE MODEL — and UNKNOWN is not one state

Integration's constraint is right: **UNKNOWN must not degrade**, because a signal
that alarms on every cold start gets ignored and takes the real one with it.

**But "UNKNOWN is benign" is the `state === 'LIVE'` error again.** Cold start at
04:00 is expected. **UNKNOWN still present at 06:55 on a trading day is not the
same fact** — it means no roll has been recorded when one should have been, and
that is indistinguishable in consequence from STALE. Nominality is
CLOCK-RELATIVE here exactly as it was for the market light.

| State | Before a roll is due | After a roll is due |
| --- | --- | --- |
| FRESH | silent | silent |
| STALE | speaks | speaks |
| UNKNOWN | **silent** | **speaks** |

Which needs a "a roll should have happened by now" reference. The 22:00 roll
sets the trading date, so by the time the premarket window opens a roll for
today's date should exist. **That predicate is Ops's to supply** — I will not
infer it from a clock in the component, which is how the last one went wrong.

### The copy: name what is MISSING, not that something is wrong

**"Universe stale" is engine vocabulary.** What he needs is that **the board may
not contain everything that gapped** — the SGRX case, a 53% move the desk could
not see.

And it must **show its own evidence rather than asserting a verdict**: render the
universe's AS-OF DATE, not just a status word. *"Universe from Friday"* is
checkable against something he already knows; *"STALE"* is a claim he must
trust. The graveyard's lesson — a surface that can be wrong should carry what it
would be wrong about.

**It must not offer a remedy he cannot perform.** Refreshing the universe is an
ops action. The honest line names the consequence and its scope and stops.

### Prominence is affordable IN PROPORTION TO RARITY

"Do not make it subtle enough to be missed by someone with no reason to look for
it" reads as a tension with this thread's own rule — a light shows words only
when it is not nominal, and the header audit spent two rounds reclaiming space.

**It is not a tension, and seeing why sets the level.** The two constraints are
the same constraint: **a marker that fires rarely can afford to be loud; one
that fires daily cannot.** STALE is a defect condition and should be rare, so it
can be prominent. UNKNOWN-before-a-roll-is-due would fire on **every cold
start** — and spending the prominence budget there is precisely what makes the
real one ignorable in November.

So the silence rules are not a competing concern to be traded against loudness.
**They are what PAYS for it.** Every state that correctly says nothing is what
lets the one that speaks be impossible to miss.

That also gives a test for any future addition to this marker: **if it would
fire on a normal morning, it does not belong in this channel at any volume.**

### What I would NOT do

**No dismissal, and no auto-clear on a timer.** The failure is silent and lasts
the whole session; a marker that can be dismissed at 06:55 is gone by 07:15 when
the name he missed is running. It clears when the universe refreshes, and on
nothing else.

## SCOPE — colour on the activity bars (2026-09-06, not built)

**Checked the tree first:** no colour exists. Bars are `bg-ink-2`, dimmed to
`bg-ink-3/50` when silent; price dots are `bg-accent`. Nothing to displace.

> **ASSUMPTION, STATED SO IT IS CORRECTABLE IN ONE WORD: COLOUR ENCODES
> DIRECTION, NOT VOLUME.** Green up, red down, yellow flat. He said "color code
> it, green, yellow, red" without saying what it encodes. Volume-in-colour is a
> defect on this surface — red and green already mean DOWN and UP, so a
> high-volume decline would render GREEN, the strongest bearish reading wearing
> the bullish colour. If he meant something else this is a one-line change to
> the mapping, not to the design.

### 3. ONE COLOUR FOR THE ROW — and it is an observation, not a verdict

Integration framed per-row as "a claim you are making" and per-bar as "an
observation you are showing". **I think that dichotomy is not quite right, and
the refinement decides the answer.**

The sign of *(last close − first close)* is **arithmetic**, not judgement. **The
only claim in the whole thing is the flat band** — so if the band is DERIVED
rather than invented, per-row colour is an observation too.

Per-bar is rejected on four grounds:
1. **The bars encode ACTIVITY.** Colouring them by DIRECTION puts two
   independent variables on one 3px glyph — a bivariate encoding at a size that
   cannot carry one.
2. **A minute that did not trade has no direction**, so per-bar creates a
   colourless state that fragments the row.
3. **The price dots already carry per-minute direction, in position.** Per-bar
   colour duplicates that in a second channel while the bar's height says
   something else entirely.
4. He said "color code **it**" — the mark, singular.

### 1. FLAT = THE MOVE IS INSIDE THE SPREAD

Yellow needs a definition and **any percentage I pick is invented** — a
threshold that does not declare itself, which is the failure this thread has
rejected twice.

**`spreadPct` is already on telemetry** (`telemetry.ts:50`, from the live
quote). So: **flat means the window's move is smaller than the current spread**
— *a move you could not have captured*. That is:
- **derived, not chosen.** No number of mine anywhere.
- **per-name correct.** A $2 and a $40 stock have different spreads, and one
  fixed percentage would be wrong for both.
- **meaningful to him** rather than to the engine — it says the move was not
  tradeable, which is exactly why he would want it dimmed.

**Caveat to carry:** the spread is CURRENT while the move spans t−6…t−2, so a
spread that widened after the window would misclassify. Directionally right,
and honest in a way an invented band is not. **If `spreadPct` is null there is
no band**, and that is the fourth state below.

### 2. A NON-TRADED MINUTE TAKES NO COLOUR — the question dissolves

Per-row means there are no per-bar colours to assign, so an untraded minute
cannot become a yellow bar. It keeps the measured-zero floor it already draws.

**But the fourth state is real and must not collapse into yellow:** with NO
price data, or no spread to judge against, there is **no direction to state**.
The bars stay neutral ink — **not yellow.** Yellow means *measured and flat*;
neutral means *no price to judge*. Same distinction as not-measured against
measured-silence, and the one this desk gets wrong most often.

| State | Colour |
| --- | --- |
| Move up, beyond the spread | green |
| Move down, beyond the spread | red |
| Move within the spread | yellow — measured, and not tradeable |
| No price window, or no spread | **neutral ink — no claim** |

## PROPOSAL — flush from high, for the trader after tonight's close (not built)

**The question in his terms, not ours.** A name 30% off its high is a different
trade from one at its high. **Today he cannot see which without hovering each
row, one at a time.** Nothing about §10 needs to enter it.

### THE MEASUREMENT DECIDES IT, AND IT IS NOT RARE

Read live from the desk, 2026-09-06, the current watchlist:

| | ISPC | GNLX | IPEX | ALTI | ATER | SLE | BRNX |
| --- | --- | --- | --- | --- | --- | --- | --- |
| flush | 0.0% | 10.6% | 11.3% | 13.4% | 26.9% | 42.3% | **75.9%** |

**SIX OF SEVEN ROWS CARRY A MATERIALLY NON-ZERO FLUSH**, spread from 10.6% to
75.9%. This is not a two-rows-a-day quantity, so hover is hiding something that
is true of nearly every row he looks at.

**Sample limit, stated: 7 rows, one snapshot, market closed.** Directionally
strong and small. Re-take at premarket before he decides if the count matters.

### THREE SEPARATE FACTS, AND THE TABLE CELL RECORDED ONLY ONE

1. **The desk's `retracementPct` is hover-only** — `cycleDetail`, a `title`
   attribute, and only when `> 0`.
2. **`givebackPct` renders NOWHERE.** It is computed at `cycle.ts:276` and read
   by no component. And **it, not `retracementPct`, is what the Sheet's column
   means** — distance below the high, rather than fraction of the move
   surrendered.
3. **The Sheet's own column does not parse.** `flushFromHighPct.value` is null on
   6 of 7 rows because the cell reads `"11.3% at $9.69"` — the level travels with
   the percentage and the numeric parser refuses the pair. Only `"0.0%"` parses.

**So the desk shows a DIFFERENT number from the Sheet's, in a hover, and the
Sheet's own is unusable as a number.** My audit cell said "drawer — hover only",
which was true of the wrong quantity.

### FOUR OPTIONS. THREE SPEND NO HEADER SPACE.

**A — Leave it. Argued honestly, not as a courtesy.** `retracementPct` already
decides the CYCLE PHASE, and the phase is on the board as a chip. So a name deep
off its high already reads BACKSIDE or OFF HIGH without a number. **If the chip
is doing the work, the number is detail and hover is its correct home.** This is
the strongest option if he reads the chip and not the figure.

**B — Put it in the cycle chip's own text.** `OFF HIGH · 42%`. No new column, no
new row of chrome — it uses space that is already spent and already his. The
chip currently carries a word where it could carry a word and a number.

**C — Colour or weight the existing chip by depth.** No text at all. Cheapest in
space, and the weakest: it re-encodes a number as an intensity, which is the
gradient-that-does-not-declare-itself I have rejected twice.

**D — A column.** Named for completeness and **not recommended.** He has
defended that space repeatedly and I have spent two rounds reclaiming it.

**My recommendation is A or B, and the choice between them is his**, because it
turns on whether he reads the phase chip as sufficient — which is a fact about
how he uses the board that I cannot measure.

### What must NOT ride this

Fixing (2) or (3) is separate work. **A proposal about where a number lives must
not arrive carrying a change to which number it is** — that is two decisions in
one sentence, and he would be approving the second without seeing it.

## DECISION REQUEST — which number goes in the cycle chip (2026-09-06)

He ruled **option B**: the figure goes inside the chip's own text. He has not
ruled WHICH figure, and the chip must now carry one.

### CONSTRAINT 3 FIRST, BECAUSE IT DECIDED WHETHER THIS SHIPS AT ALL: IT SHIPS

**The chip is fed from the desk's own arithmetic, not the Sheet.**
`deskRead.ts:528` builds it from `resolveComputedCycle(dossier?.computedCycle)`,
and both figures live on the `CycleArc` (`cycle.ts:276`, `:282`). **So the
unparsed Sheet column is irrelevant to this change** — it will not be blank on
6 of 7 rows, because it never reads that column.

### THE TWO CANDIDATES

- **`retracementPct`** — *fraction of the MOVE surrendered*, `(cycleHigh −
  close) / advance`. In the hover today.
- **`givebackPct`** — *distance BELOW THE HIGH*, `(cycleHigh − close) /
  cycleHigh`. Renders nowhere, and is what his Sheet column means.

### THE ARGUMENT NEITHER OF US HAD MADE, AND I THINK IT DECIDES IT

**`retracementPct` IS WHAT PRODUCES THE LABEL.** `cycle.ts:323` selects
BACKSIDE from `retracementPct >= backsideRetracement`; the word on the chip is
computed from that number and from no other.

**So a chip reading `OFF HIGH · 8%` with `givebackPct` shows a number that did
NOT produce the word beside it** — and the reader will take it as the label's
evidence, because that is what a number beside a word means. On the names where
the two diverge most, the giveback figure is the REASSURING one: a name based at
$1.00 that ran to $1.20 and sits at $1.10 has surrendered **half its move** and
reads **8% off its high**. That is `cycle.ts:73`'s own warning, and it appears
on exactly the names that have broken.

**A number that misexplains its own label is worse than either number alone.**

### THE ARGUMENT THE OTHER WAY, WHICH IS ALSO REAL

**His Sheet column is Flush From High and he has read it for months.** "42% off
its high" is his sentence; "gave back 42% of its run" is ours. **A number that
is correct and unfamiliar can be misread as the familiar one**, and at chip
width there is no room to disambiguate — `OFF HIGH · 42%` will read as *42%
below the high* whichever number is behind it.

**That is the strongest case for giveback and it is not a taste point: it is
that the label cannot be trusted to carry the distinction at that width.**

### MY RECOMMENDATION

**`retracementPct`, with a word.** `OFF HIGH · 42% back` or similar — the label
stays honest about its own cause, and one word does the disambiguating the
percent sign cannot. **If no wording fits, the answer is giveback**, because a
misread number is worse than an unfamiliar one.

**It is his call and the question in his terms is:** *when the chip says a name
is off its high, do you want the number to be how far below the high it is, or
how much of the run it gave back?*

### CONSTRAINTS 1 AND 2, ANSWERED

**1 — the empty state.** Show the figure **only when > 0**, exactly as
`cycleDetail` already does at `:92`. **The contradiction cannot arise for OFF
HIGH**: at zero retracement the phase is FRONTSIDE or DAY ONE, never OFF HIGH.
And **no cycle renders NO NUMBER AT ALL, never `0%`** — zero is a measurement
and absence is not.

**2 — the width.** No risk. The column is `w-[152px]` and already carries
**`CYCLE NOT ESTABLISHED` (21 chars)**. The longest label plus a percentage is
`FRONTSIDE · 42% back` at 20. **The worst case does not move**, so this cannot
cost a column by the back door.

## MEASURED — how often a live price exceeds the cycle high (2026-09-06)

Integration asked for a rate rather than an estimate before spending his
attention on a third option. **Measured with the desk's own `resolveCycle` over
the local daily bars — 75 symbols, 2026-03-26 to 2026-08-18, 1,152 symbol-days
carrying a cycle.**

For each symbol-day the cycle is resolved over bars SETTLED THROUGH THE PRIOR
DAY, then the next day's high is compared against that `cycleHigh` — which is
exactly the live-price-versus-stale-arc relationship.

| | count | rate |
| --- | --- | --- |
| symbol-days with a cycle | 1,152 | — |
| next high above `cycleHigh` (any phase) | 63 | 5.5% |
| **labelled OFF HIGH / BACKSIDE** | **876** | — |
| **…and next high above `cycleHigh`** | **24** | **2.7%** |

**So the contradiction is an EDGE CASE at 2.7%.**

### BUT THE RATE AND THE SEVERITY POINT OPPOSITE WAYS

The 24 are not marginal overshoots:

    CDTG  BACKSIDE  high 10.00 → 15.12   +51%
    CXAI  BACKSIDE  high 12.50 → 16.74   +34%
    CNET  BACKSIDE  high  1.42 →  1.70   +20%

**When it fires, it fires on a name up 20–50% through its own cycle high — and
labels it BACKSIDE.** That is the desk telling him a runner is finished on the
morning it runs. Rare, and wrong in the direction that costs him a trade rather
than merely confusing him.

**So rarity is not an argument for leaving it.** 2.7% means it does not need its
own elaborate design; the severity means it cannot render as OFF HIGH.

### LIMITS, STATED

- **Local frozen store.** Daily bars are REFETCH data so the split-brain concern
  is weaker here than for vendor figures — but it is one store and 75 symbols.
- **RESOLVED, AND IT IS A BOUND RATHER THAN A CAVEAT.** `types.ts:62-68`, already
  verified against minute bars by this desk: *"Alpaca's daily bar carries
  full-session VOLUME but regular-session OHLC."* **So the high is RTH-only and
  premarket highs do not appear in it at all.**

  **2.7% IS A FLOOR**, measured on the part of the session he does not trade.
  The true rate across 07:00–10:00 is higher and CANNOT BE LOWER.

  **A caveat that can only move a number in one direction is not a caveat, it is
  a bound** — and it should be reported as one, because a reader discounts a
  caveat symmetrically and a bound is not symmetric.

### RECOMMENDATION

**Integration's third option, in its plainest form.** When `telemetry.price >
cycleHigh` the arc no longer describes the name, so the chip should not assert a
retracement verdict. The condition is DERIVED — a live price above the high the
label was computed from — not a threshold anyone chose.

**What it must not say:** anything that reads as a defect in the new feature, or
as a verdict about the name. It is a statement about the ARC being out of date,
not about the stock.

**It goes to him as a proposal**, because it changes when OFF HIGH appears and
that is a material change to what the board presents.

## Separately — a live truncation defect, NOT part of this change

**`CYCLE NOT ESTABLISHED` is 128.2px against a 122px badge budget. It truncates
on his board today** and has done since it shipped. Found incidentally while
measuring; it is its own defect on its own merits.

**What it currently renders as is not yet measured** — the exact cut needs the
board up, and I will take it at the premarket read rather than estimate it,
having just been corrected for counting characters and calling it a measurement.

## NEW HIGH — answers to 2 and 3 before building (2026-09-06)

He ruled: *"change to NEW HIGH if the high is new, then as it drifts OFF just
move that spread."*

### 1 — WHAT TRACKS THE RUNNING HIGH: it already exists

`demand.sessionHigh` (`types.ts:325`) is the running session high, and
`telemetry.ts:127` carries it through **unmodified**. The premarket nulling I
found earlier happens only inside `buildLevelMap`, not on telemetry — checked,
because that trap has caught this desk once already.

So `runningHigh = max(cycleHigh, sessionHigh)`. **Nothing to hold, nothing to
add.**

### 3 — NEW HIGH IS A LABEL, NOT A PHASE. This is the one that had to be decided.

**Integration's two readings describe nearly the same set**, and the reason is
structural: **`cycleHigh` is settled-only, so the arc is stale with respect to
today for EVERY name.** Any name genuinely printing a new high today exceeds it.
"Repair label" and "real phase" are not two populations.

**But making it a `CyclePhase` would change behaviour he did not approve:**

- `view.ts:25-28` maps the filter directly onto `CyclePhase`. **A name at a new
  high would silently LEAVE the FRONTSIDE filter.**
- `countCyclePhases` feeds the segment counts at `DashboardShell.tsx:266`, so
  the header counts would move too.

**So the phase underneath is untouched and only the CHIP'S LABEL changes.**
Filters, counts and segmentation keep working off the arc exactly as today. That
is the difference between a display state and a taxonomy change, and only one of
them was approved.

### 2 — THE BAND, DERIVED: within a spread of the running high

**A band is genuinely required, and not for the reason it looks like.**
`runningHigh` is a MAXIMUM, so price can never exceed it — `price ===
runningHigh` is true only at the instant of the print and false immediately
after. **Without a band, NEW HIGH would appear for one tick and vanish.**

**The spread is the instrument, and it is the same one the colour uses:** off by
less than the spread is not off, because you could not have sold the difference.
Derived, per-name, and already precedent on this surface.

    newHigh   = sessionHigh !== null && sessionHigh > cycleHigh
    reference = newHigh ? sessionHigh : cycleHigh
    atHigh    = price !== null && (reference − price) <= spread

    label = newHigh ? (atHigh ? 'NEW HIGH' : 'OFF HIGH') : <the arc's phase word>

**Deliberately literal on "if the high is new":** the override fires only when
today's high has actually beaten the arc. A name merely sitting at its old cycle
high keeps its phase word — that high is not new, and reading his sentence more
broadly would put NEW HIGH on names he did not describe.

**And when it has drifted off, OFF HIGH supersedes a stale BACKSIDE** — the
second line then measures from the new high, which is "just move that spread".

**Tone follows the label when it overrides**, or NEW HIGH would render in the
`neg` colour of a stale BACKSIDE verdict — the label-and-number mismatch again,
one layer up.

## The 04:00 method, settled at 18:30 the night before

**I tried to pre-check read 1's premise on production tonight and COULD NOT.
The attempt was still worth it, for the method it settled and not the answer.**

**THE API PATH IS SCOPED TO THE TOKEN, AND THE OBVIOUS URL IS A 401.**

    /api/market                     -> 401, nginx, Basic Auth   <- NOT this
    /review/<token>/api/market      -> 200, the payload          <- this

The cookie jar comes back **empty** — the review capability is **path-scoped,
not cookie-scoped**, so `-c/-b` buys nothing and the token has to be in the URL
of every request. **Discovering that at 04:00 costs minutes against a board that
is changing while I read it.** Now it is written down.

**WHAT THE PRE-CHECK ESTABLISHED (18:28 ET Mon, production, `38e7d4b` live):**

| field | value |
| --- | --- |
| `discovery.sessionPhase` | `CLOSED` |
| `discovery.ranked` | **`[]` — 0 rows** |
| `discovery.tradingDate` | **`2026-09-08`** — already rolled past ET Monday |
| `health.universeFreshness` | `FRESH` |
| `health.universeRollDue` | `false` |

**THE MARKER READ IS PROVISIONALLY DISCHARGED**: `FRESH` with `rollDue: false`
means `universeWarning` returns null, the roll happened, and the date is
tomorrow's. **Provisionally, because a marker that is correctly silent on an
empty board has not been shown to fire on a full one.**

**AND READ 1 IS UNTOUCHED BY THIS, WHICH IS THE POINT.** `priceWindow`,
`activityWindow`, `spreadPct` and `sessionHigh` occur **zero times in the whole
payload** — not because they were dropped, **because there are no rows to carry
them.** An empty board cannot falsify a claim about row rendering. **I set out
to test the premise a night early and the honest result is that the premise is
still untested**, which is a different sentence from "checked and fine" and I am
recording it as the first one.

## Tuesday's fourth read — "FEW" IS NOT A PREDICTION, AND I ALMOST REPORTED IT AS ONE

**I had "expect FEW NEW HIGH rows" on record and it is worthless.** Few has no
threshold, so **every possible observation confirms it** — one row is few, twelve
is arguably few, zero is few. Integration's form of this is exact: **a number
predicted before a change is a test; the same number explained afterwards is a
story.** "Few" is a story pre-registered, which is the worst of both — it has the
*shape* of a prediction and none of the content, so it would have let me report a
pass at 04:00 without anything having been checked.

**I tried to replace it with a measured base rate and the data cannot produce
one. Both reasons matter and neither is "the file was missing".**

1. **The local store is frozen.** `data/market.db` stops at **2026-08-18** across
   every table — `ticker_session`, `daily_bars`, `minute_bars`,
   `desk_assessments`. Three weeks stale. Ops's sweep quoted 143,142
   `ticker_session` rows; this file holds **25,789**. Ops swept production; this
   is not it, and **a base rate computed here would have looked completely
   normal.**
2. **`ticker_session` COULD NOT ANSWER IT EVEN UNFROZEN.** Primary key is
   `(symbol, trading_date)` — 25,789 rows, 25,789 distinct pairs. **It is a
   snapshot updated in place, not a time series.** There is no premarket-hour
   state in it at any date, so "was price within a spread of the session high at
   07:00" is not reconstructible from stored columns, for tomorrow or for August.

**SO THE FOURTH READ HAS NO PRIOR AND I AM NOT INVENTING ONE.** Picking a number
now to feel pre-registered would be the exact generator Integration and I just
named: *answering a question the evidence cannot answer, from the evidence.*

**What it becomes instead — an instrument rather than a prediction:**

    report:  NEW HIGH count / OFF HIGH count / rows where sessionHigh > cycleHigh
             ALL RAW, ALL OVER THE BOARD-ROW DENOMINATOR

**Tomorrow's read ESTABLISHES the base rate; it does not test one.** Say that in
the report. The number becomes a test on the read after it, and only then.

## Tuesday's third read — how to tell a working fix from a check that did not fire

The stale-arc read may now be UNOBSERVABLE, because `max()` removes the case. An
absent case and an absent renderer look identical, so the method has to be
settled before the board is up rather than at 04:00.

**Measure the PRECONDITION in the payload, separately from the rendering.** The
stale-arc condition is `sessionHigh > cycleHigh`, and that is readable from
`/api/market` whatever the screen does:

| precondition rows | on screen | conclusion |
| --- | --- | --- |
| **> 0** | no contradiction anywhere | **the fix works** — the case arose and was handled |
| **> 0** | a contradiction | **defect**, and it goes up immediately |
| **0** | nothing | **INCONCLUSIVE** — the case did not arise; say so, do not claim a pass |

**The third row is the one to be honest about.** Zero preconditions with a clean
screen is not evidence of anything, and it is exactly what a working fix and a
broken check both look like.

## TWO SURFACES READING CONSTANTS (2026-09-06, Ops's sweep — not built on yet)

### 1. THE COLOUR ON THE BARS IS INERT, AND HAS BEEN SINCE IT SHIPPED

`ticker_session.price_window` is **NULL on all 143,142 rows** — Ops's sweep, with
the sibling contrast that settles it: on 2026-09-04, **7,757 `activity_window`
writes and zero `price_window` writes on the same rows, by the same statement.**
The writer is `worker/runtime.ts` and it is Ops's; I am not touching it.

**The consequence for my surface, which Ops did not spell out and I must not
discover at 04:00:** `directionTone` returns null the moment `price` is absent,
so **the bars have rendered NEUTRAL INK on every row since `bf5c2d5` shipped.**
Green, red and yellow have never appeared.

**That reframes Tuesday's colour read entirely.** I was going to check four
states. **Three are unreachable, and I now know why BEFORE looking** — without
this I would have observed neutral, found it correct, and reported a partial
pass on a feature that is wholly inert.

**Report it as: one state observed, three unobservable, cause known and upstream.**
Not as a pass.

### 2. `Rank Change` IN THE DRAWER RENDERS "0" ON EVERY NAME, ALWAYS

`rvol_rank_change` and `ah_rank_change` are **always 0** across 45,249 and 36,113
non-null rows, while ranks demonstrably move. Two of my surfaces read it:

**`DiscoveryBoard.tsx:496-520` fails safe.** The arrow is gated `{rankChange ?
…}` and **0 is falsy**, so nothing renders. A dead feature, silently — he never
sees rank movement — but it states nothing false.

**`TickerDrawer.tsx:444-451` does NOT.** The ternary tests `=== null` for "New"
and otherwise prints the number, so **it renders "0" on every name, every
time.** That is not an absence: **"0" is a MEASUREMENT**, and the drawer is
asserting *this name's rank has not moved* about names whose rank is moving.

**Same class as the masked risk chip** — a field that cannot vary rendering as
though it had been measured. And the same distinction I have applied four times
this week: zero and unknown must not collapse, and here they have.

**The fix is not mine alone.** If the writer is repaired the drawer becomes
correct with no change; if it is not, the drawer should say what it does not
know rather than print a zero. **Which one depends on Ops's finding**, so this
is flagged, not fixed.

## "When did the price dots last render?" — I CANNOT TELL, and the store cannot settle it

### RETRACTED 2026-09-06 — they were not two sources, and the dots HAVE never rendered

**I was wrong.** `runtime.priceWindow` is assigned in **exactly one place**
(`engine.ts:1155`). The live serve (`:1837`) and the store write
(`worker/runtime.ts:1846`) both READ that same field — they are two CONSUMERS of
one producer, not two paths.

**So a column null where bars landed proves the field was null at that flush,
and the serve returned undefined too.** The store sweep does settle it: **the
price dots have never rendered.**

**The error was reading two call sites as two sources.** Both mentioned
`priceWindow`, both were plausible origins, and I did not trace either back to
where it is written. **Two READ sites are not two sources — follow them to the
producer and count THOSE.**

And Ops confirmed the defect against my own caveat: of 7,757 stored windows,
**2,369 had a bar actually land, and not one carries a price series.** 5,388
genuinely all-zero — the population my caveat predicted, real and the majority.
**The check could have come back benign and did not.**

### The superseded reasoning, kept because the caveat was right

`row.demand?.priceWindow` is populated from **either**:

- `repo.ts:556` — `parsePriceWindow(row.price_window)`, the store column, and
- `engine.ts:1837` — `runtime.priceWindow`, served **live from the engine
  without touching the store**.

**So a column that is null on all 143,142 rows does not establish that the dots
never drew.** The live board can serve the series straight from runtime while
persistence fails silently. That is a persistence question and a rendering
question, and the sweep answers only the first.

### And I have no observation either way

I have never checked `priceWindow` on a live payload with rows present. The
2026-09-04 premarket read looked at cycle titles, supply and the header; the
2026-09-06 read had **zero demand rows** because the market was shut, so its
`priceWindow: 0` count is uninformative.

**So the answer is: I cannot tell, and I am not going to reason my way to one.**
Tuesday settles it — `priceWindow` on the live payload with demand rows present.

### THE SIBLING CONTRAST MAY NOT DISCRIMINATE

Ops's evidence is 7,757 `activity_window` writes against zero `price_window`
writes on the same rows. **The two fields fail DIFFERENTLY on the same absence:**

- `activityWindow` is `slots.map(slot => minuteTrades.get(slot) ?? 0)` and is
  stored whenever the array is non-empty — **so it is written even when NO bar
  landed in the window.** An all-zero array is indistinguishable from a busy one
  at the point of the write.
- `priceWindow` returns null unless at least one slot is present in
  `minuteCloses` (`activity.ts:150`).

**So "activity written, price null" is exactly what NO BARS IN THE WINDOW would
also produce.** The contrast is consistent with a write failure and equally
consistent with an empty window, and it does not separate them.

**What would separate them:** whether those 7,757 `activity_window` values are
all zeros. If they carry real counts, bars landed and the price path is broken.
If they are zeros, nothing landed and both fields are behaving correctly.

**Ops's, not mine** — flagged so the diagnosis starts from a discriminating
measurement rather than from a contrast that cannot fail.

## Messaging protocol §5c (2026-09-06, Integration `1c3738a`)

**FACTS GO DIRECT. DECISIONS COME TO INTEGRATION.** A measurement, a defect, or
a correction to another thread's number goes to that thread MYSELF. Copy
Integration only when it changes a ruling. Anything competing for the trader's
answer still routes through Integration, because only that seat can see what is
already in front of him.

**THE REPO IS THE STATE.** Land it here first, then message the sha.

**AFTER EVERY PUSH, CHECK THE OUTCOME, NOT THE MESSAGE.**

    git merge-base --is-ancestor HEAD origin/main && echo ON ORIGIN || echo NOT ON ORIGIN

**A failed push can report the wrong cause.** A memory spike killed the git
credential helper, git fell back to an interactive prompt no unattended session
can answer, and it surfaced as `could not read Username for github.com` — which
reads as an auth problem and is not one.

**The outcome check does not care what the error said.** It is immune to the
misdirection where a check on the message is not. And the exposure here is
precisely the thing this protocol exists to prevent: **a failed charter push
leaves the file and the message disagreeing**, which is worse than a failed
deploy, because a failed deploy merely leaves production on the old sha.

*(Verified: `deploy/aws/push-release.sh` uses only `git archive` and states at
`:12` that the server never needs a credential — so this failure has no path
into a deploy at all.)*

**EVERY MESSAGE: SHA · WHAT CHANGED · WHAT I NEED.** If it needs a paragraph,
**the paragraph goes in this file** and the message points at it.

### What it changes for me, concretely

- **Renderer-side findings go to Ops directly.** My catch that Ops's sibling
  contrast could not discriminate was a fact about ITS evidence and it went
  through Integration — costing a round trip while a defect sat unconfirmed.
- **A payload field that looks wrong at premarket goes to Ops as I find it**,
  not after routing.

**Channel proven:** I have reached Ops (`local_c4fc69df`) and Research
(`local_caa55786`) directly this session, and Integration throughout.

## RULED — the `focus` badge in assessment history GOES (2026-09-07)

`AssessmentHistory.tsx:199` renders `focus` as an **inline badge beside the
ticker**, not a column — so removing it costs no header, no layout and no
structural change. That makes the call light.

**GO. And the reason is not that its audience is small.**

Integration's reason was that he did not know pins did anything, so a history of
an unknown lever is not history he will read. True, and weaker than the real
argument:

**THE BADGE'S MEANING CHANGES, SO KEEPING IT PRESERVES A TOKEN RATHER THAN A
FACT.** Today `focus` means *he pinned this AND it therefore got research it
would not otherwise have had*. After the change, pinning is display only — so a
reader in November seeing `focus` on a September row reads it as **a display
preference**, which is what pins will be by then, and misses that it was a
research lever.

**That is not a dead badge, it is one whose meaning drifts under the reader.**
Same family as the field about to start lying, arriving from the other
direction: one will be false going forward, this one becomes misread backwards.

**And nothing is lost, which is what makes it easy.** Removing the RENDER does
not remove the record — Integration's sequence orphans and labels the column
rather than dropping it. The fact survives where a one-pin curiosity belongs: in
the store, dated, not on a surface he reads at speed.

**Order confirmed as Integration has it:** render first, then Ops stops writing,
then the column is orphaned and labelled. The render going first is what
prevents the field being false on screen for even one session.

## Premarket read #2 — the marker's expected state is NOT simply "silent"

The universe is stamped **2026-09-06T21:52:59Z** and the refetch task fires
**03:15 ET Tuesday**, before premarket opens at 04:00. So the reading depends on
WHEN I look, and pre-registering it now stops me deciding at the board:

| when | marker | conclusion |
| --- | --- | --- |
| **before 03:15 ET** | fires | **EXPECTED, NOT A DEFECT** — no refetch has run yet |
| **after 03:15, universe restamped** | silent | correct |
| **after 03:15, universe still 09-06** | fires | **REAL** — the refetch did not run, and this is the case the marker exists for |

**The middle and bottom rows differ only in a payload field**, not on screen, so
`universeUpdatedAt` has to be read before concluding anything from the marker.
**A silent marker and a fired-but-expected marker are both consistent with a
working feature; only the payload separates them from the failure.**

## Working rules

- **Never state what is deployed. State what is COMMITTED.** Both pending lists
  I gave Integration were wrong — three pieces live when I said none, and
  `b2399a2` live when I called it pending. Design has no deploy signal, and a
  bundle can be composed, fail, and be RESTORED FORWARD without any of it
  reaching this thread. Say "my head is `<sha>`" and let Ops say what is live:
  that removes the failure rather than asking me to be more careful about a fact
  I cannot observe. **A list I cannot verify is a guess with a shape.**
- **A test written by copying the implementation cannot disagree with it.** Two
  instances in one session, both mine: a suite asserting `toContain('high is
  today')` on a string that could never be about today, and one asserting
  `state === 'LIVE' ? null` — each DEFENDING the defect it should have caught.
  Write the test from the RULE, not from the code. The repair shape is the same
  both times: assert the mapping over every input, which is the half a
  single-case check cannot reach.
- **A check that only exercises the FIRING case cannot tell you the predicate is
  right.** I confirmed an abnormal market state renders words and called the
  header verified — while the screen was displaying the very defect, because
  "worker offline" was itself an out-of-hours state I had wrongly classified.
  Exercise both sides: the case that should speak AND the case that should be
  silent.
- **Enumerate what is THERE, not what you are changing.** The header audit
  changed two components and missed a third printing a pure constant onto the
  row he complained about. The addition-plan rule inverted — and the reason the
  fix took two rounds.
- **A status row and a working set are looked at in different moments.** That,
  not "no room", is why the tick budget belongs in the Focus strip rather than
  the header. The header reports whether the desk is functioning; a working set
  is what he is doing. The distinction is durable and will survive the next
  request to put something in the header — including one from me.
- **Prefer making it IMPOSSIBLE over making it VISIBLE.** Three times in one
  night the better answer was structural rather than disclosed: the sparkline
  reads the verdict's OWN array, so it cannot disagree with the graveyard rather
  than agreeing by discipline; the tick budget defines the auto set as the
  REMAINDER, so there is no silent degradation to announce because nothing
  degrades; and the sparkline view exposes no field that could carry a tone, so
  adding a verdict fails a test rather than requiring restraint. **A disclosure
  is a promise someone has to keep. A structure keeps itself.**
- **A collapse keyed on the wrong proxy fires on a false negative.** The Focus
  strip hides itself on "no pins", which meant "nothing to say" only while pins
  were the only content. Naming the case where a requirement usually holds,
  instead of naming the requirement — and the tell was that its empty state
  holds INSTRUCTIONAL TEXT: a constant dressed as content, in a band collapsed
  for saying nothing.
- **Never gate work on a wall time you derived. Gate it on an OBSERVABLE.**
  I reported 03:31 and then 03:42 when the true times were ~03:06 and 03:25 —
  drifting because I was adding elapsed time by feel between messages instead of
  reading a clock. The box's UTC was correct throughout; the arithmetic was not.
  A "run it at 04:00" plan would have fired at ~03:42 actual and repeated the
  03:02 failure exactly. **The gate for the owed reads is
  `sessionPhase !== 'NEXT_DAY_PREP'` and `intelligence` non-empty** — a
  CONDITION rather than a MOMENT, and it cannot drift. Same rule as the header
  predicate: derive nominal from the session, not from a literal.
  When a time is genuinely needed, take it from `date -u` or the API's
  `fetchedAt` at the moment of use, never from memory of an earlier message.
- **Reverse the edit, never the file.** `git checkout <file>` to undo a
  deliberate mutation took the whole change with it. Same class as `git stash`
  on this tree, which is already forbidden here for the same reason: a
  destructive command aimed at a small target.
- **Mutation-test every new assertion before trusting it.** Four vacuous checks
  in one night; the fourth was the first caught by mutation rather than luck. It
  asserted a null turnover against a fixture with no volume, so it PASSED with
  the refusal removed entirely — it was asserting the fixture, not the code.
- **I reported a MECHANISM as a FINDING, and it was wrong.** I observed that a
  wrong-module import passed `npx tsc --noEmit` and failed `next build`, then
  said tsc "does not cover the test files". **It does** — probed it myself:
  planting `const probe: number = 'not a number'` in `tests/` produces TS2322.
  The real mechanisms are `incremental: true` with a stamped
  `tsconfig.tsbuildinfo` (a pass can SKIP files it believes unchanged), and
  `.next/types/**` being in the include list, so the same command covers
  different things depending on whether a build has run.
  **The symptom was real; the explanation was invented.** Separate what you SAW
  from what you CONCLUDED when reporting, because a plausible mechanism travels
  as fact and my wrong one would have sent someone to widen an include list that
  was already correct — a fix changing nothing while looking like it did.
  Mitigation: `rm tsconfig.tsbuildinfo` before a decisive check; run the full
  build before reporting clean or shipping.
- **A scope is a claim that something does not exist — check the tree first.**
  It is the cheapest claim on this desk to test: one `git log`, one `grep`.
  Integration scoped the activity indicator as unbuilt while it had been
  shipping since `2b3ddd9`, and the same seat had done it once before in the
  same week. **Apply this to every hand-off, including ones that arrive with
  detailed constraints** — the constraints are what make an unbuilt premise
  convincing.
- **A wrong finding stays visible; a discharged caveat does not.** Research's
  addition to my caveat rule, and it is the half that decides how to write one.
  Its rule — *a mechanism that explains the class is not evidence about the
  instance* — and mine are the same error pointed at a CLAIM and at a DOUBT: one
  over-claims a finding, the other under-claims a risk. **Mine is worse, because
  a wrong finding gets corrected while a deleted warning leaves no trace it was
  ever there.** So when the mechanism behind a doubt is uncertain, write the
  doubt so that clearing one cause cannot delete the sentence.
- **Put the argument at the point of temptation, and NAME WHAT IT RESTS ON.**
  The points-not-a-line reasoning sits in `lib/dashboard/sparkline.ts` because
  that is the file someone edits to draw a line — not beside the engine line it
  depends on, where no one proposing a mark change is looking. **And it names
  that dependency explicitly** (`activity.ts:261` maps a missing slot to zero, so
  the spacing is time rather than sequence), so a future change to the dependency
  meets a reader instead of silently invalidating an argument two modules away.
  A rule someone must remember is weaker than a note where the mistake is made.
- **Report a near-miss as a FAILURE, not as a fixed bug.** Ops's note on why its
  control technique travelled and landed: the useful part was not that it
  corrected the error, it was that **the wrong object was named**, so I knew
  which way the trap pointed. A "fixed, no action needed" carries the same facts
  and none of the warning. This is the counterpart to *an unmarked guess becomes
  an instruction once relayed* — both are about what survives a hand-off, and
  the reporting choice decides it.
- **Where a field lives may be a STORAGE ACCIDENT, not a design statement.**
  `universeFreshness` sits on `MarketFeedHealth` and not on `DiscoveryState`
  beside `universeMode`, because `feed_health` is persisted whole while the
  discovery snapshot is projected field by field. Every instinct — the sibling
  concept, the board already destructuring discovery, the caveat belonging near
  the counts — points at the wrong object. **Read from the object the field is
  ON, and check a known-present field alongside it** so "absent" means something
  before you act on it.
- **Two annotations describing DIFFERENT properties of one field silently add
  up.** `screen` says nothing leaves the board when the PM columns go; `live?`
  says the frozen-at-a-moment value is lost. Both true, one loss — and a reader
  scanning two populated columns counts it twice. **Say explicitly that they do
  not compose**, because neither column can say it alone and the cells cannot
  say it at all.
- **Count the fields the desk must PRODUCE, not the columns the source USES.**
  `rows.ts` folds Priority+Revised, Catalyst+PM Catalyst and Warning Shot+PM
  Warning Shot into three fields. A plan counting seven would build six things
  where three exist — **a spreadsheet needs a second column for a revision where
  a record needs a flag.** The pairing is a shape of the source, not of the
  problem.
- **The control for a RENDERER is a sibling element you know should be present.**
  On the payload the control is a known field — `universeMode` beside the three
  new ones. In the DOM it is a neighbouring cell or column. **"I looked and it
  was not there" is never a finding on its own:** searching every row for the
  sparkline bars and finding none looked like a defect, and the truth was that
  the whole table was unmounted because the board had no rows. **An absent
  renderer and an absent value are indistinguishable without a control.**
- **A verification that fails at its object can still confirm what stands in the
  object's place.** Going to read the colour and finding no table instead
  confirmed the empty state live for the first time — including the trading date
  across a holiday Monday, which every thread had got wrong in prose for two
  days while the code had it right. **Report what the failed attempt did
  establish**, rather than only that it failed.
- **A label's WORDING can disguise which quantity computed it.** `OFF HIGH` is
  selected by `retracementPct` — fraction of the run surrendered — while sounding
  like a distance below the high. **Pairing it with the distance figure would
  make that mismatch invisible rather than resolving it**, because a number
  beside a word reads as the word's evidence. When deciding what to show beside
  a label, ask what COMPUTES the label, not what the label sounds like.
- **A caveat that can only move a number ONE WAY is a BOUND, and must be
  reported as one.** "The true rate may be higher" reads as uncertainty and gets
  discounted symmetrically; "2.7% is a floor" cannot be. I flagged the RTH-only
  question as unresolved rather than estimating it, which was right — but the
  answer was already in the repo at `types.ts:62-68`, verified against minute
  bars by someone who checked it precisely because it matters. **Search the repo
  for the answer before recording a question as open.**
- **Compare at the precision of the INPUTS, not the precision of the type.**
  `1.5 - 1.49` is `0.010000000000000009` and reads as outside a one-cent spread,
  so a name exactly one spread off its high would have flipped on the arithmetic
  rather than on the price. Quotes are never finer than four decimals, so
  rounding at six cannot change a real decision. **A threshold derived from
  measured quantities inherits their resolution, and the gap between that and
  the float's is pure noise sitting exactly where the decision is closest.**
- **A defect removed BY CONSTRUCTION beats one caught by a branch.**
  `max(cycleHigh, sessionHigh)` makes "price above its own reference high"
  impossible rather than handled — one operator instead of one more condition.
  It fell out of the shape he asked for; **saying it fell out rather than
  claiming it as design is what makes it usable as a rule.**
- **Two READ sites are not two sources.** I read `repo.ts` and `engine.ts` as
  independent origins for `priceWindow` and concluded a store sweep could not
  settle whether it ever rendered. They are two consumers of ONE producer
  (`engine.ts:1155`), so the sweep settled it completely. **Trace to where a
  value is WRITTEN and count those.**
- **Print the shape next to the number** (Ops's). Its aggregate query used a
  JSON path that could not match the stored shape, returned NULL for every row,
  and printed `0` — which read exactly as "no defect". It caught itself only
  because the raw rows were printed two lines above and contained 3, 6 and 11.
  **A block that shows its input refutes itself in one glance.**
- **A writer-side finding must reach the reader-side seat BEFORE their next
  observation, not after it.** The colour being inert was only findable because
  Ops's sweep arrived before I read the board; had I looked first I would have
  seen grey, confirmed it against an empty payload, and written a partial pass.
  **That ordering was luck. Make it a rule.**
- **THE SPREAD IS THE MOST LICENCE-EXPENSIVE INPUT ON THE BOARD. Name it at
  design time.** Two verdicts lean on it — the flat band (`sparkline.ts:204`)
  and the NEW HIGH override (`cycle.ts:221`) — and both were chosen this
  weekend, independently, with no way to know. Not forbidden: **a cost to state
  in the scope**, like a width measurement or an empty state.
  **And a derived quote is not a worse verdict, it is a DIFFERENT one.** A real
  quote from any venue subset has a spread AT LEAST AS WIDE as the NBBO, so a
  partial-venue feed calls FLAT more often and NEW HIGH more readily —
  **one-directionally.** Direction knowable, magnitude not: a bound, not a
  caveat.
  **The failure mode is silence, not error** — both features return neutral
  without a spread rather than guessing a band. So losing the quote makes the
  board say less, never something false. That is worth knowing when costing it:
  **the downside of the cheap feed is two dark features, not two wrong ones.**
- **NEVER CONVERT UTC TO ET BY ARITHMETIC — AND `TZ=` DOES NOT WORK ON THIS
  HOST.** Minus four is EDT; **EST is minus five and DST ends 2026-11-01**, so
  the habit of reading `date -u` and subtracting starts producing a
  wrong-by-one-hour reading in eight weeks, silently, looking exactly as
  authoritative as it does today.
  **And the obvious fix fails here in a worse way.** `TZ=America/New_York date`
  on this box returns **GMT** — it ignores the variable and hands back UTC *with
  a timezone label attached*, which reads as converted. **Tested, not assumed.**
  **Use Python's `zoneinfo`, which is correct on this host** — verified across
  the transition: `2026-10-30 13:00Z → 09:00 EDT`, `2026-11-02 13:00Z → 08:00
  EST`.

      python -c "from zoneinfo import ZoneInfo; from datetime import datetime,timezone;         print(datetime.now(timezone.utc).astimezone(ZoneInfo('America/New_York')))"

  **A conversion constant with an expiry date is a defect with a start date.**
  Every `04:00 ET = 08:00 UTC` I have reasoned with becomes wrong on 11-01.
- **A removed SOURCE goes false FORWARDS; a removed MEANING goes misread
  BACKWARDS.** Same family, opposite directions — and only the first is visible
  in new data. **The backwards one is worse for exactly that reason: nothing
  about an old row looks wrong later.** The `focus` badge was the second kind.
- **"RENDER FIRST" MEANS RENDER *LIVE* FIRST, NOT RENDER *COMMITTED* FIRST.**
  A ruling in the charter is a decision, not a deployed change — the badge is
  still serving while `e609139` sits in the log. **A downstream thread waiting on
  "the render is gone" is waiting on a DEPLOY, and must never read my sha as the
  green light.** Same root as *a sha is a timestamp, not a selection*: I control
  what I push, not what is live, so I say which one I mean.
- **AN ANNOUNCED DATE CARRIES NO ZONE.** Three clock errors here were the same
  shape — carrying a reading rather than taking one. **The fourth is different
  and worse:** two threads in non-ET zones both rolled to Tuesday and announced
  it on Monday evening ET, independently, and a third repeated it as fact.
  **Nobody misread a clock; nobody read one.** A reading you take is wrong only
  if you take it wrong; **an ambient date is wrong for everyone downstream at
  once**, and it arrives with the confidence of an observation. Every thread on
  this desk runs in a non-ET environment, so this recurs by default.
- **NEVER `cat >` A PATH WITHOUT KNOWING IT IS NEW.** This destroyed 18 test
  cases at `4110599` — not pruned, OVERWRITTEN, so no judgement was made and
  none could be defended. `Write` and `cat >` are silent on an existing file.
  **Check first, or append.** Sibling of *reverse the edit, never the file*:
  both are a destructive operation aimed at a target I had not looked at.
- **THE COLLATERAL IS ADJACENT TO THE FILE, NOT TO THE FEATURE.** Twelve of the
  eighteen had nothing to do with pins — they covered `selectFocusRows`,
  `retentionNote` and `buildDeskRead`, and `retentionNote` is code I had changed
  myself two days earlier. **I deleted the tests for my own recent change.**
  When reasoning about blast radius, the unit is the FILE the operation touches,
  not the concept I have in mind.
- **A GATE IN THE SHARED TREE GATES A MOMENT, NOT A SHA.** My run read
  `lib/research/interpret/` while another thread was mid-edit and produced a
  failure that was not reproducible. **Before trusting or reporting a gate,
  check `git status` for other threads' uncommitted files and say so.** The
  structural fix is a pinned worktree; the cheap discipline is the status check,
  and it is what caught it tonight. **Taken: `A:/mointel-design` is a detached
  worktree** (`git worktree add A:/mointel-design --detach origin/main`) — it
  shares the object store, so it cannot see another thread's uncommitted edits.
  Verified at `38e7d4b`: **125 files / 1871 tests, matching the shared tree**,
  and the worktree stayed clean through the run.
  - **BUT A WORKTREE PINS SOURCE AND DOES NOT PIN `node_modules`.** It arrives
    empty; `npm ci` from the committed lockfile (17s, 461 packages) closes most
    of the gap, `npm install` would not. **If a gate result ever fails to
    transfer between two threads on identical trees, look there first.**
- **THE SIX `focusRepo` TESTS ARE EXPECTED TO GO.** `seedFocus`,
  `isFocusSeeded`, `pinFocus`, `unpinFocus`, `readFocus` — Ops removes the repo
  in step 3 and they leave with the code, not before it. They were **not**
  obsolete when restored.
  - **CORRECTION — IT IS ELEVEN, NOT SIX, AND I TOOK SIX FROM OPS WITHOUT
    OPENING THE FILE.** That is the same generator: **a number accepted rather
    than looked at.** The enumeration, by name:
    **`focus persistence` is 10 cases and every one of them touches the repo**
    (`seedFocus`, `isFocusSeeded`, `pinFocus`, `unpinFocus`, `readFocus`), plus
    **`renders one card per pinned name, in pin order`** in `focus cards`, which
    calls `focusRepo` directly. **11.** The other 7 `focus cards` cases touch no
    repo function and must survive.
  - **THE MCP SIDE CONTRIBUTES ZERO.** `get_focus` appears in `readOnly.test.ts`
    and `sideEffects.test.ts` **inside arrays and call lists within existing
    cases**, never as an `it()` of its own. Removing the tool changes assertions
    **inside** cases and **does not move the count.** So Ops's `−9` cannot be
    reached by adding an MCP contribution to six.
  - **AND THE FILE'S MODULE-LEVEL IMPORT OF `focusRepo` BREAKS ON REMOVAL**, so
    the file must be edited regardless — which is the mechanism by which a
    careless fix takes the other 7 with it. **That is precisely how the original
    eighteen died.**
  - **SO THE NUMBER TO CHECK IS −11, AND `−9` OR `−18` ARE BOTH DIAGNOSTIC:**
    `−9` means two repo-coupled cases survived that should not have, **`−18`
    means the whole file went again.**
- **A COUNT IS A DETECTOR, NOT A MEASURE.** The suite total went UP to 1871
  while the coverage of pin/unpin/limit went DOWN — those moved from exercised
  (against the repo) to source-asserted (against the hook), and no total can
  show that. **The file count is the control for the test count**: a real
  deletion moves the test count alone, a torn-down worker moves both.
- **Terminology is trader-facing.** Labels that describe engine internals get
  rejected — `LATCH` was removed for exactly this. Say it in the language of the
  stock, not the pipeline.
- **An observation sent to the routing seat comes back as an instruction, with
  authority attached.** On 2026-09-04 I sized a supply fallback against a blank
  screen I had never opened; Integration turned that sizing into a build order
  without opening it either, and only a render-path check before writing code
  stopped it. **Mark the confidence of a claim when reporting it** — "I have not
  looked at this screen" travels, and an unmarked guess is indistinguishable
  from a finding once it has been relayed once.
- **Check the screen state before designing against it.** The design was for a
  blank that did not exist: `AutomaticIntelligence.tsx:361` already rendered the
  ledger. Same class as sizing the masked risk chip from four rows that
  short-circuited two branches earlier — describing a surface instead of opening
  it.
- **A grep for a leaf name misses every path that reaches it through the
  parent**, and from inside the search "nothing carries this" and "I searched
  for the wrong token" look identical. `supplyPair` was reported unreachable
  because it is not named in `deskRead.ts` — but `deskRead.ts:351` already binds
  the object it hangs off (`row.intelligence?.analysis?.dossier.structure`), so
  it was one property access away the whole time. **Search for the PARENT you
  would traverse, not the field you want.** Verified before accepting: the
  rendering is a small change in this thread's own file.
- **A test can pin a defect.** `cycleDetail`'s suite asserted
  `toContain('high is today')` on a string that could never be about today. The
  fixture-encodes-a-dead-world rule shows up as an ASSERTION too, and there it
  is worse: a fixture merely fails to catch, an assertion actively defends.
- **Verify on the live desk**, not fixtures. The one Phase 1 defect that reached
  production was invisible to local fixtures.
- **And verify it *after* the deploy, not only before.** Added 2026-08-23 with
  the shared rule in `README.md` (`abf38e1`), after the trader asked why Design
  would not be looking at its own work. It could not — a change cannot be checked
  on production before it is on production — and nothing sent it back afterwards.
  **Ops confirms the deploy; Design confirms the behaviour.** A change is not
  finished at the handoff. It is finished when this thread has looked at the real
  board.
- **The deploy window does not constrain this thread's work.** Reframed by the
  owner 2026-08-23 (`233c11f`): the desk is *a product being built, not a tool
  being depended on*, and a board broken during RTH costs him a board, not a
  trade. **But the constraint that replaced it is stronger, not weaker** — *"a
  premarket the desk fails to capture is permanently gone"*, because the record
  grows only in real time. The question before a deploy is **"can this interrupt
  capture?"**, and for everything in `components/` and `lib/dashboard/` the
  answer is no. **Do not read this as "market hours are free"** — it is narrower
  than that and the README says so explicitly. Research's schema deletion after
  the cycle cutover touches the store and keeps the old care.
- **Live verification is any trading morning, not one window.** Discovery
  populates from 04:00 every session, and 10:30 on any weekday gives more names
  than premarket does, with no token expiring underneath the work. Planning
  around a single premarket slot was a self-imposed constraint.
- **A string count over a page conflates controls with data — only a count over
  rows means anything.** Established 2026-08-24, and the evidence for it is that
  Ops broke it *while checking this thread's work*, an hour after reading and
  endorsing the refusal that stated it. Design declined to count `DAY 1` and
  `OFF HIGH` as a phase-name pass because they were **filter chips, not badges**;
  Ops then counted `given back` ×3 as an anomaly when all three were chip
  tooltips. Same trap, different string, one hour apart. **A rule its own
  endorser breaks within the hour is structural, not careless** — which is the
  same conclusion this desk reached about why no thread finds its own defects.
- **He trades PREMARKET, 04:00–09:30 ET, profit concentrated from 07:00. He does
  not trade RTH** — that is the exception, a dip trade or a genuinely strong
  mover. **So "before the open" is not a safety margin; the opening bell is
  roughly when his session ENDS.** Looking at the live board between 04:00 and
  10:00 ET means working in front of him. *(This file said "the only one seen
  during 07:00–10:00" — the README's window, wrong at both ends. Corrected
  2026-08-24.)*
- **Where the booklet and Adam differ, believe Adam — and check this file for
  places it restates the booklet.** Research found its own notes saying
  *"9:30–10:00 is the core"*, which is Cameron's core rather than his, sitting
  directly beneath the rule written to prevent exactly that. **A restated
  playbook fact is the failure mode; a linked one is not.** Design carried one
  instance, now fixed. The audit carries none — checked, not assumed.
- **This host is UTC+2 — every tool timestamp is SIX HOURS ahead of New York.**
  A vitest header reading `10:36`, a shell `date`, a commit time: all CEST.
  Verified 2026-08-24: local `10:51`, UTC `08:51`, **ET `04:51`**. Read it
  explicitly rather than inferring it —
  `node -e "console.log(new Date().toLocaleString('en-US',{timeZone:'America/New_York'}))"`.
  **It survived a whole night because a wrong timezone produces a *plausible*
  time**, so nothing prompts a check — the same shape as a correct-but-narrow
  number. Two threads called the market open at 04:45. **And `PREMARKET` means
  premarket *capture* is live, not that trading is.** The codebase is clean; the
  hazard is entirely in reading tool output.
- **A fixture can encode a world that has stopped existing, and stay green
  through the outage it should have caught.** `resolveRisk`'s tests all passed a
  dossier `displayedFloat` of 4 M or 12 M. That field went null in production on
  **2026-08-20** and stayed null, so the suite tested a shape the live desk no
  longer had — and remained green for thirteen days while two branches, including
  the board's only positive chip, were unreachable. **A fixture's job is to carry
  the production shape, not a convenient one**, and when a field's real
  distribution changes the fixtures are stale even though nothing edited them.
  Fixed at `d8794da` by adding the null case.

  **This is the third instance of one shape in this thread** — with the `Move`
  label at `CLOSED` and the four-row risk-chip sample — and it is the most
  durable, because a fixture outlives whoever wrote it and is trusted by people
  who never saw the world it was written in.
- **An addition plan is a list of readers too — and unlike a deletion, it fails
  SILENTLY.** A deletion breaks its readers loudly; an addition simply never
  reaches them. Design sits at the end of these chains, so **this thread is where
  an addition silently fails to arrive.** Proven 2026-09-03: the activity columns
  were written, populated and climbing in production — 8,476 `UNKNOWN`, 328
  `DEAD` — while `toDemandState` never assigned the field, so the key was absent
  from `/api/market` entirely. Write path complete, read path never written.
  **Never assume a shipped column reaches this surface: check that the key
  exists on the payload, not that the migration landed.**
- **When a word has several numeric definitions, prefer a predicate that needs
  none.** Choosing one of them correctly still leaves the next reader choosing
  again. Established 2026-09-04: "the board" means `discoveryRank` 12
  (`config.ts:69`), the archive's ranks 1–25, and the UI's Top 12/25/50 — three
  live meanings differing by 4x. The graveyard filters on `deadAtRank !== null`,
  **presence rather than a threshold**, so it cannot pick the wrong number and
  does not move when he changes the view size. **Assert the absence of a
  threshold in the module**, not the correctness of one — the same way asserting
  a constant *references* config beats asserting its value.
- **A model consumer cannot ask a clarifying question, so a label must be true
  without context.** The `chatgpt-*` review routes were built so ChatGPT could
  read this desk — and ChatGPT is what *writes* the Sheet, so for a day in
  August the desk told the Sheet's own author that the Sheet was human-reviewed.
  That instance was a loop rather than a deception, because the one consumer able
  to know it was false was the thing producing it. **The general case is not.** A
  human reader who finds a label odd can ask; a model ingests it as a fact and
  propagates it. **So "he already knows better" is never a defence for a false
  label** — it holds only while every reader is him, and this is a product.
- **State what the count is RIGHT NOW before choosing a threshold.** Two triggers
  written on this desk in one day were keyed to a state the world was already in
  — "a second login" had already fired and could never fire again. The same
  family: expired tokens counted as active, `undefined` read as `UNKNOWN`, a
  `200` on a dead page, a key present with no value. **Four shapes of one
  failure, and the only reliable catch has been measuring the baseline rather
  than re-reading the rule.**
- **A check that cannot fail is not a check.** Before reporting anything
  verified, ask what result would have proved it *broken*. If the answer is
  "none available right now", the observation confirms nothing — say so instead
  of reporting a pass. Three instances surfaced on 2026-08-23 alone: a review
  link answering `200` while dead, a replay reporting stable versions having made
  no model calls, and this thread looking at the `Move` button at `CLOSED` phase,
  where the fixed and unfixed code render identically. Confirming a build is on
  the box is not confirming its behaviour changed.
- **Thread-to-thread traffic goes through Integration, not the trader.** Set at
  his instruction 2026-08-23 (`159baab`), after he was asked three times in one
  evening to carry a message between two threads.

  **Look the address up every time; never cache it.** `list_sessions` is the
  directory — it returns real titles (`Integration`, `Research`, `Ops`, `R&D`,
  `Coaching`) with their `sessionId` and `cwd`. Send with `send_message` using
  that `session_id`.

  **Four routes that do NOT work**, each recorded because this file asserted one
  of them: `ListAgents` names are opaque handles (`mointel-8c`, `claude-1a`) that
  map to no thread; `SendMessage` to a bare name works only while a session
  happens to surface in `ListAgents`, then fails *"No agent named … is
  reachable"*; copying a received message's `from` attribute as the `to` fails on
  this machine despite the tool's own docs; and **as of 2026-08-27 a bare name
  can fail a fourth way — *"matches 2 agents by prefix"*, because retired
  sessions keep their titles (`Integration-retired1`, `Integration-retired2`) and
  the LIVE session does not win its own name.** Retirements accumulate, so this
  one gets worse with time rather than better.

  **This file previously said to address it by name and listed the `ListAgents`
  entries. That was verified true on 2026-08-23 and had drifted by 2026-08-24** —
  which is the reason for the lookup rule rather than an argument against
  verifying. A checked fact about a moving thing has a shelf life, and this one's
  was under a day.

  Integration relays with context the receiver lacks — but **relaying is not
  deciding**: anything needing the trader's judgement goes to him under *What I
  need from you*, directly, with no hop in between.
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
> **All six §11 decisions are settled** — answers sit beside each question in the
> audit, indexed in `design.md`. **Do not re-ask one.**
>
> Phase 1 (§9 items 1–11) is live. **§9 items 12–19 are still unstarted**, but a
> good deal has shipped outside that list since 2026-08-23: Discovery sorting,
> the cycle cutover onto arithmetic, the `ABOVE PRIOR CEILING` label, and the
> risk-chip gate fix. **Do not read "Phase 2 not started" as "nothing has
> changed"** — read `design.md` top to bottom first; it carries the decisions,
> the corrections and the working rules, several of which were learned the
> expensive way.
>
> **Next piece is §9 item 16a**, scoped and ready: the five false "human review"
> strings and the `desk research` / `outside research` swap across ~20 rendered
> sites. It has been displaced repeatedly by live defects and is still owed.
>
> You do not deploy; Ops does. **You may commit and push your own work** — stage
> by explicit path, always.
>
> Verify on the live desk *after* a deploy, not only before, and read the
> working rules on what makes a check capable of failing before you trust one.
