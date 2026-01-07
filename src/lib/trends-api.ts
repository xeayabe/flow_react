import { db } from './db';

export interface MonthlySummary {
  month: string; // YYYY-MM format
  monthLabel: string; // "Jan 2025" format
  income: number;
  expenses: number;
  net: number;
  savingsRate: number; // percentage 0-100
}

export interface TrendsSummary {
  data: MonthlySummary[];
  avgIncome: number;
  avgExpenses: number;
  avgNet: number;
  avgSavingsRate: number;
  bestMonth: MonthlySummary | null;
  worstMonth: MonthlySummary | null;
}

export async function getTrendData(
  userId: string,
  householdId: string,
  months: number = 6
): Promise<TrendsSummary> {
  try {
    // Get transactions for the user in household
    const transactionsResult = await db.queryOnce({
      transactions: {
        $: {
          where: {
            userId,
            householdId,
          },
        },
      },
    });

    const transactions = transactionsResult.data.transactions || [];

    // Calculate date range (last N months)
    const today = new Date();
    const startDate = new Date();
    startDate.setMonth(startDate.getMonth() - months + 1);
    startDate.setDate(1);
    startDate.setHours(0, 0, 0, 0);

    // Group transactions by month
    const monthlyData: Record<string, { income: number; expenses: number }> = {};

    transactions.forEach((tx: any) => {
      const txDate = new Date(tx.date);
      if (txDate >= startDate && txDate <= today) {
        const monthKey = tx.date.substring(0, 7); // YYYY-MM
        if (!monthlyData[monthKey]) {
          monthlyData[monthKey] = { income: 0, expenses: 0 };
        }

        if (tx.type === 'income') {
          monthlyData[monthKey].income += tx.amount;
        } else {
          monthlyData[monthKey].expenses += tx.amount;
        }
      }
    });

    // Generate all months in range (including empty months)
    const allMonths: MonthlySummary[] = [];
    const current = new Date(startDate);

    while (current <= today) {
      const monthKey = `${current.getFullYear()}-${String(current.getMonth() + 1).padStart(2, '0')}`;
      const monthLabel = current.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });

      const data = monthlyData[monthKey] || { income: 0, expenses: 0 };
      const income = data.income;
      const expenses = data.expenses;
      const net = income - expenses;
      const savingsRate = income > 0 ? (net / income) * 100 : 0;

      allMonths.push({
        month: monthKey,
        monthLabel,
        income,
        expenses,
        net,
        savingsRate: Math.max(0, savingsRate), // Ensure non-negative
      });

      current.setMonth(current.getMonth() + 1);
    }

    // Sort by date ascending (oldest first)
    allMonths.sort((a, b) => a.month.localeCompare(b.month));

    // Calculate averages
    const totalMonths = allMonths.length;
    const avgIncome = allMonths.reduce((sum, m) => sum + m.income, 0) / totalMonths;
    const avgExpenses = allMonths.reduce((sum, m) => sum + m.expenses, 0) / totalMonths;
    const avgNet = allMonths.reduce((sum, m) => sum + m.net, 0) / totalMonths;
    const avgSavingsRate = allMonths.reduce((sum, m) => sum + m.savingsRate, 0) / totalMonths;

    // Find best and worst months (by net savings)
    const bestMonth = [...allMonths].sort((a, b) => b.net - a.net)[0] || null;
    const worstMonth = [...allMonths].sort((a, b) => a.net - b.net)[0] || null;

    return {
      data: allMonths,
      avgIncome,
      avgExpenses,
      avgNet,
      avgSavingsRate,
      bestMonth,
      worstMonth,
    };
  } catch (error) {
    console.error('Error fetching trend data:', error);
    throw error;
  }
}

export function formatCurrency(amount: number, currency: string = 'CHF'): string {
  return new Intl.NumberFormat('de-CH', {
    style: 'currency',
    currency,
  }).format(amount);
}

export function formatPercentage(value: number): string {
  return `${value.toFixed(1)}%`;
}
