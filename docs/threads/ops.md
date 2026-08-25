# Thread: Operations & Deployment

**Owns the live desk.** The server, the market worker, deploys, rollbacks,
auth, backups, and any incident that reaches production.

Last worked: **2026-08-23**.

## Scope

- The AWS Lightsail instance, Nginx, CloudFront, TLS, firewall, Basic Auth
- Deploys and rollbacks — **this thread is the only one that deploys**
- The Alpaca market worker and the SIP connection
- The assessment scheduler and its checkpoint windows
- Production SQLite: migrations, backups, consistency
- Incident diagnosis on live evidence

## `lib/review/` belongs here, and nothing said so until now

**Recorded 2026-08-23, after Ops asked whether a review-route fix was Design's
or its own.** The honest answer was that **no charter owned the module at all**
— `lib/review/access.ts`, `tokens.ts`, `diagnostics.ts` and `app/review/[token]/`
appear in no thread's scope.

It belongs here. Ops creates review sessions, revokes them, documents them in
[../AWS_DEPLOYMENT.md](../AWS_DEPLOYMENT.md), and owns Basic Auth and the auth
model the review token sits beside. Design's scope is the Discovery board, the
watchlist, the drawer and the visual system; a capability token's HTTP status is
none of those. **That the code is app-layer is where it lives, not who owns the
concern** — and Ops drew that distinction itself while asking the question.

Naming the tension rather than letting it become precedent: this thread
otherwise takes handoffs and deploys rather than writing application code. That
convention holds. `lib/review/` is the exception because it is operational
machinery that happens to be written in TypeScript, not product. If it starts
growing product surface, revisit it.

**~~The open defect.~~ Investigated by Ops and closed: every available fix is
worse than the defect, and I had overstated it.** What I recorded — that a
monitor would never notice a dead link, and that any status-code check gets a
false pass — is true only of the **page**. The review **API** is already
correct: `api/dashboard`, `api/market` and `api/diagnostics` all return **403**
for revoked and for garbage, 200 only for valid, with no data in the body. Both
consequences dissolve.

**So the operating rule, which is the useful output: to test a review link,
request its API, never the page.** A monitor polls the API and sees a dead link
immediately.

Why the page is left alone, recorded because the reasoning is not obvious and
someone will propose the same fix again. `notFound()` would have been a **no-op**
— `not-found.js` in Next 16.3.1 returns 200 for **streamed** responses, and this
one is streamed by design (`Transfer-Encoding: chunked`, which is why nginx sets
`proxy_buffering off`), so it would swap an informative refusal for Next's
default 404 UI and leave the status at 200. `unauthorized()` is semantically
right and **experimental**: it needs `experimental.authInterrupts` on globally,
and enabling an experimental Next flag across a production trading desk to fix
one status code is not a trade worth making. Validating in `proxy.ts` is already
refused there for a reason that still holds — it runs before the runtime the
data layer needs and cannot reach SQLite.

## Not this thread

- UI components and anything in the audit's remediation plan → [design.md](design.md)
- The interpreter, evidence collection, model spend → [research.md](research.md)

Both of those produce commits. **They come here to be deployed.** Take the
handoff, run the gate, deploy — do not review their design decisions.

## State as of 2026-08-23 (evening)

Production is **`5ee47d8`**, schema **v21**, deployed 16:17 ET Sunday — the fifth
deploy of the weekend, carrying Design's `aa98b70` (the Move label moved onto the
visible button) so Monday's verification list is four of four rather than three.
Gate at that sha: **1239 tests / 80 files**, lint, typecheck, build. No
migration. All four services active plus nginx. Health `ok`.

**SIP untouched for the fifth deploy running** — `mointel-market` still pid
129202, `NRestarts=0`, start still Sun 01:27:36 UTC, no journal entries in any
deploy window. Still deliberately on `fd9556f`.

**The nginx asset fix is now reconciled, not merely agreeing.** It was
hand-applied by reload; `deploy.sh` reinstalls that file from the release, so
until this deploy the running config and the repo agreed only because they had
been made to. They are now the same artifact — `diff` of the installed file
against the release copy is identical — and it was re-tested through CloudFront
afterwards: build asset **200** without auth, `/api/market` still **401**. A
hand-applied config surviving a deploy is not something to assume.

**The pin earned its keep a second time.** This deploy's prune removed `775c5a9`
and printed `keep fd9556f (pinned)`. Two consecutive deploys where the pin, not
keep-3, is the only thing holding the directory the live worker runs from.

**Live but unverified**, per `abf38e1` — and Design's reason is better than the
one recorded here. This thread wrote "unverified" meaning *Ops does not make
behavioural claims*. Design established something stronger: **the label cannot
be verified at all right now, because the fixed and unfixed versions render
identically at this session phase.** Checked against source rather than taken on
report — `moveLabel()` at `components/DiscoveryBoard.tsx:63` returns `'Move'` on
its default branch, which is the same visible string the old hover-only code
produced. Only the `'Gap'` branch differs, and that is premarket.

So Design has confirmed the **deploy landed** — by content, the tooltip string
`Change from the most recent session close` exists only in `aa98b70` — while
explicitly declining to call the **behaviour** verified. *"A check that cannot
fail isn't a check."* That is the same principle this thread applied to the
`releaseBootstrap` fixture when it mutation-tested the fix, and it is worth
noticing that Design reached it independently and applied it against its own
work.

**SESSION 13 MUST NOT BE REVOKED before Monday midday.** It expires 11:59 ET
Monday and covers premarket, the open and 2½ hours of RTH.

**The rule this thread wrote was wrong, and Design caught it.** It said *"issue
long, revoke on report of done."* Design reported done **for tonight**, which is
not done — and revoking on that report would have destroyed the premarket
verification the token was issued for. Corrected:

> **Revoke when the work the session was issued for is finished, not when
> somebody reports finishing a sitting of it.** A session issued for a
> phase-dependent check survives to that phase. If the two ever look the same,
> the session stays.

There is no `extend` — `worker/review.ts` offers `create`, `list`, `revoke` and
`revoke-all` only — so a reissue means a new URL, and a third URL in one evening
is its own hazard when Design's charter already cites a stale one. Session 13
therefore stands as issued. The expiry edge is safe in a way it would not have
been yesterday: the API check makes a dead link **self-diagnosing** — 403 dead,
200 live — so if it runs out mid-work the remedy is one command and no
guesswork.

## State as of 2026-08-23 (morning — superseded above, kept for the reasoning)

Production is **`28c7f12`**, schema **v21**, deployed 04:04 ET Sunday — the third
deploy of the weekend, taking Research's `55f3e20` handoff (the share-count bug
fix; no worker loop, no retry path, no schema change) and, with it, R&D's
`85bd8e9` fix for the export `rm -rf`. Gate at that sha: **1173 tests / 76
files**, lint, typecheck, build. No migration: `SCHEMA_VERSION` is 21 on both
sides, migrate wrote 0 backups. Market IDLE, connection STREAMING. Research
IDLE. Assessments idle, next `STRUCTURAL_REFRESH` Monday 06:10 ET.

**The gate went red on its first run and was not waved through** — 1172/1173,
`releaseBootstrap` again, a different assertion from the morning's. Isolated
5/5, full re-run 1173/1173. See Open item 4; the sighting is what upgraded that
item from odd to owned.

The `rm -rf` hold is lifted: `grep -c rmSync` on the deployed
`worker/archive-export.ts` is **0**, and `--dry-run` is now a genuine read that
ignores `--out` entirely. Verified on the box, not taken on report.

All three deploys ran with `RESTART_MARKET` at its default of `no`, and the SIP
connection was never touched by any of them — `mointel-market` `NRestarts=0`
throughout, still pid 129202 from the 01:27:36 restart, no journal entries in
any deploy window.

**The market worker deliberately runs an older release than `current`, and that
is the design.** It was restarted once, at 01:27:36 UTC, to clear drift it had
accumulated silently; it has stayed on `fd9556f` through the `775c5a9` deploy
because restarting it again would spend Monday's premarket — the first open it
faces since that restart — proving nothing. Do not tidy this away.

**`fd9556f` is therefore pinned.** Keep-3 retention would have covered it for
two more deploys, but "retention will probably cover it" is exactly the
reasoning that was wrong about `80437c3`. The pin comes off when the worker next
moves. It earned itself immediately: the `775c5a9` deploy's prune removed
`80437c3` — the very directory the worker was running from this morning.

Three deploys in, the arithmetic has caught up: prune has now removed `80437c3`
and `32e47c9`, and retention holds `28c7f12`, `775c5a9`, `fd9556f`. **The next
deploy is the one where keep-3 would drop `fd9556f` and the pin becomes the only
thing keeping the running worker's directory alive.** That is the deploy the pin
was placed for.

**Two rollback pins now exist**: `market-worker-release` = `fd9556f` and
`rollback-baseline` = `372f5eb` (schema v18). This
charter previously said "rollback pins retained: `80437c3` and the `372f5eb`
baseline". That was wrong — `80437c3` was never pinned. The line came from a
deploy transcript, where `[prune] retained …` lists every release still on disk,
most of which are held by the keep-3 count and not by a pin at all. **`pins.sh
list` is the authority on what is pinned; a deploy transcript is not.** Retained
and pinned are different words on that output and only one of them is a promise.

The 2026-08-21 deploy notes, kept because both are now proven in production: the
preflight bootstrap that would have blocked every future deploy, and an enum
leak that only real dossiers could reveal. Both branches of the bootstrap fix
have now been exercised, not just the fallback.

## State: production is `a259e8c`, deployed 2026-08-24 01:37 UTC

Gated at that sha in the isolated rig — **1278 tests, lint, build, typecheck** —
and shipped by explicit sha on Integration's instruction, under the trader's
delegation. Adds the read-time cycle overlay: two non-docs files against
`c48e199`, `lib/market/readModel.ts` and its test. Capture verified at directory
scope: **zero** changes under `worker/` or `lib/market/store/`, schema 21.

**The SIGTERM fix is confirmed, not merely consistent with one run.** Second
clean stop: `Stopping…` 01:37:06, `Deactivated successfully` **01:37:06 — under
a second**, matching `c48e199`. Two for two, against 31 seconds and a `SIGKILL`
before the fix.

**Capture untouched, eighth deploy running.** `mointel-market` pid 129202,
`NRestarts=0`, no journal entries in the window. Still on `fd9556f`, pinned.

### The overlay is live and its effect is NOT observable until premarket

`overlayLiveCycle` is on the box. But the Discovery board is **empty**, so there
is nothing to overlay:

| trading_date | `ticker_session` rows | with `rvol_rank` |
| --- | --- | --- |
| 2026-08-21 | 8,688 | 2,821 |
| **2026-08-24** | **8,653** | **0** |

The rows are seeded for the new trading date but nothing has traded, so no name
has an RVOL rank and `/api/market` returns `discovery.rows: 0`.

**So "the cycle column is now populated" cannot be checked tonight, and neither
can the two tests that replaced Design's retired check 4** — the six phase names
and the retracement figure both need rows on the board. This is the same shape as
the Move label: a phase-dependent surface that cannot be falsified at `CLOSED`.
Worth saying before the session is spent on it rather than after.

*Also note `/api/dashboard` is the Sheet-merged view and carries no
`intelligence` key at all — the overlay feeds the desk read
(`deskRead.ts:528`), not that endpoint. Checking the wrong one would produce a
confident wrong answer in either direction.*

## A worker dies on startup on most deploys — whichever loses the migration race

**Corrected 2026-08-24 after the tenth deploy.** I first wrote this as *"the
assessment worker dies on ~1 deploy in 3."* Wrong on both counts. On `0778533`
it was **`mointel-research`** that died — same error, same stack, different
service — while `assess` came up clean. Four occurrences now across the two.

> It is not one worker with a fault. It is **whichever worker loses the
> migration snapshot race on startup**, and which one that is varies per deploy.

`SqliteError: database is locked`, `SQLITE_BUSY_SNAPSHOT`, at `migrate()`
(`db.ts:734`) **inside** `withMigrationLock` → `openDatabase` — from
`desk-assessments.ts:380` on one deploy and `research.ts:98` on the next. Exits
`1/FAILURE`, systemd restarts ~10 s later.

**The documented fix does not cover this.** The cross-process lock is in the
stack and works — it serialises migrations. But `SQLITE_BUSY_SNAPSHOT` is a
*snapshot* conflict: it fires when a deferred transaction upgrades to a write
after another connection has written. Three services restart together and reopen
the store; one loses its snapshot. **A lock that serialises writers does not stop
a reader invalidating one.**

### The self-healing has a hard floor: five crashes and systemd stops

Integration observed that the preflight's 5-minute guard happens to cover this
fault's ~10-second unavailability — a 30× margin by luck rather than design —
and that a restart loop would spend it fast. **Measured, and it is a cliff rather
than a slope:**

| unit | `Restart` | `RestartSec` | `StartLimitBurst` | `StartLimitInterval` |
| --- | --- | --- | --- | --- |
| `mointel-assess` | always | 10 s | **5** | 5 min |
| `mointel-research` | always | 10 s | **5** | 5 min |
| `mointel-web` | always | 10 s | **5** | 5 min |
| `mointel-market` | always | 15 s | **5** | 5 min |

**Five crashes inside five minutes and systemd gives up.** The unit stays
`failed` and is not restarted again. At 10 s apart that is **~50 seconds** of
looping to exhaust the budget.

So the fault is self-healing only while it is *intermittent*. If the snapshot
race were to recur on each restart — which is plausible precisely when several
services are cycling together, the condition that causes it — the worker exits
the loop **dead**, and every subsequent checkpoint is missed until a human looks.
That is the version with a permanent cost, and it is one systemd property away
from today's behaviour.

Current state is nowhere near it: `NRestarts` is 0 or 1 on every unit. Recorded
because the margin Integration called luck has a floor, and the floor is 50
seconds rather than 5 minutes.

### The observable that caught it was not the one I built

**The stop was clean on that deploy — fourth in a row.** The failure was on
**start**. I had built a stop-duration observable because that is where the last
bug was, and the next bug was one step further along the same lifecycle.

`NRestarts` caught it, on the first deploy where I checked it, having written
that intention one message earlier. **`is-active` says "active" for a service
that crashed and came back; `NRestarts` is the field that carries the answer** —
and neither `systemctl is-active` nor the deploy's own health wait can see it.

**Why it still matters:** the recovery is only a recovery because nothing was
due. On `1d1d56b` it crashed at 01:55:05 with `NEXT_DAY_RECAP` due at **02:00** —
five minutes, unplanned. Hitting `assess` near a checkpoint is a permanent hole,
because the record only grows in real time.

### The cause, precisely — and it is smaller than "a migration path"

**The upgrade transaction runs on every open, whether or not anything needs
migrating.** `openDatabase` reads `fromVersion` but uses it *only* to decide
whether to take a backup; `db.exec(SCHEMA)`, `migrate(db)` and the
`user_version` write then execute inside `db.transaction(...)` unconditionally
(`db.ts:938-945`). **So every worker startup takes a write transaction on the
store.** Three starting together, one loses its snapshot.

**`After=mointel-migrate` is already in place** on all three runtime units —
checked, not assumed — so ordering after the one-shot does not help. The race is
between the runtime units *with each other*, which that ordering does not
constrain.

**The better candidate, for a session that is not hours before an open:** return
early inside the lock when `fromVersion === SCHEMA_VERSION`, so an already-current
store is opened without a write transaction at all. Smaller than either option
previously listed. It has one real consequence to think through rather than
wave at: today a table or column added *without* a `SCHEMA_VERSION` bump is
silently created by `CREATE TABLE IF NOT EXISTS` on the next open. With an early
return it would not be — which makes the trap this charter already documents fail
loudly instead of quietly, and is probably an improvement, but it is a behaviour
change and not a no-op.

### Re-stating the decision, because the risk moved after it was made

**The call holds — and not for the reason I first gave.** I judged it as "the
wrong trade for a fault that self-heals", and I have since measured that it
self-heals *only while intermittent*. That reasoning no longer carries it.

**What carries it is that the trigger is transient and the restart is not
concurrent with it.** The race needs several services opening the store at once,
which happens only in the deploy's start burst. The 10-second restart fires
*after* that burst, when the others are up and idle — which is why every one of
the four occurrences has been a single crash with `NRestarts` 0 or 1, and never a
loop. **The 50-second cliff is real but requires a persistent cause, and this
cause is self-limiting by construction.**

The size of the fix is not the deciding factor either way. A one-line change to
the path that decides *whether a migration runs* is exactly the kind of change
that "it's only one line" has been wrong about before, and the store is the one
place where being wrong is unrecoverable.

## ~~The assessment worker dies on ~1 deploy in 3~~ (superseded above)

**`SqliteError: database is locked`, `SQLITE_BUSY_SNAPSHOT`**, thrown at
`migrate()` (`db.ts:734`) **inside** `withMigrationLock` → `openDatabase` →
`desk-assessments.ts:380`. The worker exits `status=1/FAILURE` on startup and
systemd restarts it ~10 s later. **It has happened three times.**

