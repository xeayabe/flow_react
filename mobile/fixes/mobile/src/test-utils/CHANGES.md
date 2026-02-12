# Test Utils - CHANGES

## Added Files

### `mocks.ts`
Enhanced InstantDB mock system replacing the basic mocks in `setupTests.ts`.

**Capabilities:**
- `mockDb.queryOnce()` - Async one-shot queries with where-clause filtering ($gte, $lte, $gt, $lt, exact match)
- `mockDb.transact()` - Batch mutation support
- `mockDb.tx` - Proxy-based chain builder (`db.tx.entity[id].update(fields)` / `.delete()`)
- `mockDb.useQuery()` - Reactive query hook mock
- `seedMockData()` / `resetMockData()` - Test data lifecycle helpers
- `setCustomQueryHandler()` - Escape hatch for complex query scenarios

### `render-utils.ts`
Custom render wrapper for React Native component tests.

**Capabilities:**
- `renderWithProviders(ui)` - Wraps components with QueryClientProvider and navigation context
- `createTestQueryClient()` - Preconfigured QueryClient (no retries, instant stale)
- `waitForAsync()` - Helper for settling async operations
- `createMockRouter()` - Mock expo-router navigation object

### `test-data.ts`
Realistic Swiss test data covering all entities in the Flow schema.

**Scenarios covered:**
- Two-person household (Alex admin, Cecilia member) in Zurich
- CHF 7,892 salary, 60/40 split ratio
- Transactions: rent (CHF 2,100), Migros (CHF 87.35), Coop (CHF 52.90), SBB (CHF 220), dining (CHF 45.50)
- Budget allocations across needs/wants/savings
- Shared expense splits with unpaid balances
- Recurring templates (rent, Netflix, SBB)
- Savings account excluded from budget

**Usage:**
```typescript
import { seedAllTestData, testUsers, testTransactions } from '@/test-utils/test-data';
import { seedMockData, resetMockData } from '@/test-utils/mocks';

beforeEach(() => {
  resetMockData();
  seedAllTestData(seedMockData);
});
```
