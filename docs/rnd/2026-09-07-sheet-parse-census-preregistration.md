# Sheet parse census — pre-registration

**Written 2026-09-07 before reading `parseNumber`'s body and before seeing any
cell.** Integration asked for a direction fixed in advance; this is it, and it
**differs from Integration's in a way that makes a different prediction on a
specific case**, which is the only kind of disagreement worth registering.

---

## The question

For each of the 64 fields, what fraction of live rows parse to a **non-null
value**? A field the parser silently nulls is a column that exists, reads
plausibly to a human, and **reaches the desk as nothing.**

## Integration's direction, stated so mine can be told apart from it

> Failures cluster on fields whose natural expression carries a **qualifier** — a
> number with a level, a unit, a date, an "approx", a range. Numeric-only fields
> parse; narrated fields do not.

## MY DIRECTION — narrower, and it disagrees on a testable case

**The two known failures do not merely carry a qualifier. They each carry a
SECOND NUMBER.**

    flushFromHighPct   "11.3% at $9.69"     -> 11.3 and 9.69
    float              "<n>; <N> SO"        -> the float and the share count

> **I predict the discriminator is A SECOND NUMERAL IN THE CELL, not narration in
> general.** A lone non-numeric qualifier — `approx 12M`, `~4.0M`, `12M est.` —
> **should parse**, because stripping symbols around a single number is the
> ordinary job of a numeric parser and the desk's own `floatField` exists
> precisely to do that for one field.

**WHERE THE TWO DIRECTIONS SPLIT, and this is the falsifier:**

| cell shape | Integration predicts | I predict |
| --- | --- | --- |
| `approx 12M` | FAILS (qualifier) | **PARSES** (one numeral) |
| `11.3% at $9.69` | FAILS | FAILS |
| `2026-08-14` in a numeric field | FAILS | **FAILS** (three numerals) |
| `4.0M – 4.4M` range | FAILS | FAILS (two numerals) |

**If single-numeral qualified cells parse, my direction survives and
Integration's is too broad.** If they null, Integration's is right and mine is
refuted. **Either way the answer names which unseen fields are at risk**, which
is the point of predicting at all.

## What would make BOTH of us wrong

**That the failures do not cluster on cell shape at all** — that they cluster on
which fields the task happens to leave blank, or on a column-offset error, or on
one tab and not the other. **A parse rate of zero on a field the task never
writes is not a parser failure**, and separating *never written* from *written
and discarded* is a required part of the census rather than a refinement of it.

> **`raw.length === 0` versus `raw` non-empty with `value === null` is the whole
> distinction**, and the census reports them as two different numbers. Collapsing
> them would repeat the presence-versus-value error the desk has already made
> once, on `sheetProvenance`, where a key census read 99% and a value census read
> 15%.

## Fixed before looking

1. **Rate reported per field WITH n**, never as a bare percentage.
2. **Three states per cell, not two:** `EMPTY` (nothing written), `UNPARSED`
   (written, discarded), `PARSED`.
3. **Prose fields are excluded from the failure count**, not scored as failures.
   A `Notes` column is meant to carry text; `proseCell` returning a string is a
   success. Only fields the parser attempts to make **numeric or structured** can
   fail in the way this census is about.
4. **Amendments appended below with a reason, before the affected measurement.**

## Amendments

- *(none yet)*

---

# RESULTS — 2026-09-07, live Sheet, one snapshot, market shut

**Run through the real pipeline** — `locateTable` then `normalizeSheetRows`, the
same path the board uses — so these are the values the desk actually receives.
**Nothing persisted; rates only, no cell contents.**

## MY DIRECTION IS REFUTED. Integration's holds. The true rule is stronger than either.

`parseNumber` is a **fully anchored** regex:

    /^[(\-+]?\s*\$?\s*(\d{1,3}(?:,\d{3})+|\d+)(\.\d+)?\s*([KMB])?\s*%?\s*\)?$/i

    PARSE   12M   12 M   12,000,000   4.02M   $9.69   11.3%   (1.5)   -3.2   1.2m
    null    approx 12M   ~4.0M   12M est.   >12M   c. 12M   12.0M*
    null    11.3% at $9.69   3.1M; 12M SO   4.0M - 4.4M   2026-08-14

