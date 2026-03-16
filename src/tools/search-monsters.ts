import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import type Database from 'better-sqlite3';
import { searchMonsters, getXpForCr } from '../data/db.js';
import type { MonsterRow } from '../types.js';

function abilityMod(score: number): string {
  const mod = Math.floor((score - 10) / 2);
  return mod >= 0 ? `+${mod}` : `${mod}`;
}

function formatAbilityScore(score: number): string {
  return `${score} (${abilityMod(score)})`;
}

function safeParseJson<T>(value: string | null): T | null {
  if (!value) return null;
  try {
    return JSON.parse(value) as T;
  } catch {
    return null;
  }
}

interface NameDesc {
  name: string;
  desc: string;
}

function formatSpeed(speedJson: string): string {
  const speed = safeParseJson<Record<string, string | number>>(speedJson);
  if (!speed) return speedJson;
  return Object.entries(speed)
    .map(([key, val]) => (key === 'walk' ? `${val} ft.` : `${key} ${val} ft.`))
    .join(', ');
}

function formatAbilities(label: string, abilities: NameDesc[] | null): string {
  if (!abilities || abilities.length === 0) return '';
  const lines = abilities
    .map((a) => `- **${a.name}.** ${a.desc}`)
    .join('\n');
  return `\n**${label}:**\n${lines}`;
}

function formatSavingThrows(json: string | null): string {
  const saves = safeParseJson<Record<string, number>>(json);
  if (!saves) return '';
  return Object.entries(saves)
    .map(([ability, mod]) => `${ability} +${mod}`)
    .join(', ');
}

function formatSkills(json: string | null): string {
  const skills = safeParseJson<Record<string, number>>(json);
  if (!skills) return '';
  return Object.entries(skills)
    .map(([skill, mod]) => `${skill} +${mod}`)
    .join(', ');
}

function formatMonster(m: MonsterRow): string {
  const subtypeStr = m.subtype ? ` (${m.subtype})` : '';
  const lines: string[] = [];

  lines.push(`## ${m.name}`);
  lines.push(`*${m.size} ${m.type}${subtypeStr}, ${m.alignment}*`);
  lines.push('');

  const acStr = m.ac_type ? `${m.ac} (${m.ac_type})` : `${m.ac}`;
  lines.push(
    `**AC** ${acStr} | **HP** ${m.hp} (${m.hit_dice}) | **Speed** ${formatSpeed(m.speed)}`,
  );
  lines.push('');

  lines.push('| STR | DEX | CON | INT | WIS | CHA |');
  lines.push('|-----|-----|-----|-----|-----|-----|');
  lines.push(
    `| ${formatAbilityScore(m.str)} | ${formatAbilityScore(m.dex)} | ${formatAbilityScore(m.con)} | ${formatAbilityScore(m.int)} | ${formatAbilityScore(m.wis)} | ${formatAbilityScore(m.cha)} |`,
  );
  lines.push('');

  const xp = m.xp || getXpForCr(m.cr);
  lines.push(`**CR** ${m.cr} (${xp.toLocaleString()} XP)`);

  const savesStr = formatSavingThrows(m.saving_throws);
  if (savesStr) lines.push(`**Saving Throws** ${savesStr}`);

  const skillsStr = formatSkills(m.skills);
  if (skillsStr) lines.push(`**Skills** ${skillsStr}`);

  if (m.resistances) lines.push(`**Damage Resistances** ${m.resistances}`);
  if (m.immunities) lines.push(`**Damage Immunities** ${m.immunities}`);
  if (m.vulnerabilities) lines.push(`**Damage Vulnerabilities** ${m.vulnerabilities}`);
  if (m.condition_immunities) lines.push(`**Condition Immunities** ${m.condition_immunities}`);
  if (m.senses) lines.push(`**Senses** ${m.senses}`);
  if (m.languages) lines.push(`**Languages** ${m.languages}`);

  const traits = safeParseJson<NameDesc[]>(m.traits);
  lines.push(formatAbilities('Traits', traits));

  const actions = safeParseJson<NameDesc[]>(m.actions);
  lines.push(formatAbilities('Actions', actions));

  const reactions = safeParseJson<NameDesc[]>(m.reactions);
  lines.push(formatAbilities('Reactions', reactions));

  const legendary = safeParseJson<NameDesc[]>(m.legendary_actions);
  lines.push(formatAbilities('Legendary Actions', legendary));

  return lines.filter((l) => l !== '').join('\n');
}

export function registerSearchMonsters(
  server: McpServer,
  db: Database.Database,
): void {
  server.registerTool(
    'search_monsters',
    {
      description:
        'Search D&D 5e SRD monsters by name, CR, type, size, or alignment. Returns full stat blocks.',
      inputSchema: {
        query: z.string().optional().describe('Search term for monster name or description'),
        cr: z.string().optional().describe('Exact challenge rating (e.g. "1/4", "5")'),
        cr_min: z.number().optional().describe('Minimum challenge rating (numeric, e.g. 0.25 for 1/4)'),
        cr_max: z.number().optional().describe('Maximum challenge rating (numeric)'),
        type: z.string().optional().describe('Monster type (e.g. "beast", "undead", "dragon")'),
        size: z.string().optional().describe('Size category (Tiny, Small, Medium, Large, Huge, Gargantuan)'),
        alignment: z.string().optional().describe('Alignment (e.g. "chaotic evil", "neutral")'),
        limit: z.number().min(1).max(50).default(10).describe('Results per page (max 50)'),
        offset: z.number().min(0).default(0).describe('Offset for pagination'),
      },
    },
    async ({ query, cr, cr_min, cr_max, type, size, alignment, limit, offset }) => {
      const result = searchMonsters(db, {
        query,
        cr,
        cr_min,
        cr_max,
        type,
        size,
        alignment,
        limit,
        offset,
      });

      if (result.rows.length === 0) {
        return {
          content: [
            {
              type: 'text' as const,
              text: 'No monsters found matching your criteria. Try a broader search — for example, remove some filters or use a partial name.',
            },
          ],
          isError: true,
        };
      }

      const start = (offset ?? 0) + 1;
      const end = (offset ?? 0) + result.rows.length;
      const header = `Found ${result.total} monster${result.total === 1 ? '' : 's'} (showing ${start}-${end})\n`;

      const monsters = result.rows.map(formatMonster).join('\n\n---\n\n');

      return {
        content: [{ type: 'text' as const, text: header + '\n' + monsters }],
      };
    },
  );
}
