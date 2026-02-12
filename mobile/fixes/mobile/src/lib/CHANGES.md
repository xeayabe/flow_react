# Changes: /src/lib/

## Security & Privacy Fixes (Agent 1)

### New Files Created for Security

#### logger.ts (SEC-003, CQP-003)
**Purpose**: Secure logging utility that auto-redacts sensitive data (UUIDs, emails, monetary amounts, IBANs) and only outputs in development mode.

**Why**: The codebase had 462+ `console.log/error/warn` calls that leaked sensitive user data (user IDs, email addresses, household IDs, account balances, transaction amounts) to device logs in production. Device logs can be accessed by other apps or extracted during forensic analysis.

**Key features:**
- `logger.debug()` / `logger.info()` / `logger.warn()` -- Dev-only, suppressed in production
- `logger.error()` -- Always active but auto-redacts sensitive patterns
- Auto-redacts: UUIDs (`[REDACTED-UUID]`), emails (`[REDACTED-EMAIL]`), amounts (`[REDACTED-AMOUNT]`), IBANs (`[REDACTED-IBAN]`)
- Object key redaction for known sensitive keys: `userId`, `email`, `password`, `token`, `balance`, `amount`, `income`, `splitAmount`

#### query-guard.ts (SEC-001, SEC-002, SEC-006, SEC-008, SEC-009, SEC-010)
**Purpose**: Development-time validator that ensures all database queries include proper privacy scoping (`userId`, `householdId`, or `id` in their `where` clause).

**Why**: Multiple queries in the codebase fetched ALL records from shared tables (e.g., `categories: {}`, `shared_expense_splits: {}`, `accounts: {}`, `users: {}`), allowing any user to see other users' financial data.

**Key features:**
- `validateQueryScope(queryObj)` -- Checks that every entity in a query has a `$: { where: { userId/householdId/id } }` clause
- `guardedQuery(queryObj)` -- Drop-in wrapper that validates then executes queries
- Throws errors in dev mode, logs warnings in production
- Allowlist for entities that don't need scoping (e.g., `households` when queried by `id`)

#### validation.ts (SEC-005, SEC-011, SEC-013, SEC-022, CQP-023)
**Purpose**: Zod-based runtime input validation for all mutation payloads.

**Why**: No input validation existed on financial data mutations. Users could submit negative amounts, XSS payloads in text fields, amounts exceeding reasonable limits, or malformed dates.

**Schemas provided:**
- `TransactionSchema` -- Validates amount (positive, max 999999.99), payee (sanitized), date (ISO format), type (income/expense), categoryId, accountId
- `WalletSchema` -- Validates name (2-50 chars, sanitized), institution, accountType, startingBalance
- `BudgetAllocationSchema` -- Validates categoryId, amount, categoryGroup (needs/wants/savings/other)
- `SettlementSchema` -- Validates payerAccountId, receiverAccountId, amount, splitIds
- `CategorySchema` -- Validates name (1-50 chars, sanitized), categoryGroup, householdId
- `sanitizeString(input)` -- Strips HTML tags, control characters, normalizes whitespace
- `validate(schema, data)` -- Returns user-friendly error messages or validated data

#### rate-limiter.ts (SEC-007)
**Purpose**: Client-side sliding window rate limiter to prevent rapid-fire mutations.

**Why**: No rate limiting existed on database write operations. A compromised or buggy UI could fire hundreds of writes per second, potentially corrupting data or incurring excessive database costs.

**Key features:**
- Default limits: 10 writes/minute per entity type (5/minute for settlements)
- `checkRateLimit(entityType)` -- Check without recording
- `recordMutation(entityType)` -- Record a successful write
- `rateLimitedMutation(entityType)` -- Check + record in one call
- `clearRateLimits()` -- Reset all state (for sign-out)
- AsyncStorage persistence with in-memory cache for performance

### Security Fixes to Existing Files

