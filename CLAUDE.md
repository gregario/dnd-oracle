# dnd-oracle

D&D 5e SRD MCP server. 10 tools, 103 tests, 1198 entities.

## Stack
- TypeScript + MCP SDK + better-sqlite3 + FTS5
- Follows MCP stack profile (`stacks/mcp/`)
- Same oracle pattern as lorcana-oracle, 3dprint-oracle

## Commands
- `npm test` — run tests (vitest)
- `npm run build` — compile + bundle SQLite
- `npm run fetch-data` — re-fetch SRD data from 5e-bits/5e-database
- `npm run dev` — run server via tsx

## Data
- Source: 5e-bits/5e-database (CC-BY-4.0)
- 334 monsters, 319 spells, 237 equipment, 239 magic items, 12 classes, 9 races, 15 conditions, 33 rules
- SQLite with FTS5 for full-text search
- Database bundled in dist/ at build time

## Attribution
This product includes material from the System Reference Document 5.1, Copyright 2016, Wizards of the Coast, Inc. Licensed under CC-BY-4.0.
