# Analytics Screen - Implementation Reference

**Version**: 3.0 (Post-Implementation)
**Date**: February 12, 2026
**Status**: Implemented

---

## Executive Summary

The Analytics screen (`/mobile/src/app/(tabs)/analytics.tsx`) provides professional-grade spending analytics with a **two-tab interface** (Now / Trends), a **period selector** for flexible date ranges, and a **single-query data architecture** for performance.

### What Was Built

| Feature | Implementation | Notes |
|---------|---------------|-------|
| Two-tab layout | AnalyticsTabSelector (Now/Trends) | Splits snapshot vs historical views |
| Period selector | PeriodSelector dropdown with modal | Payday-aware date ranges |
| Financial health | FinancialHealthCard | Net position, trend, status badge |
| Spending heatmap | TreeMapChart (top 6 categories) | Two-row layout with category colors |
| Performance insights | PerformanceCards | Most consistent + trending up |
| Spending pace | SpendingPaceCard | Budget velocity vs time |
| Income trend | IncomeTrendChart (SVG) | Custom Polyline chart |
| Category trends | CategoryTrendChart (SVG) | Top 5 multi-line chart |
| Period comparison | SlopeChart (SVG) | Gradient slope lines |
| Smart insights | InsightsCard | Rule-based recommendations |

### Key Metrics

- **11 components** in `/components/analytics/`
- **2 tabs** (Now: snapshot, Trends: historical)
- **6 period options** (This Period through All Time)
- **1 DB query** for all transaction data (single-query architecture)
- **100% design token compliant** (imports from `@/constants/colors`)

---

## Architecture

### Screen Layout

```
┌─────────────────────────────┐
│  Analytics (title)          │
│  2026-01-25 to 2026-02-24  │
│                             │
│  [This Period ▼]            │  ← PeriodSelector
│                             │
│  [ Now ] [ Trends ]         │  ← AnalyticsTabSelector
│                             │
│  ─── NOW TAB ───            │
│  Financial Health           │
│  FinancialHealthCard        │
│                             │
│  Spending Distribution      │
│  TreeMapChart               │
│  PerformanceCards           │
│                             │
│  Spending Pace              │
│  SpendingPaceCard           │
│                             │
│  ─── TRENDS TAB ───         │
│  Income & Expense Trend     │
│  IncomeTrendChart           │
│                             │
│  Category Performance       │
│  CategoryTrendChart         │
│                             │
│  Period-over-Period Changes  │
│  SlopeChart                 │
│                             │
│  Insights & Recommendations │
│  InsightsCard               │
└─────────────────────────────┘
```

### Data Flow

```
analytics.tsx
  │
  ├─ db.useAuth()  →  user email
  ├─ useQuery(['household'])  →  userId, householdId, paydayDay
  ├─ getDateRange(selectedPeriod, paydayDay)  →  { start, end }
  ├─ useAnalyticsData(userId, householdId, start, end)
  │    │
  │    └─ Single db.queryOnce({ transactions: { $: { where: { userId } } } })
  │         │
  │         ├─ filterTransactions(start, end, type?)  →  in-memory filter
  │         ├─ computeHealthSummary(...)
  │         ├─ computeCategoryDistribution(...)
  │         ├─ computeIncomeTrend(...)
  │         ├─ computeCategoryTrends(...)
  │         ├─ getBudgetPerformance(...)  ← still queries budgets DB
  │         ├─ computePeriodComparison(...)
  │         └─ generateInsights(...)
  │
  └─ useQuery(['budgets'])  →  for SpendingPaceCard (Now tab only)
```

**Key optimization**: All transaction data is fetched once and filtered in-memory. This avoids the "query storm" problem where 20+ simultaneous InstantDB queries would overwhelm the backend.

---

## File Structure

