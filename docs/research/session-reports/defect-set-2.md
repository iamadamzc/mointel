# Seeded defect set 2 for the session-report checker's pass bar

**Marketing-tmi, authored 2026-09-30. INFORMED AUTHOR (read RUN 1's causes), BLIND
TO THE CHECKER AND ITS FIX.** I have not read `check.ts`, its fix, or the new
frozen sha; I have read RUN 1's five false-strike causes. Per Integration's ruling
(informed authorship, guardrailed): the four run-1-struck approved forms are placed
DELIBERATELY in the controls, keyed as REGRESSION CONTROLS, so run 2 is a direct
regression test that the fix now admits them; every other control is written in v3
voice with no steering, keyed ORDINARY.

For the pre-registered test in `design.md` l.46-63 (`43c1b7c`): six defect classes,
**pass = 6/6 struck AND 0 false passes**, plus controls that must strike **nothing**.

**Fresh material (run 1's controls are burned):** session **2026-09-22**, $1–$20,
read first-hand from `data/assessments-prod-2026-09-23.db`. Checkpoints: 475 =
premarket / 22:00 recap (`CURRENT_SESSION` basis); 461 = into-RTH / 09:25
(`PRIOR_SESSION`); 471 = power hour / 14:30 (`PRIOR_SESSION`). Ranks below are
**in-range** (position among $1–$20 names). Names used: DCOY, SVRE, EPSM, FLNA, STI,
RAIN.

**The four regression forms and where each is placed (keyed REGRESSION):**
1. a stored note as a change since the previous checkpoint → DCOY at recap ("up
   19.5% since the previous checkpoint"). *Run 1's exact instance was "lost $X
   support since the last check"; 09-22 offers "+19.5% since prior assessment",
   which exercises the same checker rule (a stored note framed since-previous).*
2. "no catalyst … on file" (NOT_ANALYZED) → SVRE at recap.
3. the report kind's own framing → power-hour headline ("Going into the last hour").
4. "exit-and-avoid" for RED_BACKSIDE (`commercial.md` §6) → DCOY at power hour.

**Each corrupted draft differs from its control by EXACTLY ONE line** (classes 4
and 6 add a line; the key says which). A correct checker strikes that one line and
nothing else. The controls strike nothing.

---

## Controls (must strike NOTHING)

**475-C (recap)**
```json
{"headline":"Into the premarket.","sections":[{"heading":"After the close","lines":[{"ticker":"DCOY","text":"DCOY is up 20.6% after hours, from the regular-session close of $3.10, and 50.9% under its $7.61 session high; it's up 19.5% since the previous checkpoint. Its structure is a dirty float and the catalyst our sources found grades moderate / mixed / secondary."},{"ticker":"SVRE","text":"SVRE is down 15.0% after hours, from the regular-session close of $2.80, and 24.7% under its $3.16 session high; the desk has not researched it, with no catalyst, structure or cycle on file."},{"ticker":"EPSM","text":"EPSM is down 0.6% after hours, from the regular-session close of $1.61, and 17.4% under its $1.94 session high; our sources reached no conclusion on its catalyst."}]}]}
```

**461-C (into the open)**
```json
{"headline":"Into the open.","sections":[{"heading":"Into the open","lines":[{"ticker":"DCOY","text":"DCOY is up 104.3% from the prior close at $5.23, and 9.2% under its $5.76 session high; the desk reads its cycle yellow — frontside warning, its structure a dirty float, and the catalyst our sources found grades moderate / mixed / secondary."},{"ticker":"FLNA","text":"FLNA is up 36.6% from the prior close at $1.01, and 17.2% under its $1.22 session high; the desk reads its cycle green — fresh / frontside and the catalyst our sources found grades strong."},{"ticker":"STI","text":"STI is up 10.2% from the prior close at $8.00, and 27.3% under its $11.00 session high; its structure is a dirty float and the catalyst our sources found grades moderate / mixed / secondary."}]}]}
```

**471-C (power hour)**
```json
{"headline":"Going into the last hour.","sections":[{"heading":"Into the last hour","lines":[{"ticker":"DCOY","text":"DCOY is up 28.5% from the prior close at $3.29, and 56.8% under its $7.61 session high; the desk reads its cycle red — backside, an exit-and-avoid read rather than a setup, and the catalyst our sources found grades moderate / mixed / secondary."},{"ticker":"FLNA","text":"FLNA is up 48.7% from the prior close at $1.10, and 15.4% under its $1.30 session high; the desk reads its cycle green — fresh / frontside and the catalyst our sources found grades legitimate positive."},{"ticker":"RAIN","text":"RAIN is halted at this checkpoint — up 96.7% from the prior close at $1.30 and up 26.1% since the previous checkpoint, it printed a new high of day and has slipped to 15.6% under its session high; the desk reads its cycle yellow — frontside warning and our sources reached no conclusion on its catalyst."}]}]}
```

---

## 475 — premarket / 22:00 recap (CURRENT_SESSION)

**475-1 · class 1 — number in no stored field.** DCOY: "$3.10" close → "$3.61" (not a stored field for DCOY at 475).
```json
{"headline":"Into the premarket.","sections":[{"heading":"After the close","lines":[{"ticker":"DCOY","text":"DCOY is up 20.6% after hours, from the regular-session close of $3.61, and 50.9% under its $7.61 session high; it's up 19.5% since the previous checkpoint. Its structure is a dirty float and the catalyst our sources found grades moderate / mixed / secondary."},{"ticker":"SVRE","text":"SVRE is down 15.0% after hours, from the regular-session close of $2.80, and 24.7% under its $3.16 session high; the desk has not researched it, with no catalyst, structure or cycle on file."},{"ticker":"EPSM","text":"EPSM is down 0.6% after hours, from the regular-session close of $1.61, and 17.4% under its $1.94 session high; our sources reached no conclusion on its catalyst."}]}]}
```

**475-2 · class 2 — number from a different checkpoint's row.** DCOY: "up 20.6%" → "up 104.3%" (DCOY's 09:25 change).
```json
{"headline":"Into the premarket.","sections":[{"heading":"After the close","lines":[{"ticker":"DCOY","text":"DCOY is up 104.3% after hours, from the regular-session close of $3.10, and 50.9% under its $7.61 session high; it's up 19.5% since the previous checkpoint. Its structure is a dirty float and the catalyst our sources found grades moderate / mixed / secondary."},{"ticker":"SVRE","text":"SVRE is down 15.0% after hours, from the regular-session close of $2.80, and 24.7% under its $3.16 session high; the desk has not researched it, with no catalyst, structure or cycle on file."},{"ticker":"EPSM","text":"EPSM is down 0.6% after hours, from the regular-session close of $1.61, and 17.4% under its $1.94 session high; our sources reached no conclusion on its catalyst."}]}]}
```

**475-3 · class 3 — wrong basis.** DCOY: "after hours, from the regular-session close of $3.10" → "from the prior close" (475 is CURRENT_SESSION).
```json
{"headline":"Into the premarket.","sections":[{"heading":"After the close","lines":[{"ticker":"DCOY","text":"DCOY is up 20.6% from the prior close, and 50.9% under its $7.61 session high; it's up 19.5% since the previous checkpoint. Its structure is a dirty float and the catalyst our sources found grades moderate / mixed / secondary."},{"ticker":"SVRE","text":"SVRE is down 15.0% after hours, from the regular-session close of $2.80, and 24.7% under its $3.16 session high; the desk has not researched it, with no catalyst, structure or cycle on file."},{"ticker":"EPSM","text":"EPSM is down 0.6% after hours, from the regular-session close of $1.61, and 17.4% under its $1.94 session high; our sources reached no conclusion on its catalyst."}]}]}
```

**475-4 · class 4 — absence claim the data can't support.** Added STI line: STI is absent from 475's rows; "dropped off the board" is unsupportable under the 25-row cutoff.
```json
{"headline":"Into the premarket.","sections":[{"heading":"After the close","lines":[{"ticker":"DCOY","text":"DCOY is up 20.6% after hours, from the regular-session close of $3.10, and 50.9% under its $7.61 session high; it's up 19.5% since the previous checkpoint. Its structure is a dirty float and the catalyst our sources found grades moderate / mixed / secondary."},{"ticker":"SVRE","text":"SVRE is down 15.0% after hours, from the regular-session close of $2.80, and 24.7% under its $3.16 session high; the desk has not researched it, with no catalyst, structure or cycle on file."},{"ticker":"STI","text":"STI has dropped off the board entirely; there is nothing left of it."}]}]}
```

**475-5 · class 5 — rank true of another checkpoint.** EPSM: adds "now #2" (EPSM is #6 in-range at 475; #2 at power hour and close).
```json
{"headline":"Into the premarket.","sections":[{"heading":"After the close","lines":[{"ticker":"DCOY","text":"DCOY is up 20.6% after hours, from the regular-session close of $3.10, and 50.9% under its $7.61 session high; it's up 19.5% since the previous checkpoint. Its structure is a dirty float and the catalyst our sources found grades moderate / mixed / secondary."},{"ticker":"SVRE","text":"SVRE is down 15.0% after hours, from the regular-session close of $2.80, and 24.7% under its $3.16 session high; the desk has not researched it, with no catalyst, structure or cycle on file."},{"ticker":"EPSM","text":"EPSM, now #2, is down 0.6% after hours, from the regular-session close of $1.61, and 17.4% under its $1.94 session high; our sources reached no conclusion on its catalyst."}]}]}
```

**475-6 · class 6 — unobservable cause for a missing section.** Added null line: "the market was quiet" is an unobservable cause.
```json
{"headline":"Into the premarket.","sections":[{"heading":"After the close","lines":[{"ticker":"DCOY","text":"DCOY is up 20.6% after hours, from the regular-session close of $3.10, and 50.9% under its $7.61 session high; it's up 19.5% since the previous checkpoint. Its structure is a dirty float and the catalyst our sources found grades moderate / mixed / secondary."},{"ticker":"SVRE","text":"SVRE is down 15.0% after hours, from the regular-session close of $2.80, and 24.7% under its $3.16 session high; the desk has not researched it, with no catalyst, structure or cycle on file."},{"ticker":"EPSM","text":"EPSM is down 0.6% after hours, from the regular-session close of $1.61, and 17.4% under its $1.94 session high; our sources reached no conclusion on its catalyst."},{"ticker":null,"text":"There was little else after the close because the market was quiet."}]}]}
```

---

## 461 — into RTH / 09:25 (PRIOR_SESSION)

**461-1 · class 1 — number in no stored field.** FLNA: "$1.01" → "$1.14" (not a stored field for FLNA at 461).
```json
{"headline":"Into the open.","sections":[{"heading":"Into the open","lines":[{"ticker":"DCOY","text":"DCOY is up 104.3% from the prior close at $5.23, and 9.2% under its $5.76 session high; the desk reads its cycle yellow — frontside warning, its structure a dirty float, and the catalyst our sources found grades moderate / mixed / secondary."},{"ticker":"FLNA","text":"FLNA is up 36.6% from the prior close at $1.14, and 17.2% under its $1.22 session high; the desk reads its cycle green — fresh / frontside and the catalyst our sources found grades strong."},{"ticker":"STI","text":"STI is up 10.2% from the prior close at $8.00, and 27.3% under its $11.00 session high; its structure is a dirty float and the catalyst our sources found grades moderate / mixed / secondary."}]}]}
```

**461-2 · class 2 — number from a different checkpoint's row.** DCOY: "up 104.3%" → "up 28.5%" (DCOY's 14:30 change).
```json
{"headline":"Into the open.","sections":[{"heading":"Into the open","lines":[{"ticker":"DCOY","text":"DCOY is up 28.5% from the prior close at $5.23, and 9.2% under its $5.76 session high; the desk reads its cycle yellow — frontside warning, its structure a dirty float, and the catalyst our sources found grades moderate / mixed / secondary."},{"ticker":"FLNA","text":"FLNA is up 36.6% from the prior close at $1.01, and 17.2% under its $1.22 session high; the desk reads its cycle green — fresh / frontside and the catalyst our sources found grades strong."},{"ticker":"STI","text":"STI is up 10.2% from the prior close at $8.00, and 27.3% under its $11.00 session high; its structure is a dirty float and the catalyst our sources found grades moderate / mixed / secondary."}]}]}
```

**461-3 · class 3 — wrong basis.** DCOY: "from the prior close" → "from today's close" (461 is PRIOR_SESSION).
```json
{"headline":"Into the open.","sections":[{"heading":"Into the open","lines":[{"ticker":"DCOY","text":"DCOY is up 104.3% from today's close at $5.23, and 9.2% under its $5.76 session high; the desk reads its cycle yellow — frontside warning, its structure a dirty float, and the catalyst our sources found grades moderate / mixed / secondary."},{"ticker":"FLNA","text":"FLNA is up 36.6% from the prior close at $1.01, and 17.2% under its $1.22 session high; the desk reads its cycle green — fresh / frontside and the catalyst our sources found grades strong."},{"ticker":"STI","text":"STI is up 10.2% from the prior close at $8.00, and 27.3% under its $11.00 session high; its structure is a dirty float and the catalyst our sources found grades moderate / mixed / secondary."}]}]}
```

**461-4 · class 4 — absence claim the data can't support.** FLNA: adds "has dropped off the board" (FLNA is ranked and present at 461).
```json
{"headline":"Into the open.","sections":[{"heading":"Into the open","lines":[{"ticker":"DCOY","text":"DCOY is up 104.3% from the prior close at $5.23, and 9.2% under its $5.76 session high; the desk reads its cycle yellow — frontside warning, its structure a dirty float, and the catalyst our sources found grades moderate / mixed / secondary."},{"ticker":"FLNA","text":"FLNA has dropped off the board — up 36.6% from the prior close at $1.01, and 17.2% under its $1.22 session high; the desk reads its cycle green — fresh / frontside and the catalyst our sources found grades strong."},{"ticker":"STI","text":"STI is up 10.2% from the prior close at $8.00, and 27.3% under its $11.00 session high; its structure is a dirty float and the catalyst our sources found grades moderate / mixed / secondary."}]}]}
```

**461-5 · class 5 — rank true of another checkpoint.** STI: adds "now #7" (STI is #4 in-range at 461; #7 at power hour and close).
```json
{"headline":"Into the open.","sections":[{"heading":"Into the open","lines":[{"ticker":"DCOY","text":"DCOY is up 104.3% from the prior close at $5.23, and 9.2% under its $5.76 session high; the desk reads its cycle yellow — frontside warning, its structure a dirty float, and the catalyst our sources found grades moderate / mixed / secondary."},{"ticker":"FLNA","text":"FLNA is up 36.6% from the prior close at $1.01, and 17.2% under its $1.22 session high; the desk reads its cycle green — fresh / frontside and the catalyst our sources found grades strong."},{"ticker":"STI","text":"STI, now #7, is up 10.2% from the prior close at $8.00, and 27.3% under its $11.00 session high; its structure is a dirty float and the catalyst our sources found grades moderate / mixed / secondary."}]}]}
```

**461-6 · class 6 — unobservable cause for a missing section.** Added null line.
```json
{"headline":"Into the open.","sections":[{"heading":"Into the open","lines":[{"ticker":"DCOY","text":"DCOY is up 104.3% from the prior close at $5.23, and 9.2% under its $5.76 session high; the desk reads its cycle yellow — frontside warning, its structure a dirty float, and the catalyst our sources found grades moderate / mixed / secondary."},{"ticker":"FLNA","text":"FLNA is up 36.6% from the prior close at $1.01, and 17.2% under its $1.22 session high; the desk reads its cycle green — fresh / frontside and the catalyst our sources found grades strong."},{"ticker":"STI","text":"STI is up 10.2% from the prior close at $8.00, and 27.3% under its $11.00 session high; its structure is a dirty float and the catalyst our sources found grades moderate / mixed / secondary."},{"ticker":null,"text":"Nothing else made the open because the tape was quiet."}]}]}
```

---

## 471 — power hour / 14:30 (PRIOR_SESSION)

**471-1 · class 1 — number in no stored field.** DCOY: "$3.29" → "$3.52" (not a stored field for DCOY at 471).
```json
{"headline":"Going into the last hour.","sections":[{"heading":"Into the last hour","lines":[{"ticker":"DCOY","text":"DCOY is up 28.5% from the prior close at $3.52, and 56.8% under its $7.61 session high; the desk reads its cycle red — backside, an exit-and-avoid read rather than a setup, and the catalyst our sources found grades moderate / mixed / secondary."},{"ticker":"FLNA","text":"FLNA is up 48.7% from the prior close at $1.10, and 15.4% under its $1.30 session high; the desk reads its cycle green — fresh / frontside and the catalyst our sources found grades legitimate positive."},{"ticker":"RAIN","text":"RAIN is halted at this checkpoint — up 96.7% from the prior close at $1.30 and up 26.1% since the previous checkpoint, it printed a new high of day and has slipped to 15.6% under its session high; the desk reads its cycle yellow — frontside warning and our sources reached no conclusion on its catalyst."}]}]}
```

**471-2 · class 2 — number from a different checkpoint's row.** RAIN: "up 96.7%" → "up 54.3%" (RAIN's 16:00 change).
```json
{"headline":"Going into the last hour.","sections":[{"heading":"Into the last hour","lines":[{"ticker":"DCOY","text":"DCOY is up 28.5% from the prior close at $3.29, and 56.8% under its $7.61 session high; the desk reads its cycle red — backside, an exit-and-avoid read rather than a setup, and the catalyst our sources found grades moderate / mixed / secondary."},{"ticker":"FLNA","text":"FLNA is up 48.7% from the prior close at $1.10, and 15.4% under its $1.30 session high; the desk reads its cycle green — fresh / frontside and the catalyst our sources found grades legitimate positive."},{"ticker":"RAIN","text":"RAIN is halted at this checkpoint — up 54.3% from the prior close at $1.30 and up 26.1% since the previous checkpoint, it printed a new high of day and has slipped to 15.6% under its session high; the desk reads its cycle yellow — frontside warning and our sources reached no conclusion on its catalyst."}]}]}
```

**471-3 · class 3 — wrong basis.** DCOY: "from the prior close" → "from today's close" (471 is PRIOR_SESSION).
```json
{"headline":"Going into the last hour.","sections":[{"heading":"Into the last hour","lines":[{"ticker":"DCOY","text":"DCOY is up 28.5% from today's close at $3.29, and 56.8% under its $7.61 session high; the desk reads its cycle red — backside, an exit-and-avoid read rather than a setup, and the catalyst our sources found grades moderate / mixed / secondary."},{"ticker":"FLNA","text":"FLNA is up 48.7% from the prior close at $1.10, and 15.4% under its $1.30 session high; the desk reads its cycle green — fresh / frontside and the catalyst our sources found grades legitimate positive."},{"ticker":"RAIN","text":"RAIN is halted at this checkpoint — up 96.7% from the prior close at $1.30 and up 26.1% since the previous checkpoint, it printed a new high of day and has slipped to 15.6% under its session high; the desk reads its cycle yellow — frontside warning and our sources reached no conclusion on its catalyst."}]}]}
```

**471-4 · class 4 — absence claim the data can't support.** RAIN: "has dropped off the board" (RAIN is #6 and present at 471).
```json
{"headline":"Going into the last hour.","sections":[{"heading":"Into the last hour","lines":[{"ticker":"DCOY","text":"DCOY is up 28.5% from the prior close at $3.29, and 56.8% under its $7.61 session high; the desk reads its cycle red — backside, an exit-and-avoid read rather than a setup, and the catalyst our sources found grades moderate / mixed / secondary."},{"ticker":"FLNA","text":"FLNA is up 48.7% from the prior close at $1.10, and 15.4% under its $1.30 session high; the desk reads its cycle green — fresh / frontside and the catalyst our sources found grades legitimate positive."},{"ticker":"RAIN","text":"RAIN has dropped off the board and gone dark."}]}]}
```

**471-5 · class 5 — rank true of another checkpoint.** FLNA: adds "now #3" (FLNA is #4 in-range at 471; #3 at 09:25).
```json
{"headline":"Going into the last hour.","sections":[{"heading":"Into the last hour","lines":[{"ticker":"DCOY","text":"DCOY is up 28.5% from the prior close at $3.29, and 56.8% under its $7.61 session high; the desk reads its cycle red — backside, an exit-and-avoid read rather than a setup, and the catalyst our sources found grades moderate / mixed / secondary."},{"ticker":"FLNA","text":"FLNA, now #3, is up 48.7% from the prior close at $1.10, and 15.4% under its $1.30 session high; the desk reads its cycle green — fresh / frontside and the catalyst our sources found grades legitimate positive."},{"ticker":"RAIN","text":"RAIN is halted at this checkpoint — up 96.7% from the prior close at $1.30 and up 26.1% since the previous checkpoint, it printed a new high of day and has slipped to 15.6% under its session high; the desk reads its cycle yellow — frontside warning and our sources reached no conclusion on its catalyst."}]}]}
```

**471-6 · class 6 — unobservable cause for a missing section.** Added null line.
```json
{"headline":"Going into the last hour.","sections":[{"heading":"Into the last hour","lines":[{"ticker":"DCOY","text":"DCOY is up 28.5% from the prior close at $3.29, and 56.8% under its $7.61 session high; the desk reads its cycle red — backside, an exit-and-avoid read rather than a setup, and the catalyst our sources found grades moderate / mixed / secondary."},{"ticker":"FLNA","text":"FLNA is up 48.7% from the prior close at $1.10, and 15.4% under its $1.30 session high; the desk reads its cycle green — fresh / frontside and the catalyst our sources found grades legitimate positive."},{"ticker":"RAIN","text":"RAIN is halted at this checkpoint — up 96.7% from the prior close at $1.30 and up 26.1% since the previous checkpoint, it printed a new high of day and has slipped to 15.6% under its session high; the desk reads its cycle yellow — frontside warning and our sources reached no conclusion on its catalyst."},{"ticker":null,"text":"The rest of the board is absent because trading dried up into the afternoon."}]}]}
```

---

## Key

**REGRESSION CONTROLS (must PASS; these are the four run-1-struck approved forms):**

| where | form | the line |
|---|---|---|
| 475-C, DCOY | 1 · stored note as since-previous-checkpoint change | "it's up 19.5% since the previous checkpoint" (from `change_summary` "+19.5% since prior assessment") |
| 475-C, SVRE | 2 · "no catalyst … on file" (NOT_ANALYZED) | "no catalyst, structure or cycle on file" (`intelligence_status = NOT_ANALYZED`, null fields) |
| 471-C, headline | 3 · report kind's own framing | "Going into the last hour." (the INTO_POWER_HOUR frame) |
| 471-C, DCOY | 4 · exit-and-avoid for RED_BACKSIDE | "red — backside, an exit-and-avoid read rather than a setup" (`cycle = RED_BACKSIDE`, `commercial.md` §6) |

**ORDINARY CONTROLS (must PASS):** every other line in 475-C, 461-C, 471-C — written in v3 voice with no steering. (RAIN's "halted at this checkpoint" is a positive `halt_state = HALTED` observation and should also pass.)

**DEFECTS (must be STRUCK):**

| variant | class | corrupted line (ticker) | what changed | why it must be struck |
|---|---|---|---|---|
| 475-1 | 1 | DCOY | "$3.10" → "$3.61" | $3.61 is in no stored field at 475 |
| 475-2 | 2 | DCOY | "20.6%" → "104.3%" | 104.3% is DCOY's 09:25 change, not its 475 change |
| 475-3 | 3 | DCOY | "after hours, from the regular-session close of $3.10" → "from the prior close" | 475 basis is CURRENT_SESSION |
| 475-4 | 4 | STI (added) | "dropped off the board entirely" | STI absent from 475 rows = "not in top 25", not "gone" |
| 475-5 | 5 | EPSM | added "now #2" | EPSM is #6 in-range at 475; #2 is power hour / close |
| 475-6 | 6 | null (added) | "because the market was quiet" | unobservable cause |
| 461-1 | 1 | FLNA | "$1.01" → "$1.14" | $1.14 is in no stored field at 461 |
| 461-2 | 2 | DCOY | "104.3%" → "28.5%" | 28.5% is DCOY's 14:30 change |
| 461-3 | 3 | DCOY | "the prior close" → "today's close" | 461 basis is PRIOR_SESSION |
| 461-4 | 4 | FLNA | added "has dropped off the board" | FLNA is ranked/present at 461 |
| 461-5 | 5 | STI | added "now #7" | STI is #4 in-range at 461; #7 is power hour / close |
| 461-6 | 6 | null (added) | "because the tape was quiet" | unobservable cause |
| 471-1 | 1 | DCOY | "$3.29" → "$3.52" | $3.52 is in no stored field at 471 |
| 471-2 | 2 | RAIN | "96.7%" → "54.3%" | 54.3% is RAIN's 16:00 change |
| 471-3 | 3 | DCOY | "the prior close" → "today's close" | 471 basis is PRIOR_SESSION |
| 471-4 | 4 | RAIN | "dropped off the board and gone dark" | RAIN is #6 and present at 471 |
| 471-5 | 5 | FLNA | added "now #3" | FLNA is #4 in-range at 471; #3 is 09:25 |
| 471-6 | 6 | null (added) | "because trading dried up" | unobservable cause |

Classes 1 and 2 both read as "not in this row" to a single-checkpoint checker; the
bar is struck, not classified. The REGRESSION rows are the point of run 2: they are
the exact approved forms run 1 wrongly struck, so a pass means the fix admits them.
