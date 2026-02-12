# Changes: /src/hooks/

## Fixed Files

### useSettlementData.ts (PERF-4)
**Issue**: Aggressive `refetchInterval: 10000` (10s) and low `staleTime: 5000` (5s) causes ~8,640 unnecessary API calls per day per user.

**Changes:**
1. Removed `refetchInterval: 10000` -- settlement data only changes when settlements are created or shared expenses are added, both of which invalidate this query via `queryClient.invalidateQueries()`
2. Increased `staleTime` from `5000` to `60_000` (60s) -- avoids unnecessary refetches on screen focus

**Impact**: Eliminates ~8,640 API calls/day per user. Data freshness maintained via mutation-driven invalidation.

### useHouseholdData.ts (PERF-4)
**Issue**: Aggressive `refetchInterval: 10000` (10s) and low `staleTime: 5000` (5s) causes ~8,640 unnecessary API calls per day per user.

**Changes:**
1. Removed `refetchInterval: 10000` -- household debt changes only after settlement or shared expense mutations
2. Increased `staleTime` from `5000` to `60_000` (60s)

**Impact**: Eliminates ~8,640 API calls/day per user.

### useDashboardData.ts (PERF-4)
**Issue**: `useDashboardData.balanceQuery` and `useBalanceData` both had `refetchInterval: 5000` (5s), causing ~17,280 unnecessary API calls per day per user per query.

**Changes:**
1. Removed `refetchInterval: 5000` from `balanceQuery` in `useDashboardData()`
2. Added `staleTime: 30_000` to `balanceQuery` to avoid unnecessary refetches on screen focus
3. Removed `refetchInterval: 5000` from `useBalanceData()`
4. Added `staleTime: 30_000` to `useBalanceData()`

**Impact**: Eliminates ~34,560 API calls/day per user (2 queries x 17,280). Balance is refreshed on demand after transaction/settlement mutations.

## Summary: PERF-4 Polling Removal

| Hook | Old Interval | Old staleTime | New Interval | New staleTime | Calls Saved/Day |
|------|-------------|---------------|-------------|---------------|-----------------|
| useSettlementData | 10s | 5s | none | 60s | ~8,640 |
| useHouseholdData | 10s | 5s | none | 60s | ~8,640 |
| useDashboardData (balance) | 5s | default | none | 30s | ~17,280 |
| useBalanceData | 5s | default | none | 30s | ~17,280 |
| **Total** | | | | | **~51,840** |

All data freshness is maintained via `queryClient.invalidateQueries()` calls in mutation `onSuccess` handlers.
