import React, { useState, useCallback, useRef, useEffect } from 'react';
import { View, Text, Pressable } from 'react-native';
import Animated, { FadeIn, FadeOut, useSharedValue, useAnimatedStyle, withSpring, runOnJS } from 'react-native-reanimated';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import * as Haptics from 'expo-haptics';
import { ChevronRight, Trash2 } from 'lucide-react-native';
import { format, parseISO } from 'date-fns';
import { colors, getAmountColor, formatCurrency } from '@/lib/design-tokens';

// Shared close registry — only one item open at a time
type CloseCallback = () => void;
let activeCloseCallback: CloseCallback | null = null;

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
  onDelete?: (id: string, isRecurring: boolean) => void;
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

interface SwipeableItemProps {
  transaction: RecurringTransaction;
  onPress: () => void;
  onDelete: () => void;
  borderTop: boolean;
}

function SwipeableItem({ transaction, onPress, onDelete, borderTop }: SwipeableItemProps) {
  const translateX = useSharedValue(0);
  const isSwipeOpen = useSharedValue(false);

  const closeSwipe = useCallback(() => {
    translateX.value = withSpring(0, { damping: 20, stiffness: 200 });
    isSwipeOpen.value = false;
    if (activeCloseCallback === closeSwipeRef.current) {
      activeCloseCallback = null;
    }
  }, [translateX, isSwipeOpen]);

  const closeSwipeRef = useRef(closeSwipe);
  closeSwipeRef.current = closeSwipe;

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
    closeOtherSwipe();
    translateX.value = withSpring(-80, { damping: 20, stiffness: 200 });
    isSwipeOpen.value = true;
    activeCloseCallback = closeSwipeRef.current;
  }, [translateX, isSwipeOpen, closeOtherSwipe]);

  const handleDelete = useCallback(() => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    closeSwipe();
    onDelete();
  }, [closeSwipe, onDelete]);

  const handlePress = useCallback(() => {
    if (isSwipeOpen.value) {
      closeSwipe();
      return;
    }
    if (activeCloseCallback) {
      activeCloseCallback();
      activeCloseCallback = null;
      return;
    }
    onPress();
  }, [isSwipeOpen, closeSwipe, onPress]);

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

  const deleteButtonStyle = useAnimatedStyle(() => ({
    opacity: translateX.value < -5 ? 1 : 0,
    pointerEvents: (translateX.value < -5 ? 'auto' : 'none') as 'auto' | 'none',
  }));

  return (
    <View style={{ position: 'relative', overflow: 'hidden' }}>
      {/* Delete Button */}
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
          <Trash2 size={20} color="#E8C5A8" strokeWidth={2} />
        </Pressable>
      </Animated.View>

      {/* Swipeable Content */}
      <GestureDetector gesture={panGesture}>
        <Animated.View style={animatedStyle}>
          <Pressable
            onPress={handlePress}
            style={{
              borderTopWidth: borderTop ? 1 : 0,
              borderTopColor: colors.glassBorder,
              padding: 14,
              paddingHorizontal: 16,
              backgroundColor: colors.glassWhite,
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
        </Animated.View>
      </GestureDetector>
    </View>
  );
}

export default function RecurringSection({ recurringTransactions, onEdit, onDelete }: RecurringSectionProps) {
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
            <SwipeableItem
              key={transaction.id}
              transaction={transaction}
              onPress={() => onEdit(transaction.id)}
              onDelete={() => onDelete?.(transaction.id, transaction.isRecurring)}
              borderTop={true}
            />
          ))}
        </Animated.View>
      )}
    </View>
  );
}
