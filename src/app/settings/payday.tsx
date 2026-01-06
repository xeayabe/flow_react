import React, { useState, useEffect } from 'react';
import { View, Text, Pressable, ScrollView, ActivityIndicator, Modal, FlatList } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Stack, router } from 'expo-router';
import { ChevronLeft, X } from 'lucide-react-native';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { db } from '@/lib/db';
import { calculateBudgetPeriod, formatDateSwiss } from '@/lib/payday-utils';
import { cn } from '@/lib/cn';

export default function PaydaySettingsScreen() {
  const queryClient = useQueryClient();
  const { user } = db.useAuth();
  const [selectedPayday, setSelectedPayday] = useState<number>(25);
  const [showPaydayPicker, setShowPaydayPicker] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');

  // Get household info
  const householdQuery = useQuery({
    queryKey: ['household', user?.email],
    queryFn: async () => {
      if (!user?.email) throw new Error('No user email');

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

      const householdsResult = await db.queryOnce({
        households: {
          $: {
            where: {
              createdByUserId: userRecord.id,
            },
          },
        },
      });

      const household = householdsResult.data.households?.[0];
      if (!household) throw new Error('No household found');

      return { userRecord, household };
    },
    enabled: !!user?.email,
  });

  // Initialize form with current payday
  useEffect(() => {
    if (householdQuery.data?.household?.paydayDay) {
      setSelectedPayday(householdQuery.data.household.paydayDay);
    }
  }, [householdQuery.data?.household?.paydayDay]);

  // Calculate current budget period
  const budgetPeriod = calculateBudgetPeriod(selectedPayday);

  // Handle save
  const handleSave = async () => {
    if (!householdQuery.data?.household?.id) return;

    setIsSaving(true);
    try {
      const now = Date.now();
      await db.transact([
        db.tx.households[householdQuery.data.household.id].update({
          paydayDay: selectedPayday,
          payFrequency: 'monthly',
          budgetPeriodStart: budgetPeriod.start,
          budgetPeriodEnd: budgetPeriod.end,
          updatedAt: now,
        }),
      ]);

      setSuccessMessage('Payday saved!');
      setTimeout(() => {
        setSuccessMessage('');
        queryClient.invalidateQueries({ queryKey: ['household', user?.email] });
        router.back();
      }, 1500);
    } catch (error) {
      console.error('Error saving payday:', error);
      alert('Failed to save payday. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  if (householdQuery.isLoading) {
    return (
      <View className="flex-1 bg-white justify-center items-center">
        <ActivityIndicator size="large" color="#006A6A" />
      </View>
    );
  }

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
          title: 'Payday & Budget Period',
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
              {/* Payday Section */}
              <View className="mb-8">
                <Text className="text-sm font-semibold text-gray-700 mb-3">WHEN DO YOU GET PAID?</Text>

                <Pressable
                  onPress={() => setShowPaydayPicker(true)}
                  className="flex-row items-center justify-between p-4 rounded-xl"
                  style={{ backgroundColor: '#F9FAFB', borderWidth: 1, borderColor: '#E5E7EB' }}
                >
                  <View className="flex-1">
                    <Text className="text-gray-600 text-sm mb-1">I get paid on:</Text>
                    <Text className="text-lg font-bold text-gray-900">
                      {selectedPayday === -1 ? 'Last day of month' : `Day ${selectedPayday}`} of each month
                    </Text>
                  </View>
                  <Text className="text-2xl text-gray-400">›</Text>
                </Pressable>
              </View>

              {/* Budget Period Info */}
              <View className="mb-8 p-4 rounded-xl" style={{ backgroundColor: '#F0FDF4', borderWidth: 1, borderColor: '#86EFAC' }}>
                <Text className="text-sm font-semibold text-green-700 mb-3">CURRENT BUDGET PERIOD</Text>

                <View className="mb-3">
                  <Text className="text-xs text-green-600 mb-1">Period:</Text>
                  <Text className="text-base font-semibold text-green-800">
                    {formatDateSwiss(budgetPeriod.start)} - {formatDateSwiss(budgetPeriod.end)}
                  </Text>
                </View>

                <View className="flex-row justify-between">
                  <View className="flex-1">
                    <Text className="text-xs text-green-600 mb-1">Days remaining:</Text>
                    <Text className="text-base font-semibold text-green-800">{budgetPeriod.daysRemaining} days</Text>
                  </View>
                  <View className="flex-1">
                    <Text className="text-xs text-green-600 mb-1">Resets on:</Text>
                    <Text className="text-base font-semibold text-green-800">{formatDateSwiss(budgetPeriod.resetsOn)}</Text>
                  </View>
                </View>
              </View>

              {/* Info Box */}
              <View className="p-4 rounded-xl" style={{ backgroundColor: '#F3F4F6' }}>
                <Text className="text-sm text-gray-700 leading-5">
                  Your budget period starts on your payday and ends the day before your next payday. This aligns your
                  budget with when you receive income.
                </Text>
              </View>
            </View>
          </ScrollView>

          {/* Save Button */}
          <View className="px-6 py-4 border-t border-gray-200">
            <Pressable
              onPress={handleSave}
              disabled={isSaving}
              className={cn(
                'py-3 px-4 rounded-xl items-center justify-center',
                isSaving ? 'bg-gray-300' : 'bg-teal-600'
              )}
            >
              {isSaving ? (
                <ActivityIndicator color="white" />
              ) : (
                <Text className="text-white font-semibold text-base">Save Changes</Text>
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
      <Modal visible={showPaydayPicker} transparent animationType="slide">
        <SafeAreaView className="flex-1 bg-white">
          <View className="flex-row items-center justify-between px-6 py-4 border-b border-gray-200">
            <Text className="text-lg font-bold">Select Payday</Text>
            <Pressable onPress={() => setShowPaydayPicker(false)}>
              <X size={24} color="#006A6A" />
            </Pressable>
          </View>

          <FlatList
            data={paydayOptions}
            keyExtractor={(item) => String(item.value)}
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
        </SafeAreaView>
      </Modal>
    </>
  );
}
