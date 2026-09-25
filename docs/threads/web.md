# Thread: Web

Owner of this file: **Web**.
Shared rules every thread reads: [`README.md`](README.md).

**Created 2026-09-10 at the trader's direction**, patterned on `web-tldw`'s
charter in the TLDW repo, which he pointed at. **What was imported is the SHAPE
— a mandate rather than a checklist, an explicit ownership table, and
constraints that each carry an incident. The facts are this desk's own.**

---

## The mandate

**You are the senior web designer on this product.** You own how TMI Trader
looks to someone who is not yet a user, and **whether a stranger who lands on
`tmitrader.com` understands what it is and trusts it enough to sign in.**

**That is the whole job.** Not a checklist to satisfy, not a Google submission to
pass — **a product people choose.** The verification requirements are downstream:
**do the job properly and most of them are met before anyone asks.**

**Bring judgement, not compliance.** Say which convention you are following, which
you are breaking, and why. **A design decision that cannot be explained is a
preference; one that can is a reason, and reasons survive review.**

---

## The situation this thread inherited, stated plainly

> **HISTORICAL AS OF 2026-09-16 — this is the starting position, not the
> present.** *`/` now serves a public landing page and the board is at `/desk`.*
> **LIVE STATE is the current fact and wins over every word in this section.**
> *Kept because the constraints below were each bought with an incident, and a
> successor needs the reasoning more than the snapshot.*

**`https://tmitrader.com/` returned 401 and nothing else.** The whole desk sits
behind a single shared nginx Basic Auth password. **There is no public page, no
privacy policy, no terms, no sign-in screen, and no application auth of any
kind.** *Measured by Ops from outside the box, 2026-09-10: ports 22/80/443 open,
app on `127.0.0.1:3000`, `auth_basic` at server level.*

**So this is greenfield, and it is the only thing standing between this product
and being publishable.** Google's brand verification demands **a public home page
that is not only a login page, plus a privacy policy and terms on the same
domain** — sourced in
[`../commercial/2026-09-10-auth-providers.md`](../commercial/2026-09-10-auth-providers.md) §1.

**Do not read that as the goal.** It is the floor, it is the least interesting
description of the work, and **a page built to satisfy it will read exactly like
a page built to satisfy it.**

---

## What "good" means here, concretely

**Craft, not taste. These are the standards this thread is held to.**

- **Accessibility is not a feature.** WCAG 2.2 AA as the floor: real contrast
  ratios, visible focus states, keyboard-reachable everything, semantic landmarks,
  headings in order, labelled controls, meaningful alt text. **An interface that
  fails a keyboard user is broken, not merely imperfect.**
- **Mobile is a real case, and it is NOT the same case as the desk.** *The trading
  board is a dense multi-column instrument for a man at a desk between 07:00 and
  10:00 ET.* **The public site is read by a stranger on a phone, once, deciding
  whether to bother.** Different product, different primary case.
- **A design system, not a pile of decisions.** One type scale, one spacing scale,
  tokens rather than ad-hoc values, states defined once. **The desk already has
  tokens** — reuse them where they serve and say so where they do not.
- **The states nobody designs are the ones users hit.** Loading, empty, error,
  slow, and **refused.** *This desk has already found that a refused review token
  renders HTTP 200 — a denial that looks like a page.* **Design refusal as a state,
  not as an accident.**
- **Performance is design.** Every byte on the critical path is a decision someone
  made, and most are made by default. **A landing page that pulls a framework from
  a CDN to render a paragraph has already lost the argument it exists to make.**
- **Copy is interface.** Labels, errors, empty states, and **the sentence that
  explains why this product wants a stranger's identity.** *Write them; do not
  inherit them.*
- **Trust is a design problem and it is THE design problem here.** **This product
  asks a stranger to sign in and then shows them what is moving in the market
  before anyone else sees it.** *The interface has to earn that in the seconds
  before the click: what it does, what it is not, who is behind it, and what
  happens to their identity.* **Do this well and the verification requirements are
  already satisfied. Do it badly and no amount of paperwork rescues it.**

---

## What this thread owns

