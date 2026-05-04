import { describe, it, expect, beforeAll } from 'vitest';
import { createTestClient } from '../helpers/test-db.js';
import type { Client } from '@modelcontextprotocol/sdk/client/index.js';

function getText(result: { content: unknown[] }): string {
  return (result.content[0] as { type: 'text'; text: string }).text;
}

describe('check_resistances tool', () => {
  let client: Client;

  beforeAll(async () => {
    client = await createTestClient();
  });

  it('shows resistances and immunities for multiple monsters', async () => {
    const result = await client.callTool({
      name: 'check_resistances',
      arguments: { monster_names: ['Adult Red Dragon', 'Zombie'] },
    });
    const text = getText(result);
    expect(text).toContain('Adult Red Dragon');
    expect(text).toContain('Zombie');
    expect(text).toContain('fire');
    expect(text).toContain('poison');
  });

  it('shows condition immunities', async () => {
    const result = await client.callTool({
      name: 'check_resistances',
      arguments: { monster_names: ['Zombie'] },
    });
    const text = getText(result);
    expect(text).toContain('Condition Immunities');
    expect(text).toContain('poisoned');
  });

  it('warns when party damage type is ineffective', async () => {
    const result = await client.callTool({
      name: 'check_resistances',
      arguments: {
        monster_names: ['Adult Red Dragon'],
        party_damage_types: ['fire'],
      },
    });
    const text = getText(result);
    expect(text).toContain('immune');
  });

  it('reports no special concerns for normal damage types', async () => {
    const result = await client.callTool({
      name: 'check_resistances',
      arguments: {
        monster_names: ['Goblin'],
        party_damage_types: ['slashing'],
      },
    });
    const text = getText(result);
    expect(text).toContain('normal damage');
  });

  it('returns error for unknown monster', async () => {
    const result = await client.callTool({
      name: 'check_resistances',
      arguments: { monster_names: ['Nonexistent'] },
    });
    expect(result.isError).toBe(true);
  });
});
