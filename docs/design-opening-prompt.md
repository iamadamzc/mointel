# Design — opening prompt for a new chat

**Written 2026-09-29 03:42 UTC (2026-09-28 23:42 ET), clock read via zoneinfo,
by the retiring Design seat at a clean task boundary (his "yes, fresh session
for the Now build"). Every sentence was true then, and is a lead, not a source,
by the time you read it. If this prompt and `design.md`'s live state disagree,
the live state is right.**

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
Then the spec you will build from, `docs/Design/near-live-now-spec.md`,
especially "HIS ANSWER" and "The build plan".

**FIRST TASK: ask Integration-tmi and Ops-tmi for the live state, and read it
off the artefacts.** Look each seat up in `list_sessions` every time and send by
`sessionId`; Ops was replaced tonight too. Settle:
- **Has the range set shipped, or been voided?** It waited on Ops's two
  range-read measurements (~08:30 and ~11:05 ET 09-29: warm max < 20 ms for
  EVERY viewer range on both boards) and his yes in Ops's session. **This
  triggers your first owed cut:** resizable columns (`1d59b00`, on main, built
  and viewed locally, not shipped) is cut as a `design/` TAG from PRODUCTION's
  sha if the range set shipped, or from `2256c63` if it was voided (then the
  `DiscoveryBoard.tsx` conflict is yours). Tell Integration when cut. The rule
  is in `design.md`'s open-items row.
- **If the range set is live: read the live board** (review link below): a
  custom range in the control, the graveyard on that range, the drawer with no
  Rank Change line. **Reload first.**
- **Where Research's `Now` wiring stands:** the field is on main (`ca8eed9`,
  `c657830`: ABSENT when capture cannot answer); `getMarketSnapshot` wiring
  waits on Ops's read-only trades.db opener; the market-worker restart time is
  Ops's to propose and his to approve.

**THEN THE BUILD: the near-live `Now` cell, on `main`, against the contract.**
Approved (*"yes build the near-live now column"*, 01:38:17Z) with his shape
(*"same exact pattern ... the last minute in 10 sec increments"*, 02:30:43Z)
and *"i want the trade counts, dots and direction color"* (02:32:20Z).
**The plan is fixed in the spec's "The build plan"**: capture state from
`tradeCapture.asOf` vs the snapshot's `fetchedAt` (server timestamps, never the
client clock); one per-row reading resolved in `mergeDesk` and read by both the
cell and the sort; a tiered sort (live, then minute fallback, then
unmeasured); a null slot is a gap. It is inert until the field is served, and
**nothing of it ships before the restart and a live read on real 10 s data.**
Also open, smaller: the sorted `Now` header renders on three lines (open items).

**How you see production:** `scripts\aws-create-review.ps1 -ServerHost
mointel-ssm -Hours 2 -Label design`. The URL prints once. Revoke it with
`-Action revoke -Id N` when done. **Check the link by content, never by
status**: the live desk is ~1.2 MB with `RVOL` present; a dead token is ~11 KB
behind a 200.

**How you see a build locally:** a copy of `data/market.db` (+ `-wal`) in your
scratchpad, `next dev -p 3100` from the worktree with `MARKET_DB_PATH` pointing
at the copy (no `.env.local` in the worktree, so no credential loads), via a
temporary `.claude/launch.json` entry you revert afterwards. The route is
`/desk`. Close the tab and stop the server when done.

**You do not deploy.** Commit and push. Integration enumerates, Ops ships.
Build and gate in the detached worktree `A:\mointel-design` (check out
`origin/main`), commit there with `git commit --only <paths>`, rebase onto
`origin/main`, **gate the rebased head again if the rebase brought code**,
then `git push origin HEAD:main`, and verify with `git branch -r --contains`.
**Gate from the Bash tool (Git Bash), not PowerShell.** Gate order: `npm test`,
`npm run lint`, `npm run build`, THEN `npm run typecheck`, each exit code read
separately. Docs can be committed from the shared tree with `--only`, after
`git merge --ff-only origin/main`; never touch a peer's uncommitted files there.

## This seat's own failures from the retiring session, as mechanisms

- **A test that holds by construction.** "Widths sum to the table width" passed
  with Why/Risk negative, because the remainder column makes the sum true
  whatever happens. Caught only because I predicted each mutant's kill count
  before running it and one prediction had no test able to meet it. **Predict
  the count first; a check the model satisfies by arithmetic is not a check.**
- **The React-compiler lint is part of the gate and it is strict.** A ref read
  during render, a synchronous setState in an effect, and — non-obviously — any
  hook member NAMED `…Ref`, or any object whose member is passed as a `ref`,
  taints the whole object and flags every access to it. Destructure hook
  results; name callbacks `attach…` / `measure…`.
- **A hidden browser pane is not a browser.** With the pane hidden,
  `document.hidden` is true and ResizeObserver never fires, so a working build
  looked broken after a reload. Probe the instrument (a fresh observer) before
  editing on a "defect" — it turned into a real fix (one synchronous read), but
  only because the probe came first.
- **Multi-paragraph `~~strike~~` and CRLF.** Markdown strike does not cross a
  code block, and the working tree here is CRLF: a Python `str.replace` on an
  LF pattern matches nothing and a following `git commit --only` then commits
  nothing. Normalise, assert the count, and read `git log` after.
- **What worked:** reading the producer's code against the spec before the
  expensive step (it found a real contract defect Research fixed in minutes);
  running the peer's gate myself (it named the flake nobody had named);
  writing every relay into the charter before sending it.

---

## What he ruled recently, so you do not re-ask

All quoted verbatim in `design.md` or the specs, with his turn's timestamp.

- **Price range:** board default $1–$20; users set their own; recording stays
  $0.25–$50. `Rank held` omitted on the default board; the drawer's Rank Change
  line removed.
- **Now column:** build it; last minute as six 10 s bars, newest bucket as the
  number, **with counts, price dots and direction colour**; no bars-only
  interim. Market-worker restart approved IN PRINCIPLE; Ops proposes the time
  and he approves that time.
- **Resizable columns:** Discovery only, widths in this browser. Built.
- **Fresh session for the Now build** (2026-09-29 ~03:40Z, this seat).
- **His view, NOT a ruling:** *"rank in general is not important imo."*

## How he wants to be told things

*"I care about the information that impacts the app relative to my decisions
and what we're doing with the product."* A relevance filter, not a length
limit. Shas, gate numbers and which seat corrected whom do not reach him. **The
exception is an error that reached, or could have reached, the app.**

## What he does with the old chat

1. Open the new chat in `A:\mointel` and paste the block above.
2. The new chat titles itself `Design-tmi`. (The retiring seat has already
   renamed itself `Design-tmi (retired 2026-09-29b)`.)
3. Archive the old chat; do not delete it.
4. Peers find the new seat by title. **A message queued to the old seat is not
   delivered**; everything open is in `design.md`.
