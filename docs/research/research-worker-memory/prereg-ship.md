# SEC cache bound: what the live research worker must do once it ships. PRE-REGISTERED before it ships

*Seat `local_5f4bfcf8`, 2026-10-02.*

- **His ruling** (Integration's `1bfab363`, 2026-10-02T03:12:39.671Z, verified at his turn): "yeah fix the leak".
- **Integration's build order:** bound `SecClient`'s cache, research worker only, pre-register the live-memory prediction.
- **Evidence:** `docs/research/research-worker-memory-2026-10-02.md` (`655d235d`).

## The change

`lib/research/sec/client.ts`:

- the document cache is LRU-bounded at **64 MiB**, counted at 2 bytes per char, so the real bytes are at most that;
- every entry expires after **30 minutes**;
- a body larger than the cap is never cached.

**Research worker only. No market-worker change.**

## The prediction, fixed before ship

**Judged on the FIRST FULL TRADING DAY after the ship.** Samples are taken **04:00 to 07:00 and 10:00 to 20:00 ET only**.

- **Amended before ship** (Ops-tmi `local_d8a2a445`): no box reads in his 07:00 to 10:00 ET window, and an on-box sampler would be a new production process needing his word.
- **What the gap can hide:** a transient peak inside 07:00 to 10:00 that recedes by 10:00. A leak's growth is cumulative, so it is in the 10:00 reading, PROVIDED the same process survived. The max-RSS bound is judged on the samples taken.
- **NOT JUDGEABLE** (Ops-tmi's catch, added before ship): every sample logs the child's pid, its start time and the unit's `NRestarts`. **Any change across the day, including across the 07:00 to 10:00 gap, makes the day NOT JUDGEABLE, never a PASS.** An OOM kill or restart resets RSS to a fresh low and would otherwise read as a pass. Ops reports it the same day.

**Samples:** the research worker's RSS, every 10 minutes.

- **Which process (amended before ship, on the new Ops seat's reading at `858c149b`):** the worker's CHILD node process, which holds the memory (pid 1773565, 134,780 KB at 03:16:41Z).
- **NOT** the unit's MainPID: that is the tsx wrapper, about 52 MB.
- **NOT** the unit's `MemoryCurrent`: that includes page cache, about 719 MB.
- The levels refresh child is a separate process and is reported separately. Beside them, the count of DISTINCT tickers first collected in that run (`research_jobs`, first-seen per ticker, by hour).

| Reading | Rule |
|---|---|
| **PASS** | Max RSS over the day is at most **450 MB**, AND, after the first 20 distinct tickers, RSS grows by less than **2 MB per new distinct ticker** (the killed run implied about 16.6). |
| **UNTESTED** | Fewer than **40** distinct tickers collected that day, which is too little load to tell. The killed run had 76 in about 25 h. |
| **FAIL** | Either bound broken. Then the cache was not the whole cause, and the next measurement is a heap snapshot of the worker (`process.memoryUsage()` plus the retained size by constructor), per the evidence doc's step 3. |

**The baseline it starts from:** 110 to 127 MB after a restart (Ops, 2026-10-02 at 02:58Z and 03:08Z: 127.6 and 123.3 MB, flat with 0 jobs).

**Why 450:** baseline plus the 64 MiB cap, plus generous room for the per-job parsing peaks the code holds only briefly. It is far below the killed run's 1,383 MB, so a pass and a fail cannot look alike.

## What this does not show

- Whether something OTHER than the cache also grows more slowly. A slow leak under 2 MB per ticker would pass this and show on a longer run.
- The levels refresh child, which runs in its own process.

## RESULT, graded 2026-10-02 (after 20:05 ET) by seat `local_5f4bfcf8`: **PASS AS REGISTERED**

**Log:** `docs/ops/leak-judge-2026-10-02.log` at `7c689e7bbcb8f78fed09882ae70547f139ba5be7` (Ops-tmi), read from the commit, not from the summary. It has 152 samples, 05:45Z to 2026-10-03T00:05Z, and 12 SKIPPED lines.

**Grading rule:** fixed before any sample was read (sent to Ops; research.md LIVE STATE `d41d0f2b`, `97f9b8b1`).

| Clause | Result |
|---|---|
| **Continuity (every sample, all series)** | ONE identity across all 152: child 1864116, start 2026-10-02T05:44:29, NRestarts 0. Every SKIPPED line is inside 11:00 to 14:00Z (no box contact). Judgeable. |
| **Max RSS at most 450 MB (in-window samples, 137 of them, 08:05Z to 23:56Z)** | **275,240 KB = 275.2 MB (268.8 MiB)** at 18:55Z. PASS under either unit. |
| **Under 2 MB per new distinct ticker after the first 20** | First in-window sample at 20 or more tickers: 10:26Z, 253,440 KB, 31 tickers. Last in-window sample: 23:56Z, 247,432 KB, 65 tickers. **-177 KB per ticker (-0.18 MB).** PASS. |
| **UNTESTED below 40 tickers** | 65 tickers at the last in-window sample: TESTED. |

**For scale:** the killed run reached 1,383 MB at about 16.6 MB per ticker. Here, RSS rose from 119 MB to about 250 MB over the first ~30 tickers (the 64 MiB cache filling, plus per-job working memory), then held flat to slightly falling while 34 more tickers were researched.

**What this does not show (as registered):**

- a slower leak under 2 MB per ticker, which would need a longer run;
- the levels refresh child (a separate process);
- whether the 07:00 to 10:00 ET gap held a transient peak (the same process survived it, so nothing cumulative was hidden).
