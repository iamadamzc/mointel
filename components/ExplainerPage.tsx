import { SiteFooter, SiteHeader } from '@/components/SiteChrome';
import type { ExplainerDocument } from '@/lib/public/explainer';

/**
 * The reading frame for an explainer page: the legal pages' frame (header,
 * section index beside a 68ch article, footer) without their adoption banner,
 * dateline or ONE SOURCE box, which belong to a text that is in force.
 *
 * Everything inside <article> comes from the file; this component owns only
 * the chrome around it.
 */
export function ExplainerPage({ document }: { document: ExplainerDocument }) {
  const { html, sections } = document;

  return (
    <div className="min-h-full bg-desk text-ink">
      <SiteHeader />

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
          {/* The text, from the file, and from nowhere else. */}
          <div className="legal-prose explainer-prose" dangerouslySetInnerHTML={{ __html: html }} />
        </article>
      </main>

      <SiteFooter />
    </div>
  );
}
