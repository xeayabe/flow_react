import React, { useState } from 'react';
import { View, Text, ScrollView, Pressable, TextInput, Modal, ActivityIndicator, SectionList } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, Plus, Edit2, Trash2, X } from 'lucide-react-native';
import Animated, { FadeIn, FadeInDown } from 'react-native-reanimated';
import { db } from '@/lib/db';
import { getUserProfileAndHousehold } from '@/lib/household-utils';
import { getCategories, createCategory, updateCategory, deleteCategory } from '@/lib/categories-api';
import { getCategoryGroups } from '@/lib/category-groups-api';
import { colors, borderRadius } from '@/lib/design-tokens';
import { cn } from '@/lib/cn';

type CategoryType = 'income' | 'expense';

interface FormData {
  name: string;
  type: CategoryType | '';
  groupKey: string; // This is the actual category group key from categoryGroups table
  icon: string;
  color: string;
}

interface SectionData {
  title: string;
  data: any[];
}

export default function CategoriesScreen() {
  const insets = useSafeAreaInsets();
  const queryClient = useQueryClient();
  const { user } = db.useAuth();
  const [showModal, setShowModal] = useState(false);
  const [editingCategory, setEditingCategory] = useState<any | null>(null);
  const [selectedType, setSelectedType] = useState<CategoryType>('expense');
  const [formData, setFormData] = useState<FormData>({
    name: '',
    type: '',
    groupKey: '',
    icon: '',
    color: '',
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Get user profile and household (works for both admin and members)
  const householdQuery = useQuery({
    queryKey: ['user-household', user?.email],
    queryFn: async () => {
      if (!user?.email) throw new Error('No user email');
      const result = await getUserProfileAndHousehold(user.email);
      if (!result) throw new Error('No household found');
      return result;
    },
    enabled: !!user?.email,
  });

  const householdId = householdQuery.data?.householdId;
  const userId = householdQuery.data?.userRecord?.id;

  // Get categories - fetch directly from DB without auto-creating
  const categoriesQuery = useQuery({
    queryKey: ['categories', householdId, userId],
    queryFn: async () => {
      if (!householdId || !userId) return [];
      return getCategories(householdId, userId);
    },
    enabled: !!householdId && !!userId,
  });

  // Get category groups
  const categoryGroupsQuery = useQuery({
    queryKey: ['categoryGroups', householdId, userId],
    queryFn: async () => {
      if (!householdId || !userId) return [];
      return getCategoryGroups(householdId, userId);
    },
    enabled: !!householdId && !!userId,
  });

  const createMutation = useMutation({
    mutationFn: () => {
      if (!householdId || !userId) {
        console.error('Missing householdId or userId:', { householdId, userId });
        throw new Error('No household or user');
      }
      console.log('Creating category:', { householdId, userId, name: formData.name, type: formData.type, group: formData.groupKey });
      return createCategory({
        householdId,
        name: formData.name,
        type: formData.type as CategoryType,
        categoryGroup: formData.groupKey,
        createdByUserId: userId,
        icon: formData.icon || undefined,
        color: formData.color || undefined,
      });
    },
    onSuccess: (result) => {
      console.log('Category creation result:', result);
      if (result.success) {
        queryClient.invalidateQueries({ queryKey: ['categories'] });
        resetForm();
        setShowModal(false);
      } else {
        console.error('Category creation failed:', result.error);
        setErrors({ name: result.error || 'Failed to create category' });
      }
    },
    onError: (error) => {
      console.error('Category creation error:', error);
      setErrors({ name: 'Failed to create category. Please try again.' });
    },
  });

  const updateMutation = useMutation({
    mutationFn: () =>
      updateCategory(editingCategory.id, {
        name: formData.name !== editingCategory.name ? formData.name : undefined,
        type: formData.type !== editingCategory.type ? (formData.type as 'income' | 'expense') : undefined,
        categoryGroup: formData.groupKey !== editingCategory.categoryGroup ? formData.groupKey : undefined,
        icon: formData.icon !== editingCategory.icon ? formData.icon : undefined,
        color: formData.color !== editingCategory.color ? formData.color : undefined,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['categories'] });
      resetForm();
      setShowModal(false);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (categoryId: string) => deleteCategory(categoryId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['categories'] });
    },
  });

  const resetForm = () => {
    setFormData({ name: '', type: '', groupKey: '', icon: '', color: '' });
    setErrors({});
    setEditingCategory(null);
  };

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.name.trim()) {
      newErrors.name = 'Please enter a category name';
    } else if (formData.name.length < 2) {
      newErrors.name = 'Category name must be at least 2 characters';
    } else if (formData.name.length > 30) {
      newErrors.name = 'Category name must be less than 30 characters';
    }

    if (!formData.type) {
      newErrors.type = 'Please select a type';
    }

    if (!formData.groupKey) {
      // Check if there are any groups available for the selected type
      const availableGroups = (categoryGroupsQuery.data || []).filter(
        (group) => group.type === formData.type
      );
      if (availableGroups.length === 0) {
        newErrors.groupKey = 'You need to create a category group first';
      } else {
        newErrors.groupKey = 'Please select a group';
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleCreateClick = () => {
    resetForm();
    setFormData({ name: '', type: selectedType, groupKey: '', icon: '', color: '' });
    setShowModal(true);
  };

  const handleEditClick = (category: any) => {
    setEditingCategory(category);
    setFormData({
      name: category.name,
      type: category.type,
      groupKey: category.categoryGroup,
      icon: category.icon || '',
      color: category.color || '',
    });
    setShowModal(true);
  };

  const handleSubmit = () => {
    if (!validateForm()) return;

    if (editingCategory) {
      updateMutation.mutate();
    } else {
      createMutation.mutate();
    }
  };

  const handleDeleteClick = (categoryId: string) => {
    deleteMutation.mutate(categoryId);
  };

  // Group categories by type and group
  const groupCategories = (categories: any[], type: CategoryType): SectionData[] => {
    const sections: SectionData[] = [];
    const allGroups = categoryGroupsQuery.data || [];

    // Filter categories by the selected type first
    const categoriesOfType = categories.filter((cat) => cat.type === type);

    // Filter groups by the selected type and sort by displayOrder
    const groupsOfType = allGroups
      .filter((group) => group.type === type)
      .sort((a, b) => (a.displayOrder || 0) - (b.displayOrder || 0));

    // Add sections for each group matching the selected type
    groupsOfType.forEach((group) => {
      // Find categories that belong to this group by matching categoryGroup to group.key
      const categoriesForGroup = categoriesOfType
        .filter((cat) => cat.categoryGroup === group.key)
        .sort((a, b) => {
          // Remove emojis and sort alphabetically by the actual text
          const nameA = (a.name || '').replace(/[\p{Emoji}\p{Emoji_Modifier}\p{Emoji_Component}\p{Emoji_Modifier_Base}\p{Emoji_Presentation}]/gu, '').trim().toLowerCase();
          const nameB = (b.name || '').replace(/[\p{Emoji}\p{Emoji_Modifier}\p{Emoji_Component}\p{Emoji_Modifier_Base}\p{Emoji_Presentation}]/gu, '').trim().toLowerCase();
          return nameA.localeCompare(nameB);
        });

      if (categoriesForGroup.length > 0) {
        console.log(`Group "${group.name}" categories:`, categoriesForGroup.map(c => c.name).join(', '));
        sections.push({
          title: group.icon ? `${group.icon} ${group.name}` : group.name,
          data: categoriesForGroup,
        });
      }
    });

    // Check for any categories with group keys that don't match any group in DB
    const groupKeys = new Set(allGroups.map(g => g.key));
    const uncategorized = categoriesOfType.filter((cat) => !groupKeys.has(cat.categoryGroup));
    if (uncategorized.length > 0) {
      // Group these by their categoryGroup value
      const uncategorizedByGroup = new Map<string, any[]>();
      uncategorized.forEach((cat) => {
        const key = cat.categoryGroup || 'unknown';
        if (!uncategorizedByGroup.has(key)) {
          uncategorizedByGroup.set(key, []);
        }
        uncategorizedByGroup.get(key)!.push(cat);
      });

      uncategorizedByGroup.forEach((cats, groupKey) => {
        sections.push({
          title: `📦 ${groupKey.charAt(0).toUpperCase() + groupKey.slice(1)}`,
          data: cats.sort((a, b) => {
            // Remove emojis and sort alphabetically by the actual text
            const nameA = (a.name || '').replace(/[\p{Emoji}\p{Emoji_Modifier}\p{Emoji_Component}\p{Emoji_Modifier_Base}\p{Emoji_Presentation}]/gu, '').trim().toLowerCase();
            const nameB = (b.name || '').replace(/[\p{Emoji}\p{Emoji_Modifier}\p{Emoji_Component}\p{Emoji_Modifier_Base}\p{Emoji_Presentation}]/gu, '').trim().toLowerCase();
            return nameA.localeCompare(nameB);
          }),
        });
      });
    }

    return sections;
  };

  const categories = (categoriesQuery.data as any[]) || [];
  const sections = groupCategories(categories, selectedType);

  if (householdQuery.isLoading || categoriesQuery.isLoading || categoryGroupsQuery.isLoading) {
    return (
      <LinearGradient
        colors={[colors.contextDark, colors.contextTeal]}
        start={{ x: 0, y: 0 }}
        end={{ x: 0, y: 1 }}
        style={{ flex: 1, paddingTop: insets.top }}
      >
        <View className="flex-1 items-center justify-center">
          <Animated.View entering={FadeIn.duration(500)}>
            <Text className="text-4xl mb-4">📁</Text>
          </Animated.View>
          <Text style={{ color: colors.textWhiteSecondary }} className="text-sm">
            Loading categories...
          </Text>
        </View>
      </LinearGradient>
    );
  }


  return (
    <LinearGradient
      colors={[colors.contextDark, colors.contextTeal]}
      start={{ x: 0, y: 0 }}
      end={{ x: 0, y: 1 }}
      style={{ flex: 1 }}
    >
      {/* Header */}
      <View
        className="flex-row items-center justify-between px-5 pb-4"
        style={{ paddingTop: insets.top + 16 }}
      >
        <View className="flex-row items-center">
          <Pressable
            onPress={() => router.back()}
            style={{
              width: 40,
              height: 40,
              borderRadius: borderRadius.sm,
              backgroundColor: colors.glassWhite,
              borderWidth: 1,
              borderColor: colors.glassBorder,
              alignItems: 'center',
              justifyContent: 'center',
              marginRight: 16,
            }}
          >
            <ArrowLeft size={20} color={colors.textWhite} strokeWidth={2} />
          </Pressable>
          <Text className="text-white text-xl font-semibold">Categories</Text>
        </View>
        <Pressable
          onPress={handleCreateClick}
          style={{
            width: 40,
            height: 40,
            borderRadius: borderRadius.sm,
            backgroundColor: colors.glassWhite,
            borderWidth: 1,
            borderColor: colors.glassBorder,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Plus size={20} color={colors.textWhite} strokeWidth={2} />
        </Pressable>
      </View>

      {/* Type Selector */}
      <View className="px-5 pb-4">
        <View className="flex-row gap-3">
          {(['expense', 'income'] as const).map((type) => (
            <Pressable
              key={type}
              onPress={() => setSelectedType(type)}
              style={{
                flex: 1,
                paddingVertical: 12,
                borderRadius: borderRadius.md,
                borderWidth: 2,
                borderColor: selectedType === type ? colors.sageGreen : colors.glassBorder,
                backgroundColor: selectedType === type ? 'rgba(168, 181, 161, 0.15)' : colors.glassWhite,
                alignItems: 'center',
              }}
            >
              <Text
                style={{
                  color: selectedType === type ? colors.sageGreen : colors.textWhiteSecondary,
                  fontWeight: '600',
                  textTransform: 'capitalize',
                }}
              >
                {type}
              </Text>
            </Pressable>
          ))}
        </View>
      </View>

      {sections.length === 0 ? (
        <View className="flex-1 items-center justify-center px-6">
          <Animated.View entering={FadeIn.duration(500)}>
            <Text className="text-4xl mb-4">📁</Text>
          </Animated.View>
          <Text style={{ color: colors.textWhiteSecondary }} className="text-base">
            No categories yet
          </Text>
        </View>
      ) : (
        <SectionList
          sections={sections}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{
            paddingBottom: insets.bottom + 24,
          }}
          renderItem={({ item: category }) => (
            <View
              key={category.id}
              style={{
                marginHorizontal: 20,
                marginBottom: 8,
                backgroundColor: colors.glassWhite,
                borderWidth: 1,
                borderColor: colors.glassBorder,
                borderRadius: borderRadius.md,
                padding: 16,
              }}
            >
              <View className="flex-row items-center justify-between">
                <View className="flex-1">
                  <Text style={{ color: colors.textWhite }} className="text-base font-medium">
                    {category.icon && `${category.icon} `}
                    {category.name}
                  </Text>
                  {category.isDefault && (
                    <Text style={{ color: colors.textWhiteSecondary }} className="text-xs mt-1">
                      Default
                    </Text>
                  )}
                </View>

                {!category.isDefault && (
                  <View className="flex-row gap-3">
                    <Pressable onPress={() => handleEditClick(category)}>
                      <Edit2 size={18} color={colors.sageGreen} />
                    </Pressable>
                    <Pressable onPress={() => handleDeleteClick(category.id)}>
                      <Trash2 size={18} color="#E3A05D" />
                    </Pressable>
                  </View>
                )}
              </View>
            </View>
          )}
          renderSectionHeader={({ section: { title } }) => (
            <View
              style={{
                paddingHorizontal: 20,
                paddingVertical: 12,
                marginBottom: 8,
              }}
            >
              <Text style={{ color: colors.sageGreen }} className="text-sm font-semibold">{title}</Text>
            </View>
          )}
          scrollEnabled={true}
          contentContainerStyle={{ paddingVertical: 8 }}
        />
      )}

      {/* Modal */}
      <Modal visible={showModal} animationType="slide" transparent={false}>
        <LinearGradient
          colors={[colors.contextDark, colors.contextTeal]}
          start={{ x: 0, y: 0 }}
          end={{ x: 0, y: 1 }}
          style={{ flex: 1 }}
        >
          <View
            style={{
              paddingTop: insets.top + 16,
              paddingHorizontal: 20,
              paddingBottom: 16,
              borderBottomWidth: 1,
              borderBottomColor: colors.glassBorder,
            }}
          >
            <View className="flex-row items-center justify-between">
              <Text style={{ color: colors.textWhite }} className="text-xl font-semibold">
                {editingCategory ? 'Edit Category' : 'Add Category'}
              </Text>
              <Pressable
                onPress={() => setShowModal(false)}
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: borderRadius.sm,
                  backgroundColor: colors.glassWhite,
                  borderWidth: 1,
                  borderColor: colors.glassBorder,
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <X size={20} color={colors.textWhite} />
              </Pressable>
            </View>
          </View>

          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{
              paddingHorizontal: 20,
              paddingTop: 16,
              paddingBottom: insets.bottom + 32,
            }}
          >
            {/* Name */}
            <View className="mb-6">
              <Text style={{ color: colors.textWhiteSecondary }} className="text-sm font-medium mb-2">
                Category Name
              </Text>
              <TextInput
                style={{
                  backgroundColor: colors.glassWhite,
                  borderWidth: 2,
                  borderColor: errors.name ? '#E3A05D' : colors.glassBorder,
                  borderRadius: borderRadius.md,
                  paddingHorizontal: 16,
                  paddingVertical: 12,
                  fontSize: 16,
                  color: colors.textWhite,
                }}
                placeholder="e.g., Groceries"
                placeholderTextColor={colors.textWhiteSecondary}
                value={formData.name}
                onChangeText={(text) => {
                  setFormData({ ...formData, name: text });
                  if (errors.name) setErrors({ ...errors, name: '' });
                }}
              />
              {errors.name && (
                <Text style={{ color: '#E3A05D' }} className="text-xs mt-1">
                  {errors.name}
                </Text>
              )}
            </View>

            {/* Type */}
            <View className="mb-6">
              <Text style={{ color: colors.textWhiteSecondary }} className="text-sm font-medium mb-2">
                Type
              </Text>
              <View className="flex-row gap-3">
                {(['income', 'expense'] as const).map((type) => (
                  <Pressable
                    key={type}
                    onPress={() => {
                      setFormData({
                        ...formData,
                        type,
                        groupKey: '',
                      });
                      if (errors.type) setErrors({ ...errors, type: '' });
                    }}
                    style={{
                      flex: 1,
                      paddingVertical: 12,
                      borderRadius: borderRadius.md,
                      borderWidth: 2,
                      borderColor: formData.type === type ? colors.sageGreen : colors.glassBorder,
                      backgroundColor: formData.type === type ? 'rgba(168, 181, 161, 0.15)' : colors.glassWhite,
                      alignItems: 'center',
                    }}
                  >
                    <Text
                      style={{
                        color: formData.type === type ? colors.sageGreen : colors.textWhiteSecondary,
                        fontWeight: '600',
                        textTransform: 'capitalize',
                      }}
                    >
                      {type}
                    </Text>
                  </Pressable>
                ))}
              </View>
              {errors.type && (
                <Text style={{ color: '#E3A05D' }} className="text-xs mt-1">
                  {errors.type}
                </Text>
              )}
            </View>

            {/* Group (for both income and expense) */}
            {formData.type && (
              <View className="mb-6">
                <Text style={{ color: colors.textWhiteSecondary }} className="text-sm font-medium mb-2">
                  Category Group
                </Text>
                {(categoryGroupsQuery.data || []).filter((group) => group.type === formData.type).length === 0 ? (
                  <View
                    style={{
                      padding: 16,
                      borderRadius: borderRadius.md,
                      backgroundColor: 'rgba(227, 160, 93, 0.1)',
                      borderWidth: 1,
                      borderColor: 'rgba(227, 160, 93, 0.3)',
                    }}
                  >
                    <Text style={{ color: colors.softAmber }} className="text-sm mb-3">
                      You need to create a category group first before adding categories.
                    </Text>
                    <Pressable
                      onPress={() => {
                        setShowModal(false);
                        router.push('/settings/category-groups');
                      }}
                      style={{
                        paddingVertical: 8,
                        paddingHorizontal: 16,
                        borderRadius: borderRadius.md,
                        backgroundColor: colors.contextTeal,
                        alignItems: 'center',
                      }}
                    >
                      <Text style={{ color: colors.textWhite }} className="text-sm font-semibold">
                        Create Category Group
                      </Text>
                    </Pressable>
                  </View>
                ) : (
                  <View style={{ gap: 8 }}>
                    {(categoryGroupsQuery.data || [])
                      .filter((group) => group.type === formData.type)
                      .map((group) => (
                        <Pressable
                          key={group.id}
                          onPress={() => {
                            setFormData({ ...formData, groupKey: group.key as any });
                            if (errors.groupKey) setErrors({ ...errors, groupKey: '' });
                          }}
                          style={{
                            paddingVertical: 12,
                            paddingHorizontal: 16,
                            borderRadius: borderRadius.md,
                            borderWidth: 2,
                            borderColor:
                              formData.groupKey === group.key ? colors.sageGreen : colors.glassBorder,
                            backgroundColor:
                              formData.groupKey === group.key
                                ? 'rgba(168, 181, 161, 0.15)'
                                : colors.glassWhite,
                          }}
                        >
                          <Text
                            style={{
                              fontWeight: '500',
                              color:
                                formData.groupKey === group.key
                                  ? colors.sageGreen
                                  : colors.textWhite,
                            }}
                          >
                            {group.icon && `${group.icon} `}
                            {group.name}
                          </Text>
                        </Pressable>
                      ))}
                  </View>
                )}
                {errors.groupKey && (
                  <Text style={{ color: colors.softAmber }} className="text-xs mt-1">
                    {errors.groupKey}
                  </Text>
                )}
              </View>
            )}

          </ScrollView>

          {/* Footer button */}
          <View
            style={{
              paddingHorizontal: 20,
              paddingTop: 16,
              paddingBottom: insets.bottom + 16,
              borderTopWidth: 1,
              borderTopColor: colors.glassBorder,
            }}
          >
            <Pressable
              onPress={handleSubmit}
              disabled={createMutation.isPending || updateMutation.isPending}
              style={{
                backgroundColor: colors.contextTeal,
                borderRadius: borderRadius.md,
                paddingVertical: 14,
                alignItems: 'center',
                justifyContent: 'center',
                opacity: createMutation.isPending || updateMutation.isPending ? 0.5 : 1,
              }}
            >
              {createMutation.isPending || updateMutation.isPending ? (
                <ActivityIndicator color={colors.textWhite} />
              ) : (
                <Text style={{ color: colors.textWhite }} className="text-base font-semibold">
                  {editingCategory ? 'Save Changes' : 'Add Category'}
                </Text>
              )}
            </Pressable>
          </View>
        </LinearGradient>
      </Modal>
    </LinearGradient>
  );
}
