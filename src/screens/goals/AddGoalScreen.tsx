import React, { useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity,
  ScrollView, TextInput, Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors, spacing } from '../../theme';
import { useGoalsStore } from '../../store/slices/goalsSlice';
import { DEFAULT_CURRENCIES } from '../../constants/currencies';
import { toISODate } from '../../utils/formatDate';
import DatePickerModal from '../../components/common/DatePickerModal';
import BottomSheetPicker, { PickerItem } from '../../components/common/BottomSheetPicker';
import { format } from 'date-fns';
import { ro } from 'date-fns/locale';

const GOAL_ICONS  = ['🏠','🚗','✈️','💻','📱','🎓','💍','🏖️','💰','🏋️','🎸','📷','🎯','🛒','🐾'];
const GOAL_COLORS = ['#00D4AA','#3B82F6','#F97316','#EC4899','#8B5CF6','#34D399','#F59E0B','#EF4444','#06B6D4','#10B981'];

interface Props { onClose: () => void; }

export default function AddGoalScreen({ onClose }: Props) {
  const [name, setName]         = useState('');
  const [targetStr, setTargetStr] = useState('');
  const [currency, setCurrency] = useState('RON');
  const [icon, setIcon]         = useState('🎯');
  const [color, setColor]       = useState('#00D4AA');
  const [deadline, setDeadline] = useState('');
  const [showDeadlinePicker, setShowDeadlinePicker] = useState(false);
  const [showCurPicker, setShowCurPicker]           = useState(false);
  const [saving, setSaving]     = useState(false);
  const { add } = useGoalsStore();

  const handleSave = async () => {
    const target = parseFloat(targetStr);
    if (!name.trim()) { Alert.alert('Error', 'Please enter a name.'); return; }
    if (isNaN(target) || target <= 0) { Alert.alert('Error', 'Please enter the target amount.'); return; }
    setSaving(true);
    try {
      await add({ name: name.trim(), target_amount: target, currency_code: currency, icon, color, deadline: deadline || undefined });
      onClose();
    } catch (e) {
      Alert.alert('Error', 'Nu s-a putut salva obiectivul.');
      console.error(e);
    } finally {
      setSaving(false);
    }
  };

  const currencyItems: PickerItem[] = DEFAULT_CURRENCIES.map(c => ({
    key: c.code, label: c.code, sublabel: c.name, icon: c.symbol,
  }));

  const deadlineFmt = deadline
    ? (() => { try { return format(new Date(deadline + 'T12:00:00'), 'd MMMM yyyy', { locale: ro }); } catch { return deadline; } })()
    : 'Select (optional)';

  return (
    <SafeAreaView style={s.container} edges={['top', 'bottom']}>
      <View style={s.header}>
        <TouchableOpacity onPress={onClose} style={s.closeBtn}>
          <Text style={s.closeText}>✕</Text>
        </TouchableOpacity>
        <Text style={s.title}>Obiectiv nou</Text>
        <View style={{ width: 36 }} />
      </View>

      <ScrollView contentContainerStyle={s.body} showsVerticalScrollIndicator={false}>
        {/* Preview */}
        <View style={[s.preview, { backgroundColor: color + '22', borderColor: color }]}>
          <Text style={s.previewEmoji}>{icon}</Text>
          <Text style={s.previewName}>{name || 'Obiectivul meu'}</Text>
        </View>

        <Text style={s.label}>NUME</Text>
        <TextInput
          style={s.input}
          value={name}
          onChangeText={setName}
          placeholder="E.g. Summer vacation"
          placeholderTextColor={colors.text.muted}
        />

        <Text style={s.label}>SUMĂ ȚINTĂ</Text>
        <View style={s.row}>
          <TextInput
            style={[s.input, { flex: 1 }]}
            value={targetStr}
            onChangeText={setTargetStr}
            placeholder="0"
            placeholderTextColor={colors.text.muted}
            keyboardType="decimal-pad"
          />
          <TouchableOpacity style={s.currBtn} onPress={() => setShowCurPicker(true)}>
            <Text style={s.currBtnText}>{currency} ›</Text>
          </TouchableOpacity>
        </View>

        <Text style={s.label}>TERMEN</Text>
        <TouchableOpacity style={s.input} onPress={() => setShowDeadlinePicker(true)}>
          <Text style={{ color: deadline ? colors.text.primary : colors.text.muted, fontSize: 15 }}>
            {deadlineFmt}
          </Text>
        </TouchableOpacity>
        {deadline !== '' && (
          <TouchableOpacity onPress={() => setDeadline('')} style={{ alignSelf: 'flex-start' }}>
            <Text style={{ color: colors.expense, fontSize: 12, marginTop: -4 }}>✕ Șterge termenul</Text>
          </TouchableOpacity>
        )}

        <Text style={s.label}>ICON</Text>
        <View style={s.grid}>
          {GOAL_ICONS.map(ic => (
            <TouchableOpacity
              key={ic}
              style={[s.iconBtn, icon === ic && { borderColor: color, backgroundColor: color + '22' }]}
              onPress={() => setIcon(ic)}
            >
              <Text style={s.iconText}>{ic}</Text>
            </TouchableOpacity>
          ))}
        </View>

        <Text style={s.label}>CULOARE</Text>
        <View style={s.colorRow}>
          {GOAL_COLORS.map(c => (
            <TouchableOpacity
              key={c}
              style={[s.colorBtn, { backgroundColor: c }, color === c && s.colorBtnSelected]}
              onPress={() => setColor(c)}
            />
          ))}
        </View>

        <TouchableOpacity style={s.saveBtn} onPress={handleSave} disabled={saving}>
          <Text style={s.saveBtnText}>{saving ? '...' : 'Save goal'}</Text>
        </TouchableOpacity>
      </ScrollView>

      <DatePickerModal
        visible={showDeadlinePicker}
        value={deadline || toISODate(new Date())}
        onChange={setDeadline}
        onClose={() => setShowDeadlinePicker(false)}
      />
      <BottomSheetPicker
        visible={showCurPicker}
        title="Select currency"
        items={currencyItems}
        selectedKey={currency}
        onSelect={setCurrency}
        onClose={() => setShowCurPicker(false)}
      />
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg.elevated },
  header:    { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: colors.border.default },
  closeBtn:  { width: 36, height: 36, borderRadius: 18, backgroundColor: colors.bg.tertiary, alignItems: 'center', justifyContent: 'center' },
  closeText: { color: colors.text.secondary, fontSize: 14 },
  title:     { fontSize: 17, fontWeight: '600', color: colors.text.primary },
  body:      { padding: 16, gap: 12, paddingBottom: 40 },
  preview:   { alignItems: 'center', padding: 20, borderRadius: 14, borderWidth: 1, gap: 6 },
  previewEmoji:{ fontSize: 44 },
  previewName: { fontSize: 16, fontWeight: '600', color: colors.text.primary },
  label:     { fontSize: 10, fontWeight: '600', color: colors.text.muted, letterSpacing: 0.8 },
  input:     { backgroundColor: colors.bg.tertiary, borderRadius: 10, borderWidth: 1, borderColor: colors.border.default, color: colors.text.primary, fontSize: 15, paddingHorizontal: 14, height: 52, justifyContent: 'center' },
  row:       { flexDirection: 'row', gap: 8, alignItems: 'center' },
  currBtn:   { backgroundColor: colors.bg.tertiary, borderRadius: 10, borderWidth: 1, borderColor: colors.border.default, paddingHorizontal: 14, height: 52, justifyContent: 'center' },
  currBtnText:{ fontSize: 14, fontWeight: '600', color: colors.accent.primary },
  grid:      { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  iconBtn:   { width: 52, height: 52, borderRadius: 10, borderWidth: 1, borderColor: colors.border.default, backgroundColor: colors.bg.tertiary, alignItems: 'center', justifyContent: 'center' },
  iconText:  { fontSize: 24 },
  colorRow:  { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  colorBtn:  { width: 36, height: 36, borderRadius: 18 },
  colorBtnSelected: { borderWidth: 3, borderColor: '#fff' },
  saveBtn:   { backgroundColor: colors.accent.primary, borderRadius: 12, height: 52, alignItems: 'center', justifyContent: 'center', marginTop: 8 },
  saveBtnText:{ fontSize: 15, fontWeight: '700', color: colors.bg.primary },
});
