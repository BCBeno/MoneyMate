import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import { getDatabase } from '../database/database';
import { format } from 'date-fns';

export async function exportToJSON(): Promise<void> {
  const db = await getDatabase();
  const [transactions, categories, currencies] = await Promise.all([
    db.getAllAsync('SELECT * FROM transactions ORDER BY date DESC'),
    db.getAllAsync('SELECT * FROM categories'),
    db.getAllAsync('SELECT * FROM currencies'),
  ]);

  const data = { transactions, categories, currencies, exportedAt: new Date().toISOString() };
  const json = JSON.stringify(data, null, 2);

  const fileName = `MoneyMate_backup_${format(new Date(), 'yyyy-MM-dd_HH-mm')}.json`;
  const filePath = FileSystem.cacheDirectory + fileName;

  await FileSystem.writeAsStringAsync(filePath, json, { encoding: 'utf8' });
  await share(filePath, 'application/json');
}

export async function exportToCSV(): Promise<void> {
  const db = await getDatabase();
  const rows = await db.getAllAsync<any>(`
    SELECT t.date, t.type, t.amount, t.currency_code, t.amount_ron,
           t.description, c.name AS category, t.note
    FROM transactions t
    JOIN categories c ON t.category_id = c.id
    ORDER BY t.date DESC
  `);

  const header = 'Date,Type,Amount,Currency,Amount RON,Description,Category,Note\n';
  const lines  = rows.map((r: any) =>
    [
      r.date,
      r.type,
      r.amount,
      r.currency_code,
      r.amount_ron,
      `"${(r.description ?? '').replace(/"/g, '""')}"`,
      `"${(r.category ?? '').replace(/"/g, '""')}"`,
      `"${(r.note ?? '').replace(/"/g, '""')}"`,
    ].join(',')
  ).join('\n');

  const fileName = `MoneyMate_transactions_${format(new Date(), 'yyyy-MM-dd')}.csv`;
  const filePath = FileSystem.cacheDirectory + fileName;

  await FileSystem.writeAsStringAsync(filePath, header + lines, { encoding: 'utf8' });
  await share(filePath, 'text/csv');
}

export async function exportToSQLite(): Promise<void> {
  // expo-sqlite v15+ stores the DB here
  const dbPath   = FileSystem.documentDirectory + 'SQLite/moneymate.db';
  const info     = await FileSystem.getInfoAsync(dbPath);

  if (!info.exists) {
    throw new Error('Database not found. Make sure you have added at least one transaction.');
  }

  const fileName = `MoneyMate_db_${format(new Date(), 'yyyy-MM-dd_HH-mm')}.db`;
  const destPath = FileSystem.cacheDirectory + fileName;

  await FileSystem.copyAsync({ from: dbPath, to: destPath });
  await share(destPath, 'application/octet-stream');
}

async function share(filePath: string, mimeType: string): Promise<void> {
  const canShare = await Sharing.isAvailableAsync();
  if (!canShare) {
    throw new Error('Sharing is not available on this device.');
  }
  try {
    await Sharing.shareAsync(filePath, { mimeType, dialogTitle: 'Export MoneyMate' });
  } finally {
    await FileSystem.deleteAsync(filePath, { idempotent: true });
  }
}
