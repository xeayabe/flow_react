# FLOATING ISLAND NAVIGATION - IMPLEMENTATION SPECIFICATION

**Last Updated**: February 12, 2026
**Status**: Implemented (TECH-010)

## Executive Summary

### What's Implemented
1. **Floating Container**: Navigation detached from screen edges (16px margin), creating depth and premium feel
2. **Sliding Bubble**: Animated sage-green bubble slides between active tabs with spring physics
3. **Gesture Navigation**: Swipe horizontally to switch tabs + drag-to-select across tabs
4. **Breathing Animations**: Subtle scale pulses on active icon
5. **Spring Physics**: All animations use natural spring curves for organic feel
6. **Haptic Feedback**: Light/medium impacts on tab interactions
7. **Reduced Motion**: Full accessibility support for system motion preferences

### Why This Works
- **Distinctive**: Users remember the "floating island" - it's unique and branded
- **Premium**: Glassmorphism, glows, and physics create luxury feel
- **iOS-Native**: Respects Human Interface Guidelines while being bold
- **Calm**: Soft glows and organic animations reduce anxiety
- **Functional**: Swipe and drag gestures improve efficiency

---

## 1. Layout Blueprint

### Structure

```
                    [Screen Edges]
    +----------------------------------------+
    |                                        |
    |          [Screen Content]              |
    |                                        |
    |     +----------------------------+     |
    | 16px|   [Floating Glass Pill]    |16px | <-- Floating
    |     |                            |     |
    |     |  [Sliding Bubble]          |     | <-- Animated background
    |     |  /\  /\  /\  /\  /\       |     |
    |     | (O) (O) (O) (O) (O) Tabs  |     | <-- 5 equal slots
    |     +----------------------------+     |
    |             ^ safe area padding        |
    +----------------------------------------+
```

### Visual Hierarchy (Z-Axis)
```
Layer 4: Tab Icons (interactive, on top)
Layer 3: Sliding Bubble (animated sage gradient, behind icons)
Layer 2: Dark Overlay (rgba(0,0,0,0.1))
Layer 1: Glass Container (BlurView, tint: dark)
Layer 0: Screen Content
```

### Grid System
- Container width: Screen width - 32px (16px margins each side)
- Tab distribution: 5 equal columns (20% each, `flex: 1`)
- Active tab: Scales to 110% (icon only, no layout shift)
- Vertical safe area: Device safe area inset as container paddingBottom

---

## 2. Component Architecture

### File Structure (Actual)
```
/src/components/navigation/
+-- FloatingTabBar.tsx          # Main container + sliding bubble + tabs
+-- MorphingBlob.tsx            # UNUSED (kept for reference, not imported)
+-- useTabPositions.ts          # UNUSED (kept for reference, not imported)
+-- useTabSwipeGesture.ts       # Swipe gesture hook (horizontal tab switching)
+-- useReducedMotion.ts         # Accessibility: reduced motion detection
```

### Component Hierarchy (FloatingTabBar.tsx)

```
GestureDetector (combinedGesture: Race(dragGesture, swipeGesture))
  +-- View (container) [position: absolute, bottom: 0, left/right: 16px]
      +-- paddingBottom: insets.bottom (safe area)
      +-- BlurView (blurContainer) [height: 60, borderRadius: 100]
          +-- View (overlay) [absoluteFill, rgba(0,0,0,0.1)]
          +-- Animated.View (slidingBubble) [position: absolute, 70x48px]
          |   +-- LinearGradient (sage green)
          +-- View (tabsRow) [flex: 1, flexDirection: row, onLayout]
              +-- View (tabSlot) [flex: 1] x5 (EXACTLY 5 children)
                  +-- Pressable (full slot, accessibility)
                      +-- MemoizedAnimatedTabIcon (scale + breathing)
```

**CRITICAL LAYOUT RULE**: The `tabsRow` contains EXACTLY 5 plain `View` children from `state.routes.map()`. The sliding bubble is a SIBLING of `tabsRow`, NOT inside it. This prevents flex layout issues.

### Sub-Components

| Component | Location | Purpose |
|-----------|----------|---------|
| **FloatingTabBar** | FloatingTabBar.tsx | Main navigation component |
| **AnimatedTabIcon** | FloatingTabBar.tsx (internal) | Handles scale, breathing, glow per icon |
| **MemoizedAnimatedTabIcon** | FloatingTabBar.tsx | `React.memo` wrapper for performance |
| **useTabSwipeGesture** | useTabSwipeGesture.ts | Horizontal swipe between adjacent tabs |
| **useReducedMotion** | useReducedMotion.ts | Detects system reduced motion preference |

---

## 3. Visual Specifications

