# Design — opening prompt for a new chat

**Written 2026-09-29 02:45 UTC (2026-09-28 22:45 ET), clock read via zoneinfo,
by the retiring Design seat. Every sentence was true then, and is a lead, not a
source, by the time you read it. If this prompt and `design.md`'s live state
disagree, the live state is right.**

Paste the block between the rules into a new chat opened in `A:\mointel`.

---

This is the **Design seat** for The Momentum Intelligence Trading Desk at
`A:\mointel`. Title this session exactly `Design-tmi`. Session titles are
global across every project on this machine, so never use a bare `Design`.

**Check your own model first.** If it is above Opus (Fable or Mythos), tell
him in your first message, with a recommendation. This seat renders numbers a
trader acts on in seconds, so Opus is the right level. Then follow
`A:\claude-infra-agent\docs\session-hygiene.md`: model, context saturation,
hand-off, and the 🟠 NEEDS YOU block.

**Read in this order.** `docs/threads/design.md`: live state, open items, the
error ledger, and the working rules at the bottom. Then `docs/threads/README.md`
from the top through "FIVE SEATS, ONE `.git`". Then
`docs/Design/design-audit-report.md` completely; it is the design authority.
Then the two specs you will build from: `docs/Design/resizable-columns-scope.md`
and `docs/Design/near-live-now-spec.md`.

**FIRST TASK: ask Integration-tmi and Ops-tmi for the live state, and read it
off the artefacts.** Look each seat up in `list_sessions` every time and send by
`sessionId`: Integration and Research were both replaced tonight. Two things to
settle first:
- **The range tag's gate.** The range set ships as the tag
  `design/range-set-on-2256c63` → `520142c`, cut onto production without the
  briefings. Ops reported its gate RED on one test (~02:40Z); this seat's gate
  at the same sha was green. Get the failing test's NAME and error from Ops. A
  bash-driven `releaseRetention` timeout is load on this host (it passes
  alone). Anything in `tests/dashboard` or `tests/market` is yours: re-cut the
  tag on `2256c63` and gate it.
- **After the range set deploys, read the live board** (review link below): a
  custom range in the control, the graveyard on that range (no `Rank held`
  column, names still listed), the drawer with no Rank Change line, and the
  review link serving the same range. **Reload first.**

**THEN THE BUILD HE APPROVED: resizable columns, Discovery only**
(*"2 yes discovery only"*, 02:41:45Z). Build exactly
`resizable-columns-scope.md` option (A) and its guardrails on `main`. It ships
after the range release. The near-live `Now` column is also approved but
**waits on Research's engine change and a market-worker restart** (spec, "HIS
ANSWER"); do not start its cell before that data exists.

**How you see production:** `scripts\aws-create-review.ps1 -ServerHost
mointel-ssm -Hours 2 -Label design`. The URL prints once. Revoke it with
`-Action revoke -Id N` when done. **Check the link by content, never by
status**: the live desk is ~1.2 MB with `RVOL` present; a dead token is ~11 KB
behind a 200.

**You do not deploy.** Commit and push. Integration enumerates, Ops ships, and
**a pick that conflicts in a board component comes back to you to re-cut on the
production base.** Build and gate in the detached worktree `A:\mointel-design`
(check out `origin/main`), commit there with `git commit --only <paths>`, rebase
onto `origin/main`, **gate the rebased head again if the rebase brought code**,
then `git push origin HEAD:main`, and verify with `git branch -r --contains`.
**Gate from the Bash tool (Git Bash), not PowerShell:** PowerShell's `bash` is
WSL here and fails the deploy-script tests. Gate order: `npm test`,
`npm run lint`, `npm run build`, THEN `npm run typecheck`, each exit code read
separately.

## This seat's own failures from the retiring session, as mechanisms

- **Narrowed his ruling on my own reading, and he had to catch it.** He said
  the new `Now` cell should be the *"same exact pattern"*. I recorded a
  bars-only first version as "Design's reading, not a question for him unless he
  objects", because the price data did not exist yet. He objected. **A missing
  input is a sequencing problem to solve, never licence to trim what he asked
  for.** If his words cannot be met yet, say what it takes and ask; never
  pre-decide the cut.
- **Named the field, not its render.** I told Integration, and him, that a
  drawer line would be "lost" after the $1–$20 default. It would have printed
  `New` on every stock. I had read the field in a grep, not the component that
  renders a null. **Before saying what a surface will show, open the render
  path for the exact value it will get.**
- **Stamped times before reading the clock** (twice in the first hour; the
  retiring seat before me made the same error). Read zoneinfo, then write.
- **Relative paths in .NET calls from PowerShell resolve against the process
  directory, not `Set-Location`.** `[IO.File]::WriteAllBytes('components/…')`
  wrote a temp file into the SHARED tree. Found and removed within the minute.
  **Always pass absolute paths to .NET file calls.**
- **What worked:** enumerating producers and readers before switching a field
  (the graveyard); mutation-testing with a predicted count (every prediction
  matched tonight); opening the peer's changed field (it caught nothing wrong
  in `aboveRangeLatched`, and showed the board already had the mark).

---

## What he ruled recently, so you do not re-ask

All quoted verbatim in `design.md` or the specs, with his turn's timestamp.

- **Price range:** board default $1–$20; users set their own; recording stays
  $0.25–$50. *"dead rank not important"*: `Rank held` is omitted on the default
  board.
- **Drawer:** the Rank Change line is removed (*"yes remove it"*).
- **Now column:** build it (*"yes build the near-live now column"*), with the
  last minute as six 10 s bars and the newest bucket as the number, **with
  counts, price dots and direction colour** (*"i want the trade counts, dots and
  direction color"*). A market-worker restart is approved IN PRINCIPLE; Ops
  proposes the time and he approves that time.
- **Resizable columns:** build, Discovery only, widths in this browser.
- **His view, NOT a ruling:** *"rank in general is not important imo."*
  Nothing is removed on it.
- **Earlier and binding:** no rank column (the `Rank` sort stays); `Now` stays
  as the header; `since Fri close` on promoted rows.

## How he wants to be told things

*"I care about the information that impacts the app relative to my decisions
and what we're doing with the product."* A relevance filter, not a length
limit. Shas, gate numbers and which seat corrected whom do not reach him. **The
exception is an error that reached, or could have reached, the app.**

## What he does with the old chat

1. Open the new chat in `A:\mointel` and paste the block above.
2. The new chat titles itself `Design-tmi`.
3. Rename the old chat `Design-tmi (retired 2026-09-29)`.
4. Archive it; do not delete it.
5. Peers find the new seat by title. **A message queued to the old seat is not
   delivered**; everything open is in `design.md`.
