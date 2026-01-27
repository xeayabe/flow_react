# DATABASE FIELD CLEANUP STATUS

## Overview
The database schema in `src/lib/db.ts` was cleaned up to remove 40+ unused fields. This document tracks the progress of fixing all code references to these removed fields.

## Schema Changes Summary

### Fields REMOVED (not in schema):

#### householdMembers
- ❌ role
- ❌ joinedAt
- ❌ payFrequency
- ❌ budgetPeriodStart
- ❌ budgetPeriodEnd
- ❌ lastBudgetReset
- ❌ monthlyIncome

#### households
- ❌ createdByUserId
- ❌ payFrequency
- ❌ budgetPeriodStart
- ❌ budgetPeriodEnd
- ❌ createdAt
- ❌ updatedAt

#### accounts
- ❌ startingBalance
- ❌ createdAt
- ❌ updatedAt

#### transactions
- ❌ isRecurring
- ❌ recurringDay
- ❌ createdAt
- ❌ updatedAt

#### budgets
- ❌ createdAt
- ❌ updatedAt

#### budgetSummary
- ❌ isActive
- ❌ createdAt
- ❌ updatedAt

#### categories
- ❌ icon
- ❌ color
- ❌ createdAt
- ❌ updatedAt

## Files Fixed

### ✅ src/lib/auth-api.ts
**Status:** COMPLETE
- Removed householdMembers fields: role, joinedAt, payFrequency, budgetPeriodStart, budgetPeriodEnd, lastBudgetReset, monthlyIncome
- Removed households fields: createdByUserId, payFrequency, budgetPeriodStart, budgetPeriodEnd, createdAt, updatedAt

### ✅ src/lib/invites-api.ts
**Status:** COMPLETE
- Removed householdMembers fields: role, joinedAt, payFrequency, budgetPeriodStart, budgetPeriodEnd, lastBudgetReset, monthlyIncome
- Removed updatedAt from household_invites (Note: household_invites.updatedAt actually EXISTS in schema, this was incorrect)

### ⚠️ src/lib/transactions-api.ts
**Status:** PARTIALLY COMPLETE (1/2)
- ✅ Fixed: Removed isRecurring, recurringDay, createdAt, updatedAt from transaction create (line 126-134)
- ❌ TODO: Fix transaction update and delete operations
  - Line ~409: Remove updatedAt from accounts
  - Line ~644-650: Remove isRecurring, recurringDay from transaction update
  - Line ~657-671: Remove updatedAt from accounts updates (3 places)

## Files Needing Fixes

### ❌ src/lib/accounts-api.ts
**Remaining Issues:** 4
- Line ~230: Remove updatedAt from accounts
- Line ~247: Remove startingBalance from accounts
- Line ~404: Remove updatedAt from accounts
- Line ~459: Remove updatedAt from accounts

### ❌ src/lib/budget-api.ts
**Remaining Issues:** ~25 (MOST COMPLEX FILE)
- Remove createdAt/updatedAt from budgets (lines 191-192, 213-214, 433, 441, 562, 599, 663, 678-679, 898, 913)
- Remove createdAt/updatedAt from budgetSummary (lines 191-192, 709, 960)
- Remove budgetPeriodStart/budgetPeriodEnd/updatedAt from households (lines 685-687)
- Replace budgetPeriodEnd READS with getCurrentBudgetPeriod() calls (lines 764-792)
- Replace budgetPeriodStart/budgetPeriodEnd/lastBudgetReset READS/WRITES from householdMembers (lines 845-850, 860-862)

### ❌ src/lib/categories-api.ts
**Remaining Issues:** 7
- Remove createdAt from categories (lines 96, 115, 134, 153, 172)
- Remove icon from categories (line 245)
- Remove updatedAt from categories (lines 399, 421)

### ❌ src/lib/settlement-api.ts
**Remaining Issues:** 3
- Remove updatedAt from accounts (lines 105, 109)
- Remove isRecurring from transactions (line 160)
- VERIFY: Line 321 updatedAt in shared_expense_splits (this field EXISTS in schema!)

### ❌ src/lib/import-export-api.ts
**Remaining Issues:** 3
- Remove createdAt from categories (line 748)
- Remove isRecurring from transactions (line 791)
- Remove updatedAt from accounts (line 821)

### ❌ src/lib/migrate-categories.ts
**Remaining Issues:** 1
- Remove updatedAt from categories (line 57)

### ❌ src/lib/split-settings-api.ts
**Remaining Issues:** 1
- Remove updatedAt from households (line 98)

### ❌ src/components/PayeePickerModal.tsx
**Remaining Issues:** 1
- Remove createdAt read from transactions (line 74)

## Progress Summary

- **Total Files:** 11
- **Fully Fixed:** 2 (auth-api.ts, invites-api.ts)
- **Partially Fixed:** 1 (transactions-api.ts)
- **Not Started:** 8
- **Total Type Errors Remaining:** ~60+

## Next Steps

1. Fix remaining transactions-api.ts issues (4 locations)
2. Fix accounts-api.ts (4 locations)
3. Fix budget-api.ts (25+ locations - most complex)
4. Fix categories-api.ts (7 locations)
5. Fix settlement-api.ts (3 locations)
6. Fix import-export-api.ts (3 locations)
7. Fix migrate-categories.ts (1 location)
8. Fix split-settings-api.ts (1 location)
9. Fix PayeePickerModal.tsx (1 location)
10. Remove TypeScript interface definitions that reference removed fields
11. Update any UI components that display removed fields

## Notes

- Budget period dates (budgetPeriodStart/budgetPeriodEnd) should now be calculated dynamically using `getCurrentBudgetPeriod(paydayDay)` instead of being stored
- The `paydayDay` field on householdMembers is the source of truth for calculating budget periods
- Some fields like `shared_expense_splits.updatedAt` and `settlements.payerAccountId` DO exist in the schema and should NOT be removed

---
Last Updated: 2026-01-27
