export function isValidAmount(value: string): boolean {
  const num = parseFloat(value.replace(',', '.'));
  return !isNaN(num) && num > 0;
}

export function isValidPin(pin: string): boolean {
  return /^\d{4}$/.test(pin);
}

export function isValidDate(dateStr: string): boolean {
  const d = new Date(dateStr);
  return !isNaN(d.getTime());
}

export function parseAmount(value: string): number {
  return parseFloat(value.replace(',', '.')) || 0;
}
