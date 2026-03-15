import { getDatabase, resetDatabase } from './database';

// Bump this when schema changes
const SCHEMA_VERSION = 5;

let migrated = false;

export async function runMigrations(): Promise<void> {
  if (migrated) return;

  let db = await getDatabase();

  // Read stored schema version
  let storedVersion = 0;
  try {
    const row = await db.getFirstAsync<{ value: string }>(
      `SELECT value FROM settings WHERE key = 'schema_version'`
    );
    storedVersion = parseInt(row?.value ?? '0', 10);
  } catch {
    storedVersion = 0;
  }

  if (storedVersion < SCHEMA_VERSION) {
    await resetDatabase();
    db = await getDatabase();
    await db.execAsync('PRAGMA journal_mode = WAL;');
    await db.execAsync('PRAGMA foreign_keys = ON;');
  }

  await db.execAsync(`
    CREATE TABLE IF NOT EXISTS settings (
      key        TEXT PRIMARY KEY,
      value      TEXT NOT NULL,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS currencies (
      code         TEXT PRIMARY KEY,
      name         TEXT NOT NULL,
      symbol       TEXT NOT NULL,
      rate_to_ron  REAL DEFAULT 1.0,
      last_updated DATETIME
    );

    CREATE TABLE IF NOT EXISTS categories (
      id         INTEGER PRIMARY KEY AUTOINCREMENT,
      name       TEXT NOT NULL,
      icon       TEXT NOT NULL,
      color      TEXT NOT NULL,
      type       TEXT NOT NULL,
      is_default INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS transactions (
      id            INTEGER PRIMARY KEY AUTOINCREMENT,
      type          TEXT NOT NULL,
      amount        REAL NOT NULL,
      currency_code TEXT NOT NULL,
      amount_ron    REAL NOT NULL,
      category_id   INTEGER NOT NULL,
      description   TEXT,
      date          DATE NOT NULL,
      note          TEXT,
      created_at    DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at    DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS goals (
      id             INTEGER PRIMARY KEY AUTOINCREMENT,
      name           TEXT NOT NULL,
      target_amount  REAL NOT NULL,
      current_amount REAL DEFAULT 0,
      currency_code  TEXT NOT NULL DEFAULT 'RON',
      icon           TEXT NOT NULL,
      color          TEXT NOT NULL,
      deadline       DATE,
      status         TEXT DEFAULT 'active',
      note           TEXT,
      created_at     DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at     DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS goal_contributions (
      id         INTEGER PRIMARY KEY AUTOINCREMENT,
      goal_id    INTEGER NOT NULL,
      amount     REAL NOT NULL,
      note       TEXT,
      date       DATE NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE INDEX IF NOT EXISTS idx_transactions_date     ON transactions(date);
    CREATE INDEX IF NOT EXISTS idx_transactions_category ON transactions(category_id);
    CREATE INDEX IF NOT EXISTS idx_transactions_type     ON transactions(type);
    CREATE INDEX IF NOT EXISTS idx_goal_contributions    ON goal_contributions(goal_id);
  `);

  await db.runAsync(
    `INSERT OR REPLACE INTO settings (key, value) VALUES ('schema_version', ?)`,
    [String(SCHEMA_VERSION)]
  );

  migrated = true;
}
