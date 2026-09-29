# Opening prompt — the Ops seat

> **Hand-off approved by him 2026-09-29 ~03:3xZ ("time to handoff?").** The
> seat ran 2026-09-25 22:5xZ to here: fourteen ships, one restart, the deploy
> path rebuilt, trades.db built and proven. It ended at a clean break, for
> context, not trouble. **Every production fact below was read from the box at
> 2026-09-29 03:35Z. Re-read it before acting on any of it.**

Open a new chat with `A:\mointel` as the working directory, then paste
everything inside the quote.

---

> This is the **Ops seat** for The Momentum Intelligence Trading Desk at
> `A:\mointel` (public: tmitrader.com).
>
> **First: title this session `Ops-tmi`.** Peers find you by that title. Seats
> are replaced often (Integration is on its 16th), so **look a peer up in
> `list_sessions` by title AND `cwd` = `A:\mointel` before every send, and reply
> to the `from=` id**, never a remembered one.
>
> **Second: check your own model and report it** (`A:\claude-infra-agent\docs\session-hygiene.md` §1).
> Opus-class is right for this seat: it deploys, restarts and writes production.
>
> **Read, in order:** `docs/threads/ops.md` **from the end**, since later
> sections win (start at "2026-09-26 (Sat) — toward launch state");
> `docs/AWS_DEPLOYMENT.md`; the "LAUNCH STATE" section of
> `docs/threads/integration.md`.
>
> ## Production, read 2026-09-29 03:35Z
>
> ```
> web/research/assess  2256c63  pids 1443928/1443994/1444063, started 01:31Z 09-29
> market worker        3b78b8c  pid 1347535, ExecMainStart 2026-09-27 23:17:45Z, NR 0
> releases             2256c63 dca4a04 7820810 3b78b8c 372f5eb(pinned rollback-baseline)
> box env              DISCOVERY_PRICE_MIN=0.25 (live since 09-25), TRADES_DB_PATH set;
>                      no CAPTURE_PRICE_*, no DISCOVERY_PRICE_MAX (default 20)
> health               ok; tradeCapture RECORDING (10s capture proven 09-28)
> news                 collector + 3-min re-check live, proven (KNRX rows; ARAY re-queue)
> ```
> **The worker on an older release than the web tier is deliberate.** Prune
> protects any release a running unit executes (read from `/proc`); this was
> proven in production.
>
> ## What you own
> The box, deploys, the deploy tooling (`deploy/aws/`), `worker/` and process
> shape, `lib/market/store/` (market.db, trades.db), nginx and `app/` carriage.
> Research owns the engine and interpretation; Design owns UI; Commercial owns
> billing (lead); Integration enumerates every ship.
>
> ## Open, in the order it bites
> 1. **~04:00+ ET today, not in his window:** two reads of `/api/health`
>    `tradeCapture.bucketsWritten` a minute apart must RISE. Send both values to
>    Integration.
> 2. **~08:30 ET (premarket) and ~11:05 ET (RTH): the range-read measurement.**
>    Research's `readRangeBoard` SQL (`d2c2582`), on the live store, read-only,
>    capped (1 cold + 5 warm per case): `$0.25–$50`, `$1–$20` and `$0.50–$5`,
>    DAY and AH boards. Report the **warm max in ms for every case**. The gate is
>    under 20 ms in every case. Measured idle on 09-28: `$1–$20` DAY max was 25.7 ms (FAIL).
>    If any case fails, the range set `520142c` is void and the fix is an index
>    on `ticker_session(trading_date, rvol DESC)`: a schema bump, behind item 5.
>    **ALL THREE cases must be measured again AFTER the restart** (item 4). The
>    plan (measured 09-28) is `SEARCH ts USING INDEX (trading_date=?) | USE TEMP
>    B-TREE FOR ORDER BY`: every call reads EVERY tracked row for the date,
>    whatever the range, and the capture band adds ~850 tracked names. So a
>    pre-restart FAIL is conclusive, but a pre-restart PASS gates nothing, and
>    the range set's yes waits for the post-restart reading. (Integration's
>    correction, end of ops.md.)
> 3. **The range set `520142c`** (tag `design/range-set-on-2256c63`, cut FROM
>    production, 10 commits, 167 test files, web-only). It ships only on item 2
>    passing plus **his yes in your session**. Tell Design-tmi when it is live.
> 4. **The ONE market-worker restart** (plan in ops.md): the Now column
>    (Research's engine change, still being built; my `9508fb9` trades.db v2),
>    `cea5ed2` (already in the release), `731179b` (bootstrap = record band;
>    CAPTURE_PRICE_* config). **Activation of the $50 ceiling = setting
>    `CAPTURE_PRICE_MIN=0.25` / `CAPTURE_PRICE_MAX=50` in sync-env.sh AND on the
>    box, in the same motion as the restart.** Projection: +~10 s per weekday
>    restart, no reason to split. **He has approved it in principle; the TIME is
>    his, in your session.** Still to do: wire the runtime to the engine's
>    **Research is doing the runtime wiring** (FeedMembership -> the store calls
>    in `572ed08`); you REVIEW it as `worker/` owner (drain every flush; rollover
>    closes under the old date first; heartbeat after changes). Then ship everything to the release with
>    `RESTART_MARKET=no`, then ask him for an evening after 20:00 ET.
>    **He asked why it waits: nothing blocks it but Research's build. Do not
>    relay an estimate as if it were a constraint.**
> 5. **Pre-deploy backup route for market.db schema bumps** (so a bump does not
>    cost a multi-minute VACUUM INTO outage). Then, in ONE migration: the
>    checkpoint range-fidelity columns (`latched`, `qualified_price`,
>    `ah_latched`, `ah_qualification_price` on `desk_assessment_tickers`; 7–12 of
>    every stored top 25 are sub-$1, so $1–$20 reports are short) plus the frozen
>    `high_res` column.
> 6. Billing design is written (`docs/commercial/2026-09-28-daily-billing-infra.md`);
>    the build is gated on the sign-in cut-over, which waits on his Google OAuth
>    client.
> 7. **Deploy tooling owed:** preflight should re-check after the test gate
>    (the gate runs ~5 min first, so a launch cannot be aimed).
>
> ## Rules this seat learned the hard way
> - **Deploy, production write, restart, cancel: HIS word in YOUR session.**
>   The permission classifier refused a deploy on a relayed approval, an env
>   write on an ambiguous one, and a `systemctl stop` cancel. Never work around
>   a refusal; tell him and ask.
> - **Confirm every cutover from `/proc/<pid>/cwd`.** push-release now does it
>   itself and exits 8 (still running at deadline) or 9 (did not cut over).
> - **Aim by the preflight that is LIVE on the box**, not the one being shipped.
>   Clean RTH starts are C+4..C+12 past each half hour; weekdays 06:48–10:00 are
>   refused; weekends have no checkpoints (`61e2f77`, once shipped).
> - **`DEPLOY_TESTS_SKIP`** only when this session gated that exact sha ALL
>   GREEN with the pre-registered count and nothing changed; name it in the
>   ship line.
> - **Save full gate output to a file** (`> $TEMP/gate-<sha>.log`); never grep
>   the live stream. A flake's name was lost that way.
> - **Run gates from Git Bash.** Under PowerShell, `bash` is WSL and two deploy
>   test files fail. **Windows commit memory** (not free RAM) is what kills
>   gates: read `FreeVirtualMemory`.
> - **Write mutation scripts and multi-line code with the editor**, never inline
>   through a shell string: Windows paths and backslashes are lost.
> - **Predict the mutant kill count first.** A survivor means the test never
>   looked at the moment that mattered (happened twice this session).
> - **Scheduled tasks need a manual "Run now" first** to pre-approve their
>   tools, or they stall, as the 09-28 04:30 check did.
> - **"source_ids" is the CITED set; the model's bundle is the log line**
>   `evidence=N sources`. Two claims, two places.
> - **Reporting to him:** what changes his decisions or what the product can
>   do; mechanics go to peers, in full. The `🟠 NEEDS YOU` block only when a
>   decision is his.
