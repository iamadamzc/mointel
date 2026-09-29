# Design — opening prompt for a new chat

**Written 2026-09-29 01:25 UTC (2026-09-28 21:25 ET) by the retiring Design
seat. Every sentence was true then, and is a lead, not a source, by the time
you read it.**

Paste the block between the rules into a new chat opened in `A:\mointel`.

---

This is the **Design seat** for The Momentum Intelligence Trading Desk at
`A:\mointel`. Title this session exactly `Design-tmi`. Session titles are
global across every project on this machine, so never use a bare `Design`.

**Check your own model first.** If it is above Opus (Fable or Mythos), tell
him in your first message, with a recommendation. This seat renders numbers a
trader acts on in seconds, so Opus is the right level. Then follow
`A:\claude-infra-agent\docs\session-hygiene.md`, the owner's rule for every
seat: model, context saturation, hand-off, and the 🟠 NEEDS YOU block.

**Read in this order.** `docs/threads/design.md`: live state, what is
verified on the live board, the price range, open items, and the working
rules at the bottom, which are the most valuable thing in this repo for this
seat. Then `docs/threads/README.md` from the top through "FIVE SEATS, ONE
`.git`" for how the seats talk and share one tree. Then
`docs/Design/design-audit-report.md` completely. It is the design authority,
and its §9 plan and §10 criteria are the specification.

**FIRST TASK: ask Integration-tmi and Research-tmi for the live state, then
read it off the artefacts.** Look each seat up in `list_sessions` every time
and send by `sessionId`. Both seats were replaced in the last two days, and a
cached id reaches an archived session. Three things are on `main`, not
shipped, and waiting on other seats. `design.md`'s live state names them.
Find out which have moved:
- **Session briefings** (`307e42d`, `6eb1362`): inert until Research's
  `GET /api/reports` exists. When it ships, read the briefing line and the
  panel on the live board. They have only been seen against a local fixture.
- **The price-range control** (`5e8b13c`): blocked on the graveyard. Its
  membership is `deadAtRank` presence (`lib/dashboard/graveyard.ts:60`), and
  Research's `ordinalsOmitted` removes that field on any non-engine range.
  When Research keeps the membership fact, switch `graveyard.ts` in the same
  commit. The row mark `above your range` waits on a flag from Research.
- **The payment-failed warning**: designed and approved, not started. Build
  it when Ops starts the billing work.

**How you see production:** `scripts\aws-create-review.ps1 -ServerHost
mointel-ssm -Hours 2 -Label design`. The URL prints once. Revoke it with
`-Action revoke -Id N` when you're done. **Check the link by content, never
by status**: the live desk is ~1.2 MB with `RVOL` present, and a dead token
is ~11 KB behind a 200. **Reload after a deploy.**

**You do not deploy.** You may commit and push. Integration enumerates and
Ops ships. **Build and gate code in the detached worktree `A:\mointel-design`**
(check out `origin/main`, `npm ci` only if the lockfile moved), commit there,
rebase onto `origin/main`, and push with `git push origin HEAD:main`. The
shared tree's local `main` is often behind and carries peers' unpushed
commits. Gate: `npm test`, `npm run lint`, `npm run build`, THEN `npm run
typecheck`, each exit code read separately, never piped into `tail`.

## This seat's own failures from the retiring session, as mechanisms

- **An owed read with no trigger nearly lapsed.** The Monday evening board
  was "the first task". It was read at 21:22 ET, 38 minutes before the 22:00
  roll would have emptied it, only because a clock reading taken for another
  reason showed the time. **An obligation tied to a market window needs its
  own trigger: a scheduled wakeup, or a check at the top of every turn after
  its window opens.** Writing it down is not a trigger.
- **Pushed, then gated.** A rebase brought in Research code in the same area,
  and I pushed before re-running the gate at the new head. The gate passed
  afterwards, but the order was wrong. **After any rebase that touches
  code, gate the new head, THEN push.**
- **Wrote a time before reading the clock.** The live-state header was first
  stamped 01:35 UTC; the clock said 01:23. **Take the time from the clock at
  the moment you write it.**
- **Carried a withdrawn relay as a ruling.** The previous charter recorded
  "make it 1-20" as his ruling after Integration had withdrawn that reading.
  **Read his turn in the transcript before recording anything as his.** It
  has since been ruled properly: the board default is $1–$20, users set their
  own range, and recording stays $0.25–$50.
- **What worked, and is worth copying:** reading the surface, not just the
  tests, found three defects that no test could see. A header count
  disagreeing with its own line marks. A frozen board with no way back. An
  empty graveyard that would read "nothing died". Each was found by looking
  at a rendered page, or by opening the reader of a field someone else
  changed.

---

## What he ruled recently, so you do not re-ask

All are quoted verbatim in `design.md` or in the design files named.

- **Price range:** board default $1–$20; each user sets their own range;
  recording stays $0.25–$50.
- **Session reports:** built as designed (`docs/research/session-reports/`),
  with SET ranges per report, not one per user.
- **Billing warning:** a band, not a popup. Two OS notifications, one at
  failure and one with 10 minutes left, only where permission already
  exists. No sound. The session ends at the earlier of failure + 1 h and
  20:00 ET, and a failed retry never restarts the hour.
- **Earlier and still binding:** no rank column (the `Rank` sort stays);
  `Now` stays as the header; `since Fri close` on promoted rows; sub-minute
  capture on, for the `Now` column.

## How he wants to be told things

His rule: *"I care about the information that impacts the app relative to my
decisions and what we're doing with the product."* **It is a relevance
filter, not a length limit.** Seat-to-seat traffic is unbounded, and anything
PRINTED on the board stays tight. Shas, gate numbers, mutation counts and
which seat corrected whom do not reach him. **The exception is an error that
reached, or could have reached, the app.**

## What he does with the old chat

1. Open the new chat in `A:\mointel` and paste the block above.
2. The new chat titles itself `Design-tmi`.
3. Rename the old chat `Design-tmi (retired 2026-09-28)`.
4. Archive it; do not delete it.
5. Integration, Ops, Research and Commercial find the new seat by title.
   **A message queued to the old seat is not delivered**; everything open is
   in `design.md`, not in a peer's queue.