**The documented fix does not fully cover this.** Project memory records the
migration race as *fixed* by a one-shot `mointel-migrate` unit plus a
cross-process lock. The lock is in the stack and is working — it serialises
migrations. But `SQLITE_BUSY_SNAPSHOT` is a *snapshot* conflict, not a lock
conflict: it fires when a connection's deferred transaction tries to upgrade to a
write after another connection has written. Web and research restart alongside
`assess` and reopen the store; the migrating connection loses its snapshot. **A
lock that serialises writers does not prevent a reader from invalidating one.**

**Why it matters beyond a 10-second self-heal:** the recovery is only a recovery
because nothing was due. Had it landed on a checkpoint, the assessment would have
been missed, and **the append-only record only grows in real time.** Tonight it
crashed at 01:55:05 and `NEXT_DAY_RECAP` was due at **02:00** — a five-minute
margin, unplanned.

**Against my own record, and it is the fourth instance of the same error.** After
that deploy I reported *"all four services active."* True, and the wrong check
again: one of the four had crashed and been restarted inside the window I was
describing. I wrote *"state after starting cannot observe the manner of
stopping"* into this charter tonight and then checked state after starting.

**Not fixed, deliberately.** It is in `lib/market/store/db.ts`, which is this
thread's, but a change to the migration path hours before an open is the wrong
trade for a fault that self-heals. The candidate is to make the migrating
connection take an immediate write transaction, or to have the runtime units
wait on `mointel-migrate` completing rather than opening concurrently. **Check
`NRestarts` after every deploy from now on** — that is the field that carries the
answer, and `is-active` does not.

## The preflight earned its keep tonight

`0778533` was **refused**: `NEXT_DAY_RECAP is 0m away, inside the 5m protected
window`. Nothing shipped. **Not overridden** — deploying through the recap would
have restarted the assessment worker mid-checkpoint, which is the exact capture
risk, and the crash above shows that restart is not always clean.

The checkpoint then ran: **id 76, `2026-08-21 NEXT_DAY_RECAP`, `COMPLETE`,
scheduled 02:00, started 02:00, 25 tickers.** First observation of the preflight
protecting a real capture event rather than being reasoned about.

## State: production is `1d1d56b`, deployed 2026-08-24 01:55 UTC

Gated at that sha in the isolated rig — **1288 tests, 0 lint errors, build,
typecheck** — and shipped by explicit sha on Integration's instruction. Carries
the finished-bar filter in `readDailyBars`, so all four readers inherit **one**
definition of a finished bar rather than the overlay getting a second one.

Capture verified at directory scope before shipping: **zero** changes under
`lib/market`, `worker/alpaca.ts`, `worker/runtime.ts` or
`worker/desk-assessments.ts`; schema 21.

**Third sub-second stop: 01:54:48 → 01:54:48.** Three for three. `97f198d` is
confirmed rather than repeated. `RESEARCH_DISCOVERY_SEARCH_CONTEXT` verified
still absent from `/etc/mointel/mointel.env`. Market worker pid 129202,
`NRestarts=0`, no journal entries — capture untouched, ninth deploy.

**One lint warning, checked rather than passed:** `history.ts:139`
`'_fetchedAt' is defined but never used`. Benign — it is a destructure-to-omit,
`.map(({ fetchedAt: _fetchedAt, ...bar }) => bar)`, stripping the field so
callers get a clean `CycleBar`. Worth opening only because it sat in the file
whose entire purpose was this fix. `isFinished` uses `fetchedAt` correctly and
guards an unparseable stamp explicitly rather than leaning on a silent `NaN`.

## ~~UNRESOLVED~~ RESOLVED: both readings were true of what each measured

**The reconciling fact is a query parameter.** The review page does not call the
bare endpoint — it calls `/api/market?symbols=…` with its watchlist, and
`extraSymbols` bypasses the `rvol_rank IS NOT NULL` gate in `readDemandStates`.
Bare: 0 intelligence entries. With `?symbols=`: 6 entries, all carrying
`computedCycle`. Six populated and three not renders exactly as Design reported.

**And my nine were the pre-hydration state** — I read server-rendered HTML,
produced before that fetch. Both measurements were correct about different
things, which is the shape this thread named against itself twice tonight and
then walked into a third time.

**Design's corrected rule supersedes the earlier one:** not *"which endpoint
feeds a surface"* but **"which endpoint, and with which parameters."** An
endpoint's behaviour on a bare call is not its behaviour in the app.

### The loose thread closed: `"given back"` ×3 was the filter chips

I flagged three retracement phrases in HTML that had zero phase labels, as
evidence something was populated server-side. It was not. All three are **filter
chip tooltips** — `<button role="radio" title="Off the high, less than half the
move given back">`. Static control labels, not row data.

**That is the trap Design refused an hour earlier**, when it declined to count
`DAY 1` and `OFF HIGH` because they were chips rather than badges. Same trap,
different string, and I walked into it while checking someone else's work. A
string count over a page conflates controls with data; only a count over *rows*
means anything.

### ~~UNRESOLVED before Monday: the overlay's effect is not visible on the live board~~

**Design reported six of six checks passing at `7245320`. This thread cannot
reproduce it, and the numbers should be reconciled before the open rather than
during it.** Not an assertion that Design is wrong — it observed a rendered page
and may have caught a state that has since changed.

Measured 2026-08-24 ~01:5x UTC:

| surface | reading |
| --- | --- |
| review page, server-rendered HTML | `CYCLE NOT ESTABLISHED` ×**9**, `NO RUN` ×**0**, `143.7` ×**0** |
| `/api/market` via review token | `intelligence` entries: **0** |
| `/api/market` authenticated | `intelligence` entries: **0** |

Design reported `BACKSIDE` ×3, `NO RUN` ×3, `CYCLE NOT ESTABLISHED` ×3, with
OLOX at 143.7%. **Those cannot both describe the same moment.**

Three readings would reconcile it and this thread does not hold enough of the
read path to choose: Design observed before something cleared; the researched
table sources intelligence somewhere neither endpoint sees; or the nine rows
counted are not the same nine.

**Why it outranks the process error below:** if the overlay is not reaching the
researched table, "six of six" describes a state the board is not in, and
Monday's open is the discovery. If it *is* reaching it and the state simply
changed, then an intelligence projection that empties on its own is worth
understanding before premarket rather than during it — a plausible cause is
scoping to the trading date, which rolled to 2026-08-24 with no analyses today.

### My own error, and it was mine before it was the relay's

Integration took the blame for claiming a Discovery measurement about the
researched table. **It was mine first.** My words: *"neither can the two tests
that replaced Design's retired check 4 — the six phase names and the retracement
figure both need rows on the board."* I measured `discovery.rows: 0` and claimed
it of a surface fed by `market.intelligence` (`lib/dashboard/merge.ts:319`), a
different source from `dashboard?.research` at `:317`.

**And the sharper version:** `/api/market` returns `intelligence` **as a
top-level key beside `discovery`**. I read `discovery.rows`, found zero, and
never looked at the key next to it. The data that would have corrected me was in
the object I had already fetched.

### The healing check: per-symbol, because the aggregate cannot fail usefully

**The falling `fetched_at` count is withdrawn as the observable.** Research
caught it before it was run rather than after, which is the first time tonight
that happened. A *partial* fall is exactly what a working system produces on a
normal Monday — healing fires only on re-analysis, and only some symbols get
re-analysed — so the aggregate cannot separate **working** from **half-working**,
and either would have been read as success.

The unambiguous form conditions on the trigger. Written here rather than
requested, since this thread has the box and the schema:

```sql
with partial as (
  select symbol from daily_bars
  where trading_date = '2026-08-21'
    and date(datetime(fetched_at,'-4 hours')) = '2026-08-21'
    and time(datetime(fetched_at,'-4 hours')) < '20:00'
),
touched as (
  select distinct ticker from research_jobs
  where started_at is not null and date(started_at) = date('now')
)
select (select count(*) from partial) as friday_partial_now,
       (select count(*) from partial p join touched t on t.ticker = p.symbol)
         as partial_and_reanalysed_today,
       (select count(*) from touched) as reanalysed_today_total;
```

**~~Anything above zero is unambiguous evidence the healing branch did not
fire.~~** It is not. Integration caught the same failure the aggregate had, one
level down: `ensureDailyHistory` **reports failure rather than throwing** — its
own comment says cycle context is enrichment and must not fail a job whose
evidence collected fine. So a symbol can be claimed, reach the call, have the
**Alpaca fetch fail**, and still hold its partial row. A non-zero middle column
had two readings.

**And the log cannot separate them**, because `worker/research.ts:308` is
`if (history.fetched) log(...)` — conditional. A healed symbol logs; a
fetch-failed one and an already-current one are both silent. (`research-interpret.ts:153`
logs the same call **unconditionally** — same call, two workers, and the one
running in production is the quiet one.)

**The data separates them without the log.** `upsertDailyBars` stamps
`fetchedAt` on every row it writes, so a successful fetch leaves today's
timestamp behind whether or not the Friday row healed:

```sql
fetched_today as (
  select distinct symbol from daily_bars
  where date(datetime(fetched_at,'-4 hours')) = date('now','-4 hours')
)
-- then split the middle column:
--   partial ∩ touched ∩ fetched_today      -> fetch SUCCEEDED
--   partial ∩ touched, not in fetched_today -> NO fetch
```

**How to read it Monday:**

| reading | meaning |
| --- | --- |
| middle column **0** | healing works — done |
| **>0**, `fetch_SUCCEEDED` | rows were stored today and the Friday partial survived → **the healing branch did not fire.** The finding. |
| **>0**, `NO_fetch` | nothing stored → **the fetch failed.** A different problem, and not evidence about the guard. |

The skip cannot explain the third case for these 42: their Friday row fails
`isFinished` (`history.ts:78`), so the guard will not short-circuit them.

Baseline, validated tonight: **42 / 0 / 0 / 0** — the correct closed-market
reading.

### Two definitions of a usable daily bar, and the read path has none

Sharpening my own observation with Integration's cause. `ensureDailyHistory` now
carries an explicit test for a trustworthy bar — `fetchedAt >=
sessionEndUtc(tradingDate)`. **`overlayLiveCycle` carries none:** it takes
`readDailyBars(db, ticker)` and computes, with no finished check at all.
Confirmed at the live code. Two definitions written four commits apart the same
night, one in the write path and none in the read path.

**The dated consequence, to expect rather than to fix:** board render and
re-analysis are independent, so from Monday's open those 42 names render a cycle
computed from an **unfinished Friday session** until each is re-analysed and
healed. Wrong, and with no tell — `latestDate` reads `2026-08-21`, a prior date,
so my own discriminator passes it. Research owns the fix.

### The 133 are unchanged, and that is a separate fact

Still 133. The overlay computes from **whatever bars are stored, including
partial ones**, so a populated cycle column is *not* evidence the poisoned rows
are repaired. They heal only on research contact, at Monday's first re-analysis.
**The `fetched_at` count is still the only thing that answers that**, and for the
42 Friday-partial symbols the overlay will compute from a partial bar whose
`latestDate` is a prior date — which my own discriminator does not flag.

## ~~State: production is `c48e199`, deployed 2026-08-24 01:30 UTC~~ (superseded)

Gated at that exact sha in the isolated rig — **1273 tests, lint, build,
typecheck** — and deployed by explicit sha. Carries Design's cycle-vocabulary
re-cut (`a5a3a98`), Research's partial-bar guard, and the healing that repairs
what the guard inherits.

**The SIGTERM prediction held, and it was falsifiable.** `Stopping…` at 01:30:27,
`Deactivated successfully` at **01:30:27 — under a second**, against 31 seconds
and a `SIGKILL` on the previous deploy. `97f198d` is verified in production, on
the deploy after the one that shipped it, exactly as predicted. The observable
was the **stop duration in the journal**, not the service state afterwards.

**Capture untouched, seventh deploy running.** `mointel-market` pid 129202,
`NRestarts=0`, start still 2026-08-23 01:27:36 UTC, no journal entries in the
window. Still on `fd9556f`, held by the pin — prune removed `f383ddd`.

**The healing is deployed but not yet exercised.** The 133 poisoned rows are
still present, which is correct: `ensureDailyHistory` heals on contact, and
nothing has contacted them because research is idle on a closed market. **They
repair on Monday's first re-analysis of each symbol** — including the 42 Friday
rows that are every symbol whose latest bar is Friday. Re-run the `fetched_at`
query after premarket to watch it fall.

## Deploy authority

**The trader delegated deploy instructions to Integration on 2026-08-24.** His
words: *"deploy — and you can accept deployment instructions from Integration."*

So a deploy relayed by Integration is now actionable without returning to him.
What has **not** changed: the gate still runs at the sha that ships, capture is
still verified at directory scope before shipping, and anything outside a deploy
— spend, auth-model changes, destructive actions — still goes to him. The rule
that a relay cannot answer a question already put to him held for a full night
and cost one word each time; this replaces it for deploys only, by his decision
rather than by inference.

## ~~State: production is `161f15f`, deployed 2026-08-24 00:16 UTC~~ (superseded)

Deployed by explicit sha, not `HEAD` — the first release under that rule. Gated
in an isolated worktree at that exact sha with real dependencies: **1261 tests,
lint, typecheck and build**. Trader named the sha himself.

Carries `102a1fc` (ceilings on the two unbounded fetches — **verified live on the
box**: `SHEET_TIMEOUT_MS` present, `REQUEST_TIMEOUT_MS = 30_000`) and `97f198d`
(the SIGTERM fix), plus Design's cycle cutover, which is additive — both cycle
values coexist and nothing on the board depends on the new one yet.

**The predicted SIGKILL happened, on schedule, and is the last one.** Research
stopped 00:16:07 → killed 00:16:38: **31 seconds**, `stop-sigterm` timed out,
`Failed with result 'timeout'`. Exactly as Research predicted before the fact —
the running process held the old handler. `process.on('SIGTERM', () =>
shutdown('SIGTERM'))` is now in the deployed tree **and in the running process**,
so **the next deploy is the test**: under a second means the handler ran.

**Capture untouched, sixth deploy running.** `mointel-market` pid 129202,
`NRestarts=0`, start still 2026-08-23 01:27:36 UTC, no journal entries in the
deploy window. Still on `fd9556f`, held by the pin — prune removed `28c7f12`
this time and printed `keep fd9556f (pinned)`.

No migration: schema 21 both sides, migrate wrote 0 backups.

## The store is already poisoned: 133 partial bars, and 42 of them are Friday's

Nobody had checked whether the defect had already written bad rows — item 16 said
only that it "has not bitten", which is a claim about consequence. The column to
answer it already existed: `daily_bars.fetched_at` (`db.ts:390`). A row whose
`trading_date` equals the ET date of its own `fetched_at`, fetched before 20:00
ET, was stored mid-session. Read-only against production, 2026-08-24:

| trading_date | rows stored mid-session | earliest ET | latest ET |
| --- | --- | --- | --- |
| 2026-08-17 | 13 | 10:18 | 17:01 |
| 2026-08-19 | 31 | 10:00 | 18:17 |
| 2026-08-20 | 47 | 10:00 | 18:04 |
| **2026-08-21** | **42** | 09:35 | 18:24 |

**133 rows, 133 symbols. And the 42 on Friday are exactly the 42 symbols whose
latest bar is Friday — so every symbol holding a Friday bar holds a partial
one.**

### The guard is preventive, and that leaves a gap on Monday

Traced through `952f9e1` rather than assumed. At Monday premarket
`lastSettledTradingDate` walks back — Monday's session has not ended, Sunday and
Saturday are skipped as weekends — and returns **2026-08-21**. For those 42
symbols `stored` is also `2026-08-21`, so `stored >= settled` is **true** and
`ensureDailyHistory` **does not refetch**. Their partial Friday bar stands all
Monday, and any cycle computed for them uses it. It self-heals Tuesday, when
`settled` moves past 2026-08-21.

**And my own `latestDate` discriminator does not catch this.** That test flags a
row whose `latestDate` equals the *current* trading date. Here `latestDate` is
`2026-08-21` — a prior date — so it reads as clean. The guard makes the remaining
contamination **quieter**, not louder.

This is not an argument against shipping it. Without the guard, Monday's refetch
would fix Friday and poison Monday, locking for the day and recurring daily; with
it, Friday stays stale one extra day and nothing new is poisoned. The guard is
clearly right. The gap is worth knowing rather than meeting.

### ~~The improvement the guard is one column away from~~ — already built, fifteen seconds before I wrote it

