# Daily billing — the infrastructure section (Ops)

*Ops, 2026-09-28. Companion to Commercial's daily-billing design, which leads. A design, not a
build: no provider account, no secrets, nothing installed. Every fact about the code below was
read at `main` on this date.*

**His ruling, verbatim (2026-09-28 ~00:50Z):** *"start with daily. if we have their card on
file, let them in immediately, the charge happens in the background. if it was unsuccessful,
we'll send a warning of some kind. maybe a popup saying hey, you have 1 hour to fix this or your
session is over."* and *"1 hour. regardless of time."*

## What already exists, and why it fits

| Fact | Where | Consequence |
| --- | --- | --- |
| A session carries an ABSOLUTE `expires_at` and an `et_date` | `lib/auth/store.ts:363-384` | The paid unit is already on the row: one ET calendar date. |
| Validity is re-read from the DB on every request; an expired row is refused | `lib/auth/store.ts:409-423` | Shortening `expires_at` ends the session on the next request, even though the browser cookie still carries the old max-age (`lib/auth/callback.ts:148`). No cookie change is needed. |
| Revocation ends live sessions in the same transaction | `lib/auth/store.ts` (revoke) | "Card permanently failed" already has an end state. |
| A sign-in after 20:00 ET rolls to the next day | `lib/auth/expiry.ts` | Settles "which day is charged" for late sign-ins, as that file's flag already asks him. |

## The design

**1. The charge record: one row per (user, ET day), and that uniqueness IS the idempotency.**
A `charges` table in `identity.db`: `user_id, et_date, state (PENDING/SUCCEEDED/FAILED),
processor_ref, attempted_at, failed_at, grace_until`, UNIQUE `(user_id, et_date)`. Signing in
three times on Monday inserts once. Retries update the row and never add one.
It lives in `identity.db`, not `market.db`: the accounts store owns people and money, and a table
there is a small-file schema bump. **It does NOT trigger `market.db`'s multi-minute VACUUM INTO
migration.** `identity.db`'s refuse-newer versioning is the existing pattern, reused.

**2. Let them in immediately.** The OAuth callback creates the session exactly as it does now,
then inserts the PENDING charge row (INSERT OR IGNORE). The sign-in never waits on the processor.

**3. Which process charges: a new small unit, `mointel-billing`.** Not `mointel-web`, because
every deploy restarts web and a charge must not share the fate of a deploy. Not research or
assess: their failure modes (lock contention, model outages) have nothing to do with money.
Its only job: claim PENDING rows, make one off-session charge per row against the saved card with
the row id as the processor's **idempotency key** (a restart mid-charge cannot double-bill), and
record the result. **Only an actual DECLINE writes FAILED.** A timeout, a processor outage or any
indeterminate answer leaves the row PENDING, to be retried on the next pass under the same
idempotency key. The one-hour clock must never start because the processor was down.
(Commercial's refinement, `e6bc1ee`.) Process shape is Ops's call. It's one more unit, like migrate.

**4. A failed charge ends the session one hour later, regardless of time.**
On the FIRST PENDING->FAILED transition for that paid day, and only then: `failed_at` is written
ONCE and `grace_until = failed_at + 1h`. **A retry that fails again never rewrites either.**
Otherwise a card that keeps declining would buy a fresh hour on every attempt, the opposite of
"1 hour, regardless of time". Only a SUCCESSFUL retry clears them (the write is guarded
`WHERE failed_at IS NULL`, so it cannot move the clock). And in the SAME transaction as that
first failure, every live session for
that user and `et_date` gets `expires_at = MIN(expires_at, grace_until)`. MIN matters: a failure
at 19:30 ET must not EXTEND a session that ends at 20:00. If the card is fixed within the hour,
the charge is retried; on success, `expires_at` is restored to the day boundary, recomputed by
`sessionExpiry()` (not remembered), and `grace_until` is cleared.
**Moving `expires_at`: yes, I'm comfortable owning it.** It's the one field the gate already
trusts, and the only other reader is the callback's cookie max-age, which is set once at sign-in
and is harmless when the DB says sooner.

**5. The warning popup reads, it never computes.** The desk page reads the user's charge row
(`state = FAILED`, `grace_until`) and shows the countdown. Web/Design own the surface. The
server is the only clock.

**6. Processor webhooks.** One POST route, `/api/billing/webhook`:
- exempt from nginx Basic Auth, the same way the public paths are (`nginx-locations.conf`);
- signature-verified against the webhook secret before any read;
- idempotent by the processor's event id (a `webhook_events` table), because processors redeliver;
- used for what arrives LATE: disputes, card updated via the hosted portal (triggers the retry
  in step 4), and async failures. The charge itself is synchronous in step 3, so a lost webhook
  never lets someone in unpaid. The daily reconcile read (charges vs processor) catches drift,
  and it folds into the one standing check, not a new one.

**7. Secrets: both halves in the same motion.** Processor API key and webhook signing secret live
in `.env.local` (carried by `sync-env.sh`) and reach `/etc/mointel/mointel.env` in the same ship
as the first code that reads them. Test keys first. A box-only secret is erased by the next sync.

**8. Card on file never touches this box.** The processor's hosted setup page stores the card; we
store only the processor's customer id and payment-method id.

## Where it sits in the cut-over sequence

Billing cannot precede sign-in. The whole auth surface is still unshipped, and `identity.db` does
not exist on the box.

```
1  HIS: Google OAuth client -> .env.local                       (pending, "will do")
2  sync env: IDENTITY_DB_PATH, OAUTH_REDIRECT_URI, Google keys
3  ship the auth surface; PROVE a non-invited account is REFUSED
4  HIS WORD: seed his address; prove admission
5  auth_basic off, last
-- billing starts here --
6  HIS: processor account (test mode), keys -> .env.local
7  ship charges table + mointel-billing unit + webhook route, TEST keys only;
   prove end to end on production routes (there is no staging): sign in -> charged;
   declined test card -> popup -> session ends at +1h; fix card inside the hour -> restored
8  HIS WORD: live keys
```

## HIS RULINGS (2026-09-28 ~01:20Z, relayed by Integration, verbatim where quoted)

- **"days run from 8pm to 8pm ... end of ah to end of ah."** The paid day is 20:00 -> 20:00 ET,
  the SAME instant `sessionExpiry()` already uses. The charge key is `(user_id, et_date)` exactly as
  the session row carries it: a sign-in at Mon 21:00 is Tuesday's paid day. No second boundary.
- **No charge on weekends or holidays.** mointel-billing skips a row whose `et_date` is not a trading
  day. Holidays mean it needs the **trading calendar** (the Alpaca calendar the market worker caches),
  not a weekday test. That is the same mistake preflight's checkpoint arm made on 2026-09-26.
- **A lapsed hour ends that day's session only**, never `revokeEmail` on the account.
- **Retry only on card update** (the portal webhook in step 6), never on a timer.
- **Two OS notifications**: at the failure and at 10 minutes left (Design §3, his direct approval;
  an earlier relay said "one"). The second is computed from `grace_until`, the same value the band
  reads, never from a separate timer. The surface is Design's.
- **First paying users are invited and billed BY HAND; self-serve later.**
- **Build APPROVED, but only after the sign-in cut-over is live and proven to refuse a non-invited
  account (steps 1-5), and nothing charges anyone until he approves the first real run.**