```
/mobile/src/
├── app/(tabs)/analytics.tsx                    # Main screen with tab switching
├── components/analytics/
│   ├── AnalyticsTabSelector.tsx                # Now/Trends tab switcher
│   ├── PeriodSelector.tsx                      # Date range dropdown
│   ├── FinancialHealthCard.tsx                 # Net position + status
│   ├── TreeMapChart.tsx                        # Category heatmap (top 6)
│   ├── PerformanceCards.tsx                    # Most consistent + trending up
│   ├── SpendingPaceCard.tsx                    # Budget velocity widget
│   ├── IncomeTrendChart.tsx                    # Income vs Expenses SVG chart
│   ├── CategoryTrendChart.tsx                  # Multi-line category SVG chart
│   ├── BulletGraph.tsx                         # Budget vs actual bars (UNUSED)
│   ├── SlopeChart.tsx                          # Period comparison slopes
│   └── InsightsCard.tsx                        # Smart recommendations
├── hooks/
│   └── useAnalyticsData.ts                     # Single-query data aggregation
├── lib/
│   ├── analytics-api.ts                        # Analytics business logic + date ranges
│   └── spending-pace.ts                        # Spending pace calculations
```

**Note**: `BulletGraph.tsx` is implemented but not currently rendered in the analytics screen. It was replaced by the SpendingPaceCard for the "Now" tab. The component is kept for potential future use.

---

## Component Specifications

### AnalyticsTabSelector

**File**: `AnalyticsTabSelector.tsx`
**Purpose**: Switches between "Now" (snapshot) and "Trends" (historical) views.

```typescript
export type AnalyticsTab = 'now' | 'trends';

interface AnalyticsTabSelectorProps {
  selectedTab: AnalyticsTab;
  onTabChange: (tab: AnalyticsTab) => void;
}
```

**Design**:
- Glass background (`glassWhite`) with glass border
- Active tab: `contextTeal` background, full white text
- Inactive tab: secondary text color
- Pill-shaped container with 4px internal padding
- Min width per tab: 100px
- Centered in layout

---

### PeriodSelector

**File**: `PeriodSelector.tsx`
**Purpose**: Allows user to select the analytics date range.

```typescript
type DateRangeOption =
  | 'this_week' | 'this_month' | 'last_month'
  | 'last_3_months' | 'last_6_months' | 'this_year' | 'all_time';
```

**Period Options** (payday-aware for "This Period" and "Last Period"):
| Value | Label | Description |
|-------|-------|-------------|
| `this_month` | This Period | Current payday-to-payday period |
| `last_month` | Last Period | Previous payday-to-payday period |
| `last_3_months` | Last 3 Months | Rolling 3 months |
| `last_6_months` | Last 6 Months | Rolling 6 months |
| `this_year` | This Year | Jan 1 to today |
| `all_time` | All Time | 2020-01-01 to today |

**Design**:
- Selector button: glass background (8% opacity), 12px border radius
- Modal: dark overlay (70% opacity), centered card, dark background
- Selected option: highlighted with checkmark, teal text
- Chevron indicator (▼) on button

---

### FinancialHealthCard (Now Tab)

**File**: `FinancialHealthCard.tsx`
**Purpose**: Shows financial health snapshot with net position and status.

```typescript
interface FinancialHealthCardProps {
  netPosition: number;
  netPositionTrend: number;      // % change vs previous period
  income: number;
  expenses: number;
  savingsRate: number;
  status: 'on-track' | 'progressing' | 'nearly-there' | 'flow-adjusted';
}
```

