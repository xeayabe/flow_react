# 🎨 FLOW DESIGN SYSTEM - COMPLETE UX/UI GUIDELINES

**Senior UX/UI Specialist Analysis - 30+ Years Experience**

Based on our entire conversation, here is the comprehensive design system for Flow app to ensure consistent look and feel across all screens.

---

## 📐 1. DESIGN PHILOSOPHY

### **Core Principle: "Calm Financial Control"**
- **Reduce anxiety**, don't create it
- **Proactive awareness** over reactive alerts
- **Empathetic communication** in all touchpoints
- **Progressive disclosure** - show what's needed, when needed
- **Celebration loops** - reinforce positive behavior
- **Privacy-first** - respect personal financial data

### **Target Aesthetic**
- Modern, premium iOS app
- Glassmorphism with depth
- Minimal but warm
- Swiss precision meets human empathy

---

## 🎨 2. COLOR PALETTE

### **Primary Colors**

```typescript
const COLORS = {
  // Core Brand Colors
  deepTeal: '#2C5F5D',        // Primary actions, selections, CTAs
  sageGreen: '#A8B5A1',       // Accents, success, income
  softAmber: '#E3A05D',       // Warnings, delete, important actions
  softLavender: '#B4A7D6',    // Secondary accents, highlights
  
  // Backgrounds
  darkBackground: '#1A1C1E',  // Main app background
  gradientTop: '#1A1C1E',     // Gradient start
  gradientBottom: '#2C5F5D',  // Gradient end
  
  // Glassmorphism
  glass: 'rgba(255, 255, 255, 0.03)',          // Card backgrounds
  glassBorder: 'rgba(255, 255, 255, 0.05)',    // Card borders
  glassHover: 'rgba(255, 255, 255, 0.05)',     // Hover state
  glassPressed: 'rgba(255, 255, 255, 0.07)',   // Active/pressed state
  
  // Text Hierarchy
  textPrimary: 'rgba(255, 255, 255, 0.9)',     // Main text, headings
  textSecondary: 'rgba(255, 255, 255, 0.7)',   // Subheadings, labels
  textTertiary: 'rgba(255, 255, 255, 0.5)',    // Metadata, hints
  textDisabled: 'rgba(255, 255, 255, 0.3)',    // Disabled elements
  
  // Semantic Colors
  income: '#A8B5A1',          // Income amounts (Sage Green)
  expense: 'rgba(255, 255, 255, 0.9)',  // Expense amounts (White)
  warning: '#E3A05D',         // Warnings (Soft Amber, NOT red)
  error: '#E3A05D',           // Errors (Soft Amber, NOT red)
  success: '#A8B5A1',         // Success states (Sage Green)
  info: 'rgba(168, 181, 161, 0.2)',  // Info boxes (Sage Green tint)
}
```

### **❌ NEVER USE:**
- Harsh red (`#FF0000`, `#DC143C`, `#B22222`) - creates anxiety
- Bright yellow (`#FFFF00`) - too aggressive
- Pure black (`#000000`) - use dark background instead
- Pure white backgrounds - use glass instead

### **Color Usage Rules:**

