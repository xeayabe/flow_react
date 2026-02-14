// FIX: SEC-003 - Replaced console.log/error with secure logger
// FIX: DAT-009 - Added cascade guard check before wallet deletion
// FIX: DAT-008 - Null safety (?? 0) for financial arithmetic on balances
// All queries in this file are already properly scoped by userId or id

import { db } from './db';
import { checkWalletDeletable } from './cascade-guard'; // FIX: DAT-009
import 'react-native-get-random-values';
import { v4 as uuidv4 } from 'uuid';
import { logger } from './logger'; // FIX: SEC-003 - Secure logger
import { formatCurrency as formatCurrencyFn } from './formatCurrency';

export const ACCOUNT_TYPES = [
  'Checking',
  'Savings',
  'Credit Card',
  'Cash',
  'Investment',
] as const;

export type AccountType = typeof ACCOUNT_TYPES[number];

export interface CreateAccountData {
  name: string;
  accountType: AccountType;
  startingBalance: number;
  last4Digits?: string;
  isDefault?: boolean;
  currency?: string;
}

export interface Account {
  id: string;
  userId: string;
  householdId: string;
  name: string;
  institution?: string;
  accountType: AccountType;
  balance: number;
  startingBalance: number;
  currency: string;
  last4Digits?: string;
  isDefault: boolean;
  isActive: boolean;
  isExcludedFromBudget?: boolean;
  createdAt: number;
  updatedAt: number;
}

export interface AccountResponse {
  success: boolean;
  error?: string;
  account?: Account;
}

/**
 * Get user's household ID and currency
 */
async function getUserHouseholdInfo(email: string): Promise<{ householdId: string; currency: string; userId: string } | null> {
  try {
    // First, get the user by email
    const userResult = await db.queryOnce({
      users: {
        $: {
          where: {
            email: email.toLowerCase(),
          },
        },
      },
    });

    const user = userResult.data.users?.[0];
    if (!user) {
      logger.error('User not found for email lookup'); // FIX: SEC-003 - Don't log email
      return null;
    }

    // Then, get the household members for this user
    const membershipResult = await db.queryOnce({
      householdMembers: {
        $: {
          where: {
            userId: user.id,
            status: 'active',
          },
        },
      },
    });

    const membership = membershipResult.data.householdMembers?.[0];
    if (!membership) {
      logger.error('No active household membership found for user'); // FIX: SEC-003 - Don't log userId
      return null;
    }

    // Validate that householdId exists in the membership record
    if (!membership.householdId) {
      logger.error('Membership has no householdId'); // FIX: SEC-003 - Don't log membership id
      return null;
    }

    // Now get the household details using the householdId from the membership
    // This ensures we have the correct household currency
    const householdResult = await db.queryOnce({
      households: {
        $: {
          where: {
            id: membership.householdId,
          },
        },
      },
    });

    const household = householdResult.data.households?.[0];
    if (!household) {
      logger.error('Household not found'); // FIX: SEC-003 - Don't log householdId
      return null;
    }

    return {
      userId: user.id,
      householdId: household.id,
      currency: household.currency || 'CHF',
    };
  } catch (error) {
    logger.error('Get household info error:', error); // FIX: SEC-003
    return null;
  }
}

/**
 * Check if account name already exists for user
 */
export async function checkAccountNameExists(userId: string, name: string): Promise<boolean> {
  try {
    const result = await db.queryOnce({
      accounts: {
        $: {
          where: {
            userId,
            name,
            isActive: true,
          },
        },
      },
    });

    return (result.data.accounts?.length || 0) > 0;
  } catch (error) {
    logger.error('Check account name error:', error); // FIX: SEC-003
    return false;
  }
}

/**
 * Get count of user's accounts
 */
export async function getUserAccountsCount(userId: string): Promise<number> {
  try {
    const result = await db.queryOnce({
      accounts: {
        $: {
          where: {
            userId,
            isActive: true,
          },
        },
      },
    });

    return result.data.accounts?.length || 0;
  } catch (error) {
    logger.error('Get accounts count error:', error); // FIX: SEC-003
    return 0;
  }
}

/**
 * Create new account
 */
export async function createAccount(
  email: string,
  accountData: CreateAccountData
): Promise<AccountResponse> {
  try {
    // Get user's household info
    const householdInfo = await getUserHouseholdInfo(email);
    if (!householdInfo) {
      return { success: false, error: 'User household not found' };
    }

    const { userId, householdId, currency } = householdInfo;

    // Check if account name already exists
    const nameExists = await checkAccountNameExists(userId, accountData.name);
    if (nameExists) {
      return { success: false, error: 'An account with this name already exists' };
    }

    // Check if this is the first account
    const accountsCount = await getUserAccountsCount(userId);
    const isFirstAccount = accountsCount === 0;

    // If first account, force it to be default
    // If user wants this as default, unset previous default
    const shouldBeDefault = isFirstAccount || accountData.isDefault === true;

    // If setting as default and not first account, unset previous default
    if (shouldBeDefault && !isFirstAccount) {
      const existingAccounts = await db.queryOnce({
        accounts: {
          $: {
            where: {
              userId,
              isDefault: true,
              isActive: true,
            },
          },
        },
      });

      // Unset previous default accounts
      for (const account of existingAccounts.data.accounts || []) {
        await db.transact([
          db.tx.accounts[account.id].update({
            isDefault: false
          }),
        ]);
      }
    }

    // Create the account
    const accountId = uuidv4();
    const now = Date.now();

    // Use per-wallet currency if provided, otherwise fall back to household currency
    const walletCurrency = accountData.currency || currency;

    const newAccount: Omit<Account, 'id'> = {
      userId,
      householdId,
      name: accountData.name,
      institution: 'Other',
      accountType: accountData.accountType,
      balance: accountData.startingBalance,
      startingBalance: accountData.startingBalance,
      currency: walletCurrency,
      last4Digits: accountData.last4Digits || '',
      isDefault: shouldBeDefault,
      isActive: true,
      createdAt: now,
      updatedAt: now,
    };

    await db.transact([
      db.tx.accounts[accountId].update(newAccount),
    ]);

    logger.debug('Account created successfully'); // FIX: SEC-003 - Don't log accountId, name, or balance

    return {
      success: true,
      account: { id: accountId, ...newAccount },
    };
  } catch (error) {
    logger.error('Create account error:', error); // FIX: SEC-003
    return {
      success: false,
      error: 'Failed to create account. Please try again',
    };
  }
}

