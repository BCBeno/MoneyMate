import * as SecureStore from 'expo-secure-store';
import * as LocalAuthentication from 'expo-local-authentication';
import * as Crypto from 'expo-crypto';

const LEGACY_PIN_KEY = 'moneymate_pin';
const PIN_HASH_KEY = 'moneymate_pin_hash';
const PIN_SALT_KEY = 'moneymate_pin_salt';
const FAILED_ATTEMPTS_KEY = 'moneymate_failed_attempts';
const LOCKOUT_UNTIL_KEY = 'moneymate_lockout_until';

async function generateSalt(): Promise<string> {
  const bytes = await Crypto.getRandomBytesAsync(16);
  return Array.from(bytes).map(b => b.toString(16).padStart(2, '0')).join('');
}

async function hashPin(pin: string, salt: string): Promise<string> {
  return Crypto.digestStringAsync(Crypto.CryptoDigestAlgorithm.SHA256, salt + pin);
}

function constantTimeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) {
    diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return diff === 0;
}

export async function isPinSet(): Promise<boolean> {
  const hash = await SecureStore.getItemAsync(PIN_HASH_KEY);
  return hash !== null;
}

export async function savePin(pin: string): Promise<void> {
  const salt = await generateSalt();
  const pinHash = await hashPin(pin, salt);
  await SecureStore.setItemAsync(PIN_SALT_KEY, salt);
  await SecureStore.setItemAsync(PIN_HASH_KEY, pinHash);
  await SecureStore.deleteItemAsync(LEGACY_PIN_KEY);
}

export async function verifyPin(pin: string): Promise<boolean> {
  const storedHash = await SecureStore.getItemAsync(PIN_HASH_KEY);
  if (storedHash) {
    const salt = (await SecureStore.getItemAsync(PIN_SALT_KEY)) ?? '';
    const pinHash = await hashPin(pin, salt);
    return constantTimeEqual(pinHash, storedHash);
  }

  // Legacy plaintext migration — auto-upgrades to salted hash on first successful login.
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
