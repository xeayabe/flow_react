import React from 'react';
import { Home, User, CreditCard } from 'lucide-react-native';
import { Tabs } from 'expo-router';

import { useColorScheme } from '@/lib/useColorScheme';
import { useClientOnlyValue } from '@/lib/useClientOnlyValue';

function TabBarIcon({ Icon, color }: { Icon: typeof Home; color: string }) {
  return <Icon size={24} color={color} />;
}

export default function TabLayout() {
  const colorScheme = useColorScheme();

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: colorScheme === 'dark' ? 'white' : '#006A6A',
        tabBarInactiveTintColor: colorScheme === 'dark' ? '#6B7280' : '#D1D5DB',
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
        name="two"
        options={{
          title: 'Profile',
          tabBarIcon: ({ color }: { color: string }) => <TabBarIcon Icon={User} color={color} />,
        }}
      />
    </Tabs>
  );
}
