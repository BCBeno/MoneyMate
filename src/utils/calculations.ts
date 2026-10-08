import { Transaction } from '../database/repositories/transactionRepository';

export function calculateBalance(transactions: Transaction[]): number {
  return transactions.reduce((sum, t) => {
    return t.type === 'income' ? sum + t.amount_ron : sum - t.amount_ron;
  }, 0);
}

export function calculateIncome(transactions: Transaction[]): number {
  return transactions
    .filter(t => t.type === 'income')
    .reduce((sum, t) => sum + t.amount_ron, 0);
}

export function calculateExpenses(transactions: Transaction[]): number {
  return transactions
    .filter(t => t.type === 'expense')
    .reduce((sum, t) => sum + t.amount_ron, 0);
}

export function calculateSavingsRate(income: number, expenses: number): number {
  if (income === 0) return 0;
  const savings = income - expenses;
  return Math.max(0, (savings / income) * 100);
}

export function groupByCategory(transactions: Transaction[]): Record<number, number> {
  return transactions.reduce((acc, t) => {
    if (t.type === 'expense') {
      acc[t.category_id] = (acc[t.category_id] || 0) + t.amount_ron;
    }
    return acc;
  }, {} as Record<number, number>);
}

export function groupByDate(transactions: Transaction[]): Record<string, Transaction[]> {
  return transactions.reduce((acc, t) => {
    const date = t.date.substring(0, 10);
    if (!acc[date]) acc[date] = [];
    acc[date].push(t);
    return acc;
  }, {} as Record<string, Transaction[]>);
}

/** Pass the unfiltered list so search/type filters never change a day's spending. */
export function dailyExpenses(transactions: Transaction[]): Record<string, number> {
  return dailyTotals(transactions, 'expense');
}

export function dailyIncome(transactions: Transaction[]): Record<string, number> {
  return dailyTotals(transactions, 'income');
}

function dailyTotals(transactions: Transaction[], type: Transaction['type']): Record<string, number> {
  return transactions.reduce((totals, t) => {
    const date = t.date.substring(0, 10);
    if (t.type === type) totals[date] = (totals[date] ?? 0) + t.amount_ron;
    return totals;
  }, {} as Record<string, number>);
}
