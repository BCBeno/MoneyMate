import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system/legacy';
import * as SQLite from 'expo-sqlite';
import { getDatabase } from '../database/database';

export interface ImportResult {
  transactions: number;
  categories: number;
  errors: string[];
}

export async function importFromExternalDB(): Promise<ImportResult> {
  const picked = await DocumentPicker.getDocumentAsync({
    type: '*/*',
    copyToCacheDirectory: true,
  });

  if (picked.canceled || !picked.assets?.[0]) {
    return { transactions: 0, categories: 0, errors: ['Import cancelled'] };
  }

  const asset    = picked.assets[0];
  const fileName = asset.name ?? '';
  const isJSON   = fileName.toLowerCase().endsWith('.json');

  if (isJSON) {
    return importFromJSONFile(asset.uri);
  }
  return importFromSQLiteFile(asset.uri);
}

// ── JSON import ───────────────────────────────────────────────────────────────
async function importFromJSONFile(uri: string): Promise<ImportResult> {
  const errors: string[]  = [];
  let importedTx   = 0;
  let importedCats = 0;

  let raw: string;
  try {
    raw = await FileSystem.readAsStringAsync(uri, { encoding: 'utf8' });
  } catch (e: any) {
    return { transactions: 0, categories: 0, errors: [`Error citire fișier: ${e.message}`] };
  }

  let data: any;
  try {
    data = JSON.parse(raw);
  } catch {
    return { transactions: 0, categories: 0, errors: ['Invalid JSON file.'] };
  }

  const db = await getDatabase();

  // Insert categories with their explicit IDs so foreign keys match
  if (Array.isArray(data.categories)) {
    for (const cat of data.categories) {
      try {
        if (cat.id != null) {
          // Explicit ID — use INSERT OR IGNORE with explicit id column
          await db.runAsync(
            `INSERT OR IGNORE INTO categories (id, name, icon, color, type, is_default) VALUES (?, ?, ?, ?, ?, ?)`,
            [cat.id, cat.name, cat.icon ?? '📦', cat.color ?? '#6B7280', cat.type ?? 'expense', 0]
          );
        } else {
          await db.runAsync(
            `INSERT OR IGNORE INTO categories (name, icon, color, type, is_default) VALUES (?, ?, ?, ?, ?)`,
            [cat.name, cat.icon ?? '📦', cat.color ?? '#6B7280', cat.type ?? 'expense', 0]
          );
        }
        importedCats++;
      } catch (e: any) { errors.push(`Cat "${cat.name}": ${e.message}`); }
    }
  }

  // Insert transactions
  if (Array.isArray(data.transactions)) {
    for (const t of data.transactions) {
      try {
        await db.runAsync(
          `INSERT INTO transactions
             (type, amount, currency_code, amount_ron, category_id, description, date, note)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            t.type,
            t.amount,
            t.currency_code ?? 'RON',
            t.amount_ron ?? t.amount,
            t.category_id ?? 1,
            t.description || null,
            t.date,
            t.note || null,
          ]
        );
        importedTx++;
      } catch (e: any) { errors.push(`Tx ${t.date}: ${e.message}`); }
    }
  }

  return { transactions: importedTx, categories: importedCats, errors };
}

// ── SQLite import ─────────────────────────────────────────────────────────────
async function importFromSQLiteFile(uri: string): Promise<ImportResult> {
  const errors: string[] = [];
  let importedTx   = 0;
  let importedCats = 0;

  const tempName = 'moneymate_import_temp.db';
  const tempPath = FileSystem.cacheDirectory + tempName;

  try {
    await FileSystem.copyAsync({ from: uri, to: tempPath });
  } catch (e: any) {
    return { transactions: 0, categories: 0, errors: [`Error la copiere fișier: ${e.message}`] };
  }

  const srcDb  = await SQLite.openDatebaseAsync(tempName);
  const destDb = await getDatabase();

  try {
    // Categorys
    let srcCats: any[] = [];
    try {
      srcCats = await srcDb.getAllAsync(`SELECT * FROM categories WHERE is_deleted=0 OR is_deleted IS NULL`);
    } catch {
      try { srcCats = await srcDb.getAllAsync(`SELECT * FROM categories`); } catch { /* no table */ }
    }

    for (const cat of srcCats) {
      try {
        const typeStr = cat.type === 0 ? 'income' : cat.type === 1 ? 'expense' : (cat.type ?? 'expense');
        const name    = cat.name_ro || cat.name || 'Category';
        await destDb.runAsync(
          `INSERT OR IGNORE INTO categories (name, icon, color, type, is_default) VALUES (?, ?, ?, ?, 0)`,
          [name, cat.icon ?? '📦', cat.color ?? '#6B7280', typeStr]
        );
        importedCats++;
      } catch (e: any) { errors.push(`Cat: ${e.message}`); }
    }

    // Transactions
    let srcTxs: any[] = [];
    try {
      srcTxs = await srcDb.getAllAsync(`
        SELECT t.*, c.name_ro AS cat_name_ro, c.name AS cat_name,
               c.icon AS cat_icon, c.color AS cat_color, c.type AS cat_type
        FROM transactions t
        LEFT JOIN categories c ON t.category_uid = c.uid
        WHERE t.is_deleted = 0 OR t.is_deleted IS NULL
      `);
    } catch {
      try {
        srcTxs = await srcDb.getAllAsync(`SELECT * FROM transactions WHERE is_deleted=0`);
      } catch { errors.push('Could not read transactions.'); }
    }

    for (const tx of srcTxs) {
      try {
        const typeStr = tx.type === 0 ? 'income' : tx.type === 1 ? 'expense' : (tx.type ?? 'expense');

        let dateStr = tx.date_str ?? '';
        if (!dateStr && tx.date) {
          const ts = typeof tx.date === 'number' ? tx.date : parseInt(tx.date, 10);
          const d  = new Date(ts > 9_999_999_999 ? ts : ts * 1000);
          dateStr  = d.toISOString().substring(0, 10);
        }
        if (!dateStr) dateStr = new Date().toISOString().substring(0, 10);

        const catName  = tx.cat_name_ro || tx.cat_name || 'Alte cheltuieli';
        const catType  = tx.cat_type === 0 ? 'income' : 'expense';
        await destDb.runAsync(
          `INSERT OR IGNORE INTO categories (name, icon, color, type, is_default) VALUES (?, ?, ?, ?, 0)`,
          [catName, tx.cat_icon ?? '📦', tx.cat_color ?? '#6B7280', catType]
        );
        const catRow = await destDb.getFirstAsync<{ id: number }>(
          `SELECT id FROM categories WHERE name = ? AND type = ? LIMIT 1`,
          [catName, catType]
        );
        const categoryId = catRow?.id ?? 1;

        await destDb.runAsync(
          `INSERT OR IGNORE INTO transactions
             (type, amount, currency_code, amount_ron, category_id, description, date, note)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
          [typeStr, tx.amount ?? 0, 'RON', tx.amount_ron ?? tx.amount ?? 0, categoryId,
           tx.description || null, dateStr, tx.note || null]
        );
        importedTx++;
      } catch (e: any) { errors.push(`Tx: ${e.message}`); }
    }
  } finally {
    await srcDb.closeAsync();
    try { await FileSystem.deleteAsync(tempPath, { idempotent: true }); } catch {}
  }

  return { transactions: importedTx, categories: importedCats, errors };
}
