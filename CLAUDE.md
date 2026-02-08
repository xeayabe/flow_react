# CLAUDE.md
*Development Guidelines for AI-Assisted Development on Flow*

**Project**: Flow - Premium iOS Budgeting App  
**Version**: 2.1  
**Last Updated**: February 8, 2026  
**Target Platform**: iOS (React Native/Expo)

---

## 🎯 Your Role

You are the primary development assistant for Flow. Your job is to write production-quality code that follows established patterns, maintains consistency, and respects the app's architecture. **Always review existing code before writing new code.**

---

## 📋 Pre-Development Checklist

**Before writing ANY code, you MUST:**

1. ✅ **Review the user story** in `user-stories.md` to understand requirements
2. ✅ **Check technical-specs.md** for database schema and architecture patterns
3. ✅ **Search the codebase** for similar existing features (use file search)
4. ✅ **Verify database schema** in `mobile/src/lib/db.ts` (source of truth)
5. ✅ **Check if API functions exist** in `/src/lib/*-api.ts` files
6. ✅ **Review component patterns** in `/src/components/` for reusable UI

**Never assume - always verify against actual code.**

---

## 🏗️ Architecture Principles (CRITICAL)

### 1. Timeless Budgets Architecture ⚠️ MOST IMPORTANT

**NEVER store budget period dates in the database.**

```typescript
// ❌ WRONG - Do NOT add these fields to budgets
budgets: {
  periodStart: string;  // ❌ FORBIDDEN
  periodEnd: string;    // ❌ FORBIDDEN
}

// ✅ CORRECT - Calculate periods dynamically
const period = calculateCurrentPeriod(member.paydayDay, new Date());
const transactions = await db.query({
  transactions: {
    $: { 
      where: { 
        userId,
        date: { $gte: period.periodStart, $lte: period.periodEnd }
      }
    }
  }
});
```

**Why**: Storing period dates breaks when users change their payday. This bug was fixed by making budgets "timeless" and calculating periods on-the-fly.

**Key function** (use this everywhere periods are needed):
```typescript
// Location: src/utils/dates.ts
function calculateCurrentPeriod(paydayDay: number, today: Date): {
  periodStart: string;
  periodEnd: string;
}
```

---

### 2. Privacy-First Database Queries ⚠️ SECURITY CRITICAL

**EVERY database query MUST be scoped to `userId` or `householdId`.**

```typescript
// ✅ CORRECT - Scoped to user
const { data } = db.useQuery({
  transactions: {
    $: { where: { userId: currentUser.id } }
  }
});

// ❌ WRONG - No scope, returns ALL users' data (SECURITY BREACH)
const { data } = db.useQuery({
  transactions: {}
});
```

**Enforcement**: Use ESLint rule to check for missing scopes (see TECH-008 in user-stories.md).

---

### 3. Optimistic Updates Pattern

**All mutations MUST use optimistic updates** (UI updates immediately, sync in background).

```typescript
// ✅ CORRECT Pattern
const addTransactionMutation = useMutation({
  mutationFn: async (newTransaction) => {
    // 1. Update UI immediately (optimistic)
    queryClient.setQueryData(['transactions'], (old) => [...old, newTransaction]);
    
    // 2. Sync to database (background)
    try {
      const result = await db.transact([
        db.tx.transactions[newTransaction.id].update(newTransaction)
      ]);
      return result;
    } catch (error) {
      // 3. Rollback on error
      queryClient.invalidateQueries(['transactions']);
      throw error;
    }
  },
});
```

---

### 4. Settlements Are NOT Transactions ⚠️ IMPORTANT

**Settlements are internal transfers - they do NOT create transactions.**

