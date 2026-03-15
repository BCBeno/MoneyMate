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
    // Always use decimals — never round to 0 unless caller explicitly passes decimals=0
    formatted = abs.toFixed(decimals).replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  }

  return symbol ? `${formatted} ${symbol}` : formatted;
}