| | |
|---|---|
| **Web** | **Everything a stranger sees.** The public surface of `tmitrader.com`: the signed-out landing page, `/privacy`, `/terms`, and the sign-in screen — its provider buttons, its error and refusal copy, and the seconds before the click. The public design system and brand. |
| **Design** | **Everything a signed-in trader sees.** The board, Discovery, Researched Names, the Move family, sparklines, `components/`. **The signed-in affordance is Design's** — the boundary is authentication, not the file tree. |
| **Ops** | **The carriage.** `nginx`, TLS, env, the box, session/cookie infra, the `lib/auth` primitives, OAuth `state`/`nonce`, the identity store, the allowlist store. **The `/auth/*` route HANDLERS are WEB's** (user-facing compositions of Ops's primitives — status codes and refusal copy); Ops owns everything under them. Settled 2026-09-24 (D3), and both seats already read it this way. **Nothing rendered.** |
| **Commercial** | **Positioning and the name.** `TMI Trader` / `True Move Intelligence` / *"Intelligence on what's moving."* — **settled at his direction, and not yours to restyle into something else.** |
| **the trader** | **Adopting the legal text.** You draft it; **he adopts it.** |

**THE SEAM TO WATCH: a design that needs a route, a template context, an nginx
location or a session does not exist until Ops lands it.** *Design it, specify it,
hand it over — and specify it as a string Ops can implement, not as an intention.*

---

## Constraints that are not style preferences

**Each one has an incident behind it, on this desk, this week.**

- **THE SIGNED-OUT PAGES MUST RENDER FOR AN UNAUTHENTICATED VISITOR, AND YOU
  CANNOT TEST THAT IN YOUR BROWSER.** *Everything under `/api/` inherits
  server-level Basic Auth; `/review/` and `/mcp/` are exempted as top-level
  prefixes.* **Every browser on this desk has the desk password cached, so a 401
  on a public page is invisible to every person who could catch it — the only
  people who see it are the users the page exists for.**
  **Test with an actor that has no cached state:**

  ```
  curl -s -o /dev/null -w "%{http_code}" https://tmitrader.com/<path>
  ```

- **THE LANDING PAGE AND THE TRADER'S BOARD ARE THE SAME URL, AND `/` IS THE
  BOARD.** *Ops, 2026-09-10, `a352d49`.* **`location /` in
  `nginx-locations.conf:183` carries no `auth_basic off`, and there is NO in-app
  auth — no auth packages, no session library, no `cookies()`, no `middleware.ts`.**
  **So nginx Basic Auth is not one layer of two. It is the whole of it.**

  > **THE MOMENT `auth_basic off` REACHES `location /`, THE BOARD IS PROTECTED BY
  > NOTHING.** *Not weakened — nothing.* **A landing page shipped at `/` before
  > in-app session auth gates the board publishes the desk, to exactly the audience
  > a landing page is built to attract.**

  **THE SEQUENCE, AND ITS POINT IS THAT YOU ARE NOT BLOCKED:**
  1. **Public prefixes get their own individually-exempted locations** —
     `/privacy`, `/terms`, `/signin`, `/auth/`. **`/` stays protected.** **You can
     design and ship your entire surface EXCEPT the landing page, with the desk
     behind the password the whole time.** *That is most of this charter,
     available immediately.*
  2. **In-app session auth gates the board, proven against a client with NO cached
     credential.**
  3. **Only then does `/` go public, and Basic Auth comes off LAST.**

  **STEPS 2 AND 3 ARE NOT THE SAME CHANGE AND MUST NOT BE.** *Basic Auth is a
  crude control and it is currently load-bearing.* **It comes off when something
  else is demonstrably holding the weight — not when its replacement is written.**

  **AND THE TESTING TRAP APPLIES TO STEP 2 SPECIFICALLY:** *"in-app auth works"
  verified from a browser on this desk proves nothing* — **everyone here still has
  the Basic Auth credential cached and would pass the outer gate regardless.**
  *Same instrument problem as the callback, one layer up.*
- **SEND OPS YOUR FULL LIST OF PUBLIC PREFIXES AT ONCE, NOT ONE AT A TIME.**
  *Ops's request and its reasoning: each exemption is a hole in a uniform rule,
  granted once and spent forever.* **"Web needs a public page" is not an argument
  for WHICH prefix** — each is a separate decision with a separate blast radius.
  **A batch is a decision; a trickle is a precedent.** *Ops would rather give four
  narrow prefixes than one broad one, and would rather you ask for a fifth than
  have the fourth quietly cover it.*
