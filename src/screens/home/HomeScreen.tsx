import React, { useState, useMemo, useCallback } from 'react';
import { View, Text, StyleSheet, SectionList, TouchableOpacity, StatusBar, Modal, TextInput, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { format, subMonths, addMonths } from 'date-fns';
import { colors } from '../../theme';
import { Transaction } from '../../database/repositories/transactionRepository';
import { useTransactionsStore } from '../../store/slices/transactionsSlice';
import { calculateIncome, calculateExpenses, groupByDate, dailyExpenses, dailyIncome } from '../../utils/calculations';
import { useDisplayCurrency } from '../../hooks/useDisplayCurrency';
import AppIcon from '../../components/common/AppIcon';
import TransactionItem from '../../components/transactions/TransactionItem';
import DateGroupHeader from '../../components/transactions/DateGroupHeader';
import AddTransactionScreen from '../transactions/AddTransactionScreen';
import TransactionDetailScreen from '../transactions/TransactionDetailScreen';
import MonthPickerModal from '../../components/common/MonthPickerModal';

export default function HomeScreen() {
  const { transactions, load, currentMonth, setMonth, isLoading } = useTransactionsStore();
  const { displayAmount } = useDisplayCurrency();
  const [showAdd, setShowAdd] = useState(false);
  const [selectedTx, setSelectedTx] = useState<Transaction | null>(null);
  const [search, setSearch] = useState('');
  const [filterType, setFilterType] = useState<'all' | 'income' | 'expense'>('all');
  const [showMonthPicker, setShowMonthPicker] = useState(false);
  useFocusEffect(useCallback(() => { void load(); }, [load, currentMonth]));
  const income = calculateIncome(transactions), expenses = calculateExpenses(transactions), balance = income - expenses;
  const spentByDay = useMemo(() => dailyExpenses(transactions), [transactions]);
  const incomeByDay = useMemo(() => dailyIncome(transactions), [transactions]);
  const filtered = useMemo(() => transactions.filter(t =>
    (filterType === 'all' || t.type === filterType) &&
    ((t.description ?? '') + ' ' + (t.category_name ?? '')).toLowerCase().includes(search.toLowerCase())
  ), [transactions, filterType, search]);
  const sections = useMemo(() => Object.entries(groupByDate(filtered)).sort(([a], [b]) => b.localeCompare(a)).map(([date, data]) => ({ title: date, data })), [filtered]);
  const navigateMonth = (direction: -1 | 1) => {
    const date = new Date(currentMonth + '-01T12:00:00');
    setMonth(format(direction === -1 ? subMonths(date, 1) : addMonths(date, 1), 'yyyy-MM'));
  };
  return <SafeAreaView style={s.safe} edges={['top']}>
    <StatusBar barStyle="light-content" backgroundColor={colors.bg.primary} />
    <View style={s.header}><Text style={s.title}>MoneyMate</Text></View>
    <SectionList<Transaction>
      sections={sections} keyExtractor={t => String(t.id)} stickySectionHeadersEnabled={false}
      keyboardShouldPersistTaps="handled" keyboardDismissMode="on-drag" showsVerticalScrollIndicator={false} contentContainerStyle={s.list}
      ListHeaderComponent={<View style={s.listHeader}>
        <View style={s.monthRow}>
          <TouchableOpacity accessibilityLabel="Previous month" accessibilityRole="button" onPress={() => navigateMonth(-1)} style={s.navButton}><AppIcon name="chevron-left" size={20} /></TouchableOpacity>
          <TouchableOpacity accessibilityLabel="Choose month" accessibilityRole="button" onPress={() => setShowMonthPicker(true)} style={s.monthButton}>
            <Text style={s.monthText}>{format(new Date(currentMonth + '-01T12:00:00'), 'MMMM yyyy')}</Text><AppIcon name="chevron-down" size={16} />
          </TouchableOpacity>
          <TouchableOpacity accessibilityLabel="Next month" accessibilityRole="button" onPress={() => navigateMonth(1)} style={s.navButton}><AppIcon name="chevron-right" size={20} /></TouchableOpacity>
        </View>
        <View style={[s.balanceCard, balance < 0 && s.negativeCard]}>
          <Text style={s.balanceLabel}>MONTHLY BALANCE</Text>
          <Text style={[s.balanceAmount, balance < 0 && s.negativeAmount]} adjustsFontSizeToFit numberOfLines={1}>{displayAmount(balance)}</Text>
          <View style={s.statsRow}>
            <View style={s.stat}><AppIcon name="arrow-down-left" size={18} color={colors.accent.primary} /><View style={s.statCopy}><Text style={s.statLabel}>Income</Text><Text style={[s.statAmount, s.income]} numberOfLines={1} adjustsFontSizeToFit>{displayAmount(income, 0)}</Text></View></View>
            <View style={s.divider} />
            <View style={s.stat}><AppIcon name="arrow-up-right" size={18} color={colors.accent.primary} /><View style={s.statCopy}><Text style={s.statLabel}>Expenses</Text><Text style={s.statAmount} numberOfLines={1} adjustsFontSizeToFit>{displayAmount(expenses, 0)}</Text></View></View>
          </View>
        </View>
        <View style={s.search}><AppIcon name="search" size={18} color={colors.text.muted} />
          <TextInput accessibilityLabel="Search transactions" style={s.searchInput} value={search} onChangeText={setSearch} placeholder="Search transactions" placeholderTextColor={colors.text.muted} />
          {!!search && <TouchableOpacity accessibilityLabel="Clear search" accessibilityRole="button" onPress={() => setSearch('')} style={s.clear}><AppIcon name="x" size={18} /></TouchableOpacity>}
        </View>
        <View style={s.filters}>{(['all', 'income', 'expense'] as const).map(type => <TouchableOpacity key={type} accessibilityRole="button" accessibilityState={{selected: filterType === type}} style={[s.filter, filterType === type && s.filterActive]} onPress={() => setFilterType(type)}><Text style={[s.filterText, filterType === type && s.filterTextActive]}>{type === 'all' ? 'All' : type === 'income' ? 'Income' : 'Expenses'}</Text></TouchableOpacity>)}</View>
      </View>}
      ListEmptyComponent={isLoading ? <ActivityIndicator style={s.empty} color={colors.accent.primary} /> : <View style={s.empty}>
        <View style={s.emptyIcon}><AppIcon name={search ? 'search' : 'credit-card'} size={32} color={colors.accent.primary} /></View>
        <Text style={s.emptyTitle}>{search || filterType !== 'all' ? 'No matches' : 'No transactions'}</Text>
        <Text style={s.emptyText}>{search || filterType !== 'all' ? 'Try another description, category or filter.' : 'Start with your first income or expense.'}</Text>
      </View>}
      renderSectionHeader={({section}) => <DateGroupHeader date={section.title} label={filterType === 'income' ? 'Received' : 'Spent'} spent={displayAmount((filterType === 'income' ? incomeByDay : spentByDay)[section.title] ?? 0)} />}
      renderItem={({item}) => <TransactionItem transaction={item} onPress={() => setSelectedTx(item)} />}
      renderSectionFooter={() => <View style={s.sectionFooter} />}
    />
    <TouchableOpacity testID="add-transaction-fab" accessibilityLabel="Add transaction" accessibilityRole="button" style={s.fab} onPress={() => setShowAdd(true)} activeOpacity={0.85}><AppIcon name="plus" size={28} color={colors.text.inverse} /></TouchableOpacity>
    <Modal visible={showAdd} animationType="slide" onRequestClose={() => setShowAdd(false)}><AddTransactionScreen onClose={() => { setShowAdd(false); void load(); }} /></Modal>
    <Modal visible={selectedTx !== null} animationType="slide" onRequestClose={() => { setSelectedTx(null); void load(); }}>{selectedTx && <TransactionDetailScreen transaction={selectedTx} onClose={() => { setSelectedTx(null); void load(); }} onDeleted={() => { setSelectedTx(null); void load(); }} onUpdated={() => void load()} />}</Modal>
    <MonthPickerModal visible={showMonthPicker} value={currentMonth} onChange={setMonth} onClose={() => setShowMonthPicker(false)} />
  </SafeAreaView>;
}
const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg.primary },
  header: { paddingHorizontal: 24, paddingTop: 20, paddingBottom: 20 },
  title: { fontSize: 28, fontWeight: '700', letterSpacing: -0.6, color: colors.text.primary },
  list: { paddingHorizontal: 24, paddingBottom: 100 },
  listHeader: { gap: 16, paddingBottom: 12 },
  monthRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  navButton: { width: 44, height: 44, borderRadius: 12, backgroundColor: colors.bg.secondary, alignItems: 'center', justifyContent: 'center' },
  monthButton: { flexDirection: 'row', gap: 8, minHeight: 44, alignItems: 'center', justifyContent: 'center', flex: 1 },
  monthText: { fontSize: 14, fontWeight: '600', color: colors.text.primary },
  balanceCard: { backgroundColor: colors.bg.balance, borderWidth: 1, borderColor: colors.border.accent, borderRadius: 16, padding: 20 },
  negativeCard: { backgroundColor: colors.bg.negative, borderColor: colors.expense + '50' },
  balanceLabel: { fontSize: 11, letterSpacing: 1.1, fontWeight: '600', color: colors.text.secondary },
  balanceAmount: { fontSize: 36, fontWeight: '700', color: colors.text.primary, letterSpacing: -1.1, marginTop: 6, marginBottom: 16, fontVariant: ['tabular-nums'] },
  negativeAmount: { color: colors.expense },
  statsRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  stat: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 8, minWidth: 0 },
  statCopy: { flex: 1, minWidth: 0 },
  statLabel: { fontSize: 12, color: colors.text.secondary, marginBottom: 2 },
  statAmount: { fontSize: 13, fontWeight: '600', color: colors.text.primary, fontVariant: ['tabular-nums'] },
  income: { color: colors.income },
  divider: { width: 1, height: 36, backgroundColor: colors.border.default },
  search: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: colors.bg.secondary, borderWidth: 1, borderColor: colors.border.default, borderRadius: 12, paddingHorizontal: 12, minHeight: 48 },
  searchInput: { flex: 1, minWidth: 0, fontSize: 14, color: colors.text.primary, paddingVertical: 12 },
  clear: { minWidth: 32, minHeight: 44, alignItems: 'center', justifyContent: 'center' },
  filters: { flexDirection: 'row', gap: 6, padding: 4, backgroundColor: colors.bg.secondary, borderRadius: 12 },
  filter: { flex: 1, minHeight: 40, borderRadius: 9, alignItems: 'center', justifyContent: 'center' },
  filterActive: { backgroundColor: colors.accent.muted },
  filterText: { fontSize: 12, fontWeight: '600', color: colors.text.secondary },
  filterTextActive: { color: colors.accent.primary },
  sectionFooter: { height: 8 },
  empty: { alignItems: 'center', gap: 16, paddingVertical: 48 },
  emptyIcon: { width: 72, height: 72, borderRadius: 20, backgroundColor: colors.accent.muted, alignItems: 'center', justifyContent: 'center' },
  emptyTitle: { fontSize: 20, fontWeight: '700', color: colors.text.primary },
  emptyText: { fontSize: 13, color: colors.text.secondary, textAlign: 'center' },
  fab: { position: 'absolute', right: 24, bottom: 20, width: 56, height: 56, borderRadius: 18, backgroundColor: colors.accent.primary, alignItems: 'center', justifyContent: 'center', elevation: 6, shadowColor: colors.bg.primary, shadowOpacity: 0.3, shadowRadius: 12, shadowOffset: { width: 0, height: 6 } },
});
