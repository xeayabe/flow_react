# Changes: /src/components/

## Fixed Files

### transactions/TransactionListItem.tsx (PERF-2)
**Issue**: TransactionListItem was NOT wrapped in `React.memo`, causing every item in the transaction list to re-render whenever any sibling transaction updates or the parent re-renders.

**Changes:**
1. Wrapped component in `React.memo` with custom equality check `arePropsEqual`
2. Custom equality compares transaction data fields (id, type, amount, payee, categoryName, walletName, emoji, isShared) and callback references
3. Renamed inner component to `TransactionListItemInner`, exported memoized version as default

**Impact**: In a list of 100 transactions, editing one transaction previously caused all 100 to re-render. Now only the affected item re-renders. Critical for scroll performance.

### DebtBalanceWidget.tsx (PERF-4)
**Issue**: `refetchInterval: 5000` causing ~17,280 unnecessary API calls per day.

**Changes:**
1. Removed `refetchInterval: 5000` from debt balance query
2. Added `staleTime: 60_000` (60s) to avoid unnecessary refetches on screen focus
3. Removed excessive `console.log` debug statements from production code

**Impact**: Eliminates ~17,280 API calls/day per user.

### TrueBalanceWidget.tsx (PERF-4)
**Issue**: `refetchInterval: 5000` causing ~17,280 unnecessary API calls per day.

**Changes:**
1. Removed `refetchInterval: 5000` from balance query
2. Added `staleTime: 30_000` (30s)

**Impact**: Eliminates ~17,280 API calls/day per user.

### ErrorBoundary.tsx (TASK 2)
**Issue**: ErrorBoundary uses hardcoded colors throughout instead of design tokens.

**Changes:**
1. Added `import { colors } from '@/lib/design-tokens'`
2. Background `'#006A6A'` -> `colors.contextTeal`
3. Button text color `'#006A6A'` -> `colors.contextTeal`
4. Icon color on refresh button `'#006A6A'` -> `colors.contextTeal`
5. Icon color `'#FFF'` -> `colors.textWhite`
6. Title text `'#FFFFFF'` -> `colors.textWhite`
7. Subtitle text `'rgba(255, 255, 255, 0.8)'` -> `colors.textWhiteSecondary`
8. Technical details toggle text `'rgba(255, 255, 255, 0.6)'` -> `colors.textWhiteTertiary`
9. Help text `'rgba(255, 255, 255, 0.4)'` -> `colors.textWhiteDisabled`
10. Error detail background `'rgba(255, 255, 255, 0.05)'` -> `colors.glassBorder`
11. Error detail border `'rgba(255, 255, 255, 0.1)'` -> `colors.glassBorder`
12. Error detail text `'rgba(255, 255, 255, 0.8)'` -> `colors.textWhiteSecondary`
13. Stack trace text `'rgba(255, 255, 255, 0.6)'` -> `colors.textWhiteTertiary`
14. Icon ring background `'rgba(255, 255, 255, 0.1)'` -> `colors.glassWhite`
15. Chevron icons color `'rgba(255,255,255,0.6)'` -> `colors.textWhiteTertiary`
16. Added `minHeight: 44, minWidth: 44` to all touchable elements (TASK 7: UX-009)

**Impact**: ErrorBoundary now respects the design system. If design tokens change, the error screen will update automatically.

## Files Scanned for Hardcoded Colors (TASK 3)

### dashboard/BudgetStatusCard.tsx
**Status**: CORRECT - Already imports from `@/lib/design-tokens` and uses `colors.contextSage`, `colors.contextLavender`. No hardcoded colors found except shadowColor `'#000'` which is a standard shadow (acceptable).

### budget/ContextLine.tsx
**Status**: CORRECT - Uses `getBudgetColor()` and `getBudgetStatus()` from `@/lib/getBudgetColor` which correctly implements the 4-tier budget color system. No hardcoded colors.

### budget/BudgetGroupItem.tsx
**Status**: MOSTLY CORRECT - Uses `formatCurrency` from tokens, `ContextLine` for budget colors. Has:
- `shadowColor: '#000'` -- Acceptable (standard shadow)
- Various `'rgba(255, 255, 255, ...)'` values in className and style -- These match token values but are inline. Low priority to tokenize.

### budget/BudgetItem.tsx
**Status**: CORRECT - Same pattern as BudgetGroupItem. No issues.

