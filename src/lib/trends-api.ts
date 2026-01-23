import { db } from './db';
import { calculateBudgetPeriod } from './payday-utils';

export interface BudgetPeriodSummary {
  periodStart: string; // YYYY-MM-DD format
  periodEnd: string; // YYYY-MM-DD format
  periodLabel: string; // "25 Dec 2024 - 24 Jan 2025" format
  income: number;
  expenses: number;
  net: number;
  savingsRate: number; // percentage 0-100
}

export interface TrendsSummary {
  data: BudgetPeriodSummary[];
  avgIncome: number;
  avgExpenses: number;
  avgNet: number;
  avgSavingsRate: number;
  bestPeriod: BudgetPeriodSummary | null;
  worstPeriod: BudgetPeriodSummary | null;
}

export async function getTrendData(
  userId: string,
  householdId: string,
  numPeriods: number = 6,
  paydayDay: number = 25
): Promise<TrendsSummary> {
  try {
    // Get household info to get payday day if not provided
    const householdResult = await db.queryOnce({
      households: {
        $: {
          where: {
            id: householdId,
          },
        },
      },
    });

    const household = householdResult.data.households?.[0];
    const actualPaydayDay = household?.paydayDay ?? paydayDay;

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

    // Get current budget period
    const currentPeriod = calculateBudgetPeriod(actualPaydayDay);
    const currentStart = new Date(currentPeriod.start);
    const currentEnd = new Date(currentPeriod.end);

    // Calculate start date: go back N periods from current start
    const startDate = new Date(currentStart);
    for (let i = 0; i < numPeriods - 1; i++) {
      startDate.setMonth(startDate.getMonth() - 1);
    }

    // Group transactions by budget period
    const periodData: Record<string, { income: number; expenses: number; start: string; end: string }> = {};

    transactions.forEach((tx: any) => {
      const txDate = new Date(tx.date);
      if (txDate >= startDate && txDate <= currentEnd) {
        // Find which budget period this transaction belongs to
        // Generate periods backwards from current until we find a match
        let checkDate = new Date(currentStart);
        let foundPeriod = false;

        for (let i = 0; i < numPeriods; i++) {
          const period = calculateBudgetPeriod(actualPaydayDay, checkDate);
          const periodStartDate = new Date(period.start);
          const periodEndDate = new Date(period.end);

          if (txDate >= periodStartDate && txDate <= periodEndDate) {
            const periodKey = `${period.start}_${period.end}`;
            if (!periodData[periodKey]) {
              periodData[periodKey] = {
                income: 0,
                expenses: 0,
                start: period.start,
                end: period.end,
              };
            }

            if (tx.type === 'income') {
              periodData[periodKey].income += tx.amount;
            } else {
              periodData[periodKey].expenses += tx.amount;
            }
            foundPeriod = true;
            break;
          }

          // Move back one month
          checkDate.setMonth(checkDate.getMonth() - 1);
        }
      }
    });

    // Generate all periods in range
    const allPeriods: BudgetPeriodSummary[] = [];
    let periodCheckDate = new Date(currentStart);

    for (let i = 0; i < numPeriods; i++) {
      const period = calculateBudgetPeriod(actualPaydayDay, periodCheckDate);
      const periodKey = `${period.start}_${period.end}`;
      const data = periodData[periodKey] || { income: 0, expenses: 0, start: period.start, end: period.end };

      // Format period label
      const startDate = new Date(period.start);
      const endDate = new Date(period.end);
      const periodLabel = `${startDate.toLocaleDateString('de-CH', {
        day: '2-digit',
        month: 'short',
        year: '2-digit',
      })} - ${endDate.toLocaleDateString('de-CH', {
        day: '2-digit',
        month: 'short',
        year: '2-digit',
      })}`;

      // Round to fix floating-point precision issues
      const income = Math.round(data.income * 100) / 100;
      const expenses = Math.round(data.expenses * 100) / 100;
      const net = Math.round((income - expenses) * 100) / 100;
      const savingsRate = income > 0 ? (net / income) * 100 : 0;

      allPeriods.push({
        periodStart: period.start,
        periodEnd: period.end,
        periodLabel,
        income,
        expenses,
        net,
        savingsRate: Math.max(0, savingsRate),
      });

      // Move back one month
      periodCheckDate.setMonth(periodCheckDate.getMonth() - 1);
    }

    // Sort by date ascending (oldest first)
    allPeriods.sort((a, b) => a.periodStart.localeCompare(b.periodStart));

    // Calculate averages with rounding
    const totalPeriods = allPeriods.length;
    const avgIncome = Math.round((allPeriods.reduce((sum, p) => sum + p.income, 0) / totalPeriods) * 100) / 100;
    const avgExpenses = Math.round((allPeriods.reduce((sum, p) => sum + p.expenses, 0) / totalPeriods) * 100) / 100;
    const avgNet = Math.round((allPeriods.reduce((sum, p) => sum + p.net, 0) / totalPeriods) * 100) / 100;
    const avgSavingsRate = Math.round((allPeriods.reduce((sum, p) => sum + p.savingsRate, 0) / totalPeriods) * 10) / 10;

    // Find best and worst periods (by net savings)
    const bestPeriod = [...allPeriods].sort((a, b) => b.net - a.net)[0] || null;
    const worstPeriod = [...allPeriods].sort((a, b) => a.net - b.net)[0] || null;

    return {
      data: allPeriods,
      avgIncome,
      avgExpenses,
      avgNet,
      avgSavingsRate,
      bestPeriod,
      worstPeriod,
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
