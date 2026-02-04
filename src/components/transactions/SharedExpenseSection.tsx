import React from 'react';
import { View, Text, Pressable, Switch } from 'react-native';
import { formatCurrency } from '@/lib/formatCurrency';

interface SharedExpenseSectionProps {
  partnerName: string;
  amount: string | number;
  isShared: boolean;
  setIsShared: (value: boolean) => void;
  paidByUserId: string;
  setPaidByUserId: (value: string) => void;
  currentUserId: string;
  partnerUserId: string;
  splitRatios: Array<{ userId: string; percentage: number }>;
}

export default function SharedExpenseSection({
  partnerName,
  amount,
  isShared,
  setIsShared,
  paidByUserId,
  setPaidByUserId,
  currentUserId,
  partnerUserId,
  splitRatios,
}: SharedExpenseSectionProps) {
  const totalAmount = parseFloat(amount as string) || 0;

  // Get percentages from split ratios
  const currentUserRatio = splitRatios.find((r) => r.userId === currentUserId);
  const partnerRatio = splitRatios.find((r) => r.userId === partnerUserId);

  const yourPercentage = currentUserRatio?.percentage || 50;
  const partnerPercentage = partnerRatio?.percentage || 50;

  // Calculate split amounts
  const yourShare = totalAmount * (yourPercentage / 100);
  const partnerShare = totalAmount * (partnerPercentage / 100);

  // Calculate who owes whom
  const owedAmount = paidByUserId === currentUserId ? partnerShare : yourShare;
  const owedText = paidByUserId === currentUserId
    ? `${partnerName} owes you`
    : `You owe ${partnerName}`;

  return (
    <View>
      {/* Toggle Section - Always visible */}
      <View
        className="flex-row items-center justify-between rounded-xl p-4 mb-3"
        style={{
          backgroundColor: 'rgba(255,255,255,0.03)',
          borderWidth: 1,
          borderColor: 'rgba(255,255,255,0.05)',
        }}
      >
        <View className="flex-1">
          <Text className="text-sm font-medium" style={{ color: 'rgba(255,255,255,0.9)' }}>
            👥 Shared with {partnerName}
          </Text>
        </View>
        <Switch
          value={isShared}
          onValueChange={setIsShared}
          trackColor={{ false: 'rgba(255,255,255,0.2)', true: '#2C5F5D' }}
          thumbColor="#fff"
        />
      </View>

      {/* Conditional Content - Only when isShared is true */}
      {isShared && (
        <>
          {/* Who Paid Selector */}
          <View className="mb-3">
            <Text className="text-xs font-medium mb-2" style={{ color: 'rgba(255,255,255,0.7)' }}>
              Who Paid?
            </Text>
            <View className="flex-row" style={{ gap: 8 }}>
              <Pressable
                onPress={() => setPaidByUserId(currentUserId)}
                className="flex-1 py-3 rounded-xl items-center"
                style={{
                  backgroundColor:
                    paidByUserId === currentUserId
                      ? 'rgba(44,95,93,0.2)'
                      : 'rgba(255,255,255,0.03)',
                  borderWidth: 2,
                  borderColor:
                    paidByUserId === currentUserId
                      ? '#2C5F5D'
                      : 'rgba(255,255,255,0.05)',
                }}
              >
                <Text
                  className="text-sm font-medium"
                  style={{ color: 'rgba(255,255,255,0.9)' }}
                >
                  You
                </Text>
              </Pressable>

              <Pressable
                onPress={() => setPaidByUserId(partnerUserId)}
                className="flex-1 py-3 rounded-xl items-center"
                style={{
                  backgroundColor:
                    paidByUserId === partnerUserId
                      ? 'rgba(44,95,93,0.2)'
                      : 'rgba(255,255,255,0.03)',
                  borderWidth: 2,
                  borderColor:
                    paidByUserId === partnerUserId
                      ? '#2C5F5D'
                      : 'rgba(255,255,255,0.05)',
                }}
              >
                <Text
                  className="text-sm font-medium"
                  style={{ color: 'rgba(255,255,255,0.9)' }}
                >
                  {partnerName}
                </Text>
              </Pressable>
            </View>
          </View>

          {/* Split Preview - Only show if amount is entered */}
          {totalAmount > 0 && (
            <View
              className="rounded-xl p-4"
              style={{
                backgroundColor: 'rgba(168,181,161,0.1)',
                borderWidth: 1,
                borderColor: 'rgba(168,181,161,0.2)',
              }}
            >
              <Text
                className="text-xs font-semibold mb-3"
                style={{
                  color: 'rgba(255,255,255,0.7)',
                  textTransform: 'uppercase',
                  letterSpacing: 1,
                }}
              >
                Split Preview ({yourPercentage.toFixed(0)}% / {partnerPercentage.toFixed(0)}%)
              </Text>

              {/* Your Share */}
              <View className="flex-row items-center justify-between mb-2">
                <Text className="text-xs" style={{ color: 'rgba(255,255,255,0.8)' }}>
                  Your share
                </Text>
                <Text
                  className="text-sm font-semibold"
                  style={{ color: 'rgba(255,255,255,0.9)' }}
                >
                  {formatCurrency(yourShare)}
                </Text>
              </View>

              {/* Partner Share */}
              <View className="flex-row items-center justify-between mb-2">
                <Text className="text-xs" style={{ color: 'rgba(255,255,255,0.8)' }}>
                  {partnerName}'s share
                </Text>
                <Text
                  className="text-sm font-semibold"
                  style={{ color: 'rgba(255,255,255,0.9)' }}
                >
                  {formatCurrency(partnerShare)}
                </Text>
              </View>

              {/* Who Owes Whom */}
              <View
                className="flex-row items-center justify-between pt-2 mt-1"
                style={{
                  borderTopWidth: 1,
                  borderTopColor: 'rgba(255,255,255,0.1)',
                }}
              >
                <Text className="text-xs" style={{ color: 'rgba(255,255,255,0.8)' }}>
                  {owedText}
                </Text>
                <Text
                  className="text-sm font-bold"
                  style={{ color: 'rgba(168,181,161,0.95)' }}
                >
                  {formatCurrency(owedAmount)}
                </Text>
              </View>
            </View>
          )}
        </>
      )}
    </View>
  );
}
