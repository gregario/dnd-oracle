import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import type Database from 'better-sqlite3';

const PACE_DATA = {
  slow: { mph: 2, milesPerDay: 18, effect: 'Able to use Stealth' },
  normal: { mph: 3, milesPerDay: 24, effect: 'No special benefit or penalty' },
  fast: { mph: 4, milesPerDay: 30, effect: '-5 penalty to passive Perception' },
} as const;

export function registerTravelCalculator(
  server: McpServer,
  _db: Database.Database,
): void {
  server.registerTool(
    'travel_calculator',
    {
      description:
        'Calculate D&D 5e overland travel time, pace effects, and forced march consequences. Uses SRD travel rules for pace, terrain, and exhaustion.',
      inputSchema: {
        distance_miles: z.number().positive().describe('Distance to travel in miles'),
        pace: z.enum(['slow', 'normal', 'fast']).default('normal').describe('Travel pace'),
        terrain: z.enum(['normal', 'difficult']).default('normal').describe('Terrain type (difficult terrain halves speed)'),
        mounted: z.boolean().default(false).describe('Whether the party is mounted (gallop available for 1 hour)'),
        hours_per_day: z.number().min(1).max(24).default(8).describe('Hours of travel per day (forced march beyond 8)'),
      },
    },
    async ({ distance_miles, pace, terrain, mounted, hours_per_day }) => {
      const paceInfo = PACE_DATA[pace];
      let effectiveMph = paceInfo.mph;

      if (terrain === 'difficult') {
        effectiveMph /= 2;
      }

      let effectiveMilesPerDay: number;
      if (hours_per_day <= 8) {
        effectiveMilesPerDay = effectiveMph * hours_per_day;
      } else {
        effectiveMilesPerDay = effectiveMph * 8;
        const extraHours = hours_per_day - 8;
        effectiveMilesPerDay += effectiveMph * extraHours;
      }

      if (mounted) {
        effectiveMilesPerDay += effectiveMph;
      }

      const totalHours = distance_miles / effectiveMph;
      const totalDays = Math.ceil(distance_miles / effectiveMilesPerDay);

      const lines: string[] = [];
      lines.push('# Travel Calculator');
      lines.push('');
      lines.push('## Parameters');
      lines.push('');
      lines.push(`| Parameter | Value |`);
      lines.push(`|-----------|-------|`);
      lines.push(`| Distance | ${distance_miles} miles |`);
      lines.push(`| Pace | ${pace} |`);
      lines.push(`| Terrain | ${terrain} |`);
      lines.push(`| Mounted | ${mounted ? 'Yes' : 'No'} |`);
      lines.push(`| Hours/Day | ${hours_per_day} |`);
      lines.push('');

      lines.push('## Results');
      lines.push('');
      lines.push(`| Metric | Value |`);
      lines.push(`|--------|-------|`);
      lines.push(`| Speed | ${effectiveMph} mph |`);
      lines.push(`| Miles/Day | ${effectiveMilesPerDay} |`);
      lines.push(`| Total Travel Time | ${totalHours.toFixed(1)} hours |`);
      lines.push(`| **Days Required** | **${totalDays}** |`);
      lines.push('');

      lines.push('## Pace Effects');
      lines.push('');
      lines.push(`| Pace | Speed | Effect |`);
      lines.push(`|------|-------|--------|`);
      for (const [p, data] of Object.entries(PACE_DATA)) {
        const marker = p === pace ? ' ←' : '';
        const terrainNote = terrain === 'difficult' ? ` (${data.mph / 2} in difficult)` : '';
        lines.push(`| ${p} | ${data.mph} mph${terrainNote} | ${data.effect}${marker} |`);
      }
      lines.push('');

      // Forced march rules
      if (hours_per_day > 8) {
        const extraHours = hours_per_day - 8;
        lines.push('## Forced March');
        lines.push('');
        lines.push(`Traveling beyond 8 hours requires a Constitution saving throw at the end of each extra hour.`);
        lines.push('');
        lines.push('| Hour | Save DC | On Failure |');
        lines.push('|------|---------|------------|');
        for (let h = 1; h <= extraHours; h++) {
          lines.push(`| ${8 + h} | DC ${10 + h} | 1 level of exhaustion |`);
        }
        lines.push('');
        lines.push('*Exhaustion stacks. Level 1 = disadvantage on ability checks. Level 6 = death.*');
        lines.push('');
      }

      // Mounted gallop note
      if (mounted) {
        lines.push('## Mounted Travel');
        lines.push('');
        lines.push('A mount can gallop (double speed) for 1 hour, adding extra distance.');
        lines.push(`Gallop bonus: +${effectiveMph} miles on the first day.`);
        lines.push('After galloping, the mount must rest for 1 hour or risk exhaustion.');
        lines.push('');
      }

      // Navigation and encounters
      lines.push('## Navigation');
      lines.push('');
      lines.push('| Terrain | Navigation DC | Getting Lost |');
      lines.push('|---------|--------------|--------------|');
      lines.push('| Road/Path | — | Cannot get lost |');
      lines.push('| Open terrain | DC 10 | 1d6 miles off course |');
      lines.push('| Forest/Hills | DC 15 | 1d6 miles off course |');
      lines.push('| Mountains/Swamp | DC 18 | 1d6 miles off course |');
      lines.push('| Desert/Arctic | DC 20 | 1d6 miles off course |');

      return {
        content: [{ type: 'text' as const, text: lines.join('\n') }],
      };
    },
  );
}
