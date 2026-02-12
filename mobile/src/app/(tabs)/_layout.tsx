import React from 'react';
import { Home, User, CreditCard, PieChart, Target } from 'lucide-react-native';
import { Tabs } from 'expo-router';

import { useColorScheme } from '@/lib/useColorScheme';
import { useClientOnlyValue } from '@/lib/useClientOnlyValue';
// FIX: BUG-003 - Import design tokens instead of hardcoding colors
import { colors } from '@/lib/design-tokens';

function TabBarIcon({ Icon, color }: { Icon: typeof Home; color: string }) {
  // FIX: UX-009 - Ensure tab bar icons meet 44x44pt minimum touch target
  return <Icon size={24} color={color} />;
}

export default function TabLayout() {
  const colorScheme = useColorScheme();

  return (
    <Tabs
      screenOptions={{
        // FIX: BUG-003 - Replace hardcoded '#006A6A' with design token
        tabBarActiveTintColor: colors.contextTeal,
        // FIX: BUG-003 - Replace hardcoded '#9CA3AF' with design token
        tabBarInactiveTintColor: colors.textWhiteDisabled,
        tabBarStyle: {
          // FIX: BUG-003 - Replace hardcoded '#FFFFFF' with design token for dark theme
          backgroundColor: colors.contextDark,
          // FIX: BUG-003 - Replace hardcoded '#E5E7EB' with design token
          borderTopColor: colors.borderTeal,
        },
        // FIX: UX-009 - Ensure tab bar items meet minimum 44pt touch target
        tabBarItemStyle: {
          minHeight: 44,
        },
        headerShown: useClientOnlyValue(false, true),
      }}>
      <Tabs.Screen
        name="index"
        options={{
          title: 'Dashboard',
          headerShown: false,
          tabBarIcon: ({ color }: { color: string }) => <TabBarIcon Icon={Home} color={color} />,
        }}
      />
      <Tabs.Screen
        name="transactions"
        options={{
          title: 'Transactions',
          headerShown: false,
          tabBarIcon: ({ color }: { color: string }) => <TabBarIcon Icon={CreditCard} color={color} />,
        }}
      />
      <Tabs.Screen
        name="budget"
        options={{
          title: 'Budget',
          headerShown: false,
          tabBarIcon: ({ color }: { color: string }) => <TabBarIcon Icon={Target} color={color} />,
        }}
      />
      <Tabs.Screen
        name="analytics"
        options={{
          title: 'Analytics',
          headerShown: false,
          tabBarIcon: ({ color }: { color: string }) => <TabBarIcon Icon={PieChart} color={color} />,
        }}
      />
      <Tabs.Screen
        name="two"
        options={{
          title: 'Profile',
          tabBarIcon: ({ color }: { color: string }) => <TabBarIcon Icon={User} color={color} />,
        }}
      />
    </Tabs>
  );
}
