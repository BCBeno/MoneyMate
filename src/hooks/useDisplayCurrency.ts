import { useEffect, useState } from 'react';
import { useSettingsStore } from '../store/slices/settingsSlice';
import { getCurrencyRate } from '../services/currencyService';
import { formatBaseCurrency } from '../utils/formatCurrency';

export function useDisplayCurrency() {
  const currency = useSettingsStore(state => state.currency);
  const [conversion, setConversion] = useState({ currency: 'RON', rate: 1 });
  useEffect(() => {
    let active = true;
    if (currency === 'RON') { setConversion({ currency, rate: 1 }); return; }
    getCurrencyRate(currency).then(rate => {
      if (active && Number.isFinite(rate) && rate > 0) setConversion({ currency, rate });
    }).catch(console.error);
    return () => { active = false; };
  }, [currency]);
  // Never label base-currency amounts with a currency whose rate is still loading.
  return { currency: conversion.currency, rate: conversion.rate,
    displayAmount: (amountRON: number, decimals = 2) => formatBaseCurrency(amountRON, conversion.currency, conversion.rate, decimals) };
}
