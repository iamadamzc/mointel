Continue development and deployment of the AWS-hosted Momentum Intelligence Trading Desk.

Repository/local project:

`A:\mointel`

AWS production is already live behind:

- Lightsail instance
- Nginx
- Lightsail/CloudFront distribution
- permanent Basic Auth for normal user access

Do NOT remove or weaken the existing permanent authentication.

## OBJECTIVE

Create a temporary, expiring, **read-only review URL** that I can give to ChatGPT so it can independently inspect the live Trading Desk for:

- UI errors
- stale or contradictory data
- session-state issues
- Discovery/ranking issues
- research-status problems
- scheduler/assessment failures
- market-feed health
- database/storage health
- ticker drawer inconsistencies

The normal authenticated production desk must remain unchanged.

The review mechanism should be suitable for temporary external inspection without providing permanent credentials or write access.

---

# 1. REVIEW ACCESS MODEL

Normal production access remains:

`https://<distribution-host>/`

protected by the existing Basic Auth.

Add a separate capability-style path:

`https://<distribution-host>/review/<LONG_RANDOM_TOKEN>/`

This path:

- bypasses Basic Auth only for the valid review capability
- is read-only
- expires automatically
- can be revoked immediately
- must not expose secrets
- must not permit Focus changes or any other mutations

Do NOT expose the permanent Basic Auth password.

Do NOT embed AWS/OpenAI/Alpaca/Google credentials anywhere in the review URL or client bundle.

---

# 2. TOKEN SECURITY

Generate cryptographically strong review tokens.

Use at least 256 bits of randomness.

Do not store the raw token in the database.

Persist only something like:

- token hash
- createdAt
- expiresAt
- revokedAt
- optional label
- lastUsedAt

Use a cryptographic hash appropriate for capability verification.

Default expiration:

`24 hours`

Make configurable.

A review token is valid only when:

- hash matches
- current time < expiresAt
- revokedAt is null

Use constant-time comparison where applicable.

---

# 3. TOKEN MUST NOT LEAK INTO LOGS

A URL capability can leak through logging if handled carelessly.

For `/review/*`:

- disable Nginx access logging, OR configure it so the token itself is never recorded
- do not print the raw token in application logs
- do not print it in journald
- do not include it in analytics
- do not include it in error traces
- do not include it in database audit text

Add:

`Referrer-Policy: no-referrer`

to review responses.

Also use:

`Cache-Control: private, no-store, max-age=0`

and appropriate equivalent headers.

The CloudFront/Lightsail distribution must not cache review HTML or review API responses.

---

# 4. REVIEW ROUTES

The review experience should reuse the REAL application view models.

Do not build fake/demo data.

The review surface should provide read-only access to:

## Main dashboard

Equivalent visual information to the normal Trading Desk:

- Focus strip
- active session Discovery
- relevant events
- analyzed watchlist
- market/session state
- assessment state
- research state

Focus cards themselves may be visible.

Pin/unpin controls must be disabled or absent.

## Ticker drawer

Must work for live tickers and expose:

- Desk Read
- live telemetry
- Level Ladder
- catalyst
- structure
- cycle
- Sheet/AUTO provenance
- evidence links
- supply ledger
- research status

## Assessment snapshots

Allow review of:

- current live state
- prior assessment snapshots
- NEXT_DAY_RECAP
- premarket assessments
- RTH assessments
- RTH close
- AH snapshots

Historical snapshots must remain frozen and explicitly marked:

`SNAPSHOT — NOT LIVE`

---

# 5. READ-ONLY ENFORCEMENT MUST BE SERVER-SIDE

Do not rely solely on hiding buttons.

All review access must be incapable of state mutation at the server/API level.

For requests made through review mode:

Allow:

- GET
- HEAD where appropriate

Reject with `403`:

- POST
- PUT
- PATCH
- DELETE

This includes at minimum:

- Focus pin
- Focus unpin
- manual research retry
- reanalysis
- any future mutation endpoint

