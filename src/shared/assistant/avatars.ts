import type { AvatarStyle } from '../preferences/types';

export const AVATAR_CATALOG: ReadonlyArray<{
  id: AvatarStyle;
  label: string;
  description: string;
}> = [
  { id: 'default', label: 'Default', description: 'Simple neutral assistant' },
  { id: 'calm', label: 'Calm', description: 'Soft blue accent' },
  { id: 'energetic', label: 'Energetic', description: 'Bright green accent' },
  { id: 'focused', label: 'Focused', description: 'Purple accent' },
];

const AVATAR_IDS = new Set(AVATAR_CATALOG.map((entry) => entry.id));

export function normalizeAvatarStyle(value: unknown): AvatarStyle {
  if (typeof value === 'string' && AVATAR_IDS.has(value as AvatarStyle)) {
    return value as AvatarStyle;
  }

  return 'default';
}
