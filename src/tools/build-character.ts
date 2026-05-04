import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import type Database from 'better-sqlite3';
import { getClassByName, getRaceByName } from '../data/db.js';
import { safeParseJsonOr, formatAbilityMod, abilityModifier } from '../lib/format.js';
import { getMaxSpellLevel, getSpellSlots, getProficiencyBonus, FULL_CASTERS, HALF_CASTERS } from '../lib/class-mechanics.js';
import { averageDice } from '../lib/dice.js';

interface ClassFeature {
  level: number;
  name: string;
  description: string;
}

interface AbilityBonus {
  ability?: string;
  ability_score?: string;
  bonus: number;
}

const ABILITY_NAMES = ['Strength', 'Dexterity', 'Constitution', 'Intelligence', 'Wisdom', 'Charisma'];
const ABILITY_SHORT = ['STR', 'DEX', 'CON', 'INT', 'WIS', 'CHA'];

function matchesSave(stored: string, ability: string): boolean {
  const s = stored.toLowerCase();
  const a = ability.toLowerCase();
  return s === a || s === a.slice(0, 3);
}

function getSpellcastingAbilityIndex(ability: string | null): number {
  if (!ability) return -1;
  const lower = ability.toLowerCase();
  return ABILITY_NAMES.findIndex((a) => a.toLowerCase() === lower || a.toLowerCase().startsWith(lower));
}

export function registerBuildCharacter(
  server: McpServer,
  db: Database.Database,
): void {
  server.registerTool(
    'build_character',
    {
      description:
        'Build a D&D 5e character summary. Given race, class, level, and ability scores, computes HP, proficiency bonus, saving throws, attack bonuses, spell save DC, and lists features gained.',
      inputSchema: {
        race_name: z.string().describe('Race name (e.g. "Elf", "Human")'),
        class_name: z.string().describe('Class name (e.g. "Fighter", "Wizard")'),
        level: z.number().min(1).max(20).describe('Character level'),
        ability_scores: z
          .array(z.number().min(1).max(30))
          .length(6)
          .describe('Ability scores in order: STR, DEX, CON, INT, WIS, CHA (before racial bonuses)'),
      },
    },
    async ({ race_name, class_name, level, ability_scores }) => {
      const cls = getClassByName(db, class_name);
      if (!cls) {
        return {
          content: [{ type: 'text' as const, text: `Class "${class_name}" not found.` }],
          isError: true,
        };
      }

      const race = getRaceByName(db, race_name);
      if (!race) {
        return {
          content: [{ type: 'text' as const, text: `Race "${race_name}" not found.` }],
          isError: true,
        };
      }

      // Apply racial bonuses
      const finalScores = [...ability_scores];
      const bonuses = safeParseJsonOr<AbilityBonus[]>(race.ability_bonuses, []);
      for (const b of bonuses) {
        const abilityName = b.ability ?? b.ability_score ?? '';
        const idx = ABILITY_NAMES.findIndex((a) => a.toLowerCase() === abilityName.toLowerCase());
        if (idx >= 0) {
          finalScores[idx] += b.bonus;
        }
      }

      const profBonus = getProficiencyBonus(level);
      const conMod = abilityModifier(finalScores[2]);

      // HP calculation: max hit die at level 1 + average for remaining levels + CON * level
      const hp = cls.hit_die + (level - 1) * Math.floor(averageDice({ count: 1, sides: cls.hit_die, modifier: 0 })) + conMod * level;

      // Saving throws
      const classSaves = safeParseJsonOr<string[]>(cls.saving_throws, []);

      // Features at this level
      const allFeatures = safeParseJsonOr<ClassFeature[]>(cls.features, []);
      const features = allFeatures.filter((f) => f.level <= level);

      const lines: string[] = [];
      lines.push(`# ${race.name} ${cls.name} — Level ${level}`);
      lines.push('');

      // Ability scores table
      lines.push('## Ability Scores');
      lines.push('');
      lines.push(`| ${ABILITY_SHORT.join(' | ')} |`);
      lines.push(`|${ABILITY_SHORT.map(() => '---').join('|')}|`);
      lines.push(`| ${finalScores.map((s) => `${s} (${formatAbilityMod(s)})`).join(' | ')} |`);
      lines.push('');

      // Core stats
      lines.push('## Core Stats');
      lines.push('');
      lines.push(`| Stat | Value |`);
      lines.push(`|------|-------|`);
      lines.push(`| HP | ${hp} (d${cls.hit_die} hit die) |`);
      lines.push(`| Proficiency Bonus | +${profBonus} |`);
      lines.push(`| Speed | ${race.speed} ft. |`);
      lines.push(`| Size | ${race.size} |`);
      lines.push('');

      // Saving throws
      lines.push('## Saving Throws');
      lines.push('');
      lines.push('| Save | Modifier | Proficient |');
      lines.push('|------|----------|-----------|');
      for (let i = 0; i < 6; i++) {
        const mod = abilityModifier(finalScores[i]);
        const prof = classSaves.some((s) => matchesSave(s, ABILITY_NAMES[i]));
        const total = mod + (prof ? profBonus : 0);
        const totalStr = total >= 0 ? `+${total}` : `${total}`;
        lines.push(`| ${ABILITY_NAMES[i]} | ${totalStr} | ${prof ? '✓' : '—'} |`);
      }
      lines.push('');

      // Spellcasting
      const castingAbility = cls.spellcasting_ability;
      if (castingAbility) {
        const abilityIdx = getSpellcastingAbilityIndex(castingAbility);
        const castingMod = abilityIdx >= 0 ? abilityModifier(finalScores[abilityIdx]) : 0;
        const spellSaveDC = 8 + profBonus + castingMod;
        const spellAttack = profBonus + castingMod;
        const maxLevel = getMaxSpellLevel(cls.name, level);
        const slots = getSpellSlots(cls.name, level);

        lines.push('## Spellcasting');
        lines.push('');
        lines.push(`| Stat | Value |`);
        lines.push(`|------|-------|`);
        lines.push(`| Ability | ${castingAbility} |`);
        lines.push(`| Spell Save DC | ${spellSaveDC} |`);
        lines.push(`| Spell Attack | +${spellAttack} |`);
        lines.push(`| Max Spell Level | ${maxLevel} |`);
        lines.push('');

        if (slots.length > 0) {
          const labels = slots.map((_, i) => {
            const n = i + 1;
            if (n === 1) return '1st';
            if (n === 2) return '2nd';
            if (n === 3) return '3rd';
            return `${n}th`;
          });
          lines.push('**Spell Slots:**');
          lines.push('');
          lines.push(`| ${labels.join(' | ')} |`);
          lines.push(`|${labels.map(() => '---').join('|')}|`);
          lines.push(`| ${slots.join(' | ')} |`);
          lines.push('');
        }
      }

      // Features
      lines.push('## Features');
      lines.push('');
      if (features.length === 0) {
        lines.push('*No features at this level.*');
      } else {
        for (const f of features) {
          lines.push(`- **${f.name}** (Level ${f.level})`);
        }
      }
      lines.push('');

      // Proficiencies
      const profs = safeParseJsonOr<Record<string, unknown>>(cls.proficiencies, {});
      lines.push('## Proficiencies');
      lines.push('');
      for (const [category, value] of Object.entries(profs)) {
        if (Array.isArray(value) && value.length > 0) {
          lines.push(`- **${category}:** ${value.join(', ')}`);
        }
      }

      return {
        content: [{ type: 'text' as const, text: lines.join('\n') }],
      };
    },
  );
}
