import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import type Database from 'better-sqlite3';
import { getMagicItemByName } from '../data/db.js';
import type { MagicItemRow } from '../types.js';

export function registerMagicItemAttunement(
  server: McpServer,
  db: Database.Database,
): void {
  server.registerTool(
    'magic_item_attunement',
    {
      description:
        'Analyze attunement requirements for a set of magic items. Reports which items require attunement, any class/alignment restrictions, and warns if the total exceeds the 3-slot limit.',
      inputSchema: {
        item_names: z
          .array(z.string())
          .min(1)
          .max(20)
          .describe('Names of magic items to check'),
        current_attunement: z
          .number()
          .min(0)
          .max(3)
          .optional()
          .describe('Number of attunement slots already in use (0-3)'),
      },
    },
    async ({ item_names, current_attunement }) => {
      const found: MagicItemRow[] = [];
      const notFound: string[] = [];

      for (const name of item_names) {
        const item = getMagicItemByName(db, name);
        if (item) {
          found.push(item);
        } else {
          notFound.push(name);
        }
      }

      if (found.length === 0) {
        return {
          content: [{
            type: 'text' as const,
            text: `No magic items found: ${notFound.join(', ')}. Use search_equipment with a rarity filter to find magic items.`,
          }],
          isError: true,
        };
      }

      const lines: string[] = [];
      lines.push('# Magic Item Attunement Analysis');
      lines.push('');

      if (notFound.length > 0) {
        lines.push(`**Not found:** ${notFound.join(', ')}`);
        lines.push('');
      }

      // Categorize
      const needsAttunement = found.filter((i) => i.requires_attunement);
      const noAttunement = found.filter((i) => !i.requires_attunement);

      // Summary table
      lines.push('| Item | Rarity | Attunement | Restriction |');
      lines.push('|------|--------|-----------|-------------|');

      for (const item of found) {
        const attStr = item.requires_attunement ? 'Yes' : 'No';
        const restriction = item.attunement_description
          ? item.attunement_description.replace(/^requires attunement\s*/i, '').trim() || '—'
          : '—';
        lines.push(`| ${item.name} | ${item.rarity} | ${attStr} | ${restriction} |`);
      }
      lines.push('');

      // Attunement budget
      const slotsNeeded = needsAttunement.length;
      const slotsUsed = current_attunement ?? 0;
      const slotsAvailable = 3 - slotsUsed;

      lines.push('## Attunement Budget');
      lines.push('');
      lines.push(`- **Slots used:** ${slotsUsed}/3`);
      lines.push(`- **Items needing attunement:** ${slotsNeeded}`);
      lines.push(`- **Slots available:** ${slotsAvailable}`);
      lines.push('');

      if (slotsNeeded > slotsAvailable) {
        const excess = slotsNeeded - slotsAvailable;
        lines.push(`**⚠ OVER LIMIT:** You need ${slotsNeeded} attunement slots but only have ${slotsAvailable} available. You must drop ${excess} item${excess > 1 ? 's' : ''}.`);
        lines.push('');
      } else if (slotsNeeded === slotsAvailable) {
        lines.push('**At capacity** — no room for additional attuned items.');
        lines.push('');
      } else {
        lines.push(`**${slotsAvailable - slotsNeeded} slot${slotsAvailable - slotsNeeded > 1 ? 's' : ''} remaining** after equipping all listed items.`);
        lines.push('');
      }

      // List items by category
      if (needsAttunement.length > 0) {
        lines.push('## Requires Attunement');
        lines.push('');
        for (const item of needsAttunement) {
          const restriction = item.attunement_description
            ? ` — *${item.attunement_description}*`
            : '';
          lines.push(`- **${item.name}** (${item.rarity})${restriction}`);
        }
        lines.push('');
      }

      if (noAttunement.length > 0) {
        lines.push('## No Attunement Required');
        lines.push('');
        for (const item of noAttunement) {
          lines.push(`- **${item.name}** (${item.rarity})`);
        }
        lines.push('');
      }

      return {
        content: [{ type: 'text' as const, text: lines.join('\n') }],
      };
    },
  );
}
