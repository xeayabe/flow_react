# Flow Codebase Audit Report - Consolidated Findings
**Date:** February 11, 2026
**Auditors:** 4 specialized agents (Security, Data Integrity, Code Quality, Testing)
**Codebase:** Flow iOS Budgeting App (React Native/Expo/TypeScript/InstantDB)

---

## Executive Summary

| Metric | Value |
|--------|-------|
| **Total Issues Found** | 105 |
| **Critical** | 14 |
| **High** | 30 |
| **Medium** | 35 |
| **Low** | 26 |
| **Estimated Total Remediation** | ~642 hours (~16 developer-weeks) |
| **Test Coverage** | <5% (target: 60% overall, 80% utils) |
| **Console.log Statements** | 462 (many leak sensitive data) |
| **`any` Type Usages** | 226+ instances |
| **Unscoped DB Queries (Privacy Breach)** | 5 confirmed |

---

## Cross-Agent Critical Findings (Must Fix Immediately)

These issues were independently flagged by multiple agents, confirming highest severity:

### 1. Unscoped Database Queries - PRIVACY BREACH
**Agents:** Security (SEC-001/002/006), Data Integrity (DAT-011)
**Severity:** CRITICAL
**Files:** `src/lib/settlement-api.ts:334-336,273-275,449-450`, `src/lib/shared-expenses-api.ts:217`

Queries returning ALL accounts and ALL splits across ALL users/households with no `userId` or `householdId` filter. A user can see every other user's financial data.

```
settlement-api.ts:335  -> accounts: {}           // ALL accounts in DB
settlement-api.ts:273  -> shared_expense_splits: {} // ALL splits in DB
settlement-api.ts:449  -> shared_expense_splits: {} // ALL splits in DB
shared-expenses-api.ts:217 -> shared_expense_splits: {} // ALL splits
```

**Fix:** Add `$: { where: { householdId } }` to every query. **Est: 4h**

---

### 2. Settlement Workflow Non-Atomic (Data Corruption Risk)
**Agents:** Data Integrity (DAT-003), Security (SEC-018)
**Severity:** CRITICAL
**File:** `src/lib/settlement-api.ts:354-635`

Settlement uses 7+ separate `db.transact()` calls. If any intermediate call fails, the settlement is partially complete: splits may be marked paid but account balances not updated, or vice versa.

**Fix:** Consolidate into a single `db.transact()` call. **Est: 6h**

---

### 3. Transaction-Budget Atomicity Gap
**Agents:** Data Integrity (DAT-002), Code Quality (CQP-005)
**Severity:** CRITICAL
**File:** `src/lib/transactions-api.ts:121-174`

Transaction + account balance update is atomic, but the subsequent budget `spentAmount` update is a separate call. If it fails, the transaction exists but the budget is stale.

**Fix:** Include budget update in the same `db.transact()` call. **Est: 4h**

---

### 4. 462 Console.log Statements Leaking Sensitive Data
**Agents:** Security (SEC-003), Code Quality (CQP-003)
**Severity:** CRITICAL
**Files:** All `*-api.ts` files, especially `settlement-api.ts` (54), `household-members-api.ts` (64), `transactions-api.ts` (52)

User IDs, transaction amounts, account balances, and household IDs logged to console in production. Violates Swiss FADP data minimization.

**Fix:** Wrap in `__DEV__` guards or remove. Create logger utility. **Est: 12h**

---

### 5. Zero Test Coverage on Financial Logic
**Agents:** Testing (TDA-001/002/003), Code Quality (CQP-010)
**Severity:** CRITICAL
**Files:** `src/utils/currency.ts`, `src/utils/dates.ts`, `src/lib/settlement-api.ts`, `src/lib/budget-api.ts`

Only 2 test files exist in the entire codebase. Currency formatting, payday period calculations, split rounding, settlement workflows, and budget allocation have zero automated tests. Bugs in these directly cause incorrect money calculations.

**Fix:** Implement phased test plan (see Phase 3 below). **Est: 75-95h for Phases 1-3**

---

## All Issues by Agent

### Agent 1: Security & Privacy (30 issues | ~61h)

