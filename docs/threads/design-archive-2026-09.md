# Design thread — archive to 2026-09-21

**What this is.** The working record of the Design seat from 2026-08-21 to
2026-09-21, moved out of `design.md` on 2026-09-21 so the live document is a
snapshot rather than a diary.

**Read this only to answer "why is it like that".** Every conclusion here also
exists in a commit message, usually with more context and always with the code
beside it: `git log --format='%h %s%n%b'` over `lib/dashboard/`,
`components/` and `docs/threads/design.md`. If the two disagree, the commit is
the record and this is the draft.

**Nothing here is an instruction.** Rulings that still bind were carried into
`design.md`; anything left here is history. Several entries correct earlier
entries, so a line read alone may be one that was later withdrawn.

---
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

## THE TWO WINDOWS FAIL DIFFERENTLY, AND THAT IS WHY ONLY ONE FAILURE IS VISIBLE

### HIS CONDITION IS NOT DEFEATED BY CONSTRUCTION. THE RISK IS IN THE IMPLEMENTATION.

He ruled **VANISH**, keeping the graveyard *"as long as resurrections remain
possible."* **I was told that condition may defeat itself — that a vanished name
loses its subscription, produces no bars, and so revival-at-two can never fire.
I checked, and that is not what the code does.**

**`applyHighResSelection` DRIVES `trades`, `quotes` AND `lulds`. IT DOES NOT
DRIVE BARS.** The `Subscription` interface holds exactly those three sets
(`stream.ts:51-55`). **Bars are WILDCARDED WHOLE-MARKET** (`stream.ts:292-303`),
and the comment says why: *"Quotes and trades are deliberately NOT wildcarded:
minute bars are the discovery input."*

**So a DEAD name that loses its high-res slot still receives minute bars, still
accumulates `minuteTrades` from `bar.tradeCount`, and revival CAN fire.**

**AND IT SURVIVES THE DEGRADED PATH, WHICH IS WHERE I EXPECTED IT TO BREAK.**
When wildcards are denied, `worker/alpaca.ts:145` subscribes bars for
`engine.trackedSymbols()` — and that is `[...this.tickers.keys()]`
(`engine.ts:1786-1788`), **with no activity gate at all.** Both modes keep a
corpse receiving bars.

**THE ACTUAL RISK IS FORWARD-LOOKING AND IT IS IN HOW VANISH GETS BUILT.**
Nothing today removes a name from `this.tickers`. **If vanish is implemented by
deleting the runtime rather than by filtering the view, THEN the condition dies**
— the runtime holding `minuteTrades` goes with it and there is nothing left to
revive, and the same removal drops it from `trackedSymbols()` and ends its bars
in degraded mode.

**SO THE RULE, BEFORE ANYONE WRITES IT: VANISH IS A VIEW FILTER, NOT A
DELETION.** The row stays whole — the same reason the ranked-and-alive block
already says *"The rank itself is untouched, because the graveyard needs the row
whole; only this reader changed."* **The pattern is in the file: one flag, many
readers, and only the reader changes.**

### THE POSITIVE CONTROL: THE CODE AND THE KEYS BOTH WORK. ONLY THE CLOCK IS LEFT.

**Ran the real functions against stored bars in the pinned worktree** (scratch
file, run, deleted — the worktree is clean). 2026-08-17, the three busiest names:

    IPST bars=897  rawKeys===normKeys: true  slots=5 hits=5  window=[1053,1256,951,672,718] ACTIVE
    TRUG bars=894  rawKeys===normKeys: true  slots=5 hits=5  window=[135,92,104,282,226]
    IVF  bars=889  rawKeys===normKeys: true  slots=5 hits=5  window=[338,243,106,89,113]

**FIVE OF FIVE SLOTS HIT, AND THE WINDOWS ARE FULL OF REAL COUNTS.** So
`windowSlots`, `minuteSlot` and `resolveActivity` are **not** the defect.

**AND THE KEY QUESTION IS NOW SETTLED BY DATA RATHER THAN BY READING TWO
FUNCTIONS.** The engine keys `minuteTrades` by the **raw `bar.ts`**
(`engine.ts:959`); the replay re-keys through `minuteSlot` (`dead-while-ranked
.ts:371`). **Those two key sets are IDENTICAL** — and every one of the
**1,340,336** stored bars is `len=24`, tail `0.000Z`, across all three sources
(`historical`, `live-bar`, `live-updated-bar`). **The replay's re-keying is
idempotent, not a correction.**

**THE ONE VARIABLE LEFT IS `now`.** The replay drives it **from the bar
timeline** (`dead-while-ranked.ts:242`, `now: ms`); the engine drives it from
**the wall clock** (`windowSlots(this.now(), …)`). Same code, same keys, same
data — **the only thing that differs is where the time comes from.**

**WHICH IS ALSO WHY RESEARCH'S RECONSTRUCTION IS GENUINELY INDEPENDENT OF MY
ARTEFACT, AND I CHECKED THAT RATHER THAN ACCEPTING IT.** Its `now` cannot drift
from its bars, because it takes one from the other. **My artefact lives on
exactly the axis its instrument does not have.** So both readings can stand: the
deaths it reconstructs are real, **and** the live DEAD flag may still be firing
on names that traded.

**THE MECHANISM THIS POINTS AT, NAMED BUT NOT VERIFIED:** `windowSlots` asks for
**t−6…t−2**. **If live bars arrive later than the settle margin, those slots are
empty at read time** — activity zero-fills and reads DEAD, price returns null.
That is bar latency against `settleMinutes`, it is in the worker, and it is
Ops's. **I have not measured it and I am not claiming it.**

### 19 OF 65 ENTRANTS WERE NEVER ACTIVE — AND NEITHER OPTION HE IS WEIGHING TOUCHES IT

**Corrected from 39 by Research at `94be242`.**

Research's number, and it is a **display** problem sitting behind the one being
decided. **Vanish-or-show is about names that go QUIET. These were never LOUD.**
So a board that marks corpses correctly would **still** show a majority of rows
admitted without ever being active. **Nobody has scoped this and I am not
designing for it.** Recorded so that whichever way he rules, **the rule does not
arrive looking like it solved this too.**


**Not a hypothesis. A deduction from the code plus Ops's sweep, and it says a
number about to go in front of the trader may be an artefact.**

`runtime.activityWindow` and `runtime.priceWindow` are assigned **six lines
apart, in one block, on one code path** (`engine.ts:1176` and `:1182`), from the
same `this.now()`, and are carried by **one** DemandState builder on adjacent
lines (`:1863-1864`) into **one** INSERT with **one** COALESCE upsert. There is
no branch anywhere between them. **So nothing about the plumbing can explain one
populating and the other not.** What differs is what each does when the window
misses:

    activity.ts:267   window = slots.map((slot) => minuteTrades.get(slot) ?? 0)
                      -> MISSING SLOT IS ZERO. Length is always 5. NEVER null.
    activity.ts:156   startsAt = slots.findIndex((slot) => minuteCloses.has(slot))
                      if (startsAt === -1) return null;
                      -> MISSING SLOT IS NULL. The whole reading is withheld.

**`activity_window` WRITING PROVES ONLY THAT `minuteTrades.size > 0`. It does not
prove a single slot matched.** `price_window` being NULL proves **no slot
matched `minuteCloses`** — and `minuteCloses` is set **unconditionally** at
`engine.ts:962` while `minuteTrades` is set only `if (tradeCount != null)`
(`:958`), so **`minuteCloses`'s keys are a SUPERSET.** No slot matched the
superset, therefore **no slot matched `minuteTrades` either.**

**THEREFORE THOSE ACTIVITY WINDOWS ARE ALL ZEROS, AND EVERY NAME CARRYING ONE
READS DEAD** — five zero slots are five slots under any dead line.

**AND THAT IS THE SHAPE OF THE 60-OF-71.** *"Of 71 names marked DEAD, 60 had a
busiest minute below the dead line"* is being carried to him as a fact about the
market. **A zero-filled window produces exactly that reading, on names that
traded.** It may be evidence of a defect rather than evidence about names that
spike and die — **which is the population he is asking about.**

**WHAT I REFUTED ON THE WAY, BECAUSE IT WAS THE ATTRACTIVE ANSWER:** a key-format
mismatch. `minuteSlot` is `new Date(...).toISOString()` (`activity.ts:209`) and
the stream's `normalizeTimestamp` is `new Date(parsed).toISOString()`
(`alpaca/messages.ts:55-61`) — **the same construction. The keys match.** So the
misalignment is in the WINDOW, not the KEY: `windowSlots` is asking for minutes
the maps do not hold, which points at `this.now()` versus bar time.

**THE ONE INPUT I HAVE NOT VERIFIED MYSELF — AND I SAY SO HAVING JUST BEEN WRONG
FOR EXACTLY THIS REASON:** the 7,757-versus-zero sibling contrast is **Ops's
sweep, taken on report.** The deduction needs those to be the SAME ROWS. **The
query that settles it is `activity_window IS NOT NULL AND price_window IS NULL`
on one day, in production, with `activity` beside it.** Not mine to run, and I
am not building on it further until someone has.

## THE ZERO-FILL DEFEATS MY OWN NOT-MEASURED GUARD, AND THE DEFENCE IS WHAT MAKES IT CONVINCING

**Ops confirmed it at row level, one predicate, `trading_date=2026-09-04`:
`aw SET | pw NULL` = 7,757, `aw NULL | pw NULL` = 1,015, and NO other bucket.
Same rows. And production-wide, ever: `price_window IS NOT NULL` → 0 rows,
`activity = 'ACTIVE'` → 0 rows. 12 of 12 top-by-rank DEAD.**

**THE CONSEQUENCE IS ON MY SURFACE AND IT IS MINE TO REPORT.**

`sparklineView` returns null **only** on `!window || window.length === 0`
(`sparkline.ts:73`). **A zero-filled window has length 5.** So:

    values  = [0,0,0,0,0]      peak = 0      silent = true
    heights = [0,0,0,0,0]      -> Math.max(1, ...) -> a 1px floor bar, five times
    title   = "Trades per minute over the ...: 0, 0, 0, 0, 0."

**THE `—` BRANCH NEVER FIRES.** `ActivitySparkline.tsx:29-37` returns *"No minute
activity recorded — not measured, which is different from silent"* **only when
the array is absent.** The engine hands it a present array of zeros, so the
component takes the other path and states the opposite.

**AND THE 1px FLOOR IS THE PART THAT STINGS.** My own comment at
`ActivitySparkline.tsx:100-103`: *"A measured zero still draws a 1px floor, so a
silent minute is visibly a MEASUREMENT rather than a gap. Not-measured never
reaches here — it returned above."* **That floor exists precisely so a reader can
tell a measurement from a gap. It has been certifying a measurement that never
happened, on every row, since 09-03.**

**I BUILT TWO DEFENCES AGAINST EXACTLY THIS AND BOTH ARE BYPASSED BY THE SAME
FACT.** `activityWindow: NULL means NOT MEASURED, never []` — the writer honours
it; the zero-fill produces a **non-empty** array upstream of the writer, so the
distinction is destroyed before my guard can see it. **A guard on the shape of
the value cannot catch a value of the right shape and the wrong provenance.**

**⇒ READ 1 IS ANSWERED BEFORE 04:00, AND WORSE THAN I PRE-REGISTERED.** I was
going to report *one colour observed, three unobservable*. **The truth is that
the entire `Now` column has been asserting a measurement it never took** —
`ACTIVE` and a populated `price_window` have a **zero denominator across the
whole life of the feature.** I will still take the read at 04:00 and report the
RENDERED state, because a payload fact is not an observation of a screen.

**AND THE VANISH GATE IS NOW ARITHMETIC, NOT JUDGEMENT.** He ruled vanish on a
signal that is **100% DEAD and has never once been ACTIVE**. **Shipping vanish
against today's signal empties the board.** Not "risks hiding a good name" —
**every row, every day.** Gate 1 was right and it is now quantified.

**Research admission did not collapse on the affected days** (Ops: 193 and 213
jobs, at or above baseline), **so the DEAD gate at `queue.ts:83` is reading DEAD
and admitting anyway** — a gate that has never refused anything, in front of a
signal that has never been ACTIVE. **Two inert mechanisms cancelling, which is
why nobody saw it.**

## WHERE THIS RESTS, AND WHAT IS ACTUALLY OWED

**Research fixed the band (`3c24f59`) and found the half I had assumed: I wrote
that the header already printed it, and it did not — it printed inside the
direct-measurement section, which RETURNS EARLY when `pm_open_at` is unpopulated.**
*So the band was invisible on exactly the runs where it could not be checked
against the output. My sentence described the design I assumed; they opened the
file. Fourth time today that was the thing that worked.*

**Verified here: `num` matching `config.ts:9-12` including the `> 0` guard, env
read at :97-98, flags still winning, band at :191 in the header ahead of the early
return.** *One non-blocker raised once and not argued: `num` is now in two files
because it is module-private in `config.ts`. Exporting it is a one-word change for
whoever is next in that file — the failure is quiet (config's parser changes, the
tool keeps the old rule, both look correct) but the band now prints on every run,
which is what would catch it.*

### THE LEDGER

    SESSION / SOUND / null    specified. Engine half is Research's. Nothing blocking.
    NAME arm                  unshipped regardless -- its trigger does not fire.
    the size question         tool ready. Ops schedules on a non-restart date.
    my render                 waits on the field. Both halves ship together.
    cf2cf0a                   the ONLY thing that touches his screen. Waiting on Ops.

**SEVEN PREDICATES DIED IN AN EVENING AND THE BOARD STATEMENT COST NONE OF THEM.**
*Everything after the first hour was the row mark, and the row mark turned out to
be a measurement question wearing a design question's clothes.*

### THE TWO ERRORS ARE SEPARABLE AND THIS IS THE WORDING TO KEEP

> **ERR TOWARD THE WARNING WHEN THE MEASUREMENT IS MISSING. NEVER DESCRIBE THE
> WARNING'S PREMISE AS MEASURED.**

**Both threads broke one of those today, in opposite directions.** *Research's said
anchors were sound and mine said they were late; neither was measured.* **Mine is
the one that cost something, because it reached him and shaped a ruling.**

## THE TEST IS BUILT, AND ITS BAND IS HARDCODED ONE LEVEL UP

**Research built the three-way split (`418b084`) and it is the right shape — it
can say BOTH of us are wrong, which a count could not.** *But the safeguard they
described does not hold, and the failure lands on the population the test exists
to isolate.*

    anchor-loss-cohort.ts:71-72   let priceMin = 1;  let priceMax = 20;   LITERALS
    :66                           reads process.env.MARKET_DB_PATH
    config.ts:71-72               num(env.DISCOVERY_PRICE_MIN, 1), num(env.DISCOVERY_PRICE_MAX, 20)

**The tool reads the DB path from the environment and does NOT read the discovery
prices. Config appears only in a comment.** *So the defaults are literals that
currently EQUAL the config defaults — which is the state in which a duplicated
threshold is invisible.*

**⇒ RETUNE `DISCOVERY_PRICE_MIN=2` AND THE WORKER'S BAND BECOMES [0.80, 40.00]
WHILE THE TOOL STILL REPORTS [0.40, 40.00].** *Every name closing between 0.40 and
0.80 is then bucketed INSIDE by the tool and treated as OUTSIDE by the worker —
and those are precisely the sub-floor gappers the split was added to isolate.*

**AND IT FAILS IN THE WORST DIRECTION: toward "moved inside the band too", which
is outcome three — the one meaning neither reading is right.** *A stale literal
would send both threads back to the drawing board and look like evidence.*

**The dead-line trap, moved from the band expression into the default. Reported;
theirs to apply.**

### THE BAND, VERIFIED, AND WHY I AM NOT GIVING HIM A THIRD NUMBER

**Config defaults 1 and 20, so [0.40, 40.00] is correct today.** *Which makes the
uncovered population narrower still: a sub-$0.40 name running into range, or a
$40-plus name falling in. The first is a real pattern; the second is rare
intraday.* **Holding that until the test runs rather than adding a third estimate
to the two he has already been given.**

## STOPPING THE DESIGN UNTIL THE NUMBER EXISTS

**Integration asked, correctly, whether the board statement is worth what tonight
cost. The answer is that the board statement cost NOTHING.**

    SESSION  engine started late AND not replayed   verified early, survived everything
    SOUND    we were watching from the open          came with it
    null     this build cannot say                   came with it

**⇒ SIX PREDICATES DIED FOR THE FOURTH ARM — THE ROW MARK — AND FOUR OF THEM WERE
MINE.**

**AND IT IS NO LONGER A DESIGN PROBLEM.** *Research's reading says the case may
barely occur outside a restart; mine says it occurs for names that gapped in from
outside the widened band. `anchor-loss-cohort.ts` on a NON-RESTART date separates
those, using fields it already loads.*

> **NO SEVENTH PREDICATE UNTIL THAT MEASUREMENT RUNS.** *Designing a detector for
> a population whose size is unknown and CHEAPLY KNOWABLE is what produced
> tonight. One more clever arm before the number is the same mistake in a new
> shape.*

**If the measurement says the case is rare, the honest render is the tooltip he
already has and NO FOURTH ARM IS BUILT AT ALL.**

### AND THE UNBUILDABLE FINDING NEEDS BOTH REASONS, NOT EITHER

*Integration recorded my mechanism; Research had corrected it. Both are true and
each covers a different population:*

    snapshot-set names        runtime exists  ->  engine.ts:903 NEVER REACHED
    gappers outside the band  no runtime      ->  903 reached, baseline present,
                                                  so no event, straight to ensure()

**Either way `onPromotionCandidate` does not fire for a universe name.** *But a
reader testing the baseline reason against a gapper finds the branch IS entered
and may conclude the arm works. The pair is the finding; neither half is.*

## I PUT AN UNVERIFIED PREMISE IN THE QUESTION HE RULED ON

**The worst error of the day, because it did not stop at a thread. Research found
the mechanism and it is not the one I recorded below.**

    engine.ts:816        seedSession() calls this.ensure(symbol)
    runtime.ts:849-873   the bootstrap loop has NO `continue` before seedSession

**⇒ A RUNTIME EXISTS FOR EVERY SNAPSHOT SYMBOL FROM BOOTSTRAP.** *So the
`if (!runtime)` block is never entered for them — and the PRICE GATE AT 902 LIVES
INSIDE IT.* **The band gates FIRST ADMISSION, not ingestion. A name with a runtime
has its 04:00 bars ingested whatever it is trading at, and its anchor is its true
first print.** *My baselines mechanism was wrong; the conclusion about the NAME
arm survives on Research's.*

### BUT THE SNAPSHOT SET IS NOT THE UNIVERSE, AND THAT PUTS THE CASE BACK

    runtime.ts:805-812   bandMin = discoveryPriceMin * 0.4
                         bandMax = discoveryPriceMax * 2
                         candidates = pinned + names whose PRIOR CLOSE is in that band

**Deliberately widened, and the comment says why: *"so a gapping name is not
missed just because it closed below the floor."* Someone has already thought about
this exact case.** *So the population with no bootstrap runtime is:*

    prior close < 0.4 x min    a SUB-FLOOR NAME THAT RUNS INTO THE BAND
    prior close > 2 x max      a high name that falls in
    no baseline / no previousClose

**The first is not exotic — a name closing under $0.40 against a $1 floor and
running to $3 is the shape he trades.** *For those there is no runtime, the price
gate DOES apply, sub-band prints are discarded, and the anchor is the first
in-band print. Late.*

### SO THE PREMISE WAS OVERSTATED, NOT FALSE — AND HE RULED ON IT

**I told him it happens to "nearly every newly-qualified name, every day."** *It
does not. Most qualify from inside the widened band and keep a correct anchor.*
**It happens to names that closed outside a band drawn to catch gappers: a much
smaller set, and not zero.**

> **I READ A CODE PATH SAYING ANCHORS SHOULD BE LATE AND PUT IT TO HIM AS A FACT
> ABOUT HIS BOARD, WITHOUT MEASURING IT.** *Research's own rule, sign-flipped: a
> path that says anchors should be correct is not evidence that they are.*

**MINE TO CARRY TO HIM, since I wrote the premise into the question.**

### THE TEST, SHARPENED BY THE BAND

**`anchor-loss-cohort.ts` on a NON-RESTART date already has `pm_open_at`, the
earliest retained bar, and `previousClose` on the baseline it loads. So it can
distinguish THREE outcomes rather than two:**

    moved concentrated OUTSIDE the band   both readings right; the case is that population
    moved scattered INSIDE it too         a mechanism neither of us has found
    moved ~ 0 everywhere                  Research complete, my premise simply wrong

## THE ARM THAT CARRIES HIS RULING CANNOT FIRE

**Verified three calls deep, and it is the worst finding of the exchange:**

    worker/alpaca.ts:81-82   baselineSymbols = universe.length > 0 ? universe : pinned
    worker/baseline.ts:37    ensureBaselines(universe)
    runtime.ts:692-709       loads persisted, builds missing, setBaselines(ALL)

**THE WHOLE UNIVERSE GETS A BASELINE AT STARTUP, IRRESPECTIVE OF PRICE.** *So at
`engine.ts:903` the `!this.baselines.has(symbol)` branch is FALSE for essentially
every universe name, and `onPromotionCandidate` NEVER FIRES for them* — **only for
a listing too new for historical bars, or a sheet symbol outside the universe.**

**⇒ THE `NAME` ARM IS DEFINED ON AN EVENT THAT, FOR THE POPULATION IT DESCRIBES,
DOES NOT OCCUR. The mirror of the check that cannot fail** — *the family we have
been chasing since yesterday, arriving inside the fix for it.*

### AND IT INVERTS THE FALSE-NEGATIVE NOTE: THE GAP IS THE WHOLE CASE

**Research filed range-entry as a bounded gap, least visible on the board. It is
not a class ALONGSIDE the promotion case. IT IS THE PROMOTION CASE.** *A name
qualifying at 07:40 is in the universe, so it has a baseline, so it skips the
branch, so it is tracked with no event.* **`drainPromotions` describes itself as
handling symbols that entered the price range mid-session — and its queue is fed
by an event those symbols never reach.**

**THAT IS THE CASE HE RULED IN THIS MORNING.**

### AND IT MAY NOT BE DETECTABLE FROM CURRENT STATE AT ALL

**Before 07:40 that name's bars arrive on the wildcard feed and are DISCARDED at
`engine.ts:902` on the price gate, before any runtime exists.** *Not a value
discarded at a boundary this time — a value NEVER TAKEN.* **And
`engine.ts:893` says why remembering them is not free: "growing memory without
bound."**

    SOUND    buildable, provable
    SESSION  buildable, VERIFIED -- the restart arm, the one thing that survived today
    null     buildable
    NAME     NOT BUILDABLE from what the engine holds

### SO THE ASK IS THE OPPOSITE OF A FIX: HE HAS TO BE TOLD

**He ruled that case IN this morning, on my question. A mark he was promised and
never sees is WORSE than the tooltip he already had** — *he would read a clean row
as CHECKED rather than as UNEXAMINED.* **That is the silence-implying-coverage
defect both exclusions exist to prevent, arriving through a render he approved.**

**⇒ SESSION, SOUND and null ship. The row mark does not. And he is told WHICH OF
HIS TWO ANSWERS HE ACTUALLY GOT.** *Mine to put to him, since the question was
mine.*

## NONE OF THIS EXISTS YET, AND `firstSeenAt` IS ALREADY SPENT

**Stated outright because the spec only implied it and Integration had to grep to
find out: `anchorLateScope` DOES NOT EXIST. Neither does any observed-since
stamp.** *Nobody should go looking for either. The coupling applies to it exactly
as written — field and render ship together, and a surface reading a field the
engine never sends is a warning that CANNOT FIRE.*

**AND THE OBVIOUS NAME IS TAKEN, IN THIS CODEBASE, FOR THE OPPOSITE THING:**

    lib/market/symbolAdmission.ts:26   RejectedSymbolRecord   an INVALID symbol
    lib/market/types.ts:611            RejectedSymbol         same
    lib/archive/coverage.ts:237-242    SymbolDeskDay          per symbol PER DATE
    lib/archive/repo.ts:113              persisted with it

**THREE MEANINGS, NONE OF THEM "WHEN THE ENGINE FIRST OBSERVED THIS SYMBOL".**
*The first two record when an INVALID symbol was first REJECTED by the provider —
the `OBSERVED PM` incident — and they announce themselves as wrong the moment the
interface is read.*

**THE ARCHIVE ONE DOES NOT, AND IT IS THE TRAP.** `SymbolDeskDay.firstSeenAt` is
per symbol per DATE and reads as exactly the field anyone here would be looking
for. **The name is not merely spent twice; it is booby-trapped once.**

**AND MY OWN REPORTING OF THIS WAS THE DAY'S WORST SEARCH FAILURE, WORSE THAN A
NARROW ONE: THE GREP WAS WIDE AND I FILTERED THE RESULT.** *Four hits in my own
output, I opened two, and reported an absence with the other two on screen.*
**Integration scoped a search too tightly and reported honestly from it; I had the
evidence and did not follow it.**

## RETRACTING MY OWN ACCEPTED FIX, AND NAMING THE FIELD

**Research took the per-symbol predicate partly on my word. Checking the code to
answer a different question, I found a false-positive class I had not seen.
Retracted before it is built.**

    engine.ts:899-907   a runtime is created at the symbol's FIRST IN-RANGE BAR
                        WITH A BASELINE -- not when it is "picked up late"

    engine up 03:00, printing at 04:00              observedSince 04:00   CORRECT
    engine up 03:00, first print of session 06:00   observedSince 06:00   CORRECT
    engine up 03:00, enters range at 07:40          observedSince 07:41   LATE

**⇒ THE SECOND AND THIRD SHARE ONE STAMP, AND THE SECOND IS MOST SMALL CAPS —
they do not print at 04:00.** *So `observedSince > sessionStart` marks LATE on
every name that merely started trading after the open, whose anchor is its own
genuine first print.*

**THE RULE THIS BREAKS IS ALREADY ON THE DESK: a process fact and a market fact
producing the identical value.** *A late PICKUP and a late FIRST PRINT give the
same stamp; the quantity separating them is whether the name traded before we
picked it up, which is the evidence the promotion path discards.*

**THE PREMARKET-PROMOTION FIND STANDS; THE REMEDY I OFFERED FOR IT DOES NOT.**
*Both predicates were blind to the case — that part is real and is the best thing
to come out of the exchange — but the fix I proposed is blind to it too.*

### AND THE KNOWLEDGE IS ALREADY EXPLICIT, ONE LINE ABOVE `ensure`

    engine.ts:903   if (!this.baselines.has(symbol)) { onPromotionCandidate(...); return []; }

**A symbol entering by that path is KNOWN to be a promotion at the moment it
happens, by the code doing it, with no inference.** *Research's "set the bit where
the knowledge exists" — already emitted, since the promotion queue is built from
it.*

### ALSO RETRACTED: MY `volumeBase > 0` HAZARD WAS BACKWARDS

**A seam with NOTHING behind it dropped nothing, so the anchor is the first print
and is CORRECT. The condition is not a VWAP leftover.** *Research measured it:
1,716 of 8,617 tracked names sit at zero volume and NONE is ever on the board —
so the false positives my version created would have been INVISIBLE, and nothing
would ever have contradicted them.*

### THE NAME, WHICH IS MINE, AND THE STATE THEIR ENUM WAS MISSING

    anchorLateScope: 'NAME' | 'SESSION' | 'SOUND' | null

**FOUR STATES, NOT THREE.** *`'PROMOTION' | 'SESSION_START' | null` has nowhere to
say THE ANCHOR IS FINE — the original contract carried that in `false`. Dropping
it collapses "sound" into "cannot say": both silent, for reasons that must not be
the same.* **Which is the flat-line defect, inside the field we are adding to
prevent it.**

    NAME     this row's anchor is late     ->  ROW MARK
    SESSION  late across the session       ->  BOARD STATEMENT
    SOUND    established at session start  ->  silent, A MEASUREMENT
    null     this build cannot say         ->  silent, AN ABSENCE

**SCOPE RATHER THAN CAUSE, DELIBERATELY.** *`anchorLateCause` invites a new enum
member every time a cause is found, and the render must learn each one.* **Scope
cannot grow: a feed stall, a backfill degeneracy, anything later is STILL either a
property of one name or of the whole session, and lands in an existing arm with
the surface unchanged.** *Same reason the condition beat the event two days ago —
name what the reader needs to know, not what happened.*

## THE SEAM PREDICATE IS BLIND ON FRIDAY. WITHDRAWN.

**Research broke it and I verified the break rather than accepting it.**

    runtime.ts:851-854   belongsToSession gates VOLUME
    runtime.ts:885       belongsToSession gates VOLUMEBASETHROUGH

