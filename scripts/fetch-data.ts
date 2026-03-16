/**
 * Fetch D&D 5e SRD data from 5e-bits/5e-database and ingest into SQLite.
 *
 * Data source: https://github.com/5e-bits/5e-database
 * License: SRD content is CC-BY-4.0, repo code is MIT
 *
 * Usage: npm run fetch-data
 */

import Database from 'better-sqlite3';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DATA_DIR = path.join(__dirname, '..', 'src', 'data');
const DB_PATH = path.join(DATA_DIR, 'dnd.sqlite');
const SCHEMA_PATH = path.join(DATA_DIR, 'schema.sql');

const BASE_URL =
  'https://raw.githubusercontent.com/5e-bits/5e-database/main/src/2014';

// Files to fetch
const DATA_FILES = {
  monsters: '5e-SRD-Monsters.json',
  spells: '5e-SRD-Spells.json',
  equipment: '5e-SRD-Equipment.json',
  magicItems: '5e-SRD-Magic-Items.json',
  classes: '5e-SRD-Classes.json',
  races: '5e-SRD-Races.json',
  conditions: '5e-SRD-Conditions.json',
  rules: '5e-SRD-Rules.json',
  ruleSections: '5e-SRD-Rule-Sections.json',
  // Additional data files for enrichment
  subclasses: '5e-SRD-Subclasses.json',
  subraces: '5e-SRD-Subraces.json',
  features: '5e-SRD-Features.json',
  traits: '5e-SRD-Traits.json',
  proficiencies: '5e-SRD-Proficiencies.json',
  abilityScores: '5e-SRD-Ability-Scores.json',
  levels: '5e-SRD-Levels.json',
  magicSchools: '5e-SRD-Magic-Schools.json',
};

