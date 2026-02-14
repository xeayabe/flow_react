/**
 * Currency API - Lock check and household currency helpers
 *
 * Currency is locked after the first transaction in the household.
 * This prevents currency changes that would make existing transaction
 * amounts inconsistent.
 */
import { db } from './db';
import { logger } from './logger';

/**
 * Check if a household's currency can still be changed.
 * Currency is locked once the household has any transactions.
 */
export async function checkCurrencyChangeable(householdId: string): Promise<{
  canChange: boolean;
  reason?: string;
}> {
  try {
    const result = await db.queryOnce({
      transactions: {
        $: {
          where: { householdId },
          limit: 1,
        },
      },
    });

    const hasTransactions = (result.data.transactions?.length || 0) > 0;

    if (hasTransactions) {
      return {
        canChange: false,
        reason: 'Currency is locked after your first transaction.',
      };
    }

    return { canChange: true };
  } catch (error) {
    logger.error('Check currency changeable error');
    return { canChange: false, reason: 'Unable to verify currency status.' };
  }
}

/**
 * Update household currency (only if no transactions exist).
 */
export async function updateHouseholdCurrency(
  householdId: string,
  currency: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const { canChange, reason } = await checkCurrencyChangeable(householdId);
    if (!canChange) {
      return { success: false, error: reason };
    }

    await db.transact([
      db.tx.households[householdId].update({ currency }),
    ]);

    return { success: true };
  } catch (error) {
    logger.error('Update household currency error');
    return { success: false, error: 'Unable to update currency. Please try again.' };
  }
}