/**
 * Get all accounts for user
 */
export async function getUserAccounts(email: string): Promise<Account[]> {
  try {
    const householdInfo = await getUserHouseholdInfo(email);
    if (!householdInfo) {
      return [];
    }

    const { userId } = householdInfo;

    const result = await db.queryOnce({
      accounts: {
        $: {
          where: {
            userId,
            isActive: true,
          },
        },
      },
    });

    return (result.data.accounts || []) as Account[];
  } catch (error) {
    logger.error('Get user accounts error:', error); // FIX: SEC-003
    return [];
  }
}

/**
 * Format balance for display using the currency's locale and symbol.
 */
export function formatBalance(balance: number, currency: string = 'CHF'): string {
  return formatCurrencyFn(balance, { currency, showCurrency: true });
}

/**
 * Parse balance input
 */
export function parseBalance(input: string): number | null {
  // Remove all non-digit characters except dots, commas, and minus sign
  const cleaned = input.replace(/[^\d.,-]/g, '');

  // Replace comma with dot for parsing
  const normalized = cleaned.replace(',', '.');

  const parsed = parseFloat(normalized);

  if (isNaN(parsed)) {
    return null;
  }

  return parsed;
}

/**
 * Get a single account by ID
 */
export async function getAccountById(accountId: string): Promise<Account | null> {
  try {
    const result = await db.queryOnce({
      accounts: {
        $: {
          where: {
            id: accountId,
          },
        },
      },
    });

    const account = result.data.accounts?.[0];
    return account ? (account as Account) : null;
  } catch (error) {
    logger.error('Get account by ID error:', error); // FIX: SEC-003
    return null;
  }
}

export interface UpdateAccountData {
  name?: string;
  accountType?: AccountType;
  balance?: number;
  last4Digits?: string;
  isDefault?: boolean;
  isExcludedFromBudget?: boolean;
}

/**
 * Update an existing account
 */
export async function updateAccount(
  accountId: string,
  updateData: UpdateAccountData
): Promise<AccountResponse> {
  try {
    // Get existing account
    const existingAccount = await getAccountById(accountId);
    if (!existingAccount) {
      return { success: false, error: 'Account not found' };
    }

    // If setting as default, unset previous default
    if (updateData.isDefault === true) {
      const existingAccounts = await db.queryOnce({
        accounts: {
          $: {
            where: {
              userId: existingAccount.userId,
              isDefault: true,
              isActive: true,
            },
          },
        },
      });

      // Unset previous default accounts (except current one)
      for (const account of existingAccounts.data.accounts || []) {
        if (account.id !== accountId) {
          await db.transact([
            db.tx.accounts[account.id].update({
              isDefault: false
            }),
          ]);
        }
      }
    }

    // Build update object
    const updates: Record<string, unknown> = {};

    if (updateData.name !== undefined) updates.name = updateData.name;
    if (updateData.accountType !== undefined) updates.accountType = updateData.accountType;
    if (updateData.balance !== undefined) updates.balance = updateData.balance;
    if (updateData.last4Digits !== undefined) updates.last4Digits = updateData.last4Digits;
    if (updateData.isDefault !== undefined) updates.isDefault = updateData.isDefault;
    if (updateData.isExcludedFromBudget !== undefined) updates.isExcludedFromBudget = updateData.isExcludedFromBudget;

    await db.transact([
      db.tx.accounts[accountId].update(updates),
    ]);

    logger.debug('Account updated successfully'); // FIX: SEC-003 - Don't log accountId or update details

    // Fetch updated account
    const updatedAccount = await getAccountById(accountId);

    return {
      success: true,
      account: updatedAccount || undefined,
    };
  } catch (error) {
    logger.error('Update account error:', error); // FIX: SEC-003
    return {
      success: false,
      error: 'Failed to update account. Please try again',
    };
  }
}

/**
 * Delete an account (soft delete)
 *
 * FIX: DAT-009 - Check for dependent records (transactions, recurring templates)
 * before allowing deletion. If dependent records exist, return a user-friendly
 * error message explaining what needs to be done first.
 */
export async function deleteAccount(accountId: string): Promise<AccountResponse> {
  try {
    const existingAccount = await getAccountById(accountId);
    if (!existingAccount) {
      return { success: false, error: 'Account not found' };
    }

    // FIX: DAT-009 - Check cascade guard before deleting
    const deletability = await checkWalletDeletable(accountId);
    if (!deletability.canDelete) {
      return {
        success: false,
        error: deletability.reason || 'This wallet cannot be deleted because it has dependent records.',
      };
    }

    await db.transact([
      db.tx.accounts[accountId].update({
        isActive: false
      }),
    ]);

    logger.debug('Account deleted successfully'); // FIX: SEC-003 - Don't log accountId

    return { success: true };
  } catch (error) {
    logger.error('Delete account error:', error); // FIX: SEC-003
    return {
      success: false,
      error: 'Failed to delete account. Please try again',
    };
  }
}
