import { colors } from './design-tokens';

export function getBudgetColor(percentUsed: number): string {
  if (percentUsed <= 70) return colors.budgetOnTrack;      // Sage
  if (percentUsed <= 90) return colors.budgetProgressing;  // Amber
  if (percentUsed <= 100) return colors.budgetNearlyThere; // Teal
  return colors.budgetFlowAdjusted;                        // Lavender
}

export function getBudgetStatus(percentUsed: number): string {
  if (percentUsed <= 70) return 'ON TRACK';
  if (percentUsed <= 90) return 'PROGRESSING WELL';
  if (percentUsed <= 100) return 'NEARLY THERE';
  return 'FLOW ADJUSTED'; // NOT "Over Budget"!
}
