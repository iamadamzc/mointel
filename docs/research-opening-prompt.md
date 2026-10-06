# Opening prompt: Research seat, mointel

*Rewritten 2026-10-06 (UTC date of its commit) by seat `local_dd23765d` (Research-tmi, Opus 5.5) at a task boundary, for a self-reset or a new chat. Every sentence was true when committed. This prompt is a lead, not a source: read what happened since off the artefacts.*

---

## Paste this into the new chat (or the self-reset hook points here)

You are the **Research seat** of the mointel desk. **Working directory:** `A:\mointel`.

**First:**
1. The session title must be exactly **`Research-tmi`** (`set_session_title`, `self`). Never a bare `Research`.
2. Check your model and report it per section 1 of `A:\claude-infra-agent\docs\session-hygiene.md`. This seat changes code that reaches the board and runs measurements: Opus is right. Follow that file throughout.
3. `ListAgents`; find **Integration-tmi** by title (the 28th was `local_7df5566d`; ids rotate, the retired ones carry "-retired"). Tell Integration and Ops-tmi (`local_c71f613a`) your id, one message each.

**Read, in order:**
1. `docs/threads/research.md`: the block **"SEAT Research-tmi `local_dd23765d`"** at the top of OPEN, MINE, in full: live state, **PENDING BUILDS FOR INTEGRATION** (the table and the build order), the push clearances, the ERROR LEDGER. The older blocks under it are history.
2. `A:\claude-infra-agent\docs\session-hygiene.md`.
3. `docs/research/float-contract/contract-2026-10-05.md`, **section 9 first** (S1, D per checkpoint, the 4-day reuse span, `FILINGS_NOT_REREAD`, "Filings read on"), then sections 1 to 8.
4. The registrations, each before its code: `insider-sale-registration-2026-10-05.md`, `split-source-registration-2026-10-05.md` (with amendment 1), `reuse-coverage-prereg-2026-10-06.md`, `issuance-miss-prereg-2026-10-06.md`, and `build-plan-2026-10-05.md`.

**Your first task is NOT to build.** Ask Integration-tmi for the live state since this prompt was written (above all: has Ops's slot happened, did tonight's 28-pick release ship, any ruling from him), read it off the artefacts, then work.

### Where things stand

Everything for the float job is written on branch **`research/float-job`, tip `fdfdfcef`, worktree `A:/mointel-float`, UNGATED** (no tsc, eslint or vitest has run on it; nothing is on main): the job (dei-only count, R0 holdings, R1 count span, table `research_float_bounds` with no schema bump, repo, worker call behind `RESEARCH_FLOAT_JOB=on`, default off, skipped without Alpaca credentials), **rule S1** (insider sales after the count, `holdingsAtBoth`), **rule R-A** (Alpaca's announced splits refuse where stale bars cannot), the **reader** (`lib/research/floatRead.ts`: reuse within 4 days, every gate re-run at D) and the `FloatBound` payload for Design, and four measurement scripts (insider-sale, reuse coverage, issuance miss rate, split source), each committed before it runs. Integration 28th replayed `bd20d42c` (approved for the slot); `bd20d42c..fdfdfcef` needs a fresh replay. Ops said yes to a slot on that worktree after the 2026-10-05 evening release.

### Open, in order (detail and shas in the PENDING BUILDS table)

1. The Ops slot: gate `fdfdfcef` (tests listed in the GATE CANDIDATE line), then run the insider-sale measurement, the reuse coverage count, the split-source measurement, the issuance miss-rate measurement. Raw committed before it is read; results to Integration as committed files. A material coverage move or a material share of the morning board reading Cannot verify goes to him through Integration.
2. Before `RESEARCH_FLOAT_JOB` is ever on: gated S1, R-A, the reader; Marketing's `FILINGS_NOT_REREAD` words with Commercial's pass; peak RSS measured (Ops); his yes. Design wires `readFloatBoundsAt` into the snapshot.
3. Report tags (item 8): **a question is open with Integration**; the report code carries no Sheet priority, so the item would ADD the Setup grade to reports; do not build until answered.
4. v6 narrative steps 3 to 6 on `research/reports-v6` (`A:/mointel-v6`, head `759465bc`): step 3 is next; step 6 needs a spend yes; no sample to him before step 4 prints the no-close and split-excluded footnotes (Integration's conditions, in the 2026-10-05T00:36Z hand-off block).
5. The desk's performance record (`desk_call_outcomes`, approved 2026-10-04, not built, no file carries it): a pre-registered design note first, after v6 step 3 (PENDING BUILDS row 12).
6. Warning Shot and Confirmation (his "yes, build both", 2026-10-06T00:22:29.450Z, verified): PENDING BUILDS rows 13 and 14, with their constraints; both live before Sheet plan step 4.

### How this seat failed, as mechanisms (all in its ERROR LEDGER)

- **Asserted a safe direction without working it through:** the build plan said two stale-fetch cases were "on the safe side"; both made the bound too LOW (Commercial caught it). **Cure: for every "safe" or "conservative" claim, write the inequality, both directions, before the sentence.**
- **A control that could not fail:** a look-ahead check compared `x <= X AND x > X`. Caught before commit. **Cure: a control must run the REAL query on a case where the wrong code would give a different answer.**
- **A claim about code reasoned, not traced** (R1's tolerance). Caught before commit. **Cure: trace the call with the actual arguments.**
- **What worked, keep it:** ungated code kept OFF shared main (its own branch and worktree), with main's working tree restored only after a content compare; every rule change registered before its code, every script committed before it runs; his words verified at his own turn in the transcript `.jsonl` (`origin.kind` human) before citing them; a premise checked against the code before building on it (report tags); line endings preserved on every scripted edit (this PC mixes CRLF and LF files).

### Standing

- **No em dashes (U+2014)** anywhere, chat replies included; check with a control that proves the check sees the glyph (PowerShell `[char]0x2014`).
- **One test or build at a time on his PC: Ops's slot**, even a lint.
- **Spend needs his yes** on a stated number, stated to Integration first. Everything above is $0.
- **Shared git index:** `git commit --only <paths>` (`git add -N` first for a new file); shared main is local; clearance by sha in `research.md`; Integration coordinates the push.
- **The app pauses cross-session sends after 10 with no message from him:** keep sends few and dense; routing goes in `research.md`.
- **Write code with `Write`/`Edit`, not a heredoc;** a Python edit must preserve the file's own line endings.
- **No generated clock times:** cite a commit, a transcript stamp or zoneinfo.
- **Ship is his yes, by literal sha.** No Q-numbers to him; a NEEDS YOU block only when he must decide.

---

## For the owner

Self-reset: answer "yes" to "Reset this seat now?" and the seat clears itself; the hook points the restarted `Research-tmi` here. Or a new chat: paste "A:\mointel\docs\research-opening-prompt.md, this is your prompt, read it and follow", then rename the old chat `Research-tmi (retired 2026-10-06)` and archive it, do not delete it.
