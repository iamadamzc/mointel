# Model rate card — gpt-5.6-terra and gpt-5.6-luna, as OpenAI publishes it

**Written by Commercial, 2026-09-07, against `f408788`.** Integration's task: the
published rates for the two models the desk runs, with cached input as its own
line, the page and its date, and the tier being quoted. Public documentation
only. No account, no console, no login-gated page, no contact.

**Which models, from the repo:** `lib/research/config.ts:22` sets
`DEFAULT_RESEARCH_MODEL = 'gpt-5.6-terra'`. `gpt-5.6-luna` appears only in the
Research charter. Nothing in `lib/research/` sets a `service_tier`, so the
desk's calls are billed at **Standard**. The counters the desk records are
`usage.input_tokens` and `usage.input_tokens_details.cached_tokens`
(`openaiInterpreter.ts:323`, `openaiDiscovery.ts:75`) — the second is **cache
reads**, and the usage object carries no cache-write count.

## THE CARD — Standard tier, USD per 1M tokens, verified 2026-09-07

Source: **developers.openai.com/api/docs/pricing**, "Flagship models" table,
Standard tab, read in a rendered browser and again by fetch; and the model
pages developers.openai.com/api/docs/models/gpt-5.6-terra and
…/gpt-5.6-luna. No login was required for any of them. **The pricing page
carries no date of its own**; the dating below is from OpenAI's changelog.

| model | context | input | cached input (reads) | cache writes | output |
| --- | --- | ---: | ---: | ---: | ---: |
| **gpt-5.6-terra** | short (≤ 272K input) | **$2.00** | **$0.20** | $2.50 | **$12.00** |
| gpt-5.6-terra | long (> 272K input) | $4.00 | $0.40 | $5.00 | $18.00 |
| **gpt-5.6-luna** | short | **$0.20** | **$0.02** | $0.25 | **$1.20** |
| gpt-5.6-luna | long | $0.40 | $0.04 | $0.50 | $1.80 |

**Four lines from the pages that change the arithmetic, verbatim:**

- Model page, terra: *"Cache writes are billed at 1.25x the uncached input
  token rate."* The pricing table carries the same as its "Cache writes"
  column: $2.50 against $2.00.
- Model page, terra: *"Prompts with >272K input tokens are priced at 2x input
  and 1.5x output for the full request."* That is the long-context row, and it
  applies to the whole request, not to the tokens past the threshold.
- Pricing page: *"Priority processing was renamed Fast mode on July 30, 2026.
  You can use either service_tier: "priority" or service_tier: "fast" in your
  API requests."* The desk sets neither.
- Pricing page: *"Regional processing (data residency) endpoints are charged a
  10% uplift for models released on or after March 5, 2026."* The desk calls
  api.openai.com, not a regional endpoint.

**Other tiers on the same page, read by fetch and not re-read in the rendered
tab:** Batch and Flex are each half of Standard for both models (terra
$1.00 / $0.10 / $6.00; luna $0.10 / $0.01 / $0.60); Fast mode is double
(terra $4.00 / $0.40 / $24.00; luna $0.40 / $0.04 / $2.40). Quote these as
the fetcher's reading of the page, not as this seat's.

## THE DATE

OpenAI's changelog (developers.openai.com/api/docs/changelog):

- **2026-07-09:** *"Released the GPT-5.6 model family, including GPT-5.6 Sol
  for frontier capability, GPT-5.6 Terra for balance, and GPT-5.6 Luna for
  efficient workloads."*
- **2026-07-30:** *"Starting July 30, GPT-5.6 Luna costs 80% less, while
  GPT-5.6 Terra costs 20% less."* **The card above is the post-2026-07-30
  card.** By that entry's arithmetic the launch rates were $2.50 / $15.00 for
  terra and $1.00 / $6.00 for luna; those are implied, not read.
- **2026-05-29:** *"`prompt_cache_retention` now defaults to `24h` instead of
  `in_memory`, enabling extended prompt caching by default."*
- **2025-08-20:** the Prompt Caching dashboard shows *"cache-read, cache-write,
  and uncached tokens"* — the breakdown the API usage object does not carry.

## WHAT THE CARD DOES AND DOES NOT LET THE DESK COMPUTE

- **Cache reads are priced and the desk counts them.** `cached_tokens` is the
  read count, billed at $0.20 per million on terra.
- **Cache writes are priced at 1.25x and the desk does not count them.** The
  usage object the desk records has no write field; writes sit inside
  `input_tokens` at $2.50 rather than $2.00 per million. So a day's uncached
  input is billed somewhere between $2.00 and $2.50 per million depending on
  how much of it was a cache write, and **the split is visible only on the
  Prompt Caching dashboard, which is behind the console login and is his to
  open, not this seat's.** A cost figure built from the desk's own counters
  is therefore a **floor-to-ceiling band, not a number**: input at $2.00
  (all reuse) to $2.50 (all writes), reads at $0.20, output at $12.00.
- **The long-context multiplier is a cliff, not a slope.** One request over
  272K input tokens is billed 2x on input and 1.5x on output for all of it.
  Whether any desk request crosses it is Research's to say from its counters;
  the interpretation sizes quoted in the gates map (~13k tokens a name) sit
  far below it.

## WHAT COULD NOT BE ESTABLISHED FROM PUBLIC PAGES

- Whether the desk's measured "cached" tokens include any write-side
  accounting: by OpenAI's field definitions they are reads; the write count
  is on a login-gated dashboard.
- The Batch, Flex and Fast columns, beyond the fetcher's reading.
- Any volume discount or negotiated rate: none is published on the pricing
  page; the ChatGPT business pricing page offers *"volume discounts"* only
  under Enterprise, contact sales.

## SOURCES

developers.openai.com/api/docs/pricing ·
developers.openai.com/api/docs/models/gpt-5.6-terra ·
developers.openai.com/api/docs/models/gpt-5.6-luna ·
developers.openai.com/api/docs/changelog · openai.com/api/pricing (returns 403
to a fetcher; in a browser it renders the ChatGPT business page, which lists
the models by name without API rates). Code: `lib/research/config.ts`,
`lib/research/interpret/openaiInterpreter.ts`,
`lib/research/catalyst/openaiDiscovery.ts` at `f408788`.