async function fetchJson(filename: string): Promise<unknown[]> {
  const url = `${BASE_URL}/${filename}`;
  console.error(`Fetching ${url}...`);
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Failed to fetch ${url}: ${res.status}`);
  return (await res.json()) as unknown[];
}

// -- Transform functions --

interface RawMonster {
  index: string;
  name: string;
  size: string;
  type: string;
  subtype?: string;
  alignment: string;
  armor_class: Array<{ type: string; value: number; armor?: Array<{ name: string }> }>;
  hit_points: number;
  hit_dice: string;
  hit_points_roll: string;
  speed: Record<string, string>;
  strength: number;
  dexterity: number;
  constitution: number;
  intelligence: number;
  wisdom: number;
  charisma: number;
  proficiencies: Array<{ value: number; proficiency: { index: string; name: string } }>;
  damage_vulnerabilities: string[];
  damage_resistances: string[];
  damage_immunities: string[];
  condition_immunities: Array<{ index: string; name: string }>;
  senses: Record<string, string | number>;
  languages: string;
  challenge_rating: number;
  proficiency_bonus: number;
  xp: number;
  special_abilities?: Array<{ name: string; desc: string }>;
  actions?: Array<{ name: string; desc: string }>;
  legendary_actions?: Array<{ name: string; desc: string }>;
  reactions?: Array<{ name: string; desc: string }>;
}

function crToString(cr: number): string {
  if (cr === 0.125) return '1/8';
  if (cr === 0.25) return '1/4';
  if (cr === 0.5) return '1/2';
  return cr.toString();
}

function transformMonster(m: RawMonster) {
  const ac = m.armor_class[0];
  const acType = ac.armor
    ? ac.armor.map((a) => a.name).join(', ')
    : ac.type !== 'natural' && ac.type !== 'dex'
      ? ac.type
      : ac.type === 'natural'
        ? 'natural armor'
        : null;

  const savingThrows: Record<string, number> = {};
  const skills: Array<{ name: string; bonus: number }> = [];

  for (const p of m.proficiencies) {
    if (p.proficiency.index.startsWith('saving-throw-')) {
      const ability = p.proficiency.name.replace('Saving Throw: ', '');
      savingThrows[ability.toLowerCase()] = p.value;
    } else if (p.proficiency.index.startsWith('skill-')) {
      skills.push({ name: p.proficiency.name.replace('Skill: ', ''), bonus: p.value });
    }
  }

  const senses = Object.entries(m.senses)
    .filter(([k]) => k !== 'passive_perception')
    .map(([k, v]) => `${k.replace(/_/g, ' ')} ${v}`)
    .join(', ');
  const passivePerception = m.senses.passive_perception;
  const sensesStr = senses
    ? `${senses}, passive Perception ${passivePerception}`
    : `passive Perception ${passivePerception}`;

  return {
    name: m.name,
    size: m.size,
    type: m.type,
    subtype: m.subtype || null,
    alignment: m.alignment,
    ac: ac.value,
    ac_type: acType,
    hp: m.hit_points,
    hit_dice: m.hit_points_roll || m.hit_dice,
    speed: JSON.stringify(m.speed),
    str: m.strength,
    dex: m.dexterity,
    con: m.constitution,
    int: m.intelligence,
    wis: m.wisdom,
    cha: m.charisma,
    cr: crToString(m.challenge_rating),
    xp: m.xp,
    senses: sensesStr,
    languages: m.languages || null,
    traits: m.special_abilities
      ? JSON.stringify(m.special_abilities.map((a) => ({ name: a.name, description: a.desc })))
      : null,
    actions: m.actions
      ? JSON.stringify(m.actions.map((a) => ({ name: a.name, description: a.desc })))
      : null,
    legendary_actions: m.legendary_actions
      ? JSON.stringify(m.legendary_actions.map((a) => ({ name: a.name, description: a.desc })))
      : null,
    reactions: m.reactions
      ? JSON.stringify(m.reactions.map((a) => ({ name: a.name, description: a.desc })))
      : null,
    resistances: m.damage_resistances.length > 0 ? m.damage_resistances.join(', ') : null,
    immunities: m.damage_immunities.length > 0 ? m.damage_immunities.join(', ') : null,
    vulnerabilities: m.damage_vulnerabilities.length > 0 ? m.damage_vulnerabilities.join(', ') : null,
    condition_immunities: m.condition_immunities.length > 0
      ? m.condition_immunities.map((c) => c.name).join(', ')
      : null,
    saving_throws: Object.keys(savingThrows).length > 0 ? JSON.stringify(savingThrows) : null,
    skills: skills.length > 0 ? JSON.stringify(skills) : null,
    proficiency_bonus: m.proficiency_bonus,
  };
}

interface RawSpell {
  index: string;
  name: string;
  level: number;
  school: { name: string };
  casting_time: string;
  range: string;
  duration: string;
  concentration: boolean;
  ritual: boolean;
  components: string[];
  material?: string;
  classes: Array<{ name: string }>;
  desc: string[];
  higher_level?: string[];
  damage?: { damage_type?: { name: string } };
  dc?: { dc_type: { name: string } };
}

function transformSpell(s: RawSpell) {
  return {
    name: s.name,
    level: s.level,
    school: s.school.name,
    casting_time: s.casting_time,
    range: s.range,
    duration: s.duration,
    concentration: s.concentration ? 1 : 0,
    ritual: s.ritual ? 1 : 0,
    components_v: s.components.includes('V') ? 1 : 0,
    components_s: s.components.includes('S') ? 1 : 0,
    components_m: s.components.includes('M') ? 1 : 0,
    material_description: s.material || null,
    classes: JSON.stringify(s.classes.map((c) => c.name)),
    description: s.desc.join('\n\n'),
    higher_level: s.higher_level ? s.higher_level.join('\n\n') : null,
    damage_type: s.damage?.damage_type?.name || null,
    save_type: s.dc?.dc_type?.name || null,
  };
}

interface RawEquipment {
  index: string;
  name: string;
  equipment_category: { name: string };
  cost?: { quantity: number; unit: string };
  weight?: number;
  desc?: string[];
  properties?: Array<{ name: string }>;
  damage?: { damage_dice: string; damage_type: { name: string } };
  range?: { normal: number | null; long: number | null };
  weapon_range?: string;
  armor_category?: string;
  armor_class?: { base: number; dex_bonus: boolean; max_bonus?: number | null };
  stealth_disadvantage?: boolean;
  str_minimum?: number;
  category_range?: string;
}

function costToGp(cost?: { quantity: number; unit: string }): { gp: number | null; unit: string | null } {
  if (!cost) return { gp: null, unit: null };
  const multipliers: Record<string, number> = { cp: 0.01, sp: 0.1, ep: 0.5, gp: 1, pp: 10 };
  const mult = multipliers[cost.unit] ?? 1;
  return { gp: cost.quantity * mult, unit: cost.unit };
}

function transformEquipment(e: RawEquipment) {
  const { gp, unit } = costToGp(e.cost);
  const category = e.category_range || e.equipment_category.name;

  return {
    name: e.name,
    category,
    cost_gp: gp,
    cost_unit: unit,
    weight: e.weight ?? null,
    description: e.desc ? e.desc.join('\n\n') : null,
    weapon_properties: e.properties
      ? JSON.stringify(e.properties.map((p) => p.name))
      : null,
    damage_dice: e.damage?.damage_dice || null,
    damage_type: e.damage?.damage_type?.name || null,
    weapon_range: e.weapon_range || null,
    range_normal: e.range?.normal ?? null,
    range_long: e.range?.long ?? null,
    armor_category: e.armor_category || null,
    ac_base: e.armor_class?.base ?? null,
    ac_dex_bonus: e.armor_class?.dex_bonus !== undefined
      ? (e.armor_class.dex_bonus ? 1 : 0)
      : null,
    ac_max_bonus: e.armor_class?.max_bonus ?? null,
    stealth_disadvantage: e.stealth_disadvantage !== undefined
      ? (e.stealth_disadvantage ? 1 : 0)
      : null,
    str_minimum: e.str_minimum ?? null,
  };
}

interface RawMagicItem {
  index: string;
  name: string;
  rarity: { name: string };
  equipment_category: { name: string };
  variant: boolean;
  desc: string[];
}

function transformMagicItem(mi: RawMagicItem) {
  // Detect attunement from description
  const desc = mi.desc.join('\n\n');
  const attunementMatch = desc.match(/requires attunement(.*?)$/im);

  return {
    name: mi.name,
    rarity: mi.rarity.name.toLowerCase(),
    type: mi.equipment_category.name,
    requires_attunement: attunementMatch ? 1 : 0,
    attunement_description: attunementMatch ? attunementMatch[0].trim() : null,
    description: desc,
  };
}

interface RawClass {
  index: string;
  name: string;
  hit_die: number;
  saving_throws: Array<{ name: string }>;
  proficiencies: Array<{ name: string }>;
  proficiency_choices: Array<{
    desc: string;
    choose: number;
    from: { options: Array<{ item?: { name: string } }> };
  }>;
  spellcasting?: { spellcasting_ability: { name: string } };
  subclasses: Array<{ name: string }>;
}

interface RawFeature {
  index: string;
  name: string;
  level: number;
  class: { name: string };
  desc: string[];
}

function transformClass(c: RawClass, features: RawFeature[]) {
  const classFeatures = features
    .filter((f) => f.class.name === c.name)
    .sort((a, b) => a.level - b.level || a.name.localeCompare(b.name))
    .map((f) => ({
      level: f.level,
      name: f.name,
      description: f.desc.join('\n\n'),
    }));

  // Organize proficiencies
  const armorProfs = c.proficiencies
    .filter((p) => p.name.toLowerCase().includes('armor') || p.name.toLowerCase().includes('shield'))
    .map((p) => p.name);
  const weaponProfs = c.proficiencies
    .filter((p) => p.name.toLowerCase().includes('weapon') || p.name.toLowerCase().includes('sword') || p.name.toLowerCase().includes('crossbow'))
    .map((p) => p.name);
  const toolProfs = c.proficiencies
    .filter((p) => !armorProfs.includes(p.name) && !weaponProfs.includes(p.name) && !p.name.startsWith('Saving Throw'))
    .map((p) => p.name);

  const skillChoices = c.proficiency_choices?.find((pc) =>
    pc.from?.options?.some((o) => o.item?.name?.startsWith('Skill:')),
  );

  return {
    name: c.name,
    hit_die: c.hit_die,
    saving_throws: JSON.stringify(c.saving_throws.map((s) => s.name)),
    proficiencies: JSON.stringify({
      armor: armorProfs,
      weapons: weaponProfs,
      tools: toolProfs,
      skills: skillChoices
        ? {
            choose: skillChoices.choose,
            from: skillChoices.from.options
              .filter((o) => o.item?.name)
              .map((o) => o.item!.name.replace('Skill: ', '')),
          }
        : { choose: 0, from: [] },
    }),
    spellcasting_ability: c.spellcasting?.spellcasting_ability?.name || null,
    features: JSON.stringify(classFeatures),
    subclasses: c.subclasses.length > 0
      ? JSON.stringify(c.subclasses.map((s) => s.name))
      : null,
  };
}

interface RawRace {
  index: string;
  name: string;
  speed: number;
  size: string;
  ability_bonuses: Array<{ ability_score: { name: string }; bonus: number }>;
  traits: Array<{ name: string }>;
  languages: Array<{ name: string }>;
  subraces: Array<{ name: string }>;
}

interface RawTrait {
  index: string;
  name: string;
  desc: string[];
  races: Array<{ name: string }>;
  subraces: Array<{ name: string }>;
}

interface RawSubrace {
  index: string;
  name: string;
  race: { name: string };
  ability_bonuses: Array<{ ability_score: { name: string }; bonus: number }>;
  racial_traits: Array<{ name: string }>;
}

function transformRace(r: RawRace, traits: RawTrait[], subraces: RawSubrace[]) {
  const raceTraits = traits
    .filter((t) => t.races.some((tr) => tr.name === r.name))
    .map((t) => ({ name: t.name, description: t.desc.join('\n\n') }));

  const raceSubraces = subraces
    .filter((s) => s.race.name === r.name)
    .map((s) => ({
      name: s.name,
      ability_bonuses: s.ability_bonuses.map((ab) => ({
        ability: ab.ability_score.name,
        bonus: ab.bonus,
      })),
      traits: traits
        .filter((t) => t.subraces.some((sr) => sr.name === s.name))
        .map((t) => ({ name: t.name, description: t.desc.join('\n\n') })),
    }));

  return {
    name: r.name,
    speed: r.speed,
    size: r.size,
    ability_bonuses: JSON.stringify(
      r.ability_bonuses.map((ab) => ({
        ability: ab.ability_score.name,
        bonus: ab.bonus,
      })),
    ),
    traits: JSON.stringify(raceTraits),
    languages: JSON.stringify(r.languages.map((l) => l.name)),
    subraces: raceSubraces.length > 0 ? JSON.stringify(raceSubraces) : null,
  };
}

interface RawCondition {
  index: string;
  name: string;
  desc: string[];
}

function transformCondition(c: RawCondition) {
  return {
    name: c.name,
    description: c.desc.join('\n\n'),
  };
}

interface RawRuleSection {
  index: string;
  name: string;
  desc: string;
  rules?: { name: string };
}

function transformRuleSection(rs: RawRuleSection) {
  return {
    name: rs.name,
    section: rs.rules?.name || 'General',
    description: rs.desc,
  };
}

// -- Main --

async function main() {
  console.error('D&D 5e SRD Data Ingestion');
  console.error('========================\n');

  // Remove existing DB
  if (fs.existsSync(DB_PATH)) {
    fs.unlinkSync(DB_PATH);
    console.error('Removed existing database.');
  }

  // Create fresh DB
  const db = new Database(DB_PATH);
  db.pragma('journal_mode = WAL');
  db.pragma('foreign_keys = ON');
  const schema = fs.readFileSync(SCHEMA_PATH, 'utf-8');
  db.exec(schema);
  console.error('Created database with schema.\n');

  // Fetch all data files
  const [
    monstersRaw,
    spellsRaw,
    equipmentRaw,
    magicItemsRaw,
    classesRaw,
    racesRaw,
    conditionsRaw,
    _rulesRaw,
    ruleSectionsRaw,
    _subclassesRaw,
    subracesRaw,
    featuresRaw,
    traitsRaw,
  ] = await Promise.all([
    fetchJson(DATA_FILES.monsters),
    fetchJson(DATA_FILES.spells),
    fetchJson(DATA_FILES.equipment),
    fetchJson(DATA_FILES.magicItems),
    fetchJson(DATA_FILES.classes),
    fetchJson(DATA_FILES.races),
    fetchJson(DATA_FILES.conditions),
    fetchJson(DATA_FILES.rules),
    fetchJson(DATA_FILES.ruleSections),
    fetchJson(DATA_FILES.subclasses),
    fetchJson(DATA_FILES.subraces),
    fetchJson(DATA_FILES.features),
    fetchJson(DATA_FILES.traits),
  ]);

  // -- Insert monsters --
  const insertMonster = db.prepare(`
    INSERT OR IGNORE INTO monsters (name, size, type, subtype, alignment, ac, ac_type, hp, hit_dice, speed, str, dex, con, int, wis, cha, cr, xp, senses, languages, traits, actions, legendary_actions, reactions, resistances, immunities, vulnerabilities, condition_immunities, saving_throws, skills, proficiency_bonus)
    VALUES (@name, @size, @type, @subtype, @alignment, @ac, @ac_type, @hp, @hit_dice, @speed, @str, @dex, @con, @int, @wis, @cha, @cr, @xp, @senses, @languages, @traits, @actions, @legendary_actions, @reactions, @resistances, @immunities, @vulnerabilities, @condition_immunities, @saving_throws, @skills, @proficiency_bonus)
  `);

  const insertMonstersTransaction = db.transaction(() => {
    for (const m of monstersRaw as RawMonster[]) {
      insertMonster.run(transformMonster(m));
    }
  });
  insertMonstersTransaction();
  console.error(`Inserted ${monstersRaw.length} monsters.`);

  // -- Insert spells --
  const insertSpell = db.prepare(`
    INSERT OR IGNORE INTO spells (name, level, school, casting_time, range, duration, concentration, ritual, components_v, components_s, components_m, material_description, classes, description, higher_level, damage_type, save_type)
    VALUES (@name, @level, @school, @casting_time, @range, @duration, @concentration, @ritual, @components_v, @components_s, @components_m, @material_description, @classes, @description, @higher_level, @damage_type, @save_type)
  `);

  const insertSpellsTransaction = db.transaction(() => {
    for (const s of spellsRaw as RawSpell[]) {
      insertSpell.run(transformSpell(s));
    }
  });
  insertSpellsTransaction();
  console.error(`Inserted ${spellsRaw.length} spells.`);

  // -- Insert equipment --
  const insertEquipment = db.prepare(`
    INSERT OR IGNORE INTO equipment (name, category, cost_gp, cost_unit, weight, description, weapon_properties, damage_dice, damage_type, weapon_range, range_normal, range_long, armor_category, ac_base, ac_dex_bonus, ac_max_bonus, stealth_disadvantage, str_minimum)
    VALUES (@name, @category, @cost_gp, @cost_unit, @weight, @description, @weapon_properties, @damage_dice, @damage_type, @weapon_range, @range_normal, @range_long, @armor_category, @ac_base, @ac_dex_bonus, @ac_max_bonus, @stealth_disadvantage, @str_minimum)
  `);

  const insertEquipmentTransaction = db.transaction(() => {
    for (const e of equipmentRaw as RawEquipment[]) {
      insertEquipment.run(transformEquipment(e));
    }
  });
  insertEquipmentTransaction();
  console.error(`Inserted ${equipmentRaw.length} equipment items.`);

  // -- Insert magic items --
  const insertMagicItem = db.prepare(`
    INSERT OR IGNORE INTO magic_items (name, rarity, type, requires_attunement, attunement_description, description)
    VALUES (@name, @rarity, @type, @requires_attunement, @attunement_description, @description)
  `);

  const insertMagicItemsTransaction = db.transaction(() => {
    for (const mi of magicItemsRaw as RawMagicItem[]) {
      // Skip variants (they're just pointers to base items)
      if ((mi as RawMagicItem).variant) continue;
      insertMagicItem.run(transformMagicItem(mi));
    }
  });
  insertMagicItemsTransaction();
  const magicItemCount = (db.prepare('SELECT COUNT(*) as count FROM magic_items').get() as { count: number }).count;
  console.error(`Inserted ${magicItemCount} magic items (excluding variants).`);

  // -- Insert classes --
  const insertClass = db.prepare(`
    INSERT OR IGNORE INTO classes (name, hit_die, saving_throws, proficiencies, spellcasting_ability, features, subclasses)
    VALUES (@name, @hit_die, @saving_throws, @proficiencies, @spellcasting_ability, @features, @subclasses)
  `);

  const insertClassesTransaction = db.transaction(() => {
    for (const c of classesRaw as RawClass[]) {
      insertClass.run(transformClass(c, featuresRaw as RawFeature[]));
    }
  });
  insertClassesTransaction();
  console.error(`Inserted ${classesRaw.length} classes.`);

  // -- Insert races --
  const insertRace = db.prepare(`
    INSERT OR IGNORE INTO races (name, speed, size, ability_bonuses, traits, languages, subraces)
    VALUES (@name, @speed, @size, @ability_bonuses, @traits, @languages, @subraces)
  `);

  const insertRacesTransaction = db.transaction(() => {
    for (const r of racesRaw as RawRace[]) {
      insertRace.run(transformRace(r, traitsRaw as RawTrait[], subracesRaw as RawSubrace[]));
    }
  });
  insertRacesTransaction();
  console.error(`Inserted ${racesRaw.length} races.`);

  // -- Insert conditions --
  const insertCondition = db.prepare(`
    INSERT OR IGNORE INTO conditions (name, description) VALUES (@name, @description)
  `);

  const insertConditionsTransaction = db.transaction(() => {
    for (const c of conditionsRaw as RawCondition[]) {
      insertCondition.run(transformCondition(c));
    }
  });
  insertConditionsTransaction();
  console.error(`Inserted ${conditionsRaw.length} conditions.`);

  // -- Insert rules (from rule sections) --
  const insertRule = db.prepare(`
    INSERT OR IGNORE INTO rules (name, section, description) VALUES (@name, @section, @description)
  `);

  const insertRulesTransaction = db.transaction(() => {
    for (const rs of ruleSectionsRaw as RawRuleSection[]) {
      insertRule.run(transformRuleSection(rs));
    }
  });
  insertRulesTransaction();
  console.error(`Inserted ${ruleSectionsRaw.length} rule sections.`);

  // Summary
  console.error('\n--- Summary ---');
  const counts = {
    monsters: (db.prepare('SELECT COUNT(*) as c FROM monsters').get() as { c: number }).c,
    spells: (db.prepare('SELECT COUNT(*) as c FROM spells').get() as { c: number }).c,
    equipment: (db.prepare('SELECT COUNT(*) as c FROM equipment').get() as { c: number }).c,
    magic_items: magicItemCount,
    classes: (db.prepare('SELECT COUNT(*) as c FROM classes').get() as { c: number }).c,
    races: (db.prepare('SELECT COUNT(*) as c FROM races').get() as { c: number }).c,
    conditions: (db.prepare('SELECT COUNT(*) as c FROM conditions').get() as { c: number }).c,
    rules: (db.prepare('SELECT COUNT(*) as c FROM rules').get() as { c: number }).c,
  };

  for (const [table, count] of Object.entries(counts)) {
    console.error(`  ${table}: ${count}`);
  }

  const totalEntities = Object.values(counts).reduce((a, b) => a + b, 0);
  console.error(`\nTotal: ${totalEntities} entities`);

  db.close();
  console.error(`\nDatabase written to: ${DB_PATH}`);
  console.error(
    '\nAttribution: This product includes material from the System Reference Document 5.1,',
  );
  console.error(
    'Copyright 2016, Wizards of the Coast, Inc. Licensed under CC-BY-4.0.',
  );
}

main().catch((err) => {
  console.error('Fatal error:', err);
  process.exit(1);
});
