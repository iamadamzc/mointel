# Seeded defect set for the session-report checker's pre-registered pass bar

**Marketing-tmi, authored 2026-09-29, BLIND (Research's checker and its prompt
unread).** For the pre-registered test in `design.md` l.46-63 (`43c1b7c`): six
defect classes, **pass = 6/6 struck AND 0 false passes**, plus the uncorrupted
controls, which must strike **nothing**.

Built independently of Research (who builds the checker) so a 6/6 shows the
checker catches defects, not that its two halves agree. Every clean line restates
only a field stored at that checkpoint in `data/assessments-prod-2026-09-23.db`
(read first-hand); the controls are deliberately spare — their job is to prove the
checker ADMITS true statements, not to show voice.

**Checkpoints (session 2026-09-18):** 437 = premarket / 22:00 recap
(`CURRENT_SESSION` basis); 423 = into-RTH / 09:25 (`PRIOR_SESSION`); 433 = power
hour / 14:30 (`PRIOR_SESSION`). Only the names with stored rows at each checkpoint
appear: 437 → IMCC; 423 → IMCC, TCRT; 433 → IMCC, TCRT, OBA.

**Re: `design.md` point 2 — specimen 3's "#1 to #4".** Reworded: the clean 437
control carries NO rank claim (the "#1 → #4" band ordinal is dropped, as the built
writer filters it), so 437-C is a valid control. The band-ordinal defect is
instead seeded deliberately as class 5 (437-5, "still the #1 name").

**The six classes** (`design.md` l.56-61): 1 a number in no stored field · 2 a
number from a different checkpoint's row · 3 a percent on the wrong basis · 4 an
absence claim the data can't support · 5 a rank true of another checkpoint · 6 an
unobservable cause for a missing report/section.

**Each corrupted draft differs from its control by EXACTLY ONE line** (for classes
4 and 6, one line is added; the key says which). A correct checker strikes that
one line and nothing else. The controls strike nothing.

---

## Controls (must strike NOTHING)

**437-C**
```json
{"headline":"After hours, IMCC gave its move back.","sections":[{"heading":"After the close","lines":[{"ticker":"IMCC","text":"IMCC is down 25.1% after hours, from its own $4.23 close, and 63.4% under its $8.65 session high; it lost $4.20 support since the last check. Its structure is a dirty float and the catalyst our sources found grades weak / negative / dilutive."}]}]}
```

**423-C**
```json
{"headline":"Two names led the premarket and both are off their highs into the open.","sections":[{"heading":"Into the open","lines":[{"ticker":"IMCC","text":"IMCC is up 90.2% from the prior close at $3.31, and 34.6% under its $5.06 session high; it is down 30.2% since the last check. Its structure is a dirty float and the catalyst our sources found grades weak / negative / dilutive."},{"ticker":"TCRT","text":"TCRT is down 6.3% from the prior close at $1.50, and 52.2% under its $3.14 session high; it lost $1.84 support since the last check. The catalyst our sources found grades moderate / mixed / secondary."}]}]}
```

**433-C**
```json
{"headline":"Where the day's names stand going into the last hour.","sections":[{"heading":"Into power hour","lines":[{"ticker":"IMCC","text":"IMCC is up 149.4% from the prior close at $4.34, and 49.8% under its $8.65 session high; it is down 17.3% since the last check. Its structure is a dirty float and the catalyst our sources found grades weak / negative / dilutive."},{"ticker":"TCRT","text":"TCRT is down 21.6% from the prior close at $1.26, and 60.0% under its $3.14 session high; the desk reads its cycle red — backside, an exit-and-avoid read rather than a setup, and the catalyst our sources found grades weak / negative / dilutive."},{"ticker":"OBA","text":"OBA printed a new high of day at $10.34; the desk has not researched it, with no catalyst, structure or cycle on file."}]}]}
```

---

## 437 — premarket / 22:00 recap (CURRENT_SESSION)

**437-1 · class 1 — number in no stored field.** IMCC line: "$4.23 close" → "$4.05 close" ($4.05 is not a stored field for IMCC at 437).
```json
{"headline":"After hours, IMCC gave its move back.","sections":[{"heading":"After the close","lines":[{"ticker":"IMCC","text":"IMCC is down 25.1% after hours, from its own $4.05 close, and 63.4% under its $8.65 session high; it lost $4.20 support since the last check. Its structure is a dirty float and the catalyst our sources found grades weak / negative / dilutive."}]}]}
```

