## ADDED Requirements

### Requirement: Monster Full-Text Search
The search_monsters tool SHALL support full-text search across monster names and types. The tool MUST accept an optional query parameter for FTS matching.

#### Scenario: Search by name
- **WHEN** the user calls search_monsters with query "dragon"
- **THEN** the tool returns all monsters whose name contains "dragon", each with full stat block (name, size, type, alignment, AC, HP, hit dice, speeds, ability scores, CR, XP, senses, languages, traits, actions, legendary actions, resistances, immunities, vulnerabilities)

#### Scenario: No results with suggestions
- **WHEN** the user calls search_monsters with query "draogn"
- **THEN** the tool returns an empty results array and a suggestions array containing partial matches such as "dragon"

### Requirement: Monster Filtering by CR
The search_monsters tool SHALL support filtering by challenge rating via cr_exact (single value) or cr_min/cr_max (range). CR values MUST support fractions (0, 1/8, 1/4, 1/2, 1-30).

#### Scenario: Exact CR filter
- **WHEN** the user calls search_monsters with cr_exact "5"
- **THEN** the tool returns only monsters with CR 5

#### Scenario: CR range filter
- **WHEN** the user calls search_monsters with cr_min "1" and cr_max "4"
- **THEN** the tool returns only monsters with CR between 1 and 4 inclusive

### Requirement: Monster Filtering by Type, Size, and Alignment
The search_monsters tool SHALL support filtering by type (beast, dragon, undead, fiend, aberration, celestial, construct, elemental, fey, giant, humanoid, monstrosity, ooze, plant), size (Tiny, Small, Medium, Large, Huge, Gargantuan), and alignment.

#### Scenario: Filter by type
- **WHEN** the user calls search_monsters with type "undead"
- **THEN** the tool returns only monsters whose type is "undead"

#### Scenario: Combined filters
- **WHEN** the user calls search_monsters with type "beast" and size "Large"
- **THEN** the tool returns only monsters that are both type "beast" and size "Large"

### Requirement: Monster Search Pagination
The search_monsters tool SHALL support cursor-based pagination via a cursor parameter. Each response MUST include a next_cursor field when more results exist.

#### Scenario: Paginated results
- **WHEN** the user calls search_monsters with type "humanoid" and no cursor
- **THEN** the tool returns the first page of results and a next_cursor value if more results exist

#### Scenario: Next page
- **WHEN** the user calls search_monsters with cursor set to a previously returned next_cursor
- **THEN** the tool returns the next page of results
