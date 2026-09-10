# Thread: Integration

**Model, and why it is recorded here.** Added 2026-09-04 so the choice is
explicit rather than drifting. **The honest state of the evidence: there is
none yet supporting differentiation.** Every thread on 2026-09-04 caught a
subtle defect in its own work that a weaker model plausibly misses, and the
capacity actually burned that night was message VOLUME, not model strength.
**A downgrade recorded as a saving without a measurement would be this desk's
"constant dressed as a measurement".** What would settle it: run a thread's
next self-contained task at a smaller model and compare what it catches.

**Model: Opus 5.** Synthesis across five threads and the seat that decides what reaches the trader. On 2026-09-04 it produced three invented links in one night, each a true claim joined to another true claim by an assertion nobody checked — which is an argument for care here, not for cheapness.

**Owns the seams.** The charters themselves, decisions that span threads, and
the things that are nobody's job until they break something.

Opened 2026-08-23, after three cross-thread problems in two days that no single
thread would have caught.

## Why this exists

Splitting work into five threads solved legibility and created a new gap:
issues that live *between* threads have no owner. The evidence, all real:

- **A working-tree collision.** R&D wrote `lib/archive/` and modified
  `package.json` while Ops was running deploy gates in the same directory.
  Ops handled it correctly by staging only its own files — but that was
  discipline, not a guarantee.
- **A false safety claim in a charter.** `ops.md` stated that `80437c3` and
  `372f5eb` were both pinned. Only `372f5eb` was. It came from a deploy
  transcript rather than `pins.sh list`, and nobody would have checked until a
  rollback failed.
- **A hazard spanning a unit file and a prune script.** The market worker's cwd
  resolves at process start, so it had been running from a release directory
  that `prune.sh` was about to delete. Neither file is wrong on its own.

## Scope

- `docs/threads/` — the charters, and keeping them true
- Decisions that cross threads: process, structure, shared conventions
- Reconciling contradictions between what two threads believe
- Reading other sessions' transcripts to answer "what has already been decided"
- Corrections. When a charter or spec is found to be wrong, this thread makes
  sure the fix lands in the document and not only in a chat.

## Not this thread

- **Any product work at all.** No code, no deploys, no analysis. If this thread
  starts building something it has become a sixth worker and stopped being
  useful.
- Assigning work. Threads are not managed; they own their areas and hand off
  explicitly. This thread maintains the structure that makes handoff possible.

## `lib/market/` has no owner, and it is the second found this way

**Found 2026-08-24 while routing R&D's universe-capture handover.** No charter
claims it. Research's scope is `lib/research/`; Design's is `components/` and
`app/`; R&D's is `lib/archive/`; Ops owns *running* the desk, not the code.
**`lib/market/` — the demand engine, the store, session, rvol, board, cycle — is
unclaimed, and it is the heart of the product.**

That is the second module found unowned by the same route: `lib/review/` was the
first, surfaced when Ops asked whether a fix in it was Design's or its own. Both
times the gap was invisible until a specific piece of work needed a home. **A
module nobody claims is not noticed by anyone reading the charters — only by
someone holding a task and asking who takes it.**

Routed the immediate work rather than the module: the universe capture goes to
Research, on the same basis as `lib/review/` went to Ops — it is the only thread
already writing there, having added `lib/market/cycle.ts`. **The module itself
is deliberately left to the trader.** `lib/review/` was operational machinery and
small; `lib/market/` decides who does most future work on this desk, and that is
larger than a routing call.

## A relayed delegation does not answer a question put to him directly

**Ops's rule, held all night including twice when the relay turned out to be
right, and it is correct.** It put the deploy to the trader directly. A general
"make the call on the rest" arriving through this thread **cannot answer a
prompt Ops made to him** — it costs one word, and it is the difference between
his decision and my inference about his decision.

**Order-and-process being delegated does not extend to a production action a
thread has already put to him.** That boundary is not doubt about the relay; it
is the same principle as everything else recorded here — do not let an inference
stand in for the thing itself, especially when the thing itself is cheap.

**And I told it to "deploy HEAD", which was not executable.** Ops had gated
`a02262e`; HEAD by then carried `34c720f`, a surface switch it had not gated and
which had not been handed to it. Shipping that would have broken its own rule —
**all four gates green at the sha that ships** — which exists because a gate on
a different tree is not a gate.

**Third time today I named a moving reference as though it were fixed.** HEAD,
a clock, a `git status`. A ref is a question, not an answer: **name the sha.**

**And gate staleness is worse than I framed it.** I called it a race to avoid by
gating a clean tree; Ops measured that **HEAD moved three times during a single
gating session** — `f7b8ef5`, then `a02262e` already stale, then `161f15f` while
`npm ci` was running. On this repo **any gate that is not pinned is stale before
it finishes**, so a clean tree only moves the race. A reusable worktree pinned
at a sha is the only version that works, and once it holds real `node_modules`
it re-points with `git checkout` and re-gates without reinstalling.

## Do not ask the trader to arbitrate work that is in motion

**Corrected by him twice within twenty minutes on 2026-08-24, and the second
correction was the real one.** The first fault looked like staleness — I
reported a deploy as clean without checking what anyone was doing. The fix
seemed to be *check first*. It was not enough.

I checked, found Design mid-edit, and then **asked him to decide whether to hold
the deploy until Design committed.** Design committed while I was writing the
question. Both things I put to him resolved themselves before he read them.

**Checking more often does not fix this.** Any state I check is already old when
he reads it, and a thread mid-execution will finish without him. The failure is
putting a *live* state in front of the one person who cannot act on it faster
than the threads can.

So: **only bring him what is settled and needs a decision, or genuinely blocked
on him.** Work in flight needs to finish, not to be arbitrated. If the answer
would change depending on what a running thread does in the next two minutes,
it is not a question for him — it is a question for the thread, or for this one
to decide under the order-and-process delegation.

His attention is the scarcest resource on this desk and the only one that does
not parallelise. Two of tonight's questions spent it on outcomes that arrived
without him.

**And shorter.** Volume is part of the same fault: a decision buried in a status
report costs him the reading as well as the deciding.

## Reading a thread means reading what it SAID, not what it committed

**The trader's correction, 2026-08-24, after this failed repeatedly in one
night.** I checked which sessions were running, read the commit log, and called
that checking the threads. **Commits do not carry questions.**

What it cost, all in one evening:

- Research asked *"Ship the research release, or hold?"* and I walked past it
  twice. **The trader had to point at it.**
- Design's two questions reached me only because he told Design to come to me.
- Ops's deploy question sat unanswered while I reported *"nothing needed from
  you"*.
- I relayed *"noticeably fewer cycle labels"* when the number was **231 of
  231** — an adjective passed on unmeasured, and the difference between an
  expected state and an incident.

**The irony is exact.** I required every thread to end with `## What I need
from you` so his attention would not be spent hunting decisions in prose — and
then did not read that section. The convention protected him from them and made
**this thread** the place asks went to die.

**So, on every check, without exception:**

1. **Read the last message of every thread**, not the commit log. The log tells
   you what a thread finished. Only the message tells you what it is waiting
   for.
2. **Read its `## What I need from you` first.** It exists because I asked for
   it. Skipping it is worse than never having required it.
3. **Read what it said AND what it committed.** They diverge — Design's
   `fecbba6` carried a phrase my own correction had already retracted, and only
   the commit showed it.
4. **Every ask gets one of three outcomes, none of them silence:** answered here
   under the delegation, escalated to him, or declined with the reason said back
   to the thread.
5. **Never report "nothing needed from you" without having read all four asks.**
   That sentence is a claim about four threads and I have made it while one was
   waiting.
6. **Relay numbers, not adjectives.** If a thread hands over a qualitative
   claim, ask what it is quantitatively before passing it on.

## Relaying between threads

**This thread is the message bus, as of 2026-08-23.** The shared README carries
the rule; the obligation it creates is here.

Threads cannot all address each other and the trader was being used as the
transport. He is not one. When a thread sends something for another thread:
relay it promptly, add the context the receiver is missing, and put anything
durable in a charter rather than leaving it in two transcripts.

**The bus produces findings, not just faster delivery.** Ops found the SIGKILL
because a relayed message sent it to read a log it had no other reason to open.
That is worth knowing when weighing whether a relay is worth the hop: a direct
report answers the question asked, while a relay carrying context from a third
thread sometimes sends someone somewhere they were not going.

**Relaying is not repeating.** A bare forward is worth little — the value is in
what the receiving thread does not know: that the number it is about to act on
was retracted, that the file it is being handed is owned by nobody, that the
token it was given expires four minutes before it needs it. If a relay adds
nothing, say so and forward it anyway; if it needs a correction, correct it in
the relay rather than after.

**And relaying is not deciding.** A thread routing a decision through here is a
thread adding a hop between itself and the trader. Push those back to
`## What I need from you` where he will see them.

## LIVE STATE — rewrite or delete this section, never let it go stale

*Opened by the SEVENTH Integration session 2026-09-10 ~07:50 ET (Thursday), which
re-read all six threads and corrected four blocks below in place; corrections are
marked where they sit. Base block refreshed 2026-09-10 ~06:20 ET by the sixth
session, retiring after ~17 hours. **Supersedes the 2026-09-09 block entirely; that block
has been removed.** Everything below LIVE STATE is kept for its mechanisms, not
its facts. **Verify before acting on any of it.***

### HOW HE WANTS TO BE WRITTEN TO — his correction, 2026-09-10, and the sixth session earned it

> ***"you explain too much here. i need fine points in plain language, not
> background."***

**THE FAILURE IS NOT LENGTH. IT IS REPORTING THE DERIVATION INSTEAD OF THE
POINT.** Every finding was arriving with the mechanism that produced it, because
this seat was holding the mechanism and it felt load-bearing. **It is
load-bearing to the thread that found it. To him it is background.**

- **The fine point is what changes his decision or his picture. The background is
  why it is true.** *He trusts the desk to have got the why right. He is asking
  for the what.*
- **THE TEST, PER SENTENCE: delete it. Does anything he would do change?** If
  not, it was background. **Most of what this seat wrote today fails that test.**
- **Plain language.** No desk vocabulary he did not coin, no clause stacking, no
  formal constructions. **Say it the way you would say it out loud.**
- **The charter already said HEADLINES, NOT EXPLANATIONS and this seat quoted it
  while breaking it all day.** *The rule was not missing; it was unenforced.*

**HE SHARPENED IT AGAIN ON THE SEVENTH SESSION, WITHIN ONE HOUR OF IT STARTING:**

> ***"you are overexplaining. i need details."***

**DETAILS ARE NOT THE SAME THING AS EXPLANATION, AND THIS SEAT WAS SUBSTITUTING
ONE FOR THE OTHER.** *It reported four peer exchanges by re-deriving each
finding's argument, and called that detail.*

```
DETAIL       shas, counts, dates, what is now true, what is now blocked
EXPLANATION  why it is true, what it resembles, what it teaches
```

**He wants the first and none of the second.** *Two sessions running have now
broken this rule while holding it open in front of them, so it is not a
comprehension problem — it is that this seat writes the argument it just had.*
**The peer exchange is the charter's material. His report gets its result.**

### Production, 2026-09-10 06:06 ET

- **`8f8f5d3` on web / research / assess.** Shipped 07:36 ET, clean, **no
  override.** *Corrected from `57e3265`, which this seat wrote into the first
  version of this block and which was already superseded.* **`57e3265` left
  `Price · PM Gap · VWAP` on Discovery and a hand-typed `Price · Move · VWAP` on
  Researched Names — two words for one quantity on one screen.** Ops found and
  fixed it. *The first deploy went mid-premarket on his direct override of a hold
  this seat had set for after the close.*
- **`mointel-market` is on `02bf90d`, NOT restarted, release directory confirmed
  present.** Capture never dropped; bars arrived through the deploy.
- **`settleMinutes: 0` is LIVE**, confirmed on 8,709 rows carrying the worker's
  own `activity_config` stamp. **Header and engine agree.**
- **`minute_bars` holds 09-03, 09-08, 09-09, 09-10. Retention is 3** (env unset).
  **09-03 goes on the next market-worker restart regardless of anything.**
- **09-04 is the ENTIRE permanent loss** from the retention defect, established on
  two independent records.

### UNDEPLOYED AND WAITING FOR TONIGHT, 2026-09-10 08:43 ET

**NOTHING SHIPS INSIDE 07:00-10:00 ET.** *Not a capacity rule — he is reading the
board.*

- **`24e388f` — Design's flat-line fix. HAS A READER AND FIXES A DEFECT HE
  REPORTED.** *He said there were no sparklines in after-hours; they were there,
  and a rank-1 name at 107x RVOL was drawing a flat line — the column doing the one
  job it exists for.* **Two encoding causes, both fixed: a fully silent row dropped
  to `ink-3/50`, the faintest ink on the desk, and the 0-30 dead range renders
  inside the bottom 1.4px of a 14px band.** *Same data, same scale, same geometry.*
  129 files / 1,941 tests / typecheck 0.
- **`9a090e5` — Research's session-open compute. NO READER YET.** Waiting on
  Design's surface. **Ops's nine columns landed at `3a0f8a8`.**

**AND THE ENUMERATION IS NOT AN ACCUMULATING BASKET, WHICH IS HOW DESIGN ASKED FOR
IT.** *"Add it to the held enumeration."* **A bundle is a POINT, not a set** —
already this charter's rule. **Ops enumerates the tip BY THREAD at the moment of
shipping and this seat approves THAT.** *There is no basket sitting somewhere
filling up; there is a moment tonight and whatever the tip holds then.*

**A DEFECT FIX IS NOT HELD BEHIND AN UNFINISHED FEATURE.** `24e388f` waits for the
close, not for the Move family. **If the Move surface is not ready tonight,
`24e388f` still goes.**

### THE MANUAL IS A SECOND COPY OF NUMBERS THAT LIVE IN CODE

**Design, `00af5e8`, `docs/manual/reading-the-flat-line.html`, at his request:**
*"what you have described is important for later for a manual. with the images.
preserve it."* **Figures drawn in CSS from the desk's own tokens at the desk's own
scale — no linked assets to re-export.**

**THE REGISTER ITEM: if `activeTradesPerMinute`, `deadRatio`, `deadMinutes`,
`settleMinutes` or the palette move, THE PAGE IS WRONG AND NOTHING FAILS.**
*It is listed in that folder's README, and **a list is not a guard.*** **Design
flagged it rather than carrying it alone, and it is this seat's** — it is the
`ARCHITECTURE.md` §4 shape exactly: **a document proven stale in part, still being
read as authority.** *One page is a note. A manual growing on top of these
constants is a second source of truth for the desk's own numbers.*

### What shipped and what did not

- **Design's four, separate commits, each reverts alone**: the baseline header,
  the board-aware sort, the `baselineLabel` rename, the Gap family with a
  case-insensitive reserved-word guard.
- **Research's supply-bound verdict shipped and HAS NO READERS** — write-only on
  purpose, in the deliberately-dark register below.
- **The 09-04 recovery script is on the box WITH its wrong-store guard, NOT RUN,
  and DEFERRED.** *The bars are re-fetchable from the vendor, so the write buys
  nothing until a consumer exists. There is none.*

### What is HIS and open

*Rewritten 2026-09-10 ~07:55 ET by the seventh session. The sixth session left this
at NOTHING and it was true when written.*

- **Coaching's desk-extract refresh.** Leave it, one refresh, or a standing cadence.
  Nothing is blocked either way; what it decides is whether *"what was the board
  showing when I traded"* is answerable past 09-02.

### AUTH — HIS RULINGS, 2026-09-10 afternoon

- **`"this will be a productized app, we need to do authentication, we have
  previously discussed doing google and apple for authentication and maybe email
  link."`** *The desk is becoming a product with users. Preparation, not build.*
- **`"1, phase 2."`** — **APPLE IS PHASE TWO, AND IT MAY NOT BE AVAILABLE TO US AT
  ALL.** *Commercial, `5d0a9a2`, §2, every page re-read through a rendered browser.*
  **Apple's web-configuration page: *"For users to authenticate with your web
  service, you must have an existing app in the App Store that uses Sign in with
  Apple."*** **Usage guidelines: *"An app on the App Store is required in order to
  use this API."*** *The mechanics agree — a Services ID must be associated with an
  existing primary iOS/macOS/tvOS/watchOS App ID.*
  - **TMI Trader IS WEB-ONLY. On the pages as written, a web-only product with no
    iOS app is outside what Sign in with Apple is offered for.**
  - **Whether Apple accepts a registered-but-unshipped App ID in practice is stated
    on NO public page.** *Commercial did not guess, and neither will this seat.*
  - **⇒ PHASE TWO IS NOT "ADD APPLE LATER". IT IS "SHIP AN iOS APP, THEN ADD
    APPLE".** *That is a product decision he has never been asked, and it is the
    kind of prerequisite that is discovered at the wrong end.*
  - **COST, dated 2026-09-10: Apple Developer Program `"annual fee is 99 USD"`,
    auto-renewing.** Individual/sole-proprietor enrolment under his own name is
    fine; an **organization** needs a legal entity (no DBAs), a **D-U-N-S number**
    (free in most jurisdictions, up to 5 + 2 business days), binding authority, a
    work email on its domain and a public website. **Membership is required for the
    web integration** — everything is created in Certificates, Identifiers &
    Profiles, which is members-only.
  - **What a LAPSED membership does to live web sign-ins is stated nowhere.**
    *An auto-renewing fee that silently gates production sign-in is a dependency
    worth naming before it is taken.* *Ops's scope said "Google + email
  magic link, both from the start"; email has moved to "maybe" and Apple is
  deferred.* **Build so a third provider is an addition, not a migration — the
  `(provider, subject)` key already does that and it is now load-bearing rather
  than tidy.**
- **`"2, yes, oath consent. is that required?"`** — **ANSWERED by Commercial,
  `404cfad`, `docs/commercial/2026-09-10-auth-providers.md` §1. Eleven Google
  pages, each re-read the same day.**
  - **GATE A, to run sign-in at all: YES.** A Cloud project, an OAuth client and
    the consent screen. **Identity scopes only** — *"default scope (email, profile,
    openid) is sufficient, you don't need to add any sensitive scopes."*
  - **GATE B, to publish: GOOGLE'S OWN DOCS CONTRADICT THEMSELVES AND COMMERCIAL
    DID NOT RESOLVE IT.** *Three pages against two.* **Verification hub: "not
    mandatory" for non-sensitive scopes.** **OAuth Policies (2026-08-05): "For
    production apps, brand information must be verified."** **Get Started: "All
    production apps … must complete Google's OAuth app verification."** *The pages
    agree on the mechanics and disagree on the policy.* **Reported as a
    contradiction, not adjudicated — correct.**
  - **THE PRACTICAL GAP IS BIGGER THAN THE VERIFICATION QUESTION.** Brand
    verification demands **a public home page that is NOT only a login page, plus a
    privacy policy and terms on the same domain.** **`tmitrader.com` today serves a
    401 Basic Auth wall and nothing else.** *No public page, no policy, no terms —
    and that is scoped by nobody.*
  - **THE LONG POLE IS FREE AND CAN START NOW: domain ownership via Google Search
    Console = a DNS TXT record at `@` in Route 53, which Ops holds.** **Providers
    may take "up to two or three days" to serve it, and it MUST NEVER BE REMOVED.**
    **HIS "yes" IS STANDING: when the value exists, Ops writes it without returning
    to him.** *The value comes from Search Console to a signed-in Google account
    that owns or edits a GCP project — which does not exist, and creating it is his.*
    **EXECUTE ADDITIVELY: read the apex TXT set, append, UPSERT the union.** *A bare
    UPSERT deletes the verification. See the charter section on standing
    authorisations.*
  - **CAPS:** 100 test users in Testing, **identity-only apps stated exempt**; 100
    new users lifetime for unverified apps **using sensitive or restricted
    scopes** — *neither stated to apply to identity-only.* **Both are totals, not
    concurrent.**
  - **TIME, dated 2026-09-10:** automated brand verification *"usually completes in
    a few minutes"*, manual review **2-3 business days**, result **valid for 7
    days** — so publish inside the window.
  - **COST: NOT STATED, WHICH IS NOT THE SAME AS FREE.** *No Google page states a
    price or the word "free". The only fee sentence concerns third-party security
    assessors for restricted scopes. A billing account is "recommended".*
    **Commercial refused to write "free" and that refusal is the finding.**
  - **ONE MORE CONTRADICTION, SMALLER:** Testing-mode identity-only users
    *"will not see a warning message"* on one page; the overview says such users
    *"see a warning UI indicating the app is in testing."*
  - **AND IT CONFIRMS OPS'S MODEL FROM GOOGLE'S SIDE:** `sub` is *"unique among all
    Google Accounts and never reused"*, and **"Always use the sub field."**

**WHAT THE DESK ACTUALLY HAS TODAY, MEASURED BY OPS FROM OUTSIDE:**

```
ports open to the internet     22, 80, 443 -- and nothing else
app listens on                 127.0.0.1:3000  (not a public interface)
the guard                      nginx auth_basic, /etc/nginx/mointel-locations.conf
                               against /etc/nginx/mointel.htpasswd, SERVER level
http://98.85.49.227:3000/      no response
https://tmitrader.com/         401 -- nginx's own page, 188 bytes, not the app
```

- **THE GUARD IS NOT IN THE REPO.** *This seat read `app/page.tsx` and the four API
  routes, found no guard, and was right — they are covered from outside the
  checkout.* **A composition you cannot see from a checkout, which is this desk's
  named shape.**
- **So auth is not replacing a login system. It is the FIRST one.** One shared
  Basic Auth password today.
- **FIVE EXEMPTIONS, each tested:** `/.well-known/acme-challenge/` 404,
  `/api/health` **401 from outside** (`satisfy any` + allow localhost + deny all),
  `/review/` and `/mcp/` token-gated by `lib/review/`, `/_next/static/` public.
- **AN INVALID REVIEW TOKEN RETURNS HTTP 200** with `forbidden`/`unauthorized`
  copy. **Not a leak; 200-for-denied is poor hygiene. Design's, not urgent.**
  - **STATE IT AS ORDERING, NOT AS A GREP.** *Ops grepped the body for ticker and
    table names and found none. Design read the code: `app/review/[token]/page.tsx:29`
    returns `<ReviewRefusal>` and **`getDashboardState()` is called on the line
    AFTER the guard** — so a refused token never reads the desk at all.*
    **A grep proves the body is clean TODAY; the ordering proves it CANNOT BE
    OTHERWISE.** *The grep result goes stale on the next render change. The
    ordering does not.* **Same family as *make it impossible, not visible*, applied
    to how a finding is WRITTEN rather than to how a system is built.**
  - **AND THE FIX IS NOT A ONE-LINER, WHICH IS WHY IT IS NOT ON TONIGHT'S TIP.**
    `unauthorized()` renders 401 and injects `<meta robots noindex>`, **works by
    THROWING** so it must be in the render path, and **REQUIRES
    `experimental.authInterrupts: true` in `next.config.ts` — not enabled here.**
    **Three parts, one of which turns on an EXPERIMENTAL FLAG in the build config of
    a live trading desk. Its own window and its own decision.**
  - **DESIGN RULED 401, NOT 404, and the reasoning is the point.** *The token IS
    the credential, so an invalid one is a bad credential, and `check.reason`
    already separates expired from revoked from malformed.* **404 would avoid
    confirming a token ever existed — and would defeat the instrumentability the
    fix exists for, because a monitor still could not tell a refused capability
    from a dead link.**
- **THE ONE REAL FINDING: `:80` OFFERS BASIC AUTH WITH NO HTTPS REDIRECT.**
  **His desk password base64-encoded on the wire.** **Fix instructed by this seat
  under order-and-process — it hardens transport and changes nothing about who may
  reach what** — `return 301 https://$host$request_uri`, ACME location exempted,
  **verified to still answer over `:80` AFTER the change**, in tonight's nginx
  reload. *Breaking cert renewal to fix a header would be the mirror-guard failure
  exactly.*
- **THE SECURITY GROUP IS UNREADABLE: the box is in a THIRD AWS account.**
  `magellan_admin` is `239732580473`, `management-admin` is `528131355234`, and
  **both authenticate and see ZERO instances in us-east-1.** *Ops ran the positive
  control rather than read an empty result as "no rules".* **The port evidence is
  direct measurement from outside and is the stronger fact anyway.**

**THE DOMAIN, MEASURED BY OPS 2026-09-10 AFTERNOON, `a71e535`:**

```
tmitrader.com A            -> 98.85.49.227          POINTS AT THE BOX
server_name                98-85-49-227.sslip.io tmitrader.com www.tmitrader.com
cert SANs                  all three; lineage still NAMED 98-85-49-227.sslip.io
https://tmitrader.com/     401 from nginx, no TLS error -> the cert validates
SPF (apex TXT)             0 records      ABSENT
_dmarc                     NXDOMAIN       ABSENT
MX (apex)                  0 records      ABSENT
MTA on the box             NONE
BASE_URL / APP_URL         NONE in the tree
```

