# Float cell, tooltip, and the public page "Are float quotes real?": DRAFT copy v16

*Marketing draft v16, 2026-10-05 late evening. v15 to v16 is FORM A of `float-wording-batch-2026-10-05.md` applied, Commercial PASS 5n at `22bc856f`. Current change list, this draft against v15 (`acd6cf0f`):*
1. *The bound is dated to the count: popover, aria-label, off-popover string, legend and tooltip say "as of {filed-count date}" on the claim, add "Filings read on {fetch date}", and say insider sales after the count are not reflected.*
2. *New Cannot verify reason FILINGS_NOT_REREAD (six strings, was five).*
3. *The page's four edits and the Cannot verify bullet (the true float "on the date of the count", the sale paragraph).*
4. *`{D-label}` is "the checkpoint" on reports, exports and stored copies, and "the date shown" on the live board with that date printed (Design chooses by surface).*

*Still not his-approved as written: text he approved at 2026-10-05T16:01:43Z changes by items 1 to 3, so it reaches him as one line carried by Integration (batch section 6, which Integration rewords per 5n). FORM B (S1) is in the batch file, not here; it needs a Commercial pass when S1 is built and measured. Earlier history: the 90-day maximum is his ruling (2026-10-05T21:22:37Z); the "latest filed share count we have" words are Commercial 5k item 2; "Not computed" and the one-line faces fit Design's 102 px column.*

*What the draft states, in one place:*
- *Four faces: "≤ 12.3M", "Unknown", "Cannot verify", "Not computed". Popover reasons are per stored cause (three for Unknown, six for Cannot verify, one for Not computed).*
- *The conditional behind a bare "≤ X" lives in the legend, the aria-label and the popover's "lined up" clause. Off-popover surfaces carry "as of {date}" and "when the filings line up" inline.*
- *A holding dated after the count, or before a split that fell between it and the count, is left out and never lowers our number; it is not a Cannot verify cause. A split between the count's date and the checkpoint is (SPLIT_SINCE_COUNT).*
- *Issuance wording is true of a closed offering and of a may-be-issuing flag; "in the company's filings" stays out because a flag may cite any source type. A name with nothing found may still have issued shares.*
- *No em dashes; no universal claims beyond the sources; no vendor named or disparaged; the body never answers "no" about anyone. MUST NOT ship before the insider-only method has a validation sample, and the page must not say or imply the sample has run until it has. The tooltip link and this page ship in ONE release (Web's rule).*

## 1. Float cell

The cell face is compact; the full statement is in the popover. A trader sees one of four faces.

| Face | When | Popover |
|---|---|---|
| **≤ 12.3M** (also "≤ 123.4M", "≤ 1.23B"), with the filed count's date beside it (format and fit in the 102 px column are Design's) | filed count present and dated within 90 days of the checkpoint, no issuance flagged, figure passes its check | "No more than {X} shares as of {filed-count date}, when the filings line up. Computed from the company's filed share count, less insider holdings filed on {holding dates}. Filings read on {fetch date}. Lined up means: a filed count dated {filed-count date}, at most 90 days before {D-label}, no share issuance the desk has flagged, no share split since the count, and holdings dated at or before the count. Insider sales after the count date are not reflected." |
| **Unknown** | no filed count (see causes) | per cause, below |
| **Cannot verify** (one line, 83.7 px) | a count exists but cannot be relied on today (see causes) | per cause, below |
| **Not computed** (one line, 77.3 px) | the desk has not computed this name | "The desk has not computed a float for this name." |

**Unknown, one string per cause:**
- No filed share count: "No filed share count."
- No SEC filer match: "We could not match this name to an SEC filer, so there is no filed share count to start from."
- Count spread across filings: "The filed share count is split across several filings, so no single count applies."

**Cannot verify, one string per cause (six stored reasons; the issuance string is true of a flagged block of any type and of a may-be-issuing flag):**
- Count too old: "Cannot verify: the latest filed share count is from {filed-count date}, too old to rely on."
- Active issuance: "Cannot verify: shares may have been issued since the filed count."
- Split since the count: "Cannot verify: a share split fell after the filed count's date, or we could not rule one out, so the count may be in different share units."
- Issuance not checked: "Cannot verify: we have not yet reviewed this company's share supply, so share issuance was not checked."
- Figure fails its check: "Cannot verify: the computed figure did not pass the desk's own sanity check, so it is not shown."
- Filings not reread (shown when a stored row is more than 4 days older than D): "Cannot verify: the desk has not read this company's filings since {fetch date}."

Unknown and Cannot verify are distinct: Unknown is no usable single filed count; Cannot verify is a count that exists but cannot be relied on. The face "Not computed" is never printed as Unknown. Its aria-label is "float not computed for this name".