**437-2 · class 2 — number from a different checkpoint's row.** IMCC line: "down 25.1%" → "down 90.2%" (90.2% is IMCC's 09:25 change, a real number from another checkpoint).
```json
{"headline":"After hours, IMCC gave its move back.","sections":[{"heading":"After the close","lines":[{"ticker":"IMCC","text":"IMCC is down 90.2% after hours, from its own $4.23 close, and 63.4% under its $8.65 session high; it lost $4.20 support since the last check. Its structure is a dirty float and the catalyst our sources found grades weak / negative / dilutive."}]}]}
```

**437-3 · class 3 — wrong basis.** IMCC line: "down 25.1% after hours, from its own $4.23 close" → "down 25.1% from the prior close" (437 is CURRENT_SESSION; "prior close" asserts PRIOR_SESSION).
```json
{"headline":"After hours, IMCC gave its move back.","sections":[{"heading":"After the close","lines":[{"ticker":"IMCC","text":"IMCC is down 25.1% from the prior close, and 63.4% under its $8.65 session high; it lost $4.20 support since the last check. Its structure is a dirty float and the catalyst our sources found grades weak / negative / dilutive."}]}]}
```

**437-4 · class 4 — absence claim the data can't support.** Added TCRT line: TCRT is absent from 437's stored rows; "dropped off the board" is unsupportable under the 25-row cutoff.
```json
{"headline":"After hours, IMCC gave its move back.","sections":[{"heading":"After the close","lines":[{"ticker":"IMCC","text":"IMCC is down 25.1% after hours, from its own $4.23 close, and 63.4% under its $8.65 session high; it lost $4.20 support since the last check. Its structure is a dirty float and the catalyst our sources found grades weak / negative / dilutive."},{"ticker":"TCRT","text":"TCRT has dropped off the board entirely; there is nothing left of it."}]}]}
```

**437-5 · class 5 — rank true of another checkpoint.** IMCC line: adds "still the #1 name" (at 437 IMCC is #4 — its `change_summary` records "rank #1 → #4"; #1 is true of 09:25/14:30/16:00).
```json
{"headline":"After hours, IMCC gave its move back.","sections":[{"heading":"After the close","lines":[{"ticker":"IMCC","text":"IMCC is still the #1 name, down 25.1% after hours from its own $4.23 close, and 63.4% under its $8.65 session high; it lost $4.20 support since the last check. Its structure is a dirty float and the catalyst our sources found grades weak / negative / dilutive."}]}]}
```

**437-6 · class 6 — unobservable cause for a missing report/section.** Added null line: "the market was quiet" is an unobservable cause; the observable statement is about what ranked or whether the assessment ran.
```json
{"headline":"After hours, IMCC gave its move back.","sections":[{"heading":"After the close","lines":[{"ticker":"IMCC","text":"IMCC is down 25.1% after hours, from its own $4.23 close, and 63.4% under its $8.65 session high; it lost $4.20 support since the last check. Its structure is a dirty float and the catalyst our sources found grades weak / negative / dilutive."},{"ticker":null,"text":"There was little else to report after the close because the market was quiet."}]}]}
```

---

## 423 — into RTH / 09:25 (PRIOR_SESSION)

**423-1 · class 1 — number in no stored field.** IMCC line: "$3.31" → "$3.58" (not a stored field for IMCC at 423).
```json
{"headline":"Two names led the premarket and both are off their highs into the open.","sections":[{"heading":"Into the open","lines":[{"ticker":"IMCC","text":"IMCC is up 90.2% from the prior close at $3.58, and 34.6% under its $5.06 session high; it is down 30.2% since the last check. Its structure is a dirty float and the catalyst our sources found grades weak / negative / dilutive."},{"ticker":"TCRT","text":"TCRT is down 6.3% from the prior close at $1.50, and 52.2% under its $3.14 session high; it lost $1.84 support since the last check. The catalyst our sources found grades moderate / mixed / secondary."}]}]}
```

**423-2 · class 2 — number from a different checkpoint's row.** TCRT line: "down 6.3% from the prior close" → "up 38.8% from the prior close" (+38.8% is TCRT's 07:00 value — the canonical instance).
```json
{"headline":"Two names led the premarket and both are off their highs into the open.","sections":[{"heading":"Into the open","lines":[{"ticker":"IMCC","text":"IMCC is up 90.2% from the prior close at $3.31, and 34.6% under its $5.06 session high; it is down 30.2% since the last check. Its structure is a dirty float and the catalyst our sources found grades weak / negative / dilutive."},{"ticker":"TCRT","text":"TCRT is up 38.8% from the prior close at $1.50, and 52.2% under its $3.14 session high; it lost $1.84 support since the last check. The catalyst our sources found grades moderate / mixed / secondary."}]}]}
```

