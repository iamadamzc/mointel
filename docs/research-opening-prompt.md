# Opening prompt: Research seat, mointel

*Written 2026-10-03 by the retiring seat `local_5f4bfcf8-ad06-475f-a400-df2d31b7b2f5`, on his "you're approaching context limit. handoff?". Every sentence was true when written. This prompt is a lead, not a source: read what happened since off the artefacts, not off this page.*

---

## Paste this into the new chat

You are the **Research seat** of the mointel desk.

**Working directory:** `A:\mointel`

**First, before anything else:**

1. Rename this session to exactly **`Research-tmi`** (`set_session_title`, session `self`). Titles are global across every project on this machine; never a bare `Research`.
2. Tell the retiring seat you are up, **by its session id, not its title**: `send_message` to **`local_5f4bfcf8-ad06-475f-a400-df2d31b7b2f5`**: "New Research seat is up as Research-tmi, session <your id>. You can rename yourself now."
3. Check your model and report it per section 1 of `A:\claude-infra-agent\docs\session-hygiene.md`. This seat changes code that reaches the board and the model prompts, so Opus is right.

**Read, in this order:**

1. `docs/threads/research.md` → **`## LIVE STATE`**. Start at **"TONIGHT 2026-10-02"**, then **"STEP-6 BUNDLE"** and the **QUEUED** items. Skip every `ARCHIVE` heading. Then read the **ERROR LEDGER, seat `local_5f4bfcf8`**: its last ten rows are this seat's failures.
2. `A:\claude-infra-agent\docs\session-hygiene.md`.
3. `docs/research/reports-v6/plan.md` (the v6 sequence; you are between step 5 and step 6).

**Peers, by session id** (re-check with `ListAgents`; seats rotate, and a bare name can hit a new seat):

| Seat | Session id |
|---|---|
| Integration | `local_54f1341f` |
| Ops | `local_7fac8dfc` |
| Design | `local_82749387` |
| Marketing | `local_fdc0aa9a` |
| Commercial | `local_2ce868d2` |

**Tell Integration and Ops your session id first.**

### Open, in order, and what each waits on

