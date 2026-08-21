Read these documents completely before acting:

* `A:\trade_research\momentum\viscosity\SPEC.md`
* `A:\trade_research\momentum\viscosity\phase0\canonical_data_decision.md`
* `A:\trade_research\momentum\viscosity\phase0\DATA_INVENTORY.md`
* `A:\trade_research\momentum\viscosity\phase0\data_quality_findings.md`

The Phase 0 verdict is accepted: the current archive cannot support the specified tick-level viscosity study. Do not calculate viscosity, signed pressure, two-sidedness, flow-response consistency, absorption, replenishment or viscosity-release signals from `momo_arch_tbbo`. Do not proceed to the original Phase 1.

Begin a new, bounded workstream:

# Phase 0.5: Price-Path Validation

# Phase 1A: Price-Only Forward Tradeability Baseline

The objective is to determine whether the one-second price archive is sufficiently coherent to support a price-only turbulence study and, if so, whether trailing price character predicts the cleanliness of the next 10–60 seconds in the selected small-cap momentum universe.

This does not test viscosity and must not be described as doing so. It tests whether a predictable forward-tradeability target exists for a future consolidated-event viscosity model to beat.

## Constraints

Operate read-only on everything under `A:\trade_research\momentum\data`.

Create all new scripts, intermediate data and reports under:

