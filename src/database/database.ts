import * as SQLite from 'expo-sqlite';
import { CONFIG } from '../constants/config';

let _db: SQLite.SQLiteDatabase | null = null;

export async function getDatabase(): Promise<SQLite.SQLiteDatabase> {
  if (_db) return _db;
  _db = await SQLite.openDatabaseAsync(CONFIG.DB_NAME);
  await _db.execAsync('PRAGMA journal_mode = WAL;');
  await _db.execAsync('PRAGMA foreign_keys = ON;');
  return _db;
}

export async function resetDatabase(): Promise<void> {
  if (_db) {
    await _db.closeAsync();
    _db = null;
  }
  await SQLite.deleteDatabaseAsync(CONFIG.DB_NAME);
}

export type DB = SQLite.SQLiteDatabase;
