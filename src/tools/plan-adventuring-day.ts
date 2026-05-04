import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import type Database from 'better-sqlite3';
import { type Difficulty, DIFFICULTIES, ADVENTURING_DAY_XP, calculatePartyBudget } from '../lib/encounter-math.js';

export function registerPlanAdventuringDay(
  server: McpServer,
  _db: Database.Database,
): void {
  server.registerTool(
    'plan_adventuring_day',
    {
      description:
        'Plan a full D&D 5e adventuring day. Calculates the daily XP budget, suggests encounter difficulty distribution, and recommends short rest placement.',
      inputSchema: {
        party_size: z.number().min(1).max(10).describe('Number of party members'),
        party_level: z.number().min(1).max(20).describe('Average party level'),
        num_encounters: z.number().min(1).max(12).default(6).describe('Planned number of encounters'),
        difficulty_mix: z
          .array(z.enum(['easy', 'medium', 'hard', 'deadly']))
          .optional()
          .describe('Specific difficulty for each encounter (length must match num_encounters). If omitted, defaults to a balanced mix.'),
      },
    },
    async ({ party_size, party_level, num_encounters, difficulty_mix }) => {
      const dailyBudgetPerPlayer = ADVENTURING_DAY_XP[party_level] ?? 0;
      const totalDailyBudget = dailyBudgetPerPlayer * party_size;
      const budgets = calculatePartyBudget(party_size, party_level);

      const lines: string[] = [];
      lines.push('# Adventuring Day Plan');
      lines.push('');
      lines.push(`**Party:** ${party_size} characters at level ${party_level}`);
      lines.push(`**Daily XP Budget:** ${totalDailyBudget.toLocaleString()} XP`);
      lines.push(`**Planned Encounters:** ${num_encounters}`);
      lines.push('');

      // Per-encounter budget reference
      lines.push('## Encounter Difficulty Thresholds');
      lines.push('');
      lines.push('| Difficulty | XP per Encounter |');
      lines.push('|------------|-----------------|');
      for (const d of DIFFICULTIES) {
        lines.push(`| ${d.charAt(0).toUpperCase() + d.slice(1)} | ${budgets[d].toLocaleString()} |`);
      }
      lines.push('');

      // Build the difficulty sequence
      let encounterDifficulties: Difficulty[];
      if (difficulty_mix && difficulty_mix.length === num_encounters) {
        encounterDifficulties = difficulty_mix as Difficulty[];
      } else {
        encounterDifficulties = generateBalancedMix(num_encounters, totalDailyBudget, budgets);
      }

      // Calculate XP usage
      let totalXpUsed = 0;
      const encounterXps = encounterDifficulties.map((d) => budgets[d]);
      for (const xp of encounterXps) totalXpUsed += xp;

      lines.push('## Encounter Sequence');
      lines.push('');
      lines.push('| # | Difficulty | XP Budget | Cumulative | % Daily Budget |');
      lines.push('|---|-----------|-----------|-----------|----------------|');

      let cumulative = 0;
      const restPoints: number[] = [];
      for (let i = 0; i < num_encounters; i++) {
        cumulative += encounterXps[i];
        const pct = Math.round((cumulative / totalDailyBudget) * 100);
        const shouldRest = i > 0 && i < num_encounters - 1 && (i + 1) % Math.ceil(num_encounters / 3) === 0;
        const restMarker = shouldRest ? ' ← short rest' : '';
        if (shouldRest) restPoints.push(i + 1);
        lines.push(`| ${i + 1} | ${encounterDifficulties[i]} | ${encounterXps[i].toLocaleString()} | ${cumulative.toLocaleString()} | ${pct}%${restMarker} |`);
      }
      lines.push('');

      const budgetUsage = Math.round((totalXpUsed / totalDailyBudget) * 100);
      lines.push(`**Total XP:** ${totalXpUsed.toLocaleString()} / ${totalDailyBudget.toLocaleString()} (${budgetUsage}% of daily budget)`);
      lines.push('');

      if (budgetUsage > 110) {
        lines.push('**⚠ Over budget** — this day may be too deadly. Consider removing an encounter or dropping difficulty.');
      } else if (budgetUsage < 60) {
        lines.push('**Note:** Under budget — the party will have resources to spare. Consider adding an encounter or increasing difficulty.');
      }
      lines.push('');

      // Rest placement
      lines.push('## Rest Placement');
      lines.push('');
      lines.push('The DMG recommends **2 short rests** per adventuring day (between the long rests).');
      lines.push('');
      if (restPoints.length > 0) {
        lines.push(`**Suggested short rests:** After encounter${restPoints.length > 1 ? 's' : ''} ${restPoints.join(' and ')}`);
      } else if (num_encounters <= 3) {
        lines.push('With only ' + num_encounters + ' encounters, one short rest after encounter 1 or 2 is sufficient.');
      } else {
        const r1 = Math.ceil(num_encounters / 3);
        const r2 = Math.ceil((num_encounters * 2) / 3);
        lines.push(`**Suggested short rests:** After encounters ${r1} and ${r2}`);
      }
      lines.push('');

      // Resource pacing
      lines.push('## Resource Pacing Estimate');
      lines.push('');
      lines.push('| After Encounter | Spell Slots Used | HP Lost (est.) |');
      lines.push('|-----------------|-----------------|----------------|');
      for (let i = 0; i < num_encounters; i++) {
        const pct = Math.round(((i + 1) / num_encounters) * 100);
        const slotPct = Math.min(100, Math.round(pct * 1.1));
        const hpPct = Math.min(100, Math.round(pct * 0.9));
        lines.push(`| ${i + 1} | ~${slotPct}% | ~${hpPct}% |`);
      }
      lines.push('');
      lines.push('*Estimates assume even resource expenditure. Actual usage varies with difficulty spikes and player choices.*');

      return {
        content: [{ type: 'text' as const, text: lines.join('\n') }],
      };
    },
  );
}

function generateBalancedMix(
  numEncounters: number,
  dailyBudget: number,
  budgets: Record<Difficulty, number>,
): Difficulty[] {
  // Standard adventuring day pattern: escalating difficulty
  // Start easy/medium, build to hard, end with deadly or hard
  if (numEncounters <= 2) {
    return numEncounters === 1 ? ['hard'] : ['medium', 'hard'];
  }
  if (numEncounters === 3) {
    return ['medium', 'hard', 'deadly'];
  }

  const mix: Difficulty[] = [];
  const budgetPerEncounter = dailyBudget / numEncounters;

  for (let i = 0; i < numEncounters; i++) {
    const progress = i / (numEncounters - 1);
    if (progress < 0.25) {
      mix.push(budgetPerEncounter >= budgets.medium ? 'medium' : 'easy');
    } else if (progress < 0.6) {
      mix.push('medium');
    } else if (progress < 0.85) {
      mix.push('hard');
    } else {
      mix.push(budgetPerEncounter >= budgets.deadly * 0.8 ? 'deadly' : 'hard');
    }
  }

  return mix;
}
