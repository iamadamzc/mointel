# The float cell with "more to know": sketch for Commercial, Marketing and his approval (not built)

*Design-tmi, eleventh seat, 2026-10-07. On his question (Web chat, transcript 2fc25a39, 2026-10-07T00:02:35.703Z, relayed and verified by Integration 32nd): a number with a marker that, clicked, lists "the true potential number(s)". Built only on what Research's feasibility allows (`docs/research/float-contract/bounds-feasibility-2026-10-07.md`, b3a7ed20): ONE number, the upper bound under the conventional definition; no lower bound; no probability. Every word below is a PLACEHOLDER for Marketing; every claim is Commercial's to read. Code read at the float tip `0ca637aa` (`lib/dashboard/floatBound.ts`, `lib/research/floatRead.ts`, `components/FloatCell.tsx`).*

## What it must never say

"At least" (no defensible lower bound), "probably" or any likelihood (no measurement), "available to trade" (the number is not a bound under that definition), or a number for a holder we did not subtract presented as if it were subtracted.

## 1. The cell face (both variants)

- Unchanged content: the bound and the filed count's date, `≤ 12.4M  9/22` (his ruling: the date on the face). Unknown, Cannot verify and Not computed keep their faces.
- **The marker.** The faces already open a popover on hover, keyboard focus or click (`FloatCell.tsx` uses the shared `Popover`, `components/Popover.tsx:11`), so the marker signals that more exists behind the number, on every face that opens one. Width is the constraint: the widest bound face measured 79.8 of 86 px of content width (number 46.6 + gap 4 + date 29.2, Geist Mono 11 px, measured 2026-10-05). A glyph such as an "i" in a circle plus its gap needs roughly 10 to 12 px (NOT measured; to measure at the floor before choosing), which the widest faces do not have.
  - **Recommended: a dotted underline under the number** (zero width), the cursor a pointer, the existing 2 px focus ring on keyboard focus, and the accessible name ending "; details on click" (words Marketing). No column width changes.
  - Alternative, if he wants a visible glyph: widen Float by ~12 px, taken from a column that has its own design; not proposed here.

## 2. The click: Variant A, the first cut (no large-holder list)

A panel replacing today's popover paragraphs, about 300 px wide, label and value rows:

| Row | Content (placeholder words) | Source |
| --- | --- | --- |
| Headline | "At most 12.4M shares as of Sep 22, 2026, when the filings line up." | the bound, its date (stored) |
| Definition | One line: float here means shares outstanding less the shares the company's insiders hold (conventional definition) | copy fix, Marketing |
| Filed share count | "13.1M shares, 10-Q, filed Sep 25, 2026" | **NOT ON THE PAYLOAD today** (FloatBound has `countAsOf`, `countFiled`; no shares, no form) |
| Less insiders' holdings | "2 insiders, 700K shares, filed on Sep 18 and Aug 30, 2026", optionally one row per insider with name and shares | **only the count of insiders and the filed dates are on the payload** (`subtractedHolders`, `holdingsFiledOn`); per-holder names and shares are not |
| Not subtracted | One sentence, no numbers: indirect holdings, holders filing jointly, large holders who report on 13D/13G, and owners with no recent filing are not subtracted; each can only make the true figure lower than this number | Research's list (feasibility (b)); claim to Commercial |
| Lined up means | today's v20 paragraph, unchanged | as live |
| Read on | "Filings read on Oct 5, 2026." | `filingsReadOn` |
| Link | "Are float quotes real?" | as live |

Refused faces (Unknown, Cannot verify) keep their one-sentence reason; the panel adds only the definition line and the link.

**Needs, before Variant A can be built:** Research adds to `FloatBound` the filed count's shares and form and, if the per-insider rows are wanted, `{ name, shares, filedOn[] }` per subtracted holder (all already in the stored row's `holdings_json` and count columns, per the feasibility file). Then Design builds the panel from those fields with the same normalizer guards as today.

## 3. The click: Variant B (adds the large holders)

Variant A plus one section after "Less insiders' holdings":

| Row | Content (placeholder words) |
| --- | --- |
| Large holders, not subtracted | per holder: name, reported beneficial total, form (13D or 13G) and filed date |
| Why not subtracted | "Their reported totals can include shares they can acquire but do not yet hold, so they are not subtracted; they may hold more shares out of trading." (Research's reason; WCT went to minus 56.5M when subtracted in the 10-name comparison) |

**Needs:** a Research build (the float job does not fetch 13D/13G at `0ca637aa`; the comparison harness parsed them, so there is a precedent). It shows names and totals of holders we did NOT use in the number, so Commercial must read that it cannot read as a second, smaller float.

## 4. Recommendation

Variant A for the first cut, after the copy fix ships: it answers "what is this number made of" with what is stored, and it carries no figure the desk did not compute. Variant B when Research's 13D/G fetch exists. The marker as a dotted underline, so no column moves. Order: Research's payload fields, Commercial on the claims (definition, "not subtracted" direction sentence, and B's holder list), Marketing's words, his approval, then Design builds and measures at 1,024.
