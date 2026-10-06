# Removing the Google Sheet: the plan

*Integration, 2026-10-03. Drawn up on his ruling, typed to Integration: "we need to deal with this sheet once and for all.
the google sheet needs to be removed as part of this system. period. draw it up." Every code claim below was read in the
tree at `main` on 2026-10-03 (file:line given); the full inventory is the appendix. Nothing here is built yet.*

---

## The short version

**What the Sheet is.** Your ChatGPT scheduled task, the after-hours momentum recap, writes a Google Sheet every evening
(prompt: `docs/After-Hours Momentum Recap.md`). The desk reads two of its tabs, TODAY and RESEARCH, 64 fields in all
(`lib/data/providers/googleSheets.ts:25-26`, `lib/data/rows.ts:33-102`). The desk never reads ARCHIVE, OUTCOMES,
PATTERNS or the dated tabs.

**What the Sheet still does for the desk, in five jobs:**

| Job | What it does today | Replacement |
| --- | --- | --- |
| 1. The float number | The ONLY float on the board (float column, sort, turnover, float check, risk chip) | **Your decision 1** |
| 2. The second table and Priority | The researched watchlist table is exactly the Sheet's TODAY rows; the Priority column, its sort and the Priority filter (which also filters the main board) exist only because of it | **Your decision 2** |
| 3. Which names the market worker tracks closely | Sheet tickers get first claim on the 250 high-resolution trade slots and are seeded at start-up (`engine.ts:2141-2156`, `runtime.ts:945`) | Your Focus list plus the desk's own after-hours movers |
| 4. Research text the desk already has its own version of | Catalyst grade and headline, cycle, structure flags, warnings, country, company, split history, supply filings | The desk's research write-ups, which already hold each of these (appendix C) |
| 5. Small extras | Notes, Analyst Notes, Confirmation, Key Levels, Daily Support, the "Sheet sync" chip | Dropped (no desk source for Notes, Confirmation or Daily Support); levels already come from the desk's own resistance and session levels |

**The one trap, fixed first.** If the Sheet's keys are simply removed today, the desk does not go blank: it silently
switches to made-up demo rows (`lib/data/index.ts:65`), and the market worker would then track those fake tickers. Step 1
below removes that fallback before anything else changes.

**What you do, at the end only:** export a copy of the Sheet (some of its research history cannot be regenerated), switch
off the ChatGPT recap task, and delete the Sheet's Google service-account key. Nothing public changes: the site, privacy
policy and terms never mention the Sheet (Web checked).

---

## Your decisions

**RULED 2026-10-03T17:20:45Z (typed to Integration), verbatim:** *"we need to reproduce what the sheet does in the app.
its that simple. the sheet is nothing more than a repository of model outputs. its not a holy grail."*

So both decisions are answered by one rule: **the desk produces, itself, every output the desk reads from the Sheet today.**
The spec is the recap prompt (`docs/After-Hours Momentum Recap.md`) and the field list is appendix C. Float comes from the
desk's own research, sourced and dated as the recap prompt requires (verified float, Float Quality, Overhang / Float; never
fabricated). ~~The second table and the Priority grades stay, produced by the desk.~~ (My reading, superseded 2026-10-04:
he ruled the second table removed and Priority computed; see below.) Jobs 1, 2 and 5 below are no longer
"dropped" or "replaced by a proxy": they are reproduced. Options (a) to (c) below are kept, struck, as the record of what
was considered.

**RULED 2026-10-04, on Research's proposal (`docs/research/sheet-reproduction/proposal-2026-10-04.md`), typed to
Integration:**
- 23:49:48Z, verbatim: *"1, take 10 stocks and do both a and b and report results. 2, a. 3, we need to keep that for
  analysis on how we did. it's purpose is analysis on the desks performance."* So: **float** is decided after a 10-stock
  head-to-head of the SEC upper bound and a model-researched float; **Priority** is computed from the recap prompt's five
  criteria (rubric approved by him once); **the history tabs are kept**, rebuilt as the desk's record of its own calls and
  their outcomes, for analysis of the desk's performance.
