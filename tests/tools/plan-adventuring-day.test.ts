import { describe, it, expect, beforeAll } from 'vitest';
import { createTestClient } from '../helpers/test-db.js';
import type { Client } from '@modelcontextprotocol/sdk/client/index.js';

function getText(result: { content: unknown[] }): string {
  return (result.content[0] as { type: 'text'; text: string }).text;
}

describe('plan_adventuring_day tool', () => {
  let client: Client;

  beforeAll(async () => {
    client = await createTestClient();
  });

  it('plans a standard adventuring day', async () => {
    const result = await client.callTool({
      name: 'plan_adventuring_day',
      arguments: { party_size: 4, party_level: 5, num_encounters: 6 },
    });
    const text = getText(result);
    expect(text).toContain('Adventuring Day Plan');
    expect(text).toContain('Daily XP Budget');
    expect(text).toContain('Encounter Sequence');
    expect(text).toContain('Rest Placement');
  });

  it('uses custom difficulty mix', async () => {
    const result = await client.callTool({
      name: 'plan_adventuring_day',
      arguments: {
        party_size: 4,
        party_level: 5,
        num_encounters: 3,
        difficulty_mix: ['easy', 'hard', 'deadly'],
      },
    });
    const text = getText(result);
    expect(text).toContain('easy');
    expect(text).toContain('hard');
    expect(text).toContain('deadly');
  });

  it('shows XP budget percentage', async () => {
    const result = await client.callTool({
      name: 'plan_adventuring_day',
      arguments: { party_size: 4, party_level: 5, num_encounters: 6 },
    });
    const text = getText(result);
    expect(text).toContain('%');
    expect(text).toContain('Daily Budget');
  });

  it('recommends short rest placement', async () => {
    const result = await client.callTool({
      name: 'plan_adventuring_day',
      arguments: { party_size: 4, party_level: 5, num_encounters: 6 },
    });
    const text = getText(result);
    expect(text).toContain('short rest');
  });
});
