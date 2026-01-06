import { db } from './db';
import 'react-native-get-random-values';
import { v4 as uuidv4 } from 'uuid';

export interface Category {
  id?: string;
  householdId: string;
  name: string;
  type: 'income' | 'expense';
  categoryGroup: 'income' | 'needs' | 'wants' | 'savings' | 'other';
  isShareable: boolean;
  isDefault: boolean;
  createdByUserId?: string;
  icon?: string;
  color?: string;
  isActive: boolean;
  createdAt: number;
  updatedAt: number;
}

export interface CreateCategoryRequest {
  householdId: string;
  name: string;
  type: 'income' | 'expense';
  categoryGroup: 'income' | 'needs' | 'wants' | 'savings' | 'other';
  createdByUserId?: string;
  icon?: string;
  color?: string;
}

export interface CategoryResponse {
  success: boolean;
  data?: Category | Category[];
  error?: string;
}

const DEFAULT_INCOME_CATEGORIES = [
  'Salary',
  'Bonus',
  'Freelance',
  'Investment',
  'Gift',
  'Refund',
  'Other Income',
];

const DEFAULT_NEEDS_CATEGORIES = [
  'Rent/Housing',
  'Groceries',
  'Utilities',
  'Transportation',
  'Health Insurance',
  'Internet/Phone',
];

const DEFAULT_WANTS_CATEGORIES = [
  'Dining Out',
  'Entertainment',
  'Shopping',
  'Hobbies',
  'Subscriptions',
  'Vacations',
];

const DEFAULT_SAVINGS_CATEGORIES = [
  'Emergency Fund',
  'Investments',
  'Savings Goals',
];

const DEFAULT_OTHER_EXPENSE_CATEGORIES = [
  'Other Expense',
];

/**
 * Create default categories for a household
 */
export async function createDefaultCategories(householdId: string): Promise<CategoryResponse> {
  try {
    const now = Date.now();
    const categoryIds: string[] = [];

    // Create default income categories
    for (const categoryName of DEFAULT_INCOME_CATEGORIES) {
      const categoryId = uuidv4();
      categoryIds.push(categoryId);
      await db.transact([
        db.tx.categories[categoryId].update({
          householdId,
          name: categoryName,
          type: 'income',
          categoryGroup: 'income',
          isShareable: false,
          isDefault: true,
          isActive: true,
          createdAt: now,
          updatedAt: now,
        }),
      ]);
    }

    // Create default needs categories
    for (const categoryName of DEFAULT_NEEDS_CATEGORIES) {
      const categoryId = uuidv4();
      categoryIds.push(categoryId);
      await db.transact([
        db.tx.categories[categoryId].update({
          householdId,
          name: categoryName,
          type: 'expense',
          categoryGroup: 'needs',
          isShareable: false,
          isDefault: true,
          isActive: true,
          createdAt: now,
          updatedAt: now,
        }),
      ]);
    }

    // Create default wants categories
    for (const categoryName of DEFAULT_WANTS_CATEGORIES) {
      const categoryId = uuidv4();
      categoryIds.push(categoryId);
      await db.transact([
        db.tx.categories[categoryId].update({
          householdId,
          name: categoryName,
          type: 'expense',
          categoryGroup: 'wants',
          isShareable: false,
          isDefault: true,
          isActive: true,
          createdAt: now,
          updatedAt: now,
        }),
      ]);
    }

    // Create default savings categories
    for (const categoryName of DEFAULT_SAVINGS_CATEGORIES) {
      const categoryId = uuidv4();
      categoryIds.push(categoryId);
      await db.transact([
        db.tx.categories[categoryId].update({
          householdId,
          name: categoryName,
          type: 'expense',
          categoryGroup: 'savings',
          isShareable: false,
          isDefault: true,
          isActive: true,
          createdAt: now,
          updatedAt: now,
        }),
      ]);
    }

    // Create default other expense categories
    for (const categoryName of DEFAULT_OTHER_EXPENSE_CATEGORIES) {
      const categoryId = uuidv4();
      categoryIds.push(categoryId);
      await db.transact([
        db.tx.categories[categoryId].update({
          householdId,
          name: categoryName,
          type: 'expense',
          categoryGroup: 'other',
          isShareable: false,
          isDefault: true,
          isActive: true,
          createdAt: now,
          updatedAt: now,
        }),
      ]);
    }

    console.log('Default categories created:', { householdId, count: categoryIds.length });

    return { success: true };
  } catch (error) {
    console.error('Create default categories error:', error);
    return {
      success: false,
      error: 'Failed to create default categories',
    };
  }
}

