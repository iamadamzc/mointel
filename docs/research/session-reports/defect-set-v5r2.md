# Seeded defect set v5 RUN 2 for the session-report checker's pass bar

**Marketing-tmi, 2026-09-30. INFORMED BY RUN 1's FAILING PHRASING CLASSES, BLIND TO THE
v5 CHECKER AND ITS FIX.** Run 1 (set cd8052b9) failed as registered: 19/19 defects
caught in all 3 runs, failures only on control lines (checker too narrow). This is a
FRESH set from a different day (2026-09-25, not 09-24), same 19 classes, same file
format, with run 1's wrongly-struck phrasings carried as keyed REGRESSION controls. I
have not read the checker or its fix.

Rows read first-hand from `data/market-prod-2026-09-29.db` (read-only), 2026-09-25,
$1–$20: #518 open 09:25, #528 power 14:30, #531 close 16:00, #532 recap 22:00 (premarket).

**Format:** `{ "headline": "", "overall": string|null, "sections": [{ "heading",
"lines": [{ "ticker", "text" }] }] }`, `overall` non-null only on #532. Ids: `<cp>-C`
control, `<cp>-<class>` variant. Each variant = its control with ONE line changed
(keyed); a correct checker strikes that one line and nothing else. Controls strike
nothing. Line ids `S1L1`/`S1L2`/`O`. Every control obeys the full voice never-use list
(the run-1 "clearly" slip is scrubbed; Integration ruled that strike CORRECT).

The premarket `overall` uses the 09-25 board-eligible AH totals, computed first-hand via
`scripts/report-ah-totals.ts`: 2,463 traded, 690 up, 547 down.

---

## Controls (must strike NOTHING)

**518-C** (open 09:25, PRIOR_SESSION)
```json
{"headline":"","overall":null,"sections":[{"heading":"Into the open","lines":[{"ticker":"MGLD","text":"The catalyst our sources found is a September 24 Form 8-K (the EX-99.1 exhibit) disclosing a definitive agreement for the Gourmet Foods subsidiary to sell substantially all of the Printstock Products assets to TAG Investments in a cash sale, so the desk grades the catalyst legitimate positive. On structure the desk is at caution: 42,712,250 shares outstanding as of June 30, 2026 (the outstanding count, not a float), with shelf capacity on an S-3 and an ATM 424B5 noted but not quantified, capacity, not proof of selling. The desk reads its cycle green, fresh / frontside."},{"ticker":"AIFF","text":"The catalyst our sources found is a September 17 announcement that the Evoke platform was selected to integrate with Radial's AI-native operating system for brain medicine, so the desk grades the catalyst legitimate positive. On structure the desk is at dirty float: the displayed float understates the shares that can reach the market, with registered-resale and warrant capacity on an effective S-3 (the 424B3 under Registration No. 333-296046) noted but not quantified, capacity, not proof of selling. 15,690,316 shares outstanding as of August 4, 2026 (the outstanding count, not a float). No cycle call yet."}]}]}
```

**528-C** (power 14:30, PRIOR_SESSION)
```json
{"headline":"","overall":null,"sections":[{"heading":"Into the last hour","lines":[{"ticker":"ELPW","text":"We found no catalyst in our sources; the recent filings concern registration, resale and financing rather than a fresh positive event, so the move looks flow-dominant. On structure the desk is at caution: the float is not established, with a recent offering on a 6-K filed August 4, 2026 and registered-resale on an F-1 (the 424B3, File No. 333-298531) noted but not quantified, capacity, not proof of selling. No cycle call yet."},{"ticker":"MGLD","text":"The catalyst our sources found is a September 24 Form 8-K (the EX-99.1 exhibit) disclosing a definitive agreement for the Gourmet Foods subsidiary to sell substantially all of the Printstock Products assets to TAG Investments in a cash sale, so the desk grades the catalyst legitimate positive. On structure the desk is at caution: 42,712,250 shares outstanding as of June 30, 2026 (the outstanding count, not a float), with shelf capacity on an S-3 and an ATM 424B5 noted but not quantified, capacity, not proof of selling. The desk reads its cycle green, fresh / frontside."}]}]}
```