```typescript
// ✅ CORRECT - Settlement workflow
async function createSettlement(data) {
  // 1. Update account balances (internal transfer)
  await db.transact([
    db.tx.accounts[payerAccountId].update({ balance: payerBalance - amount }),
    db.tx.accounts[receiverAccountId].update({ balance: receiverBalance + amount })
  ]);
  
  // 2. Log in settlements table
  await db.tx.settlements[settlementId].update({ ... });
  
  // 3. Mark splits as paid
  await db.tx.shared_expense_splits[splitId].update({ isPaid: true });
  
  // ❌ DO NOT create a transaction (would affect budget incorrectly)
}
```

**Why**: Settlements don't represent new expenses - they're just balancing accounts. Creating a transaction would double-count spending.

---

### 5. Recurring Templates Are NOT Automatic Transactions

**Templates appear in dashboard widget, user manually activates them.**

```typescript
// ✅ CORRECT - Template creation
async function createRecurringTemplate(data) {
  // Just creates template, no transaction
  await db.tx.recurringTemplates[id].update({
    name: "Rent",
    amount: 1200,
    recurringDay: 1,
    isActive: true
  });
  
  // ❌ DO NOT create a transaction here
}

// User manually activates template from dashboard widget
async function createTransactionFromTemplate(templateId) {
  const template = await getTemplate(templateId);
  await createTransaction({
    ...template,
    date: today,
    createdFromTemplateId: templateId
  });
}
```

---

## 💻 Coding Standards

### TypeScript

- **Strict Mode**: Always enabled, no `any` types without `@ts-ignore` + comment
- **Interfaces over Types**: Use `interface` for object shapes
- **Explicit Return Types**: Always declare return types for functions

```typescript
// ✅ CORRECT
interface Transaction {
  id: string;
  amount: number;
  date: string;
}

async function getTransactions(userId: string): Promise<Transaction[]> {
  // @ts-ignore - InstantDB types not yet aligned with our schema
  const result = await db.queryOnce({ transactions: { ... } });
  return result.data.transactions;
}

// ❌ WRONG
function getTransactions(userId) { // Missing types
  const result = await db.queryOnce({ transactions: { ... } });
  return result.data.transactions;
}
```

---

### React Native / React Patterns

- **Functional Components**: No class components
- **Hooks**: Custom hooks for reusable logic
- **Naming**: `useCamelCase` for hooks, `PascalCase` for components

```typescript
// ✅ CORRECT - Custom hook
export function useTransactions(householdId: string) {
  return db.useQuery({
    transactions: {
      $: { where: { householdId } }
    }
  });
}

// ✅ CORRECT - Component
export function TransactionCard({ transaction }: { transaction: Transaction }) {
  return (
    <GlassCard variant="primary" blur="medium">
      <Text>{transaction.payee}</Text>
    </GlassCard>
  );
}
```

---

### InstantDB Patterns

**Always use schema-based queries:**

```typescript
// ✅ CORRECT - Type-safe query with relationships
const { data } = db.useQuery({
  transactions: {
    $: { where: { userId: currentUser.id } },
    category: {},  // Load relationship
    account: {},   // Load relationship
  }
});

// Access relationships
const transaction = data.transactions[0];
const category = transaction.category[0];  // Array (one-to-one returns array)
```

**Mutation pattern:**

```typescript
// ✅ CORRECT - Transactional update
await db.transact([
  db.tx.transactions[transactionId].update({ amount: newAmount }),
  db.tx.accounts[accountId].update({ balance: newBalance }),
  db.tx.budgets[budgetId].update({ spentAmount: newSpent }),
]);
```

---

## 📁 File Naming & Organization

### Screens (Routes)
- **Location**: `/src/app/[feature]/[screen-name].tsx`
- **Naming**: `kebab-case.tsx`
- **Examples**:
  - `/src/app/transactions/add.tsx` (Add transaction modal)
  - `/src/app/transactions/[id]/edit.tsx` (Edit transaction by ID)
  - `/src/app/settlement/index.tsx` (Settle up screen)

