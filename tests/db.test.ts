import { describe, it, expect, beforeAll } from 'vitest';
import { createTestDb } from './helpers/test-db.js';
import {
  searchMonsters,
  getMonsterByName,
  getMonstersByCrRange,
  searchSpells,
  getSpellByName,
  getSpellsByClassAndLevel,
  searchEquipment,
  getEquipmentByName,
  getMagicItemByName,
  listClasses,
  getClassByName,
  listRaces,
  getRaceByName,
  searchRules,
  listConditions,
  getConditionByName,
  getXpForCr,
  sanitizeFtsQuery,
  crToNumeric,
} from '../src/data/db.js';
import type Database from 'better-sqlite3';

describe('database', () => {
  let db: Database.Database;

  beforeAll(() => {
    db = createTestDb();
  });

  describe('schema', () => {
    it('creates all tables', () => {
      const tables = db
        .prepare(
          "SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' ORDER BY name",
        )
        .all() as { name: string }[];
      const names = tables.map((t) => t.name);
      expect(names).toContain('monsters');
      expect(names).toContain('spells');
      expect(names).toContain('equipment');
      expect(names).toContain('magic_items');
      expect(names).toContain('classes');
      expect(names).toContain('races');
      expect(names).toContain('conditions');
      expect(names).toContain('rules');
    });

    it('creates FTS virtual tables', () => {
      const tables = db
        .prepare(
          "SELECT name FROM sqlite_master WHERE type='table' AND name LIKE '%_fts' ORDER BY name",
        )
        .all() as { name: string }[];
      const names = tables.map((t) => t.name);
      expect(names).toContain('monsters_fts');
      expect(names).toContain('spells_fts');
      expect(names).toContain('equipment_fts');
      expect(names).toContain('rules_fts');
    });
  });

  describe('sanitizeFtsQuery', () => {
    it('wraps tokens in quotes', () => {
      expect(sanitizeFtsQuery('fire dragon')).toBe('"fire" "dragon"');
    });

    it('removes special characters', () => {
      expect(sanitizeFtsQuery('fire*ball')).toBe('"fireball"');
    });

    it('handles empty input', () => {
      expect(sanitizeFtsQuery('')).toBe('');
    });
  });

  describe('crToNumeric', () => {
    it('converts fractional CRs', () => {
      expect(crToNumeric('1/8')).toBe(0.125);
      expect(crToNumeric('1/4')).toBe(0.25);
      expect(crToNumeric('1/2')).toBe(0.5);
    });

    it('converts integer CRs', () => {
      expect(crToNumeric('0')).toBe(0);
      expect(crToNumeric('17')).toBe(17);
    });
  });

  describe('monster queries', () => {
    it('searches monsters by name', () => {
      const result = searchMonsters(db, { query: 'goblin' });
      expect(result.total).toBe(1);
      expect(result.rows[0].name).toBe('Goblin');
    });

    it('searches monsters by CR', () => {
      const result = searchMonsters(db, { cr: '1/4' });
      expect(result.total).toBe(2); // Goblin and Zombie
    });

    it('searches monsters by CR range', () => {
      const result = searchMonsters(db, { cr_min: 1, cr_max: 5 });
      expect(result.total).toBe(1); // Owlbear (CR 3)
      expect(result.rows[0].name).toBe('Owlbear');
    });

    it('searches monsters by type', () => {
      const result = searchMonsters(db, { type: 'dragon' });
      expect(result.total).toBe(1);
      expect(result.rows[0].name).toBe('Adult Red Dragon');
    });

    it('searches monsters by size', () => {
      const result = searchMonsters(db, { size: 'Small' });
      expect(result.total).toBe(1);
      expect(result.rows[0].name).toBe('Goblin');
    });

    it('combines multiple filters', () => {
      const result = searchMonsters(db, { type: 'humanoid', size: 'Small' });
      expect(result.total).toBe(1);
      expect(result.rows[0].name).toBe('Goblin');
    });

    it('paginates results', () => {
      const result = searchMonsters(db, { limit: 2, offset: 0 });
      expect(result.rows).toHaveLength(2);
      expect(result.total).toBe(4);
    });

    it('returns empty for no matches', () => {
      const result = searchMonsters(db, { query: 'nonexistent' });
      expect(result.total).toBe(0);
      expect(result.rows).toHaveLength(0);
    });

    it('gets monster by name (case insensitive)', () => {
      const monster = getMonsterByName(db, 'goblin');
      expect(monster).toBeDefined();
      expect(monster!.name).toBe('Goblin');
    });

    it('gets monsters by CR range', () => {
      const monsters = getMonstersByCrRange(db, 0, 0.5);
      expect(monsters).toHaveLength(2); // Goblin + Zombie (both CR 1/4)
    });
  });

  describe('spell queries', () => {
    it('searches spells by name', () => {
      const result = searchSpells(db, { query: 'fireball' });
      expect(result.total).toBe(1);
      expect(result.rows[0].name).toBe('Fireball');
    });

    it('searches spells by level', () => {
      const result = searchSpells(db, { level: 1 });
      expect(result.total).toBe(3); // Cure Wounds, Shield, Detect Magic
    });

    it('searches spells by school', () => {
      const result = searchSpells(db, { school: 'Evocation' });
      expect(result.total).toBe(3); // Fireball, Cure Wounds, Light
    });

    it('searches spells by class', () => {
      const result = searchSpells(db, { class_name: 'Wizard' });
      expect(result.total).toBeGreaterThanOrEqual(4); // Fireball, Shield, Detect Magic, Light, Hold Person
    });

    it('filters concentration spells', () => {
      const result = searchSpells(db, { concentration: true });
      expect(result.total).toBe(2); // Detect Magic, Hold Person
    });

    it('filters ritual spells', () => {
      const result = searchSpells(db, { ritual: true });
      expect(result.total).toBe(1); // Detect Magic
    });

    it('filters by damage type', () => {
      const result = searchSpells(db, { damage_type: 'fire' });
      expect(result.total).toBe(1); // Fireball
    });

    it('filters by save type', () => {
      const result = searchSpells(db, { save_type: 'Wisdom' });
      expect(result.total).toBe(1); // Hold Person
    });

    it('gets spell by name (case insensitive)', () => {
      const spell = getSpellByName(db, 'shield');
      expect(spell).toBeDefined();
      expect(spell!.name).toBe('Shield');
    });

    it('gets spells by class and max level', () => {
      const spells = getSpellsByClassAndLevel(db, 'Wizard', 1);
      expect(spells.length).toBeGreaterThanOrEqual(3); // Light (0), Shield (1), Detect Magic (1)
    });
  });

  describe('equipment queries', () => {
    it('searches equipment by name', () => {
      const result = searchEquipment(db, { query: 'longsword' });
      expect(result.total).toBe(1);
    });

    it('searches by category', () => {
      const result = searchEquipment(db, { category: 'Heavy Armor' });
      expect(result.total).toBe(1);
    });

    it('searches by cost range', () => {
      const result = searchEquipment(db, { cost_min: 10, cost_max: 30 });
      expect(result.total).toBeGreaterThanOrEqual(3);
    });

    it('searches by weapon property', () => {
      const result = searchEquipment(db, { weapon_property: 'Versatile' });
      expect(result.total).toBe(1); // Longsword
    });

    it('searches magic items by rarity', () => {
      const result = searchEquipment(db, { rarity: 'uncommon' });
      expect(result.total).toBe(3);
    });

    it('gets equipment by name', () => {
      const item = getEquipmentByName(db, 'chain mail');
      expect(item).toBeDefined();
      expect(item!.ac_base).toBe(16);
    });

    it('gets magic item by name', () => {
      const item = getMagicItemByName(db, 'bag of holding');
      expect(item).toBeDefined();
      expect(item!.rarity).toBe('uncommon');
    });
  });

  describe('class queries', () => {
    it('lists all classes', () => {
      const classes = listClasses(db);
      expect(classes).toHaveLength(3);
    });

    it('gets class by name', () => {
      const cls = getClassByName(db, 'fighter');
      expect(cls).toBeDefined();
      expect(cls!.hit_die).toBe(10);
    });

    it('returns undefined for unknown class', () => {
      const cls = getClassByName(db, 'artificer');
      expect(cls).toBeUndefined();
    });
  });

  describe('race queries', () => {
    it('lists all races', () => {
      const races = listRaces(db);
      expect(races).toHaveLength(2);
    });

    it('gets race by name', () => {
      const race = getRaceByName(db, 'elf');
      expect(race).toBeDefined();
      expect(race!.speed).toBe(30);
    });

    it('returns undefined for unknown race', () => {
      const race = getRaceByName(db, 'tiefling');
      expect(race).toBeUndefined();
    });
  });

  describe('rules & conditions queries', () => {
    it('searches rules by query', () => {
      const rules = searchRules(db, 'saving throw');
      expect(rules.length).toBeGreaterThanOrEqual(1);
    });

    it('lists all conditions', () => {
      const conditions = listConditions(db);
      expect(conditions).toHaveLength(5);
    });

    it('gets condition by name', () => {
      const condition = getConditionByName(db, 'blinded');
      expect(condition).toBeDefined();
      expect(condition!.description).toContain("can't see");
    });

    it('returns undefined for unknown condition', () => {
      const condition = getConditionByName(db, 'nonexistent');
      expect(condition).toBeUndefined();
    });
  });

  describe('XP/CR helpers', () => {
    it('returns correct XP for common CRs', () => {
      expect(getXpForCr('0')).toBe(10);
      expect(getXpForCr('1/4')).toBe(50);
      expect(getXpForCr('1')).toBe(200);
      expect(getXpForCr('17')).toBe(18000);
    });

    it('returns 0 for unknown CR', () => {
      expect(getXpForCr('999')).toBe(0);
    });
  });
});
