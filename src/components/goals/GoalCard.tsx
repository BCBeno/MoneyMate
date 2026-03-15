import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { colors, spacing, radius } from '../../theme';
import { Goal } from '../../database/repositories/goalRepository';
import { formatCurrency } from '../../utils/formatCurrency';
import { getDaysUntil } from '../../utils/formatDate';
import ProgressBar from './ProgressBar';
import Badge from '../common/Badge';

interface Props {
  goal: Goal;
  onPress: () => void;
}

export default function GoalCard({ goal, onPress }: Props) {
  const progress = goal.current_amount / goal.target_amount;
  const symbol = goal.currency_symbol ?? 'RON';
  const daysLeft = goal.deadline ? getDaysUntil(goal.deadline) : null;

  const statusVariant = goal.status === 'completed'
    ? 'completed'
    : goal.status === 'paused'
      ? 'paused'
      : 'active';
  const statusLabel = goal.status === 'completed' ? 'Completed'
    : goal.status === 'paused' ? 'Paused' : 'Active';

  return (
    <TouchableOpacity style={styles.card} onPress={onPress} activeOpacity={0.8}>
      <View style={styles.header}>
        <View style={[styles.iconWrap, { backgroundColor: goal.color + '22' }]}>
          <Text style={styles.icon}>{goal.icon}</Text>
        </View>
        <View style={styles.info}>
          <Text style={styles.name} numberOfLines={1}>{goal.name}</Text>
          {daysLeft !== null && daysLeft > 0 && (
            <Text style={styles.deadline}>⏳ {daysLeft} days left</Text>
          )}
        </View>
        <Badge label={statusLabel} variant={statusVariant} />
      </View>
      <ProgressBar progress={progress} color={goal.color} height={6} />
      <View style={styles.amounts}>
        <Text style={styles.current}>{formatCurrency(goal.current_amount, symbol, 0)}</Text>
        <Text style={styles.target}>of {formatCurrency(goal.target_amount, symbol, 0)}</Text>
        <Text style={[styles.pct, { color: goal.color }]}>{(progress * 100).toFixed(0)}%</Text>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.bg.secondary, borderRadius: radius.lg,
    padding: spacing.lg, marginHorizontal: spacing.lg, marginBottom: spacing.sm,
    borderWidth: 1, borderColor: colors.border.default,
  },
  header: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, marginBottom: spacing.md },
  iconWrap: { width: 44, height: 44, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  icon: { fontSize: 22 },
  info: { flex: 1 },
  name: { fontSize: 15, fontWeight: '600', color: colors.text.primary, marginBottom: 2 },
  deadline: { fontSize: 12, color: colors.text.muted },
  amounts: { flexDirection: 'row', alignItems: 'center', marginTop: spacing.sm },
  current: { fontSize: 14, fontWeight: '700', color: colors.text.primary },
  target: { fontSize: 13, color: colors.text.muted, marginLeft: 4, flex: 1 },
  pct: { fontSize: 14, fontWeight: '700' },
});
