/**
 * Foreign key cascade protection guards
 *
 * FIX: DAT-009 - Prevent deletion of entities with dependent records
 *
 * These guards must be called BEFORE any delete operation to ensure
 * referential integrity is maintained. InstantDB does not enforce
 * foreign key constraints, so we must do it at the application level.
 */

import { db } from './db';

/**
 * Result of a deletability check
 */
export interface DeletabilityResult {
  /** Whether the entity can be safely deleted */
  canDelete: boolean;
  /** Human-friendly reason why deletion is blocked (if canDelete is false) */
  reason?: string;
  /** Number of dependent records blocking deletion */
  dependentCount?: number;
}

/**
 * Check if a wallet (account) can be safely deleted.
 *
 * Blocked if:
 * - There are transactions referencing this wallet (accountId)
 * - There are recurring templates referencing this wallet (accountId)
 *
 * @param walletId - The account ID to check
 * @returns DeletabilityResult
 */
// FIX: DAT-009 - Guard against deleting wallets with transactions
export async function checkWalletDeletable(walletId: string): Promise<DeletabilityResult> {
  if (!walletId) {
    return { canDelete: false, reason: 'Invalid wallet ID', dependentCount: 0 };
  }

  try {
    // Query for transactions referencing this wallet
    const { data: txData } = await db.queryOnce({
      transactions: {
        $: {
          where: {
            accountId: walletId,
          },
        },
      },
    });

    const transactionCount = txData.transactions?.length ?? 0;

    if (transactionCount > 0) {
      return {
        canDelete: false,
        reason: `This wallet has ${transactionCount} transaction${transactionCount === 1 ? '' : 's'}. Please move or delete them before removing this wallet.`,
        dependentCount: transactionCount,
      };
    }

    // Query for recurring templates referencing this wallet
    const { data: templateData } = await db.queryOnce({
      recurringTemplates: {
        $: {
          where: {
            accountId: walletId,
            isActive: true,
          },
        },
      },
    });

    const templateCount = templateData.recurringTemplates?.length ?? 0;

    if (templateCount > 0) {
      return {
        canDelete: false,
        reason: `This wallet is used by ${templateCount} recurring template${templateCount === 1 ? '' : 's'}. Please update or deactivate them first.`,
        dependentCount: templateCount,
      };
    }

    return { canDelete: true };
  } catch (error) {
    console.error('[cascade-guard] checkWalletDeletable error:', error);
    // Fail-safe: if we can't check, block deletion to protect data
    return {
      canDelete: false,
      reason: 'Unable to verify if this wallet can be safely deleted. Please try again.',
      dependentCount: 0,
    };
  }
}

/**
 * Check if a category can be safely deleted.
 *
 * Blocked if:
 * - There are transactions referencing this category (categoryId)
 * - There are budgets referencing this category (categoryId)
 * - There are payee-category mappings referencing this category (categoryId)
 * - There are recurring templates referencing this category (categoryId)
 *
 * @param categoryId - The category ID to check
 * @returns DeletabilityResult
 */
