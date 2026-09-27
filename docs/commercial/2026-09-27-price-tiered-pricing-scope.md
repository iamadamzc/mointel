# Should trading the bigger-dollar names cost more? — tier options, document only

**Written by Commercial, 2026-09-27 (checks run against `3740d61`).** His question,
verbatim, via Integration: *"im wondering if this is where the tiered pricing comes in.
if you're trading the bigger dollar stocks should you be charged more?"* Offered a
Commercial scope; his answer: *"2 yes."* **Document only. No provider chosen, no
customer or vendor contacted, nothing signed, nothing built.**

**The short answer, before the reasoning, CORRECTED 2026-09-27 (§2 — Integration's
second catch, verified, sharper than the first draft):** **no evidence supports
charging more for data-capture cost, because that cost is already being paid for a
different reason.** **And the $20–$50 tier's data-quality problem is not a risk to
measure — it is a near-certainty by construction: today's qualify band ($0.25–$20)
means almost every $20–$50 name is minute-bar-only, permanently, unless it happens to
be one of the few that qualified below $20 and rose above it. The fix is a specific,
already-identified, not-yet-authorised config change, not a hypothetical.**

---

## 1. COST DOES NOT JUSTIFY A HIGHER PRICE — VERIFIED, NOT ASSUMED

**The desk already records the $20–$50 band, daily, for a reason that has nothing to do
with billing.** From the measured population table (`docs/threads/integration.md`,
measured by Ops 2026-09-26, read-only, off the box):

```
bucket      all baselines   discovery-eligible   CAPTURED 09-25: symbols / minute_bars rows
20-50          5,013             1,124                3,443 / 358,793
```

**3,443 symbols priced $20–$50 were captured on 2026-09-25 — 359K rows, roughly a third
of that day's total minute-bar volume — against a configured qualification ceiling of
$20.** The mechanism, verified directly at `worker/runtime.ts:862-863`: the
bootstrap/roll candidate set is built at `[DISCOVERY_PRICE_MIN * 0.4, DISCOVERY_PRICE_MAX
* 2]` and everything in it is seeded as tracked, so at a $20 ceiling the desk already
bootstraps to $40 twice a day (restart and the 22:00 roll) — **before any pricing
question was ever asked.**

**So the marginal infrastructure cost of a $20–$50 tier is not zero, but it is not new
spend created by selling the tier — it is spend the desk already carries for its own
qualification and rollover mechanics.** Charging more for access to data the desk
would capture anyway is **value pricing, not cost-plus, and it should be named as
that rather than justified as a cost pass-through.** Nothing above ~$50 is captured at
all (0 symbols, 0 rows on the same date) — a genuinely higher tier reaching further
than $50 would be the first one with a real, new capture cost behind it, and that cost
has not been measured because nothing above $50 has ever been recorded.

---

## 2. THE REAL COUPLING — CORRECTED AGAIN, 2026-09-27: NOT UNMEASURED CROWDING, EXCLUSION BY CONSTRUCTION

**Integration's second correction, verified directly rather than taken on the relay,
and it changes this section's conclusion, not just its wording.** The paragraph below
first read "none of the four admission paths are scoped by price band" — **that line
was wrong, and the error was conflating two different questions this codebase keeps
carefully separate: gets CAPTURED (minute bars, via the worker's own bootstrap) is not
the same question as gets RANKED (eligible for `applyHighResSelection` at all).**

**The ranking gate, `engine.ts:1710-1716`:**

> *"const priceEligible = runtime.price !== null && (this.inPriceRange(runtime.price)
> || runtime.latched); if (runtime.rvol !== null && priceEligible &&
> this.isRankEligible(runtime.symbol)) { eligible.push(...) }"*