| ID | Severity | Summary |
|----|----------|---------|
| SEC-001 | **CRITICAL** | Unscoped accounts query in settlement-api.ts |
| SEC-002 | **CRITICAL** | Unscoped splits query in settlement-api.ts |
| SEC-003 | **CRITICAL** | Sensitive financial data in 462 console.log statements |
| SEC-004 | **HIGH** | Auth error messages reveal implementation details |
| SEC-005 | **HIGH** | Currency parsing without bounds checking |
| SEC-006 | **HIGH** | Unscoped debt balance calculation in shared-expenses-api |
| SEC-007 | **HIGH** | In-memory rate limiting lost on app restart |
| SEC-008 | **HIGH** | Unscoped user query in getHouseholdTransactionsWithCreators |
| SEC-009 | **HIGH** | Missing userId validation in transaction creation |
| SEC-010 | **HIGH** | Missing userId scope in account default-setting |
| SEC-011 | **HIGH** | No validation of settlement amount |
| SEC-012 | **HIGH** | No verification settlement participants share household |
| SEC-013 | **HIGH** | Insufficient date validation range |
| SEC-014 | **MEDIUM** | Email stored in SecureStore for biometric login |
| SEC-015 | **MEDIUM** | Generic error object access without null checks |
| SEC-016 | **MEDIUM** | Plaintext email logged to console |
| SEC-017 | **MEDIUM** | CSV import no file size validation |
| SEC-018 | **MEDIUM** | Multiple DB queries without transaction isolation |
| SEC-019 | **MEDIUM** | Unchecked type assertion on error objects |
| SEC-020 | **MEDIUM** | Missing auth check in getHouseholdMembers |
| SEC-021 | **MEDIUM** | Admin privilege not verified before settlement |
| SEC-022 | **MEDIUM** | Payee/note fields not sanitized or length-capped |
| SEC-023 | **MEDIUM** | No FADP right-to-be-forgotten mechanism |
| SEC-024 | **MEDIUM** | Detailed settlement IDs in console logs |
| SEC-025 | **LOW** | Magic string hardcoding for split rounding |
| SEC-026 | **LOW** | No input validation tests |
| SEC-027 | **LOW** | Complex settlement logic underdocumented |
| SEC-028 | **LOW** | Rate limit constants hardcoded |
| SEC-029 | **LOW** | Inconsistent error handling patterns |
| SEC-030 | -- | *(Numbering reserved)* |

### Agent 2: Data Integrity & Reliability (20 issues | ~46h)

| ID | Severity | Summary |
|----|----------|---------|
| DAT-001 | **CRITICAL** | budgetSummary sorts by non-existent `periodStart` field |
| DAT-002 | **CRITICAL** | Transaction + budget update not atomic |
| DAT-003 | **CRITICAL** | Settlement workflow uses 7+ separate transactions |
| DAT-004 | **HIGH** | Split rounding doesn't allocate remainder (lost cents) |
| DAT-005 | **HIGH** | Budget save: summary + budgets in separate transactions |
| DAT-008 | **HIGH** | Null/undefined safety: account.balance accessed without guard |
| DAT-009 | **HIGH** | Category deletion doesn't cascade to transactions/budgets |
| DAT-011 | **HIGH** | Unscoped queries return all users' data (overlaps SEC-001/002) |
| DAT-014 | **HIGH** | Settlement allows negative account balances without validation |
| DAT-017 | **HIGH** | No offline handling or retry mechanisms |
| DAT-006 | **MEDIUM** | Division by zero in applyEqualSplit with empty groups |
| DAT-007 | **MEDIUM** | Floating-point accumulation in debt calculations |
| DAT-010 | **MEDIUM** | Payday edge cases (leap year, -1) untested |
| DAT-012 | **MEDIUM** | Recurring template day 31 on short months |
| DAT-013 | **MEDIUM** | Budget reset doesn't verify post-transaction state |
| DAT-016 | **MEDIUM** | Error boundary coverage incomplete |
| DAT-018 | **MEDIUM** | Hardcoded paydayDay=25 default without user knowledge |
| DAT-019 | **MEDIUM** | Settlement creates transaction typed as 'expense' (budget skew) |
| DAT-020 | **MEDIUM** | Payee mappings orphaned when category deleted |
| DAT-015 | **LOW** | Budget allocation tolerance undocumented |

