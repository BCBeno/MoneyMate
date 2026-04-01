import { waitFor } from '@testing-library/react-native';
import { useTransactionsStore } from '../transactionsSlice';
import {
  createTransaction,
  deleteTransaction,
  getTransactions,
  updateTransaction,
} from '../../../database/repositories/transactionRepository';

jest.mock('../../../database/repositories/transactionRepository', () => ({
  getTransactions: jest.fn(),
  createTransaction: jest.fn(),
  updateTransaction: jest.fn(),
  deleteTransaction: jest.fn(),
}));

const mockGetTransactions = getTransactions as jest.Mock;
const mockCreateTransaction = createTransaction as jest.Mock;
const mockUpdateTransaction = updateTransaction as jest.Mock;
const mockDeleteTransaction = deleteTransaction as jest.Mock;

describe('useTransactionsStore', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    useTransactionsStore.setState({
      transactions: [],
      isLoading: false,
      currentMonth: '2026-03',
    });
  });

  it('loads transactions for the current month by default', async () => {
    const items = [
      {
        id: 1,
        type: 'income',
        amount: 100,
        currency_code: 'RON',
        amount_ron: 100,
        category_id: 1,
        description: 'Salary',
        date: '2026-03-01',
        note: null,
        created_at: '2026-03-01',
        updated_at: '2026-03-01',
      },
    ];

    mockGetTransactions.mockResolvedValue(items);

    await useTransactionsStore.getState().load();

    expect(mockGetTransactions).toHaveBeenCalledWith({ month: '2026-03' });
    expect(useTransactionsStore.getState().transactions).toEqual(items);
    expect(useTransactionsStore.getState().isLoading).toBe(false);
  });

  it('adds a transaction and reloads state', async () => {
    mockCreateTransaction.mockResolvedValue(11);
    mockGetTransactions.mockResolvedValue([]);

    await useTransactionsStore.getState().add({
      type: 'expense',
      amount: 50,
      currency_code: 'RON',
      amount_ron: 50,
      category_id: 2,
      date: '2026-03-02',
    });

    expect(mockCreateTransaction).toHaveBeenCalledTimes(1);
    expect(mockGetTransactions).toHaveBeenCalledTimes(1);
  });

  it('updates a transaction and reloads state', async () => {
    mockUpdateTransaction.mockResolvedValue(undefined);
    mockGetTransactions.mockResolvedValue([]);

    await useTransactionsStore.getState().update(4, {
      type: 'income',
      amount: 200,
      currency_code: 'RON',
      amount_ron: 200,
      category_id: 1,
      date: '2026-03-05',
    });

    expect(mockUpdateTransaction).toHaveBeenCalledWith(4, expect.any(Object));
    expect(mockGetTransactions).toHaveBeenCalledTimes(1);
  });

  it('removes a transaction from state after repository delete', async () => {
    useTransactionsStore.setState({
      transactions: [
        {
          id: 1,
          type: 'expense',
          amount: 10,
          currency_code: 'RON',
          amount_ron: 10,
          category_id: 1,
          description: null,
          date: '2026-03-01',
          note: null,
          created_at: '2026-03-01',
          updated_at: '2026-03-01',
        },
        {
          id: 2,
          type: 'expense',
          amount: 20,
          currency_code: 'RON',
          amount_ron: 20,
          category_id: 1,
          description: null,
          date: '2026-03-01',
          note: null,
          created_at: '2026-03-01',
          updated_at: '2026-03-01',
        },
      ],
    });

    mockDeleteTransaction.mockResolvedValue(undefined);

    await useTransactionsStore.getState().remove(1);

    expect(mockDeleteTransaction).toHaveBeenCalledWith(1);
    expect(useTransactionsStore.getState().transactions.map(t => t.id)).toEqual([2]);
  });

  it('setMonth updates currentMonth and triggers load for that month', async () => {
    mockGetTransactions.mockResolvedValue([]);

    useTransactionsStore.getState().setMonth('2026-01');

    await waitFor(() => {
      expect(mockGetTransactions).toHaveBeenCalledWith({ month: '2026-01' });
    });

    expect(useTransactionsStore.getState().currentMonth).toBe('2026-01');
  });
});
