import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors, spacing } from '../../theme';
import { savePin } from '../../services/securityService';
import { useSettingsStore } from '../../store/slices/settingsSlice';

const DIGITS = [['1','2','3'],['4','5','6'],['7','8','9'],['','0','⌫']];

export default function PinSetupScreen({ onDone }: { onDone?: () => void }) {
  const [pin, setPin] = useState('');
  const [confirm, setConfirm] = useState('');
  const [step, setStep] = useState<'create'|'confirm'>('create');
  const [error, setError] = useState('');
  const { setPinEnabled } = useSettingsStore();
  const current = step === 'create' ? pin : confirm;
  const setter  = step === 'create' ? setPin : setConfirm;

  const handleDigit = (d: string) => {
    if (d === '⌫') { setter(p => p.slice(0,-1)); setError(''); return; }
    if (d === '') return;
    const next = current + d;
    if (next.length > 4) return;
    setter(next);
    setError('');
    if (next.length === 4) {
      if (step === 'create') {
        setTimeout(() => setStep('confirm'), 300);
      } else {
        if (next === pin) {
          savePin(pin).then(() => setPinEnabled(true)).then(() => onDone?.());
        } else {
          setError('PINs do not match');
          setConfirm(''); setPin(''); setStep('create');
        }
      }
    }
  };

  return (
    <SafeAreaView style={s.container} edges={['top','bottom']}>
      <Text style={s.title}>{step === 'create' ? 'Create PIN' : 'Confirm PIN'}</Text>
      <Text style={s.sub}>{step === 'create' ? 'Choose a 4-digit PIN' : 'Enter the PIN again'}</Text>
      <View style={s.dots}>
        {[0,1,2,3].map(i => (
          <View key={i} style={[s.dot, current.length > i && s.dotFilled]} />
        ))}
      </View>
      {error && <Text style={s.errorText}>{error}</Text>}
      <View style={s.pad}>
        {DIGITS.map((row, ri) => (
          <View key={ri} style={s.row}>
            {row.map((d, di) => (
              <TouchableOpacity key={di} style={s.key} onPress={() => handleDigit(d)} activeOpacity={0.7}>
                <Text style={s.keyText}>{d}</Text>
              </TouchableOpacity>
            ))}
          </View>
        ))}
      </View>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  container:  { flex:1, backgroundColor:colors.bg.primary, alignItems:'center', justifyContent:'center', gap:spacing.xl },
  title:      { fontSize:26, fontWeight:'700', color:colors.text.primary },
  sub:        { fontSize:14, color:colors.text.secondary },
  dots:       { flexDirection:'row', gap:16, marginVertical:spacing.xl },
  dot:        { width:16, height:16, borderRadius:8, borderWidth:2, borderColor:colors.accent.primary },
  errorText:  { fontSize:13, color:colors.expense, fontWeight:'600' },
  dotFilled:  { backgroundColor:colors.accent.primary },
  pad:        { gap:spacing.md },
  row:        { flexDirection:'row', gap:spacing.md },
  key:        { width:80, height:80, borderRadius:40, backgroundColor:colors.bg.secondary, alignItems:'center', justifyContent:'center', borderWidth:1, borderColor:colors.border.default },
  keyText:    { fontSize:24, fontWeight:'500', color:colors.text.primary },
});
