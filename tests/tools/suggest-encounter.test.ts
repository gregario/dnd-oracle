import { describe, it, expect, beforeAll } from 'vitest';
import { createTestClient } from '../helpers/test-db.js';
import type { Client } from '@modelcontextprotocol/sdk/client/index.js';

function getText(result: { content: unknown[] }): string {
  return (result.content[0] as { type: 'text'; text: string }).text;
}

describe('suggest_encounter tool', () => {
  let client: Client;

  beforeAll(async () => {
    client = await createTestClient();
  });

  it('suggests encounters with tactical notes', async () => {
    const result = await client.callTool({
      name: 'suggest_encounter',
      arguments: { party_size: 4, party_level: 3, difficulty: 'hard' },
    });
    const text = getText(result);
    expect(text).toContain('Encounter Suggestions');
    expect(text).toContain('Tactics');
    expect(text).toContain('CR');
  });

  it('includes monster roles in output', async () => {
    const result = await client.callTool({
      name: 'suggest_encounter',
      arguments: { party_size: 4, party_level: 3, difficulty: 'hard' },
    });
    const text = getText(result);
    // Should contain at least one role tag
    expect(text).toMatch(/striker|controller|tank|artillery|skirmisher|support/);
  });

  it('filters by theme', async () => {
    const result = await client.callTool({
      name: 'suggest_encounter',
      arguments: { party_size: 4, party_level: 3, difficulty: 'medium', theme: 'undead' },
    });
    const text = getText(result);
    // Zombie is our only undead in test data
    expect(text).toContain('Zombie');
  });

  it('shows XP budget information', async () => {
    const result = await client.callTool({
      name: 'suggest_encounter',
      arguments: { party_size: 4, party_level: 3, difficulty: 'hard' },
    });
    const text = getText(result);
    expect(text).toContain('Budget');
    expect(text).toContain('XP');
  });
});
