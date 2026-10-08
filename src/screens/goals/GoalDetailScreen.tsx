import { GOAL_ICONS, ICON_COLORS as GOAL_COLORS, resolveIconName } from '../../constants/icons';
import AppIcon from '../../components/common/AppIcon';
import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  TextInput, Alert,
} from 'react-native';
import DatePickerModal from '../../components/common/DatePickerModal';
import Modal from '../../components/common/Modal';
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
import BottomSheetPicker, { PickerItem } from '../../components/common/BottomSheetPicker';
import { DEFAULT_CURRENCIES } from '../../constants/currencies';




interface Props {
  goal: Goal;
  onClose: () => void;
  onDeleted: () => void;
}

export default function GoalDetailScreen({ goal, onClose, onDeleted }: Props) {
  const { edit, remove, contribute, removeContribution, setStatus } = useGoalsStore();
  const liveGoal = useGoalsStore(state => state.goals.find(g => g.id === goal.id));
  const goalView = liveGoal ?? goal;

  const [isEditing, setIsEditing]       = useState(false);
  const [contributions, setContributions] = useState<GoalContribution[]>([]);

  // edit fields
  const [name, setName]         = useState(goal.name);
  const [targetStr, setTargetStr] = useState(goal.target_amount > 0 ? String(goal.target_amount) : '');
  const [currency, setCurrency] = useState(goal.currency_code);
  const [icon, setIcon]         = useState(resolveIconName(goal.icon));
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
  const [statusSaving, setStatusSaving] = useState(false);
  const [localStatus, setLocalStatus] = useState<Goal['status']>(goal.status);
  const [nameError, setNameError] = useState('');
  const [targetError, setTargetError] = useState('');
  const [contribError, setContribError] = useState('');

  useEffect(() => {
    setLocalStatus(goalView.status);
  }, [goalView.status]);

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

  const hasTarget = goalView.target_amount > 0;
  const pct        = hasTarget ? Math.min(100, (goalView.current_amount / goalView.target_amount) * 100) : 0;
  const deadlineFmt = goalView.deadline
    ? (() => {
        try { return format(new Date(goalView.deadline + 'T12:00:00'), 'd MMMM yyyy', { locale: enUS }); }
        catch { return goalView.deadline; }
      })()
    : 'No deadline';

  // ── Save edit ──
  const handleSaveEdit = async () => {
    const targetInput = targetStr.trim();
    const target = targetInput === '' ? 0 : Number(targetInput.replace(',', '.'));
    let hasError = false;

    if (!name.trim()) {
      setNameError('Name is required');
      hasError = true;
    }
    if (targetInput !== '' && (!Number.isFinite(target) || target <= 0)) {
      setTargetError('Target must be greater than 0');
      hasError = true;
    }
    if (hasError) return;

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
    } catch (e) {
      console.error(e);
    } finally {
      setSaving(false);
    }
  };

  // ── Add contribution ──
  const handleAddContrib = async () => {
    const amount = Number(contribStr.replace(',', '.'));
    if (!Number.isFinite(amount) || amount <= 0) {
      setContribError('Amount must be greater than 0');
      return;
    }
    setContribError('');
    setContribSaving(true);
    try {
      await contribute(goal.id, amount, toISODate(new Date()), contribNote || undefined);
      setContribStr(''); setContribNote('');
      setShowContrib(false);
      await loadContributions();
    } catch (e) {
      console.error(e);
    } finally {
      setContribSaving(false);
    }
  };

  // ── Delete contribution ──
  const handleDeleteContrib = (c: GoalContribution) => {
    Alert.alert('Delete contribution', `${formatCurrency(c.amount, goalView.currency_symbol ?? 'RON', 2)} on ${c.date}`, [
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
    key: c.code, label: c.code, sublabel: c.name, icon: 'coins',
  }));


  const handleStatusChange = async (nextStatus: Goal['status']) => {
    if (localStatus === nextStatus || statusSaving || localStatus === 'completed') return;
    const previousStatus = localStatus;
    setLocalStatus(nextStatus);
    setStatusSaving(true);
    try {
      await setStatus(goal.id, nextStatus);
    } catch (e) {
      setLocalStatus(previousStatus);
      console.error(e);
    } finally {
      setStatusSaving(false);
    }
  };

  // ────────────────────────────────────────────────────────────────────────────
  // VIEW mode
  // ────────────────────────────────────────────────────────────────────────────
  if (!isEditing) {
    return (
      <SafeAreaView style={s.container} edges={['top', 'bottom']}>
        <View style={s.header}>
          <TouchableOpacity onPress={onClose} accessibilityLabel="Back" accessibilityRole="button" style={s.headerBtn}>
            <AppIcon name="chevron-left" />
          </TouchableOpacity>
          <Text style={s.headerTitle} numberOfLines={1}>{goalView.name}</Text>
          <TouchableOpacity onPress={() => setIsEditing(true)} style={s.headerBtn}>
            <Text style={[s.headerBtnText, { textAlign: 'right' }]}>Edit</Text>
          </TouchableOpacity>
        </View>

        <ScrollView contentContainerStyle={s.viewBody} showsVerticalScrollIndicator={false}>
          {/* Hero */}
          <View style={[s.heroCard, { borderColor: goalView.color + '44' }]}>
            <View style={[s.heroIcon, { backgroundColor: goalView.color + '22' }]}>
              <AppIcon name={goalView.icon} size={32} color={goalView.color} />
            </View>
            <Text style={s.heroName}>{goalView.name}</Text>
            <Text style={[s.heroAmount, { color: goalView.color }]}>
              {formatCurrency(goalView.current_amount, goalView.currency_symbol ?? 'RON', 0)}
            </Text>
            <Text style={s.heroTarget}>
              {hasTarget
                ? `of ${formatCurrency(goalView.target_amount, goalView.currency_symbol ?? 'RON', 0)}`
                : 'No target set'}
            </Text>
            {hasTarget && <View style={s.progressBg}>
              <View style={[s.progressFill, { width: `${pct}%`, backgroundColor: goalView.color }]} />
            </View>
            }<Text style={[s.heroPct, { color: goalView.color }]}>{hasTarget ? `${Math.round(pct)}%` : 'No target'}</Text>
          </View>

          {/* Info rows */}
          <View style={s.fieldsCard}>
            <InfoRow label="Status" value={localStatus === 'active' ? 'Active' : localStatus === 'completed' ? 'Completed' : 'Paused'} />
            <InfoRow label="Deadline" value={deadlineFmt} />
            <InfoRow label="Currency" value={goalView.currency_code} />
            {!!goalView.note && <InfoRow label="Note" value={goalView.note} isLast />}
          </View>

          {/* Status toggle */}
          {localStatus !== 'completed' && (
            <View style={s.statusRow}>
              <TouchableOpacity
                style={[s.statusBtn, localStatus === 'active' && s.statusBtnActive, statusSaving && s.statusBtnDisabled]}
                onPress={() => handleStatusChange('active')}
                disabled={statusSaving}
              >
                <Text style={[s.statusBtnText, localStatus === 'active' && { color: colors.accent.primary }]}>Active</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[s.statusBtn, localStatus === 'paused' && s.statusBtnPaused, statusSaving && s.statusBtnDisabled]}
                onPress={() => handleStatusChange('paused')}
                disabled={statusSaving}
              >
                <Text style={[s.statusBtnText, localStatus === 'paused' && { color: colors.warning }]}>Paused</Text>
              </TouchableOpacity>
            </View>
          )}

          {/* Add contribution */}
          {localStatus === 'active' && (
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
                  <Text style={[s.contribAmount, { color: goalView.color }]}>
                    +{formatCurrency(c.amount, goalView.currency_symbol ?? 'RON', 2)}
                  </Text>
                </TouchableOpacity>
              ))}
              <Text style={s.contribHint}>Long press a contribution to delete it</Text>
            </View>
          )}

          {/* Delete */}
          <TouchableOpacity style={s.deleteBtn} onPress={handleDelete} activeOpacity={0.8}>
            <Text style={s.deleteBtnText}>Delete goal</Text>
          </TouchableOpacity>
        </ScrollView>

        {/* Add contribution sheet */}
        <Modal visible={showContrib} title="Add contribution" onClose={() => setShowContrib(false)} scrollable>
            <View style={s.sheetContent}>
              <Text style={s.sheetHint}>This is tracked as goal savings and does not increase expenses.</Text>
              <TextInput
                style={s.sheetInput}
                value={contribStr}
                onChangeText={(text) => {
                  setContribStr(text);
                  setContribError('');
                }}
                placeholder={`0.00 ${goalView.currency_symbol ?? 'RON'}`}
                placeholderTextColor={colors.text.muted}
                keyboardType="decimal-pad"
                autoFocus
              />
              {contribError && <Text style={s.errorMessage}>{contribError}</Text>}
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
          <AppIcon name={icon} size={32} color={color} />
          <Text style={s.previewName}>{name || 'My goal'}</Text>
        </View>

        {/* Name */}
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

        {/* Target amount */}
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
              placeholder="Leave empty"
              placeholderTextColor={colors.text.muted}
              keyboardType="decimal-pad"
            />
            <TouchableOpacity style={s.currBtn} onPress={() => setShowCurPicker(true)}>
              <Text style={s.currBtnText}>{currency}</Text>
            </TouchableOpacity>
          </View>
          {targetError && <Text style={s.errorMessage}>{targetError}</Text>}
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
            <Text style={{ color: colors.expense, fontSize: 12, marginTop: -4 }}>Remove deadline</Text>
          </TouchableOpacity>
        )}

        {/* Icon */}
        <Text style={s.label}>ICON</Text>
        <View style={s.grid}>
          {GOAL_ICONS.map(ic => (
            <TouchableOpacity
              key={ic}
              style={[s.iconBtn, icon === ic && { borderColor: color, backgroundColor: color + '22' }]}
              onPress={() => setIcon(ic)} accessibilityLabel={ic} accessibilityRole="button" accessibilityState={{selected: icon === ic}}
            >
              <AppIcon name={ic} size={22} color={color} />
            </TouchableOpacity>
          ))}
        </View>

        {/* Color */}
        <Text style={s.label}>COLOR</Text>
        <View style={s.colorRow}>
          {[...GOAL_COLORS, ...(GOAL_COLORS.includes(color) ? [] : [color])].map(c => (
            <TouchableOpacity
              key={c}
              style={[s.colorBtn, { backgroundColor: c }, color === c && s.colorBtnSelected]}
              onPress={() => setColor(c)} accessibilityLabel={'Color ' + c} accessibilityRole="button" accessibilityState={{selected: color === c}} hitSlop={6}
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
        value={deadline}
        onChange={setDeadline}
        onClose={() => setShowDeadlinePicker(false)}
        title="Select deadline"
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
  row:     { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 14, paddingVertical: 13, borderBottomWidth: 1, borderBottomColor: colors.border.subtle },
  rowLast: { borderBottomWidth: 0 },
  label:   { fontSize: 11, color: colors.text.secondary },
  value:   { fontSize: 13, fontWeight: '500', color: colors.text.primary },
});

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg.primary },

  header:        { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 24, paddingVertical: 14, borderBottomWidth: 0, borderBottomColor: colors.border.default, minHeight: 76 },
  headerTitle:   { fontSize: 19, fontWeight: '600', color: colors.text.primary, flex: 1, textAlign: 'center' },
  headerBtn:     { minWidth: 44, paddingVertical: 4, minHeight: 44, justifyContent: 'center' },
  headerBtnText: { fontSize: 14, color: colors.accent.primary },

  viewBody: { padding: 24, gap: 16, paddingBottom: 40 },
  heroCard: { backgroundColor: 'transparent', borderRadius: 16, borderWidth: 0, padding: 24, alignItems: 'center', gap: 12, paddingVertical: 20, paddingHorizontal: 0 },
  heroIcon: { width: 70, height: 70, borderRadius: 20, alignItems: 'center', justifyContent: 'center', marginBottom: 4 },
  heroEmoji:   { fontSize: 32 },
  heroName:    { fontSize: 16, fontWeight: '700', color: colors.text.primary },
  heroAmount:  { fontSize: 36, fontWeight: '700', letterSpacing: -0.5, marginTop: 4, fontVariant: ['tabular-nums'] },
  heroTarget:  { fontSize: 13, color: colors.text.secondary },
  progressBg:  { width: '100%', height: 6, backgroundColor: colors.bg.elevated, borderRadius: 3, overflow: 'hidden', marginTop: 12 },
  progressFill:{ height: 6, borderRadius: 3 },
  heroPct:     { fontSize: 13, fontWeight: '700' },

  fieldsCard:  { backgroundColor: colors.bg.secondary, borderRadius: 16, borderWidth: 1, borderColor: colors.border.default, overflow: 'hidden' },

  statusRow:   { flexDirection: 'row', gap: 8 },
  statusBtn:   { flex: 1, paddingVertical: 10, alignItems: 'center', backgroundColor: colors.bg.secondary, borderRadius: 10, borderWidth: 1, borderColor: colors.border.default },
  statusBtnActive: { borderColor: colors.accent.primary, backgroundColor: 'rgba(0,212,170,0.1)' },
  statusBtnPaused: { borderColor: colors.warning, backgroundColor: 'rgba(251,191,36,0.1)' },
  statusBtnDisabled: { opacity: 0.75 },
  statusBtnText:   { fontSize: 13, fontWeight: '500', color: colors.text.secondary },

  contribBtn:     { backgroundColor: colors.accent.primary, borderRadius: 12, paddingVertical: 14, alignItems: 'center' },
  contribBtnText: { fontSize: 14, fontWeight: '700', color: colors.bg.primary },

  section:      { gap: 6 },
  sectionTitle: { fontSize: 11, fontWeight: '600', color: colors.text.secondary, textTransform: 'uppercase', letterSpacing: 0.6 },
  contribItem:  { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: colors.bg.secondary, borderRadius: 10, padding: 12, borderWidth: 1, borderColor: colors.border.default },
  contribLeft:  { flex: 1 },
  contribDate:  { fontSize: 13, fontWeight: '500', color: colors.text.primary },
  contribNote:  { fontSize: 11, color: colors.text.muted, marginTop: 2 },
  contribAmount:{ fontSize: 14, fontWeight: '700' },
  contribHint:  { fontSize: 11, color: colors.text.muted, textAlign: 'center', marginTop: 2 },

  deleteBtn:    { backgroundColor: colors.bg.negative, borderWidth: 0, borderColor: 'rgba(248,113,113,0.25)', borderRadius: 12, paddingVertical: 14, alignItems: 'center', minHeight: 52 },
  deleteBtnText:{ fontSize: 14, fontWeight: '600', color: colors.expense },

  sheetContent: { gap: 10 },
  sheetHint:  { fontSize: 11, color: colors.text.muted, marginTop: -4 },
  sheetInput: { backgroundColor: colors.bg.secondary, borderRadius: 12, borderWidth: 1, borderColor: colors.border.default, color: colors.text.primary, fontSize: 22, fontWeight: '600', padding: 14, textAlign: 'center', minHeight: 52 },
  sheetBtn:   { backgroundColor: colors.accent.primary, borderRadius: 12, height: 52, alignItems: 'center', justifyContent: 'center' },
  sheetBtnText:{ fontSize: 15, fontWeight: '700', color: colors.bg.primary },

  // edit mode
  editBody:  { padding: 24, gap: 16, paddingBottom: 40 },
  preview:   { alignItems: 'center', padding: 20, borderRadius: 16, borderWidth: 1, gap: 12, backgroundColor: colors.bg.secondary, borderColor: colors.border.default },
  previewEmoji:{ fontSize: 44 },
  previewName: { fontSize: 16, fontWeight: '600', color: colors.text.primary },
  label:     { fontSize: 11, fontWeight: '600', color: colors.text.secondary, letterSpacing: 0.8 },
  input:     { backgroundColor: colors.bg.secondary, borderRadius: 12, borderWidth: 1, borderColor: colors.border.default, color: colors.text.primary, fontSize: 16, paddingHorizontal: 14, height: 52, justifyContent: 'center', minHeight: 52 },
  inputError: { borderWidth: 2, borderColor: colors.expense },
  errorMessage: { fontSize: 12, color: colors.expense, marginTop: 6, marginLeft: 2 },
  row:       { flexDirection: 'row', gap: 8, alignItems: 'center' },
  currBtn:   { backgroundColor: colors.bg.secondary, borderRadius: 10, borderWidth: 1, borderColor: colors.border.default, paddingHorizontal: 14, height: 52, justifyContent: 'center' },
  currBtnText:{ fontSize: 14, fontWeight: '600', color: colors.accent.primary },
  grid:      { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  iconBtn:   { width: '22%', height: 60, borderRadius: 12, borderWidth: 1, borderColor: colors.border.default, backgroundColor: colors.bg.secondary, alignItems: 'center', justifyContent: 'center' },
  iconText:  { fontSize: 24 },
  colorRow:  { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  colorBtn:  { width: 32, height: 32, borderRadius: 16 },
  colorBtnSelected: { borderWidth: 3, borderColor: '#fff' },
});
