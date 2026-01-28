import { db } from './db';
import 'react-native-get-random-values';
import { v4 as uuidv4 } from 'uuid';

/**
 * Unsettled shared expense with details
 */
export interface UnsettledExpense {
  id: string;
  transactionId: string;
  date: string;
  category: string;
  categoryId: string;
  totalAmount: number;
  yourShare: number;
  paidBy: string;
  paidByUserId: string;
  description: string;
  splitId: string;
  createdByUserId: string; // NEW: Track who created the transaction for privacy
}

/**
 * Summary of debt between household members
 */
export interface DebtSummary {
  amount: number; // positive = you owe, negative = you're owed
  otherMemberId: string;
  otherMemberName: string;
  otherMemberEmail: string;
}

/**
 * Get ALL unsettled shared expenses for the current user in a household
 */
export async function getUnsettledSharedExpenses(
  householdId: string,
  currentUserId: string
): Promise<UnsettledExpense[]> {
  console.log('=== getUnsettledSharedExpenses START ===');
  console.log('Household ID:', householdId);
  console.log('Current User ID:', currentUserId);

  // Get all shared transactions for this household
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

  const allTransactions = txData.transactions || [];
  // Filter out transactions that are already settled
  const transactions = allTransactions.filter((t: any) => !t.settled);
  console.log('Found shared transactions:', transactions.length, '(filtered', allTransactions.length - transactions.length, 'settled)');

  if (transactions.length === 0) {
    console.log('No shared transactions found');
    return [];
  }

  // Get all splits
  const { data: splitData } = await db.queryOnce({
    shared_expense_splits: {},
  });

  const allSplits = splitData.shared_expense_splits || [];
  console.log('Total splits in DB:', allSplits.length);

  // Create transaction map for quick lookup
  const transactionMap = new Map(transactions.map((t: any) => [t.id, t]));
  const transactionIds = transactions.map((t: any) => t.id);

  // Filter splits for this household's transactions
  const householdSplits = allSplits.filter((s: any) => transactionIds.includes(s.transactionId));
  console.log('Household splits:', householdSplits.length);

  // Get categories for display
  const { data: categoryData } = await db.queryOnce({
    categories: {
      $: { where: { householdId } },
    },
  });
  const categories = categoryData.categories || [];
  const categoryMap = new Map(categories.map((c: any) => [c.id, c]));

  // Get users for display
  const { data: userData } = await db.queryOnce({
    users: {},
  });
  const users = userData.users || [];
  const userMap = new Map(users.map((u: any) => [u.id, u]));

  // Find unpaid splits where current user owes money OR is owed money
  const unsettledExpenses: UnsettledExpense[] = [];

  for (const split of householdSplits) {
    if (split.isPaid) continue; // Skip settled splits

    const transaction = transactionMap.get(split.transactionId);
    if (!transaction) continue;

    // Check if current user is involved in this split
    const currentUserOwes = split.owerUserId === currentUserId;
    const currentUserIsOwed = split.owedToUserId === currentUserId;

    if (!currentUserOwes && !currentUserIsOwed) continue;

    const category = categoryMap.get(transaction.categoryId);
    const paidByUser = userMap.get(transaction.paidByUserId);

    unsettledExpenses.push({
      id: split.id,
      transactionId: transaction.id,
      splitId: split.id,
      date: transaction.date,
      category: category?.name || 'Unknown',
      categoryId: transaction.categoryId,
      totalAmount: transaction.amount,
      yourShare: currentUserOwes ? split.splitAmount : -split.splitAmount, // positive = you owe, negative = you're owed
      paidBy: paidByUser?.name || paidByUser?.email?.split('@')[0] || 'Unknown',
      paidByUserId: transaction.paidByUserId,
      description: transaction.note || transaction.payee || category?.name || 'Shared expense',
      createdByUserId: transaction.userId, // Track who created the transaction
    });
  }

  // Sort by date (newest first)
  unsettledExpenses.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  console.log('Unsettled expenses for user:', unsettledExpenses.length);
  console.log('=== getUnsettledSharedExpenses END ===');

  return unsettledExpenses;
}

/**
 * Calculate total household debt between current user and other member
 */
