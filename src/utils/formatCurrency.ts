/**
 * Format a monetary amount.
 * @param amount   The numeric value (negative values show absolute value)
 * @param symbol   Optional currency symbol appended after amount
 * @param decimals Number of decimal places (default 2)
 */
export function formatCurrency(
  amount: number,
  symbol: string = '',
  decimals: number = 2
): string {
  const abs = Math.abs(amount);
  let formatted: string;

  if (abs >= 1_000_000) {
    formatted = (abs / 1_000_000).toFixed(1) + 'M';
  } else {
    const parts = abs.toFixed(decimals).split('.');
    parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, '.');
    formatted = parts.length > 1 ? parts.join(',') : parts[0];
  }

  return symbol ? `${formatted} ${symbol}` : formatted;
}
