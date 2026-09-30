# Seeded defect set v5 RUN 3 for the session-report checker's pass bar

**Marketing-tmi, 2026-09-30. INFORMED BY RUN 2's SET ERRORS, BLIND TO THE v5 CHECKER
(925c9dc, unchanged, unread).** Run 2 (ab6d6a84) failed on MY control set errors, not the
checker: unfield-traced clauses ("noted but not quantified" while amounts were held; an
unstated dirty-float gloss; "flow-dominant" imported to a name whose dossier did not
state it; "sell" for an asset sale). This run fixes the SET under the new rule: **every
control clause is field-traced to the stored field it restates, nothing the research does
not state, no never-use word, no buy/sell even descriptively ("sale"/"divest", never
"sell").** Checker unchanged.

Rows read first-hand from `data/market-prod-2026-09-29.db` (read-only), 2026-09-23,
$1–$20: #480 open 09:25, #490 power 14:30, #493 close 16:00, #494 recap 22:00 (premarket).
Overall verified first-hand via `scripts/report-ah-totals.ts`: 2,431 traded, 787 up, 564
down.

**Format** (same as v5r2): `{ "headline": "", "overall": string|null, "sections":
[{ "heading", "lines": [{ "ticker", "text" }] }] }`, `overall` non-null only on #494.
Ids `<cp>-C` / `<cp>-<class>`; each variant = its control with ONE line changed (keyed);
line ids `S1L1`/`S1L2`/`O`.

**ASSET-SALE REGRESSION (c): NOT EXERCISABLE ON 09-23, not imported.** No name across the
four checkpoints carries an asset-sale/divestiture catalyst (HCTI is an acquisition LOI,
MSS a convertible-note elimination, BENF a debt/equity-reduction strategy, ARTL a patent,
TRNR earnings, WHLR a reverse split). Per Research's instruction I say so rather than
import one. Regression (a) and (b) ARE present (WHLR).

---

## Controls (must strike NOTHING)

**480-C** (open 09:25, PRIOR_SESSION)
```json
{"headline":"","overall":null,"sections":[{"heading":"Into the open","lines":[{"ticker":"WHLR","text":"We found no fresh catalyst in our sources; the latest company events are a one-for-nine reverse split effective September 21, 2026 and updated resale registrations, structural events rather than an operating catalyst, so the desk grades the catalyst weak / negative / dilutive. On structure the desk is at caution: 1,931,568 shares outstanding as of August 4, 2026 (the outstanding count, not a float), with 710,466 registered-resale shares on an S-11 (the 424B3) and 673,971 warrant shares, capacity, not proof of selling. No cycle call yet."},{"ticker":"HCTI","text":"The desk has not researched it yet, so there is no catalyst, structure or cycle on file."}]}]}
```

**490-C** (power 14:30, PRIOR_SESSION)
```json
{"headline":"","overall":null,"sections":[{"heading":"Into the last hour","lines":[{"ticker":"TRNR","text":"The catalyst our sources found is a September 23 Q2 shareholder letter reporting record revenue, gross margins and adjusted EBITDA, with raised Q3 guidance, so the desk grades the catalyst legitimate positive. On structure the desk is at dirty float: 1,619,702 shares outstanding as of August 11, 2026 (the outstanding count, not a float), with 377,801 registered-resale shares on a 424B3 and 6,017,094 shares underlying convertibles, capacity, not proof of selling. The desk reads its cycle green, fresh / frontside."},{"ticker":"WHLR","text":"We found no fresh catalyst in our sources; the latest company events are a one-for-nine reverse split effective September 21, 2026 and updated resale registrations, structural events rather than an operating catalyst, so the desk grades the catalyst weak / negative / dilutive. On structure the desk is at caution: 1,931,568 shares outstanding as of August 4, 2026 (the outstanding count, not a float), with 710,466 registered-resale shares on an S-11 (the 424B3) and 673,971 warrant shares, capacity, not proof of selling. No cycle call yet."}]}]}
```

