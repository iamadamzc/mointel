# Should trading the bigger-dollar names cost more? — tier options, document only

**Written by Commercial, 2026-09-27 (checks run against `3740d61`).** His question,
verbatim, via Integration: *"im wondering if this is where the tiered pricing comes in.
if you're trading the bigger dollar stocks should you be charged more?"* Offered a
Commercial scope; his answer: *"2 yes."* **Document only. No provider chosen, no
customer or vendor contacted, nothing signed, nothing built.**

**The short answer, before the reasoning:** **no evidence supports charging more for
data-capture cost, because that cost is already being paid for a different reason.**
**But there is a real, unmeasured product reason a $20–$50 tier could ship a worse
report than the $1–$20 tier it's priced above, and that is not a footnote — it is the
thing to settle before pricing anything.**

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

## 2. THE REAL COUPLING, AND WHY IT IS A PRODUCT CONSTRAINT RATHER THAN A FOOTNOTE

**Verified directly in `lib/market/engine.ts`, because the line Integration cited had
moved and a wrong citation here would be worse than none — the same failure this desk
corrected on itself in the session-reports work two hours ago.** The mechanism that
actually governs data richness, `applyHighResSelection()` (`lib/market/engine.ts:2121`):

- **A name gets trades/quotes/10-second-grain capture (`highRes = true`) through a
  priority queue, not a hard top-50 cutoff.** Pinned symbols fill first; then names
  ranked `<= internalRank` (default **50**, `lib/market/config.ts:78`,
  `RVOL_INTERNAL_RANK`) fill next, in rank order; then any other "latched and alive"
  name fills remaining room.
- **The whole set is capped at `highResMax`, hardcoded to 250** (`lib/market/
  engine.ts:2185`, `this.options.highResMax ?? 250` — verified nowhere in the codebase
  is this ever set to anything else, so production always runs at 250).
- **The rank itself, `rankOf()` at `lib/market/engine.ts:2128`, is `runtime.rvolRank`
  (or `ahRank` after hours) — a GLOBAL rank over the whole universe, not scoped by
  price band.** A $20–$50 name and a $1–$20 name compete for the identical 250 slots
  on the identical ranking.

**And his own set-ranges ruling makes this concrete rather than theoretical.** Per
`docs/research/session-reports/design.md`: *"Each range's report RANKS INSIDE ITS OWN
RANGE"* — the $20–$50 report ranks $20–$50 names against each other, which is right
for readability. **But ranking well within a band is not the same as qualifying for
high-resolution capture, which is decided globally.** A name could be #1 in the
$20–$50 report and still have only minute-bar data behind it, if $1–$20 names
(the population this desk is built around and ranks most aggressively) fill the 250
global slots first. **Whether $20–$50 names actually crack that global ranking often
enough for their report to read as rich as the $1–$20 report's has not been measured —
the load test that would answer it has not been run.**

**Named plainly because it inverts the pricing intuition:** *if* $20–$50 names are
systematically lower-RVOL than the $1–$20 population this desk is tuned to rank
highest — plausible, not verified — **a $20–$50 tier priced ABOVE the base tier could
ship a report with LESS granular data behind it, not more.** Selling a premium price
on an unmeasured discount in data quality is the shape of complaint this desk would
have to answer for, not a hypothetical: the paying customer would be the one to find
it.

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
| **B — an add-on** | Base subscription includes the $1–$20 report/range; a $20–$50 (and/or sub-$1) report is a paid add-on on top of it. | An access gate on report/range visibility (not built anywhere today — Gate 2's "tenancy is access, not isolation" already fits this shape structurally); the §2 load test, so the add-on's report quality can be described honestly before it is sold. |
| **C — parallel tiers per range** | Each set range (under $1 / $1–$20 / $20–$50) is its own priced subscription, mirroring the report-range structure directly. | Same access gate as B; the same load test; and a decision on whether a $20–$50-only subscriber sees the $1–$20 board at all, which nothing today answers. |

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
report, or a brief. The global rank-scarcity constraint bites any report-shaped or
board-shaped product that names $20–$50 stocks at all. The demand-population gap is
true regardless of packaging. **So this document's facts stand now; the tier DECISION
is sized to wait for Gate 1, and shape A costs nothing to hold in the meantime.**

---

## 6. SOURCES

`docs/threads/integration.md` (the measured population table, Ops 2026-09-26, and his
verbatim rulings of 2026-09-26 and 2026-09-27); `worker/runtime.ts:862-863`;
`lib/market/engine.ts:2121` (`applyHighResSelection`), `:2128` (`rankOf`), `:2153`
(the `internalRank` fill), `:2185` (`highResMax`); `lib/market/config.ts:78`
(`internalRank` default); `docs/research/session-reports/design.md` (the set-ranges
ruling and the configuration note); this seat's own `2026-09-26-billing-onboarding-
support-scope.md` (Gate 1, unruled). All read directly in this session; none
characterised from a relay without opening the file first.