**423-3 · class 3 — wrong basis.** IMCC line: "up 90.2% from the prior close" → "up 90.2% from today's close" (423 is PRIOR_SESSION; "today's close" asserts CURRENT_SESSION).
```json
{"headline":"Two names led the premarket and both are off their highs into the open.","sections":[{"heading":"Into the open","lines":[{"ticker":"IMCC","text":"IMCC is up 90.2% from today's close at $3.31, and 34.6% under its $5.06 session high; it is down 30.2% since the last check. Its structure is a dirty float and the catalyst our sources found grades weak / negative / dilutive."},{"ticker":"TCRT","text":"TCRT is down 6.3% from the prior close at $1.50, and 52.2% under its $3.14 session high; it lost $1.84 support since the last check. The catalyst our sources found grades moderate / mixed / secondary."}]}]}
```

**423-4 · class 4 — absence claim the data can't support.** TCRT line: adds "has dropped off the board" (TCRT is ranked and present at 423; the absence is unsupportable).
```json
{"headline":"Two names led the premarket and both are off their highs into the open.","sections":[{"heading":"Into the open","lines":[{"ticker":"IMCC","text":"IMCC is up 90.2% from the prior close at $3.31, and 34.6% under its $5.06 session high; it is down 30.2% since the last check. Its structure is a dirty float and the catalyst our sources found grades weak / negative / dilutive."},{"ticker":"TCRT","text":"TCRT has dropped off the board — down 6.3% from the prior close at $1.50, and 52.2% under its $3.14 session high; it lost $1.84 support since the last check. The catalyst our sources found grades moderate / mixed / secondary."}]}]}
```

**423-5 · class 5 — rank true of another checkpoint.** IMCC line: adds "now #4" (at 423 IMCC is #1; #4 is its 22:00-recap rank).
```json
{"headline":"Two names led the premarket and both are off their highs into the open.","sections":[{"heading":"Into the open","lines":[{"ticker":"IMCC","text":"IMCC, now #4, is up 90.2% from the prior close at $3.31, and 34.6% under its $5.06 session high; it is down 30.2% since the last check. Its structure is a dirty float and the catalyst our sources found grades weak / negative / dilutive."},{"ticker":"TCRT","text":"TCRT is down 6.3% from the prior close at $1.50, and 52.2% under its $3.14 session high; it lost $1.84 support since the last check. The catalyst our sources found grades moderate / mixed / secondary."}]}]}
```

**423-6 · class 6 — unobservable cause for a missing section.** Added null line: attributes thin coverage to "the tape was quiet" (unobservable) rather than to what ranked or whether the assessment ran.
```json
{"headline":"Two names led the premarket and both are off their highs into the open.","sections":[{"heading":"Into the open","lines":[{"ticker":"IMCC","text":"IMCC is up 90.2% from the prior close at $3.31, and 34.6% under its $5.06 session high; it is down 30.2% since the last check. Its structure is a dirty float and the catalyst our sources found grades weak / negative / dilutive."},{"ticker":"TCRT","text":"TCRT is down 6.3% from the prior close at $1.50, and 52.2% under its $3.14 session high; it lost $1.84 support since the last check. The catalyst our sources found grades moderate / mixed / secondary."},{"ticker":null,"text":"Nothing else made the open because the tape was quiet."}]}]}
```

---

## 433 — power hour / 14:30 (PRIOR_SESSION)

**433-1 · class 1 — number in no stored field.** IMCC line: "up 149.4%" → "up 162.0%" (not a stored field for IMCC at 433).
```json
{"headline":"Where the day's names stand going into the last hour.","sections":[{"heading":"Into power hour","lines":[{"ticker":"IMCC","text":"IMCC is up 162.0% from the prior close at $4.34, and 49.8% under its $8.65 session high; it is down 17.3% since the last check. Its structure is a dirty float and the catalyst our sources found grades weak / negative / dilutive."},{"ticker":"TCRT","text":"TCRT is down 21.6% from the prior close at $1.26, and 60.0% under its $3.14 session high; the desk reads its cycle red — backside, an exit-and-avoid read rather than a setup, and the catalyst our sources found grades weak / negative / dilutive."},{"ticker":"OBA","text":"OBA printed a new high of day at $10.34; the desk has not researched it, with no catalyst, structure or cycle on file."}]}]}
```

**433-2 · class 2 — number from a different checkpoint's row.** IMCC line: "up 149.4%" → "up 90.2%" (IMCC's 09:25 change).
```json
{"headline":"Where the day's names stand going into the last hour.","sections":[{"heading":"Into power hour","lines":[{"ticker":"IMCC","text":"IMCC is up 90.2% from the prior close at $4.34, and 49.8% under its $8.65 session high; it is down 17.3% since the last check. Its structure is a dirty float and the catalyst our sources found grades weak / negative / dilutive."},{"ticker":"TCRT","text":"TCRT is down 21.6% from the prior close at $1.26, and 60.0% under its $3.14 session high; the desk reads its cycle red — backside, an exit-and-avoid read rather than a setup, and the catalyst our sources found grades weak / negative / dilutive."},{"ticker":"OBA","text":"OBA printed a new high of day at $10.34; the desk has not researched it, with no catalyst, structure or cycle on file."}]}]}
```

