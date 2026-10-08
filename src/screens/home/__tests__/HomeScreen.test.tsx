import React from 'react';
import { render, fireEvent, screen, waitFor, act, cleanup } from '@testing-library/react-native';
import HomeScreen from '../HomeScreen';
import { Transaction } from '../../../database/repositories/transactionRepository';

let mockCurrency = 'RON';
let mockTransactions: Transaction[];
const mockLoad = jest.fn().mockResolvedValue(undefined);
jest.mock('../../../store/slices/transactionsSlice', () => ({useTransactionsStore: () => ({transactions: mockTransactions, load: mockLoad, currentMonth: '2026-10', setMonth: jest.fn(), isLoading: false})}));
jest.mock('../../../store/slices/settingsSlice', () => ({useSettingsStore: (selector: (s: {currency: string}) => unknown) => selector({currency: mockCurrency})}));
jest.mock('../../../services/currencyService', () => ({getCurrencyRate: async () => 4.97}));
jest.mock('@react-navigation/native', () => ({useFocusEffect: (effect: () => void) => require('react').useEffect(effect, [effect])}));
jest.mock('../../../components/common/AppIcon', () => () => null);
jest.mock('../../transactions/AddTransactionScreen', () => () => require('react').createElement(require('react-native').Text, null, 'New transaction form'));
jest.mock('../../transactions/TransactionDetailScreen', () => () => null);
jest.mock('../../../components/common/MonthPickerModal', () => () => null);

const tx = (id: number, description: string, type: 'income' | 'expense', amount: number, amount_ron: number, date: string, currency_code = 'RON'): Transaction => ({id, description, type, amount, amount_ron, date, currency_code, category_id: type === 'income' ? 10 : 1, category_name: type === 'income' ? 'Salary' : 'Food', note: null, created_at: date, updated_at: date});
beforeEach(() => {
  jest.useFakeTimers();
  mockCurrency = 'RON';
  mockTransactions = [tx(1, 'Uber', 'expense', 35, 35, '2026-10-07'), tx(2, 'Salary', 'income', 8500, 8500, '2026-10-07'), tx(3, 'Lidl', 'expense', 10, 49.7, '2026-10-08', 'EUR'), tx(4, 'Coffee', 'expense', 48, 48, '2026-10-08')];
});
afterEach(() => {
  act(() => { jest.runOnlyPendingTimers(); });
  cleanup();
  jest.useRealTimers();
});
describe('daily transaction totals', () => {
  it('shows Received for income, fixing the screenshot case where salary was labelled Spent', () => {
    render(<HomeScreen />);
    fireEvent.press(screen.getByRole('button', {name: 'Income'}));
    expect(screen.getByText('Received 8.500,00 RON')).toBeTruthy();
    expect(screen.queryByText(/^Spent /)).toBeNull();
    expect(screen.queryByText('Uber')).toBeNull();
  });
  it('keeps the full day expense total when searching for one transaction', () => {
    render(<HomeScreen />);
    fireEvent.changeText(screen.getByLabelText('Search transactions'), 'Lidl');
    expect(screen.getByText('Spent 97,70 RON')).toBeTruthy();
    expect(screen.queryByText('Coffee')).toBeNull();
    fireEvent.press(screen.getByLabelText('Clear search'));
    fireEvent.press(screen.getByRole('button', {name: 'Expenses'}));
    expect(screen.getByText('Spent 35,00 RON')).toBeTruthy();
    expect(screen.queryByText('Salary')).toBeNull();
  });
  it('converts daily totals to the selected main currency but shows each transaction in its own currency', async () => {
    mockCurrency = 'EUR';
    render(<HomeScreen />);
    await waitFor(() => expect(screen.getByText('Spent 7,04 EUR')).toBeTruthy());
    expect(screen.getByText('−10,00')).toBeTruthy();
    fireEvent.press(screen.getByRole('button', {name: 'Income'}));
    expect(screen.getByText('Received 1.710,26 EUR')).toBeTruthy();
  });
  it('keeps a negative monthly balance negative and opens the transaction form from the floating button', () => {
    mockTransactions = [tx(1, 'Uber', 'expense', 35, 35, '2026-10-07')];
    render(<HomeScreen />);
    expect(screen.getByText('−35,00 RON')).toBeTruthy();
    fireEvent.press(screen.getByLabelText('Add transaction'));
    expect(screen.getByText('New transaction form')).toBeTruthy();
  });
});