If the current Next.js APIs are shared between normal and review mode, enforce review restrictions centrally so future write endpoints cannot accidentally become exposed.

Add tests.

---

# 6. REVIEW API DESIGN

Prefer dedicated read-only review routes or a centralized capability middleware.

For example conceptually:

`/review/<token>/`
`/review/<token>/ticker/<ticker>`
`/review/<token>/snapshot/<id>`

and read-only API equivalents under the same capability namespace.

The raw token may remain in the path if that is the simplest reliable way to make ChatGPT's browsing tools work.

Every request must validate it server-side.

Do not depend on browser localStorage.

Do not require Basic Auth first.

Do not require an OAuth popup.

Do not rely on client-side-only token validation.

---

# 7. SANITIZED DIAGNOSTICS PAGE

Add:

`/review/<token>/diagnostics`

This is essential.

It should expose enough operational information to diagnose the system without SSH access.

## Deployment

Show:

- deployed git SHA
- application version if available
- server uptime
- current UTC time
- current ET time

## Market Worker

Show:

- health state
- SIP connection state
- active session
- current trading date
- last whole-market message timestamp
- whole-market message age
- last bar timestamp
- ranked ticker count
- tracked ticker count
- current active board type
- market freshness state
- reconnect count
- last sanitized error

No API keys.

## Research Worker

Show:

- health
- queued jobs
- active jobs
- recently completed jobs
- recently failed jobs
- last successful dossier time
- SEC connectivity
- interpreter availability
- Terra model name
- escalation model name
- recent average latency
- recent model-call count
- last sanitized error

Do not expose prompts.

Do not expose filing contents.

## Assessment Worker

Show:

- health
- current assessment/session mode
- last completed assessment
- last assessment scheduledFor / actual startedAt
- whether generatedLate
- next scheduled assessment
- missed assessment count where relevant
- most recent failed assessment
- scheduler heartbeat age

## Google Sheet

Show:

- connection state
- last successful fetch
- stale/current
- row counts if useful

Do not expose Google credentials.

## Database

Show:

- schema user_version
- DB file size
- WAL size
- backup directory size
- available disk space
- current journal mode
- most recent migration backup
- most recent known integrity-check result

Do NOT run a full `PRAGMA integrity_check` on every diagnostics request if that is expensive.

Use a cached/recent result or expose a safe manual operational check separately.

## Process / Server Resources

Show:

- memory available/used
- disk available/used
- load average
- process/service status for:
  - web
  - market
  - research
  - assessments

Do not expose arbitrary process command lines containing environment variables.

---

# 8. RECENT ERROR SUMMARY

Diagnostics should include a bounded sanitized error summary.

Do NOT expose raw journald logs publicly.

Instead surface recent structured application errors already known to the system, such as:

- market disconnect
- SEC failure
- research failure
- assessment failure
- database write error

For each:

- timestamp
- component
- safe error category
- safe message

No stack traces containing secrets.

No environment values.

No credentials.

Limit to a small recent number such as 20.

---

# 9. DATA CONSISTENCY DIAGNOSTICS

Add useful read-only integrity checks that make visual bugs easier to diagnose.

Examples:

## Session consistency

Show:

- authoritative current session
- Discovery board session
- assessment-worker session
- market-worker session

Flag if these disagree.

## Telemetry consistency

For Focus/Discovery tickers show whether:

- main table price source
- drawer price source
- Focus price source

resolve to the same normalized telemetry.

Flag mismatches.

## Intelligence consistency

Show counts of:

- AUTO
- SHEET
- SHEET + AUTO
- PARTIAL AUTO
- CONFLICT
- ANALYSIS PENDING
- NOT ANALYZED
- FAILED

For current Top 12, flag a ticker if it remains:

`NOT ANALYZED`

while research worker health is good and no research job exists.

## Assessment consistency

Flag:

- duplicate supposedly-unique assessments
- assessment scheduler overdue
- snapshot rows without parent
- historical snapshots accidentally using live telemetry

These diagnostics should be deterministic.

Do not create AI calls.

