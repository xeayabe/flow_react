# Flow - Calm Financial Control
*Premium iOS Budgeting App for Swiss Users*

[![Status](https://img.shields.io/badge/Phase%201-85%25%20Complete-blue)](https://github.com)
[![Platform](https://img.shields.io/badge/Platform-iOS%2015%2B-lightgrey)](https://github.com)
[![Tech](https://img.shields.io/badge/Tech-React%20Native%20%2B%20InstantDB-green)](https://github.com)

---

## Table of Contents
1. [Project Overview & Vision](#project-overview--vision)
2. [Core Features by Phase](#core-features-by-phase)
3. [Design Principles & Constraints](#design-principles--constraints)
4. [Success Criteria & Metrics](#success-criteria--metrics)
5. [Technical Architecture](#technical-architecture)
6. [Security & Privacy](#security--privacy)
7. [Testing Requirements](#testing-requirements)
8. [Current State & Roadmap](#current-state--roadmap)
9. [References](#references)

---

## Project Overview & Vision

### Vision Statement
**Flow empowers Swiss users to achieve calm financial control through proactive awareness, not reactive alerts.**

We believe budgeting should reduce financial anxiety, not create it. Flow is designed for people aged 20-40 who are new to budgeting and want a gentle, supportive companion that helps them understand their spending patterns and make informed financial decisions.

### Core Philosophy
**"Calm Financial Control"** means:
- **Proactive awareness** over reactive notifications
- **Understanding** spending patterns instead of feeling guilty about them
- **Optional collaboration** with household members on shared expenses
- **Privacy-first** architecture that respects the sensitivity of financial data
- **Swiss-specific** design that understands local banking culture and currency formatting

### Target Market

**Primary Persona**: Swiss Young Professional
- **Age**: 20-40 years old
- **Experience**: New to budgeting or frustrated with existing tools
- **Location**: Switzerland (German, French, Italian-speaking regions)
- **Pain Points**:
  - Overwhelmed by complex budgeting apps with steep learning curves
  - Anxious about money but unsure where spending happens
  - Needs to track shared expenses with partner/roommates but doesn't want "couple-only" apps
  - Frustrated by apps designed for other currencies and banking systems

**Secondary Persona**: Household Expense Sharers
- Couples, roommates, or family members sharing living costs
- Need flexible split ratios (60/40, 70/30, not just 50/50)
- Want privacy for personal spending while sharing household costs
- Value simple settlement workflows without complex "who owes what" calculations

### Competitive Positioning

**What Flow Does Differently**:

1. **Optional Household Sharing** (vs. Mandatory Couple Apps)
   - Splitwise, Honeydue, Zeta = couple-focused, mandatory sharing
   - Flow = individual budgeting with *optional* household collaboration
   - Customizable split ratios for real-world scenarios (60/40, 70/30, not just equal splits)

2. **Swiss Open Banking Integration** (18-24 Month Competitive Moat)
   - Automatic transaction import from Swiss banks (Phases 3-4)
   - Compliance with Swiss banking regulations and privacy standards
   - Creates significant barrier to entry for international competitors

3. **Payday-Based Budget Periods** (vs. Calendar Months)
   - Aligns with real-world cash flow (most Swiss workers paid monthly on specific dates)
   - Reduces cognitive overhead of "left over from last month" calculations
   - Matches user mental model of "next paycheck" planning

4. **Calm Design Language** (vs. Anxiety-Inducing Interfaces)
   - No harsh reds or "budget blown!" guilt messaging
   - Soothing color palette clinically selected to reduce financial stress
   - Empathetic error messaging that guides instead of blames

### Personal Validation
This app was born from the founder's personal challenges with overspending on eating out and the need to track shared expenses with his spouse using a 60/40 split ratio. Every feature solves a real problem experienced firsthand.

---

## Core Features by Phase

### Phase 1: Foundation (85% Complete) ✅

**Status**: Core budgeting functionality working, final polish underway

#### 1.1 Zero-Based Budgeting with 50/30/20 Framework
- **User Value**: Start budgeting immediately with a proven, flexible framework
- **Implementation**: Pre-configured budget categories (Needs/Wants/Savings) with customization
- **Constraint**: Every franc must be assigned to a category (zero-based methodology)
- **Technical Details**: Budget snapshot system tracks allocations and actual spending

#### 1.2 Payday-Based Budget Periods
- **User Value**: Budget periods match actual cash flow (paycheck to paycheck)
- **Why Not Calendar Months**: Swiss workers typically paid monthly on specific dates (25th, 1st, etc.)
- **Implementation**: User sets payday date, app creates rolling budget periods
- **Example**: Payday on 25th = budget period from Jan 25 - Feb 24

#### 1.3 Swiss Currency Formatting
- **User Value**: Numbers feel native and familiar to Swiss users
- **Format**: CHF 1'234.56 (apostrophe as thousand separator, period for decimals)
- **Constraint**: Must support all Swiss franc conventions (no exceptions)
- **Implementation**: Dedicated formatting utility functions with comprehensive tests

#### 1.4 Transaction Management
- **Add Transactions**: Quick entry with category assignment, amount, optional notes
- **Edit Transactions**: Modify any transaction detail, recalculates budget automatically
- **Delete Transactions**: Swipe-to-delete gesture (iOS-native interaction pattern)
- **Transaction Details**: Date, amount, category, notes, shared expense indicator
- **Technical Pattern**: Optimistic updates for instant UI feedback, background sync

#### 1.5 Budget Category Creation & Editing
- **User Value**: Customize budget to personal spending patterns
- **Default Categories**: Rent, Groceries, Transportation, Dining Out, Entertainment, Savings, etc.
- **Custom Categories**: Users can add categories specific to their needs
- **Category Settings**: Name, budget allocation amount, emoji/icon (for visual recognition)

#### 1.6 Privacy-First Architecture
- **User Value**: Financial data never leaks between users, even with shared backend
- **Implementation**: All database queries scoped to `userId` (enforced at query level)
- **Pattern**: `.where('userId', '=', userId)` on every InstantDB query
- **Testing Requirement**: Automated tests verify userId scoping on all queries

---

### Phase 2: Household Sharing & Intelligence (Current Focus) 🚧

**Status**: In active development, prioritizing settlement bug fixes and transaction screens

#### 2.1 Household Sharing with Customizable Split Ratios
- **User Value**: Share household expenses fairly based on income/agreement (60/40, 70/30, etc.)
- **Setup Flow**: Invite household member → Accept invitation → Define default split ratio
- **Transaction Types**:
  - Personal transactions (only visible to creator)
  - Shared transactions (visible to all household members, split by ratio)
- **Settlement Workflow**: See "who owes what" and mark as settled with single tap

#### 2.2 Expense Settlement Workflow
- **Current Bug (Priority Fix)**: Editing existing transaction to make it shared doesn't create expense splits
- **Expected Behavior**:
  1. User marks transaction as "shared"
  2. System calculates splits based on household ratio (e.g., 60/40)
  3. Creates settlement record for other household member
  4. Updates balance in "Settle Up" view
- **User Value**: Simple, transparent tracking of who owes what without manual calculation

#### 2.3 Transaction Screens with Glassmorphism Design
- **Design Language**: GlassCard components with backdrop blur, translucent backgrounds
- **Visual Consistency**: No hardcoded colors, all styling through design system tokens
- **Backdrop Blur Values**: Specific blur radius for iOS performance optimization
- **Components**: TransactionList, TransactionDetail, TransactionEditForm

#### 2.4 Recurring Expense Templates
- **User Value**: Automate predictable expenses (rent, subscriptions) without manual re-entry
- **Critical Design Decision**: Templates appear as **manual activation options**, not auto-created transactions
  - **Why**: Users want control and awareness, not surprise deductions from budget
  - **UX**: "Upcoming" section shows recurring templates, single tap to activate for current period
- **Template Fields**: Name, amount, category, frequency (weekly/monthly), start date

#### 2.5 Future-Dated Transactions & "Upcoming" Section
- **User Value**: Plan ahead for known future expenses without cluttering current budget
- **Implementation**: Collapsible "Upcoming" section in transaction list
- **Display Logic**:
  - Show future-dated transactions grouped by budget period
  - Show recurring expense templates awaiting activation
  - Hide section if empty (progressive disclosure)

#### 2.6 Progressive Disclosure for Complex Features
- **Principle**: Show simple interface by default, reveal complexity only when needed
- **Examples**:
  - Household sharing features hidden until user invites someone
  - Advanced category settings behind "Edit" action
  - Settlement details collapsed until user taps "Settle Up"
- **Benefit**: Reduces cognitive load for new users while preserving power-user capabilities

---

### Phase 3-4: Swiss Open Banking Integration (Future) 🔮

**Status**: Planned for 2026, strategic competitive advantage

#### 3.1 Swiss Open Banking API Integration
- **Competitive Moat**: 18-24 months for competitors to replicate (regulatory complexity)
- **Supported Banks**: Major Swiss banks (UBS, Credit Suisse, PostFinance, Raiffeisen, etc.)
- **API Standard**: [To be researched - Swiss FinTech regulatory framework]

#### 3.2 Automatic Transaction Import
- **User Value**: Eliminate manual transaction entry for 90%+ of spending
- **Implementation**: Daily sync with connected bank accounts
- **Privacy**: User must explicitly authorize each bank connection (OAuth 2.0)
- **Categorization**: ML-based suggestion + user override capability

#### 3.3 Account Balance Synchronization
- **User Value**: Real-time awareness of available funds across all accounts
- **Display**: Dashboard widget showing total balance, per-account breakdown
- **Budget Integration**: Visual indicator of "budget remaining" vs. "actual balance"

#### 3.4 Enhanced Categorization Suggestions
- **ML Training**: Learn from user's past categorization decisions
- **Swiss Context**: Understand local merchant names (Migros, Coop, SBB, etc.)
- **Confidence Scores**: Show confidence level for auto-categorization, prompt review if low

---

## Design Principles & Constraints

### Color Palette (Non-Negotiable)

**Primary Color - Deep Teal**: `#2C5F5D`
- Usage: Primary actions, headers, key UI elements
- Psychology: Calm, trustworthy, associated with stability and control
- Contrast: WCAG AA compliant with white text

**Secondary Color - Sage Green**: `#A8B5A1`
- Usage: Secondary actions, backgrounds, non-critical information
- Psychology: Natural, peaceful, reduces anxiety
- Contrast: WCAG AA compliant with dark text

**Accent Color - Soft Amber**: `#E3A05D`
- Usage: Positive actions, celebrations, highlights
- Psychology: Warm, encouraging, optimistic without being jarring
- Contrast: WCAG AA compliant with dark text

**Forbidden Colors**:
- ❌ **No harsh reds** (e.g., #FF0000, #DC143C) - Associated with danger, debt, anxiety
- ❌ **No bright warnings** (e.g., #FFA500, #FF6347) - Creates panic, not calm
- ✅ **Alternative for alerts**: Soft Amber with gentle messaging

**Rationale**: Every color choice is intentional to reduce financial anxiety. Traditional budgeting apps use aggressive reds and warnings that create stress. Flow's palette is clinically selected to promote calm financial awareness.

---

### UX Principles

#### 1. Progressive Disclosure
**Definition**: Show only what users need to see now, reveal complexity gradually

**Implementation Examples**:
- Household sharing features hidden until user invites member
- Advanced settings behind secondary menus
- "Upcoming" section collapsed by default if empty
- Transaction details shown only on tap, not in list view

**Testing**: Can a brand new user complete their first budget without seeing household sharing UI?

---

#### 2. Empathetic Error Handling
**Definition**: Guide users toward solutions, never blame them for mistakes

**Bad Example** ❌:
```
"Error: Budget exceeded by CHF 234.50"
```

**Good Example** ✅:
```
"You've spent CHF 234.50 more than planned in Dining Out this period. 
Would you like to:
• Adjust this month's budget
• Move funds from another category
• Review recent dining transactions"
```

**Pattern**: Every error message includes:
1. What happened (neutral language)
2. Why it might have happened (education)
3. What user can do next (actionable options)

---

#### 3. Celebration Loops
**Definition**: Positively reinforce good financial behavior with gentle encouragement

**Trigger Points**:
- First budget created: "Great start! You've taken the first step toward calm financial control."
- Stayed within budget for a category: Soft amber highlight, encouraging message
- Settled up with household member: "All settled! 🎉"

**Design Constraint**: Celebrations must be opt-out-able (some users find gamification patronizing)

**Visual Language**: Soft animations, warm colors, never over-the-top

---

#### 4. Visual Hierarchy to Reduce Cognitive Load
**Definition**: Most important information is most visually prominent

**Transaction List Hierarchy**:
1. **Amount** (largest, boldest) - What users scan for first
2. **Category** (medium, with icon) - Visual grouping aid
3. **Date** (smallest) - Context, but less critical for scanning
4. **Notes** (gray, optional) - Available but not distracting

**Budget Overview Hierarchy**:
1. **Spent vs. Budget Progress Bar** - At-a-glance status
2. **Remaining Amount** - Most actionable number
3. **Category Name** - Identification
4. **Individual Transactions** - Drill-down detail

---

### Technical Constraints

#### 1. Privacy-Scoped Database Queries (Non-Negotiable)
**Pattern**: Every InstantDB query MUST include userId scoping
```typescript
// ✅ CORRECT
db.query('transactions')
  .where('userId', '=', userId)
  .where('date', '>=', startDate)

// ❌ WRONG - Missing userId scope
db.query('transactions')
  .where('date', '>=', startDate)
```

**Enforcement**: 
- Code review checklist item
- Automated tests verify userId presence in all queries
- TypeScript utility function that enforces pattern

**Rationale**: Financial data is supremely sensitive. Even a single leaked transaction is unacceptable.

---

#### 2. GlassCard Components for Glassmorphism
**Pattern**: Never hardcode colors or blur values, always use design system components

```typescript
// ✅ CORRECT
<GlassCard variant="primary" blur="medium">
  <TransactionContent />
</GlassCard>

// ❌ WRONG - Hardcoded styling
<View style={{
  backgroundColor: 'rgba(44, 95, 93, 0.1)',
  backdropFilter: 'blur(10px)'
}}>
  <TransactionContent />
</View>
```

**Available Variants**:
- `primary`: Deep Teal with subtle transparency
- `secondary`: Sage Green with light transparency
- `accent`: Soft Amber for highlights

**Blur Levels**:
- `light`: 8px blur radius
- `medium`: 16px blur radius (default)
- `heavy`: 24px blur radius (use sparingly, performance impact)

**Rationale**: Consistency prevents visual drift, centralized styling enables theme changes

---

#### 3. Swiss Currency Formatting
**Pattern**: Use dedicated formatting utility, never format currency inline

```typescript
// ✅ CORRECT
import { formatCurrency } from '@/utils/currency';
const display = formatCurrency(1234.56); // "CHF 1'234.56"

// ❌ WRONG - Manual formatting
const display = `CHF ${amount.toFixed(2)}`;
```

**Formatting Rules**:
- Thousand separator: Apostrophe (`'`)
- Decimal separator: Period (`.`)
- Currency code: `CHF` prefix with space
- Always 2 decimal places
- Negative amounts: `CHF -123.45` (negative sign after currency)

**Edge Cases to Test**:
- Zero: `CHF 0.00`
- Large numbers: `CHF 1'234'567.89`
- Negative: `CHF -1'234.56`
- Small decimals: `CHF 0.05`

---

#### 4. Optimistic Updates for Perceived Performance
**Pattern**: Update UI immediately, sync to database in background, rollback on error

```typescript
// ✅ CORRECT Pattern
const addTransaction = async (transaction: Transaction) => {
  // 1. Optimistically update local state
  setTransactions(prev => [...prev, transaction]);
  
  // 2. Sync to database
  try {
    await db.insert('transactions', transaction);
  } catch (error) {
    // 3. Rollback on error
    setTransactions(prev => prev.filter(t => t.id !== transaction.id));
    showError('Could not save transaction. Please try again.');
  }
};
```

**User Experience**: App feels instant, no loading spinners for common actions

**Constraint**: Only use for idempotent operations (safe to retry)

---

## Success Criteria & Metrics

### Phase 1 Success Criteria (Foundation)

**Functionality Checkpoints**:
- [x] User can create a budget in under 3 minutes (timed user testing)
- [x] Transaction entry takes less than 10 seconds from tap to save
- [ ] App launch time under 2 seconds on iPhone 12 (median device)
- [ ] Zero critical bugs in transaction CRUD flow (automated regression tests)
- [ ] Privacy: 100% of database queries properly scoped to userId (automated verification)

**User Experience Checkpoints**:
- [ ] 90% of first-time users complete budget setup without help/tutorial
- [ ] Users can explain "payday-based periods" concept after 1 budget cycle
- [ ] No user reports anxiety-inducing UI elements (color scheme validated)

**Technical Quality Checkpoints**:
- [x] TypeScript strict mode with zero type errors
- [ ] 80%+ code coverage on critical paths (currency formatting, budget calculations, split ratios)
- [ ] All database queries include userId scoping (automated linting rule)

---

### Phase 2 Success Criteria (Household Sharing)

**Functionality Checkpoints**:
- [ ] Household members can share expenses with custom splits in under 30 seconds
- [ ] Settlement workflow requires no more than 2 taps to mark as settled
- [ ] Recurring expense activation is intuitive (zero support queries in beta testing)
- [ ] 95% of users understand "Upcoming" section purpose without tutorial

**User Experience Checkpoints**:
- [ ] Users with household sharing enabled report "fair" expense splitting
- [ ] Editing transaction from personal to shared creates splits correctly (bug fix validated)
- [ ] Collapsible sections reduce visual clutter for users without future transactions

**Technical Quality Checkpoints**:
- [ ] Glassmorphism effects perform at 60fps on iPhone 11 and newer
- [ ] Real-time sync between household members has <500ms latency
- [ ] Settlement calculations are mathematically verified (unit tests with edge cases)

---

### Phase 3-4 Success Criteria (Open Banking)

**Functionality Checkpoints** (Future):
- [ ] Automatic transaction import accuracy >95% for common merchants
- [ ] Bank connection setup takes <2 minutes per account
- [ ] ML categorization suggestions accepted by users >80% of the time

**User Experience Checkpoints** (Future):
- [ ] Users report "significantly reduced" manual transaction entry burden
- [ ] Bank balance synchronization creates "confidence" in budget accuracy
- [ ] Privacy concerns addressed through transparent authorization flow

---

### Overall Success Metrics (Continuous Tracking)

#### 1. Budget Adherence Rate
**Definition**: Percentage of users staying within budget for at least 80% of categories each period

**Target**: 60% of active users within 3 months of use

**Measurement**: 
```typescript
adherenceRate = (categoriesWithinBudget / totalCategories) * 100
userAdherence = usersWithAdherence >= 80% ? 1 : 0
overallRate = sum(userAdherence) / totalUsers
```

**Why This Matters**: Primary app goal is helping users control spending, adherence is key indicator

---

#### 2. Transaction Categorization Accuracy
**Definition**: Percentage of transactions categorized correctly on first entry (vs. later edited)

**Target**: 85%+ accuracy

**Measurement**: Track category edit frequency, user-reported miscategorizations

**Why This Matters**: Incorrect categories undermine budget tracking accuracy and user trust

---

#### 3. Time to Complete Budget Setup
**Definition**: Elapsed time from app launch to first budget period activated

**Target**: Under 5 minutes for 90th percentile user

**Measurement**: Analytics events at key milestones (account created → budget configured → first transaction)

**Why This Matters**: Activation speed predicts long-term retention (lower friction = higher adoption)

---

#### 4. User-Reported Financial Anxiety Reduction
**Definition**: Qualitative feedback on whether Flow reduces stress around money

**Target**: 70%+ of survey respondents report "reduced anxiety" or "feel more in control"

**Measurement**: 
- In-app survey after 2 weeks of use: "How has Flow affected your financial stress?"
- Scale: Much worse / Worse / No change / Better / Much better
- NPS question: "How likely are you to recommend Flow to someone who feels anxious about money?"

**Why This Matters**: Core value proposition is "calm financial control" - must measure psychological impact

---

#### 5. Household Sharing Adoption Rate
**Definition**: Percentage of users who enable household sharing within first month

**Target**: 40% of users with partners/roommates (based on onboarding survey)

**Measurement**: Track household invitation flow completion

**Why This Matters**: Validates product-market fit for key differentiator vs. competitors

---

### Privacy-First Analytics Philosophy

**What We Track**:
- Feature usage (anonymized, aggregated)
- Performance metrics (app launch time, query latency)
- Error rates and crash reports
- User flows (onboarding completion, feature discovery)

**What We Never Track**:
- ❌ Individual transaction amounts or categories
- ❌ Personal financial data (balances, spending patterns)
- ❌ Household member identities or relationships
- ❌ Bank account information or credentials

**Transparency**: Privacy policy and data collection explained in plain language during onboarding

---

## Technical Architecture

### Technology Stack

**Frontend**:
- **Framework**: React Native (Expo managed workflow)
- **Language**: TypeScript 5.x (strict mode enabled)
- **UI Components**: Material 3 design system + custom components
- **State Management**: React hooks (useState, useEffect, useContext) + InstantDB real-time subscriptions
- **Navigation**: React Navigation 6.x
- **Styling**: React Native StyleSheet + design tokens

**Backend**:
- **Database**: InstantDB (real-time, serverless)
- **Authentication**: InstantDB Auth (email/password, OAuth future phase)
- **Hosting**: Expo Application Services (EAS)
- **Future**: Swiss Open Banking API integration (Phases 3-4)

**Development Tools**:
- **IDE**: VS Code with Claude Code integration
- **Version Control**: Git + GitHub
- **CI/CD**: EAS Build + GitHub Actions (planned)
- **Testing**: Jest + React Native Testing Library
- **Linting**: ESLint + Prettier

**Minimum iOS Version**: iOS 15.0+ (covers 95%+ of active devices as of 2025)

---

### Project File Structure

```
flow-app/
├── src/
│   ├── components/          # Reusable UI components
│   │   ├── cards/           # GlassCard, BudgetCard, TransactionCard
│   │   ├── forms/           # TransactionForm, CategoryForm, SettingsForm
│   │   ├── shared/          # LoadingScreen, ErrorBoundary, EmptyState
│   │   └── buttons/         # PrimaryButton, SecondaryButton, IconButton
│   │
│   ├── screens/             # Main app screens (one per route)
│   │   ├── BudgetScreen.tsx
│   │   ├── TransactionScreen.tsx
│   │   ├── SettingsScreen.tsx
│   │   ├── HouseholdScreen.tsx
│   │   └── OnboardingScreen.tsx
│   │
│   ├── navigation/          # React Navigation configuration
│   │   ├── AppNavigator.tsx
│   │   └── types.ts
│   │
│   ├── database/            # InstantDB queries and mutations
│   │   ├── queries.ts       # Read operations
│   │   ├── mutations.ts     # Write operations
│   │   └── schema.ts        # Type definitions for DB entities
│   │
│   ├── utils/               # Utility functions
│   │   ├── currency.ts      # Swiss currency formatting
│   │   ├── calculations.ts  # Budget math, split ratios
│   │   ├── dates.ts         # Payday period calculations
│   │   └── validation.ts    # Form validation helpers
│   │
│   ├── types/               # TypeScript interfaces and types
│   │   ├── models.ts        # Transaction, Budget, Category, etc.
│   │   ├── enums.ts         # Constants (TransactionType, BudgetCategory)
│   │   └── navigation.ts    # Navigation param types
│   │
│   ├── constants/           # Design tokens and configuration
│   │   ├── colors.ts        # Color palette (#2C5F5D, #A8B5A1, #E3A05D)
│   │   ├── spacing.ts       # Spacing scale (4px, 8px, 16px, 24px, 32px)
│   │   ├── typography.ts    # Font sizes, weights, line heights
│   │   └── config.ts        # App configuration (API keys, feature flags)
│   │
│   ├── hooks/               # Custom React hooks
│   │   ├── useTransactions.ts
│   │   ├── useBudget.ts
│   │   ├── useHousehold.ts
│   │   └── useAuth.ts
│   │
│   └── App.tsx              # Root component
│
├── assets/                  # Images, fonts, icons
├── __tests__/               # Test files (mirrors src/ structure)
├── app.json                 # Expo configuration
├── package.json             # Dependencies
├── tsconfig.json            # TypeScript configuration
├── CLAUDE.md                # AI development guidelines (primary reference)
└── README.md                # Project overview
```

---

### Key Architectural Patterns

#### 1. Privacy-First Database Scoping

**Pattern**: Every database query includes userId filter

```typescript
// src/database/queries.ts

import { db } from './config';
import { useAuth } from '@/hooks/useAuth';

export const useTransactions = () => {
  const { userId } = useAuth();
  
  // ✅ CORRECT: userId scoping enforced
  const { data: transactions, error } = db.query('transactions')
    .where('userId', '=', userId)
    .orderBy('date', 'desc')
    .useQuery();
  
  return { transactions, error };
};

// Utility to enforce pattern across all queries
export const userScopedQuery = <T>(
  collection: string, 
  userId: string
) => {
  return db.query(collection).where('userId', '=', userId);
};
```

**Automated Enforcement**: ESLint rule (custom) flags queries without userId

---

#### 2. Optimistic Updates for Perceived Performance

**Pattern**: Update UI immediately, sync in background, rollback on error

```typescript
// src/database/mutations.ts

export const addTransaction = async (
  transaction: Omit<Transaction, 'id'>,
  userId: string
) => {
  const tempId = `temp_${Date.now()}`;
  const optimisticTransaction = { ...transaction, id: tempId, userId };
  
  try {
    // 1. Optimistic UI update (InstantDB handles this internally)
    const result = await db.insert('transactions', optimisticTransaction);
    
    // 2. Recalculate budget snapshot
    await updateBudgetSnapshot(userId, transaction.budgetPeriodId);
    
    return { success: true, data: result };
  } catch (error) {
    // 3. Error handling (InstantDB rollback automatic)
    return { 
      success: false, 
      error: 'Could not save transaction. Please try again.' 
    };
  }
};
```

**User Experience**: No loading spinners for common CRUD operations

---

#### 3. Split Ratio Calculations (Household Sharing)

**Pattern**: Centralized calculation logic with rounding handling

```typescript
// src/utils/calculations.ts

export interface SplitRatio {
  userId: string;
  percentage: number; // e.g., 60 for 60%
}

export const calculateSplits = (
  amount: number,
  ratios: SplitRatio[]
): { userId: string; amount: number }[] => {
  // Validate ratios sum to 100
  const total = ratios.reduce((sum, r) => sum + r.percentage, 0);
  if (total !== 100) {
    throw new Error('Split ratios must sum to 100%');
  }
  
  // Calculate splits with rounding
  const splits = ratios.map(ratio => ({
    userId: ratio.userId,
    amount: Math.round((amount * ratio.percentage / 100) * 100) / 100
  }));
  
  // Handle rounding discrepancies (assign to largest ratio holder)
  const calculatedTotal = splits.reduce((sum, s) => sum + s.amount, 0);
  const diff = amount - calculatedTotal;
  
  if (diff !== 0) {
    const largestSplit = splits.reduce((max, s) => 
      s.amount > max.amount ? s : max
    );
    largestSplit.amount += diff;
  }
  
  return splits;
};

// Example usage
const splits = calculateSplits(100.00, [
  { userId: 'user1', percentage: 60 }, // CHF 60.00
  { userId: 'user2', percentage: 40 }  // CHF 40.00
]);
```

**Test Coverage**: Edge cases include prime number amounts, three-way splits, rounding errors

---

#### 4. Budget Snapshot System

**Pattern**: Denormalized summary for fast dashboard rendering

```typescript
// src/database/schema.ts

export interface BudgetSnapshot {
  id: string;
  userId: string;
  budgetPeriodId: string;
  categoryId: string;
  allocated: number;      // Amount budgeted for this category
  spent: number;          // Total spent in this category (calculated)
  remaining: number;      // allocated - spent
  transactionCount: number;
  lastUpdated: Date;
}

// src/database/mutations.ts

export const updateBudgetSnapshot = async (
  userId: string,
  budgetPeriodId: string
) => {
  // 1. Fetch all transactions for this period
  const transactions = await db.query('transactions')
    .where('userId', '=', userId)
    .where('budgetPeriodId', '=', budgetPeriodId)
    .execute();
  
  // 2. Group by category and calculate totals
  const categoryTotals = transactions.reduce((acc, t) => {
    if (!acc[t.categoryId]) {
      acc[t.categoryId] = { spent: 0, count: 0 };
    }
    acc[t.categoryId].spent += t.amount;
    acc[t.categoryId].count += 1;
    return acc;
  }, {} as Record<string, { spent: number; count: number }>);
  
  // 3. Update snapshots for each category
  const updates = Object.entries(categoryTotals).map(([categoryId, data]) => ({
    userId,
    budgetPeriodId,
    categoryId,
    spent: data.spent,
    transactionCount: data.count,
    remaining: allocated - data.spent, // allocated fetched from budget config
    lastUpdated: new Date()
  }));
  
  await db.upsert('budgetSnapshots', updates);
};
```

**Why Denormalize**: Dashboard needs to show all categories at once; calculating on-the-fly is slow

---

### Database Schema (InstantDB)

```typescript
// src/database/schema.ts

export interface User {
  id: string;
  email: string;
  createdAt: Date;
  paydayDate: number;        // Day of month (1-31)
  defaultCurrency: 'CHF';
  householdId?: string;      // Optional: if part of household
}

export interface Household {
  id: string;
  name: string;
  createdAt: Date;
  members: HouseholdMember[];
}

export interface HouseholdMember {
  id: string;
  householdId: string;
  userId: string;
  splitPercentage: number;   // 0-100 (e.g., 60 for 60%)
  joinedAt: Date;
}

export interface BudgetPeriod {
  id: string;
  userId: string;
  startDate: Date;           // Payday date
  endDate: Date;             // Day before next payday
  totalAllocated: number;    // Sum of all category allocations
  totalSpent: number;        // Calculated from transactions
  status: 'active' | 'completed';
}

export interface Category {
  id: string;
  userId: string;
  name: string;
  emoji?: string;
  budgetType: 'needs' | 'wants' | 'savings'; // 50/30/20 framework
  allocated: number;         // Amount budgeted for this category
  isDefault: boolean;        // Pre-configured vs. user-created
}

export interface Transaction {
  id: string;
  userId: string;
  budgetPeriodId: string;
  categoryId: string;
  amount: number;
  date: Date;
  notes?: string;
  isShared: boolean;         // Whether this is a household expense
  createdAt: Date;
  updatedAt: Date;
}

export interface ExpenseSplit {
  id: string;
  transactionId: string;
  owedByUserId: string;      // Who owes money
  owedToUserId: string;      // Who paid originally
  amount: number;
  isSettled: boolean;
  settledAt?: Date;
}

export interface RecurringExpense {
  id: string;
  userId: string;
  categoryId: string;
  name: string;
  amount: number;
  frequency: 'weekly' | 'biweekly' | 'monthly';
  startDate: Date;
  endDate?: Date;            // Optional: for fixed-term subscriptions
  isActive: boolean;         // User can pause recurring templates
}
```

---

### Development Workflow

#### Step-by-Step Process

1. **Review CLAUDE.md** for component patterns and guidelines
2. **Implement one change at a time** (single feature, bug fix, or refactor)
3. **Test locally** with iOS simulator (iPhone 12 Pro as baseline)
4. **Commit changes** with descriptive message
5. **Verify functionality** before proceeding to next change
6. **Use Claude Code** for file modifications with @workspace references

#### Git Commit Conventions

```
feat: Add household sharing settlement workflow
fix: Resolve transaction color consistency issue
refactor: Extract currency formatting to utility function
test: Add unit tests for split ratio calculations
docs: Update CLAUDE.md with GlassCard usage guidelines
```

#### Code Review Checklist

- [ ] All database queries include `userId` scoping
- [ ] No hardcoded colors (use design tokens or GlassCard components)
- [ ] Swiss currency formatting uses `formatCurrency()` utility
- [ ] Error messages are empathetic and actionable
- [ ] TypeScript strict mode with zero errors
- [ ] Unit tests for business logic (calculations, validations)
- [ ] Manual testing on iOS simulator
- [ ] Performance: No operations blocking UI thread >100ms

---

## Security & Privacy

### Authentication Strategy

**Current (Phase 1-2)**: InstantDB Email/Password Authentication
- User creates account with email + password
- Session tokens stored securely (iOS Keychain)
- Automatic token refresh (InstantDB SDK handles)

**Future (Phase 3+)**: Biometric Authentication
- Face ID / Touch ID as optional faster login
- Fallback to passcode if biometric unavailable
- Require re-authentication for sensitive operations (e.g., deleting all data)

**Session Management**:
- Sessions expire after 30 days of inactivity
- User can manually log out from any device
- "Logout all devices" option in settings

---

### Data Protection

#### Encryption

**At Rest**:
- InstantDB encrypts all data at rest (AES-256)
- iOS Keychain for session tokens (hardware-encrypted on device)
- No financial data stored unencrypted on device

**In Transit**:
- All API calls use HTTPS/TLS 1.3
- Certificate pinning for InstantDB connections (planned Phase 2)
- No fallback to insecure HTTP

#### Data Minimization

**What We Store**:
- Essential transaction data: amount, category, date, notes
- Budget configurations: categories, allocations
- Household relationships: member IDs, split percentages
- User settings: payday date, currency preference

**What We Never Store**:
- Bank account credentials (future open banking uses OAuth tokens, not passwords)
- Social security numbers or tax identifiers
- Full names (optional, user's choice)
- Location data (no GPS tracking)

#### User Data Control

**Export Functionality** (Required by GDPR/FADP):
- User can export all their data as JSON
- Includes transactions, budgets, categories, household data
- Delivered via email or in-app download
- Format is human-readable and machine-parsable

**Deletion Workflow** (Right to Be Forgotten):
- User can delete account from settings
- Confirmation step with "This cannot be undone" warning
- All user data permanently deleted within 30 days
- Household members notified if shared expenses exist

---

### Compliance

#### Swiss Federal Data Protection Act (FADP)

**Key Requirements**:
1. **Consent**: Users must explicitly consent to data collection (onboarding checkbox)
2. **Transparency**: Privacy policy in plain language, not legal jargon
3. **Data Minimization**: Only collect what's necessary for app functionality
4. **Security**: Implement appropriate technical measures (encryption, access controls)
5. **User Rights**: Export and deletion workflows

**Compliance Checklist**:
- [ ] Privacy policy drafted and reviewed by Swiss legal counsel
- [ ] Consent checkbox during onboarding (cannot proceed without)
- [ ] Data protection contact email (e.g., privacy@flowapp.ch)
- [ ] Annual security audit (planned for post-launch)

#### GDPR Compliance (For EU Users)

**Additional Requirements**:
- Cookie consent (if using analytics cookies)
- Right to data portability (JSON export satisfies this)
- Data processing agreements with third parties (InstantDB, Expo)
- DPO (Data Protection Officer) if processing >250 employee records (not applicable for consumer app)

---

### Security Testing

**Penetration Testing** (Pre-Launch):
- Engage third-party security firm for audit
- Focus areas: Authentication, data leakage, injection attacks
- Remediate all high/critical findings before public launch

**Ongoing Security**:
- Dependency vulnerability scanning (GitHub Dependabot)
- Monthly review of InstantDB security advisories
- Incident response plan for data breaches (required by FADP)

---

## Testing Requirements

### Critical User Flows (Regression Suite)

**Must Never Break**:

1. **Create Budget → Add Transaction → View Budget Status**
   - User sets up first budget (5 categories, CHF 3000 total)
   - Adds transaction (CHF 45 to "Groceries")
   - Budget snapshot updates instantly
   - Remaining budget shows correct amount (CHF 2955)

2. **Set Up Household Sharing → Add Shared Expense → Settle Up**
   - User invites partner (60/40 split ratio)
   - Creates shared transaction (CHF 100 groceries)
   - Partner sees CHF 40 owed in "Settle Up" view
   - User marks as settled, balance resets to CHF 0

3. **Create Recurring Expense Template → Activate for Current Period**
   - User creates recurring template ("Rent", CHF 1200, monthly)
   - Template appears in "Upcoming" section
   - User taps to activate for current budget period
   - Transaction created with correct amount and category

4. **Edit Transaction → Change from Personal to Shared → Verify Split Creation**
   - User creates personal transaction (CHF 80 dining out)
   - Edits transaction, toggles "Shared" to ON
   - System calculates splits (60/40 = CHF 48 / CHF 32)
   - ExpenseSplit record created for partner (CHF 32 owed)

**Automated Testing**: Use React Native Testing Library to automate these flows

---

### Unit Testing Coverage Requirements

**Target**: 80%+ coverage on critical paths

**Priority Modules**:

#### 1. Currency Formatting (`src/utils/currency.ts`)
```typescript
describe('formatCurrency', () => {
  it('formats standard amounts with apostrophe separator', () => {
    expect(formatCurrency(1234.56)).toBe("CHF 1'234.56");
  });
  
  it('handles zero correctly', () => {
    expect(formatCurrency(0)).toBe("CHF 0.00");
  });
  
  it('formats negative amounts', () => {
    expect(formatCurrency(-123.45)).toBe("CHF -123.45");
  });
  
  it('handles large numbers with multiple separators', () => {
    expect(formatCurrency(1234567.89)).toBe("CHF 1'234'567.89");
  });
  
  it('rounds to 2 decimal places', () => {
    expect(formatCurrency(10.996)).toBe("CHF 11.00");
  });
});
```

#### 2. Split Ratio Calculations (`src/utils/calculations.ts`)
```typescript
describe('calculateSplits', () => {
  it('calculates 60/40 split correctly', () => {
    const splits = calculateSplits(100, [
      { userId: 'u1', percentage: 60 },
      { userId: 'u2', percentage: 40 }
    ]);
    expect(splits).toEqual([
      { userId: 'u1', amount: 60.00 },
      { userId: 'u2', amount: 40.00 }
    ]);
  });
  
  it('handles rounding for prime number amounts', () => {
    const splits = calculateSplits(100.01, [
      { userId: 'u1', percentage: 50 },
      { userId: 'u2', percentage: 50 }
    ]);
    const total = splits.reduce((sum, s) => sum + s.amount, 0);
    expect(total).toBe(100.01); // No rounding loss
  });
  
  it('throws error if ratios do not sum to 100', () => {
    expect(() => calculateSplits(100, [
      { userId: 'u1', percentage: 60 },
      { userId: 'u2', percentage: 50 }
    ])).toThrow('Split ratios must sum to 100%');
  });
  
  it('handles three-way splits', () => {
    const splits = calculateSplits(99, [
      { userId: 'u1', percentage: 50 },
      { userId: 'u2', percentage: 30 },
      { userId: 'u3', percentage: 20 }
    ]);
    expect(splits).toEqual([
      { userId: 'u1', amount: 49.50 },
      { userId: 'u2', amount: 29.70 },
      { userId: 'u3', amount: 19.80 }
    ]);
  });
});
```

#### 3. Budget Calculations
```typescript
describe('Budget calculations', () => {
  it('calculates remaining budget correctly', () => {
    const allocated = 500;
    const spent = 234.56;
    const remaining = allocated - spent;
    expect(remaining).toBe(265.44);
  });
  
  it('handles overspending (negative remaining)', () => {
    const allocated = 200;
    const spent = 250;
    const remaining = allocated - spent;
    expect(remaining).toBe(-50);
  });
});
```

#### 4. Date Calculations (Payday Periods)
```typescript
describe('Payday period calculations', () => {
  it('calculates period for payday on 25th', () => {
    const paydayDate = 25;
    const today = new Date('2025-02-08');
    const period = calculateCurrentPeriod(today, paydayDate);
    
    expect(period.startDate).toEqual(new Date('2025-01-25'));
    expect(period.endDate).toEqual(new Date('2025-02-24'));
  });
  
  it('handles payday at start of month', () => {
    const paydayDate = 1;
    const today = new Date('2025-02-08');
    const period = calculateCurrentPeriod(today, paydayDate);
    
    expect(period.startDate).toEqual(new Date('2025-02-01'));
    expect(period.endDate).toEqual(new Date('2025-02-28')); // Feb has 28 days
  });
});
```

---

### Integration Testing

**InstantDB Query Performance**:
- Test with 1000+ transactions in database
- Verify query latency <200ms for typical operations
- Test real-time sync with multiple clients (household sharing)

**User Flow Testing** (Manual + Automated):
- Complete onboarding flow from first launch
- Create budget, add transactions, view dashboard
- Invite household member, create shared expense, settle up
- Test on multiple iOS versions (iOS 15, 16, 17)

---

### Performance Benchmarks

**Target Metrics** (iPhone 12 Pro baseline):

| Operation | Target | Measurement Method |
|-----------|--------|-------------------|
| App launch (cold start) | <2 seconds | Time to interactive |
| Transaction list rendering (500 items) | <100ms | useTransactions hook load time |
| Budget calculation | <50ms | updateBudgetSnapshot duration |
| Database query (typical) | <200ms | InstantDB query latency |
| Swipe gesture response | <16ms | Touch to UI update (60fps) |
| Glassmorphism blur rendering | 60fps | No dropped frames on scroll |

**Monitoring**: Use React Native Performance Monitor in debug builds

---

### Edge Cases to Test

**Currency & Math**:
- Division by zero (split ratios with 0% user)
- Rounding errors (CHF 0.01 differences)
- Very large amounts (CHF 1,000,000+)
- Very small amounts (CHF 0.01)

**Dates**:
- Leap years (February 29 payday)
- End of month variations (31 vs 30 vs 28 days)
- Timezone edge cases (UTC vs local time)

**Household Sharing**:
- Member leaves household mid-period
- Conflicting edits from multiple household members
- Settling expense already marked as settled

**Data Limits**:
- User with 10,000+ transactions (pagination required)
- 50+ budget categories (UI scroll performance)
- Household with 5+ members (rare but possible)

---

## Current State & Roadmap

### Phase 1 Status: Foundation (85% Complete)

**✅ Completed**:
- [x] Zero-based budgeting framework (50/30/20 categories)
- [x] Payday-based budget periods
- [x] Swiss currency formatting (CHF 1'234.56)
- [x] Transaction CRUD operations (add, edit, delete)
- [x] Budget category creation and editing
- [x] Privacy-scoped database queries (all queries include userId)
- [x] Design system with color palette and spacing tokens
- [x] GlassCard components for glassmorphism UI
- [x] TypeScript strict mode enabled

**⚠️ In Progress**:
- [ ] Transaction color consistency fixes (hardcoded colors → design tokens)
- [ ] Swipe-to-delete gesture for transactions (iOS-native interaction)
- [ ] TypeScript property mismatch errors (fixing type incompatibilities)

**📝 Remaining for Phase 1**:
- [ ] Performance optimization (app launch time target: <2 seconds)
- [ ] Error boundary implementation (graceful error handling)
- [ ] LoadingScreen component (consistent loading states)
- [ ] Automated regression tests for critical flows
- [ ] Privacy audit (verify all queries include userId)

**Estimated Completion**: Mid-February 2025 (2 weeks)

---

### Phase 2 Status: Household Sharing & Intelligence (In Active Development)

**Current Focus**: Fixing settlement workflow bug where editing existing transactions to make them shared doesn't create expense splits

**Priority 1 (Next 2 Weeks)**:
1. **Fix Settlement Workflow Bug**
   - Issue: Editing transaction from personal → shared doesn't trigger split creation
   - Expected: System should calculate splits based on household ratio (e.g., 60/40)
   - Impact: Blocking adoption of household sharing feature
   
2. **Complete Transaction Screens**
   - Implement glassmorphism design with GlassCard components
   - Ensure color consistency (no hardcoded values)
   - Add transaction detail view with edit/delete actions

3. **Recurring Expense Templates**
   - Create template management screen
   - Implement "Upcoming" section with collapsible display
   - Add single-tap activation flow (template → actual transaction)

**Priority 2 (Following 4 Weeks)**:
4. **Collapsible Sections for Future Transactions**
   - Progressive disclosure pattern for "Upcoming" expenses
   - Hide section if empty (reduce visual clutter)
   - Smooth expand/collapse animations

5. **Household Invitation Flow**
   - Email invitation system (InstantDB Auth integration)
   - Split ratio configuration during setup
   - Permission management (who can edit shared expenses)

6. **Intelligence Features**
   - Spending trend visualization (bar charts by category)
   - Budget vs. actual comparison over time
   - Recurring expense detection (suggest templates based on patterns)

**Estimated Completion**: End of March 2025 (6 weeks)

---

### Phase 3-4: Swiss Open Banking Integration (Q3-Q4 2025)

**Research Phase** (Q2 2025):
- [ ] Investigate Swiss FinTech regulatory requirements
- [ ] Identify Open Banking API providers (Tink, Plaid, local Swiss options)
- [ ] Evaluate data privacy implications (FADP compliance)
- [ ] Cost analysis for API integration

**Development Phase** (Q3 2025):
- [ ] OAuth 2.0 integration with Swiss banks
- [ ] Automatic transaction import engine
- [ ] ML-based categorization suggestions (Swiss merchant names)
- [ ] Account balance synchronization
- [ ] Bank connection management UI

**Testing & Launch** (Q4 2025):
- [ ] Beta testing with 50-100 users
- [ ] Security audit for bank integration
- [ ] Compliance verification (Swiss banking regulations)
- [ ] Gradual rollout to paid subscribers

**Strategic Importance**: 18-24 month competitive moat due to regulatory complexity

---

### Technical Debt & Improvements Roadmap

**Quick Wins** (Can be done anytime):
- [ ] Extract reusable LoadingScreen component
- [ ] Create ErrorBoundary for graceful error handling
- [ ] Implement design tokens for consistent spacing/typography
- [ ] Add PropTypes/TypeScript validation for all components
- [ ] Document component usage in CLAUDE.md

**Medium-Term Refactors**:
- [ ] Migrate from individual useState calls to useReducer for complex state
- [ ] Implement React Query for server state management (replace custom hooks)
- [ ] Add Suspense boundaries for code splitting
- [ ] Optimize transaction list rendering (virtualization for 1000+ items)
- [ ] Create storybook for component documentation

**Long-Term Architecture**:
- [ ] Offline-first architecture (local-first database sync)
- [ ] Background transaction sync (iOS background tasks)
- [ ] Push notifications for budget alerts (opt-in only)
- [ ] Widget support (iOS home screen budget summary)

---

### Known Issues & Blockers

**Critical Bugs**:
1. **Settlement workflow**: Editing transaction to shared doesn't create splits (Priority 1)
   - Root cause: Mutation logic not checking for personal→shared transition
   - Fix in progress: Add conditional logic to trigger split calculation

2. **Transaction color consistency**: Hardcoded colors break glassmorphism theme
   - Root cause: Components not using GlassCard wrapper
   - Fix in progress: Refactor all transaction components to use design system

**TypeScript Errors**:
3. Property mismatch errors between InstantDB types and component props
   - Temporary workaround: Type assertions (not ideal)
   - Long-term fix: Align InstantDB schema types with component interfaces

**Performance Concerns**:
4. Composite query approach broke existing functionality (reverted)
   - Lesson learned: Incremental optimizations safer than aggressive refactors
   - Future approach: Profile before optimizing, change one query at a time

**UX Decisions Pending**:
5. Authentication method (biometric vs. password-only)
   - Current: Email/password only (Phase 1)
   - Future: Add Face ID/Touch ID option (Phase 2-3)
   - Blocker: Need to research InstantDB biometric auth support

---

### Metrics to Track Post-Launch

**User Activation**:
- Time to first budget created
- % of users who complete onboarding
- Average number of transactions in first week

**Engagement**:
- Daily active users (DAU)
- % of users with 10+ transactions per month
- Budget adherence rate (stayed within budget)

**Household Sharing Adoption**:
- % of users who invite household member
- % of invited members who accept
- Average expense split ratio (validate 60/40, 70/30 hypothesis)

**Retention**:
- Day 1, 7, 30, 90 retention rates
- Churn reasons (exit survey)

**Technical Health**:
- App crash rate (<0.1% target)
- Average API latency (InstantDB queries)
- Error rate by feature

---

## References

### Primary Development Documentation

**CLAUDE.md** (In Repository):
- Comprehensive design principles and component patterns
- Development guidelines optimized for Claude Code integration
- Code examples and anti-patterns
- **Status**: Primary reference for all AI development assistants

### External Documentation

**Frameworks & Tools**:
- [React Native Documentation](https://reactnative.dev/) - Core framework
- [Expo Documentation](https://docs.expo.dev/) - Build and deployment
- [InstantDB Documentation](https://instantdb.com/docs) - Real-time database
- [TypeScript Handbook](https://www.typescriptlang.org/docs/) - Language reference
- [Material 3 Design](https://m3.material.io/) - Design system foundation

**Swiss Regulations & Standards**:
- [Swiss Federal Data Protection Act (FADP)](https://www.admin.ch/gov/en/start/documentation/legislation/federal-data-protection-act.html) - Privacy compliance
- [GDPR Official Text](https://gdpr-info.eu/) - EU data protection (for reference)
- [Swiss Open Banking Standards] - *To be researched for Phases 3-4*

**Design Resources**:
- [Swiss Currency Formatting](https://www.eda.admin.ch/aboutswitzerland/en/home/wirtschaft/taetigkeitsgebiete/der-schweizer-franken.html) - Official formatting rules
- [iOS Human Interface Guidelines](https://developer.apple.com/design/human-interface-guidelines/ios) - Platform conventions

### Internal Resources (To Be Created)

**User Research**:
- [ ] User persona documentation (based on target market research)
- [ ] User journey maps for Phase 2 features (household sharing)
- [ ] Usability testing reports (post-beta launch)

**Analytics & Dashboards**:
- [ ] Key metrics dashboard (Mixpanel or Amplitude setup)
- [ ] User feedback collection system (in-app surveys)
- [ ] A/B testing framework for UX improvements

**Legal & Compliance**:
- [ ] Privacy policy (drafted by Swiss legal counsel)
- [ ] Terms of Service
- [ ] Data Processing Agreements (with InstantDB, Expo, future Open Banking API)

---

### Contact & Support

**Development Team**:
- Primary Developer: Alexander
- IDE: VS Code with Claude Code integration
- Development Environment: macOS with iOS Simulator

**User Feedback Channels**:
- GitHub Issues: [Link to repository] (for bug reports)
- In-App Feedback: *To be implemented in Phase 2* (help → send feedback)
- Email: feedback@flowapp.ch *(placeholder)*

**Community**:
- Beta Tester Group: *To be created* (TestFlight distribution)
- Swiss User Community: *Planned for post-launch* (Discord or Reddit)

---

### Version History

**v0.1.0 (Current)** - Phase 1 Foundation (85% Complete)
- Zero-based budgeting with 50/30/20 framework
- Payday-based budget periods
- Swiss currency formatting
- Transaction CRUD operations
- Privacy-scoped database queries

**v0.2.0 (Planned March 2025)** - Phase 2 Household Sharing
- Household invitation and setup
- Customizable split ratios (60/40, 70/30, etc.)
- Expense settlement workflow
- Recurring expense templates
- Transaction screens with glassmorphism UI

**v1.0.0 (Planned Q4 2025)** - Public Launch
- All Phase 1-2 features stable and tested
- Performance optimized (all benchmarks met)
- Security audit completed
- FADP compliance verified
- App Store submission and approval

**v2.0.0 (Planned 2026)** - Swiss Open Banking
- Automatic transaction import
- Bank account synchronization
- ML-based categorization suggestions
- Enhanced insights and trends

---

### Appendix: Design Tokens

**Colors** (from `src/constants/colors.ts`):
```typescript
export const colors = {
  primary: {
    main: '#2C5F5D',      // Deep Teal
    light: '#3A7673',
    dark: '#1F4745',
  },
  secondary: {
    main: '#A8B5A1',      // Sage Green
    light: '#B8C4B1',
    dark: '#8A9784',
  },
  accent: {
    main: '#E3A05D',      // Soft Amber
    light: '#E8B17D',
    dark: '#D18A3D',
  },
  background: {
    primary: '#FFFFFF',
    secondary: '#F5F5F5',
    tertiary: '#E8E8E8',
  },
  text: {
    primary: '#1A1A1A',
    secondary: '#666666',
    tertiary: '#999999',
    inverse: '#FFFFFF',
  },
  status: {
    success: '#A8B5A1',   // Sage Green (calm positive)
    warning: '#E3A05D',   // Soft Amber (gentle alert)
    error: '#D18A3D',     // Darker Amber (no harsh red!)
    info: '#2C5F5D',      // Deep Teal
  },
};
```

**Spacing** (from `src/constants/spacing.ts`):
```typescript
export const spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
};
```

**Typography** (from `src/constants/typography.ts`):
```typescript
export const typography = {
  h1: { fontSize: 32, fontWeight: '700', lineHeight: 40 },
  h2: { fontSize: 24, fontWeight: '600', lineHeight: 32 },
  h3: { fontSize: 20, fontWeight: '600', lineHeight: 28 },
  body: { fontSize: 16, fontWeight: '400', lineHeight: 24 },
  bodyBold: { fontSize: 16, fontWeight: '600', lineHeight: 24 },
  caption: { fontSize: 14, fontWeight: '400', lineHeight: 20 },
  small: { fontSize: 12, fontWeight: '400', lineHeight: 16 },
};
```

---

**Document Version**: 1.0  
**Last Updated**: February 8, 2026  
**Maintained By**: Alexander (Flow Founder & Lead Developer)  
**Next Review**: After Phase 2 completion (March 2025)

---

*This document is the single source of truth for Flow development. All AI assistants, developers, and stakeholders should reference this document before making product decisions or technical implementations.*
