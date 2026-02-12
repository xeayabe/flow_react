// FIX: SEC-003 - Replaced console.log/error with secure logger
// FIX: SEC-004 - Generic error messages that don't leak implementation details
// FIX: DAT-005 - Removed unused calculateBudgetPeriod import and dead code that calculated period dates
// All queries in this file are already properly scoped by email or userId

import { db } from './db';
// FIX: DAT-005 - Removed: import { calculateBudgetPeriod } from './payday-utils';
// calculateBudgetPeriod was imported and called but the result was never used.
// Periods are calculated dynamically from paydayDay, never stored.
import 'react-native-get-random-values';
import { v4 as uuidv4 } from 'uuid';
import { logger } from './logger'; // FIX: SEC-003 - Secure logger

export interface SignupData {
  email: string;
  name: string;
}

export interface AuthResponse {
  success: boolean;
  error?: string;
}

// Rate limiting storage
const rateLimitMap = new Map<string, { attempts: number; lastAttempt: number; lockedUntil?: number }>();

const MAX_ATTEMPTS = 5;
const LOCKOUT_DURATION = 15 * 60 * 1000; // 15 minutes
const RATE_LIMIT_WINDOW = 60 * 1000; // 1 minute

/**
 * Check if email is rate limited or locked out
 */
function checkRateLimit(email: string): { allowed: boolean; error?: string; remainingTime?: number } {
  const key = email.toLowerCase();
  const now = Date.now();
  const record = rateLimitMap.get(key);

  if (!record) {
    return { allowed: true };
  }

  // Check if account is locked out
  if (record.lockedUntil && now < record.lockedUntil) {
    const remainingMinutes = Math.ceil((record.lockedUntil - now) / 60000);
    return {
      allowed: false,
      error: `Too many attempts. Please try again in ${remainingMinutes} minute${remainingMinutes > 1 ? 's' : ''}`,
      remainingTime: record.lockedUntil - now,
    };
  }

  // Clear lockout if expired
  if (record.lockedUntil && now >= record.lockedUntil) {
    rateLimitMap.delete(key);
    return { allowed: true };
  }

  // Check rate limit window
  if (now - record.lastAttempt > RATE_LIMIT_WINDOW) {
    // Reset if outside window
    rateLimitMap.delete(key);
    return { allowed: true };
  }

  // Check max attempts
  if (record.attempts >= MAX_ATTEMPTS) {
    // Lock account
    record.lockedUntil = now + LOCKOUT_DURATION;
    rateLimitMap.set(key, record);
    return {
      allowed: false,
      error: `Too many attempts. Please try again in 15 minutes`,
      remainingTime: LOCKOUT_DURATION,
    };
  }

  return { allowed: true };
}

/**
 * Record an auth attempt
 */
function recordAttempt(email: string, success: boolean): void {
  const key = email.toLowerCase();
  const now = Date.now();
  const record = rateLimitMap.get(key);

  if (success) {
    // Clear rate limit on successful auth
    rateLimitMap.delete(key);
    return;
  }

  if (!record) {
    rateLimitMap.set(key, { attempts: 1, lastAttempt: now });
  } else {
    record.attempts += 1;
    record.lastAttempt = now;
    rateLimitMap.set(key, record);
  }
}

/**
 * Send magic code to user's email for signup/login
 */
export async function sendMagicCode(email: string): Promise<AuthResponse> {
  try {
    // Check rate limit
    const rateLimitCheck = checkRateLimit(email);
    if (!rateLimitCheck.allowed) {
      return { success: false, error: rateLimitCheck.error };
    }

    await db.auth.sendMagicCode({ email: email.toLowerCase() });

    // Record attempt (success)
    recordAttempt(email, true);

    return { success: true };
  } catch (error: unknown) {
    const err = error as { message?: string; body?: { message?: string } };

    // FIX: SEC-004 - Parse error internally but NEVER expose implementation details to user
    const errorMessage = err.message || err.body?.message || '';

    // FIX: SEC-004 - Always return a generic, user-friendly error message
    // Do NOT expose internal error details like DB names, query structure, or stack traces
    let userFriendlyError = 'Unable to send verification code. Please try again.'; // FIX: SEC-004

    // Handle specific error cases with generic messages
    if (errorMessage.includes('rate limit') || errorMessage.includes('too many')) {
      userFriendlyError = 'Too many attempts. Please try again in a few minutes.';
      logger.debug('Magic code request rate limited'); // FIX: SEC-003
    } else if (errorMessage.includes('network') || errorMessage.includes('connection')) {
      userFriendlyError = 'Connection issue. Please check your internet and try again.';
      logger.debug('Network error sending magic code'); // FIX: SEC-003
    } else {
      // FIX: SEC-003 - Log internally for debugging but don't expose to user
      // FIX: SEC-004 - Error object may contain DB table names, query info, etc.
      logger.error('Send magic code error:', errorMessage); // FIX: SEC-003 - Don't log full error object
    }

    // Record failed attempt
    recordAttempt(email, false);

    return {
      success: false,
      error: userFriendlyError, // FIX: SEC-004 - Generic message only
    };
  }
}

/**
 * Verify magic code and sign in
 */
