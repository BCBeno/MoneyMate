import AppIcon from './AppIcon';
/**
 * Generic bottom-sheet picker.
 * Renders a list of items; the selected one is highlighted.
 */
import React, { useEffect } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity,
  FlatList, Keyboard, useWindowDimensions,
} from 'react-native';
import { colors } from '../../theme';
import Modal from './Modal';

export interface PickerItem {
  key: string;
  label: string;
  sublabel?: string;
  icon?: string;
  color?: string;
}

interface Props {
  visible: boolean;
  title: string;
  items: PickerItem[];
  selectedKey: string;
  onSelect: (key: string) => void;
  onClose: () => void;
}

export default function BottomSheetPicker({
  visible, title, items, selectedKey, onSelect, onClose,
}: Props) {
  const { height } = useWindowDimensions();
  useEffect(() => {
    if (visible) Keyboard.dismiss();
  }, [visible]);
  return (
    <Modal visible={visible} title={title} onClose={onClose}>
        <FlatList
          data={items}
          keyExtractor={item => item.key}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          style={{ maxHeight: height * 0.6 }}
          renderItem={({ item }) => {
            const selected = item.key === selectedKey;
            return (
              <TouchableOpacity
                style={[s.item, selected && s.itemSelected]}
                onPress={() => { onSelect(item.key); onClose(); }}
                activeOpacity={0.7}
                accessibilityRole="button" accessibilityLabel={item.label} accessibilityState={{selected}}
              >
                {item.icon && (
                  <View style={[s.itemIconWrap, { backgroundColor: (item.color ?? colors.accent.primary) + '22' }]}>
                    <AppIcon name={item.icon} size={22} color={colors.text.secondary} />
                  </View>
                )}
                <View style={s.itemText}>
                  <Text style={[s.itemLabel, selected && { color: colors.accent.primary }]}>
                    {item.label}
                  </Text>
                  {item.sublabel && (
                    <Text style={s.itemSublabel}>{item.sublabel}</Text>
                  )}
                </View>
                {selected && <AppIcon name="check" size={20} color={colors.accent.primary} />}
              </TouchableOpacity>
            );
          }}
        />
    </Modal>
  );
}

const s = StyleSheet.create({
  item:          { flexDirection: 'row', alignItems: 'center', paddingVertical: 10, paddingHorizontal: 4, borderRadius: 10, gap: 12, marginBottom: 2, minHeight: 68 },
  itemSelected:  { backgroundColor: 'rgba(0,212,170,0.08)' },
  itemIconWrap:  { width: 42, height: 42, borderRadius: 12, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.bg.tertiary },
  itemIcon:      { fontSize: 18 },
  itemText:      { flex: 1 },
  itemLabel:     { fontSize: 14, fontWeight: '500', color: colors.text.primary },
  itemSublabel:  { fontSize: 12, color: colors.text.muted, marginTop: 1 },
  check:         { fontSize: 16, color: colors.accent.primary, fontWeight: '700' },
});
