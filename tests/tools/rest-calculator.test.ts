import { describe, it, expect, beforeAll } from 'vitest';
import { createTestClient } from '../helpers/test-db.js';
import type { Client } from '@modelcontextprotocol/sdk/client/index.js';

function getText(result: { content: unknown[] }): string {
  return (result.content[0] as { type: 'text'; text: string }).text;
}

describe('rest_calculator tool', () => {
  let client: Client;

  beforeAll(async () => {
    client = await createTestClient();
  });

  it('shows fighter short rest recovery', async () => {
    const result = await client.callTool({
      name: 'rest_calculator',
      arguments: { class_name: 'Fighter', level: 5 },
    });
    const text = getText(result);
    expect(text).toContain('Second Wind');
    expect(text).toContain('Action Surge');
    expect(text).toContain('Short Rest');
  });

  it('shows wizard arcane recovery', async () => {
    const result = await client.callTool({
      name: 'rest_calculator',
      arguments: { class_name: 'Wizard', level: 3 },
    });
    const text = getText(result);
    expect(text).toContain('Arcane Recovery');
    expect(text).toContain('Spell Slots');
  });

  it('shows cleric channel divinity', async () => {
    const result = await client.callTool({
      name: 'rest_calculator',
      arguments: { class_name: 'Cleric', level: 6 },
    });
    const text = getText(result);
    expect(text).toContain('Channel Divinity');
    expect(text).toContain('2 uses');
  });

  it('returns error for unknown class', async () => {
    const result = await client.callTool({
      name: 'rest_calculator',
      arguments: { class_name: 'Artificer', level: 1 },
    });
    expect(result.isError).toBe(true);
  });

  it('provides rest guidance', async () => {
    const result = await client.callTool({
      name: 'rest_calculator',
      arguments: { class_name: 'Fighter', level: 5 },
    });
    const text = getText(result);
    expect(text).toContain('short-rest value');
  });
});
