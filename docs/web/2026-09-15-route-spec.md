# Public route spec — handed to Ops, 2026-09-15

**Written by Web against `dd98782`.** Commissioned by Integration on his go:
Google verification has not passed, he is doing it himself, and it needs
`/privacy` publicly reachable and linked. **This is the whole batch, per Ops's
own request that exemptions arrive as a decision rather than a trickle.**

---

## 0. WHAT THIS BATCH DOES AND DOES NOT DO — read this first

**This section said "the five locations below are individually exempted; `/`,
`/api/` and every other path keep the server-level `auth_basic`" until
2026-09-15.** *Both halves went stale in the same edit: the batch is four, and
`/` is now one of them.* **Corrected rather than annotated.**

**WHAT GOES PUBLIC: `/`, `/privacy`, `/terms`, `/favicon.ico`.** *Four
exact-match locations and nothing else.*

**WHAT THE BOARD'S PROTECTION BECOMES, and it is a real change worth stating
plainly:** *until now the board was protected by `location /` denying by
default.* **After this batch the board is at `/desk` and is protected by the
server-level `auth_basic` still applying there** — *the default did not move,
the board did.* **`/desk`, `/api/` and every unlisted path keep the password.**

> **THAT IS WHY `curl /desk` EXPECTING `401` IS THE FIRST LINE OF THE NEGATIVE
> CONTROL.** *The board's entire protection after the move is an assumption
> about nginx's default, and an assumption is not a control until something
> tests it.*

**Nothing here requires in-app session auth, a status check or a session.** *This
is step 1 of the charter's three-step sequence and it lands without step 2
existing.* **Basic Auth does not come off the board in this batch or the next
one.**

---

## 1. THE FOUR LOCATIONS THAT SHIP, AS STRINGS

**This section was headed "the five locations" until 2026-09-15 and listed
`/signin` and `/auth/` among them.** *The split in §2b deferred those two, and
this section kept standing beside the newer ruling.* **Rewritten rather than
annotated, because a spec with a superseded half is a spec with two answers and
Ops builds from this file.**

**All four are EXACT-MATCH (`=`), never prefix.** *`^~ /privacy` would also match
`/privacy-internal` and `/privacyexport`, so a future path that merely starts
with those letters would be born public.*

```nginx
# The landing page. The ONLY public document at the root, exact-match, so the
# server keeps denying by default for everything else.
location = /            { auth_basic off; <proxy block>; }

# The adopted privacy policy. Google requires it reachable and linked from the
# home page and the consent screen, as the same URL in both places.
location = /privacy     { auth_basic off; <proxy block>; }

# The adopted terms of service.
location = /terms       { auth_basic off; <proxy block>; }

# Tab icon. Falls under `location /` today, so a public page's favicon 401s —
# and that is invisible from every browser on this desk.
location = /favicon.ico { auth_basic off; <proxy block>; }
```

`<proxy block>` is the existing one, copied verbatim from
`deploy/aws/nginx-locations.conf:143` — `proxy_pass http://mointel_app`, the
four `proxy_set_header` lines, `Connection ""`, `proxy_buffering off`, and the
three timeouts. **Nothing about it changes.**

### DO NOT ADD THESE TWO IN THIS BATCH

> **`location = /signin` and `location ^~ /auth/` are DEFERRED, and deferring
> them is load-bearing rather than tidy.**
>
> **`/signin` must NOT be publicly reachable in this batch.** *The first-admin
> bootstrap (§5) is only safe while a stranger cannot reach the sign-in flow
> before he does.* **Opening `/signin` early is how the authority to spend his
> money goes to whoever knocks first.**
>
> **When they do ship**, `/signin` is exact-match and `/auth/` is the one prefix
> in the surface — *it needs to be, because `/auth/google`, the registered
> exact-match callback `/auth/callback/google`, and `/auth/signout` are separate
> paths under it* — **with the trailing slash, so bare `/auth` matches nothing.**
> **`/auth/`, not `/api/auth/`**: the latter inherits Basic Auth from
> `location /api/` and the callback would 401 with no visible cause.

### What Ops also has to build, because a location with nothing behind it 404s

