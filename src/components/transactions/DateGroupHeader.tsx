import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { colors } from '../../theme';
import { formatDate } from '../../utils/formatDate';

export default function DateGroupHeader({ date, spent, label = 'Spent' }: { date: string; spent: string; label?: 'Spent' | 'Received' }) {
  return <View style={s.row}>
    <Text style={s.date}>{formatDate(date)}</Text>
    <Text style={s.spent}>{label} <Text style={s.amount}>{spent}</Text></Text>
  </View>;
}
const s = StyleSheet.create({
  row: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center', columnGap: 8, rowGap: 4, paddingTop: 16, paddingBottom: 4 },
  date: { fontSize: 11, fontWeight: '600', color: colors.text.secondary },
  spent: { fontSize: 11, color: colors.text.secondary },
  amount: { fontWeight: '600', color: colors.text.primary, fontVariant: ['tabular-nums'] },
});
