import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import type Database from 'better-sqlite3';
import { getMonstersByCrRange, getXpForCr, crToNumeric } from '../data/db.js';
import type { MonsterRow } from '../types.js';
import { safeParseJson } from '../lib/format.js';
import { type Difficulty, getEncounterMultiplier, calculatePartyBudget } from '../lib/encounter-math.js';

type MonsterRole = 'controller' | 'striker' | 'tank' | 'artillery' | 'skirmisher' | 'support';

interface NameDesc {
  name: string;
  description: string;
}

function inferMonsterRoles(monster: MonsterRow): MonsterRole[] {
  const roles: MonsterRole[] = [];
  const traits = safeParseJson<NameDesc[]>(monster.traits) ?? [];
  const actions = safeParseJson<NameDesc[]>(monster.actions) ?? [];
  const allText = [...traits, ...actions].map((a) => `${a.name} ${a.description}`.toLowerCase()).join(' ');

  // Controller: spellcasting, AoE effects, conditions
  if (allText.includes('spellcasting') || allText.includes('innate spellcasting') ||
      allText.includes('frightful presence') || allText.includes('paralyze') ||
      allText.includes('each creature in')) {
    roles.push('controller');
  }

  // Striker: multiattack + high damage
  if (allText.includes('multiattack') && (monster.str >= 18 || monster.dex >= 18)) {
    roles.push('striker');
  }

  // Tank: high AC or high HP relative to CR
  if (monster.ac >= 17 || monster.hp >= crToNumeric(monster.cr) * 20 + 50) {
    roles.push('tank');
  }

  // Artillery: ranged attacks with long range
  if (allText.includes('ranged') || allText.includes('60-foot') || allText.includes('90-foot') ||
      allText.includes('120-foot') || allText.includes('breath')) {
    roles.push('artillery');
  }

  // Skirmisher: high DEX + mobility
  if (monster.dex >= 16 && (allText.includes('disengage') || allText.includes('nimble') ||
      allText.includes('flyby') || allText.includes('fly'))) {
    roles.push('skirmisher');
  }

  // Support: healing, buffing, or raising
  if (allText.includes('heal') || allText.includes('leadership') || allText.includes('inspire')) {
    roles.push('support');
  }

  if (roles.length === 0) {
    roles.push(monster.str >= monster.dex ? 'striker' : 'skirmisher');
  }

  return roles;
}

function getMonsterTheme(monster: MonsterRow): string[] {
  const themes: string[] = [];
  const type = monster.type.toLowerCase();

  if (type === 'undead') themes.push('undead', 'dungeon', 'horror');
  if (type === 'beast') themes.push('wilderness', 'forest', 'hunt');
  if (type === 'dragon') themes.push('dragon', 'lair', 'hoard');
  if (type === 'fiend') themes.push('evil', 'dungeon', 'horror', 'planar');
  if (type === 'celestial') themes.push('divine', 'planar');
  if (type === 'elemental') themes.push('elemental', 'planar');
  if (type === 'aberration') themes.push('horror', 'dungeon', 'underdark');
  if (type === 'humanoid') themes.push('social', 'ambush', 'bandit', 'dungeon');
  if (type === 'monstrosity') themes.push('wilderness', 'dungeon', 'hunt');
  if (type === 'construct') themes.push('dungeon', 'guardian', 'lair');
  if (type === 'plant') themes.push('forest', 'wilderness', 'swamp');
  if (type === 'ooze') themes.push('dungeon', 'sewer', 'cave');
  if (type === 'fey') themes.push('forest', 'feywild', 'trickery');
  if (type === 'giant') themes.push('wilderness', 'mountain', 'stronghold');

  return themes;
}

interface SuggestedEncounter {
  monsters: { name: string; cr: string; count: number; roles: MonsterRole[] }[];
  totalXp: number;
  adjustedXp: number;
  tacticalNote: string;
}