| path | serves |
| --- | --- |
| `/` | the landing artboard — **must exist before the exemption lands, see §3d** |
| `/privacy` | renders `docs/legal/privacy-policy.md` **at request time**, banner driven by `adopted:` |
| `/terms` | renders `docs/legal/terms.md`, same renderer |

---

## 2. HOW TO PROVE IT, INCLUDING THE CONTROL THAT MAKES THE PROOF MEAN ANYTHING

**From an actor with no cached state. Not from a browser on this desk.**

```bash
for p in / /privacy /terms /favicon.ico; do
  printf "%-16s %s\n" "$p" "$(curl -s -o /dev/null -w '%{http_code}' https://tmitrader.com$p)"
done
```

**Expect `200` on all four.**

> **AND THE NEGATIVE CONTROL, WHICH IS NOT OPTIONAL:**
> ```bash
> curl -s -o /dev/null -w '%{http_code}\n' https://tmitrader.com/desk       # expect 401
> curl -s -o /dev/null -w '%{http_code}\n' https://tmitrader.com/signin     # expect 401
> curl -s -o /dev/null -w '%{http_code}\n' https://tmitrader.com/api/market # expect 401
> curl -s -o /dev/null -w '%{http_code}\n' https://tmitrader.com/privacy-x  # expect 401
> ```
>
> **`/desk` IS THE FIRST LINE BECAUSE IT IS THE ONE WHOSE FAILURE MEANS THE DESK
> IS PUBLIC.** *After the move the board's entire protection is that it is no
> longer at `/` and the server default still denies — an assumption until
> something tests it.*
>
> **`/signin` IS IN THE NEGATIVE CONTROL, NOT THE POSITIVE ONE, AND THAT IS THE
> WHOLE POINT.** *It was in the expect-`200` loop until 2026-09-15.* **Run that
> version in Release 2 and it fails — and the obvious repair for a failing
> reachability check is to make the thing reachable, which is pasting the
> `= /signin` exemption that was sitting four lines above it.** *A stale check
> does not merely fail; **it proposes a fix**, and that fix opens the door §5
> depends on being shut.* **Now the check enforces the trap instead of
> undermining it: `/signin` returning `200` in this batch is a FAILURE.**
>
> **`/` HAS TWO VALID ANSWERS AND ONE THAT IS ALWAYS A FAILURE.** *`401` before
> Release 2, `200` after, and `404` at either point means the board moved
> without the landing page.* **A check with two acceptable answers gets read as
> pass/fail against whichever the reader had in mind, so the failing value is
> named rather than inferred.**
>
> **THE NEGATIVE CONTROL CANNOT SEE THE APPLICATION, AND ON 2026-09-17 IT
> PASSED WHILE PRODUCTION WAS DOWN.** *Every public path returned `502`;
> `/desk` and `/api/market` returned `401` and the control reported clean.*
>
> **`401` means nginx refused you. It does not mean the desk is there.** *nginx
> answers those itself, before proxying — so a `401` is identical whether the
> app is healthy, stopped, or has never existed.* **The `502`s are what exposed
> it, and only because those four paths are exempt: before Release 2, when
> everything was `401`, this outage would have been invisible to every check on
> this desk.**
>
> **⇒ READ THE TWO HALVES IN ORDER, NEVER SEPARATELY. If the positive loop is
> not green, the negative control's passes mean NOTHING** — *not "the desk is
> safe", just "nothing is answering".* **A suite that reports eight passes with
> the application stopped is not a suite; the positive loop is the only half
> with an opinion about whether anything is alive.**
>
> *`/api/health` is deliberately loopback-only (`satisfy any; allow 127.0.0.1;
> deny all`) and returns `401` from outside. **That is correct and should stay
> that way** — a public health endpoint is another exemption and exactly the
> kind nobody should publish. **The public pages returning `200` IS the external
> liveness signal**, and no separate probe is needed or wanted.*

> **A batch of exemptions that accidentally opened everything would pass the
> positive loop completely and fail every line here.** *Four `200`s prove the
> holes exist; only the `401`s prove they are holes rather than a missing wall.*

---

## 2b. THE BATCH SPLITS — just not where Integration looked

**Integration tried to split this batch and concluded the home-page link killed
it. The link requirement is real; the conclusion does not follow.**

**Google's requirement, quoted rather than paraphrased** — *Commercial's
transcription of Google's OAuth policies, read 2026-09-10,
`docs/commercial/2026-09-10-auth-providers.md:121`:*

