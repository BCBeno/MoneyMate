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
  { name: 'Food & Dining',    icon: "utensils", color: '#EDC17B', type: 'expense',  is_default: 1 },
  { name: 'Transport',        icon: "car", color: '#80B9FF', type: 'expense',  is_default: 1 },
  { name: 'Utilities',        icon: "zap", color: '#B4A1F2', type: 'expense',  is_default: 1 },
  { name: 'Health',           icon: "heart", color: '#FF8B94', type: 'expense',  is_default: 1 },
  { name: 'Entertainment',    icon: "clapperboard", color: '#B4A1F2', type: 'expense',  is_default: 1 },
  { name: 'Shopping',         icon: "shopping-bag", color: '#EDC17B', type: 'expense',  is_default: 1 },
  { name: 'Education',        icon: "book-open", color: '#80B9FF', type: 'expense',  is_default: 1 },
  { name: 'Investments',      icon: "trending-up", color: '#00D4AA', type: 'expense',  is_default: 1 },
  { name: 'Salary',           icon: "briefcase", color: '#43D9A3', type: 'income',   is_default: 1 },
  { name: 'Freelance',        icon: "laptop", color: '#43D9A3', type: 'income',   is_default: 1 },
  { name: 'Other income',     icon: "plus", color: '#8A9AA6', type: 'income',   is_default: 1 },
];
