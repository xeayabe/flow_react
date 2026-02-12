/**
 * Retry logic with exponential backoff for transient errors
 *
 * FIX: REL-3 - Retry logic for network/transient errors
 *
 * Features:
 * - Wraps any async operation with exponential backoff
 * - 3 retries: 1s -> 2s -> 4s delays
 * - Only retries on network/transient errors, NOT on validation errors
 * - Returns original error after all retries exhausted
 * - TypeScript generics for type safety
 */

/**
 * Configuration for retry behavior
 */
export interface RetryConfig {
  /** Maximum number of retry attempts (default: 3) */
  maxRetries: number;
  /** Base delay in milliseconds (default: 1000) */
  baseDelayMs: number;
  /** Multiplier for exponential backoff (default: 2) */
  backoffMultiplier: number;
  /** Optional custom function to determine if an error is retryable */
  isRetryable?: (error: unknown) => boolean;
  /** Optional callback invoked before each retry */
  onRetry?: (attempt: number, error: unknown, delayMs: number) => void;
}

// FIX: REL-3 - Default retry configuration: 3 retries with exponential backoff 1s -> 2s -> 4s
const DEFAULT_CONFIG: RetryConfig = {
  maxRetries: 3,
  baseDelayMs: 1000,
  backoffMultiplier: 2,
};

/**
 * Errors that should NOT be retried (validation / business logic errors)
 * These indicate a problem with the request itself, not a transient failure.
 */
// FIX: REL-3 - Only retry on transient errors, not validation errors
const NON_RETRYABLE_PATTERNS = [
  'validation',
  'invalid',
  'not found',
  'access denied',
  'unauthorized',
  'forbidden',
  'already exists',
  'must be',
  'cannot be',
  'required',
  'too long',
  'too short',
  'must total',
  'Amount must',
  'Please select',
] as const;

/**
 * Determine if an error is transient (retryable) vs. permanent (non-retryable)
 *
 * Retryable errors:
 * - Network errors (fetch failures, timeouts, DNS failures)
 * - HTTP 5xx server errors
 * - HTTP 429 rate limiting
 * - InstantDB transient errors
 *
 * Non-retryable errors:
 * - Validation errors (bad input)
 * - Auth errors (401, 403)
 * - Not found (404)
 * - Business logic errors
 */
// FIX: REL-3 - Classify errors as transient vs permanent
export function isTransientError(error: unknown): boolean {
  if (error === null || error === undefined) return false;

  const errorMessage = getErrorMessage(error).toLowerCase();

  // Check if error matches any non-retryable pattern
  for (const pattern of NON_RETRYABLE_PATTERNS) {
    if (errorMessage.includes(pattern.toLowerCase())) {
      return false;
    }
  }

  // Network errors are always retryable
  if (
    errorMessage.includes('network') ||
    errorMessage.includes('timeout') ||
    errorMessage.includes('econnrefused') ||
    errorMessage.includes('econnreset') ||
    errorMessage.includes('enotfound') ||
    errorMessage.includes('fetch failed') ||
    errorMessage.includes('socket hang up') ||
    errorMessage.includes('aborted')
  ) {
    return true;
  }

  // HTTP status-based classification
  if (error instanceof Error && 'status' in error) {
    const status = (error as any).status;
    if (typeof status === 'number') {
      // 429 (rate limit) and 5xx (server errors) are retryable
      if (status === 429 || (status >= 500 && status < 600)) {
        return true;
      }
      // 4xx errors (client errors) are NOT retryable
      if (status >= 400 && status < 500) {
        return false;
      }
    }
  }

  // InstantDB-specific transient errors
  if (
    errorMessage.includes('transact') ||
    errorMessage.includes('connection') ||
    errorMessage.includes('temporarily unavailable') ||
    errorMessage.includes('service unavailable')
  ) {
    return true;
  }

  // Default: treat unknown errors as retryable (safer for data ops)
  return true;
}

/**
 * Extract error message from any error type
 */
function getErrorMessage(error: unknown): string {
  if (error instanceof Error) return error.message;
  if (typeof error === 'string') return error;
  if (typeof error === 'object' && error !== null && 'message' in error) {
    return String((error as any).message);
  }
  return String(error);
}

/**
 * Sleep for a given number of milliseconds
 */
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Execute an async operation with retry logic and exponential backoff.
 *
 * @param operation - The async function to execute
 * @param config - Optional retry configuration (defaults: 3 retries, 1s base delay, 2x backoff)
 * @returns The result of the operation
 * @throws The last error encountered after all retries are exhausted
 *
 * @example
 * // Basic usage
 * const result = await withRetry(() => db.transact([...]))
 *
 * @example
 * // Custom config
 * const result = await withRetry(
 *   () => fetchData(),
 *   { maxRetries: 5, baseDelayMs: 500, backoffMultiplier: 3 }
 * )
 *
 * @example
 * // With retry callback
 * const result = await withRetry(
 *   () => saveTransaction(data),
 *   {
 *     ...DEFAULT_RETRY_CONFIG,
 *     onRetry: (attempt, error, delay) => {
 *       console.warn(`Retry ${attempt} after ${delay}ms:`, error);
 *     }
 *   }
 * )
 */
// FIX: REL-3 - Main retry wrapper with exponential backoff
export async function withRetry<T>(
  operation: () => Promise<T>,
  config?: Partial<RetryConfig>
): Promise<T> {
  const mergedConfig: RetryConfig = { ...DEFAULT_CONFIG, ...config };
  const { maxRetries, baseDelayMs, backoffMultiplier, isRetryable, onRetry } = mergedConfig;

  let lastError: unknown;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await operation();
    } catch (error) {
      lastError = error;

      // Check if we've exhausted all retries
      if (attempt >= maxRetries) {
        break;
      }

      // Check if this error is retryable
      const shouldRetry = isRetryable ? isRetryable(error) : isTransientError(error);

      if (!shouldRetry) {
        // Non-retryable error -- throw immediately
        throw error;
      }

      // Calculate delay with exponential backoff: baseDelay * multiplier^attempt
      // Attempt 0 (first retry): 1000ms, Attempt 1: 2000ms, Attempt 2: 4000ms
      const delayMs = baseDelayMs * Math.pow(backoffMultiplier, attempt);

      // Invoke retry callback if provided
      if (onRetry) {
        onRetry(attempt + 1, error, delayMs);
      }

      // Wait before retrying
      await sleep(delayMs);
    }
  }

  // All retries exhausted -- throw the last error
  throw lastError;
}

/**
 * Pre-configured retry for InstantDB transact operations.
 * Uses default settings (3 retries, 1s/2s/4s backoff).
 */
// FIX: REL-3 - Convenience wrapper for database transactions
export async function withTransactRetry<T>(operation: () => Promise<T>): Promise<T> {
  return withRetry(operation, {
    onRetry: (attempt, error, delayMs) => {
      console.warn(
        `[retry] Database transact retry ${attempt}/3 after ${delayMs}ms:`,
        error instanceof Error ? error.message : error
      );
    },
  });
}
