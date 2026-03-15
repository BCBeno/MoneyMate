import React, { useState, useEffect, useRef } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity,
  ScrollView, Alert, TextInput,
  KeyboardAvoidingView, Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors } from '../../theme';
import { useTransactionsStore } from '../../store/slices/transactionsSlice';
import { getCategories } from '../../database/repositories/categoryRepository';
import { Category } from '../../constants/categories';
import { convertToRON } from '../../services/currencyService';
import { DEFAULT_CURRENCIES } from '../../constants/currencies';
import { toISODate } from '../../utils/formatDate';
import { format } from 'date-fns';
import DatePickerModal from '../../components/common/DatePickerModal';
import BottomSheetPicker, { PickerItem } from '../../components/common/BottomSheetPicker';

interface Props {
  onClose: () => void;
  defaultType?: 'income' | 'expense';
}

export default function AddTransactionScreen({ onClose, defaultType = 'expense' }: Props) {
  const [type, setType]             = useState<'income' | 'expense'>(defaultType);
  const [amountStr, setAmountStr]   = useState('');
  const [description, setDescription] = useState('');
  const [currency, setCurrency]     = useState('RON');
  const [categoryId, setCategoryId] = useState<number | null>(null);
  const [date, setDate]             = useState(toISODate(new Date()));
  const [categories, setCategories] = useState<Category[]>([]);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showCatPicker, setShowCatPicker]   = useState(false);
  const [showCurPicker, setShowCurPicker]   = useState(false);
  const [saving, setSaving]         = useState(false);
  const amountRef = useRef<TextInput>(null);
  const { add } = useTransactionsStore();

  useEffect(() => {
    getCategories(type).then(cats => {
      setCategories(cats);
      setCategoryId(null);
    }).catch(console.error);
  }, [type]);

  // Allow digits and at most one decimal separator (dot or comma)
  const handleAmountChange = (text: string) => {
    const normalized = text.replace(',', '.');
    const cleaned    = normalized.replace(/[^0-9.]/g, '');
    const parts      = cleaned.split('.');
    if (parts.length > 2) return;
    if (parts.length === 2 && parts[1].length > 2) return;
    setAmountStr(cleaned);
  };

  const numericAmount = (): number => parseFloat(amountStr) || 0;

  const handleSave = async () => {
    const num = numericAmount();
    if (!amountStr || num <= 0) {
      Alert.alert('Invalid amount', 'Enter an amount greater than 0.');
      return;
    }
    if (!categoryId) {
      Alert.alert('Category required', 'Please select a category.');
      return;
    }
    setSaving(true);
    try {
      const amount_ron = await convertToRON(num, currency);
      await add({
        type,
        amount:        num,
        currency_code: currency,
        amount_ron,
        category_id:   categoryId,
        description:   description.trim() || undefined,
        date,
      });
      onClose();
    } catch (e) {
      Alert.alert('Error', 'Could not save the transaction.');
      console.error(e);
    } finally {
      setSaving(false);
    }
  };

  const selectedCategory = categories.find(c => c.id === categoryId);
  const selectedCurrency = DEFAULT_CURRENCIES.find(c => c.code === currency);
  const dateFormatted    = format(new Date(date + 'T12:00:00'), 'd MMMM yyyy');
  const amountColor      = type === 'income' ? colors.income : colors.expense;

  const categoryItems: PickerItem[] = categories.map(c => ({
    key: String(c.id), label: c.name, icon: c.icon, color: c.color,
  }));
  const currencyItems: PickerItem[] = DEFAULT_CURRENCIES.map(c => ({
    key: c.code, label: c.code, sublabel: c.name, icon: c.symbol,
  }));

  return (
    <SafeAreaView style={s.container} edges={['top', 'bottom']}>
      {/* Header */}
      <View style={s.header}>
        <Text style={s.screenLabel}>ADD TRANSACTION</Text>
        <TouchableOpacity onPress={onClose} style={s.closeBtn}>
          <Text style={s.closeBtnText}>✕</Text>
        </TouchableOpacity>
      </View>

      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView
          contentContainerStyle={s.body}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* Type toggle */}
          <View style={s.typeToggle}>
            <TouchableOpacity
              style={[s.typeBtn, type === 'expense' && s.typeBtnExpense]}
              onPress={() => setType('expense')}
            >
              <Text style={[s.typeBtnText, type === 'expense' && { color: colors.expense }]}>
                ↓ Expense
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[s.typeBtn, type === 'income' && s.typeBtnIncome]}
              onPress={() => setType('income')}
            >
              <Text style={[s.typeBtnText, type === 'income' && { color: colors.income }]}>
                ↑ Income
              </Text>
            </TouchableOpacity>
          </View>

          {/* Amount */}
          <View style={[s.amountCard, { borderColor: amountColor + '55' }]}>
            <TextInput
              ref={amountRef}
              style={[s.amountInput, { color: amountColor }]}
              value={amountStr}
              onChangeText={handleAmountChange}
              placeholder="0.00"
              placeholderTextColor={colors.text.muted}
              keyboardType="decimal-pad"
              returnKeyType="next"
              autoFocus
              selectTextOnFocus
            />
            <Text style={s.amountCurrencyLabel}>{currency}</Text>
          </View>

          {/* Description / note — appears as title in the transaction list */}
          <View style={s.noteCard}>
            <Text style={s.noteIcon}>✏️</Text>
            <TextInput
              style={s.noteInput}
              value={description}
              onChangeText={setDescription}
              placeholder="Note (e.g. Lidl, Netflix…)"
              placeholderTextColor={colors.text.muted}
              returnKeyType="done"
              maxLength={80}
            />
            {description.length > 0 && (
              <TouchableOpacity onPress={() => setDescription('')} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                <Text style={s.noteClear}>✕</Text>
              </TouchableOpacity>
            )}
          </View>

          {/* Category */}
          <TouchableOpacity style={s.field} onPress={() => setShowCatPicker(true)}>
            <Text style={s.fieldIcon}>{selectedCategory ? selectedCategory.icon : '📂'}</Text>
            <Text style={s.fieldLabel}>Category</Text>
            <Text style={[s.fieldValue, !selectedCategory && s.fieldPlaceholder]}>
              {selectedCategory ? selectedCategory.name : 'Select...'}
            </Text>
            <Text style={s.fieldChevron}>›</Text>
          </TouchableOpacity>

          {/* Date */}
          <TouchableOpacity style={s.field} onPress={() => setShowDatePicker(true)}>
            <Text style={s.fieldIcon}>📅</Text>
            <Text style={s.fieldLabel}>Date</Text>
            <Text style={s.fieldValue}>{dateFormatted}</Text>
            <Text style={s.fieldChevron}>›</Text>
          </TouchableOpacity>

          {/* Currency */}
          <TouchableOpacity style={s.field} onPress={() => setShowCurPicker(true)}>
            <Text style={s.fieldIcon}>💱</Text>
            <Text style={s.fieldLabel}>Currency</Text>
            <Text style={s.fieldValue}>{currency} — {selectedCurrency?.name}</Text>
            <Text style={s.fieldChevron}>›</Text>
          </TouchableOpacity>

          {/* Save */}
          <TouchableOpacity
            style={[s.saveBtn, { backgroundColor: amountColor }]}
            onPress={handleSave}
            disabled={saving}
            activeOpacity={0.85}
          >
            <Text style={s.saveBtnText}>{saving ? '...' : '✓  Save'}</Text>
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>

      <DatePickerModal
        visible={showDatePicker}
        value={date}
        onChange={setDate}
        onClose={() => setShowDatePicker(false)}
      />
      <BottomSheetPicker
        visible={showCatPicker}
        title="Select category"
        items={categoryItems}
        selectedKey={String(categoryId ?? '')}
        onSelect={k => setCategoryId(Number(k))}
        onClose={() => setShowCatPicker(false)}
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
  container:    { flex: 1, backgroundColor: colors.bg.elevated },
  header:       { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: colors.border.default },
  screenLabel:  { fontSize: 9, color: colors.accent.primary, letterSpacing: 1.2, fontWeight: '600' },
  closeBtn:     { width: 30, height: 30, borderRadius: 15, backgroundColor: colors.bg.tertiary, alignItems: 'center', justifyContent: 'center' },
  closeBtnText: { color: colors.text.secondary, fontSize: 12 },

  body: { padding: 16, gap: 12, paddingBottom: 32 },

  typeToggle:     { flexDirection: 'row', backgroundColor: colors.bg.secondary, borderRadius: 8, padding: 2, borderWidth: 1, borderColor: colors.border.default },
  typeBtn:        { flex: 1, paddingVertical: 9, alignItems: 'center', borderRadius: 6 },
  typeBtnExpense: { backgroundColor: 'rgba(248,113,113,0.15)' },
  typeBtnIncome:  { backgroundColor: 'rgba(52,211,153,0.15)' },
  typeBtnText:    { fontSize: 13, fontWeight: '600', color: colors.text.muted },

  amountCard: {
    backgroundColor: colors.bg.secondary,
    borderRadius: 14, borderWidth: 1.5,
    paddingHorizontal: 20, paddingVertical: 8,
    flexDirection: 'row', alignItems: 'center', gap: 8,
  },
  amountInput: {
    flex: 1, fontSize: 40, fontWeight: '700',
    letterSpacing: -1, padding: 0,
  },
  amountCurrencyLabel: {
    fontSize: 16, fontWeight: '600',
    color: colors.text.secondary,
    alignSelf: 'flex-end', paddingBottom: 6,
  },

  // Note / description field
  noteCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: colors.bg.secondary,
    borderRadius: 10,
    padding: 14,
    borderWidth: 1,
    borderColor: colors.border.default,
  },
  noteIcon:  { fontSize: 15 },
  noteInput: {
    flex: 1,
    fontSize: 14,
    color: colors.text.primary,
    padding: 0,
  },
  noteClear: { fontSize: 13, color: colors.text.muted },

  field:            { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: colors.bg.secondary, borderRadius: 10, padding: 14, borderWidth: 1, borderColor: colors.border.default },
  fieldIcon:        { fontSize: 16 },
  fieldLabel:       { fontSize: 11, color: colors.text.muted, width: 60 },
  fieldValue:       { flex: 1, fontSize: 13, color: colors.text.primary, fontWeight: '500' },
  fieldPlaceholder: { color: colors.text.muted, fontWeight: '400' },
  fieldChevron:     { fontSize: 18, color: colors.text.muted },

  saveBtn:     { borderRadius: 12, height: 54, alignItems: 'center', justifyContent: 'center', marginTop: 4 },
  saveBtnText: { fontSize: 16, fontWeight: '700', color: '#0B0D12' },
});
