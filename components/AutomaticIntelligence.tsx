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
import { CATALYST_SOURCES_LABEL, catalystSources, eventTimeView, type CatalystSource } from '@/lib/dashboard/catalystView';
import { EVIDENCE_RISK_WORDS, evidenceRiskView } from '@/lib/dashboard/evidenceRiskView';
import { CYCLE_WORDS, cycleFacts } from '@/lib/dashboard/cycleFacts';
import { PRODUCED_WORDS, producedAt } from '@/lib/dashboard/produced';
import { SUPPLY_GROUP_EMPTY, SUPPLY_GROUP_EMPTY_HOVER, supplyGroups } from '@/lib/dashboard/supplyGroups';
import { humanise } from '@/lib/dashboard/language';
import { catalystEvidenceLatest } from '@/lib/dashboard/merge';
import { floatBoundReading, noDenominatorNote, supplyReading } from '@/lib/dashboard/supply';
import { etTimestamp, relativeAge } from '@/lib/dashboard/why';
import { formatEtDay } from '@/lib/format';
import type { SheetAutoComparison } from '@/lib/research/merge/sheetAuto';
import {
  CATALYST_GRADE_LABEL,
  CYCLE_LABEL,
  STRUCTURE_LABEL,
  type AutoIntelligence,
} from '@/lib/research/view';

/** The catalyst's event time, as the evidence supports it (reads the clock here, not in render). */
function eventTimeText(
  at: string | null | undefined,
  citedIds: readonly number[] | null | undefined,
  evidence: AutoIntelligence['evidence'],
): { text: string; hover: string | null } {
  const view = eventTimeView(at, citedIds, evidence, Date.now());
  return { text: view.text, hover: view.hover };
}

/** `producedAt` against the clock, kept out of render. */
function producedNow(dossierAt: string | null, checkpointAt: string): ReturnType<typeof producedAt> {
  return producedAt(dossierAt, checkpointAt, new Date().toISOString());
}

/** The title over the computed cycle facts (Marketing, 1cf3d14f). */
const CYCLE_FACTS_TITLE = 'Cycle, from daily bars';