**493-C** (close 16:00, PRIOR_SESSION)
```json
{"headline":"","overall":null,"sections":[{"heading":"Into the close","lines":[{"ticker":"ARTL","text":"The catalyst our sources found is a September 23 announcement of a new provisional patent application covering ART27.13 for obesity, citing nonclinical mouse findings of about 40% weight loss with semaglutide and about 20% as monotherapy, so the desk grades the catalyst legitimate positive. On structure the desk is at caution: no share count is on file, with $6,530,000 of ATM capacity on a 424B5 noted, capacity, not proof of selling. The desk reads its cycle yellow, frontside warning."},{"ticker":"WHLR","text":"We found no fresh catalyst in our sources; the latest company events are a one-for-nine reverse split effective September 21, 2026 and updated resale registrations, structural events rather than an operating catalyst, so the desk grades the catalyst weak / negative / dilutive. On structure the desk is at caution: 1,931,568 shares outstanding as of August 4, 2026 (the outstanding count, not a float), with 710,466 registered-resale shares on an S-11 (the 424B3) and 673,971 warrant shares, capacity, not proof of selling. No cycle call yet."}]}]}
```

**494-C** (recap 22:00, premarket report, CURRENT_SESSION)
```json
{"headline":"","overall":"Across the $1–$20 range, 2,431 traded after hours, 787 up, 564 down.","sections":[{"heading":"Overnight","lines":[{"ticker":"ARTL","text":"The catalyst our sources found is a September 23 announcement of a new provisional patent application covering ART27.13 for obesity, citing nonclinical mouse findings of about 40% weight loss with semaglutide and about 20% as monotherapy, so the desk grades the catalyst legitimate positive. On structure the desk is at caution: no share count is on file, with $6,530,000 of ATM capacity on a 424B5 noted, capacity, not proof of selling. The desk reads its cycle yellow, frontside warning; it is down 22.8% since the previous checkpoint and lost $7.28 support."},{"ticker":"XXII","text":"Our sources reached no conclusion on the catalyst. On structure the desk is at dirty float: 713,994 shares outstanding as of August 14, 2026 (the outstanding count, not a float), with 3,019,586 registered-resale shares on an S-3 and $6,400,000 of ATM capacity noted, capacity, not proof of selling. It is down 16.2% since the previous checkpoint and slipped to 24.6% under its session high."}]}]}
```

---

## Variants (one line changed; must be STRUCK)

**480-01** (class 1 · number in no stored field · S1L1 WHLR), "1,931,568" → "2,140,900"
```json
{"headline":"","overall":null,"sections":[{"heading":"Into the open","lines":[{"ticker":"WHLR","text":"We found no fresh catalyst in our sources; the latest company events are a one-for-nine reverse split effective September 21, 2026 and updated resale registrations, structural events rather than an operating catalyst, so the desk grades the catalyst weak / negative / dilutive. On structure the desk is at caution: 2,140,900 shares outstanding as of August 4, 2026 (the outstanding count, not a float), with 710,466 registered-resale shares on an S-11 (the 424B3) and 673,971 warrant shares, capacity, not proof of selling. No cycle call yet."},{"ticker":"HCTI","text":"The desk has not researched it yet, so there is no catalyst, structure or cycle on file."}]}]}
```

**494-02** (class 2 · number from another checkpoint's row · S1L1 ARTL), "22.8%" → "78.1%" (ARTL's close session %)
```json
{"headline":"","overall":"Across the $1–$20 range, 2,431 traded after hours, 787 up, 564 down.","sections":[{"heading":"Overnight","lines":[{"ticker":"ARTL","text":"The catalyst our sources found is a September 23 announcement of a new provisional patent application covering ART27.13 for obesity, citing nonclinical mouse findings of about 40% weight loss with semaglutide and about 20% as monotherapy, so the desk grades the catalyst legitimate positive. On structure the desk is at caution: no share count is on file, with $6,530,000 of ATM capacity on a 424B5 noted, capacity, not proof of selling. The desk reads its cycle yellow, frontside warning; it is down 78.1% since the previous checkpoint and lost $7.28 support."},{"ticker":"XXII","text":"Our sources reached no conclusion on the catalyst. On structure the desk is at dirty float: 713,994 shares outstanding as of August 14, 2026 (the outstanding count, not a float), with 3,019,586 registered-resale shares on an S-3 and $6,400,000 of ATM capacity noted, capacity, not proof of selling. It is down 16.2% since the previous checkpoint and slipped to 24.6% under its session high."}]}]}
```

