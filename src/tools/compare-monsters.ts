import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import type Database from 'better-sqlite3';
import { getMonsterByName, getXpForCr } from '../data/db.js';
import type { MonsterRow } from '../types.js';

function abilityMod(score: number): string {
  const mod = Math.floor((score - 10) / 2);
  return mod >= 0 ? `+${mod}` : `${mod}`;
}

function formatScore(score: number): string {
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

function formatAbilitiesSection(label: string, monsters: MonsterRow[], field: keyof MonsterRow): string {
  const lines: string[] = [];
  let hasAny = false;

  for (const m of monsters) {
    const abilities = safeParseJson<NameDesc[]>(m[field] as string | null);
    if (abilities && abilities.length > 0) hasAny = true;
  }

  if (!hasAny) return '';

  lines.push(`## ${label}`);
  for (const m of monsters) {
    const abilities = safeParseJson<NameDesc[]>(m[field] as string | null);
    lines.push(`### ${m.name}`);
    if (!abilities || abilities.length === 0) {
      lines.push('*None*');
    } else {
      for (const a of abilities) {
        lines.push(`- **${a.name}.** ${a.desc}`);
      }
    }
    lines.push('');
  }

  return lines.join('\n');
}

export function registerCompareMonsters(
  server: McpServer,
  db: Database.Database,
): void {
  server.registerTool(
    'compare_monsters',
    {
      description:
        'Compare 2-3 D&D 5e monsters side by side. Shows AC, HP, ability scores, speeds, resistances, immunities, actions, and special abilities.',
      inputSchema: {
        monster_names: z
          .array(z.string())
          .min(2)
          .max(3)
          .describe('Names of 2-3 monsters to compare'),
      },
    },
    async ({ monster_names }) => {
      const monsters: MonsterRow[] = [];
      const notFound: string[] = [];

      for (const name of monster_names) {
        const monster = getMonsterByName(db, name);
        if (monster) {
          monsters.push(monster);
        } else {
          notFound.push(name);
        }
      }

      if (notFound.length > 0) {
        return {
          content: [
            {
              type: 'text' as const,
              text: `Monster(s) not found: ${notFound.join(', ')}. Use the search_monsters tool first to find the exact name.`,
            },
          ],
          isError: true,
        };
      }

      const lines: string[] = [];
      lines.push('# Monster Comparison');
      lines.push('');

      // Separator helper for table
      const sep = monsters.map(() => '---').join(' | ');
      const header = monsters.map((m) => `**${m.name}**`).join(' | ');

      lines.push(`| Stat | ${header} |`);
      lines.push(`|------|${sep}|`);

      // Basic info
      lines.push(`| Size | ${monsters.map((m) => m.size).join(' | ')} |`);
      lines.push(`| Type | ${monsters.map((m) => {
        const sub = m.subtype ? ` (${m.subtype})` : '';
        return `${m.type}${sub}`;
      }).join(' | ')} |`);
      lines.push(`| Alignment | ${monsters.map((m) => m.alignment).join(' | ')} |`);

      // Combat stats
      lines.push(`| AC | ${monsters.map((m) => {
        return m.ac_type ? `${m.ac} (${m.ac_type})` : `${m.ac}`;
      }).join(' | ')} |`);
      lines.push(`| HP | ${monsters.map((m) => `${m.hp} (${m.hit_dice})`).join(' | ')} |`);
      lines.push(`| Speed | ${monsters.map((m) => formatSpeed(m.speed)).join(' | ')} |`);
      lines.push(`| CR | ${monsters.map((m) => {
        const xp = m.xp || getXpForCr(m.cr);
        return `${m.cr} (${xp.toLocaleString()} XP)`;
      }).join(' | ')} |`);
      lines.push(`| Prof. Bonus | ${monsters.map((m) => m.proficiency_bonus ? `+${m.proficiency_bonus}` : '—').join(' | ')} |`);

      // Ability scores
      lines.push(`| STR | ${monsters.map((m) => formatScore(m.str)).join(' | ')} |`);
      lines.push(`| DEX | ${monsters.map((m) => formatScore(m.dex)).join(' | ')} |`);
      lines.push(`| CON | ${monsters.map((m) => formatScore(m.con)).join(' | ')} |`);
      lines.push(`| INT | ${monsters.map((m) => formatScore(m.int)).join(' | ')} |`);
      lines.push(`| WIS | ${monsters.map((m) => formatScore(m.wis)).join(' | ')} |`);
      lines.push(`| CHA | ${monsters.map((m) => formatScore(m.cha)).join(' | ')} |`);

      // Defenses
      lines.push(`| Resistances | ${monsters.map((m) => m.resistances ?? '—').join(' | ')} |`);
      lines.push(`| Immunities | ${monsters.map((m) => m.immunities ?? '—').join(' | ')} |`);
      lines.push(`| Vulnerabilities | ${monsters.map((m) => m.vulnerabilities ?? '—').join(' | ')} |`);
      lines.push(`| Condition Immunities | ${monsters.map((m) => m.condition_immunities ?? '—').join(' | ')} |`);

      // Senses & languages
      lines.push(`| Senses | ${monsters.map((m) => m.senses ?? '—').join(' | ')} |`);
      lines.push(`| Languages | ${monsters.map((m) => m.languages ?? '—').join(' | ')} |`);
      lines.push('');

      // Detailed sections
      const traitSection = formatAbilitiesSection('Traits', monsters, 'traits');
      if (traitSection) lines.push(traitSection);

      const actionSection = formatAbilitiesSection('Actions', monsters, 'actions');
      if (actionSection) lines.push(actionSection);

      const reactionSection = formatAbilitiesSection('Reactions', monsters, 'reactions');
      if (reactionSection) lines.push(reactionSection);

      const legendarySection = formatAbilitiesSection('Legendary Actions', monsters, 'legendary_actions');
      if (legendarySection) lines.push(legendarySection);

      return {
        content: [{ type: 'text' as const, text: lines.join('\n') }],
      };
    },
  );
}