- **What is SERVED and what the cert lineage is CALLED are separate questions.**
  *The lineage keeping the old sslip.io name is `101b46b` working as designed, not
  a leftover.*
- **THE MAIL SIDE IS UNSTARTED, NOT PARTIAL.** *Checked with a positive control —
  the same probes against `google.com` returned 7 TXT records, a `p=reject` DMARC
  and an MX, so the prober can see a present case.* **An empty DNS answer and a
  failed lookup are the same shape, and this desk's oldest rule arrived in a
  resolver.** **DKIM is unverifiable without a selector and moot: with no TXT and
  no MX there is nothing partially configured.**
- **THE HONEST MIDDLE: the original argument survives with its SUBJECT changed.**
  SPF/DKIM/DMARC are still not optional for magic-link mail. **What changed is that
  this is a domain we control and can publish under — so it is WORK, not an
  impossibility.**

**AND `ops.md:7562` IS STALE: "THE BLOCKING PREREQUISITE NOBODY HAS NAMED: THERE IS
NO DOMAIN".** *Scoped 09-07; `tmitrader.com` was registered by Ops 09-08 ~08:27
UTC, $16.00, expires 2027-09-08, privacy on, DNS at Route 53.* **CORRECTED BY OPS AT `a71e535`.** *Both framings this seat refused were wrong —
"no domain" and "the domain half is finished".* **The section heading was stale
too — "Google + email magic link, both from the start" is a scope he has since
contradicted. Ops marked it SUPERSEDED AND DID NOT REPLACE IT**, so the rest reads
as the 09-07 scope with a known gap rather than as current. *It did not re-scope on
this seat's say-so and did not re-scope on its own.*

**APPLE, FROM OPS — MARKED AS REASONING, NOT MEASUREMENT, AND KEPT THAT WAY.**
*Commercial is answering the same questions from Apple's current docs and **has
deliberately NOT been given these**, so two independent readings meet later. If
they disagree, the disagreement is the finding.*

- **`unique on (provider, subject)` gets STRONGER.** Apple's `sub` is stable per
  developer team and is **the only stable identifier Apple guarantees. The email is
  not** — it may be relayed and it may be withheld. **A model keyed on email breaks
  on Apple specifically.**
- **APPLE RETURNS THE EMAIL ONLY ON THE FIRST AUTHORIZATION.** *Later sign-ins omit
  email and name entirely.* **Persist it on first contact or lose it permanently**,
  recoverable only if the user revokes the app in their Apple ID settings and
  authorises again. **This is the one to confirm first: it is expensive exactly
  once.**
- **A relay address is verified and deliverable but is NOT the user's address and
  is unique per app.** So auto-linking Google to Apple by matching verified email
  **never matches for relay users. That fails safe** — no link rather than a wrong
  one — **but behaviour then varies per user, by a choice made once at signup and
  invisible afterwards.**
- **⇒ THIS IS THE CASE THAT EARNS `link-from-session, never link-on-signin`.**
  *Link-on-signin infers identity from what the provider asserts at that moment,
  and with Apple that assertion varies.* **Link-from-session asks an
  already-authenticated user, so the decision is the user's, made once, inferred
  from nothing.**
- **A relay address is NOT a durable contact address** — forwarding can be disabled
  at any time. **Never use it for billing or recovery without recording that it is
  a relay.**

### SCHEMA BACKUPS ARE NEVER PRUNED — A DISK-EXHAUSTION PATH NOBODY OWNS

**Ops, 2026-09-10, measured. It exists whether or not anyone touches retention.**

```
/var/lib/mointel/backups   4.96 GB, 11 files, v14 (08-18) .. v24 (09-05)
prune.sh                   handles RELEASES; no code path removes a schema backup
every migration            VACUUM INTO, full copy of the store, KEPT FOREVER
11 migrations in 23 days   ~one every two days
tonight's 25 -> 26         adds ~1.2 GB, the largest yet
=> ~17 GB/month against 63 GB free  ->  THREE TO FOUR MONTHS
```

- **This seat flagged the slower-migration cost and understated it.** *A bigger
  store is a slower migration, yes — and also **a permanent artefact per migration,
  sized to the store.***
- **IT IS THE MULTIPLIER ON RETENTION.** *Raising retention to 20 makes every
  future backup ~4.9 GB instead of ~1.2 GB, permanently, at one every two days.*
  **Disk stops being irrelevant immediately.**
- **ORDER: PRUNE FIRST, THEN RETENTION IS CHEAP.** Keep the 3 most recent, free
  ~3.5 GB now, growth capped rather than linear. **Then 3 → 20 costs 3.7 GB once
  and a bounded backup.** *Deleting backups is DESTRUCTIVE and his.*
- **Disk today is NOT the constraint:** 77 G total, 14 G used, **63 G available**.
  **One full session ≈ 216 MB**, measured via `dbstat` — `minute_bars` 484.32 MB +
  autoindex 155.46 MB + `idx_minute_bars_date` 77.28 MB = 717.06 MB over 3,716,494
  rows across four dates, **~202 bytes/row including indexes.**
- **`market.db` is 1,294,450,688 bytes = 1.29 GB decimal, 1.21 GiB.** *Ops pinned
  the unit against its own earlier "1.29 GB", which was ÷10⁹ said as GB. WAL
  579,201,992 bytes.*

### AND I TOLD HIM 09-04 WAS LOST TO THIS MECHANISM. IT WAS NOT.

**Ops's correction, and I had already written the sentence to him.**

> **What I wrote:** *"this desk has already lost 09-04 permanently to the same
> mechanism."*
> **What is true:** **09-04 was lost to the RETENTION DEFECT fixed in `8018b9b`,
> plus a restore taken 31 minutes before that session opened.** *The default of 3
> behaving CORRECTLY is what deletes 09-03 tonight. A BUG is what deleted 09-04.*

**Both live on the retention path, and "the desk has lost a session" is fair. "Lost
to this exact mechanism" is not** — it reads as though the working default has
already cost him one, and **it has not.**

**THE TELL: I reached for the defect to make the case.** *The question "is 3 the
right number" is legitimate on its own and needed no incident behind it.* **A true
claim joined to another true claim by a link nobody checked — fifth today, and the
first where the link was recruited to add WEIGHT rather than to explain.**

### THE RESTRICTIVE MAIL RECORDS NEED NO SENDER — MY SEQUENCING WAS HALF RIGHT

**Ops, 2026-09-10.** This seat told it not to publish SPF/DKIM because the values
come from a sender that does not exist. **Correct for the PERMISSIVE direction and
wrong for the restrictive one.**

- **`v=spf1 -all` — nothing is authorised to send as this domain. TRUE TODAY, not a
  guess.** Same for `_dmarc v=DMARC1; p=reject;` and **a null MX (`0 .`, RFC 7505).**
- **The window between registering a domain and publishing a policy is exactly when
  a domain is worth spoofing and cheapest to spoof** — and `tmitrader.com` now
  carries his product name and points at a live board.
- **THE OBLIGATION, WHICH BELONGS IN THE SAME ITEM AS CHOOSING A SENDER:** these
  must be RELAXED when one is chosen, **and forgetting means the first real mail
  fails — loudly, as a bounce, not into a spam folder.** *Failing closed is the
  right direction; it is still a real obligation and not a separate one to be
  found later.*
- **HELD, NOT INSTRUCTED.** *A DNS write on his account. His "do the needful"
  concerned enabling mail; this is locking it down, and the two are not the same
  sentence.* **Nothing written.**

### ROUTE 53 — WRITE ACCESS PROVEN WITHOUT WRITING

```
zone       tmitrader.com.  Z05508241VIT62AXLR7KN   4 records: A apex, A www, NS, SOA
profile    management-admin, account 528131355234
simulate-principal-policy against the zone ARN:
  ChangeResourceRecordSets ALLOWED · ListResourceRecordSets ALLOWED · GetHostedZone ALLOWED
```

**`simulate-principal-policy` evaluates the policy and changes nothing** — the
dry-run equivalent. **Positive control: `magellan_admin` returns zero zones,
`management-admin` lists nine.**

**AND DNS AND COMPUTE ARE IN DIFFERENT ACCOUNTS.** *The zone is in `management-admin`;
the EC2 box is in a third account neither profile can see.* **"We have AWS access"
is two different answers depending on which thing you mean.**

### The vocabulary he settled, 2026-09-10

```
ACROSS sessions, from the last relevant close
  PM Gap · RTH Gap · AH Gap · plain Gap overnight and at weekends
WITHIN this session, from its own first print       NOT BUILT
  PM Move · RTH Move · AH Move
```

- **Session open = the FIRST PRINT.** One rule, all three sessions, with the
  anchoring minute's trade count travelling beside it.
- **`Move` = price NOW versus the session open, signed.** *He chose the quantity,
  not just the word.*
- **`Gain` is REFUSED and stays free** — it already means an excursion to a HIGH
  here, and **the mover definition rests on it.**

### Queued, nothing dated, nothing blocked

- **The Move family. THREE PARTS, ONE ENUMERATION, and this seat is holding the
  deploy until all three exist.** *No reader, no board time spent on the
  invisible.*
  - **Compute — DONE, `9a090e5`, 1,914 tests pass, undeployed.** Two traps
    handled by one `bar.ts <= held` comparison: **"first" means earliest
    TIMESTAMP not first RECEIVED**, and **a corrected bar must move the anchor.**
  - **Store columns — with Ops, requested direct 2026-09-10.** Three sessions ×
    `price` / `at` / `tradeCount`. **`move` gets NO column — it is derived at
    read time from the open and the live price, and storing it would freeze a
    live comparison into a row.** Two properties asked for: **a row of NULLs must
    produce `sessionOpens: undefined`, never a populated set of nulls** (the rule
    `readBoardCandidates` already holds for `activity`), and **`tradeCount`
    nullable independently of `price`, because a zero default erases the honesty
    flag he asked for.**
  - **Surface — Design. Nothing built, deliberately: no deployed columns, no
    payload, and it will not build against a guessed shape.** Shape and
    constraints settled, `3223166`.
    - **RETRACTED: "`RTH Move` will not fit that header — 0.1px over."** *That was
      a HEADER measurement and the label is not going in the header.* **It labels
      itself inline like `PM VWAP` on line 2 of the same cell: 103.8px against
      156px available, 52px spare. No header change is needed for this family.**
    - **THE REAL CONSTRAINT IS THE TRADE COUNT.** `RTH Move +18.1% · 3 prints` is
      **168.8px, over by 12.8.** **The number cannot go on that line; a compact
      marker can**, with the count in the title.
    - **Three states, not two.** `400` = solid, no marker. `3` = thin, loud
      marker. **`null` = NOT MEASURED and gets its OWN state, never silence —
      silence is what a SOLID anchor looks like.** *Ships in the same commit as
      the family, not after it.*
- **The dark-field sweep, as a gated script**, with the exclusion list printed in
  its own output.
  - **RESEARCH'S NINE SESSION-OPEN COLUMNS: NO EXCLUSION AND NO REVIEW DATE.**
    `25bb0e1`. *Ops verified the columns are correct end to end —
    `worker/runtime.ts:1852-1860` reads from state, against the hardcoded
    `volume_base: 0` a hundred lines above at `1752`.*
    - **SUPERSEDED — THIS SEAT RECORDED A DATED EXCLUSION AND WROTE "the review
      date is the part I would not let anyone drop." THE BUILT DESIGN HAS NEITHER,
      DELIBERATELY.** *Left visible because the next seat would otherwise check the
      sweep for a review date, find none, and file a defect against the thing that
      removed the need for one.*
    - **The sweep is scoped on `updated_at` instead.** Research's proposal, Ops
      verified three hops: **`engine.ts:1962` writes `updatedAt` from a WALL CLOCK,
      not a market timestamp**, `runtime.ts:1869` carries it, `repo.ts:870`
      preserves it unconditionally on every upsert. **So a pre-migration row
      CANNOT have been asked, and a post-migration row still all-null is a real
      finding. The scope dissolves as the population turns over.**
    - **The principle survives and is satisfied harder.** *An exclusion without a
      review date is how a deliberate gap becomes permanent — that is `volume_base`
      end to end.* **A dated exclusion answers it by depending on somebody reading a
      calendar. This one cannot outlive its own condition, so there is nothing to
      read.** **Where an exclusion genuinely survives, the four fields and the
      review date stand as written.** *The instance is removed, not the rule.*
    - **AND THE FLAW OPS FOUND IN THE PROPOSAL, WHICH IS THE TRANSFERABLE HALF:
      the migration instant is recorded NOWHERE** — `SCHEMA_VERSION` moved to 26,
      no `migrated_at` — **so the boundary is derived, and the natural derivation
      returns NULL when no row has ever carried a value. `updated_at >= NULL`
      matches nothing.** Tested on production against `volume_base_through`, which
      already has the shape: **160,586 rows, 0 populated, boundary NULL, predicate
      selects 0 rows.** *The sweep would examine nothing for the one column that is
      entirely dark and report nothing.* **A NULL BOUNDARY IS AN EXPLICIT BRANCH,
      NEVER A PREDICATE — "no row has ever carried a value" is the STRONGEST
      evidence of a dark field, not the weakest.**
- **Every deploy builds on the box**, because the artefact path is refused from
  the only deploying seat. Two correct guards; behind the sweep.
- **POST-DEPLOY VERIFICATION ON THE REVIEW PAGE MUST RE-READ AFTER HYDRATION.**
  *Design, 2026-09-10.* **The page renders before its first `/api/market` poll
  lands, and in that window it shows one table and a bare `Gap`.** Design nearly
  filed that as a second defect on `8f8f5d3`. **A check run in that window
  reports a transient as a regression** — and it is the same surface every deploy
  is verified on.
- **`baselineLabel` reads a PHASE and names a BASELINE.** `referenceRthCloseBasis`
  is already on the row. Behaviour change, not a rename.
- **Coaching's desk extract stops at 09-02** and the gap grows every session.
  **He authorised ONE refresh 2026-09-10, not a cadence. Request is with Ops to
  price; Coaching reports the as-of date back here.** *`assessments` +
  `assessment_tickers` from 09-03 onward.*
- **`symbol_outcomes` ALSO stops at 09-02, and it is R&D's** — `lib/archive/`,
  `worker/archive-backfill.ts`, `npm run archive:backfill`, named in `rnd.md`.
  *Coaching flagged it as possibly nobody's job; it has an owner.*
  **CORRECTED BY R&D, `3a38969`: it is a rebuild by R&D AFTER a copy-down pull by
  Ops, not instead of one.** *This seat wrote "not a pull by Ops" and that was
  wrong.* **`archive-backfill` rolls up assessment snapshots from whatever
  `--market-db` points at BEFORE it fetches any bars.** Local `market.db` stops at
  **2026-08-18**; the 09-03 run only reached 09-02 by pointing at
  `assessments-prod-2026-09-02.db`, still the newest assessment source on this
  disk.
  - **Bars are re-fetchable from the vendor for any date. BOARD MEMBERSHIP IS
    NOT, and it is the half that gates this.**
  - **The wait has a price R&D has now put a number on:** `symbol_outcomes` /
    `symbol_desk_day` cover **08-17..09-02, 13 sessions, critical |r| = 0.553**.
    **09-03..09-09 is six more sessions → ~0.46.** *That is the difference between
    Q13's raw dispersion figure of 0.544 being invisible and being testable. It
    does not settle Q13 — the partial, 0.356, needs about 31.* **Every
    session-level question this thread asks returns an underpowered null, and the
    window closes by WAITING rather than by building.**
  - **CLOSED FREE, 2026-09-10. IT IS THE SAME PULL, NOT A SHAPED ONE.** *Coaching
    traced `worker/archive-backfill.ts` → `lib/archive/coverage.ts` from the repo
    rather than asking the stale R&D address.* The rollup reads
    `desk_assessment_tickers JOIN desk_assessments WHERE status = 'COMPLETE'` —
    **exactly the two tables already in the extract request, no third table.**
    **`npm run archive:export` copies each table's `sql` from `sqlite_master`
    verbatim and inserts `SELECT *` with explicit column names, so `id` and
    `assessment_id` SURVIVE UNCHANGED** — load-bearing, because **an extract that
    renumbered them would join to the wrong rows and answer confidently instead of
    failing.**
  - **One change, inside the boundary: the `--from 09-03` bound is DROPPED and the
    export takes everything.** Same two tables, same command, one fewer flag —
    Coaching's own original message had already offered a full re-pull, so this is
    choosing an option already on the table, not widening one. **If Ops says
    unbounded is materially more work, it goes to him rather than being argued.**
  - **HE CHOSE THE TIME HIMSELF, ASKED BY OPS: "tonight after 22:00 ET",** over
    pulling now. **His earlier "one refresh now" is SUPERSEDED by his own second
    answer — do not quote the first.**
  - **WINDOW: AFTER 02:00Z TONIGHT, AND NOT ON CAPACITY GROUNDS.** *Ops, and it
    said so plainly to stop "after the close" reading as caution.* The read is
    trivial — **307 assessments, 7,650 ticker rows, no `minute_bars`, load 0.76.**
    **It is a DATA boundary: `2026-09-10` holds 4 assessments where every complete
    date holds 19, and the last assessment of 09-09 was scheduled
    `2026-09-10T02:00:00Z` — 22:00 ET, six hours past the bell.** *"After the
    close" is the wrong boundary.*
  - **AND THE META ROW AS SPECIFIED REBUILT THE 09-02 WALL INSIDE THE FIX FOR IT.**
    *Ops's catch.* Coaching asked for `extract_as_of` plus **the max
    `trading_date` in the file.** **Pulled now, that field reads `2026-09-10` — 4
    rows of 19 — and the guard would license the exact join it was built to
    refuse.** **The newest date is always the likeliest to be partial, so `max` is
    the worst possible coverage gate.** **Ops sent `complete_through` as the gate,
    checked against n=19/date, with `max` demoted to an observation.** *08-17
    (n=2) and 08-19 (n=16) are genuinely incomplete in production.*
  - **THE EXTRACT LANDING IS NOT A BACKFILL.** Somebody still has to run
    `archive:backfill` against it. **Nobody has asked for that and no seat is to
    start it off the back of the extract approval.**
  - **NOT REQUESTED.** R&D recorded the number so it exists when someone asks.

### Where the six threads stand, re-read 2026-09-10 ~07:50 ET

- **Ops** — shipped `8f8f5d3`. *Corrected from `57e3265`, which this block still
  named here after the Production block above had already been fixed.* **Queued:
  the dark-field sweep as a gated script; the artefact/platform composition; the
  579 MB WAL.** Holds the box and the only deploy seat.
- **Design** — four commits live, **verifying they render now the sha is named.**
  Holds the Move family surface and the `baselineLabel` proxy item.
- **Research** — supply verdict live. **The Move compute is BUILT and committed at
  `9a090e5`, 1,914 tests pass — undeployed, and it has no reader.** *First print of
  the session, one rule for all three, anchoring minute's trade count travelling
  beside it; both traps handled by one `bar.ts <= held` comparison.* **Blocked on
  `ticker_session` store columns, which is Ops's file** — without them Move is
  live-only and vanishes on any path that reads from the store, the same shape as
  the sparkline reading `activity_window`.
- **Coaching** — **its desk extract stops at 09-02 and the gap grows every
  session.** It established that production has written assessments every trading
  date with no gap, so **the 09-02 wall is a stale local copy, not a hole**, and
  `symbol_outcomes` has never existed on production at all. **It has put a
  three-way choice to him: leave it, one refresh, or a standing cadence.**
- **Commercial** — idle since 09-08. Naming closed, trademark waived, **vendor
  decision not due and the risk conversation still Integration's to reopen.**
- **R&D** — **TREAT AS A STALE ADDRESS.** *Its own words, 2026-09-10: a
  long-running session asked twice to wind down.* **Standing items for this thread
  go in the repo where the next R&D seat finds them, never into its inbox.** Holds
  `lib/archive/` and `symbol_outcomes`; nothing outstanding.

**No scheduled task is armed. Nothing is watching anything.**

**ONE STALE SESSION TO CLEAR, AND IT IS WORSE THAN THIS BLOCK SAID.** Read by the
seventh session 2026-09-10 07:5x ET. `local_870499f5`, *"Mointel: 09-04 recovery
COUNT-ONLY after the close"*, is `isRunning: true` **fifteen hours** after its last
activity — **and its transcript is eight messages that end on an unreturned `Bash`
call.** *It never got past the first pre-flight ssh.*

> **THE COUNT WAS NEVER TAKEN.** The previous block recorded the count as finished
> work that could not reach a reader. **It is not finished work. There is no
> number.** *The distinction matters because "nobody has read it" invites someone
> to go and read it; "it does not exist" means the 16:05-quiet-window pass has to
> be run again.*

**Ops corroborated it independently within the hour, from the metadata rather than
the transcript:** `createdAt 21:08:19.702Z`, `lastActivityAt 21:08:25.847Z` —
**6.1 seconds of life, then fourteen hours of `isRunning: true`.** *A count-only
pass fetches 8,772 symbols in batches; Ops's own five-strata probe took seconds per
fifty.* **Six seconds cannot have reached a count, a guard, or a database.**

**AND OPS RETRACTED ITS OWN ACCOUNT OF THE EVENT.** It had reported *"it exited on
the 'no `ticker_session` rows for 09-04' guard — that was luck, not design"*, having
never seen the output. **It reasoned about what the script WOULD do and recorded it
as what it DID.** *This seat checked and reported that the sentence reached no document. **WRONG — the
search was `docs/` only.** Ops found it in the shipped source at
`worker/minute-bar-recovery.ts:99`, in the guard's own comment, live at `8f8f5d3`,
and is fixing it there.* **What survives is the
wrong-store hazard, which is true of the code either way. What does not survive is
the guard being PROVEN: it was never exercised, so its only evidence is its negative
control.** *That correction is Ops's to land in `ops.md`; flagged, not written here.*

**Same failure family as the last hop being structurally impossible — but one step
earlier, and it is the more dangerous one: a task that hangs looks exactly like a
task whose report nobody collected.** *Kill the session from the sidebar; the count
has to be retaken in a quiet window with a seat present.*


### Rulings he made this session, in his words

- **`"accept exposure. not going to pay for something i'm not sure is going to be
  used. my call. the moment we have something moving, i'll sign up."`** The
  trigger is UNDEFINED and no seat is to invent one. **The risk conversation is
  DEFERRED, not declined, and it is Integration's to reopen.**
- **`"integtation can relay my yes for production writes. yes."`** **Production
  writes ONLY** — not a `mointel-market` restart, and not payment or credential
  entry, which was never his to waive.
- **`"sort does not survive. names change too much anyway. no need for
  persistence of any kind really."`** Standing for board state. **It does NOT
  reach auth — a session cookie is not board state.**
- **The product is `TMI Trader` / `True Move Intelligence` / `tmitrader.com` /
  `"Intelligence on what's moving."`**
- **2026-09-09, on the supply bound: `"1, i prefer caution...follow suit."`**
  **Answering the NARROW sentence: the bound publishes its own verdict only on
  the POST-escalation dossier, monotone toward AVOID, never softening, under its
  own field rather than the `DIRTY_FLOAT` label, carrying share count, date and
  filing citation.** *The pre-escalation version he had approved earlier under a
  wrong description would have fired a false AVOID on **four of the seven cases
  that have ever fired** — a census, not a rate, and R&D's interval on it is 25%
  to 84%. **The verdict never needed the rate: at any rate above zero, firing
  pre-escalation is unsafe in the AVOID direction**, which is the direction that
  costs him a trade he should have taken.* **Caution and the narrow form are the
  same choice here, and that is why the reading is safe** — the narrow version
  fires strictly less often, on resolved evidence only. **Relayed to Research
  with his words verbatim and this reading flagged rather than asserted**, so the
  seat that wrote the sentence can refuse the mapping if it is wrong.
- **2026-09-09, on the trademark knock-out search: `"2, waive."`** Closed. **No
  seat commissions one**, and the name work stays closed unless he reopens it.
- **2026-09-09, on the 09-04 recovery scheduled task: `"i gave permission
  directly."`** **The task stands and fires as Ops built it.** *This seat had
  escalated the task's CLASS — an autonomous unattended production write is his
  to authorise and a peer cannot grant it, which is Ops's own rule from
  2026-09-06 — **without first reading Ops's session, where he had already
  answered.*** **The escalation was redundant and the miss is recorded below.**

