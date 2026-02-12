/**
 * useTabSwipeGesture - Pan gesture handler for swipe-to-switch-tabs
 *
 * STEP 5: Swipe gesture features:
 * - Horizontal swipe left/right to switch adjacent tabs
 * - Velocity threshold: 500 points/second
 * - Distance threshold: 100px
 * - Haptic feedback on gesture events
 * - Edge case handling (first/last tab)
 */

import { useMemo } from 'react';
import { Gesture } from 'react-native-gesture-handler';
import * as Haptics from 'expo-haptics';

interface UseTabSwipeGestureParams {
  /**
   * Current active tab index
   */
  currentIndex: number;

  /**
   * Total number of tabs
   */
  totalTabs: number;

  /**
   * Callback when user swipes to next tab
   */
  onSwipeNext: () => void;

  /**
   * Callback when user swipes to previous tab
   */
  onSwipePrevious: () => void;
}

// STEP 5: Gesture thresholds from spec
const SWIPE_VELOCITY_THRESHOLD = 500; // points per second
const SWIPE_DISTANCE_THRESHOLD = 100; // pixels

export function useTabSwipeGesture({
  currentIndex,
  totalTabs,
  onSwipeNext,
  onSwipePrevious,
}: UseTabSwipeGestureParams) {
  const panGesture = useMemo(
    () =>
      Gesture.Pan()
        .onStart(() => {
          // STEP 5: Light haptic feedback on gesture start
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        })
        .onUpdate((event) => {
          // Could add visual feedback here (e.g., subtle arrow hint)
          // For now, just track the gesture
        })
        .onEnd((event) => {
          const { translationX, velocityX } = event;

          // STEP 5: Determine swipe direction and strength
          const isSwipingLeft = translationX < 0 || velocityX < 0;
          const isSwipingRight = translationX > 0 || velocityX > 0;

          const hasEnoughVelocity = Math.abs(velocityX) > SWIPE_VELOCITY_THRESHOLD;
          const hasEnoughDistance = Math.abs(translationX) > SWIPE_DISTANCE_THRESHOLD;

          // STEP 5: Check if swipe meets threshold
          const shouldTriggerSwipe = hasEnoughVelocity || hasEnoughDistance;

          if (!shouldTriggerSwipe) {
            // STEP 5: Not enough movement - snap back with light haptic
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            return;
          }

          // STEP 5: Swipe left = next tab (if not at end)
          if (isSwipingLeft && currentIndex < totalTabs - 1) {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
            onSwipeNext();
            return;
          }

          // STEP 5: Swipe right = previous tab (if not at start)
          if (isSwipingRight && currentIndex > 0) {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
            onSwipePrevious();
            return;
          }

          // STEP 5: Edge case - trying to swipe beyond first/last tab
          // Snap back with light haptic (already at boundary)
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        })
        // STEP 5: Only respond to horizontal swipes (ignore vertical)
        .activeOffsetX([-10, 10]) // Must move 10px horizontally to activate
        .failOffsetY([-20, 20]), // Fail if moves 20px vertically (let screen scroll)
    [currentIndex, totalTabs, onSwipeNext, onSwipePrevious]
  );

  return panGesture;
}
