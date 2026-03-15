import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView } from 'react-native';
import { colors, spacing, radius } from '../../theme';
import { DEFAULT_CURRENCIES } from '../../constants/currencies';

interface Props {
  selected: string;
  onSelect: (code: string) => void;
}

export default function CurrencyPicker({ selected, onSelect }: Props) {
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.row}>
      {DEFAULT_CURRENCIES.map(c => {
        const isSelected = c.code === selected;
        return (
          <TouchableOpacity
            key={c.code}
            style={[styles.chip, isSelected && styles.chipSelected]}
            onPress={() => onSelect(c.code)}
            activeOpacity={0.7}
          >
            <Text style={[styles.symbol, isSelected && styles.symbolSelected]}>{c.symbol}</Text>
            <Text style={[styles.code, isSelected && styles.codeSelected]}>{c.code}</Text>
          </TouchableOpacity>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  row: { paddingHorizontal: spacing.lg, gap: spacing.sm, paddingVertical: 4 },
  chip: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingHorizontal: spacing.md, paddingVertical: 8,
    borderRadius: radius.full, backgroundColor: colors.bg.tertiary,
    borderWidth: 1, borderColor: colors.border.default,
  },
  chipSelected: { backgroundColor: colors.accent.muted, borderColor: colors.accent.primary },
  symbol: { fontSize: 13, fontWeight: '600', color: colors.text.secondary },
  symbolSelected: { color: colors.accent.primary },
  code: { fontSize: 12, color: colors.text.muted },
  codeSelected: { color: colors.accent.primary },
});
