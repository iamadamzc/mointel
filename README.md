# Momentum Intelligence Trading Desk

A local, dark, institutional-style intelligence dashboard for U.S. small-cap momentum traders.

It is not a stock scanner and not a trading platform. It answers a specific set of questions at a glance:

- What stocks currently matter?
- Why are they moving?
- Where are they in the momentum cycle?
- What does the share structure actually look like?
- Is the displayed float trustworthy?
- Is there dilution, resale supply, warrants, convertibles, PIPEs, ATMs, or reverse-split distortion?
- What are the major levels and warnings?

This milestone (V0) reads an existing Google Sheet and renders it as a trading workstation. There is no market-data ingestion, no OpenAI integration, no auth, no billing, no broker integration, no charts.

---

## What the prototype does

- Reads the `TODAY` and `RESEARCH` tabs of the Trading Desk spreadsheet with one batched Google Sheets request.
- Normalizes human-formatted cells (`$0.502`, `659.9K`, `24.4%`, `UNKNOWN`, emoji-prefixed classifications) into typed application objects, while preserving the original display text.
- Joins `TODAY` rows to `RESEARCH` records by ticker, using the most recent `Report Date` when a ticker has several.
- Renders a header with an America/New_York clock and sync state, a market summary strip, a Primary Focus card row (current priority A), a dense sortable watchlist, and a full per-ticker dossier drawer.
- Polls itself every ~4 seconds while caching upstream reads for ~10 seconds, so browser refresh rate is decoupled from Google API usage.
- Falls back to the last good payload with a visible `STALE DATA` state when Google fails, instead of blanking the desk.
- Runs with zero credentials against a realistic built-in mock dataset.

**Google Sheets is a temporary prototype data store. All dashboard UI must depend on normalized application types, not spreadsheet coordinates, so the data source can later be replaced without rewriting the product.**

---

## Install and run

Requirements: Node.js 20+ (developed on 22) and npm.

```bash
npm install
npm run dev
```

Open <http://localhost:3000>.

With no `.env.local` present the app starts in **mock mode** and displays a `MOCK DATA` badge in the header.

Other commands:

```bash
npm run build      # production build
npm start          # run the production build
npm run lint       # eslint
npm run typecheck  # tsc --noEmit
```

---

## Environment variables

| Variable | Required | Purpose |
| --- | --- | --- |
| `GOOGLE_SHEET_ID` | for live mode | Spreadsheet ID of the Trading Desk sheet |
| `GOOGLE_SERVICE_ACCOUNT_EMAIL` | for live mode | Service-account address the sheet is shared with |
| `GOOGLE_PRIVATE_KEY` | for live mode | Service-account private key, one line, `\n`-escaped, in double quotes |
| `USE_MOCK_DATA` | no | Set to `true` to force mock mode even when credentials exist |

Copy `.env.example` to `.env.local` and fill it in. `.env*` is gitignored.

`GOOGLE_PRIVATE_KEY` is normalized on read: surrounding quotes are stripped, `\n` escapes become real newlines, and stray carriage returns are removed. If the value does not look like a PEM private key, the app treats credentials as absent and falls back to mock mode rather than crashing.

---

## Google Sheets service-account setup

1. **Create or choose a Google Cloud project** at <https://console.cloud.google.com>.
2. **Enable the Google Sheets API** for that project (APIs & Services → Library → Google Sheets API → Enable).
3. **Create service-account credentials**: IAM & Admin → Service Accounts → Create service account → Keys → Add key → Create new key → JSON. A JSON key file downloads.
4. **Put the credentials in `.env.local`**:
   - `GOOGLE_SERVICE_ACCOUNT_EMAIL` = the `client_email` field from the JSON.
   - `GOOGLE_PRIVATE_KEY` = the `private_key` field, on one line, wrapped in double quotes, with real newlines replaced by `\n`.
   - `GOOGLE_SHEET_ID` = the id from the spreadsheet URL.
5. **Share the spreadsheet** with the service-account email as **Viewer** (Share → paste the address → Viewer).
6. **Restart the app** (`npm run dev`). The header switches from `MOCK DATA` to `LIVE / SHEET DATA`.

Keep the downloaded JSON key file out of the repository. `.gitignore` already excludes `mointel-*.json`, `service-account*.json`, and `credentials*.json`.

### Optional: `sourceUpdatedAt`

The payload exposes `meta.sourceUpdatedAt`, the spreadsheet's last-modified time. It requires the **Google Drive API** to also be enabled on the project. If Drive is disabled, the field stays `null`, the lookup is disabled for the process, and nothing else is affected.

---

## Mock mode

Mock mode activates when any of the three Google variables is missing or unusable, or when `USE_MOCK_DATA=true`.

The mock rows in `lib/data/providers/mock.ts` are written **in the same column order as the real spreadsheet** and pushed through the same normalizers, so mock mode exercises the real parsing path rather than a parallel one. The dataset covers:

