import { db } from './db';

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
    console.log('Found categories:', categories.length);

    // Map category names to their proper groups based on default categories
    const categoryGroupMap: Record<string, string> = {
      // Income categories
      'Salary': 'income',
      'Bonus': 'income',
      'Freelance': 'income',
      'Investment': 'income',
      'Gift': 'income',
      'Refund': 'income',
      'Other Income': 'income',

      // Needs categories (50%)
      'Rent/Housing': 'needs',
      'Groceries': 'needs',
      'Utilities': 'needs',
      'Transportation': 'needs',
      'Health Insurance': 'needs',
      'Internet/Phone': 'needs',

      // Wants categories (30%)
      'Dining Out': 'wants',
      'Entertainment': 'wants',
      'Shopping': 'wants',
      'Hobbies': 'wants',
      'Subscriptions': 'wants',
      'Vacations': 'wants',

      // Savings categories (20%)
      'Emergency Fund': 'savings',
      'Investments': 'savings',
      'Savings Goals': 'savings',

      // Other expense categories
      'Other Expense': 'other',
    };

    let migratedCount = 0;
    const now = Date.now();

    // Update categories with wrong groups
    for (const category of categories) {
      const properGroup = categoryGroupMap[category.name];

      // Only migrate if we have a mapping and the current group is wrong (starts with custom_)
      if (properGroup && category.categoryGroup && category.categoryGroup.startsWith('custom_')) {
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
