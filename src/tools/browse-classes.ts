import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import type Database from 'better-sqlite3';
import { listClasses, getClassByName } from '../data/db.js';

const SPELL_SLOT_TABLE: Record<number, number[]> = {
  1: [2],
  2: [3],
  3: [4, 2],
  4: [4, 3],
  5: [4, 3, 2],
  6: [4, 3, 3],
  7: [4, 3, 3, 1],
  8: [4, 3, 3, 2],
  9: [4, 3, 3, 3, 1],
  10: [4, 3, 3, 3, 2],
  11: [4, 3, 3, 3, 2, 1],
  12: [4, 3, 3, 3, 2, 1],
  13: [4, 3, 3, 3, 2, 1, 1],
  14: [4, 3, 3, 3, 2, 1, 1],
  15: [4, 3, 3, 3, 2, 1, 1, 1],
  16: [4, 3, 3, 3, 2, 1, 1, 1],
  17: [4, 3, 3, 3, 2, 1, 1, 1, 1],
  18: [4, 3, 3, 3, 3, 1, 1, 1, 1],
  19: [4, 3, 3, 3, 3, 2, 1, 1, 1],
  20: [4, 3, 3, 3, 3, 2, 2, 1, 1],
};

const FULL_CASTERS = new Set(['bard', 'cleric', 'druid', 'sorcerer', 'wizard']);
const HALF_CASTERS = new Set(['paladin', 'ranger']);
// Third casters are subclass-dependent (Eldritch Knight, Arcane Trickster)
const THIRD_CASTER_CLASSES = new Set(['fighter', 'rogue']);

interface ClassFeature {
  level: number;
  name: string;
  description: string;
}

interface MulticlassEntry {
  class_name: string;
  level: number;
}

function safeJsonParse<T>(value: string | null, fallback: T): T {
  if (!value) return fallback;
  try {
    return JSON.parse(value) as T;
  } catch {
    return fallback;
  }
}

function formatFeature(feature: ClassFeature): string {
  return `  Level ${feature.level}: ${feature.name}\n    ${feature.description}`;
}

function getCasterLevel(className: string, classLevel: number): number {
  const lower = className.toLowerCase();
  if (FULL_CASTERS.has(lower)) return classLevel;
  if (HALF_CASTERS.has(lower)) return Math.floor(classLevel / 2);
  if (THIRD_CASTER_CLASSES.has(lower)) return Math.floor(classLevel / 3);
  return 0;
}

function formatSpellSlots(casterLevel: number): string {
  if (casterLevel <= 0) return 'No spell slots (non-caster combination)';
  const effectiveLevel = Math.min(casterLevel, 20);
  const slots = SPELL_SLOT_TABLE[effectiveLevel];
  if (!slots) return 'No spell slots';
  return slots
    .map((count, i) => `${getOrdinal(i + 1)} level: ${count}`)
    .join(', ');
}

function getOrdinal(n: number): string {
  const suffixes: Record<number, string> = { 1: 'st', 2: 'nd', 3: 'rd' };
  const suffix = suffixes[n] ?? 'th';
  return `${n}${suffix}`;
}

export function registerBrowseClasses(
  server: McpServer,
  db: Database.Database,
): void {
  server.registerTool(
    'browse_classes',
    {
      description:
        'Browse D&D 5e SRD classes. List all classes, view a specific class\'s features at any level, or calculate multiclass feature combinations.',
      inputSchema: {
        class_name: z
          .string()
          .optional()
          .describe('Name of a specific class to look up'),
        level: z
          .number()
          .int()
          .min(1)
          .max(20)
          .optional()
          .describe('Filter features to this level or below (1-20)'),
        multiclass: z
          .array(
            z.object({
              class_name: z.string().describe('Class name'),
              level: z.number().int().min(1).max(20).describe('Level in this class'),
            }),
          )
          .optional()
          .describe(
            'Array of class/level combos to calculate multiclass features and spell slots',
          ),
      },
    },
    async ({ class_name, level, multiclass }) => {
      // Mode 3: Multiclass combination
      if (multiclass && multiclass.length > 0) {
        return handleMulticlass(db, multiclass);
      }

      // Mode 2: Specific class
      if (class_name) {
        return handleSingleClass(db, class_name, level);
      }

      // Mode 1: List all classes
      return handleListClasses(db);
    },
  );
}

