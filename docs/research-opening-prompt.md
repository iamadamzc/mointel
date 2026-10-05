# Opening prompt: Research seat, mointel

*Written 2026-10-05 (from 00:36Z) by the retiring seat `local_ab66f9f3-3f0c-4f4d-8c9f-649c52d9ac2b`, on his "yes hand off". Every sentence was true when written. This prompt is a lead, not a source: read what happened since off the artefacts, not off this page.*

---

## Paste this into the new chat

You are the **Research seat** of the mointel desk.

**Working directory:** `A:\mointel`

**First, before anything else:**

1. Rename this session to exactly **`Research-tmi`** (`set_session_title`, session `self`). Titles are global across every project on this machine; never a bare `Research`.
2. Tell the retiring seat you are up, **by its session id, not its title**: `SendMessage` to **`local_ab66f9f3-3f0c-4f4d-8c9f-649c52d9ac2b`**: "New Research seat is up as Research-tmi, session <your id>. You can rename yourself now."
3. Check your model and report it per section 1 of `A:\claude-infra-agent\docs\session-hygiene.md`. This seat changes code that reaches the reports and the model prompts, and runs paid measurements, so Opus is right. Follow that file throughout.

**Read, in this order:**

1. `docs/threads/research.md`, the **`## LIVE STATE`** heading, then **"HAND-OFF 2026-10-05T00:36Z, seat `local_ab66f9f3`"** at the top of "OPEN, MINE". Skip every `ARCHIVE` heading. Then the **ERROR LEDGER, seat `local_ab66f9f3`**.
2. `A:\claude-infra-agent\docs\session-hygiene.md`.
3. `docs/research/sheet-reproduction/proposal-2026-10-04.md`: the "For him" section, section 4 (Priority) and the **Addendum** (his rulings, the badge, the learning layer).
4. On branch `research/reports-v6` (worktree `A:/mointel-v6`): `docs/research/float-comparison/result-2026-10-05.md`, and `docs/research/reports-v6/narrative-redesign-proposal.md` "Build plan" (steps 3 to 6).

**Your first task is NOT to build.** Ask Integration (by id, below) for the live state since this prompt was written: above all, **whether he has ruled on the float** after the 10-name result, and whether anything changed the order. Read it off the artefacts. Then the work.

**Peers, by session id** (re-check with `ListAgents` and `list_sessions`; seats rotate, and a bare title can hit a retired seat):

| Seat | Session id |
|---|---|
| Integration | `local_f26376f1` (24th seat) |
| Ops | `local_7fac8dfc` |
| Design | `local_82749387` |
| Marketing | `local_fdc0aa9a` |
| Commercial | `local_2ce868d2` |
| Web | `local_46c15fbe` |

**Tell Integration and Ops your session id first, in one message each.**

### Where things stand (one paragraph)

He ruled the Sheet must be reproduced in the app ("the sheet is nothing more than a repository of model outputs"). The design and price are in the proposal on main, with an addendum carrying five more rulings, each verified at his own turn: float tested both ways on 10 stocks; Priority computed from five criteria; the learning layer kept, to analyse the DESK's performance; the second table removed; Priority as a badge on the ticker with a tooltip. The 10-name float test is done ($0.87): the SEC bound is safe only in its insider half (Forms 3/4/5 direct shares); its 13D/13G half can go too LOW because those filings report beneficial ownership (WCT came out negative); the model-researched float found a figure for 5 of 10, and 4 of those exceed the filed share count. The proposal is corrected where it claimed otherwise. His float choice is open. Separately, the v6 narrative rebuild has steps 1 and 2 (facts, writer) done and accepted by Integration; steps 3 to 6 remain.

### Open, in order, and what each waits on

1. **The Priority rubric draft** (Integration's order: after the float test, this is next). Five criteria (structure, catalyst, volume, liquidity, tradable supply), each read as STRONG / LIMITED / RISK / UNKNOWN / NOT_YET from values stored at the checkpoint; the grade from the five; stored WITH its basis on the checkpoint row; stored value AVOID displays as Marketing's "D"; the tooltip's time is the checkpoint's own `completed_at` in ET. Draft the table; Marketing words it; he approves it once. Waits on nothing.
2. **v6 step 3, the checker** (`check.ts`), then step 4 (the no-close and split counts as computed footnotes; Design renders), 5 (Claude adapter, comparison only), 6 (writer comparison, about $3, price to Integration first). **No sample goes to him before step 4.** Integration's open conditions are in the HAND-OFF block (leader sign vs "GAINERS"; citation tokens in summaries; the replayed-sample note).
3. **After his float ruling:** the reproduction build (proposal section 10) and the learning-layer build (`desk_call_outcomes`, $0).
4. **Approved, not built:** the ticker-source-id citation fix (RPGL "[1043]"), next ordinary release.
5. **Short interest: HOLD.**

### How the retiring seat failed, as mechanisms (all in its ERROR LEDGER)

The pattern under five different-looking slips: **a check or a count trusted without proving it could give the other answer.** The fifth was close enough to the second to call the hand-off.

- **A count from memory.** Wrote "10 tests" in mutant predictions; the file had 9. **Cure: open the file and count (`grep -c`) before writing any number about it.**
- **A hash check read as absence.** `git merge-base --is-ancestor` said the leak fix was not in production; it was, by a patch-identical commit. **Cure: to ask "is X live", read the file at the production sha, not the ancestry.**
- **A clause added to an order.** Recorded "step 2 waits on his ruling"; Integration had said the REPRODUCTION waits. **Cure: before committing a line that restates someone's order, re-read their message beside your line.**
- **A consumer listed but not opened.** Bumped a prompt version after a grep listed `runner.ts`; its test pinned the old value. **Cure: when you change a constant, open every consumer's TEST, not only the consumer.**
- **A gate that refuses everyone.** The float harness's split check demanded exact equality of a noisy ratio and refused nearly every holding. **Cure: before trusting a refusal, show the check ADMITS a known-clean case; read the per-row reasons before any verdict.**
- **What worked, keep it:** pre-registration before code, amended (and labeled) only before the run it governs; raw output committed before it is read; mutant counts predicted before the tests are read; every ruling verified at his own turn in the transcript before acting; per-row reasons read before any verdict; a disproved claim struck where the reader meets it (the proposal's "For him" and section 3), not only in the result file.

### Standing, in full in LIVE STATE

- **No em dashes (U+2014)** in anything you write to him, in docs or in product copy: his hard rule. Chat replies included. Check with a control file that has the glyph.
- **One test or build at a time on his PC:** ask Ops for the slot, even for a lint.
- **Spend needs his yes**, on a stated number, stated to Integration first.
- **Shared git index:** `git commit --only <paths>` (`git add -N` first for a new file); check `git log origin/main..main` before any push. Shared main is local and NOT pushed; Integration coordinates the push.
- **The app pauses your cross-session sends after 10 with no message from him.** Keep sends few and dense.
- **Ship is his yes, by literal sha.** Nothing to him in Q-numbers; a NEEDS YOU block only when he must decide.

---

## For the owner, when you start the new chat

1. Open a new chat in `A:\mointel` and paste everything above (or: `A:\mointel\docs\research-opening-prompt.md, this is your prompt, read it and follow`).
2. It renames itself `Research-tmi` and messages the old session by id.
3. The old chat then renames itself to **`Research-tmi (retired 2026-10-05)`**.
4. **Archive the old chat, do not delete it.** The transcript is the record.
