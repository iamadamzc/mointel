# Public route spec — handed to Ops, 2026-09-15

**Written by Web against `dd98782`.** Commissioned by Integration on his go:
Google verification has not passed, he is doing it himself, and it needs
`/privacy` publicly reachable and linked. **This is the whole batch, per Ops's
own request that exemptions arrive as a decision rather than a trickle.**

---

## 0. WHAT THIS BATCH DOES NOT DO — read this first

**Nothing here exposes the board, and nothing here requires Basic Auth to come
off `location /`.** *The five locations below are individually exempted; `/`,
`/api/` and every other path keep the server-level `auth_basic` they have
today.*

**So this is step 1 of the charter's three-step sequence and it can land
without step 2 existing.** *In-app session auth is not a precondition for any
line in this document.*

---

## 1. THE FIVE LOCATIONS, AS STRINGS

**Four are EXACT-MATCH (`=`), not prefix.** *This is narrower than
`docs/web/README.md` §2 implied and it is deliberate:* `^~ /privacy` would also
match `/privacy-internal` and `/privacyexport`, so a future path that merely
starts with those letters would be born public. **Exact match cannot do that.**

```nginx
# The adopted privacy policy. Google requires it reachable and linked from
# both the home page and the consent screen, as the same URL in both places.
location = /privacy { auth_basic off; <proxy block>; }

# The adopted terms of service.
location = /terms   { auth_basic off; <proxy block>; }

# The sign-in screen. The word appears once in the URL space, deliberately.
location = /signin  { auth_basic off; <proxy block>; }

# Tab icon. Falls under `location /` today, so a public page's favicon 401s —
# and that is invisible from every browser on this desk.
location = /favicon.ico { auth_basic off; <proxy block>; }

# THE ONLY PREFIX IN THE BATCH, and it needs to be one: the OAuth start, the
# callback and sign-out are separate paths under it.
#   /auth/google            start
#   /auth/callback/google   REGISTERED EXACT-MATCH REDIRECT URI — cannot move
#   /auth/signout           end a session
# `/auth/` with the trailing slash, so bare `/auth` matches nothing.
location ^~ /auth/  { auth_basic off; <proxy block>; }
```

`<proxy block>` is the existing one, copied verbatim from
`deploy/aws/nginx-locations.conf:143` — `proxy_pass http://mointel_app`, the
four `proxy_set_header` lines, `Connection ""`, `proxy_buffering off`, and the
three timeouts. **Nothing about it changes.**

**`/auth/`, not `/api/auth/`** — the latter inherits Basic Auth from
`location /api/` and the callback would 401 with no visible cause.

### What Ops also has to build, because a location with nothing behind it 404s

| path | serves |
| --- | --- |
| `/privacy` | renders `docs/legal/privacy-policy.md` **at request time**, DRAFT banner driven by `adopted:` — §2 of the README is the contract |
| `/terms` | renders `docs/legal/terms.md`, same renderer |
| `/signin` | the `SignIn` artboard |
| `/auth/*` | Ops's own machinery; Web specifies no internals |

---

## 2. HOW TO PROVE IT, INCLUDING THE CONTROL THAT MAKES THE PROOF MEAN ANYTHING

**From an actor with no cached state. Not from a browser on this desk.**

```bash
for p in /privacy /terms /signin /favicon.ico; do
  printf "%-16s %s\n" "$p" "$(curl -s -o /dev/null -w '%{http_code}' https://tmitrader.com$p)"
done
```

**Expect `200` on all four.**

> **AND THE NEGATIVE CONTROL, WHICH IS NOT OPTIONAL:**
> ```bash
> curl -s -o /dev/null -w '%{http_code}\n' https://tmitrader.com/          # expect 401
> curl -s -o /dev/null -w '%{http_code}\n' https://tmitrader.com/api/market # expect 401
> curl -s -o /dev/null -w '%{http_code}\n' https://tmitrader.com/privacy-x  # expect 401
> ```
> **A batch of exemptions that accidentally opened everything would pass the
> first check and fail all three of these.** *Four `200`s prove the holes exist;
> only the `401`s prove they are holes rather than a missing wall.* The third
> line is what distinguishes exact-match from prefix, and it is the one that
> would have caught the `^~` version silently.

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

> **THE BOOTSTRAP TRAP, and it is mine because `/signin` goes public in this
> batch:** the convenient first-admin rule is *"first user to sign in becomes
> admin"*. **Public sign-in means a stranger can reach `/signin` before he ever
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
