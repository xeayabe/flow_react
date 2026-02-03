/**
 * Swiss CHF Formatter
 * Standard: 13'648.51 CHF (apostrophe separator, suffix)
 */
export function formatCurrency(
  amount: number,
  options?: {
    showSign?: boolean;
    showCurrency?: boolean;
  }
): string {
  const { showSign = false, showCurrency = true } = options || {};

  const isNegative = amount < 0;
  const absoluteAmount = Math.abs(amount);

  // Format to 2 decimals
  const formatted = absoluteAmount.toFixed(2);
  const [integerPart, decimalPart] = formatted.split('.');

  // Add apostrophe thousand separators (Swiss standard)
  const withSeparator = integerPart.replace(/\B(?=(\d{3})+(?!\d))/g, "'");

  // Construct final string
  let result = `${withSeparator}.${decimalPart}`;

  if (showCurrency) {
    result += ' CHF';
  }

  // Add sign
  if (isNegative) {
    result = `-${result}`;
  } else if (showSign && amount > 0) {
    result = `+${result}`;
  }

  return result;
}
