## ADDED Requirements

### Requirement: Spell Full-Text Search
The search_spells tool SHALL support full-text search across spell names and descriptions. Each result MUST include: name, level, school, casting time, range, components (V/S/M with material details), duration, concentration (boolean), ritual (boolean), classes, description, and at_higher_levels text.

#### Scenario: Search by name
- **WHEN** the user calls search_spells with query "fireball"
- **THEN** the tool returns the Fireball spell with all fields populated including level 3, school "evocation", and the full description

#### Scenario: Search by description keyword
- **WHEN** the user calls search_spells with query "healing"
- **THEN** the tool returns all spells whose name or description contains "healing"

### Requirement: Spell Filtering by Level and School
The search_spells tool SHALL support filtering by level (0 for cantrips through 9) and school (abjuration, conjuration, divination, enchantment, evocation, illusion, necromancy, transmutation).

#### Scenario: Filter cantrips
- **WHEN** the user calls search_spells with level 0
- **THEN** the tool returns only cantrips

#### Scenario: Filter by school
- **WHEN** the user calls search_spells with school "necromancy"
- **THEN** the tool returns only spells from the necromancy school

### Requirement: Spell Filtering by Class and Properties
The search_spells tool SHALL support filtering by class name, concentration (boolean), ritual (boolean), component type (V, S, M), damage_type, and save_type.

#### Scenario: Concentration spells for a class
- **WHEN** the user calls search_spells with class "wizard" and concentration true
- **THEN** the tool returns only wizard spells that require concentration

#### Scenario: Ritual spells
- **WHEN** the user calls search_spells with ritual true and class "cleric"
- **THEN** the tool returns only cleric spells that can be cast as rituals

#### Scenario: Filter by damage type
- **WHEN** the user calls search_spells with damage_type "fire"
- **THEN** the tool returns only spells that deal fire damage

### Requirement: Spell Search Pagination
The search_spells tool SHALL support cursor-based pagination. Each response MUST include a next_cursor field when more results exist.

#### Scenario: Paginated spell results
- **WHEN** the user calls search_spells with class "wizard" and no cursor
- **THEN** the tool returns the first page of results and a next_cursor value if more results exist
