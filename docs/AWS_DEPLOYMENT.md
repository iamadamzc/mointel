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

**Two public hostnames, and they do NOT share a path** (measured 2026-09-15;
this paragraph previously said there was no custom domain, and a seat reasoned
a whole route argument from that false premise):

```
tmitrader.com, www.tmitrader.com  -> 98.85.49.227   the Lightsail static IP, nginx DIRECT
dwwep02jje2ag.cloudfront.net       -> 13.33.244.x   the distribution, which fronts the
                                                    same origin but is NOT in the custom
                                                    domain's path
curl -sI https://tmitrader.com/   -> Server: nginx; no Via, no X-Cache, no X-Amz-Cf-*
```

**Every public-route verification in `docs/web/` is a `curl` against
`tmitrader.com`, and it is a valid proof ONLY BECAUSE nothing caches in front
of that hostname.** A `200` means the nginx exemption works and a `401` means
it does not. **If a distribution is ever put in front of `tmitrader.com`, a
cached response can return either code for the wrong reason and that proof
silently stops proving anything while still passing.** Whoever adds a CDN to
the custom domain must re-derive the verification against the origin.

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
/etc/nginx/mointel.htpasswd      Basic Auth hashes, root:www-data 0640
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
curl -u <login>:<password> https://dwwep02jje2ag.cloudfront.net/api/health
```

It reports web, database reachability, schema version, and market / research /
assessment state. It reports no keys, no prompts and no filing text.

## Logins

Basic Auth is applied by the origin, not the edge, so one rule covers `/` and
every `/api/*` route alike — including the Focus POSTs. It lives in
`/etc/nginx/mointel-locations.conf`, which both the `:80` and `:443` servers
include, so the two listeners cannot drift apart.

The desk has more than one login:

| Login | Set |
| --- | --- |
| `adam` | 2026-08-18, generated by `setup-auth.sh` |
| `mointel1` | 2026-08-21, chosen by hand |

Passwords are in `A:\AWS_creds\mointel_web_access.txt`, outside the repository.
That file holds the plaintext for whichever login was written last and lists the
others by name only. A hand-chosen password is worth rotating to a generated one
once whatever needed it is done.

Add a login, or replace one's password, without disturbing the others:

```bash
deploy/aws/setup-auth.sh 98.85.49.227 /a/AWS_creds/mointel-prod-key.pem <username>
```

That generates the password on the server and never prints it. To choose the
password instead, do it by hand:

```bash
ssh -i <key> ubuntu@98.85.49.227
sudo htpasswd    /etc/nginx/mointel.htpasswd <username>   # add, or change
sudo htpasswd -D /etc/nginx/mointel.htpasswd <username>   # remove
sudo cut -d: -f1 /etc/nginx/mointel.htpasswd              # who exists now
```

**Never `htpasswd -c`.** It rewrites the file from scratch and every other login
goes with it. `setup-auth.sh` passes `-c` only when there is no htpasswd file at
all, which is what makes a second run safe.

Nginx re-reads the file on every request, so none of this needs a reload.

## Read-only review sessions

Basic Auth is right for the person who owns the desk and useless for showing it
to anybody else: an HTTP auth challenge cannot be completed by an automated
browsing tool, and handing out the permanent password to solve a temporary
problem trades a day's convenience for an indefinite exposure.

> **A review session can display the desk and cannot exercise it.** Found
> 2026-08-23 by Design, trying to click a column header, and confirmed against
> production. Every `/_next/static/*` request returns **401** in a review
> session: `location /review/` sets `auth_basic off`, but Next.js serves its
> assets from `/_next/static/*`, which falls under `location /` and inherits the
> server-level `auth_basic` in `nginx-locations.conf:14-15`. The HTML arrives and
> nothing else does — no JavaScript, so the page never hydrates and no click does
> anything; no CSS, so it renders unstyled.
>
> This section is otherwise accurate, and the reasoning above is still why review
> sessions exist. But the promise immediately below — that this is the way to
> show the desk to an automated browsing tool — **is not currently met**, and it
> is the kind of defect only clicking something reveals. Nothing that reads
> server-rendered HTML would notice.
>
> **Fixed the same day, in `c36b840`:** `location ^~ /_next/static/ { auth_basic
> off; }`. Build assets — and only those — are served without Basic Auth;
> `/`, `/api/`, `/_next/image` and `/_next/data` all still require it, so no
> desk state opened. The bundle was checked first and carries no secrets: the
> project defines zero `NEXT_PUBLIC_*` variables and the chunks scan clean of
> credential and infrastructure patterns. Reasoning and blast radius in
> [threads/ops.md](threads/ops.md) Open item 9.
>
> **Applied by config reload, not a deploy.** `deploy.sh` installs this file
> from the release, but it can also be installed and reloaded on its own —
> graceful, no service restarts, and it does not touch the market worker. That
> is the right mechanism for any transport-only change here.

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

### Testing whether a review link is live

**Ask its API, not its HTML.** The page returns **200 even when the token is
revoked, expired or never existed** — it renders an explicit refusal in the body,
but the status does not say so. The API is correct:

```bash
curl -s -o /dev/null -w '%{http_code}\n' "https://dwwep02jje2ag.cloudfront.net/review/<token>/api/dashboard"
# 200 = live    403 = revoked, expired or invalid
```

Verified 2026-08-23: revoked and garbage tokens both return 403 from every review
API route, with no data in the body; the HTML page returns 200 for all three
states. A status check against the page is a **false pass** — this cost one
false alarm already. Why the page is not fixed, and why the obvious fix would
have been a no-op, is in [threads/ops.md](threads/ops.md) Open item 10.

`review:list` shows label, created, expires, status and last use. It never
prints a token or a hash — there is nothing stored that could be shown.

### Reaching the desk when a transport is blocked

The review capability is the same in every case; what changes is the road to it.
There are now three, in the order they were added, because each earlier one
turned out to be unreachable from some client that mattered:

| Transport | Hostname | Notes |
| --- | --- | --- |
| Lightsail distribution | `dwwep02jje2ag.cloudfront.net` | production; keep |
| Direct origin | `98-85-49-227.sslip.io` | Let's Encrypt on the static IP, no CDN |
| API Gateway HTTP API | `u306vfhoz4.execute-api.us-east-1.amazonaws.com` | **temporary**, for external inspection |

All three end at the same Nginx, the same Next.js process and the same store.
No transport adds a worker, a process or a copy of the data, and Basic Auth on
`/` is enforced once, by Nginx, for all of them.

The API Gateway API is an HTTP API with `GET /`, `HEAD /`, `GET /{proxy+}` and
`HEAD /{proxy+}` routed to an `HTTP_PROXY` integration on the sslip.io origin.
There is deliberately no `ANY` route: a POST has nothing to match and is refused
with 404 by API Gateway before the application is involved at all, which is a
second barrier in front of the one proxy.ts already provides.

Access logging is deliberately **off** on the stage. The review token is in the
request path, and an access log is a file that gets copied and read by people
who were never given the link. Cost is per request only — $1.00/million, no
fixed monthly charge and no VPC link, NAT, ALB, Lambda, WAF or custom domain.

**Deleting the temporary API** (does not touch CloudFront or the sslip.io
origin, and restarts nothing):

```bash
aws apigatewayv2 delete-api --profile magellan_admin --region us-east-1   --api-id u306vfhoz4

# confirm it is gone
aws apigatewayv2 get-apis --profile magellan_admin --region us-east-1   --query "Items[?Name=='mointel-chatgpt-review']"
```

Deleting the API deletes its routes, integrations and stage with it. The review
tokens are unaffected — they live in the store, not in the transport — so revoke
them separately with `review:revoke-all` when the inspection is finished.

### The MCP server

ChatGPT could not fetch this application through any of the three transports
above — two of its failures had nothing to do with the server, so a fourth
hostname was not the answer. It calls the desk instead:

```
https://<origin>/mcp/<token>
```

Streamable HTTP, POST only. `GET` answers 405, which the spec permits, because
no tool here would ever push anything. No session id is issued, so every request
is authorised on its own and a revoked capability stops working on the next
call.

**Origins that work:** the CloudFront distribution and the direct sslip.io
origin. **Not** the API Gateway proxy — its routes are `GET`/`HEAD` only by
design, and MCP is entirely POST.

**Auth** is the same review capability, for a specific reason rather than
convenience: ChatGPT's no-auth connector mode sends no `Authorization` header,
so the secret must live where that client will keep it — the URL. A 256-bit path
segment is the same secret a bearer token is; it is stored only as a SHA-256, it
expires, and `review:revoke` kills it. Clients that can send headers may use
`Authorization: Bearer <token>` instead.

**Eight read-only tools:** `get_desk_status`, `get_discovery`, `get_focus`,
`get_ticker`, `get_recent_events`, `get_assessment_status`, `get_assessment`,
`get_diagnostics`. Each is annotated `readOnlyHint: true` — ChatGPT treats a tool
without it as a write action and prompts before every call.

They are not a second view of the data. `get_ticker` calls `buildDeskRead` and
`buildStructureSummary`, the drawer's own functions; `get_discovery` returns rows
from the same `mergeDesk` the board renders. A disagreement between a tool and
the screen is therefore a real bug, not an artefact of this layer.

**Prove it before involving ChatGPT:**

```bash
node scripts/mcp-probe.mjs https://98-85-49-227.sslip.io/mcp/<token>
node scripts/mcp-probe.mjs https://98-85-49-227.sslip.io/mcp/<token> get_ticker '{"ticker":"XOS"}'
```

It walks initialize → initialized → tools/list → tools/call and names the step
that broke. When a connector fails inside somebody else's product, you otherwise
cannot tell whether the handshake, the transport, the auth or the tool was wrong.

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
  the server, is always `mointel-migrate`. **The migration that takes one also
  reaps: after its upgrade commits it keeps the newest 3 `market-v<N>-<stamp>.db`
  files and removes the rest** (`reapSchemaBackups` in `lib/market/store/db.ts`,
  `SCHEMA_BACKUPS_KEPT`). It never touches a backup a pin under
  `/opt/mointel/pins` names, and never touches anything else in the directory —
  `manual-*.db`, `failback.db`, snapshots and `cutover-final.db` are not its
  files. Every removal is logged by name in the `mointel-migrate` journal. An
  ordinary start, or a brand-new store, reaps nothing.
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

**`data/market.db` is the LOCAL split-brain desk, not a copy of production.**
It is the failback *target* — the path is load-bearing for this procedure, so
do not rename it — but until a failback actually happens it holds whatever the
local desk last wrote, which on 2026-09-05 was sixteen days stale.

On 2026-09-05 two threads read it as production's store, found a 4h37m hole in
2026-08-18's minute bars, and diagnosed a capture fault that did not exist: the
local worker had simply been off. Production wrote 10,489 events in the window
where that file wrote nine. **A store that answers is not a store that answers
for the right desk** — it cannot fail to return rows, only return the wrong
desk's. `data/README.md` names every store in that directory.

Going the other way is the same procedure in reverse. The rule is the same in
both directions: **the writers run in one place at a time.**

## Firewall

```
22/tcp  → admin IPs only (three /32s as of 2026-09-12; read the live set, do not trust this line)
80/tcp  → 0.0.0.0/0   (the distribution's origin; Basic Auth is the gate)
443/tcp → 0.0.0.0/0
```

Read the live set before changing it — `put-instance-public-ports` replaces
every rule, so the three rules above must all be resent:

```bash
aws lightsail get-instance-port-states --profile magellan_admin --region us-east-1   --instance-name mointel-prod --query 'portStates[].{port:fromPort,cidrs:cidrs}'
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
