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
    </Stack>
  );
}
