import React, { useEffect } from 'react';
import { Keyboard, Platform, Pressable, StyleSheet, Text } from 'react-native';
import DateTimePicker, { DateTimePickerChangeEvent } from '@react-native-community/datetimepicker';
import { colors } from '../../theme';
import { toISODate } from '../../utils/formatDate';
import Modal from './Modal';

interface Props {
  visible: boolean;
  value: string; // yyyy-MM-dd; an empty value starts at today.
  onChange: (date: string) => void;
  onClose: () => void;
  title?: string;
}

export default function DatePickerModal({ visible, value, onChange, onClose, title = 'Select date' }: Props) {
  useEffect(() => {
    if (visible) Keyboard.dismiss();
  }, [visible]);

  if (!visible) return null;

  const handleValueChange = (_event: DateTimePickerChangeEvent, selectedDate: Date) => {
    onChange(toISODate(selectedDate));
    if (Platform.OS !== 'ios') onClose();
  };

  const picker = (
    <DateTimePicker
      value={new Date((value || toISODate(new Date())) + 'T12:00:00')}
      mode="date"
      display={Platform.OS === 'ios' ? 'spinner' : 'default'}
      onValueChange={handleValueChange}
      onDismiss={onClose}
      themeVariant="dark"
      textColor={colors.text.primary}
      accentColor={colors.accent.primary}
    />
  );

  if (Platform.OS !== 'ios') return picker;

  return (
    <Modal visible={visible} onClose={onClose} title={title} scrollable>
      {picker}
      <Pressable style={styles.done} onPress={onClose} accessibilityRole="button">
        <Text style={styles.doneText}>Done</Text>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  done: { height: 50, borderRadius: 12, backgroundColor: colors.accent.primary, alignItems: 'center', justifyContent: 'center' },
  doneText: { fontSize: 15, fontWeight: '600', color: colors.text.inverse },
});
