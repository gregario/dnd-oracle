import { describe, it, expect, beforeAll } from 'vitest';
import { createTestClient } from '../helpers/test-db.js';
import type { Client } from '@modelcontextprotocol/sdk/client/index.js';

function getText(result: { content: unknown[] }): string {
  return (result.content[0] as { type: 'text'; text: string }).text;
}

describe('compare_monsters tool', () => {
  let client: Client;

  beforeAll(async () => {
    client = await createTestClient();
  });

  it('compares 2 monsters', async () => {
    const result = await client.callTool({
      name: 'compare_monsters',
      arguments: { monster_names: ['Goblin', 'Zombie'] },
    });
    const text = getText(result);
    expect(text).toContain('Goblin');
    expect(text).toContain('Zombie');
    expect(text).toContain('AC');
    expect(text).toContain('HP');
  });

  it('compares 3 monsters', async () => {
    const result = await client.callTool({
      name: 'compare_monsters',
      arguments: { monster_names: ['Goblin', 'Zombie', 'Owlbear'] },
    });
    const text = getText(result);
    expect(text).toContain('Goblin');
    expect(text).toContain('Zombie');
    expect(text).toContain('Owlbear');
  });

  it('returns error for not found monster', async () => {
    const result = await client.callTool({
      name: 'compare_monsters',
      arguments: { monster_names: ['Goblin', 'Nonexistent'] },
    });
    expect(result.isError).toBe(true);
    const text = getText(result);
    expect(text).toContain('Nonexistent');
  });
});
