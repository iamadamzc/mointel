# OAuth gate — build plan and estimate

**Web, 2026-09-24 17:59 UTC, against `1740448`.** Owner of this file: **Web**.
Written on Integration's relay of his approved auth model: **Google sign-in +
an allowlist of invited emails; passwordless; invite = add-email, revoke =
remove-email.** This is the build that gates launch — opening the desk beyond
him.

> **This is a plan, not a change.** Nothing here has been built or shipped. It
> exists to be argued with and estimated, then turned into a punch-list.

---

## 1. What is real vs stubbed — assessed by opening the code, not by reputation

**The primitives are REAL and TESTED. The wiring does not exist at all.** Every
claim below was read from the **working tree on 2026-09-24** (committed base
`1740448`); the test line was run, not assumed.

> **A peer is mid-change on the store as this is written.** `lib/auth/store.ts`
> and `tests/auth/identityStore.test.ts` carry uncommitted edits — an Ops-side
> hardening that refuses to open the identity DB inside a `releases/` directory
> (where `prune.sh` would silently delete accounts) and points at the durable
> `/var/lib/mointel/identity.db`. That is one of the Ops items below, already in
> progress. It does not change the Web assessment: routes, gate and allowlist are
> still absent.

| piece | file | state |
| --- | --- | --- |
| OAuth flow (state/nonce, authorize URL, code exchange, ID-token claim checks, timing-safe compare) | `lib/auth/oauth.ts` | **Real.** `checkClaims` verifies `iss`/`aud`/`exp`/`nonce`/`sub`; no JWKS by design (server-to-server exchange, token forwarded nowhere — condition documented in the file header). |
| Cookies (session + flow, set + clear, `Secure` fails closed, `SameSite=Lax` for the cross-site return) | `lib/auth/cookie.ts` | **Real.** `clearedFlowCookie` exists. **The flow-cookie NAME is a parameter, not a constant** — it is not yet decided in code (see D7). |
| Identity store (users/identities/sessions, `sub`-keyed, hashed session ids, absolute expiry, no reaper) | `lib/auth/store.ts` | **Real.** `linkIdentity`, `createSession`, `resolveSession`, `revokeSession` all implemented. |
| Session expiry (20:00 ET boundary, DST-aware, rolls forward after close) | `lib/auth/expiry.ts` | **Real.** Reuses `sessionEndUtc` — no second definition of the number this desk keeps getting wrong. |
| **Route handlers** (`/auth/start/google`, `/auth/callback/google`, `/auth/signout`, `/signin`) | — | **DO NOT EXIST.** `app/auth/` and `app/signin/` are absent. |
| **The gate** (anything that reads a session and refuses) | — | **DOES NOT EXIST.** `users.status` is present from row one but *nothing reads it* — by design, so there is no backfill later. |
| **Config wiring** (`GOOGLE_CLIENT_ID`/`SECRET` read by code) | — | **DOES NOT EXIST.** The strings appear only in Ops docs. No code reads them because the route that would call `exchangeCode` isn't there. |
| **Allowlist** (invited-emails table + admin add/remove) | — | **DOES NOT EXIST.** Nothing represents an invited email. |

**Proof the primitives work, not just compile:** `npx vitest run tests/auth/`
→ **47 passed (4 files)** at `1740448`. The only importers of `lib/auth` are
those tests — grep confirms zero production callers.

**One-line summary for him:** the hard, careful half (crypto, cookies, store,
expiry) is done and green; the missing half is the plumbing that turns it into
a working gate, plus the allowlist the new model needs.

---

## 2. The build, as a punch-list

Split by owner. **Web** = sign-in flow and everything a person sees or that
carries user-facing copy/status. **Ops** = carriage (nginx, env, the box, the
allowlist admin mechanism, Basic-Auth removal). **Seam** = must be agreed
before either side builds. **Him** = a decision only he makes.

### Web

- [ ] **`/signin` screen** — the list-of-one Google button (Design's formulation,
      already specified in `README.md` §1), the refusal/error/signed-out states
      with the status codes in `2026-09-15-route-spec.md` (403 refused, 503
      Google down, 500 our fault, 200 cancelled/signed-out). Copy already drafted
      on the `Signin` artboard.
- [ ] **`/auth/start/google`** — mint a flow (`createFlow`), set the flow cookie,
      302 to `authorizeUrl(...)`. *(Ownership flagged — see D3.)*
