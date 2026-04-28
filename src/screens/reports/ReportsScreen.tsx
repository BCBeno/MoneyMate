import React, { useState, useCallback, useEffect } from 'react';
import {
  View, Text, StyleSheet, ScrollView, FlatList,
  TouchableOpacity, Dimensions, Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import Svg, { Rect, Line, Text as SvgText, Circle, Path, G } from 'react-native-svg';
import { colors } from '../../theme';
import {
  Transaction, getTransactions, getStatsInRange,
} from '../../database/repositories/transactionRepository';
import { getCategories } from '../../database/repositories/categoryRepository';
import {
  calculateIncome, calculateExpenses, groupByCategory, groupByDate,
} from '../../utils/calculations';
import { formatCurrency } from '../../utils/formatCurrency';
import { formatDate } from '../../utils/formatDate';
import { format } from 'date-fns';
import TransactionDetailScreen from '../transactions/TransactionDetailScreen';
import MonthPickerModal from '../../components/common/MonthPickerModal';

type Period = '1L' | '3L' | '1An';

const SCREEN_W = Dimensions.get('window').width;
const CHART_W  = SCREEN_W - 48;

// ── Pure JS date helpers — avoids date-fns timezone issues in RN ──────────────
function getPeriodRange(period: Period): { dateFrom: string; dateTo: string } {
  const now   = new Date();
  const y     = now.getFullYear();
  const m     = now.getMonth();       // 0-based

  const pad     = (n: number) => String(n).padStart(2, '0');
  // last day of month: day-0 trick
  const lastDay = (yr: number, mo: number) => new Date(yr, mo + 1, 0).getDate();

  // End is always last day of current month
  const toStr = `${y}-${pad(m + 1)}-${pad(lastDay(y, m))}`;

  switch (period) {
    case '1L': {
      return { dateFrom: `${y}-${pad(m + 1)}-01`, dateTo: toStr };
    }
    case '3L': {
      let fy = y, fm = m - 2;
      if (fm < 0) { fm += 12; fy -= 1; }
      return { dateFrom: `${fy}-${pad(fm + 1)}-01`, dateTo: toStr };
    }
    case '1An': {
      let fy = y, fm = m - 11;
      if (fm < 0) { fm += 12; fy -= 1; }
      return { dateFrom: `${fy}-${pad(fm + 1)}-01`, dateTo: toStr };
    }
  }
}

function getMonthRange(month: string): { dateFrom: string; dateTo: string } {
  const [yearStr, monthStr] = month.split('-');
  const year = parseInt(yearStr, 10);
  const monthIndex = parseInt(monthStr, 10) - 1;
  const pad = (n: number) => String(n).padStart(2, '0');
  const lastDay = new Date(year, monthIndex + 1, 0).getDate();

  return {
    dateFrom: `${year}-${pad(monthIndex + 1)}-01`,
    dateTo: `${year}-${pad(monthIndex + 1)}-${pad(lastDay)}`,
  };
}

// ── Bar chart ─────────────────────────────────────────────────────────────────
function BarChart({ stats }: { stats: { month: string; income: number; expenses: number }[] }) {
  if (stats.length === 0) return null;

  const H = 160, PL = 8, PR = 8, PT = 16, PB = 28;
  const cH   = H - PT - PB;
  const maxV = Math.max(...stats.flatMap(d => [d.income, d.expenses]), 1);
  const colW = (CHART_W - PL - PR) / stats.length;
  const GAP  = 2;
  const bW   = Math.max(4, (colW - GAP * 3) / 2);

  return (
    <Svg width={CHART_W} height={H}>
      {[0, 0.5, 1].map((p, i) => (
        <Line key={i} x1={PL} y1={PT + cH * (1 - p)} x2={CHART_W - PR} y2={PT + cH * (1 - p)}
          stroke={colors.border.default} strokeWidth={0.5} strokeDasharray="3 4" />
      ))}
      {stats.map((d, i) => {
        const gx  = PL + i * colW + GAP;
        const iH  = Math.max(3, (d.income   / maxV) * cH);
        const eH  = Math.max(3, (d.expenses / maxV) * cH);
        let lbl = '';
        try { lbl = format(new Date(d.month + '-15'), stats.length > 6 ? 'MM/yy' : 'MMM'); } catch {}
        return (
          <G key={i}>
            <Rect x={gx}          y={PT + cH - iH} width={bW} height={iH} rx={3} fill={colors.income}  opacity={0.85} />
            <Rect x={gx + bW + GAP} y={PT + cH - eH} width={bW} height={eH} rx={3} fill={colors.expense} opacity={0.85} />
            <SvgText x={gx + bW + GAP / 2} y={H - 6} textAnchor="middle" fontSize={stats.length > 8 ? 7 : 8} fill={colors.text.muted}>{lbl}</SvgText>
          </G>
        );
      })}
    </Svg>
  );
}

// ── Donut chart ───────────────────────────────────────────────────────────────
function DonutChart({ data }: { data: { color: string; pct: number }[] }) {
  const CX = 55, CY = 55, R = 40, STR = 18;
  let off = -90;
  const arcs = data.map(item => {
    const deg = item.pct * 3.6;
    if (deg >= 359.99) {
      off += deg;
      return { full: true as const, color: item.color };
    }
    if (deg < 1) { off += deg; return null; }
    const sr = (off * Math.PI) / 180;
    const er = ((off + deg) * Math.PI) / 180;
    const path = `M ${(CX + R * Math.cos(sr)).toFixed(2)} ${(CY + R * Math.sin(sr)).toFixed(2)} A ${R} ${R} 0 ${deg > 180 ? 1 : 0} 1 ${(CX + R * Math.cos(er)).toFixed(2)} ${(CY + R * Math.sin(er)).toFixed(2)}`;
    off += deg;
    return { full: false as const, path, color: item.color };
  });
  return (
    <Svg width={110} height={110}>
      <Circle cx={CX} cy={CY} r={R} fill="none" stroke={colors.bg.elevated} strokeWidth={STR} />
      {arcs.map((a, i) => {
        if (!a) return null;
        if (a.full) {
          return <Circle key={i} cx={CX} cy={CY} r={R} fill="none" stroke={a.color} strokeWidth={STR} />;
        }
        return <Path key={i} d={a.path} fill="none" stroke={a.color} strokeWidth={STR} strokeLinecap="butt" />;
      })}
    </Svg>
  );
}

// ── Category drill-down modal ─────────────────────────────────────────────────
interface CatFilter { categoryId: number; categoryName: string; categoryIcon: string; dateFrom: string; dateTo: string; }

function CategoryModal({ filter, onClose, onDataChanged }: { filter: CatFilter; onClose: () => void; onDataChanged: () => void }) {
  const [txs, setTxs]         = useState<Transaction[]>([]);
  const [selected, setSelected] = useState<Transaction | null>(null);

  const loadCategoryTransactions = useCallback(async () => {
    try {
      const items = await getTransactions({
        dateFrom: filter.dateFrom,
        dateTo: filter.dateTo,
        category_id: filter.categoryId,
      });
      setTxs(items);
    } catch (e) {
      console.error(e);
    }
  }, [filter.categoryId, filter.dateFrom, filter.dateTo]);

  useEffect(() => {
    loadCategoryTransactions();
  }, [loadCategoryTransactions]);

  const sections = Object.entries(groupByDate(txs)).sort(([a], [b]) => b.localeCompare(a));

  return (
    <SafeAreaView style={cm.container} edges={['top', 'bottom']}>
      <View style={cm.header}>
        <TouchableOpacity onPress={onClose} style={cm.backBtn}><Text style={cm.backText}>‹ Back</Text></TouchableOpacity>
        <View style={cm.center}>
          <Text style={cm.icon}>{filter.categoryIcon}</Text>
          <Text style={cm.title} numberOfLines={1}>{filter.categoryName}</Text>
        </View>
        <View style={{ width: 72 }} />
      </View>
      {txs.length === 0
        ? <View style={cm.empty}><Text style={cm.emptyText}>No transactions</Text></View>
        : <FlatList data={sections} keyExtractor={([d]) => d} contentContainerStyle={cm.list}
            renderItem={({ item: [date, items] }) => (
              <View style={cm.group}>
                <Text style={cm.dateLabel}>{formatDate(date)}</Text>
                {items.map(t => (
                  <TouchableOpacity key={t.id} style={cm.row} onPress={() => setSelected(t)} activeOpacity={0.75}>
                    <View style={cm.info}>
                      <Text style={cm.name} numberOfLines={1}>{t.description || t.category_name}</Text>
                      <Text style={cm.date}>{formatDate(t.date)}</Text>
                    </View>
                    <Text style={[cm.amount, { color: t.type === 'income' ? colors.income : colors.expense }]}>
                      {t.type === 'income' ? '+' : '-'}{formatCurrency(t.amount_ron, 'RON', 2)}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            )} />
      }
      <Modal
        visible={selected !== null}
        animationType="slide"
        transparent={false}
        onRequestClose={() => {
          setSelected(null);
          loadCategoryTransactions();
          onDataChanged();
        }}
      >
        {selected !== null && (
          <TransactionDetailScreen
            transaction={selected}
            onClose={() => {
              setSelected(null);
              loadCategoryTransactions();
              onDataChanged();
            }}
            onDeleted={() => {
              setSelected(null);
              loadCategoryTransactions();
              onDataChanged();
            }}
            onUpdated={() => {
              loadCategoryTransactions();
              onDataChanged();
            }}
          />
        )}
      </Modal>
    </SafeAreaView>
  );
}

const cm = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg.primary },
  header:    { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: colors.border.default },
  backBtn:   { minWidth: 72 },
  backText:  { fontSize: 14, color: colors.accent.primary },
  center:    { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6 },
  icon:      { fontSize: 18 },
  title:     { fontSize: 15, fontWeight: '600', color: colors.text.primary },
  list:      { padding: 12, paddingBottom: 40 },
  group:     { marginBottom: 12 },
  dateLabel: { fontSize: 10, fontWeight: '600', color: colors.text.muted, letterSpacing: 0.5, textTransform: 'uppercase', marginBottom: 4 },
  row:       { flexDirection: 'row', alignItems: 'center', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: 'rgba(30,38,64,0.5)' },
  info:      { flex: 1 },
  name:      { fontSize: 13, fontWeight: '500', color: colors.text.primary },
  date:      { fontSize: 10, color: colors.text.muted, marginTop: 1 },
  amount:    { fontSize: 13, fontWeight: '600' },
  empty:     { flex: 1, alignItems: 'center', justifyContent: 'center' },
  emptyText: { fontSize: 14, color: colors.text.muted },
});

// ── Main screen ───────────────────────────────────────────────────────────────
export default function ReportsScreen() {
  const [period, setPeriod]       = useState<Period>('1L');
  const [transactions, setTxs]    = useState<any[]>([]);
  const [pieTransactions, setPieTransactions] = useState<any[]>([]);
  const [stats, setStats]         = useState<{ month: string; income: number; expenses: number }[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [catFilter, setCatFilter] = useState<CatFilter | null>(null);
  const [selectedPieMonth, setSelectedPieMonth] = useState(() => format(new Date(), 'yyyy-MM'));
  const [isMonthPickerVisible, setMonthPickerVisible] = useState(false);
  const [loading, setLoading]     = useState(false);

  const loadDate = useCallback(async () => {
    setLoading(true);
    try {
      const { dateFrom, dateTo } = getPeriodRange(period);
      const [txs, s, cats] = await Promise.all([
        getTransactions({ dateFrom, dateTo }),
        getStatsInRange(dateFrom, dateTo),
        getCategories(),
      ]);
      setTxs(txs);
      setStats(s);
      setCategories(cats);
    } catch (e) {
      console.error('ReportsScreen:', e);
    } finally {
      setLoading(false);
    }
  }, [period]);

  useFocusEffect(
    useCallback(() => {
      loadDate();
    }, [loadDate])
  );

  const loadPieMonthData = useCallback(async () => {
    try {
      const txs = await getTransactions({ month: selectedPieMonth });
      setPieTransactions(txs);
    } catch (e) {
      console.error('Reports pie month load error:', e);
    }
  }, [selectedPieMonth]);

  useFocusEffect(
    useCallback(() => {
      loadPieMonthData();
    }, [loadPieMonthData])
  );

  const income   = calculateIncome(transactions);
  const expenses = calculateExpenses(transactions);

  const catDate = Object.entries(groupByCategory(pieTransactions))
    .map(([id, amount]) => {
      const cat = categories.find(c => c.id === parseInt(id, 10));
      return { id: parseInt(id, 10), name: cat?.name ?? 'Other', icon: cat?.icon ?? '💰', color: cat?.color ?? '#666', amount: amount as number };
    })
    .sort((a, b) => b.amount - a.amount)
    .slice(0, 8);

  const totalCat   = catDate.reduce((s, c) => s + c.amount, 0);
  const catWithPct = catDate.map(c => ({ ...c, pct: totalCat > 0 ? (c.amount / totalCat) * 100 : 0 }));

  const { dateFrom, dateTo } = getMonthRange(selectedPieMonth);
  const pieMonthLabel = format(new Date(`${selectedPieMonth}-15`), 'MMMM yyyy');

  return (
    <SafeAreaView style={s.safe} edges={['top']}>
      <ScrollView contentContainerStyle={s.content} showsVerticalScrollIndicator={false}>
        <Text style={s.screenLabel}>Reports</Text>

        {/* Period tabs */}
        <View style={s.periodRow}>
          {(['1L', '3L', '1An'] as Period[]).map(p => (
            <TouchableOpacity key={p} style={[s.periodTab, period === p && s.periodTabActive]} onPress={() => setPeriod(p)}>
              <Text style={[s.periodTabText, period === p && s.periodTabTextActive]}>
                {p === '1L' ? '1 month' : p === '3L' ? '3 months' : '1 year'}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Summary cards */}
        <View style={s.summaryRow}>
          <View style={[s.sumCard, { borderColor: colors.income + '44' }]}>
            <Text style={s.sumLabel}>Income</Text>
            <Text style={[s.sumVal, { color: colors.income }]}>{formatCurrency(income, 'RON', 0)}</Text>
          </View>
          <View style={[s.sumCard, { borderColor: colors.expense + '44' }]}>
            <Text style={s.sumLabel}>Expenses</Text>
            <Text style={[s.sumVal, { color: colors.expense }]}>{formatCurrency(expenses, 'RON', 0)}</Text>
          </View>
        </View>

        {loading && <Text style={s.loading}>Loading...</Text>}

        {/* Bar chart */}
        {stats.length > 0 && (
          <View style={s.card}>
            <Text style={s.cardTitle}>Income vs Expenses</Text>
            <BarChart stats={stats} />
            <View style={s.legend}>
              <View style={s.legendItem}><View style={[s.dot, { backgroundColor: colors.income }]} /><Text style={s.legendText}>Income</Text></View>
              <View style={s.legendItem}><View style={[s.dot, { backgroundColor: colors.expense }]} /><Text style={s.legendText}>Expenses</Text></View>
            </View>
          </View>
        )}

        {/* Donut + category breakdown */}
        <View style={s.card}>
          <View style={s.cardHeaderRow}>
            <Text style={s.cardTitle}>Expenses by Category</Text>
            <TouchableOpacity
              style={s.monthFilterBtn}
              onPress={() => setMonthPickerVisible(true)}
              activeOpacity={0.8}
            >
              <Text style={s.monthFilterText}>{pieMonthLabel}</Text>
            </TouchableOpacity>
          </View>
          {catWithPct.length === 0 ? (
            <View style={s.pieEmpty}>
              <Text style={s.emptyText}>No expenses for this month</Text>
            </View>
          ) : (
            <>
              <View style={s.donutRow}>
                <DonutChart data={catWithPct} />
                <View style={s.donutLegend}>
                  {catWithPct.map((c, i) => (
                    <TouchableOpacity key={i} style={s.donutItem}
                      onPress={() => setCatFilter({ categoryId: c.id, categoryName: c.name, categoryIcon: c.icon, dateFrom, dateTo })}
                      activeOpacity={0.7}>
                      <View style={[s.dot, { backgroundColor: c.color }]} />
                      <Text style={s.donutText} numberOfLines={1}>{c.icon} {c.name}</Text>
                      <Text style={[s.donutPct, { color: c.color }]}>{Math.round(c.pct)}%</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              {/* Category bar list */}
              <View style={s.catList}>
                {catWithPct.map((c, i) => (
                  <TouchableOpacity key={i} style={s.catRow}
                    onPress={() => setCatFilter({ categoryId: c.id, categoryName: c.name, categoryIcon: c.icon, dateFrom, dateTo })}
                    activeOpacity={0.7}>
                    <Text style={s.catIcon}>{c.icon}</Text>
                    <View style={s.catInfo}>
                      <View style={s.catLabelRow}>
                        <Text style={s.catName} numberOfLines={1}>{c.name}</Text>
                        <Text style={s.catAmt}>{formatCurrency(c.amount, 'RON', 0)}</Text>
                      </View>
                      <View style={s.track}><View style={[s.fill, { width: `${c.pct}%` as any, backgroundColor: c.color }]} /></View>
                    </View>
                    <Text style={s.chevron}>›</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </>
          )}
        </View>

        {!loading && transactions.length === 0 && (
          <View style={s.empty}><Text style={s.emptyEmoji}>📊</Text><Text style={s.emptyText}>No transactions in this period</Text></View>
        )}
      </ScrollView>

      <Modal
        visible={catFilter !== null}
        animationType="slide"
        transparent={false}
        onRequestClose={() => {
          setCatFilter(null);
          loadDate();
        }}
      >
        {catFilter !== null && (
          <CategoryModal
            filter={catFilter}
            onClose={() => {
              setCatFilter(null);
              loadDate();
            }}
            onDataChanged={loadDate}
          />
        )}
      </Modal>

      <MonthPickerModal
        visible={isMonthPickerVisible}
        value={selectedPieMonth}
        onChange={setSelectedPieMonth}
        onClose={() => setMonthPickerVisible(false)}
      />
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe:        { flex: 1, backgroundColor: colors.bg.primary },
  content:     { padding: 12, gap: 10, paddingBottom: 100 },
  screenLabel: { fontSize: 11, color: colors.accent.primary, textTransform: 'uppercase', letterSpacing: 1.2, opacity: 0.85 },
  loading:     { textAlign: 'center', fontSize: 12, color: colors.text.muted, paddingVertical: 8 },

  periodRow:           { flexDirection: 'row', gap: 6 },
  periodTab:           { flex: 1, paddingVertical: 8, alignItems: 'center', borderRadius: 8, backgroundColor: colors.bg.secondary, borderWidth: 1, borderColor: colors.border.default },
  periodTabActive:     { backgroundColor: 'rgba(0,212,170,0.12)', borderColor: 'rgba(0,212,170,0.3)' },
  periodTabText:       { fontSize: 12, fontWeight: '500', color: colors.text.muted },
  periodTabTextActive: { color: colors.accent.primary, fontWeight: '600' },

  summaryRow: { flexDirection: 'row', gap: 8 },
  sumCard:    { flex: 1, backgroundColor: colors.bg.secondary, borderRadius: 10, padding: 14, borderWidth: 1 },
  sumLabel:   { fontSize: 10, color: colors.text.secondary, marginBottom: 5 },
  sumVal:     { fontSize: 20, fontWeight: '700' },

  card:      { backgroundColor: colors.bg.secondary, borderRadius: 12, padding: 12, borderWidth: 1, borderColor: colors.border.default, gap: 10 },
  cardTitle: { fontSize: 12, fontWeight: '600', color: colors.text.secondary },
  cardHeaderRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  monthFilterBtn: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: colors.bg.elevated,
    borderWidth: 1,
    borderColor: colors.border.default,
  },
  monthFilterText: { fontSize: 11, color: colors.text.primary, fontWeight: '600' },

  legend:     { flexDirection: 'row', gap: 16, justifyContent: 'center' },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  legendText: { fontSize: 10, color: colors.text.secondary },
  dot:        { width: 8, height: 8, borderRadius: 4 },

  donutRow:    { flexDirection: 'row', alignItems: 'center', gap: 12 },
  donutLegend: { flex: 1, gap: 4 },
  donutItem:   { flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 2 },
  donutText:   { flex: 1, fontSize: 11, color: colors.text.secondary },
  donutPct:    { fontSize: 11, fontWeight: '600', minWidth: 30, textAlign: 'right' },

  catList:    { gap: 2, borderTopWidth: 1, borderTopColor: colors.border.default, paddingTop: 8 },
  catRow:     { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 6 },
  catIcon:    { fontSize: 17, width: 24, textAlign: 'center' },
  catInfo:    { flex: 1, gap: 4 },
  catLabelRow:{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  catName:    { fontSize: 12, fontWeight: '500', color: colors.text.primary, flex: 1 },
  catAmt:     { fontSize: 12, fontWeight: '600', color: colors.text.primary },
  track:      { height: 4, backgroundColor: colors.bg.elevated, borderRadius: 2, overflow: 'hidden' },
  fill:       { height: 4, borderRadius: 2 },
  chevron:    { fontSize: 16, color: colors.text.muted },

  pieEmpty:   { alignItems: 'center', paddingVertical: 24 },
  empty:      { alignItems: 'center', paddingVertical: 32, gap: 8 },
  emptyEmoji: { fontSize: 36 },
  emptyText:  { fontSize: 13, color: colors.text.muted },
});
