import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { colors, spacing, radius } from '../../theme';
import { formatCurrency } from '../../utils/formatCurrency';

interface BalanceCardProps {
  balance: number;
  income: number;
  expenses: number;
  symbol: string;
  month: string;
}

export default function BalanceCard({ balance, income, expenses, symbol, month }: BalanceCardProps) {
  const isPositive = balance >= 0;
  return (
    <View style={styles.card}>
      <Text style={styles.label}>SOLD TOTAL</Text>
      <Text style={[styles.amount, { color: isPositive ? colors.income : colors.expense }]}>
        {isPositive ? '' : '-'}{formatCurrency(Math.abs(balance), symbol)}
      </Text>
      <Text style={styles.month}>{month}</Text>
      <View style={styles.row}>
        <View style={styles.stat}>
          <View style={[styles.dot, { backgroundColor: colors.income }]} />
          <View>
            <Text style={styles.statLabel}>Venituri</Text>
            <Text style={[styles.statAmount, { color: colors.income }]}>
              +{formatCurrency(income, symbol)}
            </Text>
          </View>
        </View>
        <View style={styles.divider} />
        <View style={styles.stat}>
          <View style={[styles.dot, { backgroundColor: colors.expense }]} />
          <View>
            <Text style={styles.statLabel}>Cheltuieli</Text>
            <Text style={[styles.statAmount, { color: colors.expense }]}>
              -{formatCurrency(expenses, symbol)}
            </Text>
          </View>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.bg.secondary,
    borderRadius: radius.xl,
    padding: spacing.xl,
    borderWidth: 1,
    borderColor: colors.border.accent,
    marginHorizontal: spacing.lg,
    marginTop: spacing.md,
  },
  label: {
    fontSize: 11, fontWeight: '600', color: colors.text.muted,
    letterSpacing: 1, marginBottom: spacing.sm,
  },
  amount: { fontSize: 38, fontWeight: '700', letterSpacing: -1.5, marginBottom: 2 },
  month: { fontSize: 13, color: colors.text.muted, marginBottom: spacing.lg },
  row: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: colors.bg.tertiary,
    borderRadius: radius.md, padding: spacing.md,
  },
  stat: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 10 },
  dot: { width: 8, height: 8, borderRadius: 4 },
  statLabel: { fontSize: 11, color: colors.text.muted, marginBottom: 2 },
  statAmount: { fontSize: 14, fontWeight: '600' },
  divider: { width: 1, height: 32, backgroundColor: colors.border.default, marginHorizontal: spacing.md },
});