### Floating Container
```typescript
// Outer container
container: {
  position: 'absolute',
  bottom: 0,
  left: spacing.md,    // 16px
  right: spacing.md,   // 16px
  paddingBottom: insets.bottom, // Safe area gap (invisible)
}

// Glass pill
blurContainer: {
  height: 60,          // Fixed height
  borderRadius: 100,   // Perfect pill shape (capped by height)
  overflow: 'hidden',
}

// BlurView props
intensity: 50
tint: 'dark'

// Dark overlay (adds depth inside blur)
overlay: {
  ...StyleSheet.absoluteFillObject,
  backgroundColor: 'rgba(0, 0, 0, 0.1)',
}
```

### Sliding Bubble
```typescript
// Constants
BUBBLE_WIDTH = 70   // Fixed width
BUBBLE_HEIGHT = 48  // Fixed height

// Style
slidingBubble: {
  position: 'absolute',
  width: BUBBLE_WIDTH,       // 70px
  height: BUBBLE_HEIGHT,     // 48px
  borderRadius: BUBBLE_WIDTH / 2,  // 35px (pill shape)
  overflow: 'hidden',
  left: 0,                   // Positioned via translateX
  top: '50%',
  marginTop: -BUBBLE_HEIGHT / 2,  // -24px (vertical centering)

  // Outer glow
  shadowColor: colors.sageGreen,
  shadowOffset: { width: 0, height: 0 },
  shadowOpacity: 0.3,
  shadowRadius: 16,
  elevation: 4,
}

// Gradient fill
LinearGradient:
  colors: [
    'rgba(168, 181, 161, 0.25)',  // Sage green top (brighter)
    'rgba(168, 181, 161, 0.15)',  // Sage green bottom (softer)
  ]
  start: { x: 0, y: 0 }
  end: { x: 0, y: 1 }

// Positioning (uses onLayout measurement of tabsRow)
const [rowLayout, setRowLayout] = useState({ x: 0, width: containerWidth });
const slotWidth = rowLayout.width / state.routes.length;
const targetX = rowLayout.x + slotWidth * index + slotWidth / 2 - BUBBLE_WIDTH / 2;

// Spring animation
bubbleX.value = withSpring(targetX, {
  damping: 15,
  stiffness: 150,
  mass: 0.8,
});
```

### Tab Slots
```typescript
tabsRow: {
  flex: 1,
  flexDirection: 'row',
  width: '100%',
}

tabSlot: {
  flex: 1,              // Equal width (20% each)
  alignItems: 'center',
  justifyContent: 'center',
}

pressable: {
  flex: 1,              // Fill entire slot
  alignItems: 'center',
  justifyContent: 'center',
}
```

### Active Tab Icon
```typescript
// Scale animation
scale: 1.0 -> 1.1 (withSpring or withTiming for reduced motion)

// Breathing animation (active only)
breathScale: withRepeat(
  withSequence(
    withTiming(1.05, { duration: 1000, easing: Easing.inOut(Easing.ease) }),
    withTiming(1.0, { duration: 1000, easing: Easing.inOut(Easing.ease) })
  ),
  -1,  // Infinite
  false
)

// Combined transform (NO translateY elevation)
transform: [
  { scale: scale.value * breathScale.value },
]

// Glow shadow
shadowColor: colors.sageGreen,
shadowOffset: { width: 0, height: 4 },
shadowOpacity: 0.5,
shadowRadius: 12,
elevation: 8,

// Icon properties
size: 28px
color: colors.sageGreen (#A8B5A1)
```

### Inactive Tab Icon
```typescript
// Transform
scale: 1.0

// Icon properties (normal)
size: 24px
color: colors.textWhiteDisabled (rgba(255,255,255,0.3))

// Icon properties (dragged over during drag-to-select)
size: 26px
color: colors.sageGreen (#A8B5A1)
```

---

## 4. Tab Configuration

### Tabs (5 total, defined in `(tabs)/_layout.tsx`)

| Index | Route | Title | Icon |
|-------|-------|-------|------|
| 0 | `index` | Dashboard | Home |
| 1 | `transactions` | Transactions | CreditCard |
| 2 | `budget` | Budget | Target |
| 3 | `analytics` | Analytics | PieChart |
| 4 | `settings` | Settings | Settings |

Icons from `lucide-react-native`, all at `size={24}` base.

---

## 5. Interaction & States

### Tab Press Flow
```
1. User touches tab
   -> Pressable onPress fires
   -> navigation.navigate(route.name, route.params)
   -> state.index updates
   -> Sliding bubble springs to new position
   -> Old icon: scale -> 1.0, breathing stops
   -> New icon: scale -> 1.1, breathing starts
```

