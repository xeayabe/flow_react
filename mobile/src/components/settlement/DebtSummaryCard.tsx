import React from 'react';
import { View, Text } from 'react-native';
import { GlassCard } from '@/components/ui/Glass';
import { formatCurrency } from '@/lib/formatCurrency';

interface DebtSummaryCardProps {
  isPayer: boolean; // true = "Amount Due", false = "Amount Receivable"
  partnerName: string;
  totalAmount: number;
  yourSplitRatio: number;
  partnerSplitRatio: number;
}

/**
 * DebtSummaryCard - Display debt summary at top of settlement screen
 * Shows amount due/receivable with split ratio explanation
 */
export function DebtSummaryCard({
  isPayer,
  partnerName,
  totalAmount,
  yourSplitRatio,
  partnerSplitRatio,
}: DebtSummaryCardProps) {
  return (
    <GlassCard className="p-6">
      <View className="items-center">
        {/* Label */}
        <Text
          className="text-white/60 mb-1"
          style={{
            fontSize: 11,
            textTransform: 'uppercase',
            letterSpacing: 1.2,
          }}
        >
          {isPayer ? 'Amount Due' : 'Amount Receivable'}
        </Text>

        {/* Partner name */}
        <Text
          className="text-white/90 mb-3"
          style={{ fontSize: 16 }}
        >
          {isPayer ? `to ${partnerName}` : `from ${partnerName}`}
        </Text>

        {/* Amount */}
        <Text
          className="text-white font-bold mb-3"
          style={{
            fontSize: 48,
            fontVariant: ['tabular-nums'],
          }}
        >
          {formatCurrency(totalAmount)}
        </Text>

        {/* Split ratio explanation */}
        <Text
          className="text-white/50"
          style={{ fontSize: 12 }}
        >
          Based on {yourSplitRatio}% / {partnerSplitRatio}% income split
        </Text>
      </View>
    </GlassCard>
  );
}
