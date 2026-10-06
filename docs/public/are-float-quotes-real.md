---
title: Are float quotes real?
---

<!--
THE ONE SOURCE of the public page /are-float-quotes-real, rendered at request
time by lib/public/explainer.ts. No copy of this text exists in any template.

TEXT: docs/marketing/float-page-draft.md section 3 at v16 (f2089575), verbatim.
He approved v16 and this path 2026-10-06T00:41:47.543Z ("yes to both, v16 and
that path"), after a preview with the changes from v12 marked. Any word changed
here is public copy and needs his yes before the commit.

DO NOT SHIP before Research's insider-only validation sample has run. The page
must not say or imply that it has. The board's float cell links here, and the
link and this page ship in ONE release (a link to a page that 401s is worse than
no link). The route also needs its own exact-match nginx exemption from Basic
Auth while Basic Auth stands.

No em dash anywhere in this file (his hard rule; tests/web/emDash.test.ts).
-->

# Are float quotes real?

Float is the number of shares actually available to trade. You will see a float number quoted for many stocks, and no SEC filing we know of requires a count of floating shares. It is worth knowing what those numbers are.

## Where a float number comes from

We know of no SEC filing that requires a count of floating shares. For companies that file a 10-K, the closest required figure is the SEC's own term, public float: on the 10-K cover, the dollar value of shares held by non-affiliates, measured as of the last business day of the second fiscal quarter (Rule 12b-2). That is a dollar value on one past date, not a current count of tradable shares.

So a float number on a quote page is an estimate someone computed, unless a filing happens to state it.

## How we do it

Ours is an estimate too. Here is what it is computed from and how we show it.

We start with the latest filed share count we have for the company. From it we subtract the shares the company's insiders report holding directly, the officers, directors, 10 percent owners and anyone else who files Forms 3, 4 and 5 on their own, each holding taken from that filer's own filing and dated at or before the count. When the filings line up, what is left is the most shares that could have been trading on the date of the count, and the true float on that date was at most that number.

## What you see in the cell

The cell shows one of four things.

- **≤ 12.3M** (the number varies). The float as of that date was no more than that, when the filings line up. The date of the filed count is shown beside it.
- **Unknown.** There is no single filed share count to start from: the company has none on file, we could not match it to an SEC filer, or its count is split across several filings.
- **Cannot verify.** A filed count exists but we will not stand behind a number built on it: the count is too old, the desk has not read the company's filings since the date given in the detail, shares may have been issued since, a split may have changed the share units, we did not check for issuance, or the figure did not pass our own sanity check. The reason is in the detail.
- **Not computed.** We have not computed this name. That is different from Unknown.

## What we do not subtract, and why

We do not subtract the beneficial-ownership totals in 13D or 13G filings. Beneficial ownership (SEC Rule 13d-3) is broader than the direct holdings above: it counts shares a holder has the right to acquire within 60 days, such as warrants or convertible notes that are not trading today, and shares whose voting or investment the holder controls. Subtracting a beneficial total can take the number below the real float. An earlier version of this method that also subtracted those totals went below zero on one test name, where the large holders' combined beneficial totals exceeded the filed share count. So we subtract only the shares an insider reports holding outright. A holding dated after the filed count, or before a share split that fell between it and the count, is left out, and leaving a holding out never lowers our number.

## What a number does not tell you

When we find that shares have been issued since the count, or may be, the name reads Cannot verify. A name with nothing found may still have issued shares, and insiders may have sold since the count. We subtract the holdings they reported as of the count's date, so shares an insider has sold since are not added back, and today's float can be larger than the figure. The figure is only as current as the filings under it.

## What this is, and is not

This is a bound, not a measurement of the true float. Where we show a number, it is computed from filings, and when the filings line up it is the most shares that could have been trading on the date of the count.