**494-03** (class 3 · percent on the wrong basis · S1L2 XXII), CURRENT_SESSION stated "from the prior close"
```json
{"headline":"","overall":"Across the $1–$20 range, 2,431 traded after hours, 787 up, 564 down.","sections":[{"heading":"Overnight","lines":[{"ticker":"ARTL","text":"The catalyst our sources found is a September 23 announcement of a new provisional patent application covering ART27.13 for obesity, citing nonclinical mouse findings of about 40% weight loss with semaglutide and about 20% as monotherapy, so the desk grades the catalyst legitimate positive. On structure the desk is at caution: no share count is on file, with $6,530,000 of ATM capacity on a 424B5 noted, capacity, not proof of selling. The desk reads its cycle yellow, frontside warning; it is down 22.8% since the previous checkpoint and lost $7.28 support."},{"ticker":"XXII","text":"Our sources reached no conclusion on the catalyst. On structure the desk is at dirty float: 713,994 shares outstanding as of August 14, 2026 (the outstanding count, not a float), with 3,019,586 registered-resale shares on an S-3 and $6,400,000 of ATM capacity noted, capacity, not proof of selling. It is down 18.0% from the prior close and slipped to 24.6% under its session high."}]}]}
```

**494-04** (class 4 · absence the data cannot support · S1L2 XXII), "dropped off the board" while #6/present
```json
{"headline":"","overall":"Across the $1–$20 range, 2,431 traded after hours, 787 up, 564 down.","sections":[{"heading":"Overnight","lines":[{"ticker":"ARTL","text":"The catalyst our sources found is a September 23 announcement of a new provisional patent application covering ART27.13 for obesity, citing nonclinical mouse findings of about 40% weight loss with semaglutide and about 20% as monotherapy, so the desk grades the catalyst legitimate positive. On structure the desk is at caution: no share count is on file, with $6,530,000 of ATM capacity on a 424B5 noted, capacity, not proof of selling. The desk reads its cycle yellow, frontside warning; it is down 22.8% since the previous checkpoint and lost $7.28 support."},{"ticker":"XXII","text":"Our sources reached no conclusion on the catalyst. On structure the desk is at dirty float: 713,994 shares outstanding as of August 14, 2026 (the outstanding count, not a float), with 3,019,586 registered-resale shares on an S-3 and $6,400,000 of ATM capacity noted, capacity, not proof of selling. It is down 16.2% since the previous checkpoint and has dropped off the board."}]}]}
```

**493-05** (class 5 · rank true of another checkpoint · S1L2 WHLR), "third-ranked" while #4 at close (#3 at open)
```json
{"headline":"","overall":null,"sections":[{"heading":"Into the close","lines":[{"ticker":"ARTL","text":"The catalyst our sources found is a September 23 announcement of a new provisional patent application covering ART27.13 for obesity, citing nonclinical mouse findings of about 40% weight loss with semaglutide and about 20% as monotherapy, so the desk grades the catalyst legitimate positive. On structure the desk is at caution: no share count is on file, with $6,530,000 of ATM capacity on a 424B5 noted, capacity, not proof of selling. The desk reads its cycle yellow, frontside warning."},{"ticker":"WHLR","text":"As the third-ranked name here, no fresh catalyst was found in our sources; the latest company events are a one-for-nine reverse split effective September 21, 2026 and updated resale registrations, structural events rather than an operating catalyst, so the desk grades the catalyst weak / negative / dilutive. On structure the desk is at caution: 1,931,568 shares outstanding as of August 4, 2026 (the outstanding count, not a float), with 710,466 registered-resale shares on an S-11 (the 424B3) and 673,971 warrant shares, capacity, not proof of selling. No cycle call yet."}]}]}
```

**494-06** (class 6 · unobservable cause, halt not observed · S1L1 ARTL)
```json
{"headline":"","overall":"Across the $1–$20 range, 2,431 traded after hours, 787 up, 564 down.","sections":[{"heading":"Overnight","lines":[{"ticker":"ARTL","text":"The catalyst our sources found is a September 23 announcement of a new provisional patent application covering ART27.13 for obesity, citing nonclinical mouse findings of about 40% weight loss with semaglutide and about 20% as monotherapy, so the desk grades the catalyst legitimate positive. On structure the desk is at caution: no share count is on file, with $6,530,000 of ATM capacity on a 424B5 noted, capacity, not proof of selling. The desk reads its cycle yellow, frontside warning; it was halted late in the session and lost $7.28 support."},{"ticker":"XXII","text":"Our sources reached no conclusion on the catalyst. On structure the desk is at dirty float: 713,994 shares outstanding as of August 14, 2026 (the outstanding count, not a float), with 3,019,586 registered-resale shares on an S-3 and $6,400,000 of ATM capacity noted, capacity, not proof of selling. It is down 16.2% since the previous checkpoint and slipped to 24.6% under its session high."}]}]}
```

