import { describe, it, expect, beforeAll } from 'vitest';
import { createTestClient } from '../helpers/test-db.js';
import type { Client } from '@modelcontextprotocol/sdk/client/index.js';

function getText(result: { content: unknown[] }): string {
  return (result.content[0] as { type: 'text'; text: string }).text;
}

describe('analyze_party tool', () => {
  let client: Client;

  beforeAll(async () => {
    client = await createTestClient();
  });

  it('analyzes a balanced party', async () => {
    const result = await client.callTool({
      name: 'analyze_party',
      arguments: {
        members: [
          { class_name: 'Fighter', level: 5 },
          { class_name: 'Wizard', level: 5 },
          { class_name: 'Cleric', level: 5 },
        ],
      },
    });
    const text = getText(result);
    expect(text).toContain('Fighter');
    expect(text).toContain('Wizard');
    expect(text).toContain('Cleric');
    expect(text).toContain('Saving Throw Coverage');
    expect(text).toContain('Role Balance');
  });

  it('identifies missing saving throws', async () => {
    // Fighter has STR/CON, Wizard has INT/WIS — missing DEX and CHA
    const result = await client.callTool({
      name: 'analyze_party',
      arguments: {
        members: [
          { class_name: 'Fighter', level: 5 },
          { class_name: 'Wizard', level: 5 },
        ],
      },
    });
    const text = getText(result);
    expect(text).toContain('Dexterity');
    expect(text).toContain('Charisma');
  });

  it('detects darkvision from race', async () => {
    const result = await client.callTool({
      name: 'analyze_party',
      arguments: {
        members: [
          { class_name: 'Fighter', level: 5, race_name: 'Elf' },
          { class_name: 'Wizard', level: 5, race_name: 'Human' },
        ],
      },
    });
    const text = getText(result);
    expect(text).toContain('Darkvision');
    expect(text).toContain('1/2');
  });

  it('shows languages from races', async () => {
    const result = await client.callTool({
      name: 'analyze_party',
      arguments: {
        members: [
          { class_name: 'Fighter', level: 5, race_name: 'Elf' },
        ],
      },
    });
    const text = getText(result);
    expect(text).toContain('Elvish');
    expect(text).toContain('Common');
  });

  it('warns about missing roles', async () => {
    // Two fighters = no healer, no controller, no utility
    const result = await client.callTool({
      name: 'analyze_party',
      arguments: {
        members: [
          { class_name: 'Fighter', level: 5 },
          { class_name: 'Fighter', level: 5 },
        ],
      },
    });
    const text = getText(result);
    expect(text).toContain('No dedicated healer');
  });
});
