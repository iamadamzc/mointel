import { BrandMark } from '@/components/BrandMark';
import type { EntryGateText } from '@/lib/legal/entryGate';

/**
 * The entry gate screen (Commercial 12b). A full page, not an overlay: nothing
 * of the desk is mounted behind it, so there is nothing to trap focus away from.
 *
 * NO CLIENT JAVASCRIPT, like the sign-in screen: ACCEPT and DECLINE are plain
 * form posts, so the gate works before any script loads. The words arrive as
 * props from lib/legal/entryGate.ts and are never retyped here; only the TYPE is
 * imported, because that module computes its version with node:crypto.
 *
 * ACCEPT is the primary action and DECLINE a quieter button of the same size, so
 * declining is as easy to do as accepting and never hidden or shrunk to a link.
 * Both are at least 44 px tall. Nothing is pre-focused: the text comes first.
 */
export function EntryGate({ text, version }: { text: EntryGateText; version: string }) {
  return (
    <div className="flex min-h-full flex-col bg-desk text-ink">
      <header className="flex items-center gap-2.5 border-b border-line px-5 py-4 md:px-24 md:py-5">
        <BrandMark size={22} className="text-accent" />
        <span className="font-mono text-[13px] font-medium tracking-[0.14em] md:hidden">TMI</span>
        <span className="hidden items-baseline gap-2 md:flex">
          <span className="text-[10px] font-semibold tracking-[0.34em] text-ink-3 uppercase">The</span>
          <span className="text-[15px] font-semibold tracking-[0.14em] uppercase">Momentum Intelligence</span>
          <span className="text-[15px] font-medium tracking-[0.14em] text-accent uppercase">Trading Desk</span>
        </span>
      </header>

      <main className="flex flex-grow items-center justify-center px-5 py-12 md:px-8">
        <div className="flex w-full max-w-[520px] flex-col gap-8">
          <h1 className="text-[28px] leading-[1.15] font-semibold tracking-tight md:text-[32px]">{text.title}</h1>

          <div className="flex flex-col gap-4">
            {text.paragraphs.map((paragraph) => (
              <p key={paragraph} className="text-base leading-relaxed text-ink-1">
                {paragraph}
              </p>
            ))}
          </div>

          <p className="text-[13px] leading-relaxed text-ink-3">
            {text.summary}{' '}
            <a
              href={text.termsLink.href}
              target="_blank"
              rel="noopener noreferrer"
              className="text-accent hover:underline"
            >
              {text.termsLink.label}
            </a>
          </p>

          <div className="flex flex-col gap-3 sm:flex-row">
            <form method="post" action="/auth/accept" className="sm:flex-1">
              <input type="hidden" name="version" value={version} />
              <button
                type="submit"
                className="h-12 w-full rounded bg-accent px-6 text-[15px] font-semibold tracking-wide text-desk uppercase hover:opacity-90"
              >
                {text.accept}
              </button>
            </form>
            <form method="post" action="/auth/signout" className="sm:flex-1">
              <button
                type="submit"
                className="h-12 w-full rounded border border-line-2 px-6 text-[15px] font-semibold tracking-wide text-ink-1 uppercase hover:border-ink-3 hover:text-ink"
              >
                {text.decline}
              </button>
            </form>
          </div>
        </div>
      </main>
    </div>
  );
}
