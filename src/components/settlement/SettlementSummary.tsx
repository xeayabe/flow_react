import React from 'react';
import { View, Text } from 'react-native';
import { formatCurrency } from '@/lib/formatCurrency';

interface SettlementSummaryProps {
  selectedCount: number;
  totalAmount: number;
}

/**
 * SettlementSummary - Show summary of selected items and total
 * Sage green info box styling
 */
export function SettlementSummary({
  selectedCount,
  totalAmount,
}: SettlementSummaryProps) {
  if (selectedCount === 0) {
    return null;
  }

  return (
    <View
      style={{
        backgroundColor: 'rgba(168, 181, 161, 0.1)',
        borderWidth: 1,
        borderColor: 'rgba(168, 181, 161, 0.2)',
        borderRadius: 12,
        padding: 16,
      }}
    >
      {/* Selected expenses row */}
      <View className="flex-row justify-between items-center">
        <Text
          className="text-white/70"
          style={{ fontSize: 13 }}
        >
          Selected expenses
        </Text>
        <Text
          className="text-white/90"
          style={{
            fontSize: 13,
            fontVariant: ['tabular-nums'],
          }}
        >
          {selectedCount} {selectedCount === 1 ? 'item' : 'items'}
        </Text>
      </View>

      {/* Separator */}
      <View
        className="my-3"
        style={{
          height: 1,
          backgroundColor: 'rgba(168, 181, 161, 0.2)',
        }}
      />

      {/* Total row */}
      <View className="flex-row justify-between items-center">
        <Text
          className="text-white/70"
          style={{ fontSize: 13 }}
        >
          Total to settle
        </Text>
        <Text
          className="text-white font-semibold"
          style={{
            fontSize: 16,
            fontVariant: ['tabular-nums'],
          }}
        >
          {formatCurrency(totalAmount)}
        </Text>
      </View>
    </View>
  );
}
