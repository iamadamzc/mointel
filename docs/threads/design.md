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

  **Three routes that do NOT work**, each recorded because this file asserted one
  of them: `ListAgents` names are opaque handles (`mointel-8c`, `claude-1a`) that
  map to no thread; `SendMessage` to a bare name works only while a session
  happens to surface in `ListAgents`, then fails *"No agent named … is
  reachable"*; and copying a received message's `from` attribute as the `to`
  fails on this machine despite the tool's own docs.

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
