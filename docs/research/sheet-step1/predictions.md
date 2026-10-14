# Sheet step 1 effect read: predictions, locked before the export is opened (2026-10-14)

Research-tmi owns these. A drafting agent wrote them from the code, with no data; Research
reviewed the script and the predictions and keeps every number as written, except prediction 6,
which now counts every escalation with a structure conflict against the Sheet. Every number is a
guess made before any data was seen. Production at the read: `e0da6adf`; the flag passes the
Sheet snapshot on purpose (`worker/research.ts:781-786`), so step 1 removed the Sheet from the
first read, not from the escalation's adjudication.

Script: `scripts/sheet-step1-read.ts`. Windows in UTC:

- BEFORE: [2026-10-08T00:00:00Z, 2026-10-11T18:55:03Z). Two sessions (Thu 10-08, Fri 10-09).
- AFTER_CLEAN: [2026-10-11T18:55:04Z, 2026-10-13T00:45:33Z). One session (Mon 10-12). MAIN READ.
- AFTER_ALL: from 2026-10-11T18:55:04Z to the end of the export. CONFOUNDED by the 2026-10-13
  releases (catalyst tags 00:45:33Z, deal-word fix 00:55:04Z, fresh-count fix 01:05:21Z).

TREATED: tickers with a BEFORE version that had the Sheet prior delivered. CONTROL: tickers in
both windows with no BEFORE prior. This is a before/after with a control, not proof of cause.

Minimum sample: if either arm has fewer than 15 tickers present in both BEFORE and AFTER_CLEAN,
predictions 3 to 5 are NOT DECIDED, whatever the numbers say.

## 1. The flag held (a check, can fail)

- BEFORE: prior-delivered versions above 0. Guess: 30% to 70% of BEFORE versions.
- AFTER_ALL: prior-delivered versions = 0.
- Shows the flag did NOT take effect: any AFTER version reads as prior-delivered (the script
  lists them; check the trigger tag for a hand run).
- Shows the check is blind, not that the flag worked: BEFORE count = 0. Then the read is
  NOT DECIDED.

## 2. Input tokens fall in TREATED only

- Single-call interpret versions, median input tokens: (TREATED AFTER minus TREATED BEFORE) minus
  (CONTROL AFTER minus CONTROL BEFORE) between -400 and -50 tokens. The prior is seven short
  string fields (`lib/research/merge/sheetPrior.ts:52-62`); its serialised size has not been
  measured, so the range is wide.
- Shows no effect: the gap is 0 or above, or smaller in magnitude than CONTROL's own
  before/after swing. Bundle size moves with evidence volume, so a null here is weak evidence;
  a positive gap is a real surprise.

## 3. Agreement with the Sheet falls in TREATED

Among TREATED versions that had a snapshot (metadata `sheetProvenance` not null):

- SHEET_AUTO_AGREE share falls by 5 to 25 points from BEFORE to AFTER_CLEAN; CONFLICT share rises
  by a similar amount. Field most affected: catalyst (the prior carries the Sheet's grade text).
- Shows no effect: SHEET_AUTO_AGREE share moves by less than 3 points, or rises.
- If it falls by more than 40 points, suspect the comparison itself changed, not only the model.

## 4. Conclusions move more in TREATED than in CONTROL

Latest BEFORE version vs first AFTER_CLEAN version, tickers in both windows:

- Grade changed share: TREATED exceeds CONTROL by 5 to 20 points.
- Structure changed share: TREATED exceeds CONTROL by 3 to 15 points.
- Shows no effect: the gap is under 3 points on both grade and structure, OR the gap is no larger
  than the gap the two arms already show in BEFORE churn (consecutive versions inside BEFORE).

## 5. CONTROL stays near its own churn

- CONTROL's cross-window grade changed share is within 5 points of CONTROL's BEFORE churn.
- If CONTROL moves by more than 10 points, something other than the flag moved (market, a
  release, model variance) and the TREATED shift cannot be read as the flag's effect.

## 6. The escalation path still sees the Sheet (not removed by step 1)

- AFTER versions escalated with reason SHEET_AUTO_CONFLICT, or escalated for any reason with a
  structure conflict involving DIRTY_FLOAT (an upper count: the metadata does not keep the
  conflict's reason, `escalation.ts:69-77`): guess 0 to 5. Each may have had the Sheet's
  conclusion handed to the escalation model (`lib/research/interpret/pipeline.ts:338-347`, which
  adjudicates any escalation with a material structural dispute, whatever its reason). They are
  counted, not called clean.
- No falsifier: this is a count to report, not a prediction about the flag.

## 7. The confound is visible (positive control for the method)

- In AFTER_ALL, CONTROL's catalyst status distribution differs from AFTER_CLEAN by more than in
  any other field (catalyst tags and the fresh-count fix touch catalyst fields). Guess: 5 or more
  points on the largest status bucket.
- If AFTER_ALL shows no CONTROL shift on catalyst status either, the read may be too small to see
  a known change, and a null in 3 to 5 says little.

## Not covered

- Whether the prior was RIGHT. A drop in agreement says the model stopped echoing the Sheet, not
  which of the two was correct.
- Replay and hand-run versions are only excluded when the export carries `model_usage`.
