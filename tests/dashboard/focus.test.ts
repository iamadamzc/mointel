import { describe, expect, it } from 'vitest';

/*
 * Pins are cosmetic from `dd3bca0` -- a pin used to admit a ticker past the
 * rank gate and into the research queue, which he did not know and ruled out.
 * So the state has no reason to leave the tab.
 */
describe('the focus hook holds nothing outside the tab', () => {
  /*
   * COMMENTS STRIPPED, AND THIS IS THE THIRD TIME IT HAS BEEN NEEDED.
   *
   * A source test that FORBIDS a term will fail on the comment EXPLAINING why
   * the term is forbidden -- the file says "no localStorage, deliberately", and
   * a naive match cannot tell code from prose about code. The Move label, the
   * placeholder tone and now this.
   */
  const NL = String.fromCharCode(10);
  const read = async (f: string) => {
    const raw = await import('node:fs').then((fs) => fs.promises.readFile(f, 'utf8'));
    return raw
      .split(NL)
      .filter((line) => {
        const t = line.trim();
        return !t.startsWith('//') && !t.startsWith('*') && !t.startsWith('/*');
      })
      .join(NL);
  };

  /*
   * NO BROWSER STORAGE, DELIBERATELY. There is none anywhere in this app, so
   * persisting would be the first browser-held state the desk has had -- and
   * pins were date-scoped, so a stored one needs expiry logic or a Friday pin
   * reappears on Tuesday. That is stale-state-that-looks-live.
   */
  it('uses no browser storage', async () => {
    const source = await read('lib/hooks/useFocus.ts');
    // The instrument can see the file it is asserting about.
    expect(source).toContain('export function useFocus');
    expect(source).not.toMatch(/localStorage|sessionStorage|indexedDB/);
  });

  /* Cosmetic means no write. A pin that still POSTed would still be a fact on
   * the server, whatever the label said. */
  it('calls no API', async () => {
    const source = await read('lib/hooks/useFocus.ts');
    expect(source).not.toMatch(/fetch\(|apiBase/);
  });

  /*
   * The refusal is stated rather than swallowed. A click that silently does
   * nothing is the same failure as an optimistic update that silently fails.
   */
  it('states the refusal at the limit', async () => {
    const source = await read('lib/hooks/useFocus.ts');
    expect(source).toContain('FOCUS_LIMIT');
    expect(source).toMatch(/setMessage\(`Focus holds/);
  });

  /*
   * A field that cannot be known must not be typed as knowable. `tradingDate`
   * came from the server and has no client source, so it is gone rather than
   * returned as an empty string -- the fabricated-value pattern removed from
   * the placeholder family.
   */
  it('returns no field it cannot know', async () => {
    const source = await read('lib/hooks/useFocus.ts');
    expect(source).not.toMatch(/tradingDate/);
  });
});

/*
 * The badge meant "pinned AND therefore researched". Pins are cosmetic now, so
 * a reader months from now would read it as a display preference and miss that
 * it was a research lever. Keeping it preserves a token, not a fact.
 */
describe('assessment history does not render the focus badge', () => {
  it('renders no focus marker', async () => {
    const source = await import('node:fs').then((fs) =>
      fs.promises.readFile('components/AssessmentHistory.tsx', 'utf8'),
    );
    // The instrument can see the file.
    expect(source).toContain('row.ticker');
    expect(source).not.toMatch(/\{row\.focus/);
  });
});
