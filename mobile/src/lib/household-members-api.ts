import { db } from './db';
import { calculateDebtBalance } from './shared-expenses-api';

/**
 * Household member with user details
 */
export interface HouseholdMemberWithUser {
  id: string;
  memberId: string;
  userId: string;
  email: string;
  name: string;
  role: 'admin' | 'member';
  status: string;
  isCurrentUser: boolean;
}

/**
 * Result of checking if a member can be removed
 */
export interface RemovalCheckResult {
  canRemove: boolean;
  reason?: string;
  debtAmount?: number;
  debtDirection?: 'owes' | 'owed';
}

/**
 * Get all members of a household with their user details
 */
export async function getHouseholdMembers(
  householdId: string,
  currentUserId: string
): Promise<HouseholdMemberWithUser[]> {
  console.log('=== getHouseholdMembers START ===');
  console.log('Household ID:', householdId);
  console.log('Current User ID:', currentUserId);

  // Get all active members of the household
  const { data: memberData } = await db.queryOnce({
    householdMembers: {
      $: { where: { householdId, status: 'active' } }
    }
  });

  const members = memberData.householdMembers || [];
  console.log('Found members:', members.length);

  // Get user details for each member
  const userIds = members.map((m: any) => m.userId);
  const { data: userData } = await db.queryOnce({
    users: {}
  });

  const users = userData.users || [];
  const userMap = new Map(users.map((u: any) => [u.id, u]));

  // Get household to determine admin (creator)
  const { data: householdData } = await db.queryOnce({
    households: {
      $: { where: { id: householdId } },
      createdBy: {}
    }
  });

  const household = householdData.households?.[0];
  const creatorId = household?.createdBy?.id;
  console.log('Household creator ID:', creatorId);

  // Build member list with user details
  const result: HouseholdMemberWithUser[] = members.map((member: any) => {
    const user = userMap.get(member.userId);
    // Admin is either explicitly set or the household creator
    const isAdmin = member.role === 'admin' || member.userId === creatorId;

    return {
      id: member.id,
      memberId: member.id,
      userId: member.userId,
      email: user?.email || 'Unknown',
      name: user?.name || user?.email?.split('@')[0] || 'Unknown',
      role: isAdmin ? 'admin' : 'member',
      status: member.status,
      isCurrentUser: member.userId === currentUserId
    };
  });

  // Sort: current user first, then admin, then by name
  result.sort((a, b) => {
    if (a.isCurrentUser) return -1;
    if (b.isCurrentUser) return 1;
    if (a.role === 'admin' && b.role !== 'admin') return -1;
    if (b.role === 'admin' && a.role !== 'admin') return 1;
    return a.name.localeCompare(b.name);
  });

  console.log('Processed members:', result);
  console.log('=== getHouseholdMembers END ===');
  return result;
}

/**
 * Check if the current user is an admin of the household
 */
export async function isHouseholdAdmin(
  userId: string,
  householdId: string
): Promise<boolean> {
  console.log('=== isHouseholdAdmin START ===');

  // Get member record
  const { data: memberData } = await db.queryOnce({
    householdMembers: {
      $: { where: { householdId, userId, status: 'active' } }
    }
  });

  const member = memberData.householdMembers?.[0];
  if (!member) {
    console.log('Member not found');
    return false;
  }

  // Check explicit role
  if (member.role === 'admin') {
    console.log('User has admin role');
    return true;
  }

  // Check if user is household creator
  const { data: householdData } = await db.queryOnce({
    households: {
      $: { where: { id: householdId } },
      createdBy: {}
    }
  });

  const household = householdData.households?.[0];
  const isCreator = household?.createdBy?.id === userId;

  console.log('Is household creator:', isCreator);
  console.log('=== isHouseholdAdmin END ===');
  return isCreator;
}

/**
 * Check if a member can be removed from the household
 */
