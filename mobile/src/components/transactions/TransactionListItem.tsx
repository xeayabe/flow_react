import React, { useRef, useState, useCallback } from 'react';
import { View, Text, Pressable, Modal, Animated, PanResponder } from 'react-native';
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
  const translateX = useRef(new Animated.Value(0)).current;
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const isOpen = useRef(false);

  const closeSwipe = useCallback(() => {
    Animated.spring(translateX, {
      toValue: 0,
      useNativeDriver: true,
      tension: 100,
      friction: 8,
    }).start();
    isOpen.current = false;
  }, [translateX]);

  const handleDelete = () => {
    setShowDeleteModal(true);
    closeSwipe();
  };

  const confirmDelete = () => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setShowDeleteModal(false);
    if (onDelete) {
      onDelete(transaction.id);
    }
  };

  const handlePress = () => {
    // If swipe is open, close it instead of navigating
    if (isOpen.current) {
      closeSwipe();
      return;
    }
    onClick();
  };

  const panResponder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_evt, gestureState) => {
        const { dx, dy } = gestureState;
        return Math.abs(dx) > Math.abs(dy) && Math.abs(dx) > 10;
      },
      onPanResponderMove: (_evt, gestureState) => {
        if (isOpen.current) {
          // When open, allow closing by swiping right
          const base = -80 + gestureState.dx;
          const clamped = Math.max(Math.min(base, 0), -100);
          translateX.setValue(clamped);
        } else if (gestureState.dx < 0) {
          // Only allow swiping LEFT (negative dx)
          const newValue = Math.max(gestureState.dx, -100);
          translateX.setValue(newValue);
        }
      },
      onPanResponderRelease: (_evt, gestureState) => {
        if (isOpen.current) {
          // If already open: close if swiped right enough, otherwise stay open
          if (gestureState.dx > 30) {
            closeSwipe();
          } else {
            Animated.spring(translateX, {
              toValue: -80,
              useNativeDriver: true,
              tension: 100,
              friction: 8,
            }).start();
          }
        } else if (gestureState.dx < -50) {
          // Snap open to show delete
          Animated.spring(translateX, {
            toValue: -80,
            useNativeDriver: true,
            tension: 100,
            friction: 8,
          }).start();
          isOpen.current = true;
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        } else {
          // Return to center
          closeSwipe();
        }
      },
    })
  ).current;

  return (
    <>
      {/* Outer container clips the delete button so it doesn't show beyond card edges */}
      <View style={{ marginBottom: 8, position: 'relative', overflow: 'hidden', borderRadius: 16 }}>
        {/* Delete Button - Hidden behind the transaction card */}
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

        {/* Transaction Item - Sits on top with OPAQUE background to fully cover delete */}
        <Animated.View
          {...panResponder.panHandlers}
          style={{
            transform: [{ translateX }],
            zIndex: 10,
            position: 'relative',
          }}
        >
          <Pressable
            onPress={handlePress}
            style={{
              borderRadius: 16,
              // Opaque dark background so delete button is fully hidden
              backgroundColor: '#222628',
              borderWidth: 1,
              borderColor: 'rgba(255, 255, 255, 0.08)',
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
                    backgroundColor: 'rgba(255, 255, 255, 0.06)',
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
            {/* Title */}
            <Text
              className="text-xl font-bold mb-4"
              style={{ color: colors.textWhite }}
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
              <Text className="text-2xl mr-3">&#x26A0;&#xFE0F;</Text>
              <Text
                className="flex-1 text-sm"
                style={{ color: colors.textWhite }}
              >
                Are you sure you want to delete this transaction?
              </Text>
            </View>

            {/* Transaction Preview */}
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

            {/* Shared Warning */}
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

            {/* Actions */}
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
