import React, { useEffect, useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  StatusBar, Modal, TextInput,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors } from '../../theme';
import { Transaction } from '../../database/repositories/transactionRepository';
import { useTransactionsStore } from '../../store/slices/transactionsSlice';
import { useSettingsStore } from '../../store/slices/settingsSlice';
import { formatCurrency } from '../../utils/formatCurrency';
import { calculateIncome, calculateExpenses, groupByDate } from '../../utils/calculations';
import { formatDate } from '../../utils/formatDate';
import AddTransactionScreen from '../transactions/AddTransactionScreen';
import TransactionDetailScreen from '../transactions/TransactionDetailScreen';
import MonthPickerModal from '../../components/common/MonthPickerModal';
import { format, subMonths, addMonths } from 'date-fns';

export default function HomeScreen() {
  const { transactions, load, currentMonth, setMonth } = useTransactionsStore();
  const { currency } = useSettingsStore();

  const [showAdd, setShowAdd]                 = useState(false);
  const [selectedTx, setSelectedTx]           = useState<Transaction | null>(null);
  const [search, setSearch]                   = useState('');
  const [filterType, setFilterType]           = useState<'all' | 'income' | 'expense'>('all');
  const [showMonthPicker, setShowMonthPicker] = useState(false);

  useEffect(() => { load(); }, [currentMonth]);

  const reload = useCallback(() => { load(); }, [currentMonth]);

  const income     = calculateIncome(transactions);
  const expenses   = calculateExpenses(transactions);
  const balance    = income - expenses;
  const isNegative = balance < 0;

  const filtered = transactions.filter(t => {
    if (filterType !== 'all' && t.type !== filterType) return false;
    if (search) {
      const q = search.toLowerCase();
      if (!((t.description ?? '') + (t.category_name ?? '')).toLowerCase().includes(q)) return false;
    }
    return true;
  });

  const grouped  = groupByDate(filtered);
  const sections = Object.entries(grouped).sort(([a], [b]) => b.localeCompare(a));

  const navigateMonth = (dir: -1 | 1) => {
    const d    = new Date(currentMonth + '-01');
    const next = dir === -1 ? subMonths(d, 1) : addMonths(d, 1);
    setMonth(format(next, 'yyyy-MM'));
  };

  const monthLabel = format(new Date(currentMonth + '-01'), 'MMMM yyyy');

  const ListHeader = (
    <View style={s.listHeader}>
      <View style={[s.balanceCard, isNegative && s.balanceCardNeg]}>
        <View style={s.balanceGlow} />
        <Text style={s.balanceLabel}>MONTHLY BALANCE</Text>
        <Text style={[s.balanceAmount, { color: isNegative ? colors.expense : colors.text.primary }]}>
          {isNegative ? '-' : ''}{formatCurrency(balance, currency, 0)}
        </Text>
        <View style={s.statsRow}>
          <View style={s.statItem}>
            <Text style={s.statArrow}>↑</Text>
            <View>
              <Text style={s.statLabel}>Income</Text>
              <Text style={[s.statValue, { color: colors.income }]}>{formatCurrency(income, currency, 0)}</Text>
            </View>
          </View>
          <View style={s.statDivider} />
          <View style={s.statItem}>
            <Text style={s.statArrow}>↓</Text>
            <View>
              <Text style={s.statLabel}>Expenses</Text>
              <Text style={[s.statValue, { color: colors.expense }]}>{formatCurrency(expenses, currency, 0)}</Text>
            </View>
          </View>
        </View>
      </View>

      <View style={s.searchWrap}>
        <Text style={s.searchIcon}>🔍</Text>
        <TextInput
          style={s.searchInput}
          value={search}
          onChangeText={setSearch}
          placeholder="Search transactions..."
          placeholderTextColor={colors.text.muted}
        />
        {search.length > 0 && (
          <TouchableOpacity onPress={() => setSearch('')}>
            <Text style={s.clearSearch}>✕</Text>
          </TouchableOpacity>
        )}
      </View>

      <View style={s.filterRow}>
        {(['all', 'income', 'expense'] as const).map(f => (
          <TouchableOpacity
            key={f}
            style={[s.filterChip, filterType === f && s.filterChipActive]}
            onPress={() => setFilterType(f)}
          >
            <Text style={[s.filterChipText, filterType === f && s.filterChipTextActive]}>
              {f === 'all' ? 'All' : f === 'income' ? '↑ Income' : '↓ Expenses'}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );

  const ListEmpty = (
    <View style={s.emptyWrap}>
      <Text style={s.emptyEmoji}>💳</Text>
      <Text style={s.emptyTitle}>No transactions</Text>
      <Text style={s.emptyDesc}>Tap + to add your first transaction.</Text>
    </View>
  );

  return (
    <SafeAreaView style={s.safe} edges={['top']}>
      <StatusBar barStyle="light-content" backgroundColor={colors.bg.primary} />

      <View style={s.topBar}>
        <TouchableOpacity onPress={() => navigateMonth(-1)} style={s.navBtn}>
          <Text style={s.navArrow}>‹</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={() => setShowMonthPicker(true)} style={s.monthBtn}>
          <Text style={s.monthText}>{monthLabel}</Text>
          <Text style={s.monthChevron}> ▾</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={() => navigateMonth(1)} style={s.navBtn}>
          <Text style={s.navArrow}>›</Text>
        </TouchableOpacity>
      </View>

      <FlatList
        data={sections}
        keyExtractor={([date]) => date}
        ListHeaderComponent={ListHeader}
        ListEmptyComponent={ListEmpty}
        contentContainerStyle={s.list}
        showsVerticalScrollIndicator={false}
        renderItem={({ item: [date, txs] }) => (
          <View style={s.group}>
            <Text style={s.dateLabel}>{formatDate(date)}</Text>
            {txs.map(t => (
              <TouchableOpacity key={t.id} onPress={() => setSelectedTx(t)} activeOpacity={0.75}>
                <View style={s.txItem}>
                  <View style={[s.txIcon, { backgroundColor: (t.category_color ?? '#666') + '26' }]}>
                    <Text style={s.txEmoji}>{t.category_icon ?? '💰'}</Text>
                  </View>
                  <View style={s.txInfo}>
                    <Text style={s.txName} numberOfLines={1}>{t.description || t.category_name}</Text>
                    <Text style={s.txCat}>{t.category_name}</Text>
                  </View>
                  <View style={s.txRight}>
                    <Text style={[s.txAmount, { color: t.type === 'income' ? colors.income : colors.expense }]}>
                      {t.type === 'income' ? '+' : '-'}{formatCurrency(t.amount_ron, '', 2)}
                    </Text>
                    <Text style={s.txCurrency}>{t.currency_code}</Text>
                  </View>
                </View>
              </TouchableOpacity>
            ))}
          </View>
        )}
      />

      <TouchableOpacity style={s.fab} onPress={() => setShowAdd(true)} activeOpacity={0.85}>
        <Text style={s.fabText}>+</Text>
      </TouchableOpacity>

      <Modal visible={showAdd} animationType="slide" transparent onRequestClose={() => setShowAdd(false)}>
        <AddTransactionScreen onClose={() => { setShowAdd(false); reload(); }} />
      </Modal>

      <Modal visible={selectedTx !== null} animationType="slide" transparent={false} onRequestClose={() => setSelectedTx(null)}>
        {selectedTx !== null && (
          <TransactionDetailScreen
            transaction={selectedTx}
            onClose={() => { setSelectedTx(null); reload(); }}
            onDeleted={() => { setSelectedTx(null); reload(); }}
          />
        )}
      </Modal>

      <MonthPickerModal
        visible={showMonthPicker}
        value={currentMonth}
        onChange={setMonth}
        onClose={() => setShowMonthPicker(false)}
      />
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg.primary },
  list: { paddingBottom: 100 },

  topBar:       { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 8, paddingVertical: 4, borderBottomWidth: 1, borderBottomColor: colors.border.default },
  navBtn:       { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  navArrow:     { fontSize: 26, color: colors.text.secondary, fontWeight: '300' },
  monthBtn:     { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center' },
  monthText:    { fontSize: 15, fontWeight: '600', color: colors.text.primary },
  monthChevron: { fontSize: 11, color: colors.text.secondary },

  listHeader: { padding: 12, gap: 12 },

  balanceCard: {
    backgroundColor: '#0F2027', borderRadius: 16, padding: 16,
    borderWidth: 1, borderColor: 'rgba(0,212,170,0.2)',
    overflow: 'hidden', position: 'relative',
  },
  balanceCardNeg:  { borderColor: 'rgba(248,113,113,0.45)', backgroundColor: '#180A0A' },
  balanceGlow:     { position: 'absolute', top: -30, right: -30, width: 80, height: 80, borderRadius: 40, backgroundColor: 'rgba(0,212,170,0.08)' },
  balanceLabel:    { fontSize: 9, color: colors.text.secondary, letterSpacing: 0.5, marginBottom: 4 },
  balanceAmount:   { fontSize: 34, fontWeight: '700', letterSpacing: -0.5, marginBottom: 12 },
  statsRow:        { flexDirection: 'row', borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.07)', paddingTop: 12 },
  statItem:        { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 8 },
  statArrow:       { fontSize: 18, color: colors.text.muted },
  statLabel:       { fontSize: 10, color: colors.text.secondary },
  statValue:       { fontSize: 15, fontWeight: '600', marginTop: 1 },
  statDivider:     { width: 1, backgroundColor: 'rgba(255,255,255,0.07)', marginHorizontal: 12 },

  searchWrap:           { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.bg.secondary, borderRadius: 10, borderWidth: 1, borderColor: colors.border.default, paddingHorizontal: 10, height: 40 },
  searchIcon:           { fontSize: 13, marginRight: 6 },
  searchInput:          { flex: 1, color: colors.text.primary, fontSize: 13 },
  clearSearch:          { color: colors.text.muted, fontSize: 16, paddingHorizontal: 4 },
  filterRow:            { flexDirection: 'row', gap: 6 },
  filterChip:           { paddingHorizontal: 12, paddingVertical: 5, borderRadius: 6, borderWidth: 1, borderColor: colors.border.default, backgroundColor: colors.bg.secondary },
  filterChipActive:     { borderColor: 'rgba(0,212,170,0.4)', backgroundColor: 'rgba(0,212,170,0.12)' },
  filterChipText:       { fontSize: 11, fontWeight: '500', color: colors.text.muted },
  filterChipTextActive: { color: colors.accent.primary },

  group:      { paddingHorizontal: 12, marginBottom: 12 },
  dateLabel:  { fontSize: 9, fontWeight: '600', color: colors.text.muted, letterSpacing: 0.5, marginBottom: 5, textTransform: 'uppercase' },
  txItem:     { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: 'rgba(30,38,64,0.5)' },
  txIcon:     { width: 36, height: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  txEmoji:    { fontSize: 17 },
  txInfo:     { flex: 1, minWidth: 0 },
  txName:     { fontSize: 13, fontWeight: '500', color: colors.text.primary },
  txCat:      { fontSize: 10, color: colors.text.muted, marginTop: 1 },
  txRight:    { alignItems: 'flex-end' },
  txAmount:   { fontSize: 13, fontWeight: '600' },
  txCurrency: { fontSize: 9, color: colors.text.muted, marginTop: 1 },

  emptyWrap:  { alignItems: 'center', paddingVertical: 48, gap: 8 },
  emptyEmoji: { fontSize: 40 },
  emptyTitle: { fontSize: 16, fontWeight: '600', color: colors.text.primary },
  emptyDesc:  { fontSize: 13, color: colors.text.secondary },

  fab: {
    position: 'absolute', bottom: 16, right: 16,
    width: 54, height: 54, borderRadius: 27,
    backgroundColor: colors.accent.primary,
    alignItems: 'center', justifyContent: 'center',
    shadowColor: colors.accent.primary, shadowOpacity: 0.45,
    shadowRadius: 16, shadowOffset: { width: 0, height: 4 },
    elevation: 8,
  },
  fabText: { fontSize: 28, color: colors.bg.primary, fontWeight: '300', lineHeight: 32 },
});
