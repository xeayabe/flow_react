import { Stack } from 'expo-router';

export default function BudgetLayout() {
  return (
    <Stack>
      <Stack.Screen
        name="index"
        options={{
          headerShown: false,
        }}
      />
      <Stack.Screen
        name="setup"
        options={{
          headerShown: true,
          title: 'Edit Budget',
        }}
      />
    </Stack>
  );
}
