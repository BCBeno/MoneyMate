import React, { useState } from 'react';
import { View, Text, Switch, StyleSheet, Alert } from 'react-native';
import { colors, spacing } from '../../theme';
import { useSettingsStore } from '../../store';
import { savePin, deletePin, isBiometricAvailable } from '../../services/securityService';
import Modal from '../../components/common/Modal';

interface Props { visible: boolean; onClose: () => void; }

export default function SecurityScreen({ visible, onClose }: Props) {
  const { pinEnabled, biometricEnabled, setPinEnabled, setBiometricEnabled } = useSettingsStore();

  const handlePinToggle = async (value: boolean) => {
    if (value) {
      Alert.alert('Enable PIN', 'For now, a default PIN 1234 will be set. You can change this flow later to use dedicated setup UI.');
      await savePin('1234');
      await setPinEnabled(true);
    } else {
      Alert.alert('Disable PIN', 'Are you sure?', [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Disable',
          style: 'destructive',
          onPress: async () => {
            await deletePin();
            await setPinEnabled(false);
          },
        },
      ]);
    }
  };

  const handleBiometricToggle = async (value: boolean) => {
    if (value) {
      const available = await isBiometricAvailable();
      if (!available) {
        Alert.alert('Unavailable', 'Biometrics are not configured on this device.');
        return;
      }
    }
    await setBiometricEnabled(value);
  };

  return (
    <Modal visible={visible} onClose={onClose} title="Security">
      <View style={styles.row}>
        <View style={styles.info}>
          <Text style={styles.label}>🔐 PIN</Text>
          <Text style={styles.subtitle}>Protect the app with a 4-digit PIN</Text>
        </View>
        <Switch value={pinEnabled} onValueChange={handlePinToggle}
          trackColor={{ false: colors.border.default, true: colors.accent.primary }}
          thumbColor={pinEnabled ? colors.text.inverse : colors.text.muted} />
      </View>
      <View style={styles.separator} />
      <View style={styles.row}>
        <View style={styles.info}>
          <Text style={styles.label}>👆 Biometrics</Text>
          <Text style={styles.subtitle}>Use fingerprint or Face ID</Text>
        </View>
        <Switch value={biometricEnabled} onValueChange={handleBiometricToggle} disabled={!pinEnabled}
          trackColor={{ false: colors.border.default, true: colors.accent.primary }}
          thumbColor={biometricEnabled ? colors.text.inverse : colors.text.muted} />
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', paddingVertical: spacing.md },
  info: { flex: 1 },
  label: { fontSize: 16, fontWeight: '600', color: colors.text.primary, marginBottom: 4 },
  subtitle: { fontSize: 13, color: colors.text.secondary, lineHeight: 18 },
  separator: { height: 1, backgroundColor: colors.border.default, marginVertical: 4 },
});