| Element | Color | Reasoning |
|---------|-------|-----------|
| **Primary CTA** | Deep Teal (#2C5F5D) | Trust, stability |
| **Income amounts** | Sage Green (#A8B5A1) | Positive reinforcement |
| **Expense amounts** | White (0.9 opacity) | Neutral, non-judgmental |
| **Delete/Warning** | Soft Amber (#E3A05D) | Noticeable but not alarming |
| **Shared expense badge** | Sage Green (0.2 bg, 0.3 border) | Collaborative, positive |
| **Selection/Active** | Deep Teal background (0.2 opacity) | Consistent brand |
| **Hover states** | White (0.05 opacity) | Subtle feedback |

---

## 🔤 3. TYPOGRAPHY

### **Font Family**
```typescript
const FONTS = {
  primary: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
}
```
Use native system fonts for performance and familiarity.

### **Type Scale**

```typescript
const TYPOGRAPHY = {
  // Display
  display: {
    fontSize: 48,
    fontWeight: '700',
    lineHeight: 56,
    letterSpacing: -0.5,
  },
  
  // Headings
  h1: {
    fontSize: 28,
    fontWeight: '700',
    lineHeight: 34,
  },
  h2: {
    fontSize: 22,
    fontWeight: '600',
    lineHeight: 28,
  },
  h3: {
    fontSize: 18,
    fontWeight: '600',
    lineHeight: 24,
  },
  
  // Body
  body: {
    fontSize: 15,
    fontWeight: '400',
    lineHeight: 22,
  },
  bodyBold: {
    fontSize: 15,
    fontWeight: '500',
    lineHeight: 22,
  },
  
  // Small
  small: {
    fontSize: 13,
    fontWeight: '400',
    lineHeight: 18,
  },
  
  // Metadata
  caption: {
    fontSize: 12,
    fontWeight: '400',
    lineHeight: 16,
    opacity: 0.7,
  },
  tiny: {
    fontSize: 11,
    fontWeight: '400',
    lineHeight: 14,
    opacity: 0.5,
  },
  
  // Special
  label: {
    fontSize: 11,
    fontWeight: '600',
    lineHeight: 14,
    textTransform: 'uppercase',
    letterSpacing: 0.1,
  },
  
  // Numbers (amounts, dates)
  number: {
    fontVariant: ['tabular-nums'],  // Monospaced numbers
  },
}
```

### **Typography Rules:**

- **Headers:** Always bold (600-700 weight)
- **Body text:** Regular (400) or medium (500)
- **Labels:** Uppercase, increased letter-spacing
- **Numbers:** ALWAYS use `tabular-nums` for alignment
- **Line height:** 1.4-1.5x font size for readability
- **Max line length:** 60-80 characters for body text

### **Specific Component Typography:**

| Component | Size | Weight | Color |
|-----------|------|--------|-------|
| Screen title | 28px | 700 | White 0.9 |
| Card title | 18px | 600 | White 0.9 |
| Amount (large) | 48px | 700 | Depends on type |
| Amount (medium) | 16px | 600 | Depends on type |
| Button text | 14px | 600 | Context-dependent |
| Input label | 12px | 500 | White 0.7 |
| Metadata | 11px | 400 | White 0.5 |
| Badge text | 9px | 700 | UPPERCASE |

---

## 📏 4. SPACING & SIZING

### **Spacing Scale (8pt Grid)**

```typescript
const SPACING = {
  xs: 4,    // Tight spacing (badges, icons)
  sm: 8,    // Small gaps (icon-text)
  md: 12,   // Medium gaps (form fields)
  lg: 16,   // Large gaps (section padding)
  xl: 20,   // Extra large (card padding)
  xxl: 24,  // Extra extra large (screen padding)
  xxxl: 32, // Huge gaps (major sections)
}
```

### **Component Sizing**

```typescript
const SIZES = {
  // Icons
  iconSmall: 16,
  iconMedium: 20,
  iconLarge: 24,
  iconXLarge: 28,
  
  // Emoji/Category Icons
  emojiSmall: 20,
  emojiMedium: 24,
  emojiLarge: 28,
  
  // Touch Targets (Minimum 44x44 for accessibility)
  buttonSmall: 40,
  buttonMedium: 44,
  buttonLarge: 48,
  
  // FAB (Floating Action Button)
  fab: 64,
  
  // Input Fields
  inputHeight: 48,
  
  // Cards
  cardPaddingSmall: 16,
  cardPaddingMedium: 20,
  cardPaddingLarge: 24,
  
  // Status Bar
  statusBarHeight: 44, // iOS
}
```

### **Spacing Rules:**

- **Card margins:** 16px bottom between cards
- **Screen padding:** 20-24px horizontal
- **Section gaps:** 24-32px between major sections
- **Form field spacing:** 20px bottom
- **Icon-text gap:** 8-12px
- **List item height:** Minimum 60px for tap targets

---

## 🔲 5. BORDER RADIUS

```typescript
const BORDER_RADIUS = {
  sm: 12,   // Input fields, small buttons
  md: 16,   // Standard cards, medium components
  lg: 20,   // Large cards, main containers
  xl: 24,   // Bottom sheets, modals (top corners)
  round: 999, // Pills, badges, completely round
}
```

### **Border Radius Rules:**

| Component | Radius | Reason |
|-----------|--------|--------|
| Small buttons | 12px | Approachable |
| Input fields | 12px | Soft, inviting |
| Transaction cards | 16px | Modern, friendly |
| Glass cards (main) | 20px | Premium feel |
| Bottom sheets | 24px (top only) | iOS-native feel |
| FAB button | 50% (circle) | Classic FAB |
| Badges | 4-6px | Subtle |
| Avatar/Emoji container | 12px | Consistent with inputs |

---

## 💎 6. GLASSMORPHISM EFFECT

### **Standard Glass Card**

```tsx
{
  backgroundColor: 'rgba(255, 255, 255, 0.03)',
  borderWidth: 1,
  borderColor: 'rgba(255, 255, 255, 0.05)',
  borderRadius: 20,
  padding: 24,
  // Web only:
  backdropFilter: 'blur(12px)',
  WebkitBackdropFilter: 'blur(12px)',
}
```

### **Glass Variations:**

```typescript
const GLASS_STYLES = {
  // Standard card
  card: {
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    borderColor: 'rgba(255, 255, 255, 0.05)',
    borderWidth: 1,
  },
  
  // Subtle (less prominent)
  subtle: {
    backgroundColor: 'rgba(255, 255, 255, 0.02)',
    borderColor: 'rgba(255, 255, 255, 0.03)',
    borderWidth: 1,
  },
  
  // Elevated (more prominent)
  elevated: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderColor: 'rgba(255, 255, 255, 0.08)',
    borderWidth: 1,
  },
  
  // Hover state
  hover: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
  },
  
  // Active/Pressed state
  pressed: {
    backgroundColor: 'rgba(255, 255, 255, 0.07)',
  },
  
  // Selected state
  selected: {
    backgroundColor: 'rgba(44, 95, 93, 0.2)', // Deep Teal tint
    borderColor: '#2C5F5D',
    borderWidth: 2,
  },
}
```

### **Glassmorphism Rules:**

- **Always use** on cards, modals, bottom sheets
- **Layer properly:** Ensure content sits on top (z-index)
- **Don't stack** too many glass layers (max 2-3 levels)
- **Backdrop blur:** 12px standard, 20px for overlays
- **Border:** Always include subtle border for definition

---

## 🎭 7. COMPONENT STATES

### **Interactive States**

```typescript
const STATES = {
  // Default
  default: {
    opacity: 1,
    transform: [{ scale: 1 }],
  },
  
  // Hover
  hover: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    cursor: 'pointer',
  },
  
  // Pressed/Active
  pressed: {
    backgroundColor: 'rgba(255, 255, 255, 0.07)',
    transform: [{ scale: 0.98 }],
  },
  
  // Disabled
  disabled: {
    opacity: 0.4,
    cursor: 'not-allowed',
  },
  
  // Selected
  selected: {
    backgroundColor: 'rgba(44, 95, 93, 0.2)',
    borderColor: '#2C5F5D',
    borderWidth: 2,
  },
  
  // Focus (for inputs)
  focus: {
    borderColor: '#2C5F5D',
    borderWidth: 2,
    outline: 'none',
  },
}
```

### **State Transition Rules:**

- **Duration:** 0.2s for most interactions
- **Easing:** `ease-out` for entering, `ease-in` for exiting
- **Hover:** Slight background lightening
- **Press:** Slight scale down (0.98) + darker background
- **Disabled:** 40% opacity, no pointer events

---

## 🔘 8. BUTTONS

### **Primary Button (CTA)**

```tsx
{
  backgroundColor: '#2C5F5D',  // Deep Teal
  borderRadius: 12,
  paddingVertical: 14,
  paddingHorizontal: 24,
  minWidth: 120,
  minHeight: 48,
  alignItems: 'center',
  justifyContent: 'center',
}

// Text
{
  color: '#FFFFFF',
  fontSize: 14,
  fontWeight: '600',
}
```

### **Secondary Button (Outline)**

```tsx
{
  backgroundColor: 'transparent',
  borderWidth: 2,
  borderColor: 'rgba(255, 255, 255, 0.1)',
  borderRadius: 12,
  paddingVertical: 14,
  paddingHorizontal: 24,
}

// Text
{
  color: 'rgba(255, 255, 255, 0.9)',
  fontSize: 14,
  fontWeight: '600',
}
```

### **Ghost Button (Minimal)**

```tsx
{
  backgroundColor: 'rgba(255, 255, 255, 0.05)',
  borderRadius: 12,
  paddingVertical: 12,
  paddingHorizontal: 20,
}
```

### **Destructive Button (Delete)**

```tsx
{
  backgroundColor: 'rgba(255, 255, 255, 0.9)',
  borderWidth: 2,
  borderColor: '#2C5F5D',
  borderRadius: 12,
  paddingVertical: 14,
  paddingHorizontal: 24,
}

// Text
{
  color: '#E3A05D',  // Soft Amber, NOT red
  fontSize: 14,
  fontWeight: '600',
}
```

### **Icon Button (Small)**

```tsx
{
  width: 40,
  height: 40,
  borderRadius: 12,
  backgroundColor: 'rgba(255, 255, 255, 0.03)',
  borderWidth: 1,
  borderColor: 'rgba(255, 255, 255, 0.05)',
  alignItems: 'center',
  justifyContent: 'center',
}
```

### **FAB (Floating Action Button)**

```tsx
{
  position: 'fixed',
  bottom: 24,
  right: 24,
  width: 64,
  height: 64,
  borderRadius: 32,
  backgroundColor: 'rgba(255, 255, 255, 0.9)',
  borderWidth: 2,
  borderColor: '#2C5F5D',
  shadowColor: '#000',
  shadowOffset: { width: 0, height: 8 },
  shadowOpacity: 0.3,
  shadowRadius: 24,
  elevation: 8,
}

// Hover
{
  transform: [{ scale: 1.1 }],
  shadowRadius: 32,
}
```

### **Button Rules:**

- **Minimum touch target:** 44x44px (accessibility)
- **Primary:** Use sparingly, 1 per screen max
- **Labels:** Action-oriented ("Add Transaction", not "Submit")
- **Icon + Text:** Icon on left, 8-12px gap
- **Loading state:** Spinner replaces text, button disabled
- **Disabled:** 40% opacity, no hover effects

---

## 📝 9. FORM INPUTS

### **Text Input**

```tsx
{
  backgroundColor: 'rgba(255, 255, 255, 0.05)',
  borderWidth: 1,
  borderColor: 'rgba(255, 255, 255, 0.1)',
  borderRadius: 12,
  paddingVertical: 12,
  paddingHorizontal: 16,
  fontSize: 14,
  color: 'rgba(255, 255, 255, 0.9)',
  minHeight: 48,
}

// Focus state
{
  borderColor: '#2C5F5D',
  borderWidth: 2,
  backgroundColor: 'rgba(255, 255, 255, 0.07)',
}

// Placeholder
{
  color: 'rgba(255, 255, 255, 0.3)',
}
```

### **Amount Input (Large)**

```tsx
{
  fontSize: 48,
  fontWeight: '700',
  textAlign: 'center',
  color: 'rgba(255, 255, 255, 0.9)',
  fontVariant: ['tabular-nums'],
  backgroundColor: 'transparent',
  borderWidth: 0,
  padding: 16,
}
```

### **Dropdown/Select**

```tsx
// Trigger button
{
  backgroundColor: 'rgba(255, 255, 255, 0.05)',
  borderWidth: 1,
  borderColor: 'rgba(255, 255, 255, 0.1)',
  borderRadius: 12,
  paddingVertical: 12,
  paddingHorizontal: 16,
  flexDirection: 'row',
  justifyContent: 'space-between',
  alignItems: 'center',
}

// Chevron
{
  fontSize: 18,
  opacity: 0.4,
  transform: [{ rotate: open ? '180deg' : '0deg' }],
}
```

### **Toggle Switch**

```tsx
// Track (off)
{
  width: 48,
  height: 28,
  borderRadius: 14,
  backgroundColor: 'rgba(255, 255, 255, 0.1)',
}

// Track (on)
{
  backgroundColor: '#2C5F5D',
}

// Thumb
{
  width: 24,
  height: 24,
  borderRadius: 12,
  backgroundColor: '#FFFFFF',
  position: 'absolute',
  top: 2,
  left: isOn ? 22 : 2,
  transition: 'left 0.2s',
}
```

### **Form Field Structure**

```tsx
<View style={{ marginBottom: 20 }}>
  {/* Label */}
  <Text style={{
    fontSize: 12,
    fontWeight: '500',
    color: 'rgba(255, 255, 255, 0.7)',
    marginBottom: 8,
  }}>
    Label
  </Text>
  
  {/* Input */}
  <TextInput {...} />
  
  {/* Helper text / Error */}
  <Text style={{
    fontSize: 11,
    color: 'rgba(255, 255, 255, 0.5)',
    marginTop: 6,
  }}>
    Helper text
  </Text>
</View>
```

---

## 🗂️ 10. CARDS & CONTAINERS

### **Standard Glass Card**

```tsx
<View style={{
  backgroundColor: 'rgba(255, 255, 255, 0.03)',
  borderWidth: 1,
  borderColor: 'rgba(255, 255, 255, 0.05)',
  borderRadius: 20,
  padding: 24,
  marginBottom: 16,
}}>
  {children}
</View>
```

### **Transaction Card**

```tsx
{
  backgroundColor: 'rgba(255, 255, 255, 0.03)',
  borderWidth: 1,
  borderColor: 'rgba(255, 255, 255, 0.05)',
  borderRadius: 16,
  padding: 16,
  marginBottom: 8,
  flexDirection: 'row',
  justifyContent: 'space-between',
  alignItems: 'center',
}
```

### **Widget Card (Dashboard)**

```tsx
{
  backgroundColor: 'rgba(255, 255, 255, 0.03)',
  borderRadius: 20,
  padding: 20,
  marginBottom: 16,
}

// Title
{
  fontSize: 18,
  fontWeight: '600',
  color: 'rgba(255, 255, 255, 0.9)',
  marginBottom: 16,
}
```

### **Bottom Sheet**

```tsx
{
  position: 'fixed',
  bottom: 0,
  left: 0,
  right: 0,
  backgroundColor: '#1A1C1E',  // Solid, not glass
  borderTopLeftRadius: 24,
  borderTopRightRadius: 24,
  maxHeight: '70vh',
  paddingTop: 12,
}

// Handle
{
  width: 40,
  height: 4,
  borderRadius: 2,
  backgroundColor: 'rgba(255, 255, 255, 0.3)',
  alignSelf: 'center',
  marginBottom: 12,
}

// Backdrop
{
  position: 'fixed',
  top: 0,
  left: 0,
  right: 0,
  bottom: 0,
  backgroundColor: 'rgba(0, 0, 0, 0.6)',
  backdropFilter: 'blur(4px)',
}
```

---

## 🏷️ 11. BADGES & LABELS

### **Shared Badge**

```tsx
{
  backgroundColor: 'rgba(168, 181, 161, 0.2)',
  borderWidth: 1,
  borderColor: 'rgba(168, 181, 161, 0.3)',
  paddingHorizontal: 6,
  paddingVertical: 2,
  borderRadius: 4,
}

// Text
{
  color: '#A8B5A1',
  fontSize: 9,
  fontWeight: '700',
  textTransform: 'uppercase',
  letterSpacing: 0.5,
}
```

### **Status Badge (Generic)**

```tsx
// Success
{
  backgroundColor: 'rgba(168, 181, 161, 0.2)',
  borderColor: 'rgba(168, 181, 161, 0.3)',
  color: '#A8B5A1',
}

// Warning
{
  backgroundColor: 'rgba(227, 160, 93, 0.2)',
  borderColor: 'rgba(227, 160, 93, 0.3)',
  color: '#E3A05D',
}

// Info
{
  backgroundColor: 'rgba(180, 167, 214, 0.2)',
  borderColor: 'rgba(180, 167, 214, 0.3)',
  color: '#B4A7D6',
}
```

### **Category Chip (Quick Select)**

```tsx
// Unselected
{
  backgroundColor: 'rgba(255, 255, 255, 0.03)',
  borderWidth: 2,
  borderColor: 'rgba(255, 255, 255, 0.05)',
  borderRadius: 12,
  padding: 10,
}

// Selected
{
  backgroundColor: 'rgba(44, 95, 93, 0.2)',
  borderColor: '#2C5F5D',
}

// Content
<Text style={{ fontSize: 20 }}>{emoji}</Text>
<Text style={{ 
  fontSize: 10, 
  color: 'rgba(255, 255, 255, 0.8)',
  marginTop: 4 
}}>
  {name}
</Text>
```

---

## 📊 12. DATA VISUALIZATION

### **Progress Bar**

```tsx
// Track
{
  height: 8,
  backgroundColor: 'rgba(255, 255, 255, 0.1)',
  borderRadius: 4,
  overflow: 'hidden',
}

// Fill
{
  height: '100%',
  backgroundColor: '#2C5F5D',  // Or category-specific color
  borderRadius: 4,
  transition: 'width 0.3s ease',
}
```

### **Percentage Display**

```tsx
// Small (inline)
{
  fontSize: 12,
  fontWeight: '600',
  color: 'rgba(255, 255, 255, 0.7)',
}

// Large (prominent)
{
  fontSize: 24,
  fontWeight: '700',
  color: 'rgba(255, 255, 255, 0.9)',
}
```

### **Currency Formatting**

```typescript
// Swiss format
function formatCurrency(amount: number): string {
  return amount.toLocaleString('de-CH', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).replace(/,/g, ''');
}

// Examples:
// 1234.56 → "1'234.56"
// 1000000 → "1'000'000.00"
```

### **Amount Display Rules:**

- **Income:** Sage green (#A8B5A1) + `+` prefix
- **Expense:** White (0.9 opacity) + `-` prefix
- **Suffix:** Always include "CHF" with space before
- **Alignment:** Right-aligned in lists
- **Font variant:** ALWAYS `tabular-nums` for monospacing

---

## 🎬 13. ANIMATIONS & TRANSITIONS

### **Standard Transitions**

```typescript
const TRANSITIONS = {
  // Quick interactions
  fast: {
    duration: 150,
    easing: 'ease-out',
  },
  
  // Standard interactions
  normal: {
    duration: 200,
    easing: 'ease-out',
  },
  
  // Slow, noticeable changes
  slow: {
    duration: 300,
    easing: 'ease-in-out',
  },
  
  // Spring animations
  spring: {
    tension: 100,
    friction: 8,
  },
}
```

### **Animation Use Cases:**

| Action | Duration | Easing | Notes |
|--------|----------|--------|-------|
| Hover | 150ms | ease-out | Subtle, instant feedback |
| Press | 150ms | ease-in | Quick compression |
| Open modal | 300ms | ease-out | Noticeable entrance |
| Close modal | 200ms | ease-in | Quick exit |
| Expand section | 300ms | ease-out | Smooth reveal |
| Collapse section | 200ms | ease-in | Quick hide |
| Swipe gesture | Spring | - | Natural physics |
| Toggle switch | 200ms | ease-out | Satisfying flick |
| FAB hover | 300ms | ease-out | Prominent feedback |

### **Entrance Animations (Screen Load)**

```tsx
// Stagger pattern for lists
<Animated.View entering={FadeInDown.delay(0).duration(400)}>
  {item1}
</Animated.View>
<Animated.View entering={FadeInDown.delay(100).duration(400)}>
  {item2}
</Animated.View>
<Animated.View entering={FadeInDown.delay(200).duration(400)}>
  {item3}
</Animated.View>
```

**Rules:**
- **Stagger:** 100ms between items
- **Max stagger:** Don't delay more than 400ms
- **Direction:** Fade in + slide up (from bottom)

---

## 🖱️ 14. INTERACTION PATTERNS

### **Tap Targets**

```typescript
const TAP_TARGETS = {
  minimum: 44,      // iOS accessibility minimum
  comfortable: 48,  // Preferred for primary actions
  small: 40,        // Icon buttons only
}
```

**Rules:**
- **Never below 40x40px** for clickable elements
- **Primary actions:** 48x48px minimum
- **Spacing:** Minimum 8px between tap targets

### **Swipe Gestures**

```typescript
// Swipe to delete (transaction list)
const SWIPE = {
  threshold: 50,          // Pixels to trigger action
  maxDistance: 100,       // Maximum swipe allowed
  snapDistance: 80,       // Final position when revealed
  velocity: 0.3,          // Minimum velocity to trigger
}
```

**Rules:**
- **Direction detection:** Require horizontal > vertical movement
- **Threshold:** 50px minimum swipe to activate
- **Snap points:** Clear open/closed positions
- **Return animation:** Spring back if not past threshold

### **Pull to Refresh**

```typescript
{
  triggerDistance: 80,
  maxDistance: 120,
  spinnerSize: 24,
}
```

### **Long Press**

```typescript
{
  duration: 500,  // 500ms to trigger
}
```

**Use for:** Context menus, alternative actions

---

## 📱 15. SCREEN LAYOUTS

### **Standard Screen Structure**

```tsx
<SafeAreaView>
  <StatusBar style="light" />
  
  {/* Sticky Status Bar Background (glassmorphism) */}
  <View style={{
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    height: 44,
    backgroundColor: 'rgba(26, 28, 30, 0.7)',
    backdropFilter: 'blur(20px)',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.05)',
    zIndex: 9999,
    opacity: isScrolled ? 1 : 0,
  }} />
  
  {/* Header */}
  <View style={{
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    marginBottom: 24,
  }}>
    {/* Back button + Title */}
    {/* Action buttons */}
  </View>
  
  {/* Scrollable Content */}
  <ScrollView 
    style={{ flex: 1 }}
    contentContainerStyle={{ paddingHorizontal: 20 }}
    onScroll={handleScroll}
    scrollEventThrottle={16}
  >
    {/* Content */}
  </ScrollView>
  
  {/* FAB (if needed) */}
  <FAB />
</SafeAreaView>
```

### **Screen Padding**

```typescript
const SCREEN_PADDING = {
  horizontal: 20,
  top: 16,
  bottom: 24,
}
```

### **Safe Areas**

- **Always use SafeAreaView** for top/bottom insets
- **Status bar:** Light content (white text)
- **Background:** Gradient from dark to teal

---

## 🔔 16. FEEDBACK & NOTIFICATIONS

### **Toast Notification**

```tsx
{
  position: 'top',
  backgroundColor: 'rgba(26, 28, 30, 0.95)',
  borderRadius: 16,
  padding: 16,
  marginTop: 60,  // Below status bar
  marginHorizontal: 20,
  borderWidth: 1,
  borderColor: 'rgba(255, 255, 255, 0.1)',
  shadowColor: '#000',
  shadowOffset: { width: 0, height: 4 },
  shadowOpacity: 0.3,
  shadowRadius: 12,
}

// Success
{
  borderLeftWidth: 3,
  borderLeftColor: '#A8B5A1',
}

// Error/Warning
{
  borderLeftWidth: 3,
  borderLeftColor: '#E3A05D',
}
```

### **Toast Messages (Tone)**

```typescript
// ✅ Good (empathetic)
"Transaction saved!"
"Budget updated successfully"
"We couldn't save that. Try again?"
"Hmm, something went wrong. Please retry."

// ❌ Bad (technical, cold)
"Error: 500 Internal Server Error"
"Transaction failed"
"Invalid input"
```

### **Loading States**

```tsx
// Skeleton placeholder (preferred)
{
  backgroundColor: 'rgba(255, 255, 255, 0.05)',
  borderRadius: 12,
  height: 60,
  marginBottom: 8,
}

// Spinner (when skeleton not possible)
<ActivityIndicator 
  size="large" 
  color="#2C5F5D" 
/>
```

### **Empty States**

```tsx
<View style={{
  padding: 60,
  alignItems: 'center',
}}>
  <Text style={{ fontSize: 48, marginBottom: 16 }}>
    {emoji}
  </Text>
  <Text style={{
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.7)',
    textAlign: 'center',
    lineHeight: 22,
  }}>
    {message}
  </Text>
  {action && (
    <Button style={{ marginTop: 24 }}>
      {actionLabel}
    </Button>
  )}
</View>
```

**Examples:**
- 📊 "No transactions yet. Tap + to add your first transaction."
- 🔁 "No recurring transactions set up yet."
- 💰 "Add a wallet to start tracking your finances."

---

## 🎯 17. NAVIGATION PATTERNS

### **Back Button**

```tsx
{
  width: 40,
  height: 40,
  borderRadius: 12,
  backgroundColor: 'rgba(255, 255, 255, 0.03)',
  borderWidth: 1,
  borderColor: 'rgba(255, 255, 255, 0.05)',
  alignItems: 'center',
  justifyContent: 'center',
}

// Icon
<Text style={{ fontSize: 18 }}>←</Text>
```

### **Tab Bar (Floating Island Navigation)**

Flow uses a floating pill-shaped navigation bar (see `floatingnavigation.md` for full spec).

```tsx
// Outer container (floating with 16px margins)
{
  position: 'absolute',
  bottom: 0,
  left: 16,    // spacing.md
  right: 16,   // spacing.md
  paddingBottom: insets.bottom, // Safe area
}

// Glass pill (BlurView)
{
  height: 60,
  borderRadius: 100,   // Perfect pill shape
  overflow: 'hidden',
}
// BlurView: intensity={50} tint="dark"

// Sliding bubble (animated active indicator)
{
  width: 70,
  height: 48,
  borderRadius: 35,
  // LinearGradient: sage green (0.25 -> 0.15 opacity)
  // Spring animation: { damping: 15, stiffness: 150, mass: 0.8 }
}

// Tab icon (active)
{
  color: '#A8B5A1',  // Sage green
  size: 28,
  scale: 1.1,        // + breathing pulse 1.0 -> 1.05
}

// Tab icon (inactive)
{
  color: 'rgba(255, 255, 255, 0.3)',  // textWhiteDisabled
  size: 24,
}
```

**Key Rules:**
- Tab row: EXACTLY 5 plain `View` children with `flex: 1`
- Sliding bubble: Sibling of tab row, NOT inside it
- No tab labels (icons only)
- No tab elevation/translateY (scale + breathing only)

### **Breadcrumbs (if needed)**

```tsx
<Text style={{
  fontSize: 12,
  color: 'rgba(255, 255, 255, 0.5)',
}}>
  Dashboard › Transactions › Edit
</Text>
```

---

## 📐 18. LAYOUT GRIDS

### **Quick Category Grid (3 columns)**

```tsx
{
  display: 'grid',
  gridTemplateColumns: '1fr 1fr 1fr',
  gap: 8,
}
```

### **Two-Button Layout (50/50)**

```tsx
{
  flexDirection: 'row',
  gap: 12,
}

// Each button
{
  flex: 1,
}
```

### **Dashboard Widgets**

```tsx
// Full width
<Widget style={{ marginBottom: 16 }} />

// Two column (if needed)
<View style={{ flexDirection: 'row', gap: 12 }}>
  <Widget style={{ flex: 1 }} />
  <Widget style={{ flex: 1 }} />
</View>
```

---

## ✍️ 19. CONTENT TONE & VOICE

### **Principles**

- **Empathetic, not robotic:** "We couldn't save that" vs "Error: Save failed"
- **Encouraging, not judgmental:** "You've spent X of Y" vs "You're over budget!"
- **Proactive, not reactive:** "Upcoming: Rent due in 3 days" vs popup on payday
- **Clear, not jargon:** "Budget" vs "Fiscal allocation framework"

### **Example Messages**

| Situation | ❌ Bad | ✅ Good |
|-----------|--------|---------|
| Over budget | "ALERT: Budget exceeded!" | "You've spent 120% of your dining budget this period" |
| Transaction saved | "Success" | "Transaction saved! ✓" |
| Error saving | "Error: 500" | "We couldn't save that. Try again?" |
| Delete confirm | "Are you sure?" | "Delete this transaction?" |
| Empty list | "No data" | "No transactions yet. Tap + to add your first." |
| Upcoming bill | "Bill due!" | "Rent (2'100 CHF) due in 3 days" |

---

## 🔒 20. ACCESSIBILITY

### **Minimum Requirements**

- **Touch targets:** 44x44px minimum (iOS guideline)
- **Contrast ratio:** 4.5:1 for text (WCAG AA)
- **Focus indicators:** Visible when navigating with keyboard/switch
- **Screen reader support:** Meaningful labels for all interactive elements
- **Reduce motion:** Respect system preference

### **Color Contrast Checks**

- **White on Deep Teal:** ✅ Pass (7.8:1)
- **Sage Green on Dark:** ✅ Pass (4.6:1)
- **Soft Amber on Dark:** ✅ Pass (5.2:1)
- **White 0.9 on Dark:** ✅ Pass (13.1:1)

### **Semantic HTML/Components**

```tsx
// ✅ Good
<Pressable 
  accessibilityRole="button"
  accessibilityLabel="Add transaction"
  accessibilityHint="Opens transaction entry form"
>

// ❌ Bad
<View onPress={...}>
  <Text>+</Text>
</View>
```

---

## 📋 21. COMPONENT CHECKLIST

**Before implementing any component, verify:**

- [ ] Uses Flow color palette (no harsh reds, no off-brand colors)
- [ ] Glassmorphism applied correctly (0.03 bg, 0.05 border)
- [ ] Border radius from standard scale (12/16/20px)
- [ ] Spacing follows 8pt grid
- [ ] Touch targets minimum 44x44px
- [ ] Typography uses defined scale
- [ ] Hover/press states implemented
- [ ] Transitions are smooth (200-300ms)
- [ ] Swiss currency formatting (apostrophe separator)
- [ ] Income/expense colors correct (sage green/white)
- [ ] Empathetic error messages
- [ ] Privacy-first (scoped to userId)
- [ ] Accessible (screen reader labels, contrast)
- [ ] Responsive to system dark/light mode (Flow is dark-first)

---

## 🎨 22. DESIGN TOKENS (Complete Export)

```typescript
// /src/theme/tokens.ts

export const TOKENS = {
  colors: {
    brand: {
      deepTeal: '#2C5F5D',
      sageGreen: '#A8B5A1',
      softAmber: '#E3A05D',
      softLavender: '#B4A7D6',
    },
    background: {
      dark: '#1A1C1E',
      gradientTop: '#1A1C1E',
      gradientBottom: '#2C5F5D',
    },
    glass: {
      background: 'rgba(255, 255, 255, 0.03)',
      border: 'rgba(255, 255, 255, 0.05)',
      hover: 'rgba(255, 255, 255, 0.05)',
      pressed: 'rgba(255, 255, 255, 0.07)',
      elevated: 'rgba(255, 255, 255, 0.08)',
    },
    text: {
      primary: 'rgba(255, 255, 255, 0.9)',
      secondary: 'rgba(255, 255, 255, 0.7)',
      tertiary: 'rgba(255, 255, 255, 0.5)',
      disabled: 'rgba(255, 255, 255, 0.3)',
    },
    semantic: {
      income: '#A8B5A1',
      expense: 'rgba(255, 255, 255, 0.9)',
      warning: '#E3A05D',
      error: '#E3A05D',
      success: '#A8B5A1',
      info: 'rgba(168, 181, 161, 0.2)',
    },
  },
  
  spacing: {
    xs: 4,
    sm: 8,
    md: 12,
    lg: 16,
    xl: 20,
    xxl: 24,
    xxxl: 32,
  },
  
  borderRadius: {
    sm: 12,
    md: 16,
    lg: 20,
    xl: 24,
    round: 999,
  },
  
  typography: {
    fontSize: {
      display: 48,
      h1: 28,
      h2: 22,
      h3: 18,
      body: 15,
      small: 13,
      caption: 12,
      tiny: 11,
      label: 11,
      badge: 9,
    },
    fontWeight: {
      regular: '400',
      medium: '500',
      semibold: '600',
      bold: '700',
    },
    lineHeight: {
      tight: 1.2,
      normal: 1.5,
      relaxed: 1.6,
    },
  },
  
  shadows: {
    small: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.1,
      shadowRadius: 4,
      elevation: 2,
    },
    medium: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.2,
      shadowRadius: 8,
      elevation: 4,
    },
    large: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 8 },
      shadowOpacity: 0.3,
      shadowRadius: 24,
      elevation: 8,
    },
  },
  
  transitions: {
    fast: 150,
    normal: 200,
    slow: 300,
  },
} as const;
```

---

## 📚 23. WHEN TO USE WHAT

### **Component Selection Guide**

| Need | Use This | Not This |
|------|----------|----------|
| Display data | GlassCard | Plain View |
| User action | Button with feedback | Text link |
| Enter text | Input with label | Bare TextInput |
| Choose option | BottomSheet selector | Native picker |
| Show amount | formatCurrency() + colors | Plain number |
| Delete action | Soft amber, confirm | Harsh red, instant |
| Success feedback | Toast with checkmark | Silent success |
| Loading data | Skeleton placeholder | Full-screen spinner |
| Empty list | Emoji + message + CTA | "No data" text |
| Navigate back | Glass button with arrow | Text link |
| Major action | FAB | Header button |
| Quick toggle | Switch | Checkbox |
| Select category | Icon chips grid | Dropdown |

---

## 🎯 FINAL GOLDEN RULES

1. **Glass Everything** - Cards, modals, inputs use glassmorphism
2. **Calm Colors** - No harsh red, use soft amber for warnings
3. **Swiss Precision** - Currency formatting with apostrophes
4. **Empathetic Tone** - "We couldn't save that" not "Error"
5. **Privacy First** - Always scope to userId
6. **Proactive Not Reactive** - Awareness over alerts
7. **Touch Friendly** - 44px minimum tap targets
8. **Smooth Transitions** - 200-300ms with ease-out
9. **Tabular Numbers** - Always for amounts
10. **Consistent Spacing** - 8pt grid system

---

**This design system ensures Flow maintains its "Calm Financial Control" philosophy while delivering a premium, consistent iOS experience across all screens.** 🎨✨
