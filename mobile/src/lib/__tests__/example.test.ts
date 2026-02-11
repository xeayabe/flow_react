// src/lib/__tests__/example.test.ts
/**
 * Example Test File
 * 
 * This file demonstrates how to write tests in the Flow app.
 * Once you verify Jest is working, you can delete this file.
 */

describe('Example Test Suite', () => {
  // Simple test to verify Jest is configured correctly
  it('should pass a basic test', () => {
    expect(true).toBe(true);
  });

  // Test basic math (verifies test runner works)
  it('should perform basic arithmetic', () => {
    expect(2 + 2).toBe(4);
    expect(10 - 5).toBe(5);
    expect(3 * 4).toBe(12);
  });

  // Test string operations
  it('should handle strings correctly', () => {
    const greeting = 'Hello World';
    expect(greeting).toContain('Hello');
    expect(greeting.length).toBe(11);
  });

  // Test arrays
  it('should work with arrays', () => {
    const numbers = [1, 2, 3, 4, 5];
    expect(numbers).toHaveLength(5);
    expect(numbers).toContain(3);
    expect(numbers[0]).toBe(1);
  });

  // Test objects
  it('should work with objects', () => {
    const user = {
      name: 'Test User',
      age: 30,
    };
    expect(user.name).toBe('Test User');
    expect(user.age).toBeGreaterThan(18);
  });

  // Test async functions
  it('should handle async operations', async () => {
    const mockAsyncFunction = async () => {
      return 'success';
    };
    
    const result = await mockAsyncFunction();
    expect(result).toBe('success');
  });

  // Test error handling
  it('should catch errors', () => {
    const throwError = () => {
      throw new Error('Test error');
    };
    
    expect(throwError).toThrow('Test error');
  });
});

/**
 * Example: Testing a Utility Function
 * 
 * This shows how you would test a real utility function from your app
 */
describe('Utility Function Example', () => {
  // Example of testing a format function
  it('should format currency correctly', () => {
    const formatCurrency = (amount: number): string => {
      return `CHF ${amount.toFixed(2)}`;
    };

    expect(formatCurrency(100)).toBe('CHF 100.00');
    expect(formatCurrency(99.5)).toBe('CHF 99.50');
    expect(formatCurrency(0)).toBe('CHF 0.00');
  });

  // Example of testing a validation function
  it('should validate email addresses', () => {
    const isValidEmail = (email: string): boolean => {
  // Check: has @ AND has . AND something before @
  const atIndex = email.indexOf('@');
  return atIndex > 0 && email.includes('.') && atIndex < email.length - 1;
};

    expect(isValidEmail('test@example.com')).toBe(true);
    expect(isValidEmail('invalid-email')).toBe(false);
    expect(isValidEmail('@example.com')).toBe(false);
  });
});