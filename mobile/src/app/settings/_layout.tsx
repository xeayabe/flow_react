import { Stack } from 'expo-router';

export default function SettingsLayout() {
  return (
    <Stack>
      <Stack.Screen
        name="profile"
        options={{
          headerShown: false,
          title: 'Profile',
        }}
      />
      <Stack.Screen
        name="invite"
        options={{
          headerShown: false,
          title: 'Invite Partner',
        }}
      />
      <Stack.Screen
        name="household-members"
        options={{
          headerShown: false,
          title: 'Household Members',
        }}
      />
      <Stack.Screen
        name="categories"
        options={{
          headerShown: false,
          title: 'Categories',
        }}
      />
      <Stack.Screen
        name="category-groups"
        options={{
          headerShown: false,
          title: 'Category Groups',
        }}
      />
      <Stack.Screen
        name="currency"
        options={{
          headerShown: false,
          title: 'Currency',
        }}
      />
      <Stack.Screen
        name="payday"
        options={{
          headerShown: false,
          title: 'Budget Period',
        }}
      />
      <Stack.Screen
        name="split-settings"
        options={{
          headerShown: false,
          title: 'Split Settings',
        }}
      />
      <Stack.Screen
        name="export"
        options={{
          headerShown: false,
          title: 'Export Data',
        }}
      />
    </Stack>
  );
}
