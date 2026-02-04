import React, { useState } from 'react';
import { View, Text, Pressable, Modal, ScrollView } from 'react-native';
import Animated, { FadeIn, FadeOut, SlideInDown, SlideOutDown } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

interface FilterState {
  categories: string[];
  type: 'all' | 'expense' | 'income';
  dateRange: 'all' | 'today' | 'week' | 'month' | 'quarter' | 'year';
}

interface Category {
  id: string;
  name: string;
  emoji: string;
}

interface TransactionFiltersProps {
  isOpen: boolean;
  onClose: () => void;
  filters: FilterState;
  onApplyFilters: (filters: FilterState) => void;
  categories: Category[];
}

export default function TransactionFilters({
  isOpen,
  onClose,
  filters,
  onApplyFilters,
  categories,
}: TransactionFiltersProps) {
  const insets = useSafeAreaInsets();
  const [localFilters, setLocalFilters] = useState<FilterState>(filters);

  const handleApply = () => {
    onApplyFilters(localFilters);
    onClose();
  };

  const handleReset = () => {
    const reset: FilterState = {
      categories: [],
      type: 'all',
      dateRange: 'all',
    };
    setLocalFilters(reset);
    onApplyFilters(reset);
  };

  const toggleCategory = (categoryId: string) => {
    const isSelected = localFilters.categories.includes(categoryId);
    setLocalFilters({
      ...localFilters,
      categories: isSelected
        ? localFilters.categories.filter(id => id !== categoryId)
        : [...localFilters.categories, categoryId],
    });
  };

  return (
    <Modal
      visible={isOpen}
      transparent
      animationType="none"
      onRequestClose={onClose}
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
          onPress={onClose}
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
            maxHeight: '85%',
            backgroundColor: '#1A1C1E',
            borderTopLeftRadius: 24,
            borderTopRightRadius: 24,
            paddingBottom: insets.bottom || 20,
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
              Filter Transactions
            </Text>
          </View>

          {/* Content */}
          <ScrollView
            style={{ maxHeight: '100%' }}
            contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 20 }}
            showsVerticalScrollIndicator={false}
          >
            {/* Type Filter */}
            <View className="mb-6">
              <Text
                className="text-xs font-semibold uppercase tracking-wider mb-3"
                style={{ color: 'rgba(255,255,255,0.7)' }}
              >
                Type
              </Text>
              <View className="flex-row" style={{ gap: 8 }}>
                {(['all', 'expense', 'income'] as const).map((type) => (
                  <Pressable
                    key={type}
                    onPress={() => setLocalFilters({ ...localFilters, type })}
                    className="flex-1 rounded-xl items-center justify-center"
                    style={{
                      backgroundColor: localFilters.type === type
                        ? 'rgba(44,95,93,0.2)'
                        : 'rgba(255,255,255,0.03)',
                      borderWidth: 2,
                      borderColor: localFilters.type === type
                        ? '#2C5F5D'
                        : 'rgba(255,255,255,0.05)',
                      paddingVertical: 12,
                    }}
                  >
                    <Text
                      className="text-sm font-medium"
                      style={{ color: 'rgba(255,255,255,0.9)' }}
                    >
                      {type === 'all' ? 'All' : type === 'expense' ? 'Expenses' : 'Income'}
                    </Text>
                  </Pressable>
                ))}
              </View>
            </View>

            {/* Date Range Filter */}
            <View className="mb-6">
              <Text
                className="text-xs font-semibold uppercase tracking-wider mb-3"
                style={{ color: 'rgba(255,255,255,0.7)' }}
              >
                Time Period
              </Text>
              <View style={{ gap: 8 }}>
                {[
                  { value: 'all', label: 'All Time' },
                  { value: 'today', label: 'Today' },
                  { value: 'week', label: 'This Week' },
                  { value: 'month', label: 'This Month' },
                  { value: 'quarter', label: 'This Quarter' },
                  { value: 'year', label: 'This Year' },
                ].map((option) => (
                  <Pressable
                    key={option.value}
                    onPress={() => setLocalFilters({ ...localFilters, dateRange: option.value as any })}
                    className="rounded-xl"
                    style={{
                      backgroundColor: localFilters.dateRange === option.value
                        ? 'rgba(44,95,93,0.2)'
                        : 'rgba(255,255,255,0.03)',
                      borderWidth: 2,
                      borderColor: localFilters.dateRange === option.value
                        ? '#2C5F5D'
                        : 'rgba(255,255,255,0.05)',
                      paddingVertical: 12,
                      paddingHorizontal: 16,
                    }}
                  >
                    <Text
                      className="text-sm font-medium"
                      style={{ color: 'rgba(255,255,255,0.9)' }}
                    >
                      {option.label}
                    </Text>
                  </Pressable>
                ))}
              </View>
            </View>

            {/* Category Filter */}
            <View className="mb-6">
              <Text
                className="text-xs font-semibold uppercase tracking-wider mb-3"
                style={{ color: 'rgba(255,255,255,0.7)' }}
              >
                Categories
              </Text>
              <View className="flex-row flex-wrap" style={{ gap: 8 }}>
                {categories.map((category) => {
                  const isSelected = localFilters.categories.includes(category.id);
                  return (
                    <Pressable
                      key={category.id}
                      onPress={() => toggleCategory(category.id)}
                      className="rounded-full"
                      style={{
                        backgroundColor: isSelected
                          ? 'rgba(44,95,93,0.2)'
                          : 'rgba(255,255,255,0.03)',
                        borderWidth: 2,
                        borderColor: isSelected
                          ? '#2C5F5D'
                          : 'rgba(255,255,255,0.05)',
                        paddingVertical: 8,
                        paddingHorizontal: 14,
                      }}
                    >
                      <Text
                        className="text-[13px]"
                        style={{ color: 'rgba(255,255,255,0.9)' }}
                      >
                        {category.emoji} {category.name}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            </View>

            {/* Actions */}
            <View
              className="flex-row mt-6 pt-6"
              style={{
                borderTopWidth: 1,
                borderTopColor: 'rgba(255,255,255,0.05)',
                gap: 12,
              }}
            >
              <Pressable
                onPress={handleReset}
                className="flex-1 rounded-xl items-center justify-center"
                style={{
                  backgroundColor: 'rgba(255,255,255,0.05)',
                  borderWidth: 2,
                  borderColor: 'rgba(255,255,255,0.1)',
                  paddingVertical: 14,
                }}
              >
                <Text
                  className="text-sm font-semibold"
                  style={{ color: 'rgba(255,255,255,0.9)' }}
                >
                  Reset
                </Text>
              </Pressable>

              <Pressable
                onPress={handleApply}
                className="rounded-xl items-center justify-center"
                style={{
                  flex: 2,
                  backgroundColor: 'rgba(255,255,255,0.9)',
                  borderWidth: 2,
                  borderColor: '#2C5F5D',
                  paddingVertical: 14,
                }}
              >
                <Text
                  className="text-sm font-semibold"
                  style={{ color: '#2C5F5D' }}
                >
                  Apply Filters
                </Text>
              </Pressable>
            </View>
          </ScrollView>
        </Animated.View>
      </Animated.View>
    </Modal>
  );
}
