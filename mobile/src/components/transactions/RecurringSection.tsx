import React, { useState } from 'react';
import { View, Text, Pressable } from 'react-native';
import Animated, { FadeIn, FadeOut } from 'react-native-reanimated';
import { ChevronRight } from 'lucide-react-native';
import { format, parseISO } from 'date-fns';
import { colors, getAmountColor, formatCurrency } from '@/lib/design-tokens';

interface RecurringTransaction {
  id: string;
  type: 'income' | 'expense';
  amount: number;
  payee: string;
  emoji: string;
  dayOfMonth?: number;
  date?: string;
  isRecurring: boolean;
  isActive: boolean;
  isShared?: boolean;
  partnerName?: string;
  walletName?: string;
}

interface RecurringSectionProps {
  recurringTransactions: RecurringTransaction[];
  onEdit: (id: string) => void;
}

function getDaySuffix(day: number): string {
  if (day >= 11 && day <= 13) return 'th';
  switch (day % 10) {
    case 1: return 'st';
    case 2: return 'nd';
    case 3: return 'rd';
    default: return 'th';
  }
}

function formatScheduledDate(dateString: string): string {
  try {
    const date = parseISO(dateString);
    return format(date, 'MMM d, yyyy');
  } catch {
    return dateString;
  }
}

export default function RecurringSection({ recurringTransactions, onEdit }: RecurringSectionProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  const activeCount = recurringTransactions.filter(t => t.isActive).length;

  if (recurringTransactions.length === 0) {
    return null;
  }

  return (
    <View
      className="rounded-2xl mb-4 overflow-hidden"
      style={{
        backgroundColor: colors.glassWhite,
        borderWidth: 1,
        borderColor: colors.glassBorder,
      }}
    >
      {/* Header */}
      <Pressable
        onPress={() => setIsExpanded(!isExpanded)}
        className="p-4 flex-row justify-between items-center"
      >
        <View className="flex-row items-center">
          <Text className="text-lg mr-2.5">📅</Text>
          <Text
            className="text-[15px] font-semibold"
            style={{ color: colors.textWhite }}
          >
            Upcoming
          </Text>
          <Text
            className="text-xs ml-1.5"
            style={{ color: colors.sageGreen }}
          >
            {activeCount} active
          </Text>
        </View>
        <ChevronRight
          size={18}
          color={colors.textWhiteTertiary}
          style={{
            transform: [{ rotate: isExpanded ? '90deg' : '0deg' }],
          }}
        />
      </Pressable>

      {/* Expanded Content */}
      {isExpanded && (
        <Animated.View entering={FadeIn.duration(200)} exiting={FadeOut.duration(200)}>
          {recurringTransactions.map((transaction, index) => (
            <Pressable
              key={transaction.id}
              onPress={() => onEdit(transaction.id)}
              style={{
                borderTopWidth: 1,
                borderTopColor: colors.glassBorder,
                padding: 14,
                paddingHorizontal: 16,
              }}
            >
              <View className="flex-row justify-between items-center">
                {/* Left Side */}
                <View className="flex-row items-center flex-1">
                  <View
                    className="rounded-xl mr-3 items-center justify-center"
                    style={{
                      width: 40,
                      height: 40,
                      backgroundColor: colors.glassBorder,
                    }}
                  >
                    <Text className="text-lg">{transaction.emoji}</Text>
                  </View>

                  <View className="flex-1">
                    <Text
                      className="text-sm font-medium mb-1"
                      style={{ color: colors.textWhite }}
                    >
                      {transaction.payee}
                    </Text>
                    <Text
                      className="text-xs"
                      style={{ color: colors.textWhiteTertiary }}
                    >
                      {transaction.date
                        ? formatScheduledDate(transaction.date)
                        : transaction.isRecurring && transaction.dayOfMonth
                        ? `Every ${transaction.dayOfMonth}${getDaySuffix(transaction.dayOfMonth)}`
                        : 'Upcoming'}
                      {transaction.isShared && ` • Shared with ${transaction.partnerName}`}
                    </Text>
                  </View>
                </View>

                {/* Right Side */}
                <Text
                  className="text-base font-semibold"
                  style={{
                    color: getAmountColor(transaction.type),
                  }}
                >
                  {transaction.type === 'income' ? '+' : '-'}
                  {formatCurrency(transaction.amount)}
                </Text>
              </View>
            </Pressable>
          ))}
        </Animated.View>
      )}
    </View>
  );
}
