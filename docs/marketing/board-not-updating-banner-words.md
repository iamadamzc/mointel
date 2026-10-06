# Board not-updating banner: words (Design builds verbatim)

*Marketing-tmi, 2026-10-05. Worded for Design's T3 build; Design confirmed the fit and the session-aware behavior from `lib/market/health.ts` (classifyFreshness takes the session phase, IDLE outside 04:00 to 20:00 ET, so B is shown only for in-session STALE and DEGRADED). Neither Design nor Marketing sent this to Commercial: it states receipt times and data age only. No em dashes.*

**A, the poll is failing (this page cannot reach the desk):**
"This page cannot reach the desk. The numbers below are the last ones received, at {HH:MM:SS} ET."

**B, the desk is reachable but its market data is older than the feed's freshness threshold (in-session only):**
"The desk's market data was last updated at {HH:MM:SS} ET, {N} minutes ago. The numbers below are as of then."

**C, the market poll has returned nothing since the page opened (the board shows "Waiting for the first market payload."):**
"This page cannot reach the desk. No numbers have been received since this page opened."

Rules:
- {time} is the time of the last number received (A) or the payload's own timestamp (B), never the page clock. When it is not the reader's ET day it carries its date ("Oct 2, 15:58:07 ET").
- {N} appears only in B, from the server's own message age in that payload (true when measured). A and C carry no N: the page cannot verify an age it has stopped receiving.
- Absent on purpose: "live", "reconnecting", "will update", "refresh", "delayed", "stale", any vendor name, any instruction.

**Still owed (Design asks after the banner is built, Marketing does not invent them first):** the header chip "Market: ALPACA SIP, LIVE" is built on the server and keeps its last value when the page's poll fails, so in case A it would still read LIVE. Design will carry the same cause in that chip; its two strings are worded when Design asks. Design measures B with a two-digit N at 1,024 px and reports any wrap.
