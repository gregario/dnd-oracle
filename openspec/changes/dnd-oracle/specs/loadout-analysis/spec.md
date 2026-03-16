## ADDED Requirements

### Requirement: Item Resolution from Equipment Database
The analyze_loadout tool SHALL accept an items parameter (required, newline-separated text list of item names) and resolve each item against the equipment database using fuzzy matching. Unrecognized items MUST be flagged in the response with the closest match suggestions.

#### Scenario: Resolve known items
- **WHEN** the user calls analyze_loadout with items "longsword\nchain mail\nshield\nbackpack"
- **THEN** the tool resolves all four items from the equipment database and returns their full details

#### Scenario: Unrecognized item
- **WHEN** the user calls analyze_loadout with items "longsword\nmythril armor\ntorch"
- **THEN** the tool resolves longsword and torch, flags "mythril armor" as unrecognized, and suggests "mithral armor" as a possible match

### Requirement: Weight and Cost Totals
The analyze_loadout tool MUST calculate and return the total weight (in lbs) and total cost (in GP) of all resolved items in the loadout.

#### Scenario: Calculate totals
- **WHEN** the user calls analyze_loadout with items "longsword\nchain mail\nshield"
- **THEN** the tool returns total weight (3 + 55 + 6 = 64 lbs) and total cost (15 + 75 + 10 = 100 GP) along with per-item breakdowns

### Requirement: AC Calculation from Armor and Shield
The analyze_loadout tool MUST calculate the resulting AC when the loadout contains armor and/or a shield. The calculation MUST follow SRD armor rules (base AC + Dex modifier rules + shield bonus).

#### Scenario: Armor and shield AC
- **WHEN** the loadout contains chain mail and a shield
- **THEN** the tool reports AC = 16 + 2 = 18 (chain mail base 16, no Dex modifier, +2 shield)

#### Scenario: No armor
- **WHEN** the loadout contains only weapons and gear with no armor or shield
- **THEN** the tool reports AC as 10 + Dex modifier (unarmored) and notes no armor is equipped

### Requirement: Encumbrance Calculation
The analyze_loadout tool SHALL accept an optional strength_score parameter (integer 1-30). When provided, the tool MUST calculate encumbrance status using SRD rules: normal carry (strength x 15 lbs), encumbered, and heavily encumbered thresholds.

#### Scenario: Within carry capacity
- **WHEN** the user provides strength_score 16 and total loadout weight is 100 lbs
- **THEN** the tool reports carry capacity as 240 lbs, status "normal", and remaining capacity of 140 lbs

#### Scenario: Encumbered
- **WHEN** the user provides strength_score 10 and total loadout weight is 120 lbs
- **THEN** the tool reports carry capacity as 150 lbs, encumbrance status based on variant encumbrance thresholds, and warns the character is over the 100 lb threshold (strength x 10)

#### Scenario: No strength provided
- **WHEN** the user calls analyze_loadout without strength_score
- **THEN** the tool reports total weight but skips encumbrance calculation entirely