> *"Every production app that uses OAuth 2.0 must have a publicly accessible
> home page. The homepage must include a description of the app's
> functionality, as well as links to terms of service and a privacy policy."*
> — and *"Your homepage can not be only a login page."*

**So my §2 wording was accurate and the softer reading is not available: the
home page itself must carry the links; a consent-screen link does not
substitute.** *Stated as second-hand: this is a direct quotation inside a
research document, not this seat's own read of Google's live pages. Re-reading
those is Commercial's remit and tooling, not Web's.*

**BUT NOTHING IN THAT LIST IS ABOUT SIGNING IN.** *Verification wants a public
home page that describes the app and links to two documents, all on the verified
domain. It does not want a working sign-in flow — the OAuth client already
exists.*

> ### ⇒ THE SPLIT IS `/signin` AND `/auth/`, NOT `/privacy` AND `/terms`
>
> | needed for his verification | can wait |
> | --- | --- |
> | `= /` — the landing page | `= /signin` |
> | `= /privacy` | `^~ /auth/` |
> | `= /terms` | |
> | `= /favicon.ico` | |
>
> **And Integration's own scoping says those two are the real build.** *The
> other three are renderers over text already written and adopted, plus a file
> that exists.* **So the expensive half of this batch is not on his critical
> path at all.**

### And the unblock does not need in-app auth either

**The board moves to its own path and keeps the server-level `auth_basic` it has
today. `location = /` then serves the landing page publicly.**

1. `app/page.tsx` → `app/desk/page.tsx`. **The board changes address and keeps
   its password**, because it is no longer at `/` and the server default still
   denies.
2. A new `app/page.tsx` renders the landing artboard.
3. `/privacy` and `/terms` renderers over the two adopted files.
4. The four exemptions above.

**Nothing in that list requires a session, a status check or in-app auth.** *The
desk stays behind the shared password throughout, exactly as the charter's step
1 intends — and he can submit for verification at the end of it.*

**THIS IS THE STRONGEST ARGUMENT FOR (A) AND IT IS NOT AESTHETIC.** *Under (B) —
one URL serving both — there is no public home page until `auth_basic` comes off
`location /`, which needs in-app auth proven first.* **(B) puts his verification
behind the whole auth build. (A) puts it behind a route move.**

---

## 3. THE QUESTION THAT MUST BE SETTLED BEFORE THE ROUTES ARE CUT

*His words: "yall need to coordinate the login and where the app lives."*

**Two shapes, and they produce different route lists:**

- **(A) `/` is the landing page; the board moves to its own path.**
- **(B) `/` serves a stranger the landing page and a signed-in user the board.**

### Web's recommendation: (A), with (B)'s convenience added later as a redirect

**The decisive argument is not taste, it is that (A) DECOUPLES TWO STEPS THAT
(B) WELDS TOGETHER.**

> Under **(B)**, putting the landing page at `/` means `auth_basic off` on
> `location /` — **which is the exact change the charter says publishes the desk
> to the audience a landing page is built to attract.** The landing page cannot
> ship until in-app auth is proven.
>
> Under **(A)**, the board moves to `/desk`, which keeps the server-level
> `auth_basic` it has now, and the landing page goes public at `location = /`.
> **The desk stays behind the password the entire time, and "the landing page is
> live" stops being the same event as "Basic Auth comes off the board."**

**And (A) keeps default-deny.** *`location = /` is exact match: only the root
document is public. A bare `location /` with `auth_basic off` would invert the
server's default from deny-by-default to allow-by-default, which is a far larger
change than it looks and is not required by anything.*

**Three smaller reasons:**

- **It dissolves an open question.** *Nobody confirmed whether Google accepts a
  home page somewhere other than the domain root (README §3 row 6). Under (A) `/`
  **is** the home page and the question never needs answering.*
- **The two surfaces cache oppositely.** The landing page is static and wants to
  be cached hard; the board is `no-store` and must never be. **One URL serving
  both is one `Cache-Control` decision serving two opposite requirements.**
- **A bug in the session check under (B) exposes the board at the most
  guessable URL on the domain.** Under (A) the same bug exposes a marketing page.