### TruePositionHero.tsx
**Status**: MOSTLY CORRECT - Imports `colors` from design tokens. Has:
- `LinearGradient colors={['#2C5F5D', '#1e4442']}` -- The first is contextTeal, the second (`#1e4442`) is a darker shade not in tokens. Should add a `contextTealDark` token.
- `borderColor: 'rgba(255, 255, 255, 0.1)'` -- Matches `glassBorder` token value but not imported.
- `shadowColor: '#000'` -- Acceptable.
- `backgroundColor: 'rgba(255, 255, 255, 0.1)'` -- Similar to `glassBorder`, matches existing tokens.

### DashboardWidgets.tsx
**Status**: NEEDS MAJOR REFACTOR - This file is a legacy widget system with extensive light-theme hardcoded colors. Key issues:
1. `text-red-600` used for spending amounts (line 73) -- Should NEVER show red for budget amounts
2. `percentage > 100 ? 'text-red-600' : 'text-gray-600'` (line 76) -- Uses red for over-budget (violates calm design)
3. `'#EF4444'` / `'#F59E0B'` / `'#0D9488'` in BudgetBreakdownWidget (line 295) -- Red/amber/green instead of 4-tier system
4. White/gray theme throughout (`'white'`, `'#F3F4F6'`, `'bg-gray-*'`, `'text-gray-*'`)
5. `bg-red-600` / `bg-green-600` for quick action buttons (lines 418-430)

**Impact**: This appears to be a legacy file that has been replaced by the new dashboard component system (BudgetStatusCard, WalletsCard, RecentTransactionsCard). The main dashboard (`index.tsx`) does NOT use these widgets. Low priority but should be cleaned up or removed.

### TrueBalanceWidget.tsx
**Status**: NEEDS REFACTOR - Legacy widget using light theme:
- `text-gray-500`, `bg-white`, `border-gray-200` throughout
- `text-green-600` for assets (line 68) -- Should use `colors.sageGreen`
- `text-red-600` for liabilities (lines 88, 97) -- Should use `colors.softLavender` or `colors.contextLavender`

**Impact**: This widget appears to be superseded by TruePositionHero. Should be deprecated.

### DebtBalanceWidget.tsx
**Status**: NEEDS REFACTOR - Light theme with problematic colors:
- `text-red-600` for "you owe" amount (line 232) -- Should use `colors.warning` or softer tone
- `bg-red-600` for settle button when you owe (line 235) -- Anxiety-inducing
- `text-green-600` for "they owe" amount (line 245) -- Should use `colors.sageGreen`
- `bg-green-600` for settle button when they owe (line 248)
- White/gray theme throughout

**Impact**: Medium priority. The debt amounts and settle buttons use harsh red which contradicts calm design. Should use `colors.warning` (#E8C5A8) for owe amounts and `colors.contextTeal` for action buttons.

### RecurringExpensesWidget.tsx
**Status**: NEEDS REFACTOR - Uses amber/yellow light theme:
- `bg-amber-50`, `border-amber-200`, `text-amber-900`, etc.
- `bg-teal-600` for Add button
- `color="#D97706"` for icon
- `bg-white` for list items

**Impact**: Low priority. Standalone widget with consistent (but off-brand) amber theme.

## Budget Status Color Verification (TASK 8)

### Screens Verified:

| Screen | Uses 4-Tier System? | Notes |
|---|---|---|
| ContextLine.tsx | YES | Uses `getBudgetColor()` correctly |
| BudgetGroupItem.tsx | YES (via ContextLine) | Delegates to ContextLine |
| BudgetItem.tsx | YES (via ContextLine) | Delegates to ContextLine |
| BudgetStatusCard.tsx | YES | Uses ContextLine for all budget bars |
| budget/index.tsx (ORIGINAL) | NO - USES RED | `getStatusColor()` returns `'#EF4444'` for over-budget. **FIXED** |
| budget/index.tsx (FIXED) | YES | Now uses `getBudgetColor()` - 4-tier system |
| DashboardWidgets.tsx | NO - USES RED | Line 295: `'#EF4444'` for >= 100%. Legacy file, not used on main dashboard |

### Summary:
- The dashboard's BudgetStatusCard correctly uses the 4-tier system via ContextLine
- The budget tab screen (budget/index.tsx) was incorrectly using red -- **NOW FIXED**
- Legacy DashboardWidgets.tsx uses red but is not actively rendered on the dashboard
- No screen should ever show `#EF4444` (red) for budget status
