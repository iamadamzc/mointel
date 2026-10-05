'use client';

import { Popover } from '@/components/Popover';
import { toneClass, type Tone } from '@/components/StatusBadge';
import {
  CRITERIA,
  CRITERION_NAME,
  READING_LINE,
  SETUP_GRADE_LEGEND,
  setupGradeView,
  type SetupGrade,
} from '@/lib/dashboard/setupGrade';

/**
 * The setup grade, as a badge with a focusable popover.
 *
 * ONE COMPONENT FOR EVERY SURFACE (the board's ticker cell, the dossier drawer,
 * the focus strip): the label, tone, tooltip and accessible name all come from
 * `setupGradeView`, so no surface can say something another does not. The
 * popover opens on hover, focus and click or tap (see `Popover`), which a native
 * `title` cannot do from a keyboard or a phone.
 *
 * The three states are three faces: a letter in a coloured badge, "Not graded",
 * and a dash. A produced-but-unreadable name never prints a dash, and a name
 * with no research never reads "Not graded".
 */
export function SetupGradeBadge({ grade, className = '' }: { grade: SetupGrade | null | undefined; className?: string }) {
  // Only the label is rendered on the server; the tooltip text, which frames the
  // checkpoint time against "now", is built when the popover opens.
  const label = setupGradeView(grade, new Date(0).toISOString());
  const tone: Tone = label.tone;
  const face =
    label.kind === 'letter'
      ? `inline-flex min-w-[18px] items-center justify-center rounded-sm border px-1 py-px text-[10px] leading-none font-semibold ${toneClass(tone)}`
      : label.kind === 'notGraded'
        ? 'inline-flex items-center rounded-sm border border-line px-1 py-px text-[9px] leading-none font-semibold tracking-wide text-ink-3 uppercase'
        : 'inline-flex items-center px-1 text-[11px] leading-none text-ink-3';

  return (
    <Popover
      label={label.ariaLabel}
      triggerClassName={`${face} ${className}`}
      trigger={label.label}
    >
      <SetupGradeTooltip grade={grade} />
    </Popover>
  );
}

function SetupGradeTooltip({ grade }: { grade: SetupGrade | null | undefined }) {
  // Built here, inside the open popover, so the clock is read on the client and
  // never during server rendering.
  const view = setupGradeView(grade, new Date().toISOString());
  return <p className="m-0">{view.tooltip}</p>;
}

/**
 * The drawer's detail: the tooltip's sentence and one line per criterion, in
 * the approved words. A name with no grade says the no-research sentence and
 * nothing else; a stored grade lists all five readings, including the ones that
 * could not be read.
 */
export function SetupGradeReadings({
  grade,
  Section,
}: {
  grade: SetupGrade | null | undefined;
  Section: React.ComponentType<{ title: string; children: React.ReactNode }>;
}) {
  const view = setupGradeView(grade, new Date().toISOString());
  return (
    <Section title="Setup grade">
      <p className="mt-0 mb-2 text-[12px] leading-relaxed text-ink-1">{view.tooltip}</p>
      {grade && view.kind !== 'dash' ? (
        <ul className="m-0 flex list-none flex-col gap-1 p-0">
          {CRITERIA.map((criterion) => (
            <li key={criterion} className="flex gap-2 text-[12px] leading-snug">
              <span className="w-[104px] shrink-0 text-[10px] tracking-[0.08em] text-ink-3 uppercase">
                {CRITERION_NAME[criterion]}
              </span>
              <span className="text-ink-1">{READING_LINE[criterion][grade.basis[criterion]]}</span>
            </li>
          ))}
        </ul>
      ) : null}
      {/* Reachable from every place a grade shows, board open or not (Marketing, section 5). */}
      <p className="mt-2 mb-0 text-[11px] leading-relaxed text-ink-3">{SETUP_GRADE_LEGEND}</p>
    </Section>
  );
}
