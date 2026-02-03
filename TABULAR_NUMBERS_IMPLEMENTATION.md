# Tabular Numbers Implementation - React Native

## Overview

Tabular numbers (equal-width digits) are **fully implemented** in the Flow app using React Native's `fontVariant` style property.

## Implementation Method

### React Native (Not CSS)

Since this is a React Native/Expo app, we use the `fontVariant` style property instead of CSS:

```typescript
// ✅ React Native way
<Text style={{ fontVariant: ['tabular-nums'] }}>
  13'648.51 CHF
</Text>

// ❌ Not applicable (this is for web)
// .tabular-nums { font-variant-numeric: tabular-nums; }
```

## Where It's Used

### TruePositionHero Component

**File:** `src/components/TruePositionHero.tsx`

**1. Net Worth Display (Line 57)**
```typescript
<Text
  style={{
    fontSize: 48,
    letterSpacing: -1,
    fontVariant: ['tabular-nums'],  // ← Perfect alignment
  }}
>
  {formatCurrency(netWorth, { showCurrency: false })}
</Text>
```

**2. Assets Amount (Line 91)**
```typescript
<Text
  style={{
    fontSize: 14,
    fontVariant: ['tabular-nums'],  // ← Equal-width digits
  }}
>
  {formatCurrency(assets, { showSign: true })}
</Text>
```

**3. Liabilities Amount (Line 118)**
```typescript
<Text
  style={{
    fontSize: 14,
    fontVariant: ['tabular-nums'],  // ← Consistent spacing
    color: colors.contextLavender,
  }}
>
  {formatCurrency(-Math.abs(liabilities), { showSign: true })}
</Text>
```

## Visual Comparison

### Without Tabular Numbers (Proportional)
```
Net Worth Display:
8'707.96
13'648.51  ← Digits not aligned
888.88     ← Different widths
```

### With Tabular Numbers (Equal Width)
```
Net Worth Display:
8'707.96
13'648.51  ← Perfect alignment!
  888.88   ← All digits same width
```

## Benefits

✅ **Perfect Vertical Alignment**
- Numbers stack perfectly in columns
- No visual "jumping" when values change
- Professional financial app appearance

✅ **Swiss Precision Aesthetic**
- Clean, organized typography
- Matches banking/finance industry standards
- Enhances readability of financial data

✅ **Mobile-Native Implementation**
- Works on iOS and Android
- No web-specific CSS needed
- Platform-optimized rendering

## Platform Support

### iOS
- ✅ Full support for `fontVariant: ['tabular-nums']`
- Uses San Francisco font's tabular figures
- Native iOS appearance

### Android
- ✅ Full support for `fontVariant: ['tabular-nums']`
- Uses Roboto font's tabular figures
- Native Android appearance

### Expo Web
- ✅ Translates to CSS `font-variant-numeric: tabular-nums`
- Works in browser preview
- Consistent appearance

## Design System Integration

Tabular numbers are part of the Swiss Precision Design System:

**Typography Guidelines:**
```typescript
// From src/lib/design-tokens.ts
export const typography = {
  hero: {
    fontSize: 48,
    fontWeight: '700',
    letterSpacing: -1,
    // Use with fontVariant: ['tabular-nums']
  },
  // ... other scales
};
```

**Usage Pattern:**
```typescript
import { typography } from '@/lib/design-tokens';

<Text
  style={{
    ...typography.hero,
    fontVariant: ['tabular-nums'],  // Add for numbers
  }}
>
  {formatCurrency(amount)}
</Text>
```

## Currency Formatting Integration

Works perfectly with Swiss CHF formatting:

```typescript
formatCurrency(13648.51)
// Returns: "13'648.51 CHF"

// When displayed with fontVariant: ['tabular-nums']:
// - The apostrophe (') is consistently spaced
// - All digits have equal width
// - Decimal alignment is perfect
```

## Testing

### Visual Verification

1. **Dashboard Hero Card**
   - Open the app
   - View the TruePositionHero card
   - Notice perfect alignment of net worth, assets, and liabilities

2. **Design Test Page**
   - Navigate to `/design-test`
   - View the hero component demo
   - All amounts are perfectly aligned

3. **Dynamic Updates**
   - Add/remove accounts
   - Watch values update with consistent spacing
   - No visual "jumping" or misalignment

## Best Practices

### When to Use Tabular Numbers

✅ **Use for:**
- Financial amounts (currencies, percentages)
- Numeric tables and lists
- Progress indicators with numbers
- Account balances
- Transaction amounts
- Budget allocations

❌ **Don't use for:**
- Text content
- Non-numeric data
- Single numbers in isolation
- Phone numbers (proportional looks better)

### Implementation Pattern

```typescript
// ✅ Good - Currency displays
<Text style={{ fontVariant: ['tabular-nums'] }}>
  {formatCurrency(amount)}
</Text>

// ✅ Good - Numeric tables
<View>
  <Text style={{ fontVariant: ['tabular-nums'] }}>1'234.56</Text>
  <Text style={{ fontVariant: ['tabular-nums'] }}>  890.12</Text>
  <Text style={{ fontVariant: ['tabular-nums'] }}>   45.67</Text>
</View>

// ❌ Bad - Text content
<Text style={{ fontVariant: ['tabular-nums'] }}>
  Your account has 5 transactions
</Text>
```

## Related Documentation

- **Currency Formatting:** `src/lib/formatCurrency.ts`
- **Design Tokens:** `src/lib/design-tokens.ts`
- **Hero Component:** `src/components/TruePositionHero.tsx`
- **Typography Scale:** Design System documentation in README.md

## Summary

Tabular numbers are **fully implemented and working** in the Flow app using React Native's native `fontVariant` style property. No CSS files are needed - the implementation is mobile-native and works perfectly across iOS, Android, and Expo Web.

The TruePositionHero component demonstrates perfect implementation with all currency amounts using tabular numbers for professional, banking-grade typography.

---

**Status:** ✅ Complete
**Method:** React Native `fontVariant: ['tabular-nums']`
**Location:** `TruePositionHero.tsx` (lines 57, 91, 118)
**Platform Support:** iOS, Android, Expo Web
