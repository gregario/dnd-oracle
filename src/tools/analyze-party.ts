import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import type Database from 'better-sqlite3';
import { getClassByName, getRaceByName } from '../data/db.js';
import { safeParseJsonOr } from '../lib/format.js';
import { FULL_CASTERS, HALF_CASTERS } from '../lib/class-mechanics.js';

interface RaceTrait {
  name: string;
  description: string;
}

const ALL_SAVES = ['Strength', 'Dexterity', 'Constitution', 'Intelligence', 'Wisdom', 'Charisma'];

const ROLE_MAP: Record<string, string[]> = {
  barbarian: ['striker', 'tank'],
  bard: ['healer', 'controller', 'utility'],
  cleric: ['healer', 'tank', 'controller'],
  druid: ['healer', 'controller', 'utility'],
  fighter: ['striker', 'tank'],
  monk: ['striker', 'skirmisher'],
  paladin: ['tank', 'healer', 'striker'],
  ranger: ['striker', 'utility'],
  rogue: ['striker', 'utility'],
  sorcerer: ['striker', 'controller'],
  warlock: ['striker', 'controller'],
  wizard: ['controller', 'utility'],
};

export function registerAnalyzeParty(
  server: McpServer,
  db: Database.Database,
): void {
  server.registerTool(
    'analyze_party',
    {
      description:
        'Analyze a D&D 5e party composition. Identifies saving throw coverage, role balance, skill gaps, and darkvision/language spread.',
      inputSchema: {
        members: z
          .array(
            z.object({
              class_name: z.string().describe('Class name'),
              level: z.number().min(1).max(20).describe('Character level'),
              race_name: z.string().optional().describe('Race name (for darkvision/languages)'),
            }),
          )
          .min(1)
          .max(10)
          .describe('Party members'),
      },
    },
    async ({ members }) => {
      const lines: string[] = [];
      lines.push('# Party Composition Analysis');
      lines.push('');

      const savesCovered = new Set<string>();
      const rolesPresent = new Set<string>();
      const languages = new Set<string>();
      let darkvisionCount = 0;
      let healerCount = 0;
      const notFound: string[] = [];
      const memberSummaries: string[] = [];
      let hasCaster = false;

      for (const member of members) {
        const cls = getClassByName(db, member.class_name);
        if (!cls) {
          notFound.push(member.class_name);
          continue;
        }

        const className = cls.name.toLowerCase();
        const saves = safeParseJsonOr<string[]>(cls.saving_throws, []);
        for (const s of saves) savesCovered.add(s);

        const roles = ROLE_MAP[className] ?? [];
        for (const r of roles) rolesPresent.add(r);
        if (roles.includes('healer')) healerCount++;

        if (FULL_CASTERS.has(className) || HALF_CASTERS.has(className) || className === 'warlock') {
          hasCaster = true;
        }

        let raceSummary = '';
        if (member.race_name) {
          const race = getRaceByName(db, member.race_name);
          if (race) {
            const traits = safeParseJsonOr<RaceTrait[]>(race.traits, []);
            const raceLangs = safeParseJsonOr<string[]>(race.languages, []);
            for (const l of raceLangs) languages.add(l);

            const hasDarkvision = traits.some((t) =>
              t.name.toLowerCase().includes('darkvision'),
            );
            if (hasDarkvision) darkvisionCount++;
            raceSummary = ` (${race.name})`;
          }
        }

        memberSummaries.push(`- **${cls.name} ${member.level}**${raceSummary} — roles: ${roles.join(', ')}, saves: ${saves.join(', ')}`);
      }

      if (notFound.length > 0) {
        lines.push(`**Classes not found:** ${notFound.join(', ')}`);
        lines.push('');
      }

      lines.push('## Party Roster');
      lines.push('');
      for (const s of memberSummaries) lines.push(s);
      lines.push('');

      // Saving throw coverage
      lines.push('## Saving Throw Coverage');
      lines.push('');
      const uncoveredSaves = ALL_SAVES.filter((s) => !savesCovered.has(s));
      if (uncoveredSaves.length === 0) {
        lines.push('All six saving throws are covered by at least one party member.');
      } else {
        lines.push(`**Gaps:** No one is proficient in ${uncoveredSaves.join(', ')} saves.`);
        lines.push('');
        lines.push('Common threats targeting uncovered saves:');
        const saveThreats: Record<string, string> = {
          Strength: 'grapples, shoves, Entangle, Maximilian\'s Earthen Grasp',
          Dexterity: 'Fireball, Lightning Bolt, dragon breath, traps',
          Constitution: 'Cloudkill, poison, concentration checks',
          Intelligence: 'Mind Flayer, Feeblemind, Phantasmal Force, Synaptic Static',
          Wisdom: 'Hold Person, Dominate, Frightful Presence, Banishment',
          Charisma: 'Banishment, Planar Binding, Divine Word',
        };
        for (const s of uncoveredSaves) {
          lines.push(`  - **${s}:** ${saveThreats[s] ?? 'various effects'}`);
        }
      }
      lines.push('');

      // Role balance
      lines.push('## Role Balance');
      lines.push('');
      const allRoles = ['healer', 'tank', 'striker', 'controller', 'utility', 'skirmisher'];
      const missingRoles = allRoles.filter((r) => !rolesPresent.has(r));
      const presentRoles = allRoles.filter((r) => rolesPresent.has(r));

      lines.push(`**Present:** ${presentRoles.join(', ')}`);
      if (missingRoles.length > 0) {
        lines.push(`**Missing:** ${missingRoles.join(', ')}`);
      }
      lines.push('');

      // Specific warnings
      const warnings: string[] = [];
      if (healerCount === 0) {
        warnings.push('No dedicated healer — pack extra healing potions and consider Healer feat');
      }
      if (!rolesPresent.has('tank')) {
        warnings.push('No tank — enemies will target squishy casters directly');
      }
      if (!hasCaster) {
        warnings.push('No spellcaster — party has no magical utility, counterspelling, or AoE');
      }
      if (members.length >= 4 && !rolesPresent.has('utility')) {
        warnings.push('No utility — may struggle with locks, traps, social encounters');
      }

      if (warnings.length > 0) {
        lines.push('## Warnings');
        lines.push('');
        for (const w of warnings) lines.push(`- ${w}`);
        lines.push('');
      }

      // Darkvision & languages
      if (members.some((m) => m.race_name)) {
        lines.push('## Senses & Languages');
        lines.push('');
        lines.push(`**Darkvision:** ${darkvisionCount}/${members.length} party members`);
        if (darkvisionCount === 0) {
          lines.push('  *Warning: No darkvision — bring torches or Light cantrip in dungeons*');
        } else if (darkvisionCount < members.length) {
          lines.push(`  *${members.length - darkvisionCount} member(s) will need a light source*`);
        }
        if (languages.size > 0) {
          lines.push(`**Languages:** ${[...languages].sort().join(', ')}`);
        }
        lines.push('');
      }

      return {
        content: [{ type: 'text' as const, text: lines.join('\n') }],
      };
    },
  );
}
