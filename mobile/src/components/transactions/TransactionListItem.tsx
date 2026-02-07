import React, { useCallback, useRef, useEffect } from 'react';
import { View, Text, Pressable } from 'react-native';
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

// Shared close registry — only one item open at a time
type CloseCallback = () => void;
let activeCloseCallback: CloseCallback | null = null;

export function closeActiveSwipe() {
  if (activeCloseCallback) {
    activeCloseCallback();
    activeCloseCallback = null;
  }
}

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

  const closeSwipe = useCallback(() => {
    translateX.value = withSpring(0, { damping: 20, stiffness: 200 });
    isSwipeOpen.value = false;
    // Clear from active if this was the active one
    if (activeCloseCallback === closeSwipeRef.current) {
      activeCloseCallback = null;
    }
  }, [translateX, isSwipeOpen]);

  // Stable ref so the module-level variable always points to the latest closure
  const closeSwipeRef = useRef(closeSwipe);
  closeSwipeRef.current = closeSwipe;

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (activeCloseCallback === closeSwipeRef.current) {
        activeCloseCallback = null;
      }
    };
  }, []);

  const clearActive = useCallback(() => {
    if (activeCloseCallback === closeSwipeRef.current) {
      activeCloseCallback = null;
    }
  }, []);

  const closeOtherSwipe = useCallback(() => {
    if (activeCloseCallback && activeCloseCallback !== closeSwipeRef.current) {
      activeCloseCallback();
    }
  }, []);

  const openSwipe = useCallback(() => {
    // Close any other open item first
    closeOtherSwipe();
    translateX.value = withSpring(-80, { damping: 20, stiffness: 200 });
    isSwipeOpen.value = true;
    activeCloseCallback = closeSwipeRef.current;
  }, [translateX, isSwipeOpen, closeOtherSwipe]);

  const handleDelete = useCallback(() => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    closeSwipe();
    onDelete?.(transaction.id);
  }, [closeSwipe, onDelete, transaction.id]);

  const handlePress = useCallback(() => {
    // If this item's swipe is open, close it
    if (isSwipeOpen.value) {
      closeSwipe();
      return;
    }
    // If any other item's swipe is open, close it first — don't navigate
    if (activeCloseCallback) {
      activeCloseCallback();
      activeCloseCallback = null;
      return;
    }
    onClick();
  }, [isSwipeOpen, closeSwipe, onClick]);

  const panGesture = Gesture.Pan()
    .activeOffsetX([-20, 20])
    .failOffsetY([-15, 15])
    .onStart(() => {
      runOnJS(closeOtherSwipe)();
    })
    .onUpdate((event) => {
      if (isSwipeOpen.value) {
        const val = -80 + event.translationX;
        translateX.value = Math.max(Math.min(val, 0), -100);
      } else {
        if (event.translationX < 0) {
          translateX.value = Math.max(event.translationX, -100);
        }
      }
    })
    .onEnd((event) => {
      if (isSwipeOpen.value) {
        if (event.translationX > 30) {
          translateX.value = withSpring(0, { damping: 20, stiffness: 200 });
          isSwipeOpen.value = false;
          runOnJS(clearActive)();
        } else {
          translateX.value = withSpring(-80, { damping: 20, stiffness: 200 });
        }
      } else if (event.translationX < -50) {
        runOnJS(openSwipe)();
        runOnJS(Haptics.impactAsync)(Haptics.ImpactFeedbackStyle.Light);
      } else {
        translateX.value = withSpring(0, { damping: 20, stiffness: 200 });
        isSwipeOpen.value = false;
      }
    });

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: translateX.value }],
  }));

  // Delete button only visible when card has moved
  const deleteButtonStyle = useAnimatedStyle(() => ({
    opacity: translateX.value < -5 ? 1 : 0,
    pointerEvents: (translateX.value < -5 ? 'auto' : 'none') as 'auto' | 'none',
  }));

  return (
    <>
      <View style={{ marginBottom: 8, position: 'relative', borderRadius: 16 }}>
        {/* Delete Button - hidden until card slides */}
        <Animated.View
          style={[
            {
              position: 'absolute',
              top: 0,
              right: 0,
              bottom: 0,
              width: 80,
              justifyContent: 'center',
              alignItems: 'center',
              zIndex: 1,
            },
            deleteButtonStyle,
          ]}
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
        </Animated.View>

        {/* Swipeable transaction card */}
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
                        {transaction.walletName && (
                          <>
                            {' \u2022 '}
                            {transaction.walletName}
                          </>
                        )}
                        {isShared && (
                          <>
                            {' \u2022 '}
                            {transaction.paidByYou ? 'You paid' : `${transaction.partnerName} paid`}
                          </>
                        )}
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
    </>
  );
}
