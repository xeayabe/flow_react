// FIX: CODE-4 - Typed error system replacing generic catch blocks

/**
 * Base application error with error code and optional context.
 * All application-specific errors extend this class.
 */
export class AppError extends Error {
  constructor(
    message: string,
    public code: string,
    public context?: Record<string, unknown>
  ) {
    super(message);
    this.name = 'AppError';
    // Restore prototype chain (needed for instanceof checks with TypeScript)
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

/**
 * Network-related errors (connectivity, timeouts, server errors).
 */
export class NetworkError extends AppError {
  constructor(message: string, context?: Record<string, unknown>) {
    super(message, 'NETWORK_ERROR', context);
    this.name = 'NetworkError';
  }
}

/**
 * Validation errors for user input or data integrity checks.
 */
export class ValidationError extends AppError {
  public fieldErrors: Record<string, string>;

  constructor(
    message: string,
    fieldErrors: Record<string, string> = {},
    context?: Record<string, unknown>
  ) {
    super(message, 'VALIDATION_ERROR', context);
    this.name = 'ValidationError';
    this.fieldErrors = fieldErrors;
  }
}

/**
 * Authentication and authorization errors.
 */
export class AuthError extends AppError {
  constructor(message: string, context?: Record<string, unknown>) {
    super(message, 'AUTH_ERROR', context);
    this.name = 'AuthError';
  }
}

/**
 * Data integrity errors (missing records, stale data, constraint violations).
 */
export class DataIntegrityError extends AppError {
  constructor(message: string, context?: Record<string, unknown>) {
    super(message, 'DATA_INTEGRITY_ERROR', context);
    this.name = 'DataIntegrityError';
  }
}

/**
 * Budget calculation errors (period mismatches, invalid allocations).
 */
export class BudgetError extends AppError {
  constructor(message: string, context?: Record<string, unknown>) {
    super(message, 'BUDGET_ERROR', context);
    this.name = 'BudgetError';
  }
}

/**
 * Settlement-specific errors (insufficient funds, missing accounts, invalid splits).
 */
export class SettlementError extends AppError {
  constructor(message: string, context?: Record<string, unknown>) {
    super(message, 'SETTLEMENT_ERROR', context);
    this.name = 'SettlementError';
  }
}

/**
 * Type guard: checks if an unknown value is an Error instance.
 */
export function isError(value: unknown): value is Error {
  return value instanceof Error;
}

/**
 * Type guard: checks if an unknown value is an AppError instance.
 */
export function isAppError(value: unknown): value is AppError {
  return value instanceof AppError;
}

/**
 * Extracts a user-friendly message from an unknown error.
 * Safe to use in catch blocks with unknown error types.
 */
export function getErrorMessage(error: unknown): string {
  if (error instanceof AppError) {
    return error.message;
  }
  if (error instanceof Error) {
    return error.message;
  }
  if (typeof error === 'string') {
    return error;
  }
  return 'An unexpected error occurred';
}

/**
 * Wraps an unknown error with additional context.
 * Use this in catch blocks to add context before re-throwing.
 */
export function wrapError(
  error: unknown,
  message: string,
  context?: Record<string, unknown>
): AppError {
  if (error instanceof AppError) {
    return new AppError(
      `${message}: ${error.message}`,
      error.code,
      { ...error.context, ...context }
    );
  }
  if (error instanceof Error) {
    return new AppError(
      `${message}: ${error.message}`,
      'WRAPPED_ERROR',
      { originalStack: error.stack, ...context }
    );
  }
  return new AppError(message, 'UNKNOWN_ERROR', context);
}
