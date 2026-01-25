import { db } from './db';
import 'react-native-get-random-values';
import { v4 as uuidv4 } from 'uuid';

/**
 * Debug function to check splits and transactions state
 */
export async function debugSettlementData(householdId: string, payerUserId: string, receiverUserId: string) {
  console.log('🔍 === DEBUG SETTLEMENT DATA ===');

  // Get all transactions
  const { data: txData } = await db.queryOnce({
    transactions: {
      $: { where: { householdId, isShared: true } }
    }
  });

  const transactions = txData.transactions || [];
  console.log('Shared transactions:', transactions.length);
  transactions.forEach((t: any) => {
    console.log(`  TX ${t.id}: amount=${t.amount}, paidBy=${t.paidByUserId}, category=${t.categoryId}`);
  });

  // Get all splits
  const { data: splitData } = await db.queryOnce({
    shared_expense_splits: {}
  });

  const allSplits = splitData.shared_expense_splits || [];
  console.log('All splits:', allSplits.length);
  allSplits.forEach((s: any) => {
    console.log(`  Split ${s.id}: ower=${s.owerUserId}, owedTo=${s.owedToUserId}, amount=${s.splitAmount}, isPaid=${s.isPaid}, txId=${s.transactionId}`);
  });

  // Filter relevant splits
  const txIds = transactions.map((t: any) => t.id);
  const householdSplits = allSplits.filter((s: any) => txIds.includes(s.transactionId));
  console.log('Household splits:', householdSplits.length);

  const payerSplits = householdSplits.filter((s: any) => s.owerUserId === payerUserId && !s.isPaid);
  console.log('Payer unpaid splits:', payerSplits.length);

  return {
    transactions,
    allSplits,
    householdSplits,
    payerSplits,
    payerUserId,
    receiverUserId
  };
}

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
  console.log('- Payer (member who owes):', payerUserId?.substring(0, 8));
  console.log('- Receiver (admin who paid):', receiverUserId?.substring(0, 8));
  console.log('- Amount:', amount);
  console.log('- Payer Account:', payerAccountId?.substring(0, 8));
  console.log('- Receiver Account:', receiverAccountId?.substring(0, 8));
  console.log('- Household:', householdId?.substring(0, 8));

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

  // Step 4: Mark unpaid splits as paid AND reduce original transaction amounts
  console.log('📊 === STEP 4: Finding splits to settle ===');
  console.log('📊 Settlement params: payerUserId=', payerUserId, 'receiverUserId=', receiverUserId);

  // First, get all shared transactions for this household
  const { data: txData } = await db.queryOnce({
    transactions: {
      $: {
        where: {
          householdId,
          isShared: true,
        },
      },
    },
  });

  const householdTransactions = txData.transactions || [];
  console.log('📊 Found', householdTransactions.length, 'shared transactions in household');
  householdTransactions.forEach((t: any) => {
    console.log(`  - TX ${t.id.substring(0, 8)}: amount=${t.amount}, paidBy=${t.paidByUserId?.substring(0, 8)}, userId=${t.userId?.substring(0, 8)}, date=${t.date}`);
  });

  // Create a map of transaction IDs for quick lookup
  const householdTransactionIds = householdTransactions.map((t: any) => t.id);
  const transactionMap = new Map(householdTransactions.map((t: any) => [t.id, t]));

  // Now get ALL splits (they don't have householdId, so we filter by transactionId)
  const { data: splitData } = await db.queryOnce({
    shared_expense_splits: {},
  });

  const allSplits = splitData.shared_expense_splits || [];
  console.log('📊 Total splits in database:', allSplits.length);
  if (allSplits.length > 0) {
    console.log('📊 First few splits (for debugging):');
    allSplits.slice(0, 5).forEach((s: any) => {
      console.log(`  - Split ${s.id.substring(0, 8)}: txId=${s.transactionId?.substring(0, 8)}, ower=${s.owerUserId?.substring(0, 8)}, owedTo=${s.owedToUserId?.substring(0, 8)}, amount=${s.splitAmount}, isPaid=${s.isPaid}`);
    });
  }

  // Filter to only splits that belong to this household's transactions
  const householdSplits = allSplits.filter((s: any) => householdTransactionIds.includes(s.transactionId));
  console.log('📊 Splits belonging to this household:', householdSplits.length);

  // Find unpaid splits where payer owes money
  const payerUnpaidSplits = householdSplits.filter((s: any) => s.owerUserId === payerUserId && !s.isPaid);
  console.log('📊 Unpaid splits for payer', payerUserId, ':', payerUnpaidSplits.length);

  // Log all splits for debugging
  console.log('📊 All household splits (for debugging):');
  householdSplits.forEach((s: any) => {
    const tx = transactionMap.get(s.transactionId);
    console.log(`  - Split ${s.id}: ower=${s.owerUserId}, owedTo=${s.owedToUserId}, amount=${s.splitAmount}, isPaid=${s.isPaid}, tx.paidBy=${tx?.paidByUserId}`);
  });

  payerUnpaidSplits.forEach((s: any) => {
    const tx = transactionMap.get(s.transactionId);
    console.log(`  - Payer's split ${s.id}: owes ${s.splitAmount} CHF, tx: ${s.transactionId}, paidBy: ${tx?.paidByUserId}, owedTo: ${s.owedToUserId}`);
  });

  // Only settle splits where receiver paid the original expense
  // The split.owedToUserId should match receiverUserId (the admin who paid)
  const splitsToSettle = payerUnpaidSplits.filter((split: any) => {
    const transaction = transactionMap.get(split.transactionId);
    // Use both checks: owedToUserId should match receiver, and transaction.paidByUserId should too
    const owedToMatches = split.owedToUserId === receiverUserId;
    const paidByMatches = transaction?.paidByUserId === receiverUserId;
    const shouldSettle = owedToMatches; // Primary check is owedToUserId
    console.log(`  Checking split ${split.id}: owedTo=${split.owedToUserId}, receiver=${receiverUserId}, owedToMatches=${owedToMatches}, paidBy=${transaction?.paidByUserId}, paidByMatches=${paidByMatches}, settling=${shouldSettle}`);
    return shouldSettle;
  });

  console.log('📊 Splits to mark as paid:', splitsToSettle.length);
  splitsToSettle.forEach((s: any) => {
    console.log(`  - Will settle: ${s.id} for ${s.splitAmount} CHF`);
  });

  // Step 5: Mark splits as paid AND reduce original transaction amounts
  if (splitsToSettle.length > 0) {
    // Group splits by transaction to reduce each transaction amount
    const transactionReductions: { [txId: string]: number } = {};

    for (const split of splitsToSettle) {
      const txId = split.transactionId;
      if (!transactionReductions[txId]) {
        transactionReductions[txId] = 0;
      }
      transactionReductions[txId] += split.splitAmount;
    }

    console.log('📝 Transaction amounts to reduce:', JSON.stringify(transactionReductions));

    // Get fresh transaction data from database (not from potentially stale map)
    const transactionIds = Object.keys(transactionReductions);
    console.log('📝 Transaction IDs to update:', transactionIds);

    const { data: freshTxData } = await db.queryOnce({
      transactions: {
        $: {
          where: {
            householdId,
          },
        },
      },
    });

    const allTransactions = freshTxData.transactions || [];
    const transactionsToUpdate = allTransactions.filter((t: any) => transactionIds.includes(t.id));

    console.log(`📝 Found ${transactionsToUpdate.length} transactions to update out of ${allTransactions.length} total`);
    transactionsToUpdate.forEach((t: any) => {
      const reduction = transactionReductions[t.id];
      console.log(`  - Transaction ${t.id.substring(0, 8)}: userId=${t.userId?.substring(0, 8)}, paidBy=${t.paidByUserId?.substring(0, 8)}, current=${t.amount}, reduction=${reduction}, new=${t.amount - reduction}`);
    });

    // Build all updates: mark splits as paid + reduce transaction amounts
    const splitUpdates: any[] = [];
    const txUpdates: any[] = [];

    // Mark splits as paid
    for (const split of splitsToSettle) {
      console.log(`  📌 Marking split ${split.id} as paid`);
      splitUpdates.push(
        db.tx.shared_expense_splits[split.id].update({
          isPaid: true,
          updatedAt: now,
        })
      );
    }

    // Reduce transaction amounts (original expense - settled amount = payer's portion only)
    for (const tx of transactionsToUpdate) {
      const reductionAmount = transactionReductions[tx.id];
      const newAmount = Math.max(0, tx.amount - reductionAmount); // Ensure non-negative
      console.log(`  📌 Reducing transaction ${tx.id.substring(0, 8)}: ${tx.amount} - ${reductionAmount} = ${newAmount}`);
      console.log(`  📌 Transaction belongs to userId: ${tx.userId?.substring(0, 8)}, paidBy: ${tx.paidByUserId?.substring(0, 8)}`);
      txUpdates.push(
        db.tx.transactions[tx.id].update({
          amount: newAmount,
          updatedAt: now,
        })
      );
    }

    console.log(`📝 Executing ${splitUpdates.length} split updates and ${txUpdates.length} transaction updates...`);

    if (splitUpdates.length > 0 || txUpdates.length > 0) {
      // Execute split updates first
      if (splitUpdates.length > 0) {
        console.log('🔄 Step 1: Updating splits...');
        try {
          await db.transact(splitUpdates);
          console.log('✅ Splits updated successfully');
        } catch (error) {
          console.error('❌ Split updates failed:', error);
          throw error;
        }
      }

      // Then execute transaction updates separately
      if (txUpdates.length > 0) {
        console.log('🔄 Step 2: Updating transactions...');
        try {
          await db.transact(txUpdates);
          console.log('✅ Transaction amounts updated successfully');
        } catch (error) {
          console.error('❌ Transaction updates failed:', error);
          throw error;
        }
      }

      // Update budget spent amounts for the affected transactions
      console.log('💰 Updating budget spent amounts...');
      for (const tx of transactionsToUpdate) {
        const reductionAmount = transactionReductions[tx.id];
        if (tx.type === 'expense' && reductionAmount > 0) {
          try {
            // Import budget functions
            const { updateBudgetSpentAmount, getMemberBudgetPeriod } = await import('./budget-api');

            // Get the transaction owner's budget period
            const budgetPeriod = await getMemberBudgetPeriod(tx.userId, tx.householdId);

            // Check if transaction date falls within this budget period
            if (tx.date >= budgetPeriod.start && tx.date <= budgetPeriod.end) {
              // Get current budget
              const { data: budgetData } = await db.queryOnce({
                budgets: {
                  $: {
                    where: {
                      userId: tx.userId,
                      categoryId: tx.categoryId,
                      periodStart: budgetPeriod.start,
                    },
                  },
                },
              });

              const budget = budgetData.budgets?.[0];
              if (budget) {
                // Reduce the spent amount
                const newSpentAmount = Math.max(0, (budget.spentAmount || 0) - reductionAmount);
                await updateBudgetSpentAmount(tx.userId, tx.categoryId, budgetPeriod.start, newSpentAmount);
                console.log(`  ✓ Budget updated for user ${tx.userId.substring(0, 8)}, category ${tx.categoryId.substring(0, 8)}: ${budget.spentAmount} -> ${newSpentAmount}`);
              }
            }
          } catch (error) {
            console.warn('  ⚠️ Failed to update budget:', error);
            // Don't fail the settlement if budget update fails
          }
        }
      }

      // Verify the updates were persisted
      console.log('🔍 Verifying transaction updates...');
      const { data: verifyData } = await db.queryOnce({
        transactions: {
          $: {
            where: {
              householdId,
            },
          },
        },
      });

      const verifyTransactions = verifyData.transactions || [];
      transactionIds.forEach((txId: string) => {
        const updatedTx = verifyTransactions.find((t: any) => t.id === txId);
        if (updatedTx) {
          console.log(`  ✓ Transaction ${txId.substring(0, 8)} now shows amount: ${updatedTx.amount} CHF`);
        } else {
          console.log(`  ✗ Transaction ${txId} not found in verification query!`);
        }
      });
    } else {
      console.log('⚠️ No updates to execute');
    }
  } else {
    console.log('⚠️ No splits found to settle - check if splits exist and are unpaid');
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
