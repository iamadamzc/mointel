# Seeded defect set v5 for the session-report checker's pass bar

**Marketing-tmi, 2026-09-30. INFORMED BY THE v5 CONTRACT ONLY (`design.md` §8), BLIND
TO THE v5 CHECKER (`1ab48be` unread).** Seeded against real rows read first-hand from
`data/market-prod-2026-09-29.db` (read-only), session 2026-09-24, $1–$20, checkpoints
#499 open 09:25, #509 power 14:30, #512 close 16:00, #513 recap 22:00 (premarket).

**Integrity:** the seeded defects and their target lines are unchanged from the
pre-freeze lock `437e30a660b67370fd66b6a9726ce09affd7159af706ec229647bd7cd2c0d0a6`
(committed before the checker froze). This revision only reformats into the harness's
JSON/id form per Research's spec and adds `"headline": ""`; no defect changed, and I
remain blind to the checker.

**Format:** a v5 draft is `{ "headline": "", "overall": string|null, "sections":
[{ "heading", "lines": [{ "ticker", "text" }] }] }`, `overall` non-null only on #513.
Ids: `<checkpoint>-C` for a control, `<checkpoint>-<class number>` for a variant. Each
variant = its control with EXACTLY ONE line changed (the keyed line); a correct checker
strikes that one line and nothing else. Controls strike nothing. Line ids: `S1L1` /
`S1L2` (section 1, line 1/2) or `O` (overall).

---

## Controls (must strike NOTHING)

**499-C**
```json
{"headline":"","overall":null,"sections":[{"heading":"Into the open","lines":[{"ticker":"SPHL","text":"The catalyst our sources found is a 6-K filed September 23 with half-year results for the period ended June 30, 2026 (the EX-99.1 exhibit); a time-relevant event, though the excerpt does not establish a clearly positive surprise, so the desk grades it moderate / mixed / secondary. On structure the desk is at caution: 11,500,000 shares outstanding as of December 31, 2024 (the outstanding count, not a float), with a registered-resale F-1 on file, capacity, not proof of selling. No cycle call yet."},{"ticker":"APUS","text":"The most recent filing our sources found is a September 22 Form 8-K disclosing a 1-for-10 reverse split that was already effective July 24, a stale structural disclosure rather than a fresh catalyst, and the bundle identifies nothing that explains the move, so the desk grades the catalyst weak / negative / dilutive. On structure the desk is at caution: 1,509,118 shares outstanding as of August 12, 2026 (the outstanding count, not a float), with registered-resale, convertible and warrant capacity from the August 14 Form 10-Q noted but not quantified, capacity, not proof of selling. The desk reads its cycle yellow, frontside warning."}]}]}
```

**509-C**
```json
{"headline":"","overall":null,"sections":[{"heading":"Into the last hour","lines":[{"ticker":"IFBD","text":"We found no catalyst in our sources; the most recent filing was an August 24 change of CEO and directors, and the only September 23 item is a market-commentary headline, so the move looks flow-dominant. On structure the desk is at caution: 8,188,574 shares outstanding as of December 31, 2025 (the outstanding count, not a float), with shelf capacity on an effective F-3 noted but not quantified, capacity, not proof of selling. The desk reads its cycle red, backside, an exit-and-avoid read rather than a setup."},{"ticker":"APUS","text":"About 1.5 million shares are outstanding as of August 12, 2026 (the outstanding count, not a float), with registered-resale, convertible and warrant capacity noted but not quantified, capacity, not proof of selling. The most recent filing our sources found is a September 22 Form 8-K disclosing a 1-for-10 reverse split already effective July 24, a stale structural disclosure rather than a fresh catalyst, so the desk grades the catalyst moderate / mixed / secondary. The desk reads its cycle yellow, frontside warning."}]}]}
```

