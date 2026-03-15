import * as SecureStore from 'expo-secure-store';
import * as LocalAuthentication from 'expo-local-authentication';
import * as Crypto from 'expo-crypto';

const LEGACY_PIN_KEY = 'moneymate_pin';
const PIN_HASH_KEY = 'moneymate_pin_hash';
const FAILED_ATTEMPTS_KEY = 'moneymate_failed_attempts';
const LOCKOUT_UNTIL_KEY = 'moneymate_lockout_until';

async function hashPin(pin: string): Promise<string> {
  return Crypto.digestStringAsync(Crypto.CryptoDigestAlgorithm.SHA256, pin);
}

export async function savePin(pin: string): Promise<void> {
  const pinHash = await hashPin(pin);
  await SecureStore.setItemAsync(PIN_HASH_KEY, pinHash);
  await SecureStore.deleteItemAsync(LEGACY_PIN_KEY);
}

export async function verifyPin(pin: string): Promise<boolean> {
  const storedHash = await SecureStore.getItemAsync(PIN_HASH_KEY);
  if (storedHash) {
    const pinHash = await hashPin(pin);
    return storedHash === pinHash;
  }

  // Backward compatibility with old plain-text key; auto-migrate on successful match.
  const legacyPin = await SecureStore.getItemAsync(LEGACY_PIN_KEY);
  if (!legacyPin || legacyPin !== pin) return false;
  await savePin(pin);
  return true;
}

export async function deletePin(): Promise<void> {
  await SecureStore.deleteItemAsync(PIN_HASH_KEY);
  await SecureStore.deleteItemAsync(LEGACY_PIN_KEY);
  await clearFailedAttempts();
  await clearLockoutUntil();
}

export async function isBiometricAvailable(): Promise<boolean> {
  const compatible = await LocalAuthentication.hasHardwareAsync();
  if (!compatible) return false;
  const enrolled = await LocalAuthentication.isEnrolledAsync();
  return enrolled;
}

export async function authenticateWithBiometrics(): Promise<boolean> {
  const result = await LocalAuthentication.authenticateAsync({
    promptMessage: 'Authenticate MoneyMate',
    cancelLabel: 'Use PIN',
    disableDeviceFallback: true,
  });
  return result.success;
}

export async function getFailedAttempts(): Promise<number> {
  const raw = await SecureStore.getItemAsync(FAILED_ATTEMPTS_KEY);
  const value = parseInt(raw ?? '0', 10);
  return Number.isFinite(value) ? value : 0;
}

export async function setFailedAttempts(value: number): Promise<void> {
  await SecureStore.setItemAsync(FAILED_ATTEMPTS_KEY, String(Math.max(0, value)));
}

export async function incrementFailedAttempts(): Promise<number> {
  const next = (await getFailedAttempts()) + 1;
  await setFailedAttempts(next);
  return next;
}

export async function clearFailedAttempts(): Promise<void> {
  await SecureStore.deleteItemAsync(FAILED_ATTEMPTS_KEY);
}

export async function getLockoutUntil(): Promise<number> {
  const raw = await SecureStore.getItemAsync(LOCKOUT_UNTIL_KEY);
  const value = parseInt(raw ?? '0', 10);
  return Number.isFinite(value) ? value : 0;
}

export async function setLockoutUntil(timestampMs: number): Promise<void> {
  await SecureStore.setItemAsync(LOCKOUT_UNTIL_KEY, String(Math.max(0, timestampMs)));
}

export async function clearLockoutUntil(): Promise<void> {
  await SecureStore.deleteItemAsync(LOCKOUT_UNTIL_KEY);
}