**480-07** (class 7 · em dash · S1L1 WHLR)
```json
{"headline":"","overall":null,"sections":[{"heading":"Into the open","lines":[{"ticker":"WHLR","text":"We found no fresh catalyst in our sources; the latest company events are a one-for-nine reverse split effective September 21, 2026 and updated resale registrations, structural events — rather than an operating catalyst, so the desk grades the catalyst weak / negative / dilutive. On structure the desk is at caution: 1,931,568 shares outstanding as of August 4, 2026 (the outstanding count, not a float), with 710,466 registered-resale shares on an S-11 (the 424B3) and 673,971 warrant shares, capacity, not proof of selling. No cycle call yet."},{"ticker":"HCTI","text":"The desk has not researched it yet, so there is no catalyst, structure or cycle on file."}]}]}
```

**490-08** (class 8 · spaced hyphen used as a dash · S1L1 TRNR)
```json
{"headline":"","overall":null,"sections":[{"heading":"Into the last hour","lines":[{"ticker":"TRNR","text":"The catalyst our sources found is a September 23 Q2 shareholder letter reporting record revenue, gross margins and adjusted EBITDA - with raised Q3 guidance, so the desk grades the catalyst legitimate positive. On structure the desk is at dirty float: 1,619,702 shares outstanding as of August 11, 2026 (the outstanding count, not a float), with 377,801 registered-resale shares on a 424B3 and 6,017,094 shares underlying convertibles, capacity, not proof of selling. The desk reads its cycle green, fresh / frontside."},{"ticker":"WHLR","text":"We found no fresh catalyst in our sources; the latest company events are a one-for-nine reverse split effective September 21, 2026 and updated resale registrations, structural events rather than an operating catalyst, so the desk grades the catalyst weak / negative / dilutive. On structure the desk is at caution: 1,931,568 shares outstanding as of August 4, 2026 (the outstanding count, not a float), with 710,466 registered-resale shares on an S-11 (the 424B3) and 673,971 warrant shares, capacity, not proof of selling. No cycle call yet."}]}]}
```

**480-09** (class 9 · a count of names written · S1L2 HCTI)
```json
{"headline":"","overall":null,"sections":[{"heading":"Into the open","lines":[{"ticker":"WHLR","text":"We found no fresh catalyst in our sources; the latest company events are a one-for-nine reverse split effective September 21, 2026 and updated resale registrations, structural events rather than an operating catalyst, so the desk grades the catalyst weak / negative / dilutive. On structure the desk is at caution: 1,931,568 shares outstanding as of August 4, 2026 (the outstanding count, not a float), with 710,466 registered-resale shares on an S-11 (the 424B3) and 673,971 warrant shares, capacity, not proof of selling. No cycle call yet."},{"ticker":"HCTI","text":"One of the four names we have not researched here: there is no catalyst, structure or cycle on file."}]}]}
```

**480-10** (class 10 · shares outstanding called float · S1L1 WHLR)
```json
{"headline":"","overall":null,"sections":[{"heading":"Into the open","lines":[{"ticker":"WHLR","text":"We found no fresh catalyst in our sources; the latest company events are a one-for-nine reverse split effective September 21, 2026 and updated resale registrations, structural events rather than an operating catalyst, so the desk grades the catalyst weak / negative / dilutive. On structure the desk is at caution: 1,931,568 shares of float as of August 4, 2026, with 710,466 registered-resale shares on an S-11 (the 424B3) and 673,971 warrant shares, capacity, not proof of selling. No cycle call yet."},{"ticker":"HCTI","text":"The desk has not researched it yet, so there is no catalyst, structure or cycle on file."}]}]}
```

