import { Stack } from 'expo-router';

export default function BudgetLayout() {
  return (
    <Stack>
      <Stack.Screen
        name="index"
        options={{
          title: 'Budget',
          headerStyle: { backgroundColor: '#FFFFFF' },
          headerTintColor: '#006A6A',
          headerTitleStyle: { fontSize: 18, fontWeight: '600' },
        }}
      />
      <Stack.Screen
        name="setup"
        options={{
          title: 'Set Up Your Budget',
          headerStyle: { backgroundColor: '#FFFFFF' },
          headerTintColor: '#006A6A',
          headerTitleStyle: { fontSize: 18, fontWeight: '600' },
        }}
      />
    </Stack>
  );
}