**What (A) costs, stated plainly:** a signed-in trader typing `tmitrader.com`
lands on the landing page rather than the board. **That is real and it is
fixable without giving up any of the above** — `/` issues a `302` to `/desk`
when a valid session cookie is present. *A redirect is an explicit behaviour
that can be added the day sessions work; serving two different documents at one
URL is an architecture that cannot be taken back.*

**This is Web's call jointly with Design and it has gone to Design directly.**
*If the two seats split, Integration takes it to him.*

---

## 3b. SETTLED WITH DESIGN — (A), `/desk`, and NO redirect

**Design agreed (A) on the argument rather than as a preference, answered the
root question with facts, and attacked the redirect. It was right to.**

**THE BOARD'S PATH IS `/desk`**, and the codebase picked it already: `DeskRow`,
`DeskModeProvider`, `deskRead`, `bg-desk`, `useDeskMode`, and "this desk"
throughout the prose. *`DiscoveryBoard` is one surface inside `DashboardShell` —
routing to `/board` would name the whole thing after one of its parts.*

**NOTHING ON THE BOARD ASSUMES THE ROOT** — Design checked rather than guessed:
no `basePath`, no `assetPrefix`, every fetch absolute, `apiBase` defaults to
`/api`. **One `href="/"`, in `ReviewRefusal.tsx:39`, and it IMPROVES under (A):**
*it is the link shown to a reviewer whose token expired, so today it sends a
stranger to a password prompt and under (A) it sends them to the landing page.*

### The redirect is dropped, and Design's reasoning beats mine

**`/` will not be conditional on a session.** *One URL that means two things is
the defect family this desk has spent a week clearing, and a conditional at the
edge fails silently and looks like a login bug.* **A static, cacheable `/` with
no cookie logic; he reaches the desk by the bookmark he will have within a day.**

**If typing the bare domain irritates him, a client-side bounce goes on the
landing page THEN — not in anticipation.** *It keeps `/` cacheable because the
conditional runs in his browser rather than at the edge.*

### Its premise was wrong and the conclusion survives — stronger

**Design argued from CloudFront being in the path. It is not, for the domain
this site will use.** *Measured 2026-09-15:*

```
tmitrader.com      -> 98.85.49.227   (the Lightsail static IP)
www.tmitrader.com  -> 98.85.49.227
dwwep02jje2ag.cloudfront.net -> 13.33.244.x   (a different address entirely)

curl -sI https://tmitrader.com/  ->  Server: nginx/1.24.0 (Ubuntu)
                                     no Via, no X-Cache, no X-Amz-Cf-*
```

**The distribution exists and the custom domain bypasses it.** *`docs/AWS_DEPLOYMENT.md`
still says "The public URL is the AWS-provided distribution hostname. There is
no custom domain and none is needed" — which is how Design reached a true
conclusion from a false premise. **Handed to Ops; it is their file.***

> **AND THE CORRECTED VERSION IS A BETTER ARGUMENT THAN THE ORIGINAL.** *The
> problem is not that the CDN will break a conditional `/`.* **It is that a
> conditional `/` forecloses ever putting the domain behind the CDN** — which is
> the obvious next step for a public landing page, and the whole reason a
> distribution was provisioned. **That is the same shape as (A) versus (B):
> a behaviour can be added later, an architecture cannot be taken back.**

**One consequence for my own verification, checked rather than assumed: the
curl proof in §2 hits nginx directly.** *No cache sits between it and the wall,
so a `200` means the exemption works and a `401` means it does not. Had the
domain been behind the distribution, a cached response could have shown either
answer for the wrong reason.*

---

## 3c. AUTHORITY IS A SECOND AXIS, AND NO SCREEN OF MINE SHOWS IT

**His ruling, via Integration:** *"make it user based authority, and the only
user with that authority right now is me. im the admin."*

**Two axes, and they must not collapse into one column:** `status` answers *may
this person in*; authority answers *what may they do*. **A user can be approved
and not admin.**

**So the three conditions on the `Signed in, not admitted` artboard are about
`status` ONLY, and there is no "not an admin" screen** — *a signed-in,
approved, non-admin user sees the whole board. What they do not get is a
control, and a control is Design's surface rather than a Web state.*