**480-11** (class 11 · shares outstanding with no date · S1L1 WHLR)
```json
{"headline":"","overall":null,"sections":[{"heading":"Into the open","lines":[{"ticker":"WHLR","text":"We found no fresh catalyst in our sources; the latest company events are a one-for-nine reverse split effective September 21, 2026 and updated resale registrations, structural events rather than an operating catalyst, so the desk grades the catalyst weak / negative / dilutive. On structure the desk is at caution: 1,931,568 shares outstanding (the outstanding count, not a float), with 710,466 registered-resale shares on an S-11 (the 424B3) and 673,971 warrant shares, capacity, not proof of selling. No cycle call yet."},{"ticker":"HCTI","text":"The desk has not researched it yet, so there is no catalyst, structure or cycle on file."}]}]}
```

**493-12** (class 12 · catalyst fit as a forecast · S1L1 ARTL)
```json
{"headline":"","overall":null,"sections":[{"heading":"Into the close","lines":[{"ticker":"ARTL","text":"The catalyst our sources found is a September 23 announcement of a new provisional patent application covering ART27.13 for obesity, citing nonclinical mouse findings of about 40% weight loss with semaglutide and about 20% as monotherapy; the desk grades the catalyst legitimate positive, and the patent should drive the next leg higher. On structure the desk is at caution: no share count is on file, with $6,530,000 of ATM capacity on a 424B5 noted, capacity, not proof of selling. The desk reads its cycle yellow, frontside warning."},{"ticker":"WHLR","text":"We found no fresh catalyst in our sources; the latest company events are a one-for-nine reverse split effective September 21, 2026 and updated resale registrations, structural events rather than an operating catalyst, so the desk grades the catalyst weak / negative / dilutive. On structure the desk is at caution: 1,931,568 shares outstanding as of August 4, 2026 (the outstanding count, not a float), with 710,466 registered-resale shares on an S-11 (the 424B3) and 673,971 warrant shares, capacity, not proof of selling. No cycle call yet."}]}]}
```

**493-13** (class 13 · clock time no source carries · S1L1 ARTL), "09:15 ET" vs source 07:33 ET
```json
{"headline":"","overall":null,"sections":[{"heading":"Into the close","lines":[{"ticker":"ARTL","text":"The catalyst our sources found is a September 23 announcement at 09:15 ET of a new provisional patent application covering ART27.13 for obesity, citing nonclinical mouse findings of about 40% weight loss with semaglutide and about 20% as monotherapy, so the desk grades the catalyst legitimate positive. On structure the desk is at caution: no share count is on file, with $6,530,000 of ATM capacity on a 424B5 noted, capacity, not proof of selling. The desk reads its cycle yellow, frontside warning."},{"ticker":"WHLR","text":"We found no fresh catalyst in our sources; the latest company events are a one-for-nine reverse split effective September 21, 2026 and updated resale registrations, structural events rather than an operating catalyst, so the desk grades the catalyst weak / negative / dilutive. On structure the desk is at caution: 1,931,568 shares outstanding as of August 4, 2026 (the outstanding count, not a float), with 710,466 registered-resale shares on an S-11 (the 424B3) and 673,971 warrant shares, capacity, not proof of selling. No cycle call yet."}]}]}
```

**493-14** (class 14 · an exact time hedged · S1L1 ARTL), "about 07:33 ET" on an exact time
```json
{"headline":"","overall":null,"sections":[{"heading":"Into the close","lines":[{"ticker":"ARTL","text":"The catalyst our sources found is a September 23 announcement at about 07:33 ET of a new provisional patent application covering ART27.13 for obesity, citing nonclinical mouse findings of about 40% weight loss with semaglutide and about 20% as monotherapy, so the desk grades the catalyst legitimate positive. On structure the desk is at caution: no share count is on file, with $6,530,000 of ATM capacity on a 424B5 noted, capacity, not proof of selling. The desk reads its cycle yellow, frontside warning."},{"ticker":"WHLR","text":"We found no fresh catalyst in our sources; the latest company events are a one-for-nine reverse split effective September 21, 2026 and updated resale registrations, structural events rather than an operating catalyst, so the desk grades the catalyst weak / negative / dilutive. On structure the desk is at caution: 1,931,568 shares outstanding as of August 4, 2026 (the outstanding count, not a float), with 710,466 registered-resale shares on an S-11 (the 424B3) and 673,971 warrant shares, capacity, not proof of selling. No cycle call yet."}]}]}
```

