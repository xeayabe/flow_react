// setupTests.ts
// This file runs before all tests to configure the testing environment

import '@testing-library/react-native/extend-expect';

// Mock React Native modules that cause issues in tests
jest.mock('react-native/Libraries/Animated/NativeAnimatedHelper');

// Mock expo modules
jest.mock('expo-constants', () => ({
  manifest: {},
  experienceUrl: 'https://example.com',
}));

jest.mock('expo-splash-screen', () => ({
  hideAsync: jest.fn(),
  preventAutoHideAsync: jest.fn(),
}));

// Mock InstantDB (we'll create proper mocks later)
jest.mock('@/lib/db', () => ({
  db: {
    useAuth: jest.fn(() => ({ user: null, isLoading: false })),
    useQuery: jest.fn(() => ({ data: [], isLoading: false, error: null })),
  },
  init: jest.fn(),
}));

// Suppress console warnings during tests (optional)
global.console = {
  ...console,
  // Uncomment to suppress console.log during tests
  // log: jest.fn(),
  // Uncomment to suppress console.warn during tests
  // warn: jest.fn(),
  error: jest.fn(), // Keep error suppression for cleaner test output
};

// Set test timeout (10 seconds)
jest.setTimeout(10000);