import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import type Database from 'better-sqlite3';
import {
  searchRules,
  listConditions,
  getConditionByName,
} from '../data/db.js';

export function registerSearchRules(
  server: McpServer,
  db: Database.Database,
): void {
  server.registerTool(
    'search_rules',
    {
      description:
        'Search D&D 5e SRD rules and conditions. Look up specific conditions or search rules text.',
      inputSchema: {
        query: z
          .string()
          .optional()
          .describe('Full-text search query for rules'),
        condition_name: z
          .string()
          .optional()
          .describe('Name of a specific condition to look up'),
      },
    },
    async ({ query, condition_name }) => {
      // Mode 1: Specific condition
      if (condition_name) {
        return handleCondition(db, condition_name);
      }

      // Mode 2: Full-text search rules
      if (query) {
        return handleRulesSearch(db, query);
      }

      // Mode 3: List all conditions
      return handleListConditions(db);
    },
  );
}

function handleCondition(db: Database.Database, conditionName: string) {
  const condition = getConditionByName(db, conditionName);
  if (!condition) {
    const allConditions = listConditions(db);
    const available = allConditions.map((c) => c.name).join(', ');
    return {
      content: [
        {
          type: 'text' as const,
          text: `Condition "${conditionName}" not found. Available conditions: ${available}`,
        },
      ],
      isError: true,
    };
  }

  const text = [
    `${condition.name}`,
    '='.repeat(40),
    condition.description,
  ].join('\n');

  return { content: [{ type: 'text' as const, text }] };
}

function handleRulesSearch(db: Database.Database, query: string) {
  const rules = searchRules(db, query);
  if (rules.length === 0) {
    return {
      content: [
        {
          type: 'text' as const,
          text: `No rules found matching "${query}".`,
        },
      ],
    };
  }

  const lines = rules.map((rule) => {
    const preview =
      rule.description.length > 200
        ? rule.description.slice(0, 200) + '...'
        : rule.description;
    return `${rule.name} [${rule.section}]\n  ${preview}`;
  });

  const text = `Rules matching "${query}" (${rules.length} results)\n${'='.repeat(40)}\n\n${lines.join('\n\n')}`;
  return { content: [{ type: 'text' as const, text }] };
}

function handleListConditions(db: Database.Database) {
  const conditions = listConditions(db);
  if (conditions.length === 0) {
    return {
      content: [
        { type: 'text' as const, text: 'No conditions found in the database.' },
      ],
    };
  }

  const lines = conditions.map((c) => {
    const preview =
      c.description.length > 150
        ? c.description.slice(0, 150) + '...'
        : c.description;
    return `${c.name}\n  ${preview}`;
  });

  const text = `D&D 5e SRD Conditions (${conditions.length})\n${'='.repeat(40)}\n\n${lines.join('\n\n')}`;
  return { content: [{ type: 'text' as const, text }] };
}
