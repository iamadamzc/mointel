import { BrandMark } from '@/components/BrandMark';
import { LandingScreenshot, shotIsReady } from '@/components/LandingScreenshot';
import type { Metadata } from 'next';
import Link from 'next/link';

import {
  ACCESS,
  ACCESS_SHOT,
  BOUNDARIES,
  BOUNDARIES_HEADING,
  FLOAT_PAGE,
  FLOAT_SECTION,
  HERO,
  HERO_SHOT,
  LATER_SECTIONS,
  NAV,
  SECTIONS,
  type Section,
  type Shot,
} from '@/lib/public/landingCopy';

/**
 * The landing page: the public home of tmitrader.com.
 *
 * THE WORDS ARE MARKETING'S, verbatim, from docs/marketing/front-page-copy-2026-10-09.md
 * (Commercial read 41 PASS; his approval before it ships). The SHAPE is Web's twelve
 * sections, docs/web/2026-10-09-front-page-structure.md: a trader's day, each section a
 * heading, its body and its screenshots. Every string a visitor reads lives in the
 * constants below, so the copy can be checked against its source in one place. The
 * canvases (docs/web/canvas/Main.dc.html, LandingMobile.dc.html) are independent copies.
 *
 * Static and cacheable by design. No session, no cookie, no data: a stranger
 * and the trader see the same page, and the desk is reached by its own path.
 * Nothing here fetches anything. Every link is an absolute path, a fragment
 * or a mailto, and a test asserts that.
 */

export const metadata: Metadata = {
  title: 'The Momentum Intelligence Trading Desk',
  description:
    'An intelligence desk for people who trade US small-cap momentum in the premarket: what is moving, why, where it sits in the cycle, what the share structure looks like from the filings, and what supply stands behind it.',
};

const INVITE = 'mailto:info@andromedagenius.com?subject=Invite%20request%3A%20TMI%20Trader';

/**
 * Text and images share a row only when the row has an image ready; a section whose images
 * have not landed (LandingScreenshot renders nothing for them) lets its text take the width.
 */
function columns(shots: Shot[]): { text: string; images: string | null } {
  return shots.some(shotIsReady)
    ? { text: 'md:col-span-5', images: 'md:col-span-7' }
    : { text: 'md:col-span-8', images: null };
}

