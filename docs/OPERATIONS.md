# Running the desk

How to start it, how to tell whether it is healthy, and what to check first when
it is not. For how the system is built, see `ARCHITECTURE.md`.

## The model

The desk is **three processes**. The browser is not one of them — it is a window
looking at the dashboard, and closing it stops nothing.

| Process | What it does |
| --- | --- |
| dashboard | serves `localhost:3000` |
| market | the Alpaca SIP connection and the demand engine |
| research | automatic SEC/catalyst collection and interpretation |

All three are supervised by `scripts/desk.mjs`, so in practice the desk behaves
like one application: **the window is its lifetime.**

## Start and stop

**Start** — double-click **Momentum Desk** on the Desktop, or run `npm run desk`.
Both take the same path. It starts whatever is not already running, waits for
the dashboard to answer, and opens the browser.

**Stop** — close the window. All three stop with it.

**Opening it twice is safe.** The second launch detects the first, opens the
browser and exits rather than starting a competing desk.

### The one hard rule

**Never run two market workers.** Alpaca permits one concurrent SIP connection
per account, so a second one does not fail loudly — it silently kills the live
one. The supervisor guards this; the way to break it is to run
`npm run market:alpaca` by hand while the desk is up.

If a launch ever behaves as though something is already running when no window
is open, a previous run was killed uncleanly. The next `npm run desk` reads
`data/desk.lock`, ends whatever it names, and starts clean — but if you want to
check by hand, look for stray `worker/alpaca.ts` node processes.

## Is it healthy?

Three independent lights in the header, left to right. They report three
different systems and are deliberately not combined.

| Light | Green means |
| --- | --- |
| `MARKET: ALPACA SIP — LIVE` | socket connected **and** data arriving |
| `RESEARCH: IDLE / WORKING (n)` | the automatic research engine is running |
| `RESEARCH: GOOGLE SHEET — CURRENT` | the sheet loaded |

The middle light is the one that used to be missing. A current Google Sheet says
nothing about whether the research engine is running, and reading it as
reassurance is how Top-12 names once sat unanalyzed for three hours.

### What the failures look like

**`MARKET: … — DATA DEGRADED` or `DATA STALE` (amber).** The socket is connected
but whole-market messages have stopped arriving. Thresholds are
`MARKET_DATA_FRESH_SECONDS` (90) and `MARKET_DATA_STALE_SECONDS` (240); a lull
under 90s stays green. Connection is not freshness, and this will never claim
LIVE on socket state alone.

**`Research: engine offline` (red).** The research worker is not running. Its
heartbeat is written every few seconds, and OFFLINE is derived from that going
stale — a stopped worker cannot announce its own death.

**`Research: degraded` (amber).** It is running but cannot do the whole job:
no SEC access, or no interpreter configured. `npm run research:diagnose` says
which.

**A ticker stuck on `NOT YET ANALYZED`.** Only meaningful when the research
light is green. If the engine is healthy, every eligible Top-N name converges
within a cycle or two to ANALYSIS PENDING → PARTIAL AUTO / AUTO / SHEET+AUTO /
CONFLICT, or an explicit ANALYSIS FAILED. Reconciliation runs against the
*current* Top-N every cycle, so it does not matter whether the name crossed
while the worker was down.

**A ticker on `ANALYSIS FAILED`.** It failed three times against unchanged
evidence and is deliberately not being retried — otherwise it would spend a
model call every five seconds all session. It clears itself the moment new
evidence arrives, at the next trading date, or when you press **Retry analysis**
in the drawer.

## Diagnostics

```
npm run market:diagnose      # every demand-engine dependency, no credentials shown
npm run research:diagnose    # SEC + model configuration and reachability
npx tsx scripts/health-demo.ts 1 55 227 600
                             # how the market badge reads at a given data age
```

## Where state lives

Everything is in `data/market.db` (SQLite, WAL). It is gitignored and is the only
persistence in the project.

- Stopping and starting loses nothing. The market worker rebuilds session state
  from Alpaca snapshots on startup, which takes about ten seconds.
- Schema upgrades back the store up first, to `data/backups/`, and the backup is
  read back and integrity-checked before the migration proceeds. Both are logged.
- Focus pins and research retry blocks are scoped to the trading date, so a new
  session starts clean without anyone clearing anything.

## Configuration worth knowing

Set in `.env.local`. All optional; defaults in `lib/market/config.ts` and
`lib/research/config.ts`.

| Variable | Default | Effect |
| --- | --- | --- |
| `MARKET_DATA_FRESH_SECONDS` | 90 | below this the feed reads LIVE |
| `MARKET_DATA_STALE_SECONDS` | 240 | above this it reads DATA STALE |
| `FOCUS_MAX_TICKERS` | 6 | how many names the Focus strip holds |
| `RESEARCH_POLL_MS` | 5000 | research reconciliation cycle |

## Known rough edges

- **A deterministically failing research job has no global attempt ceiling
  across evidence changes.** Three attempts per unchanged fingerprint is
  bounded, but a name whose evidence churns constantly could retry more often
  than that. Not observed in practice; worth knowing.
- **The market worker's own copy of the session phase is advisory.** Readers
  derive the phase from the clock, so a worker started in premarket no longer
  reports PREMARKET all day — but the value stored in `discovery_summary` is
  only refreshed on flush.
- **The Desktop shortcut lives in OneDrive** (`C:\Users\adshu\OneDrive\Desktop`)
  and therefore syncs to other machines, where it will not work because it
  points at `A:\mointel`.