function generateTacticalNote(monsters: { name: string; roles: MonsterRole[]; count: number }[]): string {
  if (monsters.length === 1 && monsters[0].count === 1) {
    const roles = monsters[0].roles;
    if (roles.includes('controller')) return `${monsters[0].name} controls the battlefield — expect crowd control and conditions.`;
    if (roles.includes('tank')) return `${monsters[0].name} is a damage sponge — focus fire or find weaknesses.`;
    if (roles.includes('artillery')) return `${monsters[0].name} attacks from range — close the distance quickly.`;
    return `Solo ${monsters[0].name} — action economy favors the party, but watch for legendary actions.`;
  }

  if (monsters.length === 2) {
    const leaderRoles = monsters[0].roles;
    const minionRoles = monsters[1].roles;
    if (leaderRoles.includes('controller') && minionRoles.includes('striker')) {
      return `${monsters[0].name} controls while ${monsters[1].name}${monsters[1].count > 1 ? 's' : ''} deal damage. Neutralize the controller first.`;
    }
    if (leaderRoles.includes('striker') && minionRoles.includes('skirmisher')) {
      return `${monsters[0].name} holds attention while ${monsters[1].name}${monsters[1].count > 1 ? 's' : ''} flank. Watch your backline.`;
    }
    return `${monsters[0].name} leads with ${monsters[1].count}× ${monsters[1].name} — mixed threat, prioritize the stronger one.`;
  }

  const roleSet = new Set(monsters.flatMap((m) => m.roles));
  if (roleSet.has('controller') && roleSet.has('striker')) {
    return 'Mixed tactical group — controller + strikers. Break concentration first, then focus fire.';
  }
  return 'Group encounter — use AoE to thin numbers, then eliminate the biggest threat.';
}