/** An instant a trader can act on: ET wall clock, with its age beside it. */
function timeWithAge(at: string | null | undefined): string {
  const stamp = etTimestamp(at);
  if (!stamp) return 'unknown';
  const age = relativeAge(at, Date.now());
  return age ? `${stamp} · ${age} ago` : stamp;
}

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
          <th className="py-1 text-left font-normal">Outside research</th>
          <th className="py-1 text-left font-normal">Desk research</th>
          <th className="py-1 text-left font-normal">Reason</th>
        </tr>
      </thead>
      <tbody>
        {comparison.comparisons.map((item) => (
          <tr key={item.field} className={item.agreement === 'DISAGREE' ? 'text-warn' : 'text-ink-2'}>
            <td className="py-0.5 pr-2">{item.field}</td>
            {/* Both sides in words. These are classification values, and
                YELLOW_FRONTSIDE_WARNING is not a thing anybody says. */}
            <td className="py-0.5 pr-2">{item.sheet ? humanise(item.sheet) : '—'}</td>
            <td className="py-0.5 pr-2">{item.auto ? humanise(item.auto) : '—'}</td>
            <td className="py-0.5 text-ink-3">
              {humanise(item.agreement === 'DISAGREE' ? item.reason : item.agreement)}
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
          <StatusBadge label={humanise(comparison.provenance)} tone="dim" />
          <span className="text-[10px] text-ink-3">
            the outside research and the desk research do not materially disagree
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
    <Section title="Desk vs outside">
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
        {/*
          * ONE number and ONE verdict, with the bound cited inside it.
          *
          * The vendor's float is a CLAIM the desk borrows; the filed count is
          * a BOUND the desk owns and the claim has to sit under. Laid out as
          * two numbers they would read as two estimates of one quantity and
          * invite splitting the difference — so the count appears only in the
          * verdict's reason, where it is doing its actual job.
          *
          * The model's float confidence USED to sit here and was removed
          * rather than moved: it describes the dossier's own extraction, and
          * the number beside it is now the Sheet's. A confidence attached to a
          * different number than the one it measured is worse than none.
          */}
        <span className="inline-flex flex-wrap items-baseline gap-x-1.5 gap-y-0.5">
          <FieldLabel>Float</FieldLabel>
          <span
            className={`num text-[12px] font-semibold ${
              summary.float === 'Unknown' ? 'text-warn' : 'text-ink'
            }`}
          >
            {summary.float}
          </span>
          {summary.floatCheck ? (
            <>
              <span
                className={`text-[10px] tracking-wider uppercase ${
                  summary.floatCheck.tone === 'neg' ? 'text-neg' : 'text-ink-3'
                }`}
              >
                {summary.floatCheck.label}
              </span>
              <span
                className={`text-[11px] ${
                  summary.floatCheck.tone === 'neg' ? 'text-neg/90' : 'text-ink-3'
                }`}
              >
                · {summary.floatCheck.reason}
              </span>
            </>
          ) : null}
        </span>
      </div>

      {summary.supply.length > 0 ? (
        <div className="mt-2 border-t border-line pt-2">
          <FieldLabel>Known / potential supply</FieldLabel>
          <ul className="mt-1 space-y-0.5">
            {summary.supply.map((line, index) => (
              <li key={index} className="flex items-baseline gap-2 text-[11px]">
                <span className="w-[150px] shrink-0 truncate text-ink-1" title={line.label}>
                  {line.label}
                </span>
                <span className="num w-[130px] shrink-0 text-ink-2">{line.amount ?? '—'}</span>
                {/* Capacity is capacity. It is never restated as selling. */}
                <span className="text-[10px] tracking-wide text-ink-3">{line.status.toLowerCase()}</span>
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

/**
 * A list of independent findings, rendered as a list.
 *
 * Every one of these fields is already an array in the dossier — separate
 * warnings, separate unresolved questions, separate prior runs. The drawer was
 * flattening them with `.join('; ')`, which produced run-on paragraphs with a
 * visible `.;` seam where one finding ended and the next began, and made four
 * distinct risks read as one long sentence nobody can count or scan.
 */
function ListField({
  label,
  items,
  tone,
  className = '',
  FieldLabel,
}: {
  label: string;
  items: readonly string[];
  tone?: 'warn';
  className?: string;
  FieldLabel: (props: { children: React.ReactNode }) => React.ReactElement;
}) {
  if (items.length === 0) return null;

  return (
    <div className={`min-w-0 ${className}`}>
      <div className="flex items-baseline gap-2">
        <FieldLabel>{label}</FieldLabel>
        {items.length > 1 ? (
          <span className="num text-[10px] text-ink-3">{items.length}</span>
        ) : null}
      </div>
      <ul
        className={`mt-1 max-w-[78ch] list-disc space-y-1 pl-4 text-[12px] leading-relaxed ${
          tone === 'warn' ? 'text-warn/90' : 'text-ink-2'
        }`}
      >
        {items.map((item, index) => (
          <li key={`${index}-${item.slice(0, 24)}`}>{item.replace(/;\s*$/, '')}</li>
        ))}
      </ul>
    </div>
  );
}

/**
 * A conclusion's own cited sources, "{date}, {title}" each, under its label.
 * Renders nothing when none resolve, so no surface claims sources it does not show.
 */
function SourceList({
  label,
  sources,
  FieldLabel,
}: {
  label: string;
  sources: readonly CatalystSource[];
  FieldLabel: (props: { children: React.ReactNode }) => React.ReactElement;
}) {
  if (sources.length === 0) return null;
  return (
    <div className="mt-3">
      <FieldLabel>{label}</FieldLabel>
      <ul className="mt-1 space-y-1">
        {sources.map(({ link, day }) => (
          <li key={link.id} className="text-[11px]">
            <a
              href={link.url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-ink-1 underline decoration-dotted underline-offset-2"
            >
              {day ? `${day}, ` : ''}
              {link.title ?? link.secForm ?? humanise(link.sourceType)}
            </a>
          </li>
        ))}
      </ul>
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
  checkpointAt = null,
}: {
  intel: AutoIntelligence | null;
  /** The checkpoint the setup grade rests on (ISO), when the grade is wired. Row 24. */
  checkpointAt?: string | null;
  comparison: SheetAutoComparison | null;
  structure: StructureSummary | null;
  Section: (props: { title: string; titleHover?: string; children: React.ReactNode }) => React.ReactElement;
  Field: (props: { label: string; value: string; numeric?: boolean; title?: string }) => React.ReactElement;
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
      <Section title="Desk Research">
        <StatusBadge label={intel.statusLabel} tone="dim" />
        <p className="mt-3 text-[12px] leading-relaxed text-ink-2">
          Source collection and interpretation are in progress. Nothing here yet should be read as
          a catalyst, a structure or a cycle classification.
        </p>
      </Section>
    );
  }

  const { catalyst, structure, cycle } = intel.analysis.dossier;

  /*
   * The desk's OWN supply arithmetic, rendered with the blocks it divides.
   *
   * Deliberately not a separate panel: a ratio shown apart from its evidence
   * makes the reader carry the join, and this card already holds the ledger.
   *
   * The heading says "against shares outstanding" rather than naming supply
   * alone, because the Sheet's prose "Overhang / Float" is on the same screen
   * and the two are NOT competing estimates of one quantity -- this is a bound
   * against the share count, that is an approximation of the float. Making the
   * denominator part of the heading is what keeps them from reading as equals.
   */
  const supply = supplyReading(structure.supplyPair);

  /*
   * The float bound, and it answers where the pair is silent.
   *
   * The pair needs an established KNOWN_ACTIVE block; the bound needs only the
   * share count, its date and the split factor. On the live board 22 of 23
   * pairs carry a denominator and nothing else, so this is the line that
   * usually speaks — and the two must NOT be laid out as matched numbers, or
   * the silence beside it reads as a failure of the row rather than as the
   * absence of established blocks. THEY DO NOT SHARE AN INPUT.
   */
  const bound = floatBoundReading(structure.supplyPair);
  const noDenominator = supply ? null : noDenominatorNote(structure.supplyLedger.length);

  /*
   * The structure summary above already leads with the first warning, so the
   * list below starts after it. Printing both put the identical reverse-split
   * sentence on screen twice inside one bordered card, which reads as the desk
   * repeating itself rather than as two findings.
   */
  // Never a false clock: the clock prints only when a cited source with that exact instant is EXACT.
  const eventTime = eventTimeText(catalyst.eventTimestamp, catalyst.evidenceSourceIds, intel.evidence);
  const catalystSourceList = catalystSources(catalyst.evidenceSourceIds, intel.evidence);
  // Dated by the version it comes from, never by a checkpoint (Commercial 7g).
  const risk = evidenceRiskView({
    dossier: intel.analysis.dossier,
    schemaVersion: intel.schemaVersion,
    versionGeneratedAt: intel.generatedAt,
    evidence: intel.evidence,
    nowIso: new Date().toISOString(),
  });
  const facts = cycleFacts(intel.analysis?.dossier.computedCycle);
  const supplyGroupList = supplyGroups(structure, intel.evidence);
  // The older of the dossier's time and the checkpoint's, once the grade supplies a checkpoint time (row 24).
  const produced = checkpointAt ? producedNow(intel.generatedAt, checkpointAt) : null;
  const generatedAt = timeWithAge(intel.generatedAt);

  /*
   * The newest source the CATALYST conclusion actually rests on.
   *
   * Computed by `catalystEvidenceLatest` rather than here, because the ordering
   * has a subtlety that must not be reimplemented: a date-only page is stored
   * at noon UTC and would sort AFTER a real 06:30 stamp for the same
   * announcement, ranking the imprecise copy as the later event. One
   * implementation, no drift.
   *
   * It was already computed at `merge.ts:270` and consumed only by the
   * sheet-vs-auto comparison. Nothing rendered it, so the trader read a
   * catalyst summary with no way to see how old the evidence under it was —
   * which is what he asked for: "the sources should be dated, this is not the
   * latest news."
   *
   * A DATE, NEVER A GRADE. The observation is the date; whether three days is
   * fresh is an opinion, and his differs from the model's. `catalyst.freshness`
   * already renders the model's opinion above; this renders the fact.
   */
  const latestSourceAt = timeWithAge(catalystEvidenceLatest(intel));

  const remainingWarnings = structureSummary?.keyWarning
    ? structure.structuralWarnings.filter((warning) => warning !== structureSummary.keyWarning)
    : structure.structuralWarnings;

  return (
    <>
      {comparison && comparison.comparisons.length > 0 ? (
        <SheetVsAuto comparison={comparison} Section={Section} />
      ) : null}
      <Section title="Why It Is Moving">
        <div className="flex flex-wrap items-center gap-2">
          <StatusBadge label={CATALYST_GRADE_LABEL[catalyst.catalystGrade]} tone="dim" />
          <span className="text-[11px] tracking-wide text-ink-3">
            {humanise(catalyst.catalystStatus)} · {humanise(catalyst.freshness)} · confidence{' '}
            {humanise(catalyst.confidence)}
          </span>
        </div>
        {/*
          * Dates sit ABOVE the summary, not under it.
          *
          * The prose is what he acts on, and a date discovered after reading it
          * cannot un-read the claim. This is the same reason the float verdict
          * replaces its number rather than annotating it.
          *
          * Structured as a list so LAST CHECKED can join LAST CHANGED without a
          * retrofit: a reused-unchanged fingerprint mints no version, so an old
          * generatedAt is ambiguous between "nobody looked" and "looked today
          * and found nothing outside SEC" — opposite facts, and today they
          * render identically.
          */}
        <div className="mt-2 flex flex-wrap gap-x-4 gap-y-0.5 text-[11px] text-ink-3">
          <span>
            Newest cited source{' '}
            <span className="num text-ink-2">
              {latestSourceAt ?? 'none dated'}
            </span>
          </span>
        </div>

        <ProseField label="Summary" value={catalyst.summary ?? '—'} className="mt-3" />
        <ProseField
          label="Why traders may care"
          value={catalyst.whyTradersMayCare ?? '—'}
          className="mt-3"
        />
        {/* ET wall clock with its age beside it. A raw UTC ISO string made the
            trader do timezone arithmetic to answer the only question that
            matters about a catalyst: how old is it. */}
        <Field label="Event time" value={eventTime.text} title={eventTime.hover ?? undefined} />
        {/* The sources this catalyst's own conclusion rests on, not the ticker's whole list below. */}
        <SourceList label={CATALYST_SOURCES_LABEL} sources={catalystSourceList} FieldLabel={FieldLabel} />
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
        <ListField
          label="Unresolved"
          items={catalyst.unknowns}
          className="mt-3"
          FieldLabel={FieldLabel}
        />
      </Section>

      {/* Contract row 20. Dated by its version and its sources beside it, or no sources label at all. */}
      <Section title={EVIDENCE_RISK_WORDS.label} titleHover={EVIDENCE_RISK_WORDS.labelHover}>
        {risk.state === 'PRODUCED' ? (
          <>
            <p className="m-0 text-[12px] leading-snug text-ink-1">
              {risk.text} <span className="text-ink-3">({risk.asOf})</span>
            </p>
            <SourceList label={EVIDENCE_RISK_WORDS.sourcesLabel} sources={risk.sources} FieldLabel={FieldLabel} />
          </>
        ) : (
          <p className="m-0 text-[12px] text-ink-2" title={risk.hover ?? undefined}>
            {risk.text}
          </p>
        )}
      </Section>

      <Section title="Structural Intelligence · Desk">
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
            <Field label="Float confidence" value={humanise(structure.floatConfidence)} />
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
          <Field label="Analysis confidence" value={humanise(structure.confidence)} />
        </div>

        <ProseField label="Summary" value={structure.summary ?? '—'} className="mt-3" />

        {supply ? (
          <div className="mt-3 border-l-2 border-line pl-2.5" title={supply.method}>
            {/*
              * A SENTENCE, above the ratios and shaped unlike them.
              *
              * It is a PROOF rather than an estimate: because only holders we
              * actually found can be subtracted, the true float is AT MOST this
              * number. So a bound under the ceiling ESTABLISHES the low-float
              * condition whatever the real float turns out to be — and above it
              * the bound SAYS NOTHING and must be allowed to say nothing. Tone
              * comes from the reading, so NOT_PROVEN renders dim and never as a
              * negative reading in the direction where it is silent.
              */}
            {bound ? (
              <p
                className={`mb-1.5 text-[11px] ${bound.tone === 'pos' ? 'text-pos' : 'text-ink-3'}`}
                title={bound.detail ?? undefined}
              >
                {bound.sentence}
              </p>
            ) : null}

            <FieldLabel>Supply against shares outstanding</FieldLabel>
            <p
              className={`num mt-1 text-[11px] ${
                supply.settles ? 'text-neg' : supply.floorProven ? 'text-ink-1' : 'text-ink-3'
              }`}
            >
              {supply.floor}
            </p>
            {supply.filedMax ? (
              <p className="num mt-0.5 text-[11px] text-ink-2">{supply.filedMax}</p>
            ) : null}
            <p className="num mt-0.5 text-[11px] text-ink-3">{supply.denominator}</p>
            {supply.exclusions ? (
              <p className="mt-0.5 text-[11px] text-ink-3">Not counted: {supply.exclusions}</p>
            ) : null}
          </div>
        ) : noDenominator ? (
          <p className="mt-3 text-[11px] text-ink-3">{noDenominator}</p>
        ) : null}

        {/* Supply evidence in the groups the Sheet used (contract row 18). Every group shows
            its state: an empty one says so rather than dropping its heading. */}
        <div className="mt-3 space-y-3">
          {supplyGroupList.map((group) => (
            <div key={group.key}>
              <FieldLabel>{group.label}</FieldLabel>
              {group.empty ? (
                <p className="m-0 mt-1 text-[11px] text-ink-3" title={SUPPLY_GROUP_EMPTY_HOVER}>
                  {SUPPLY_GROUP_EMPTY}
                </p>
              ) : (
                <ul className="mt-1 space-y-1">
                  {group.lines.map((line, index) => (
                    <li key={index} className="text-[11px] text-ink-2">
                      <span className="text-ink-1">{line.text}</span>
                      {line.sourceIds.length > 0 ? (
                        <span className="text-ink-3">
                          {' · sources '}
                          {line.sourceIds.map((id, at) => {
                            const source = intel.evidence.find((item) => item.id === id);
                            return (
                              <span key={id}>
                                {at > 0 ? ', ' : ''}
                                {source ? (
                                  <a
                                    href={source.url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="underline decoration-dotted underline-offset-2"
                                  >
                                    {id}
                                  </a>
                                ) : (
                                  id
                                )}
                              </span>
                            );
                          })}
                        </span>
                      ) : null}
                    </li>
                  ))}
                  {group.links.map((source) => (
                    <li key={`link-${source.id}`} className="text-[11px]">
                      <a
                        href={source.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-ink-1 underline decoration-dotted underline-offset-2"
                      >
                        {source.secForm ? `${source.secForm}, ` : ''}
                        {source.title ?? humanise(source.sourceType)}
                      </a>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          ))}
        </div>

        {/*
          * The headline warning is already rendered by the structure summary
          * above, so it is not printed a second time here. The drawer used to
          * show the identical reverse-split sentence twice inside one card,
          * both instances visible in a single screen.
          */}
        <ListField
          label="Warnings"
          items={remainingWarnings}
          className="mt-3"
          tone="warn"
          FieldLabel={FieldLabel}
        />
        <ListField
          label="Reverse splits"
          items={structure.reverseSplitHistory}
          className="mt-3"
          FieldLabel={FieldLabel}
        />
        <ListField
          label="Unresolved"
          items={structure.unknowns}
          className="mt-3"
          FieldLabel={FieldLabel}
        />
      </Section>

      <Section title="Momentum Cycle · Automatic">
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
        <Field label="Former runner" value={humanise(cycle.formerRunnerStatus)} />
        <ListField
          label="Recent major runs"
          items={cycle.recentMajorRuns}
          className="mt-3"
          FieldLabel={FieldLabel}
        />
        <ListField
          label="Cycle warnings"
          items={cycle.cycleWarnings}
          className="mt-3"
          tone="warn"
          FieldLabel={FieldLabel}
        />
      </Section>

      {/* Computed from daily bars, beside the model's block above under its own labels. The
          "Former runner" row above keeps its computed meaning (his ruling 2026-10-06T00:38:58Z). */}
      <Section title={CYCLE_FACTS_TITLE}>
        {facts.message ? <p className="m-0 text-[12px] text-ink-2">{facts.message}</p> : null}
        {facts.phase ? <Field label={CYCLE_WORDS.phaseLabel} value={facts.phase} title={CYCLE_WORDS.phaseHover} /> : null}
        {facts.measure ? <Field label={CYCLE_WORDS.measureLabel} value={facts.measure} /> : null}
        {facts.cycleHigh ? <Field label="Cycle high" value={facts.cycleHigh.text} title={facts.cycleHigh.hover} numeric /> : null}
        {facts.flush ? <Field label="Flush from high" value={facts.flush.text} /> : null}
        <div className="mt-3">
          <span title={facts.runs.hover}>
            <FieldLabel>Prior runs</FieldLabel>
          </span>
          {facts.runs.lines.length > 0 ? (
            <ul className="mt-1 space-y-1">
              {facts.runs.lines.map((line, i) => (
                <li
                  key={line}
                  className="text-[12px] leading-snug text-ink-1"
                  title={i === 0 && facts.runs.currentHover ? facts.runs.currentHover : facts.runs.hover}
                >
                  {line}
                </li>
              ))}
            </ul>
          ) : (
            <p className="m-0 mt-1 text-[12px] text-ink-2">{facts.runs.empty}</p>
          )}
        </div>
      </Section>

      <Section title="Evidence & Provenance">
        <Field label="Analysis source" value={humanise(intel.provenance)} />
        <Field label="Generated" value={generatedAt} />
        {produced ? <Field label={PRODUCED_WORDS.label} value={produced.text} title={PRODUCED_WORDS.hover} /> : null}
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
              {intel.evidence.map((source) => {
                /*
                 * ET, NOT THE UTC SLICE THIS USED TO RENDER. `publishedAt` is an
                 * ISO instant, and an announcement at 21:00 ET is already
                 * tomorrow in UTC -- so an after-hours catalyst, which is when
                 * small-cap news actually breaks, cited itself one day late.
                 * `why.ts` already stated the rule this violated: "ET wall
                 * clock for the tooltip and the drawer. Never a UTC ISO string."
                 */
                const publishedDay = formatEtDay(source.publishedAt);
                return (
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
                    [{source.id}] {source.secForm ?? humanise(source.sourceType)}
                    {source.accession ? ` · ${source.accession}` : ''}
                    {source.title ? ` · ${source.title}` : ''}
                  </a>
                  <span className="ml-1 text-ink-3">
                    {humanise(source.authority)}
                    {publishedDay ? ` · ${publishedDay}` : ''}
                    {source.publishedPrecision === 'DATE_ONLY' ? ' (date only)' : ''}
                  </span>
                </li>
                );
              })}
            </ul>
          </div>
        ) : null}
      </Section>
    </>
  );
}
