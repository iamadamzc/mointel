/**
 * THE LANDING PAGE'S WORDS, in one place, so the page (app/page.tsx) and its two
 * canvases (docs/web/canvas/Main.dc.html, LandingMobile.dc.html) can be checked against
 * the same strings: tests/web/landingCopy.test.ts fails if a canvas is missing one.
 *
 * Marketing's copy, verbatim: docs/marketing/front-page-copy-2026-10-09.md (Commercial
 * read 41). Every string here is public copy: a change needs his yes before the commit.
 */

export const FLOAT_PAGE = '/are-float-quotes-real';

/**
 * One screenshot slot. `src` stays undefined until Design's image for the slot has
 * passed Commercial; until then the slot renders an empty frame of the right shape,
 * which docs/web/placeholder-scan.py reports, so a page with an empty slot cannot be
 * mistaken for a finished one. Captions carry the capture date when the image lands.
 */
export type Shot = {
  slot: number;
  caption: string;
  alt: string;
  /** 'board' is a wide board view; 'panel' is a drawer or report panel. */
  shape: 'board' | 'panel' | 'strip';
  src?: string;
  width?: number;
  height?: number;
};

export type Section = {
  id: string;
  eyebrow: string;
  heading: string;
  body: string[];
  shots: Shot[];
};

