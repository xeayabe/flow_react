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
import { Stack, router, useLocalSearchParams } from 'expo-router';
import { ChevronLeft, X, Zap } from 'lucide-react-native';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { db } from '@/lib/db';
import { saveBudget, getBudgetDetails, getBudgetSummary, getMemberBudgetPeriod } from '@/lib/budget-api';
import { getCategoryGroups } from '@/lib/category-groups-api';
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
  const params = useLocalSearchParams<{
    groupAllocations?: string;
    monthlyIncome?: string;
  }>();
  const queryClient = useQueryClient();
  const { user } = db.useAuth();
  const [monthlyIncome, setMonthlyIncome] = useState<string>('');
  const [allocations, setAllocations] = useState<Record<string, number>>({});
  const [groupPercentages, setGroupPercentages] = useState<Record<string, number>>({});
  const [editingField, setEditingField] = useState<string | null>(null);
  const [editingValue, setEditingValue] = useState<string>('');
  const [isSaving, setIsSaving] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [showSaveError, setShowSaveError] = useState('');

  // Get passed category group allocations from params
  const passedGroupAllocations = params.groupAllocations
    ? JSON.parse(params.groupAllocations)
    : null;
  const passedIncome = params.monthlyIncome || '';

  // Get user profile and household membership
  const userProfileQuery = useQuery({
    queryKey: ['user-profile', user?.email],
    queryFn: async () => {
      if (!user?.email) throw new Error('No user email');

      const userResult = await db.queryOnce({
        users: { $: { where: { email: user.email } } },
      });

      const userRecord = userResult.data.users?.[0];
      if (!userRecord) throw new Error('User not found');

      // Get household membership
      const memberResult = await db.queryOnce({
        householdMembers: {
          $: { where: { userId: userRecord.id, status: 'active' } },
        },
      });

      const member = memberResult.data.householdMembers?.[0];
      if (!member) throw new Error('No household membership found');

      return { userRecord, member };
    },
    enabled: !!user?.email,
  });

  const userId = userProfileQuery.data?.userRecord?.id;
  const householdId = userProfileQuery.data?.member?.householdId;

  // Get personal budget period
  const budgetPeriodQuery = useQuery({
    queryKey: ['my-budget-period', userId, householdId],
    queryFn: async () => {
      if (!userId || !householdId) throw new Error('Missing user or household');
      return getMemberBudgetPeriod(userId, householdId);
    },
    enabled: !!userId && !!householdId,
  });

  const budgetPeriod = budgetPeriodQuery.data ?? {
    start: calculateBudgetPeriod(25).start,
    end: calculateBudgetPeriod(25).end,
    paydayDay: 25,
    source: 'household' as const,
  };

  const categoriesQuery = useQuery({
    queryKey: ['categories', householdId],
    queryFn: async () => {
      if (!householdId) return [];

      const result = await db.queryOnce({
        categories: {
          $: {
            where: {
              householdId: householdId,
              type: 'expense',
            },
          },
        },
      });

      return result.data.categories || [];
    },
    enabled: !!householdId,
  });

  const categoryGroupsQuery = useQuery({
    queryKey: ['categoryGroups', householdId, userId],
    queryFn: async () => {
      if (!householdId || !userId) return [];
      return getCategoryGroups(householdId, userId);
    },
    enabled: !!householdId && !!userId,
  });

  const existingBudgetQuery = useQuery({
    queryKey: ['budget-edit-details', userId, budgetPeriod.start],
    queryFn: async () => {
      if (!userId) return [];
      return getBudgetDetails(userId, budgetPeriod.start);
    },
    enabled: !!userId,
  });

  // Initialize allocations when categories load
  useEffect(() => {
    if (categoriesQuery.data && categoriesQuery.data.length > 0) {
      const newAllocations: Record<string, number> = {};
      categoriesQuery.data.forEach((cat: any) => {
        newAllocations[cat.id] = 0;
      });
      setAllocations(newAllocations);

      // If there's an existing budget, load those values
      if (existingBudgetQuery.data && existingBudgetQuery.data.length > 0) {
        const existingAllocations: Record<string, number> = {};
        existingBudgetQuery.data.forEach((budget: any) => {
          existingAllocations[budget.categoryId] = budget.allocatedAmount;
        });
        setAllocations(existingAllocations);

        // Also load the monthly income from the budget summary
        if (householdId) {
          // We'll need to fetch the budget summary to get the total income
          const totalAllocated = Object.values(existingAllocations).reduce((sum, amount) => sum + amount, 0);
          // For now, estimate it based on allocation percentage, but we should ideally load from summary
          // This will be updated once we load the summary
        }
      }
    }
  }, [categoriesQuery.data, existingBudgetQuery.data, householdId]);

  // Load monthly income from budget summary if in edit mode - will auto-populate when editing
  const budgetSummaryQuery = useQuery({
    queryKey: ['budget-summary-income', userId, householdId, budgetPeriod.start],
    queryFn: async () => {
      if (!userId || !householdId) return null;
      return getBudgetSummary(userId, householdId, budgetPeriod.start);
    },
    enabled: !!userId && !!householdId,
  });

  useEffect(() => {
    // Initialize with passed income from category group allocation screen
    if (passedIncome && !monthlyIncome) {
      setMonthlyIncome(passedIncome);
    } else if (budgetSummaryQuery.data?.totalIncome && !monthlyIncome) {
      // Load from budget summary (existing budget)
      setMonthlyIncome(budgetSummaryQuery.data.totalIncome.toString());
    }
  }, [budgetSummaryQuery.data?.totalIncome, monthlyIncome, passedIncome]);

  // Calculate group percentages from existing allocations when editing
  useEffect(() => {
    const incomeValue = parseFloat(monthlyIncome) || 0;
    if (existingBudgetQuery.data && existingBudgetQuery.data.length > 0 && incomeValue > 0) {
      const newGroupPercentages: Record<string, number> = {};

      // Get categories to map ID -> group
      const categoryMap: Record<string, string> = {};
      if (categoriesQuery.data) {
        categoriesQuery.data.forEach((cat: any) => {
          categoryMap[cat.id] = cat.categoryGroup || 'other';
        });
      }

      // Calculate total for each group
      const groupTotals: Record<string, number> = {};
      existingBudgetQuery.data.forEach((budget: any) => {
        const group = categoryMap[budget.categoryId] || 'other';
        groupTotals[group] = (groupTotals[group] || 0) + budget.allocatedAmount;
      });

      // Convert group totals to percentages
      Object.entries(groupTotals).forEach(([group, total]) => {
        newGroupPercentages[group] = Math.round((total / incomeValue) * 1000) / 10; // Round to 1 decimal
      });

      setGroupPercentages(newGroupPercentages);
    }
  }, [existingBudgetQuery.data, categoriesQuery.data, monthlyIncome]);

  // Build grouped categories dynamically from category groups
  const buildGroupedCategories = (): GroupedCategories => {
    const grouped: GroupedCategories = {};
    const allGroups = (categoryGroupsQuery.data || []).filter((g) => g.type === 'expense');

    // Initialize groups from database
    allGroups.forEach((group) => {
      grouped[group.key] = {
        group: group.key,
        icon: group.icon || '📂',
        targetPercentage: 0, // Custom groups don't have a target percentage
        categories: [],
      };
    });

    // Add categories to their groups
    if (categoriesQuery.data) {
      categoriesQuery.data.forEach((cat: any) => {
        const group = cat.categoryGroup || 'other';
        if (grouped[group]) {
          grouped[group].categories.push({
            id: cat.id,
            name: cat.name,
            group: cat.categoryGroup,
            allocatedAmount: allocations[cat.id] || 0,
          });
        }
      });
    }

    return grouped;
  };

  const groupedCategories = buildGroupedCategories();

  // Calculate totals
  const income = parseFloat(monthlyIncome) || 0;
  const totalAllocated = Object.values(allocations).reduce((sum, amount) => sum + amount, 0);
  const remaining = Math.max(0, income - totalAllocated);
  const allocatedPercentage = income > 0 ? (totalAllocated / income) * 100 : 0;

  // Handle amount change
  const handleAmountChange = (categoryId: string, newAmount: string) => {
    if (!newAmount) {
      setAllocations((prev) => ({
        ...prev,
        [categoryId]: 0,
      }));
      return;
    }
    const amount = parseFloat(newAmount) || 0;
    const income = parseFloat(monthlyIncome) || 0;

    // Calculate how much is already allocated (excluding this category)
    const otherAllocations = Object.entries(allocations)
      .filter(([id]) => id !== categoryId)
      .reduce((sum, [, value]) => sum + value, 0);

    // Cap the allocation to not exceed income
    const maxAllowable = Math.max(0, income - otherAllocations);
    const cappedAmount = Math.min(Math.max(0, amount), maxAllowable);

    setAllocations((prev) => ({
      ...prev,
      [categoryId]: cappedAmount,
    }));
  };

  // Handle percentage change (relative to group budget, not total income)
  const handlePercentageChange = (categoryId: string, newPercentage: string, groupKey?: string) => {
    if (!newPercentage) {
      setAllocations((prev) => ({
        ...prev,
        [categoryId]: 0,
      }));
      return;
    }
    const percentage = parseFloat(newPercentage) || 0;

    // If groupKey is provided, calculate based on group budget
    if (groupKey) {
      const groupPercentageValue = groupPercentages[groupKey] || 0;
      const income = parseFloat(monthlyIncome) || 0;
      const groupBudgetAmount = calculateAmountFromPercentage(groupPercentageValue, income);
      const amount = calculateAmountFromPercentage(Math.max(0, percentage), groupBudgetAmount);
      setAllocations((prev) => ({
        ...prev,
        [categoryId]: amount,
      }));
    } else {
      // Fallback to total income (shouldn't happen in normal usage)
      const income = parseFloat(monthlyIncome) || 0;
      const amount = calculateAmountFromPercentage(Math.max(0, percentage), income);
      setAllocations((prev) => ({
        ...prev,
        [categoryId]: amount,
      }));
    }
  };

  // Handle group percentage change
  const handleGroupPercentageChange = (groupKey: string, newPercentage: string) => {
    if (!newPercentage) {
      setGroupPercentages((prev) => ({
        ...prev,
        [groupKey]: 0,
      }));
      return;
    }
    const percentage = parseFloat(newPercentage) || 0;
    setGroupPercentages((prev) => ({
      ...prev,
      [groupKey]: Math.max(0, percentage),
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
    if (!householdId || !userId) return;

    if (income === 0) {
      setShowSaveError('Please enter your monthly income');
      return;
    }

    // Check if at least one group percentage is set
    const groupPercentagesSet = Object.values(groupPercentages).filter(p => p > 0);
    if (groupPercentagesSet.length === 0) {
      setShowSaveError('Please set a percentage for at least one category group');
      return;
    }

    // Check if group percentages total 100%
    const totalGroupPercentage = Object.values(groupPercentages).reduce((sum, p) => sum + p, 0);
    if (totalGroupPercentage < 99.99 || totalGroupPercentage > 100.01) {
      setShowSaveError(`Category group percentages must total 100%. Currently: ${Math.round(totalGroupPercentage * 10) / 10}%`);
      return;
    }

    // Filter out zero allocations
    const nonZeroAllocations = Object.fromEntries(
      Object.entries(allocations).filter(([_, amount]) => (amount || 0) > 0)
    );

    if (Object.keys(nonZeroAllocations).length === 0) {
      setShowSaveError('Please allocate at least one category');
      return;
    }

    // Check that total allocations don't exceed income
    const totalAllocated = Object.values(nonZeroAllocations).reduce((sum, amount) => sum + amount, 0);
    if (totalAllocated > income) {
      setShowSaveError(`Total allocations (${totalAllocated.toFixed(2)} CHF) exceed your income (${income.toFixed(2)} CHF)`);
      return;
    }

    // Normalize allocations to ensure they total exactly income (fixing floating-point errors)
    const allocationKeys = Object.keys(nonZeroAllocations);
    const currentTotal = Object.values(nonZeroAllocations).reduce((sum, amount) => sum + amount, 0);
    const roundedTotal = Math.round(currentTotal * 100) / 100;
    const difference = Math.round((income - roundedTotal) * 100) / 100;

    // Apply the difference to the last category to ensure exact total
    const normalizedAllocations = { ...nonZeroAllocations };
    if (allocationKeys.length > 0 && Math.abs(difference) > 0.001) {
      const lastKey = allocationKeys[allocationKeys.length - 1];
      normalizedAllocations[lastKey] = Math.round((normalizedAllocations[lastKey] + difference) * 100) / 100;
    }

    // Also ensure income is properly rounded
    const roundedIncome = Math.round(income * 100) / 100;

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
        userId: userId,
        householdId: householdId,
        totalIncome: roundedIncome,
        allocations: normalizedAllocations,
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
        router.push('/(tabs)/budget');
      }, 1500);
    } catch (error) {
      console.error('Save error:', error);
      setShowSaveError('Failed to save budget. Please try again.');
      setIsSaving(false);
    }
  };

  if (userProfileQuery.isLoading || budgetPeriodQuery.isLoading || categoriesQuery.isLoading || categoryGroupsQuery.isLoading) {
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
            {/* Income Input */}
            <View className="mb-8">
              <Text className="text-sm font-semibold text-gray-700 mb-3">MONTHLY INCOME</Text>
              <View className="relative">
                <TextInput
                  value={monthlyIncome}
                  onChangeText={(text) => {
                    // Allow only numbers and decimal point (support both . and ,)
                    const filtered = text.replace(/[^0-9.,]/g, '').replace(',', '.');
                    // Prevent multiple decimal points
                    const parts = filtered.split('.');
                    if (parts.length > 2) {
                      setMonthlyIncome(parts[0] + '.' + parts.slice(1).join(''));
                    } else {
                      setMonthlyIncome(filtered);
                    }
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
            <View className="mb-8 p-4 rounded-xl" style={{ backgroundColor: '#F0F9FF', borderWidth: 1, borderColor: '#BFDBFE' }}>
              <View className="flex-row justify-between mb-2">
                <View>
                  <Text className="text-xs text-blue-600 mb-1">Monthly Income</Text>
                  <Text className="text-lg font-bold text-blue-900">{income.toFixed(2)} CHF</Text>
                </View>
                <View className="items-end">
                  <Text className="text-xs text-blue-600 mb-1">Group Allocation</Text>
                  <Text className="text-lg font-bold text-blue-900">{Object.values(groupPercentages).reduce((sum, p) => sum + p, 0).toFixed(1)}%</Text>
                </View>
              </View>
              <View className="h-2 bg-blue-200 rounded-full overflow-hidden">
                <View
                  className="h-full bg-blue-600"
                  style={{ width: `${Math.min(100, Object.values(groupPercentages).reduce((sum, p) => sum + p, 0))}%` }}
                />
              </View>
              <Text className="text-xs text-blue-600 mt-2">
                Set percentages for each category group to total 100%
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
            {(categoryGroupsQuery.data || [])
              .filter((g) => g.type === 'expense')
              .sort((a, b) => (a.displayOrder || 0) - (b.displayOrder || 0))
              .map((categoryGroup) => {
                const group = groupedCategories[categoryGroup.key];
                const hasCategories = group && group.categories && group.categories.length > 0;

                // Show group even if it has no categories yet
                const groupPercentageValue = groupPercentages[categoryGroup.key] || 0;
                const groupBudgetAmount = calculateAmountFromPercentage(groupPercentageValue, income);
                const groupTotal = group ? group.categories.reduce((sum, cat) => sum + cat.allocatedAmount, 0) : 0;
                const groupActualPercentage = income > 0 ? (groupTotal / income) * 100 : 0;
                const isGroupOverBudget = groupTotal > groupBudgetAmount;
                const isEditingGroupPercentage = editingField === `group-percentage-${categoryGroup.key}`;

                return (
                  <View key={categoryGroup.key} className="mb-8">
                    {/* Group Header with Percentage Input */}
                    <View className="mb-4 pb-4 border-b border-gray-200">
                      <View className="flex-row items-center gap-2 mb-3">
                        <Text className="text-xl">{categoryGroup.icon || '📂'}</Text>
                        <View className="flex-1">
                          <Text className="text-sm font-semibold text-gray-700 uppercase">
                            {categoryGroup.name}
                          </Text>
                        </View>
                      </View>

                      {/* Group Percentage and Amount Input */}
                      <View className="flex-row gap-2">
                        <View className="flex-1">
                          <TextInput
                            value={isEditingGroupPercentage ? editingValue : (groupPercentageValue > 0 ? groupPercentageValue.toString() : '')}
                            onChangeText={(text) => {
                              const filtered = text.replace(/[^0-9.,]/g, '').replace(',', '.');
                              const parts = filtered.split('.');
                              const cleanValue = parts.length > 2
                                ? parts[0] + '.' + parts.slice(1).join('')
                                : filtered;
                              setEditingValue(cleanValue);
                              handleGroupPercentageChange(categoryGroup.key, cleanValue);
                            }}
                            onFocus={() => {
                              setEditingField(`group-percentage-${categoryGroup.key}`);
                              setEditingValue(groupPercentageValue > 0 ? groupPercentageValue.toString() : '');
                            }}
                            onBlur={() => {
                              setEditingField(null);
                              setEditingValue('');
                            }}
                            placeholder="0"
                            placeholderTextColor="#D1D5DB"
                            keyboardType="decimal-pad"
                            className="px-3 py-2 rounded-lg text-sm font-semibold text-gray-900 bg-gray-50"
                            style={{ borderWidth: 1, borderColor: '#E5E7EB' }}
                          />
                          <Text className="text-xs text-gray-500 mt-1">Budget %</Text>
                        </View>
                        <View className="flex-1">
                          <View className="px-3 py-2 rounded-lg bg-blue-50" style={{ borderWidth: 1, borderColor: '#BFDBFE' }}>
                            <Text className="text-sm font-semibold text-blue-900">
                              {groupBudgetAmount.toFixed(2)}
                            </Text>
                          </View>
                          <Text className="text-xs text-gray-500 mt-1">Budget CHF</Text>
                        </View>
                        <View className="flex-1">
                          <View className={cn('px-3 py-2 rounded-lg', isGroupOverBudget ? 'bg-red-50' : 'bg-green-50')} style={{ borderWidth: 1, borderColor: isGroupOverBudget ? '#FECACA' : '#BBFBEE' }}>
                            <Text className={cn('text-sm font-semibold', isGroupOverBudget ? 'text-red-900' : 'text-green-900')}>
                              {groupTotal.toFixed(2)}
                            </Text>
                          </View>
                          <Text className="text-xs text-gray-500 mt-1">Used CHF</Text>
                        </View>
                      </View>

                      {isGroupOverBudget && (
                        <View className="mt-2 p-2 bg-red-50 rounded-lg">
                          <Text className="text-xs text-red-600 font-medium">
                            Over budget by {(groupTotal - groupBudgetAmount).toFixed(2)} CHF
                          </Text>
                        </View>
                      )}
                    </View>

                    {/* Categories in Group */}
                    <View>
                      {hasCategories ? (
                        group!.categories.map((category) => {
                          const amount = allocations[category.id] || 0;
                          // Calculate percentage relative to the group's budget, not total income
                          const percentage = groupBudgetAmount > 0 ? calculatePercentage(amount, groupBudgetAmount) : 0;
                          const isEditingAmount = editingField === `amount-${category.id}`;
                          const isEditingPercentage = editingField === `percentage-${category.id}`;
                          const isOverGroupBudget = amount > groupBudgetAmount;

                          return (
                            <View key={category.id} className="mb-5">
                              <View className="flex-row items-center gap-3 mb-2">
                                <View className="flex-1">
                                  <Text className="text-sm font-semibold text-gray-900">{category.name}</Text>
                                </View>
                                <Text className="text-xs font-medium text-gray-500">{percentage.toFixed(1)}%</Text>
                              </View>

                              {/* Dual Input Row */}
                              <View className="flex-row gap-2">
                            <View className="flex-1">
                              <TextInput
                                value={isEditingAmount ? editingValue : (amount > 0 ? amount.toFixed(2) : '')}
                                onChangeText={(text) => {
                                  // Allow only numbers and decimal point
                                  const filtered = text.replace(/[^0-9.,]/g, '').replace(',', '.');
                                  // Prevent multiple decimal points
                                  const parts = filtered.split('.');
                                  const cleanValue = parts.length > 2
                                    ? parts[0] + '.' + parts.slice(1).join('')
                                    : filtered;
                                  setEditingValue(cleanValue);
                                  handleAmountChange(category.id, cleanValue);
                                }}
                                onFocus={() => {
                                  setEditingField(`amount-${category.id}`);
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
                                style={{ borderWidth: 1, borderColor: isOverGroupBudget ? '#FCA5A5' : '#E5E7EB' }}
                              />
                              <Text className="text-xs text-gray-500 mt-0.5">CHF</Text>
                            </View>

                            <View className="flex-1">
                              <TextInput
                                value={isEditingPercentage ? editingValue : (percentage > 0 ? percentage.toFixed(1) : '')}
                                onChangeText={(text) => {
                                  // Allow only numbers and decimal point
                                  const filtered = text.replace(/[^0-9.,]/g, '').replace(',', '.');
                                  // Prevent multiple decimal points
                                  const parts = filtered.split('.');
                                  const cleanValue = parts.length > 2
                                    ? parts[0] + '.' + parts.slice(1).join('')
                                    : filtered;
                                  setEditingValue(cleanValue);
                                  handlePercentageChange(category.id, cleanValue, categoryGroup.key);
                                }}
                                onFocus={() => {
                                  setEditingField(`percentage-${category.id}`);
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
                                style={{ borderWidth: 1, borderColor: isOverGroupBudget ? '#FCA5A5' : '#E5E7EB' }}
                              />
                              <Text className="text-xs text-gray-500 mt-0.5">%</Text>
                            </View>
                          </View>

                          {/* Progress Bar */}
                          <View className="mt-2 h-2 bg-gray-200 rounded-full overflow-hidden">
                            <View
                              className={cn('h-full', isOverGroupBudget ? 'bg-red-500' : 'bg-teal-500')}
                              style={{ width: `${Math.min(100, percentage)}%` }}
                            />
                          </View>
                        </View>
                      );
                    })
                      ) : (
                        <View className="p-3 bg-gray-50 rounded-lg">
                          <Text className="text-xs text-gray-500">No categories assigned to this group yet</Text>
                        </View>
                      )}
                    </View>
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
