// Semantic names are persisted for new categories and goals. Legacy backups are
// resolved at display time, so existing records do not need a database migration.
const legacyNames: Record<string, string> = {
  '1f37d': 'utensils', '1f697': 'car', '1f4a1': 'zap', '2764': 'heart',
  '1f3ac': 'clapperboard', '1f6cd': 'shopping-bag', '1f4da': 'book-open',
  '1f4c8': 'trending-up', '1f4bc': 'briefcase', '1f4bb': 'laptop', '2795': 'plus',
  '1f3e0': 'house', '2708': 'plane', '1f4f1': 'smartphone', '1f393': 'graduation-cap',
  '1f48d': 'gem', '1f3d6': 'umbrella', '1f4b0': 'wallet', '1f3cb': 'dumbbell',
  '1f3b8': 'music', '1f4f7': 'camera', '1f3af': 'target', '1f6d2': 'shopping-cart',
  '1f43e': 'paw-print', '1f381': 'gift', '1f9f4': 'droplet', '26bd': 'circle',
  '1f3ae': 'gamepad-2', '1f37a': 'beer', '2615': 'coffee', '1f3e5': 'hospital',
  '1f436': 'paw-print', '1f33f': 'leaf', '1f527': 'wrench', '1f4e6': 'package',
  '1f3aa': 'tent', '1f680': 'rocket', '1f3a8': 'palette', '1f4b3': 'credit-card',
  '1f4c2': 'folder', '1f4c5': 'calendar', '1f4b1': 'coins', '1f50d': 'search',
  '1f510': 'lock', '1f446': 'fingerprint', '1f4e4': 'download', '1f4e5': 'upload',
  '1f5c4': 'database', '1f3f7': 'tags', '2728': 'zap', '1f310': 'globe',
  '1f4ca': 'bar-chart-2', '2699': 'settings', '270f': 'edit-3', '1f4ed': 'inbox',
};

export function resolveIconName(value?: string | null): string {
  if (!value) return 'wallet';
  const key = Array.from(value).filter(c => c.codePointAt(0) !== 0xfe0f).map(c => c.codePointAt(0)!.toString(16)).join('-');
  return legacyNames[key] ?? value;
}

export const GOAL_ICONS = ['house', 'car', 'plane', 'laptop', 'smartphone', 'graduation-cap', 'gem', 'umbrella', 'wallet', 'dumbbell', 'music', 'camera', 'target', 'shopping-cart', 'paw-print', 'send'];
export const CATEGORY_ICONS = Array.from(new Set(['utensils', 'car', 'zap', 'heart', 'clapperboard', 'shopping-bag', 'book-open', 'trending-up', 'briefcase', 'laptop', 'plus', ...GOAL_ICONS, 'gift', 'droplet', 'gamepad-2', 'beer', 'coffee', 'hospital', 'leaf', 'wrench', 'package', 'tent', 'rocket', 'palette']));
export const ICON_COLORS = ['#00D4AA', '#80B9FF', '#B4A1F2', '#EDC17B', '#FF8B94', '#43D9A3'];