### Components
- **Location**: `/src/components/[category]/[ComponentName].tsx`
- **Naming**: `PascalCase.tsx`
- **Examples**:
  - `/src/components/ui/GlassCard.tsx`
  - `/src/components/dashboard/WeeklyAllowance.tsx`
  - `/src/components/transactions/TransactionCard.tsx`

### API Functions
- **Location**: `/src/lib/[feature]-api.ts`
- **Naming**: `kebab-case-api.ts`
- **Examples**:
  - `/src/lib/transactions-api.ts` (Transaction CRUD)
  - `/src/lib/budgets-api.ts` (Budget calculations)
  - `/src/lib/settlement-api.ts` (Settlement workflow)

### Utilities
- **Location**: `/src/utils/[category].ts`
- **Naming**: `camelCase.ts`
- **Examples**:
  - `/src/utils/currency.ts` (Swiss currency formatting)
  - `/src/utils/dates.ts` (Payday period calculations)
  - `/src/utils/splits.ts` (Split ratio calculations)

### Hooks
- **Location**: `/src/hooks/use[FeatureName].ts`
- **Naming**: `useCamelCase.ts`
- **Examples**:
  - `/src/hooks/useTransactions.ts`
  - `/src/hooks/useBudget.ts`
  - `/src/hooks/useSettlement.ts`

---

## 🧩 How to Structure New Features

### Step-by-Step Feature Development

**Example: Adding "Income Detection" feature (US-061)**

#### 1. Database Schema (if needed)
**File**: `/src/lib/db.ts`

```typescript
// Add new fields to existing entity
users: i.entity({
  // ... existing fields
  incomeDetectionMode: i.string().optional(),     // 'manual' | 'auto'
  gracePeriodDays: i.number().optional(),         // Default: 3
  manualMonthlyIncome: i.number().optional(),     // Fallback amount
  selectedIncomeCategories: i.json().optional(),  // Array of category IDs
}),
```

**⚠️ CRITICAL**: Update `technical-specs.md` with schema changes.

---

#### 2. API Layer
**File**: `/src/lib/income-api.ts` (create new file)

```typescript
import { db } from './db';

// Get income settings
export function useIncomeSettings(userId: string) {
  const { data } = db.useQuery({
    users: {
      $: { where: { id: userId } }
    }
  });
  
  return {
    mode: data?.users[0]?.incomeDetectionMode || 'manual',
    gracePeriodDays: data?.users[0]?.gracePeriodDays || 3,
    manualMonthlyIncome: data?.users[0]?.manualMonthlyIncome || 0,
    selectedCategories: data?.users[0]?.selectedIncomeCategories || [],
  };
}

// Update income settings
export async function updateIncomeSettings(
  userId: string,
  settings: {
    mode?: 'manual' | 'auto';
    gracePeriodDays?: number;
    manualMonthlyIncome?: number;
    selectedCategories?: string[];
  }
): Promise<void> {
  await db.transact([
    db.tx.users[userId].update(settings)
  ]);
}

// Detect income for period
export function detectIncomeForPeriod(
  transactions: Transaction[],
  periodStart: string,
  periodEnd: string,
  gracePeriodDays: number,
  selectedCategories: string[]
): {
  detectedIncome: number;
  transactionCount: number;
  transactions: Transaction[];
} {
  // Apply grace period to dates
  const graceStart = addDays(periodStart, -gracePeriodDays);
  const graceEnd = addDays(periodEnd, gracePeriodDays);
  
  // Filter income transactions
  const incomeTransactions = transactions.filter(t =>
    t.type === 'income' &&
    selectedCategories.includes(t.categoryId) &&
    t.date >= graceStart &&
    t.date <= graceEnd
  );
  
  const detectedIncome = incomeTransactions.reduce(
    (sum, t) => sum + t.amount,
    0
  );
  
  return {
    detectedIncome,
    transactionCount: incomeTransactions.length,
    transactions: incomeTransactions,
  };
}
```

---

#### 3. Custom Hook (optional, for complex logic)
**File**: `/src/hooks/useIncome.ts`