### Agent 3: Code Quality & Performance (43 issues | ~408h)

| ID | Severity | Summary |
|----|----------|---------|
| CQP-001 | **CRITICAL** | 226+ `any` type usages across codebase |
| CQP-003 | **CRITICAL** | 462 console.log statements (overlaps SEC-003) |
| CQP-006 | **CRITICAL** | Circular dependency: transactions-api <-> budget-api |
| CQP-010 | **CRITICAL** | <5% test coverage (overlaps TDA-001) |
| CQP-002 | **HIGH** | 30+ @ts-ignore without explanatory comments |
| CQP-004 | **HIGH** | Validation logic duplicated across add/edit screens |
| CQP-005 | **HIGH** | 12 files >600 lines; 5 files >900 lines |
| CQP-007 | **HIGH** | Missing React.memo on list item components |
| CQP-008 | **HIGH** | 108+ production dependencies, potential bloat |
| CQP-011 | **HIGH** | API responses cast to `any`, defeating type safety |
| CQP-017 | **HIGH** | 34+ `as` assertions without justification |
| CQP-018 | **HIGH** | Functions with `any` return types |
| CQP-019 | **HIGH** | Unsafe object access in financial calculations |
| CQP-021 | **HIGH** | 7+ interdependent useQuery calls in single component |
| CQP-023 | **HIGH** | Missing Zod input validation on forms |
| CQP-035 | **HIGH** | Search/filter triggers on every keystroke (no debounce) |
| CQP-036 | **HIGH** | 7+ levels of nesting in budget allocation rendering |
| CQP-042 | **HIGH** | Settlement modal: 440 lines handling 4 concerns |
| CQP-009 | **MEDIUM** | Dead code: composite-queries_old.ts |
| CQP-012 | **MEDIUM** | Missing error boundaries on route screens |
| CQP-013 | **MEDIUM** | No Jest coverage thresholds enforced |
| CQP-015 | **MEDIUM** | Zustand imported but unused; state management inconsistent |
| CQP-016 | **MEDIUM** | No bundle size budget or tree-shaking verification |
| CQP-020 | **MEDIUM** | Payee handling logic duplicated across 3 files |
| CQP-022 | **MEDIUM** | Hardcoded magic numbers throughout |
| CQP-024 | **MEDIUM** | Inconsistent error response format across APIs |
| CQP-027 | **MEDIUM** | Non-critical checks run on every app boot |
| CQP-029 | **MEDIUM** | Potentially unused dependencies |
| CQP-031 | **MEDIUM** | N+1 query pattern in settlement calculations |
| CQP-034 | **MEDIUM** | Missing Suspense boundaries for loading states |
| CQP-037 | **MEDIUM** | Recurring template logic scattered in component |
| CQP-039 | **MEDIUM** | Inconsistent unknown vs any usage |
| CQP-040 | **MEDIUM** | Date strings lack branded type safety |
| CQP-041 | **MEDIUM** | Animated scroll handler on every frame |
| CQP-043 | **MEDIUM** | No retry logic on API mutations |
| CQP-014 | **LOW** | Commented-out code blocks |
| CQP-025 | **LOW** | Possible missing stable keyExtractor in lists |
| CQP-026 | **LOW** | Stray comments in GlassCard.tsx |
| CQP-028 | **LOW** | Potential query subscription leaks |
| CQP-030 | **LOW** | Possible inconsistent currency formatting calls |
| CQP-032 | **LOW** | Modal components may not clean up listeners |
| CQP-033 | **LOW** | No accessibility audit performed |
| CQP-038 | **LOW** | Error messages non-actionable for users |

### Agent 4: Testing & Documentation (12 issues | ~127h)

