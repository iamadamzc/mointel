# The gate probe — design, and what it cannot prove

**Web, 2026-09-30, against `69bafba`.** Owner of this file: **Web**. *Written to
Integration's order call: Web designs, Ops builds after tonight's releases,
Integration replays both. Due Thursday 2026-10-01 20:00 ET; delivered early
because Friday's sign-in depends on it and it has been unowned since the gate
was built.*

> **THIS IS A DESIGN, NOT A BUILD. No route is written here, nothing is exempted,
> nothing is deployed.**

---

## 1. THE PROBLEM, STATED EXACTLY

**The in-app gate cannot be exercised from outside the box, and that is not an
oversight — it is what Basic Auth does.**

```
Basic Auth ON   an outside client is refused 401 AT NGINX and never reaches the app,
                so `authenticate()` never runs for it
Basic Auth OFF  the desk is served by whatever the gate decides, and if the gate is
                wrong the board is public
```

**And a test from this desk proves nothing about the OUTER gate, because every
browser here has the shared password cached.** *That is the trap the charter
names.* **But it is the outer gate that is untestable from here. The INNER gate
is a different question and this document is only about the inner one.**

---

## 2. THE FOUR CLAIMS, KEPT APART, BECAUSE ONLY THREE ARE PROVABLE FRIDAY

**This is the whole point of the document. "The gate works" is four claims
wearing one name, and the probe answers three of them.**

| | claim | provable Friday? |
| --- | --- | --- |
| **A** | the gate **ADMITS** a signed-in user whose email is on the allowlist | **yes, by probe** |
| **B** | the gate **REFUSES** a signed-in user who is not on the allowlist | **yes, by probe** |
| **C** | the gate treats a request with no valid session as **anonymous** | **yes, by probe** |
| **D** | **a person with NO Basic-Auth password can complete sign-in end to end** | **NO. Not Friday, not by any probe.** |

> **D IS NOT PROVABLE WHILE BASIC AUTH IS ON, BY CONSTRUCTION.** *Such a person
> cannot reach `/signin` or `/desk` at all — nginx refuses them first.* **D
> becomes testable only in the change that removes Basic Auth, which is why that
> is its own night and why a green probe must never be read as permission to
> drop the password.**

**A GREEN PROBE MEANS "THE GATE DECIDES CORRECTLY". IT DOES NOT MEAN "SIGN-IN
WORKS FOR A STRANGER".** *If the Friday report says the second, it is overstating
what was measured.*

---

## 3. THE DESIGN

### 3a. It needs NO new nginx exemption, and that is deliberate

**Put the probe under `/auth/`.** *Friday already grants `^~ /auth/` for the
OAuth flow, and a prefix location covers `/auth/probe`.*

> **THE CHARTER'S RULE IS THAT EACH EXEMPTION IS A HOLE IN A UNIFORM RULE,
> GRANTED ONCE AND SPENT FOREVER.** *A probe needing its own exemption would
> spend a fifth hole to test the fourth.* **Living inside an exemption already
> being granted costs nothing and leaves nothing behind in `nginx.conf` to
> forget to remove.**

### 3b. What it does, and the list of what it must NOT do is longer

```
GET /auth/probe
  reads   the caller's own session cookie (`mointel_session`) off the request header
  calls   authenticate(db, sessionId, new Date())
  returns 200 {"state":"anonymous"}  |  {"state":"refused"}  |  {"state":"admitted"}
```

**It MUST NOT:**

- **Take any parameter at all.** *Not a session id, not an email, not a user id.*
  **A probe that accepts a session id is a session-id oracle:** anyone could ask
  it whether a stolen or guessed id is live. **It reads the caller's own cookie
  and nothing else.**
- **Return any identifier.** *No `userId`, no email, no expiry, no timestamps.*
  **`authenticate()` returns `{ state, userId }`; the probe returns the state and
  drops the rest.** *The userId is the thing that makes a leak a leak.*
- **Return any desk data.** *It touches no market store and renders nothing. It
  is not a page.*