**aria-label on the bound face:** "no more than {X} shares as of {filed-count date}, computed from SEC filings, when the filings line up".

**Column header or once-only legend** (5e item 3a; the header is not a bare "Float"): "Float: computed from SEC filings. An upper bound as of the date shown, when the filings line up. The date is the filed share count's." (If Design prefers the header, "Float, from filings" with this line as its legend.)

**Anywhere the number appears without a popover** (report text, MCP tool output, exports, any stored copy): "no more than {X} shares as of {filed-count date}, when the filings line up, from SEC filings". The popover is not a place a persisted number can lean on.

Wherever the cell is described in words, "Not computed" and "Unknown" are not interchangeable.

## 2. Float tooltip (ends with the page link)

"Computed from SEC filings: the latest filed share count we have, less the shares insiders hold directly (holdings as filed on {holding dates}). When the filings line up, the true float as of the count's date is at most this. Read how float numbers are made: **Are float quotes real?**"

## 3. Public page: "Are float quotes real?"

**Are float quotes real?**

Float is the number of shares actually available to trade. You will see a float number quoted for many stocks, and no SEC filing we know of requires a count of floating shares. It is worth knowing what those numbers are.

**Where a float number comes from**

We know of no SEC filing that requires a count of floating shares. For companies that file a 10-K, the closest required figure is the SEC's own term, public float: on the 10-K cover, the dollar value of shares held by non-affiliates, measured as of the last business day of the second fiscal quarter (Rule 12b-2). That is a dollar value on one past date, not a current count of tradable shares.

So a float number on a quote page is an estimate someone computed, unless a filing happens to state it.

**How we do it**

Ours is an estimate too. Here is what it is computed from and how we show it.

We start with the latest filed share count we have for the company. From it we subtract the shares the company's insiders report holding directly, the officers, directors, 10 percent owners and anyone else who files Forms 3, 4 and 5 on their own, each holding taken from that filer's own filing and dated at or before the count. When the filings line up, what is left is the most shares that could have been trading on the date of the count, and the true float on that date was at most that number.

**What you see in the cell**

The cell shows one of four things.

- **≤ 12.3M** (the number varies). The float as of that date was no more than that, when the filings line up. The date of the filed count is shown beside it.
- **Unknown.** There is no single filed share count to start from: the company has none on file, we could not match it to an SEC filer, or its count is split across several filings.
- **Cannot verify.** A filed count exists but we will not stand behind a number built on it: the count is too old, the desk has not read the company's filings since the date given in the detail, shares may have been issued since, a split may have changed the share units, we did not check for issuance, or the figure did not pass our own sanity check. The reason is in the detail.
- **Not computed.** We have not computed this name. That is different from Unknown.

**What we do not subtract, and why**

We do not subtract the beneficial-ownership totals in 13D or 13G filings. Beneficial ownership (SEC Rule 13d-3) is broader than the direct holdings above: it counts shares a holder has the right to acquire within 60 days, such as warrants or convertible notes that are not trading today, and shares whose voting or investment the holder controls. Subtracting a beneficial total can take the number below the real float. An earlier version of this method that also subtracted those totals went below zero on one test name, where the large holders' combined beneficial totals exceeded the filed share count. So we subtract only the shares an insider reports holding outright. A holding dated after the filed count, or before a share split that fell between it and the count, is left out, and leaving a holding out never lowers our number.

**What a number does not tell you**

When we find that shares have been issued since the count, or may be, the name reads Cannot verify. A name with nothing found may still have issued shares, and insiders may have sold since the count. We subtract the holdings they reported as of the count's date, so shares an insider has sold since are not added back, and today's float can be larger than the figure. The figure is only as current as the filings under it.

**What this is, and is not**

This is a bound, not a measurement of the true float. Where we show a number, it is computed from filings, and when the filings line up it is the most shares that could have been trading on the date of the count.

---

**Open points**
1. The boundary between "Not computed" (no bound computed) and "Cannot verify" with the issuance-not-checked reason (the bound ran, no dossier) is Research's to state when a name is each. Commercial's string for the second now says "we have not yet reviewed this company's share supply", which reads differently from "Not computed" because it names the company's supply; if Research's boundary changes which state a never-researched name takes, the strings stay and the mapping changes.
2. The wider rule (a may-be-issuing flag also reads Cannot verify) stays only if Research's table shows the column is still usable. If it narrows, the issuance string loses nothing, since "may have been issued" is true of both.
3. Face and column width: Design approved a 102 px Float column (from 84), in which "Cannot verify" (83.7 px) and "Not computed" (77.3 px) and all other faces are one line. In the old 84 px cell a two-line face cost 56 px against 32 px and raised 10 of 12 board rows, so the wider column is what keeps the board rows unchanged. "Not yet" and "Pending" both imply something is on its way, which is why the face is "Not computed".
