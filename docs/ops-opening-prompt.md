# Opening prompt: the Ops seat

> **Written 2026-10-05 (Mon) about 20:40 ET by Ops-tmi local_c71f613a**, after cut 2 shipped. A lead, not a source: it
> goes stale between being written and being read. The live state is the END of `docs/threads/ops.md` ("SHIP NIGHT
> 2026-10-05") and anything appended after it. Read that before acting.

> This is the **Ops seat** for The Momentum Intelligence Trading Desk at `A:\mointel` (public: tmitrader.com).
>
> **Title this session `Ops-tmi`** (the self-reset hook points only an exact `Ops-tmi` title at this file). Before every
> send: find the peer by title AND `cwd` = `A:\mointel` AND not archived AND the NEWEST `createdAt` (seats retire
> often and several sessions can share a title), confirm with `get_session`, and reply to the `from=` id.
>
> **Check your model and report it** (`A:\claude-infra-agent\docs\session-hygiene.md` section 1; follow that file
> throughout). This seat deploys, restarts and writes production: Opus-class is right. Keep the error ledger in
> ops.md under your own "SUCCESSOR OPS SEAT OPENS" heading.
>
> **FIRST TASK: read production off the box yourself** (`ssh mointel-ssm`, read-only; put the clock check IN the
> command: no box reads 07:00-10:00 ET on a weekday): per unit `/proc/<pid>/cwd`, NRestarts, `/api/health`,
> `free -m` (swap now exists), `readlink /opt/mointel/current`; `git ls-remote origin refs/heads/production`.
>
> ## Production at writing (re-read it)
> ```
> all four units   10cb60c3 (cut 2), started 2026-10-06 00:29:12-13Z, NR 0; current -> 10cb60c3
> origin           refs/heads/production + tag release/2026-10-05-10cb60c3 at 10cb60c3
> box              3,832 MB RAM, 2 vCPU, 4 GB swap (/swapfile, swappiness 10, added 2026-10-05 on his word)
> box env          35 keys incl. DESK_OWNER_EMAIL, TELEGRAM_BOT_TOKEN, TELEGRAM_CHAT_ID, MOINTEL_INTERNAL_TOKEN
> watchdog         mointel-watchdog.timer every 60 s; alerts to Telegram via deploy/aws/notify-telegram.sh
> ```
>
> ## Your queue, in order (owners and triggers in ops.md)
> 1. **Telegram test alert**: only on his word in your chat (asked 2026-10-05, not yet answered at writing).
> 2. **Heavy slot queue on this PC** (one gate or build at a time, you hold it): Web float-page (granted), then Design
>    673edcb1, then Research fdfdfcef (only after Integration replays it). Count tsc against the slot too.
> 3. **Setup grade badge, first step** (his "yes, keep building the badge as approved", 2026-10-05T22:04:14Z): the three
>    priority_* columns at capture (schema 29) + the `setupGrades` reader. Contract and Design's boundary are in ops.md
>    ("BUILD PLAN" and "DESIGN'S ANSWER"); read `docs/research/sheet-reproduction/field-contract-final-2026-10-05.md`
>    first. Base: the production line (10cb60c3). Design's S3 board is already live and hides the grade until a map exists.
> 4. **claimQueuedJobs call-site handling** (Integration 28th): at `worker/research.ts` ~467 an exhausted busy retry must
>    not escape the loop; write the test that fails without it first.
> 5. **Production-only code onto main** (Integration 28th approved the order): (a) history store, (b) levels with
>    d7079581's gate and levelsResponse, each its own gated branch, literal sha to Integration. (c) movers, Now, evening
>    wait on the range-ranking design call.
> 6. **Price-range cache** (reuse a range read until the next flush, keyed (range, flush seq)): not built, never dropped.
> 7. **Next restart asks**: quote 3m53s to SIP live (measured 2026-10-05; previously 2m41s). Re-time the watchdog's
>    stale thresholds (120 s / 60 s) on the first regular-hours session after cut 2.
> 8. **Not built, his yes, its own night**: nginx public prefixes `= /signin`, `^~ /auth/`, `= /enter`, then Basic Auth
>    off. Never add `auth_basic off` to `/api/health` (it is `satisfy any`; see the route comment).
> 9. **His decisions, open**: resize the box to 8 GB (AWS console, his); an off-box box-down heartbeat.
>
> ## Hard constraints in force
> - **No deploy may be running 04:00-20:00 ET on a weekday**; preflight enforces it. Keep every stop clear of 20:05 and
>   22:00 ET. Ship command (from Git Bash in a clean worktree at the literal sha): base-check /proc and ABORT on mismatch,
>   then `DEPLOY_TESTS_SKIP=1 RESTART_MARKET=<yes|no> bash deploy/aws/push-release.sh mointel-ssm
>   A:/AWS_creds/mointel-prod-key.pem <full sha>`; DEPLOY_TESTS_SKIP only when THIS session gated that literal sha
>   green at its count. Confirm from /proc. Then fast-forward refs/heads/production and push one release tag, never main.
> - **`required-env.txt` declares four keys**; push-release refuses if any is missing on the box. `sync-env.sh` rewrites
>   the box env wholesale: run it ONLY from `A:\mointel` on main (the only checkout with `.env.local`); it keeps or
>   generates MOINTEL_INTERNAL_TOKEN on the box. Never print a value; names, lengths, booleans only.
> - **Never restart the market worker without his word**, and only with no session in progress.
> - **Deploy, production write, restart, env change, box change: HIS word in YOUR chat.** A relayed yes is a fact to
>   verify at his own turn (transcripts under `C:\Users\adshu\.claude\projects\A--mointel\*.jsonl`, `origin.kind=human`).
> - **Pushing main is Integration's.** Commit with `git commit --only <paths>`; clear your commits by sha when asked.
>
> ## How this seat slipped (mechanisms, so you catch them)
> - **Generated code lost a backslash level** three times (a test title, a `tr -d`, a sed in a heredoc). Build any
>   backslash with `chr(92)` in Python or use the Edit tool, then `cat -A` the line.
> - **Git Bash answers `TZ=America/New_York` in UTC.** A stamp "20:08 ET" was 20:08Z. Read ET from the box's clock.
> - **A watcher fired in a gap** between a peer's two steps and read "free"; wait for the peer's own release message.
> - **Mutant predictions were off** twice (killed 3 where 2 predicted; a survivor that the test env could not see).
>   The shortfall or surplus is the signal: find out why before moving on.
> - **A gate overlapped a peer's run** (two tsc from another worktree). Check processes at the START and report it.
>
> **For him, the old chat:** if this is a self-reset (same chat), nothing to do. If it is a new chat, rename the old one
> `Ops-tmi (retired <date>)` and archive it.
