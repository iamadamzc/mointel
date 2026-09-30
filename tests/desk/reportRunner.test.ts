import { describe, expect, it } from 'vitest';

import { DRAFT_SCHEMA_V5, createReportModelsV5 } from '@/lib/desk/reports/runner';
import { parseDraftV5 } from '@/lib/desk/reports/writerV5';

describe('the v5 models, built one way for the runner and every harness', () => {
  it('the writer asks for the v5 reply (overall, no headline), and both carry their v5 prompt versions', async () => {
    const sent: Array<Record<string, unknown>> = [];
    const fetchImpl = (async (_url: string, init?: RequestInit) => {
      sent.push(JSON.parse(String(init?.body)));
      return new Response(JSON.stringify({ output: [{ type: 'message', content: [{ text: '{}' }] }] }), { status: 200 });
    }) as typeof fetch;
    const { writer, checker } = createReportModelsV5({ apiKey: 'k', writerModel: 'w', checkerModel: 'c', fetchImpl });

    await writer.complete({ system: 'S', user: 'U' }).catch(() => undefined);
    await checker.complete({ system: 'S', user: 'U' }).catch(() => undefined);

    const [w, c] = sent as Array<{ model: string; text: { format: { name: string; schema: { required: string[] } } }; metadata: Record<string, string> }>;
    expect(w!.model).toBe('w');
    expect(w!.text.format.name).toBe('report_draft_v5');
    expect(w!.text.format.schema.required).toEqual(['overall', 'sections']);
    expect(JSON.stringify(w!.text.format.schema)).not.toContain('headline');
    expect(w!.metadata).toEqual({ report_draft_v5_prompt_version: '5' });
    expect(c!.model).toBe('c');
    expect(c!.metadata).toEqual({ report_verdicts_prompt_version: '3' });
  });

  it('a reply the v5 schema admits is a reply parseDraftV5 accepts', () => {
    // The shape the schema forces, with the premarket overall present.
    const reply = { overall: 'Across the $1–$20 range, 2,456 traded after hours, 751 up, 568 down.', sections: [{ heading: 'H', lines: [{ ticker: 'SANG', text: 'x.' }] }] };
    expect(Object.keys(reply).sort()).toEqual([...DRAFT_SCHEMA_V5.required].sort());
    expect(parseDraftV5(JSON.stringify(reply))).toMatchObject({ ok: true, draft: { overall: reply.overall } });
  });
});
