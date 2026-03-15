import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { colors, spacing, radius } from '../../theme';
import { Transaction } from '../../database/repositories/transactionRepository';
import { formatCurrency } from '../../utils/formatCurrency';

interface Props {
  transaction: Transaction;
  onPress: () => void;
}

export default function TransactionItem({ transaction: t, onPress }: Props) {
  return (
    <TouchableOpacity style={styles.item} onPress={onPress} activeOpacity={0.75}>
      <View style={[styles.iconWrap, { backgroundColor: (t.category_color ?? '#6B7280') + '22' }]}>
        <Text style={styles.icon}>{t.category_icon ?? '💰'}</Text>
      </View>
      <View style={styles.info}>
        <Text style={styles.desc} numberOfLines={1}>{t.description ?? t.category_name}</Text>
        <Text style={styles.cat}>{t.category_name}</Text>
      </View>
      <View style={styles.right}>
        <Text style={[styles.amount, { color: t.type === 'income' ? colors.income : colors.expense }]}>
          {t.type === 'income' ? '+' : '-'}{formatCurrency(t.amount, t.currency_symbol ?? 'lei', 2)}
        </Text>
        {t.currency_code !== 'RON' && (
          <Text style={styles.ron}>{formatCurrency(t.amount_ron, 'lei', 0)}</Text>
        )}
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  item: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.md,
    paddingVertical: spacing.md, paddingHorizontal: spacing.sm,
  },
  iconWrap: { width: 42, height: 42, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  icon: { fontSize: 18 },
  info: { flex: 1 },
  desc: { fontSize: 14, fontWeight: '500', color: colors.text.primary, marginBottom: 2 },
  cat: { fontSize: 12, color: colors.text.muted },
  right: { alignItems: 'flex-end' },
  amount: { fontSize: 14, fontWeight: '600' },
  ron: { fontSize: 11, color: colors.text.muted, marginTop: 1 },
});
