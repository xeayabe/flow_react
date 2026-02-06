import React, { useState } from 'react';
import { View, Text, Pressable, ScrollView, Modal } from 'react-native';
import { ChevronDown, Check } from 'lucide-react-native';

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
}

/**
 * CategorySelector - Allow payer to categorize the settlement transaction
 * Dropdown/modal picker grouped by category group
 */
export function CategorySelector({
  categories,
  selectedCategoryId,
  onSelectCategory,
}: CategorySelectorProps) {
  const [isOpen, setIsOpen] = useState(false);

  // Group categories by categoryGroup
  const groupedCategories = categories.reduce((acc, cat) => {
    const group = cat.categoryGroup || 'other';
    if (!acc[group]) {
      acc[group] = [];
    }
    acc[group].push(cat);
    return acc;
  }, {} as Record<string, Category[]>);

  // Define group order and display names
  const groupOrder = ['needs', 'wants', 'savings', 'other'];
  const groupDisplayNames: Record<string, string> = {
    needs: 'Needs',
    wants: 'Wants',
    savings: 'Savings',
    other: 'Other',
  };

  const selectedCategory = categories.find((c) => c.id === selectedCategoryId);

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

      {/* Select Button */}
      <Pressable
        onPress={() => setIsOpen(true)}
        style={({ pressed }) => ({
          backgroundColor: pressed
            ? 'rgba(255, 255, 255, 0.08)'
            : 'rgba(255, 255, 255, 0.05)',
          borderWidth: 1,
          borderColor: selectedCategoryId
            ? '#2C5F5D'
            : 'rgba(255, 255, 255, 0.1)',
          borderRadius: 8,
          padding: 12,
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
        })}
      >
        <Text
          className={selectedCategory ? 'text-white/90' : 'text-white/50'}
          style={{ fontSize: 15 }}
        >
          {selectedCategory
            ? `${selectedCategory.emoji} ${selectedCategory.name}`
            : '-- Select Category --'}
        </Text>
        <ChevronDown size={18} color="rgba(255, 255, 255, 0.6)" />
      </Pressable>

      {/* Category Picker Modal */}
      <Modal
        visible={isOpen}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setIsOpen(false)}
      >
        <View className="flex-1 bg-[#1A1C1E]">
          {/* Modal Header */}
          <View
            className="flex-row items-center justify-between px-5 py-4 border-b"
            style={{ borderBottomColor: 'rgba(255, 255, 255, 0.1)' }}
          >
            <Text className="text-white font-semibold" style={{ fontSize: 17 }}>
              Select Category
            </Text>
            <Pressable onPress={() => setIsOpen(false)}>
              <Text className="text-[#2C5F5D]" style={{ fontSize: 15 }}>
                Done
              </Text>
            </Pressable>
          </View>

          {/* Categories List */}
          <ScrollView className="flex-1 px-5 py-4">
            {groupOrder.map((groupKey) => {
              const groupCategories = groupedCategories[groupKey];
              if (!groupCategories || groupCategories.length === 0) return null;

              return (
                <View key={groupKey} className="mb-6">
                  {/* Group Header */}
                  <Text
                    className="text-white/50 mb-3"
                    style={{
                      fontSize: 11,
                      textTransform: 'uppercase',
                      letterSpacing: 1.2,
                    }}
                  >
                    {groupDisplayNames[groupKey] || groupKey}
                  </Text>

                  {/* Category Items */}
                  <View className="gap-1">
                    {groupCategories.map((category) => {
                      const isSelected = category.id === selectedCategoryId;

                      return (
                        <Pressable
                          key={category.id}
                          onPress={() => {
                            onSelectCategory(category.id);
                            setIsOpen(false);
                          }}
                          style={({ pressed }) => ({
                            backgroundColor: isSelected
                              ? 'rgba(44, 95, 93, 0.2)'
                              : pressed
                              ? 'rgba(255, 255, 255, 0.05)'
                              : 'transparent',
                            borderRadius: 8,
                            padding: 12,
                            flexDirection: 'row',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                          })}
                        >
                          <Text className="text-white/90" style={{ fontSize: 15 }}>
                            {category.emoji} {category.name}
                          </Text>
                          {isSelected && (
                            <Check size={18} color="#2C5F5D" strokeWidth={2.5} />
                          )}
                        </Pressable>
                      );
                    })}
                  </View>
                </View>
              );
            })}
          </ScrollView>
        </View>
      </Modal>
    </View>
  );
}
