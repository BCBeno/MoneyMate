import React from 'react';
import { View, Text, StyleSheet, ViewStyle } from 'react-native';
import { colors, radius, spacing } from '../../theme';

type BadgeVariant = 'income' | 'expense' | 'warning' | 'info' | 'active' | 'completed' | 'paused' | 'default';

interface BadgeProps {
  label: string;
  variant?: BadgeVariant;
  style?: ViewStyle;
}

const variantMap: Record<BadgeVariant, { bg: string; text: string }> = {
  income:    { bg: colors.income + '22',    text: colors.income },
  expense:   { bg: colors.expense + '22',   text: colors.expense },
  warning:   { bg: colors.warning + '22',   text: colors.warning },
  info:      { bg: colors.info + '22',      text: colors.info },
  active:    { bg: colors.accent.muted,     text: colors.accent.primary },
  completed: { bg: colors.income + '22',    text: colors.income },
  paused:    { bg: colors.warning + '22',   text: colors.warning },
  default:   { bg: colors.bg.tertiary,      text: colors.text.secondary },
};

export default function Badge({ label, variant = 'default', style }: BadgeProps) {
  const { bg, text } = variantMap[variant];
  return (
    <View style={[styles.badge, { backgroundColor: bg }, style]}>
      <Text style={[styles.label, { color: text }]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
    borderRadius: radius.full,
    alignSelf: 'flex-start',
  },
  label: { fontSize: 11, fontWeight: '600', letterSpacing: 0.3 },
});
