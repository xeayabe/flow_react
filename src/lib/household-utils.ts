import { db } from './db';

/**
 * Get user's household ID via household membership
 * Works for both admins (who created household) and members (who joined via invite)
 */
export async function getUserHouseholdId(userId: string): Promise<string | null> {
  const { data: memberData } = await db.queryOnce({
    householdMembers: {
      $: { where: { userId, status: 'active' } },
    },
  });

  return memberData.householdMembers[0]?.householdId || null;
}

/**
 * Get user's household ID by email (for auth contexts)
 * Works for both admins and members
 */
export async function getUserHouseholdIdByEmail(email: string): Promise<string | null> {
  const { data: userData } = await db.queryOnce({
    users: { $: { where: { email } } },
  });
  const userProfile = userData.users[0];

  if (!userProfile) return null;

  return getUserHouseholdId(userProfile.id);
}

/**
 * Get user profile and household ID together
 * Common pattern used across the app
 */
export async function getUserProfileAndHousehold(email: string): Promise<{
  userRecord: any;
  householdId: string;
} | null> {
  const { data: userData } = await db.queryOnce({
    users: { $: { where: { email } } },
  });

  const userRecord = userData.users?.[0];
  if (!userRecord) return null;

  const { data: memberData } = await db.queryOnce({
    householdMembers: {
      $: { where: { userId: userRecord.id, status: 'active' } },
    },
  });

  const member = memberData.householdMembers?.[0];
  if (!member) return null;

  return {
    userRecord,
    householdId: member.householdId,
  };
}