| ID | Severity | Summary |
|----|----------|---------|
| TDA-001 | **CRITICAL** | No tests for financial utilities (currency, dates, splits) |
| TDA-002 | **CRITICAL** | No integration tests for critical user flows |
| TDA-003 | **CRITICAL** | No component tests for key screens |
| TDA-004 | **HIGH** | InstantDB mock strategy incomplete |
| TDA-005 | **HIGH** | No edge case testing for financial calculations |
| TDA-006 | **HIGH** | Schema docs may be out of sync with db.ts |
| TDA-007 | **HIGH** | User story completion unverified |
| TDA-008 | **MEDIUM** | CLAUDE.md pattern accuracy unverified |
| TDA-009 | **MEDIUM** | Jest collectCoverageFrom excludes /src/app/ |
| TDA-010 | **HIGH** | Zero API function test coverage |
| TDA-011 | **MEDIUM** | No schema migration tests |
| TDA-012 | **LOW** | No accessibility testing setup |

---

## Consolidated Remediation Roadmap

### PHASE 0: Emergency Fixes (Week 1) - ~26h
*Privacy breaches and data corruption risks that could affect live users*

| Priority | Issues | Action | Hours |
|----------|--------|--------|-------|
| P0.1 | SEC-001, SEC-002, SEC-006, DAT-011 | Add userId/householdId scoping to all unscoped queries | 4 |
| P0.2 | DAT-003, SEC-018 | Consolidate settlement workflow into single atomic transaction | 6 |
| P0.3 | DAT-002, DAT-005 | Make transaction+budget and summary+budget updates atomic | 6 |
| P0.4 | SEC-003, CQP-003 | Wrap all 462 console.log in `__DEV__` guards (automated) | 4 |
| P0.5 | DAT-001 | Fix budgetSummary sort by non-existent periodStart field | 2 |
| P0.6 | SEC-009, SEC-010, SEC-012 | Add authorization checks for transaction/account/settlement | 4 |

### PHASE 1: Security Hardening (Weeks 2-3) - ~30h
*Close remaining security gaps and input validation*

| Priority | Issues | Action | Hours |
|----------|--------|--------|-------|
| P1.1 | SEC-005, SEC-011, SEC-013 | Add bounds validation for amounts, dates, settlement values | 4 |
| P1.2 | SEC-007 | Implement persistent rate limiting (not in-memory) | 3 |
| P1.3 | SEC-020, SEC-021 | Add household membership and admin role verification | 2 |
| P1.4 | SEC-022, CQP-023 | Add input sanitization and Zod validation on all forms | 10 |
| P1.5 | DAT-004 | Fix split rounding: last split absorbs remainder | 3 |
| P1.6 | DAT-008, CQP-019 | Add null guards before all financial arithmetic | 4 |
| P1.7 | DAT-014 | Add balance validation before settlement execution | 2 |
| P1.8 | SEC-004 | Generic error messages for auth (no implementation leaks) | 2 |

### PHASE 2: Type Safety & Code Quality (Weeks 3-5) - ~72h
*Establish type safety and reduce technical debt*

| Priority | Issues | Action | Hours |
|----------|--------|--------|-------|
| P2.1 | CQP-006 | Break circular dependency with budget-sync-api.ts | 12 |
| P2.2 | CQP-001, CQP-011, CQP-017, CQP-018 | Replace top 80 critical `any` types with proper interfaces | 30 |
| P2.3 | CQP-002 | Add justification comments to all @ts-ignore | 4 |
| P2.4 | CQP-004 | Extract shared validation into src/lib/validation/ | 10 |
| P2.5 | CQP-005, CQP-042 | Refactor: break settlement-api (380-line fn), budget-api, settlement modal | 16 |

### PHASE 3: Testing Foundation (Weeks 5-9) - ~95h
*Build test coverage for financial-critical code*

| Priority | Issues | Action | Hours |
|----------|--------|--------|-------|
| P3.1 | TDA-001, TDA-005 | Unit tests: currency.ts, dates.ts, splits, budget-allocation | 18 |
| P3.2 | TDA-004 | Enhance InstantDB mocks in setupTests.ts | 6 |
| P3.3 | TDA-010 | Unit tests: transactions-api, budget-api, settlement-api | 35 |
| P3.4 | TDA-002 | Integration tests: add-transaction flow, budget allocation, settlement | 18 |
| P3.5 | TDA-003 | Component tests: Dashboard, Budget, Settlement screens | 18 |

