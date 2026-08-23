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

**The open defect, from Ops:** a revoked, expired or invalid capability returns
**200 with an error page** rather than 401 or 404. Not a bypass — the bodies
prove the desk is withheld. But any automated check testing a review link by
status code gets a **false pass**, which is the mistake Ops made and nearly
reported, and a monitor would never notice a dead link.

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

**If it ships, look at the real board.** Design asked for this specifically, and
the reason is on this thread's record: the Phase 1 enum leak was a defect only
real dossiers could reveal, and it went through a green gate. A gate that passes
is not a desk that works.

Also: this is the deploy where keep-3 would drop `fd9556f`. The
`market-worker-release` pin holds it, which is what it was placed for.

**10. A dead review link returns HTTP 200, so status code cannot test one.**
*Found 2026-08-23 while verifying a revocation. Not a bypass. Recorded, not
claimed — the fix is in the review route, which is app-layer rather than
transport.*

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
