import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

/**
 * The read-only boundary for review sessions.
 *
 * Hiding the Focus stars is not read-only; it is a suggestion. Read-only has to
 * be something a hand-written POST cannot get past, and it has to hold for
 * endpoints that do not exist yet — the failure mode worth designing against is
 * somebody adding a mutation route in six months and never thinking about
 * review mode at all.
 *
 * So the rule lives here, in front of everything under /review, and it is
 * stated as a whitelist: GET and HEAD pass, everything else is refused. A new
 * write endpoint is therefore closed to reviewers on the day it is written,
 * without anyone remembering to close it.
 *
 * Token validation is deliberately NOT done here. Proxy runs before the Node
 * runtime this app's data layer needs, and an authorization check that has to
 * guess is worse than one made where the store actually is — so each review
 * page and route verifies the capability itself, against SQLite, on every
 * request.
 */

/** The only methods a reviewer may use. Everything else is a mutation attempt. */
const READ_METHODS = new Set(['GET', 'HEAD']);

export function proxy(request: NextRequest) {
  if (!request.nextUrl.pathname.startsWith('/review/')) return NextResponse.next();

  if (!READ_METHODS.has(request.method)) {
    /*
     * 403, not 405.
     *
     * 405 would say "this route does not take POST", which invites the reader
     * to look for one that does. 403 says the request was understood and
     * refused, which is the truth: review sessions do not write, and no route
     * under this prefix will.
     */
    return NextResponse.json(
      { error: 'This is a read-only review session. Mutations are not permitted.' },
      {
        status: 403,
        headers: {
          'Cache-Control': 'private, no-store, max-age=0',
          'Referrer-Policy': 'no-referrer',
        },
      },
    );
  }

  const response = NextResponse.next();

  /*
   * The capability is in the URL, which is the one real cost of this design:
   * a URL travels in places a header does not. `no-referrer` stops the browser
   * handing it to every external evidence link the drawer offers, and
   * `no-store` keeps it out of shared caches and the distribution alike.
   */
  response.headers.set('Referrer-Policy', 'no-referrer');
  response.headers.set('Cache-Control', 'private, no-store, max-age=0');
  // A review page has no business being framed or sniffed either.
  response.headers.set('X-Frame-Options', 'DENY');
  response.headers.set('X-Content-Type-Options', 'nosniff');
  response.headers.set('X-Robots-Tag', 'noindex, nofollow, noarchive');

  return response;
}

export const config = {
  matcher: '/review/:path*',
};
