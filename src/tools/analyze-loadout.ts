import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import type Database from 'better-sqlite3';
import { getEquipmentByName } from '../data/db.js';
import type { EquipmentRow } from '../types.js';

interface LoadoutItem {
  equipment: EquipmentRow;
  name: string;
}

function formatCost(costGp: number | null, costUnit: string | null): string {
  if (costGp === null) return '—';
  if (costUnit && costUnit !== 'gp') {
    return `${costGp} ${costUnit}`;
  }
  return `${costGp} gp`;
}

function calculateAc(items: LoadoutItem[]): string {
  let wornArmor: EquipmentRow | null = null;
  let hasShield = false;

  for (const item of items) {
    const eq = item.equipment;
    const cat = eq.category?.toLowerCase() ?? '';
    if (cat === 'shields' || cat === 'shield') {
      hasShield = true;
    } else if ((eq.ac_base !== null && eq.armor_category !== null) || cat.includes('armor')) {
      if (!wornArmor || (eq.ac_base ?? 0) > (wornArmor.ac_base ?? 0)) {
        wornArmor = eq;
      }
    }
  }

  if (!wornArmor && !hasShield) {
    return 'No armor equipped. Base AC = 10 + DEX modifier.';
  }

  const lines: string[] = [];

  if (wornArmor) {
    const base = wornArmor.ac_base ?? 10;
    const dexBonus = wornArmor.ac_dex_bonus ? true : false;
    const maxBonus = wornArmor.ac_max_bonus;

    let acFormula: string;
    if (!dexBonus) {
      acFormula = `${base}`;
    } else if (maxBonus !== null && maxBonus !== undefined) {
      acFormula = `${base} + DEX modifier (max ${maxBonus})`;
    } else {
      acFormula = `${base} + DEX modifier`;
    }

    lines.push(`**Armor:** ${wornArmor.name} — AC ${acFormula}`);

    if (wornArmor.stealth_disadvantage) {
      lines.push('  *Disadvantage on Stealth checks*');
    }
    if (wornArmor.str_minimum) {
      lines.push(`  *Requires STR ${wornArmor.str_minimum} (speed reduced by 10 ft. if not met)*`);
    }
  } else {
    lines.push('**Armor:** None (base AC = 10 + DEX modifier)');
  }

  if (hasShield) {
    lines.push('**Shield:** +2 AC');
  }

  // Calculate total
  const armorAc = wornArmor?.ac_base ?? 10;
  const shieldBonus = hasShield ? 2 : 0;
  const dexNote = wornArmor && !wornArmor.ac_dex_bonus
    ? ''
    : ' + DEX mod';
  const maxNote = wornArmor?.ac_max_bonus !== null && wornArmor?.ac_max_bonus !== undefined && wornArmor?.ac_dex_bonus
    ? ` (max ${wornArmor.ac_max_bonus})`
    : '';

  lines.push(`**Total AC:** ${armorAc + shieldBonus}${dexNote}${maxNote}`);

  return lines.join('\n');
}