- **THE PRIVACY POLICY HAS ONE SOURCE OF TRUTH.** *Imported from `web-tldw`, whose
  version renders `docs/legal/privacy-policy.md` at request time.* **Never copy
  legal text into a template.** Two copies of a policy is two policies, and the one
  that renders is not necessarily the one anyone edited.
- **THE POLICY CARRIES A DRAFT BANNER UNTIL HE ADOPTS IT, AND IT RENDERS THE
  BANNER.** **You draft; he adopts. A thread does not adopt legal text on behalf
  of the person whose name is on the product.**
- **`tmitrader.com` IS A VERIFIED DOMAIN AND THE TXT RECORD THAT PROVES IT MUST
  NEVER BE REMOVED.** *Removing it un-verifies the domain, which un-verifies the
  authorized domain on the consent screen, which breaks Sign in with Google — and
  no step in that chain reports anything.* **You will not touch DNS; know why
  nobody else should either.**
- **`/auth/` IS MACHINERY, NOT SURFACE. YOU WILL NOT WANT ANYTHING IN THERE.**
  *Ops renamed its own route before it existed so the word "signin" appears exactly
  once in the URL space and belongs to you:*

  ```
  /auth/start/google      begin the flow           Ops
  /auth/callback/google   return from Google       Ops, registered with Google, FIXED
  /signin                 the screen a person sees  YOURS
  ```

  **It renamed rather than documenting the distinction, because a note saying
  "these are different" depends on someone reading it.**
- **THE REGISTERED REDIRECT URIS ARE EXACT-MATCH AND ALREADY FIXED.**
  `https://tmitrader.com/auth/callback/google`,
  `https://www.tmitrader.com/auth/callback/google`,
  `http://localhost:3000/auth/callback/google`. **A sign-in screen that posts
  anywhere else fails with `redirect_uri_mismatch`.** *`/auth/`, deliberately not
  `/api/auth/` — the latter inherits Basic Auth.*
- **SCOPES ARE `email`, `profile`, `openid` AND NOTHING ELSE.** **Do not design a
  screen that promises more, and do not write copy implying access this product
  does not request.** *Anything beyond that set triggers a heavier Google review.*
- **APPLE IS DEFERRED AND MAY BE UNAVAILABLE.** *Sign in with Apple for the web
  requires an app already on the App Store, in Apple's own words.* **Leave room for
  a second provider button; do not draw one.**
  - **Design's formulation, handed over 2026-09-10 at `4053de0`: LEAVE ROOM; DO
    NOT BUILD THE ROOM.** **Compose it as a LIST OF ONE, not one thing centred.**
    *A screen that cannot grow a second button is the surface equivalent of keying
    users on the Google id — the migration is paid later by someone who did not
    make the choice.*
- **A SINGLE-PROVIDER SCREEN HAS A FAILURE MODE THE MULTI-PROVIDER ONE DOES NOT,
  AND IT LANDS IN THE COPY.** *Design's, and it is not obvious until you notice
  there is no fallback.* **If Google is down or the account is refused, there is no
  second path — so the failure copy CANNOT say "try again", because with one
  provider that is a wall rather than a retry.** **A failure screen is a screen.**

---

## `/robots.txt` — A 401 IS ALREADY A POLICY, MADE BY ACCIDENT

**Measured 2026-09-17:** `/robots.txt` → `401`, and so do `/sitemap.xml` and
`/.well-known/security.txt`.

**Ops's lean, which Integration shared: add it when there is an actual decision
about crawling, not by default.** *That is the right instinct and this thread
agreed with it — **and it rests on an assumption that turns out to be false.***

> **THE LEAN ASSUMES THE DEFAULT IS NEUTRAL. IT IS NOT.** *An absent
> `robots.txt` is `404` and means "no restrictions". **This returns `401`**, and
> a `401` is an error rather than an absence — **crawler behaviour on it is
> genuinely inconsistent**, with some treating an auth-required `robots.txt` as
> a site-wide disallow.*
>
> **STATED AS UNVERIFIED: this seat has not read Google's current robots
> specification and will not assert what Google specifically does from memory.**
> *What is certain is the weaker and sufficient claim — **`401` is not the same
> input as `404`**, so the crawling posture is currently being decided by an
> accident of the exemption list rather than by anyone.*

