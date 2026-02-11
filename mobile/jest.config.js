// jest.config.js
module.exports = {
  // Use react-native preset instead of jest-expo to avoid web module issues
  preset: 'react-native',

  // Setup files
  setupFiles: ['<rootDir>/node_modules/react-native/jest/setup.js'],
  setupFilesAfterEnv: ['<rootDir>/setupTests.ts'],

  // Transform files with babel
  transform: {
    '^.+\\.(js|jsx|ts|tsx)$': 'babel-jest',
  },

  // Module name mapper for path aliases
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
  },

  // Transform these packages
  transformIgnorePatterns: [
    'node_modules/(?!((jest-)?react-native|@react-native(-community)?|expo(nent)?|@expo(nent)?/.*|@instantdb|react-native-reanimated|@react-navigation|lucide-react-native|@tanstack|zustand|react-native-safe-area-context|uuid|react-native-get-random-values)/)',
  ],

  // Files to collect coverage from
  collectCoverageFrom: [
    'src/**/*.{ts,tsx}',
    '!src/**/*.d.ts',
    '!src/**/*.stories.tsx',
    '!src/**/__tests__/**',
    '!src/app/**',
  ],

  // Test match patterns
  testMatch: [
    '**/__tests__/**/*.(test|spec).(ts|tsx|js|jsx)',
    '**/*.(test|spec).(ts|tsx|js|jsx)',
  ],

  // Module file extensions
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json', 'node'],

  // Test environment
  testEnvironment: 'node',

  // Clear mocks between tests
  clearMocks: true,

  // Verbose output
  verbose: true,
};
