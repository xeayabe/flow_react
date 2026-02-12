// FIX: CODE-2 - Shared API types replacing critical `any` usages

/**
 * InstantDB query result wrapper.
 * Used to type the result of db.queryOnce() calls.
 */
export interface InstantDBQueryResult<T extends Record<string, unknown[]>> {
  data: T;
}

/**
 * Standard API response for mutation operations.
 */
export interface ApiResponse<T = void> {
  success: boolean;
  data?: T;
  error?: string;
}

/**
 * Budget period calculated dynamically from payday settings.
 * NEVER store these dates in the database.
 */
export interface BudgetPeriod {
  start: string; // ISO format YYYY-MM-DD
  end: string;   // ISO format YYYY-MM-DD
  paydayDay: number;
  source: 'member' | 'household';
  daysRemaining: number;
}

/**
 * Account record from InstantDB.
 */
export interface AccountRecord {
  id: string;
  userId: string;
  householdId: string;
  name: string;
  institution?: string;
  accountType?: string;
  balance: number;
  currency?: string;
  isDefault?: boolean;
  isExcludedFromBudget?: boolean;
  last4Digits?: string;
  createdAt?: number;
  updatedAt?: number;
}

/**
 * Budget record from InstantDB.
 */
export interface BudgetRecord {
  id: string;
  userId: string;
  categoryId: string;
  allocatedAmount: number;
  spentAmount: number;
  percentage: number;
  categoryGroup: string;
  isActive: boolean;
}

/**
 * Budget summary record from InstantDB.
 */
export interface BudgetSummaryRecord {
  id: string;
  userId: string;
  totalIncome: number;
  totalAllocated: number;
  totalSpent: number;
}

/**
 * Category record from InstantDB.
 */
export interface CategoryRecord {
  id: string;
  name: string;
  emoji?: string;
  icon?: string;
  type: 'income' | 'expense';
  categoryGroup?: string;
  householdId: string;
}

/**
 * User record from InstantDB.
 */
export interface UserRecord {
  id: string;
  email: string;
  name?: string;
}

/**
 * Household member record from InstantDB.
 */
export interface HouseholdMemberRecord {
  id: string;
  userId: string;
  householdId: string;
  status: 'active' | 'invited' | 'removed';
  role?: string;
  paydayDay?: number;
}

/**
 * Household record from InstantDB.
 */
export interface HouseholdRecord {
  id: string;
  name?: string;
  paydayDay?: number;
}

/**
 * Shared expense split record from InstantDB.
 */
export interface SharedExpenseSplitRecord {
  id: string;
  transactionId: string;
  owerUserId: string;
  owedToUserId: string;
  splitAmount: number;
  isPaid: boolean;
}

/**
 * Settlement record from InstantDB.
 */
export interface SettlementRecord {
  id: string;
  householdId: string;
  payerUserId: string;
  receiverUserId: string;
  amount: number;
  paymentMethod: string;
  categoryId?: string;
  note?: string;
  settledExpenses: string[];
  settledAt: number;
  createdAt: number;
}

/**
 * Transaction record from InstantDB (raw DB shape).
 */
export interface TransactionRecord {
  id: string;
  userId: string;
  householdId: string;
  accountId: string;
  categoryId: string;
  type: 'income' | 'expense' | 'settlement';
  amount: number;
  date: string;
  note?: string;
  payee?: string;
  isShared: boolean;
  paidByUserId?: string;
  isRecurring?: boolean;
  recurringDay?: number;
  isExcludedFromBudget?: boolean;
  settled?: boolean;
  settledAt?: number;
  settlementId?: string;
  createdAt?: number;
  updatedAt?: number;
}
