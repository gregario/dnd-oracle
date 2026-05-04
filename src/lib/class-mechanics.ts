export const FULL_CASTERS = new Set(['bard', 'cleric', 'druid', 'sorcerer', 'wizard']);
export const HALF_CASTERS = new Set(['paladin', 'ranger']);
export const THIRD_CASTER_CLASSES = new Set(['fighter', 'rogue']);

export const FULL_CASTER_SLOTS: Readonly<Record<number, number[]>> = {
  1: [2],
  2: [3],
  3: [4, 2],
  4: [4, 3],
  5: [4, 3, 2],
  6: [4, 3, 3],
  7: [4, 3, 3, 1],
  8: [4, 3, 3, 2],
  9: [4, 3, 3, 3, 1],
  10: [4, 3, 3, 3, 2],
  11: [4, 3, 3, 3, 2, 1],
  12: [4, 3, 3, 3, 2, 1],
  13: [4, 3, 3, 3, 2, 1, 1],
  14: [4, 3, 3, 3, 2, 1, 1],
  15: [4, 3, 3, 3, 2, 1, 1, 1],
  16: [4, 3, 3, 3, 2, 1, 1, 1],
  17: [4, 3, 3, 3, 2, 1, 1, 1, 1],
  18: [4, 3, 3, 3, 3, 1, 1, 1, 1],
  19: [4, 3, 3, 3, 3, 2, 1, 1, 1],
  20: [4, 3, 3, 3, 3, 2, 2, 1, 1],
};

export const HALF_CASTER_SLOTS: Readonly<Record<number, number[]>> = {
  2: [2],
  3: [3],
  4: [3],
  5: [4, 2],
  6: [4, 2],
  7: [4, 3],
  8: [4, 3],
  9: [4, 3, 2],
  10: [4, 3, 2],
  11: [4, 3, 3],
  12: [4, 3, 3],
  13: [4, 3, 3, 1],
  14: [4, 3, 3, 1],
  15: [4, 3, 3, 2],
  16: [4, 3, 3, 2],
  17: [4, 3, 3, 3, 1],
  18: [4, 3, 3, 3, 1],
  19: [4, 3, 3, 3, 2],
  20: [4, 3, 3, 3, 2],
};

export function getMaxSpellLevel(className: string, classLevel: number): number {
  const name = className.toLowerCase();
  if (FULL_CASTERS.has(name)) {
    if (classLevel >= 17) return 9;
    if (classLevel >= 15) return 8;
    if (classLevel >= 13) return 7;
    if (classLevel >= 11) return 6;
    if (classLevel >= 9) return 5;
    if (classLevel >= 7) return 4;
    if (classLevel >= 5) return 3;
    if (classLevel >= 3) return 2;
    return 1;
  }
  if (HALF_CASTERS.has(name)) {
    if (classLevel < 2) return 0;
    const effective = Math.ceil(classLevel / 2);
    return Math.min(effective, 5);
  }
  if (name === 'warlock') {
    if (classLevel >= 9) return 5;
    if (classLevel >= 7) return 4;
    if (classLevel >= 5) return 3;
    if (classLevel >= 3) return 2;
    return 1;
  }
  return 0;
}

export function getSpellSlots(className: string, classLevel: number): number[] {
  const name = className.toLowerCase();
  if (FULL_CASTERS.has(name)) {
    return FULL_CASTER_SLOTS[classLevel] ?? [];
  }
  if (HALF_CASTERS.has(name)) {
    return HALF_CASTER_SLOTS[classLevel] ?? [];
  }
  if (name === 'warlock') {
    let slotLevel: number;
    let slotCount: number;
    if (classLevel >= 9) { slotLevel = 5; slotCount = classLevel >= 17 ? 4 : classLevel >= 11 ? 3 : 2; }
    else if (classLevel >= 7) { slotLevel = 4; slotCount = 2; }
    else if (classLevel >= 5) { slotLevel = 3; slotCount = 2; }
    else if (classLevel >= 3) { slotLevel = 2; slotCount = 2; }
    else if (classLevel >= 2) { slotLevel = 1; slotCount = 2; }
    else { slotLevel = 1; slotCount = 1; }
    const slots: number[] = new Array(slotLevel).fill(0);
    slots[slotLevel - 1] = slotCount;
    return slots;
  }
  return [];
}

export function getProficiencyBonus(level: number): number {
  return Math.ceil(level / 4) + 1;
}
