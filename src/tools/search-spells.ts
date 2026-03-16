import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import type Database from 'better-sqlite3';
import { searchSpells } from '../data/db.js';
import type { SpellRow } from '../types.js';

function safeParseJson<T>(value: string | null): T | null {
  if (!value) return null;
  try {
    return JSON.parse(value) as T;
  } catch {
    return null;
  }
}

function levelLabel(level: number): string {
  if (level === 0) return 'Cantrip';
  const suffix =
    level === 1 ? 'st' : level === 2 ? 'nd' : level === 3 ? 'rd' : 'th';
  return `${level}${suffix}-level`;
}

function formatComponents(spell: SpellRow): string {
  const parts: string[] = [];
  if (spell.components_v) parts.push('V');
  if (spell.components_s) parts.push('S');
  if (spell.components_m) {
    const mat = spell.material_description
      ? `M (${spell.material_description})`
      : 'M';
    parts.push(mat);
  }
  return parts.join(', ');
}

function formatClasses(classesJson: string): string {
  const classes = safeParseJson<string[]>(classesJson);
  if (!classes) return classesJson;
  return classes.join(', ');
}

function formatSpell(spell: SpellRow): string {
  const lines: string[] = [];

  lines.push(`## ${spell.name}`);

  const schoolStr = spell.school.charAt(0).toUpperCase() + spell.school.slice(1);
  const levelStr = levelLabel(spell.level);
  const tags: string[] = [];
  if (spell.concentration) tags.push('concentration');
  if (spell.ritual) tags.push('ritual');
  const tagStr = tags.length > 0 ? ` (${tags.join(', ')})` : '';

  if (spell.level === 0) {
    lines.push(`*${schoolStr} cantrip${tagStr}*`);
  } else {
    lines.push(`*${levelStr} ${schoolStr.toLowerCase()}${tagStr}*`);
  }
  lines.push('');

  lines.push(`**Casting Time:** ${spell.casting_time}`);
  lines.push(`**Range:** ${spell.range}`);
  lines.push(`**Components:** ${formatComponents(spell)}`);
  lines.push(`**Duration:** ${spell.duration}`);
  lines.push('');

  lines.push(spell.description);

  if (spell.higher_level) {
    lines.push('');
    lines.push(`**At Higher Levels.** ${spell.higher_level}`);
  }

  if (spell.damage_type) {
    lines.push('');
    lines.push(`**Damage Type:** ${spell.damage_type}`);
  }

  if (spell.save_type) {
    lines.push(`**Save:** ${spell.save_type}`);
  }

  lines.push('');
  lines.push(`**Classes:** ${formatClasses(spell.classes)}`);

  return lines.join('\n');
}

export function registerSearchSpells(
  server: McpServer,
  db: Database.Database,
): void {
  server.registerTool(
    'search_spells',
    {
      description:
        'Search D&D 5e SRD spells by name, level, school, class, concentration, ritual, components, damage type, or save type.',
      inputSchema: {
        query: z.string().optional().describe('Search term for spell name or description'),
        level: z.number().min(0).max(9).optional().describe('Spell level (0 for cantrips, 1-9 for leveled spells)'),
        school: z.string().optional().describe('School of magic (e.g. "evocation", "necromancy")'),
        class_name: z.string().optional().describe('Spellcasting class (e.g. "Wizard", "Cleric")'),
        concentration: z.boolean().optional().describe('Filter by concentration requirement'),
        ritual: z.boolean().optional().describe('Filter by ritual casting'),
        has_material: z.boolean().optional().describe('Filter by material component requirement'),
        damage_type: z.string().optional().describe('Damage type (e.g. "fire", "necrotic", "radiant")'),
        save_type: z.string().optional().describe('Saving throw type (e.g. "DEX", "WIS", "CON")'),
        limit: z.number().min(1).max(50).default(10).describe('Results per page (max 50)'),
        offset: z.number().min(0).default(0).describe('Offset for pagination'),
      },
    },
    async ({
      query,
      level,
      school,
      class_name,
      concentration,
      ritual,
      has_material,
      damage_type,
      save_type,
      limit,
      offset,
    }) => {
      const result = searchSpells(db, {
        query,
        level,
        school,
        class_name,
        concentration,
        ritual,
        has_material,
        damage_type,
        save_type,
        limit,
        offset,
      });

      if (result.rows.length === 0) {
        return {
          content: [
            {
              type: 'text' as const,
              text: 'No spells found matching your criteria. Try a broader search — for example, remove some filters or use a partial name.',
            },
          ],
          isError: true,
        };
      }

      const start = (offset ?? 0) + 1;
      const end = (offset ?? 0) + result.rows.length;
      const header = `Found ${result.total} spell${result.total === 1 ? '' : 's'} (showing ${start}-${end})\n`;

      const spells = result.rows.map(formatSpell).join('\n\n---\n\n');

      return {
        content: [{ type: 'text' as const, text: header + '\n' + spells }],
      };
    },
  );
}