- [ ] **`/auth/callback/google`** — exchange code, read + `checkClaims`, resolve
      allowlist → status, `linkIdentity`, `createSession`, set session cookie,
      **clear the flow cookie on EVERY exit (success and failure)**. The
      published privacy policy promises exactly this: the flow cookie "is
      discarded when the sign-in finishes, whether that sign-in succeeded or
      not." `clearedFlowCookie()` exists and must be called on both paths — a
      single exit helper so a failure mode added later inherits it (this is the
      shape Ops already used for the flow-cookie clear on the older callback per
      README §3 2b; reuse it). *(Ownership flagged — see D3.)*
- [ ] **`/auth/signout`** — `revokeSession`, clear the session cookie, 200.
- [ ] **The one gate module** — `requireSession()` that reads the session cookie,
      calls `resolveSession`, and returns user+status or null. **One place every
      point of use passes through** (his §2b ruling). Called by the desk and by
      each authenticated `/api/*` route.
- [ ] **Wire the gate into the board** — `app/desk/page.tsx` (a node-runtime
      server component today) refuses/redirects when there is no valid session,
      and shows the refusal STATE when the session's user is not admitted (see D2).
- [ ] **Fill `[FLOW COOKIE NAME]`** in the privacy policy from the name the code
      actually uses (D7), closing the last placeholder. Re-run
      `placeholder-scan.py` to confirm zero.

### Ops (carriage)

- [ ] **nginx exemptions** for `= /signin` and `^~ /auth/` — the two still
      deferred in the route spec, exact strings already written there.
