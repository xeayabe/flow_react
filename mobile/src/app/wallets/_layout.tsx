import { Stack } from 'expo-router';

export default function WalletsLayout() {
  return (
    <Stack>
      <Stack.Screen
        name="index"
        options={{
          headerShown: false,
          presentation: 'modal',
        }}
      />
      <Stack.Screen
        name="add"
        options={{
          headerShown: false,
          presentation: 'modal',
        }}
      />
      <Stack.Screen
        name="edit"
        options={{
          headerShown: false,
          presentation: 'modal',
        }}
      />
      <Stack.Screen
        name="[id]/index"
        options={{
          headerShown: false,
          presentation: 'card',
        }}
      />
    </Stack>
  );
}

