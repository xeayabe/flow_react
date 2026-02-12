/**
 * Swiss franc-safe split calculations
 *
 * FIX: DAT-004 - Split rounding fix
 *
 * Ensures:
 * - All amounts rounded to 0.01 CHF (centimes)
 * - Two sides always sum exactly to the total
 * - Remainder (e.g., 0.01 CHF) goes to the larger-ratio partner
 * - Handles edge cases: 50/50, 60/40, 70/30, uneven ratios
 *
 * Example: CHF 100.01 split 50/50 = CHF 50.01 + CHF 50.00
 */

/**
 * Result of a split calculation for a single participant
 */
export interface SplitResult {
  userId: string;
  amount: number;       // Rounded to 2 decimal places (CHF centimes)
  percentage: number;   // The ratio used for this participant
}

/**
 * Round a number to exactly 2 decimal places (CHF centimes)
 * Uses Math.round to avoid floating-point drift
 */
// FIX: DAT-004 - Safe rounding to CHF centimes
export function roundToCentimes(value: number): number {
  return Math.round(value * 100) / 100;
}

/**
 * Split a CHF amount between participants based on their ratios.
 *
 * Algorithm:
 * 1. Calculate each participant's raw share: (amount * ratio / totalRatio)
 * 2. Floor each share to centimes (Math.floor to nearest 0.01)
 * 3. Calculate the remainder (total - sum of floored shares)
 * 4. Distribute remainder 0.01 at a time to participants with the largest fractional parts
 *    (ties broken by largest ratio, then by userId for determinism)
 *
 * This guarantees the sum of all split amounts === the original total.
 *
 * @param totalAmount - The total CHF amount to split (must be >= 0)
 * @param participants - Array of { userId, ratio } where ratio > 0
 * @returns Array of SplitResult with amounts summing exactly to totalAmount
 *
 * @example
 * // CHF 100.01 split 50/50
 * splitAmount(100.01, [
 *   { userId: 'a', ratio: 50 },
 *   { userId: 'b', ratio: 50 },
 * ])
 * // Returns: [{ userId: 'a', amount: 50.01, percentage: 50 }, { userId: 'b', amount: 50.00, percentage: 50 }]
 *
 * @example
 * // CHF 100 split 60/40
 * splitAmount(100, [
 *   { userId: 'a', ratio: 60 },
 *   { userId: 'b', ratio: 40 },
 * ])
 * // Returns: [{ userId: 'a', amount: 60.00, percentage: 60 }, { userId: 'b', amount: 40.00, percentage: 40 }]
 */
// FIX: DAT-004 - Swiss franc-safe split calculation
export function splitAmount(
  totalAmount: number,
  participants: Array<{ userId: string; ratio: number }>
): SplitResult[] {
  // Guard: no participants
  if (participants.length === 0) {
    return [];
  }

  // Guard: negative or zero total
  // FIX: DAT-008 - Null safety for financial arithmetic
  const safeTotalAmount = totalAmount ?? 0;
  if (safeTotalAmount <= 0) {
    return participants.map((p) => ({
      userId: p.userId,
      amount: 0,
      percentage: 0,
    }));
  }

  // Guard: single participant gets the full amount
  if (participants.length === 1) {
    const totalRatio = participants[0].ratio ?? 0;
    return [
      {
        userId: participants[0].userId,
        amount: roundToCentimes(safeTotalAmount),
        percentage: totalRatio > 0 ? 100 : 0,
      },
    ];
  }

  // Calculate total ratio
  const totalRatio = participants.reduce((sum, p) => sum + (p.ratio ?? 0), 0);
  if (totalRatio <= 0) {
    // All ratios are zero or negative -- split evenly as fallback
    const evenAmount = roundToCentimes(safeTotalAmount / participants.length);
    const results: SplitResult[] = participants.map((p) => ({
      userId: p.userId,
      amount: evenAmount,
      percentage: roundToCentimes(100 / participants.length),
    }));
    // Adjust last participant for remainder
    const allocated = results.slice(0, -1).reduce((s, r) => s + r.amount, 0);
    results[results.length - 1].amount = roundToCentimes(safeTotalAmount - allocated);
    return results;
  }

  // Convert total to centimes (integer math) for precision
  const totalCentimes = Math.round(safeTotalAmount * 100);

  // Step 1: Calculate raw shares in centimes, floor each
  const rawShares = participants.map((p) => {
    const safeRatio = p.ratio ?? 0;
    const rawCentimes = (totalCentimes * safeRatio) / totalRatio;
    const floored = Math.floor(rawCentimes);
    const fractional = rawCentimes - floored;
    const percentage = roundToCentimes((safeRatio / totalRatio) * 100);
    return {
      userId: p.userId,
      floored,
      fractional,
      ratio: safeRatio,
      percentage,
    };
  });

  // Step 2: Calculate remainder centimes to distribute
  const flooredTotal = rawShares.reduce((sum, s) => sum + s.floored, 0);
  let remainderCentimes = totalCentimes - flooredTotal;

  // Step 3: Sort by fractional part descending (larger fraction gets remainder first)
  // Ties broken by: larger ratio first, then by userId for determinism
  // FIX: DAT-004 - Remainder goes to larger-ratio partner
  const sortedForRemainder = [...rawShares].sort((a, b) => {
    if (b.fractional !== a.fractional) return b.fractional - a.fractional;
    if (b.ratio !== a.ratio) return b.ratio - a.ratio;
    return a.userId.localeCompare(b.userId);
  });

  // Step 4: Distribute remainder 1 centime at a time
  const extraCentimes = new Map<string, number>();
  for (const share of sortedForRemainder) {
    if (remainderCentimes <= 0) break;
    extraCentimes.set(share.userId, (extraCentimes.get(share.userId) || 0) + 1);
    remainderCentimes--;
  }

  // Step 5: Build final results
  const results: SplitResult[] = rawShares.map((share) => ({
    userId: share.userId,
    amount: (share.floored + (extraCentimes.get(share.userId) || 0)) / 100,
    percentage: share.percentage,
  }));

  return results;
}

/**
 * Validate that a set of split results sums exactly to the expected total.
 * Useful for assertions and tests.
 *
 * @param splits - Array of SplitResult
 * @param expectedTotal - Expected total in CHF
 * @returns true if the sum matches within floating-point tolerance (0.001)
 */
// FIX: DAT-004 - Validation helper for split integrity
export function validateSplitTotal(splits: SplitResult[], expectedTotal: number): boolean {
  const actualTotal = splits.reduce((sum, s) => sum + s.amount, 0);
  return Math.abs(roundToCentimes(actualTotal) - roundToCentimes(expectedTotal)) < 0.001;
}

/**
 * Calculate the share for a single participant given total amount and their percentage.
 * This is a convenience wrapper for the common case of "what does person X owe?"
 *
 * @param totalAmount - Total CHF amount
 * @param percentage - Participant's percentage (0-100)
 * @returns Rounded amount in CHF
 */
// FIX: DAT-004 - Safe single-share calculation
export function calculateShare(totalAmount: number, percentage: number): number {
  const safeTotal = totalAmount ?? 0;
  const safePercentage = percentage ?? 0;
  if (safeTotal <= 0 || safePercentage <= 0) return 0;
  return roundToCentimes((safeTotal * safePercentage) / 100);
}