export function registerAnalyzeLoadout(
  server: McpServer,
  db: Database.Database,
): void {
  server.registerTool(
    'analyze_loadout',
    {
      description:
        'Analyze a D&D 5e equipment loadout. Calculates total weight, total cost, AC from armor/shield, and encumbrance status based on Strength score.',
      inputSchema: {
        items: z
          .array(z.string())
          .min(1)
          .describe('List of equipment item names to analyze'),
        strength_score: z
          .number()
          .min(1)
          .max(30)
          .optional()
          .describe('Character Strength score for encumbrance calculation'),
      },
    },
    async ({ items, strength_score }) => {
      const found: LoadoutItem[] = [];
      const notFound: string[] = [];

      for (const name of items) {
        const eq = getEquipmentByName(db, name);
        if (eq) {
          found.push({ equipment: eq, name: eq.name });
        } else {
          notFound.push(name);
        }
      }

      const lines: string[] = [];
      lines.push('# Equipment Loadout Analysis');
      lines.push('');

      if (notFound.length > 0) {
        lines.push('## Unrecognized Items');
        lines.push('');
        lines.push('The following items were not found in the SRD equipment list. Use `search_equipment` to find the correct name.');
        for (const name of notFound) {
          lines.push(`- ~~${name}~~ *(not found)*`);
        }
        lines.push('');
      }

      if (found.length === 0) {
        lines.push('*No recognized equipment items to analyze.*');
        return {
          content: [{ type: 'text' as const, text: lines.join('\n') }],
        };
      }

      // Inventory table
      lines.push('## Inventory');
      lines.push('');
      lines.push('| Item | Category | Cost | Weight |');
      lines.push('|------|----------|------|--------|');

      let totalWeight = 0;
      let totalCostGp = 0;

      for (const item of found) {
        const eq = item.equipment;
        const weight = eq.weight ?? 0;
        const cost = eq.cost_gp ?? 0;
        totalWeight += weight;
        totalCostGp += cost;

        const weightStr = eq.weight !== null ? `${eq.weight} lb.` : '—';
        lines.push(`| ${eq.name} | ${eq.category ?? '—'} | ${formatCost(eq.cost_gp, eq.cost_unit)} | ${weightStr} |`);
      }

      lines.push('');
      lines.push(`**Total Weight:** ${totalWeight} lb.`);
      lines.push(`**Total Cost:** ${totalCostGp} gp`);
      lines.push('');

      // AC breakdown
      lines.push('## Armor Class');
      lines.push('');
      lines.push(calculateAc(found));
      lines.push('');

      // Weapons summary
      const weapons = found.filter(
        (item) => item.equipment.damage_dice !== null,
      );
      if (weapons.length > 0) {
        lines.push('## Weapons');
        lines.push('');
        for (const w of weapons) {
          const eq = w.equipment;
          const props = eq.weapon_properties ?? '';
          const rangeStr =
            eq.range_normal !== null
              ? ` (${eq.range_normal}/${eq.range_long ?? '—'} ft.)`
              : '';
          lines.push(
            `- **${eq.name}**: ${eq.damage_dice} ${eq.damage_type ?? ''}${rangeStr}${props ? ` — ${props}` : ''}`,
          );
        }
        lines.push('');
      }

      // Encumbrance
      if (strength_score !== undefined) {
        lines.push('## Encumbrance');
        lines.push('');
        const carryCapacity = strength_score * 15;
        const encumberedThreshold = strength_score * 5;
        const heavilyEncumberedThreshold = strength_score * 10;

        lines.push(`**Strength:** ${strength_score}`);
        lines.push(`**Carry Capacity:** ${carryCapacity} lb.`);
        lines.push(`**Current Load:** ${totalWeight} lb. (${Math.round((totalWeight / carryCapacity) * 100)}%)`);
        lines.push('');

        if (totalWeight > carryCapacity) {
          lines.push(`**Status: OVER CAPACITY** — Cannot move. Exceeds carry capacity by ${totalWeight - carryCapacity} lb.`);
        } else if (totalWeight > heavilyEncumberedThreshold) {
          lines.push(`**Status: HEAVILY ENCUMBERED** — Speed reduced by 20 ft. (threshold: ${heavilyEncumberedThreshold} lb.)`);
        } else if (totalWeight > encumberedThreshold) {
          lines.push(`**Status: ENCUMBERED** — Speed reduced by 10 ft. (threshold: ${encumberedThreshold} lb.)`);
        } else {
          lines.push(`**Status: Unencumbered** — No speed penalty.`);
        }

        lines.push('');
        lines.push('| Threshold | Weight | Status |');
        lines.push('|-----------|--------|--------|');
        lines.push(`| 0–${encumberedThreshold} lb. | Unencumbered | No penalty |`);
        lines.push(`| ${encumberedThreshold + 1}–${heavilyEncumberedThreshold} lb. | Encumbered | Speed −10 ft. |`);
        lines.push(`| ${heavilyEncumberedThreshold + 1}–${carryCapacity} lb. | Heavily Encumbered | Speed −20 ft. |`);
        lines.push(`| ${carryCapacity + 1}+ lb. | Over Capacity | Cannot move |`);
      }

      return {
        content: [{ type: 'text' as const, text: lines.join('\n') }],
      };
    },
  );
}
