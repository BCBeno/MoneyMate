import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Modal,
  TextInput,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors } from '../../theme';
import { Transaction } from '../../database/repositories/transactionRepository';
import { useTransactionsStore } from '../../store/slices/transactionsSlice';
import { formatCurrency } from '../../utils/formatCurrency';
import { formatDate } from '../../utils/formatDate';
import { groupByDate } from '../../utils/calculations';
import EmptyState from '../../components/common/EmptyState';
import AddTransactionScreen from './AddTransactionScreen';
import TransactionDetailScreen from './TransactionDetailScreen';
import { format, subMonths, addMonths } from 'date-fns';
import { enUS } from 'date-fns/locale';

export default function TransactionsScreen() {
  const { transactions, load, currentMonth, setMonth } = useTransactionsStore();
  const [showAdd, setShowAdd]             = useState(false);
  const [selectedTx, setSelectedTx]       = useState<Transaction | null>(null);
  const [search, setSearch]               = useState('');
  const [filterType, setFilterType]       = useState<'all' | 'income' | 'expense'>('all');

  useEffect(() => { load(); }, [currentMonth]);

  const filtered = transactions.filter(t => {
    if (filterType !== 'all' && t.type !== filterType) return false;
    if (search) {
      const q = search.toLowerCase();
      if (
        !((t.description ?? '') + (t.category_name ?? ''))
          .toLowerCase()
          .includes(q)
      ) return false;
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

  return (
    <SafeAreaView style={s.safe} edges={['top']}>
      {/* Header */}
      <View style={s.header}>
        <Text style={s.screenLabel}>TRANSACTIONS</Text>
        <TouchableOpacity style={s.addBtn} onPress={() => setShowAdd(true)}>
          <Text style={s.addBtnText}>+ Add</Text>
        </TouchableOpacity>
      </View>

      {/* Month navigator */}
      <View style={s.monthNav}>
        <TouchableOpacity onPress={() => navigateMonth(-1)} style={s.navBtn}>
          <Text style={s.navArrow}>‹</Text>
        </TouchableOpacity>
        <Text style={s.monthText}>
          {format(new Date(currentMonth + '-01'), 'MMMM yyyy', { locale: enUS })}
        </Text>
        <TouchableOpacity onPress={() => navigateMonth(1)} style={s.navBtn}>
          <Text style={s.navArrow}>›</Text>
        </TouchableOpacity>
      </View>

      {/* Search */}
      <View style={s.searchWrap}>
        <Text style={s.searchIcon}>🔍</Text>
        <TextInput
          style={s.searchInput}
          value={search}
          onChangeText={setSearch}
          placeholder="Search..."
          placeholderTextColor={colors.text.muted}
        />
        {search.length > 0 && (
          <TouchableOpacity onPress={() => setSearch('')}>
            <Text style={s.clearSearch}>✕</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Filter chips */}
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

      {/* List */}
      {sections.length === 0 ? (
        <EmptyState
          emoji="💳"
          title="No transactions"
          description="Tap + Add to create your first transaction."
          actionLabel="+ Add"
          onAction={() => setShowAdd(true)}
        />
      ) : (
        <FlatList
          data={sections}
          keyExtractor={([date]) => date}
          contentContainerStyle={s.list}
          showsVerticalScrollIndicator={false}
          renderItem={({ item: [date, txs] }) => (
            <View style={s.group}>
              <Text style={s.dateLabel}>{formatDate(date)}</Text>
              {txs.map(t => (
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
                        {t.description || t.category_name}
                      </Text>
                      <Text style={s.txCat}>{t.category_name}</Text>
                    </View>
                    <View style={s.txRight}>
                      <Text style={[s.txAmount, { color: t.type === 'income' ? colors.income : colors.expense }]}>
                        {t.type === 'income' ? '+' : '-'}
                        {formatCurrency(t.amount_ron, '', 0)} {t.currency_code}
                      </Text>
                    </View>
                  </View>
                </TouchableOpacity>
              ))}
            </View>
          )}
        />
      )}

      {/* Add transaction modal */}
      <Modal
        visible={showAdd}
        animationType="slide"
        transparent
        onRequestClose={() => setShowAdd(false)}
      >
        <AddTransactionScreen
          onClose={() => { setShowAdd(false); load(); }}
        />
      </Modal>

      {/* Transaction detail / edit modal */}
      <Modal
        visible={selectedTx !== null}
        animationType="slide"
        transparent={false}
        onRequestClose={() => setSelectedTx(null)}
      >
        {selectedTx !== null && (
          <TransactionDetailScreen
            transaction={selectedTx}
            onClose={() => { setSelectedTx(null); load(); }}
            onDeleted={() => { setSelectedTx(null); load(); }}
          />
        )}
      </Modal>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe:        { flex: 1, backgroundColor: colors.bg.primary },

  header:      { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 12, paddingTop: 12, paddingBottom: 4 },
  screenLabel: { fontSize: 9, color: colors.accent.primary, textTransform: 'uppercase', letterSpacing: 1.2, opacity: 0.85 },
  addBtn:      { backgroundColor: colors.accent.primary, paddingHorizontal: 12, paddingVertical: 5, borderRadius: 6 },
  addBtnText:  { color: colors.bg.primary, fontWeight: '700', fontSize: 11 },

  monthNav:  { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 6, gap: 20 },
  navBtn:    { padding: 6 },
  navArrow:  { fontSize: 22, color: colors.text.secondary },
  monthText: { fontSize: 14, fontWeight: '600', color: colors.text.primary },

  searchWrap:  { flexDirection: 'row', alignItems: 'center', marginHorizontal: 12, marginBottom: 6, backgroundColor: colors.bg.secondary, borderRadius: 8, borderWidth: 1, borderColor: colors.border.default, paddingHorizontal: 10, height: 38 },
  searchIcon:  { fontSize: 13, marginRight: 6 },
  searchInput: { flex: 1, color: colors.text.primary, fontSize: 13 },
  clearSearch: { color: colors.text.muted, fontSize: 16, paddingHorizontal: 4 },

  filterRow:            { flexDirection: 'row', paddingHorizontal: 12, gap: 6, marginBottom: 8 },
  filterChip:           { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 5, borderWidth: 1, borderColor: colors.border.default, backgroundColor: colors.bg.secondary },
  filterChipActive:     { borderColor: 'rgba(0,212,170,0.4)', backgroundColor: 'rgba(0,212,170,0.12)' },
  filterChipText:       { fontSize: 11, fontWeight: '500', color: colors.text.muted },
  filterChipTextActive: { color: colors.accent.primary },

  list:      { paddingHorizontal: 12, paddingBottom: 100 },
  group:     { marginBottom: 12 },
  dateLabel: { fontSize: 9, fontWeight: '600', color: colors.text.muted, letterSpacing: 0.5, marginBottom: 4, textTransform: 'uppercase' },

  txItem:  { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: 'rgba(30,38,64,0.5)' },
  txIcon:  { width: 36, height: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  txEmoji: { fontSize: 16 },
  txInfo:  { flex: 1, minWidth: 0 },
  txName:  { fontSize: 13, fontWeight: '500', color: colors.text.primary },
  txCat:   { fontSize: 10, color: colors.text.muted, marginTop: 1 },
  txRight: { alignItems: 'flex-end' },
  txAmount:{ fontSize: 13, fontWeight: '600' },
});