export async function verifyMagicCode(email: string, code: string): Promise<AuthResponse> {
  try {
    // Check rate limit
    const rateLimitCheck = checkRateLimit(email);
    if (!rateLimitCheck.allowed) {
      return { success: false, error: rateLimitCheck.error };
    }

    await db.auth.signInWithMagicCode({ email: email.toLowerCase(), code });

    // Clear rate limit on successful verification
    recordAttempt(email, true);

    return { success: true };
  } catch (error: unknown) {
    const err = error as { message?: string; body?: { message?: string } };

    // FIX: SEC-004 - Parse error internally but NEVER expose implementation details
    const errorMessage = err.message || err.body?.message || '';

    // FIX: SEC-004 - Always return generic messages regardless of the specific error
    // The original code exposed "Record not found" and "app-user-magic-code" table names
    let userFriendlyError = 'Incorrect code. Please check your email and try again.'; // FIX: SEC-004

    // Handle specific error cases with generic messages
    if (errorMessage.includes('Record not found') || errorMessage.includes('app-user-magic-code')) {
      // FIX: SEC-004 - Don't reveal that the issue is a missing DB record or table name
      userFriendlyError = 'Incorrect code. Please check your email and try again.';
      logger.debug('Login attempt with incorrect verification code'); // FIX: SEC-003
    } else if (errorMessage.includes('expired')) {
      userFriendlyError = 'This code has expired. Please request a new one.';
      logger.debug('Login attempt with expired verification code'); // FIX: SEC-003
    } else if (errorMessage.includes('already used')) {
      userFriendlyError = 'This code has already been used. Please request a new one.';
      logger.debug('Login attempt with already used verification code'); // FIX: SEC-003
    } else {
      // FIX: SEC-003 + SEC-004 - Log error message only, not full error object
      logger.error('Verify magic code error:', errorMessage); // FIX: SEC-003
    }

    // Record failed attempt
    recordAttempt(email, false);

    return {
      success: false,
      error: userFriendlyError, // FIX: SEC-004 - Generic message only
    };
  }
}

/**
 * Create user profile ONLY (no household)
 * Household creation should be handled conditionally in signup flow
 */
export async function createUserProfile(email: string, name: string): Promise<AuthResponse> {
  try {
    const userId = uuidv4();
    const now = Date.now();

    logger.debug('createUserProfile - Creating user profile'); // FIX: SEC-003 - Don't log email or name

    // Create user profile
    await db.transact([
      db.tx.users[userId].update({
        email: email.toLowerCase(),
        name,
        emailVerified: true,
        isActive: true,
        createdAt: now,
      }),
    ]);

    logger.debug('User profile created successfully'); // FIX: SEC-003 - Don't log userId, email, or name

    return { success: true };
  } catch (error) {
    // FIX: SEC-003 + SEC-004 - Don't log or expose full error details
    logger.error('Create profile error'); // FIX: SEC-003 - Don't log error object that may contain user data
    return {
      success: false,
      error: 'Unable to create your profile. Please try again.', // FIX: SEC-004 - Generic message
    };
  }
}

/**
 * Create default household for a new user (admin role)
 */
export async function createDefaultHousehold(userId: string, name: string): Promise<{ success: boolean; householdId?: string; error?: string }> {
  try {
    logger.debug('Creating default household'); // FIX: SEC-003 - Don't log userId

    const householdId = uuidv4();
    const householdName = `${name}'s Household`;
    const defaultPaydayDay = 25; // Swiss standard
    // FIX: DAT-005 - Removed: const budgetPeriod = calculateBudgetPeriod(defaultPaydayDay);
    // The budgetPeriod variable was calculated but never used. Budget periods are
    // always calculated dynamically from paydayDay, never stored in the database.
    const now = Date.now();

    // Create household
    await db.transact([
      db.tx.households[householdId].update({
        name: householdName,
        currency: 'CHF',
        paydayDay: defaultPaydayDay, // Keep for backward compatibility
      }),
    ]);

    // Create household member record (admin role for creator)
    const memberId = uuidv4();
    await db.transact([
      db.tx.householdMembers[memberId].update({
        householdId,
        userId,
        status: 'active',
        role: 'admin', // Household creator is admin
        // Personal budget fields - admin gets default payday setup
        paydayDay: defaultPaydayDay,
      }),
    ]);

    logger.debug('Default household created successfully'); // FIX: SEC-003 - Don't log householdId or name

    return { success: true, householdId };
  } catch (error) {
    // FIX: SEC-003 + SEC-004 - Don't expose internal error details
    logger.error('Create default household error'); // FIX: SEC-003
    return {
      success: false,
      error: 'Unable to set up your household. Please try again.', // FIX: SEC-004 - Generic message
    };
  }
}

/**
 * Check if user profile exists
 */
export async function checkUserProfile(email: string): Promise<{ exists: boolean; profile?: { id: string; name: string } }> {
  try {
    const result = await db.queryOnce({
      users: {
        $: {
          where: {
            email: email.toLowerCase(),
          },
        },
      },
    });

    const user = result.data.users?.[0];
    if (user) {
      return { exists: true, profile: { id: user.id, name: user.name } };
    }
    return { exists: false };
  } catch (error) {
    logger.error('Check profile error'); // FIX: SEC-003 - Don't log error that may contain email
    return { exists: false };
  }
}

/**
 * Sign out current user
 */
export async function signOut(): Promise<void> {
  await db.auth.signOut();
}
