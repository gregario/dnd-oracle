#!/usr/bin/env node

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { getDatabase } from './data/db.js';
import { registerSearchMonsters } from './tools/search-monsters.js';
import { registerSearchSpells } from './tools/search-spells.js';
import { registerSearchEquipment } from './tools/search-equipment.js';
import { registerBrowseClasses } from './tools/browse-classes.js';
import { registerBrowseRaces } from './tools/browse-races.js';
import { registerSearchRules } from './tools/search-rules.js';
import { registerBuildEncounter } from './tools/build-encounter.js';
import { registerPlanSpells } from './tools/plan-spells.js';
import { registerCompareMonsters } from './tools/compare-monsters.js';
import { registerAnalyzeLoadout } from './tools/analyze-loadout.js';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import type Database from 'better-sqlite3';

export interface ServerOptions {
  db?: Database.Database;
  dataDir?: string;
}

export function createServer(options?: ServerOptions): McpServer {
  const __dirname = path.dirname(fileURLToPath(import.meta.url));
  let version = '0.0.0';
  try {
    const pkg = JSON.parse(
      readFileSync(path.join(__dirname, '..', 'package.json'), 'utf-8'),
    );
    version = pkg.version;
  } catch {
    // Fallback version if package.json not found (e.g., in tests)
  }

  const server = new McpServer({
    name: 'dnd-oracle',
    version,
  });

  const db = options?.db ?? getDatabase(options?.dataDir);

  // Register reference tools
  registerSearchMonsters(server, db);
  registerSearchSpells(server, db);
  registerSearchEquipment(server, db);
  registerBrowseClasses(server, db);
  registerBrowseRaces(server, db);
  registerSearchRules(server, db);

  // Register analytical tools
  registerBuildEncounter(server, db);
  registerPlanSpells(server, db);
  registerCompareMonsters(server, db);
  registerAnalyzeLoadout(server, db);

  return server;
}

// Only start stdio when run directly
const isMain =
  process.argv[1] &&
  fileURLToPath(import.meta.url).includes(process.argv[1]);
if (isMain) {
  console.error('dnd-oracle MCP server starting...');
  const server = createServer();
  const transport = new StdioServerTransport();
  await server.connect(transport);
  process.on('SIGINT', async () => {
    await server.close();
    process.exit(0);
  });
  process.on('SIGTERM', async () => {
    await server.close();
    process.exit(0);
  });
}
