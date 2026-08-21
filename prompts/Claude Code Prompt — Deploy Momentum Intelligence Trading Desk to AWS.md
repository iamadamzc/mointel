We are moving the existing Momentum Intelligence Trading Desk from localhost to an always-running AWS environment.

The objective is NOT to redesign or re-architect the application.

The objective is:

**take the currently working local application and deploy it safely to a cheap always-on AWS server so market discovery, automatic research, scheduled assessments and the dashboard continue running whether or not my PC/browser is open.**

The existing application lives at:

`A:\mointel`

GitHub:

`https://github.com/iamadamzc/mointel`

AWS credentials and prior AWS deployment material are available locally.

## IMPORTANT LOCAL LOCATIONS

### AWS credentials / Magellan account

Inspect:

`A:\AWS_creds`

This contains the AWS credentials/configuration for the **Magellan AWS account** that should be used for this deployment.

Do NOT:

- print credentials
- echo access keys
- include them in logs
- copy them into the repository
- commit them
- expose them in shell output
- put them into generated documentation

Use them programmatically/safely.

First determine whether an existing AWS CLI profile/configuration already exists and use that if practical.

Verify the identity with:

`aws sts get-caller-identity`

but report only:

- account ID
- IAM identity/ARN at a safe level
- active region/profile

Never report secret/access-key values.

### Prior AWS deployment example

Inspect:

`A:\TLDW`

I previously deployed another application from this folder to AWS using Claude/AWS CLI.

Determine:

- what AWS service it uses
- region
- deployment scripts
- credential/profile pattern
- SSH/key handling
- naming/tagging conventions
- any useful Lightsail setup pattern

Use it as a reference where appropriate.

DO NOT:

- modify TLDW
- redeploy TLDW
- stop TLDW
- delete TLDW resources
- reuse resource names that would collide
- change its DNS/networking

Treat it as a read-only deployment example.

---

# PHASE 0 — AUDIT BEFORE CREATING ANY AWS RESOURCES

Before creating anything:

1. Inspect `A:\mointel`.
2. Inspect git status and current HEAD.
3. Determine whether the session-aware Discovery / Assessment Engine work is still uncommitted.
4. Run the complete local gate.
5. Inspect `A:\AWS_creds`.
6. Inspect `A:\TLDW`.
7. Inspect current Lightsail/related resources in the Magellan AWS account.
8. Determine the region used for TLDW and whether it makes sense to place mointel in the same or another East Coast region.
9. Query current Lightsail instance bundles and distribution bundles from AWS rather than hardcoding price assumptions.
10. Confirm no existing resource named for mointel will be accidentally overwritten.

If the mointel working tree contains only the validated current product work and the full gate passes, create a clean deployment-source checkpoint commit and push it before deploying.

If unexpected/unrelated changes or secrets are present, STOP before commit and report them.

The AWS deployment must always be tied to an exact git commit hash.

---

# TARGET ARCHITECTURE

Prefer the simplest architecture that supports the existing application correctly.

Default target:

```text
Browser
   ↓ HTTPS
AWS-provided Lightsail Distribution URL
   ↓
Nginx
   ↓
Next.js production server
   ↓
Shared SQLite database
   ↑
Alpaca Market Worker
Research Worker
Desk Assessment Worker
```

One server.

No Kubernetes.

No ECS/Fargate unless a concrete blocker makes a normal Lightsail instance impossible.

No RDS/PostgreSQL migration in this phase.

No Redis.

No SQS.

No load balancer unless absolutely required.

The application is still a single-user prototype producing one shared intelligence state.

---

# AWS COMPUTE DEFAULT

Prefer an Amazon Lightsail Linux/Ubuntu instance.

Start with approximately:

- 2 vCPU
- 4 GB RAM
- 80 GB SSD
- public IPv4

Use the current AWS bundle returned by the CLI rather than hardcoding a stale bundle ID.

Before creation, report the current AWS monthly bundle cost.

Default budget target for infrastructure:

**under approximately $50/month excluding Alpaca/OpenAI/API costs.**

If the proposed AWS infrastructure exceeds approximately $50/month, STOP before provisioning the higher-cost architecture and explain why.

Use a current Ubuntu LTS Lightsail blueprint obtained from AWS CLI rather than hardcoding an obsolete blueprint ID.

