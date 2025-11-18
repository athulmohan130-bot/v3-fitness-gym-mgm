/**
 * Utility functions for generating color-coded avatars similar to Microsoft Teams
 */

/**
 * Capitalize the first letter of each word in a name
 */
export function capitalizeName(name: string): string {
  if (!name) return '';

  return name
    .trim()
    .split(/\s+/)
    .map(word => {
      if (word.length === 0) return '';
      return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
    })
    .join(' ');
}

// Predefined color palette for avatars (Microsoft Teams-like colors)
// Using hex colors instead of Tailwind classes to avoid JIT compilation issues
const AVATAR_COLORS = [
  { bg: '#3b82f6', text: '#ffffff' }, // blue
  { bg: '#22c55e', text: '#ffffff' }, // green
  { bg: '#eab308', text: '#ffffff' }, // yellow
  { bg: '#ef4444', text: '#ffffff' }, // red
  { bg: '#a855f7', text: '#ffffff' }, // purple
  { bg: '#ec4899', text: '#ffffff' }, // pink
  { bg: '#6366f1', text: '#ffffff' }, // indigo
  { bg: '#06b6d4', text: '#ffffff' }, // cyan
  { bg: '#14b8a6', text: '#ffffff' }, // teal
  { bg: '#f97316', text: '#ffffff' }, // orange
  { bg: '#f59e0b', text: '#ffffff' }, // amber
  { bg: '#84cc16', text: '#ffffff' }, // lime
  { bg: '#10b981', text: '#ffffff' }, // emerald
  { bg: '#0ea5e9', text: '#ffffff' }, // sky
  { bg: '#8b5cf6', text: '#ffffff' }, // violet
  { bg: '#d946ef', text: '#ffffff' }, // fuchsia
  { bg: '#f43f5e', text: '#ffffff' }, // rose
];

/**
 * Get initials from a name (first letter of first and last name)
 */
export function getInitials(name: string): string {
  if (!name) return '?';

  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) {
    return parts[0].charAt(0).toUpperCase();
  }

  // Get first letter of first name and last name
  const firstInitial = parts[0].charAt(0).toUpperCase();
  const lastInitial = parts[parts.length - 1].charAt(0).toUpperCase();

  return `${firstInitial}${lastInitial}`;
}

/**
 * Get consistent color for a name (based on character codes)
 */
export function getAvatarColor(name: string): { bg: string; text: string } {
  if (!name) return AVATAR_COLORS[0];

  // Generate a consistent hash from the name
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }

  // Use the hash to select a color
  const index = Math.abs(hash) % AVATAR_COLORS.length;
  return AVATAR_COLORS[index];
}

/**
 * Get avatar style object for inline styles
 */
export function getAvatarStyle(name: string): React.CSSProperties {
  const color = getAvatarColor(name);
  return {
    backgroundColor: color.bg,
    color: color.text,
  };
}
