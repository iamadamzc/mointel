import { describe, expect, it } from 'vitest';

import {
  OpenAiCompanySourceResolver,
  OpenAiDiscoveryProvider,
} from '@/lib/research/catalyst/openaiDiscovery';
import {
  blockedSearchDomains,
  DOMAIN_POLICY_VERSION,
} from '@/lib/research/catalyst/domainPolicy';
import type { ModelConfig } from '@/lib/research/config';

/**
 * What the hosted search was told to do, and what the ledger recorded about it.
 *
 * Both matter and for the same reason. The search tool is ~98% of what a
 * discovery or resolution call costs — the authored request is under a thousand
 * tokens against a 44,591-token median bill — so its configuration IS the price.
 * A ledger that records the price without the configuration cannot tell a
 * saving from a coverage loss on any later day.
 */

const MODEL: ModelConfig = {
  apiKey: 'k',
  researchModel: 'r',
  escalationModel: 'e',
  changeDetectModel: 'c',
  resolverSearchContext: null,
  discoverySearchContext: null,
  promptVariant: 'A' as const,
};

interface Captured {
  body: Record<string, unknown>;
}

/** Captures the request and answers with an empty, well-formed result. */
function capturing(payload: unknown): { fetchImpl: typeof fetch; seen: Captured[] } {
  const seen: Captured[] = [];
  const fetchImpl = (async (_url: RequestInfo | URL, init?: RequestInit) => {
    seen.push({ body: JSON.parse(String(init?.body)) as Record<string, unknown> });
    return new Response(
      JSON.stringify({
        output: [{ type: 'message', content: [{ type: 'output_text', text: JSON.stringify(payload) }] }],
        usage: { input_tokens: 11, output_tokens: 2, input_tokens_details: { cached_tokens: 0 } },
      }),
      { status: 200 },
    );
  }) as typeof fetch;
  return { fetchImpl, seen };
}

function tool(body: Record<string, unknown>): Record<string, unknown> {
  const tools = body.tools as Array<Record<string, unknown>>;
  expect(tools).toHaveLength(1);
  expect(tools[0].type).toBe('web_search');
  return tools[0];
}

describe('the resolver search context', () => {
  it('is sent when configured', async () => {
    const { fetchImpl, seen } = capturing({ candidates: [] });
    const resolver = new OpenAiCompanySourceResolver({
      config: MODEL,
      fetchImpl,
      searchContextSize: 'low',
    });

    await resolver.resolve({ ticker: 'ACME', companyName: 'Acme Inc.' });

    expect(tool(seen[0].body).search_context_size).toBe('low');
  });

  it('is absent when not configured, leaving the provider default', async () => {
    /*
     * Not the same as sending "medium". The default is the provider's to
     * choose, and pinning it here would silently freeze a value we did not
     * decide — which is the situation this whole change exists to end.
     */
    const { fetchImpl, seen } = capturing({ candidates: [] });
    const resolver = new OpenAiCompanySourceResolver({ config: MODEL, fetchImpl });

    await resolver.resolve({ ticker: 'ACME', companyName: 'Acme Inc.' });

    expect(tool(seen[0].body)).not.toHaveProperty('search_context_size');
  });

  it('reports what it was configured to buy', async () => {
    const { fetchImpl } = capturing({ candidates: [] });
    const low = new OpenAiCompanySourceResolver({
      config: MODEL,
      fetchImpl,
      searchContextSize: 'low',
    });
    const unset = new OpenAiCompanySourceResolver({ config: MODEL, fetchImpl });

    const result = await low.resolve({ ticker: 'ACME', companyName: null });

    expect(low.toolConfig).toBe(`web_search:low;domains:v${DOMAIN_POLICY_VERSION};max_tool_calls:1`);
    expect(unset.toolConfig).toBe(`web_search:default;domains:v${DOMAIN_POLICY_VERSION};max_tool_calls:1`);
    // And it travels with the result, so the collector records it per call
    // rather than reading it back off a shared provider later.
    expect(result.toolConfig).toBe(low.toolConfig);
  });
});

describe('the discovery search filter', () => {
  it('sends exactly the domains the policy derives', async () => {
    const { fetchImpl, seen } = capturing({ sources: [] });
    const discovery = new OpenAiDiscoveryProvider({ config: MODEL, fetchImpl });

    await discovery.discover({ ticker: 'ACME', companyName: null, since: '2026-08-13', knownUrls: [] });

    const filters = tool(seen[0].body).filters as { blocked_domains?: string[] } | undefined;
    expect(filters?.blocked_domains).toEqual(blockedSearchDomains());
  });

  it('carries the policy version on the result for the ledger', async () => {
    const { fetchImpl } = capturing({ sources: [] });
    const discovery = new OpenAiDiscoveryProvider({ config: MODEL, fetchImpl });

    const result = await discovery.discover({
      ticker: 'ACME',
      companyName: null,
      since: '2026-08-13',
      knownUrls: [],
    });

    expect(result.toolConfig).toBe(`web_search:default;domains:v${DOMAIN_POLICY_VERSION};max_tool_calls:1`);
  });
});

