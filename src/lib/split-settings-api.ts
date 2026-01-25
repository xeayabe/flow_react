import { db } from './db';

/**
 * Get current split settings for household
 */
export async function getSplitSettings(householdId: string) {
  const { data: householdData } = await db.queryOnce({
    households: { $: { where: { id: householdId } } },
    householdMembers: {
      $: { where: { householdId, status: 'active' } }
    }
  });

  const household = householdData.households?.[0];
  const members = householdData.householdMembers || [];

  if (!household || members.length < 2) {
    return null;
  }

  const splitMethod = household.splitMethod || 'automatic';

  let splitRatios: Record<string, number> = {};

  if (splitMethod === 'automatic') {
    // Calculate from incomes
    const totalIncome = members.reduce((sum: number, m: any) => sum + (m.monthlyIncome || 0), 0);

    if (totalIncome === 0) {
      // No incomes set - split evenly
      members.forEach((m: any) => {
        splitRatios[m.userId] = 100 / members.length;
      });
    } else {
      // Proportional based on income
      members.forEach((m: any) => {
        splitRatios[m.userId] = ((m.monthlyIncome || 0) / totalIncome) * 100;
      });
    }
  } else {
    // Use manual ratios
    splitRatios = household.manualSplitRatios || {};
  }

  return {
    splitMethod,
    splitRatios,
    members: members.map((m: any) => ({
      userId: m.userId,
      name: m.userName || 'Unknown',
      percentage: splitRatios[m.userId] || 0
    }))
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
      updatedAt: Date.now()
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
