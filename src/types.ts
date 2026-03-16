// Database row types

export interface MonsterRow {
  id: number;
  name: string;
  size: string;
  type: string;
  subtype: string | null;
  alignment: string;
  ac: number;
  ac_type: string | null;
  hp: number;
  hit_dice: string;
  speed: string; // JSON
  str: number;
  dex: number;
  con: number;
  int: number;
  wis: number;
  cha: number;
  cr: string;
  xp: number;
  senses: string | null;
  languages: string | null;
  traits: string | null; // JSON array
  actions: string | null; // JSON array
  legendary_actions: string | null; // JSON array
  reactions: string | null; // JSON array
  resistances: string | null;
  immunities: string | null;
  vulnerabilities: string | null;
  condition_immunities: string | null;
  saving_throws: string | null; // JSON
  skills: string | null; // JSON
  proficiency_bonus: number | null;
}

export interface SpellRow {
  id: number;
  name: string;
  level: number;
  school: string;
  casting_time: string;
  range: string;
  duration: string;
  concentration: number; // 0 or 1
  ritual: number; // 0 or 1
  components_v: number;
  components_s: number;
  components_m: number;
  material_description: string | null;
  classes: string; // JSON array
  description: string;
  higher_level: string | null;
  damage_type: string | null;
  save_type: string | null;
}

export interface EquipmentRow {
  id: number;
  name: string;
  category: string;
  cost_gp: number | null;
  cost_unit: string | null;
  weight: number | null;
  description: string | null;
  weapon_properties: string | null; // JSON array
  damage_dice: string | null;
  damage_type: string | null;
  weapon_range: string | null;
  range_normal: number | null;
  range_long: number | null;
  armor_category: string | null;
  ac_base: number | null;
  ac_dex_bonus: number | null; // 1 = yes, 0 = no
  ac_max_bonus: number | null;
  stealth_disadvantage: number | null;
  str_minimum: number | null;
}

export interface MagicItemRow {
  id: number;
  name: string;
  rarity: string;
  type: string;
  requires_attunement: number;
  attunement_description: string | null;
  description: string;
}

export interface ClassRow {
  id: number;
  name: string;
  hit_die: number;
  saving_throws: string; // JSON array
  proficiencies: string; // JSON
  spellcasting_ability: string | null;
  features: string; // JSON array [{level, name, description}]
  subclasses: string | null; // JSON array
}

export interface RaceRow {
  id: number;
  name: string;
  speed: number;
  size: string;
  ability_bonuses: string; // JSON array
  traits: string; // JSON array
  languages: string; // JSON array
  subraces: string | null; // JSON array
}

export interface ConditionRow {
  id: number;
  name: string;
  description: string;
}

export interface RuleRow {
  id: number;
  name: string;
  section: string;
  description: string;
}

// Filter types

export interface MonsterFilters {
  query?: string;
  cr?: string;
  cr_min?: number;
  cr_max?: number;
  type?: string;
  size?: string;
  alignment?: string;
  limit?: number;
  offset?: number;
}

export interface SpellFilters {
  query?: string;
  level?: number;
  school?: string;
  class_name?: string;
  concentration?: boolean;
  ritual?: boolean;
  has_material?: boolean;
  damage_type?: string;
  save_type?: string;
  limit?: number;
  offset?: number;
}

export interface EquipmentFilters {
  query?: string;
  category?: string;
  cost_min?: number;
  cost_max?: number;
  weight_max?: number;
  weapon_property?: string;
  armor_category?: string;
  rarity?: string;
  limit?: number;
  offset?: number;
}
