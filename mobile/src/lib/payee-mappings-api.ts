import { db } from './db';
import 'react-native-get-random-values';
import { v4 as uuidv4 } from 'uuid';

/**
 * Normalize payee name for consistent matching
 */
function normalizePayee(payee: string): string {
  return payee.trim().toLowerCase();
}

/**
 * Get category suggestion for a payee
 * Returns categoryId if mapping exists, null otherwise
 */
export async function getCategorySuggestion(
  userId: string,
  payee: string
): Promise<string | null> {
  if (!payee || !payee.trim()) return null;

  const normalizedPayee = normalizePayee(payee);
  console.log('🔍 Looking for category suggestion for:', normalizedPayee);

  const { data } = await db.queryOnce({
    payee_category_mappings: {
      $: {
        where: {
          userId,
          payee: normalizedPayee
        }
      }
    }
  });

  const mapping = data.payee_category_mappings?.[0];

  if (mapping) {
    console.log('✅ Found mapping:', mapping.categoryId);
    return mapping.categoryId;
  }

  console.log('❌ No mapping found');
  return null;
}

/**
 * Save or update payee-category mapping
 * Called when transaction is created or edited
 */
export async function savePayeeMapping(
  userId: string,
  payee: string,
  categoryId: string
): Promise<void> {
  if (!payee || !payee.trim() || !categoryId) return;

  const normalizedPayee = normalizePayee(payee);
  console.log('💾 Saving mapping:', normalizedPayee, '→', categoryId);

  // Check if mapping exists
  const { data } = await db.queryOnce({
    payee_category_mappings: {
      $: {
        where: {
          userId,
          payee: normalizedPayee
        }
      }
    }
  });

  const existingMapping = data.payee_category_mappings?.[0];

  if (existingMapping) {
    // Update existing mapping
    console.log('📝 Updating existing mapping');
    await db.transact([
      db.tx.payee_category_mappings[existingMapping.id].update({
        displayName: payee.trim(), // Update display name to latest capitalization
        categoryId,
        lastUsedAt: Date.now(),
        usageCount: (existingMapping.usageCount || 0) + 1,
      })
    ]);
  } else {
    // Create new mapping
    console.log('✨ Creating new mapping');
    const mappingId = uuidv4();
    await db.transact([
      db.tx.payee_category_mappings[mappingId].update({
        userId,
        payee: normalizedPayee,
        displayName: payee.trim(), // Store original capitalization
        categoryId,
        lastUsedAt: Date.now(),
        usageCount: 1,
        createdAt: Date.now(),
      })
    ]);
  }

  console.log('✅ Mapping saved');
}

/**
 * Get recent unique payees for autocomplete
 */
export async function getRecentPayees(
  householdId: string,
  limit: number = 10
): Promise<string[]> {
  const { data } = await db.queryOnce({
    transactions: {
      $: {
        where: { householdId },
        limit: 100
      }
    }
  });

  // Extract unique payees (preserve original casing for display)
  const payeesMap = new Map<string, string>();

  data.transactions
    .filter(t => t.payee && t.payee.trim())
    .forEach(t => {
      const normalized = normalizePayee(t.payee!);
      if (!payeesMap.has(normalized)) {
        payeesMap.set(normalized, t.payee!);
      }
    });

  return Array.from(payeesMap.values()).slice(0, limit);
}