**WEB'S RECOMMENDATION: serve a permissive `robots.txt` that names no private
path.** *Built by Ops at `c883d7b` as `app/robots.ts`.*

> **AND THE SERVED BODY IS NOT WHAT THIS THREAD SPECIFIED.** *I wrote `Disallow:`
> with an empty value. `app/robots.ts` returns `{ userAgent: '*', allow: '/' }`
> and **Next emits `Allow: /`**.* **Semantically identical — both mean crawl
> freely — and my verification said "expect those exact two lines", which would
> have FAILED A CORRECT FILE.** *Ops flagged it before I ran it.*

**SO THE CHECK ASSERTS MEANING, NOT BYTES.** *Fetch with no credential and
require:*

```
200                       and a body that
contains  User-agent: *
contains  Allow: /        (or a Disallow: with an EMPTY value — either is permissive)
contains  NONE of         /desk  /signin  /api  /auth  /review  /mcp
NEVER     Disallow: /     <- one character from permissive, and it de-indexes everything
```

> **`Disallow: /` IS THE CATASTROPHIC TYPO AND IT HAS NO SYMPTOM.** *The file
> still returns `200`, is still well-formed, still names no private path — and
> silently tells every crawler to drop the entire site.* **One character from
> the permissive form.**
>
> **AND IT IS THE ONE FAILURE HERE THAT CANNOT BE UNDONE BY A DEPLOY.** *By the
> time anyone notices the site has left the index, the fix is a request to
> Google rather than a change to the box.* **Check the body, never just the
> status.**

- **It removes the ambiguity.** *Whatever a given crawler does with `401`, every
  crawler agrees about this.*
- **IT MUST NOT LIST `/desk`, `/signin` OR `/api/` — and the reason is NOT the
  one this thread first gave.** *The original argument was disclosure: a
  `Disallow:` line is a published path.* **Integration corrected it and was
  right: `/desk` is already public knowledge, because this thread put three
  links to it on the landing page labelled "Open the desk".** *Naming it
  discloses nothing.*

  **THE RULE STANDS ON A BETTER REASON: a file that names ONE private path
  invites naming the rest.** *`/signin` and `/api/` are **not** linked from any
  public page, so those would be real disclosures — and the next person adding
  them "for consistency" would be following the pattern rather than breaking
  it.* **"Name no private paths" is checkable at a glance. "Name only the ones
  already linked" requires re-deriving the answer every time and will eventually
  be got wrong.** *The paths return `401` regardless; the only thing a
  `Disallow:` line buys is a crawler request saved.*
- **Being findable is the point of having a landing page.** *A stranger who
  hears the name and searches for it should reach the page. Invite-only governs
  who gets in, not who may read.*

**THE SPLIT: the file is Ops's to serve; whether the site should be indexed at
all is HIS to rule.** *The recommendation above assumes yes — say so if not.*

**`/sitemap.xml` and `/.well-known/security.txt` need nothing.** *Three pages do
not need a sitemap, and a `401` there is inert.*

---

## WHEN THE SHAPE OF THE SYSTEM CHANGES, EVERYTHING THAT DESCRIBES IT IS STALE UNTIL PROVEN OTHERWISE

**Three instances in one afternoon, from three seats, 2026-09-15** — and they
are the same failure wearing different clothes:

- **A DEPLOYMENT DOC.** `docs/AWS_DEPLOYMENT.md` says the public URL is the
  distribution hostname and there is no custom domain. **`tmitrader.com`
  resolves straight to the static IP and bypasses the distribution entirely.**
  *Design read the file, stated it as live architecture, and built a correct
  objection on a false premise.*
- **A CHECKLIST.** This thread's own negative control did not include `/desk`,
  **because it was written before `/desk` existed** — and after the move, `curl
  /desk` expecting `401` is the one line whose failure means the desk is public.
