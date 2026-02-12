# Documentation Audit - CHANGES

## Audit Date: February 12, 2026

Comparison of actual codebase (`mobile/src/lib/db.ts`) against documentation
(`technical-specs.md`, `project-plan.md`, `User-stories.md`, `CLAUDE.md`).

---

## 1. Schema Mismatches: `db.ts` vs `technical-specs.md`

### 1.1 `settlements` entity - Missing fields in db.ts

**technical-specs.md** documents these fields:
```
payerAccountId: string;    // Account debited
receiverAccountId: string; // Account credited
```

**db.ts** does NOT have `payerAccountId` or `receiverAccountId` fields in the `settlements` entity.

Instead, `db.ts` has:
```typescript
settlements: i.entity({
  householdId: i.string(),
  payerUserId: i.string(),
  receiverUserId: i.string(),
  amount: i.number(),
  paymentMethod: i.string().optional(),
  categoryId: i.string().optional(),        // NOT in technical-specs
  note: i.string().optional(),
  settledExpenses: i.json().optional(),      // NOT in technical-specs
  settledAt: i.number(),
  createdAt: i.number().optional(),
})
```

**Discrepancies:**
- `payerAccountId` and `receiverAccountId` are in docs but NOT in schema
- `paymentMethod` is in schema but NOT in docs (as a field; docs mention it conceptually)
- `categoryId` is in schema but NOT in docs
- `settledExpenses` (JSON array of transaction IDs) is in schema but NOT in docs

**Impact:** MEDIUM. The `createSettlement` function accepts account IDs as parameters but does not store them in the settlements table. The actual account balance updates happen via `db.tx.accounts[id].update()`. The docs suggest they are persisted on the settlement record.

---

### 1.2 `shared_expense_splits` entity - Extra fields in docs

**technical-specs.md** documents:
```
paidAt?: number;     // OPTIONAL - Settlement timestamp
createdAt: number;   // When split was created
```

**db.ts** does NOT have `paidAt` or `createdAt` fields on `shared_expense_splits`.

**Impact:** LOW. The `paidAt` field is never written to in the codebase. The `isPaid` boolean is used instead.

---

### 1.3 `budgetSummary` entity - Extra field in docs

**technical-specs.md** documents:
```
isActive?: boolean;  // OPTIONAL - Current budget summary
```

**db.ts** does NOT have `isActive` on `budgetSummary`.

**Impact:** LOW. The code queries by `userId` only, not `isActive`.

---

### 1.4 `recurringTemplates` entity - Missing field in docs

**technical-specs.md** documents a `name` field:
```
name: string;        // e.g., "Rent", "Netflix"
```

**db.ts** does NOT have a `name` field on `recurringTemplates`.

But `db.ts` has `lastCreatedDate` which is NOT in the docs.

**Impact:** LOW. The `payee` field is used instead of `name` in practice.

---

### 1.5 `users` entity - Missing `createdAt` in docs example

**technical-specs.md** correctly documents `createdAt: number` for users.
This matches `db.ts`. No mismatch here.

---

### 1.6 `transactions` entity - Missing `isRecurring` and `recurringDay` in db.ts

**transactions-api.ts** interface includes:
```typescript
isRecurring: boolean;
recurringDay?: number;
```

But **db.ts** does NOT define `isRecurring` or `recurringDay` fields on the `transactions` entity.

**Impact:** MEDIUM. These fields may be written by the API but are not enforced in the schema. InstantDB may store them as untyped fields.

---

## 2. Wrong Year in `project-plan.md`

Multiple references to 2025 that should be 2026:

| Line | Text | Should Be |
|------|------|-----------|
| 1195 | `new Date('2025-02-08')` | `2026-02-08` |
| 1198 | `new Date('2025-01-25')` | `2026-01-25` |
| 1199 | `new Date('2025-02-24')` | `2026-02-24` |
| 1204 | `new Date('2025-02-08')` | `2026-02-08` |
| 1207 | `new Date('2025-02-01')` | `2026-02-01` |
| 1208 | `new Date('2025-02-28')` | `2026-02-28` |
| 1299 | "Mid-February 2025" | "Mid-February 2026" |
| 1339 | "End of March 2025" | "End of March 2026" |
| 1343 | "Q3-Q4 2025" | "Q3-Q4 2026" |
| 1345 | "Q2 2025" | "Q2 2026" |
| 1351 | "Q3 2025" | "Q3 2026" |
| 1358 | "Q4 2025" | "Q4 2026" |
| 1523 | "March 2025" | "March 2026" |
| 1530 | "Q4 2025" | "Q4 2026" |
| 1615 | "March 2025" | "March 2026" |

**Impact:** HIGH for planning clarity. All milestone dates reference a year that has already passed.

---

## 3. `CLAUDE.md` vs Actual Codebase

### 3.1 Currency Format Mismatch

