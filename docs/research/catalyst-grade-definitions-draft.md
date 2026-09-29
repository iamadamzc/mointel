# Catalyst grade definitions — DRAFT for his decision

> **✅ ADOPTED — his ruling 2026-09-29T14:46:55Z ("2, your recs"): these definitions, reverse splits by context (option C), and the red grade NOT split. Built at `a794e20` as `lib/research/interpret/catalystGrades.ts`, which is now the source of truth; this draft is the record of the reasoning. One clause was not adopted: "fresh" / "outside the fresh window", because age is computed from dates (his 2026-09-24 ruling).**

*Research seat, 2026-09-29, on Integration's routing after the SLND report.
**DRAFT, NO BUILD.** A claim decision is his; this sets out what the grades
would mean and the options where it is not obvious. Every basis below is a
published source read at its source today, or a count from a store with the
store named. None is a trading preference.*

## Why this exists

The interpreter prompt defines **no** catalyst grade, and `lib/research/interpret/schema.ts`
declares the enum without a description (verified at production `0342e7d` by
Integration). The model decides what each grade means. The board renders
`WEAK_NEGATIVE_DILUTIVE` as **🔴 WEAK / NEGATIVE / DILUTIVE** (`lib/research/view.ts:51`).

**What that costs, measured** (`data/market-prod-2026-08-23.db`, an old
snapshot on this disk — not production, not today):

- **The red grade is not being misused on good news.** All 32 of 325 analyses
  graded `WEAK_NEGATIVE_DILUTIVE` are genuinely adverse, dilutive or
  structural — offerings/PIPEs, two failed Phase 3 trials, a delisting notice,
  a late 10-Q, a terminated merger, reverse splits. None is a positive event.
- **The SAME EVENT TYPE gets DIFFERENT grades.** 15 analyses (12 tickers)
  mention a reverse split: **6 red, 6 mixed, 2 unknown, 1 none.** One ticker
  (SCNI) was graded red once and mixed once. Where the split is the
  catalyst itself: PFSA ×2, SCNI, IOTR red; INCR, CANG mixed; GRNQ, RCON
  unknown. **That inconsistency is the case for definitions, whatever he
  rules on reverse splits.**
- Today: MTNB (v2445), a 1:15 reverse split its own summary calls
  "mechanical", graded red (Ops's production read). *Today's full count is
  Ops's to read; pending.*

## Proposed definitions (wording for the prompt and the schema description)

| grade | means | evidence that puts a row here |
| --- | --- | --- |
| `STRONG` | a fresh, company-specific event that could by itself explain a large move | cited primary source; the event is material **with its number stated** (deal value, trial result, approval) |
| `LEGITIMATE_POSITIVE` | a fresh, company-specific favourable event, verifiable, not necessarily transformative | cited primary source (release, filing); e.g. a contract award, a partnership, an approval |
| `MODERATE_MIXED_SECONDARY` | favourable and adverse elements together, OR only secondary coverage (roundups, recaps), OR an event outside the fresh window | say which of the three |
| `WEAK_NEGATIVE_DILUTIVE` | **see the split option below** — today it covers adverse events AND new share supply | adverse: failed trial, delisting/non-compliance notice, restatement, going-concern, late filing; supply: offering, PIPE, ATM, warrant exercise, resale registration |
| `NONE` | coverage complete, no company-specific event in the window | renders "no catalyst found in our sources", never "no catalyst" |
| `UNKNOWN` | coverage incomplete or the event cannot be classified from the evidence | — |

**Split option, for him:** `WEAK_NEGATIVE_DILUTIVE` bundles three different
claims in one red label. "Weak" is not "negative", and "negative" (bad
operating news) is not "dilutive" (new share supply). Splitting it into
`NEGATIVE` and `DILUTIVE` — and letting "weak" mean a small positive, which
`LEGITIMATE_POSITIVE` already covers — makes each red row say which thing it
is. *Cost: a schema/prompt change plus a board rendering change (Design). The
snapshot shows the bundled label has not yet been applied to good news, so
this is a clarity change, not a fix for a demonstrated error.*

## The ambiguous events — where each would sit

| event | today (snapshot) | draft placement |
| --- | --- | --- |
| **reverse split** | red / mixed / unknown | **his ruling — options below** |
| shelf registration, no takedown (e.g. VSME F-3) | red | `MODERATE_MIXED_SECONDARY`: capacity to issue, not issuance |
| proposal to increase authorised shares (e.g. IOTR) | red | same: a proposal, not issuance |
| listing compliance regained / uplisting | not observed in sample | `LEGITIMATE_POSITIVE` if confirmed by the exchange notice |
| ADS ratio change, CUSIP / name / ticker change | red (SCNI) or mixed | the reverse-split ruling for ratio changes; `NONE`-equivalent for pure identifier changes |

## Reverse splits — the options, not a pick

**What the published record says, read at source 2026-09-29:**

- **FINRA**, *Stock Splits* (finra.org/investors/investing/investment-products/stocks/stock-splits):
  a reverse split *"tends to occur with small companies that believe their
  stock price is too low to attract investors"*, also *"to maintain their
  listing on a stock market that has a minimum per-share price"*; and
  *"Reverse splits tend to go hand in hand with low-priced, high-risk stocks."*
- **Kim, Klein & Rosenfeld (2008)**, *Return Performance Surrounding Reverse
  Stock Splits: Can Investors Profit?*, Financial Management 37(2):173–192,
  1,600+ firms: *"statistically significant negative abnormal returns over the
  three‐year period following the month of the reverse split"* and *"poor
  operating performances over the four years"*.

**⚠️ THE HORIZON MISMATCH, stated so it is not lost:** both sources speak to
months and years. The desk's grade answers *"what explains today's move"*. **No
source read here measures the same-session effect, and the desk's stores cannot
measure it**: the snapshot's daily bars end 0–4 sessions after these splits, and
`archive.db`'s `symbol_outcomes` holds only names that MOVED, so counting what
reverse-split names did next from it selects on the outcome.

| option | grade | basis | what it would say on the board |
| --- | --- | --- | --- |
| **A. Structural** | `MODERATE_MIXED_SECONDARY` (or a new `STRUCTURAL` grade) | a split changes share count and price per share, not the business; FINRA frames it as a price-level/listing action | amber, "structural — reverse split" |
| **B. Negative** | `WEAK_NEGATIVE_DILUTIVE` (or `NEGATIVE` if split) | Kim, Klein & Rosenfeld: negative abnormal returns over three years; FINRA: associated with low-priced, high-risk stocks and listing pressure | red, as today on 6 of 15 |
| **C. By context** | negative when paired with a listing deficiency or a financing in the same window; structural otherwise | FINRA's listing-maintenance reason; the store shows both shapes (SUGP: delisting determination + split; PFSA: split alone) | red or amber, and the summary names the pairing |

Whatever he picks, **the rule goes in the prompt and the schema description**, so
the same event stops receiving different grades.
