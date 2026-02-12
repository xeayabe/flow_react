/**
 * Custom render utilities for Flow component testing
 *
 * Wraps components with the necessary providers:
 * - QueryClientProvider (React Query)
 * - Navigation context (expo-router)
 *
 * Usage:
 *   import { renderWithProviders } from '@/test-utils/render-utils';
 *   const { getByText } = renderWithProviders(<MyComponent />);
 */

import React from 'react';
// NOTE: In the real project these would come from the actual packages.
// The types below are stubs so this file compiles in isolation.

// ---------------------------------------------------------------------------
// React Query provider wrapper
// ---------------------------------------------------------------------------

/**
 * Creates a fresh QueryClient configured for testing:
 * - No retries (fail fast)
 * - No refetch on window focus
 * - Instant stale time (always fresh in tests)
 */
export function createTestQueryClient() {
  // Using the mock from setupTests.ts which already mocks @tanstack/react-query
  const { QueryClient } = require('@tanstack/react-query');
  return new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
        refetchOnWindowFocus: false,
        staleTime: 0,
        cacheTime: 0,
      },
      mutations: {
        retry: false,
      },
    },
  });
}

/**
 * Wrap a component tree with QueryClientProvider and navigation context.
 *
 * @param ui - React element to render
 * @param options - Optional overrides
 * @returns The rendered output from @testing-library/react-native
 *
 * @example
 * ```tsx
 * import { renderWithProviders } from '@/test-utils/render-utils';
 * import { BudgetSummary } from '@/components/budget/BudgetSummary';
 *
 * it('renders budget summary', () => {
 *   const { getByText } = renderWithProviders(
 *     <BudgetSummary userId="user-1" householdId="hh-1" />
 *   );
 *   expect(getByText('Budget')).toBeTruthy();
 * });
 * ```
 */
export function renderWithProviders(
  ui: React.ReactElement,
  options?: {
    queryClient?: any;
    routerParams?: Record<string, string>;
  }
) {
  const { render } = require('@testing-library/react-native');
  const { QueryClientProvider } = require('@tanstack/react-query');
  const queryClient = options?.queryClient || createTestQueryClient();

  // If custom router params are needed, update the mock
  if (options?.routerParams) {
    const { useLocalSearchParams } = require('expo-router');
    (useLocalSearchParams as jest.Mock).mockReturnValue(options.routerParams);
  }

  function Wrapper({ children }: { children: React.ReactNode }) {
    return React.createElement(
      QueryClientProvider,
      { client: queryClient },
      children
    );
  }

  return {
    ...render(ui, { wrapper: Wrapper }),
    queryClient,
  };
}

/**
 * Helper to wait for async operations to settle in tests
 */
export async function waitForAsync(): Promise<void> {
  await new Promise((resolve) => setTimeout(resolve, 0));
}

/**
 * Helper to create a mock navigation object for testing
 */
export function createMockRouter() {
  return {
    push: jest.fn(),
    replace: jest.fn(),
    back: jest.fn(),
    canGoBack: jest.fn(() => true),
    setParams: jest.fn(),
    navigate: jest.fn(),
  };
}
