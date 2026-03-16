import { describe, it, expect, beforeAll } from 'vitest';
import { createTestClient } from '../helpers/test-db.js';
import type { Client } from '@modelcontextprotocol/sdk/client/index.js';

function getText(result: { content: unknown[] }): string {
  return (result.content[0] as { type: 'text'; text: string }).text;
}

describe('search_equipment tool', () => {
  let client: Client;

  beforeAll(async () => {
    client = await createTestClient();
  });

  it('searches by name', async () => {
    const result = await client.callTool({
      name: 'search_equipment',
      arguments: { query: 'longsword' },
    });
    const text = getText(result);
    expect(text).toContain('Longsword');
  });

  it('filters by weapon property', async () => {
    const result = await client.callTool({
      name: 'search_equipment',
      arguments: { weapon_property: 'Versatile' },
    });
    const text = getText(result);
    expect(text).toContain('Longsword');
  });

  it('filters by armor category', async () => {
    const result = await client.callTool({
      name: 'search_equipment',
      arguments: { armor_category: 'Heavy' },
    });
    const text = getText(result);
    expect(text).toContain('Chain Mail');
  });

  it('searches magic items by rarity', async () => {
    const result = await client.callTool({
      name: 'search_equipment',
      arguments: { rarity: 'uncommon' },
    });
    const text = getText(result);
    expect(text).toContain('Bag of Holding');
  });

  it('filters by cost range', async () => {
    const result = await client.callTool({
      name: 'search_equipment',
      arguments: { cost_min: 10, cost_max: 30 },
    });
    const text = getText(result);
    expect(text).toContain('Longsword');
  });

  it('returns error for no results', async () => {
    const result = await client.callTool({
      name: 'search_equipment',
      arguments: { query: 'nonexistent_item_xyz' },
    });
    expect(result.isError).toBe(true);
  });
});
