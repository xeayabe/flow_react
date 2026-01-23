import { db } from './db';

/**
 * Intelligently categorize based on category name keywords
 */
function inferCategoryGroup(name: string, type: 'income' | 'expense'): string {
  if (type === 'income') {
    return 'income';
  }

  const nameLower = name.toLowerCase();

  // Needs (50%) - essentials
  const needsKeywords = [
    'rent', 'housing', 'mortgage', 'utilities', 'electric', 'water', 'gas', 'heat',
    'groceries', 'food', 'supermarket', 'market',
    'transport', 'gas', 'fuel', 'car', 'public transport', 'metro', 'bus', 'train',
    'insurance', 'health', 'medical', 'doctor', 'hospital', 'pharmacy',
    'internet', 'phone', 'mobile', 'cell',
    'childcare', 'daycare', 'school',
  ];

  // Wants (30%) - discretionary spending
  const wantsKeywords = [
    'dining', 'restaurant', 'takeout', 'delivery', 'coffee', 'cafe',
    'entertainment', 'movie', 'cinema', 'theater', 'concert', 'show',
    'shopping', 'clothes', 'clothing', 'fashion', 'shoes',
    'hobby', 'hobbies', 'sport', 'gym', 'fitness',
    'subscription', 'streaming', 'netflix', 'spotify',
    'vacation', 'travel', 'hotel', 'flight',
    'beauty', 'salon', 'spa', 'cosmetics',
    'gift', 'presents',
  ];

  // Savings (20%) - future planning
  const savingsKeywords = [
    'savings', 'emergency', 'investment', 'invest', 'retirement',
    '401k', 'ira', 'pension', 'fund',
  ];

  // Check each category
  for (const keyword of needsKeywords) {
    if (nameLower.includes(keyword)) {
      return 'needs';
    }
  }

  for (const keyword of wantsKeywords) {
    if (nameLower.includes(keyword)) {
      return 'wants';
    }
  }

  for (const keyword of savingsKeywords) {
    if (nameLower.includes(keyword)) {
      return 'savings';
    }
  }

  // Default to 'other' if no match
  return 'other';
}

/**
 * Migration utility to fix categories with incorrect categoryGroup values
 * This will reassign categories from custom_ groups to proper default groups
 */
export async function migrateCategoryGroups(householdId: string): Promise<{ success: boolean; migrated: number }> {
  try {
    console.log('Starting category migration for household:', householdId);

    // Get all categories for this household
    const result = await db.queryOnce({
      categories: {
        $: {
          where: {
            householdId,
          },
        },
      },
    });

    const categories = result.data.categories || [];
    console.log('Found categories for migration:', categories.length);

    let migratedCount = 0;
    const now = Date.now();

    // Update ALL categories that need migration
    for (const category of categories) {
      // Migrate if: group starts with custom_ OR group is 'other' (from previous migration)
      const needsMigration =
        (category.categoryGroup && category.categoryGroup.startsWith('custom_')) ||
        category.categoryGroup === 'other';

      if (needsMigration && (category.type === 'income' || category.type === 'expense')) {
        const properGroup = inferCategoryGroup(category.name, category.type);

        console.log(`Migrating category "${category.name}" from "${category.categoryGroup}" to "${properGroup}"`);

        await db.transact([
          db.tx.categories[category.id].update({
            categoryGroup: properGroup,
            updatedAt: now,
          }),
        ]);

        migratedCount++;
      }
    }

    console.log('Migration complete. Migrated categories:', migratedCount);
    return { success: true, migrated: migratedCount };
  } catch (error) {
    console.error('Migration error:', error);
    return { success: false, migrated: 0 };
  }
}
