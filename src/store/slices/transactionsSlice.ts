import { create } from 'zustand';
import {
  Transaction,
  CreateTransactionDto,
  UpdateTransactionDto,
  getTransactions,
  createTransaction,
  updateTransaction,
  deleteTransaction,
} from '../../database/repositories/transactionRepository';
import { format } from 'date-fns';

interface TransactionsState {
  transactions: Transaction[];
  isLoading: boolean;
  currentMonth: string;
  load: (filters?: {
    month?: string;
    type?: 'income' | 'expense';
    category_id?: number;
  }) => Promise<void>;
  add: (dto: CreateTransactionDto) => Promise<void>;
  update: (id: number, dto: UpdateTransactionDto) => Promise<void>;
  remove: (id: number) => Promise<void>;
  setMonth: (month: string) => void;
}

export const useTransactionsStore = create<TransactionsState>()((set, get) => ({
  transactions: [],
  isLoading: false,
  currentMonth: format(new Date(), 'yyyy-MM'),

  load: async (filters) => {
    set({ isLoading: true });
    try {
      const month = filters?.month ?? get().currentMonth;
      const transactions = await getTransactions({ ...filters, month });
      set({ transactions, isLoading: false });
    } catch (e) {
      console.error('load transactions error:', e);
      set({ isLoading: false });
    }
  },

  add: async (dto) => {
    await createTransaction(dto);
    await get().load();
  },

  update: async (id, dto) => {
    await updateTransaction(id, dto);
    await get().load();
  },

  remove: async (id) => {
    await deleteTransaction(id);
    set(state => ({
      transactions: state.transactions.filter(t => t.id !== id),
    }));
  },

  setMonth: (month) => {
    set({ currentMonth: month });
    get().load({ month });
  },
}));