---

# 10. REVIEW TOKEN COMMANDS

Add operational commands such as:

`npm run review:create`

Default:

24-hour access.

Support optional duration, for example:

`npm run review:create -- --hours 48`

Output may print the review URL to the operator terminal because the operator explicitly requested creation.

Do not write the raw token into application logs.

Also support:

`npm run review:list`

This must display:

- label
- createdAt
- expiresAt
- revoked/active

Do NOT display raw token values.

Add:

`npm run review:revoke -- <id>`

or an equivalent safe command.

Add:

`npm run review:revoke-all`

Useful after an inspection session.

---

# 11. TOKEN CREATION ON AWS

The review capability should be created against the production AWS database/server state, not merely a local Windows database.

Provide a safe command executable over SSH or through the normal deployment/operations mechanism.

If useful, create a local helper such as:

`scripts/aws-create-review.ps1`

that safely SSHes to the server and invokes the production command.

Do not put the raw token into Git.

Do not save it automatically into a tracked file.

---

# 12. NGINX CONFIGURATION

Preserve current Basic Auth on normal production routes.

Conceptually:

Normal:

`/`
→ Basic Auth required

Review:

`/review/...`
→ no Basic Auth challenge
→ capability validated by application

Do not globally disable auth.

Review path must proxy correctly to Next.js.

Prevent dynamic caching.

Review path must support ticker navigation and snapshot navigation.

Do not expose port 3000.

---

# 13. CLOUDFRONT / LIGHTSAIL DISTRIBUTION

Verify the distribution forwards the full review path.

No custom domain is required.

Use the existing AWS-provided endpoint.

Ensure:

- review HTML not cached
- review APIs not cached
- token path preserved
- no redirect strips required capability information
- HTTPS works

Test through the actual CloudFront endpoint, not just localhost on the server.

---

# 14. REVIEW UI INDICATOR

Every review page should clearly display:

`READ-ONLY REVIEW SESSION`

and:

`Expires <timestamp ET>`

Use a subdued but visible banner.

This prevents confusion with the normal desk.

Do not clutter every component with review labels.

One top-level indicator is sufficient.

---

# 15. NO USER MUTATION CONTROLS

In review mode:

Hide or disable:

- Focus ☆/★
- manual refresh that creates writes
- reanalysis button
- retry analysis
- any future administrative controls

Normal Basic-Auth desk remains unchanged.

---

# 16. EXTERNAL SOURCE LINKS

Ticker drawer evidence links may remain clickable.

Use:

`target="_blank"`

with appropriate:

`rel="noopener noreferrer"`

Do not pass the review token to external destinations.

Because Referrer-Policy is no-referrer, the capability URL should not leak as a referrer.

---

# 17. TOKEN EXPIRATION UX

Expired token should return a simple:

`410 Gone`

or equivalent clear page:

`This review session has expired.`

Revoked token:

`403 Forbidden`

or similarly clear.

Invalid token:

do not reveal whether a similar token exists.

Use a generic authorization failure.

---

# 18. REVIEW DATA MUST BE CURRENT

The purpose is live inspection.

Verify:

- current prices update
- Discovery changes
- research state changes
- assessment status changes

without browser Basic Auth.

Do not build the review page as a static export.

Historical assessment selections remain frozen, as in the normal application.

---

# 19. PERFORMANCE

Review mode is for occasional external inspection.

Do not create a second copy of the whole application runtime.

Reuse existing view models and APIs.

Do not create additional Alpaca connections.

Do not create additional research workers.

Do not trigger AI simply because a reviewer opens a page.

The reviewer is purely consuming the existing shared feed.

---

# 20. SECURITY TESTS

Add tests for at least:

