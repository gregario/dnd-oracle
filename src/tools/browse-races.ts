import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import type Database from 'better-sqlite3';
import { listRaces, getRaceByName } from '../data/db.js';

interface AbilityBonus {
  ability?: string;
  ability_score?: string;
  bonus: number;
}

interface RaceTrait {
  name: string;
  description: string;
}

interface Subrace {
  name: string;
  ability_bonuses?: AbilityBonus[];
  traits?: RaceTrait[];
  description?: string;
}

function safeJsonParse<T>(value: string | null, fallback: T): T {
  if (!value) return fallback;
  try {
    return JSON.parse(value) as T;
  } catch {
    return fallback;
  }
}

function formatAbilityBonuses(bonuses: AbilityBonus[]): string {
  if (bonuses.length === 0) return 'None';
  return bonuses.map((b) => `${b.ability ?? b.ability_score ?? 'Unknown'} +${b.bonus}`).join(', ');
}

function formatTraits(traits: RaceTrait[]): string {
  if (traits.length === 0) return '  None';
  return traits
    .map((t) => `  ${t.name}: ${t.description}`)
    .join('\n');
}

export function registerBrowseRaces(
  server: McpServer,
  db: Database.Database,
): void {
  server.registerTool(
    'browse_races',
    {
      description:
        "Browse D&D 5e SRD races. List all races or view a specific race's traits, ability bonuses, and subraces.",
      inputSchema: {
        race_name: z
          .string()
          .optional()
          .describe('Name of a specific race to look up'),
      },
    },
    async ({ race_name }) => {
      if (race_name) {
        return handleSingleRace(db, race_name);
      }
      return handleListRaces(db);
    },
  );
}

function handleListRaces(db: Database.Database) {
  const races = listRaces(db);
  if (races.length === 0) {
    return {
      content: [{ type: 'text' as const, text: 'No races found in the database.' }],
    };
  }

  const lines = races.map((race) => {
    const bonuses = safeJsonParse<AbilityBonus[]>(race.ability_bonuses, []);
    return `${race.name}\n  Speed: ${race.speed} ft.\n  Size: ${race.size}\n  Ability Bonuses: ${formatAbilityBonuses(bonuses)}`;
  });

  const text = `D&D 5e SRD Races (${races.length})\n${'='.repeat(40)}\n\n${lines.join('\n\n')}`;
  return { content: [{ type: 'text' as const, text }] };
}

function handleSingleRace(db: Database.Database, raceName: string) {
  const race = getRaceByName(db, raceName);
  if (!race) {
    const allRaces = listRaces(db);
    const available = allRaces.map((r) => r.name).join(', ');
    return {
      content: [
        {
          type: 'text' as const,
          text: `Race "${raceName}" not found. Available races: ${available}`,
        },
      ],
      isError: true,
    };
  }

  const bonuses = safeJsonParse<AbilityBonus[]>(race.ability_bonuses, []);
  const traits = safeJsonParse<RaceTrait[]>(race.traits, []);
  const languages = safeJsonParse<string[]>(race.languages, []);
  const subraces = safeJsonParse<Subrace[]>(race.subraces, []);

  const sections: string[] = [
    `${race.name}`,
    '='.repeat(40),
    `Speed: ${race.speed} ft.`,
    `Size: ${race.size}`,
    `Ability Bonuses: ${formatAbilityBonuses(bonuses)}`,
    `Languages: ${languages.join(', ') || 'None'}`,
  ];

  // Traits
  if (traits.length > 0) {
    sections.push(`\nTraits (${traits.length}):`);
    sections.push(formatTraits(traits));
  }

  // Subraces
  if (subraces.length > 0) {
    sections.push(`\nSubraces (${subraces.length}):`);
    for (const subrace of subraces) {
      sections.push(`\n  ${subrace.name}`);
      if (subrace.description) {
        sections.push(`    ${subrace.description}`);
      }
      if (subrace.ability_bonuses && subrace.ability_bonuses.length > 0) {
        sections.push(
          `    Additional Ability Bonuses: ${formatAbilityBonuses(subrace.ability_bonuses)}`,
        );
      }
      if (subrace.traits && subrace.traits.length > 0) {
        sections.push(`    Subrace Traits:`);
        for (const trait of subrace.traits) {
          sections.push(`      ${trait.name}: ${trait.description}`);
        }
      }
    }
  }

  return { content: [{ type: 'text' as const, text: sections.join('\n') }] };
}
