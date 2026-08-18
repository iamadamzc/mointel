'use client';

/**
 * Automatic research panels for the ticker drawer.
 *
 * Every conclusion is shown with its provenance and clickable sources, because
 * a structural claim nobody can check is worth very little on a trading desk.
 * Summaries only — no chain of thought is surfaced.
 */

import { StatusBadge, type Tone } from '@/components/StatusBadge';
import type { StructureSummary } from '@/lib/dashboard/deskRead';
import { isMaterialConflict } from '@/lib/dashboard/intelligence';
import type { SheetAutoComparison } from '@/lib/research/merge/sheetAuto';
import {
  CATALYST_GRADE_LABEL,
  CYCLE_LABEL,
  STRUCTURE_LABEL,
  type AutoIntelligence,
} from '@/lib/research/view';

/**
 * Sheet / AUTO reconciliation, sized to the finding.
 *
 * A full four-column table permanently open said "look here" on every ticker,
 * including the ones where the two sides simply agree — which is not news and
 * does not need a block. Agreement collapses to a provenance mark with the
 * table one click away; a real conflict keeps the table open, because the
 * disagreement IS the finding and must not be tucked behind a disclosure.
 *
 * Neither side is ever resolved away.
 */
function SheetVsAuto({
  comparison,
  Section,
}: {
  comparison: SheetAutoComparison;
  Section: (props: { title: string; children: React.ReactNode }) => React.ReactElement;
}) {
  const disagreements = comparison.comparisons.filter((item) => item.agreement === 'DISAGREE');
  // A coverage gap on the automatic side is not a dispute worth a banner; the
  // reason column below still records every difference either way.
  const conflict = isMaterialConflict(comparison);

  const table = (
    <table className="w-full text-[11px]">
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
          <tr key={item.field} className={item.agreement === 'DISAGREE' ? 'text-warn' : 'text-ink-2'}>
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
  );

  if (!conflict) {
    // Agreement, AUTO-only and SHEET-only all reduce to a single mark. Partial
    // automatic coverage is stated as partial, never dressed up as a dispute.
    return (
      <Section title="Provenance">
        <div className="flex flex-wrap items-center gap-2">
          <StatusBadge label={comparison.provenance.replace(/_/g, ' ')} tone="dim" />
          <span className="text-[10px] text-ink-3">
            the human review and the automatic layer do not materially disagree
          </span>
        </div>
        <details className="mt-2">
          <summary className="cursor-pointer text-[10px] tracking-wide text-ink-3 uppercase hover:text-ink-2">
            Field comparison
          </summary>
          <div className="mt-2">{table}</div>
        </details>
      </Section>
    );
  }

  return (
    <Section title="Sheet vs Automatic">
      <div className="flex flex-wrap items-center gap-2">
        <StatusBadge label="Conflict" tone="warn" />
        <span className="text-[10px] tracking-wide text-warn uppercase">
          both conclusions retained · neither side is overwritten
        </span>
      </div>

      <div className="mt-3">{table}</div>

      {disagreements.length > 0 ? (
        <p className="mt-2 max-w-[78ch] text-[11px] text-ink-2">
          {disagreements.map((item) => `${item.field}: ${item.detail}`).join(' · ')}
        </p>
      ) : null}
    </Section>
  );
}

/** The supply picture as a ledger, above the model's prose. */
function StructureSummaryBlock({
  summary,
  FieldLabel,
}: {
  summary: StructureSummary;
  FieldLabel: (props: { children: React.ReactNode }) => React.ReactElement;
}) {
  return (
    <div className="mb-3 rounded-sm border border-line bg-panel/60 px-3 py-2">
      <div className="flex flex-wrap items-baseline gap-x-5 gap-y-1">
        <span className="inline-flex items-baseline gap-1.5">
          <FieldLabel>Structure</FieldLabel>
          <StatusBadge label={summary.label} tone={summary.tone as Tone} />
        </span>
        <span className="inline-flex items-baseline gap-1.5">
          <FieldLabel>Float</FieldLabel>
          <span
            className={`num text-[12px] font-semibold ${
              summary.float === 'Unknown' ? 'text-warn' : 'text-ink'
            }`}
          >
            {summary.float}
          </span>
          <span className="text-[9px] tracking-wider text-ink-3 uppercase">
            {summary.floatConfidence}
          </span>
        </span>
      </div>

      {summary.supply.length > 0 ? (
        <div className="mt-2 border-t border-line pt-2">
          <FieldLabel>Known / potential supply</FieldLabel>
          <ul className="mt-1 space-y-0.5">
            {summary.supply.map((line, index) => (
              <li key={index} className="flex items-baseline gap-2 text-[11px]">
                <span className="w-[150px] shrink-0 truncate text-ink-1">{line.label}</span>
                <span className="num w-[130px] shrink-0 text-ink-2">{line.amount ?? '—'}</span>
                {/* Capacity is capacity. It is never restated as selling. */}
                <span className="text-[10px] tracking-wide text-ink-3 uppercase">{line.status}</span>
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {summary.keyWarning ? (
        <p className="mt-2 max-w-[78ch] border-t border-line pt-2 text-[11px] leading-relaxed text-warn/90">
          {summary.keyWarning}
        </p>
      ) : null}
    </div>
  );
}

export function AutomaticIntelligence({
  intel,
  comparison,
  structure: structureSummary,
  Section,
  Field,
  FieldLabel,
  ProseField,
}: {
  intel: AutoIntelligence | null;
  comparison: SheetAutoComparison | null;
  structure: StructureSummary | null;
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

  return (
    <>
      {comparison && comparison.comparisons.length > 0 ? (
        <SheetVsAuto comparison={comparison} Section={Section} />
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
        {/* The immediate read first; the model's fuller account below it. */}
        {structureSummary ? (
          <StructureSummaryBlock summary={structureSummary} FieldLabel={FieldLabel} />
        ) : null}

        {/* The classification, the float and its confidence are in the summary
            block above; repeating them here was just filler. */}
        {structureSummary ? null : (
          <>
            <div className="flex flex-wrap items-center gap-2">
              <StatusBadge label={STRUCTURE_LABEL[structure.structureClassification]} tone="dim" />
            </div>
            {/* Float and shares outstanding are separate rows on purpose. */}
            <Field
              label="Displayed float"
              value={
                structure.displayedFloat === null
                  ? 'unknown'
                  : structure.displayedFloat.toLocaleString()
              }
              numeric
            />
            <Field label="Float confidence" value={structure.floatConfidence} />
          </>
        )}

        <div className="flex flex-wrap items-baseline gap-x-5 gap-y-1">
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
          <Field label="Analysis confidence" value={structure.confidence} />
        </div>

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
                  {/* noopener is implied by noreferrer in current browsers, but
                      stated anyway: this opens an SEC page from a desk that may be
                      running behind a capability URL, and the opened tab must not
                      get a handle back to this one. */}
                  <a
                    href={source.url}
                    target="_blank"
                    rel="noopener noreferrer"
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
