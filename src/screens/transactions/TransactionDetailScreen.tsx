import AppIcon from '../../components/common/AppIcon';
import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity,
  ScrollView, Alert, TextInput,
} from 'react-native';
import DatePickerModal from '../../components/common/DatePickerModal';
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
import { format, parseISO } from 'date-fns';
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
    if (!isEditing) return;
    getCategories(type).then(cats => {
      setCategories(cats);
      if (!cats.some((c: Category) => c.id === categoryId)) {
        setCategoryId(cats[0]?.id ?? categoryId);
      }
    }).catch(console.error);
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
    key: c.code, label: c.code, sublabel: c.name, icon: 'coins',
  }));


  // ── View mode ─────────────────────────────────────────────────────────────
  if (!isEditing) {
    return (
      <SafeAreaView style={s.container} edges={['top', 'bottom']}>
        <View style={s.header}>
          <TouchableOpacity onPress={onClose} accessibilityLabel="Back" accessibilityRole="button" style={s.headerBtn}>
            <AppIcon name="chevron-left" />
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
              <AppIcon name={current.category_icon ?? 'wallet'} size={32} color={colors.text.secondary} />
            </View>
            <Text style={s.heroCategory}>{current.category_name}</Text>
            <Text style={[s.heroAmount, { color: amountColor }]}>
              {current.type === 'income' ? '+' : '-'}
              {formatCurrency(current.amount, current.currency_code, 2)}
            </Text>
            {current.currency_code !== 'RON' && (
              <Text style={s.heroOriginal}>
                {formatCurrency(current.amount_ron, 'RON', 2)}
              </Text>
            )}
          </View>

          {/* Detail rows */}
          <View style={s.fieldsCard}>
            <DetailRow label="Type" value={current.type === 'income' ? 'Income' : 'Expense'} valueColor={amountColor} />
            <DetailRow label="Date" value={viewDateFormatted} />
            <DetailRow label="Currency" value={current.currency_code} />
            {!!current.description && (
              <DetailRow label="Note" value={current.description} />
            )}
            <DetailRow
              label="Added"
              value={format(parseISO(current.created_at.replace(' ', 'T') + 'Z'), 'd MMM yyyy, HH:mm')}
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
          <AppIcon name="edit-3" size={20} color={colors.text.secondary} />
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
              <AppIcon name="x" size={20} color={colors.text.secondary} />
            </TouchableOpacity>
          )}
        </View>

        {/* Category */}
        <TouchableOpacity style={s.field} onPress={() => setShowCatPicker(true)}>
          <AppIcon name={selectedCategory?.icon ?? 'folder'} size={22} color={colors.text.secondary} />
          <View style={{ flex: 1, minWidth: 0 }}><Text style={s.fieldLabel}>Category</Text><Text style={[s.fieldValue, !selectedCategory && { color: colors.text.muted }]}>
            {selectedCategory?.name ?? 'Select...'}
          </Text></View>
          <AppIcon name="chevron-right" size={20} color={colors.text.secondary} />
        </TouchableOpacity>

        {/* Date */}
        <TouchableOpacity style={s.field} onPress={() => setShowDatePicker(true)}>
          <AppIcon name="calendar" size={20} color={colors.text.secondary} />
          <View style={{ flex: 1, minWidth: 0 }}><Text style={s.fieldLabel}>Date</Text><Text style={s.fieldValue}>{dateFormatted}</Text></View>
          <AppIcon name="chevron-right" size={20} color={colors.text.secondary} />
        </TouchableOpacity>

        {/* Currency */}
        <TouchableOpacity style={s.field} onPress={() => setShowCurPicker(true)}>
          <AppIcon name="coins" size={20} color={colors.text.secondary} />
          <View style={{ flex: 1, minWidth: 0 }}><Text style={s.fieldLabel}>Currency</Text><Text style={s.fieldValue}>{currency} — {selectedCurrency?.name}</Text></View>
          <AppIcon name="chevron-right" size={20} color={colors.text.secondary} />
        </TouchableOpacity>
      </ScrollView>

      <DatePickerModal
        visible={showDatePicker}
        value={date}
        onChange={setDate}
        onClose={() => setShowDatePicker(false)}
      />
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
  row:     { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 14, paddingVertical: 13, borderBottomWidth: 1, borderBottomColor: colors.border.subtle },
  rowLast: { borderBottomWidth: 0 },
  label:   { fontSize: 11, color: colors.text.secondary },
  value:   { fontSize: 13, fontWeight: '500', color: colors.text.primary, maxWidth: '58%', textAlign: 'right' },
});

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg.primary },

  header:        { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 24, paddingVertical: 14, borderBottomWidth: 0, borderBottomColor: colors.border.default, minHeight: 76 },
  headerTitle:   { fontSize: 19, fontWeight: '600', color: colors.text.primary, flex: 1, textAlign: 'center' },
  headerBtn:     { minWidth: 44, paddingVertical: 4, minHeight: 44, justifyContent: 'center' },
  headerBtnText: { fontSize: 14, color: colors.accent.primary },

  viewBody:     { padding: 24, gap: 16, paddingBottom: 40 },
  heroCard:     { backgroundColor: 'transparent', borderRadius: 16, borderWidth: 0, borderColor: colors.border.default, padding: 24, alignItems: 'center', gap: 12, paddingVertical: 20, paddingHorizontal: 0 },
  heroIcon:     { width: 70, height: 70, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  heroEmoji:    { fontSize: 28 },
  heroCategory: { fontSize: 13, color: colors.text.secondary, marginTop: 4 },
  heroAmount:   { fontSize: 36, fontWeight: '700', letterSpacing: -0.5, fontVariant: ['tabular-nums'] },
  heroOriginal: { fontSize: 13, color: colors.text.muted },

  fieldsCard:    { backgroundColor: colors.bg.secondary, borderRadius: 16, borderWidth: 1, borderColor: colors.border.default, overflow: 'hidden' },
  deleteBtn:     { backgroundColor: colors.bg.negative, borderWidth: 0, borderColor: 'rgba(248,113,113,0.25)', borderRadius: 12, paddingVertical: 14, alignItems: 'center', minHeight: 52 },
  deleteBtnText: { fontSize: 14, fontWeight: '600', color: colors.expense },

  editBody:       { padding: 24, gap: 16, paddingBottom: 32 },
  typeToggle:     { flexDirection: 'row', backgroundColor: colors.bg.secondary, borderRadius: 12, padding: 4, borderWidth: 0, borderColor: colors.border.default, gap: 6 },
  typeBtn:        { flex: 1, paddingVertical: 9, alignItems: 'center', borderRadius: 9, minHeight: 40 },
  typeBtnExpense: { backgroundColor: colors.bg.negative },
  typeBtnIncome:  { backgroundColor: colors.accent.muted },
  typeBtnText:    { fontSize: 13, fontWeight: '600', color: colors.text.muted },

  amountCard:          { backgroundColor: 'transparent', borderRadius: 14, borderWidth: 0, paddingHorizontal: 20, paddingVertical: 24, flexDirection: 'column', alignItems: 'center', gap: 8 },
  amountInput:         { flex: 0, fontSize: 46, fontWeight: '700', letterSpacing: -1, padding: 0, textAlign: 'center', width: '100%', color: colors.text.primary },
  amountCurrencyLabel: { fontSize: 13, fontWeight: '600', color: colors.text.secondary, alignSelf: 'center', paddingBottom: 6 },

  noteCard:  { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: colors.bg.secondary, borderRadius: 12, padding: 14, borderWidth: 1, borderColor: colors.border.default, minHeight: 52 },
  noteIcon:  { fontSize: 15 },
  noteInput: { flex: 1, fontSize: 16, color: colors.text.primary, padding: 0 },
  noteClear: { fontSize: 13, color: colors.text.muted },

  field:        { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: colors.bg.secondary, borderRadius: 12, padding: 14, borderWidth: 1, borderColor: colors.border.default, minHeight: 68 },
  fieldIcon:    { fontSize: 16 },
  fieldLabel:   { fontSize: 11, color: colors.text.secondary, width: undefined },
  fieldValue:   { fontSize: 14, color: colors.text.primary, fontWeight: '500' },
  fieldChevron: { fontSize: 18, color: colors.text.muted },

});
