import { getDatabase } from './database';
import { DEFAULT_CATEGORIES } from '../constants/categories';
import { DEFAULT_CURRENCIES } from '../constants/currencies';

export async function seedDatabase(): Promise<void> {
  const db = await getDatabase();

  // Only seed if tables are empty — avoids duplicates across app restarts
  const catCount = await db.getFirstAsync<{ n: number }>(
    `SELECT COUNT(*) AS n FROM categories`
  );
  if ((catCount?.n ?? 0) === 0) {
    for (const cat of DEFAULT_CATEGORIES) {
      await db.runAsync(
        `INSERT INTO categories (name, icon, color, type, is_default) VALUES (?, ?, ?, ?, ?)`,
        [cat.name, cat.icon, cat.color, cat.type, cat.is_default]
      );
    }
  }

  const curCount = await db.getFirstAsync<{ n: number }>(
    `SELECT COUNT(*) AS n FROM currencies`
  );
  if ((curCount?.n ?? 0) === 0) {
    for (const c of DEFAULT_CURRENCIES) {
      await db.runAsync(
        `INSERT INTO currencies (code, name, symbol, rate_to_ron) VALUES (?, ?, ?, ?)`,
        [c.code, c.name, c.symbol, c.rate_to_ron]
      );
    }
  }

  const defaults: [string, string][] = [
    ['currency', 'RON'],
    ['pin_enabled', '0'],
    ['biometric_enabled', '0'],
    ['auto_backup', '0'],
  ];
  for (const [key, value] of defaults) {
    await db.runAsync(
      `INSERT OR IGNORE INTO settings (key, value) VALUES (?, ?)`,
      [key, value]
    );
  }
}
