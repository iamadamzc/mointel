# Float cell, tooltip, and the public page "Are float quotes real?": DRAFT copy v15

*Marketing draft v15, 2026-10-05. v14 to v15 is Commercial 5k item 2 only (e0139dea): "the most recent filed share count" (tooltip) and "the share count the company most recently filed" (page) become "the latest filed share count we have" and "the latest filed share count we have for the company", because the board can show a row fetched the evening before. Text he approved at 2026-10-05T16:01:43Z changes by those words, so it reaches him as one line. WAITING on Research, not worded: 5k item 4 (insider sales after the count: the dated "as of" in the popover and tooltip, and "or insiders may have sold" on the page), 5k item 3 (a "Filings read on {fetch date}" popover clause), 5k item 1 (D fixed per checkpoint, else "the date shown"). v13 to v14: v13 to v14 is Commercial's 5j single required change: "within the last 90 days" measured the wrong thing (the rule is the count's as-of date to the CHECKPOINT, and "filed" differs from "dated"), so the popover reads "a filed count dated {filed-count date}, at most 90 days before the checkpoint" and the table "dated within 90 days of the checkpoint". Earlier: v12 to v13 is the 90-day rewrite only (his ruling, read at his own turn in the Integration seat's transcript 125cfd6b, 2026-10-05T21:22:37.820Z, human origin: "90 days, approve the badge draft, yes hand off"; the first clause is the float maximum filed-count age). The six sentences are Commercial's 5i (b757236d); Commercial reads only these: (1) the bound face carries the filed count's date beside it, format and fit in the 102 px column Design's; (2) the aria-label carries "as of {filed-count date}"; (3) "a recent filed count" in the popover is "a filed count dated {filed-count date}, at most 90 days before the checkpoint"; (4) the page bullet says the date "is shown beside it"; (5) the legend gains "The date is the filed share count's."; (6) the spent 5e standing-condition line is gone. Built on Commercial's claims reads 5e to 5h and Research's float contract (c624aeec and its answer commits). Read-order for Commercial: the diff of this file against the last pass (5h passed v8).*

*Current change list (this draft against v8, the version 5h read; item 1 changed again in v11, see below):*
1. *NOT_YET face is "Not computed" (two words, each 9 characters or fewer, one line in the 102 px Float column), not "not researched yet", which Design measured at three lines in the 68 px text room. v9 had "Not yet", which Commercial passed with one note: it implies something is on its way, the same objection I had to "Pending". "Not computed" states what is true and promises nothing. Design measured it at 77.3 px, one line, in the 102 px Float column (approved).*
2. *ISSUANCE_NOT_CHECKED string is Commercial's (5h, required): "Cannot verify: we have not yet reviewed this company's share supply, so share issuance was not checked."*
3. *"Left out ... before a share split" now reads "before a share split that fell between it and the count" (5h, recommended).*

*What the draft states, in one place:*
- *Four faces: "≤ 12.3M", "Unknown", "Cannot verify", "Not computed". Popover reasons are per stored cause (three for Unknown, five for Cannot verify, one for Not computed).*
- *The conditional behind a bare "≤ X" lives in the legend, the aria-label and the popover's "lined up" clause. Off-popover surfaces carry "as of {date}" and "when the filings line up" inline.*
- *A holding dated after the count, or before a split that fell between it and the count, is left out and never lowers our number; it is not a Cannot verify cause. A split between the count's date and the checkpoint is (SPLIT_SINCE_COUNT).*
- *Issuance wording is true of a closed offering and of a may-be-issuing flag; "in the company's filings" stays out because a flag may cite any source type. A name with nothing found may still have issued shares.*
- *No em dashes; no universal claims beyond the sources; no vendor named or disparaged; the body never answers "no" about anyone. MUST NOT ship before the insider-only method has a validation sample, and the page must not say or imply the sample has run until it has. The tooltip link and this page ship in ONE release (Web's rule).*

## 1. Float cell

The cell face is compact; the full statement is in the popover. A trader sees one of four faces.

| Face | When | Popover |
|---|---|---|
| **≤ 12.3M** (also "≤ 123.4M", "≤ 1.23B"), with the filed count's date beside it (format and fit in the 102 px column are Design's) | filed count present and dated within 90 days of the checkpoint, no issuance flagged, figure passes its check | "The float is no more than {X} shares when the filings line up. Computed from the company's filed share count as of {filed-count date}, less insider holdings filed on {holding dates}. Lined up means: a filed count dated {filed-count date}, at most 90 days before the checkpoint, no share issuance the desk has flagged, no share split since the count, and holdings dated at or before the count." |
| **Unknown** | no filed count (see causes) | per cause, below |
| **Cannot verify** (one line, 83.7 px) | a count exists but cannot be relied on today (see causes) | per cause, below |
| **Not computed** (one line, 77.3 px) | the desk has not computed this name | "The desk has not computed a float for this name." |

**Unknown, one string per cause:**
- No filed share count: "No filed share count."
- No SEC filer match: "We could not match this name to an SEC filer, so there is no filed share count to start from."
- Count spread across filings: "The filed share count is split across several filings, so no single count applies."

**Cannot verify, one string per cause (five stored reasons; the issuance string is true of a flagged block of any type and of a may-be-issuing flag):**
- Count too old: "Cannot verify: the latest filed share count is from {filed-count date}, too old to rely on."
- Active issuance: "Cannot verify: shares may have been issued since the filed count."
- Split since the count: "Cannot verify: a share split fell after the filed count's date, or we could not rule one out, so the count may be in different share units."
- Issuance not checked: "Cannot verify: we have not yet reviewed this company's share supply, so share issuance was not checked."
- Figure fails its check: "Cannot verify: the computed figure did not pass the desk's own sanity check, so it is not shown."

Unknown and Cannot verify are distinct: Unknown is no usable single filed count; Cannot verify is a count that exists but cannot be relied on. The face "Not computed" is never printed as Unknown. Its aria-label is "float not computed for this name".

**aria-label on the bound face:** "no more than {X} shares, computed from SEC filings as of {filed-count date}, when the filings line up".

**Column header or once-only legend** (5e item 3a; the header is not a bare "Float"): "Float: computed from SEC filings. An upper bound when the filings line up. The date is the filed share count's." (If Design prefers the header, "Float, from filings" with this line as its legend.)

**Anywhere the number appears without a popover** (report text, MCP tool output, exports, any stored copy): "no more than {X} shares when the filings line up, from SEC filings as of {filed-count date}". The popover is not a place a persisted number can lean on.

Wherever the cell is described in words, "Not computed" and "Unknown" are not interchangeable.

## 2. Float tooltip (ends with the page link)

"Computed from SEC filings: the latest filed share count we have, less the shares insiders hold directly (holdings as filed on {holding dates}). When the filings line up, the true float is at most this. Read how float numbers are made: **Are float quotes real?**"

## 3. Public page: "Are float quotes real?"

**Are float quotes real?**

Float is the number of shares actually available to trade. You will see a float number quoted for many stocks, and no SEC filing we know of requires a count of floating shares. It is worth knowing what those numbers are.

**Where a float number comes from**

We know of no SEC filing that requires a count of floating shares. For companies that file a 10-K, the closest required figure is the SEC's own term, public float: on the 10-K cover, the dollar value of shares held by non-affiliates, measured as of the last business day of the second fiscal quarter (Rule 12b-2). That is a dollar value on one past date, not a current count of tradable shares.

So a float number on a quote page is an estimate someone computed, unless a filing happens to state it.

**How we do it**

Ours is an estimate too. Here is what it is computed from and how we show it.

We start with the latest filed share count we have for the company. From it we subtract the shares the company's insiders report holding directly, the officers, directors, 10 percent owners and anyone else who files Forms 3, 4 and 5 on their own, each holding taken from that filer's own filing and dated at or before the count. When the filings line up, what is left is the most shares that could be trading, and the true float is at most that number.

**What you see in the cell**

The cell shows one of four things.

- **≤ 12.3M** (the number varies). The float is no more than that, when the filings line up. The date of the filed count is shown beside it.
- **Unknown.** There is no single filed share count to start from: the company has none on file, we could not match it to an SEC filer, or its count is split across several filings.
- **Cannot verify.** A filed count exists but we will not stand behind a number built on it: the count is too old, shares may have been issued since, a split may have changed the share units, we did not check for issuance, or the figure did not pass our own sanity check. The reason is in the detail.
- **Not computed.** We have not computed this name. That is different from Unknown.

**What we do not subtract, and why**

We do not subtract the beneficial-ownership totals in 13D or 13G filings. Beneficial ownership (SEC Rule 13d-3) is broader than the direct holdings above: it counts shares a holder has the right to acquire within 60 days, such as warrants or convertible notes that are not trading today, and shares whose voting or investment the holder controls. Subtracting a beneficial total can take the number below the real float. An earlier version of this method that also subtracted those totals went below zero on one test name, where the large holders' combined beneficial totals exceeded the filed share count. So we subtract only the shares an insider reports holding outright. A holding dated after the filed count, or before a share split that fell between it and the count, is left out, and leaving a holding out never lowers our number.

**What a number does not tell you**

When we find that shares have been issued since the count, or may be, the name reads Cannot verify. A name with nothing found may still have issued shares. The figure is only as current as the filings under it.

**What this is, and is not**

This is a bound, not a measurement of the true float. Where we show a number, it is computed from filings, and when the filings line up it is the most shares that could be trading.

---

**Open points**
1. The boundary between "Not computed" (no bound computed) and "Cannot verify" with the issuance-not-checked reason (the bound ran, no dossier) is Research's to state when a name is each. Commercial's string for the second now says "we have not yet reviewed this company's share supply", which reads differently from "Not computed" because it names the company's supply; if Research's boundary changes which state a never-researched name takes, the strings stay and the mapping changes.
2. The wider rule (a may-be-issuing flag also reads Cannot verify) stays only if Research's table shows the column is still usable. If it narrows, the issuance string loses nothing, since "may have been issued" is true of both.
3. Face and column width: Design approved a 102 px Float column (from 84), in which "Cannot verify" (83.7 px) and "Not computed" (77.3 px) and all other faces are one line. In the old 84 px cell a two-line face cost 56 px against 32 px and raised 10 of 12 board rows, so the wider column is what keeps the board rows unchanged. "Not yet" and "Pending" both imply something is on its way, which is why the face is "Not computed".
