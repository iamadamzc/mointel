# Float cell, tooltip, and the public page "Are float quotes real?": DRAFT copy v6

*Marketing draft v6, 2026-10-05. Applies Commercial's sections 5e (4df63826) and 5f (5bef01e3) and Research's float contract (c624aeec). Title carries v6; the change list below is v5 to v6 first, then v4 to v5. No em dashes; no universal claims beyond the sources; no vendor named or disparaged; the body never answers "no" about anyone. MUST NOT ship before the insider-only method has a validation sample, and the page must not say or imply the sample has run until it has. The tooltip link and this page ship in ONE release (Web's rule).*

*What changed v5 to v6 (5f, five required and the four points):* (1) off-popover string carries "when the filings line up"; (2) closing paragraph carries it; (3) comparisons with how other floats are made or shown removed; (4) "no public source" sentence deleted and replaced, "almost every stock" now "many stocks"; (5) issuance paragraph reworded, "in the company's filings" dropped; "we know of" now "the desk has flagged"; "can only leave higher" now the arithmetic; the split line restored pending Research; "check" now "sanity check on the figure"; "large holders" now "10 percent owners".

*What changed v4 to v5:*
1. *Four faces, not three: "≤ 12.3M", "Unknown", "Cannot verify", "not researched yet" (the contract's NOT_YET).*
2. *Popover reasons are PER CAUSE (three for Cannot verify, three for Unknown, one for not researched), each true of its cause (5e, required).*
3. *The conditional behind a bare "≤ X" lives in the legend and the aria-label (5e item 3a, 3b), and the popover says what "line up" means (3c, recommended).*
4. *Wherever the number appears with no popover (report text, MCP output, exports, stored copy) it carries "as of {date}" inline (5e item 7).*
5. *The page no longer lists a holding dated before a split or after the count as a cause of Cannot verify. The contract does not make either one: a holding dated after the count is simply not subtracted. See the open point at the bottom.*
6. *The page now says outright that a flagged-issuance check is only as good as what the desk finds (5e finding), and never implies "no issuance".*

*Standing condition from 5e: the date-in-popover ruling holds ONLY while the maximum filed-count age is 45 days. If he moves it to 90 or 120, the date returns to the cell face and section 1 changes.*

## 1. Float cell

The cell face is compact; the full statement is in the popover. A trader sees one of four faces.

| Face | When | Popover |
|---|---|---|
| **≤ 12.3M** (also "≤ 123.4M", "≤ 1.23B") | filed count present and recent, no issuance flagged, figure passes its check | "The float is no more than {X} shares when the filings line up. Computed from the company's filed share count as of {filed-count date}, less insider holdings filed on {holding dates}. Lined up means: a recent filed count, no share issuance the desk has flagged, and holdings dated at or before the count." |
| **Unknown** | no filed count (see causes) | per cause, below |
| **Cannot verify** (two lines) | a count exists but cannot be relied on today (see causes) | per cause, below |
| **not researched yet** | the desk has not computed this name | "The desk has not computed this name yet." |

**Unknown, one string per cause:**
- No filed share count: "No filed share count."
- No SEC filer match: "We could not match this name to an SEC filer, so there is no filed share count to start from."
- Count spread across filings: "The filed share count is split across several filings, so no single count applies."

**Cannot verify, one string per cause:**
- Count too old: "Cannot verify: the latest filed share count is from {filed-count date}, too old to rely on."
- Active issuance: "Cannot verify: shares may have been issued since the filed count."
- Figure fails its check: "Cannot verify: the computed figure did not pass the desk's own sanity check on the figure, so it is not shown."

Unknown and Cannot verify are distinct: Unknown is no usable single filed count; Cannot verify is a count that exists but cannot be relied on. The face "not researched yet" is never printed as Unknown.

**aria-label on the bound face:** "no more than {X} shares, computed from SEC filings, when the filings line up".

**Column header or once-only legend** (5e item 3a; the header is not a bare "Float"): "Float: computed from SEC filings. An upper bound when the filings line up." (If Design prefers the header, "Float, from filings" with this line as its legend.)

**Anywhere the number appears without a popover** (report text, MCP tool output, exports, any stored copy): "no more than {X} shares when the filings line up, from SEC filings as of {filed-count date}". The popover is not a place a persisted number can lean on.

Wherever the cell is described in words, "not researched yet" and "Unknown" are not interchangeable.

## 2. Float tooltip (ends with the page link)

"Computed from SEC filings: the most recent filed share count less the shares insiders hold directly (holdings as filed on {holding dates}). When the filings line up, the true float is at most this. Read how float numbers are made: **Are float quotes real?**"

## 3. Public page: "Are float quotes real?"

**Are float quotes real?**

Float is the number of shares actually available to trade. You will see a float number quoted for many stocks, and no SEC filing we know of requires a count of floating shares. It is worth knowing what those numbers are.

**Where a float number comes from**

We know of no SEC filing that requires a count of floating shares. For companies that file a 10-K, the closest required figure is the SEC's own term, public float: on the 10-K cover, the dollar value of shares held by non-affiliates, measured as of the last business day of the second fiscal quarter (Rule 12b-2). That is a dollar value on one past date, not a current count of tradable shares.

So a float number on a quote page is an estimate someone computed, unless a filing happens to state it.

**How we do it**

Ours is an estimate too. Here is what it is computed from and how we show it.

We start with the share count the company most recently filed. From it we subtract the shares the company's insiders report holding directly, the officers, directors, 10 percent owners and anyone else who files Forms 3, 4 and 5, each holding taken from that filer's own filing and dated at or before the count. When the filings line up, what is left is the most shares that could be trading, and the true float is at most that number.

**What you see in the cell**

The cell shows one of four things.

- **≤ 12.3M** (the number varies). The float is no more than that, when the filings line up. The date of the filed count is in the detail.
- **Unknown.** There is no single filed share count to start from: the company has none on file, we could not match it to an SEC filer, or its count is split across several filings.
- **Cannot verify.** A filed count exists but we will not stand behind a number built on it: the count is too old, shares may have been issued since, a holding is dated before a share split, or the figure did not pass our own sanity check. The reason is in the detail.
- **not researched yet.** We have not computed this name. That is different from Unknown.

**What we do not subtract, and why**

We do not subtract the beneficial-ownership totals in 13D or 13G filings. Beneficial ownership (SEC Rule 13d-3) is broader than the direct holdings above: it counts shares a holder has the right to acquire within 60 days, such as warrants or convertible notes that are not trading today, and shares whose voting or investment the holder controls. Subtracting a beneficial total can take the number below the real float. An earlier version of this method that also subtracted those totals went below zero on one test name, where the large holders' combined beneficial totals exceeded the filed share count. So we subtract only the shares an insider reports holding outright. A holding dated after the filed count is left out, and leaving a holding out never lowers our number.

**What a number does not tell you**

When we find that shares are being issued, the name reads Cannot verify. A name with nothing found may still have issued shares. The figure is only as current as the filings under it.

**What this is, and is not**

This is a bound, not a measurement of the true float. Where we show a number, it is computed from filings, and when the filings line up it is the most shares that could be trading.

---

**Open points (5f settled the four wording points; two items remain)**
1. Splits: the line "a holding is dated before a share split" is restored as a Cannot verify cause on the page, pending Research. If the built rule does not refuse a split between the holding and the count, the line goes and the "lined up" clause gains "no share split between the holding and the count" (Commercial 5f, point 3). Research has been asked.
2. "When we find that shares are being issued": "in the company's filings" returns only if Research confirms the ledger's sources are filings only.

**Open point for Design:** "not researched yet" is lower case in the contract and is the widest of the four faces; it needs the 84 px cell measured at 1,024, and may need two lines like "Cannot verify".
