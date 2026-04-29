import { create } from 'zustand';
import { runMigrations } from '../../database/migrations';
import { seedDatabase } from '../../database/seeds';
import { getAllSettings, setSetting } from '../../database/repositories/settingsRepository';

interface SettingsState {
  currency: string;
  pinEnabled: boolean;
  biometricEnabled: boolean;
  autoBackup: boolean;
  showGoalsTab: boolean;
  showAiAnalysis: boolean;
  aiAnalysisLanguage: string;
  isLocked: boolean;
  isLoading: boolean;
  loadSettings: () => Promise<void>;
  setCurrency: (currency: string) => Promise<void>;
  setPinEnabled: (enabled: boolean) => Promise<void>;
  setBiometricEnabled: (enabled: boolean) => Promise<void>;
  setAutoBackup: (enabled: boolean) => Promise<void>;
  setShowGoalsTab: (enabled: boolean) => Promise<void>;
  setShowAiAnalysis: (enabled: boolean) => Promise<void>;
  setAiAnalysisLanguage: (lang: string) => Promise<void>;
  unlock: () => void;
  lock: () => void;
}

export const useSettingsStore = create<SettingsState>()((set) => ({
  currency: 'RON',
  pinEnabled: false,
  biometricEnabled: false,
  autoBackup: false,
  showGoalsTab: true,
  showAiAnalysis: false,
  aiAnalysisLanguage: 'English',
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
        showGoalsTab: settings.show_goals_tab === '1' || settings.show_goals_tab === undefined,
        showAiAnalysis: settings.show_ai_analysis === '1',
        aiAnalysisLanguage: settings.ai_analysis_language ?? 'English',
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
  setShowGoalsTab: async (enabled) => {
    await setSetting('show_goals_tab', enabled ? '1' : '0');
    set({ showGoalsTab: enabled });
  },
  setShowAiAnalysis: async (enabled) => {
    await setSetting('show_ai_analysis', enabled ? '1' : '0');
    set({ showAiAnalysis: enabled });
  },
  setAiAnalysisLanguage: async (lang) => {
    await setSetting('ai_analysis_language', lang);
    set({ aiAnalysisLanguage: lang });
  },
  unlock: () => set({ isLocked: false }),
  lock: () => set({ isLocked: true }),
}));
