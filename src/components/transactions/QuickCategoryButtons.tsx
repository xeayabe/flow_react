import React from 'react';
import { View, Text, Pressable } from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';

interface Category {
  id: string;
  name: string;
  type: 'income' | 'expense';
  emoji?: string;
  icon?: string;
  usageCount?: number;
}

interface QuickCategoryButtonsProps {
  categories: Category[];
  selectedCategoryId: string | null;
  onSelectCategory: (categoryId: string) => void;
  type: 'income' | 'expense';
}

export default function QuickCategoryButtons({
  categories,
  selectedCategoryId,
  onSelectCategory,
  type,
}: QuickCategoryButtonsProps) {
  // Filter by type and get top 6 most-used categories
  const topCategories = categories
    .filter((cat) => cat.type === type)
    .sort((a, b) => (b.usageCount || 0) - (a.usageCount || 0))
    .slice(0, 6);

  if (topCategories.length === 0) {
    return null;
  }

  return (
    <Animated.View entering={FadeIn.duration(300)} className="mt-3">
      <Text className="text-xs font-semibold mb-2" style={{ color: 'rgba(255,255,255,0.5)' }}>
        Quick Select
      </Text>
      <View className="flex-row flex-wrap" style={{ gap: 8 }}>
        {topCategories.map((category) => {
          const isSelected = category.id === selectedCategoryId;
          const displayEmoji = category.emoji || category.icon || '📝';

          return (
            <Pressable
              key={category.id}
              onPress={() => onSelectCategory(category.id)}
              className="items-center justify-center rounded-xl"
              style={{
                width: '31%',
                aspectRatio: 1.2,
                backgroundColor: isSelected ? 'rgba(44,95,93,0.2)' : 'rgba(255,255,255,0.03)',
                borderWidth: 2,
                borderColor: isSelected ? '#2C5F5D' : 'rgba(255,255,255,0.05)',
                paddingVertical: 10,
                paddingHorizontal: 6,
              }}
            >
              <Text className="text-xl mb-1">{displayEmoji}</Text>
              <Text
                className="text-xs text-center font-medium"
                numberOfLines={1}
                style={{ color: isSelected ? 'rgba(168,181,161,0.95)' : 'rgba(255,255,255,0.7)' }}
              >
                {category.name}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </Animated.View>
  );
}