I proposed using `fetched_at` to make the guard self-correcting. **Research had
committed exactly that fifteen seconds earlier** (`e9e0a9e` at 03:16:44, this
thread's `c48e199` at 03:16:59), having reached it from the other end — that a
partial *Monday* bar survives all of Tuesday under `stored >= settled`.

Verified at the lines rather than accepted. `latestDailyBar` now returns the
write time as well as the date, and the skip requires **both**:

```js
stored.tradingDate >= settled &&
Date.parse(stored.fetchedAt) >= sessionEndUtc(stored.tradingDate).getTime()
```

A bar written before its own session ended fails the second condition **whatever
date it carries**, so it is refetched and `upsertDailyBars` overwrites it on
conflict.

**So three things I wrote one section above are no longer true**, and they were
true of `952f9e1`:

- ~~the guard makes the remaining contamination quieter rather than louder~~
- ~~Friday stays stale one extra day~~
- ~~my `latestDate` discriminator does not catch it~~ — the *case* is gone

**What survives, and it is the load-bearing half:** this thread is the only one
that established the defect **actually fired**, and its shape — 133 rows across
133 symbols, with the 42 Friday rows being exactly the 42 symbols whose latest
bar is Friday. That makes the healing path not a nicety but **load-bearing on
Monday**: without it, every symbol carrying a Friday bar would have computed its
cycle from a partial one.

**And the limit of my discriminator stays written down even though this fix
removes the case that exposed it:** `latestDate` flags a partial bar dated
*today*. It reads clean on a partial bar dated *earlier*. That is a property of
the test, not of the bug it happened to miss.

**Recommendation reversed a third time, to NOT running it.** He asked why call
Alpaca for 231 when only the tickers that reach the app matter. Verified here:

- **`resolveCycleHistory` has exactly one call site outside its own module** —
  `lib/research/interpret/pipeline.ts:365` — and it sits *inside* the
  accepted-analysis path, after the model call. **There is no model-free way to
  write `computedCycle` today.** So ~2.6M input tokens buy a full model
  interpretation per symbol purely to reach one arithmetic assignment. The cycle
  itself is a pure function over daily bars and costs nothing.
- **The value decays.** `pipeline.ts:194` returns `existing.dossier` on the reuse
  path, so a backfilled cycle refreshes only when the *evidence* fingerprint
  moves — filings, not price. A cycle written tonight from Friday's bars sits on
  the board until a filing lands, while the price it describes moves daily.

So the spend buys a value the model does not produce, which then freezes. And
`latestDate` discriminates a stale one just as well as a partial-bar one — a row
stamped `2026-08-21` on Wednesday is visibly stale.

### The constraint on the read-time fix, which is this thread's to state

Read-time computation is right and it is in **`lib/market/store/researchRepo.ts`,
this thread's module since the 2026-08-24 split**. One thing must not be lost
between "compute at read time" and building it:

**Two constraints, both to be held at review. Neither is Research's to remember
for me.**

> **1. Compute at read time. Do NOT fetch at read time.**

`daily_bars` is already in the store, and the cycle is a pure function over it —
so the read path can compute freely. But *fetching* bars on a read would put
network I/O in a path the dashboard polls **once a second**
(`deploy/aws/nginx-locations.conf` documents the keepalive pool for exactly that
rate). At 1 Hz against Alpaca that is a rate-limit incident, on the budget the
market worker shares.

Keeping `daily_bars` current is a **worker** responsibility, not a read-path one.
That separation is the whole reason the read path is cheap enough to be the right
answer. Worth stating now because "bars would be fetched for names actually read"
is a natural way to describe it and a dangerous way to build it.

> **2. A read-time cycle must carry an as-of, or historical reads gain
> look-ahead.**

`pipeline.ts:362` bounds the bars it computes from — `bar.tradingDate <=
options.asOf` — and says why: *"a replay that resolved the cycle against today's
bars would know how the move turned out."* **A read-time computation has no
`asOf` by default**, and that is correct for the live board, which should resolve
as of now.

It is wrong for anything reading the past. `desk_assessment_tickers` stores
`analysis_version_id`, so a historical assessment read through a read-time cycle
would show a cycle computed from **today's** bars — the assessment would appear
to have known how the move turned out. That is the same look-ahead R&D already
guards against in the replay path, arriving through a different door.

So the rule is not "bound it" or "don't" — it is **bound it to what is being
read**: as-of now for the live board, as-of the assessment's own date for a
stored one. Raised by Integration from Design's question about what
`desk_assessments` archives; the Changes rail itself is clear, since
`cycle_fingerprint` is a bucketed live-tape hash and not `computedCycle`.

## The backfill scope: ~~148 is the worst of the three~~ (superseded above)

**Correction to my own option first.** I offered "don't run it" partly as *the
safer board*. That half was wrong. The backfill stores bars whose max is
**2026-08-21** — there are no weekend daily bars — and UTC today is
**2026-08-24**, so `latestDailyBarDate === today` is false and Monday's live
re-analyses refetch exactly as they would have. **The backfill neither causes nor
prevents the partial-bar lock-in.** All three options carry identical exposure.

**~~What survives is a legibility argument~~ — also retired, and this one was
worse.** I argued that backfilled-correct and Monday-possibly-wrong cycles are
*indistinguishable*. They are not, and **the discriminator was already stored**.

Verified at the lines rather than accepted: `CycleArc.latestDate`
(`lib/market/cycle.ts:143`) is assigned `latest.tradingDate` (`cycle.ts:330`),
carried through `CycleResult` → `CycleHistory.current` (`cycle.ts:215`, `365`) →
`computedCycle`, and the dossier is `JSON.stringify`d wholesale, so it persists.
So every dossier records **the trading date of the last bar its cycle was
computed through**. Tonight's are stamped `2026-08-21`; one computed Monday
against a partial bar is stamped `2026-08-24`.

**Its limit, which matters and should not be dropped:** `NO_CYCLE` carries no
`latestDate`, so this is *every row with an arc*, not every row. Sufficient here
— a row with no cycle cannot show a wrong one.

**Stated precisely, because overclaiming it is how I got here:** *during* a
session, a row whose `latestDate` equals the current trading date was computed
against an unfinished bar. After the close it is not suspect — the UTC date rolls
at 20:00 ET, so a late-evening computation legitimately carries that day.

**How I was wrong is worse than the earlier instances.** Those measured one thing
and asserted another. This asserted a **negative — "nothing tells them apart" —
without looking for anything at all.** Research's framing is the one to keep:
*before concluding two states are indistinguishable, check whether the data
already separates them.*

**So both arguments behind "don't run it" are gone.** The safety half died with
the inoculation finding, this half with the discriminator. What remains behind
not running it is **token cost, and nothing else**.

**And Research's argument for 231 is the same shape pointed the other way:** a
*partially* populated column is worse than either extreme, because a trader
seeing a cycle on some rows and not others infers something about the rows
without one — and the truth would be *"that name was not on a list drawn up at
one in the morning"*.

**Where that leaves the scope, after both of my arguments were retired.**
Research's argument stands untouched: a *partially* populated column invites a
trader to infer something from the blanks, when the truth is that the name was
not on a list drawn up at one in the morning. Nothing has contradicted it.

**So the recommendation is 231**, and the only remaining question is contention,
which is this thread's: 231 Alpaca REST calls against a budget nothing else is
using — the worker's calendar refreshed 00:34 UTC and nothing is due until
~20:34 — plus store writes through a fourth concurrent writer at `busy_timeout`
5000 ms. Acceptable, on a closed market, run alone after the deploy.

*Cost of that: 231 puts ~2.6M in / 0.9M out through the model, 231 Alpaca REST
calls, and more store writes through a fourth concurrent writer at
`busy_timeout` 5000 ms. The contention judgement is this thread's; the spend is
the trader's.*

## Tonight's deploy made a latent bar hazard live, and Monday is inside it

**Raised to escalate Integration's "not urgent before Monday". I think it is
Monday.** Recorded so the judgement is visible rather than assumed either way.

The mechanism is confirmed at the lines. `latestDailyBarDate` is
`MAX(trading_date)` (`lib/research/history.ts:103`); the guard compares it to
`new Date().toISOString().slice(0,10)`, a **UTC** date
(`lib/research/historyFetch.ts:32`). So if a partial current-day bar is ever
stored, `MAX` equals today, **every later call answers "already current"**, and
the day is poisoned until the **UTC** date rolls — 20:00 ET, not a session
boundary. A corrective pass cannot reach it.

**Why tonight changed it.** This was latent while nothing re-analysed mid-session
with a cycle depending on the bars. `computedCycle` shipped in `161f15f` a few
hours ago. From Monday's open, research re-analyses moving names, each call runs
`ensureDailyHistory`, and no symbol holds a bar dated today — so it fetches.

**What is NOT verified, and it decides the size:** whether Alpaca returns a
partial `1Day` bar during premarket. It cannot be tested now — the market is
closed, so a call tonight proves nothing about 08:00 UTC. If it does, **the first
re-analysis after bars begin forming poisons the whole day**, for exactly the
names the desk cares about, since those are the ones being re-analysed.

**Why that is worse than the blank column the backfill is meant to fix.** A blank
reads `CYCLE NOT ESTABLISHED` — it says nothing. A cycle computed against a
partial bar reads as a real answer: retracement measured against a high still
forming, relative volume understated, a cycle start possibly missed. **A
plausible wrong number on the trader-facing board is the failure this desk is
least able to absorb.**

And the two cannot be told apart on the board: backfilled names would carry
correct cycles computed tonight on complete bars, Monday's re-analysed names
might carry wrong ones, and nothing distinguishes them.

**This does not argue against the backfill** — its values are correct, computed
before 08:00 UTC on complete bars. It argues that the read-time fix may deserve
to be Monday's first job rather than next session's, and that someone should
check what Alpaca actually returns at 08:00 before trusting a fresh cycle value.

## The cycle backfill: checked for capture risk, and it is a free WAL experiment

A forced re-analysis over the dossier set runs tonight to populate
`computedCycle`. It writes to the production store, hours before premarket, so it
was checked here rather than accepted as "dossiers only" — which is a claim about
*tables* and not about the things that actually bite.

**Alpaca REST: not a risk, and this was the live one.** A forced interpret calls
`ensureDailyHistory` per symbol (`worker/research-interpret.ts:152`), which
reaches `rest.getBars()` on the same budget the market worker uses — the budget
that threw `rate limited` and a calendar `503` on Friday. Measured:

| dossier tickers | already have daily bars | would fetch from Alpaca |
| --- | --- | --- |
| 231 | **230** | **1** |

~~So it short-circuits on *already current* for all but one.~~

**WRONG, corrected 2026-08-24 — and it is the same error a third time.** The
short-circuit is `latestDailyBarDate(db, symbol) === today`
(`lib/research/historyFetch.ts:33`) — **today's date**, not *has bars at all*. No
symbol holds a bar dated today, so **all 231 fetch**, not one. I measured
*presence* and asserted *currency*.

And the refresh is not a side effect, it is load-bearing. Only **42 of 256**
symbols hold Friday's bar:

| latest bar | symbols |
| --- | --- |
| 2026-08-21 (Fri) | 42 |
| 2026-08-20 | 80 |
| 2026-08-19 | 55 |
| 2026-08-18 | 63 |
| 2026-08-17 | 16 |

So three quarters of the set would compute a cycle against Wednesday's data or
older. **Anything that skips `ensureDailyHistory` computes cycles on stale
bars, silently.**

**Disk: not a risk.** 67 G free, WAL at its existing high-water.

**Worth knowing:** the store gains a fourth concurrent writer for the duration.
`busy_timeout` is 5000 ms and `openDatabase` holds a cross-process lock, and
`database is locked` was a real incident with three writers — so this is small
but not zero, and it is the reason nothing may go near `mointel-market` or
`mointel-assess` while it runs.

### The free part

**It is a write-burst load test for Open item 2, and it costs nothing.** The WAL
question is whether checkpoints keep up under load; a 231-analysis burst is load,
with the dashboard idle. That is not the same as premarket *reader* contention
and does not replace Monday's sample — but it isolates the write half, which
Monday's sample cannot.

**Baseline taken before it runs: WAL exactly `531,574,792` bytes**, unchanged
from 2026-08-23. Read it again after:

- **unchanged** → checkpoints absorbed a 231-write burst without the file
  growing, which is the strongest evidence yet that 507 MB is a high-water mark
  and not a leak
- **grown** → checkpointing falls behind under write load *alone*, before readers
  are even involved, and Monday's premarket reading is likely to be worse

Either result is worth more than the column it was run for. **Note also that a
grown high-water changes the 507 MB baseline recorded elsewhere in this
charter** — Monday's sample is about flat-versus-growing, not the absolute
number, but the number in the record will be stale.

## Monday 04:00: what an empty cycle column means, and the number to expect

**Every name with a dossier will read `CYCLE NOT ESTABLISHED` when the board
populates. That is expected and it is not a regression.** `34c720f` shipped
inside `161f15f` and deliberately does **not** fall back to the model's cycle —
falling back would keep alive the field Research is about to delete. So a dossier
written before `computedCycle` existed has no cycle to show.

**Measured rather than described, because "noticeably fewer" and "none" are
different mornings.** Read-only against production after the deploy:

| current dossiers | with `computedCycle` | will read NOT ESTABLISHED |
| --- | --- | --- |
| 231 | **0** | **231** |

Not some. All of them. A board with an entirely empty cycle column at 04:00 is
the *correct* state, and anyone who has not been told will read it as the cutover
having broken the column.

**One correction to how this reached here:** it was attributed to the empty
OpenAI balance. The balance was topped up hours ago. Nothing is re-analysing
because the market is closed — so this begins clearing on its own once the board
populates and jobs enqueue.

### ~~It is also the progress meter this thread was missing~~ — WITHDRAWN, and it was a false positive waiting to happen

**Do not use the `computedCycle` count as a progress meter.** I proposed it an
hour after the deploy and Research found the defect that invalidates it before
Monday, which is the only reason it is being withdrawn on paper rather than
during an incident.

`computedCycle` is set at `lib/research/interpret/pipeline.ts:365` — **after the
model call.** The reuse path returns at line 190 (*"Unchanged evidence: reuse. No
bundle is even built."*). Verified here, not accepted. **So a name whose evidence
fingerprint has not changed never gains a computed cycle at all.**

The count therefore does **not** run 0 → 231 as research works. It rises only for
names whose *evidence* changed, which is a small subset. Which means:

> **Flat at 0 with a non-empty queue is the expected reading of a WORKING
> system**, not the STALLED condition.

That is the exact false positive that costs an incident, because every other
signal at 04:00 would have been consistent with it. I would have read a healthy
desk as a stalled worker and gone looking.

**My error, and it is the same family as all the others.** I measured that 231 of
231 dossiers lacked the field — true — and then asserted *why*: that they would
gain it on re-analysis. **The count was measured; the mechanism was assumed.**
What was measured is "231 dossiers have no `computedCycle`". What I said was "it
will rise as research works". Different sentences, one checked.

**Monday is two instruments, not three:** the WAL sample under real write
pressure, and `messageAgeSeconds` coming off `null`. Both unaffected.

**The blank cycle column is still expected — but indefinitely, not until Monday's
re-analysis.** That correction matters more than the meter did.

*The deeper defect is Research's and is worth knowing here because the fix lands
in this thread's module: a **price-derived** quantity was gated behind an
**evidence-change** check. A stock's cycle moves with price every session; its
filings do not. So even names that do re-analyse freeze their cycle at whatever
it was when the last filing landed. The structural answer is to compute it at
**read** time — a pure function over daily bars that should never have been
frozen into an append-only store — which touches
`lib/market/store/researchRepo.ts`. Scheduled next session, structural, no
mitigation pass; a forced re-analysis would spend tokens on a cosmetic column for
one morning and would not touch the staleness.*

## Gate the sha, not the tree

**Six threads commit to this repo. The working tree is not yours and `HEAD` moves
while you measure.** On 2026-08-23 a gate was reported green and `HEAD` had moved
**twice** before the ship decision — the second move brought in a surface switch
that was uncommitted when the gate started. A green result on a tree you do not
control proves nothing about the sha you would ship, and a red one sends you
hunting a defect in somebody else's half-finished work.

**The method:**

```bash
S=<scratchpad>/gate-$(git rev-parse --short HEAD)
git worktree add --detach "$S" HEAD          # pinned, immune to the main tree
cmd //c mklink //J "$(cygpath -w "$S")\\node_modules" "$(cygpath -w /a/mointel)\\node_modules"
cd "$S" && npm test && npm run lint && npm run typecheck
```

Then **remove the junction with `cmd //c rmdir` BEFORE `git worktree remove`** —
a recursive delete would follow it and take the real `node_modules` with it.
Verify the package count after.

**Two things it does not do, both found by doing it:**

- **`npm run typecheck` fails on a fresh worktree** with `Cannot find name
  'LayoutProps'` until a build has generated `.next/types` — `tsconfig.json`
  includes `.next/types/**/*.ts`. That is an artifact, not a defect. Build first,
  or read that specific error as noise.
- **`npm run build` cannot use the junction.** Turbopack refuses it outright:
  *"Symlink [project]/node_modules is invalid, it points out of the filesystem
  root"*. **Closed 2026-08-24 by `npm ci --prefer-offline` in the worktree** —
  exit 0, 370 packages, no native rebuild trouble, and the full four-gate run
  then passes including the build. Use the junction for a fast tests-only check;
  use `npm ci` when the build has to be gated too.

**The rig is reusable, which matters when `HEAD` moves every few minutes.** Once
a worktree has real `node_modules`, re-point it with `git -C "$S" checkout
<sha>` and re-gate without reinstalling. `HEAD` moved three times during one
gating session on 2026-08-24; a rig that survives that is the difference between
gating a sha and chasing one.

**The cheap substitute for the build**, when the sha is close to one already
built: `git diff --stat <last-built-sha>..<target> -- . ':!docs' ':!tests'`. If
that is empty, the build result carries. It carried on 2026-08-23 — two
docs-only commits.

## Read this before the next deploy: one expected failure, and its observable

**The deploy that ships `97f198d` will SIGKILL the research worker one last
time, and that is not the fix failing.** Predicted by Research before the fact
rather than discovered after; verified here rather than accepted — `git
merge-base --is-ancestor 97f198d 5ee47d8` returns false, so the process running
now was started from a release without the fix and **holds the old SIGTERM
handler in memory**. A fix to shutdown behaviour cannot apply to the shutdown of
the process that predates it.

So expect `State 'stop-sigterm' timed out. Killing.` on that deploy. **The test
is the deploy after it**, and a fourth identical line would otherwise have read
as a fourth identical failure and cost someone an investigation.

**The observable is the stop duration in the journal, not "four services active"
afterwards.** Under a second means the handler ran; thirty seconds means it did
not. That distinction is this thread's own lesson from earlier today — state
after starting cannot observe the manner of stopping, which is exactly how three
SIGKILLs went unnoticed while every deploy report said all four services were up.

**The general form, and it is the same fact twice in two layers:**

> **A deploy changes what *will* run, not what *is* running.**

The release drift fixed at 01:27 was a cwd resolved at process start that
survived two deploys. This is a signal handler resolved at process start that
survives the deploy replacing it. Whenever a fix concerns startup or shutdown,
**the process that must demonstrate the fix is by definition not the one
carrying it.**

One capture-adjacent note, checked at the construction site rather than assumed:
`102a1fc` touches `lib/data/providers/googleSheets.ts`, which the Next app
imports at `lib/data/index.ts:16`, so the web app restarts too. That is a
dashboard blip, not a capture interruption — and `lib/data/index.ts:60`
constructs the provider with **no options**, so the dashboard keeps
`timeoutMs ?? null` and its behaviour is unchanged. The ceiling is opt-in and
only the worker opts in.

## Before the cycle deletion ships: it throws inside the assessment worker

*Found by Design, routed by Integration, traced here because it is this thread's
worker and this thread's capture record. **Not in `c48e199`** — this is about a
commit that has not been written yet.*

`worker/desk-assessments.ts:274` writes the checkpoint cycle as
`dossier?.cycle.cycleClassification ?? null`. The optional chain guards
**`dossier`, not `cycle`**. With `dossier` present and `cycle` deleted,
`.cycleClassification` is a `TypeError` and the `?? null` never runs. Nothing
warns at the call site, because `cycle: CycleFindings` is non-optional at
`types.ts:550` — the type says it cannot be absent, so the compiler agrees.

**The question Integration left open was whether the process survives. It does.**
Traced: the throw is inside `captureAssessment` (`:171`), before
`insertAssessmentTickers` (`:595`). `runAssessment`'s guard (`:545`) marks the
row `FAILED` with `tickerCount: 0` and **rethrows** (`:569`). That propagates to
`main()`, whose loop is `for (;;) { try { … } catch }` with the catch at `:486`
— it logs `[assess] cycle failed`, writes health `state: 'ERROR'`, and
**continues to the next iteration.**

So: **you lose checkpoints, not the worker.** The distinction matters because the
remedies differ — a dead worker needs a restart, a failing one needs the fix and
keeps burning checkpoints until it lands.

**Two things make this louder than the research stall was**, which is the useful
comparison: the assessment row is written `FAILED` with the error in `notes`, and
`assessments.state` goes to `ERROR` on `/api/health`. Unlike a hung research
worker behind a fresh heartbeat, **this one announces itself.**

**But the damage is permanent while it lasts.** It fires for every ticker
carrying a dossier, at every checkpoint, so every checkpoint in that window
records `FAILED` with no ticker rows. The append-only record only grows in real
time — a checkpoint not captured is gone, and no later fix recovers it. That is
the reason to see this before the diff rather than in it: **it would arrive
inside a commit whose subject is about deleting a research field, and nothing
about that subject line says capture.**

## The `search_context_size` experiment: the window, and why it is not a deploy

Approved by the trader. Alternate `RESEARCH_DISCOVERY_SEARCH_CONTEXT` between
`low` and unset across 4–6 trading days, zero marginal token cost, outcome
measured on citation rate. Discovery is **56% of the desk's input tokens**, so
this is the largest cost lever identified.

**The flag is read once**, at `worker/research.ts:91` in `main()`, before the
loop — verified, and `readResearchConfig` appears nowhere else. **So every flip
needs a `systemctl restart mointel-research`.**

**The window, which is this thread's call: 22:15 ET, ~15 minutes after the
recap.** Clear of the checkpoint guard in both directions, and 8 hours before
`STRUCTURAL_REFRESH` at 06:10 ET — the longest quiet stretch the schedule has.
Setting it the previous evening covers the whole next trading day, because the
value is read at process start.

**Never at the start of a trading day.** Premarket puts checkpoints minutes
apart, which is the window already identified as the worse one for any restart.

**It is materially safer than a deploy, and should not be priced as one.** The
`BUSY_SNAPSHOT` race needs several services opening the store at once, which
happens only in a deploy's start burst. A single `systemctl restart
mointel-research` produces no burst.

**One correction to the protocol, which nobody raised:** a mid-day *deploy* is
harmless to the experiment. Research restarts and re-reads the env file — but
re-reads the **same value**, so it re-applies rather than changes. The only
confound is editing the env file mid-day, which the protocol already forbids.

**Record beside every flip:** the date, which setting was live, and **`NRestarts`
after the restart**. Without the third, a crashed-and-recovered worker on an
experiment day is indistinguishable from a clean one — and `is-active` cannot
tell them apart, which this thread established the expensive way.

**Not started.** The delegation the trader gave covers *deployment* instructions;
this is a production config change with a multi-day protocol, which is adjacent
but not the same thing. Put to him rather than stretched.

## Before the 21 → 22 deploy: checked in advance, and one instruction inverted

Research's deep-history work adds `daily_bars.split_factor` and moves
`SCHEMA_VERSION` to **22**. Both are in `lib/market/store/`, this thread's module.
Checked while nothing was shipping.

**The migration path is correct — both halves present**, which is the trap this
charter names (*editing a `CREATE TABLE` migrates nothing*):

- `split_factor REAL` in the `CREATE TABLE` (`db.ts:395`) — covers a new store
- `{ table: 'daily_bars', column: 'split_factor', definition: 'REAL' }` in
  `ADDED_COLUMNS` (`db.ts:603`) — covers an existing one
- `SCHEMA_VERSION = 22`

### The health version-mismatch window does not exist — so a mismatch is an incident

I was asked to *"decide in advance what the health mismatch means during that
window"*. **There is no window.** Both start paths order migration before
anything that serves health:

- **`deploy.sh`** stops the runtime units, migrates, and only then starts them —
  with `fail "schema migration failed — nothing was started against it"`.
- **systemd**: `mointel-web`, `-research` and `-assess` are each `After=` **and**
  `Requires=mointel-migrate.service`, so a reboot orders the same way.

During migration `mointel-web` is **down**, so health does not answer at all —
it does not answer *with a mismatch*. By the time it responds, store and build
are both 22.

> **So the instruction inverts: a version mismatch on `/api/health` should never
> appear, and if it does it is a genuine fault rather than a known transient.**

Worth the check for a reason tonight keeps demonstrating: being told to expect a
red signal is how a real one gets waved through.

### The v21 backup does not exist yet — and the 22 deploy is what creates it

Backups on disk: **v14, v15, v16, v17, v18, v19**. The store is **v21**. So
there is no v21 restore point today, and `market-worker-release` (`fd9556f`,
schema v21) carries `backup=none`.

That is fine *now* — the store is v21, so rolling back to a v21 build needs no
restore. **It stops being fine the moment 22 ships**, because an older build
refuses a newer `user_version`.

**It self-closes, and that is the thing to watch.** `openDatabase` calls
`createSchemaBackup` when `fromVersion > 0 && fromVersion < SCHEMA_VERSION`, so
migrating a v21 store to 22 writes `market-v21-<stamp>.db` as part of the deploy.

> **The observable for the 22 deploy is the migrate line: it must read
> `1 backup(s) written`, not `0`.** Every deploy so far has said **0** because no
> version changed. If it says 0 on the 22 deploy, the migration did not take the
> backup and there is no v21 rollback path at all.

After 22 ships, the only backed rollback target is `rollback-baseline`
(`372f5eb`, v18) — three schema versions back. `market-worker-release` remains
what its own reason says it is: a **directory-preservation** pin keeping the
running worker's cwd alive, not a rollback target.

## Reaching another thread: use `list_sessions`, not `ListAgents`

Tested 2026-08-25 because Integration became unreachable and the charter's
instruction turned out to be wrong. **Results, mechanism first:**

| attempt | tool + address | result |
| --- | --- | --- |
| reply path | `SendMessage`, `to:` the `from` attribute of an incoming message | **FAILS** — *no agent named … is reachable* |
| by session id | `SendMessage`, `to:` a raw `local_…` id | **FAILS** |
| by name | `SendMessage`, `to: "Integration"` | worked all night, **then stopped** when the name left `ListAgents` |
| **unprompted, by id** | **`mcp__ccd_session_mgmt__send_message`** with `session_id` | **WORKS** |

**`SendMessage`'s own documentation is wrong here** — it says to copy the `from`
attribute as the `to`. That path does not resolve on this machine. What actually
worked all night was *name* matching against `ListAgents`, which is not a reply
channel at all; it quietly stopped resolving when the peer's row changed.

**The directory with the titles is
`mcp__ccd_session_mgmt__list_sessions`.** It returns `sessionId`, `title`, `cwd`
and `lastActivityAt` — Integration, Research, Coaching, Design, R&D, all under
`A:\mointel`. **`ListAgents` shows only opaque handles** (`mointel-8c`,
`claude-1a`, …) that map to nothing.

> **To reach a thread: `list_sessions` for the id, then
> `session_mgmt send_message`. Unprompted sends work.** The rule that threads
> ping Integration on finishing is viable; it just needs this pair.

**One trap found by testing rather than reasoning:** Integration supplied its own
session id in the message body and it was **wrong** — the directory gives
`local_15e66a31-…`, matching the `from` on its own messages, not the
`local_f33dbb08-…` it quoted. Had I trusted the supplied id, the test would have
failed for the wrong reason and I would have reported *"unprompted does not
work"* — the correct answer to a question nobody asked.

## State: production is `260a8ae`, deployed 2026-08-24 23:16 UTC

Gated at that sha with a fresh `npm ci`: **1351 tests**, lint, build, typecheck.
Carries `stalledJobs` onto the health allowlist and the Coaching fills pipeline.
Capture surface zero; `package-lock.json` untouched (the `package.json` delta is
two script entries).

**`stalledJobs: 10` is now on `/api/health`** — the expected reading, matching
what was measured in the store this morning, and the last hop is closed.

**Seventh clean stop** for research, 23:16:00 → 23:16:00. `NRestarts` 0 on all
four.

### Three checks on a new category of data, and one is stronger than the rule

`lib/coaching/fills/` handles personal financial records, so the charter rule —
fills go in the database or a gitignored directory, never the repo — got a
one-time check rather than a routine one:

- **`DEFAULT_FILLS_PATH` is `~/.mointel-fills/fills.db`** — the user's home
  directory, **outside the working tree entirely**, not merely a gitignored
  subdirectory. `git ls-files` matching *fill* returns source only; `data/` is
  untracked. **`git archive` cannot carry a fills file.**
- **Neither new worker gets a systemd unit** — `grep` over `deploy/` is empty, so
  they are CLI-only and no unit changed during a deploy.
- **`package.json` is scripts-only** and the lockfile is untouched, so `npm ci`
  on the server is unaffected.

### A deploy restarts every runtime service, whatever the payload touched

Expected here that research would *not* restart, since `worker/research.ts` was
unchanged. **It restarted anyway.** `deploy.sh` stops and starts all runtime
units regardless of whose files moved. **The payload's file list does not predict
which services cycle** — worth having, because "this deploy does not touch
research" is a natural and wrong way to reason about restart risk.

### `mointel-web` has failed on every stop, 46 times, and I never looked

| service | `Failed with result` in the journal |
| --- | --- |
| **web** | **46** — every stop, never once `Deactivated successfully` |
| research | 44 — the old SIGTERM ignores; recent stops clean since `97f198d` |
| assess | 4 — the `BUSY_SNAPSHOT` crashes |

Web exits non-zero on `SIGTERM` and always has. It recovers — `NRestarts` 0, the
dashboard returns 200 — so nothing is broken. **What is broken is the signal:
every deploy writes `Failed with result` into web's journal, so a real web stop
failure is indistinguishable from routine noise.** That is the flaky-gate problem
relocated to the journal.

**It is the same family as the research SIGTERM defect, unfixed for web** — and I
missed it for the same reason each time: I built an observable for the service
where the last bug was, and checked only that one. Six deploys of watching
research's stop, and web's had been red in every one of them.

## ~~State: production is `567557b`, deployed 2026-08-24 08:41 UTC~~ (superseded)

Gated at that sha: **1318 tests**, lint, build, typecheck. Carries Design's
segment-count fix — `cycleCounts` counted `merged.rows` while `applyFilters` runs
over the sheet-derived watchlist, so a chip reading *"3 frontside"* returned one
row on the live board — plus the derivative classifier and Phase C float storage.

**Fifth clean stop** (08:40:27 → 08:40:27) and **`NRestarts` 0 on all four
units** — the snapshot race did not fire. First deploy where that field was
checked and came back clean everywhere. Market worker pid 129202 unchanged and
logging `high-res interest set: 250 symbols` at 08:41:00, mid-deploy: capture ran
straight through.

### The research worker does NOT drain on shutdown

Asked whether an in-flight interpretation survives a deploy. **It does not.**
`shutdown()` in `worker/research.ts` is `log` → `clearInterval` →
**`process.exit(0)`**, immediately. An interpretation in flight is abandoned —
tokens spent, nothing recorded.

**And `97f198d` made that worse in one respect, which nobody noticed including
me.** Before the fix, `SIGTERM` was ignored and systemd waited **30 seconds**
before `SIGKILL` — during which an in-flight call could finish. The fix removed
that incidental grace. It is still the right fix, because a hard kill strands
claimed rows, but **the drain question is now more pressing rather than less.**

**Handled by reading rather than by rule:** research was `IDLE` at 08:33 and
again immediately before the trigger — `activeCount 0`, `queuedJobs 0`, last
completed 08:30:00 — so nothing was in flight and nothing was abandoned. The
policy would have been "wait for IDLE"; the check was cheaper and exact.

### The pending market-worker restart now carries a behaviour change

`lib/market/securities.ts` is in the market worker's import graph
(`worker/runtime.ts:40`), and this release changes it. **The running worker is
unaffected** — it stays on `fd9556f` and a deploy does not restart it — so
capture is untouched.

But `securities.ts` drives **discovery-eligibility classification**. So whenever
that worker is finally restarted to clear the drift, it will begin classifying
derivatives differently. **A restart I have been deferring as a no-op is no
longer one**, and that changes what the restart needs to be watched for.

### Against my own record: I reported an observation I never made

I wrote that `BCTXL` and `IQMXW` being gone "held". **I measured nothing** —
Integration supplied the expectation and I passed it back as confirmation. Having
now actually checked, they *are* absent, so the observation is true and my
confirmation of it was unearned. Integration's stated *cause* was also wrong
(`b467154` is not deployed; they are simply not ranking).

**Accepting a wrong cause is one failure; asserting an observation you did not
take is a worse one**, because nothing downstream can tell it from a real
reading.

## Monday 2026-08-24 premarket: all five readings taken, all clean

Taken 04:25–04:30 ET with the board populated, bars at 1 s, 850 ranked names.

| # | reading | result |
| --- | --- | --- |
| 1 | **WAL under real write pressure** | **531,574,792 — byte-identical across nine samples**, db mtime advancing, ranked climbing 846→850 |
| 2 | **`messageAgeSeconds`** | **1**, `state: LIVE`, `PREMARKET` |
| 3 | **per-symbol healing on the 42** | **middle column 0**; 21 re-analysed, pool 42→37 |
| 4 | **bar count vs Saturday** | **0 dropped** — 265 compared, 248 unchanged, 8 grew, 9 new |
| 5 | **`NRestarts`** | web 0, market 0, research 1, assess 0 — no unit failed |

**Open item 2 is closed on evidence.** Saturday's flat WAL proved nothing because
the load was absent — that was written into this charter as the condition, and
the condition is now met: nine samples flat under live contention while the main
store is continuously written. Checkpoints keep up. **507 MB is a high-water
mark, not a leak**, and `journal_size_limit` is a tidy-up rather than a fix.

**The market worker is proven.** 31 hours and ten deploys after the 01:27:36
restart that cleared the release drift, with `RESTART_MARKET=no` and the
`fd9556f` pin holding throughout, bars are flowing. The closed-market checks
could only show it connects, authenticates and subscribes; this is the first
evidence it works.

**The healing works, and the check earned its construction.** The aggregate would
have shown 42→37 and read as success — and would have read the same way if
healing were half-working. Conditioning on the trigger is what makes zero mean
something, and that form exists only because Research caught the aggregate before
it ran and Integration caught the fetch-failure ambiguity after.

### The stranded recap jobs have a visible consequence, two nights later

Design asked whether the live board's `NO RUN` names are genuine or the
short-series shape — the two render identically, and only a per-name bar count
separates them. Answered, and it closed a loop.

**The live `resolveCycle` needs only `bars.length >= 2` (`cycle.ts:228`), so none
of the 14 `NO_CYCLE` names is short** — they hold 95–102 bars each.

| group | count | profile |
| --- | --- | --- |
| genuine `NO_CYCLE` | **11** | every bar finished, latest `2026-08-21` |
| **computed one session stale** | **3** | `ADXN`, `LSTA`, `ZKH` — 101 total, **100 finished**, latest finished `2026-08-20` |

Those three have a partial Friday bar that `readDailyBars` hides, so their cycle
resolves through **Thursday**.

**And all three are in the eight stranded recap jobs** — queued 02:00 UTC
2026-08-22 by Friday's 22:00 recap, `started_at` NULL, never claimed. The chain:

> recap queues 8 → none claimed → never re-analysed → `ensureDailyHistory` never
> ran → partial Friday bar never healed → `readDailyBars` hides it → **cycle
> computed one session stale, today, on the board**

**This changes what the stranded jobs are worth.** I recorded them as *"ten stale
rows nothing will pick up"* and Research reasonably left them there. They are not
inert: three are visibly on today's board carrying a cycle computed on Thursday's
data. It self-corrects the moment each name is re-analysed for any other reason —
and all three are on today's board, so probably today — but the *finding* is that
stranded recap jobs have a downstream consequence nobody established when they
were found.

**Worth recording how this was answerable at all:** Design said plainly it could
not get the bar counts and did not guess. A guess of "short series" would have
looked right and been wrong — the series are 100 bars, and the cause was two
nights upstream in a queue nobody had connected to the cycle column.

### The overlay confirmed against a ranked board, for the first time

Every previous observation went through `?symbols=`, which bypasses the rank
gate. Bare `/api/market`, authenticated: **28 intelligence entries, 26 carrying
`computedCycle`** — `BACKSIDE` 8, `NO_CYCLE` 13, `FRONTSIDE` 3, `DAY_ONE` 1,
`SHADOW` 1.

**Three of the four phases Design recorded as *unobserved, not failed* are now on
a real board** — `DAY_ONE`, `FRONTSIDE`, `SHADOW`. Its check was correctly stated
as narrow, and the narrowness was retired by the market rather than by argument.

**One honest limit:** premarket load is real but is not RTH load. The recorded
condition was sustained concurrent writes with the dashboard polling, which is
met. The strongest version of the WAL answer would be the same sample during
RTH; I do not think it is needed, since the question was whether checkpoints keep
up under contention and they demonstrably do.

## Open items

**0c. Health measures that the worker is alive, not that it is working — so a
hung worker reports healthy.** *Offered by Integration 2026-08-23 and not
assigned; taking it, because it is monitoring and incident diagnosis. Not built.*

The research worker's heartbeat is an independent `setInterval` (`unref`'d),
separate from its `for (;;)` loop. If the loop blocks — on an unbounded fetch, as
Research is now fixing — the interval keeps firing, `heartbeatAgeSeconds` stays
near zero, and `/api/health` reports `IDLE, running: true`. **Process up, health
green, nothing being done.** That is what happened on 2026-08-22: eight jobs
queued at 02:00:06, then nothing at all for 23 hours, and no watcher noticed.

`research_health` is `CREATE TABLE … CHECK (id = 1)` — **one row, overwritten**.
There is no history, which is why three threads spent an evening reconstructing a
stall from job timestamps. The table is Research's; the absence is what made the
diagnosis expensive.

**This is the same failure this thread has been naming all evening, one level up:
a check that cannot fail.** A heartbeat proves the process exists. Nothing was
asserting that it progresses.

**The proposal, and it needs no new table and no history.** `/api/health` already
carries `queuedJobs`, `activeCount` and `lastCompletedAt` — the inputs are
present, only the projection is wrong. The rule comes from a number this thread
measured today: **claiming is immediate, 0–2 minutes across every recap job that
ever started.** So:

> `queuedJobs > 0` with `activeCount == 0`, and nothing claimed for long enough
> not to trip on ordinary backlog, is **not `IDLE`. It is `STALLED`.**

It would have fired within minutes on 2026-08-22 instead of 23 hours later, and
it distinguishes the two states the current projection conflates: *nothing to do*
and *unable to do it*.

**Correcting my own justification, which was over-generalised.** I first wrote
"claiming is immediate, 0–2 minutes" and gave that figure to Integration, who
put it in `OPERATIONS.md` in good faith. It came from the **recap jobs alone** —
a small, unrepresentative slice. Across all **954** jobs that ever started, claim
latency is **p50 8s, p90 266s, p99 1253s, max 2576s**, with 276 over a minute and
82 over five. A threshold of "a few poll intervals" (`POLL_MS` is 5000) would
have fired on **29% of normal work** — a stall detector that cries wolf, which is
the flaky-gate failure in a new costume.

**The rule survives because the load-bearing part is the conjunct, not the
timer.** That latency tail is queue depth: a worker legitimately busy has
`activeCount > 0`, which is precisely the case `activeCount == 0` excludes. So
set the timer in minutes and generously, and let `active == 0` discriminate.

**What I cannot prove and will not claim:** `activeCount` has no history — that
absence is the whole problem — so the false-positive rate of the *conjunction*
is unmeasured, and only the timer alone was tested. Ship it in shadow and
compare before anyone lets it page a human.

*This is the fourth over-generalisation from a convenient slice in one evening,
and the first one of mine that reached another thread's document.*

Worth stating what it does **not** do: it says nothing while the queue is empty,
so a worker hung with no work pending still looks idle. That is the honest limit
of a queue-derived signal, and the alternative — progress history — is Research's
table to change.

**0b. The 22:00 recap is not silently dropping its work every day — measured.**
*2026-08-23, read-only against the local production snapshot. The checkpoint is
this thread's scope; the queue is Research's. Sized, not fixed.*

Two hypotheses were live and both are now answered from rows rather than
reasoning. My own SIGKILL guess was wrong — Research disproved it correctly, a
row with `started_at` NULL and `retry_count` 0 was never claimed and so cannot be
a kill orphan. But the replacement worry, that *"a job queued for a finished date
is never claimed by anything, ever"* and therefore the recap's work is dropped
daily, **is also wrong**, and by a wider margin:

| recap (02:00 UTC = 22:00 ET) | queued | started | stranded |
| --- | --- | --- | --- |
| for 2026-08-17 | 8 | **6** | 2 |
| for 2026-08-18 | 10 | **10** | 0 |
| for 2026-08-21 | 8 | 0 | 8 |

Sixteen of twenty-six recap-queued jobs ran. One recap ran **10 of 10**. So the
mechanism cannot be that these are structurally unclaimable.

Two further facts change what to do next:

- **Claiming is immediate — every recap job that started did so within 0–2
  minutes of being queued.** So the stranded rows were passed over *at the time*.
  **They will not clear on Monday**, and waiting to see is not a plan. That is
  worth stating because "queued for a finished date" invites exactly that wait.
- Stranding is confined to this checkpoint: **0 of 938 jobs queued at any other
  hour** was ever left unstarted.

**On whether it matters:** the only historically checkable pair, `CRGO` and
`MYSZ` from 08-17, each already carried **two analyses that same day**, the last
at 14:29 and 21:42 ET. For those two the dropped recap re-check cost a refresh,
not coverage. That is n=2 and evidence rather than proof, but it points the same
way as the guess that the next morning covers the same names.

**What is actually unexplained** is narrower than either hypothesis: why one
recap claimed 10 of 10 and another claimed 0 of 8. The 0-of-8 is Friday's, at the
end of the week the research pipeline spent failing on an empty balance — a
candidate, deliberately not asserted, and cheap for Research to check against
worker health at 02:00 UTC on 2026-08-22.

**0. The research worker is SIGKILLed on every deploy, and has been all day.**
*Found 2026-08-23 on live evidence, while discounting an unrelated report. The
file is Research's; the consequence is this thread's. Not fixed — handed over.*

Three deploys today, three identical sequences: `Stopping…` → 30s →
`State 'stop-sigterm' timed out. Killing.` → `SIGKILL` → `Failed with result
'timeout'`. At 08:04, 19:38 and 20:16. `mointel-market` and `mointel-assess`
each recorded **zero** such failures in the same period.

**The cause is a handler that does not exit, and it is worse than no handler.**

| worker | SIGTERM handling | stop result |
| --- | --- | --- |
| `worker/alpaca.ts:143` | `shutdown()` → `stream.stop()` → `runtime.shutdown()` → `process.exit(0)` | clean |
| `worker/desk-assessments.ts` | **no `process.on` at all** | clean |
| `worker/research.ts:193` | `stopHeartbeat = () => clearInterval(heartbeat)`, then `for (;;)` | **SIGKILL** |

Node's default action for `SIGTERM` is to terminate. **Installing a listener
overrides that default.** So `research.ts`, in adding a handler meant to tidy up,
silently disabled the only thing that made the process exit — and then loops
forever. `desk-assessments.ts` stops cleanly *because nobody improved it*.

The fix is to mirror `alpaca.ts`: clear the heartbeat, then exit.

**Why it matters here, beyond 30 seconds per deploy.** A `SIGKILL` mid-job
abandons an in-flight model call — tokens spent, nothing recorded — and can
leave a claimed row with no process behind it. That is the same shape as the
assessment that *"claimed its slot and then sat stuck at RUNNING"*, and it is a
candidate mechanism for the **10 QUEUED rows** already handed to Research in
[research.md](research.md) item 2. Nobody has connected those two; they may not
be connected, but a worker hard-killed three times today is the first place to
look.

**Against this thread's own record:** after each of those deploys, Ops reported
*"all four services active"* — true, and it checked the wrong thing. It verified
the state after starting, never the manner of stopping. The project memory says
in as many words that claims like *"the processes shut down cleanly"* must be
tested, because one such claim was already false once. It was not tested. The
evidence was in `journalctl` the whole evening and surfaced only because an
unrelated message sent this thread to read the research log.

Not urgent: no deploy is queued, and the exposure is a deploy landing while jobs
are in flight — which the checkpoint rules already discourage during premarket.

**1. Nothing reports release drift, which is why this was invisible.** The
`RESTART_MARKET=no` design is right and stays, but its consequence — a service
running older code than `current` points at — has no reporting anywhere. It
surfaced only because someone went looking at `/proc/<pid>/cwd` for an unrelated
reason.

**The call: report it, do not gate on it, and put it in `status.sh`.** A deploy
must not fail because the market worker is deliberately still on the old
release — that is the feature. But `mointel-status` should print each running
service's resolved cwd against the active release and say plainly which ones
have drifted, so it is visible every time anyone looks rather than only when
someone thinks to check. The deploy summary should echo the same line, since a
deploy is exactly the moment drift is created. Not built; a deploy-path change
should not be shipped in the same window as the incident that prompted it.

**2. The WAL is a 507 MB high-water mark that nothing truncates.** Measured, not
guessed — see the section below. Not urgent; disk is 13% used. Next step is
agreed: sample it **under sustained concurrent write load with the dashboard
polling** — which Monday's premarket is expected to supply, but the load is the
condition and the clock is not.

*Restated 2026-08-23. "Sample it Monday premarket" names an event; the thing
that makes the sample mean anything is contention between the writers and the
readers. On a thin premarket a flat WAL says exactly what Saturday's closed
market said, which is nothing — a check that cannot fail. So record the write
rate alongside the size: if writes are not landing steadily and the dashboard is
not being polled, the sample has not been taken yet, whatever the clock says.*

**3. Nothing surfaces the age of the calendar cache.** The failure modes in
§"When the Alpaca calendar fetch fails" are all silent, and the one number that
would distinguish healthy from about-to-be-wrong — `meta.calendar_fetched_at`,
plus whether the cached span still covers today — is not on `/api/health` or in
`mointel-status`. A candidate, not a decision.

*State read directly 2026-08-23 08:32 UTC and healthy — fetched minutes earlier,
spans to 2026-09-04, covers Monday. The gap is that reading it took an ad-hoc
SQL query against production, which is the whole point of the item.*

**3a. ~~`worker/test-stream.ts` writes to the production store when run on the
server.~~ Claimed and fixed 2026-08-23.**

Its guard was `process.env.MARKET_DB_PATH ? baseConfig.dbPath :
data/market-test.db` — the safe branch was the one where the variable is
*unset*, and `/etc/mointel/mointel.env` sets it for every unit. The file's
promise that synthetic prints "can never contaminate real market state" was
exactly inverted on the only machine where contamination would matter. Nobody
ran it there; found by reading.

**Taken by this thread rather than left recorded**, which is the condition item
4 sat in until it was assigned. It is a `worker/` CLI resolving a production
path, so it is item 5's class exactly, and it is Ops' by scope — the market
worker and production SQLite both live here.

The fix is `resolveTestStorePath` in `lib/market/config.ts`: the opt-in is now
**`MARKET_TEST_DB_PATH`**, which no service sets, `MARKET_DB_PATH` is ignored
outright, and resolving onto the live store is **refused** rather than honoured.
Both halves matter — ignoring the ambient variable fixes the reported bug, and
the refusal covers the next way in.

**Both fixes were taken, and they are not alternatives.** The dedicated variable
fixes the reported bug; the refusal is what makes it **fail closed**. An explicit
store on its own still fails open the moment someone passes the wrong path, and
every incident on this desk has been a safe-looking default quietly doing
something else. Confirming the choice, since it was asked: the refusal is in.

**Asserting the property found a second hole that the case list had missed.**
Item 5's second half says the documented guarantee is the thing to assert, and
following that literally rather than enumerating cases paid immediately: the
refusal compared resolved paths as **strings**, so on Windows
`data/Market.db` — a different string, the same file — walked straight through.
Correct on the Linux server, where case genuinely distinguishes files; wrong
locally, where `data/market.db` is somebody's live store. The comparison is now
case-insensitive on Windows and unchanged on Linux, with the platform passed in
as a parameter so both behaviours are tested rather than inherited.

`tests/market/testStorePath.test.ts` pins the guarantee, not a list: one test
asserts that **no spelling of the live store is ever returned** — absolute,
relative, `.` and `..` forms, whitespace-padded, case-varied — across both
filesystem behaviours. New spellings belong in that list. The enumerated cases
remain alongside it, including the original regression (`MARKET_DB_PATH` set to
the live store now yields the *test* store).

**Mutation-checked, because a test that cannot fail proves nothing.** Reverting
the case comparison to plain string equality turns 2 of the 8 red; restoring it
turns them green. The property test earns its place.

**This is also the first crack at item 5**: the resolution logic moved out of the
untested CLI into a pure function the gate can see, which is the shape the other
sixteen entry points need.

Gate green: 1200 tests / 78 files, lint, typecheck, build. Not deployed — no
service runs this file, so it ships with whatever goes next.

**Assigned to this thread by the trader, 2026-08-23**, alongside the flake, on
the grounds that both are `worker/` CLI defects and the fixture work is already
open here. Of the two fixes offered above, **refusing to start when the resolved
path is the live store is the stronger one** and this thread should say which it
took: an explicit test store still fails open if someone passes the wrong path,
while a refusal fails closed. Item 5's second half applies directly — whatever
is done, the documented safety property is the thing a test should assert, since
the property was written down here and was false.

**4. The release-bootstrap test is flaky, and it has now gone red on a real
deploy decision.** `tests/desk/releaseBootstrap.test.ts` fails intermittently
under the full parallel suite and passes in isolation and on a clean re-run.

Three independent sightings on 2026-08-23, which is what moves this from odd to
worth owning:

- Ops, early: `is live on` absent from the output. Passed alone and on re-run.
- Research, independently: reproduced it on `main` **with their changes
  stashed**, so it predates that work. They saw two failures in one run and one
  in another.
- Ops, on the `55f3e20` handoff gate: **1172/1173, one failure** — this time a
  *different* assertion, `carries no preflight` at line 121. Passed alone
  (5/5, 2.5s) and the full suite passed 1173/1173 immediately after.

**Two different assertions in the same file failing under load is the tell.**
That is not one bad expectation; it points at the fixture. The test spawns a
real subprocess with a stubbed `PATH` and `cwd: process.cwd()`
(`releaseBootstrap.test.ts:87-89`) while sandboxing into `mkdtemp`. A real
`spawn` plus PATH-stub resolution plus a shared cwd, under full-suite
parallelism on Windows, is the timing-sensitive part and the first place to
look. Not investigated further — deliberately not chased tonight.

**Why it matters more than an ordinary flake:** this is the test that proves the
preflight bootstrap works, and it went red inside the gate for a deploy. A gate
that cries wolf gets overridden during an incident, which is exactly when the
bootstrap it covers has to be right. Do not "fix" it by loosening the assertion.

**Assigned to this thread by the trader, 2026-08-23, and it is the item to do
before Monday's open.** Until now this was three well-documented sightings that
nobody had been asked to fix — Ops flagged it and did not claim it, Research
reproduced it and explicitly did not claim it. It sat between two threads, which
is the only reason it needed Integration to route it at all.

The reason for the timing rather than the reason for the work: it has now been
shipped through **twice** on a re-run. That is the correct call each time and it
is also how re-run-until-green becomes the habit. If Monday's open produces an
incident that needs a deploy, this test is between the desk and the fix, and the
person deciding will be doing it under pressure.

**FIXED 2026-08-23, before Monday's open. It was SIGPIPE, and it was in the
test's own `ssh` stub — not in `push-release.sh`.**

The thing that cracked it was capturing the *status* rather than the assertion
text. The failing run reported `expected 141 to be +0`. **141 is 128 + 13 —
SIGPIPE**, which is a mechanism, not a mystery.

`push-release.sh:79` ships the tree with
`git archive --format=tar "$SHA" | ssh … "sudo tar -x …"`. The stub `ssh` matched
that remote command with the catch-all `*) exit 0 ;;` and **never read stdin**.
Normally `printf 'TARBYTES'` — eight bytes — lands in the pipe buffer before the
stub exits and `git` finishes happily. Under full-suite parallel load the stub
sometimes wins the race: the read end is gone before the write, `git archive`
takes SIGPIPE, `set -o pipefail` propagates 141, and `set -e` kills the script.
That pipeline is the one with no `||` guard, so nothing catches it.

**This explains both failure shapes and retires the "two assertions" puzzle.**
They are one bug. The first test asserts `status` before anything else, so it
reports `141`. The second test asserted no status at all, so the dead script
merely never printed `is live on` and the *output* assertion failed instead.
Same cause, different symptom, depending only on which assertion each test
happened to reach first.

The stub's `bash -s` branch already drained stdin, with a comment saying
*"consume it so the pipe closes"*. The author knew about exactly this hazard and
covered one of the two pipelines.

**The fix is one line in the fixture — no assertion was loosened.** The
catch-all now drains stdin, which is what real `ssh` does; the stub was the
unfaithful part. `push-release.sh` needs no change and got none: real `ssh`
reads stdin, and if it ever died mid-transfer, aborting the deploy on 141 is the
behaviour you want.

One assertion was **tightened**: the second test now checks `status` before
`output`, so if this pipeline ever dies again the suite says `141` instead of
`expected output to contain "is live on"`.

Evidence, because 12 clean runs after a ~1-in-6 failure rate is only about 11%
unlikely by chance and proves little on its own:

- Before: reproduced in **1 of 6** full-suite runs, plus the gate failure, plus
  the morning sighting, plus Research's.
- After: **12 of 12** full-suite runs clean.
- Deterministic proof, which is the part that actually settles it — forcing the
  race with a `sleep 0.3` before `printf` in the `git archive` stub: the old
  non-draining stub exits **141 every time**; the fixed stub exits **0, five for
  five**, under the identical forced race.

Gate green at the fix: 1173 tests, lint, typecheck, build.

**5. The deploy gate cannot see the layer the `rm -rf` was in.** *Opened by
Integration 2026-08-23, from the export defect. Ops owns the gate, so it lands
here rather than with the file's author.*

`worker/archive-export.ts:127` removes `dirname(--out)` recursively inside a
`--dry-run` branch that is not dry. Pointed at `/var/lib/mointel` it would have
taken the store, the WAL and six backups; `/tmp`'s sticky bit is the only reason
it was a stack trace. R&D owns the fix and has it.

What belongs to this thread is why four green gates did not catch it. `worker/`
holds **17 entry points and two test files reference it at all** — the 1150-test
suite covers `lib/` thoroughly and the CLI wrappers essentially not. That is the
layer that takes `--flags` from a human, resolves paths on the production box
and runs as the `mointel` user.

One reassurance from checking rather than assuming: that `rmSync` is the **only**
recursive delete anywhere in `worker/`. This is one bad line, not a pattern — but

**~~One bad line, not a pattern.~~ It is a pattern. Corrected by Integration
2026-08-23, same day it was written.** Item 3a is the second instance and the
shape is identical: a `worker/` CLI that nothing in the 1173-test suite
exercises, carrying a written promise about production safety that is false on
the production box. `archive-export.ts` said `--dry-run` and deleted a
directory. `test-stream.ts` says synthetic prints *"can never contaminate real
market state"* and writes them to the live store on the only machine where that
sentence matters. Neither is a typo; both are a guarantee documented in the file
and contradicted by the file.

**Three now, and the third supplies a better rule than mine.** `research-replay`
reported *"123 versions: 123 stable, 0 unstable, 43 differ"* having made **no
model calls at all** — clean, internally consistent, entirely invented. A
standalone worker does not load `.env.local`, so the interpreter fell back to
`Noop`; `interpretTicker` then did the right thing for the wrong caller and
returned the previously accepted dossier, because a live desk is better served
by yesterday's verified analysis than by nothing. Its only tell was
`tokens in=0 out=0`, a counter added for **cost** reasons rather than
correctness.

Research's generalisation is sharper than the one I wrote here and should
replace it: **a degradation that is correct for the live desk can be a
fabrication for an analysis tool.** Every graceful fallback in `lib/research/`
is worth re-reading with that distinction in mind — and the same applies to
`lib/archive/`, which R&D built against the same libraries.

That reframes all three. `archive-export.ts` deleting a directory, and
`test-stream.ts` finding the live store, are not really *bugs in `worker/`* —
they are **behaviour correct for one caller invoked by another**, in files
nothing exercises. The gate cannot see any of it.

Three in one day, found by three different threads, none by a test. The narrow
question below stands and is now better evidenced: it is not about deleting.
**Any `worker/` CLI that resolves a production path should be reachable by the
gate, and its documented safety property should be the thing the test asserts.**
Both of these were caught by a person reading code shortly before running it,
which is not a control.

A note against my own record, since this thread asks other threads to keep one:
**I proposed running `market:test` on that box.** Ops answered it with a diff
instead of a connection and found 3a in the process. Had it taken the suggestion
at face value, FAKEPACA prints would have gone into the 837 MB live store. The
suggestion was mine; the discipline that caught it was not.

The original line, kept because the reasoning was sound and the conclusion was
wrong: it sat in the one place the gate does not look, and the next one will too.

Not a proposal to test all seventeen. The narrow question is whether any CLI that
resolves a production path and can delete should be reachable by the gate at all.

**6. Minute bars do not survive a weekend, which is stronger than "3 days'
retention".** Production holds **zero** `minute_bars` rows — confirmed in the
2026-08-23 snapshot. Research noticed the zero; the reason is worth having
written down, because it is not the one the number suggests.

`pruneRetention` (`worker/runtime.ts:1540`) builds its keep-set with
`addDays(cursor, -1)` — **calendar days, not trading days**, despite
`lib/market/store/db.ts:8` describing it as "pruned to `minuteBarRetentionDays`
trading dates". With the trading date rolled to Monday 2026-08-24, the keep-set
is Monday, Sunday and Saturday. **Friday's bars fall outside it and are deleted**
— and Friday was the last session. The same happens after every weekend, and
worse after a three-day holiday weekend.

So the limit is not "you get three days of minute bars". It is: **minute bars
never survive to the next session.** Anything that assumes Friday's minute data
is available on Monday morning is designing against something that has already
been deleted.

This matters beyond storage. The playbook's exit trigger is volume fading on
**10-second** candles, which is finer than this table anyway — so that will
always be a live signal, as Research said. The correction is that even the
*minute* grain is not available retrospectively, so no backtest of an exit rule
can be run against production history as it stands.

Not fixed, and deliberately not fixed tonight: changing retention is a storage
and behaviour decision, not a defect. Options are to count trading dates rather
than calendar days (the documented behaviour, and probably what was meant), or
to raise `MARKET_MINUTE_BAR_RETENTION_DAYS` past the longest weekend. Either
costs disk on an 837 MB store that already carries a 507 MB WAL, which is why it
is a decision rather than a patch. The doc comment should be corrected either
way — it currently describes behaviour the code does not have.

**7. The cycle change is a dossier-schema change, not a SQLite one — and the
difference decides how its deploy is run.** *Flagged early by Research
2026-08-23; no window requested yet.*

Research is replacing the interpreter's cycle judgement with arithmetic over
daily bars and described it as "a SCHEMA CHANGE". Checked now rather than in the
handoff, because the two meanings want opposite preparation:

- `AUTOMATIC_DOSSIER_SCHEMA_VERSION` and `INTERPRETER_PROMPT_VERSION` live in
  `lib/research/interpret/schema.ts` and are both `1`. They version the **dossier
  JSON contract**.
- The store's `SCHEMA_VERSION` is `21` in `lib/market/store/db.ts` and is a
  different thing entirely.
- A dossier is persisted as `JSON.stringify(analysis.dossier)` into a **`dossier`
  TEXT column** (`lib/market/store/researchRepo.ts:796`).

So this changes what sits *inside* an existing column. **No column is added, no
`ADDED_COLUMNS` entry is needed, no `SCHEMA_VERSION` bump, no migration, no
pre-deploy backup, and rollback stays a plain revert.** That is a materially
easier deploy than a store-schema change, where an older build refuses a newer
`user_version` and rolling back needs the matching backup
([../AWS_DEPLOYMENT.md](../AWS_DEPLOYMENT.md) §rollback).

The one real consequence to carry into the handoff: `readAnalysis` does
`JSON.parse(row.dossier) as ResearchDossier` — a type **assertion**, with no
runtime validation. Old rows will parse cleanly and simply lack the removed
fields, so anything dereferencing `cycleClassification` on a pre-change version
throws at the point of use rather than at the read. Research flagged this as
display logic and that is right; noting the mechanism because "it parses fine"
is exactly how it will look while being broken.

**8. ~~Design's `44c10cd` is verified and waiting on a word.~~ DEPLOYED
2026-08-23, live and UNVERIFIED.**

`f383ddd` — `44c10cd` plus two docs-only commits; `git diff 44c10cd..HEAD`
outside `docs/` is empty, so the gate result below stands unchanged. Live
19:38:55 UTC. Eight commits pushed first. No migration. All four services
active. Health `ok`. Reachable through CloudFront — `/` and `/api/dashboard`
both 200 authenticated, 401 without.

SIP untouched again: `mointel-market` still pid 129202, `NRestarts=0`, start
still Sun 01:27:36 UTC, no journal entries in the deploy window. **The pin
finally paid**: `[prune] keep fd9556f (pinned)` — this was the deploy where
keep-3 would have dropped the directory the live worker is running from, which
is precisely why it was placed on 2026-08-23 before the `775c5a9` deploy.

**Live is not verified, and under `abf38e1` this deploy is not finished.** Ops
confirms the release is up; the author confirms the behaviour. Whether Rank,
RVOL, Move, Price and Float sort the way the trader asked is Design's claim and
Ops does not make it. Handed to Design through Integration, since Design has no
directly addressable session.

Two things passed on with it. The market is closed and `messageAgeSeconds` is
`null`, so the board shows Friday's state — a sort can be checked against that,
live movement cannot and waits for 04:00 ET. And if anything looks wrong at the
open, the discriminator costs nothing: `messageAgeSeconds` off `null` means the
feed is fine and the fault is UI.

*Original assessment, kept because the reasoning is what a future window needs:*

Sortable Discovery columns — Rank, RVOL, Move, Price, Float — asked for by the
trader for Monday's open. Gate re-run here, not taken on report: **1238 tests /
80 files**, lint, typecheck, build, all green at `44c10cd`. Tree clean.

The findings below are the reason this is worth reading before re-deciding, and
they are what a fresh session would otherwise spend an hour re-deriving.

**It is 66 commits, not one.** The handoff is accurate about `44c10cd`; a deploy
ships a tree. Live-behaviour changes beyond the UI are the `sheetPrior` cache
(fewer Google calls per research cycle), the supply-bound banding and prompt
variant switch (**both default off**), and arm labelling in `researchRepo`.
Design said plainly that its own work is unverified on the live desk; nobody said
the same of Research's, and it rides along on the same release.

**Research's cycle work ships inert, so its "not ready for a window" does not
block this.** Checked rather than assumed: `AUTOMATIC_DOSSIER_SCHEMA_VERSION` and
`INTERPRETER_PROMPT_VERSION` are both still `1`, identical to production — the
cutover has not landed, only the machinery. `lib/market/cycle.ts` is imported by
nothing outside tests, and the five units run `alpaca.ts`, `research.ts`,
`desk-assessments.ts`, `migrate.ts` and `next start` — none of them
`research-replay.ts`. `package-lock.json` is untouched, so `npm ci` is
unaffected. No migration; rollback is a plain revert.

**The premarket confound is narrower than it was described.** The worry is that a
deploy tonight gives Monday's open two candidate causes instead of one, since the
market worker has not seen a bar since the 01:27 Saturday restart. But the worker
is not restarted by a deploy and stays on `fd9556f` regardless, **and the
ingestion path is byte-identical to production** — `engine.ts`, `alpaca/`,
`worker/alpaca.ts`, `worker/runtime.ts`, `session.ts`, `rvol.ts`, `board.ts` all
unchanged. Bar flow at 04:00 cannot be caused by this release. Only the board's
*rendering* can be, which is where a sort defect would show anyway — and the
discriminator is free: **`messageAgeSeconds` moving off `null` means the feed is
fine and anything odd is UI.**

> **Correction, 2026-08-23 — the conclusion holds, the measurement did not
> support it.** That list is hand-picked, and it **omits `lib/market/config.ts`,
> which `worker/alpaca.ts:11` imports and calls at line 17**. So "the ingestion
> path is byte-identical" was asserted from a curated set that left out a file
> the market worker loads. Found by applying Integration's own tell — *the
> question is not whether it was measured but what was measured, and whether that
> is the thing about to be said* — to this thread's most load-bearing claim.
>
> The conclusion survives on two independent grounds, neither of which was the
> one given: the `config.ts` change is **purely additive**, zero removed lines
> and a new unreferenced export; and the worker does not restart, so it runs
> `fd9556f` whatever the release contains. The claim that actually carries Monday
> was measured properly — `git diff 80437c3 fd9556f -- lib/market worker/` is
> **empty at directory scope**, not over a list.
>
> **The rule: for "nothing changed" claims, diff at directory scope, never a
> curated list.** A curated list encodes the very assumption under test — that
> you already know what is in the path. It cannot fail in the one way that
> matters, which is the same defect as every other instance today.

**If it ships, look at the real board.** Design asked for this specifically, and
the reason is on this thread's record: the Phase 1 enum leak was a defect only
real dossiers could reveal, and it went through a green gate. A gate that passes
is not a desk that works.

Also: this is the deploy where keep-3 would drop `fd9556f`. The
`market-worker-release` pin holds it, which is what it was placed for.

**10. ~~A dead review link returns HTTP 200.~~ INVESTIGATED AND DELIBERATELY NOT
FIXED, 2026-08-23.** *Assigned to this thread; the result of doing it is that
every available fix is worse than the defect. Two corrections to my own
report below.*

**Correction 1: the defect is narrower than I recorded.** I checked the HTML page
and stopped there. The **review API already returns the right status** —
`/review/<token>/api/dashboard`, `/api/market` and `/api/diagnostics` all return
**403** for a revoked token and **403** for a garbage one, 200 only for a valid
one, with a clean body (`{"error":"This review session has been revoked."}`) and
no data. Only the **HTML page** returns 200.

That dissolves both consequences I listed. An automated check does not have to
get a false pass, and a monitor *can* see a dead link — by asking the API, which
is the thing a monitor should poll anyway. **To test whether a review link is
live, request its API and expect 403 or 200. Never test the HTML page's status.**

**Correction 2: the obvious fix would not have worked, and I would have shipped
a no-op.** `not-found.js` in this Next (16.3.1) returns **"`200` for streamed
responses, and `404` for non-streamed"**. The refusal response *is* streamed —
`Transfer-Encoding: chunked`, confirmed against production — and the streaming is
deliberate, which is why `nginx-locations.conf` sets `proxy_buffering off`. So
`notFound()` would have changed the rendered UI and not the status.

The three routes, and why each is refused:

- **`notFound()`** — likely still 200 here, per the above. It would also replace
  an informative refusal (*expired* vs *revoked* vs *invalid*) with Next's
  default 404 UI, since the app has no `not-found.tsx` anywhere. Worse UX, no
  status change.
- **`unauthorized()`** — semantically the right answer, and it is **experimental**:
  it requires enabling `experimental.authInterrupts` globally in
  `next.config.ts`. Turning on an experimental Next flag across a production
  trading desk to correct one status code is not a trade this thread will make,
  and it is subject to the same streaming caveat.
- **Validating in `proxy.ts`** — already rejected in that file, with a reason
  that still holds: proxy runs before the Node runtime the data layer needs, so
  it cannot reach SQLite, and *"an authorization check that has to guess is worse
  than one made where the store actually is"*.

**So the code is left alone.** The security posture is correct and proven twice
over — the desk is withheld, revocation works, the API refuses. What remains is a
cosmetic status on a page whose body is already explicit, and the check that
matters is documented above and in
[../AWS_DEPLOYMENT.md](../AWS_DEPLOYMENT.md). Revisit if `authInterrupts` ever
becomes stable, when it costs nothing.

*Original report, kept because the sizing rule below came out of it:*

A revoked, expired or invalid token returns **200 with an error page** instead of
401 or 404. My first read of this was that revocation was broken; it is not, and
the bodies settle it beyond argument:

| token | bytes | `RVOL` occurrences |
| --- | --- | --- |
| revoked | 9,584 | 0 |
| garbage | 9,490 | 0 |
| valid | 535,437 | 4 |

The desk is correctly withheld and revocation behaves exactly as
[../AWS_DEPLOYMENT.md](../AWS_DEPLOYMENT.md) documents. But two practical
consequences follow from the status alone. **Any automated check that tests a
review link by status code gets a false pass** — which is the mistake this thread
made and nearly reported as an incident. And a monitor would never see a dead
link. To test a review session, compare the body, not the code.

**Sizing a review session — the rule, after getting it wrong.** A 12-hour token
issued at 15:56 ET expires at 03:56 ET, which is **four minutes before**
`PREMARKET_START_MIN = 4 * 60` (`lib/market/session.ts:27`) — the exact window it
was issued to cover. Caught by Integration; the arithmetic was this thread's to
do when it picked the number.

**Size the expiry against the constant the work depends on, not against a round
number, and check it rather than eyeball it.** Then: *expiry is the backstop,
revocation is the control.* Revocation is checked per request with no TTL to wait
out, so a generous expiry costs nothing while a tight one that dies
mid-verification costs a re-issue and a confused reviewer. Issue long, revoke on
report of done.

One thing that is **not** a trade-off, because it was framed as one: session
lifetime and the chunk-URL residue below are independent. The residue is a
property of the assets being unauthenticated, not of how long a token lives. A
shorter token buys nothing against it.

**9. ~~A review session can display the desk and cannot exercise it.~~ FIXED and
live 2026-08-23**, on the trader's word ("open static"). `c36b840`.

`location ^~ /_next/static/ { auth_basic off; }` — the smallest of the three
shapes below. **Applied by config reload, not a release deploy**, which is the
part worth reusing: `deploy.sh` installs the nginx file from the release, but
the same file can be installed and reloaded on its own — graceful, seconds, zero
service restarts, nothing near the market worker. Production stayed on
`f383ddd` throughout. Syntax was validated against a scratch config on the
server (`nginx -t -c`) before the live one was touched, and the apply carried an
automatic restore if `nginx -t` failed.

Verified end to end rather than by assertion: a real review session was created,
the asset URLs were pulled out of **that page's own HTML**, and fetched with no
credentials at all — all 200. Previously 401, which is why nothing responded to
a click.

Blast radius, tested unauthenticated: `/_next/static/*.js` and `*.css` **200**;
`/` **401**, `/api/dashboard` **401**, `/api/market` **401**, `/_next/image`
**401**, `/_next/data` **401**. Only content-hashed build assets opened. Every
byte of desk state stays behind Basic Auth.

**This answers the batching question by dissolving it.** Two mechanisms, not two
windows: a transport change reloads, a code change deploys, and neither has to
wait for the other. Design's Move commit gets its own deploy on its own merits.

**The size of what this was hiding.** It was never one control on one feature.
**No interactive element has been exercisable through a review link since
Phase 1** — Design clicked Top 25, which shipped then and is unrelated to any
recent deploy, and got nothing. It went unnoticed because review sessions were
used to *read* the desk and nobody had clicked. That is the real lesson and it
belongs with item 5's: a path nothing exercises is a path nothing checks.

*The original assessment is kept below, because the reasoning is what a future
auth decision needs.*

Every `/_next/static/*` request returns **401** in a review session. Confirmed
against production rather than relayed: a chunk pulled from the authenticated
HTML returns **200 with Basic Auth and 401 without**. `location /review/` sets
`auth_basic off`, but Next.js serves assets from `/_next/static/*`, which falls
under `location /` and inherits the server-level `auth_basic` at
`nginx-locations.conf:14-15`. `/review/`, `/mcp/` and `/.well-known/` turn auth
off; `/api/` and `/` do not.

The consequence is larger than one blocked verification. No JavaScript means the
page never hydrates, so **no click does anything** — Design clicked Float and got
nothing, then clicked Top 25, which shipped in Phase 1 and is unrelated to that
deploy, and got nothing either. No CSS means it renders unstyled. A review link
is a way to *read* the desk, not to operate it, and
[../AWS_DEPLOYMENT.md](../AWS_DEPLOYMENT.md) presented it as the answer for
automated browsing. That claim is now corrected in place; the defect is not.

**What the security question turns on, checked rather than assumed.** The
compiled client bundle carries **no secrets**: the project defines **zero**
`NEXT_PUBLIC_` variables, so Next has inlined no environment value into it, and a
scan of all 9 chunks (716K) found nothing matching credential, private-key,
service-account, Alpaca, OpenAI, CloudFront or instance-IP patterns. What it does
carry is compiled UI logic and labels.

**One thing that bounds the exposure and had not been said:** chunk filenames are
**content-hashed**, so they are only discoverable from HTML that is itself behind
Basic Auth or behind a review token. Opening `/_next/static/` would not hand the
bundle to a scanner that knows only the hostname — it needs a filename first. The
real delta is that someone who once held a review link keeps the ability to fetch
those specific URLs after the token expires, until the next deploy rotates the
hashes.

The three shapes, with the recommendation:

1. **`location ^~ /_next/static/ { auth_basic off; }`** — one block, and the
   recommendation. `/api/`, `/`, and every other `/_next/` path keep Basic Auth,
   so no data path opens. Ships with any deploy.
2. **Rewrite assets under `/review/`** via `proxy.ts` HTML rewriting, so the
   token remains the only credential and nothing new is served unauthenticated.
   Principled, preserves the design note exactly, and is real work in the
   transport layer.
3. **Change nothing and keep the doc correction.** Zero risk; does not meet the
   stated requirement that Design can reach the site.

Option 1 is a change to the auth model and therefore **not this thread's to make
unilaterally**, which is why it is recorded here rather than applied.

## Monday 2026-08-24 — the plan, and the one judgement call in it

**Monday now reduces to one item that truly needs the open, plus the feed you
would watch anyway.**

1. **Sample the WAL for two minutes under real write load** (item 2). This is
   the only thing that genuinely requires the open: nothing synthetic
   reproduces premarket reader/writer pressure against an 837 MB store, and
   whether checkpoints keep up under exactly that pressure is the whole
   question. Flat size with an advancing mtime means reuse and the 507 MB is a
   high-water mark; growth means starvation. Do not let a quiet-market sample
   stand in for it — Saturday's could not tell the two apart.
2. **Watch the market worker take its first bars.** `messageAgeSeconds` moving
   off `null` is the proof. Worth eyes regardless, but see below: the residual
   uncertainty here is far smaller than it looked.

### The commands, so this does not depend on a session being open

Both are read-only and neither needs anything staged in advance. Paste and read.

**The WAL sample.** Seven readings over ~2 minutes, plus the main store's mtime:

```bash
ssh -i /a/AWS_creds/mointel-prod-key.pem ubuntu@98.85.49.227 'for i in 1 2 3 4 5 6 7; do sudo stat -c "wal %y size=%s" /var/lib/mointel/market.db-wal; sleep 20; done; sudo stat -c "db  %y" /var/lib/mointel/market.db'
```

Reading it: **size flat while both mtimes advance** means writes are landing,
checkpoints are draining them, the WAL is being reused in place and the 507 MB
is a high-water mark — the Saturday result, now confirmed under load. **Size
climbing** means checkpoints cannot complete against premarket readers, which is
starvation and makes `journal_size_limit` the fix rather than a tidy-up.

**The feed.** `messageAgeSeconds` off `null` is the proof the worker restarted at
01:27:36 UTC on 2026-08-23 is delivering:

```bash
ssh -i /a/AWS_creds/mointel-prod-key.pem ubuntu@98.85.49.227 'curl -fsS http://127.0.0.1/api/health'
```

**Done early, 2026-08-23 08:32 UTC — the calendar cache did not need Monday.**
It is a read against production `meta`. `calendar_fetched_at` was minutes old,
the cache spans to 2026-09-04, and it **covers Monday 2026-08-24**. No early
closes in the cached span. Item 3 stays open as an *observability* gap — nothing
surfaces this number without someone going and asking — but the current state is
verified healthy, so it is not a Monday task.

### Why the bar path is better proven than "unproven" suggested

Asked whether `npm run market:test` should be run against Alpaca's synthetic
FAKEPACA stream to prove the pipeline before Monday. **No — and it turns out not
to be needed**, because the same evidence is available for free:

```
git diff 80437c3 fd9556f -- lib/market worker/alpaca.ts worker/runtime.ts
```

is **empty**. The bar path — socket, parse, engine ingestion, store write — is
byte-identical between `80437c3`, which was ingesting real SIP bars through
Friday's close (its `messageAgeSeconds` of 90,164 is that proof), and `fd9556f`,
which the current worker runs. Everything between those two releases is charters,
a launcher script and the research retry exemption.

So the code path is not unproven; it was carrying real bars on Friday. What is
unproven is narrower: whether *this process instance's* subscription delivers.
That is exactly what Monday shows and exactly what a synthetic stream cannot
substitute for, since FAKEPACA would exercise the same already-proven code over
a different socket.

### Why `market:test` is a no against this account anyway

Two reasons, one of which is not a judgement call:

**The "separate test database" guard inverts on the server.**
`worker/test-stream.ts` sets `dbPath: process.env.MARKET_DB_PATH ?
baseConfig.dbPath : data/market-test.db`. The protection holds only when that
variable is **absent**. `/etc/mointel/mointel.env` sets
`MARKET_DB_PATH=/var/lib/mointel/market.db`, so anything run on the box with the
service environment writes synthetic FAKEPACA prints **into the production
store**. The header's promise that synthetic prints can never contaminate real
market state is true locally and false exactly where it matters.

**The connection budget is unresolved, and that is the answer.** `streamTest`
and `streamSip` are the same host — `wss://stream.data.alpaca.markets`, differing
only in path — and `findAlpacaCredentials()` resolves one account key pair;
there are no separate test credentials in `.env.example` or anywhere else.
Whether Alpaca counts `/v2/test` against the account's single data-stream
connection is not something this thread can establish from here, and the way to
find out empirically is to risk the connection. *Probably not* is the standard
that has cost this desk the most: a second connection does not error, it
silently displaces the live one. Not worth it to re-prove code that Friday
already proved.

If it is ever run, it belongs on the local machine with `MARKET_DB_PATH` unset
and production not holding a SIP connection — and `npm run market:sim` belongs
nowhere near that box at all, since claiming the store for `SIMULATOR` mode
clears live session state first.

**The judgement call: when to end the market worker's release drift.**

Once bars flow, the proof the drift was protecting is spent, and a restart onto
`current` would end it outright rather than leaving a pin that has to be
remembered. Integration flagged the option without recommending timing. The call:

**Restart it once bars have actually flowed and no session is live** — which on
a normal Monday means after the close, or in the 22:00–04:00 `NEXT_DAY_PREP`
window.

*Restated as a condition 2026-08-23, because the original said "restart it
Monday, after the close" and that is an event standing in for a requirement.
The two come apart in exactly the case that matters: **if bars do not flow
Monday, "after the close" still arrives** — and the rule as written would have
restarted away the only live process carrying the failure, at the moment it was
the evidence. The condition is what earns the restart, and the clock is only
where the condition is usually met. If premarket produces no bars, the worker
stays up and the drift stays with it.*

Why not at the open: **his working session is 04:00–09:30 ET**, with profit
concentrated from 07:00 — *corrected 2026-08-24; he trades premarket and treats
RTH as the exception.* So the window to avoid starts at **04:00**, not at 07:00
and certainly not at the RTH open. A restart drops the stream and replays a
startup backfill — 13,115 equities and 8,653 snapshots.

**"Before the open" is not a safety margin on this desk.** Deploying at 07:00 is
deploying into the hours he actually trades. The honest sentence is *"this
cannot interrupt capture, and he may see the board flicker"* — never *"the
market is not open yet"*. That took three seconds on a closed Saturday and premarket is
not a closed Saturday. Spending any part of the best hours to tidy bookkeeping
is a bad trade, and the drift is harmless while it exists: its only hazard is at
prune time, and the pin already removes that.

Why not leave it indefinitely either: the pin is a promise somebody has to
remember, and item 1's whole lesson is that unreported state is the problem. A
worker on `current` needs no promise.

**Ordering rule while both are true: do not unpin `fd9556f` until the worker is
actually on `current`.** The next deploy is where keep-3 would drop it, so if
Monday brings an incident deploy before the restart, the pin is the only thing
holding the running worker's directory — and unpinning first would recreate this
morning's incident exactly, with the luck removed.

## Closed

**~~Research's three-arm prompt run needs production data.~~** Answered
2026-08-23 by handing over a copy rather than running anything on the box, which
is the option Research itself offered. **Nothing deployed, nothing run, nothing
written to production.**

The request arrived framed as "a run request, not a deploy request". Reading the
code said otherwise on two points, and both are the reason for the route:

- `interpretTicker` calls `saveAnalysisVersion`
  (`lib/research/interpret/pipeline.ts:342`). On the server that is 18–27 dossiers
  written into the live store from a prompt variant the source labels *UNDER
  TEST, NOT ADOPTED* — and Monday's board would have shown them as ordinary
  analysis.
- "No SEC or newswire traffic, so no rate-limit exposure" is true of those two
  paths and not of Alpaca. `worker/research-interpret.ts:140` calls
  `ensureDailyHistory` per symbol, which reaches `rest.getBars()`. Guarded by an
  `already current` short-circuit, so probably a no-op — but it draws on the same
  REST budget that threw `rate limited` and a calendar `503` on Friday.

What checked out: `1df1d75` sits on `55f3e20`, and both switches really do
default off — `promptVariant` is `'A'` unless the env is exactly `B`,
`omitSheetPrior` false unless exactly `1`. The claim that deploying it changes no
production behaviour is correct. It simply became unnecessary, because the arms
run against the copy.

**`deploy/aws/snapshot-db.mjs` is the right tool and worth remembering why.** It
is `VACUUM INTO` from a single read transaction: read-only against a live desk,
and it captures what is sitting in the WAL. A file copy of `market.db` opens
cleanly, passes `integrity_check` and is quietly missing whatever the 507 MB WAL
was holding — which on this store is not a rounding error. It also compacts:
837 MB became **106 MB** in one second.

Delivered to `data/market-prod-2026-08-23.db`, verified after transfer
(integrity ok, schema v21, 4,882 sources, 325 analysis versions), server copies
removed. Named deliberately unlike `data/market.db` so no local tool adopts it as
a live store by default.

One finding handed back rather than discovered mid-run: **three of the nine
requested names have zero evidence rows in production** — `PLAG`, `CYPH`, `GAUZ`,
with no `LIKE` match and no analysis versions either. The run is 18
interpretations, not 27. Detail in [research.md](research.md) item 0.

**~~R&D needs an assessment extract off production, and the tool is not on the
box.~~** Done 2026-08-23. Deployed `775c5a9` (gate green, 1150 tests, no
migration), cut the extract unbounded, delivered `data/assessments.db` — 75
assessments, 1850 ticker rows, 2026-08-17 to 2026-08-21, 2.8 MB, two tables,
integrity ok. `fd9556f` pinned while the market worker lives in it, and the pin
earned itself the same hour: prune removed `80437c3`, the directory the worker
ran from this morning. The record below is kept in full because the reasoning is
the reusable part.

R&D's Q1 turns on 19, 20 and 21 August, which exist only on the production
store. The agreed route is a two-table extract — ~1-3 MB, read-only, no prices,
no research text, nothing about the trader — rather than a 250 MB+ snapshot.
The route is right and the payload argument is sound.

The problem is how the tool reaches the server. `npm run archive:export` landed
in `8170f58`; production runs `fd9556f`, **six commits back** (`git rev-list
--count fd9556f..8170f58` — ask the command, not this line). R&D's charter
and findings note both said it "needs no deploy" and the note's table records "code
on production: no" — but `worker/archive-export.ts` says *Usage, on the server*
in its own header and takes `--market-db /var/lib/mointel/market.db`, a path
that exists only on the box. The code has to be there. R&D's charter is
corrected; the choice of route is left here, where it belongs:

- deploy `8170f58` through the gate and run it from the release, or
- copy the three files up out of band and run them with `tsx`, which is not a
  deploy but does put unreleased code on production, or
- do not run it there at all: hand-roll the two-table read with `sqlite3`, which
  needs nothing on the box and is what answers the go/no-go count today.

**Decided 2026-08-23 by the trader: deploy.** The argument that settled it is
Open item 6 — `git archive` ships `lib/archive/` on the next release whatever
is decided here, so the question was never *whether* that code reaches
production, only *when* and *how visibly*. Doing it deliberately through the
gate, in a closed-market window, beats it arriving unannounced inside the next
feature deploy. The hand-rolled route was rejected because it would mean
writing by hand what `tests/archive/export.test.ts` already proves — that test
asserts which tables leave the box, and it is the guarantee the whole approach
rests on.

**Deploy `HEAD`, not `8170f58`.** `746b3ef` is the reason: `coverage.ts` named
columns that exist on the local store at schema v15 and not on production at
v21, so it now probes `table_info` instead. Shipping `8170f58` would put the
version that breaks on first production contact on the box. It also clears a
literal NUL byte that has been in `coverage.ts` since `5834b9e`.

**Push before deploying.** `push-release.sh` archives out of the local repo, so
a deploy would otherwise leave production running code held on one laptop and
in no remote.

**Expect the drift in Open item 1 to come straight back**, and leave it. With
`RESTART_MARKET` at its default the market worker keeps running from the
`fd9556f` release while everything else moves — that is the feature, not a
regression, and Monday's premarket is the first open for the worker restarted
at 01:27 UTC. Do not restart it to tidy the drift away. Whether `fd9556f` wants
a pin while the worker lives in it is this thread's call; keep-3 retention
covers the next two deploys either way.

**The go/no-go is answered, and it is go.** Read-only on 2026-08-23 at 21:40 ET,
schema read from the live table definitions rather than assumed:

| trading_date | assessments | ticker rows |
| --- | --- | --- |
| 2026-08-17 | 2 | 50 |
| 2026-08-18 | 19 | 475 |
| **2026-08-19** | **16** | **400** |
| **2026-08-20** | **19** | **450** |
| **2026-08-21** | **19** | **475** |
| 2026-08-22 | — | — |

75 assessments over 5 dates, exactly 25 ticker rows each. `COMPLETE` 74,
`MISSED_SUPERSEDED` 1. The 08-22 blank is a Saturday and the 08-17 pair is the
evening the engine shipped — neither is a gap. `desk_assessment_tickers` has no
status and no date of its own; it joins by `assessment_id`.

**The empty-balance days cost no checkpoints, and the reason is structural:**
the assessment scheduler makes zero model calls — `model_calls` is 0 on all 75
rows, as designed — so an exhausted OpenAI balance cannot stop it. That is why
19-21 August look normal, and it is worth remembering the next time a research
outage raises a fear about assessment history.

Two findings went to R&D rather than being chased here: 19 August holds 16 of
the schedule's 19 checkpoints, and the intelligence columns inside the rows may
be degraded on exactly the days research was failing. Both are in
[rnd.md](rnd.md).

**When you cut the extract, do not start it at 19 August.** *Moved here by
Integration 2026-08-23 — R&D established it and wrote it in its own charter,
but this thread is the one that runs the command, and the paragraph above
points at exactly the wrong window.*

R&D can now age each grade: `analysis_version_id` is on every ticker row, so
`ageCatalystGrades` says how many sessions old the analysis behind a grade is.
Zero means produced that day; three means research has not revisited the name
in three sessions while `intelligence_status` still reads `AVAILABLE`. That is
the difference between a grade and evidence about the day it is attached to.

Ages are measured from the first version seen *inside the window*, so a window
starting on 19 August censors every grade in it — the first day reads as
freshly graded and the rest as barely aged, which is precisely how a stalled
pipeline disguises itself. **Take all five dates on record, and further back
if production holds more.** It costs nothing: a few MB either way, and the
`--from` / `--to` bounds are what would do the damage. Leaving them off is the
safe default.

**Done 2026-08-23. `775c5a9` deployed, extract cut, extract delivered.** Run
unbounded — no `--from`, no `--to`. It reported 75 assessments and 1850 ticker
rows over 2026-08-17 → 2026-08-21, matching the independent read-only query
above row for row. 2.8 MB, `integrity_check` ok, exactly the two tables. It
landed at `data/assessments.db`, which `/data/` and `*.db` both keep out of git,
and the staging copies on the server were removed. `market.db` was untouched:
`lib/archive/export.ts:55` opens the source `{ readonly: true }`, and the
store's mtime predates the export.

**One defect found, on first production contact, and it is a bad one.**
`worker/archive-export.ts:127` — inside the `--dry-run` branch —
`fs.rmSync(path.dirname(destination), { recursive: true, force: true })`. It
deletes the *containing directory* of `--out`, not the file, and the run is not
dry: the extract is built unconditionally before that line. `--out
/var/lib/mointel/assessments.db --dry-run` as the `mointel` user would attempt
`rm -rf /var/lib/mointel` — the store, the WAL and all six backups. This run
used `/tmp`, so the sticky bit returned `EACCES` and nothing was lost; that was
luck. The non-`--dry-run` path never calls `rmSync` and is what was used for
the real cut.

It is R&D's file and has been handed to them in [rnd.md](rnd.md), not fixed
here. **Ops does not run `archive:export --dry-run` against production until it
is fixed.** Worth noting for this thread's own tooling instincts:
`tests/archive/export.test.ts` covers the library well and nothing at all
exercises the CLI wrapper — the untested file is the one holding the `rm -rf`.

**~~The next deploy carries `lib/archive/` to production whether or not anyone
intends it.~~** Resolved 2026-08-23 by making it deliberate: `775c5a9` shipped
that code through the gate in a closed window, which is what this item argued
for. It is also the item that decided the route in the one above.

`push-release.sh:79` is `git archive --format=tar "$SHA"` over the whole tree
and there is no `export-ignore` in `.gitattributes`, so `lib/archive/`,
`worker/archive-backfill.ts`, `worker/archive-export.ts` and the three
`archive:*` scripts in `package.json` all ship on the next release. The code is
inert — nothing invokes it and no service references it — so this is not a
reason to hold a deploy. It is worth knowing because R&D declined the
run-it-on-the-server route partly on the grounds that it would put code on
production, and the ordinary release does that anyway. If that is unwanted,
`export-ignore` is the lever.

Verified 2026-08-23, because "inert" is a claim about the deploy path and the
deploy path is this thread's: the `package.json` change between `fd9556f` and
HEAD is **three script entries and nothing else**, and `package-lock.json` is
untouched. So `npm ci` and `npm run build` on the server are unaffected — the
one way inert code could still break a release. Confirmed, not assumed.

**Unpushed, which matters more than the payload.** Six commits including
`8170f58` exist only on the development machine; `origin/main` does not have
them. `push-release.sh` ships a sha via `git archive` from the local repo, so a
deploy would *succeed* and put code on production that exists in no remote. If
route 1 is chosen, push first.

**~~The market worker is running a release the next deploy will delete.~~**
Fixed at the root 2026-08-23, in the closed-market window, rather than lived
with. The unit says `WorkingDirectory=/opt/mointel/current`, which is correct —
but Linux resolves a symlink at process start, so the worker's cwd had been the
`80437c3` release directory since Fri 2026-08-21 12:45 UTC and had survived two
deploys. It was therefore running `80437c3`'s code while every other service was
on `fd9556f`: drift nobody chose.

Order of work, deliberately: pin `80437c3` first as insurance, then restart, then
unpin.

`systemctl restart mointel-market` at 01:27:36 UTC. Old process took SIGTERM and
logged `shutting down`; systemd reported `Deactivated successfully`; **no orphan
survived** — nothing on the box referenced `80437c3` afterwards, which matters
because an orphaned worker is what silently steals the one permitted SIP
connection. The new worker came up on `/opt/mointel/releases/fd9556f…` and
reached `connected` → `authenticated SIP` → `whole-market bars subscribed` three
seconds after start, having reloaded 13,115 equities, 13,113 baselines and the
session backfill on the way. Health `ok: true`, `connection: STREAMING`,
heartbeat 0s. All three processes holding the store now resolve to `fd9556f`.

`80437c3` was then unpinned — nothing needs it now, `32e47c9` is the immediate
rollback target and is retained by count, and leaving a pin behind would quietly
disable retention for a release with no remaining role. `prune.sh --dry-run`
confirms 0 removals today; `80437c3` becomes a candidate on the next deploy,
which is now the correct outcome.

**What is still unproven:** the market was closed, so this shows the stream
connects, authenticates and subscribes — not that bars flow. Monday's premarket
is the proof.

**~~Two commits are waiting to be deployed.~~** Shipped 2026-08-23 as part of
`fd9556f`, which carried eight commits: `2433470` (the billing-class retry
exemption — the one that mattered, and it is live because research restarted),
`63e0773` (launcher, Windows-side only) and six docs-only commits. Deployed into
the Saturday closed-market window rather than Monday's premarket.

**~~The ChatGPT review token and tunnel are still open.~~** Closed 2026-08-23.
Review session 9 (`chatgpt-mcp-7d`, unused since Aug 19) revoked — it now reads
`REVOKED` in `review:list`, and no ACTIVE session remains. The
`mointel-review-tunnel` service was stopped; it turned out to be a **transient**
systemd unit from `systemd-run`, not enabled and not in `mointel.target`, so
stopping it removed the unit file outright — it cannot return on boot or on a
deploy, and no `cloudflared` process survives. Verified afterwards through
CloudFront: `/` and `/api/health` both 401 unauthenticated, 401 on a wrong
password, 200 with a valid login, and health `ok: true`.

**~~The Momentum Desk shortcut is a live hazard.~~** Fixed 2026-08-23 in
`63e0773`. `scripts/start-desk.ps1` now opens production in the browser by
default and needs an explicit `-Local` to start a desk that takes the SIP
connection. Fixing the default rather than the `.lnk` fixed both shortcuts on
the Desktop, including the `- Copy`, and any that OneDrive has synced elsewhere.
Verified by running it: browser opened, no desk processes started.

**~~`main` is 53 commits behind.~~** Resolved 2026-08-23. `main` was
fast-forwarded to `c8f95a3` and the `session-aware-discovery` branch was deleted
locally and on the remote. **There is now one branch, `main`, and it is the
trunk.** Nothing was lost — every commit is on `main`. Deploy tooling was
unaffected either way: `push-release.sh` ships a sha via `git archive` and
references no branch.

## Before you deploy

The gate, all four green **at the sha that ships** — `npm test`, `npm run lint`,
`npm run typecheck`, `npm run build` — pinned per §"Gate the sha, not the tree".

**Name the sha. Do not deploy `HEAD`.**

```bash
deploy/aws/push-release.sh 98.85.49.227 /a/AWS_creds/mointel-prod-key.pem <gated-sha>
```

*Every deploy on 2026-08-23 passed `HEAD`, and this thread wrote the rule that
caught it in someone else's message before noticing it in its own command.
`HEAD` is a question — it resolves at the instant the script runs, which is after
the gate, after the verification, and after the decision. On that day it moved
three times inside one gating session and twice more between a recommendation
and a reply. It never bit, because the tree was checked each time; the exposure
was structural and unmanaged.*

**A deploy must also follow a push** — `push-release.sh` archives out of the
local repo, so an unpushed sha reaches production while existing in no remote.
Threads push their own work as of `f7b8ef5`; the check at deploy time is this
thread's.

Preflight refuses to deploy within 5 minutes of a scheduled checkpoint and
prints the reason. Read [../OPERATIONS.md](../OPERATIONS.md) §"Deploying near a
checkpoint" and §"Release retention and rollback pins" before overriding
anything. Rollback and backup procedure: [../AWS_DEPLOYMENT.md](../AWS_DEPLOYMENT.md).

## When the Alpaca calendar fetch fails

Read this before the November DST change or any half day. It is written from the
code, not from an incident — nothing in August exercises any of it.

Start by separating two things the deployment doc runs together. The checkpoint
schedule is ET wall-clock minutes resolved to instants by `etWallClockToUtc`
(`lib/market/session.ts:129`), which derives the offset from the instant itself.
**DST is handled there, by the ET conversion, not by the calendar.** What the
exchange calendar decides is *whether there is a session at all* and *what time
it closes*. So a calendar failure never shifts a checkpoint by an hour — it
schedules a full day of checkpoints when the exchange is shut, or leaves the
close three hours late on a half day.

The fetch itself is forgiving, which is why the 2026-08-22 12:31 UTC 503 cost
nothing. `MarketRuntime.ensureCalendar` (`worker/runtime.ts:265`) loads the
cached copy from `meta.calendar` first and only goes to the network when the
cache is missing, does not cover the reference date, or is over 20 hours old. A
failed fetch logs `[calendar] unavailable: …` at **warn** and returns; the cached
calendar stays in use. The cache spans `referenceDate − 120` to `+14` days, so
there is roughly a two-week runway before a stopped refresh means anything.

The damage is in the two states that warning does not distinguish.

**No cache at all** (`calendar.length === 0`):

- `isTradingDay()` falls back to *any weekday is a session*
  (`worker/runtime.ts:290`), so Thanksgiving and Christmas Day get a full
  checkpoint schedule against a shut exchange.
- `closeMinutesFor()` returns the 16:00 default, so on a half day the last
  `RTH_INTERVAL`, the `RTH_CLOSE` assessment and the whole after-hours window
  run three hours late — the 3 July case already written up at
  `lib/market/session.ts:151`.
- `fullSessionDates()` returns empty, which drops the early-close exclusion from
  the RVOL baselines.

**A cache stale past its forward runway** — and this one fails the *other* way,
which is why it is easy to misread. Once the cached span no longer contains
today, `calendarByDate` has no entry for it, so `isTradingDay()` returns
**false** rather than falling back to the weekday heuristic (the fallback only
fires on an empty calendar). `sessionPhaseAt` then returns `CLOSED`
(`lib/market/session.ts:205`), no checkpoints are owed, and `/api/health` reports
a completely plausible "market closed" on a day the exchange is open.

Independently of the worker, `lib/desk/checkpointDates.ts:35` returns `[]` for a
missing or unparseable cache, which makes `previousTradingDate` null — the same
shape as the bug that lost two `NEXT_DAY_RECAP`s and is written up at the top of
that file.

Healthy state to compare against, read 2026-08-23: `calendar_fetched_at`
refreshing on the 20-hour cycle, 93 sessions cached spanning 2026-04-24 to
2026-09-04.

## The WAL

507 MB of WAL against an 837 MB store looks alarming and is not, at least not
for the reason it appears to be. Measured on production 2026-08-23, read-only,
no pragmas changed:

- `journal_size_limit = -1` and there is **no `wal_checkpoint` call anywhere in
  the codebase**. `wal_autocheckpoint` is the 1000-page default, so with a 4 KB
  page checkpoints fire every ~4 MB.
- They are firing. Across seven samples over two minutes the WAL held at exactly
  531,574,792 bytes while its mtime kept advancing and the main store's mtime
  moved too. Writes are landing, checkpoints are draining them, and the WAL is
  being **reused in place**.
- So nothing is pinning it right now. 507 MB is a high-water mark. SQLite only
  truncates a WAL when the **last** connection closes cleanly, and that moment
  never arrives: `mointel-market` has held one open since 2026-08-21, and at
  least one of the four processes is always connected.
- Holders confirmed by `lsof` and `/proc/<pid>/fd`: market, research and
  assessments read-write; `next-server` opens the store **read-only** and its fds
  were seconds old, so the dashboard is not a long-lived pinning reader.

**What is not known.** This was observed on a closed market with almost no write
volume. It shows nothing is pinned *now*; it does not show that checkpoints keep
up during RTH, and checkpoint starvation under premarket reader/writer pressure
remains the most likely explanation for how the mark reached 507 MB. The same
two-minute sample during Monday's premarket would settle it: flat size means
reuse, growth means starvation.

**What it would take to let it truncate**, in order of cost:

1. `PRAGMA journal_size_limit` beside the WAL pragma at
   `lib/market/store/db.ts:913`. After each checkpoint SQLite trims the file back
   to the limit. One line, no runtime cost, and it is the standard answer.
2. An explicit `wal_checkpoint(TRUNCATE)` at a genuinely quiet checkpoint — the
   22:00 recap or the `NEXT_DAY_PREP` window. It blocks until readers clear, so
   it must not go anywhere near premarket.
3. Stopping all four services once in a closed window, which closes the last
   connection and reclaims the file with no code change at all. This touches the
   SIP connection, so it is a weekend job.

Do not change pragmas on the live store to find out; ship a change through the
gate like anything else.

## Traps that cost time before

Full list in [../OPERATIONS.md](../OPERATIONS.md) §"Known rough edges" and the
project memory. The three that have actually bitten:

- **One SIP connection.** Never start `npm run market:alpaca` by hand while the
  desk is up. Never leave orphaned workers.

- **Output shown once is a category, not an incident.** `review:create` prints
  the token exactly once and cannot recover it; piping it through `tail -8` cut
  the URL off and cost a wasted session. Capture such output whole to a file,
  then grep the file — never through `head` or `tail`. The same shape bit twice
  in one night: `$?` after a pipeline is the exit status of `tail`, not of the
  command, so a failing `typecheck` reported green. Use `PIPESTATUS`.
- **Never launch desk processes from inside a chat session for the user to
  keep.** They die when the session ends. Test with them, then hand the desk
  back by telling the operator to launch it themselves.
- **Editing a `CREATE TABLE` in `lib/market/store/db.ts` migrates nothing.** The
  block is `CREATE TABLE IF NOT EXISTS`. New columns must also go in
  `ADDED_COLUMNS` with a `SCHEMA_VERSION` bump, or the live desk fails at the
  first INSERT.

## Opening message for a new chat

> This is the **Ops thread** for the Momentum Intelligence desk at `A:\mointel`.
> Read `docs/threads/ops.md` and `docs/threads/README.md` first, then
> `docs/OPERATIONS.md` and `docs/AWS_DEPLOYMENT.md` as needed.
>
> You own the live desk: AWS, deploys, the market worker, incidents. You are the
> only thread that deploys. UI work belongs to the Design thread and interpreter
> or model-spend work belongs to the Research thread — if you find work there,
> write it into that charter's Open items and hand it over rather than doing it.
>
> Production is `fd9556f`, schema v21. Credentials are in `A:\AWS_creds\` — use
> them non-interactively and never print, log, commit or move a value.
>
> Start by confirming the working tree, HEAD, and what production is actually
> running. Do not deploy anything until I ask.
