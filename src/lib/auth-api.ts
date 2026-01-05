import { init } from '@instantdb/admin';
import bcrypt from 'bcryptjs';

// Initialize admin SDK
const ADMIN_TOKEN = process.env.INSTANTDB_ADMIN_TOKEN || '';
const APP_ID = process.env.EXPO_PUBLIC_INSTANTDB_APP_ID || '';

const db = init({
  appId: APP_ID,
  adminToken: ADMIN_TOKEN,
});

export interface SignupRequest {
  email: string;
  password: string;
  name: string;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface AuthResponse {
  success: boolean;
  token?: string;
  userId?: string;
  error?: string;
}

/**
 * Sign up a new user
 * 1. Validate email is unique
 * 2. Hash password
 * 3. Create user record
 * 4. Create default household
 * 5. Create household member record
 * 6. Return auth token
 */
export async function signup(data: SignupRequest): Promise<AuthResponse> {
  try {
    const { email, password, name } = data;

    // Check if email already exists
    const existingUsers = await db.query({
      users: {
        $: {
          where: {
            email: email.toLowerCase(),
          },
        },
      },
    });

    if (existingUsers.users && existingUsers.users.length > 0) {
      return {
        success: false,
        error: 'This email is already registered',
      };
    }

    // Hash password
    const passwordHash = await bcrypt.hash(password, 10);

    // Create user
    const userId = crypto.randomUUID();
    const now = Date.now();

    await db.transact([
      db.tx.users[userId].update({
        email: email.toLowerCase(),
        passwordHash,
        name,
        emailVerified: false,
        isActive: true,
        createdAt: now,
      }),
    ]);

    // Create default household
    const householdId = crypto.randomUUID();
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
    const memberId = crypto.randomUUID();
    await db.transact([
      db.tx.householdMembers[memberId].update({
        householdId,
        userId,
        role: 'admin',
        status: 'active',
        joinedAt: now,
      }),
    ]);

    // Generate auth token
    const token = await db.auth.createToken(email.toLowerCase());

    return {
      success: true,
      token,
      userId,
    };
  } catch (error) {
    console.error('Signup error:', error);
    return {
      success: false,
      error: 'Something went wrong. Please try again',
    };
  }
}

/**
 * Log in an existing user
 * 1. Find user by email
 * 2. Verify password
 * 3. Return auth token
 */
export async function login(data: LoginRequest): Promise<AuthResponse> {
  try {
    const { email, password } = data;

    // Find user
    const result = await db.query({
      users: {
        $: {
          where: {
            email: email.toLowerCase(),
          },
        },
      },
    });

    const user = result.users?.[0];

    if (!user) {
      return {
        success: false,
        error: 'Invalid email or password',
      };
    }

    // Verify password
    const isValid = await bcrypt.compare(password, user.passwordHash);

    if (!isValid) {
      return {
        success: false,
        error: 'Invalid email or password',
      };
    }

    // Check if user is active
    if (!user.isActive) {
      return {
        success: false,
        error: 'This account has been deactivated',
      };
    }

    // Generate auth token
    const token = await db.auth.createToken(email.toLowerCase());

    return {
      success: true,
      token,
      userId: user.id,
    };
  } catch (error) {
    console.error('Login error:', error);
    return {
      success: false,
      error: 'Something went wrong. Please try again',
    };
  }
}
