import React, { useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  Modal, Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors, spacing, radius } from '../../theme';
import { Goal, GoalContribution, getContributions } from '../../database/repositories/goalRepository';
import { useGoalsStore } from '../../store/slices/goalsSlice';
import { formatCurrency } from '../../utils/formatCurrency';
import { getDaysUntil, toISODate } from '../../utils/formatDate';
import { format } from 'date-fns';
import { ro } from 'date-fns/locale';
import GoalDetailScreen from './GoalDetailScreen';
import AddGoalScreen from './AddGoalScreen';

export default function GoalsScreen() {
  const { goals, load } = useGoalsStore();
  const [showAdd, setShowAdd]         = useState(false);
  const [selectedGoal, setSelectedGoal] = useState<Goal | null>(null);

  useEffect(() => { load(); }, []);

  return (
    <SafeAreaView style={s.safe} edges={['top']}>
      <ScrollView contentContainerStyle={s.content} showsVerticalScrollIndicator={false}>
        <Text style={s.screenLabel}>Obiective Economii</Text>

        {goals.length === 0 && (
          <View style={s.emptyWrap}>
            <Text style={s.emptyEmoji}>🎯</Text>
            <Text style={s.emptyTitle}>Niciun obiectiv</Text>
            <Text style={s.emptyDesc}>Seteaza un obiectiv de economii și urmarește progresul.</Text>
          </View>
        )}

        {goals.map(goal => {
          const pct        = Math.min(100, (goal.current_amount / goal.target_amount) * 100);
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
                  <Text style={s.goalEmoji}>{goal.icon}</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={s.goalName}>{goal.name}</Text>
                  <Text style={s.goalSub}>
                    {isComplete
                      ? 'Completed! 🎉'
                      : isPaused
                      ? 'Paused'
                      : days !== null
                      ? (days > 0 ? `${days} zile ramase` : 'Deadline passed')
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

              <View style={s.progressBg}>
                <View style={[s.progressFill, { width: `${pct}%` as any, backgroundColor: goal.color }]} />
              </View>

              <View style={s.cardFooter}>
                <Text style={s.footerText}>
                  {formatCurrency(goal.current_amount, '', 0)} / {formatCurrency(goal.target_amount, goal.currency_symbol ?? 'RON', 0)}
                </Text>
                <Text style={[s.footerPct, { color: isComplete ? colors.income : colors.accent.primary }]}>
                  {Math.round(pct)}%
                </Text>
              </View>
            </TouchableOpacity>
          );
        })}

        <TouchableOpacity style={s.addCard} onPress={() => setShowAdd(true)} activeOpacity={0.7}>
          <Text style={s.addIcon}>+</Text>
          <Text style={s.addText}>Adauga obiectiv nou</Text>
        </TouchableOpacity>
      </ScrollView>

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
  safe:        { flex: 1, backgroundColor: colors.bg.primary },
  content:     { padding: 12, gap: 10, paddingBottom: 100 },
  screenLabel: { fontSize: 9, color: colors.accent.primary, textTransform: 'uppercase', letterSpacing: 1.2, opacity: 0.85, marginBottom: 4 },

  emptyWrap:  { alignItems: 'center', paddingVertical: 48, gap: 8 },
  emptyEmoji: { fontSize: 48 },
  emptyTitle: { fontSize: 16, fontWeight: '600', color: colors.text.primary },
  emptyDesc:  { fontSize: 13, color: colors.text.secondary, textAlign: 'center', paddingHorizontal: 32 },

  card:       { backgroundColor: colors.bg.secondary, borderRadius: 14, padding: 14, borderWidth: 1, borderColor: colors.border.default },
  cardHeader: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 10 },
  goalIcon:   { width: 36, height: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  goalEmoji:  { fontSize: 18 },
  goalName:   { fontSize: 14, fontWeight: '600', color: colors.text.primary },
  goalSub:    { fontSize: 10, color: colors.text.muted, marginTop: 1 },
  badge:      { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  badgeActive:{ backgroundColor: 'rgba(0,212,170,0.12)' },
  badgeDone:  { backgroundColor: 'rgba(52,211,153,0.12)' },
  badgePaused:{ backgroundColor: 'rgba(251,191,36,0.12)' },
  badgeText:  { fontSize: 9, fontWeight: '600' },

  progressBg:   { height: 6, backgroundColor: colors.bg.elevated, borderRadius: 3, overflow: 'hidden', marginBottom: 8 },
  progressFill: { height: 6, borderRadius: 3 },
  cardFooter:   { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  footerText:   { fontSize: 11, color: colors.text.secondary },
  footerPct:    { fontSize: 13, fontWeight: '700' },

  addCard: { backgroundColor: 'rgba(0,212,170,0.06)', borderWidth: 1, borderColor: 'rgba(0,212,170,0.25)', borderStyle: 'dashed', borderRadius: 14, padding: 18, alignItems: 'center', gap: 4 },
  addIcon: { fontSize: 22, color: colors.accent.primary },
  addText: { fontSize: 12, color: colors.accent.primary, fontWeight: '500' },
});
