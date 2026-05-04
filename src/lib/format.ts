export function safeParseJson<T>(value: string | null): T | null {
  if (!value) return null;
  try {
    return JSON.parse(value) as T;
  } catch {
    return null;
  }
}

export function safeParseJsonOr<T>(value: string | null, fallback: T): T {
  if (!value) return fallback;
  try {
    return JSON.parse(value) as T;
  } catch {
    return fallback;
  }
}

export function abilityModifier(score: number): number {
  return Math.floor((score - 10) / 2);
}

export function formatAbilityMod(score: number): string {
  const mod = abilityModifier(score);
  return mod >= 0 ? `+${mod}` : `${mod}`;
}

export function formatAbilityScore(score: number): string {
  return `${score} (${formatAbilityMod(score)})`;
}

export function formatSpeed(speedJson: string): string {
  const speed = safeParseJson<Record<string, string | number>>(speedJson);
  if (!speed) return speedJson;
  return Object.entries(speed)
    .map(([key, val]) => (key === 'walk' ? `${val} ft.` : `${key} ${val} ft.`))
    .join(', ');
}
