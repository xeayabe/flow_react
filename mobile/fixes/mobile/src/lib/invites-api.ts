// FIX: DAT-005 - Removed unused calculateBudgetPeriod import and dead budgetPeriod variable
// FIX: SEC-003 - Replaced console.log/error with secure logger; removed sensitive data from logs
import { db } from './db';
import { v4 as uuidv4 } from 'uuid';
import { logger } from './logger'; // FIX: SEC-003 - Secure logger

// Generate random 6-character alphanumeric code
function generateInviteCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // Avoid confusing chars: I,1,O,0
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

// Create invite with 6-digit code
export async function createInviteCode(userId: string, householdId: string) {
  const inviteCode = generateInviteCode();
  const expiresAt = Date.now() + 5 * 60 * 1000; // 5 minutes (300 seconds)

  const invite = {
    id: uuidv4(),
    householdId,
    invitedByUserId: userId,
    inviteToken: inviteCode,  // Store the 6-digit code
    status: 'pending',
    expiresAt,
    createdAt: Date.now(),
  };

  await db.transact([
    db.tx.household_invites[invite.id].update(invite)
  ]);

  return {
    invite,
    inviteCode,
    expiresAt
  };
}

// Validate invite code
export async function validateInviteCode(code: string) {
  const upperCode = code.toUpperCase().trim();

  const { data } = await db.queryOnce({
    household_invites: {
      $: {
        where: {
          inviteToken: upperCode,
          status: 'pending'
        }
      }
    }
  });

  const invite = data.household_invites[0];

  if (!invite) {
    return { valid: false, error: 'Invalid code' };
  }

  // Check expiration
  if (invite.expiresAt < Date.now()) {
    // Mark as expired
    await db.transact([
      db.tx.household_invites[invite.id].update({
        status: 'expired',
      })
    ]);
    return { valid: false, error: 'Code expired' };
  }

  return { valid: true, invite };
}

// Accept invite code (after signup)
export async function acceptInviteCode(code: string, newUserId: string) {
  logger.debug('=== acceptInviteCode START ==='); // FIX: SEC-003

  const validation = await validateInviteCode(code);
  logger.debug('Validation result:', { valid: validation.valid }); // FIX: SEC-003 - Don't log code or invite details

  if (!validation.valid) {
    logger.error('Invalid invite code'); // FIX: SEC-003 - Don't log error details
    throw new Error(validation.error);
  }

  const invite = validation.invite!;
  logger.debug('Valid invite found'); // FIX: SEC-003 - Don't log invite ID, householdId, or invitedBy

  // Check household member limit (max 2 for Phase 2)
  const { data } = await db.queryOnce({
    householdMembers: {
      $: {
        where: {
          householdId: invite.householdId,
          status: 'active'
        }
      }
    }
  });

  logger.debug('Current active members:', data.householdMembers.length); // FIX: SEC-003

  if (data.householdMembers.length >= 2) {
    logger.error('Household full'); // FIX: SEC-003
    throw new Error('Household is full (max 2 members)');
  }

  // Get household to use their payday as default for invited member
  const householdResult = await db.queryOnce({
    households: {
      $: { where: { id: invite.householdId } }
    }
  });

  const household = householdResult.data.households?.[0];
  const householdPayday = household?.paydayDay ?? 25;

  // FIX: DAT-005 - Removed unused calculateBudgetPeriod import and dead code.
  // Previously: const { calculateBudgetPeriod } = await import('./payday-utils');
  //             const budgetPeriod = calculateBudgetPeriod(householdPayday);
  // The budgetPeriod variable was calculated but never used in the db.transact() call below.
  // Budget periods are always calculated dynamically from paydayDay, never stored in the database.

  // Add user to household as MEMBER with household's payday as default
  const memberId = uuidv4();

  logger.debug('Creating household member with role: member'); // FIX: SEC-003 - Don't log IDs

  await db.transact([
    // Mark invite as accepted
    db.tx.household_invites[invite.id].update({
      status: 'accepted',
      acceptedByUserId: newUserId,
      acceptedAt: Date.now(),
    }),
    // Add user as MEMBER (not admin) - with household's payday as default
    db.tx.householdMembers[memberId].update({
      householdId: invite.householdId,
      userId: newUserId,
      status: 'active',
      role: 'member', // Invited users are members, not admin
      // Personal budget fields - initialized with household's payday
      paydayDay: householdPayday,
    })
  ]);

  logger.debug('Transaction complete - member added'); // FIX: SEC-003
  logger.debug('=== acceptInviteCode END ===');

  return { householdId: invite.householdId };
}

// Get invite details for preview (used in signup)
export async function getInviteCodePreview(code: string) {
  const validation = await validateInviteCode(code);

  if (!validation.valid) return null;

  const invite = validation.invite!;

  // Get household and inviter details
  const { data } = await db.queryOnce({
    households: {
      $: { where: { id: invite.householdId } }
    },
    users: {
      $: { where: { id: invite.invitedByUserId } }
    }
  });

  return {
    householdName: data.households[0]?.name,
    inviterName: data.users[0]?.name,
    expiresAt: invite.expiresAt
  };
}
