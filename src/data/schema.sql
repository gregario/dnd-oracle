-- D&D 5e SRD Database Schema

CREATE TABLE IF NOT EXISTS monsters (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL UNIQUE,
  size TEXT NOT NULL,
  type TEXT NOT NULL,
  subtype TEXT,
  alignment TEXT NOT NULL DEFAULT '',
  ac INTEGER NOT NULL,
  ac_type TEXT,
  hp INTEGER NOT NULL,
  hit_dice TEXT NOT NULL,
  speed TEXT NOT NULL DEFAULT '{}',
  str INTEGER NOT NULL,
  dex INTEGER NOT NULL,
  con INTEGER NOT NULL,
  int INTEGER NOT NULL,
  wis INTEGER NOT NULL,
  cha INTEGER NOT NULL,
  cr TEXT NOT NULL,
  xp INTEGER NOT NULL,
  senses TEXT,
  languages TEXT,
  traits TEXT,
  actions TEXT,
  legendary_actions TEXT,
  reactions TEXT,
  resistances TEXT,
  immunities TEXT,
  vulnerabilities TEXT,
  condition_immunities TEXT,
  saving_throws TEXT,
  skills TEXT,
  proficiency_bonus INTEGER
);

CREATE TABLE IF NOT EXISTS spells (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL UNIQUE,
  level INTEGER NOT NULL,
  school TEXT NOT NULL,
  casting_time TEXT NOT NULL,
  range TEXT NOT NULL,
  duration TEXT NOT NULL,
  concentration INTEGER NOT NULL DEFAULT 0,
  ritual INTEGER NOT NULL DEFAULT 0,
  components_v INTEGER NOT NULL DEFAULT 0,
  components_s INTEGER NOT NULL DEFAULT 0,
  components_m INTEGER NOT NULL DEFAULT 0,
  material_description TEXT,
  classes TEXT NOT NULL DEFAULT '[]',
  description TEXT NOT NULL,
  higher_level TEXT,
  damage_type TEXT,
  save_type TEXT
);

CREATE TABLE IF NOT EXISTS equipment (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL UNIQUE,
  category TEXT NOT NULL,
  cost_gp REAL,
  cost_unit TEXT,
  weight REAL,
  description TEXT,
  weapon_properties TEXT,
  damage_dice TEXT,
  damage_type TEXT,
  weapon_range TEXT,
  range_normal INTEGER,
  range_long INTEGER,
  armor_category TEXT,
  ac_base INTEGER,
  ac_dex_bonus INTEGER,
  ac_max_bonus INTEGER,
  stealth_disadvantage INTEGER,
  str_minimum INTEGER
);

CREATE TABLE IF NOT EXISTS magic_items (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL UNIQUE,
  rarity TEXT NOT NULL,
  type TEXT NOT NULL,
  requires_attunement INTEGER NOT NULL DEFAULT 0,
  attunement_description TEXT,
  description TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS classes (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL UNIQUE,
  hit_die INTEGER NOT NULL,
  saving_throws TEXT NOT NULL DEFAULT '[]',
  proficiencies TEXT NOT NULL DEFAULT '{}',
  spellcasting_ability TEXT,
  features TEXT NOT NULL DEFAULT '[]',
  subclasses TEXT
);

CREATE TABLE IF NOT EXISTS races (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL UNIQUE,
  speed INTEGER NOT NULL,
  size TEXT NOT NULL,
  ability_bonuses TEXT NOT NULL DEFAULT '[]',
  traits TEXT NOT NULL DEFAULT '[]',
  languages TEXT NOT NULL DEFAULT '[]',
  subraces TEXT
);

CREATE TABLE IF NOT EXISTS conditions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL UNIQUE,
  description TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS rules (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL UNIQUE,
  section TEXT NOT NULL,
  description TEXT NOT NULL
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_monsters_cr ON monsters(cr);
CREATE INDEX IF NOT EXISTS idx_monsters_type ON monsters(type);
CREATE INDEX IF NOT EXISTS idx_monsters_size ON monsters(size);
CREATE INDEX IF NOT EXISTS idx_spells_level ON spells(level);
CREATE INDEX IF NOT EXISTS idx_spells_school ON spells(school);
CREATE INDEX IF NOT EXISTS idx_spells_concentration ON spells(concentration);
CREATE INDEX IF NOT EXISTS idx_equipment_category ON equipment(category);
CREATE INDEX IF NOT EXISTS idx_magic_items_rarity ON magic_items(rarity);

-- FTS5 virtual tables
CREATE VIRTUAL TABLE IF NOT EXISTS monsters_fts USING fts5(
  name, type, traits, actions,
  content='monsters',
  content_rowid='id'
);

CREATE VIRTUAL TABLE IF NOT EXISTS spells_fts USING fts5(
  name, description, classes,
  content='spells',
  content_rowid='id'
);

CREATE VIRTUAL TABLE IF NOT EXISTS equipment_fts USING fts5(
  name, description, weapon_properties,
  content='equipment',
  content_rowid='id'
);

CREATE VIRTUAL TABLE IF NOT EXISTS magic_items_fts USING fts5(
  name, description, type,
  content='magic_items',
  content_rowid='id'
);

CREATE VIRTUAL TABLE IF NOT EXISTS rules_fts USING fts5(
  name, description,
  content='rules',
  content_rowid='id'
);

-- Triggers to keep FTS in sync
CREATE TRIGGER IF NOT EXISTS monsters_ai AFTER INSERT ON monsters BEGIN
  INSERT INTO monsters_fts(rowid, name, type, traits, actions)
  VALUES (new.id, new.name, new.type, COALESCE(new.traits, ''), COALESCE(new.actions, ''));
END;

CREATE TRIGGER IF NOT EXISTS spells_ai AFTER INSERT ON spells BEGIN
  INSERT INTO spells_fts(rowid, name, description, classes)
  VALUES (new.id, new.name, new.description, new.classes);
END;

CREATE TRIGGER IF NOT EXISTS equipment_ai AFTER INSERT ON equipment BEGIN
  INSERT INTO equipment_fts(rowid, name, description, weapon_properties)
  VALUES (new.id, new.name, COALESCE(new.description, ''), COALESCE(new.weapon_properties, ''));
END;

CREATE TRIGGER IF NOT EXISTS magic_items_ai AFTER INSERT ON magic_items BEGIN
  INSERT INTO magic_items_fts(rowid, name, description, type)
  VALUES (new.id, new.name, new.description, new.type);
END;

CREATE TRIGGER IF NOT EXISTS rules_ai AFTER INSERT ON rules BEGIN
  INSERT INTO rules_fts(rowid, name, description)
  VALUES (new.id, new.name, new.description);
END;
