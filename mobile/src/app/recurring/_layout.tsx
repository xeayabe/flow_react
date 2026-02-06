import { Stack } from 'expo-router';

export default function RecurringLayout() {
  return (
    <Stack>
      <Stack.Screen
        name="edit/[id]"
        options={{
          presentation: 'card',
          headerShown: true,
          headerTitle: 'Edit Recurring Expense',
        }}
      />
    </Stack>
  );
}