**⇒ ON A PREMARKET RESTART THE DAILY BAR HAS NOT ROLLED, SO THERE IS NO SEAM AT
ALL.** *Friday's thirteen carried none. "Does this row still carry the bootstrap's
seam" is FALSE for every one of them, on the morning their anchors were
destroyed.*

**AND THE DAMAGE NEVER CAME FROM A SEAM.** *With no seam, `ingestBar`'s guard
never fired and nothing was dropped. The anchors were late because NOTHING WAS
REPLAYED — the engine started empty and only live bars arrived.* **Absence of
replay, not presence of a seam. I built a detector for the wrong mechanism.**

### RESEARCH'S REPAIR RECORD IS THE HALF THAT SURVIVES

    runtime.ts:946   volumeBaseSource: 'alpaca-historical-minute-bars'   the replayed set
    engine.ts:1003   writes volumeSource, NOT volumeBaseSource           so it stays pure

**Not gated by `belongsToSession`, last-write-wins, never overwritten. A genuine
record of WHICH PATH established this symbol's anchor.**

### BUT THEIR PROCESS HALF CONTRADICTS HIS RULING, WHICH LANDED AFTER THEY STARTED

**`observingSinceMs > sessionStartMs` is FALSE for a promotion on a normal
morning — so the structural daily case he explicitly ruled IN reads clean.**
*Research flagged this as "the product answer incidents-only" and asked for
sign-off. It cannot be given: the product answer is incidents-PLUS-structural and
it came from him.*

**AND IT IS WORSE IN HIS OWN WINDOW, which neither thread had found:**

    runtime.ts:1150   if (!dailyBar || etDateString(...) !== tradingDate) continue;

**`drainPromotions` SKIPS ENTIRELY while the daily bar has not rolled. A name
promoted during PREMARKET is never seeded at all** — *`ensure()` leaves
`volumeBaseSource: null`, its anchor is its first live bar after admission, and it
is late.* **Both predicates read FALSE on it. That is the commonest late anchor on
the board and it sits inside 07:00-10:00.**

### THE CHANGE: MAKE THE PROCESS HALF PER-SYMBOL

    anchorsEstablishedAfterSessionStart =
          symbolObservedSinceMs > sessionStartMs                  THIS NAME picked up late
      AND volumeBaseSource !== 'alpaca-historical-minute-bars'    and not replayed

**`ensure()` (`engine.ts:473-489`) constructs the runtime lazily and carries NO
creation stamp — checked, there is no `observingSince` anywhere in the file.** *So
this is one assignment where the symbol first becomes known: the same cost as the
process-level field, in the same file.*

    Friday premarket, the 13     picked up 08:33 > 08:00, not replayed   TRUE   correct
    Friday, the 4 pins           replayed                                FALSE  correct
    Today 13:16, top-200         replayed                                FALSE  correct
    Today, the ~8,600            picked up 13:16, not replayed           TRUE   correct
    Normal morning from 04:00    picked up at/before start               FALSE  fires zero
    Premarket promotion 07:40    picked up 11:40Z, not replayed          TRUE   HIS RULING

**It degrades to Research's exactly when every symbol was picked up at process
start, which IS the restart case — so nothing they verified is lost.**

### AND THE CHANNEL SEPARATOR FALLS OUT FREE

**Every tracked symbol sharing one observed-since is a RESTART -> board statement.
A symbol observed later than the process started is a PROMOTION -> row mark.**
*No minute-string identity test, so the collision question I created disappears.
No threshold. No second field.*

## HIS RULING: MARK THE ROW. `LATE`.

**Put to him directly rather than relayed, because it is a question about what the
board is FOR and both threads had escalated it to him.** *The framing: a name that
qualifies at 07:40 shows "+43%" meaning since 07:40, not since the premarket open,
and this happens to nearly every newly-qualified name every day.*

    PM Move +43.6%  LATE
    tooltip: PM Move from 16.24 at 07:40 ET on 5 trades in the anchoring minute

**He chose the row mark over leaving it to the tooltip and over relabelling the
cell.** *Which is the right call for the reason the relabel was tempting and
wrong: one row reading `Move from 07:40` while its neighbours read `PM Move` is
two words for one quantity on one screen — the exact drift the mirror guards
exist to catch.* **A mark is a third word in a slot that already holds `thin` and
`?`; a relabel is a second vocabulary.**

### PRECEDENCE: `LATE` TAKES THE SLOT FROM `thin`

**A row can be both. `thin` says the anchor rests on few trades; `LATE` says the
anchor IS NOT THE SESSION OPEN AT ALL.** *If the minute is wrong, its thickness
is not the reader's problem — a precise measurement of the wrong thing.*
**`LATE` wins, and `UNKNOWN`/`?` stays below both because it is an absence rather
than a finding.**

### AND THE RULING MAKES RESEARCH'S SEPARATOR NECESSARY, NOT OPTIONAL

**Both causes now render, and they render DIFFERENTLY:**

    PROMOTION   structural, daily, one name at a time   ->  ROW MARK
    RESTART     an incident, board-wide at once         ->  BOARD STATEMENT

**One predicate, two causes, two channels — so the render must tell them apart,
and a board-wide condition stated three hundred times is still one fact
repeated.** *Research held their separator back until the product question was
answered, which was the right order. It is answered, so it is now in order:*

> **A promoted name's seam EQUALS its own `qualified_at`. A name already tracked
> and caught by a bootstrap has an admission EARLIER than its seam.**

**⇒ NO THRESHOLD. The two causes are distinguished by identity, the same way
promotions were kept out of the board field — which is the third time today that
comparing two stored moments has replaced a number somebody had to choose.**

## THE START-TIME PREDICATE FIRES WHEN THE BACKFILL WORKED — THE SEAM DOES NOT

**Integration found it and it breaks the ruled default: Ops restarted mid-session
at 13:16:23 ET today, TODAY'S ANCHORS ARE FINE, and
`observingSinceMs > sessionStartMs` reads TRUE on that.** *A field that fires
when the backfill WORKED is the same defect as one that fires every morning,
arriving by a different route.*

**WHY TODAY WAS FINE, which nobody had established:** `runtime.ts:963-973` does
not merely STORE the historical bars — **it feeds every one through
`engine.ingest`, which rebuilds the session open.** *A restart whose backfill
reached a name reconstructs that name's anchor. The start-time predicate fires
anyway, because it asks WHEN THE ENGINE STARTED rather than WHETHER THE
RECONSTRUCTION SUCCEEDED.*

### THE SEAM IS THE FACT THAT SEPARATES THEM, AND IT IS ALREADY IN RUNTIME STATE

    runtime.ts:822   const snapshotMinute = minuteKey(new Date())   ONCE per bootstrap
    runtime.ts:885   volumeBaseThrough: belongsToSession ? snapshotMinute : null
    runtime.ts:943   focused set WITH bars  ->  volumeBaseThrough: NULL
    runtime.ts:1143  each promotion drain computes its OWN snapshotMinute

**Covered by the backfill: NO SEAM. Missed by it: still carrying THE BOOTSTRAP'S
seam — ONE SHARED VALUE, computed once, identical across every name the backfill
failed to reach.**

**⇒ THE PREDICATE IS "DOES THIS ROW STILL CARRY THE BOOTSTRAP'S SEAM", and the
board statement fires when a row ON THE BOARD carries it.**

### IT SURVIVES BOTH OBJECTIONS THAT KILLED MY LAST PROPOSAL

**"No population survives a restart"** — *none is needed.* **This is the IDENTITY
of a single value the engine already holds, not a set it must remember across the
process boundary.**

**"Aggregating per-symbol facts imports promotion contamination"** — *promotions
carry a DIFFERENT seam by construction; each drain computes its own minute at
1143.* **Excluded by identity, not by threshold, so there is still no threshold
to choose.**

**AND IT IS THIS MORNING'S DISCRIMINATOR, ONE LAYER UP.** *The ANCHOR scatters —
each name stamped at its own next print — which is what Ops measured and what
refuted me. The SEAM DOES NOT SCATTER. One value, set once, before any of that.*
**I was measuring downstream of the fact that carries the signal.**

### AND AN OBSERVATION THAT MAY MATTER MORE THAN THE PREDICATE

**"Today's anchors are fine" is about the names ON THE BOARD NOW.** *The backfill
fetches bars only for a focused set — roughly top hundred plus pinned,
`runtime.ts:936` — and a name outside it keeps the seam silently.* **Friday's
thirteen were RANKED names: damaged at 08:33 while outside the focused set, and
they ranked onto the board LATER.**

> **DAMAGE DOES NOT SURFACE AT RESTART. IT SURFACES WHEN A DAMAGED NAME
> QUALIFIES. So "fine now" is not "fine today".**

**⇒ ANY FIELD EVALUATED ONCE AT BOOTSTRAP MISSES IT.** *That is the argument for
evaluating against the ROW at render time, which the seam predicate does and the
start-time one structurally cannot — it has one answer for the whole process
lifetime while the population it describes changes underneath it all morning.*

### WHAT I HAVE NOT VERIFIED, SENT WITH IT RATHER THAN LEFT TO BE FOUND

**Whether the bootstrap's seam is distinguishable from a drain's BY VALUE** —
*both are minute strings, and a drain landing in the bootstrap's clock minute
collides.* **Narrow; I do not know how narrow.** *If not narrow enough, the engine
must hold the bootstrap minute explicitly rather than infer it.*

**And the firing rate: how many tracked names fall outside the focused set on a
typical restart. A number, not a judgement, and Research's.**

## THE STALL HAS A DISCRIMINATOR, AND IT IS A RULE THIS DESK ALREADY WROTE

**Research sharpened the feed hole and was right to: a DISCONNECT announces
itself, a STALL does not.** *A socket that stays open and stops delivering just
looks like quiet — and "no bars" is already the death signal here, so the two are
one row.* **A seventh event kind would record disconnects and could still miss
the case that actually produces late anchors.**

**THE RULE THAT APPLIES IS THE ONE FROM RESTART-VERSUS-QUIET-MARKET:** *when a
process fact and a market fact produce the identical row, find the QUANTITY THE
MARKET WOULD HAVE MOVED.*

    lib/market/alpaca/stream.ts:44   wildcard channels: bars, updatedBars, statuses
                   -- WHOLE-MARKET, not the tracked set

    quiet market ->  FEW bars, across few symbols
    stall        ->  ZERO bars, across EVERY symbol, at once

**A genuinely quiet market still delivers SOMETHING SOMEWHERE on a whole-market
feed. Zero prints from the entire US tape for two minutes at 09:35 is not a
market state.** *A heartbeat the market cannot fake, already arriving, already
counted.*

### TWO LIMITS, STATED RATHER THAN DISCOVERED

**`wildcardDenied` (`lib/market/alpaca/stream.ts:72`) falls back to an EXPLICIT SYMBOL LIST.** *On
that path the subscription is the tracked set, a small set can genuinely be
silent, and the discriminator degrades exactly where it is needed.* **Whether
that fallback is live in production is Research's to say.**

**And the threshold is real in deep premarket** — *at 04:30 the whole-market rate
is low enough that zero-for-N is thin.* **It strengthens through the morning and
is strongest in HIS window, which is the part that matters — but it is a gradient,
not a line, and where to cut it is a measurement rather than a judgement.**

**⇒ PROPOSED FOR THE DOCSTRING: NOTHING. Research's wording stands.** *Recorded
here only because "indistinguishable from a quiet market BY CONSTRUCTION" is true
of a per-symbol view and NOT of the whole-market feed we already subscribe to,
and that should not go down as settled while an uncosted angle exists.*

### AND THE ROOT, AS A QUESTION RATHER THAN THREE LESSONS

> **WHAT DOES THE CODE HOLD AT THE MOMENT IT HAS TO ANSWER?**

**Three instances today across three seats** — *my scatter discriminator, my
session-start population, Research's Friday retraction and its overcounting
proxy.* **One root: validating a predicate against the DATA'S SHAPE instead of
against the STATE AVAILABLE AT EVALUATION TIME.** *Research's framing, and better
as a question than as a warning — because it applies to a proposal that looks
fine, which is the only case that needs it. Both of mine looked fine.*

**It is one file, opened at the right line, BEFORE the reasoning rather than
after.**

## MY POPULATION IS WITHDRAWN: THE DENOMINATOR DISAPPEARS IN THE FIRING CASE

**Research refuted "tracked at session start" in one sentence and it is fatal.
After a mid-session restart THE ENGINE HAS NO MEMORY OF WHAT IT WAS TRACKING AT
04:00.** *Every `TickerRuntime` is newly constructed; nothing crosses the process
boundary; the store does not record it; and the one column that would hint at it
is the literal `null` I had cited two paragraphs earlier in the same message.*

> **A PREDICATE WHOSE DENOMINATOR VANISHES IN ITS OWN FIRING CONDITION IS NOT A
> PREDICATE.**

**SAME ROOT AS THE DISCRIMINATOR I GOT WRONG THIS MORNING, TWICE IN ONE DAY:**
*reasoning about what the data would LOOK like without asking what the code can
SEE at the instant it must answer.* **I reached for the population because I
wanted the board-wide property and did not check that the population still
exists when the field is computed.**

### ADOPTED INSTEAD — RESEARCH'S, AND IT IS BETTER

    observingSinceMs > vwapSessionStartMs(PREMARKET, tradingDate)

**BOARD-LEVEL BY NATURE RATHER THAN BY AGGREGATION, and that is the whole
difference.** *I was buying the board-wide property with a documented scope rule;
this gets it structurally.* **One process, one answer. No population to define,
so no promotion contamination and nothing to keep in step later. False on a
normal morning by construction rather than by tuning. One assignment.**

