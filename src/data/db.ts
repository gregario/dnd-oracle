import Database from 'better-sqlite3';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import type {
  MonsterRow,
  SpellRow,
  EquipmentRow,
  MagicItemRow,
  ClassRow,
  RaceRow,
  ConditionRow,
  RuleRow,
  MonsterFilters,
  SpellFilters,
  EquipmentFilters,
} from '../types.js';

const DB_FILENAME = 'dnd.sqlite';
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SCHEMA_PATH = path.join(__dirname, 'schema.sql');

export function getDatabase(dataDir?: string): Database.Database {
  let db: Database.Database;
  if (dataDir === ':memory:') {
    db = new Database(':memory:');
  } else {
    const dir = dataDir ?? __dirname;
    const dbPath = dir.endsWith('.sqlite') ? dir : path.join(dir, DB_FILENAME);
    const parentDir = path.dirname(dbPath);
    if (!fs.existsSync(parentDir)) {
      fs.mkdirSync(parentDir, { recursive: true });
    }
    db = new Database(dbPath);
  }
  db.pragma('journal_mode = WAL');
  db.pragma('foreign_keys = ON');
  initializeSchema(db);
  return db;
}

function initializeSchema(db: Database.Database): void {
  const schema = fs.readFileSync(SCHEMA_PATH, 'utf-8');
  db.exec(schema);
}

// -- FTS helpers --

