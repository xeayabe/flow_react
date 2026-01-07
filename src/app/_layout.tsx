import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { Stack, useRouter, useSegments, useRootNavigationState } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useColorScheme } from '@/lib/useColorScheme';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { KeyboardProvider } from 'react-native-keyboard-controller';
import { db } from '@/lib/db';
import { useEffect } from 'react';

export const unstable_settings = {
  // Ensure that reloading on `/modal` keeps a back button present.
  initialRouteName: 'welcome',
};

// Prevent the splash screen from auto-hiding before asset loading is complete.
SplashScreen.preventAutoHideAsync();

const queryClient = new QueryClient();

function RootLayoutNav({ colorScheme }: { colorScheme: 'light' | 'dark' | null | undefined }) {
  const { user, isLoading } = db.useAuth();
  const segments = useSegments();
  const router = useRouter();
  const navigationState = useRootNavigationState();

  useEffect(() => {
    // Wait for both auth loading AND navigation to be ready
    if (isLoading) return;
    if (!navigationState?.key) return;

    const inAuthGroup = segments[0] === '(tabs)';
    const inAccountsFlow = segments[0] === 'accounts';
    const inSettingsFlow = segments[0] === 'settings';
    const inTransactionsFlow = segments[0] === 'transactions';
    const inBudgetFlow = segments[0] === 'budget';
    const inAnalyticsFlow = segments[0] === 'analytics';
    const inLoginFlow = segments[0] === 'welcome' || segments[0] === 'signup' || segments[0] === 'login';

    if (!user && (inAuthGroup || inAccountsFlow || inSettingsFlow || inTransactionsFlow || inBudgetFlow || inAnalyticsFlow)) {
      // Redirect to welcome if not authenticated
      router.replace('/welcome');
    } else if (user && !inAuthGroup && !inAccountsFlow && !inSettingsFlow && !inTransactionsFlow && !inBudgetFlow && !inAnalyticsFlow && segments[0] !== 'modal') {
      // Redirect to dashboard if authenticated
      router.replace('/(tabs)');
    }

    // Hide splash screen once auth is determined
    SplashScreen.hideAsync();
  }, [user, isLoading, segments, navigationState?.key]);

  return (
    <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
      <Stack>
        <Stack.Screen name="welcome" options={{ headerShown: false }} />
        <Stack.Screen name="signup" options={{ headerShown: false }} />
        <Stack.Screen name="login" options={{ headerShown: false }} />
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="accounts" options={{ headerShown: false, presentation: 'card' }} />
        <Stack.Screen name="budget" options={{ headerShown: false }} />
        <Stack.Screen name="analytics" options={{ headerShown: false }} />
        <Stack.Screen name="settings" options={{ headerShown: false, presentation: 'card' }} />
        <Stack.Screen name="transactions" options={{ headerShown: false, presentation: 'card' }} />
        <Stack.Screen name="modal" options={{ presentation: 'modal' }} />
      </Stack>
    </ThemeProvider>
  );
}



export default function RootLayout() {
  const colorScheme = useColorScheme();

  return (
    <QueryClientProvider client={queryClient}>
      <GestureHandlerRootView style={{ flex: 1 }}>
        <KeyboardProvider>
          <StatusBar style={colorScheme === 'dark' ? 'light' : 'dark'} />
          <RootLayoutNav colorScheme={colorScheme} />
        </KeyboardProvider>
      </GestureHandlerRootView>
    </QueryClientProvider>
  );
}