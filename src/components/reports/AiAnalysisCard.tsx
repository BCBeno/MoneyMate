import React, { useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, Switch, ActivityIndicator,
} from 'react-native';
import { format } from 'date-fns';
import { colors } from '../../theme';
import {
  analyzeSpending, AnalysisResult, MonthAnalysisData, CategoryData,
} from '../../services/aiAnalysisService';
import { getTransactions } from '../../database/repositories/transactionRepository';
import { getCategories } from '../../database/repositories/categoryRepository';
import { calculateIncome, calculateExpenses, groupByCategory } from '../../utils/calculations';
import MonthPickerModal from '../common/MonthPickerModal';

function getPrevMonth(month: string): string {
  const [y, m] = month.split('-').map(Number);
  if (m === 1) return `${y - 1}-12`;
  return `${y}-${String(m - 1).padStart(2, '0')}`;
}

function getMonthRange(month: string): { dateFrom: string; dateTo: string } {
  const [yearStr, monthStr] = month.split('-');
  const year = parseInt(yearStr, 10);
  const mo = parseInt(monthStr, 10) - 1;
  const pad = (n: number) => String(n).padStart(2, '0');
  const lastDay = new Date(year, mo + 1, 0).getDate();
  return {
    dateFrom: `${year}-${pad(mo + 1)}-01`,
    dateTo: `${year}-${pad(mo + 1)}-${pad(lastDay)}`,
  };
}

async function buildMonthData(month: string): Promise<MonthAnalysisData> {
  const { dateFrom, dateTo } = getMonthRange(month);
  const [txs, cats] = await Promise.all([
    getTransactions({ dateFrom, dateTo }),
    getCategories(),
  ]);

  const totalIncome = calculateIncome(txs);
  const totalExpenses = calculateExpenses(txs);

  const grouped = groupByCategory(txs);
  const total = Object.values(grouped).reduce((s, v) => s + v, 0);

  const categories: CategoryData[] = Object.entries(grouped)
    .map(([id, amount]) => {
      const cat = cats.find(c => c.id === parseInt(id, 10));
      return {
        name: cat?.name ?? 'Other',
        icon: cat?.icon ?? '💰',
        amount,
        pct: total > 0 ? (amount / total) * 100 : 0,
      };
    })
    .sort((a, b) => b.amount - a.amount)
    .slice(0, 6);

  return {
    label: format(new Date(`${month}-15`), 'MMMM yyyy'),
    totalIncome,
    totalExpenses,
    categories,
  };
}

interface Props {
  currency: string;
  language: string;
}

export default function AiAnalysisCard({ currency, language }: Props) {
  const [selectedMonth, setSelectedMonth] = useState(() => format(new Date(), 'yyyy-MM'));
  const [comparePrev, setComparePrev] = useState(false);
  const [monthPickerVisible, setMonthPickerVisible] = useState(false);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleAnalyze = useCallback(async () => {
    setLoading(true);
    setResult(null);
    setError(null);
    try {
      const current = await buildMonthData(selectedMonth);
      const previous = comparePrev ? await buildMonthData(getPrevMonth(selectedMonth)) : undefined;
      const res = await analyzeSpending({ current, previous, currency, language });
      setResult(res);
    } catch (e: any) {
      setError(e?.message ?? 'Analysis failed. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [selectedMonth, comparePrev, currency, language]);

  const monthLabel = format(new Date(`${selectedMonth}-15`), 'MMMM yyyy');

  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Text style={styles.headerIcon}>✨</Text>
          <Text style={styles.headerTitle}>AI Spending Analysis</Text>
        </View>
      </View>

      <View style={styles.row}>
        <Text style={styles.rowLabel}>Month</Text>
        <TouchableOpacity style={styles.monthBtn} onPress={() => setMonthPickerVisible(true)} activeOpacity={0.8}>
          <Text style={styles.monthBtnText}>{monthLabel}</Text>
          <Text style={styles.chevron}>›</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.row}>
        <Text style={styles.rowLabel}>Compare with previous month</Text>
        <Switch
          value={comparePrev}
          onValueChange={setComparePrev}
          trackColor={{ false: colors.bg.elevated, true: colors.accent.primary }}
          thumbColor="#fff"
        />
      </View>

      <TouchableOpacity
        style={[styles.analyzeBtn, loading && styles.analyzeBtnDisabled]}
        onPress={handleAnalyze}
        disabled={loading}
        activeOpacity={0.8}
      >
        {loading
          ? <ActivityIndicator size="small" color={colors.text.inverse} />
          : <Text style={styles.analyzeBtnText}>Analyze spending</Text>
        }
      </TouchableOpacity>

      {error !== null && (
        <View style={styles.errorBox}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      )}

      {result !== null && (
        <View style={styles.resultBox}>
          <Text style={styles.analysisText}>{result.analysis}</Text>
          {result.tip !== '' && (
            <View style={styles.tipBox}>
              <View style={styles.tipAccent} />
              <View style={styles.tipContent}>
                <Text style={styles.tipLabel}>Tip</Text>
                <Text style={styles.tipText}>{result.tip}</Text>
              </View>
            </View>
          )}
        </View>
      )}

      <MonthPickerModal
        visible={monthPickerVisible}
        value={selectedMonth}
        onChange={setSelectedMonth}
        onClose={() => setMonthPickerVisible(false)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.bg.secondary,
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: 'rgba(0,212,170,0.2)',
    gap: 12,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  headerIcon:  { fontSize: 15 },
  headerTitle: { fontSize: 13, fontWeight: '600', color: colors.text.primary },
  poweredBy:   { fontSize: 9, color: colors.text.muted, textTransform: 'uppercase', letterSpacing: 0.8 },

  row:      { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  rowLabel: { fontSize: 12, color: colors.text.secondary, flex: 1 },

  monthBtn:     { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 999, backgroundColor: colors.bg.elevated, borderWidth: 1, borderColor: colors.border.default },
  monthBtnText: { fontSize: 11, fontWeight: '600', color: colors.text.primary },
  chevron:      { fontSize: 14, color: colors.text.muted },

  analyzeBtn:         { backgroundColor: colors.accent.primary, borderRadius: 10, paddingVertical: 11, alignItems: 'center', justifyContent: 'center' },
  analyzeBtnDisabled: { opacity: 0.6 },
  analyzeBtnText:     { fontSize: 13, fontWeight: '600', color: colors.text.inverse },

  errorBox:  { backgroundColor: 'rgba(248,113,113,0.1)', borderRadius: 8, padding: 10, borderWidth: 1, borderColor: 'rgba(248,113,113,0.25)' },
  errorText: { fontSize: 12, color: colors.expense, lineHeight: 18 },

  resultBox:    { gap: 10 },
  analysisText: { fontSize: 13, color: colors.text.primary, lineHeight: 21 },

  tipBox:    { flexDirection: 'row', backgroundColor: 'rgba(0,212,170,0.08)', borderRadius: 8, borderWidth: 1, borderColor: 'rgba(0,212,170,0.2)', overflow: 'hidden' },
  tipAccent: { width: 3, backgroundColor: colors.accent.primary },
  tipContent:{ flex: 1, padding: 12, gap: 4 },
  tipLabel:  { fontSize: 9, fontWeight: '700', color: colors.accent.primary, textTransform: 'uppercase', letterSpacing: 1 },
  tipText:   { fontSize: 12, color: colors.text.secondary, lineHeight: 18 },
});
