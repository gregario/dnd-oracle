import { describe, it, expect, beforeAll } from 'vitest';
import { createTestClient } from './helpers/test-db.js';
import type { Client } from '@modelcontextprotocol/sdk/client/index.js';

describe('dnd-oracle server', () => {
  let client: Client;

  beforeAll(async () => {
    client = await createTestClient();
  });

  it('lists all 20 tools', async () => {
    const { tools } = await client.listTools();
    expect(tools).toHaveLength(20);
  });

  it('has all reference tools', async () => {
    const { tools } = await client.listTools();
    const names = tools.map((t) => t.name);
    expect(names).toContain('search_monsters');
    expect(names).toContain('search_spells');
    expect(names).toContain('search_equipment');
    expect(names).toContain('browse_classes');
    expect(names).toContain('browse_races');
    expect(names).toContain('search_rules');
  });

  it('has all analytical tools', async () => {
    const { tools } = await client.listTools();
    const names = tools.map((t) => t.name);
    expect(names).toContain('build_encounter');
    expect(names).toContain('plan_spells');
    expect(names).toContain('compare_monsters');
    expect(names).toContain('analyze_loadout');
    expect(names).toContain('check_resistances');
    expect(names).toContain('magic_item_attunement');
    expect(names).toContain('simulate_damage');
    expect(names).toContain('analyze_party');
    expect(names).toContain('build_character');
    expect(names).toContain('rest_calculator');
    expect(names).toContain('travel_calculator');
    expect(names).toContain('plan_adventuring_day');
    expect(names).toContain('roll_table');
    expect(names).toContain('suggest_encounter');
  });

  it('every tool has a description', async () => {
    const { tools } = await client.listTools();
    for (const tool of tools) {
      expect(tool.description, `${tool.name} missing description`).toBeTruthy();
    }
  });
});
