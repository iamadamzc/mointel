# The public surface — what Web owns, and what it needs from others

**AS OF 2026-10-05 22:52 UTC (Web hand-off, local_a4c618a8): NOT re-read end to end in this pass.** *Two
surfaces were added on 2026-10-05 that this file does not describe yet: the ENTRY GATE (`/enter`,
`POST /auth/accept`; design in `2026-10-05-entry-gate-placement.md`) and `/auth/signout` now answering 303
to `/`. The charter's LIVE STATE is current and wins over everything here.*

**RE-READ 2026-10-04 23:29 UTC by the successor Web seat, at hand-off: section 3's placeholder row is CLOSED (filled with the gate wiring, live 2026-10-03; the public site now renders no `[BRACKET]` at all, read by `placeholder-scan.py`). Sections 1, 2, 2b, 4 and 5 were not re-read end to end in that pass.**

**AS OF 2026-10-02 17:34 UTC, at `01455d93`.** *What that review covered and what
it did not: the design decisions in section 1, the prefix list and status codes in
section 2, the rulings in section 2b and the fixed-and-recorded list in section 5
were re-read and are accurate. Sections 3 and 4 carry dated answers that were not
re-verified against the live site at hand-off, and the canvas notes in section 0
describe a canvas re-seeded 2026-10-02 against the live release.* **The live
snapshot that wins over everything here is LIVE STATE in
[`../threads/web.md`](../threads/web.md).**

