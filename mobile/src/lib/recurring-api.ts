import { db } from './db';
import 'react-native-get-random-values';
import { v4 as uuidv4 } from 'uuid';

/**
 * Recurring expense template
 */
export interface RecurringTemplate {
  id: string;
  userId: string;
  householdId: string;
  amount: number;
  categoryId: string;
  accountId: string; // wallet ID
  recurringDay: number; // 1-31
  payee?: string;
  note?: string;
  isActive: boolean;
  createdAt: number;
  lastCreatedDate: string | null; // ISO date string of last transaction created
}

/**
 * Create a recurring expense template (NOT a transaction)
 */
export async function createRecurringTemplate(params: {
  userId: string;
  householdId: string;
  amount: number;
  categoryId: string;
  accountId: string;
  recurringDay: number; // 1-31
  payee?: string;
  note?: string;
}): Promise<string> {
  const templateId = uuidv4();
  const now = Date.now();

  console.log('📅 Creating recurring template:', {
    templateId: templateId.substring(0, 8),
    amount: params.amount,
    recurringDay: params.recurringDay,
  });

  await db.transact([
    db.tx.recurringTemplates[templateId].update({
      userId: params.userId,
      householdId: params.householdId,
      amount: params.amount,
      categoryId: params.categoryId,
      accountId: params.accountId,
      recurringDay: params.recurringDay,
      payee: params.payee || undefined,
      note: params.note || undefined,
      isActive: true,
      createdAt: now,
      lastCreatedDate: null,
    }),
  ]);

  console.log('✅ Recurring template created:', templateId.substring(0, 8));
  return templateId;
}

/**
 * Get active recurring templates for a user
 */
export async function getActiveRecurringTemplates(
  userId: string,
  householdId: string
): Promise<RecurringTemplate[]> {
  const { data } = await db.queryOnce({
    recurringTemplates: {
      $: {
        where: {
          userId: userId,
          householdId: householdId,
          isActive: true,
        },
      },
    },
  });

  return (data.recurringTemplates || []) as RecurringTemplate[];
}

/**
 * Get a single recurring template by ID
 */
export async function getRecurringTemplate(templateId: string): Promise<RecurringTemplate | null> {
  const { data } = await db.queryOnce({
    recurringTemplates: {
      $: {
        where: {
          id: templateId,
        },
      },
    },
  });

  const templates = data.recurringTemplates || [];
  return templates.length > 0 ? (templates[0] as RecurringTemplate) : null;
}

/**
 * Check if a recurring template should be created this month
 */
export function shouldCreateThisMonth(template: RecurringTemplate): boolean {
  const today = new Date();
  const currentDay = today.getDate();
  const recurringDay = template.recurringDay;

  // If recurring day hasn't arrived yet this month, don't show
  if (currentDay < recurringDay) {
    return false;
  }

  // If recurring day has passed, check if we already created it this month
  if (template.lastCreatedDate) {
    const lastCreated = new Date(template.lastCreatedDate);
    const thisYear = today.getFullYear();
    const thisMonth = today.getMonth();
    const lastYear = lastCreated.getFullYear();
    const lastMonth = lastCreated.getMonth();

    // Already created this month
    if (thisYear === lastYear && thisMonth === lastMonth) {
      return false;
    }
  }

  // Recurring day has arrived or passed, and we haven't created it yet this month
  return true;
}

/**
 * Get number of days in a specific month
 */
function getDaysInMonth(year: number, month: number): number {
  return new Date(year, month + 1, 0).getDate();
}

/**
 * Create a transaction from a recurring template
 * @param templateId - The recurring template ID
 * @param customDate - Optional: use this date instead of the recurring day (for "Add Now")
 */
export async function createTransactionFromTemplate(
  templateId: string,
  customDate?: Date
): Promise<string> {
  console.log('📅 Creating transaction from template:', templateId.substring(0, 8));

  const template = await getRecurringTemplate(templateId);
  if (!template) {
    throw new Error('Recurring template not found');
  }

  let transactionDate: Date;

  if (customDate) {
    // Use custom date (today when "Add Now" is clicked)
    transactionDate = customDate;
    console.log('📅 Using custom date (Add Now):', customDate.toISOString().split('T')[0]);
  } else {
    // Use recurring day for automatic creation
    const today = new Date();
    const year = today.getFullYear();
    const month = today.getMonth();

    // Handle months with fewer days (e.g., Feb 31 -> Feb 28)
    const daysInMonth = getDaysInMonth(year, month);
    const recurringDay = Math.min(template.recurringDay, daysInMonth);

    transactionDate = new Date(year, month, recurringDay);
    console.log('📅 Using recurring day:', recurringDay);
  }

  // Create transaction date (YYYY-MM-DD format)
  const dateString = transactionDate.toISOString().split('T')[0];

  const transactionId = uuidv4();

  console.log('💳 Creating transaction:', {
    transactionId: transactionId.substring(0, 8),
    date: dateString,
    amount: template.amount,
  });

  await db.transact([
    // Create actual transaction
    db.tx.transactions[transactionId].update({
      userId: template.userId,
      householdId: template.householdId,
      accountId: template.accountId,
      categoryId: template.categoryId,
      amount: template.amount,
      date: dateString,
      type: 'expense',
      payee: template.payee || undefined,
      note: template.note || undefined,
      isShared: false,
      paidByUserId: template.userId,
      createdFromTemplateId: templateId, // Link back to template
    }),

    // Update template's last created date
    db.tx.recurringTemplates[templateId].update({
      lastCreatedDate: dateString,
    }),
  ]);

  console.log('✅ Transaction created from template');
  return transactionId;
}

/**
 * Deactivate a recurring template (soft delete)
 */
export async function deactivateRecurringTemplate(templateId: string): Promise<void> {
  console.log('🗑️ Deactivating recurring template:', templateId.substring(0, 8));

  await db.transact([
    db.tx.recurringTemplates[templateId].update({
      isActive: false,
    }),
  ]);

  console.log('✅ Recurring template deactivated');
}

/**
 * Update a recurring template
 */
export async function updateRecurringTemplate(
  templateId: string,
  updates: Partial<{
    amount: number;
    categoryId: string;
    accountId: string;
    recurringDay: number;
    payee: string;
    note: string;
  }>
): Promise<void> {
  console.log('✏️ Updating recurring template:', templateId.substring(0, 8));

  await db.transact([db.tx.recurringTemplates[templateId].update(updates)]);

  console.log('✅ Recurring template updated');
}