export const SECTIONS: Section[] = [
  {
    id: 'before-the-open',
    eyebrow: 'BEFORE THE OPEN',
    heading: 'A briefing at each session boundary.',
    body: [
      'The evening report comes after the after-hours session and says how many names the desk is watching into the next premarket; at 09:25 there is one into the open, at 14:30 into the power hour, and at 16:00 into after-hours. Each opens with a short Summary, then groups its names by what the research found: fresh news found, sources that conflict, only older or secondary news, no catalyst found in our sources, research that could not tell, not researched at this checkpoint. A report that is missing says why; it is never replaced by an older one.',
      'When a new report is published while the page is open, the briefing line says New or Revised until you open it or dismiss it. When you load the page and the current report is unread, it opens, except between 07:00 and 10:00 ET on weekdays, when the board stays in front and the line carries the mark.',
    ],
    shots: [
      {
        slot: 12,
        shape: 'panel',
        caption: 'The evening report, {date}: a short Summary, then the names grouped by what the research found. A dated example, not a record or a prediction.',
        alt: 'A session report: a short Summary paragraph, then name cards grouped under headings such as fresh news found and no catalyst found in our sources.',
      },
      {
        slot: 13,
        shape: 'strip',
        caption: 'The briefing line above the board on {date} says what is due, what is out and what is missing. A dated example, not a record or a prediction.',
        alt: "A single row above the board reading the report's title, its state and the time it was published.",
      },
    ],
  },
  {
    id: 'how',
    eyebrow: 'AS NAMES COME INTO PLAY',
    heading: 'Who is running, and who is only loud.',
    body: [
      // Commercial's registered plain statement, verbatim (docs/commercial/2026-09-08-product-name.md 2e item 2).
      'The Momentum Intelligence Trading Desk is built for people who trade $1–$20 small-cap momentum in the premarket. It is not a scanner and it is not a signal service: it takes the names that are already moving and puts everything the desk knows about each one on a single shared board. Why it is moving, where it sits in the cycle, what the share structure is, and what supply stands behind it. Where it has nothing, it says so.',
      "The board ranks tickers by how much each has traded against its own twenty-session norm. Choose a low and a high price and it ranks inside that range, movers and counts included. This browser remembers your range. A name shows up as it crosses into the day's runners. A name the desk has qualified stays tracked for the session, so the one that went quiet at 08:10 is ranked again the moment it picks up at 09:20. A name making a large move from the prior close is marked moving and kept on the board even when its volume rank is low.",
      'The Now column counts trades in the last ten seconds, a different question from volume for the day; when the count stops it says "not live" and shows nothing.',
    ],
    shots: [
      {
        slot: 2,
        shape: 'board',
        caption: 'A name marked moving, outside the volume ranking, {date}. A dated example, not a record or a prediction.',
        alt: 'A board row with the word moving under the ticker, and a count of moving names in the board header.',
      },
      {
        slot: 6,
        shape: 'board',
        caption: 'The Now column on {date}: trades in the last ten seconds, and the same column when the count has stopped. A dated example, not a record or a prediction.',
        alt: 'The Now column showing a small bar chart of trades per ten seconds, and a second view showing a dash and the words not live.',
      },
    ],
  },
  {
    id: 'one-name',
    eyebrow: 'WHEN ONE CATCHES YOUR EYE',
    heading: 'Why it is moving, and where it is in the run.',
    body: [
      'A name with a catalyst carries a grade, A, B or C by strength, coloured by how fresh the news is; a green A and an amber A are the same strength and different age. Open a name and the catalyst has its sources and its time, and an event time is never shown with a clock the source did not state.',
      'The cycle on the board and in the drawer is measured from daily bars: Day 1, Frontside, Off high, Backside, with the arithmetic in view (the high and its date, how far it has come off, how long ago, and any earlier run in the history the desk holds). The levels sit on one axis, resistance above and support below, with a blue-sky line that says whether price is above every stored prior high or says it cannot verify.',
    ],
    shots: [
      {
        slot: 9,
        shape: 'panel',
        caption: "One name's drawer: the desk's read, the level ladder and the blue-sky line, {date}. A dated example, not a record or a prediction.",
        alt: 'A ticker drawer showing cycle, catalyst and structure badges, a ladder of resistance and support levels with distances, and a blue-sky line.',
      },
      {
        slot: 11,
        shape: 'panel',
        caption: 'The cycle on {date}, with its arithmetic and the earlier runs the desk holds. A dated example, not a record or a prediction.',
        alt: 'The cycle section of a drawer: phase, the percent up from the base, the high with its date, and a list of prior runs.',
      },
    ],
  },
  {
    id: 'underneath',
    eyebrow: 'WHAT IS UNDERNEATH THE MOVE',
    heading: 'Supply, in the groups a trader recognises.',
    body: [
      'A shelf, a warrant and an ATM are not the same thing, so supply has its own groups: 8-K and 6-K filings; registration and prospectus; offerings, ATM and PIPE; warrants and convertibles; other share structure; and the sources cited. A group with nothing says so, and says whether the desk found none or did not read.',
      'A filing establishes capacity, never intent: the board does not say anyone is selling. When a float label reads DIRTY FLOAT, it means one thing: the displayed float understates the shares that can reach the market. The Risk column carries one fixed label per name, and one sentence in the drawer names a risk the evidence shows, dated and sourced, or says Unknown, which is not a finding that there is none.',
    ],
    shots: [
      {
        // His "yes to images" 2026-10-09T03:34:17.401Z (61dbff4c): caption and alt as put to him,
        // Marketing 8d9f3aba, Commercial 49/49b. Design 10c cropped (2969f578), a production capture of 2026-10-08.
        slot: 10,
        shape: 'panel',
        // Caption swapped on his "4, yes" 2026-10-09T15:40:36.706Z (61dbff4c, answering 14:31:20Z): Marketing 9f433d71 v3, Commercial 56/56a.
        caption: 'Where new shares could come from, for one stock, shown October 8, 2026: a recent offering, other issued shares, warrants and a registered resale, each marked known or possibly active. The desk labels the float DIRTY FLOAT, shows it as Unknown, and notes that the latest reported share count is older than the September issuance. A dated example, not a record or a prediction.',
        alt: 'The top of the Structural intelligence section of a ticker drawer: a DIRTY FLOAT label, Float Unknown, a table of known and potential supply by kind with a status for each, and a note that the reported shares outstanding predate the September issuance.',
        src: '/landing/supply-drawer.webp',
        width: 1600,
        height: 486,
      },
    ],
  },
];