**Section 3's placeholder timing is corrected in place, in row 4 and in the note
under the table.** *The count still holds: exactly one `[BRACKET]` renders,
`[FLOW COOKIE NAME]`. What moved is when it fills: with the gate wiring (step 4
of the charter's LIVE STATE), not with the deploy that ships the sign-in surface.*
**Corrected 2026-10-02 at 17:46 UTC by the successor seat:** *the hand-off's
version of this paragraph said the sign-in surface "shipped 2026-10-02". It had
not; it ships on the sign-in night, which had not run at that time.*

**Originally written by Web, 2026-09-10 (17:00 ET), against `927641c`.** Owner of
this file: **Web**. Design canvas:
[`canvas/`](canvas/) — seven artboards, published for the trader to edit directly.

---

## 0. HOW TO ACTUALLY LOOK AT THE CANVAS

**An artifact `read` on a design canvas returns the EDITOR BUNDLE, not the
drawing.** *Design tried it 2026-09-10 and correctly refused to review a
drawing it could not see; the next seat that tries will reach the same wrong
conclusion — that the artboards are unreadable.*

**They are not. Every artboard renders standalone in any browser:**

```
file:///A:/mointel/docs/web/canvas/Main.dc.html
```

**Checked rather than assumed.** `<x-dc>` and `<helmet>` are unknown elements, so
the browser renders their children; the inline `<style>` inside `<helmet>` still
applies, because a `<style>` element applies wherever it sits. **The layout,
palette and type are faithful.** *What does not work is anything needing the
canvas runtime — tweak chips, `{{ holes }}`, `<dc-import>` — and none of these
artboards use them, by choice.*

**THE CANVAS CARRIES A BUILD STAMP, and it exists because of a hazard that has
now been survived three times by luck.** *Editing a `.dc.html` does not update
the published artifact; a re-seed and republish is a separate act, performed by
whoever holds the files.* **Three passes in a row, the canvas stayed current
only because the publishing seat happened to notice the commit land.**

**A stale canvas cannot announce itself, so the `note-build` annotation makes it
able to:** it names the sha the artboards were seeded from and the time.
**If `git log -1 --format=%h` is ahead of that sha, what the reader is looking
at is superseded** — a check that takes one line and needs nobody to remember
anything. *It does not fix the split; it converts silent staleness into visible
staleness, which is the difference between a wrong page and a page that says it
might be.*

**Re-stamp on every seed.** The stamp is written into `canvas.json` from
`git rev-parse --short HEAD` immediately before seeding.

### A CANVAS REPUBLISH IS NOT A ROUTE TO PRODUCTION

**Integration's framing, 2026-09-17, and it names a gap this thread built
without noticing.** *Approved copy reached the canvas at `c353cbd` and was never
written into `app/page.tsx`, which was last built at `d560748` the day before.*
**No sha shipped it because no sha had it.** *Nobody was wrong; there was simply
no check.*

> **THE BUILD STAMP PROVES THE CANVAS MATCHES ITS SEEDING SHA. IT SAYS NOTHING
> ABOUT WHETHER THE PAGE WAS EVER TAUGHT THE SAME WORDS.** *Two independent
> claims, one instrument — and the instrument answers the less important one.*

**THREE ARTEFACTS, AND EACH PAIR NEEDS ITS OWN CHECK:**

| | proves | does not prove |
| --- | --- | --- |
| `note-build` stamp | canvas == its seeding sha | canvas == page source |
| `npm run build` | page source compiles | page source == approved copy |
| the `curl` sweep (§2 of the route spec) | page is reachable and renders | page says what was approved |

**THE MISSING CHECK, and it is one line per sentence:**

```bash
# Every load-bearing sentence must be in BOTH the artboard and the page source.
for s in "None of this is on the chart"          "a float does not get cleaner at 09:30"          "is built for people who trade"          "It is 07:15, a name is running"; do
  printf "%-42s canvas=%s page=%s
" "${s:0:40}"     "$(grep -c "$s" docs/web/canvas/Main.dc.html)"     "$(grep -c "$s" app/page.tsx)"
done
```

**THE ASSERTION IS `page >= 1`, NOT `page == canvas`.** *Run it after any copy
pass, before claiming the pass has shipped.* **`page=0` is the failure this
missed. A count above 1 is normal and must not be "fixed".**

> *Caught by running the check on itself, 2026-09-17:* **`intelligence desk for
> people who trade` reported `canvas=1 page=2`** — the `<meta>` description and
> the body statement. *Two legitimate occurrences of one phrase, because the page
> carries a search-results summary the artboard never had.*
> **An equality assertion would have called that a defect and invited someone to
> delete the meta description** — a stale check does not merely fail, it
> proposes a fix, and this one would have proposed removing the sentence Google
> shows in search results.

> **AND THAT SAME PHRASE IS WHY THE THIRD LINE WAS REPLACED, 2026-09-25.** *The
> body statement was rewritten on 2026-09-21 to name the price band — `is built
> for people who trade $1–$20 small-cap momentum in the premarket` — so the old
> phrase survived **only** in the `<meta>` description.* **The check still
> reported `page=1`, still passed, and would have passed with the visible
> sentence deleted.** *A literal that drifts off the visible page does not go
> red; it goes quiet.* **The line now greps `is built for people who trade`,
> which is in the body — verified `canvas=1 page=1 live=1` at `0170418`.**

> **AND THE CONTROL IS NOT OPTIONAL HERE EITHER.** *A sentence absent from both
> reads as agreement.* **Keep at least one line in the list that is known
> present in both — `None of this is on the chart` is the control, and if it
> ever reports `0 0` the check is pointed at the wrong files rather than passing.**

### AND THE TABLE'S BLIND SPOT IS ABOUT TO MATTER: INDEXING LEAVES THE LOOP

**Integration's caution, 2026-09-17, recorded beside the table because the table
is exactly about instruments answering the less important question.**

> **Every check on this surface answers "is the page reachable and does it
> render".** *None of them answers **"is this a page we still want indexed"**.*

**Indexing is the first decision here whose effect is OUTSIDE this thread's
control loop.** *A route, a wrapper, a paragraph — all reversible with a deploy.*
**Once Google holds a page, removing it is a REQUEST, not a change**, and it runs
on their schedule.

**So whatever `robots.txt` says on the day the crawler first arrives is the
thing that propagates** — *and the day it first arrives is shortly after Ops
ships it, unannounced.* **There is no verification step that catches a wrong
answer here, because the failure is not visible on the wire at all: the page
will be perfectly reachable and perfectly rendered, and indexed when it should
not have been.**

*His ruling is **"index it"** (2026-09-17, relayed by both Integration and
received directly), so the wanted state and the propagating state agree.* **The
line is here for the next time someone changes this file, when they may not.**

---

**Second artefact-pair gap on this surface this week.** *The first was the
canvas going stale behind the sources; this is the page going stale behind the
canvas.* **The shape is the same and so is the cure: when two artefacts must
agree, something has to compare them, and a stamp on one of them is not that
thing.**

---

**The editable canvas is the published artifact; the readable source is the
file.** Reach for the file when someone needs to *see* it and the artifact when
someone needs to *change* it.

---

## 1. The design decisions, and why

**Palette and type are the desk's own** (`app/globals.css`) — `#06080b` ground,
`#e9edf3` ink, Geist and Geist Mono. **Convention broken deliberately:** the
usual advice is that a marketing page should be bright and the product dark.
Reason for breaking it: the thing being sold is a dark instrument, and a bright
page followed by a black terminal is a bait-and-switch a trader notices in one
second. The stranger sees what they get.

**What does NOT carry over is density**, which is Design's own point, made
before this thread opened and agreed: the board is 12–13px for a man who
already trusts it; this is 17px prose at a 68-character measure for someone who
does not.

**`--color-muted` `#6d788a` is excluded from text on the public pages.** It
measures **4.49:1** on the desk ground and **4.30:1** on a panel — under the
4.5:1 floor for normal text either way. It was in the first draft of these
pages on the footer's legal paragraph. `#8792a3` (6.37:1) replaces it. *Every
ratio on the `System` artboard was computed, not estimated.*

**NO EM DASH IN ANYTHING A STRANGER READS.** *His hard rule, 2026-09-30: "no em
dashes in any writing."* **Two of his rulings define the edges, and both were
asked before the sweep shipped rather than assumed:**

- **A bare glyph standing in for a missing VALUE stays** — the example board's
  empty cells, the legal dateline's absent date. *His words: "keep it. fine for
  that, not writing."*
- **Punctuation that preserves meaning is NOT a material redraft of the adopted
  legal texts.** *His words: "not material, keep adopted."* `adopted: 2026-09-11`
  survived a 27-mark sweep. **The narrower test a future editor needs is in those
  files' own comment block, not here.**

**Page `<title>` separators are a PIPE**, *"Sign in | The Momentum Intelligence
Trading Desk"*. **His ruling, 2026-09-30: "pipe is fine."** *It was the one
replacement outside the comma/colon/full-stop/parenthesis set, because a comma
reads as a list and a colon reads as a subtitle; a pipe is the web convention and
is not a dash.* **In-page label separators are a COLON** ("01: IT CATCHES THEM
COMING INTO PLAY"), **and the example board keeps the board's `&middot;`** because
that block depicts the product — *the boundary is site prose versus depicted
board, not site versus board, and the reason sits in `app/page.tsx` at the
illustration where someone would otherwise tidy it away.*

**The guard is `tests/web/emDash.test.ts`, and the thing worth knowing is why the
FIRST sweep passed while the pages still showed em dashes:** *`&mdash;` renders
identically to U+2014 and a codepoint search cannot see it.* **So the guard checks
both encodings, expresses the placeholder ruling as a property rather than a list
of line numbers, and gives markdown no placeholder exception at all** — *legal
prose is hard-wrapped, so a line there can legitimately end on a dash mid-sentence,
which is the one mutant of three that a per-line rule waves through.*

**Google's sign-in button is used to Google's spec and not restyled** — white
surface, `#1f1f1f` label, the four-colour mark, 4px radius. A restyled one is
both a verification risk and, to a stranger, the thing a phishing page does.

**The sign-in screen composes the provider as a LIST OF ONE**, per Design's
formulation: the group, its label and the stack all survive a second provider
arriving. No second button is drawn.

**No failure screen says "try again."** With one provider, retry is a wall
dressed as a door. Each state offers the one action that can change the
outcome — and for a refusal, that is a person, not a button.

**The public pages load no client JavaScript, no third-party requests and no
analytics**, so there is nothing to consent to and no cookie banner. A page
whose argument is *"we take three things from you"* cannot open by calling four
other companies.

---

## 2. WHAT OPS NEEDS TO LAND — the full prefix list, batched

> **COMMISSIONED 2026-09-15 on his go, and SPECIFIED IN FULL in
> [`2026-09-15-route-spec.md`](2026-09-15-route-spec.md)** — exact nginx
> strings, the verification with its negative control, the `/` architecture
> question, and the write-endpoint gate. **That file supersedes the table below
> for anything an implementer needs.**
>
> **Two things changed in the specifying.** Four of the five are now
> **exact-match `=`, not prefix** — `^~ /privacy` would also match
> `/privacy-internal`, so a future path starting with those letters would be
> born public. And **`/auth/` carries its trailing slash**, so bare `/auth`
> matches nothing.

**All of it at once, per Ops's request, because each exemption is a hole in a
uniform rule granted once and spent forever.** `/` is deliberately absent: it
is the board, and it stays behind Basic Auth until in-app session auth is
demonstrably holding the weight.

| prefix | what serves it | why it must be public |
| --- | --- | --- |
| `= /privacy` | renders `docs/legal/privacy-policy.md` | Google requires it reachable and linked from the home page and the consent screen |
| `= /terms` | renders `docs/legal/terms.md` | same requirement |
| `= /signin` | the sign-in screen | the page a signed-out visitor is sent to |
| `^~ /auth/` | the OAuth start, callback and sign-out | `/auth/callback/google` is a registered exact-match redirect URI; `/api/auth/` would inherit Basic Auth |
| `= /favicon.ico` | static | falls under `location /` today, so a public page's tab icon 401s — invisible from any browser on this desk |

**Already public and NOT being asked for again:** `^~ /_next/static/`
(`nginx-locations.conf:143`, opened 2026-08-23 with the bundle scanned).

**THE TRAP THAT IS STILL LIVE, and it is not a request:** `/_next/image` and
`/_next/data` are deliberately outside that exemption. **A public page that
uses `next/image`, or that serves any raster asset from `/`, renders broken to
a stranger and perfectly to everyone here** — the same instrument problem as
the 401, one layer down. *These designs use inline SVG and no raster assets at
all, which sidesteps it; whoever adds a logo, a screenshot or an Open Graph
preview image later will walk into it.* An OG image, when one is wanted, needs
its own public path.

**Proof of each, from an actor with no cached state — not from a browser here:**

```
curl -s -o /dev/null -w "%{http_code}\n" https://tmitrader.com/privacy
```

Expect `200`. **A `401` here is the failure this whole thread exists to catch,
and nobody on this desk can see it.**

*Baseline, measured 2026-09-10 16:0x ET before any of this: `/` → 401,
`/privacy` → 401, `www.tmitrader.com/` → 401.*

### The status code each sign-in state must send

**Specified as design, not as an implementation detail, because a denial that
renders HTTP 200 has already happened on this desk once.**

| state | code |
| --- | --- |
| sending you to Google | `302` |
| you stopped at Google (cancelled) | `200` |
| **account not admitted (refused)** | **`403`** |
| Google not answering | `503` |
| our fault | `500` |
| signed out | `200` |

### The privacy page's rendering contract

- `/privacy` renders `docs/legal/privacy-policy.md` **at request time**. No
  copy of the text exists in any template.
- The file's frontmatter carries `adopted:`. **While `adopted` is null the page
  renders the DRAFT banner**, styled as on the `Privacy` artboard. It
  disappears when — and only when — the trader sets a date there.
- `drafted` and `last_changed` render into the dateline.

### THE PLACEHOLDER SCAN, AND WHY THE OBVIOUS VERSION OF IT IS USELESS

`python docs/web/placeholder-scan.py` — exits non-zero if any live page shows
an unfilled `[PLACEHOLDER]` to the public. Run it after any change to
`docs/legal/*.md`, and before any submission that puts a reviewer on these
pages.

**It scans the RENDERING, not the source, and that is the whole point.** The
source is the truth about the words; the rendering is the truth about what is
published. Two `[CONFIRM: ...]` drafting notes sat on the live, adopted
privacy policy from 2026-09-16 to 2026-09-18 because every check anyone ran
was a check on a file.

**And `curl | grep '\['` does not work here.** It returns about ninety hits on
a page with zero placeholders: Next serves its RSC flight payload inside
`<script>`, and that payload is dense with bracket-shaped JSON — `className`
arrays, chunk manifests, `text-[13px]`. A check whose output is ninety lines
of noise is a check nobody reads, and the one real hit hides inside it. The
script strips `<script>` and `<style>` **first**, then tags, then scans what a
person would see.

As of 2026-09-18 it reports `/` and `/terms` clean and `/privacy` carrying ten
placeholders — so it currently ships with its own positive control: it is
proven able to see a present case, not merely to return "ok".

---

## 2b. THE THREE RULINGS OF 2026-09-11, AND THE REASONING HE DELEGATED

*His words: "1, approved. 2, your rec. 3, point of use."*

**ADOPTED.** Both legal texts carry `adopted: 2026-09-11`. **Neither page renders
a DRAFT banner any more**, and both files now also carry the reverse rule —
*materially redraft the text and `adopted` goes back to `null`, because the
field only works in one direction unless someone writes the other down.*

**THE LIABILITY CAP — the greater of fees paid in the preceding twelve months,
or US$100.** *A stated number rather than a formula, which is what a cap is for,
and it holds whether or not he ever charges.*

**NO ARBITRATION CLAUSE AND NO CLASS-ACTION WAIVER, stated on the page as a
choice rather than left as an absence.** The reasoning, since he asked for a
recommendation rather than a menu:

> **Arbitration exists to manage class-action exposure, and an invite-only desk
> with a handful of users has none to manage.** *What it would cost is real and
> immediate: it is the clause users object to most, on a page whose whole
> argument is restraint.* **REVISIT WHEN THE USER BASE REACHES THE POINT WHERE A
> CLASS IS POSSIBLE** — that is the condition, and it is deliberately not a date.

**REFUSAL HAPPENS AT THE POINT OF USE**, with Design's condition carried as part
of the ruling: **the status check lives in ONE place every point of use passes
through.** *Scattered per-route checks were the case where both seats preferred
the callback gate; that option is closed.* **The price is now owed rather than
hypothetical — every refused person holds a live session, so the mid-session
downgrade is common, and the board behaviour Design specified is obligatory
before enforcement ships.** *Told to Design directly.*

---

## 3. Open questions, with who can answer each

**ANSWERED BY THE TRADER 2026-09-10:** operator is **Andromeda Genius, Inc**,
5460 Babcock Rd, Suite 120 PMB 95234, San Antonio, TX 78240; contact
**info@andromedagenius.com**; access is **invite only, and a stranger may ask
for one**. Substituted into the artboards and into
`docs/legal/privacy-policy.md`.

**THE ACCESS ANSWER CHANGED THE PAGE, not just a placeholder.** Invite only
means the primary action for almost every visitor is *not* "Sign in with
Google" — a stranger clicking it would hand over their identity in order to be
refused. **The hero's primary action is now "Ask for an invite"** (a `mailto:`,
which needs no route and ships today), with sign-in demoted to a secondary link
for people who already have access. *The 403 refusal screen stays as the
backstop for someone who signs in without an invite.*

| # | still open | who |
| --- | --- | --- |
| ~~1~~ | **CHECKED BY HIM 2026-09-21.** *"Built by someone trading it" confirmed — the builder is a trader.* The over-specified framing *"at the desk he trades it from"* is corrected to **"focused on the premarket and the early regular session"** (his words: focuses on the AM premarket and early RTH; rendered in the page's plain voice, not the jargon). The *"between 07:00 and 10:00"* clock claim is no longer on the page. Shipped to `app/page.tsx` and both artboards. **LIVE on `tmitrader.com` and verified 2026-09-22** (rode deploy `34414f4`; wording read from the live page by curl, not just reachability). | closed |
| ~~2~~ | **CLOSED 2026-09-18/21, every value measured from the box or decided by him.** Region `us-east-1`; hosting `Amazon Web Services, Inc.`; server logs **14 days** (nginx logrotate and journald agree, and the 512M cap is not binding); backups written as the **mechanism** — a full-server snapshot kept 7 days, a log entry living 14, so ~21 days at the outside — rather than as an audit of what is currently stored, *because a sentence justified by "the backup contains no personal data" expires the day sign-in ships and one justified by "a snapshot is kept 7 days" does not*; account and email retention say plainly that **no period is set**, on his adoption; email provider is **Google LLC**, because `info@` now reaches users on Workspace even though the service itself still sends no email. | closed |
| ~~2b~~ | **SATISFIED, and built stronger than asked.** Ops made it structural rather than two calls: the callback has **no bare `return`** — every exit goes through one helper that attaches the cleared flow cookie, so a failure mode added later inherits it. Tests assert the header **on the failure paths by name**, not only on success. *That is the assertion the sentence actually needed.* | closed |
| ~~3~~ | **ANSWERED BY MECHANISM, not by a number, and verified in code.** There is no duration: `createSession` takes an **absolute expiry** (`store.ts:293`) and `sessionExpiry` (`lib/auth/expiry.ts`) returns 20:00 ET, reusing `sessionEndUtc` from `lib/market/session` — **no second definition of the one number this desk keeps getting wrong.** *Published as the rule rather than as "30 days", because a rule is something a person can reason about instead of trust.* | closed |
| ~~4~~ | **SETTLED 2026-09-24: the flow cookie is `mointel_oauth`**, defined once in `lib/auth/config.ts` (`OAUTH_FLOW_COOKIE`) and set by `/auth/start/google`. The placeholder is filled from that name, not a relay, in the gate-wiring commit (charter LIVE STATE step 4), never before the live site sets it. *Was "on the deploy that ships sign-in"; corrected 2026-10-02.* | **closed 2026-10-03: filled with `mointel_oauth` in the step-4 release, live and read** |
| ~~5~~ | **ANSWERED BY HIM 2026-09-10:** *"anyone that trades US market i suppose, but i dont want any overhang on interinational regs."* US market, US company, offered nowhere to the public — §8 says so, and §7 promises to honour a foreign right rather than argue about which law applies. | closed |
| 6 | Whether Google's "home page" must be `tmitrader.com` itself, or whether a page elsewhere on the domain satisfies it | nobody has confirmed; **do not guess** |
| ~~7~~ | **DRAFTED AND ADOPTED**, both decisions settled on his "your rec." — see §2b. | closed |

~~**AS OF 2026-09-25 EXACTLY ONE `[BRACKET]` RENDERS ON THE PUBLIC SITE:**~~ **SUPERSEDED 2026-10-03: none renders; the paragraph below is the history of the last one.**
`[FLOW COOKIE NAME]`, row 4, **deferred to the gate wiring, not blocked.** *The
code sets `mointel_oauth` (`/auth/start/google`), but the live site does not
yet, so filling the policy now would name a cookie a user cannot find in their
inspector. Fill it in the gate-wiring commit (charter LIVE STATE step 4), from
`OAUTH_FLOW_COOKIE`. Was "on the deploy that ships sign-in"; corrected
2026-10-02, and the count was re-read live that day: still exactly one.* **Verify with
`python docs/web/placeholder-scan.py`, which exits non-zero while any remain.**

---

## 4. THE HERO IS REGISTERED TEXT, AND IT HAS A DEPENDENCY OUTSIDE THIS THREAD

**The landing hero is the registered plain statement, verbatim** — Commercial's,
`docs/commercial/2026-09-08-product-name.md` §2e item 2, registered at `eb0eb7b`.
Web wrote it from the three registered sentences; Commercial owns it now.

**Do not reflow it into two paragraphs to suit the layout.** The colon is part of
the text, and splitting there would change punctuation in registered copy. It
renders as one paragraph on both viewports.

> **THE DEPENDENCY, recorded by Commercial:** *"puts everything the desk knows
> about **each one**"* is honest **only because the board renders a name it has
> not researched as a STATE** — `NOT RESEARCHED` / `NOTHING COLLECTED` — rather
> than as a blank. The desk researches the top of its ranking, not every mover.

**VERIFIED BY DESIGN, `ba13d79` and `2f6c912`, before this thread had handed it
over.** All four dimensions checked, and every path names its empty state.
**The load-bearing part is that the risk label is typed as `string` rather than
nullable — so no path can return a blank, because the type does not admit one.**
*Design checked the code rather than the live board, deliberately: a live read
proves the board was right this morning; a total return type proves it cannot be
otherwise.*

**AND DESIGN FOUND A THIRD DEPENDENCY THAT NEITHER WEB NOR COMMERCIAL LOOKED
FOR.** The **Float column is conditional on the float sort**, so one view of
share structure is sort-scoped. **The claim survives** because structure and
supply are carried on every row by the Risk cell. *Its own formulation, and Web
has checked the hero against it:* **a reader taking the sentence as a promise
about COLUMNS would be wrong; as a promise about what the board knows PER ROW it
is kept** — and the hero says *"about each one"*, which is per-row. **No copy
change needed; checked rather than assumed.**

**One word of his was dropped and it is recorded as a judgement, not a fact:**
his sentence says *"an assistant that give you depth on the moving market"*, and
"assistant" is not in the paragraph — it reads as a chatbot in 2026, which is the
opposite of the claim. **He can restore it with one word if he disagrees.**

**The scanner line is retired everywhere**, carve-out withdrawn (`d68b60c`). The
**Not a scanner** card's own sentence is now the registered answer to *"is this a
scanner?"*.

---

## 4b. A DEPENDENCY THAT DOES NOT BITE YET, AND THE DAY IT WILL

**Marketing found two capabilities nothing renders — the why-not report and the
book-effect axis — and left them off the page. Correct.** *Checked here because
the public copy rests on what the desk knows:* `lib/research/effect.ts` is
imported **only** by `lib/research/whyNot.ts`, and `whyNot.ts` is imported
**only** by `tests/research/whyNot.test.ts`. **One dead subtree, not two dark
features** — no component, no route, no worker.

**THE COPY IS SAFE, AND THE REASON IS PRECISE RATHER THAN COMFORTABLE.** The
registered statement says the board carries *"everything the desk knows about
each one."* **Unexecuted code produces no knowledge**: nothing calls `whyNot`,
so the desk never computes a why-not verdict, so there is nothing it knows and
withholds. *The sentence is not over-claiming today.*

> **THE DAY `whyNot` GETS A PRODUCTION CALLER, THE REGISTERED SENTENCE NEEDS
> RE-CHECKING** — because from that moment the desk *does* know something, and
> whether the board shows it decides whether the public statement is still
> true.

**AND THIS ENTRY IS NOT THE WARNING. IT IS A COPY OF IT.** *Integration's
correction, and it is right: the caution was filed where the WARNER lives, not
where the ACTOR does.* **Whoever wires up `whyNot` will be working in
`lib/research/` and will never open this file** — so a dependency recorded only
here protects nothing. *Same shape as a caution that survived only in messages.*
**Relayed to Research by Integration so it sits where the trigger is pulled;
this section is kept because it is the reason Web cares, not because it is the
record that will be read in time.**

---

## 5. Fixed after a review pass, recorded so they are not reintroduced

- **"That is the entire list"** appeared on both landing pages beside the three
  Google scopes. **It was false against this repo's own policy**, which also
  receives Google's permanent account identifier, plus IP, user-agent and a
  session cookie. Copy now names the identifier as a fourth item and drops the
  absolute.
- **"The smallest set Google offers"** — Google offers `openid` alone. Now "the
  smallest set that lets anyone sign in at all," matching the policy's wording.
- **"It does not filter the universe"** sat on the same page as a `DISCOVERY`
  panel and a live ranking. **Ranking a universe is scanning**; the boundary
  claim was over-drawn and is now "doesn't run your filters or replace the scan
  you already trust."
- **The 403 said "we kept your email and nothing else"** directly against the
  policy's own logging, and the 500 said "nothing was saved" directly above a
  saved error reference. Both corrected.
- **The privacy page's contents listed 8 sections; the source file has 11** —
  on a page whose own callout claims the two "cannot disagree." Six of its eight
  links pointed at anchors that did not exist. Both fixed.
- **The phone page dropped "Market data may be delayed, incomplete or wrong"**
  that the desktop page carried. A material disclaimer on one viewport and not
  the other is indefensible; restored.
- **Phone footer links were ~23px tall** against the system's own stated 44px
  floor. Now 48px rows.
- **The example board was a CSS grid of spans** — a screen reader got an
  unlabelled run of numbers. It is now a real `table` with `th scope`.
- **The artboards load Geist from Google's font CDN**, because that is the only
  font host the canvas sandbox permits. **The shipped pages self-host it**
  (`next/font` already does, so the files exist). *Do not copy the artboard's
  font link into a page* — it would hand a visitor's IP to Google before they
  agreed to anything, on the page arguing the opposite.