> **THE BOOTSTRAP TRAP, and deferring `/signin` is what keeps it shut:** the convenient first-admin rule is *"first user to sign in becomes
> admin"*. **The day `/signin` goes public, a stranger can reach it before he ever
> does — and under that rule the first person through the door takes the
> authority to spend his money.** *The first admin is an explicit one-time grant
> against a known identity. Nothing in the sign-in flow infers authority from
> being early.*

---

## 3d. RELEASE ORDER — Design found the hazard, this is the order that avoids it

**THE HAZARD, and it is the inverse of the one this thread has been guarding.**
*Moving `app/page.tsx` to `app/desk/page.tsx` leaves the app with **no page at
`/`**, so Next 404s there.*

> **Board moved + `location = /` exempted + landing page not shipped
> = the bare domain serves a PUBLIC 404.**
>
> **Harmless to the desk and fatal to the thing this is for.** *Google arrives at
> a publicly reachable 404 instead of a home page, and **a failed verification
> attempt is worse than an unattempted one** — it burns the retry, and calendar
> time is the scarce resource here.*

**Design's rule, and it is the one to hold on to: a `401` at `/` is the status
quo; a public `404` is a regression.**

### The order

**RELEASE 1 — the app, all in one release. nginx untouched.**

1. `app/page.tsx` → `app/desk/page.tsx` *(pure rename; everything it touches is
   an alias import)*.
2. New `app/page.tsx` renders the landing page.
3. `/privacy` and `/terms` renderers.

**At the end of Release 1, `/` serves the landing page and is STILL BEHIND BASIC
AUTH.** *Nothing is public. The dangerous window never opens, because the app
can only 404 at `/` in the gap between steps 1 and 2 — and there is no gap if
they ship together.*

**VERIFY BEFORE EXEMPTING, and note which question this asks:**

```bash
curl -su '<desk user>:<desk pass>' https://tmitrader.com/ | grep -c "Intelligence on what's moving"   # expect 1
curl -su '<desk user>:<desk pass>' -o /dev/null -w '%{http_code}
' https://tmitrader.com/desk        # expect 200
```

> **Using the desk password here is correct and is not a violation of this
> thread's own rule.** *That rule is about REACHABILITY — whether a stranger can
> get in — and a cached credential makes that question untestable. This asks
> whether the content EXISTS at the path, which the credential does not
> distort.* **Two different questions; only one of them is poisoned by having
> the password.**

**RELEASE 2 — nginx. The four exemptions, then §2's verification including the
negative control.**

**Only after Release 2's `200`s and `401`s both pass does he submit for
verification.**

### The gap between the releases is itself a decision

**Design flagged the transitional window and it is real: in Release 1, `/` serves
the landing page and is still behind Basic Auth.** *He types the domain, meets
the password, and arrives at a landing page rather than his board.* **Correct,
safe, and the worst version of his morning — password first, then the wrong
page.**

**The desk link is already in Release 1 by construction** — *it is part of the
landing page, which ships in that release; it is not a separate item that could
be forgotten.* **And Basic Auth is per-realm, so he enters the password once and
the click through to `/desk` does not prompt again.** *One extra click, not two
passwords.*

> **THE REAL MITIGATION IS THE LENGTH OF THE WINDOW, NOT ITS CONTENT.** *The two
> releases are one sitting, not one sprint:* **deploy Release 1, run the
> password-authenticated verification, deploy Release 2, run the public
> verification.** **Minutes.**
>
> *Splitting them across days buys nothing — the verification between them takes
> seconds — and it spends the whole window on his morning.* **If they cannot be
> done in one sitting, Release 1 should wait, because the board working at `/`
> is a better place to pause than the board working nowhere he would look.**

### Two things about when

- **Release 1 changes what `/` serves HIM** — the landing page, not the board.
  **He needs to know before it lands, and his bookmark becomes `/desk`.**
  *Trivial, and infuriating if discovered at 07:02 on a Tuesday.*
- **Neither release goes out between 07:00 and 10:00 ET.** *Ops's window rules
  already say this; it is restated because "it is only a rename" is exactly the
  reasoning that puts a deploy inside the one window that matters.*

### If the landing page is not ready

**Moving the board early is still safe, provided `location = /` is NOT
exempted.** *A 401 at `/` is what is there today.* **What must never happen is
the exemption landing before the page exists.**