**A symbol gets an `rvolRank` at all only if it is currently inside the qualify band
(`inPriceRange`) or already `latched` from an earlier session in which it was.** And
`latched` is set in exactly one place, `engine.ts:1748-1757`, gated on the identical
`inPriceRange` check — **a name can only ever become `latched` while trading inside
the qualify band.** The code's own comment two hundred lines above the check (`engine.
ts:1035-1039`) already says this plainly: *"ADMISSION USES THE RECORD BAND, NOT THE
QUALIFY ONE... A name inside the record band and outside the qualify band is captured
and can never rank... it never reaches the payload and never takes a trades/quotes
slot."*

**And the qualify band, today, in production, is $0.25–$20** — `discoveryPriceMin`/
`discoveryPriceMax` (`lib/market/config.ts:79-80`), confirmed live at those values per
`docs/threads/integration.md`'s own record of his 2026-09-25/26 rulings
(`DISCOVERY_PRICE_MIN=0.25` applied; *"`DISCOVERY_PRICE_MAX` stays `20` until the
split lands"*). **A `capturePriceMin`/`capturePriceMax` split exists in the engine's
own options type and is exercised by a unit test (`tests/market/engine.test.ts:941-
942`, values `0.25`/`50`) — but it is never wired to production config or the worker
anywhere in the codebase.** So today, `inCaptureRange` (what the worker bootstraps
and persists as minute bars) and `inPriceRange` (what can ever be ranked) fall back
to the identical single pair: **$0.25–$20.**

**What this means for a name that has traded its entire life at $20–$50 and never
once dipped into the qualify band: it is captured (§1's 359K rows are real), it is
never ranked, it can never latch, and it therefore can never enter `applyHighResSelection`'s
eligible set — not "loses the competition for one of 250 slots," but never a
candidate for a slot at all, unless it happens to be pinned.** The only $20–$50 names
that CAN be ranked and can win a high-resolution slot are **"crossers"** — names that
qualified (latched) while trading inside $0.25–$20 and have since risen above $20,
carrying their latch with them. Everything else in the $20–$50 population is
minute-bar-only, by construction, today.

**So §2's original framing — "could ship a worse report, unmeasured" — understates
it.** The corrected form: **a $20–$50 report will be built almost entirely from
minute-bar data for names that never qualified below $20, and rich (trades/quotes/
10-second) data only for the crossers among them — a fraction this document cannot
size without knowing how many of a given day's $20–$50 names are crossers versus
never-qualified.** *That* is what a load test should measure — not whether $20–$50
names can out-rank $1–$20 names for a shared pool, but **what fraction of the $20–$50
report's own population is even eligible to be ranked at all**, and Integration's
own framing of this is the right one: *"the load test only sizes the crossers."*

**And the fix is already named, elsewhere, as a pending build decision — this
document does not propose a new one.** Widening the qualify ceiling
(`DISCOVERY_PRICE_MAX` past 20) is exactly the change *"STILL NOT AUTHORISED... until
the split lands"* per his own ruling on the record/qualify band split. **A genuinely
rich $20–$50 tier is not blocked by an unmeasured risk; it is blocked by a specific,
already-identified, not-yet-authorised config change.** Selling the tier before that
lands would be selling access to a report this codebase cannot currently fill for
most of its own named population.

**Two facts that still hold from the uncorrected version, because the correction
narrows the claim rather than reversing it entirely:** the 250-slot cap
(`highResMax`, `engine.ts:2185`, never overridden in the codebase) is real and
global once a name IS eligible; and ranking, for the names that do qualify, is
computed on `rvolRank` (`engine.ts:2128`) without further price-band segmentation —
**crossers from every band compete for the same 250 slots on the same terms.** The
new, sharper finding is upstream of that: most of a $20–$50 report's population never
reaches the competition to begin with.

---

## 3. WHO WOULD PAY MORE — ABSENCE OF EVIDENCE, STATED AS SUCH

**Nobody has measured whether traders of $20–$50 names are a distinct population
willing to pay more than $1–$20 traders, as opposed to the same people occasionally
trading a bigger name.** No usage data exists yet to distinguish "a subscriber who
sometimes looks at $20–$50 names" from "a subscriber who would pay a second time to
see them." **This is the same evidentiary gap this seat named in the India research
(2026-09-26) and is reported the same way: absence of evidence is not evidence of
absence, and this document does not manufacture a demand estimate it cannot support.**

---

## 4. THREE SHAPES A TIER COULD TAKE, NONE CHOSEN HERE

**Not a recommendation between them — the load test in §2 and Gate 1 (§5) both bear
on which is even buildable, and this document sizes options rather than picks one.**

| shape | what it is | what it needs before it is buildable |
| --- | --- | --- |
| **A — no price tier** | Today's shape, extended: one subscription, the board defaults to $1–$20, any subscriber can already set their own range up to the recorded $0.25–$50 ceiling (his own ruling, 2026-09-26) at no extra charge. | Nothing — this is already how the product works. Costs nothing to keep. |
| **B — an add-on** | Base subscription includes the $1–$20 report/range; a $20–$50 (and/or sub-$1) report is a paid add-on on top of it. | **First, the qualify-band widening this seat did not identify and does not need to** — `DISCOVERY_PRICE_MAX` past 20 is *"not authorised... until the split lands"* per his own ruling elsewhere on this desk; without it, per §2, a $20–$50 add-on is minute-bar-only for almost every name in it. Then: an access gate on report/range visibility (not built anywhere today — Gate 2's "tenancy is access, not isolation" already fits this shape structurally); the crosser-fraction measurement §2 names, so the add-on's report quality can be described honestly before it is sold. |
| **C — parallel tiers per range** | Each set range (under $1 / $1–$20 / $20–$50) is its own priced subscription, mirroring the report-range structure directly. | The same config change and the same crosser measurement as B; the same access gate; and a decision on whether a $20–$50-only subscriber sees the $1–$20 board at all, which nothing today answers. |

**The report-range list is configuration, not a fixed constant** (Research's design.md:
*"the range list is configuration... Commercial's tier scope may redraw the
boundaries"*) — so if he picks B or C, the tier boundaries and the report ranges
should be drawn together, in one conversation, not two documents that could drift
apart. **This document does not propose different boundaries than the example already
in front of him** (under $1 / $1–$20 / $20–$50) because no evidence here argues for a
different cut.

---

## 5. CAN THIS BE DECIDED BEFORE GATE 1 ("WHAT IS SOLD")? — NO, NOT THE SHAPE; YES, THE FACTS

**Gate 1 remains unruled** (`docs/commercial/2026-09-26-billing-onboarding-support-
scope.md`, this seat's own document, sha `9d49118`): whether the paid unit is
signed-in access to the board, the Why Not Report, or a daily brief has never been put
to him. **Tiering is a packaging decision, and Gate 1 is the packaging decision** —
choosing shape B or C before Gate 1 answers would be deciding packaging from the wrong
end, the same shape of error a definitional change made without measuring its
population first produces elsewhere on this desk.

**What does NOT wait on Gate 1, and is settled regardless of which way it goes:** the
facts in §§1–3. The capture cost is already sunk whether the unit sold is a board, a
report, or a brief. **The qualify-band exclusion in §2 bites any report-shaped or
board-shaped product that names $20–$50 stocks at all, and it is a fact about today's
config, not about packaging.** The demand-population gap is true regardless of
packaging. **So this document's facts stand now; the tier DECISION is sized to wait
for Gate 1, and shape A costs nothing to hold in the meantime.**

---

## 6. SOURCES

`docs/threads/integration.md` (the measured population table, Ops 2026-09-26, and his
verbatim rulings of 2026-09-25/26/27, including `DISCOVERY_PRICE_MIN=0.25` applied and
`DISCOVERY_PRICE_MAX` staying 20 "until the split lands"); `worker/runtime.ts:862-863`;
`lib/market/engine.ts:1035-1039` (the code's own comment on record-band-vs-qualify-band
admission), `:1710-1716` (`priceEligible`, the ranking gate), `:1748-1757` (`latched`,
set only inside `inPriceRange`), `:2121` (`applyHighResSelection`), `:2128` (`rankOf`),
`:2153` (the `internalRank` fill), `:2160-2170` (the after-bell `discoveryRank`
branch), `:2185` (`highResMax`), `:1675-1679` (`inCaptureRange`, falling back to
`priceMin`/`priceMax` since `capturePriceMin`/`capturePriceMax` are never wired to
production); `lib/market/config.ts:78-80` (`internalRank`, `discoveryPriceMin`,
`discoveryPriceMax` defaults); `tests/market/engine.test.ts:941-942` (the only place
`capturePriceMin`/`capturePriceMax` are exercised, confirming the split exists in code
and not in production wiring); `docs/research/session-reports/design.md` (the
set-ranges ruling and the configuration note); this seat's own
`2026-09-26-billing-onboarding-support-scope.md` (Gate 1, unruled). All read directly
in this session; none characterised from a relay without opening the file first.
