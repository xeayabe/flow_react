import { db } from './db';
import { v4 as uuidv4 } from 'uuid';
import Constants from 'expo-constants';

export async function createInvite(userId: string, householdId: string) {
  const inviteToken = uuidv4().replace(/-/g, '').substring(0, 16);
  const expiresAt = Date.now() + 7 * 24 * 60 * 60 * 1000; // 7 days

  const invite = {
    id: uuidv4(),
    householdId,
    invitedByUserId: userId,
    inviteToken,
    status: 'pending',
    expiresAt,
    createdAt: Date.now(),
    updatedAt: Date.now()
  };

  await db.transact([
    db.tx.household_invites[invite.id].update(invite)
  ]);

  // Generate invite link
  const devUrl = Constants.expoConfig?.hostUri
    ? `exp://${Constants.expoConfig.hostUri}`
    : 'exp://192.168.1.1:8081';

  const inviteLink = `${devUrl}/--/signup?invite=${inviteToken}`;

  return { invite, inviteLink };
}

export async function getInviteByToken(token: string) {
  const { data } = await db.queryOnce({
    household_invites: {
      $: {
        where: {
          inviteToken: token,
          status: 'pending'
        }
      }
    }
  });

  const invite = data.household_invites[0];

  if (!invite) return null;

  // Check if expired
  if (invite.expiresAt < Date.now()) {
    await db.transact([
      db.tx.household_invites[invite.id].update({
        status: 'expired',
        updatedAt: Date.now()
      })
    ]);
    return null;
  }

  return invite;
}

export async function acceptInvite(inviteToken: string, newUserId: string) {
  const invite = await getInviteByToken(inviteToken);

  if (!invite) {
    throw new Error('Invalid or expired invite');
  }

  // Check if household is full
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

  // Accept invite and add member
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

export async function getInvitePreview(token: string) {
  const invite = await getInviteByToken(token);

  if (!invite) return null;

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
