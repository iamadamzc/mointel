# FINRA Query API: short-interest coverage check

*Ops-tmi (local_d8a2a445), 2026-10-02, read 17:4xZ (13:4x ET). Integration's ask; read-only; his credentials from
.env.local (FINRA_API_CLIENT_ID / FINRA_API_CLIENT_SECRET), values never printed.*

## Answer

**Yes: the API's consolidated short-interest dataset includes Nasdaq-, NYSE- and NYSE American-listed small caps, not
only OTC names.** 49 of the 50 names in today's DAILY board top 50 (rvol_rank 1-50, 2026-10-02) have rows:

| board exchange (universe.exchange) | present | marketClassCode | issuerServicesGroupExchangeCode |
| --- | --- | --- | --- |
| NASDAQ | 36 / 37 | NNM 15, SC 21 | R |
| NYSE | 11 / 11 | NYSE | A |
| AMEX | 2 / 2 | AMEX | B |

**Missing: GOW** (GOWell Energy Technology, NASDAQ in our universe, daily bars since 2025-03-07). The API returned no
rows for it at any date. Not explained; a symbol change is one possibility and was not checked.

**Freshness:** the newest settlement date in the response was **2026-09-15** (cycles seen 08-14, 08-31, 09-15). The
09-30 settlement was not yet present on 2026-10-02. The data is a twice-monthly position with a publication lag, never
today's short interest.

## How it was read

- Token: `POST https://ews.fip.finra.org/fip/rest/ews/oauth2/access_token?grant_type=client_credentials`, Basic auth
  with client id:secret (developer.finra.org/docs). HTTP 200.
- Metadata: `GET https://api.finra.org/metadata/group/otcMarket/name/consolidatedShortInterest`. HTTP 200.
- Data: `POST https://api.finra.org/data/group/otcMarket/name/consolidatedShortInterest`, domainFilters symbolCode in
  the 50 names, settlementDate 2026-08-01..2026-10-02, limit 1000. HTTP 200, 145 rows. One request, plus one for GOW
  alone.
- The board's top 50 and each name's exchange came from production market.db (ticker_session x universe), read-only.

## Field list (metadata, as returned)

| field | type | description (FINRA's) |
| --- | --- | --- |
| accountingYearMonthNumber | Number | Settlement Date for Shorts Cycle in YYYYMMDD format |
| symbolCode | String | securitiesInformationProcessorSymbolIdentifier |
| issueName | String | Name of the Issue |
| issuerServicesGroupExchangeCode | String | The issuer's service group exchange code |
| marketClassCode | String | the market class code |
| currentShortPositionQuantity | Number | Short Position in the current cycle |
| previousShortPositionQuantity | Number | Short Position in the previous cycle |
| stockSplitFlag | String | 'S' if there was a split |
| averageDailyVolumeQuantity | Number | Average Daily Volume Quantity; default 0; excludes non-media trades |
| daysToCoverQuantity | Number | Days to Cover Quantity; default 0 |
| revisionFlag | String | 'R' if the prior cycle's short position was revised, else null |
| changePercent | Number | Percent change, previous unadjusted to current short position |
| changePreviousNumber | Number | Difference, current minus previous unadjusted short position |
| settlementDate | Date | Settlement Date |

## What this does not settle

- The terms questions in docs/commercial/2026-10-02-short-interest-landscape.md section 10 (non-commercial use, the
  exchange-licence question). Coverage is a fact about the data, not a licence to show it.
- Shares short over filed shares outstanding is a lower bound, never "of float" (Research's rule).