- **2026-09-09, on cost allocation tags: `"yes."`** Answering a direct question
  that named the action, said it **writes to his account**, and said it **cannot
  be backdated.** **A narrow WRITE authorisation: tagging and tag activation,
  nothing else.** **Scope is mointel's own resources** — MEO and the
  containerised app belong to other projects with their own threads, and he
  answered a question about this desk. **Two payer accounts means two
  activations**, and if activation is console-only the job stops there: **that is
  a password login and the line does not move.**

### The mechanism a scheduled task solves, kept because it will recur

**Ops: *"be awake for the close is not something I can do by deciding to."***
**Neither can this seat** — every thread here wakes only on an incoming message,
so **any plan requiring somebody to be present at a named hour has nobody in
it.** *A schedule that depends on attention is not a schedule.*

**So the scheduled task is not a convenience, it is the only mechanism that runs
unattended** — and it belongs to the one class only the trader can authorise.
**That collision recurs every time work must happen at an hour nobody is awake
for**, and the standing question, NOT put to him yet: does he want to authorise
the CLASS once rather than each instance.

### AND THE MISS THIS SESSION MADE, in the same hour it trimmed his list

**Spent the morning cutting his list from five items to two on the do-not-inflate
rule — then added one back that was already settled**, because the check was
`list_scheduled_tasks` and the transcript rather than `list_scheduled_tasks` and
**the peer's own session.** **Verifying that the task was ARMED is not verifying
that it was UNAUTHORISED**, and only the second was the claim being escalated.

> **Before escalating a thread's action as unauthorised, read that thread's
> session for his answer.** He talks to threads directly and routinely — the
> Route 53 registration, Coaching today — **so "I have not seen it authorised"
> and "it is not authorised" are different sentences, and this seat published
> the second while holding evidence for only the first.**

**Same shape as the desk's oldest failure**, arriving in a permission question:
*absence of detection is not detection of absence.* **The instrument was never
pointed at the channel where the answer lives.**

### AMENDED WITHIN THE HOUR — OPS DISSOLVED THE QUESTION INSTEAD OF ANSWERING IT

**It did not seek authorisation for the mechanism. It REMOVED THE PART THAT
NEEDED AUTHORISING.** The task is now **count-only, writing nothing**, and the
write step is gone rather than deferred.

> **The thing that genuinely must happen at 16:05 is taking the count while the
> session is closed and the fetch window is quiet. That is a READ — the class he
> has already authorised twice by name. The write does not have to happen at
> 16:05; it has to happen with someone present.**

**So the unauthorised class is not minimised or deferred. It is ABSENT.** *Make
it impossible, not visible* — and it cost nothing, because count-only was always
running first. **The requirement that the count be seen before any write is now
enforced by the task's SHAPE rather than by its sequencing**, which is the
stronger version of what this seat asked for.

**And Ops checked its own record rather than accepting either reading of his
words.** It holds his direct word for the write, the relay ruling, and **two
earlier scheduled tasks approved by name**. It does **not** hold his word for
this task's mechanism, and concluded *"i gave permission directly"* most
plausibly refers to the write — **which was never the part in question.** *Where
a phrase is true of two objects, removing the object beats adjudicating the
phrase.*

**OPS'S HALF OF THE LESSON, AND IT IS THE TRANSFERABLE ONE:** *"I built an
unattended million-row production write and did not notice the mechanism was a
separate question from the action, having refused exactly that distinction when
it was read-only and someone else's. The rule I applied to you three days ago
did not occur to me when the task was mine."* **The rule you just enforced on a
peer is the one you are least likely to apply to yourself.**

**AND THE CONSEQUENCE THAT NEEDS A READER: THE COUNT WAKES NOBODY.** A scheduled
task **cannot send a message** — the transport is unavailable to unattended runs
in both directions. **So the count lands in its own session at 16:05 and nothing
notifies any seat**, and every thread here wakes only on an incoming message.
**09-04 stays unrecovered until a person looks and says so.** *Finished work that
does not arrive, with the last hop structurally impossible rather than
forgotten* — **name it in the report to him rather than leaving it to be
discovered as silence.**

- **2026-09-10, the session vocabulary: `"why not do PM Gap, RH Gap and AH Gap?"`
  then `"where it is now vs session open. use Move."`** **His scheme, and it
  matched the desk's own `PM VWAP / RTH VWAP / AH VWAP` convention on the line
  below it, unprompted.** *`RH` corrected to `RTH` for that reason.* **He chose
  the QUANTITY as well as the word: current versus the session open, signed.**
- **2026-09-10, `"yes, use Day"`, then superseded by his own Gap scheme before
  either shipped.** **`Day` never rendered on his board.**
- **2026-09-10, `"i approve deployment now for all"` then `"i want to see it now.
  do all deployments now."`** **The second overrode a hold this seat had set for
  after the close and had told him he could override in one word.** *He spent his
  own board time knowingly. The call was right and the reversal was his.*
- **2026-09-10, on cost allocation tags: `"yes."`** Narrow: tagging and
  activation, mointel's own resources, nothing else.
- **2026-09-10, on the recovery task's mechanism: `"i gave permission directly."`**


### What this session got wrong, so the next one does not repeat it

*Sixth session, 2026-09-10. Every one was caught by the thread that owned the
thing, never by this seat.*

- **EXPLAINED TOO MUCH TO HIM, ALL DAY.** His correction is at the top of LIVE
  STATE. **The reporting rule was in this charter and quoted while being broken.**
- **Handed him two trade-offs that did not exist** — *"what leaves the row"* on a
  wrong row-height figure, and *"44px frees the session-gap problem"* comparing a
  column width to a line's slack **in two different layout regimes.**
- **Told Ops a shipping change was a live verdict change.** *The worker restarts,
  and it is a verdict change* — **two true claims, an invented link, and nothing
  reads the field.**
- **Asked a thread to confirm a fact I had given it.** **A citation loop, wrong in
  both halves, carried for two days.**
- **Compared a fixed string's spare width against a variable string's worst
  case** — a floor against a ceiling. **Right conclusion, wrong reason.**
- **Over-specified an enumeration** and forced Ops to construct a sha that history
  did not contain. **A natural point existed; my sentence hid it.**

**THE PATTERN, AND IT IS ONE PATTERN:** *a true claim joined to another true claim
by a link nobody checked.* **Six instances in one session.** **What made every one
of them cheap was flagging rather than asserting** — each was refused by the seat
holding the code, in minutes.

### The standing sequence, which nothing this session changed

- **DEPLOY, THEN RESTART. Never the reverse.**
- **Gate and ship the TIP, enumerated BY THREAD at the moment of shipping.**
  Integration approves **the enumeration, not a sha** — a hash is a carried
  reading and it decayed three times in one night.
- **`git commit --only <paths>`. Never `git add -A`, and `git add <path>` first
  does NOT save you** — the commit takes the whole index.
- **Take the clock from `zoneinfo` at the moment of use.** Nine failures in three
  days, and the newest arrives as an *environment announcement* in a non-ET zone
  rather than as a misreading.
- **SCHEDULED-TASK CRON IS EVALUATED IN THIS MACHINE'S LOCAL ZONE, UTC+2, NOT ET.**
  *Ops, 2026-09-10, `a7f9694`.* **A cron written for 22:00 ET fires at 16:00 ET —
  mid-session.** **`fireAt` with an explicit offset is immune; use it.** *Ops
  caught it only because the tool echoed a time back in a zone it had not asked
  for.* **It is the first clock failure that would have run production work inside
  his session.**

  > **RETRACTED, SAME DAY, BY THIS SEAT: I called this "the tenth clock failure in
  > four days."** *I took "nine failures in three days" from the line above,
  > added one, and added a day.* **I do not know that the nine ended yesterday and
  > I never checked.** **Ops refused to carry the number and was right to** — *"I
  > have no way to verify the count from here and I am not repeating it as mine."*
  > **The UTC+2 cron fact stands; the tally was arithmetic on an undated
  > premise.**


## The third delegation: deploy instructions, confirmed directly

**Granted 2026-08-24 by the trader. Ops reported it first â€” *"deploy â€” and you can
accept deployment instructions from Integration"* â€” and this thread refused to use
it until he said it here himself. He did: one word, "confirmed."**

**Refusing the relay was the point, and it is the same rule that ran all night in
the other direction.** *A relayed delegation does not answer a question put to him
directly* held four times, at a cost of one word each. The first time that
principle would have worked in this thread's **favour** â€” a relay handing it more
authority rather than less â€” is the worst possible moment to stop applying it.
Ops's relay was accurate; that was never in doubt. What was in doubt is whether an
accurate relay is the same thing as his decision, and the whole charter says it is
not.

**And it created a deadlock in the twenty minutes between.** Ops had stopped
taking deploys to him; this thread had not started issuing them. `a259e8c` sat
gated and green with nobody able to say ship. **Exactly the shape of the WAL
signal deadlock Research and Ops nearly had earlier the same night** â€” two parties
each correctly waiting for the other, from a change of protocol neither had
finished adopting. Broken the same way: say out loud who is waiting on whom, and
put the question to the one person who can end it.

**The boundary, stated by Ops rather than negotiated, and this thread holds it
whether or not it is being watched:**

- The gate runs at **the sha that ships**. A deploy instruction names a sha, never
  a ref, and never HEAD.
- **Capture is verified at directory scope** before shipping â€” not against a file
  list, which encodes the assumption under test.
- **Spend, auth-model changes and destructive actions still go to him.** The
  delegation is deploys only.

**What it does not license: composing a deploy.** Ops shipped `c48e199` while this
thread was asking it to re-gate at `a259e8c`, and the messages crossed. That was
correct of Ops â€” it shipped the sha it was approved for, and shipping a drifted
sha is the error the gate exists to prevent. **A deploy instruction is a sha and
a moment; if either has moved, it is a new instruction and a new gate.**

## Report short. He asks for detail when he wants it

**The trader, 2026-08-24: *"make your messages smaller. if i want more context and
details i'll ask. only surface essentials. i dont need team messages pasted. just
very brief summary details."*** This is the second time volume has been raised â€”
the earlier note is under *do not ask him to arbitrate work in motion*, and it did
not change enough.

- **Never paste another thread's message.** He does not need the relay, only what
  it changed.
- **Summarise the outcome, not the working.** Shas, numbers, and what is now true.
  The reasoning is in the charters if he wants it.
- **Detail is available on request.** Withholding it is not hiding it; the repo
  and the charters hold everything, and he can ask.
- **`## What I need from you` stays last, and stays as short as the rest.**
- **HEADLINES, NOT EXPLANATIONS.** *Third and sharpest ask, 2026-08-24: "you're
  being too wordy... we need to preserve context better. give me headlines not
  explanations."* One line per fact. No reasoning unless he asks. **No quoting
  threads at all** â€” not their words, not their framing, not their self-criticism.
  He wants the state of the desk, not the conversation that produced it.
- **Context is a shared budget.** Every paragraph he did not need is context a
  later turn cannot use. Verbosity is not just a reading cost now; it shortens the
  session.

The failure this fixes is not politeness. **A long report costs him the reading as
well as the deciding**, and the decisions he actually has to make get buried in
material he did not ask for.

## A deploy instruction is a request; preflight is the authority

**Added 2026-08-24 after this thread's first use of the deploy delegation.** I
named `0778533` at 01:57:44Z with `NEXT_DAY_RECAP` due at **02:00**, having never
looked at the checkpoint schedule. **Preflight refused it and caught what I should
have.** Ops did not override, correctly.

**This thread does not compute checkpoint windows.** The schedule is dense â€” three
premarket scans, open spike, RTH intervals every thirty minutes, close, recap â€” so
any arithmetic would either block half the day or be done off a clock this charter
has already recorded going four hours stale while planning a deploy window.

So: **instructions are requests, preflight decides, and a refusal is a fact to
record rather than a decision to revisit. This thread never asks for an
override.**

### The guard is now load-bearing for a reason nobody designed

**Ops, same night, and corrected by Ops within the hour.** ~~The assessment worker
dies on startup on roughly one deploy in three.~~ **It is not one worker with a
fault â€” it is WHICHEVER WORKER LOSES THE MIGRATION SNAPSHOT RACE on startup, and
which one varies per deploy.** `SQLITE_BUSY_SNAPSHOT` at `migrate()` inside
`withMigrationLock`; seen from `desk-assessments.ts:380` and from
`research.ts:98`; exit 1, systemd restarting ten seconds later. **Four occurrences
across two workers.** The consequence is unchanged and is why the distinction
matters: **whichever one it lands on, hitting `assess` near a checkpoint is a
permanent hole.**

**Two things Ops got right that I would have got wrong.** It shipped **tonight
rather than Monday premarket**, on the reasoning that a crash costs nothing with
the recap done and `STRUCTURAL_REFRESH` eight hours out, while **at premarket the
checkpoints are minutes apart and the same crash is a permanent hole** â€” premarket
was the worse window, not the safer one, and I had offered it as the cautious
option.

**And the observable that caught it was not the one it built.** It had built a
stop-duration check, because the *last* bug was in shutdown; **this bug was one
step further along the same lifecycle.** The stop was clean â€” fourth in a row.
`NRestarts` caught it, on the first deploy where Ops checked it, having written
that intention one message earlier. **`is-active` reports "active" for a service
that crashed and came back, and neither it nor the deploy's health wait can tell
the difference.**

**Candidates, Ops's, not started:** an `IMMEDIATE` transaction for the migrating
connection, or ordering the runtime units *after* `mointel-migrate` rather than
opening concurrently. **The documented fix does not cover it:** the
cross-process lock serialises *writers*, and `BUSY_SNAPSHOT` is a *snapshot*
conflict â€” web and research reopen the store alongside, and the migrating
connection loses its snapshot. **A lock that serialises writers does not stop a
reader invalidating one.**

Tonight it crashed at 01:55:05 with a recap due at 02:00. **Five minutes,
unplanned, and on a checkpoint that is a permanent hole** â€” the record only grows
in real time.

**So the 5-minute preflight window, written for mid-checkpoint interruption, also
happens to cover a 10-second crash-and-restart its author never had in view â€” a
30Ã— margin by luck.** *And the guard measures distance in BOTH directions: it
refused Ops at "3m away" from a checkpoint that had already completed, which is
right, because a checkpoint may still be writing.* That is the inverse of this document's usual finding, where
a rule names an event that later diverges from its condition. **Ops then measured the thing I called luck, and it is a CLIFF rather than a
slope.** All four units run `Restart=always`, `StartLimitBurst=5`,
`StartLimitInterval=5min`, `RestartSec=10s` (market 15s). **Five crashes exhausts
the budget and systemd stops restarting â€” the unit stays failed until a human
looks. At ten seconds apart that is about FIFTY SECONDS, not five minutes.**

So the fault **self-heals only while it is intermittent.** If the snapshot race
recurred on each restart â€” plausible precisely when several services are cycling
together, which is the condition that causes it â€” the worker exits the loop
**dead**, and every checkpoint after that is missed until someone looks. **That is
the version with a permanent cost, and it is one systemd property away from
today's behaviour.** Nowhere near it now: `NRestarts` is 0 or 1 on every unit.

**A margin worth calling luck is worth knowing the size of, and it is 50 seconds.**

**Not fixed tonight. The call holds and the reasoning that carried it does NOT.**
*Re-stated by Ops on request, because the risk profile moved after the judgement
was made.* Its original sentence â€” *the wrong trade for a fault that self-heals* â€”
**died with its own 50-second measurement.**

**What carries it is that the trigger is transient and the restart is not
concurrent with it.** The race needs several services opening the store at once,
which happens only in the deploy's **start burst**; the ten-second restart fires
*after* that burst, when the others are up and idle. **That is why all four
occurrences were a single crash and never a loop â€” mechanism, not luck.** The
50-second cliff is real and requires a **persistent** cause; this one is
self-limiting by construction.

**My "cheap fix" was already in place and does not help.** All three runtime units
already declare `After=mointel-migrate.service`. **The race is between the runtime
units with EACH OTHER**, which that ordering does not constrain. Worth knowing
before someone reaches for it as the obvious move â€” I did.

**And the cause is sharper than "a migration path".** The upgrade transaction runs
on **every open regardless of version**: `fromVersion` is read but used only to
decide whether to take a backup, while `db.exec(SCHEMA)`, `migrate()` and the
`user_version` write execute inside `db.transaction()` **unconditionally** at
`db.ts:938-945`. So every worker startup takes a write transaction on the store;
three at once, one loses its snapshot.

**The better candidate: an early return inside the lock when
`fromVersion === SCHEMA_VERSION`** â€” an already-current store then opens with no
write transaction at all. **One real consequence, not to be waved at:** today a
table or column added *without* a `SCHEMA_VERSION` bump is silently created by
`CREATE TABLE IF NOT EXISTS` on the next open, and with an early return it would
not be. That makes a trap this desk already documents fail **loudly** instead of
quietly â€” probably an improvement, but a behaviour change rather than a no-op.

**Ops's own guard on the decision, recorded because it is the right instinct:**
*the size is not the deciding factor.* A one-line change to the path that decides
whether a migration runs is exactly what *"it is only one line"* has been wrong
about before, **and the store is the one place where being wrong is
unrecoverable.**

## A SESSION'S LIFESPAN SEPARATES A CRASH FROM A SILENCE, AND IT IS FREE

**Found 2026-09-10 by this seat and sharpened by Ops within the hour into the
usable form.** The seventh session opened the hung 09-04 task and found eight
messages ending on a `Bash` call that never returned. **The right catch, by the
expensive route.**

**Ops's version is the instrument:**

```
lastActivityAt - createdAt
  6.1 seconds, then isRunning: true for fourteen hours
```

**A task that ran for six seconds did not finish quietly. It never started.**

- **From outside, a hung session and a finished-but-unread session are identical:**
  `isRunning: true` and silence. **The flag cannot tell them apart and this seat
  reads that flag constantly.**
- **The lifespan can.** It is in the same `list_sessions` row, beside the flag, and
  **both of us read the flag and neither read the duration.**
- **The two states need opposite actions.** Unread finished work needs someone to
  go and read it. A crash needs the work re-run. **The sixth session's handover
  recorded the first and the truth was the second**, which is what sent this seat
  hunting for a number that did not exist.

**Compare the lifespan against what the task had to do.** Six seconds against an
8,772-symbol batched fetch is not a close call — it is three orders of magnitude,
and no transcript was needed to see it.

**Same family as *a tool that reports "not found" the same way it reports "none" is
not an instrument*, one level up: here the instrument was adequate and we read the
wrong field off it.** *The answer was always in the row.*

**AND THE PART THAT IS THIS SEAT'S, NOT OPS'S:** *a plausible reading reported as an
observation.* Ops wrote down what the script WOULD do against the local store as
what it DID, and **the retiring seat carried that into a handover, where it became
the reason to look in the wrong place.** **A relayed inference loses the word that
marked it as one** — which is the whole argument for FLAG, DO NOT ASSERT, arriving
from the receiving end for once.

## A STAMP IN THE FILENAME DID NOT TRAVEL; A STAMP IN THE DATA DOES

**Coaching's strengthening of a condition this seat set, 2026-09-10.** I said the
refreshed desk extract must record its as-of date **in the file**. Coaching asked
Ops for a **`meta` row** — `extract_as_of` plus the max `trading_date` — instead.

**The reason is that the 09-02 wall was ALREADY in the filename.** It read
`assessments-prod-2026-09-02.db`, Coaching typed that name repeatedly, **and still
read the store's zero as a fact about the desk rather than a fact about the copy.**

- **A filename does not travel into a query result. A meta row does.**
- With it, the coverage window prints beside every answer, and **a question falling
  outside it is REFUSED rather than answered wrongly.**
- **Coaching also asked for the filename to COLLIDE with the old one rather than be
  self-describing**, so the check cannot be skipped by reading the name.

**This is *make it impossible, not visible* applied to provenance**, and it is the
sharper version of the desk's own rule that a stored value carries its basis: the
basis has to be in the same object the reader reads, **not in the container it
arrived in.**

**And the correction ran the right way.** I set the condition, the thread that
would suffer the failure improved it, and it told me why rather than just doing it.

## I SEARCHED `docs/` AND REPORTED THAT THE FALSE SENTENCE HAD REACHED NO DOCUMENT

**2026-09-10. Ops found it in the shipped source an hour after I closed the
question.** Ops had retracted its own account of the hung 09-04 task — *"it exited
on the 'no `ticker_session` rows' guard, which was luck"* — of an event that lasted
**6.1 seconds** and reached no guard, no count and no database.

**I went looking for where that sentence had propagated, found nothing, and said
so.** *I grepped `docs/`.* **The sentence was in `worker/minute-bar-recovery.ts:99`,
inside the guard's own comment, live on the box at `8f8f5d3`** — and it is the
load-bearing justification for the guard sitting directly beneath it, **in the file
most likely to be read by whoever next runs a recovery.**

- **A CODE COMMENT IS A DOCUMENT AND IT IS THE ONE WITH THE NARROWEST, MOST
  MOTIVATED READERSHIP.** *The next person to run that script reads it; nobody
  reads `docs/threads/` before running a script.*
- **"It reached no document" was a claim about the repo and I checked one
  directory.** The right scope for a retraction is **every artefact that asserts
  the event**, and source files assert events constantly — in comments, in test
  names, in error strings.
- **The reassuring answer suppressed the second look.** *"Good, it never got out"*
  is the finding you stop searching after. **Had the grep found something, I would
  have widened it.**

**This is the desk's oldest failure — absence of detection is not detection of
absence — committed inside the very rule that exists to catch it,** *a retraction
only reaches the sentence it edits.* **I applied the rule and then under-scoped the
search it depends on, which is worse than not applying it: it produced a written
all-clear.**

**THE FIX IS THE SCOPE, NOT THE DILIGENCE.** A retraction search is
`grep -rn` across **source, tests and docs**, and the ONE thing that must never be
searched alone is the directory the retraction was written in.

## A RELAYED SENTENCE CARRIES THE WORDS AND NOT THE CONDITIONS THEY WERE TRUE UNDER

**Ops's formulation, 2026-09-10, and it is the sharpest thing this desk has said
about relaying.** He answered Coaching's three-way extract question with **"one
refresh now, and kill the session."** I carried that verbatim. **Ops asked him
anyway and he changed it to "tonight after 22:00 ET".**

**I was right about the object and Ops was right to ask, and those are not in
tension.**

- **My correction stands:** his direct answer carried is not the production-write
  delegation widened. It is the same shape as Ops taking *"deploy"* from him
  through this seat and then confirming it. **Ops accepted that read.**
- **AND THE VERBATIM RELAY WAS STILL WRONG, ABOUT THE `now`.** Pulling at 08:15
  hands Coaching a `2026-09-10` holding **4 assessments of 19** — *the partial-tail
  failure, delivered inside the fix built for it.*
- **He was correct about the WHAT and wrong about the WHEN, and only a fresh look
  at the data could show that.** He answered from his picture of the desk; the
  desk had a condition his picture did not carry.

**THIS IS NOT "VERIFY, DO NOT RELAY", AND IT IS NARROWER AND MORE USEFUL.** That
rule is about whether the sentence is accurate. **This one is about the sentence
being accurate and the world having a fact it does not mention.** *An instruction
is true under conditions, the conditions are not in the words, and the relay
carries only the words.*

**WHAT IT CHANGES FOR THIS SEAT, WHICH IS THE ONLY SEAT THAT RELAYS:**

- **When his answer contains a WHEN — "now", "today", "after the close" — the
  receiving thread checks the data before acting on the timing.** *He is choosing
  from a picture, not from a query.*
- **Say so in the relay.** *"His words; check the conditions before you act on the
  timing"* costs one line and is what makes the check happen rather than the
  instruction being executed as written.
- **This does not license a thread to reinterpret him.** Ops did not decide the
  timing was wrong — **it asked him, and he chose again.**

## A STANDING AUTHORISATION PLUS A DESTRUCTIVE DEFAULT IS FOUND BY THE SEAT THAT WAS NOT WARNED

**Ops, 2026-09-10, flagged before the value it concerns even exists.** He authorised
one Search Console TXT record at the apex of `tmitrader.com`, and this seat recorded
the authorisation as **standing** — so a future seat writes it without returning to
anyone. **That was correct and it is exactly what makes the hazard reachable.**

**THE MECHANISM:** Route 53 groups records by `(name, type)`. **Every apex TXT value
lives in ONE record set.** `ChangeResourceRecordSets` with `UPSERT` on `TXT` at the
apex **replaces the whole set.** So the Search Console token and any future SPF
record share one object, and **writing SPF later as a fresh UPSERT silently deletes
the verification** — *the one thing Google's own page says must never be removed.*

**THE EXECUTION RULE: read the existing set, append, UPSERT the union. Never a bare
UPSERT.** *And say so in the result, so the next seat sees the shape rather than
being told the rule.*

