import { BrandMark } from '@/components/BrandMark';
import type { Metadata } from 'next';
import Link from 'next/link';

/**
 * The landing page: the public home of tmitrader.com, from the `Landing`
 * artboards (desktop and phone) in docs/web/canvas, Web's words verbatim.
 *
 * Static and cacheable by design. No session, no cookie, no data: a stranger
 * and the trader see the same page, and the desk is reached by its own path.
 * Nothing here fetches anything. Every link is an absolute path, a fragment
 * or a mailto, and a test asserts that, because the property "nothing assumes
 * the root" was measured on the tree before this page existed.
 */

export const metadata: Metadata = {
  title: 'The Momentum Intelligence Trading Desk',
  description:
    'An intelligence desk for people who trade US small-cap momentum in the premarket: what is moving, why, where it sits in the cycle, what the share structure actually looks like, and what supply stands behind it.',
};

const INVITE = 'mailto:info@andromedagenius.com?subject=Invite%20request%20%E2%80%94%20TMI%20Trader';

function Eyebrow({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return (
    <p className={`mb-4 font-mono text-[11px] tracking-[0.16em] text-ink-3 md:mb-5 md:text-xs ${className}`}>{children}</p>
  );
}

function Card({
  tag,
  tagClass,
  title,
  children,
  warn = false,
}: {
  tag: string;
  tagClass: string;
  title: string;
  children: React.ReactNode;
  warn?: boolean;
}) {
  return (
    <div
      className={`flex flex-col gap-3 rounded border bg-panel p-[22px] md:gap-3.5 md:p-8 ${
        warn ? 'border-warn' : 'border-line'
      }`}
    >
      <span className={`font-mono text-[10px] tracking-[0.16em] md:text-[11px] ${tagClass}`}>{tag}</span>
      <h3 className="text-[19px] font-semibold tracking-tight md:text-[22px]">{title}</h3>
      {children}
    </div>
  );
}

export default function LandingPage() {
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
          <a href="#engines" className="hidden text-sm text-ink-1 hover:text-ink md:inline">How it works</a>
          <a href="#not" className="hidden text-sm text-ink-1 hover:text-ink md:inline">What it isn&rsquo;t</a>
          <Link
            href="/desk"
            className="inline-flex h-11 items-center rounded border border-line-2 px-4 text-sm font-medium text-ink md:h-10"
          >
            Open the desk
          </Link>
        </nav>
      </header>

      {/* Hero */}
      <section className="grid gap-8 px-5 pb-9 pt-10 md:grid-cols-12 md:px-24 md:pb-[72px] md:pt-[88px]">
        <div className="md:col-span-7">
          <Eyebrow className="md:mb-6">US SMALL CAPS &nbsp;&middot;&nbsp; 04:00 ET ONWARD</Eyebrow>
          <h1 className="mb-5 text-4xl font-semibold leading-[1.06] tracking-tight md:mb-7 md:text-6xl md:leading-[1.04]">
            Intelligence on what&rsquo;s moving.
          </h1>
          <p className="mb-4 max-w-[62ch] text-[17px] leading-relaxed text-ink-1 md:text-[19px]">
            It is 07:15, a name is running, and nothing you can find explains it.
          </p>
          <p className="mb-7 max-w-[62ch] text-[17px] leading-relaxed text-ink-1 md:mb-10 md:text-[19px]">
            This tells you what the move is standing on. Whether there is a catalyst and how old it is. Where
            it sits in the run. What the float actually is, and how many shares can reach the market that the
            float does not count. Before you have to decide. Where it has nothing, it says so.
          </p>

          <div className="flex flex-col gap-3 md:items-start md:gap-4">
            <div className="flex flex-col gap-3 md:flex-row md:flex-wrap md:items-center md:gap-5">
              <a
                href={INVITE}
                className="flex h-[52px] items-center justify-center rounded bg-ink px-6 text-[17px] font-semibold text-desk md:inline-flex md:h-12 md:text-base"
              >
                Ask for an invite
              </a>
              <Link
                href="/desk"
                className="flex h-12 items-center justify-center rounded border border-line-2 text-base font-medium text-ink md:inline-flex md:h-auto md:border-0 md:text-[15px] md:font-normal md:text-ink-1"
              >
                Already have access? Open the desk <span className="hidden md:inline">&nbsp;&rarr;</span>
              </Link>
            </div>
            <p className="max-w-[52ch] text-sm leading-normal text-ink-3">
              Access is by invite, and sign-in is handled by Google.{' '}
              <Link href="/privacy" className="text-accent hover:underline">
                What we hold, and what we never ask for
              </Link>
              .
            </p>
          </div>
        </div>

        {/* Example board: illustration only, no market data. */}
        {/* THE SEPARATOR INSIDE THIS ILLUSTRATION IS THE BOARD'S, NOT THE SITE'S.
            `&middot;` is what the real board uses between a label and its
            qualifier (Design, 1dacc16: "Demand · Alpaca", "red · backside").
            Elsewhere on this page a label separator is a colon ("01: IT CATCHES
            THEM COMING INTO PLAY"), which is the site's own convention and
            settled with Design per-surface, 2026-09-30.

            So do NOT "fix" this to a colon for consistency with the rest of the
            page. This block DEPICTS the product, and the boundary is site prose
            versus depicted board, not site versus board. A colon here would make
            the illustration disagree with the thing it illustrates. */}
        <div className="flex flex-col gap-2.5 md:col-span-5">
          <div className="overflow-hidden rounded border border-line bg-panel">
            <div className="flex items-center justify-between border-b border-line bg-panel-2 px-4 py-3">
              <span className="font-mono text-[10px] tracking-[0.14em] text-ink-3 md:text-[11px]">
                DISCOVERY &nbsp;&middot;&nbsp; 07:41 ET
              </span>
            </div>
            <table className="hidden w-full table-fixed border-collapse md:table">
              <caption className="px-4 pb-3 pt-2.5 text-left text-xs text-ink-3 [caption-side:bottom]">
                Example board. Illustration only. No market data.
              </caption>
              <thead>
                <tr className="font-mono text-[10px] tracking-[0.12em] text-ink-3">
                  <th scope="col" className="w-16 border-b border-line py-2.5 pl-4 text-left font-normal">SYM</th>
                  <th scope="col" className="w-32 border-b border-line py-2.5 pr-3 text-left font-normal">CYCLE</th>
                  <th scope="col" className="border-b border-line py-2.5 pr-4 text-left font-normal">STRUCTURE</th>
                </tr>
              </thead>
              <tbody className="align-top text-[13px] leading-snug text-ink-1">
                <tr>
                  <th scope="row" className="border-b border-line py-4 pl-4 text-left font-mono text-sm font-medium text-ink">ABCD</th>
                  <td className="border-b border-line py-4 pr-3">Frontside, day 1</td>
                  <td className="border-b border-line py-4 pr-4">
                    Float 3.2M, verified<br />
                    <span className="text-warn">$50M ATM live</span>
                    <span className="text-ink-3">&nbsp;&middot;&nbsp; readout 06:12</span>
                  </td>
                </tr>
                <tr>
                  <th scope="row" className="py-4 pl-4 text-left font-mono text-sm font-medium text-ink">WXYZ</th>
                  <td className="py-4 pr-3 font-mono text-xs text-ink-3">&mdash;</td>
                  <td className="py-4 pr-4">
                    <span className="font-mono text-[11px] tracking-[0.1em] text-pos">DEMAND DETECTED</span><br />
                    <span className="font-mono text-[11px] tracking-[0.1em] text-ink-3">NO STRUCTURAL ANALYSIS AVAILABLE</span>
                  </td>
                </tr>
              </tbody>
            </table>
            {/* The five-column board is not honest at phone width: the same two rows, stacked. */}
            <div className="md:hidden">
              <div className="flex flex-col gap-2.5 border-b border-line p-4">
                <div className="flex items-baseline gap-3">
                  <span className="font-mono text-base font-medium">ABCD</span>
                  <span className="ml-auto text-sm text-ink-3">Frontside, day 1</span>
                </div>
                <p className="text-sm leading-normal text-ink-1">
                  Float 3.2M, verified &nbsp;&middot;&nbsp; <span className="text-warn">$50M ATM live</span>
                </p>
                <p className="text-sm leading-normal text-ink-3">Structural readout 06:12</p>
              </div>
              <div className="flex flex-col gap-2.5 p-4">
                <div className="flex items-baseline gap-3">
                  <span className="font-mono text-base font-medium">WXYZ</span>
                  <span className="ml-auto font-mono text-[13px] text-ink-3">&mdash;</span>
                </div>
                <span className="font-mono text-[11px] tracking-[0.1em] text-pos">DEMAND DETECTED</span>
                <span className="font-mono text-[11px] tracking-[0.1em] text-ink-3">NO STRUCTURAL ANALYSIS AVAILABLE</span>
              </div>
            </div>
          </div>
          <p className="text-xs text-ink-3 md:hidden">Example board. Illustration only. No market data.</p>
        </div>
      </section>

      {/* What it does that a chart does not */}
      <section className="border-t border-line px-5 py-10 md:px-24 md:py-20">
        <Eyebrow>WHAT IT DOES THAT A CHART DOES NOT</Eyebrow>
        <h2 className="mb-7 text-[28px] font-semibold leading-[1.14] tracking-tight md:mb-11 md:text-[38px]">
          None of this is on the chart.
        </h2>
        <div className="grid gap-4 md:grid-cols-2 md:gap-8">
          <Card tag="01: IT CATCHES THEM COMING INTO PLAY" tagClass="text-pos" title="As it happens, not once it tops a list">
            <p className="text-[15px] leading-relaxed text-ink-1 md:text-base">
              Relative volume is ranked across every small cap at once, so a name shows up as it crosses into
              the day&rsquo;s runners, not after it is already third on somebody&rsquo;s list. Once it is on the
              board it stays for the session. A name that goes quiet at 08:10 and goes again at 09:20 is still
              there, because the one you stopped watching is the one that runs.
            </p>
          </Card>
          <Card tag="02: IT READS THE FILINGS. YOU DON’T HAVE TO." tagClass="text-accent" title="Nobody is typing a ticker into EDGAR at 07:15">
            <p className="text-[15px] leading-relaxed text-ink-1 md:text-base">
              Not with half a decision already made and the name still moving. The filings were pulled and read
              when the name reached the top of the ranking.{' '}
              <strong className="font-semibold text-ink">How, and by what rules, is below.</strong>
            </p>
          </Card>
          <Card tag="03: IT SAYS CAPACITY." tagClass="text-accent" title="It never says selling.">
            <p className="text-[15px] leading-relaxed text-ink-1 md:text-base">
              A resale registration, a warrant, a convertible: each is labelled as what it is, shares that can
              come to market. <strong className="font-semibold text-ink">Not shares that are coming.</strong> A
              filing tells you capacity and nothing else. Anything that tells you someone is selling is guessing.
            </p>
          </Card>
          <Card tag="04: IT TELLS YOU THE FLOAT IS WRONG" tagClass="text-warn" title="DIRTY FLOAT" warn>
            <p className="text-[15px] leading-relaxed text-ink-1 md:text-base">
              The float on your screen is a number someone published on a date. It knows nothing about the shelf
              that went effective on Tuesday, the warrants struck under the current price, or the note that
              converts at a discount to here.
            </p>
            <p className="border-l-2 border-warn pl-4 text-[15px] leading-relaxed text-ink md:text-base">
              When those exist, the board says so in one label and one sentence:{' '}
              <em>the displayed float understates the shares that can reach the market.</em>
            </p>
          </Card>
        </div>
      </section>

      {/* Research */}
      <section id="research" className="border-t border-line bg-panel px-5 py-10 md:px-24 md:py-20">
        <Eyebrow>THE RESEARCH IS DONE BEFORE YOU SIT DOWN</Eyebrow>
        <h2 className="mb-5 max-w-[880px] text-[28px] font-semibold leading-[1.14] tracking-tight md:mb-11 md:text-[38px]">
          The filings get read the night before. Not because you asked.
        </h2>
        <div className="grid items-start gap-7 md:grid-cols-12 md:gap-16">
          <div className="flex flex-col gap-4 md:col-span-6 md:gap-5">
            <p className="text-[17px] leading-relaxed text-ink-1 md:text-lg">
              A name that moves after the bell is on the desk&rsquo;s list that evening. The desk finds the
              company behind the ticker, pulls the filings that can carry a share count, a registration, a
              resale or a financing, and reads the paragraphs that bear on the question. Not the most recent
              twenty documents:{' '}
              <strong className="font-semibold text-ink">
                a shelf that went effective in March does not get pushed off the list by a run of 8-Ks.
              </strong>
            </p>
            <p className="text-[17px] leading-relaxed text-ink-1 md:text-lg">
              By the time the premarket opens, each name at the top of the ranking carries a reading, or says
              plainly that it does not have one yet.
            </p>
            <p className="text-[17px] leading-relaxed text-ink-1 md:text-lg">
              And it does not read again on a timer. A name is re-read when the company files something, not
              because ten minutes passed.
            </p>
          </div>
          <div className="flex flex-col gap-5 md:col-span-6 md:gap-7">
            <p className="font-mono text-[10px] tracking-[0.16em] text-ink-3 md:text-[11px]">FOUR RULES IT READS BY</p>
            {[
              ['Shares outstanding is never called float.', 'A count off a cover page is an upper bound on the float, and it is labelled as one. Every share an insider holds is inside it.'],
              ['Supply is two numbers, not one.', 'What is proven live, and what is filed at most. The gap between them is the desk’s uncertainty, printed as a width. It is never rounded to zero.'],
              ['A count from before a reverse split is never compared to one from after it.', 'A block counts against today’s shares only when the desk knows both were stated on the same basis. Unknown is not yes.'],
              ['Every float is somebody’s computation. No filing we know of reports the current number of tradable shares.', 'So the desk checks the float it is shown against the filed share count, and refuses the one that cannot be right. The rules are visible and a failure is detectable.'],
            ].map(([title, body]) => (
              <div key={title}>
                <h3 className="mb-1.5 text-lg font-semibold tracking-tight md:mb-2 md:text-xl">{title}</h3>
                <p className="text-[15px] leading-relaxed text-ink-2 md:text-base">{body}</p>
              </div>
            ))}
            <p className="border-l-2 border-accent pl-3.5 text-[15px] leading-relaxed text-ink-1 md:text-base">
              &ldquo;Not researched&rdquo; and &ldquo;researched, nothing found&rdquo; are different states and
              they look different on the board. The first says the desk has not looked. The second says it looked.
            </p>
          </div>
        </div>
      </section>

      {/* Why it exists */}
      <section className="border-t border-line px-5 py-10 md:px-24 md:py-20">
        <div className="grid items-start gap-5 md:grid-cols-12 md:gap-16">
          <div className="md:col-span-5">
            <Eyebrow>WHY IT EXISTS</Eyebrow>
            <h2 className="text-[28px] font-semibold leading-[1.14] tracking-tight md:text-[38px]">
              The move is obvious. What is underneath it is not.
            </h2>
          </div>
          <div className="flex flex-col gap-4 md:col-span-7 md:gap-5">
            <p className="text-[17px] leading-relaxed text-ink-1 md:text-lg">
              By the time a small cap clears your scanner it is already running and you are deciding in seconds.
              Nothing on the chart says there is an ATM live under it, that the float on your screen is the one
              from before the offering, or that this is day two and day one already failed.
            </p>
            <p className="text-[17px] leading-relaxed text-ink-1 md:text-lg">
              All of it is public. All of it is filed. None of it is findable in the time you actually have. In
              August it was 50% movers, one after another, on nothing anyone could name at 07:15. This was built
              to close that gap, by someone who trades it, focused on the premarket and the early regular session.
            </p>
            <p className="text-[17px] leading-relaxed text-ink-1 md:text-lg">
              Premarket, regular hours or after the close, the question is the same: what is this move standing
              on? The board runs from 04:00 through the after-hours session, and{' '}
              <strong className="text-ink">a float does not get cleaner at 09:30.</strong>
            </p>
          </div>
        </div>
      </section>

      {/* How it works */}
      <section id="engines" className="border-t border-line px-5 py-10 md:px-24 md:py-20">
        <Eyebrow>HOW IT WORKS</Eyebrow>
        {/* The registered plain statement, verbatim. Commercial owns these words;
            docs/commercial/2026-09-08-product-name.md §2e item 2. */}
        <p className="mb-7 max-w-[74ch] text-base leading-relaxed text-ink-1 md:mb-10 md:text-lg">
          The Momentum Intelligence Trading Desk is built for people who trade $1&ndash;$20 small-cap momentum
          in the premarket. It is not a scanner and it is not a signal service: it takes the names that are already
          moving and puts everything the desk knows about each one on a single shared board. Why it is
          moving, where it sits in the cycle, what the share structure is, and what supply stands behind it.
          Where it has nothing, it says so.
        </p>
        <h2 className="mb-4 text-[28px] font-semibold leading-[1.14] tracking-tight md:mb-5 md:text-[38px]">
          The tape and the paperwork. Kept apart on purpose.
        </h2>
        <p className="mb-7 max-w-[68ch] text-base leading-relaxed text-ink-2 md:mb-12 md:text-[17px]">
          One reads what the market is doing. One reads what the company has filed. They answer different
          questions, they disagree more often than you would think, and the desk shows you both instead of
          blending them into a score.
        </p>
        <div className="grid gap-4 md:grid-cols-2 md:gap-8">
          <Card tag="DEMAND: THE TAPE" tagClass="text-pos" title="What the market is doing">
            <p className="text-[15px] leading-relaxed text-ink-1 md:text-base">
              Volume against the name&rsquo;s own twenty-session baseline, the ranking that follows from it, and
              the moment a name crosses into the day&rsquo;s runners.
            </p>
          </Card>
          <Card tag="STRUCTURE: THE PAPERWORK" tagClass="text-accent" title="What that move is standing on">
            <p className="text-[15px] leading-relaxed text-ink-1 md:text-base">
              Float, and whether the float can be trusted. Supply waiting in the wings: warrants, convertibles,
              PIPEs, ATMs, resale shelves, reverse-split distortion. The levels that matter and the warnings
              attached to them.
            </p>
          </Card>
        </div>
        <div className="mt-4 grid items-center gap-4 rounded border border-line-2 p-[22px] md:mt-8 md:grid-cols-12 md:gap-8 md:p-8">
          <div className="flex flex-col gap-3 md:col-span-7 md:gap-3.5">
            <span className="font-mono text-[10px] tracking-[0.16em] text-warn md:text-[11px]">WHEN THERE IS NOTHING TO SAY</span>
            <h3 className="text-[19px] font-semibold tracking-tight md:text-[22px]">Unknown stays unknown</h3>
            <p className="text-[15px] leading-relaxed text-ink-1 md:text-base">
              No missing value is quietly rounded to zero, and no classification is asserted that the source did
              not state. When the tape has found something and the research has nothing to say about it, the desk
              prints exactly that and leaves the column empty.
            </p>
          </div>
          <div className="flex flex-col gap-1.5 md:col-span-5 md:border-l md:border-line md:pl-8">
            <span className="font-mono text-xs tracking-[0.1em] text-pos">DEMAND DETECTED</span>
            <span className="font-mono text-xs tracking-[0.1em] text-ink-3">NO STRUCTURAL ANALYSIS AVAILABLE</span>
            <p className="mt-2.5 text-[13px] text-ink-3">A real state on the board, not an error.</p>
          </div>
        </div>
      </section>

      {/* Seven questions */}
      <section className="border-t border-line px-5 py-10 md:px-24 md:py-20">
        <Eyebrow>WHAT IT ANSWERS</Eyebrow>
        <h2 className="mb-7 text-[28px] font-semibold leading-[1.14] tracking-tight md:mb-11 md:text-[38px]">
          Seven questions, for each name on the board.
        </h2>
        <div className="grid md:grid-cols-2 md:gap-x-16">
          {[
            ['01', 'Which names are in play right now'],
            ['02', 'Why each one is moving'],
            ['03', 'Where it sits in the momentum cycle'],
            ['04', 'What the share structure actually looks like'],
            ['05', 'Whether the displayed float can be trusted'],
            ['06', 'Whether there is supply waiting behind the move'],
            ['07', 'The levels, and the warnings attached to them'],
          ].map(([n, q]) => (
            <div key={n} className="flex gap-5 border-t border-line py-4">
              <span className="pt-1 font-mono text-xs text-ink-3">{n}</span>
              <span className="text-[17px] leading-normal text-ink">{q}</span>
            </div>
          ))}
          <div className="flex gap-5 border-y border-line py-4">
            <span className="pt-1 font-mono text-xs text-ink-3">&mdash;</span>
            <span className="text-[17px] leading-normal text-ink-3">And where it has nothing, that it has nothing</span>
          </div>
        </div>
      </section>

      {/* Boundaries */}
      <section id="not" className="border-t border-line bg-panel px-5 py-10 md:px-24 md:py-20">
        <Eyebrow>BOUNDARIES</Eyebrow>
        <h2 className="mb-6 text-[28px] font-semibold leading-[1.14] tracking-tight md:mb-5 md:text-[38px]">What it is not.</h2>
        <p className="mb-0 hidden max-w-[68ch] text-[17px] leading-relaxed text-ink-2 md:mb-11 md:block">Four things it does not do.</p>
        <div className="flex flex-col md:grid md:grid-cols-4 md:gap-7">
          {[
            ['Not a scanner', 'It does not run your filters or replace a scanner. It ranks names that are already moving and reports what is underneath them.'],
            ['Not a broker', 'No account, no orders, no positions, no connection of any kind to your brokerage. It cannot place a trade and never asks for permission to.'],
            ['Not signals', 'No entry arrows, no exit alerts, no chat room. It reports; it does not recommend.'],
            ['Not advice', 'An information service about publicly traded securities. Not a broker-dealer, not an investment adviser, and not a recommendation to buy or sell anything.'],
          ].map(([title, body], index) => (
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

      {/* Who runs it / Access */}
      <section className="border-t border-line px-5 py-10 md:px-24 md:py-20">
        <div className="grid items-start gap-8 md:grid-cols-12 md:gap-16">
          <div className="hidden md:col-span-6 md:block">
            <Eyebrow>WHO RUNS IT</Eyebrow>
            <h2 className="mb-6 text-[30px] font-semibold leading-[1.18] tracking-tight">Who runs it.</h2>
            <p className="text-[17px] leading-relaxed text-ink-2">
              TMI is run by Andromeda Genius, Inc, in San Antonio, Texas. It was built for the desk its
              operator trades from, and that is still where it runs every morning.
            </p>
          </div>
          <div className="md:col-span-6">
            <Eyebrow>ACCESS</Eyebrow>
            <h2 className="mb-4 text-[26px] font-semibold leading-[1.18] tracking-tight md:mb-6 md:text-[30px]">Invite only.</h2>
            <p className="mb-5 text-base leading-relaxed text-ink-2 md:mb-8 md:text-[17px]">
              There are no public sign-ups. An invite request goes to the operator by email and is answered by a
              person.
            </p>
            <p className="mb-7 text-base leading-relaxed text-ink-2 md:hidden">Run by Andromeda Genius, Inc, in San Antonio, Texas.</p>
            <a
              href={INVITE}
              className="flex h-[52px] items-center justify-center rounded bg-ink px-6 text-[17px] font-semibold text-desk md:inline-flex md:h-12 md:text-base"
            >
              Ask for an invite
            </a>
          </div>
        </div>
      </section>

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
