import { describe, it, expect, beforeAll } from 'vitest';
import { createTestClient } from '../helpers/test-db.js';
import type { Client } from '@modelcontextprotocol/sdk/client/index.js';

function getText(result: { content: unknown[] }): string {
  return (result.content[0] as { type: 'text'; text: string }).text;
}

describe('build_character tool', () => {
  let client: Client;

  beforeAll(async () => {
    client = await createTestClient();
  });

  it('builds a fighter character', async () => {
    const result = await client.callTool({
      name: 'build_character',
      arguments: {
        race_name: 'Human',
        class_name: 'Fighter',
        level: 5,
        ability_scores: [16, 14, 14, 10, 12, 8],
      },
    });
    const text = getText(result);
    expect(text).toContain('Human Fighter');
    expect(text).toContain('Level 5');
    expect(text).toContain('+3'); // proficiency bonus
    expect(text).toContain('Extra Attack');
  });

  it('computes spell save DC for wizard', async () => {
    const result = await client.callTool({
      name: 'build_character',
      arguments: {
        race_name: 'Elf',
        class_name: 'Wizard',
        level: 5,
        ability_scores: [8, 14, 12, 16, 13, 10],
      },
    });
    const text = getText(result);
    expect(text).toContain('Spell Save DC');
    expect(text).toContain('Intelligence');
    // Elf gets +2 DEX, INT stays 16, mod +3, prof +3, DC = 8+3+3 = 14
    expect(text).toContain('14');
  });

  it('applies racial ability bonuses', async () => {
    const result = await client.callTool({
      name: 'build_character',
      arguments: {
        race_name: 'Elf',
        class_name: 'Fighter',
        level: 1,
        ability_scores: [16, 14, 14, 10, 12, 8],
      },
    });
    const text = getText(result);
    // Elf gives +2 DEX: 14 → 16 (+3)
    expect(text).toContain('16 (+3)');
  });

  it('returns error for unknown class', async () => {
    const result = await client.callTool({
      name: 'build_character',
      arguments: {
        race_name: 'Human',
        class_name: 'Artificer',
        level: 1,
        ability_scores: [10, 10, 10, 10, 10, 10],
      },
    });
    expect(result.isError).toBe(true);
  });
});
