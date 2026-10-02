import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { NextRequest } from 'next/server';

import { proxy } from '@/proxy';

/**
 * Read-only has to be a property of the system, not a habit.
 *
 * Hiding the Focus stars stops an honest reviewer from clicking. It does
 * nothing about a hand-written POST, and — the case actually worth designing
 * for — nothing about a mutation endpoint somebody adds in six months without
 * ever thinking about review mode. These tests pin the two things that make the
 * guarantee structural: the method whitelist in front of everything, and the
 * absence of any mutating handler in the namespace behind it.
 */

const REVIEW_ROUTES = path.resolve(__dirname, '../../app/review');

function request(method: string, url: string): NextRequest {
  return new NextRequest(new Request(url, { method }));
}

describe('review method enforcement', () => {
  for (const method of ['POST', 'PUT', 'PATCH', 'DELETE']) {
    it(`refuses ${method} under /review with 403`, async () => {
      const response = proxy(request(method, 'https://desk.example/review/abc123/api/focus'));
      expect(response.status).toBe(403);

      const body = (await response.json()) as { error: string };
      expect(body.error).toMatch(/read-only/i);
    });
  }

  it('refuses a Focus pin through the review namespace', async () => {
    const response = proxy(request('POST', 'https://desk.example/review/abc123/api/focus'));
    expect(response.status).toBe(403);
  });

  it('refuses a research reanalysis through the review namespace', async () => {
    const response = proxy(
      request('POST', 'https://desk.example/review/abc123/api/research/retry'),
    );
    expect(response.status).toBe(403);
  });

  it('refuses a mutation to an endpoint that does not exist yet', () => {
    // The point of the whitelist: a route invented tomorrow is already closed.
    const response = proxy(
      request('POST', 'https://desk.example/review/abc123/api/some/future/thing'),
    );
    expect(response.status).toBe(403);
  });

  it('allows GET and HEAD', () => {
    for (const method of ['GET', 'HEAD']) {
      const response = proxy(request(method, 'https://desk.example/review/abc123/'));
      expect(response.status).toBe(200);
    }
  });

  it('leaves the owner-facing desk entirely alone', () => {
    // The normal desk still writes; Nginx Basic Auth is what protects it, and
    // this guard must not reach across and break Focus for its owner.
    const response = proxy(request('POST', 'https://desk.example/api/focus'));
    expect(response.status).toBe(200);
    expect(response.headers.get('Referrer-Policy')).toBeNull();
  });
});

describe('review response headers', () => {
  it('sets no-referrer, so the capability URL is not handed to evidence links', () => {
    const response = proxy(request('GET', 'https://desk.example/review/abc123/'));
    expect(response.headers.get('Referrer-Policy')).toBe('no-referrer');
  });

  it('sets no-store, so no cache holds a review page', () => {
    const response = proxy(request('GET', 'https://desk.example/review/abc123/api/market'));
    expect(response.headers.get('Cache-Control')).toBe('private, no-store, max-age=0');
  });

  it('sets no-store on the review levels read too', () => {
    const response = proxy(request('GET', 'https://desk.example/review/abc123/api/levels?symbol=VEEA'));
    expect(response.headers.get('Cache-Control')).toBe('private, no-store, max-age=0');
  });

  it('refuses a mutation to the review levels path', () => {
    const response = proxy(request('POST', 'https://desk.example/review/abc123/api/levels'));
    expect(response.status).toBe(403);
  });

  it('sets no-store and no-referrer on the refusal too', () => {
    const response = proxy(request('POST', 'https://desk.example/review/abc123/api/focus'));
    expect(response.headers.get('Cache-Control')).toBe('private, no-store, max-age=0');
    expect(response.headers.get('Referrer-Policy')).toBe('no-referrer');
  });

  it('keeps review pages out of search indexes', () => {
    const response = proxy(request('GET', 'https://desk.example/review/abc123/'));
    expect(response.headers.get('X-Robots-Tag')).toContain('noindex');
  });
});

describe('the review namespace itself', () => {
  function routeFiles(directory: string): string[] {
    const found: string[] = [];
    for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
      const full = path.join(directory, entry.name);
      if (entry.isDirectory()) found.push(...routeFiles(full));
      else if (entry.name === 'route.ts' || entry.name === 'route.tsx') found.push(full);
    }
    return found;
  }

  it('implements no mutating handler anywhere under /review', () => {
    const files = routeFiles(REVIEW_ROUTES);
    // If this is zero the test is passing for the wrong reason.
    expect(files.length).toBeGreaterThan(0);

    for (const file of files) {
      const source = fs.readFileSync(file, 'utf8');
      for (const method of ['POST', 'PUT', 'PATCH', 'DELETE']) {
        expect(
          new RegExp(`export\\s+(async\\s+)?function\\s+${method}\\b`).test(source),
          `${path.relative(REVIEW_ROUTES, file)} exports a ${method} handler`,
        ).toBe(false);
      }
      // Every review route must actually check the capability.
      expect(source, `${path.relative(REVIEW_ROUTES, file)} does not call guardReviewApi`).toContain(
        'guardReviewApi',
      );
    }
  });

  it('exposes no Focus route in the review namespace at all', () => {
    /*
     * REPLACES a test that read `[token]/api/focus/route.ts` and asserted it
     * passed no seed candidates. That route is gone, so the old test threw on
     * readFileSync rather than failing on an assertion -- and the guard it was
     * providing is better stated as absence than as a property of a file.
     *
     * A pin is cosmetic and browser-held by his ruling, so there is nothing on
     * the server for a reviewer to read. The proxy still refuses POST here (see
     * above); this asserts there is no GET to reinstate it around either.
     */
    expect(fs.existsSync(path.join(REVIEW_ROUTES, '[token]/api/focus'))).toBe(false);
    for (const file of routeFiles(REVIEW_ROUTES)) {
      const source = fs.readFileSync(file, 'utf8');
      expect(source, `${path.relative(REVIEW_ROUTES, file)} reaches Focus`).not.toMatch(
        /getFocus|focusStore|focusRepo/,
      );
    }
  });
});