```typescript
import { useIncomeSettings, detectIncomeForPeriod } from '@/lib/income-api';
import { useTransactions } from './useTransactions';
import { calculateCurrentPeriod } from '@/utils/dates';

export function useIncome(userId: string, householdId: string, paydayDay: number) {
  const settings = useIncomeSettings(userId);
  const { data: transactions } = useTransactions(householdId);
  
  const period = calculateCurrentPeriod(paydayDay, new Date());
  
  if (settings.mode === 'manual') {
    return {
      income: settings.manualMonthlyIncome,
      isAutoDetected: false,
      transactionCount: 0,
    };
  }
  
  const detected = detectIncomeForPeriod(
    transactions,
    period.periodStart,
    period.periodEnd,
    settings.gracePeriodDays,
    settings.selectedCategories
  );
  
  return {
    income: detected.detectedIncome || settings.manualMonthlyIncome, // Fallback
    isAutoDetected: true,
    transactionCount: detected.transactionCount,
    transactions: detected.transactions,
  };
}
```

---

#### 4. UI Component
**File**: `/src/components/dashboard/IncomeProgressWidget.tsx`

```typescript
import { View, Text, Pressable } from 'react-native';
import { GlassCard } from '@/components/ui/GlassCard';
import { formatCurrency } from '@/utils/currency';
import { useIncome } from '@/hooks/useIncome';
import { router } from 'expo-router';

interface IncomeProgressWidgetProps {
  userId: string;
  householdId: string;
  paydayDay: number;
}

export function IncomeProgressWidget({ 
  userId, 
  householdId, 
  paydayDay 
}: IncomeProgressWidgetProps) {
  const { income, isAutoDetected, transactionCount } = useIncome(
    userId, 
    householdId, 
    paydayDay
  );
  
  return (
    <GlassCard variant="primary" blur="medium">
      <Pressable onPress={() => router.push('/settings/income')}>
        <Text className="text-lg font-semibold text-white">
          Monthly Income
        </Text>
        
        <Text className="text-3xl font-bold text-white mt-2">
          {formatCurrency(income)}
        </Text>
        
        {isAutoDetected && (
          <Text className="text-sm text-white/70 mt-1">
            Received from {transactionCount} {transactionCount === 1 ? 'transaction' : 'transactions'}
          </Text>
        )}
        
        {!isAutoDetected && (
          <Text className="text-sm text-white/70 mt-1">
            Manual entry
          </Text>
        )}
      </Pressable>
    </GlassCard>
  );
}
```

---

#### 5. Settings Screen
**File**: `/src/app/settings/income.tsx`

```typescript
import { View, Text, Switch, TextInput } from 'react-native';
import { useAuth } from '@/hooks/useAuth';
import { useIncomeSettings, updateIncomeSettings } from '@/lib/income-api';
import { GlassCard } from '@/components/ui/GlassCard';

export default function IncomeSettingsScreen() {
  const { user } = useAuth();
  const settings = useIncomeSettings(user.id);
  
  const handleModeChange = async (isAutoDetect: boolean) => {
    await updateIncomeSettings(user.id, {
      mode: isAutoDetect ? 'auto' : 'manual'
    });
  };
  
  return (
    <View className="flex-1 bg-[#1a1a1a] p-4">
      <GlassCard variant="secondary" blur="medium">
        <Text className="text-lg font-semibold text-white">
          Income Detection
        </Text>
        
        <View className="flex-row justify-between items-center mt-4">
          <Text className="text-white">Auto-detect from transactions</Text>
          <Switch
            value={settings.mode === 'auto'}
            onValueChange={handleModeChange}
          />
        </View>
        
        {settings.mode === 'manual' && (
          <View className="mt-4">
            <Text className="text-white mb-2">Monthly Income</Text>
            <TextInput
              className="bg-white/10 text-white p-3 rounded-lg"
              keyboardType="numeric"
              value={settings.manualMonthlyIncome.toString()}
              onChangeText={(value) => {
                updateIncomeSettings(user.id, {
                  manualMonthlyIncome: parseFloat(value) || 0
                });
              }}
            />
          </View>
        )}
      </GlassCard>
    </View>
  );
}
```

