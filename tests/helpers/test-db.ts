import { getDatabase } from '../../src/data/db.js';
import { createServer } from '../../src/server.js';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { InMemoryTransport } from '@modelcontextprotocol/sdk/inMemory.js';
import type Database from 'better-sqlite3';

export function seedTestData(db: Database.Database): void {
  // Monsters — various CRs, types, sizes
  const insertMonster = db.prepare(`
    INSERT INTO monsters (name, size, type, subtype, alignment, ac, ac_type, hp, hit_dice, speed, str, dex, con, int, wis, cha, cr, xp, senses, languages, traits, actions, legendary_actions, reactions, resistances, immunities, vulnerabilities, condition_immunities, saving_throws, skills, proficiency_bonus)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  insertMonster.run(
    'Goblin', 'Small', 'humanoid', 'goblinoid', 'neutral evil',
    15, 'leather armor, shield', 7, '2d6', '{"walk":30}',
    8, 14, 10, 10, 8, 8, '1/4', 50,
    'darkvision 60 ft.', 'Common, Goblin',
    JSON.stringify([{ name: 'Nimble Escape', description: 'The goblin can take the Disengage or Hide action as a bonus action on each of its turns.' }]),
    JSON.stringify([{ name: 'Scimitar', description: 'Melee Weapon Attack: +4 to hit, reach 5 ft., one target. Hit: 5 (1d6 + 2) slashing damage.' }]),
    null, null, null, null, null, null, null,
    JSON.stringify([{ name: 'Stealth', bonus: 6 }]), 2
  );

  insertMonster.run(
    'Adult Red Dragon', 'Huge', 'dragon', null, 'chaotic evil',
    19, 'natural armor', 256, '19d12+133', '{"walk":40,"climb":40,"fly":80}',
    27, 10, 25, 16, 13, 21, '17', 18000,
    'blindsight 60 ft., darkvision 120 ft.', 'Common, Draconic',
    JSON.stringify([
      { name: 'Legendary Resistance (3/Day)', description: 'If the dragon fails a saving throw, it can choose to succeed instead.' },
      { name: 'Frightful Presence', description: 'Each creature within 120 feet must succeed on a DC 19 Wisdom saving throw or become frightened for 1 minute.' }
    ]),
    JSON.stringify([
      { name: 'Multiattack', description: 'The dragon can use its Frightful Presence. It then makes three attacks: one with its bite and two with its claws.' },
      { name: 'Bite', description: 'Melee Weapon Attack: +14 to hit, reach 10 ft., one target. Hit: 19 (2d10 + 8) piercing damage plus 7 (2d6) fire damage.' },
      { name: 'Fire Breath (Recharge 5-6)', description: 'The dragon exhales fire in a 60-foot cone. Each creature in that area must make a DC 21 Dexterity saving throw, taking 63 (18d6) fire damage on a failed save, or half as much damage on a successful one.' }
    ]),
    JSON.stringify([
      { name: 'Detect', description: 'The dragon makes a Wisdom (Perception) check.' },
      { name: 'Tail Attack', description: 'The dragon makes a tail attack.' },
      { name: 'Wing Attack (Costs 2 Actions)', description: 'The dragon beats its wings. Each creature within 10 feet must succeed on a DC 22 Dexterity saving throw or take 15 (2d6 + 8) bludgeoning damage.' }
    ]),
    null,
    'fire', 'fire', null, null,
    JSON.stringify({ dex: 6, con: 13, wis: 7, cha: 11 }),
    JSON.stringify([{ name: 'Perception', bonus: 13 }, { name: 'Stealth', bonus: 6 }]),
    6
  );

  insertMonster.run(
    'Zombie', 'Medium', 'undead', null, 'neutral evil',
    8, null, 22, '3d8+9', '{"walk":20}',
    13, 6, 16, 3, 6, 5, '1/4', 50,
    'darkvision 60 ft.', 'understands Common but can\'t speak',
    JSON.stringify([{ name: 'Undead Fortitude', description: 'If damage reduces the zombie to 0 hit points, it must make a Constitution saving throw with a DC of 5 + the damage taken, unless the damage is radiant or from a critical hit. On a success, the zombie drops to 1 hit point instead.' }]),
    JSON.stringify([{ name: 'Slam', description: 'Melee Weapon Attack: +3 to hit, reach 5 ft., one target. Hit: 4 (1d6 + 1) bludgeoning damage.' }]),
    null, null, null,
    'poison', null,
    'poisoned',
    null, null, null
  );

  insertMonster.run(
    'Owlbear', 'Large', 'monstrosity', null, 'unaligned',
    13, 'natural armor', 59, '7d10+21', '{"walk":40}',
    20, 12, 17, 3, 12, 7, '3', 700,
    'darkvision 60 ft.', null,
    JSON.stringify([{ name: 'Keen Sight and Smell', description: 'The owlbear has advantage on Wisdom (Perception) checks that rely on sight or smell.' }]),
    JSON.stringify([
      { name: 'Multiattack', description: 'The owlbear makes two attacks: one with its beak and one with its claws.' },
      { name: 'Beak', description: 'Melee Weapon Attack: +7 to hit, reach 5 ft., one creature. Hit: 10 (1d10 + 5) piercing damage.' },
      { name: 'Claws', description: 'Melee Weapon Attack: +7 to hit, reach 5 ft., one target. Hit: 14 (2d8 + 5) slashing damage.' }
    ]),
    null, null, null, null, null, null, null,
    JSON.stringify([{ name: 'Perception', bonus: 3 }]), 2
  );

  // Spells — various levels, schools, classes
  const insertSpell = db.prepare(`
    INSERT INTO spells (name, level, school, casting_time, range, duration, concentration, ritual, components_v, components_s, components_m, material_description, classes, description, higher_level, damage_type, save_type)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  insertSpell.run(
    'Fireball', 3, 'Evocation', '1 action', '150 feet', 'Instantaneous', 0, 0,
    1, 1, 1, 'A tiny ball of bat guano and sulfur',
    JSON.stringify(['Sorcerer', 'Wizard']),
    'A bright streak flashes from your pointing finger to a point you choose within range and then blossoms with a low roar into an explosion of flame. Each creature in a 20-foot-radius sphere centered on that point must make a Dexterity saving throw. A target takes 8d6 fire damage on a failed save, or half as much damage on a successful one.',
    'When you cast this spell using a spell slot of 4th level or higher, the damage increases by 1d6 for each slot level above 3rd.',
    'fire', 'Dexterity'
  );

  insertSpell.run(
    'Cure Wounds', 1, 'Evocation', '1 action', 'Touch', 'Instantaneous', 0, 0,
    1, 1, 0, null,
    JSON.stringify(['Bard', 'Cleric', 'Druid', 'Paladin', 'Ranger']),
    'A creature you touch regains a number of hit points equal to 1d8 + your spellcasting ability modifier. This spell has no effect on undead or constructs.',
    'When you cast this spell using a spell slot of 2nd level or higher, the healing increases by 1d8 for each slot level above 1st.',
    null, null
  );

  insertSpell.run(
    'Shield', 1, 'Abjuration', '1 reaction', 'Self', '1 round', 0, 0,
    1, 1, 0, null,
    JSON.stringify(['Sorcerer', 'Wizard']),
    'An invisible barrier of magical force appears and protects you. Until the start of your next turn, you have a +5 bonus to AC, including against the triggering attack, and you take no damage from magic missile.',
    null, null, null
  );

  insertSpell.run(
    'Detect Magic', 1, 'Divination', '1 action', 'Self', 'Up to 10 minutes', 1, 1,
    1, 1, 0, null,
    JSON.stringify(['Bard', 'Cleric', 'Druid', 'Paladin', 'Ranger', 'Sorcerer', 'Wizard']),
    'For the duration, you sense the presence of magic within 30 feet of you. If you sense magic in this way, you can use your action to see a faint aura around any visible creature or object in the area that bears magic, and you learn its school of magic, if any.',
    null, null, null
  );

  insertSpell.run(
    'Light', 0, 'Evocation', '1 action', 'Touch', '1 hour', 0, 0,
    1, 0, 1, 'A firefly or phosphorescent moss',
    JSON.stringify(['Bard', 'Cleric', 'Sorcerer', 'Wizard']),
    'You touch one object that is no larger than 10 feet in any dimension. Until the spell ends, the object sheds bright light in a 20-foot radius and dim light for an additional 20 feet.',
    null, null, null
  );

  insertSpell.run(
    'Hold Person', 2, 'Enchantment', '1 action', '60 feet', 'Up to 1 minute', 1, 0,
    1, 1, 1, 'A small, straight piece of iron',
    JSON.stringify(['Bard', 'Cleric', 'Druid', 'Sorcerer', 'Warlock', 'Wizard']),
    'Choose a humanoid that you can see within range. The target must succeed on a Wisdom saving throw or be paralyzed for the duration. At the end of each of its turns, the target can make another Wisdom saving throw. On a success, the spell ends on the target.',
    'When you cast this spell using a spell slot of 3rd level or higher, you can target one additional humanoid for each slot level above 2nd.',
    null, 'Wisdom'
  );

  // Equipment — weapons, armor, gear
  const insertEquipment = db.prepare(`
    INSERT INTO equipment (name, category, cost_gp, cost_unit, weight, description, weapon_properties, damage_dice, damage_type, weapon_range, range_normal, range_long, armor_category, ac_base, ac_dex_bonus, ac_max_bonus, stealth_disadvantage, str_minimum)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  insertEquipment.run(
    'Longsword', 'Martial Melee Weapons', 15, 'gp', 3,
    'A versatile martial melee weapon.',
    JSON.stringify(['Versatile']), '1d8', 'slashing', 'Melee', null, null,
    null, null, null, null, null, null
  );

  insertEquipment.run(
    'Shortbow', 'Simple Ranged Weapons', 25, 'gp', 2,
    'A simple ranged weapon.',
    JSON.stringify(['Ammunition', 'Two-Handed']), '1d6', 'piercing', 'Ranged', 80, 320,
    null, null, null, null, null, null
  );

  insertEquipment.run(
    'Chain Mail', 'Heavy Armor', 75, 'gp', 55,
    'Made of interlocking metal rings, chain mail includes a layer of quilted fabric worn underneath the mail to prevent chafing.',
    null, null, null, null, null, null,
    'Heavy', 16, 0, null, 1, 13
  );

  insertEquipment.run(
    'Shield', 'Shields', 10, 'gp', 6,
    'A shield is made from wood or metal and is carried in one hand. You can benefit from only one shield at a time.',
    null, null, null, null, null, null,
    null, 2, null, null, null, null
  );

  insertEquipment.run(
    'Leather Armor', 'Light Armor', 10, 'gp', 10,
    'The breastpiece and shoulder protectors of this armor are made of leather that has been stiffened by being boiled in oil.',
    null, null, null, null, null, null,
    'Light', 11, 1, null, 0, null
  );

  insertEquipment.run(
    'Backpack', 'Adventuring Gear', 2, 'gp', 5,
    'A backpack can hold one cubic foot or 30 pounds of gear.',
    null, null, null, null, null, null,
    null, null, null, null, null, null
  );

  insertEquipment.run(
    'Rope, Hempen (50 feet)', 'Adventuring Gear', 1, 'gp', 10,
    '50 feet of hempen rope.',
    null, null, null, null, null, null,
    null, null, null, null, null, null
  );

  // Magic Items
  const insertMagicItem = db.prepare(`
    INSERT INTO magic_items (name, rarity, type, requires_attunement, attunement_description, description)
    VALUES (?, ?, ?, ?, ?, ?)
  `);

  insertMagicItem.run(
    'Bag of Holding', 'uncommon', 'Wondrous item', 0, null,
    'This bag has an interior space considerably larger than its outside dimensions, roughly 2 feet in diameter at the mouth and 4 feet deep. The bag can hold up to 500 pounds, not exceeding a volume of 64 cubic feet.'
  );

  insertMagicItem.run(
    '+1 Longsword', 'uncommon', 'Weapon', 0, null,
    'You have a +1 bonus to attack and damage rolls made with this magic weapon.'
  );

  insertMagicItem.run(
    'Cloak of Protection', 'uncommon', 'Wondrous item', 1, 'requires attunement',
    'You gain a +1 bonus to AC and saving throws while you wear this cloak.'
  );

  // Classes
  const insertClass = db.prepare(`
    INSERT INTO classes (name, hit_die, saving_throws, proficiencies, spellcasting_ability, features, subclasses)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `);

  insertClass.run(
    'Fighter', 10,
    JSON.stringify(['Strength', 'Constitution']),
    JSON.stringify({ armor: ['All armor', 'Shields'], weapons: ['Simple weapons', 'Martial weapons'], tools: [], skills: { choose: 2, from: ['Acrobatics', 'Animal Handling', 'Athletics', 'History', 'Insight', 'Intimidation', 'Perception', 'Survival'] } }),
    null,
    JSON.stringify([
      { level: 1, name: 'Fighting Style', description: 'You adopt a particular style of fighting as your specialty.' },
      { level: 1, name: 'Second Wind', description: 'You have a limited well of stamina. On your turn, you can use a bonus action to regain hit points equal to 1d10 + your fighter level.' },
      { level: 2, name: 'Action Surge', description: 'You can push yourself beyond your normal limits for a moment. On your turn, you can take one additional action.' },
      { level: 5, name: 'Extra Attack', description: 'You can attack twice, instead of once, whenever you take the Attack action on your turn.' },
      { level: 9, name: 'Indomitable', description: 'You can reroll a saving throw that you fail. If you do so, you must use the new roll.' },
      { level: 11, name: 'Extra Attack (2)', description: 'You can attack three times whenever you take the Attack action on your turn.' },
      { level: 20, name: 'Extra Attack (3)', description: 'You can attack four times whenever you take the Attack action on your turn.' }
    ]),
    JSON.stringify(['Champion', 'Battle Master', 'Eldritch Knight'])
  );

  insertClass.run(
    'Wizard', 6,
    JSON.stringify(['Intelligence', 'Wisdom']),
    JSON.stringify({ armor: [], weapons: ['Daggers', 'Darts', 'Slings', 'Quarterstaffs', 'Light crossbows'], tools: [], skills: { choose: 2, from: ['Arcana', 'History', 'Insight', 'Investigation', 'Medicine', 'Religion'] } }),
    'Intelligence',
    JSON.stringify([
      { level: 1, name: 'Arcane Recovery', description: 'You have learned to regain some of your magical energy by studying your spellbook. Once per day when you finish a short rest, you can choose expended spell slots to recover.' },
      { level: 2, name: 'Arcane Tradition', description: 'You choose an arcane tradition, shaping your practice of magic.' },
      { level: 18, name: 'Spell Mastery', description: 'You have achieved such mastery over certain spells that you can cast them at will.' },
      { level: 20, name: 'Signature Spells', description: 'You gain mastery over two powerful spells and can cast them without expending a spell slot.' }
    ]),
    JSON.stringify(['School of Abjuration', 'School of Evocation'])
  );

  insertClass.run(
    'Cleric', 8,
    JSON.stringify(['Wisdom', 'Charisma']),
    JSON.stringify({ armor: ['Light armor', 'Medium armor', 'Shields'], weapons: ['Simple weapons'], tools: [], skills: { choose: 2, from: ['History', 'Insight', 'Medicine', 'Persuasion', 'Religion'] } }),
    'Wisdom',
    JSON.stringify([
      { level: 1, name: 'Divine Domain', description: 'Choose one domain related to your deity.' },
      { level: 1, name: 'Spellcasting', description: 'As a conduit for divine power, you can cast cleric spells.' },
      { level: 2, name: 'Channel Divinity', description: 'You gain the ability to channel divine energy directly from your deity.' },
      { level: 2, name: 'Channel Divinity: Turn Undead', description: 'As an action, each undead within 30 feet must make a Wisdom saving throw.' },
      { level: 5, name: 'Destroy Undead', description: 'When an undead fails its saving throw against your Turn Undead feature, the creature is instantly destroyed if its challenge rating is at or below a certain threshold.' },
      { level: 10, name: 'Divine Intervention', description: 'You can call on your deity to intervene on your behalf.' }
    ]),
    JSON.stringify(['Life Domain'])
  );

  // Races
  const insertRace = db.prepare(`
    INSERT INTO races (name, speed, size, ability_bonuses, traits, languages, subraces)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `);

  insertRace.run(
    'Human', 30, 'Medium',
    JSON.stringify([{ ability: 'Strength', bonus: 1 }, { ability: 'Dexterity', bonus: 1 }, { ability: 'Constitution', bonus: 1 }, { ability: 'Intelligence', bonus: 1 }, { ability: 'Wisdom', bonus: 1 }, { ability: 'Charisma', bonus: 1 }]),
    JSON.stringify([{ name: 'Extra Language', description: 'You can speak, read, and write one extra language of your choice.' }]),
    JSON.stringify(['Common', 'One extra language']),
    null
  );

  insertRace.run(
    'Elf', 30, 'Medium',
    JSON.stringify([{ ability: 'Dexterity', bonus: 2 }]),
    JSON.stringify([
      { name: 'Darkvision', description: 'You can see in dim light within 60 feet of you as if it were bright light.' },
      { name: 'Keen Senses', description: 'You have proficiency in the Perception skill.' },
      { name: 'Fey Ancestry', description: 'You have advantage on saving throws against being charmed, and magic can\'t put you to sleep.' },
      { name: 'Trance', description: 'Elves don\'t need to sleep. Instead, they meditate deeply for 4 hours a day.' }
    ]),
    JSON.stringify(['Common', 'Elvish']),
    JSON.stringify([
      { name: 'High Elf', ability_bonuses: [{ ability: 'Intelligence', bonus: 1 }], traits: [{ name: 'Cantrip', description: 'You know one cantrip of your choice from the wizard spell list.' }] },
      { name: 'Wood Elf', ability_bonuses: [{ ability: 'Wisdom', bonus: 1 }], traits: [{ name: 'Fleet of Foot', description: 'Your base walking speed increases to 35 feet.' }] }
    ])
  );

  // Conditions
  const insertCondition = db.prepare(`
    INSERT INTO conditions (name, description) VALUES (?, ?)
  `);

  insertCondition.run('Blinded', 'A blinded creature can\'t see and automatically fails any ability check that requires sight. Attack rolls against the creature have advantage, and the creature\'s attack rolls have disadvantage.');
  insertCondition.run('Charmed', 'A charmed creature can\'t attack the charmer or target the charmer with harmful abilities or magical effects. The charmer has advantage on any ability check to interact socially with the creature.');
  insertCondition.run('Frightened', 'A frightened creature has disadvantage on ability checks and attack rolls while the source of its fear is within line of sight. The creature can\'t willingly move closer to the source of its fear.');
  insertCondition.run('Paralyzed', 'A paralyzed creature is incapacitated and can\'t move or speak. The creature automatically fails Strength and Dexterity saving throws. Attack rolls against the creature have advantage. Any attack that hits the creature is a critical hit if the attacker is within 5 feet of the creature.');
  insertCondition.run('Poisoned', 'A poisoned creature has disadvantage on attack rolls and ability checks.');

  // Rules
  const insertRule = db.prepare(`
    INSERT INTO rules (name, section, description) VALUES (?, ?, ?)
  `);

  insertRule.run('Ability Checks', 'Using Ability Scores', 'An ability check tests a character\'s or monster\'s innate talent and training in an effort to overcome a challenge. The GM calls for an ability check when a character or monster attempts an action (other than an attack) that has a chance of failure.');
  insertRule.run('Saving Throws', 'Using Ability Scores', 'A saving throw represents an attempt to resist a spell, a trap, a poison, a disease, or a similar threat. You don\'t normally decide to make a saving throw; you are forced to make one because your character or monster is at risk of harm.');
  insertRule.run('Cover', 'Combat', 'Walls, trees, creatures, and other obstacles can provide cover during combat, making a target more difficult to harm. A target with half cover has a +2 bonus to AC and Dexterity saving throws. A target with three-quarters cover has a +5 bonus.');
}

export function createTestDb(): Database.Database {
  const db = getDatabase(':memory:');
  seedTestData(db);
  return db;
}

export async function createTestClient(): Promise<Client> {
  const db = createTestDb();
  const server = createServer({ db });
  const client = new Client({ name: 'test-client', version: '1.0.0' });

  const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();
  await Promise.all([
    client.connect(clientTransport),
    server.connect(serverTransport),
  ]);

  return client;
}