- [ ] **Env on the box** — `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, the
      redirect URI, `IDENTITY_DB_PATH`. Secrets never in the repo.
- [ ] **Identity DB path** — a durable location off the market store. **In
      progress** (uncommitted at time of writing): the store now refuses to open
      inside a `releases/` directory and the target is `/var/lib/mointel/identity.db`.
      Confirm it is backed up on the identity-data retention terms, not the market
      terms.
- [ ] **Allowlist admin mechanism** — the add-email / remove-email operation
      (D6). Simplest for launch: a CLI on the box.
- [ ] **Basic-Auth removal** — the LAST step, and its own change (see §3).

### Seam (agree before building)

- [ ] **D1 allowlist keying**, **D2 status semantics**, **D3 who writes the
      `/auth/*` handlers**, **D4 gate runtime**, **D5 bootstrap**, **D6 admin
      surface**, **D7 flow-cookie name**. All in §4.

### Him

- [ ] Confirm the model shape in §4 where it says "his call."
- [ ] The first invited email (D5) — almost certainly his own, seeded before
      `/signin` opens.

---

## 3. Sequencing — the constraint that is not negotiable

From the charter, and each clause bought with reasoning already on file:

1. **Build and ship `/signin` + `/auth/*` + the gate with Basic Auth STILL ON
   over the whole desk.** The desk stays protected the entire time it is being
   built. Nothing about sign-in weakens the outer gate.
2. **Prove the in-app gate admits and refuses correctly.** This is the hard
   verification, because of the testing trap below.
3. **ONLY THEN drop Basic Auth on `/desk` and `/api/*` — and this is a SEPARATE
   change from step 2, never the same commit.** Basic Auth is crude but
   load-bearing; it comes off when something else is demonstrably holding the
   weight, not when the replacement is merely written.

> **THE TESTING TRAP, restated because it governs step 2.** Every browser on
> this desk has the Basic-Auth password cached, so "sign-in works" verified from
> a browser here proves nothing — everyone here passes the outer gate regardless.
> And while Basic Auth is still on, an external `curl` gets 401 before it ever
> reaches the app, so the in-app gate cannot be exercised from outside either.
> **The gate's correctness must be proven by (a) route-level tests against the
> real store, and (b) a live proof arranged with Ops** — e.g. a throwaway probe
> path that runs `requireSession()` and is exempted just long enough to test,
> then removed. The exact method is a seam item; do not hand-wave it, and do not
> drop Basic Auth until it is answered.

---

## 4. Design decisions to settle (surfaced, not decided unilaterally)

> **SEAM DECISIONS SETTLED 2026-09-24 (Integration).** **D3: Web writes the
> `/auth/*` route handlers** — the infra is Ops's, the handlers are Web's;
> Integration is correcting the charter's "OAuth callbacks under Ops" line to
> match. **D1, D4, D7 confirmed as recommended** — allowlist keyed by verified
> email, gate in the Node runtime via one `requireSession()`, cookie
> `mointel_oauth` with the privacy-policy name filled from code. **D2, D5, D6
> remain his** and are with him now.

**D1 — Allowlist keyed by EMAIL, identity keyed by SUB. These do not conflict.**
The store deliberately keys *identity* on Google `sub` and warns against email as
an identifier — that is about durable identity linking and stays as is. *Authorization*
is a different question: an invite is an email-addressed act, so the allowlist is
a table of normalized invited emails. At the callback: **admit iff
`claims.email_verified === true` AND `normalize(claims.email)` is on the
allowlist.** *Recommendation: build it this way. The `email_verified` requirement
is load-bearing — without it an unverified Google account could assert an invited
address.*

**D2 — Refuse at the point of use, and still issue a session.** README §2b
records his ruling: refusal happens at the point of use, in one place, and "every
refused person holds a live session, so the mid-session downgrade is common."
*So the callback issues a session even to a not-yet-admitted user, records
`issued_status`, and the gate shows the board or the refusal STATE.* This is what
makes opening `/signin` safe — a non-allowlisted person who signs in is refused
at the board, not handed it. *Recommendation: confirm this is still the shape;
it is the reason the authority-field worry (below) dissolves.*

**D3 — Who writes the `/auth/*` route handlers?** The charter's ownership table
puts "OAuth callbacks" under **Ops** (carriage); your message hands **Web**
"finish the OAuth flow." These need reconciling. *Recommendation: Web writes the
handlers — they are thin compositions of the already-built primitives and they
carry user-facing status codes and copy, which are Web's — and Ops owns nginx,
env and the box. Confirm, so we do not both build them or neither.*

**D4 — The gate runs in the NODE runtime, not middleware.** `resolveSession`
uses `better-sqlite3`, a native module that cannot run in Next's edge middleware.
*Recommendation: one `requireSession()` module called from the node-runtime desk
server component and each `/api` route; if a middleware redirect for
cookie-less requests is wanted for polish, it does only a cheap cookie-presence
check and never the authoritative resolve.*

**D5 — Bootstrap: how the first invited email gets onto the allowlist.** With an
allowlist, "whoever knocks first" no longer wins — but the first row has to come
from somewhere. *Recommendation: seed his email before `/signin` opens (a one-line
admin step). This IS the "first-admin grant" the LIVE STATE authority field was
waiting on; the allowlist model answers it.*

**D6 — Admin surface for invite/revoke.** *Recommendation for launch: a CLI on
the box (Ops), because an admin UI is a separate build and launch does not need
it. Flag the admin UI as a later item.* His call on whether a UI is wanted sooner.

**D7 — The flow-cookie name.** Relayed earlier as `mointel_oauth`; the only
occurrence in the tree is `mointel_oauth_state` in a test, and the store's
session cookie is `mointel_session`. *Recommendation: use `mointel_oauth`. Once
the routes use it, fill `[FLOW COOKIE NAME]` in the privacy policy from the code
— never from a relay.*

---

## 5. Estimate

Rough, in build-sessions of focused work, assuming the seam decisions in §4 are
taken as recommended. The crypto/store half being done is why this is not larger.

| block | size |
| --- | --- |
| `/signin` screen (copy drafted; needs the real page + states) | **S** — ~0.5 |
| `/auth/start` + `/auth/callback` + `/auth/signout` handlers | **M** — ~1 |
| Allowlist table + `linkIdentity`/callback integration + `email_verified` gate | **M** — ~1 |
| `requireSession()` gate module + wiring into `/desk` and `/api/*` | **M** — ~1 |
| Allowlist admin CLI (Ops) + bootstrap seed | **S** — ~0.5 |
| nginx exemptions + env on box (Ops) | **S** — ~0.5 |
| **Step-2 live proof of the gate (the hard part)** | **M–L** — ~1–1.5, mostly arranging a valid test against the trap |
| Basic-Auth removal (its own change) + full negative-control sweep | **S** — ~0.5 |
| Fill placeholder, docs, final verification | **S** — ~0.5 |

**Total ≈ 6–7 build-sessions**, gated on the §4 decisions and on Ops availability
for the carriage and the live-proof arrangement. The single biggest risk to the
estimate is step-2 verification, not the code.

---

## 6. What this plan does NOT cover

- Billing. The store records a session per ET day (`issued_status`, no reaper) as
  the artefact of a charged day, but "no price, no counter, no invoice" — turning
  rows into money is separate work, deliberately out of scope here.
- A second provider (Apple), deferred and possibly unavailable; the screen is a
  list-of-one so it can grow one without a rebuild.
- An admin UI, if D6 is answered "CLI for launch."