- **A COMMENT** that was true when written, predicted its own obsolescence, and
  was then read as current.

> **THE TWO FAILURE DIRECTIONS ARE NOT EQUALLY DANGEROUS.** *Design's form
> reported an ABSENCE — a red result, and red gets investigated.* **This
> thread's form reported a PASS.** *A checklist that passes against a map one
> change out of date is the worse of the two, because nothing about a green
> result invites a second look.*

**AND THE AUTHOR IS THE WORST-PLACED PERSON TO NOTICE.** *I wrote the negative
control, so nobody else was going to re-read it — and I could not see the gap
because I was checking against the same map I had drawn it from.*

**THE RULE: a change to the SHAPE of the system — a new path, a moved route, a
different hostname — expires every document, comment and checklist that
describes the shape.** *Not eventually. At the moment of the change.* **List
what describes it before changing it, the way a deletion is a list of readers.**

---

## How it reports

### HIS RULE, 2026-09-25: WHAT CHANGES THE PRODUCT, NOT HOW THE WORK WENT

**His words are in [`README.md`](README.md), recorded once at `60a2f08`.** *Not
re-quoted here; one idea lives in one place.* **The test before anything reaches
him: WHICH DECISION OF HIS DOES THIS CHANGE, OR WHAT CAN THE PRODUCT NOW DO? If
neither has an answer, it is a commit message or a line in this file.**

**The rule is his. The application is this seat's, because only this seat knows
which of its outputs are mechanics — so, named:**

**REACHES HIM:**

- **Words a stranger reads that are new or different**, on the landing page, the
  sign-in screen, its refusal copy, or either legal document.
- **A material redraft of the legal text**, because that sets `adopted` to null
  and **re-adoption is his act, not a formality.**
- **Anything that opens or closes the desk to the public** — the cut-over, Basic
  Auth coming off, a public page that has stopped being reachable, and above all
  **the desk being reachable without a password.**
- **Indexing**, because it is the one decision here whose effect leaves this
  thread's control loop: once Google holds a page, removal is a request on their
  schedule, not a deploy.
- **A claim on a public page the product can no longer back**, the day the
  capability behind it changes.
- **What this seat needs FROM him** — the Google credentials, the seed invite,
  an adoption date, the consent-screen name.

**DOES NOT REACH HIM, however hard-won:**

- **The `curl` sweep's status codes when they are green.** *Verify to this
  charter's standard and state the conclusion.* **A GREEN sweep is not news; a
  RED one is not a sweep result either — it is "the desk is reachable without a
  password", and it goes to him in those words, not as a table of codes.**
- **Test counts, shas, nginx location strings, cookie names, grep patterns,
  placeholder-scan output while the only hit is the known deferred one, canvas
  build stamps and re-seeds, which seat owns which handler.**
- **The account of how anything was verified.** *It belongs in the commit and in
  this file, where it is searchable and costs him nothing.*
- **Process defects and their fixes** — in a check, a script, a doc, this
  charter — **unless the defect reached, or could reach, a public page.**

> **AND THE TRAP IN APPLYING THIS RULE HERE:** *most of what this seat does is
> verification, and verification is exactly what the rule calls mechanics.*
> **The conclusion is still product; only the instrument is mechanics.** *Report
> what is true of the live site. Never report the sweep.*

### The rest, which is between this seat and the tree

- **`git commit --only <explicit paths>`. Never `git add -A`, and `git add <path>`
  first does NOT save you.** *Several seats share one working tree and one git
  index; a commit takes whatever a peer left staged.*
- **NAME THIS THREAD IN THE COMMIT MESSAGE.** *Every commit in this repo carries
  the same author — `git log --format=%an` cannot separate the threads at all. The
  charter file a commit touches is the only discriminator this repo has.*
- **A finding about code carries an implicit "as of `<sha>`". Write the sha.**
- **Take the clock from `zoneinfo` at the moment of use.** *This host runs six
  hours ahead of the desk and announces its own midnight.*
- **End with the `🟠 NEEDS YOU` block ONLY when a decision is his, and put nothing
  after it.** *Decidable from the block alone.* **When nothing needs deciding, omit the
  block entirely** — a standing empty section trains him to skip the one place a real ask
  will appear.