function Eyebrow({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return (
    <p className={`mb-4 font-mono text-[11px] tracking-[0.16em] text-ink-3 md:mb-5 md:text-xs ${className}`}>{children}</p>
  );
}

function FeatureSection({ section, children }: { section: Section; children?: React.ReactNode }) {
  const cols = columns(section.shots);
  return (
    <section id={section.id} className="border-t border-line px-5 py-10 md:px-24 md:py-20">
      <div className="grid items-start gap-7 md:grid-cols-12 md:gap-16">
        <div className={`flex flex-col gap-4 md:gap-5 ${cols.text}`}>
          <Eyebrow className="mb-0 md:mb-0">{section.eyebrow}</Eyebrow>
          <h2 className="text-[28px] font-semibold leading-[1.14] tracking-tight md:text-[34px]">{section.heading}</h2>
          {section.body.map((paragraph) => (
            <p key={paragraph.slice(0, 40)} className="text-[17px] leading-relaxed text-ink-1">
              {paragraph}
            </p>
          ))}
          {children}
        </div>
        {cols.images && (
          <div className={`flex flex-col gap-6 md:gap-8 ${cols.images}`}>
            {section.shots.map((shot) => (
              <LandingScreenshot key={shot.slot} shot={shot} />
            ))}
          </div>
        )}
      </div>
    </section>
  );
}

/** A rule's lead runs to its first period, colon or semicolon, inclusive; the rest follows verbatim. */
function Rule({ text }: { text: string }) {
  const cut = text.search(/[.:;]/) + 1;
  return (
    <p className="text-[15px] leading-relaxed text-ink-2 md:text-base">
      <strong className="font-semibold text-ink">{text.slice(0, cut)}</strong>
      {text.slice(cut)}
    </p>
  );
}

export default function LandingPage() {
  const heroCols = columns([HERO_SHOT]);
  const accessCols = columns([ACCESS_SHOT]);
  return (
    <div className="bg-desk text-ink">
      <header className="flex items-center justify-between gap-3 border-b border-line px-5 py-4 md:gap-8 md:px-24 md:py-5">
        {/*
          * THE ACRONYM IS THE MOBILE FORM, WHICH IS WHY IT EARNS ITS KEEP.
          * "The Momentum Intelligence Trading Desk" set at 13px and tracked is
          * about 340px, which does not fit beside the nav at 375. So the short
          * form carries small and the full name appears once there is room --
          * and the mark carries both.
          */}
        <div className="flex items-center gap-2.5">
          <BrandMark size={22} className="text-accent" />
          <span className="font-mono text-[13px] font-medium tracking-[0.14em] md:hidden">TMI</span>
          <span className="hidden items-baseline gap-2 md:flex">
            <span className="text-[10px] font-semibold tracking-[0.34em] text-ink-3 uppercase">The</span>
            <span className="text-[15px] font-semibold tracking-[0.14em] uppercase">Momentum Intelligence</span>
            <span className="text-[15px] font-medium tracking-[0.14em] text-accent uppercase">Trading Desk</span>
          </span>
        </div>
        <nav className="flex items-center gap-8">
          <a href="#how" className="hidden text-sm text-ink-1 hover:text-ink md:inline">{NAV.how}</a>
          <a href="#float" className="hidden text-sm text-ink-1 hover:text-ink md:inline">{NAV.float}</a>
          <a href="#not" className="hidden text-sm text-ink-1 hover:text-ink md:inline">{NAV.not}</a>
          <Link
            href="/desk"
            className="inline-flex h-11 items-center rounded border border-line-2 px-4 text-sm font-medium text-ink md:h-10"
          >
            {NAV.desk}
          </Link>
        </nav>
      </header>

      {/* 1. Hero */}
      <section className="grid gap-8 px-5 pb-9 pt-10 md:grid-cols-12 md:gap-12 md:px-24 md:pb-[72px] md:pt-[88px]">
        <div className={heroCols.text}>
          <Eyebrow className="md:mb-6">{HERO.eyebrow}</Eyebrow>
          <h1 className="mb-5 text-4xl font-semibold leading-[1.06] tracking-tight md:mb-7 md:text-[52px] md:leading-[1.04]">
            {HERO.heading}
          </h1>
          <p className="mb-4 max-w-[62ch] text-[17px] leading-relaxed text-ink-1 md:text-[19px]">{HERO.lead}</p>
          <p className="mb-7 max-w-[62ch] text-[17px] leading-relaxed text-ink-1 md:mb-10 md:text-[19px]">
            {HERO.body}{' '}
            <Link href={FLOAT_PAGE} className="text-accent hover:underline">
              {HERO.link}
            </Link>
          </p>

          <div className="flex flex-col gap-3 md:items-start md:gap-4">
            <div className="flex flex-col gap-3 md:flex-row md:flex-wrap md:items-center md:gap-5">
              <a
                href={INVITE}
                className="flex h-[52px] items-center justify-center rounded bg-ink px-6 text-[17px] font-semibold text-desk md:inline-flex md:h-12 md:text-base"
              >
                {HERO.ctaPrimary}
              </a>
              <Link
                href="/desk"
                className="flex h-12 items-center justify-center rounded border border-line-2 text-base font-medium text-ink md:inline-flex md:h-auto md:border-0 md:text-[15px] md:font-normal md:text-ink-1"
              >
                {HERO.ctaSecondary} <span className="hidden md:inline">&nbsp;&rarr;</span>
              </Link>
            </div>
            <p className="max-w-[52ch] text-sm leading-normal text-ink-3">{HERO.accessLine}</p>
          </div>
        </div>
        {heroCols.images && (
          <div className={heroCols.images}>
            <LandingScreenshot shot={HERO_SHOT} />
          </div>
        )}
      </section>

      {/* 2 to 5 */}
      {SECTIONS.map((section) => (
        <FeatureSection key={section.id} section={section} />
      ))}

      {/* 6. The float */}
      <FeatureSection section={FLOAT_SECTION}>
        <p className="text-[17px] leading-relaxed">
          <Link href={FLOAT_PAGE} className="text-accent hover:underline">
            {FLOAT_SECTION.link}
          </Link>
        </p>
        <div className="mt-2 flex flex-col gap-4 border-l-2 border-accent pl-4">
          {FLOAT_SECTION.rules.map((rule) => (
            <Rule key={rule.slice(0, 30)} text={rule} />
          ))}
        </div>
      </FeatureSection>

      {/* 7 to 9 */}
      {LATER_SECTIONS.map((section) => (
        <FeatureSection key={section.id} section={section} />
      ))}

      {/* 10. Boundaries */}
      <section id="not" className="border-t border-line bg-panel px-5 py-10 md:px-24 md:py-20">
        <Eyebrow>{BOUNDARIES_HEADING.eyebrow}</Eyebrow>
        <h2 className="mb-6 text-[28px] font-semibold leading-[1.14] tracking-tight md:mb-11 md:text-[38px]">
          {BOUNDARIES_HEADING.heading}
        </h2>
        <div className="flex flex-col md:grid md:grid-cols-4 md:gap-7">
          {BOUNDARIES.map(([title, body], index) => (
            <div
              key={title}
              className={`flex flex-col gap-2 border-t border-line-2 py-4 md:gap-3 md:pt-5 ${index === 3 ? 'border-b md:border-b-0' : ''}`}
            >
              <h3 className="text-[17px] font-semibold tracking-tight md:text-lg">{title}</h3>
              <p className="text-[15px] leading-relaxed text-ink-2">{body}</p>
            </div>
          ))}
        </div>
      </section>

      {/* 11. Access */}
      <section id="access" className="border-t border-line px-5 py-10 md:px-24 md:py-20">
        <div className="grid items-start gap-8 md:grid-cols-12 md:gap-16">
          <div className={accessCols.text}>
            <Eyebrow>{ACCESS.eyebrow}</Eyebrow>
            <h2 className="mb-4 text-[26px] font-semibold leading-[1.18] tracking-tight md:mb-6 md:text-[30px]">
              {ACCESS.heading}
            </h2>
            {ACCESS.body.map((paragraph, index) => (
              <p
                key={paragraph.slice(0, 30)}
                className={`text-base leading-relaxed md:text-[17px] ${index === 1 ? 'text-ink-1' : 'text-ink-2'} ${
                  'mb-4'
                }`}
              >
                {paragraph}
              </p>
            ))}
            <p className="mb-7 text-base leading-relaxed md:mb-8 md:text-[17px]">
              <Link href="/privacy" className="text-accent hover:underline">
                {ACCESS.privacyLink}
              </Link>
            </p>
            <a
              href={INVITE}
              className="flex h-[52px] items-center justify-center rounded bg-ink px-6 text-[17px] font-semibold text-desk md:inline-flex md:h-12 md:text-base"
            >
              {ACCESS.cta}
            </a>
          </div>
          {accessCols.images && (
            <div className={accessCols.images}>
              <LandingScreenshot shot={ACCESS_SHOT} />
            </div>
          )}
        </div>
      </section>

      {/* 12. Footer, unchanged */}
      <footer className="border-t border-line bg-panel px-5 pb-12 pt-9 md:px-24 md:pb-[72px] md:pt-14">
        <div className="mb-6 flex flex-col gap-6 md:mb-10 md:flex-row md:items-start md:justify-between md:gap-16">
          {/* The footer has the room the header does not, so it takes the
              stacked lockup: brand over format, "The" diminutive and above. */}
          <div className="flex items-center gap-3">
            <BrandMark size={34} className="text-accent" />
            <div className="flex flex-col gap-1">
              <span className="text-[9px] font-semibold tracking-[0.4em] text-ink-3 uppercase">The</span>
              <span className="text-[13px] font-semibold tracking-[0.14em] uppercase md:text-sm">
                Momentum Intelligence
              </span>
              <span className="text-[10px] font-medium tracking-[0.3em] text-accent uppercase">Trading Desk</span>
            </div>
          </div>
          <nav className="flex flex-col md:flex-row md:gap-10">
            <Link href="/privacy" className="flex min-h-12 items-center border-t border-line text-base text-ink-1 hover:text-ink md:min-h-0 md:border-0 md:text-sm">Privacy</Link>
            <Link href="/terms" className="flex min-h-12 items-center border-t border-line text-base text-ink-1 hover:text-ink md:min-h-0 md:border-0 md:text-sm">Terms</Link>
            <a href="mailto:info@andromedagenius.com" className="flex min-h-12 items-center border-t border-line text-base text-ink-1 hover:text-ink md:min-h-0 md:border-0 md:text-sm">Contact</a>
            <Link href="/desk" className="flex min-h-12 items-center border-y border-line text-base text-ink-1 hover:text-ink md:min-h-0 md:border-0 md:text-sm">Open the desk</Link>
          </nav>
        </div>
        <p className="mb-3.5 max-w-[90ch] text-[13px] leading-[1.7] text-ink-3 md:mb-4">
          The Momentum Intelligence Trading Desk is an information service covering publicly traded US
          equities. It is not a broker-dealer,
          not an investment adviser, and nothing it displays is a recommendation to buy or sell any security.
          Market data may be delayed, incomplete or wrong. Trading low-float small-cap equities carries a
          substantial risk of loss, and past movement indicates nothing about what happens next.
        </p>
        <p className="text-[13px] text-ink-3">&copy; 2026 Andromeda Genius, Inc. All rights reserved.</p>
      </footer>
    </div>
  );
}
