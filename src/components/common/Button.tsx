import React from 'react';
import {
  TouchableOpacity, Text, StyleSheet, ActivityIndicator,
  ViewStyle, TextStyle
} from 'react-native';
import { colors, radius, spacing } from '../../theme';

interface ButtonProps {
  label: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  loading?: boolean;
  disabled?: boolean;
  style?: ViewStyle;
  textStyle?: TextStyle;
}

export default function Button({
  label, onPress, variant = 'primary', size = 'md',
  loading, disabled, style, textStyle,
}: ButtonProps) {
  const isDisabled = disabled || loading;

  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={isDisabled}
      activeOpacity={0.75}
      style={[
        styles.base,
        styles[variant],
        styles[`size_${size}`],
        isDisabled && styles.disabled,
        style,
      ]}
    >
      {loading
        ? <ActivityIndicator color={variant === 'primary' ? colors.text.inverse : colors.accent.primary} size="small" />
        : <Text style={[styles.label, styles[`label_${variant}`], styles[`labelSize_${size}`], textStyle]}>
            {label}
          </Text>
      }
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  base: {
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
  },
  primary: {
    backgroundColor: colors.accent.primary,
  },
  secondary: {
    backgroundColor: colors.bg.tertiary,
    borderWidth: 1,
    borderColor: colors.border.default,
  },
  danger: {
    backgroundColor: colors.expense + '22',
    borderWidth: 1,
    borderColor: colors.expense + '44',
  },
  ghost: {
    backgroundColor: 'transparent',
  },
  size_sm: { paddingVertical: spacing.xs, paddingHorizontal: spacing.md, height: 36 },
  size_md: { paddingVertical: spacing.sm, paddingHorizontal: spacing.lg, height: 48 },
  size_lg: { paddingVertical: spacing.md, paddingHorizontal: spacing.xl, height: 56 },
  disabled: { opacity: 0.45 },
  label: { fontWeight: '600' },
  label_primary: { color: colors.text.inverse },
  label_secondary: { color: colors.text.primary },
  label_danger: { color: colors.expense },
  label_ghost: { color: colors.accent.primary },
  labelSize_sm: { fontSize: 13 },
  labelSize_md: { fontSize: 15 },
  labelSize_lg: { fontSize: 16 },
});
