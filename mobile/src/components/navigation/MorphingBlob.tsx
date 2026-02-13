/**
 * MorphingBlob - Animated background blob that flows between active tabs
 *
 * STEP 4: Morphing blob features:
 * - Pill-shaped gradient background (sage green)
 * - Smooth spring animation following active tab
 * - Glow effects (inner shadow + outer glow)
 * - Responsive to screen width
 */

import React, { useEffect } from 'react';
import { StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  useReducedMotion,
} from 'react-native-reanimated';

import { colors } from '@/lib/design-tokens';

interface MorphingBlobProps {
  /**
   * Array of tab center positions (x coordinates)
   * Calculated based on screen width and number of tabs
   */
  tabPositions: number[];

  /**
   * Index of currently active tab (0-4)
   */
  activeTabIndex: number;

  /**
   * Width of the blob (defaults to 72px as per spec)
   */
  blobWidth?: number;

  /**
   * Height of the blob (defaults to 44px for compact 56px active area)
   */
  blobHeight?: number;
}

export function MorphingBlob({
  tabPositions,
  activeTabIndex,
  blobWidth = 72,
  blobHeight = 48, // Proportional to 60px upper section
}: MorphingBlobProps) {
  // STEP 6: Detect reduced motion preference
  const reducedMotion = useReducedMotion();

  // STEP 4: Shared value for blob X position
  const blobX = useSharedValue(tabPositions[0] || 0);

  // Animate blob position when active tab changes
  useEffect(() => {
    const targetX = tabPositions[activeTabIndex] || 0;

    // STEP 6: Adjust animation based on reduced motion
    if (reducedMotion) {
      // Reduced motion: Simple, fast transition
      blobX.value = withTiming(targetX, {
        duration: 150, // Quick transition
      });
    } else {
      // Full motion: Organic spring physics
      blobX.value = withSpring(targetX, {
        mass: 1.2,
        damping: 15,
        stiffness: 120,
        overshootClamping: false, // Allow slight overshoot for natural feel
        restSpeedThreshold: 0.01,
        restDisplacementThreshold: 0.01,
      });
    }
  }, [activeTabIndex, tabPositions, reducedMotion]);

  // STEP 4: Animated style for blob position
  const animatedStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: blobX.value - blobWidth / 2 }, // Center blob on tab
    ],
  }));

  return (
    <Animated.View
      style={[
        styles.blobContainer,
        {
          width: blobWidth,
          height: blobHeight,
          borderRadius: blobWidth / 2, // Pill shape
        },
        animatedStyle,
      ]}
    >
      {/* STEP 4: Linear gradient sage green background */}
      <LinearGradient
        colors={[
          'rgba(168, 181, 161, 0.25)', // Sage green top (brighter)
          'rgba(168, 181, 161, 0.15)', // Sage green bottom (softer)
        ]}
        start={{ x: 0, y: 0 }}
        end={{ x: 0, y: 1 }}
        style={styles.gradient}
      >
        {/* STEP 4: Inner glow effect (lighter center) */}
        <Animated.View style={styles.innerGlow} />
      </LinearGradient>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  blobContainer: {
    position: 'absolute',
    left: 0, // Start from left edge of container
    // CLEAN CENTERING: No top offset, uses parent's justifyContent: 'center'
    // Container: 56px active area, Blob: 44px - automatically centered
    alignSelf: 'center',
    // STEP 4: Outer glow shadow
    shadowColor: colors.sageGreen,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 4, // Android shadow
  },
  gradient: {
    flex: 1,
    borderRadius: 56, // Match blob container (blobWidth / 2 = 72 / 2)
    overflow: 'hidden',
  },
  innerGlow: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(168, 181, 161, 0.1)', // Subtle inner highlight
    borderRadius: 36, // Match blob container
  },
});
