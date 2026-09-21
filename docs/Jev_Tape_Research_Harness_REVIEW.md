# Review — Jev Tape Research Harness

*Research seat, 2026-09-21. Reviews `docs/Jev_Tape_Research_Harness.md`. Every
number below was read off disk or off the live TypeSafe docs on that date.*

## Verdict

**The design is sound and the hard part is already solved.** Its anti-lookahead
discipline is better than most production backtests, its outcome labels are
objective, and it independently arrives at the warning TypeSafe's own docs give
about confidence. **Three things change the plan**, and one of them saves a third
of the pilot.

---

## 1. The tape exists. It is not in `A:\mointel`, and it is frozen.

```
A:\mointel                      minute_bars is the FINEST grain stored.
                                No trades table. No quotes table. Retention 20 sessions.
A:\trade_research\momentum\data\momo_arch_tbbo
                                459 sessions of Databento TBBO
                                2024-10-01 .. 2026-07-31, 3.1 GB
```

**TBBO is trades plus the prevailing best bid and offer** — exactly the doc's
`TRADES LAST 30 SECONDS` and `QUOTES LAST 30 SECONDS`. So the harness's hardest
requirement is met today, and the doc is right to site the project at
`A:\trade_research\momentum`.

**But the archive is permanent and non-extendable** — the Databento subscription
was cancelled after the 2026-08-01 pull. Nothing after **2026-07-31** can ever be
added.

**Consequence the doc does not draw: Phase 1 is feasible now; Live Shadow Mode is
a separate capture project.** Shadow mode needs live trades and quotes. mointel
holds a live Alpaca SIP connection but **stores only minute bars**, so the same
`build_tape_state()` cannot simply be repointed at live data — the live half of
the input does not exist anywhere yet. Price that as new work, not as
configuration.

## 2. Arm B is partly pre-answered, and negatively. Spend it on A vs C.

`A:\trade_research\momentum\viscosity` Phase 2B returned
**`NO_SUBMINUTE_INCREMENTAL_SIGNAL`**: execution count and arrival timing over
**2–20 seconds add nothing**, because the density gate that makes the price path
measurable also makes a 2-second window a rescaling of the minute. The
recommendation on file was to close the execution-arrival line.

**That is arm B — engineered sub-minute features — on the doc's own horizons.**

**Do not over-read it.** It closed a *predictive* line for *hand-engineered*
features. Jev over raw tape is a different instrument, and the doc's arm A is
precisely the untested case. So:

- **A vs C is the unanswered question** and deserves the pilot's budget.
- **B is the arm with a prior negative result**, and its interpretation rule in
  the doc ("if B materially beats A, engineered features add useful information")
  already has evidence against it at this grain.
- Keeping a thin B is still worth it as a **positive control**: if B reproduces
  Phase 2B's null, the harness is measuring what it thinks it is.

## 3. Arm C must include the desk's one confirmed signal, or it is a straw man.

Phase 1B.1 confirmed **`WITHIN_DAY_TRADE_COUNT_SIGNAL_CONFIRMED`**: raw
completed-minute **trade count** predicts a *less* clean next 30–60 seconds,
beyond price scale and share volume. Positive in **6 of 6 folds** at 30s;
clean-expansion rate falls **14.6% → 2.0%** from the fewest-executions quintile
to the most. Every proposed normalisation of the raw count added nothing.

**Note the direction: more executions per minute is WORSE.** Fragmented tape is
hostile tape.

The doc's arm B feature list includes "trade acceleration" with no sign
convention, and arm C is described only as "the existing engineered research
rules". **If C does not carry this rule, A and B will beat a baseline weaker than
what the desk already knows**, and the comparison will overstate Jev.

## 4. Jev's primitives change the question design — and the cost model

Read off the live docs, 2026-09-21. Jev returns typed answers and probabilities,
not text, through three primitives:

| Primitive | Meaning |
| --- | --- |
| **Noul** | probability a condition holds; **no separate confidence** |
| **Choice** | one of a defined set, with a distribution over options |
| **Score** | probability-weighted position on **ordered** levels |