Prefer the same AWS region as the prior TLDW deployment if it is sensible and available.

Otherwise prefer a suitable U.S. East region.

Do not move to a larger instance unless actual resource measurements justify it.

---

# RESOURCE NAMES

Use clear isolated names such as:

`mointel-prod`

`mointel-prod-ip`

`mointel-prod-distribution`

or similarly clean names consistent with existing Magellan conventions.

Tag resources where supported:

`Project=MomentumIntelligence`

`Application=mointel`

`Environment=prototype`

Do not modify unrelated Magellan resources.

---

# STATIC IP

Create and attach a Lightsail static IPv4 address to the mointel instance.

The application origin should not depend on an ephemeral IP.

Record the resource name in deployment documentation.

---

# AWS-PROVIDED HTTPS ENDPOINT — NO DOMAIN YET

I do NOT want to buy/configure a domain yet.

Create a Lightsail distribution in front of the instance if it works correctly with this dynamic application.

Use the AWS-provided default distribution hostname as the public URL.

Do not require a custom domain.

Configure the distribution for a **dynamic application**, not static-site caching.

The dashboard must not serve stale cached API responses.

Requirements:

- HTTPS for browser → distribution
- no caching of dynamic dashboard/API responses
- forward query strings as required
- forward required cookies/headers
- support POST requests used by Focus/user actions
- preserve normal Next.js functionality
- do not cache `/api/*`
- verify live polling actually reaches current application state

Static Next.js assets may be cached only if that can be done without risking dynamic-state staleness.

Correctness is more important than CDN optimization.

The final user-facing endpoint should be something like the default AWS distribution hostname returned by AWS.

Do NOT invent/predict the hostname.

Only report the real endpoint returned by AWS after deployment.

---

# ACCESS CONTROL

The application is currently private because it runs on localhost.

It must NOT become an unauthenticated public trading dashboard when moved to AWS.

For this single-user prototype, add lightweight authentication.

Prefer a simple Nginx HTTP Basic Auth layer unless the existing application already has an equally simple secure mechanism.

Requirements:

- browser access is authenticated
- API routes are protected too
- Focus POST actions work through authentication
- dashboard polling works
- AWS distribution forwards the Authorization header correctly
- no credentials are embedded in client JavaScript

Generate a strong random password.

Suggested username:

`adam`

or another simple local prototype username.

Do NOT print the password in Claude output.

Save the generated login securely to a local file OUTSIDE the repository, for example:

`A:\AWS_creds\mointel_web_access.txt`

Protect it from Git.

At completion tell me only the file path where the credentials were stored.

Do not commit authentication credentials.

---

# ORIGIN WEB SERVER

Install/configure Nginx.

Next.js should bind only to localhost on the server, for example:

`127.0.0.1:3000`

Nginx should listen on the origin's HTTP port and proxy to Next.js.

Do not expose the raw Next.js port publicly.

Configure reasonable proxy behavior for:

- API polling
- POST requests
- connection keep-alive
- response timeouts

Do not cache dynamic API results in Nginx.

---

# LIGHTSAIL FIREWALL

Expose only what is required.

Expected:

- SSH as needed for administration/deployment
- HTTP origin for the Lightsail distribution

Do not expose:

- port 3000
- SQLite
- worker ports
- internal diagnostic services

Use SSH key authentication.

Do not enable SSH password login.

If practical, restrict SSH ingress to the current deployment/admin IP.

Do not make deployment impossible if the user's IP changes; document how to adjust the firewall.

---

# LINUX SERVICE USER AND FILE LAYOUT

Create a dedicated Linux account/service user such as:

`mointel`

Do not run the application permanently as root.

Suggested layout:

```text
/opt/mointel/current          application code
/var/lib/mointel             persistent runtime data
/var/lib/mointel/market.db   SQLite database
/var/lib/mointel/backups     migration/application backups
/etc/mointel/mointel.env     server environment/secrets
/opt/mointel/secrets         file-based credentials if required
```

Use equivalent clean Linux paths if the existing TLDW deployment suggests a better convention.

Permissions:

- application service user owns runtime data
- env/secrets readable only by appropriate account/root
- SQLite database writable by application workers
- credentials mode approximately 600 where applicable

---

# PORTABILITY / PATH AUDIT

Search the entire application for Windows assumptions.

