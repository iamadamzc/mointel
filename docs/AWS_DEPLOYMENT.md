# The desk on AWS

The Trading Desk runs on one Lightsail instance in `us-east-1`. It is the same
application as the local one — same code, same SQLite store, same schedule —
moved somewhere that does not depend on a PC being awake.

This document is what a future deploy reads instead of reconstructing what was
done the first time.

## What exists

| Thing | Name / value |
| --- | --- |
| AWS account | `239732580473` (Magellan), IAM user `adam-magellan-admin` |
| CLI profile | `magellan_admin` |
| Region / AZ | `us-east-1` / `us-east-1a` |
| Instance | `mointel-prod` — `ubuntu_24_04`, bundle `medium_3_0` (2 vCPU, 4 GB, 80 GB SSD) |
| Static IP | `mointel-prod-ip` → `98.85.49.227` |
| Distribution | `mointel-prod-distribution` → `https://dwwep02jje2ag.cloudfront.net` |
| SSH key | `mointel-prod-key`, private key at `A:\AWS_creds\mointel-prod-key.pem` |
| Web login | `A:\AWS_creds\mointel_web_access.txt` (outside the repo, not in git) |

Everything is tagged `Project=MomentumIntelligence`, `Application=mointel`,
`Environment=prototype`.

The public URL is the AWS-provided distribution hostname. There is no custom
domain and none is needed.

```
Browser
   │  HTTPS
Lightsail distribution (dont-cache, forwards Authorization)
   │  HTTP, over the static IP
Nginx  ── Basic Auth ──┐
   │  127.0.0.1:3000   │
Next.js production server
   │
/var/lib/mointel/market.db  (SQLite, WAL)
   ▲
mointel-market · mointel-research · mointel-assess
```

## Layout on the server

```
/opt/mointel/releases/<git-sha>   one directory per deployed commit
/opt/mointel/current -> releases/<git-sha>
/opt/mointel/secrets             file-based credentials, if any are ever needed
/var/lib/mointel/market.db       the store — outside the release, so a rollback
/var/lib/mointel/market.db-wal   cannot take the desk's history with it
/var/lib/mointel/backups         schema backups and pre-deploy snapshots
/etc/mointel/mointel.env         runtime environment, root:mointel 0640
/etc/nginx/mointel.htpasswd      Basic Auth hash, root:www-data 0640
```

The three previous releases are kept. Rollback is a symlink switch, not a
rebuild.

## Services

Five systemd units. `mointel.target` is all of them.

| Unit | What it is |
| --- | --- |
| `mointel-migrate` | one-shot; owns schema migration, runs before everything |
| `mointel-web` | Next.js production server on `127.0.0.1:3000` |
| `mointel-market` | the single Alpaca SIP worker |
| `mointel-research` | the automatic research engine |
| `mointel-assess` | the Desk Assessment scheduler |

### Why migration has its own unit

Three of those services are writers, and each one migrates the store when it
opens it. Started simultaneously on the boot after a schema change, they all
decide at once that the store is out of date: three `VACUUM INTO` backups, three
transactions replaying the same `ALTER`s, and at least one worker dying with
`database is locked` and entering a restart loop. `tests/market/migrationConcurrency.test.ts`
demonstrates exactly that failure with the coordination removed.

So there are two guards, and they cover different things:

1. **`mointel-migrate.service`** — `Type=oneshot`, `RemainAfterExit=yes`, and the
   other four `Requires=` and `After=` it. Nothing starts until it exits 0.
   A non-zero exit holds the whole desk down, which is correct: no writer should
   open a store whose schema it does not understand.
2. **A cross-process lock in `openDatabase`** — an exclusively-created
   `market.db.migrate.lock`. This covers the case systemd cannot: a worker
   started by hand during a deploy, or by somebody debugging at 06:00.

Exactly one migration, exactly one backup, transactional either way.

## Time

**The server runs UTC and must keep running UTC.** Do not set `TZ` on the
instance or in any unit file.

Every checkpoint — 22:00 recap, 06:10 structural refresh, 06:25 / 06:45 / 07:00,
09:25, the RTH intervals, the close, the after-hours transition — is an
`America/New_York` wall-clock time resolved in application code against the
Alpaca exchange calendar. That is what handles DST and early closes. Making any
of it depend on the Linux local timezone would break it on exactly the days it
matters most.

## Day-to-day

```bash
ssh -i A:\AWS_creds\mointel-prod-key.pem ubuntu@98.85.49.227

mointel-status                          # release, services, health, disk, memory

sudo systemctl status mointel-web
sudo systemctl status mointel-market
sudo systemctl status mointel-research
sudo systemctl status mointel-assess

sudo journalctl -u mointel-market -f
sudo journalctl -u mointel-research -f
sudo journalctl -u mointel-assess -f
sudo journalctl -u mointel-web -n 100 --no-pager

sudo systemctl restart mointel-research # one service
sudo systemctl restart mointel.target   # the whole desk
```

