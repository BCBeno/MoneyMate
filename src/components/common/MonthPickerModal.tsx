import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Modal, Pressable } from 'react-native';
import { colors } from '../../theme';

interface Props {
  visible: boolean;
  /** 'yyyy-MM' */
  value: string;
  onChange: (month: string) => void;
  onClose: () => void;
}

const MONTHS = [
  'January','February','March','April','May','June',
  'July','August','September','October','November','December',
];

export default function MonthPickerModal({ visible, value, onChange, onClose }: Props) {
  const [y, setY] = useState(() => parseInt(value.substring(0, 4), 10));
  const [m, setM] = useState(() => parseInt(value.substring(5, 7), 10));

  const confirm = () => {
    onChange(`${y}-${String(m).padStart(2, '0')}`);
    onClose();
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={s.overlay} onPress={onClose} />
      <View style={s.sheet}>
        <Text style={s.title}>Select month</Text>
        <View style={s.row}>
          <View style={[s.col, { flex: 2 }]}>
            <Text style={s.colLabel}>MONTH</Text>
            <TouchableOpacity onPress={() => setM(v => (v <= 1 ? 12 : v - 1))} style={s.arrow}><Text style={s.arrowT}>▲</Text></TouchableOpacity>
            <Text style={s.val}>{MONTHS[m - 1]}</Text>
            <TouchableOpacity onPress={() => setM(v => (v >= 12 ? 1 : v + 1))} style={s.arrow}><Text style={s.arrowT}>▼</Text></TouchableOpacity>
          </View>
          <View style={s.col}>
            <Text style={s.colLabel}>YEAR</Text>
            <TouchableOpacity onPress={() => setY(v => v - 1)} style={s.arrow}><Text style={s.arrowT}>▲</Text></TouchableOpacity>
            <Text style={s.val}>{y}</Text>
            <TouchableOpacity onPress={() => setY(v => v + 1)} style={s.arrow}><Text style={s.arrowT}>▼</Text></TouchableOpacity>
          </View>
        </View>
        <TouchableOpacity style={s.confirmBtn} onPress={confirm}>
          <Text style={s.confirmText}>Confirm</Text>
        </TouchableOpacity>
      </View>
    </Modal>
  );
}

const s = StyleSheet.create({
  overlay:     { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.65)' },
  sheet:       { position: 'absolute', bottom: 0, left: 0, right: 0, backgroundColor: colors.bg.elevated, borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 24, paddingBottom: 40, borderTopWidth: 1, borderTopColor: colors.border.default },
  title:       { fontSize: 15, fontWeight: '600', color: colors.text.primary, textAlign: 'center', marginBottom: 20 },
  row:         { flexDirection: 'row', justifyContent: 'space-around', marginBottom: 20, gap: 12 },
  col:         { flex: 1, alignItems: 'center', gap: 8 },
  colLabel:    { fontSize: 10, color: colors.text.muted, fontWeight: '600', letterSpacing: 0.5 },
  arrow:       { width: '100%', height: 36, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.bg.tertiary, borderRadius: 8 },
  arrowT:      { fontSize: 14, color: colors.text.secondary },
  val:         { fontSize: 18, fontWeight: '700', color: colors.text.primary, textAlign: 'center' },
  confirmBtn:  { backgroundColor: colors.accent.primary, borderRadius: 12, height: 50, alignItems: 'center', justifyContent: 'center' },
  confirmText: { fontSize: 15, fontWeight: '700', color: colors.bg.primary },
});
