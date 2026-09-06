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
