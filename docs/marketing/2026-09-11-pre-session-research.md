# The pre-session research, made a bigger deal of

**Marketing, 2026-09-11, on his instruction relayed by Integration:** *"make a
bigger deal out of our pre-session research."* One new section on both landing
artboards, between the four cards and Why it exists. Every sentence below is
traced to source; nothing describes what might be built.

## What the source says it does

| On the page | Where it is written |
|---|---|
| A name that moves after the bell is on the desk's list that evening. | `worker/research.ts` watches the active board; after the bell that is the AH board (`lib/market/board.ts`). The 22:00 recap queues research for the **next** session, `worker/desk-assessments.ts:604`. |
| Finds the company behind the ticker. | `lib/research/sec/tickerMap.ts`: a match is evidence with a confidence, and an obviously wrong company is rejected. |
| Pulls the filings that can carry a share count, a registration, a resale or a financing. | `lib/research/sec/forms.ts`: `FormPurpose` is exactly those, plus catalyst and ownership. |
| Reads the paragraphs that bear on the question, not whole filings. | `lib/research/sec/documents.ts`: bounded excerpts, full text discarded. |
| A shelf from March is not pushed off the list by a run of 8-Ks. | `forms.ts`: selection is family by family because a flat most-recent list is dominated by 8-K/6-K and pushes an operative shelf or resale prospectus off the end. |
| Carries a reading, or says plainly it does not have one yet. | `lib/dashboard/risk.ts`: NOT RESEARCHED, RESEARCHING, ANALYSIS FAILED are rendered states. |
| Re-read when the company files something, not on a timer. | `lib/research/fingerprint.ts`: fetch timestamps excluded; a new accession or changed body changes the fingerprint; nothing else triggers a model call. |
| Shares outstanding is never called float; a cover-page count is an upper bound. | `lib/research/sec/companyFacts.ts`, `lib/research/float.ts` (`dei:EntityCommonStockSharesOutstanding` is an upper bound, every insider share inside it). |
| Supply is two numbers; the gap is uncertainty as a width; never rounded to zero. | `lib/research/supply.ts` (floor and filed maximum); `lib/dashboard/supply.ts` (null floor renders as "no live supply proven", never 0%). |
| A pre-split count is never compared to a post-split one. Unknown is not yes. | `supply.ts`: the test is basis, not size; a block counts only when its basis is known to match the denominator's. |
| Not researched and researched-nothing-found look different. | `risk.ts` header: "we have not looked at this" and "we looked and found nothing" must look different. |

## Deliberately not on the page

- **The why-not report** (`lib/research/whyNot.ts`) and **the book-effect axis**
  (`lib/research/effect.ts`). No component renders either. Selling them would
  be selling what might be.
- **Completeness.** "Each name at the top of the ranking", not "every name".
  "The filings that can carry", not "all filings".
- **A watchlist shape.** The section says what the desk reads about names the
  tape already chose. It never chooses.

## Held for Commercial

- `float.ts` records that on 58 hand-pulled names the vendor float was
  arithmetically impossible on one name in six. That is a measurement about a
  data source, not an outcome, and it is the strongest sentence available about
  why the desk derives rather than buys. It is NOT on the page. Commercial rules
  whether a published number about a vendor's data is a claim the desk can carry.
- His own line in `whyNot.ts`: *"Research for the avoid. success comes more in
  what you dont trade than what you do."* The report it names is not rendered,
  so the line stays off the page for now. When the report ships, that sentence
  is the section header.

## Card 02 after the section landed

Web found the section and card 02 said the same thing 400px apart. Ruled: the
card loses the shared headline and keeps the one line the section does not say.
Card 02 is now *"IT READS THE FILINGS. YOU DON'T HAVE TO. / Nobody is typing a
ticker into EDGAR at 07:15"*, three sentences, pointing down. The section is the
film; the card is one frame of it, not the trailer.

## Commercial's rulings, `1a7bb66`, applied

- **The one-in-six number: struck**, both as a selected-sample rate dressed as
  a census and as a defect rate published about a third party. It stays in the
  desk's working as design evidence. **The mechanism is cleared** in the float
  module's own words, and is now the fourth reading rule: every float is
  somebody's computation, no filing carries one, the desk checks the float it
  is shown against the filed share count and refuses the one that cannot be
  right. No vendor named or inferable, no rate, and "cannot be right" only
  where float exceeds shares outstanding from one source at one instant.
- **"Research for the avoid": cleared as a claim**, held off the page until the
  Why Not Report renders where a user can see it. Then it is the header.
