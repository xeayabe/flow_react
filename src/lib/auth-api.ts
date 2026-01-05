import { db } from './db';
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

/**
 * Send magic code to user's email for signup/login
 */
export async function sendMagicCode(email: string): Promise<AuthResponse> {
  try {
    await db.auth.sendMagicCode({ email: email.toLowerCase() });
    return { success: true };
  } catch (error: unknown) {
    const err = error as { body?: { message?: string } };
    console.error('Send magic code error:', error);
    return {
      success: false,
      error: err.body?.message || 'Failed to send verification code',
    };
  }
}

/**
 * Verify magic code and sign in
 */
export async function verifyMagicCode(email: string, code: string): Promise<AuthResponse> {
  try {
    await db.auth.signInWithMagicCode({ email: email.toLowerCase(), code });
    return { success: true };
  } catch (error: unknown) {
    const err = error as { body?: { message?: string } };
    console.error('Verify magic code error:', error);
    return {
      success: false,
      error: err.body?.message || 'Invalid verification code',
    };
  }
}

/**
 * Create user profile and default household after authentication
 */
export async function createUserProfile(email: string, name: string): Promise<AuthResponse> {
  try {
    const userId = uuidv4();
    const now = Date.now();

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

    // Create default household
    const householdId = uuidv4();
    const householdName = `${name}'s Household`;

    await db.transact([
      db.tx.households[householdId].update({
        name: householdName,
        currency: 'CHF',
        createdByUserId: userId,
        createdAt: now,
      }),
    ]);

    // Create household member record
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

    // Log for debugging (will show in expo.log)
    console.log('User profile created:', { userId, email, name });
    console.log('Default household created:', { householdId, householdName });

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
