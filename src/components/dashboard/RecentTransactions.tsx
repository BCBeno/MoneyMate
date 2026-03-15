import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { colors, spacing, radius } from '../../theme';
import { Transaction } from '../../database/repositories/transactionRepository';
import { formatCurrency } from '../../utils/formatCurrency';
import { formatDate } from '../../utils/formatDate';

interface Props {
  transactions: Transaction[];
  onPress: (id: number) => void;
  onSeeAll: () => void;
}

export default function RecentTransactions({ transactions, onPress, onSeeAll }: Props) {
  if (transactions.length === 0) return null;
  return (
    <View style={styles.section}>
      <View style={styles.header}>
        <Text style={styles.title}>Tranzacții recente</Text>
        <TouchableOpacity onPress={onSeeAll}>
          <Text style={styles.seeAll}>Vezi tot</Text>
        </TouchableOpacity>
      </View>
      {transactions.slice(0, 5).map(t => (
        <TouchableOpacity key={t.id} style={styles.item} onPress={() => onPress(t.id)} activeOpacity={0.7}>
          <View style={[styles.iconWrap, { backgroundColor: (t.category_color ?? '#6B7280') + '22' }]}>
            <Text style={styles.icon}>{t.category_icon ?? '💰'}</Text>
          </View>
          <View style={styles.info}>
            <Text style={styles.desc} numberOfLines={1}>{t.description ?? t.category_name}</Text>
            <Text style={styles.date}>{formatDate(t.date)}</Text>
          </View>
          <Text style={[styles.amount, { color: t.type === 'income' ? colors.income : colors.expense }]}>
            {t.type === 'income' ? '+' : '-'}{formatCurrency(t.amount, t.currency_symbol ?? 'lei', 0)}
          </Text>
        </TouchableOpacity>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  section: { marginHorizontal: spacing.lg, marginTop: spacing.xl },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.md },
  title: { fontSize: 16, fontWeight: '600', color: colors.text.primary },
  seeAll: { fontSize: 13, color: colors.accent.primary, fontWeight: '500' },
  item: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.md,
    backgroundColor: colors.bg.secondary, borderRadius: radius.md,
    padding: spacing.md, marginBottom: spacing.sm,
    borderWidth: 1, borderColor: colors.border.subtle,
  },
  iconWrap: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  icon: { fontSize: 18 },
  info: { flex: 1 },
  desc: { fontSize: 14, fontWeight: '500', color: colors.text.primary, marginBottom: 2 },
  date: { fontSize: 12, color: colors.text.muted },
  amount: { fontSize: 14, fontWeight: '600' },
});
