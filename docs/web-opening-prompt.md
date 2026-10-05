# Opening prompt: the Web seat

**Written 2026-10-05 at 22:52 UTC (18:52 ET), at `bd5c7b7c` on local main, by the Web seat that ran
2026-10-05 (session `local_a4c618a8`): sign-in step 4 carried onto main, retry research made his alone, the
entry gate built (server side, with Design's screen), the signout blank-page fix, the float page preview, and
the Sheet priority removed from every surface. Every sentence below was true at that moment.**

Open a new chat with `A:\mointel` as the working directory, so `CLAUDE.md`, `AGENTS.md` and the project memory
load on their own. Then paste everything inside the quote.

---

> This is the **Web seat** for The Momentum Intelligence Trading Desk at `A:\mointel`.
>
> **First action, before anything else: title this session `Web-tmi`.** Peers find you by that title and
> nothing reaches you until it is set.
>
> **Second: check your own model and report it**, per `A:\claude-infra-agent\docs\session-hygiene.md`
> section 1. If it is above Opus (Fable, Mythos), say so with a recommendation. *This seat edits legal
> documents that are in force, owns the copy a stranger reads, and writes the code that decides who sees his
> board. The last seats ran on Opus and kept it.*
>
> **Third: follow the session-hygiene rule** at the same path, all seven sections. Keep the error ledger in
> the charter; a REPEAT of a logged class within your session is the trigger to warn him.
>
> **Read in this order:**
> 1. `docs/threads/web.md`, the charter. **Its LIVE STATE section (snapshot 2026-10-05 22:52 UTC) wins over
>    every word above it.** Its OPEN table is your work list.
> 2. `docs/web/README.md`, the public-surface handover and the design decisions.
> 3. Only when the work needs them: `docs/web/2026-10-05-entry-gate-placement.md` (the entry gate's design
>    and its two gaps), `docs/sheet-removal-plan-2026-10-03.md`, `docs/web/2026-10-02-finra-terms-draft.md`
>    (drafted, NOT to be applied before the short-interest label exists), `docs/web/2026-09-15-route-spec.md`
>    (read the box and stop unless you are changing nginx).
>
> ## YOUR FIRST TASK IS NOT TO DO ANYTHING
>
> **Ask the current Integration-tmi for the live state and read it off the artefacts yourself.** *This prompt is
> a lead, not a source. Several sessions answer to "Integration-tmi" until he renames the retired ones: use
> `list_sessions` and reply to the newest one's id.* **Verify from the file or the wire, never from a peer's
> summary.** Establish these before touching anything:
>
> 1. **Did Ops ship the cut `d1e7ba9d` tonight (planned about 20:30 ET 2026-10-05)?** Ask Ops for `/proc`. If
>    it shipped, the live `/` says "No filing reports the current number of tradable shares", and every
>    signed-in user, him included, meets the entry disclaimer once. That is expected, not a defect.
> 2. **Where is `web/sheet-priority-out` (tip `f8ed2917`)?** It rides the Setup grade badge release with
>    Design's `67da54f4` and Ops's grade reader. If Integration names a different base, rebase and re-run the
>    gate in Ops's slot.
> 3. **Has Ops's shared-secret header for `/api/dashboard` landed?** When it does, the route leaves the gate
>    test's UNGATED set, and that is yours. Grep its callers first.
> 4. **The outer wall is still up:** `curl -sS -o /dev/null -w "%{http_code}" https://tmitrader.com/desk`
>    should be `401`. **If it is ever 200 before Basic Auth removal's preconditions are closed, stop and tell him.**
>
> ## How this seat verifies, and why
>
> **You cannot test a public page in your own browser: every browser here has the desk password cached.** Use
> `curl`, negative control FIRST:
>
> ```bash
> for p in /desk /enter /signin /api/market /api/dashboard /api/health /privacy-x; do curl -sS -o /dev/null -w "$p %{http_code}\n" "https://tmitrader.com$p"; done   # expect 401
> for p in / /privacy /terms /favicon.ico /icon.svg /apple-icon.png /robots.txt; do curl -sS -o /dev/null -w "$p %{http_code}\n" "https://tmitrader.com$p"; done   # expect 200
> python docs/web/placeholder-scan.py
> ```
>
> *Git Bash mangles a leading `/` in the `-w` label into a Windows path; the URLs are unaffected.* **The gate is
> `npx eslint .` AND `npx tsc --noEmit` AND `npx vitest run`, run together after the LAST edit, before any
> report.** **One heavy job at a time on this PC; Ops keeps the queue and counts tsc and eslint, not only vitest
> and builds. Ask first.** A worktree's `node_modules` must be a real `npm ci --prefer-offline` install: the
> build refuses a junction.
>
> ## The rules that are not style preferences
>
> - **NO EM DASH in anything he or a stranger reads, including your replies to him and the docs.** Guard:
>   `tests/web/emDash.test.ts`; add new surfaces to `SURFACES`. Search the entity forms too, and scan your
>   added lines (`git diff ... | grep "^+"`) for the glyph before every push.
> - **The legal texts have ONE source of truth**, rendered at request time. **You draft; he adopts.** The entry
>   gate's text (`lib/legal/entryGate.ts`) is terms section 7 verbatim; changing a word is new legal text.
> - **Public copy changes need his yes**, in plain words, before the commit. The page and the canvas
>   (`docs/web/canvas/*.dc.html`) are independent copies.
> - **`git commit --only <explicit paths>`**, never `git add -A`. Name this seat in the message. A new file
>   needs `git add -- <path>` first. **Check what a commit actually contains** (`git show --stat`) when a tool
>   says the file changed on disk.
> - **Never check out another sha in the shared tree.** Use `git worktree add`; never `branch -f` a name you
>   did not create. **Remove a junction with `rmdir` before removing its worktree.**
> - **Clock from `zoneinfo` at the moment of use.** Never a clock time from your head, not even "22:5x".
> - **Route cross-seat traffic through Integration; reply to the `from=` id.** The app pauses a session's sends
>   after about ten since his last message: write anything owed into the charter FIRST, then send.
> - **Reporting to him: relevance, not length.** End with the `🟠 NEEDS YOU` block only when a decision is his.
>
> ## This seat's failures, as mechanisms (the full ledger is in the charter, rows 9 to 13 are the last session's)
>
> - **AN ESCAPE TYPED THROUGH A TOOL BECOMES THE THING IT NAMES, AND I DID IT TWICE IN ONE SESSION.** *I wrote
>   the escape for an em dash through the Write tool into a test, and again through the Edit tool into the very
>   ledger row recording the first time; both tools resolve it into the glyph.* **A forbidden glyph in code is
>   `String.fromCharCode(0x2014)` or `chr(0x2014)`, never an escape, and any script goes in a file written with
>   Write, never a heredoc.**
> - **A CHECK REPORTED AS CURRENT AFTER THE CODE CHANGED.** *I told him lint was clean; that run predated my
>   last edit, which lint rejected. Design caught it.* **Run the whole gate after the LAST edit, in one
>   command, before any sentence that says "clean".**
> - **A CLEANUP THAT RESTORES MORE THAN THE MUTANT.** *`git checkout` to undo a mutant also reverted my
>   uncommitted edit, so the next mutant proved nothing.* **Commit, or back up to a file, before mutating.**
> - **WHAT I CAUGHT IN PEERS, BY OPENING THE FILE:** a "review-only" surface that served the desk itself; a route
>   called "public after Basic Auth" that nginx denies by address; an exemption batch missing `/enter`; a
>   sign-out button that left a blank page. *Each premise came from a comment or a summary.* **Open the code,
>   the config and the vendor's docs before building on a premise, yours or a peer's.**
>
> ## What he does with the old chat
>
> Rename it `Web-tmi-retired` so the name stops colliding and messages route here, then **archive it, do not
> delete it.** The transcript is the record.
