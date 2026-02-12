// FIX: SEC-007 - Rate limiter to prevent rapid-fire mutations
// Uses sliding window algorithm with AsyncStorage persistence

import AsyncStorage from '@react-native-async-storage/async-storage';
import { logger } from './logger';

const STORAGE_KEY_PREFIX = '@flow_rate_limit:';

/**
 * Result of a rate limit check.
 */
export interface RateLimitResult {
  /** Whether the action is allowed */
  allowed: boolean;
  /** Milliseconds until the next allowed action (0 if allowed) */
  retryAfterMs: number;
  /** Number of actions remaining in the current window */
  remaining: number;
}

/**
 * Configuration for a rate limit rule.
 */
export interface RateLimitConfig {
  /** Maximum number of writes allowed in the window */
  maxRequests: number;
  /** Window duration in milliseconds */
  windowMs: number;
}

/**
 * Default rate limit configurations per entity type.
 * Max 10 writes per minute per entity type.
 */
const DEFAULT_LIMITS: Record<string, RateLimitConfig> = {
  transactions: { maxRequests: 10, windowMs: 60_000 },
  budgets: { maxRequests: 10, windowMs: 60_000 },
  settlements: { maxRequests: 5, windowMs: 60_000 },
  accounts: { maxRequests: 10, windowMs: 60_000 },
  shared_expense_splits: { maxRequests: 10, windowMs: 60_000 },
  categories: { maxRequests: 10, windowMs: 60_000 },
  categoryGroups: { maxRequests: 10, windowMs: 60_000 },
  recurringTemplates: { maxRequests: 10, windowMs: 60_000 },
  default: { maxRequests: 10, windowMs: 60_000 },
};

/**
 * In-memory cache of timestamps (avoids reading AsyncStorage on every check).
 * Maps entityType -> array of timestamps (epoch ms).
 */
const memoryCache: Map<string, number[]> = new Map();

/**
 * Whether the cache has been loaded from AsyncStorage.
 */
let cacheLoaded = false;

/**
 * Load rate limit state from AsyncStorage into memory cache.
 * Called once on first usage.
 */
async function loadCache(): Promise<void> {
  if (cacheLoaded) return;

  try {
    const keys = await AsyncStorage.getAllKeys();
    const rateLimitKeys = keys.filter((k) => k.startsWith(STORAGE_KEY_PREFIX));

    if (rateLimitKeys.length > 0) {
      const entries = await AsyncStorage.multiGet(rateLimitKeys);
      for (const [key, value] of entries) {
        if (key && value) {
          const entityType = key.replace(STORAGE_KEY_PREFIX, '');
          try {
            const timestamps = JSON.parse(value) as number[];
            memoryCache.set(entityType, timestamps);
          } catch {
            // Invalid data, skip
          }
        }
      }
    }
  } catch (error) {
    logger.warn('Failed to load rate limit cache from AsyncStorage:', error);
  }

  cacheLoaded = true;
}

/**
 * Persist the current timestamps for an entity to AsyncStorage.
 */
async function persistEntity(entityType: string): Promise<void> {
  try {
    const timestamps = memoryCache.get(entityType) || [];
    await AsyncStorage.setItem(
      `${STORAGE_KEY_PREFIX}${entityType}`,
      JSON.stringify(timestamps)
    );
  } catch (error) {
    logger.warn('Failed to persist rate limit state:', error);
  }
}

/**
 * Remove expired timestamps from the window.
 */
function pruneTimestamps(timestamps: number[], windowMs: number): number[] {
  const cutoff = Date.now() - windowMs;
  return timestamps.filter((ts) => ts > cutoff);
}

/**
 * Check if a mutation is allowed under the rate limit.
 * Does NOT record the attempt -- call `recordMutation` after a successful write.
 *
 * @param entityType - The entity being mutated (e.g., 'transactions', 'budgets')
 * @param config - Optional override for rate limit configuration
 * @returns RateLimitResult indicating whether the action is allowed
 */
export async function checkRateLimit(
  entityType: string,
  config?: RateLimitConfig
): Promise<RateLimitResult> {
  await loadCache();

  const limitConfig = config || DEFAULT_LIMITS[entityType] || DEFAULT_LIMITS.default;
  const timestamps = pruneTimestamps(
    memoryCache.get(entityType) || [],
    limitConfig.windowMs
  );

  // Update in-memory cache with pruned timestamps
  memoryCache.set(entityType, timestamps);

  if (timestamps.length >= limitConfig.maxRequests) {
    // Rate limited: calculate when the oldest timestamp in the window expires
    const oldestTimestamp = timestamps[0];
    const retryAfterMs = Math.max(0, oldestTimestamp + limitConfig.windowMs - Date.now());

    return {
      allowed: false,
      retryAfterMs,
      remaining: 0,
    };
  }

  return {
    allowed: true,
    retryAfterMs: 0,
    remaining: limitConfig.maxRequests - timestamps.length,
  };
}

/**
 * Record a successful mutation for rate limiting purposes.
 * Call this AFTER a successful write operation.
 *
 * @param entityType - The entity that was mutated
 * @param config - Optional override for rate limit configuration
 */
export async function recordMutation(
  entityType: string,
  config?: RateLimitConfig
): Promise<void> {
  await loadCache();

  const limitConfig = config || DEFAULT_LIMITS[entityType] || DEFAULT_LIMITS.default;
  const timestamps = pruneTimestamps(
    memoryCache.get(entityType) || [],
    limitConfig.windowMs
  );

  timestamps.push(Date.now());
  memoryCache.set(entityType, timestamps);

  // Persist in background (don't await to avoid slowing mutations)
  persistEntity(entityType).catch(() => {
    // Silently fail persistence -- memory cache is still accurate
  });
}

/**
 * Clear all rate limit state. Useful for testing or after sign-out.
 */
export async function clearRateLimits(): Promise<void> {
  memoryCache.clear();
  cacheLoaded = false;

  try {
    const keys = await AsyncStorage.getAllKeys();
    const rateLimitKeys = keys.filter((k) => k.startsWith(STORAGE_KEY_PREFIX));
    if (rateLimitKeys.length > 0) {
      await AsyncStorage.multiRemove(rateLimitKeys);
    }
  } catch (error) {
    logger.warn('Failed to clear rate limit state:', error);
  }
}

/**
 * Convenience: check + record in one call. Returns the check result.
 * If allowed, automatically records the mutation.
 *
 * @param entityType - The entity being mutated
 * @param config - Optional override for rate limit configuration
 * @returns RateLimitResult
 */
export async function rateLimitedMutation(
  entityType: string,
  config?: RateLimitConfig
): Promise<RateLimitResult> {
  const result = await checkRateLimit(entityType, config);

  if (result.allowed) {
    await recordMutation(entityType, config);
  }

  return result;
}
