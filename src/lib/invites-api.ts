import { db } from './db';
import { v4 as uuidv4 } from 'uuid';

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
    updatedAt: Date.now()
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
        updatedAt: Date.now()
      })
    ]);
    return { valid: false, error: 'Code expired' };
  }

  return { valid: true, invite };
}

// Accept invite code (after signup)
export async function acceptInviteCode(code: string, newUserId: string) {
  const validation = await validateInviteCode(code);

  if (!validation.valid) {
    throw new Error(validation.error);
  }

  const invite = validation.invite!;

  // Check household member limit (max 2)
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

  if (data.householdMembers.length >= 2) {
    throw new Error('Household is full (max 2 members)');
  }

  // Add user to household
  const memberId = uuidv4();
  await db.transact([
    db.tx.household_invites[invite.id].update({
      status: 'accepted',
      acceptedByUserId: newUserId,
      acceptedAt: Date.now(),
      updatedAt: Date.now()
    }),
    db.tx.householdMembers[memberId].update({
      householdId: invite.householdId,
      userId: newUserId,
      role: 'member',
      status: 'active',
      joinedAt: Date.now()
    })
  ]);

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
