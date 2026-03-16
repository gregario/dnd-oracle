import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import type Database from 'better-sqlite3';
import { getMonstersByCrRange, getXpForCr, CR_XP_TABLE, crToNumeric } from '../data/db.js';
import type { MonsterRow } from '../types.js';

const XP_THRESHOLDS: Record<number, { easy: number; medium: number; hard: number; deadly: number }> = {
  1: { easy: 25, medium: 50, hard: 75, deadly: 100 },
  2: { easy: 50, medium: 100, hard: 150, deadly: 200 },
  3: { easy: 75, medium: 150, hard: 225, deadly: 400 },
  4: { easy: 125, medium: 250, hard: 375, deadly: 500 },
  5: { easy: 250, medium: 500, hard: 750, deadly: 1100 },
  6: { easy: 300, medium: 600, hard: 900, deadly: 1400 },
  7: { easy: 350, medium: 750, hard: 1100, deadly: 1700 },
  8: { easy: 450, medium: 900, hard: 1400, deadly: 2100 },
  9: { easy: 550, medium: 1100, hard: 1600, deadly: 2400 },
  10: { easy: 600, medium: 1200, hard: 1900, deadly: 2800 },
  11: { easy: 800, medium: 1600, hard: 2400, deadly: 3600 },
  12: { easy: 1000, medium: 2000, hard: 3000, deadly: 4500 },
  13: { easy: 1100, medium: 2200, hard: 3400, deadly: 5100 },
  14: { easy: 1250, medium: 2500, hard: 3800, deadly: 5700 },
  15: { easy: 1400, medium: 2800, hard: 4300, deadly: 6400 },
  16: { easy: 1600, medium: 3200, hard: 4800, deadly: 7200 },
  17: { easy: 2000, medium: 3900, hard: 5900, deadly: 8800 },
  18: { easy: 2100, medium: 4200, hard: 6300, deadly: 9500 },
  19: { easy: 2400, medium: 4900, hard: 7300, deadly: 10900 },
  20: { easy: 2800, medium: 5700, hard: 8500, deadly: 12700 },
};

type Difficulty = 'easy' | 'medium' | 'hard' | 'deadly';
const DIFFICULTIES: Difficulty[] = ['easy', 'medium', 'hard', 'deadly'];

function getEncounterMultiplier(monsterCount: number): number {
  if (monsterCount <= 1) return 1;
  if (monsterCount === 2) return 1.5;
  if (monsterCount <= 6) return 2;
  if (monsterCount <= 10) return 2.5;
  if (monsterCount <= 14) return 3;
  return 4;
}

function calculatePartyBudget(
  partySize: number,
  partyLevel: number,
): Record<Difficulty, number> {
  const thresholds = XP_THRESHOLDS[partyLevel];
  return {
    easy: thresholds.easy * partySize,
    medium: thresholds.medium * partySize,
    hard: thresholds.hard * partySize,
    deadly: thresholds.deadly * partySize,
  };
}

interface MonsterGroup {
  monsters: { name: string; cr: string; xp: number; count: number }[];
  totalXp: number;
  adjustedXp: number;
  monsterCount: number;
}

function findMonsterGroups(
  monsters: MonsterRow[],
  budget: number,
  maxGroups: number,
): MonsterGroup[] {
  const groups: MonsterGroup[] = [];

  // Strategy 1: Single strong monster
  for (const m of monsters) {
    const xp = getXpForCr(m.cr);
    const adjusted = xp * getEncounterMultiplier(1);
    if (adjusted <= budget && adjusted >= budget * 0.6) {
      groups.push({
        monsters: [{ name: m.name, cr: m.cr, xp, count: 1 }],
        totalXp: xp,
        adjustedXp: adjusted,
        monsterCount: 1,
      });
      if (groups.length >= maxGroups) return groups;
    }
  }

  // Strategy 2: Pairs of the same monster
  for (const m of monsters) {
    const xp = getXpForCr(m.cr);
    const count = 2;
    const total = xp * count;
    const adjusted = total * getEncounterMultiplier(count);
    if (adjusted <= budget && adjusted >= budget * 0.6) {
      groups.push({
        monsters: [{ name: m.name, cr: m.cr, xp, count }],
        totalXp: total,
        adjustedXp: adjusted,
        monsterCount: count,
      });
      if (groups.length >= maxGroups) return groups;
    }
  }

  // Strategy 3: Small groups (3-5)
  for (const m of monsters) {
    const xp = getXpForCr(m.cr);
    for (const count of [3, 4, 5]) {
      const total = xp * count;
      const adjusted = total * getEncounterMultiplier(count);
      if (adjusted <= budget && adjusted >= budget * 0.5) {
        groups.push({
          monsters: [{ name: m.name, cr: m.cr, xp, count }],
          totalXp: total,
          adjustedXp: adjusted,
          monsterCount: count,
        });
        if (groups.length >= maxGroups) return groups;
      }
    }
  }

  // Strategy 4: Mixed groups — one strong + weaker minions
  const sortedByXp = [...monsters].sort(
    (a, b) => crToNumeric(b.cr) - crToNumeric(a.cr),
  );
  const weakMonsters = monsters.filter((m) => crToNumeric(m.cr) <= crToNumeric(sortedByXp[0]?.cr ?? '0') * 0.5);

  for (const leader of sortedByXp.slice(0, 5)) {
    const leaderXp = getXpForCr(leader.cr);
    for (const minion of weakMonsters.slice(0, 5)) {
      if (minion.name === leader.name) continue;
      const minionXp = getXpForCr(minion.cr);
      for (const minionCount of [2, 3, 4]) {
        const totalCount = 1 + minionCount;
        const totalXp = leaderXp + minionXp * minionCount;
        const adjusted = totalXp * getEncounterMultiplier(totalCount);
        if (adjusted <= budget && adjusted >= budget * 0.5) {
          groups.push({
            monsters: [
              { name: leader.name, cr: leader.cr, xp: leaderXp, count: 1 },
              { name: minion.name, cr: minion.cr, xp: minionXp, count: minionCount },
            ],
            totalXp,
            adjustedXp: adjusted,
            monsterCount: totalCount,
          });
          if (groups.length >= maxGroups) return groups;
        }
      }
    }
  }

  return groups;
}