export async function calculateHouseholdDebt(
  householdId: string,
  currentUserId: string
): Promise<DebtSummary | null> {
  console.log('=== calculateHouseholdDebt START ===');
  console.log('Household ID:', householdId);
  console.log('Current User ID:', currentUserId);

  // Get other household member
  const { data: memberData } = await db.queryOnce({
    householdMembers: {
      $: { where: { householdId, status: 'active' } },
    },
  });

  const members = memberData.householdMembers || [];
  const otherMember = members.find((m: any) => m.userId !== currentUserId);

  if (!otherMember) {
    console.log('No other member found in household');
    return null;
  }

  const otherUserId = otherMember.userId;
  console.log('Other member ID:', otherUserId);

  // Get other member's user details
  const { data: userData } = await db.queryOnce({
    users: {
      $: { where: { id: otherUserId } },
    },
  });

  const otherUser = userData.users?.[0];

  // Get all unsettled expenses
  const unsettledExpenses = await getUnsettledSharedExpenses(householdId, currentUserId);

  // Calculate net debt
  // yourShare positive = you owe, yourShare negative = you're owed
  let totalDebt = 0;
  for (const expense of unsettledExpenses) {
    totalDebt += expense.yourShare;
  }

  // Round to 2 decimal places
  totalDebt = Math.round(totalDebt * 100) / 100;

  console.log('Total debt:', totalDebt, '(positive = you owe, negative = you are owed)');
  console.log('=== calculateHouseholdDebt END ===');

  return {
    amount: totalDebt,
    otherMemberId: otherUserId,
    otherMemberName: otherUser?.name || otherUser?.email?.split('@')[0] || 'Unknown',
    otherMemberEmail: otherUser?.email || '',
  };
}

/**
 * Get all unsettled expenses grouped by who owes whom
 */
