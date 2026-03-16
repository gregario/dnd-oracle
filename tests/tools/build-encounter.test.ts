import { describe, it, expect, beforeAll } from 'vitest';
import { createTestClient } from '../helpers/test-db.js';
import type { Client } from '@modelcontextprotocol/sdk/client/index.js';

function getText(result: { content: unknown[] }): string {
  return (result.content[0] as { type: 'text'; text: string }).text;
}

describe('build_encounter tool', () => {
  let client: Client;

  beforeAll(async () => {
    client = await createTestClient();
  });

  it('shows all difficulty budgets', async () => {
    const result = await client.callTool({
      name: 'build_encounter',
      arguments: { party_size: 4, party_level: 5 },
    });
    const text = getText(result);
    expect(text).toContain('Easy');
    expect(text).toContain('Medium');
    expect(text).toContain('Hard');
    expect(text).toContain('Deadly');
    expect(text).toContain('XP');
  });

  it('builds medium encounter', async () => {
    const result = await client.callTool({
      name: 'build_encounter',
      arguments: { party_size: 4, party_level: 3, difficulty: 'medium' },
    });
    const text = getText(result);
    expect(text).toContain('Medium');
  });

  it('builds deadly encounter', async () => {
    const result = await client.callTool({
      name: 'build_encounter',
      arguments: { party_size: 4, party_level: 1, difficulty: 'deadly' },
    });
    const text = getText(result);
    expect(text).toContain('Deadly');
  });

  it('suggests monsters within CR range', async () => {
    const result = await client.callTool({
      name: 'build_encounter',
      arguments: { party_size: 4, party_level: 5, difficulty: 'medium', monster_cr_min: 0, monster_cr_max: 3 },
    });
    expect(result.isError).toBeFalsy();
  });
});