`A:\trade_research\momentum\viscosity\price_baseline\`

Do not modify, move, rename, deduplicate or rewrite source archives.

Do not purchase, download or repull market data.

Do not modify the application.

Do not use future completed-minute SIP volume or prices as predictors for timestamps inside that minute.

Do not use manifest fields derived from the completed session—such as final daily volume, high, low, close or return—as predictors.

Do not claim full-market results. The archive is a historically selected momentum universe, so all conclusions are conditional on archived symbol-days.

Do not fit a composite score or complex machine-learning model during this phase.

## Part A: Determine exactly what `momo_arch_sec` represents

Trace the code that created `data/momo_arch_sec`, including `scripts/momo_archive_pull.py` and any downstream aggregation.

Establish:

1. The intended and actual row grain.
2. Whether `(symbol, ts_event)` is unique.
3. Whether multiple venue-local one-second records exist for the same symbol and second.
4. Whether records were appended, grouped, summed or otherwise combined.
5. How OHLC and volume behave when more than one venue contributes.
6. Whether row order can affect the apparent close-to-close price path.
7. Whether the missing `publisher_id` makes any ambiguity irrecoverable.
8. Whether zero-volume or absent seconds are represented explicitly or omitted.
9. Whether the one-second `close` can be treated as a coherent transaction-price proxy.
10. Whether high/low fields are reliable enough for wick and range calculations.

Document the construction with code references and measured examples. Do not rely only on comments or prior reports.

## Part B: Validate the one-second price proxy against consolidated SIP bars

Use the overlap between `momo_arch_sec` and `data/sip_minute`.

Begin with a stratified sample covering:

* Early premarket: 04:00–07:00 ET
* Late premarket: 07:00–09:30 ET
* Different price bands
* Narrow and wide minute ranges
* Low, medium and high activity
* Multiple dates across the archive
* Nasdaq-, NYSE- and NYSE American-listed symbols where identifiable

If the sample is computationally inexpensive and no blocker appears, extend the validation across the complete overlapping archive.

Aggregate the candidate one-second price series to one-minute OHLC and compare it with Alpaca SIP minute OHLC.

Measure at minimum:

* Open, high, low and close error in dollars, ticks where derivable, basis points and percentage terms
* Close-to-close return correlation
* Median and tail absolute return error
* Direction agreement for nontrivial minute returns
* Range ratio and range error
* Frequency with which the candidate high/low falls outside or fails to capture the SIP minute range
* Error by session, price band, activity band and listing venue
* Frequency and effect of multiple candidate rows in the same symbol-second
* Sensitivity of path length to every defensible duplicate/aggregation rule
* Frequency of apparent one-second reversals attributable to record or venue switching
* Whether observed errors are large relative to 5-, 10- and 15-cent scalp barriers

Do not choose an aggregation method because it produces the most favorable backtest. Choose only from methods justified by source semantics, then compare all defensible variants.

Produce representative plots showing the candidate second-level path inside matched SIP minute candles, including both good and bad cases.

## Price-path decision gate

Create:

`price_path_validation.md`

End it with one of these verdicts:

* `USABLE_FOR_10S_30S_60S_BASELINE`
* `USABLE_ONLY_AT_COARSER_HORIZON`
* `NOT_USABLE`

A usable verdict requires evidence that venue mixing and row construction do not create economically material path-length, reversal or wick artifacts at the proposed horizons.

Do not use an arbitrary correlation threshold alone. Judge fitness relative to the actual outputs: path efficiency, flip rate, wick ratio and 5–15-cent scalp-scale movement.

If the verdict is `NOT_USABLE`, stop. Do not run Part C. Explain what price data would be required.

If it is `USABLE_ONLY_AT_COARSER_HORIZON`, stop and propose the exact coarser study without running it.

Proceed to Part C only for `USABLE_FOR_10S_30S_60S_BASELINE`.

## Part C: Build the price-only baseline

Construct evaluation observations every five seconds where the trailing price window meets explicit data-density requirements.

Calculate trailing features independently for 10-, 30- and 60-second windows:

### Path efficiency

[
E_W=\frac{|p_t-p_{t-W}|}{\sum|\Delta p|+\epsilon}
]

### Turbulence

[
T_W=1-E_W
]

### Return-sign flip rate

Report the treatment of zero-return seconds and test reasonable alternatives.

### Wick ratio

Calculate from defensible five- or ten-second OHLC bars only if Part A establishes reliable high/low construction.

### Candle body ratio

Net bar body relative to total range.

### Realized range and volatility

Price-scaled and dollar-scaled.

### Linear path fit

Regression (R^2), with (1-R^2) treated as a price-path disorder measure.

### Price acceleration and range expansion

These are comparison features, not viscosity.

Keep every component separate. Do not create a weighted Tradeability Score.

## Part D: Define forward outcomes

Calculate outcomes over the next 10, 30 and 60 seconds.

Primary direction-neutral outcomes:

1. Forward path efficiency.
2. Forward turbulence.
3. Absolute net displacement.
4. Future range.
5. Clean expansion: sufficient displacement with sufficiently high path efficiency.
6. Wicky expansion: substantial range with low net progress.
7. State persistence: whether current clean/hostile character continues.

Report results under several transparent clean-expansion thresholds expressed in:

* Cents
* Basis points or percentage
* Multiples of recent price range

Do not optimize one threshold on the complete dataset.

For practical momentum-filter evaluation, use direction supplied by a separate primitive rule, such as the sign of the trailing 20- or 30-second slope. This direction is not attributed to the tradeability features.

For that fixed external direction, calculate:

* MFE
* MAE
* MFE/MAE
* 5¢ target before 5¢ stop
* 10¢ target before 10¢ stop
* 15¢ target before 10¢ stop
* Percentage-scaled equivalents

Without reliable consolidated quotes, label these as price-path outcomes rather than executable P&L. Do not claim net expectancy after spread or slippage.

## Part E: Experimental design

Use chronological train/validation/test partitions. Reserve the most recent sufficiently complete block as untouched test data.

Do not randomly split adjacent observations.

Report results by:

* Ticker-day
* Non-overlapping episode
* Early versus late premarket
* Price band
* Data-density band
* Trailing window
* Forward horizon

Use ticker-day clustered confidence intervals or an equivalent dependence-aware method.

Run both overlapping five-second observations and a non-overlapping sensitivity analysis.

Use empirical quintiles learned on training data for the first state comparison. Test whether trailing feature quintiles produce monotonic separation in forward outcomes.

The central comparison is:

> Does a trailing clean-price state predict higher forward cleanliness than a trailing turbulent-price state?

Also determine:

* How long states persist
* Whether a useful warning survives for at least 10–30 seconds
* Whether results are driven by a few extreme runners
* Whether the relationship survives completely unseen ticker-days
* Whether simple current realized range or slope explains everything

## Required baselines

Compare path efficiency/turbulence against:

1. No filter.
2. Recent absolute return alone.
3. Recent range or realized volatility alone.
4. Regression slope alone.
5. ATR/range expansion alone.
6. MERV-like (1-R^2) plus slope/range.
7. OneShot-like price Efficiency Ratio, body ratio and range expansion, kept both separately and in its published-style weighting as a comparison only.

The project succeeds only if the price-state measurements provide stable forward separation. It does not need to beat every published-style combination during this phase; the purpose is to establish whether forward tradeability is predictable at all.

## Required deliverables

Create:

* `price_path_validation.md`
* `price_path_comparison.parquet`
* `baseline1_methodology.md`
* `baseline1_results.md`
* `baseline1_feature_dictionary.md`
* `baseline1_observation_coverage.parquet`
* `baseline1_state_results.parquet`
* `baseline1_transition_results.parquet`
* `figures/`
* Reproducible scripts with deterministic configuration
* Tests for leakage, time-window boundaries and feature/outcome separation

The final report must end with one of these decisions:

* `NO_PREDICTABLE_TRADEABILITY_TARGET`
* `PRICE_ONLY_FILTER_POTENTIALLY_USABLE`
* `PREDICTABLE_TARGET_JUSTIFIES_CONSOLIDATED_EVENT_DATA`

For the third verdict, state exactly what incremental question consolidated event data would answer that price-only data cannot.

## Stop boundary

Do not calculate or simulate tick-level viscosity after completing this phase.

Do not proceed to data acquisition, a composite model, live implementation or application integration.

Return the price-path verdict, the untouched-test results, major limitations and the recommended next decision for review.
