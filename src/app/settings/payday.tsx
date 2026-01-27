import React, { useState, useEffect } from 'react';
import { View, Text, Pressable, ScrollView, ActivityIndicator, Modal, FlatList, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Stack, router } from 'expo-router';
import { ChevronLeft, X } from 'lucide-react-native';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { db } from '@/lib/db';
import { formatDateSwiss } from '@/lib/payday-utils';
import { getCurrentBudgetPeriod } from '@/lib/budget-period-utils';
import { cn } from '@/lib/cn';

export default function PaydaySettingsScreen() {
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

  // Save mutation - SIMPLIFIED
  // Just updates paydayDay - period is calculated dynamically, no need for complex reset logic
  const saveMutation = useMutation({
    mutationFn: async (paydayDay: number) => {
      if (!memberQuery.data?.member?.id) throw new Error('No member ID');
      if (!memberQuery.data?.userRecord?.id) throw new Error('No user ID');
      if (!memberQuery.data?.member?.householdId) throw new Error('No household ID');

      console.log('💾 Saving payday change:', {
        paydayDay,
        memberId: memberQuery.data.member.id,
      });

      // SIMPLE: Just update the payday setting
      // The period is ALWAYS calculated dynamically from paydayDay
      // No need to store periodStart/periodEnd or reset budgets
      await db.transact([
        db.tx.householdMembers[memberQuery.data.member.id].update({
          paydayDay,
          payFrequency: 'monthly',
        }),
      ]);

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
      <View className="flex-1 bg-white justify-center items-center">
        <ActivityIndicator size="large" color="#006A6A" />
      </View>
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
      <Stack.Screen
        options={{
          title: 'My Payday',
          headerLeft: () => (
            <Pressable onPress={() => router.back()} className="mr-4">
              <ChevronLeft size={24} color="#006A6A" />
            </Pressable>
          ),
          headerStyle: { backgroundColor: '#FFFFFF' },
          headerTintColor: '#006A6A',
          headerTitleStyle: { fontSize: 18, fontWeight: '600' },
        }}
      />

      <View className="flex-1 bg-white">
        <SafeAreaView edges={['bottom']} className="flex-1">
          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 32 }}>
            <View className="px-6 py-6">
              {/* Header */}
              <View className="mb-6">
                <Text className="text-2xl font-bold text-gray-900 mb-2">Set Your Payday</Text>
                <Text className="text-gray-600">
                  When do you receive your monthly salary?
                </Text>
              </View>

              {/* Current Setting (if exists) */}
              {hasPaydaySet && (
                <View className="bg-teal-50 p-4 rounded-xl mb-6 border border-teal-100">
                  <Text className="text-teal-900 font-semibold mb-1">Current Setting</Text>
                  <Text className="text-teal-700">
                    Day {currentMember.paydayDay === -1 ? 'Last day' : currentMember.paydayDay} of each month
                  </Text>
                  {currentMember.budgetPeriodStart && currentMember.budgetPeriodEnd && (
                    <Text className="text-teal-600 text-sm mt-1">
                      Period: {formatDateSwiss(currentMember.budgetPeriodStart)} - {formatDateSwiss(currentMember.budgetPeriodEnd)}
                    </Text>
                  )}
                </View>
              )}

              {/* No payday set message */}
              {!hasPaydaySet && (
                <View className="bg-amber-50 p-4 rounded-xl mb-6 border border-amber-200">
                  <Text className="text-amber-900 font-semibold mb-1">⚠️ Payday Not Set</Text>
                  <Text className="text-amber-700 text-sm">
                    Please set your payday to start tracking your personal budget cycle.
                  </Text>
                </View>
              )}

              {/* Payday Selection */}
              <View className="mb-6">
                <Text className="text-sm font-semibold text-gray-700 mb-3">WHEN DO YOU GET PAID?</Text>

                <Pressable
                  onPress={() => setShowPaydayPicker(true)}
                  className="flex-row items-center justify-between p-4 rounded-xl"
                  style={{ backgroundColor: '#F9FAFB', borderWidth: 1, borderColor: '#E5E7EB' }}
                >
                  <View className="flex-1">
                    <Text className="text-gray-600 text-sm mb-1">I get paid on:</Text>
                    <Text className="text-lg font-bold text-gray-900">
                      {selectedPayday === null
                        ? 'Select your payday'
                        : selectedPayday === -1
                          ? 'Last day of month'
                          : `Day ${selectedPayday}`}{' '}
                      {selectedPayday !== null && 'of each month'}
                    </Text>
                  </View>
                  <Text className="text-2xl text-gray-400">›</Text>
                </Pressable>
              </View>

              {/* Budget Period Preview */}
              {budgetPeriod && (
                <View className="mb-6 p-4 rounded-xl" style={{ backgroundColor: '#F0FDF4', borderWidth: 1, borderColor: '#86EFAC' }}>
                  <Text className="text-sm font-semibold text-green-700 mb-3">YOUR BUDGET PERIOD</Text>

                  <View className="mb-3">
                    <Text className="text-xs text-green-600 mb-1">Period:</Text>
                    <Text className="text-base font-semibold text-green-800">
                      {formatDateSwiss(budgetPeriod.periodStartISO)} - {formatDateSwiss(budgetPeriod.periodEndISO)}
                    </Text>
                  </View>

                  <View className="flex-row justify-between">
                    <View className="flex-1">
                      <Text className="text-xs text-green-600 mb-1">Days remaining:</Text>
                      <Text className="text-base font-semibold text-green-800">{budgetPeriod.daysRemaining} days</Text>
                    </View>
                    <View className="flex-1">
                      <Text className="text-xs text-green-600 mb-1">Resets on:</Text>
                      <Text className="text-base font-semibold text-green-800">{formatDateSwiss(budgetPeriod.nextResetISO)}</Text>
                    </View>
                  </View>
                </View>
              )}

              {/* Info Box */}
              <View className="p-4 rounded-xl" style={{ backgroundColor: '#EFF6FF', borderWidth: 1, borderColor: '#BFDBFE' }}>
                <Text className="text-sm font-semibold text-blue-900 mb-2">💡 Your Personal Budget Cycle</Text>
                <Text className="text-sm text-blue-700 leading-5">
                  Your budget period starts on your payday and ends the day before your next payday.
                  This is separate from your household partner's budget cycle - each person can have a different payday!
                </Text>
              </View>
            </View>
          </ScrollView>

          {/* Save Button */}
          <View className="px-6 py-4 border-t border-gray-200">
            <Pressable
              onPress={handleSave}
              disabled={saveMutation.isPending || !selectedPayday}
              className={cn(
                'py-4 px-4 rounded-xl items-center justify-center',
                saveMutation.isPending || !selectedPayday ? 'bg-gray-300' : 'bg-teal-600'
              )}
            >
              {saveMutation.isPending ? (
                <ActivityIndicator color="white" />
              ) : (
                <Text className="text-white font-semibold text-base">Save Payday</Text>
              )}
            </Pressable>
          </View>

          {/* Success Message */}
          {successMessage && (
            <View className="absolute bottom-20 left-6 right-6 bg-green-500 p-4 rounded-lg">
              <Text className="text-white font-semibold text-center">✓ {successMessage}</Text>
            </View>
          )}
        </SafeAreaView>
      </View>

      {/* Payday Picker Modal */}
      <Modal visible={showPaydayPicker} transparent={false} animationType="slide">
        <View className="flex-1 bg-white">
          <SafeAreaView edges={['top']} className="bg-white">
            <View className="flex-row items-center justify-between px-6 py-4 border-b border-gray-200">
              <Text className="text-lg font-bold">Select Your Payday</Text>
              <Pressable onPress={() => setShowPaydayPicker(false)}>
                <X size={24} color="#006A6A" />
              </Pressable>
            </View>
          </SafeAreaView>

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
                className={cn(
                  'px-6 py-4 border-b border-gray-100 flex-row items-center justify-between',
                  selectedPayday === item.value && 'bg-teal-50'
                )}
              >
                <Text
                  className={cn(
                    'text-base',
                    selectedPayday === item.value ? 'font-bold text-teal-600' : 'font-normal text-gray-900'
                  )}
                >
                  {item.label}
                </Text>
                {selectedPayday === item.value && <Text className="text-teal-600 text-lg">✓</Text>}
              </Pressable>
            )}
          />
        </View>
      </Modal>
    </>
  );
}
