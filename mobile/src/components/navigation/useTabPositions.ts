/**
 * useTabPositions - Calculate center X positions for each tab
 *
 * Calculates the center X coordinate of each tab based on:
 * - Screen width
 * - Number of tabs (5)
 * - Container margins (16px each side)
 *
 * Used by MorphingBlob to know where to animate to.
 */

import { useMemo } from 'react';
import { useWindowDimensions } from 'react-native';
import { spacing } from '@/lib/design-tokens';

export function useTabPositions(numberOfTabs: number = 5): number[] {
  const { width: screenWidth } = useWindowDimensions();

  return useMemo(() => {
    // Container width = screen width - horizontal margins (16px each side = 32px total)
    const containerWidth = screenWidth - spacing.md * 2;

    // IMPORTANT: Account for tabsRow horizontal padding (16px each side)
    // The tabs are inset by this padding, so we need to adjust positions
    const tabsRowPadding = 0;
    const availableWidth = containerWidth;

    // Tab width = available width divided equally among tabs
    const tabWidth = availableWidth / numberOfTabs;

    // Calculate center X position for each tab
    const positions: number[] = [];
    for (let i = 0; i < numberOfTabs; i++) {
      // Center of each tab = padding + (tab width * index) + (half tab width)
      const centerX = tabsRowPadding + tabWidth * i + tabWidth / 2;
      positions.push(centerX);
    }

    return positions;
  }, [screenWidth, numberOfTabs]);
}
