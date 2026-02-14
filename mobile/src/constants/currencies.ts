/**
 * Currency definitions for Flow app
 *
 * Supported currencies: CHF, EUR, USD, GBP
 * Currency is selected per-wallet during creation and locked permanently after that.
 */

export interface CurrencyConfig {
  code: CurrencyCode;
  symbol: string;
  displayName: string;
  flag: string;
  locale: string;
  thousandSeparator: string;
  decimalSeparator: string;
  symbolPosition: 'prefix' | 'suffix';
}

export const CURRENCY_CODES = ['CHF', 'EUR', 'USD', 'GBP'] as const;
export type CurrencyCode = (typeof CURRENCY_CODES)[number];

export const CURRENCIES: Record<CurrencyCode, CurrencyConfig> = {
  CHF: {
    code: 'CHF',
    symbol: 'CHF',
    displayName: 'Swiss Franc',
    flag: 'CH',
    locale: 'de-CH',
    thousandSeparator: "'",
    decimalSeparator: '.',
    symbolPosition: 'suffix',
  },
  EUR: {
    code: 'EUR',
    symbol: 'EUR',
    displayName: 'Euro',
    flag: 'EU',
    locale: 'de-DE',
    thousandSeparator: '.',
    decimalSeparator: ',',
    symbolPosition: 'suffix',
  },
  USD: {
    code: 'USD',
    symbol: '$',
    displayName: 'US Dollar',
    flag: 'US',
    locale: 'en-US',
    thousandSeparator: ',',
    decimalSeparator: '.',
    symbolPosition: 'prefix',
  },
  GBP: {
    code: 'GBP',
    symbol: 'GBP',
    displayName: 'British Pound',
    flag: 'GB',
    locale: 'en-GB',
    thousandSeparator: ',',
    decimalSeparator: '.',
    symbolPosition: 'suffix',
  },
} as const;

/**
 * Check if a string is a valid currency code
 */
export function isValidCurrencyCode(code: string): code is CurrencyCode {
  return CURRENCY_CODES.includes(code as CurrencyCode);
}

/**
 * Get currency config with fallback to CHF
 */
export function getCurrencyConfig(code: string): CurrencyConfig {
  if (isValidCurrencyCode(code)) {
    return CURRENCIES[code];
  }
  return CURRENCIES.CHF;
}