| Ticker | Scenario |
| --- | --- |
| `VNTX` | Fresh / frontside A-priority primary with premarket follow-through and an explicitly clean structure |
| `HLRA` | Frontside — warning whose `Revised Priority` promotes it to A |
| `QBTL` | Dirty float: variable-priced convertible, active ATM, unverifiable float |
| `DRSN` | Backside former superrunner with an effective resale registration |
| `KAVU` | Unknown float / unknown structure after a reverse split, and a deliberately short RESEARCH row |

Mock tickers are fictional. The header always shows a `MOCK DATA` badge so mock output is never mistaken for the live sheet.

---

## Architecture

```
Browser (client components)
        │  fetch /api/dashboard every ~4s
        ▼
app/api/dashboard/route.ts
        │
        ▼
lib/data/index.ts ......... provider selection + ~10s cache + stale fallback
        │
        ├── lib/data/providers/googleSheets.ts ... one batched values.batchGet
        └── lib/data/providers/mock.ts ........... built-in rows, same normalizers
                    │
                    ▼
        lib/data/rows.ts ......... the only module aware of column positions
        lib/data/normalize.ts .... parsing + classification rules
                    │
                    ▼
        lib/data/types.ts ........ MomentumTicker, StructuralResearch, DashboardState
```

Rules the codebase holds to:

- React components never talk to Google. The browser only ever calls `/api/dashboard`.
- Credentials are server-only; `lib/data/index.ts` and the Sheets provider import `server-only`.
- Column indexes appear in exactly one file (`lib/data/rows.ts`).
- Parsing is conservative: a number is parsed only when the whole cell is numeric, explicit `Unknown` never becomes `0`, and no structure is called `CLEAN` unless the source says `CLEAN`.

See [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) for where future components attach.

---

## File structure

```
app/
  api/dashboard/route.ts     JSON endpoint; the only thing the browser fetches
  layout.tsx                 fonts, metadata, dark shell
  page.tsx                   server component; renders first paint from the cache
  globals.css                design tokens (state colors), dense scrollbars, change flash
components/
  DashboardShell.tsx         client orchestrator: polling, filters, sort, selection
  DashboardHeader.tsx        title, ET clock, sync state, manual refresh
  DataFreshness.tsx          LIVE / MOCK / STALE indicator and last-sync age
  MarketSummary.tsx          summary strip counts
  FilterBar.tsx              search + priority / cycle / structure / catalyst filters
  PrimaryFocus.tsx           compact intelligence cards for current priority A
  MomentumTable.tsx          dense sortable watchlist
  TickerDrawer.tsx           full dossier: overview, catalyst, cycle, structure, levels, desk read
  StatusBadge.tsx            badge primitive plus state-to-tone mapping
lib/
  data/
    types.ts                 normalized application types
    normalize.ts             cell parsing and classification rules
    rows.ts                  column mapping, research selection, summary counts
    index.ts                 provider selection, cache, stale fallback
    providers/
      googleSheets.ts        live provider (server-only)
      mock.ts                credential-free provider
  dashboard/view.ts          client-side filtering and sorting
  hooks/useDashboard.ts      polling feed and change detection
  hooks/useClock.ts          hydration-safe ET clock
  format.ts                  display formatting helpers
docs/ARCHITECTURE.md         where future subsystems attach
```

---

## Behavior notes

**Latest price / change / volume.** Premarket wins, then after hours, then the RTH close. A cell that explicitly says `Unknown` is treated as absent for this choice, so the desk shows the best real number available. The session actually being displayed is labelled `PM` / `AH` / `RTH` everywhere.

**Priority.** `Revised Priority` becomes the current priority when populated; the original `Priority` is preserved and shown in the dossier, and a `REV` marker appears next to the badge.

**Warnings and catalysts.** `PM Warning Shot` supersedes `Warning Shot`; `PM Catalyst/Update` supersedes `Catalyst`. The superseded original is preserved in the dossier.

**Structure.** `DIRTY FLOAT` and `UNKNOWN` are surfaced as prominent badges only when those words appear in the source text. Anything else is `Unclassified` — never `Clean`. The underlying cycle and grade strings, including emoji, are displayed unaltered; only their color is derived.

**Sorting.** Priority sorts A → B → C → AVOID → EXCLUDED, with the largest current move first inside each band. Numeric columns sort numerically when parsed; unparsed and `Unknown` values always sort last regardless of direction.

**Refresh.** The browser polls every 4 seconds and pauses while the tab is hidden. The server serves a cached payload for 10 seconds and de-duplicates concurrent refreshes, so many browser polls collapse into few Google reads. `Refresh` sends `?force=1` and bypasses the TTL. Rows that changed since the previous poll get a brief tint; row order is not disturbed except by the active sort.

---

## Future integration points

Not implemented in this milestone. See `docs/ARCHITECTURE.md` for the intended seams.

- Live market-data provider, RVOL ranking, float turnover, effective float turnover, momentum acceleration, halt detection
- Event-driven OpenAI analysis, live commentary feed, Dirty Float state changes, Chop Risk, Flush Risk, Live Confirmation
- Historical ticker dossiers, PostgreSQL persistence, multi-user broadcast distribution