Four consequences for the doc's question list:

- **Complementary pairs should not be two Nouls.** "Is buying pressure
  increasing?" and "Is selling pressure increasing?" are independent Nouls that
  **can both return 0.7** — they do not sum to 1. Pressure is a *direction on an
  ordered dimension*, so it is one **Score** (or one **Choice** over
  buying/balanced/selling). Same for momentum strengthening/weakening and
  accumulation/distribution. **Three pairs collapse to three questions.**
- **A Noul near 0.5 means "as likely as not", not "moderate intensity."** The doc's
  `buying_pressure` output dimension reads like an intensity. If it is sourced
  from a Noul it will be misread by whatever consumes it.
- **Independent questions over one state run in ONE request, in parallel.** So
  ~16 questions is not 16 calls. **The pilot's ~1,000 evaluations is ~1,000
  requests, not ~16,000** — measure actual budgets, but the doc's cost framing is
  an order of magnitude pessimistic.
- **Two questions do not belong in Jev at all.** *"Is the current state attractive
  for a long entry?"* and *"Would waiting for additional confirmation improve the
  setup?"* embed risk tolerance, size and stop distance. They are policy, and the
  doc's own rule — give it evidence, not conclusions — applies to **outputs** as
  well as inputs. Keep them in code over the raw judgments.

## 5. The pilot cannot answer the calibration question, and should say so

The illustrative calibration table shows **18,421 down to 2,311** observations
per probability band. **The pilot is ~1,000 evaluations**, so the top band holds
roughly **twenty** states. That can reveal a gross separation; it cannot
establish a monotone, stable relationship.

**State that before running**, so a null at n=1,000 is not filed as evidence
against Jev. The honest Phase 1 question is *"is there any separation at all
worth powering a real study on?"*

**And MFE/MAE need a normaliser.** They are **extremes**, so they grow with the
number of observations in the window. Two states with identical forward
distributions but different tick density produce different MFE. Without dividing
by something — realised volatility over the window, or the spread — the
probability-band comparison is confounded by liquidity, which is itself one of
the things Jev is being asked about.

## 6. Two gaps in the anti-lookahead list, which is otherwise the doc's best section

Items 1–7 are rigorous, and **6** (forward outcomes computed only after the
judgment is stored) and **7** (sampling must not reveal the outcome) are the two
that are usually missed.

- **The universe construction is itself a lookahead surface.** "Every qualifying
  gapper" — qualifying by what, measured when? A gap is known at the open and is
  safe. **A universe drawn from names the desk researched is not**: they were
  researched *because* they became interesting, which is future information
  relative to an 08:32 timestamp. Define the universe from a rule evaluable at T.
- **`float` is in the example state and is not reliably knowable.** Filings give
  shares **outstanding**, an upper bound — every insider share is inside it — and
  a float *number* is not derivable from them. The vendor number that fills this
  field today comes from a source whose terms **bar automated access and bar use
  in a competing product**; it must not reach a server-side harness. **Use the
  filed bound plus its verdict, or drop the field** — and either way it is
  available for only about half of names inside a 45-day filing window.

---

## Recommended change to Phase 1

1. **Site it at `A:\trade_research\momentum\jev_experiment`** as the doc says.
   The tape is there; mointel has no trades or quotes.
2. **Run A vs C, with a thin B as a positive control.** Put the saved budget into
   more states rather than more arms.
3. **Give C the confirmed trade-count rule** so the baseline is the desk's actual
   knowledge.
4. **Collapse the three complementary Noul pairs into Scores**, and move
   entry-attractiveness and wait-for-confirmation out of Jev into code.
5. **Declare the pilot underpowered for calibration** and state its real question.
6. **Normalise MFE/MAE** before comparing across probability bands.
7. **Define the universe by a rule evaluable at T**, and settle what `float` means
   here before it enters the state.

**Not in scope for Phase 1:** live shadow mode. It needs a live trade-and-quote
capture that does not exist in either repo today.
