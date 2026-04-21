import { getDatabase } from '../database';
import { Category } from '../../constants/categories';

export async function getCategories(type?: 'income' | 'expense'): Promise<Category[]> {
  const db = await getDatabase();
  if (type) {
    return db.getAllAsync<Category>(
      `SELECT * FROM categories WHERE type = ? ORDER BY is_default DESC, name ASC`,
      [type]
    );
  }
  return db.getAllAsync<Category>(
    `SELECT * FROM categories ORDER BY is_default DESC, name ASC`
  );
}

export async function createCategory(
  name: string, icon: string, color: string, type: 'income' | 'expense'
): Promise<number> {
  const db = await getDatabase();
  const result = await db.runAsync(
    `INSERT INTO categories (name, icon, color, type, is_default) VALUES (?, ?, ?, ?, 0)`,
    [name, icon, color, type]
  );
  return result.lastInsertRowId;
}

export async function updateCategory(
  id: number,
  name: string,
  icon: string,
  color: string,
  type: 'income' | 'expense'
): Promise<void> {
  const db = await getDatabase();
  await db.runAsync(
    `UPDATE categories
     SET name = ?,
         icon = ?,
         color = ?,
         type = ?
     WHERE id = ?`,
    [name, icon, color, type, id]
  );
}

export async function deleteCategory(id: number): Promise<void> {
  const db = await getDatabase();
  const category = await db.getFirstAsync<{ id: number; type: 'income' | 'expense' }>(
    `SELECT id, type FROM categories WHERE id = ?`,
    [id]
  );

  if (!category) return;

  const replacement = await db.getFirstAsync<{ id: number }>(
    `SELECT id
     FROM categories
     WHERE type = ? AND id != ?
     ORDER BY is_default DESC, name ASC
     LIMIT 1`,
    [category.type, id]
  );

  if (!replacement) {
    throw new Error('At least one category must remain for this type.');
  }

  await db.runAsync(
    `UPDATE transactions SET category_id = ? WHERE category_id = ?`,
    [replacement.id, id]
  );

  await db.runAsync(`DELETE FROM categories WHERE id = ?`, [id]);
}
