import { describe, it, expect, beforeAll } from 'vitest';
import { createTestClient } from '../helpers/test-db.js';
import type { Client } from '@modelcontextprotocol/sdk/client/index.js';

function getText(result: { content: unknown[] }): string {
  return (result.content[0] as { type: 'text'; text: string }).text;
}

describe('plan_spells tool', () => {
  let client: Client;

  beforeAll(async () => {
    client = await createTestClient();
  });

  it('shows wizard spell slots', async () => {
    const result = await client.callTool({
      name: 'plan_spells',
      arguments: { class_name: 'Wizard', level: 5 },
    });
    const text = getText(result);
    expect(text).toContain('Wizard');
    expect(text).toContain('Spell Slots');
  });

  it('shows available spells for class', async () => {
    const result = await client.callTool({
      name: 'plan_spells',
      arguments: { class_name: 'Wizard', level: 5 },
    });
    const text = getText(result);
    expect(text).toContain('Fireball');
    expect(text).toContain('Shield');
  });

  it('returns error for non-caster', async () => {
    const result = await client.callTool({
      name: 'plan_spells',
      arguments: { class_name: 'Fighter', level: 5 },
    });
    expect(result.isError).toBe(true);
  });

  it('flags concentration spells in prepared list', async () => {
    const result = await client.callTool({
      name: 'plan_spells',
      arguments: {
        class_name: 'Wizard',
        level: 5,
        prepared_spells: ['Detect Magic', 'Hold Person'],
      },
    });
    const text = getText(result);
    expect(text).toContain('concentration');
  });

  it('highlights ritual spells', async () => {
    const result = await client.callTool({
      name: 'plan_spells',
      arguments: {
        class_name: 'Wizard',
        level: 5,
        prepared_spells: ['Detect Magic'],
      },
    });
    const text = getText(result);
    expect(text.toLowerCase()).toContain('ritual');
  });

  it('returns error for invalid class', async () => {
    const result = await client.callTool({
      name: 'plan_spells',
      arguments: { class_name: 'Artificer', level: 5 },
    });
    expect(result.isError).toBe(true);
  });
});
