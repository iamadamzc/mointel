# Float cell, tooltip, and the public page "Are float quotes real?": DRAFT copy v4

*Marketing draft v4, 2026-10-05. All of Commercial's section 5 changes applied (5, 5b, 5c, 5d). No em dashes; no universal claims beyond the sources; no vendor named or disparaged; the body never answers "no" about anyone. Research's two points (the 13d-3 wording; the Forms 3/4/5 subtraction set) are SETTLED (Commercial 8530f442). MUST NOT ship before the insider-only method has a validation sample (next Research seat). The cell FACE and one claims judgment (date-in-popover satisfying item 7) wait on the NEW Commercial seat (local_2aab5a77) and the next Research seat's maximum filed-count age; the page body below is written to the proposed compact face and updates to whatever face Commercial passes.*

## 1. Float cell

The cell face is compact (one short line of room); the full statement is in the popover.
- Bound (filed count present, inputs aligned): cell **"≤ {X}"** (for example "≤ 12.3M", "≤ 123.4M", "≤ 1.23B"). Popover: "No more than {X} shares freely tradable when the inputs line up, from SEC filings as of {filed-count date}; insider holdings filed on {holding dates}."
- No filed share count at all: cell **"Unknown"**. Popover: "No filed share count."
- A filed count exists but recent issuance could have changed it (a stale count, or an active ATM, equity line, or a known-active warrant, convertible or preferred block): cell **"Cannot verify"** (two lines). Popover: "Cannot verify: shares may have been issued since the filed count."

Unknown and Cannot verify are distinct: Unknown is no filed count; Cannot verify is a count that exists but cannot be trusted. {filed-count date} is the filed share count's date; the cell carries the compact bound, the date lives in the popover. The "≤ {X}" cell needs an aria-label "no more than {X} shares".

## 2. Float tooltip (ends with the page link)

"Computed from SEC filings: the most recent filed share count less the shares insiders hold directly (holdings as filed on {holding dates}). When the inputs line up, the true float is at most this. Read how float numbers are made: **Are float quotes real?**"

## 3. Public page: "Are float quotes real?"

**Are float quotes real?**

Float is the number of shares actually available to trade. You will see a float number quoted for almost every stock, and no SEC filing we know of requires a count of floating shares. It is worth knowing what those numbers are.

**Where a float number comes from**

We know of no SEC filing that requires a count of floating shares. For companies that file a 10-K, the closest required figure is the SEC's own term, public float: on the 10-K cover, the dollar value of shares held by non-affiliates, measured as of the last business day of the second fiscal quarter (Rule 12b-2). That is a dollar value on one past date, not a current count of tradable shares.

So a quoted float is an estimate, not a filed fact. We know of no public source that states a count of freely tradable shares.

**How we do it**

Ours is an estimate too. What differs is what it is computed from and how we show it: computed from SEC filings, shown as a bound rather than a single figure presented as fact.

We start with the share count the company most recently filed. From it we subtract the shares the company's insiders report holding directly, the officers, directors, large holders and anyone else who files Forms 3, 4 and 5, each holding taken from that filer's own filing. When the inputs line up, what is left is the most shares that could be trading, and the true float is at most that number; the cell shows this compactly as "≤ X", with the full statement, no more than X shares as of the filed count's date, in the detail. When they do not, a count too old to trust, a holding dated before a share split, or a holding dated after the count, the cell reads Cannot verify, with the reason in the detail.

**What we do not subtract, and why**

We do not subtract the beneficial-ownership totals in 13D or 13G filings. Beneficial ownership (SEC Rule 13d-3) is broader than the direct holdings above: it counts shares a holder has the right to acquire within 60 days, such as warrants or convertible notes that are not trading today, and shares whose voting or investment the holder controls. Subtracting a beneficial total can take the number below the real float. An earlier version of this method that also subtracted those totals went below zero on one test name, where the large holders' combined beneficial totals exceeded the filed share count. So we subtract only the shares an insider reports holding outright.

**When we cannot**

When the company has no filed share count, the cell reads Unknown. When a filed count exists but recent share issuance could have changed it, for example an active at-the-market program or a convertible block, or the count is simply too old to trust, the cell reads Cannot verify, with the reason in the detail.

**What this is, and is not**

This is a bound, not a measurement of the true float. Where we show a number, it is computed from filings, shown as the most shares that could be trading rather than a single figure presented as fact.