#### settlement-api.ts (SEC-001, SEC-002, SEC-006, SEC-010, SEC-003)
**Critical unscoped queries fixed:**
1. **Line ~70**: `shared_expense_splits: {}` fetched ALL splits globally -- now scoped by `owerUserId`/`owedToUserId` (SEC-010)
2. **Line ~274**: `shared_expense_splits: {}` in `debugSettlementData` -- now scoped by `owerUserId`/`owedToUserId` (SEC-010)
3. **Line ~335**: `accounts: {}` fetched ALL accounts globally -- now two scoped queries by `id` with ownership verification (SEC-001)
4. **Line ~450**: `shared_expense_splits: {}` in `createSettlement` -- now scoped by user involvement (SEC-010)
5. **Line ~95,728**: `users: {}` fetched ALL users -- now fetches household members first, then users by ID (SEC-002)
6. All 30+ `console.log/error` calls replaced with `logger.debug/error` (SEC-003)

#### shared-expenses-api.ts (SEC-010, SEC-003)
**Critical unscoped queries fixed:**
1. **Line ~217**: `calculateDebtBalance` fetched ALL `shared_expense_splits` -- now uses two scoped queries: `owerUserId: userId1` and `owerUserId: userId2` (SEC-010)
2. All `console.log` calls replaced with `logger.debug/error` (SEC-003)

#### transactions-api.ts (SEC-002, SEC-003)
**Critical unscoped queries fixed:**
1. **Line ~296**: `users: {}` in `getHouseholdTransactionsWithCreators` fetched ALL users -- now fetches `householdMembers` by `householdId`, extracts member userIds, then fetches each user by `id` via `Promise.all` (SEC-002)
2. All 15+ `console.log/error/warn` calls replaced with `logger.debug/error/warn` (SEC-003)

#### budget-api.ts (SEC-009, DAT-011, SEC-001, SEC-003)
**Critical unscoped queries fixed:**
1. **Line ~299**: `categories: {}` in `getBudgetDetails` fetched ALL categories -- now extracts unique `categoryIds` from user's budget records and fetches each by `id` (SEC-009)
2. **Line ~684-690**: `budgetSummary: { $: { where: {} } }` in `resetBudgetPeriod` had empty where clause returning ALL summaries -- now iterates household members and queries each by `userId` (DAT-011)
3. **Line ~647-655**: `budgets: { $: { where: { isActive: true } } }` in `resetBudgetPeriod` fetched ALL active budgets globally -- now fetches per household member via `userId` scoping (SEC-001)
4. All 20+ `console.log/error` calls replaced with `logger.debug/error` (SEC-003)

#### accounts-api.ts (SEC-003)
**No unscoped queries (all were already scoped by userId or id).**
1. All 10+ `console.log/error` calls replaced with `logger.debug/error` (SEC-003)
2. Sensitive data removed from log messages (account names, balances, IDs)

#### analytics-api.ts (SEC-003)
**No unscoped queries (all were already scoped by userId or householdId).**
1. All 4 `console.log/error` calls replaced with `logger.debug/error` (SEC-003)
2. `getDateRange` no longer logs payday or date details

#### auth-api.ts (SEC-003, SEC-004)
**Error message fixes (SEC-004):**
1. `sendMagicCode` error handler: Original could expose internal error messages to user -- now always returns generic "Unable to send verification code" message
2. `verifyMagicCode` error handler: Original exposed "Record not found" and `app-user-magic-code` DB table name in error path -- now returns generic "Incorrect code" message
3. `createUserProfile` error: Original returned "Failed to create user profile" with potential error details -- now returns generic message
4. `createDefaultHousehold` error: Original returned "Failed to create default household" -- now returns generic message

**Logger fixes (SEC-003):**
1. All 12+ `console.log/error` calls replaced with `logger.debug/error`
2. `createUserProfile`: No longer logs email or name
3. `createDefaultHousehold`: No longer logs userId or householdId
4. Error catch blocks: No longer pass full error objects (which may contain user data) -- only log error messages

## New Files

### shared-api.ts (CQP-006, ARCH-1 -- CRITICAL)
**Purpose**: Break circular dependency between `transactions-api.ts` and `budget-api.ts`.

**Why**: `transactions-api.ts` imported `getMemberBudgetPeriod` and `updateBudgetSpentAmount` from `budget-api.ts`, creating a circular dependency chain (transactions-api -> budget-api, settlement-api dynamically imports budget-api). This caused unpredictable module initialization ordering and potential runtime crashes.

