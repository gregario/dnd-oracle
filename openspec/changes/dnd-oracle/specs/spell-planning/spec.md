## ADDED Requirements

### Requirement: Spell Slot Display
The plan_spells tool SHALL accept class_name (required) and level (required, 1-20). The tool MUST return the character's available spell slots from the class's spellcasting table, including the maximum spell level they can cast.

#### Scenario: Full caster spell slots
- **WHEN** the user calls plan_spells with class_name "wizard" and level 5
- **THEN** the tool returns spell slots: 4 x 1st, 3 x 2nd, 2 x 3rd, with max spell level 3

#### Scenario: Non-caster class
- **WHEN** the user calls plan_spells with class_name "fighter" and level 5
- **THEN** the tool returns a message indicating fighters do not have spellcasting at level 5 (no Eldritch Knight subclass in SRD base)

### Requirement: Available Spell Listing
The plan_spells tool MUST list all spells available to the specified class up to their maximum castable spell level. Each spell entry MUST indicate whether it requires concentration and whether it can be cast as a ritual.

#### Scenario: Spell list with flags
- **WHEN** the user calls plan_spells with class_name "cleric" and level 3
- **THEN** the tool returns all cleric spells of levels 0-2, with concentration spells flagged and ritual spells flagged

### Requirement: Remaining Slots Tracking
The plan_spells tool SHALL accept an optional remaining_slots parameter (object mapping spell level to remaining count). When provided, the tool MUST highlight which spell levels still have available slots and which are exhausted.

#### Scenario: Track remaining slots
- **WHEN** the user calls plan_spells with class_name "wizard", level 5, and remaining_slots {"1": 1, "2": 0, "3": 2}
- **THEN** the tool shows 1st-level slots: 1 remaining, 2nd-level: exhausted, 3rd-level: 2 remaining, and indicates that 2nd-level spells cannot be cast without upcasting from a lower slot

### Requirement: Material Component Cost Summary
The plan_spells tool MUST sum the gold piece costs of all material components that have a stated cost for the available spells. Spells with consumed materials MUST be flagged separately.

#### Scenario: Costly material components
- **WHEN** the user calls plan_spells with class_name "cleric" and level 9
- **THEN** the tool includes a material costs section listing spells with costly components (e.g., Revivify: 300 GP diamond, consumed) with a total cost summary

### Requirement: Multiclass Spell Slot Calculation
The plan_spells tool SHALL accept an optional multiclass parameter (array of class/level pairs). When provided, the tool MUST calculate combined spell slots using the SRD multiclass spellcasting table and list spells available from each contributing class.

#### Scenario: Multiclass spell planning
- **WHEN** the user calls plan_spells with multiclass [{"class": "cleric", "level": 5}, {"class": "wizard", "level": 3}]
- **THEN** the tool calculates combined caster level 8 spell slots, lists cleric spells up to 3rd level and wizard spells up to 2nd level separately, and shows the unified slot pool

#### Scenario: Half-caster multiclass
- **WHEN** the user calls plan_spells with multiclass [{"class": "paladin", "level": 6}, {"class": "sorcerer", "level": 4}]
- **THEN** the tool calculates paladin as half-caster (level 3) + sorcerer full (level 4) = 7th-level caster slots
