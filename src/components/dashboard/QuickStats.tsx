import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { colors, spacing, radius } from '../../theme';
import { formatCurrency } from '../../utils/formatCurrency';

interface Props {
  savingsRate: number;
  totalTransactions: number;
  avgExpense: number;
  symbol: string;
}

export default function QuickStats({ savingsRate, totalTransactions, avgExpense, symbol }: Props) {
  return (
    <View style={styles.row}>
      <View style={styles.stat}>
        <Text style={styles.emoji}>📈</Text>
        <Text style={styles.value}>{savingsRate.toFixed(0)}%</Text>
        <Text style={styles.label}>Savings</Text>
      </View>
      <View style={styles.stat}>
        <Text style={styles.emoji}>🔢</Text>
        <Text style={styles.value}>{totalTransactions}</Text>
        <Text style={styles.label}>Transactions</Text>
      </View>
      <View style={styles.stat}>
        <Text style={styles.emoji}>📉</Text>
        <Text style={styles.value}>{formatCurrency(avgExpense, symbol, 0)}</Text>
        <Text style={styles.label}>Avg/day</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row', gap: spacing.sm,
    marginHorizontal: spacing.lg, marginTop: spacing.md,
  },
  stat: {
    flex: 1, backgroundColor: colors.bg.secondary, borderRadius: radius.md,
    padding: spacing.md, alignItems: 'center',
    borderWidth: 1, borderColor: colors.border.default,
  },
  emoji: { fontSize: 18, marginBottom: 4 },
  value: { fontSize: 15, fontWeight: '700', color: colors.text.primary, marginBottom: 2 },
  label: { fontSize: 11, color: colors.text.muted, textAlign: 'center' },
});
