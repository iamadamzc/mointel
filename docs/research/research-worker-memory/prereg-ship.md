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
- **What the gap can hide:** a transient peak inside 07:00 to 10:00 that recedes by 10:00. A LEAK cannot hide there: its growth is cumulative, so it is in the 10:00 reading. The max-RSS bound is judged on the samples taken.

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
