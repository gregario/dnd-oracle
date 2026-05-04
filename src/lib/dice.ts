export interface DiceExpression {
  count: number;
  sides: number;
  modifier: number;
}

export function parseDice(notation: string): DiceExpression {
  const match = notation.trim().match(/^(\d+)d(\d+)\s*([+-]\s*\d+)?$/i);
  if (!match) {
    throw new Error(`Invalid dice notation: "${notation}". Expected format like "2d6+5" or "1d8-1".`);
  }
  const count = parseInt(match[1], 10);
  const sides = parseInt(match[2], 10);
  const modifier = match[3] ? parseInt(match[3].replace(/\s/g, ''), 10) : 0;
  return { count, sides, modifier };
}

export function averageDice(expr: DiceExpression): number {
  return expr.count * (expr.sides + 1) / 2 + expr.modifier;
}

export function maxDice(expr: DiceExpression): number {
  return expr.count * expr.sides + expr.modifier;
}

export function minDice(expr: DiceExpression): number {
  return expr.count + expr.modifier;
}
