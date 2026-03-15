import React, { useState } from 'react';
import { View, Text, Switch, StyleSheet, Alert } from 'react-native';
import { colors, spacing } from '../../theme';
import { useAppStore } from '../../store';
import { setSetting } from '../../database/repositories/settingsRepository';
import Modal from '../../components/common/Modal';

interface Props { visible: boolean; onClose: () => void; }

export default function SecurityScreen({ visible, onClose }: Props) {
  const { pinEnabled, biometricEnabled, setPinEnabled, setBiometricEnabled } = useAppStore();

  const handlePinToggle = async (value: boolean) => {
    if (value) {
      Alert.alert('Enable PIN', 'Full functionality coming soon. Default PIN: 1234');
      await setSetting('pin_hash', '1234');
      await setPinEnabled(true);
    } else {
      Alert.alert('Disable PIN', 'Are you sure?', [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Disable', style: 'destructive', onPress: () => setPinEnabled(false) },
      ]);
    }
  };

  return (
    <Modal visible={visible} onClose={onClose} title="Securitate">
      <View style={styles.row}>
        <View style={styles.info}>
          <Text style={styles.label}>🔐 PIN</Text>
          <Text style={styles.subtitle}>Protejează aplicația cu un cod PIN de 4 cifre</Text>
        </View>
        <Switch value={pinEnabled} onValueChange={handlePinToggle}
          trackColor={{ false: colors.border.default, true: colors.accent.primary }}
          thumbColor={pinEnabled ? colors.text.inverse : colors.text.muted} />
      </View>
      <View style={styles.separator} />
      <View style={styles.row}>
        <View style={styles.info}>
          <Text style={styles.label}>👆 Biometrie</Text>
          <Text style={styles.subtitle}>Folosește amprenta sau Face ID</Text>
        </View>
        <Switch value={biometricEnabled} onValueChange={setBiometricEnabled} disabled={!pinEnabled}
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
