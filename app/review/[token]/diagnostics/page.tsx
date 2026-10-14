import Link from 'next/link';

import { ReviewBanner } from '@/components/ReviewBanner';
import { ReviewRefusal } from '@/components/ReviewRefusal';
import { buildDiagnostics, type DiagnosticFinding } from '@/lib/review/diagnostics';
import { expiryClock } from '@/lib/review/access';
import { verifyReviewToken } from '@/lib/review/tokens';

/**
 * The desk's vital signs, on one page, without an SSH session.
 *
 * Laid out as plain labelled values rather than gauges. The reader might be a
 * person and might be a language model, and both are better served by "last
 * whole-market message: 1,247s ago" than by a dial that has to be interpreted.
 */
export const dynamic = 'force-dynamic';

const TONE: Record<DiagnosticFinding['severity'], string> = {
  ERROR: 'border-neg/40 bg-neg/10 text-neg',
  WARN: 'border-warn/40 bg-warn/10 text-warn',
  INFO: 'border-line bg-panel text-ink-3',
};

function Value({ value }: { value: unknown }) {
  if (value === null || value === undefined) {
    return <span className="text-ink-3">—</span>;
  }
  if (typeof value === 'boolean') {
    return <span className={value ? 'text-pos' : 'text-ink-3'}>{value ? 'yes' : 'no'}</span>;
  }
  if (typeof value === 'object') {
    return (
      <span className="font-mono text-[11px] break-all text-ink-2">{JSON.stringify(value)}</span>
    );
  }
  return <span className="font-mono text-[11px] break-all text-ink">{String(value)}</span>;
}

function Section({ title, data }: { title: string; data: Record<string, unknown> }) {
  return (
    <section className="border-b border-line px-4 py-3">
      <h2 className="mb-2 text-[10px] font-semibold tracking-[0.14em] text-ink-3 uppercase">
        {title}
      </h2>
      <dl className="grid grid-cols-1 gap-x-6 gap-y-1 sm:grid-cols-2 lg:grid-cols-3">
        {Object.entries(data).map(([key, value]) => (
          <div key={key} className="flex items-baseline justify-between gap-3 border-b border-line/40 py-0.5">
            <dt className="text-[11px] text-ink-3">{key}</dt>
            <dd className="text-right">
              <Value value={value} />
            </dd>
          </div>
        ))}
      </dl>
    </section>
  );
}

export default async function ReviewDiagnosticsPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const check = verifyReviewToken(token);
  if (!check.ok) return <ReviewRefusal reason={check.reason} />;

  const d = await buildDiagnostics();

  return (
    <div className="flex h-screen flex-col overflow-hidden bg-desk">
      <ReviewBanner expiresAtClock={expiryClock(check.token.expiresAt)} />

      <header className="flex shrink-0 items-baseline justify-between border-b border-line px-4 py-2">
        <h1 className="text-[12px] font-semibold tracking-[0.1em] text-ink uppercase">
          Desk diagnostics
        </h1>
        <Link href={`/review/${token}/`} className="text-[11px] text-accent hover:underline">
          ← back to the desk
        </Link>
      </header>

      <main className="min-h-0 flex-1 overflow-y-auto">
        <section className="border-b border-line px-4 py-3">
          <h2 className="mb-2 text-[10px] font-semibold tracking-[0.14em] text-ink-3 uppercase">
            Consistency checks
          </h2>
          <ul className="space-y-1">
            {d.consistency.map((finding, index) => (
              <li
                key={`${finding.check}-${index}`}
                className={`rounded-sm border px-2 py-1 text-[11px] ${TONE[finding.severity]}`}
              >
                <span className="font-semibold">{finding.severity}</span>
                <span className="mx-1.5 font-mono text-[10px] opacity-70">{finding.check}</span>
                {finding.detail}
              </li>
            ))}
          </ul>
        </section>

        <Section title="Deployment" data={d.deployment} />
        <Section title="Market worker" data={d.market} />
        <Section title="Research worker" data={d.research} />
        <Section title="Assessment scheduler" data={d.assessments} />
        <Section title="Database" data={d.database} />
        <Section title="Server resources" data={d.resources} />
        <Section title="Intelligence coverage" data={d.intelligence} />

        <section className="px-4 py-3">
          <h2 className="mb-2 text-[10px] font-semibold tracking-[0.14em] text-ink-3 uppercase">
            Recent errors ({d.recentErrors.length})
          </h2>
          {d.recentErrors.length === 0 ? (
            <p className="text-[11px] text-ink-3">Nothing has been recorded.</p>
          ) : (
            <ul className="space-y-1">
              {d.recentErrors.map((error, index) => (
                <li key={index} className="border-b border-line/40 py-1 text-[11px]">
                  <span className="font-mono text-[10px] text-ink-3">{error.atEt ?? '—'}</span>
                  <span className="mx-2 font-semibold text-ink-2">{error.component}</span>
                  <span className="mr-2 font-mono text-[10px] text-ink-3">{error.category}</span>
                  <span className="text-ink">{error.message}</span>
                </li>
              ))}
            </ul>
          )}
        </section>

        <footer className="px-4 pb-6 text-[10px] text-ink-3">
          Generated {d.generatedAt}. This page reads state the desk already keeps; it runs no
          integrity check, makes no model call, and queues no work. The same data is available as
          JSON at{' '}
          <code className="font-mono">/review/&lt;token&gt;/api/diagnostics</code>.
        </footer>
      </main>
    </div>
  );
}
