# How often the issuance flag misses: PRE-REGISTRATION (nothing run)

*Research-tmi `local_dd23765d`, written before any fetch or query for it. Owed since Commercial 5i: no page may claim more than "arithmetic audited" until the issuance flag's miss rate is measured. Integration's order: second, after the float job. $0: SEC fetches (the submissions listing, one per name) and the committed raw of both validation draws; no model.*

## What a miss is

The float cell refuses (`ISSUANCE_FLAGGED`) when the dossier's supply ledger carries an issuing block (contract section 5). A **miss** is a name whose ledger at D raised NO such flag, although shares were issued between the count's as-of date and D. The cell would then print "at most X" against a count that is too low.

## The instrument, and what it cannot see

Ground truth is an SEC filing EVENT in the span (count as-of date, D], from the company's submissions listing, read by form type only:

- **E1:** a 424B1, 424B4 or 424B5 (a final prospectus for an offering or a shelf takedown);
- **E2:** an 8-K whose items include 3.02 (unregistered sales of equity securities, a PIPE or a private placement);
- **E3:** a later filed share count (`dei:EntityCommonStockSharesOutstanding`, any filing date, period end on or before D) at least 2 percent above the stored count, with no split in the span (R1 and R-A). Look-ahead is allowed here: it is ground truth, never an input.

**Blind spots, stated before the run:** at-the-market sales between prospectus supplements (they appear only in the next 10-Q, so only E3 sees them); employee equity plans (S-8 shares); warrant and note conversions that file nothing in the span. **E3 is mostly unavailable today:** the draws' D fall from 2026-09-23 to 2026-10-01 and the next 10-Q wave is filed in November. So this run measures the miss rate for offerings and placements (E1, E2) and is a LOWER bound on misses of any kind. **A re-run with E3 is owed after the November 10-Q wave; trigger 2026-11-20, owner Research, fallback: Integration asks the Research seat on that date.**

424B3 (resale), 424B2, S-3 and S-1 filings alone are NOT events: a resale or a registration creates no shares.

## Sample and measures

The 71 names of both draws (`validation-out-2026-10-05/names/`, `validation-out-fresh-2026-10-05/names/`), their stored ledgers, counts and checkpoint dates. For each name with a count:

1. its flag under each rule (KNOWN_ACTIVE; KNOWN plus POSSIBLY_ACTIVE);
2. E1, E2, E3 in the span, each its own column;
3. **per rule: unflagged names n; misses (unflagged with any event) by class; the miss share with its 95 percent upper bound** (exact binomial; the rule of three when the count is zero);
4. for scale, not a verdict: flagged names with an event (how often a flag has a filing behind it).

## Controls (run first; nothing is reported if either fails)

1. **The instrument sees an offering:** at least one FLAGGED name in the draws must show an E1 or E2 event in its span. If none does, the instrument cannot see the case it audits (the class this seat logs), and the run stops.
2. **A resale is not an event:** a planted submissions listing holding only a 424B3 and an S-3 in the span must read no event; a planted 424B5 must read E1.

## What it does not do

It grades no rule and moves no face. The number goes to Integration 28th and Commercial in a committed file; what the page may claim from it is Commercial's call. Script and raw output are committed before the output is read.
