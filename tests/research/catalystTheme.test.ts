import { describe, expect, it } from 'vitest';

import {
  CATALYST_DEAL_STATUSES,
  CATALYST_EVENTS,
  CATALYST_THEME_IDS,
  CATALYST_THEMES,
  MODEL_DEAL_ENUM,
  MODEL_EVENT_ENUM,
  MODEL_NO_EVENT,
  MODEL_NOT_A_DEAL,
  NO_CATALYST,
  catalystTagsOf,
  catalystThemePromptBlock,
} from '@/lib/research/interpret/catalystTheme';
import { SYSTEM_PROMPT_A, SYSTEM_PROMPT_B } from '@/lib/research/interpret/openaiInterpreter';
import {
  AUTOMATIC_DOSSIER_SCHEMA,
  AUTOMATIC_DOSSIER_SCHEMA_VERSION,
  INTERPRETER_PROMPT_VERSION,
} from '@/lib/research/interpret/schema';

/*
 * The catalyst tags (schema 4, prompt 6): the theme line, option C, with his list review (his "yes to both",
 * 2026-10-12T17:19:00.133Z). Each list is ONE constant; the schema, the prompt and the reader take it from there.
 */

type Field = { type: unknown; enum?: string[]; items?: { type: string; enum: string[] }; description?: string };
const catalystSchema = () =>
  (AUTOMATIC_DOSSIER_SCHEMA as { properties: { catalyst: { required: string[]; properties: Record<string, Field> } } })
    .properties.catalyst;

describe('the catalyst tags', () => {
  it('S1 four required fields from the constants; the model can never pick NO_CATALYST; catalystType unchanged', () => {
    expect(AUTOMATIC_DOSSIER_SCHEMA_VERSION).toBe(4);
    expect(INTERPRETER_PROMPT_VERSION).toBe(6);
    const catalyst = catalystSchema();
    for (const key of ['catalystThemes', 'catalystPassingThemes', 'catalystEvent', 'catalystDealStatus']) {
      expect(catalyst.required).toContain(key);
    }
    expect(catalyst.required).not.toContain('catalystTheme');
    for (const key of ['catalystThemes', 'catalystPassingThemes']) {
      const field = catalyst.properties[key]!;
      expect(field.type).toBe('array');
      expect(field.items!.enum).toEqual([...CATALYST_THEME_IDS]);
    }
    expect(catalyst.properties.catalystEvent!.enum).toEqual([...MODEL_EVENT_ENUM]);
    expect(catalyst.properties.catalystDealStatus!.enum).toEqual([...MODEL_DEAL_ENUM]);
    const everyEnum = [
      ...catalyst.properties.catalystThemes!.items!.enum,
      ...catalyst.properties.catalystEvent!.enum!,
      ...catalyst.properties.catalystDealStatus!.enum!,
    ];
    expect(everyEnum).not.toContain(NO_CATALYST);
    expect(everyEnum).not.toContain('OTHER');
    expect(catalyst.properties.catalystEvent!.enum).toContain(MODEL_NO_EVENT);
    expect(catalyst.properties.catalystDealStatus!.enum).toContain(MODEL_NOT_A_DEAL);
    expect(catalyst.properties.catalystType!.enum).toEqual(['NEWS_DRIVEN', 'FLOW_DOMINANT', 'SECONDARY_STALE', 'NONE_IDENTIFIED', 'UNKNOWN']);
  });

  it('S2 the lists as he ruled: 15 topics (defense and drones apart, energy and nuclear apart, consumer and retail one), his ten event types, four deal states', () => {
    expect([...CATALYST_THEME_IDS]).toEqual([
      'AI', 'SEMICONDUCTORS_COMPUTING', 'ROBOTICS_AUTOMATION', 'SPACE_SATELLITES', 'CRITICAL_MINERALS_METALS',
      'EV_BATTERIES', 'FINTECH_PAYMENTS', 'CONSUMER_RETAIL', 'CRYPTO', 'QUANTUM', 'DEFENSE', 'DRONES', 'ENERGY',
      'NUCLEAR', 'BIOTECH_MEDICAL',
    ]);
    expect(CATALYST_THEMES.find((t) => t.id === 'CONSUMER_RETAIL')!.covers).toContain('entertainment, gaming');
    expect(CATALYST_EVENTS.map((e) => e.id)).toEqual([
      'COMMERCIAL_AGREEMENT', 'PARTNERSHIP', 'M_AND_A_STRATEGIC', 'FINANCIAL_RESULTS_OUTLOOK', 'REGULATORY_CLINICAL',
      'PRODUCT_TECH_MILESTONE', 'FINANCING_CAPITAL', 'GOVERNMENT_POLICY', 'CORPORATE_LISTING', 'OTHER_MATERIAL',
    ]);
    expect([...CATALYST_DEAL_STATUSES]).toEqual(['PROPOSED', 'SIGNED', 'COMPLETED', 'UPDATED']);
  });

  it('S3 the prompt in both variants: the event, every topic with what it covers, the tie rules, passing, never NO_CATALYST', () => {
    const block = catalystThemePromptBlock();
    expect(SYSTEM_PROMPT_A).toContain(block);
    expect(SYSTEM_PROMPT_B).toContain(block);
    for (const theme of CATALYST_THEMES) expect(block).toContain(`${theme.id}: ${theme.covers}`);
    for (const event of CATALYST_EVENTS) expect(block).toContain(`${event.id}: ${event.covers}`);
    for (const status of CATALYST_DEAL_STATUSES) expect(block).toContain(status);
    expect(block).toContain('EVENT the cited catalyst source reports');
    expect(block).toContain('first about');
    expect(block).toContain('government body is GOVERNMENT_POLICY');
    expect(block).toContain('only in passing');
    expect(block).not.toContain(NO_CATALYST);
  });

  it('S4 reads a version before schema 4 as NOT_TAGGED, and stored tags as themselves', () => {
    expect(catalystTagsOf({ catalyst: {} })).toBe('NOT_TAGGED');
    expect(
      catalystTagsOf({ catalyst: { catalystThemes: ['AI'], catalystPassingThemes: [], catalystEvent: 'PARTNERSHIP', catalystDealStatus: 'SIGNED' } }),
    ).toEqual({ themes: ['AI'], passingThemes: [], event: 'PARTNERSHIP', dealStatus: 'SIGNED' });
    expect(catalystTagsOf({ catalyst: { catalystThemes: null } })).toEqual({ themes: null, passingThemes: null, event: null, dealStatus: null });
  });
});
