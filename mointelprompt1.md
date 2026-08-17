We are building the first working prototype of a product called **Momentum Intelligence Trading Desk**.

This is NOT a generic stock scanner and NOT a trading platform.

The purpose of the product is to give U.S. small-cap momentum traders a fast intelligence view answering:

* What stocks currently matter?
* Why are they moving?
* Where are they in the momentum cycle?
* What does the share structure actually look like?
* Is the displayed float trustworthy?
* Is there dilution, resale supply, warrants, convertibles, PIPEs, ATMs, reverse-split distortion, or other structural risk?
* What are the major levels and warnings?

For this first milestone, build a polished LOCAL web dashboard that reads an existing Google Sheet.

Do not build market-data ingestion, OpenAI integration, authentication, billing, user accounts, broker integration, charts, Level 2, Time & Sales, or automated trading.

Those come later.

## TECH STACK

Use:

* Next.js with App Router
* TypeScript
* Tailwind CSS
* React
* Google Sheets API on the server
* a clean component architecture
* current stable package versions

The application must run locally on Windows with:

npm install
npm run dev

and open at:

http://localhost:3000

Do not expose Google credentials to the browser.

## EXISTING GOOGLE SHEET

Spreadsheet ID:

`1YfuAbKH80aSJFLdpEHYZNMa15jew3fMkhVeaJQbUztQ`

Spreadsheet title:

`Trading Desk – Small Cap Momentum Watchlist`

The important tabs for V0 are:

### TODAY

Columns A:AA:

1. Priority
2. Ticker
3. Country of Origin
4. Cycle
5. RTH Close
6. AH Price
7. AH %
8. AH Volume
9. Float
10. Catalyst Grade
11. Catalyst
12. Catalyst Time
13. Recent Run High
14. Flush From High %
15. Prior Runner
16. Structure Flags
17. Key Levels
18. Warning Shot
19. Notes
20. PM Price
21. PM %
22. PM Volume
23. PM Catalyst/Update
24. PM Catalyst Time
25. Confirmation
26. Revised Priority
27. PM Warning Shot

### RESEARCH

Columns A:AK:

1. Report Date
2. Ticker
3. Country of Origin
4. Company
5. RTH Close
6. AH Price
7. AH %
8. AH Volume
9. Float
10. Float Source Date
11. Float Source URL
12. Shares Outstanding
13. Catalyst Details
14. Catalyst Timestamp
15. Catalyst Grade
16. Catalyst Source URL
17. Recent Cycle High
18. Flush From High %
19. Cycle Classification
20. Cycle Reasoning
21. Recent Major Runs
22. Historical Runner Notes
23. Split History
24. Daily Resistance
25. Daily Support
26. 8-K / 6-K
27. Registration / Prospectus
28. Offerings / ATM / PIPE
29. Warrants / Convertibles
30. Other Share Structure
31. Structure Source URLs
32. Warning Flags
33. Overall Priority
34. Analyst Notes
35. Float Quality
36. Overhang / Float
37. Supply Evidence

Treat the Google Sheet as READ ONLY from this application.

## DATA ARCHITECTURE

Do NOT couple React components directly to Google Sheets.

Create a data-provider abstraction so Google Sheets can later be replaced with PostgreSQL or another backend without rewriting the UI.

Suggested architecture:

`lib/data/types.ts`

Define normalized TypeScript interfaces such as:

* MomentumTicker
* StructuralResearch
* DashboardState

`lib/data/providers/googleSheets.ts`

Handles Google Sheets reads and converts spreadsheet rows into normalized typed objects.

`lib/data/providers/mock.ts`

Contains realistic mock data matching the same interfaces so the app can run without credentials.

`lib/data/index.ts`

Chooses the appropriate provider.

`app/api/dashboard/route.ts`

Returns normalized dashboard JSON.

The frontend should ONLY communicate with `/api/dashboard`.

Do not have client-side code call Google APIs.

## GOOGLE SHEETS AUTHENTICATION

Prepare the project for a Google service account.

Use environment variables:

GOOGLE_SHEET_ID
GOOGLE_SERVICE_ACCOUNT_EMAIL
GOOGLE_PRIVATE_KEY

Create:

`.env.example`

Do NOT commit real credentials.

Normalize escaped newlines in GOOGLE_PRIVATE_KEY correctly.

If Google credentials are unavailable, automatically use the mock provider so development can continue.

Document setup in README.md:

1. Create or use a Google Cloud project.
2. Enable Google Sheets API.
3. Create service-account credentials.
4. Put the service-account email and private key in `.env.local`.
5. Share the Trading Desk Google Sheet with the service-account email as Viewer.
6. Restart the app.

## GOOGLE SHEETS FETCH STRATEGY

Do not make one Google request per row or ticker.

Fetch the TODAY and RESEARCH ranges efficiently, preferably with one batch request.

Server-side cache the normalized result for approximately 10 seconds.

