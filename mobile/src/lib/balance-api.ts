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
 * Calculate the "true" balance for an account by summing all non-future transactions
 * This excludes any transactions scheduled for future dates
 */
async function calculateAccountBalanceExcludingFuture(accountId: string, initialBalance: number = 0): Promise<number> {
  const today = new Date();
  const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;

  // Get all transactions for this account
  const { data } = await db.queryOnce({
    transactions: {
      $: { where: { accountId } }
    }
  });

  const transactions = data.transactions || [];

  // Calculate balance from non-future transactions only
  let balance = initialBalance;
  for (const tx of transactions) {
    // Skip future transactions
    if (tx.date > todayStr) {
      continue;
    }

    if (tx.type === 'income') {
      balance += tx.amount || 0;
    } else {
      balance -= tx.amount || 0;
    }
  }

  return balance;
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
 * NOTE: This function now calculates balances by summing transactions,
 * excluding any future-dated transactions to show accurate current balances.
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

  // Calculate corrected balances excluding future transactions
  const accountBalances = await Promise.all(
    accounts.map(async (acc) => {
      const correctedBalance = await calculateAccountBalanceExcludingFuture(acc.id, 0);
      return {
        ...acc,
        correctedBalance
      };
    })
  );

  // Separate assets and liabilities with corrected balances
  const assetAccounts = accountBalances
    .filter(acc => assetTypes.includes(acc.accountType.toLowerCase()))
    .map(acc => ({
      id: acc.id,
      name: acc.name,
      balance: acc.correctedBalance,
      type: acc.accountType
    }));

  const liabilityAccounts = accountBalances
    .filter(acc => liabilityTypes.includes(acc.accountType.toLowerCase()))
    .map(acc => ({
      id: acc.id,
      name: acc.name,
      balance: Math.abs(acc.correctedBalance), // Show as positive debt amount
      type: acc.accountType
    }));

  // Calculate totals
  const totalAssets = assetAccounts.reduce((sum, acc) => sum + acc.balance, 0);
  const totalLiabilities = liabilityAccounts.reduce((sum, acc) => sum + acc.balance, 0);
  const netWorth = totalAssets - totalLiabilities;

  console.log('💰 Balance breakdown (excluding future transactions):');
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