**Status Badge Colors**:
| Status | Label | Color |
|--------|-------|-------|
| on-track | On Track 💚 | `budgetOnTrack` (#C5D4BE) |
| progressing | Progressing Well 🟡 | `budgetProgressing` (#E5C399) |
| nearly-there | Nearly There 🔵 | `budgetNearlyThere` (#4A8D89) |
| flow-adjusted | Flow Adjusted 💜 | `budgetFlowAdjusted` (#D4C4ED) |

**Status Determination** (based on savings rate):
- >= 20%: on-track
- >= 10%: progressing
- >= 0%: nearly-there
- < 0%: flow-adjusted

**Design**:
- Net position: 48px font, sage green, tabular-nums
- Trend arrow: up/down with percentage
- Stats grid: Income (white), Expenses (softLavender), Savings Rate (sageGreen)
- Glass card with 24px padding

---

### TreeMapChart (Now Tab)

**File**: `TreeMapChart.tsx`
**Purpose**: Proportional heatmap of spending by category.

```typescript
interface TreeMapItem {
  categoryId: string;
  categoryName: string;
  emoji: string;
  amount: number;
  percentage: number;
  color: string;          // Category color from DB
}

interface TreeMapChartProps {
  data: TreeMapItem[];
}
```

**Layout** (two-row structure for top 6 categories):
```
Row 1: [  Large tile (50%)  ] [ Medium #2 ]
                               [ Medium #3 ]

Row 2: [ Small #4 ] [ Small #5 ] [ Small #6 ]
```

- Large tile: 160px min height, 32px emoji, 24px percentage, 14px label
- Medium tiles: 76px min height, 24px emoji, 16px percentage, 11px label
- Small tiles: 80px min height, 20px emoji, 14px percentage, 10px label
- Background: category color with opacity (0.85/0.75/0.65)
- Tap navigates to: `/(tabs)/transactions?category=${categoryId}`
- 4px gap between tiles
- Subtle 1px white border (10% opacity)

---

### PerformanceCards (Now Tab)

**File**: `PerformanceCards.tsx`
**Purpose**: Shows "Most Consistent" and "Trending Up" category insights below TreeMap.

```typescript
interface PerformanceInsight {
  categoryId: string;
  categoryName: string;
  emoji: string;
  metric: string;           // e.g., "±3.2% variance" or "+45% vs avg"
  type: 'consistent' | 'trending-up';
}

interface PerformanceCardsProps {
  mostConsistent: PerformanceInsight | null;
  trendingUp: PerformanceInsight | null;
}
```

**Calculation Logic**:
- Most Consistent: Lowest coefficient of variation over 4 months (< 15% threshold, > CHF 50 avg)
- Trending Up: Highest positive trend vs 3-month average (> 20% threshold, > CHF 50 avg)

**Design**:
- Two cards side by side (flex: 1 each)
- Consistent card: sage green border/background (8%/25% opacity)
- Trending card: soft amber border/background (8%/25% opacity)
- Tap navigates to category transactions

---

### SpendingPaceCard (Now Tab)

**File**: `SpendingPaceCard.tsx`
**Purpose**: Shows whether spending is faster or slower than the passage of time.

```typescript
interface SpendingPaceCardProps {
  categoryId: string;
  categoryName: string;
  emoji: string;
  budgetAmount: number;
  spentSoFar: number;
  periodStart: string;
  periodEnd: string;
}
```

**Sub-sections** (inside the card):
1. **Metrics Grid**: Daily spend rate + days remaining (2-column)
2. **Period Timeline**: Visual bar with "Today" marker
3. **Comparison Grid**: Budget Used % vs Time Elapsed % (2-column)
4. **Pace Indicator**: Status message with colored border
5. **Projection**: Projected total spending by end of period

**Pace Status** (15% tolerance):
| Status | Condition | Color | Icon |
|--------|-----------|-------|------|
| too-fast | paceRatio > 1.15 | budgetProgressing (#E5C399) | ⚠️ |
| on-track | 0.85 ≤ paceRatio ≤ 1.15 | contextTeal (#2C5F5D) | ✓ |
| under-pace | paceRatio < 0.85 | sageGreen (#A8B5A1) | ✅ |
| insufficient-data | daysElapsed = 0 | softLavender (#B8A8C8) | ℹ️ |

**Calculation** (from `spending-pace.ts`):
```
paceRatio = budgetProgress / timeProgress
dailySpendRate = spentSoFar / daysElapsed
projectedTotal = dailySpendRate × totalDays
safeDailySpend = budgetRemaining / daysRemaining
```

---

### IncomeTrendChart (Trends Tab)

**File**: `IncomeTrendChart.tsx`
**Purpose**: Dual-line SVG chart showing income vs expenses over 4 periods.

```typescript
interface TrendDataPoint {
  label: string;          // "Nov", "Dec", "Jan", "Feb (current)"
  income: number;
  expenses: number;
  savingsRate: number;
}

interface IncomeTrendChartProps {
  data: TrendDataPoint[];
}
```

**Chart Specs**:
- Rendered with `react-native-svg` (Polyline + Circle)
- Chart dimensions: 320 x 180px
- Padding: 20px all sides
- Income line: `colors.chartPurple`
- Expenses line: `colors.softLavender`
- Point radius: 4px
- Stroke width: 2px
- Y-axis: 10% padding at top
- Legend at top with colored dots (12px)
- X-axis labels below chart

---

### CategoryTrendChart (Trends Tab)

**File**: `CategoryTrendChart.tsx`
**Purpose**: Multi-line SVG chart showing top 5 categories over 4 periods.

```typescript
interface CategoryTrendData {
  periods: string[];      // ["Nov", "Dec", "Jan", "Feb"]
  categories: Array<{
    categoryId: string;
    categoryName: string;
    values: number[];     // Amounts for each period
    color: string;        // From DB category.color
  }>;
}
```

**Chart Specs**:
- Chart dimensions: 320 x 200px
- Max 5 category lines (top by total spending)
- Point radius: 3px
- Stroke width: 2px
- Legend: flex-wrap row, 11px text, 10px colored dots, 12px gap
- Colors: from category DB records (not hardcoded)

---

### SlopeChart (Trends Tab)

**File**: `SlopeChart.tsx`
**Purpose**: Shows period-over-period changes with gradient slope lines.

```typescript
interface SlopeChartItem {
  categoryId: string;
  categoryName: string;
  emoji: string;
  previousValue: number;
  currentValue: number;
  changePercent: number;
}

interface SlopeChartProps {
  data: SlopeChartItem[];
}
```

**Design**:
- Each item: category label, SVG slope line (60px height), values row
- SVG gradient: softLavender (left) → endColor (right)
- End color: `budgetProgressing` if increase, `sageGreen` if decrease
- Circle radius: 4px at each end
- Line from x=10% to x=90%
- Values row: previous (softLavender), change badge (colored bg), current (contextTeal)
- Change badge shows "NEW" when previousValue is 0
- Top 5 changes by absolute percentage
- 24px spacing between items

---

### InsightsCard (Trends Tab)

**File**: `InsightsCard.tsx`
**Purpose**: Smart contextual insights based on spending patterns.

```typescript
interface Insight {
  type: 'positive' | 'attention' | 'neutral';
  icon: string;
  message: string;
}

interface InsightsCardProps {
  insights: Insight[];
}
```

**Insight Color Mapping**:
| Type | Color | Left Border |
|------|-------|-------------|
| positive | sageGreen (#A8B5A1) | 3px solid |
| attention | budgetProgressing (#E5C399) | 3px solid |
| neutral | softLavender (#B8A8C8) | 3px solid |

**Insight Generation Rules** (max 3, priority: attention > positive > neutral):
1. **Savings rate**: Positive if ≥20%, neutral if ≥10%, attention if <0%
2. **Budget performance**: Attention if over-budget categories exist, or ≥85% used; positive if ≤70% overall
3. **Spending trends**: Attention if top category increased >15%; positive if decreased >15%; positive if stable (≤5%)
4. **Net position**: Positive if improved >10%; attention if declined >10%

---

### BulletGraph (UNUSED)

**File**: `BulletGraph.tsx`
**Status**: Component exists but is NOT rendered in the analytics screen. Replaced by SpendingPaceCard.

```typescript
interface BulletGraphProps {
  categoryName: string;
  emoji: string;
  actual: number;
  budget: number;
  percentUsed: number;
}
```

---

## Data Layer

### useAnalyticsData Hook

**File**: `hooks/useAnalyticsData.ts`
**Architecture**: Single-query with React Query caching.

```typescript
function useAnalyticsData(
  userId: string,
  householdId: string,
  periodStart: string,
  periodEnd: string
): {
  data: AnalyticsData | null;
  loading: boolean;
  error: Error | null;
}
```

**Caching**:
- `staleTime`: 2 minutes (data stays fresh without refetching)
- `gcTime`: 5 minutes (cache persists in memory)
- Query key: `['analytics', userId, householdId, periodStart, periodEnd]`

**Single-Query Pattern**:
```typescript
// One DB call fetches all transactions
const result = await db.queryOnce({
  transactions: { $: { where: { userId } } },
});

// In-memory filtering replaces individual DB queries
const filterTransactions = (start, end, type?) => {
  return allTransactions.filter(tx =>
    tx.date >= start &&
    tx.date <= end &&
    tx.date <= todayStr &&
    tx.isExcludedFromBudget !== true
  );
};
```

**Return Shape** (`AnalyticsData`):
```typescript
interface AnalyticsData {
  healthSummary: { netPosition, netPositionTrend, income, expenses, savingsRate, status };
  categoryDistribution: { categories: [...], totalAmount, performanceInsights };
  incomeTrend: { periods: [...] };
  categoryTrends: { periods: [...], categories: [...] };
  budgetPerformance: { overallStatus, overallPercentUsed, categories: [...] };
  periodComparison: { topChanges: [...] };
  insights: { insights: [...] };
}
```

---

### analytics-api.ts

**File**: `lib/analytics-api.ts`
**Purpose**: Core analytics functions and date range utilities.

**Key Functions**:

| Function | Purpose | Scoped By |
|----------|---------|-----------|
| `getTransactionsInRange()` | Fetch transactions within date range | userId |
| `getCategoryAnalytics()` | Category spending aggregation | userId, householdId |
| `getDateRange()` | Calculate date range from option + paydayDay | - |
| `getHealthSummary()` | Financial health summary | userId, householdId |
| `getCategoryDistribution()` | TreeMap data | userId, householdId |
| `getIncomeTrend()` | Income/expense trends over periods | userId, householdId |
| `getCategoryTrends()` | Multi-category trends over periods | userId, householdId |
| `getBudgetPerformance()` | Budget vs actual per category | userId, householdId |
| `getPeriodComparison()` | Period-over-period changes | userId, householdId |
| `generateInsights()` | Smart insight generation | userId, householdId |

**Note**: Functions in analytics-api.ts are the "original" implementations that make individual DB queries. The `useAnalyticsData` hook has optimized `compute*` versions that use the pre-fetched transaction array instead.

---

### spending-pace.ts

**File**: `lib/spending-pace.ts`
**Purpose**: Budget pacing calculation library.

```typescript
function calculateSpendingPace(input: SpendingPaceInput): SpendingPaceResult;
function getPaceColor(status): string;
function getPaceIcon(status): string;
function getPaceLabel(status): string;
```

**SpendingPaceResult** fields:
- Time: totalDays, daysElapsed, daysRemaining, timeProgress
- Budget: budgetAmount, spentSoFar, budgetRemaining, budgetProgress
- Pace: paceRatio, status, dailySpendRate
- Projections: projectedTotal, projectedVariance
- Recommendations: safeDailySpend, recommendationMessage

---

## Design Token Usage

All components import from `@/constants/colors`:

| Token | Value | Usage |
|-------|-------|-------|
| `colors.contextDark` | #1A1C1E | Gradient start, modal background |
| `colors.contextTeal` | #2C5F5D | Gradient end, active tab, on-track pace |
| `colors.glassWhite` | rgba(255,255,255,0.03) | Card backgrounds |
| `colors.glassBorder` | rgba(255,255,255,0.05) | Card borders |
| `colors.sageGreen` | #A8B5A1 | Positive insights, under-pace, savings |
| `colors.softLavender` | #B8A8C8 | Expenses color, neutral insights |
| `colors.chartPurple` | (purple) | Income line in trend charts |
| `colors.budgetOnTrack` | #C5D4BE | On-track status badge |
| `colors.budgetProgressing` | #E5C399 | Progressing badge, too-fast pace, attention |
| `colors.budgetNearlyThere` | #4A8D89 | Nearly-there badge |
| `colors.budgetFlowAdjusted` | #D4C4ED | Flow-adjusted badge |
| `colors.textWhite` | #FFFFFF | Primary text |
| `colors.textWhiteSecondary` | rgba(255,255,255,0.7) | Secondary text |
| `typography.h1` | 34px, 700 | Screen title |
| `typography.h3` | 22px, 600 | Section titles |
| `typography.body` | 16px | Body text |
| `typography.caption` | 14px | Captions, insight text |
| `typography.small` | 12-13px | Labels, chart text |
| `spacing.xs` | 4px | Tile gaps |
| `spacing.sm` | 8px | Small gaps |
| `spacing.md` | 16px | Medium gaps, section padding |
| `spacing.lg` | 24px | Card padding, section margins |

---

## Differences from Original Spec (v2.0)

| Aspect | Original Spec (v2.0) | Actual Implementation |
|--------|---------------------|----------------------|
| Layout | Single scrolling screen, 7 sections | Two-tab interface (Now/Trends) |
| Period selection | Fixed current period | PeriodSelector with 6 options |
| TreeMap categories | Top 8, CSS grid-like | Top 6, structured two-row layout |
| BulletGraph | Section 5 on main screen | Component exists but UNUSED |
| SpendingPaceCard | Not in spec | New: replaces BulletGraph in Now tab |
| PerformanceCards | Mentioned as sub-section | New: standalone component |
| AnalyticsTabSelector | Not in spec | New: Now/Trends tab switcher |
| Chart library | react-native-chart-kit | Custom SVG with react-native-svg |
| Data fetching | 7 API calls via Promise.all | Single DB query + in-memory filter |
| Caching | None specified | React Query (2min stale, 5min gc) |
| API style | REST endpoints (GET /api/...) | Direct function calls |
| Design tokens import | `@/lib/design-tokens` | `@/constants/colors` |
| Income chart color | contextTeal (#2C5F5D) | chartPurple |
| Insights | Complex (variance, z-score) | Simpler rule-based (4 rules) |
| Auth | `useAuth()` hook | `db.useAuth()` + React Query household |

---

## Testing Checklist

### Now Tab

- [ ] FinancialHealthCard renders net position with Swiss formatting
- [ ] Status badge matches savings rate thresholds
- [ ] TreeMapChart shows top 6 categories, correct sizing
- [ ] TreeMapChart tap navigates to filtered transactions
- [ ] PerformanceCards show consistent/trending insights (or hide if none)
- [ ] SpendingPaceCard shows daily rate, days remaining, timeline
- [ ] SpendingPaceCard projection changes color when over budget
- [ ] SpendingPaceCard hides when no budgets allocated

### Trends Tab

- [ ] IncomeTrendChart renders 4 periods with SVG polylines
- [ ] CategoryTrendChart shows top 5 categories with legend
- [ ] SlopeChart shows gradient lines with correct direction
- [ ] SlopeChart shows "NEW" for categories with no previous value
- [ ] InsightsCard shows max 3 insights, priority sorted
- [ ] Empty states render gracefully for all components

### Period Selection

- [ ] "This Period" uses payday-aware calculation
- [ ] "Last Period" shows previous payday period
- [ ] Changing period refetches analytics data
- [ ] Modal opens/closes correctly with overlay

### Data Layer

- [ ] Single query fetches all transactions once
- [ ] React Query cache prevents redundant fetches (2min stale)
- [ ] Tab switching doesn't re-fetch data
- [ ] Period change triggers new fetch with new query key
- [ ] Excluded transactions (`isExcludedFromBudget`) are filtered out
- [ ] Future transactions (date > today) are filtered out

### Cross-Device

- [ ] iPhone SE (375px) - no horizontal overflow
- [ ] iPhone 14 (390px) - standard layout
- [ ] iPhone 14 Pro Max (428px) - wider spacing

### Performance

- [ ] Initial load < 2 seconds
- [ ] Tab switching is instant (no refetch)
- [ ] Scroll performance > 55 fps
- [ ] Memory usage stable after multiple period changes

---

## Future Enhancements

### Planned

1. **BulletGraph integration**: Re-enable bullet graphs for per-category budget tracking (component ready)
2. **Heatmap calendar**: Daily spending intensity visualization
3. **Forecast projections**: "At current rate, you'll spend X by month-end" (SpendingPaceCard already does this)
4. **Interactive filtering**: Tap TreeMap to filter all charts to that category

### Considered

5. **Anomaly detection**: Z-score based spending anomalies
6. **Comparative analytics**: "You vs Swiss average"
7. **Export & sharing**: PDF report generation
8. **Animated transitions**: Tab switch animations between Now/Trends

---

**Document Version**: 3.0 (Post-Implementation)
**Last Updated**: February 12, 2026
**Status**: Reflects actual implemented code

*This document is the authoritative reference for the Analytics screen as built. It supersedes the v2.0 pre-implementation specification.*
