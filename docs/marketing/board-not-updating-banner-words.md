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

## Other surfaces that say live (Design's grep, corrected answer; words sent 2026-10-05)

Times are the payload's own, with the banner's date rule. Words not yet seen on a built banner; redo if the build changes how they read.

**Header chip (MarketStatus.tsx).** Normal unchanged ("Market: ALPACA SIP, LIVE"). A: "Market: no connection, last data {HH:MM:SS} ET". B: "Market: data {N} min old, as of {HH:MM:SS} ET". C: "Market: no data received". If too wide at 1,024 px, drop "Market: " in all three first.

**Price-source tooltips (TickerDrawer.tsx, DeskRead.tsx, FocusStrip.tsx), banner up:** "Last market data received, {HH:MM:SS} ET"; in C "No market data received since this page opened". Normal keeps "Live Alpaca market data". **Drawer section title:** "Market Telemetry" while the banner is up, "Live Market Telemetry" otherwise.

**Left alone:** the Now column (carries its own "not live" capture state) and the View selector's "Live" (a mode). All of the above must revert on the same render the banner clears.
