## ADDED Requirements

### Requirement: Encounter XP Budget Calculation
The build_encounter tool SHALL accept party_size (required, integer 1-10), party_level (required, integer 1-20), and difficulty (optional, one of easy/medium/hard/deadly, defaults to medium). The tool MUST calculate the XP budget using the SRD encounter difficulty thresholds table (per-character XP thresholds multiplied by party_size).

#### Scenario: Calculate medium encounter budget
- **WHEN** the user calls build_encounter with party_size 4 and party_level 5
- **THEN** the tool calculates the medium XP budget as 4 x 500 = 2000 XP and uses this to suggest monsters

#### Scenario: Calculate deadly encounter budget
- **WHEN** the user calls build_encounter with party_size 4, party_level 5, and difficulty "deadly"
- **THEN** the tool calculates the deadly XP budget as 4 x 1100 = 4400 XP

### Requirement: Monster Combination Suggestions
The build_encounter tool MUST suggest 2-3 different monster combinations that fit within the calculated XP budget. Each suggestion MUST apply the SRD encounter multiplier based on monster count (1 monster = x1, 2 = x1.5, 3-6 = x2, 7-10 = x2.5, 11-14 = x3, 15+ = x4) to the total monster XP when comparing against the budget.

#### Scenario: Single boss suggestion
- **WHEN** the tool generates suggestions for a 2000 XP budget
- **THEN** at least one suggestion is a single monster whose XP (multiplied by x1) fits within the budget

#### Scenario: Group encounter suggestion
- **WHEN** the tool generates suggestions for a 2000 XP budget
- **THEN** at least one suggestion includes multiple monsters where their combined XP multiplied by the group multiplier fits within the budget

### Requirement: Encounter XP Breakdown
Each monster combination suggestion MUST include: the list of monsters with individual CR and XP, total base XP, the applicable encounter multiplier, adjusted XP total, the resulting difficulty rating (easy/medium/hard/deadly), and the percentage of budget used.

#### Scenario: XP breakdown detail
- **WHEN** the tool suggests 3 x CR 1 monsters (200 XP each) for a party
- **THEN** the suggestion shows base XP = 600, multiplier = x2 (3 monsters), adjusted XP = 1200, and the difficulty rating based on where 1200 falls in the party's thresholds

#### Scenario: Mixed CR group
- **WHEN** the tool suggests 1 x CR 3 (700 XP) + 2 x CR 1/2 (100 XP each)
- **THEN** the suggestion shows base XP = 900, multiplier = x2 (3 monsters), adjusted XP = 1800, with individual XP listed per monster

### Requirement: Input Validation
The build_encounter tool MUST validate inputs and return clear error messages for invalid values.

#### Scenario: Invalid party level
- **WHEN** the user calls build_encounter with party_level 25
- **THEN** the tool returns an error stating party_level must be between 1 and 20
