import { db } from './db';
import 'react-native-get-random-values';
import { v4 as uuidv4 } from 'uuid';

export const INSTITUTIONS = [
  'UBS',
  'Credit Suisse',
  'Revolut',
  'PostFinance',
  'Raiffeisen',
  'Cash',
  'Other',
] as const;

export const ACCOUNT_TYPES = [
  'Checking',
  'Savings',
  'Credit Card',
  'Cash',
  'Investment',
] as const;

export type Institution = typeof INSTITUTIONS[number];
export type AccountType = typeof ACCOUNT_TYPES[number];

export interface CreateAccountData {
  name: string;
  institution: Institution;
  accountType: AccountType;
  startingBalance: number;
  last4Digits?: string;
  isDefault?: boolean;
}

export interface Account {
  id: string;
  userId: string;
  householdId: string;
  name: string;
  institution: Institution;
  accountType: AccountType;
  balance: number;
  startingBalance: number;
  currency: string;
  last4Digits?: string;
  isDefault: boolean;
  isActive: boolean;
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
    const result = await db.queryOnce({
      users: {
        $: {
          where: {
            email: email.toLowerCase(),
          },
        },
        memberships: {
          household: {},
        },
      },
    });

    const user = result.data.users?.[0];
    if (!user) return null;

    const membership = user.memberships?.[0];
    if (!membership) return null;

    const household = membership.household;
    if (!household) return null;

    return {
      userId: user.id,
      householdId: household.id,
      currency: household.currency || 'CHF',
    };
  } catch (error) {
    console.error('Get household info error:', error);
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
    console.error('Check account name error:', error);
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
    console.error('Get accounts count error:', error);
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
            isDefault: false,
            updatedAt: Date.now(),
          }),
        ]);
      }
    }

    // Create the account
    const accountId = uuidv4();
    const now = Date.now();

    const newAccount: Omit<Account, 'id'> = {
      userId,
      householdId,
      name: accountData.name,
      institution: accountData.institution,
      accountType: accountData.accountType,
      balance: accountData.startingBalance,
      startingBalance: accountData.startingBalance,
      currency,
      last4Digits: accountData.last4Digits || '',
      isDefault: shouldBeDefault,
      isActive: true,
      createdAt: now,
      updatedAt: now,
    };

    await db.transact([
      db.tx.accounts[accountId].update(newAccount),
    ]);

    console.log('Account created:', { accountId, name: accountData.name, isDefault: shouldBeDefault });

    return {
      success: true,
      account: { id: accountId, ...newAccount },
    };
  } catch (error) {
    console.error('Create account error:', error);
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
    console.error('Get user accounts error:', error);
    return [];
  }
}

/**
 * Format balance for display
 */
export function formatBalance(balance: number, currency: string = 'CHF'): string {
  const formatted = new Intl.NumberFormat('de-CH', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(Math.abs(balance));

  const sign = balance < 0 ? '-' : '';
  return `${sign}${formatted} ${currency}`;
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
