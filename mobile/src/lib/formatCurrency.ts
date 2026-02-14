/**
 * Multi-currency formatter for Flow app
 *
 * Formats amounts according to each currency's locale conventions:
 * - CHF: 13'648.51 CHF (apostrophe separator, suffix)
 * - EUR: 13.648,51 EUR (dot separator, comma decimal, suffix)
 * - USD: $13,648.51 (comma separator, prefix symbol)
 * - GBP: 13,648.51 GBP (comma separator, suffix)
 */
import { getCurrencyConfig, type CurrencyCode } from '@/constants/currencies';

export function formatCurrency(
  amount: number,
  options?: {
    showSign?: boolean;
    showCurrency?: boolean;
    currency?: string;
  }
): string {
  const { showSign = false, showCurrency = true, currency = 'CHF' } = options || {};

  const config = getCurrencyConfig(currency);
  const isNegative = amount < 0;
  const absoluteAmount = Math.abs(amount);

  // Format to 2 decimals
  const formatted = absoluteAmount.toFixed(2);
  const [integerPart, decimalPart] = formatted.split('.');

  // Add thousand separators using the currency's convention
  const withSeparator = integerPart.replace(
    /\B(?=(\d{3})+(?!\d))/g,
    config.thousandSeparator
  );

  // Construct the number string with proper decimal separator
  const numberStr = `${withSeparator}${config.decimalSeparator}${decimalPart}`;

  // Construct final string with currency symbol
  let result: string;
  if (!showCurrency) {
    result = numberStr;
  } else if (config.symbolPosition === 'prefix') {
    result = `${config.symbol}${numberStr}`;
  } else {
    result = `${numberStr} ${config.symbol}`;
  }

  // Add sign
  if (isNegative) {
    result = `-${result}`;
  } else if (showSign && amount > 0) {
    result = `+${result}`;
  }

  return result;
}
