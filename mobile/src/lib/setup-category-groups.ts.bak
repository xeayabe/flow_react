import { db } from './db';
import { v4 as uuidv4 } from 'uuid';
import { createDefaultCategories } from './categories-api';

/**
 * Ensure default category groups exist for a household
 * This creates missing category groups (especially expense groups)
 */
export async function ensureDefaultCategoryGroups(householdId: string, userId: string): Promise<boolean> {
  try {
    // Get existing category groups
    const existing = await db.queryOnce({
      categoryGroups: {
        $: {
          where: {
            householdId,
          },
        },
      },
    });

    const existingGroups = existing.data.categoryGroups || [];
    const existingKeys = new Set(existingGroups.map((g: any) => g.key));

    console.log('Existing category groups:', existingGroups.map(g => ({ key: g.key, name: g.name, type: g.type })));

    // Define all default groups
    const defaultGroups = [
      { key: 'income', name: 'Income & credits', icon: '💰', type: 'income', displayOrder: 0 },
      { key: 'needs', name: 'Needs (50%)', icon: '🏠', type: 'expense', displayOrder: 1 },
      { key: 'wants', name: 'Wants (30%)', icon: '🎭', type: 'expense', displayOrder: 2 },
      { key: 'savings', name: 'Savings (20%)', icon: '💎', type: 'expense', displayOrder: 3 },
      { key: 'other', name: 'Other', icon: '📦', type: 'expense', displayOrder: 4 },
    ];

    const now = Date.now();
    const transactions = [];

    // Create missing groups
    for (const group of defaultGroups) {
      if (!existingKeys.has(group.key)) {
        console.log(`Creating missing category group: ${group.key} (${group.name})`);
        const id = uuidv4();
        transactions.push(
          db.tx.categoryGroups[id].update({
            householdId,
            key: group.key,
            name: group.name,
            icon: group.icon,
            type: group.type,
            isDefault: true,
            displayOrder: group.displayOrder,
            isActive: true,
            createdByUserId: userId,
            createdAt: now,
            updatedAt: now,
          })
        );
      }
    }

    if (transactions.length > 0) {
      await db.transact(transactions);
      console.log(`Created ${transactions.length} missing category groups`);
    } else {
      console.log('All default category groups already exist');
    }

    return true;
  } catch (error) {
    console.error('Error ensuring category groups:', error);
    return false;
  }
}

/**
 * Ensure default categories exist for a household
 * This creates missing default categories (especially expense categories)
 */
export async function ensureDefaultCategories(householdId: string, userId: string): Promise<boolean> {
  try {
    // First ensure category groups exist
    await ensureDefaultCategoryGroups(householdId, userId);

    // Check if any default categories already exist
    const existing = await db.queryOnce({
      categories: {
        $: {
          where: {
            householdId,
            isDefault: true,
          },
        },
      },
    });

    const existingCategories = existing.data.categories || [];
    console.log('Existing default categories:', existingCategories.map(c => ({ name: c.name, type: c.type, group: c.categoryGroup })));

    // If no default categories exist, create them
    if (existingCategories.length === 0) {
      console.log('Creating default categories for household:', householdId);
      const result = await createDefaultCategories(householdId);
      return result.success !== false;
    } else {
      console.log('Default categories already exist for household:', householdId);
      return true;
    }
  } catch (error) {
    console.error('Error ensuring default categories:', error);
    return false;
  }
}