**512-C**
```json
{"headline":"","overall":null,"sections":[{"heading":"Into the close","lines":[{"ticker":"IFBD","text":"We found no catalyst in our sources; the most recent filing was an August 24 change of CEO and directors, and the only September 23 item is a market-commentary headline, so the move looks flow-dominant. On structure the desk is at caution: 8,188,574 shares outstanding as of December 31, 2025 (the outstanding count, not a float), with shelf capacity on an effective F-3 noted but not quantified, capacity, not proof of selling. The desk reads its cycle red, backside, an exit-and-avoid read rather than a setup."},{"ticker":"APUS","text":"The most recent filing our sources found is a September 22 Form 8-K disclosing a 1-for-10 reverse split that was already effective July 24, a stale structural disclosure rather than a fresh catalyst, so the desk grades the catalyst moderate / mixed / secondary and our sources found nothing that explains the move. On structure the desk is at caution: 1,509,118 shares outstanding as of August 12, 2026 (the outstanding count, not a float), capacity noted but not quantified, capacity, not proof of selling. The desk reads its cycle yellow, frontside warning."}]}]}
```

**513-C**
```json
{"headline":"","overall":"Across the $1–$20 range, 2,419 traded after hours, 697 up, 559 down.","sections":[{"heading":"Overnight","lines":[{"ticker":"IFBD","text":"We found no catalyst in our sources; the most recent filing was an August 24 change of CEO and directors, and the only September 23 item is a market-commentary headline, so the move looks flow-dominant. On structure the desk is at caution: 8,188,574 shares outstanding as of December 31, 2025 (the outstanding count, not a float), with shelf capacity on an effective F-3 noted but not quantified, capacity, not proof of selling. The desk reads its cycle red, backside, an exit-and-avoid read rather than a setup, and it is up 47.3% since the previous checkpoint."},{"ticker":"APUS","text":"The most recent filing our sources found is a September 22 Form 8-K disclosing a 1-for-10 reverse split already effective July 24, a stale structural disclosure rather than a fresh catalyst, so the desk grades the catalyst moderate / mixed / secondary. On structure the desk is at caution: 1,509,118 shares outstanding as of August 12, 2026 (the outstanding count, not a float), capacity noted but not quantified, capacity, not proof of selling. The desk reads its cycle yellow, frontside warning, and it is up 12.7% since the previous checkpoint."}]}]}
```

---

## Variants (one line changed; must be STRUCK)

**512-01** (class 1 · number in no stored field · keyed S1L2)
```json
{"headline":"","overall":null,"sections":[{"heading":"Into the close","lines":[{"ticker":"IFBD","text":"We found no catalyst in our sources; the most recent filing was an August 24 change of CEO and directors, and the only September 23 item is a market-commentary headline, so the move looks flow-dominant. On structure the desk is at caution: 8,188,574 shares outstanding as of December 31, 2025 (the outstanding count, not a float), with shelf capacity on an effective F-3 noted but not quantified, capacity, not proof of selling. The desk reads its cycle red, backside, an exit-and-avoid read rather than a setup."},{"ticker":"APUS","text":"The most recent filing our sources found is a September 22 Form 8-K disclosing a 1-for-10 reverse split that was already effective July 24, a stale structural disclosure rather than a fresh catalyst, so the desk grades the catalyst moderate / mixed / secondary and our sources found nothing that explains the move. On structure the desk is at caution: 1,742,860 shares outstanding as of August 12, 2026 (the outstanding count, not a float), capacity noted but not quantified, capacity, not proof of selling. The desk reads its cycle yellow, frontside warning."}]}]}
```

