export interface Currency {
  code: string;
  name: string;
  symbol: string;
  rate_to_ron: number;
}

export const DEFAULT_CURRENCIES: Currency[] = [
  { code: 'RON', name: 'Romanian Leu',  symbol: 'lei', rate_to_ron: 1.0 },
  { code: 'EUR', name: 'Euro',          symbol: '€',   rate_to_ron: 4.97 },
  { code: 'USD', name: 'Dolar american',symbol: '$',   rate_to_ron: 4.57 },
  { code: 'GBP', name: 'British Pound', symbol: '£',   rate_to_ron: 5.79 },
  { code: 'CHF', name: 'Swiss Franc',symbol: 'Fr',  rate_to_ron: 5.14 },
  { code: 'HUF', name: 'Forint maghiar',symbol: 'Ft',  rate_to_ron: 0.012 },
];