1. valid active token grants review GET access
2. invalid token rejected
3. expired token rejected
4. revoked token rejected
5. raw token not stored
6. token hash stored
7. normal desk still requires Basic Auth/Nginx behavior as applicable
8. review GET works without Basic Auth
9. review POST rejected
10. review PATCH rejected
11. review DELETE rejected
12. Focus mutation rejected
13. reanalysis rejected
14. external links do not include token
15. Referrer-Policy no-referrer present
16. Cache-Control no-store present
17. diagnostics contains no configured secret values
18. diagnostics does not expose environment variables
19. client bundle contains no secrets
20. review access does not create model calls
21. review access does not create research jobs
22. review access does not change Focus
23. review access does not change assessment state

---

# 21. LIVE AWS ACCEPTANCE TEST

Deploy this to the current AWS production environment.

Do NOT disturb the market/research/assessment workers unnecessarily.

Create one real:

`24-hour`

review token.

From a client that is NOT using the permanent Basic Auth session:

verify:

- review URL loads
- dashboard current
- Discovery current
- ticker drawer works
- assessment snapshot works
- diagnostics loads
- Focus controls absent
- POST mutation returns 403
- expired/revoked behavior test using a separate short-lived test token

Verify normal production URL still responds:

- 401 without Basic Auth
- 200 with Basic Auth

---

# 22. CHATGPT COMPATIBILITY TEST

The actual reason for this phase is that ChatGPT cannot complete the permanent Nginx Basic Auth challenge with its browsing tool.

Therefore test the review link as a normal unauthenticated HTTPS URL from at least one fresh/private HTTP client.

No Basic Auth headers.

No pre-existing cookies.

It must return usable HTML/data solely through the review capability URL.

Do not design a solution that still depends on an interactive browser authentication dialog.

---

# 23. DEPLOYMENT SAFETY

Follow the current AWS release process:

- exact git commit
- build
- release directory
- current symlink
- health check
- rollback available

Do not modify product algorithms.

Do not change:

- Daily RVOL
- AH Participation
- session-aware Discovery
- assessment scheduling
- research methodology
- Dirty Float
- catalyst
- Cycle
- price levels

This phase is access + diagnostics only.

---

# 24. DOCUMENTATION

Update AWS operations documentation.

Include:

## Create review session

Exact command.

## Revoke

Exact command.

## List sessions

Exact command.

## Diagnostics

URL shape.

## Security model

Explain:

- permanent Basic Auth remains
- review token is temporary capability
- read-only
- expires
- revocable
- token hash only stored
- no write APIs

## Incident response

If a review URL is accidentally exposed:

`review:revoke`

or:

`review:revoke-all`

immediately invalidates it.

---

# 25. ROTATE PERMANENT BASIC AUTH PASSWORD

The current permanent Basic Auth password was pasted into a conversation during deployment validation.

After review access is working, rotate it.

Generate a new strong random password.

Update the Nginx htpasswd safely.

Reload Nginx.

Verify:

- old password fails
- new password succeeds

Store the new password only in the existing protected local credential location.

Do NOT print the new password in the completion report.

Report only the local secure file path where it is stored.

This rotation must not change the review token.

---

# 26. FULL GATE

Run:

`npm test`
`npm run lint`
`npm run typecheck`
`npm run build`

Run production endpoint tests.

---

# STOP BEFORE FINAL REVIEW TOKEN IS SHARED

After implementation/deployment:

1. create the real 24-hour read-only review token
2. verify it
3. report the URL to me
4. do not revoke it until I confirm inspection is finished

Do not paste any permanent Basic Auth credentials.

---

# COMPLETION REPORT

Provide:

## Commit

- git SHA deployed

## Review Architecture

- token storage
- expiry
- revocation
- read-only enforcement

## Nginx

- Basic Auth still protecting normal desk
- review bypass scope
- access-log handling
- cache handling

## Diagnostics

List the categories exposed.

## AWS Test

- normal URL unauthenticated result
- normal URL authenticated result
- review URL unauthenticated result
- read-only mutation result

## Permanent Auth Rotation

- old password invalidated
- path containing new credential

Do not print new password.

## Review URL

Provide the actual temporary production review URL.

## Expiration

Exact expiration time in ET.

## Validation

- tests
- lint
- typecheck
- build
- production verification

Do not begin new feature work.