/**
 * His rule (2026-09-30): no em dash anywhere he or a reader sees. The tool titles and descriptions are what
 * ChatGPT reads and repeats, so they are held to it, in the glyph and every encoded form.
 */
import { describe, expect, it } from 'vitest';

import { describeTools } from '@/lib/mcp/tools';

const FORMS = [String.fromCharCode(0x2014), '&mdash;', '&#8212;', '&#x2014;', '%E2%80%94'];

type ToolText = { name: string; title: string; description: string };

/** Every (tool, form) pair where a title or description carries an em dash in that form. */
function offenders(tools: ToolText[]): string[] {
  const found: string[] = [];
  for (const tool of tools) {
    const text = `${tool.title}\n${tool.description}`.toLowerCase();
    for (const form of FORMS) if (text.includes(form.toLowerCase())) found.push(`${tool.name}: ${form}`);
  }
  return found;
}

describe('the MCP tool text', () => {
  it('carries no em dash in any title or description', () => {
    expect(offenders(describeTools())).toEqual([]);
  });

  it('the same check finds a planted em dash in each form', () => {
    for (const form of FORMS) {
      const planted = [{ name: 'planted', title: 'Planted', description: `a ${form} b` }];
      expect(offenders(planted)).toEqual([`planted: ${form}`]);
    }
  });
});