export function sanitizeFtsQuery(query: string): string {
  const cleaned = query.replace(/[*":()^~{}<>]/g, '');
  const tokens = cleaned.split(/\s+/).filter((t) => t.length > 0);
  return tokens.map((t) => `"${t}"`).join(' ');
}

// -- CR helpers --

const CR_TO_NUMERIC: Record<string, number> = {
  '0': 0,
  '1/8': 0.125,
  '1/4': 0.25,
  '1/2': 0.5,
};

export function crToNumeric(cr: string): number {
  if (cr in CR_TO_NUMERIC) return CR_TO_NUMERIC[cr];
  const n = parseFloat(cr);
  return isNaN(n) ? 0 : n;
}

// -- Search results --

export interface SearchResult<T> {
  rows: T[];
  total: number;
}

// -- Monster queries --

export function searchMonsters(
  db: Database.Database,
  filters: MonsterFilters,
): SearchResult<MonsterRow> {
  const conditions: string[] = [];
  const params: (string | number)[] = [];

  if (filters.query) {
    const ftsQuery = sanitizeFtsQuery(filters.query);
    if (ftsQuery.length > 0) {
      conditions.push(
        'm.id IN (SELECT rowid FROM monsters_fts WHERE monsters_fts MATCH ?)',
      );
      params.push(ftsQuery);
    }
  }

  if (filters.cr !== undefined) {
    conditions.push('m.cr = ?');
    params.push(filters.cr);
  }

  if (filters.cr_min !== undefined) {
    // Get all monsters, filter by numeric CR comparison
    const crMinStr = filters.cr_min.toString();
    // We need a subquery approach since CR is stored as text
    conditions.push(
      `CASE WHEN m.cr = '1/8' THEN 0.125 WHEN m.cr = '1/4' THEN 0.25 WHEN m.cr = '1/2' THEN 0.5 ELSE CAST(m.cr AS REAL) END >= ?`,
    );
    params.push(filters.cr_min);
  }

  if (filters.cr_max !== undefined) {
    conditions.push(
      `CASE WHEN m.cr = '1/8' THEN 0.125 WHEN m.cr = '1/4' THEN 0.25 WHEN m.cr = '1/2' THEN 0.5 ELSE CAST(m.cr AS REAL) END <= ?`,
    );
    params.push(filters.cr_max);
  }

  if (filters.type) {
    conditions.push('LOWER(m.type) = LOWER(?)');
    params.push(filters.type);
  }

  if (filters.size) {
    conditions.push('LOWER(m.size) = LOWER(?)');
    params.push(filters.size);
  }

  if (filters.alignment) {
    conditions.push('LOWER(m.alignment) LIKE LOWER(?)');
    params.push(`%${filters.alignment}%`);
  }

  const where =
    conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
  const limit = filters.limit ?? 20;
  const offset = filters.offset ?? 0;

  const countRow = db
    .prepare(`SELECT COUNT(*) as count FROM monsters m ${where}`)
    .get(...params) as { count: number };

  const rows = db
    .prepare(
      `SELECT m.* FROM monsters m ${where} ORDER BY CASE WHEN m.cr = '1/8' THEN 0.125 WHEN m.cr = '1/4' THEN 0.25 WHEN m.cr = '1/2' THEN 0.5 ELSE CAST(m.cr AS REAL) END ASC, m.name ASC LIMIT ? OFFSET ?`,
    )
    .all(...params, limit, offset) as MonsterRow[];

  return { rows, total: countRow.count };
}

export function getMonsterByName(
  db: Database.Database,
  name: string,
): MonsterRow | undefined {
  return db
    .prepare('SELECT * FROM monsters WHERE LOWER(name) = LOWER(?)')
    .get(name) as MonsterRow | undefined;
}

export function getMonstersByCrRange(
  db: Database.Database,
  crMin: number,
  crMax: number,
): MonsterRow[] {
  return db
    .prepare(
      `SELECT * FROM monsters WHERE
       CASE WHEN cr = '1/8' THEN 0.125 WHEN cr = '1/4' THEN 0.25 WHEN cr = '1/2' THEN 0.5 ELSE CAST(cr AS REAL) END >= ?
       AND CASE WHEN cr = '1/8' THEN 0.125 WHEN cr = '1/4' THEN 0.25 WHEN cr = '1/2' THEN 0.5 ELSE CAST(cr AS REAL) END <= ?
       ORDER BY CASE WHEN cr = '1/8' THEN 0.125 WHEN cr = '1/4' THEN 0.25 WHEN cr = '1/2' THEN 0.5 ELSE CAST(cr AS REAL) END ASC, name ASC`,
    )
    .all(crMin, crMax) as MonsterRow[];
}

// -- Spell queries --

export function searchSpells(
  db: Database.Database,
  filters: SpellFilters,
): SearchResult<SpellRow> {
  const conditions: string[] = [];
  const params: (string | number)[] = [];

  if (filters.query) {
    const ftsQuery = sanitizeFtsQuery(filters.query);
    if (ftsQuery.length > 0) {
      conditions.push(
        's.id IN (SELECT rowid FROM spells_fts WHERE spells_fts MATCH ?)',
      );
      params.push(ftsQuery);
    }
  }

  if (filters.level !== undefined) {
    conditions.push('s.level = ?');
    params.push(filters.level);
  }

  if (filters.school) {
    conditions.push('LOWER(s.school) = LOWER(?)');
    params.push(filters.school);
  }

  if (filters.class_name) {
    conditions.push('LOWER(s.classes) LIKE LOWER(?)');
    params.push(`%${filters.class_name}%`);
  }

  if (filters.concentration !== undefined) {
    conditions.push('s.concentration = ?');
    params.push(filters.concentration ? 1 : 0);
  }

  if (filters.ritual !== undefined) {
    conditions.push('s.ritual = ?');
    params.push(filters.ritual ? 1 : 0);
  }

  if (filters.has_material !== undefined) {
    conditions.push('s.components_m = ?');
    params.push(filters.has_material ? 1 : 0);
  }

  if (filters.damage_type) {
    conditions.push('LOWER(s.damage_type) = LOWER(?)');
    params.push(filters.damage_type);
  }

  if (filters.save_type) {
    conditions.push('LOWER(s.save_type) = LOWER(?)');
    params.push(filters.save_type);
  }

  const where =
    conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
  const limit = filters.limit ?? 20;
  const offset = filters.offset ?? 0;

  const countRow = db
    .prepare(`SELECT COUNT(*) as count FROM spells s ${where}`)
    .get(...params) as { count: number };

  const rows = db
    .prepare(
      `SELECT s.* FROM spells s ${where} ORDER BY s.level ASC, s.name ASC LIMIT ? OFFSET ?`,
    )
    .all(...params, limit, offset) as SpellRow[];

  return { rows, total: countRow.count };
}

export function getSpellByName(
  db: Database.Database,
  name: string,
): SpellRow | undefined {
  return db
    .prepare('SELECT * FROM spells WHERE LOWER(name) = LOWER(?)')
    .get(name) as SpellRow | undefined;
}

export function getSpellsByClassAndLevel(
  db: Database.Database,
  className: string,
  maxLevel: number,
): SpellRow[] {
  return db
    .prepare(
      'SELECT * FROM spells WHERE LOWER(classes) LIKE LOWER(?) AND level <= ? ORDER BY level ASC, name ASC',
    )
    .all(`%${className}%`, maxLevel) as SpellRow[];
}

// -- Equipment queries --

export function searchEquipment(
  db: Database.Database,
  filters: EquipmentFilters,
): SearchResult<EquipmentRow | MagicItemRow> {
  // Search both equipment and magic_items tables
  if (filters.rarity) {
    // Rarity filter only applies to magic items
    return searchMagicItems(db, filters);
  }

  const conditions: string[] = [];
  const params: (string | number)[] = [];

  if (filters.query) {
    const ftsQuery = sanitizeFtsQuery(filters.query);
    if (ftsQuery.length > 0) {
      conditions.push(
        'e.id IN (SELECT rowid FROM equipment_fts WHERE equipment_fts MATCH ?)',
      );
      params.push(ftsQuery);
    }
  }

  if (filters.category) {
    conditions.push('LOWER(e.category) = LOWER(?)');
    params.push(filters.category);
  }

  if (filters.cost_min !== undefined) {
    conditions.push('e.cost_gp >= ?');
    params.push(filters.cost_min);
  }

  if (filters.cost_max !== undefined) {
    conditions.push('e.cost_gp <= ?');
    params.push(filters.cost_max);
  }

  if (filters.weight_max !== undefined) {
    conditions.push('e.weight <= ?');
    params.push(filters.weight_max);
  }

  if (filters.weapon_property) {
    conditions.push('LOWER(e.weapon_properties) LIKE LOWER(?)');
    params.push(`%${filters.weapon_property}%`);
  }

  if (filters.armor_category) {
    conditions.push('LOWER(e.armor_category) = LOWER(?)');
    params.push(filters.armor_category);
  }

  const where =
    conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
  const limit = filters.limit ?? 20;
  const offset = filters.offset ?? 0;

  const countRow = db
    .prepare(`SELECT COUNT(*) as count FROM equipment e ${where}`)
    .get(...params) as { count: number };

  const rows = db
    .prepare(
      `SELECT e.* FROM equipment e ${where} ORDER BY e.name ASC LIMIT ? OFFSET ?`,
    )
    .all(...params, limit, offset) as EquipmentRow[];

  return { rows, total: countRow.count };
}

function searchMagicItems(
  db: Database.Database,
  filters: EquipmentFilters,
): SearchResult<MagicItemRow> {
  const conditions: string[] = [];
  const params: (string | number)[] = [];

  if (filters.query) {
    const ftsQuery = sanitizeFtsQuery(filters.query);
    if (ftsQuery.length > 0) {
      conditions.push(
        'mi.id IN (SELECT rowid FROM magic_items_fts WHERE magic_items_fts MATCH ?)',
      );
      params.push(ftsQuery);
    }
  }

  if (filters.rarity) {
    conditions.push('LOWER(mi.rarity) = LOWER(?)');
    params.push(filters.rarity);
  }

  const where =
    conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
  const limit = filters.limit ?? 20;
  const offset = filters.offset ?? 0;

  const countRow = db
    .prepare(`SELECT COUNT(*) as count FROM magic_items mi ${where}`)
    .get(...params) as { count: number };

  const rows = db
    .prepare(
      `SELECT mi.* FROM magic_items mi ${where} ORDER BY mi.name ASC LIMIT ? OFFSET ?`,
    )
    .all(...params, limit, offset) as MagicItemRow[];

  return { rows, total: countRow.count };
}

export function getEquipmentByName(
  db: Database.Database,
  name: string,
): EquipmentRow | undefined {
  return db
    .prepare('SELECT * FROM equipment WHERE LOWER(name) = LOWER(?)')
    .get(name) as EquipmentRow | undefined;
}

export function getMagicItemByName(
  db: Database.Database,
  name: string,
): MagicItemRow | undefined {
  return db
    .prepare('SELECT * FROM magic_items WHERE LOWER(name) = LOWER(?)')
    .get(name) as MagicItemRow | undefined;
}

// -- Class queries --

export function listClasses(db: Database.Database): ClassRow[] {
  return db
    .prepare('SELECT * FROM classes ORDER BY name ASC')
    .all() as ClassRow[];
}

export function getClassByName(
  db: Database.Database,
  name: string,
): ClassRow | undefined {
  return db
    .prepare('SELECT * FROM classes WHERE LOWER(name) = LOWER(?)')
    .get(name) as ClassRow | undefined;
}

// -- Race queries --

export function listRaces(db: Database.Database): RaceRow[] {
  return db.prepare('SELECT * FROM races ORDER BY name ASC').all() as RaceRow[];
}

export function getRaceByName(
  db: Database.Database,
  name: string,
): RaceRow | undefined {
  return db
    .prepare('SELECT * FROM races WHERE LOWER(name) = LOWER(?)')
    .get(name) as RaceRow | undefined;
}

// -- Rules & conditions queries --

export function searchRules(
  db: Database.Database,
  query: string,
): RuleRow[] {
  const ftsQuery = sanitizeFtsQuery(query);
  if (ftsQuery.length === 0) {
    return db
      .prepare('SELECT * FROM rules ORDER BY section ASC, name ASC')
      .all() as RuleRow[];
  }
  return db
    .prepare(
      'SELECT r.* FROM rules r WHERE r.id IN (SELECT rowid FROM rules_fts WHERE rules_fts MATCH ?) ORDER BY r.section ASC, r.name ASC',
    )
    .all(ftsQuery) as RuleRow[];
}

export function listConditions(db: Database.Database): ConditionRow[] {
  return db
    .prepare('SELECT * FROM conditions ORDER BY name ASC')
    .all() as ConditionRow[];
}

export function getConditionByName(
  db: Database.Database,
  name: string,
): ConditionRow | undefined {
  return db
    .prepare('SELECT * FROM conditions WHERE LOWER(name) = LOWER(?)')
    .get(name) as ConditionRow | undefined;
}

// -- XP/CR reference data --

export const CR_XP_TABLE: Record<string, number> = {
  '0': 10,
  '1/8': 25,
  '1/4': 50,
  '1/2': 100,
  '1': 200,
  '2': 450,
  '3': 700,
  '4': 1100,
  '5': 1800,
  '6': 2300,
  '7': 2900,
  '8': 3900,
  '9': 5000,
  '10': 5900,
  '11': 7200,
  '12': 8400,
  '13': 10000,
  '14': 11500,
  '15': 13000,
  '16': 15000,
  '17': 18000,
  '18': 20000,
  '19': 22000,
  '20': 25000,
  '21': 33000,
  '22': 41000,
  '23': 50000,
  '24': 62000,
  '25': 75000,
  '26': 90000,
  '27': 105000,
  '28': 120000,
  '29': 135000,
  '30': 155000,
};

export function getXpForCr(cr: string): number {
  return CR_XP_TABLE[cr] ?? 0;
}
