import type { MetadataRoute } from 'next';

/**
 * The site is to be indexed. His word, 2026-09-17, to Web: "yes."
 *
 * Two lines, and the second is empty on purpose. Before this file existed
 * `/robots.txt` answered 401 -- an ERROR, not an absence -- and crawlers treat
 * an auth-required robots file inconsistently, some as a site-wide disallow.
 * So the crawling posture was being decided by the exemption list rather than
 * by anyone. This makes it a decision.
 *
 * IT MUST NAME NONE OF THE PRIVATE PATHS, AND THE REASON IS OPERATIONAL, NOT
 * SECRECY. /desk is already public knowledge -- the landing page links it
 * three times -- so naming it would disclose nothing. But a file that names
 * ONE private path invites naming the rest "for consistency", and /signin and
 * /api/ are linked from no public page: naming those would be a real
 * disclosure. "Name no private path" is checkable at a glance; "name only the
 * ones already linked" has to be re-derived every time and will eventually be
 * got wrong. The 401 those paths answer is their protection; this file adds
 * none. A test reads this file and asserts the absence.
 *
 * AND IT MUST NEVER SAY `Disallow: /`. One character from the permissive form,
 * it de-indexes the whole site, has no symptom (still 200, still well-formed,
 * still names no private path), and cannot be undone by a deploy -- the fix is
 * a request to Google. The test asserts the rule is permissive, positively.
 */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: [{ userAgent: '*', allow: '/' }],
  };
}
