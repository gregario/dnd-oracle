import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import type Database from 'better-sqlite3';
import { searchEquipment } from '../data/db.js';
import type { EquipmentRow, MagicItemRow } from '../types.js';

function safeParseJson<T>(value: string | null): T | null {
  if (!value) return null;
  try {
    return JSON.parse(value) as T;
  } catch {
    return null;
  }
}

function formatCost(costGp: number | null, costUnit: string | null): string {
  if (costGp === null || costGp === undefined) return 'N/A';
  if (costUnit) return `${costGp} ${costUnit}`;
  if (costGp >= 1) return `${costGp} gp`;
  if (costGp >= 0.1) return `${Math.round(costGp * 10)} sp`;
  return `${Math.round(costGp * 100)} cp`;
}

function formatWeaponProperties(propsJson: string | null): string {
  const props = safeParseJson<string[]>(propsJson);
  if (!props || props.length === 0) return '';
  return props.join(', ');
}

function formatArmorAc(item: EquipmentRow): string {
  if (item.ac_base === null) return '';
  let ac = `${item.ac_base}`;
  if (item.ac_dex_bonus) {
    ac += item.ac_max_bonus !== null ? ` + DEX (max ${item.ac_max_bonus})` : ' + DEX';
  }
  return ac;
}

function isEquipmentRow(item: EquipmentRow | MagicItemRow): item is EquipmentRow {
  return 'category' in item;
}

function formatEquipmentItem(item: EquipmentRow | MagicItemRow): string {
  if (!isEquipmentRow(item)) {
    return formatMagicItem(item);
  }

  const lines: string[] = [];
  lines.push(`## ${item.name}`);
  lines.push(`*${item.category}*`);
  lines.push('');

  const details: string[] = [];

  const cost = formatCost(item.cost_gp, item.cost_unit);
  if (cost !== 'N/A') details.push(`**Cost:** ${cost}`);
  if (item.weight !== null) details.push(`**Weight:** ${item.weight} lb.`);

  // Weapon details
  if (item.damage_dice) {
    let dmg = item.damage_dice;
    if (item.damage_type) dmg += ` ${item.damage_type}`;
    details.push(`**Damage:** ${dmg}`);
  }
  if (item.weapon_range) {
    let rangeStr = item.weapon_range;
    if (item.range_normal !== null) {
      rangeStr += ` (${item.range_normal}`;
      if (item.range_long !== null) rangeStr += `/${item.range_long}`;
      rangeStr += ' ft.)';
    }
    details.push(`**Range:** ${rangeStr}`);
  }
  const props = formatWeaponProperties(item.weapon_properties);
  if (props) details.push(`**Properties:** ${props}`);

  // Armor details
  if (item.armor_category) {
    details.push(`**Armor Type:** ${item.armor_category}`);
    const ac = formatArmorAc(item);
    if (ac) details.push(`**AC:** ${ac}`);
    if (item.stealth_disadvantage) details.push('**Stealth:** Disadvantage');
    if (item.str_minimum) details.push(`**Strength Required:** ${item.str_minimum}`);
  }

  lines.push(details.join('\n'));

  if (item.description) {
    lines.push('');
    lines.push(item.description);
  }

  return lines.join('\n');
}

function formatMagicItem(item: MagicItemRow): string {
  const lines: string[] = [];

  lines.push(`## ${item.name}`);

  const tags: string[] = [item.type, item.rarity];
  if (item.requires_attunement) {
    const attuneStr = item.attunement_description
      ? `requires attunement ${item.attunement_description}`
      : 'requires attunement';
    tags.push(attuneStr);
  }
  lines.push(`*${tags.join(', ')}*`);
  lines.push('');
  lines.push(item.description);

  return lines.join('\n');
}

export function registerSearchEquipment(
  server: McpServer,
  db: Database.Database,
): void {
  server.registerTool(
    'search_equipment',
    {
      description:
        'Search D&D 5e SRD equipment, weapons, armor, and magic items. Filter by category, cost, weight, weapon properties, armor type, or rarity.',
      inputSchema: {
        query: z.string().optional().describe('Search term for item name or description'),
        category: z
          .string()
          .optional()
          .describe('Equipment category (e.g. "Weapon", "Armor", "Adventuring Gear", "Tools")'),
        cost_min: z.number().optional().describe('Minimum cost in gold pieces'),
        cost_max: z.number().optional().describe('Maximum cost in gold pieces'),
        weight_max: z.number().optional().describe('Maximum weight in pounds'),
        weapon_property: z
          .string()
          .optional()
          .describe('Weapon property (e.g. "finesse", "heavy", "two-handed", "versatile")'),
        armor_category: z
          .string()
          .optional()
          .describe('Armor category (e.g. "Light", "Medium", "Heavy", "Shield")'),
        rarity: z
          .string()
          .optional()
          .describe('Magic item rarity (e.g. "common", "uncommon", "rare", "very rare", "legendary")'),
        limit: z.number().min(1).max(50).default(10).describe('Results per page (max 50)'),
        offset: z.number().min(0).default(0).describe('Offset for pagination'),
      },
    },
    async ({
      query,
      category,
      cost_min,
      cost_max,
      weight_max,
      weapon_property,
      armor_category,
      rarity,
      limit,
      offset,
    }) => {
      const result = searchEquipment(db, {
        query,
        category,
        cost_min,
        cost_max,
        weight_max,
        weapon_property,
        armor_category,
        rarity,
        limit,
        offset,
      });

      if (result.rows.length === 0) {
        return {
          content: [
            {
              type: 'text' as const,
              text: 'No equipment found matching your criteria. Try a broader search — for example, remove some filters or use a partial name.',
            },
          ],
          isError: true,
        };
      }

      const start = (offset ?? 0) + 1;
      const end = (offset ?? 0) + result.rows.length;
      const header = `Found ${result.total} item${result.total === 1 ? '' : 's'} (showing ${start}-${end})\n`;

      const items = result.rows.map(formatEquipmentItem).join('\n\n---\n\n');

      return {
        content: [{ type: 'text' as const, text: header + '\n' + items }],
      };
    },
  );
}
