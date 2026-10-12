# Reports test: predictions, written before any model call (2026-10-12)

Harness `scripts/report-writer-comparison-v7.ts` on production 2714cfa3; store `data/market-prod-2026-10-07.db`; days 2026-10-02, 10-05, 10-06; kinds PREMARKET, INTO_RTH, INTO_POWER_HOUR, AFTER_HOURS (12 inputs, one run per arm). His yes: Integration chat 5544e519, uuid 91026be4. Stop $12.

Proofs before the run: key reader on fake files (`key-reader-proof.txt`, 7/7, mutant control fails the blank-line case); stream parsing offline (`sse-check.txt`, 5/5); dry run on the copy (12/12 inputs read, every file written); eslint 0; tsc 0 on these files (control: a planted error is reported).

## Predictions (estimates; none is a measurement)

1. **luna control (production pair):** struck share near the stored baseline (38 of 210, 18 percent), within 10 to 28 percent.
2. **Writers at high effort, checker terra:** Opus 5.5 and Fable 5.1 each strike fewer lines than luna in total. Confidence low: at LOW effort on 10-06 Opus struck 20 percent and luna 25 percent, terra 15 percent. Most strikes are rules (FORBIDDEN_WORDING, NUMBER_NOT_IN_ROW, SHARES_UNDATED); a stronger writer should cut those first.
3. **Cost per report, writer plus terra checker:** Opus about $0.15, Fable about $0.35; luna about $0.05. Phase 1 total about $6 to $7.
4. **Phase 2 (Claude as checker on luna's draft):** more model strikes (UNSUPPORTED) than terra on the same drafts. Cost about $0.10 (Opus) and $0.30 (Fable) a check. The stop's worst-case reservation may leave some phase 2 inputs NOT RUN; that is by design.
5. **Failures:** zero refusals; zero max_tokens stops at 16,000.
