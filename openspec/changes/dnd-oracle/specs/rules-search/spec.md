## ADDED Requirements

### Requirement: Rules Full-Text Search
The search_rules tool SHALL support full-text search across SRD rules sections including combat, adventuring, spellcasting, and conditions. The tool MUST return the full text of matching rules sections.

#### Scenario: Search combat rules
- **WHEN** the user calls search_rules with query "opportunity attack"
- **THEN** the tool returns the full text of the opportunity attack rules section from the SRD combat rules

#### Scenario: Search spellcasting rules
- **WHEN** the user calls search_rules with query "concentration"
- **THEN** the tool returns the full text of the concentration rules including how concentration is broken

#### Scenario: No matching rules
- **WHEN** the user calls search_rules with query "xyznonexistent"
- **THEN** the tool returns a message indicating no matching rules were found

### Requirement: Condition Quick Lookup
The search_rules tool SHALL accept an optional condition_name parameter. When provided, the tool MUST return the full definition of that specific condition (blinded, charmed, deafened, frightened, grappled, incapacitated, invisible, paralyzed, petrified, poisoned, prone, restrained, stunned, unconscious, exhaustion).

#### Scenario: Look up a condition
- **WHEN** the user calls search_rules with condition_name "grappled"
- **THEN** the tool returns the full SRD definition of the grappled condition including all effects and how it ends

#### Scenario: Invalid condition name
- **WHEN** the user calls search_rules with condition_name "confused"
- **THEN** the tool returns an error message listing all valid condition names

#### Scenario: Exhaustion levels
- **WHEN** the user calls search_rules with condition_name "exhaustion"
- **THEN** the tool returns the full exhaustion rules including all 6 levels and their cumulative effects
