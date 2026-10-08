import BottomSheetPicker from '../../components/common/BottomSheetPicker';
import AppIcon from '../../components/common/AppIcon';
import React, { useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView,
  TouchableOpacity, Switch, Modal, Alert, ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors } from '../../theme';
import { useSettingsStore } from '../../store/slices/settingsSlice';
import { deletePin, isBiometricAvailable } from '../../services/securityService';
import { exportToJSON, exportToCSV, exportToSQLite } from '../../services/exportService';
import { importJSON, importSQLite } from '../../services/importService';
import { DEFAULT_CURRENCIES } from '../../constants/currencies';
import PinSetupScreen from '../auth/PinSetupScreen';
import CategoriesScreen from './CategoriesScreen';
import { CONFIG } from '../../constants/config';

const AI_LANGUAGES = [
  'English', 'Romanian', 'Spanish', 'French', 'German',
  'Italian', 'Portuguese', 'Dutch', 'Russian', 'Polish',
  'Turkish', 'Arabic', 'Chinese', 'Japanese', 'Korean',
];

interface SectionItem {
  icon: string;
  bg: string;
  label: string;
  sub: string;
  toggle?: boolean;
  value?: boolean;
  onToggle?: (v: boolean) => void;
  disabled?: boolean;
  arrow?: boolean;
  onPress?: () => void;
  loading?: boolean;
}