/**
 * The dial the larger bill did not have.
 *
 * Discovery spent 7,862,324 input tokens over 2026-08-19..21 against the
 * resolver's 3,853,202, and only the resolver could be configured. Worse, its
 * ledger column was the literal 'default' whatever it was sent — so the field
 * that exists to tell two configurations apart reported the same string for
 * both, and the test above passed against a constant.
 *
 * These assert the pair together: what leaves in the request, and what the
 * ledger says left. Either alone can pass while the other is wrong, which is
 * how the hardcoded getter survived a file whose own header says a ledger
 * without the configuration cannot tell a saving from a coverage loss.
 */
describe('the discovery search context', () => {
  const discover = (d: OpenAiDiscoveryProvider) =>
    d.discover({ ticker: 'ACME', companyName: null, since: '2026-08-13', knownUrls: [] });

  it('is sent when configured, alongside the domain filter rather than instead of it', async () => {
    const { fetchImpl, seen } = capturing({ sources: [] });
    const discovery = new OpenAiDiscoveryProvider({
      config: MODEL,
      fetchImpl,
      searchContextSize: 'low',
    });

    await discover(discovery);

    const entry = tool(seen[0].body);
    expect(entry.search_context_size).toBe('low');
    // The two live on the same tool object; adding one must not drop the other.
    if (blockedSearchDomains().length > 0) expect(entry.filters).toBeDefined();
  });

  it('is absent when not configured, leaving the provider default', async () => {
    const { fetchImpl, seen } = capturing({ sources: [] });

    await discover(new OpenAiDiscoveryProvider({ config: MODEL, fetchImpl }));

    expect(tool(seen[0].body)).not.toHaveProperty('search_context_size');
  });

  it('reports what it was configured to buy, and the report can differ', async () => {
    const { fetchImpl } = capturing({ sources: [] });
    const low = new OpenAiDiscoveryProvider({ config: MODEL, fetchImpl, searchContextSize: 'low' });
    const high = new OpenAiDiscoveryProvider({ config: MODEL, fetchImpl, searchContextSize: 'high' });
    const unset = new OpenAiDiscoveryProvider({ config: MODEL, fetchImpl });

    expect(low.toolConfig).toBe(`web_search:low;domains:v${DOMAIN_POLICY_VERSION};max_tool_calls:1`);
    expect(high.toolConfig).toBe(`web_search:high;domains:v${DOMAIN_POLICY_VERSION};max_tool_calls:1`);
    expect(unset.toolConfig).toBe(`web_search:default;domains:v${DOMAIN_POLICY_VERSION};max_tool_calls:1`);
    // The point of the whole field: three configurations, three strings.
    expect(new Set([low.toolConfig, high.toolConfig, unset.toolConfig]).size).toBe(3);
  });

  it('travels on the result, so the collector records the call it actually made', async () => {
    const { fetchImpl } = capturing({ sources: [] });
    const discovery = new OpenAiDiscoveryProvider({
      config: MODEL,
      fetchImpl,
      searchContextSize: 'high',
    });

    const result = await discover(discovery);

    expect(result.toolConfig).toBe(`web_search:high;domains:v${DOMAIN_POLICY_VERSION};max_tool_calls:1`);
  });

  it('never sends an empty filter object', async () => {
    /*
     * An empty blocked_domains is not the same request as no filter at all,
     * and the policy is currently allowed to be empty. Sending nothing is the
     * honest encoding of "this policy blocks nothing".
     */
    const { fetchImpl, seen } = capturing({ sources: [] });
    const discovery = new OpenAiDiscoveryProvider({ config: MODEL, fetchImpl });

    await discovery.discover({ ticker: 'ACME', companyName: null, since: '2026-08-13', knownUrls: [] });

    const entry = tool(seen[0].body);
    if (blockedSearchDomains().length === 0) {
      expect(entry).not.toHaveProperty('filters');
    } else {
      expect(entry.filters).toBeDefined();
    }
  });
});

/*
 * One hosted search per look (his ruling 2026-10-06T23:39:21.703Z, "a"): both requests carry max_tool_calls 1, and the
 * toolConfig above says so, so the ledger can tell a capped call from an uncapped one.
 */
describe('one hosted search per look', () => {
  it('MC1 discovery sends max_tool_calls 1', async () => {
    const { fetchImpl, seen } = capturing({ sources: [] });
    await new OpenAiDiscoveryProvider({ config: MODEL, fetchImpl }).discover({ ticker: 'ACME', companyName: null, since: '2026-08-13', knownUrls: [] });
    expect(seen[0].body.max_tool_calls).toBe(1);
  });

  it('MC2 the resolver sends max_tool_calls 1', async () => {
    const { fetchImpl, seen } = capturing({ candidates: [] });
    await new OpenAiCompanySourceResolver({ config: MODEL, fetchImpl }).resolve({ ticker: 'ACME', companyName: 'Acme Inc.' });
    expect(seen[0].body.max_tool_calls).toBe(1);
  });
});
