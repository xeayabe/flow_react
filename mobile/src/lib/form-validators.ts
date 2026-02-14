// FIX: CODE-5 - Extracted shared form validation logic from add/edit screens
// for transactions and wallets. Eliminates ~300+ lines of duplicated validation.

/**
 * Transaction form validation errors
 */
export interface TransactionFormErrors {
  amount?: string;
  categoryId?: string;
  accountId?: string;
  date?: string;
}

/**
 * Wallet form validation errors
 */
export interface WalletFormErrors {
  name?: string;
  accountType?: string;
  startingBalance?: string;
  last4Digits?: string;
}

// ─────────────────────────────────────────────────────────────────
// Transaction Validators
// ─────────────────────────────────────────────────────────────────

/**
 * Validates a transaction amount string.
 * Returns error message or undefined if valid.
 */
export function validateTransactionAmount(amount: string): string | undefined {
  if (!amount || amount.trim() === '') {
    return 'Please enter a valid amount';
  }
  const parsed = parseFloat(amount);
  if (isNaN(parsed) || parsed <= 0) {
    return 'Amount must be greater than 0';
  }
  return undefined;
}

/**
 * Validates that a category is selected.
 */
export function validateCategoryId(categoryId: string): string | undefined {
  if (!categoryId || categoryId.trim() === '') {
    return 'Please select a category';
  }
  return undefined;
}

/**
 * Validates that an account/wallet is selected.
 */
export function validateAccountId(accountId: string): string | undefined {
  if (!accountId || accountId.trim() === '') {
    return 'Please select a wallet';
  }
  return undefined;
}

/**
 * Validates a transaction date string.
 * Accepts ISO format YYYY-MM-DD.
 */
export function validateTransactionDate(date: string): string | undefined {
  if (!date || date.trim() === '') {
    return 'Please select a date';
  }
  const parsed = new Date(date + 'T00:00:00');
  if (isNaN(parsed.getTime())) {
    return 'Invalid date format';
  }
  return undefined;
}

/**
 * Validates all transaction form fields at once.
 * Returns an object of field errors. Empty object means all valid.
 */
export function validateTransactionForm(formData: {
  amount: string;
  categoryId: string;
  accountId: string;
  date: string;
}): TransactionFormErrors {
  const errors: TransactionFormErrors = {};

  const amountError = validateTransactionAmount(formData.amount);
  if (amountError) errors.amount = amountError;

  const categoryError = validateCategoryId(formData.categoryId);
  if (categoryError) errors.categoryId = categoryError;

  const accountError = validateAccountId(formData.accountId);
  if (accountError) errors.accountId = accountError;

  const dateError = validateTransactionDate(formData.date);
  if (dateError) errors.date = dateError;

  return errors;
}

/**
 * Checks if a transaction form is valid (all required fields filled).
 * Useful for enabling/disabling submit buttons.
 */
export function isTransactionFormValid(formData: {
  amount: string;
  categoryId: string;
  accountId: string;
}): boolean {
  return (
    formData.amount !== '' &&
    parseFloat(formData.amount) > 0 &&
    formData.categoryId !== '' &&
    formData.accountId !== ''
  );
}

/**
 * Normalizes and cleans a numeric input string.
 * Handles European comma decimals, removes non-numeric chars,
 * and ensures only one decimal point.
 */
export function normalizeAmountInput(text: string): string {
  // Replace comma with dot for European locales
  const normalized = text.replace(',', '.');
  // Remove non-numeric characters (except dot)
  const cleaned = normalized.replace(/[^0-9.]/g, '');
  // Ensure only one decimal point
  const parts = cleaned.split('.');
  return parts.length > 2 ? parts[0] + '.' + parts.slice(1).join('') : cleaned;
}

// ─────────────────────────────────────────────────────────────────
// Wallet Validators
// ─────────────────────────────────────────────────────────────────

/**
 * Validates a wallet name.
 */
export function validateWalletName(name: string): string | undefined {
  if (!name.trim()) return 'Please enter a wallet name';
  if (name.trim().length < 2) return 'Minimum 2 characters';
  if (name.length > 50) return 'Maximum 50 characters';
  return undefined;
}

/**
 * Validates that a wallet type is selected.
 */
export function validateAccountType(accountType: string): string | undefined {
  if (!accountType) return 'Please select a wallet type';
  return undefined;
}

/**
 * Validates a starting balance string.
 * Accepts formats like "1000", "1,000", "1'000", "1000.50".
 */
export function validateStartingBalance(balance: string): string | undefined {
  if (!balance.trim()) return 'Please enter a starting balance';
  // Remove common thousand separators for parsing
  const cleaned = balance.replace(/[',\s]/g, '');
  const parsed = parseFloat(cleaned);
  if (isNaN(parsed)) return 'Please enter a valid number';
  return undefined;
}

/**
 * Validates last 4 digits of a card/account number (optional field).
 */
export function validateLast4Digits(digits: string): string | undefined {
  if (!digits) return undefined; // Optional field
  if (digits.length !== 4) return 'Card/Account number should be 4 digits';
  if (!/^\d{4}$/.test(digits)) return 'Card/Account number should be 4 digits';
  return undefined;
}

/**
 * Validates all wallet form fields at once.
 */
export function validateWalletForm(formData: {
  name: string;
  accountType: string;
  startingBalance: string;
  last4Digits: string;
}): WalletFormErrors {
  const errors: WalletFormErrors = {};

  const nameError = validateWalletName(formData.name);
  if (nameError) errors.name = nameError;

  const typeError = validateAccountType(formData.accountType);
  if (typeError) errors.accountType = typeError;

  const balanceError = validateStartingBalance(formData.startingBalance);
  if (balanceError) errors.startingBalance = balanceError;

  const digitsError = validateLast4Digits(formData.last4Digits);
  if (digitsError) errors.last4Digits = digitsError;

  return errors;
}

/**
 * Checks if a wallet form is valid.
 */
export function isWalletFormValid(formData: {
  name: string;
  accountType: string;
  startingBalance: string;
  last4Digits: string;
}): boolean {
  return (
    !validateWalletName(formData.name) &&
    !validateAccountType(formData.accountType) &&
    !validateStartingBalance(formData.startingBalance) &&
    !validateLast4Digits(formData.last4Digits)
  );
}
