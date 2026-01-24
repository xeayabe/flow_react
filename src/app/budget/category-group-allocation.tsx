import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  Pressable,
  TextInput,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Stack, router } from 'expo-router';
import { ChevronLeft, AlertCircle } from 'lucide-react-native';
import { useQuery } from '@tanstack/react-query';
import { db } from '@/lib/db';
import { getUserProfileAndHousehold } from '@/lib/household-utils';
import { getCategoryGroups } from '@/lib/category-groups-api';
import { calculatePercentage, calculateAmountFromPercentage } from '@/lib/budget-utils';
import { cn } from '@/lib/cn';

interface CategoryGroupState {
  [key: string]: number;
}

export default function CategoryGroupAllocationScreen() {
  const { user } = db.useAuth();
  const [monthlyIncome, setMonthlyIncome] = useState<string>('');
  const [groupAllocations, setGroupAllocations] = useState<CategoryGroupState>({});
  const [editingField, setEditingField] = useState<string | null>(null);
  const [editingValue, setEditingValue] = useState<string>('');
  const [errorMessage, setErrorMessage] = useState('');

  // Get user profile and household (works for both admin and members)
  const householdQuery = useQuery({
    queryKey: ['user-household', user?.email],
    queryFn: async () => {
      if (!user?.email) throw new Error('No user email');
      const result = await getUserProfileAndHousehold(user.email);
      if (!result) throw new Error('No household found');
      console.log('[Budget Setup] User household loaded:', { email: user.email, householdId: result.householdId, userId: result.userRecord?.id });
      return result;
    },
    enabled: !!user?.email,
  });

  const householdId = householdQuery.data?.householdId;
  const userId = householdQuery.data?.userRecord?.id;

  // Get category groups from DB
  const categoryGroupsQuery = useQuery({
    queryKey: ['categoryGroups', householdId, userId],
    queryFn: async () => {
      if (!householdId || !userId) return [];
      const groups = await getCategoryGroups(householdId, userId);
      console.log('[Budget Setup] category groups loaded:', { householdId, userId, groupCount: groups.length, groups: groups.map(g => ({ key: g.key, name: g.name, type: g.type })) });
      return groups;
    },
    enabled: !!householdId && !!userId,
  });

  // Get expense groups only, sorted by displayOrder
  const expenseGroups = (categoryGroupsQuery.data || [])
    .filter((g) => g.type === 'expense')
    .sort((a, b) => (a.displayOrder || 0) - (b.displayOrder || 0));

  // Parse income value
  const income = parseFloat(monthlyIncome) || 0;

  // Calculate totals
  const totalAllocated = Object.values(groupAllocations).reduce((sum, amount) => sum + amount, 0);
  const remaining = Math.max(0, income - totalAllocated);
  const allocatedPercentage = income > 0 ? (totalAllocated / income) * 100 : 0;

  // Handle amount change
  const handleAmountChange = (groupKey: string, newAmount: string) => {
    if (!newAmount) {
      setGroupAllocations((prev) => ({
        ...prev,
        [groupKey]: 0,
      }));
      setErrorMessage('');
      return;
    }
    const amount = parseFloat(newAmount) || 0;
    setGroupAllocations((prev) => ({
      ...prev,
      [groupKey]: Math.max(0, amount),
    }));
    setErrorMessage('');
  };

  // Handle percentage change
  const handlePercentageChange = (groupKey: string, newPercentage: string) => {
    if (!newPercentage) {
      setGroupAllocations((prev) => ({
        ...prev,
        [groupKey]: 0,
      }));
      setErrorMessage('');
      return;
    }
    const percentage = parseFloat(newPercentage) || 0;
    const amount = calculateAmountFromPercentage(Math.max(0, percentage), income);
    setGroupAllocations((prev) => ({
      ...prev,
      [groupKey]: amount,
    }));
    setErrorMessage('');
  };

  // Validate and continue
  const handleContinue = () => {
    if (income === 0) {
      setErrorMessage('Please enter your monthly income');
      return;
    }

    // Check if at least one group has allocation
    if (totalAllocated === 0) {
      setErrorMessage('Please allocate at least one category group');
      return;
    }

    // Check if allocation is exactly 100% (with tolerance)
    if (allocatedPercentage < 99.99 || allocatedPercentage > 100.01) {
      setErrorMessage(
        `Category group allocation must total 100%. Currently: ${Math.round(allocatedPercentage * 10) / 10}%`
      );
      return;
    }

    // Pass data to next step
    const params = {
      monthlyIncome: income.toString(),
      groupAllocations: JSON.stringify(groupAllocations),
    };

    router.push({
      pathname: '/budget/setup',
      params,
    });
  };

  // Apply equal split across all expense groups
  const handleApplyEqualSplit = () => {
    if (income === 0) {
      setErrorMessage('Please enter your monthly income first');
      return;
    }
    if (expenseGroups.length === 0) {
      setErrorMessage('No expense groups found');
      return;
    }

    const perGroup = income / expenseGroups.length;
    const newAllocations: CategoryGroupState = {};
    expenseGroups.forEach((group) => {
      newAllocations[group.key] = perGroup;
    });
    setGroupAllocations(newAllocations);
    setErrorMessage('');
  };

  if (householdQuery.isLoading || categoryGroupsQuery.isLoading) {
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
          title: 'Budget Setup',
          headerLeft: () => (
            <Pressable onPress={() => router.back()} className="mr-4">
              <ChevronLeft size={24} color="#006A6A" />
            </Pressable>
          ),
        }}
      />

      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} className="flex-1">
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 100 }}>
          <View className="px-6 py-6">
            {/* Title */}
            <Text className="text-3xl font-bold text-gray-900 mb-2">Budget Allocation</Text>
            <Text className="text-sm text-gray-600 mb-8">
              Allocate your income across your category groups. The total must equal 100%.
            </Text>

            {/* Income Input */}
            <View className="mb-8">
              <Text className="text-sm font-semibold text-gray-700 mb-3">MONTHLY INCOME</Text>
              <View className="relative">
                <TextInput
                  value={monthlyIncome}
                  onChangeText={(text) => {
                    const filtered = text.replace(/[^0-9.,]/g, '').replace(',', '.');
                    const parts = filtered.split('.');
                    if (parts.length > 2) {
                      setMonthlyIncome(parts[0] + '.' + parts.slice(1).join(''));
                    } else {
                      setMonthlyIncome(filtered);
                    }
                    setErrorMessage('');
                  }}
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
            {income > 0 && (
              <View className="mb-8 p-4 rounded-xl" style={{ backgroundColor: '#F0F9FF', borderWidth: 1, borderColor: '#BFDBFE' }}>
                <View className="flex-row justify-between mb-2">
                  <View>
                    <Text className="text-xs text-blue-600 mb-1">Total Income</Text>
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
                <Text className={cn('text-xs mt-2', allocatedPercentage >= 99.99 && allocatedPercentage <= 100.01 ? 'text-green-600 font-semibold' : 'text-blue-600')}>
                  {allocatedPercentage.toFixed(1)}% • {remaining.toFixed(2)} CHF
                  {allocatedPercentage >= 99.99 && allocatedPercentage <= 100.01 && ' ✓'}
                </Text>
              </View>
            )}

            {/* Quick Action Buttons */}
            {income > 0 && (
              <View className="flex-row gap-3 mb-8">
                <Pressable
                  onPress={handleApplyEqualSplit}
                  className="flex-1 py-2 px-3 rounded-lg bg-amber-50"
                >
                  <Text className="text-sm font-semibold text-amber-600 text-center">Equal Split</Text>
                </Pressable>
              </View>
            )}

            {/* Error Message */}
            {errorMessage && (
              <View className="mb-6 p-4 bg-red-50 rounded-lg border border-red-200 flex-row gap-3">
                <AlertCircle size={20} color="#DC2626" />
                <Text className="flex-1 text-sm text-red-700">{errorMessage}</Text>
              </View>
            )}

            {/* Category Groups from DB */}
            <View className="mb-8">
              <Text className="text-sm font-semibold text-gray-700 mb-4 uppercase">Budget Categories</Text>

              {expenseGroups.length === 0 ? (
                <View className="p-4 bg-amber-50 rounded-lg border border-amber-200">
                  <Text className="text-sm text-amber-800 text-center mb-3">
                    You need to create expense category groups first.
                  </Text>
                  <Pressable
                    onPress={() => {
                      router.push('/settings/category-groups');
                    }}
                    className="py-2 px-4 rounded-lg bg-amber-600 items-center"
                  >
                    <Text className="text-sm font-semibold text-white">
                      Create Category Groups
                    </Text>
                  </Pressable>
                </View>
              ) : (
                expenseGroups.map((group) => {
                  const amount = groupAllocations[group.key] || 0;
                  const percentage = income > 0 ? calculatePercentage(amount, income) : 0;
                  const isEditingAmount = editingField === `amount-${group.key}`;
                  const isEditingPercentage = editingField === `percentage-${group.key}`;

                  return (
                    <View key={group.key} className="mb-6">
                      {/* Group Header */}
                      <View className="flex-row items-center gap-2 mb-3">
                        <Text className="text-2xl">{group.icon || '📂'}</Text>
                        <View className="flex-1">
                          <Text className="text-sm font-semibold text-gray-900">{group.name}</Text>
                          <Text className="text-xs text-gray-500">
                            {amount > 0 ? `${percentage.toFixed(1)}%` : 'Not allocated'}
                          </Text>
                        </View>
                      </View>

                      {/* Dual Input Row */}
                      <View className="flex-row gap-2">
                        <View className="flex-1">
                          <TextInput
                            value={
                              isEditingAmount
                                ? editingValue
                                : amount > 0
                                  ? amount.toFixed(2)
                                  : ''
                            }
                            onChangeText={(text) => {
                              const filtered = text.replace(/[^0-9.,]/g, '').replace(',', '.');
                              const parts = filtered.split('.');
                              const cleanValue =
                                parts.length > 2 ? parts[0] + '.' + parts.slice(1).join('') : filtered;
                              setEditingValue(cleanValue);
                              handleAmountChange(group.key, cleanValue);
                            }}
                            onFocus={() => {
                              setEditingField(`amount-${group.key}`);
                              setEditingValue(amount > 0 ? amount.toString() : '');
                            }}
                            onBlur={() => {
                              setEditingField(null);
                              setEditingValue('');
                            }}
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
                            value={
                              isEditingPercentage
                                ? editingValue
                                : percentage > 0
                                  ? percentage.toFixed(1)
                                  : ''
                            }
                            onChangeText={(text) => {
                              const filtered = text.replace(/[^0-9.,]/g, '').replace(',', '.');
                              const parts = filtered.split('.');
                              const cleanValue =
                                parts.length > 2 ? parts[0] + '.' + parts.slice(1).join('') : filtered;
                              setEditingValue(cleanValue);
                              handlePercentageChange(group.key, cleanValue);
                            }}
                            onFocus={() => {
                              setEditingField(`percentage-${group.key}`);
                              setEditingValue(percentage > 0 ? percentage.toString() : '');
                            }}
                            onBlur={() => {
                              setEditingField(null);
                              setEditingValue('');
                            }}
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
                })
              )}
            </View>

            {/* Continue Button */}
            <View className="gap-3">
              <Pressable
                onPress={handleContinue}
                disabled={income === 0 || allocatedPercentage < 99.99 || allocatedPercentage > 100.01}
                className={cn(
                  'py-4 rounded-xl items-center justify-center',
                  income === 0 || allocatedPercentage < 99.99 || allocatedPercentage > 100.01
                    ? 'bg-gray-300'
                    : 'bg-teal-600'
                )}
              >
                <Text
                  className={cn(
                    'text-base font-semibold',
                    income === 0 || allocatedPercentage < 99.99 || allocatedPercentage > 100.01
                      ? 'text-gray-500'
                      : 'text-white'
                  )}
                >
                  Continue to Category Details
                </Text>
              </Pressable>

              <Pressable onPress={() => router.back()} className="py-3 rounded-lg items-center justify-center bg-gray-100">
                <Text className="text-base font-semibold text-gray-700">Cancel</Text>
              </Pressable>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </>
  );
}
