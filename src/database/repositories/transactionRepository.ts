import { getDatabase } from '../database';

export interface Transaction {
  id: number;
  type: 'income' | 'expense';
  amount: number;
  currency_code: string;
  amount_ron: number;
  category_id: number;
  description: string | null;
  date: string;
  note: string | null;
  created_at: string;
  updated_at: string;
  // joined fields
  category_name?: string;
  category_icon?: string;
  category_color?: string;
  currency_symbol?: string;
}

export interface CreateTransactionDto {
  type: 'income' | 'expense';
  amount: number;
  currency_code: string;
  amount_ron: number;
  category_id: number;
  description?: string;
  date: string;
  note?: string;
}

export type UpdateTransactionDto = CreateTransactionDto;

const WITH_JOINS = `
  SELECT t.*,
         c.name  AS category_name,
         c.icon  AS category_icon,
         c.color AS category_color,
         cur.symbol AS currency_symbol
  FROM transactions t
  JOIN categories c   ON t.category_id   = c.id
  JOIN currencies cur ON t.currency_code = cur.code
`;

export interface TransactionFilters {
  /** Single month 'yyyy-MM' – used by dashboard / transactions tab */
  month?: string;
  /** Date range – used by reports */
  dateFrom?: string;
  dateTo?: string;
  type?: 'income' | 'expense';
  category_id?: number;
  limit?: number;
}

export async function getTransactions(
  filters?: TransactionFilters
): Promise<Transaction[]> {
  const db = await getDatabase();
  let query = WITH_JOINS + ' WHERE 1=1';
  const params: (string | number)[] = [];

  if (filters?.month) {
    query += ` AND strftime('%Y-%m', t.date) = ?`;
    params.push(filters.month);
  }
  if (filters?.dateFrom) {
    query += ` AND t.date >= ?`;
    params.push(filters.dateFrom);
  }
  if (filters?.dateTo) {
    query += ` AND t.date <= ?`;
    params.push(filters.dateTo);
  }
  if (filters?.type) {
    query += ` AND t.type = ?`;
    params.push(filters.type);
  }
  if (filters?.category_id != null) {
    query += ` AND t.category_id = ?`;
    params.push(filters.category_id);
  }

  query += ` ORDER BY t.date DESC, t.created_at DESC`;

  if (filters?.limit != null) {
    query += ` LIMIT ?`;
    params.push(filters.limit);
  }

  return db.getAllAsync<Transaction>(query, params);
}

export async function getTransactionById(id: number): Promise<Transaction | null> {
  const db = await getDatabase();
  return db.getFirstAsync<Transaction>(
    WITH_JOINS + ` WHERE t.id = ?`,
    [id]
  );
}

export async function createTransaction(dto: CreateTransactionDto): Promise<number> {
  const db = await getDatabase();
  const result = await db.runAsync(
    `INSERT INTO transactions
       (type, amount, currency_code, amount_ron, category_id, description, date, note)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      dto.type, dto.amount, dto.currency_code, dto.amount_ron,
      dto.category_id, dto.description ?? null, dto.date, dto.note ?? null,
    ]
  );
  return result.lastInsertRowId;
}

export async function updateTransaction(
  id: number,
  dto: UpdateTransactionDto
): Promise<void> {
  const db = await getDatabase();
  await db.runAsync(
    `UPDATE transactions
     SET type          = ?,
         amount        = ?,
         currency_code = ?,
         amount_ron    = ?,
         category_id   = ?,
         description   = ?,
         date          = ?,
         note          = ?,
         updated_at    = CURRENT_TIMESTAMP
     WHERE id = ?`,
    [
      dto.type, dto.amount, dto.currency_code, dto.amount_ron,
      dto.category_id, dto.description ?? null, dto.date, dto.note ?? null,
      id,
    ]
  );
}

export async function deleteTransaction(id: number): Promise<void> {
  const db = await getDatabase();
  await db.runAsync(`DELETE FROM transactions WHERE id = ?`, [id]);
}

export async function getStatsInRange(
  dateFrom: string,
  dateTo: string
): Promise<{ month: string; income: number; expenses: number }[]> {
  const db = await getDatabase();
  return db.getAllAsync(
    `SELECT strftime('%Y-%m', date) AS month,
            SUM(CASE WHEN type = 'income'  THEN amount_ron ELSE 0 END) AS income,
            SUM(CASE WHEN type = 'expense' THEN amount_ron ELSE 0 END) AS expenses
     FROM transactions
     WHERE date >= ? AND date <= ?
     GROUP BY month
     ORDER BY month ASC`,
    [dateFrom, dateTo]
  );
}
