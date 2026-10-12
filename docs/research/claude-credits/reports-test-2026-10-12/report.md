# Reports test: result (2026-10-12)

His yes: "yes, run the reports test" (Integration chat 5544e519, uuid 91026be4, 2026-10-12T20:36:29.166Z). Scope: addendum (a) of `docs/research/claude-credits/stronger-inference-size-2026-10-12.md`. Harness `53950f81` (committed before any call), raw `656f461b` (committed before it was read), on production code 2714cfa3, store copy of 2026-10-07. 12 stored inputs: 10-02, 10-05, 10-06, four report kinds each, one run per arm. **Spend $10.79 counted, stop $12.** Figures below come from `tables.txt` and `dealwords.txt` (scripts in `scripts/report-writer-comparison-v7-*.py`).

## What it found

**1. A stronger writer did not lower the share of struck lines.** Same inputs, same checker (terra), same rules:

| Writer | Lines struck | Summary struck | Number errors (NUMBER_NOT_IN_ROW) | Cost a report (writer + checker) | A month at 105 reports |
|---|---|---|---|---|---|
| luna (today) | 30 of 156 (19.2%) | 2 of 12 | 5 | $0.045 | about $5 |
| Opus 5.5, high | 29 of 156 (18.6%) | 0 of 12 | 1 | $0.168 | about $18 |
| Fable 5.1, high | 29 of 156 (18.6%) | 1 of 12 | 0 | $0.399 | about $42 |

luna's 19.2% is close to the stored production baseline (38 of 210, 18%), so the control behaved. Opus and Fable made fewer number errors and Opus had no Summary struck, but the totals stay level, and they stay level with finding 2's strikes removed (17, 17 and 18 of 156). Fable drew more checker strikes (UNSUPPORTED 10, against 4 for each other writer).

**2. The largest cause of struck lines is one rule striking deal facts, for every writer.** The advice-word rule strikes "sell" and "entered" anywhere. In this run they appear as deal facts: "entered an agreement to sell 80,000,000 Class A ordinary shares", "agreed to sell its Canadian oil and natural gas business". Lines struck by nothing else: luna 13, Opus 12, Fable 11. Without them every writer is at about 11% (17, 17 and 18 of 156). The writer instructions also ban these words (`lib/desk/reports/writerV6.ts:266`), and all three models used them anyway; in these lines the facts are deals. A model change does not fix this; the rule is the lever (for example, allow "sell" and "entered" when the line names an agreement). That is a separate decision, not part of this test.

**3. Claude as checker: no signal at this size.** Six inputs ran before the stop's reservation ended the run, as designed. On the same six luna drafts the model checker struck: terra 1 line, Opus 1 different line, Fable 2 other lines; no line in common. One Opus check failed (CHECKER_FAILED, 2026-10-06 PREMARKET); its cause is not recorded, because the harness kept no checker reply (a refusal and an incomplete verdict list look the same). Claude counts the checker input as about 29,400 tokens where terra counts about 18,900, so a Claude check costs more than the sizing assumed: Opus $0.156, Fable $0.418 a check.

**4. Blind Summary pairs: 10 ready** (`raw/blind-pairs.txt`; 2 skipped where a Summary was missing). Each pair is luna against Opus or Fable, order hidden; the key is in a separate file. They need a reader who has not seen the key (him or Marketing).

## Against the predictions (`predictions.md`)

1. luna within 10 to 28 percent: **held** (19.2%).
2. Opus and Fable strike fewer lines than luna: **failed in substance** (one line fewer each).
3. Cost: Opus about $0.15 and Fable about $0.35 a report: **close, both higher** ($0.168, $0.399). Phase 1 $6 to $7: **higher** ($7.35).
4. Claude checkers strike more than terra: **not shown** (1 and 2 against 1, on 6 drafts).
5. Zero refusals, zero max_tokens stops: no writer failed; the one failed check's cause is unknown (finding 3).

## Limits

One run per arm per input; three days; the stored inputs are from before 2026-10-07, so no EVENING report. Effort was high, as the addendum says, not max. No fallbacks, on purpose.
