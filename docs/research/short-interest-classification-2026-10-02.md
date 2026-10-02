# Short interest classification: the words and where the lines go

*Seat `local_5f4bfcf8` (Research-tmi), 2026-10-02. Method and proposal only; no build, no data pulled.*

- **His words** (typed into this seat's session, 2026-10-02): "Do some reseach around what the paramters should be on short interest classification. i dont know wht the right classification words would be, but it should be informative and helpful."
- **Builds on** `docs/research/short-interest-2026-10-02.md`: its measures, its freshness rules, and its %-of-float gate.
- **What this doc is:** what the published sources use as cut lines, what they agree on and where they don't, and a proposed set of words and lines for the desk. **The lines are PROVISIONAL** until checked against the names his board actually ranks; that check is in the last section.
- **What this doc is not:** a test of whether short interest predicts anything. That is a separate measurement and his call.

## 1. What the sources use

**Academic: Asquith, Pathak and Ritter (2005)**, *Short interest, institutional ownership, and stock returns*, Journal of Financial Economics 78, 243-276. Text read today from the author's posted PDF.

- They classify by short interest as a share of **shares outstanding**, which is the desk's own denominator. Their fixed portfolios are **2.5%, 5% and 10%** of shares outstanding. They also use **percentiles**: the top 5% and the top 1% of all stocks.
- In December 2002 the top 1% had at least **23%** of shares outstanding shorted on NYSE-Amex and **24%** on Nasdaq.
- They note that the overall level of short interest rose substantially from 1980 to 2002. So a stock entering the top percentiles early in the period had a smaller short position than one entering late. **A percentile line moves with the market; a fixed line does not.**
- **Heavy short interest does not last long.** Of firms that crossed 2.5%, 31.8% fell back below it the following month, and the median run as a highly shorted stock was 2 to 3 months.
- **Short interest is demand meeting supply.** In their words, stocks are short-sale constrained "when there is a strong demand to sell short and a limited supply of shares to borrow". They use short interest as the proxy for demand. **Short interest counts only the shorting that could happen**, so a hard-to-borrow stock can show low short interest while demand to short it is high.

**Practitioner scales: none is a standard, and they disagree.**

| Source | % of float bands | Days to cover bands | Cites a source? |
|---|---|---|---|
| Deepvue, "5 Short Interest Metrics" | Low under 10%; Elevated 10 to 20%; High 20 to 40%; Extreme over 40% | Low under 3; Moderate 3 to 5; High 5 to 10; Extreme 10+ | No |
| Wikipedia, "Short interest ratio" | none | "around five or greater" read as bearish | No |
| Search results from other trading blogs (not opened one by one) | 10% / 20% / 30% variously | 5, 8 or 10 variously | Not checked |

**What they agree on:** in % of float, about 10% is where "elevated" starts and about 20% is where "high" starts. In days to cover, 5 and 10 are the common lines. **None of them gives a reason for its lines.** Their scales are all in % of FLOAT, and float is smaller than shares outstanding, so the same position reads higher on their scale than on the academic one.

## 2. Design rules the words must follow

1. **Words describe the position, not what it will do.** "Heavy" says how much stock is sold short. It does not say squeeze, risk, bearish or bullish. Every practitioner scale above attaches an outcome word ("dangerous for shorts", "bearish signal"), and none shows evidence for it. This also keeps the copy inside the reports' rules: the reader is long-only, and no trade advice.
2. **Every word carries its date and its source.** The number is 1.5 to 3.5 weeks old in his window (the first doc, section 2).
3. **The size word comes from the gated floor and reads "at least".** The first doc's gate: no share issuance and no split between the share-count date and the settlement date, with the count current under 45 days. Because the figure is a floor, **the word can understate the true % of float but never overstate it.** When the gate fails, no size word is shown.
4. **No word for "concentrated".** No public source measures how many holders hold the short position (the first doc's addendum). A word for it would be invented.
5. **Fixed lines, not percentiles.** A percentile changes meaning with the market's overall level (Asquith, Pathak and Ritter, above) and with whichever names the board holds that day. A fixed line means the same thing every day, which is what makes the word learnable.

## 3. Proposed words and lines (provisional)

**Size: short interest as at least N% of shares outstanding.** Short interest is divided by the filed share count, which is a floor on % of float.

**REVISED 2026-10-02, on his question "is 14% considered HEAVY?"** The first version of this table called 10% to 20% "Heavy". It was set from the academic and practitioner lines without checking where today's market actually sits, so it was too generous.

**Where the market sits today.** Short Interest & Squeeze Watch (thetrading.tools/short-interest, read today) computes these from FINRA's file for the Sep 15, 2026 settlement, across 5,447 US common stocks:

- the median stock: **3.4%** of its shares sold short;
- **17%** of stocks above 10%;
- **5.7%** above 20%;
- median days to cover **4.0**.

These are a third party's computation from FINRA's file. This seat has not reproduced them, and they are market-wide, not his names. They are the only recent distribution read.

**Words revised again in `docs/research/short-interest-label-design.md` on Commercial's review (R1):** the lowest grade is shown as the literal band "under 5% of shares outstanding" with no word, and "Above normal" is "Moderate". "Normal" claimed an absence of crowding that a floor measure cannot support. The lines below are unchanged.

| Floor | Word | Where that sits in the market (Sep 15, 2026, third-party figures above) |
|---|---|---|
| under 5% | **Normal** | Around the median (3.4%) |
| 5% to under 10% | **Above normal** | Above the median, below the top sixth |
| 10% to under 20% | **Elevated** | The top 17% of stocks, but not the top 6%. Practitioner "elevated" is the same band |
| 20% or more | **Heavy** | The top 5.7% of stocks. Practitioner "high" starts here |

- **So 14% reads "Elevated"**: about four times the typical stock, and in roughly the top sixth of the market, but not in the rare group.
- "Heavy" is kept for the top few percent, so the word stays rare enough to mean something.
- A separate "Very heavy" line (for example 30%) is not proposed: no figure was read for how many stocks sit above it.
- **The floor caveat stands.** This is a floor on % of float, and on a small-float name the true % of float can be well above it. So a name shown Elevated can really be Heavy by float. The word can understate; it never overstates.

**Depth: FINRA's days to cover**, as FINRA prints it, on the prior cycle's average volume.

| Days to cover | Word |
|---|---|
| under 3 | **Shallow** |
| 3 to under 5 | **Moderate depth** |
| 5 to under 10 | **Deep** |
| 10 or more | **Very deep** |

- These lines follow the one practitioner scale read in full (3, 5, 10), and 5 and 10 recur in the others.
- **Against the market (added with the revision above):** the median stock's days to cover was 4.0 on Sep 15, 2026 (third-party figure). "Moderate depth" (3 to 5) therefore holds the typical stock, and "Deep" starts just above it. Only "Very deep" (10+) is clearly unusual. No percentile for 5 or 10 days was read, so these lines stay provisional until the calibration check in section 5.
- FINRA prints 1.00 for any value at or below 1 (its glossary). So "1.00" means "at most a day", and stays Shallow.
- **The depth word describes the stock's NORMAL trading, not today's.** On a name trading many times its usual volume, the shares short are a small fraction of today's flow even when the word says Deep. The line must say "on normal volume" (section 4). Recomputing days to cover on today's volume stays ruled out: it divides a weeks-old position by today's flow, and calls the result something FINRA never published.

**Trend: change between the last two reports** (FINRA's own % change).

| Change | Word |
|---|---|
| up 25% or more | **Building** |
| down 25% or more | **Covering** |
| otherwise | **Steady** |

- **No source gives these lines. They are this seat's proposal**, chosen so that one cycle's noise does not flip the word.
- A trend word is shown only when size is Above normal or higher. On a small base, a few thousand shares make a large percentage change and the word would mean nothing.

**Pairing with borrow status** (only if Alpaca's borrow status may be displayed; Commercial section 8 says it needs notice to Alpaca):

- **"Normal, hard to borrow at Alpaca"** tells the reader the low number may be limited supply, not limited demand to short (Asquith, Pathak and Ritter's demand-and-supply framing, above).
- Without the pairing, "Normal" on a hard-to-borrow name would read as "few shorts want this stock", which the data does not show.

**Freshness:**

- **The date and age always print.**
- **If the newest report the desk holds is older than FINRA's latest publication date, nothing prints.** A cycle was missed, and a word from two reports ago describes a different stock.
- On a name that has run since the settlement date, the line can add "before today's move": the date is earlier than the run.

## 4. How it reads

**SUPERSEDED for the shipped form by `docs/research/short-interest-label-design.md` (2026-10-02).** Under FINRA's API terms (Commercial §10.2 and §11b, on his registration), the label shows grade words and their bands only, never FINRA's numbers. The size words say "of shares outstanding", never "of float". The examples below, which print figures and "of float", are kept as the first draft only and are NOT the form to build.

**Drawer: one line, always shown when a report is held.** Examples with illustrative numbers (first draft, superseded):

> Short interest: **Elevated** (at least 14% of float), **Deep** (6.2 days on normal volume), **Building** (up 40%). FINRA, as of Sep 15, 17 days old.

> Short interest: **Normal** (at least 3% of float), hard to borrow at Alpaca 08:31 ET. FINRA, as of Sep 15, 17 days old.

> Short interest: 2.1M shares, **Deep** (6.2 days on normal volume). Size not stated: shares issued since the last filed count. FINRA, as of Sep 15.

**Board and report tag: only when there is something to say.**

- A chip appears only at Heavy, or at Very deep: for example "SHORTS: HEAVY" or "SHORTS: VERY DEEP". (Revised: Elevated and Deep are too common, in the market figures above, for a chip to single them out.)
- No chip is not the same as Normal, so the chip must never be the only place the read appears. The drawer always carries it.
- Where the chip sits among the Risk outcomes is the ordering question in the first doc (section 3), a product call for Design and him.

## 5. Checking the lines against his names (proposed, needs a source first)

The lines above come from all-market sources, mostly older or unsourced. His names are small caps that move a lot, often with small floats, and their short interest could sit mostly in one band. **A word that nearly every one of his names gets carries no information.**

**The check:**

- **Data:** the distribution of the gated size floor and of FINRA's days to cover across the names his board ranked in the top 12 over a recent span.
- **Rule, fixed before any data is read:** if any one band holds more than half of those names, its lines are reviewed. The review re-draws the lines; it does not test returns.
- **Blocked on a source:** this needs short-interest data whose terms allow the desk's own research use.
  - FINRA's terms bar use "in the development of any software program" (Commercial section 3).
  - Massive carries the same FINRA figures, but under individual, non-commercial terms unless on its Business plan (Commercial section 4).
  - That ruling is Commercial's, then his. **Nothing is pulled until then.**

## Sources (opened 2026-10-02)

- Asquith, Pathak and Ritter (2005), JFE 78:243-276, author's PDF: site.warrington.ufl.edu/ritter/files/2015/04/Short-interest-institutional-ownership-and-stock-returns-2005-08.pdf (text extracted locally)
- Deepvue, "5 Short Interest Metrics That Drive Stock Prices": deepvue.com/fundamentals/short-interest/
- Wikipedia, "Short interest ratio": en.wikipedia.org/wiki/Short_interest_ratio
- FINRA, Equity Short Interest Data Glossary (days-to-cover display rules), as cited in `docs/research/short-interest-2026-10-02.md`
- Commercial, `docs/commercial/2026-10-02-short-interest-landscape.md` (`d5da7c08`): sections 3, 4 and 8
