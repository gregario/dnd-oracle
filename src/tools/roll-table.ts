import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import type Database from 'better-sqlite3';
import { listRollableTables, getRollableTableByName, searchRollableTables } from '../data/db.js';
import { safeParseJson } from '../lib/format.js';

interface TableEntry {
  min: number;
  max: number;
  text: string;
}

export function registerRollTable(
  server: McpServer,
  db: Database.Database,
): void {
  server.registerTool(
    'roll_table',
    {
      description:
        'Roll on or browse D&D 5e SRD random tables (madness, poisons, diseases, personality traits). Use table_name "list" to see all available tables, or provide a specific table name with an optional roll result.',
      inputSchema: {
        table_name: z.string().describe('Name of the table (e.g. "Short-Term Madness", "Poisons") or "list" to see all tables'),
        roll: z.number().optional().describe('A specific die roll result. If omitted, shows the full table.'),
      },
    },
    async ({ table_name, roll }) => {
      // List mode
      if (table_name.toLowerCase() === 'list') {
        const tables = listRollableTables(db);
        if (tables.length === 0) {
          return {
            content: [{ type: 'text' as const, text: 'No rollable tables found in the database.' }],
          };
        }

        const lines: string[] = [];
        lines.push('# Available Random Tables');
        lines.push('');

        const byCategory = new Map<string, typeof tables>();
        for (const t of tables) {
          const list = byCategory.get(t.category) ?? [];
          list.push(t);
          byCategory.set(t.category, list);
        }

        for (const [category, items] of byCategory) {
          lines.push(`## ${category.charAt(0).toUpperCase() + category.slice(1)}`);
          lines.push('');
          for (const t of items) {
            lines.push(`- **${t.name}** (${t.die_type}) — ${t.description ?? ''}`);
          }
          lines.push('');
        }

        return {
          content: [{ type: 'text' as const, text: lines.join('\n') }],
        };
      }

      // Lookup specific table
      let table = getRollableTableByName(db, table_name);
      if (!table) {
        // Try FTS search
        const results = searchRollableTables(db, table_name);
        if (results.length === 1) {
          table = results[0];
        } else if (results.length > 1) {
          const names = results.map((r) => r.name).join(', ');
          return {
            content: [{
              type: 'text' as const,
              text: `Multiple tables match "${table_name}": ${names}. Please use the exact name.`,
            }],
            isError: true,
          };
        } else {
          return {
            content: [{
              type: 'text' as const,
              text: `Table "${table_name}" not found. Use roll_table with table_name "list" to see available tables.`,
            }],
            isError: true,
          };
        }
      }

      const entries = safeParseJson<TableEntry[]>(table.entries);
      if (!entries || entries.length === 0) {
        return {
          content: [{ type: 'text' as const, text: `Table "${table.name}" has no entries.` }],
          isError: true,
        };
      }

      const lines: string[] = [];

      // If a roll was provided, return just that result
      if (roll !== undefined) {
        const entry = entries.find((e) => roll >= e.min && roll <= e.max);
        if (!entry) {
          return {
            content: [{
              type: 'text' as const,
              text: `Roll ${roll} is out of range for ${table.name} (${table.die_type}, range ${entries[0].min}-${entries[entries.length - 1].max}).`,
            }],
            isError: true,
          };
        }

        lines.push(`# ${table.name}`);
        lines.push('');
        lines.push(`**Roll:** ${roll} (${table.die_type})`);
        lines.push('');
        const rangeStr = entry.min === entry.max ? `${entry.min}` : `${entry.min}–${entry.max}`;
        lines.push(`**Result (${rangeStr}):** ${entry.text}`);

        if (table.description) {
          lines.push('');
          lines.push(`*${table.description}*`);
        }

        return {
          content: [{ type: 'text' as const, text: lines.join('\n') }],
        };
      }

      // Show full table
      lines.push(`# ${table.name}`);
      lines.push('');
      if (table.description) {
        lines.push(`*${table.description}*`);
        lines.push('');
      }
      lines.push(`**Die:** ${table.die_type}`);
      lines.push('');
      lines.push('| Roll | Effect |');
      lines.push('|------|--------|');
      for (const entry of entries) {
        const rangeStr = entry.min === entry.max ? `${entry.min}` : `${entry.min}–${entry.max}`;
        lines.push(`| ${rangeStr} | ${entry.text} |`);
      }

      return {
        content: [{ type: 'text' as const, text: lines.join('\n') }],
      };
    },
  );
}