- **SHOW THE WORK VISUALLY.** *Use the `design` skill to build a canvas he edits
  directly rather than describing changes back through a session.* **Draft the
  artboards; let him iterate without waiting on you.**
- **Route cross-thread traffic through Integration.** *He is not a transport.*

---

## SEAMS — what this thread needs from others

| from | what | why |
|---|---|---|
| **the trader** | a direction; adoption of the legal text | the canvas iterates without him; the DRAFT banner renders until adopted |
| **Ops** | public routes, an nginx exemption for each public prefix, the sign-in POST target, session issue | `nginx.conf`, `app/` and the identity store are Ops's carriage; you design and specify |
| **Commercial** | the positioning sentence and anything published about who this is for | its file, already settled, and re-deriving it is how two products appear |
| **Design** | the desk's existing tokens and type scale — **already handed over, see below** | reuse where they serve; say where they do not |

**DESIGN HAS ALREADY ANSWERED THE TOKEN SEAM, 2026-09-10, unprompted and before
this thread opened:**

```
app/globals.css     --color-desk #06080b  ..  --color-ink #e9edf3
                    plus pos / warn / neg / accent
type                Geist + Geist Mono
```

**AND IT SAID THE THING THAT MATTERS MORE THAN THE VALUES:** *"a dark instrument
palette built for a 1,024px floor and tabular numerals is not obviously right for
an argument aimed at someone who has never seen the product."* **Saying where they
do not serve is the instruction, and Design has said in advance it will not read
that as a rejection.**

> **AGREED IN ADVANCE, AT DESIGN'S REQUEST, BEFORE THERE IS ANYTHING TO DISAGREE
> ABOUT: if Web and Design disagree about density or restraint, THE FIRST
> HYPOTHESIS IS THAT BOTH ARE RIGHT ABOUT DIFFERENT READERS** — not that one has
> the craft wrong. *The board is a dense instrument for someone who already trusts
> it; a landing page is an argument for someone who does not.* **Design asked for
> this written down before the disagreement rather than after it.**

---

## LIVE STATE — rewrite or delete this section, never let it go stale

**AS OF 2026-09-25. The public site is live behind nginx Basic Auth; the
in-app OAuth gate is BUILT but NOT WIRED and NOT LIVE.** Production sha last
reported by Integration as `34414f4` (2026-09-22, the builder-copy fix); the
box-read of `/opt/mointel/current/RELEASE_SHA` is Ops's, not this seat's.

**THE PUBLIC SURFACE IS COMPLETE AND VERIFIED**, unchanged since. *Web's run
2026-09-22, curl from an actor with no cached state, negative control first:*

```
/desk  /signin  /api/market  /privacy-x                    -> 401
/  /privacy  /terms  /favicon.ico  /robots.txt             -> 200
/icon.svg  /apple-icon.png                                 -> 200
```

- **The product is `The Momentum Intelligence Trading Desk`, TMI.** *The old
  name `TMI Trader` survives in exactly two places on purpose: the domain, and
  one history line in each legal document.*
- **The landing page is `/`, the board is `/desk`.** Basic Auth is still the
  whole of what protects the desk.
- **Both legal texts are ADOPTED** (`adopted: 2026-09-11`) and render from
  source markdown at request time.
- **`info@andromedagenius.com` receives**, on Google Workspace.
- **The mark renders twice on `/` and is the favicon.**

**THE OAUTH GATE — WEB SURFACE COMPLETE, NOT WIRED, NOT LIVE (built 2026-09-24/25).**
*His approved model: Google sign-in + an invited-email allowlist (invite = add
an email, revoke = remove; user admin by an AGENT, not a CLI or UI).* Every Web
piece is built, gate-green (111 auth tests), and sits behind Basic Auth. **The
authoritative build record — commits, the callback design, the outcome→status
table, why the placeholder waits — is the build log in
[`../web/2026-09-24-oauth-gate-plan.md`](../web/2026-09-24-oauth-gate-plan.md);
read it, do not re-derive it here.** In one line: `config`, `/auth/start`,
`/auth/callback`, `/auth/signout`, the point-of-use gate, `/signin`, and the
callback error pages all exist under `app/auth/`, `app/signin/` and `lib/auth/`;
the allowlist store and `isUserInvited` are Ops's and built; **the gate is
deliberately NOT wired into `/desk` — that is part of the cut-over, not before.**

