# Research write-ups without the Sheet: PRE-REGISTERED (Sheet removal plan, step 2)

*Seat `local_5f4bfcf8` (Research-tmi), 2026-10-02, written BEFORE any run. Plan: `docs/sheet-removal-plan-2026-10-03.md` (Integration, `0009301e`), on HIS ruling that the Google Sheet is removed. The run needs HIS yes: local CPU, paid model calls, and a scratch copy of the snapshot.*

## The question

When the research interpreter is NOT shown the Sheet's human analysis, what changes in the write-ups the desk would rely on once the Sheet is gone?

**The switch already exists:** `RESEARCH_OMIT_SHEET_PRIOR=1` (`lib/research/config.ts:209`), read at `worker/research-interpret.ts:166` and `worker/research.ts:657`. The Sheet SNAPSHOT is still supplied to the escalation decision; only the model's exposure to the prior varies. **Measured as built:** removing the Sheet entirely also removes the snapshot, and the escalation path's behaviour without it is reported separately (below).

## Fixed now

- **Store:** a scratch COPY of the 2026-10-02 production snapshot (`market-prod-2026-10-02.db`, sha256 `9f0efa03...`). The interpreter WRITES analysis versions, so the run never touches the live store or the snapshot file itself. No evidence collection: interpretation only, on stored sources.
- **Sample:** the top 20 tickers by `rvol_rank` on 2026-10-02 that have stored `research_sources` AND a Sheet prior in the Sheet as loaded at run time. Fewer than 20 with priors means all of them, with the count reported.
- **Arms, on the same evidence, the same models and the same trading date, all with `--force`:**

  | Arm | Prior |
  |---|---|
  | WITH-1, WITH-2 | Sheet prior included (run twice, to measure the model's own run-to-run noise) |
  | WITHOUT-1, WITHOUT-2 | `RESEARCH_OMIT_SHEET_PRIOR=1` |

- **Measured per ticker, per arm:**
  - outcome;
  - `catalyst.catalystStatus`, `catalystGrade`, `catalystType`, `plausiblyExplainsMove`;
  - `structure.structureClassification`, `sharesOutstanding` (with its date);
  - `cycle.cycleClassification`;
  - whether escalation ran;
  - tokens and cost;
  - **the board chips each dossier produces:** `resolveWhy` and `resolveRisk` with the Sheet inputs null, which is the board after the Sheet is gone.
- **Reported:**
  - for each field, the disagreement rate WITH-1 vs WITH-2 (noise), WITHOUT-1 vs WITHOUT-2 (noise), and WITH vs WITHOUT (all four cross pairs);
  - any field whose WITH vs WITHOUT disagreement exceeds both noise rates is FLAGGED, with the tickers;
  - escalation counts per arm.
- **No pass line.** This is a measurement of what changes, to inform step 3, not a gate.
- **Spend cap: $15 total.** The harness stops before any call that would exceed it. The estimate per interpretation is taken from the first call's tokens and written to the output.
- **Discipline:** harness committed before the run; raw output committed before it is read. The Sheet's human analysis is HIS research and stays in this private repository.

## Not in this run

- The second table and the Priority grades (his decision 2).
- The float replacement (his decision 1). For that decision, from tonight's run 3 (`viewtime-raw`, committed):
  - of 422 (name, settlement) pairs from his top-12 names, 348 (82%) have a filed share count (SEC companyfacts, or the dossier when later);
  - at view time it is at most 45 days old for 144 (34%), at most 90 days for 195 (46%), and at most 120 days for 212 (50%);
  - foreign issuers: 167 of 180 have a count, and only 47 are at most 120 days old.