`mointel-status` is `/opt/mointel/current/deploy/aws/status.sh`, installed to
`/usr/local/bin` by every deploy.

Health, without logging in, is the same endpoint the deploy script waits on:

```bash
curl -u adam:<password> https://dwwep02jje2ag.cloudfront.net/api/health
```

It reports web, database reachability, schema version, and market / research /
assessment state. It reports no keys, no prompts and no filing text.

## Read-only review sessions

Basic Auth is right for the person who owns the desk and useless for showing it
to anybody else: an HTTP auth challenge cannot be completed by an automated
browsing tool, and handing out the permanent password to solve a temporary
problem trades a day's convenience for an indefinite exposure.

So there is a second way in, and only one:

```
https://dwwep02jje2ag.cloudfront.net/review/<token>
https://dwwep02jje2ag.cloudfront.net/review/<token>/diagnostics
https://dwwep02jje2ag.cloudfront.net/review/<token>/api/diagnostics   (JSON)
```

### Security model

| | |
| --- | --- |
| Permanent Basic Auth | unchanged, still protects `/` and `/api/*` |
| Review token | 256 bits of randomness, base64url, in the URL path |
| Stored as | SHA-256 only — **the raw token is never written to the database** |
| Verified | on every request, against the store, with `timingSafeEqual` |
| Expires | 24 hours by default, configurable at creation |
| Revocable | immediately, and checked per request so there is no TTL to wait out |
| Writes | none — see below |
| Logged | Nginx `access_log` is off for `/review/`, because the token is the path |

**Read-only is structural, not cosmetic.** Three things hold it up, and they
fail independently:

1. `proxy.ts` refuses any method but `GET`/`HEAD` under `/review/` with a 403,
   before a handler sees the request. A mutation endpoint added next year is
   therefore already closed to reviewers on the day it is written.
2. The review API namespace implements no mutating handler at all. A test walks
   every `route.ts` under `app/review` and fails if one appears, or if one
   forgets to call `guardReviewApi`.
3. The review Focus route does not seed. The owner's `GET /api/focus` populates
   an empty list from the day's A-priority names on first read — a write, and
   one allowed only once per trading date. Seeding from a reviewer's page load
   would spend it and leave the owner's strip empty all session.

Focus stars and the reanalysis button are absent in review mode too, but that is
a courtesy: a control that would return 403 is worse than no control.

### Create, list, revoke

From Windows, against production:

```powershell
.\scripts\aws-create-review.ps1                          # 24 hours
.\scripts\aws-create-review.ps1 -Hours 48 -Label chatgpt
.\scripts\aws-create-review.ps1 -Action list
.\scripts\aws-create-review.ps1 -Action revoke -Id 3
.\scripts\aws-create-review.ps1 -Action revoke-all
```

Or on the server directly:

```bash
sudo -u mointel env -C /opt/mointel/current \
  MARKET_DB_PATH=/var/lib/mointel/market.db \
  MOINTEL_PUBLIC_URL=https://dwwep02jje2ag.cloudfront.net \
  npm run review:create -- --hours 24 --label chatgpt
```

`review:list` shows label, created, expires, status and last use. It never
prints a token or a hash — there is nothing stored that could be shown.

### Do not put a review token on a sudo command line

`sudo` writes the command it ran to the journal, argv and all. So this records
the capability in `/var/log/journal` where nothing else does:

```bash
sudo grep -c "$TOKEN" /var/log/nginx/*.log     # DON'T
```

Nginx does not log it (`access_log off` for the prefix), the application never
prints it, and the deploy never sees it — an operator checking up on it by hand
is the one path that leaks it. Search by prefix instead, or revoke afterwards.

### If a review URL is exposed

```powershell
.\scripts\aws-create-review.ps1 -Action revoke-all
```

That is the whole incident response. Revocation is checked on every request, so
the link stops working on the next one. Nothing else needs rotating: a review
token grants no write access, exposes no credential, and cannot reach the owner's
desk at `/`.

### What diagnostics reports

**Deployment** — git SHA, node version, process and server uptime, UTC and ET
time, server timezone.

**Market worker** — health state, SIP connection and entitlement, session phase,
trading date, active board, last whole-market message / bar / trade / quote and
their ages, freshness state and thresholds, ranked / tracked / eligible /
baseline counts, subscriptions, reconnect count, worker start time, last
sanitized error.

**Research worker** — health, queue, active jobs, jobs by status, recent
completions, recent failures with sanitized errors, queue-to-accepted latency,
SEC availability *as the worker last found it* (not merely "a key is set"),
interpreter availability, and the research / escalation / change-detect model
names. No keys, no prompts, no filing text.

