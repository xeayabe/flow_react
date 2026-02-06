import React, { useState } from 'react';
import { View, Text, Pressable, Modal } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  runOnJS,
  withTiming,
} from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { Trash2, Copy } from 'lucide-react-native';
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
  onDelete?: (transactionId: string) => void;
  onDuplicate?: (transactionId: string) => void;
}

export default function TransactionListItem({
  transaction,
  onClick,
  onDelete,
  onDuplicate,
}: TransactionListItemProps) {
  const isIncome = transaction.type === 'income';
  const isShared = transaction.isShared;
  const translateX = useSharedValue(0);
  const [showDeleteModal, setShowDeleteModal] = useState(false);

  const handleDelete = () => {
    setShowDeleteModal(true);
    translateX.value = withSpring(0);
  };

  const confirmDelete = () => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setShowDeleteModal(false);
    if (onDelete) {
      onDelete(transaction.id);
    }
  };

  const handleDuplicate = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    translateX.value = withSpring(0);
    if (onDuplicate) {
      onDuplicate(transaction.id);
    }
  };

  const panGesture = Gesture.Pan()
    .onUpdate((event) => {
      // Limit swipe distance
      if (event.translationX < -100) {
        translateX.value = -100;
      } else if (event.translationX > 100) {
        translateX.value = 100;
      } else {
        translateX.value = event.translationX;
      }
    })
    .onEnd((event) => {
      const threshold = 50;

      if (event.translationX < -threshold) {
        // Swiped left - show delete
        translateX.value = withSpring(-80);
        runOnJS(Haptics.impactAsync)(Haptics.ImpactFeedbackStyle.Light);
      } else if (event.translationX > threshold) {
        // Swiped right - show duplicate
        translateX.value = withSpring(80);
        runOnJS(Haptics.impactAsync)(Haptics.ImpactFeedbackStyle.Light);
      } else {
        // Return to center
        translateX.value = withSpring(0);
      }
    });

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: translateX.value }],
  }));

  return (
    <>
      <View
        style={{
          position: 'relative',
          marginBottom: 8,
          height: 76,
        }}
      >
        {/* Left Action (Delete) - visible when swiped left */}
        <View
          style={{
            position: 'absolute',
            right: 0,
            top: 0,
            bottom: 0,
            width: 80,
            justifyContent: 'center',
            alignItems: 'center',
            borderTopRightRadius: 16,
            borderBottomRightRadius: 16,
          }}
        >
          <Pressable
            onPress={handleDelete}
            style={{
              flex: 1,
              width: '100%',
              justifyContent: 'center',
              alignItems: 'center',
            }}
          >
            <Trash2 size={20} color="rgba(227,160,93,1)" />
            <Text
              className="text-[11px] font-semibold mt-1"
              style={{ color: 'rgba(227,160,93,1)' }}
            >
              Delete
            </Text>
          </Pressable>
        </View>

        {/* Right Action (Duplicate) - visible when swiped right */}
        <View
          style={{
            position: 'absolute',
            left: 0,
            top: 0,
            bottom: 0,
            width: 80,
            justifyContent: 'center',
            alignItems: 'center',
            borderTopLeftRadius: 16,
            borderBottomLeftRadius: 16,
          }}
        >
          <Pressable
            onPress={handleDuplicate}
            style={{
              flex: 1,
              width: '100%',
              justifyContent: 'center',
              alignItems: 'center',
            }}
          >
            <Copy size={20} color="rgba(44,95,93,1)" />
            <Text
              className="text-[11px] font-semibold mt-1"
              style={{ color: 'rgba(44,95,93,1)' }}
            >
              Duplicate
            </Text>
          </Pressable>
        </View>

        {/* Transaction Item (Swipeable) */}
        <GestureDetector gesture={panGesture}>
          <Animated.View style={animatedStyle}>
            <Pressable
              onPress={onClick}
              className="rounded-2xl"
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
          </Animated.View>
        </GestureDetector>
      </View>

      {/* Delete Confirmation Modal */}
      <Modal
        visible={showDeleteModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowDeleteModal(false)}
      >
        <View
          style={{
            flex: 1,
            backgroundColor: 'rgba(0,0,0,0.6)',
            justifyContent: 'center',
            alignItems: 'center',
            padding: 20,
          }}
        >
          <View
            style={{
              backgroundColor: '#1A1C1E',
              borderRadius: 24,
              padding: 24,
              width: '100%',
              maxWidth: 400,
            }}
          >
            {/* Title */}
            <Text
              className="text-xl font-bold mb-4"
              style={{ color: 'rgba(255,255,255,0.95)' }}
            >
              Delete Transaction
            </Text>

            {/* Warning */}
            <View
              className="flex-row items-center rounded-xl mb-4"
              style={{
                backgroundColor: 'rgba(227,160,93,0.1)',
                borderWidth: 1,
                borderColor: 'rgba(227,160,93,0.2)',
                padding: 16,
              }}
            >
              <Text className="text-2xl mr-3">⚠️</Text>
              <Text
                className="flex-1 text-sm"
                style={{ color: 'rgba(255,255,255,0.9)' }}
              >
                Are you sure you want to delete this transaction?
              </Text>
            </View>

            {/* Transaction Preview */}
            <View
              className="rounded-xl mb-6"
              style={{
                backgroundColor: 'rgba(255,255,255,0.03)',
                borderWidth: 1,
                borderColor: 'rgba(255,255,255,0.05)',
                padding: 16,
              }}
            >
              <View className="flex-row justify-between mb-2">
                <Text className="text-sm" style={{ color: 'rgba(255,255,255,0.5)' }}>
                  Payee:
                </Text>
                <Text className="text-sm font-semibold" style={{ color: 'rgba(255,255,255,0.9)' }}>
                  {transaction.payee}
                </Text>
              </View>
              <View className="flex-row justify-between mb-2">
                <Text className="text-sm" style={{ color: 'rgba(255,255,255,0.5)' }}>
                  Amount:
                </Text>
                <Text className="text-sm font-semibold" style={{ color: 'rgba(255,255,255,0.9)' }}>
                  {formatCurrency(transaction.amount)} CHF
                </Text>
              </View>
              {isShared && (
                <View className="flex-row justify-between">
                  <Text className="text-sm" style={{ color: 'rgba(255,255,255,0.5)' }}>
                    Type:
                  </Text>
                  <Text className="text-sm font-semibold" style={{ color: 'rgba(168,181,161,1)' }}>
                    Shared Expense
                  </Text>
                </View>
              )}
            </View>

            {/* Shared Warning */}
            {isShared && (
              <View
                className="rounded-xl mb-4"
                style={{
                  backgroundColor: 'rgba(168,181,161,0.1)',
                  borderWidth: 1,
                  borderColor: 'rgba(168,181,161,0.2)',
                  padding: 12,
                }}
              >
                <Text className="text-xs" style={{ color: 'rgba(255,255,255,0.8)' }}>
                  ⚠️ This is a shared expense. Deleting it will also remove the debt from your partner.
                </Text>
              </View>
            )}

            {/* Actions */}
            <View className="flex-row" style={{ gap: 12 }}>
              <Pressable
                onPress={() => setShowDeleteModal(false)}
                className="flex-1 rounded-xl items-center justify-center"
                style={{
                  backgroundColor: 'rgba(255,255,255,0.05)',
                  borderWidth: 2,
                  borderColor: 'rgba(255,255,255,0.1)',
                  paddingVertical: 14,
                }}
              >
                <Text
                  className="text-sm font-semibold"
                  style={{ color: 'rgba(255,255,255,0.9)' }}
                >
                  Cancel
                </Text>
              </Pressable>

              <Pressable
                onPress={confirmDelete}
                className="flex-1 rounded-xl items-center justify-center"
                style={{
                  backgroundColor: 'rgba(255,255,255,0.9)',
                  borderWidth: 2,
                  borderColor: 'rgba(227,160,93,0.5)',
                  paddingVertical: 14,
                }}
              >
                <Text
                  className="text-sm font-semibold"
                  style={{ color: 'rgba(227,160,93,1)' }}
                >
                  Delete
                </Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </>
  );
}