---

## 🎨 Design System Compliance

### Colors (Use Design Tokens)

**NEVER hardcode colors. Always use design tokens.**

```typescript
// ✅ CORRECT - Use design tokens
import { colors } from '@/constants/colors';

<View style={{ backgroundColor: colors.primary }}>

// ❌ WRONG - Hardcoded color
<View style={{ backgroundColor: '#2C5F5D' }}>
```

**Color Palette** (Deep Teal, Sage Green, Soft Amber):
```typescript
// src/constants/colors.ts
export const colors = {
  primary: '#2C5F5D',      // Deep Teal
  secondary: '#A8B5A1',    // Sage Green
  accent: '#E3A05D',       // Soft Amber
  background: '#1a1a1a',   // Dark background
  surface: 'rgba(255, 255, 255, 0.03)', // Glass surface
};
```

---

### GlassCard Component (Use Everywhere)

**ALWAYS use GlassCard for cards - never create custom glass effects.**

```typescript
// ✅ CORRECT
import { GlassCard } from '@/components/ui/GlassCard';

<GlassCard variant="primary" blur="medium">
  <Text>Content</Text>
</GlassCard>

// ❌ WRONG - Custom glass effect (inconsistent)
<View style={{
  backgroundColor: 'rgba(255, 255, 255, 0.03)',
  backdropFilter: 'blur(12px)',
  borderRadius: 20,
}}>
  <Text>Content</Text>
</View>
```

**GlassCard Variants**:
- `variant`: `"primary"` (Deep Teal) | `"secondary"` (Sage Green) | `"accent"` (Soft Amber)
- `blur`: `"light"` (8px) | `"medium"` (16px) | `"heavy"` (24px)

---

### Swiss Currency Formatting

**ALWAYS use `formatCurrency()` utility - never format inline.**

```typescript
// ✅ CORRECT
import { formatCurrency } from '@/utils/currency';

<Text>{formatCurrency(1234.56)}</Text>
// Output: "CHF 1'234.56"

// ❌ WRONG - Manual formatting (inconsistent)
<Text>CHF {amount.toFixed(2)}</Text>
// Output: "CHF 1234.56" (missing apostrophe separator)
```

**Currency Format Rules**:
- Apostrophe thousand separator: `1'234.56`
- Period decimal separator: `1234.56`
- "CHF" prefix with space: `CHF 1'234.56`
- Always 2 decimal places: `CHF 100.00` (not `CHF 100`)
- Negative sign after currency: `CHF -123.45`

---

## ✅ Testing Approach

### Unit Tests (Required for Utils)

**Test all utility functions in `/src/utils/`.**

```typescript
// src/utils/__tests__/currency.test.ts
import { formatCurrency } from '../currency';

describe('formatCurrency', () => {
  it('formats positive amounts with apostrophe separator', () => {
    expect(formatCurrency(1234.56)).toBe("CHF 1'234.56");
  });
  
  it('formats zero correctly', () => {
    expect(formatCurrency(0)).toBe('CHF 0.00');
  });
  
  it('formats negative amounts with sign after CHF', () => {
    expect(formatCurrency(-123.45)).toBe('CHF -123.45');
  });
  
  it('handles large numbers', () => {
    expect(formatCurrency(1234567.89)).toBe("CHF 1'234'567.89");
  });
});
```

**Run tests**:
```bash
npm test
npm test -- --coverage  # With coverage report
```

**Coverage Target**: 80% for utils, 60% overall

---

### Integration Tests (Critical Flows)

**Test critical user flows end-to-end.**

