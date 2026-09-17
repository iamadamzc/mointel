/**
 * robots.txt is a public file, and a Disallow line is a published path.
 *
 * The site is to be indexed (his word, 2026-09-17), so the file allows
 * everything -- and it must NAME NONE of the private paths. /desk, /signin and
 * /api/ are protected by the 401 the server default gives them; listing them
 * here would tell a stranger they exist and protect nothing. Two tests, both
 * sides: the rule allows the root, and the source mentions no private path.
 */

import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

import robots from '@/app/robots';

describe('robots.txt', () => {
  it('allows everything for every agent', () => {
    const out = robots();
    const rules = Array.isArray(out.rules) ? out.rules : [out.rules];
    expect(rules).toHaveLength(1);
    expect(rules[0]).toEqual({ userAgent: '*', allow: '/' });
    expect(JSON.stringify(out)).not.toMatch(/disallow/i);
  });

  it('is permissive, positively: never Disallow: /, in any form', () => {
    // The failure this guards has no symptom on the wire -- 200, well-formed,
    // no private path -- and a deploy cannot undo it once crawlers have read
    // it. So the rule is asserted as what it IS, not only as what it lacks.
    const out = robots();
    const rules = Array.isArray(out.rules) ? out.rules : [out.rules];
    for (const rule of rules) {
      const disallow = ([] as string[]).concat(rule.disallow ?? []);
      expect(disallow, 'a Disallow of / de-indexes the site').not.toContain('/');
      expect(disallow, 'a Disallow of * de-indexes the site').not.toContain('*');
      const allow = ([] as string[]).concat(rule.allow ?? []);
      expect(allow.includes('/') || disallow.length === 0, 'the rule must permit the root').toBe(true);
    }
    // And the text form Next emits, which is what a crawler reads.
    const source = fs.readFileSync(path.join(process.cwd(), 'app', 'robots.ts'), 'utf8')
      .replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*$/gm, '');
    expect(source).not.toMatch(/disallow\s*:\s*['"`]\/['"`]/i);
  });

  it('names no private path, in the rules or in the source', () => {
    const source = fs.readFileSync(path.join(process.cwd(), 'app', 'robots.ts'), 'utf8');
    // The comment may explain the rule by naming the paths it must not list;
    // strip comments so the assertion is about what ships, not what is said.
    const code = source.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*$/gm, '');
    for (const forbidden of ['/desk', '/signin', '/api', '/auth', '/review', '/mcp']) {
      expect(code, forbidden).not.toContain(forbidden);
      expect(JSON.stringify(robots()), forbidden).not.toContain(forbidden);
    }
  });
});
