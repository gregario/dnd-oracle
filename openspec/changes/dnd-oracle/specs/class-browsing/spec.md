## ADDED Requirements

### Requirement: Class Listing
The browse_classes tool SHALL, when called without a class_name parameter, return a summary list of all 12 SRD classes. Each entry MUST include the class name, hit die, and a one-line summary of the class role.

#### Scenario: List all classes
- **WHEN** the user calls browse_classes with no parameters
- **THEN** the tool returns 12 entries (barbarian, bard, cleric, druid, fighter, monk, paladin, ranger, rogue, sorcerer, warlock, wizard) each with hit die and summary

### Requirement: Class Detail View
The browse_classes tool SHALL, when called with a class_name parameter, return the full class progression including hit die, proficiencies (armor, weapons, tools, saving throws, skills), equipment choices, spellcasting details (if applicable), and features at each level from 1 to 20.

#### Scenario: View full class
- **WHEN** the user calls browse_classes with class_name "fighter"
- **THEN** the tool returns the fighter's full progression: d10 hit die, all proficiencies, and features at each level (Fighting Style at 1, Action Surge at 2, etc.)

#### Scenario: Invalid class name
- **WHEN** the user calls browse_classes with class_name "necromancer"
- **THEN** the tool returns an error message listing the 12 valid class names

### Requirement: Level-Specific Features
The browse_classes tool SHALL accept an optional level parameter (1-20) that, when provided alongside class_name, returns only the features gained at that specific level.

#### Scenario: Features at specific level
- **WHEN** the user calls browse_classes with class_name "wizard" and level 2
- **THEN** the tool returns only the features gained at wizard level 2 (Arcane Tradition)

### Requirement: Multiclass Support
The browse_classes tool SHALL accept an optional multiclass parameter containing an array of class/level pairs. When provided, the tool MUST return combined proficiencies (following SRD multiclass proficiency rules), combined features from each class at their respective levels, and calculated spell slots using the SRD multiclass spellcasting table.

#### Scenario: Multiclass spell slots
- **WHEN** the user calls browse_classes with multiclass [{"class": "wizard", "level": 5}, {"class": "cleric", "level": 3}]
- **THEN** the tool returns combined features for wizard 5 / cleric 3, multiclass proficiencies, and spell slots calculated from the combined spellcaster level (5 + 3 = 8th-level caster)

#### Scenario: Multiclass with non-caster
- **WHEN** the user calls browse_classes with multiclass [{"class": "fighter", "level": 5}, {"class": "wizard", "level": 3}]
- **THEN** the tool returns combined features and spell slots calculated with fighter contributing 0 caster levels (3rd-level caster total from wizard only)