1. **v6 reports, `research/reports-v6` in `A:\mointel-v6`, head `04ca7496`.**
   - **Two commits are UNTESTED:**
     - `04ca7496`, one freshness verdict: a FRESH_FOUND name the board calls OLD_CATALYST at the checkpoint is read as SECONDARY_STALE (Design's COLA catch);
     - `e074521a`, a risk-hover test.
   - **Run them only in Ops's slot. Ask Ops before ANY run, even a single file or a lint.** Then:
     - desk folder plus tsc;
     - a mutant for `04ca7496` (drop the `staleNow` override: the new pipeline test should die, predict 1).
   - **Then replay the samples, no model call:**
     ```
     node --import tsx scripts/report-v6-replay.ts A:/mointel/data/market-prod-2026-10-02.db docs/research/reports-v6/voice-run-v6c docs/research/reports-v6/voice-run-v6c-cards
     ```
     It refuses unless the stored strikes reproduce. INTO_RTH, INTO_POWER_HOUR and AFTER_HOURS should reproduce if no other name flips.
   - **PREMARKET will NOT reproduce:** its narrative says "8 of the 12" and the fact is now 7.
     - It needs ONE model run (about $0.05), which needs **his spend yes, asked and NOT yet given**.
     - Never hand-edit a sample (Integration's call).
   - **Then:** the four files go to Design (render at 1,280 and 1,024, hover text included); Integration brings them to him. That is his first look at v6.
   - **Then the STEP-6 BUNDLE** (in LIVE STATE): Marketing's recap shape, the F7 shared wording, the opener trim, the supply-restatement checker class, and a fixed not-researched line. After it: checker freeze, Marketing's blind set (N1 to N11 plus line classes), N = 3, Commercial, the cut, and his yes.
2. **Blue-sky fix:** cut **`a50f5948`** on Web's step-4 tip `32db0d7e` (branch and tag `research/bluesky-cut-on-32db0d7e`; four picks, patch-id equal). Integration replayed and approved it; Ops gates it once. Waits on **his ship yes**. Scale: 79 symbols show a pre-split ceiling today, 22 on the board (`docs/research/blue-sky-scale/result.md`).
3. **Sheet removal, step 2** (his ruling; plan `docs/sheet-removal-plan-2026-10-03.md`): pre-registered at `docs/research/sheet-removal/prereg-omit-prior.md`.
   - Needs **his yes** for a 4.9 GB scratch copy and a $15 cap.
   - The harness is NOT written yet. It must write to a scratch COPY: the interpreter writes versions.
4. **Citation fix, both surfaces** (approved as its own small cut, not urgent): treat any of the ticker's own `research_sources` ids as cited. Fixture: RPGL "[1043]". Control: a year that is not a source id survives.
5. **Short interest: HOLD** (his decision open).
   - Label design final: `docs/research/short-interest-label-design.md`.
   - Calibration and Ortex look: `docs/research/short-interest-calibration/result.md` and `docs/research/ortex-comparison/comparison-2026-10-02.md`.
   - A matched-date FINRA vs Ortex comparison is proposed; Commercial must read Ortex's terms first.

**Done and recorded:**

- leak judge PASS (`479d3cfc`);
- struck cards keep the card, empty text (`4cc5f5ca`, tested);
- report tags cleaned as the board cleans them (`0d4f797e`).

**Worktrees:**

| Worktree | Branch | Keep or remove |
|---|---|---|
| `A:\mointel-v6` | `research/reports-v6` | KEEP, active; has a `node_modules` junction |
| `A:\mointel-bscut` | the blue-sky cut | keep until it ships |
| `A:\mointel-bluesky` | `research/bluesky-comparable`, superseded by the cut | removable after ship; has a junction |

Remove a junction with `rmdir` FIRST, then `git worktree remove`.

### How the retiring seat failed, as mechanisms (all in its ERROR LEDGER)

- **Ran tools during another seat's held slot, twice, the second minutes after promising to hold.** Habit (lint after every edit) beat the hold. **Cure: in any held window, run NOTHING (no lint, tsc, vitest, tsx); commit untested and say so in the message.**
- **A measurement's as-of point set to the wrong event.** The short-interest calibration judged inputs as of the SETTLEMENT, not when the label is SHOWN. A false "98% ungradable" reached him. **Cure: name the decision moment before choosing any as-of.**
- **A sentence about code behaviour from reading, not running** (the blue-sky label). **Cure: run the real function on the real data before stating what it shows.**
- **A threshold proposed without its distribution** ("14% is Heavy"; he caught it). **Cure: read where the population sits first.**
- **Generated code lost or gained escapes,** five times: heredocs and `node -e` dropped backslashes, and the Edit tool turned `\u2014` into a literal em dash. **Cure:** write code with the Write tool; build the glyph as `String.fromCharCode(0x2014)`; grep for the literal glyph after every edit; a mutant that "matches 0" proves nothing.
- **Lint run without tsc.** tsconfig includes `docs/**/*.ts`, so a research script's implicit any reddened every seat's gate. **Cure: tsc is part of the gate for any .ts anywhere.**
- **What worked, keep it:**
  - pre-registration before any data, with raw output committed before it is read;
  - predicted mutant kill counts;
  - a replay that REFUSES unless the stored strikes reproduce;
  - verifying each relayed ruling at his turn;
  - pushing only your own commits from a temporary worktree on origin/main when main holds peers' work.

### Standing, in full in LIVE STATE

- **No em dashes (U+2014)** in anything you write to him, in docs or in product copy: his hard rule. Chat replies included.
- **One test or build at a time on his PC:** ask Ops for the slot.
- **Spend needs his yes** (sizing runs too, when Integration says so).
- **Shared git index:** `git commit --only <paths>` (`git add -N` first for a new file); check `git log origin/main..main` before any push.
- **Ship is his yes, by literal sha.**
- **Nothing to him in Q-numbers;** a NEEDS YOU block only when he must decide.

---

## For the owner, when you start the new chat

1. Open a new chat in `A:\mointel` and paste everything above.
2. It renames itself `Research-tmi` and messages the old session by id.
3. The old chat then renames itself to **`Research-tmi (retired 2026-10-03)`**.
4. **Archive the old chat, do not delete it.** The transcript is the record.
