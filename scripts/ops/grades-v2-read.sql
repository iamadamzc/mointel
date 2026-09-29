-- Research's first live read of the catalyst grades (pre-registered 9c7a5d9, amended b1c53c8).
-- READ-ONLY. Run AFTER 10:00 ET 2026-09-30:
--   ssh mointel-ssm 'sqlite3 -readonly -header -column /var/lib/mointel/market.db' < scripts/ops/grades-v2-read.sql
-- 9d554e0 went live 2026-09-29T16:18:16Z (the boundary below).

.print '== C (positive control; PASSES if any pre-deploy row has ticker MTNB -- report its id; FAILS only if MTNB is absent)'
SELECT id, ticker, json_extract(metadata,'$.promptVersion') pv,
       json_extract(dossier,'$.catalyst.catalystGrade') grade,
       json_extract(dossier,'$.catalyst.summary') summary
FROM research_analysis_versions
WHERE generated_at < '2026-09-29T16:18:16Z' AND generated_at >= '2026-09-22T16:18:16Z'
  AND (lower(json_extract(dossier,'$.catalyst.summary')) LIKE '%reverse%split%'
    OR lower(json_extract(dossier,'$.catalyst.summary')) LIKE '%consolidat%'
    OR lower(json_extract(dossier,'$.catalyst.summary')) LIKE '%ratio change%');

.print '== A'
SELECT json_extract(metadata,'$.promptVersion') pv,
       json_extract(dossier,'$.catalyst.catalystGrade') grade, COUNT(*) n
FROM research_analysis_versions
WHERE generated_at >= '2026-09-29T16:18:16Z'
GROUP BY 1,2 ORDER BY 1,2;

.print '== B'
SELECT id, ticker, json_extract(dossier,'$.catalyst.catalystGrade') grade,
       json_extract(dossier,'$.catalyst.summary') summary
FROM research_analysis_versions
WHERE generated_at >= '2026-09-29T16:18:16Z' AND json_extract(metadata,'$.promptVersion') = 2
  AND (lower(json_extract(dossier,'$.catalyst.summary')) LIKE '%reverse%split%'
    OR lower(json_extract(dossier,'$.catalyst.summary')) LIKE '%consolidat%'
    OR lower(json_extract(dossier,'$.catalyst.summary')) LIKE '%ratio change%');
