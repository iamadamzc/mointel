We are still solving one narrow problem:

**ChatGPT itself must be able to fetch the live Momentum Intelligence Trading Desk.**

Do NOT do product feature work.

Do NOT create a Google Sheet mirror.

Do NOT create another application instance.

Do NOT create another market/research/assessment worker.

## CURRENT RESULT

The live application and read-only review capability are confirmed working from ordinary clients.

However ChatGPT has now directly attempted all three transports and failed before reaching the application:

1. Lightsail/CloudFront `*.cloudfront.net`
2. Cloudflare Quick Tunnel `*.trycloudflare.com`
3. direct Lightsail HTTPS via `*.sslip.io`

The latest direct `sslip.io` URL has a valid Let's Encrypt certificate and works from normal clients, but ChatGPT's fetch environment still returns a fetch/cache failure before the request reaches Nginx.

Therefore we need another transport.

## NEXT TRANSPORT: AWS API GATEWAY DEFAULT ENDPOINT

Create a temporary Amazon API Gateway **HTTP API** that reverse-proxies GET/HEAD traffic to the existing direct HTTPS Nginx origin.

The purpose is to obtain an AWS-native hostname of the form:

`https://<api-id>.execute-api.<region>.amazonaws.com/...`

No custom domain.

No Route53.

No new app process.

The backend remains the exact same:

Lightsail → Nginx → existing Next.js application → existing SQLite/live workers.

Use the existing read-only `/review/<token>` capability.

## AWS ARCHITECTURE

Conceptually:

ChatGPT
↓ HTTPS
API Gateway default execute-api endpoint
↓ HTTP proxy integration
existing trusted HTTPS origin on Lightsail
↓
Nginx
↓
same Next.js application

Use the current direct HTTPS origin:

`https://98-85-49-227.sslip.io`

as the API Gateway HTTP proxy target unless testing proves another existing origin endpoint is cleaner.

Do NOT point API Gateway directly at port 3000.

Do NOT bypass Nginx.

## ROUTING

Prefer an HTTP API with `$default` stage and proxy routing that preserves the entire incoming path/query string.

The review path must reach Nginx unchanged:

`/review/<token>/...`

Query strings must survive.

The existing application remains responsible for review-token validation.

Normal root behavior should remain protected by Basic Auth at Nginx.

## READ-ONLY TRANSPORT

This API Gateway exists only for external inspection.

Prefer routes that allow only:

- GET
- HEAD

Do not create POST/PUT/PATCH/DELETE routes unless absolutely required for proxy mechanics.

If a non-GET method hits the API Gateway inspection endpoint, it should fail before mutation.

The existing application review layer remains a second independent read-only barrier.

## LOGGING / TOKEN SAFETY

The review token is part of the request path.

Do NOT enable API Gateway access logging that records full request paths.

Do NOT enable verbose CloudWatch execution/access logging containing the capability token.

Do not print the raw review token in deployment logs except once when intentionally returning the final review URL to the user.

No token in Git.

## CACHING

No API Gateway caching.

Dynamic responses must pass directly through.

Review responses already return:

- no-store
- no-referrer
- noindex

Preserve those headers where API Gateway permits.

## CREATE A FRESH TOKEN

After the API Gateway route is verified, create a fresh review capability valid for:

`24 hours`

Do not use an almost-expired token.

## COLD EXTERNAL TEST

Using a client with:

- no Basic Auth
- no cookies
- no prior session

verify the API Gateway endpoint:

### Probe

`GET /review/<token>/api/diagnostics`

Expected:

200 JSON.

### Dashboard

`GET /review/<token>/`

Expected:

200.

### Diagnostics page

`GET /review/<token>/diagnostics`

Expected:

200.

### Normal root

`GET /`

Expected:

401 from existing Nginx Basic Auth, if the proxy preserves this correctly.

### Write

POST should NOT be routable through the inspection API.

Expected safe rejection such as 404/403/405.

Do not weaken Nginx/app protections to make this test pass.

## CHATGPT ACCEPTANCE LOOP

This is the critical requirement.

Do NOT declare success because curl works.

Once the API Gateway endpoint works:

STOP.

Give the user:

1. the fresh API Gateway review dashboard URL
2. the fresh API Gateway diagnostics JSON URL
3. exact expiration ET

The user will paste those URLs into ChatGPT.

ChatGPT will try them itself.

If ChatGPT cannot fetch the execute-api hostname, the user will return with ChatGPT's exact failure and we will continue.

**Only ChatGPT successfully fetching the URL constitutes success.**

## COST

This is a low-volume temporary inspection proxy.

Before creating it, query/confirm that there is no meaningful fixed monthly infrastructure commitment.

Do not provision:

- API Gateway private integrations
- VPC Link
- ALB
- NAT Gateway
- Lambda
- custom domain
- WAF

unless absolutely required.

The existing public Nginx HTTPS origin is already available.

Tag/note the API clearly as temporary:

`mointel-chatgpt-review`

or equivalent.

## CLEANUP

Document the exact AWS CLI command to delete the temporary API after ChatGPT inspection is working through some permanent supported method or no longer required.

Do not remove CloudFront production.

Do not remove the direct sslip endpoint yet.

## DO NOT TOUCH PRODUCT LOGIC

Do not modify:

- market worker
- research worker
- assessment worker
- Daily RVOL
- AH Participation
- session logic
- Focus
- research interpretation
- Dirty Float
- Cycle
- levels
- Google Sheet integration

This is transport only.

## STOP AND REPORT

Once externally verified, report only:

- API Gateway API ID/name
- region
- dashboard review URL
- diagnostics JSON review URL
- expiration ET
- GET dashboard status
- GET diagnostics status
- root status
- non-GET status
- confirmation no worker restarted
- deletion/cleanup command

Then wait for ChatGPT's actual access result.