/** Flat, solid avatar colors (no gradients). */
const AVATAR_COLORS = [
  '#1f75cb',
  '#108548',
  '#6e49cb',
  '#0098a1',
  '#b34700',
  '#8a1c40',
  '#5e6b7a',
  '#7a5c00',
];

export function avatarColor(seed: string): string {
  let hash = 0;
  for (let i = 0; i < seed.length; i++) hash = (hash * 31 + seed.charCodeAt(i)) >>> 0;
  return AVATAR_COLORS[hash % AVATAR_COLORS.length];
}

export function initialOf(name: string): string {
  const clean = name.trim();
  return clean ? clean[0]!.toUpperCase() : '?';
}
