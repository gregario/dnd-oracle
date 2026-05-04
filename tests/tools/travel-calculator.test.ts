import { describe, it, expect, beforeAll } from 'vitest';
import { createTestClient } from '../helpers/test-db.js';
import type { Client } from '@modelcontextprotocol/sdk/client/index.js';

function getText(result: { content: unknown[] }): string {
  return (result.content[0] as { type: 'text'; text: string }).text;
}

describe('travel_calculator tool', () => {
  let client: Client;

  beforeAll(async () => {
    client = await createTestClient();
  });

  it('calculates normal pace travel time', async () => {
    const result = await client.callTool({
      name: 'travel_calculator',
      arguments: { distance_miles: 48, pace: 'normal', terrain: 'normal' },
    });
    const text = getText(result);
    // 48 miles / 24 miles per day = 2 days
    expect(text).toContain('2');
    expect(text).toContain('3 mph');
  });

  it('doubles time for difficult terrain', async () => {
    const result = await client.callTool({
      name: 'travel_calculator',
      arguments: { distance_miles: 48, pace: 'normal', terrain: 'difficult' },
    });
    const text = getText(result);
    // 48 miles / 12 miles per day (difficult) = 4 days
    expect(text).toContain('4');
    expect(text).toContain('1.5 mph');
  });

  it('shows fast pace perception penalty', async () => {
    const result = await client.callTool({
      name: 'travel_calculator',
      arguments: { distance_miles: 30, pace: 'fast' },
    });
    const text = getText(result);
    expect(text).toContain('-5');
    expect(text).toContain('Perception');
  });

  it('shows forced march rules for extended travel', async () => {
    const result = await client.callTool({
      name: 'travel_calculator',
      arguments: { distance_miles: 30, pace: 'normal', hours_per_day: 10 },
    });
    const text = getText(result);
    expect(text).toContain('Forced March');
    expect(text).toContain('DC 11');
    expect(text).toContain('DC 12');
  });

  it('shows mounted travel bonus', async () => {
    const result = await client.callTool({
      name: 'travel_calculator',
      arguments: { distance_miles: 30, pace: 'normal', mounted: true },
    });
    const text = getText(result);
    expect(text).toContain('Mounted');
    expect(text).toContain('gallop');
  });
});
