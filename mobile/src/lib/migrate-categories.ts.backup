import { db } from './db';

/**
 * Migration utility to fix categories assigned to wrong category group keys
 * Maps categories from old hardcoded groups (needs/wants/savings) back to actual categoryGroup keys
 */
export async function migrateCategoryGroups(householdId: string): Promise<{ success: boolean; migrated: number }> {
  try {
    console.log('Starting category group migration for household:', householdId);

    // Get all category groups for this household
    const groupsResult = await db.queryOnce({
      categoryGroups: {
        $: {
          where: {
            householdId,
          },
        },
      },
    });

    const categoryGroups = groupsResult.data.categoryGroups || [];
    console.log('Found category groups:', categoryGroups.map(g => ({ key: g.key, name: g.name })));

    // Get all categories
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

    // Check if any categories have old hardcoded group values
    const oldGroupValues = ['needs', 'wants', 'savings', 'other', 'income'];

    for (const category of categories) {
      // If category has an old hardcoded group value, we need to reassign it
      if (oldGroupValues.includes(category.categoryGroup)) {
        // Find a matching category group for this type
        const matchingGroup = categoryGroups.find(g => g.type === category.type);

        if (matchingGroup) {
          console.log(`Migrating category "${category.name}" from hardcoded group "${category.categoryGroup}" to actual group key "${matchingGroup.key}"`);

          await db.transact([
            db.tx.categories[category.id].update({
              categoryGroup: matchingGroup.key,
              updatedAt: now,
            }),
          ]);

          migratedCount++;
        }
      }
    }

    console.log('Migration complete. Migrated categories:', migratedCount);
    return { success: true, migrated: migratedCount };
  } catch (error) {
    console.error('Migration error:', error);
    return { success: false, migrated: 0 };
  }
}
