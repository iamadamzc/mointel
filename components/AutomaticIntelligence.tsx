'use client';

/**
 * Automatic research panels for the ticker drawer.
 *
 * Every conclusion is shown with its provenance and clickable sources, because
 * a structural claim nobody can check is worth very little on a trading desk.
 * Summaries only — no chain of thought is surfaced.
 */

import { StatusBadge } from '@/components/StatusBadge';
import type { SheetAutoComparison } from '@/lib/research/merge/sheetAuto';
import {
  CATALYST_GRADE_LABEL,
  CYCLE_LABEL,
  STRUCTURE_LABEL,
  type AutoIntelligence,
} from '@/lib/research/view';

export function AutomaticIntelligence({
  intel,
  comparison,
  Section,
  Field,
  FieldLabel,
  ProseField,
}: {
  intel: AutoIntelligence | null;
  comparison: SheetAutoComparison | null;
  Section: (props: { title: string; children: React.ReactNode }) => React.ReactElement;
  Field: (props: { label: string; value: string; numeric?: boolean }) => React.ReactElement;
  FieldLabel: (props: { children: React.ReactNode }) => React.ReactElement;
  ProseField: (props: {
    label: string;
    value: string;
    className?: string;
    tone?: 'warn';
  }) => React.ReactElement;
}) {
  if (!intel) return null;

  if (!intel.analysis) {
    return (
      <Section title="Automatic Research">
        <StatusBadge label={intel.statusLabel} tone="dim" />
        <p className="mt-3 text-[12px] leading-relaxed text-ink-2">
          Source collection and interpretation are in progress. Nothing here yet should be read as
          a catalyst, a structure or a cycle classification.
        </p>
      </Section>
    );
  }

  const { catalyst, structure, cycle } = intel.analysis.dossier;
  const disagreements = comparison?.comparisons.filter((item) => item.agreement === 'DISAGREE') ?? [];

  return (
    <>
      {comparison && comparison.comparisons.length > 0 ? (
        <Section title="Sheet vs Automatic">
          <div className="flex flex-wrap items-center gap-2">
            <StatusBadge
              label={comparison.provenance.replace(/_/g, ' ')}
              tone={comparison.conflict ? 'warn' : 'dim'}
            />
            {comparison.conflict ? (
              <span className="text-[10px] uppercase tracking-wide text-warn">
                both conclusions retained
              </span>
            ) : null}
          </div>

          {/* Both sides are shown side by side. Neither is overwritten, and the
              human review is never edited by this application. */}
          <table className="mt-3 w-full text-[11px]">
            <thead>
              <tr className="text-ink-3">
                <th className="py-1 text-left font-normal">Field</th>
                <th className="py-1 text-left font-normal">Sheet (human)</th>
                <th className="py-1 text-left font-normal">Automatic</th>
                <th className="py-1 text-left font-normal">Reason</th>
              </tr>
            </thead>
            <tbody>
              {comparison.comparisons.map((item) => (
                <tr
                  key={item.field}
                  className={item.agreement === 'DISAGREE' ? 'text-warn' : 'text-ink-2'}
                >
                  <td className="py-0.5 pr-2">{item.field}</td>
                  <td className="py-0.5 pr-2">{item.sheet ?? '—'}</td>
                  <td className="py-0.5 pr-2">{item.auto ?? '—'}</td>
                  <td className="py-0.5 text-ink-3">
                    {item.agreement === 'DISAGREE' ? (item.reason ?? 'UNKNOWN') : item.agreement}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {disagreements.length > 0 ? (
            <p className="mt-2 text-[11px] text-ink-2">
              {disagreements.map((item) => `${item.field}: ${item.detail}`).join(' · ')}
            </p>
          ) : null}
        </Section>
      ) : null}
      <Section title="Why It Is Moving">
        <div className="flex flex-wrap items-center gap-2">
          <StatusBadge label={CATALYST_GRADE_LABEL[catalyst.catalystGrade]} tone="dim" />
          <span className="text-[10px] uppercase tracking-wide text-ink-3">
            {catalyst.catalystStatus} · {catalyst.freshness} · confidence {catalyst.confidence}
          </span>
        </div>
        <ProseField label="Summary" value={catalyst.summary ?? '—'} className="mt-3" />
        <ProseField
          label="Why traders may care"
          value={catalyst.whyTradersMayCare ?? '—'}
          className="mt-3"
        />
        <Field label="Event time" value={catalyst.eventTimestamp ?? 'unknown'} />
        <Field
          label="Plausibly explains move"
          value={
            catalyst.plausiblyExplainsMove === null
              ? 'unknown'
              : catalyst.plausiblyExplainsMove
                ? 'yes'
                : 'no'
          }
        />
        {catalyst.unknowns.length > 0 ? (
          <ProseField label="Unresolved" value={catalyst.unknowns.join('; ')} className="mt-3" />
        ) : null}
      </Section>

      <Section title="Structural Intelligence — Automatic">
        <div className="flex flex-wrap items-center gap-2">
          <StatusBadge label={STRUCTURE_LABEL[structure.structureClassification]} tone="dim" />
          <span className="text-[10px] uppercase tracking-wide text-ink-3">
            confidence {structure.confidence}
          </span>
        </div>
        <Field
          label="Shares outstanding"
          value={
            structure.sharesOutstanding === null
              ? 'unknown'
              : `${structure.sharesOutstanding.toLocaleString()}${
                  structure.sharesOutstandingDate ? ` (${structure.sharesOutstandingDate})` : ''
                }`
          }
          numeric
        />
        {/* Float and shares outstanding are separate rows on purpose. */}
        <Field
          label="Displayed float"
          value={
            structure.displayedFloat === null ? 'unknown' : structure.displayedFloat.toLocaleString()
          }
          numeric
        />
        <Field label="Float confidence" value={structure.floatConfidence} />
        <ProseField label="Summary" value={structure.summary ?? '—'} className="mt-3" />

        {structure.supplyLedger.length > 0 ? (
          <div className="mt-3">
            <FieldLabel>Supply ledger</FieldLabel>
            <ul className="mt-1 space-y-1">
              {structure.supplyLedger.map((block, index) => (
                <li key={index} className="text-[11px] text-ink-2">
                  <span className="text-ink-1">{block.type}</span> · {block.status}
                  {block.amountShares !== null
                    ? ` · ${block.amountShares.toLocaleString()} shares`
                    : block.dollarCapacity !== null
                      ? ` · $${block.dollarCapacity.toLocaleString()} capacity`
                      : ''}
                  {block.registrationStatus ? ` · ${block.registrationStatus}` : ''}
                  {block.evidenceSourceIds.length > 0
                    ? ` · sources ${block.evidenceSourceIds.join(', ')}`
                    : ''}
                </li>
              ))}
            </ul>
          </div>
        ) : null}

        {structure.structuralWarnings.length > 0 ? (
          <ProseField
            label="Warnings"
            value={structure.structuralWarnings.join('; ')}
            className="mt-3"
            tone="warn"
          />
        ) : null}
        {structure.reverseSplitHistory.length > 0 ? (
          <ProseField
            label="Reverse splits"
            value={structure.reverseSplitHistory.join('; ')}
            className="mt-3"
          />
        ) : null}
        {structure.unknowns.length > 0 ? (
          <ProseField label="Unresolved" value={structure.unknowns.join('; ')} className="mt-3" />
        ) : null}
      </Section>

      <Section title="Momentum Cycle — Automatic">
        <StatusBadge label={CYCLE_LABEL[cycle.cycleClassification]} tone="dim" />
        <ProseField label="Reasoning" value={cycle.reasoning ?? '—'} className="mt-3" />
        {/* Current-cycle high and historical resistance are separate rows on
            purpose: conflating them is the defect this desk already fixed. */}
        <Field
          label="Current cycle high"
          value={cycle.currentCycleHigh === null ? 'unknown' : String(cycle.currentCycleHigh)}
          numeric
        />
        <Field
          label="Current giveback"
          value={cycle.currentGivebackPct === null ? '—' : `${cycle.currentGivebackPct.toFixed(1)}%`}
          numeric
        />
        <Field
          label="Historical resistance"
          value={cycle.historicalResistance === null ? 'unknown' : String(cycle.historicalResistance)}
          numeric
        />
        <Field label="Former runner" value={cycle.formerRunnerStatus} />
        {cycle.recentMajorRuns.length > 0 ? (
          <ProseField
            label="Recent major runs"
            value={cycle.recentMajorRuns.join('; ')}
            className="mt-3"
          />
        ) : null}
        {cycle.cycleWarnings.length > 0 ? (
          <ProseField
            label="Cycle warnings"
            value={cycle.cycleWarnings.join('; ')}
            className="mt-3"
            tone="warn"
          />
        ) : null}
      </Section>

      <Section title="Evidence & Provenance">
        <Field label="Analysis source" value={intel.provenance} />
        <Field label="Generated" value={intel.generatedAt ?? 'unknown'} />
        <Field label="Model" value={intel.model ?? 'unknown'} />
        <Field
          label="Analysis version"
          value={
            intel.analysisVersionId === null
              ? '—'
              : `v${intel.analysisVersionId} (schema ${intel.schemaVersion ?? '?'})`
          }
        />
        {intel.coverageIncomplete ? (
          <p className="mt-2 rounded-sm border border-dashed border-warn/40 bg-warn/8 px-3 py-2 text-[11px] text-warn">
            Source coverage was incomplete. The conclusions above are correspondingly limited.
          </p>
        ) : null}

        {intel.evidence.length > 0 ? (
          <div className="mt-3">
            <FieldLabel>Sources</FieldLabel>
            <ul className="mt-1 space-y-1">
              {intel.evidence.map((source) => (
                <li key={source.id} className="text-[11px]">
                  <a
                    href={source.url}
                    target="_blank"
                    rel="noreferrer"
                    className="text-ink-1 underline decoration-dotted underline-offset-2"
                  >
                    [{source.id}] {source.secForm ?? source.sourceType}
                    {source.accession ? ` · ${source.accession}` : ''}
                    {source.title ? ` — ${source.title}` : ''}
                  </a>
                  <span className="ml-1 text-ink-3">
                    {source.authority}
                    {source.publishedAt ? ` · ${source.publishedAt.slice(0, 10)}` : ''}
                    {source.publishedPrecision === 'DATE_ONLY' ? ' (date only)' : ''}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        ) : null}
      </Section>
    </>
  );
}
