import React, { useState } from 'react';
import { View, Text, Pressable, ScrollView, Modal, TextInput } from 'react-native';
import { ChevronRight, X, Search, Check } from 'lucide-react-native';
import Animated, { FadeIn, FadeOut, SlideInDown, SlideOutDown } from 'react-native-reanimated';
import { useQuery } from '@tanstack/react-query';
import { getMemberBudgetPeriod, getBudgetDetails } from '@/lib/budget-api';
import { getCategoryGroups } from '@/lib/category-groups-api';

interface Category {
  id: string;
  name: string;
  emoji: string;
  categoryGroup: string;
}

interface CategorySelectorProps {
  categories: Category[];
  selectedCategoryId: string | null;
  onSelectCategory: (categoryId: string) => void;
  userId: string;
  householdId: string;
}

interface CategoryWithStats {
  id: string;
  name: string;
  emoji: string;
  categoryGroup: string;
  categoryGroupName: string;
  budgetRemaining: number;
}

/**
 * CategorySelector - Allow payer to categorize the settlement transaction
 * Matches the dark bottom sheet UI from BottomSheetSelect
 */
export function CategorySelector({
  categories,
  selectedCategoryId,
  onSelectCategory,
  userId,
  householdId,
}: CategorySelectorProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  // Load category groups for friendly names
  const { data: categoryGroups } = useQuery({
    queryKey: ['categoryGroups', householdId, userId],
    queryFn: async () => {
      return getCategoryGroups(householdId, userId);
    },
    enabled: isOpen && !!householdId && !!userId
  });

  // Load budget data to show remaining amounts
  const { data: categoriesWithBudget } = useQuery({
    queryKey: ['settlement-categories-budget', userId, householdId, categories, categoryGroups],
    queryFn: async () => {
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

      // Combine categories with budget data
      const categoriesWithStats: CategoryWithStats[] = categories.map(cat => {
        const groupKey = cat.categoryGroup || 'other';
        const groupName = groupKeyToName[groupKey] || groupKey;
        const budgetRemaining = budgetMap.get(cat.id) ?? 0;

        return {
          id: cat.id,
          name: cat.name,
          emoji: cat.emoji,
          categoryGroup: cat.categoryGroup || 'other',
          categoryGroupName: groupName,
          budgetRemaining,
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
    enabled: isOpen && !!userId && !!householdId && !!categoryGroups
  });

  // Filter categories based on search
  const filteredCategories = categoriesWithBudget?.filter(cat =>
    cat.name.toLowerCase().includes(searchQuery.toLowerCase())
  ) || [];

  const selectedCategory = categories.find((c) => c.id === selectedCategoryId);

  const handleSelectCategory = (categoryId: string) => {
    onSelectCategory(categoryId);
    setSearchQuery('');
    setIsOpen(false);
  };

  return (
    <View className="mb-5">
      {/* Section Title */}
      <Text
        className="text-white/60 mb-2"
        style={{
          fontSize: 11,
          textTransform: 'uppercase',
          letterSpacing: 1.2,
        }}
      >
        Budget Category
      </Text>

      {/* Helper Text */}
      <Text
        className="text-white/70 mb-3"
        style={{ fontSize: 12 }}
      >
        How should this appear in your budget?
      </Text>

      {/* Trigger Button - Matches BottomSheetSelect style */}
      <Pressable
        onPress={() => setIsOpen(true)}
        className="flex-row items-center justify-between rounded-xl"
        style={{
          backgroundColor: 'rgba(255,255,255,0.05)',
          borderWidth: 1,
          borderColor: selectedCategoryId ? '#2C5F5D' : 'rgba(255,255,255,0.1)',
          padding: 12,
        }}
      >
        <View className="flex-1">
          <Text
            className="text-sm"
            style={{ color: selectedCategory ? 'rgba(255,255,255,0.9)' : 'rgba(255,255,255,0.5)' }}
          >
            {selectedCategory
              ? `${selectedCategory.emoji} ${selectedCategory.name}`
              : '-- Select Category --'}
          </Text>
        </View>
        <ChevronRight size={20} color="rgba(255,255,255,0.5)" />
      </Pressable>

      {/* Dark Bottom Sheet Modal - Matches BottomSheetSelect UI */}
      <Modal
        visible={isOpen}
        transparent
        animationType="none"
        onRequestClose={() => setIsOpen(false)}
      >
        {/* Backdrop */}
        <Animated.View
          entering={FadeIn.duration(300)}
          exiting={FadeOut.duration(200)}
          style={{
            flex: 1,
            backgroundColor: 'rgba(0,0,0,0.6)',
          }}
        >
          <Pressable
            style={{ flex: 1 }}
            onPress={() => setIsOpen(false)}
          />

          {/* Bottom Sheet */}
          <Animated.View
            entering={SlideInDown.duration(300).springify()}
            exiting={SlideOutDown.duration(200)}
            style={{
              position: 'absolute',
              bottom: 0,
              left: 0,
              right: 0,
              maxHeight: '80%',
              backgroundColor: '#1A1C1E',
              borderTopLeftRadius: 24,
              borderTopRightRadius: 24,
              paddingBottom: 40,
            }}
          >
            {/* Handle */}
            <View className="items-center pt-3 pb-2">
              <View
                style={{
                  width: 40,
                  height: 4,
                  backgroundColor: 'rgba(255,255,255,0.3)',
                  borderRadius: 2,
                }}
              />
            </View>

            {/* Header */}
            <View className="px-5 pb-3">
              <Text
                className="text-lg font-bold"
                style={{ color: 'rgba(255,255,255,0.95)' }}
              >
                Select Category
              </Text>
            </View>

            {/* Search Bar - Dark themed */}
            <View className="px-5 pb-3">
              <View
                className="flex-row items-center rounded-xl px-3 py-2"
                style={{
                  backgroundColor: 'rgba(255,255,255,0.05)',
                  borderWidth: 1,
                  borderColor: 'rgba(255,255,255,0.1)',
                }}
              >
                <Search size={18} color="rgba(255,255,255,0.5)" />
                <TextInput
                  value={searchQuery}
                  onChangeText={setSearchQuery}
                  placeholder="Search categories..."
                  placeholderTextColor="rgba(255,255,255,0.4)"
                  autoCapitalize="words"
                  className="flex-1 ml-2 text-base"
                  style={{ color: 'rgba(255,255,255,0.9)' }}
                />
                {searchQuery.length > 0 && (
                  <Pressable onPress={() => setSearchQuery('')}>
                    <X size={18} color="rgba(255,255,255,0.5)" />
                  </Pressable>
                )}
              </View>
            </View>

            {/* Category List */}
            <ScrollView
              style={{ maxHeight: '100%' }}
              contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 20 }}
              showsVerticalScrollIndicator={false}
            >
              {filteredCategories.length > 0 ? (
                <>
                  <Text
                    className="text-xs font-semibold mb-2 px-2"
                    style={{ color: 'rgba(255,255,255,0.5)' }}
                  >
                    {searchQuery ? 'MATCHES' : 'MOST BUDGET REMAINING'}
                  </Text>

                  {filteredCategories.map((category) => {
                    const isSelected = category.id === selectedCategoryId;

                    return (
                      <Pressable
                        key={category.id}
                        onPress={() => handleSelectCategory(category.id)}
                        className="flex-row items-center justify-between rounded-xl mb-2"
                        style={{
                          backgroundColor: isSelected
                            ? 'rgba(44,95,93,0.2)'
                            : 'rgba(255,255,255,0.03)',
                          borderWidth: 1,
                          borderColor: isSelected ? '#2C5F5D' : 'rgba(255,255,255,0.05)',
                          padding: 14,
                        }}
                      >
                        <View className="flex-row items-center flex-1">
                          {category.emoji && (
                            <Text className="text-2xl mr-3">{category.emoji}</Text>
                          )}
                          <View className="flex-1">
                            <Text
                              className="text-sm font-medium"
                              style={{ color: 'rgba(255,255,255,0.9)' }}
                            >
                              {category.name}
                            </Text>
                            {category.categoryGroupName && (
                              <Text
                                className="text-xs mt-0.5 capitalize"
                                style={{ color: 'rgba(255,255,255,0.5)' }}
                              >
                                {category.categoryGroupName}
                              </Text>
                            )}
                          </View>
                        </View>

                        <View className="flex-row items-center">
                          {category.budgetRemaining !== undefined && (
                            <Text
                              className="text-xs mr-3"
                              style={{ color: 'rgba(255,255,255,0.5)' }}
                            >
                              CHF {category.budgetRemaining.toFixed(2)}
                            </Text>
                          )}
                          {isSelected && (
                            <Check size={20} color="#2C5F5D" strokeWidth={3} />
                          )}
                        </View>
                      </Pressable>
                    );
                  })}
                </>
              ) : (
                <View className="p-8 items-center">
                  <Text
                    className="text-center"
                    style={{ color: 'rgba(255,255,255,0.5)' }}
                  >
                    {searchQuery ? 'No matching categories' : 'No categories yet'}
                  </Text>
                  {searchQuery && (
                    <Text
                      className="text-center text-sm mt-1"
                      style={{ color: 'rgba(255,255,255,0.4)' }}
                    >
                      Try a different search term
                    </Text>
                  )}
                </View>
              )}
            </ScrollView>
          </Animated.View>
        </Animated.View>
      </Modal>
    </View>
  );
}
