# Billing v1: what the branch holds, and what each owner wires

*Billing-tmi, 2026-10-17 (UTC). Branch `billing/stripe-v1-on-d772ba25`, off production `d772ba25`. Built against
the sandbox of the Andromeda Genius LLC account (`acct_1URMIKB5yil73Emz`; the first sandbox, `acct_1URKyNAh2qhlsuTW`,
belonged to an account set up as an individual and is left as it is). Nothing here is reachable: there is no route, no unit and no page, and
no live key works without `BILLING_LIVE_APPROVED=yes`.*

## What is built (library and tests only)

| File | What it does |
| --- | --- |
| `lib/billing/schema.ts` | Five additive tables in identity.db: customers, one charge row per (user, paid day), plans, webhook event ids, disputes. No version bump, so a rollback still opens the store. No card data. |
| `lib/billing/store.ts` | The writes. A decline writes `failed_at` and `grace_until` once and clamps that day's live sessions to `MIN(expires_at, grace_until)`. A success restores live sessions to the 20:00 ET boundary. A plan covers paid days only after an invoice is paid. |
| `lib/billing/charge.ts` | `openPaidDay` (called at sign-in: writes a PENDING row, never calls Stripe) and `runChargePass` (the billing unit: off-session PaymentIntent, idempotency key per user, paid day and definite outcome). Only a card error is a decline; an outage or a calendar failure leaves the row PENDING. |
| `lib/billing/checkout.ts` | Hosted Checkout. Daily on a trading day: pays day one and saves the card. Daily on a weekend or holiday: saves the card, charges nothing. Plans: a subscription in flexible billing mode. Prices are found by lookup key and checked against his ladder. Also opens the customer portal. |
| `lib/billing/webhook.ts` | Signature check, then one action per event id. A finished Checkout writes the verified Google address to the allowlist (`invited_by 'stripe'`). A card update is the only thing that retries a decline. |
| `lib/billing/lapse.ts` | A declined renewal whose hour has run out is cancelled in Stripe (no proration) and lapses to daily. |
| `lib/billing/trialClock.ts` | The trial's end: 48 hours counted only inside paid days that end on a market day. A pure function. |
| `lib/billing/calendar.ts` | The trading calendar from Alpaca, one fetch per month. It throws rather than guessing. |
| `lib/billing/stripeClient.ts` | The key comes from `STRIPE_SECRET_KEY` only. A live key is refused unless `BILLING_LIVE_APPROVED` is exactly `yes`. |
| `lib/billing/webhookRoute.ts` | The whole body of `POST /api/billing/webhook`, for Ops's route to call. |
| `worker/billing.ts` | The loop for a `mointel-billing` unit: a charge pass and a lapse pass every 15 s. |
| `lib/auth/store.ts` | One line: also runs the billing schema on open. |

The gate (`lib/auth/gate.ts`) is untouched.

## For Ops

**1. The route.** `app/api/billing/webhook/route.ts`, exempted from the request gate:

```ts
import { billingWebhookResponse } from '@/lib/billing/webhookRoute';
export async function POST(request: Request) {
  return billingWebhookResponse(request);
}
```

- Its only caller is Stripe.
- A missing secret, a missing `Stripe-Signature` header or a bad signature gets 400 and nothing is acted on.
- 200 means handled, or already handled.
- 500 means a handler threw, and Stripe redelivers.
- The body is read with `request.text()` and verified untouched.
- `tests/auth/requestGate.test.ts` will flag the new route until the exemption is written, which is the point.

**2. nginx**, an exact location ahead of `location /api/`:

```nginx
# Stripe's webhook. No session and no Basic Auth: the app verifies Stripe's
# signature on the raw body before reading anything.
location = /api/billing/webhook {
    limit_except POST { deny all; }
    client_max_body_size 1m;

    proxy_pass http://mointel_app;
    proxy_http_version 1.1;
    proxy_set_header Host              $host;
    proxy_set_header X-Real-IP         $remote_addr;
    proxy_set_header X-Forwarded-For   $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $mointel_forwarded_proto;
    proxy_set_header Connection        "";
    proxy_cache off;

    proxy_connect_timeout 10s;
    proxy_send_timeout    30s;
    proxy_read_timeout    30s;
}
```