The browser can request `/api/dashboard` more frequently, but repeated browser requests should normally receive the cached server state rather than triggering another Sheets call.

Include:

* fetchedAt
* sourceUpdatedAt if available
* stale/error state

If Google Sheets temporarily fails and there is a previously valid cache, return the last valid data with a stale warning instead of blanking the entire dashboard.

## NORMALIZATION RULES

Spreadsheet values are human-formatted strings and may contain:

* dollar signs
* percentages
* commas
* M/K suffixes
* Unknown
* UNKNOWN
* blanks
* emojis
* descriptive text

Preserve the original display value while also parsing numeric values where useful.

Never convert an UNKNOWN structural value into zero.

Never infer CLEAN structure merely because no warning is present.

Never invent missing data.

### Latest price

For each ticker:

If PM Price exists, use PM Price as the primary current displayed price.

Otherwise use AH Price.

If neither exists, use RTH Close.

Do the same conceptually for latest percentage change and volume.

Clearly indicate whether the currently displayed session value is:

PM
AH
or RTH

### Revised priority

If Revised Priority is populated, use that as the current priority.

Otherwise use Priority.

Preserve the original Priority as well.

### Latest warning

If PM Warning Shot exists, treat it as the current warning.

Otherwise use Warning Shot.

### Catalyst update

If PM Catalyst/Update exists, display it as the latest catalyst/update while preserving the original Catalyst underneath in the detail view.

## VISUAL DESIGN

This is a professional real-time trading intelligence product.

Design it like a serious institutional-style trading workstation, but optimized for small-cap momentum traders.

Use a DARK interface.

The design should feel:

* dense
* fast
* serious
* extremely readable
* information-rich without looking cluttered
* appropriate for a second trading monitor

Avoid:

* oversized SaaS cards
* huge whitespace
* gradients everywhere
* cartoonish graphics
* marketing-site design
* unnecessary animations

Use subtle borders, hierarchy, compact spacing, strong typography, status badges, and restrained use of color.

Colors should primarily communicate STATE, not decoration.

## PAGE STRUCTURE

Create one main dashboard screen.

### TOP HEADER

Show:

Momentum Intelligence
Trading Desk

Current date/time in America/New_York.

Display:

LIVE / SHEET DATA

and:

Last sync: HH:MM:SS ET

If the data is stale, visibly show STALE DATA.

Add a manual refresh button.

## MARKET SUMMARY STRIP

Compact summary metrics:

* Names Tracked
* Fresh / Frontside
* Frontside Warning
* Backside
* Dirty Float
* Strong/Fresh Catalysts

Calculate these only from explicitly available classifications.

Do not manufacture classifications.

## PRIMARY FOCUS

At the top of the main content, show tickers whose CURRENT priority begins with:

`A`

Display these as compact horizontal intelligence cards.

Each Primary card should prominently show:

Ticker
Latest price
Latest %
Current priority
Momentum cycle
Float
Catalyst grade
Structure classification/raw structure warning
Key levels
Current warning
Confirmation if present

Cards should be compact enough that several can fit on a desktop monitor.

## WATCHLIST TABLE

Below Primary Focus, display all TODAY names in a dense sortable table.

Default ordering:

Current Priority
then current % change descending

Columns should be approximately:

Priority
Ticker
Price
%
Session
Cycle
Volume
Float
Catalyst
Structure
Key Levels
Warning
Confirmation
Updated

Do not attempt to fit every source spreadsheet column into this table.

The table is an ATTENTION interface.

Long text should truncate intelligently.

Hover or click should allow access to more information.

Ticker should remain visually dominant.

## STATUS PRESENTATION

Momentum Cycle:

Text containing FRESH / FRONTSIDE should visually read as green.

Text containing FRONTSIDE and WARNING should read as yellow/amber.

Text containing BACKSIDE should read as red.

Do not alter the underlying text.

Catalyst Grade:

A — STRONG/FRESH should receive the strongest positive catalyst treatment.

B — legitimate/secondary should be visually distinct but less strong.

C — weak/none should be subdued/warning-oriented.

Do not change the actual stored classification.

Structure:

If the raw structure text explicitly contains DIRTY FLOAT, display a prominent DIRTY FLOAT badge.

If it explicitly contains UNKNOWN, display UNKNOWN STRUCTURE.

Do not classify anything CLEAN unless CLEAN is explicitly present in source data.

## TICKER DETAIL PANEL

Clicking any ticker should open a large right-side drawer or modal dossier.

Merge TODAY data with the matching RESEARCH record using ticker as the key.

The dossier should be much richer than the table.

Organize it into sections:

### OVERVIEW

Ticker
Company
Country
Current priority
Cycle
Price
% change
Float
Shares outstanding
Float quality
Overhang / Float

### CATALYST

Catalyst grade
Latest catalyst/update
Original catalyst
Catalyst timestamp
Catalyst details
Catalyst source link

### MOMENTUM CYCLE

