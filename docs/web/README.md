# The public surface — what Web owns, and what it needs from others

**Written by Web, 2026-09-10 (17:00 ET), against `927641c`.** Owner of this
file: **Web**. Design canvas:
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

**All of it at once, per Ops's request, because each exemption is a hole in a
uniform rule granted once and spent forever.** `/` is deliberately absent: it
is the board, and it stays behind Basic Auth until in-app session auth is
demonstrably holding the weight.

| prefix | what serves it | why it must be public |
| --- | --- | --- |
| `/privacy` | renders `docs/legal/privacy-policy.md` | Google requires it reachable and linked from the home page and the consent screen |
| `/terms` | renders `docs/legal/terms.md` | same requirement |
| `/signin` | the sign-in screen | the page a signed-out visitor is sent to |
| `/auth/` | the OAuth start and callback | `/auth/callback/google` is a registered exact-match redirect URI; `/api/auth/` would inherit Basic Auth |
| `/favicon.ico` | static | falls under `location /` today, so a public page's tab icon 401s — invisible from any browser on this desk |

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
| 1 | **UN-WITHDRAWN, and it was this seat's error to withdraw it.** The "why it exists" section is back and written; **what he owes is not a bracket but a CHECK on two claims made about him** — that the desk is traded *"between 07:00 and 10:00"*, and *"built by someone trading it, on the desk he trades it from."* **Both were asserted from context rather than from him.** | the trader |
| 2 | Whether any mailing list exists; access-log fields; retention periods for account, logs, email and backups; hosting region; email provider | Ops |
| ~~2b~~ | **SATISFIED, and built stronger than asked.** Ops made it structural rather than two calls: the callback has **no bare `return`** — every exit goes through one helper that attaches the cleared flow cookie, so a failure mode added later inherits it. Tests assert the header **on the failure paths by name**, not only on success. *That is the assertion the sentence actually needed.* | closed |
| ~~3~~ | **ANSWERED BY MECHANISM, not by a number, and verified in code.** There is no duration: `createSession` takes an **absolute expiry** (`store.ts:293`) and `sessionExpiry` (`lib/auth/expiry.ts`) returns 20:00 ET, reusing `sessionEndUtc` from `lib/market/session` — **no second definition of the one number this desk keeps getting wrong.** *Published as the rule rather than as "30 days", because a rule is something a person can reason about instead of trust.* | closed |
| 4 | **The flow cookie's NAME is not established.** Relayed to Web as `mointel_oauth` carrying `<state>.<nonce>`; **the only occurrence in the tree is `mointel_oauth_state`, in `tests/auth/cookie.test.ts`, passed as an argument** — and `1e120ac` asserts no name at all. *A policy that names a cookie is one of the few claims a user can check in their own browser inspector.* **Not published on a relay the code disagrees with.** | Ops |
| 5 | Whether an EU/UK audience is in scope — it decides whether the policy needs a lawful-basis section and a supervisory authority | the trader |
| 6 | Whether Google's "home page" must be `tmitrader.com` itself, or whether a page elsewhere on the domain satisfies it | nobody has confirmed; **do not guess** |
| ~~7~~ | **DRAFTED AND ADOPTED**, both decisions settled on his "your rec." — see §2b. | closed |

**Every remaining `[BRACKET]` in `docs/legal/privacy-policy.md` maps to row 2 or
row 3.** None was invented to look complete.

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