Identify and remove runtime dependencies on:

- `A:\`
- Windows drive letters
- backslashes in application paths
- Windows-only shell commands
- `.ps1` requirements for production
- hardcoded local database paths
- hardcoded local credential paths

Preserve Windows development functionality.

Introduce environment-driven paths where needed.

At minimum support something like:

`MOINTEL_DB_PATH`

`MOINTEL_BACKUP_DIR`

and any other runtime path configuration required.

Local Windows behavior should remain backwards compatible.

The Linux server should not need fake Windows paths.

---

# NODE / NATIVE DEPENDENCY COMPATIBILITY

Use a Node version compatible with the current project and pinned `better-sqlite3` version.

The existing project previously pinned `better-sqlite3` due to a Node compatibility issue.

Do not casually upgrade it during deployment.

On the Linux instance:

- install Node
- install required native-build dependencies if needed
- run `npm ci`
- run tests
- run production build

Do NOT copy Windows `node_modules` to Linux.

Build/install native modules on Linux.

---

# PRODUCTION NEXT.JS

Run the web application in production mode.

Do not use:

`npm run dev`

on the AWS server.

Use the existing production build and appropriate:

`npm run start`

or equivalent.

Set:

`NODE_ENV=production`

Verify server-side APIs and polling work under the production build.

---

# SERVER ENVIRONMENT / SECRETS

Migrate the required runtime configuration safely from the current local environment.

Likely configuration includes:

- Alpaca API key
- Alpaca API secret
- SIP feed selection
- OpenAI API key
- model configuration
- SEC_USER_AGENT
- Google Sheet ID
- Google service-account configuration
- focus/session configuration
- ranking/session settings
- database path
- backup path
- research intervals
- assessment schedule
- any ingestion token currently required

Audit the current `.env.local` to determine actual requirements.

Do not print values.

Do not commit values.

Programmatically create:

`/etc/mointel/mointel.env`

or equivalent.

If Google authentication currently points to a Windows JSON credential file:

- copy the credential safely to `/opt/mointel/secrets/`
- chmod appropriately
- update the server environment path
- do not put it in Git

Never upload the Magellan AWS admin credentials to the application server simply because they exist locally.

The application does not need broad AWS admin credentials at runtime.

---

# SYSTEMD — ALWAYS RUNNING

Do not use the local multi-process `npm run desk` supervisor as the permanent Linux service manager.

Use systemd.

Create services for:

## Web

`mointel-web.service`

Runs Next.js production server.

## Market

`mointel-market.service`

Runs the single Alpaca SIP market worker.

There must never be two production SIP market workers running simultaneously.

## Research

`mointel-research.service`

Runs the automatic research engine.

## Assess

`mointel-assess.service`

Runs the Desk Assessment scheduler.

Configure:

- start on boot
- restart on failure
- sensible restart delay/backoff
- clean SIGTERM shutdown
- working directory
- environment file
- service user
- logging to journald

Do not create infinite rapid restart loops.

Systemd should ensure only one instance of each service runs.

Provide an aggregate target if useful:

`mointel.target`

or equivalent.

---

# DATABASE MIGRATION OWNERSHIP

Audit the current local database migration behavior before AWS deployment.

The most recent architecture discovered that multiple writer processes could independently create schema backups.

Do not allow four systemd services to race database migrations on server startup.

There must be one coordinated schema migration owner.

Preferred options:

1. dedicated one-shot `mointel-migrate.service` that runs before the runtime services; OR
2. the existing designated market-worker migration owner plus a reliable readiness mechanism.

Choose the safest/simple implementation.

Requirements:

- exactly one migration
- exactly one schema backup
- transactional migration
- other workers wait for required schema
- no writer starts against incompatible schema
- visible migration logs

Add concurrency tests if this behavior is not already tested.

---

# SQLITE — KEEP IT

Do NOT migrate to PostgreSQL in this deployment.

Use SQLite WAL as currently designed.

The architecture is still:

**one server → one shared state database.**

Make sure:

- WAL works correctly on the Lightsail SSD
- database file and WAL/SHM files use local persistent storage
- permissions are correct
- journaling remains safe

Do not place active SQLite on NFS/network storage.

---

# INITIAL DATABASE TRANSFER

We want to preserve the existing local research/history/state.

Do NOT copy the live SQLite database file naïvely while WAL writers are running.

Create a consistent SQLite snapshot using the same integrity-safe backup mechanism the project already uses, such as:

`VACUUM INTO`

or the project's existing backup abstraction.

Use that snapshot for staging.

Transfer it securely to the server.

Verify:

`PRAGMA integrity_check`

on the AWS copy.

Compare important row counts with local:

- ticker_session
- rvol_baseline
- minute_bars
- universe
- research_sources
- research_analysis_versions
- research_dossiers
- focus_tickers
- desk_assessments
- desk_assessment_tickers

Report discrepancies before cutover.

---

# VERY IMPORTANT — ALPACA ONE-CONNECTION CUTOVER

Do NOT run the local Alpaca SIP worker and AWS production Alpaca SIP worker at the same time.

The account has a single-stream constraint we have already designed around.

Use a staged cutover.

## Stage A — AWS staging without production market worker

Provision server.

Deploy code.

Upload a consistent database snapshot.

Start:

- web only

or safe simulation/test services as appropriate.

Do NOT start the production SIP worker yet.

Use the AWS endpoint to verify:

- login
- dashboard
- historical/current persisted state
- ticker drawer
- Focus GET/POST
- API routes
- production build
- database reads/writes

Research/assessment should not create duplicate live work during staging unless deliberately placed in a safe test mode.

## Stage B — final data cutover

Once the AWS web endpoint is proven:

1. stop the LOCAL complete Trading Desk processes cleanly;
2. confirm the local Alpaca worker is stopped;
3. create a fresh final consistent local DB snapshot;
4. transfer it to AWS;
5. run integrity check;
6. verify row counts;
7. start AWS market worker;
8. confirm SIP authentication and whole-market data;
9. start/enable research and assessment workers;
10. verify dashboard health lights.

There must be no interval with two real SIP workers connected.

Record the exact cutover time.

---

# LOCAL INSTANCE AFTER CUTOVER

Keep the local project and database as a cold development/backup copy.

Do not delete it.

But after AWS cutover:

**do not run the local production market worker while AWS production market worker is active.**

Document the failback process:

1. stop AWS market/research/assess writers;
2. retrieve/synchronize latest database if needed;
3. start local desk.

Avoid split-brain.

---

# LIGHTSAIL DISTRIBUTION VALIDATION

If using the default Lightsail distribution URL:

verify from the real AWS-provided HTTPS endpoint:

- Basic Auth works
- dashboard loads
- API polling refreshes
- Focus pin POST succeeds
- Focus unpin succeeds
- ticker drawer works
- assessment snapshot selection works
- dynamic data does not remain cached
- fresh price/health changes appear
- no API response is stale due to distribution caching

Inspect response headers if necessary.

The distribution must not make a live trading desk appear frozen.

---

# SERVER HEALTH ENDPOINT

Add or reuse a lightweight server health endpoint suitable for local Nginx/systemd validation.

It should report non-secret states such as:

- web OK
- DB reachable
- schema version
- market health
- research health
- assessment health

Do not expose:

- keys
- prompts
- filing contents
- AWS credentials

The public endpoint remains protected by Basic Auth.

Systemd/server scripts may query the health endpoint locally without external authentication if done securely through localhost.

---

# HEALTH / OPERATIONS COMMANDS

Create simple operational scripts/documentation.

Examples:

```text
sudo systemctl status mointel-web
sudo systemctl status mointel-market
sudo systemctl status mointel-research
sudo systemctl status mointel-assess