---

## 4. A GATE ON STEP 3 THAT IS NOT IN THE BATCH — the only write endpoint

**Verified, not relayed** — `app/api/research/retry/route.ts` at `dd98782`:

- **`POST`, and the handler contains no session, cookie or identity check of any
  kind.** Input *is* validated — `^[A-Za-z0-9.\-]{1,12}$` — so there is no
  injection here. **Authorisation is the missing thing, not sanitisation.**
- It calls `retryResearch(symbol)`, which **queues a research job: it spends
  model budget and changes the shared board for everyone.**
- **No rate limit and no idempotency.** *Any valid-looking symbol, any number of
  times.*
- `components/RetryAnalysis.tsx` exposes the button.

**Today it is protected by exactly one thing: `auth_basic` on `location /api/`.
This batch does not touch that, so nothing changes today.**

> **THE GATE: the day `/api/` stops being Basic-Auth'd, this route needs its own
> authorisation check, and hiding the button is not it.** *A client flag is not a
> security boundary — the endpoint is one `curl` away from anyone who can reach
> the origin.*
>
> **And a session alone is not sufficient either.** Under the point-of-use
> ruling, *every* signed-in person holds a session, including a `pending` one.
> **The check this route needs is the same single status check every other point
> of use passes through** — the one Design made a condition of point-of-use —
> **plus a per-user rate limit, because budget spend is the harm and one
> authorised user in a loop causes it as surely as a stranger.**

**Ops's and Web's jointly, not his.** *He asked whether he was missing anything
about everyone getting the same screen; this is the answer, and it is a
precondition for a later step rather than a defect in the current one.*

---

## 5. THE AUTHORITY FIELD — shape requirements, for whoever writes the schema

**Verified 2026-09-15: it does not exist.** `grep -niE "admin|authority|role|permission" lib/auth/*.ts` returns nothing, and `ResolvedSession` is `{ userId, status, expiresAt }`. **So his ruling — *"user based authority, and the only user with that authority right now is me"* — currently has nowhere to live.**

**Design has refused to build the control gate until it does, and it is right to.** *The only field within reach is `status`, and gating on `status === 'APPROVED'` makes every approved user an admin — his ruling inverted rather than implemented.* **That is the obvious shortcut for whoever reaches it first under time pressure, which is why it is written down here.**

### Four properties, and the first two are the ones that bite

**1. ONE RESOLUTION POINT, TWO ANSWERS — not two resolution points.**
*The point-of-use ruling put the status check in one place every point of use passes through. **Resolving authority somewhere else recreates exactly the defect that ruling closed**: a route resolves the session correctly and never asks the second question.* **Authority rides on `ResolvedSession`, answered at the same moment by the same call.**

**2. "CANNOT SAY" MUST NOT COLLAPSE INTO `null`.**
*`resolveSession` already returns `null` for absent, expired and revoked alike — deliberately, and its docstring says why.* **If authority-unknown also becomes `null`, a signed-in person whose authority cannot be determined presents as not signed in, and gets bounced to sign-in with a valid session in their hand.**

> **Session resolution stays binary — `null` or resolved. Authority WITHIN a resolved session is three states: may spend, may not spend, cannot say.** *N states, not a value and an absence.* **A build predating the field, or a row written before authority was recorded, is `cannot say` — hidden control, and distinguishable in the log from a confident no.** *Design's requirement, and it is the same rule as the `400` screen: one thing on the page, two in the log.*

**3. THE FIRST ADMIN IS AN EXPLICIT ONE-TIME GRANT AGAINST A KNOWN IDENTITY.**
*"First user to sign in becomes admin" was safe only while the door was locked.* **`/signin` goes public in the later batch, so under that rule the first stranger through the door takes the authority to spend his money.** *Nothing in the sign-in flow infers authority from being early.*

**4. THE ENDPOINT CHECKS INDEPENDENTLY.** *`RetryAnalysis.tsx` hiding the button is presentation.* **`POST /api/research/retry` is one `curl` from anyone who can reach the origin, and the check there is the actual boundary.**

### No Web surface comes out of this

**Authority produces no screen on this thread's side.** *A signed-in, approved, non-admin user sees the whole board and simply lacks a control.* **The three `Signed in, not admitted` conditions are about `status` only and stay that way** — so nobody needs to wait on Web for this.

