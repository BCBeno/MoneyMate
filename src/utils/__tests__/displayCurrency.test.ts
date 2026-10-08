import { formatBaseCurrency } from '../formatCurrency';

describe('main currency display', () => {
  it('converts the stored RON amount before labelling a foreign currency', () => {
    expect(formatBaseCurrency(49.7, 'EUR', 4.97)).toBe('10,00 EUR');
    expect(formatBaseCurrency(35, 'RON', 1)).toBe('35,00 RON');
  });
  it('preserves the sign of a negative balance exactly once', () => {
    expect(formatBaseCurrency(-49.7, 'EUR', 4.97)).toBe('−10,00 EUR');
    expect(formatBaseCurrency(0, 'RON', 1)).toBe('0,00 RON');
  });
});