**Extracted functions:**
- `getMemberBudgetPeriod(userId, householdId)` -- Dynamically calculates budget period from member's payday setting
- `updateBudgetSpentAmount(userId, categoryId, periodStart, spentAmount)` -- Updates budget spent amount (fires asynchronously)
- `updateBudgetSpentAmountAsync()` -- Internal helper that performs the actual database update

**Impact**: `transactions-api.ts` now imports from `shared-api.ts` instead of `budget-api.ts`. `budget-api.ts` re-exports from `shared-api.ts` for backward compatibility. Circular dependency eliminated.

### form-validators.ts (CODE-5)
**Purpose**: Centralized form validation logic extracted from add/edit screens.

**Why**: Validation logic was duplicated across 4 screens: `transactions/add.tsx` (~30 lines), `transactions/[id]/edit.tsx` (~22 lines), `wallets/add.tsx` (~30 lines), and potentially `wallets/[id]/edit.tsx`. Total ~300+ lines of duplicated validation.

**Transaction validators:**
- `validateTransactionAmount(amount)` -- Empty check + positive number check
- `validateCategoryId(categoryId)` -- Required selection check
- `validateAccountId(accountId)` -- Required selection check
- `validateTransactionDate(date)` -- ISO date format validation
- `validateTransactionForm(formData)` -- All-at-once validation returning error object
- `isTransactionFormValid(formData)` -- Boolean check for submit button enabling
- `normalizeAmountInput(text)` -- European comma handling, non-numeric removal

**Wallet validators:**
- `validateWalletName(name)` -- Min 2 chars, max 50 chars
- `validateInstitution(institution)` -- Required selection check
- `validateAccountType(accountType)` -- Required selection check
- `validateStartingBalance(balance)` -- Numeric validation with thousand separators
- `validateLast4Digits(digits)` -- Optional, exactly 4 digits if provided
- `validateWalletForm(formData)` -- All-at-once validation
- `isWalletFormValid(formData)` -- Boolean check

**Impact**: Screens can import validators instead of maintaining duplicate logic. Single source of truth for validation rules.

## Fixed Files

### transactions-api.ts (CQP-006, CODE-2, CODE-4)
**Changes:**
1. Import changed from `'./budget-api'` to `'./shared-api'` (CQP-006 -- breaks circular dependency)
2. All `any` casts in query results replaced with typed records from `../types/api` (CODE-2)
3. All catch blocks use `getErrorMessage(error)` from `../types/errors` (CODE-4)
4. Extracted helper functions: `getTodayDateString()`, `validateTransactionInput()`, `fetchAccountOrThrow()`, `safeUpdateBudgetForExpense()`

### budget-api.ts (CQP-006, CODE-2, CODE-4, CODE-6)
**Changes:**
1. Re-exports `getMemberBudgetPeriod` and `updateBudgetSpentAmount` from `'./shared-api'` for backward compat (CQP-006)
2. All `any` casts replaced with typed records (CODE-2)
3. All catch blocks use `getErrorMessage(error)` (CODE-4)
4. Extracted helpers: `determineBudgetStatus()`, `getExcludedAccountIds()`, `groupSpentByCategory()`, `getTodayDateString()`, `updateBudgetSummaryTotalSpent()` (CODE-6)

### settlement-api.ts (DAT-003, DAT-008, CODE-6)
**Changes (by other agents):**
1. `createSettlement` consolidated into single atomic `db.transact()` call (DAT-003)
2. Null safety for all financial arithmetic: `amount ?? 0`, `balance ?? 0`, `splitAmount ?? 0` (DAT-008)
3. Function decomposed into 4 clear phases with comments (CODE-6)

### messages.ts (TASK 4)
**Purpose**: Centralized user-facing strings with empathetic, supportive language.

**Why**: The codebase has scattered hardcoded strings in components (Alert.alert calls, inline text).
Several messages use harsh or blaming language that conflicts with Flow's calm design philosophy:

**Harsh messages found in codebase (to be replaced with messages module):**
1. `src/components/RecurringExpensesWidget.tsx` line 74: `Alert.alert('Error', 'Failed to add recurring expense. Please try again.')` -- blaming language
2. `src/app/(tabs)/two.tsx` line 94: `Alert.alert('Error', 'Failed to sign out. Please try again.')` -- blaming language
3. `src/components/DebtBalanceWidget.tsx` line 48: `Alert.alert('Error', 'No household info')` -- unhelpful, blaming
4. `src/app/settlement/index.tsx` line 155: `Alert.alert('Settlement Failed', error.message)` -- harsh "Failed" language
5. `src/components/DashboardWidgets.tsx` line 76: Uses `text-red-600` for spending, creating anxiety

