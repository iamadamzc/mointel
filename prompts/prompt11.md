We want one final controlled test of ChatGPT's direct web-fetch access.

Do not disable authentication on the normal production Trading Desk.

Create a temporary, random, read-only public inspection route on the existing direct HTTPS origin (98-85-49-227.sslip.io) for 30 minutes.

This experiment specifically tests whether ChatGPT's web fetcher was rejecting the prior review URLs because every response said noindex/noarchive/no-store and robots.txt was protected.

Requirements:

 normal / remains Basic Auth protected; 

 normal /api/* remains protected; 

 create a high-entropy random route such as /public-review/<random>/; 

 no Basic Auth on that exact prefix; 

 no capability token required beyond the unguessable path itself; 

 GET/HEAD only; 

 all POST/PUT/PATCH/DELETE rejected; 

 reuse the real dashboard/read models; 

 no Focus mutation; 

 no reanalysis/retry; 

 no worker controls; 

 no secrets; 

 no additional Alpaca/research/assessment process. 

For this temporary prefix only:

 do NOT send X-Robots-Tag: noindex,nofollow,noarchive; 

 serve a public /robots.txt that allows this temporary prefix; 

 do NOT send Cache-Control: private,no-store; 

 use a very short fetch-friendly policy such as Cache-Control: public,max-age=5,must-revalidate; 

 retain Referrer-Policy: no-referrer; 

 diagnostics JSON should be exposed under the same temporary prefix. 

The route must expire automatically after 30 minutes and return 410 afterward.

Do not enable access logging containing the random review path.

Verify from a cold client:

 production / → 401; 

 temporary review dashboard → 200; 

 diagnostics JSON → 200; 

 POST → 403/405; 

 robots.txt → 200 and permits the temporary review route; 

 response no longer contains noindex/noarchive/no-store. 

Then STOP and give me only:

 temporary dashboard URL; 

 temporary diagnostics JSON URL; 

 exact expiration ET. 

The user will hand those URLs to ChatGPT. ChatGPT itself fetching them is the acceptance test.

Do not change product logic or permanent authentication.MCP cleanup/state

Do NOT delete the MCP implementation.

The MCP server is technically valid and fully tested, but the user's current ChatGPT Pro UI does not expose the Developer Mode/custom MCP connection surface needed to use it.

Treat MCP as dormant infrastructure:

 revoke all currently active MCP capability tokens; 

 disable the production MCP route behind a configuration flag such as MCP_ENABLED=false; 

 if MCP runs as a separate process/service, stop and disable that service; 

 if MCP is only a route in the existing Next.js process, leave the code installed but unreachable while disabled; 

 retain all MCP code, schemas, tests and read-only tool definitions in Git; 

 document how to re-enable it later. 

Do not remove or refactor the MCP code during the current public-review access experiment.

Confirm after disabling:

 former MCP URLs no longer grant access; 

 no active MCP tokens remain; 

 normal Trading Desk behavior is unchanged; 

 no extra MCP process is consuming resources.