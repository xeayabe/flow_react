// FIX: SEC-005, SEC-011, SEC-013, SEC-022, CQP-023
// Comprehensive input validation module using Zod for all user-facing data

import { z } from 'zod';

// ============================================================
// Common validators
// ============================================================

/**
 * Sanitize a string: trim whitespace, remove control characters,
 * collapse multiple spaces, and strip HTML tags.
 */
function sanitizeString(input: string): string {
  return input
    .trim()
    // Remove control characters (except newline/tab for notes)
    .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '')
    // Strip HTML tags
    .replace(/<[^>]*>/g, '')
    // Collapse multiple spaces
    .replace(/\s{2,}/g, ' ');
}

/**
 * Zod transform that sanitizes strings.
 */
const sanitized = z.string().transform(sanitizeString);

/**
 * Validate an ISO date string (YYYY-MM-DD) and check it's within a reasonable range.
 * Reasonable range: 5 years in the past to 5 years in the future.
 */
const isoDateString = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be in YYYY-MM-DD format')
  .refine(
    (dateStr) => {
      const date = new Date(dateStr + 'T00:00:00');
      return !isNaN(date.getTime());
    },
    { message: 'Invalid date' }
  )
  .refine(
    (dateStr) => {
      const date = new Date(dateStr + 'T00:00:00');
      const now = new Date();
      const fiveYearsAgo = new Date(now.getFullYear() - 5, now.getMonth(), now.getDate());
      const fiveYearsFromNow = new Date(now.getFullYear() + 5, now.getMonth(), now.getDate());
      return date >= fiveYearsAgo && date <= fiveYearsFromNow;
    },
    { message: 'Date must be within 5 years of today' }
  );

/**
 * Monetary amount: positive, max 999,999.99, at most 2 decimal places.
 */
const monetaryAmount = z
  .number()
  .positive('Amount must be greater than 0')
  .max(999999.99, 'Amount cannot exceed 999,999.99')
  .refine(
    (val) => {
      // Check at most 2 decimal places
      const parts = val.toString().split('.');
      return !parts[1] || parts[1].length <= 2;
    },
    { message: 'Amount must have at most 2 decimal places' }
  );

/**
 * UUID v4 format.
 */
const uuid = z.string().uuid('Invalid ID format');

// ============================================================
// Transaction Validation
// ============================================================

export const TransactionSchema = z.object({
  userId: uuid,
  householdId: uuid,
  accountId: uuid,
  categoryId: uuid,
  type: z.enum(['income', 'expense'], {
    errorMap: () => ({ message: 'Type must be "income" or "expense"' }),
  }),
  amount: monetaryAmount,
  date: isoDateString,
  payee: z
    .string()
    .min(1, 'Payee must be at least 1 character')
    .max(100, 'Payee must be at most 100 characters')
    .transform(sanitizeString)
    .optional(),
  note: z
    .string()
    .max(500, 'Note must be at most 500 characters')
    .transform(sanitizeString)
    .optional(),
  isShared: z.boolean().optional().default(false),
  paidByUserId: uuid.optional(),
  isExcludedFromBudget: z.boolean().optional().default(false),
  isRecurring: z.boolean().optional().default(false),
  recurringDay: z
    .number()
    .int()
    .min(1, 'Recurring day must be between 1 and 31')
    .max(31, 'Recurring day must be between 1 and 31')
    .optional(),
});

export type ValidatedTransaction = z.infer<typeof TransactionSchema>;

// ============================================================
// Wallet / Account Validation
// ============================================================

const VALID_ACCOUNT_TYPES = [
  'Checking',
  'Savings',
  'Credit Card',
  'Cash',
  'Investment',
] as const;

