# Flow - Technical Specifications
*Comprehensive Technical Reference for Development*

**Version**: 2.1 (Updated)  
**Last Updated**: February 8, 2026  
**Platform**: iOS (React Native/Expo)  
**Target**: iPhone (iOS 15+)

---

## Table of Contents

1. [Architecture Overview](#architecture-overview)
2. [Technology Stack](#technology-stack)
3. [File & Folder Structure](#file--folder-structure)
4. [Navigation Architecture](#navigation-architecture)
5. [Database Structure](#database-structure)
6. [API Layer](#api-layer)
7. [Authentication System](#authentication-system)
8. [Data Flow Patterns](#data-flow-patterns)
9. [Third-Party Services](#third-party-services)
10. [Security Implementation](#security-implementation)
11. [Performance Optimization](#performance-optimization)
12. [Development Guidelines](#development-guidelines)
13. [Deployment Configuration](#deployment-configuration)

---

## Architecture Overview

### High-Level Architecture

Flow uses a **client-side architecture** where all business logic runs on the user's iPhone. There is no traditional backend server—instead, we use InstantDB as a real-time database that syncs data between devices.

```
┌─────────────────────────────────────────┐
│         User's iPhone (Client)          │
│  ┌──────────────────────────────────┐  │
│  │   React Native App (Flow)        │  │
│  │  ┌─────────────┐  ┌───────────┐ │  │
│  │  │ UI Layer    │  │ Business  │ │  │
│  │  │ (Screens &  │←→│ Logic     │ │  │
│  │  │ Components) │  │ (API Lib) │ │  │
│  │  └─────────────┘  └───────────┘ │  │
│  │         ↕                         │  │
│  │  ┌─────────────────────────────┐ │  │
│  │  │  State Management Layer     │ │  │
│  │  │  (React Query + InstantDB)  │ │  │
│  │  └─────────────────────────────┘ │  │
│  └──────────────────────────────────┘  │
│                 ↕                       │
│     ┌─────────────────────┐            │
│     │  Local Storage      │            │
│     │  (SecureStore)      │            │
│     └─────────────────────┘            │
└─────────────────────────────────────────┘
                ↕
    ┌──────────────────────┐
    │   InstantDB Cloud    │
    │   (Real-time DB)     │
    └──────────────────────┘
```

### Key Architectural Principles

1. **Client-Side First**: All calculations (budgets, splits, settlements) happen on the user's device
2. **Real-Time Sync**: InstantDB provides instant synchronization between household members
3. **Privacy by Design**: Each query is scoped to `userId` or `householdId` to prevent data leaks
4. **Optimistic Updates**: UI updates immediately, then syncs to database in background
5. **Zero-Based Budgeting**: Budget resets every payday period (no rollover)
6. **Timeless Budgets**: Budget periods calculated dynamically (not stored in database)

### Simple Explanation (Non-Technical)

Think of Flow like a smart notebook that lives on your phone:
- When you add a transaction, it's written in your notebook immediately
- If you have a household partner, their notebook automatically gets a copy of shared expenses
- All the math (budgets, splits, balances) is calculated by your phone, not a server
- Your data is stored in a secure cloud database (InstantDB) but only you can access it
- Budget periods adjust automatically when you change your payday (no manual reset needed)

---

## Technology Stack

### Core Technologies

| Technology | Version | Purpose | Why We Chose It |
|------------|---------|---------|-----------------|
| **React Native** | 0.76.7 | Mobile app framework | Industry standard for iOS/Android apps with one codebase |
| **Expo** | SDK 53 | Development platform | Simplifies iOS development (no Xcode needed), provides useful tools |
| **TypeScript** | 5.x (strict mode) | Programming language | Catches bugs early, makes code easier to understand and maintain |
| **InstantDB** | Latest | Real-time database | Perfect for household sharing (instant sync), simpler than Firebase |
| **NativeWind** | 4.x | Styling (Tailwind CSS) | Fast styling with utility classes, works great with Material Design 3 |
| **React Query** | 5.x | Data fetching/caching | Handles loading states, caching, optimistic updates automatically |

### Supporting Libraries

| Library | Purpose |
|---------|---------|
| `expo-router` | File-based navigation (screens organized by folder structure) |
| `expo-local-authentication` | Face ID / Touch ID for biometric login |
| `expo-secure-store` | Encrypted storage for auth tokens |
| `lucide-react-native` | Icon library (clean, consistent icons) |
| `react-hook-form` | Form validation and handling |
| `date-fns` | Date manipulation (budget periods, payday calculations) |
| `zustand` | Lightweight state management (user preferences, UI state) |

### Why InstantDB Over Firebase?

We evaluated several database options and chose InstantDB because:

1. **Simpler Setup**: No complex security rules to configure
2. **Real-Time by Default**: Built for collaborative apps like Flow
3. **Better Developer Experience**: Cleaner API, easier to query related data
4. **Type Safety**: Generated TypeScript types from schema
5. **Cost Effective**: More predictable pricing than Firebase

**Trade-off**: InstantDB is newer (less mature) than Firebase, but the developer experience and real-time features outweigh this risk for our use case.

---

## File & Folder Structure

### Complete Project Structure

```
flow-app/
├── mobile/                          # React Native app (Expo)
│   ├── src/
│   │   ├── app/                     # Screens (file-based routing)
│   │   │   ├── (tabs)/              # Tab navigation screens
│   │   │   │   ├── _layout.tsx      # Tab navigator configuration
│   │   │   │   ├── index.tsx        # Dashboard (home screen)
│   │   │   │   ├── transactions.tsx # Transaction list screen
│   │   │   │   ├── budget.tsx       # Budget allocation screen
│   │   │   │   └── settings.tsx     # Settings & profile screen
│   │   │   │
│   │   │   ├── transactions/        # Transaction management
│   │   │   │   ├── add.tsx          # Add new transaction modal
│   │   │   │   ├── [id]/            # Dynamic routes
│   │   │   │   │   └── edit.tsx     # Edit transaction by ID
│   │   │   │   └── index.tsx        # Transaction list (full screen)
│   │   │   │
│   │   │   ├── wallets/             # Wallet (account) management
│   │   │   │   ├── add.tsx          # Add new wallet
│   │   │   │   ├── [id]/edit.tsx    # Edit wallet
│   │   │   │   └── index.tsx        # Wallet list
│   │   │   │
│   │   │   ├── budget/              # Budget setup & management
│   │   │   │   ├── setup.tsx        # Initial budget setup (onboarding)
│   │   │   │   ├── allocate.tsx     # Adjust budget allocations
│   │   │   │   └── history.tsx      # Budget snapshots (past periods)
│   │   │   │
│   │   │   ├── settlement/          # Household expense settlement
│   │   │   │   ├── index.tsx        # Settle Up screen
│   │   │   │   └── history.tsx      # Past settlements
│   │   │   │
│   │   │   ├── settings/            # Settings & configuration
│   │   │   │   ├── index.tsx        # Main settings menu
│   │   │   │   ├── household.tsx    # Household management
│   │   │   │   ├── invite.tsx       # Invite household member
│   │   │   │   ├── income.tsx       # Income detection settings (US-061)
│   │   │   │   ├── payday.tsx       # Payday configuration
│   │   │   │   ├── profile.tsx      # User profile
│   │   │   │   └── security.tsx     # Security settings (biometric)
│   │   │   │
│   │   │   ├── auth/                # Authentication screens
│   │   │   │   ├── login.tsx        # Magic code login
│   │   │   │   ├── signup.tsx       # User registration
│   │   │   │   └── verify.tsx       # Email verification
│   │   │   │
│   │   │   ├── onboarding/          # First-time user flow
│   │   │   │   ├── welcome.tsx      # Welcome screen
│   │   │   │   ├── payday.tsx       # Set payday date
│   │   │   │   ├── currency.tsx     # Select currency (CHF/EUR/USD)
│   │   │   │   └── budget-intro.tsx # Intro to zero-based budgeting
│   │   │   │
│   │   │   └── _layout.tsx          # Root layout (wraps entire app)
│   │   │
│   │   ├── components/              # Reusable UI components
│   │   │   ├── ui/                  # Base UI components
│   │   │   │   ├── GlassCard.tsx    # Glassmorphism card (primary component)
│   │   │   │   ├── Button.tsx       # Primary/secondary buttons
│   │   │   │   ├── Input.tsx        # Text input with validation
│   │   │   │   ├── LoadingScreen.tsx # Full-screen loading indicator
│   │   │   │   ├── ErrorBoundary.tsx # Error handling wrapper
│   │   │   │   └── EmptyState.tsx   # Empty state illustrations
│   │   │   │
│   │   │   ├── navigation/          # Navigation components
│   │   │   │   ├── FloatingTabBar.tsx      # Floating island nav + sliding bubble (TECH-010)
│   │   │   │   ├── MorphingBlob.tsx        # UNUSED (kept for reference)
│   │   │   │   ├── useTabPositions.ts      # UNUSED (kept for reference)
│   │   │   │   ├── useTabSwipeGesture.ts   # Swipe gesture handler
│   │   │   │   └── useReducedMotion.ts     # Accessibility hook
│   │   │   │
│   │   │   ├── dashboard/           # Dashboard widgets
│   │   │   │   ├── WalletSummary.tsx      # Total balance widget
│   │   │   │   ├── WeeklyAllowance.tsx    # Needs/Wants/Savings progress
│   │   │   │   ├── BudgetProgress.tsx     # 50/30/20 breakdown
│   │   │   │   ├── RecentTransactions.tsx # Last 5 transactions
│   │   │   │   ├── DebtBalance.tsx        # Settlement balance (Phase 2)
│   │   │   │   ├── IncomeProgress.tsx     # Income detection widget (US-068)
│   │   │   │   └── RecurringExpensesWidget.tsx # Due recurring expenses
│   │   │   │
│   │   │   ├── transactions/        # Transaction components
│   │   │   │   ├── TransactionCard.tsx    # Single transaction display
│   │   │   │   ├── TransactionList.tsx    # Virtualized list
│   │   │   │   ├── TransactionForm.tsx    # Add/edit form
│   │   │   │   ├── CategoryPicker.tsx     # Category selection
│   │   │   │   ├── WalletPicker.tsx       # Wallet selection
│   │   │   │   ├── DatePicker.tsx         # Date selection (payday-aware)
│   │   │   │   └── SharedToggle.tsx       # Shared expense toggle
│   │   │   │
│   │   │   ├── budget/              # Budget components
│   │   │   │   ├── CategoryCard.tsx       # Budget category display
│   │   │   │   ├── AllocationSlider.tsx   # Budget allocation slider
│   │   │   │   ├── BudgetSummary.tsx      # Total allocated/spent
│   │   │   │   └── PaydayIndicator.tsx    # Payday countdown (US-065)
│   │   │   │
│   │   │   ├── settlement/          # Settlement components
│   │   │   │   ├── SplitPreview.tsx       # Split ratio preview
│   │   │   │   ├── SettlementCard.tsx     # Unsettled expense card
│   │   │   │   └── SettlementHistory.tsx  # Past settlements
│   │   │   │
│   │   │   └── shared/              # Shared utilities
│   │   │       ├── BottomSheet.tsx        # Modal bottom sheet
│   │   │       ├── ConfirmDialog.tsx      # Confirmation dialogs
│   │   │       └── Toast.tsx              # Toast notifications
│   │   │
│   │   ├── lib/                     # Core libraries & utilities
│   │   │   ├── db.ts                # InstantDB setup & schema
│   │   │   ├── auth-api.ts          # Authentication functions
│   │   │   ├── transactions-api.ts  # Transaction CRUD
│   │   │   ├── budgets-api.ts       # Budget calculations
│   │   │   ├── wallets-api.ts       # Wallet management
│   │   │   ├── household-api.ts     # Household & invites
│   │   │   ├── settlement-api.ts    # Settlement workflow
│   │   │   ├── income-api.ts        # Income detection (US-063)
│   │   │   └── recurring-api.ts     # Recurring expense templates
│   │   │
│   │   ├── hooks/                   # Custom React hooks
│   │   │   ├── useAuth.ts           # Authentication state
│   │   │   ├── useHousehold.ts      # Household data
│   │   │   ├── useTransactions.ts   # Transaction queries
│   │   │   ├── useBudget.ts         # Budget calculations
│   │   │   ├── useWallets.ts        # Wallet queries
│   │   │   ├── useSettlement.ts     # Settlement balance
│   │   │   └── useIncome.ts         # Income detection (US-061-063)
│   │   │
│   │   ├── utils/                   # Utility functions
│   │   │   ├── currency.ts          # Swiss currency formatting
│   │   │   ├── dates.ts             # Payday period calculations
│   │   │   ├── splits.ts            # Split ratio calculations
│   │   │   ├── budgets.ts           # Budget snapshot logic
│   │   │   └── validation.ts        # Form validation
│   │   │
│   │   ├── constants/               # Design tokens & config
│   │   │   ├── colors.ts            # Color palette (#2C5F5D, #A8B5A1, #E3A05D)
│   │   │   ├── spacing.ts           # Spacing scale (4px, 8px, 16px...)
│   │   │   ├── typography.ts        # Font sizes, weights
│   │   │   └── config.ts            # App configuration
│   │   │
│   │   ├── types/                   # TypeScript type definitions
│   │   │   ├── models.ts            # Data models (Transaction, Budget, etc.)
│   │   │   ├── api.ts               # API response types
│   │   │   └── navigation.ts        # Navigation param types
│   │   │
│   │   └── store/                   # Zustand state stores
│   │       ├── auth-store.ts        # Auth state
│   │       ├── ui-store.ts          # UI preferences
│   │       └── settings-store.ts    # User settings
│   │
│   ├── assets/                      # Static assets
│   │   ├── images/
│   │   │   ├── logo.png
│   │   │   ├── onboarding/
│   │   │   └── empty-states/
│   │   └── fonts/
│   │       └── (custom fonts if needed)
│   │
│   ├── __tests__/                   # Test files (mirrors src/)
│   │   ├── utils/
│   │   │   ├── currency.test.ts
│   │   │   ├── dates.test.ts
│   │   │   └── splits.test.ts
│   │   └── components/
│   │       └── (component tests)
│   │
│   ├── app.json                     # Expo configuration
│   ├── package.json                 # Dependencies
│   ├── tsconfig.json                # TypeScript config
│   ├── tailwind.config.js           # Tailwind CSS config
│   ├── babel.config.js              # Babel transpiler config
│   └── README.md                    # Project documentation
│
├── docs/                            # Documentation
│   ├── project-plan.md              # Project roadmap
│   ├── user-stories.md              # User stories
│   ├── technical-specs.md           # This file
│   └── CLAUDE.md                    # Claude Code guidelines
│
└── .env                             # Environment variables (not in git)
    └── EXPO_PUBLIC_INSTANTDB_APP_ID
```

### File Naming Conventions

- **Screens**: `kebab-case.tsx` (e.g., `add-transaction.tsx`)
- **Components**: `PascalCase.tsx` (e.g., `GlassCard.tsx`)
- **Utilities**: `camelCase.ts` (e.g., `formatCurrency.ts`)
- **Types**: `PascalCase` interfaces (e.g., `Transaction`, `Budget`)
- **Hooks**: `useCamelCase.ts` (e.g., `useTransactions.ts`)

---

## Navigation Architecture

### Floating Island Navigation Bar (TECH-010)

Flow uses a **floating pill-shaped navigation bar** with glassmorphism effects and smooth spring animations. The bar floats above the screen content with 16px margins, creating a premium "island" effect.

#### Architecture Overview

```
+----------------------------------------+
|          Screen Content                |
|  (Dashboard/Transactions/Analytics)    |
|                                        |
+----------------------------------------+
         v (Sits on top)
+----------------------------------------+
|  FloatingTabBar (Container)            |
|  +----------------------------------+  |
|  | BlurView (60px, borderRadius 100)|  |
|  |  [Sliding Bubble] (70x48, abs)  |  |  <-- Animated sage gradient
|  |  [Tab Row: 5 equal flex slots]  |  |  <-- Icons only, no labels
|  +----------------------------------+  |
|  +-- paddingBottom: insets.bottom      |  <-- Safe area
+----------------------------------------+
```

#### Component Hierarchy

**FloatingTabBar.tsx** (Main component - self-contained)
- Renders sliding bubble as sibling of tab row (NOT inside it)
- Tab row contains EXACTLY 5 plain `View` children (`flex: 1`)
- Manages drag-to-select + swipe gestures via `Gesture.Race`
- Uses `onLayout` to measure tab row for accurate bubble positioning
- Coordinates all animations (bubble spring, icon scale, breathing)

**useTabSwipeGesture.ts** (Swipe handler)
- Enables left/right swipe navigation between adjacent tabs
- Thresholds: 500 pts/sec velocity OR 100px distance
- Provides haptic feedback on swipe

**useReducedMotion.ts** (Accessibility)
- Detects system reduced motion preference
- Switches spring animations to timing animations
- Reduces animation duration (400ms -> 150ms)
- Disables breathing pulse effect

**MorphingBlob.tsx** / **useTabPositions.ts** (UNUSED - kept for reference)
- These files exist but are NOT imported by FloatingTabBar
- Replaced by inline sliding bubble with `onLayout` measurement

#### Key Implementation Details

**1. Tab Row Layout Rule**
```typescript
// CRITICAL: tabsRow has EXACTLY 5 plain View children
// The sliding bubble is a SIBLING, not inside tabsRow
<BlurView style={styles.blurContainer}>
  <View style={styles.overlay} />
  <Animated.View style={[styles.slidingBubble, bubbleStyle]} />  {/* Sibling */}
  <View style={styles.tabsRow} onLayout={handleRowLayout}>
    {state.routes.map((route, index) => (
      <View key={route.key} style={styles.tabSlot}>   {/* Plain View */}
        <Pressable style={styles.pressable}>
          <MemoizedAnimatedTabIcon ... />
        </Pressable>
      </View>
    ))}
  </View>
</BlurView>
```

**Why this structure?** Placing an `Animated.View` inside the flex row caused it to be counted as a 6th flex child despite `position: absolute`, breaking the 5-column layout.

**2. Bubble Positioning (onLayout)**
```typescript
// Measure actual tab row dimensions
const [rowLayout, setRowLayout] = useState({ x: 0, width: containerWidth });
const handleRowLayout = useCallback((e) => {
  const { x, width } = e.nativeEvent.layout;
  setRowLayout({ x, width });
}, []);

// Calculate target position from measured layout
const slotWidth = rowLayout.width / state.routes.length;
const targetX = rowLayout.x + slotWidth * state.index
              + slotWidth / 2 - BUBBLE_WIDTH / 2;

// Animate with spring
bubbleX.value = withSpring(targetX, {
  damping: 15, stiffness: 150, mass: 0.8,
});
```

**3. Safe Area Handling**
```typescript
<View style={[styles.container, { paddingBottom: insets.bottom }]}>
  <BlurView style={{ height: 60, borderRadius: 100 }}>
    {/* Content */}
  </BlurView>
</View>
```
Glass effect stops at 60px (clean pill shape). Safe area padding creates invisible gap below, so the bar "floats" above the home indicator.

**4. Scroll Padding for All Screens**

Every tab screen must account for the navigation bar to prevent content overlap:

```typescript
contentContainerStyle={{
  paddingBottom: 60 + insets.bottom + 40
  // 60px = nav bar height
  // insets.bottom = safe area
  // 40px = visual gap
}}
```

Applied to:
- `/src/app/(tabs)/index.tsx` (Dashboard)
- `/src/app/(tabs)/transactions.tsx`
- `/src/app/(tabs)/analytics.tsx`
- `/src/app/(tabs)/settings.tsx`

**5. Drag-to-Select Gesture**
```typescript
// Pan gesture enables dragging finger across tabs to select
const dragGesture = Gesture.Pan()
  .onStart((event) => {
    const tabIndex = calculateTabFromPosition(event.x);
    draggedOverTabIndex.value = tabIndex;
    runOnJS(triggerHaptic)(Light);
  })
  .onUpdate((event) => {
    const tabIndex = calculateTabFromPosition(event.x);
    if (tabIndex !== draggedOverTabIndex.value) {
      draggedOverTabIndex.value = tabIndex;
      runOnJS(triggerHaptic)(Light);
    }
  })
  .onEnd(() => {
    const targetIndex = draggedOverTabIndex.value;
    runOnJS(triggerHaptic)(Medium);
    runOnJS(navigateToTab)(targetIndex);
  });

// Combined with swipe: first gesture to activate wins
const combinedGesture = Gesture.Race(dragGesture, swipeGesture);
```

#### Design Specifications

| Property | Value | Reasoning |
|----------|-------|-----------|
| Container height | 60px | Optimal for 44pt touch targets |
| Bubble dimensions | 70 x 48px | Proportional to container, pill-shaped |
| Icon size (inactive) | 24px | Standard iOS icon size |
| Icon size (active) | 28px | 17% larger (noticeable but not jarring) |
| Icon size (drag hover) | 26px | Intermediate feedback during drag |
| Border radius | 100px | Creates perfect pill shape |
| Side margins | 16px | Floating appearance |
| Blur intensity | 50 | Subtle glassmorphism |
| Active scale | 1.1 | 10% larger |
| Breathing range | 1.0 - 1.05 | Subtle pulse, not distracting |
| Bubble spring | `{ damping: 15, stiffness: 150, mass: 0.8 }` | Smooth, responsive |

#### Accessibility Features

1. **VoiceOver Support**
   - Each tab announces: "Dashboard, tab 1 of 5"
   - Accessibility hint: "Double tap to navigate to Dashboard screen"
   - Selected state properly communicated

2. **Reduced Motion**
   - Detects system reduced motion preference
   - Replaces spring animations with timing animations
   - Disables breathing pulse effect
   - Faster animation duration (150ms vs 400ms)

3. **Touch Targets**
   - Each tab slot is `flex: 1` (minimum ~68px wide on iPhone SE)
   - Pressable area extends full 60px height of navigation bar

4. **Haptic Feedback**
   - Light impact on drag start and tab hover
   - Medium impact on successful tab selection
   - Confirms action without visual attention

#### Performance Considerations

- **60fps Animations**: Uses `react-native-reanimated` (runs on UI thread)
- **Memoization**: `MemoizedAnimatedTabIcon = memo(AnimatedTabIcon)` prevents re-renders
- **onLayout Caching**: Tab row measurements cached in state, not recalculated per frame
- **Gesture.Race**: Ensures only one gesture type activates per interaction
- **useAnimatedReaction**: Efficiently bridges shared values to React state for drag-over index

#### Future Enhancements (Deferred)

- [ ] Long-press menu on tabs (quick actions)
- [ ] Badge notifications on tabs
- [ ] Customizable tab order
- [ ] Dynamic tab hiding based on user preferences
- [ ] Entrance animation on app launch

---

## Database Structure

### InstantDB Schema Overview

InstantDB uses a **graph-based schema** where entities (tables) are connected by relationships (links). Think of it like a web of connected data rather than separate tables.

### Critical Architectural Change: "Timeless Budgets"

**THE BIG CHANGE**: Budget periods are now **calculated dynamically** from `householdMembers.paydayDay`, not stored in the database.

**Why This Change**:
- **Previous Problem**: When users changed their payday, budgets had old `periodStart`/`periodEnd` dates stored → queries failed → budgets showed CHF 0 spent
- **Solution**: Remove period dates from budgets entirely → calculate periods on-the-fly when querying transactions

**Before (BROKEN)**:
```typescript
budgets: {
  periodStart: "2025-12-25",  // ❌ Stored in database
  periodEnd: "2026-01-24",    // ❌ Stored in database
  allocatedAmount: 500
}

// Query failed when user changed payday to 6th
// New period: "2026-01-06" to "2026-02-05"
// But stored period: "2025-12-25" to "2026-01-24"
// No match → CHF 0 spent!
```

**After (FIXED)**:
```typescript
budgets: {
  allocatedAmount: 500,       // ✅ Only allocation stored
  isActive: true              // ✅ One budget per category
}

// Period calculated dynamically from paydayDay
const period = calculateCurrentPeriod(member.paydayDay, today);
// Then filter transactions by calculated period
```

---

### Core Entities (Tables)

#### Users
Stores user account information.

```typescript
users: {
  id: string;                    // UUID (auto-generated)
  email: string;                 // User's email (unique)
  name: string;                  // Display name
  emailVerified: boolean;        // Email confirmation status
  isActive: boolean;             // Account active/inactive
  createdAt: number;             // Unix timestamp
}
```

**Privacy**: Each user can only query their own record (scoped by InstantDB auth).

---

#### Households
Represents a household (individual or shared).

```typescript
households: {
  id: string;                    // UUID
  name: string;                  // e.g., "Alexander's Household"
  currency: string;              // "CHF" | "EUR" | "USD"
  paydayDay?: number;            // OPTIONAL - Day of month (1-31, or -1 for last day)
                                 // LEGACY FIELD - now stored in householdMembers
  splitMethod?: string;          // OPTIONAL - "manual" | "automatic" (US-067)
  manualSplitRatios?: json;      // OPTIONAL - { userId1: 60, userId2: 40 }
}
```

**Business Rules**:
- One household per user in Phase 1-2
- Currency cannot change after first transaction
- `paydayDay = -1` means "last day of month" (handles Feb 28/29)
- **Source of Truth for Payday**: Now in `householdMembers.paydayDay` (per-member)

---

#### HouseholdMembers
Links users to households (membership table).

```typescript
householdMembers: {
  id: string;                    // UUID
  householdId: string;           // Foreign key → households
  userId: string;                // Foreign key → users
  status: string;                // "active" | "inactive" | "removed"
  role?: string;                 // OPTIONAL - "admin" | "member"
  paydayDay?: number;            // OPTIONAL - User's personal payday (SOURCE OF TRUTH)
  removedAt?: number;            // OPTIONAL - Timestamp when removed (soft delete)
  removedBy?: string;            // OPTIONAL - userId of admin who removed
}
```

**Relationships**:
- User → HouseholdMembers (one-to-many)
- Household → HouseholdMembers (one-to-many)

**Phase 2 Limit**: Maximum 2 members per household

**IMPORTANT**: `paydayDay` in this table is the **source of truth** for budget period calculations (not household.paydayDay)

---

#### Accounts (Wallets)
Bank accounts, cash, credit cards tracked by user.

```typescript
accounts: {
  id: string;                    // UUID
  userId: string;                // Owner (not householdId - wallets are personal)
  name: string;                  // e.g., "UBS Checking", "Cash"
  institution: string;           // "UBS" | "Revolut" | "PostFinance" | "Cash" | "Other"
  accountType: string;           // "checking" | "savings" | "credit" | "cash"
  balance: number;               // Current balance (calculated from transactions)
  currency: string;              // "CHF" (matches household currency)
  last4Digits?: string;          // OPTIONAL - Last 4 digits (for display)
  isDefault: boolean;            // Default wallet for new transactions
  isActive: boolean;             // Active/archived
  isExcludedFromBudget?: boolean; // OPTIONAL - Exclude from budget calculations
}
```

**Important**: 
- Wallet balances are **calculated** from transactions, not manually editable
- `isExcludedFromBudget` allows savings accounts to be tracked without affecting budget

---

#### Categories
Budget categories (Groceries, Rent, Dining Out, etc.).

```typescript
categories: {
  id: string;                    // UUID
  householdId: string;           // Shared within household
  name: string;                  // "Groceries", "Rent", "Dining Out"
  type: string;                  // "income" | "expense"
  categoryGroup: string;         // "needs" | "wants" | "savings" | "income" | "other"
  isShareable: boolean;          // Can be used for shared expenses
  isDefault: boolean;            // Pre-configured (vs. user-created)
  createdByUserId?: string;      // OPTIONAL - Creator (for custom categories)
  isActive: boolean;             // Active/archived
}
```

**Default Categories** (created on household setup):
- **Income**: Salary, Bonus, Gift, Other Income
- **Needs (50%)**: Rent, Groceries, Utilities, Transportation, Insurance, Healthcare
- **Wants (30%)**: Dining Out, Entertainment, Hobbies, Shopping, Subscriptions
- **Savings (20%)**: Emergency Fund, Investments, Savings

**Shareable**: Only categories marked `isShareable: true` can be used for shared expenses.

---

#### CategoryGroups 🆕 NEW TABLE
Custom category groupings (extends default Needs/Wants/Savings).

```typescript
categoryGroups: {
  id: string;                    // UUID
  householdId: string;           // Household
  key: string;                   // "needs" | "wants" | "savings" | custom key
  name: string;                  // Display name (e.g., "Needs", "Custom Group")
  type: string;                  // "expense" | "income"
  icon?: string;                 // OPTIONAL - Icon identifier
  color?: string;                // OPTIONAL - Custom color
  isDefault: boolean;            // true for needs/wants/savings; false for custom
  displayOrder?: number;         // OPTIONAL - For sorting in UI
  isActive: boolean;             // Active/archived
  createdByUserId?: string;      // OPTIONAL - Creator
  createdAt: number;             // Unix timestamp
  updatedAt: number;             // Last edit timestamp
}
```

**Purpose**: Allows users to create custom category groups beyond 50/30/20 framework (Phase 2+)

---

#### Transactions
Income and expense records.

```typescript
transactions: {
  id: string;                    // UUID
  userId: string;                // Creator (who entered transaction)
  householdId: string;           // For household queries
  accountId: string;             // Which wallet (foreign key → accounts)
  categoryId: string;            // Budget category (foreign key → categories)
  type: string;                  // "income" | "expense"
  amount: number;                // Amount in CHF (positive for income, negative for expense)
  date: string;                  // ISO format "YYYY-MM-DD"
  note?: string;                 // OPTIONAL - Description
  payee?: string;                // OPTIONAL - Merchant/vendor (e.g., "Migros", "Netflix")
  isShared: boolean;             // Shared expense (household feature)
  paidByUserId?: string;         // OPTIONAL - Who paid (for shared expenses)
  isExcludedFromBudget?: boolean; // OPTIONAL - Exclude from budget calculations
  
  // Settlement tracking
  settled?: boolean;             // OPTIONAL - true if expense has been settled
  settledAt?: number;            // OPTIONAL - Timestamp when settled
  settlementId?: string;         // OPTIONAL - Links to settlements.id
  
  // Recurring transaction tracking
  createdFromTemplateId?: string; // OPTIONAL - Links to recurringTemplates.id
}
```

**Business Rules**:
- Amount is **always stored as entered** (positive or negative)
- Type determines whether it's income or expense
- `isShared = true` creates ExpenseSplit records (see below)
- Personal transactions (`isShared = false`) only visible to creator
- Shared transactions visible to all household members
- Transactions with `isExcludedFromBudget = true` don't affect budget spent amounts

---

#### ExpenseSplits (SharedExpenseSplits)
Tracks who owes what for shared expenses.

```typescript
shared_expense_splits: {
  id: string;                    // UUID
  transactionId: string;         // Foreign key → transactions
  owerUserId: string;            // Who owes this portion
  owedToUserId: string;          // Who paid (owed to)
  splitAmount: number;           // Amount owed (e.g., CHF 40.00)
  splitPercentage: number;       // Percentage (e.g., 40.0 for 40%)
  isPaid: boolean;               // Settled (true) or outstanding (false)
  paidAt?: number;               // OPTIONAL - Settlement timestamp
  createdAt: number;             // When split was created
}
```

**Example**: User A buys CHF 100 groceries with 60/40 split:
1. Transaction: `amount: -100`, `paidByUserId: userA`, `isShared: true`
2. Split for User B: `owerUserId: userB`, `owedToUserId: userA`, `splitAmount: 40.00`, `splitPercentage: 40.0`, `isPaid: false`

**Settlement Workflow** (US-042):
1. User B views "Settle Up" screen → sees CHF 40 owed to User A
2. User B taps "Settle"
3. Split updated: `isPaid: true`, `paidAt: <timestamp>`
4. Settlement record created in `settlements` table

---

#### Budgets ⚠️ MAJOR CHANGE - "Timeless Budgets"
Budget allocations per category (NO period dates stored).

```typescript
budgets: {
  id: string;                    // UUID
  userId: string;                // Owner
  categoryId: string;            // Budget category
  allocatedAmount: number;       // CHF budgeted for this category
  spentAmount?: number;          // OPTIONAL - CHF spent (calculated, default 0)
  percentage: number;            // % of total income (for 50/30/20)
  categoryGroup: string;         // "needs" | "wants" | "savings" | "other"
  isActive?: boolean;            // OPTIONAL - Current budget (default true)
}
```

**REMOVED FIELDS** (from previous schema):
- ❌ `periodStart` - Removed (calculated dynamically)
- ❌ `periodEnd` - Removed (calculated dynamically)
- ❌ `householdId` - Removed (use userId for privacy)

**Why This Matters**:
- Before: Changing payday broke budgets (stored dates didn't match new periods)
- After: Budget periods calculated on-the-fly → always accurate

**Zero-Based Budgeting**: Every franc must be allocated (`sum(allocatedAmount) = totalIncome`)

---

#### BudgetSummary ⚠️ MAJOR CHANGE
Overall budget status (NO period dates stored).

```typescript
budgetSummary: {
  id: string;                    // UUID
  userId: string;                // Owner
  totalIncome: number;           // Monthly income (manual or auto-detected)
  totalAllocated: number;        // Sum of all budget allocations
  totalSpent?: number;           // OPTIONAL - Sum of all expenses (default 0)
  isActive?: boolean;            // OPTIONAL - Current budget summary
}
```

**REMOVED FIELDS** (from previous schema):
- ❌ `periodStart` - Removed (calculated dynamically)
- ❌ `periodEnd` - Removed (calculated dynamically)
- ❌ `householdId` - Removed (use userId for privacy)

**50/30/20 Framework**:
- Needs: 50% of income
- Wants: 30% of income
- Savings: 20% of income

(User can deviate from these percentages—they're suggestions, not enforced.)

---

#### RecurringTemplates 🆕 NEW TABLE
Templates for recurring expenses (NOT automatic transactions).

```typescript
recurringTemplates: {
  id: string;                    // UUID
  userId: string;                // Creator
  householdId: string;           // For household queries
  categoryId: string;            // Category
  accountId: string;             // Wallet
  name: string;                  // e.g., "Rent", "Netflix"
  amount: number;                // CHF amount
  recurringDay: number;          // Day of month (1-31)
  payee?: string;                // OPTIONAL - Merchant name
  note?: string;                 // OPTIONAL - Description
  isActive: boolean;             // Active/paused
  createdAt: number;             // Unix timestamp
  updatedAt: number;             // Last edit timestamp
}
```

**CRITICAL** (US-016): 
- Templates are **NOT** automatically created as transactions
- They appear in "Upcoming" dashboard widget when due
- User manually activates them (single tap → creates transaction)
- This prevents budget from being affected before expense actually happens
- Recurring expenses **CANNOT** be shared (personal only)

**Example Flow**:
1. User creates template: "Rent - CHF 1'200 on 1st"
2. Dashboard widget shows on Feb 1: "Rent due - CHF 1'200"
3. User taps "Add" → Creates transaction with date = Feb 1
4. Template remains for next month (March 1)

---

#### HouseholdInvites
Pending household invitations.

```typescript
household_invites: {
  id: string;                    // UUID
  householdId: string;           // Household being joined
  invitedByUserId: string;       // Admin who sent invite
  inviteToken: string;           // ⚠️ CHANGED from "inviteCode" - Unique token
  status: string;                // "pending" | "accepted" | "expired"
  expiresAt: number;             // Expiry timestamp (7 days)
  acceptedByUserId?: string;     // OPTIONAL - Who accepted
  acceptedAt?: number;           // OPTIONAL - When accepted
  createdAt: number;             // Unix timestamp
  updatedAt: number;             // Last edit timestamp
}
```

**Invitation Flow** (US-005, US-006):
1. Admin creates invite → generates `inviteToken` (unique code)
2. Admin shares token with partner (via text/email)
3. Partner enters token in app → joins household
4. Invite status changes to "accepted"

---

#### Settlements 🆕 NEW TABLE
Settlement records (internal transfers, NOT transactions).

```typescript
settlements: {
  id: string;                    // UUID
  householdId: string;           // Household
  payerUserId: string;           // Who paid
  receiverUserId: string;        // Who received
  amount: number;                // Amount in CHF
  payerAccountId: string;        // Account debited
  receiverAccountId: string;     // Account credited
  note?: string;                 // OPTIONAL - Description
  settledAt: number;             // Timestamp of settlement
  createdAt: number;             // Record creation timestamp
}
```

**CRITICAL**: Settlements are **internal transfers**, not transactions:
- ❌ **NOT** visible in transaction list
- ❌ **DO NOT** affect budget spent amounts
- ✅ **DO** update account balances (debit payer, credit receiver)
- ✅ **DO** mark ExpenseSplits as paid

**Example**:
1. User A buys CHF 100 groceries (shared 60/40)
2. User B owes CHF 40
3. User B settles → Settlement record created
4. User B's account: -CHF 40, User A's account: +CHF 40
5. Split marked `isPaid: true`
6. **No transaction created** (budget unaffected)

---

### Relationships (Links)

InstantDB uses **links** to connect entities:

```typescript
// Example: Transaction → Category relationship
transactionsByCategory: {
  forward: {
    on: 'transactions',
    has: 'one',
    label: 'category',
  },
  reverse: {
    on: 'categories',
    has: 'many',
    label: 'transactions',
  },
}
```

**What this means**:
- Each transaction has **one** category
- Each category can have **many** transactions
- In queries, you can access `transaction.category` or `category.transactions`

**Key Relationships**:
- User ↔ HouseholdMembers (one-to-many)
- Household ↔ HouseholdMembers (one-to-many)
- Household ↔ Categories (one-to-many)
- User ↔ Accounts (one-to-many)
- User ↔ Transactions (one-to-many)
- Transaction ↔ Category (many-to-one)
- Transaction ↔ Account (many-to-one)
- Transaction ↔ ExpenseSplits (one-to-many)
- Transaction ↔ RecurringTemplate (many-to-one, via `createdFromTemplateId`)
- Transaction ↔ Settlement (many-to-one, via `settlementId`)

---

### Privacy & Security Rules

**Critical**: Every query MUST be scoped to prevent data leaks.

```typescript
// ✅ CORRECT: Scoped to user
const { data } = db.useQuery({
  transactions: {
    $: { where: { userId: currentUser.id } }
  }
});

// ❌ WRONG: No scope - returns ALL users' transactions
const { data } = db.useQuery({
  transactions: {}
});
```

**InstantDB Auth**: Provides `user.id` automatically (from auth token). Always use this to scope queries.

---

### How Budget Periods Work Now (Without Stored Dates)

```typescript
// Period is calculated dynamically from paydayDay
function calculateCurrentPeriod(paydayDay: number, today: Date): {
  periodStart: string;
  periodEnd: string;
} {
  const currentDay = today.getDate();
  const year = today.getFullYear();
  const month = today.getMonth();
  
  // Handle "last day of month" (-1)
  const actualPayday = paydayDay === -1 
    ? new Date(year, month + 1, 0).getDate()
    : paydayDay;
  
  let periodStart: Date;
  let periodEnd: Date;
  
  if (currentDay >= actualPayday) {
    // Current period: This month's payday to next month's payday - 1
    periodStart = new Date(year, month, actualPayday);
    periodEnd = new Date(year, month + 1, actualPayday - 1);
  } else {
    // Previous period: Last month's payday to this month's payday - 1
    periodStart = new Date(year, month - 1, actualPayday);
    periodEnd = new Date(year, month, actualPayday - 1);
  }
  
  return {
    periodStart: periodStart.toISOString().split('T')[0],
    periodEnd: periodEnd.toISOString().split('T')[0]
  };
}

// When querying transactions for budget
const member = await getHouseholdMember(userId);
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

**This architectural change fixed the payday change bug!**

---

## API Layer

Flow uses a **functional API layer** (not REST or GraphQL). Business logic is organized into modules in `/src/lib/*-api.ts`.

### API Modules

#### 1. Authentication API (`auth-api.ts`)

```typescript
// Login with magic code
export async function loginWithCode(email: string): Promise<void>

// Verify magic code
export async function verifyCode(email: string, code: string): Promise<User>

// Logout
export async function logout(): Promise<void>

// Get current user
export function useCurrentUser(): { user: User | null, isLoading: boolean }
```

**Authentication Flow**:
1. User enters email
2. InstantDB sends magic code to email (6-digit number)
3. User enters code
4. App verifies code → receives auth token
5. Token stored in SecureStore (encrypted)
6. Biometric login available for subsequent logins

---

#### 2. Transactions API (`transactions-api.ts`)

```typescript
// Get all transactions (scoped to household)
export function useTransactions(householdId: string): Transaction[]

// Add transaction
export async function addTransaction(data: {
  amount: number;
  categoryId: string;
  accountId: string;
  date: string;
  note?: string;
  payee?: string;
  isShared: boolean;
  paidByUserId?: string;
  isExcludedFromBudget?: boolean;
}): Promise<Transaction>

// Edit transaction
export async function editTransaction(
  id: string, 
  updates: Partial<Transaction>
): Promise<Transaction>

// Delete transaction
export async function deleteTransaction(id: string): Promise<void>

// Get transactions by category
export function useTransactionsByCategory(
  categoryId: string
): Transaction[]

// Get transactions by date range
export function useTransactionsByDateRange(
  startDate: string,
  endDate: string
): Transaction[]
```

**Important Notes**:
- All mutations update wallet balances automatically
- All mutations update budget `spentAmount` if applicable
- Shared expenses automatically create ExpenseSplit records
- Optimistic updates for instant UI feedback

---

#### 3. Budgets API (`budgets-api.ts`)

```typescript
// Get current budget summary
export function useBudgetSummary(): BudgetSummary

// Get budget by category
export function useBudgetByCategory(categoryId: string): Budget

// Allocate budget (set amounts per category)
export async function allocateBudget(data: {
  totalIncome: number;
  allocations: { categoryId: string; amount: number }[];
}): Promise<void>

// Calculate budget performance
export function calculateBudgetPerformance(
  budgets: Budget[],
  transactions: Transaction[]
): {
  onTrack: number;
  overspending: number;
  underspending: number;
}

// Get current budget period (calculated dynamically)
export function getCurrentBudgetPeriod(
  paydayDay: number
): { periodStart: string; periodEnd: string }

// Get member's budget period (uses householdMember.paydayDay)
export async function getMemberBudgetPeriod(
  userId: string,
  householdId: string
): Promise<{ start: string; end: string }>
```

**Budget Calculations**:
- **Allocated**: User-set amount per category
- **Spent**: Sum of transactions in category (filtered by calculated period)
- **Remaining**: `allocated - spent`
- **Percentage**: `(allocated / totalIncome) * 100`

**Critical**: Periods are calculated from `householdMembers.paydayDay`, not stored in budgets table

---

#### 4. Wallets API (`wallets-api.ts`)

```typescript
// Get all wallets
export function useWallets(): Wallet[]

// Add wallet
export async function addWallet(data: {
  name: string;
  institution: string;
  accountType: string;
  initialBalance: number;
}): Promise<Wallet>

// Edit wallet
export async function editWallet(
  id: string,
  updates: Partial<Wallet>
): Promise<Wallet>

// Delete wallet (must have zero balance)
export async function deleteWallet(id: string): Promise<void>

// Calculate wallet balance (from transactions)
export function calculateWalletBalance(
  walletId: string,
  transactions: Transaction[]
): number
```

**Balance Calculation**:
```
balance = initialBalance + sum(income transactions) - sum(expense transactions)
```

---

#### 5. Household API (`household-api.ts`)

```typescript
// Get current household
export function useHousehold(): Household

// Get household members
export function useHouseholdMembers(): HouseholdMember[]

// Create household (auto on signup)
export async function createHousehold(data: {
  name: string;
  currency: string;
}): Promise<Household>

// Invite member (US-005)
export async function inviteMember(email: string): Promise<HouseholdInvite>

// Accept invitation (US-006)
export async function acceptInvite(inviteToken: string): Promise<void>

// Remove member (US-007)
export async function removeMember(userId: string): Promise<void>

// Leave household (US-008)
export async function leaveHousehold(): Promise<void>

// Update split ratio (US-027)
export async function updateSplitRatio(ratios: {
  [userId: string]: number;
}): Promise<void>
```

---

#### 6. Settlement API (`settlement-api.ts`)

```typescript
// Get settlement balance (who owes what)
export function useSettlementBalance(): {
  youOwe: number;      // Positive = you owe partner
  owedToYou: number;   // Positive = partner owes you
  netBalance: number;  // youOwe - owedToYou
}

// Get unsettled expenses
export function useUnsettledExpenses(): ExpenseSplit[]

// Create settlement (internal transfer)
export async function createSettlement(data: {
  amount: number;
  payerAccountId: string;
  receiverAccountId: string;
  splitIds: string[]; // ExpenseSplit IDs to mark as paid
}): Promise<{
  settlementId: string;
  newPayerBalance: number;
  newReceiverBalance: number;
}>

// Get settlement history
export function useSettlementHistory(): Settlement[]
```

**Settlement Calculation** (US-040):
```typescript
// Net balance
netBalance = sum(splits where owerUserId = currentUser AND isPaid = false)
           - sum(splits where owedToUserId = currentUser AND isPaid = false)

// If netBalance > 0: You owe partner
// If netBalance < 0: Partner owes you
// If netBalance = 0: All settled
```

**Important**: Settlements do NOT create transactions (budget unaffected)

---

#### 7. Recurring API (`recurring-api.ts`) 🆕 NEW

```typescript
// Create recurring template (NOT transaction)
export async function createRecurringTemplate(data: {
  name: string;
  amount: number;
  categoryId: string;
  accountId: string;
  recurringDay: number; // 1-31
  payee?: string;
  note?: string;
}): Promise<RecurringTemplate>

// Get active templates
export function useActiveRecurringTemplates(): RecurringTemplate[]

// Check if template should create transaction this month
export function shouldCreateThisMonth(
  template: RecurringTemplate,
  today: Date
): boolean

// Create transaction from template
export async function createTransactionFromTemplate(
  templateId: string
): Promise<Transaction>

// Update template
export async function updateRecurringTemplate(
  id: string,
  updates: Partial<RecurringTemplate>
): Promise<RecurringTemplate>

// Delete template
export async function deleteRecurringTemplate(id: string): Promise<void>
```

**Critical**: Templates appear in dashboard widget when due, user manually activates them

---

#### 8. Income API (`income-api.ts`) - Phase 2

```typescript
// Get income detection settings (US-061)
export function useIncomeSettings(): {
  mode: 'manual' | 'auto';
  gracePeriodDays: number;
  manualMonthlyIncome: number;
  selectedCategories: string[]; // Category IDs
}

// Update income detection settings
export async function updateIncomeSettings(settings: {
  mode: 'manual' | 'auto';
  gracePeriodDays?: number;
  manualMonthlyIncome?: number;
  selectedCategories?: string[];
}): Promise<void>

// Detect income for period (US-063)
export function detectIncomeForPeriod(
  periodStart: string,
  periodEnd: string,
  gracePeriodDays: number,
  selectedCategories: string[]
): {
  detectedIncome: number;
  transactionCount: number;
  transactions: Transaction[];
}

// Auto-recalculate split ratios (US-067)
export async function recalculateSplitRatios(): Promise<void>
```

---

## Authentication System

### Passwordless Magic Code Flow

Flow uses **InstantDB's built-in authentication** (passwordless magic codes).

#### Login Flow

```
1. User enters email → app calls `db.auth.sendMagicCode(email)`
2. InstantDB sends 6-digit code to email
3. User enters code → app calls `db.auth.signInWithMagicCode(email, code)`
4. InstantDB verifies code → returns auth token
5. App stores token in SecureStore (encrypted iOS keychain)
6. User is logged in
```

#### Biometric Authentication (Returning Users)

After first login, users can enable Face ID / Touch ID:

```typescript
// Enable biometric login
import * as LocalAuthentication from 'expo-local-authentication';
import * as SecureStore from 'expo-secure-store';

// 1. Check if device supports biometrics
const hasHardware = await LocalAuthentication.hasHardwareAsync();
const isEnrolled = await LocalAuthentication.isEnrolledAsync();

// 2. Authenticate with biometric
const result = await LocalAuthentication.authenticateAsync({
  promptMessage: 'Unlock Flow',
  fallbackLabel: 'Use passcode',
});

// 3. If successful, retrieve stored auth token
if (result.success) {
  const token = await SecureStore.getItemAsync('auth_token');
  // Re-authenticate with InstantDB using stored token
}
```

#### Security Features

- **Rate Limiting**: 5 failed attempts → 15-minute lockout
- **Email Verification**: Required before full access
- **Token Expiry**: 30-day session (configurable)
- **Biometric Fallback**: Passcode available if Face ID fails

---

## Data Flow Patterns

### Optimistic Updates Pattern

Flow uses **optimistic updates** for instant UI feedback.

```typescript
// Example: Add transaction with optimistic update
const addTransactionMutation = useMutation({
  mutationFn: async (newTransaction) => {
    // 1. Optimistically update UI (instant)
    queryClient.setQueryData(['transactions'], (old) => {
      return [...old, newTransaction];
    });

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

**User Experience**: Transaction appears in list immediately, then syncs in background.

---

### Real-Time Sync Pattern

Household members see changes instantly using InstantDB's reactive queries:

```typescript
// Component automatically re-renders when data changes
const { data: transactions } = db.useQuery({
  transactions: {
    $: { where: { householdId: currentHousehold.id } }
  }
});

// When User A adds shared expense:
// 1. User A's app updates immediately (optimistic)
// 2. InstantDB syncs to cloud
// 3. User B's app receives real-time update (< 500ms latency)
// 4. User B's transaction list updates automatically
```

---

### Budget Calculation Pattern (Dynamic Periods)

Budgets are **calculated** with dynamic period filtering.

```typescript
// Calculate spent amount for category (using dynamic period)
async function calculateSpentAmount(
  categoryId: string,
  userId: string,
  householdId: string,
  transactions: Transaction[]
): Promise<number> {
  // 1. Get member's payday to calculate period
  const member = await getHouseholdMember(userId, householdId);
  const period = calculateCurrentPeriod(member.paydayDay, new Date());
  
  // 2. Filter transactions by calculated period
  return transactions
    .filter(t => 
      t.categoryId === categoryId &&
      t.date >= period.periodStart &&
      t.date <= period.periodEnd &&
      t.type === 'expense' &&
      !t.isExcludedFromBudget
    )
    .reduce((sum, t) => sum + Math.abs(t.amount), 0);
}

// Update budget spent amount (runs on every transaction change)
const spentAmount = await calculateSpentAmount(
  budget.categoryId,
  budget.userId,
  householdId,
  transactions
);

await db.update('budgets', budget.id, { spentAmount });
```

**Performance**: Uses React Query caching to avoid redundant calculations.

---

### Payday Period Calculation (Core Algorithm)

```typescript
// Calculate budget period from payday (SOURCE OF TRUTH algorithm)
function calculateCurrentPeriod(paydayDay: number, today: Date): {
  periodStart: string;
  periodEnd: string;
} {
  const year = today.getFullYear();
  const month = today.getMonth();
  const currentDay = today.getDate();
  
  // Handle paydayDay = -1 (last day of month)
  const actualPayday = paydayDay === -1 
    ? new Date(year, month + 1, 0).getDate()
    : paydayDay;
  
  let periodStart: Date;
  let periodEnd: Date;
  
  if (currentDay >= actualPayday) {
    // After payday this month: Current period
    periodStart = new Date(year, month, actualPayday);
    periodEnd = new Date(year, month + 1, actualPayday - 1);
  } else {
    // Before payday this month: Previous period
    periodStart = new Date(year, month - 1, actualPayday);
    periodEnd = new Date(year, month, actualPayday - 1);
  }
  
  return {
    periodStart: formatDate(periodStart), // "YYYY-MM-DD"
    periodEnd: formatDate(periodEnd)
  };
}

// Example: Payday = 25th, Today = Feb 8, 2026
// → periodStart = "2026-01-25", periodEnd = "2026-02-24"

// Example: Payday = 25th, Today = Feb 27, 2026
// → periodStart = "2026-02-25", periodEnd = "2026-03-24"
```

**This algorithm is used everywhere periods are needed** (budget queries, transaction filtering, analytics)

---

## Third-Party Services

### Current Integrations

| Service | Purpose | Cost | Configuration |
|---------|---------|------|---------------|
| **InstantDB** | Real-time database | Free tier: 100k reads/month<br>Paid: $25/month | `EXPO_PUBLIC_INSTANTDB_APP_ID` in `.env` |
| **Expo Application Services (EAS)** | Build & deployment | Free tier: 30 builds/month<br>Paid: $29/month | `eas.json` configuration file |
| **Expo SecureStore** | Encrypted storage (iOS Keychain) | Free (built into Expo) | No config needed |

### Future Integrations (Phase 3-4)

| Service | Purpose | Estimated Cost | Status |
|---------|---------|----------------|--------|
| **Swiss Open Banking API** | Bank account connection | TBD (research needed) | Phase 3 (Q3 2025) |
| **Tink / Plaid** | Transaction import | ~$0.01 per transaction | Phase 3 alternative |
| **Sentry** | Error tracking & monitoring | Free tier: 5k events/month | Phase 2 (optional) |
| **Mixpanel / Amplitude** | Privacy-respecting analytics | Free tier: 20M events/month | Phase 2 (optional) |

---

## Security Implementation

### Current Security Measures

1. **Authentication**:
   - Passwordless magic codes (no password to leak)
   - Biometric login (Face ID / Touch ID)
   - Rate limiting (5 attempts → 15min lockout)
   - Email verification required

2. **Data Privacy**:
   - All queries scoped to `userId` or `householdId`
   - Personal transactions not visible to household members
   - Shared transactions only visible within household

3. **Secure Storage**:
   - Auth tokens encrypted in iOS Keychain (SecureStore)
   - No sensitive data in AsyncStorage (unencrypted)

4. **Network Security**:
   - All API calls use HTTPS (InstantDB enforces TLS)
   - Certificate pinning (future: Phase 3)

### Security Gaps & Future Improvements

**⚠️ CRITICAL (Phase 2+ Priority)**:

InstantDB stores all data in **plain text** by default. This means:
- App owner can see all user financial data in the database
- Any database breach exposes transaction amounts, payees, notes

**Solution**: Client-side encryption (future enhancement)

```typescript
// Encrypt sensitive fields before storing
import * as Crypto from 'expo-crypto';

async function encryptTransaction(transaction: Transaction): Promise<Transaction> {
  const encrypted = {
    ...transaction,
    amount: await encrypt(transaction.amount.toString()),
    payee: await encrypt(transaction.payee),
    note: await encrypt(transaction.note),
  };
  return encrypted;
}
```

**Implementation Plan** (Post-Phase 2):
1. Generate encryption key per user (derived from password or stored in Keychain)
2. Encrypt sensitive fields client-side before storing
3. Decrypt when querying (client-side)
4. Database contains encrypted data (unreadable even to app owner)

---

## Performance Optimization

### Current Optimizations

1. **React Query Caching**:
   - Transactions cached for 5 minutes (avoids redundant DB queries)
   - Background refetch on window focus
   - Stale-while-revalidate pattern

2. **Virtualized Lists**:
   - Transaction list uses FlatList (renders only visible items)
   - Handles 1000+ transactions without lag

3. **Optimistic Updates**:
   - UI updates immediately (no loading spinners for CRUD)
   - Background sync feels instant

4. **Lazy Loading**:
   - Analytics screens loaded on-demand (not at app startup)
   - Images lazy-loaded with placeholders

5. **Dynamic Period Calculation**:
   - Budget periods calculated once per query (not stored/updated)
   - Eliminates period update mutations (fewer database writes)

### Performance Targets

| Metric | Target | Current | Status |
|--------|--------|---------|--------|
| App Launch (cold start) | <2 seconds | ~2.5 seconds | ⚠️ Needs optimization (TECH-004) |
| Transaction List (500 items) | <100ms render | ~150ms | ⚠️ Needs optimization (TECH-005) |
| Budget Calculation | <50ms | ~30ms | ✅ Meeting target |
| Database Query (typical) | <200ms | ~120ms | ✅ Meeting target |
| Period Calculation | <10ms | ~5ms | ✅ Meeting target |

### Future Optimizations (Phase 2-3)

- **Code Splitting**: Lazy load screens (reduces initial bundle size)
- **Image Optimization**: Compress glassmorphism backgrounds
- **Database Indexing**: Add compound indexes for common queries
- **Worker Threads**: Move budget calculations to background thread
- **Memoization**: Cache period calculations per render cycle

---

## Development Guidelines

### Code Style

- **TypeScript Strict Mode**: Enabled (no `any` types allowed without `@ts-ignore`)
- **Functional Components**: No class components
- **Hooks**: Prefer custom hooks for reusable logic
- **Naming**: `PascalCase` for components, `camelCase` for functions/variables

### Git Workflow

1. **Branch Naming**: `feature/US-XXX-short-description` (e.g., `feature/US-061-income-detection`)
2. **Commit Messages**: Use conventional commits
   ```
   feat(budget): add income detection configuration (US-061)
   fix(settlement): personal to shared transition creates splits (BUG-001)
   refactor(budget): remove periodStart/periodEnd from schema (timeless budgets)
   ```
3. **Pull Requests**: One user story per PR (keeps changes reviewable)

### Testing Requirements

- **Unit Tests**: Required for all `/src/utils/` functions
  - Currency formatting
  - Split ratio calculations
  - **Date calculations (payday periods)** ← Critical for timeless budgets
- **Integration Tests**: Required for critical user flows
  - Add transaction → budget updates
  - Create shared expense → split created → settlement balance updates
  - **Change payday → budget periods recalculate correctly**
- **Coverage Target**: 80% for utils, 60% overall

### Development Environment

```bash
# Install dependencies
npm install

# Start development server
npm start

# Run on iOS simulator
npm run ios

# Run on Android emulator
npm run android

# Run tests
npm test

# Run linting
npm run lint

# Build for production (iOS)
eas build --platform ios
```

### Environment Variables

Create `.env` file in project root:

```
EXPO_PUBLIC_INSTANTDB_APP_ID=your_instantdb_app_id_here
```

**Never commit `.env` to Git** (add to `.gitignore`).

---

## Deployment Configuration

### Expo Application Services (EAS)

Flow uses EAS for building and deploying iOS app.

#### Build Configuration (`eas.json`)

```json
{
  "build": {
    "development": {
      "developmentClient": true,
      "distribution": "internal",
      "ios": {
        "simulator": true
      }
    },
    "preview": {
      "distribution": "internal",
      "ios": {
        "simulator": false,
        "bundleIdentifier": "com.flow.budgetapp"
      }
    },
    "production": {
      "ios": {
        "bundleIdentifier": "com.flow.budgetapp",
        "buildNumber": "1.0.0"
      }
    }
  },
  "submit": {
    "production": {
      "ios": {
        "appleId": "your_apple_id@example.com",
        "ascAppId": "1234567890",
        "appleTeamId": "ABC123DEF4"
      }
    }
  }
}
```

#### App Store Submission Checklist

- [ ] App icon (1024x1024px)
- [ ] Screenshots (iPhone 12 Pro, iPhone SE)
- [ ] App description (emphasizes Swiss market, privacy, calm design)
- [ ] Privacy policy URL (required by Apple)
- [ ] Support email address
- [ ] Age rating (4+ - no objectionable content)
- [ ] App Store categories: Finance, Productivity

### App Configuration (`app.json`)

```json
{
  "expo": {
    "name": "Flow",
    "slug": "flow-budget",
    "version": "1.0.0",
    "orientation": "portrait",
    "icon": "./assets/icon.png",
    "userInterfaceStyle": "dark",
    "splash": {
      "image": "./assets/splash.png",
      "resizeMode": "contain",
      "backgroundColor": "#2C5F5D"
    },
    "ios": {
      "supportsTablet": false,
      "bundleIdentifier": "com.flow.budgetapp",
      "buildNumber": "1",
      "infoPlist": {
        "NSFaceIDUsageDescription": "Flow uses Face ID to securely log you in",
        "NSCameraUsageDescription": "Flow needs camera access for receipt scanning (future feature)"
      }
    },
    "plugins": [
      "expo-router",
      "expo-secure-store",
      "expo-local-authentication"
    ]
  }
}
```

---

## Summary for AI Code Generation

### Key Constraints When Writing Code

1. **Always scope database queries** to `userId` or `householdId` (privacy)
2. **Calculate budget periods dynamically** from `householdMembers.paydayDay` (no stored dates)
3. **Use GlassCard component** for all cards (no hardcoded colors)
4. **Format currency** using Swiss conventions: `CHF 1'234.56`
5. **Calculate balances** from transactions (never manually editable)
6. **Optimistic updates** for all mutations (instant UI feedback)
7. **TypeScript strict mode** (no `any` without `@ts-ignore`)
8. **Zero-based budgeting** (every franc allocated)
9. **Shared expenses** create ExpenseSplit records automatically
10. **Settlements are internal transfers** (NOT transactions, don't affect budget)
11. **Recurring templates** are NOT automatic transactions (manual activation)
12. **Calm color palette** (no harsh reds, use Soft Amber for warnings)

### File Location Quick Reference

- **Add new screen**: `/src/app/[feature]/[screen-name].tsx`
- **Add component**: `/src/components/[category]/[ComponentName].tsx`
- **Add utility function**: `/src/utils/[category].ts`
- **Add API function**: `/src/lib/[feature]-api.ts`
- **Add hook**: `/src/hooks/use[FeatureName].ts`
- **Add type**: `/src/types/models.ts`

### Common Queries (Copy-Paste Ready)

```typescript
// Get current user's household member (for paydayDay)
const { data: memberData } = db.useQuery({
  householdMembers: {
    $: { where: { userId: currentUser.id, status: 'active' } },
    household: {}
  }
});
const member = memberData?.householdMembers[0];
const currentHousehold = member?.household[0];

// Calculate current budget period
const period = calculateCurrentPeriod(member.paydayDay, new Date());

// Get transactions for current period
const { data: transactions } = db.useQuery({
  transactions: {
    $: { 
      where: { 
        householdId: currentHousehold.id,
        date: { $gte: period.periodStart, $lte: period.periodEnd }
      } 
    },
    category: {},
    account: {}
  }
});

// Get active budget (NO period filtering in query)
const { data: budgets } = db.useQuery({
  budgets: {
    $: { 
      where: { 
        userId: currentUser.id,
        categoryId: categoryId,
        isActive: true
      } 
    }
  }
});

// Get settlement balance
const { data: splits } = db.useQuery({
  shared_expense_splits: {
    $: { 
      where: { 
        owerUserId: currentUser.id,
        isPaid: false
      } 
    }
  }
});
const youOwe = splits?.shared_expense_splits.reduce((sum, s) => sum + s.splitAmount, 0);
```

---

**Document Version**: 2.2 (Updated Navigation Architecture)
**Last Updated**: February 12, 2026  
**Next Review**: After Phase 2 Sprint 3 (March 2026)  
**Maintained By**: Alexander (Flow Founder & Lead Developer)

---

*This document serves as the technical reference for all AI-assisted development. When writing code, always reference this document for architecture patterns, database schema, and implementation guidelines.*

**CRITICAL REMINDER**: Budget periods are calculated dynamically from `householdMembers.paydayDay`. Never store `periodStart` or `periodEnd` in budgets or budgetSummary tables.
