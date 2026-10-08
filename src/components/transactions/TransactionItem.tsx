import AppIcon from '../common/AppIcon';
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
      <View style={[styles.iconWrap, { backgroundColor: colors.bg.tertiary }]}>
        <AppIcon name={t.category_icon} size={22} color={t.type === 'income' ? colors.income : t.category_color ?? colors.text.secondary} />
      </View>
      <View style={styles.info}>
        <Text style={styles.desc} numberOfLines={1}>{t.description ?? t.category_name}</Text>
        <Text style={styles.cat} numberOfLines={1}>{t.category_name}</Text>
      </View>
      <View style={styles.right}>
        <Text style={[styles.amount, { color: t.type === 'income' ? colors.income : colors.text.primary }]}>
          {t.type === 'income' ? '+' : '−'}{formatCurrency(t.amount, '', 2)}
        </Text>
        <Text style={styles.ron}>{t.currency_code}</Text>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  item: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, paddingVertical: spacing.md, minHeight: 66, borderBottomWidth: 1, borderBottomColor: colors.border.subtle },
  iconWrap: { width: 42, height: 42, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  icon: { fontSize: 18 },
  info: { flex: 1, minWidth: 0 },
  desc: { fontSize: 14, fontWeight: '600', color: colors.text.primary, marginBottom: 3 },
  cat: { fontSize: 11, color: colors.text.secondary },
  right: { alignItems: 'flex-end' },
  amount: { fontSize: 14, fontWeight: '600', fontVariant: ['tabular-nums'] },
  ron: { fontSize: 11, color: colors.text.muted, marginTop: 1 },
});