export const WalletSchema = z.object({
  name: z
    .string()
    .min(1, 'Wallet name is required')
    .max(50, 'Wallet name must be at most 50 characters')
    // Only allow alphanumeric, spaces, hyphens, apostrophes
    .regex(
      /^[a-zA-Z0-9\s\-']+$/,
      'Wallet name can only contain letters, numbers, spaces, hyphens, and apostrophes'
    )
    .transform(sanitizeString),
  accountType: z.enum(VALID_ACCOUNT_TYPES, {
    errorMap: () => ({ message: 'Please select a valid account type' }),
  }),
  startingBalance: z
    .number()
    .min(-999999.99, 'Balance cannot be less than -999,999.99')
    .max(999999.99, 'Balance cannot exceed 999,999.99'),
  last4Digits: z
    .string()
    .regex(/^\d{4}$/, 'Must be exactly 4 digits')
    .optional()
    .or(z.literal('')),
  isDefault: z.boolean().optional().default(false),
});

export type ValidatedWallet = z.infer<typeof WalletSchema>;

// ============================================================
// Budget Validation
// ============================================================

export const BudgetAllocationSchema = z
  .object({
    userId: uuid,
    householdId: uuid,
    totalIncome: z
      .number()
      .positive('Total income must be greater than 0')
      .max(999999.99, 'Total income cannot exceed 999,999.99'),
    allocations: z.record(
      z.string(), // categoryId
      z
        .number()
        .min(0, 'Allocation cannot be negative')
        .max(999999.99, 'Single allocation cannot exceed 999,999.99')
    ),
    categoryGroups: z.record(
      z.string(), // categoryId
      z.string() // group key
    ),
  })
  .refine(
    (data) => {
      // Total allocations must not exceed total income (with small floating-point tolerance)
      const totalAllocated = Object.values(data.allocations).reduce(
        (sum, val) => sum + val,
        0
      );
      return totalAllocated <= data.totalIncome + 0.01;
    },
    { message: 'Total allocations cannot exceed total income' }
  )
  .refine(
    (data) => {
      // No individual allocation should exceed 100% of income
      const allValues = Object.values(data.allocations);
      return allValues.every((val) => val <= data.totalIncome + 0.01);
    },
    { message: 'No single category can exceed total income' }
  );

export type ValidatedBudgetAllocation = z.infer<typeof BudgetAllocationSchema>;

// ============================================================
// Settlement Validation
// ============================================================

export const SettlementSchema = z
  .object({
    payerUserId: uuid,
    receiverUserId: uuid,
    amount: monetaryAmount,
    payerAccountId: uuid,
    receiverAccountId: uuid,
    householdId: uuid,
    categoryId: uuid.optional(),
    selectedSplitIds: z.array(uuid).optional(),
    payee: z
      .string()
      .max(100, 'Payee must be at most 100 characters')
      .transform(sanitizeString)
      .optional(),
  })
  .refine(
    (data) => data.payerUserId !== data.receiverUserId,
    { message: 'Payer and receiver must be different users' }
  )
  .refine(
    (data) => data.payerAccountId !== data.receiverAccountId,
    { message: 'Payer and receiver accounts must be different' }
  );

export type ValidatedSettlement = z.infer<typeof SettlementSchema>;

// ============================================================
// Category Validation
// ============================================================

export const CategorySchema = z.object({
  name: z
    .string()
    .min(1, 'Category name is required')
    .max(50, 'Category name must be at most 50 characters')
    .transform(sanitizeString),
  type: z.enum(['income', 'expense'], {
    errorMap: () => ({ message: 'Category type must be "income" or "expense"' }),
  }),
  categoryGroup: z.string().min(1, 'Category group is required'),
  householdId: uuid,
  isShareable: z.boolean().optional().default(false),
  isDefault: z.boolean().optional().default(false),
  createdByUserId: uuid.optional(),
  isActive: z.boolean().optional().default(true),
});

export type ValidatedCategory = z.infer<typeof CategorySchema>;

// ============================================================
// Helper: validate with user-friendly error extraction
// ============================================================

export interface ValidationResult<T> {
  success: boolean;
  data?: T;
  errors?: string[];
}

/**
 * Validate data against a Zod schema and return a user-friendly result.
 *
 * @param schema - Zod schema to validate against
 * @param data - Data to validate
 * @returns ValidationResult with parsed data or error messages
 */
export function validate<T>(
  schema: z.ZodType<T>,
  data: unknown
): ValidationResult<T> {
  const result = schema.safeParse(data);

  if (result.success) {
    return {
      success: true,
      data: result.data,
    };
  }

  const errors = result.error.errors.map((err) => {
    const path = err.path.length > 0 ? `${err.path.join('.')}: ` : '';
    return `${path}${err.message}`;
  });

  return {
    success: false,
    errors,
  };
}
