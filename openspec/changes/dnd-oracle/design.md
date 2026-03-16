## Context

D&D 5e's System Reference Document (SRD 5.1) contains the core rules, classes, races, spells, monsters, equipment, and magic items released under CC-BY-4.0 by Wizards of the Coast. The 5e-bits/5e-database GitHub repo provides this data as 25 structured JSON files. This server follows the proven oracle pattern (lorcana-oracle, 3dprint-oracle): build-time data ingestion into SQLite with FTS5, bundled in the npm package, zero runtime API dependencies.

## Goals / Non-Goals

**Goals:**
- Ship an MCP server with 10 tools (6 reference + 4 analytical) covering the 5e SRD
- All tools operate exclusively on ground-truth data — no LLM inference
- Bundle 5e-bits/5e-database data into SQLite at build time
- Publish to npm as `dnd-oracle` — first D&D MCP server on npm
- Follow existing oracle patterns for consistency and fast development

**Non-Goals:**
- Content beyond SRD 5.1 (Kobold Press, Level Up A5e, SRD 5.2 are future follow-ups)
- Campaign management, session notes, or persistent game state
- Dice rolling (trivial, well-served by other tools)
- Character sheet management or character creation wizards
- AI-generated content ("generate an NPC backstory", "recommend a build")
- Images or maps

## Decisions

### Data Source: 5e-bits/5e-database

25 JSON files from `/src/2014/` directory. CC-BY-4.0 license on the SRD content, MIT on the repo code. Well-structured with consistent schemas per entity type.

Alternative considered: Open5e API data files. Rejected because Open5e includes third-party OGL content (Kobold Press, etc.) which adds licensing complexity. For v1, pure SRD under CC-BY-4.0 is cleaner.

Alternative considered: dnd5eapi.co (runtime API calls). Rejected because it adds a runtime dependency, requires internet, and adds latency. The oracle pattern bundles data.

### Storage: Build-time SQLite with FTS5

Same pattern as lorcana-oracle. A build script downloads the JSON files, transforms them, and loads into SQLite tables. The db ships with the npm package.

Tables:
- `monsters` — name, size, type, alignment, ac, hp, hit_dice, speed (JSON), ability scores (6 cols), cr, xp, senses, languages, traits (JSON), actions (JSON), legendary_actions (JSON), resistances, immunities, vulnerabilities, condition_immunities
- `spells` — name, level, school, casting_time, range, duration, concentration, ritual, components_v, components_s, components_m, material_description, classes (JSON), description, higher_level
- `equipment` — name, category, cost_gp, weight, description, weapon_properties (JSON), damage_dice, damage_type, armor_category, ac_base, ac_dex_bonus, stealth_disadvantage
- `magic_items` — name, rarity, type, requires_attunement, description
- `classes` — name, hit_die, saving_throws (JSON), proficiencies (JSON), spellcasting_ability, features (JSON array with level + name + description)
- `races` — name, speed, size, ability_bonuses (JSON), traits (JSON), languages (JSON), subraces (JSON)
- `conditions` — name, description
- `rules` — name, section, description
- `monsters_fts`, `spells_fts`, `equipment_fts`, `rules_fts` — FTS5 virtual tables

### Tool Count: 10 tools

The MCP stack recommends 3-5. We have 10, but they serve two distinct categories (6 reference + 4 analytical) with zero overlap:

Reference: search_monsters, search_spells, search_equipment, browse_classes, browse_races, search_rules
Analytical: build_encounter, plan_spells, compare_monsters, analyze_loadout

The analytical tools are the key differentiator from competitors. All 8 existing D&D MCP servers have reference lookup; none have ground-truth analytical tools.

### Encounter Building Math

The SRD defines encounter difficulty thresholds per character level and XP values per CR. The algorithm:
1. Look up XP thresholds for party (Easy/Medium/Hard/Deadly per level × party size)
2. Sum the target XP for the chosen difficulty
3. Find monster combinations whose total XP (adjusted for number of monsters per DMG multiplier table) fits the budget
4. Return suggested monster groups

This is pure arithmetic on SRD tables — no estimation or AI.

### Spell Planning

Given a class and level, the spellcasting table defines available spell slots. The spell list defines which spells that class can cast. Combining these:
1. Show all spells available to the class up to their max spell level
2. If remaining slots are provided, highlight what can still be cast
3. Flag concentration spells (only one at a time)
4. Highlight ritual spells (can be cast without slots)
5. Sum material component costs for prepared spells

## Risks / Trade-offs

- **[SRD content is limited]** → Only 1 background (Acolyte), 1 feat (Grappler), 9 races. This is a known SRD limitation, not a product issue. Mitigation: the core content (334 monsters, 319 spells, 12 classes) is substantial. v2 can add CC-BY-4.0 third-party content.
- **[Dataset size growth]** → ~1,500 entities is tiny. SQLite handles this trivially.
- **[Encounter building precision]** → The DMG encounter math is notoriously imprecise at high levels. Mitigation: we implement the official formula faithfully — we don't fix WotC's math, we just automate it.
- **[Multiclass complexity]** → Multiclass spell slot calculation has edge cases (Paladin/Ranger count as half-casters, Arcane Trickster/Eldritch Knight as third-casters). Mitigation: implement the official multiclass spellcasting table from the SRD exactly.
