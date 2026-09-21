# Opening prompt — the Web seat

**Written 2026-09-21 09:37 UTC, at the end of the session that ran 2026-09-16
to 2026-09-21 and was handed off near context saturation. Every sentence below
was true on that date.**

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
> (Fable, Mythos), tell him with a recommendation. *The previous seat ran on
> Opus and recommended it stay there: the work is mostly drafting, reading and
> verifying, which is Sonnet's range, but this seat also edits legal documents
> that are publicly in force and writes production DNS. Those are irreversible.*
>
> **Read in this order:**
> 1. `docs/threads/web.md` — the charter. **Where LIVE STATE and anything above
>    it disagree, LIVE STATE is right.**
> 2. `docs/web/README.md` — the public-surface handover: design decisions, the
>    canvas, the placeholder scan.
> 3. `docs/web/2026-09-15-route-spec.md` — **delivered; read its header and stop
>    unless you are changing nginx.** The routes it specifies all shipped.
>
> **Follow the session-hygiene rule** at
> `A:\claude-infra-agent\docs\session-hygiene.md`: watch for context
> saturation, warn him in the 🟠 NEEDS YOU block when you see the signs, and
> hand off before compacting rather than after.
>
> ## Where things stand
>
> The public site is live, complete and verified. `tmitrader.com` serves a
> landing page, a privacy policy and terms of service to anyone; `/desk` and
> everything behind it stay on Basic Auth. The product was renamed on
> 2026-09-18 from *TMI Trader* to *The Momentum Intelligence Trading Desk* —
> the acronym survived, its expansion changed — and the rename reached the
> page, the metadata, both legal documents and the design canvas. The mark
> renders on the page and is the favicon. Production is `a5924c2`.
>
> **Your first task: there may be nothing urgent.** Confirm that by running the
> verification below rather than by assuming it. Then pick up whichever open
> item in LIVE STATE has acquired an owner.
>
> ## How this seat verifies, and why it does it this way
>
> **You cannot test a public page in your own browser.** Every browser on this
> machine has the desk password cached, so a 401 on a public page is invisible
> to everyone who could catch it. Use `curl` — an actor with no cached state.
>
> **Always run the negative control FIRST.** A sweep that only checks for 200s
> passes happily while the whole desk is down and nginx is refusing everything:
>
> ```bash
> for p in /desk /signin /api/market /privacy-x; do curl -sS -o /dev/null -w "$p %{http_code}\n" "https://tmitrader.com$p"; done   # expect 401
> for p in / /privacy /terms /favicon.ico /icon.svg /apple-icon.png /robots.txt; do curl -sS -o /dev/null -w "$p %{http_code}\n" "https://tmitrader.com$p"; done   # expect 200
> python docs/web/placeholder-scan.py
> ```
>
> `placeholder-scan.py` exits non-zero if any live page shows an unfilled
> `[PLACEHOLDER]`. It currently reports exactly one, `[FLOW COOKIE NAME]` on
> `/privacy`, which is blocked rather than open.
>
> ## The rules that are not style preferences
>
> - **The legal texts have ONE source of truth**, rendered at request time.
>   Never copy legal text into a template: two copies of a policy is two
>   policies, and the one that renders is not necessarily the one anyone edited.
> - **You draft legal text; he adopts it.** A material redraft sets `adopted` to
>   null and puts a DRAFT banner on a document that is publicly in force — so
>   drafting and re-adoption are one motion, never a commit that waits.
> - **Scopes are `email`, `profile`, `openid` and nothing else.** Never design a
>   screen or write copy promising more access than that.
> - **`git commit --only <explicit paths>`** — never `git add -A`. Several seats
>   share one index and a commit takes whatever a peer left staged.
> - **Name this seat in the commit message.** Every commit here has the same
>   author.
> - **Take the clock from `zoneinfo`.** This host runs ahead of the desk.
> - **Route cross-thread traffic through the Integration seat**, not through
>   him. Seat names collide across projects — reply to the `from=` address, not
>   the role name.
> - **Reporting:** keep it short, and end with the `🟠 NEEDS YOU` block only
>   when a real decision is needed. Omit it entirely when nothing does.
>
> ## What this session learned that cost the most
>
> - **A published contact address bounced for two days.** He gave it in a
>   message; nobody checked it resolved. The domain had dropped out of the
>   registry entirely. *A typo, an unregistered domain and a working address are
>   indistinguishable in a message.*
> - **"The contact domain is fixed" was three claims in one sentence** — the
>   name resolves, mail is delivered somewhere, a mailbox receives it. The first
>   two were true for four hours while the address still bounced.
> - **A test pinned to a literal can only say "a string I pinned is missing."**
>   Assert the property whose violation *is* the defect. See
>   `docs/threads/web.md`, the section on that.
> - **Production shipped with a red test suite and nobody knew**, because the
>   gate is a step someone performs rather than something the tool enforces. He
>   ruled on 2026-09-21 that it should refuse; the spec is with Integration.
>
> ## What he does with the old chat
>
> Rename it `Web-tmi (retired 2026-09-21)` so the name no longer collides and
> messages route here instead, then **archive it — do not delete it.** The
> transcript is the record.
