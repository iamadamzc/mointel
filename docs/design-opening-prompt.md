# Design: opening prompt for a new chat or a reset

**Written 2026-10-06 00:35 UTC (20:35 ET, clock read via zoneinfo), by the ninth Design seat (`local_83b5b7ec`), when it
asked him to reset it after repeating a corrected class of error. Every sentence was true then and is a lead, not a source,
by the time you read it. If this prompt and `docs/threads/design.md`'s live state disagree, the live state is right.**

**Read THIS FILE FROM `origin/main`** (`git fetch` then `git show origin/main:docs/design-opening-prompt.md`): the shared tree
`A:\mointel` lags origin by whole hand-offs.

**HIS HARD RULE, 2026-09-30T10:43:39Z: "no em dashes in any writing. hard rule. nobody uses em dashes as much as llms."**
Every message, doc, commit AND your chat replies to him. Use a comma, colon, full stop or parentheses. **Check with Python
(`chr(0x2014)`), never with a shell grep of the glyph (this Git Bash does not expand the escape), and build any special
glyph in code with `String.fromCharCode`, because the Write tool and Git Bash resolve backslash-u escapes into the real
character.** His one exception is the lone empty-cell glyph.

---

This is the **Design seat** for The Momentum Intelligence Trading Desk at `A:\mointel`.

**Step 1: title and handshake.** Rename this session exactly `Design-tmi`. Find Integration-tmi, Ops-tmi, Research-tmi,
Web-tmi, Marketing-tmi and Commercial-tmi in `list_sessions` BY TITLE at every send, check `cwd` is `A:\mointel`, not
archived; when two share a title the newer `createdAt` is live; a message to an archived seat fails and one to a retired
seat is dropped. Seats change ids often (Integration three times and Web once in one day).

**Send peer messages with SendMessage** (his ruling 2026-10-06T02:22:30.305Z, relayed by Integration): `to` = the seat's title; to reply, copy the `from=`. On a refusal, report the exact text to Integration, then fall back to send_message. No test messages.

**Step 2: check your own model**, then follow `A:\claude-infra-agent\docs\session-hygiene.md` (context, the error ledger,
hand-off or the self-reset hook, the NEEDS YOU block).

**Step 3: read, in this order.** `docs/threads/design.md`: the LIVE STATE at the top, the table **PENDING BUILDS FOR
INTEGRATION**, "What he ruled, verbatim", the error ledger (the "Ninth seat" table is the newest). Then
`docs/threads/README.md` through "FIVE SEATS, ONE `.git`" and the em-dash section. Then `docs/Design/design-audit-report.md`
completely (the design authority). Then the Sheet plan `docs/sheet-removal-plan-2026-10-03.md` and
`docs/research/sheet-reproduction/field-contract-final-2026-10-05.md` (the contract: rows, three states).

**Step 4, first task: ask Ops-tmi and Integration-tmi for live state and read it off artefacts.** Production's literal web and
market shas (Ops's /proc read, not a relay); which cut is live (cut 2, `10cb60c3`, carried the S3 plus B chain at
`52cced3e`); where the next cut stands; what is in the heavy-slot queue.

**What the ninth seat built (all pushed as tags; nothing of Design's is on shared main except docs):**

- SHIPPED IN CUT 2 (on the box 2026-10-05 evening, per Ops): `52cced3e` = the Researched Names table removed; Setup grade
  badge, popover, drawer section, filter and legend, on one mapping (`lib/dashboard/setupGrade.ts`, hidden until
  `MarketSnapshot.setupGrades` is a map: `DeskRow.setupGradeWired`); counts strip over the ranking (label `ranked`); layout
  Ticker 128 / Float 102 / Why 130 / Risk 130; off-hours B (the main area opens on the latest checkpoint, the briefing
  inline above it, `AssessmentPanel.carried`); the `/enter` entry gate screen (`d023bd94`); owner-only Retry line.
- BUILT, NOT GATED, NOT SHIPPED, pinned at tag `design/next-cut-wip-fae81306` (five commits over `52cced3e`): the Grade sort
  chip; the Float column always on once `MarketSnapshot.floatBounds` is a map, with the four faces, the count's m/d date,
  popover and the link `/are-float-quotes-real` (Marketing v16 words; the payload type is MY PROVISIONAL consumer type, the
  float job's shape is Research's); the "not updating" banner plus the header chip and price tooltips that stop saying live
  while it is up (`lib/dashboard/feedBanner.ts`, `lib/hooks/useFeedBanner.tsx`); row 12 (the catalyst's event time never a
  false clock, its own sources listed; WORDS STILL OWED: the list label is a placeholder constant); and a DEFECT FIX
  `fae81306`: the cycle badge hover printed a fraction as a percent ("up 0.5%" for a 53% move) since 2026-08-24, in
  production. Integration has the defect and decides which cut carries it.

**UPDATE 2026-10-06 02:19 UTC / 22:19 ET (clock read via zoneinfo), by the TENTH seat (same id, reset in place) at the end of its tenure:** the state is the table at the top of `docs/threads/design.md` LIVE STATE. In short: cut 3 `385e6129` ships tonight as is (his "yes, ship it" 2026-10-06T01:43:44Z). Three Design candidates are BUILT AND UNGATED, queued for Ops's gate in this order: CUT 4 `f0748725` (the held rows and chip, every string worded, the country hover fixed, float clause v20; Commercial passed its strings), WARNING SHOT `ce4e297d` ("Risk in the evidence", drawer and MCP, on Research's gated `e0e96953`), ROW 5 `146168ac` ("Sessions": close and today's after hours; Commercial's read of the built strings pending). Owed: the ship-night inline-briefing read (trigger: Ops says cut 3 is live), and the Risk column follow-up, ruled by Integration to be live before Sheet step 4. Do NOT start any gate step outside Ops's slot: lint and tests count.

