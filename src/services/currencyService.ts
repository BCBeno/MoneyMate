import { getDatabase } from '../database/database';
import { getSetting, setSetting } from '../database/repositories/settingsRepository';

export async function getCurrencyRate(code: string): Promise<number> {
  const db = await getDatabase();
  const row = await db.getFirstAsync<{ rate_to_ron: number }>(
    'SELECT rate_to_ron FROM currencies WHERE code = ?', [code]
  );
  return row?.rate_to_ron ?? 1;
}

export async function convertToRON(amount: number, fromCode: string): Promise<number> {
  if (fromCode === 'RON') return amount;
  const rate = await getCurrencyRate(fromCode);
  return amount * rate;
}

export async function getPreferredCurrency(): Promise<string> {
  return (await getSetting('currency')) ?? 'RON';
}

export async function setPreferredCurrency(code: string): Promise<void> {
  await setSetting('currency', code);
}
