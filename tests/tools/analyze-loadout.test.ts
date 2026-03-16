import { describe, it, expect, beforeAll } from 'vitest';
import { createTestClient } from '../helpers/test-db.js';
import type { Client } from '@modelcontextprotocol/sdk/client/index.js';

function getText(result: { content: unknown[] }): string {
  return (result.content[0] as { type: 'text'; text: string }).text;
}

describe('analyze_loadout tool', () => {
  let client: Client;

  beforeAll(async () => {
    client = await createTestClient();
  });

  it('analyzes a valid loadout', async () => {
    const result = await client.callTool({
      name: 'analyze_loadout',
      arguments: {
        items: ['Longsword', 'Chain Mail', 'Shield', 'Backpack'],
      },
    });
    const text = getText(result);
    expect(text).toContain('Weight');
    expect(text).toContain('Cost');
  });

  it('calculates armor AC', async () => {
    const result = await client.callTool({
      name: 'analyze_loadout',
      arguments: {
        items: ['Chain Mail', 'Shield'],
      },
    });
    const text = getText(result);
    expect(text).toContain('AC');
    expect(text).toContain('18'); // Chain mail 16 + shield 2
  });

  it('shows encumbrance with strength', async () => {
    const result = await client.callTool({
      name: 'analyze_loadout',
      arguments: {
        items: ['Chain Mail', 'Shield', 'Longsword', 'Backpack'],
        strength_score: 10,
      },
    });
    const text = getText(result);
    expect(text).toContain('Carry Capacity');
  });

  it('flags unrecognized items', async () => {
    const result = await client.callTool({
      name: 'analyze_loadout',
      arguments: {
        items: ['Longsword', 'Magic Trinket of Mystery'],
      },
    });
    const text = getText(result);
    expect(text.toLowerCase()).toContain('not found');
  });
});