### Drag-to-Select Gesture
```
Pan Gesture (takes priority via Gesture.Race):

  .onStart(event):
    -> isDragging = true
    -> Calculate tab from X position
    -> Set draggedOverTabIndex
    -> Haptic: impactAsync(Light)

  .onUpdate(event):
    -> Recalculate tab from X position
    -> If tab changed:
      -> Update draggedOverTabIndex
      -> Haptic: impactAsync(Light)
      -> Dragged-over icon: size 26px, color sageGreen

  .onEnd():
    -> Get final draggedOverTabIndex
    -> isDragging = false, draggedOverTabIndex = -1
    -> If valid target:
      -> Haptic: impactAsync(Medium)
      -> Navigate to target tab

  .onFinalize():
    -> Reset isDragging and draggedOverTabIndex
```

### Swipe Gesture Navigation
```
Pan Gesture (useTabSwipeGesture hook):

  Thresholds:
    - Velocity: 500 points/second
    - Distance: 100px

  .onEnd(event):
    -> If velocity.x > 500 OR translationX > 100:
      -> Navigate to previous tab (swipe right)
    -> If velocity.x < -500 OR translationX < -100:
      -> Navigate to next tab (swipe left)

  Direction: Adjacent tabs only
```

### Gesture Priority
```
Gesture.Race(dragGesture, swipeGesture)
- Drag gesture: Slower, deliberate panning across tabs
- Swipe gesture: Quick flick to adjacent tab
- First gesture to activate wins
```

---

## 6. Animations Specification

### Sliding Bubble Movement
```typescript
// On tab change (useEffect)
const targetX = rowLayout.x + slotWidth * state.index
              + slotWidth / 2 - BUBBLE_WIDTH / 2;

bubbleX.value = withSpring(targetX, {
  damping: 15,     // Controls oscillation decay
  stiffness: 150,  // Controls spring force
  mass: 0.8,       // Lower = faster response
});
```

### Icon Scale (Active -> Inactive)
```typescript
// Activate
scale.value = reducedMotion
  ? withTiming(1.1, { duration: animConfig.timing.duration })
  : withSpring(1.1, animConfig.spring);

// Deactivate
scale.value = reducedMotion
  ? withTiming(1.0, { duration: animConfig.timing.duration })
  : withSpring(1.0, animConfig.spring);
```

### Breathing Pulse (Active Tab)
```typescript
// Start breathing when focused
breathScale.value = withRepeat(
  withSequence(
    withTiming(1.05, { duration: 1000, easing: Easing.inOut(Easing.ease) }),
    withTiming(1.0, { duration: 1000, easing: Easing.inOut(Easing.ease) })
  ),
  -1,     // Infinite repeat
  false   // Don't reverse
);

// Stop breathing when unfocused
breathScale.value = withTiming(1, { duration: 200 });
```

---

## 7. Accessibility

### VoiceOver Support
```typescript
<Pressable
  accessibilityRole="tab"
  accessibilityState={isFocused ? { selected: true } : {}}
  accessibilityLabel={`${tabName}, tab ${index + 1} of ${state.routes.length}`}
  accessibilityHint={`Double tap to navigate to ${tabName} screen`}
  testID={options.tabBarTestID}
>
```

### Reduced Motion Support
```typescript
import { useReducedMotion, getAnimationConfig } from './useReducedMotion';

const reducedMotion = useReducedMotion();
const animConfig = getAnimationConfig(reducedMotion);

// Reduced motion:
// - Spring -> withTiming (fast, no bounce)
// - Breathing animation disabled (breathScale stays at 1)
// - Faster transitions (~150ms)
```

### Color Contrast
```
Active Tab Icon (Sage on dark blur): ~4.8:1   WCAG AA
Inactive Tab Icon (White 30% on dark blur):    Decorative (non-text)
Sliding Bubble (Sage 25% on dark):             Decorative, N/A
```

### Touch Targets
- Each tab slot: `flex: 1` (minimum ~72px wide on iPhone Pro)
- Pressable fills entire slot height (60px)
- Meets 44x44pt iOS minimum

### Haptic Feedback
```typescript
// Drag start / tab hover during drag
Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

// Tab selection (drag end with valid target)
Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
```

---

## 8. Annotated Layout (Actual Implementation)

