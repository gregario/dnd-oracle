# dnd-oracle

D&D 5e SRD MCP server — monster search, spell lookup, encounter building, and character tools powered by ground-truth SRD data.

<p align="center">
  <a href="https://www.npmjs.com/package/dnd-oracle"><img src="https://img.shields.io/npm/v/dnd-oracle.svg" alt="npm version"></a>
  <a href="https://www.npmjs.com/package/dnd-oracle"><img src="https://img.shields.io/npm/dm/dnd-oracle.svg" alt="npm downloads"></a>
  <a href="https://nodejs.org"><img src="https://img.shields.io/badge/node-%3E%3D18-brightgreen.svg" alt="Node.js 18+"></a>
  <a href="https://modelcontextprotocol.io"><img src="https://img.shields.io/badge/MCP-compatible-purple.svg" alt="MCP Compatible"></a>
  <a href="LICENSE"><img src="https://img.shields.io/badge/license-MIT-blue.svg" alt="MIT License"></a>
  <a href="https://github.com/sponsors/gregario"><img src="https://img.shields.io/badge/sponsor-♥-ea4aaa.svg" alt="Sponsor"></a>
  <a href="https://glama.ai/mcp/servers/gregario/dnd-oracle"><img src="https://glama.ai/mcp/servers/gregario/dnd-oracle/badges/score.svg" alt="dnd-oracle MCP server"></a>
</p>

## What It Does

Search, browse, and analyze D&D 5e System Reference Document content — no internet required, no hallucination risk. All 20 tools operate on ground-truth SRD data bundled as a SQLite database.

**1,207 entities**: 334 monsters, 319 spells, 237 equipment items, 239 magic items, 12 classes, 9 races, 15 conditions, 33 rule sections, 9 rollable tables.

## Tools

### Reference (6)

| Tool | Description |
|------|-------------|
| `search_monsters` | Full-text search with CR, type, size, alignment filters. Returns full stat blocks. |
| `search_spells` | Search by level, school, class, concentration, ritual, damage type, save type. |
| `search_equipment` | Search weapons, armor, gear, and magic items. Filter by properties, rarity. |
| `browse_classes` | View class features at any level. Multiclass feature combination calculator. |
| `browse_races` | View race traits, ability bonuses, subraces. |
| `search_rules` | Search rules text and condition references. |

### Analytical (14)

| Tool | Description |
|------|-------------|
| `build_encounter` | Calculate XP budgets by difficulty. Suggests monster combinations within budget. |
| `suggest_encounter` | Tactically interesting encounters with monster role inference and synergy notes. |
| `plan_spells` | Available spells for class/level. Slot tracking, concentration flags, ritual highlights, component costs. |
| `compare_monsters` | Side-by-side stat comparison of 2-3 monsters. |
| `check_resistances` | Consolidated resistance/immunity matrix for a group of monsters. Party damage gap warnings. |
| `analyze_loadout` | Total weight, cost, AC breakdown, encumbrance status from equipment list. |
| `magic_item_attunement` | Attunement slot analysis with over-limit warnings and restriction checks. |
| `build_character` | Full character sheet from race + class + level + ability scores. HP, saves, DC, features. |
| `analyze_party` | Party composition audit: saving throw coverage, role balance, darkvision, languages. |
| `simulate_damage` | Average DPR calculator with hit probability, crit math, AC sensitivity, turns-to-kill. |
| `rest_calculator` | What recovers on short vs. long rest for any class at any level. |
| `travel_calculator` | Overland travel time with pace, terrain, mounts, and forced march rules. |
| `plan_adventuring_day` | Daily XP budget, encounter sequencing, resource pacing, rest placement. |
| `roll_table` | Roll on SRD random tables: madness, poisons, diseases, Acolyte personality traits. |

## Install

### Claude Desktop

Add to `~/Library/Application Support/Claude/claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "dnd-oracle": {
      "command": "npx",
      "args": ["-y", "dnd-oracle"]
    }
  }
}
```

### Claude Code

```bash
claude mcp add dnd-oracle -- npx -y dnd-oracle
```

## Data Source

This product includes material from the **System Reference Document 5.1**, Copyright 2016, Wizards of the Coast, Inc. Licensed under [CC-BY-4.0](https://creativecommons.org/licenses/by/4.0/).

Data sourced from [5e-bits/5e-database](https://github.com/5e-bits/5e-database).

## License

MIT