---

## 6. THE "BEFORE" MEASUREMENT, AND EXACTLY WHAT IT CANNOT SEE

**Taken 2026-09-16, from an actor with no cached state, before any route work:**

```
/  /privacy  /terms  /favicon.ico  /desk  /signin  /api/market   ->  401, all seven
```

**That is the clean baseline for §2's verification.** *Taken at the time rather
than reconstructed afterwards, which is the only way a baseline is worth
anything.*

> **AND IT CANNOT DISTINGUISH "RELEASE 1 SHIPPED" FROM "NOTHING SHIPPED".**
> *Integration's catch.* **Release 1 is app-only with nginx untouched, so a
> stranger sees `401` either way.** *A reader meeting seven `401`s at a
> timestamp would reasonably conclude nothing had shipped, and the measurement
> does not support that.*

**PROVED, not assumed — the responses are byte-identical:**

```
/                       401 · Content-Length: 188 · realm "Momentum Intelligence Trading Desk"
/desk                   401 · Content-Length: 188 · same realm
/nonexistent-path-xyz   401 · Content-Length: 188 · same realm
```

**A path that has never existed is indistinguishable from the site's root.**
*So this is not a weakness in the probe that a cleverer one would fix — **no
unauthenticated observation can see the app's route table at all**, because
server-level `auth_basic` answers before nginx ever consults Next.*

> **THE AMBIGUITY AND THE PROTECTION ARE THE SAME PROPERTY.** *The reason the
> measurement cannot tell the two states apart is the reason a stranger cannot
> enumerate the desk.* **Working as intended; worth knowing rather than fixing.**

**THE DISCRIMINATOR IS §3d STEP 2 — the credentialed existence check** — *and
this is the first moment that distinction has been load-bearing rather than
theoretical.* **It belongs to whoever performs the release, because it needs the
desk credential and this seat neither holds nor handles it.**

*The two questions one more time, because this is where they come apart:*
**REACHABILITY** — *can a stranger get in* — **is poisoned by holding the
password and must be asked by `curl` with no credential.** **EXISTENCE** — *is
the content at the path* — **requires the password and is not distorted by it.**

---

## 7. VERIFIED ON THE WIRE — Release 2, production `6f8894b`

**Web's run, 2026-09-16 02:40 ET, from an actor with no cached state. Third independent pass after Ops and Integration.**

```
POSITIVE   /  /privacy  /terms  /favicon.ico          ->  200, 200, 200, 200
NEGATIVE   /desk  /signin  /api/market  /privacy-x    ->  401, 401, 401, 401
ALSO       www.tmitrader.com/                          ->  200
```

**Eight for eight against the expectation as written. `tmitrader.com` serves a
public page for the first time in this desk's life, and the board is still
refused.**

### The check that could not be asked until the pages were public

**Status codes prove reachability. They do not prove a stranger sees a page.**
*So the page's OWN subresources were enumerated from the served HTML and each
fetched with no credential — the browser will request them and any `401` renders
the page broken to strangers while looking perfect from this desk.*

```
11 assets referenced: 9 chunks (js/css), 2 woff2 fonts   ->  all 200
/favicon.ico?favicon.<hash>.ico                          ->  200
```

> **`location = /favicon.ico` matches a request carrying a query string** —
> nginx matches on the URI path and ignores the query. **Checked on the wire
> rather than assumed, because the served markup asks for the hashed form and
> the exemption does not mention it.**

**The only non-200 in that sweep is `/desk`, which is a navigation link rather
than a subresource and is refusing exactly as designed.**

### Claims this thread made, now publicly checkable and checked

- **"No third-party requests."** *Zero external hosts in the served HTML.* **The
  page calls nobody** — fonts are the two self-hosted `woff2` under
  `/_next/static/media/`, as designed.
- **Google's stated requirement:** home page describes the app (the registered
  statement is present) and carries **2 × `/privacy` and 1 × `/terms`**.
- **Both legal pages render the adopted source at request time**, not a copy —
  `20:00 New York time`, `mointel_session`, `it has no code that could`, the
  redistribution clause, `US$100`, `Bexar County` all present.
- **NO DRAFT BANNER.** *The dateline reads `DRAFTED … · ADOPTED …`.*