export async function getUnsettledExpensesByDirection(
  householdId: string,
  currentUserId: string
): Promise<{
  youOwe: UnsettledExpense[];
  youAreOwed: UnsettledExpense[];
  totalYouOwe: number;
  totalYouAreOwed: number;
  netDebt: number;
}> {
  const allExpenses = await getUnsettledSharedExpenses(householdId, currentUserId);

  const youOwe = allExpenses.filter((e) => e.yourShare > 0);
  const youAreOwed = allExpenses.filter((e) => e.yourShare < 0);

  const totalYouOwe = youOwe.reduce((sum, e) => sum + e.yourShare, 0);
  const totalYouAreOwed = Math.abs(youAreOwed.reduce((sum, e) => sum + e.yourShare, 0));
  const netDebt = totalYouOwe - totalYouAreOwed;

  return {
    youOwe,
    youAreOwed,
    totalYouOwe: Math.round(totalYouOwe * 100) / 100,
    totalYouAreOwed: Math.round(totalYouAreOwed * 100) / 100,
    netDebt: Math.round(netDebt * 100) / 100,
  };
}

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
  householdId: string,
  categoryId?: string
) {
  console.warn('🚨🚨🚨 SETTLEMENT FUNCTION CALLED 🚨🚨🚨');
  console.log('💳 === SETTLEMENT START (INTERNAL TRANSFER) ===');
  console.log('- Payer (member who owes):', payerUserId?.substring(0, 8));
  console.log('- Receiver (admin who paid):', receiverUserId?.substring(0, 8));
  console.log('- Amount:', amount);
  console.log('- Payer Account:', payerAccountId?.substring(0, 8));
  console.log('- Receiver Account:', receiverAccountId?.substring(0, 8));
  console.log('- Household:', householdId?.substring(0, 8));
  console.log('- Category:', categoryId?.substring(0, 8) || 'None');

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
    }),
    db.tx.accounts[receiverAccountId].update({
      balance: newReceiverBalance,
    }),
  ]);

  console.log('💰 New balances:');
  console.log('  Payer:', newPayerBalance);
  console.log('  Receiver:', newReceiverBalance);

  // Step 3: Log settlement in settlements table (for history only)
  console.log('📝 Logging settlement in settlements table...');

  // Collect transaction IDs that will be settled (will be populated after we process splits)
  const settledTransactionIds: string[] = [];

  await db.transact([
    db.tx.settlements[settlementId].update({
      householdId,
      payerUserId,
      receiverUserId,
      amount,
      paymentMethod: 'internal_transfer', // Internal account transfer
      categoryId: categoryId || undefined,
      note: `Debt settlement: ${amount.toFixed(2)} CHF`,
      settledExpenses: [], // Will be updated later with actual transaction IDs
      settledAt: now,
      createdAt: now,
    }),
  ]);

  console.log('📝 Settlement logged:', settlementId);

  // Step 3b: Create a transaction for the payer (member) showing their settlement payment
  // This allows the member to see their payment in their transaction list
  const payerTransactionId = uuidv4();
  const todayDate = new Date().toISOString().split('T')[0]; // YYYY-MM-DD format

  console.log('📝 Creating settlement transaction for payer...');
  console.log('  - Transaction ID:', payerTransactionId);
  console.log('  - Amount:', amount);
  console.log('  - Category ID:', categoryId || 'None');

  // Only create transaction if we have a valid categoryId
  if (categoryId) {
    await db.transact([
      db.tx.transactions[payerTransactionId].update({
        userId: payerUserId,
        householdId,
        accountId: payerAccountId,
        categoryId: categoryId, // Use the selected category
        type: 'expense',
        amount: amount, // The member's payment amount (e.g., 38.6 CHF)
        date: todayDate,
        note: `Debt settlement - paid to household`,
        isShared: false, // Not shared - this is the member's individual payment
        paidByUserId: payerUserId, // Member paid this
      }),
    ]);
    console.log('📝 Payer transaction created:', payerTransactionId);
  } else {
    console.log('⚠️ No category selected, skipping payer transaction creation');
  }

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
    console.log(`  - Will settle: ${s.id} for ${s.splitAmount} CHF, txId: ${s.transactionId}`);
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
    console.log('📝 Looking for transaction IDs:', transactionIds);
    console.log('📝 Available transaction IDs in DB:', allTransactions.map((t: any) => t.id));
    transactionsToUpdate.forEach((t: any) => {
      const reduction = transactionReductions[t.id];
      console.log(`  - Transaction ${t.id.substring(0, 8)}: userId=${t.userId?.substring(0, 8)}, paidBy=${t.paidByUserId?.substring(0, 8)}, current=${t.amount}, reduction=${reduction}, new=${t.amount - reduction}`);
    });

    // Build all updates: mark splits as paid + reduce transaction amounts
    console.log(`📝 Executing ${splitsToSettle.length} split updates and ${transactionsToUpdate.length} transaction updates...`);

    if (splitsToSettle.length > 0 || transactionsToUpdate.length > 0) {
      // Execute split updates first
      if (splitsToSettle.length > 0) {
        console.log('🔄 Step 1: Updating splits...');
        try {
          await db.transact(
            splitsToSettle.map(split =>
              db.tx.shared_expense_splits[split.id].update({
                isPaid: true,
              })
            )
          );
          console.log('✅ Splits updated successfully');
        } catch (error) {
          console.error('❌ Split updates failed:', error);
          throw error;
        }
      }

      // Then execute transaction updates separately
      if (transactionsToUpdate.length > 0) {
        console.log('🔄 Step 2: Updating transactions (amount + settlement tracking)...');
        try {
          // Collect transaction IDs for settlement record
          const settledTxIds = transactionsToUpdate.map((t: any) => t.id);

          await db.transact(
            transactionsToUpdate.map(tx => {
              const reductionAmount = transactionReductions[tx.id];
              const newAmount = Math.max(0, tx.amount - reductionAmount);
              console.log(`  📌 Updating ${tx.id.substring(0, 8)}: ${tx.amount} -> ${newAmount}, settled=true`);
              return db.tx.transactions[tx.id].update({
                amount: newAmount,
                settled: true,
                settledAt: now,
                settlementId: settlementId,
              });
            })
          );
          console.log('✅ Transaction amounts updated and marked as settled');

          // Update settlement record with settled transaction IDs
          console.log('🔄 Step 2b: Updating settlement record with transaction IDs...');
          await db.transact([
            db.tx.settlements[settlementId].update({
              settledExpenses: settledTxIds,
            }),
          ]);
          console.log('✅ Settlement record updated with', settledTxIds.length, 'transaction IDs');
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
                      isActive: true,
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
