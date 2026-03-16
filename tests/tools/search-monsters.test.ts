import { describe, it, expect, beforeAll } from 'vitest';
import { createTestClient } from '../helpers/test-db.js';
import type { Client } from '@modelcontextprotocol/sdk/client/index.js';

function getText(result: { content: unknown[] }): string {
  return (result.content[0] as { type: 'text'; text: string }).text;
}

describe('search_monsters tool', () => {
  let client: Client;

  beforeAll(async () => {
    client = await createTestClient();
  });

  it('searches by name', async () => {
    const result = await client.callTool({
      name: 'search_monsters',
      arguments: { query: 'goblin' },
    });
    const text = getText(result);
    expect(text).toContain('Goblin');
    expect(text).toContain('Small humanoid');
  });

  it('filters by CR', async () => {
    const result = await client.callTool({
      name: 'search_monsters',
      arguments: { cr: '17' },
    });
    const text = getText(result);
    expect(text).toContain('Adult Red Dragon');
  });

  it('filters by CR range', async () => {
    const result = await client.callTool({
      name: 'search_monsters',
      arguments: { cr_min: 1, cr_max: 5 },
    });
    const text = getText(result);
    expect(text).toContain('Owlbear');
    expect(text).not.toContain('Goblin');
  });

  it('filters by type', async () => {
    const result = await client.callTool({
      name: 'search_monsters',
      arguments: { type: 'undead' },
    });
    const text = getText(result);
    expect(text).toContain('Zombie');
  });

  it('filters by size', async () => {
    const result = await client.callTool({
      name: 'search_monsters',
      arguments: { size: 'Huge' },
    });
    const text = getText(result);
    expect(text).toContain('Adult Red Dragon');
  });

  it('combines filters', async () => {
    const result = await client.callTool({
      name: 'search_monsters',
      arguments: { type: 'humanoid', cr: '1/4' },
    });
    const text = getText(result);
    expect(text).toContain('Goblin');
    expect(text).not.toContain('Zombie');
  });

  it('paginates results', async () => {
    const result = await client.callTool({
      name: 'search_monsters',
      arguments: { limit: 2, offset: 0 },
    });
    const text = getText(result);
    expect(text).toContain('Found 4 monsters');
  });

  it('returns error for no results', async () => {
    const result = await client.callTool({
      name: 'search_monsters',
      arguments: { query: 'nonexistent_creature_xyz' },
    });
    expect(result.isError).toBe(true);
  });

  it('shows full stat block', async () => {
    const result = await client.callTool({
      name: 'search_monsters',
      arguments: { query: 'goblin' },
    });
    const text = getText(result);
    expect(text).toContain('AC');
    expect(text).toContain('HP');
    expect(text).toContain('STR');
    expect(text).toContain('CR');
  });
});
