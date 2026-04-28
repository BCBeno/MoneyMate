import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system/legacy';
import * as SQLite from 'expo-sqlite';
import { getDatabase } from '../database/database';

export interface ImportResult {
  transactions: number;
  categories: number;
  errors: string[];
}

export async function importJSON(): Promise<ImportResult> {
  const picked = await DocumentPicker.getDocumentAsync({
    type: ['application/json'],
    copyToCacheDirectory: true,
  });
  if (picked.canceled || !picked.assets?.[0]) {
    return { transactions: 0, categories: 0, errors: ['Import cancelled'] };
  }
  const asset = picked.assets[0];
  const fileName = (asset.name ?? '').toLowerCase();
  const mimeType = (asset.mimeType ?? '').toLowerCase();
  if (!fileName.endsWith('.json') && !mimeType.includes('json')) {
    return { transactions: 0, categories: 0, errors: ['Please select a .json backup file.'] };
  }
  return importFromJSONFile(asset.uri);
}

export async function importSQLite(): Promise<ImportResult> {
  const picked = await DocumentPicker.getDocumentAsync({
    type: ['application/octet-stream', 'application/x-sqlite3', '*/*'],
    copyToCacheDirectory: true,
  });
  if (picked.canceled || !picked.assets?.[0]) {
    return { transactions: 0, categories: 0, errors: ['Import cancelled'] };
  }
  const asset = picked.assets[0];
  const fileName = (asset.name ?? '').toLowerCase();
  if (
    !fileName.endsWith('.db') &&
    !fileName.endsWith('.sqlite') &&
    !fileName.endsWith('.sqlite3') &&
    !fileName.endsWith('.mmbak')
  ) {
    return { transactions: 0, categories: 0, errors: ['Please select a .db, .sqlite, or .mmbak file.'] };
  }
  return importFromSQLiteFile(asset.uri);
}

async function insertTransactionIfMissing(db: SQLite.SQLiteDatabase, tx: {
  type: string;
  amount: number;
  currencyCode: string;
  amountRon: number;
  categoryId: number;
  description: string | null;
  date: string;
  note: string | null;
}): Promise<boolean> {
  const result = await db.runAsync(
    `INSERT INTO transactions
       (type, amount, currency_code, amount_ron, category_id, description, date, note)
     SELECT ?, ?, ?, ?, ?, ?, ?, ?
     WHERE NOT EXISTS (
       SELECT 1 FROM transactions
       WHERE type = ?
         AND amount = ?
         AND currency_code = ?
         AND amount_ron = ?
         AND category_id = ?
         AND date = ?
         AND IFNULL(description, '') = IFNULL(?, '')
         AND IFNULL(note, '') = IFNULL(?, '')
     )`,
    [
      tx.type,
      tx.amount,
      tx.currencyCode,
      tx.amountRon,
      tx.categoryId,
      tx.description,
      tx.date,
      tx.note,
      tx.type,
      tx.amount,
      tx.currencyCode,
      tx.amountRon,
      tx.categoryId,
      tx.date,
      tx.description,
      tx.note,
    ]
  );
  return (result.changes ?? 0) > 0;
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
    return { transactions: 0, categories: 0, errors: [`File read error: ${e.message}`] };
  }

  let data: any;
  try {
    data = JSON.parse(raw);
  } catch {
    return { transactions: 0, categories: 0, errors: ['Invalid JSON file.'] };
  }

  if (!data || typeof data !== 'object' || !Array.isArray(data.transactions)) {
    return {
      transactions: 0,
      categories: 0,
      errors: ['Invalid backup structure. Expected a JSON object with a transactions array.'],
    };
  }

  const db = await getDatabase();

  // Insert categories with their explicit IDs so foreign keys match
  if (Array.isArray(data.categories)) {
    for (const cat of data.categories) {
      try {
        if (!cat || typeof cat.name !== 'string' || !cat.name.trim()) {
          errors.push('Skipped category with missing name.');
          continue;
        }

        let catResult;
        if (cat.id != null) {
          // Explicit ID — use INSERT OR IGNORE with explicit id column
          catResult = await db.runAsync(
            `INSERT OR IGNORE INTO categories (id, name, icon, color, type, is_default) VALUES (?, ?, ?, ?, ?, ?)`,
            [cat.id, cat.name, cat.icon ?? '📦', cat.color ?? '#6B7280', cat.type ?? 'expense', 0]
          );
        } else {
          catResult = await db.runAsync(
            `INSERT OR IGNORE INTO categories (name, icon, color, type, is_default) VALUES (?, ?, ?, ?, ?)`,
            [cat.name, cat.icon ?? '📦', cat.color ?? '#6B7280', cat.type ?? 'expense', 0]
          );
        }
        if ((catResult.changes ?? 0) > 0) importedCats++;
      } catch (e: any) { errors.push(`Cat "${cat.name}": ${e.message}`); }
    }
  }

  // Insert transactions
  if (Array.isArray(data.transactions)) {
    for (const t of data.transactions) {
      try {
        const txType = t.type === 'income' ? 'income' : 'expense';
        const amount = Number(t.amount ?? 0);
        const amountRon = Number(t.amount_ron ?? amount);
        const categoryId = Number(t.category_id ?? 1);
        const date = typeof t.date === 'string' && t.date.trim() ? t.date : new Date().toISOString().substring(0, 10);

        const inserted = await insertTransactionIfMissing(db, {
          type: txType,
          amount,
          currencyCode: t.currency_code ?? 'RON',
          amountRon,
          categoryId,
          description: t.description || null,
          date,
          note: t.note || null,
        });
        if (inserted) importedTx++;
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
    return { transactions: 0, categories: 0, errors: [`File copy error: ${e.message}`] };
  }

  const srcDb  = await SQLite.openDatabaseAsync(tempName);
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
        const result = await destDb.runAsync(
          `INSERT OR IGNORE INTO categories (name, icon, color, type, is_default) VALUES (?, ?, ?, ?, 0)`,
          [name, cat.icon ?? '📦', cat.color ?? '#6B7280', typeStr]
        );
        if ((result.changes ?? 0) > 0) importedCats++;
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

        const catName  = tx.cat_name_ro || tx.cat_name || 'Other expenses';
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

        const inserted = await insertTransactionIfMissing(destDb, {
          type: typeStr,
          amount: Number(tx.amount ?? 0),
          currencyCode: 'RON',
          amountRon: Number(tx.amount_ron ?? tx.amount ?? 0),
          categoryId,
          description: tx.description || null,
          date: dateStr,
          note: tx.note || null,
        });
        if (inserted) importedTx++;
      } catch (e: any) { errors.push(`Tx: ${e.message}`); }
    }
  } finally {
    await srcDb.closeAsync();
    try { await FileSystem.deleteAsync(tempPath, { idempotent: true }); } catch {}
  }

  return { transactions: importedTx, categories: importedCats, errors };
}
