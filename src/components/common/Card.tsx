import React from 'react';
import { View, StyleSheet, ViewStyle } from 'react-native';
import { colors, radius, spacing } from '../../theme';

interface CardProps {
  children: React.ReactNode;
  style?: ViewStyle;
  elevated?: boolean;
  accent?: boolean;
}

export default function Card({ children, style, elevated, accent }: CardProps) {
  return (
    <View style={[
      styles.card,
      elevated && styles.elevated,
      accent && styles.accent,
      style,
    ]}>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.bg.secondary,
    borderRadius: radius.lg,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border.default,
  },
  elevated: {
    backgroundColor: colors.bg.elevated,
  },
  accent: {
    borderColor: colors.border.accent,
  },
});
