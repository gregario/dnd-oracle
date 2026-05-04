import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import type Database from 'better-sqlite3';
import { getClassByName } from '../data/db.js';
import { FULL_CASTERS, HALF_CASTERS, getSpellSlots } from '../lib/class-mechanics.js';

interface RecoveryEntry {
  name: string;
  recoversOn: 'short' | 'long';
  details: string;
}

function getClassRecovery(className: string, level: number): RecoveryEntry[] {
  const name = className.toLowerCase();
  const entries: RecoveryEntry[] = [];

  // Universal
  entries.push({
    name: 'Hit Dice',
    recoversOn: 'short',
    details: `Spend up to ${Math.floor(level / 2) || 1} hit dice to heal (roll die + CON mod per die)`,
  });
  entries.push({
    name: 'Hit Dice Recovery',
    recoversOn: 'long',
    details: `Regain up to ${Math.max(1, Math.floor(level / 2))} spent hit dice`,
  });
  entries.push({
    name: 'Hit Points',
    recoversOn: 'long',
    details: 'All hit points restored',
  });

  // Full/half caster spell slots
  if (FULL_CASTERS.has(name) || HALF_CASTERS.has(name)) {
    entries.push({
      name: 'Spell Slots',
      recoversOn: 'long',
      details: 'All expended spell slots restored',
    });
  }

  if (name === 'warlock') {
    entries.push({
      name: 'Pact Magic Slots',
      recoversOn: 'short',
      details: 'All pact magic spell slots restored',
    });
  }

  // Class-specific
  switch (name) {
    case 'fighter':
      entries.push({
        name: 'Second Wind',
        recoversOn: 'short',
        details: `Regain 1 use (heal 1d10 + ${level} HP as bonus action)`,
      });
      if (level >= 2) {
        entries.push({
          name: 'Action Surge',
          recoversOn: 'short',
          details: `Regain ${level >= 17 ? '2 uses' : '1 use'}`,
        });
      }
      if (level >= 9) {
        entries.push({
          name: 'Indomitable',
          recoversOn: 'long',
          details: `Regain ${level >= 17 ? '3 uses' : level >= 13 ? '2 uses' : '1 use'}`,
        });
      }
      break;

    case 'wizard':
      entries.push({
        name: 'Arcane Recovery',
        recoversOn: 'short',
        details: `Recover spell slots totaling up to ${Math.ceil(level / 2)} levels (once per day, no slots above 5th)`,
      });
      break;

    case 'cleric':
      if (level >= 2) {
        entries.push({
          name: 'Channel Divinity',
          recoversOn: 'short',
          details: `Regain ${level >= 18 ? '3 uses' : level >= 6 ? '2 uses' : '1 use'}`,
        });
      }
      if (level >= 10) {
        entries.push({
          name: 'Divine Intervention',
          recoversOn: 'long',
          details: 'Regain use (if it succeeded)',
        });
      }
      break;

    case 'bard':
      entries.push({
        name: 'Bardic Inspiration',
        recoversOn: level >= 5 ? 'short' : 'long',
        details: `Regain all uses (CHA mod, min 1). ${level >= 5 ? 'Recovers on short rest at level 5+' : 'Long rest only until level 5'}`,
      });
      break;

    case 'druid':
      entries.push({
        name: 'Wild Shape',
        recoversOn: 'short',
        details: `Regain ${level >= 20 ? 'unlimited' : '2'} uses`,
      });
      break;

    case 'paladin':
      entries.push({
        name: 'Lay on Hands',
        recoversOn: 'long',
        details: `Pool restored to ${level * 5} HP`,
      });
      if (level >= 2) {
        entries.push({
          name: 'Divine Smite Slots',
          recoversOn: 'long',
          details: 'Spell slots restored (used for smites)',
        });
      }
      if (level >= 3) {
        entries.push({
          name: 'Channel Divinity',
          recoversOn: 'short',
          details: 'Regain 1 use',
        });
      }
      break;

    case 'ranger':
      // Rangers have minimal short-rest recovery in SRD
      break;

    case 'rogue':
      // Rogues have no resource recovery — their features are passive
      break;

    case 'monk':
      entries.push({
        name: 'Ki Points',
        recoversOn: 'short',
        details: `Regain all ${level} ki points`,
      });
      break;

    case 'sorcerer':
      entries.push({
        name: 'Sorcery Points',
        recoversOn: 'long',
        details: `Regain all ${level} sorcery points`,
      });
      break;

    case 'barbarian':
      entries.push({
        name: 'Rage',
        recoversOn: 'long',
        details: `Regain all uses (${level >= 17 ? '6' : level >= 12 ? '5' : level >= 6 ? '4' : level >= 3 ? '3' : '2'} rages)`,
      });
      break;
  }

  return entries;
}