export async function checkCanRemoveMember(
  adminUserId: string,
  targetUserId: string,
  householdId: string
): Promise<RemovalCheckResult> {
  console.log('=== checkCanRemoveMember START ===');
  console.log('Admin User ID:', adminUserId);
  console.log('Target User ID:', targetUserId);
  console.log('Household ID:', householdId);

  // 1. Check if admin is actually an admin
  const isAdmin = await isHouseholdAdmin(adminUserId, householdId);
  if (!isAdmin) {
    console.log('User is not an admin');
    return {
      canRemove: false,
      reason: 'Only the household admin can remove members'
    };
  }

  // 2. Cannot remove self
  if (adminUserId === targetUserId) {
    console.log('Cannot remove self');
    return {
      canRemove: false,
      reason: 'You cannot remove yourself. Use "Leave Household" instead.'
    };
  }

  // 3. Check for unsettled debt
  const debt = await calculateDebtBalance(adminUserId, targetUserId);
  console.log('Debt balance:', debt);

  if (Math.abs(debt.netBalance) > 0.01) {
    const direction = debt.whoOwesUserId === targetUserId ? 'owes' : 'owed';
    console.log('Unsettled debt exists:', debt.amount, direction);
    return {
      canRemove: false,
      reason: 'Cannot remove member with unsettled debt',
      debtAmount: debt.amount,
      debtDirection: direction
    };
  }

  // 4. Check if this would leave the household empty (shouldn't happen in 2-member limit)
  const { data: memberData } = await db.queryOnce({
    householdMembers: {
      $: { where: { householdId, status: 'active' } }
    }
  });

  const activeMembers = memberData.householdMembers?.length || 0;
  if (activeMembers <= 1) {
    console.log('Cannot remove last member');
    return {
      canRemove: false,
      reason: 'Cannot remove the last member of the household'
    };
  }

  console.log('Member can be removed');
  console.log('=== checkCanRemoveMember END ===');
  return {
    canRemove: true,
    debtAmount: 0
  };
}

/**
 * Remove a member from the household
 */
export async function removeMemberFromHousehold(
  adminUserId: string,
  targetMemberId: string,
  targetUserId: string,
  householdId: string
): Promise<{ success: boolean; error?: string }> {
  console.log('=== removeMemberFromHousehold START ===');
  console.log('Admin User ID:', adminUserId);
  console.log('Target Member ID:', targetMemberId);
  console.log('Target User ID:', targetUserId);
  console.log('Household ID:', householdId);

  // Final check before removal
  const canRemove = await checkCanRemoveMember(adminUserId, targetUserId, householdId);
  if (!canRemove.canRemove) {
    console.log('Cannot remove:', canRemove.reason);
    return { success: false, error: canRemove.reason };
  }

  // Update member status to 'removed'
  await db.transact([
    db.tx.householdMembers[targetMemberId].update({
      status: 'removed',
      removedAt: Date.now(),
      removedBy: adminUserId
    })
  ]);

  console.log('Member removed successfully');
  console.log('=== removeMemberFromHousehold END ===');
  return { success: true };
}

/**
 * Get current user's household ID and member info
 */
export async function getCurrentUserHouseholdInfo(userEmail: string): Promise<{
  userId: string;
  householdId: string;
  memberId: string;
  isAdmin: boolean;
} | null> {
  console.log('=== getCurrentUserHouseholdInfo START ===');

  // Get user profile
  const { data: userData } = await db.queryOnce({
    users: {
      $: { where: { email: userEmail } }
    }
  });

  const userProfile = userData.users?.[0];
  if (!userProfile) {
    console.log('User profile not found');
    return null;
  }

  // Get household member record
  const { data: memberData } = await db.queryOnce({
    householdMembers: {
      $: { where: { userId: userProfile.id, status: 'active' } }
    }
  });

  const member = memberData.householdMembers?.[0];
  if (!member) {
    console.log('Member record not found');
    return null;
  }

  // Check if admin
  const isAdmin = await isHouseholdAdmin(userProfile.id, member.householdId);

  console.log('User household info:', {
    userId: userProfile.id,
    householdId: member.householdId,
    memberId: member.id,
    isAdmin
  });
  console.log('=== getCurrentUserHouseholdInfo END ===');

  return {
    userId: userProfile.id,
    householdId: member.householdId,
    memberId: member.id,
    isAdmin
  };
}
