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
fabricated). The second table and the Priority grades stay, produced by the desk. Jobs 1, 2 and 5 below are no longer
"dropped" or "replaced by a proxy": they are reproduced. Options (a) to (c) below are kept, struck, as the record of what
was considered.

### ~~Decision 1: what replaces the Sheet's float?~~ (ruled above)

The desk has never had a float of its own (`lib/research/float.ts:4-9`). The Sheet's float comes from the ChatGPT task's
web research, with no stated method.

- **(a) Show the filed share count instead, labelled as such (recommended).** From the company's own SEC filings, with
  completed offerings added back in (Research built and checked this today for the short-interest work: the research
  write-ups' count matched SEC's figure 193 times out of 193). It is not float: it includes insiders' shares, so it reads
  higher than float, and the label says so. No vendor, no new cost. **Measured (Research, run 3, your top-12 names,
  Aug 18 to Sep 15, 422 name-dates):** 82% have a filed share count; it is at most 45 days old for 34%, at most 90 days
  for 46%, at most 120 days for 50%. Foreign companies: 167 of 180 have one, but only 47 are at most 120 days old. So
  (a) covers most names, often with an old date that must be shown beside it.
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