/**
 * Create a custom category for a household
 */
export async function createCategory(request: CreateCategoryRequest): Promise<CategoryResponse> {
  try {
    // Validate input
    if (!request.name || request.name.trim().length < 2) {
      return {
        success: false,
        error: 'Category name must be at least 2 characters',
      };
    }

    if (request.name.length > 30) {
      return {
        success: false,
        error: 'Category name must be less than 30 characters',
      };
    }

    // Check for duplicate (case-insensitive)
    const existingResult = await db.queryOnce({
      categories: {
        $: {
          where: {
            householdId: request.householdId,
          },
        },
      },
    });

    const existingCategory = existingResult.data.categories?.find(
      (cat: any) => cat.name.toLowerCase() === request.name.toLowerCase()
    );

    if (existingCategory) {
      return {
        success: false,
        error: 'This category already exists',
      };
    }

    const categoryId = uuidv4();
    const now = Date.now();

    await db.transact([
      db.tx.categories[categoryId].update({
        householdId: request.householdId,
        name: request.name.trim(),
        type: request.type,
        categoryGroup: request.categoryGroup,
        isShareable: false, // Phase 1: all personal
        isDefault: false, // User-created
        createdByUserId: request.createdByUserId,
        icon: request.icon,
        color: request.color,
        isActive: true,
        createdAt: now,
        updatedAt: now,
      }),
    ]);

    return { success: true };
  } catch (error) {
    console.error('Create category error:', error);
    return {
      success: false,
      error: 'Failed to create category',
    };
  }
}

/**
 * Get all categories for a household
 */
export async function getCategories(householdId: string): Promise<Category[]> {
  try {
    const result = await db.queryOnce({
      categories: {
        $: {
          where: {
            householdId,
          },
        },
      },
    });

    const categories = (result.data.categories ?? []).filter((cat: any) => cat.isActive) as Category[];

    // Sort: default categories first, then custom, then alphabetical
    categories.sort((a: Category, b: Category) => {
      if (a.isDefault !== b.isDefault) {
        return a.isDefault ? -1 : 1;
      }
      return a.name.localeCompare(b.name);
    });

    return categories;
  } catch (error) {
    console.error('Get categories error:', error);
    return [];
  }
}

/**
 * Update a custom category (name, icon, color only)
 */
export async function updateCategory(
  categoryId: string,
  updates: {
    name?: string;
    icon?: string;
    color?: string;
  }
): Promise<CategoryResponse> {
  try {
    // Validate name if provided
    if (updates.name !== undefined) {
      if (updates.name.trim().length < 2) {
        return {
          success: false,
          error: 'Category name must be at least 2 characters',
        };
      }
      if (updates.name.length > 30) {
        return {
          success: false,
          error: 'Category name must be less than 30 characters',
        };
      }
    }

    const now = Date.now();
    const updateData: any = { updatedAt: now };

    if (updates.name !== undefined) updateData.name = updates.name.trim();
    if (updates.icon !== undefined) updateData.icon = updates.icon;
    if (updates.color !== undefined) updateData.color = updates.color;

    await db.transact([
      db.tx.categories[categoryId].update(updateData),
    ]);

    return { success: true };
  } catch (error) {
    console.error('Update category error:', error);
    return {
      success: false,
      error: 'Failed to update category',
    };
  }
}

/**
 * Delete a custom category (soft delete)
 */
export async function deleteCategory(categoryId: string): Promise<CategoryResponse> {
  try {
    await db.transact([
      db.tx.categories[categoryId].update({
        isActive: false,
        updatedAt: Date.now(),
      }),
    ]);

    return { success: true };
  } catch (error) {
    console.error('Delete category error:', error);
    return {
      success: false,
      error: 'Failed to delete category',
    };
  }
}