> **`approx 12M` NULLS.** I predicted it would parse, on the theory that the
> discriminator was a SECOND NUMERAL. It is not. **The rule is any character
> outside a closed vocabulary** — digits, `( - + $ , . K M B %` and whitespace.
> A lone word kills the cell exactly as dead as a second number does.
>
> **Integration's "carries a qualifier" is right and mine was too narrow.** The
> strongest form is neither: **the parser accepts a closed grammar and nulls
> everything else**, which is predictive from the parser with no sampling at all.

## THE MEASURED RATES — parse rate of WRITTEN cells, 95% Wilson

    TODAY (n=7 rows)
      recentRunHigh           0/  7 =   0.0%   [ 0.0,  35.4]   <== NEVER REACHES THE DESK
      flushFromHighPct        1/  7 =  14.3%   [ 2.6,  51.3]
      float                   4/  7 =  57.1%   [25.0,  84.2]
      rthClose, price, volume, ahPrice, ahChangePct, ahVolume, changePct  7/7 = 100%
      pmPrice, pmChangePct, pmVolume                    never written (market shut)

    RESEARCH (n=226 rows)
      floatCellShares        10/188 =   5.3%   [ 2.9,   9.5]
      recentCycleHigh        61/190 =  32.1%   [25.9,  39.0]
      flushFromHighPct       77/177 =  43.5%   [36.4,  50.9]
      ahVolume               82/152 =  53.9%   [46.0,  61.7]
      sharesOutstanding     103/185 =  55.7%   [48.5,  62.6]
      ahPrice               131/192 =  68.2%   [61.3,  74.4]
      float                 129/188 =  68.6%   [61.7,  74.8]
      ahChangePct           130/172 =  75.6%   [68.6,  81.4]
      rthClose              221/224 =  98.7%   [96.1,  99.5]

## A THIRD BROKEN FIELD, AND NOBODY HAD FOUND IT

**RECENT RUN HIGH / RECENT CYCLE HIGH.** 0 of 7 on TODAY, 61 of 190 on RESEARCH.
**Both are marked PRODUCED in the audit and both are the same shape as the two
already known** — a number with a level or a date travelling beside it.

**Float was the first, Flush From High the second, Recent Run High the third.
Three of three are the narrated-number shape**, which is the pattern Integration
predicted, now measured on a field it had not named.

## WHAT THE NUMBERS DO NOT SUPPORT

**0 of 7 IS NOT 0%.** The upper bound is **35.4%**. Every TODAY figure here is a
seven-row figure and none of them should be quoted without its n.
**`recentCycleHigh` at 32.1% of 190 is what makes the TODAY zero credible** — the
narrow interval is on RESEARCH, not on TODAY.

**Explicit `Unknown` markers are separated out and are NOT failures** — 34 to 74
cells per field on RESEARCH. An honest *Unknown* is the Sheet working. Counting
those as parse failures would have inflated every RESEARCH rate's complement, and
it is the presence-versus-value split this census pre-registered.

**One snapshot, market shut.** These are today's rates, not the window's.

## A CORRECTION TO THE FRAMING, and it changes where this lands

**Integration's ask says the audit "marks 39 of 64 fields PRODUCED and assumes
the Sheet provides them". The verdict column does not say that.** It reads:

> **PRODUCED — the desk produces an equivalent today.**

**That is a statement about the DESK, not about the Sheet.** A parse rate cannot
move it: `recentRunHigh` reaching the desk as nothing says nothing about whether
the desk can compute a cycle high, and the desk demonstrably can — `97b4caa` made
it arithmetic.

> **So the parse rate belongs in a NEW COLUMN, not in an amended verdict.** Two
> different axes: what the desk can produce, and what the Sheet actually
> delivers. **Integration's underlying point survives intact and is strengthened
> by the separation** — a field the desk produces AND the Sheet nulls is one the
> trader is already living without, and it is the cheapest possible retirement.