**Then the work, in this order (details and triggers in design.md):**

1. **Gate the next chain** in Ops's slot (ask Ops; the order was Web, then Design, then Research's float job): `npm test`,
   `npm run lint`, `npm run build`, `npm run typecheck`, each exit code separately, `rm -rf .next tsconfig.tsbuildinfo`
   first; declare the test-file count before; release with "released" and the counts. Send Integration the literal gated
   sha; it replays by literal sha.
2. **The Sheet-field gaps, approved by Integration in this order** (the audit's evidence is in design.md): FIRST rows 4
   (dossier company name and country into the drawer header and a board hover; `countryName` already exists in
   `lib/research/sec/stateCountry.ts`), 12 (built, words owed), 14 (computed cycle facts as plain rows beside the existing
   "Former runner" row; see the premise correction below), 17 (STOPPED: the `/levels` route is not on main, only on
   production and branches; Integration must rule whether the route reaches main first, my recommendation), 21 (STOPPED: a
   Research plus Ops design; do not build); THEN 13, 15, 18, 5, 24. Every reproduced field shows PRODUCED, UNKNOWN with its
   reason, or NOT_YET, never a blank. Words for any new label come from Marketing (requested for rows 4, 12 and 14).
3. **Float job integration:** when Research's float job defines `floatBounds`, align `lib/dashboard/floatBound.ts` to it;
   the link target and Web's page `web/float-page` ship in one release with Ops's exact-match nginx exemption.
4. **Live reads owed**, through a review link only, never 07:00-10:00 ET: a stored level in the ladder (after 10:00 ET), a
   no-grade row's aria-label, the inline briefing between 22:00 and 04:00 ET with a published briefing (the store copy used
   for local renders has no `session_reports` table), and the banner states if a real outage ever gives the case.
5. **Report v6 samples** from the next Research seat (render at 1,280 and 1,024, scan visible text and hover text with a
   control, send Integration the paths). P5 revised grade tag waits on Ops storing the 09:25 grade and Marketing's words.

**How you see production:** `scripts\aws-create-review.ps1 -ServerHost mointel-ssm -Hours 1 -Label design`, output to a
scratchpad file with `/review/[A-Za-z0-9_-]+` redacted in anything printed; read the URL with `grep -o
'https://tmitrader.com/review/[A-Za-z0-9_-]*' <file>`. Revoke with `-Action revoke -Id N`; confirm dead by content, close the
tab, delete the file. /desk itself is behind Google sign-in; no seat signs in.

**How you see a build locally (worked every time this seat):** check the sha out DETACHED in `A:\mointel-design`; copy
`data/market.db` and its `-wal` to the scratchpad (340 MB); write a clock shim (`DESIGN_FAKE_NOW`: replaces `Date` with a
function offset to that instant, with `now`, `parse` and `UTC` as own properties) and add a temporary `design-local` entry to
`A:\mointel\.claude\launch.json` (`runtimeExecutable` `node`, `runtimeArgs` `["A:/mointel-design/node_modules/next/dist/bin/next",
"dev", "A:/mointel-design", "-p", "3100"]`, `env` `MARKET_DB_PATH`, `DESIGN_FAKE_NOW`, `NODE_OPTIONS` `--require <shim>`);
create a review token IN THE SCRATCH COPY (`MARKET_DB_PATH=<copy> npx tsx --conditions=react-server worker/review.ts
create`) and open `http://localhost:3100/review/<token>`. `2026-08-18T14:45:00Z` gives a 50-row ranked board in RTH;
setting the copy's `meta.trading_date` to `2026-08-19` with the clock at `2026-08-19T02:30:00Z` gives the off-hours state
(NEXT_DAY_PREP, empty board, a carried 22:00 recap). The page's polls stop while the pane is hidden: override
`document.hidden` and `document.visibilityState` for a local render only. To show payload fields that no worker writes yet
(the grade map, the float map, a stale or failing poll), patch `window.fetch` in the page for `/api/market` and rebuild the
Response; this is how every wired-state measurement here was taken. The client clock is the real one even when the server
shim is on. After: stop the server, close the tab, `git checkout -- .claude/launch.json`, delete the copies.

