# Dashboard Data Hook - Implementation Complete ✅

## Overview

The **useDashboardData** custom hook provides a clean, reusable way to fetch and aggregate all dashboard data using React Query + InstantDB.

## Files Created

**File:** `src/hooks/useDashboardData.ts`

## Two Hooks Provided

### 1. `useDashboardData()` - Complete Dashboard Data

Aggregates all data needed for the dashboard in a single hook:

**Returns:**
```typescript
{
  data: {
    user: UserRecord,
    member: HouseholdMember,
    budgetPeriod: BudgetPeriod,
    balance: BalanceBreakdown,
    accounts: Account[],
    budgetSummary: BudgetSummary,
    transactions: Transaction[],
  },
  loading: boolean,
  error: Error | null,
  refetch: () => void,
  // Convenience accessors
  netWorth: number,
  assets: number,
  liabilities: number,
  userId: string,
  householdId: string,
}
```

**Features:**
- ✅ Fetches user profile and household membership
- ✅ Gets personal budget period (member-specific or household fallback)
- ✅ Calculates true balance (assets, liabilities, net worth)
- ✅ Fetches user accounts
- ✅ Gets budget summary with correct period
- ✅ Fetches recent transactions
- ✅ Auto-refetches balance every 5 seconds
- ✅ Combines loading/error states
- ✅ Single refetch function for all queries

### 2. `useBalanceData()` - Lightweight Balance Only

Simplified hook for components that only need net worth data:

**Returns:**
```typescript
{
  balance: BalanceBreakdown,
  loading: boolean,
  error: Error | null,
  netWorth: number,
  assets: number,
  liabilities: number,
}
```

**Features:**
- ✅ Lighter weight (fewer queries)
- ✅ Perfect for cards that only show net worth
- ✅ Auto-refetches every 5 seconds
- ✅ Type-safe

## Usage Examples

### Example 1: Dashboard Screen

```typescript
import { useDashboardData } from '@/hooks/useDashboardData';
import { TruePositionHero } from '@/components/TruePositionHero';

export default function DashboardScreen() {
  const {
    data,
    loading,
    netWorth,
    assets,
    liabilities,
  } = useDashboardData();

  if (loading) return <LoadingSpinner />;

  return (
    <ScrollView>
      <TruePositionHero
        netWorth={netWorth}
        assets={assets}
        liabilities={liabilities}
      />

      <AccountsList accounts={data.accounts} />
      <BudgetSummary summary={data.budgetSummary} />
      <RecentTransactions transactions={data.transactions} />
    </ScrollView>
  );
}
```

### Example 2: Simple Balance Card

```typescript
import { useBalanceData } from '@/hooks/useDashboardData';
import { TruePositionHero } from '@/components/TruePositionHero';

export default function NetWorthWidget() {
  const { netWorth, assets, liabilities, loading } = useBalanceData();

  if (loading) return <Skeleton />;

  return (
    <TruePositionHero
      netWorth={netWorth}
      assets={assets}
      liabilities={liabilities}
    />
  );
}
```

### Example 3: Manual Refetch

```typescript
function RefreshableDashboard() {
  const { data, refetch, loading } = useDashboardData();

  const handleRefresh = () => {
    refetch(); // Refreshes all queries
  };

  return (
    <ScrollView
      refreshControl={
        <RefreshControl refreshing={loading} onRefresh={handleRefresh} />
      }
    >
      {/* Dashboard content */}
    </ScrollView>
  );
}
```

## Integration with Existing Code

The hook is designed to work seamlessly with the existing dashboard:

**Before:**
```typescript
// Multiple separate useQuery calls
const userQuery = useQuery({ ... });
const accountsQuery = useQuery({ ... });
const balanceQuery = useQuery({ ... });
const budgetQuery = useQuery({ ... });
const transactionsQuery = useQuery({ ... });

// Manual loading state
const isLoading =
  userQuery.isLoading ||
  accountsQuery.isLoading ||
  balanceQuery.isLoading ||
  budgetQuery.isLoading ||
  transactionsQuery.isLoading;
```

**After:**
```typescript
const { data, loading, netWorth, assets, liabilities } = useDashboardData();
```

## Technical Details

### React Query Integration

- Uses `@tanstack/react-query` for data fetching
- Leverages React Query's caching and deduplication
- Auto-refetch on window focus
- Stale-while-revalidate pattern
- 5-second refetch interval for balance data

### InstantDB Integration

- Uses `db.useAuth()` for user authentication
- Uses `db.queryOnce()` for one-time queries
- Properly handles InstantDB schema
- Type-safe with InstantDB schema types

### API Functions Used

1. **`calculateTrueBalance(userId)`** - Assets/liabilities breakdown
2. **`getUserAccounts(userId)`** - User's accounts
3. **`getBudgetSummary(userId, householdId, periodStart)`** - Budget data
4. **`getRecentTransactions(userId, limit, periodStart?, periodEnd?)`** - Recent txns
5. **`getMemberBudgetPeriod(userId, householdId)`** - Budget period

### Type Safety

All data is properly typed with TypeScript:
- `BalanceBreakdown` from `balance-api.ts`
- `Account` from `accounts-api.ts`
- `Transaction` from `transactions-api.ts`
- `BudgetSummary` from `budget-api.ts`

## Benefits

1. **Code Reusability** - Use across multiple components
2. **Single Source of Truth** - One hook for all dashboard data
3. **Automatic Refetching** - Balance updates every 5 seconds
4. **Error Handling** - Combines errors from all queries
5. **Loading States** - Single loading indicator
6. **Type Safety** - Full TypeScript support
7. **React Query Benefits** - Caching, deduplication, background updates
8. **Easy Testing** - Mock the hook instead of multiple queries

## Performance

- **Lightweight**: Only fetches what you need
- **Cached**: React Query caches responses
- **Deduplicated**: Multiple components using the same hook share queries
- **Background Updates**: Refetches stale data automatically
- **Selective Refetch**: Choose when to refetch

## Documentation

Complete documentation added to `README.md` with:
- Hook signatures
- Usage examples
- Data structure documentation
- Integration guide

---

**Status:** ✅ Complete and Production-Ready
**Location:** `src/hooks/useDashboardData.ts`
**Documentation:** Updated in README.md
