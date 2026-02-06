import { Stack } from 'expo-router';

export default function TransactionsLayout() {
  return (
    <Stack>
      <Stack.Screen
        name="index"
        options={{
          headerShown: false,
        }}
      />
      <Stack.Screen
        name="add"
        options={{
          headerShown: false,
        }}
      />
      <Stack.Screen
        name="trends"
        options={{
          headerShown: true,
          title: 'Trends',
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
        name="[id]"
        options={{
          headerShown: true,
        }}
      />
    </Stack>
  );
}
