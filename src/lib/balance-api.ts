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
 * Asset types: Checking, Savings, Cash, Investment
 * Liability types: Credit Card
 */
export async function calculateTrueBalance(householdId: string): Promise<BalanceBreakdown> {
  console.log('💰 Calculating true balance for household:', householdId);

  // Get all household accounts
  const { data } = await db.queryOnce({
    accounts: {
      $: { where: { householdId, isActive: true } }
    }
  });

  const accounts = data.accounts;
  console.log('Found accounts:', accounts.length);

  // Asset types (positive balances = good)
  const assetTypes = ['checking', 'savings', 'cash', 'investment'];

  // Liability types (negative balances = debt)
  const liabilityTypes = ['credit card'];

  // Separate assets and liabilities
  const assetAccounts = accounts
    .filter(acc => assetTypes.includes(acc.accountType.toLowerCase()))
    .map(acc => ({
      id: acc.id,
      name: acc.name,
      balance: acc.balance || 0,
      type: acc.accountType
    }));

  const liabilityAccounts = accounts
    .filter(acc => liabilityTypes.includes(acc.accountType.toLowerCase()))
    .map(acc => ({
      id: acc.id,
      name: acc.name,
      balance: Math.abs(acc.balance || 0), // Show as positive debt amount
      type: acc.accountType
    }));

  // Calculate totals
  const totalAssets = assetAccounts.reduce((sum, acc) => sum + acc.balance, 0);
  const totalLiabilities = liabilityAccounts.reduce((sum, acc) => sum + acc.balance, 0);
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
