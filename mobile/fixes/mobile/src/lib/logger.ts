// FIX: SEC-003, CQP-003 - Secure logger utility that prevents sensitive data leakage in production
// Replaces raw console.log/console.error calls across the codebase

/**
 * Patterns that match sensitive data for auto-redaction.
 * Each entry has a regex and a replacement label.
 */
const REDACT_PATTERNS: Array<{ pattern: RegExp; label: string }> = [
  // UUIDs (user IDs, account IDs, transaction IDs, etc.)
  { pattern: /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/gi, label: '[REDACTED-ID]' },
  // Email addresses
  { pattern: /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g, label: '[REDACTED-EMAIL]' },
  // Swiss currency amounts (CHF 1'234.56 or plain numbers that look like amounts)
  { pattern: /CHF\s?-?\d{1,3}(?:['\u2019]\d{3})*(?:\.\d{2})?/g, label: '[REDACTED-AMOUNT]' },
  // Numeric amounts preceded by common labels (amount=, balance=, etc.)
  { pattern: /(amount|balance|income|spent|total|debt|splitAmount)[=:]\s*-?\d+\.?\d*/gi, label: '$1=[REDACTED]' },
  // IBAN numbers
  { pattern: /[A-Z]{2}\d{2}[\s]?\d{4}[\s]?\d{4}[\s]?\d{4}[\s]?\d{4}[\s]?\d{0,2}/g, label: '[REDACTED-IBAN]' },
  // Last 4 digits patterns
  { pattern: /last4Digits[=:]\s*['"]?\d{4}['"]?/gi, label: 'last4Digits=[REDACTED]' },
];

/**
 * Redact sensitive information from a value before logging.
 * Works on strings and recursively on objects/arrays.
 */
function redact(value: unknown): unknown {
  if (typeof value === 'string') {
    let result = value;
    for (const { pattern, label } of REDACT_PATTERNS) {
      // Reset lastIndex for global patterns
      pattern.lastIndex = 0;
      result = result.replace(pattern, label);
    }
    return result;
  }

  if (typeof value === 'number') {
    return value;
  }

  if (value instanceof Error) {
    return redact(value.message);
  }

  if (Array.isArray(value)) {
    return value.map(redact);
  }

  if (value !== null && typeof value === 'object') {
    const redacted: Record<string, unknown> = {};
    for (const [key, val] of Object.entries(value)) {
      // Always fully redact known sensitive keys
      const sensitiveKeys = ['email', 'password', 'token', 'secret', 'authorization', 'cookie', 'last4Digits'];
      if (sensitiveKeys.some((sk) => key.toLowerCase().includes(sk))) {
        redacted[key] = '[REDACTED]';
      } else {
        redacted[key] = redact(val);
      }
    }
    return redacted;
  }

  return value;
}

/**
 * Check if the app is running in development mode.
 * Uses the __DEV__ global that React Native provides.
 */
function isDev(): boolean {
  // __DEV__ is a React Native global, always true in dev, false in production
  return typeof __DEV__ !== 'undefined' && __DEV__;
}

/**
 * Logger utility with auto-redaction of sensitive data.
 *
 * - debug(): Only outputs in __DEV__ mode, with redaction
 * - warn(): Only outputs in __DEV__ mode, with redaction
 * - error(): Always outputs (for actual errors), with redaction
 * - info(): Only outputs in __DEV__ mode, with redaction
 *
 * All methods are no-ops in production builds (except error).
 */
export const logger = {
  /**
   * Debug-level logging. Only outputs in development mode.
   * Sensitive data is automatically redacted.
   */
  debug(...args: unknown[]): void {
    if (!isDev()) return;
    const redactedArgs = args.map(redact);
    console.log('[DEBUG]', ...redactedArgs);
  },

  /**
   * Info-level logging. Only outputs in development mode.
   * Sensitive data is automatically redacted.
   */
  info(...args: unknown[]): void {
    if (!isDev()) return;
    const redactedArgs = args.map(redact);
    console.log('[INFO]', ...redactedArgs);
  },

  /**
   * Warning-level logging. Only outputs in development mode.
   * Sensitive data is automatically redacted.
   */
  warn(...args: unknown[]): void {
    if (!isDev()) return;
    const redactedArgs = args.map(redact);
    console.warn('[WARN]', ...redactedArgs);
  },

  /**
   * Error-level logging. Always outputs (even in production).
   * Sensitive data is automatically redacted.
   */
  error(...args: unknown[]): void {
    const redactedArgs = args.map(redact);
    console.error('[ERROR]', ...redactedArgs);
  },
};

export default logger;
