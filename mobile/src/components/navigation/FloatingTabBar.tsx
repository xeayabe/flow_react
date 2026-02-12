/**
 * FloatingTabBar - Custom tab bar with glassmorphism effect
 *
 * Implements Steps 1-5 of the Floating Island Navigation redesign:
 * - Step 1: Floating container with margins and rounded corners ✅
 * - Step 2: BlurView glassmorphism background ✅
 * - Step 3: 3D active tab elevation with glow ✅
 * - Step 4: Morphing blob animation ✅
 * - Step 5: Swipe gestures ✅
 *
 * Future enhancements (Step 6):
 * - Step 6: Polish & optimize
 */

import React, { useEffect, useCallback, memo, useState } from 'react';
import { View, Pressable, StyleSheet, useWindowDimensions } from 'react-native';
import { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { BlurView } from 'expo-blur';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { GestureDetector, Gesture } from 'react-native-gesture-handler';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withRepeat,
  withSequence,
  withTiming,
  Easing,
  runOnJS,
  useAnimatedReaction,
} from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';

import { colors, borderRadius, spacing } from '@/lib/design-tokens';
import { MorphingBlob } from './MorphingBlob';
import { useTabPositions } from './useTabPositions';
import { useTabSwipeGesture } from './useTabSwipeGesture';
import { useReducedMotion, getAnimationConfig } from './useReducedMotion';

/**
 * AnimatedTabButton - Individual tab with 3D elevation and breathing animation
 *
 * STEP 3: Active tab features:
 * - Lifts 6px above surface (translateY: -6)
 * - Scales to 110% (scale: 1.1)
 * - 3D perspective transform
 * - Sage green glow shadow
 * - Breathing pulse animation (1.0 → 1.05 scale, 2s loop)
 * - Enlarged icon (24px → 28px)
 */
interface AnimatedTabButtonProps {
  isFocused: boolean;
  isDraggedOver: boolean; // NEW: Glass effect when dragging over
  onPress: () => void;
  onLongPress: () => void;
  accessibilityLabel?: string;
  testID?: string;
  icon?: (props: { focused: boolean; color: string; size: number }) => React.ReactNode;
  // STEP 6: Enhanced accessibility
  tabIndex: number;
  totalTabs: number;
  tabName: string;
}

