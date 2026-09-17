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
 * IT MUST NAME NONE OF /desk, /signin OR /api/. A Disallow line is a published
 * path: those already answer 401, which is the protection, and listing them
 * in a file anyone can fetch tells a stranger they exist and protects nothing.
 * The classic way this file leaks a private surface is by trying to protect
 * it. A test reads this file and asserts the absence.
 */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: [{ userAgent: '*', allow: '/' }],
  };
}