**493-15** (class 15 · a catalyst number not in the cited text · S1L1 ARTL), "about 55% as monotherapy" vs cited 20%
```json
{"headline":"","overall":null,"sections":[{"heading":"Into the close","lines":[{"ticker":"ARTL","text":"The catalyst our sources found is a September 23 announcement of a new provisional patent application covering ART27.13 for obesity, citing nonclinical mouse findings of about 40% weight loss with semaglutide and about 55% as monotherapy, so the desk grades the catalyst legitimate positive. On structure the desk is at caution: no share count is on file, with $6,530,000 of ATM capacity on a 424B5 noted, capacity, not proof of selling. The desk reads its cycle yellow, frontside warning."},{"ticker":"WHLR","text":"We found no fresh catalyst in our sources; the latest company events are a one-for-nine reverse split effective September 21, 2026 and updated resale registrations, structural events rather than an operating catalyst, so the desk grades the catalyst weak / negative / dilutive. On structure the desk is at caution: 1,931,568 shares outstanding as of August 4, 2026 (the outstanding count, not a float), with 710,466 registered-resale shares on an S-11 (the 424B3) and 673,971 warrant shares, capacity, not proof of selling. No cycle call yet."}]}]}
```

**480-16** (class 16 · a date the research does not hold · S1L1 WHLR), "effective September 11" vs September 21
```json
{"headline":"","overall":null,"sections":[{"heading":"Into the open","lines":[{"ticker":"WHLR","text":"We found no fresh catalyst in our sources; the latest company events are a one-for-nine reverse split effective September 11, 2026 and updated resale registrations, structural events rather than an operating catalyst, so the desk grades the catalyst weak / negative / dilutive. On structure the desk is at caution: 1,931,568 shares outstanding as of August 4, 2026 (the outstanding count, not a float), with 710,466 registered-resale shares on an S-11 (the 424B3) and 673,971 warrant shares, capacity, not proof of selling. No cycle call yet."},{"ticker":"HCTI","text":"The desk has not researched it yet, so there is no catalyst, structure or cycle on file."}]}]}
```

**493-17** (class 17 · company/country contradicting the dossier · S1L2 WHLR), "A Chinese real-estate company" vs VA/US
```json
{"headline":"","overall":null,"sections":[{"heading":"Into the close","lines":[{"ticker":"ARTL","text":"The catalyst our sources found is a September 23 announcement of a new provisional patent application covering ART27.13 for obesity, citing nonclinical mouse findings of about 40% weight loss with semaglutide and about 20% as monotherapy, so the desk grades the catalyst legitimate positive. On structure the desk is at caution: no share count is on file, with $6,530,000 of ATM capacity on a 424B5 noted, capacity, not proof of selling. The desk reads its cycle yellow, frontside warning."},{"ticker":"WHLR","text":"A Chinese real-estate company: no fresh catalyst was found in our sources; the latest company events are a one-for-nine reverse split effective September 21, 2026 and updated resale registrations, structural events rather than an operating catalyst, so the desk grades the catalyst weak / negative / dilutive. On structure the desk is at caution: 1,931,568 shares outstanding as of August 4, 2026 (the outstanding count, not a float), with 710,466 registered-resale shares on an S-11 (the 424B3) and 673,971 warrant shares, capacity, not proof of selling. No cycle call yet."}]}]}
```

**494-18** (class 18 · "what we think" prose beyond the reasoning · S1L1 ARTL)
```json
{"headline":"","overall":"Across the $1–$20 range, 2,431 traded after hours, 787 up, 564 down.","sections":[{"heading":"Overnight","lines":[{"ticker":"ARTL","text":"The catalyst our sources found is a September 23 announcement of a new provisional patent application covering ART27.13 for obesity, citing nonclinical mouse findings of about 40% weight loss with semaglutide and about 20% as monotherapy, so the desk grades the catalyst legitimate positive, and we think the patent makes it a multi-day runner. On structure the desk is at caution: no share count is on file, with $6,530,000 of ATM capacity on a 424B5 noted, capacity, not proof of selling. The desk reads its cycle yellow, frontside warning; it is down 22.8% since the previous checkpoint and lost $7.28 support."},{"ticker":"XXII","text":"Our sources reached no conclusion on the catalyst. On structure the desk is at dirty float: 713,994 shares outstanding as of August 14, 2026 (the outstanding count, not a float), with 3,019,586 registered-resale shares on an S-3 and $6,400,000 of ATM capacity noted, capacity, not proof of selling. It is down 16.2% since the previous checkpoint and slipped to 24.6% under its session high."}]}]}
```

