# Thread: Operations & Deployment

**Owns the live desk.** The server, the market worker, deploys, rollbacks,
auth, backups, and any incident that reaches production.

Last worked: **2026-08-21**. Written up 2026-08-23.

## Scope

- The AWS Lightsail instance, Nginx, CloudFront, TLS, firewall, Basic Auth
- Deploys and rollbacks — **this thread is the only one that deploys**
- The Alpaca market worker and the SIP connection
- The assessment scheduler and its checkpoint windows
- Production SQLite: migrations, backups, consistency
- Incident diagnosis on live evidence

## Not this thread

- UI components and anything in the audit's remediation plan → [design.md](design.md)
- The interpreter, evidence collection, model spend → [research.md](research.md)

Both of those produce commits. **They come here to be deployed.** Take the
handoff, run the gate, deploy — do not review their design decisions.

## State as of 2026-08-21

Production is **`32e47c9`**, schema **v21**, deployed 09:00 ET after the Phase 1
UI work. Market feed LIVE, streaming, ~1s message age. Research IDLE.

Rollback pins retained: `80437c3` and the `372f5eb` baseline.

Two defects were found and fixed *during* that deploy, both now in production:

- the preflight bootstrap that would have blocked every future deploy
- an enum leak that only real dossiers could reveal (now caught at compile time)

The last deploy ran with `RESTART_MARKET=no`, so the SIP connection was never
touched. Both branches of the bootstrap fix have now been exercised in
production, not just the fallback.

## Open items

**1. The Momentum Desk shortcut is a live hazard.** It still launches a full
*local* desk. Alpaca permits one concurrent SIP connection per account and a
second worker does not error — it silently kills the live one. Double-clicking
it out of habit takes production down. Flagged twice across sessions, never
fixed. It should be repointed at the CloudFront URL or removed.
Shortcut lives in `C:\Users\adshu\OneDrive\Desktop` (OneDrive-redirected, so it
also syncs to machines where `A:\mointel` does not exist).

**2. `main` is 53 commits behind.** Not urgent, but every session has to be told
this or it will reason about the wrong tree. Either merge or decide out loud
that `session-aware-discovery` is the trunk now.

## Before you deploy

The gate, all four green: `npm test`, `npm run lint`, `npm run typecheck`,
`npm run build`.

```bash
deploy/aws/push-release.sh 98.85.49.227 /a/AWS_creds/mointel-prod-key.pem HEAD
```

Preflight refuses to deploy within 5 minutes of a scheduled checkpoint and
prints the reason. Read [../OPERATIONS.md](../OPERATIONS.md) §"Deploying near a
checkpoint" and §"Release retention and rollback pins" before overriding
anything. Rollback and backup procedure: [../AWS_DEPLOYMENT.md](../AWS_DEPLOYMENT.md).

## Traps that cost time before

Full list in [../OPERATIONS.md](../OPERATIONS.md) §"Known rough edges" and the
project memory. The three that have actually bitten:

- **One SIP connection.** Never start `npm run market:alpaca` by hand while the
  desk is up. Never leave orphaned workers.
- **Never launch desk processes from inside a chat session for the user to
  keep.** They die when the session ends. Test with them, then hand the desk
  back by telling the operator to launch it themselves.
- **Editing a `CREATE TABLE` in `lib/market/store/db.ts` migrates nothing.** The
  block is `CREATE TABLE IF NOT EXISTS`. New columns must also go in
  `ADDED_COLUMNS` with a `SCHEMA_VERSION` bump, or the live desk fails at the
  first INSERT.

## Opening message for a new chat

> This is the **Ops thread** for the Momentum Intelligence desk at `A:\mointel`.
> Read `docs/threads/ops.md` and `docs/threads/README.md` first, then
> `docs/OPERATIONS.md` and `docs/AWS_DEPLOYMENT.md` as needed.
>
> You own the live desk: AWS, deploys, the market worker, incidents. You are the
> only thread that deploys. UI work belongs to the Design thread and interpreter
> or model-spend work belongs to the Research thread — if you find work there,
> write it into that charter's Open items and hand it over rather than doing it.
>
> Production is `32e47c9`, schema v21. Credentials are in `A:\AWS_creds\` — use
> them non-interactively and never print, log, commit or move a value.
>
> Start by confirming the working tree, HEAD, and what production is actually
> running. Do not deploy anything until I ask.
