import React, { useState } from 'react';
import { View, Text, Pressable } from 'react-native';
import Animated, { FadeIn, FadeOut } from 'react-native-reanimated';
import { ChevronRight } from 'lucide-react-native';
import { formatCurrency } from '@/lib/formatCurrency';

interface RecurringTransaction {
  id: string;
  type: 'income' | 'expense';
  amount: number;
  payee: string;
  emoji: string;
  dayOfMonth: number;
  isActive: boolean;
  isShared?: boolean;
  partnerName?: string;
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
        backgroundColor: 'rgba(255,255,255,0.03)',
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.05)',
      }}
    >
      {/* Header */}
      <Pressable
        onPress={() => setIsExpanded(!isExpanded)}
        className="p-4 flex-row justify-between items-center"
      >
        <View className="flex-row items-center">
          <Text className="text-lg mr-2.5">🔁</Text>
          <Text
            className="text-[15px] font-semibold mr-2"
            style={{ color: 'rgba(255,255,255,0.9)' }}
          >
            Recurring
          </Text>
          <Text
            className="text-xs"
            style={{ color: 'rgba(255,255,255,0.6)' }}
          >
            {activeCount} active
          </Text>
        </View>
        <ChevronRight
          size={18}
          color="rgba(255,255,255,0.5)"
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
                borderTopColor: 'rgba(255,255,255,0.05)',
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
                      backgroundColor: 'rgba(255,255,255,0.05)',
                    }}
                  >
                    <Text className="text-lg">{transaction.emoji}</Text>
                  </View>

                  <View className="flex-1">
                    <Text
                      className="text-sm font-medium mb-1"
                      style={{ color: 'rgba(255,255,255,0.9)' }}
                    >
                      {transaction.payee}
                    </Text>
                    <Text
                      className="text-xs"
                      style={{ color: 'rgba(255,255,255,0.5)' }}
                    >
                      Every {transaction.dayOfMonth}{getDaySuffix(transaction.dayOfMonth)}
                      {transaction.isShared && ` • Shared with ${transaction.partnerName}`}
                    </Text>
                  </View>
                </View>

                {/* Right Side */}
                <Text
                  className="text-base font-semibold"
                  style={{
                    color: transaction.type === 'income'
                      ? 'rgba(168,181,161,1)'
                      : 'rgba(255,255,255,0.9)',
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
