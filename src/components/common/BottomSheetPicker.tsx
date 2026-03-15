/**
 * Generic bottom-sheet picker.
 * Renders a list of items; the selected one is highlighted.
 */
import React from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity,
  Modal, Pressable, FlatList,
} from 'react-native';
import { colors } from '../../theme';

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
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={s.overlay} onPress={onClose} />
      <View style={s.sheet}>
        <View style={s.handle} />
        <Text style={s.title}>{title}</Text>
        <FlatList
          data={items}
          keyExtractor={item => item.key}
          showsVerticalScrollIndicator={false}
          style={{ maxHeight: 360 }}
          renderItem={({ item }) => {
            const selected = item.key === selectedKey;
            return (
              <TouchableOpacity
                style={[s.item, selected && s.itemSelected]}
                onPress={() => { onSelect(item.key); onClose(); }}
                activeOpacity={0.7}
              >
                {item.icon && (
                  <View style={[s.itemIconWrap, { backgroundColor: (item.color ?? colors.accent.primary) + '22' }]}>
                    <Text style={s.itemIcon}>{item.icon}</Text>
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
                {selected && <Text style={s.check}>✓</Text>}
              </TouchableOpacity>
            );
          }}
        />
      </View>
    </Modal>
  );
}

const s = StyleSheet.create({
  overlay:       { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.6)' },
  sheet:         { position: 'absolute', bottom: 0, left: 0, right: 0, backgroundColor: colors.bg.elevated, borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 20, paddingBottom: 40, borderTopWidth: 1, borderTopColor: colors.border.default },
  handle:        { width: 36, height: 4, backgroundColor: colors.border.default, borderRadius: 2, alignSelf: 'center', marginBottom: 14 },
  title:         { fontSize: 15, fontWeight: '600', color: colors.text.primary, marginBottom: 12 },
  item:          { flexDirection: 'row', alignItems: 'center', paddingVertical: 10, paddingHorizontal: 4, borderRadius: 10, gap: 12, marginBottom: 2 },
  itemSelected:  { backgroundColor: 'rgba(0,212,170,0.08)' },
  itemIconWrap:  { width: 36, height: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  itemIcon:      { fontSize: 18 },
  itemText:      { flex: 1 },
  itemLabel:     { fontSize: 14, fontWeight: '500', color: colors.text.primary },
  itemSublabel:  { fontSize: 11, color: colors.text.muted, marginTop: 1 },
  check:         { fontSize: 16, color: colors.accent.primary, fontWeight: '700' },
});
