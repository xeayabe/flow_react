import { Stack } from 'expo-router';

export default function SettingsLayout() {
  return (
    <Stack>
      <Stack.Screen
        name="categories"
        options={{
          headerShown: true,
          title: 'Categories',
        }}
      />
      <Stack.Screen
        name="payday"
        options={{
          headerShown: true,
          title: 'Budget Period',
        }}
      />
      <Stack.Screen
        name="import"
        options={{
          headerShown: true,
          title: 'Import Data',
          headerStyle: {
            backgroundColor: '#FFFFFF',
          },
          headerTintColor: '#006A6A',
          headerTitleStyle: {
            fontWeight: '600',
            color: '#111827',
          },
        }}
      />
      <Stack.Screen
        name="export"
        options={{
          headerShown: true,
          title: 'Export Data',
          headerStyle: {
            backgroundColor: '#FFFFFF',
          },
          headerTintColor: '#006A6A',
          headerTitleStyle: {
            fontWeight: '600',
            color: '#111827',
          },
        }}
      />
    </Stack>
  );
}
