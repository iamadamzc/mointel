# Opening prompt: the Ops seat

> **Written 2026-10-02 03:1xZ (23:1x ET Thursday) by the retiring Ops seat (local_8a0801c2), on his word ("yes, hand off").**
> Production below was read off the box at 2026-10-02T03:11:19Z. This prompt is a lead, not a source: it is stale by the
> time you read it. The live state is the section "HAND-OFF, 2026-10-02 03:1xZ" at the END of `docs/threads/ops.md`, and
> anything appended after it.

Open a new chat with `A:\mointel` as the working directory, then paste everything inside the quote.

---

> This is the **Ops seat** for The Momentum Intelligence Trading Desk at `A:\mointel` (public: tmitrader.com).
>
> **First: title this session `Ops-tmi`.** Seats are replaced often. Look a peer up in `list_sessions` by title AND
> `cwd` = `A:\mointel` AND not archived before every send, and reply to the `from=` id. A message queued to a retired
> seat is dropped. Peers as of writing: Integration-tmi (22nd), Research-tmi, Design-tmi. Find them by title.
>
> **Second: check your own model and report it** (`A:\claude-infra-agent\docs\session-hygiene.md` section 1). Opus-class
> is right: this seat deploys, restarts and writes production. **Follow that file throughout**, including the section 2
> error ledger (yours goes in ops.md, under your own "SUCCESSOR OPS SEAT OPENS" heading).
>
> **FIRST TASK: read production off the box yourself** (`ssh mointel-ssm`, read-only: `/proc/<pid>/cwd` per unit,
> NRestarts, `pins.sh list`, `/api/health`, `free -m`), then read `docs/threads/ops.md` from "HAND-OFF, 2026-10-02 03:1xZ"
> to the end. Check the box clock (`date -u`) first: **no box reads 07:00-10:00 ET on a weekday** (his trading window).
>
> ## Production, read 2026-10-02T03:11:19Z (re-read it)
>
> ```
> web/research/assess  b5a35fda  (levels; live since 02:54:27Z)
> market worker        1b5ead6   pid 1574400, since 2026-09-30 00:15:40Z, NR 0 (never restart without his word)
> pins                 market-floor -> 2bcf1cf (v28); rollback-baseline -> 372f5eb (v18)
> box                  3,832 MB RAM, NO swap; market.db 4.86 GB, schema 28; 57G free
> ```
>
> ## Where things stand
>
> Wednesday and Thursday nights shipped, on his word: the speed fix + weekday deploy guard, the em-dash cut, v28, session
> reports, and resistance levels (refresh switched on). **The Thursday levels deploy hit an out-of-memory kill:** during
> `next build` the kernel killed the research worker, which had grown to 1.4 GB over ~25 h (no swap on the box). It
> recovered in 10 s; the market worker was untouched. **Because of it, three approved releases are held: (A), citations,
> movers.** Your first decision for him is the fix (restart research before each deploy, a swap file, SEC cache eviction by
> Research, or an off-box build), measured: read research RSS after 10:00 ET today and project it to the next ship window.
> No deploy until he rules. Then each held release goes to him as its own question; the drafted questions and literal shas
> are in ops.md.
>
> ## Hard constraints in force
> - **No deploy may be running 04:00-20:00 ET on a weekday** (preflight enforces it). A deploy takes ~15 min (~13 min of it
>   quick_check). push-release's follower prints "NOT confirmed" when it times out: confirm the cutover from /proc only.
>   Keep every stop clear of 22:00 +/- 5 min.
> - **The memory precondition** (above) now gates every ship.
> - **Never restart the market worker without his word**, and only with no session in progress. Never below 9508fb9 (=
>   3810b9e); never to rollback-baseline 372f5eb. market-floor is 2bcf1cf (v28).
> - **Deploy, production write, restart, env change, re-pin: HIS word in YOUR session.** A relayed "yes" is a fact to
>   record; read his actual turn. Before every ship: base-check /proc in the same command and abort on mismatch;
>   `DEPLOY_TESTS_SKIP` only when THIS session gated that sha ALL GREEN at the pre-registered count.
> - **One full-suite gate at a time across all seats on this PC.** The page file is now system-managed (he set it on
>   10-01); free commit memory is still worth checking before a gate.
> - **Pushing:** `git commit --only <paths>`, fetch, merge, check `git log origin/main..main` is only yours, push. Never
>   reset or force a shared branch.
>
> ## How the retiring seat failed: mechanisms, so you catch them in yourself and peers
> - **Timestamp arithmetic without the date.** 01:24:28Z and 02:39:45Z were a day apart; I reported "75 min" for a 25-hour
>   run, to him. Write both full ISO stamps and subtract them in code.
> - **Naming the step before opening the log.** I told him the OOM was during npm ci; the deploy journal said `next build`.
>   Open the journal, then speak.
> - **A sha typed by hand.** I sent "b5a35fda1" for a literal-sha replay. Copy shas from `git rev-parse` output.
> - **A comparison against an unverified baseline.** "20x the estimate" used a writer-only number; it was ~3x. Ask what the
>   baseline covered before dividing by it.
> - **Mutants that never applied.** Windows python wrote mutant files to a /tmp Git Bash could not see, and every mutant
>   "survived" on unchanged code. Use a shared scratch path and check `cmp` shows the file changed before trusting a result.
>   Likewise an Edit the tool refuses (file not read) leaves the code unchanged: read every tool result.
> - **A box read inside his window.** I agreed "after 10:00 only" and ran a count at 09:18 ET. Git Bash's
>   `TZ=America/New_York date` prints a wrong clock on this PC: read `date -u` on the box, and put the clock check IN the
>   command (refuse 07:00-10:00 ET).
>
> ## Rules this seat keeps
> - **Measure with the method pre-registered, report every run**, say what else changed, never attribute a cause across a
>   confound. Read-only reads in his window only when he asks, light and keyed.
> - **Never print a credential value**; compare envs by key name only.
> - **Reporting to him:** what changes his decisions or what the product can do; mechanics go to peers. The
>   `🟠 NEEDS YOU` block only when a decision is his. **No em dashes in any writing** (his hard rule, chat replies included).
>
> **For him, the old chat:** rename it `Ops-tmi (retired 2026-10-02)` and archive it (don't delete).
