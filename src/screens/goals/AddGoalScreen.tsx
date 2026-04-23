import React, { useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity,
  ScrollView, TextInput,
  Platform,
} from 'react-native';
import DateTimePicker, { DateTimePickerEvent } from '@react-native-community/datetimepicker';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors, spacing } from '../../theme';
import { useGoalsStore } from '../../store/slices/goalsSlice';
import { DEFAULT_CURRENCIES } from '../../constants/currencies';
import { toISODate } from '../../utils/formatDate';
import BottomSheetPicker, { PickerItem } from '../../components/common/BottomSheetPicker';
import { format } from 'date-fns';
import { enUS } from 'date-fns/locale';

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
  const [nameError, setNameError] = useState('');
  const [targetError, setTargetError] = useState('');
  const { add } = useGoalsStore();

  const handleSave = async () => {
    const targetInput = targetStr.trim();
    const target = targetInput === '' ? 0 : parseFloat(targetInput);
    let hasError = false;

    if (!name.trim()) {
      setNameError('Name is required');
      hasError = true;
    }
    if (targetInput !== '' && (isNaN(target) || target <= 0)) {
      setTargetError('Target must be greater than 0');
      hasError = true;
    }
    if (hasError) return;

    setSaving(true);
    try {
      await add({ name: name.trim(), target_amount: target, currency_code: currency, icon, color, deadline: deadline || undefined });
      onClose();
    } catch (e) {
      console.error(e);
    } finally {
      setSaving(false);
    }
  };

  const currencyItems: PickerItem[] = DEFAULT_CURRENCIES.map(c => ({
    key: c.code, label: c.code, sublabel: c.name, icon: c.symbol,
  }));

  const handleDeadlineChange = (event: DateTimePickerEvent, selectedDate?: Date) => {
    if (Platform.OS === 'android') {
      setShowDeadlinePicker(false);
    }
    if (event.type === 'set' && selectedDate) {
      setDeadline(toISODate(selectedDate));
    }
  };

  const deadlineFmt = deadline
    ? (() => { try { return format(new Date(deadline + 'T12:00:00'), 'd MMMM yyyy', { locale: enUS }); } catch { return deadline; } })()
    : 'Select (optional)';

  return (
    <SafeAreaView style={s.container} edges={['top', 'bottom']}>
      <View style={s.header}>
        <TouchableOpacity onPress={onClose} style={s.closeBtn}>
          <Text style={s.closeText}>✕</Text>
        </TouchableOpacity>
        <Text style={s.title}>New goal</Text>
        <View style={{ width: 36 }} />
      </View>

      <ScrollView contentContainerStyle={s.body} showsVerticalScrollIndicator={false}>
        {/* Preview */}
        <View style={[s.preview, { backgroundColor: color + '22', borderColor: color }]}>
          <Text style={s.previewEmoji}>{icon}</Text>
          <Text style={s.previewName}>{name || 'My goal'}</Text>
        </View>

        <View>
          <Text style={s.label}>NAME</Text>
          <TextInput
            style={[s.input, nameError && s.inputError]}
            value={name}
            onChangeText={(text) => {
              setName(text);
              setNameError('');
            }}
            placeholder="E.g. Summer vacation"
            placeholderTextColor={colors.text.muted}
          />
          {nameError && <Text style={s.errorMessage}>{nameError}</Text>}
        </View>

        <View>
          <Text style={s.label}>TARGET AMOUNT (optional)</Text>
          <View style={s.row}>
            <TextInput
              style={[s.input, { flex: 1 }, targetError && s.inputError]}
              value={targetStr}
              onChangeText={(text) => {
                setTargetStr(text);
                setTargetError('');
              }}
              placeholder="Select a target amount (optional)"
              placeholderTextColor={colors.text.muted}
              keyboardType="decimal-pad"
            />
            <TouchableOpacity style={s.currBtn} onPress={() => setShowCurPicker(true)}>
              <Text style={s.currBtnText}>{currency} ›</Text>
            </TouchableOpacity>
          </View>
          {targetError && <Text style={s.errorMessage}>{targetError}</Text>}
        </View>

        <Text style={s.label}>DEADLINE</Text>
        <TouchableOpacity style={s.input} onPress={() => setShowDeadlinePicker(true)}>
          <Text style={{ color: deadline ? colors.text.primary : colors.text.muted, fontSize: 15 }}>
            {deadlineFmt}
          </Text>
        </TouchableOpacity>
        {deadline !== '' && (
          <TouchableOpacity onPress={() => setDeadline('')} style={{ alignSelf: 'flex-start' }}>
            <Text style={{ color: colors.expense, fontSize: 12, marginTop: -4 }}>✕ Remove deadline</Text>
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

        <Text style={s.label}>COLOR</Text>
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

      {showDeadlinePicker && (
        <View style={s.datePickerWrap}>
          <DateTimePicker
            value={new Date((deadline || toISODate(new Date())) + 'T12:00:00')}
            mode="date"
            display={Platform.OS === 'ios' ? 'spinner' : 'default'}
            onChange={handleDeadlineChange}
          />
          {Platform.OS === 'ios' && (
            <TouchableOpacity style={s.datePickerDoneBtn} onPress={() => setShowDeadlinePicker(false)}>
              <Text style={s.datePickerDoneText}>Done</Text>
            </TouchableOpacity>
          )}
        </View>
      )}
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
  inputError: { borderWidth: 2, borderColor: colors.expense },
  errorMessage: { fontSize: 12, color: colors.expense, marginTop: 6, marginLeft: 2 },
  row:       { flexDirection: 'row', gap: 8, alignItems: 'center' },
  currBtn:   { backgroundColor: colors.bg.tertiary, borderRadius: 10, borderWidth: 1, borderColor: colors.border.default, paddingHorizontal: 14, height: 52, justifyContent: 'center' },
  currBtnText:{ fontSize: 14, fontWeight: '600', color: colors.accent.primary },
  datePickerWrap:    { backgroundColor: '#000000', borderTopWidth: 1, borderTopColor: colors.border.default, paddingVertical: 8 },
  datePickerDoneBtn: { alignSelf: 'flex-end', paddingHorizontal: 16, paddingTop: 4, paddingBottom: 8 },
  datePickerDoneText:{ fontSize: 14, fontWeight: '600', color: colors.accent.primary },
  grid:      { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  iconBtn:   { width: 52, height: 52, borderRadius: 10, borderWidth: 1, borderColor: colors.border.default, backgroundColor: colors.bg.tertiary, alignItems: 'center', justifyContent: 'center' },
  iconText:  { fontSize: 24 },
  colorRow:  { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  colorBtn:  { width: 36, height: 36, borderRadius: 18 },
  colorBtnSelected: { borderWidth: 3, borderColor: '#fff' },
  saveBtn:   { backgroundColor: colors.accent.primary, borderRadius: 12, height: 52, alignItems: 'center', justifyContent: 'center', marginTop: 8 },
  saveBtnText:{ fontSize: 15, fontWeight: '700', color: colors.bg.primary },
});
