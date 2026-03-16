## ADDED Requirements

### Requirement: Side-by-Side Monster Comparison
The compare_monsters tool SHALL accept a monster_names parameter (required, array of 2-3 monster names) and return a side-by-side comparison of each monster's stats: AC, HP, hit dice, all speeds, all six ability scores, CR, XP, resistances, immunities, vulnerabilities, and actions.

#### Scenario: Compare two monsters
- **WHEN** the user calls compare_monsters with monster_names ["dire wolf", "winter wolf"]
- **THEN** the tool returns both monsters' stats side by side including AC, HP, ability scores, speeds, resistances, immunities, vulnerabilities, and actions

#### Scenario: Compare three monsters
- **WHEN** the user calls compare_monsters with monster_names ["zombie", "skeleton", "ghoul"]
- **THEN** the tool returns all three monsters' stats side by side in the same comparison format

### Requirement: Difference Highlighting
The compare_monsters tool MUST highlight differences between compared monsters. Numerical values MUST be annotated with which monster has the higher or lower value. Unique traits, resistances, immunities, or actions MUST be clearly marked as present or absent per monster.

#### Scenario: Numerical differences
- **WHEN** comparing two monsters where one has AC 15 and the other AC 13
- **THEN** the comparison annotates the AC row showing which monster has the higher value

#### Scenario: Unique traits
- **WHEN** comparing monsters where one has fire immunity and the other does not
- **THEN** the comparison shows fire immunity as present for one and absent for the other

### Requirement: Monster Not Found Handling
The compare_monsters tool MUST return an error if any requested monster is not found. The error MUST include suggestions for similar monster names.

#### Scenario: One monster not found
- **WHEN** the user calls compare_monsters with monster_names ["goblin", "kobald"]
- **THEN** the tool returns an error indicating "kobald" was not found and suggests "kobold" as an alternative

#### Scenario: Too few monsters
- **WHEN** the user calls compare_monsters with monster_names containing only 1 name
- **THEN** the tool returns an error stating that 2-3 monster names are required for comparison
