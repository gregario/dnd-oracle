import { describe, it, expect, beforeAll } from 'vitest';
import { createTestClient } from '../helpers/test-db.js';
import type { Client } from '@modelcontextprotocol/sdk/client/index.js';

function getText(result: { content: unknown[] }): string {
  return (result.content[0] as { type: 'text'; text: string }).text;
}

describe('roll_table tool', () => {
  let client: Client;

  beforeAll(async () => {
    client = await createTestClient();
  });

  it('lists all available tables', async () => {
    const result = await client.callTool({
      name: 'roll_table',
      arguments: { table_name: 'list' },
    });
    const text = getText(result);
    expect(text).toContain('Short-Term Madness');
    expect(text).toContain('Poisons');
    expect(text).toContain('Madness');
    expect(text).toContain('Poison');
  });

  it('shows full table without roll', async () => {
    const result = await client.callTool({
      name: 'roll_table',
      arguments: { table_name: 'Short-Term Madness' },
    });
    const text = getText(result);
    expect(text).toContain('d100');
    expect(text).toContain('paralyzed');
    expect(text).toContain('unconscious');
  });

  it('returns specific result for a roll', async () => {
    const result = await client.callTool({
      name: 'roll_table',
      arguments: { table_name: 'Short-Term Madness', roll: 50 },
    });
    const text = getText(result);
    expect(text).toContain('Roll:');
    expect(text).toContain('50');
    expect(text).toContain('babbling');
  });

  it('returns error for unknown table', async () => {
    const result = await client.callTool({
      name: 'roll_table',
      arguments: { table_name: 'Nonexistent Table' },
    });
    expect(result.isError).toBe(true);
  });

  it('returns error for out-of-range roll', async () => {
    const result = await client.callTool({
      name: 'roll_table',
      arguments: { table_name: 'Short-Term Madness', roll: 150 },
    });
    expect(result.isError).toBe(true);
    const text = getText(result);
    expect(text).toContain('out of range');
  });

  it('finds tables via fuzzy search', async () => {
    const result = await client.callTool({
      name: 'roll_table',
      arguments: { table_name: 'madness' },
    });
    const text = getText(result);
    // Should find the Short-Term Madness table via FTS
    expect(text).toContain('Short-Term Madness');
  });
});
