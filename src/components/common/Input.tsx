import React, { useState } from 'react';
import {
  View, TextInput, Text, StyleSheet, TouchableOpacity,
  TextInputProps, ViewStyle,
} from 'react-native';
import { colors, radius, spacing } from '../../theme';

interface InputProps extends TextInputProps {
  label?: string;
  error?: string;
  prefix?: string;
  suffix?: string;
  containerStyle?: ViewStyle;
  rightIcon?: React.ReactNode;
  onRightIconPress?: () => void;
  required?: boolean;
}

export default function Input({
  label, error, prefix, suffix, containerStyle,
  rightIcon, onRightIconPress, required, ...props
}: InputProps) {
  const [focused, setFocused] = useState(false);

  return (
    <View style={[styles.container, containerStyle]}>
      {label && (
        <View style={styles.labelRow}>
          <Text style={styles.label}>{label}</Text>
          {required && <Text style={styles.requiredMarker}>*</Text>}
        </View>
      )}
      <View style={[
        styles.inputWrap,
        focused && styles.inputFocused,
        !!error && styles.inputError,
      ]}>
        {prefix && <Text style={styles.affix}>{prefix}</Text>}
        <TextInput
          style={styles.input}
          placeholderTextColor={colors.text.muted}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          {...props}
        />
        {suffix && <Text style={styles.affix}>{suffix}</Text>}
        {rightIcon && (
          <TouchableOpacity onPress={onRightIconPress} style={styles.rightIcon}>
            {rightIcon}
          </TouchableOpacity>
        )}
      </View>
      {error && <Text style={styles.errorText}>{error}</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { gap: spacing.xs },
  labelRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  label: { fontSize: 12, fontWeight: '500', color: colors.text.secondary, letterSpacing: 0.5 },
  requiredMarker: { fontSize: 12, fontWeight: '600', color: colors.expense },
  inputWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.bg.tertiary,
    borderRadius: radius.md,
    borderWidth: 2,
    borderColor: colors.border.default,
    paddingHorizontal: spacing.md,
    height: 52,
  },
  inputFocused: { borderColor: colors.accent.primary },
  inputError: { borderColor: colors.expense },
  input: {
    flex: 1,
    color: colors.text.primary,
    fontSize: 16,
    fontWeight: '400',
  },
  affix: { color: colors.text.secondary, fontSize: 15, marginHorizontal: 4 },
  rightIcon: { padding: 4 },
  errorText: { fontSize: 12, color: colors.expense, marginTop: 2 },
});
