/**
 * The session cookie, and the two attributes that are traps in opposite
 * directions.
 *
 * Kept framework-agnostic on purpose: this builds a Set-Cookie value and the
 * route handlers apply it. That means the attributes can be asserted in a test
 * without standing up Next, and the attributes are the whole security surface
 * of this file.
 */

/**
 * The cookie name. Deliberately not `session` or `sid`: it appears in a browser
 * inspector next to whatever else is on the domain, and a name that says which
 * application owns it is worth the extra bytes.
 */
export const SESSION_COOKIE = 'mointel_session';

export interface CookieAttributes {
  httpOnly: true;
  secure: boolean;
  sameSite: 'Lax';
  path: '/';
  maxAge: number;
}

/**
 * WHY `Secure` COMES FROM CONFIGURATION AND NOT FROM THE REQUEST.
 *
 * The obvious implementation reads `X-Forwarded-Proto`, because behind nginx
 * the app only ever sees loopback HTTP and cannot otherwise tell. That would be
 * wrong here, and checking rather than assuming is what caught it.
 *
 * `deploy/aws/nginx.conf:26` maps the header like this:
 *
 *     map $http_x_forwarded_proto $mointel_forwarded_proto {
 *         ""      $scheme;
 *         default $http_x_forwarded_proto;
 *     }
 *
 * It PASSES THROUGH a client-supplied value and only falls back to `$scheme`
 * when the header is absent. That shape is right for a future where a CDN or
 * load balancer terminates TLS in front -- which is what its comment
 * anticipates -- but nginx is the edge today, so the header arrives straight
 * from the caller. A client can send `X-Forwarded-Proto: http` over TLS and the
 * app would believe it.
 *
 * Nothing in the application reads that header today, so this is a trap rather
 * than a live fault -- and this file would have been its first consumer.
 *
 * So the deployment declares it instead. The deployment knows whether it is
 * behind TLS; a request header only knows what it was told.
 *
 * FAILS CLOSED. Secure is on unless AUTH_COOKIE_INSECURE is explicitly set, so
 * the mistake of forgetting to configure production is a cookie that is too
 * strict, not one that is too loose.
 */
export function cookieSecureDefault(
  env: Record<string, string | undefined> = process.env,
): boolean {
  return env.AUTH_COOKIE_INSECURE !== '1';
}

/**
 * `SameSite` MUST BE `Lax`. `Strict` LOOKS SAFER AND SILENTLY BREAKS SIGN-IN.
 *
 * The return from accounts.google.com is a top-level cross-site navigation.
 * A `Strict` cookie is not sent on one, so the callback could not read the
 * `state` it set moments earlier -- the flow would simply never complete, with
 * no error anywhere to explain it.
 *
 * `Lax` is also what carries the CSRF protection that matters: it withholds the
 * cookie on cross-site POST, which is the shape a forged state-changing request
 * takes. So the value that makes sign-in work is also the value that defends
 * the authenticated endpoints, and the stricter-sounding one does neither.
 *
 * A security attribute chosen by which name sounds safer is not a decision.
 */
export function sessionCookieAttributes(
  maxAgeSeconds: number,
  secure: boolean = cookieSecureDefault(),
): CookieAttributes {
  return { httpOnly: true, secure, sameSite: 'Lax', path: '/', maxAge: maxAgeSeconds };
}

function serialize(name: string, value: string, attributes: CookieAttributes): string {
  const parts = [`${name}=${value}`, `Path=${attributes.path}`, `Max-Age=${attributes.maxAge}`, 'HttpOnly', `SameSite=${attributes.sameSite}`];
  if (attributes.secure) parts.push('Secure');
  return parts.join('; ');
}

/** The Set-Cookie value that establishes a session. */
export function sessionCookie(
  id: string,
  maxAgeSeconds: number,
  secure: boolean = cookieSecureDefault(),
): string {
  return serialize(SESSION_COOKIE, id, sessionCookieAttributes(maxAgeSeconds, secure));
}

/**
 * The Set-Cookie value that clears one.
 *
 * `Max-Age=0` with the SAME attributes it was set with. A browser matches a
 * clearing cookie on name, path and domain, so a clear that forgets `Path=/`
 * leaves the original in place and the user stays signed in after signing out.
 */
export function clearedSessionCookie(secure: boolean = cookieSecureDefault()): string {
  return serialize(SESSION_COOKIE, '', sessionCookieAttributes(0, secure));
}

/**
 * A short-lived cookie for one OAuth flow's `state` and `nonce`.
 *
 * Same `Lax` requirement and for the same reason -- it has to survive the
 * return trip from the provider, which is the whole point of it existing.
 *
 * Deliberately short: this is not a session, it is a value that must outlive a
 * redirect and nothing more. Ten minutes is long enough for a person to pick an
 * account and short enough that an abandoned flow leaves nothing behind.
 */
export const OAUTH_FLOW_COOKIE_SECONDS = 600;

export function flowCookie(
  name: string,
  value: string,
  secure: boolean = cookieSecureDefault(),
): string {
  return serialize(name, value, sessionCookieAttributes(OAUTH_FLOW_COOKIE_SECONDS, secure));
}

export function clearedFlowCookie(name: string, secure: boolean = cookieSecureDefault()): string {
  return serialize(name, '', sessionCookieAttributes(0, secure));
}