- 23:53:44Z, on the "Researched Names" table (the second table), verbatim: *"remove it"*. **This replaces the 2026-10-03
  reading above that the second table stays.** Priority, which he kept, needs a home on the main board (Design proposes).
- 2026-10-05T00:00:00.915Z, verbatim: *"badge on the ticker - it needs a tooltip"*. Priority is a badge in the main
  board's Ticker cell, with a tooltip.
- 2026-10-05T00:40:36.034Z, on the float, after the 10-stock comparison
  (`docs/research/float-comparison/result-2026-10-05.md`), verbatim: *"a, go with the SEC calculation. we need to teach
  this in the tool. actually it probably deserves it's own page on the site, the explanation of this. so we'll go with SEC,
  with a tooltip with brief helpful explanation, and a link if possible leading to a page "are float quotes real?" and a
  well written explanation of the proecss and our method."* So: **float = the SEC upper bound, insiders only** (the safe
  half; the comparison showed the large-holder half can go below zero), shown as an upper bound with source and date; **a
  tooltip** on the float cell with a brief explanation; **a public page "Are float quotes real?"** explaining how floats
  are produced anywhere and the desk's method, linked from the tooltip.
- 2026-10-05T00:43:25.901Z, on whether the Float column shows only while sorted by float (today) or always, verbatim:
  *"always show it, it's key."* The Float column is always on the main board.
- 2026-10-05T16:01:43.807Z, typed to Integration after reading the float cell and page draft
  (`docs/marketing/float-page-draft.md` v11, Commercial-passed), verbatim: *"float wording is fine but i want to see the
  webpage."* The float WORDING (cell faces "≤ X" / "Unknown" / "Cannot verify" / "Not computed", popovers, legend, the page
  text) is approved; Web renders a private preview of the page for him. Not live: the validation sample, his strictness
  choice on Research's table (max age 45 days until then) and the one-release rule still gate it.
- 2026-10-05T21:22:37.844Z, typed to Integration (transcript 125cfd6b, human origin), verbatim: *"90 days, approve the
  badge draft, yes hand off"*. (1) **Float maximum count age = 90 days**, with the filed count's date on the cell face
  (Commercial 5i, `b757236d`: six sentences change, Marketing rewrites, Design fits the 102 px column). Put to him with the
  untested risk stated (a longer window for an unflagged issuance). Validation PASSED on the fresh draw (`af660d29`); the
  column still reads "Cannot verify" for most names until the split proof is loosened (Research's replays R1 to R3, not a
  rule yet). (2) **Priority rubric APPROVED as drafted** (`docs/research/priority-rubric/rubric-draft-2026-10-05.md` at
  `3ca325bd`: Structure = the cycle; A = all five readable with Structure, Catalyst, Volume, Liquidity STRONG; the section 1
  thresholds; catalyst KIND only, no age cap; AVOID on Liquidity OR Supply RISK alone; rule 0 NOT_YET). Words: Marketing
  v3 `5855bf61` + `a9ea26a4`, Commercial-passed (`067dae18`). (3) Integration hand-off.
- 2026-10-05T21:50:53.964Z, typed to Integration (27th seat, transcript 1b01d57c, human origin), verbatim: *"1, should
  absolutely see how the names traded against the grades. 2, no retirement yet."* Clause 1 answers the looser-A question
  (Research `85041ad8`: approved rule A 5 of 719 rows, looser rule 45; neither tested against outcomes at that time; since tested, see below). **The approved
  rubric stands; the rule was not switched.** Research runs a pre-registered outcome test of the grades, both rules,
  against how the names traded after each checkpoint, grades as of the checkpoint. Clause 2 is the old Integration chat
  (`local_2102878a`): it is not retired yet.
  **Result of the test (Research `adae1e89`, report `9fd9e06c`):** on 701 usable rows the grades did not separate the next
  trading day's high (04:00 through the close) for either rule; the test sees 10 to 30 point separations only; the approved
  rule's A (5 rows) and C (9) could not be tested. **Legend (Commercial `c26daa80`, claims read 6b):** the sentence "not
  tested against outcomes" is deleted with nothing in its place; no result goes in the legend.
