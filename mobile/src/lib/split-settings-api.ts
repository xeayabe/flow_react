import { db } from './db';

/**
 * Get current split settings for household
 */
export async function getSplitSettings(householdId: string) {
  const { data: householdData } = await db.queryOnce({
    households: { $: { where: { id: householdId } } },
    householdMembers: {
      $: { where: { householdId, status: 'active' } }
    },
    users: {}, // Need to fetch users to get names
    budgetSummary: {} // Need to get income from budget summaries
  });

  const household = householdData.households?.[0];
  const members = householdData.householdMembers || [];
  const users = householdData.users || [];
  const budgetSummaries = householdData.budgetSummary || [];

  if (!household || members.length < 2) {
    return null;
  }

  const splitMethod = household.splitMethod || 'automatic';

  let splitRatios: Record<string, number> = {};

  if (splitMethod === 'automatic') {
    // Calculate from incomes from budget summaries (most recent for each user)
    const memberIncomes: Record<string, number> = {};

    members.forEach((m: any) => {
      // Get the most recent budget summary for this user
      const userSummaries = budgetSummaries
        .filter((s: any) => s.userId === m.userId)
        .sort((a: any, b: any) => new Date(b.periodStart).getTime() - new Date(a.periodStart).getTime());

      const latestSummary = userSummaries[0];
      memberIncomes[m.userId] = latestSummary?.totalIncome || 0;
    });

    const totalIncome = Object.values(memberIncomes).reduce((sum: number, income: number) => sum + income, 0);

    if (totalIncome === 0) {
      // No incomes set - split evenly
      members.forEach((m: any) => {
        splitRatios[m.userId] = 100 / members.length;
      });
    } else {
      // Proportional based on income
      members.forEach((m: any) => {
        splitRatios[m.userId] = ((memberIncomes[m.userId] || 0) / totalIncome) * 100;
      });
    }
  } else {
    // Use manual ratios
    splitRatios = household.manualSplitRatios || {};
  }

  return {
    splitMethod,
    splitRatios,
    members: members.map((m: any) => {
      // Find the user record to get the name
      const user = users.find((u: any) => u.id === m.userId);
      return {
        userId: m.userId,
        name: user?.name || 'Unknown',
        percentage: splitRatios[m.userId] || 0
      };
    })
  };
}

/**
 * Update split settings
 */
export async function updateSplitSettings(
  householdId: string,
  splitMethod: 'automatic' | 'manual',
  manualRatios?: Record<string, number>
) {
  console.log('💾 Updating split settings:', { householdId, splitMethod, manualRatios });

  // Validate manual ratios if provided
  if (splitMethod === 'manual' && manualRatios) {
    const total = Object.values(manualRatios).reduce((sum, val) => sum + val, 0);
    if (Math.abs(total - 100) > 0.01) {
      throw new Error('Percentages must total 100%');
    }
  }

  await db.transact([
    db.tx.households[householdId].update({
      splitMethod,
      manualSplitRatios: splitMethod === 'manual' ? manualRatios : null,
    })
  ]);

  console.log('✅ Split settings updated');
}

/**
 * Get split ratio for creating new shared expenses
 * This is what createExpenseSplits will use
 */
export async function getCurrentSplitRatio(householdId: string): Promise<Array<{userId: string, percentage: number}>> {
  const settings = await getSplitSettings(householdId);

  if (!settings) {
    // Fallback to even split if no settings
    const { data } = await db.queryOnce({
      householdMembers: {
        $: { where: { householdId, status: 'active' } }
      }
    });

    const evenSplit = 100 / (data.householdMembers?.length || 1);
    return (data.householdMembers || []).map((m: any) => ({
      userId: m.userId,
      percentage: evenSplit
    }));
  }

  return settings.members.map(m => ({
    userId: m.userId,
    percentage: m.percentage
  }));
}
