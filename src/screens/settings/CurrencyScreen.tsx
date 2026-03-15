import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { colors, spacing, radius } from '../../theme';
import { useSettingsStore } from '../../store';
import { DEFAULT_CURRENCIES } from '../../constants/currencies';
import Modal from '../../components/common/Modal';

interface Props { visible: boolean; onClose: () => void; }

export default function CurrencyScreen({ visible, onClose }: Props) {
  const { currency, setCurrency } = useSettingsStore();

  return (
    <Modal visible={visible} onClose={onClose} title="Main currency">
      {DEFAULT_CURRENCIES.map(c => {
        const isSelected = c.code === currency;
        return (
          <TouchableOpacity key={c.code}
            style={[styles.item, isSelected && styles.itemSelected]}
            onPress={() => { setCurrency(c.code); onClose(); }}
            activeOpacity={0.7}
          >
            <View style={styles.left}>
              <Text style={styles.symbol}>{c.symbol}</Text>
              <View>
                <Text style={styles.code}>{c.code}</Text>
                <Text style={styles.name}>{c.name}</Text>
              </View>
            </View>
            {isSelected && <Text style={styles.check}>✓</Text>}
          </TouchableOpacity>
        );
      })}
    </Modal>
  );
}

const styles = StyleSheet.create({
  item: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingVertical: spacing.md, paddingHorizontal: spacing.sm,
    borderRadius: spacing.sm, marginBottom: 4,
  },
  itemSelected: { backgroundColor: colors.accent.muted },
  left: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  symbol: { fontSize: 20, width: 32, textAlign: 'center', fontWeight: '700', color: colors.text.primary },
  code: { fontSize: 15, fontWeight: '600', color: colors.text.primary },
  name: { fontSize: 12, color: colors.text.secondary },
  check: { fontSize: 18, color: colors.accent.primary, fontWeight: '700' },
});
