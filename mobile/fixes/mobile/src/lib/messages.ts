/**
 * Flow - Centralized User-Facing Messages
 *
 * All user-facing strings should be sourced from this module to ensure
 * consistent, empathetic, and supportive language throughout the app.
 *
 * Philosophy: Guide, don't blame. Use calm, encouraging language.
 * Never use harsh words like "failed", "error", "wrong", "invalid".
 */

export const messages = {
  // Budget-related messages
  budget: {
    /**
     * Message when spending exceeds budget in a category.
     * Uses "Flow Adjusted" language instead of "over budget".
     */
    flowAdjusted: (category: string, amount: string): string =>
      `${category} has been flow-adjusted by ${amount} this period. You can rebalance from other categories if needed.`,

    /**
     * Message when budget is on track (0-70%).
     */
    onTrack: (category: string): string =>
      `${category} is looking healthy this period. Keep it up!`,

    /**
     * Message when budget is progressing well (70-90%).
     */
    progressing: (category: string): string =>
      `${category} is progressing well. You're mindful of your spending.`,

    /**
     * Message when budget is nearly there (90-100%).
     */
    nearlyThere: (category: string): string =>
      `${category} is nearly at its allocation. Consider pacing for the rest of the period.`,

    /**
     * Empty budget state.
     */
    noBudgetYet: 'Set up your first budget to start tracking how every franc works for you.',

    /**
     * Budget period reset notification.
     */
    periodReset: 'A new budget period has started. Your spending counters have been refreshed.',

    /**
     * Budget summary - all on track.
     */
    allOnTrack: 'All your categories are on track this period. Nice work!',
  },

  // Transaction-related messages
  transactions: {
    /**
     * Empty transaction list.
     */
    noTransactions: 'No transactions found.\nTap + to record your first transaction.',

    /**
     * Transaction saved successfully.
     */
    saved: 'Transaction recorded successfully.',

    /**
     * Transaction deleted.
     */
    deleted: 'Transaction removed. Your balances have been updated.',

    /**
     * Duplicate transaction created.
     */
    duplicated: 'A copy of this transaction has been prepared for you to review.',

    /**
     * No transactions in search results.
     */
    noSearchResults: 'No transactions match your search. Try adjusting your filters.',
  },

  // Settlement-related messages
  settlement: {
    /**
     * Settlement completed successfully.
     */
    completed: (amount: string): string =>
      `Settlement of ${amount} completed. Balances have been updated.`,

    /**
     * All settled state.
     */
    allSettled: (partnerName: string): string =>
      `You and ${partnerName} are all squared up. No outstanding balances.`,

    /**
     * Settlement explanation for payer.
     */
    youOwe: (partnerName: string, amount: string): string =>
      `You have ${amount} in shared expenses to settle with ${partnerName}.`,

    /**
     * Settlement explanation for receiver.
     */
    theyOwe: (partnerName: string, amount: string): string =>
      `${partnerName} has ${amount} in shared expenses to settle with you.`,
  },

  // Error messages - empathetic, never blaming
  errors: {
    /**
     * Network connectivity issue.
     */
    networkError: "We're having trouble connecting. Your changes are saved locally and will sync when you're back online.",

    /**
     * Generic unexpected error.
     */
    genericError: "Something unexpected happened. Don't worry, your data is safe. Please try again.",

    /**
     * Failed to load data.
     */
    loadError: "We couldn't load this information right now. Pull down to refresh, or check back in a moment.",

    /**
     * Failed to save data.
     */
    saveError: "We weren't able to save that just now. Your data is safe -- please try again in a moment.",

    /**
     * Authentication error.
     */
    authError: 'Your session needs to be refreshed. Please sign in again to continue.',

    /**
     * No household found.
     */
    noHousehold: 'We could not find your household. Please check your account setup.',

    /**
     * Partner account not found for settlement.
     */
    noPartnerAccount: "Your partner's account hasn't been set up yet. They'll need to create one before you can settle.",

    /**
     * Permission denied.
     */
    permissionDenied: "You don't have access to this feature. Please check with your household admin.",
  },

  // Loading states
  loading: {
    dashboard: 'Loading your financial overview...',
    transactions: 'Loading transactions...',
    budget: 'Loading budget details...',
    settlement: 'Loading settlement data...',
    accounts: 'Loading your accounts...',
    generic: 'Just a moment...',
  },

  // Empty states
  empty: {
    accounts: 'Create your first account to start tracking your finances.',
    categories: 'Set up categories to organize your income and expenses.',
    recurringExpenses: 'No recurring expenses are due this month.',
    budgetGroups: 'No budget groups to display. Set up your budget to get started.',
  },

  // Success messages
  success: {
    accountCreated: 'Account created successfully!',
    categoryCreated: 'Category added to your budget.',
    recurringAdded: 'Recurring expense recorded for this month.',
    settingsUpdated: 'Your settings have been updated.',
    dataExported: 'Your data has been exported successfully.',
    dataImported: 'Your data has been imported. Please review the transactions.',
    inviteSent: 'Invitation sent! They can join using the code.',
  },

  // Confirmation dialogs
  confirm: {
    deleteTransaction: 'Remove this transaction? Your account balance will be adjusted.',
    deleteAccount: 'Remove this account? Transaction history will be preserved.',
    signOut: 'Are you sure you want to sign out?',
    settleExpenses: (amount: string): string =>
      `Confirm settlement of ${amount}? This will update both account balances.`,
    deactivateRecurring: 'Deactivate this recurring expense? It won\'t appear in future months.',
  },
} as const;
