# Running the desk

How to start it, how to tell whether it is healthy, and what to check first when
it is not. For how the system is built, see `ARCHITECTURE.md`.

## The model

The desk is **four processes**. The browser is not one of them — it is a window
looking at the dashboard, and closing it stops nothing.

| Process | What it does |
| --- | --- |
| dashboard | serves `localhost:3000` |
| market | the Alpaca SIP connection and the demand engine |
| research | automatic SEC/catalyst collection and interpretation |
| assess | the scheduled desk assessments (06:10 … 22:00) |

All four are supervised by `scripts/desk.mjs`, so in practice the desk behaves
like one application: **the window is its lifetime.** You should never need to
know which process owns which part of the day.

## Start and stop

**Start** — double-click **Momentum Desk** on the Desktop, or run `npm run desk`.
Both take the same path. It starts whatever is not already running, waits for
the dashboard to answer, and opens the browser.

**Stop** — close the window. All four stop with it.

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

Four independent lights in the header. They report four different systems and
are deliberately not combined.

| Light | Green means |
| --- | --- |
| `MARKET: ALPACA SIP — LIVE` | socket connected **and** data arriving |
| `RESEARCH: IDLE / WORKING (n)` | the automatic research engine is running |
| `ASSESSMENTS: SCHEDULED / RUNNING` | the checkpoint scheduler is alive |
| `RESEARCH: GOOGLE SHEET — CURRENT` | the sheet loaded |

The research light is the one that used to be missing. A current Google Sheet
says nothing about whether the research engine is running, and reading it as
reassurance is how Top-12 names once sat unanalyzed for three hours. The
assessments light exists for the same reason in the other direction: a live feed
and a working research engine say nothing about whether the desk's scheduled
checkpoints are still being taken.

Beside those lights, in words: which session this is, what the desk last
concluded, and when it concludes next — e.g. `AFTER HOURS — LIVE DISCOVERY · AH
session since 16:00 ET · Next: 22:00 RECAP`. The board's numbers cannot say that
the session changed underneath them.

## What the board is ranked by, and when

The Discovery board is **session-aware**. It is not one leaderboard all day.

| Session | Board | Ranked by |
| --- | --- | --- |
| 04:00–09:30 premarket | `DISCOVERY` | Daily RVOL |
| 09:30–close RTH | `DISCOVERY` | Daily RVOL (never reset at 09:30) |
| close–20:00 after hours | `AFTER-HOURS DISCOVERY` | AH Participation |
| 20:00–22:00 | `AFTER-HOURS DISCOVERY`, frozen | AH Participation |

**Daily RVOL** = cumulative volume from 04:00 ÷ average full-session volume over
the previous 20 eligible sessions. Unchanged, and still the premarket and RTH
ranking.

**AH Participation** = volume since the regular close ÷ the *same* 20-session
average full-day volume. It is deliberately not called an RVOL: its numerator is
one evening, not a trading day. `0.4` means this evening alone has already
traded 40% of a normal whole day for that stock.

At 16:30 the board is obviously about post-close activity: a name that led the
day on Daily RVOL and stopped trading at the bell is not on it at all, and its
AH volume of zero is recorded as a fact rather than as missing data. Daily RVOL
stays on the row as context.

## The scheduled checkpoints

| ET | Assessment | What it is |
| --- | --- | --- |
| 06:10 | `STRUCTURAL_REFRESH` | filings, offerings, dilution, structure |
| 06:25 | `PREMARKET_0625` | first formal premarket assessment |
| 06:45 | `PREMARKET_0645` | momentum reassessment |
| 07:00 | `PREMARKET_0700` | late movers |
| 09:25 | `OPEN_SPIKE_ASSESSMENT` | final pre-open state — **EXPERIMENTAL** |
| 10:00–15:30 | `RTH_INTERVAL` | every 30 minutes |
| close | `RTH_CLOSE` | freezes the regular session, starts after-hours |
| 22:00 | `NEXT_DAY_RECAP` | the completed AH session + next-day prep |

They are **snapshots, not polling**. Market data, ranks, levels, events and
research all keep moving between them.

Each one runs **at most once** per trading date and scheduled time, enforced by
a database constraint rather than a check — so a restart cannot duplicate one.
If the desk was off at a checkpoint it runs a catch-up while that checkpoint is
still relevant and marks it `generated late`; past that it is recorded as missed
and **not** generated. Missed 30-minute intervals never accumulate: the desk
performs one current assessment and records the gap rather than manufacturing a
dozen snapshots out of the present.

On an early-close day the last interval and the close assessment move with the
exchange calendar.

Assessments make **no model calls**. Change detection is deterministic; when a
cycle genuinely needs re-looking the checkpoint enqueues a research job and the
research pipeline's own evidence fingerprint decides whether an analysis is
worth paying for.

To review one, use the **View** selector above Discovery. `LIVE` is the default.
A historical assessment is labelled `SNAPSHOT — NOT LIVE` and contains only what
was recorded at capture time — no live price is merged into it.

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
