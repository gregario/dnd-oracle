## Why

DMs and D&D players using AI assistants have no reliable, offline way to look up SRD content or perform game-mechanical calculations without hallucination risk. Eight existing D&D MCP servers are all runtime API wrappers that require internet connectivity, none are published on npm, and none have test suites. The 5e SRD 5.1 is available under CC-BY-4.0 (irrevocable) from 5e-bits/5e-database as structured JSON — ready to bundle into a self-contained oracle following the proven pattern (lorcana-oracle, 3dprint-oracle, mtg-oracle). This would be the first D&D MCP server on npm.

## What Changes

- New MCP server: `dnd-oracle` providing 10 tools for D&D 5e SRD data
- Bundled static dataset from 5e-bits/5e-database (CC-BY-4.0, ~1,500 entities across 25 JSON files)
- Build-time data ingestion with SQLite + FTS5 for fast search (same pattern as lorcana-oracle)
- 6 reference tools: monster search, spell search, equipment/magic item search, class browser with multiclass support, race browser, rules/conditions search
- 4 analytical tools: encounter CR builder, spell planner with concentration/ritual/component tracking, monster comparison, equipment loadout calculator
- All tools operate on ground-truth SRD data fields — zero LLM inference

## Capabilities

### New Capabilities
- `monster-search`: Full-text search across monsters with filtering by CR, type, size, alignment. Returns full stat blocks with abilities, actions, resistances, immunities.
- `spell-search`: Full-text search across spells with filtering by level, school, class, concentration, ritual, components, damage type, and save type.
- `equipment-search`: Full-text search across weapons, armor, adventuring gear, and magic items. Filter by category, cost, weight, weapon properties, armor type, magic item rarity.
- `class-browsing`: Browse class features at any level, subclass info, hit die, saving throws, proficiencies. Multiclass feature combination calculator showing combined features from multiple class levels.
- `race-browsing`: Browse race traits, ability score bonuses, speed, size, languages, and subraces with trait details.
- `rules-search`: Full-text search across rules sections and conditions. Quick condition reference with mechanical effects.
- `encounter-building`: Build balanced encounters given party size, level, and difficulty. Deterministic CR-to-XP conversion and difficulty threshold math from the SRD. Suggests monster combinations that fit the XP budget.
- `spell-planning`: Show available spells for a class at a given level with remaining slot tracking. Concentration conflict detection, ritual spell highlighting, and material component shopping list with GP costs.
- `monster-comparison`: Side-by-side stat comparison of 2-3 monsters covering AC, HP, ability scores, speeds, resistances, immunities, actions, and special abilities.
- `loadout-analysis`: Analyze an equipment list for total weight, total cost, encumbrance status (based on Strength score), and AC breakdown from armor and shields.

### Modified Capabilities

(none — new project)

## Impact

- New npm package: `dnd-oracle`
- Dependencies: `@modelcontextprotocol/sdk`, `zod`, `better-sqlite3` (runtime), 5e-bits/5e-database JSON files (build-time)
- No external API dependencies at runtime — fully self-contained with bundled SQLite database
- Distribution: stdio transport, npx-compatible
- Attribution: "This product includes material from the System Reference Document 5.1, Copyright 2016, Wizards of the Coast, Inc. Licensed under CC-BY-4.0."
