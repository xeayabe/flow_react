import { db } from './db';
import 'react-native-get-random-values';
import { v4 as uuidv4 } from 'uuid';

/**
 * Create settlement transaction and mark splits as paid
 */
export async function createSettlement(
  payerUserId: string, // Who is paying (e.g., Cecilia)
  receiverUserId: string, // Who receives (e.g., Alexander)
  amount: number,
  payerAccountId: string, // Account to debit
  receiverAccountId: string, // Account to credit
  householdId: string
) {
  console.log('💳 Creating settlement:');
  console.log('- Payer:', payerUserId);
  console.log('- Receiver:', receiverUserId);
  console.log('- Amount:', amount);
  console.log('- Household:', householdId);

  const settlementId = uuidv4();
  const now = Date.now();

  // Step 1: Create settlement transaction
  console.log('📝 Creating settlement transaction...');
  await db.transact([
    db.tx.transactions[settlementId].update({
      userId: payerUserId,
      householdId: householdId,
      accountId: payerAccountId,
      categoryId: '', // No category for settlements
      type: 'settlement', // Special type
      amount: amount,
      date: new Date().toISOString().split('T')[0], // YYYY-MM-DD format
      note: `Debt settlement: ${amount.toFixed(2)} CHF to ${receiverUserId}`,
      isShared: false, // Settlement is not a shared expense
      paidByUserId: payerUserId,
      isRecurring: false,
      createdAt: now,
      updatedAt: now,
    }),
  ]);

  console.log('💳 Settlement transaction created:', settlementId);

  // Step 2: Get account data and update balances
  console.log('💰 Updating account balances...');
  const { data: accountData } = await db.queryOnce({
    accounts: {},
  });

  const payerAccount = accountData.accounts?.find((a: any) => a.id === payerAccountId);
  const receiverAccount = accountData.accounts?.find((a: any) => a.id === receiverAccountId);

  if (!payerAccount || !receiverAccount) {
    throw new Error('Account not found');
  }

  await db.transact([
    // Debit payer's account
    db.tx.accounts[payerAccountId].update({
      balance: (payerAccount.balance || 0) - amount,
      updatedAt: now,
    }),
    // Credit receiver's account
    db.tx.accounts[receiverAccountId].update({
      balance: (receiverAccount.balance || 0) + amount,
      updatedAt: now,
    }),
  ]);

  console.log('💰 Account balances updated');
  console.log('  Payer new balance:', (payerAccount.balance || 0) - amount);
  console.log('  Receiver new balance:', (receiverAccount.balance || 0) + amount);

  // Step 3: Mark unpaid splits as paid
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

  // Filter splits where:
  // - Payer owes money (owerUserId === payerUserId)
  // - Receiver was paid (owedToUserId === receiverUserId)
  // - Not yet paid (isPaid === false)
  const splitsToSettle = (splitData.shared_expense_splits || []).filter((split: any) => {
    return split.owerUserId === payerUserId && split.owedToUserId === receiverUserId && !split.isPaid;
  });

  console.log('📊 Splits to settle:', splitsToSettle.length);
  splitsToSettle.forEach((split: any) => {
    console.log('  - Split:', split.id, 'Amount:', split.splitAmount);
  });

  if (splitsToSettle.length > 0) {
    await db.transact(
      splitsToSettle.map((split: any) =>
        db.tx.shared_expense_splits[split.id].update({
          isPaid: true,
          updatedAt: now,
        })
      )
    );
  }

  console.log('✅ Settlement complete');

  return {
    settlementId,
    transactionId: settlementId,
    amount,
    splitsSettled: splitsToSettle.length,
  };
}