function formatGroup(group: MonsterGroup): string {
  const monsterLines = group.monsters.map((m) => {
    const countStr = m.count > 1 ? `${m.count}× ` : '';
    return `  - ${countStr}**${m.name}** (CR ${m.cr}, ${m.xp.toLocaleString()} XP each)`;
  });
  return [
    ...monsterLines,
    `  - *Raw XP:* ${group.totalXp.toLocaleString()} | *Adjusted XP (×${getEncounterMultiplier(group.monsterCount)}):* ${group.adjustedXp.toLocaleString()}`,
  ].join('\n');
}

export function registerBuildEncounter(
  server: McpServer,
  db: Database.Database,
): void {
  server.registerTool(
    'build_encounter',
    {
      description:
        'Build balanced D&D 5e encounters. Given party size and level, calculates XP budgets for each difficulty and suggests monster combinations.',
      inputSchema: {
        party_size: z.number().min(1).max(10).describe('Number of party members (1-10)'),
        party_level: z.number().min(1).max(20).describe('Average party level (1-20)'),
        difficulty: z
          .enum(['easy', 'medium', 'hard', 'deadly'])
          .optional()
          .describe('Target difficulty. If omitted, shows budgets and suggestions for all difficulties.'),
        monster_cr_min: z
          .number()
          .optional()
          .describe('Minimum monster CR to consider (numeric, e.g. 0.25 for 1/4)'),
        monster_cr_max: z
          .number()
          .optional()
          .describe('Maximum monster CR to consider (numeric)'),
      },
    },
    async ({ party_size, party_level, difficulty, monster_cr_min, monster_cr_max }) => {
      const budgets = calculatePartyBudget(party_size, party_level);

      const crMin = monster_cr_min ?? 0;
      const crMax = monster_cr_max ?? party_level + 3;
      const monsters = getMonstersByCrRange(db, crMin, crMax);

      const lines: string[] = [];
      lines.push(`# Encounter Builder`);
      lines.push('');
      lines.push(`**Party:** ${party_size} characters at level ${party_level}`);
      lines.push(`**Monster CR range:** ${crMin}–${crMax}`);
      lines.push('');

      // XP budget table
      lines.push('## XP Budgets');
      lines.push('');
      lines.push('| Difficulty | XP Budget |');
      lines.push('|------------|-----------|');
      for (const d of DIFFICULTIES) {
        const marker = difficulty === d ? ' ←' : '';
        lines.push(`| ${d.charAt(0).toUpperCase() + d.slice(1)} | ${budgets[d].toLocaleString()} XP${marker} |`);
      }
      lines.push('');

      if (monsters.length === 0) {
        lines.push('*No SRD monsters found in the specified CR range.*');
        return {
          content: [{ type: 'text' as const, text: lines.join('\n') }],
        };
      }

      // Suggest groups for target difficulties
      const targetDifficulties: Difficulty[] = difficulty ? [difficulty] : DIFFICULTIES;

      for (const d of targetDifficulties) {
        const budget = budgets[d];
        lines.push(`## ${d.charAt(0).toUpperCase() + d.slice(1)} Encounters (${budget.toLocaleString()} XP)`);
        lines.push('');

        const groups = findMonsterGroups(monsters, budget, 5);
        if (groups.length === 0) {
          lines.push('*No suitable monster combinations found for this budget and CR range. Try widening the CR range.*');
        } else {
          groups.forEach((group, i) => {
            lines.push(`**Option ${i + 1}:**`);
            lines.push(formatGroup(group));
            lines.push('');
          });
        }
        lines.push('');
      }

      lines.push('---');
      lines.push('*Adjusted XP uses DMG encounter multipliers based on monster count. The actual difficulty may vary based on terrain, tactics, and party composition.*');

      return {
        content: [{ type: 'text' as const, text: lines.join('\n') }],
      };
    },
  );
}
