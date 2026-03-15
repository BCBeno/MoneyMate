import { create } from 'zustand';
import { runMigrations } from '../../database/migrations';
import { seedDatabase } from '../../database/seeds';
import { getAllSettings, setSetting } from '../../database/repositories/settingsRepository';

interface SettingsState {
  currency: string;
  pinEnabled: boolean;
  biometricEnabled: boolean;
  autoBackup: boolean;
  isLocked: boolean;
  isLoading: boolean;
  loadSettings: () => Promise<void>;
  setCurrency: (currency: string) => Promise<void>;
  setPinEnabled: (enabled: boolean) => Promise<void>;
  setBiometricEnabled: (enabled: boolean) => Promise<void>;
  setAutoBackup: (enabled: boolean) => Promise<void>;
  unlock: () => void;
  lock: () => void;
}

export const useSettingsStore = create<SettingsState>()((set) => ({
  currency: 'RON',
  pinEnabled: false,
  biometricEnabled: false,
  autoBackup: false,
  isLocked: false,
  isLoading: true,

  loadSettings: async () => {
    try {
      await runMigrations();
      await seedDatabase();
      const settings = await getAllSettings();
      set({
        currency: settings.currency ?? 'RON',
        pinEnabled: settings.pin_enabled === '1',
        biometricEnabled: settings.biometric_enabled === '1',
        autoBackup: settings.auto_backup === '1',
        isLocked: settings.pin_enabled === '1',
        isLoading: false,
      });
    } catch (e) {
      console.error('loadSettings error:', e);
      set({ isLoading: false });
    }
  },

  setCurrency: async (currency) => {
    await setSetting('currency', currency);
    set({ currency });
  },
  setPinEnabled: async (enabled) => {
    await setSetting('pin_enabled', enabled ? '1' : '0');
    set({ pinEnabled: enabled, isLocked: false });
  },
  setBiometricEnabled: async (enabled) => {
    await setSetting('biometric_enabled', enabled ? '1' : '0');
    set({ biometricEnabled: enabled });
  },
  setAutoBackup: async (enabled) => {
    await setSetting('auto_backup', enabled ? '1' : '0');
    set({ autoBackup: enabled });
  },
  unlock: () => set({ isLocked: false }),
  lock: () => set({ isLocked: true }),
}));