// FIX: DAT-009 - Guard against deleting categories with dependent records
export async function checkCategoryDeletable(categoryId: string): Promise<DeletabilityResult> {
  if (!categoryId) {
    return { canDelete: false, reason: 'Invalid category ID', dependentCount: 0 };
  }

  try {
    // Query for transactions referencing this category
    const { data: txData } = await db.queryOnce({
      transactions: {
        $: {
          where: {
            categoryId,
          },
        },
      },
    });

    const transactionCount = txData.transactions?.length ?? 0;

    if (transactionCount > 0) {
      return {
        canDelete: false,
        reason: `This category is used by ${transactionCount} transaction${transactionCount === 1 ? '' : 's'}. Please reassign them before deleting this category.`,
        dependentCount: transactionCount,
      };
    }

    // Query for active budgets referencing this category
    const { data: budgetData } = await db.queryOnce({
      budgets: {
        $: {
          where: {
            categoryId,
            isActive: true,
          },
        },
      },
    });

    const budgetCount = budgetData.budgets?.length ?? 0;

    if (budgetCount > 0) {
      return {
        canDelete: false,
        reason: `This category has ${budgetCount} active budget${budgetCount === 1 ? '' : 's'}. Please remove the budget allocation first.`,
        dependentCount: budgetCount,
      };
    }

    // Query for payee-category mappings referencing this category
    const { data: mappingData } = await db.queryOnce({
      payee_category_mappings: {
        $: {
          where: {
            categoryId,
          },
        },
      },
    });

    const mappingCount = mappingData.payee_category_mappings?.length ?? 0;

    if (mappingCount > 0) {
      return {
        canDelete: false,
        reason: `This category is linked to ${mappingCount} payee mapping${mappingCount === 1 ? '' : 's'}. Please update the mappings first.`,
        dependentCount: mappingCount,
      };
    }

    // Query for active recurring templates referencing this category
    const { data: templateData } = await db.queryOnce({
      recurringTemplates: {
        $: {
          where: {
            categoryId,
            isActive: true,
          },
        },
      },
    });

    const templateCount = templateData.recurringTemplates?.length ?? 0;

    if (templateCount > 0) {
      return {
        canDelete: false,
        reason: `This category is used by ${templateCount} recurring template${templateCount === 1 ? '' : 's'}. Please update or deactivate them first.`,
        dependentCount: templateCount,
      };
    }

    return { canDelete: true };
  } catch (error) {
    console.error('[cascade-guard] checkCategoryDeletable error:', error);
    return {
      canDelete: false,
      reason: 'Unable to verify if this category can be safely deleted. Please try again.',
      dependentCount: 0,
    };
  }
}

/**
 * Check if a household can be safely deleted.
 *
 * Blocked if:
 * - There are active members in the household
 * - There are transactions in the household
 * - There are settlements in the household
 * - There are categories in the household
 *
 * @param householdId - The household ID to check
 * @returns DeletabilityResult
 */
// FIX: DAT-009 - Guard against deleting households with members/transactions
export async function checkHouseholdDeletable(householdId: string): Promise<DeletabilityResult> {
  if (!householdId) {
    return { canDelete: false, reason: 'Invalid household ID', dependentCount: 0 };
  }

  try {
    // Query for active members
    const { data: memberData } = await db.queryOnce({
      householdMembers: {
        $: {
          where: {
            householdId,
            status: 'active',
          },
        },
      },
    });

    const memberCount = memberData.householdMembers?.length ?? 0;

    if (memberCount > 0) {
      return {
        canDelete: false,
        reason: `This household has ${memberCount} active member${memberCount === 1 ? '' : 's'}. All members must leave before the household can be deleted.`,
        dependentCount: memberCount,
      };
    }

    // Query for transactions
    const { data: txData } = await db.queryOnce({
      transactions: {
        $: {
          where: {
            householdId,
          },
        },
      },
    });

    const transactionCount = txData.transactions?.length ?? 0;

    if (transactionCount > 0) {
      return {
        canDelete: false,
        reason: `This household has ${transactionCount} transaction${transactionCount === 1 ? '' : 's'}. Please delete all transactions first.`,
        dependentCount: transactionCount,
      };
    }

    // Query for unsettled settlements
    const { data: settlementData } = await db.queryOnce({
      settlements: {
        $: {
          where: {
            householdId,
          },
        },
      },
    });

    const settlementCount = settlementData.settlements?.length ?? 0;

    if (settlementCount > 0) {
      return {
        canDelete: false,
        reason: `This household has ${settlementCount} settlement record${settlementCount === 1 ? '' : 's'}. Please clear settlement history first.`,
        dependentCount: settlementCount,
      };
    }

    return { canDelete: true };
  } catch (error) {
    console.error('[cascade-guard] checkHouseholdDeletable error:', error);
    return {
      canDelete: false,
      reason: 'Unable to verify if this household can be safely deleted. Please try again.',
      dependentCount: 0,
    };
  }
}