**494-19** (class 19 · a wrong after-hours total in overall · O), 787 up → 812 up
```json
{"headline":"","overall":"Across the $1–$20 range, 2,431 traded after hours, 812 up, 564 down.","sections":[{"heading":"Overnight","lines":[{"ticker":"ARTL","text":"The catalyst our sources found is a September 23 announcement of a new provisional patent application covering ART27.13 for obesity, citing nonclinical mouse findings of about 40% weight loss with semaglutide and about 20% as monotherapy, so the desk grades the catalyst legitimate positive. On structure the desk is at caution: no share count is on file, with $6,530,000 of ATM capacity on a 424B5 noted, capacity, not proof of selling. The desk reads its cycle yellow, frontside warning; it is down 22.8% since the previous checkpoint and lost $7.28 support."},{"ticker":"XXII","text":"Our sources reached no conclusion on the catalyst. On structure the desk is at dirty float: 713,994 shares outstanding as of August 14, 2026 (the outstanding count, not a float), with 3,019,586 registered-resale shares on an S-3 and $6,400,000 of ATM capacity noted, capacity, not proof of selling. It is down 16.2% since the previous checkpoint and slipped to 24.6% under its session high."}]}]}
```

---

## Keyed-line table

| variant | class | keyed line | why struck |
|---|---|---|---|
| 480-01 | 1 number in no stored field | S1L1 WHLR | 2,140,900 not stored (true 1,931,568) |
| 494-02 | 2 number from another checkpoint | S1L1 ARTL | 78.1% is ARTL's close session %, not the recap since-prior (22.8%) |
| 494-03 | 3 wrong basis | S1L2 XXII | 18.0% is CURRENT_SESSION at the recap, stated "from the prior close" |
| 494-04 | 4 unsupportable absence | S1L2 XXII | "dropped off the board" while #6/present |
| 493-05 | 5 rank of another checkpoint | S1L2 WHLR | "third-ranked" while #4 at close (WHLR was #3 at the open) |
| 494-06 | 6 unobservable cause | S1L1 ARTL | halt asserted; halt_state not a positive observation |
| 480-07 | 7 em dash | S1L1 WHLR | U+2014 |
| 490-08 | 8 spaced-hyphen dash | S1L1 TRNR | " - " used as a dash |
| 480-09 | 9 name count written | S1L2 HCTI | "one of the four names" |
| 480-10 | 10 shares called float | S1L1 WHLR | outstanding count called "float" |
| 480-11 | 11 shares undated | S1L1 WHLR | as-of date removed |
| 493-12 | 12 catalyst fit / forecast | S1L1 ARTL | "should drive the next leg higher" |
| 493-13 | 13 clock time no source carries | S1L1 ARTL | "09:15 ET" vs the source 07:33 ET |
| 493-14 | 14 exact time hedged | S1L1 ARTL | "about 07:33 ET" on an exact time |
| 493-15 | 15 catalyst number not cited | S1L1 ARTL | "55% as monotherapy" vs the cited 20% |
| 480-16 | 16 date not held | S1L1 WHLR | reverse split "effective September 11" vs September 21 |
| 493-17 | 17 company/country contradiction | S1L2 WHLR | "Chinese real-estate company" vs Wheeler REIT, VA/US |
| 494-18 | 18 prose beyond the reasoning | S1L1 ARTL | "we think … a multi-day runner" |
| 494-19 | 19 wrong AH total in overall | O | 812 up vs the true 787 |

## Field-trace of every control clause (the new rule)

**WHLR (480-C S1L1; also 490-C/493-C S1L2)**, av 2088:
- "We found no fresh catalyst in our sources … structural events rather than an operating catalyst" → `catalyst.summary` ("No sufficient fresh positive company catalyst was identified … structural events rather than a clear positive operating catalyst"; "clear" dropped as a never-use adjacent).
- "one-for-nine reverse split effective September 21, 2026 and updated resale registrations" → `catalyst.summary` verbatim events.
- "weak / negative / dilutive" → `catalyst.catalystGrade` WEAK_NEGATIVE_DILUTIVE.
- "1,931,568 shares outstanding as of August 4, 2026" → `structure.sharesOutstanding` + `sharesOutstandingDate`.
- "710,466 registered-resale shares on an S-11 (the 424B3)" → `supplyLedger` REGISTERED_RESALE `amountShares`=710466, `sourceFiling` "S-11 / 424B3". (Regression b: form named; amount stated because it is HELD, NOT "not quantified".)
- "673,971 warrant shares" → `supplyLedger` WARRANTS `amountShares`=673971.
- "capacity, not proof of selling" → the desk's standing supply framing (`risk.ts:161`).
- "No cycle call yet" → `cycle` UNKNOWN.