function AnimatedTabButton({
  isFocused,
  isDraggedOver,
  onPress,
  onLongPress,
  accessibilityLabel,
  testID,
  icon,
  tabIndex,
  totalTabs,
  tabName,
}: AnimatedTabButtonProps) {
  // STEP 6: Detect reduced motion preference
  const reducedMotion = useReducedMotion();
  const animConfig = getAnimationConfig(reducedMotion);

  // STEP 3: Elevation animation (lift tab when active)
  const elevation = useSharedValue(0);
  const scale = useSharedValue(1);
  const breathScale = useSharedValue(1);

  // NEW: Glass effect for drag-over state
  const glassOpacity = useSharedValue(0);

  // NEW: Animate glass effect when dragging over tab
  useEffect(() => {
    if (isDraggedOver && !isFocused) {
      // Show glass effect when dragging over (but not if already focused)
      glassOpacity.value = withTiming(1, { duration: 150 });
    } else {
      // Hide glass effect
      glassOpacity.value = withTiming(0, { duration: 150 });
    }
  }, [isDraggedOver, isFocused]);

  // Animate elevation and scale when tab becomes active/inactive
  useEffect(() => {
    if (isFocused) {
      // STEP 6: Adjust animation based on reduced motion
      if (reducedMotion) {
        // Reduced motion: Simpler, faster animation
        elevation.value = withTiming(-6, { duration: animConfig.timing.duration });
        scale.value = withTiming(1.1, { duration: animConfig.timing.duration });
        breathScale.value = 1; // No breathing in reduced motion
      } else {
        // Full motion: Organic spring animation
        elevation.value = withSequence(
          withTiming(-8, { duration: 100 }), // Quick lift
          withSpring(-6, { damping: 12, stiffness: 300 }) // Settle at -6px
        );
        scale.value = withSpring(1.1, animConfig.spring);

        // Start breathing animation (infinite pulse) - only if not reduced motion
        breathScale.value = withRepeat(
          withSequence(
            withTiming(1.05, { duration: 1000, easing: Easing.inOut(Easing.ease) }),
            withTiming(1.0, { duration: 1000, easing: Easing.inOut(Easing.ease) })
          ),
          -1, // Infinite
          false // Don't reverse
        );
      }
    } else {
      // Deactivate: Spring back to normal (faster in reduced motion)
      const deactivateConfig = reducedMotion
        ? { duration: animConfig.timing.duration }
        : animConfig.spring;

      elevation.value = reducedMotion
        ? withTiming(0, deactivateConfig)
        : withSpring(0, { damping: 20, stiffness: 180 });
      scale.value = reducedMotion
        ? withTiming(1.0, deactivateConfig)
        : withSpring(1.0, animConfig.spring);
      breathScale.value = withTiming(1, { duration: 200 }); // Stop breathing
    }
  }, [isFocused, reducedMotion]);

  // STEP 3: Animated style with 3D transform and glow
  const animatedStyle = useAnimatedStyle(() => ({
    transform: [
      { perspective: 1000 }, // 3D depth
      { translateY: elevation.value }, // Lift up
      { scale: scale.value * breathScale.value }, // Scale + breathing pulse
    ],
    // STEP 3: Sage green glow shadow (only when active)
    shadowColor: isFocused ? colors.sageGreen : 'transparent',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: isFocused ? 0.5 : 0,
    shadowRadius: isFocused ? 12 : 0,
    elevation: isFocused ? 8 : 0, // Android shadow
  }));

  // NEW: Glass effect overlay (drag-over state)
  const glassStyle = useAnimatedStyle(() => ({
    opacity: glassOpacity.value,
  }));

  // STEP 6: Enhanced accessibility labels for VoiceOver
  const enhancedAccessibilityLabel = accessibilityLabel || `${tabName}, tab ${tabIndex + 1} of ${totalTabs}`;
  const accessibilityHint = `Double tap to navigate to ${tabName} screen`;

  return (
    <Animated.View style={[styles.tabButton, animatedStyle]}>
      {/* NEW: Glass effect overlay when dragging over */}
      <Animated.View style={[styles.glassOverlay, glassStyle]} pointerEvents="none" />

      <Pressable
        accessibilityRole="tab"
        accessibilityState={isFocused ? { selected: true } : {}}
        accessibilityLabel={enhancedAccessibilityLabel}
        accessibilityHint={accessibilityHint}
        testID={testID}
        onPress={onPress}
        onLongPress={onLongPress}
        style={styles.pressable}
      >
        <View style={{ marginTop: isFocused ? 4 : 0 }}> {/* Nudge active icon down */}
        {icon?.({
          focused: isFocused,
          color: isFocused ? colors.sageGreen : (isDraggedOver ? colors.sageGreen : colors.textWhiteDisabled),
          size: isFocused ? 28 : (isDraggedOver ? 26 : 24), // Slightly enlarge dragged-over icon
        })}
        </View>
      </Pressable>
    </Animated.View>
  );
}

// STEP 6: Memoize tab button to prevent unnecessary re-renders
const MemoizedAnimatedTabButton = memo(AnimatedTabButton);