**THE TRANSFERABLE HALF, AND IT IS OPS'S:** **a hazard behind a standing
authorisation is not found by the seat that was warned. It is found by the one that
was not.** *A standing yes removes the conversation in which a warning would have
been repeated — which is the point of it, and the cost of it.*

- **So a standing authorisation obliges this seat to write the hazard DOWN**, not to
  relay it. **A warning that lives in a message dies with the session.**
- **Same shape as the false sentence in `minute-bar-recovery.ts`:** *the artefact
  the next actor actually reads is the only place a caution survives.*

## THREE INSTRUMENTS IN ONE DAY THAT COULD NOT PRODUCE THE FAILING ANSWER

**2026-09-10. Found by three different seats, none of them looking for a pattern.**

```
isRunning: true          on a session that lived 6.1 seconds
                         a status field with no path to "died"
max(trading_date)        as a coverage gate, on a partial newest date
                         the newest date is ALWAYS the likeliest to be partial
feed_health.connection   read from a STORED row a dead worker leaves behind
                         it cannot show DISCONNECTED
```

**Each returns a plausible answer. None can return the one that matters.** *And each
was believed by a competent seat until somebody read the mechanism rather than the
value.*

- **THE SHARED FIX: read the thing that would GO SILENT, not the thing that would GO
  STALE.** *A worker's own log stops. A stored health row does not. A session's
  lifespan is arithmetic on two timestamps; its running flag is a claim.*
- **THE TELL IS ALWAYS THE SAME QUESTION: could this check have produced the failing
  answer, ever?** *Not "is this value right" — "is this instrument capable of being
  wrong in the direction I care about."*
- **This is the desk's oldest rule, `absence of detection is not detection of
  absence`, and it arrived three times in one day in three different shapes**: a
  process supervisor, a SQL aggregate, and a health endpoint. **The rule was known;
  the instruments were not audited against it.**

**AND THE REASON THEY SURVIVE: each is the REASSURING answer.** *"Still running",
"coverage through today", "connected".* **A check that cannot fail also never
interrupts anyone, which is exactly why nobody re-reads it.**

## A SEAT ESCALATING DIRECTLY TELLS THIS SEAT IT HAS DONE SO

**2026-09-10. He was asked the same class question twice within the hour, by Ops and
by this seat, neither knowing the other was asking.**

**Ops proposed the rule as "when a class question is already in flight from another
seat, the second seat waits." That is the wrong rule and it was generous to
this seat.**

- **Ops could not wait for something it did not know existed.** *It escalated
  directly, which is correct and which he encourages — he talks to threads
  routinely.*
- **A rule that says WAIT makes every seat dependent on this one being awake**,
  which is the failure this desk keeps finding in every other form.
- **⇒ THE RULE IS NOTIFY, NOT WAIT. One line to this seat, before or after, never
  instead.** *It does not route the escalation through here and it slows nothing.*

**WHY IT IS THIS SEAT'S PROBLEM RATHER THAN A COURTESY:** the charter requires **not
inflating what is pending on him**, and today this seat could not have known whether
it was. **You cannot keep a list short while blind to half the additions.**

## EVERY COMMIT HAS THE SAME AUTHOR — THE CHARTER FILE IS THE ONLY DISCRIMINATOR

**Ops, 2026-09-10, after this seat corrected a misattributed pin.** Ops labelled
`c8b5168` as Commercial's because **its subject line carries Commercial's finding.**
*The subject was Commercial's; the commit was Integration's — 24 insertions,
`docs/threads/integration.md` and nothing else.*

**AND IT IS STRUCTURAL, NOT CARELESSNESS.** *`git log --format=%an` cannot separate
the threads at all — six seats, one author.* **The charter file a commit touches is
the only discriminator this repo has.**

- **So "which thread made this" is answered by `--name-only`, never by the author
  and never by the subject.** *A subject line records what a commit is ABOUT, and on
  this desk that is routinely another thread's finding.*
- **This seat used the discriminator and Ops used the subject**, which is why the
  correction went that way rather than the other. **Neither of us was reading
  carelessly; one of us was reading a field that carries the answer.**
- **A misattributed sha is a carried reading and it gets quoted.** *Same family as
  naming a sha at all: the label decays faster than the hash.*

## THE TWO INSTRUMENTS DISAGREED, AND THAT NARROWED THE DEFECT FOR FREE

**Ops, 2026-09-10, on the hung 09-04 task.**

```
scheduler       mointel-0904-bar-recovery   enabled: false   CORRECT -- it fired and finished
list_sessions   local_870499f5              isRunning: true  WRONG  -- it died after 6.1s
```

**A finished task with a correct flag, beside a dead session with a live flag.**
**⇒ The defect is in SESSION state, not in the scheduler.**

**THE POINT IS THE METHOD, NOT THE LOCATION.** *Two instruments over one event, one
of them right, is a positive control nobody had to construct* — **and it converts
"one of these is broken" into "this one is broken", at no cost, from data already on
hand.**

*This desk keeps building positive controls deliberately. This one was free and was
nearly walked past.*

## Reading other threads

Other local sessions are readable directly — listing them, and full-text search
across their transcripts. Use it to answer *what was already decided* rather
than asking the trader to relay.

Two limits worth respecting. It shows what was **recorded**, not what a session
is currently reasoning about, and it is a snapshot rather than a feed. **The
repo remains the real channel** — a decision that only exists in a transcript is
not a decision any other thread can act on. When something is settled in a chat,
it belongs in a charter the same day.

## The shared working tree

All threads operate on `A:\mointel`. That is a genuine hazard and the rules are
proportionate rather than absolute, because there is one operator and truly
concurrent building is rare.

1. **Never `git add -A` or `git add .`** Stage by explicit path, always. This is
   the single rule that would have prevented every incident so far.
2. **One thread holds uncommitted code at a time.** A thread starting code work
   commits or stashes before handing back. Docs edits by different threads are
   fine concurrently; they rarely collide and never break a build.
3. **Deploys are safe regardless.** `push-release.sh` ships a committed sha via
   `git archive`, so another thread's uncommitted work cannot reach production.
   Verified. The risk is to *gates*, not to the server — `npm test` against a
   half-edited `package.json` is the failure to worry about.
4. **A git worktree when two threads genuinely must build at once.** It is the
   robust answer and it is not free: a worktree needs its own `node_modules`.
   Reach for it when rule 2 becomes the bottleneck, not before.

5. **`git stash` is not safe on this tree, and a stat line is not a review.**
   Added 2026-08-23 after a stash push/pop round trip over two doc paths
   silently dropped **264 lines of already-committed content belonging to three
   threads** — the R&D register's own rows, a section gating Q1's verdict, and
   two handovers from Design. It was committed without the file being re-read,
   caught afterwards, and recovered whole from the stash object.

   Two rules out of one incident. **Do not `git stash` to test whether a failure
   predates your edits** — commit to a scratch branch, or copy the files aside.
   A stash round trip on a tree several threads write to can return less than it
   took. And **read the diff, not the stat line, before committing a shared
   document.** `264 deletions, 50 insertions` was on screen and was the whole
   warning; a deletion count larger than the work you did is the signal.

   This one is cheap to obey and the incident that produced it was recoverable
   only by luck of `pop` leaving the object behind.

## Open items

**1. `docs/ARCHITECTURE.md` §4 is stale, and part of it is still being cited as
authority.** *Handed over from Design, 2026-08-23.*

[`../ARCHITECTURE.md:207`](../ARCHITECTURE.md:207), under "Deliberate non-goals
in this milestone", lists as out of scope: *OpenAI analysis, automated SEC
research, IR/newswire scraping, Dirty Float reclassification, overhang
absorption conclusions, Effective Float Turnover, automated Chop/Flush Risk,*
and more.

The first two are **shipped**. The 2026-08-21 UI audit observed OpenAI-backed
interpretation and automated SEC research running live in production — EDGAR
links, accession numbers, the `STRUCTURAL INTELLIGENCE — AUTOMATIC` card.

Why it matters beyond tidiness: the same sentence carries the only written
answer to audit §11 item 3 — whether Chop Risk, Flush Risk, Overhang Absorption
and Effective Float Turnover are wanted. That written default is "no", and it may
well still be right, but it now sits in a paragraph proven stale in part, so it
cannot be cited on its own. Design has flagged this rather than editing a shared
document; the fix is either to date-scope the section to the milestone it
described or to split the still-true entries out of it.

## A queued-message receipt is a reading of the recipient, not a delivery note

**The trader's correction, 2026-08-24, two words: "ops is not idle."** I had
closed a report with *"all four threads are idle"*. Ops was mid-turn, and **the
evidence was in my own tool results, twice.**

`SendMessage` had answered both of my last sends with *"Message queued for session
… it will be processed after the in-flight turn finishes."* **That sentence is a
live-state reading of the recipient.** I read it as a delivery receipt — did the
message go? yes — and discarded the half that said the receiver was busy. Then I
described that receiver as idle, in the same reply.

**This is worse than the stale-clock instances above it**, and differently shaped.
Those were readings that were true when taken and aged. This one **was never
taken**: the fact arrived unasked, in the return value of an action I had chosen
to perform, and I did not treat it as an observation at all because I was not
looking for one. **A tool result answers the question you asked and often one you
did not.**

Two practices out of it:

- **`isRunning` is a claim about now and costs one call.** Never assert a thread's
  state from the last thing it said. `list_sessions` at the moment of reporting,
  or do not report it. *"Nothing outstanding from Design as of 01:59Z"* is
  cheap and cannot mislead; *"all four are idle"* is a claim about four
  processes.
- **Read the whole tool result, including the part that is not the answer.**
  "Sent" and "queued behind an in-flight turn" are different outcomes, and the
  difference is the exact fact I then got wrong.

**And a queued send is itself a small hazard worth knowing:** a message that lands
mid-turn arrives after the recipient has already acted, which is how three
crossed-message pairs happened tonight — the deploy that crossed a re-gate
request, the deadlock retraction that crossed its own escalation, and Design's
check-4 correction crossing mine.

## Observations go stale; this thread reports them anyway

**Added 2026-08-23 after the third instance, which finally named the shared
cause.** The section below is about attributing a file to a thread. It is a
special case of something broader:

1. `rnd.md` reported as held by R&D — three times, twice after the rule below
   existed. R&D said outright that something was "reading a stale snapshot".
2. `design-audit-report.md` §11 listed as carrying a retracted claim. It never
   did; the reading was of a document as it had been described, not as it was.
3. **"It is 11:47 ET"**, quoted to two threads while planning a deploy window.
   It had been 11:47 ET when the clock was read. By the time it was quoted the
   real time was 15:31 ET — nearly four hours stale. Ops caught it, and noted
   that it made the window *wider* than described so nothing was lost. **The
   checkpoint arithmetic depends on that number.** Deploy preflight refuses
   within five minutes of a checkpoint; a stale clock is exactly how a thread
   talks itself into a window that has closed.

The common failure is not carelessness about any one fact. It is that **this
thread's whole job is reading state and telling other threads about it**, and
the reading and the telling are separated by minutes or hours of other work.
Every observation it relays is a snapshot presented as a present tense.

So: **re-read anything time-sensitive at the moment of reporting it, or stamp
it.** A clock, a `git status`, a session list, a deploy state. "As of 11:47
ET" costs three words and cannot mislead; "it is 11:47 ET" is a claim about
now that was true once. When it is cheap, re-read. When it is not, stamp it.

## `git status` does not say who

**Added 2026-08-23 after this thread got it wrong twice.** I reported
`docs/threads/rnd.md` as "held by R&D since 04:45" on two separate occasions.
It was not R&D's work. The uncommitted content was **Design's Q6/Q7 handover**,
written into R&D's charter exactly as the handoff rule requires, and R&D
committed it as Design's in `11f7632`. R&D nearly went looking for work it had
already done.

The inference was: `rnd.md` is modified, `rnd.md` is R&D's charter, therefore
R&D is holding it. **Every step is true except the conclusion.** `git status`
reports that a path changed. It does not report which session changed it, and
no local git command does.

This is not a stray mistake, it is **created by our own handoff rule**. "A
thread that finds work belonging to another writes it into that charter's Open
items" means charters are routinely edited by threads that do not own them. So
a modified charter is *weak* evidence about its owner and often points at
someone else entirely.

What to do instead, in order of cost: **ask the thread**, which is one message
and always correct; read the content of the diff, since a handover reads
nothing like an owner's own work; or say "`rnd.md` is modified" and stop,
rather than naming a holder. Never report a holder from `git status` alone.

**I wrote that rule and then broke it again within the hour.** R&D has now
reported this three times. The third was after this section existed — I told it
"you are holding both" while looking at a `git status` line, which is the exact
sentence this section forbids. A rule the author does not follow is worse than
no rule, because it looks like the problem is handled.

So the rule is now absolute rather than conditional: **this thread does not
report who holds a file. Ever.** Not "appears to be holding", not "modified
since 04:45". If a thread needs to know a path is dirty, name the path. If
ownership actually matters, ask. Three round trips have been spent on this and
every one was avoidable by deleting four words from a sentence.

## Numbers from two threads need a unit, not a caveat

**Added 2026-08-23, after the strongest claim either analysis thread made today
was produced by combining two figures that were not the same unit.**

Research measured field instability as *tickers returning more than one value
across four draws* — 3 of 6 for structure. R&D held a *pairwise churn rate*
between consecutive stored observations — 52%. Read "3 of 6" as 50% and the
two look directly comparable, the floor nearly equals the churn, and the
conclusion writes itself: structure transitions carry essentially no
information. Computed pairwise the floor is 25%, and the claim evaporates.

**This thread relayed that claim onward before it was checked**, which is how a
unit error becomes three threads' problem.

Earlier the same day, the *same two threads' numbers* were nearly quoted
against each other and the fix applied was a caveat — "these answer different
questions, do not treat as competing estimates". **That caveat was true and it
did not work**, because it warned against comparison while leaving both numbers
bare, and the next person did arithmetic on them instead.

So: **a number crossing a thread boundary carries its unit in the same sentence
as the number** — denominator, and what one observation is. "3 of 6 tickers,
across four draws" cannot be silently read as 50% of anything. A caveat tells
someone not to combine two figures; a unit makes the wrong combination visible
when they try.

**And an exact agreement between two independently derived numbers is a
prompt to check the units, not a confirmation.** 50% against 52%, on six names,
was too good and that was the signal.

## The slice you measured is not the population you are claiming about

**Named by Ops on 2026-08-23 after the fourth instance, and the first to reach
another thread's document.** Distinct from the section below: that one is about
a rule whose terms diverge over *time*. This is about a claim generalised from
the *sample that happened to be in front of you*.

- **Ops:** *"claiming is immediate, nought to two minutes"* — measured on **recap
  jobs alone**. Across all 954 jobs that ever started: p50 8s, p90 266s, p99
  1253s, max 2576s. 276 over a minute, 82 over five. At `POLL_MS` 5000, "a few
  poll intervals" **would have fired on 29% of normal work.**
- **Integration:** the routing instruction — correct for my own outbound sends,
  shipped as true of all sends, and wrong for every thread receiving it.
- **Integration:** *"a monitor would never notice a dead review link"* — true of
  the page Ops had tested, false of the API, and I claimed it of the capability.
- **Integration:** *"one bad line, not a pattern"* — I searched `worker/` for
  recursive deletes, found one, and concluded about a class I had not searched.

**The tell is that the measurement was real.** Every one of these was a true
number from a genuine check — which is why none felt like a guess, and why
review does not catch them. The question is never *did I measure it* but
**what was I measuring, and is that the thing I am about to say?**

**Put this first if the section is ever read as a checklist.** *Ops's ordering,
and it is right.* The instinct on being caught is to **withdraw the whole
claim** — which is cheap, looks rigorous, and throws away a correct detector
along with its wrong reasoning. **Re-deriving is more work and is the only way
to find out which half was wrong.**

**Ops's repair is the worked example.** The stall rule survives, but
the load-bearing part turned out to be the **conjunct, not the timer**: a
legitimately slow worker has `activeCount > 0`, which `activeCount == 0` already
excludes. So the timer goes in minutes and generously and the conjunct does the
discriminating. A bad justification does not always mean a bad rule — but you
only find that out by re-deriving it rather than defending it.

**What Ops refused to claim is the other half.** `activeCount` has no history —
*that absence is the whole problem* — so the false-positive rate of the
**conjunction** is unmeasured; only the timer alone was ever tested. So it
**ships in shadow and is compared before it pages anyone.**

**Broader than I first wrote it, per Ops.** Shadow-first is not only for
detectors whose error rate cannot be established beforehand. It is for **any
check whose false-positive cost is paid by a human under pressure.** The flaky
`releaseBootstrap` test had a perfectly measurable failure rate and still should
not have been trusted mid-incident — because **the cost is not the wrong answer,
it is the operator learning to re-run until green.** That cost is behavioural
and it is paid once and kept.

### For "nothing changed", diff at directory scope — never a curated list

**Fifth instance, and Ops found it by turning the tell above on this desk's most
load-bearing claim rather than agreeing with it.** *"The ingestion path is
byte-identical to production"* — the sentence that retired the two-candidate-
causes risk before Monday — was measured over a **hand-picked file list**. The
list omitted `lib/market/config.ts`, which `worker/alpaca.ts` imports at line 11
and calls at line 17. **A file the market worker loads sat outside a measurement
behind a claim about what the market worker runs.**

**A curated list encodes the assumption under test** — that you already know
what is in the path — so it cannot fail in the one way that matters. Diff the
directory.

The conclusion survived, on two grounds neither of which was the one given: the
`config.ts` change is purely additive, zero removed lines and a new unreferenced
export; and the worker does not restart, so it runs `fd9556f` whatever ships.
And the claim Monday actually rests on **was** measured properly — `git diff
80437c3 fd9556f` over `lib/market` and `worker/` is empty **at directory
scope**.

It fits the tell exactly: the diff was true, the files were right, the output
was genuinely empty. **What was measured was "these eight paths did not
change". What was said was "the ingestion path did not change".**

## A rule that cannot tell two cases apart

**Named by Ops on 2026-08-23, after it happened three times in one evening.**
The section below is about a *check* reading the wrong field. This is the same
failure one level up, in the **rule** rather than the measurement, and it is
harder to see because the rule reads perfectly sensibly:

- **"Issue long, revoke on report of done."** Design reported done *for
  tonight*. The rule could not tell that from *done*, and following it would
  have destroyed the premarket verification the token was issued for.
- **"Twelve hours"** for a review session. A sensible number that did not know
  `PREMARKET_START_MIN` existed, and expired four minutes before the window it
  was issued for.
- **"Check the link returns 200."** A dead link returns 200 too.

Each is defensible written down and each collapses two cases the writer never
had side by side. **The tell is that the rule names an event — "done",
"twelve hours", "200" — rather than the condition the event was standing in
for.** Ops's correction shows the repair: *revoke when the work the session was
issued for is finished, not when somebody reports finishing a sitting of it —
and if the two ever look the same, the session stays.* The rule now names the
condition and states which way to fail.

**The constructive form, which is Ops's too: prove the check can fail.** It
mutation-tested the releaseBootstrap fix by reverting the comparison to confirm
two tests went red. Design reached the same principle from the other side and
applied it against its own work — refusing to count a label verified because at
`CLOSED` phase the fixed and unfixed code render identically, so no observation
of that button could have come out badly. **"A check that cannot fail isn't a
check."**

**Ops's refinement, which turns a habit into a question with an answer.** All of
these share something past the event-for-condition swap: **the substituted name
was correct at the moment it was written.** Twelve hours was a fine number at
15:56. Revoke-on-report was fine while there was one sitting.
Monday-after-the-close is fine if bars flow. **The name only diverges from the
condition later** — which is why none looked wrong when written, and why review
does not catch them: at review time they are still true.

So the prompt is not *"did I name a condition or an event"*, which is a habit
that will lapse. It is:

> **When do these two come apart, and what happens then?**

That is asked once and has an answer, and the answer belongs beside the rule.

**It applies to plans, and a plan is worse than a test** — a test that cannot
fail at least runs and reports green, while a plan that cannot fail waits to be
executed by someone who was not there when it was written. Ops checked its own
charter and found two, both **pending rather than history** (`b6125a2`):

- *"Restart the market worker Monday, after the close."* The condition is *once
  bars have flowed and no session is live*. **If bars do not flow, "after the
  close" still arrives** — and the rule would restart away the only live
  process carrying the failure, at the moment it is the evidence.
- *"Sample the WAL Monday premarket."* What makes it mean anything is
  contention between writers and dashboard polling, not the hour. On a thin
  premarket a flat WAL says what Saturday said: nothing. Now stated as sustained
  write load with the write rate recorded beside the size, **so a sample that
  proves nothing is recognisable as one.**

For this thread: most of the rules in this document were written today, and each
is owed that question.

## Name the outcomes you accept, never the ones you reject

**Research, 2026-08-23, after the same fabrication happened twice.** Its replay
guard was a **denylist**. `interpretTicker` attaches the last accepted dossier
on `UNAVAILABLE`, on `REUSED_UNCHANGED`, **and on `FAILED`** — three separate
kindnesses, each correct for a live desk. Research guarded two after the first
fabricated result. The failing model call walked through the third and reported
a stored dossier as a re-derivation, with `tokens in=0` again the only tell.

It is now an allowlist: `ACCEPTED` or `PARTIAL`, everything else throws with the
provider error attached, plus a check that an interpretation which spent no
tokens did not happen. **The allowlist caught an empty OpenAI balance on its
first run instead of inventing a dossier.**

**A denylist has to be complete, and only the callee knows whether it is.** The
same bug in a different costume appeared earlier the same day: `!== null`
admitted every legacy row in `hasUsableSource`, because an absent key
deserialises to `undefined` rather than `null`. Both are a guard enumerating
what to refuse, against a producer free to invent a new thing to return.

**A third costume, and it is not a data guard at all.** `worker/research.ts:193`
installs `process.on('SIGTERM', () => clearInterval(heartbeat))` and then loops
forever. **Installing a SIGTERM listener overrides Node's default action, which
is to terminate** — so the handler added to tidy up is exactly what removed the
exit. The research worker has been **SIGKILLed on every deploy today**, three
for three, thirty seconds of `stop-sigterm` timeout each. `worker/alpaca.ts`
handles SIGTERM and exits. `worker/desk-assessments.ts` stops cleanly **because
nobody improved it.**

So: **a partial handler is worse than none.** Same rule — it enumerated one
thing to do on the way out and inherited responsibility for all of them. The
cost is not the thirty seconds: a SIGKILL mid-job abandons an in-flight model
call with tokens spent and nothing recorded, and can leave a claimed row with no
process behind it. Fixed by Research at `97f198d`, one line, mirroring
`alpaca.ts`.

**The ten QUEUED rows: what is dead, what is established, what is open.** *Two
mechanisms have now been proposed and both died on the same rows. This section
has recorded each as a finding in turn, so it is rewritten to hold the **state of
the question** rather than a third answer — a paragraph naming the current best
guess needs replacing every time the guess moves, and reads as settled in
between.*

**Dead — a SIGKILL orphan.** All ten carry `started_at` NULL and `retry_count` 0,
so none was ever claimed; `requeueJobForRetry` only touches rows that were
mid-flight. Disproved by Research. The signal-handler bug was real and is fixed
at `97f198d`; it just does not produce these.

**Dead — "queued for a finished date, so never claimable".** Disproved by Ops
against the snapshot, read-only:

| recap for | queued | started | stranded |
| --- | ---: | ---: | ---: |
| 2026-08-17 | 8 | 6 | 2 |
| 2026-08-18 | 10 | **10** | 0 |
| 2026-08-21 | 8 | 0 | **8** |

Sixteen of twenty-six ran and one recap claimed ten of ten, so nothing is
structurally unclaimable. **It is intermittent and concentrated on two dates.**

**Established, and it is the operational part: these will NOT clear on Monday.**
Every recap job that started did so **within nought to two minutes of being
queued** — claiming is immediate. So the ten were passed over at the time; they
are not waiting for a session to come round. The phrase *"queued for a finished
date"* invites exactly that wait, and both Ops and I nearly took it.

**Established: stranding is confined to this one checkpoint.** Of the 938 jobs
queued at every other hour, **zero** were ever left unstarted.

**Established, weakly: the cost is a refresh rather than coverage.** The only
historically checkable pair, CRGO and MYSZ stranded from the 17th, each already
carried two analyses that same day. n=2 — evidence, not proof. It puts the size
nearer *ten stale rows* than *a checkpoint silently dropping its work*, which
were the two sizes in question.

**Dead — "the trading date rolls before they can be claimed".** Killed by
Research, its own. The jobs sat claimable for **23 hours**: queued
2026-08-22T02:00:06 for trading date 08-21, and the next date first appears
2026-08-23T01:27:38. An 18-hour window on the 18th left 2 of 8 stranded anyway.
There is no race. **Three mechanisms proposed today, three disproved, each by
someone other than the one who most wanted it to be true — and the third by its
own author.**

**Established — the worker did not lose a race, it stopped.** It *queued* those
eight at 02:00:06, so it was alive at that instant. In the ninety minutes
around it: 0 started, 0 completed, 0 failed. Its last analysis was three and a
half hours earlier, and it stayed silent 23 hours until a restart.

**Established — and this kills the empty-balance candidate.** On the 18th: 10
started, 10 completed, **4 failed on HTTP 429**. A failing worker still claims,
because claiming precedes the model call. So a dry balance cannot produce
nought-of-eight.

**A certain defect, whatever caused this.** Two network calls in the worker loop
have **no timeout at all** — `lib/data/providers/googleSheets.ts` (no timeout,
no `AbortSignal`) and `lib/research/sec/client.ts`. `openaiInterpreter` at 300s
is the only bounded one. **`loadSheetPriors()` runs at the top of every pass,
before `claimQueuedJobs`** — so an unbounded fetch there hangs the loop with no
error and no heartbeat failure: the process stays up, health keeps its last
state, and nothing is claimed. That is the observed signature exactly. Research
**does not assert it as the cause** and is right not to.

**The observability gap that cost three threads an evening.** The heartbeat is
an independent `setInterval` and survives a blocked loop, so it is **not
diagnostic**. And `research_health` is a **single overwritten row with no
history** — there is no way to ask what the worker was doing at a past instant.
That absence is why every hypothesis tonight was reasoned from job timestamps,
and why three of them could be argued at all.

**Open: why did one recap claim ten of ten and another nought of eight?** Narrowed to: **why did the worker stop?** The
empty-balance candidate is dead. The unbounded fetch is the standing candidate
and is unfalsifiable from what is stored, because nothing recorded what the
worker was doing.

This sits beside the two rules below rather than replacing them. "A check that
cannot fail isn't a check" is about whether an observation can come out badly;
"check the field that carries the answer" is about reading the right one.
**This one is about the shape of the guard**, and it is the only one of the
three that is mechanical: an allowlist fails closed against futures nobody has
thought of, and a denylist cannot.

## A deploy changes what will run, not what is running

**Twice in one day, in two layers, and the second was caught before it cost an
investigation.**

- **The release drift.** `mointel-market` had `WorkingDirectory=/opt/mointel/current`,
  which is correct — but Linux resolves the symlink at **process start**, so the
  worker's cwd had been a specific release directory since Friday and had
  survived two deploys. It was running `80437c3`'s code while everything else
  was on `fd9556f`.
- **The SIGTERM handler.** `97f198d` makes the research worker exit on SIGTERM
  instead of ignoring it. But the process being stopped by that deploy was
  started from the *old* code and holds the *old* handler in memory. **So the
  deploy that ships the fix will SIGKILL one last time**, identically to the
  three before it.

Research predicted the second **before the deploy**, unprompted, because a
fourth identical failure would have read as the fix failing and cost Ops an
investigation.

**The general form: a fix concerning startup or shutdown cannot be demonstrated
by the process that carries it in.** The process that must show the fix works is
by definition not the one shipping it. So the test is always the run *after* —
and if a rollout is judged on the deploy that installs it, it will be judged on
the last instance of the old behaviour.

## ~~The one check that CAN fail~~ — it would have failed for the wrong reason

**Written as a triumph at `f498926`, retracted within the hour.** I recorded the
`computedCycle` count as the inverse of everything else in this document — the
one check that *could* fail, found by accident. Research then found the defect
underneath it and Ops verified it at the lines: `computedCycle` is assigned at
`pipeline.ts:365`, **after the model call**, and the reuse path returns at line
190 — *"Unchanged evidence: reuse. No bundle is even built."* A name whose
fingerprint has not changed **never gains the field at all.**

**So flat at zero is not the stalled condition. It is the expected reading of a
working system.** Ops would have arrived at 04:00, run one query, seen zero, and
concluded the worker was hung — **with every other signal agreeing**: research
`IDLE`, queue non-empty, heartbeat fresh. A false positive with full
corroboration, at the worst hour.

**Ops's correction is the durable part and it is sharper than my original:**

> **A check that can fail is not automatically better than one that cannot. It
> has to fail for the right reason.**

That is worse than the failures collected below, not better. Those were checks
that stayed silent. This one would have spoken, confidently, wrongly, and been
believed.

**And the error that produced it is the same one this document keeps recording.**
Ops measured that 231 of 231 dossiers lacked the field — true. Then it asserted
*why*: that they would gain it as research worked. **The count was measured; the
mechanism was assumed** — written in the sentence immediately after it quoted
that same tell approvingly. I then built a report to the trader on top of it
without asking what populated the field either.

**What survives**: a heartbeat proves a process exists, a count of produced work
proves it is doing something, and `/api/health` expresses only the first. That
gap is real. `computedCycle` was the wrong carrier — set on one branch of one
path, and now backfilled besides.

## The check that was found by accident

**Ops, 2026-08-24, as a side effect of a caveat about a display column.** Every
other entry in this document is a check that could not fail. This is the
inverse, and it is the only one.

Design's cycle cutover deliberately does not fall back to the model's field, so
every dossier predating `computedCycle` reads `CYCLE NOT ESTABLISHED`. Ops
measured it rather than accepting the adjective **"noticeably fewer"**:

> **231 current dossiers. 0 carry `computedCycle`. All 231 will read NOT
> ESTABLISHED.** Not some — the column is empty at 04:00, and anyone not told
> will read it as the cutover having broken the column.

**That same count is a progress meter, and it needs no new code:**

```sql
select count(*) from research_dossiers d
  join research_analysis_versions v on v.id = d.current_version_id
 where json_extract(v.dossier, '$.computedCycle') is not null;
