import React, { useState, useEffect } from 'react';
import { View, Text, Pressable, ScrollView, ActivityIndicator, Modal, FlatList, Alert } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { ArrowLeft, X, AlertCircle, Calendar, Info } from 'lucide-react-native';
import Animated, { FadeIn, FadeInDown, useSharedValue } from 'react-native-reanimated';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { db } from '@/lib/db';
import { formatDateSwiss } from '@/lib/payday-utils';
import { getCurrentBudgetPeriod } from '@/lib/budget-period-utils';
import { colors, spacing, borderRadius } from '@/lib/design-tokens';

export default function PaydaySettingsScreen() {
  const insets = useSafeAreaInsets();
  const queryClient = useQueryClient();
  const { user } = db.useAuth();
  const [selectedPayday, setSelectedPayday] = useState<number | null>(null);
  const [showPaydayPicker, setShowPaydayPicker] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');

  // Get current member's data (personal payday)
  const memberQuery = useQuery({
    queryKey: ['member-payday', user?.email],
    queryFn: async () => {
      if (!user?.email) throw new Error('No user email');

      // Get user profile
      const userResult = await db.queryOnce({
        users: {
          $: {
            where: {
              email: user.email,
            },
          },
        },
      });

      const userRecord = userResult.data.users?.[0];
      if (!userRecord) throw new Error('User not found');

      // Get household membership with personal budget fields
      const memberResult = await db.queryOnce({
        householdMembers: {
          $: {
            where: {
              userId: userRecord.id,
              status: 'active',
            },
          },
        },
      });

      const member = memberResult.data.householdMembers?.[0];
      if (!member) throw new Error('No household membership found');

      return { userRecord, member };
    },
    enabled: !!user?.email,
  });

  // Initialize form with current payday
  useEffect(() => {
    if (memberQuery.data?.member?.paydayDay && selectedPayday === null) {
      setSelectedPayday(memberQuery.data.member.paydayDay);
    }
  }, [memberQuery.data?.member?.paydayDay]);

  // Calculate budget period based on selected payday - use new dynamic utility
  const budgetPeriod = selectedPayday ? getCurrentBudgetPeriod(selectedPayday) : null;

  // Save mutation - Updates paydayDay and recalculates budget spent amounts
  const saveMutation = useMutation({
    mutationFn: async (paydayDay: number) => {
      if (!memberQuery.data?.member?.id) throw new Error('No member ID');
      if (!memberQuery.data?.userRecord?.id) throw new Error('No user ID');
      if (!memberQuery.data?.member?.householdId) throw new Error('No household ID');

      console.log('💾 Saving payday change:', {
        paydayDay,
        memberId: memberQuery.data.member.id,
        userId: memberQuery.data.userRecord.id,
      });

      // Step 1: Update the payday setting
      await db.transact([
        db.tx.householdMembers[memberQuery.data.member.id].update({
          paydayDay,
        }),
      ]);

      // Step 2: Recalculate budget spent amounts with the NEW payday
      // This ensures all budget spentAmount values reflect the correct period
      const { getCurrentBudgetPeriod } = await import('../../lib/budget-period-utils');
      const { recalculateBudgetSpentAmounts } = await import('../../lib/budget-api');

      const newPeriod = getCurrentBudgetPeriod(paydayDay);
      console.log('📊 Recalculating budgets for new period:', {
        periodStart: newPeriod.periodStartISO,
        periodEnd: newPeriod.periodEndISO,
      });

      await recalculateBudgetSpentAmounts(
        memberQuery.data.userRecord.id,
        newPeriod.periodStartISO,
        newPeriod.periodEndISO
      );

      return { paydayDay };
    },
    onSuccess: () => {
      setSuccessMessage('Payday saved!');

      // Invalidate all budget-related queries to trigger recalculation with new payday
      queryClient.invalidateQueries({ queryKey: ['member-payday'] });
      queryClient.invalidateQueries({ queryKey: ['my-budget-period'] });
      queryClient.invalidateQueries({ queryKey: ['budget-summary'] });
      queryClient.invalidateQueries({ queryKey: ['budget-details'] });
      queryClient.invalidateQueries({ queryKey: ['budgets'] });

      setTimeout(() => {
        setSuccessMessage('');
        router.back();
      }, 1500);
    },
    onError: (error) => {
      console.error('Error saving payday:', error);
      Alert.alert('Error', 'Failed to save payday. Please try again.');
    },
  });

  // Handle save
  const handleSave = () => {
    if (!selectedPayday) {
      Alert.alert('Required', 'Please select your payday');
      return;
    }
    saveMutation.mutate(selectedPayday);
  };

  if (memberQuery.isLoading) {
    return (
      <LinearGradient
        colors={[colors.contextDark, colors.contextTeal]}
        start={{ x: 0, y: 0 }}
        end={{ x: 0, y: 1 }}
        style={{ flex: 1, paddingTop: insets.top }}
      >
        <View className="flex-1 items-center justify-center">
          <Animated.View entering={FadeIn.duration(500)}>
            <Text className="text-4xl mb-4">📅</Text>
          </Animated.View>
          <Text style={{ color: colors.textWhiteSecondary }} className="text-sm">
            Loading payday settings...
          </Text>
        </View>
      </LinearGradient>
    );
  }

  const currentMember = memberQuery.data?.member;
  const hasPaydaySet = currentMember?.paydayDay != null;

  const paydayOptions = [
    { label: 'Last day of month', value: -1 },
    ...Array.from({ length: 31 }, (_, i) => ({
      label: `Day ${i + 1}`,
      value: i + 1,
    })),
  ];

  return (
    <>
      <LinearGradient
        colors={[colors.contextDark, colors.contextTeal]}
        start={{ x: 0, y: 0 }}
        end={{ x: 0, y: 1 }}
        style={{ flex: 1 }}
      >
        {/* Header */}
        <View
          className="flex-row items-center px-5 pb-4"
          style={{ paddingTop: insets.top + 16 }}
        >
          <Pressable
            onPress={() => router.back()}
            style={{
              width: 40,
              height: 40,
              borderRadius: borderRadius.sm,
              backgroundColor: colors.glassWhite,
              borderWidth: 1,
              borderColor: colors.glassBorder,
              alignItems: 'center',
              justifyContent: 'center',
              marginRight: 16,
            }}
          >
            <ArrowLeft size={20} color={colors.textWhite} strokeWidth={2} />
          </Pressable>
          <Text className="text-white text-xl font-semibold">My Payday</Text>
        </View>

        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{
            paddingBottom: insets.bottom + 24,
            paddingHorizontal: 20,
          }}
        >
          {/* Description */}
          <Animated.View entering={FadeInDown.delay(0).duration(400)}>
            <Text
              style={{ color: colors.textWhiteSecondary }}
              className="text-sm mb-6"
            >
              When do you receive your monthly salary?
            </Text>
          </Animated.View>

          {/* Current Setting (if exists) */}
          {hasPaydaySet && (
            <Animated.View entering={FadeInDown.delay(200).duration(400)}>
              <View
                style={{
                  backgroundColor: 'rgba(168, 181, 161, 0.1)',
                  borderWidth: 1,
                  borderColor: 'rgba(168, 181, 161, 0.2)',
                  borderRadius: borderRadius.lg,
                  padding: 16,
                  marginBottom: 16,
                }}
              >
                <Text style={{ color: colors.sageGreen }} className="font-semibold mb-1">
                  Current Setting
                </Text>
                <Text style={{ color: colors.textWhiteSecondary }} className="text-sm">
                  Day {currentMember.paydayDay === -1 ? 'Last day' : currentMember.paydayDay} of each month
                </Text>
              </View>
            </Animated.View>
          )}

          {/* No payday set message */}
          {!hasPaydaySet && (
            <Animated.View entering={FadeInDown.delay(200).duration(400)}>
              <View
                style={{
                  backgroundColor: 'rgba(227, 160, 93, 0.1)',
                  borderWidth: 1,
                  borderColor: 'rgba(227, 160, 93, 0.3)',
                  borderRadius: borderRadius.lg,
                  padding: 16,
                  marginBottom: 16,
                }}
              >
                <View className="flex-row items-start gap-2">
                  <AlertCircle size={18} color={colors.softAmber} />
                  <View className="flex-1">
                    <Text style={{ color: colors.softAmber }} className="font-semibold mb-1">
                      Payday Not Set
                    </Text>
                    <Text style={{ color: colors.textWhiteSecondary }} className="text-sm">
                      Please set your payday to start tracking your personal budget cycle.
                    </Text>
                  </View>
                </View>
              </View>
            </Animated.View>
          )}

          {/* Payday Selection */}
          <Animated.View entering={FadeInDown.delay(300).duration(400)}>
            <Text
              style={{ color: colors.sageGreen }}
              className="text-xs font-semibold mb-3"
            >
              WHEN DO YOU GET PAID?
            </Text>

            <Pressable
              onPress={() => setShowPaydayPicker(true)}
              style={{
                backgroundColor: colors.glassWhite,
                borderWidth: 1,
                borderColor: colors.glassBorder,
                borderRadius: borderRadius.lg,
                padding: 16,
                marginBottom: 16,
              }}
            >
              <View className="flex-row items-center justify-between">
                <View className="flex-1">
                  <Text style={{ color: colors.textWhiteSecondary }} className="text-sm mb-1">
                    I get paid on:
                  </Text>
                  <Text style={{ color: colors.textWhite }} className="text-lg font-bold">
                    {selectedPayday === null
                      ? 'Select your payday'
                      : selectedPayday === -1
                        ? 'Last day of month'
                        : `Day ${selectedPayday}`}{' '}
                    {selectedPayday !== null && 'of each month'}
                  </Text>
                </View>
                <Calendar size={20} color={colors.textWhiteSecondary} />
              </View>
            </Pressable>
          </Animated.View>

          {/* Budget Period Preview */}
          {budgetPeriod && (
            <Animated.View entering={FadeInDown.delay(400).duration(400)}>
              <View
                style={{
                  backgroundColor: 'rgba(168, 181, 161, 0.1)',
                  borderWidth: 1,
                  borderColor: 'rgba(168, 181, 161, 0.2)',
                  borderRadius: borderRadius.lg,
                  padding: 16,
                  marginBottom: 16,
                }}
              >
                <Text
                  style={{ color: colors.sageGreen }}
                  className="text-xs font-semibold mb-3"
                >
                  YOUR BUDGET PERIOD
                </Text>

                <View className="mb-3">
                  <Text
                    style={{ color: colors.textWhiteSecondary }}
                    className="text-xs mb-1"
                  >
                    Period:
                  </Text>
                  <Text style={{ color: colors.textWhite }} className="text-base font-semibold">
                    {formatDateSwiss(budgetPeriod.periodStartISO)} - {formatDateSwiss(budgetPeriod.periodEndISO)}
                  </Text>
                </View>

                <View className="flex-row justify-between">
                  <View className="flex-1">
                    <Text
                      style={{ color: colors.textWhiteSecondary }}
                      className="text-xs mb-1"
                    >
                      Days remaining:
                    </Text>
                    <Text style={{ color: colors.textWhite }} className="text-base font-semibold">
                      {budgetPeriod.daysRemaining} days
                    </Text>
                  </View>
                  <View className="flex-1">
                    <Text
                      style={{ color: colors.textWhiteSecondary }}
                      className="text-xs mb-1"
                    >
                      Resets on:
                    </Text>
                    <Text style={{ color: colors.textWhite }} className="text-base font-semibold">
                      {formatDateSwiss(budgetPeriod.nextResetISO)}
                    </Text>
                  </View>
                </View>
              </View>
            </Animated.View>
          )}

          {/* Info Box */}
          <Animated.View entering={FadeInDown.delay(500).duration(400)}>
            <View
              style={{
                backgroundColor: 'rgba(168, 181, 161, 0.1)',
                borderWidth: 1,
                borderColor: 'rgba(168, 181, 161, 0.2)',
                borderRadius: borderRadius.lg,
                padding: 16,
                marginBottom: 16,
              }}
            >
              <View className="flex-row items-start gap-3">
                <Info size={18} color={colors.sageGreen} />
                <View className="flex-1">
                  <Text
                    style={{ color: colors.sageGreen }}
                    className="font-semibold mb-1"
                  >
                    Your Personal Budget Cycle
                  </Text>
                  <Text
                    style={{ color: colors.textWhiteSecondary }}
                    className="text-sm leading-5"
                  >
                    Your budget period starts on your payday and ends the day before your next payday.
                    This is separate from your household partner's budget cycle - each person can have a different payday!
                  </Text>
                </View>
              </View>
            </View>
          </Animated.View>

          {/* Save Button */}
          <Animated.View entering={FadeInDown.delay(600).duration(400)}>
            <Pressable
              onPress={handleSave}
              disabled={saveMutation.isPending || !selectedPayday}
              style={{
                backgroundColor:
                  saveMutation.isPending || !selectedPayday
                    ? 'rgba(255,255,255,0.1)'
                    : 'rgba(168, 181, 161, 0.3)',
                borderWidth: 1,
                borderColor: saveMutation.isPending || !selectedPayday ? 'transparent' : 'rgba(168, 181, 161, 0.5)',
                borderRadius: borderRadius.md,
                paddingVertical: 14,
                alignItems: 'center',
                justifyContent: 'center',
                opacity: saveMutation.isPending || !selectedPayday ? 0.5 : 1,
              }}
            >
              {saveMutation.isPending ? (
                <ActivityIndicator color={colors.textWhite} />
              ) : (
                <Text
                  style={{ color: colors.textWhite }}
                  className="font-semibold text-base"
                >
                  Save
                </Text>
              )}
            </Pressable>
          </Animated.View>
        </ScrollView>

        {/* Success Message */}
        {successMessage && (
          <Animated.View
            entering={FadeIn.duration(200)}
            style={{
              position: 'absolute',
              bottom: insets.bottom + 100,
              left: 20,
              right: 20,
              backgroundColor: 'rgba(168, 181, 161, 0.95)',
              borderRadius: borderRadius.md,
              padding: 16,
            }}
          >
            <Text
              style={{ color: colors.textWhite }}
              className="font-semibold text-center"
            >
              ✓ {successMessage}
            </Text>
          </Animated.View>
        )}
      </LinearGradient>

      {/* Payday Picker Modal */}
      <Modal visible={showPaydayPicker} transparent={false} animationType="slide">
        <LinearGradient
          colors={[colors.contextDark, colors.contextTeal]}
          start={{ x: 0, y: 0 }}
          end={{ x: 0, y: 1 }}
          style={{ flex: 1 }}
        >
          <View
            style={{
              paddingTop: insets.top + 16,
              paddingHorizontal: 20,
              paddingBottom: 16,
              borderBottomWidth: 1,
              borderBottomColor: colors.glassBorder,
            }}
          >
            <View className="flex-row items-center justify-between">
              <Text style={{ color: colors.textWhite }} className="text-lg font-bold">
                Select Your Payday
              </Text>
              <Pressable
                onPress={() => setShowPaydayPicker(false)}
                style={{
                  width: 32,
                  height: 32,
                  borderRadius: 16,
                  backgroundColor: colors.glassWhite,
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <X size={18} color={colors.textWhite} />
              </Pressable>
            </View>
          </View>

          <FlatList
            data={paydayOptions}
            keyExtractor={(item) => String(item.value)}
            contentContainerStyle={{ paddingBottom: 40 }}
            renderItem={({ item }) => (
              <Pressable
                onPress={() => {
                  setSelectedPayday(item.value);
                  setShowPaydayPicker(false);
                }}
                style={{
                  paddingHorizontal: 20,
                  paddingVertical: 16,
                  borderBottomWidth: 1,
                  borderBottomColor: colors.glassBorder,
                  backgroundColor:
                    selectedPayday === item.value ? colors.glassWhite : 'transparent',
                }}
              >
                <View className="flex-row items-center justify-between">
                  <Text
                    style={{
                      color: selectedPayday === item.value ? colors.sageGreen : colors.textWhite,
                      fontWeight: selectedPayday === item.value ? '600' : '400',
                      fontSize: 16,
                    }}
                  >
                    {item.label}
                  </Text>
                  {selectedPayday === item.value && (
                    <Text style={{ color: colors.sageGreen }} className="text-lg">
                      ✓
                    </Text>
                  )}
                </View>
              </Pressable>
            )}
          />
        </LinearGradient>
      </Modal>
    </>
  );
}
