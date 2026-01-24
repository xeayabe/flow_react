import { Account } from './accounts-api';
import { Transaction } from './transactions-api';
import { Category } from './categories-api';
import {
  Wallet,
  TrendingUp,
  Coffee,
  Home,
  Utensils,
  ShoppingCart,
  Heart,
  Smartphone,
  Pill,
  Bus,
  DollarSign,
  Gift,
  Zap,
  Droplet,
  PiggyBank,
  TrendingDown,
  Briefcase,
} from 'lucide-react-native';

/**
 * Get icon component for a category name
 */
export function getCategoryIcon(categoryName: string): any {
  const name = categoryName.toLowerCase();

  // Income categories
  if (name.includes('salary') || name.includes('income')) return TrendingUp;
  if (name.includes('bonus')) return Gift;
  if (name.includes('freelance') || name.includes('work')) return Briefcase;
  if (name.includes('investment')) return TrendingUp;
  if (name.includes('refund')) return DollarSign;

  // Needs categories
  if (name.includes('rent') || name.includes('housing') || name.includes('home')) return Home;
  if (name.includes('groceries') || name.includes('food')) return ShoppingCart;
  if (name.includes('utilities') || name.includes('electricity')) return Zap;
  if (name.includes('water')) return Droplet;
  if (name.includes('transport') || name.includes('car') || name.includes('bus')) return Bus;
  if (name.includes('health') || name.includes('medical') || name.includes('insurance')) return Pill;
  if (name.includes('phone') || name.includes('internet')) return Smartphone;

  // Wants categories
  if (name.includes('dining') || name.includes('restaurant')) return Utensils;
  if (name.includes('entertainment') || name.includes('movie')) return Coffee;
  if (name.includes('shopping') || name.includes('clothes')) return ShoppingCart;
  if (name.includes('hobby') || name.includes('game')) return Coffee;
  if (name.includes('subscription')) return Heart;
  if (name.includes('vacation') || name.includes('travel')) return Coffee;

  // Savings categories
  if (name.includes('emergency') || name.includes('saving') || name.includes('savings')) return PiggyBank;

  // Default
  return Wallet;
}

/**
 * Format currency for display
 * Rounds to 2 decimal places first to avoid floating-point precision issues
 */
export function formatCurrency(amount: number, currency: string = 'CHF'): string {
  // Round to 2 decimal places first to fix floating-point precision issues
  const rounded = Math.round(Math.abs(amount) * 100) / 100;
  const formatted = new Intl.NumberFormat('de-CH', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(rounded);

  return `${formatted} ${currency}`;
}

/**
 * Format currency with sign for transactions
 */
export function formatTransactionAmount(amount: number, type: 'income' | 'expense'): string {
  const sign = type === 'income' ? '+' : '-';
  return `${sign}${formatCurrency(amount)}`;
}

/**
 * Get color for transaction type
 */
export function getTransactionTypeColor(type: 'income' | 'expense'): string {
  return type === 'income' ? '#10B981' : '#EF4444';
}

/**
 * Format date for display (e.g., "Today", "Yesterday", "2 days ago")
 */
export function formatRelativeDate(dateString: string): string {
  const date = new Date(dateString + 'T00:00:00');
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);

  const dateOnlyToday = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  const dateOnlyYesterday = new Date(
    yesterday.getFullYear(),
    yesterday.getMonth(),
    yesterday.getDate()
  );
  const dateOnlyTarget = new Date(date.getFullYear(), date.getMonth(), date.getDate());

  if (dateOnlyTarget.getTime() === dateOnlyToday.getTime()) {
    return 'Today';
  }

  if (dateOnlyTarget.getTime() === dateOnlyYesterday.getTime()) {
    return 'Yesterday';
  }

  const diffTime = dateOnlyToday.getTime() - dateOnlyTarget.getTime();
  const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

  if (diffDays < 7) {
    return `${diffDays} days ago`;
  }

  // Fall back to European date format
  return dateOnlyTarget.toLocaleDateString('it-IT');
}

/**
 * Calculate total balance from accounts
 */
export function calculateTotalBalance(accounts: Account[]): number {
  return accounts.reduce((sum, account) => sum + account.balance, 0);
}

/**
 * Filter transactions for current budget period
 */
export function filterTransactionsByPeriod(
  transactions: Transaction[],
  startDate: string,
  endDate: string
): Transaction[] {
  return transactions.filter((tx) => tx.date >= startDate && tx.date <= endDate);
}

/**
 * Calculate spending for current period by type
 */
export function calculatePeriodSpending(
  transactions: Transaction[],
  startDate: string,
  endDate: string,
  type: 'income' | 'expense'
): number {
  const filtered = filterTransactionsByPeriod(transactions, startDate, endDate);
  return filtered
    .filter((tx) => tx.type === type)
    .reduce((sum, tx) => sum + tx.amount, 0);
}

/**
 * Get recent transactions with category enrichment
 */
export function getRecentTransactionsWithCategories(
  transactions: Transaction[],
  categories: Category[],
  limit: number = 5
): Array<Transaction & { categoryName?: string; categoryColor?: string; categoryIcon?: string }> {
  const categoryMap = new Map(categories.map((c) => [c.id, c]));

  return transactions
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    .slice(0, limit)
    .map((tx) => {
      const category = categoryMap.get(tx.categoryId);
      return {
        ...tx,
        categoryName: category?.name,
        categoryColor: category?.color,
        categoryIcon: category?.icon,
      };
    });
}

/**
 * Interface for dashboard transaction display
 */
export interface DashboardTransaction extends Transaction {
  categoryName?: string;
  categoryColor?: string;
  categoryIcon?: string;
  displayIcon?: typeof Wallet;
}

/**
 * Get budget status with color
 */
export function getBudgetStatusColor(spent: number, allocated: number): string {
  if (allocated === 0) return '#9CA3AF';
  const percentage = (spent / allocated) * 100;
  if (percentage >= 100) return '#EF4444';
  if (percentage >= 90) return '#F59E0B';
  if (percentage >= 70) return '#F59E0B';
  return '#10B981';
}

/**
 * Get budget status text
 */
export function getBudgetStatusText(spent: number, allocated: number): string {
  if (allocated === 0) return 'No Budget';
  const percentage = (spent / allocated) * 100;
  if (percentage >= 100) return 'Over Budget';
  if (percentage >= 90) return 'Approaching Limit';
  if (percentage >= 70) return 'Watch Spending';
  return 'On Track';
}