- **Write anything.** *No session creation, no `linkIdentity`, no logging of the
  caller's identity beyond what the normal request log already holds.*

### 3c. It fails CLOSED, so leaving it in is not the same as leaving it on

**Guard the route on an env var that is absent in normal production:**

```
AUTH_PROBE_ENABLED unset or not "1"  ->  404, exactly as if the route did not exist
AUTH_PROBE_ENABLED=1                 ->  the probe answers
```

> **THIS SEPARATES TWO FAILURES THAT LOOK ALIKE AND ARE NOT.** *Forgetting to
> delete the code is a tidiness failure. Forgetting to remove an enabled endpoint
> is a live surface nobody is watching.* **With the flag, the first cannot
> silently become the second.**

**404 rather than 403 when disabled**, *so a disabled probe is indistinguishable
from a route that was never built.*

### 3d. Removal, and how removal is PROVEN rather than asserted

**Two independent acts, in this order, the same night:**

1. **Unset `AUTH_PROBE_ENABLED` on the box** and confirm `GET /auth/probe` → `404`
   from outside. *This is the one that matters; it closes the surface.*
2. **Delete the route** in a commit of its own, named as the removal.

**THE VERIFICATION IS A `curl` FROM A CLIENT WITH NO CACHED STATE, NOT A CODE
READ:**

```bash
curl -sS -o /dev/null -w "%{http_code}\n" https://tmitrader.com/auth/probe   # expect 404
```

> **AND IT NEEDS A POSITIVE CONTROL, or a 404 proves nothing:** *`/auth/probe`
> returns 404 when the route is absent, when the flag is off, AND when nginx
> never exempted `/auth/` in the first place.* **Before trusting the 404, confirm
> the same client gets a non-404 from `/signin`** — *which proves the exemption
> is live and the client is reaching the app at all.* **A 404 from a client that
> cannot reach the app is the same failed check this desk keeps rediscovering.**

---

## 4. HOW EACH CLAIM IS ACTUALLY MEASURED ON FRIDAY

**All three from a client with NO cached Basic-Auth password** — *the probe is
reachable to such a client because `^~ /auth/` is exempt, which is exactly why it
is worth having.*

| claim | how | expected |
| --- | --- | --- |
| **C** anonymous | `curl` with no cookie | `{"state":"anonymous"}` |
| **A** admitted | **his** browser, after he signs in with the seeded address | `{"state":"admitted"}` |
| **B** refused | a **second Google account** that is NOT on the allowlist, signed in, then hit the probe | `{"state":"refused"}` |

> **B IS THE ONE THAT WILL BE SKIPPED IF FRIDAY RUNS LATE, AND IT IS THE ONE
> WORTH KEEPING.** *A gate that admits correctly and refuses nothing is a gate
> that admits everyone, and it looks identical to a working one from his account.*
> **This desk has the worked example already: a gate broken open and a gate
> correctly admitting are the same observation from inside.** *B needs one
> throwaway Google account and about two minutes.*

**AND THE ADMIT TEST MUST USE THE SEEDED ADDRESS, NOT MERELY ANY ACCOUNT OF
HIS.** *If he signs in with a different Google address than the one seeded, the
correct answer is `refused`, and reading that as a bug would be the day's worst
outcome.*

---

## 5. WHAT THIS COSTS, AND WHY IT IS SMALL

**One route file, one env var, one nginx location that is already being added,
and a deletion commit.** *Ops's build is well under an hour; the flag and the
no-parameters rule are the only parts that need care.*

**The alternative that was considered and rejected: prove the gate by unit tests
alone.** *The suite already does that — 145 green — and it is why the gate is
believed to be correct.* **What it cannot do is prove that THIS box, with THIS
identity database, THIS env and THIS nginx in front of it, decides the same way.**
*Every failure this desk has had in the last month has been in that gap: a
default resolved at import rather than per call, a store opened under a
`releases/` path that `prune.sh` deletes, a check pointed at the wrong revision.*
**The probe exists to close the gap between a green suite and a live box, and
nothing else.**