export const FLOAT_SECTION = {
  id: 'float',
  eyebrow: 'THE FLOAT, HONESTLY',
  heading: 'A ceiling, with its reasons.',
  body: [
    'The TMI Float column does not give an exact figure. It shows a ceiling, "≤ 12.4M", with the date of the filed share count beside it, or Unknown, Cannot verify or Not computed, each with its reason. Click it and see what it is made of: the filed count, the insiders subtracted, what is not subtracted, and when the filings were read.',
    "No filing we know of reports the current number of tradable shares. A float is somebody's computation unless a filing states it, and the desk labels its own as one.",
  ],
  link: 'Are float quotes real?',
  /** Each rule is printed verbatim; its lead runs to the first period, colon or semicolon. */
  rules: [
    'Shares outstanding is never called float. A count off a cover page is an upper bound on the float as of its date, labelled as one; the desk subtracts the direct holdings its insiders report and says which it does not subtract.',
    'Supply is two numbers, not one: what is proven live and what is filed at most; the gap is printed as a width and never rounded to zero.',
    'A count from before a reverse split is never compared to one from after it.',
    "A float is somebody's computation unless a filing states it; the desk checks its own against the filed share count and refuses one that cannot be right.",
  ],
  shots: [
    {
      slot: 5,
      shape: 'board',
      caption: "The float column's faces, and the click-through, {date}. A dated example, not a record or a prediction.",
      alt: 'Float column cells reading a ceiling with a date, Unknown, Cannot verify and Not computed, and an open panel listing the filed count, the insiders subtracted and what is not subtracted.',
    },
    {
      slot: 17,
      shape: 'panel',
      caption: 'The page the float column links to.',
      alt: 'The page Are float quotes real, with its headings.',
    },
  ] as Shot[],
};

export const LATER_SECTIONS: Section[] = [
  {
    id: 'keeping-track',
    eyebrow: 'KEEPING TRACK',
    heading: 'Pin it, filter it, and see what the filters hide.',
    body: [
      'Pin up to six names to a Focus strip and keep their price, structure and nearest levels in view while you scan. Filter the board by cycle, structure, catalyst age or catalyst grade, or click a count in the strip above it to do the same in one move. While a filter is on, a banner says which, counts how many names match, and lists the large movers the filters are hiding. The banner keeps the filters on screen.',
    ],
    shots: [
      {
        slot: 8,
        shape: 'strip',
        caption: 'A Focus strip with two names pinned, {date}. A dated example, not a record or a prediction.',
        alt: 'A strip of two pinned name cards above the board, each with price, badges and the nearest levels above and below.',
      },
      {
        slot: 3,
        shape: 'board',
        caption: 'Two filters on, {date}: the banner counts what matches and lists the large movers the filters hide. A dated example, not a record or a prediction.',
        alt: 'A banner above the board reading the active filters and how many names match, with a second line naming hidden moving names.',
      },
      {
        slot: 4,
        shape: 'strip',
        caption: 'The counts strip on {date}: each count is also a one-click filter. A dated example, not a record or a prediction.',
        alt: 'A row of counts: ranked, day 1, frontside, backside, dirty float, fresh catalyst.',
      },
    ],
  },
  {
    id: 'after-the-bell',
    eyebrow: 'AFTER THE BELL',
    heading: 'The question changes after the close.',
    body: [
      'After the close the board re-ranks on after-hours participation: who is trading now, not who was busy at 09:40. In a name\'s drawer the regular-session close and the after-hours move have their own rows, and every part that is unknown is labelled, such as "No after-hours trade recorded". Between sessions the newest board is shown instead of an empty one, with a button back to live.',
      'Premarket, regular hours or after the close, the question is the same: what is this move standing on. A float does not get cleaner at 09:30.',
    ],
    shots: [
      {
        slot: 15,
        shape: 'board',
        caption: 'The board between sessions, with the button back to live, {date}. A dated example, not a record or a prediction.',
        alt: 'The board marked as a snapshot with a Back to live button.',
      },
    ],
  },
  {
    id: 'unknown',
    eyebrow: 'WHEN IT DOES NOT KNOW',
    heading: 'Unknown stays unknown.',
    body: [
      'Not researched and researched, nothing found are different states and they look different: the first says the desk has not looked, the second says it looked. In the float, the supply gap and the Now column, a missing value shows as Unknown or a dash, never as zero.',
      'If the page cannot reach the desk, or the market data is older than it should be in session, a line above the board says so and gives the time of the last number; the market light says the same, and the price sources stop saying live.',
    ],
    shots: [
      {
        slot: 14,
        shape: 'board',
        caption: "The banner when the desk's market data is old, {date}. A dated example, not a record or a prediction.",
        alt: 'A warning line above the board giving the time of the last market data and how long ago it was, and the market light in its warning state.',
      },
    ],
  },
];

