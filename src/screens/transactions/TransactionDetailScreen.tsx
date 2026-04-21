import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity,
  ScrollView, Alert, TextInput, Platform,
} from 'react-native';
import DateTimePicker, { DateTimePickerEvent } from '@react-native-community/datetimepicker';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors } from '../../theme';
import {
  Transaction,
  UpdateTransactionDto,
  getTransactionById,
} from '../../database/repositories/transactionRepository';
import { useTransactionsStore } from '../../store/slices/transactionsSlice';
import { getCategories } from '../../database/repositories/categoryRepository';
import { Category } from '../../constants/categories';
import { convertToRON } from '../../services/currencyService';
import { DEFAULT_CURRENCIES } from '../../constants/currencies';
import { formatCurrency } from '../../utils/formatCurrency';
import { toISODate } from '../../utils/formatDate';
import { format } from 'date-fns';
import BottomSheetPicker, { PickerItem } from '../../components/common/BottomSheetPicker';

interface Props {
  transaction: Transaction;
  onClose: () => void;
  onDeleted: () => void;
  onUpdated?: () => void;
}

export default function TransactionDetailScreen({ transaction, onClose, onDeleted, onUpdated }: Props) {
  const { update, remove } = useTransactionsStore();

  // Live copy of transaction data — gets refreshed after save
  const [current, setCurrent] = useState<Transaction>(transaction);

  const [isEditing, setIsEditing]   = useState(false);
  const [type, setType]             = useState<'income' | 'expense'>(transaction.type);
  const [amountStr, setAmountStr]   = useState(String(transaction.amount));
  const [description, setDescription] = useState(transaction.description ?? '');
  const [currency, setCurrency]     = useState(transaction.currency_code);
  const [categoryId, setCategoryId] = useState<number>(transaction.category_id);
  const [date, setDate]             = useState(transaction.date.substring(0, 10));
  const [categories, setCategories] = useState<Category[]>([]);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showCatPicker, setShowCatPicker]   = useState(false);
  const [showCurPicker, setShowCurPicker]   = useState(false);
  const [saving, setSaving]         = useState(false);

  useEffect(() => {
    if (isEditing) {
      getCategories(type).then(setCategories).catch(console.error);
    }
  }, [isEditing, type]);

  const handleAmountChange = (text: string) => {
    const normalized = text.replace(',', '.');
    const valid = normalized.replace(/[^0-9.]/g, '');
    const parts = valid.split('.');
    if (parts.length > 2) return;
    if (parts.length === 2 && parts[1].length > 2) return;
    setAmountStr(valid);
  };

  const getNumericAmount = () => parseFloat(amountStr.replace(',', '.')) || 0;

  const handleSave = async () => {
    const num = getNumericAmount();
    if (!amountStr || num <= 0) {
      Alert.alert('Invalid amount', 'Enter an amount greater than 0.');
      return;
    }
    setSaving(true);
    try {
      const amount_ron = await convertToRON(num, currency);
      const dto: UpdateTransactionDto = {
        type,
        amount:        num,
        currency_code: currency,
        amount_ron,
        category_id:   categoryId,
        description:   description.trim() || undefined,
        date,
      };
      await update(transaction.id, dto);

      // Fetch fresh data so view mode shows updated values immediately
      const fresh = await getTransactionById(transaction.id);
      if (fresh) setCurrent(fresh);

      onUpdated?.();

      setIsEditing(false); // switch back to view mode — no need to close
    } catch (e) {
      Alert.alert('Error', 'Could not save the changes.');
      console.error(e);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = () => {
    Alert.alert(
      'Delete transaction',
      'This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Delete', style: 'destructive', onPress: async () => {
          await remove(transaction.id);
          onDeleted();
        }},
      ]
    );
  };

  const amountColor   = current.type === 'income' ? colors.income : colors.expense;
  const dateFormatted = (() => {
    try { return format(new Date(date + 'T12:00:00'), 'd MMMM yyyy'); }
    catch { return date; }
  })();
  const viewDateFormatted = (() => {
    try { return format(new Date((current.date ?? date).substring(0, 10) + 'T12:00:00'), 'd MMMM yyyy'); }
    catch { return current.date; }
  })();

  const selectedCategory = categories.find(c => c.id === categoryId);
  const selectedCurrency = DEFAULT_CURRENCIES.find(c => c.code === currency);

  const categoryItems: PickerItem[] = categories.map(c => ({
    key: String(c.id), label: c.name, icon: c.icon, color: c.color,
  }));
  const currencyItems: PickerItem[] = DEFAULT_CURRENCIES.map(c => ({
    key: c.code, label: c.code, sublabel: c.name, icon: c.symbol,
  }));

  const handleDateChange = (event: DateTimePickerEvent, selectedDate?: Date) => {
    if (Platform.OS === 'android') {
      setShowDatePicker(false);
    }
    if (event.type === 'set' && selectedDate) {
      setDate(toISODate(selectedDate));
    }
  };

  // ── View mode ─────────────────────────────────────────────────────────────
  if (!isEditing) {
    return (
      <SafeAreaView style={s.container} edges={['top', 'bottom']}>
        <View style={s.header}>
          <TouchableOpacity onPress={onClose} style={s.headerBtn}>
            <Text style={s.headerBtnText}>‹ Back</Text>
          </TouchableOpacity>
          <Text style={s.headerTitle}>Details</Text>
          <TouchableOpacity
            onPress={() => {
              // Sync edit fields with current (possibly updated) data
              setType(current.type);
              setAmountStr(String(current.amount));
              setDescription(current.description ?? '');
              setCurrency(current.currency_code);
              setCategoryId(current.category_id);
              setDate((current.date ?? '').substring(0, 10));
              setIsEditing(true);
            }}
            style={s.headerBtn}
          >
            <Text style={[s.headerBtnText, { textAlign: 'right' }]}>Edit</Text>
          </TouchableOpacity>
        </View>

        <ScrollView contentContainerStyle={s.viewBody} showsVerticalScrollIndicator={false}>
          {/* Hero */}
          <View style={s.heroCard}>
            <View style={[s.heroIcon, { backgroundColor: (current.category_color ?? '#666') + '26' }]}>
              <Text style={s.heroEmoji}>{current.category_icon ?? '💰'}</Text>
            </View>
            <Text style={s.heroCategory}>{current.category_name}</Text>
            <Text style={[s.heroAmount, { color: amountColor }]}>
              {current.type === 'income' ? '+' : '-'}
              {formatCurrency(current.amount_ron, 'RON', 2)}
            </Text>
            {current.currency_code !== 'RON' && (
              <Text style={s.heroOriginal}>
                {formatCurrency(current.amount, current.currency_code, 2)}
              </Text>
            )}
          </View>

          {/* Detail rows */}
          <View style={s.fieldsCard}>
            <DetailRow label="Type" value={current.type === 'income' ? '↑ Income' : '↓ Expense'} valueColor={amountColor} />
            <DetailRow label="Date" value={viewDateFormatted} />
            <DetailRow label="Currency" value={current.currency_code} />
            {!!current.description && (
              <DetailRow label="Note" value={current.description} />
            )}
            <DetailRow
              label="Added"
              value={format(new Date(current.created_at), 'd MMM yyyy, HH:mm')}
              isLast
            />
          </View>

          <TouchableOpacity style={s.deleteBtn} onPress={handleDelete} activeOpacity={0.8}>
            <Text style={s.deleteBtnText}>Delete transaction</Text>
          </TouchableOpacity>
        </ScrollView>
      </SafeAreaView>
    );
  }

  // ── Edit mode ─────────────────────────────────────────────────────────────
  return (
    <SafeAreaView style={s.container} edges={['top', 'bottom']}>
      <View style={s.header}>
        <TouchableOpacity onPress={() => setIsEditing(false)} style={s.headerBtn}>
          <Text style={s.headerBtnText}>Cancel</Text>
        </TouchableOpacity>
        <Text style={s.headerTitle}>Edit</Text>
        <TouchableOpacity onPress={handleSave} style={s.headerBtn} disabled={saving}>
          <Text style={[s.headerBtnText, { textAlign: 'right', color: colors.accent.primary, fontWeight: '600' }]}>
            {saving ? '...' : 'Save'}
          </Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        contentContainerStyle={s.editBody}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* Type toggle */}
        <View style={s.typeToggle}>
          <TouchableOpacity style={[s.typeBtn, type === 'expense' && s.typeBtnExpense]} onPress={() => setType('expense')}>
            <Text style={[s.typeBtnText, type === 'expense' && { color: colors.expense }]}>↓ Expense</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[s.typeBtn, type === 'income' && s.typeBtnIncome]} onPress={() => setType('income')}>
            <Text style={[s.typeBtnText, type === 'income' && { color: colors.income }]}>↑ Income</Text>
          </TouchableOpacity>
        </View>

        {/* Amount */}
        <View style={[s.amountCard, { borderColor: (type === 'income' ? colors.income : colors.expense) + '55' }]}>
          <TextInput
            style={[s.amountInput, { color: type === 'income' ? colors.income : colors.expense }]}
            value={amountStr}
            onChangeText={handleAmountChange}
            placeholder="0.00"
            placeholderTextColor={colors.text.muted}
            keyboardType="decimal-pad"
            returnKeyType="done"
            selectTextOnFocus
          />
          <Text style={s.amountCurrencyLabel}>{currency}</Text>
        </View>

        {/* Note / description */}
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
            <TouchableOpacity
              onPress={() => setDescription('')}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Text style={s.noteClear}>✕</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Category */}
        <TouchableOpacity style={s.field} onPress={() => setShowCatPicker(true)}>
          <Text style={s.fieldIcon}>{selectedCategory?.icon ?? '📂'}</Text>
          <Text style={s.fieldLabel}>Category</Text>
          <Text style={[s.fieldValue, !selectedCategory && { color: colors.text.muted }]}>
            {selectedCategory?.name ?? 'Select...'}
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
      </ScrollView>

      {showDatePicker && (
        <View style={s.datePickerWrap}>
          <DateTimePicker
            value={new Date(date + 'T12:00:00')}
            mode="date"
            display={Platform.OS === 'ios' ? 'spinner' : 'default'}
            design={Platform.OS === 'android' ? 'material' : undefined}
            themeVariant="dark"
            textColor="#FFFFFF"
            accentColor="#00D4AA"
            onChange={handleDateChange}
          />
          {Platform.OS === 'ios' && (
            <TouchableOpacity style={s.datePickerDoneBtn} onPress={() => setShowDatePicker(false)}>
              <Text style={s.datePickerDoneText}>Done</Text>
            </TouchableOpacity>
          )}
        </View>
      )}
      <BottomSheetPicker visible={showCatPicker} title="Select category" items={categoryItems} selectedKey={String(categoryId)} onSelect={k => setCategoryId(Number(k))} onClose={() => setShowCatPicker(false)} />
      <BottomSheetPicker visible={showCurPicker} title="Select currency" items={currencyItems} selectedKey={currency} onSelect={setCurrency} onClose={() => setShowCurPicker(false)} />
    </SafeAreaView>
  );
}