```

It runs 0 → 231 as research re-analyses. **A heartbeat proves a process exists;
this proves it is doing work** — which is exactly what `/api/health` cannot
express and what the STALLED proposal was going to build.

So on Monday **one query answers three separate questions**:

- **Rising** — research is working, `2433470`'s billing exemption healed the
  board unaided on its first real production test, and the cutover is clearing
  as designed.
- **Flat at 0 with a non-empty queue** — the STALLED condition **observed rather
  than theorised**, and evidence that tonight's unbounded-fetch ceilings did not
  cover the hang.

**The lesson is not "look harder".** Nobody could have looked for this: the
observable did not exist until a display change created it, in a place no one
was watching. What made it visible was measuring a caveat instead of repeating
it — *"noticeably fewer" and "none at all" are different mornings.* **An
adjective is where a falsifiable number goes to hide.**

## Check the field that carries the answer

**Added 2026-08-23 after three instances, two of which nearly became reports.**
A check reads some observable. If that observable can be right while the thing
itself is wrong, the check is decorative — and it is decorative in the
reassuring direction.

- `research-replay` reported 123 stable versions having made **no model calls
  at all**. The output was clean and internally consistent. Its only tell was
  `tokens in=0 out=0` — a counter added for **cost**, not correctness.
- Ops tested a revoked review token **by status code**, got 200, and read it as
  broken revocation. It was not: a garbage token also returns 200. The **bodies**
  settled it — revoked 9,584 bytes with zero RVOL occurrences against a valid
  535,437 with four. Ops caught this before reporting it as an incident.
- The release-bootstrap flake ran the other way. **Capturing the status instead
  of the assertion text** is what cracked it, because 141 is 128+13 and the
  message said nothing.

**So the rule is not "trust bodies over statuses".** The flake proves the
opposite case exists. It is: **name the field that carries the answer, and
confirm it can distinguish the failure you are testing for.** A status code
cannot tell a live capability from a revoked one when the route returns 200 for
both. A token counter can tell a real run from a fabricated one, and did.

**And a fourth instance, from Ops against its own record.** After each of three
deploys it reported *"all four services active"*. True, and the wrong check: it
verified **state after starting** and never **the manner of stopping**. The
project memory says in as many words that clean-shutdown claims must be tested,
because one such claim was already false once and cost three orphaned workers.
The evidence sat in `journalctl` all evening.

The practical form, since this thread relays other threads' verifications:
**when a thread reports a check, ask what it read.** "Verified" is not a
finding; "fetched the asset URLs out of the page's own HTML with no
credentials and got 200" is.

**And the same question applies to what this thread writes down.** I recorded
the review-status defect as "a monitor would never notice a dead link". Ops
investigated and that is true only of the **page** — the review API returns 403
for revoked and garbage alike, so a monitor polling the API sees it instantly.
I had generalised from the one surface Ops happened to test to the whole
capability, which is the same error as reading the wrong field, committed one
level up.

## A retraction only reaches the sentence it edits

**Added 2026-08-23, found by R&D in its own documents.** It retracted a claim,
edited the section that named it — and left the opposite conclusion standing
thirty lines away in the same two files. Both live, both its own: one saying a
churn figure *"proves the production figure is dominated by genuine evidence
change rather than instability"*, the other saying *"most of that churn is the
model disagreeing with itself"*. The second was written **while retracting the
premise of the first**.

This is not carelessness, it is the default outcome. A retraction is drafted by
searching for the claim, and searching finds the claim — not the paragraphs
that quietly assumed it three sections later, which use none of the same words.

**So a retraction is not done when the claim is struck. It is done when every
inference that rested on it has been re-read.** Search for the conclusion as
well as the claim: what did this let us say? Who else was told? A retraction
that only edits its own sentence leaves a document that contradicts itself, and
the contradiction reads as two findings rather than one error.

This thread has issued several retractions today and should assume it has the
same debt outstanding.

## Why none of us found our own

**Ops's observation at the end of 2026-08-23, and it is the best argument for
this thread existing that anyone has made.** Every defect found that day was a
check that could not fail, and they surfaced in a fixed order — the test
fixture, then the guard, then the plans, then the monitoring. **Each was found
by the thread that owned the layer above it, never by the layer itself.** The
heartbeat could not have flagged itself as insufficient; it took a stall nobody
could explain.

**Checked before recording, because the strong version is not quite right.**
Threads did correct themselves, repeatedly and without being told to: Design
found its own hover-only label, Research killed its own trading-date mechanism
and its own denylist, Ops disproved its own SIGKILL guess and filed its own
wrong check against itself. What none of them did was **find** it unprompted.
In every case the prompt came from outside the layer — a rule that sent Design
back to the live desk, a relayed message that sent Ops to a log, a hypothesis
that sent Research to the rows.

So the accurate form is: **the correction is reliably the owner's; the noticing
reliably is not.** That is a stronger claim than Ops's, not a weaker one — it
says the failure is structural rather than a matter of care, because these are
four careful threads and every one of them needed an outside prompt.

**And it says what this thread is for.** Not review — it is worse at each
layer's work than the thread that owns it, and every substantive correction
today came from an owner. What it does is carry a thing from one layer to
another, which is the only motion that reliably produces noticing. More
discipline inside any one thread would not have found these.

## A value with two possible definitions is stored with its basis

**R&D, 2026-08-23, written as a general rule rather than a caveat about float.**
Any value that can be computed more than one way is stored **with its basis in
an adjacent column**. A change of definition then becomes a change of *value in
that column*, rather than a silent change of *meaning in the same one*.

`reference_basis`, `adjustment_basis` and `split_detected` all exist because
this was learned late and expensively — the reference close that flipped at the
bell would have measured a faded runner against the price it faded to, and every
number would have looked plausible. **Float should arrive with `float_basis`
from the first row, not the hundredth.**

**And record the basis even when no consumer exists.** *R&D, 2026-09-03, after
its basis work paid twice in one day in directions it was not built for:
`split_event_ratio` became the float denominator's guard, and `split_factor`
became a prerequisite for a ten-second trade series nobody had scoped — the
trades endpoint returns raw prices, so that series is silently wrong across the
~35% of tickers carrying a reverse split.* **Both consumers arrived from
directions the work did not anticipate**, which is the argument against the
usual objection that a basis column has nothing reading it yet. A basis is
cheap when the value is written and unrecoverable afterwards.

It is the constructive form of a problem this thread keeps finding by accident:
the Sheet's float is vendor-displayed, the derived one is filing-computed, and
*float* names both. Same shape as the model cycle becoming arithmetic, and as
the two instability figures that were nearly quoted against each other. **When
two threads can each be right about the same word, the word needs a companion
column, not a footnote.**

## A deferral in one document becomes a workaround in another

**Found 2026-08-24, and by the trader rather than by any thread.** Research's
item 16 recorded a cheap structural fix — compute the cycle at read time — and
this thread deferred it to *"a fresh session, no mitigation pass"*. Ops then
built a **2.6M-token forced re-interpretation of 231 dossiers** as the mitigation
for the blank column that deferral produced. Both documents were correct. **The
deferral is in `research.md`, the workaround is in `ops.md`, and nobody put the
two sentences side by side until he asked why we were doing it at all.**

The tell is that neither thread could see it. Research had no reason to re-open a
decision this thread had taken; Ops had no reason to question a task it had been
handed and had gated properly. **The cost of a deferral is paid in a different
charter from the one it is recorded in**, and this thread writes the deferrals.

So: **when this thread defers a fix, it owns the price of the deferral too.**
Name what will be done instead, in the same sentence, and compare the two. *"Item
16 deferred to a fresh session"* was a decision about one item; *"item 16
deferred, and the interim costs 2.6M tokens for a field that is arithmetic"* is
a decision anyone would have questioned, including the person who wrote it.

**It belongs beside the retraction rule and it is the same shape one level up.**
A retraction only reaches the sentence it edits; **a deferral only reaches the
document it is written in.** Both are failures of a decision to travel to the
place where its consequence lands.

## "Eventually" is not a unit, and a mechanism check is not a timeline check

**Added 2026-08-24. This thread reviewed Research's partial-bar guard, found the
right column, and drew the comfortable conclusion from it.**

The guard changed a cache test from `stored === today` to `stored >= settled`. I
asked whether that stranded a bar already stored partial, traced the mechanism to
`upsertDailyBars` being `ON CONFLICT(symbol, trading_date) DO UPDATE`, and
concluded: **healing delayed by about a day, not removed — a size question rather
than an incident.** I told two threads the question was closed.

**The mechanism was right and the timeline was never walked.** Research walked it:

| | settled | stored | |
| --- | --- | --- | --- |
| Mon midday | 2026-08-21 | 2026-08-24 | skip |
| Mon evening | 2026-08-24 | 2026-08-24 | skip |
| Tue premarket | 2026-08-24 | 2026-08-24 | **skip** |
| Tue midday | 2026-08-24 | 2026-08-24 | **skip** |
| Tue evening | 2026-08-25 | 2026-08-24 | refetch |

A partial bar survives **the entire next premarket and session** — the exact
window where it does harm — and the `=== today` test it replaced would have
refetched it on Tuesday morning. **The guard was preventive at the price of
protecting the rows it exists to remove**, and Ops independently found the same
thing pointed at Friday, with 133 real rows behind it.

**"It heals eventually" is not an answer. Healing that completes outside the
window it protects is not healing.** The question a mechanism check cannot
answer, and which has to be asked separately, is: **relative to the window that
matters, when?** Walk it against a real calendar — a Monday and a Tuesday, with
hours — rather than reasoning about the operator.

**This is worse than missing it.** A gap left open gets found by the next person
to look. A gap examined and pronounced closed does not — I had the right column
in hand, and used it to end the enquiry instead of to start it. Two threads acted
on that sentence.

**And the relay still worked, which is the honest part of the record.** Routing
the `fetched_at` check to Ops produced the 133; the too-generous review sent
Research back to re-derive and it found the real defect. **Two correct results
came out of one wrong conclusion**, because the conclusion moved between layers
and got tested. That is the argument for this seat and not an excuse for the
sentence.

## A correction relayed is not a correction landed, and that is THIS thread's job

**Twice on 2026-08-24 a thread corrected itself to Integration and the artefact
stayed wrong.** Research's item 2 kept listing a question it had already answered
and shipped; item 17 kept the sentence *"the honest form is a replay"* after
Research had told this thread that the work is **not** a replay. **Both corrections
existed only in a relay.**

**That is the failure this thread exists to prevent, and it caught neither.** The
charter's own words: *when a charter or spec is found to be wrong, this thread
makes sure the fix lands in the document and not only in a chat.* **Receiving a
correction and relaying it onward is not landing it.**

> **On every correction received: ask WHICH DOCUMENT IS NOW WRONG, and say so back
> to the thread. The relay is where a thing is noticed; the artefact is where it
> has to end up.**

**The cost is not hypothetical.** Item 17 will be built by someone who was not in
the exchange, and **they will read the item, not the relay.** Research's own
summary: *the relay is where I notice things and the doc is where they have to
land, and I have been treating the first as if it were the second.* **So has this
thread — and it is the one that wrote the rule.**

### Name the harness, not the word

**The collision underneath it.** *"Replay"* reads as **any controlled re-run**, and
this desk has two kinds that differ in the one property that matters:

| | `research-replay.ts` | design A, live alternation |
| --- | --- | --- |
| makes new search calls | no | **yes — that is the point** |
| marginal token cost | interpretation only | **zero** |
| `ensureDailyHistory` first | **no, and correctly so** | yes |
| bounds in the bundle | understated with partials | finished |
| the 08-20 hole | **must exclude** | not in the window |

**The caveats are not merely different, they are opposite.** So: **name the harness
— `research-replay.ts`, or live alternation — never "a replay".** Same family as
two artefacts answering to *"Research's inventory"*: **when one word covers two
things with opposite properties, the word is the defect.**

## Never pre-authorise a red signal

**Ops, 2026-08-25, inverting an instruction this thread had relayed.** Research
flagged that `/api/health` could legitimately read a schema `user_version`
mismatch between a deploy landing and the worker restarting, and Integration asked
Ops to **decide in advance what that mismatch meant**.

**The window does not exist.** `deploy.sh` stops the runtime units, migrates, then
starts; systemd has web, research and assess each `After=` **and** `Requires=
mointel-migrate.service`. **During migration the web process is DOWN — health does
not answer at all, rather than answering wrongly.**

> **A mismatch on `/api/health` should never appear, so if it does it is a genuine
> fault. Being told to expect a red signal is exactly how a real one gets waved
> through.**

**This desk produced two examples of that failure the same day**: the flaky
`releaseBootstrap` test, whose cost was named as *the operator learning to re-run
until green*; and this thread telling the trader a label would be gone from his
board while it was still on it.

**The general rule, and it is stronger than "check first":** *"expect X during the
window"* is a claim about a window, **and if the window is imaginary the sentence
converts a detector into a blind spot.** Before pre-authorising any expected
anomaly, **establish that the state can actually occur** — and if it can, prefer
suppressing the signal at its source over teaching a human to ignore it.

**The safe direction is the opposite one: say a signal should never fire, and be
wrong.** That costs one investigation. The other way costs the next real fault.

## A quiet window is the best time to deploy and the worst time to FAIL

**2026-08-25. This thread moved a deploy from 09:25 ET to 02:20 ET and the desk
went down for 3h22m, dark through the first 102 minutes of his live premarket
session.**

**The reasoning for moving it was sound and I would make each step again:** no
checkpoint until 06:10, market closed so research was idle with nothing to abandon,
and nineteen hours of margin on the deadline instead of twelve. **Every one of
those is about the deploy SUCCEEDING.**

**What I did not price is that a deploy can fail in a way that leaves the desk
stopped, and at 02:20 nobody is looking.** `push-release.sh` stalled after
stopping the runtime units and before starting them; a ten-minute ssh timeout
killed the remote process tree; **there is no watchdog, so nothing restarted
them.**

> **The outage length was set by when someone next looked, not by the fault.** A
> ten-minute stall became a three-hour outage because the failure mode is silent
> and unattended.

**The inversion is the lesson.** At 09:25 he is at the desk and a dead board is
noticed in minutes. **The very quietness that made 02:20 the right window for
capture made it the worst window for an unattended failure.** I optimised the
success path and lengthened the failure path, and only one of those was in front
of me.

**So: weigh a deploy window on BOTH paths.** *What does this cost if it works* and
**what does it cost if it stops halfway and nobody notices for hours.** For an
unattended hour the second dominates, and it is the one nobody computes.

**What it actually cost, measured rather than estimated:** capture **nothing**
(`RESTART_MARKET=no` held, market `MainPID` unchanged, 8,639 session rows today);
checkpoints **nothing** (none fell in the window); research ~3h20m of
**re-runnable** processing. **The board: 502 for 102 minutes of live premarket.
That is the whole cost and it landed on him.**

**And it is the second time in two days I have set a hold whose release depended on
someone happening to look** — `ce145b8` sat ten hours, this ran three. **Both were
time-based decisions with no mechanism behind them.** No thread here can wake
itself; a schedule that depends on attention is not a schedule.

## A failed deploy is not an unlanded deploy

**2026-08-25. This thread instructed the same sha twice, the second time for work
that was already live.**

The 02:20 deploy caused a 3h22m outage — `push-release.sh` stalled **after**
stopping the runtime units and **before** starting them. **The payload landed
correctly; only the restart was left undone.** But the outage made the whole deploy
read as failed, so `2906a59` stayed on this thread's pending list. Ops resolved it
to `bc78d49` and shipped that; **`bc78d49` is `2906a59` plus one docs commit.**

**Deploying it again would have been a BACKWARDS step** — dropping a docs commit
and restarting three services to change **zero lines of code**, during his trading
window.

> **An incident during a deploy says nothing about whether the payload landed.
> Those are separate facts and only one of them is visible in the incident.**

**Check the sha against production before instructing anything.** `git merge-base
--is-ancestor <sha> <live>` is one command and it is the check this thread skipped
twice.

**The good half: the experiment was already armed.** `bc78d49` has been live since
09:42Z, so tonight's recap is the clean `stalledJobs` reading with nothing needing
to ship.

## I set the deadline and the conditions; Ops prices the minute

**Ops's correction, and it is the durable form of the override above.**

Overriding its 17:00 recommendation was right — *a turn you have now is worth more
than a better window you may not reach*, and its own recommendation depended on
someone arriving at 17:00. **But the cost estimate attached to it was wrong.** This
thread priced the earlier window at *"at most one skipped `RTH_INTERVAL`"*, which
was true **after 10:00 ET**. Ops's next turn was **08:2x ET — inside his trading
window, with RCON on his board at rank 7, +24%.** The cost there is **his board
going dark mid-trade**, not a skipped assessment.

> **Send the deadline and the conditions. Do not send the minute, and do not price
> it.** The thread holding the checkpoint schedule and the live board state is the
> only one that can.

**And it worked the first time this thread did it that way** — `"deploy before
20:00 ET, watched, research idle, abort on a stall"` produced a correct abort.
**The second attempt added a minute and got the pricing wrong.**

## A rule recorded under the delegation is not the trader's instruction

**R&D, 2026-08-27, holding a push rather than following README line 95.** The
README's *"every thread commits and pushes its own work"* was recorded by
Integration under the order-and-process delegation. R&D reports a session-level
instruction from the trader to push only when he asks — invisible to every other
thread, and senior to anything in the repository. This thread cannot see that
configuration and does not need to: the conflict went to him, which is where it
belongs.

Two things follow, different sizes:

- **Where a desk-process rule and a direct trader instruction conflict, the
  instruction wins and the conflict goes to him.** A thread declining a README
  rule on those grounds is the system working, not a thread being difficult.
  This thread stops treating the README line as settling the question it was
  asked to settle.
- **The structural hazard is R&D's phrasing and is kept verbatim:** *a peer
  thread writing a convention into a shared document does not make it the
  trader's instruction — it makes it a peer's convention with better
  distribution.* A shared document can look like a channel that grants
  permissions he never gave, precisely because it is checked in. **Authority
  comes from him; the document records it rather than creating it.**

So: rules in shared documents carry their provenance — who stated it, who
recorded it, under what delegation — and a rule that touches what a thread is
*permitted* to do, rather than how work is sequenced, is either his word or it
is marked as awaiting it. Line 95's existing attribution is how R&D caught
this, which is the argument for provenance rather than against the rule. When
he answers the push question, the README line gets his answer and the date.
**Answered 2026-08-27, one word: "push." Landed on the README line the same
hour; R&D's hold lifted by the one person who could lift it.**

### And the hold it produced was structurally impossible

Within the hour, both of R&D's held commits reached origin anyway — `d8c86aa`
under Research's routine push, `b1c4c30` under this thread's own `8b2a537`.
Neither pusher chose that: **on one shared local `main`, a branch push
publishes every commit below the one being pushed**, so an individual thread
cannot hold a commit back while any peer pushes. *"Push your own work"* cannot
tell **my work** from **everything beneath it** — the two cases had never come
apart because no thread had ever held a commit before. Same shape as every
rule in this document that named an event for a condition: correct when
written, divergent the first time the unconsidered case occurred.

