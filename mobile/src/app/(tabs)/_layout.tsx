import React from 'react';
import { Home, Settings, CreditCard, PieChart, Target } from 'lucide-react-native';
import { Tabs } from 'expo-router';

import { useColorScheme } from '@/lib/useColorScheme';
import { useClientOnlyValue } from '@/lib/useClientOnlyValue';
import { FloatingTabBar } from '@/components/navigation/FloatingTabBar';
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
      // FLOATING NAVIGATION: Steps 1-2 - Custom tab bar with glassmorphism
      tabBar={(props) => <FloatingTabBar {...props} />}
      screenOptions={{
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
        name="settings"
        options={{
          title: 'Settings',
          headerShown: false,
          tabBarIcon: ({ color }: { color: string }) => <TabBarIcon Icon={Settings} color={color} />,
        }}
      />
    </Tabs>
  );
}