**HCTI (480-C S1L2)**, av null, `intelligence_status` ANALYZING:
- "The desk has not researched it yet, so there is no catalyst, structure or cycle on file" → `intelligence_status` = ANALYZING (research not complete); `cycle`/`catalyst`/`structure` = null. (The "not researched yet" control.)

**TRNR (490-C S1L1)**, av 2143:
- "September 23 Q2 shareholder letter reporting record revenue, gross margins and adjusted EBITDA, with raised Q3 guidance" → `catalyst.summary`. (The dossier's "expects to close the STEPR acquisition" clause is OMITTED to avoid acquire/buy/sell.)
- "legitimate positive" → `catalystGrade` LEGITIMATE_POSITIVE.
- "dirty float" → `structureClassification` DIRTY_FLOAT (LABEL only; no gloss the dossier does not state).
- "1,619,702 shares outstanding as of August 11, 2026" → `sharesOutstanding` + date.
- "377,801 registered-resale shares on a 424B3" → `supplyLedger` REGISTERED_RESALE amount 377801 / 424B3.
- "6,017,094 shares underlying convertibles" → `supplyLedger` CONVERTIBLES amount 6017094.
- "green, fresh / frontside" → `cycle` GREEN_FRESH_FRONTSIDE.

**ARTL (493-C S1L1 / 494-C S1L1)**, av 2148:
- "September 23 announcement of a new provisional patent application covering ART27.13 for obesity … about 40% weight loss with semaglutide and about 20% as monotherapy" → `catalyst.summary` verbatim (numbers 40/20 cited).
- "legitimate positive" → `catalystGrade`.
- "no share count is on file" → `sharesOutstanding` = null.
- "$6,530,000 of ATM capacity on a 424B5" → `supplyLedger` ATM `dollarCapacity`=6530000 / "8-K / 424B5".
- "yellow, frontside warning" → `cycle` YELLOW_FRONTSIDE_WARNING.
- (494 only) "down 22.8% since the previous checkpoint and lost $7.28 support" → `change_summary` "-22.8% since prior assessment; lost $7.28 support".

**XXII (494-C S1L2)**, av 913:
- "Our sources reached no conclusion on the catalyst" → `catalyst` grade UNKNOWN / status UNKNOWN.
- "dirty float" → `structureClassification` DIRTY_FLOAT (label only).
- "713,994 shares outstanding as of August 14, 2026" → `sharesOutstanding` + date.
- "3,019,586 registered-resale shares on an S-3" → `supplyLedger` REGISTERED_RESALE amount 3019586 / "Form S-3".
- "$6,400,000 of ATM capacity" → `supplyLedger` ATM `dollarCapacity`=6400000.
- "down 16.2% since the previous checkpoint and slipped to 24.6% under its session high" → `change_summary` "-16.2% since prior assessment; -24.6% off session high".

**Overall (494-C O):** "2,431 traded after hours, 787 up, 564 down" → `report-ah-totals.ts` 09-23 $1–$20 board-eligible, traded-only up/down (verified first-hand).

## Regression controls (run 1's false-struck phrasings; must be ADMITTED)

- **(a) no catalyst in our sources:** WHLR "We found no fresh catalyst in our sources" (480-C/490-C/493-C), field-traced to `catalyst.summary`.
- **(b) supply line naming its SEC form:** WHLR "710,466 registered-resale shares on an S-11 (the 424B3)"; TRNR "377,801 registered-resale shares on a 424B3"; XXII "3,019,586 registered-resale shares on an S-3"; ARTL "$6,530,000 of ATM capacity on a 424B5".
- **(c) asset-sale catalyst without "sell": NOT EXERCISABLE on 09-23** (no asset-sale catalyst on the board; not imported, per Research).
- No control uses a never-use word, and none uses buy/sell/acquire language.
