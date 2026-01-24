import { db } from './db';
import { createDefaultCategories } from './categories-api';
import { createDefaultCategoryGroups } from './category-groups-api';
import { calculateBudgetPeriod } from './payday-utils';
import 'react-native-get-random-values';
import { v4 as uuidv4 } from 'uuid';

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

    // Parse error message for user-friendly responses
    const errorMessage = err.message || err.body?.message || '';

    let userFriendlyError = 'Failed to send verification code. Please try again';

    // Handle specific error cases
    if (errorMessage.includes('rate limit') || errorMessage.includes('too many')) {
      userFriendlyError = 'Too many attempts. Please try again in a few minutes';
      console.log('Magic code request rate limited');
    } else if (errorMessage.includes('network') || errorMessage.includes('connection')) {
      userFriendlyError = 'Connection issue. Please check your internet and try again';
      console.log('Network error sending magic code');
    } else {
      // Log unexpected errors for debugging
      console.error('Send magic code error:', error);
    }

    // Record failed attempt
    recordAttempt(email, false);

    return {
      success: false,
      error: userFriendlyError,
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

    // Parse error message for user-friendly responses
    // Check both error.message and error.body.message
    const errorMessage = err.message || err.body?.message || '';

    let userFriendlyError = 'Incorrect code. Please check your email and try again';

    // Handle specific error cases
    if (errorMessage.includes('Record not found') || errorMessage.includes('app-user-magic-code')) {
      userFriendlyError = 'Incorrect code. Please check your email and try again';
      // Log user-friendly message instead of technical error
      console.log('Login attempt with incorrect verification code');
    } else if (errorMessage.includes('expired')) {
      userFriendlyError = 'This code has expired. Please request a new one';
      console.log('Login attempt with expired verification code');
    } else if (errorMessage.includes('already used')) {
      userFriendlyError = 'This code has already been used. Please request a new one';
      console.log('Login attempt with already used verification code');
    } else {
      // Log unexpected errors for debugging
      console.error('Verify magic code error:', error);
    }

    // Record failed attempt
    recordAttempt(email, false);

    return {
      success: false,
      error: userFriendlyError,
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

    console.log('⚠️ createUserProfile - Creating user ONLY, NO household');

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

    console.log('✅ User profile created:', { userId, email, name });
    console.log('⚠️ NO household created - must be created separately');

    return { success: true };
  } catch (error) {
    console.error('Create profile error:', error);
    return {
      success: false,
      error: 'Failed to create user profile',
    };
  }
}

/**
 * Create default household for a new user (admin role)
 */
export async function createDefaultHousehold(userId: string, name: string): Promise<{ success: boolean; householdId?: string; error?: string }> {
  try {
    console.log('Creating default household for user:', userId);

    const householdId = uuidv4();
    const householdName = `${name}'s Household`;
    const defaultPaydayDay = 25; // Swiss standard
    const budgetPeriod = calculateBudgetPeriod(defaultPaydayDay);
    const now = Date.now();

    // Create household
    await db.transact([
      db.tx.households[householdId].update({
        name: householdName,
        currency: 'CHF',
        createdByUserId: userId,
        paydayDay: defaultPaydayDay,
        payFrequency: 'monthly',
        budgetPeriodStart: budgetPeriod.start,
        budgetPeriodEnd: budgetPeriod.end,
        createdAt: now,
        updatedAt: now,
      }),
    ]);

    // Create household member record with ADMIN role
    const memberId = uuidv4();
    await db.transact([
      db.tx.householdMembers[memberId].update({
        householdId,
        userId,
        role: 'admin',
        status: 'active',
        joinedAt: now,
      }),
    ]);

    console.log('✅ Household member created with role: admin');

    // Create default categories for household
    await createDefaultCategories(householdId);

    // Create default category groups for household
    await createDefaultCategoryGroups(householdId, userId);

    console.log('✅ Default household created:', { householdId, householdName });

    return { success: true, householdId };
  } catch (error) {
    console.error('Create default household error:', error);
    return {
      success: false,
      error: 'Failed to create default household',
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
    console.error('Check profile error:', error);
    return { exists: false };
  }
}

/**
 * Sign out current user
 */
export async function signOut(): Promise<void> {
  await db.auth.signOut();
}
