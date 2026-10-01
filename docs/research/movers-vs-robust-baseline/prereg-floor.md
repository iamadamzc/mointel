# Movers floor sensitivity: PRE-REGISTERED, committed BEFORE any number is computed

*Seat `local_5f4bfcf8`, 2026-10-01. His question, verified at his turn in Integration's transcript `1bfab363` at 2026-10-01T15:31:15.175Z: "the question i have is is 20% the right number and what does it change. i realize its an anamoly, but we can't have a mover in the market no be on the aboard. that just looks bad." Integration's brief asks for a sensitivity table. The movers spec `d02cfb36` states K = 10 and +20% with no derivation, so the floor is a choice, and this sizes it. Nothing ships from this.*

**Reconstruction:** identical to the A replay (`docs/research/board-movers-replay-2026-10-01/movers.js`). Same local copy; the same 10 gated sessions (09-14 to 09-25); the same checkpoints (08:00, 09:00, 09:25 and 10:00 ET); the same top 50 by RVOL over the stored mean; band $1 to $20; the same eligibility. **Instrument check:** at floor 20 with K = 10 the script must reproduce A's 19 additions exactly, or nothing is reported.

**Grid:** floors **10, 15, 20, 25 and 30%** (percent change from the prior close), each with **K = 10** and **K uncapped**.

**Reported per cell:**
- Rows added per checkpoint: median and max, overall and per checkpoint time.
- Checkpoints where K = 10 binds (more qualify than 10), and the names the cap left off.
- Total distinct names.

**Quality, defined now:**
- **Q1 (Integration's wording):** for a name added at 08:00, 09:00 or 09:25, is its percent change at that session's 10:00 checkpoint still at or above the floor? Q1 cannot judge names added at 10:00, which are most of them, so a second measure is added.
- **Q2, the forward check:** for every addition at checkpoint t, take the price 60 minutes later (the last minute close before t + 60 min). **HELD** means its percent change is still at or above the floor; **FADED** means it is below. Also reported: the median change in percent change from t to t + 60.
- These describe the names a floor adds. They are not a claim about trades.

**Examples:** for each floor below 30, the 3 names that floor adds which the next floor up does not (largest percent change first), each with session, checkpoint, percent change, RVOL rank, price and its Q2 outcome. For 30%, its 3 largest additions.

**"Any mover in the market" (his widened requirement), descriptive:** at each checkpoint and floor, the number of eligible names at or above the floor whose price is OUTSIDE $1 to $20 (below $1, or above $20). The board's served band hides these under every floor, so no floor can show them.

**Today (Ops, separately, live and light):** in-band names off the top 50 at each floor, read now.

**What this does not show:** whether any floor picks better trades; the latch; the after-hours board; more than ten sessions.
