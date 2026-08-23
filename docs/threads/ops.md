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

## Not this thread

- UI components and anything in the audit's remediation plan → [design.md](design.md)
- The interpreter, evidence collection, model spend → [research.md](research.md)

Both of those produce commits. **They come here to be deployed.** Take the
handoff, run the gate, deploy — do not review their design decisions.

## State as of 2026-08-23

Production is **`fd9556f`**, schema **v21**, deployed 21:12 ET Saturday into the
closed-market window. Gate green at that sha before shipping: 1091 tests, lint,
typecheck, build. Market IDLE (closed, weekend), connection STREAMING. Research
IDLE. Assessments idle, next `STRUCTURAL_REFRESH` Monday 06:10 ET.

The deploy ran with `RESTART_MARKET` at its default of `no`. Verified afterwards
that the SIP connection was never touched: `mointel-market` `NRestarts=0`,
`ExecMainStartTimestamp` still Fri 2026-08-21 12:45:06 UTC, and no journal
entries at all in the deploy window. Web, research and assessments restarted at
01:12:50–51 UTC onto the new release.

**Only one rollback pin actually exists** — `rollback-baseline` = `372f5eb`
(schema v18). An earlier version of this charter claimed `80437c3` was pinned
too. It is not; `pins.sh list` on the server shows the one entry. That matters,
see Open item 2.

The 2026-08-21 deploy notes, kept because both are now proven in production: the
preflight bootstrap that would have blocked every future deploy, and an enum
leak that only real dossiers could reveal. Both branches of the bootstrap fix
have now been exercised, not just the fallback.

## Open items

**1. The market worker is running code from a release, and the next deploy will
delete it.** `mointel-market` has not been restarted since Fri 2026-08-21 12:45
UTC, which is correct — `RESTART_MARKET=no` is what protects the SIP connection.
The consequence is that its cwd is the *resolved* path
`/opt/mointel/releases/80437c3…`, not the `current` symlink, and it has now
survived two deploys there. `prune.sh` protects only the **active** release and
**pinned** shas, ordered by directory mtime, keeping 3. After the next deploy the
newest three are that sha, `fd9556f` and `32e47c9`; `80437c3` is neither active
nor pinned, so it gets `rm -rf`'d **out from under the running worker**. Already
open files survive by inode, but Node resolves lazily — the first module the
worker has not yet imported, on a reconnect or an error path, fails with ENOENT
during exactly the incident it would be handling.

Three ways out, cheapest first: pin `80437c3` before the next deploy; or restart
the market worker in a closed window so it re-resolves onto `current`; or teach
`prune.sh` to refuse a release that is some running process's cwd, which is the
only one that fixes it permanently. Nothing to do before Monday — the hazard
arrives with the next deploy, not with time.

**2. The WAL is a 507 MB high-water mark that nothing truncates.** Measured, not
guessed — see the section below. Not urgent; disk is 13% used.

**3. Nothing surfaces the age of the calendar cache.** The failure modes in
§"When the Alpaca calendar fetch fails" are all silent, and the one number that
would distinguish healthy from about-to-be-wrong — `meta.calendar_fetched_at`,
plus whether the cached span still covers today — is not on `/api/health` or in
`mointel-status`. A candidate, not a decision.

**4. The release-bootstrap test is flaky.** `tests/desk/releaseBootstrap.test.ts`
failed once under the full parallel suite on 2026-08-23 — `is live on` absent
from the output — then passed in isolation and on a clean re-run, both at HEAD
and with changes applied. Unexplained. A flaky test in the deploy path is worth
chasing before it has to be trusted during an incident.

## Closed

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

The gate, all four green: `npm test`, `npm run lint`, `npm run typecheck`,
`npm run build`.

```bash
deploy/aws/push-release.sh 98.85.49.227 /a/AWS_creds/mointel-prod-key.pem HEAD
```

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
