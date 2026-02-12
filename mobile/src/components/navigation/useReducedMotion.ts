/**
 * useReducedMotion - Detect iOS "Reduce Motion" accessibility preference
 *
 * STEP 6: Accessibility support for users who prefer reduced motion
 *
 * When enabled, animations should be:
 * - Faster and snappier (less spring physics)
 * - Simpler (no breathing animation)
 * - Still functional (maintain visual feedback)
 *
 * @returns {boolean} true if user has reduced motion enabled
 */

import { useReducedMotion as useReanimatedReducedMotion } from 'react-native-reanimated';

export function useReducedMotion(): boolean {
  // Reanimated provides built-in reduced motion detection
  return useReanimatedReducedMotion();
}

/**
 * Get animation configuration based on reduced motion preference
 *
 * @param reducedMotion - Whether reduced motion is enabled
 * @returns Animation config with appropriate spring physics
 */
export function getAnimationConfig(reducedMotion: boolean) {
  if (reducedMotion) {
    // STEP 6: Snappy, minimal motion
    return {
      spring: {
        damping: 50, // High damping = less bounce
        stiffness: 300, // High stiffness = faster
      },
      timing: {
        duration: 150, // Quick transitions
      },
      disableBreathing: true, // No continuous animations
    };
  }

  // STEP 6: Default organic motion
  return {
    spring: {
      damping: 15, // Lower damping = more bounce
      stiffness: 120, // Lower stiffness = slower, more organic
    },
    timing: {
      duration: 400, // Natural timing
    },
    disableBreathing: false, // Allow breathing animation
  };
}
