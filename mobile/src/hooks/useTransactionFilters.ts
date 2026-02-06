import { useState, useMemo } from 'react';
import { startOfWeek, endOfWeek, startOfMonth, endOfMonth, startOfQuarter, endOfQuarter, startOfYear, endOfYear, isToday, isWithinInterval, parseISO } from 'date-fns';

export interface FilterState {
  categories: string[];
  type: 'all' | 'expense' | 'income';
  dateRange: 'all' | 'today' | 'week' | 'month' | 'quarter' | 'year';
  searchQuery?: string;
}

interface Transaction {
  id: string;
  type: 'income' | 'expense';
  date: string;
  categoryId: string;
  [key: string]: any;
}

function filterByDateRange(transactions: Transaction[], dateRange: FilterState['dateRange']): Transaction[] {
  if (dateRange === 'all') return transactions;

  const now = new Date();
  let start: Date;
  let end: Date;

  switch (dateRange) {
    case 'today':
      return transactions.filter(t => {
        try {
          return isToday(parseISO(t.date));
        } catch {
          return false;
        }
      });
    case 'week':
      start = startOfWeek(now, { weekStartsOn: 1 }); // Monday
      end = endOfWeek(now, { weekStartsOn: 1 });
      break;
    case 'month':
      start = startOfMonth(now);
      end = endOfMonth(now);
      break;
    case 'quarter':
      start = startOfQuarter(now);
      end = endOfQuarter(now);
      break;
    case 'year':
      start = startOfYear(now);
      end = endOfYear(now);
      break;
    default:
      return transactions;
  }

  return transactions.filter(t => {
    try {
      const transactionDate = parseISO(t.date);
      return isWithinInterval(transactionDate, { start, end });
    } catch {
      return false;
    }
  });
}

export function useTransactionFilters(transactions: Transaction[] = []) {
  const [filters, setFilters] = useState<FilterState>({
    categories: [],
    type: 'all',
    dateRange: 'all',
    searchQuery: '',
  });

  // Apply filters
  const filteredTransactions = useMemo(() => {
    let result = [...transactions];

    // Type filter
    if (filters.type !== 'all') {
      result = result.filter(t => t.type === filters.type);
    }

    // Category filter
    if (filters.categories.length > 0) {
      result = result.filter(t => filters.categories.includes(t.categoryId));
    }

    // Date range filter
    result = filterByDateRange(result, filters.dateRange);

    // Search query filter
    if (filters.searchQuery && filters.searchQuery.trim()) {
      const query = filters.searchQuery.toLowerCase();
      result = result.filter(t => {
        const payee = (t.payee || '').toLowerCase();
        const note = (t.note || '').toLowerCase();
        const amount = String(t.amount);
        return payee.includes(query) || note.includes(query) || amount.includes(query);
      });
    }

    // Sort by date (most recent first)
    result.sort((a, b) => {
      try {
        return parseISO(b.date).getTime() - parseISO(a.date).getTime();
      } catch {
        return 0;
      }
    });

    return result;
  }, [transactions, filters]);

  // Group by date
  const groupedByDate = useMemo(() => {
    const grouped: Record<string, Transaction[]> = {};

    filteredTransactions.forEach(transaction => {
      const date = transaction.date.split('T')[0]; // Get YYYY-MM-DD
      if (!grouped[date]) {
        grouped[date] = [];
      }
      grouped[date].push(transaction);
    });

    return grouped;
  }, [filteredTransactions]);

  return {
    filters,
    setFilters,
    filteredTransactions,
    groupedByDate,
  };
}
