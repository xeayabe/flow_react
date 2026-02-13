/**
 * FloatingTabBar - Custom tab bar with glassmorphism effect
 *
 * Layout rule: The tab row contains EXACTLY 5 plain View children.
 * Nothing else. The active bubble is rendered INSIDE the active tab's
 * View with position: absolute so it doesn't affect flex layout.
 */

import React, { useEffect, useCallback, memo, useState } from 'react';
import { View, Pressable, StyleSheet, useWindowDimensions } from 'react-native';
import { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { BlurView } from 'expo-blur';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { GestureDetector, Gesture } from 'react-native-gesture-handler';
import { LinearGradient } from 'expo-linear-gradient';
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

import { colors, spacing } from '@/lib/design-tokens';
import { useTabSwipeGesture } from './useTabSwipeGesture';
import { useReducedMotion, getAnimationConfig } from './useReducedMotion';

// ─── Sliding Bubble ─────────────────────────────────────────────────
// Fixed-size bubble that slides between tabs with spring physics.
// Rendered as a sibling of tabsRow (not inside it) to avoid flex issues.
const BUBBLE_WIDTH = 70;
const BUBBLE_HEIGHT = 48;

// ─── Animated Icon ──────────────────────────────────────────────────
// Handles lift, scale, breathing, and glow. Does NOT own flex layout.

interface AnimatedTabIconProps {
  isFocused: boolean;
  isDraggedOver: boolean;
  icon?: (props: { focused: boolean; color: string; size: number }) => React.ReactNode;
}

function AnimatedTabIcon({ isFocused, isDraggedOver, icon }: AnimatedTabIconProps) {
  const reducedMotion = useReducedMotion();
  const animConfig = getAnimationConfig(reducedMotion);

  const scale = useSharedValue(1);
  const breathScale = useSharedValue(1);

  useEffect(() => {
    if (isFocused) {
      if (reducedMotion) {
        scale.value = withTiming(1.1, { duration: animConfig.timing.duration });
        breathScale.value = 1;
      } else {
        scale.value = withSpring(1.1, animConfig.spring);
        breathScale.value = withRepeat(
          withSequence(
            withTiming(1.05, { duration: 1000, easing: Easing.inOut(Easing.ease) }),
            withTiming(1.0, { duration: 1000, easing: Easing.inOut(Easing.ease) })
          ),
          -1,
          false
        );
      }
    } else {
      scale.value = reducedMotion
        ? withTiming(1.0, { duration: animConfig.timing.duration })
        : withSpring(1.0, animConfig.spring);
      breathScale.value = withTiming(1, { duration: 200 });
    }
  }, [isFocused, reducedMotion]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [
      { scale: scale.value * breathScale.value },
    ],
    shadowColor: isFocused ? colors.sageGreen : 'transparent',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: isFocused ? 0.5 : 0,
    shadowRadius: isFocused ? 12 : 0,
    elevation: isFocused ? 8 : 0,
  }));

  return (
    <Animated.View style={animatedStyle}>
      {icon?.({
        focused: isFocused,
        color: isFocused ? colors.sageGreen : (isDraggedOver ? colors.sageGreen : colors.textWhiteDisabled),
        size: isFocused ? 28 : (isDraggedOver ? 26 : 24),
      })}
    </Animated.View>
  );
}

const MemoizedAnimatedTabIcon = memo(AnimatedTabIcon);

// ─── FloatingTabBar ─────────────────────────────────────────────────