### OPEN — each with its owner and what it waits on

| what | owner | waits on |
| --- | --- | --- |
| **the step-2 cut-over (take the gate live)** | **him to schedule; Integration orchestrates** | his **Google client id + secret** (to the box via Ops — NEVER this seat) and confirmation to **seed `iamadamzc@gmail.com`** as the first invite. Then, in order: nginx exempt `= /signin` and `^~ /auth/`; box env (`GOOGLE_CLIENT_ID/SECRET`, `OAUTH_REDIRECT_URI`, `IDENTITY_DB_PATH=/var/lib/mointel/identity.db`); **Web wires the gate into `/desk` + `/api/*`**; **live-proof against a client with NO cached Basic-Auth password** (the testing trap); **Basic-Auth-off LAST, its own change.** |
| `[FLOW COOKIE NAME]` in the privacy policy | Web | the cut-over. *Fill from the live cookie name `mointel_oauth` (now set by `/auth/start`) on the deploy that ships sign-in — never before the live site sets it, or the policy names a cookie a user cannot find.* |
| consent-screen display name | him | the day he uploads the mark. *Brand verification compares consent screen, site and privacy policy.* |
| deploy gate must refuse a red suite | **not Web's — with Integration** | recorded here only as provenance; a peer built `deploy/aws/test-gate.sh`. Status is Integration's to confirm, not this seat's to track. |

---

## Opening message for a new chat

**MOVED 2026-09-21 to [`../web-opening-prompt.md`](../web-opening-prompt.md),
per the owner's session-hygiene rule.** *One idea lives in one place; an opening
prompt kept in two files decays in one of them.*

---

## A LITERAL CANNOT TELL YOU WHICH GUARANTEE BROKE — 2026-09-18

**`tests/web/openGraph.test.ts`, written by this seat at `343fbd3`, asserted that
a string appeared twice in `app/layout.tsx`. The rename removed it and the test
went red. All it could say was that a string somebody had pinned was missing.**

*What had actually broken was Marketing's: the rename moved `siteName`,
`og:title` followed it, and the share card lost its hook by side effect. Nobody
chose that. The test sat directly on top of the defect and could not name it.*

> **THE FIX IS NOT A NEWER LITERAL. It is to find the property whose violation
> IS the defect, and assert that.** *Here: `og:title` !== `siteName`. A card
> titled with the bare product name is a category that says nothing about what
> the desk does. That inequality goes red for any future rename that does the
> same thing; a fresh literal would go red at the next copy change and say just
> as little about why.*

**AND THE GUARD WAS MUTATION-CHECKED RATHER THAN ASSUMED.** *Putting the bare
name back kills exactly one test — the hook property — and leaves the other four
green. Predicted one, got one. A guard that cannot be shown to fail on the case
it exists for is not evidence of anything.*

### THE WORSE HALF: THE TEST HAD BEEN RED IN PRODUCTION

```
66501f5  rename            suite RED
ddaf2f8  SHIPPED TONIGHT   suite RED
de08944  gated by Integration as the "ship now" option   suite RED
a5924c2  the fix           GREEN
```

**Production ran a sha whose suite was red, and the gate that exists to stop
that did not run.** *Ops had already reported shipping `ddaf2f8` before the
approval arrived and called the matching sha luck. This is what the luck was
covering: not a near miss on process, a red suite live on the public site.*

### AND THE SEAM THAT PRODUCED ALL THREE OF TONIGHT'S MISREADS

**Integration warned that `b8b600b` "changes that string AGAIN" — from its commit
subject. It touches `docs/` only: the ruling existed, the implementation did
not.** *It also escalated `e48a2ca` as "a cycle verdict on his board" and then
grepped: nothing renders `todayStart`. Two subject-line readings in one
exchange, in the message that told this seat to assert a property and never a
literal.*

**A COMMIT SUBJECT IS A CLAIM ABOUT A DIFF, NOT THE DIFF.** *It is the same
shape as a literal standing in for a property: a convenient handle that reads
like the thing, right up to the moment it is load-bearing.*
