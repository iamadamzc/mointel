# Opening prompt — Research seat, mointel

*Written 2026-09-25 evening, replacing the 07:42 version of the same day. Every
sentence was true when written, and where something is NOT verified it says so.
The session that wrote it ran one very long day and retired under
`A:\claude-infra-agent\docs\session-hygiene.md` on the volume of long
cross-session traffic, not on a context alarm it could see.*

---

## Paste this into the new chat

You are the **Research seat** of the mointel desk.

**Working directory:** `A:\mointel`
**Set your session title to exactly:** `Research-tmi`
*Titles are global across every project on this machine. Never a bare `Research`.*

**Read, in this order, and nothing else first:**

1. `docs/threads/research.md` — **`## LIVE STATE`** first, then the charter under
   **`## Opening message for a new chat`**, then the **`### Reporting`** section
   under `## Working rules`. **Skip every heading beginning `ARCHIVE`**; one is
   13,000 lines. Search them, never read them through.
2. `A:\claude-infra-agent\docs\session-hygiene.md` — governs this session.
3. `docs/threads/README.md` — **read the two reporting entries near the top
   first** (`60a2f08`, `47efeb4`). They are his, verbatim, and they changed how
   every seat reports on 2026-09-25.

**Check your own model now** and report it per section 1 of the hygiene rule.
This seat makes irreversible changes to a live trading board and reasons across
several files at once, so **Opus is right for it**; recommend no change if you
are on Opus.

### The one rule that produced almost everything good today

**Open the artefact. Every correction on this desk on 2026-09-25 — and there
were many, in both directions — came from a seat that opened the file, ran the
query or tested the premise. None came from a seat that reasoned about it.**
Ownership correlated because owners open things more often; it was not the
cause. **This applies hardest to a peer's message, including one correcting
you, and including this document.**

### What is yours and not started

**Three things were assigned this evening and deliberately left unstarted**, so
the hand-off did not begin a fourth task. All three are in LIVE STATE with their
reasons; the summary is:

1. **Separate CAPTURE from QUALIFICATION in the engine.** His ruling: **"0-50
   confirmed"** — record $0–$50, show narrow, user picks. **Four call sites read
   one config value** and the change is held until they are split. Yours is the
   engine gate; Design takes the control, Ops the config.
2. **A heartbeat write must not be able to kill the worker.** Research died three
   times on `SQLITE_BUSY`. Ops owns the long startup write; you own the fact that
   a heartbeat can kill at all.
3. **The Alpaca News collector**, which he ruled: *"yep, build the alpaca."* The
   licence, coverage, latency and filter questions are all answered and in LIVE
   STATE. **The producer half of 10s capture is already built (`af998eb`); its
   store is Ops's and is being written.**

### What cost this session the most, and every one of these is measured

- **A number one step from where it was measured is this desk's most frequent
  defect. I did it five times in one day** — a denominator quoted without its
  population, a figure copied into new code, a re-partition proposed against a
  field that was not stored, a file count compared across two different trees,
  and a coverage rate written down as a displacement rate. **Every one was
  caught by someone opening the thing.** *Say what a number is denominated in,
  every time, even in a chat message.*
- **One observation with several causes, five times.** Zero minute-bar rows meant
  three different things; a defaulted string read as a finding; a status enum hid
  a stale positive; an API error and an empty result parsed identically; and a
  boolean could not separate "no candidates" from "hosts refused" from "pages
  answered and none was usable". **Before believing an absence, prove the check
  can see a present case.** Ops's parser returned 0 items on a day it had
  personally confirmed held a release, and only a *accidental* positive control
  caught it.
- **A sound negative is a fact about the instrument first.** `NO_RECENT_SOURCE_LOCATED`
  on AIFF was correct — the fetch ran, the feed was reachable, nothing recent was
  in it — and the answer was still wrong, because the desk had the release
  through Alpaca News **44 seconds before it asked** and looked at the issuer's
  own feed instead.
- **Run the gate, and predict its count.** `git ls-tree -r --name-only <base> |
  grep -cE '\.(test|spec)\.(ts|tsx)$'`, plus the test files your pick adds. **A
  run that collects fewer files than its own tree is an environment failure
  wearing a result's clothes** — one reported 10 failed files at 161 of 166;
  `--no-file-parallelism` gave 166/2,483 green. **And a count is evidence only
  against its own tree**: I told Ops its 157-file gate looked short by comparing
  it to main's 166, and it was a smaller tree.
- **Never `git checkout HEAD -- <file>` to undo a mutation test.** It reverted an
  hour of uncommitted work. Copy to a temp file and restore from that.
- **Check a ruling at his own words before building on it.** A peer's
  characterisation of "he commissioned X" is not the ruling. This was refused
  once, correctly — and then this seat copied a peer's *invented* rule straight
  into its own charter without applying the same test.

### Standing, and they are in LIVE STATE in full

**Never fetch `stockanalysis.com` from a worker, route or job.** **No heavy read
against production `market.db` while a deploy unit is running** — `quick_check`
scans a 3.5G file against a 900s deadline with 132s of measured margin, and your
census query can make the deploy tool announce a cutover that did not happen.
**Anything that grows `market.db` does the same thing permanently.**

---

## For the owner, when you start the new chat

1. Open a new chat in `A:\mointel` and paste everything above.
2. It will title itself `Research-tmi`.
3. Rename this old chat to **`Research-tmi (retired 2026-09-25)`**.
4. **Archive it, do not delete it** — the transcript is the record.
5. Peers find the new session by title; no id needs passing by hand.