```
OUTER CONTAINER (position: absolute, bottom: 0, left: 16, right: 16)
|
+-- paddingBottom: insets.bottom (transparent safe area gap)
|
+-- BLUR CONTAINER (60px height x full width, borderRadius: 100)
    |
    +-- OVERLAY (absoluteFill, rgba(0,0,0,0.1))
    |
    +-- SLIDING BUBBLE (Animated.View, position: absolute)
    |   +-- Properties:
    |       - width: 70px, height: 48px
    |       - borderRadius: 35px (pill)
    |       - top: 50%, marginTop: -24px (vertically centered)
    |       - translateX: animated (spring to active tab center)
    |       - background: LinearGradient sage green
    |       - shadow: sageGreen, radius 16, opacity 0.3
    |
    +-- TABS ROW (flex: 1, flexDirection: row, width: 100%)
        |
        +-- TAB SLOT 1: Dashboard [flex: 1, center]
        |   +-- Pressable [flex: 1, center]
        |       +-- AnimatedTabIcon
        |           +-- Home icon (28px sage / 24px white-disabled)
        |
        +-- TAB SLOT 2: Transactions [flex: 1, center]
        |   +-- Pressable
        |       +-- AnimatedTabIcon
        |           +-- CreditCard icon
        |
        +-- TAB SLOT 3: Budget [flex: 1, center]
        |   +-- Pressable
        |       +-- AnimatedTabIcon
        |           +-- Target icon
        |
        +-- TAB SLOT 4: Analytics [flex: 1, center]
        |   +-- Pressable
        |       +-- AnimatedTabIcon
        |           +-- PieChart icon
        |
        +-- TAB SLOT 5: Settings [flex: 1, center]
            +-- Pressable
                +-- AnimatedTabIcon
                    +-- Settings icon
```

### Precise Measurements (iPhone 15 Pro, 393px wide)

| Property | Value |
|----------|-------|
| Container outer width | 361px (393 - 32) |
| Container height | 60px |
| Container border radius | 100px (pill) |
| Container margins | 16px horizontal |
| Tab slot width | ~72px (361 / 5) |
| Bubble dimensions | 70px x 48px |
| Bubble border radius | 35px |
| Icon size (inactive) | 24px |
| Icon size (active) | 28px |
| Icon size (drag hover) | 26px |
| Blur intensity | 50 |
| Safe area | Added as paddingBottom on outer container |

---

## 9. Responsive Behavior

### iPhone SE (375px width)
```
Container Width: 343px (375 - 32)
Tab Slot Width: ~68px each
Bubble Width: 70px (fixed)
```

### iPhone Pro (393px width)
```
Container Width: 361px
Tab Slot Width: ~72px each
Bubble Width: 70px (fixed)
```

### iPhone Pro Max (430px width)
```
Container Width: 398px
Tab Slot Width: ~79px each
Bubble Width: 70px (fixed)
```

---

## 10. Performance Considerations

- **60fps Animations**: All animations use `react-native-reanimated` (UI thread)
- **Memoization**: `MemoizedAnimatedTabIcon = memo(AnimatedTabIcon)` prevents re-renders
- **onLayout Measurement**: Tab row width measured once via `onLayout`, cached in state
- **Gesture Optimization**: `Gesture.Race` ensures only one gesture activates
- **useAnimatedReaction**: Bridges Reanimated shared values to React state for drag-over index
- **Worklets**: `calculateTabFromPosition` and gesture callbacks run on UI thread

---

## 11. Dependencies

```json
{
  "react-native-reanimated": "^3.x",
  "react-native-gesture-handler": "^2.x",
  "expo-haptics": "^14.x",
  "expo-blur": "^14.x",
  "expo-linear-gradient": "^14.x",
  "lucide-react-native": "^0.x",
  "react-native-safe-area-context": "^4.x"
}
```

---

## 12. Decisions & Trade-offs

### Architecture Decisions

| Decision | Rationale |
|----------|-----------|
| Bubble as sibling of tabsRow | Prevents flex layout bugs (6th child issue when inside tabsRow) |
| No tab elevation (translateY) | Icon was misaligned within bubble; simpler scale-only animation |
| onLayout for positioning | More accurate than calculating from screenWidth (avoids drift) |
| Plain View for tab slots | Animated.View with position:absolute was counted as flex child |
| Gesture.Race for combined gestures | Drag and swipe can't conflict; first to activate wins |
| No tab labels | Cleaner look, icons are sufficient with 5 tabs |

### Removed Features (vs. Original Spec)

| Feature | Reason Removed |
|---------|---------------|
| 3D elevation (translateY: -6) | Caused icon misalignment in bubble |
| Tab labels | Cluttered the compact 60px bar |
| Badge glow animations | Not yet implemented (Phase 2+) |
| Entrance animation (slide up) | Not yet implemented |
| MorphingBlob component | Replaced by inline sliding bubble for simpler architecture |
| useTabPositions hook | Replaced by onLayout measurement for accuracy |

### Future Enhancements (Deferred)

- [ ] Long-press menu on tabs (quick actions)
- [ ] Badge notifications with ambient glow
- [ ] Customizable tab order
- [ ] Entrance animation on app launch
- [ ] Dynamic tab hiding based on user preferences

---

**Document Version**: 2.0 (Post-Rewrite)
**Last Updated**: February 12, 2026