**531-C** (close 16:00, PRIOR_SESSION)
```json
{"headline":"","overall":null,"sections":[{"heading":"Into the close","lines":[{"ticker":"MSGY","text":"The catalyst our sources found is a September 24 Form 6-K disclosing that CEO and director Tsz Tun Tse resigned for personal reasons, with no disagreement with the company, and that Jinyu Xie was redesignated CEO, a governance change rather than an operating development, so the desk grades the catalyst moderate / mixed / secondary. On structure the desk is at caution: 16,957,000 shares outstanding as of March 31, 2026 (the outstanding count, not a float), with acquisition shares on a 6-K filed August 13, 2026 and registered-resale on an F-1 noted but not quantified, capacity, not proof of selling. The desk reads its cycle green, fresh / frontside, and it is up 13.6% since the previous checkpoint."},{"ticker":"MGLD","text":"The catalyst our sources found is a September 24 Form 8-K (the EX-99.1 exhibit) disclosing a definitive agreement for the Gourmet Foods subsidiary to sell substantially all of the Printstock Products assets to TAG Investments in a cash sale, so the desk grades the catalyst legitimate positive. On structure the desk is at caution: 42,712,250 shares outstanding as of June 30, 2026 (the outstanding count, not a float), with shelf capacity on an S-3 and an ATM 424B5 noted but not quantified, capacity, not proof of selling. The desk reads its cycle green, fresh / frontside."}]}]}
```

**532-C** (recap 22:00, premarket report, CURRENT_SESSION)
```json
{"headline":"","overall":"Across the $1–$20 range, 2,463 traded after hours, 690 up, 547 down.","sections":[{"heading":"Overnight","lines":[{"ticker":"KITT","text":"The catalyst our sources found is a September 25 Form 8-K (the EX-99.1 exhibit) disclosing a non-binding letter of intent with a strategic investor for a private placement of up to $50 million; the letter does not obligate funding and remains subject to diligence, so the desk grades the catalyst weak / negative / dilutive. On structure the desk is at caution: 7,471,960 shares outstanding as of August 12, 2026 (the outstanding count, not a float), with registered-resale on an S-1 declared effective July 31, 2026 noted but not quantified, capacity, not proof of selling. No cycle call yet."},{"ticker":"MSGY","text":"The catalyst our sources found is a September 24 Form 6-K disclosing a CEO resignation and redesignation, a governance change rather than an operating development, so the desk grades the catalyst moderate / mixed / secondary. On structure the desk is at caution: 16,957,000 shares outstanding as of March 31, 2026 (the outstanding count, not a float), capacity noted but not quantified, capacity, not proof of selling. The desk reads its cycle green, fresh / frontside; it printed a new high of day, is down 30.7% since the previous checkpoint, and lost $8.09 support."}]}]}
```

---

## Variants (one line changed; must be STRUCK)

**532-01** (class 1 · number in no stored field · keyed S1L1)
```json
{"headline":"","overall":"Across the $1–$20 range, 2,463 traded after hours, 690 up, 547 down.","sections":[{"heading":"Overnight","lines":[{"ticker":"KITT","text":"The catalyst our sources found is a September 25 Form 8-K (the EX-99.1 exhibit) disclosing a non-binding letter of intent with a strategic investor for a private placement of up to $50 million; the letter does not obligate funding and remains subject to diligence, so the desk grades the catalyst weak / negative / dilutive. On structure the desk is at caution: 8,120,400 shares outstanding as of August 12, 2026 (the outstanding count, not a float), with registered-resale on an S-1 declared effective July 31, 2026 noted but not quantified, capacity, not proof of selling. No cycle call yet."},{"ticker":"MSGY","text":"The catalyst our sources found is a September 24 Form 6-K disclosing a CEO resignation and redesignation, a governance change rather than an operating development, so the desk grades the catalyst moderate / mixed / secondary. On structure the desk is at caution: 16,957,000 shares outstanding as of March 31, 2026 (the outstanding count, not a float), capacity noted but not quantified, capacity, not proof of selling. The desk reads its cycle green, fresh / frontside; it printed a new high of day, is down 30.7% since the previous checkpoint, and lost $8.09 support."}]}]}
```

