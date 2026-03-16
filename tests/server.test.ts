import { describe, it, expect, beforeAll } from 'vitest';
import { createTestClient } from './helpers/test-db.js';
import type { Client } from '@modelcontextprotocol/sdk/client/index.js';

describe('dnd-oracle server', () => {
  let client: Client;

  beforeAll(async () => {
    client = await createTestClient();
  });

  it('lists all 10 tools', async () => {
    const { tools } = await client.listTools();
    expect(tools).toHaveLength(10);
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
  });

  it('every tool has a description', async () => {
    const { tools } = await client.listTools();
    for (const tool of tools) {
      expect(tool.description, `${tool.name} missing description`).toBeTruthy();
    }
  });
});
