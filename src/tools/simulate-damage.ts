import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import type Database from 'better-sqlite3';
import { parseDice, averageDice } from '../lib/dice.js';

export function registerSimulateDamage(
  server: McpServer,
  _db: Database.Database,
): void {
  server.registerTool(
    'simulate_damage',
    {
      description:
        'Calculate average damage per round (DPR) for an attack routine. Computes hit probability, critical hit chance, average damage, and turns to kill.',
      inputSchema: {
        attack_bonus: z.number().describe('Attack roll modifier (e.g. +7)'),
        damage_dice: z.string().describe('Damage dice notation (e.g. "2d6+5", "1d8+3")'),
        num_attacks: z.number().min(1).max(20).default(1).describe('Number of attacks per round'),
        target_ac: z.number().min(1).max(30).describe('Target Armor Class'),
        crit_range: z.number().min(1).max(20).default(20).describe('Minimum roll for critical hit (default 20)'),
        target_hp: z.number().positive().optional().describe('Target hit points (for turns-to-kill calculation)'),
        advantage: z.boolean().default(false).describe('Whether attacks have advantage'),
        disadvantage: z.boolean().default(false).describe('Whether attacks have disadvantage'),
      },
    },
    async ({ attack_bonus, damage_dice, num_attacks, target_ac, crit_range, target_hp, advantage, disadvantage }) => {
      let dice;
      try {
        dice = parseDice(damage_dice);
      } catch (e) {
        return {
          content: [{ type: 'text' as const, text: (e as Error).message }],
          isError: true,
        };
      }

      const neededRoll = target_ac - attack_bonus;
      let hitProb = Math.max(0.05, Math.min(0.95, (21 - neededRoll) / 20));
      let critProb = (21 - crit_range) / 20;

      if (advantage && !disadvantage) {
        hitProb = 1 - (1 - hitProb) ** 2;
        critProb = 1 - (1 - critProb) ** 2;
      } else if (disadvantage && !advantage) {
        hitProb = hitProb ** 2;
        critProb = critProb ** 2;
      }

      const avgDamage = averageDice(dice);
      const critBonusDamage = dice.count * (dice.sides + 1) / 2;

      const damagePerAttack = hitProb * avgDamage + critProb * critBonusDamage;
      const dpr = damagePerAttack * num_attacks;

      const lines: string[] = [];
      lines.push('# Damage Simulation');
      lines.push('');
      lines.push('## Attack Parameters');
      lines.push('');
      lines.push(`| Parameter | Value |`);
      lines.push(`|-----------|-------|`);
      lines.push(`| Attack Bonus | +${attack_bonus} |`);
      lines.push(`| Damage | ${damage_dice} (avg ${avgDamage.toFixed(1)}) |`);
      lines.push(`| Attacks/Round | ${num_attacks} |`);
      lines.push(`| Target AC | ${target_ac} |`);
      lines.push(`| Crit Range | ${crit_range}-20 |`);
      if (advantage) lines.push(`| Advantage | Yes |`);
      if (disadvantage) lines.push(`| Disadvantage | Yes |`);
      lines.push('');

      lines.push('## Results');
      lines.push('');
      lines.push(`| Metric | Value |`);
      lines.push(`|--------|-------|`);
      lines.push(`| Hit Probability | ${(hitProb * 100).toFixed(1)}% |`);
      lines.push(`| Crit Probability | ${(critProb * 100).toFixed(1)}% |`);
      lines.push(`| Avg Damage/Hit | ${avgDamage.toFixed(1)} |`);
      lines.push(`| Avg Damage/Attack | ${damagePerAttack.toFixed(1)} |`);
      lines.push(`| **DPR (total)** | **${dpr.toFixed(1)}** |`);

      if (target_hp) {
        const turnsToKill = Math.ceil(target_hp / dpr);
        lines.push(`| Target HP | ${target_hp} |`);
        lines.push(`| **Turns to Kill** | **${turnsToKill}** |`);
      }
      lines.push('');

      // Comparison: what if AC was different?
      lines.push('## AC Sensitivity');
      lines.push('');
      lines.push('| Target AC | Hit % | DPR |');
      lines.push('|-----------|-------|-----|');
      for (let ac = Math.max(1, target_ac - 3); ac <= Math.min(30, target_ac + 3); ac++) {
        const needed = ac - attack_bonus;
        let hp = Math.max(0.05, Math.min(0.95, (21 - needed) / 20));
        if (advantage && !disadvantage) hp = 1 - (1 - hp) ** 2;
        else if (disadvantage && !advantage) hp = hp ** 2;
        const d = (hp * avgDamage + critProb * critBonusDamage) * num_attacks;
        const marker = ac === target_ac ? ' ←' : '';
        lines.push(`| ${ac} | ${(hp * 100).toFixed(0)}% | ${d.toFixed(1)}${marker} |`);
      }

      return {
        content: [{ type: 'text' as const, text: lines.join('\n') }],
      };
    },
  );
}
