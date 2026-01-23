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
    console.log('Found categories for migration:', categories.length);

    let migratedCount = 0;
    const now = Date.now();

    // Update ALL categories with wrong groups (those starting with custom_)
    for (const category of categories) {
      // Only migrate if the current group starts with custom_
      if (category.categoryGroup && category.categoryGroup.startsWith('custom_')) {
        // Determine the proper group based on category type
        let properGroup = 'other'; // default fallback for expenses

        if (category.type === 'income') {
          properGroup = 'income';
        } else if (category.type === 'expense') {
          // Use 'other' as default for all expense categories
          // Users can organize them later through the budget/category management UI
          properGroup = 'other';
        }

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
