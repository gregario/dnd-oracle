import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import type Database from 'better-sqlite3';
import { getClassByName, getSpellsByClassAndLevel, getSpellByName } from '../data/db.js';
import type { SpellRow } from '../types.js';
import { getMaxSpellLevel, getSpellSlots, FULL_CASTERS, HALF_CASTERS } from '../lib/class-mechanics.js';

function extractCostFromMaterial(desc: string | null): number | null {
  if (!desc) return null;
  // Match patterns like "worth at least 50 gp", "worth 100 gp", "50 gp"
  const match = desc.match(/(\d[\d,]*)\s*gp/i);
  if (match) {
    return parseInt(match[1].replace(/,/g, ''), 10);
  }
  return null;
}

function formatComponents(spell: SpellRow): string {
  const parts: string[] = [];
  if (spell.components_v) parts.push('V');
  if (spell.components_s) parts.push('S');
  if (spell.components_m) {
    const matDesc = spell.material_description ? ` (${spell.material_description})` : '';
    parts.push(`M${matDesc}`);
  }
  return parts.join(', ');
}

export function registerPlanSpells(
  server: McpServer,
  db: Database.Database,
): void {
  server.registerTool(
    'plan_spells',
    {
      description:
        'Plan spells for a D&D 5e character. Shows available spells for a class at a given level, tracks spell slots, flags concentration conflicts, highlights rituals, and sums material component costs.',
      inputSchema: {
        class_name: z.string().describe('Spellcasting class name (e.g. "Wizard", "Cleric")'),
        level: z.number().min(1).max(20).describe('Character level (1-20)'),
        prepared_spells: z
          .array(z.string())
          .optional()
          .describe('List of spell names you plan to prepare. If provided, analyzes conflicts and costs.'),
        remaining_slots: z
          .record(z.string(), z.number())
          .optional()
          .describe('Remaining spell slots as an object mapping spell level (string) to count, e.g. {"1": 3, "2": 1}'),
      },
    },
    async ({ class_name, level, prepared_spells, remaining_slots }) => {
      const classRow = getClassByName(db, class_name);
      if (!classRow) {
        return {
          content: [{ type: 'text' as const, text: `Class "${class_name}" not found in the SRD. Available classes include: Bard, Cleric, Druid, Paladin, Ranger, Sorcerer, Warlock, Wizard.` }],
          isError: true,
        };
      }

      if (!classRow.spellcasting_ability) {
        return {
          content: [{ type: 'text' as const, text: `${classRow.name} is not a spellcasting class (no spellcasting ability). Non-caster classes like Fighter and Barbarian do not have spell lists.` }],
          isError: true,
        };
      }

      const maxSpellLevel = getMaxSpellLevel(classRow.name, level);
      if (maxSpellLevel === 0) {
        return {
          content: [{ type: 'text' as const, text: `${classRow.name} does not have spell slots at level ${level}. ${HALF_CASTERS.has(classRow.name.toLowerCase()) ? 'Half casters gain spellcasting at level 2.' : ''}` }],
          isError: true,
        };
      }

      const spells = getSpellsByClassAndLevel(db, classRow.name, maxSpellLevel);
      const slots = getSpellSlots(classRow.name, level);

      const lines: string[] = [];
      lines.push(`# Spell Planning: ${classRow.name} Level ${level}`);
      lines.push('');
      lines.push(`**Spellcasting Ability:** ${classRow.spellcasting_ability}`);
      lines.push(`**Max Spell Level:** ${maxSpellLevel}`);
      lines.push(`**Available SRD Spells:** ${spells.length}`);
      lines.push('');

      // Spell slot table
      lines.push('## Spell Slots');
      lines.push('');
      if (slots.length > 0) {
        const headerCells = slots.map((_, i) => `${i + 1}st${i === 0 ? '' : i === 1 ? '' : ''}`.replace(/1st$/, '1st').replace(/2st$/, '2nd').replace(/3st$/, '3rd'));
        const levelLabels = slots.map((_, i) => {
          const n = i + 1;
          if (n === 1) return '1st';
          if (n === 2) return '2nd';
          if (n === 3) return '3rd';
          return `${n}th`;
        });
        lines.push('| ' + levelLabels.join(' | ') + ' |');
        lines.push('| ' + slots.map(() => '---').join(' | ') + ' |');

        if (remaining_slots) {
          const totalRow = slots.map((s) => `${s}`);
          const remainRow = slots.map((s, i) => {
            const key = `${i + 1}`;
            const rem = remaining_slots[key] ?? s;
            return `${rem}/${s}`;
          });
          lines.push('| ' + totalRow.join(' | ') + ' | *(Total)*');
          lines.push('| ' + remainRow.join(' | ') + ' | *(Remaining)*');
        } else {
          lines.push('| ' + slots.join(' | ') + ' |');
        }
      }
      lines.push('');

      // Available spells by level
      lines.push('## Available Spells by Level');
      lines.push('');
      const spellsByLevel = new Map<number, SpellRow[]>();
      for (const spell of spells) {
        const list = spellsByLevel.get(spell.level) ?? [];
        list.push(spell);
        spellsByLevel.set(spell.level, list);
      }

      for (let lvl = 0; lvl <= maxSpellLevel; lvl++) {
        const levelSpells = spellsByLevel.get(lvl);
        if (!levelSpells || levelSpells.length === 0) continue;
        const label = lvl === 0 ? 'Cantrips' : `Level ${lvl}`;
        lines.push(`### ${label} (${levelSpells.length} spells)`);
        for (const s of levelSpells) {
          const tags: string[] = [];
          if (s.concentration) tags.push('C');
          if (s.ritual) tags.push('R');
          const tagStr = tags.length > 0 ? ` [${tags.join(', ')}]` : '';
          lines.push(`- ${s.name}${tagStr} — ${s.school}, ${s.casting_time}`);
        }
        lines.push('');
      }

      // Prepared spells analysis
      if (prepared_spells && prepared_spells.length > 0) {
        lines.push('## Prepared Spell Analysis');
        lines.push('');

        const found: SpellRow[] = [];
        const notFound: string[] = [];
        for (const name of prepared_spells) {
          const spell = getSpellByName(db, name);
          if (spell) {
            found.push(spell);
          } else {
            notFound.push(name);
          }
        }

        if (notFound.length > 0) {
          lines.push(`**Not found in SRD:** ${notFound.join(', ')}`);
          lines.push('');
        }

        // Concentration conflicts
        const concentrationSpells = found.filter((s) => s.concentration);
        if (concentrationSpells.length > 1) {
          lines.push(`**⚠ Concentration Conflict:** You have ${concentrationSpells.length} concentration spells prepared. You can only concentrate on ONE at a time:`);
          for (const s of concentrationSpells) {
            lines.push(`  - ${s.name} (${s.duration})`);
          }
          lines.push('');
        } else if (concentrationSpells.length === 1) {
          lines.push(`**Concentration:** ${concentrationSpells[0].name} (${concentrationSpells[0].duration})`);
          lines.push('');
        }

        // Ritual spells
        const ritualSpells = found.filter((s) => s.ritual);
        if (ritualSpells.length > 0) {
          lines.push(`**Ritual Spells** (can cast without expending a slot, +10 min casting time):`);
          for (const s of ritualSpells) {
            lines.push(`  - ${s.name}`);
          }
          lines.push('');
        }

        // Material component costs
        let totalCost = 0;
        const costlyComponents: { name: string; cost: number; desc: string }[] = [];
        for (const s of found) {
          if (s.components_m && s.material_description) {
            const cost = extractCostFromMaterial(s.material_description);
            if (cost !== null && cost > 0) {
              totalCost += cost;
              costlyComponents.push({ name: s.name, cost, desc: s.material_description });
            }
          }
        }
        if (costlyComponents.length > 0) {
          lines.push('**Material Component Costs:**');
          for (const c of costlyComponents) {
            lines.push(`  - ${c.name}: ${c.cost} gp — ${c.desc}`);
          }
          lines.push(`  - **Total: ${totalCost} gp**`);
          lines.push('');
        }

        // Summary table
        lines.push('**Prepared Spells Summary:**');
        lines.push('');
        lines.push('| Spell | Level | School | Components | Concentration | Ritual |');
        lines.push('|-------|-------|--------|------------|---------------|--------|');
        for (const s of found) {
          lines.push(`| ${s.name} | ${s.level === 0 ? 'Cantrip' : s.level} | ${s.school} | ${formatComponents(s)} | ${s.concentration ? 'Yes' : 'No'} | ${s.ritual ? 'Yes' : 'No'} |`);
        }
        lines.push('');
      }

      return {
        content: [{ type: 'text' as const, text: lines.join('\n') }],
      };
    },
  );
}
