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

## Open items

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
agreed: sample it Monday premarket and decide then.

**3. Nothing surfaces the age of the calendar cache.** The failure modes in
§"When the Alpaca calendar fetch fails" are all silent, and the one number that
would distinguish healthy from about-to-be-wrong — `meta.calendar_fetched_at`,
plus whether the cached span still covers today — is not on `/api/health` or in
`mointel-status`. A candidate, not a decision.

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
it sat in the one place the gate does not look, and the next one will too.

Not a proposal to test all seventeen. The narrow question is whether any CLI that
resolves a production path and can delete should be reachable by the gate at all.

## Monday 2026-08-24 — the plan, and the one judgement call in it

Three open items all want the same window and can be done in one sitting at the
04:00 ET premarket open. In this order, because the first is time-critical and
the others are not:

1. **Watch the market worker take its first bars.** It has connected,
   authenticated and subscribed since the 01:27:36 UTC restart, but has never
   seen data flow. `messageAgeSeconds` moving off `null` is the proof. This is
   the only item that must happen at the open.
2. **Sample the WAL for two minutes under real write load** (item 2). Flat size
   with an advancing mtime means checkpoints keep up and 507 MB is just a
   high-water mark; growth means checkpoint starvation. Saturday's sample was
   taken on a closed market and could not distinguish them.
3. **Read the calendar cache age** (item 3) — `meta.calendar_fetched_at` and
   whether the cached span still covers the date.

**The judgement call: when to end the market worker's release drift.**

Once bars flow, the proof the drift was protecting is spent, and a restart onto
`current` would end it outright rather than leaving a pin that has to be
remembered. Integration flagged the option without recommending timing. The call:

**Restart it Monday, but not in the premarket window — after the close, or in
the 22:00–04:00 `NEXT_DAY_PREP` window.**

Why not at the open: 07:00–10:00 ET is where this desk's profit is, and a
restart drops the stream and replays a startup backfill — 13,115 equities and
8,653 snapshots. That took three seconds on a closed Saturday and premarket is
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