function handleListClasses(db: Database.Database) {
  const classes = listClasses(db);
  if (classes.length === 0) {
    return {
      content: [{ type: 'text' as const, text: 'No classes found in the database.' }],
    };
  }

  const lines = classes.map((cls) => {
    const savingThrows = safeJsonParse<string[]>(cls.saving_throws, []);
    const subclasses = safeJsonParse<string[]>(cls.subclasses, []);
    const subclassText =
      subclasses.length > 0 ? `\n  Subclasses: ${subclasses.join(', ')}` : '';

    return `${cls.name}\n  Hit Die: d${cls.hit_die}\n  Saving Throws: ${savingThrows.join(', ') || 'None'}${subclassText}`;
  });

  const text = `D&D 5e SRD Classes (${classes.length})\n${'='.repeat(40)}\n\n${lines.join('\n\n')}`;
  return { content: [{ type: 'text' as const, text }] };
}

function handleSingleClass(
  db: Database.Database,
  className: string,
  level?: number,
) {
  const cls = getClassByName(db, className);
  if (!cls) {
    const allClasses = listClasses(db);
    const available = allClasses.map((c) => c.name).join(', ');
    return {
      content: [
        {
          type: 'text' as const,
          text: `Class "${className}" not found. Available classes: ${available}`,
        },
      ],
      isError: true,
    };
  }

  const savingThrows = safeJsonParse<string[]>(cls.saving_throws, []);
  const proficiencies = safeJsonParse<Record<string, unknown>>(cls.proficiencies, {});
  const features = safeJsonParse<ClassFeature[]>(cls.features, []);
  const subclasses = safeJsonParse<string[]>(cls.subclasses, []);

  const filteredFeatures = level
    ? features.filter((f) => f.level <= level)
    : features;

  const sections: string[] = [
    `${cls.name}`,
    '='.repeat(40),
    `Hit Die: d${cls.hit_die}`,
    `Saving Throws: ${savingThrows.join(', ') || 'None'}`,
    `Spellcasting Ability: ${cls.spellcasting_ability || 'None'}`,
  ];

  // Proficiencies
  const profLines: string[] = [];
  for (const [key, value] of Object.entries(proficiencies)) {
    if (Array.isArray(value)) {
      profLines.push(`  ${key}: ${value.join(', ')}`);
    } else if (typeof value === 'string') {
      profLines.push(`  ${key}: ${value}`);
    }
  }
  if (profLines.length > 0) {
    sections.push(`\nProficiencies:\n${profLines.join('\n')}`);
  }

  // Subclasses
  if (subclasses.length > 0) {
    sections.push(`\nSubclasses: ${subclasses.join(', ')}`);
  }

  // Features
  const levelLabel = level ? ` (up to level ${level})` : '';
  if (filteredFeatures.length > 0) {
    sections.push(
      `\nFeatures${levelLabel} (${filteredFeatures.length}):\n${filteredFeatures.map(formatFeature).join('\n\n')}`,
    );
  } else {
    sections.push(`\nNo features found${levelLabel}.`);
  }

  return { content: [{ type: 'text' as const, text: sections.join('\n') }] };
}

function handleMulticlass(db: Database.Database, entries: MulticlassEntry[]) {
  const totalLevel = entries.reduce((sum, e) => sum + e.level, 0);
  if (totalLevel > 20) {
    return {
      content: [
        {
          type: 'text' as const,
          text: `Total multiclass level (${totalLevel}) exceeds maximum of 20.`,
        },
      ],
      isError: true,
    };
  }

  const sections: string[] = [
    `Multiclass Build (Total Level ${totalLevel})`,
    '='.repeat(40),
  ];

  let combinedCasterLevel = 0;
  const allFeatures: { className: string; feature: ClassFeature }[] = [];
  const notFound: string[] = [];

  for (const entry of entries) {
    const cls = getClassByName(db, entry.class_name);
    if (!cls) {
      notFound.push(entry.class_name);
      continue;
    }

    sections.push(`\n${cls.name} (Level ${entry.level})`);
    sections.push('-'.repeat(30));

    const features = safeJsonParse<ClassFeature[]>(cls.features, []);
    const classFeatures = features.filter((f) => f.level <= entry.level);

    for (const feature of classFeatures) {
      allFeatures.push({ className: cls.name, feature });
      sections.push(`  Level ${feature.level}: ${feature.name}`);
    }

    combinedCasterLevel += getCasterLevel(cls.name, entry.level);
  }

  if (notFound.length > 0) {
    const allClasses = listClasses(db);
    const available = allClasses.map((c) => c.name).join(', ');
    sections.push(
      `\nWarning: Classes not found: ${notFound.join(', ')}. Available: ${available}`,
    );
  }

  // Spell slots
  sections.push(`\nMulticlass Spell Slots`);
  sections.push('-'.repeat(30));
  sections.push(`Combined Caster Level: ${combinedCasterLevel}`);
  sections.push(formatSpellSlots(combinedCasterLevel));

  return { content: [{ type: 'text' as const, text: sections.join('\n') }] };
}
