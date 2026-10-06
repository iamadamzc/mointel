# The 4-day reuse span: what it costs his morning board. PRE-REGISTRATION (nothing run)

*Research-tmi `local_dd23765d`, written before any query for it is run. Asked by Integration 28th: the contract 9b span's coverage cost, held for him if a material share of the morning board would read Cannot verify. $0: a read-only open of the scratch store (`A:\mointel-scratch\market-scratch-2026-10-02.db`), no network, no model.*

## The question

On his morning board, how many names would have NO float row read within 4 calendar days before the checkpoint's date D, and so read "Cannot verify" (`FILINGS_NOT_REREAD`) or "not researched yet" (no row ever), purely because of the span? The float job does not exist in the store, so the proxy is the event it rides on: **a float read happens when a research job reaches `completeJob`** (`worker/research.ts`, the call sits right after it). A job counts as a read if `completed_at` is not null; its fetch date is the job's `trading_date`.

## Population and measures

- **The morning board** = the tickers on each COMPLETE `OPEN_SPIKE_ASSESSMENT` checkpoint (09:25 ET, `lib/desk/reports/pipeline.ts:43`) in the store, D = its `trading_date`; all of them, and separately the $1 to $20 rows (the report range). A read counts only if its `completed_at` is at or before that checkpoint's `completed_at` (no look-ahead).
- For each (checkpoint, ticker), the newest read's fetch date F. Classes, each its own row, never merged:
  1. **F within 4 days** (`D - F` at most 4 calendar days): the row is reused; the span costs nothing here.
  2. **F older than 4 days**: the span turns a reused row into `FILINGS_NOT_REREAD`. **This is the span's cost.**
  3. **no read ever before the checkpoint**: NOT_YET under any span; not the span's cost, reported for scale.
- Also, for scale: class 1 split into "F = D" (read the same trading date) and "F before D".
- Sensitivity, same table at spans of 1, 2, 3, 4, 7 and 14 days (the span is a contract number; this shows what each would cost).

## Controls (run first; nothing is reported if either fails)

1. **The read query sees reads:** on one checkpoint, the count of tickers with any completed job on D itself must be above zero; and a planted ticker absent from the store must return class 3.
2. **No look-ahead:** for one (checkpoint, ticker) chosen with a completed job after the checkpoint's `completed_at` on the same D, that job must NOT count as the read.

## What it does not say

It counts research jobs, not float rows: a float read can also fail (a fetch error writes no row) and the job can be skipped without Alpaca credentials, both of which only make the board darker than this count. It is the stored window (the scratch copy runs through 2026-10-02; the recap checkpoints start 2026-08-17, rubric draft section 3), one season. Script and raw output are committed before the output is read; the number goes to Integration 28th in a committed file.
