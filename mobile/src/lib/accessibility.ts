/**
 * Flow - Accessibility Helpers
 *
 * Utility functions to make Flow's financial data accessible to VoiceOver
 * and other assistive technologies.
 *
 * All currency, percentage, and date values should be formatted through
 * these helpers when used in accessibilityLabel or accessibilityHint props.
 */

/**
 * Format a currency amount for VoiceOver readout.
 * Converts numeric amount to spoken Swiss Franc format.
 *
 * @param amount - The amount to format (e.g., 1234.56)
 * @returns Accessible string (e.g., "1234 francs and 56 centimes")
 *
 * @example
 * accessibleCurrency(1234.56) // "1234 francs and 56 centimes"
 * accessibleCurrency(0) // "zero francs"
 * accessibleCurrency(-500.00) // "negative 500 francs"
 * accessibleCurrency(1000) // "1000 francs"
 */
export function accessibleCurrency(amount: number): string {
  const isNegative = amount < 0;
  const absAmount = Math.abs(amount);
  const wholePart = Math.floor(absAmount);
  const centsPart = Math.round((absAmount - wholePart) * 100);

  const prefix = isNegative ? 'negative ' : '';

  if (wholePart === 0 && centsPart === 0) {
    return 'zero francs';
  }

  const francsText = wholePart === 1 ? '1 franc' : `${wholePart} francs`;

  if (centsPart === 0) {
    return `${prefix}${francsText}`;
  }

  const centimesText = centsPart === 1 ? '1 centime' : `${centsPart} centimes`;

  if (wholePart === 0) {
    return `${prefix}${centimesText}`;
  }

  return `${prefix}${francsText} and ${centimesText}`;
}

/**
 * Format budget status for VoiceOver readout.
 * Provides context about how a budget category is performing.
 *
 * @param category - Category name (e.g., "Dining Out")
 * @param percentage - Percentage of budget used (e.g., 75)
 * @returns Accessible description string
 *
 * @example
 * accessibleBudgetStatus("Dining Out", 75) // "Dining Out: 75 percent of budget used, progressing well"
 * accessibleBudgetStatus("Groceries", 45) // "Groceries: 45 percent of budget used, on track"
 * accessibleBudgetStatus("Transport", 110) // "Transport: 110 percent of budget used, flow adjusted"
 */
export function accessibleBudgetStatus(category: string, percentage: number): string {
  const roundedPercentage = Math.round(percentage);

  let statusDescription: string;
  if (roundedPercentage <= 70) {
    statusDescription = 'on track';
  } else if (roundedPercentage <= 90) {
    statusDescription = 'progressing well';
  } else if (roundedPercentage <= 100) {
    statusDescription = 'nearly there';
  } else {
    statusDescription = 'flow adjusted';
  }

  return `${category}: ${roundedPercentage} percent of budget used, ${statusDescription}`;
}

/**
 * Format a date string for VoiceOver readout.
 * Converts ISO date strings to natural spoken format.
 *
 * @param dateString - ISO date string (e.g., "2026-02-08")
 * @returns Accessible date string (e.g., "February 8th, 2026")
 *
 * @example
 * accessibleDate("2026-02-08") // "February 8th, 2026"
 * accessibleDate("2026-01-01") // "January 1st, 2026"
 * accessibleDate("2026-03-23") // "March 23rd, 2026"
 */
export function accessibleDate(dateString: string): string {
  try {
    const date = new Date(dateString + 'T12:00:00'); // Noon to avoid timezone issues
    const months = [
      'January', 'February', 'March', 'April', 'May', 'June',
      'July', 'August', 'September', 'October', 'November', 'December',
    ];

    const day = date.getDate();
    const month = months[date.getMonth()];
    const year = date.getFullYear();
    const suffix = getOrdinalSuffix(day);

    return `${month} ${day}${suffix}, ${year}`;
  } catch {
    return dateString;
  }
}

/**
 * Get ordinal suffix for a day number.
 *
 * @param day - Day of month (1-31)
 * @returns Ordinal suffix ("st", "nd", "rd", or "th")
 */
function getOrdinalSuffix(day: number): string {
  if (day >= 11 && day <= 13) return 'th';
  switch (day % 10) {
    case 1: return 'st';
    case 2: return 'nd';
    case 3: return 'rd';
    default: return 'th';
  }
}

/**
 * Format a transaction for VoiceOver readout.
 * Provides complete context about a transaction.
 *
 * @param payee - Who the transaction was with
 * @param amount - Transaction amount
 * @param type - "income" or "expense"
 * @param category - Category name
 * @param date - ISO date string
 * @returns Accessible transaction description
 *
 * @example
 * accessibleTransaction("Migros", 45.50, "expense", "Groceries", "2026-02-08")
 * // "Expense of 45 francs and 50 centimes at Migros, categorized as Groceries, on February 8th, 2026"
 */
export function accessibleTransaction(
  payee: string,
  amount: number,
  type: 'income' | 'expense',
  category: string,
  date: string,
): string {
  const typeLabel = type === 'income' ? 'Income' : 'Expense';
  const amountLabel = accessibleCurrency(Math.abs(amount));
  const dateLabel = accessibleDate(date);
  const preposition = type === 'expense' ? 'at' : 'from';

  return `${typeLabel} of ${amountLabel} ${preposition} ${payee}, categorized as ${category}, on ${dateLabel}`;
}

/**
 * Format a settlement balance for VoiceOver readout.
 *
 * @param youOwe - Whether the current user owes (true) or is owed (false)
 * @param partnerName - Partner's display name
 * @param amount - Settlement amount
 * @returns Accessible settlement description
 *
 * @example
 * accessibleSettlement(true, "Cecilia", 340.50)
 * // "You owe Cecilia 340 francs and 50 centimes"
 */
export function accessibleSettlement(
  youOwe: boolean,
  partnerName: string,
  amount: number,
): string {
  const amountLabel = accessibleCurrency(amount);

  if (youOwe) {
    return `You owe ${partnerName} ${amountLabel}`;
  }
  return `${partnerName} owes you ${amountLabel}`;
}

/**
 * Format a budget period for VoiceOver readout.
 *
 * @param startDate - Period start date (ISO format)
 * @param endDate - Period end date (ISO format)
 * @param daysRemaining - Number of days remaining in period
 * @returns Accessible period description
 *
 * @example
 * accessibleBudgetPeriod("2026-01-25", "2026-02-24", 16)
 * // "Budget period from January 25th, 2026 to February 24th, 2026. 16 days remaining."
 */
export function accessibleBudgetPeriod(
  startDate: string,
  endDate: string,
  daysRemaining: number,
): string {
  const start = accessibleDate(startDate);
  const end = accessibleDate(endDate);
  const daysText = daysRemaining === 1 ? '1 day remaining' : `${daysRemaining} days remaining`;

  return `Budget period from ${start} to ${end}. ${daysText}.`;
}

/**
 * Format an account balance for VoiceOver readout.
 *
 * @param accountName - Account display name
 * @param balance - Account balance
 * @param accountType - Type of account
 * @returns Accessible account description
 *
 * @example
 * accessibleAccount("ZKB Main", 5234.50, "Checking")
 * // "ZKB Main checking account, balance of 5234 francs and 50 centimes"
 */
export function accessibleAccount(
  accountName: string,
  balance: number,
  accountType: string,
): string {
  const balanceLabel = accessibleCurrency(balance);
  return `${accountName} ${accountType.toLowerCase()} account, balance of ${balanceLabel}`;
}
