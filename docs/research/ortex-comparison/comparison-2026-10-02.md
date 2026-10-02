# Ortex vs the desk's FINRA-based label: five names, 2026-10-02

*Seat `local_5f4bfcf8` (Research-tmi). His free Ortex trial, his screenshots. INTERNAL: Ortex and FINRA numbers, private repository only; Commercial has not read Ortex's terms. Our side was fixed and committed BEFORE any Ortex number was seen (`38c105c2`, `docs/research/ortex-comparison/our-side-2026-10-02.json`).*

**Ortex panel:** "Short interest overview", which says "Updated: Monday - Data as per previous close". Ortex's figures are therefore likely as of last week's close, not today's. Its "Short Interest" figure there is taken to be Ortex's own estimate, not the exchange-reported one (that is under "Official Reports", not yet captured).

**Screenshot identity:** he named the unlabelled 3rd and 4th as FNGR and SDEV. The order is checked against volume: Ortex's DTC implies about 34M shares a day on the 3rd, which fits FNGR (FINRA average 8.3M a day), not SDEV (275k).

## The numbers

| | CTVA | FLUX | QTEX | FNGR | SDEV |
|---|---|---|---|---|---|
| FINRA shares short, Sep 15 (prev Aug 31) | 20.67M | 529k | 3.79M | 3.69M (8.75M) | 1.21M (1.18M) |
| Ortex short interest | 20.07M | 505k | 5.15M | 10.88M | 2.73M |
| Ortex vs FINRA Sep 15 | -3% | -5% | **+36%** | **+195%** | **+125%** |
| Our count (filed, date) | 667.2M (Jul 24) | 21.6M (Aug 14) | 35.9M (Dec 31, 20-F) | 61.3M (Jul 10) | 50.6M (Jul 27) |
| Ortex free float (implied: SI / %FF) | ~664.6M | ~15.6M | ~37.2M | ~51.3M | ~22.5M |
| Float / our count | 1.00 | 0.72 | 1.04 | 0.84 | **0.44** |
| Our % (FINRA / our count) | 3.10% | 2.45% | 10.54% | 6.03% | 2.39% |
| Ortex % of free float | 3.02% | 3.24% | 13.84% | 21.19% | 12.11% |
| **Our grade** | under 5% | under 5% | not graded (count too old) | 5% to under 10% | **under 5%** |
| **The same grade on Ortex's %** | under 5% | under 5% | Elevated | **Heavy** | **Elevated** |
| DTC: FINRA / Ortex | 4.06 / 4.65 | 4.06 / 1.23 | 2.96 / 1.87 | 1.00 / 0.32 | 4.40 / 0.44 |
| Ortex cost to borrow | 0.43% | 1.24% | 29.98% | 27.23% | **195.19%** |
| Ortex availability | 23.19x | 143.08% | 22.26% | 7.08% | **1.63%** |

## What it shows (five hand-picked names; a look, not a measurement)

1. **The controls agree.** On CTVA and FLUX, Ortex's short interest is within 5% of FINRA's Sep 15 figure. On CTVA, Ortex's float is our filed count. The data is the same thing where nothing moved.
2. **On the three names that moved, FINRA's two-to-three-week-old figure is far below Ortex's:** +36%, +195% and +125%. The staleness the first doc warned about is not a footnote on his names; it is most of the number.
3. **The float gap compounds it.** Our denominator is filed shares outstanding. Ortex's free float is 0.44 of it on SDEV and 0.72 on FLUX. That is the understatement "at least" was built to admit, and on SDEV it is more than 2x.
4. **Together, the label would read LOW on exactly the crowded names.**
   - SDEV: our label says "under 5% of the filed share count". Ortex shows 12.1% of float, a 195% cost to borrow and 1.6% availability.
   - FNGR: our "5% to under 10%" is Ortex's 21.2% (Heavy).
   - The label's words are literally true ("under 5% of the filed share count, dated Jul 27"), but a trader would read them as "not crowded", which these names are not.
   - Commercial's "under 5% survives dilution" holds for the arithmetic, not for the read: the floor survives, the meaning does not.
5. **Cost to borrow and availability carry the "concentrated" read FINRA cannot.** Three of the five show a borrow cost of 27% or more; SDEV shows 195% with 1.6% availability. No FINRA field shows this.
6. **Days to cover diverges on movers** (FLUX 4.06 vs 1.23; SDEV 4.40 vs 0.44). Ortex appears to use recent volume, FINRA the prior cycle's. This confirms Commercial's R6 (no depth chip).

## Open

- **Ortex's "Official Reports" tab for CTVA**, to check that its exchange-reported figure equals FINRA's 20.67M (predicted equal; untested).
- **Ortex's methodology** for its estimate and its free float (not read).
- **Its licence for display** (Commercial; unread).
- **Five names is a look.** A measurement would pre-register a name set and compare at matched dates.