Cycle classification
Cycle reasoning
Recent cycle high
Flush from high
Recent major runs
Historical runner notes
Prior Runner
Split history

### STRUCTURAL INTELLIGENCE

Structure Flags
Supply Evidence
Registration / Prospectus
Offerings / ATM / PIPE
Warrants / Convertibles
Other Share Structure
8-K / 6-K
Warning Flags
Structure source links

### LEVELS

Key Levels from TODAY
Daily Resistance
Daily Support

### DESK READ

Current warning
Confirmation
Analyst Notes
TODAY Notes

Make URLs clickable and open them in a new tab.

Long textual sections should be readable, not squeezed into tiny cells.

## SEARCH AND FILTERS

At minimum provide:

Ticker search

Priority filter:
All
A
B
C

Cycle filter:
All
Fresh/Frontside
Warning
Backside

Structure filter:
All
Dirty Float
Unknown
Other

Catalyst filter:
All
A
B
C

Filtering should happen client side against the current normalized dataset.

## SORTING

Allow sorting by:

Priority
Ticker
Price
% change
Volume
Float

Numeric values should sort numerically when successfully parsed.

Unknown values should remain unknown and sort after known numbers.

## REFRESH BEHAVIOR

Client should refresh `/api/dashboard` every approximately 3-5 seconds.

This must NOT imply a Google API read every 3-5 seconds.

The backend should cache Google data approximately 10 seconds.

Show a subtle visual change if data changes, but do not animate rows aggressively.

Do not reorder rows in a visually chaotic way while the trader is reading unless the underlying sort requires it.

## MOCK DATA

Populate mock mode with several realistic examples representing:

* A primary fresh/frontside stock
* A warning/frontside stock
* a DIRTY FLOAT stock
* a backside former runner
* an UNKNOWN float/structure stock

Use realistic placeholder tickers/data, but clearly mark mock mode in the UI.

Do not hardcode the actual live TODAY values into the production application.

## ERROR HANDLING

The application should not crash if:

* a cell is blank
* a column contains Unknown
* a ticker is missing RESEARCH data
* RESEARCH has multiple dated records for a ticker
* Google authentication fails
* Google Sheets temporarily returns an error

For multiple RESEARCH records with the same ticker:

Use the most recent Report Date.

Preserve the ability to change this logic later.

## RESPONSIVENESS

Optimize first for:

1920x1080 desktop trading monitor.

It should still function reasonably on:

1366x768
tablet
phone

But desktop trading use is the priority.

Do not sacrifice desktop information density just to make mobile prettier.

## CODE QUALITY

Use clear domain-oriented naming.

Avoid one giant page component.

Split the application into sensible components such as:

DashboardHeader
MarketSummary
PrimaryFocus
MomentumTable
FilterBar
TickerDrawer
StatusBadge
DataFreshness

Do not overengineer with Redux or a large state framework unless there is an actual need.

Use comments only where the reasoning is non-obvious.

## README

Write a clear README containing:

* what the prototype does
* architecture
* file structure
* install instructions
* environment variables
* Google Sheets service account setup
* how mock mode works
* how to run locally
* future integration points

Include the explicit statement:

`Google Sheets is a temporary prototype data store. All dashboard UI must depend on normalized application types, not spreadsheet coordinates, so the data source can later be replaced without rewriting the product.`

## FUTURE ARCHITECTURE PLACEHOLDERS

Do NOT implement these yet, but structure the project so we can later add:

* live market-data provider
* RVOL ranking engine
* float turnover
* effective float turnover
* momentum acceleration
* halt detection
* event-driven OpenAI analysis
* Dirty Float state changes
* Chop Risk
* Flush Risk
* Live Confirmation
* live commentary feed
* historical ticker dossiers
* PostgreSQL
* multi-user broadcast distribution

Add a short `docs/ARCHITECTURE.md` showing where those components will eventually fit.

## DEFINITION OF DONE

Do not stop after scaffolding.

The milestone is complete when:

1. The app launches locally.
2. Mock mode works with no credentials.
3. Google Sheets mode is implemented.
4. TODAY rows normalize correctly.
5. RESEARCH rows normalize correctly.
6. TODAY and RESEARCH join by ticker.
7. Primary Focus renders.
8. Watchlist renders.
9. Filters and sorting work.
10. Ticker detail dossier works.
11. Refresh/cache behavior works.
12. Loading/error/stale states work.
13. README setup instructions are complete.
14. TypeScript passes.
15. Lint passes.
16. Production build succeeds.

Run:

npm run lint

and:

npm run build

Fix all errors before declaring the milestone complete.

When finished, report:

* project folder path
* architecture created
* files created
* commands to run it
* whether mock mode passed
* whether build/lint passed
* exact manual steps I now need to perform to connect the real Google Sheet

Do not start implementing market-data ingestion or OpenAI integration yet.
A github repo has been created at https://github.com/iamadamzc/mointel

