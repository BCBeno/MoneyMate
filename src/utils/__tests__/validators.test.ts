import { isValidAmount, isValidDate, isValidPin, parseAmount } from '../validators';

describe('validators utils', () => {
  it('validates positive amount strings with comma or dot decimal separator', () => {
    expect(isValidAmount('10')).toBe(true);
    expect(isValidAmount('10.25')).toBe(true);
    expect(isValidAmount('10,25')).toBe(true);
    expect(isValidAmount('0')).toBe(false);
    expect(isValidAmount('-5')).toBe(false);
    expect(isValidAmount('abc')).toBe(false);
  });

  it('validates 4-digit pin format', () => {
    expect(isValidPin('1234')).toBe(true);
    expect(isValidPin('123')).toBe(false);
    expect(isValidPin('abcd')).toBe(false);
    expect(isValidPin('12345')).toBe(false);
  });

  it('validates date strings', () => {
    expect(isValidDate('2026-03-16')).toBe(true);
    expect(isValidDate('not-a-date')).toBe(false);
  });

  it('parses amounts and falls back to zero for invalid values', () => {
    expect(parseAmount('12,5')).toBe(12.5);
    expect(parseAmount('12.5')).toBe(12.5);
    expect(parseAmount('x')).toBe(0);
  });
});