export function registerSuggestEncounter(
  server: McpServer,
  db: Database.Database,
): void {
  server.registerTool(
    'suggest_encounter',
    {
      description:
        'Suggest tactically interesting D&D 5e encounter compositions. Goes beyond XP math to recommend monster synergies, role combinations, and tactical notes.',
      inputSchema: {
        party_size: z.number().min(1).max(10).describe('Number of party members'),
        party_level: z.number().min(1).max(20).describe('Average party level'),
        difficulty: z.enum(['easy', 'medium', 'hard', 'deadly']).default('medium').describe('Target difficulty'),
        theme: z.string().optional().describe('Optional theme filter (e.g. "undead", "forest", "dungeon", "ambush", "horror")'),
        num_suggestions: z.number().min(1).max(5).default(3).describe('Number of encounter suggestions'),
      },
    },
    async ({ party_size, party_level, difficulty, theme, num_suggestions }) => {
      const budgets = calculatePartyBudget(party_size, party_level);
      const budget = budgets[difficulty as Difficulty];

      const crMax = party_level + 3;
      const monsters = getMonstersByCrRange(db, 0, crMax);

      // Tag all monsters with roles and themes
      const taggedMonsters = monsters.map((m) => ({
        monster: m,
        roles: inferMonsterRoles(m),
        themes: getMonsterTheme(m),
        xp: getXpForCr(m.cr),
      }));

      // Filter by theme if provided
      const filtered = theme
        ? taggedMonsters.filter((t) => t.themes.some((th) => th.includes(theme.toLowerCase())))
        : taggedMonsters;

      if (filtered.length === 0) {
        return {
          content: [{
            type: 'text' as const,
            text: `No monsters found matching theme "${theme}" in CR range 0-${crMax}. Try a broader theme or remove the filter.`,
          }],
          isError: true,
        };
      }

      const suggestions: SuggestedEncounter[] = [];

      // Strategy 1: Single strong monster with mixed role
      for (const t of filtered) {
        if (suggestions.length >= num_suggestions) break;
        const adjusted = t.xp * getEncounterMultiplier(1);
        if (adjusted <= budget && adjusted >= budget * 0.6) {
          suggestions.push({
            monsters: [{ name: t.monster.name, cr: t.monster.cr, count: 1, roles: t.roles }],
            totalXp: t.xp,
            adjustedXp: adjusted,
            tacticalNote: generateTacticalNote([{ name: t.monster.name, roles: t.roles, count: 1 }]),
          });
        }
      }

      // Strategy 2: Leader + minions (different roles)
      const leaders = filtered.filter((t) => t.roles.includes('controller') || t.roles.includes('tank'));
      const minions = filtered.filter((t) => t.roles.includes('striker') || t.roles.includes('skirmisher'));

      for (const leader of leaders.slice(0, 10)) {
        if (suggestions.length >= num_suggestions) break;
        for (const minion of minions.slice(0, 10)) {
          if (suggestions.length >= num_suggestions) break;
          if (minion.monster.name === leader.monster.name) continue;
          if (crToNumeric(minion.monster.cr) >= crToNumeric(leader.monster.cr)) continue;

          for (const count of [2, 3, 4]) {
            const totalXp = leader.xp + minion.xp * count;
            const adjusted = totalXp * getEncounterMultiplier(1 + count);
            if (adjusted <= budget && adjusted >= budget * 0.5) {
              suggestions.push({
                monsters: [
                  { name: leader.monster.name, cr: leader.monster.cr, count: 1, roles: leader.roles },
                  { name: minion.monster.name, cr: minion.monster.cr, count, roles: minion.roles },
                ],
                totalXp,
                adjustedXp: adjusted,
                tacticalNote: generateTacticalNote([
                  { name: leader.monster.name, roles: leader.roles, count: 1 },
                  { name: minion.monster.name, roles: minion.roles, count },
                ]),
              });
              break;
            }
          }
        }
      }

      // Strategy 3: Same-type group with varied roles
      for (const t of filtered) {
        if (suggestions.length >= num_suggestions) break;
        for (const count of [3, 4, 5]) {
          const totalXp = t.xp * count;
          const adjusted = totalXp * getEncounterMultiplier(count);
          if (adjusted <= budget && adjusted >= budget * 0.5) {
            suggestions.push({
              monsters: [{ name: t.monster.name, cr: t.monster.cr, count, roles: t.roles }],
              totalXp,
              adjustedXp: adjusted,
              tacticalNote: generateTacticalNote([{ name: t.monster.name, roles: t.roles, count }]),
            });
            break;
          }
        }
      }

      // Deduplicate and limit
      const unique = suggestions.slice(0, num_suggestions);

      if (unique.length === 0) {
        return {
          content: [{
            type: 'text' as const,
            text: `No encounter combinations found within the ${difficulty} budget (${budget.toLocaleString()} XP) for the given filters. Try a different difficulty or remove the theme filter.`,
          }],
        };
      }

      const lines: string[] = [];
      lines.push('# Encounter Suggestions');
      lines.push('');
      lines.push(`**Party:** ${party_size} at level ${party_level} | **Difficulty:** ${difficulty} | **Budget:** ${budget.toLocaleString()} XP`);
      if (theme) lines.push(`**Theme:** ${theme}`);
      lines.push('');

      for (let i = 0; i < unique.length; i++) {
        const enc = unique[i];
        lines.push(`## Option ${i + 1}`);
        lines.push('');
        for (const m of enc.monsters) {
          const countStr = m.count > 1 ? `${m.count}× ` : '';
          lines.push(`- ${countStr}**${m.name}** (CR ${m.cr}) — *${m.roles.join(', ')}*`);
        }
        lines.push(`- *XP:* ${enc.totalXp.toLocaleString()} raw, ${enc.adjustedXp.toLocaleString()} adjusted`);
        lines.push('');
        lines.push(`**Tactics:** ${enc.tacticalNote}`);
        lines.push('');
      }

      return {
        content: [{ type: 'text' as const, text: lines.join('\n') }],
      };
    },
  );
}
