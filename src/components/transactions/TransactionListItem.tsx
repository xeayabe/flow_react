import React from 'react';
import { View, Text, Pressable } from 'react-native';
import { formatCurrency } from '@/lib/formatCurrency';

interface Transaction {
  id: string;
  type: 'income' | 'expense';
  amount: number;
  payee: string;
  categoryName: string;
  walletName?: string;
  emoji: string;
  isShared?: boolean;
  paidByYou?: boolean;
  partnerName?: string;
  partnerOwes?: number;
  youOwe?: number;
}

interface TransactionListItemProps {
  transaction: Transaction;
  onClick: () => void;
}

export default function TransactionListItem({ transaction, onClick }: TransactionListItemProps) {
  const isIncome = transaction.type === 'income';
  const isShared = transaction.isShared;

  return (
    <Pressable
      onPress={onClick}
      className="rounded-2xl mb-2"
      style={{
        backgroundColor: 'rgba(255,255,255,0.03)',
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.05)',
        padding: 16,
      }}
    >
      <View className="flex-row justify-between items-center">
        {/* Left Side */}
        <View className="flex-row items-center flex-1">
          {/* Icon */}
          <View
            className="rounded-xl mr-3 items-center justify-center"
            style={{
              width: 44,
              height: 44,
              backgroundColor: 'rgba(255,255,255,0.05)',
            }}
          >
            <Text className="text-xl">{transaction.emoji}</Text>
          </View>

          {/* Info */}
          <View className="flex-1">
            <View className="flex-row items-center mb-1">
              <Text
                className="text-base font-medium mr-2"
                style={{ color: 'rgba(255,255,255,0.9)' }}
              >
                {transaction.payee}
              </Text>
              {isShared && (
                <View
                  className="rounded"
                  style={{
                    backgroundColor: 'rgba(168,181,161,0.2)',
                    borderWidth: 1,
                    borderColor: 'rgba(168,181,161,0.3)',
                    paddingHorizontal: 6,
                    paddingVertical: 2,
                  }}
                >
                  <Text
                    className="text-[9px] font-bold uppercase tracking-wider"
                    style={{ color: 'rgba(168,181,161,1)' }}
                  >
                    Shared
                  </Text>
                </View>
              )}
            </View>

            <View className="flex-row items-center">
              <Text
                className="text-xs"
                style={{ color: 'rgba(255,255,255,0.5)' }}
              >
                {transaction.categoryName}
                {' • '}
                {isShared
                  ? (transaction.paidByYou ? 'You paid' : `${transaction.partnerName} paid`)
                  : transaction.walletName}
              </Text>
            </View>
          </View>
        </View>

        {/* Right Side */}
        <View className="items-end ml-3">
          <Text
            className="text-base font-semibold"
            style={{
              color: isIncome ? 'rgba(168,181,161,1)' : 'rgba(255,255,255,0.9)',
            }}
          >
            {isIncome ? '+' : '-'}
            {formatCurrency(transaction.amount)}
          </Text>
          {isShared && (
            <Text
              className="text-[11px] mt-0.5"
              style={{ color: 'rgba(255,255,255,0.6)' }}
            >
              {transaction.paidByYou
                ? `${transaction.partnerName} owes: ${formatCurrency(transaction.partnerOwes || 0)}`
                : `You owe: ${formatCurrency(transaction.youOwe || 0)}`}
            </Text>
          )}
        </View>
      </View>
    </Pressable>
  );
}
