import React, { useState, useCallback } from 'react';
import { View, Text, Pressable, Modal } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  runOnJS,
} from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { Trash2 } from 'lucide-react-native';
import { colors, getAmountColor, formatCurrency } from '@/lib/design-tokens';

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
  const isSwipeOpen = useSharedValue(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);

  const closeSwipe = useCallback(() => {
    translateX.value = withSpring(0, { damping: 20, stiffness: 200 });
    isSwipeOpen.value = false;
  }, [translateX, isSwipeOpen]);

  const handleDelete = useCallback(() => {
    setShowDeleteModal(true);
    closeSwipe();
  }, [closeSwipe]);

  const confirmDelete = useCallback(() => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setShowDeleteModal(false);
    onDelete?.(transaction.id);
  }, [onDelete, transaction.id]);

  const handlePress = useCallback(() => {
    if (isSwipeOpen.value) {
      closeSwipe();
      return;
    }
    onClick();
  }, [isSwipeOpen, closeSwipe, onClick]);

  const panGesture = Gesture.Pan()
    // Only activate when horizontal movement > 20px
    // Fail (let scroll take over) if vertical movement > 15px first
    .activeOffsetX([-20, 20])
    .failOffsetY([-15, 15])
    .onUpdate((event) => {
      if (isSwipeOpen.value) {
        // When open: offset from -80
        const val = -80 + event.translationX;
        translateX.value = Math.max(Math.min(val, 0), -100);
      } else {
        // Only allow LEFT swipe
        if (event.translationX < 0) {
          translateX.value = Math.max(event.translationX, -100);
        }
      }
    })
    .onEnd((event) => {
      if (isSwipeOpen.value) {
        // Already open: close if swiped right enough
        if (event.translationX > 30) {
          translateX.value = withSpring(0, { damping: 20, stiffness: 200 });
          isSwipeOpen.value = false;
        } else {
          translateX.value = withSpring(-80, { damping: 20, stiffness: 200 });
        }
      } else if (event.translationX < -50) {
        // Snap open
        translateX.value = withSpring(-80, { damping: 20, stiffness: 200 });
        isSwipeOpen.value = true;
        runOnJS(Haptics.impactAsync)(Haptics.ImpactFeedbackStyle.Light);
      } else {
        // Snap back
        translateX.value = withSpring(0, { damping: 20, stiffness: 200 });
        isSwipeOpen.value = false;
      }
    });

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: translateX.value }],
  }));

  return (
    <>
      {/* overflow:hidden clips the delete button so it's invisible until card slides */}
      <View style={{ marginBottom: 8, position: 'relative', overflow: 'hidden', borderRadius: 16 }}>
        {/* Delete Button - positioned behind, clipped by parent overflow:hidden */}
        <View
          style={{
            position: 'absolute',
            top: 0,
            right: 0,
            bottom: 0,
            width: 80,
            justifyContent: 'center',
            alignItems: 'center',
            zIndex: 1,
          }}
        >
          <Pressable
            onPress={handleDelete}
            style={{
              width: 70,
              height: '85%',
              backgroundColor: 'rgba(232, 197, 168, 0.15)',
              borderRadius: 12,
              justifyContent: 'center',
              alignItems: 'center',
            }}
          >
            <Trash2 size={20} color={colors.warning} />
            <Text
              style={{
                color: colors.warning,
                fontSize: 11,
                fontWeight: '600',
                marginTop: 4,
              }}
            >
              Delete
            </Text>
          </Pressable>
        </View>

        {/* Swipeable transaction card - on top */}
        <GestureDetector gesture={panGesture}>
          <Animated.View
            style={[
              {
                zIndex: 10,
                position: 'relative',
              },
              animatedStyle,
            ]}
          >
            <Pressable
              onPress={handlePress}
              className="rounded-2xl"
              style={{
                backgroundColor: colors.glassWhite,
                borderWidth: 1,
                borderColor: colors.glassBorder,
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
                      backgroundColor: colors.glassBorder,
                    }}
                  >
                    <Text className="text-xl">{transaction.emoji}</Text>
                  </View>

                  {/* Info */}
                  <View className="flex-1">
                    <View className="flex-row items-center mb-1">
                      <Text
                        className="text-base font-medium mr-2"
                        style={{ color: colors.textWhite }}
                        numberOfLines={1}
                      >
                        {transaction.payee}
                      </Text>
                      {isShared && (
                        <View
                          className="rounded"
                          style={{
                            backgroundColor: 'rgba(168, 181, 161, 0.2)',
                            borderWidth: 1,
                            borderColor: 'rgba(168,181,161,0.3)',
                            paddingHorizontal: 6,
                            paddingVertical: 2,
                          }}
                        >
                          <Text
                            className="text-[9px] font-bold uppercase tracking-wider"
                            style={{ color: colors.sageGreen }}
                          >
                            Shared
                          </Text>
                        </View>
                      )}
                    </View>

                    <View className="flex-row items-center">
                      <Text
                        className="text-xs"
                        style={{ color: colors.textWhiteTertiary }}
                      >
                        {transaction.categoryName}
                        {' \u2022 '}
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
                      color: getAmountColor(transaction.type),
                      fontVariant: ['tabular-nums'],
                    }}
                  >
                    {isIncome ? '+' : '-'}
                    {formatCurrency(transaction.amount)} CHF
                  </Text>
                  {isShared && (
                    <Text
                      className="text-[11px] mt-0.5"
                      style={{ color: colors.textWhiteTertiary }}
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
              backgroundColor: colors.bgDark,
              borderRadius: 24,
              padding: 24,
              width: '100%',
              maxWidth: 400,
              borderWidth: 1,
              borderColor: colors.glassBorder,
            }}
          >
            <Text
              className="text-xl font-bold mb-4"
              style={{ color: colors.textWhite }}
            >
              Delete Transaction
            </Text>

            <View
              className="flex-row items-center rounded-xl mb-4"
              style={{
                backgroundColor: 'rgba(227,160,93,0.1)',
                borderWidth: 1,
                borderColor: 'rgba(227,160,93,0.2)',
                padding: 16,
              }}
            >
              <Text className="text-2xl mr-3">&#x26A0;&#xFE0F;</Text>
              <Text
                className="flex-1 text-sm"
                style={{ color: colors.textWhite }}
              >
                Are you sure you want to delete this transaction?
              </Text>
            </View>

            <View
              className="rounded-xl mb-6"
              style={{
                backgroundColor: colors.glassWhite,
                borderWidth: 1,
                borderColor: colors.glassBorder,
                padding: 16,
              }}
            >
              <View className="flex-row justify-between mb-2">
                <Text className="text-sm" style={{ color: colors.textWhiteTertiary }}>
                  Payee:
                </Text>
                <Text className="text-sm font-semibold" style={{ color: colors.textWhite }}>
                  {transaction.payee}
                </Text>
              </View>
              <View className="flex-row justify-between mb-2">
                <Text className="text-sm" style={{ color: colors.textWhiteTertiary }}>
                  Amount:
                </Text>
                <Text className="text-sm font-semibold" style={{ color: colors.textWhite }}>
                  {formatCurrency(transaction.amount)} CHF
                </Text>
              </View>
              {isShared && (
                <View className="flex-row justify-between">
                  <Text className="text-sm" style={{ color: colors.textWhiteTertiary }}>
                    Type:
                  </Text>
                  <Text className="text-sm font-semibold" style={{ color: colors.sageGreen }}>
                    Shared Expense
                  </Text>
                </View>
              )}
            </View>

            {isShared && (
              <View
                className="rounded-xl mb-4"
                style={{
                  backgroundColor: 'rgba(168,181,161,0.1)',
                  borderWidth: 1,
                  borderColor: 'rgba(168, 181, 161, 0.2)',
                  padding: 12,
                }}
              >
                <Text className="text-xs" style={{ color: colors.textWhiteSecondary }}>
                  This is a shared expense. Deleting it will also remove the debt from your partner.
                </Text>
              </View>
            )}

            <View className="flex-row" style={{ gap: 12 }}>
              <Pressable
                onPress={() => setShowDeleteModal(false)}
                className="flex-1 rounded-xl items-center justify-center"
                style={{
                  backgroundColor: colors.glassBorder,
                  borderWidth: 2,
                  borderColor: 'rgba(255,255,255,0.1)',
                  paddingVertical: 14,
                }}
              >
                <Text
                  className="text-sm font-semibold"
                  style={{ color: colors.textWhite }}
                >
                  Cancel
                </Text>
              </Pressable>

              <Pressable
                onPress={confirmDelete}
                className="flex-1 rounded-xl items-center justify-center"
                style={{
                  backgroundColor: colors.textWhite,
                  borderWidth: 2,
                  borderColor: 'rgba(227,160,93,0.5)',
                  paddingVertical: 14,
                }}
              >
                <Text
                  className="text-sm font-semibold"
                  style={{ color: colors.warning }}
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
