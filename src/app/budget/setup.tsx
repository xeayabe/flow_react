import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  Pressable,
  TextInput,
  ActivityIndicator,
  FlatList,
  Modal,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Stack, router } from 'expo-router';
import { ChevronLeft, X, Zap } from 'lucide-react-native';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { db } from '@/lib/db';
import { saveBudget } from '@/lib/budget-api';
import { calculateBudgetPeriod, formatDateSwiss } from '@/lib/payday-utils';
import { calculatePercentage, calculateAmountFromPercentage, autoBalanceRemaining, apply503020Split } from '@/lib/budget-utils';
import { cn } from '@/lib/cn';

interface CategoryWithAllocation {
  id: string;
  name: string;
  group: string;
  allocatedAmount: number;
}

interface GroupedCategories {
  [key: string]: {
    group: string;
    icon: string;
    targetPercentage: number;
    categories: CategoryWithAllocation[];
  };
}

export default function BudgetSetupScreen() {
  const queryClient = useQueryClient();
  const { user } = db.useAuth();
  const [monthlyIncome, setMonthlyIncome] = useState<string>('');
  const [allocations, setAllocations] = useState<Record<string, number>>({});
  const [isSaving, setIsSaving] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [showSaveError, setShowSaveError] = useState('');

  // Get household and categories
  const householdQuery = useQuery({
    queryKey: ['household', user?.email],
    queryFn: async () => {
      if (!user?.email) throw new Error('No user email');

      const userResult = await db.queryOnce({
        users: { $: { where: { email: user.email } } },
      });

      const userRecord = userResult.data.users?.[0];
      if (!userRecord) throw new Error('User not found');

      const householdsResult = await db.queryOnce({
        households: { $: { where: { createdByUserId: userRecord.id } } },
      });

      const household = householdsResult.data.households?.[0];
      if (!household) throw new Error('No household found');

      return { userRecord, household };
    },
    enabled: !!user?.email,
  });

  const categoriesQuery = useQuery({
    queryKey: ['categories', householdQuery.data?.household?.id],
    queryFn: async () => {
      if (!householdQuery.data?.household?.id) return [];

      const result = await db.queryOnce({
        categories: {
          $: {
            where: {
              householdId: householdQuery.data.household.id,
              type: 'expense',
            },
          },
        },
      });

      return result.data.categories || [];
    },
    enabled: !!householdQuery.data?.household?.id,
  });

  // Initialize allocations when categories load
  useEffect(() => {
    if (categoriesQuery.data && categoriesQuery.data.length > 0) {
      const newAllocations: Record<string, number> = {};
      categoriesQuery.data.forEach((cat: any) => {
        newAllocations[cat.id] = 0;
      });
      setAllocations(newAllocations);
    }
  }, [categoriesQuery.data]);

  // Group categories by type
  const groupedCategories: GroupedCategories = {
    needs: {
      group: 'needs',
      icon: '🏠',
      targetPercentage: 50,
      categories: [],
    },
    wants: {
      group: 'wants',
      icon: '🎭',
      targetPercentage: 30,
      categories: [],
    },
    savings: {
      group: 'savings',
      icon: '💎',
      targetPercentage: 20,
      categories: [],
    },
  };

  if (categoriesQuery.data) {
    categoriesQuery.data.forEach((cat: any) => {
      const group = cat.categoryGroup || 'other';
      if (groupedCategories[group]) {
        groupedCategories[group].categories.push({
          id: cat.id,
          name: cat.name,
          group: cat.categoryGroup,
          allocatedAmount: allocations[cat.id] || 0,
        });
      }
    });
  }

  // Calculate totals
  const income = parseFloat(monthlyIncome) || 0;
  const totalAllocated = Object.values(allocations).reduce((sum, amount) => sum + amount, 0);
  const remaining = Math.max(0, income - totalAllocated);
  const allocatedPercentage = income > 0 ? (totalAllocated / income) * 100 : 0;

  // Handle amount change
  const handleAmountChange = (categoryId: string, newAmount: string) => {
    const amount = parseFloat(newAmount) || 0;
    setAllocations((prev) => ({
      ...prev,
      [categoryId]: Math.max(0, amount),
    }));
  };

  // Handle percentage change
  const handlePercentageChange = (categoryId: string, newPercentage: string) => {
    const percentage = parseFloat(newPercentage) || 0;
    const amount = calculateAmountFromPercentage(Math.max(0, percentage), income);
    setAllocations((prev) => ({
      ...prev,
      [categoryId]: amount,
    }));
  };

  // Auto-balance remaining
  const handleAutoBalance = () => {
    if (remaining <= 0 || income === 0) return;
    const balanced = autoBalanceRemaining(allocations, remaining, income);
    setAllocations(balanced);
  };

  // Apply 50/30/20 split
  const handleApply503020 = () => {
    if (income === 0) return;

    const categories = (categoriesQuery.data || []).map((cat: any) => ({
      id: cat.id,
      group: cat.categoryGroup || 'other',
    }));

    const split = apply503020Split(categories, income);
    setAllocations(split);
  };

  // Save budget
  const handleSave = async () => {
    if (!householdQuery.data?.household?.id || !householdQuery.data?.userRecord?.id) return;

    if (income === 0) {
      setShowSaveError('Please enter your monthly income');
      return;
    }

    const allocPercentage = (totalAllocated / income) * 100;
    if (allocPercentage < 99.99 || allocPercentage > 100.01) {
      setShowSaveError(`Budget must total 100%. Currently: ${Math.round(allocPercentage * 10) / 10}%`);
      return;
    }

    setIsSaving(true);
    setShowSaveError('');

    try {
      // Create category group map
      const categoryGroups: Record<string, string> = {};
      if (categoriesQuery.data) {
        categoriesQuery.data.forEach((cat: any) => {
          categoryGroups[cat.id] = cat.categoryGroup || 'other';
        });
      }

      const result = await saveBudget({
        userId: householdQuery.data.userRecord.id,
        householdId: householdQuery.data.household.id,
        totalIncome: income,
        allocations,
        categoryGroups,
      });

      if (!result.success) {
        setShowSaveError(result.error || 'Failed to save budget');
        setIsSaving(false);
        return;
      }

      setSuccessMessage('✓ Budget saved!');
      setTimeout(() => {
        queryClient.invalidateQueries({ queryKey: ['budget-summary'] });
        queryClient.invalidateQueries({ queryKey: ['budget-details'] });
        router.push('/budget');
      }, 1500);
    } catch (error) {
      console.error('Save error:', error);
      setShowSaveError('Failed to save budget. Please try again.');
      setIsSaving(false);
    }
  };

  const paydayDay = householdQuery.data?.household?.paydayDay ?? 25;
  const budgetPeriod = calculateBudgetPeriod(paydayDay);

  if (householdQuery.isLoading || categoriesQuery.isLoading) {
    return (
      <View className="flex-1 bg-white justify-center items-center">
        <ActivityIndicator size="large" color="#006A6A" />
      </View>
    );
  }

  return (
    <>
      <Stack.Screen
        options={{
          title: 'Set Up Your Budget',
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

      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} className="flex-1">
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 100 }}>
          <View className="px-6 py-6">
            {/* Income Input */}
            <View className="mb-8">
              <Text className="text-sm font-semibold text-gray-700 mb-3">MONTHLY INCOME</Text>
              <View className="relative">
                <TextInput
                  value={monthlyIncome}
                  onChangeText={setMonthlyIncome}
                  placeholder="5000"
                  placeholderTextColor="#D1D5DB"
                  keyboardType="decimal-pad"
                  className="p-4 rounded-xl text-2xl font-bold text-gray-900"
                  style={{ backgroundColor: '#F9FAFB', borderWidth: 1, borderColor: '#E5E7EB' }}
                />
                <Text className="absolute right-4 top-4 text-2xl font-bold text-gray-400">CHF</Text>
              </View>
            </View>

            {/* Allocation Status */}
            <View className="mb-8 p-4 rounded-xl" style={{ backgroundColor: '#F0F9FF', borderWidth: 1, borderColor: '#BFDBFE' }}>
              <View className="flex-row justify-between mb-2">
                <View>
                  <Text className="text-xs text-blue-600 mb-1">Monthly Income</Text>
                  <Text className="text-lg font-bold text-blue-900">{income.toFixed(2)} CHF</Text>
                </View>
                <View className="items-end">
                  <Text className="text-xs text-blue-600 mb-1">Allocated</Text>
                  <Text className="text-lg font-bold text-blue-900">{totalAllocated.toFixed(2)} CHF</Text>
                </View>
              </View>
              <View className="h-2 bg-blue-200 rounded-full overflow-hidden">
                <View
                  className="h-full bg-blue-600"
                  style={{ width: `${Math.min(100, (totalAllocated / income) * 100)}%` }}
                />
              </View>
              <Text className="text-xs text-blue-600 mt-2">
                {allocatedPercentage.toFixed(1)}% • {remaining.toFixed(2)} CHF remaining
              </Text>
            </View>

            {/* Quick Action Buttons */}
            <View className="flex-row gap-3 mb-8">
              <Pressable
                onPress={handleApply503020}
                disabled={income === 0}
                className={cn('flex-1 py-2 px-3 rounded-lg flex-row items-center justify-center gap-1', income === 0 ? 'bg-gray-200' : 'bg-teal-50')}
              >
                <Zap size={16} color={income === 0 ? '#9CA3AF' : '#0D9488'} />
                <Text className={cn('text-sm font-semibold', income === 0 ? 'text-gray-500' : 'text-teal-600')}>50/30/20</Text>
              </Pressable>

              <Pressable
                onPress={handleAutoBalance}
                disabled={remaining <= 0 || income === 0}
                className={cn('flex-1 py-2 px-3 rounded-lg items-center justify-center', remaining <= 0 || income === 0 ? 'bg-gray-200' : 'bg-amber-50')}
              >
                <Text className={cn('text-sm font-semibold', remaining <= 0 || income === 0 ? 'text-gray-500' : 'text-amber-600')}>Auto-Balance</Text>
              </Pressable>
            </View>

            {/* Category Groups */}
            {['needs', 'wants', 'savings'].map((groupKey) => {
              const group = groupedCategories[groupKey];
              const groupTotal = group.categories.reduce((sum, cat) => sum + cat.allocatedAmount, 0);
              const groupPercentage = income > 0 ? (groupTotal / income) * 100 : 0;

              return (
                <View key={groupKey} className="mb-8">
                  {/* Group Header */}
                  <View className="mb-4 pb-3 border-b border-gray-200">
                    <View className="flex-row items-center justify-between">
                      <View className="flex-row items-center gap-2">
                        <Text className="text-xl">{group.icon}</Text>
                        <View>
                          <Text className="text-sm font-semibold text-gray-700 uppercase">
                            {groupKey} ({group.targetPercentage}%)
                          </Text>
                          <Text className="text-xs text-gray-500 mt-0.5">
                            {groupTotal.toFixed(2)} CHF ({groupPercentage.toFixed(1)}%)
                          </Text>
                        </View>
                      </View>
                    </View>
                  </View>

                  {/* Categories in Group */}
                  {group.categories.map((category) => {
                    const amount = category.allocatedAmount;
                    const percentage = income > 0 ? calculatePercentage(amount, income) : 0;
                    const percentageStr = percentage.toFixed(1);

                    return (
                      <View key={category.id} className="mb-5">
                        <View className="flex-row items-center gap-3 mb-2">
                          <View className="flex-1">
                            <Text className="text-sm font-semibold text-gray-900">{category.name}</Text>
                          </View>
                          <Text className="text-xs font-medium text-gray-500">{percentageStr}%</Text>
                        </View>

                        {/* Dual Input Row */}
                        <View className="flex-row gap-2">
                          <View className="flex-1">
                            <TextInput
                              value={amount > 0 ? amount.toFixed(2) : ''}
                              onChangeText={(text) => handleAmountChange(category.id, text)}
                              placeholder="0.00"
                              placeholderTextColor="#D1D5DB"
                              keyboardType="decimal-pad"
                              className="px-3 py-2 rounded-lg text-sm font-semibold text-gray-900 bg-gray-50"
                              style={{ borderWidth: 1, borderColor: '#E5E7EB' }}
                            />
                            <Text className="text-xs text-gray-500 mt-0.5">CHF</Text>
                          </View>

                          <View className="flex-1">
                            <TextInput
                              value={percentage > 0 ? percentageStr : ''}
                              onChangeText={(text) => handlePercentageChange(category.id, text)}
                              placeholder="0.0"
                              placeholderTextColor="#D1D5DB"
                              keyboardType="decimal-pad"
                              className="px-3 py-2 rounded-lg text-sm font-semibold text-gray-900 bg-gray-50"
                              style={{ borderWidth: 1, borderColor: '#E5E7EB' }}
                            />
                            <Text className="text-xs text-gray-500 mt-0.5">%</Text>
                          </View>
                        </View>

                        {/* Progress Bar */}
                        <View className="mt-2 h-2 bg-gray-200 rounded-full overflow-hidden">
                          <View
                            className="h-full bg-teal-500"
                            style={{ width: `${Math.min(100, percentage)}%` }}
                          />
                        </View>
                      </View>
                    );
                  })}
                </View>
              );
            })}

            {/* Period Info */}
            <View className="p-4 rounded-xl bg-gray-50 mb-4">
              <Text className="text-xs text-gray-600 mb-2">Budget Period</Text>
              <Text className="text-sm font-semibold text-gray-900">
                {formatDateSwiss(budgetPeriod.start)} - {formatDateSwiss(budgetPeriod.end)}
              </Text>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>

      {/* Save Button */}
      <View className="px-6 py-4 bg-white border-t border-gray-200">
        {showSaveError && (
          <View className="mb-3 p-3 bg-red-50 rounded-lg">
            <Text className="text-sm text-red-600 font-medium">{showSaveError}</Text>
          </View>
        )}

        <Pressable
          onPress={handleSave}
          disabled={isSaving || income === 0}
          className={cn(
            'py-3 px-4 rounded-xl items-center justify-center',
            isSaving || income === 0 ? 'bg-gray-300' : 'bg-teal-600'
          )}
        >
          {isSaving ? (
            <ActivityIndicator color="white" />
          ) : (
            <Text className="text-white font-semibold text-base">Save Budget</Text>
          )}
        </Pressable>

        {successMessage && (
          <View className="mt-3 p-3 bg-green-50 rounded-lg">
            <Text className="text-sm text-green-600 font-medium text-center">{successMessage}</Text>
          </View>
        )}
      </View>
    </>
  );
}
