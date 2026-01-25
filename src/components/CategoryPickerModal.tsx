import React, { useState } from 'react';
import { View, Text, Pressable, Modal, TextInput, ScrollView } from 'react-native';
import { X, Search } from 'lucide-react-native';
import { useQuery } from '@tanstack/react-query';
import { db } from '@/lib/db';
import { getMemberBudgetPeriod, getBudgetDetails } from '@/lib/budget-api';
import { getCategoryGroups } from '@/lib/category-groups-api';

interface CategoryPickerModalProps {
  visible: boolean;
  onClose: () => void;
  onSelectCategory: (categoryId: string, categoryName: string) => void;
  userId: string;
  householdId: string;
  currentCategoryId?: string;
  transactionType: 'income' | 'expense';
}

interface CategoryWithStats {
  id: string;
  name: string;
  categoryGroup: string;
  categoryGroupName: string;
  budgetRemaining: number;
  icon?: string;
}

export default function CategoryPickerModal({
  visible,
  onClose,
  onSelectCategory,
  userId,
  householdId,
  currentCategoryId,
  transactionType
}: CategoryPickerModalProps) {
  const [searchQuery, setSearchQuery] = useState('');

  // Load category groups first to map group IDs to friendly names
  const { data: categoryGroups } = useQuery({
    queryKey: ['categoryGroups', householdId, userId],
    queryFn: async () => {
      return getCategoryGroups(householdId, userId);
    },
    enabled: visible && !!householdId && !!userId
  });

  // Load categories with budget remaining
  const { data: categories } = useQuery({
    queryKey: ['categories-with-budget', householdId, userId, transactionType, categoryGroups],
    queryFn: async () => {
      // Get all categories for user and household
      const { data: categoryData } = await db.queryOnce({
        categories: {
          $: {
            where: {
              householdId,
              createdByUserId: userId,
              isActive: true,
              type: transactionType
            }
          }
        }
      });

      // Also get shared/default categories for this household
      const { data: sharedCategoryData } = await db.queryOnce({
        categories: {
          $: {
            where: {
              householdId,
              isShareable: true,
              isActive: true,
              type: transactionType
            }
          }
        }
      });

      // Combine personal and shared categories (avoid duplicates)
      const allCategoriesMap = new Map<string, any>();
      [...(categoryData.categories || []), ...(sharedCategoryData.categories || [])].forEach(cat => {
        if (!allCategoriesMap.has(cat.id)) {
          allCategoriesMap.set(cat.id, cat);
        }
      });

      // Get current budget period and budget details
      const budgetPeriod = await getMemberBudgetPeriod(userId, householdId);
      const budgetDetails = await getBudgetDetails(userId, budgetPeriod.start);

      // Create a map of categoryId -> budgetRemaining
      const budgetMap = new Map<string, number>();
      budgetDetails.forEach(budget => {
        const remaining = budget.allocatedAmount - budget.spentAmount;
        budgetMap.set(budget.categoryId, remaining);
      });

      // Create a map of group key -> group name
      const groupKeyToName: Record<string, string> = {};
      if (categoryGroups) {
        categoryGroups.forEach(group => {
          groupKeyToName[group.key] = group.name;
        });
      }

      // Combine categories with budget remaining
      const categoriesWithStats: CategoryWithStats[] = Array.from(allCategoriesMap.values()).map(cat => {
        const groupKey = cat.categoryGroup || 'other';
        const groupName = groupKeyToName[groupKey] || groupKey; // Use friendly name if available
        const budgetRemaining = budgetMap.get(cat.id) ?? 0;

        return {
          id: cat.id,
          name: cat.name,
          categoryGroup: cat.categoryGroup || 'other',
          categoryGroupName: groupName,
          budgetRemaining,
          icon: cat.icon
        };
      });

      // Sort by budget remaining (most remaining first), then alphabetically
      return categoriesWithStats.sort((a, b) => {
        if (b.budgetRemaining !== a.budgetRemaining) {
          return b.budgetRemaining - a.budgetRemaining;
        }
        return a.name.localeCompare(b.name);
      });
    },
    enabled: visible && !!householdId && !!userId && !!categoryGroups
  });

  // Filter categories based on search
  const filteredCategories = categories?.filter(cat =>
    cat.name.toLowerCase().includes(searchQuery.toLowerCase())
  ) || [];

  const handleSelectCategory = (categoryId: string, categoryName: string) => {
    onSelectCategory(categoryId, categoryName);
    setSearchQuery('');
    onClose();
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <View className="flex-1 bg-white">
        {/* Header */}
        <View className="flex-row items-center justify-between p-4 border-b border-gray-200">
          <Text className="text-xl font-bold">Choose Category</Text>
          <Pressable onPress={onClose} className="p-2">
            <X size={24} color="#374151" />
          </Pressable>
        </View>

        {/* Search Bar */}
        <View className="p-4 border-b border-gray-200">
          <View className="flex-row items-center bg-gray-100 rounded-xl px-3 py-2">
            <Search size={20} color="#6B7280" />
            <TextInput
              value={searchQuery}
              onChangeText={setSearchQuery}
              placeholder="Search categories..."
              autoFocus
              autoCapitalize="words"
              className="flex-1 ml-2 text-base"
            />
            {searchQuery.length > 0 && (
              <Pressable onPress={() => setSearchQuery('')}>
                <X size={20} color="#6B7280" />
              </Pressable>
            )}
          </View>
        </View>

        {/* Category List */}
        <ScrollView className="flex-1">
          {filteredCategories.length > 0 ? (
            <View className="p-4">
              <Text className="text-xs text-gray-500 font-semibold mb-2 uppercase">
                {searchQuery ? 'Matches' : 'Most Budget Remaining'}
              </Text>

              {filteredCategories.map((category) => (
                <Pressable
                  key={category.id}
                  onPress={() => handleSelectCategory(category.id, category.name)}
                  className={`flex-row items-center justify-between p-4 rounded-xl mb-2 ${
                    currentCategoryId === category.id
                      ? 'bg-teal-50 border-2 border-teal-600'
                      : 'bg-gray-50'
                  }`}
                >
                  <View className="flex-row items-center gap-3 flex-1">
                    {category.icon && <Text className="text-2xl">{category.icon}</Text>}
                    <View className="flex-1">
                      <Text className="text-base font-medium text-gray-900">
                        {category.name}
                      </Text>
                      {category.categoryGroupName && (
                        <Text className="text-xs text-gray-500 capitalize">
                          {category.categoryGroupName}
                        </Text>
                      )}
                    </View>
                  </View>
                  {category.budgetRemaining !== undefined && (
                    <Text className="text-xs text-gray-500 ml-2">
                      CHF {category.budgetRemaining.toFixed(2)}
                    </Text>
                  )}
                </Pressable>
              ))}
            </View>
          ) : (
            <View className="p-8 items-center">
              <Text className="text-gray-500 text-center">
                {searchQuery ? 'No matching categories' : 'No categories yet'}
              </Text>
              {searchQuery && (
                <Text className="text-gray-400 text-center text-sm mt-1">
                  Try a different search term
                </Text>
              )}
            </View>
          )}
        </ScrollView>
      </View>
    </Modal>
  );
}
