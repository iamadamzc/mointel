import type {
  CatalystGradeBucket,
  PriorityBucket,
  SessionKind,
  StructureState,
} from '@/lib/data/types';

export type Tone = 'pos' | 'warn' | 'neg' | 'accent' | 'neutral' | 'dim';

const TONE_CLASS: Record<Tone, string> = {
  pos: 'border-pos/35 bg-pos/12 text-pos',
  warn: 'border-warn/35 bg-warn/12 text-warn',
  neg: 'border-neg/35 bg-neg/12 text-neg',
  accent: 'border-accent/35 bg-accent/12 text-accent',
  neutral: 'border-line-2 bg-panel-3 text-ink-2',
  dim: 'border-line bg-panel-2 text-ink-3',
};

/** The badge colours, for a control that has to be a button but must look like one. */
export function toneClass(tone: Tone): string {
  return TONE_CLASS[tone];
}

interface StatusBadgeProps {
  label: string;
  tone?: Tone;
  /** Full source text, surfaced on hover so nothing is lost to truncation. */
  title?: string;
  className?: string;
}

export function StatusBadge({ label, tone = 'neutral', title, className = '' }: StatusBadgeProps) {
  return (
    <span
      title={title ?? label}
      className={`inline-flex max-w-full items-center gap-1 truncate rounded-sm border px-1.5 py-px text-[10px] font-semibold tracking-wide uppercase ${TONE_CLASS[tone]} ${className}`}
    >
      {label}
    </span>
  );
}


export function priorityTone(bucket: PriorityBucket): Tone {
  switch (bucket) {
    case 'A':
      return 'accent';
    case 'B':
      return 'neutral';
    case 'C':
      return 'dim';
    case 'AVOID':
      return 'neg';
    default:
      return 'dim';
  }
}

export function catalystTone(bucket: CatalystGradeBucket): Tone {
  switch (bucket) {
    case 'A':
      return 'pos';
    case 'B':
      return 'neutral';
    case 'C':
      return 'warn';
    default:
      return 'dim';
  }
}

export function structureTone(state: StructureState): Tone {
  switch (state) {
    case 'DIRTY_FLOAT':
      return 'neg';
    case 'UNKNOWN_STRUCTURE':
      return 'warn';
    case 'CLEAN':
      return 'pos';
    default:
      return 'dim';
  }
}

export function sessionTone(session: SessionKind): Tone {
  switch (session) {
    case 'PM':
      return 'accent';
    case 'AH':
      return 'neutral';
    case 'RTH':
      return 'dim';
    default:
      return 'dim';
  }
}

/** Colors a percentage by direction; unparsed values stay neutral. */
export function changeTone(value: number | null): string {
  if (value === null) return 'text-ink-2';
  if (value > 0) return 'text-pos';
  if (value < 0) return 'text-neg';
  return 'text-ink-2';
}

/** Priority chip: short bucket letter, full source text on hover. */
export function PriorityBadge({
  bucket,
  raw,
  isRevised,
}: {
  bucket: PriorityBucket;
  raw: string;
  isRevised: boolean;
}) {
  const label =
    bucket === 'AVOID' || bucket === 'EXCLUDED'
      ? bucket
      : bucket === 'UNCLASSIFIED'
        ? '—'
        : bucket;

  return (
    <span className="inline-flex items-center gap-1">
      <StatusBadge label={label} tone={priorityTone(bucket)} title={raw || 'No priority set'} />
      {isRevised ? (
        <span
          title="Revised Priority is overriding the original Priority"
          className="text-[9px] font-semibold tracking-wide text-accent uppercase"
        >
          rev
        </span>
      ) : null}
    </span>
  );
}

/** Structure chip: only ever states what the source text explicitly says. */
export function StructureBadge({ state, raw }: { state: StructureState; raw: string }) {
  if (state === 'UNCLASSIFIED') {
    return (
      <StatusBadge
        label="Unclassified"
        tone="dim"
        title={raw || 'No structure classification present in the source data'}
      />
    );
  }

  const label =
    state === 'DIRTY_FLOAT'
      ? 'Dirty Float'
      : state === 'UNKNOWN_STRUCTURE'
        ? 'Unknown Structure'
        : 'Clean Float';

  return <StatusBadge label={label} tone={structureTone(state)} title={raw || label} />;
}
