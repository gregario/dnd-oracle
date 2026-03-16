## 1. Project Setup

- [ ] 1.1 Create package.json (name: dnd-oracle, type: module, bin, files, scripts, dependencies, mcpName)
- [ ] 1.2 Create tsconfig.json (ES2022, Node16 module, strict)
- [ ] 1.3 Update .gitignore (node_modules, dist, *.sqlite, *.db)
- [ ] 1.4 Install dependencies (@modelcontextprotocol/sdk, better-sqlite3, zod, vitest, tsx, typescript, @types/better-sqlite3, @types/node)

## 2. Data Ingestion

- [ ] 2.1 Create scripts/fetch-data.ts — download 5e-bits/5e-database JSON files from GitHub (src/2014/*.json)
- [ ] 2.2 Create src/data/schema.sql — tables for monsters, spells, equipment, magic_items, classes, races, conditions, rules with appropriate indexes
- [ ] 2.3 Create FTS5 virtual tables: monsters_fts (name, type, traits, actions), spells_fts (name, description, classes), equipment_fts (name, description, properties), rules_fts (name, description)
- [ ] 2.4 Create transform functions: map 5e-database JSON schemas to SQLite row format for each entity type
- [ ] 2.5 Load all data into SQLite with transactions, log counts per table
- [ ] 2.6 Write tests for data transform functions

## 3. Database Layer

- [ ] 3.1 Create src/types.ts — TypeScript interfaces for MonsterRow, SpellRow, EquipmentRow, MagicItemRow, ClassRow, RaceRow, ConditionRow, RuleRow, and filter types
- [ ] 3.2 Create src/data/db.ts — getDatabase(), sanitizeFtsQuery()
- [ ] 3.3 Write query functions: searchMonsters (FTS + CR/type/size/alignment filters + pagination), getMonsterByName
- [ ] 3.4 Write query functions: searchSpells (FTS + level/school/class/concentration/ritual/component/damage-type/save-type filters + pagination), getSpellByName
- [ ] 3.5 Write query functions: searchEquipment (FTS + category/cost/weight/properties filters + pagination), getEquipmentByName, searchMagicItems (FTS + rarity/type/attunement filters)
- [ ] 3.6 Write query functions: listClasses, getClassByName, listRaces, getRaceByName
- [ ] 3.7 Write query functions: searchRules (FTS), getConditionByName, listConditions
- [ ] 3.8 Write query functions for analytics: getMonstersByCrRange, getXpForCr, getSpellsByClassAndLevel, getClassSpellSlots
- [ ] 3.9 Create tests/helpers/test-db.ts — seedTestData with representative test data (3-4 monsters at different CRs, 5-6 spells across levels/schools/classes, weapons/armor/gear, 2-3 classes with features, 2 races with subraces, conditions, rules sections)
- [ ] 3.10 Write comprehensive db tests

## 4. Server Factory

- [ ] 4.1 Create src/server.ts — createServer() factory with db injection, stdio transport, signal handlers
- [ ] 4.2 Write server smoke test (tests/server.test.ts) — verify 10 tools listed with descriptions

## 5. Tool: search_monsters

- [ ] 5.1 Create src/tools/search-monsters.ts — register search_monsters with filters: query, cr, cr_min/cr_max, type, size, alignment, limit, cursor
- [ ] 5.2 Format full stat blocks: name, size, type, alignment, AC, HP, hit dice, speeds, ability scores, CR, XP, senses, languages, traits, actions, legendary actions, resistances/immunities/vulnerabilities
- [ ] 5.3 Write tests: name search, CR filter, CR range, type filter, combined filters, pagination, no results with suggestions

## 6. Tool: search_spells

- [ ] 6.1 Create src/tools/search-spells.ts — register search_spells with filters: query, level, school, class_name, concentration, ritual, has_material, damage_type, save_type, limit, cursor
- [ ] 6.2 Format spell details: name, level, school, casting time, range, components, material description, duration, concentration, ritual, classes, description, at higher levels
- [ ] 6.3 Write tests: name search, level filter, school+class filter, concentration filter, ritual filter, damage type filter, pagination

## 7. Tool: search_equipment

- [ ] 7.1 Create src/tools/search-equipment.ts — register search_equipment searching both equipment and magic_items tables. Filters: query, category, cost_min/cost_max, weight_max, weapon_property, armor_category, rarity, limit, cursor
- [ ] 7.2 Format type-appropriate fields (damage dice for weapons, AC for armor, rarity for magic items)
- [ ] 7.3 Write tests: cross-category search, weapon property filter, armor filter, magic item rarity, no results

## 8. Tool: browse_classes

- [ ] 8.1 Create src/tools/browse-classes.ts — register browse_classes. Without class_name: list all. With class_name: full progression. Optional level parameter.
- [ ] 8.2 Implement multiclass mode: accept array of {class, level} pairs, combine features, calculate multiclass spell slots using SRD formula
- [ ] 8.3 Write tests: list all, specific class, level-specific, multiclass caster, multiclass non-caster, invalid class

## 9. Tool: browse_races

- [ ] 9.1 Create src/tools/browse-races.ts — register browse_races. Without race_name: list all. With race_name: traits, bonuses, subraces.
- [ ] 9.2 Write tests: list all, specific race with subraces, invalid race with suggestions

## 10. Tool: search_rules

- [ ] 10.1 Create src/tools/search-rules.ts — register search_rules with query and condition_name parameters
- [ ] 10.2 Write tests: rules search, condition lookup, all conditions, invalid condition

## 11. Tool: build_encounter

- [ ] 11.1 Create src/lib/encounter-math.ts — XP thresholds per level (SRD table), CR-to-XP mapping, encounter multiplier table, difficulty calculator
- [ ] 11.2 Create src/tools/build-encounter.ts — register build_encounter. Inputs: party_size, party_level, difficulty. Calculates XP budget, finds monster combinations.
- [ ] 11.3 Write tests: medium encounter, deadly encounter, XP budget math, monster suggestions within budget, multiplier application

## 12. Tool: plan_spells

- [ ] 12.1 Create src/lib/spellcasting.ts — class spell slot tables, multiclass spell slot calculation (full/half/third caster), cantrip progression
- [ ] 12.2 Create src/tools/plan-spells.ts — register plan_spells. Inputs: class_name, level, remaining_slots (optional), multiclass (optional array). Shows available spells, flags concentration, highlights rituals, sums component costs.
- [ ] 12.3 Write tests: wizard spell slots, non-caster error, concentration flagging, ritual highlighting, material cost summing, multiclass slot calculation

## 13. Tool: compare_monsters

- [ ] 13.1 Create src/tools/compare-monsters.ts — register compare_monsters. Input: monster_names (array of 2-3). Side-by-side stat comparison.
- [ ] 13.2 Write tests: 2 monsters, 3 monsters, not found with suggestions, fewer than 2 error

## 14. Tool: analyze_loadout

- [ ] 14.1 Create src/lib/loadout-parser.ts — parse equipment list text, resolve against db
- [ ] 14.2 Create src/tools/analyze-loadout.ts — register analyze_loadout. Inputs: items (text list), strength_score (optional). Returns weight, cost, AC, encumbrance.
- [ ] 14.3 Write tests: valid loadout, unrecognized items, armor+shield AC, encumbrance with strength, no strength score

## 15. Integration & Polish

- [ ] 15.1 Wire all 10 tool registrations in src/server.ts
- [ ] 15.2 Run full test suite, verify all passing
- [ ] 15.3 Fetch real data and build SQLite database
- [ ] 15.4 Build and verify npx execution
- [ ] 15.5 Update README.md with badges, tool docs, data attribution (CC-BY-4.0), install instructions
- [ ] 15.6 Create status.json
- [ ] 15.7 Create GitHub repo and push
