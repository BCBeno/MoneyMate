import {
  calculateBalance,
  calculateExpenses,
  calculateIncome,
  calculateSavingsRate,
  groupByCategory,
  groupByDate,
  dailyExpenses,
  dailyIncome,
} from '../calculations';
import { Transaction } from '../../database/repositories/transactionRepository';

const tx = (overrides: Partial<Transaction>): Transaction => ({
  id: 1,
  type: 'expense',
  amount: 0,
  currency_code: 'RON',
  amount_ron: 0,
  category_id: 1,
  description: null,
  date: '2026-03-10',
  note: null,
  created_at: '2026-03-10T10:00:00Z',
  updated_at: '2026-03-10T10:00:00Z',
  ...overrides,
});

describe('calculations utils', () => {
  const transactions: Transaction[] = [
    tx({ id: 1, type: 'income', amount_ron: 5000, category_id: 10, date: '2026-03-01' }),
    tx({ id: 2, type: 'expense', amount_ron: 1200, category_id: 20, date: '2026-03-02' }),
    tx({ id: 3, type: 'expense', amount_ron: 300, category_id: 20, date: '2026-03-02' }),
    tx({ id: 4, type: 'income', amount_ron: 500, category_id: 10, date: '2026-03-03' }),
  ];

  it('calculates income, expenses and balance', () => {
    expect(calculateIncome(transactions)).toBe(5500);
    expect(calculateExpenses(transactions)).toBe(1500);
    expect(calculateBalance(transactions)).toBe(4000);
  });

  it('calculates savings rate and clamps negative results to zero', () => {
    expect(calculateSavingsRate(1000, 200)).toBe(80);
    expect(calculateSavingsRate(1000, 2000)).toBe(0);
    expect(calculateSavingsRate(0, 500)).toBe(0);
  });

  it('groups only expense transactions by category', () => {
    expect(groupByCategory(transactions)).toEqual({
      20: 1500,
    });
  });

  it('groups transactions by date key (yyyy-mm-dd)', () => {
    const grouped = groupByDate(transactions);

    expect(Object.keys(grouped)).toEqual(['2026-03-01', '2026-03-02', '2026-03-03']);
    expect(grouped['2026-03-02']).toHaveLength(2);
    expect(grouped['2026-03-02'][0].id).toBe(2);
  });

  it('keeps daily spending and income separate, using stored base amounts for mixed currencies', () => {
    const mixed = [
      tx({ amount: 7, amount_ron: 35, currency_code: 'EUR', date: '2026-10-07T10:00:00' }),
      tx({ id: 2, type: 'income', amount: 8500, amount_ron: 8500, date: '2026-10-07' }),
      tx({ id: 3, amount: 48, amount_ron: 48, date: '2026-10-07' }),
      tx({ id: 4, type: 'income', amount_ron: 100, date: '2026-10-08' }),
    ];
    expect(dailyExpenses(mixed)).toEqual({'2026-10-07': 83});
    expect(dailyIncome(mixed)).toEqual({'2026-10-07': 8500, '2026-10-08': 100});
  });
});