export function FloatingTabBar({ state, descriptors, navigation }: BottomTabBarProps) {
  const insets = useSafeAreaInsets();
  const { width: screenWidth } = useWindowDimensions();

  // STEP 4: Calculate tab positions for morphing blob
  const tabPositions = useTabPositions(state.routes.length);

  // NEW: Track which tab is being dragged over
  const draggedOverTabIndex = useSharedValue<number>(-1);
  const isDragging = useSharedValue(false);

  // NEW: React state for drag-over (synced from shared value)
  const [draggedOverIndex, setDraggedOverIndex] = useState<number>(-1);

  // NEW: Sync shared value to React state for re-renders
  useAnimatedReaction(
    () => draggedOverTabIndex.value,
    (current, previous) => {
      if (current !== previous) {
        runOnJS(setDraggedOverIndex)(current);
      }
    }
  );

  // NEW: Calculate which tab is under the finger based on X position
  const calculateTabFromPosition = useCallback((x: number) => {
    'worklet';
    // Account for margins (16px on each side)
    const containerWidth = screenWidth - (spacing.md * 2);
    const tabWidth = containerWidth / state.routes.length;

    // Calculate tab index
    const tabIndex = Math.floor(x / tabWidth);

    // Clamp to valid range
    return Math.max(0, Math.min(state.routes.length - 1, tabIndex));
  }, [screenWidth, state.routes.length]);

  // NEW: Haptic feedback helper
  const triggerHaptic = useCallback((style: Haptics.ImpactFeedbackStyle) => {
    Haptics.impactAsync(style);
  }, []);

  // NEW: Navigation helper
  const navigateToTab = useCallback((index: number) => {
    if (index >= 0 && index < state.routes.length && index !== state.index) {
      const route = state.routes[index];
      navigation.navigate(route.name, route.params);
    }
  }, [state.routes, state.index, navigation]);

  // NEW: Drag-to-select gesture
  const dragGesture = Gesture.Pan()
    .onStart((event) => {
      'worklet';
      isDragging.value = true;
      const tabIndex = calculateTabFromPosition(event.x);
      draggedOverTabIndex.value = tabIndex;
      runOnJS(triggerHaptic)(Haptics.ImpactFeedbackStyle.Light);
    })
    .onUpdate((event) => {
      'worklet';
      const tabIndex = calculateTabFromPosition(event.x);

      // Only update if we moved to a different tab
      if (tabIndex !== draggedOverTabIndex.value) {
        draggedOverTabIndex.value = tabIndex;
        runOnJS(triggerHaptic)(Haptics.ImpactFeedbackStyle.Light);
      }
    })
    .onEnd(() => {
      'worklet';
      const targetIndex = draggedOverTabIndex.value;
      isDragging.value = false;
      draggedOverTabIndex.value = -1;

      // Navigate to the tab we ended on
      if (targetIndex >= 0) {
        runOnJS(triggerHaptic)(Haptics.ImpactFeedbackStyle.Medium);
        runOnJS(navigateToTab)(targetIndex);
      }
    })
    .onFinalize(() => {
      'worklet';
      isDragging.value = false;
      draggedOverTabIndex.value = -1;
    });

  // STEP 5: Swipe gesture callbacks
  const handleSwipeNext = useCallback(() => {
    const nextIndex = state.index + 1;
    if (nextIndex < state.routes.length) {
      const route = state.routes[nextIndex];
      navigation.navigate(route.name, route.params);
    }
  }, [state.index, state.routes, navigation]);

  const handleSwipePrevious = useCallback(() => {
    const prevIndex = state.index - 1;
    if (prevIndex >= 0) {
      const route = state.routes[prevIndex];
      navigation.navigate(route.name, route.params);
    }
  }, [state.index, state.routes, navigation]);

  // STEP 5: Create swipe gesture
  const swipeGesture = useTabSwipeGesture({
    currentIndex: state.index,
    totalTabs: state.routes.length,
    onSwipeNext: handleSwipeNext,
    onSwipePrevious: handleSwipePrevious,
  });

  // NEW: Combine drag and swipe gestures
  const combinedGesture = Gesture.Race(dragGesture, swipeGesture);

  return (
    <GestureDetector gesture={combinedGesture}>
      {/* ✅ Container now handles safe area with paddingBottom */}
      <View style={[styles.container, { paddingBottom: insets.bottom }]}>
        {/* ✅ BlurView stays at fixed 60px - no extending into safe area */}
        <BlurView
          intensity={50}
          tint="dark"
          style={styles.blurContainer}
        >
          {/* Overlay for extra depth */}
          <View style={styles.overlay} />

          {/* Tab buttons */}
          <View style={styles.tabsRow}>
            {/* Your existing tab rendering code */}
            <MorphingBlob
              tabPositions={tabPositions}
              activeTabIndex={state.index}
            />
          {state.routes.map((route, index) => {
            const { options } = descriptors[route.key];
            const isFocused = state.index === index;

            const onPress = () => {
              const event = navigation.emit({
                type: 'tabPress',
                target: route.key,
                canPreventDefault: true,
              });

              if (!isFocused && !event.defaultPrevented) {
                navigation.navigate(route.name, route.params);
              }
            };

            const onLongPress = () => {
              navigation.emit({
                type: 'tabLongPress',
                target: route.key,
              });
            };

            // STEP 6: Get tab name for accessibility
            const tabName =
              typeof options.title === 'string'
                ? options.title
                : typeof route.name === 'string'
                ? route.name
                : `Tab ${index + 1}`;

            return (
              <MemoizedAnimatedTabButton
                key={route.key}
                isFocused={isFocused}
                isDraggedOver={draggedOverIndex === index}
                onPress={onPress}
                onLongPress={onLongPress}
                accessibilityLabel={options.tabBarAccessibilityLabel}
                testID={options.tabBarTestID}
                icon={options.tabBarIcon}
                tabIndex={index}
                totalTabs={state.routes.length}
                tabName={tabName}
              />
            );
          })}
        </View>
      </BlurView>
    </View>
    </GestureDetector>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    bottom: 0, // ✅ Back to 0, not 80!
    left: 0,
    right: 0,
    marginHorizontal: spacing.md, // 16px side margins
    marginBottom: 0 // 12px lift from bottom
    // ✅ paddingBottom added inline with insets.bottom
  },
  blurContainer: {
    borderRadius: 100,
    height: 60, // ✅ Fixed height - no insets.bottom added here
    overflow: 'hidden',
    justifyContent: 'center',
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.1)',
  },
  tabsRow: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-evenly',
    paddingHorizontal: spacing.md,
  },
  tabButton: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pressable: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 4,
  },
  // NEW: Glass effect overlay for drag-over state
  glassOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(168, 181, 161, 0.3)', // Sage green tint
  },
});