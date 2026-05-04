import { describe, it, expect, beforeAll } from 'vitest';
import { createTestClient } from '../helpers/test-db.js';
import type { Client } from '@modelcontextprotocol/sdk/client/index.js';

function getText(result: { content: unknown[] }): string {
  return (result.content[0] as { type: 'text'; text: string }).text;
}

describe('simulate_damage tool', () => {
  let client: Client;

  beforeAll(async () => {
    client = await createTestClient();
  });

  it('calculates hit probability correctly', async () => {
    const result = await client.callTool({
      name: 'simulate_damage',
      arguments: {
        attack_bonus: 5,
        damage_dice: '1d8+3',
        num_attacks: 1,
        target_ac: 15,
      },
    });
    const text = getText(result);
    // Need 10+ on d20 to hit AC 15 with +5, so 55% hit rate
    expect(text).toContain('55.0%');
    expect(text).toContain('DPR');
  });

  it('computes turns to kill', async () => {
    const result = await client.callTool({
      name: 'simulate_damage',
      arguments: {
        attack_bonus: 7,
        damage_dice: '2d6+5',
        num_attacks: 2,
        target_ac: 15,
        target_hp: 100,
      },
    });
    const text = getText(result);
    expect(text).toContain('Turns to Kill');
  });

  it('handles advantage', async () => {
    const result = await client.callTool({
      name: 'simulate_damage',
      arguments: {
        attack_bonus: 5,
        damage_dice: '1d8+3',
        num_attacks: 1,
        target_ac: 15,
        advantage: true,
      },
    });
    const text = getText(result);
    // Advantage on 55% hit should give ~79.75%
    expect(text).toContain('79.');
  });

  it('returns error for invalid dice notation', async () => {
    const result = await client.callTool({
      name: 'simulate_damage',
      arguments: {
        attack_bonus: 5,
        damage_dice: 'invalid',
        num_attacks: 1,
        target_ac: 15,
      },
    });
    expect(result.isError).toBe(true);
  });

  it('shows AC sensitivity table', async () => {
    const result = await client.callTool({
      name: 'simulate_damage',
      arguments: {
        attack_bonus: 5,
        damage_dice: '1d8+3',
        num_attacks: 1,
        target_ac: 15,
      },
    });
    const text = getText(result);
    expect(text).toContain('AC Sensitivity');
    expect(text).toContain('←');
  });
});
