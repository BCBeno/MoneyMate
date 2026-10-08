import { useDisplayCurrency } from '../../hooks/useDisplayCurrency';
import { getCurrencyRate } from '../../services/currencyService';
import AppIcon from '../../components/common/AppIcon';
import React, { useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  Modal, Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors, spacing, radius } from '../../theme';
import { Goal } from '../../database/repositories/goalRepository';
import { useGoalsStore } from '../../store/slices/goalsSlice';
import { getSetting, setSetting } from '../../database/repositories/settingsRepository';
import { formatCurrency } from '../../utils/formatCurrency';
import { getDaysUntil, toISODate } from '../../utils/formatDate';
import GoalDetailScreen from './GoalDetailScreen';
import AddGoalScreen from './AddGoalScreen';

type GoalSetupChoice = 'unset' | 'enabled' | 'skipped';

const GOALS_SETUP_KEY = 'goals_setup_choice';

export default function GoalsScreen() {
  const { goals, load } = useGoalsStore();
  const { displayAmount } = useDisplayCurrency();
  const [totalSaved, setTotalSaved] = useState<number | null>(null);
  useEffect(() => {
    let active = true;
    setTotalSaved(null);
    Promise.all(goals.map(async goal => goal.current_amount * await getCurrencyRate(goal.currency_code)))
      .then(amounts => { if (active) setTotalSaved(amounts.reduce((sum, amount) => sum + amount, 0)); })
      .catch(console.error);
    return () => { active = false; };
  }, [goals]);
  const [showAdd, setShowAdd]           = useState(false);
  const [setupChoice, setSetupChoice]   = useState<GoalSetupChoice>('unset');
  const [selectedGoal, setSelectedGoal] = useState<Goal | null>(null);

  useEffect(() => {
    load();
    void loadSetupChoice();
  }, []);

  const loadSetupChoice = async () => {
    try {
      const value = await getSetting(GOALS_SETUP_KEY);
      if (value === 'enabled' || value === 'skipped') {
        setSetupChoice(value);
        return;
      }
      setSetupChoice('unset');
    } catch (e) {
      console.error('load setup choice error:', e);
      setSetupChoice('unset');
    }
  };

  const handleChooseSetup = async (choice: GoalSetupChoice) => {
    try {
      await setSetting(GOALS_SETUP_KEY, choice);
      setSetupChoice(choice);
      if (choice === 'enabled') setShowAdd(true);
    } catch (e) {
      console.error('save setup choice error:', e);
      Alert.alert('Error', 'Could not save this option. Please try again.');
    }
  };

  const openAddGoal = async () => {
    if (setupChoice !== 'enabled') {
      await handleChooseSetup('enabled');
      return;
    }
    setShowAdd(true);
  };

  return (
    <SafeAreaView style={s.safe} edges={['top']}>
      <FlatList data={goals} keyExtractor={goal => String(goal.id)} contentContainerStyle={s.content} showsVerticalScrollIndicator={false}
        ListHeaderComponent={<View style={s.listHeader}>
        <View style={s.pageHeader}><Text style={s.screenLabel}>Goals</Text><TouchableOpacity accessibilityLabel="Add goal" onPress={openAddGoal} style={s.headerAdd}><AppIcon name="plus" color={colors.accent.primary} /></TouchableOpacity></View>
        {goals.length > 0 && <View style={s.summary}><Text style={s.summaryLabel}>TOTAL SAVED</Text><Text style={s.summaryAmount} numberOfLines={1} adjustsFontSizeToFit>{totalSaved === null ? '…' : displayAmount(totalSaved, 0)}</Text><Text style={s.summaryHint}>Across {goals.length} savings goals</Text></View>}

        {goals.length === 0 && (
          <View style={s.emptyWrap}>
            <AppIcon name="target" size={32} color={colors.accent.primary} />
            <Text style={s.emptyTitle}>No goals yet</Text>
            <Text style={s.emptyDesc}>Set a savings goal and track your progress.</Text>
            <Text style={s.emptyHint}>Goal contributions are savings only and are not counted as expenses.</Text>

            {setupChoice === 'unset' && (
              <View style={s.emptyActionRow}>
                <TouchableOpacity style={s.primaryAction} onPress={() => handleChooseSetup('enabled')} activeOpacity={0.85}>
                  <Text style={s.primaryActionText}>Set a goal</Text>
                </TouchableOpacity>
                <TouchableOpacity style={s.secondaryAction} onPress={() => handleChooseSetup('skipped')} activeOpacity={0.85}>
                  <Text style={s.secondaryActionText}>Not now</Text>
                </TouchableOpacity>
              </View>
            )}

            {setupChoice === 'skipped' && (
              <TouchableOpacity style={s.secondaryAction} onPress={() => handleChooseSetup('enabled')} activeOpacity={0.85}>
                <Text style={s.secondaryActionText}>Set one later</Text>
              </TouchableOpacity>
            )}
          </View>
        )}

        </View>}
        renderItem={({ item: goal }) => {
          const hasTarget   = goal.target_amount > 0;
          const pct         = hasTarget ? Math.min(100, (goal.current_amount / goal.target_amount) * 100) : 0;
          const days        = goal.deadline ? getDaysUntil(goal.deadline) : null;
          const isComplete  = goal.status === 'completed';
          const isPaused    = goal.status === 'paused';

          return (
            <TouchableOpacity
              key={goal.id}
              style={s.card}
              onPress={() => setSelectedGoal(goal)}
              activeOpacity={0.8}
            >
              <View style={s.cardHeader}>
                <View style={[s.goalIcon, { backgroundColor: goal.color + '26' }]}>
                  <AppIcon name={goal.icon} size={22} color={goal.color} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={s.goalName}>{goal.name}</Text>
                  <Text style={s.goalSub}>
                    {isComplete
                      ? 'Completed'
                      : isPaused
                      ? 'Paused'
                      : days !== null
                      ? (days > 0 ? `${days} days left` : 'Deadline passed')
                      : 'No deadline'}
                  </Text>
                </View>
                <View style={[s.badge, isComplete ? s.badgeDone : isPaused ? s.badgePaused : s.badgeActive]}>
                  <Text style={[
                    s.badgeText,
                    { color: isComplete ? colors.income : isPaused ? colors.warning : colors.accent.primary },
                  ]}>
                    {isComplete ? 'complete' : isPaused ? 'paused' : 'active'}
                  </Text>
                </View>
              </View>

              {hasTarget && <View style={s.progressBg}>
                <View style={[s.progressFill, { width: `${pct}%`, backgroundColor: goal.color }]} />
              </View>}

              <View style={s.cardFooter}>
                <Text style={s.footerText}>
                  {hasTarget
                    ? `${formatCurrency(goal.current_amount, '', 0)} / ${formatCurrency(goal.target_amount, goal.currency_symbol ?? 'RON', 0)}`
                    : `${formatCurrency(goal.current_amount, goal.currency_symbol ?? 'RON', 0)} saved`}
                </Text>
                <Text style={[s.footerPct, { color: isComplete ? colors.income : colors.accent.primary }]}>
                  {hasTarget ? `${Math.round(pct)}%` : 'No target'}
                </Text>
              </View>
            </TouchableOpacity>
          );
        }}
        ListFooterComponent={<View style={s.listFooter}>

        <TouchableOpacity style={s.addCard} onPress={openAddGoal} activeOpacity={0.7}>
          <AppIcon name="plus" size={20} color={colors.text.secondary} />
          <Text style={s.addText}>Add new goal</Text>
        </TouchableOpacity>
      <Text style={s.emptyHint}>Contributions stay separate from expenses.</Text></View>}
      />

      {/* Goal detail modal */}
      <Modal
        visible={selectedGoal !== null}
        animationType="slide"
        transparent={false}
        onRequestClose={() => setSelectedGoal(null)}
      >
        {selectedGoal !== null && (
          <GoalDetailScreen
            goal={selectedGoal}
            onClose={() => { setSelectedGoal(null); load(); }}
            onDeleted={() => { setSelectedGoal(null); load(); }}
          />
        )}
      </Modal>

      {/* Add goal modal */}
      <Modal visible={showAdd} animationType="slide" transparent={false} onRequestClose={() => setShowAdd(false)}>
        <AddGoalScreen onClose={() => { setShowAdd(false); load(); }} />
      </Modal>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  pageHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 },
  headerAdd: { width: 44, height: 44, borderRadius: 12, backgroundColor: colors.accent.muted, alignItems: 'center', justifyContent: 'center' },
  listHeader: { gap: 16, marginBottom: 16 }, listFooter: { gap: 16, marginTop: 16 },
  summary: { padding: 20, borderRadius: 16, backgroundColor: colors.bg.balance, borderWidth: 1, borderColor: colors.border.accent },
  summaryLabel: { fontSize: 11, letterSpacing: 1.1, fontWeight: '600', color: colors.text.secondary },
  summaryAmount: { fontSize: 36, fontWeight: '700', letterSpacing: -1.1, color: colors.text.primary, marginVertical: 8, fontVariant: ['tabular-nums'] },
  summaryHint: { fontSize: 12, color: colors.text.secondary },
  safe:        { flex: 1, backgroundColor: colors.bg.primary },
  content:     { padding: 24, gap: 16, paddingBottom: 32 },
  screenLabel: { fontSize: 28, color: colors.text.primary, textTransform: 'none', letterSpacing: -0.6, opacity: 1, marginBottom: 16, fontWeight: '700', marginTop: 20 },

  emptyWrap:  { alignItems: 'center', paddingVertical: 48, gap: 8 },
  emptyEmoji: { fontSize: 48 },
  emptyTitle: { fontSize: 20, fontWeight: '600', color: colors.text.primary },
  emptyDesc:  { fontSize: 13, color: colors.text.secondary, textAlign: 'center', paddingHorizontal: 32 },
  emptyHint:  { fontSize: 12, color: colors.text.secondary, textAlign: 'center', paddingHorizontal: 22 },
  emptyActionRow: { width: '100%', gap: 8, marginTop: 8 },
  primaryAction: { backgroundColor: colors.accent.primary, borderRadius: 10, height: 42, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 14 },
  primaryActionText: { fontSize: 13, fontWeight: '700', color: colors.bg.primary },
  secondaryAction: { borderRadius: 10, borderWidth: 1, borderColor: colors.border.default, backgroundColor: colors.bg.secondary, height: 42, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 14 },
  secondaryActionText: { fontSize: 13, fontWeight: '600', color: colors.text.secondary },

  card:       { backgroundColor: colors.bg.secondary, borderRadius: 16, padding: 18, marginBottom: 16, borderWidth: 1, borderColor: colors.border.default },
  cardHeader: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 10 },
  goalIcon:   { width: 42, height: 42, borderRadius: 12, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.bg.tertiary },
  goalEmoji:  { fontSize: 18 },
  goalName:   { fontSize: 15, fontWeight: '600', color: colors.text.primary },
  goalSub:    { fontSize: 11, color: colors.text.secondary, marginTop: 1 },
  badge:      { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  badgeActive:{ backgroundColor: colors.accent.muted },
  badgeDone:  { backgroundColor: 'rgba(52,211,153,0.12)' },
  badgePaused:{ backgroundColor: 'rgba(251,191,36,0.12)' },
  badgeText:  { fontSize: 11, fontWeight: '600' },

  progressBg:   { height: 6, backgroundColor: colors.bg.elevated, borderRadius: 3, overflow: 'hidden', marginBottom: 8 },
  progressFill: { height: 6, borderRadius: 3 },
  cardFooter:   { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 16, marginBottom: 10 },
  footerText:   { fontSize: 13, color: colors.text.primary },
  footerPct:    { fontSize: 13, fontWeight: '700' },

  addCard: { backgroundColor: colors.bg.tertiary, borderWidth: 0, borderColor: 'rgba(0,212,170,0.25)', borderStyle: 'solid', borderRadius: 12, padding: 18, alignItems: 'center', gap: 8, flexDirection: 'row', justifyContent: 'center', minHeight: 52 },
  addIcon: { fontSize: 22, color: colors.accent.primary },
  addText: { fontSize: 14, color: colors.text.primary, fontWeight: '500' },
});
