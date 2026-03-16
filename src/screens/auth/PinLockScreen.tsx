import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Vibration, AppState, type AppStateStatus } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors, spacing } from '../../theme';
import {
  verifyPin,
  isBiometricAvailable,
  authenticateWithBiometrics,
  incrementFailedAttempts,
  setFailedAttempts,
  getLockoutUntil,
  setLockoutUntil,
  clearFailedAttempts,
  clearLockoutUntil,
} from '../../services/securityService';
import { useSettingsStore } from '../../store/slices/settingsSlice';
import { CONFIG } from '../../constants/config';

const DIGITS = [['1','2','3'],['4','5','6'],['7','8','9'],['','0','⌫']];

export default function PinLockScreen() {
  const [pin, setPin]               = useState('');
  const [cooldown, setCooldown]     = useState(0);
  const [lockoutUntilTs, setLockoutUntilTs] = useState(0);
  const [error, setError]           = useState('');
  const appStateRef                 = useRef<AppStateStatus>(AppState.currentState);
  const biometricInProgress         = useRef(false);
  const { unlock, biometricEnabled } = useSettingsStore();

  // Init: check lockout, then try biometric
  useEffect(() => {
    const init = async () => {
      const lockoutUntil = await getLockoutUntil();
      if (lockoutUntil > Date.now()) {
        setLockoutUntilTs(lockoutUntil);
      } else {
        await clearLockoutUntil();
      }
      if (biometricEnabled) {
        tryBiometric();
      }
    };
    init();
  }, [biometricEnabled]);

  // Re-trigger biometric every time app comes back to foreground
  useEffect(() => {
    const sub = AppState.addEventListener('change', (nextState: AppStateStatus) => {
      const prev = appStateRef.current;
      appStateRef.current = nextState;
      // App resumed from background/inactive → try biometric again
      if (
        biometricEnabled &&
        (prev === 'background' || prev === 'inactive') &&
        nextState === 'active'
      ) {
        tryBiometric();
      }
    });
    return () => sub.remove();
  }, [biometricEnabled]);

  // Cooldown ticker
  useEffect(() => {
    if (lockoutUntilTs <= 0) { setCooldown(0); return; }
    const updateCooldown = async () => {
      const remaining = Math.max(0, Math.ceil((lockoutUntilTs - Date.now()) / 1000));
      setCooldown(remaining);
      if (remaining === 0) {
        setLockoutUntilTs(0);
        await clearLockoutUntil();
      }
    };
    updateCooldown();
    const t = setInterval(updateCooldown, 1000);
    return () => clearInterval(t);
  }, [lockoutUntilTs]);

  const tryBiometric = async () => {
    // Prevent concurrent biometric prompts
    if (biometricInProgress.current) return;
    biometricInProgress.current = true;
    try {
      const available = await isBiometricAvailable();
      if (!available) return;
      const ok = await authenticateWithBiometrics();
      if (ok) {
        await clearFailedAttempts();
        await clearLockoutUntil();
        unlock();
      }
    } finally {
      biometricInProgress.current = false;
    }
  };

  const handleDigit = (d: string) => {
    if (cooldown > 0 || d === '') return;
    if (d === '⌫') { setPin(p => p.slice(0, -1)); setError(''); return; }
    const next = pin + d;
    if (next.length > 4) return;
    setPin(next);
    if (next.length === 4) {
      setTimeout(async () => {
        const ok = await verifyPin(next);
        if (ok) {
          await clearFailedAttempts();
          await clearLockoutUntil();
          unlock();
        } else {
          Vibration.vibrate(400);
          const na = await incrementFailedAttempts();
          setPin('');
          if (na >= CONFIG.MAX_PIN_ATTEMPTS) {
            const lockoutUntil = Date.now() + CONFIG.COOLDOWN_SECONDS * 1000;
            await setLockoutUntil(lockoutUntil);
            await setFailedAttempts(0);
            setLockoutUntilTs(lockoutUntil);
            setError(`Too many attempts. Wait ${CONFIG.COOLDOWN_SECONDS}s`);
          } else {
            setError(`Incorrect PIN. ${CONFIG.MAX_PIN_ATTEMPTS - na} attempts remaining`);
          }
        }
      }, 100);
    }
  };

  return (
    <SafeAreaView style={s.container} edges={['top', 'bottom']}>
      <Text style={s.title}>MoneyMate</Text>
      <Text style={s.sub}>{cooldown > 0 ? `Please wait ${cooldown}s...` : 'Enter your PIN'}</Text>
      <View style={s.dots}>
        {[0, 1, 2, 3].map(i => (
          <View key={i} style={[s.dot, pin.length > i && s.dotFilled, !!error && s.dotError]} />
        ))}
      </View>
      {error ? <Text style={s.error}>{error}</Text> : <View style={{ height: 20 }} />}
      <View style={s.pad}>
        {DIGITS.map((row, ri) => (
          <View key={ri} style={s.row}>
            {row.map((d, di) => (
              <TouchableOpacity
                key={di}
                style={[s.key, (cooldown > 0 || d === '') && s.keyDisabled]}
                onPress={() => handleDigit(d)}
                activeOpacity={0.7}
                disabled={cooldown > 0}
              >
                <Text style={s.keyText}>{d}</Text>
              </TouchableOpacity>
            ))}
          </View>
        ))}
      </View>
      {biometricEnabled && (
        <TouchableOpacity onPress={tryBiometric} style={s.bioBtn}>
          <Text style={s.bioText}>🔐 Use biometrics</Text>
        </TouchableOpacity>
      )}
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  container:   { flex: 1, backgroundColor: colors.bg.primary, alignItems: 'center', justifyContent: 'center', gap: spacing.lg },
  title:       { fontSize: 28, fontWeight: '700', color: colors.accent.primary },
  sub:         { fontSize: 14, color: colors.text.secondary },
  dots:        { flexDirection: 'row', gap: 16, marginVertical: spacing.md },
  dot:         { width: 16, height: 16, borderRadius: 8, borderWidth: 2, borderColor: colors.accent.primary },
  dotFilled:   { backgroundColor: colors.accent.primary },
  dotError:    { borderColor: colors.expense },
  error:       { fontSize: 13, color: colors.expense, textAlign: 'center', paddingHorizontal: spacing.xl },
  pad:         { gap: spacing.md },
  row:         { flexDirection: 'row', gap: spacing.md },
  key:         { width: 80, height: 80, borderRadius: 40, backgroundColor: colors.bg.secondary, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: colors.border.default },
  keyDisabled: { opacity: 0.3 },
  keyText:     { fontSize: 24, fontWeight: '500', color: colors.text.primary },
  bioBtn:      { marginTop: spacing.md, padding: spacing.md },
  bioText:     { fontSize: 15, color: colors.accent.primary },
});
