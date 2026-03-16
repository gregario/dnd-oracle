import { describe, it, expect, beforeAll } from 'vitest';
import { createTestClient } from '../helpers/test-db.js';
import type { Client } from '@modelcontextprotocol/sdk/client/index.js';

function getText(result: { content: unknown[] }): string {
  return (result.content[0] as { type: 'text'; text: string }).text;
}

describe('search_rules tool', () => {
  let client: Client;

  beforeAll(async () => {
    client = await createTestClient();
  });

  it('searches rules by query', async () => {
    const result = await client.callTool({
      name: 'search_rules',
      arguments: { query: 'saving throw' },
    });
    const text = getText(result);
    expect(text).toContain('Saving Throws');
  });

  it('looks up specific condition', async () => {
    const result = await client.callTool({
      name: 'search_rules',
      arguments: { condition_name: 'Blinded' },
    });
    const text = getText(result);
    expect(text).toContain('Blinded');
    expect(text).toContain("can't see");
  });

  it('lists all conditions when no args', async () => {
    const result = await client.callTool({
      name: 'search_rules',
      arguments: {},
    });
    const text = getText(result);
    expect(text).toContain('Blinded');
    expect(text).toContain('Charmed');
    expect(text).toContain('Frightened');
  });

  it('returns error for invalid condition', async () => {
    const result = await client.callTool({
      name: 'search_rules',
      arguments: { condition_name: 'Nonexistent' },
    });
    expect(result.isError).toBe(true);
  });
});