**513-02** (class 2 · number from another checkpoint's row · keyed S1L2)
```json
{"headline":"","overall":"Across the $1–$20 range, 2,419 traded after hours, 697 up, 559 down.","sections":[{"heading":"Overnight","lines":[{"ticker":"IFBD","text":"We found no catalyst in our sources; the most recent filing was an August 24 change of CEO and directors, and the only September 23 item is a market-commentary headline, so the move looks flow-dominant. On structure the desk is at caution: 8,188,574 shares outstanding as of December 31, 2025 (the outstanding count, not a float), with shelf capacity on an effective F-3 noted but not quantified, capacity, not proof of selling. The desk reads its cycle red, backside, an exit-and-avoid read rather than a setup, and it is up 47.3% since the previous checkpoint."},{"ticker":"APUS","text":"The most recent filing our sources found is a September 22 Form 8-K disclosing a 1-for-10 reverse split already effective July 24, a stale structural disclosure rather than a fresh catalyst, so the desk grades the catalyst moderate / mixed / secondary. On structure the desk is at caution: 1,509,118 shares outstanding as of August 12, 2026 (the outstanding count, not a float), capacity noted but not quantified, capacity, not proof of selling. The desk reads its cycle yellow, frontside warning, and it is up 122.3% since the previous checkpoint."}]}]}
```

**513-03** (class 3 · percent on the wrong basis · keyed S1L1)
```json
{"headline":"","overall":"Across the $1–$20 range, 2,419 traded after hours, 697 up, 559 down.","sections":[{"heading":"Overnight","lines":[{"ticker":"IFBD","text":"We found no catalyst in our sources; the most recent filing was an August 24 change of CEO and directors, and the only September 23 item is a market-commentary headline, so the move looks flow-dominant. On structure the desk is at caution: 8,188,574 shares outstanding as of December 31, 2025 (the outstanding count, not a float), with shelf capacity on an effective F-3 noted but not quantified, capacity, not proof of selling. The desk reads its cycle red, backside, an exit-and-avoid read rather than a setup, and it is up 43.4% from the prior close."},{"ticker":"APUS","text":"The most recent filing our sources found is a September 22 Form 8-K disclosing a 1-for-10 reverse split already effective July 24, a stale structural disclosure rather than a fresh catalyst, so the desk grades the catalyst moderate / mixed / secondary. On structure the desk is at caution: 1,509,118 shares outstanding as of August 12, 2026 (the outstanding count, not a float), capacity noted but not quantified, capacity, not proof of selling. The desk reads its cycle yellow, frontside warning, and it is up 12.7% since the previous checkpoint."}]}]}
```

**512-04** (class 4 · absence the data cannot support · keyed S1L1)
```json
{"headline":"","overall":null,"sections":[{"heading":"Into the close","lines":[{"ticker":"IFBD","text":"We found no catalyst in our sources; the most recent filing was an August 24 change of CEO and directors, and the only September 23 item is a market-commentary headline, so the move looks flow-dominant. On structure the desk is at caution: 8,188,574 shares outstanding as of December 31, 2025 (the outstanding count, not a float), with shelf capacity on an effective F-3 noted but not quantified, capacity, not proof of selling. The desk reads its cycle red, backside, an exit-and-avoid read rather than a setup, and it has dropped off the board."},{"ticker":"APUS","text":"The most recent filing our sources found is a September 22 Form 8-K disclosing a 1-for-10 reverse split that was already effective July 24, a stale structural disclosure rather than a fresh catalyst, so the desk grades the catalyst moderate / mixed / secondary and our sources found nothing that explains the move. On structure the desk is at caution: 1,509,118 shares outstanding as of August 12, 2026 (the outstanding count, not a float), capacity noted but not quantified, capacity, not proof of selling. The desk reads its cycle yellow, frontside warning."}]}]}
```

**513-05** (class 5 · rank true of another checkpoint · keyed S1L2)
```json
{"headline":"","overall":"Across the $1–$20 range, 2,419 traded after hours, 697 up, 559 down.","sections":[{"heading":"Overnight","lines":[{"ticker":"IFBD","text":"We found no catalyst in our sources; the most recent filing was an August 24 change of CEO and directors, and the only September 23 item is a market-commentary headline, so the move looks flow-dominant. On structure the desk is at caution: 8,188,574 shares outstanding as of December 31, 2025 (the outstanding count, not a float), with shelf capacity on an effective F-3 noted but not quantified, capacity, not proof of selling. The desk reads its cycle red, backside, an exit-and-avoid read rather than a setup, and it is up 47.3% since the previous checkpoint."},{"ticker":"APUS","text":"As the third-ranked name here, its most recent filing our sources found is a September 22 Form 8-K disclosing a 1-for-10 reverse split already effective July 24, a stale structural disclosure rather than a fresh catalyst, so the desk grades the catalyst moderate / mixed / secondary. On structure the desk is at caution: 1,509,118 shares outstanding as of August 12, 2026 (the outstanding count, not a float), capacity noted but not quantified, capacity, not proof of selling. The desk reads its cycle yellow, frontside warning, and it is up 12.7% since the previous checkpoint."}]}]}
```

**513-06** (class 6 · unobservable cause, halt from lost observability · keyed S1L1)
```json
{"headline":"","overall":"Across the $1–$20 range, 2,419 traded after hours, 697 up, 559 down.","sections":[{"heading":"Overnight","lines":[{"ticker":"IFBD","text":"We found no catalyst in our sources; the most recent filing was an August 24 change of CEO and directors, and the only September 23 item is a market-commentary headline, so the move looks flow-dominant. On structure the desk is at caution: 8,188,574 shares outstanding as of December 31, 2025 (the outstanding count, not a float), with shelf capacity on an effective F-3 noted but not quantified, capacity, not proof of selling. The desk reads its cycle red, backside, an exit-and-avoid read rather than a setup, and it was halted late in the session."},{"ticker":"APUS","text":"The most recent filing our sources found is a September 22 Form 8-K disclosing a 1-for-10 reverse split already effective July 24, a stale structural disclosure rather than a fresh catalyst, so the desk grades the catalyst moderate / mixed / secondary. On structure the desk is at caution: 1,509,118 shares outstanding as of August 12, 2026 (the outstanding count, not a float), capacity noted but not quantified, capacity, not proof of selling. The desk reads its cycle yellow, frontside warning, and it is up 12.7% since the previous checkpoint."}]}]}
```

**512-07** (class 7 · em dash · keyed S1L2)
```json
{"headline":"","overall":null,"sections":[{"heading":"Into the close","lines":[{"ticker":"IFBD","text":"We found no catalyst in our sources; the most recent filing was an August 24 change of CEO and directors, and the only September 23 item is a market-commentary headline, so the move looks flow-dominant. On structure the desk is at caution: 8,188,574 shares outstanding as of December 31, 2025 (the outstanding count, not a float), with shelf capacity on an effective F-3 noted but not quantified, capacity, not proof of selling. The desk reads its cycle red, backside, an exit-and-avoid read rather than a setup."},{"ticker":"APUS","text":"The most recent filing our sources found is a September 22 Form 8-K disclosing a 1-for-10 reverse split that was already effective July 24, a stale structural disclosure — not a fresh catalyst, so the desk grades the catalyst moderate / mixed / secondary and our sources found nothing that explains the move. On structure the desk is at caution: 1,509,118 shares outstanding as of August 12, 2026 (the outstanding count, not a float), capacity noted but not quantified, capacity, not proof of selling. The desk reads its cycle yellow, frontside warning."}]}]}
```

**499-08** (class 8 · spaced hyphen used as a dash · keyed S1L1)
```json
{"headline":"","overall":null,"sections":[{"heading":"Into the open","lines":[{"ticker":"SPHL","text":"The catalyst our sources found is a 6-K filed September 23 with half-year results for the period ended June 30, 2026 (the EX-99.1 exhibit); a time-relevant event - though the excerpt does not establish a clearly positive surprise, so the desk grades it moderate / mixed / secondary. On structure the desk is at caution: 11,500,000 shares outstanding as of December 31, 2024 (the outstanding count, not a float), with a registered-resale F-1 on file, capacity, not proof of selling. No cycle call yet."},{"ticker":"APUS","text":"The most recent filing our sources found is a September 22 Form 8-K disclosing a 1-for-10 reverse split that was already effective July 24, a stale structural disclosure rather than a fresh catalyst, and the bundle identifies nothing that explains the move, so the desk grades the catalyst weak / negative / dilutive. On structure the desk is at caution: 1,509,118 shares outstanding as of August 12, 2026 (the outstanding count, not a float), with registered-resale, convertible and warrant capacity from the August 14 Form 10-Q noted but not quantified, capacity, not proof of selling. The desk reads its cycle yellow, frontside warning."}]}]}
```

**499-09** (class 9 · a count of names written · keyed S1L1)
```json
{"headline":"","overall":null,"sections":[{"heading":"Into the open","lines":[{"ticker":"SPHL","text":"One of the three names on watch here: the catalyst our sources found is a 6-K filed September 23 with half-year results for the period ended June 30, 2026 (the EX-99.1 exhibit); a time-relevant event, though the excerpt does not establish a clearly positive surprise, so the desk grades it moderate / mixed / secondary. On structure the desk is at caution: 11,500,000 shares outstanding as of December 31, 2024 (the outstanding count, not a float), with a registered-resale F-1 on file, capacity, not proof of selling. No cycle call yet."},{"ticker":"APUS","text":"The most recent filing our sources found is a September 22 Form 8-K disclosing a 1-for-10 reverse split that was already effective July 24, a stale structural disclosure rather than a fresh catalyst, and the bundle identifies nothing that explains the move, so the desk grades the catalyst weak / negative / dilutive. On structure the desk is at caution: 1,509,118 shares outstanding as of August 12, 2026 (the outstanding count, not a float), with registered-resale, convertible and warrant capacity from the August 14 Form 10-Q noted but not quantified, capacity, not proof of selling. The desk reads its cycle yellow, frontside warning."}]}]}
```

**512-10** (class 10 · shares outstanding called float · keyed S1L2)
```json
{"headline":"","overall":null,"sections":[{"heading":"Into the close","lines":[{"ticker":"IFBD","text":"We found no catalyst in our sources; the most recent filing was an August 24 change of CEO and directors, and the only September 23 item is a market-commentary headline, so the move looks flow-dominant. On structure the desk is at caution: 8,188,574 shares outstanding as of December 31, 2025 (the outstanding count, not a float), with shelf capacity on an effective F-3 noted but not quantified, capacity, not proof of selling. The desk reads its cycle red, backside, an exit-and-avoid read rather than a setup."},{"ticker":"APUS","text":"The most recent filing our sources found is a September 22 Form 8-K disclosing a 1-for-10 reverse split that was already effective July 24, a stale structural disclosure rather than a fresh catalyst, so the desk grades the catalyst moderate / mixed / secondary and our sources found nothing that explains the move. On structure the desk is at caution: 1,509,118 shares of float as of August 12, 2026, capacity noted but not quantified, capacity, not proof of selling. The desk reads its cycle yellow, frontside warning."}]}]}
```

**512-11** (class 11 · shares outstanding with no date · keyed S1L2)
```json
{"headline":"","overall":null,"sections":[{"heading":"Into the close","lines":[{"ticker":"IFBD","text":"We found no catalyst in our sources; the most recent filing was an August 24 change of CEO and directors, and the only September 23 item is a market-commentary headline, so the move looks flow-dominant. On structure the desk is at caution: 8,188,574 shares outstanding as of December 31, 2025 (the outstanding count, not a float), with shelf capacity on an effective F-3 noted but not quantified, capacity, not proof of selling. The desk reads its cycle red, backside, an exit-and-avoid read rather than a setup."},{"ticker":"APUS","text":"The most recent filing our sources found is a September 22 Form 8-K disclosing a 1-for-10 reverse split that was already effective July 24, a stale structural disclosure rather than a fresh catalyst, so the desk grades the catalyst moderate / mixed / secondary and our sources found nothing that explains the move. On structure the desk is at caution: 1,509,118 shares outstanding (the outstanding count, not a float), capacity noted but not quantified, capacity, not proof of selling. The desk reads its cycle yellow, frontside warning."}]}]}
```

**513-12** (class 12 · catalyst fit as a forecast · keyed S1L2)
```json
{"headline":"","overall":"Across the $1–$20 range, 2,419 traded after hours, 697 up, 559 down.","sections":[{"heading":"Overnight","lines":[{"ticker":"IFBD","text":"We found no catalyst in our sources; the most recent filing was an August 24 change of CEO and directors, and the only September 23 item is a market-commentary headline, so the move looks flow-dominant. On structure the desk is at caution: 8,188,574 shares outstanding as of December 31, 2025 (the outstanding count, not a float), with shelf capacity on an effective F-3 noted but not quantified, capacity, not proof of selling. The desk reads its cycle red, backside, an exit-and-avoid read rather than a setup, and it is up 47.3% since the previous checkpoint."},{"ticker":"APUS","text":"The most recent filing our sources found is a September 22 Form 8-K disclosing a 1-for-10 reverse split already effective July 24, a stale structural disclosure rather than a fresh catalyst; the desk grades the catalyst moderate / mixed / secondary, but the reverse split should push it higher into tomorrow's session. On structure the desk is at caution: 1,509,118 shares outstanding as of August 12, 2026 (the outstanding count, not a float), capacity noted but not quantified, capacity, not proof of selling. The desk reads its cycle yellow, frontside warning, and it is up 12.7% since the previous checkpoint."}]}]}
```

**499-13** (class 13 · clock time no source carries · keyed S1L1)
```json
{"headline":"","overall":null,"sections":[{"heading":"Into the open","lines":[{"ticker":"SPHL","text":"The catalyst our sources found is a 6-K filed September 23 at 15:05 ET with half-year results for the period ended June 30, 2026 (the EX-99.1 exhibit); a time-relevant event, though the excerpt does not establish a clearly positive surprise, so the desk grades it moderate / mixed / secondary. On structure the desk is at caution: 11,500,000 shares outstanding as of December 31, 2024 (the outstanding count, not a float), with a registered-resale F-1 on file, capacity, not proof of selling. No cycle call yet."},{"ticker":"APUS","text":"The most recent filing our sources found is a September 22 Form 8-K disclosing a 1-for-10 reverse split that was already effective July 24, a stale structural disclosure rather than a fresh catalyst, and the bundle identifies nothing that explains the move, so the desk grades the catalyst weak / negative / dilutive. On structure the desk is at caution: 1,509,118 shares outstanding as of August 12, 2026 (the outstanding count, not a float), with registered-resale, convertible and warrant capacity from the August 14 Form 10-Q noted but not quantified, capacity, not proof of selling. The desk reads its cycle yellow, frontside warning."}]}]}
```

**499-14** (class 14 · an exact time hedged · keyed S1L1)
```json
{"headline":"","overall":null,"sections":[{"heading":"Into the open","lines":[{"ticker":"SPHL","text":"The catalyst our sources found is a 6-K filed September 23 at about 16:30 ET with half-year results for the period ended June 30, 2026 (the EX-99.1 exhibit); a time-relevant event, though the excerpt does not establish a clearly positive surprise, so the desk grades it moderate / mixed / secondary. On structure the desk is at caution: 11,500,000 shares outstanding as of December 31, 2024 (the outstanding count, not a float), with a registered-resale F-1 on file, capacity, not proof of selling. No cycle call yet."},{"ticker":"APUS","text":"The most recent filing our sources found is a September 22 Form 8-K disclosing a 1-for-10 reverse split that was already effective July 24, a stale structural disclosure rather than a fresh catalyst, and the bundle identifies nothing that explains the move, so the desk grades the catalyst weak / negative / dilutive. On structure the desk is at caution: 1,509,118 shares outstanding as of August 12, 2026 (the outstanding count, not a float), with registered-resale, convertible and warrant capacity from the August 14 Form 10-Q noted but not quantified, capacity, not proof of selling. The desk reads its cycle yellow, frontside warning."}]}]}
```

**512-15** (class 15 · a catalyst number not in the cited text · keyed S1L2)
```json
{"headline":"","overall":null,"sections":[{"heading":"Into the close","lines":[{"ticker":"IFBD","text":"We found no catalyst in our sources; the most recent filing was an August 24 change of CEO and directors, and the only September 23 item is a market-commentary headline, so the move looks flow-dominant. On structure the desk is at caution: 8,188,574 shares outstanding as of December 31, 2025 (the outstanding count, not a float), with shelf capacity on an effective F-3 noted but not quantified, capacity, not proof of selling. The desk reads its cycle red, backside, an exit-and-avoid read rather than a setup."},{"ticker":"APUS","text":"The most recent filing our sources found is a September 22 Form 8-K disclosing a 1-for-10 reverse split that was already effective July 24 and a $12 million raise, a stale structural disclosure rather than a fresh catalyst, so the desk grades the catalyst moderate / mixed / secondary and our sources found nothing that explains the move. On structure the desk is at caution: 1,509,118 shares outstanding as of August 12, 2026 (the outstanding count, not a float), capacity noted but not quantified, capacity, not proof of selling. The desk reads its cycle yellow, frontside warning."}]}]}
```

**512-16** (class 16 · a date the research does not hold · keyed S1L2)
```json
{"headline":"","overall":null,"sections":[{"heading":"Into the close","lines":[{"ticker":"IFBD","text":"We found no catalyst in our sources; the most recent filing was an August 24 change of CEO and directors, and the only September 23 item is a market-commentary headline, so the move looks flow-dominant. On structure the desk is at caution: 8,188,574 shares outstanding as of December 31, 2025 (the outstanding count, not a float), with shelf capacity on an effective F-3 noted but not quantified, capacity, not proof of selling. The desk reads its cycle red, backside, an exit-and-avoid read rather than a setup."},{"ticker":"APUS","text":"The most recent filing our sources found is a September 22 Form 8-K disclosing a 1-for-10 reverse split that was already effective June 3, a stale structural disclosure rather than a fresh catalyst, so the desk grades the catalyst moderate / mixed / secondary and our sources found nothing that explains the move. On structure the desk is at caution: 1,509,118 shares outstanding as of August 12, 2026 (the outstanding count, not a float), capacity noted but not quantified, capacity, not proof of selling. The desk reads its cycle yellow, frontside warning."}]}]}
```

**512-17** (class 17 · company/country/business contradicting the dossier · keyed S1L2)
```json
{"headline":"","overall":null,"sections":[{"heading":"Into the close","lines":[{"ticker":"IFBD","text":"We found no catalyst in our sources; the most recent filing was an August 24 change of CEO and directors, and the only September 23 item is a market-commentary headline, so the move looks flow-dominant. On structure the desk is at caution: 8,188,574 shares outstanding as of December 31, 2025 (the outstanding count, not a float), with shelf capacity on an effective F-3 noted but not quantified, capacity, not proof of selling. The desk reads its cycle red, backside, an exit-and-avoid read rather than a setup."},{"ticker":"APUS","text":"A Canadian pharmaceutical company: the most recent filing our sources found is a September 22 Form 8-K disclosing a 1-for-10 reverse split that was already effective July 24, a stale structural disclosure rather than a fresh catalyst, so the desk grades the catalyst moderate / mixed / secondary. On structure the desk is at caution: 1,509,118 shares outstanding as of August 12, 2026 (the outstanding count, not a float), capacity noted but not quantified, capacity, not proof of selling. The desk reads its cycle yellow, frontside warning."}]}]}
```

**513-18** (class 18 · "what we think" prose beyond the reasoning · keyed S1L1)
```json
{"headline":"","overall":"Across the $1–$20 range, 2,419 traded after hours, 697 up, 559 down.","sections":[{"heading":"Overnight","lines":[{"ticker":"IFBD","text":"We found no catalyst in our sources; the most recent filing was an August 24 change of CEO and directors, and the only September 23 item is a market-commentary headline, so the move looks flow-dominant, and we think the missing catalyst means this is a pump that will collapse tomorrow. On structure the desk is at caution: 8,188,574 shares outstanding as of December 31, 2025 (the outstanding count, not a float), with shelf capacity on an effective F-3 noted but not quantified, capacity, not proof of selling. The desk reads its cycle red, backside, an exit-and-avoid read rather than a setup, and it is up 47.3% since the previous checkpoint."},{"ticker":"APUS","text":"The most recent filing our sources found is a September 22 Form 8-K disclosing a 1-for-10 reverse split already effective July 24, a stale structural disclosure rather than a fresh catalyst, so the desk grades the catalyst moderate / mixed / secondary. On structure the desk is at caution: 1,509,118 shares outstanding as of August 12, 2026 (the outstanding count, not a float), capacity noted but not quantified, capacity, not proof of selling. The desk reads its cycle yellow, frontside warning, and it is up 12.7% since the previous checkpoint."}]}]}
```

**513-19** (class 19 · a wrong after-hours total in overall · keyed O)
```json
{"headline":"","overall":"Across the $1–$20 range, 2,419 traded after hours, 795 up, 559 down.","sections":[{"heading":"Overnight","lines":[{"ticker":"IFBD","text":"We found no catalyst in our sources; the most recent filing was an August 24 change of CEO and directors, and the only September 23 item is a market-commentary headline, so the move looks flow-dominant. On structure the desk is at caution: 8,188,574 shares outstanding as of December 31, 2025 (the outstanding count, not a float), with shelf capacity on an effective F-3 noted but not quantified, capacity, not proof of selling. The desk reads its cycle red, backside, an exit-and-avoid read rather than a setup, and it is up 47.3% since the previous checkpoint."},{"ticker":"APUS","text":"The most recent filing our sources found is a September 22 Form 8-K disclosing a 1-for-10 reverse split already effective July 24, a stale structural disclosure rather than a fresh catalyst, so the desk grades the catalyst moderate / mixed / secondary. On structure the desk is at caution: 1,509,118 shares outstanding as of August 12, 2026 (the outstanding count, not a float), capacity noted but not quantified, capacity, not proof of selling. The desk reads its cycle yellow, frontside warning, and it is up 12.7% since the previous checkpoint."}]}]}
```

---

## Keyed-line table

| variant | class | keyed line | why struck |
|---|---|---|---|
| 512-01 | 1 number in no stored field | S1L2 (APUS) | 1,742,860 not stored (true 1,509,118) |
| 513-02 | 2 number from another checkpoint | S1L2 (APUS) | 122.3% is the close session %, not the recap delta |
| 513-03 | 3 wrong basis | S1L1 (IFBD) | 43.4% is CURRENT_SESSION, stated "from the prior close" |
| 512-04 | 4 unsupportable absence | S1L1 (IFBD) | "dropped off the board" while #1 |
| 513-05 | 5 rank of another checkpoint | S1L2 (APUS) | "third-ranked" while #8 at the recap |
| 513-06 | 6 unobservable cause | S1L1 (IFBD) | halt asserted from TRADING → UNKNOWN (lost observability) |
| 512-07 | 7 em dash | S1L2 (APUS) | U+2014 |
| 499-08 | 8 spaced-hyphen dash | S1L1 (SPHL) | " - " used as a dash |
| 499-09 | 9 name count written | S1L1 (SPHL) | "three names on watch" |
| 512-10 | 10 shares called float | S1L2 (APUS) | outstanding count called "float" |
| 512-11 | 11 shares undated | S1L2 (APUS) | as-of date removed |
| 513-12 | 12 catalyst fit / forecast | S1L2 (APUS) | "should push it higher into tomorrow" |
| 499-13 | 13 clock time no source carries | S1L1 (SPHL) | "15:05 ET" vs the 16:30 source time |
| 499-14 | 14 exact time hedged | S1L1 (SPHL) | "about 16:30 ET" on an exact time |
| 512-15 | 15 catalyst number not cited | S1L2 (APUS) | "$12 million raise" invented |
| 512-16 | 16 date not held | S1L2 (APUS) | effective "June 3" vs July 24 |
| 512-17 | 17 company/country contradiction | S1L2 (APUS) | "Canadian" vs NJ/US |
| 513-18 | 18 prose beyond the reasoning | S1L1 (IFBD) | added opinion + forecast |
| 513-19 | 19 wrong AH total in overall | O | "795 up" is the all-rows count; true traded-only up is 697 |

Classes 1 and 2 both read as "not in this row" to a single-checkpoint checker; the bar
is struck, not classified.

## Regression controls (control lines that must be ADMITTED)

These true lines exercise the checker's admission of approved forms; a strike on any is
a checker false-positive, not a set defect:

- **499-C S1L1 (SPHL):** SEC forms 6-K, EX-99.1, F-1; the fiscal-period phrase
  "half-year results for the period ended June 30, 2026"; the matching dates
  (September 23, June 30 2026, December 31 2024).
- **509-C S1L2 (APUS):** the rounded figure "About 1.5 million shares" for 1,509,118.
- **512-C S1L2 (APUS):** SEC form 8-K; "(the outstanding count, not a float)".
- **512-C S1L1 (IFBD):** SEC form F-3; "no catalyst … found" as an absence about our
  sources; the cycle rendered "red, backside, an exit-and-avoid read".
- **513-C O (overall):** the en-dash range "$1–$20" (U+2013, admitted; only U+2014 is
  banned).
- Every structure line carries "(the outstanding count, not a float)".