### PHASE 4: Performance & Polish (Weeks 9-12) - ~60h
*Optimize runtime performance and developer experience*

| Priority | Issues | Action | Hours |
|----------|--------|--------|-------|
| P4.1 | CQP-007, CQP-035 | React.memo on list items + debounce search/filter | 10 |
| P4.2 | CQP-021, CQP-036, CQP-037 | Extract custom hooks for complex screen data | 14 |
| P4.3 | CQP-008, CQP-029 | Dependency audit: remove unused packages | 8 |
| P4.4 | CQP-027 | Defer non-critical startup checks | 6 |
| P4.5 | DAT-017, CQP-043 | Implement offline handling + retry with exponential backoff | 10 |
| P4.6 | CQP-009, CQP-014 | Remove dead code, commented blocks, unused exports | 6 |
| P4.7 | CQP-034, DAT-016 | Add Suspense boundaries and error boundary coverage | 6 |

### PHASE 5: Compliance & Long-term (Weeks 12+) - ~40h

| Priority | Issues | Action | Hours |
|----------|--------|--------|-------|
| P5.1 | SEC-023 | Implement FADP right-to-be-forgotten (data export + deletion) | 8 |
| P5.2 | DAT-019 | Fix settlement transaction type (not 'expense') | 2 |
| P5.3 | DAT-009, DAT-020 | Implement cascade handling for category/payee deletion | 6 |
| P5.4 | TDA-006, TDA-007 | Full documentation sync: technical-specs vs db.ts, user story audit | 8 |
| P5.5 | CQP-015 | Consolidate state management (TanStack Query + Zustand or Context) | 12 |
| P5.6 | CQP-033, TDA-012 | Accessibility audit and a11y testing | 4 |

---

## Effort Summary by Phase

| Phase | Focus | Hours | Weeks | Cumulative |
|-------|-------|-------|-------|------------|
| **Phase 0** | Emergency Fixes | 26h | 1 | 1 |
| **Phase 1** | Security Hardening | 30h | 2 | 3 |
| **Phase 2** | Type Safety & Code Quality | 72h | 2.5 | 5.5 |
| **Phase 3** | Testing Foundation | 95h | 4 | 9.5 |
| **Phase 4** | Performance & Polish | 60h | 2.5 | 12 |
| **Phase 5** | Compliance & Long-term | 40h | 2 | 14 |
| **TOTAL** | | **323h** | **14 weeks** | |

*Note: ~323h of de-duplicated, prioritized work (down from raw ~642h across all agents due to overlapping findings).*

---

## Risk Matrix

```
              Low Impact          High Impact
            +------------------+------------------+
 Likely     | CQP-014 Dead     | SEC-001/002      |
            | code, CQP-025    | Unscoped queries |
            | key extractors   | DAT-003 Non-     |
            |                  | atomic settlement|
            +------------------+------------------+
 Unlikely   | CQP-032 Modal    | SEC-007 Rate     |
            | cleanup, CQP-028 | limit bypass     |
            | subscriptions    | SEC-023 FADP     |
            |                  | compliance gap   |
            +------------------+------------------+
```

---

## Key Metrics to Track

| Metric | Current | Phase 1 Target | Phase 3 Target | Phase 5 Target |
|--------|---------|---------------|----------------|----------------|
| Unscoped queries | 5 | 0 | 0 | 0 |
| Console.log (prod) | 462 | 0 | 0 | 0 |
| `any` types | 226+ | 150 | 80 | <20 |
| Test coverage | <5% | 10% | 60% | 80% |
| Non-atomic multi-ops | 4 | 0 | 0 | 0 |
| Files >600 lines | 12 | 10 | 6 | 3 |

---

*Report generated by 4-agent parallel audit on February 11, 2026.*
*Agents: Security & Privacy, Data Integrity & Reliability, Code Quality & Performance, Testing & Documentation.*