/** The live page's four boundaries, verbatim (the copy keeps them as they are). */
export const BOUNDARIES: Array<[string, string]> = [
  ['Not a scanner', 'It does not run your filters or replace a scanner. It ranks names that are already moving and reports what is underneath them.'],
  ['Not a broker', 'No account, no orders, no positions, no connection of any kind to your brokerage. It cannot place a trade and never asks for permission to.'],
  ['Not signals', 'No entry arrows, no exit alerts, no chat room. It reports; it does not recommend.'],
  ['Not advice', 'An information service about publicly traded securities. Not a broker-dealer, not an investment adviser, and not a recommendation to buy or sell anything.'],
];

export const HERO_SHOT: Shot = {
  slot: 1,
  shape: 'board',
  caption: "The board at {time} ET on {date}. Ranked by relative volume against each name's own twenty-session baseline. A dated example, not a record or a prediction.",
  alt: "The desk's Discovery board in session: ranked small-cap names with price, relative volume, trades in the last ten seconds, float, catalyst, risk and cycle columns.",
};

export const ACCESS_SHOT: Shot = {
  // His "yes to images" 2026-10-09T03:34:17.401Z: caption "The sign-in page."; Design 16a (26f70e57), /signin signed out.
  slot: 16,
  shape: 'panel',
  caption: 'The sign-in page.',
  alt: 'The sign-in page with a Sign in with Google button.',
  src: '/landing/sign-in.webp',
  width: 1600,
  height: 1000,
};

export const NAV = { how: 'How it works', float: 'The float', not: "What it isn't", desk: 'Open the desk' };

export const HERO = {
  eyebrow: 'US SMALL CAPS · 04:00 ET ONWARD',
  heading: "Intelligence on what's moving.",
  lead: 'It is 07:15, a name is running, and nothing you can find explains it.',
  body: 'This is the board for that moment. It takes the names already running and puts what the desk knows about each one next to the price: whether there is a catalyst and how old it is, where the name sits in its run, what the float can be at most, and what supply stands behind it. Where it has nothing, it says so. A float number is an estimate someone computed, unless a filing happens to state it. Here is how the TMI Float is made:',
  link: 'Are float quotes real?',
  ctaPrimary: 'Ask for an invite',
  ctaSecondary: 'Already have access? Open the desk',
  accessLine: 'Access is by invite, and sign-in is handled by Google.',
};

export const BOUNDARIES_HEADING = { eyebrow: 'BOUNDARIES', heading: 'What it is not.' };

export const ACCESS = {
  eyebrow: 'ACCESS',
  heading: 'By invitation.',
  body: [
    'Access is by invitation. You sign in with Google on the address you were invited on, accept a short disclaimer once, and the desk opens.',
    'Built for small-cap momentum traders, with catalyst details and grades, float structure background, SEC filing information, and several additional information points that help you make decisions on what to trade.',
    'Andromeda Genius, Inc., San Antonio, Texas.',
  ],
  /** After the body, to /privacy: his "add it" 2026-10-09T02:27:20.760Z; Commercial read 43a's words. */
  privacyLink: 'What we collect, and what we do not',
  cta: 'Ask for an invite',
};
