Stop all crawler/browser-transport work. We have now determined that ChatGPT's arbitrary web fetch path is not a reliable way to inspect this application.

Build a remote, read-only MCP server for ChatGPT against the existing AWS Momentum Intelligence Trading Desk.

The goal is for ChatGPT itself to connect to the Desk as a custom app/tool and query the live state directly.

This is NOT another mirror or export. The MCP tools must read the existing live SQLite/application state and reuse the same normalized view models the dashboard consumes.

Before implementing, consult the current official OpenAI documentation for ChatGPT custom MCP apps / Apps SDK, because authentication and MCP transport requirements may have changed. Do not rely on old MCP examples.

The user intends to connect this from ChatGPT Developer Mode as a read/fetch-only custom MCP app.

Expose only read-only tools, conceptually:

get_desk_status

current ET time
session
trading date
active board type
market/research/assessment/Sheet health
last/next assessment

get_discovery
parameters:

limit optional, default 12
snapshot/live selector if appropriate

Return the actual current session-aware Discovery rows using the same application view model as the UI, including market telemetry, ranks, levels, Cycle, Catalyst, Structure, intelligence status and provenance.

get_focus

current session Focus names with the same normalized card state

get_ticker
parameter:

ticker

Return the full ticker drawer data:

Desk Read
current telemetry
Level Ladder
catalyst
structure
supply ledger
cycle
Sheet/AUTO provenance while Sheet still exists
research state
evidence/source metadata

get_recent_events
parameters:

limit
relevantOnly

get_assessment_status

scheduler health
last assessment
next assessment
missed/late/failed state

get_assessment
parameter:

assessment id or assessment type/time

Return the immutable frozen assessment snapshot. Never merge live values into it.

get_diagnostics
Return the existing sanitized diagnostics:

deployment SHA
market worker
research worker
assessment worker
DB/schema/storage
consistency checks
recent sanitized errors

Every MCP tool must be annotated/readable as read-only under the current MCP/OpenAI specification.

Do NOT expose any write tools.

Do NOT expose:

Focus pin/unpin
research retry/reanalysis
database writes
assessment creation
worker controls
shell commands
arbitrary SQL
arbitrary file reads
environment variables
credentials
model prompts

The MCP server must NOT:

open another Alpaca connection
start another research process
start another assessment process
call OpenAI merely because a tool is read

It is only a read interface into the existing shared state.

Reuse the current AWS application and deployment. A separate lightweight MCP process is acceptable if required by the current protocol, but it must consume the existing DB/view-model layer only.

Authentication:

determine what the current ChatGPT custom MCP-app configuration supports from official OpenAI docs;
use a secure supported mechanism;
do not rely on the expiring /review/<token> URL model unless that is actually appropriate for MCP;
do not expose a public unauthenticated MCP server containing trading data.

Production Basic Auth and CloudFront remain unchanged.

Build the MCP endpoint on a conventional HTTPS endpoint that ChatGPT's MCP infrastructure can connect to. We already have several working AWS origins; use the simplest supported one.

Add strong tests proving:

all MCP tools are read-only;
tool calls do not mutate Focus;
tool calls do not create research jobs;
tool calls do not create assessments;
tool calls do not trigger model calls;
ticker output matches the dashboard's normalized view model;
Discovery output uses the current session-aware board;
historical assessment output remains frozen;
secrets are absent.

Add a diagnostic MCP tool call that can be tested from a generic MCP client before involving ChatGPT.

Deploy it without restarting the market worker if possible.

Then STOP.

Report:

MCP endpoint URL;
authentication mechanism;
exact tools exposed and their schemas;
confirmation all are read-only;
deployment commit;
tests/gate;
exact ChatGPT UI steps the user must perform to connect the MCP app in Developer Mode, based on current official OpenAI documentation.

Do not begin product feature work.

Success is not “Claude's MCP client can call it.” Success is: the user connects the custom app in ChatGPT and ChatGPT in this project can call get_desk_status and get_ticker itself.