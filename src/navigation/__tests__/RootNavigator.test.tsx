import React from 'react';
import { AppState, type AppStateStatus } from 'react-native';
import { act, fireEvent, render, screen } from '@testing-library/react-native';
import RootNavigator from '../RootNavigator';
import { useSettingsStore } from '../../store/slices/settingsSlice';

jest.mock('react-native-safe-area-context', () =>
  require('react-native-safe-area-context/jest/mock').default
);

jest.mock('expo-font', () => ({
  isLoaded: () => true,
  loadAsync: jest.fn().mockResolvedValue(undefined),
}));

jest.mock('../../store/slices/settingsSlice', () => {
  const { create } = require('zustand');
  return {
    useSettingsStore: create((set: (state: { isLocked: boolean }) => void) => ({
      pinEnabled: false,
      isLocked: false,
      isLoading: false,
      showGoalsTab: true,
      loadSettings: jest.fn().mockResolvedValue(undefined),
      lock: jest.fn(() => set({ isLocked: true })),
    })),
  };
});

jest.mock('../../screens/home/HomeScreen', () => () =>
  require('react').createElement(require('react-native').Text, null, 'Home screen')
);
jest.mock('../../screens/reports/ReportsScreen', () => () =>
  require('react').createElement(require('react-native').Text, null, 'Reports screen')
);
jest.mock('../../screens/goals/GoalsScreen', () => () =>
  require('react').createElement(require('react-native').Text, null, 'Goals screen')
);
jest.mock('../../screens/settings/SettingsScreen', () => () =>
  require('react').createElement(require('react-native').Text, null, 'Settings screen')
);
jest.mock('../../screens/auth/PinLockScreen', () => () =>
  require('react').createElement(require('react-native').Text, null, 'PIN lock screen')
);

let appStateListener: (state: AppStateStatus) => void;

beforeEach(() => {
  jest.useFakeTimers();
  useSettingsStore.setState({
    pinEnabled: false,
    isLocked: false,
    isLoading: false,
    showGoalsTab: true,
  });
  jest.mocked(useSettingsStore.getState().loadSettings).mockClear();
  jest.mocked(useSettingsStore.getState().lock).mockClear();
  jest.spyOn(AppState, 'addEventListener').mockImplementation((_event, listener) => {
    appStateListener = listener;
    return { remove: jest.fn() };
  });
});

afterEach(() => {
  act(() => jest.runOnlyPendingTimers());
  jest.useRealTimers();
  jest.restoreAllMocks();
});

it('keeps the app behind the loading and PIN screens until it is unlocked', () => {
  useSettingsStore.setState({ isLoading: true, pinEnabled: true, isLocked: true });
  render(<RootNavigator />);
  expect(screen.getByText('Loading...')).toBeTruthy();
  expect(screen.queryByText('Home screen')).toBeNull();

  act(() => useSettingsStore.setState({ isLoading: false }));
  expect(screen.getByText('PIN lock screen')).toBeTruthy();
  expect(screen.queryByText('Home screen')).toBeNull();

  act(() => useSettingsStore.setState({ isLocked: false }));
  expect(screen.getByText('Home screen')).toBeTruthy();
  expect(screen.queryByText('PIN lock screen')).toBeNull();
  expect(useSettingsStore.getState().loadSettings).toHaveBeenCalledTimes(1);
});

it('switches tabs and respects the Goals setting without deprecation or icon warnings', () => {
  const warn = jest.spyOn(console, 'warn');
  render(<RootNavigator />);

  for (const name of ['Reports', 'Goals', 'Settings', 'Home', 'Home']) {
    fireEvent.press(screen.getByLabelText(new RegExp(`^${name}(, tab,|$)`)));
    act(() => jest.runOnlyPendingTimers());
    expect(screen.getByText(`${name} screen`)).toBeTruthy();
  }

  act(() => useSettingsStore.setState({ showGoalsTab: false }));
  expect(screen.queryByLabelText(/^Goals(, tab,|$)/)).toBeNull();
  expect(warn).not.toHaveBeenCalled();
});

it('locks the app when it leaves the foreground with PIN protection enabled', () => {
  useSettingsStore.setState({ pinEnabled: true });
  render(<RootNavigator />);
  expect(screen.getByText('Home screen')).toBeTruthy();

  act(() => appStateListener('active'));
  act(() => appStateListener('background'));
  expect(useSettingsStore.getState().lock).toHaveBeenCalledTimes(1);
  expect(screen.getByText('PIN lock screen')).toBeTruthy();
  expect(screen.queryByText('Home screen')).toBeNull();
});
