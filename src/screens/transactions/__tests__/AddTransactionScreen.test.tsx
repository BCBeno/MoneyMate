import React from 'react';
import { render, fireEvent, screen, waitFor } from '@testing-library/react-native';
import AddTransactionScreen from '../AddTransactionScreen';

const mockAdd = jest.fn().mockResolvedValue(undefined);
const mockClose = jest.fn();
// The first native render also transforms lazy React Native modules on a cold cache.
const nativeRenderTimeout = 30_000;
jest.mock('../../../components/common/AppIcon', () => () => null);
jest.mock('@react-native-community/datetimepicker', () => () => null);
jest.mock('../../../store/slices/transactionsSlice', () => ({useTransactionsStore: () => ({add: mockAdd})}));
jest.mock('../../../store/slices/settingsSlice', () => ({useSettingsStore: (selector: (s: {currency: string}) => unknown) => selector({currency: 'EUR'})}));
jest.mock('../../../services/currencyService', () => ({convertToRON: async (amount: number) => amount * 4.97}));
jest.mock('../../../database/repositories/categoryRepository', () => ({getCategories: async (type: string) => [{id: type === 'income' ? 2 : 1, name: type === 'income' ? 'Salary' : 'Food', icon: type === 'income' ? 'briefcase' : 'utensils', color: '#EDC17B', type, is_default: 1}]}));

beforeEach(() => { jest.clearAllMocks(); });
it('requires a positive amount and category before saving, then preserves amount and currency conversion', async () => {
  render(<AddTransactionScreen onClose={mockClose} />);
  fireEvent.press(screen.getByText('Add transaction'));
  expect(mockAdd).not.toHaveBeenCalled();
  expect(screen.getByText('Amount must be greater than 0')).toBeTruthy();
  expect(screen.getByText('Category is required')).toBeTruthy();
  fireEvent.changeText(screen.getByPlaceholderText('0.00'), '10,00');
  fireEvent.press(screen.getByText('Category'));
  await waitFor(() => expect(screen.getByRole('button', {name: 'Food'})).toBeTruthy());
  fireEvent.press(screen.getByRole('button', {name: 'Food'}));
  fireEvent.press(screen.getByText('Add transaction'));
  await waitFor(() => expect(mockAdd).toHaveBeenCalledWith(expect.objectContaining({type: 'expense', amount: 10, currency_code: 'EUR', category_id: 1})));
  expect(mockAdd.mock.calls[0][0].amount_ron).toBeCloseTo(49.7, 2);
  expect(mockClose).toHaveBeenCalledTimes(1);
}, nativeRenderTimeout);
it('clears an expense category when switching to income and saves only an income category', async () => {
  render(<AddTransactionScreen onClose={mockClose} />);
  fireEvent.changeText(screen.getByPlaceholderText('0.00'), '100');
  fireEvent.press(screen.getByText('Category'));
  await waitFor(() => expect(screen.getByRole('button', {name: 'Food'})).toBeTruthy());
  fireEvent.press(screen.getByRole('button', {name: 'Food'}));
  fireEvent.press(screen.getByText('Income'));
  fireEvent.press(screen.getByText('Add transaction'));
  expect(mockAdd).not.toHaveBeenCalled();
  fireEvent.press(screen.getByText('Category'));
  await waitFor(() => expect(screen.getByRole('button', {name: 'Salary'})).toBeTruthy());
  fireEvent.press(screen.getByRole('button', {name: 'Salary'}));
  fireEvent.press(screen.getByText('Add transaction'));
  await waitFor(() => expect(mockAdd).toHaveBeenCalledWith(expect.objectContaining({type: 'income', category_id: 2})));
}, nativeRenderTimeout);