export function registerRestCalculator(
  server: McpServer,
  db: Database.Database,
): void {
  server.registerTool(
    'rest_calculator',
    {
      description:
        'Show what recovers on a short rest vs. long rest for a D&D 5e character. Lists all class-specific resources and their recovery cadence.',
      inputSchema: {
        class_name: z.string().describe('Class name (e.g. "Fighter", "Wizard")'),
        level: z.number().min(1).max(20).describe('Character level'),
      },
    },
    async ({ class_name, level }) => {
      const cls = getClassByName(db, class_name);
      if (!cls) {
        return {
          content: [{ type: 'text' as const, text: `Class "${class_name}" not found.` }],
          isError: true,
        };
      }

      const recovery = getClassRecovery(cls.name, level);
      const shortRest = recovery.filter((r) => r.recoversOn === 'short');
      const longRest = recovery.filter((r) => r.recoversOn === 'long');

      const lines: string[] = [];
      lines.push(`# Rest Recovery: ${cls.name} Level ${level}`);
      lines.push('');

      // Spell slots context
      const slots = getSpellSlots(cls.name, level);
      if (slots.length > 0) {
        const labels = slots.map((_, i) => {
          const n = i + 1;
          return n === 1 ? '1st' : n === 2 ? '2nd' : n === 3 ? '3rd' : `${n}th`;
        });
        lines.push('**Spell Slots:**');
        lines.push(`| ${labels.join(' | ')} |`);
        lines.push(`|${labels.map(() => '---').join('|')}|`);
        lines.push(`| ${slots.join(' | ')} |`);
        lines.push('');
      }

      lines.push('## Short Rest Recovery');
      lines.push('');
      if (shortRest.length === 0) {
        lines.push('*Nothing recovers on a short rest for this class.*');
      } else {
        lines.push('| Resource | Recovery |');
        lines.push('|----------|----------|');
        for (const r of shortRest) {
          lines.push(`| ${r.name} | ${r.details} |`);
        }
      }
      lines.push('');

      lines.push('## Long Rest Recovery');
      lines.push('');
      lines.push('| Resource | Recovery |');
      lines.push('|----------|----------|');
      for (const r of longRest) {
        lines.push(`| ${r.name} | ${r.details} |`);
      }
      lines.push('');

      // Tactical advice
      lines.push('## Rest Guidance');
      lines.push('');
      const shortRestValue = shortRest.filter((r) => r.name !== 'Hit Dice').length;
      if (shortRestValue >= 2) {
        lines.push('**High short-rest value** — this class benefits significantly from short rests. Push for 2 short rests per adventuring day.');
      } else if (shortRestValue === 1) {
        lines.push('**Moderate short-rest value** — some recovery on short rests but primarily long-rest dependent.');
      } else {
        lines.push('**Low short-rest value** — this class is primarily long-rest dependent. Short rests mainly provide hit dice healing.');
      }

      return {
        content: [{ type: 'text' as const, text: lines.join('\n') }],
      };
    },
  );
}
