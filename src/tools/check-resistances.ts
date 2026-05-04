import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import type Database from 'better-sqlite3';
import { getMonsterByName } from '../data/db.js';
import type { MonsterRow } from '../types.js';

interface DefenseEntry {
  resistances: string[];
  immunities: string[];
  vulnerabilities: string[];
  conditionImmunities: string[];
}

function parseCommaSeparated(value: string | null): string[] {
  if (!value) return [];
  return value.split(',').map((s) => s.trim().toLowerCase()).filter((s) => s.length > 0);
}

function buildDefenseMap(monsters: MonsterRow[]): Map<string, DefenseEntry> {
  const map = new Map<string, DefenseEntry>();
  for (const m of monsters) {
    map.set(m.name, {
      resistances: parseCommaSeparated(m.resistances),
      immunities: parseCommaSeparated(m.immunities),
      vulnerabilities: parseCommaSeparated(m.vulnerabilities),
      conditionImmunities: parseCommaSeparated(m.condition_immunities),
    });
  }
  return map;
}

function collectAllDamageTypes(defenses: Map<string, DefenseEntry>): string[] {
  const types = new Set<string>();
  for (const entry of defenses.values()) {
    for (const t of entry.resistances) types.add(t);
    for (const t of entry.immunities) types.add(t);
    for (const t of entry.vulnerabilities) types.add(t);
  }
  return [...types].sort();
}

export function registerCheckResistances(
  server: McpServer,
  db: Database.Database,
): void {
  server.registerTool(
    'check_resistances',
    {
      description:
        'Check resistances, immunities, and vulnerabilities for a group of monsters. Produces a consolidated defense matrix and warns about party damage type coverage gaps.',
      inputSchema: {
        monster_names: z
          .array(z.string())
          .min(1)
          .max(20)
          .describe('Names of monsters to check'),
        party_damage_types: z
          .array(z.string())
          .optional()
          .describe('Damage types your party commonly deals (e.g. ["fire", "slashing", "radiant"]). If provided, warns about gaps.'),
      },
    },
    async ({ monster_names, party_damage_types }) => {
      const found: MonsterRow[] = [];
      const notFound: string[] = [];

      for (const name of monster_names) {
        const monster = getMonsterByName(db, name);
        if (monster) {
          found.push(monster);
        } else {
          notFound.push(name);
        }
      }

      if (found.length === 0) {
        return {
          content: [{
            type: 'text' as const,
            text: `No monsters found: ${notFound.join(', ')}. Use search_monsters to find the exact names.`,
          }],
          isError: true,
        };
      }

      const defenses = buildDefenseMap(found);
      const allDamageTypes = collectAllDamageTypes(defenses);
      const lines: string[] = [];

      lines.push('# Resistance & Immunity Check');
      lines.push('');

      if (notFound.length > 0) {
        lines.push(`**Not found:** ${notFound.join(', ')}`);
        lines.push('');
      }

      // Damage type matrix
      if (allDamageTypes.length > 0) {
        lines.push('## Damage Type Matrix');
        lines.push('');
        lines.push(`| Monster | ${allDamageTypes.join(' | ')} |`);
        lines.push(`|---------|${allDamageTypes.map(() => '---').join('|')}|`);

        for (const m of found) {
          const entry = defenses.get(m.name)!;
          const cells = allDamageTypes.map((t) => {
            if (entry.immunities.includes(t)) return '**I**';
            if (entry.resistances.includes(t)) return 'R';
            if (entry.vulnerabilities.includes(t)) return '*V*';
            return '—';
          });
          lines.push(`| ${m.name} | ${cells.join(' | ')} |`);
        }

        lines.push('');
        lines.push('*Key: **I** = Immune, R = Resistant, *V* = Vulnerable, — = Normal*');
        lines.push('');
      } else {
        lines.push('*None of these monsters have damage resistances, immunities, or vulnerabilities.*');
        lines.push('');
      }

      // Condition immunities
      const anyConditionImmunities = [...defenses.values()].some((e) => e.conditionImmunities.length > 0);
      if (anyConditionImmunities) {
        lines.push('## Condition Immunities');
        lines.push('');
        for (const m of found) {
          const entry = defenses.get(m.name)!;
          if (entry.conditionImmunities.length > 0) {
            lines.push(`- **${m.name}:** ${entry.conditionImmunities.join(', ')}`);
          }
        }
        lines.push('');
      }

      // Party damage type analysis
      if (party_damage_types && party_damage_types.length > 0) {
        const normalizedParty = party_damage_types.map((t) => t.toLowerCase().trim());
        lines.push('## Party Damage Coverage');
        lines.push('');

        const warnings: string[] = [];
        const advantages: string[] = [];

        for (const dtype of normalizedParty) {
          const resistedBy = found.filter((m) => defenses.get(m.name)!.resistances.includes(dtype));
          const immuneBy = found.filter((m) => defenses.get(m.name)!.immunities.includes(dtype));
          const vulnBy = found.filter((m) => defenses.get(m.name)!.vulnerabilities.includes(dtype));

          if (immuneBy.length === found.length) {
            warnings.push(`**${dtype}:** ALL monsters are immune — completely ineffective`);
          } else if (immuneBy.length + resistedBy.length === found.length) {
            warnings.push(`**${dtype}:** every monster resists or is immune — poor choice`);
          } else if (immuneBy.length > 0) {
            warnings.push(`**${dtype}:** ${immuneBy.map((m) => m.name).join(', ')} immune`);
          } else if (resistedBy.length > 0) {
            warnings.push(`**${dtype}:** ${resistedBy.map((m) => m.name).join(', ')} resistant`);
          }

          if (vulnBy.length > 0) {
            advantages.push(`**${dtype}:** ${vulnBy.map((m) => m.name).join(', ')} vulnerable (double damage)`);
          }
        }

        if (advantages.length > 0) {
          lines.push('**Exploit these:**');
          for (const a of advantages) lines.push(`- ${a}`);
          lines.push('');
        }

        if (warnings.length > 0) {
          lines.push('**Watch out:**');
          for (const w of warnings) lines.push(`- ${w}`);
          lines.push('');
        }

        if (warnings.length === 0 && advantages.length === 0) {
          lines.push('All party damage types deal normal damage to all monsters. No special concerns.');
          lines.push('');
        }
      }

      return {
        content: [{ type: 'text' as const, text: lines.join('\n') }],
      };
    },
  );
}