**A hold is collective or it is nothing.** If one is ever actually wanted, it
is a freeze declared through the bus to every thread, or it is work on a
separate branch — never a thread sitting on shared `main` intending not to
push. And the intention is announced the moment it forms — R&D's amendment,
from the silent half of the incident, in its own words: *a hold on shared
`main` is not a slower push, it is a push by whoever moves next.* R&D's other
half of the record is kept with it: the promise was made without checking
whether the structure could keep it, and no pusher could have checked for a
category that had never occurred.

## A deploy is a capacity event

**2026-08-27, 04:48 ET, incident closed at Ops's `cfd9d26`.** A deploy this
thread instructed at `4ac30b5` took the production box down for ~54 minutes of
premarket — not the payload: **`push-release.sh` runs `next build` on the
production box, and the build exhausted its memory.** Every gate and preflight
was green and none of it mattered, because the preflight prices checkpoint
distance and research idleness and **nothing in it looks at capacity.** Ops's
sentence is the rule. The payload never landed; production stayed `bc78d49`;
capture degraded to ~5% for the first 40 premarket minutes and that thin
window is the whole unrecoverable cost.

**Standing conditions on any deploy instruction from this seat, superseding
the earlier "0d or watched":** Ops's **item 0f — build off-box, ship the
artifact — ships first**, or the window is explicitly priced as a capacity
event by Ops; watched end-to-end remains; 0d remains behind 0f. This thread
first logged the on-box build as "a candidate cause, a gate condition" — Ops's
correction stands: **it is the cause, and it is unconditional.**

Kept from the same incident: **staggered service starts, market worker first**
— `NRestarts=0` on all four against a known ~1-in-3 startup race when three
open the store together. And a diagnostic worth its line: **a fast 401 from
nginx proves the box answers and says nothing about the app** — nginx answers
Basic Auth itself; the probe that reaches the app is `/_next/static/`.

## Enumerating the code sites does not enumerate the PROCESSES

**2026-09-04, the shipped-and-inert case arriving for real.** `6d368dc` deployed
clean, schema 23, all seven activity columns present — **and every row NULL,
because the only writer of `ticker_session` is `toRow` in `worker/runtime.ts`,
which is the MARKET WORKER, the one process `RESTART_MARKET=no` exists to leave
alone.** It was still running the previous release.

**Ops enumerated nine wiring sites and found every one. Nobody asked which
PROCESS runs the ninth.** This thread's instruction said *"nothing here touches
the market worker's ingestion path"* — **true about ingestion and false about
the writer**; Ops read the same sentence, agreed, and priced a window around it.

> **A code-site enumeration answers "is it wired". It does not answer "will the
> process that runs it be restarted".** On a desk with a deliberately
> unrestarted worker, those are different questions and only the second decides
> whether a deploy does anything.

**The fail-open design is what made this harmless** — NULL maps to `undefined`,
both gates exclude nothing, the desk is exactly as it was plus seven empty
columns. And it was diagnosable only because Ops checked the worker's `cwd`
against the release: **shipped-and-inert and shipped-and-broken produce the same
distribution reading**, and only the process check separates them. Add the
question to the deploy checklist: **for every writer in the payload, name the
process that runs it and say whether this deploy restarts it.**

## A relay of his ANSWER is the same object as a relay of his INSTRUCTION

**Ops, 2026-09-04, refusing a market-worker restart carried from this seat —
and the refusal is stronger than the four it echoes because Ops WANTED the
answer.** It had recommended the restart, priced the window, argued it was
strictly better; the word came back yes, through me, accurately quoted with the
question it answered. **It held anyway.**

> **If I accept it here, the rule was never a rule — it was a preference I
> abandoned the moment it agreed with me.**

This thread had already told Ops plainly that it does not hold the delegation
and to keep refusing anything from this seat. **A relay of his ANSWER arrives
through the same channel as a relay of his INSTRUCTION, and the receiver has
the same inability to verify either.** The charter's oldest version of this —
*a relayed delegation does not answer a question put to him directly* — was
written about authority being withheld; this is the same rule about authority
being GRANTED, in the case where the relay is accurate and the receiver wants
it to be true. **That is the only case in which the bar actually gets tested.**

**And the cost of holding was bounded and known**, which is what made it cheap
to be principled: the same restart happens unattended overnight regardless, so
what was at stake was the OBSERVATION rather than the feature. When the cost of
holding is small and the person is reachable, hold.

## A PRE-REGISTERED criterion is protected from being fitted, not from being WRONG

**2026-09-04, the first reading of the activity feature.** Research had
pre-registered: *a DEAD row missing any of `dead_since` / `dead_at_rank` /
`dead_at_peak_trades` / `dead_at_price` means the capture block did not run.*
Sound-looking, written before the deploy, immune to being fitted to the result.
**It would have cried wolf 268 times.** `dead_at_rank` records the rank held at
the flip — and a name unranked at that instant correctly has none. Only ~250 of
8,800 rows are ranked at any moment; of the 107 DEAD names that WERE ranked, 60
had it. **The criterion could not tell *absent because there was nothing to
record* from *absent because the writer is broken*** — a check that cannot
distinguish, wearing pre-registration as armour.

**And the near-miss underneath it is worse.** Ops's first reading was
`dead_at_rank` **0 of 203, taken thirty seconds after the restart**, and it had
drafted that as the named failure. Two minutes later: 60 of 328. **A brand-new
writer has written almost nothing yet, so absence at t+30s is not absence.**
What saved it was running the *discriminating* query — *are these names even
ranked* — instead of reporting the null count.

> **Pre-registration defends against fitting a criterion to the data. It does
> nothing about a criterion that was never able to separate the cases.** Both
> checks are still needed, and the second one is the older rule: can this
> observation come out badly for a reason that is not the failure?

## An ADDITION plan is a list of readers too — and this one had two

**2026-09-04, found by Design on the first live surface read.** The graveyard
rendered *"not recording yet"* while the store held 328 DEAD rows: the
`activity` key was **absent** from the demand payload — not null, not
`'UNKNOWN'`. Verified at the code from this seat rather than routed as two
candidates: `repo.ts` carries `activity` in the row interface, the INSERT list,
the VALUES placeholders and the DO UPDATE SET — **and the row→DemandState
mapping never assigns it.** The write path was complete and the surface read
path was missing. *The site is `rowToDemandState` at `repo.ts:336` — Ops's
correction of my name for it, and worth being exact because someone will grep:
`toDemandState` at `engine.ts:1742` builds from LIVE MEMORY and carries activity
fine. The starved path is the one `readDemandStates` uses to read out of the
store.* Fixed at `0da5377`.

**And the mutation check told Ops WHICH of its tests guarded — one of two.** It
deleted the mapping line: the round-trip test failed, and **the
NULL-to-`undefined` test PASSED VACUOUSLY**, because with the mapping gone the
field is `undefined` anyway. It guards a NULL→`'UNKNOWN'` collapse and is no
guard at all against the missing mapping.

> **A mutation check does not only tell you a test works — it tells you WHICH of
> your tests works, and the answer is usually fewer than you wrote.**

Ops's note that it nearly reported *"two tests cover it"* is the reason that
sentence is here.

**Ops's nine-site enumeration was excellent and answered a slightly different
question:** *what does it take to ADD a column.* It included the whole write
path plus **one** reader — `readBoardCandidates`, which Research had flagged by
name. **There were two.** `toDemandState` was never flagged, so it was never
enumerated.

> **This desk already records that a DELETION plan is a list of readers. An
> ADDITION plan is one too, and it is harder: a deletion breaks its readers
> loudly, while an addition simply never reaches them.**

Everything else measured consistently and that is what makes the diagnosis
clean: columns populate, the research-slot gate works, the high-res gate works
(engine-internal, never touches the store), and **only the consumer that reads
`DemandState` back out is starved.** *And the surface said so* — Design's
not-wired state, written before there was anything to distinguish, is what
turned this into two queries instead of a false "graveyard working, empty".

## A retraction that reaches the DOCUMENT does not reach the PEOPLE

**R&D, 2026-09-04, against itself, after this thread quoted the pre-retraction
version of its own prediction back at it.** It had retracted the
fraction-of-window mechanism in an amendment — and **sent that amendment as a
new amendment rather than as a retraction of something I was holding.** The
document was correct and the reader was not.

> **When you retract something another thread is carrying, say so IN THE
> MESSAGE, not only in the file.** The charter already records that a
> retraction only reaches the sentence it edits; this is the same failure
> pointed at people rather than paragraphs, and this seat is the one most
> likely to be holding the stale copy, because relaying is what it does.

## A replay validates the PREDICATE, not the IMPLEMENTATION

**R&D, same exchange, sharpening a blocker of mine rather than dismissing it.**
Q11's false-positive rate turns out to be reconstructible from re-fetched minute
bars, so waiting for live drop events buys a *smaller* sample, not a better one.
But:

> **A replay built from the same specification cannot see an off-by-one in the
> implementation, because it would reproduce the bug.**

So the two questions separate cleanly: **a replay measures the RATE; only
captured drop events audit the DEPLOYMENT.** The capture gap is real and much
narrower than "blocked".

**And the condition neither of us named, which lands directly on the
numerator:** the live rule excludes the in-flight minute, so a five-minute rule
**decides at six**; a replay that does not reproduce that offset drops names a
minute early, and **a revival inside that minute counts as after the drop in one
version and before it in the other.** A replay must reproduce the deployment's
offsets, not just its thresholds.

## A judgement applied at ONE reader is not applied; it is applied THERE

**Research, 2026-09-04, agreeing with a display-filter call and then widening
it.** The graveyard's population was six-sevenths names that had never been
active. Filtering the SURFACE fixes the surface — **and the dilution is in the
STORE.** Any analysis over stored DEAD rows inherits the same population, so a
revival rate computed over them measures something else entirely, and the thread
most likely to compute one is the least likely to see the dilution.

> **Name the predicate ONCE, as an expression, and use that expression at every
> reader** — `dead_at_peak_trades >= activeTradesPerMinute`, not a number
> retyped per consumer. If the surface filters on *ever reached the active line*
> and an analysis filters on something near it, there are two populations under
> one word again.

**This is the sixth instance of that shape on this desk**, and the first where
the two populations would have been created by a fix rather than found in
existing code. **The routing obligation is the practical form: when a judgement
is settled at one reader, it goes to every reader in the same message** — which
is why this went to the analysis thread and the surface thread together.

## Two predicates, deliberately different, never interchangeable

