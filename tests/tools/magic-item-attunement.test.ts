import { describe, it, expect, beforeAll } from 'vitest';
import { createTestClient } from '../helpers/test-db.js';
import type { Client } from '@modelcontextprotocol/sdk/client/index.js';

function getText(result: { content: unknown[] }): string {
  return (result.content[0] as { type: 'text'; text: string }).text;
}

describe('magic_item_attunement tool', () => {
  let client: Client;

  beforeAll(async () => {
    client = await createTestClient();
  });

  it('identifies attunement requirements', async () => {
    const result = await client.callTool({
      name: 'magic_item_attunement',
      arguments: { item_names: ['Cloak of Protection', 'Bag of Holding'] },
    });
    const text = getText(result);
    expect(text).toContain('Cloak of Protection');
    expect(text).toContain('Bag of Holding');
    expect(text).toContain('Yes');
    expect(text).toContain('No');
  });

  it('warns when over attunement limit', async () => {
    const result = await client.callTool({
      name: 'magic_item_attunement',
      arguments: {
        item_names: ['Cloak of Protection'],
        current_attunement: 3,
      },
    });
    const text = getText(result);
    expect(text).toContain('OVER LIMIT');
  });

  it('shows remaining slots when within budget', async () => {
    const result = await client.callTool({
      name: 'magic_item_attunement',
      arguments: {
        item_names: ['Cloak of Protection'],
        current_attunement: 0,
      },
    });
    const text = getText(result);
    expect(text).toContain('remaining');
  });

  it('returns error for unknown item', async () => {
    const result = await client.callTool({
      name: 'magic_item_attunement',
      arguments: { item_names: ['Nonexistent Amulet'] },
    });
    expect(result.isError).toBe(true);
  });
});
