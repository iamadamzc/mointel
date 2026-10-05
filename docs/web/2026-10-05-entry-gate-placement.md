# Entry gate: placement and server contract (PROPOSED)

**Web, 2026-10-05, against `docs/research/session-reports/commercial.md` section 12b at `776f1415`.**
*Proposed to Integration; not built. Design builds the screen against the contract below. Every caller
claim was read on `origin/main` that day.*

## Where it sits

After sign-in, before any desk content, inside the ONE gate (`lib/auth/gate.ts`). `authenticate()` gains
a fourth state, `unaccepted`: on the allowlist, but no acceptance of the CURRENT text. Every consumer has
to branch on it, so the type system enforces coverage.

| surface | `unaccepted` gets |
| --- | --- |
| `/desk` | redirect to `/enter` |
| every session-gated `/api` route | 403 `{"error":"not accepted"}`, no-store |
| owner-only actions | refused (`isOwnerAdmission` is false) |
| `/enter` | the gate screen. It renders only in this state: anonymous goes to `/signin`, refused gets 403, accepted goes to `/desk` |

Because every request asks the store again, this holds against the back button, a direct URL, a reload
and a second tab (12b requirement 1).

## The text

One source: `lib/legal/entryGate.ts` (Web), holding 12b verbatim. `ENTRY_GATE_VERSION` is a hash of the
text, so any change re-asks everyone and nobody has to remember to bump it. A test asserts each sentence
is a substring of `docs/legal/terms.md`, so "verbatim" stays a checked property. The em-dash guard gets
the file as a SURFACE.

## Accept and decline

- **ACCEPT:** `POST /auth/accept`, a plain form with field `version`, checked same-origin. It writes one
  row and answers 303 to `/desk`. A stale version (a tab opened before a text change) answers 303 back
  to `/enter`, so nobody accepts text they were not shown.
- **DECLINE:** records nothing, so the gate reappears on the next entry (12b requirement 3). It posts
  to the existing `/auth/signout` and lands on `/` (requirement 2). Design may prefer a "you need to
  accept" state at `/enter?declined`; server-side, either works.

## Storage

A new append-only table, `entry_acceptances(user_id, text_version, accepted_at, session_hash)`, in
`identity.db`. Nothing ever deletes from it, the same discipline as the sessions table. The reads go in
`lib/auth/store.ts`, which is Ops's file. **Ops's call:** `SCHEMA` re-runs `CREATE TABLE IF NOT EXISTS`
on every open, so the table is additive and rollback-safe WITHOUT a version bump. A bump would make a
rollback refuse the store, and sign-in would go down.

## How often

Once per text version, which is Commercial's recommendation; the record is durable. Asking daily is a
one-line change. **This is a product choice for him:** he would be the one clicking it every morning.

## Callers (12b requirement 4)

The only non-browser callers of `/api`:
- `/api/health`: `deploy.sh` and `status.sh`. Ungated.
- `/api/dashboard`: `worker/runtime.ts:1939` and `worker/diagnose.ts:152`. Ungated, held.

The entry check touches neither.

## Two gaps: requirement 1 is NOT met until both are answered

1. **`/api/dashboard` is ungated.** A declined user who holds the desk password can still read the
   board's JSON. Gating it is the same blocker as taking the desk password off: Sheet step 4, or the
   shared-secret header fallback. If the beta opens before Sheet step 4, revive the header now.
2. **`/review/<token>` and `/mcp/<token>` serve desk data to token holders.** Token holders are not users,
   so they never meet the gate. Commercial's question: must a reviewer accept?

## Nginx, when the desk password comes off

`= /enter` joins `= /signin` and `^~ /auth/` in the exemption list.

## Contract for Design's screen

- `/enter` passes the component `{ text: typeof ENTRY_GATE; version: string; declined: boolean }`.
- The component imports the text from `lib/legal/entryGate.ts` and never retypes it.
- ACCEPT is `<form method="post" action="/auth/accept">` with a hidden `version`, so it works before
  JavaScript loads.
- DECLINE is a form POST to `/auth/signout`.
- The terms link opens `/terms` in a new tab.
