## ADDED Requirements

### Requirement: Race Listing
The browse_races tool SHALL, when called without a race_name parameter, return a summary list of all SRD races. Each entry MUST include the race name and a one-line summary of key traits.

#### Scenario: List all races
- **WHEN** the user calls browse_races with no parameters
- **THEN** the tool returns all SRD races (dwarf, elf, halfling, human, dragonborn, gnome, half-elf, half-orc, tiefling) each with a brief trait summary

### Requirement: Race Detail View
The browse_races tool SHALL, when called with a race_name parameter, return the full race details including ability score bonuses, size, speed, languages, racial traits (with full descriptions), and available subraces.

#### Scenario: View race details
- **WHEN** the user calls browse_races with race_name "elf"
- **THEN** the tool returns elf details: +2 Dexterity, Medium size, 30 ft speed, Darkvision, Keen Senses, Fey Ancestry, Trance, and lists subraces (High Elf, Wood Elf, Dark Elf)

#### Scenario: View race with subraces
- **WHEN** the user calls browse_races with race_name "dwarf"
- **THEN** the tool returns dwarf base traits (+2 Constitution, 25 ft speed, Darkvision, Dwarven Resilience, etc.) and subrace details (Hill Dwarf with +1 Wisdom and Dwarven Toughness, Mountain Dwarf with +2 Strength and Dwarven Armor Training)

#### Scenario: Invalid race name
- **WHEN** the user calls browse_races with race_name "lizardfolk"
- **THEN** the tool returns an error message listing the valid SRD race names

### Requirement: Subrace Trait Integration
When subraces exist, the browse_races tool MUST clearly separate base race traits from subrace-specific traits. Subrace entries MUST include additional ability score bonuses, additional traits, and any trait replacements.

#### Scenario: Subrace details
- **WHEN** the user calls browse_races with race_name "halfling"
- **THEN** the tool returns base halfling traits (+2 Dexterity, Lucky, Brave, Halfling Nimbleness) separately from subrace traits (Lightfoot: +1 Charisma, Naturally Stealthy; Stout: +1 Constitution, Stout Resilience)
