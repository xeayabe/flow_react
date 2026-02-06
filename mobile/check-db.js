// Quick script to check database state
require('dotenv').config();
const { init } = require('@instantdb/admin');

const APP_ID = process.env.EXPO_PUBLIC_INSTANTDB_APP_ID;
const ADMIN_TOKEN = process.env.INSTANTDB_ADMIN_TOKEN;

console.log('APP_ID:', APP_ID ? 'Found' : 'Missing');
console.log('ADMIN_TOKEN:', ADMIN_TOKEN ? 'Found' : 'Missing');

const db = init({ appId: APP_ID, adminToken: ADMIN_TOKEN });

async function checkDB() {
  try {
    console.log('Checking transactions...');
    const txResult = await db.query({
      transactions: {
        $: {
          where: { isShared: true },
          limit: 10
        }
      }
    });

    console.log('\n=== TRANSACTIONS ===');
    const transactions = txResult.transactions || [];
    transactions.forEach(t => {
      console.log(`TX ${t.id.substring(0, 8)}: amount=${t.amount}, paidBy=${t.paidByUserId?.substring(0, 8)}, userId=${t.userId?.substring(0, 8)}, isShared=${t.isShared}`);
    });

    console.log('\n=== SPLITS ===');
    const splitResult = await db.query({
      shared_expense_splits: {}
    });

    const splits = splitResult.shared_expense_splits || [];
    splits.forEach(s => {
      console.log(`Split ${s.id.substring(0, 8)}: txId=${s.transactionId?.substring(0, 8)}, ower=${s.owerUserId?.substring(0, 8)}, owedTo=${s.owedToUserId?.substring(0, 8)}, amount=${s.splitAmount}, isPaid=${s.isPaid}`);
    });

    console.log('\nTotal transactions:', transactions.length);
    console.log('Total splits:', splits.length);
  } catch (error) {
    console.error('Error:', error);
  }
}

checkDB();
