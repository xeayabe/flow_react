# Integration Tests - CHANGES

## Added Files

### `critical-flows.test.ts`
Four integration tests covering critical end-to-end user flows.

**Flow 1: Budget -> Expense -> Budget Spent Update**
- Creates a CHF 87.35 Migros expense transaction
- Verifies that `getMemberBudgetPeriod` is called to determine the current period
- Verifies that `updateBudgetSpentAmount` is called with the correct new spent total
- Confirms income transactions do NOT trigger budget updates

**Flow 2: Shared Expense -> Split Creation -> Settlement Balance**
- Simulates Alex paying CHF 2,100 rent as a shared expense
- Verifies that unsettled expenses are correctly retrieved
- Confirms the 60/40 split produces CHF 840 owed by Cecilia
- Validates settlement balance direction (Alex is owed, yourShare is negative)

**Flow 3: Recurring Template -> Activate -> Transaction Created**
- Simulates activating a recurring rent template (CHF 2,100)
- Verifies that `createTransaction` is called with template data
- Confirms the transaction is persisted via `db.transact`
- Validates that templates themselves do NOT auto-create transactions (architecture principle)

**Flow 4: Edit Transaction -> Toggle Shared -> Splits Created**
- Simulates creating splits when a transaction is marked as shared
- Verifies that only non-payer members get split records
- Confirms 40% split of CHF 87.35 = CHF 34.94 for Cecilia
- Tests edge case: no splits created when only one household member exists

## Test Strategy
All tests mock InstantDB (`db.queryOnce`, `db.transact`, `db.tx`) and focus on verifying
the business logic chain rather than database persistence. This approach:
- Runs fast (no network or database)
- Tests the critical invariants (budget tracking, split math, privacy)
- Catches regressions in the API function chain
