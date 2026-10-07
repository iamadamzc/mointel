import { SiteFooter, SiteHeader } from '@/components/SiteChrome';
import type { LegalDocument } from '@/lib/legal/document';

/**
 * The reading frame for a legal document, after the `Privacy` artboard.
 *
 * Everything inside <article> comes from the file; this component owns only
 * the chrome around it. The banner is decided by `adopted` alone: a date means
 * IN FORCE, null means DRAFT. There is no third state and no way to render an
 * adopted look for a draft file.
 */

function longDate(iso: string): string {
  const [y, m, d] = iso.split('-').map(Number);
  if (!y || !m || !d) return iso;
  return new Date(Date.UTC(y, m - 1, d)).toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC',
  });
}

export function LegalPage({ document }: { document: LegalDocument }) {
  const { frontmatter, html, sections, sourcePath } = document;
  const adopted = frontmatter.adopted;

  return (
    <div className="min-h-full bg-desk text-ink">
      <SiteHeader />

      {adopted ? (
        <div className="flex items-center gap-4 border-b border-line bg-panel px-5 py-3.5 md:px-24">
          <span className="font-mono text-[11px] tracking-[0.16em] text-pos">IN FORCE</span>
          <span className="text-sm text-ink-2">
            Adopted {longDate(adopted)}. This is the {frontmatter.title.toLowerCase()} the service operates under.
          </span>
        </div>
      ) : (
        <div className="flex items-center gap-4 border-b border-warn/40 bg-panel px-5 py-3.5 md:px-24">
          <span className="font-mono text-[11px] tracking-[0.16em] text-warn">DRAFT</span>
          <span className="text-sm text-ink-2">
            Not yet adopted. This text is under review and is not the {frontmatter.title.toLowerCase()} the
            service operates under.
          </span>
        </div>
      )}

      <main className="grid gap-10 px-5 py-10 md:grid-cols-[260px_minmax(0,1fr)] md:gap-20 md:px-24 md:py-16">
        <nav aria-label="Sections" className="flex flex-col self-start md:sticky md:top-8">
          <span className="pb-3.5 font-mono text-[11px] tracking-[0.16em] text-ink-3">ON THIS PAGE</span>
          {sections.map((section, index) => (
            <a
              key={section.id}
              href={`#${section.id}`}
              className={`border-t border-line py-2 text-sm leading-relaxed text-ink-1 hover:text-ink ${
                index === sections.length - 1 ? 'border-b' : ''
              }`}
            >
              {section.title}
            </a>
          ))}
        </nav>

        <article className="max-w-[68ch]">
          <p className="mb-12 font-mono text-[13px] text-ink-3">
            {frontmatter.drafted ? `DRAFTED ${frontmatter.drafted}` : 'DRAFTED —'}
            {'  ·  '}
            {adopted ? `ADOPTED ${adopted}` : 'NOT ADOPTED'}
            {'  ·  '}
            {frontmatter.lastChanged ? `LAST CHANGED ${frontmatter.lastChanged}` : ''}
          </p>

          {/* The text, from the file, and from nowhere else. */}
          <div className="legal-prose" dangerouslySetInnerHTML={{ __html: html }} />

          <div className="mt-12 flex flex-col gap-2 rounded border border-line bg-panel px-7 py-6">
            <span className="font-mono text-[11px] tracking-[0.16em] text-ink-3">ONE SOURCE</span>
            <p className="text-sm leading-relaxed text-ink-2">
              This page renders <span className="font-mono text-ink-1">{sourcePath}</span> at request time. The
              words are edited there and nowhere else, so the page you are reading and the file under review
              cannot disagree.
            </p>
          </div>
        </article>
      </main>

      <SiteFooter />
    </div>
  );
}
