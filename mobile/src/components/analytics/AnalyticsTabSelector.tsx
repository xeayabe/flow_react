import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { colors, spacing, typography } from '@/constants/colors';

export type AnalyticsTab = 'now' | 'trends';

interface AnalyticsTabSelectorProps {
  selectedTab: AnalyticsTab;
  onTabChange: (tab: AnalyticsTab) => void;
}

export function AnalyticsTabSelector({ selectedTab, onTabChange }: AnalyticsTabSelectorProps) {
  return (
    <View style={styles.container}>
      <View style={styles.tabBar}>
        <Pressable
          style={[
            styles.tab,
            selectedTab === 'now' && styles.tabActive,
          ]}
          onPress={() => onTabChange('now')}
        >
          <Text style={[
            styles.tabText,
            selectedTab === 'now' && styles.tabTextActive,
          ]}>
            Now
          </Text>
        </Pressable>

        <Pressable
          style={[
            styles.tab,
            selectedTab === 'trends' && styles.tabActive,
          ]}
          onPress={() => onTabChange('trends')}
        >
          <Text style={[
            styles.tabText,
            selectedTab === 'trends' && styles.tabTextActive,
          ]}>
            Trends
          </Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingVertical: spacing.md, // 16px
    alignItems: 'center',
  },
  tabBar: {
    flexDirection: 'row',
    backgroundColor: colors.glassWhite, // 0.03 opacity
    borderRadius: 12,
    padding: 4,
    borderWidth: 1,
    borderColor: colors.glassBorder, // 0.05 opacity
  },
  tab: {
    paddingVertical: spacing.sm, // 8px
    paddingHorizontal: spacing.lg, // 24px
    borderRadius: 8,
    minWidth: 100,
    alignItems: 'center',
  },
  tabActive: {
    backgroundColor: colors.contextTeal, // Active background like bottom tabs
  },
  tabText: {
    ...typography.bodyBold, // 16px, weight 600
    color: colors.textWhiteSecondary, // 0.7 opacity
  },
  tabTextActive: {
    color: colors.textWhite, // Full white when active
  },
});
