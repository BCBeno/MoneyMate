import React, { useEffect, useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  Modal, TextInput, Alert, ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors } from '../../theme';
import {
  getCategories,
  createCategory,
  deleteCategory,
} from '../../database/repositories/categoryRepository';
import { Category } from '../../constants/categories';

const ICONS = [
  '🍽️','🚗','💡','❤️','🎬','🛍️','📚','📈','💼','💻','➕','🏠','✈️',
  '📱','🎓','💍','🏖️','💰','🏋️','🎸','📷','🎯','🐾','🎁','🧴','🛒',
  '⚽','🎮','🍺','☕','🏥','🐶','🌿','🔧','📦','🎪','🚀','🎨',
];
const COLOR_PALETTE = [
  '#F97316','#3B82F6','#8B5CF6','#EF4444','#EC4899','#F59E0B',
  '#06B6D4','#10B981','#34D399','#6B7280','#14B8A6','#A855F7',
  '#E11D48','#0EA5E9','#84CC16','#F43F5E',
];

interface Props { onClose: () => void; }

export default function CategoriesScreen({ onClose }: Props) {
  const [categories, setCategories] = useState<Category[]>([]);
  const [tab, setTab]               = useState<'expense' | 'income'>('expense');
  const [showAdd, setShowAdd]       = useState(false);

  // Add form
  const [newName, setNewName]   = useState('');
  const [newIcon, setNewIcon]   = useState('📦');
  const [newColor, setNewColor] = useState('#F97316');
  const [saving, setSaving]     = useState(false);

  const load = useCallback(async () => {
    const cats = await getCategories();
    setCategories(cats);
  }, []);

  useEffect(() => { load(); }, [load]);

  const filtered = categories.filter(c => c.type === tab);

  const handleAdd = async () => {
    if (!newName.trim()) { Alert.alert('Error', 'Please enter a name.'); return; }
    setSaving(true);
    try {
      await createCategory(newName.trim(), newIcon, newColor, tab);
      await load();
      setShowAdd(false);
      setNewName(''); setNewIcon('📦'); setNewColor('#F97316');
    } catch (e: any) {
      Alert.alert('Error', e?.message ?? 'Could not save.');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = (cat: Category) => {
    if (cat.is_default === 1) {
      Alert.alert('Default category', 'Default categories cannot be deleted.');
      return;
    }
    Alert.alert(
      'Delete categorie',
      `Delete "${cat.name}"? Associated transactions will not be removed.`,
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Delete', style: 'destructive', onPress: async () => {
          await deleteCategory(cat.id);
          await load();
        }},
      ]
    );
  };

  return (
    <SafeAreaView style={s.container} edges={['top', 'bottom']}>
      {/* Header */}
      <View style={s.header}>
        <TouchableOpacity onPress={onClose} style={s.backBtn}>
          <Text style={s.backText}>‹ Back</Text>
        </TouchableOpacity>
        <Text style={s.headerTitle}>Categories</Text>
        <TouchableOpacity onPress={() => setShowAdd(true)} style={s.addBtn}>
          <Text style={s.addBtnText}>+ Nou</Text>
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
          <View style={s.catRow}>
            <View style={[s.catIcon, { backgroundColor: cat.color + '26' }]}>
              <Text style={s.catEmoji}>{cat.icon}</Text>
            </View>
            <Text style={s.catName}>{cat.name}</Text>
            {cat.is_default === 1
              ? <Text style={s.defaultBadge}>default</Text>
              : (
                <TouchableOpacity onPress={() => handleDelete(cat)} style={s.delBtn} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                  <Text style={s.delBtnText}>🗑</Text>
                </TouchableOpacity>
              )
            }
          </View>
        )}
      />

      {/* Add category modal */}
      <Modal visible={showAdd} animationType="slide" transparent onRequestClose={() => setShowAdd(false)}>
        <TouchableOpacity style={s.overlay} activeOpacity={1} onPress={() => setShowAdd(false)} />
        <SafeAreaView style={s.sheet} edges={['bottom']}>
          <View style={s.sheetHandle} />
          <Text style={s.sheetTitle}>New {tab === 'expense' ? 'Expense' : 'Income'} category</Text>

          {/* Preview */}
          <View style={[s.preview, { backgroundColor: newColor + '22', borderColor: newColor }]}>
            <Text style={s.previewEmoji}>{newIcon}</Text>
            <Text style={s.previewName}>{newName || 'Category'}</Text>
          </View>

          {/* Name */}
          <TextInput
            style={s.input}
            value={newName}
            onChangeText={setNewName}
            placeholder="Category name..."
            placeholderTextColor={colors.text.muted}
            autoFocus
          />

          {/* Icon picker */}
          <Text style={s.pickerLabel}>ICON</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 4 }}>
            {ICONS.map(ic => (
              <TouchableOpacity
                key={ic}
                style={[s.iconBtn, newIcon === ic && { borderColor: newColor, backgroundColor: newColor + '22' }]}
                onPress={() => setNewIcon(ic)}
              >
                <Text style={s.iconBtnText}>{ic}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>

          {/* Color picker */}
          <Text style={s.pickerLabel}>COLOR</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 16 }}>
            {COLOR_PALETTE.map(c => (
              <TouchableOpacity
                key={c}
                style={[s.colorBtn, { backgroundColor: c }, newColor === c && s.colorBtnSelected]}
                onPress={() => setNewColor(c)}
              />
            ))}
          </ScrollView>

          <TouchableOpacity style={s.saveBtn} onPress={handleAdd} disabled={saving}>
            <Text style={s.saveBtnText}>{saving ? '...' : 'Save categoria'}</Text>
          </TouchableOpacity>
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg.primary },

  header:      { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: colors.border.default },
  backBtn:     { minWidth: 72 },
  backText:    { fontSize: 14, color: colors.accent.primary },
  headerTitle: { fontSize: 15, fontWeight: '600', color: colors.text.primary },
  addBtn:      { backgroundColor: colors.accent.primary, paddingHorizontal: 12, paddingVertical: 5, borderRadius: 6, minWidth: 72, alignItems: 'flex-end' },
  addBtnText:  { color: colors.bg.primary, fontWeight: '700', fontSize: 12 },

  tabRow:         { flexDirection: 'row', margin: 12, backgroundColor: colors.bg.secondary, borderRadius: 8, padding: 2, borderWidth: 1, borderColor: colors.border.default },
  tabBtn:         { flex: 1, paddingVertical: 8, alignItems: 'center', borderRadius: 6 },
  tabBtnActive:   { backgroundColor: 'rgba(0,212,170,0.12)' },
  tabBtnText:     { fontSize: 13, fontWeight: '500', color: colors.text.muted },
  tabBtnTextActive:{ color: colors.accent.primary, fontWeight: '600' },

  list:        { paddingHorizontal: 12, paddingBottom: 40 },
  emptyText:   { textAlign: 'center', color: colors.text.muted, fontSize: 13, paddingVertical: 32 },

  catRow:       { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: 'rgba(30,38,64,0.5)' },
  catIcon:      { width: 36, height: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  catEmoji:     { fontSize: 18 },
  catName:      { flex: 1, fontSize: 14, fontWeight: '500', color: colors.text.primary },
  defaultBadge: { fontSize: 10, color: colors.text.muted, backgroundColor: colors.bg.tertiary, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 4 },
  delBtn:       { padding: 4 },
  delBtnText:   { fontSize: 16 },

  // Sheet
  overlay:     { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.6)' },
  sheet:       { position: 'absolute', bottom: 0, left: 0, right: 0, backgroundColor: colors.bg.elevated, borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 20, paddingBottom: 16, gap: 12, borderTopWidth: 1, borderTopColor: colors.border.default },
  sheetHandle: { width: 36, height: 4, backgroundColor: colors.border.default, borderRadius: 2, alignSelf: 'center', marginBottom: 4 },
  sheetTitle:  { fontSize: 16, fontWeight: '600', color: colors.text.primary },

  preview:     { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 12, borderRadius: 12, borderWidth: 1 },
  previewEmoji:{ fontSize: 24 },
  previewName: { fontSize: 16, fontWeight: '600', color: colors.text.primary },

  input:       { backgroundColor: colors.bg.tertiary, borderRadius: 10, borderWidth: 1, borderColor: colors.border.default, color: colors.text.primary, fontSize: 15, paddingHorizontal: 14, height: 48 },

  pickerLabel: { fontSize: 10, fontWeight: '600', color: colors.text.muted, letterSpacing: 0.8 },
  iconBtn:     { width: 44, height: 44, borderRadius: 10, borderWidth: 1, borderColor: colors.border.default, backgroundColor: colors.bg.secondary, alignItems: 'center', justifyContent: 'center', marginRight: 6 },
  iconBtnText: { fontSize: 22 },
  colorBtn:    { width: 34, height: 34, borderRadius: 17, marginRight: 8 },
  colorBtnSelected: { borderWidth: 3, borderColor: '#fff' },

  saveBtn:     { backgroundColor: colors.accent.primary, borderRadius: 12, height: 50, alignItems: 'center', justifyContent: 'center' },
  saveBtnText: { fontSize: 15, fontWeight: '700', color: colors.bg.primary },
});
