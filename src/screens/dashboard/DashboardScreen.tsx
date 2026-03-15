import React, { useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView,
  TouchableOpacity, StatusBar, Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors } from '../../theme';
import { Transaction } from '../../database/repositories/transactionRepository';
import { useTransactionsStore } from '../../store/slices/transactionsSlice';
import { useGoalsStore } from '../../store/slices/goalsSlice';
import { useSettingsStore } from '../../store/slices/settingsSlice';
import { formatCurrency } from '../../utils/formatCurrency';
import { calculateBalance, calculateIncome, calculateExpenses } from '../../utils/calculations';
import AddTransactionScreen from '../transactions/AddTransactionScreen';
import TransactionDetailScreen from '../transactions/TransactionDetailScreen';
import { format } from 'date-fns';

export default function DashboardScreen() {
  const { transactions, load } = useTransactionsStore();
  const { goals, load: loadGoals } = useGoalsStore();
  const { currency } = useSettingsStore();
  const [showAdd, setShowAdd]           = useState(false);
  const [selectedTx, setSelectedTx]     = useState<Transaction | null>(null);
  const currentMonth = format(new Date(), 'yyyy-MM');

  useEffect(() => {
    load({ month: currentMonth });
    loadGoals();
  }, []);

  const balance     = calculateBalance(transactions);
  const income      = calculateIncome(transactions);
  const expenses    = calculateExpenses(transactions);
  const activeGoals = goals.filter(g => g.status === 'active').slice(0, 2);
  const recent      = transactions.slice(0, 5);

  const reload = () => {
    load({ month: currentMonth });
  };

  return (
    <SafeAreaView style={s.safe} edges={['top']}>
      <StatusBar barStyle="light-content" backgroundColor={colors.bg.primary} />
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={s.content}>

        {/* Balance card */}
        <View style={s.balanceCard}>
          <View style={s.balanceGlow} />
          <Text style={s.balanceLabel}>SOLD TOTAL</Text>
          <Text style={s.balanceAmount}>{formatCurrency(balance, currency, 0)}</Text>
        </View>

        {/* Quick stats */}
        <View style={s.statsGrid}>
          <View style={s.statCard}>
            <Text style={s.statLabel}>Venituri</Text>
            <Text style={[s.statAmount, { color: colors.income }]}>
              +{formatCurrency(income, currency, 0)}
            </Text>
          </View>
          <View style={s.statCard}>
            <Text style={s.statLabel}>Cheltuieli</Text>
            <Text style={[s.statAmount, { color: colors.expense }]}>
              -{formatCurrency(expenses, currency, 0)}
            </Text>
          </View>
        </View>

        {/* Goals */}
        {activeGoals.length > 0 && (
          <View style={s.section}>
            <Text style={s.sectionTitle}>Obiective active</Text>
            {activeGoals.map(goal => {
              const pct = Math.min(100, (goal.current_amount / goal.target_amount) * 100);
              return (
                <View key={goal.id} style={s.goalCard}>
                  <View style={s.goalHeader}>
                    <View style={[s.goalIcon, { backgroundColor: goal.color + '26' }]}>
                      <Text style={s.goalEmoji}>{goal.icon}</Text>
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={s.goalName}>{goal.name}</Text>
                      <Text style={s.goalSub}>
                        {formatCurrency(goal.current_amount, '', 0)} / {formatCurrency(goal.target_amount, goal.currency_symbol ?? 'RON', 0)}
                      </Text>
                    </View>
                    <Text style={s.goalPct}>{Math.round(pct)}%</Text>
                  </View>
                  <View style={s.progressBg}>
                    <View style={[s.progressFill, { width: `${pct}%` as any, backgroundColor: goal.color }]} />
                  </View>
                </View>
              );
            })}
          </View>
        )}

        {/* Recent transactions — tappable */}
        <View style={s.section}>
          <Text style={s.sectionTitle}>Recente</Text>
          {recent.length === 0
            ? <Text style={s.empty}>Nicio tranzacție această lună</Text>
            : recent.map(t => (
              <TouchableOpacity
                key={t.id}
                onPress={() => setSelectedTx(t)}
                activeOpacity={0.75}
              >
                <View style={s.txItem}>
                  <View style={[s.txIcon, { backgroundColor: (t.category_color ?? '#666') + '26' }]}>
                    <Text style={s.txEmoji}>{t.category_icon ?? '💰'}</Text>
                  </View>
                  <View style={s.txInfo}>
                    <Text style={s.txName} numberOfLines={1}>
                      {t.description ?? t.category_name}
                    </Text>
                    <Text style={s.txCat}>{t.category_name}</Text>
                  </View>
                  <Text style={[s.txAmount, { color: t.type === 'income' ? colors.income : colors.expense }]}>
                    {t.type === 'income' ? '+' : '-'}{formatCurrency(t.amount_ron, currency, 0)}
                  </Text>
                </View>
              </TouchableOpacity>
            ))
          }
        </View>
      </ScrollView>

      {/* FAB */}
      <TouchableOpacity style={s.fab} onPress={() => setShowAdd(true)} activeOpacity={0.85}>
        <Text style={s.fabText}>+</Text>
      </TouchableOpacity>

      {/* Add transaction */}
      <Modal visible={showAdd} animationType="slide" transparent onRequestClose={() => setShowAdd(false)}>
        <AddTransactionScreen onClose={() => { setShowAdd(false); reload(); }} />
      </Modal>

      {/* Transaction detail/edit */}
      <Modal
        visible={selectedTx !== null}
        animationType="slide"
        transparent={false}
        onRequestClose={() => setSelectedTx(null)}
      >
        {selectedTx !== null && (
          <TransactionDetailScreen
            transaction={selectedTx}
            onClose={() => { setSelectedTx(null); reload(); }}
            onDeleted={() => { setSelectedTx(null); reload(); }}
          />
        )}
      </Modal>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe:    { flex: 1, backgroundColor: colors.bg.primary },
  content: { padding: 12, paddingBottom: 100, gap: 10 },

  balanceCard: {
    backgroundColor: '#0F2027',
    borderRadius: 16, padding: 16,
    borderWidth: 1, borderColor: 'rgba(0,212,170,0.2)',
    overflow: 'hidden', position: 'relative',
  },
  balanceGlow: {
    position: 'absolute', top: -30, right: -30,
    width: 80, height: 80, borderRadius: 40,
    backgroundColor: 'rgba(0,212,170,0.12)',
  },
  balanceLabel:  { fontSize: 9, color: colors.text.secondary, letterSpacing: 0.5, marginBottom: 4 },
  balanceAmount: { fontSize: 32, fontWeight: '700', color: colors.text.primary, letterSpacing: -0.5 },

  statsGrid:  { flexDirection: 'row', gap: 8 },
  statCard:   { flex: 1, backgroundColor: colors.bg.secondary, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10, borderWidth: 1, borderColor: colors.border.default },
  statLabel:  { fontSize: 9, color: colors.text.muted, marginBottom: 3 },
  statAmount: { fontSize: 16, fontWeight: '600' },

  section:      { gap: 0 },
  sectionTitle: { fontSize: 10, fontWeight: '600', color: colors.text.secondary, textTransform: 'uppercase', letterSpacing: 0.6, marginBottom: 8 },
  empty:        { fontSize: 13, color: colors.text.muted, paddingVertical: 12 },

  goalCard:    { backgroundColor: colors.bg.secondary, borderRadius: 12, padding: 12, marginBottom: 8, borderWidth: 1, borderColor: colors.border.default },
  goalHeader:  { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 },
  goalIcon:    { width: 32, height: 32, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  goalEmoji:   { fontSize: 16 },
  goalName:    { fontSize: 13, fontWeight: '600', color: colors.text.primary },
  goalSub:     { fontSize: 10, color: colors.text.muted, marginTop: 1 },
  goalPct:     { fontSize: 13, fontWeight: '700', color: colors.accent.primary },
  progressBg:  { height: 5, backgroundColor: colors.bg.elevated, borderRadius: 3, overflow: 'hidden' },
  progressFill:{ height: 5, borderRadius: 3 },

  txItem:  { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: 'rgba(30,38,64,0.5)' },
  txIcon:  { width: 32, height: 32, borderRadius: 9, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  txEmoji: { fontSize: 15 },
  txInfo:  { flex: 1, minWidth: 0 },
  txName:  { fontSize: 12, fontWeight: '500', color: colors.text.primary },
  txCat:   { fontSize: 10, color: colors.text.muted, marginTop: 1 },
  txAmount:{ fontSize: 12, fontWeight: '600', flexShrink: 0 },

  fab: {
    position: 'absolute', bottom: 16, right: 16,
    width: 52, height: 52, borderRadius: 26,
    backgroundColor: colors.accent.primary,
    alignItems: 'center', justifyContent: 'center',
    shadowColor: colors.accent.primary, shadowOpacity: 0.45,
    shadowRadius: 16, shadowOffset: { width: 0, height: 4 },
    elevation: 8,
  },
  fabText: { fontSize: 26, color: colors.bg.primary, fontWeight: '300', lineHeight: 30 },
});
