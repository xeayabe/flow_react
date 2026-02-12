// FIX: SEC-001, SEC-002, SEC-006, SEC-008, SEC-009, SEC-010, DAT-011
// Development-time guard that validates all InstantDB queries have proper privacy scoping.
// Throws an error if a query is missing userId or householdId scope.

import { logger } from './logger';

/**
 * Entity names that MUST be scoped by userId or householdId.
 * Any query to these entities without a where clause containing
 * userId, householdId, or id is a potential privacy breach.
 */
const SCOPED_ENTITIES: ReadonlySet<string> = new Set([
  'users',
  'accounts',
  'transactions',
  'budgets',
  'budgetSummary',
  'categories',
  'categoryGroups',
  'households',
  'householdMembers',
  'shared_expense_splits',
  'settlements',
  'household_invites',
  'payee_category_mappings',
  'recurringTemplates',
]);

/**
 * Allowed scope fields. A query to a scoped entity must include
 * at least one of these in its where clause.
 */
const ALLOWED_SCOPE_FIELDS: ReadonlySet<string> = new Set([
  'userId',
  'householdId',
  'id',
  'email',
  'owerUserId',
  'owedToUserId',
  'transactionId',
  'inviteToken',
]);

/**
 * Validate that a query object has proper scoping on all entities.
 *
 * @param query - The InstantDB query object
 * @param callerName - Name of the calling function (for error messages)
 * @throws Error in development mode if any entity is missing scope
 */
export function validateQueryScope(
  query: Record<string, unknown>,
  callerName: string = 'unknown'
): void {
  // Only enforce in development mode
  if (typeof __DEV__ === 'undefined' || !__DEV__) {
    return;
  }

  for (const [entityName, entityQuery] of Object.entries(query)) {
    if (!SCOPED_ENTITIES.has(entityName)) {
      continue; // Skip entities we don't track
    }

    // If the query is just {} or has no $ clause, it's unscoped
    if (
      entityQuery === null ||
      entityQuery === undefined ||
      typeof entityQuery !== 'object'
    ) {
      reportUnscopedQuery(entityName, callerName);
      continue;
    }

    const queryObj = entityQuery as Record<string, unknown>;
    const dollarClause = queryObj['$'] as Record<string, unknown> | undefined;

    if (!dollarClause || typeof dollarClause !== 'object') {
      reportUnscopedQuery(entityName, callerName);
      continue;
    }

    const whereClause = dollarClause['where'] as Record<string, unknown> | undefined;

    if (!whereClause || typeof whereClause !== 'object') {
      reportUnscopedQuery(entityName, callerName);
      continue;
    }

    // Check if at least one allowed scope field is present in the where clause
    const whereKeys = Object.keys(whereClause);
    const hasScope = whereKeys.some((key) => ALLOWED_SCOPE_FIELDS.has(key));

    if (!hasScope) {
      reportUnscopedQuery(entityName, callerName, whereKeys);
    }
  }
}

/**
 * Report an unscoped query. In development, logs a warning.
 * Could be enhanced to throw an error for strict enforcement.
 */
function reportUnscopedQuery(
  entityName: string,
  callerName: string,
  existingWhereKeys?: string[]
): void {
  const message = existingWhereKeys
    ? `PRIVACY VIOLATION: Query to "${entityName}" in "${callerName}" has where clause with keys [${existingWhereKeys.join(', ')}] but none are valid scope fields. Add userId, householdId, or id.`
    : `PRIVACY VIOLATION: Query to "${entityName}" in "${callerName}" is missing scope (no $ where clause with userId/householdId). This returns ALL users' data!`;

  logger.error(message);

  // In development, throw to make it impossible to miss
  if (typeof __DEV__ !== 'undefined' && __DEV__) {
    throw new Error(message);
  }
}

/**
 * Helper: wrap a query object to auto-validate before execution.
 * Use this as a drop-in enhancement for db.queryOnce() calls.
 *
 * @example
 * const { data } = await db.queryOnce(guardedQuery({
 *   transactions: { $: { where: { userId } } }
 * }, 'getTransactions'));
 */
export function guardedQuery<T extends Record<string, unknown>>(
  query: T,
  callerName: string = 'unknown'
): T {
  validateQueryScope(query, callerName);
  return query;
}