sudo journalctl -u mointel-market -f
sudo journalctl -u mointel-research -f
```

Provide a concise command for overall status.

Do not require remembering obscure internals.

---

# LOGGING

Use journald/systemd logs.

Do not write unbounded giant application log files.

Never log secrets.

Keep existing concise worker logs.

Configure reasonable journal/log retention using standard OS facilities if necessary.

---

# SERVER CLOCK / TIMEZONE

The server itself may run UTC.

Application scheduling must continue to use the existing America/New_York / exchange-calendar logic.

Do not make scheduled assessments depend on Linux server local timezone.

Verify:

- 22:00 ET recap
- 06:10 ET structural refresh
- 06:25 / 06:45 / 07:00
- 09:25
- RTH intervals
- RTH close
- AH transition

remain correct on AWS.

---

# BACKUPS

Preserve the existing migration backups.

Also enable a reasonable AWS server-level backup.

Prefer Lightsail automatic instance snapshots unless inspection shows a better existing Magellan/TLDW backup pattern.

Choose a snapshot time outside heavy trading/research windows.

Keep cost awareness.

Do not create unlimited manual snapshots.

Document:

- snapshot schedule
- retention
- current AWS snapshot cost information returned/verified during deployment

Create at least one post-deployment manual snapshot after the system is verified.

Do not delete local backups.

---

# STORAGE MONITORING

The SQLite database and minute-bar history will grow.

Add a simple operational check/report for:

- disk usage
- DB size
- backup directory size
- free disk space

Do not build a monitoring platform.

If disk use reaches a sensible warning threshold, surface it in operations documentation/logs.

The existing data-retention rules should continue operating.

---

# RESOURCE MONITORING

After all four services are running, measure:

- total memory usage
- per-service RSS
- CPU
- disk usage
- load average
- DB size

Observe for at least several minutes under real workloads.

If the 4 GB instance is clearly constrained:

report the evidence.

Do not silently resize unless necessary to complete a functional deployment.

If an upgrade is required and still keeps AWS infrastructure under the budget threshold, explain before changing the bundle.

---

# COST REPORT

Before final completion report, provide current monthly AWS infrastructure estimates based on the ACTUAL selected AWS resources:

- Lightsail instance
- Lightsail distribution
- static IP if applicable
- snapshots
- any other resource created

Do not include:

- Alpaca
- OpenAI
- unrelated Magellan AWS resources

Do not estimate from memory if AWS can return current bundle information.

---

# AWS SECURITY AUDIT

Before declaring completion verify:

- AWS credentials from `A:\AWS_creds` were not copied into the repo
- Magellan AWS admin credentials were not copied to the server unnecessarily
- `.env` server file has restricted permissions
- Google key file restricted
- Next.js port not public
- DB not public
- Nginx authentication enabled
- distribution HTTPS endpoint works
- no secrets in Git
- no secrets in systemd unit files if avoidable
- no secrets printed into journal
- no credentials embedded in client bundle

---

# DEPLOYMENT AUTOMATION

Create deployment assets under something like:

`deploy/aws/`

or another sensible directory.

Possible files:

```text
deploy/aws/bootstrap.sh
deploy/aws/deploy.sh
deploy/aws/nginx.conf
deploy/aws/systemd/mointel-web.service
deploy/aws/systemd/mointel-market.service
deploy/aws/systemd/mointel-research.service
deploy/aws/systemd/mointel-assess.service
docs/AWS_DEPLOYMENT.md
```

Do not hardcode credentials.

The deployment should be reproducible.

A future deploy should not require manually reconstructing what Claude did today.

---

# UPDATE / RELEASE PROCEDURE

Document how to deploy a new code version safely.

Conceptually:

1. commit/push code
2. copy/deploy exact commit
3. install dependencies
4. build
5. stop affected services
6. run coordinated schema migration/backup
7. restart services
8. verify health
9. roll back if health fails

Do not overwrite the only working release without a rollback option.

Prefer a simple release layout such as:

```text
/opt/mointel/releases/<git-sha>
/opt/mointel/current -> releases/<git-sha>
```

or another lightweight equivalent.

Keep at least the prior working release available for rollback.

---

# ROLLBACK TEST

Before completion, prove that rollback is possible.

Do not intentionally corrupt production.

At minimum validate:

- previous release remains on disk
- symlink/release switch works
- database backup exists before schema-affecting deploy
- documented commands restore prior application version

If schema is backward-incompatible, document that code rollback may require DB rollback too.

---

# DO NOT CHANGE PRODUCT LOGIC

This is a deployment/portability phase.

Do NOT modify unless needed for Linux portability:

- Daily RVOL formula
- AH Participation
- session-aware Discovery
- assessment schedule
- Top-N logic
- Focus methodology
- research methodology
- Dirty Float
- cycle rules
- catalyst rules
- price-level logic
- model prompts
- OpenAI tiers

Any portability fix that changes product behavior must be reported explicitly.

---

# VALIDATE SESSION-AWARE DESK ON AWS

Once AWS is the active system, validate all current session-aware behavior.

At the current actual market time, verify the appropriate state.

If deployment is completed before the 22:00 ET checkpoint, leave the AWS services running and verify the real:

`NEXT_DAY_RECAP`

executes there without the local PC processes running.

Confirm:

- assessment runs once
- scheduler health remains good
- database snapshot is written on AWS
- correct next trading date
- market state from completed AH session remains frozen
- research continues after 20:00
- browser does not need to be open

If 22:00 has already passed, use the documented safe catch-up/diagnostic path without fabricating an on-time assessment.

---

# END-TO-END ACCEPTANCE TEST

The deployment is not complete merely because the web page loads.

Verify from the AWS endpoint:

## Web

- HTTPS
- authenticated
- dashboard loads
- Focus pin/unpin persists
- drawer works
- live/snapshot view works

## Market

- single SIP connection
- current session correctly identified
- market health current
- market state changes persist to AWS SQLite

## Research

- research worker health good
- relevant unknown ticker can queue
- accepted dossier persists
- OpenAI/SEC integration works from AWS IP
- SEC User-Agent/rate limit unchanged

## Assessment

- scheduler health good
- next assessment known
- snapshot writes succeed
- idempotency works

## Persistence

Restart all services.

Verify after restart:

- Focus survives
- research dossiers survive
- market state reconstructs
- assessment history survives
- no duplicate assessment
- no duplicate research jobs caused solely by restart

## Reboot

Perform one controlled Lightsail instance reboot after initial validation.

Verify all services return automatically without logging into the server.

This is important.

The whole point of AWS is that the Desk is always running.

---

# FINAL LOCAL TEST

After AWS has become production:

close the local browser.

Ensure local market/research/assessment workers are not running.

Open the AWS HTTPS endpoint from the local browser.

Verify the Desk continues updating.

This proves the intelligence process no longer depends on localhost.

---

# FULL CODE GATE

Run locally before deployment:

`npm test`
`npm run lint`
`npm run typecheck`
`npm run build`

Run appropriately on the Linux deployment:

`npm ci`
`npm run build`

and any Linux-safe test subset/full test suite appropriate to the project.

Fix portability/build failures before cutover.

---

# STOP CONDITIONS

STOP rather than improvising if:

- AWS credentials resolve to the wrong account
- deployment would modify/delete TLDW resources
- estimated infrastructure exceeds ~$50/month
- current mointel working tree contains unexpected secrets/unrelated changes
- SIP entitlement does not work from AWS
- server cannot preserve SQLite safely
- HTTPS endpoint cannot support Focus POST/dynamic requests correctly
- credentials appear exposed
- database integrity check fails

Do not destroy local working state.

---

# COMPLETION REPORT

When finished, provide:

## Deployment Source

- git commit deployed
- local branch/status

## AWS Account

- safe account ID / identity
- region
- no secret credentials

## Existing TLDW Reference

- what service/pattern it used
- what was reused
- confirmation no TLDW resources changed

## AWS Resources Created

- instance name
- bundle/spec
- static IP resource
- distribution name
- snapshot setup
- any other resource

## Cost

- current monthly instance cost
- distribution cost
- snapshot estimate
- expected AWS infrastructure total

## Endpoint

- actual AWS-provided HTTPS URL

Do not provide a fabricated URL.

## Authentication

- auth method
- path on my local machine containing login credentials

Do not print the password.

## Runtime

Status of:

- web
- market
- research
- assessments
- Nginx

## Database

- local source DB size/counts
- AWS DB size/counts
- integrity result
- schema version
- migration/backup ownership

## Cutover

- exact local worker stop time
- AWS market start time
- confirmation there was no overlapping real SIP connection
- first successful SIP message
- first successful research cycle
- first assessment on AWS

## Persistence/Reboot

- restart test
- reboot test
- results

## Security

- firewall state
- auth
- secret permissions
- public ports
- secret audit

## Performance

- memory usage
- CPU
- disk
- database size
- whether 4 GB appears adequate

## Validation

- tests
- lint
- typecheck
- build
- production endpoint validation

## Operations

Exact commands for:

- status
- logs
- restart
- deploy update
- database backup
- rollback

## Remaining Issues

Anything that still depends on localhost or requires manual action.

Do not begin a new product feature phase during this task.

The task is complete only when I can open the AWS URL and use the Trading Desk while the local mointel processes are stopped.