**531-02** (class 2 · number from another checkpoint's row · keyed S1L1)
```json
{"headline":"","overall":null,"sections":[{"heading":"Into the close","lines":[{"ticker":"MSGY","text":"The catalyst our sources found is a September 24 Form 6-K disclosing that CEO and director Tsz Tun Tse resigned for personal reasons, with no disagreement with the company, and that Jinyu Xie was redesignated CEO, a governance change rather than an operating development, so the desk grades the catalyst moderate / mixed / secondary. On structure the desk is at caution: 16,957,000 shares outstanding as of March 31, 2026 (the outstanding count, not a float), with acquisition shares on a 6-K filed August 13, 2026 and registered-resale on an F-1 noted but not quantified, capacity, not proof of selling. The desk reads its cycle green, fresh / frontside, and it is up 267.0% since the previous checkpoint."},{"ticker":"MGLD","text":"The catalyst our sources found is a September 24 Form 8-K (the EX-99.1 exhibit) disclosing a definitive agreement for the Gourmet Foods subsidiary to sell substantially all of the Printstock Products assets to TAG Investments in a cash sale, so the desk grades the catalyst legitimate positive. On structure the desk is at caution: 42,712,250 shares outstanding as of June 30, 2026 (the outstanding count, not a float), with shelf capacity on an S-3 and an ATM 424B5 noted but not quantified, capacity, not proof of selling. The desk reads its cycle green, fresh / frontside."}]}]}
```

**532-03** (class 3 · percent on the wrong basis · keyed S1L2)
```json
{"headline":"","overall":"Across the $1–$20 range, 2,463 traded after hours, 690 up, 547 down.","sections":[{"heading":"Overnight","lines":[{"ticker":"KITT","text":"The catalyst our sources found is a September 25 Form 8-K (the EX-99.1 exhibit) disclosing a non-binding letter of intent with a strategic investor for a private placement of up to $50 million; the letter does not obligate funding and remains subject to diligence, so the desk grades the catalyst weak / negative / dilutive. On structure the desk is at caution: 7,471,960 shares outstanding as of August 12, 2026 (the outstanding count, not a float), with registered-resale on an S-1 declared effective July 31, 2026 noted but not quantified, capacity, not proof of selling. No cycle call yet."},{"ticker":"MSGY","text":"The catalyst our sources found is a September 24 Form 6-K disclosing a CEO resignation and redesignation, a governance change rather than an operating development, so the desk grades the catalyst moderate / mixed / secondary. On structure the desk is at caution: 16,957,000 shares outstanding as of March 31, 2026 (the outstanding count, not a float), capacity noted but not quantified, capacity, not proof of selling. The desk reads its cycle green, fresh / frontside, and it is down 27.4% from the prior close."}]}]}
```

**528-04** (class 4 · absence the data cannot support · keyed S1L1)
```json
{"headline":"","overall":null,"sections":[{"heading":"Into the last hour","lines":[{"ticker":"ELPW","text":"We found no catalyst in our sources; the recent filings concern registration, resale and financing rather than a fresh positive event, so the move looks flow-dominant, and it has dropped off the board. On structure the desk is at caution: the float is not established, with a recent offering on a 6-K filed August 4, 2026 and registered-resale on an F-1 (the 424B3, File No. 333-298531) noted but not quantified, capacity, not proof of selling. No cycle call yet."},{"ticker":"MGLD","text":"The catalyst our sources found is a September 24 Form 8-K (the EX-99.1 exhibit) disclosing a definitive agreement for the Gourmet Foods subsidiary to sell substantially all of the Printstock Products assets to TAG Investments in a cash sale, so the desk grades the catalyst legitimate positive. On structure the desk is at caution: 42,712,250 shares outstanding as of June 30, 2026 (the outstanding count, not a float), with shelf capacity on an S-3 and an ATM 424B5 noted but not quantified, capacity, not proof of selling. The desk reads its cycle green, fresh / frontside."}]}]}
```

**532-05** (class 5 · rank true of another checkpoint · keyed S1L1)
```json
{"headline":"","overall":"Across the $1–$20 range, 2,463 traded after hours, 690 up, 547 down.","sections":[{"heading":"Overnight","lines":[{"ticker":"KITT","text":"As the fifth-ranked name here, its catalyst our sources found is a September 25 Form 8-K (the EX-99.1 exhibit) disclosing a non-binding letter of intent with a strategic investor for a private placement of up to $50 million; the letter does not obligate funding and remains subject to diligence, so the desk grades the catalyst weak / negative / dilutive. On structure the desk is at caution: 7,471,960 shares outstanding as of August 12, 2026 (the outstanding count, not a float), with registered-resale on an S-1 declared effective July 31, 2026 noted but not quantified, capacity, not proof of selling. No cycle call yet."},{"ticker":"MSGY","text":"The catalyst our sources found is a September 24 Form 6-K disclosing a CEO resignation and redesignation, a governance change rather than an operating development, so the desk grades the catalyst moderate / mixed / secondary. On structure the desk is at caution: 16,957,000 shares outstanding as of March 31, 2026 (the outstanding count, not a float), capacity noted but not quantified, capacity, not proof of selling. The desk reads its cycle green, fresh / frontside; it printed a new high of day, is down 30.7% since the previous checkpoint, and lost $8.09 support."}]}]}
```

**532-06** (class 6 · unobservable cause, halt from lost observability · keyed S1L2)
```json
{"headline":"","overall":"Across the $1–$20 range, 2,463 traded after hours, 690 up, 547 down.","sections":[{"heading":"Overnight","lines":[{"ticker":"KITT","text":"The catalyst our sources found is a September 25 Form 8-K (the EX-99.1 exhibit) disclosing a non-binding letter of intent with a strategic investor for a private placement of up to $50 million; the letter does not obligate funding and remains subject to diligence, so the desk grades the catalyst weak / negative / dilutive. On structure the desk is at caution: 7,471,960 shares outstanding as of August 12, 2026 (the outstanding count, not a float), with registered-resale on an S-1 declared effective July 31, 2026 noted but not quantified, capacity, not proof of selling. No cycle call yet."},{"ticker":"MSGY","text":"The catalyst our sources found is a September 24 Form 6-K disclosing a CEO resignation and redesignation, a governance change rather than an operating development, so the desk grades the catalyst moderate / mixed / secondary. On structure the desk is at caution: 16,957,000 shares outstanding as of March 31, 2026 (the outstanding count, not a float), capacity noted but not quantified, capacity, not proof of selling. The desk reads its cycle green, fresh / frontside; it printed a new high of day and was halted late in the session."}]}]}
```

**518-07** (class 7 · em dash · keyed S1L1)
```json
{"headline":"","overall":null,"sections":[{"heading":"Into the open","lines":[{"ticker":"MGLD","text":"The catalyst our sources found is a September 24 Form 8-K (the EX-99.1 exhibit) disclosing a definitive agreement for the Gourmet Foods subsidiary to sell substantially all of the Printstock Products assets to TAG Investments in a cash sale — so the desk grades the catalyst legitimate positive. On structure the desk is at caution: 42,712,250 shares outstanding as of June 30, 2026 (the outstanding count, not a float), with shelf capacity on an S-3 and an ATM 424B5 noted but not quantified, capacity, not proof of selling. The desk reads its cycle green, fresh / frontside."},{"ticker":"AIFF","text":"The catalyst our sources found is a September 17 announcement that the Evoke platform was selected to integrate with Radial's AI-native operating system for brain medicine, so the desk grades the catalyst legitimate positive. On structure the desk is at dirty float: the displayed float understates the shares that can reach the market, with registered-resale and warrant capacity on an effective S-3 (the 424B3 under Registration No. 333-296046) noted but not quantified, capacity, not proof of selling. 15,690,316 shares outstanding as of August 4, 2026 (the outstanding count, not a float). No cycle call yet."}]}]}
```

**518-08** (class 8 · spaced hyphen used as a dash · keyed S1L2)
```json
{"headline":"","overall":null,"sections":[{"heading":"Into the open","lines":[{"ticker":"MGLD","text":"The catalyst our sources found is a September 24 Form 8-K (the EX-99.1 exhibit) disclosing a definitive agreement for the Gourmet Foods subsidiary to sell substantially all of the Printstock Products assets to TAG Investments in a cash sale, so the desk grades the catalyst legitimate positive. On structure the desk is at caution: 42,712,250 shares outstanding as of June 30, 2026 (the outstanding count, not a float), with shelf capacity on an S-3 and an ATM 424B5 noted but not quantified, capacity, not proof of selling. The desk reads its cycle green, fresh / frontside."},{"ticker":"AIFF","text":"The catalyst our sources found is a September 17 announcement that the Evoke platform was selected to integrate with Radial's AI-native operating system for brain medicine, so the desk grades the catalyst legitimate positive. On structure the desk is at dirty float - the displayed float understates the shares that can reach the market, with registered-resale and warrant capacity on an effective S-3 (the 424B3 under Registration No. 333-296046) noted but not quantified, capacity, not proof of selling. 15,690,316 shares outstanding as of August 4, 2026 (the outstanding count, not a float). No cycle call yet."}]}]}
```

**528-09** (class 9 · a count of names written · keyed S1L1)
```json
{"headline":"","overall":null,"sections":[{"heading":"Into the last hour","lines":[{"ticker":"ELPW","text":"One of the two names with no catalyst here: we found no catalyst in our sources; the recent filings concern registration, resale and financing rather than a fresh positive event, so the move looks flow-dominant. On structure the desk is at caution: the float is not established, with a recent offering on a 6-K filed August 4, 2026 and registered-resale on an F-1 (the 424B3, File No. 333-298531) noted but not quantified, capacity, not proof of selling. No cycle call yet."},{"ticker":"MGLD","text":"The catalyst our sources found is a September 24 Form 8-K (the EX-99.1 exhibit) disclosing a definitive agreement for the Gourmet Foods subsidiary to sell substantially all of the Printstock Products assets to TAG Investments in a cash sale, so the desk grades the catalyst legitimate positive. On structure the desk is at caution: 42,712,250 shares outstanding as of June 30, 2026 (the outstanding count, not a float), with shelf capacity on an S-3 and an ATM 424B5 noted but not quantified, capacity, not proof of selling. The desk reads its cycle green, fresh / frontside."}]}]}
```

**532-10** (class 10 · shares outstanding called float · keyed S1L1)
```json
{"headline":"","overall":"Across the $1–$20 range, 2,463 traded after hours, 690 up, 547 down.","sections":[{"heading":"Overnight","lines":[{"ticker":"KITT","text":"The catalyst our sources found is a September 25 Form 8-K (the EX-99.1 exhibit) disclosing a non-binding letter of intent with a strategic investor for a private placement of up to $50 million; the letter does not obligate funding and remains subject to diligence, so the desk grades the catalyst weak / negative / dilutive. On structure the desk is at caution: 7,471,960 shares of float as of August 12, 2026, with registered-resale on an S-1 declared effective July 31, 2026 noted but not quantified, capacity, not proof of selling. No cycle call yet."},{"ticker":"MSGY","text":"The catalyst our sources found is a September 24 Form 6-K disclosing a CEO resignation and redesignation, a governance change rather than an operating development, so the desk grades the catalyst moderate / mixed / secondary. On structure the desk is at caution: 16,957,000 shares outstanding as of March 31, 2026 (the outstanding count, not a float), capacity noted but not quantified, capacity, not proof of selling. The desk reads its cycle green, fresh / frontside; it printed a new high of day, is down 30.7% since the previous checkpoint, and lost $8.09 support."}]}]}
```

**532-11** (class 11 · shares outstanding with no date · keyed S1L1)
```json
{"headline":"","overall":"Across the $1–$20 range, 2,463 traded after hours, 690 up, 547 down.","sections":[{"heading":"Overnight","lines":[{"ticker":"KITT","text":"The catalyst our sources found is a September 25 Form 8-K (the EX-99.1 exhibit) disclosing a non-binding letter of intent with a strategic investor for a private placement of up to $50 million; the letter does not obligate funding and remains subject to diligence, so the desk grades the catalyst weak / negative / dilutive. On structure the desk is at caution: 7,471,960 shares outstanding (the outstanding count, not a float), with registered-resale on an S-1 declared effective July 31, 2026 noted but not quantified, capacity, not proof of selling. No cycle call yet."},{"ticker":"MSGY","text":"The catalyst our sources found is a September 24 Form 6-K disclosing a CEO resignation and redesignation, a governance change rather than an operating development, so the desk grades the catalyst moderate / mixed / secondary. On structure the desk is at caution: 16,957,000 shares outstanding as of March 31, 2026 (the outstanding count, not a float), capacity noted but not quantified, capacity, not proof of selling. The desk reads its cycle green, fresh / frontside; it printed a new high of day, is down 30.7% since the previous checkpoint, and lost $8.09 support."}]}]}
```

**518-12** (class 12 · catalyst fit as a forecast · keyed S1L1)
```json
{"headline":"","overall":null,"sections":[{"heading":"Into the open","lines":[{"ticker":"MGLD","text":"The catalyst our sources found is a September 24 Form 8-K (the EX-99.1 exhibit) disclosing a definitive agreement for the Gourmet Foods subsidiary to sell substantially all of the Printstock Products assets to TAG Investments in a cash sale; the desk grades the catalyst legitimate positive, and the sale should push the stock higher through the open. On structure the desk is at caution: 42,712,250 shares outstanding as of June 30, 2026 (the outstanding count, not a float), with shelf capacity on an S-3 and an ATM 424B5 noted but not quantified, capacity, not proof of selling. The desk reads its cycle green, fresh / frontside."},{"ticker":"AIFF","text":"The catalyst our sources found is a September 17 announcement that the Evoke platform was selected to integrate with Radial's AI-native operating system for brain medicine, so the desk grades the catalyst legitimate positive. On structure the desk is at dirty float: the displayed float understates the shares that can reach the market, with registered-resale and warrant capacity on an effective S-3 (the 424B3 under Registration No. 333-296046) noted but not quantified, capacity, not proof of selling. 15,690,316 shares outstanding as of August 4, 2026 (the outstanding count, not a float). No cycle call yet."}]}]}
```

**532-13** (class 13 · clock time no source carries · keyed S1L1)
```json
{"headline":"","overall":"Across the $1–$20 range, 2,463 traded after hours, 690 up, 547 down.","sections":[{"heading":"Overnight","lines":[{"ticker":"KITT","text":"The catalyst our sources found is a September 25 Form 8-K (the EX-99.1 exhibit) filed at 09:15 ET disclosing a non-binding letter of intent with a strategic investor for a private placement of up to $50 million; the letter does not obligate funding and remains subject to diligence, so the desk grades the catalyst weak / negative / dilutive. On structure the desk is at caution: 7,471,960 shares outstanding as of August 12, 2026 (the outstanding count, not a float), with registered-resale on an S-1 declared effective July 31, 2026 noted but not quantified, capacity, not proof of selling. No cycle call yet."},{"ticker":"MSGY","text":"The catalyst our sources found is a September 24 Form 6-K disclosing a CEO resignation and redesignation, a governance change rather than an operating development, so the desk grades the catalyst moderate / mixed / secondary. On structure the desk is at caution: 16,957,000 shares outstanding as of March 31, 2026 (the outstanding count, not a float), capacity noted but not quantified, capacity, not proof of selling. The desk reads its cycle green, fresh / frontside; it printed a new high of day, is down 30.7% since the previous checkpoint, and lost $8.09 support."}]}]}
```

**518-14** (class 14 · an exact time hedged · keyed S1L1)
```json
{"headline":"","overall":null,"sections":[{"heading":"Into the open","lines":[{"ticker":"MGLD","text":"The catalyst our sources found is a September 24 Form 8-K (the EX-99.1 exhibit) filed at about 14:00 ET disclosing a definitive agreement for the Gourmet Foods subsidiary to sell substantially all of the Printstock Products assets to TAG Investments in a cash sale, so the desk grades the catalyst legitimate positive. On structure the desk is at caution: 42,712,250 shares outstanding as of June 30, 2026 (the outstanding count, not a float), with shelf capacity on an S-3 and an ATM 424B5 noted but not quantified, capacity, not proof of selling. The desk reads its cycle green, fresh / frontside."},{"ticker":"AIFF","text":"The catalyst our sources found is a September 17 announcement that the Evoke platform was selected to integrate with Radial's AI-native operating system for brain medicine, so the desk grades the catalyst legitimate positive. On structure the desk is at dirty float: the displayed float understates the shares that can reach the market, with registered-resale and warrant capacity on an effective S-3 (the 424B3 under Registration No. 333-296046) noted but not quantified, capacity, not proof of selling. 15,690,316 shares outstanding as of August 4, 2026 (the outstanding count, not a float). No cycle call yet."}]}]}
```

**532-15** (class 15 · a catalyst number not in the cited text · keyed S1L1)
```json
{"headline":"","overall":"Across the $1–$20 range, 2,463 traded after hours, 690 up, 547 down.","sections":[{"heading":"Overnight","lines":[{"ticker":"KITT","text":"The catalyst our sources found is a September 25 Form 8-K (the EX-99.1 exhibit) disclosing a non-binding letter of intent with a strategic investor for a private placement of up to $75 million; the letter does not obligate funding and remains subject to diligence, so the desk grades the catalyst weak / negative / dilutive. On structure the desk is at caution: 7,471,960 shares outstanding as of August 12, 2026 (the outstanding count, not a float), with registered-resale on an S-1 declared effective July 31, 2026 noted but not quantified, capacity, not proof of selling. No cycle call yet."},{"ticker":"MSGY","text":"The catalyst our sources found is a September 24 Form 6-K disclosing a CEO resignation and redesignation, a governance change rather than an operating development, so the desk grades the catalyst moderate / mixed / secondary. On structure the desk is at caution: 16,957,000 shares outstanding as of March 31, 2026 (the outstanding count, not a float), capacity noted but not quantified, capacity, not proof of selling. The desk reads its cycle green, fresh / frontside; it printed a new high of day, is down 30.7% since the previous checkpoint, and lost $8.09 support."}]}]}
```

**518-16** (class 16 · a date the research does not hold · keyed S1L1)
```json
{"headline":"","overall":null,"sections":[{"heading":"Into the open","lines":[{"ticker":"MGLD","text":"The catalyst our sources found is a September 19 Form 8-K (the EX-99.1 exhibit) disclosing a definitive agreement for the Gourmet Foods subsidiary to sell substantially all of the Printstock Products assets to TAG Investments in a cash sale, so the desk grades the catalyst legitimate positive. On structure the desk is at caution: 42,712,250 shares outstanding as of June 30, 2026 (the outstanding count, not a float), with shelf capacity on an S-3 and an ATM 424B5 noted but not quantified, capacity, not proof of selling. The desk reads its cycle green, fresh / frontside."},{"ticker":"AIFF","text":"The catalyst our sources found is a September 17 announcement that the Evoke platform was selected to integrate with Radial's AI-native operating system for brain medicine, so the desk grades the catalyst legitimate positive. On structure the desk is at dirty float: the displayed float understates the shares that can reach the market, with registered-resale and warrant capacity on an effective S-3 (the 424B3 under Registration No. 333-296046) noted but not quantified, capacity, not proof of selling. 15,690,316 shares outstanding as of August 4, 2026 (the outstanding count, not a float). No cycle call yet."}]}]}
```

**532-17** (class 17 · company/country/business contradicting the dossier · keyed S1L1)
```json
{"headline":"","overall":"Across the $1–$20 range, 2,463 traded after hours, 690 up, 547 down.","sections":[{"heading":"Overnight","lines":[{"ticker":"KITT","text":"A German robotics company: the catalyst our sources found is a September 25 Form 8-K (the EX-99.1 exhibit) disclosing a non-binding letter of intent with a strategic investor for a private placement of up to $50 million; the letter does not obligate funding and remains subject to diligence, so the desk grades the catalyst weak / negative / dilutive. On structure the desk is at caution: 7,471,960 shares outstanding as of August 12, 2026 (the outstanding count, not a float), with registered-resale on an S-1 declared effective July 31, 2026 noted but not quantified, capacity, not proof of selling. No cycle call yet."},{"ticker":"MSGY","text":"The catalyst our sources found is a September 24 Form 6-K disclosing a CEO resignation and redesignation, a governance change rather than an operating development, so the desk grades the catalyst moderate / mixed / secondary. On structure the desk is at caution: 16,957,000 shares outstanding as of March 31, 2026 (the outstanding count, not a float), capacity noted but not quantified, capacity, not proof of selling. The desk reads its cycle green, fresh / frontside; it printed a new high of day, is down 30.7% since the previous checkpoint, and lost $8.09 support."}]}]}
```

**528-18** (class 18 · "what we think" prose beyond the reasoning · keyed S1L1)
```json
{"headline":"","overall":null,"sections":[{"heading":"Into the last hour","lines":[{"ticker":"ELPW","text":"We found no catalyst in our sources; the recent filings concern registration, resale and financing rather than a fresh positive event, so the move looks flow-dominant, and we think it runs out of buyers by the open. On structure the desk is at caution: the float is not established, with a recent offering on a 6-K filed August 4, 2026 and registered-resale on an F-1 (the 424B3, File No. 333-298531) noted but not quantified, capacity, not proof of selling. No cycle call yet."},{"ticker":"MGLD","text":"The catalyst our sources found is a September 24 Form 8-K (the EX-99.1 exhibit) disclosing a definitive agreement for the Gourmet Foods subsidiary to sell substantially all of the Printstock Products assets to TAG Investments in a cash sale, so the desk grades the catalyst legitimate positive. On structure the desk is at caution: 42,712,250 shares outstanding as of June 30, 2026 (the outstanding count, not a float), with shelf capacity on an S-3 and an ATM 424B5 noted but not quantified, capacity, not proof of selling. The desk reads its cycle green, fresh / frontside."}]}]}
```

**532-19** (class 19 · a wrong after-hours total in overall · keyed O)
```json
{"headline":"","overall":"Across the $1–$20 range, 2,640 traded after hours, 690 up, 547 down.","sections":[{"heading":"Overnight","lines":[{"ticker":"KITT","text":"The catalyst our sources found is a September 25 Form 8-K (the EX-99.1 exhibit) disclosing a non-binding letter of intent with a strategic investor for a private placement of up to $50 million; the letter does not obligate funding and remains subject to diligence, so the desk grades the catalyst weak / negative / dilutive. On structure the desk is at caution: 7,471,960 shares outstanding as of August 12, 2026 (the outstanding count, not a float), with registered-resale on an S-1 declared effective July 31, 2026 noted but not quantified, capacity, not proof of selling. No cycle call yet."},{"ticker":"MSGY","text":"The catalyst our sources found is a September 24 Form 6-K disclosing a CEO resignation and redesignation, a governance change rather than an operating development, so the desk grades the catalyst moderate / mixed / secondary. On structure the desk is at caution: 16,957,000 shares outstanding as of March 31, 2026 (the outstanding count, not a float), capacity noted but not quantified, capacity, not proof of selling. The desk reads its cycle green, fresh / frontside; it printed a new high of day, is down 30.7% since the previous checkpoint, and lost $8.09 support."}]}]}
```

---

## Keyed-line table

| variant | class | keyed line | why struck |
|---|---|---|---|
| 532-01 | 1 number in no stored field | S1L1 (KITT) | 8,120,400 not stored (true 7,471,960) |
| 531-02 | 2 number from another checkpoint | S1L1 (MSGY) | 267.0% is MSGY's power session %, not the close since-prior delta (13.6%) |
| 532-03 | 3 wrong basis | S1L2 (MSGY) | 27.4% is CURRENT_SESSION at the recap, stated "from the prior close" |
| 528-04 | 4 unsupportable absence | S1L1 (ELPW) | "dropped off the board" while ranked/present |
| 532-05 | 5 rank of another checkpoint | S1L1 (KITT) | "fifth-ranked" while #9 at the recap (KITT was #5 at the open) |
| 532-06 | 6 unobservable cause | S1L2 (MSGY) | halt asserted from TRADING → UNKNOWN (lost observability) |
| 518-07 | 7 em dash | S1L1 (MGLD) | U+2014 |
| 518-08 | 8 spaced-hyphen dash | S1L2 (AIFF) | " - " used as a dash |
| 528-09 | 9 name count written | S1L1 (ELPW) | "one of the two names" |
| 532-10 | 10 shares called float | S1L1 (KITT) | outstanding count called "float" |
| 532-11 | 11 shares undated | S1L1 (KITT) | as-of date removed |
| 518-12 | 12 catalyst fit / forecast | S1L1 (MGLD) | "should push the stock higher" |
| 532-13 | 13 clock time no source carries | S1L1 (KITT) | "09:15 ET" vs the source 04:41 ET |
| 518-14 | 14 exact time hedged | S1L1 (MGLD) | "about 14:00 ET" on an exact time |
| 532-15 | 15 catalyst number not cited | S1L1 (KITT) | "$75 million" vs the cited "up to $50 million" |
| 518-16 | 16 date not held | S1L1 (MGLD) | "September 19" vs the filing's September 24 |
| 532-17 | 17 company/country contradiction | S1L1 (KITT) | "German" vs Nauticus Robotics, TX/US |
| 528-18 | 18 prose beyond the reasoning | S1L1 (ELPW) | added opinion / forecast |
| 532-19 | 19 wrong AH total in overall | O | 2,640 traded vs the true 2,463 |

Classes 1 and 2 both read as "not in this row" to a single-checkpoint checker; the bar
is struck, not classified.

## Regression controls (run 1's false strikes; must be ADMITTED)

A strike on any of these is a checker false-positive, not a set defect:

- **528-C S1L1 (ELPW):** "We found no catalyst in our sources" as a true statement about
  our sources (run-1 class a). Also carries SEC forms 6-K, F-1, 424B3 with dates.
- **518-C S1L2 (AIFF):** the supply line naming its form and registration, "an effective
  S-3 (the 424B3 under Registration No. 333-296046)" (run-1 class b). Also DIRTY_FLOAT
  rendered "the displayed float understates the shares that can reach the market".
- **518-C S1L1 / 531-C S1L1 (MGLD, MSGY):** supply lines naming forms + dates ("an S-3
  and an ATM 424B5", "a 6-K filed August 13, 2026", "an S-1 declared effective July 31,
  2026").
- Every structure line carries "(the outstanding count, not a float)"; the recap
  `overall` carries the en-dash range "$1–$20".
- **No control uses a never-use word** (the run-1 "clearly" is gone; scrubbed against the
  full voice list).
