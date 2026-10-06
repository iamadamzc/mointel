import Link from 'next/link';

/**
 * The header and footer every public reading page shares (the legal pages and
 * the explainer pages). One copy, so the brand line, the nav and the contact
 * address cannot drift apart between pages a stranger moves across.
 */

export function SiteHeader() {
  return (
    <header className="flex items-center justify-between gap-6 border-b border-line px-5 py-4 md:px-24 md:py-5">
      <div className="flex items-baseline gap-3">
        <Link href="/" className="font-mono text-[13px] font-medium tracking-[0.14em] text-ink md:text-[15px]">
          TMI TRADER
        </Link>
        <span className="hidden text-[13px] text-ink-3 md:inline">True Move Intelligence</span>
      </div>
      <nav className="flex items-center gap-5 md:gap-8">
        <Link href="/privacy" className="text-sm text-ink-1 hover:text-ink">Privacy</Link>
        <Link href="/terms" className="text-sm text-ink-1 hover:text-ink">Terms</Link>
        <Link
          href="/desk"
          className="inline-flex h-10 items-center rounded border border-line-2 px-4 text-sm font-medium text-ink"
        >
          Open the desk
        </Link>
      </nav>
    </header>
  );
}

export function SiteFooter() {
  return (
    <footer className="flex flex-col gap-6 border-t border-line bg-panel px-5 py-10 md:flex-row md:items-center md:justify-between md:px-24 md:py-10">
      <p className="text-[13px] text-ink-3">© 2026 Andromeda Genius, Inc.</p>
      <nav className="flex gap-8">
        <Link href="/" className="text-sm text-ink-1 hover:text-ink">Home</Link>
        <Link href="/privacy" className="text-sm text-ink-1 hover:text-ink">Privacy</Link>
        <Link href="/terms" className="text-sm text-ink-1 hover:text-ink">Terms</Link>
        <a href="mailto:info@andromedagenius.com" className="text-sm text-ink-1 hover:text-ink">Contact</a>
      </nav>
    </footer>
  );
}
