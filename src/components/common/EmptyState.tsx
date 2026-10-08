import AppIcon from './AppIcon';
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { colors, spacing } from '../../theme';
import Button from './Button';

interface EmptyStateProps {
  icon?: string;
  title: string;
  description?: string;
  actionLabel?: string;
  onAction?: () => void;
}

export default function EmptyState({
  icon = "inbox", title, description, actionLabel, onAction,
}: EmptyStateProps) {
  return (
    <View style={styles.container}>
      <AppIcon name={icon} size={32} color={colors.accent.primary} />
      <Text style={styles.title}>{title}</Text>
      {description && <Text style={styles.description}>{description}</Text>}
      {actionLabel && onAction && (
        <Button label={actionLabel} onPress={onAction} variant="secondary" style={styles.btn} />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: spacing.xxxl, gap: spacing.md },
  emoji: { fontSize: 48, marginBottom: spacing.sm },
  title: { fontSize: 18, fontWeight: '600', color: colors.text.primary, textAlign: 'center' },
  description: { fontSize: 14, color: colors.text.secondary, textAlign: 'center', lineHeight: 20 },
  btn: { marginTop: spacing.sm },
});
