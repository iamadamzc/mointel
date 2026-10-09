---
title: Are float quotes real?
---

<!--
THE ONE SOURCE of the public page /are-float-quotes-real, rendered at request
time by lib/public/explainer.ts. No copy of this text exists in any template.

TEXT: docs/marketing/float-page-draft.md section 3 at v25 (5ea4f398, Commercial
22b PASS at f2413d99), verbatim. He approved v16 and this path
2026-10-06T00:41:47.543Z ("yes to both, v16 and that path"), the paragraph
"What a number does not tell you" at v19 2026-10-06T01:43:24.491Z ("yes to v19")
and at v20 2026-10-06T02:17:32.593Z ("yes to v20"), then v25, the rewrite after
the outside review, 2026-10-07T00:58:05.615Z ("yes", answering "yes float
text"), each after a preview with the changes marked; then the Unknown line in
"What you see in the cell" (Marketing a21558ba, Commercial 54), 2026-10-09T11:45:34.249Z
("yes to the float page change", shown the exact line at 10:40:01Z); then the paragraph
under the lede, "A float counts the shares available to trade..." (Marketing 955b3749,
Commercial 66), 2026-10-09T22:45:50.617Z ("1, yes", shown the exact line); then the
TMI Float definition after it (Marketing 00130acf, Commercial 67), 2026-10-09T22:52:40.779Z
("yes", shown the exact definition). Any word changed
here is public copy and needs his yes before the commit.

DO NOT SHIP until the float is turned on: "What a number does not tell you" names the issuance
check (424B1, 424B2, 424B4, 424B5 and 8-K item 3.02) and the 20-F or 40-F
refusal, and "How we do it" describes the insider rule S1, so the page must not
ship before those run in production. The board's float cell links here, and the
link and this page ship in ONE release (a link to a page that 401s is worse than
no link). The route also needs its own exact-match nginx exemption from Basic
Auth while Basic Auth stands.

No em dash anywhere in this file (his hard rule; tests/web/emDash.test.ts).
-->

# Are float quotes real?

Float is the number of a company's shares available for public trading. It is usually computed as shares outstanding less the shares held by insiders and other closely held or restricted shares. This desk computes an upper bound on that computed figure from SEC filings, subtracting only the insider holdings it can see. The shares that can trade on a given day can be more, because insiders can sell. You will see a float number quoted for many stocks, and no SEC filing we know of requires a count of floating shares. It is worth knowing what those numbers are.

A float counts the shares available to trade. It leaves out warrants, convertible notes and share-sale programs, which can add shares. In small caps, that is decision information, not fine print.

TMI Float is this desk's definition of float: shares outstanding less the shares insiders hold. The desk can only subtract the holdings insiders report directly, so it shows an upper bound, with the date of the filed share count. When it cannot be computed it says Unknown, Cannot verify or Not computed, and gives the reason.

## Where a float number comes from

We know of no SEC filing that requires a count of floating shares. For companies that file a 10-K, the closest required figure is on the cover of Form 10-K: the dollar value of the common equity held by non-affiliates, as of the last business day of the second fiscal quarter (the SEC's rules call this the public float, Rule 12b-2). The cover figure can rest on stated assumptions. That is a dollar value on one past date, not a current count of tradable shares.

So a float number on a quote page is an estimate someone computed, unless a filing happens to state it.

## How we do it

Ours is an estimate too. Here is what it is computed from and how we show it.

We start with the latest filed share count we have for the company. From it we subtract the shares the company's insiders report holding directly, the officers, directors, 10 percent owners and anyone else who files Forms 3, 4 and 5 on their own. For each insider we take the smaller of two holdings: their holding as of the count's date, and their latest holding dated on or before the date of the board or report. So a sale an insider has filed since the count is added back, and a sale not yet filed cannot be seen. When the filings line up, and taking float as shares outstanding less insider holdings, the true float is at most what is left.

## What you see in the cell

The cell shows one of four things.

- **≤ 12.3M** (the number varies). Taking float as shares outstanding less insider holdings, it is no more than that, when the filings line up. The date of the filed count is shown beside it.
- **Unknown.** The desk could not start from a single filed share count: the company has none on file, we could not match it to an SEC filer, SEC's company-facts data returned nothing for it, or its count is split across several filings.
- **Cannot verify.** A filed count exists but we will not stand behind a number built on it: the count is too old, the desk has not read the company's filings since the date given in the detail, shares may have been issued since, a split may have changed the share units, we did not check for issuance, the count is from a Form 20-F or 40-F and we do not check for unregistered sales, or the figure did not pass our own sanity check. The reason is in the detail.
- **Not computed.** We have not computed this name. That is different from Unknown.

## What we do not subtract, and why

We do not subtract the beneficial-ownership totals in 13D or 13G filings. Beneficial ownership (SEC Rule 13d-3) is broader than the direct holdings above: it counts shares a holder has the right to acquire within 60 days, such as warrants or convertible notes that are not trading today, and shares whose voting or investment the holder controls. Subtracting a beneficial total can take the number below the real float. An earlier version of this method that also subtracted those totals went below zero on one test name, where the large holders' combined beneficial totals exceeded the filed share count. So we subtract only the shares an insider reports holding outright. A holding dated before a share split that fell between it and the count is left out, and leaving a holding out never lowers our number.

## What a number does not tell you

When we find a flag or a filing showing that shares have been issued since the count, or may have been, the name reads Cannot verify. The filings we look for are two kinds made on or after the count's date: a final prospectus for an offering of securities (SEC forms 424B1, 424B2, 424B4 and 424B5), and a report of an unregistered sale of shares (Form 8-K item 3.02). We do not look at other forms, including 424B3 and 424B7. Those checks cannot see every issuance: sales under an open at-the-market program between supplements, private placements below the size that requires a report (Form 8-K item 3.02 requires none below 1 percent of the class, or 5 percent for a smaller reporting company, counted in total since the company's last such report or last periodic report, whichever is more recent), and conversions or exercises that file nothing, do not show up in them. Neither do sales of newly issued shares to an equity-line investor, who buys on the company's demand: the checks would see one only through a final prospectus or a report of an unregistered sale, and Form 8-K item 3.02 requires such a report only when the running total since the company's last such report or last periodic report reaches the item 3.02 size. A company whose filed count is from a Form 20-F or 40-F is not required to file 8-Ks, so for it the check for an unregistered-sale report is not run, and the name reads Cannot verify. A name with nothing found may still have issued shares. A sale not yet filed by the date the filings were read can still make the float larger than the bound. The figure is only as current as the filings under it.

## What this is, and is not

This is a bound, not a measurement of the true float. Where we show a number, it is computed from filings, and when the filings line up taking float as shares outstanding less insider holdings, it is the most the float can be.