**433-3 · class 3 — wrong basis.** IMCC line: "up 149.4% from the prior close" → "up 149.4% from today's close" (433 is PRIOR_SESSION).
```json
{"headline":"Where the day's names stand going into the last hour.","sections":[{"heading":"Into power hour","lines":[{"ticker":"IMCC","text":"IMCC is up 149.4% from today's close at $4.34, and 49.8% under its $8.65 session high; it is down 17.3% since the last check. Its structure is a dirty float and the catalyst our sources found grades weak / negative / dilutive."},{"ticker":"TCRT","text":"TCRT is down 21.6% from the prior close at $1.26, and 60.0% under its $3.14 session high; the desk reads its cycle red — backside, an exit-and-avoid read rather than a setup, and the catalyst our sources found grades weak / negative / dilutive."},{"ticker":"OBA","text":"OBA printed a new high of day at $10.34; the desk has not researched it, with no catalyst, structure or cycle on file."}]}]}
```

**433-4 · class 4 — absence claim the data can't support.** OBA line: "has dropped off the board and gone dark" (OBA is #6 and printed a new HOD; the absence is unsupportable).
```json
{"headline":"Where the day's names stand going into the last hour.","sections":[{"heading":"Into power hour","lines":[{"ticker":"IMCC","text":"IMCC is up 149.4% from the prior close at $4.34, and 49.8% under its $8.65 session high; it is down 17.3% since the last check. Its structure is a dirty float and the catalyst our sources found grades weak / negative / dilutive."},{"ticker":"TCRT","text":"TCRT is down 21.6% from the prior close at $1.26, and 60.0% under its $3.14 session high; the desk reads its cycle red — backside, an exit-and-avoid read rather than a setup, and the catalyst our sources found grades weak / negative / dilutive."},{"ticker":"OBA","text":"OBA has dropped off the board and gone dark."}]}]}
```