**Assessment scheduler** — state, last and next checkpoint with ET times, how
many of today's ran late, most recent failure, scheduler heartbeat age, last
error.

**Google Sheet** — provider, fetch time, cache age, staleness, row counts,
warnings.

**Database** — schema version against the build's expectation, file and WAL
size, journal mode, backup count and newest backup, free disk, and the most
recent *recorded* integrity result. A full `PRAGMA integrity_check` is never run
per request — on a 230 MB store that is a minutes-long read — so the migration
owner records its `quick_check` on every start and the page reports when it was
last asked and what the answer was.

**Server resources** — memory, load average, CPU count, and a per-service state
for web / market / research / assessments derived from heartbeats rather than
`systemctl`. A process that exists and is not writing is the failure worth
catching, and reading other processes' command lines on this box would mean
reading an EnvironmentFile's worth of credentials.

**Intelligence coverage** — counts by status, and any Top-N name still
un-analysed while the engine is healthy.

**Consistency checks** — session/board/trading-date agreement between the clock,
the market worker and the scheduler; ranked names priced off the sheet rather
than the feed; stale telemetry; duplicate checkpoints; overdue scheduler;
snapshot rows with no parent assessment; schema drift; disk pressure.

**Recent errors** — bounded to 20, sanitized, drawn from state the desk already
records. Never raw journald.

It reports no keys, no prompts, no filing text and no environment values, runs
no integrity check, makes no model call, and queues no work. Tests assert the
first of those by reading the module's own source.

## Deploying a new version

From the development machine, in Git Bash:

```bash
git push
deploy/aws/push-release.sh 98.85.49.227 /a/AWS_creds/mointel-prod-key.pem HEAD
```

That ships the committed tree at that sha with `git archive` — no untracked
files, no `.env.local`, no Windows `node_modules` — then runs
`deploy/aws/deploy.sh` on the server, which:

1. `npm ci` (the lockfile, not a fresh resolution; `better-sqlite3` is rebuilt
   for Linux)
2. `npm run build` with `NODE_ENV=production`
3. installs the Nginx site and the systemd units
4. stops web / research / assess
5. runs `mointel-migrate` on its own against the new code
6. switches `current` and starts the services
7. waits for `/api/health`, and **rolls back to the previous release if it never
   comes**

**The market worker is not restarted by default.** Restarting it drops the one
SIP connection the account is allowed, and the desk goes quiet for as long as the
reconnect takes. When a release genuinely changes the worker:

```bash
RESTART_MARKET=yes deploy/aws/push-release.sh 98.85.49.227 /a/AWS_creds/mointel-prod-key.pem HEAD
```

### Rollback

```bash
ssh -i A:\AWS_creds\mointel-prod-key.pem ubuntu@98.85.49.227
ls -1t /opt/mointel/releases                        # newest first
sudo ln -sfn /opt/mointel/releases/<older-sha> /opt/mointel/current
sudo systemctl restart mointel-web mointel-research mointel-assess
curl -fsS http://127.0.0.1/api/health
```

If the release being rolled back **changed the schema**, the code is going back
but the store is not: an older build will refuse a newer `user_version`. Restore
the backup the migration took first:

```bash
ls -1t /var/lib/mointel/backups
sudo systemctl stop mointel.target
sudo -u mointel cp /var/lib/mointel/backups/<backup>.db /var/lib/mointel/market.db
sudo -u mointel rm -f /var/lib/mointel/market.db-wal /var/lib/mointel/market.db-shm
sudo systemctl start mointel.target
```

## Database

### Backups

Two independent layers, deliberately.

- **Schema backups.** `VACUUM INTO` before any schema upgrade, into
  `/var/lib/mointel/backups`. Taken by whichever process migrates — which, on
  the server, is always `mointel-migrate`.
- **Instance snapshots.** Lightsail automatic snapshots at **08:00 UTC / 04:00 ET**
  — after the 22:00 recap, before the 06:10 structural refresh, and nowhere near
  RTH. Lightsail keeps the last 7 automatic snapshots and rotates them itself.

A manual snapshot before anything risky:

```bash
aws lightsail create-instance-snapshot --profile magellan_admin --region us-east-1 \
  --instance-name mointel-prod --instance-snapshot-name mointel-prod-$(date -u +%Y%m%d-%H%M)
```

Do not accumulate manual snapshots — they are billed per GB-month and never
rotate.

### Taking a consistent copy

Never copy `market.db` while a writer is running. WAL means an unknown amount of
committed data is still in the `-wal`, so a file copy opens cleanly, passes an
integrity check, and is silently behind.

