## ADDED Requirements

### Requirement: Unified Equipment Search
The search_equipment tool SHALL search across weapons, armor, adventuring gear, and magic items in a single tool using full-text search on item names and descriptions.

#### Scenario: Search across categories
- **WHEN** the user calls search_equipment with query "sword"
- **THEN** the tool returns matching weapons (longsword, shortsword, greatsword) and any magic items containing "sword" in a single result set

#### Scenario: Search with no results
- **WHEN** the user calls search_equipment with query "xyznonexistent"
- **THEN** the tool returns an empty results array with a message indicating no items matched

### Requirement: Equipment Category and Property Filtering
The search_equipment tool SHALL support filtering by category (weapon, armor, gear, magic-item), cost range (cost_min, cost_max in GP), weight range (weight_min, weight_max in lbs), weapon properties (finesse, heavy, two-handed, light, thrown, reach, versatile, ammunition, loading), armor category (light, medium, heavy, shield), and magic item rarity (common, uncommon, rare, very-rare, legendary).

#### Scenario: Filter weapons by property
- **WHEN** the user calls search_equipment with category "weapon" and weapon_properties ["finesse"]
- **THEN** the tool returns only weapons that have the finesse property (rapier, dagger, shortsword, etc.)

#### Scenario: Filter armor by category
- **WHEN** the user calls search_equipment with category "armor" and armor_category "heavy"
- **THEN** the tool returns only heavy armor (ring mail, chain mail, splint, plate)

#### Scenario: Filter magic items by rarity
- **WHEN** the user calls search_equipment with category "magic-item" and rarity "legendary"
- **THEN** the tool returns only legendary magic items

### Requirement: Category-Appropriate Response Fields
The search_equipment tool MUST return fields appropriate to each item type. Weapons MUST include damage dice and damage type. Armor MUST include AC and any Dex modifier rules. Magic items MUST include rarity and attunement requirement. All items MUST include name, cost, and weight where applicable.

#### Scenario: Weapon result fields
- **WHEN** a weapon appears in search results
- **THEN** the result includes name, category "weapon", cost, weight, damage_dice, damage_type, and properties array

#### Scenario: Armor result fields
- **WHEN** armor appears in search results
- **THEN** the result includes name, category "armor", cost, weight, armor_category, base_ac, dex_modifier_rule (full, max 2, or none), and strength requirement if any

#### Scenario: Magic item result fields
- **WHEN** a magic item appears in search results
- **THEN** the result includes name, category "magic-item", rarity, requires_attunement (boolean), and description
