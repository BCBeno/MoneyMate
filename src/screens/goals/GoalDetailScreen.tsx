import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  TextInput, Alert, Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors, spacing } from '../../theme';
import {
  Goal,
  GoalContribution,
  UpdateGoalDto,
  getContributions,
} from '../../database/repositories/goalRepository';
import { useGoalsStore } from '../../store/slices/goalsSlice';
import { formatCurrency } from '../../utils/formatCurrency';
import { toISODate } from '../../utils/formatDate';
import { format } from 'date-fns';
import { enUS } from 'date-fns/locale';
import DatePickerModal from '../../components/common/DatePickerModal';
import BottomSheetPicker, { PickerItem } from '../../components/common/BottomSheetPicker';
import { DEFAULT_CURRENCIES } from '../../constants/currencies';

const GOAL_ICONS = ['🏠','🚗','✈️','💻','📱','🎓','💍','🏖️','💰','🏋️','🎸','📷','🎯','🛒','🐾'];
const GOAL_COLORS = ['#00D4AA','#3B82F6','#F97316','#EC4899','#8B5CF6','#34D399','#F59E0B','#EF4444','#06B6D4','#10B981'];

interface Props {
  goal: Goal;
  onClose: () => void;
  onDeleted: () => void;
}

export default function GoalDetailScreen({ goal, onClose, onDeleted }: Props) {
  const { edit, remove, contribute, removeContribution, setStatus } = useGoalsStore();

  const [isEditing, setIsEditing]       = useState(false);
  const [contributions, setContributions] = useState<GoalContribution[]>([]);

  // edit fields
  const [name, setName]         = useState(goal.name);
  const [targetStr, setTargetStr] = useState(String(goal.target_amount));
  const [currency, setCurrency] = useState(goal.currency_code);
  const [icon, setIcon]         = useState(goal.icon);
  const [color, setColor]       = useState(goal.color);
  const [deadline, setDeadline] = useState(goal.deadline ?? '');
  const [note, setNote]         = useState(goal.note ?? '');

  // contribute
  const [contribStr, setContribStr]   = useState('');
  const [contribNote, setContribNote] = useState('');
  const [showContrib, setShowContrib] = useState(false);
  const [contribSaving, setContribSaving] = useState(false);

  // pickers
  const [showDeadlinePicker, setShowDeadlinePicker] = useState(false);
  const [showCurPicker, setShowCurPicker]           = useState(false);

  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadContributions();
  }, []);

  const loadContributions = async () => {
    try {
      const list = await getContributions(goal.id);
      setContributions(list);
    } catch (e) {
      console.error(e);
    }
  };

  const pct        = Math.min(100, (goal.current_amount / goal.target_amount) * 100);
  const deadlineFmt = goal.deadline
    ? (() => {
        try { return format(new Date(goal.deadline + 'T12:00:00'), 'd MMMM yyyy', { locale: enUS }); }
        catch { return goal.deadline; }
      })()
    : 'No deadline';

  // ── Save edit ──
  const handleSaveEdit = async () => {
    const target = parseFloat(targetStr);
    if (!name.trim()) { Alert.alert('Error', 'Please enter a name.'); return; }
    if (isNaN(target) || target <= 0) { Alert.alert('Error', 'Please enter the target amount.'); return; }
    setSaving(true);
    try {
      const dto: UpdateGoalDto = {
        name: name.trim(), target_amount: target,
        currency_code: currency, icon, color,
        deadline: deadline || undefined,
        note: note || undefined,
      };
      await edit(goal.id, dto);
      setIsEditing(false);
      onClose();
    } catch (e) {
      Alert.alert('Error', 'Could not save.');
      console.error(e);
    } finally {
      setSaving(false);
    }
  };

  // ── Add contribution ──
  const handleAddContrib = async () => {
    const amount = parseFloat(contribStr);
    if (isNaN(amount) || amount <= 0) { Alert.alert('Invalid amount'); return; }
    setContribSaving(true);
    try {
      await contribute(goal.id, amount, toISODate(new Date()), contribNote || undefined);
      setContribStr(''); setContribNote('');
      setShowContrib(false);
      await loadContributions();
    } catch (e) {
      Alert.alert('Error', 'Could not add contribution.');
      console.error(e);
    } finally {
      setContribSaving(false);
    }
  };

  // ── Delete contribution ──
  const handleDeleteContrib = (c: GoalContribution) => {
    Alert.alert('Delete contribution', `${formatCurrency(c.amount, goal.currency_symbol ?? 'RON', 2)} on ${c.date}`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: async () => {
        await removeContribution(c.id, goal.id, c.amount);
        await loadContributions();
      }},
    ]);
  };

  // ── Delete goal ──
  const handleDelete = () => {
    Alert.alert('Delete goal', 'This action cannot be undone.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: async () => {
        await remove(goal.id);
        onDeleted();
      }},
    ]);
  };

  const currencyItems: PickerItem[] = DEFAULT_CURRENCIES.map(c => ({
    key: c.code, label: c.code, sublabel: c.name, icon: c.symbol,
  }));

  // ────────────────────────────────────────────────────────────────────────────
  // VIEW mode
  // ────────────────────────────────────────────────────────────────────────────
  if (!isEditing) {
    return (
      <SafeAreaView style={s.container} edges={['top', 'bottom']}>
        <View style={s.header}>
          <TouchableOpacity onPress={onClose} style={s.headerBtn}>
            <Text style={s.headerBtnText}>‹ Back</Text>
          </TouchableOpacity>
          <Text style={s.headerTitle} numberOfLines={1}>{goal.name}</Text>
          <TouchableOpacity onPress={() => setIsEditing(true)} style={s.headerBtn}>
            <Text style={[s.headerBtnText, { textAlign: 'right' }]}>Edit</Text>
          </TouchableOpacity>
        </View>

        <ScrollView contentContainerStyle={s.viewBody} showsVerticalScrollIndicator={false}>
          {/* Hero */}
          <View style={[s.heroCard, { borderColor: goal.color + '44' }]}>
            <View style={[s.heroIcon, { backgroundColor: goal.color + '22' }]}>
              <Text style={s.heroEmoji}>{goal.icon}</Text>
            </View>
            <Text style={s.heroName}>{goal.name}</Text>
            <Text style={[s.heroAmount, { color: goal.color }]}>
              {formatCurrency(goal.current_amount, goal.currency_symbol ?? 'RON', 0)}
            </Text>
            <Text style={s.heroTarget}>
              of {formatCurrency(goal.target_amount, goal.currency_symbol ?? 'RON', 0)}
            </Text>
            <View style={s.progressBg}>
              <View style={[s.progressFill, { width: `${pct}%` as any, backgroundColor: goal.color }]} />
            </View>
            <Text style={[s.heroPct, { color: goal.color }]}>{Math.round(pct)}%</Text>
          </View>

          {/* Info rows */}
          <View style={s.fieldsCard}>
            <InfoRow label="Status" value={goal.status === 'active' ? 'Active' : goal.status === 'completed' ? 'Completed' : 'Paused'} />
            <InfoRow label="Deadline" value={deadlineFmt} />
            <InfoRow label="Currency" value={goal.currency_code} />
            {!!goal.note && <InfoRow label="Note" value={goal.note} isLast />}
          </View>

          {/* Status toggle */}
          {goal.status !== 'completed' && (
            <View style={s.statusRow}>
              <TouchableOpacity
                style={[s.statusBtn, goal.status === 'active' && s.statusBtnActive]}
                onPress={() => setStatus(goal.id, 'active')}
              >
                <Text style={[s.statusBtnText, goal.status === 'active' && { color: colors.accent.primary }]}>Active</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[s.statusBtn, goal.status === 'paused' && s.statusBtnPaused]}
                onPress={() => setStatus(goal.id, 'paused')}
              >
                <Text style={[s.statusBtnText, goal.status === 'paused' && { color: colors.warning }]}>Paused</Text>
              </TouchableOpacity>
            </View>
          )}

          {/* Add contribution */}
          {goal.status === 'active' && (
            <TouchableOpacity style={s.contribBtn} onPress={() => setShowContrib(true)}>
              <Text style={s.contribBtnText}>+ Add contribution</Text>
            </TouchableOpacity>
          )}

          {/* Contributions list */}
          {contributions.length > 0 && (
            <View style={s.section}>
              <Text style={s.sectionTitle}>Contributions</Text>
              {contributions.map(c => (
                <TouchableOpacity
                  key={c.id}
                  style={s.contribItem}
                  onLongPress={() => handleDeleteContrib(c)}
                  activeOpacity={0.8}
                >
                  <View style={s.contribLeft}>
                    <Text style={s.contribDate}>
                      {format(new Date(c.date + 'T12:00:00'), 'd MMM yyyy', { locale: enUS })}
                    </Text>
                    {!!c.note && <Text style={s.contribNote}>{c.note}</Text>}
                  </View>
                  <Text style={[s.contribAmount, { color: goal.color }]}>
                    +{formatCurrency(c.amount, goal.currency_symbol ?? 'RON', 2)}
                  </Text>
                </TouchableOpacity>
              ))}
              <Text style={s.contribHint}>Long press a contribution to delete it</Text>
            </View>
          )}

          {/* Delete */}
          <TouchableOpacity style={s.deleteBtn} onPress={handleDelete} activeOpacity={0.8}>
            <Text style={s.deleteBtnText}>🗑  Delete goal</Text>
          </TouchableOpacity>
        </ScrollView>

        {/* Add contribution sheet */}
        <Modal visible={showContrib} transparent animationType="slide" onRequestClose={() => setShowContrib(false)}>
          <TouchableOpacity style={s.sheetOverlay} activeOpacity={1} onPress={() => setShowContrib(false)} />
          <View style={s.sheet}>
            <View style={s.sheetHandle} />
            <Text style={s.sheetTitle}>Add contribution</Text>
            <TextInput
              style={s.sheetInput}
              value={contribStr}
              onChangeText={setContribStr}
              placeholder={`0.00 ${goal.currency_symbol ?? 'RON'}`}
              placeholderTextColor={colors.text.muted}
              keyboardType="decimal-pad"
              autoFocus
            />
            <TextInput
              style={[s.sheetInput, { fontSize: 14, height: 44 }]}
              value={contribNote}
              onChangeText={setContribNote}
              placeholder="Optional note"
              placeholderTextColor={colors.text.muted}
            />
            <TouchableOpacity
              style={s.sheetBtn}
              onPress={handleAddContrib}
              disabled={contribSaving}
            >
              <Text style={s.sheetBtnText}>{contribSaving ? '...' : 'Add'}</Text>
            </TouchableOpacity>
          </View>
        </Modal>
      </SafeAreaView>
    );
  }

  // ────────────────────────────────────────────────────────────────────────────
  // EDIT mode
  // ────────────────────────────────────────────────────────────────────────────
  return (
    <SafeAreaView style={s.container} edges={['top', 'bottom']}>
      <View style={s.header}>
        <TouchableOpacity onPress={() => setIsEditing(false)} style={s.headerBtn}>
          <Text style={s.headerBtnText}>Cancel</Text>
        </TouchableOpacity>
        <Text style={s.headerTitle}>Edit</Text>
        <TouchableOpacity onPress={handleSaveEdit} style={s.headerBtn} disabled={saving}>
          <Text style={[s.headerBtnText, { textAlign: 'right', color: colors.accent.primary, fontWeight: '600' }]}>
            {saving ? '...' : 'Save'}
          </Text>
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={s.editBody} showsVerticalScrollIndicator={false}>
        {/* Preview */}
        <View style={[s.preview, { backgroundColor: color + '22', borderColor: color }]}>
          <Text style={s.previewEmoji}>{icon}</Text>
          <Text style={s.previewName}>{name || 'My goal'}</Text>
        </View>

        {/* Name */}
        <Text style={s.label}>NAME</Text>
        <TextInput
          style={s.input}
          value={name}
          onChangeText={setName}
          placeholder="E.g. Summer vacation"
          placeholderTextColor={colors.text.muted}
        />

        {/* Target amount */}
        <Text style={s.label}>TARGET AMOUNT</Text>
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

        {/* Deadline picker */}
        <Text style={s.label}>DEADLINE</Text>
        <TouchableOpacity style={s.input} onPress={() => setShowDeadlinePicker(true)}>
          <Text style={{ color: deadline ? colors.text.primary : colors.text.muted, fontSize: 15 }}>
            {deadline
              ? (() => { try { return format(new Date(deadline + 'T12:00:00'), 'd MMMM yyyy', { locale: enUS }); } catch { return deadline; } })()
              : 'Select deadline (optional)'}
          </Text>
        </TouchableOpacity>
        {deadline !== '' && (
          <TouchableOpacity onPress={() => setDeadline('')} style={{ alignSelf: 'flex-start' }}>
            <Text style={{ color: colors.expense, fontSize: 12, marginTop: -4 }}>✕ Remove deadline</Text>
          </TouchableOpacity>
        )}

        {/* Icon */}
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

        {/* Color */}
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

        {/* Note */}
        <Text style={s.label}>NOTE (optional)</Text>
        <TextInput
          style={[s.input, { height: 72, textAlignVertical: 'top', paddingTop: 12 }]}
          value={note}
          onChangeText={setNote}
          placeholder="Additional note..."
          placeholderTextColor={colors.text.muted}
          multiline
        />
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

function InfoRow({ label, value, isLast }: { label: string; value: string; isLast?: boolean }) {
  return (
    <View style={[ir.row, isLast && ir.rowLast]}>
      <Text style={ir.label}>{label}</Text>
      <Text style={ir.value}>{value}</Text>
    </View>
  );
}

const ir = StyleSheet.create({
  row:     { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 14, paddingVertical: 13, borderBottomWidth: 1, borderBottomColor: 'rgba(30,38,64,0.5)' },
  rowLast: { borderBottomWidth: 0 },
  label:   { fontSize: 13, color: colors.text.secondary },
  value:   { fontSize: 13, fontWeight: '500', color: colors.text.primary },
});

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg.primary },

  header:        { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: colors.border.default },
  headerTitle:   { fontSize: 15, fontWeight: '600', color: colors.text.primary, flex: 1, textAlign: 'center' },
  headerBtn:     { minWidth: 72, paddingVertical: 4 },
  headerBtnText: { fontSize: 14, color: colors.accent.primary },

  viewBody: { padding: 16, gap: 14, paddingBottom: 40 },
  heroCard: { backgroundColor: colors.bg.secondary, borderRadius: 16, borderWidth: 1, padding: 24, alignItems: 'center', gap: 4 },
  heroIcon: { width: 64, height: 64, borderRadius: 18, alignItems: 'center', justifyContent: 'center', marginBottom: 4 },
  heroEmoji:   { fontSize: 32 },
  heroName:    { fontSize: 16, fontWeight: '700', color: colors.text.primary },
  heroAmount:  { fontSize: 32, fontWeight: '700', letterSpacing: -0.5, marginTop: 4 },
  heroTarget:  { fontSize: 13, color: colors.text.secondary },
  progressBg:  { width: '100%', height: 6, backgroundColor: colors.bg.elevated, borderRadius: 3, overflow: 'hidden', marginTop: 12 },
  progressFill:{ height: 6, borderRadius: 3 },
  heroPct:     { fontSize: 13, fontWeight: '700' },

  fieldsCard:  { backgroundColor: colors.bg.secondary, borderRadius: 12, borderWidth: 1, borderColor: colors.border.default, overflow: 'hidden' },

  statusRow:   { flexDirection: 'row', gap: 8 },
  statusBtn:   { flex: 1, paddingVertical: 10, alignItems: 'center', backgroundColor: colors.bg.secondary, borderRadius: 10, borderWidth: 1, borderColor: colors.border.default },
  statusBtnActive: { borderColor: colors.accent.primary, backgroundColor: 'rgba(0,212,170,0.1)' },
  statusBtnPaused: { borderColor: colors.warning, backgroundColor: 'rgba(251,191,36,0.1)' },
  statusBtnText:   { fontSize: 13, fontWeight: '500', color: colors.text.secondary },

  contribBtn:     { backgroundColor: colors.accent.primary, borderRadius: 12, paddingVertical: 14, alignItems: 'center' },
  contribBtnText: { fontSize: 14, fontWeight: '700', color: colors.bg.primary },

  section:      { gap: 6 },
  sectionTitle: { fontSize: 10, fontWeight: '600', color: colors.text.secondary, textTransform: 'uppercase', letterSpacing: 0.6 },
  contribItem:  { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: colors.bg.secondary, borderRadius: 10, padding: 12, borderWidth: 1, borderColor: colors.border.default },
  contribLeft:  { flex: 1 },
  contribDate:  { fontSize: 13, fontWeight: '500', color: colors.text.primary },
  contribNote:  { fontSize: 11, color: colors.text.muted, marginTop: 2 },
  contribAmount:{ fontSize: 14, fontWeight: '700' },
  contribHint:  { fontSize: 10, color: colors.text.muted, textAlign: 'center', marginTop: 2 },

  deleteBtn:    { backgroundColor: 'rgba(248,113,113,0.08)', borderWidth: 1, borderColor: 'rgba(248,113,113,0.25)', borderRadius: 12, paddingVertical: 14, alignItems: 'center' },
  deleteBtnText:{ fontSize: 14, fontWeight: '600', color: colors.expense },

  sheetOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.6)' },
  sheet:      { position: 'absolute', bottom: 0, left: 0, right: 0, backgroundColor: colors.bg.elevated, borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 20, paddingBottom: 48, gap: 10, borderTopWidth: 1, borderTopColor: colors.border.default },
  sheetHandle:{ width: 36, height: 4, backgroundColor: colors.border.default, borderRadius: 2, alignSelf: 'center' },
  sheetTitle: { fontSize: 16, fontWeight: '600', color: colors.text.primary },
  sheetInput: { backgroundColor: colors.bg.tertiary, borderRadius: 10, borderWidth: 1, borderColor: colors.border.default, color: colors.text.primary, fontSize: 22, fontWeight: '600', padding: 14, textAlign: 'center' },
  sheetBtn:   { backgroundColor: colors.accent.primary, borderRadius: 10, height: 48, alignItems: 'center', justifyContent: 'center' },
  sheetBtnText:{ fontSize: 15, fontWeight: '700', color: colors.bg.primary },

  // edit mode
  editBody:  { padding: 16, gap: 12, paddingBottom: 40 },
  preview:   { alignItems: 'center', padding: 20, borderRadius: 14, borderWidth: 1, gap: 6 },
  previewEmoji:{ fontSize: 44 },
  previewName: { fontSize: 16, fontWeight: '600', color: colors.text.primary },
  label:     { fontSize: 10, fontWeight: '600', color: colors.text.muted, letterSpacing: 0.8 },
  input:     { backgroundColor: colors.bg.secondary, borderRadius: 10, borderWidth: 1, borderColor: colors.border.default, color: colors.text.primary, fontSize: 15, paddingHorizontal: 14, height: 52, justifyContent: 'center' },
  row:       { flexDirection: 'row', gap: 8, alignItems: 'center' },
  currBtn:   { backgroundColor: colors.bg.secondary, borderRadius: 10, borderWidth: 1, borderColor: colors.border.default, paddingHorizontal: 14, height: 52, justifyContent: 'center' },
  currBtnText:{ fontSize: 14, fontWeight: '600', color: colors.accent.primary },
  grid:      { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  iconBtn:   { width: 52, height: 52, borderRadius: 10, borderWidth: 1, borderColor: colors.border.default, backgroundColor: colors.bg.secondary, alignItems: 'center', justifyContent: 'center' },
  iconText:  { fontSize: 24 },
  colorRow:  { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  colorBtn:  { width: 36, height: 36, borderRadius: 18 },
  colorBtnSelected: { borderWidth: 3, borderColor: '#fff' },
});
