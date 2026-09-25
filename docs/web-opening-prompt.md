# Opening prompt — the Web seat

**Written 2026-09-25 at the end of the session that ran 2026-09-21 to 2026-09-25
and built the OAuth gate, handed off at the owner's session-hygiene prompt.
Every sentence below was true on that date.**

Open a new chat with `A:\mointel` as the working directory, so `CLAUDE.md`,
`AGENTS.md` and the project memory load on their own. Then paste everything
inside the quote.

---

> This is the **Web seat** for The Momentum Intelligence Trading Desk at
> `A:\mointel`.
>
> **First action, before anything else: title this session `Web-tmi`.** Peers
> find you by that title. Until it is set, nobody can reach you.
>
> **Second: check your own model and report it**, per
> `A:\claude-infra-agent\docs\session-hygiene.md` §1. If it is above Opus
> (Fable, Mythos), tell him with a recommendation. *The last two seats ran on
> Opus and kept it: this seat edits legal documents that are publicly in force,
> writes production DNS, and is about to wire and remove the only thing guarding
> the desk. Those are irreversible.*
>
> **Read in this order:**
> 1. `docs/threads/web.md` — the charter. **Where LIVE STATE and anything above
>    it disagree, LIVE STATE is right.**
> 2. `docs/web/README.md` — the public-surface handover.
> 3. `docs/web/2026-09-24-oauth-gate-plan.md` — **the OAuth gate. Its build log
>    (§5b) is the authoritative record of what is built; §5c is the callback
>    design.** Read it before touching anything under `app/auth/`, `app/signin/`
>    or `lib/auth/` — the surface is complete and tested, and rebuilding it is
>    the mistake to avoid.
> 4. `docs/web/2026-09-15-route-spec.md` — **delivered; read the box and stop
>    unless you are changing nginx.** Its two still-deferred locations — `/signin`
>    and `^~ /auth/` — ship at the cut-over below.
>
> **Follow the session-hygiene rule** at
> `A:\claude-infra-agent\docs\session-hygiene.md`: watch for saturation, warn him
> in the 🟠 NEEDS YOU block, and hand off before compacting rather than after.
>
> ## Where things stand
>
> The public site is live, complete and verified behind nginx Basic Auth. **The
> in-app OAuth gate is BUILT, gate-green (111 auth tests), and NOT LIVE.** His
> approved model is Google sign-in plus an invited-email allowlist (invite = add
> an email, revoke = remove; user admin by an AGENT). Every Web piece exists:
> `config`, `/auth/start`, `/auth/callback`, `/auth/signout`, the point-of-use
> gate, `/signin`, and the callback error pages; the allowlist store and
> `isUserInvited` are Ops's and built. **The gate is deliberately NOT wired into
> `/desk`** — wiring it before sign-in works end to end would strand the team on
> a sign-in they cannot complete.
>
> **Your first task: confirm nothing regressed** — run the verification below —
> **then hold for him.** The one large remaining piece is the **step-2 cut-over
> (taking the gate live), which is HIS to schedule and Integration orchestrates.**
> Do not start it on your own initiative. When he schedules it, Web's part is:
> wire the gate into `/desk` + `/api/*`, live-prove it against a client with **no
> cached Basic-Auth password**, then fill the `[FLOW COOKIE NAME]` placeholder
> from the live cookie name `mointel_oauth`. **Basic Auth comes off LAST, as its
> own change.** His inputs the cut-over needs: the Google client id + secret (to
> the box via Ops — never this seat) and confirmation to seed
> `iamadamzc@gmail.com` as the first invite.
>
> ## How this seat verifies, and why it does it this way
>
> **You cannot test a public page in your own browser.** Every browser on this
> machine has the desk password cached, so a 401 on a public page is invisible.
> Use `curl` — an actor with no cached state. **Run the negative control FIRST:**
>
> ```bash
> for p in /desk /signin /api/market /privacy-x; do curl -sS -o /dev/null -w "$p %{http_code}\n" "https://tmitrader.com$p"; done   # expect 401
> for p in / /privacy /terms /favicon.ico /icon.svg /apple-icon.png /robots.txt; do curl -sS -o /dev/null -w "$p %{http_code}\n" "https://tmitrader.com$p"; done   # expect 200
> python docs/web/placeholder-scan.py
> ```
>
> `placeholder-scan.py` exits non-zero on any unfilled `[PLACEHOLDER]`. It reports
> exactly one, `[FLOW COOKIE NAME]` on `/privacy` — deferred to the cut-over, not
> a defect. **And before wiring the gate: `npx vitest run tests/auth/` is green,
> and the mointel gate is `tsc --noEmit` + `eslint .` too, not just vitest.**
>
> ## The rules that are not style preferences
>
> - **The gate is not wired until the cut-over, and Basic Auth comes off LAST**,
>   its own change, proven against a client with no cached password. Steps 2 and
>   3 of the charter sequence are never the same commit.
> - **The legal texts have ONE source of truth**, rendered at request time. Never
>   copy legal text into a template.
> - **You draft legal text; he adopts it.** A material redraft sets `adopted` to
>   null and shows a DRAFT banner — drafting and re-adoption are one motion.
> - **Scopes are `email`, `profile`, `openid` and nothing else.**
> - **Pass the RAW Google claim email to `isEmailInvited` / the store — never
>   pre-normalise on Web's side.** The store folds both sides; one-sided folding
>   silently refuses the person it should admit.
> - **Read a peer's function before wiring against it.** `isUserInvited` and the
>   allowlist are Ops's; open them, do not trust a description.
> - **`git commit --only <explicit paths>`** — never `git add -A`. Several seats
>   share one index. **Name this seat in the commit message.**
> - **Take the clock from `zoneinfo`.** This host runs ahead of the desk.
> - **Route cross-thread traffic through Integration** — reply to the `from=`
>   address, not the role name.
> - **Reporting:** short, and end with the `🟠 NEEDS YOU` block only when a real
>   decision is needed. Omit it when nothing does.
>
> ## What this session learned that cost the most
>
> - **`DEFAULT_IDENTITY_PATH` is resolved at import, not per call.** A default
>   that reads `process.env` once at module load ignores an env set afterward —
>   it made a handler write to the wrong store and a test pass against a stale
>   path. Resolve deployment paths at call time.
> - **A test pinned to a literal can only say "a string I pinned is missing."**
>   Assert the property whose violation *is* the defect — the binding of the flow
>   cookie to the redirect, the flow cookie cleared on *every* callback exit.
> - **The artboard drifts from the routes.** `SignIn.dc.html` pointed the button
>   at `/auth/google`; the route is `/auth/start/google`. The button must match
>   the route you actually serve, verified live, not the drawing.
>
> ## What he does with the old chat
>
> Rename it `Web-tmi (retired 2026-09-25)` so the name no longer collides and
> messages route here instead, then **archive it — do not delete it.** The
> transcript is the record.