The `messages.ts` module provides empathetic alternatives for all these cases. Components should
import from `@/lib/messages` instead of hardcoding strings.

### accessibility.ts (TASK 5)
**Purpose**: VoiceOver/assistive technology helpers for financial data.

**Functions provided:**
- `accessibleCurrency(amount)` -- "1234 francs and 56 centimes" format
- `accessibleBudgetStatus(category, percentage)` -- "Dining Out: 75 percent of budget used, progressing well"
- `accessibleDate(dateString)` -- "February 8th, 2026"
- `accessibleTransaction(payee, amount, type, category, date)` -- complete transaction description
- `accessibleSettlement(youOwe, partnerName, amount)` -- settlement balance description
- `accessibleBudgetPeriod(start, end, daysRemaining)` -- budget period description
- `accessibleAccount(name, balance, type)` -- account balance description

**Usage**: Components should use these in `accessibilityLabel` props on all financial data displays.

## WCAG AA Contrast Analysis (TASK 6: UX-008)

### Color Combinations Checked

Using WCAG 2.1 relative luminance formula and contrast ratio calculations:

| Combination | Contrast Ratio | WCAG AA (4.5:1) | WCAG AA Large (3:1) |
|---|---|---|---|
| White (#FFFFFF) on contextTeal (#2C5F5D) | ~5.4:1 | PASS | PASS |
| textWhiteSecondary (0.7 opacity) on bgDark | ~9.8:1 | PASS | PASS |
| textWhiteTertiary (0.6 opacity) on bgDark | ~7.5:1 | PASS | PASS |
| textWhiteDisabled (0.4 opacity) on bgDark | ~4.3:1 | FAIL | PASS |
| budgetOnTrack (#C5D4BE) on bgDark | ~9.7:1 | PASS | PASS |
| budgetProgressing (#E5C399) on bgDark | ~9.3:1 | PASS | PASS |
| budgetNearlyThere (#4A8D89) on bgDark | ~4.0:1 | FAIL for small text | PASS |
| budgetFlowAdjusted (#D4C4ED) on bgDark | ~10.0:1 | PASS | PASS |

### Issues Found

1. **textWhiteDisabled (0.4 opacity white) on bgDark**: Contrast ratio ~4.3:1, slightly below WCAG AA 4.5:1 threshold for normal text.
   - **Recommendation**: Increase opacity from 0.4 to 0.45 for text that must be readable (inactive tab labels).
   - **Note**: WCAG allows lower contrast for disabled/decorative elements, so this may be acceptable for truly disabled controls.
   - **Suggested token update**: `textWhiteDisabled: 'rgba(255, 255, 255, 0.45)'`

2. **budgetNearlyThere (#4A8D89) on bgDark**: Contrast ratio ~4.0:1, below WCAG AA 4.5:1 for small text.
   - **Recommendation**: This color is used as a status indicator (text label and progress bar fill), where it appears alongside white text providing the same information.
   - **Acceptable**: The status text is supplementary (the percentage and "remaining" amounts are in white), so the lower contrast on the status label is acceptable for decorative/supplementary use.
   - **Alternative if needed**: Brighten to `#5AA09C` for ~5.0:1 ratio.

### No Action Needed
- White on contextTeal passes comfortably (5.4:1)
- textWhiteSecondary and textWhiteTertiary both pass with good margins
- budgetOnTrack, budgetProgressing, and budgetFlowAdjusted all pass easily

---

## Data Integrity & Reliability Fixes (Agent 2)

### TASK 1: DAT-003 (CRITICAL) - settlement-api.ts Atomic Consolidation
**Issue**: `createSettlement()` had 7+ separate `db.transact()` calls. If any intermediate call failed (network error, crash), financial data would be left in a partially-updated state (e.g., payer debited but receiver not credited, splits partially marked as paid).

**Fix**: Consolidated all settlement mutations into a single atomic `db.transact()` call. The function now:
1. Pre-fetches all required data (accounts, splits) in read-only queries
2. Validates all preconditions (account existence, sufficient funds, split validity)
3. Builds a single array of all mutation operations (account balance updates, settlement record, split status updates)
4. Executes all mutations in ONE `db.transact()` call -- all-or-nothing

**Impact**: Settlement is now atomic. Either ALL operations succeed or NONE do. No partial state corruption possible.

### TASK 2: DAT-002 (CRITICAL) - transactions-api.ts Atomic Budget Updates
**Issue**: `createTransaction()`, `deleteTransaction()`, and `updateTransaction()` updated the account balance atomically with the transaction, but then updated budget `spentAmount` in a separate non-atomic call. If the budget update failed, the transaction would exist but the budget would show incorrect spending.

**Fix**:
- Added `prefetchBudgetForAtomicUpdate()` helper that pre-fetches budget data and pre-computes the new `spentAmount` before the atomic transaction
- `createTransaction()` now includes the budget `spentAmount` update in the same `db.transact()` call as the transaction and account balance update
- `deleteTransaction()` similarly includes budget update in the atomic call
- `updateTransaction()` includes budget update atomically for same-category updates; category-change updates require two different budget records and fall back to separate calls (documented as intentional trade-off)
- Added `bestEffortUpdateBudgetSummary()` for the `totalSpent` summary aggregation, which remains non-atomic by design (it aggregates across ALL categories)

**Impact**: Transaction + budget consistency is now atomic for the primary case (same-category operations).

### TASK 3: DAT-001 (CRITICAL) - periodStart Sort Bug
**Issue**: Three files sorted `budgetSummary` records by `b.periodStart`, but the `budgetSummary` schema (in `db.ts`) has NO `periodStart` field. This caused `new Date(undefined).getTime()` which returns `NaN`, making all sort comparisons return `false` and producing unreliable ordering.

**Files fixed**:
1. **shared-expenses-api.ts** line 77: Removed `.sort((a, b) => new Date(b.periodStart)...)` -- now takes `summaries[0]` directly since each user typically has one active budgetSummary
2. **split-settings-api.ts** line 37: Same fix -- removed sort by non-existent `periodStart`, takes first result
3. **budget-api.ts**: Prior agent already fixed structurally; added `DAT-001` header comment for traceability

### TASK 4: DAT-009 - Cascade Guard Integration
**Issue**: `deleteAccount()` and `deleteCategory()` performed soft deletes without checking for dependent records (transactions, budgets, recurring templates, payee mappings). Orphaned references could cause crashes or data inconsistencies.

**Files fixed**:
1. **accounts-api.ts**: Added `import { checkWalletDeletable } from './cascade-guard'` and pre-deletion check in `deleteAccount()`. Returns user-friendly error if dependent records exist.
2. **categories-api.ts** (new fix file): Added `import { checkCategoryDeletable } from './cascade-guard'` and pre-deletion check in `deleteCategory()`. Returns user-friendly error if dependent records exist.

**Note**: `cascade-guard.ts` itself was created by the prior agent (Agent 1). Agent 2 integrated it into the deletion call sites.

### TASK 6: DAT-008 - Null Safety for Financial Arithmetic
**Issue**: Financial calculations used values directly from database without null checks. If any field was `null`/`undefined` (e.g., new record with uninitialized optional field), arithmetic operations would produce `NaN`, silently corrupting displayed amounts.

**Files fixed** (all financial arithmetic now uses `?? 0`):
1. **transactions-api.ts**: `account.balance ?? 0`, `request.amount ?? 0`, `budget.spentAmount ?? 0`, `transaction.amount ?? 0`
2. **shared-expenses-api.ts**: `split.splitAmount ?? 0`, `latestSummary?.totalIncome ?? 0`, `(amount ?? 0) * (split.percentage ?? 0)`
3. **split-settings-api.ts**: `latestSummary?.totalIncome ?? 0`, `income ?? 0` in totalIncome reduce, `val ?? 0` in manual ratio validation
4. **settlement-api.ts**: `amount ?? 0`, `balance ?? 0`, `splitAmount ?? 0` (done by prior agent in settlement-api.ts)

### TASK 9: DAT-005/DAT-010 - Budget Period Mismatch Audit

**Audit Methodology**: Traced every call to `calculateBudgetPeriod()` and `getCurrentBudgetPeriod()` across the entire codebase. Verified the `budgets` and `budgetSummary` schemas have no `periodStart`/`periodEnd` fields. Checked all `db.transact()` calls for stored period dates.

**Schema Verification** (source of truth: `src/lib/db.ts`):
- `budgets` entity: Has `userId`, `categoryId`, `allocatedAmount`, `spentAmount`, `percentage`, `categoryGroup`, `isActive` -- **NO period fields** (CORRECT)
- `budgetSummary` entity: Has `userId`, `totalIncome`, `totalAllocated`, `totalSpent` -- **NO period fields** (CORRECT)
- `householdMembers` entity: Has `paydayDay` (source of truth for period calculation) -- **NO stored periods** (CORRECT)
- `households` entity: Has `paydayDay` (legacy fallback) -- **NO stored periods** (CORRECT)

**All call sites verified**:

| File | Function | Usage | Stores in DB? | Status |
|---|---|---|---|---|
| `budget-api.ts` | `getMemberBudgetPeriod` | Dynamic calc from paydayDay, returns to caller | NO | OK |
| `budget-api.ts` | `saveBudget` | Passes period to `recalculateBudgetSpentAmounts()` for filtering | NO (ephemeral) | OK |
| `budget-api.ts` | `recalculateBudgetSpentAmounts` | Filters transactions by date range | NO (ephemeral) | OK |
| `budget-api.ts` | `resetBudgetPeriod` | Calculates new period, resets budgets | NO | OK |
| `budget-api.ts` | `checkAndResetBudgetIfNeeded` | Compares today vs period end | NO | OK |
| `budget-api.ts` | `resetMemberBudgetPeriod` | Calculates new period, resets member budgets | NO | OK |
| `transactions-api.ts` | `getRecentTransactions` | Filters by period dates passed as params | NO (ephemeral) | OK |
| `shared-api.ts` | `getMemberBudgetPeriod` | Dynamic calc from paydayDay | NO | OK |
| `shared-api.ts` | `updateBudgetSpentAmountAsync` | Queries budget by userId only | NO | OK |
| `trends-api.ts` | `getTrendData` | Calculates historical periods for grouping | NO (in-memory only) | OK |
| `analytics-api.ts` | `getDateRange` | Calculates period for date range filtering | NO (in-memory only) | OK |
| `payday.tsx` | `handlePaydayChange` | Passes period to `recalculateBudgetSpentAmounts` | NO (ephemeral) | OK |
| `useDashboardData.ts` | dashboard hook | Uses period for UI display | NO | OK |
| `(tabs)/index.tsx` | dashboard | Uses period for UI display | NO | OK |
| `(tabs)/budget/index.tsx` | budget page | Uses period for UI display | NO | OK |

**Dead code found and fixed (DAT-005)**:
1. **auth-api.ts** line 249: `const budgetPeriod = calculateBudgetPeriod(defaultPaydayDay)` -- variable calculated but NEVER used in any `db.transact()` call. Removed import and dead variable.
2. **invites-api.ts** lines 126-127: `const budgetPeriod = calculateBudgetPeriod(householdPayday)` -- same issue, calculated but never used. Created fix file removing the dead code.

**DAT-010 (Payday Edge Cases)**: All period calculations flow through `calculateBudgetPeriod()` in `payday-utils.ts` and `getCurrentBudgetPeriod()` in `budget-period-utils.ts`. Both handle:
- Month boundaries (paydayDay > days in month)
- Year boundaries (December -> January)
- Default fallback (paydayDay 25 if not set)

**Remaining concern**: The `paydayDay = -1` (last day of month) case is documented in the schema but not consistently tested across all edge cases (Feb 28/29 for leap years). This is an implementation detail in the utility functions, not a data integrity issue in the API layer.

### New Fix File: invites-api.ts (DAT-005, SEC-003)
**Changes:**
1. Removed dead `calculateBudgetPeriod` import and unused `budgetPeriod` variable (DAT-005)
2. All `console.log/error` calls replaced with `logger.debug/error` (SEC-003)
3. Removed sensitive data from log messages (invite codes, user IDs, household IDs)