```bash
# on the server
sudo -u mointel node /opt/mointel/current/deploy/aws/snapshot-db.mjs \
  /var/lib/mointel/market.db /var/lib/mointel/backups/manual-$(date -u +%Y%m%d-%H%M).db

# on Windows
node deploy/aws/snapshot-db.mjs
```

It reports size, schema version, `integrity_check` and the row counts that
matter, and exits non-zero if the copy is not `ok`.

## Failback to local

The local project stays as a cold development and backup copy. **Never run the
local market worker while the AWS one is running** — the account permits one SIP
connection, and a second does not fail loudly, it silently displaces the first.

```bash
# 1. stop every AWS writer. Web can stay up; it only reads.
ssh -i A:\AWS_creds\mointel-prod-key.pem ubuntu@98.85.49.227 \
  "sudo systemctl stop mointel-market mointel-research mointel-assess"

# 2. take a consistent snapshot and bring it home
ssh ... "sudo -u mointel node /opt/mointel/current/deploy/aws/snapshot-db.mjs \
         /var/lib/mointel/market.db /var/lib/mointel/backups/failback.db"
scp -i A:\AWS_creds\mointel-prod-key.pem ubuntu@98.85.49.227:/var/lib/mointel/backups/failback.db .

# 3. put it in place of data/market.db (keep the old one) and start the local desk
npm run desk
```

Going the other way is the same procedure in reverse. The rule is the same in
both directions: **the writers run in one place at a time.**

## Firewall

```
22/tcp  → a single admin IP
80/tcp  → 0.0.0.0/0   (the distribution's origin; Basic Auth is the gate)
```

Port 3000 is not open. Neither is anything else. SSH is key-only —
`PasswordAuthentication no` is asserted by `bootstrap.sh`, not assumed.

When the admin IP changes, SSH stops working and nothing else does:

```bash
curl -s https://checkip.amazonaws.com     # the new address
aws lightsail put-instance-public-ports --profile magellan_admin --region us-east-1 \
  --instance-name mointel-prod \
  --port-infos "fromPort=22,toPort=22,protocol=TCP,cidrs=<new-ip>/32" \
                "fromPort=80,toPort=80,protocol=TCP,cidrs=0.0.0.0/0"
```

`put-instance-public-ports` **replaces** the whole rule set, so both rules must
always be listed together.

## The distribution

Configured for a live application, not a static site:

- `defaultCacheBehavior: dont-cache` — every request reaches the origin
- all HTTP methods allowed, so the Focus pin/unpin POSTs work
- query strings forwarded
- cookies forwarded
- `Authorization` forwarded, which is what makes Basic Auth work through the CDN

Nothing is cached at the edge, including `/_next/static`. Static assets are
content-hashed and would be safe to cache, but a live desk showing a stale board
is a worse failure than an extra origin fetch, and this is one user.

## Rebuilding from nothing

```bash
# 1. instance, static IP, firewall (see the AWS resource table above)
# 2. prepare it
scp -i <key> deploy/aws/bootstrap.sh ubuntu@<ip>:/tmp/
ssh -i <key> ubuntu@<ip> "sudo bash /tmp/bootstrap.sh"
# 3. secrets and the password
deploy/aws/sync-env.sh   <ip> <key>
deploy/aws/setup-auth.sh <ip> <key>
# 4. the code
deploy/aws/push-release.sh <ip> <key> <sha>
# 5. the store: snapshot locally, copy it up, check it
node deploy/aws/snapshot-db.mjs
scp -i <key> data/backups/<snapshot>.db ubuntu@<ip>:/tmp/market.db
ssh -i <key> ubuntu@<ip> "sudo install -o mointel -g mointel -m 0640 /tmp/market.db /var/lib/mointel/market.db && rm /tmp/market.db"
```

`bootstrap.sh` is idempotent and holds no secrets, which is why it can live in
the repository. `sync-env.sh` and `setup-auth.sh` hold the ones that matter and
never print, log, or commit them.

> Lightsail wraps instance user-data in its own `#!/bin/sh` script, so
> `bootstrap.sh` fails as user-data (`set -o pipefail` is not a `dash` option).
> Run it over SSH.

## Cost

Queried from AWS at deployment, not estimated:

| Resource | | $/month |
| --- | --- | ---: |
| `medium_3_0` instance | 2 vCPU, 4 GB, 80 GB SSD, 4 TB transfer | 24.00 |
| `small_1_0` distribution | CDN, 50 GB transfer | 2.50 |
| `mointel-prod-ip` | free while attached to a running instance | 0.00 |
| Automatic snapshots | 7 × instance size actually used, $0.05/GB-month | ~2–3 |
| | | **~$29** |

Excludes Alpaca and OpenAI, which are unchanged by the move.