```typescript
// __tests__/flows/budget-workflow.test.ts
describe('Budget Workflow', () => {
  it('creates budget → adds transaction → updates spent amount', async () => {
    // 1. Create budget
    const budget = await allocateBudget({
      totalIncome: 5000,
      allocations: [
        { categoryId: groceriesCategory.id, amount: 500 }
      ]
    });
    
    expect(budget.allocatedAmount).toBe(500);
    expect(budget.spentAmount).toBe(0);
    
    // 2. Add transaction
    await createTransaction({
      amount: -45,
      categoryId: groceriesCategory.id,
      accountId: wallet.id,
      date: '2026-02-08',
      type: 'expense',
    });
    
    // 3. Verify budget updated
    const updatedBudget = await getBudget(budget.id);
    expect(updatedBudget.spentAmount).toBe(45);
    expect(updatedBudget.allocatedAmount - updatedBudget.spentAmount).toBe(455);
  });
});
```

---

### Edge Cases to Test

**Always test these scenarios**:

1. **Division by zero**: Split calculations, budget percentages
2. **Rounding errors**: Currency amounts (CHF 100.01 split 50/50)
3. **Leap years**: Feb 29 in payday calculations
4. **Last day of month**: paydayDay = -1 handling
5. **Empty states**: No transactions, no budgets, no household members
6. **Large datasets**: 10,000+ transactions (performance)
7. **Negative balances**: Wallet overdrafts, settlement balances
8. **Concurrent edits**: Two users editing same shared expense

---

## 📝 Code Commenting Style

### When to Comment

