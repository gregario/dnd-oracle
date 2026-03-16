import { describe, it, expect, beforeAll } from 'vitest';
import { createTestClient } from '../helpers/test-db.js';
import type { Client } from '@modelcontextprotocol/sdk/client/index.js';

function getText(result: { content: unknown[] }): string {
  return (result.content[0] as { type: 'text'; text: string }).text;
}

describe('browse_classes tool', () => {
  let client: Client;

  beforeAll(async () => {
    client = await createTestClient();
  });

  it('lists all classes', async () => {
    const result = await client.callTool({
      name: 'browse_classes',
      arguments: {},
    });
    const text = getText(result);
    expect(text).toContain('Fighter');
    expect(text).toContain('Wizard');
    expect(text).toContain('Cleric');
  });

  it('shows specific class details', async () => {
    const result = await client.callTool({
      name: 'browse_classes',
      arguments: { class_name: 'Fighter' },
    });
    const text = getText(result);
    expect(text).toContain('Fighter');
    expect(text).toContain('Hit Die');
    expect(text).toContain('d10');
    expect(text).toContain('Second Wind');
  });

  it('filters features by level', async () => {
    const result = await client.callTool({
      name: 'browse_classes',
      arguments: { class_name: 'Fighter', level: 2 },
    });
    const text = getText(result);
    expect(text).toContain('Action Surge');
    expect(text).not.toContain('Extra Attack');
  });

  it('returns error for invalid class', async () => {
    const result = await client.callTool({
      name: 'browse_classes',
      arguments: { class_name: 'Artificer' },
    });
    expect(result.isError).toBe(true);
  });

  it('handles multiclass', async () => {
    const result = await client.callTool({
      name: 'browse_classes',
      arguments: {
        multiclass: [
          { class_name: 'Fighter', level: 5 },
          { class_name: 'Wizard', level: 3 },
        ],
      },
    });
    const text = getText(result);
    expect(text).toContain('Fighter');
    expect(text).toContain('Wizard');
  });
});
