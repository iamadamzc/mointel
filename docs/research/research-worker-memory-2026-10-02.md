# Research worker memory: what holds memory across jobs (code, e8822583), and the measurement that decides

*Seat `local_5f4bfcf8`, 2026-10-02 ~03:3xZ. Integration's ask:*

- *what in the research worker holds memory across jobs;*
- *what to measure to tell the candidates apart.*

*Context from Ops (relayed by Integration):*

- *The research worker on `e8822583` was at 1,383 MB RSS, all anonymous, about 75 min after its 01:24:28Z start, when the 02:39:45Z OOM kill took it during `next build`.*
- *It was 110 to 127 MB after the restart.*
- *Ops is sampling its RSS every 10 min from 02:58Z.*

**No cause is stated as established here; this is a ranked candidate list and the measurement that would decide it.**

## The leading candidate: `SecClient`'s document cache. Every line below opened by this seat at `e8822583`

| Fact | Where |
|---|---|
| A process-lifetime `Map` keyed by URL | `lib/research/sec/client.ts:149` (`private readonly cache = new Map<string, SecFetchResult>()`) |
| Every successful fetch stores the WHOLE response body | `client.ts:242-244` (`const body = await response.text()`, then `this.cache.set(url, { url, body, ... })`) |
| Nothing evicts it: `clearCache()` exists and has NO caller anywhere in `lib/` or `worker/` | `client.ts:196-198`; `git grep clearCache` |
| The long-running worker holds ONE instance, shared by every job | `worker/research.ts:126` |
| Each ticker's collection also fetches the companyfacts JSON by default | `lib/research/sec/collector.ts:305` (`includeCompanyFacts !== false`; never set false in the code) |
| Filing documents fetched per ticker, capped by family | `lib/research/sec/forms.ts` (`maxFetch` 5, 2, 3, 2, 4, 1: up to 17) |

**What this predicts:**

- Memory grows with the number of DISTINCT tickers, and their new filings, collected since the process started.
- It does not grow with re-research of the same names (those hit the cache).
- It never shrinks until a restart.

**What it does NOT show:**

- **The size per ticker. NOT MEASURED.**
- **Why tonight.** The cache dates from the file's first commit (`67696e1a`, 2026-08-17, checked by this seat; its only uses are `client.ts:197`, `:213` and `:244`). So unless more distinct names were researched than usual, or the process ran longer than usual between restarts, this candidate alone does not explain a new event. Both are measurable.

## The other candidates (from a subagent's full read of the import closure; NOT all re-opened by this seat)

| # | Candidate | Shape | Status |
|---|---|---|---|
| 2 | The SEC ticker map (`sec/collector.ts:47`) | One fixed load at boot | Not growth |
| 3 | Large per-job buffers (whole documents parsed to text, model JSON, Alpaca JSON) | Peaks, not retained, per the subagent | V8 may keep heap pages committed after a peak |
| 4 | Native churn: `db.prepare` per call with no statement cache; HTTP bodies left unconsumed on error paths | Freed only at garbage collection | Not a true leak |
| 5 | Small items (`latencies` array, one number per job; the report loop's `attempted` set) | Bytes per job | Negligible |

## THE MEASUREMENT THAT DECIDES, cheapest first (Ops, read-only, outside his 07:00 to 10:00 ET window)

1. **RSS against distinct tickers collected.**
   - Count the distinct tickers the research worker COLLECTED since its start time, by `research_jobs` start or completion times.
   - Do this for the killed run (01:24:28Z to 02:39:45Z) and for the current run, beside Ops's 10-minute RSS series.
   - **The cache predicts** RSS rising with NEW distinct tickers and flat over re-research.
   - **A steady climb with no new tickers points away from it.**
2. **The size per ticker,** if (1) fits. In a local Node process with the same `SecClient`, fetch one typical ticker's set (submissions, companyfacts, its filings), and sum the cached body lengths, counting a non-Latin-1 body as 2 bytes per char. This needs SEC access with the desk's User-Agent; it is Research's to run, and touches no production process.
3. **Decisive, if still unclear:** a heap snapshot of the running worker. Retained size of the `SecClient.cache` Map vs `heapUsed`; `process.memoryUsage()` (`external` and `arrayBuffers` vs `heapTotal`) to separate heap from native.

## If the cache is confirmed: the fix, for Integration's order call (NOT built)

- **Bound it:** an LRU capped by total body bytes (e.g. 64 MB), or drop large bodies (companyfacts, filings) from the cache after extraction.
- **Keep a cache for the small, re-used ones:** the submissions JSON and the ticker file.
- **Side effect today (subagent's reading, worth checking):** the same cache keeps submissions and companyfacts STALE for the life of the process. A bounded or time-limited cache also fixes that.
- **Ships with the research worker only.** No market-worker restart.