**✅ DO comment**:
- Complex algorithms (budget calculations, split ratios)
- Non-obvious business logic (why settlements aren't transactions)
- Workarounds for library limitations
- Security considerations (privacy scoping)
- Performance optimizations

**❌ DON'T comment**:
- Self-explanatory code
- What the code does (code should be self-documenting)
- Redundant information already in function name

---

### Comment Examples

```typescript
// ✅ GOOD - Explains WHY, not WHAT
// Settlement transfers money between accounts without creating a transaction
// because transactions would affect budgets (double-counting the expense).
async function createSettlement(data: SettlementData) {
  // Update account balances (internal transfer)
  await updateAccountBalances(data);
  
  // Log in settlements table for audit trail
  await logSettlement(data);
  
  // Mark splits as paid
  await markSplitsAsPaid(data.splitIds);
}

// ✅ GOOD - Explains complex algorithm
// Calculate split amounts with rounding handling:
// If rounding creates discrepancy (e.g., CHF 100.01 split 50/50 = 50.00 + 50.01),
// assign the remainder (CHF 0.01) to the largest split holder.
function calculateSplitAmounts(amount: number, ratios: number[]): number[] {
  // ... implementation
}

// ❌ BAD - States the obvious
// Loop through transactions
transactions.forEach(transaction => {
  // Add amount to total
  total += transaction.amount;
});

// ❌ BAD - Redundant
// Function to format currency
function formatCurrency(amount: number): string {
  // ...
}
```

---

### JSDoc for Public API Functions

```typescript
/**
 * Calculates the current budget period based on payday.
 * 
 * @param paydayDay - Day of month (1-31) or -1 for last day
 * @param referenceDate - Date to calculate period from (typically today)
 * @returns Object with periodStart and periodEnd in ISO format (YYYY-MM-DD)
 * 
 * @example
 * // Payday = 25th, Today = Feb 8, 2026
 * calculateCurrentPeriod(25, new Date('2026-02-08'))
 * // Returns: { periodStart: '2026-01-25', periodEnd: '2026-02-24' }
 * 
 * @example
 * // Last day of month (handles Feb 28/29)
 * calculateCurrentPeriod(-1, new Date('2026-02-15'))
 * // Returns: { periodStart: '2026-01-31', periodEnd: '2026-02-28' }
 */
export function calculateCurrentPeriod(
  paydayDay: number,
  referenceDate: Date
): { periodStart: string; periodEnd: string } {
  // Implementation...
}
```

---

## ✅ Definition of "Done" Checklist

**Before marking a feature complete, verify ALL of these:**

### Code Quality
- [ ] TypeScript strict mode with no errors
- [ ] All ESLint warnings resolved
- [ ] No `any` types without `@ts-ignore` + comment
- [ ] No hardcoded colors (use design tokens)
- [ ] No hardcoded period dates (use `calculateCurrentPeriod`)
- [ ] All queries scoped to `userId` or `householdId`

### Functionality
- [ ] Feature works as described in user story
- [ ] All acceptance criteria met
- [ ] Optimistic updates implemented
- [ ] Error handling with empathetic messages
- [ ] Loading states for async operations
- [ ] Edge cases handled (empty states, large datasets)

### Testing
- [ ] Unit tests written for new utility functions
- [ ] Integration test for critical user flow
- [ ] Manual testing on iOS simulator
- [ ] Edge cases tested (division by zero, leap years, etc.)
- [ ] Performance acceptable (<100ms for typical operations)

### Design
- [ ] Uses GlassCard component (not custom glass effects)
- [ ] Follows calm color palette (Deep Teal, Sage Green, Soft Amber)
- [ ] Swiss currency formatting (`CHF 1'234.56`)
- [ ] Touch targets minimum 44x44pt
- [ ] Text contrast meets WCAG AA (4.5:1 ratio)

### Documentation
- [ ] Updated `technical-specs.md` if schema changed
- [ ] Updated `user-stories.md` if acceptance criteria changed
- [ ] Added JSDoc comments for public API functions
- [ ] Complex algorithms have explanatory comments

### Database
- [ ] Schema changes reviewed and approved
- [ ] Migration strategy considered (if breaking change)
- [ ] No stored period dates in budgets/budgetSummary
- [ ] Privacy scoping verified (userId/householdId)

### Security
- [ ] No sensitive data in console logs (production)
- [ ] Auth tokens stored in SecureStore (not AsyncStorage)
- [ ] All mutations require authentication
- [ ] Input validation for user-provided data

---

## 🔍 Pre-Commit Review Checklist

**Before committing code, review:**

1. **Did I check existing code patterns?**
   - Search codebase for similar features
   - Reuse existing components/functions
   - Follow established naming conventions

2. **Is this the simplest solution?**
   - Avoid over-engineering
   - Prefer composition over complexity
   - Don't add features not in user story

3. **Will this work when users change their payday?**
   - No stored period dates
   - Use `calculateCurrentPeriod()` everywhere

4. **Is privacy protected?**
   - All queries scoped to userId/householdId
   - No leaking of household member data

5. **Does it follow Flow's philosophy?**
   - Calm design (no harsh reds, use Soft Amber for warnings)
   - Empathetic error messages (guide, don't blame)
   - Progressive disclosure (hide complexity)

---

## 🚨 Common Mistakes to Avoid

### ❌ Storing Budget Period Dates

```typescript
// ❌ WRONG - Will break when user changes payday
await db.tx.budgets[id].update({
  periodStart: '2026-01-25',
  periodEnd: '2026-02-24',
  allocatedAmount: 500
});

// ✅ CORRECT - Calculate periods dynamically
const period = calculateCurrentPeriod(member.paydayDay, new Date());
const transactions = await getTransactionsForPeriod(
  userId,
  period.periodStart,
  period.periodEnd
);
```

---

### ❌ Creating Transactions for Settlements

```typescript
// ❌ WRONG - Settlements are NOT transactions
await createTransaction({
  type: 'settlement',
  amount: 40,
  note: 'Settled shared expenses'
});

// ✅ CORRECT - Update accounts, log settlement, mark splits paid
await createSettlement({
  amount: 40,
  payerAccountId: ceciliaWallet.id,
  receiverAccountId: alexWallet.id,
  splitIds: [split1.id, split2.id]
});
```

---

### ❌ Auto-Creating Recurring Transactions

```typescript
// ❌ WRONG - Don't create transactions automatically
async function createRecurringTemplate(data) {
  const template = await saveTemplate(data);
  
  // ❌ NO! This affects budget before expense happens
  await createTransaction({
    ...template,
    date: getNextRecurringDate(template.recurringDay)
  });
}

// ✅ CORRECT - User manually activates from dashboard
async function createTransactionFromTemplate(templateId) {
  const template = await getTemplate(templateId);
  await createTransaction({
    ...template,
    date: today,
    createdFromTemplateId: templateId
  });
}
```

---

### ❌ Not Scoping Database Queries

```typescript
// ❌ WRONG - Returns ALL users' transactions (privacy breach)
const { data } = db.useQuery({
  transactions: {}
});

// ✅ CORRECT - Scoped to current user
const { data } = db.useQuery({
  transactions: {
    $: { where: { userId: currentUser.id } }
  }
});
```

---

### ❌ Hardcoding Colors

```typescript
// ❌ WRONG - Hardcoded color (inconsistent)
<View style={{ backgroundColor: '#2C5F5D' }}>

// ✅ CORRECT - Use GlassCard component
import { GlassCard } from '@/components/ui/GlassCard';

<GlassCard variant="primary" blur="medium">
```

---

## 🎓 Learning from Existing Code

### Before Adding New Code, Search for Patterns

**Example: Adding a new screen**

1. **Search existing screens** for patterns:
   ```bash
   # Look at similar screens
   ls src/app/transactions/
   # Shows: add.tsx, [id]/edit.tsx, index.tsx
   ```

2. **Review one similar screen** (e.g., `add.tsx`):
   - How does it fetch data? (useQuery pattern)
   - How does it handle mutations? (useMutation pattern)
   - How does it handle forms? (react-hook-form)
   - What components does it use? (GlassCard, Button, Input)

3. **Copy the pattern**, don't reinvent:
   ```typescript
   // Use the same mutation pattern
   const addMutation = useMutation({
     mutationFn: async (data) => {
       // Same optimistic update pattern
       queryClient.setQueryData(['items'], ...);
       const result = await apiFunction(data);
       return result;
     },
     onError: () => {
       // Same error handling pattern
       queryClient.invalidateQueries(['items']);
     }
   });
   ```

---

## 📚 Key Reference Files

**Always review these before starting work:**

1. **`technical-specs.md`**: Database schema, architecture, API patterns
2. **`user-stories.md`**: Requirements, acceptance criteria, dependencies
3. **`mobile/src/lib/db.ts`**: Source of truth for database schema
4. **`mobile/src/utils/dates.ts`**: Payday period calculation (critical)
5. **`mobile/src/components/ui/GlassCard.tsx`**: Design system pattern
6. **`mobile/src/lib/*-api.ts`**: Existing API functions (reuse them!)

---

## 🎯 Final Reminders

1. **Review existing code FIRST** - Don't reinvent patterns
2. **Timeless budgets** - Never store period dates in database
3. **Privacy scoping** - Every query must filter by userId/householdId
4. **Optimistic updates** - UI updates immediately, sync in background
5. **Settlements ≠ Transactions** - Internal transfers don't affect budget
6. **Templates ≠ Transactions** - User manually activates recurring expenses
7. **Use GlassCard** - No custom glass effects
8. **Swiss formatting** - `CHF 1'234.56` always
9. **Test edge cases** - Leap years, division by zero, large datasets
10. **Calm design** - No harsh reds, use Soft Amber for warnings

---

**Document Version**: 2.1  
**Last Updated**: February 8, 2026  
**Next Review**: After Phase 2 Sprint 3 (March 2026)

---

*This document guides all AI-assisted development. Follow these patterns to maintain code quality, consistency, and architectural integrity. When in doubt, search the codebase for existing examples.*