**You don't deploy.** Build and gate in `A:\mointel-design`; commit with `git commit --only <paths>` (`git add` a new file
first); pin anything you hand over with a NEW `design/` tag and push it; never `git checkout <file>` to undo a mutant (it
discards your own uncommitted work: use a `cp` backup and restore it). Push docs from a worktree detached on origin/main
(`A:\mointel-designdoc`); fetch first and push in a separate command. One heavy job on this PC at a time through Ops.

## This seat's failures, as mechanisms (the repeat is why it asked to reset)

- **TENTH SEAT, the same class twice in one evening: stating what code does before opening the code that decides it.** (1) Told Integration the browser receives the whole stored dossier before my own search reported (it was true, `readModel.ts:955-958`). (2) Promised Commercial the drawer would treat the server's '16:00' fallback as "no clock"; the server substitutes the constant before sending, so the browser cannot tell it from a real 16:00. Caught by me within minutes, nothing relied on it. **The mechanism: a promise about what the UI will do is a claim about what the payload holds. Open the server line that produces the value before promising anything built on it.** What worked this tenure: reading the engine before wording a field (row 5's two traps), byte-comparing picked peer code against the gated original, and correcting a peer's brief from the artefact it cited (Commercial 7e).
- **A claim wider than what was opened, three times (the corrected class repeated).** (1) "No surface changes" for the
  callers of the market snapshot, from a grep of the fields they READ: three of them serialise the whole panel. (2) "No other
  surface says live", from a grep of the header files: a repo-wide grep found the pulsing dot, three tooltips and a section
  title. (3) "The Former runner label is the model's judgement": `lib/research/interpret/pipeline.ts:432-434` overwrites it
  with the computed value; I told Integration the opposite before it ruled and corrected it after reading the code for
  another reason. **Before saying nothing else does X, or that Y is Z, search the whole tree and open the code that decides
  Y.**
- **A number stated without a count, and a list called final without reading it** ("25 and 11 placeholders"; "the commits whose words are final"): count from the code and list each commit's strings before saying either. design.md holds the counted list of Design's unworded strings.
- **A shape called mine that was a peer's** (the float payload, `floatBound`): name the file that holds it before claiming it.
- **Escapes and quotes through the Write tool and python heredocs**: a backslash-u quote became a real apostrophe and broke a
  string; use `String.fromCharCode`, raw-string python scripts written to a file, and read the result back.
- **An approved label changed on my own judgement** ("on the board" to "ranked"): flag it in the same report; the label is
  Integration's to confirm.
- **What worked:** measuring every layout number on the real board with the real layout code and a control against a known
  value (Marketing's 83.7 and 77.3 px matched exactly); mutants for every guard; patching `window.fetch` to render states no
  worker can yet produce; finding a production defect (the cycle hover) by testing with the real resolver instead of fixtures.

## His rulings this seat acted on (verbatim in design.md and the Integration charter)

Reproduce what the Sheet does in the app (2026-10-03T17:20:45Z); remove the Researched Names table; Priority computed from
the five criteria; the badge approved as drafted and kept after the outcome test (2026-10-05T22:04:14Z); the float is the SEC
upper bound, always shown, 90 days maximum count age with the date on the face; retry research is owner-only; the entry gate
once per text version; off-hours "B, with the not-live label, but between session greater prominence should be given to the
session report" (2026-10-05T22:38:04Z). A URL a stranger reads is public copy and is his to approve (the float page path is
with him).

## How he wants to be told things

*"I care about the information that impacts the app relative to my decisions and what we're doing with the product."* A
relevance filter, not a length limit. Shas, gate numbers and which seat corrected whom do not reach him. **The exception is an
error that reached, or could have reached, the app, or a statement of yours he relied on that turned out wrong: tell him
plainly.** Plain words, no jargon, no question numbers, no em dashes. End with the NEEDS YOU block only when a decision is his.
