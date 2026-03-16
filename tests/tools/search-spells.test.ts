import { describe, it, expect, beforeAll } from 'vitest';
import { createTestClient } from '../helpers/test-db.js';
import type { Client } from '@modelcontextprotocol/sdk/client/index.js';

function getText(result: { content: unknown[] }): string {
  return (result.content[0] as { type: 'text'; text: string }).text;
}

describe('search_spells tool', () => {
  let client: Client;

  beforeAll(async () => {
    client = await createTestClient();
  });

  it('searches by name', async () => {
    const result = await client.callTool({
      name: 'search_spells',
      arguments: { query: 'fireball' },
    });
    const text = getText(result);
    expect(text).toContain('Fireball');
    expect(text).toContain('evocation');
  });

  it('filters by level', async () => {
    const result = await client.callTool({
      name: 'search_spells',
      arguments: { level: 0 },
    });
    const text = getText(result);
    expect(text).toContain('Light');
  });

  it('filters by school and class', async () => {
    const result = await client.callTool({
      name: 'search_spells',
      arguments: { school: 'Evocation', class_name: 'Wizard' },
    });
    const text = getText(result);
    expect(text).toContain('Fireball');
    expect(text).toContain('Light');
  });

  it('filters concentration spells', async () => {
    const result = await client.callTool({
      name: 'search_spells',
      arguments: { concentration: true },
    });
    const text = getText(result);
    expect(text).toContain('Detect Magic');
    expect(text).toContain('Hold Person');
  });

  it('filters ritual spells', async () => {
    const result = await client.callTool({
      name: 'search_spells',
      arguments: { ritual: true },
    });
    const text = getText(result);
    expect(text).toContain('Detect Magic');
  });

  it('filters by damage type', async () => {
    const result = await client.callTool({
      name: 'search_spells',
      arguments: { damage_type: 'fire' },
    });
    const text = getText(result);
    expect(text).toContain('Fireball');
  });

  it('shows components', async () => {
    const result = await client.callTool({
      name: 'search_spells',
      arguments: { query: 'fireball' },
    });
    const text = getText(result);
    expect(text).toContain('V');
    expect(text).toContain('S');
    expect(text).toContain('M');
  });

  it('returns error for no results', async () => {
    const result = await client.callTool({
      name: 'search_spells',
      arguments: { query: 'nonexistent_spell_xyz' },
    });
    expect(result.isError).toBe(true);
  });
});
