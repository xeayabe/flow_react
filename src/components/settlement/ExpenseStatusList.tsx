import React from 'react';
import { View, Text } from 'react-native';
import { formatCurrency } from '@/lib/formatCurrency';
import { formatTransactionDate } from '@/lib/formatTransactionDate';

interface Expense {
  id: string;
  description: string;
  date: string;
  paidBy: string;
  totalAmount: number;
  yourShare: number;
}

interface ExpenseStatusListProps {
  expenses: Expense[];
}

/**
 * ExpenseStatusList - Show receiver which expenses are pending (read-only)
 * No checkboxes or interaction - display only
 */
export function ExpenseStatusList({ expenses }: ExpenseStatusListProps) {
  return (
    <View>
      {/* Section Title */}
      <Text
        className="text-white/60 mb-4"
        style={{
          fontSize: 11,
          textTransform: 'uppercase',
          letterSpacing: 1.2,
        }}
      >
        Outstanding Payments
      </Text>

      {/* Expense Items */}
      <View className="gap-3">
        {expenses.map((expense) => (
          <View
            key={expense.id}
            style={{
              backgroundColor: 'rgba(255, 255, 255, 0.03)',
              borderWidth: 1,
              borderColor: 'rgba(168, 181, 161, 0.2)',
              borderRadius: 12,
              padding: 14,
              flexDirection: 'row',
              alignItems: 'center',
            }}
          >
            {/* Expense Details */}
            <View className="flex-1">
              <Text
                className="text-white/90 font-medium"
                style={{ fontSize: 15 }}
                numberOfLines={1}
              >
                {expense.description}
              </Text>
              <Text
                className="text-white/50 mt-1"
                style={{ fontSize: 11 }}
              >
                {formatTransactionDate(expense.date)} • Paid by {expense.paidBy}
              </Text>
              <Text
                className="text-white/60 mt-1"
                style={{ fontSize: 11 }}
              >
                You receive: {formatCurrency(Math.abs(expense.yourShare))}
              </Text>
            </View>

            {/* Total Amount */}
            <View className="items-end">
              <Text
                className="text-white/80"
                style={{
                  fontSize: 14,
                  fontVariant: ['tabular-nums'],
                }}
              >
                {formatCurrency(expense.totalAmount)}
              </Text>
            </View>
          </View>
        ))}

        {/* Empty state */}
        {expenses.length === 0 && (
          <View className="items-center py-8">
            <Text className="text-white/50 text-sm text-center">
              No outstanding payments
            </Text>
          </View>
        )}
      </View>
    </View>
  );
}