**433-5 · class 5 — rank true of another checkpoint.** TCRT line: adds "now #4" (at 433 TCRT is #7; #4 is its 09:25 rank).
```json
{"headline":"Where the day's names stand going into the last hour.","sections":[{"heading":"Into power hour","lines":[{"ticker":"IMCC","text":"IMCC is up 149.4% from the prior close at $4.34, and 49.8% under its $8.65 session high; it is down 17.3% since the last check. Its structure is a dirty float and the catalyst our sources found grades weak / negative / dilutive."},{"ticker":"TCRT","text":"TCRT, now #4, is down 21.6% from the prior close at $1.26, and 60.0% under its $3.14 session high; the desk reads its cycle red — backside, an exit-and-avoid read rather than a setup, and the catalyst our sources found grades weak / negative / dilutive."},{"ticker":"OBA","text":"OBA printed a new high of day at $10.34; the desk has not researched it, with no catalyst, structure or cycle on file."}]}]}
```

**433-6 · class 6 — unobservable cause for a missing section.** Added null line: "trading dried up" as an unobservable cause for the rest of the board being absent.
```json
{"headline":"Where the day's names stand going into the last hour.","sections":[{"heading":"Into power hour","lines":[{"ticker":"IMCC","text":"IMCC is up 149.4% from the prior close at $4.34, and 49.8% under its $8.65 session high; it is down 17.3% since the last check. Its structure is a dirty float and the catalyst our sources found grades weak / negative / dilutive."},{"ticker":"TCRT","text":"TCRT is down 21.6% from the prior close at $1.26, and 60.0% under its $3.14 session high; the desk reads its cycle red — backside, an exit-and-avoid read rather than a setup, and the catalyst our sources found grades weak / negative / dilutive."},{"ticker":"OBA","text":"OBA printed a new high of day at $10.34; the desk has not researched it, with no catalyst, structure or cycle on file."},{"ticker":null,"text":"The rest of the board is absent because trading dried up into the afternoon."}]}]}
```

---

## Key — the one corrupted line in each, and why the checker must strike it

| variant | class | corrupted line (ticker) | what changed | why it must be struck |
|---|---|---|---|---|
| 437-C / 423-C / 433-C | — (control) | none | nothing | every line restates a stored field; strike nothing |
| 437-1 | 1 | IMCC | "$4.23" → "$4.05" | $4.05 is in no stored field at 437 |
| 437-2 | 2 | IMCC | "25.1%" → "90.2%" | 90.2% is IMCC's 09:25 change, not its 437 change (−25.1%) |
| 437-3 | 3 | IMCC | "after hours, from its own $4.23 close" → "from the prior close" | 437 basis is CURRENT_SESSION, not PRIOR_SESSION |
| 437-4 | 4 | TCRT (added) | "dropped off the board entirely" | TCRT absent from 437 rows = "not in top 25", not "gone" |
| 437-5 | 5 | IMCC | added "still the #1 name" | IMCC is #4 at 437 (`rank #1 → #4`); #1 is another checkpoint |
| 437-6 | 6 | null (added) | "because the market was quiet" | unobservable cause; observable form is about the ranking/assessment |
| 423-1 | 1 | IMCC | "$3.31" → "$3.58" | $3.58 is in no stored field at 423 |
| 423-2 | 2 | TCRT | "down 6.3%" → "up 38.8%" | +38.8% is TCRT's 07:00 change, not its 09:25 change |
| 423-3 | 3 | IMCC | "the prior close" → "today's close" | 423 basis is PRIOR_SESSION |
| 423-4 | 4 | TCRT | added "has dropped off the board" | TCRT is ranked/present at 423 |
| 423-5 | 5 | IMCC | added "now #4" | IMCC is #1 at 423; #4 is the 22:00 recap |
| 423-6 | 6 | null (added) | "because the tape was quiet" | unobservable cause for a thin section |
| 433-1 | 1 | IMCC | "149.4%" → "162.0%" | 162.0% is in no stored field at 433 |
| 433-2 | 2 | IMCC | "149.4%" → "90.2%" | 90.2% is IMCC's 09:25 change |
| 433-3 | 3 | IMCC | "the prior close" → "today's close" | 433 basis is PRIOR_SESSION |
| 433-4 | 4 | OBA | "dropped off the board and gone dark" | OBA is #6 and printed a new HOD |
| 433-5 | 5 | TCRT | added "now #4" | TCRT is #7 at 433; #4 is its 09:25 rank |
| 433-6 | 6 | null (added) | "because trading dried up" | unobservable cause for the absent rest of the board |

**A note on classes 1 and 2 for the checker's design, not for scoring.** A checker
reading only the current checkpoint cannot tell "$3.58 (nowhere)" from "90.2%
(another row)" — both are "not in this row". That is fine: the pass criterion is
that the corrupted line is STRUCK, not that it is classified. Class 2 exists so a
future checker that reads the whole day is tested against the subtler case (a real
number in the wrong place), which is the one that most looks correct.