export function FloatingTabBar({ state, descriptors, navigation }: BottomTabBarProps) {
  const insets = useSafeAreaInsets();
  const { width: screenWidth } = useWindowDimensions();

  // Drag-to-select state
  const draggedOverTabIndex = useSharedValue<number>(-1);
  const isDragging = useSharedValue(false);
  const [draggedOverIndex, setDraggedOverIndex] = useState<number>(-1);

  useAnimatedReaction(
    () => draggedOverTabIndex.value,
    (current, previous) => {
      if (current !== previous) {
        runOnJS(setDraggedOverIndex)(current);
      }
    }
  );

  const calculateTabFromPosition = useCallback((x: number) => {
    'worklet';
    const containerWidth = screenWidth - (spacing.md * 2);
    const tabWidth = containerWidth / state.routes.length;
    const tabIndex = Math.floor(x / tabWidth);
    return Math.max(0, Math.min(state.routes.length - 1, tabIndex));
  }, [screenWidth, state.routes.length]);

  const triggerHaptic = useCallback((style: Haptics.ImpactFeedbackStyle) => {
    Haptics.impactAsync(style);
  }, []);

  const navigateToTab = useCallback((index: number) => {
    if (index >= 0 && index < state.routes.length && index !== state.index) {
      const route = state.routes[index];
      navigation.navigate(route.name, route.params);
    }
  }, [state.routes, state.index, navigation]);

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

  const swipeGesture = useTabSwipeGesture({
    currentIndex: state.index,
    totalTabs: state.routes.length,
    onSwipeNext: handleSwipeNext,
    onSwipePrevious: handleSwipePrevious,
  });

  const combinedGesture = Gesture.Race(dragGesture, swipeGesture);

  // ─── Sliding bubble animation ───────────────────────────────────
  // Use onLayout to measure the actual tab row position and width,
  // so the bubble aligns perfectly regardless of borders/padding.
  const [rowLayout, setRowLayout] = useState({ x: 0, width: screenWidth - spacing.md * 2 });

  const handleRowLayout = useCallback((e: any) => {
    const { x, width } = e.nativeEvent.layout;
    setRowLayout({ x, width });
  }, []);

  const slotWidth = rowLayout.width / state.routes.length;

  const bubbleX = useSharedValue(
    rowLayout.x + slotWidth * state.index + slotWidth / 2 - BUBBLE_WIDTH / 2
  );

  useEffect(() => {
    const targetX = rowLayout.x + slotWidth * state.index + slotWidth / 2 - BUBBLE_WIDTH / 2;
    bubbleX.value = withSpring(targetX, {
      damping: 15,
      stiffness: 150,
      mass: 0.8,
    });
  }, [state.index, slotWidth, rowLayout.x]);

  const bubbleStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: bubbleX.value }],
  }));

  return (
    <GestureDetector gesture={combinedGesture}>
      <View style={[styles.container, { paddingBottom: insets.bottom }]}>
        <BlurView intensity={50} tint="dark" style={styles.blurContainer}>
          <View style={styles.overlay} />

          {/* Sliding bubble: absolutely positioned, behind the tab row */}
          <Animated.View style={[styles.slidingBubble, bubbleStyle]}>
            <LinearGradient
              colors={[
                'rgba(168, 181, 161, 0.25)',
                'rgba(168, 181, 161, 0.15)',
              ]}
              start={{ x: 0, y: 0 }}
              end={{ x: 0, y: 1 }}
              style={styles.bubbleGradient}
            />
          </Animated.View>

          {/*
            TAB ROW: flexDirection: 'row', width: '100%'
            Children: EXACTLY state.routes.length plain Views.
            NOTHING ELSE.
          */}
          <View style={styles.tabsRow} onLayout={handleRowLayout}>
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

              const tabName =
                typeof options.title === 'string'
                  ? options.title
                  : typeof route.name === 'string'
                  ? route.name
                  : `Tab ${index + 1}`;

              return (
                <View key={route.key} style={styles.tabSlot}>
                  <Pressable
                    accessibilityRole="tab"
                    accessibilityState={isFocused ? { selected: true } : {}}
                    accessibilityLabel={`${tabName}, tab ${index + 1} of ${state.routes.length}`}
                    accessibilityHint={`Double tap to navigate to ${tabName} screen`}
                    testID={options.tabBarTestID}
                    onPress={onPress}
                    onLongPress={onLongPress}
                    style={styles.pressable}
                  >
                    <MemoizedAnimatedTabIcon
                      isFocused={isFocused}
                      isDraggedOver={draggedOverIndex === index}
                      icon={options.tabBarIcon}
                    />
                  </Pressable>
                </View>
              );
            })}
          </View>
        </BlurView>
      </View>
    </GestureDetector>
  );
}

// ─── Styles ─────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    bottom: 0,
    left: spacing.md,
    right: spacing.md,
  },
  blurContainer: {
    borderRadius: 100,
    height: 60,
    overflow: 'hidden',
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.1)',
  },
  // RULE: flexDirection row, width 100%, no extra children
  tabsRow: {
    flex: 1,
    flexDirection: 'row',
    width: '100%',
  },
  tabSlot: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  // Sliding bubble: position absolute in blurContainer, slides via translateX
  slidingBubble: {
    position: 'absolute',
    width: BUBBLE_WIDTH,
    height: BUBBLE_HEIGHT,
    borderRadius: BUBBLE_WIDTH / 2,
    overflow: 'hidden',
    left: 0,
    top: '50%',
    marginTop: -BUBBLE_HEIGHT / 2,
    shadowColor: colors.sageGreen,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 4,
  },
  bubbleGradient: {
    flex: 1,
    borderRadius: BUBBLE_WIDTH / 2,
  },
  pressable: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
