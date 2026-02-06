import { db } from './db';
import { v4 as uuidv4 } from 'uuid';

export interface CategoryGroup {
  id: string;
  householdId: string;
  key: string;
  name: string;
  type: 'expense' | 'income';
  icon?: string;
  color?: string;
  isDefault: boolean;
  displayOrder?: number;
  isActive: boolean;
  createdByUserId?: string;
  createdAt: number;
  updatedAt: number;
}

/**
 * Get category groups for a user in their household
 * Returns only groups created by this user (personal)
 */
export async function getCategoryGroups(householdId: string, userId: string): Promise<CategoryGroup[]> {
  try {
    const result = await db.queryOnce({
      categoryGroups: {
        $: {
          where: {
            householdId,
            isActive: true,
          },
        },
      },
    });

    // Filter: show only user's own category groups
    const groups = (result.data.categoryGroups || [])
      .filter((g: any) => g.createdByUserId === userId) as CategoryGroup[];

    // Sort by displayOrder first, then by name
    return groups.sort((a, b) => {
      if (a.displayOrder !== undefined && b.displayOrder !== undefined) {
        return a.displayOrder - b.displayOrder;
      }
      return a.name.localeCompare(b.name);
    });
  } catch (error) {
    console.error('Error fetching category groups:', error);
    return [];
  }
}

/**
 * Create default category groups for a new household
 */
export async function createDefaultCategoryGroups(householdId: string, userId: string): Promise<boolean> {
  try {
    const defaults = [
      { key: 'needs', name: 'Needs', icon: '🏠', type: 'expense', displayOrder: 1 },
      { key: 'wants', name: 'Wants', icon: '🎭', type: 'expense', displayOrder: 2 },
      { key: 'savings', name: 'Savings', icon: '💎', type: 'expense', displayOrder: 3 },
      { key: 'income', name: 'Income', icon: '💰', type: 'income', displayOrder: 0 },
    ];

    const now = Date.now();
    const transactions = defaults.map((group) => {
      const id = uuidv4();
      return db.tx.categoryGroups[id].update({
        householdId,
        key: group.key,
        name: group.name,
        type: group.type,
        icon: group.icon,
        isDefault: true,
        displayOrder: group.displayOrder,
        isActive: true,
        createdByUserId: userId,
        createdAt: now,
        updatedAt: now,
      });
    });

    await db.transact(transactions);
    return true;
  } catch (error) {
    console.error('Error creating default category groups:', error);
    return false;
  }
}

/**
 * Update a category group name
 */
export async function updateCategoryGroupName(
  categoryGroupId: string,
  name: string
): Promise<{ success: boolean; error?: string }> {
  try {
    if (!name || name.trim().length === 0) {
      return { success: false, error: 'Category group name cannot be empty' };
    }

    if (name.length > 50) {
      return { success: false, error: 'Category group name must be 50 characters or less' };
    }

    const now = Date.now();
    await db.transact([
      db.tx.categoryGroups[categoryGroupId].update({
        name: name.trim(),
        updatedAt: now,
      }),
    ]);

    return { success: true };
  } catch (error) {
    console.error('Error updating category group:', error);
    return { success: false, error: 'Failed to update category group' };
  }
}

/**
 * Create a new custom category group
 */
export async function createCustomCategoryGroup(
  householdId: string,
  userId: string,
  name: string,
  type: 'expense' | 'income',
  icon?: string,
  color?: string
): Promise<{ success: boolean; error?: string; groupId?: string }> {
  try {
    if (!name || name.trim().length === 0) {
      return { success: false, error: 'Category group name cannot be empty' };
    }

    if (name.length > 50) {
      return { success: false, error: 'Category group name must be 50 characters or less' };
    }

    // Check if name already exists in this household
    const existing = await db.queryOnce({
      categoryGroups: {
        $: {
          where: {
            householdId,
            name: name.trim(),
            isActive: true,
          },
        },
      },
    });

    if (existing.data.categoryGroups && existing.data.categoryGroups.length > 0) {
      return { success: false, error: 'A category group with this name already exists' };
    }

    const groupId = uuidv4();
    const key = `custom_${Date.now()}`;
    const now = Date.now();

    // Get max displayOrder to add new one at the end
    const allGroups = await db.queryOnce({
      categoryGroups: {
        $: {
          where: { householdId },
        },
      },
    });

    const maxOrder =
      (allGroups.data.categoryGroups || []).reduce((max: number, g: any) => {
        return Math.max(max, g.displayOrder || 0);
      }, 0) || 0;

    await db.transact([
      db.tx.categoryGroups[groupId].update({
        householdId,
        key,
        name: name.trim(),
        type,
        icon,
        color,
        isDefault: false,
        displayOrder: maxOrder + 1,
        isActive: true,
        createdByUserId: userId,
        createdAt: now,
        updatedAt: now,
      }),
    ]);

    return { success: true, groupId };
  } catch (error) {
    console.error('Error creating category group:', error);
    return { success: false, error: 'Failed to create category group' };
  }
}

/**
 * Delete a category group (soft delete)
 */
export async function deleteCategoryGroup(categoryGroupId: string): Promise<{ success: boolean; error?: string }> {
  try {
    const now = Date.now();
    await db.transact([
      db.tx.categoryGroups[categoryGroupId].update({
        isActive: false,
        updatedAt: now,
      }),
    ]);

    return { success: true };
  } catch (error) {
    console.error('Error deleting category group:', error);
    return { success: false, error: 'Failed to delete category group' };
  }
}

/**
 * Update category group display properties
 */
export async function updateCategoryGroupDisplay(
  categoryGroupId: string,
  updates: { icon?: string; color?: string; displayOrder?: number }
): Promise<{ success: boolean; error?: string }> {
  try {
    const now = Date.now();
    await db.transact([
      db.tx.categoryGroups[categoryGroupId].update({
        ...updates,
        updatedAt: now,
      }),
    ]);

    return { success: true };
  } catch (error) {
    console.error('Error updating category group display:', error);
    return { success: false, error: 'Failed to update category group' };
  }
}
