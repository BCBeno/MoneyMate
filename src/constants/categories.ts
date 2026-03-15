export type CategoryType = 'income' | 'expense';

export interface Category {
  id: number;
  name: string;
  icon: string;
  color: string;
  type: CategoryType;
  is_default: number;
}

export const DEFAULT_CATEGORIES: Omit<Category, 'id'>[] = [
  { name: 'Food & Dining',    icon: '🍽️', color: '#F97316', type: 'expense',  is_default: 1 },
  { name: 'Transport',        icon: '🚗', color: '#3B82F6', type: 'expense',  is_default: 1 },
  { name: 'Utilities',        icon: '💡', color: '#8B5CF6', type: 'expense',  is_default: 1 },
  { name: 'Health',           icon: '❤️', color: '#EF4444', type: 'expense',  is_default: 1 },
  { name: 'Entertainment',    icon: '🎬', color: '#EC4899', type: 'expense',  is_default: 1 },
  { name: 'Shopping',         icon: '🛍️', color: '#F59E0B', type: 'expense',  is_default: 1 },
  { name: 'Education',        icon: '📚', color: '#06B6D4', type: 'expense',  is_default: 1 },
  { name: 'Investments',      icon: '📈', color: '#10B981', type: 'expense',  is_default: 1 },
  { name: 'Salary',           icon: '💼', color: '#34D399', type: 'income',   is_default: 1 },
  { name: 'Freelance',        icon: '💻', color: '#34D399', type: 'income',   is_default: 1 },
  { name: 'Other income',     icon: '➕', color: '#6B7280', type: 'income',   is_default: 1 },
];