export default function SettingsScreen() {
  const {
    pinEnabled, biometricEnabled, currency, autoBackup, showGoalsTab, showAiAnalysis, aiAnalysisLanguage,
    setPinEnabled, setBiometricEnabled, setCurrency, setAutoBackup, setShowGoalsTab, setShowAiAnalysis, setAiAnalysisLanguage,
  } = useSettingsStore();

  const [showPinSetup, setShowPinSetup]         = useState(false);
  const [showCategories, setShowCategories]     = useState(false);
  const [showCurrency, setShowCurrency]         = useState(false);
  const [showLanguagePicker, setShowLanguagePicker] = useState(false);
  const [exportingJSON, setExportingJSON]   = useState(false);
  const [exportingCSV, setExportingCSV]     = useState(false);
  const [exportingDB, setExportingDB]       = useState(false);
  const [importingJSON, setImportingJSON]   = useState(false);
  const [importingDB, setImportingDB]       = useState(false);

  const handleTogglePin = async (val: boolean) => {
    if (val) { setShowPinSetup(true); return; }
    Alert.alert('Disable PIN', 'Are you sure?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Disable', style: 'destructive', onPress: async () => {
        await deletePin();
        await setPinEnabled(false);
      }},
    ]);
  };

  const handleToggleBiometric = async (val: boolean) => {
    if (val) {
      const ok = await isBiometricAvailable();
      if (!ok) { Alert.alert('Unavailable', 'Biometrics are not configured on this device.'); return; }
    }
    await setBiometricEnabled(val);
  };

  const withLoading = (setter: (v: boolean) => void, fn: () => Promise<void>) => async () => {
    setter(true);
    try { await fn(); }
    catch (e: any) { Alert.alert('Error', e?.message ?? 'An error occurred.'); }
    finally { setter(false); }
  };

  const handleExportJSON   = withLoading(setExportingJSON,   exportToJSON);
  const handleExportCSV    = withLoading(setExportingCSV,    exportToCSV);
  const handleExportSQLite = withLoading(setExportingDB,     exportToSQLite);

  const handleImportJSON = withLoading(setImportingJSON, async () => {
    const result = await importJSON();
    Alert.alert(
      'Import complete',
      `${result.transactions} transaction${result.transactions === 1 ? '' : 's'} imported.${result.errors.length > 0 ? '\n' + result.errors.length + ' error(s).' : ''}`
    );
  });

  const handleImportDB = withLoading(setImportingDB, async () => {
    const result = await importSQLite();
    Alert.alert(
      'Import complete',
      `${result.transactions} transaction${result.transactions === 1 ? '' : 's'} imported.${result.errors.length > 0 ? '\n' + result.errors.length + ' error(s).' : ''}`
    );
  });

  type Section = { title: string; items: SectionItem[] };
  const sections: Section[] = [
    {
      title: 'Security',
      items: [
        { icon: "lock", bg: colors.bg.negative, label: 'PIN lock', sub: pinEnabled ? 'Enabled' : 'Disabled', toggle: true, value: pinEnabled, onToggle: handleTogglePin },
        { icon: "fingerprint", bg: 'rgba(96,165,250,0.15)',  label: 'Biometrics',    sub: 'Fingerprint / Face ID', toggle: true, value: biometricEnabled, onToggle: handleToggleBiometric, disabled: !pinEnabled },
      ],
    },
    {
      title: 'Export Data',
      items: [
        { icon: "download", bg: 'rgba(0,212,170,0.15)',   label: 'Export JSON',   sub: 'Full backup (transactions + categories)',   arrow: true, onPress: handleExportJSON,   loading: exportingJSON },
        { icon: "bar-chart-2", bg: 'rgba(52,211,153,0.15)',  label: 'Export CSV',    sub: 'Transactions as spreadsheet',                 arrow: true, onPress: handleExportCSV,    loading: exportingCSV },
        { icon: "database", bg: 'rgba(96,165,250,0.15)',  label: 'Export SQLite', sub: 'Full database (.db)',               arrow: true, onPress: handleExportSQLite, loading: exportingDB },
      ],
    },
    {
      title: 'Import Data',
      items: [
        { icon: "upload", bg: 'rgba(251,191,36,0.15)',  label: 'Import JSON',   sub: 'Restore from JSON backup',               arrow: true, onPress: handleImportJSON, loading: importingJSON },
        { icon: "database", bg: 'rgba(96,165,250,0.15)',  label: 'Import SQLite', sub: 'Import from .db or .sqlite file',        arrow: true, onPress: handleImportDB,   loading: importingDB },
      ],
    },
    {
      title: 'Preferences',
      items: [
        { icon: "coins", bg: 'rgba(139,92,246,0.15)', label: 'Main currency', sub: currency, arrow: true, onPress: () => setShowCurrency(true) },
        { icon: "tags", bg: 'rgba(20,184,166,0.15)',   label: 'Categories', sub: 'Manage custom categories', arrow: true, onPress: () => setShowCategories(true) },
        { icon: "target", bg: 'rgba(249,115,22,0.15)', label: 'Goals tab', sub: showGoalsTab ? 'Shown' : 'Hidden', toggle: true, value: showGoalsTab, onToggle: setShowGoalsTab },
        { icon: "zap", bg: 'rgba(0,212,170,0.15)', label: 'AI Spending Analysis', sub: showAiAnalysis ? 'Enabled' : 'Disabled', toggle: true, value: showAiAnalysis, onToggle: setShowAiAnalysis },
        { icon: "globe", bg: 'rgba(96,165,250,0.15)', label: 'Analysis language', sub: aiAnalysisLanguage, arrow: true, onPress: () => setShowLanguagePicker(true), disabled: !showAiAnalysis },
      ],
    },
  ];

  // Put frequent preferences before backup tools.
  const orderedSections = [sections[0], sections[3], sections[1], sections[2]];
  return (
    <SafeAreaView style={s.safe} edges={['top']}>
      <ScrollView contentContainerStyle={s.content} showsVerticalScrollIndicator={false}>
        <Text style={s.screenLabel}>Settings</Text>
        <View style={s.privacy}><View style={s.privacyHeading}><AppIcon name="shield-check" /><Text style={s.privacyTitle}>Your data stays with you</Text></View><Text style={s.privacySub}>Stored locally on your device.</Text></View>

        {orderedSections.map((sec, si) => (
          <View key={si} style={s.section}>
            <Text style={s.sectionTitle}>{sec.title}</Text>
            {sec.items.map((item, ii) => (
              <TouchableOpacity
                key={ii}
                style={[s.item, ii < sec.items.length - 1 && s.itemBorder]}
                onPress={item.onPress ?? (item.onToggle ? () => item.onToggle?.(!item.value) : undefined)}
                accessibilityLabel={item.label}
                accessibilityRole="button"
                disabled={(!item.onPress && !item.toggle) || item.disabled || item.loading}
                activeOpacity={item.arrow ? 0.65 : 1}
              >
                <View style={s.itemLeft}>
                  <View style={[s.itemIcon, { backgroundColor: colors.bg.tertiary }]}>
                    <AppIcon name={item.icon} size={22} color={colors.text.secondary} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={s.itemLabel}>{item.label}</Text>
                    <Text style={s.itemSub}>{item.sub}</Text>
                  </View>
                </View>
                {item.toggle && (
                  <Switch
                    value={item.value}
                    onValueChange={item.onToggle}
                    trackColor={{ false: colors.bg.elevated, true: colors.accent.primary }}
                    thumbColor={colors.text.inverse} accessibilityLabel={item.label}
                    disabled={item.disabled}
                  />
                )}
                {item.arrow && (
                  item.loading
                    ? <ActivityIndicator size="small" color={colors.accent.primary} />
                    : <AppIcon name="chevron-right" size={20} color={colors.text.secondary} />
                )}
              </TouchableOpacity>
            ))}
          </View>
        ))}

        <View style={s.about}>
          <Text style={s.aboutVersion}>MoneyMate v{CONFIG.VERSION}</Text>

        </View>
      </ScrollView>

      <BottomSheetPicker visible={showCurrency} title="Main currency" selectedKey={currency}
        items={DEFAULT_CURRENCIES.map(c => ({key: c.code, label: c.code, sublabel: c.name, icon: 'coins'}))}
        onSelect={code => { void setCurrency(code); }} onClose={() => setShowCurrency(false)} />

      {/* PIN setup */}
      <Modal visible={showPinSetup} animationType="slide" onRequestClose={() => setShowPinSetup(false)}>
        <PinSetupScreen onDone={() => setShowPinSetup(false)} />
      </Modal>

      <BottomSheetPicker visible={showLanguagePicker} title="Analysis language" selectedKey={aiAnalysisLanguage}
        items={AI_LANGUAGES.map(language => ({key: language, label: language, icon: 'globe'}))}
        onSelect={language => { void setAiAnalysisLanguage(language); }} onClose={() => setShowLanguagePicker(false)} />

      {/* Categories */}
      <Modal visible={showCategories} animationType="slide" transparent={false} onRequestClose={() => setShowCategories(false)}>
        <CategoriesScreen onClose={() => setShowCategories(false)} />
      </Modal>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  privacy: { padding: 18, borderRadius: 16, backgroundColor: colors.bg.secondary, borderWidth: 1, borderColor: colors.border.default, gap: 10 },
  privacyHeading: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  privacyTitle: { fontSize: 15, fontWeight: '600', color: colors.text.primary, flex: 1 },
  privacySub: { fontSize: 12, color: colors.text.secondary },
  safe:        { flex: 1, backgroundColor: colors.bg.primary },
  content:     { padding: 24, gap: 16, paddingBottom: 32 },
  screenLabel: { fontSize: 28, color: colors.text.primary, textTransform: 'none', letterSpacing: -0.6, opacity: 1, marginBottom: 16, fontWeight: '700', marginTop: 20 },

  section:      { backgroundColor: 'transparent', borderRadius: 0, marginBottom: 10, borderWidth: 0, borderColor: colors.border.default, overflow: 'hidden' },
  sectionTitle: { fontSize: 11, fontWeight: '600', color: colors.text.secondary, textTransform: 'uppercase', letterSpacing: 1, paddingHorizontal: 0, paddingTop: 10, paddingBottom: 8, borderBottomWidth: 0, borderBottomColor: colors.border.default },
  item:         { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 0, paddingVertical: 12, minHeight: 72 },
  itemBorder:   { borderBottomWidth: 1, borderBottomColor: colors.border.subtle },
  itemLeft:     { flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1, minWidth: 0 },
  itemIcon:     { width: 38, height: 38, borderRadius: 12, alignItems: 'center', justifyContent: 'center', flexShrink: 0, backgroundColor: colors.bg.tertiary },
  itemEmoji:    { fontSize: 15 },
  itemLabel:    { fontSize: 14, fontWeight: '600', color: colors.text.primary },
  itemSub:      { fontSize: 11, color: colors.text.secondary, marginTop: 1 },
  arrow:        { fontSize: 18, color: colors.text.muted },

  about:        { alignItems: 'center', paddingVertical: 16 },
  aboutVersion: { fontSize: 11, color: colors.text.muted },
  aboutSub:     { fontSize: 12, color: colors.text.muted, marginTop: 2 },

  overlay:    { backgroundColor: colors.overlay },
  sheet:      { position: 'absolute', bottom: 0, left: 0, right: 0, backgroundColor: colors.bg.elevated, borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 20, paddingBottom: 48, gap: 4, borderTopWidth: 1, borderTopColor: colors.border.default },
  handle:     { width: 36, height: 4, backgroundColor: colors.border.default, borderRadius: 2, alignSelf: 'center', marginBottom: 12 },
  sheetTitle: { fontSize: 16, fontWeight: '600', color: colors.text.primary, marginBottom: 8 },
  currRow:    { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: colors.border.subtle },
  currRowActive:{ backgroundColor: 'rgba(0,212,170,0.08)', borderRadius: 8, paddingHorizontal: 8 },
  currSymbol: { fontSize: 18, width: 32, textAlign: 'center' },
  currCode:   { fontSize: 14, fontWeight: '600', color: colors.text.primary },
  currName:   { fontSize: 11, color: colors.text.secondary },
  check:      { fontSize: 16, color: colors.accent.primary, fontWeight: '700' },
});