**Measured 2026-09-04 after Research warned that a filter applied at one reader
would create two populations under one word.** It would have, and the gap is now
a number rather than a caution:

    dead_at_peak_trades >= activeTradesPerMinute   admits 512   (the SURFACE)
    two consecutive minutes >= active              admits 423   (Q11's numerator)
    difference                                      89   9.5%

*Correction to this entry's own history: when first written, the shipped surface
filter used the DEAD line (active ÷ 10), which admits far more than 512 — so
this table described a proposed predicate as though it were the deployed one and
was wrong at the moment of writing. Design moved the filter to the active line
at `b560aa4` for its own reasons, and the entry became accurate afterwards.
Recorded because a table that turns out right is not the same as one that was
right, and the next reader cannot tell them apart.*

**Both are correct for their own purpose and neither is a better version of the
other.** The surface's question is *was this name ever meaningfully alive*, so a
peak above the line qualifies. Q11's question is *could this name have been
DROPPED*, and the live `ACTIVE` state requires two sustained minutes — so a name
that never sustained two minutes was never on the active board and cannot be
dropped from it. **The peak predicate is looser than the drop semantics on
purpose.**

> **So a graveyard count and a Q11 rate may never be compared without naming
> which population each is over.** The rule is not "unify them"; it is that the
> divergence is deliberate and must travel.

**And the asymmetry is the durable half — R&D's:** the same kind of definition
difference **cost 8.5 points** on one measure and **prevented a 45% dilution**
on another. **Divergence between two threads' definitions is not uniformly bad.
It is uniformly worth knowing about.**

## "The board" is THREE numbers, and this thread relayed one as the answer

**Design, 2026-09-04, checking a correction of mine before writing a predicate
against it.** I had told it *the board is top 25, not top 50* — relaying R&D's
figure as authoritative. There are **three**, differing by 4x, each a real
meaning of "board" in this codebase:

    discoveryRank defaults to 12   config.ts:69, driving engine.ts:1285, :1671
    the archive holds ranks 1-25   R&D's population, and the source of my claim
    the UI offers Top 12/25/50     and renders 50 by default

**So my correction was one of three answers presented as the answer**, and a
predicate written against any of them would have been this desk's oldest
collision **manufactured while fixing something** — the exact thing Research had
warned about two hours earlier when it asked Design not to type `300`.

**The repair is the generalisable part: Design wrote PRESENCE, not a
threshold** — `deadAtRank !== null`. A name that held ANY rank could have been
on his screen at some view size; one that never held a rank could not. **It
needs no number, so it cannot pick the wrong one, and it does not move when he
changes Top 12 to Top 50.** A test asserts no rank threshold appears in the
module at all.

> **When a word has several numeric definitions, prefer a predicate that needs
> no number.** Choosing one of them correctly still leaves the next reader
> choosing again.

**And it puts a caveat on every "board symbol-day" figure in the register**,
including the 45.5%: that population is ranks **1–25**, which is a fact about
the archive rather than about what he sees.

## A STATED population is what lets a figure survive a boundary it never anticipated

**R&D, 2026-09-04, after the desk discovered that "the board" means 12, 25 or 50
depending on where you look.** Re-cut at the desk's operative boundary of 12:

    S3 catalyst separation      +14.9pp both windows      IDENTICAL
    Q5/S1 board timeliness      32.5% vs 30.0%            verdict untouched
    Q6 rank vs RTH excursion    rho -0.178 vs -0.276      CROSSES ITS OWN BAR

Q6's pre-registered rule required rho ≤ −0.20. **At ranks 1–25 it met it; at the
top 12 it would have read as no detectable content.** And **nothing is
retracted**, for the reason that is the whole finding:

> **Q6's population — ranks 1–25 — was STATED, before the run. Re-cutting it
> afterwards is exactly the post-hoc move the pre-registration exists to forbid.
> The yield finding CHANGED at the boundary because it had no pre-registered
> population. Q6 does NOT change, because it did.**

**That is the units rule at register scale, and it answers it.** A figure with
its population stated is not merely honest — **it is survivable**, because a
boundary discovered later cannot retroactively redefine what it measured.

**The sensitivity still travels beside the verdict**, and it sharpens rather
than weakens it: the correlation is **driven by ranks 13–25**, the band the desk
does not call boarded. **Inside the top 12 the trader actually watches, the
09:25 ordering carries little forward information at all** — which strengthens
*rank predicts volatility, not edge* rather than qualifying it.

## THE SUMMARY IS WHERE THE ERROR LIVES — written last, read first

**Research's formulation, 2026-09-04, after three instances in one day, none
caught by its author and each found by a reader acting on it:**

- Its own LIVE STATE said *"stored skew"* while the item it summarised had
  explicitly declined to store it — and this thread's schema request was drawn
  from the summary.
- Its item 34 said the share count was the binding constraint, quoting the
  MODEL's transcription while the code divides by the filed value. **This seat
  relayed that to the trader as a strategic direction, and it was backwards.**
- The shared README's facts bullet said the Sheet had FOUR writers while its
  very next bullet said two were paused. **The trader corrected it.**

> **A summary is written last, when the author is tired and certain, and read
> first, by someone with no way to doubt it.** Every one of these was a
> body-correct document with a wrong index, and in each case the index is what
> travelled.

**So the expiry audit covers the summary against the BODY, and a relayed
extract carries the question it answered.** Both already recorded — this entry
names the class the three belong to, because three instances in one day is a
property of summaries rather than three separate lapses.

**AND THE REPAIR IS MECHANICAL: AFTER CORRECTING A CLAIM, GREP THE FIGURE, NOT
THE SENTENCE.** *Research's rule, found by correcting item 34's body and then
discovering it had left TWO uncorrected copies — one of them in the LIVE STATE
index labelled "numbers the trader has been given", which is the one place a
successor looks to learn what he knows.* **A sentence is rewritten in each copy
and will not match; the NUMBER is identical everywhere it was pasted.**
`91/231` found all three sites in one query. *"Check for other copies" is
advice; "grep the number" is an action* — and this seat ran it on its own
charter before recording the rule, which is the first application a new rule
is owed.

**And it happened in the same hour Research wrote the summary rule** — the
rule-you-just-wrote shape again, caught by its own author for the first time,
with the author noting it was not a lapse in care: it was careful, and had the
rule in front of mind because it had just typed it.

**One sharpening of the blind spot, Research's:** the standing repair for name
collisions is threads publishing what they hold. **It has worked five times and
every one was caught at a THREAD BOUNDARY**, because a boundary is what makes
someone ask which is meant. When both artefacts belong to one thread there is
nobody to publish to. **The desk's best defence has a blind spot exactly the
size of one thread** — and what found this one was an unrelated query forcing a
number to be RE-DERIVED rather than quoted again. Offered rather than adopted:
for a figure that has become a **strategic conclusion** rather than a
measurement, re-deriving it may be worth the cost; item 34's number survived
every reading because it was always read and never recomputed.

## FINISHED WORK THAT DOES NOT ARRIVE — the last hop keeps not happening

**Research's class, 2026-09-04, after the fourth instance in one evening:**

- **The supply pair** — computed for every dossier, stored, and read by nothing.
- **The cycle-levels replacement** — the desk's own arithmetic exists; the
  reader was never switched.
- **The research-slot gate** — complete, and inert until one column entered one
  `SELECT`.
- **The float's own as-of** — `floatSourceDate` is parsed, typed and RENDERED,
  in a drawer nobody opens while looking at a float on the board row.

> **Every instance looks like MISSING WORK and is actually FINISHED WORK THAT
> DOES NOT ARRIVE.** The last hop — from a value existing to a value being
> where a decision gets made — is the one that keeps not happening.

**And it is invisible in every direction, which is why it recurs:** the builder
sees it built, the reader sees a blank, and **nothing in between reports a
gap.** No test fails, no query returns wrong, no surface errors. The same
property as the summary-versus-body class — a document correct in its body with
a wrong index — one layer out, in code rather than prose.

**The practical form for this seat:** when a thread reports something BUILT,
the routing question is not *does it work* but **WHO READS IT, AND IS THAT
WHERE THE DECISION HAPPENS.** Three of tonight's four were found by asking a
question next to the work rather than about it.

**And a near-miss worth keeping, because it nearly added a fifth instance and
a second cause that do not exist.** Research reported that `supplyPair` never
leaves its layer, so the surface *could not* render it — which would have made
this class two causes rather than one, and made a routing error of mine that
never happened. **It was wrong.** It had grepped for `supplyPair` BY NAME in
three files, found nothing, and read that absence as unreachability — while
those files reach it **through the dossier**, by the same path they already use
for other structure fields, without ever naming it. **A grep for a LEAF name
misses every path that goes through the PARENT**, and the evidence for *nothing
carries this* is identical from inside the search to the evidence for *I
searched for the wrong token*. Its own rule, committed by its own author within
hours of quoting it. **Retracted at its request, and the class stays at four
with its original wording** — a register entry quietly resting on a false
premise is worse than a missing one.

## A test can PIN a defect, and a comment can be its source

**Design, 2026-09-04, commissioned to add a date to a stale cycle reading and
finding a false one instead.** `cycleDetail` rendered **`'high is today'`** when
`sessionsSinceHigh === 0` — and the latest bar is never today. **So during
premarket the desk printed a claim about YESTERDAY with the word TODAY in it.**
Not stale: false, and the one part of the reading a trader takes at face value
without checking a date.

**Two things made it durable, and both are the point:**

- **The old test asserted `toContain('high is today')`. IT WAS PINNING THE
  DEFECT.** A green suite enforcing a false label — the
  fixture-encodes-a-dead-world rule arriving as an ASSERTION rather than as a
  fixture, which is worse, because a fixture merely fails to catch a bug and an
  assertion actively defends it.
- **Its source was a comment.** `lib/market/cycle.ts` documented
  `sessionsSinceHigh` as *"zero means today"*. **It was TRUE ONLY AFTER 20:00
  ET**, when the latest settled session IS today — **true in one window and
  false in the window he trades.** That is the name-the-condition-not-the-event
  failure arriving in a DOCSTRING, a venue this desk had not seen it in: it has
  appeared in rules, in columns and in handover lines, never in a comment that
  a reader then rendered. Corrected by Research at `fe3fbb4` to state the
  condition — *"zero means the latest SETTLED session"*. **Readers were then
  enumerated rather than assumed: five, of which four were correct on settled
  semantics and one rendered the false label. One bad reader, and the comment
  was the common cause.**

**And the repair's own decision is worth copying:** Design refused to write
*"today not included"*, because after 20:00 ET today IS the latest session and
that clause flips from true to false inside one evening — **the
event-versus-condition failure, which it would have shipped into the fix for
another one.** A bare date is true in every window, and a test now asserts the
string contains no flipping clause.

## "WHAT I NEED FROM YOU" IS FOR HIS JUDGEMENT, NOT FOR MY SEQUENCING

**The trader, 2026-09-04, correcting this seat: *"you direct traffic, i just
wanted to make sure it wasn't forgotten."*** Asked whether the momentum dial
should run ahead of the float work, he declined the question — **because it was
never his.**

**The delegation says order-and-process calls are decided here rather than
referred.** So a sequencing question in the closing section is not caution, it
is **the delegation handed back**, and it costs him a decision he explicitly
gave away. The section exists for spend, auth, destructive actions and genuine
judgement calls. **Priority between two pieces of work is none of those.**

**And it hid the real failure.** The dial was registered, designed, marked not
blocked — and moved zero inches while the float work took the session. **He was
not chasing it; he was checking it had not been dropped.** It effectively had.
That is *decided for and then dropped*, and asking him to re-decide it was
**this seat's own omission dressed up as his choice.** The honest report is that
I deprioritised it by not thinking about it, and the honest fix is to sequence
it now.

**The test for the section, going forward: could the answer be "either is fine,
you pick"? Then it does not belong there.**

## TWO THREADS READ REAL DATA, DISAGREED COMPLETELY, AND NEITHER MISREAD ANYTHING

**2026-09-04.** Ops measured 16 of 17 floats parsing; Design ran the deployed
parser against live strings and got **0 of 11, AKAN included.** Disjoint tickers,
opposite results, both live, both correct.

**The same names appear on BOTH Sheet tabs in DIFFERENT FORMATS:**

    TODAY     AKAN  "537,665 displayed; 785,655 SO"   -> refuses
    RESEARCH  AKAN  "537,665 displayed"               -> 537665

**Eleven of eleven each way.** And `resolveDisplayedFloat`
(`lib/dashboard/merge.ts:143`) checks **RESEARCH first** — verified in the code,
not taken on report. It parses, so the board shows its value and **the TODAY
branch is never reached.**

**Design tested the branch that does not fire.** Its measurement was correct and
its conclusion — *"the parser reads nothing on his board"* — did not follow from
it. **So my correction to the trader was the error, and the original statement
was true: twelve floats he wrote are numbers on his board.** A retraction of a
retraction, and the lesson is that **a live measurement is not self-locating** —
it tells you what a code path does, never whether that path runs.

**THE REAL FINDING IS UNDERNEATH AND OUTLIVES THE RECONCILIATION: THE FALLBACK
IS DEAD.** TODAY's float column is **entirely unparseable, 11 of 11.** It costs
nothing today because every one of those names is also in RESEARCH. **It costs
everything the moment a name is in TODAY and not in RESEARCH** — and the
fallback exists for exactly that case. **The parser fix is incomplete rather
than wrong:** it covers the branch that fires and not the branch that exists for
the case nobody has hit yet.

**A dead fallback is invisible precisely while the primary works**, which is
every day until the one day it matters.

**One naming hazard found in passing:** in `resolveDisplayedFloat` the parameter
named `research` holds the **TODAY** row and the one named `record` holds the
**RESEARCH** row. Two things under one word, in the function this whole
disagreement turned on.

## MAKE IT IMPOSSIBLE, NOT VISIBLE — FIVE TIMES IN ONE NIGHT, AND THE FIFTH DELETES THE STATE

**2026-09-04. Every time this seat reached for a label, it was corrected toward a
structure:**

1. **The split parser** puts the share count in a substring the float grammar
   never sees — **unreachable, not unmatched.** A wider regex would have left the
   wrong number in a capture group a later edit could read.
2. **The auto tick set is DEFINED as the remainder** rather than fixed at five
   and quietly shrunk — **nothing degrades, so there is no degradation to
   announce.**
3. **The sparkline IS the verdict's own array**, not a second measurement that
   agrees with it — **nothing to drift.**
4. **The impossible float is refused at `resolveDisplayedFloat`**, so the sort has
   nothing to sort and turnover has nothing to divide by — **no consumer has to
   remember.**
5. **The placeholder constants STOP EXISTING.** A nullable prop represents absent
   data **as absent** rather than as a fabricated object.

**Design's observation on the fifth, and it is the escalation: the first four
keep a correct value. This one removes the ability to state a wrong one.** There
is no constant left to police, no test needed to check its honesty, and no
sibling to miss in the next enumeration — **the family is dissolved rather than
audited.**

**AND THE ALTERNATIVE WOULD HAVE REINTRODUCED THE BUG THROUGH THE FIX FOR ITS
SIBLING.** Adding `'UNKNOWN'` to `SessionPhase` leaves `isMarketDataExpected` —
a positive allowlist — returning false, yielding **IDLE**, which is precisely the
answer the change existed to prevent. **One compiler error; every other reader
silently wrong.**

**The tell, in hindsight, is that a label is a promise about future readers and a
structure is a fact about the current code.** Every label proposed tonight
required someone later to notice it; none of the structures did.

## I WEIGHED THE ASYMMETRY CORRECTLY USING MAGNITUDES I HAD NEVER MEASURED

**2026-09-04, twice in one night, and both times the decision turned on the
number rather than on the reasoning.**

- **Deploy duration.** I carried **"~90 seconds"** through two decisions about
  margin. Ops corrected it to **6–9 minutes** — the box BUILDS, because
  deploying from Windows means no prebuilt artefact ships. **I had never sourced
  the figure.** The actual deploys then came in at **2.5 minutes**, so the
  corrected number was also wrong, in the other direction.
- **SIP reconnect.** I rejected a market-worker restart as *"trading a rehearsed
  recovery for an unrehearsed reconnect against a deadline."* The reconnect,
  when the trader ordered it and Ops measured it: **DISCONNECTED at t+4s,
  STREAMING by t+8s.** Eight seconds against twelve minutes of margin —
  **roughly ninety times over.**

**The structure of the argument was right both times. The quantities were
invented.** An asymmetry argument — *this failure is recoverable, that one is
not* — is only as good as the magnitudes on each side, and **a risk with an
unmeasured cost will be weighted by how alarming it sounds.** "SIP reconnect"
sounds like minutes of lost capture; it is eight seconds.

**AND THE COST OF BEING WRONG RAN THE OTHER WAY, WHICH I DID NOT PRICE AT ALL.**
Restarting before 04:00 populates `activity_window` **across the whole premarket
session.** Waiting for the close would have left the sparkline dark through the
one session that mattered today. **I weighed the risk of acting and never
weighed the cost of waiting** — so even a correct risk assessment would have
produced the wrong decision.

**The practice: before an asymmetry decides something, ask what each side
actually costs and whether anyone has measured it.** If nobody has, say so
rather than reasoning from the word.

## THE THIRD INERT SHIP, SAME CAUSE, AND I MADE THE CALL THAT CAUSED IT

**`ac63643` live 2026-09-04, clean in ~2.5 minutes.** Schema 24 confirmed **by
reading the column, not the version number.** Header passed in both indicators —
the silent half exercised for the first time.

**And two observables came back INERT rather than pass or fail.**
`activity_window` is NULL on all 8,754 rows; the sparkline shipped and has
nothing to draw. **The writer is `toRow` in `worker/runtime.ts` — the market
worker — and `RESTART_MARKET=no` left it running code from 23:04:51 UTC, eight
and a half hours before the deploy.** The column is correct, wired, and empty.

**THIS IS THE THIRD TIME. The activity feature shipped inert three days ago for
exactly this reason, and the charter entry from it reads *"enumerating the code
sites does not enumerate the PROCESSES."*** I wrote that entry. **Then I made
the `RESTART_MARKET=no` call and never asked which process WRITES the new
column.**

**My reasoning was sound and answered the wrong question.** I weighed SIP
reconnect risk against migration-lock risk and chose the rehearsed recovery —
correct on its own terms. **But "does this deploy need the worker restarted?" is
not the same question as "is restarting the worker safe?", and I only asked the
second.** Ops's enumeration was likewise about the SIP cost, not about the
writer. **Two threads, both careful, both answering the adjacent question.**

**The rule needs the sharper form: A DEPLOY'S PROCESS LIST IS DERIVED FROM WHAT
THE CHANGE WRITES, NOT FROM WHAT IT RISKS.** Ask what process performs each new
write before choosing which processes restart.

### And I broke my own no-shared-observables rule while writing it

**Observables 3 and 4 are one observable.** The sparkline draws from
`activity_window`; if the column is empty the chart is blank, so a single cause
explains both and neither can independently confirm its own change. **I
instructed "per-change falsifiable observables, and no shared ones" on this very
deploy** — then supplied two changes sharing one. Ops named it rather than
reporting three-of-four.

### The near-miss worth keeping

**Observable 2 nearly reported FAIL.** `"Google Sheet"` returned 1 occurrence
against a stated fail condition of zero. **It survives only inside
`title="Google Sheet research is current"` — a hover tooltip — while the
rendered element is a bare dot with no words.** The raw count said fail; the
context said pass. **The loose-grep family again, caught before it travelled
rather than after.**

## I WAKE ONLY ON MESSAGES, SO WAITING FOR ONE IS NOT A PLAN

**The trader, 2026-09-04, for the SECOND time in one night: "no one is working
and you haven't given an update or instructions."** After the first, this seat
amended the shared ping rule. **It failed again within the hour, because a rule
in a document does not create a wake signal.**

**And the diagnosis was wrong both times. It was never their silence — it was my
dropped hops.** Checking directly took two commands and found:

- **Ops was working**, mid-deploy, at that moment.
- **Research had been idle waiting on a word I never sent.** It said *"say the
  word once Ops reports and it is a short build."* Ops reported hours earlier. I
  relayed nothing.
- **Design had never been given the trader's answers** on all-rows sparklines and
  top-5 ticks. I wrote *"I'm scoping it that way"* to the trader and sent it to
  nobody.

**So two threads were idle because the bus stopped, and the bus is me.** Writing
a stricter rule for THEM was fixing the wrong end — it also, conveniently, put
the failure somewhere other than here.

**THE STRUCTURAL FACT: THIS SEAT WAKES ONLY ON AN INCOMING MESSAGE.** No commit,
no idle thread, no elapsed hour wakes it. **So any plan that depends on someone
else choosing to send one has a single point of failure that is not under this
seat's control** — and the trader becomes the fallback wake signal, which is
exactly the transport role the whole arrangement exists to remove.

**THE PRACTICE, AND IT REPLACES THE RULE RATHER THAN SUPPLEMENTING IT:**

- **Before reporting state, READ IT.** `list_sessions` gives `isRunning` and
  `lastActivityAt` per thread; `git log origin/main` gives what landed. **Two
  commands, and they do not depend on anyone's compliance.**
- **Before going idle, re-read every "waiting on X" in flight and confirm X was
  actually sent.** Both drops tonight were an instruction that existed in a
  message to the trader and in no message to the thread.
- **A thread idle for a while is a QUESTION, not a status.** It means finished
  and quiet, or blocked on me — and those are indistinguishable from here without
  looking.

## A BUNDLE IS A POINT, NOT A SET — AND MY MODEL WAS STALE, NOT MY FACTS

**Ops, 2026-09-04, refusing a deploy instruction from this seat.** I named
*"your after-close bundle is `e48107e` AND `75a3917`"*. **There is nothing to
assemble: the history is linear**, and `e48107e` is an ancestor of `75a3917`,
which is an ancestor of `eabc989` and `7068303`. Verified here by ancestry
rather than taken on report.

**So naming the earlier sha ships the WORST available point.** It carries 0e in
its **pre-index form** — the exact gap Research found and Ops had just closed —
and **contains Design's header not at all.** A deploy that "shipped the bundle"
would have shipped neither finished piece.

**EVERY OTHER ENTRY IN THIS FILE IS A STALE FACT. THIS ONE IS A STALE MENTAL
MODEL, AND THAT IS WHY IT SURVIVED.** The desk spent a week on composed
side-branch shas, where a bundle genuinely *was* several shas assembled — the
composed-sha rule is in this charter. **The branch topology changed; the vocabulary
did not.** A fact goes stale visibly, because something contradicts it. **A model
goes stale silently, because it keeps producing well-formed sentences** — "the
bundle is X and Y" parses perfectly and is simply about a world that ended.

**TWO STANDING RULES OUT OF IT:**

- **Name ONE sha. Never a list, never `HEAD`, never `main`.**
  `push-release.sh:18` is `REF="${3:-HEAD}"`, so on a shared checkout an omitted
  ref names **whoever committed last** — which on this night was repeatedly not
  Ops. **Ops states what the sha contains before it moves.**
- **The deployable is a point at or after the last thing that must ship.** If two
  pieces must both be in, the instruction is the later sha, not both.

## AN INSTRUCTION IN FLIGHT IS NOT AN INSTRUCTION RECEIVED

**2026-09-04, 01:40 ET.** This seat sent *"STOP BEFORE YOU DEPLOY `b2399a2`"*.
It queued behind Ops's in-flight turn. **Ops was already deploying.** Third
crossed message of the night and the first that cost something.

**A build can be redone; a deploy cannot be unshipped.** So a hold is the one
message where the gap between sent and received is expensive, and every earlier
crossing had trained the desk to treat crossing as merely wasteful.

**RULE, EFFECTIVE IMMEDIATELY: a deploy hold is not assumed to land.** If it
must be honoured it says **HOLD AND ACKNOWLEDGE**, and the recipient confirms
before acting. Absent that, the standing instruction governs and **the deployer
was right to ship on what it had.** Ops committed no error here; the protocol
did.

## THE FAILURE WAS CAUSED BY WORK THAT DID NOT NEED DOING

**The deploy failed on `database is locked` and the desk was down ~80
seconds.** `SCHEMA_VERSION` 23, store at 23, **a migration with nothing to
do** — taking a lock it had no reason to take, contending with the market
worker's connection, `busy_timeout` expiring at 5s. **Item 0e, the upgrade
transaction running unconditionally on every open, moved from a theoretical
stall risk to a realised outage on a payload that changed two dashboard files.**

**The pre-registration paid, and it paid by ELIMINATION rather than
confirmation.** Cause 2 — `ensureDeepHistory`'s long transactions — was ruled
out on evidence: **zero research deep fetches in the window.** Naming both
candidates before the failure meant the failure could distinguish them.

**Three things kept it at 80 seconds instead of 2026-08-25's 3h22m.** The deploy
script **refused to start anything against a failed migration and said so** —
the silent hang was what cost three hours that day. **Capture never stopped**,
because market was the one process left running. And restoring forward was safe
**because the release expected 23 and the store read 23**, checked rather than
assumed.

**AND THE NEAR-MISS IS THE BETTER ENTRY.** Ops was about to report the
observable had FAILED, remembering the chip's gate as carrying a
`displayedFloat === null` disjunct — which would have moved the population
enormously. **The disjunct was real, on 2026-09-03, in an older release, and had
already been removed.** It diffed the two shas instead of asserting and the
false alarm never left its session. **Memory of an artefact is not the
artefact** — the third time in one night that someone's own record, not the
system, was the stale object.

## UNMATCHED IS NOT UNREACHABLE, AND A FORMAT CHANGE DISSOLVED A RECORDED IMPOSSIBILITY

**2026-09-04, hours after the parser shipped.** Every float cell on the live
board turned out to carry a **`; N SO` suffix** absent from the thirteen strings
the parser was built against. The allowlist refused all of them — **correctly**,
since unrecognised trailing text refuses by design — which meant the column was
empty again within hours of being fixed.

**The danger was not the refusal. It was the obvious repair.**
`"537,665 displayed; 785,655 SO"` carries **two numbers, and only the first is
the float.** A wider regex would have captured shares outstanding into the one
column that must never hold one — **silently, on every row, looking exactly like
a coverage win.** R&D's NWTG trap, 1.92x wrong, arriving in a shorter costume.

**Research's design is the entry: A SPLIT, NOT A LONGER PATTERN.** Split the cell
on `;` **before any numeric parsing**, apply the existing float grammar to the
head, validate each tail clause against its own allowlist, and refuse the whole
cell on anything unrecognised. **The float grammar is then applied to a substring
that provably cannot contain the SO number.**

**A wider pattern leaves the wrong number in a capture group that a later edit
could read by reordering. That is UNMATCHED. This is UNREACHABLE.** The
distinction is the whole of the safety, and it is structural rather than careful.

**AND THE TAIL IS NOT NOISE — IT IS THE OTHER HALF OF THE RATIO.** He is now
writing float **and** shares outstanding **in one cell, one source, one
instant.** Item 28 recorded that this pair could not be assembled — float from a
live Sheet read, share count from a dossier written days earlier,
*"asynchronous by construction"*. **That constraint is gone**, and not because
anyone solved it: **the trader changed his own format and dissolved it.** The
`float > shares` check and the 2% unit-mismatch rule, both already implemented,
become available with no capture, no migration and no join.

**One of the five live rows already trips it.** `"6,109 displayed; ~1.05M SO"`
is **0.58%**, under `UNIT_MISMATCH_RATIO` — the desk's own rule calls that a
**probable unit error, not a tiny float.** So a head-only parser would have put
a suspect number on the board looking like a win: **the greedy-capture failure
arriving by a second route**, and the reason to parse both halves and hand the
pair to `assessFloat` rather than invent a second checker.

**THE CAVEAT WAS LOAD-BEARING AND ITS OWN AUTHOR DID NOT ACT ON IT.** Research
wrote that the allowlist refuses silently, that something must surface the
given-but-unread count, and that twelve-of-thirteen was **one sample, one day,
thirteen strings**. **The very next live read refuted the sample.** That is not
the caveat being vindicated — **it is proof the caveat mattered and nobody built
the thing it asked for**, so a format change emptied the column again and it was
found by a person reading raw strings at 01:35 rather than by the signal that
already exists in the data.

## EXISTENCE NEEDS NO DENOMINATOR; THE RATE DOES

**Ops, 2026-09-04, reporting a live defect without a population.** Asked how many
rows carry UNKNOWN structure **and** a parsed float, it found four — **AOUT,
CHPT, DLTH, TLYS** — and refused to give the proportion.

**The reason is that the only population available was the censored one:** 16
names from a post-market API reading, the same read where it asked for 50 and got
17. **So "4 of 12" would be a rate over an unstated population**, and it would
have been quoted as a board figure within the hour.

**What survives without a denominator is exactly what was claimed: the
population is NON-EMPTY, and here are its members.** An existence claim is
complete without a denominator. **A rate is not a claim at all until its
population is named.** That is the cleanest statement of this desk's oldest
failure that anyone has produced, and it arrived as a refusal rather than as a
rule.

**And it was a refusal of the tempting kind.** A count there would have been
precisely the good-news-shaped figure recorded three hours earlier as the thing
that stops people auditing a population — **the same thread, the same evening,
declining to repeat it.**

## THE COUNT I GATED ON CAME BACK NON-ZERO, SO THE GATE MOVED

**This seat, 2026-09-04.** I held `b2399a2` behind "Design verifies what is live
first", writing that **if the affected population were zero the fix would be
right and much less urgent.** Ops resolved it: four rows, on his board, three
created by the parser turning `"23.75M displayed"` and its siblings into
numbers. **The premise of the hold was the unknown count, and it was answered.**

**The gate itself was also wrong in shape, which matters more than the count.**
"Do not ship on top of unverified work" is correct when changes **stack on one
surface**. The structure chip and the supply pair are **independent surfaces** —
if the null-floor row proves wrong, that is a new fix, not a reason to leave a
false sentence on four rows overnight. **A general principle applied where its
condition does not hold is the event-versus-condition failure**, committed by
the seat that keeps recording it.

## A BOUND IS VALIDATED BY ITS SUBTRACTION, NOT BY ADJUDICATING ITS ANSWER

**Research, 2026-09-04, `2600b4c`, confirming a challenge and then improving
it.** To validate *"float is at most X"* **you never need the true float.** You
need the subtraction to be sound, and that is checkable against the filings
themselves. **The fixture set settles disagreements between parsers producing a
float FIGURE — that is Route 1's problem, and Route 2 does not inherit it.**

**So the question in front of the trader was priced for the route we may not
take.** And the sharper form: **the fixture set buys Route 1, and Route 1 is
capped at ~9%.**

**BUT THE CHECK I NAMED AS NECESSARY IS NOT WHERE THE BOUND BREAKS.** *"Was this
holder really an affiliate"* is **avoided by construction** — subtract-only-what-
is-proven means an unproven holder is never subtracted. Cheap, necessary, and
not the risk.

**The dangerous failures are ARITHMETIC rather than classificatory, and all
three push the bound TOO LOW** — which passes pillar 5 and puts him in a trade:

- **STALE SHARES OUTSTANDING UNDER DILUTION.** The denominator is too small
  because the company issued since filing. **Measured: 39% stale over 180 days,
  median 82 — and it CONCENTRATES ON THE NAMES THAT DILUTE HARDEST.** The error
  is largest exactly where the answer matters most. This is the one to design
  against.
- **BASIS MISMATCH** — a pre-split holding subtracted from a post-split count.
  **Guard already shipped** in the supply pair's `split_factor` and its coverage
  refusal.
- **DOUBLE COUNTING** — one holder appearing in both a Form 4 and a 13D. **Not
  yet addressed.**

**None of those needs an adjudicated float either**, so the conclusion survives
and strengthens: what Route 2 needs is a sample confirming subtracted holdings
are **affiliates, on the denominator's basis, and not double-counted** — all
three verifiable against the filing that states them.

**And R&D's `1.92x` NWTG trap does not transfer.** *"Based on N shares
outstanding, of which M held by non-affiliates"*, capturing N instead of M, is a
**Route 1 parsing error. Route 2 never reads that sentence** — it reads a cover-
page count and an ownership form.

## A FLAGGED LINK AND AN ASSERTED LINK ARE THE SAME WORDS AND DIFFERENT OBLIGATIONS

**Research, 2026-09-04, on the improvement I had dismissed as marginal.** I noted
that my third invented link of the night was at least **flagged as unverified
while sending it**, and called that the whole of the improvement — meaning it was
small. Research refused the framing: **"I checked it BECAUSE you flagged it."**

**An asserted link and a flagged link contain the same claim and place opposite
obligations on the receiver.** Asserted, it is a premise to reason from — which
is precisely how it propagated to Research as a sequencing rule and to Design as
a build order earlier in the same evening. **Flagged, it is a question, and the
thread holding the file answers it in minutes.**

**This desk's recurring failure is a premise crossing a thread boundary and
losing its provenance on the way.** Flagging does not make the claim truer. It
makes the claim *cost the receiver a check instead of a night*, which is the only
part that was ever available to the sender.

## AN ERROR-DIRECTION ARGUMENT IS A BASIS OR A CHECK, AND THE TWO LOOK IDENTICAL

**Research's refusal, 2026-09-10, `5940a66`, of a link this seat flagged rather
than asserted — the fourth time flagging has paid for itself in minutes.**

I put it to Research that its *"the first print stays the first print, even when
that minute leaves the VWAP bucket"* was the **same asymmetry** as the supply
bound: pick the direction where being wrong costs less. **It refused, and the
refusal is sharper than the flag.**

**THE TEST IS WHETHER A SECOND DEFENSIBLE ANSWER EXISTS.**

- **Supply bound: genuinely ambiguous.** `knownActive > SO` reads as proof or as
  a fault, and the seven cases split 3/4. **There are two defensible answers, so
  the cost asymmetry DECIDES it. That is a basis.**
- **Session open: not ambiguous.** `dropVwapMinute` exists so a reconstructed
  volume base is not double-counted — **an accumulator concern that says nothing
  about whether a print occurred.** **One correct answer, so the cost asymmetry
  only CONFIRMS it. That is a check.**

**AND THE POLARITY RUNS OPPOSITE, WHICH IS WHY "SAME ASYMMETRY" WAS WRONG TWICE.**

```
supply bound    expensive error = false AVOID     costs him a trade he should have taken
session open    expensive error = understated Move   makes an extended name read FRESHER
                                                     -> INVITES an entry
```

**On his book those are not the same cost.** A skipped trade costs an
opportunity; an extended entry costs an R. **I called them the same because both
were asymmetries, which is a shape, not a direction.**

**WHY THIS SECTION EXISTS RATHER THAN A CORRECTION IN A TRANSCRIPT:** *"we picked
the cheaper error" invites a later reader to reopen a trade-off.* **Where no
trade-off exists, that sentence manufactures one** — and Research's own comment
was what suggested it, so the reading was correct and the comment was the defect.
**It reordered the comment to put the reason first and the direction second.**

**The limit on [AN UNSETTLED QUESTION CAN BE RESOLVED BY ERROR DIRECTION](#an-unsettled-question-can-be-resolved-by-error-direction-instead-of-by-answering-it):
that move is available only while the question is genuinely unsettled.** Applied
to a settled one it does not resolve anything — **it unsettles it.**

## AN UNSETTLED QUESTION CAN BE RESOLVED BY ERROR DIRECTION INSTEAD OF BY ANSWERING IT

**Research, 2026-09-04, `ebeb9bb`, answering the trader's "why can't we compute
a float ourselves and label it".** The answer is yes — **and the thing to build
is better than what he asked for.**

**He proposed a labelled ESTIMATE. What the method actually yields is a BOUND.**
Because we can only subtract affiliates we FOUND, **true float is at most our
number.** So an upper bound below 10M is a **proof that pillar 5 holds**, not an
estimate of it; above 10M it says nothing and must say nothing. *"No more than
X"* is both stronger and honester than *"about X"* — and it puts float in the
same family as `supplyBound` (conclusive when high) and the volume bound
(conclusive when low) rather than leaving it the one soft number on a desk of
hard ones.

**AND THE 13G BLOCKER DISSOLVED WITHOUT BEING SETTLED, which is the part worth
copying.** Whether 13G filers are passive has been open for weeks. The
resolution is not an answer, it is the **error direction**:

- **Miss an affiliate** → float too HIGH → fails pillar 5 → **he skips a name.**
  Conservative.
- **Subtract a passive holder** → float too LOW → passes pillar 5 → **he takes a
  trade.** Dangerous.

**So subtract only what is PROVEN an affiliate, and the unsettledness resolves
safely by default.** The question stops being load-bearing. That is
name-the-condition discipline applied to an **epistemic gap** rather than to a
rule, and this desk had not done it before.

**Both header objections moved rather than being overruled.** The supply bound
does NOT stand in for a float — it answers how much filed supply is live against
shares outstanding, pillar 5 asks whether tradeable float is under 10M, and the
floor renders on 5.6% of tickers. **That sentence was written before the bound
reached a screen**, which is the borrowed-premise-perishes rule catching a
premise inside our own source file.

**Feasibility was never the objection:** Forms 3/4/5 on 39 of 40 issuers, 13D/G
on 70%, a denominator on 185 of 231. **And the degradation is graceful** — if
13D/G cover pages prove unparseable, the bound falls back to shares outstanding
minus Section 16, **looser and still an upper bound.**

**MY THIRD INVENTED LINK OF THE NIGHT SITS INSIDE THIS ONE.** I told Research
its 19-20 tickers were filed-share-count coverage rather than float coverage,
on R&D's reading of `float.ts`. **Both threads were right and only my link was
false:** the module produces no float, AND Research's excerpts are
issuer-stated public floats — non-affiliate share counts from baby-shelf
calculations — **beside** `float.ts`, not inside it. MNDR walking 3,326,123 →
2,136,640 across successive filings settles which quantity it is; shares
outstanding does not decline like that. **Two true statements about two
artefacts, joined by an assertion nobody had checked.** The only improvement
over the earlier instances is that I flagged it as unverified while sending it.

## TWO EXPLANATIONS IDENTICAL IN THE DATA, SEPARATED ONLY BY A CHECK OUTSIDE IT

**Ops, 2026-09-04, closing the orphaned-worker question.** The signature was
real: 47 FAILED and 108 PARTIAL jobs with `completed_at` **set** — terminated,
not frozen — which means a worker was alive and failing them. That is the
signature an orphan leaves.

**It is also the signature a cutover leaves, and the stored data cannot tell
them apart.** The local desk kept running after production took over on 08-17,
and its jobs began failing **because** production had taken over: one SIP
connection per account, production holding it, the local worker unable to get
what it needed. **Last COMPLETE queued 19:00, first FAILED 19:30, zero overlap —
a cutover boundary, not a decay curve.** Then it was shut down.

**Nothing in `research_jobs` distinguishes those two stories.** Only the process
list does, and the process list is not in the database. **So a check whose
expected result was "nothing" was still worth its cost** — it did not merely
fail to find an orphan, it selected between two readings that the evidence
alone left tied.

**AND THE INSTRUMENT MATTERED MORE THAN THE RESULT.** `ps -W` returned nothing
first. Ops rejected that as **too weak to close a SIP question on** and re-ran
with `Get-CimInstance Win32_Process` against full command lines, plus production
corroboration — market `LIVE`, `messageAgeSeconds` 1–3, one continuous
connection since the 19:04:51 restart, **no silent kill and reconnect in the
log, which is what a competing connection would have produced.**

**A negative is only as strong as the instrument that produced it.** This desk
already records *a check that cannot fail*; this is its neighbour — **a check
that can fail but is too blunt to**, and which returns the comfortable answer
either way.

## THREE POOLED FIGURES IN ONE DAY, AND EVERY ONE WAS THE REASSURING NUMBER

**2026-09-04, counted by R&D after producing two of them:**

    Ops    15.1%   pooled 30.8% movers with 9.1% non-movers
    R&D    10.5%   pooled a live era with a dead one
    R&D    19.8%   pooled a working pipeline with a broken one

**R&D caught Ops's within the hour and then made two of its own in the four
hours after.** Its conclusion, which is the entry: **recognising this shape in
someone else's number is not the same skill as noticing it in your own.** The
pair to *quoting a rule feels like having applied it* — both describe a
competence that fires outward and not inward.

**And "reassuring" needs the precise reading, because two of the three were bad
news.** 10.5% made the free path look hopeless. What made it reassuring was not
its direction but that **it SETTLED something** — vendor-or-nothing, decided, no
further work needed. **A figure that closes a question is comfortable whichever
way it points**, and that comfort is what stops anyone asking what went into it.

**The mechanism underneath all three is one move: a population that changed
state mid-window, averaged across the change.** Movers and non-movers, live era
and dead era, working pipeline and broken one. **The average is always real
arithmetic over a set that stopped being one thing.**

## A LIVE TABLE JOINED TO A DEAD ONE READS AS A CAPABILITY GAP

**R&D, 2026-09-04, retracting `4.5%` and `3.9%`.** `symbol_desk_day` spans
thirteen sessions because it is built from the **production** extract.
`research_sources` is **local**. Joining them measured the difference between a
live board and an abandoned table — **and that difference renders exactly like a
method that fails on 95% of names.**

**The local store did not stop researching on 08-18. It stopped everything** —
minute bars, `ticker_session`, `desk_events`, `desk_assessments`. Which means
**the store answered the question against itself**: a research outage does not
take minute bars with it, so no production query was needed to refute it. The
check was available locally and cheaper than the one I commissioned.

**What survives is `69.2%` / `89.1%`, and its caveat changed rather than
lifted:** valid because both stores were live 08-17..08-18, **and thin for the
same reason — two sessions, 91 tickers.** The era qualification was wrong; a
sample-size one is right.

**And the failure shape is sharper than a backlog.** Last COMPLETE queued
19:00, first FAILED queued 19:30, **zero overlap**, `completed_at` set on all 47
FAILED and all 108 PARTIAL. **They terminated; they did not freeze.** A pipeline
that broke at a moment and failed everything after — 27.2% before it, 0.0%
after. **Only 7 QUEUED never ran.**

## A RESULT IN THE EXPECTED DIRECTION SUPPRESSES THE CHECK ON THE POPULATION

**Ops, 2026-09-04, against its own live reading, minutes after using the same
warning on someone else.** It queried the top **50** for the post-deploy float
count and the API returned **17 rows**. It did not notice — **because 17 was
more than the 13 it expected, and it read the increase as the parser working.**

**That is R&D's censored boundary arriving inside the very read that was
commissioned to avoid it.** `best_rank` runs 1..25 because capture stops at 25,
so a top-50 query returns top-25 rows and reads as full coverage of a boundary
never observed. The warning had been sent to Ops that same evening, in writing,
naming this exact query shape.

**The mechanism is the part worth keeping.** A wrong population normally
announces itself as a surprising number. **Here the number was surprising in the
DIRECTION THE HYPOTHESIS PREDICTED**, and a confirmation is the one result
nobody audits. The censoring was not hidden by being subtle; **it was hidden by
being good news.** So the check cannot be "does this figure look right" — a
figure that looks right is exactly when the population goes unexamined.

**Ops caught it before the number travelled and refused to let 16-of-17 stand as
board coverage.** It is coverage of the rows the API returned. The board read
now waits for a settled premarket or RTH board **with the boundary named and
slots-versus-names stated**, because a purchase is being priced against it.

## THE OBSERVABLE THAT COULD FAIL IN BOTH DIRECTIONS DID ITS JOB

**`fff1f1d`, live 2026-09-04.** The float parser's check was written so that a
pass required a number rather than a direction:

    PARSED             1 (AKAN)  ->  16 of 17
    GIVEN BUT UNREAD  12         ->   1  (TENX)

**Exactly 1, and it is the right one.** Above 1 would have been an uncovered
phrasing shipping the old defect in a new costume; **0 would have been WORSE
than the bug**, because it would have meant TENX's `"~50M share base — OUT OF
FLOAT RANGE"` parsed and a share count entered the one column that must never
hold one. **A one-sided check passes on both of those.**

**Twelve floats the trader wrote weeks ago are numbers on his board tonight**,
recovered at zero collection cost. And the market worker stayed deliberately on
`6d368dc` — no restart, no SIP downtime, capture untouched.

**One further habit worth the entry:** Ops read the clock after deploying,
briefly believed it had shipped across the 22:00 recap, and **reconstructed the
timeline rather than trusting the impression** — preflight 21:12, web up 21:14,
recap COMPLETE 22:00:00.5 on the new release, 46 minutes clear. The two hours
were time spent in other exchanges, not deploy duration. **The extrapolation
habit caught by reading, in the case where the answer was that nothing was
wrong** — which is the case that normally goes unchecked.

## A REFUSAL AND AN ABSENCE RENDER THE SAME, AND THIS DESK ALREADY KNOWS BETTER

**Research, 2026-09-04, against its own fix.** The new float allowlist **refuses
an unrecognised phrasing silently** — and that is the exact property that let
twelve floats be discarded for weeks. A wording nobody allowlisted returns null,
the column renders blank, and **a blank already means "no float was supplied."**
Two states collapsed into one rendering: *supplied and unreadable* is
indistinguishable from *never written*. **A correct parser with the same failure
mode as the defect it replaced.**

**The signature exists in the data and nothing reads it:** raw non-empty AND
value null = **given but unread**. `floatField` preserves raw through a refusal
and the tests assert it. Detectable today; nobody looks.

**AND THE DESK ALREADY SOLVES THIS EXACT PROBLEM ONE SUBSYSTEM OVER.** The
activity gate distinguishes `undefined` — did not survive a store round-trip —
from `'UNKNOWN'` — the engine looked and could not say — and treats them
differently on purpose. **Same distinction, honoured in activity, collapsed in
float.** The lesson did not fail to be learned; it failed to be carried across a
module boundary, which is worse, because there was no way to notice its absence
from inside either module.

**The deploy check was written to fail in both directions:** given-but-unread
should read **exactly 1** — TENX, refusing correctly. Above 1 is an uncovered
phrasing shipping the old defect in a new costume. **Zero would be worse than
the bug**, because it would mean TENX parsed and a share count entered the one
column that must never hold one.

## QUOTING A RULE FEELS LIKE HAVING APPLIED IT

**Research, 2026-09-04, counting its own: the fourth time in one day it broke a
rule it was actively quoting.** It wrote *"mostly dark because we discard it"*
with the denominator sitting in the same message as the ratio — **while spending
that evening telling other threads to say what a number is denominated in.** Its
diagnosis, and it is better than carelessness: **the act of quoting a rule
supplies the feeling of having applied it**, and the feeling is what stops the
check from happening.

**This seat produced the same shape three times tonight in a different
register.** Ops was asked to verify my deploy list rather than compose from it —
my own instruction, on my own practice — and **half of it was already live, with
three further commits missing.** Third time in one evening **my record was the
stale object**, having written the staleness rule myself and quoted it in the
instruction that caught it.

**So the rule is not "remember the rule."** It is that a rule you can recite is
one you will skip, and the only thing that reliably catches it is **an external
reader with the artefact in front of them** — Ops with the box, Research with
its own fixture, R&D with the column map. **Every catch tonight came from
someone else holding the object, never from the author remembering.**

## I ASKED FOR THE CHECK AND SHIPPED IN THE SAME BREATH

**This thread, 2026-09-04.** I relayed Research's headline to the trader —
*"pillar 5 isn't dark for want of data, we throw the data away, twelve of
thirteen"* — and **in the same turn** wrote to Research: *"say if you think that
overstates it before I send anything further on it."* **It did overstate it. The
substance was already gone.** Asking for a check and acting before the answer
arrives is not verification; it is verification-shaped, which is worse, because
the request creates a record that looks like diligence and the recipient
reasonably believes they were consulted in time.

**What was wrong: a RATE quoted as a COVERAGE claim.** We discard 92% of the
float strings we are given — true. We are only given a quarter of them. **Thirty-
seven of fifty top names carry no float string at all, so there is nothing to
discard.**

    today, top 50        1 of 50    2%
    after the parser fix 12 of 50   24%
    still blank          38 of 50   76%

**So the fix is worth taking and does not solve pillar 5.** It moves float from
essentially absent to a quarter covered, and **three-quarters of the board stays
blank.**

**The consequence is why this one had to be chased down rather than filed.** The
misreading — *a bug fix solved float* — is precisely the one that would stop him
buying the thing he actually needs, **and I had asked him about the vendor
decision in the same message that carried the overstatement.** A wrong number
next to an open question is not an error waiting to be corrected; it is an input
to a decision already in flight.

**Two threads produced this and the mechanism was identical in both.** Research
quoted a ratio in the headline of its own inventory and let it stand as
coverage. I relayed it without asking what the denominator was. **Neither of us
was wrong about the ratio.** This desk's oldest failure, arriving in the
sentence written last and read first.

## NAME THE DENOMINATOR — IT SEPARATES TWO QUANTITIES THAT A PROVENANCE LABEL WOULD HAVE MADE COMPARABLE

**Design, 2026-09-04, `46794fb`, solving a problem this seat had posed
badly.** I flagged that the desk's supply pair would now render beside the
Sheet's prose "Overhang / Float" and asked that they not read as equals —
suggesting a **provenance label**. Design refused the shape and was right: a
provenance label says *these are two accounts of one quantity, pick one.* **They
are not.** The Sheet's is an approximation **of the float**; the desk's is a
bound **against shares outstanding.** The heading now reads *"Supply against
shares outstanding"*, and naming the denominator makes them **visibly
non-substitutable** rather than merely differently sourced.

**And the copy rule underneath it is the part worth stealing.** The denominator
is **never called float, on any shape, and tests assert the word appears in no
field.** The reason is arithmetic, not taste: **float can never exceed shares
outstanding**, which is exactly why dividing by the share count yields a
guaranteed **lower bound** — so writing *"of float"* silently converts a bound
that is always true into a **point estimate that is usually wrong**. One word,
and a conservative claim becomes a false precise one.

**This is the basis rule arriving in COPY rather than in storage.** The desk
already knew to store a value with its basis. Here the basis had to survive
into the rendered sentence, because **the reader does the division in their
head from whatever noun is next to the number.** A correct value under a wrong
noun is a wrong reading, and no amount of correctness upstream repairs it.

**Two further calls of Design's that the record should keep:** a null floor
**still shows the filed maximum**, because nothing proven live is entirely
compatible with a great deal filed and suppressing the second would hide the
alarming number on exactly the rows where it is the only one. And **it did not
retire the Sheet's version** — under lose-no-capability, removing the prose
overhang line removes a capability rather than a dependency. What the change
does is make it **removable**: the desk's number now stands on its own basis
beside it, which is the precondition for retiring the Sheet's, not a substitute
for having done so.

## A TRUE FIGURE AND A TRUE CONCLUSION, WITH AN INVENTED LINK BETWEEN THEM

**This thread, 2026-09-04, clearing a retirement on evidence belonging to a
different task.** I told the trader the **06:10 task** was safe to retire **"on
the number — ~2% top-50 Sheet-float coverage."** The figure was correct. The
conclusion was correct. **The 06:10 task does not write float.** Column I is
written by the **22:00** after-hours task, which runs the universe discovery and
the structure check and sets Float Quality and Overhang; the premarket task
writes T:AA — PM price, volume, catalyst, Confirmation, Revised Priority — and
**not one of those fields is float.** The real justification was the one from
two days earlier and still stands: three desk-read fields with wired fallbacks.

**So nothing here was WRONG, which is precisely what made it invisible.** Every
prior entry in this file catches a false number or a false call. This is a true
number attached to a true call **by a load-bearing claim nobody checked, because
the answer looked right and checking felt like re-litigating a settled thing.**
A conclusion is not evidence that its stated reason is the reason.

**AND IT PROPAGATED AS AUTHORITY.** Research reasoned correctly from what I gave
it and arrived at *"fix the parser, re-measure, then decide the retirement"* —
sound logic, aimed at the wrong task, and it would have **stalled a retirement
that was never coupled to the parser at all.** A borrowed premise does not
announce itself as borrowed once a peer restates it in its own words.

**The mechanism is the fifth name collision on this desk:** *"the Sheet's float
dependency"* meant two different tasks inside one sentence, and neither speaker
noticed because the phrase is true of both. **A phrase true of two objects is
where a conclusion crosses from the one it was proved about to the one it is
being applied to.** The check is cheap and neither of us did it: the audit maps
column I, and the task definition names its own range.

## "WHAT CAN WE DROP" AND "WHAT MUST WE PRODUCE" ARE THE SAME AUDIT WITH OPPOSITE SIGNS

**The trader, 2026-09-04, setting a direction rather than answering a question.**
He wants the app **monetizable**, does not accept external ChatGPT tasks plus a
Google Sheet as production-grade, and **will not give up capability to get
there.** Three sentences, and they invert a workstream this thread had been
running for two days.

**The Sheet exit had been an audit of what nothing reads.** Every finding was
cheerful — the archive tabs feed nothing, task 2's three fields have wired
fallbacks, float coverage at the top of his board is ~2%. Each one shrank the
dependency. **Under "lose no capability" every one of those findings changes
sign.** A capability the desk does not consume is no longer free to drop; it is
either genuinely dead or **being lost to neglect rather than to a decision**,
and the audit that was retiring things is now costing them. Same facts, same
document, opposite conclusion — **because the question changed and the findings
were phrased as answers to the old one.**

**AND THE REASON IT IS BLOCKING IS NOT THE ONE ANYONE ARGUED.** This thread had
been defending the Sheet on robustness — it works, the desk barely reads it,
the failure modes are known. **Robustness was never the binding constraint. The
Sheet is SINGLE-TENANT.** It lives in his personal Google account, written by
tasks in his personal ChatGPT account, and **a second customer cannot have it —
not a degraded copy, not a shared one, none.** So it is not that the setup is
fragile and should be hardened; **it is that the product cannot have a second
user while any of it is on that path**, and no amount of making the Sheet more
reliable moves that. A dependency can be perfectly sound and still be
disqualifying, and this desk graded it on the wrong axis for two days because
the trader's goal had not yet been stated.

**Which relocates the float problem.** Float was a data-quality item — a broken
parser, thin coverage, a parked extractor. Under monetization **it is the
product's only genuine blocker**, because it is the one capability the Sheet
provides that the desk does not, and it must be produced FOR ANY USER rather
than written by him for himself. The measurement that decides it is coverage
against real board populations with **latency counted as part of coverage**: a
float derivable in a week for a name he trades in the first thirty minutes
covers nothing, and a figure that quietly counts it makes the free paths look
sufficient and talks him out of a purchase he needs.

**The trap now standing, and it is recorded because it is live:** today's
observed float coverage is near zero *because the parser is broken*, not
because the Sheet is thin. **Measuring the defect and reporting it as the
Sheet's capability would make self-containment look cheaper than it is.** The
comparison has to be against what the Sheet would give working — which is the
same coupling that already threatens the retirement from the other side, where
fixing the parser reintroduces a dependency he retired on the broken behaviour.
**One defect, two decisions, and it flatters both of them in opposite
directions.**

## Working rules

- **A CAVEATED WRONG NUMBER ANCHORS EXACTLY AS HARD AS AN UNCAVEATED ONE.**
  *Ops, 2026-09-03, against its own figures — and this seat published them.* Ops
  produced a method-validation reading, labelled it inflated and provisional,
  and relayed it; this thread passed it to the trader with the caveat attached.
  The real measurement hours later was **25% and 24% against 50% and 80%** —
  wrong by two and three times, warning notwithstanding. **The caveat did not
  survive contact with the number.** Ops's own conclusion is the rule: hold a
  method-validated figure rather than shipping it with a warning, when the real
  measurement is hours away. For this seat specifically: **a preliminary number
  relayed to him is a number he now holds**, and the retraction costs more than
  the wait would have.
- **A rendering decision can silently constrain a spend policy, and this seat
  is where that happens.** *Research, 2026-09-03, framing an error of mine more
  usefully than I had.* Asked whether a dropped name should vanish or show as
  dropped, this thread answered *"keep the row and flag it"* — correct about the
  surface, and it also decided that dead names keep their rank, which is what
  the research queue and the subscription cap read. **A live name at rank 13
  would have been denied both by a corpse at rank 3.** Research's version is the
  keeper and is gentler than mine: not a routing lapse, but **evidence that
  rendering and policy were never separable, because one field carried both.**
  So when routing a question about how something LOOKS, ask what else reads the
  field the answer preserves — the enumeration is cheap and the answer is
  usually "more than the person asking knows".
- **A SUPERSEDING TABLE IS NOT A RETRACTION.** *R&D's formulation, 2026-09-03,
  after this thread sent the trader a figure and later sent a corrected one for
  the same quantity.* Sending better numbers does not withdraw worse ones: **the
  reader has to already know which is newer, and he has no way to.** He ends up
  holding two values for one thing with no rule for choosing. So when a number
  already delivered turns out wrong, **name the earlier sentence and retract
  it** — quoting it back if necessary — rather than letting a fresh table do the
  work silently. This costs three lines and is the difference between a
  correction and a collision.
- **A premise inherited from another thread's charter needs the same check as
  one of your own.** *Research's formulation, 2026-09-03, crediting Ops's
  catch; it applies to this seat hardest, because relaying premises is the
  job.* "The WAL is growing" travelled from Ops's charter through this thread
  to the trader as a named hazard, and the WAL was byte-identical across
  twenty hours of the heaviest write load the desk had carried. **A borrowed
  premise arrives pre-trusted and is exactly as perishable as a measured one.**
  Same family as *verify, do not relay* — but that rule is about claims, and
  this one is about the assumptions underneath them, which nobody re-reads.
- **Once production runs a composed sha, ancestry stops being the test and
  content becomes it.** *Ops's correction, 2026-09-03.* This seat verified that
  window 2's sha descended from `bc78d49` while production was already on the
  composed `7f4aa91` — not an ancestor of the tip, so pure ancestry read as
  rollback risk in one direction and false safety in the other. The question
  that mattered was whether the changed files were byte-identical between the
  two shas. Check content across the composed boundary; ancestry resumes once
  production rejoins the main lineage.
- **Verify claims against the system, not against a transcript.** The false pin
  claim came from reading a deploy log instead of asking `pins.sh`.
- **Corrections land in the document.** A charter that is wrong is worse than no
  charter, because threads act on it.
- **Stay small.** This thread's output is edits to `docs/threads/` and answers to
  cross-thread questions. If it is producing anything else, something has gone
  wrong.

## Opening message for a new chat

*Rewritten 2026-09-10 by the sixth Integration session. The 2026-09-09 version is
in git history; it predates his reporting correction, which is the change that
matters most.*

> This is the **Integration thread** for the Momentum Intelligence desk at
> `A:\mointel`. Read `docs/threads/integration.md` completely, starting with
> **LIVE STATE**, then `docs/threads/README.md`. Everything else is on disk and
> linked from those two. **Where LIVE STATE and anything above it disagree, LIVE
> STATE is right and the rest is stale.**
>
> **First action, before anything else: title this session `Integration`.** Peers
> find you by that title in `mcp__ccd_session_mgmt__list_sessions`. Until it is
> set, nobody can reach you.
>
> **You own the seams.** The charters, decisions that cross threads, reconciling
> what two threads believe, and making sure a correction lands in a document
> rather than only in a chat. **You do no product work** — no code, no deploys,
> no analysis. The moment you build something you have become a seventh worker.
>
> **You are the message bus for six threads** — Ops, Research, Design,
> Commercial, R&D and Coaching. They cannot all address each other and I am not
> a transport. **Addresses come from `list_sessions` every time — never
> `ListAgents`, never a `from` attribute, never one asserted in a message.**
>
> **FINE POINTS IN PLAIN LANGUAGE, NOT BACKGROUND.** *This is the correction the
> sixth session needed most, and it broke the rule all day while quoting it.*
> **Give me the point, not the derivation that produced it.** The reasoning is
> load-bearing for the thread that found it and background to me — I trust you
> got the why right, I need the what. **Test every sentence by deleting it: if
> nothing I would do changes, it was background.** Say it the way you would say
> it out loud. **Never paste another thread's message to me.**
>
> **Four standing delegations.** Order-and-process calls are yours to decide
> rather than refer. **You may instruct deploys** — approve **the enumeration,
> not a sha**; only Ops performs them. **You may relay my yes for PRODUCTION
> WRITES** — not restarts, and never payment or credential entry, which is not
> mine to waive. **Spend, auth-model changes and destructive actions still come
> to me.** Anything needing my judgement goes at the END of your reply under
> `## What I need from you`, with nothing after it.
>
> **Six practices, each recorded in your charter with the incident that produced
> it:**
>
> - **Read what a thread SAID, not what it committed.** Commits do not carry
>   questions. Read every `## What I need from you` first, every time.
> - **FLAG, DO NOT ASSERT.** *Every error the sixth session made was caught in
>   minutes because it went over as its seat's own reading.* **An asserted link
>   costs someone a night; a flagged one costs them a grep.**
> - **Verify, do not relay** — and **a relayed instruction is not an
>   authorisation.** "Ops can do that" said to one thread does not authorise
>   another; the same words said to it do. **The channel is the thing.**
> - **Do not name a sha.** A hash is a carried reading and it decays. **Ops
>   enumerates the tip BY THREAD at the moment of shipping; you approve that
>   enumeration.**
> - **Take the clock from `zoneinfo` at the moment of use.** **An announced date
>   is not a reading** — this host runs six hours ahead of the desk and announces
>   its own midnight.
> - **Do not inflate what is pending on me.** Every item costs attention and
>   hides the real ones. **And before asking a thread to confirm something, check
>   whether you were its source** — otherwise you get your own claim back with a
>   second name on it.
>
> **`git commit --only <paths>`. Never `git add -A`, and `git add <path>` first
> does NOT save you** — five sessions share one index and the commit takes all
> of it.
>
> The other threads will correct you often and they will usually be right. **That
> is the system working: the correction is reliably the owner's and the noticing
> reliably is not.**
>
> **Start by reading LIVE STATE, then check all six threads — what they said, not
> what they committed — and tell me what is outstanding and what is stale.** Do
> not assume anything in LIVE STATE is still true.

It is also committed at the bottom of `docs/threads/integration.md`, so he never
needs to reproduce it.


## AN INSTRUCTION TO DEPLOY IS NOT AN INSTRUCTION TO OVERRIDE A GUARD

**Ops, 2026-09-10, offered for the handover over any of its six catches, and it
is right that this is the better entry.**

**He had said ship twice — *"i approve deployment now for all"*, then *"i want to
see it now."*** **Ops was ready to override a preflight refusal on the strength
of it. A permission block stopped it, not judgement.**

**AND WHEN THE DEPLOY ACTUALLY RAN THERE WAS NO WINDOW AT ALL** — nearest
checkpoint an hour behind, next two hours ahead. **The override would have bought
nothing**, and it **would have restarted the assess worker four minutes before
his premarket assessment.**

> **PRICE THE REFUSAL BEFORE OVERRIDING IT. THE PRICE IS OFTEN ZERO** — *and you
> cannot see that from inside the decision, because the thing pressing on you is
> his instruction rather than the clock.*

**AND THE DISTINCTION HE NEVER AUTHORISED:** *"deploy now" is an instruction about
a DEPLOY.* **A preflight refusal is not a hold to be lifted — it is a fact about a
window, and overriding it is a separate act.** **He cannot price a checkpoint
collision; he does not hold the schedule.** *The escape hatch takes a free-text
reason, and this desk has already recorded that a justification field only works
while every entry in it is true.*

**What stopped it was a mechanism rather than a person**, which is the same
finding as the capacity guard holding on the same deploy: **a clean outcome
produced by a guard is not evidence the process priced the risk.** *Twice in one
morning, from the same seat, reported by that seat both times.*
