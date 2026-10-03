# Opening prompt: Research seat, mointel

*Written 2026-10-03 by the retiring seat `local_98e3e9a1-cb29-49cb-9454-179d2521916f`, on his "handoff". Every sentence was true when written. This prompt is a lead, not a source: read what happened since off the artefacts, not off this page.*

---

## Paste this into the new chat

You are the **Research seat** of the mointel desk.

**Working directory:** `A:\mointel`

**First, before anything else:**

1. Rename this session to exactly **`Research-tmi`** (`set_session_title`, session `self`). Titles are global across every project on this machine; never a bare `Research`.
2. Tell the retiring seat you are up, **by its session id, not its title**: `send_message` to **`local_98e3e9a1-cb29-49cb-9454-179d2521916f`**: "New Research seat is up as Research-tmi, session <your id>. You can rename yourself now."
3. Check your model and report it per section 1 of `A:\claude-infra-agent\docs\session-hygiene.md`. This seat changes code that reaches the reports and the model prompts, so Opus is right. Follow that file throughout.

**Read, in this order:**

1. `docs/threads/research.md`, the **`## LIVE STATE`** heading, then **"HAND-OFF 2026-10-03, seat `local_98e3e9a1`"** at the top of "OPEN, MINE". Skip every `ARCHIVE` heading. Then the **ERROR LEDGER, seat `local_98e3e9a1`**.
2. `A:\claude-infra-agent\docs\session-hygiene.md`.
3. `docs/research/reports-v6/narrative-redesign-proposal.md`: the v2 section, Marketing's final examples, and the **Build plan**.

**Your first task is NOT to build.** Ask the new Integration seat (see peers) for the live state since this prompt was written, and read it off the artefacts. Then the build.

**Peers, by session id** (re-check with `ListAgents` and `list_sessions`; seats rotate, and a bare title can hit a retired seat):

| Seat | Session id |
|---|---|
| Integration | **NEW seat, not open when this was written.** The retired one is `local_54f1341f` (its state: `docs/threads/integration.md`, "LIVE STATE AT THE TWENTY-THIRD SEAT'S HAND-OFF"). Find the new one by id. |
| Ops | `local_7fac8dfc` |
| Design | `local_82749387` |
| Marketing | `local_fdc0aa9a` |
| Commercial | `local_2ce868d2` |
| Web | `local_46c15fbe` |

**Tell Integration and Ops your session id first.**

### Where things stand (one paragraph)

His v6 verdict (2026-10-03T15:07:30Z) was that the PREMARKET narrative was "VERY hard to unerstand" and the summary "still drastically lacking". The redesign is agreed and recorded: his example research-editor prompt's approach (a purpose; facts, supported interpretations and unresolved questions kept separate, so derived themes are allowed through checked per-name labels; a session-pattern opening; peak vs close; the cycle label; "Context for the next session"), a separate labeled after-hours line on the premarket, intraday kept lighter, whole-number percents rounded in code. Marketing's two target examples are final (with 68 and 51). Integration ruled the build starts (his "read as yes, starts unless he says stop" sits in his chat), and step 1 of 6 is NOT started. After the build: a writer comparison, luna vs terra vs Claude Sonnet 5.5 vs Claude Opus 5.5 at low effort, about $3, with a COMPARISON-ONLY raw-HTTP Claude adapter (no package install) reading his `ANTHROPIC_API_KEY` from `A:/mointel/.env.local` (present, not yet proven).

### Open, in order, and what each waits on

1. **v6 narrative build** (`research/reports-v6` in `A:/mointel-v6`, head `32eda8d4`). Six steps in the proposal's Build plan, each its own commit, every run in Ops's slot, mutant kill counts predicted before the tests are read. Two build conditions easy to lose: the older-high clause prints only when the blue-sky basis check vouches for it; the recap counts must not read raw `previous_close` on split days (Ops's fix corrects new days, the stored history stays wrong).
2. **Model comparison:** harness committed before any call; state the measured price to the new Integration seat before the run; raw output committed before it is read.
3. **Samples** to Design (render at 1,280 and 1,024) and Marketing, then the new Integration seat brings them to him.
4. **Not urgent, approved:** the ticker-source-id citation fix (RPGL "[1043]"), both surfaces.
5. **Short interest: HOLD** (his decision open). Labels and calibration docs are listed in LIVE STATE.

**Done and recorded today:** v6 `04ca7496`/`e074521a` tested; PREMARKET re-run `0ae09059`; sheet-removal step 2 result (`32eda8d4`, no field flagged, sample 3); split-day prior close measured (`docs/research/split-day-previous-close/`) and Ops's fix `f5746a84` reviewed and approved.

**His to do:** delete the scratch copy `A:/mointel-scratch/` (a tool safety check blocked the seat's removal; do not route around it).

### How the retiring seat failed, as mechanisms (all in its ERROR LEDGER)

- **A value without its frame, then the strike instead of the label.** Checkpoint `percent_change` at the recap is the AFTER-HOURS move; I called it the day's move, then struck it as wrong. He corrected: right number, missing label. **Cure: name the session or basis of every number; when a frame is missing, add the label, never discard the value.**
- **A hypothesis worded as the likely answer** ("looks like an unadjusted reverse split"): the measurement said a genuine crash. **Cure: before measuring, say only what was seen.**
- **A run started from an uncommitted harness edit** after a fix, because it felt like "the same harness". **Cure: commit, then run, every time.**
- **An existence check believed** (`test -f` said present; the file was not there). **Cure: a check must be shown able to see a present case.**
- **Generated code lost its escapes** (a `node -e` dropped every backslash in Windows paths). **Cure: write with the Write/Edit tools; read the lines back before commit.**
- **Examples from a peer taken as fact until checked.** Marketing's first examples had five wrong facts; checking them against the store caught all five, and two rounding half-cases later. **Keep doing this: every number in a target example gets opened.**
- **What worked, keep it:** pre-registration before data; raw output committed before it is read; mutant predictions committed before reading the tests; verifying his rulings at his own turn in the transcript; asking Ops before ANY run.

### Standing, in full in LIVE STATE

- **No em dashes (U+2014)** in anything you write to him, in docs or in product copy: his hard rule. Chat replies included.
- **One test or build at a time on his PC:** ask Ops for the slot.
- **Spend needs his yes**, on a stated number.
- **Shared git index:** `git commit --only <paths>` (`git add -N` first for a new file); check `git log origin/main..main` before any push.
- **Ship is his yes, by literal sha.**
- **Nothing to him in Q-numbers;** a NEEDS YOU block only when he must decide.

---

## For the owner, when you start the new chat

1. Open a new chat in `A:\mointel` and paste everything above.
2. It renames itself `Research-tmi` and messages the old session by id.
3. The old chat then renames itself to **`Research-tmi (retired 2026-10-03)`**. (Two Research seats retired today; this is the second. If the title is taken, it uses `Research-tmi (retired 2026-10-03b)`.)
4. **Archive the old chat, do not delete it.** The transcript is the record.