**CLAUDE.md** states:
```
"CHF" prefix with space: CHF 1'234.56
Negative sign after currency: CHF -123.45
```

**Actual `formatCurrency.ts`** uses CHF as a SUFFIX:
```
1'234.56 CHF      (not "CHF 1'234.56")
-1'234.56 CHF     (not "CHF -1'234.56")
```

**Impact:** HIGH for development guidance. CLAUDE.md instructs developers to use `CHF` as a prefix, but the actual implementation uses it as a suffix. Any new code following CLAUDE.md would produce inconsistent formatting.

---

### 3.2 File Location Mismatches

**CLAUDE.md** references:
- `/src/utils/currency.ts` for currency formatting
- `/src/utils/dates.ts` for payday period calculations
- `/src/lib/*-api.ts` for API functions

**Actual locations:**
- Currency formatter: `/src/lib/formatCurrency.ts` (not `/src/utils/currency.ts`)
- Payday utils: `/src/lib/payday-utils.ts` (not `/src/utils/dates.ts`)
- Budget period utils: `/src/lib/budget-period-utils.ts` (additional file not mentioned in CLAUDE.md)
- Design tokens: `/src/lib/design-tokens.ts` (not `/src/constants/colors.ts`)

**Impact:** MEDIUM. Developers following CLAUDE.md would look in the wrong directories.

---

### 3.3 Function Name Mismatch

**CLAUDE.md** references:
```typescript
calculateCurrentPeriod(paydayDay, today)
```

**Actual function names:**
- `calculateBudgetPeriod(paydayDay, today)` in `payday-utils.ts`
- `getCurrentBudgetPeriod(paydayDay, today)` in `budget-period-utils.ts`

There is no function called `calculateCurrentPeriod` in the codebase.

**Impact:** HIGH. Direct copy-paste from CLAUDE.md will produce import errors.

---

### 3.4 Design Token Location

**CLAUDE.md** references:
```typescript
import { colors } from '@/constants/colors';
```

**Actual:**
```typescript
import { colors } from '@/lib/design-tokens';
```

There is no `/src/constants/colors.ts` file. The design tokens live in `/src/lib/design-tokens.ts`.

**Impact:** MEDIUM. Import paths would fail.

---

## 4. `technical-specs.md` Internal Inconsistencies

### 4.1 File Structure vs Reality

The documented file structure shows:
```
├── lib/
│   ├── budgets-api.ts       # Listed in docs
```

**Actual file:** `budget-api.ts` (singular, no 's')

Other filename discrepancies:
- Docs: `wallets-api.ts` -> Actual: `accounts-api.ts` (wallets are called "accounts" in the schema)
- Docs: `recurring-api.ts` -> Actual: Not found (recurring template logic may be inline)
- Docs: `income-api.ts` -> Actual: Not found (Phase 2 feature, not yet implemented)

---

### 4.2 Settlements Table Documentation

**technical-specs.md** documents settlements as:
> Settlements are NOT visible in transaction list
> DO NOT affect budget spent amounts

**Actual `createSettlement` in `settlement-api.ts`:**
- DOES create a payer transaction (lines 393-419): `db.tx.transactions[payerTransactionId].update(...)`
- This means settlements DO appear in the transaction list for the payer
- This contradicts the documented behavior

**Impact:** HIGH. The implementation diverged from the specification.

---

## 5. `User-stories.md` Status Check

The file header claims:
```
Total Stories: 69 Active
Original Stories: 60 (9 removed, 9 added = 60 active)
New Phase 2 Stories: 9 (US-061 through US-069)
```

Math discrepancy: 60 active + 9 new = 69 total (header says 69, body says 60 active).
The badge says "69 Active" but the text says "60 active". This is internally inconsistent.

---

## 6. Summary of Recommended Fixes

### Critical (should fix immediately):
1. Update `CLAUDE.md` currency format documentation to match actual suffix format (`1'234.56 CHF`)
2. Update `CLAUDE.md` function name from `calculateCurrentPeriod` to `calculateBudgetPeriod` / `getCurrentBudgetPeriod`
3. Update all 2025 dates in `project-plan.md` to 2026
4. Update file location references in `CLAUDE.md` to match actual paths

### Important (fix soon):
5. Update `technical-specs.md` settlements entity to match `db.ts` (remove payerAccountId/receiverAccountId, add paymentMethod/categoryId/settledExpenses)
6. Resolve settlements behavior: either update docs to reflect that settlements DO create payer transactions, or fix the code to match the "no transaction" specification
7. Add `budget-period-utils.ts` to documentation (it's a critical file not mentioned in CLAUDE.md)

### Low Priority:
8. Remove `paidAt` and `createdAt` from `shared_expense_splits` documentation (not in schema)
9. Fix user story count math in `User-stories.md`
10. Add `lastCreatedDate` field to recurringTemplates documentation
