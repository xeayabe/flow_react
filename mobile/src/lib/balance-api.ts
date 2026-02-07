import { db } from './db';

export interface BalanceBreakdown {
  assets: {
    accounts: Array<{ id: string; name: string; balance: number; type: string }>;
    total: number;
  };
  liabilities: {
    accounts: Array<{ id: string; name: string; balance: number; type: string }>;
    total: number;
  };
  netWorth: number;
}

/**
 * Calculate true balance: Assets - Liabilities
 *
 * IMPORTANT: This calculates balance for a SINGLE USER, not the entire household.
 * Each user has their own personal accounts/wallets.
 *
 * Asset types: Checking, Savings, Cash, Investment
 * Liability types: Credit Card
 *
 * Uses the stored account balance directly from the database.
 */
export async function calculateTrueBalance(userId: string): Promise<BalanceBreakdown> {
  console.log('💰 Calculating true balance for user:', userId);

  // Get user's personal accounts only (NOT all household accounts!)
  const { data } = await db.queryOnce({
    accounts: {
      $: { where: { userId, isActive: true } }
    }
  });

  const accounts = data.accounts;
  console.log('Found accounts:', accounts.length);

  // Asset types (positive balances = good)
  const assetTypes = ['checking', 'savings', 'cash', 'investment'];

  // Liability types (negative balances = debt)
  const liabilityTypes = ['credit card'];

  // Separate assets and liabilities using stored balances
  const assetAccounts = accounts
    .filter((acc: any) => assetTypes.includes(acc.accountType.toLowerCase()))
    .map((acc: any) => ({
      id: acc.id,
      name: acc.name,
      balance: acc.balance || 0,
      type: acc.accountType
    }));

  const liabilityAccounts = accounts
    .filter((acc: any) => liabilityTypes.includes(acc.accountType.toLowerCase()))
    .map((acc: any) => ({
      id: acc.id,
      name: acc.name,
      balance: Math.abs(acc.balance || 0), // Show as positive debt amount
      type: acc.accountType
    }));

  // Calculate totals
  const totalAssets = assetAccounts.reduce((sum: number, acc: any) => sum + acc.balance, 0);
  const totalLiabilities = liabilityAccounts.reduce((sum: number, acc: any) => sum + acc.balance, 0);
  const netWorth = totalAssets - totalLiabilities;

  console.log('💰 Balance breakdown:');
  console.log('- Assets:', totalAssets);
  console.log('- Liabilities:', totalLiabilities);
  console.log('- Net Worth:', netWorth);

  return {
    assets: {
      accounts: assetAccounts,
      total: totalAssets
    },
    liabilities: {
      accounts: liabilityAccounts,
      total: totalLiabilities
    },
    netWorth
  };
}
