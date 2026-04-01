import React from 'react';
import { fireEvent, render, waitFor } from '@testing-library/react-native';
import DashboardScreen from '../DashboardScreen';

const mockLoad = jest.fn();
const mockLoadGoals = jest.fn();

jest.mock('../../../store/slices/transactionsSlice', () => ({
  useTransactionsStore: jest.fn(() => ({
    transactions: [
      {
        id: 1,
        type: 'income',
        amount: 2000,
        currency_code: 'RON',
        amount_ron: 2000,
        category_id: 1,
        description: 'Salary',
        date: '2026-03-01',
        note: null,
        created_at: '2026-03-01',
        updated_at: '2026-03-01',
        category_name: 'Work',
        category_icon: '💼',
        category_color: '#00D4AA',
      },
      {
        id: 2,
        type: 'expense',
        amount: 500,
        currency_code: 'RON',
        amount_ron: 500,
        category_id: 2,
        description: 'Groceries',
        date: '2026-03-02',
        note: null,
        created_at: '2026-03-02',
        updated_at: '2026-03-02',
        category_name: 'Food',
        category_icon: '🛒',
        category_color: '#F87171',
      },
    ],
    load: mockLoad,
  })),
}));

jest.mock('../../../store/slices/goalsSlice', () => ({
  useGoalsStore: jest.fn(() => ({
    goals: [
      {
        id: 1,
        name: 'Vacation',
        target_amount: 10000,
        current_amount: 3000,
        currency_code: 'RON',
        icon: '✈️',
        color: '#00D4AA',
        deadline: null,
        status: 'active',
        note: null,
        created_at: '2026-03-01',
        updated_at: '2026-03-01',
        currency_symbol: 'RON',
      },
    ],
    load: mockLoadGoals,
  })),
}));

jest.mock('../../../store/slices/settingsSlice', () => ({
  useSettingsStore: jest.fn(() => ({
    currency: 'RON',
  })),
}));

jest.mock('../../transactions/AddTransactionScreen', () => {
  return function MockAddTransactionScreen() {
    const { Text } = require('react-native');
    return <Text>Add Transaction Modal</Text>;
  };
});

jest.mock('../../transactions/TransactionDetailScreen', () => {
  return function MockTransactionDetailScreen() {
    const { Text } = require('react-native');
    return <Text>Transaction Detail Modal</Text>;
  };
});

describe('DashboardScreen integration', () => {
  beforeEach(() => {
    mockLoad.mockClear();
    mockLoadGoals.mockClear();
  });

  it('renders summary and recent transaction data', async () => {
    const { getByText } = render(<DashboardScreen />);

    await waitFor(() => {
      expect(mockLoad).toHaveBeenCalledTimes(1);
      expect(mockLoadGoals).toHaveBeenCalledTimes(1);
    });

    expect(getByText('TOTAL BALANCE')).toBeTruthy();
    expect(getByText('Recent')).toBeTruthy();
    expect(getByText('Salary')).toBeTruthy();
    expect(getByText('Groceries')).toBeTruthy();
    expect(getByText('1.500 RON')).toBeTruthy();
  });

  it('opens add transaction modal from FAB press', () => {
    const { getByText, queryByText } = render(<DashboardScreen />);

    expect(queryByText('Add Transaction Modal')).toBeNull();

    fireEvent.press(getByText('+'));

    expect(getByText('Add Transaction Modal')).toBeTruthy();
  });
});
