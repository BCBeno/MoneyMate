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

export async function deleteCategory(id: number): Promise<void> {
  const db = await getDatabase();
  await db.runAsync(`DELETE FROM categories WHERE id = ? AND is_default = 0`, [id]);
}
