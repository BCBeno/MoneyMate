import React from 'react';
import { View, StyleSheet } from 'react-native';
import { colors, radius } from '../../theme';

interface Props {
  progress: number; // 0-1
  color?: string;
  height?: number;
}

export default function ProgressBar({ progress, color = colors.accent.primary, height = 8 }: Props) {
  const pct = Math.min(1, Math.max(0, progress));
  return (
    <View style={[styles.track, { height }]}>
      <View style={[styles.fill, { width: `${pct * 100}%`, backgroundColor: color, height }]} />
    </View>
  );
}

const styles = StyleSheet.create({
  track: { backgroundColor: colors.bg.tertiary, borderRadius: radius.full, overflow: 'hidden' },
  fill: { borderRadius: radius.full },
});