- Request buffering changes only when nginx forwards the bytes, never the bytes themselves, so it cannot break the signature.
- I have not read Stripe's maximum event size. 1m is my guess at an ample ceiling. Whether `auth_basic off` is needed depends on the server block, which is yours.

**3. The unit.** It is a loop, not a timer, so a decline shows within seconds. This is a draft for you to place, not a file in `deploy/aws/systemd/`, because deploy.sh installs every `*.service` it finds:

```ini
[Unit]
# Daily charges and plan lapses for TMI Trader. Talks to Stripe and to Alpaca's
# calendar. Its own unit so a web deploy never interrupts a charge.
Description=Momentum Intelligence: billing worker
After=network-online.target mointel-migrate.service
Wants=network-online.target
Requires=mointel-migrate.service
PartOf=mointel.target
StartLimitIntervalSec=300
StartLimitBurst=5

[Service]
Type=simple
User=mointel
Group=mointel
WorkingDirectory=/opt/mointel/current
Environment=NODE_ENV=production
EnvironmentFile=/etc/mointel/mointel.env
ExecStart=/usr/bin/node node_modules/tsx/dist/cli.mjs worker/billing.ts
Restart=always
RestartSec=10
KillSignal=SIGTERM
TimeoutStopSec=30
SuccessExitStatus=143 SIGTERM
StandardOutput=journal
StandardError=journal
SyslogIdentifier=mointel-billing
NoNewPrivileges=yes
PrivateTmp=yes
ProtectSystem=strict
ProtectHome=yes
ReadWritePaths=/var/lib/mointel

[Install]
WantedBy=mointel.target
```

- It writes only identity.db, so `ReadWritePaths` leaves out the release directory.
- It needs `IDENTITY_DB_PATH` and the Alpaca credentials that are already in the env file.

**4. Env names.** None is ever logged, and error text names the variable, never its value.

| Name | Meaning |
| --- | --- |
| `STRIPE_SECRET_KEY` | Secret key, test mode only until his go. He puts the value in `.env.local`. |
| `STRIPE_WEBHOOK_SECRET` | The endpoint's signing secret, shown when the endpoint is registered. |
| `BILLING_LIVE_APPROVED` | Must be exactly `yes` for a live key to be accepted. Unset until his go. |
| `BILLING_LAPSED_DOOR` | See below. Unset means `charge_first`. |
| `BILLING_PASS_MS` | Optional. Loop interval; defaults to 15000. |

## BILLING_LAPSED_DOOR (his ruling: charge_first)

What the next paid day does after a lapsed hour, for a customer whose card is still failing:

- `charge_first`: the board waits for the charge. A decline shows the update-card screen, not the board. This is Integration's recommendation, and the default, so a typo never hands out free hours.
- `one_hour`: the day starts the ordinary way, so a failing card gets one admitted hour each day.

`openPaidDay` already returns which door applies. **What `charge_first` shows is not built yet.** The page has to hold the board until the charge row resolves, and the gate must not learn about payment. That piece is Web's and Design's surface. His answer came 2026-10-17: `charge_first` is the rule.

## The free trial (his rulings, 2026-10-17)

