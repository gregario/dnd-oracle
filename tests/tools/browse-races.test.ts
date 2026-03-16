import { describe, it, expect, beforeAll } from 'vitest';
import { createTestClient } from '../helpers/test-db.js';
import type { Client } from '@modelcontextprotocol/sdk/client/index.js';

function getText(result: { content: unknown[] }): string {
  return (result.content[0] as { type: 'text'; text: string }).text;
}

describe('browse_races tool', () => {
  let client: Client;

  beforeAll(async () => {
    client = await createTestClient();
  });

  it('lists all races', async () => {
    const result = await client.callTool({
      name: 'browse_races',
      arguments: {},
    });
    const text = getText(result);
    expect(text).toContain('Human');
    expect(text).toContain('Elf');
  });

  it('shows specific race details', async () => {
    const result = await client.callTool({
      name: 'browse_races',
      arguments: { race_name: 'Elf' },
    });
    const text = getText(result);
    expect(text).toContain('Elf');
    expect(text).toContain('Darkvision');
    expect(text).toContain('+2');
  });

  it('shows subraces', async () => {
    const result = await client.callTool({
      name: 'browse_races',
      arguments: { race_name: 'Elf' },
    });
    const text = getText(result);
    expect(text).toContain('High Elf');
    expect(text).toContain('Wood Elf');
  });

  it('returns error for invalid race', async () => {
    const result = await client.callTool({
      name: 'browse_races',
      arguments: { race_name: 'Tiefling' },
    });
    expect(result.isError).toBe(true);
  });
});
