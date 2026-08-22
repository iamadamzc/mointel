# Momentum Intelligence Live Desk — UI/UX Audit

**Subject:** `https://dwwep02jje2ag.cloudfront.net/` (AWS production, release as deployed 2026‑08‑21)
**Method:** live interface first (interaction, measurement, screenshots), then source review
**Session observed:** Fri 2026‑08‑21, 00:28–00:37 ET — `NEXT_DAY_PREP`, market closed, Discovery empty, 6 researched names on the watchlist
**Viewport under test:** 1022 × 551 CSS px (Chrome, `devicePixelRatio` 2.82 — this is the real viewport on the owner's machine)
**Nothing was modified.** No ticker was pinned, no research retried, no filter state persisted.

A note on scope before anything else. The audit brief asks about *Chop Risk*, *Flush Risk*, *Live Confirmation*, *Overhang Absorption* and *Effective Float Turnover*. Four of those five do not exist in this product and were deliberately not built. What exists instead is: Momentum Cycle, Catalyst grade, Structure / Dirty Float, a supply ledger, a displayed‑float turnover figure explicitly labelled *not* effective float turnover, and a `Confirmation` column that is a free‑text cell on the Google Sheet's TODAY tab. This report evaluates what is on the screen, and says plainly where a briefed concept has no implementation to assess.

---

## 1. Executive verdict

**This is a genuinely good intelligence engine wearing a spreadsheet's clothes.**

The substance is unusually strong. The desk knows the difference between *a human said this*, *the machine said this*, *both agree*, *they disagree*, *the machine ran and reached no conclusion*, and *nothing has been analysed*. It refuses to convert registered resale capacity into "active selling". It links every claim to a specific SEC accession number. It swaps the Discovery ranking after the close and tells you it did. It shows a frozen checkpoint without merging live prices into it, because that "would look like a record and behave like a lie". That intellectual discipline is rare and it is the product's actual moat. Preserve all of it.

The presentation squanders it. Four problems, in order of consequence:

**1. The screen is built for a monitor that isn't there.** The Analyzed Watchlist declares 15 columns totalling 1,904 px of minimum width; the Discovery board declares 15 columns totalling 1,504 px. The viewport is 1,022 px. Right now **37% of the watchlist (596 px) is off‑screen behind a horizontal scrollbar**, and the columns hidden there are `Warning`, `Confirmation` and `Updated` — the risk sentence, the confirmation state and the freshness stamp. The single most decision‑relevant column in the product is the one you cannot see, and when you scroll right to read it, the `Ticker` column scrolls away with it, so you no longer know which name you are reading.

**2. Everything visible is a wall of amber.** Of six tracked names, four are `FRONTSIDE — WARNING` (amber), two are `BACKSIDE` (red), two are `DIRTY FLOAT` (red), four are `UNKNOWN STRUCTURE` (amber), and every `Warning` cell is amber prose. There is no visual difference between "this name has a compliance‑only catalyst and 38 M registered resale shares" and "we don't know this name's float". Saturation has destroyed the signal that the colour system was designed to carry.

**3. The product's headline promise — *what materially changed since the previous assessment* — is implemented and then buried.** `lib/desk/assessment.ts` computes sixteen typed change classes per ticker per checkpoint (`ENTERED_TOP_N`, `RANK_DETERIORATED`, `MAJOR_GIVEBACK`, `SUPPORT_LOST`, `CATALYST_CHANGED`, `STRUCTURE_CHANGED`, `NEW_EVIDENCE`, `INTELLIGENCE_STATUS`, …). They surface in exactly one place: the last column of a frozen snapshot table you can only reach by leaving the live board via a dropdown, rendered as `changedFields.join(', ')` — raw `SCREAMING_SNAKE` enums, at 11 px, in `text-ink-3` (3.84:1 contrast, the lowest‑emphasis colour in the system), behind a horizontal scroll. On the live board, change is signalled by a background tint that lasts **2.5 seconds** and leaves no trace. Look away for three seconds and the change never happened.

**4. The interface talks about itself.** The header carries `hi-res 6`, `q 0 · a 0`, `msg 227s`, `reconnects N`. The KPI tooltips say "Rows present on the TODAY tab". The drawer prints `AUTO_SOURCE_GAP`, `INTERPRETATION_DIFFERENCE`, `YELLOW_FRONTSIDE_WARNING`, `SECONDARY_STALE`, `REGISTERED_RESALE · POSSIBLY_ACTIVE`. The Discovery empty state instructs the trader to run `npm run market:alpaca` — a command that, against the AWS deployment, would silently displace production's only permitted Alpaca SIP connection. That is operator language in a trader's product, and in one case it is dangerous advice.

**The most consequential design problem, stated once:** the page is organised around *where the data came from* (Sheet vs Automatic, TODAY tab vs RESEARCH tab, Discovery vs Watchlist, live vs checkpoint) rather than around *what the trader has to decide*. Every one of the four problems above is a symptom of that single choice. The redesign in §6–§7 reorganises the page around the decision and lets provenance become an attribute of a claim rather than a top‑level axis of the layout.

**What is already right and must survive the redesign:** the four independent health lights; the refusal to overwrite a human conclusion with a machine one; `NOT YET ANALYZED` as a distinct state from `UNKNOWN`; the snapshot board's refusal to merge live data; the session‑aware Discovery relabel; the SEC‑linked source list; the Focus strip being user‑owned and never recomputed; the "high rank means abnormal participation worth investigating — not a trade, a catalyst, or a clean structure" caption.

---

## 2. Intended user workflow

### Optimal workflow for this product

| Phase | Time budget | The question | What the desk must supply |
| --- | --- | --- | --- |
| **Sweep** | 2–5 s | "Anything new that deserves me?" | An ordered list of ≤12 names with, per row: why it is ranked, whether the reason is legitimate, whether the structure is dangerous, and whether anything changed since the last look. |
| **Triage** | 5–15 s | "Which two or three?" | Enough per row to *reject* nine of twelve without opening anything. Rejection is the high‑volume operation; the desk's job is to make it cheap. |
| **Investigate** | 30–90 s | "Is this real, and what kills it?" | Catalyst + freshness + source, float claim + why it may be wrong, named supply, nearest levels, cycle position — all above the fold, one screen. |
| **Verify** | 1–5 min, rarely | "Prove it." | Filings, the full ladder, the Sheet-vs-Auto reconciliation, telemetry. Collapsed by default. |
| **Monitor** | glances | "What moved while I was in the chart?" | A durable, timestamped change log the trader can catch up on, not a 2.5‑second flash. |
| **Prepare** | after hours | "What am I watching tomorrow?" | Same board re‑ranked on after‑hours participation, plus a stable list that survives the overnight boundary. |

### What the current interface encourages

The current page inverts the cost curve. Rejection is *expensive* (you must horizontally scroll or hover a tooltip to read the one sentence that would let you reject), and investigation is *exhausting* (the drawer is 3,615 px of content in a 484 px window — **7.5 screens**, with no section index, no tabs, and no way to jump).

Concretely, at the tested viewport the user's scrollable area is **352 px tall** — the header, KPI strip and filter bar occupy 199 px of 551 px (**36% of the viewport, permanently**). Into that 352 px the page puts, in order: the Focus strip, a checkpoint selector on its own row, the Discovery header and caption, and then the watchlist — which ships **collapsed by default** (`useState(false)` in `MomentumTable.tsx`). So the default first screen of a trading desk, during a live session, is a set of controls above a table you must click to reveal.

The Sweep phase is also structurally broken: **the filter bar does not filter Discovery.** `applyFilters(tickers, filters)` in `DashboardShell.tsx` runs only against the sheet‑derived watchlist. Discovery — the surface the code itself calls "the dominant surface" and "what the market is doing now" — cannot be narrowed at all. In a 50‑mover morning, the trader has a filter bar sitting at the top of the screen that is inert against the only list that matters.

---

## 3. Current‑page hierarchy

### What the page emphasises, measured

| Rank by visual weight | Element | Screen cost | Decision value |
| --- | --- | --- | --- |
| 1 | KPI strip (6 tiles, 17 px numerals) | ~78 px full‑width band, always | Low. Five of six counts are string matches on a spreadsheet cell (tooltip: "Cycle text explicitly reads FRESH / FRONTSIDE"). Nothing is clickable, nothing is a filter. |
| 2 | Filter bar (4 chip groups + search) | ~76 px, always | Low **where it is** — it governs a table two sections below and is inert against Discovery. |
| 3 | Header status cluster | 66 px, always | Mixed. Four health lights are genuinely valuable; `hi-res 6`, `q 0 · a 0`, `msg Ns` are operator telemetry. |
| 4 | Discovery board | Dominant when populated | **Highest.** Correctly the centre of the product. |
| 5 | Focus strip | ~55 px even when empty | High when used; currently an empty band with a hint sentence. |
| 6 | Checkpoint selector | Its own full‑width row | Currently zero — the `<select>` contains exactly one option ("Live") until the first checkpoint of the day. |
| 7 | Analyzed Watchlist | Collapsed by default | High, and hidden. |
| 8 | Desk Events | **Not rendered at all** unless `events.length > 0` | The change surface, absent by default. |

### Misplaced, oversized, undersized, duplicated

- **Oversized:** the KPI strip and the filter bar together consume 154 px (28% of viewport height) of permanently fixed chrome to display six non‑interactive integers and four filters that miss their target.
- **Undersized:** the `Warning` column — the one sentence per row that says how to treat the name — is truncated at 76 characters (`truncate(ticker.warning.current, 76)`), rendered at 11 px in `text-warn/90`, and positioned 1,153 px from the left edge, i.e. off‑screen.
- **Duplicated (counts):** the filtered result count appears twice simultaneously — as a 7th KPI tile ("Matching Filter") *and* as `2 / 6` at the right of the filter bar. Adding the tile also reflows all six existing tiles sideways, so applying a filter makes the whole KPI strip jump.
- **Duplicated (conflict):** for SUGP, a Sheet/Auto disagreement is signalled **nine times** on two screens — a `CONFLICT` badge in the drawer title; three `CONFLICT` marks in the Desk Read conclusion row; `SHEET VS AUTO` + `SOURCES DISAGREE` above the Why‑Now line; `SHEET VS AUTO` + `SOURCES DISAGREE` again above the Structural Warning; and a `CONFLICT` badge heading the full comparison table. One fact, nine renderings.
- **Duplicated (prose):** in `STRUCTURAL INTELLIGENCE — AUTOMATIC`, the sentence "A 1‑for‑5 reverse split became effective August 6, 2026, following a prior 1‑for‑10 consolidation on August 25, 2025. [15322,15317]" is printed twice **within the same card, both instances visible in one 812 px screenshot** — once as `keyWarning`, once as the first element of `structuralWarnings`.
- **Dead:** the `Confirmation` column is `—` for all six rows and reserves 170 px. `text-ink-1` is used in six places (`LevelLadder.tsx:52,101`, `FocusStrip.tsx:103`, `AutomaticIntelligence.tsx:147,288,394`) and **is not a defined token** — verified absent from the compiled stylesheet — so those emphasised values silently render at inherited colour.

---

## 4. Detailed findings

Severity is assessed against the product's own job: *fast, correct comprehension of a live momentum universe.*

| ID | Sev | Area / component | Observed problem | Evidence | User consequence | Recommendation |
| --- | --- | --- | --- | --- | --- | --- |
| **F‑01** | **Critical** | `MomentumTable.tsx` — table wrapper | The sticky column header is inert. `<thead className="sticky top-0">` sits inside `<div className="overflow-x-auto">`; CSS forces that div's `overflow-y` to compute as `auto`, making it the sticky containing block — and it never scrolls vertically, so the header simply scrolls away with the page. | At `main.scrollTop = 300`: `thead.getBoundingClientRect().top = 129` while `main.getBoundingClientRect().top = 199` — the header is 70 px above the visible area. Screenshot: rows visible, zero column labels. | Past row 3 the trader is reading fifteen unlabelled columns of numbers. Column identity must be reconstructed from memory. | Give the table its own vertical scroll container (`max-height` + `overflow-y:auto`) so `position:sticky` has a scrollport, or hoist the horizontal scroll to an ancestor that is not the sticky containing block. Apply the same to Discovery, which has **no** sticky header at all. |
| **F‑02** | **Critical** | `MomentumTable.tsx`, `DiscoveryBoard.tsx` — `<tr>` | Rows are click targets with no keyboard equivalent: `tabindex` is `null`, `role` is `null`, there is no `onKeyDown`. | Verified in‑page: `tr.getAttribute('tabindex') === null`, `tr.getAttribute('role') === null`. The only focusable element in a row is the ☆ button. | The ticker dossier — the product's core investigative artefact — is **unreachable without a mouse**. | Make the ticker cell a `<button>` inside the row (preserves the mouse target via row `onClick`, adds a real keyboard target), or give `<tr>` `tabIndex={0}` + `role="button"` + Enter/Space handling. |
| **F‑03** | **Critical** | `TickerDrawer.tsx` | `role="dialog" aria-modal="true"` with no focus management: focus is not moved into the dialog on open, there is no focus trap, and focus is not restored on close. | After opening the drawer, `document.activeElement` is `BODY`. One `Tab` press moved focus to a ☆ button **behind** the drawer (`activeElement.closest('aside[role=dialog]')` → null). | A keyboard or screen‑reader user is announced a modal and then tabbed into content the modal is covering. `aria-modal="true"` is an inaccurate claim. | On open, focus the drawer heading (`tabIndex={-1}`); trap Tab/Shift+Tab within the `<aside>`; on close, restore focus to the originating row. |
| **F‑04** | **High** | Watchlist layout | 15 columns declaring 1,904 px minimum width in a 1,022 px viewport. Measured `scrollWidth 1608 / clientWidth 1012` — **596 px (37%) hidden**, containing `Warning`, `Confirmation`, `Updated`. Scrolling right also removes the `Ticker` column (not frozen). | Screenshots at `scrollLeft = 0` and `scrollLeft = 596`. | The risk sentence and the freshness stamp are invisible by default; reading them costs the trader the row's identity. | Cut to 8 always‑visible columns (§6), freeze `Pri + Ticker` as a sticky left group, and move the rest into the drawer or a per‑row expander. |
| **F‑05** | **High** | `MomentumTable.tsx:` `Warning` cell | The row's most decision‑relevant field is hard‑truncated to 76 characters and its full text is available **only** via the native `title` tooltip. | `truncate(ticker.warning.current, 76)`; rendered text ends `…fresh compliance news can move, but latent…`. 95 `title` attributes on the page, 71 unique. | The sentence that says *how to treat this stock* requires a 500 ms hover, is unavailable to keyboard and touch, and cannot be scanned across rows. | Replace the free sentence with a compact structured `Risk` chip (e.g. `DIRTY FLOAT 10.9×`, `FLOAT UNKNOWN`, `BROKEN IPO −64%`) plus one clamped line at ≥12 px. Full prose belongs to the drawer, not a tooltip. |
| **F‑06** | **High** | `DashboardShell.tsx` ↔ `FilterBar.tsx` | The filter bar is positioned as global page chrome but `applyFilters` is applied only to the watchlist. Discovery — the primary surface — is unfilterable. | Selecting `CYCLE = BACKSIDE` changed the watchlist to 2 rows; the Discovery section was untouched. | In a busy session the trader cannot narrow the only list that matters. The filters look global and are not. | Make the filters govern Discovery first (and the watchlist as a consequence), or move them physically into the Discovery header so their scope is visually unambiguous. |
| **F‑07** | **High** | `FilterBar.tsx` — filter set | The four filters mirror four spreadsheet enum columns (Priority / Cycle / Structure / Catalyst). None of the ways a momentum trader actually narrows a universe are offered. | No filter for: float size, price band, RVOL threshold, catalyst *freshness*, halted, changed‑since‑last‑checkpoint, or **not yet researched**. | The trader gets filters shaped like the data model and none shaped like the job. | Add, in priority order: `Changed since <checkpoint>`, `Fresh catalyst only`, `Float < N`, `Not yet researched`, `Halted`. Retire `Priority` and `Catalyst A/B/C` as chips (low cardinality, low use) and fold them into a single `Desk view` control. |
| **F‑08** | **High** | `AssessmentHistory.tsx:216` | Sixteen typed change classes are computed per checkpoint and rendered as `changedFields.join(', ')` — raw enums, 11 px, `text-ink-3` (3.84:1), last column of a horizontally scrolling table, only reachable by switching the board away from Live. | `RANK_DETERIORATED, MAJOR_GIVEBACK, STRUCTURE_CHANGED` renders literally. `changedFields` appears in exactly one file. | The product's stated differentiator — *what materially changed* — is the least legible thing in it, and you must stop watching the live market to see it. | Promote change to a first‑class surface: a persistent **Changes** rail on the live board, one line per event, human‑worded (`SUGP · lost $3.30 support · 09:47`), timestamped, filterable, and durable for the session. Map each enum to a sentence; never print the enum. |
| **F‑09** | **High** | `useDashboard.ts` | `CHANGE_HIGHLIGHT_MS = 2500`. A changed row tints for 2.5 s and then leaves no evidence it ever changed. | `globals.css` `.row-changed` animation, 2.4 s. | Change is only perceivable by a trader who happens to be looking at this monitor at that second — precisely the trader this product says it is not built for. | Keep the tint as an *attention* cue, but add a durable per‑row marker (e.g. a `Δ` gutter mark with a tooltip of what changed and when) that persists until the next checkpoint or until acknowledged. |
| **High** ↓ | | | | | | |
| **F‑10** | **High** | `useDashboard.ts` + `/api/dashboard` | The dashboard payload is **376,334 bytes** and is fetched every **4,000 ms**. It carries **128 research dossiers** to render **6 rows**. | Measured: `Object.keys(r.research).length === 128`; `summary.namesTracked === 6`. ≈94 KB/s, ≈340 MB/hour. | JSON parse of ~370 KB on the main thread every 4 s, on a machine already running charts, Level 2 and Time & Sales. It competes with the tools the trader actually trades from. | Return dossiers only for visible/focused tickers; fetch a dossier on drawer open. Add ETag/304 so an unchanged poll costs ~0 bytes. Expected payload: <15 KB steady state. |
| **F‑11** | **Medium** | `MarketStatus.tsx:60` | `discovery.sessionPhase.replace('_', ' ')` replaces only the first underscore. | Header renders **`NEXT DAY_PREP`**, visible in every screenshot taken this session. | A visibly broken label in the persistent header undermines confidence in everything beside it. | `.replace(/_/g, ' ')`, and prefer a label map (`NEXT_DAY_PREP` → "Next‑day prep") over mechanical transformation. |
| **F‑12** | **Medium** | `DiscoveryBoard.tsx` empty state | Offline copy reads: "Market worker is not running. Start it with `npm run market:alpaca` to populate discovery." | Rendered whenever `health.offline`. | Developer instruction in a trader UI — and against the AWS deployment it is *harmful* advice: Alpaca permits one concurrent SIP connection and a second silently displaces the live one. The page tells the user to break production. | Replace with a status statement and no command: "Market feed is not running. Discovery cannot populate until it reconnects." Diagnostics belong on the diagnostics page. |
| **F‑13** | **Medium** | `AutomaticIntelligence.tsx` (6 sites) | Lists of independent findings are flattened with `.join('; ')` into one paragraph: `structuralWarnings`, `cycleWarnings`, `unknowns` (×2), `reverseSplitHistory`, `recentMajorRuns`. | Rendered: "…including a 92.8% peak‑to‑trough retrace after the May run.; The evidence does not show that registered resale…" — note the `.;` seam. | Four separate risks read as one run‑on sentence; none can be scanned, counted, or dismissed individually. | Render arrays as `<ul>`. The data is already a list; only the view flattens it. |
| **F‑14** | **Medium** | `AutomaticIntelligence.tsx` (structure card) | `keyWarning` and `structuralWarnings[0]` are the same sentence, both rendered, both on screen simultaneously. | Screenshot: identical reverse‑split sentence twice inside one bordered card. | The desk appears to be repeating itself, which reads as low quality and costs re‑reading time. | Render `keyWarning` as the headline and slice it out of the list beneath, or drop the separate `keyWarning` line entirely. |
| **F‑15** | **Medium** | Drawer, whole | 3,615 px of content in a 484 px window (**7.5 screens**), seven top‑level sections plus two collapsibles, no index, no tabs, no jump links. Two sections are both titled **Momentum Cycle** (`MOMENTUM CYCLE — AUTOMATIC` and `MOMENTUM CYCLE`) with different content. | Measured `scrollHeight 3615 / clientHeight 484`; `[...d.querySelectorAll('h1,h2,h3,h4')]` returns both titles. | "Investigate" costs minutes instead of seconds, and two identically named sections invite reading the wrong one. | Tabs or a sticky section rail: **Read · Catalyst · Structure · Cycle · Evidence**. Merge the two cycle sections into one with a Sheet/Auto toggle, as the comparison table already does for the three conclusions. |
| **F‑16** | **Medium** | Drawer — Desk Read + conflict sections | One Sheet/Auto disagreement produces nine separate signals across two screens (§3). | Enumerated in §3. | Conflict — which should be a rare, high‑attention event — becomes background noise, and the trader stops reading it. | One conflict indicator in the header, with a jump link to the single reconciliation table. Remove per‑conclusion `CONFLICT` marks and both `SOURCES DISAGREE` chips. |
| **F‑17** | **Medium** | Drawer — machine vocabulary | Raw enums are printed to the trader: `AUTO_SOURCE_GAP`, `INTERPRETATION_DIFFERENCE`, `YELLOW_FRONTSIDE_WARNING`, `SECONDARY_STALE · STALE · CONFIDENCE MEDIUM`, `REGISTERED_RESALE · POSSIBLY_ACTIVE`. Generation time is a raw UTC ISO string with milliseconds (`2026-08-20T20:15:54.082Z`) in a product whose every other timestamp is ET. | Drawer text, `SHEET VS AUTOMATIC` and `EVIDENCE & PROVENANCE` sections. | These describe the engine, not the stock — the exact class of label already rejected once on this product. The UTC stamp forces mental arithmetic to judge staleness. | Map every enum through a label table (the codebase already does this well elsewhere — `INTELLIGENCE_LABEL`, `CYCLE_LABEL`). Render times as `Aug 20, 4:15 PM ET (8h ago)`. |
| **F‑18** | **Medium** | Drawer — inline citations | Body text carries bare bracketed ids (`[15322,15317]`) that are not links; the 11 real SEC links live only in the source list ~3,000 px below. | `d.querySelectorAll('a')` → 11 links, all in `EVIDENCE & PROVENANCE`. | Verifying a specific claim means memorising a five‑digit id and scrolling seven screens. | Make inline ids links to the same EDGAR URLs, and show form type + date on hover (`6‑K · 2026‑08‑04`). |
| **F‑19** | **Medium** | Float presentation | The watchlist shows SUGP `Float 0.70M split-adjusted displayed`; the drawer's structural card shows `FLOAT Unknown`. Both are correct (sheet‑displayed vs automatic‑verified) and the page never reconciles them. | Table cell vs `STRUCTURAL INTELLIGENCE — AUTOMATIC` on the same ticker. | Test 3 ("is the low float misleading?") is answered by two contradictory numbers on two surfaces, and the trader must infer which to trust. | Present float as one field with a qualifier: **`0.70 M` <small>displayed · unverified</small>**, with the reason inline (`38.3 M registered resale not in float`). One number, one caveat, one place. |
| **F‑20** | **Medium** | `MarketSummary.tsx` | Six non‑interactive counters occupy a permanent full‑width band. Five are literal string matches on a spreadsheet cell; the tooltips say so ("Cycle text explicitly reads FRESH / FRONTSIDE", "Rows present on the TODAY tab"). Applying a filter appends a 7th tile and reflows all six. | Component source + observed reflow. | 78 px of prime real estate for numbers that cannot be acted on, plus a layout jump on every filter change. | Collapse to one 24 px line: `6 tracked · 4 warning · 2 backside · 2 dirty float · 0 fresh catalyst`, each segment a filter toggle. Reserve the "Matching filter" slot so nothing reflows. |
| **F‑21** | **Medium** | Contrast | `--color-ink-3: #646d7c` on `--color-panel: #0c0f14` measures **3.84:1** — below WCAG AA (4.5:1) for normal text — and is used for *every* column header, *every* KPI label, timestamps, the ☆ control, and the "Changed since previous" column. `PRI` header at 11 px measures 3.5:1. | Computed in‑page across all rendered text nodes. | The labels that tell you what a number means are the hardest text on the screen to read, in a low‑light room, at a glance. | Lift `ink-3` to ≈`#8792a3` (≈5.2:1) for text; keep the current value only for hairlines and disabled glyphs. |
| **F‑22** | **Medium** | Type scale & density | Eight sizes in use (9/10/11/12/13/14/15/17 px). **130 of 185 text nodes render at 10–11 px.** Row heights measured 64–100 px (mean ≈85 px) because `Float` and `Catalyst` wrap to three lines. | Measured in‑page. | Only ~4 watchlist rows fit the 352 px scroll area — a *dense* table that shows fewer names than a sparse one would. The size ladder carries no meaning. | Three sizes: 11 px labels / 12 px body / 15 px ticker+price. `white-space: nowrap` + ellipsis on `Float` and `Catalyst`. Target 32–36 px rows → 10 rows visible. |
| **F‑23** | **Low** | `FilterBar.tsx` | Chip groups are plain `<button>`s with no group semantics and no pressed state — no `role="radiogroup"`, no `aria-pressed`, no `aria-checked`. Targets measure 21–22 × 23 px (WCAG 2.5.8 minimum is 24 × 24). | Component source + measured rects. | Assistive tech announces eight unrelated buttons with no indication of which is active; the A/B/C chips are below minimum target size. | `role="radiogroup"` + `aria-checked`, and raise chips to 24 px minimum height/width. |
| **F‑24** | **Low** | Focus indication | Focus ring is the UA default: `rgb(100,109,124) auto 0.71px` — a sub‑pixel grey outline on a near‑black surface. | Measured on the focused ☆ button. | Keyboard focus is effectively invisible, compounding F‑02/F‑03. | `:focus-visible { outline: 2px solid var(--color-accent); outline-offset: 2px }`. |
| **F‑25** | **Low** | Dead token | `text-ink-1` used in six places; no `--color-ink-1` exists; verified absent from the compiled stylesheet. | `document.styleSheets` scan → no `.text-ink-1` rule. | Level prices and supply labels intended to be emphasised render at inherited colour. Silent, permanent. | Define `--color-ink-1` (a step above `ink-2`) or replace the six usages with `text-ink`. Add a CI check for undefined theme utilities. |
| **F‑26** | **Low** | `AssessmentSelector` | The `<select>` contains a single option ("Live") for most of the day, occupying a dedicated full‑width row with the note "no checkpoints recorded yet today". | `[...select.options].map(o => o.text)` → `["Live"]`. | A full row of chrome for a control that cannot be used. | Render the selector only when ≥1 checkpoint exists; otherwise show the *next* checkpoint time inline in the Discovery header. The data is already available (`health.assessments.next.scheduledFor`). |
| **F‑27** | **Low** | `DashboardHeader` | The header prints engine internals (`hi-res 6`, `q 0 · a 0`, `msg Ns`, `reconnects N`) beside four legitimate health lights, and shows *that* the assessment scheduler is running but never *when the next checkpoint is* — even though `/api/health` returns `assessments.next.scheduledFor`. | `/api/health` response vs rendered header. | Operator noise crowds out the one scheduling fact a trader would use ("next read at 06:10"). | Move counters to the diagnostics page. Render `Next: 06:10 structural refresh` in their place. |
| **F‑28** | **Low** | `Confirmation` column | `—` for all six rows; reserves 170 px in an already over‑wide table. It is free text from column 24 of the Sheet's TODAY tab. | `lib/data/rows.ts:153`; all rows `—`. | Permanently empty column costs width that the `Warning` column needs. | Remove from the table; render inside the drawer only when non‑empty. |
| **F‑29** | **Low** | Emoji in classification labels | `🟡 FRONTSIDE — WARNING`, `🔴 WEAK / NEGATIVE / DILUTIVE`, `🔥 STRONG` render emoji inside coloured badges that already carry the same colour. | Watchlist `Cycle` cells; `CATALYST_GRADE_LABEL`. | Colour stated three ways (emoji + badge tint + border) while the word does the real work. Emoji metrics vary by platform and disturb baseline alignment. | Drop the emoji. Keep the word and one tint. This *improves* colour‑blind interpretation, since the text already carries the meaning. |

---

## 5. Element disposition

| Element | Disposition | Treatment |
| --- | --- | --- |
| Product title + ET clock | **Keep** | Unchanged. The clock is correct and correctly prominent. |
| Four health lights (Market / Research / Sheet / Assessments) | **Keep** | Genuinely well‑designed — four independent lights is the right call and the code comment explaining why is correct. Add the next‑checkpoint time to the assessments light. |
| `hi-res 6`, `q 0 · a 0`, `msg Ns`, `reconnects N` | **Move** | To the diagnostics page. Not trader information. |
| `NEXT DAY_PREP` phase label | **Revise** | Fix the regex (F‑11) and use a human label map. |
| KPI strip (6 tiles) | **Combine** | Into one 24 px line of clickable filter segments (F‑20). |
| "Matching filter" tile | **Combine** | Merge with the existing `2 / 6` readout; one count, one place, no reflow. |
| Filter bar | **Move + Revise** | Physically into the Discovery header; re‑target at Discovery; replace the four enum filters with workflow filters (F‑06, F‑07). |
| Ticker search | **Keep** | Move into the same relocated bar. |
| Focus strip | **Keep** | Correct concept, correct ownership model. Collapse to a 0 px line when empty rather than a 55 px band with a hint. |
| Checkpoint `View` selector | **Progressively disclose** | Show only when checkpoints exist (F‑26). |
| Discovery board | **Keep** — promote | This is the product. Give it the vertical space freed by the KPI strip and filter bar. |
| Discovery caption ("high rank means abnormal participation…") | **Keep** | Exemplary honest framing. Keep it verbatim. |
| Discovery offline copy (`npm run market:alpaca`) | **Revise** | Remove the command (F‑12). |
| Discovery `Top 12 / 25 / 50` | **Keep** | Good, cheap density control. |
| Desk Events feed | **Revise** — promote to persistent | Currently conditional on `events.length > 0`, so absent by default. Make it a permanent right‑hand rail and merge the checkpoint `changedFields` into it (F‑08). |
| Analyzed Watchlist | **Keep**, but not collapsed‑by‑default | Rename to **Researched names**. Open by default when Discovery is empty (pre‑market, after hours) — that is exactly when it is the only useful list on the page. |
| Watchlist columns `Warning`, `Key Levels` | **Revise** | `Warning` → structured risk chip + one clamped line, moved left into the visible region. `Key Levels` → compact `▲4.00 / ▼3.30` pair. |
| Watchlist column `Confirmation` | **Remove** from table | Drawer only, when non‑empty (F‑28). |
| Watchlist column `Updated` | **Revise** | Currently mixes `2026-08-20 16:00 ET` with prose (`No fresh item through…`) in a 65 px column. Split into a relative age (`16h`) and move the prose to the catalyst field where it belongs. |
| Watchlist column `Src` (`AH`) | **Combine** | Fold into the price cell as a superscript qualifier. |
| Watchlist column `Volume` | **Keep** | |
| Watchlist column `Float` | **Revise** | One number + one qualifier, `nowrap` (F‑19, F‑22). |
| Watchlist column `Catalyst` (`B — LEGITIMATE/SECONDARY`) | **Revise** | Grade letter + freshness, not the full enum phrase. The phrase belongs in the drawer. |
| Drawer — Desk Read strip | **Keep** | The strongest component in the product. Make it sticky within the drawer. |
| Drawer — per‑conclusion `CONFLICT` marks & `SOURCES DISAGREE` chips | **Remove** | One conflict signal, in the header, linked (F‑16). |
| Drawer — Level Ladder | **Keep** | Clear and well‑proportioned. |
| Drawer — `SHEET VS AUTOMATIC` table | **Keep**, reworded | Excellent artefact. Replace `AUTO_SOURCE_GAP` / `INTERPRETATION_DIFFERENCE` with the plain sentences already computed below the table. |
| Drawer — `WHY IT IS MOVING` | **Keep** — promote | Should be the second thing in the drawer, directly under the Desk Read. |
| Drawer — `PLAUSIBLY EXPLAINS MOVE: no` | **Keep** — promote hard | This is the single most valuable field in the dossier and it is currently a plain lowercase word. Make it a headline verdict. |
| Drawer — `STRUCTURAL INTELLIGENCE` warnings/unresolved lists | **Revise** | Render as lists; de‑duplicate `keyWarning` (F‑13, F‑14). |
| Drawer — two `MOMENTUM CYCLE` sections | **Combine** | One section, Sheet/Auto toggle (F‑15). |
| Drawer — `EVIDENCE & PROVENANCE` | **Keep** | Well done. Link the inline citations to it (F‑18). |
| Drawer — `SHEET RESEARCH (VERBATIM)`, `LIVE MARKET TELEMETRY` | **Keep collapsed** | Correct call already. |
| Normalization notices footer | **Keep collapsed** | Correct. |
| Row change tint (2.5 s) | **Revise** | Keep as attention cue; add a durable marker (F‑09). |
| `text-ink-1` usages | **Remove** | Dead token (F‑25). |

---

## 6. Recommended information architecture

### Zones

**Global header — one row, 44 px, sticky**
Product name · ET clock + session phase · four health lights (Market / Research / Sheet / Assessments, with `Next: 06:10` on the last) · Refresh. Nothing else. Engine counters move to diagnostics.

**Market / session summary — one row, 24 px, sticky**
`6 tracked · 4 warning · 2 backside · 2 dirty float · 0 fresh catalyst · 3 changed since 09:25`. Each segment is a filter toggle. Slots are fixed‑width so nothing reflows.

**Primary‑focus area — Focus strip, 0 px when empty**
Up to 6 user‑pinned cards. Unchanged in concept.

**Main momentum table — Discovery, the dominant surface**
Owns the freed vertical space. Filters live in its header. Sticky column header. `Top 12/25/50` retained.

**Persistent ticker row — 8 columns, ~34 px, `Rank + Ticker` frozen left**

| # | Column | Width | Why it is here |
| --- | --- | --- | --- |
| 1 | **Rank** (+ `Δ` rank move) | 56 | The board's own ordering and whether it is improving. |
| 2 | **Ticker** (+ ☆, `stale`, `retained`) | 96 | Identity. Frozen. |
| 3 | **Price / %** | 104 | Two values, one cell, session qualifier as superscript. |
| 4 | **RVOL** (+ `low` confidence mark) | 72 | Why it ranks. |
| 5 | **Why** — catalyst grade + freshness | 150 | `B · 16h` / `A · 12m` / `none`. Answers "why is it moving" without a drawer. |
| 6 | **Risk** — structured chip | 150 | `DIRTY 10.9×` / `FLOAT UNKNOWN` / `BROKEN IPO −64%`. Replaces the truncated sentence. |
| 7 | **Cycle** | 130 | One word + tint. |
| 8 | **Levels** — `▲4.00 · ▼3.30` | 130 | Nearest either side. |
| — | *(right gutter)* | 20 | `Δ` marker when the row changed since the last checkpoint. |

Total ≈ 908 px — fits the tested viewport with room to spare, and leaves headroom for a `Halt` / `Spread` pair on wider monitors.

**Expanded ticker drawer — five tabs, Desk Read sticky above them**

1. **Read** — Desk Read strip, `Plausibly explains move`, one conflict line if any, nearest levels.
2. **Catalyst** — headline, why traders may care, event time + freshness, source, unresolved list.
3. **Structure** — float (one number + qualifier), supply ledger, warnings list, reverse splits, unresolved list.
4. **Cycle** — one merged section, Sheet/Auto toggle, recent runs as a list, cycle warnings as a list.
5. **Evidence** — Sheet‑vs‑Auto reconciliation, generation metadata (ET), SEC source list, telemetry, verbatim sheet research.

**Live‑change / event stream — persistent right rail, ~320 px, collapsible**
Merges `DeskEvent`s with checkpoint `changedFields`, human‑worded, ET‑timestamped, newest first, `Relevant | All` retained, clicking a line opens that dossier. This is where the product's differentiator finally becomes visible.

**Secondary research / evidence view**
The existing `/review/<token>/diagnostics` page, plus the operator counters relocated from the header. Not part of the trading loop.

### Layout

```
┌──────────────────────────────────────────────────────────┬──────────────┐
│ HEADER  44px  sticky                                     │              │
├──────────────────────────────────────────────────────────┤   CHANGES    │
│ SUMMARY LINE  24px  sticky  (segments are filters)       │    RAIL      │
├──────────────────────────────────────────────────────────┤   320px      │
│ FOCUS  0–96px  (0 when empty)                            │  collapsible │
├──────────────────────────────────────────────────────────┤              │
│ DISCOVERY  header w/ filters · sticky thead · flex-1     │  09:47 SUGP  │
│   8 columns, 34px rows, Rank+Ticker frozen               │  lost 3.30   │
│   …                                                      │  09:41 HOWL  │
├──────────────────────────────────────────────────────────┤  entered #4  │
│ RESEARCHED NAMES  collapsed when Discovery is populated  │              │
└──────────────────────────────────────────────────────────┴──────────────┘
```

---

## 7. Recommended screen design

**Grid.** Single page, no page scroll. `header / summary / focus / content` rows; content is a two‑column grid: Discovery (`1fr`) + Changes rail (`320px`, collapsible to `32px`). Fixed chrome target: **≤68 px** (down from 199), returning ~130 px — roughly four more visible rows — to the board.

**Density.** 34 px rows, 12 px body, 15 px ticker/price, `tabular-nums` on every numeric column (already correct via `.num`). Rows never wrap: overflow is ellipsis + drawer. Target 10+ rows visible at 1,022 px, 20+ at 1,920 px.

**Sticky behaviour.** Header and summary stick to the window. Discovery's `<thead>` sticks to *its own* scrollport (fixing F‑01). `Rank + Ticker` freeze horizontally as a left group with a 1 px `--color-line-2` seam and a subtle shadow when `scrollLeft > 0`.

**Spacing and grouping.** Three visual groups per row, separated by 12 px gaps rather than borders: *identity* (rank, ticker), *market* (price, %, RVOL), *intelligence* (why, risk, cycle, levels). Vertical rules only between groups. This lets the eye run down a group without reading across.

**Interaction model.** Hover tints the row. Click anywhere opens the drawer. `↑/↓` moves a row cursor, `Enter` opens, `Esc` closes and restores focus, `f` toggles Focus on the cursored row, `/` focuses search. The drawer is 720 px, leaving 300 px of board visible so the trader keeps context; `j/k` moves to the next/previous ticker without closing it.

**Colour discipline.** At most **one** saturated element per row. Precedence: `HALTED` (red) > cycle `BACKSIDE` (red) > risk chip (amber) > everything else neutral. If cycle is red, the risk chip renders as neutral text with a red left border rather than a full amber badge. This alone removes most of the current wall of colour.

### State‑specific designs

**Normal market (Discovery populated).**
As above. Researched‑names table collapsed; its header shows `6 researched · 2 not in Discovery` so the trader knows what they are not seeing.

**Sparse / empty (pre‑04:00, weekend, quiet session).**
Discovery collapses to a single line: `No session in progress · populates 04:00 ET · next checkpoint 06:10`. **Researched names auto‑expands and takes the space** — after hours it is the only useful list, and it should not require a click. The changes rail shows the day's history rather than an empty box.

**Research pending.**
A ticker with a live research job renders its `Why` and `Risk` cells as a labelled placeholder — `analyzing…` in `ink-2` with a 2 px indeterminate underline — never as `—`, and never as `UNKNOWN`. The row stays fully ranked and tradeable; only the intelligence cells are pending. The five `ResearchDisplayStatus` in‑flight states already exist in `lib/research/view.ts`; use them.

**Stale data.**
Three independent staleness axes, each shown where it applies, never as one global banner: *price* (`stale` chip on the ticker, already correct), *research* (age on the `Why` cell: `B · 3d`), *sheet* (the existing header light). When market age exceeds `staleSeconds`, price and % render in `ink-2` rather than green/red — a stale +34.8% should not be as loud as a live one.

**High activity (many simultaneous movers).**
`Top 50` becomes usable because rows are 34 px. The changes rail carries the burst; it is the surface that scales, not the table. Add a `New this checkpoint` filter segment so the trader can reduce 50 rows to the 6 that just appeared. Rank‑move arrows (`Δ Rank`, already implemented) become the primary scanning cue.

---

## 8. Visual and interaction system

**Typography — three sizes, two families.**

| Role | Size / weight | Family |
| --- | --- | --- |
| Column + field labels | 11 px / 600 / `0.08em`, uppercase | Geist |
| Body, badges, prose | 12 px / 400–600 | Geist |
| Ticker, price, primary numerals | 15 px / 700 | Geist Mono, `tabular-nums` |

Retire 9, 10, 13, 14 and 17 px. Eight sizes carry no more meaning than three and cost alignment everywhere.

**Colour — semantic, rationed.**

| Token | Value | Means, and only this |
| --- | --- | --- |
| `pos` | `#2fc46f` | Fresh/frontside, positive change, clean structure |
| `warn` | `#e8ac33` | Caution requiring judgement |
| `neg` | `#f4574e` | Backside, dirty float, halted |
| `accent` | `#4d93ff` | Interactive / selected / user‑owned (Focus, filters, rank) |
| `ink` | `#e9edf3` | Primary text |
| `ink-2` | `#97a1b0` | Secondary text |
| `ink-3` | **`#8792a3`** *(raised from `#646d7c`)* | Labels, timestamps — must reach 4.5:1 |
| `line`, `line-2` | unchanged | Structure only, never text |

**Rule: one saturated element per row, by the precedence in §7.** Everything else is `ink`/`ink-2` with a coloured 2 px left border where a state must still be legible. A trader should be able to say "three red things on this screen" without counting.

**Badges — three shapes, not one.**
- *Classification* (Cycle, Structure): filled tint + border, uppercase, ≤18 chars. Current `StatusBadge` is right.
- *Qualifier* (`stale`, `low`, `retained`, `auto`): no border, no fill, `ink-3`, lowercase. Distinguishes "this is a footnote" from "this is a verdict" — currently both render as badges.
- *Risk chip* (new): monospace value + short label (`DIRTY 10.9×`), left border in `neg`/`warn`, body in `ink`. Comparable down a column, which prose never is.

**Where text must replace colour or icons.**
- Drop `🟡🔴🟢🔥` from classification labels (F‑29) — the word already carries it, and emoji metrics vary by platform.
- Every colour‑coded state must carry its word: `BACKSIDE`, not a red dot. Already true; keep it true.
- Change direction gets `▲/▼` **and** a sign, never colour alone.
- The 71 unique `title` tooltips: promote the ~12 that define a metric into a visible `?` affordance with a click‑to‑open popover (discoverable, keyboard‑reachable, touch‑usable); keep the rest as tooltips but never as the *only* route to required content (F‑05).

**Freshness — one scale, everywhere.**
`live` (pulsing dot) · `12m` · `3h` · `2d` · `unknown`. Absolute ET time on hover. Never a raw UTC ISO string.

**Interactive states.**
`hover` → `bg-panel-2`. `selected` → `bg-accent/10` + 2 px accent left border. `:focus-visible` → **2 px solid accent, 2 px offset** (F‑24). `pressed` chips → `aria-checked` + accent fill.

**Motion.** Two only: the 2.6 s live dot pulse (keep) and the 2.4 s row‑change tint (keep as a cue, paired with a durable marker). Both already respect `prefers-reduced-motion`. Add nothing else.

---

## 9. Prioritized redesign plan

### Immediate corrections — high impact, no re‑architecture

| # | Change | Benefit | Complexity |
| --- | --- | --- | --- |
| 1 | Fix the sticky `<thead>` (F‑01); add a sticky header to Discovery | Columns stay identified past row 3 | **S** — one wrapper change |
| 2 | Keyboard access to rows + drawer focus management (F‑02, F‑03) + visible focus ring (F‑24) | The dossier becomes reachable at all without a mouse | **S–M** |
| 3 | Cut the watchlist to 8 columns; freeze `Pri + Ticker`; drop `Confirmation` (F‑04, F‑28) | Removes horizontal scrolling; the risk column becomes visible | **M** |
| 4 | `Warning` prose → structured risk chip + one clamped line (F‑05) | Rejection becomes a glance instead of a hover | **M** |
| 5 | Fix `NEXT DAY_PREP` (F‑11); remove `npm run market:alpaca` from the UI (F‑12) | Removes a visible defect and a dangerous instruction | **XS** |
| 6 | Render `.join('; ')` arrays as lists; de‑duplicate `keyWarning` (F‑13, F‑14) | Drawer prose becomes scannable | **S** |
| 7 | Raise `ink-3` to ≈`#8792a3`; collapse the type scale to three sizes; `nowrap` on `Float`/`Catalyst` (F‑21, F‑22) | AA compliance; ~10 rows visible instead of ~4 | **S** |
| 8 | Trim dashboard payload to visible tickers + ETag (F‑10) | ~370 KB → <15 KB per poll; frees CPU for the trader's charts | **M** |
| 9 | Collapse the KPI strip to one clickable line; hide the checkpoint selector until it has options (F‑20, F‑26) | ~130 px returned to the board; no reflow on filter | **S** |
| 10 | Move engine counters to diagnostics; show `Next: 06:10` instead (F‑27) | Header becomes trader‑facing | **XS** |
| 11 | Fix or remove `text-ink-1` (F‑25) | Removes six silently broken styles | **XS** |

### Structural redesign — hierarchy, navigation, component responsibility

| # | Change | Benefit | Complexity |
| --- | --- | --- | --- |
| 12 | Persistent **Changes rail**: merge `DeskEvent`s with checkpoint `changedFields`, human‑worded, durable (F‑08, F‑09) | The product's differentiator becomes visible; "what changed" answerable at any moment | **L** |
| 13 | Re‑target filters at Discovery and move them into its header; replace enum filters with workflow filters (F‑06, F‑07) | Filtering finally acts on the list that matters | **M** |
| 14 | Tab the drawer (Read / Catalyst / Structure / Cycle / Evidence); sticky Desk Read; merge the two Cycle sections (F‑15) | 7.5 screens → one screen + four tabs | **L** |
| 15 | Single conflict signal with a jump link (F‑16) | Conflict regains its alarm value | **M** |
| 16 | Human labels for every remaining enum; ET timestamps throughout (F‑17) | Removes engine language from the trader's view | **M** |
| 17 | Unified float presentation: one number + one qualifier + one reason (F‑19) | Test 3 answerable in the row | **M** |
| 18 | Colour precedence rule — one saturated element per row (§8) | Colour becomes signal again | **M** |
| 19 | Auto‑expand the researched table when Discovery is empty; two‑column shell (§7) | The after‑hours screen stops being empty | **M** |

### Later enhancements — after the core loop is proven

| # | Change | Benefit | Complexity |
| --- | --- | --- | --- |
| 20 | Full keyboard model (`↑↓`, `Enter`, `Esc`, `f`, `/`, `j/k` in drawer) | Hands stay on the keyboard during a session | **M** |
| 21 | Checkpoint **diff** view (`09:25 → 10:00`) rather than two separate snapshots | Answers "what changed" for a period, not just an instant | **L** |
| 22 | Inline citations become EDGAR links with form + date on hover (F‑18) | Verification in one click | **S** |
| 23 | Definition popovers for the ~12 metric terms, replacing hover‑only tooltips | Discoverable, keyboard‑ and touch‑accessible | **M** |
| 24 | Density toggle (Compact / Comfortable) persisted per user | Serves both a 1,022 px laptop and a 1,920 px desk | **S** |
| 25 | Server‑push (SSE) instead of 4 s/1 s polling | Lower latency, lower cost, cleaner change semantics | **L** |
| 26 | `aria-live="polite"` announcements for halts and rank entries | Change is perceivable without watching | **S** |

---

## 10. Acceptance criteria

Measured with the desk owner on a live session, at the viewport he actually uses (1,022 × 551 CSS px), no training.

**Speed**

| Task | Now (observed / estimated) | Target |
| --- | --- | --- |
| Name the three tickers that most deserve attention | Not measurable at 00:28 (Discovery empty); with a populated board, ≥2 horizontal scrolls | **≤5 s, no scrolling** |
| State why the #1 name is moving | Requires opening the drawer and scrolling ~2 screens | **≤5 s from the row alone** |
| State whether its float is misleading | Two contradictory numbers on two surfaces (F‑19) | **≤10 s, one number + one reason, no contradiction** |
| Compare structural risk of two names | Two drawer opens, ~15 screens of scrolling | **≤15 s, side by side in the table** |
| Say what changed on a ticker since the last checkpoint | Dropdown → snapshot → horizontal scroll → read raw enums | **≤5 s from the changes rail, in a sentence** |
| Find the evidence for a `DIRTY FLOAT` call | Scroll 7 screens, memorise a 5‑digit id, match it in the source list | **≤10 s, one click from the claim to the filing** |

**Comprehension**

- 100% of visible states are distinguishable without colour (verified in greyscale and with a deuteranopia simulator).
- `not yet analyzed` / `analysis pending` / `analysed, nothing found` / `analysed, problem found` / `analysis failed` are told apart from the row alone, with no tooltip, at 100% accuracy.
- A stale price is never rendered with the same visual weight as a live one.
- No `SCREAMING_SNAKE` token, no raw UTC ISO string, and no shell command appears anywhere in the trader‑facing UI. *(Automatable as a test.)*

**Efficiency**

- ≥10 Discovery rows visible at 1,022 px; ≥20 at 1,920 px.
- Zero horizontal scrolling required to read any always‑visible column at 1,022 px.
- Fixed chrome ≤68 px (from 199 px).
- No content is reachable *only* by hover.
- Steady‑state dashboard payload <15 KB per poll (from 376 KB).

**Trust**

- Every classification shown in a row can be traced to a source in ≤2 clicks.
- No two surfaces show a different value for the same field at the same moment without an explicit reconciliation.
- Every timestamp is ET and carries a relative age.

**Accessibility**

- All text ≥4.5:1; all UI targets ≥24 × 24 px.
- Full keyboard operation of ranking, selection, drawer and filters; visible 2 px focus ring throughout.
- `axe` clean on: dialog focus management, control names, contrast.

---

## 11. Decisions requiring product input

Only questions the interface, repository and existing requirements genuinely cannot answer.

1. **Is the Google Sheet a permanent input or a migration artefact?** The Sheet/Auto duality is the single largest source of visual complexity in the product (the conflict apparatus, the two `Momentum Cycle` sections, the `SHEET RESEARCH (VERBATIM)` block, the `Confirmation` column). If human review is permanent, that machinery should be designed properly as a first‑class *review* workflow. If the Sheet is on its way out, most of it should be simplified now rather than polished.

2. **Should `Confirmation` be built or removed?** It is a free‑text Sheet column, empty on every current row, and the audit brief treats "Live Confirmation" as a core concept. Either it becomes a real derived signal with a definition, or the column and the concept should both go.

3. **Which of the briefed‑but‑unbuilt concepts are actually wanted?** Chop Risk, Flush Risk, Overhang Absorption and Effective Float Turnover were deliberately not built. The current surfaces (`Float Turn` = *displayed* float turnover; `flushFromHighPct` = a sheet‑reported number) are honest partial substitutes. Building any of them changes the row design, so the answer is needed before §6's column set is finalised.

4. **What is the real target resolution?** The tables are authored for ≈1,900 px; the owner's browser is 1,022 px. The §6 column set assumes 1,022 px is the floor and wider is a bonus. If the production setup is a 1,920 px monitor with this desk on a dedicated panel, the column budget can grow by roughly four columns.

5. **Should the desk ever rank by anything other than Daily RVOL / AH Participation?** Sorting exists on the watchlist but Discovery's order is fixed. Allowing a trader to re‑rank Discovery (by float, by catalyst freshness, by rank move) is cheap to build but is a real product decision — the current fixed ranking is a deliberate opinion, and the caption defends it.

6. **Does the 09:25 pre‑open assessment ever get a validated score?** It is captured and flagged `EXPERIMENTAL`, and the UI says so. If it stays experimental indefinitely, it should probably not occupy a checkpoint slot in the trader‑facing selector at all.

---

## Recommended experience, in one sentence

> **When the trader opens the Live Desk, they should immediately see** a single ranked board of the names the market is currently paying abnormal attention to — each row carrying, without a scroll or a hover, why it is ranked, whether the reason is a real catalyst, how dangerous the share structure is, where it sits in its cycle, and whether anything about it changed since the last checkpoint — **within five seconds they should understand** which two or three names deserve their attention and, just as importantly, why the other nine can be dismissed — **and when they investigate a ticker, they should be able to confirm** the catalyst, its freshness and its source, the true tradable supply behind an apparently small float, and the specific filing each of those claims rests on, **without** scrolling seven screens, hovering to read a truncated sentence, reconciling two different float numbers, decoding an engine enum, or leaving the live board to find out what changed.