function DetailRow({ label, value, valueColor, isLast }: {
  label: string; value: string; valueColor?: string; isLast?: boolean;
}) {
  return (
    <View style={[dr.row, isLast && dr.rowLast]}>
      <Text style={dr.label}>{label}</Text>
      <Text style={[dr.value, valueColor ? { color: valueColor } : null]} numberOfLines={2}>
        {value}
      </Text>
    </View>
  );
}

const dr = StyleSheet.create({
  row:     { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 14, paddingVertical: 13, borderBottomWidth: 1, borderBottomColor: 'rgba(30,38,64,0.5)' },
  rowLast: { borderBottomWidth: 0 },
  label:   { fontSize: 13, color: colors.text.secondary },
  value:   { fontSize: 13, fontWeight: '500', color: colors.text.primary, maxWidth: '58%', textAlign: 'right' },
});

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg.primary },

  header:        { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: colors.border.default },
  headerTitle:   { fontSize: 15, fontWeight: '600', color: colors.text.primary },
  headerBtn:     { minWidth: 72, paddingVertical: 4 },
  headerBtnText: { fontSize: 14, color: colors.accent.primary },

  viewBody:     { padding: 16, gap: 14, paddingBottom: 40 },
  heroCard:     { backgroundColor: colors.bg.secondary, borderRadius: 16, borderWidth: 1, borderColor: colors.border.default, padding: 24, alignItems: 'center', gap: 6 },
  heroIcon:     { width: 60, height: 60, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  heroEmoji:    { fontSize: 28 },
  heroCategory: { fontSize: 13, color: colors.text.secondary, marginTop: 4 },
  heroAmount:   { fontSize: 34, fontWeight: '700', letterSpacing: -0.5 },
  heroOriginal: { fontSize: 13, color: colors.text.muted },

  fieldsCard:    { backgroundColor: colors.bg.secondary, borderRadius: 12, borderWidth: 1, borderColor: colors.border.default, overflow: 'hidden' },
  deleteBtn:     { backgroundColor: 'rgba(248,113,113,0.08)', borderWidth: 1, borderColor: 'rgba(248,113,113,0.25)', borderRadius: 12, paddingVertical: 14, alignItems: 'center' },
  deleteBtnText: { fontSize: 14, fontWeight: '600', color: colors.expense },

  editBody:       { padding: 16, gap: 12, paddingBottom: 32 },
  typeToggle:     { flexDirection: 'row', backgroundColor: colors.bg.secondary, borderRadius: 8, padding: 2, borderWidth: 1, borderColor: colors.border.default },
  typeBtn:        { flex: 1, paddingVertical: 9, alignItems: 'center', borderRadius: 6 },
  typeBtnExpense: { backgroundColor: 'rgba(248,113,113,0.15)' },
  typeBtnIncome:  { backgroundColor: 'rgba(52,211,153,0.15)' },
  typeBtnText:    { fontSize: 13, fontWeight: '600', color: colors.text.muted },

  amountCard:          { backgroundColor: colors.bg.secondary, borderRadius: 14, borderWidth: 1.5, paddingHorizontal: 20, paddingVertical: 8, flexDirection: 'row', alignItems: 'center', gap: 8 },
  amountInput:         { flex: 1, fontSize: 40, fontWeight: '700', letterSpacing: -1, padding: 0 },
  amountCurrencyLabel: { fontSize: 16, fontWeight: '600', color: colors.text.secondary, alignSelf: 'flex-end', paddingBottom: 6 },

  noteCard:  { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: colors.bg.secondary, borderRadius: 10, padding: 14, borderWidth: 1, borderColor: colors.border.default },
  noteIcon:  { fontSize: 15 },
  noteInput: { flex: 1, fontSize: 14, color: colors.text.primary, padding: 0 },
  noteClear: { fontSize: 13, color: colors.text.muted },

  field:        { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: colors.bg.secondary, borderRadius: 10, padding: 14, borderWidth: 1, borderColor: colors.border.default },
  fieldIcon:    { fontSize: 16 },
  fieldLabel:   { fontSize: 11, color: colors.text.muted, width: 60 },
  fieldValue:   { flex: 1, fontSize: 13, color: colors.text.primary, fontWeight: '500' },
  fieldChevron: { fontSize: 18, color: colors.text.muted },

  datePickerWrap:    { backgroundColor: '#000000', borderTopWidth: 1, borderTopColor: colors.border.default, paddingVertical: 8 },
  datePickerDoneBtn: { alignSelf: 'flex-end', paddingHorizontal: 16, paddingTop: 4, paddingBottom: 8 },
  datePickerDoneText:{ fontSize: 14, fontWeight: '600', color: colors.accent.primary },
});