**AND IT IS NOT FRIDAY'S ERROR WEARING A NEW COAT** — *Research's distinction,
and it is sharp enough to record.* **Friday was proving a MARKET claim from a
process fact (*this is the session's first print*). This claim IS about the
process** — *"the anchors for this session were established after it began" is a
statement about our own observation, so a process fact is its correct basis
rather than a proxy for one.* **They look identical and are opposites.**

### THE HOLE, AND ONE WORD OF IT IS WRONG: UNRECORDED, NOT UNDETECTABLE

**A feed disconnect while the engine stays up produces late anchors and moves
NEITHER predicate. Agreed, and right to name it.** *But `feed_health` being a
single overwritten row is not the end of it.*

    repo.ts:1020   INSERT OR IGNORE INTO desk_events (...) VALUES (...)

**`desk_events` is APPEND-ONLY by construction, with a dedupe key, and already
carries six kinds** — *DISCOVERY_QUALIFIED, RVOL_RANK_ENTRY, AH_RANK_ENTRY,
NEW_HOD, HALT, RESUME.* **Nothing writes a feed transition into it. The channel
exists; the record does not.**

**⇒ SO THE DOCSTRING MUST SAY "THIS PREDICATE DOES NOT COVER A FEED GAP", NOT "A
FEED GAP CANNOT BE COVERED".** *The second closes a door that is open, and a
future seat reading it would stop looking.*

### BOTH EXCLUSIONS SHIP VISIBLE

**`false` means THE ENGINE OBSERVED THIS SESSION FROM ITS START. It does NOT mean
every anchor is sound.** *Promotions out of scope structurally; a feed gap out of
scope and currently unrecorded. Both stated beside each other, so a silent board
is never readable as full coverage.*

## THE PREDICATE ALREADY EXISTS, AND IT DECIDES WHETHER THE FIELD CAN BE BOARD-LEVEL

**Research accepted the contract unchanged and named one open question: what the
engine treats as "established after the session began", now that the condition
has at least two routes in** — *a restart, and a backfill-selector degeneracy
they diagnosed today, with promotion a likely third.*

**THE ANSWER IS ONE METHOD OVER, ALREADY BUILT.** `vwapStateOf`
(`engine.ts:1165-1169`) derives PARTIAL vs COMPLETE per symbol per session from:

    runtime.volumeBaseThrough && runtime.volumeBase > 0   ->  PARTIAL

**That is the anchor's question too: was the engine watching this symbol
CONTINUOUSLY from session start to the anchoring minute? A seam means no.** *And
it covers all three causes WITHOUT ENUMERATING ANY — restart, degenerate
backfill and promotion are one condition, a seam before the anchor. A predicate
on the seam cannot be surprised by a fourth cause.* **Condition, not event,
already implemented.**

**IT MUST BE READ FROM THE RUNTIME, NEVER THE COLUMN.** *In memory
`volumeBaseThrough` is real; `runtime.ts:1753` replaces it with a literal `null`
at the write boundary. Same value, two fates — Research's constant-versus-absence
finding, one field over.*

### AND THE SEAM IS PER SYMBOL, WHICH IS THE PROBLEM

**A promoted name has a seam EVERY DAY by construction. So a board field defined
as "any tracked symbol has a seam" is TRUE EVERY MORNING — and dies to the exact
budget rule both threads agreed to build to.** *Worthless within a week.*

**NOT REOPENING THE SPARSE QUESTION.** *Integration's number settled the restart
case and my discriminator was wrong.* **The narrow claim is only this: the
predicate decides whether the field can stay board-level, so it must be chosen
deliberately rather than fallen into.**

### PROPOSED, AND IT IS RESEARCH'S CALL

**Define the field over the population TRACKED AT SESSION START, not over every
tracked symbol.** *That population is board-wide by construction — a restart or a
degenerate backfill takes all of it at once, a normal morning takes none of it —
so the field stays rare, stays board-level, and stays honest about what the board
statement actually claims.*

**AND RECORD IN THE FIELD'S OWN DOCSTRING THAT PROMOTIONS ARE OUT OF SCOPE BY
CONSTRUCTION.** *Not because they do not matter — because they are invisible to
the store and their render is a separate, unbuilt decision.*

> **A SILENT BOARD MUST NOT BE READABLE AS "EVERY ANCHOR IS SOUND". It means
> "the anchors established at session start are sound."**

**That is Research's own fourth-bucket discipline applied to the surface: they
refused to let the instrument assert a clean bill on a population it cannot see,
and a marker that is silent in a way implying coverage it does not have is the
same assertion in the other direction.**

## THE ANCHOR WARNING IS SPECIFIED AND DELIBERATELY NOT BUILT

**The render question is settled — board-wide, one statement. So I went to build
it, and `universe.ts` had already declined my approach in writing.**

**I was going to derive "the worker started mid-session, so the anchors are
suspect" from `workerStartedAt`, which sits on the health object the board
already reads.** *`universe.ts:63-71` declines exactly that inference, for
reasons that transfer without modification:*

> **"The fix belongs at the stamp, not at the reader."** *Inferring a session
> fact from a start time puts ONE FACT IN TWO PLACES, agreeing by discipline
> until one drifts — and the second copy would live in a component, which is
> exactly where the clock-relative reasoning went wrong before.*

**AND IT CITES A REAL DEFECT THAT THE SHORTCUT WOULD HAVE MASKED:** *2026-09-07,
where startup established a session without stamping `trading_date_rolled_at`.*
**So this is not a style preference; it is a mechanism that has already failed
once here.**

### THE FIELD, WHICH THE ENGINE OWNS

    anchorsEstablishedAfterSessionStart: boolean | null

**NAMES THE CONDITION, NOT THE EVENT.** *Not `workerRestarted`. A restart is one
way to get here; what the board needs to say is that the anchors for THIS session
were established after it had already begun — which is the thing that makes a
Move untrustworthy, whatever caused it.* **`null` is "this build cannot say",
and it renders SILENT, because an old build cannot report on a field it never
had — `universeWarning`'s own rule.**

**IT MUST BE STAMPED, NOT DERIVED.** *A read-time rule over `volume_base` cannot
supply it: `worker/runtime.ts:1752` writes a hardcoded `0`, so such a rule
returns `PROVEN` for every row forever. An absence degrades to UNKNOWN; a
constant degrades to a confident lie.*

### AND IT MUST PASS THE BUDGET TEST THAT MODULE SETS

> **"If it would fire on a normal morning it does not belong here at any volume."**

**A restart is rare, so this qualifies — but only if the condition is
`established after session start` and not `worker started today`, which is true
every single morning.** *That distinction is the whole difference between a
marker he reads and a marker he learns to ignore.*

### THE ROW CONSTRAINT, FROM OPS, WHICH THE CURRENT CODE ALREADY SATISFIES

**If a row ever shows its anchor time it must be THE NAME'S OWN VALUE, never a
shared session-level one.** *The Move tooltip renders `reading.at`, which comes
from that row's own `SessionOpen` — correct today.* **Recorded because the
tempting "helpful" edit, once a board statement exists, is to substitute the
session's restart minute into the rows, and thirteen different anchors labelled
with one shared time is the frame lie again.**

**NOT BUILT, AND THE HALF IS THE DEFECT. A component reading a field the engine
never sends is a warning that CANNOT FIRE — the mirror of the check that cannot
fail, and the same family. The field and the render ship together.**

## THE ANCHOR TIMES CAME BACK AND MY DISCRIMINATOR WAS WRONG

**Ops read them 14:23Z Monday, read-only, full table in `ops.md`. 13 of 17
misplaced, not 17 — and EVERY ONE equals that name's own FIRST BAR AFTER THE
RESTART:**

    08:33  08:34 x5  08:35  08:37  08:44  09:06  09:32  09:39  10:04

**⇒ A RESTART DOES NOT STAMP ONE SHARED INSTANT. IT STAMPS EACH NAME AT ITS OWN
NEXT PRINT.** *I collapsed the CAUSE instant into the DAMAGE instant. The cause is
singular; the damage lands wherever each name next trades, so scatter is what
restart damage looks like and "scattered" separates nothing.* **Wrong model of
the mechanism, not a close call.**

**Ops's discriminator is better because it observes rather than infers:** *do
post-restart bars exist BEFORE the anchor?* **Zero of 17. One cause.**

### THE RENDER, AND A CONSTRAINT I HAD NOT WRITTEN DOWN

**BOARD-WIDE. ONE STATEMENT. Unchanged.** *And Ops's closing line is a real
addition: if a row ever shows its anchor time, it must be THE NAME'S OWN VALUE,
never the restart minute.* **Thirteen rows whose anchors are thirteen different
minutes, labelled "since 08:33", would be a second false frame one day after
fixing the first.**

### WHAT THE TEST CANNOT SEE, WHICH IS A DIFFERENT CLAIM FROM MY REFUTED ONE

**This cohort cannot contain a promotion case, and the REASON is the finding.**

    drainPromotions -> buildBaselinesFor   1Day bars, ending tradingDate-1
                    -> getSnapshots        a daily lump
                                           NO INTRADAY FETCH ON THIS PATH

**So a promoted name's `minute_bars` BEGIN at its admission minute** — *and a
promotion-caused misplaced anchor therefore has `pm_open_at` EQUAL to its first
stored bar.* **It passes Ops's test. It would sit among the four survivors, not
the thirteen.**

> **THE DEFECT DESTROYS THE EVIDENCE THAT WOULD DETECT IT.** *"Anchor later than
> the name's own first bar" cannot see it at any N, on any date, because the
> discarded bars are the ones that would prove the anchor late.*

**NOT A CRITICISM OF THE QUERY — it is the right query for restart damage and it
answered that cleanly. It is a statement that the store CANNOT answer the
promotion question, because comparing against our own bars compares the defect
to itself.** *The instrument has to be Alpaca's historical minutes against the
stored anchor. Filed as an open question rather than asserted, and not requested:
a per-symbol REST call on a live worker in his window is Research's call.*

## THE NUMBER IS IN, IT IS BOARD-WIDE, AND IT ANSWERS ONE CAUSE OF TWO

**Ops ran the expiring measurement Saturday (`80158db`). 2026-09-11, restart
08:33Z, control PASSED — 1,392 names printing before and 2,987 after.**

    ranked <= 50    17 of 32 premarket names lost their anchor    53.1%

**⇒ BOARD-WIDE. ONE STATEMENT AT THE BOARD, `universeWarning`-STYLE, NOT A PER-ROW
MARK.** *Half the ranked board at once is systemic by construction, so `NOT_FIRST`
never competes with `thin` for the mark slot on the day it fires, and the
precedence question I was holding open never arises.* **The coupling is unchanged
and now simpler: the board statement is not decoration beside the row mark, it IS
the carrier. Both halves still ship together. "Just the row mark" is still the
defect.**

### BUT THE COHORT WAS SELECTED BY ONE CAUSE, SO IT CAN ONLY SPEAK ABOUT THAT CAUSE

**Integration read "the threshold never needs choosing" off this. That follows
only if a restart is the ONLY thing that misplaces an anchor.** *Their own
sentence is the reason to doubt it — "anything sparse has a different cause
entirely and would be a different finding."* **I think the different cause is
`drainPromotions`, and I think it fires every day.**

    worker/runtime.ts:1153   seedSession on MID-SESSION ADMISSION
                             volumeBase: dailyBar.v       POSITIVE LUMP
                             volumeBaseThrough: now       SEAM AT ADMISSION
                             ...and no getBars. Ever.
    engine.ts:954            bars at or before the seam are DROPPED

**A name qualifying at 07:40 loses its 04:00-07:40 bars and takes 07:40 as its
`pm_open_at`.** *Friday's defect, with no restart, on every mid-session promotion
— which is most of what he trades, because a name that just qualified is the
interesting one.* **The `volumeBase: 0` reset at :943 is bootstrap-only and
promotions never reach it.**

**⇒ IF IT HOLDS, `NOT_FIRST` IS A STEADY SPARSE BASELINE UNDER THE RESTART BURSTS,
AND THE RARE CASE IS THE BOARD-WIDE ONE — THE REVERSE OF WHAT I WAS BUILDING.**

### WHAT DISCRIMINATES THEM, AND IT IS ONE COLUMN ON A QUERY THAT ALREADY RAN

**Requested before the Wednesday expiry: the distribution of `pm_open_at` across
the 17 misplaced names.** *A restart stamps ONE SHARED INSTANT. All 17 at 08:33Z
means purely restart-caused and I drop this; a scatter through the morning means
promotions.* **The OFFSETS cannot tell them apart — "worst offset 3,119s" is a
spread in FIRST-BAR times, not in anchor times. Only the anchor timestamps
separate the mechanisms.**

*Not a second date. The short window is better spent on the question that
discriminates than on a repeat of the question already answered.*

**AND A FLAG FOR THE REPLAY WIRING:** `drainPromotions` is the exact shape
`c7d41b9` proved makes `replaySession` a silent no-op — snapshot seed with the
seam at the current minute. **So "replay first, snapshot fallback" has a SECOND
call site, currently scoped to startup, and a freshly promoted name has no local
bars, which is the fallback arm, which reproduces the anchor problem unless the
bars get fetched.**

## A CONSTANT DEGRADES TO A CONFIDENT LIE WHERE AN ABSENCE DEGRADES TO UNKNOWN

**Research went one step deeper than my write-only warning and the truth is
worse. Verified here:**

    worker/runtime.ts:1752   volume_base: 0,            HARDCODED
    worker/runtime.ts:1753   volume_base_through: null, HARDCODED
    worker/runtime.ts:1754   volume_base_source: state.volumeSource,   REAL

**The engine HAS the true value — `engine.ts:818` sets `runtime.volumeBase` from
the seed — and the writer throws it away and writes a literal.** *The SOURCE
column faithfully records which mechanism produced a base that was never stored.*

**⇒ AND THE CONSEQUENCE IS THE SHARPEST VERSION OF THIS FAMILY I HAVE SEEN.**
Under the rule `volumeBase = 0 -> PROVEN`, **a read-time implementation would
return `PROVEN` for every row in production, forever** — not `UNKNOWN`. **A check
that cannot fail, silently certifying every anchor as trustworthy, including the
540 lost to Friday's restart.**

> **ABSENT DEGRADES TO UNKNOWN. A CONSTANT DEGRADES TO A CONFIDENT LIE.**

**The three-state discipline protects against a MISSING value and does nothing
about a CONSTANT one.** *Research's formulation, and it is a real addition —
everything I have caught this week has been an absence wearing a value's clothes.
This is a value with no measurement behind it, which the same guards wave
through.*

### AND ITS "RESTART-CAUSED IS ALWAYS BOARD-WIDE" MAY MISS A ROUTINE SPARSE CASE

**Research's closing hypothesis is that the sparse/board-wide threshold may not
need choosing: a restart hits every tracked symbol at once, so the cohort is
board-wide by construction, and anything sparse has a different cause.**

**THE DIFFERENT CAUSE MAY EXIST AND BE ROUTINE.** `seedSession(symbol, seed)` is
**per symbol** — *"reconstructed session state from the historical bootstrap"* —
and it sets a `volumeBase` describing volume that PRECEDED that symbol's seam.
**A name that qualifies onto the board at 07:00 has been trading since 04:00, so
its seam carries `volumeBase > 0` — which is `NOT_FIRST` by Research's own rule,
every day, for every mid-session admission.**

**IF THAT HOLDS, THE FREQUENCY IS NOT ZERO-THEN-BURSTY. It is a STEADY SPARSE
BASELINE PLUS BURSTS** — and the sparse baseline lands on **newly-admitted
names, which are precisely the ones he is scanning.**

**I AM RAISING IT AS A QUESTION, NOT A REFUTATION. WHAT WOULD SETTLE IT:** *does
`SessionSeed` carry a session-open price, and is a mid-session admission seeded
the same way a startup bootstrap is?* **Research's code and Research's call. But
if it holds, the per-row mark fires routinely on the most interesting rows on the
board, and "loud" needs deciding a third time.**

## BURSTY CHANGES THE CARRIER, NOT THE VOLUME — AND THE NEW DISCRIMINATOR IS A THIRD WRITE-ONLY COLUMN

**Research retracted its engine-start reason: *"ran continuously"* is not knowable
because a SIP disconnect loses bars with no restart, and `feed_health` is a single
overwritten row. **It had proposed proving a MARKET claim from a PROCESS fact** —
the same class as a `NO_PRINT` produced by a restart. **The repair is better: the
bootstrap's `volumeBase` records volume preceding the seam, and `volumeBase = 0`
is a positive measurement rather than an absence.**

**BUT I CHECKED WHETHER IT REACHES ME, AND IT DOES NOT:**

    volumeBase / volumeBaseThrough   engine.ts:126-150   ON THE RUNTIME
    volume_base + 2 siblings         repo.ts INSERT/upsert   WRITTEN
    DemandState                      types.ts   ZERO REFERENCES   NEVER READ BACK

**THIRD WRITE-ONLY COLUMN TODAY** — after `activity_config`, and after nine
session-open columns that were read and never written. *All three found by asking
**can the consumer see it**, rather than **does it exist**.*

**NOT A BLOCKER, BECAUSE PROVENANCE IS COMPUTED IN THE ENGINE AND EMITTED ON
`SessionOpen`, WHICH I DO READ.** **But it corrects the framing: *"available now,
per symbol, today"* is true AT THE ENGINE and false at the store read.**

**AND THE TRAP IS ALREADY ON RECORD ONE FIELD OVER: `state` hit exactly this.**
*`sessionOpensFromRow` could not derive it — no clock in a row — so it returns
`UNKNOWN` and needs three stored columns to say more.* **Provenance would hit the
identical wall for the identical reason if anyone tried to derive it at read
time. It must be computed at WRITE time and stored, or it is `UNKNOWN` forever.**
*That is the schema-27 lesson arriving before the mistake instead of after it.*

### THE DISTRIBUTION IS BURSTY, AND THAT CHANGES THE CARRIER

**Research's correction to my "rare, so it can be loud": it is ZERO on an
ordinary day and covers a LARGE PART OF THE BOARD on a restart day.** *Friday was
one — Ops restarted at 08:33Z, mid-premarket.*

**A BOARD-WIDE CONDITION STATED THREE HUNDRED TIMES IS NOT THREE HUNDRED FACTS.
IT IS ONE FACT REPEATED**, and per-row is the wrong carrier for it. **The desk
already has the right one: `universeWarning` says *"Board may be missing names"*
ONCE, at the board, for exactly this kind of systemic condition.**

    SPARSE      a handful NOT_FIRST among PROVEN rows
                -> per-row mark, loud. Genuinely per-row information.
    BOARD-WIDE  the anchors were lost at 08:33
                -> ONE statement at the board. The per-row marks become noise
                   repeating a fact already stated.

**⇒ SO RARE-VERSUS-BURSTY IS NOT A CHOICE BETWEEN LOUD AND QUIET. IT IS TWO
CARRIERS FOR ONE FACT, SELECTED BY EXTENT** — and Research is right that a
board-wide misplaced-anchor day is exactly when he should be told loudly, which
the board-level statement does better than the per-row mark does.

**I AM NOT PICKING THE THRESHOLD THAT SEPARATES THEM.** *Same discipline as the
dead line: it wants measuring or ruling, not inventing.*

### AND `UNPROVEN` IS COMMON, WHICH PUTS THREE FACTS IN ONE SLOT

**Integration's point, and nobody had connected it to the render: `UNPROVEN` is
not an edge case.** *It is the honest answer whenever there is no seam, and a
disconnect mid-session leaves no trace at all — replay does not fix it, because
replaying bars we never received recovers nothing.* **Closing it needs a durable
record of feed gaps, which is Ops's, and Ops retired tonight.**

**SO THE ONE MARK SLOT IS NOW CONTESTED BY THREE FACTS:**

    NOT_FIRST   the anchor is the wrong minute        per-row
    thin        the right minute, weakly measured     per-row, ~half the board
    UNPROVEN    we cannot say whether it is right     COMMON, and not per-row

**AND THE THIRD IS NOT A PRECEDENCE PROBLEM — IT IS THE CARRIER ARGUMENT AGAIN.**
*"The desk cannot prove its anchors today" is one fact about the desk, not three
hundred facts about three hundred names.* **It goes to the board, exactly as a
board-wide `NOT_FIRST` day does, and for the same reason.**

**⇒ THE SLOT CARRIES PER-ROW FACTS; SYSTEMIC CONDITIONS GO TO THE BOARD.** That
resolves three-into-one without inventing a precedence, and it is the same rule
twice rather than a special case.

**ONE THING IT DOES NOT RESOLVE, AND I AM NAMING IT RATHER THAN GLOSSING IT:
absence of a mark would mean PROVEN *or* UNPROVEN — "fine" or "cannot say".**
*That is weaker than `thin`, where absence means THICK because `UNKNOWN` is
separately marked `?`.* **It is acceptable ONLY IF the board-level statement is
carrying the unproven case; if that statement is not built, the absence quietly
means two things and I will have shipped the collapse I have spent three days
removing.** *The board statement is not decoration — it is what keeps the row
mark honest.*


## AND NOT THAT AXIS EITHER: TWO INDEPENDENT FACTS CANNOT SHARE ONE ENUM

**Research accepted "not a state" and countered that it is not an
`AnchorThickness` member either — a THIRD axis,
`AnchorProvenance = PROVEN | NOT_FIRST | UNPROVEN`. I am taking it, with no
counter, and reason one is my own catch handed back.**

**"MISPLACED IS NOT A THICKNESS."** *A type named `AnchorThickness` with a
`MISPLACED` member is a type whose name no longer describes its domain* — **which
is the SOLID-versus-THICK vocabulary drift I found in my own duplicate yesterday,
and the half no test detects because both sides stay correct.** *I made that
argument and then proposed the thing it forbids.*

**AND THE PROPERTIES ARE GENUINELY INDEPENDENT, WHICH IS WHY ONE ENUM CANNOT HOLD
THEM:**

    how well measured is the minute we have?   -> trade count   -> THICKNESS
    is the minute we have the RIGHT one?       -> residual      -> PROVENANCE

**Thick-and-misplaced and thin-and-proven both exist.** *Fold them and the
cross-product is gone, and a consumer auditing anchors wants both facts. A
collapsed field cannot be taken apart again — the same reason a guard on the
SHAPE of a value cannot recover its PROVENANCE.*

**AND THE THIRD ARGUMENT IS MINE FROM AN HOUR AGO, USED CORRECTLY AGAINST ME: a
render that must rewrite a LABEL needs the reason as its own value.** *The
misplaced case changes what the row SAYS, not merely how confident it looks, so
it cannot be inferred from a dimmed number.*

### THE PRECEDENCE NOW SPANS TWO FIELDS, AND THE DANGEROUS CELL IS THICK-AND-MISPLACED

**One mark slot; `NOT_FIRST` beats `THIN`; unchanged.** **What changes is that
the precedence happens in the SURFACE over two honest fields rather than being
baked into one that cannot be taken apart.**

**THE CASE WORTH NAMING: a THICK anchor that is NOT_FIRST is the most deceptive
row on the board.** *It looks well measured and is measuring the wrong minute —
thickness would otherwise reassure exactly where reassurance is wrong.* **Under
the precedence it shows the misplaced mark, which is correct; naming it here so
nobody later "optimises" by showing thickness when it is high.**

### AND THE PRIORITY SHIFT, WHICH IS NOT PART OF THE ARGUMENT

**If the engine started at or before the session began and ran continuously,
every bar was seen live and the anchor IS the first print — PROVABLY, with no
replay and no residual.** **So `PROVEN` is the ordinary case for most names on
most days, and `NOT_FIRST` becomes RARE.**

**⇒ THAT CHANGES HOW LOUD THE MARK SHOULD BE, AND IT IS THE SAME PRINCIPLE I
RECORDED FOR `UNKNOWN` YESTERDAY: the right render depends on the frequency, and
the frequency changes with the plumbing.** *Today `UNPROVEN` is everywhere and
renders as nothing, correctly. Once `PROVEN` is common, `NOT_FIRST` is a rare
mark and a rare mark can afford to be loud — the opposite of `thin`, which fires
on half the board and must stay quiet.*

## NOT A FIFTH STATE. IT IS THE OTHER AXIS.

**The residual separates two things that looked identical: an anchor that is late
because the name started late, and one that is late because we were not
watching.** *`minute_bars` records CAPTURE, not the market.* **The new fact is:
we have prints, but not the FIRST one.**

**ASKED: does a fourth state stretch, or is there a fifth? NEITHER.**

    OPEN         "a first print exists and `price` carries it"
                 -> FALSE here. Putting it in OPEN makes the state's own
                    definition a lie.
    UNKNOWN      "could not tell NOT_STARTED from NO_PRINT"
                 -> this case KNOWS the session traded. Widening it to mean
                    "some unknown thing" is the collapse, and Research was
                    right to refuse it.
    NO_PRINT / NOT_STARTED
                 -> plainly false. Prints exist.

**So nothing stretches honestly — and the conclusion is NOT a fifth state,
because it is not a state question.**

**THE STATE AXIS ANSWERS *IS THERE AN OPEN*. THIS ANSWERS *IS THE OPEN THE RIGHT
ONE*.** *That is the axis `AnchorThickness` already occupies: THICK/THIN/UNKNOWN
qualifies a price that exists.* **A misplaced anchor is a second way the same
price can be untrustworthy — wrong minute, rather than right minute weakly
measured.** *Integration's own line settles it: a fifth state is a surface
decision wearing a data-model costume, and this one is wearing the wrong costume.*

### THE RENDER: SHOW IT, MARKED — AND THE MARK MUST NAME WHAT IS WRONG

**Refusing it creates an absence, and I have ruled twice that an ambiguous
absence sends him to investigate the row he was trying to discard.** *Showing a
usable reading beats withholding it.*

**BUT A MARK THAT ONLY WARNS IS NOT ENOUGH HERE, AND THIS IS THE PART THAT IS
DIFFERENT FROM `thin`.** *`PM Move +2.3%` asserts "up 2.3% since the premarket
open". If the anchor is not the open, **the LABEL is false** — and that is the
ACVA defect exactly: a label naming a baseline it does not measure from.* **A
generic caution leaves the false label standing and merely disputes it. The mark
has to say the baseline is not the open**, on the face, not in a title — §10.

**ONE MARK SLOT, SO PRECEDENCE IS REQUIRED.** *Measured: `RTH Move +18.1% ·
thin` is 142.8px against 156, leaving 13.2 — a second word does not fit.*
**MISPLACED BEATS THIN: a wrong minute is worse than a right minute weakly
measured**, and a row carrying both is describing the wrong minute's trade count.

### AND IT REPAIRS NOTHING ALREADY ON THE BOARD

**540 of 668 Friday anchors stay permanently wrong; Gap is unaffected; no replay
fixes the past.** *Whatever the state set becomes, it changes what the board SAYS
about future rows and nothing about what it already said.* **Worth stating so the
fifth-state question is not mistaken for a repair.**

## THE THIN MARK RESTS ON AN ASSUMPTION NOTHING ENFORCES

**Research's finding, verified here rather than taken: `activity_config` is
WRITE-ONLY.** It appears in the row type (`repo.ts:385`), the INSERT list
(`:743`), the VALUES (`:771`) and the upsert COALESCE (`:896`) — **and
`activityConfig` has zero references anywhere in `lib/` or `worker/`.** *The
column that records which config produced a row is never read back.*

**WHAT THAT MEANS FOR MY MARK.** The thin/thick line comes from
`deadLineFor(DEFAULT_ACTIVITY_CONFIG)` **in the client**, while the row's
ACTIVE/DEAD verdict came from whatever config **the engine** was running.
**They agree today because there is one config in play — so the mark is correct
BY DEFAULT rather than BY CONSTRUCTION, and nothing can detect a divergence,
because the surface cannot see the stored config.**

**AND THE COLUMN'S EXISTENCE IS THE DESK'S OWN ADMISSION THAT THE CONFIG CAN
VARY** — there would be no reason to store a per-row config if it never could.

**THE SHARP VERSION, WHICH IS THE PART WORTH CARRYING: A WRITE-ONLY COLUMN IS
WORSE THAN A MISSING ONE.** *A missing column prompts the question "how would we
know?". A present one looks like the answer is already recorded.* **Anyone
auditing this schema would see `activity_config` and conclude the provenance is
captured. It is captured and never consulted.** *Same family as the nine dark
columns this morning, inverted: written and never read, rather than read and
never written — and this one is the harder direction to notice, because the
write side looks healthy.*

**NOT MINE TO FIX AND NOT A BLOCKER.** *The fix is to surface the config on
`DemandState` so the mark and the verdict derive from ONE value instead of two
that happen to match — Research's, and only if it ever matters.* **Recorded
because it is MY mark that inherits the assumption.**

## THE BOARD'S STALENESS IS SERVER-BAKED, SO IT FREEZES WITH THE FEED

**Scoping the mid-session downgrade he ruled me into, and the finding is bigger
than the thing I was scoping. THIS IS LIVE TODAY AND HAS NOTHING TO DO WITH
AUTH.**

**What happens now when a poll fails (`useMarket.ts:43-53`):**

    !response.ok  ->  throw  ->  setTransportError(message)
    THE SNAPSHOT IS NOT CLEARED -- the board keeps its last numbers. GOOD.
    DataFreshness: degraded = meta.stale || Boolean(transportError)   -- HEADER
    DashboardHeader: "Research API unreachable: ..."                  -- HEADER

**So the header degrades and the rows do not — and the rows are what he reads.**

**THE MECHANISM, AND IT IS THE DAY'S OWN PATTERN:** `telemetry.stale` is
`demand.freshness.stale` (`telemetry.ts:159`) — **computed by the ENGINE and
baked into the snapshot.** *When the poll stops, the snapshot stops, and the flag
inside it stops with it.* **A frozen board renders every actively-trading name in
full ink, exactly as it did when the data was live.**

**⇒ THE STALENESS INDICATOR IS CARRIED BY THE THING THAT GOES STALE.** *It cannot
report its own absence. That is `?? 0` on a missing minute, `NULL` meaning two
things, and a label deriving from a proxy — the same defect, now at the level of
the whole surface.*

**AND IT IS NOT AN AUTH PROBLEM. IT FIRES ON ANY FEED STOPPAGE:** a worker crash,
a network partition, **a deploy restart during his window.** *If the market
worker dies at 07:30 his board keeps showing the last prices, in live ink, and
only the header says otherwise.*

### WHAT THE OWED WORK ACTUALLY IS

    1. ROWS GO STALE ON THE CLIENT'S CLOCK, not on a flag inside a frozen
       payload. The input already exists -- `DataFreshness` computes
       `secondsSince(meta.fetchedAt, now)` against `useClock`. Nothing new is
       needed to know the board is old; it is simply not reaching the rows.
    2. AN AUTH REFUSAL IS NOT A TRANSPORT FAULT. Both become `transportError`
       today, so a revoked session reads "Research API unreachable", which is
       true and useless -- the way back is different and the copy must say so.
    3. NEVER BLANK. `DashboardShell:316` renders a full-screen "Dashboard
       unavailable" when `data` is absent. Mid-session `data` is already there,
       but that path needs checking rather than assuming.

**HIS RULING MADE (2) AND (3) OWED. (1) IS OWED ANYWAY AND WAS BEFORE ANY OF
THIS** — *I went looking for a future defect and found a present one, which is
the only good reason to scope before building.*

## MY "RULINGS CLOSE MEASUREMENTS" WAS WRONG. THE RULE IS INPUT VERSUS DERIVATION.

**I claimed a product ruling — *"no persistence of any kind"* — silently removed
the ability to measure a population defined by that state. Integration refused to
record it and was right: Ops produced the number this morning.** *`percent_change`
is stored per row per date, so a gap sort RECONSTRUCTS server-side. The ruling
closed nothing.*

**MY CLAIM GENERALISED FROM A CASE THAT DID NOT SUPPORT IT, AND I SHOULD HAVE
TESTED IT BEFORE ASKING FOR IT IN A CHARTER.** *One refuted instance is not a
pattern, and a pattern is a claim.*

### BUT THERE IS A SECOND INSTANCE, AND IT IS A DIFFERENT SHAPE

**PINS.** `useFocus` is in-memory: no API, no `localStorage`, no
`sessionStorage`. `focus_tickers` still exists in the schema and **has had no
writer since that shipped.** **So "which names did he pin" is not recorded — and
unlike the sort, it is NOT RECONSTRUCTIBLE, because nothing on any row implies
it.**

**⇒ THE DISTINCTION IS NOT PERSISTENCE. IT IS WHETHER THE THING IS AN INPUT OR A
DERIVATION.**

    SORT SELECTION   a DERIVATION of stored row data.
                     The UI state is gone; the ANSWER survives in the columns.
    PIN SELECTION    an INPUT. A free human choice with no stored antecedent.
                     Not persisted means gone, permanently and unrecoverably.

**A RULING CLOSES A MEASUREMENT WHEN THE THING RULED AWAY IS AN INPUT RATHER THAN
A DERIVATION.** *That is why the sort case refuted and the pin case would not.*

**AND IT IS PROSPECTIVE, WHICH IS WHY IT IS WORTH MORE THAN THE RETROSPECTIVE
VERSION.** Integration's operative fix — *when a measurement comes back empty,
ask whether the thing was ever recorded, and then whether it can be reconstructed
from what was* — is correct and is a **query-time** check. **This one fires at
RULING time: before agreeing that a piece of state need not persist, ask whether
anything stored implies it.** *If yes, the ruling is free. If no, the ruling is
also a decision to never know.*

**HIS PIN RULING IS STILL RIGHT** — pins are cosmetic and he said so — **and the
cost is now named rather than discovered.** *That is the whole value: not to
overturn a ruling, but to price it at the time it is made.*

## CORRECTION: THE ROW DOES NOT READ `UNKNOWN` TODAY, AND MY BRANCH HAS NEVER RUN

**I told Integration and him that the ACVA row *"today reads UNKNOWN, and UNKNOWN
renders as nothing — correctly."* The outcome is right and the mechanism is
wrong, and the difference matters the day the writer lands.**

**Verified at `repo.ts:624`:** *"ALL NINE NULL BECOMES undefined, NOT A SET OF
NULLS … an empty set renders as a session that has not traded, which is a
confident-looking claim about a thing nobody looked at."* **With every column
null, `sessionOpens` is `undefined`, `sessionMoveReading` returns null, and the
Move line is ABSENT ENTIRELY — it never reaches my `UNKNOWN` branch.**

**⇒ THE `UNKNOWN` BRANCH I COMMITTED AT `b7145fc` IS MUTATION-TESTED, CORRECT,
AND HAS NEVER EXECUTED IN PRODUCTION.** *It cannot until the market worker
restarts: the schema shipped and the writer did not, so `worker/runtime.ts`'s
open-writing lines have never run and **zero of 8,875 rows carry a session-open
price.*** **My own sentence — "the store's silence predates the question" — turns
out to describe the entire current state of the column rather than an edge case.**

**AND THE THREE-STATE RULE IS ALREADY THERE ONE LEVEL UP, WHICH I HAD NOT SEEN:**
*the set was never written* and *this session could not be classified* are
different facts, and Ops's guard keeps them apart. **I was applying the rule at
the field while the row already applied it at the set.**

### MY MEASUREMENT QUESTION WAS SELF-ANSWERING, AND THE REAL POPULATION IS UNOBSERVABLE

**I asked for the share of board-visible names in 07:00–10:00 with no premarket
print. Research ran it: 800 visible rows, 0 untraded — and it is worthless.**
**`volume = 0` occurs 0 times in 8,025 rows; the minimum is 400.** *Board
visibility REQUIRES volume — RVOL ranks a name in, and during premarket the
cumulative volume IS the premarket volume — so "visible AND untraded" is empty by
construction.* **I asked for a rate whose denominator excludes its own numerator.**

**AND THE REFINEMENT THAT IS MINE, BECAUSE IT IS MY SURFACE:** *Research reads
the ACVA case as cross-session — ranked by one session, silent in another. True,
and the mechanism is narrower.* **ACVA sat at RANK 70 with RVOL 0.0x. The board's
own ranking would never have shown it. He saw it because HE SORTED BY GAP** — and
`DiscoveryBoard.tsx:124-132` sorts **the whole tracked set and then takes the top
N**, deliberately, so a user sort decouples visibility from the ranking metric.

**⇒ THE POPULATION WHERE `NO_PRINT` FIRES IS DEFINED BY A CLIENT-SIDE SORT THAT,
BY HIS OWN RULING, DOES NOT PERSIST.** *"No need for persistence of any kind
really."* **So no stored query can identify those rows retrospectively — not
because the query was confounded, but because we deliberately chose not to record
the thing that defines the population.** *A design ruling made in one week closed
a measurement in the next, and neither of us noticed the connection until the
number came back empty.*

## A PUBLIC CLAIM NOW RESTS ON THIS SURFACE. VERIFIED — AND IT HOLDS BY TYPE.

**Commercial registered a plain statement of the product (`eb0eb7b`) whose last
sentence is a rendering promise: *"Where it has nothing, it says so."*** **It was
registered on Web's construction rather than on a measurement, and neither
Commercial nor Web reads this surface. So nobody had checked it.**

**CHECKED, ALL FOUR DIMENSIONS, AND EVERY PATH NAMES ITS EMPTY STATE:**

    why.ts:88          headline: 'Not researched yet.'
    risk.ts:105        label: 'NOT RESEARCHED'
    risk.ts tail       label: 'NO FLAG FOUND'   <- even the CLEAN case is named
    cycle.ts:47        NO_CYCLE: 'NO RUN'
    deskRead.ts:156    'CYCLE NOT ESTABLISHED'
    deskRead.ts:169    'NOT ANALYZED'
    DiscoveryBoard:629 label={high?.label ?? conclusions.cycle.label}

**AND THE STRONGEST PART: `DeskRisk.label` IS `string`, NOT `string | null`.**
*There is no path that returns a blank, because the type does not admit one.* **A
future "we could simplify that to a blank" would have to change the interface —
a visible change rather than a silent one.** **The claim holds BY TYPE, not by
convention.**

**I CHECKED THE CODE RATHER THAN THE LIVE BOARD, AND THAT IS THE BETTER CHECK
HERE, NOT THE LAZIER ONE.** *A live read proves the board was right this morning.
A total return type proves it cannot be otherwise.* **Same distinction as the
review page: a grep proves the body is clean today; the ordering proves it cannot
be otherwise.**

**ONE THING THE SENTENCE OVERSTATES SLIGHTLY, AND IT IS NOT THE PART THEY WORRIED
ABOUT.** *"Everything the desk knows … on a single shared board"* — **the FLOAT
COLUMN is conditional (`showFloat = sort.key === 'float'`), so one view of share
structure appears only under that sort.** **The claim survives because structure
and supply are ALSO carried on every row by the Risk cell** — `DIRTY FLOAT`,
`SUPPLY OVERHEAD`, `STRUCTURE UNKNOWN`, `NO FLAG FOUND`. *So the dimension is
always present; only an additional view of it is sort-scoped. Worth knowing
before someone reads the sentence as a promise about columns.*

**⇒ THE CONSTRAINT IS REAL AND I NOW HOLD IT KNOWINGLY: this surface may not
render a researched-nothing as a blank, and that stopped being a free choice the
afternoon the paragraph was registered.**

## SUPERSEDED SAME DAY: THE SIGN-IN SURFACE IS `Web`'S, NOT MINE

**I wrote the section below at `8cf125a` claiming the sign-in surface. A thread
called `Web` was created the same afternoon and it holds that surface — his
call.** `docs/threads/web.md`, `381f917` / `f21fdea`.

**SO THIS IS MY OWN DOCUMENT MAKING A CLAIM THAT STOPPED BEING TRUE, HOURS AFTER
I WROTE IT, WITH NOTHING FAILING.** *That is the shape I have spent the day
finding in other people's files and in my own comments. It is faster than I
expected: not a fortnight, an afternoon.* **Integration told me rather than
letting me act on it, which is the only reason it did not become a second thread
building the same screen.**

**WHAT MOVED:** the signed-out landing page, `/privacy`, `/terms`, **and the
sign-in screen — its provider buttons, its error and refusal copy.**

**WHAT DID NOT:** the board, Discovery, Researched Names, the Move family,
sparklines, `components/`, **and the signed-in affordance.** **THE BOUNDARY IS
AUTHENTICATION, NOT THE FILE TREE** — so "is this file mine" is the wrong
question and "is this before or after sign-in" is the right one.

**`ops.md`'s auth scope of 2026-09-07 still assigns this to me. It is stale and
it is not my file to edit — flagged to Integration rather than corrected here.**

### WHAT IS STILL MINE, AND IT IS THE SEAM

**What the surface HANDS the board once signed in.** *A signed-in affordance with
nothing behind it is the same defect as a sign-in screen wired to nothing, one
step later.* **That is a conversation with `Web` and not an assumption, which is
his ruling: "its fine as long as they are communcating and you are
collaborating."** The seam is not a wall.

### AND THE TWO CONSTRAINTS BELOW ARE HANDOVER MATERIAL, NOT DELETIONS

**They were reasoned for a surface I no longer hold and they are still true.**
*Deleting them would make this thread tidy and cost `Web` the reasoning — the
failure-screen one in particular is not obvious until you notice there is no
second path.* **Kept, marked as theirs.**

### THE ORIGINAL ENTRY, PRESERVED BECAUSE THE RULINGS IN IT ARE HIS

## THE SIGN-IN SURFACE: SCOPE, RECORDED BEFORE IT IS BUILT

**This scope has been carried in conversation and never written down, which is
the shape that loses things.** Writing it now, unblocked but unbuilt.

### WHAT HE HAS RULED

    providers    GOOGLE ALONE, FIRST.  Apple is PHASE TWO -- "1, phase 2."
    consent      Google OAuth consent screen -- "2, yes, oath consent."
                 whether VERIFICATION is required is open, with Commercial
    email link   "maybe" -- moved from "both from the start" by his own sentence,
                 and it is the half gated on DNS, SPF, DKIM and a hosted sender
    earlier      NO DEAD EMAIL BUTTON. check-your-email is a REAL SCREEN with a
                 REAL FAILURE STORY, not a dead end

**Google is the only provider needing none of the mail infrastructure, which is
why it is first — that is a sequencing fact, not a preference.**

### THE SPLIT, AND WHY A CODE READ NEVER FOUND A GUARD

**There is NO APPLICATION AUTH TODAY.** The desk sits behind **nginx Basic
Auth**, in front of everything. **Ops holds the carriage; I hold the surface**,
and that split is written in `ops.md`. *I had recorded the auth surface as "mine,
scoped, not started" without knowing why nothing in the codebase gated anything —
the answer is that the guard is not in the codebase.*

**⇒ I WILL NOT BUILD A SIGN-IN SCREEN AGAINST A CARRIAGE THAT DOES NOT EXIST.**
*The last time I built to an assumed shape it was a payload, and that one at
least failed loudly. A sign-in screen wired to nothing fails quietly and looks
finished.*

### THE DESIGN CONSTRAINTS I HOLD

**LEAVE ROOM; DO NOT BUILD THE ROOM.** He deferred Apple, he did not drop it. **A
single-provider screen that cannot grow a second button is the surface equivalent
of keying users on the Google id** — the migration Ops's own scope named. *Compose
it as a list of one, not as one thing centred.*

**AND A SINGLE-PROVIDER SCREEN HAS A FAILURE MODE THE MULTI-PROVIDER ONE DOES
NOT, WHICH IS MINE TO SOLVE:** if Google is down, or the account is refused,
**there is no second path.** *So the failure copy cannot be "try again" — with
one provider that is a wall, not a retry. It has to say what actually happened
and what he can do, and that screen is as real as the sign-in itself.* **This is
the check-your-email ruling generalising: a failure screen is a screen.**

**IT CARRIES THE IDENTITY.** `tmitrader.com` answers now, and **the sign-in
screen is the first thing anyone he shows this to will ever see** — the tagline
has its home here, and the browser bar and the screen change together.

### WHAT WOULD UNBLOCK BUILDING

**The carriage: what a signed-in session actually is, and what the surface is
handed.** *Until that exists, the honest deliverable is a picture he can rule on
rather than a component wired to nothing — and a picture is what worked on the
flat line, where he rejected the same reasoning in prose.*

## AN INVALID REVIEW TOKEN RETURNS 200, AND THE FIX IS A BUILD-LEVEL CHANGE

**Ops's finding, verified in the code rather than taken.** `app/review/[token]/
page.tsx:29` — `if (!check.ok) return <ReviewRefusal reason={check.reason} />;`
**A normal component return, so Next serves it 200.**

**ONE DETAIL BETTER THAN REPORTED: THE ABSENCE OF DESK DATA IS STRUCTURAL, NOT
INCIDENTAL.** `getDashboardState()` is called on the line AFTER the guard, so a
refused token **never reads the desk at all.** *Ops grepped the body and found no
tickers; the stronger statement is that there is nothing to find, because the
fetch does not happen. A grep proves the body is clean today; the ordering proves
it cannot be otherwise.*

**⇒ NOT A LEAK. POOR HYGIENE, AND THE COST IS INSTRUMENTABILITY:** anything
reading status codes — a monitor, a crawler, a link checker, a future client —
**cannot tell a refused capability from a served page.** *The desk's own rule
arriving in HTTP: a tool that reports "not found" the same way it reports "none"
is not an instrument, and here the instrument is the status line.*

### THE FIX, SPECIFIED SO NOBODY RE-DERIVES IT — AND IT IS NOT A ONE-LINER

**Read from `node_modules/next/dist/docs/`, because this fork's APIs differ from
training data and the repo says so:**

    unauthorized()   renders a 401 page, injects <meta robots noindex>
                     throws NEXT_HTTP_ERROR_FALLBACK;401 -- must be called IN
                     the render path, never inside an un-awaited promise
    forbidden()      the 403 sibling
    REQUIRES         experimental.authInterrupts: true in next.config.ts
                     -- NOT currently enabled here (grepped)
    UI               app/review/[token]/unauthorized.tsx, so `ReviewRefusal`
                     renders unchanged and the copy he has seen does not move

**⇒ THREE PARTS: A CONFIG FLAG, A THROW, AND A FILE-CONVENTION COMPONENT.**

**AND THE STATUS ITSELF IS A DECISION, NOT A DETAIL.** A review token **is** the
credential, so an invalid or expired one is a bad credential — **401**, and
`check.reason` already separates expired from revoked from malformed. *404 would
be defensible on the grounds of not confirming a token ever existed, but it
defeats the instrumentability this fix is for: a monitor cannot distinguish a
refused capability from a dead link.*

**WHY IT SHOULD NOT RIDE A COSMETIC ENUMERATION: it turns on an EXPERIMENTAL
flag in `next.config.ts` on a live trading desk.** *That is a build-level change
and deserves its own decision and its own window, not a seat on a tip priced for
a colour fix.* **Recorded, not built, and not tonight — Integration's call and I
agree with it.**

## THE MOVE SURFACE: THE 0.1px ITEM IS MOOT, AND THE THIN-PRINT FLAG IS THE REAL CONSTRAINT

**The within-session figure labels itself INLINE, the way `PM VWAP` already
does — so the header measurement never applies to it.** Measured against the
live VWAP line's own class, 156px available:

    RTH Move +123.4%              103.8px   FITS  (52.2 spare)
    PM Move  +123.4%               97.4px   FITS  (58.6 spare)
    RTH Move +18.1%                97.4px   FITS  (58.6 spare)

**⇒ `RTH Move` AT 156.1px WAS A HEADER NUMBER AND THE LABEL IS NOT GOING IN THE
HEADER. Inline it has 52px of room. THE ITEM IS CLOSED — no header change is
needed for this family.** *Recording the closure as loudly as the risk, because
a carried item that quietly stops mattering is how a false constraint survives.*

### THE REAL CONSTRAINT IS THE HONESTY FLAG, AND IT DOES NOT FIT AS A COUNT

`tradeCount` is nullable **independently** of `price`, deliberately — *a
premarket open anchored on 3 trades must not look like one anchored on 400, and
a zero default would erase exactly that.* **So the surface owes three states, not
two.** Measured:

    RTH Move +18.1% · 3 prints    168.8px   OVER by 12.8
    RTH Move +18.1% · ? prints    168.8px   OVER by 12.8
    RTH Move +18.1% · thin        142.8px   FITS  (13.2 spare)

**⇒ THE COUNT CANNOT GO ON THAT LINE. A COMPACT MARKER CAN.** *The number belongs
in the title where a reader who wants it gets it; the line carries whether the
anchor is trustworthy.*

**AND THE THREE STATES MUST BE VISUALLY DISTINCT, WHICH IS THE `activityWindow`
RULE ARRIVING IN A NEW COLUMN:**

    tradeCount = 400    anchor is solid          no marker
    tradeCount = 3      anchor is THIN           marker, and it must be loud
    tradeCount = null   WE DO NOT KNOW           its OWN state, never silence

**`null` RENDERING AS ABSENCE-AND-SILENCE IS THE DEFECT, because silence is what
a SOLID anchor also looks like.** *That is `NULL means NOT MEASURED, never `[]``
one column over — and it is the guard I owe with this family, so it ships in the
same commit rather than after.*

**NOT BUILT: the store columns are undeployed and `move` is derived at read time
rather than stored, so there is no payload to build against yet.** *What is
settled is the shape and the constraint; what is not is anything that needs a
field to exist.*

## THE MUTANT THAT DIES TOO QUIETLY, AND THE REVERT LADDER

### THE TELL — MINE, AND THE MOST TRANSFERABLE THING I FOUND TODAY

**A guard can be vacuous three ways, and fixing one does not fix the others.**

    identity          `not.toBe('Move')`            passed `AH move`
    containment       `not.toContain('Move')`       ALSO passed `AH move` -- case
    no subject        a guard over labels nothing produces yet

**Each fix looked complete. Only mutation distinguished them — and the tell was
the same every time: THE MUTANT FAILED FEWER TESTS THAN IT SHOULD HAVE.**

**A surviving mutant is loud and everyone looks. A mutant that dies against
FEWER tests than expected is quiet, and it is the one that caught me three times
in one function.** *The discipline is one line: **predict how many tests a mutant
should kill, then investigate the shortfall.*** When reverting the AH arm failed
the word test but NOT the reserved-word guard, **the guard had already told me it
was blind and I nearly did not hear it.**

*This desk already has "a check that cannot fail", "prove a check can see a
present case", and "a mutation that passes means the mutant was wrong" — all of
them ask you to reason about the check. **This one is a SIGNAL read off a run**,
which is why it works when reasoning has already failed twice.*

### THE REVERT LADDER — INTEGRATION'S, AND BETTER THAN MY REASON FOR ASKING

**I offered to squash `002f4b5` and `97e893d` on tidiness grounds. That was the
wrong question.** **The right one is what a revert LANDS ON:**

    97e893d   Gap family                          <- tip
    002f4b5   Day + reserved-word guard           <- a real rung: worse than the tip,
                                                     BETTER than the floor
    production                                    <- Move / AH move, carries the inversion

**Squashed, a problem with the Gap family reverts straight past the guard and
back into the inversion. Separate, it reverts to a coherent intermediate.** **Two
rungs beat one and the middle costs nothing** — Ops enumerates BY THREAD, so four
of mine is one line either way.

**AND THE OBJECTION TO KEEPING THEM IS DISPOSED OF BY THE SEQUENCING ITSELF:
`Day` NEVER REACHES PRODUCTION.** The log shows a word landing and being
superseded **before either shipped** — *nobody inherits a fortnight of `Day`, and
a reader sees two deliberate steps in one morning rather than a flip.*

## `AH move` CONTAINS `Move`, AND MY GUARD TESTED IDENTITY WHERE THE RESERVATION NEEDED CONTAINMENT

**After-hours does NOT collapse to one figure** — he ruled the session open is
**the first print of that session**, so the AH open is a different print from the
16:00 close and the two figures are distinct. **Same decomposition as premarket:
gapped in, then moved.** *The collapse was an artefact of an earlier definition,
not a property of the session.*

**⇒ SO AFTER THE BELL THE ROW CARRIES BOTH `AH move` AND `Move`, ADJACENT.**

### MY GUARD DOES NOT CATCH IT, AND THE REASON IS THE DAY'S OWN PATTERN

    tests/dashboard/discoverySort.test.ts:229
    expect(baselineLabel(phase).label).not.toBe('Move')      <- IDENTITY

**`AH move` passes.** Integration deduced that from the outside without reading
it, and they are right. **I reserved a WORD and tested a TOKEN.** *If `Move` is
reserved as a MEANING, a label containing it inherits that meaning at scan speed
— so the guard should be `not.toContain('Move')`, which would have caught this
collision the moment it was proposed.* **The test matched the string; the defect
is in the reading. Fifth time today that distinction has decided something.**

### AND THE COLLISION IS NOT "CONFUSABLE". IT IS A PRECISE INVERSION.

**`AH ` is a prefix that invites `AH X = the after-hours version of X`. That
inference is WELL-FORMED and lands on the WRONG base word.** `AH move` is the
after-hours version of **`Gap`/`Day`** — the across-sessions family — **not of
`Move`, which is its opposite.** *A label that invites a correct-shaped inference
onto the wrong referent is worse than one that is merely unfamiliar, because the
reader has no reason to doubt it.*

**⇒ `AH gap` MAKES THE INFERENCE TRUE.**

    ACROSS sessions, from the last relevant close    Gap · Day · AH gap
    WITHIN this session, from its own first print    Move

**Then `AH gap` genuinely IS "the after-hours version of `Gap`" — the same
quantity, one session over — and the prefix points at the right base word.**

**WIDTH IS NOT A CONSTRAINT: `AH gap` is one character SHORTER than `AH move`,
which renders today.** *This one is free, which is rare on this row.*

**THE HONEST COUNTER, NAMED RATHER THAN HIDDEN:** *"gap" conventionally means the
overnight jump seen at an open, and after-hours is a continuous tape from 16:00.*
**But the desk's own premarket `Gap` is titled *"including after hours"*** — so
`Gap` here already means *"the move from the last relevant close, before this
session's own trading"*, **not the strict overnight jump. Under the meaning this
desk already uses, `AH gap` is exact.**

**AND IT IS THE ONE WORD OF THE THREE HE NEVER CHOSE.** It rode in on the
sentence he approved and survived the `Move`→`Day` amendment untouched. **Asking
costs nothing.**

**ONE SEQUENCING POINT: THE GUARD CHANGE AND THE RENAME ARE ONE CHANGE, NOT
TWO.** Strengthening the guard to `toContain` **fails on `AH move`, which is
currently approved and shipping tonight.** *So the guard cannot be hardened
first, and hardening it later without the rename would break a green suite on a
word he had approved.* **Both or neither, and neither until he rules.**

## THE RANK COLUMN IS THE ONLY VISIBLE EVIDENCE OF A REAL ORDERING DEFECT

> **"i actually never sort by rank. its not been clear what it was and it just
> looks like rvol … i actually think could remove rank altogether."**

**My strongest keep-argument turned on a behaviour only he could report, and he
reports the opposite. The column goes.** *That argument was correctly formed and
correctly lost — the right way for one to die.*

### CHECK 1 — THE ENUMERATION, AND IT POINTS THE OPPOSITE WAY FROM EXPECTED

**Three readers, and the third is a defect:**

    DiscoveryBoard.tsx:491   const rank = (afterHours ? ah?.rank : t.rvolRank)   <- CELL, AH-AWARE
    view.ts:316              case 'rank': return row.telemetry.rvolRank          <- SORT, NOT AH-AWARE
    view.ts:364              tie-break on a.telemetry.rvolRank                    <- also not

**THE CELL KNOWS ABOUT THE AFTER-HOURS BOARD. THE SORT DOES NOT.** And
`sortDiscoveryRows(rows, sort)` runs unconditionally with
`DISCOVERY_DEFAULT_SORT = { key: 'rank' }`.

**⇒ AFTER THE BELL, THE SERVER ORDERS BY `afterHours.rank` AND THE CLIENT
RE-SORTS BY `rvolRank`.** The board titled **After-Hours Discovery / AH
Participation** is displayed in **Daily RVOL order**, while the Rank column
prints **AH ranks** — so that column reads out of sequence.

**AND THAT EXPLAINS BOTH HALVES OF HIS SENTENCE FROM THE CODE:**
*"it just looks like rvol"* — on Discovery, rank order **is** rvol order,
confirmed. *"it's not been clear what it was"* — after the bell the same column
shows numbers that do not match the order they are printed in.

**⇒ THE COLUMN HE WANTS REMOVED IS CURRENTLY THE ONLY VISIBLE EVIDENCE OF THAT
ORDERING DEFECT. REMOVE IT AND THE DEFECT BECOMES INVISIBLE, NOT FIXED.** *This
is the "carrier reaches further than the store" shape, pointing the unexpected
way: the thing being deleted is the alarm, not the cause.* **The sort must be
made board-aware WITH the removal or the after-hours board silently ships in the
wrong order.**

### CHECK 2 — THE DEFAULT SORT

`DISCOVERY_DEFAULT_SORT = { key: 'rank', direction: 'asc' }`. **Delete the column
and the board is still ordered by a key with nothing on screen explaining it** —
and on the AH board, ordered wrongly. **`rank` is also the escape hatch back to
the session's own ordering, which is deliberate and documented; that role does
not disappear with the column.** *Whether the default becomes `rvol` — identical
order on Discovery, the concept he says he understands — or whether* **"leave
sorting to the user"** *means no imposed default at all, is his and should be
asked, not inferred from five words.*

### AND INTEGRATION'S FLAG, CHECKED RATHER THAN TAKEN

**The rank column is NOT the only visible sign of the research threshold.**
`risk.ts:105` renders `NOT RESEARCHED` on the row itself, and a researched name
shows content in `Why` and `Risk`. **The effect is visible without the cause.**
*Their guess was right and it cost one grep to stop it being a guess.*

### THE FINDING UNDER THE RULING, WHICH IS WORTH MORE THAN 44px

**A column sat on the board he looks at first, for weeks, and he did not know
what it was showing.** Not a preference — **a surface that failed to explain
itself and was never asked about.** *Today has been spent measuring pixels for
numbers he could not read; this is a whole column, and the only reason it
surfaced is that he volunteered it.*

**BOUNDARY: he ruled on the COLUMN. `rvol_rank` the MECHANISM stays** — it
selects who is on the board (`WHERE rvol_rank IS NOT NULL`), it gates research at
`rank <= 12` which is **model spend**, and it is keyed into
`desk_assessment_tickers`, `dead_at_rank` and `RVOL_RANK_ENTRY`. **A display
removal that reached any of those would change what gets spent, on a sentence
about sorting.**

## RANK AND RVOL: HE IS RIGHT, AND THE 44px DOES NOT GO WHERE IT IS WANTED

**HIS OBSERVATION IS CORRECT AND I CONFIRMED IT IN THE CODE.** `rankByRvol`
(`rvol.ts:134`) sorts by `rvol` DESC with a symbol tie-break, so **on the
Discovery board, sorting by Rank and sorting by RVOL produce the same order.**

### THE WIDTH PREMISE IS WRONG, AND IT IS THE THING THAT MAKES REMOVAL TEMPTING

**`<table className="w-full table-fixed …">` (`:301`).** Under `table-fixed`,
columns with explicit widths take them and **the remainder goes to the columns
WITHOUT one — which are `Why` and `Risk`, the two I measured expanding 187 → 635
between 1024 and 1920.**

**⇒ DELETING THE 44px RANK COLUMN GIVES 44px TO `Why` AND `Risk`. IT GIVES THE
PRICE CELL NOTHING.** That cell is `w-[172px]` and stays 172px.

**AND THE PRICE COLUMN CAN BE WIDENED WITHOUT TOUCHING RANK — the two decisions
are unconnected.** So *"44px, which is more than the 34.4px of slack"* compares
two numbers that do not meet. **The 44px is real and worth having; it is just not
payment for the thing that needed paying.**

### THREE REASONS THE COLUMN IS NOT REDUNDANT, ONE OF WHICH IS MINE

**1. A DIFFERENT BOARD USES A DIFFERENT RANKING.** `engine.ts:1496` calls
`rankByAfterHours` on AH participation. **On that board rank has no relationship
to the RVOL beside it**, so removing the column on Discovery's evidence takes a
live signal off the other board.

**2. SAME ORDER IS NOT SAME INFORMATION.** Rank is **ordinal**, RVOL is
**magnitude**. *Rank 1 vs rank 2 does not say 63.9 vs 1.47*, and that gap is what
this morning's row turned on.

**3. AND THE ONE FROM MY OWN CODE: UNDER A NON-RANK SORT, RANK IS NOT INFERABLE
FROM POSITION AT ALL.** `DiscoveryBoard.tsx:124-132` sorts **the whole tracked
set and then takes the top N** — deliberately, so that sorting by Gap does not
merely reshuffle whoever RVOL admitted. **So a Gap-sorted board's visible twelve
are NOT the top twelve by rank, and the rank column is the only thing separating
rank 3 from rank 47 in that list.** *On a rank-sorted board the column restates
the row's own position; under any other sort it carries information nothing else
on the row does.*

**⇒ SO THE QUESTION IS NOT WHETHER THEY ARE REDUNDANT. IT IS HOW OFTEN HE SORTS
BY SOMETHING OTHER THAN RANK — and only he knows.** Integration is right to put
that to him rather than guess it.

**ONE FLAG SO NOBODY PRICES THE COLUMN WRONG IN EITHER DIRECTION:** the Rank cell
also renders a **change arrow** (`:511-516`, red/green). **`rvol_rank_change` is
0 on all 45,249 production rows and `ah_rank_change` on all 36,113** — Ops's
sweep. **That arrow has never rendered.** It is not value being preserved by
keeping the column, and it is not a reason to remove it either; **it is a dead
field on a live column, and it belongs in neither side of the argument.**

## RULED: `"color"` — AND THE BOUNDARY MATTERS MORE THAN THE RULING

**He was asked which lands first, colour or the number. `"color"`.** So the one
claim I had labelled as **mine and unmeasured** is now established by the only
source that could establish it.

**⇒ TWO ADJACENT SIGNED PERCENTAGES SHARING `text-pos` / `text-neg` ASSERT A
CONTRADICTION THE LABEL CANNOT RETRACT**, because the label is read second and
only if the colour has not already answered. **More labelling does not fix it.
The two must not share an encoding.** Ordering stands with it: **what carried in
on line 1, the two within-session companions beneath.**

**I HAD ALREADY RULED THIS ONCE, UNPROMPTED, AND THE ENTRY IS AT `:3729`:**

> *"Tone follows the label when it overrides, or NEW HIGH would render in the
> `neg` colour of a stale BACKSIDE verdict — the label-and-number mismatch again,
> one layer up."*

**That put colour above the word before anyone had established he reads it that
way. He has now established it** — so the earlier ruling was right for a reason
it did not have, which is the same shape as the `−2m` derivation being right for
a reason I did not have. **Twice now. Worth noticing that the reasons arrive
after the rulings, not before.**

### THE BOUNDARY, AND IT IS THE PART THAT WILL BE MISQUOTED

**"Labels are not the fix" IS FALSE AS A GENERAL STATEMENT AND WOULD UNDO THREE
CORRECT DECISIONS MADE TODAY:**

    Price · Gap · VWAP        a header naming a denominator
    RVOL · <denominator>      the same, and the reason his `x` ruling survives
    the supply pair           where I REFUSED a provenance label

**None of those competes with a colour.** **A header naming a denominator has no
signed tone arguing with it.** *The insufficiency is specific and narrow:*

> **WHERE TWO ELEMENTS SHARE A SIGNED COLOUR AND CAN LEGITIMATELY DISAGREE, THE
> COLOUR IS THE MESSAGE AND THE LABEL IS A FOOTNOTE.**

**Everywhere else on this surface, the label is still the answer — and three of
today's decisions depend on that.** *A ruling quoted without its boundary is the
failure this desk has spent the day trimming, and this one is unusually easy to
over-apply because it sounds like a principle.*

## THE DISAGREEMENT IS THE INTELLIGENCE. THE HAZARD IS THE ENCODING, NOT THE NUMBERS.

**I raised the sign flip as decisive, then the width answer arrived and I went
quiet on it. That is a solved constraint standing in for an unsolved one, and it
took Integration to notice.** A third line fixes the cramming and **does not
touch** the objection: both readings are still on the row, still about the same
window, still able to disagree.

**AND THEIR COUNTER-READING IS BETTER THAN MY OBJECTION, SO I AM WITHDRAWING IT.**

> *"Up 14% this session and 4.8% below where the volume actually traded"* is a
> name that **ran and is fading off its own volume.** Neither number says that
> alone.

**They are not two accounts of one quantity. One measures displacement from a
MOMENT (the session open); the other from a DISTRIBUTION (the volume-weighted
average of the whole session).** *Same shape as the supply pair I refused a
provenance label for: naming the denominator makes them visibly
non-substitutable rather than merely different.* **So the disagreement is signal,
and my "third instance of the 04:00 failure" framing was wrong.**

### WHAT SURVIVES THE WITHDRAWAL, AND IT IS NARROWER AND SHARPER

**The hazard is not that the numbers disagree. It is that they are ENCODED
IDENTICALLY, so a reader meets them expecting agreement before reading a word.**
Observed in the code, both:

    line 1 move        `num text-[13px] font-semibold ${changeTone}`   -> text-pos / text-neg
    line 2 vwap dist   <span className={above ? 'text-pos' : 'text-neg'}>

**TWO SIGNED PERCENTAGES, BOTH RED/GREEN, ADJACENT, ABOUT THE SAME WINDOW.
COLOUR IS READ BEFORE TEXT** — at scan speed a green `+14%` above a red `−4.8%`
reads as a contradiction **no matter what the labels say**, because the labels
are read second and only if the colour did not already answer.

**⇒ SO THE FIX IS NOT MORE LABELLING. IT IS THAT THE TWO MUST NOT SHARE AN
ENCODING.** One of them is subordinate, or differently encoded, or the pair is
rendered as one object the way `OFF HIGH $1.20 → $1.00` is. **Labels cure a
reader who is reading; encoding cures one who is scanning, and he is scanning.**

### AND THE ORDERING IS PART OF THE ANSWER

Three lines, three baselines — **group them by baseline FAMILY rather than
interleaving:**

    line 1   price + gap from the relevant last     ACROSS sessions
    line 2   current-session gap                    WITHIN this session
    line 3   session VWAP distance                  WITHIN this session

**Separate lines imply independence. The two within-session readings are
companions and should sit together**, so the row reads *"this is what carried in;
these two are what has happened since."* **Putting the new figure between price
and VWAP would split the family and is the arrangement to avoid.**

**JUDGEMENT, NOT MEASUREMENT, AND LABELLED AS SUCH:** the encoding claim rests on
colour being read before text, which I have not tested on him. **The two tone
assignments are observed in the code; the scanning claim is mine.**

## TWO MEASUREMENTS: THE RVOL HEADER TAKES IT, AND MY "30% OF ROW HEIGHT" WAS WRONG

### 1. THE `x` RULING DOES NOT NEED REOPENING. THE HEADER HAS ROOM.

**Measured in the REAL font — a probe carrying the live `−1m` span's own class,
`400 9px Geist`, letter-spacing normal.** RVOL header is **68px, 16px padding,
52px inner:**

    day 14.8 · / day 21.4 · vs day 26.4 · per day 30.7
    avg day 31.8 · of a day 32.8 · vs avg day 43.3      ALL FIT
                                    longest has 8.7px spare

**⇒ HE KEEPS `0.6x` AND THE HEADER SAYS WHAT THE `x` IS OF.** Not a compromise
between his ruling and my finding — **it satisfies both**, because he ruled on
the LABEL and was never asked about the DENOMINATOR. **Third instance of one
pattern, which is what makes it a rule rather than a trick:**

    Now  −1m                derived · header · cell untouched
    Price · Gap · VWAP      derived · header · cell untouched
    RVOL · <denominator>    same shape, and it fits

### 2. CORRECTION — I TOLD INTEGRATION A THIRD LINE COSTS ~30% OF ROW HEIGHT. IT DOES NOT.

**I derived that from a single 46px row-height reading without checking what the
price cell actually uses or whether rows were already ragged. Both were wrong to
skip.** Measured:

    row height        43px on some rows, 51px on others  -- ALREADY VARIABLE
    price cell content            34px on every row
    vertical slack     9px (short rows) · 17-18px (tall rows)
    tallest cell       index 7 = RISK at 42px on the tall rows

**Two lines occupy 34px, so a third costs about +17px.** ⇒ **On the 51px rows it
fits INSIDE existing slack, free. On the 43px rows it grows the row ~8px.** The
board converges toward uniform 51px rather than growing by a third.

**AND THE RULE IT WOULD BREAK IS ALREADY BROKEN.** `DecisionCells.tsx` says a
wrapped VWAP line *"made the whole row taller for every ticker … which is not a
property of the stock."* **The rows are ALREADY ragged at 43 vs 51, and the cell
driving it is RISK** — research text length, which is not a property of the stock
either. **The principle stands; the claim that this cell would be the first to
violate it does not.**

### SO THE BOARD IS POSSIBLE, AND HIS CONSTRAINT SHOULD BE TAKEN AT FACE VALUE

**He said the board, not the card, after the last two of these went to the
drawer.** *Two drawer answers in a row is evidence about where he actually looks,
and he is the only one who knows whether he would open a drawer mid-morning.* **I
am treating it as a constraint on the design rather than a preference to argue
with** — and the measurement says it does not need arguing with.

**WHAT IS STILL TRUE AND UNCHANGED:** the pair on **line 1** breaks the
widest-price/biggest-mover rows (`OVER by 3.6px` even at 10px with no decimal),
and **line 2 already truncates at 158.4px against 156.** **A third line is the
only version that fits, and now it has a measured price rather than my estimate.**

## SHOW BOTH: IT FITS THE ORDINARY ROWS AND BREAKS THE ONES HE IS LOOKING FOR

> **"intelligence: let's show both. current session gap and gap from the relevant
> last."**

**MEASURED, REAL FONT, HIS 1,024px FLOOR. Line 1 has 156px.**

    E  typical   4.12  +0.0%  +18.1%                    134.4px   FITS, 21.6 spare
    A  worst, both at 13px                              184.2px   OVER by 28.2
    B  worst, prior dimmed to 11px                      175.8px   OVER by 19.8
    C  worst, prior dimmed to 10px                      171.6px   OVER by 15.6
    D  worst, 10px AND no decimal (+123%)               159.6px   OVER by 3.6

**EVERY WORST CASE IS OVER — INCLUDING THE ONE ALREADY SHRUNK TO 10px AND
STRIPPED OF A DECIMAL.** *"Worst case"* here is a 4-digit price with a 3-digit
move: `15.4297` and `+123.4%`.

**⇒ THAT IS A NAME WITH A HIGH PRICE HAVING A HUGE DAY. THE ROW THAT BREAKS IS
THE ROW HE IS SCANNING FOR.** Same shape as the two-tier column: *the failure is
correlated with the thing being looked for*, so it will look fine every day it
does not matter.

**AND LINE 2 HAS NEGATIVE SLACK ALREADY.** Widest live text today
`PM VWAP −$0.433 / -16.5%` = **158.4px against 156px — it truncates now**, before
anything is added.

**A THIRD LINE COSTS ~30% OF ROW HEIGHT** (46px today for two lines, ×12 rows)
**and `DecisionCells.tsx` already carries the rule against it**: *"A wrapped VWAP
line made the whole row taller for every ticker whose distance happened to be
wide, which is not a property of the stock."*

### THE DECOMPOSITION READING IS RIGHT, AND IT IS WHY TWO TOTALS ARE THE WRONG OBJECT

**The two figures are not independent. `A` (from the prior close) and `B` (from
this session's open) differ by exactly what carried in overnight.** CULP: **A =
+18.1%, B ≈ 0** — *"this ran overnight and has done nothing since."* **Neither
number says that alone; the PAIR does.**

**So the object is one thing with two parts. Two totals side by side make the
reader compute the relationship that IS the answer** — and at 34px of spare width
there is no room to label which is which.

### THE TRADE NOBODY HAS NAMED, AND IT IS THE ONE THAT DECIDES THIS

**The row ALREADY carries a within-session reading: the VWAP distance.** Add a
session gap and the row holds **two within-session percentages that can disagree
in sign** — a name that opens 3.50, runs to 4.50 and settles at 4.00 is
**+14% on the session gap and NEGATIVE against its session VWAP.** Both correct,
both within-session, opposite signs, adjacent on one row.

**That is the 04:00 failure with a third instance and a sign flip.** Two unnamed
denominators stopped him dead; three, with two of them describing the same
window differently, is worse and not by a little.

**⇒ SOMETHING LEAVES THE ROW, OR THE PAIR IS NOT ON THE ROW.** Those are the
only two honest options at this width. **The candidates for leaving are the VWAP
line (overlapping question) or the pair itself (to the drawer, where the last two
of these landed).** **His ruling stands either way — "show both" does not say
"on that row", and I am not treating it as if it did.**

**NOT DESIGNED, NOT BUILT. The header shipped today is unaffected and correct
under either outcome.**

## APPROVED: `"yes to the header change."` — AND THE LABEL IS COUPLED TO A PROXY, NOT ITS REFERENT

**Shipped as `1e9f7d2`, gated 127 files / 1900 tests, awaiting the after-close
deploy. Boundary: he approved THE HEADER FOLLOWING THE SESSION.** Not the number,
not the unit, not the cell, not the second line. **`x` stays and that ruling is
untouched by this one.**

**AND THE OPEN DISCUSSION EXPOSES A WEAKNESS IN WHAT I JUST SHIPPED, WHICH I
WOULD RATHER NAME NOW THAN DISCOVER LATER.**

His proposition: measure each session's move **from that session's own start** —
RTH from the 09:30 open, *"skipping after hours"*. **CULP is the worked example:
this morning's `+18.1%` was largely an AFTER-HOURS move from yesterday, rendered
as a premarket gap.** The sort control's own title admits the baseline — *"change
from the prior session close, **including after hours**"*.

**`moveLabel` DERIVES THE WORD FROM THE SESSION PHASE. THE WORD DESCRIBES THE
BASELINE. THOSE TWO COINCIDE TODAY AND HIS PROPOSAL SEPARATES THEM.**

    sparklineLagLabel(config)  -> reads settleMinutes, WHICH IS THE THING IT NAMES
    moveLabel(phase)           -> reads the phase, and names THE BASELINE

**The first is coupled to its referent and survived a config change untouched —
production went `−2m` → `−1m` on its own.** **The second is coupled to a PROXY.**
If the RTH baseline moved to the 09:30 open, `Move` would still render — **and
"Move from the prior close" would be silently false, on a header, at speed.**
**A derived label is only safe when it derives from the thing it describes.**

**⇒ IF THE REFERENCE MOVES, `moveLabel` MUST TAKE THE BASELINE, NOT THE PHASE.**
Not a change to make now — nothing is decided and it is not mine to decide. **But
the header I shipped today is correct under either scheme only because the two
still coincide, and that is luck rather than design.** Recording it so the next
person to touch the reference knows the label does not follow it.

**THE EFFECT IS MEASURED, NOT MARGINAL — OPS FROM THE TAPE, INDEPENDENTLY:**

    CULP  regular session   51,093 shares    range 3.41-3.57
          after hours    1,102,028 shares    range 3.49-4.18
          -> the after-hours session carried 21.6x the regular session's volume,
             and the whole move happened after the bell.

**So the `+18.1%` on his PREMARKET board was an AFTER-HOURS move, by volume
almost entirely.** *"Roughly flat this morning"* was the true premarket reading.
**My label ships honest about that — `Gap`, titled "including after hours" — and
honest is the MINIMUM here, not the fix.** A header that correctly names a
baseline is still a header whose number is dominated by a session the board is
not showing. **That is the same family as the two-tier column: provenance
differing from the column it sits in.** Not mine to decide, and worth having the
magnitude on record so nobody prices this as an edge case: **21.6x.**

**AND HIS OWN PRINCIPLE ALREADY SPLITS THE THREE SESSIONS:** `AH move` measures
from today's RTH close — **his rule, already obeyed.** Premarket reaches back
past after-hours to yesterday's 16:00 — **his rule, violated.** RTH-from-open —
**does not exist.** *One of three follows it, one contradicts it, one is missing.*

## THREE COLUMNS DO NOT FIT, AND NEITHER SHOULD THE DROPDOWN. MEASURED AT HIS FLOOR.

> **"so it would be three separate windows in the UI, or is it a single window
> changed with the dropdown?"**

**MEASURED ON THE LIVE BOARD AT 04:08 ET, NOT ESTIMATED — I got a character count
wrong on this table once and will not reason from declared widths again.**

    at 1024px (his floor)          at 1920px
    Changed  24                    24
    Rank     44                    44
    Ticker  112                   112
    Price·Move·VWAP 172           172
    RVOL     68                    68
    Now−1m   36                    36
    Why     187                   635      <- flexible
    Risk    187                   635      <- flexible
    Cycle   152                   152
    table   982 / container 1014, no horizontal scroll

**`Why` AND `Risk` ARE THE ONLY FLEXIBLE COLUMNS — they absorb every pixel of
slack.** So two more RVOL-width columns do not come out of whitespace. **They
cost 136px taken directly from Why and Risk: 187 → 119 each, a 36% cut**, at the
width he actually works at. **Those two carry the research verdict — the thing
the whole desk exists to produce — and they already truncate at 187.**

**⇒ THREE COLUMNS IS NOT A LAYOUT PREFERENCE. IT IS PAYING FOR VOLUME FIGURES
WITH THE CATALYST AND THE RISK.**

**AND THE DROPDOWN SHOULD NOT EXIST EITHER, ON RULES ALREADY MADE:**

- **Persistence is ruled out for board state** — *"no need for persistence of any
  kind really"* — so **a selection does not survive a reload and he re-picks it
  every time.**
- **His holds are seconds.** A control that hides two-thirds of the data behind
  an interaction **costs a scan he does not have.**

**⇒ NEITHER. THE ANSWER IS ONE COLUMN THAT FOLLOWS THE CLOCK** — which is what
the Move sort button already does one column over, and what `Now−1m` now does for
its own window. **He asked for "rvol and gap/gains tracked by session"; the
session he trades is the one happening. He never asked to look at a session that
is not the current one.**

**THE REAL WANT A DROPDOWN WOULD SERVE, NAMED HONESTLY:** *"how big was the
premarket?"* at 10:00. **That is a genuine question and it is HISTORY, not
now.** It belongs where the scope is one name — **the dossier drawer** — for the
same reason the live trade counter did: *"this name, this session" is a complete
statement; "some of these columns, some of these sessions" is not.*

### AND THE HEADER MOVED ON ITS OWN, WHICH IS THE DERIVATION PAYING OFF

**Production reads `Now−1m`, not `−2m`.** The tooltip agrees: *"5 minutes ending
**1 min ago**"*. **`settleMinutes` is 0 in production** — the tail decision was
taken, and `sparklineLagLabel()` = `−(settleMinutes + 1)m` followed it **without
anyone touching the component.**

**A typed `−2m` would now be wrong on his screen**, hours after a config change
in a different file, with nothing connecting the two. **That is the exact failure
the derivation was built to prevent, and it has now actually occurred.**

**ONE CONSEQUENCE I AM FLAGGING AND NOT ADJUDICATING:** `settleMinutes: 0` means
the window includes a just-closed minute that may not have delivered its bar, and
`?? 0` reads that as zero trades — **the case `activity.ts` warned "would
manufacture death every minute, on every name."** Ops and Research own that call
and presumably made it against the tail measurement. **The header at least tells
him the window moved.**

## RULED: `"keep it as is with X."` — AND THE ARGUMENT THAT BEAT ME WAS ALREADY IN THIS FILE

**The unit is closed. `0.6x` stays.** Not `0.6 days`, not `61% of a day`.

**I ASKED THE QUESTION PROPERLY AND STILL MISSED THE ARGUMENT THAT DECIDES IT.**
I put three options to him, refused to guess, and named why the earlier
percentage ruling might not transfer. **What I never weighed was that he has read
`x` for months, at speed, on the column he looks at first.**

**AND I HAD ALREADY WRITTEN THE PRINCIPLE, IN THIS FILE, ABOUT HIM** — `:3561`,
on `OFF HIGH`:

> *"His Sheet column is Flush From High and he has read it for months … **A
> number that is correct and unfamiliar can be misread as the familiar one** …
> **a misread number is worse than an unfamiliar one.**"*

**There I weighed familiarity against correctness and let it decide the wording.
Here I weighed it not at all, and he supplied it in five words.** **A correct
unit he misreads is not better than a familiar one he reads right, and the only
person who can weigh that is the one who has been reading it.**

**THE GENERAL FORM, WHICH IS THE PART THAT TRAVELS:** *a principle recorded is
not a principle applied.* **I did not fail to know this — I failed to reach for
it**, which is a different defect and is not fixed by writing it down again.
**The trigger is specific: WHENEVER A PROPOSAL CHANGES SOMETHING HE ALREADY
READS, familiarity is a term in the comparison, and it must be stated in the
question rather than discovered in the answer.**

### THE BOUNDARY, BECAUSE A FIVE-WORD RULING WILL BE QUOTED AT A FUTURE READER

**IT CLOSES:** the unit on that column. **Nobody reopens it without him.**

**IT DOES NOT CLOSE, and all three matter:**

1. **The fraction-versus-rate finding.** He ruled on the **label**. He did not say
   the number reads right, and he was never asked to. **`0.6x` at 04:00 still
   describes a name that has traded 61% of a normal full day, in a unit whose
   1.0 means a whole day.** The observation stands unrefuted.
2. **Stating the window elsewhere.** He rejected changing the **unit**, not the
   idea that a column may say what it is measured over. **`−2m` is the precedent
   and it is untouched** — a header carrying the scope while the cell keeps its
   familiar unit is not what he ruled against.
3. **His original request.** He asked for session-scoped RVOL and gain.
   **Scoping the NUMERATOR is still live; only the relabelling is dead.**

**AND THE THREE ARE NOW CONSISTENT, WHICH THEY WOULD NOT HAVE BEEN UNDER MY
RECOMMENDATION:** keep the unit he reads, scope the numerator he asked for, and
**put the window on the face where the `Now` header already puts one.** That is
his ruling and his request, satisfied by the same move.

## PREMARKET PARTICIPATION ALREADY SHIPS. IT IS CALLED `RVOL` AND IT IS WEARING THE WRONG UNIT.

**Verified both new facts before designing against either.** `afterHours.ts:50`
is as quoted — **AH volume ÷ average full-session volume (20)**, null-not-zero on
an unknown denominator. `minuteBarRetentionDays` **is 3** (`config.ts:85`), so a
true per-session BASELINE is data acquisition, not display. **Both stand.**

**BUT THE THIRD FACT IS FROM MY OWN 04:00 PAYLOAD AND NOBODY HAS SAID IT:**

    tick     rvol     cumVol      baseline      -> cumVol / baseline
    GMEX    1.211     680,157     561,533          1.21 of a normal DAY, at 04:00
    BNC     0.607     178,901     294,644          0.61 of a normal DAY, at 04:00
    WDH     0.327      80,817     246,905
    ISPC    0.214     184,463     863,892

**At 04:00 the cumulative volume IS the premarket volume, and the denominator is
the average FULL SESSION. So `RVOL` during premarket is ALREADY
`premarket volume ÷ average full day` — WHICH IS EXACTLY THE PARTICIPATION FIGURE
HE IS ASKING FOR.** It is not missing. **It is shipped, under another name, in a
unit that hides what it means.**

**⇒ ALL THREE ARE ONE FORMULA OVER ONE DENOMINATOR.** PM participation = today's
`rvol` before 09:30. AH participation = `computeAhParticipation`. RTH
participation = the same quotient with the premarket volume subtracted from the
numerator. **One quantity, three windows — not three quantities.** *Research is
right that three things must not be called RVOL; the sharper statement is that
there are not three things.*

**=== THE DEFECT IS THE `x`, AND IT IS TRADER-FACING TODAY ===**

**`x` invites a comparison to 1.0 = normal. But "normal" here is a FULL DAY,
while the numerator is however much of the day has elapsed.** So the same
intensity reads LOW early and HIGH late, **and the board's own vocabulary tells
him the opposite of the truth at the hour he trades.**

**BNC had traded 61% of a normal FULL DAY by 04:00 and the column says `0.6x`.**
A number that reads *below average* describes a name doing something
extraordinary. **GMEX had already done 1.2 normal days before 4am.** *The
numbers are observed; that `0.6x` reads as "quiet" to him is my inference — and
it is the inference his own question makes, because he asked for exactly this to
be session-scoped.*

**⇒ HIS REQUEST IS RIGHT AND HIS DIAGNOSIS IS ONE STEP SHORT.** Session-scoping
the numerator helps. **But the reason the number misleads is that a
fraction-of-a-day-completed is being presented as a RATE**, and that is true of
the premarket figure even after it is correctly scoped.

**=== SO THE DELIVERABLE IS THE UNIT, NOT THE LAYOUT ===**

**A label that survives being read fast has to carry its own denominator.**
`0.6x` does not. **`0.6 days` or `61% of a day` does** — the word *day* is the
denominator, in the reading, at speed.

**AND I AM FLAGGING A TENSION RATHER THAN RESOLVING IT: he ruled against a
percentage once** — *"dont do a percentage - it's deceptive"* — **on the OFF HIGH
spread.** That was a percentage stading in for **two prices he needed to see**.
**This is different: here the percentage IS the quantity and the ratio is what he
asked for.** **I am not treating that ruling as transferable, and I am not
assuming it is not. It is a question for him, in one line, when this is put.**

**§10 REACHES IT UNCHANGED:** which window each figure covers goes **on the
face**, never a tooltip — the `−2m` precedent, and the Move control that already
relabels itself per session.

**AND THE PRIOR RECOMMENDATION IS UNCHANGED AND NOW BETTER SUPPORTED: the roster
stays whole-day, the NUMBERS get scoped.** Nothing here needs the board switch,
which changes the population.

## THE SESSION DROPDOWN HE WANTS IS NOT THE BOARD SWITCH THAT EXISTS

> **"the rankings are for the whole day, but rvol and gap/gains should be
> tracked by session… a single dropdown to select session that owns the data?"**

**THREE THINGS CHECKED IN CODE BEFORE ANY OF THIS IS DESIGN.**

**1 — "HIS AH MOVE TAB" IS NOT A TAB, AND `AH MOVE` DOES NOT EXIST.** Grepped
the repo: no such string. What exists is **`DiscoveryBoard.tsx:77` —
`{ label: 'AH move', title: "Change from today's regular-session close" }`** —
the **Move SORT BUTTON relabelling itself per session.** Board titles are
`Discovery` / `After-Hours Discovery`, rankings `Daily RVOL` / `AH
Participation`. **So he has spotted the ONE field that is already session-scoped
and is asking why the others are not. That is a much better question than a
request for a tab, and scoping from the description would have missed it.**

**2 — IT IS A DISPLAY CONTROL. VERIFIED, NOT ASSERTED — AND THE WARNING I WAS
GIVEN LOCATES THE COUPLING IN THE WRONG PLACE.** The spend path never consults
the read path:

    worker/research.ts:309   const board = activeBoard(db, tradingDate)
    board.ts:64              resolveActiveBoard({ now: new Date(), facts })
                             -> boardForPhase(phase).  NO REQUEST INPUT ANYWHERE.

**The worker derives its own board from its own clock, in its own loop, and
`queueDiscoveryResearch` takes `autoRank` and `board` from THAT.** A dropdown on
the HTTP read cannot reach it. **`extraSymbols` is already a request parameter
into `readDemandStates` and is bounded at 200 — precedent that the request may
shape the read without touching the queue.**
**THE CONSTRAINT ON ANY BUILD, THEREFORE: the selector parameterises the READ
ONLY. If anyone ever wires it through to the worker, or feeds the queue from the
read model, it becomes a spend control on a shared board — and that is the
moment the warning becomes true.**

**3 — BUT THE BOARD SWITCH CHANGES THE POPULATION, WHICH IS THE OPPOSITE OF WHAT
HE ASKED FOR.** `repo.ts:818` interpolates the rank column into the WHERE, not
just the ORDER BY:

    SELECT * FROM ticker_session
    WHERE trading_date = ? AND ${rankColumn} IS NOT NULL
    ORDER BY ${rankColumn} ASC LIMIT ?

**`DAILY_RVOL` fetches rvol-ranked rows; `AFTER_HOURS` fetches ah-ranked UNION
rvol-ranked. Different rosters.** He said **"the rankings are for the whole
day"** — he wants the roster to stay whole-day and the NUMBERS to be
session-scoped.

**⇒ GENERALISING `DAILY_RVOL | AFTER_HOURS` WOULD DO THE ONE THING HE RULED
OUT.** *"Select the session that owns the data"* is a **column-scope** switch.
The existing two-value switch is a **roster** switch. **They look like the same
control and they are not, and the existing machinery is the wrong lever.**

**SESSION SHOULD OWN THE NUMBERS, NOT THE ROSTER.**

**AND §10 REACHES IT ALREADY:** if RVOL is session-scoped, **which session a
number belongs to cannot live in a tooltip** — same rule as the `−2m` header,
same rule as *every row or no row* on the mixed column. **The precedent is
built: the Move control already states its own scope on its face.**

**THE PART ONLY THIS SEAT CAN SEE, AND IT SHOULD GO TO HIM BEFORE ANY BUILD.**
**The problem he is naming already has an answer on the board, and that answer
was broken for exactly the period he was looking at it.** `DiscoveryBoard.tsx`
beside RVOL: *"this is the CORRECTION to it. RVOL is cumulative and never decays
within a session, so at 10:00 a name that ran at 07:15 and died still carries a
large number."* **That is the `Now` column, and it is the desk's existing answer
to "RVOL is for the whole day".** **He is asking for a second answer to a
question the first one was built for — and the first one rendered five floor
bars on every row for days.** **Before building a dropdown, he should be asked
whether `Now` reads right to him NOW that it is labelled and the data is
flowing.** A feature requested because an existing one was untrustworthy is the
most expensive kind to build.

## THE LIVE TRADE COUNTER SHOULD NOT EXIST AS A MIXED COLUMN — AND THE REASON IS NOT DESIGN

**Asked: how does two-tier freshness look on one column at speed? Answered from
this morning's payload rather than from a hypothesis.** 04:00, production, the
read I had already taken:

    ranked rows            50
    highRes TRUE            2      ISPC (rank 4), IPEX (rank 18)
    highRes FALSE, top 12  11      INCLUDING RANKS 1, 2 AND 3
    rows carrying a quote   2      the same two -- trades/quotes follow highRes
    activity values       {'DEAD'} on all 50
    latched                50      every row qualified today

**A live counter this morning would have been live on TWO rows and two minutes
old on the other seventeen rendered — with the three loudest names in the stale
tier.** That is not a corner case; **it is the state of the board at the moment
his window opened.**

**REASON 1 — THE TIER IS DECIDED BY A SIGNAL WE DO NOT CURRENTLY TRUST.**
`applyHighResSelection` gates membership on `alive(runtime)` — `activity !==
'DEAD'`. **Every row was DEAD, and all 50 were `latched`, so the
latched-and-alive path would have covered the whole board had the verdict been
different.** **A freshness tier derived from the DEAD verdict inherits every
defect of the DEAD verdict**, and that verdict is the thing under investigation.
**No display treatment can repair a tier assigned by a signal that is wrong.**

**REASON 2 — THE COVERAGE IS ANTI-CORRELATED WITH WHAT HE IS LOOKING FOR.** It
is not an arbitrary 250-of-N. **It excludes names the desk has judged quiet —
and a name that wakes up is quiet-then-loud, which is the transition he trades.**
So **the rows most likely to be stale are the rows about to matter.** This
morning that was literally ranks 1, 2 and 3.

**REASON 3 — §10, TWICE OVER, AND WORSE THAN THE HEADER I JUST FIXED.** A
column-level lag can be stated once on the header, which is what `−2m` does.
**Per-row freshness cannot: a header states ONE fact about a column.** Putting it
in a tooltip means **discovering it on one row tells him nothing about the next
row** — the hover-only defect, multiplied by the number of rows.

**⇒ RECOMMENDATION: DO NOT SHIP A MIXED COLUMN. THE COUNTER COVERS EVERY ROW OR
NO ROW.** A cheaper feature that is uniformly honest beats a better one that
requires the reader to remember which rows are which **at the speed he reads.**

**THE THREE UNIFORM OPTIONS, HONESTLY PRICED:**

1. **UNIFORM LIVE** — needs trades wildcarded whole-market. `stream.ts:288-290`
   rules that out deliberately: *"whole-market tick data would be bandwidth we
   have no use for."* **Not my call, and it is the only thing that makes the
   column uniform.**
2. **UNIFORM DELAYED** — what ships tonight, now labelled `−2m`. **Honest, and
   the cost is already stated on screen.**
3. **THE SCOPE THAT ACTUALLY FITS: ONE NAME, NOT A COLUMN.** A live count is
   uniformly true on the **dossier drawer**, where the subject is a single name
   he has opened — and opening it is exactly the act that would justify
   subscribing it. **"This name, live" is a complete statement; "some of these
   names, live" is not.** The feature's value survives the constraint if it
   stops being a column.

**NOT DESIGNED, NOT BUILT.** Whether the counter is buildable, what
`ingestTrade`'s early returns cost, and whether it moots `settleMinutes` are
Research's. **I am answering only the half that was asked, and the answer is
that the mixed column is the one shape it must not take.**

## STANDING RULING: NO CLIENT-SIDE PERSISTENCE OF BOARD STATE

> **"sort does not survive. names change too much anyway. no need for
> persistence of any kind really."**

**Two rulings, and the second is wider than the question I asked.**

**1. SORT DOES NOT PERSIST.** The override semantics stand as built — explicit,
visible while active, `rank` returns to the session's own order. **Nothing to
build.**

**2. HIS REASON IS THE PRODUCT FACT, NOT A PREFERENCE: *"names change too much
anyway."*** The board's population turns over within a session, **so a
preference carried across a reload is a preference about names that are gone.**
That is why the override semantics were right in the first place, and **it
generalises past sort.** Treat *"no need for persistence of any kind"* as the
DEFAULT ANSWER for filters, collapsed sections, column choices, remembered tabs
— **the same argument kills all of them, and I do not need to ask him again
about a member of this class.**

**VERIFIED RATHER THAN ASSUMED — THE SURFACE ALREADY COMPLIES, IN FULL:**

    grep localStorage|sessionStorage|indexedDB|document.cookie
      across components/ lib/hooks/ lib/dashboard/ app/
    -> ONE hit, and it is a COMMENT in useFocus.ts saying there is none.

Board state is `useState` only: `size` (`:121`) and `sort` (`:122`). **`size`
falls under the same ruling and is now ruled rather than incidental.** The
ruling does not ask for a change — **it retroactively justifies decisions
already made, which is the best possible outcome and also the easiest one to
mistake for luck.**

**IT DOES NOT REACH PINS.** In-memory and cosmetic by his earlier ruling; they
do not survive a reload either, **which is now CONSISTENT rather than a
limitation I have been apologising for.**

**AND IT MUST NOT REACH AUTH — RECORDING THE BOUNDARY BEFORE SOMEONE ELSE
APPLIES IT WRONGLY.** A sign-in that did not persist would be unusable: **a
session cookie is not board state.** The ruling is about *preferences over a
population that turns over*; **authentication is about identity, which does
not.** Whoever builds the auth surface — me — must not read this ruling as
forbidding a session. **The class is "state describing names on the board",
not "anything stored in a browser".**

## THE FIVE PREMARKET READS — 2026-09-08, 04:00-04:03 ET. TAKEN, TOKEN REVOKED.

**MY INSTRUMENT WAS POINTED AT THE WRONG ENDPOINT AND THE RENDER CAUGHT IT.**
The script read `/api/market` and reported `activityWindow`, `priceWindow` and
`spreadPct` **FIELD ABSENT on all rows**. The board renders those windows. Both
market routes return `getMarketSnapshot` verbatim, so it is **not** a projection
— **the board is served by a different endpoint.** Had the script printed a
plausible `0` instead of ABSENT I would have concluded the bars were dead.
**"Absent is not zero" is the only reason this was caught, and it caught me.**

**1 — COLOUR. OBSERVED: ONE STATE OF FOUR. PREDICTION CONFIRMED.**

    BNC [0,0,0,0,1473] 1,1,1,1,14px   GMEX [...,5940]   ISPC [...,2503]
    BXBL [...,265] 12px   BATL [...,166] 8px   ATXG [...,8] 1px
    all 60 bars bg-ink-2.  bg-pos 0, bg-neg 0, bg-warn 0, bg-ink-3/50 0.

**Non-zero, as registered before looking.** The `—` branch fired on no row.
Heights track counts against the 300/min line — 8 renders 1px, 1473 renders full.
**Green, red and yellow remain UNOBSERVED**: `priceWindow` absent, so
`directionTone` returns null before it can colour anything.

**2 — UNIVERSE MARKER. INCONCLUSIVE, AND IT EXPOSED A GAP.**
`universeUpdatedAt=2026-09-08T05:28:07Z`, `freshness=FRESH`, **`rollDue=TRUE`**,
marker silent. FRESH + silent is INCONCLUSIVE by my own table, not a pass. **But
`universeWarning` returns null on FRESH before it ever consults `rollDue`
(`universe.ts:81` precedes `:86`) — so A ROLL BEING DUE IS STRUCTURALLY INVISIBLE
ON THIS SURFACE.** That is a finding, not a pass.

**3 — STALE ARC. INCONCLUSIVE, EXACTLY AS PRE-REGISTERED.** One row carries a
cycle: ISPC `BACKSIDE $6.77 → $1.93`, sessionHigh **2.10** < cycleHigh **6.77**.
**Zero preconditions board-wide.** Zero preconditions with a clean screen is
evidence of nothing.

**4 — NEW HIGH / OFF HIGH. BASE RATE ESTABLISHED, NOT TESTED.** Over 12 rendered
cycle cells: **NEW HIGH 0, OFF HIGH 0**, BACKSIDE 1, NO RUN 3, NOT ANALYZED 8.
**0/12.** This is the prior. It becomes a test on the next read.

**5 — TRUNCATION. OBSERVED, NOTHING CUT.** Every cycle cell `clientWidth 152 ===
scrollWidth 152`; every label line `136 === 136`; **`TRUNC false` on all twelve**,
the browser's verdict rather than my arithmetic. `BACKSIDE$6.77 → $1.93` fits.
**`CYCLE NOT ESTABLISHED` did not render at all — the string I measured at
128.2px is STILL UNOBSERVED**, and I am not converting "nothing truncated today"
into "that string is safe."

**OUTSIDE THE FIVE:** all 50 rows `activity='DEAD'`, `deadSince` identical to the
second — `07:55:00.000Z` = **03:55 ET, five minutes before the open** — while the
feed streamed (`lastBarAt` 12s old). **Correct: nothing had traded yet.** It is
also the state **vanish would act on, and at 03:55 vanish empties the board.**
Observed now, not inferred.

## "WHY IS IT 2 MINUTES OLD?" — HE ASKED IT BY HOVERING, WHICH IS THE FINDING

**The lag is correct and I am not proposing to change it.** `settleMinutes: 1`
plus the minute in progress, so the newest slot is always `t−2`. The comment
states the cost outright: a just-closed minute may not have delivered its bar and
`?? 0` **"would manufacture death every minute, on every name."** Lowering it
increases exposure to the zero-fill. **The VERDICT tolerates this** — DEAD needs
five dead minutes ending two minutes ago, so a dead name has been quiet ~7
minutes, proportionate on a 5-minute rule.

**THE DISPLAY IS WHERE IT FAILS, AND I CAN NAME IT FROM MEASUREMENT RATHER THAN
TASTE:**

    header text                     "Now"                DiscoveryBoard.tsx:357
    what the column actually shows  a window ending t-2
    where that is stated            the `title` attribute. HOVER ONLY.
    desk rule against hover-only    audit §10, cited at DiscoveryBoard.tsx:59

**I APPLIED §10 TO THE MOVE LABEL TWO COLUMNS TO THE LEFT AND NOT TO THIS ONE.**
That comment says the session wording *"reachable only by hover"* was **"live for
one deploy"** before the audit ruled it out. **The same defect is live here now,
under a header that says `Now` — the most confident currency claim available —
in front of a trader whose holds are seconds.**

**HELD, NOT DESIGNED.** He has not ruled and Integration has not asked. **What I
am recording is that this is not a matter of preference: there is an existing
desk rule, I applied it once, and this column is on the wrong side of it.**

## WITHDRAWN: THE FLOOR WAS CERTIFYING A MEASUREMENT THAT DID HAPPEN

**`f598564` is wrong and I am withdrawing its headline.** Ops read the stored
windows: **2,369 of 7,757 carry real counts** — `[0,0,79,180,6]`,
`[160,184,257,365,14]`, `[66,100,119,305,18]`. **They are measurements.** The
5,388 all-zero rows are post-close rows for names that had genuinely stopped, and
**every 09-04 row was last written at or after 20:00:02Z — 16:00:02 ET. Not one
mid-session.** **My 1px floor was doing exactly the job its comment claims.**

**MY CHAIN WAS VALID AND MY PREMISE WAS FALSE.** `price_window` NULL ⇒ no slot
matched `minuteCloses` ⇒ (superset) none matched `minuteTrades` ⇒ zero-filled
window. **Every step holds. The premise does not: the column had never had an
opportunity to be written.**

**FROM GIT, AND THE TWO DATES ARE THE WHOLE STORY:**

    activity_window   fce254c  2026-09-04 08:37 +0200  = 02:37 ET, BEFORE that session
    price_window      cb64c2e  2026-09-04 19:09 +0200  = 13:09 ET, and deployed AFTER it

**⇒ THE SIBLING CONTRAST THAT STARTED ALL OF THIS COMPARED A COLUMN THAT EXISTED
DURING THE SESSION WITH ONE THAT DID NOT.** 7,757 versus 0, same rows, same
statement — **and one arm could not have been written at all.**

**I FLAGGED THAT INPUT AS UNVERIFIED AND I CHECKED THE WRONG PROPERTY.** I asked
*"is it one predicate or two counts?"* — it was one predicate, and that answer
was correct and useless. **I never asked whether both arms had the same
OPPORTUNITY to be written.** A controlled comparison needs both arms to have
existed; **checking that a query is well-formed says nothing about whether its
terms are comparable.**

**AND THE ABSENT VALUE CARRIED TWO MEANINGS, WHICH IS THE FAMILY I HAVE BEEN
NAMING ALL NIGHT, ARRIVING UNDERNEATH MY OWN REASONING.** `NULL` meant *"the
column did not exist yet"*; I read it as *"computed and withheld."* **Same
absence, opposite implications** — and I built four commits on the second.

**WHAT I CAN AND CANNOT CONFIRM MYSELF, SAID PRECISELY:** git shows when the CODE
was written. **It does not show when production MIGRATED.** The 2026-09-05T08:32Z
migration timestamp is Ops's, from the box, and I have not seen it. **The commit
dates are consistent with it and do not establish it.**

**WHAT SURVIVES:** the asymmetry itself — a missing slot zero-fills in one path
and withholds in the other — **is still real code and still the reason one
failure would be invisible.** It was not firing. **And `DEAD 7,757` still proves
the feed was alive, because an empty map returns UNKNOWN, never DEAD.**

**04:00 IS THE FIRST MID-SESSION READING OF THIS TABLE ANYONE HAS TAKEN.**
Every prior observation is an after-the-close snapshot. **So `ACTIVE` appearing is
not a fix and its absence is not the old behaviour — it is the mechanism seen at
a time of day never observed. READ IT AS NEW, NOT AS RECOVERED.** My non-zero
prediction stands and is better motivated, not worse.

## READ 1 IS NOW A REAL PREDICTION WITH A THRESHOLD, AND 04:00 SETTLES IT

**Research's clock-skew scan refuted the clock cause: no offset from ±1 minute to
+600 produces zero ever-ACTIVE. A constant skew shifts WHICH minute is read; over
an 899-minute walk a loud name still finds two consecutive loud minutes.**

**MY ASYMMETRY DEDUCTION SURVIVES INTACT. THE CAUSE I ATTACHED TO IT DOES NOT,
AND I SHOULD OWN THE PART I OVERSTATED.** I wrote *"the only remaining variable
is where `now` comes from"* and pointed at clock skew. **The real answer is that
`ticker_session` is one row per `(symbol, trading_date)` and `repo.ts:757` is a
plain overwrite — THE STORED VALUE IS THE LAST STATE WRITTEN, NOT A HISTORY.** At
the final write the window looks at t−6…t−2, which are post-close minutes with no
bars, so **price withholds → NULL and the zero-fill still returns length 5 →
`activity_window` WRITTEN.** `WHERE activity = 'ACTIVE'` asks a current-state
table whether a name's FINAL state was active. **Zero is what a WORKING mechanism
returns.**

**AND THE FACT THAT MAKES 04:00 DECISIVE IS IN MY OWN LANE: THE BOARD READS THE
STORE, NOT THE LIVE ENGINE.** `readModel.ts:461` — `readDemandStates(db, …)`. So
the trader's board always renders **the last-written row**, whenever it was
written.

**⇒ A PRE-REGISTERED PREDICTION WITH A THRESHOLD, WHICH `few` NEVER HAD:**

| what the bars show at 04:00 | conclusion |
| --- | --- |
| **non-zero counts on most rows** | **final-write artefact.** My *"every row since 09-03"* is TOO BROAD and must be narrowed to stored post-close rows. **The render is honest during a session.** |
| **all-zero on rows whose `updated_at` is minutes old** | **real fault mid-session.** My finding stands exactly as reported. |
| no rows / stale `updated_at` | **INCONCLUSIVE** — say so |

**I AM PREDICTING NON-ZERO.** If the mechanism is last-write-wins, a row written
at 04:0x has a live `now` and its slots hold bars. **Recorded before the read, so
it is a test rather than a story — and if it comes back zeros, I was wrong and my
original report was right for the wrong reason.**

**THE READ MUST CARRY `updated_at`, OR IT DECIDES NOTHING.** All-zero bars on a
row last written yesterday is the artefact, not a fault. **The precondition is a
FRESH `updated_at`, read from the payload, separately from the screen** — the
read-3 rule again, third surface tonight.

**AND IT ANSWERS INTEGRATION'S OPEN QUESTION WITHOUT OPS'S WRITE-TIME QUERY**,
because the board renders stored rows and at 04:00 those rows are minutes old.

## READ 2 IS IN ITS THIRD CASE NOW, AND THE MARKER CANNOT FAIL THE WAY I IMPLIED

**The universe refetched EARLY — 01:28 ET Tuesday**, `2026-09-06T21:52:59Z` →
`2026-09-08T05:28:07Z`, 13,103 **ACTIVE** US equities (Ops, from the box). So at
04:00 the universe is ~2h old. **My pre-registration's three-way read now sits in
its third branch: a marker FIRING at 04:00 is the REAL case, not the expected
one.** Check `universeUpdatedAt` before concluding — the field exists in the
payload and `universeWarning` reads it (`universe.ts:88`), so the read is
executable as written. **Verified tonight, not at 04:00.**

**AND THE BASELINE I CAPTURED AT 18:28 MONDAY EXPOSES THE LIMIT OF MY OWN
INSTRUMENT, WHICH I WOULD OTHERWISE HAVE REPORTED AS A PASS.**

    universeUpdatedAt : 2026-09-06T21:52:59.058Z     <- ~45 HOURS OLD
    universeFreshness : FRESH
    universeRollDue   : false
    -> universeWarning() returns null. THE MARKER IS SILENT.

**A 45-hour-old universe, and my marker says nothing.** That is not a defect —
`universeWarning` speaks on `STALE`, or on `UNKNOWN` **with** `universeRollDue`
— **so it reports the ENGINE'S VERDICT, and cannot contradict it.** If the engine
calls a two-day-old universe FRESH, my surface is silent by construction.

**WHICH MEANS "SILENT AT 04:00" IS NOT EVIDENCE THE MARKER WORKS.** It is the
read-3 rule arriving at read 2: **silent with no precondition is INCONCLUSIVE.**
The precondition here is `universeFreshness !== 'FRESH'`, read from the payload,
**separately from what the screen does.**

| freshness in payload | marker on screen | conclusion |
| --- | --- | --- |
| `STALE`, or `UNKNOWN` + `rollDue` | fires | **works** |
| `STALE`, or `UNKNOWN` + `rollDue` | silent | **defect, goes up immediately** |
| `FRESH` | silent | **INCONCLUSIVE** — the case did not arise |
| `FRESH` | fires | **defect** — and this is the case Ops's early refetch makes possible |

**I am recording the fourth row because it is the one the early refetch created,
and it did not exist in my original three-way read.**

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

## Live-state blocks of 2026-09-29, moved from design.md at the 2026-09-30 hand-off

## Live state — 2026-09-29 04:09 UTC / 00:09 ET (third seat of 09-29, opened 03:43Z) — SUPERSEDED by the block above

**This seat: `Design-tmi`, `local_8568daaf`, Opus 5.5.** What it did, and what is open:

- **The `Now` cell is BUILT and on `main` at `fa61410`** (gate at the rebased
  head: 184 files / 2,822, lint 0 errors, build 0, typecheck 0). Built to the
  spec's "The build plan". **Inert today:** no payload carries
  `tradeCapture.asOf`, so the board reads `UNWIRED` and keeps its minute cell.
  **IT MUST NOT RIDE A DEPLOY before a live read on real 10 s data** (the
  spec's own condition). Production is cut as tags from `2256c63`, so `main`'s
  tip is not what ships; Integration is told so, and any tag whose cone
  reaches `fa61410` needs this seat's yes first.
  - Viewed locally (store copy + a SYNTHETIC v2 `trades.db` in the scratchpad,
    never `data/`) at 1,280 and 1,024: LIVE, FALLBACK and NOT_LIVE all render
    as specified, every cell inside its 68 px column (`2,979/min` included),
    tier order correct. **Not viewed on real 10 s data: that is the ship
    condition, not a gap in this check.**
  - **Design's own call, recorded so it is not read as a defect:** a FALLBACK
    row (live capture, this name unmeasured now) keeps TODAY's minute bars
    under its muted `/min` number. The spec named only the number; dropping
    the bars would have removed something he has without being asked.
  - Mutants, 13, all killed. Two counts off prediction, both explained: the
    browser-clock mutant killed 4 not 5 (the undatable-timestamp test meets
    the NaN guard first, a second defence, not a vacuous check); the gap
    mutant killed 2 not 1 (the scale test also pins the gap).
  - A gap the view found and the tests had missed: the `Now` SORT BUTTON kept
    the settled-minute hover while live. Fixed and asserted both ways.
- **Resizable columns CUT for shipping ALONE, his ruling verified at his own
  turn** (Integration's session, human origin, 2026-09-29T03:51:42Z: *"yes to
  columsn and keep this chat for now"*, answering Integration's *"Ship
  resizable columns on their own now, instead of waiting for the price-range
  control?"*). **Tag `design/columns-on-2256c63` → `f4063ca`**, one pick `-x`
  of `1d59b00` onto production `2256c63`. Conflict in the `DiscoveryBoard.tsx`
  import block only: kept the pick's three imports, dropped the range set's
  two context lines. **+/− lines identical to `1d59b00`; patch-id differs on
  context only.** Gated at the tag: 165 files / 2,600, lint 0 errors, build 0,
  typecheck 0. **Viewed rendered AT THE TAG** (local, unseeded store copy): seven handles, Shift+→ ×2 on RVOL 68 → 132 px with Why/Risk giving 32 each and the table still exactly its box; the width survives a reload; Reset widths restores 68/321/321 and clears storage; at 1,024 after a reload the table is 982 in a 982 box, no header clipped. Waits on Integration's
  replay and his ship yes in Ops's session; then Design reads it live (drag,
  reload, width persists).
- **The range set (`520142c`) is VOID** (Integration `99a02e4`): `$1–$20`
  failed idle at 22.0 ms max over 20 warm runs, the index fix does not help,
  and Research owns the fix. Design re-cuts only onto that fix. Nothing owed
  tonight.
- **The restart set** (`research/restart-set-on-2256c63`, Research) is Ops's,
  launching per Integration `dfacbbc`. Disjoint from both of Design's pieces.

## Live state — 2026-09-29 03:12 UTC / 2026-09-28 23:12 ET (successor seat) — SUPERSEDED by the block above where they differ

**SEAT RETIRED AT A CLEAN BOUNDARY, 2026-09-29 03:42 UTC, on his "yes, fresh
session for the Now build".** Nothing uncommitted, nothing in flight. The
successor's prompt is `docs/design-opening-prompt.md`; its first owed actions
are the resizable-columns cut (trigger: the range set ships or is voided) and
the `Now` cell per the spec's "The build plan".

**THE RETIRED SEAT'S FIRST HOUR, 02:47–03:12Z:**
- **The `520142c` red is NAMED on Design's side:** 4 full-output runs at the
  tag in the design worktree, 3 green (167/2544), 1 red:
  `tests/desk/releaseRetention.test.ts > deployment preflight > refuses every
  weekday start that would run inside 07:00-10:00 ET`, a 30 s timeout under
  load (import phase 108 s vs 48 s green). lint 0 errors / build 0 /
  typecheck 0 at the tag. Under Integration's acceptance rule (`da1c748`) that
  family is not a ship blocker. Ops's run-1 name is unrecoverable (filtered
  output); Ops's own timing (19.9 s alone vs 30 s timeout) and a green
  full-output run closed it (`a663a0e`); Ops sped the test up on main (`f869ee0`),
  and 520142c still carries the slow version, so its ship gate can flake again.
  **Production (Ops /proc ~03:05Z): web/research/assess `2256c63`, market
  `3b78b8c`; the range set is NOT deployed.** Nothing
  in tests/dashboard or tests/market failed in 4×2544, so **no re-cut.**
- **Resizable columns, Discovery only: BUILT, gated, on `main`** at `1d59b00`. Viewed at 1,024 / 1,280 / 1,920 against a read-only copy
  of the local store; see the open-items row. Not deployed; ships after the
  range release.
- Now spec: four lines that predated his 02:30/02:32Z answers struck
  (`75ef60e`).

**MY HEAD IS ON `main`; what is DEPLOYED is Ops's to say.** The 2026-09-25
ships (`5254bca`, `8fd7887`) are both verified live, **the evening arm on
2026-09-28 21:22 ET** (see "What is verified ON THE LIVE BOARD").
Production web is `2256c63` (af15a13's server range ranking alone, inert) per
Integration, awaiting Ops's post-landing /proc read.

**HIS RULINGS TO DESIGN, 2026-09-29T02:41:45Z, verbatim: *"1 yes, 2 yes discovery
only"*.** (1) A market-worker restart for the `Now` column, **approved IN
PRINCIPLE**: Ops proposes the time and he approves that time directly. (2)
Resizable columns: **build, Discovery only** (open items).

**IN FLIGHT, OWNER NAMED: Ops's gate at the range tag `520142c` went RED on one
test (~02:40Z, per Integration `ef8d585`).** Design's gate at the same sha was
167/2544 green. Design asked Ops for the test by name (22:42 ET). If it's
`releaseRetention`'s bash-driven 30 s timeout (seen under load tonight, passes
alone), it's load. If it's in `tests/dashboard` or `tests/market`, **Design
re-cuts the tag.** Not approvable while red.

> **THE RANGE SET, RE-CUT FOR SHIPPING — HAND OPS THE TAG
> `design/range-set-on-2256c63` → `520142c` (on origin).** Integration's replay
> found main's control (`5e8b13c`) built on the unshipped briefings, so it did
> not pick onto production. The tag's cone over `2256c63` is exactly ten
> cherry-picks (`-x`) in main's order: 8d8e50c, d2c2582, **5e8b13c (re-cut)**,
> 28a8cb1, dd6019e, 56b6fd4, 7ed88ed, da1e06b, bae9c43, e17fc36. 22 files, zero
> briefing references. The one conflict was resolved by keeping the control's
> pieces and dropping every briefing import, key and helper, plus adding
> `useEffect`, which production's shell lacked. **Gated at the tag: 167 files /
> 2544, lint 0 errors, build, typecheck.** Not viewed rendered on this base,
> because serving it needs the credentialed `.env.local`; Design reads the live
> board after the deploy. **Written here because the handover message to
> Integration was blocked by the app's cross-session limit (22:24 ET). Integration:
> this paragraph is the handover.**

**Report contract `13975c9` (Research), REVIEWED AND APPROVED by Design.** The
six missed-cause sentences match Design's words, keyed on `kind`. The one
deviation is right: the time is the CAUSE's checkpoint time (`09:25 ET`), not
the slot's (`09:27`). **Keep "ET"**, since every printed time carries its zone
(§10). No component test is needed for `covers` / `not in your range`: with
`ReportBody`'s `range` prop removed, reading the config range instead of
`report.range` no longer compiles, so the type system is the second defence.
*Reply to Research pending the app's cross-session pause.*

**COMMITTED, NOT SHIPPED — on `main`, inert until something else lands:**

    307e42d, 6eb1362   session briefings: the line + reading panel
                       inert until Research's GET /api/reports exists (404 renders nothing)
    5e8b13c            the board's price-range control
    dd6019e            the graveyard reads diedWhileRanked (Research d2c2582) and drops
                       "Rank held" on a re-ranked board -- THE GRAVEYARD BLOCKER IS CLOSED.
                       Design owes the range set nothing further. It waits on Ops's
                       live timing (warm max < 20 ms for EVERY viewer range, both boards -- a property, not one range), the no-param default flip (server-side,
                       owner asked of Integration), and his deploy yes.

**`above your range` needs no Design build.** Discovery rows come only from
`discovery.ranked` (`merge.ts:521`), so a pinned-unranked name is never a
Discovery row, and the existing `retentionNote` (`view.ts:262`) already prints
`retained > $max` from the latch against the SERVED range. Research's
`aboveRangeLatched` (`28a8cb1`) is correct (`rankLists` restores in-range ranks
after the scrub, so it fires) and is kept for a surface that shows pinned names.

**The default flip** (Research `56b6fd4`, in the `/api/market` ROUTE only; health,
MCP and diagnostics keep the band): $1–$20 is not the engine band ($0.25–$20,
**his ruled system band, not a lever**), so EVERY viewer's default board is
ordinals-omitted. `Rank held` is omitted by his ruling, *"dead rank not
important"* (2026-09-29T01:53:21Z, to Integration). ~~The drawer's rank-change
line is "lost"~~: **it LIED, printing `New` on every row** (Research's catch);
~~fixed at `7ed88ed` ("—")~~ **REMOVED at `e17fc36`, his ruling
2026-09-29T02:06:46Z: *"yes remove it"*** (7ed88ed reverted in the same commit),
a ship condition of the set. **Review route follows the board:** Research's
`bae9c43`, on Design's answer. *His view, NOT a ruling, recorded by Integration:
"rank in general is not important imo". Nothing is removed on it.*

**Also landed: `da1e06b`** removes the three surviving shell commands from
trader-facing copy (audit F-12: market-light tooltip, assessments-light tooltip,
the drawer's no-market-state line), with §10's automated scan.

**SPEC'D, WAITING ON HIM (via Integration):**
[`../Design/near-live-now-spec.md`](../Design/near-live-now-spec.md) (build
approved; his choice is the unit) and
[`../Design/resizable-columns-scope.md`](../Design/resizable-columns-scope.md)
(scope only; three choices). Both come after the range release.

**DESIGNED, BUILD APPROVED, NOT STARTED:** the payment-failed warning,
`docs/commercial/daily-billing-design/design-seat.md`. Trigger: Ops starts
the billing work, which comes after the sign-in cut-over.

*`363f40d` (the `Now` -> `TRADES` rename) is SUPERSEDED — he ruled `Now`
stays — and its tag should be retired rather than shipped.*

**HOW THIS SEAT SEES PRODUCTION — the biggest standing limit on it, and it is
gone:**

    scripts\aws-create-review.ps1 -ServerHost mointel-ssm -Hours 6 -Label design

*SSH on port 22 times out from this host — his egress IP moved off the
allowlist and nobody retired SSH — but Session Manager goes straight through.*
**The URL prints ONCE. Capture it or the token is orphaned** (revoke with
`-Action revoke -Id N`; revoke when finished rather than leaving it to expire).
Read-only and time-limited: the desk is otherwise behind one shared password
this seat must never type.

**READ A REVIEW LINK BY CONTENT, NEVER BY STATUS.** A dead or expired token
answers **HTTP 200** with ~11 KB. The live desk is ~1.1 MB with `RVOL` present.

*That command line held a literal **BEL byte** where its backslash belongs
until 2026-09-25 — `\a` interpreted once on the way in, rendering as
`scriptsws-create-review.ps1`. **Three repair attempts failed and reported
success**; only a byte-mode read/replace/write took. A path is the worst place
for this: a mangled filename still looks like a filename.*


---

## Archived at the fifth seat's hand-off, 2026-10-01 01:56 UTC: the 2026-09-30 live-state log (fifth and fourth seats), verbatim

### Live state: 2026-09-30 15:47 UTC / 11:47 ET (FIFTH seat `local_4f84a562`, opened 15:37:27Z; clock read via zoneinfo)

**Fifth seat, first hour.** Model Opus 5.5 (right for this seat). Handshake sent by id to Ops, Integration, Research, Web,
Marketing; the fourth seat was already archived (by him) as `Design-tmi-retired`, so no rename request reached it.
**Item 6a DONE, on main `7aa2aa7c`** (details in its row). **Asked Ops (15:38Z, queued) for its own /proc read of the web
sha.** From the artefacts, NOT yet from Ops's answer: c3d0f06 live since 14:51:49Z; the speed fix 84b0099 now ships
TONIGHT after 20:00 ET inside ONE release `46d9f9d` (with Ops's deploy-window guard); the em-dash cut waits until that
lands and cuts onto /proc's sha, and Research's `f6915c4` rides it too (integration.md, 9e8977b2). **TWELVE picks, count pre-registered; Research's `95b734e` (prompt v3) must be ABSENT from the cut's cone** (it waits for Ops's v28 bump): check with `git log <base>..<tag>` before sending the tag. **Report v5 questions
(1)-(3) ANSWERED, row 3a.**
**HIS RULING, verified at his turn (Integration transcript 4689366c, 2026-09-30T15:47:13Z):** *"yes tonight. but i want sessoin reports and ladder resistance all to go tonight. i want everything pending to go tonight."* Ship window after 20:00 ET, one release at a time. **EM-DASH CUT: tag `design/emdash-on-46d9f9d` -> `89d39053`** (12 picks + 1 cut-only commit dropping Web's two unshipped sign-in files from its guard; 1dacc16/5f3a272/1703390 differ in patch-id by resolution only: production body kept in TickerDrawer, sign-in hunks dropped). Declared 182, met 182; lint 0 errors, build 0, typecheck 0, web+auth 79/79. **HELD on one red:** 46d9f9d's own `releaseRetention` preflight cases fail a different set each run (timeouts, exit 126); no pick touches their inputs; Ops asked to run the file on the tag. **Now-cell live read NOT done:** this session's permission classifier refused reading the review token (link 57 created and revoked unused); put to him. **Resistance:** no computation or store on main (git grep, 16:0xZ); Design builds the drawer section inert; asked Research for the row's attachment and type home.
**UPDATE 16:42Z / 12:42 ET.** Em-dash cut hold RELEASED by Integration (a330fdc5: Ops ran the preflight file 3x on each base; pre-existing, environmental, commit memory). **Report v5 surface ON MAIN `80e0bcc0`** (watch-sentence lead, company line, labelled path; the premarket first point reads "prior close", a correction to the "<Wkd> close" first sent: the close before the session the report is FOR, so no date to get wrong). **Resistance section ON MAIN `ad6eb0f1`** (drawer, after the Level ladder; `GET <apiBase>/levels?symbol=`; 404 = not mounted, JSON null = "not computed for this name yet"; type §2 verbatim at `lib/market/resistance.ts` for Research to own). Both inert until Research's routes answer. ~~Neither viewed rendered~~ **BOTH VIEWED RENDERED 2026-09-30 ~17:15Z** (Integration's order: neither ships unviewed), local next dev on the worktree + a store copy + two temporary fixture routes, never committed, all removed after: reports (v5 lead on the briefing line; watch + overall opening; company line; both path forms; null path draws no line; emptied section keeps its heading; zero-watch line) and levels (seven rows; every note state; JSON null; 404 does not mount, with neighbouring sections as control; 1,024 px 0 overflow). Account sent to Integration. **HIS "2 b" (Integration transcript 4689366c, 2026-09-30T17:03:54Z, read at his turn against the 16:49:17Z block): levels show the NEAREST 10 above the price + "Show all N levels"; main `52241465`**, rendered on a 140-level fixture at 1,280 and 1,024. **Design's picks for tonight's cuts:** reports `80e0bcc0`; levels `ad6eb0f1` + `064e15e1` + `52241465`. Waiting on Research's route shas (levels ships tonight only if the live-box cost test passes; the precomputed backup answers the same URL). Levels contract confirmed by Research: 200 row / 200 null / 404 no route / 400 bad symbol. **REPORTS CUT `1fde525b` (Ops, ~40 picks from main onto the production line + one cut-only shim): shim REVIEWED (local rangeLabel identical in output; board = null; 5e8b13c3 not in the cone) and the CUT TREE RENDERED from Design's own worktree with fixtures at 1,280 and 1,024; Design's condition MET, account to Integration.** On that release the report panel follows the stored-or-default range, never the board's, until the range control ships. **Reports do NOT ship tonight** (Research's v5 checker failed its third pass-bar run; the surface waits in cut `4b55a049` for tomorrow). **LEVELS CUT `e8caa77d`** (Ops, on v28 `2bcf1cf`: my three + Research's route; Ops gate 187/187): CUT TREE RENDERED, real route end to end on the absent case plus fixture states at 1,280 and 1,024; condition MET. **Not seen: a real computed row** (a local store has no bars for today). **Review links carry no levels route, so the section never mounts on one: a post-ship check of levels must be on /desk.** **HE ALLOWED THE REVIEW-LINK READ, to this seat directly, 2026-09-30 ("allow it", after the classifier had refused it twice). NOW CELL READ LIVE on c3d0f06, link 58 (15:06-15:09 ET, one visible page; revoked, dead by content 11,766 B / 0 RVOL):** header "NOW | last 10s"; top 12 = 10 LIVE (count above six bars, six dots, one direction colour) + 2 FALLBACK muted "/min" (VBIO, ANTA), stable across 40 one-second samples; 1,024 after a reload 982 in 982, none clipped. **Unexplained, once:** a 15:07:02 ET screenshot showed EVERY row as "/min"; not reproduced in 45 samples. **Timing for Ops:** first /api/market 2,760 ms = 4 queue + 2,704 TTFB + 52 transfer (171 KB / 866 KB, h2); after a reload 706 ms = 2 + 635 + 70. Server-bound both times; the 04:06 15.5 s still unexplained. **Ops is a NEW seat, `local_8a0801c2`** (look it up by title). **Gate rule tonight (Integration): one full suite at a time across seats, announced to Ops; an environmental call needs a timeout/spawn/SQLite-OOM signature AND a pass alone.** Their ship: onto /proc after the em-dash release, with Research's routes, his yes given for tonight. **Commercial's condition met, main `064e15e1`:** an empty levels list reads "No prior high above the price in the history we hold, back to <day, year>."; a split-refused row reads "Older levels are not shown: a split is not yet reflected in our stored history." Em-dash cut replayed and APPROVED ON CONTENT by Integration; hold released; goes to Ops's gate and his yes after 46d9f9d is live. Research: premarket path is null unless its price is an after-hours print (so "AH close" is always true); v5 ALL_STRUCK = every body line struck; the writer is told per name whether a path is printed.

*The fourth seat's snapshot, kept until Ops's /proc answer supersedes it:*
**Nothing uncommitted. Nothing of Design's in flight.** Production web = **74c1818** (brand header v2 on 1b5ead6).
**His "yes to both", ~14:08Z in Ops's session: the Now cell `design/now-cell-on-74c1818` (c3d0f06) ships in Ops's
10:34-10:42 ET slot, then Ops's speed fix 84b0099 (re-picked onto it).** Ops owns both launches and the /proc reads. **UPDATE from Ops (after the snapshot): c3d0f06 is LIVE since 14:51:49Z (/proc web/research/assess on c3d0f06, NR 0). 14:38-14:51Z the box was stalled by the deploy's pre-stop integrity check, so no Now-cell reading from that window is representative.** 84b0099 not yet reported.
The next Design cut sits on whatever /proc confirms after both. Every open item with its trigger:

| # | Item | State | Trigger / next step |
| --- | --- | --- | --- |
| 0-1 | Red test (7a62d62) and brand header (74c1818) | **DONE and read live**; details in `git log` and the "Verified LIVE" line below | none |
| 2 | **Now cell** `fa61410` (main) | **REAL-10 s READ PASSED, 04:06 ET 09-30** (fetchedAt 08:06:17.949Z, production 74c1818, review link 55 revoked + dead by content). URL: the board's `/api/market?symbols=VNDA,…,LIQT`. Load: one page + ONE extra GET of the same URL (the pane would not return the captured body). (1) `tradeCapture.asOf` 547 ms behind `fetchedAt`, RECORDING, 46,834 written / 0 discarded. (2) WETO six slots oldest first, 10,000 ms apart, newest end = newest boundary before asOf; counts 241/490/213/351/374/323; all 23 measured names share one bucketEnd set. (3) 51 rows, 0 absent; every highRes name (21) measured; all 28 nulls are off-feed (`sip-bar`); FUFU/HUBC left the feed inside the last slot (newest null), which fa61410 reads as FALLBACK. Share for Ops: nowBuckets 9,295 B of 778,264 (1.19%), 23 non-empty rows. **Observed, unexplained, sent to Ops: the page's first /api/market took 15.5 s; the GET after, 1.19 s.** **Re-try for Ops at 04:53 ET (link 56, one page, zero extra fetches): NOT REPRODUCED at 08:53:27Z: 1,949 ms = 33 client queue + 1,892 server TTFB + 24 transfer (h2, connection reused); decoded 862,753 B. The 04:06 case stays unexplained; the post-ship read is the next attempt.** | **CUT (Integration approved on 74c1818): tag `design/now-cell-on-74c1818` → `c3d0f06`** (tagger 2026-09-30T04:13:10-04:00), one `-x` of fa61410; +/- lines identical, patch-id f20e9ac0 vs 74d202b8 on context only (conflicts were main-only `onRangeChange` context, dropped). Declared 177, met 177 / 2,723, lint 0 errors, build 0, typecheck 0. **Next: Integration replays; his yes in Ops's session, outside 04:00–10:15 ET; then Design reads the live cell AND takes the first /api/market's timing split (startTime→requestStart→responseStart→responseEnd) for Ops.** |
| 3 | **Session report window** `0f15521` (main) + briefing line `307e42d` | Built, inert until Research's `GET /api/reports` | **Two surface calls, 2026-09-30, sent to Research + Marketing:** (1) the surface KEEPS the ticker lead (dossier link, the three qualifiers, one left edge to scan), and the writer starts with what the name did, never repeating its own ticker (was rendering "SANG SANG"); (2) a section emptied by strikes keeps its heading and gets a NEUTRAL line (Marketing's words, placeholder "No line for this section in this report."). ~~refilled with NOTHING_LINE~~ was false after a strike (our sources DO hold the name); NOTHING_LINE is reserved for the writer's checked absence. Research changes `applyStrikes`; ~~Design owes the surface's empty state~~ **DONE, main `ceb25cb`: Marketing's final words (8c76fe0); the window prints it for `lines.length === 0`. Mutants 1/2/1 at prediction; gate 194 / 2,965. **ONE COPY: `EMPTY_SECTION_LINE` in `lib/dashboard/sessionReports.ts`, on the surface. `applyStrikes` emits `lines: []` (Research c6d1c39) and the surface prints the line.** ~~Research's contract copy~~: Design removed its own copy in favour of the contract's (5f5df76) while Research removed the contract's in favour of Design's (c6d1c39); main had NEITHER and `tsc` was red (TS2305) until the restore commit after 44ba3dc. Then when the route ships, the surface goes to him as one ship; ask him in one line if he also wants a direct URL |
| 3a | **Report v2 surface: opening narrative + per-ticker PRICE PATH** | **HIS VERDICT on the #551 sample, first-hand, verbatim at integration.md `b563207`:** *"the voice and tone is right, uncomplicate it"*; *"it should have an opening narrative describing AH overall and how many tickers are on watch for premarket"*; *"structure is good for the ticker readouts"*; *"just write it out 3.5 --> 5.00 --> 4.25 ... that removes half of the report"*; and the complaint behind the labels: *"now 15% underwhat?"*. Keep the ticker lead + scan edge. Design owns: the narrative block's place above the sections, and the path line's POINT LABELS so no point needs asking "under what?". **The labels "close / AH high / last" are Integration's example, not his; his example is unlabelled. Labelling is Design's call, shown to him at review, not attributed to him.** Research: data + contract; Marketing: words; Commercial: the advice boundary. **HIS FURTHER RULING, "1 a, 2 a"** (ordinal; the option texts as integration.md `28a9de0` records them, READ AT HIS TURN BEFORE BUILDING): FLOAT is a VERDICT only (e.g. "small float, not independently verified"), never a number; the opening narrative leads with *"we're watching N names into premarket"*, N = the report's own list, then the AH overall picture. **Data map (Research `data-map-2026-09-30.md`, via integration.md):** intraday path 48/48, company name 45, catalyst 45, structure 45; sector + HQ city approved to Research; AH close/high/low frozen onto the checkpoint row by Ops (`fc77734`, forward only), so a path point CAN be absent on older rows and the label design must say so **OPENER, Design's calls to Research 2026-09-30:** payload carries `watchCount` (DISTINCT tickers across SURVIVING lines, so it cannot disagree with the names shown), not a sentence; the surface words it (Marketing: singular, zero line, and whether "into the premarket" varies by report kind). **Zero names splits two ways:** pre-strike list non-empty and none survive → ALL_STRUCK, no report; rows held 0 names (a quiet session) → the report PUBLISHES with the zero line (placeholder "Nothing on watch into the premarket."), because "missed" there would falsely say the system failed. Never "watching 0 names". **BUILT: `watchLine(kind, count)` on main `a496207`** (Marketing's per-kind words, 809e4c4: premarket / the open / the last hour / after-hours; "1 name"; zero line), inert until the contract carries `watchCount`; mutants 1/1/2/1 at prediction; gate 194 / 2,973. **Next: wire it into the window when Research's sha lands.** **v5 QUESTIONS, research `design.md` §8, ANSWERED by the fifth seat 2026-09-30 (from the committed file; contract.ts and path.ts opened first):** **(1) Sections: KEEP `sections[]`**, one ticker block = one `ReportLine`; the emptied-section and NOTHING_LINE rules stand unchanged. **(2) Retired headline: the v5 marker is `watchCount` being a NUMBER, not headline null-vs-absent.** Absent and null are one step of serialisation apart, so a v5 row that picked up a null would read as "struck". `watchCount` is computed, never struck, present on every v5 row (0 included). When it is a number the surface reads NO headline at all, and the board's briefing line shows `watchLine(kind, watchCount)` in the headline's place (so the line can never go blank on a strike). v4 rows (no `watchCount`) keep today's reading: headline null = struck. Research may omit or null the field on v5; the surface does not look. ALL_STRUCK for v5 = every line struck. **(3) Path-line POINT LABELS (Design's call; shown to him at review, never cited as his; his own example is unlabelled):** `PRIOR_CLOSE` path: "$3.59 prior close → $6.01 high → $5.10 at 09:27", the last point labelled with the clock of the checkpoint the line was built from (`checkpoints[]` `completedAt`, ET, to the minute; the writer's clock rule). `TODAY_CLOSE` path (the premarket report): "$3.59 Tue close → $6.01 AH high → $5.10 AH close", the weekday from the report's `tradingDate` (his "since Fri close" form). **Never "today's close" and never "now": the premarket report is written the evening before and read the next morning, so both words name the wrong moment when he reads them.** "AH close" holds only if `now` (path.ts: the checkpoint row's `price`) is the last after-hours print, which it should be at a 20:05 or 22:00 checkpoint; **asked Research to confirm, not assumed.** **Absent path** (`path` null or absent): no path line, no placeholder. **Research's side, flagged:** the writer is told the path is printed above its text, so when `path` is null the writer must be told per line, or that name's prices vanish from the report entirely. | **Trigger: after the 04:05 ET Now-cell read.** Build on Research's contract change, never ahead of it |
| 4 | **Resistance levels** section | Routed; spec `docs/research/resistance-levels-spec.md` §2 at **c9f9835** | After item 2. Re-read his rulings at his turns first (row in Open items) |
| 6 | **No em dashes (HIS HARD RULE)**, verified at his turn, session 845dd4cb, 2026-09-30T10:43:39Z: *"no em dashes in any writing. hard rule. nobody uses em dashes as much as llms."* | **Design's half ON MAIN: `1dacc16`** (64 strings, 24 files; label pairs take the board's " · ", prose by sense) **+ `9a1d8e7`** (guard `tests/dashboard/noEmDash.test.ts`: the TS parser over Design's surfaces, RENDERED text so `—` escapes and `&mdash;` entities count; it must SEE the allowed glyphs; mutants 1/1/2 and 1/1/1). Gate 195 / 2,975. ~~Held for his ruling~~ **Empty-cell "—" glyphs: HE RULED KEEP**, verified at his turn, session 845dd4cb, 2026-09-30T10:48:04Z: *"keep it. fine for that, not writing."* The guard already allows exactly that (a bare dash with nothing either side). **Must never change:** input parsing (normalize.ts:42 sheet "—", documents.ts:56 `&mdash;` decode). Web's half: 5f3a272, f272bec, 1703390; canvas after his ship (Web). Worker text (engine.ts, activity.ts) sent to Ops; stored events keep the dash unless normalised at render (Design, on request). **`c76e98f`: render-time `withoutEmDash` (lib/dashboard/prose.ts) for text the desk shows but did not write: model dossier text once in mergeDesk (`readableIntelligence`: dossier strings, status label, source titles, never URLs) and the Desk events feed (covers stored rows; no worker restart). Cycle labels take Marketing's COMMA ("red, backside", drawer "RED, BACKSIDE"), because reports quote them in prose; other board pairs keep " · ". Final strings sent to Research + Marketing.** Mutants 1/1/3/1/1; gate 197 / 3,003 | **CUT ORDER RULED (Integration): 1) Now cell c3d0f06, 2) Ops's speed fix 84b0099, both to him at 10:27 ET; 3) THEN one em-dash cut: -x 1dacc16, 9a1d8e7, c76e98f, **9e0a3a0** (six misses + the guard's placeholder rule fixed; Ops found health.ts:207) + Web's FINAL six, in order: 5f3a272, f272bec, 1703390, 32a9a84, e68137c, 69bafba (his rulings via Web: *"not material, keep adopted. pipe is fine."*, so the full cut; e68137c and 69bafba are docs/comment only and ride, Design's call, 69bafba after f272bec; 32a9a84 never without 1-3). Run `npx vitest run tests/web/ tests/auth/` on the cut: green = complete 5f3a272, f272bec, 1703390, 32a9a84 (e68137c asked) onto /proc's sha, count pre-registered. Not before 1)-2) resolve.** **Also: from now on every word I write, including messages and these docs, carries no em dash.** |
| 6a | **DONE 2026-09-30 by the fifth seat, main `7aa2aa7c`: a string is a placeholder only when it IS the glyph (untrimmed); JSX text still trimmed. The three sites now read " · " (the OLD headline "latest: <day> · <summary>", both status hover titles). The classifier was proven on the present case BEFORE the source fix: the scan listed exactly the three predicted sites. Fixtures: joined, concatenated and one-sided padded strings (writing), a padded only-content `<td>` (placeholder), JSX words either side (writing). Mutants 1/1/1/2/1 at prediction; gate on b595bcea 201 declared and met / 3,042, lint 0 errors, build 0, typecheck 0. Rides the em-dash cut after 9e0a3a0.** ~~GUARD HOLE, found by Research's new seat (local_4b09b3b2), handed to the successor, NOT fixed by the retiring seat~~ | `tests/dashboard/noEmDash.test.ts` `isPlaceholder()` judges `text.trim()`, so a SEPARATOR literal `' — '` trims to a bare dash and passes as the empty-cell glyph. Grep finds three, NOT yet verified rendered: `lib/dashboard/why.ts:392` `.join(' — ')` ("No fresh catalyst · latest: <day> — <summary>", board text built in code, which prose.ts's render pass does not see); `components/MarketStatus.tsx:115` and `components/ResearchEngineStatus.tsx:48` (`label + ' — ' + detail`, hover titles) | **Successor's first code task, and it rides the em-dash cut:** exempt only a literal whose UNTRIMMED text is exactly the dash (Research's twin, `tests/research/noEmDash.test.ts` at f6915c4, has a fixture for the padded separator); add that fixture here; predict the kills; fix the three with the board's " · " (or a colon where it reads better); declare, gate, add the sha to the cut after 9e0a3a0. Same instrument-blind class as ledger rows above, the THIRD instance |
| 3c | **HIS PICK, verified at his turn (Integration transcript 4689366c, 2026-10-01T01:44:16Z): "a now, then b. but what i dont see in this report is an intro narrative. i dscusssed having an opening with a general narrative of the session which is being reported on, then down to the details of the tickers."** | **A (display-only) is NEXT, NOT STARTED:** held because this seat warned him of a repeated error class and the hand-off answer is open (session-hygiene: no new task after the warning). **B** follows A, and its opening block above the sections is RESERVED for his session narrative (Research proposes what the store can say, Marketing the voice), beside the watch line and the premarket totals sentence. **B's supply chip copy CORRECTED (Marketing, 2026-10-01): never "SELL"/"SELLING"/"FREE TO SELL"** (Commercial's absolute "no buy/sell language, ever", enforced in the report checker; the board itself prints "SUPPLY OVERHEAD 6.13M sh", `risk.ts:161`); B uses the board's supply wording. The audit's "FREE TO SELL" (2026-08-23) predates that ruling and is superseded for display. | **Trigger: his hand-off answer.** Yes: the fresh seat builds A first. No: this seat builds A. Either way: render it on the live data shape, cut from /proc's sha, gate when the PC has commit memory, ship after 20:00 ET on his yes, one release at a time with Ops |
| 3b | **REPORT WINDOW "hard on the eyes" (HIS ASK, verified at his turn, Integration transcript 4689366c, 2026-10-01T01:36:00Z: "the session report needs some design attention. its hard on the eyes. needs something. maybe color? some other elements.")** | MOCK published for him (private artifact https://claude.ai/artifact/2NTiveNj9hbgw4HmH1yph3): Today / **A display-only** (a card per name; ticker + company + the feed qualifier on one header row; the path as three labelled points with the last coloured by direction and "+85.5% vs prior close / 18.9% under the high" computed from the path; the prose at a 680 px measure, lighter grey, figures in white) / **B tags** (A + the board's chips: catalyst grade, explains-the-move, cycle verdict, ONE saturated supply chip per the audit's one-colour rule, float verdict as a qualifier; the prose cut to the catalyst story + one unresolved line). A is Design only and touches no checker; B needs Research to compute the chip fields onto ReportLine and the writer to stop restating them (Research + Marketing; a fresh Commercial sample). Text cut off in his screenshot is marked [...] in the mock, never invented. **Marketing's guardrails for B (2026-10-01):** B shrinks the checker's scope, so it needs a fresh defect set and re-freeze; shares outstanding always DATED and never near the word float; the cycle chip in the comma form ("yellow, frontside warning"); supply as capacity (FREE TO SELL), SELLING only on KNOWN_ACTIVE. Explains-the-move IS stored (`catalyst.plausiblyExplainsMove`), so it can chip. The current B mock breaks two of these (undated "62.97M outstanding", cycle chip not in comma form): fix before showing him a revision. The right-edge cut in his screenshot reads as his crop (the window caps text at 760 px and wraps; 0 clipped in every render here); confirm on the board. | **Trigger: his pick (A, B, or changes) on the mock.** Then A is a Design build, gated and rendered, after 20:00 ET on a weekday with his yes; B waits on Research's fields |
| 4c | **Levels ABSENT copy (Research's new seat, 2026-10-01: stored rows exist only for names ranked on a board, so an off-board name never gets one)** | Built: "No levels stored for this name. Levels are kept for names on the board and refreshed every few minutes." (`LEVELS_ABSENT_TEXT`; test refuses yet / computing / soon; mutant 1/1). **PUSHED main `9813ec55` after a clean re-gate once he freed memory (208/208, 3,139; lint 0 errors; build 0; typecheck 0); FOURTH Design pick for Thursday after `52241465`.** ~~LOCAL ONLY, NOT pushed: the full gate could not run truthfully, the PC was out of commit memory (FreeVirtualMemory 1.9 GB; 202 of 208 files ran, every failure an OOM or spawn signature; build exit 134)** | **Trigger: Ops reports commit memory freed.** Gate it whole, push, and add it as a FOURTH Design pick to Thursday's levels cut (after `52241465`) |
| 4b | **Levels, THURSDAY 2026-10-01 (Integration, after tonight's request path failed the box speed test)** | Research + Ops build the STORED-ROWS version tonight, no deploy, cut from production `e8822583` with Design's picks `ad6eb0f1`, `064e15e1`, `52241465`; route contract unchanged (200 row / 200 null) | **Owner Design, trigger: Integration or Ops sends that cut's sha (morning of 10-01).** Re-render THAT cut tree from Design's own worktree: the fixture set (140 levels collapsed/expanded, empty, split-empty, JSON null, 404 not mounted) at 1,280 and 1,024, PLUS a real computed row if the box run produced one. Account to Integration before approval. Ships Thursday after 20:00 ET on his yes. After it ships, check it on /desk (review links carry no levels route) |
| 5b | **Company-name casing (Marketing's call, marketing.md 42800269), NOT tonight** | Ships AS FILED tonight | After tonight, low priority: title-case only ENTIRELY upper-case names; keep tokens of 3 letters or fewer, and any token with no vowel, as filed ("PLBY Group Inc."); fix the suffix list (Inc., Ltd., Corp., Co., Holdings, Group, plc); on any doubt, as filed |
| 5 | Follow-ups, not built | — | Poll: a visible 'not updating' state; the same abort pattern in `useDashboard` at 4 s. Sorted `Now` header renders on three lines |

**Verified LIVE:** the compact-lockup header (74c1818, read on review link 54, created after a clock read of 2026-09-30T02:34:32Z: lockup on row 1 at 1,280 and 1,024, no scroll); the Now field's DATA on real 10 s capture (04:06 ET 09-30, item 2; the cell itself is not yet live); resizable columns (a391c61), the poll fix's code (a391c61), old-catalyst rows + disagreement mark (803008b: 14 dimmed, 0 missed, 3 marks).

*The superseded live-state blocks of 2026-09-29 (third and second seats) moved to
[`design-archive-2026-09.md`](design-archive-2026-09.md) at the fourth seat's hand-off, 2026-09-30.
The standing parts of them (how this seat sees production; reading a review link by content) are in
`docs/design-opening-prompt.md` and the working rules below.*



---

## design.md live state at the sixth seat's hand-off (moved 2026-10-01 14:16 UTC, verbatim)

*Superseded by the snapshot in design.md. Kept because rows A, B, 5b and L carry specs the snapshot points to.*

### Live state (archived): 2026-10-01 01:56 UTC / 2026-09-30 21:56 ET (fifth seat `local_4f84a562`, RETIRING on his "yes hand over"; clock read via zoneinfo)

**Nothing uncommitted. Nothing of Design's in flight.** Every Design commit below is on `origin/main`.

**Production = `e8822583`** (Ops /proc 01:25Z, relayed by Integration; read /proc yourself before acting). It carries, in order:
`46d9f9d` (speed fix + deploy-window guard), `89d39053` (the em-dash cut: Design's five picks, Web's six, Research's one,
a cut-only guard commit), `2bcf1cf` (v28 schema, no UI), `e8822583` (session reports: Design's v5 surface `80e0bcc0`,
the window `0f15521`, a cut-only shim: no board range, a local `rangeLabel`). **NOT levels.** The Now cell (`c3d0f06`) was
already live and is READ LIVE (below).

**Review links (how this seat sees production).** The auto-mode classifier refuses reading the review token unless a
permission rule allows it. **He chose a standing rule (2026-10-01 ~01:57Z) and is adding it himself:**
`"Bash(grep -o 'https://tmitrader.com/review/:*)"` in `A:\mointel\.claude\settings.local.json`. A session can never add it
(refused as self-modification). If a read is still refused, ask him; never route around it, never hand it to another seat.
**Review links carry no levels route**, so levels can only be checked on `/desk`.

**Gate rule (Integration, 2026-09-30):** one full suite at a time across seats, announced to Ops, wait for its clear. A
failure is "environmental" only with a timeout / spawn (126, 127, 0xC0000142) / OOM signature AND a pass alone; otherwise it
is real. This PC runs out of commit memory (1.9 GB free once; every failure OOM, build exit 134): if a gate shows that, it
is not a result; tell Ops and wait.

| # | Item | State | Trigger / next step |
| --- | --- | --- | --- |
| R1 | **Read tonight's release LIVE** | **READ 2026-10-01 ~02:30-02:40Z (22:30 ET 09-30), sixth seat `local_c29a82bd`, on e8822583 (Ops /proc 02:28:59Z), review link 60, revoked and confirmed dead by content (200, 11,754 B, 0 RVOL, "revoked" x2). Live page 1,214,054 B, RVOL present, next-day prep, Discovery empty (correct at that hour), 11 researched names. Em-dash check proved on a known positive (`'a[em dash]b'` counted 1 in the same JS).** (1) **Board text: 0 em dashes in rendered text nodes.** OLD rows read "No fresh catalyst · latest: Sep 9 · <summary>" (CPOP, Researched names). PASS. (2) **FINDING, reached the app: Sheet-sourced labels still carry em dashes.** All 11 dossiers opened: 138 lone empty-cell dashes (allowed), plus visible text "A [em dash] STRONG/FRESH" / "B [em dash] LEGITIMATE/SECONDARY" / "C [em dash] WEAK/NONE" (catalyst grade), "A [em dash] PRIMARY" / "B [em dash] SECONDARY" / "C [em dash] BACKSIDE / OPPORTUNISTIC" (priority), "🟡 FRONTSIDE [em dash] WARNING" (cycle, emoji too), and the structure verdicts ("UNKNOWN [em dash] ...", "DIRTY FLOAT [em dash] ...", "HIGH-RISK DIRTY FLOAT [em dash] 9.44x ..."), in the drawer and in `title` tooltips; board PRI cell tooltips and row `aria-label`s carry the priority label (16 attributes). Cause: `withoutEmDash` (c76e98f content) is applied to the AUTO side in `mergeDesk` only; the Sheet's `.raw` values render as filed (`TickerDrawer.tsx:293,567` etc.). Not built; see row 5c. (3) **The report window CANNOT be read on a review link:** `/review/<token>/api/reports` is 404 (no such route at e8822583; review routes are assessments, dashboard, diagnostics, market), so the briefing line never mounts there. Same limit as levels. So R1's report half, and row A's live check, need either a review reports route (code, Research's route) or a read on `/desk` | Report half: decide the route (ask Integration) |
| A | **Report window, option A (display-only)**, HIS PICK verified at his turn (Integration transcript 4689366c, 2026-10-01T01:44:16Z): *"a now, then b. but what i dont see in this report is an intro narrative. i dscusssed having an opening with a general narrative of the session which is being reported on, then down to the details of the tickers."* | Mock: private artifact https://claude.ai/artifact/2NTiveNj9hbgw4HmH1yph3 (artboard "A"). A = a card per name; ticker + company + the feed qualifier on one header row; the path as three labelled points, last coloured by direction, with "+N% vs prior close / N% under the high" computed from the path values; prose at a ~680 px measure, lighter grey, figures in white. **No writer, contract or checker change.** NOT STARTED. **ADDED BY HIS RULING (Integration transcript 434df034, typed "b" 2026-10-01T02:24:33.560Z, answering "Should reports keep running with titles that can be wrong until the fix ships?", option (b)): A ALSO HIDES THE MODEL-WRITTEN SECTION HEADINGS** until Research's v6 computes them from stored status/grade. Why: the checker never reads `section.heading` (check.ts draftLines), and three live names sat under false headings (Research audit efb29e1a; e.g. GOW, stale and dilutive, under "Fresh and material news"). The names render as one list in the writer's order; nothing on screen may stand in for a heading (no inferred group label). Must stay DISPLAY-ONLY: if hiding headings needs a writer, contract or checker change, STOP and tell Integration (his fallback is (a): keep running, fix in v6). The overall line and the watch line are not headings and stay. **DESIGN'S BUILD PLAN for headings hidden (sixth seat, put to Integration 2026-10-01 before building; WAITS ON ITS ANSWER about dropping NOTHING_LINE):** the body is one list in writer order, A CARD PER NAME as in the mock (a name's later lines join its card at its first position; company line and path print once); an emptied section renders NOTHING (its neutral line would point at a heading the reader cannot see); the writer's NOTHING_LINE is dropped at render too (its truth is judged against the hidden, unchecked heading), matched by the exported constant; a ticker-less line that is not NOTHING_LINE prints as prose in place; an empty body adds "No line in this report." only on v4 (v5's watch line already says "Nothing on watch ..."). Render-only. **Note from R1: the report window cannot be read on a review link (no `/review/<token>/api/reports`), so A's post-ship live check needs that route or a `/desk` read** **APPROVED by Integration as proposed (6363d591); his "1 yes" (02:36:53Z) to reports on review links: Research built the mirror, d427dd0e. BUILT 2026-10-01 (sixth seat) in A:\mointel-design over d80d208c: `13051502` (row A: reportBlocks, emptyReportLine, pathView, figureSegments, feedByName; 10 mutants at prediction) and `b74740d4` (row 5c). Rendered locally on fixtures, 1,280 and 1,024: cards in writer order, no heading, emptied section and NOTHING_LINE gone, v5 empty = watch line only, v4 empty = "No line in this report.", last price green/red/neutral, figures match the mock's (+85.5% / 18.9%), ticker from a card stacks above (z-50 over z-40). Found and fixed in the build: a card's "minute data" could disagree with the header's live count; both now read one per-name answer. GATED 2026-10-01 on Ops's clear (Git Bash, over d80d208c, which already carries d427dd0e): 211/211 test files as declared, 3,170 tests, lint 0 errors (5 warnings, none mine), build 0, typecheck 0. Rebased over docs-only commits (no code diff) and PUSHED: `01017f6a` (row A), `89e6c111` (5c).** | **(A) CUT MADE 2026-10-01 on Integration's order, ON THE LEVELS CUT: tag `design/a-on-b5a35fda` -> `840741d3` (b5a35fda + 35f45d3c<-d427dd0e + 1e8ee22a<-01017f6a + 840741d3<-89e6c111, patch-ids equal: 6b347785, 7169578f, 88dfaa30), 214 test files. Rendered from Design's worktree on the box's two REAL stored reports (Ops's read-only GET, 03:04:40Z, served through a temporary route, deleted after): 11 cards each, no section heading, 0 em dashes, 1,024 clean; Sheet labels comma form on table, tooltips, aria-labels and dossiers. GATE = Ops's release run on 840741d3: ALL GREEN, 214/214 declared and met, 3,202 tests (lockfile, types, typecheck, lint, suite), `next build` exit 0. REPLAYED AND APPROVED by Integration (22nd) by literal sha. If levels does not ship Thursday, the three picks are re-cut from e8822583 and replayed again (not pre-approved). Integration replays, one yes. Post-ship: read A live on a review link (never 07:00-10:00 ET).** Build in `components/SessionReports.tsx` + pure helpers in `lib/dashboard/sessionReports.ts` (test from the rule, predict mutant kills, script mutants from a FILE). Render locally on fixtures AND, once the rule is in, read the live report. Cut from /proc's sha, Integration replays, ships after 20:00 ET on his yes |
| B | **Report window, option B (tags + his session narrative)** | Mock artboard "B". Needs Research to compute chip fields onto `ReportLine` from the as-of dossier (grade, `catalyst.plausiblyExplainsMove`, cycle verdict, supply magnitude by ledger status, float verdict) and the writer to stop restating them; the opening block above the sections is RESERVED for his session narrative (Research proposes what the store can say, Marketing the voice). Marketing's guardrails: **never "sell"/"selling" in display copy** (Commercial's absolute ruling; use the board's supply wording, e.g. "SUPPLY OVERHEAD 6.13M sh"); supply AMOUNTS are fine; float only ever a verdict; shares outstanding always dated, never near "float"; cycle in the comma form ("yellow, frontside warning"). The current B mock breaks three of these (FREE TO SELL / SELLING chips, undated outstanding, cycle not comma form): fix before showing him a revision. B shrinks the checker's scope: fresh defect set, re-freeze, fresh Commercial sample | After A ships. Research + Marketing lead the data and words; Design the surface |
| L | **Levels, THURSDAY 2026-10-01** (the request path failed the box speed test) | Research + Ops build the STORED-ROWS version (spec §8): rows for names ranked ≤ 90 on either board, refreshed ~5 min; off-board names never get one. Route contract unchanged: 200 row / 200 JSON null / 404 = no route (section not mounted) / 400 bad symbol. **Design's picks for that cut: `ad6eb0f1`, `064e15e1`, `52241465`, `9813ec55`** (the section; Commercial's empty wording; nearest 10 + "Show all N levels", his "2 b"; the absent copy "No levels stored for this name. Levels are kept for names on the board and refreshed every few minutes.") | **Trigger: Integration or Ops sends that cut's sha.** Render THAT tree from Design's own worktree (never write in another seat's worktree): the REAL route first, then swap the route for a fixture (back up, restore byte-identical, `cmp`): 140 levels collapsed/expanded, empty, split-empty, JSON null, 404 not mounted; 1,280 and 1,024; a real computed row if the box produced one. Account to Integration. After the ship, check on `/desk` **RENDERED 2026-10-01 (sixth seat): the cut is `b5a35fda` (ops/levels-thu = Research 287561be + 9813ec55; Ops gated 211/211, Integration approved by literal sha). NO BLOCKER. Real route: 200 null, the off-board absent copy. Real computed rows: the refresh run once on a copy of the LOCAL store (newest session 2026-08-18, `--now 2026-08-18T19:55:20Z`, 144 written), served verbatim through the fixture route (GNPX 88 levels, VII empty). Cases: 88 and 140 collapsed (10 + "Show all N levels") and expanded; reopen starts collapsed; empty ("No prior high above the price in the history we hold."); split-empty and split-with-4 built as levels.ts writes them (no aboveAllStored, 15m/daily horizon null); far-back daily ("over 12 months back"); JSON null = absent copy; 404 = not mounted. 1,024 after a reload: drawer 860 px, no page scroll, 0 overflowing rows, 0 em dashes. Cosmetic, after the ship: (1) a span that rounds to one price prints "4.62 to 4.62" (compare formatted values); (2) distance column 56 px, from +1000% the text is wider (worst 3.2 px from the tag; a six-digit percent would collide); (3) stale "memoizes per close" comment in ResistanceLevels.tsx. Account sent to Integration (the retiring 21st and its successor `local_697b69cc`).** |
| N | **One unexplained Now-cell observation** | A 15:07:02 ET 09-30 screenshot showed EVERY row in the per-minute fallback form ("/min"), not the dash-only "not live" blank; 10 s before and 45 samples after were normal. Research's code read: board-wide causes blank the column for 10-20 s; this was the fallback form, a different path | Ops greps its logs for 19:06:40-19:07:30Z (Integration asked). If it recurs, it is the column flickering to per-minute for a poll |
| 5b | **Company-name casing** (Marketing's call, marketing.md 42800269) | Ships AS FILED | Low priority, after A: title-case only ENTIRELY upper-case names; keep tokens of 3 letters or fewer and any token with no vowel as filed ("PLBY Group Inc."); fix the suffix list (Inc., Ltd., Corp., Co., Holdings, Group, plc); on any doubt, as filed |
| 5c | **Sheet-sourced labels render with em dashes** (found in R1, live on e8822583) | **BUILT AND PUSHED `89e6c111`** (own commit, after A; gated with A): `readableSheet` (lib/data/readable.ts) on the payload BOTH dashboard routes serve, not in mergeDesk, because the Researched names table reads the Sheet rows straight off the payload. Keeps symbol, changeSignature, every URL, the lone empty-value dash. The research worker's `loadSheetPriors` is untouched. Known positive per label family through the real normaliser; 5 mutants at prediction. The cycle emoji (audit F-29) is NOT removed: not in this item | Rides in the (A) cut (Integration's call); ships alone on the same slot if A is not ready |
| M | **Big movers on the board** (his ruling 2026-10-01 via Integration: "VEEA is up 43% from close. it should absolutely show on the board somewhere."; Research's rule `discovery.movers`, branch research/movers 558f5cb5) | **HELD ON HIS QUESTION (cost analysis; "we're slowly becoming a scanner"), per Integration 22nd. Do not fold or render. The build stays parked as tag `design/movers-on-558f5cb5` -> `aee14900` (not sent to Research). DESIGN'S PARAGRAPH FOR RESEARCH'S SIDE-BY-SIDE (as it reads to a trader, not whether the method works): One ranking principle is what lets a trader read POSITION as meaning: on today's board, higher means more abnormal participation, the caption says so, and the sort and Top N are tools over that one order. A second principle (biggest % move from the prior close) cannot share that order without corrupting it, so it needs its own group, its own label, its own order that the controls do not touch, and a per-row note of where it would have ranked; that is the cost: more rows, more words, a caption that no longer describes everything on the board, and a reader who must check which group a row is in before reading its position. The two orders also answer different questions: RVOL rank says unusual participation is happening; % move says the price has already moved, which is the question every scanner already answers and the one this board was built not to lead with. Kept as a small, separate, clearly labelled group (the parked build), the cost is mostly words and rows; mixed into one list, the cost is that no position on the board means one thing.** Previously: **BUILT, NOT RENDERED, NOT GATED: tag `design/movers-on-558f5cb5` -> `aee14900`.** Design's call (Integration: "where and how is yours"): a labelled group AFTER the ranked rows in the same table; "Big movers: up the most from the prior close, outside the RVOL ranking. Biggest move first; the sort and Top N do not apply."; producer order; each leads with the move from the prior close and shows "RVOL rank N" under its RVOL figure; row label says "big mover"; a count beside the board counts; day board only; same filters; never a ranked name, never twice. 6 mutants at prediction; lint clean on the files | Send Research the sha (it folds it into the cut) once Design's messaging resumes; render after 10:00 ET (fixture movers: 0, 1, 3; a filter that hides one; the evening board shows none; 1,280 and 1,024) |
| M2 | **Design's paragraph for Research's side-by-side, (A) movers vs (B) median baseline** (asked by Research `local_5f4bfcf8`; to be sent verbatim when Design's messaging resumes) | (B) keeps one ordering, so position keeps one meaning (higher = more unusual participation against this name's own history), the controls keep working over one list, and nothing new is added to the layout; its reading cost is that the RVOL figure on every row changes value, so the column title, its tooltip and the caption under the board must say the baseline is a median, and a figure compared against an RVOL from another source may no longer agree. It also changes WHO is on the board in a way a reader will notice: on Research's replay most of the entries it adds (counted per checkpoint) were down on the day, which reads correctly only if the reader already holds "participation, not direction" (the caption says so today); and it brings only some big movers in (of 12 in the replay, 5 under the median; VEEA itself not yet measured). (A) adds a second reason for a row to be there; it reads cleanly only as its own labelled group after the ranking, in its own fixed order (biggest move first), untouched by the sort and Top N, each row showing where it would have ranked; that costs a band, up to 10 rows and a count in the header, and the caption no longer covers every row. Placement is the system cost: as a separate group after the ranking, (A) changes nothing about what the ranked list means; placed above it or mixed into it, the first rows stop meaning "most unusual participation" and every position on the board needs a second look. Neither option touches the other surfaces (Researched names, reports, dossier). Built and parked for (A): tag design/movers-on-558f5cb5. | Send to Research verbatim |
| C | **Citation tokens render verbatim (Integration's render question, answered 2026-10-01 ~07:50Z; READY TO SEND, Design's messaging was paused)** | ANSWER: YES, on the board as well as the dossier. Rendered e8822583 locally (Design worktree, local store copy): real local dossiers carry the `[4473,4498]` form; the board showed 19 in visible text (Discovery WHY 8, RISK 7 in the DOM walk) and 15 in `title` tooltips; dossiers show them in catalyst SUMMARY, WHY TRADERS MAY CARE, structure SUMMARY, cycle REASONING, REVERSE SPLITS, SUPPLY LEDGER and the list items (structural warnings, unknowns). The `[Source N]` form was PLANTED in the scratch copy (NTWO catalyst.summary "[Source 115982]", whyTradersMayCare "[96174, 96176]"): both render verbatim in the dossier, and the summary one in NTWO's board WHY cell and its tooltip. NO existing clean strips either form (`withoutEmDash` touches dashes only; no citation code in components/ or lib/dashboard/). Board sources: `why.ts:390` (catalyst.summary), `risk.ts:138-139` (structuralWarnings[0], summary), `deskRead.ts` (autoTitle/autoText). Local store only (08-18 data): the count is not production's | Research owns the strip pattern (one shared helper); Design wires it where `readableIntelligence` already cleans the dossier (merge.ts), so board, tooltips and dossier inherit it in one place, in the same cut as Research's fix **BUILT, NOT GATED: tag `design/citations-wiring` -> `5f7fd3fe` (over 613e9e33, which carries Research's fc22dbcb): `withoutEmDashDeep(withoutCitationsDeep(dossier))` in readableIntelligence; tests/dashboard/dossierCitations.test.ts; 1 mutant at prediction. Gate after 10:00 ET (kept load off his PC in the trading window), on Ops's clear. **SUPERSEDED: Research folded it into the citation cut `2a625a5b` (tag research/citation-cut-on-840741d3 = 840741d3 + fc22dbcb + 6fb483a0 + d478adde + 5f7fd3fe); tags design/citations-wiring and design/citations-wiring-on-6fb483a0 (`f6de62c6`, same merge.ts patch-id d35b03bf, plus the 4-digit and double-stop test cases) are on origin. **RENDERED 2026-10-01 from 10:12 ET (checkout clock; "~10:20" was an estimate, corrected at hand-off) after Ops's green rerun (217/217): VERDICT PASS** (worktree at 2a625a5b; scratch store copy with NTWO planted: "[Source 115982]" in catalyst.summary, "[2026]" in whyTradersMayCare, "[4473,4498]" in structuralWarnings[0]; report fixture company business "...SPAC sponsor manager. [Source 115982]."). Board at 1,280 and 1,024: 0 tokens in text, tooltips and aria-labels (same data showed 19 + 15 on e8822583); NTWO WHY "...latest: Aug 18 · Planted catalyst summary.", RISK "Planted warning lists capacity.". Dossier: both token forms gone, "[2026]" kept, 0 em dashes beyond the lone glyph. Report company line: token gone, one stop. 1,024: tables 982/982 and 1,014/1,014, no page scroll. **FINDING: lone 4-digit ids stay by the year rule** (local dossiers: TNON 44 like "[5188]", ENRD 10, PFSA 30, some like "[1594]" look like years). Matters on production only if current dossiers cite ids below 10,000; one read-only count of lone [dddd] in production's current dossiers settles it; if non-zero the pattern needs a year-safe rule (Research's call). Verdict NOT YET SENT to Integration: Design's messaging paused until he types.** TWO GAPS IN THE HELPER, for Research (strings run through its pattern): (1) the live TGE line "a SPAC sponsor manager. [Source 115982]." becomes "manager.." (token between two full stops; companyText on main prints it); (2) 4-digit id lists "[4473,4498]" are kept (the 5+ digit rule); a comma list is unambiguous at any width, a lone "[4460]" is not.** |
| 5 | Follow-ups, not built | — | **Discovery row aria-label reads "TGL, RVOL 71.7x. [em dash] catalyst." when a name has no grade (found rendering the (A) cut; screen readers only). Research's, LIVE: tonight's premarket TGE company line ends "[Source 115982]." (a citation token inside the stored business description; told Integration).** Poll: a visible 'not updating' state; the same abort pattern in `useDashboard` at 4 s. Sorted `Now` header renders on three lines |

**Verified LIVE:** the Now cell on c3d0f06 (link 58, 2026-09-30 15:06-15:09 ET: "NOW | last 10s"; live cells = count above six bars with six price dots and one direction colour; off-feed names muted "/min"; stable across 40 one-second samples; 1,024 after a reload 982 in 982); the compact-lockup header (74c1818); resizable columns (a391c61); old-catalyst rows + disagreement mark (803008b). **Timing for Ops (pre-bound, 09-30):** first /api/market 2,760 ms (4 queue + 2,704 TTFB + 52 transfer), after a reload 706 ms; the 04:06 ET 15.5 s case stays unexplained.

*The fifth seat's running log of 2026-09-30 and the fourth seat's snapshot moved to
[`design-archive-2026-09.md`](design-archive-2026-09.md) at this hand-off. Every decision in them is either in a row above,
in "What he ruled, verbatim", or in a commit.*

## design.md live state at the seventh seat's hand-off (moved 2026-10-03 14:11 UTC, verbatim)

## Live state: 2026-10-02 02:52 UTC / 2026-10-01 22:52 ET (seventh seat `local_dfce21d4`, opened 02:32:40Z; clock read via zoneinfo)

**Seventh seat, first entries.** Ops /proc 02:32:23Z (box clock): web/research/assess on `e8822583`, market on `1b5ead6`; NOTHING of tonight's three had shipped; levels put to him ~22:33 ET, his answer not in at that read. **/desk on production is behind Basic Auth that Ops does not hand out: Design cannot read /desk unless he opens it himself (P1).** **Movers label BUILT: tag `design/moving-on-e0f18bbb` -> `98905b08`** (row M). **LEVELS LIVE** on `b5a35fda` (Ops /proc 02:54:30Z); first refresh 02:56:35Z, 147 names; `/api/levels?symbol=NXL` 200, 66 levels ascending above price (Ops's read). **(A) and citations HELD** behind a memory-fix decision after an OOM kill during the deploy (his). **Ops `local_8a0801c2` RETIRED on his word (hand-off ops.md 755e08a6): ask the successor, found by title Ops-tmi, for ship times and before any gate.** **Row B spec SETTLED** (Integration's final call: one vocabulary via the board's functions; Marketing re-locked step 3 at 8842ee0d). Owed after v6 is live: one both-surfaces wording change (Marketing's words, explains-the-move in three states), checked at 1,024. **His new complaint on the reports, via Integration 2026-10-02: "there's still no opening narrative and no design element, its hard to read, this was brought up." Row B is next after the label; Research started v6.**

*Sixth seat's header, kept for its rows:* 2026-10-01 14:16 UTC / 10:16 ET (`local_c29a82bd`, retired and archived).

**Nothing uncommitted. Nothing of Design's in flight.** The previous live table (every row's full history, including row A's and row B's specs, row 5b's casing rule and the levels picks) moved verbatim to [`design-archive-2026-09.md`](design-archive-2026-09.md), section "design.md live state at the sixth seat's hand-off". Read it for any row below that says "spec in the archive".

**Production = `e8822583`** (Ops /proc 2026-10-01T02:28:59Z; nothing had shipped after it at that read). Read /proc yourself before acting. Deploys are refused weekdays 04:00-20:00 ET.

**Tonight, Thursday 2026-10-01 after 20:00 ET, three cuts stacked in this order, each needing his yes in Ops's session (Integration decides whether the later ones ride as one):**

| Cut | Literal sha | Content | Gate / approval / render |
| --- | --- | --- | --- |
| Levels | `b5a35fda` (ops/levels-thu) | Research's stored-rows levels 287561be + Design's 9813ec55 | Ops 211/211; Integration approved; Design render PASS (archive row L) |
| (A) | `840741d3` (tag `design/a-on-b5a35fda`) | b5a35fda + 35f45d3c (Research: review links serve /api/reports, his "1 yes") + 1e8ee22a (row A: report cards, model-written section headings hidden, his "b") + 840741d3 (Sheet labels without em dashes) | Ops 214/214 + build 0; Integration approved; Design render on the box's two REAL stored reports PASS |
| Citations | `2a625a5b` (tag `research/citation-cut-on-840741d3`) | 840741d3 + Research's citation strip (fc22dbcb, 6fb483a0, d478adde) + Design's wiring (readableIntelligence) | Ops 217/217 + build 0 (rerun 14:09:20Z); Design render PASS (row C below) |

| # | Item | State | Trigger / next step |
| --- | --- | --- | --- |
| P1 | **Levels on a review link after the ship** | **DONE LIVE 2026-10-02 10:0x ET, review link 63 (revoked, dead by content): AMOD populated row, nearest 10 + "Show all 47 levels" expands and collapses, footer from the 10:00 ET close, 0 em dashes, 1,024 fits. MOVERS LIVE same read: caption "4 moving", Top 12 shows none under Rank, RTH Gap sort shows ORBS/IBRX/FEAM/NAUT with the tag and hover. AR seen live: unresearched rows' aria reads "[em dash] catalyst".** Earlier: | **PARTLY READ LIVE (19f9d721 live per Ops via Integration, 05:12:21Z; review link 62, revoked, dead by content 11,754 B / 0 RVOL / "revoked", tab closed, link file deleted).** `/review/<token>/api/levels`: NXL 200 null (36 ms), AAPL 200 null, "!!" 400; review cache headers. The drawer's Resistance levels section MOUNTS on a review link (it did not before): SORA shows the absent copy, 0 em dashes, 1,024 fits (drawer 860, nothing past it). **Why NXL is null now:** the route reads `etDateString(new Date())` (route.ts:50); after 00:00 ET the date is 10-02 and no row exists until the day's first refresh writes names that rank (Ops's 66-level NXL read at 22:56 ET was the 10-01 date). Expected, not a defect: from midnight to the first refresh every dossier reads the absent copy. **STILL OWED: a populated row (collapsed, expanded, 1,024) and the movers label live. TRIGGER: the day board has rows (from 04:00 ET), read 04:00-07:00 ET or after 10:00 ET, never in his window; ask Ops/Integration for a mover name if one exists.** Earlier history: | **HIS RULING to Design 2026-10-02 (this session, typed): "Research adds levels to review links, so I can check this release and future ones myself. It's a small change and would ship later."** **BUILT: research/review-levels `9f084c9e` (on b5a35fda), `app/review/[token]/api/levels/route.ts` calls the owner handler after `guardReviewApi`; the review page's `apiBase` is `/review/<token>/api` (page.tsx:36), so `ResistanceLevels` needs no change (read by Design).** Next: Integration cuts, his yes, ship; then Design reads levels on a review link (light, never 07:00-10:00 ET), revokes, confirms dead. Was: BLOCKED on access | Trigger: Ops says the levels cut is live. Review links have NO levels route. **Ops (02:32Z): /desk is behind Basic Auth; Ops does not hand out or type it, so a visual read is not Design's unless he opens it. Ops's own ordered check is one server-side curl of /api/levels for a top-5 name after the first refresh; Ops sends the body.** Ask him only if a visual read is still wanted after that |
| P2 | **(A) live on a review link after the ship** | **READ LIVE, PASS** (840741d3 live per Ops via Integration, push-release 04:22:24Z; review link 61 from 04:24Z, revoked, dead by content 11,754 B / 0 RVOL / "revoked" behind a 200, tab closed, link file deleted). Report window opens on the review link (reports route works): Premarket briefing for Fri Oct 2, 11 cards = "watching 11 names", no model section heading (only the title and "Earlier today"), every card a three-point path (prior close / AH high / AH close), figures set apart on 10 of 11 (ALPX has no research), 0 em dashes in rendered text and attributes (1,056 in the embedded payload only; check proved on a planted one), 0 clipped; at 1,024 after a reload the 960 px window fits, measure 760, no page scroll. SORA dossier: every em dash is the lone empty-cell glyph (his exception). **Still in reports: bracketed source ids (4 in the briefing, 21 in SORA's dossier)**, expected until the citations cut ships (board and dossier) and v6 fix (d) (reports). Discovery was empty (next-day prep), so the row aria item AR could not be seen. Was: Owed | Trigger: Ops says 840741d3 (or 2a625a5b) is live; never 07:00-10:00 ET. Review links now carry `/api/reports` (35f45d3c). Read: cards in writer order, no section heading, figures set apart, path with three labels; Sheet labels in comma form in table, tooltips, aria-labels, dossier; no citation tokens on board or dossier. Revoke, confirm dead by content, close the tab |
| C | **Citation tokens** | Render of 2a625a5b PASS, 2026-10-01 from 10:12 ET (method and numbers: commit f51e3215's row text, kept in the archive). OPEN FINDING: lone 4-digit ids ("[5188]") survive by the pattern's year rule; matters only if production's current dossiers cite ids below 10,000 | **COUNTED (Integration, 313a2485): 59 of 1,178; ships as is; the follow-up is Research's** (docs/ops/citation-lone-4digit-2026-10-01.txt). Nothing for Design |
| FI | **FINRA short-interest attribution (Web's words, from the retiring Web seat local_2c0e391a, 2026-10-03)** | Recorded, NOT an approval to build (his yes for the short-interest label itself not seen by this seat). WHEN the label is built: at the label `Short interest: FINRA (owner and source), settled <YYYY-MM-DD>`, and a persistent board-footer legend `Short interest data: FINRA (owner and source). Shown as our own derived label, not FINRA's figures.` The settlement date is part of the attribution (a crowding label without it reads as current); shipping without these is a licence condition unmet. Also from Web: `components/NotAdmitted.tsx` is deliberately ONE screen where `docs/web/canvas/Admitted.dc.html` draws three (the gate cannot say why it refused), not unfinished work. Web confirmed no public page imports `lib/data`. | Whoever builds the short-interest label |
| SR | **GOOGLE SHEET REMOVAL (his ruling, via Integration local_54f1341f, 2026-10-03; plan `docs/sheet-removal-plan-2026-10-03.md` at 0009301e)** | **Design's parts, NOT STARTED:** step 1 (no demo rows in production when the Sheet is absent, `lib/data/index.ts:65`; Design OWNS `lib/data/` for this, told Web) and step 3's surface (Why cell, Desk Read, risk chips, research-status labels and drawer sections read the desk's own research first; the "Sheet sync" chip goes; the second table goes or changes per his decision 2; float per his decision 1). | Step 1: buildable now, but nothing runs locally without his yes. **Web agrees Design owns `lib/data/` (Web local_46c15fbe, 2026-10-03). Shape (Web's, Design concurs; read lib/data/index.ts:49-67): `resolveProvider()` falls back to MockProvider whenever Sheet credentials are absent; make mock ONLY on the explicit USE_MOCK_DATA flag (tests already set it), and absent credentials an explicit empty payload whose meta says no research source is configured. The board's empty-state words are Design's and must not read as a fault once the Sheet is gone on purpose.** Step 3: his decisions 1 and 2. This seat proposed a hand-off (backslash class repeated); the successor may be the builder |
| LL | **ONE LADDER (his ruling 2026-10-02T11:51:56Z, read at his turn)** | **READY: tag `design/one-ladder-on-28c66f14` -> `9189b569` (2 over /proc 28c66f14: 2afd15bc the merge, 9189b569 the 1,024 distance column). Rendered on REAL stored rows (levels refresh on a local store copy, 144 written, --now 2026-08-18T19:55:20Z) with planted split (YYAI with levels, ALEC empty) and absent (ACGC): GNPX 88 collapsed/expanded, VII empty, LGCL under $1, all descending, price row central, 0 em dashes; at 1,024 after a reload every level row one line (24 px), nothing past the 860 px drawer. Gate (Ops's slot): 222/222, 3,278, lint 0 errors, build 0, typecheck 0.** Sent to Integration for his ship yes via Ops. Pre-existing lead (not this change): the ladder's blue-sky row on the local store reads 855795.60 for GNPX (a 2018 price) under a line saying "split-adjusted". | |
| L-cos | **Levels cosmetics** (Integration: after the levels ship, own commit, no re-cut) | Not built | (1) a span that rounds to one price prints "4.62 to 4.62": compare formatted values; (2) distance column is 56 px, text from +1000% runs into the gap (a six-digit percent would collide); (3) stale "memoizes per close" comment in ResistanceLevels.tsx |
| BS | **Blue-sky line: a ceiling behind a share consolidation (GNPX $855,795.60)** | Design's pick (a) comparable ceiling as the level, (b) UNVERIFIED fallback; Research built it (70c534f4, ded2274a last split named, bac44069 Marketing's words). ~~`750b9f25` (rescaled price), `9694e8bb` (no figure)~~ SUPERSEDED. **READY: tag `design/bluesky-hover-traded-on-bac44069` -> `c535dce7`, ONE commit on bac44069: the deep ceiling AS TRADED (Integration's order, Marketing's locked words): "Highest stored high: about $19.45 as it traded on 2018-04-30, before share consolidations totaling 44,000-to-1. Not comparable to today's price. Reference only." (factor = adjusted / raw, splits.ts:102). Gate 223/223, 3,292, lint 0 errors, build 0, typecheck 0; mutants 5/5 at prediction.** Gate 223/223, 3,289, lint 0 errors, build 0, typecheck 0; mutants 3/4 at prediction, the 4th a second defence (Number.isFinite(null)) | Integration replays; re-cut on a4a06168 if the AR ships first; his yes |
| AR | **Row aria-label said "[em dash] catalyst."** when a name has no grade (screen readers only; seen live 2026-10-02) | **READY: tag `design/aria-catalyst-on-9189b569` -> `a4a06168`** (whySpoken; Discovery + researched table). Gate 223/223, 3,283, lint 0 errors, build 0, typecheck 0; mutants 4/4 | Integration's literal-sha approval, Ops's release gate on the shipped sha, his yes. Then read live: a no-grade row's aria |
| M | **Movers: the "moving" label** | **RULED** (verified at his turns in Integration's 1bfab363: 15:36:50Z queued input "if something is labeled as moving it should just be ranked based on all other parameters normally not placed in a separate group"; 15:53:57Z "10% with 500k shares, cap 15"). Research built rows at e0f18bbb. **Design's label BUILT: tag `design/moving-on-e0f18bbb` -> `98905b08`** (1 over e0f18bbb): "moving" on its own line under the ticker (beside it overflowed the 96 px cell at 1,024), hover from the row's own move/volume/RVOL rank, row aria "moving", caption "N moving" on the day board. Rendered on a store copy (0/1/3 movers, filter, evening board, Top 50 under Rank, Gap sort, 1,280/1,024). Gate (Ops cleared the slot): 221/221, 3,257; lint 0 errors; build 0; typecheck 0. `design/movers-on-558f5cb5` is VOID (Integration) | Integration replays; ships on his yes via Ops after tonight's three. Then read it live |
| B | **Report window option B** (tags + his session narrative) | **RENDERED 2026-10-02 on Research's step-5 samples (e6d20f55, all four kinds, fixture route in Design's worktree, restored byte-identical): surface PASS at 1,280/1,024; THE SESSION now plain text (`54e2a407`; tip = 1ba42292 + 301ac033 + 54e2a407, local tag design/reports-v6-wip). Content finding to Research: INTO_RTH narrative "4 of the 12 names" vs page "watching 10" / "FRESH NEWS 2". GATE NOT DONE: stopped on HIS RULE (2026-10-02, via Integration local_54f1341f: ask him before running anything locally); partial run 228/229, 6 timeouts in releaseRetention.test.ts (untouched by Design; PC loaded). TRIGGER: his yes to a gate slot. STRUCK NAME LINES (Integration local_54f1341f, 2026-10-03, on Design's position): the card stays (company, tags, path), NO prose and no mark of the strike, per design-seat.md 3a; watchCount counts kept cards, so cards = covered names = the narrative's denominator. Surface needs no change (text "" renders a card without prose). Research builds; a new PREMARKET sample with its narrative is at research/reports-v6 d5c928e5 (voice-run-v6c), to render with the gate.** Was: SURFACE BUILT on v6 (Integration's order: the cut blocker): tag `design/reports-v6-surface-on-b8719e7c` -> `1ba42292`, 1 over Research's b8719e7c. Gate (Ops's slot, run here): 229/229 declared and met, 3,322 tests, lint 0 errors (6 warnings, none mine), build 0, typecheck 0. Mutants 6: five at prediction, one 1-of-2 explained (second guard). NOT RENDERED on real v6 output: Research's step-5 samples do not exist yet; asked Research for the SessionReport JSON per kind. ~~Open with Research: does checker v6 make the recap F9 line mandatory?~~ **No (Research): the watch sentence now stays on every report (`301ac033`, local tag `design/reports-v6-wip`, NOT gated; gate with the step-5 render fixes). Samples: Research's harness writes docs/research/reports-v6/voice-run-v6/v6-<KIND>-report.json once a post-10-01 production copy exists (Ops is putting it to him). TRIGGER: Research says the files are committed -> ask Ops for next dev -> render all kinds at 1,280 and 1,024 -> gate -> tag -> Integration.** | **SPEC WRITTEN: [`../Design/report-b-spec.md`](../Design/report-b-spec.md)** (Design's step 3 answer for v6: tags are the board's own Why/Risk output from the as-of dossier; narrative "THE SESSION" replaces `overall`; no cycle tag; float once in a footer). Waits on Research's fields (v6 step 4), then Design renders the step-5 sample. His words 2026-10-02 via Integration: "there's still no opening narrative and no design element, its hard to read". Was: after (A) ships. Spec in the archive (row B): chips from Research's computed fields, opening block reserved for his session narrative, Marketing's guardrails (never "sell"/"selling", float only a verdict, shares outstanding always dated, cycle in comma form); the current B mock breaks three of them | Research + Marketing lead data and words; Design the surface |
| 5b | **Company-name casing** | Not built; spec in the archive (row 5b) | After (A) |
| N | **One Now-cell observation** (09-30 15:07 ET, every row in the /min form) | Ops's logs | If it recurs, it is the column flickering to per-minute for a poll |
| 5 | Follow-ups, not built | | Poll: a visible "not updating" state; the same abort pattern in `useDashboard`; the sorted `Now` header renders on three lines |

**Rules this seat learned the hard way, for the next one:**
- **The desktop app pauses a session's cross-session messages after about ten sends with no user turn.** Anything a peer is waiting on goes into this file first; then tell him in one line that a type from him releases the queue.
- **Never run anything heavy (dev server, suite, build) while Ops's gate runs**; this PC ran out of memory on a gate today. One heavy job at a time, announced.
- **Render on real data when it exists:** Ops can save one read-only GET of the box's `/api/reports` into your scratchpad (done 03:04:40Z); delete it after.
- **Push docs from your own worktree on origin/main** (`git checkout --detach origin/main`, commit `--only`, push, return to your tag). Shared `A:\mointel` main carried Ops's unpublished commits all day; never rebase it.

**Verified LIVE this seat (R1, review link 60, e8822583, 2026-10-01 from 02:30Z):** board text 0 em dashes; OLD rows read "No fresh catalyst · latest: Sep 9 · <summary>". Found there: Sheet labels with em dashes in every dossier (fixed in (A)); reports unreadable on review links (fixed by 35f45d3c in (A)).

