// setupTests.ts

// Mock window.localStorage for @instantdb (MUST be before any imports)
const localStorageMock = {
  getItem: jest.fn(() => null),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn(),
  length: 0,
  key: jest.fn(() => null),
};
global.window = global.window || {};
global.window.localStorage = localStorageMock;

// Now import mocks
import mockSafeAreaContext from 'react-native-safe-area-context/jest/mock';

// Mock react-native-safe-area-context
jest.mock('react-native-safe-area-context', () => mockSafeAreaContext);

// Mock @react-native-async-storage/async-storage
jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock')
);

// Helper to create chainable schema field
const createSchemaField = () => ({
  optional: jest.fn(() => createSchemaField()),
  unique: jest.fn(() => createSchemaField()),
  indexed: jest.fn(() => createSchemaField()),
});

// Mock @instantdb/react-native with proper schema builder
jest.mock('@instantdb/react-native', () => ({
  init: jest.fn(() => ({
    useQuery: jest.fn(() => ({ data: null, isLoading: false, error: null })),
    transact: jest.fn(),
    auth: {
      signOut: jest.fn(),
      signInWithEmail: jest.fn(),
    },
  })),
  i: {
    schema: jest.fn((config) => config),
    entity: jest.fn((config) => config),
    string: jest.fn(() => createSchemaField()),
    number: jest.fn(() => createSchemaField()),
    boolean: jest.fn(() => createSchemaField()),
    date: jest.fn(() => createSchemaField()),
    json: jest.fn(() => createSchemaField()),
    any: jest.fn(() => createSchemaField()),
    graph: jest.fn(),
  },
}));

// Mock expo-router
jest.mock('expo-router', () => ({
  useRouter: jest.fn(() => ({
    push: jest.fn(),
    replace: jest.fn(),
    back: jest.fn(),
    canGoBack: jest.fn(() => true),
  })),
  useLocalSearchParams: jest.fn(() => ({})),
  Stack: jest.fn(({ children }) => children),
  Link: jest.fn(({ children }) => children),
  Redirect: jest.fn(() => null),
}));

// Mock react-native-get-random-values
jest.mock('react-native-get-random-values', () => ({
  getRandomValues: jest.fn(),
}));

// Mock lucide-react-native
jest.mock('lucide-react-native', () => ({
  Trash2: 'Trash2',
  Plus: 'Plus',
  ChevronDown: 'ChevronDown',
  Calendar: 'Calendar',
  X: 'X',
  Check: 'Check',
  Edit: 'Edit',
  Save: 'Save',
  // Add other icons as you encounter them in tests
}));

// Mock @tanstack/react-query
jest.mock('@tanstack/react-query', () => ({
  useQuery: jest.fn(() => ({
    data: null,
    isLoading: false,
    error: null,
    refetch: jest.fn(),
  })),
  useMutation: jest.fn(() => ({
    mutate: jest.fn(),
    mutateAsync: jest.fn(),
    isLoading: false,
    error: null,
  })),
  useQueryClient: jest.fn(() => ({
    invalidateQueries: jest.fn(),
    setQueryData: jest.fn(),
  })),
  QueryClient: jest.fn().mockImplementation(() => ({
    invalidateQueries: jest.fn(),
    setQueryData: jest.fn(),
  })),
  QueryClientProvider: jest.fn(({ children }) => children),
}));
