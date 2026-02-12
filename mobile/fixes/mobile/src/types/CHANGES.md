# Changes: /src/types/

## New Files

### errors.ts (CODE-4)
**Purpose**: Typed error hierarchy replacing untyped `throw new Error()` and `catch (error: any)` patterns throughout the codebase.

**Error classes:**
- `AppError` (base) -- All app errors extend this; provides `code`, `message`, `details`, `cause`
- `NetworkError` -- Network failures with `statusCode` and `url`
- `ValidationError` -- Form/input validation with `fieldErrors` map
- `AuthError` -- Authentication failures (token expired, unauthorized)
- `DataIntegrityError` -- Database consistency issues (missing records, constraint violations)
- `BudgetError` -- Budget-specific errors (over-allocation, missing period)
- `SettlementError` -- Settlement-specific errors (insufficient funds, already settled)

**Utility functions:**
- `isError(value)` -- Type guard for `Error` instances
- `isAppError(value)` -- Type guard for `AppError` instances
- `getErrorMessage(error)` -- Safe error message extraction from `unknown` type
- `wrapError(error, ErrorClass, message)` -- Wraps unknown errors in typed error classes

**Impact**: Replaces ~50+ instances of `catch (error: any)` with typed error handling. Enables structured error responses in API layer.

### api.ts (CODE-2)
**Purpose**: Shared TypeScript interfaces for database records, replacing `any` casts in query results across all `*-api.ts` files.

**Interfaces:**
- `AccountRecord` -- Wallet/account fields (id, name, balance, institution, accountType, etc.)
- `BudgetRecord` -- Budget allocation fields (categoryId, allocatedAmount, spentAmount, isActive, etc.)
- `BudgetSummaryRecord` -- Aggregated budget totals
- `CategoryRecord` -- Category fields (name, emoji, type, categoryGroup, etc.)
- `UserRecord` -- User profile fields
- `HouseholdMemberRecord` -- Household membership with paydayDay
- `HouseholdRecord` -- Household with paydayDay fallback
- `SharedExpenseSplitRecord` -- Split details (owerUserId, owedToUserId, splitAmount, isPaid)
- `SettlementRecord` -- Settlement history
- `TransactionRecord` -- Full transaction fields
- `BudgetPeriod` -- Calculated period with start, end, paydayDay, source, daysRemaining
- `ApiResponse<T>` -- Generic API response wrapper
- `InstantDBQueryResult` -- Generic InstantDB query result type

**Impact**: Eliminates ~40+ instances of `as any[]` in query result casting across `transactions-api.ts`, `budget-api.ts`, `shared-api.ts`, and `settlement-api.ts`.
