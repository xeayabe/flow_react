import React from 'react';
import { View, Text, Pressable } from 'react-native';
import { Check } from 'lucide-react-native';
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

interface ExpenseSelectionListProps {
  expenses: Expense[];
  selectedExpenseIds: string[];
  onToggleExpense: (id: string) => void;
}

/**
 * ExpenseSelectionList - Allow payer to select which expenses to settle
 * Each expense item has a checkbox and shows expense details
 */
export function ExpenseSelectionList({
  expenses,
  selectedExpenseIds,
  onToggleExpense,
}: ExpenseSelectionListProps) {
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
        Select Expenses to Settle
      </Text>

      {/* Expense Items */}
      <View className="gap-3">
        {expenses.map((expense) => {
          const isSelected = selectedExpenseIds.includes(expense.id);

          return (
            <Pressable
              key={expense.id}
              onPress={() => onToggleExpense(expense.id)}
              style={({ pressed }) => ({
                backgroundColor: isSelected
                  ? 'rgba(44, 95, 93, 0.2)'
                  : pressed
                  ? 'rgba(255, 255, 255, 0.05)'
                  : 'rgba(255, 255, 255, 0.03)',
                borderWidth: 1,
                borderColor: isSelected
                  ? '#2C5F5D'
                  : 'rgba(255, 255, 255, 0.05)',
                borderRadius: 12,
                padding: 14,
              })}
            >
              <View style={{ flexDirection: 'row', alignItems: 'flex-start' }}>
                {/* Checkbox */}
                <View
                  style={{
                    width: 20,
                    height: 20,
                    borderRadius: 4,
                    backgroundColor: isSelected ? '#2C5F5D' : 'transparent',
                    borderWidth: isSelected ? 0 : 2,
                    borderColor: 'rgba(255, 255, 255, 0.3)',
                    alignItems: 'center',
                    justifyContent: 'center',
                    marginRight: 12,
                    marginTop: 2,
                  }}
                >
                  {isSelected && (
                    <Check size={14} color="#fff" strokeWidth={2.5} />
                  )}
                </View>

                {/* Expense Details */}
                <View style={{ flex: 1, minWidth: 0 }}>
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
                    You owe: {formatCurrency(Math.abs(expense.yourShare))}
                  </Text>
                </View>

                {/* Total Amount */}
                <View style={{ alignItems: 'flex-end', marginLeft: 12 }}>
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
            </Pressable>
          );
        })}

        {/* Empty state */}
        {expenses.length === 0 && (
          <View className="items-center py-8">
            <Text className="text-white/50 text-sm text-center">
              No expenses to settle
            </Text>
          </View>
        )}
      </View>
    </View>
  );
}
