# Float validation, fresh-draw re-run: RESULT

*Research-tmi, 2026-10-05. Pre-registration `validation-prereg-2026-10-05.md` with amendments 1 to 3 (amendment 3 committed before this run). Script `validate.ts` at `7ce4b7a9`. Controls (including the new row-locator self-test) passed and are committed at `576f16b5`. Raw `validation-out-fresh-2026-10-05/names/*.json` committed at `c4a35331` BEFORE it was read. Draw: recap checkpoints 2026-09-23 to 2026-09-25 (none of the first sample's four days). $0: SEC fetches and a read-only open of the scratch copy of the store. Sample ran 21:13Z to about 21:16Z.*

## Verdict, as registered

**PASS: zero dangerous failures across 50 audited holdings** (floor 30; controls passed). 35 names drawn, 30 with a filed count, 5 without (UNKNOWN); 9 names had at least one subtracted holding. The audited holdings range from 0 to 18,751,125 shares (median 97,213; one is a 0-share holding of an insider who had sold out, which subtracts nothing).

**What that does and does not say.** Zero failures in 50 bounds the true failure rate at about 3/50 = 6 percent at 95 percent confidence (the rule of three). It does not say "verified" or "safe", and the page must not. Two things limit it, stated up front:

1. **This is the second sample.** The first FAILED (five check-3 failures, `result-2026-10-05.md`); I read all five filings, found the audit heuristic wrong (not the bound), amended the instrument before this run (amendment 3), and drew fresh names. The passing result is the second draw of an audit whose instrument I changed after seeing a failure. I recorded both; the first is not erased.
2. **Check 5 (a split between the holding and the count, read from SEC text) is PARTIAL.** The stored bars decide it. The filing text is only searched for the word "split", and a filing cannot mention a split that happened after it was filed. Seven audited holdings (GCTK x3, KITT x4) mention a split; I read all seven (`probe-split-mentions.ts`): every mention is a split BEFORE the holding's own date (GCTK: 1-for-5 in May 2024 and 1-for-20 on 2025-02-25, holdings dated 2025-10-03; KITT: 1-for-8 and 1-for-36 on 2026-04-21, holdings dated 2026-05-27, "adjusted to reflect" it), so none falls between the holding and the count. For the later span the evidence is the bars alone.

## The state table (the column, all 35 names)

Registered precedence. PRODUCED is **0 of 35 at every maximum age and under both issuance rules** with the baseline split proof (R0): the split proof is UNPROVEN on all 30 counted names (30 of 30; 28 of 30 last time).

| Issuance rule | CANNOT_VERIFY: issuance | CANNOT_VERIFY: split (R0) | UNKNOWN (no count) | PRODUCED |
|---|---|---|---|---|
| KNOWN_ACTIVE | 12 | 18 | 5 | 0 |
| KNOWN_ACTIVE + POSSIBLY_ACTIVE | 25 | 5 | 5 | 0 |

With the replayed split proofs (`split-replay.json`; R0 reproduces the recorded values; no rule disqualified; the registered controls passed): NONE / FOUND / UNPROVEN of 30 is R1 6 / 3 / 21, R2 7 / 3 / 20, R3 10 / 9 / 11. **PRODUCED under R1, R2 and R3 is 2 to 3 of 35 names (6 to 9 percent)**, at 45 days 2 and at 90 or 120 days 2 (R1) or 3 (R2, R3), under either issuance rule. R4 (the dossier's split history) again produced no date inside any span (17 of 30 dossiers carry some text).

## What differs from the first draw, and why it matters for the 45-day rule

- **Count freshness depends on the calendar.** On this draw (days 2026-09-23 to 25) 12 of 30 counts are at most 45 days old (ages 38 to 44); on the first draw (days 2026-09-28 to 10-01) 1 of 30 was. The counts are the same early-August 10-Q wave (dated about 10 to 14 August); the 45-day line falls on about 24 to 28 September. Since a 10-Q filer's count stays "current" for only the first 45 of the roughly 90 days between filings, **a 45-day maximum makes the column go dark for most of each quarter and light up for a few weeks after each filing wave.** Commercial made the 45-day maximum load-bearing for the cell face; this is what that choice does over time.
- **Issuance is the larger gate here:** 12 names flagged under KNOWN_ACTIVE, 25 under the wider rule.

## For the decision (his, via Integration)

1. **The bound's arithmetic passed its audit on a fresh draw** (zero dangerous failures in 50; the limits above). That clears the validation gate in the contract (section 7.1) as registered. It does not clear the surface: the column would still read "Cannot verify" or "Unknown" for roughly 90 percent of names on the days replayed.
2. **The levers, in order of effect on this evidence:** the split proof (30 of 30 unproven as built; R1 is the smallest change and brings 6 of 30 to provable), issuance flags (12 to 25 of 35), and the age of the count (calendar-dependent).
3. **Nothing here picks a rule.** R1 to R3 are replays on 30 names, twice, with no real-split name read as clean; I would take R1 or R2 to a build only with his yes on the 45-day question first.
