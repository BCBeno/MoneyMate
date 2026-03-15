import { NavigatorScreenParams } from '@react-navigation/native';

export type RootStackParamList = {
  Auth: NavigatorScreenParams<AuthStackParamList>;
  Main: NavigatorScreenParams<MainTabParamList>;
};

export type AuthStackParamList = {
  PinLock: undefined;
  PinSetup: undefined;
  BiometricPrompt: undefined;
};

export type MainTabParamList = {
  Dashboard: undefined;
  Transactions: undefined;
  Goals: undefined;
  Reports: undefined;
  Settings: undefined;
};

export type TransactionsStackParamList = {
  TransactionsList: undefined;
  AddTransaction: { type?: 'income' | 'expense' };
  TransactionDetail: { id: number };
};

export type GoalsStackParamList = {
  GoalsList: undefined;
  AddGoal: undefined;
  GoalDetail: { id: number };
};

export type SettingsStackParamList = {
  SettingsMain: undefined;
  Security: undefined;
  Currency: undefined;
  Backup: undefined;
};
