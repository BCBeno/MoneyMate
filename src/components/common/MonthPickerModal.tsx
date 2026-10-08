import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { colors } from '../../theme';
import AppIcon from './AppIcon';
import Modal from './Modal';

interface Props { visible: boolean; value: string; onChange: (month: string) => void; onClose: () => void; }
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
export default function MonthPickerModal({visible, value, onChange, onClose}: Props) {
  const [year, setYear] = useState(Number(value.slice(0, 4)));
  const [month, setMonth] = useState(Number(value.slice(5, 7)));
  useEffect(() => { if (visible) { setYear(Number(value.slice(0, 4))); setMonth(Number(value.slice(5, 7))); } }, [visible, value]);
  return <Modal visible={visible} title="Choose month" onClose={onClose} scrollable>
    <View style={s.content}>
      <View style={s.yearRow}>
        <TouchableOpacity style={s.arrow} accessibilityRole="button" accessibilityLabel="Previous year" onPress={() => setYear(y => Math.max(1, y - 1))}><AppIcon name="chevron-left" /></TouchableOpacity>
        <Text style={s.year}>{year}</Text>
        <TouchableOpacity style={s.arrow} accessibilityRole="button" accessibilityLabel="Next year" onPress={() => setYear(y => Math.min(9999, y + 1))}><AppIcon name="chevron-right" /></TouchableOpacity>
      </View>
      <View style={s.grid}>{MONTHS.map((name, i) => <TouchableOpacity key={name} style={[s.month, month === i + 1 && s.selected]} accessibilityRole="button" accessibilityLabel={name} accessibilityState={{selected: month === i + 1}} onPress={() => setMonth(i + 1)}><Text style={[s.monthText, month === i + 1 && s.selectedText]}>{name}</Text></TouchableOpacity>)}</View>
      <TouchableOpacity style={s.done} accessibilityRole="button" onPress={() => { onChange(`${String(year).padStart(4, '0')}-${String(month).padStart(2, '0')}`); onClose(); }}><Text style={s.doneText}>Done</Text></TouchableOpacity>
    </View>
  </Modal>;
}
const s = StyleSheet.create({
  content: {gap: 16},
  yearRow: {flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center'},
  year: {fontSize: 20, fontWeight: '600', color: colors.text.primary},
  arrow: {width: 44, height: 44, borderRadius: 12, backgroundColor: colors.bg.secondary, alignItems: 'center', justifyContent: 'center'},
  grid: {flexDirection: 'row', flexWrap: 'wrap', gap: 8},
  month: {width: '31%', flexGrow: 1, height: 48, borderRadius: 12, backgroundColor: colors.bg.secondary, borderWidth: 1, borderColor: colors.border.default, alignItems: 'center', justifyContent: 'center'},
  selected: {backgroundColor: colors.accent.muted, borderColor: colors.accent.primary},
  monthText: {fontSize: 14, fontWeight: '500', color: colors.text.primary},
  selectedText: {color: colors.accent.primary},
  done: {height: 52, borderRadius: 12, backgroundColor: colors.accent.primary, alignItems: 'center', justifyContent: 'center'},
  doneText: {fontSize: 14, fontWeight: '600', color: colors.text.inverse},
});
