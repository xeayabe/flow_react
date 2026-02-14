// US-074: Transfer Between Own Accounts
// Transfers money between user's own accounts WITHOUT creating transactions.
// Budget and analytics remain completely untouched.

import { db } from './db';
import 'react-native-get-random-values';
import { v4 as uuidv4 } from 'uuid';
import { logger } from './logger';

export interface TransferData {
  userId: string;
  householdId: string;
  fromAccountId: string;
  toAccountId: string;
  amount: number;
  note?: string;
}

export interface TransferRecord {
  id: string;
  userId: string;
  householdId: string;
  fromAccountId: string;
  toAccountId: string;
  amount: number;
  note?: string;
  transferredAt: number;
  createdAt: number;
}

export interface TransferResult {
  transferId: string;
  amount: number;
  newFromBalance: number;
  newToBalance: number;
}

/**
 * Validate transfer data before executing.
 * Returns an error message string if invalid, or null if valid.
 */
export function validateTransfer(
  amount: number,
  fromAccountId: string,
  toAccountId: string,
  fromAccountBalance: number
): string | null {
  if (amount <= 0) {
    return 'Transfer amount must be greater than CHF 0.00';
  }

  if (fromAccountId === toAccountId) {
    return 'Source and destination wallets must be different';
  }

  if (amount > fromAccountBalance) {
    return 'Insufficient funds in source wallet';
  }

  return null;
}

/**
 * Create an atomic transfer between two accounts owned by the same user.
 *
 * This follows the settlement-api.ts atomic pattern:
 * 1. Gather data and validate
 * 2. Build ALL operations for a single db.transact()
 * 3. Execute atomically (all-or-nothing)
 *
 * IMPORTANT: Does NOT create a transaction — budget and analytics stay untouched.
 */
export async function createTransfer(data: TransferData): Promise<TransferResult> {
  logger.debug('=== TRANSFER START (ATOMIC) ===');

  const { userId, householdId, fromAccountId, toAccountId, amount, note } = data;

  // Null safety for amount
  const safeAmount = amount ?? 0;
  if (safeAmount <= 0) {
    throw new Error('Transfer amount must be greater than 0');
  }

  if (fromAccountId === toAccountId) {
    throw new Error('Cannot transfer to the same account');
  }

  // ===================================================================
  // PHASE 1: Gather data and validate ownership
  // ===================================================================

  const { data: fromAccountData } = await db.queryOnce({
    accounts: {
      $: { where: { id: fromAccountId } },
    },
  });

  const { data: toAccountData } = await db.queryOnce({
    accounts: {
      $: { where: { id: toAccountId } },
    },
  });

  const fromAccount = fromAccountData.accounts?.[0];
  const toAccount = toAccountData.accounts?.[0];

  if (!fromAccount || !toAccount) {
    throw new Error('Account not found');
  }

  // Verify both accounts belong to the same user (privacy-first)
  if (fromAccount.userId !== userId) {
    throw new Error('Source account does not belong to user');
  }
  if (toAccount.userId !== userId) {
    throw new Error('Destination account does not belong to user');
  }

  // Null safety for balances
  const fromBalance = fromAccount.balance ?? 0;
  const toBalance = toAccount.balance ?? 0;

  // Check sufficient funds
  if (safeAmount > fromBalance) {
    throw new Error('Insufficient funds in source wallet');
  }

  // Calculate new balances
  const newFromBalance = fromBalance - safeAmount;
  const newToBalance = toBalance + safeAmount;

  // ===================================================================
  // PHASE 2: Build ALL operations for a SINGLE atomic db.transact()
  // ===================================================================

  const transferId = uuidv4();
  const now = Date.now();
  const atomicOps: any[] = [];

  // Op 1: Decrease source account balance
  atomicOps.push(
    db.tx.accounts[fromAccountId].update({
      balance: newFromBalance,
    })
  );

  // Op 2: Increase destination account balance
  atomicOps.push(
    db.tx.accounts[toAccountId].update({
      balance: newToBalance,
    })
  );

  // Op 3: Create immutable audit record
  atomicOps.push(
    db.tx.accountTransfers[transferId].update({
      userId,
      householdId,
      fromAccountId,
      toAccountId,
      amount: safeAmount,
      note: note || undefined,
      transferredAt: now,
      createdAt: now,
    })
  );

  // ===================================================================
  // PHASE 3: Execute atomically (all-or-nothing)
  // ===================================================================

  logger.debug(`Executing ${atomicOps.length} operations in single atomic transaction`);
  await db.transact(atomicOps);
  logger.debug('Atomic transfer committed successfully');

  logger.debug('=== TRANSFER COMPLETE ===');

  return {
    transferId,
    amount: safeAmount,
    newFromBalance,
    newToBalance,
  };
}