A card is required to START the trial, and it is never charged. The trial is **48 hours from its start, counting only hours inside a paid day (20:00 to 20:00 ET) that ends on a market day** ("from session time +48 hours of trading days"). His confirmed example: started Thu 10:00 ET, it ends Mon 10:00 ET. Started on a Saturday, it ends Tue 20:00 ET.
- `createTrialCheckoutSession`: Stripe's hosted Checkout by redirect, setup mode, cards only, no charge. It is refused for an account that has trialled or has ever bought.
- The webhook reads the card's fingerprint and **detaches the card at once**. Stripe: detachment "is permanent and irreversible"; a detached card "can no longer be used for payments or re-attached". Only then does it record the trial (one per account, one per card fingerprint) and invite (`invited_by 'stripe-trial'`).
- `trialEndsAt(start, calendar)` (`lib/billing/trialClock.ts`) is a pure function. The billing unit fills `ends_at` with it (`fillTrialEnds`, using Alpaca's calendar) and ends any live session at that instant. Until then the trial counts as running, and a calendar failure never guesses.
- `openPaidDay` returns `trial` (with `endsAt`) while it runs, and holds the new session to the end. After the end, a person who never bought gets `buy_first`: show the buy screen, not the board. A trial writes no charge row at all.
- **The fingerprint is kept forever** (his answer), even after an account closes. Nothing deletes a `billing_trials` row, and an account-deletion tidy-up must leave that table alone.
- Kept by us: user, card fingerprint, start and end. Kept by Stripe: its own record of the detached card (brand, last 4, expiry, fingerprint), under its privacy policy, with no fixed period.

## The desk's billing screens (Integration's ruling, 2026-10-17)

`lib/billing/account.ts` holds what Design's routes call. The routes and screens are Design's.
- `billingStateFor(db, userId)` returns `DeskBillingState`: the door (`ok`, `trial`, `buy_first`, `charge_first`), the grace band with its kind (daily or plan) and amount, the trial's end, the plan (kind, price, paid-through, renews-on or ends-on), whether a card is on file, and the latest charge. It is a pure read with no Stripe call, so `GET /api/billing/state` can poll it.
- `cancelAtPeriodEnd({ db, stripe }, userId)`: one step, no portal, idempotent. Access runs to the paid date; no refund.
- `removeDefaultCard({ db, stripe }, userId)`: unsets and detaches the saved card. It is **refused while a plan still renews on it** (read 150). After removal, sign-in shows `buy_first` and attempts no charge (removing the card is stopping, not a decline). Saving a card again clears it.
- `billingHistory` now returns every daily charge with its state (`paid`, `declined`, `pending`, `refunded`). A refund reported by Stripe (`charge.refunded`, which happens only through the "make it right" cases) marks the day Refunded.
- `charge_first` applies from the paid day AFTER the card first failed. On the day of the failure the person has the hour and the band. Sign-in (`openPaidDay`) and the state read share one rule (`cardFailedBeforeToday`).

## Still to wire (owners)

- **The sign-in hook (Web/Ops, whoever owns `lib/auth/callback.ts`).** One call to `openPaidDay(db, userId, now)` after `createSession` for an admitted user.
- **The band and the notifications (Design, Web).** They read `billingStatus(db, userId)`: `{ state: 'grace', endsAt }` or `{ state: 'ok' }`.
- **The pages (Web).** Billing history for daily buyers (from `billingHistory`), pricing, the Checkout redirect (`createCheckoutSession`, which needs the front page's off-site link test relaxed), "you are in", update card and cancel (both `createPortalSession`). The words on the Checkout page (the mandate lines and the terms consent) are Commercial's and Marketing's, verbatim to him.
- **The webhook endpoint in the sandbox (Billing).** Registered once the route exists, with `WEBHOOK_EVENTS` from `lib/billing/webhook.ts`.
- **Dashboard settings (HIS).** Renewal reminder emails, failed-payment emails, the subscription-management link, and the retry schedule (a custom schedule at its minimum, with "cancel the subscription" when recovery fails).

## Known limits, stated

- **Idempotency keys expire after 24 hours** at Stripe. A row left PENDING through an outage longer than that is retried under a key Stripe no longer remembers. The daily reconcile read (Ops design item 6) is what would catch a double charge there. It is not built.
- **The first-purchase email check.** If a buyer's verified address changes between starting Checkout and paying, the payment is kept, nobody is invited, and a log line says so. A person decides.
- **`payment_method.detached`** (the planner's addition, ruled in) is recorded in the log and nothing more: the desk stores no card, so the next charge on a customer with no default card is a definite decline and gets the ordinary hour.
- **Receipts for daily buyers.** An off-session PaymentIntent creates no Invoice, so daily days do not appear in the portal's invoice history. Stripe emails a receipt per successful payment when his Dashboard setting Settings > Business > Customer emails > "Successful payments" is on. The desk lists them itself: `billingHistory(db, userId)` returns each charged day's date, amount and `receipt_url` (Integration's ruling, 2026-10-17). The page is Web's. Stripe: "Receipts don't expire, but for security reasons, links to receipts expire after 30 days", after which Stripe asks for the email address and sends a fresh link; the page says that plainly. No `invoice_creation` on Checkout.
- **Price changes need 30 days' notice** (his ruling). Nothing here changes a price; a change is a new Stripe price and a migration, done with that notice.