- 2026-10-05T22:04:14.942Z, typed to Integration (27th seat, transcript 1b01d57c, human origin), verbatim: *"yes, keep
  building the badge as approved"*, answering whether the badge continues after the outcome test. **The badge is built as
  approved** (rubric at `3ca325bd`, Research's `priorityGrade`, field contract `2c325f05`, legend per Commercial 6b).
- 2026-10-05T22:38:04.297Z, typed to Integration (28th seat, transcript d947056e, his turn), verbatim: *"B, with the
  not-live label, but between session greater promiunence shoukd be guven to the session report"*, answering what the
  main area shows once the Researched Names table is removed and no live session is on (22:00 to 04:00 ET and
  non-trading days; 20:00 to 22:00 already shows the frozen after-hours board, Design from code, verified by
  Integration). So: **option B**, the main area opens on the latest checkpoint's frozen board, labelled as frozen and not
  live, with Back to live; **and between sessions the session report (the briefing line and the report panel,
  `components/SessionReports.tsx`) is given more prominence than it has today.** How it is made more prominent is
  layout (Design proposes, Integration checks against this ruling). *Integration's reading, not his words: "between
  session" is the same window as B.* Ships only with the grade store and reader (the badge reads them).
- 2026-10-06T00:22:29.450Z, typed to Integration (28th seat, transcript d947056e, his turn), verbatim: *"yes, build
  both"*, answering whether the desk should produce the Sheet's **Warning Shot** (contract row 20: one decision-useful
  sentence per name, evening and PM) and the **morning Confirmation** (row 22: whether the evening catalyst and grade
  still stand at the morning checkpoint) itself, so the ChatGPT recap task can be fully retired. Put to him with Research's
  estimate of about $2 to $10 a month for the Warning Shot, stated as unchecked. Owner Research (design and build), Marketing
  (words), Commercial (reads the Warning Shot's instructions), Design (surfaces). Both live before step 4.

### ~~Decision 1: what replaces the Sheet's float?~~ (ruled above)

The desk has never had a float of its own (`lib/research/float.ts:4-9`). The Sheet's float comes from the ChatGPT task's
web research, with no stated method.

- **(a) Show the filed share count instead, labelled as such (recommended).** From the company's own SEC filings, with
  completed offerings added back in (Research built and checked this today for the short-interest work: the research
  write-ups' count matched SEC's figure 193 times out of 193). It is not float: it includes insiders' shares, so it reads
  higher than float, and the label says so. No vendor, no new cost. ~~**Measured (Research, run 3, your top-12 names,
  Aug 18 to Sep 15, 422 name-dates):** 82% have a filed share count; it is at most 45 days old for 34%, at most 90 days
  for 46%, at most 120 days for 50%. Foreign companies: 167 of 180 have one, but only 47 are at most 120 days old.~~
  **Corrected 2026-10-05:** the 34 / 46 / 50 figures did not reproduce from the committed raw and their derivation is
  unknown. Re-derived by Research (`docs/research/float-contract/age-rederive-out-2026-10-05.json`, 3fcb1f2a, 422
  short-interest pairs, ages as of each settlement date): no filed count 74 (17.5%); count at most 45 days old 171
  (40.5% of all 422), at most 90 days 204 (48.3%), at most 120 days 218 (51.7%). Foreign companies: 167 of 180 have one;
  33 are at most 45 days old, 51 at most 120. 66 of the 171 are counts dated on or after the settlement, which a board
  checkpoint cannot see, so the 45-day share is probably a little high for the board. So (a) covers most names, often
  with an old date that must be shown beside it.
- **(b) Buy float data from a licensed vendor.** Commercial prices it and checks whether it may be shown to customers. A
  spend, so yours. Can run alongside (a).
- **(c) Build the desk's own float from insider and large-holder filings.** A large build the desk deliberately has not
  started: getting it wrong understates float, which is the dangerous direction for a low-float read.

On (a), Research and Design build it. On (b), Commercial prices it first and brings it back to you. (a) and (b) can both
happen.

### ~~Decision 2: what happens to the second table and the Priority grades?~~ (ruled above: kept, desk-produced)

- **(a) Remove the table and the Priority column (recommended).** The main board already ranks names by the desk's own
  measure, including after hours, and your Focus list is yours to set. The A/B/C/AVOID grades go with the Sheet; that also
  fits the site's own statement that nothing it displays is a recommendation.
- **(b) Keep a second table of names the desk has researched, without Priority grades.** More build, and it overlaps the
  main board.

---

## The sequence (each build gated and replayed; nothing runs on your PC without your yes)

1. **No fake data in production.** A missing Sheet means an explicit empty state, never demo rows (`lib/data/index.ts`).
   Ships in an ordinary release.
2. **Measure the research without the Sheet.** Research reruns a sample of research write-ups with the Sheet's input
   switched off (the switch already exists: `RESEARCH_OMIT_SHEET_PRIOR`, `lib/research/config.ts:209`) and reports what
   changes. No build.
   **DONE 2026-10-03** (`docs/research/sheet-removal/omit-prior-result-2026-10-03.md`, $1.68): the Sheet only reaches
   the research for that day's handful of TODAY names (4 that day). On the 3 that could be tested, no field changed
   beyond the model's own run-to-run variation. With 3 names that is a weak test, not proof of no effect.
3. **Build the replacements** (one release): the board and drawer read the desk's own research first for job 4; the
   float decision for job 1; the table decision for job 2; the "Sheet sync" chip and Sheet sections removed from the
   drawer, review diagnostics and the AI tools.
4. **The market worker stops reading the Sheet's tickers** and takes your Focus list plus the desk's own after-hours
   movers instead (job 3). This needs a **market-worker restart, which is yours** to approve at the time. In the same
   release, the board's data feed (`/api/dashboard`, which the board itself keeps using) starts requiring sign-in like
   the rest of the desk's data, since the worker no longer reads it (Web; callers re-checked first).
5. **Switch the Sheet off on the server.** Ops removes `GOOGLE_SHEET_ID`, `GOOGLE_SERVICE_ACCOUNT_EMAIL`,
   `GOOGLE_PRIVATE_KEY` and `MOINTEL_DASHBOARD_URL` from the server settings (`deploy/aws/sync-env.sh`), after you remove
   the Google keys from `.env.local`.
6. **You:** export the Sheet, switch off the ChatGPT recap, delete the service-account key in Google Cloud.
7. **Delete the Sheet code and its tests** (provider, parser, Sheet-only tests, the `google-auth-library` package if
   nothing else needs it, the research worker's special start-up flag for the Sheet). Ops traced it: the flag
   (`--conditions=react-server`) is needed only by the Sheet code in the research service, and is already unused in the
   assess service, so it comes out of both; Ops re-runs the trace on the removal cut before it ships. No extra restart.

---

## Owners

| Step | Owner | Waits on |
| --- | --- | --- |
| 1 No fake data | Design (owns `lib/data/`; Web offered to write it under Design's review) | nothing |
| 2 Research without the Sheet | Research | your yes for the local run |
| 3 Reproduction | Research (the desk's own recap: every Sheet field incl. float, Priority, the researched list) + Design (board, drawer, table) | decisions RULED 17:20Z; Research's design and price first (model spend is yours) |
| ~~3b Float vendor pricing, if you choose (b)~~ | ~~Commercial~~ | not chosen |
| 4 Worker pins | Ops + whoever owns `worker/runtime.ts` | step 3 shipped; your yes for the restart |
| 5 Server settings | Ops | step 4 |
| 6 Export, switch-off, key deletion | You | step 5 |
| 7 Code deletion | Research + Design + Web, each their own files | step 6 |

**Held because of this plan:** the shared-secret header Web and Ops designed for the worker's Sheet read. Its caller
disappears in step 4, so it is not built.

---

## Appendix: the inventory (for the seats)

*From a read-only sweep of the tree on 2026-10-03, corrected by Research against `lib/research/types.ts`, spot-checked by Integration (float resolution
`lib/dashboard/merge.ts:265-301`, mock fallback `lib/data/index.ts:60-67`, Priority filter `lib/dashboard/view.ts:606`).
The earlier canonical audit is `docs/sheet-coverage-audit.md` (2026-08-24, 64 fields, PRODUCED / PRODUCIBLE / NEW WORK);
where they differ, re-read the code.*

### A. The provider

- Reads `TODAY!A1:AA` and `RESEARCH!A1:AK` in one batch call (`googleSheets.ts:25-26`, `:153-157`), plus title and Drive
  modified-time metadata (`:121-150`). Tables located by header signature (`rows.ts:114-129`).
- Server cache 10 s (`lib/data/index.ts:21`); browser polls `/api/dashboard` every 4 s (`lib/hooks/useDashboard.ts:15`).
- Research worker has its own provider instance via `loadSheetPriors` (`lib/research/merge/sheetPrior.ts:103-182`),
  called each worker cycle (`worker/research.ts:344`).
- Market worker GETs `/api/dashboard` every 60 s for TODAY tickers (`worker/runtime.ts:1797-1802`, `:1866-1870`);
  `worker/diagnose.ts:150` too.

### B. Surfaces that read it

- Board and drawer: `app/desk/page.tsx:10`, `app/api/dashboard/route.ts:32`, `components/DashboardShell.tsx`,
  `lib/dashboard/merge.ts`.
- Review links: `app/review/[token]/page.tsx:31`, `app/review/[token]/api/dashboard/route.ts:42`, diagnostics page
  "Google Sheet" section.
- AI tools: `lib/mcp/tools.ts:92-96` (`get_discovery`, `get_ticker` return the raw Sheet record).
- Review diagnostics: `lib/review/diagnostics.ts:311-312`, `:535-546`.
- Research interpreter: prior + conflict escalation (`lib/research/interpret/pipeline.ts:303-348`, `:519-525`); degrades
  gracefully without it (`sheetPrior.ts:74-78`).
- **Not** the session reports (`lib/desk/reports/*` imports nothing from `lib/data`).

### C. Field by field: consumers and the desk's own source

| Sheet field | Main consumers | Desk's own source |
| --- | --- | --- |
| Ticker list (TODAY) | Second table; extra symbols to `/api/market`; worker pins; `namesTracked` | Engine ranking (`repo.ts:982-988`); Focus list. No hand-picked list. |
| Priority / Revised / Overall | Second table sort + column; Priority filter on both boards (`view.ts:606`); drawer badge | None |
| Float (TODAY, RESEARCH) | `resolveDisplayedFloat` (`merge.ts:270-301`); Discovery float cell + sort; turnover; float check; risk chip | None for float. The dossier's `structure.displayedFloat` (`types.ts:507`) admits only a sourced float and has been null since version 237 (`risk.ts:174-192`): NOT a source. Filed share count: SEC companyfacts + dossier `structure.sharesOutstanding` (`schema.ts:125-126`) |
| Catalyst grade / text / time | Why cell (Sheet first, `why.ts:218-227`); Desk Read; comparison; prior; summary count; drawer | Dossier `catalyst.catalystGrade`, `summary`, `eventTimestamp` (caveat: `eventTimestamp` carries no precision; a date-only event prints a false clock unless traced to an exact or inferred source) |
| Cycle | Comparison; research status; prior; drawer | Dossier `computedCycle` (optional, `types.ts:595`; absent until cycle history is fetched); `lib/market/cycle.ts` |
| Structure Flags / Warning Shot / Warning Flags | Risk chips DIRTY FLOAT, STRUCTURE UNKNOWN, STRUCTURE CAUTION (`risk.ts:137-146`, `:210`); Desk Read; drawer | Dossier `structureClassification`, `structuralWarnings`, `cycleWarnings` |
| RTH/AH/PM price, %, volume | Telemetry fallback labelled SHEET (`telemetry.ts:170-203`); drawer | Market engine (`lib/market/types.ts:318-544`) |
| Recent Run High / Cycle High / Flush % / Prior Runner / Major Runs | Drawer cycle panel (`cycleLevels.ts`); ladder historical level | Dossier cycle fields; `computedCycle`; `findRuns` |
| Key Levels / Daily Resistance | Ladder `SHEET_KEY_LEVELS` (`priceLevels.ts:518-537`); Desk Read next up/down | `lib/market/resistance.ts`; session/VWAP/blue-sky levels |
| Daily Support | Ladder; drawer | None |
| Country / Company / Shares Outstanding / supply filings | Drawer | Dossier fields |
| Split History | Drawer | Dossier `reverseSplitHistory` is model-written prose (`float.ts:232`): text, not numbers; numbers from `lib/market/splits.ts` |
| Report Date | Choosing the latest Sheet record; drawer | None (the dossier has no report date; would need the latest filing date from SEC submissions) |
| Notes / Analyst Notes / Confirmation | Drawer | None |
| meta (sync time, errors) | "Sheet sync" chip; header error; diagnostics; AI tools | Not applicable |

### D. Things that change silently if the Sheet just stops

- The Why grade and headline, the DIRTY FLOAT / STRUCTURE UNKNOWN / STRUCTURE CAUTION chips and the SHEET / SHEET + AUTO /
  CONFLICT labels read the Sheet first today; they change with no error unless step 3 rewires them.
- The interpreter loses its prior and conflict escalation; write-ups may come out differently (step 2 measures this).
- Missing keys = demo rows (step 1).

### E. Server and package pieces

- Env: `GOOGLE_SHEET_ID`, `GOOGLE_SERVICE_ACCOUNT_EMAIL`, `GOOGLE_PRIVATE_KEY` (`googleSheets.ts:69-71`), `USE_MOCK_DATA`
  (`index.ts:49-52`), `RESEARCH_OMIT_SHEET_PRIOR` (`lib/research/config.ts:209`), `MOINTEL_DASHBOARD_URL`
  (`sync-env.sh`, `worker/runtime.ts:1798`).
- Research service started with `--conditions=react-server` for the Sheet provider
  (`deploy/aws/systemd/mointel-research.service:24-26`).
- Package `google-auth-library` (`package.json:46`).
- Tests pinning Sheet behaviour: `tests/data/` (sheetTable, sheetFailClosed, sheetFloat, sheetFloatCell,
  structureNegation, readableSheet, payloadScope, cycleLevels, priceLevels), `tests/dashboard/` (merge, telemetry, filters,
  focus, freshBoundary, floatPair, floatClaim, intelligence, deskRead, decisionSurface, whyOldAndDisagree, sourceGapMerge),
  `tests/research/` (sheetPriorCache, sheetPair, float, sourceGap, interpret), `tests/market/` (engine, symbolAdmission,
  store), `tests/mcp/sideEffects`, `tests/review/diagnostics`.

### F. Earlier writing on retiring the Sheet

`docs/sheet-coverage-audit.md` (canonical field audit); `docs/threads/research.md:4860-4989` (replacement inventory:
float "broken in place + absent"); `docs/threads/README.md:4397-4512` (retiring the Sheet takes pillar 5 unless float is
replaced first); `docs/threads/design-archive-2026-09.md:1113-1167` (risk chip flips the day the Sheet retires);
`docs/monetization-gates.md:148` (Sheet retirement as a product gate).
