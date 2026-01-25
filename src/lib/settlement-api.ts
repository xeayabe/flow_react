import { db } from './db';
import 'react-native-get-random-values';
import { v4 as uuidv4 } from 'uuid';

/**
 * Settle debt via internal account transfer
 * Does NOT create a transaction (to avoid affecting budgets)
 * Only transfers money between accounts and marks splits as paid
 */
export async function createSettlement(
  payerUserId: string,
  receiverUserId: string,
  amount: number,
  payerAccountId: string,
  receiverAccountId: string,
  householdId: string
) {
  console.log('💳 === SETTLEMENT START (INTERNAL TRANSFER) ===');
  console.log('- Payer:', payerUserId);
  console.log('- Receiver:', receiverUserId);
  console.log('- Amount:', amount);
  console.log('- Payer Account:', payerAccountId);
  console.log('- Receiver Account:', receiverAccountId);

  const settlementId = uuidv4();
  const now = Date.now();

  // Step 1: Get current account balances
  console.log('💰 Fetching account balances...');
  const { data: accountData } = await db.queryOnce({
    accounts: {},
  });

  const payerAccount = accountData.accounts?.find((a: any) => a.id === payerAccountId);
  const receiverAccount = accountData.accounts?.find((a: any) => a.id === receiverAccountId);

  if (!payerAccount || !receiverAccount) {
    throw new Error('Account not found');
  }

  console.log('💰 Current balances:');
  console.log('  Payer:', payerAccount.balance);
  console.log('  Receiver:', receiverAccount.balance);

  // Step 2: Update account balances (internal transfer)
  const newPayerBalance = (payerAccount.balance || 0) - amount;
  const newReceiverBalance = (receiverAccount.balance || 0) + amount;

  console.log('💰 Updating account balances (internal transfer)...');
  await db.transact([
    db.tx.accounts[payerAccountId].update({
      balance: newPayerBalance,
      updatedAt: now,
    }),
    db.tx.accounts[receiverAccountId].update({
      balance: newReceiverBalance,
      updatedAt: now,
    }),
  ]);

  console.log('💰 New balances:');
  console.log('  Payer:', newPayerBalance);
  console.log('  Receiver:', newReceiverBalance);

  // Step 3: Log settlement in settlements table (for history only)
  console.log('📝 Logging settlement in settlements table...');
  await db.transact([
    db.tx.settlements[settlementId].update({
      householdId,
      payerUserId,
      receiverUserId,
      amount,
      payerAccountId,
      receiverAccountId,
      note: `Debt settlement: ${amount.toFixed(2)} CHF`,
      settledAt: now,
      createdAt: now,
    }),
  ]);

  console.log('📝 Settlement logged:', settlementId);

  // Step 4: Mark unpaid splits as paid
  console.log('📊 Marking splits as paid...');
  const { data: splitData } = await db.queryOnce({
    shared_expense_splits: {},
    transactions: {
      $: {
        where: {
          householdId,
          isShared: true,
        },
      },
    },
  });

  console.log('📊 Total splits in household:', splitData.shared_expense_splits?.length || 0);
  console.log('📊 Total transactions in household:', splitData.transactions?.length || 0);

  // Find unpaid splits where payer owes money
  const payerUnpaidSplits = (splitData.shared_expense_splits || []).filter((s: any) => s.owerUserId === payerUserId && !s.isPaid);

  console.log('📊 Unpaid splits for payer:', payerUnpaidSplits.length);
  payerUnpaidSplits.forEach((s: any) => {
    console.log(`  - Split ${s.id}: owes ${s.splitAmount} CHF, transaction: ${s.transactionId}`);
  });

  // Only settle splits where receiver paid the original expense
  const splitsToSettle = payerUnpaidSplits.filter((split: any) => {
    const transaction = (splitData.transactions || []).find((t: any) => t.id === split.transactionId);
    const shouldSettle = transaction?.paidByUserId === receiverUserId;
    console.log(`  Split ${split.id}: tx=${split.transactionId}, paidBy=${transaction?.paidByUserId}, receiver=${receiverUserId}, matches=${shouldSettle}, amount=${split.splitAmount}`);
    return shouldSettle;
  });

  console.log('📊 Splits to mark as paid:', splitsToSettle.length);
  splitsToSettle.forEach((s: any) => {
    console.log(`  - Will settle: ${s.id} for ${s.splitAmount} CHF`);
  });

  // Step 5: Mark splits as paid AND reduce original transaction amounts
  if (splitsToSettle.length > 0) {
    // Group splits by transaction to reduce each transaction amount
    const transactionUpdates: { [txId: string]: number } = {};

    for (const split of splitsToSettle) {
      const txId = split.transactionId;
      if (!transactionUpdates[txId]) {
        transactionUpdates[txId] = 0;
      }
      transactionUpdates[txId] += split.splitAmount;
    }

    console.log('📝 Transaction amounts to reduce:', transactionUpdates);

    // Get current transaction amounts
    const transactionIds = Object.keys(transactionUpdates);
    const transactionsToUpdate = (splitData.transactions || []).filter((t: any) => transactionIds.includes(t.id));

    console.log(`📝 Found ${transactionsToUpdate.length} transactions to update (from ${transactionIds.length} transaction IDs)`);
    transactionsToUpdate.forEach((t: any) => {
      console.log(`  - Transaction ${t.id}: current amount=${t.amount}, category=${t.category}`);
    });

    // Build all updates: mark splits as paid + reduce transaction amounts
    const allUpdates: any[] = [];

    // Mark splits as paid
    for (const split of splitsToSettle) {
      console.log(`  Marking split ${split.id} as paid (amount: ${split.splitAmount})`);
      allUpdates.push(
        db.tx.shared_expense_splits[split.id].update({
          isPaid: true,
          updatedAt: now,
        })
      );
    }

    // Reduce transaction amounts (original expense - settled amount = payer's portion only)
    for (const tx of transactionsToUpdate) {
      const reductionAmount = transactionUpdates[tx.id];
      const newAmount = tx.amount - reductionAmount;
      console.log(`  Reducing transaction ${tx.id}: ${tx.amount} - ${reductionAmount} = ${newAmount}`);
      allUpdates.push(
        db.tx.transactions[tx.id].update({
          amount: newAmount,
          updatedAt: now,
        })
      );
    }

    console.log(`📝 About to execute ${allUpdates.length} updates in transact()`);
    await db.transact(allUpdates);
    console.log('✅ All splits marked as paid and transaction amounts reduced');
  } else {
    console.log('⚠️ No splits found to settle');
  }

  console.log('💳 === SETTLEMENT COMPLETE ===');

  return {
    settlementId,
    amount,
    newPayerBalance,
    newReceiverBalance,
    splitsSettled: splitsToSettle.length,
  };
}