/**
 * Get transfer history for a specific account.
 * Returns transfers where account was either source or destination.
 */
export async function getTransferHistoryForAccount(
  accountId: string,
  userId: string
): Promise<TransferRecord[]> {
  try {
    // Fetch outgoing transfers (from this account)
    const { data: outgoingData } = await db.queryOnce({
      accountTransfers: {
        $: { where: { fromAccountId: accountId, userId } },
      },
    });

    // Fetch incoming transfers (to this account)
    const { data: incomingData } = await db.queryOnce({
      accountTransfers: {
        $: { where: { toAccountId: accountId, userId } },
      },
    });

    // Combine and deduplicate
    const allTransfers = [
      ...(outgoingData.accountTransfers || []),
      ...(incomingData.accountTransfers || []),
    ];

    const seenIds = new Set<string>();
    const unique = allTransfers.filter((t: any) => {
      if (seenIds.has(t.id)) return false;
      seenIds.add(t.id);
      return true;
    });

    // Sort by transferredAt descending (newest first)
    unique.sort((a: any, b: any) => (b.transferredAt ?? 0) - (a.transferredAt ?? 0));

    return unique as TransferRecord[];
  } catch (error) {
    logger.error('Get transfer history error:', error);
    return [];
  }
}

/**
 * Check if an account has had any transfers after a given date.
 * Used to warn users when editing transactions that pre-date a transfer.
 */
export async function getTransfersAfterDate(
  accountId: string,
  userId: string,
  afterDateISO: string
): Promise<{ hasTransfers: boolean; latestTransferDate: string | null }> {
  try {
    const transfers = await getTransferHistoryForAccount(accountId, userId);

    // Convert afterDate to timestamp (start of that day)
    const afterTimestamp = new Date(afterDateISO + 'T00:00:00').getTime();

    const transfersAfter = transfers.filter(
      (t) => (t.transferredAt ?? 0) > afterTimestamp
    );

    if (transfersAfter.length === 0) {
      return { hasTransfers: false, latestTransferDate: null };
    }

    // Format the latest transfer date for display
    const latest = transfersAfter[0];
    const dateStr = new Date(latest.transferredAt).toLocaleDateString('de-CH', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });

    return { hasTransfers: true, latestTransferDate: dateStr };
  } catch (error) {
    logger.error('Check transfers after date error:', error);
    return { hasTransfers: false, latestTransferDate: null };
  }
}

/**
 * Get all transfers for a user.
 */
export async function getUserTransfers(userId: string): Promise<TransferRecord[]> {
  try {
    const { data } = await db.queryOnce({
      accountTransfers: {
        $: { where: { userId } },
      },
    });

    const transfers = (data.accountTransfers || []) as TransferRecord[];

    // Sort by transferredAt descending
    transfers.sort((a, b) => (b.transferredAt ?? 0) - (a.transferredAt ?? 0));

    return transfers;
  } catch (error) {
    logger.error('Get user transfers error:', error);
    return [];
  }
}
