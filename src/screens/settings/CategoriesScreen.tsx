import { CATEGORY_ICONS as ICONS, ICON_COLORS as COLOR_PALETTE, resolveIconName } from '../../constants/icons';
import AppIcon from '../../components/common/AppIcon';
import React, { useEffect, useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  Modal, TextInput, ScrollView, Alert, KeyboardAvoidingView, Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors } from '../../theme';
import {
  getCategories,
  createCategory,
  updateCategory,
  deleteCategory,
} from '../../database/repositories/categoryRepository';
import { Category } from '../../constants/categories';
import { useTransactionsStore } from '../../store/slices/transactionsSlice';




interface Props { onClose: () => void; }

export default function CategoriesScreen({ onClose }: Props) {
  const [categories, setCategories] = useState<Category[]>([]);
  const [tab, setTab]               = useState<'expense' | 'income'>('expense');
  const [showForm, setShowForm]     = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const reloadTransactions = useTransactionsStore(state => state.load);

  // Form state
  const [newName, setNewName]   = useState('');
  const [newIcon, setNewIcon]   = useState("package");
  const [newColor, setNewColor] = useState(colors.warning);
  const [formType, setFormType] = useState<'expense' | 'income'>('expense');
  const [saving, setSaving]     = useState(false);
  const [nameError, setNameError] = useState('');

  const load = useCallback(async () => {
    const cats = await getCategories();
    setCategories(cats);
  }, []);

  useEffect(() => { load(); }, [load]);

  const filtered = categories.filter(c => c.type === tab);

  const resetForm = (nextType?: 'expense' | 'income') => {
    setEditingCategory(null);
    setNewName('');
    setNewIcon("package");
    setNewColor(colors.warning);
    setFormType(nextType ?? tab);
  };

  const openAddForm = () => {
    resetForm(tab);
    setShowForm(true);
  };

  const openEditForm = (cat: Category) => {
    setEditingCategory(cat);
    setNewName(cat.name);
    setNewIcon(resolveIconName(cat.icon));
    setNewColor(cat.color);
    setFormType(cat.type);
    setShowForm(true);
  };

  const closeForm = () => {
    setShowForm(false);
    resetForm();
  };

  const persistSave = async () => {
    if (!newName.trim()) {
      setNameError('Name is required');
      return;
    }
    setSaving(true);
    try {
      if (editingCategory) {
        await updateCategory(editingCategory.id, newName.trim(), newIcon, newColor, formType);
      } else {
        await createCategory(newName.trim(), newIcon, newColor, formType);
      }

      await load();
      await reloadTransactions();
      closeForm();
    } catch (e: any) {
      console.error(e);
    } finally {
      setSaving(false);
    }
  };

  const handleSave = () => {
    if (!editingCategory) {
      void persistSave();
      return;
    }

    Alert.alert(
      'Save changes',
      `Update category "${editingCategory.name}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Save', onPress: () => { void persistSave(); } },
      ]
    );
  };

  const handleDelete = (cat: Category) => {
    Alert.alert(
      'Delete category',
      `Delete "${cat.name}"? Existing transactions will be moved to another category of the same type.`,
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Delete', style: 'destructive', onPress: async () => {
          try {
            await deleteCategory(cat.id);
            await load();
            await reloadTransactions();
            closeForm();
          } catch (e: any) {
            Alert.alert('Error', e?.message ?? 'Could not delete category.');
          }
        }},
      ]
    );
  };

  return (
    <SafeAreaView style={s.container} edges={['top', 'bottom']}>
      {/* Header */}
      <View style={s.header}>
        <TouchableOpacity onPress={onClose} accessibilityLabel="Back" accessibilityRole="button" style={s.backBtn}>
          <AppIcon name="chevron-left" />
        </TouchableOpacity>
        <Text style={s.headerTitle}>Categories</Text>
        <TouchableOpacity onPress={openAddForm} style={s.addBtn}>
          <Text style={s.addBtnText}>+ New</Text>
        </TouchableOpacity>
      </View>

      {/* Type tabs */}
      <View style={s.tabRow}>
        <TouchableOpacity style={[s.tabBtn, tab === 'expense' && s.tabBtnActive]} onPress={() => setTab('expense')}>
          <Text style={[s.tabBtnText, tab === 'expense' && s.tabBtnTextActive]}>Expenses</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[s.tabBtn, tab === 'income' && s.tabBtnActive]} onPress={() => setTab('income')}>
          <Text style={[s.tabBtnText, tab === 'income' && s.tabBtnTextActive]}>Income</Text>
        </TouchableOpacity>
      </View>

      {/* Category list */}
      <FlatList
        data={filtered}
        keyExtractor={c => String(c.id)}
        contentContainerStyle={s.list}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={<Text style={s.emptyText}>No categories</Text>}
        renderItem={({ item: cat }) => (
          <TouchableOpacity style={s.catRow} onPress={() => openEditForm(cat)} activeOpacity={0.75}>
            <View style={[s.catIcon, { backgroundColor: cat.color + '26' }]}>
              <AppIcon name={cat.icon} size={22} color={cat.color} />
            </View>
            <Text style={s.catName}>{cat.name}</Text>
            {cat.is_default === 1 ? <Text style={s.defaultBadge}>Default</Text> : null}
            <AppIcon name="chevron-right" size={20} color={colors.text.secondary} />
          </TouchableOpacity>
        )}
      />

      {/* Category form modal */}
      <Modal visible={showForm} animationType="slide" onRequestClose={closeForm}>

        <SafeAreaView style={s.container} edges={['top', 'bottom']}>
          <View style={s.header}><TouchableOpacity onPress={closeForm} style={s.backBtn} accessibilityRole="button" accessibilityLabel="Back"><AppIcon name="chevron-left" /></TouchableOpacity>
          <Text style={[s.sheetTitle, {flex: 1, textAlign: 'center'}]} numberOfLines={2}>
            {editingCategory ? 'Edit category' : `New ${formType === 'expense' ? 'Expense' : 'Income'} category`}
          </Text>

          </View>
          <KeyboardAvoidingView style={{flex: 1}} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <ScrollView contentContainerStyle={s.formBody} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
          {/* Type picker */}
          <View style={s.tabRow}>
            <TouchableOpacity style={[s.tabBtn, formType === 'expense' && s.tabBtnActive]} onPress={() => setFormType('expense')}>
              <Text style={[s.tabBtnText, formType === 'expense' && s.tabBtnTextActive]}>Expenses</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[s.tabBtn, formType === 'income' && s.tabBtnActive]} onPress={() => setFormType('income')}>
              <Text style={[s.tabBtnText, formType === 'income' && s.tabBtnTextActive]}>Income</Text>
            </TouchableOpacity>
          </View>

          {/* Preview */}
          <View style={[s.preview, { backgroundColor: newColor + '22', borderColor: newColor }]}>
            <AppIcon name={newIcon} size={32} color={newColor} />
            <Text style={s.previewName}>{newName || 'Category'}</Text>
          </View>

          {/* Name */}
          <View>
            <TextInput
              style={[s.input, nameError && s.inputError]}
              value={newName}
              onChangeText={(text) => {
                setNewName(text);
                setNameError('');
              }}
              placeholder="Category name..."
              placeholderTextColor={colors.text.muted}
              autoFocus
            />
            {nameError && <Text style={s.errorMessage}>{nameError}</Text>}
          </View>

          {/* Icon picker */}
          <Text style={s.pickerLabel}>ICON</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 4 }}>
            {ICONS.map(ic => (
              <TouchableOpacity
                key={ic}
                style={[s.iconBtn, newIcon === ic && { borderColor: newColor, backgroundColor: newColor + '22' }]}
                onPress={() => setNewIcon(ic)} accessibilityLabel={ic} accessibilityRole="button" accessibilityState={{selected: newIcon === ic}}
              >
                <AppIcon name={ic} size={22} color={newColor} />
              </TouchableOpacity>
            ))}
          </ScrollView>

          {/* Color picker */}
          <Text style={s.pickerLabel}>COLOR</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 16 }}>
            {[...COLOR_PALETTE, ...(COLOR_PALETTE.includes(newColor) ? [] : [newColor])].map(c => (
              <TouchableOpacity
                key={c}
                style={[s.colorBtn, { backgroundColor: c }, newColor === c && s.colorBtnSelected]}
                onPress={() => setNewColor(c)}
              />
            ))}
          </ScrollView>

          <TouchableOpacity style={s.saveBtn} onPress={handleSave} disabled={saving}>
            <Text style={s.saveBtnText}>{saving ? '...' : (editingCategory ? 'Update category' : 'Save category')}</Text>
          </TouchableOpacity>

          {editingCategory ? (
            <TouchableOpacity
              style={s.deleteModalBtn}
              onPress={() => handleDelete(editingCategory)}
              disabled={saving}
            >
              <Text style={s.deleteModalBtnText}>Delete category</Text>
            </TouchableOpacity>
          ) : null}
        </ScrollView></KeyboardAvoidingView>
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  formBody: {padding: 24, gap: 16, paddingBottom: 40},
  container: { flex: 1, backgroundColor: colors.bg.primary },

  header:      { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 24, paddingVertical: 14, borderBottomWidth: 0, borderBottomColor: colors.border.default, minHeight: 76 },
  backBtn:     { minWidth: 44, minHeight: 44, justifyContent: 'center' },
  backText:    { fontSize: 14, color: colors.accent.primary },
  headerTitle: { fontSize: 19, fontWeight: '600', color: colors.text.primary, flex: 1, textAlign: 'center' },
  addBtn:      { backgroundColor: colors.accent.primary, paddingHorizontal: 12, paddingVertical: 5, borderRadius: 6, minWidth: 72, alignItems: 'flex-end' },
  addBtnText:  { color: colors.bg.primary, fontWeight: '700', fontSize: 12 },

  tabRow:         { flexDirection: 'row', margin: 12, backgroundColor: colors.bg.secondary, borderRadius: 8, padding: 2, borderWidth: 1, borderColor: colors.border.default },
  tabBtn:         { flex: 1, paddingVertical: 8, alignItems: 'center', borderRadius: 6 },
  tabBtnActive:   { backgroundColor: colors.accent.muted },
  tabBtnText:     { fontSize: 13, fontWeight: '500', color: colors.text.muted },
  tabBtnTextActive:{ color: colors.accent.primary, fontWeight: '600' },

  list:        { paddingHorizontal: 12, paddingBottom: 40 },
  emptyText:   { textAlign: 'center', color: colors.text.muted, fontSize: 13, paddingVertical: 32 },

  catRow:       { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: colors.border.subtle },
  catIcon:      { width: 36, height: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  catEmoji:     { fontSize: 18 },
  catName:      { flex: 1, fontSize: 14, fontWeight: '500', color: colors.text.primary },
  defaultBadge: { fontSize: 11, color: colors.text.muted, backgroundColor: colors.bg.tertiary, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 4 },
  chevron:      { fontSize: 20, color: colors.text.muted, paddingLeft: 6 },

  // Sheet
  overlay:     { backgroundColor: colors.overlay },
  sheet:       { position: 'absolute', bottom: 0, left: 0, right: 0, backgroundColor: colors.bg.elevated, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, paddingBottom: 16, gap: 12, borderTopWidth: 1, borderTopColor: colors.border.default },
  sheetHandle: { width: 36, height: 4, backgroundColor: colors.border.default, borderRadius: 2, alignSelf: 'center', marginBottom: 4 },
  sheetTitle:  { fontSize: 20, fontWeight: '600', color: colors.text.primary },

  preview:     { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 20, borderRadius: 16, borderWidth: 1, backgroundColor: colors.bg.secondary, borderColor: colors.border.default },
  previewEmoji:{ fontSize: 24 },
  previewName: { fontSize: 16, fontWeight: '600', color: colors.text.primary },

  input:       { backgroundColor: colors.bg.secondary, borderRadius: 12, borderWidth: 1, borderColor: colors.border.default, color: colors.text.primary, fontSize: 16, paddingHorizontal: 14, height: 48, minHeight: 52 },
  inputError:  { borderWidth: 2, borderColor: colors.expense },
  errorMessage: { fontSize: 12, color: colors.expense, marginTop: 6, marginLeft: 2 },

  pickerLabel: { fontSize: 11, fontWeight: '600', color: colors.text.secondary, letterSpacing: 0.8 },
  iconBtn:     { width: 52, height: 60, borderRadius: 12, borderWidth: 1, borderColor: colors.border.default, backgroundColor: colors.bg.secondary, alignItems: 'center', justifyContent: 'center', marginRight: 6 },
  iconBtnText: { fontSize: 22 },
  colorBtn:    { width: 34, height: 34, borderRadius: 17, marginRight: 8 },
  colorBtnSelected: { borderWidth: 3, borderColor: '#fff' },

  saveBtn:     { backgroundColor: colors.accent.primary, borderRadius: 12, height: 52, alignItems: 'center', justifyContent: 'center' },
  saveBtnText: { fontSize: 15, fontWeight: '700', color: colors.bg.primary },
  deleteModalBtn: { borderRadius: 12, height: 48, alignItems: 'center', justifyContent: 'center', borderWidth: 0, borderColor: 'rgba(239,68,68,0.4)', backgroundColor: colors.bg.negative },
  deleteModalBtnText: { fontSize: 14, fontWeight: '700', color: colors.expense },
});