/**
 * Get settlement history for household
 */
export async function getSettlementHistory(householdId: string) {
  try {
    const { data } = await db.queryOnce({
      settlements: {
        $: {
          where: { householdId },
        },
      },
      users: {},
    });

    const settlements = data.settlements || [];
    const users = data.users || [];

    return settlements.map((settlement: any) => {
      const payer = users.find((u: any) => u.id === settlement.payerUserId);
      const receiver = users.find((u: any) => u.id === settlement.receiverUserId);
      return {
        ...settlement,
        payerName: payer?.name || 'Unknown',
        receiverName: receiver?.name || 'Unknown',
      };
    });
  } catch (error) {
    console.error('Get settlement history error:', error);
    return [];
  }
}

/**
 * Cleanup old settlement transactions that were created by the previous approach
 * This should be run once to remove legacy settlement transactions from the transactions table
 */
export async function cleanupOldSettlementTransactions(householdId: string) {
  console.log('🧹 === CLEANUP OLD SETTLEMENT TRANSACTIONS ===');

  const { data } = await db.queryOnce({
    transactions: {
      $: {
        where: { householdId },
      },
    },
  });

  // Find transactions with type='settlement' (old approach)
  const settlementTransactions = (data.transactions || []).filter((tx: any) => tx.type === 'settlement');

  console.log(`Found ${settlementTransactions.length} old settlement transactions to delete`);

  if (settlementTransactions.length > 0) {
    await db.transact(settlementTransactions.map((tx: any) => db.tx.transactions[tx.id].delete()));
    console.log('✅ Old settlement transactions deleted');
  }

  console.log('🧹 === CLEANUP COMPLETE ===');

  return {
    deleted: settlementTransactions.length,
  };
}