> **TWO INSTRUMENT ERRORS IN THIS RUN, BOTH MINE, BOTH CAUGHT BY LOOKING.**
> **`grep -ci DRAFT` returned `2` on an adopted page** — it was matching
> `DRAFTED` in the dateline, not a banner. **And `grep -c 'href="/privacy"'`
> returned `1` where Integration had counted `2`** — `-c` counts matching LINES,
> not occurrences, and both links sit on one line. *A disagreement with a peer
> is what made me re-measure instead of concluding one of us was wrong.*

---

## 8. THE LIVE SITE ON A PHONE — checked 2026-09-16 23:15 ET, and one latent fault

**Nobody had looked at the shipped pages at phone width.** *Status codes,
subresources and content were verified; **rendering was not**, and "mobile is a
real case and NOT the same case as the desk" is this thread's own standard.*

**Measured in a 375px viewport, all three public pages:**

```
/          horizontal overflow 0px   elements past right edge: 0
/privacy   horizontal overflow 0px   elements past right edge: 0
/terms     horizontal overflow 0px   elements past right edge: 0
```

**One target under 44px: the inline link *"What we hold, and what we never ask
for"* at 18px.** *Correct, not a defect — it is inline within a sentence, which
the System artboard exempts explicitly.*

### THE LATENT FAULT, and it is armed by filling in a bracket

**The processor table in the privacy policy measures 335px inside a 375px
viewport, and its parent has `overflow-x: visible`.**

> **It fits because of what the cells currently contain, not because anything
> makes it fit.** *There is no scroll container. **40px of headroom on the
> narrowest common phone.***

**AND THE THING THAT WOULD CONSUME THAT HEADROOM IS ALREADY SCHEDULED.** *The
three unfilled brackets in the published policy all live in that table:*

```
| [HOSTING PROVIDER] | The server and its logs | It is where the service runs, in [REGION] |
| [EMAIL PROVIDER, IF ANY] | Email we send you | Service messages only |
```

> **`[HOSTING PROVIDER]` is 18 characters. "Amazon Web Services" is 19.
> `[REGION]` is 8; `us-east-1` is 9.** *Answering Ops's brackets — the correct,
> wanted, overdue thing to do — is what pushes the table past the viewport and
> makes the policy page scroll sideways on a phone.*

**THE FIX BELONGS WITH THE RENDERER, NOT THE TEXT:** *wrap the rendered table in
`overflow-x: auto`.* **The markdown must not be reshaped to fit a screen** —
*it is the adopted source, and narrowing a legal table to avoid a layout problem
is the tail wagging the document.*

**Recorded rather than filed as a bug, because it is not broken today.** *It is
a fault whose trigger is a task already on the list, in a file nobody would
connect to a layout — and the seat that fills the brackets will be thinking
about hosting providers, not about phones.*

---

## 9. THE DEPLOY IS NOW A PUBLIC OUTAGE — Ops's finding, and what it means here

**2026-09-17: a routine deploy of `dbae021` took every public page to `502` for
3m28s** — *unit stopped 03:43:44Z, ready 03:47:14Z; stop → migrate → start.*
**Nothing crashed. The gap is the deploy's own.**

> **IT WAS HARMLESS UNTIL RELEASE 2 AND IS NOT ANY MORE.** *While every path was
> `401`, a stopped app was indistinguishable from a running one and the window
> cost nothing.* **Now the same window is a public outage, every single ship.**
>
> *Ops has it and is reading the script's ordering. **The fix is Ops's; the
> consequence is this thread's**, because the surface that goes dark is the one
> this thread owns.*

**TWO STANDING RULES FOR THIS THREAD:**

1. **Never run §2's verification during a deploy.** *A `502` there is the deploy,
   not a fault, and reporting it as a fault costs someone an investigation.*
   **Ask Ops whether one is in flight before treating a `502` as news** — *this
   seat reported one at 03:45Z that was already resolving.*
2. **HE MUST NOT SUBMIT TO GOOGLE WHILE A DEPLOY IS IN FLIGHT.** *A reviewer
   fetching `tmitrader.com` inside that window gets a `502`, and a failed
   verification burns the retry — the one cost here that fixing the box does not
   recover.* **Ops says when the next deploy is done; the submission waits for
   that word.**

