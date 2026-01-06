import React, { useState } from 'react';
import { View, Text, ScrollView, Pressable, TextInput, Modal, ActivityIndicator, SectionList } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Stack, router } from 'expo-router';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, Plus, Edit2, Trash2, X } from 'lucide-react-native';
import { db } from '@/lib/db';
import { getCategories, createCategory, updateCategory, deleteCategory } from '@/lib/categories-api';
import { cn } from '@/lib/cn';

type CategoryType = 'income' | 'expense';
type CategoryGroup = 'income' | 'needs' | 'wants' | 'savings' | 'other';

interface FormData {
  name: string;
  type: CategoryType | '';
  group: CategoryGroup | '';
  icon: string;
  color: string;
}

interface SectionData {
  title: string;
  data: any[];
}

export default function CategoriesScreen() {
  const queryClient = useQueryClient();
  const { user } = db.useAuth();
  const [showModal, setShowModal] = useState(false);
  const [editingCategory, setEditingCategory] = useState<any | null>(null);
  const [formData, setFormData] = useState<FormData>({
    name: '',
    type: '',
    group: '',
    icon: '',
    color: '',
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Get household info
  const householdQuery = useQuery({
    queryKey: ['household', user?.email],
    queryFn: async () => {
      if (!user?.email) throw new Error('No user email');

      // Get user by email
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

      // Get household created by this user
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

  // Get categories
  const categoriesQuery = useQuery({
    queryKey: ['categories', householdQuery.data?.household?.id],
    queryFn: () => getCategories(householdQuery.data!.household.id),
    enabled: !!householdQuery.data?.household?.id,
    select: (response) => (response.success ? (response.data as any[]) : []),
  });

  const createMutation = useMutation({
    mutationFn: () =>
      createCategory({
        householdId: householdQuery.data!.household.id,
        name: formData.name,
        type: formData.type as CategoryType,
        categoryGroup: formData.group as CategoryGroup,
        createdByUserId: householdQuery.data!.userRecord.id,
        icon: formData.icon || undefined,
        color: formData.color || undefined,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['categories'] });
      resetForm();
      setShowModal(false);
    },
  });

  const updateMutation = useMutation({
    mutationFn: () =>
      updateCategory(editingCategory.id, {
        name: formData.name !== editingCategory.name ? formData.name : undefined,
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
    setFormData({ name: '', type: '', group: '', icon: '', color: '' });
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

    if (formData.type === 'expense' && !formData.group) {
      newErrors.group = 'Please select a group';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleCreateClick = () => {
    resetForm();
    setShowModal(true);
  };

  const handleEditClick = (category: any) => {
    setEditingCategory(category);
    setFormData({
      name: category.name,
      type: category.type,
      group: category.categoryGroup,
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
  const groupCategories = (categories: any[]): SectionData[] => {
    const sections: SectionData[] = [];

    // Income categories
    const incomeCategories = categories.filter((cat) => cat.type === 'income');
    if (incomeCategories.length > 0) {
      sections.push({
        title: 'Income',
        data: incomeCategories,
      });
    }

    // Needs categories
    const needsCategories = categories.filter(
      (cat) => cat.type === 'expense' && cat.categoryGroup === 'needs'
    );
    if (needsCategories.length > 0) {
      sections.push({
        title: 'Needs (50%)',
        data: needsCategories,
      });
    }

    // Wants categories
    const wantsCategories = categories.filter(
      (cat) => cat.type === 'expense' && cat.categoryGroup === 'wants'
    );
    if (wantsCategories.length > 0) {
      sections.push({
        title: 'Wants (30%)',
        data: wantsCategories,
      });
    }

    // Savings categories
    const savingsCategories = categories.filter(
      (cat) => cat.type === 'expense' && cat.categoryGroup === 'savings'
    );
    if (savingsCategories.length > 0) {
      sections.push({
        title: 'Savings (20%)',
        data: savingsCategories,
      });
    }

    // Other categories
    const otherCategories = categories.filter(
      (cat) => cat.type === 'expense' && cat.categoryGroup === 'other'
    );
    if (otherCategories.length > 0) {
      sections.push({
        title: 'Other',
        data: otherCategories,
      });
    }

    return sections;
  };

  const categories = (categoriesQuery.data as any[]) || [];
  const sections = groupCategories(categories);

  if (householdQuery.isLoading || categoriesQuery.isLoading) {
    return (
      <View className="flex-1 bg-white items-center justify-center">
        <ActivityIndicator size="large" color="#006A6A" />
      </View>
    );
  }

  return (
    <View className="flex-1 bg-white">
      <Stack.Screen
        options={{
          title: 'Categories',
          headerLeft: () => (
            <Pressable onPress={() => router.back()} className="pl-4">
              <ArrowLeft size={24} color="#006A6A" />
            </Pressable>
          ),
          headerRight: () => (
            <Pressable onPress={handleCreateClick} className="pr-4">
              <Plus size={24} color="#006A6A" />
            </Pressable>
          ),
        }}
      />

      <SafeAreaView edges={['bottom']} className="flex-1">
        {sections.length === 0 ? (
          <View className="flex-1 items-center justify-center px-6">
            <Text className="text-base text-gray-500">No categories yet</Text>
          </View>
        ) : (
          <SectionList
            sections={sections}
            keyExtractor={(item) => item.id}
            renderItem={({ item: category }) => (
              <View key={category.id} className="px-6 py-3 border-b border-gray-100">
                <View className="flex-row items-center justify-between">
                  <View className="flex-1">
                    <Text className="text-base font-medium text-gray-900">
                      {category.icon && `${category.icon} `}
                      {category.name}
                    </Text>
                    {category.isDefault && (
                      <Text className="text-xs text-gray-500 mt-1">Default</Text>
                    )}
                  </View>

                  {!category.isDefault && (
                    <View className="flex-row gap-3">
                      <Pressable onPress={() => handleEditClick(category)}>
                        <Edit2 size={18} color="#006A6A" />
                      </Pressable>
                      <Pressable onPress={() => handleDeleteClick(category.id)}>
                        <Trash2 size={18} color="#EF4444" />
                      </Pressable>
                    </View>
                  )}
                </View>
              </View>
            )}
            renderSectionHeader={({ section: { title } }) => (
              <View className="px-6 py-3 bg-gray-50">
                <Text className="text-sm font-semibold text-gray-700">{title}</Text>
              </View>
            )}
            scrollEnabled={true}
            contentContainerStyle={{ paddingVertical: 8 }}
          />
        )}
      </SafeAreaView>

      {/* Modal */}
      <Modal visible={showModal} animationType="slide" transparent>
        <View className="flex-1 bg-black/30">
          <SafeAreaView className="flex-1" edges={['bottom']}>
            <View className="flex-1 bg-white rounded-t-3xl pt-6">
              {/* Header */}
              <View className="flex-row items-center justify-between px-6 pb-6 border-b border-gray-100">
                <Text className="text-xl font-semibold text-gray-900">
                  {editingCategory ? 'Edit Category' : 'Add Category'}
                </Text>
                <Pressable onPress={() => setShowModal(false)}>
                  <X size={24} color="#6B7280" />
                </Pressable>
              </View>

              <ScrollView className="flex-1 px-6" contentContainerStyle={{ paddingTop: 16, paddingBottom: 32 }}>
                {/* Name */}
                <View className="mb-6">
                  <Text className="text-sm font-medium text-gray-700 mb-2">Category Name</Text>
                  <TextInput
                    className="px-4 py-3 rounded-lg border-2 text-base"
                    style={{
                      borderColor: errors.name ? '#EF4444' : '#E5E7EB',
                      color: '#1F2937',
                    }}
                    placeholder="e.g., Groceries"
                    value={formData.name}
                    onChangeText={(text) => {
                      setFormData({ ...formData, name: text });
                      if (errors.name) setErrors({ ...errors, name: '' });
                    }}
                  />
                  {errors.name && <Text className="text-xs text-red-500 mt-1">{errors.name}</Text>}
                </View>

                {/* Type */}
                <View className="mb-6">
                  <Text className="text-sm font-medium text-gray-700 mb-2">Type</Text>
                  <View className="flex-row gap-3">
                    {(['income', 'expense'] as const).map((type) => (
                      <Pressable
                        key={type}
                        onPress={() => {
                          setFormData({
                            ...formData,
                            type,
                            group: type === 'income' ? 'income' : '',
                          });
                          if (errors.type) setErrors({ ...errors, type: '' });
                        }}
                        className={cn(
                          'flex-1 py-3 rounded-lg border-2 items-center',
                          formData.type === type
                            ? 'bg-teal-50 border-teal-600'
                            : 'border-gray-200'
                        )}
                      >
                        <Text
                          className={cn(
                            'font-medium capitalize',
                            formData.type === type ? 'text-teal-600' : 'text-gray-700'
                          )}
                        >
                          {type}
                        </Text>
                      </Pressable>
                    ))}
                  </View>
                  {errors.type && <Text className="text-xs text-red-500 mt-1">{errors.type}</Text>}
                </View>

                {/* Group (only for expense) */}
                {formData.type === 'expense' && (
                  <View className="mb-6">
                    <Text className="text-sm font-medium text-gray-700 mb-2">Category Group</Text>
                    <View className="gap-2">
                      {(['needs', 'wants', 'savings', 'other'] as const).map((group) => (
                        <Pressable
                          key={group}
                          onPress={() => {
                            setFormData({ ...formData, group });
                            if (errors.group) setErrors({ ...errors, group: '' });
                          }}
                          className={cn(
                            'py-3 px-4 rounded-lg border-2',
                            formData.group === group
                              ? 'bg-teal-50 border-teal-600'
                              : 'border-gray-200'
                          )}
                        >
                          <Text
                            className={cn(
                              'font-medium capitalize',
                              formData.group === group ? 'text-teal-600' : 'text-gray-700'
                            )}
                          >
                            {group === 'needs'
                              ? 'Needs (50%)'
                              : group === 'wants'
                              ? 'Wants (30%)'
                              : group === 'savings'
                              ? 'Savings (20%)'
                              : 'Other'}
                          </Text>
                        </Pressable>
                      ))}
                    </View>
                    {errors.group && <Text className="text-xs text-red-500 mt-1">{errors.group}</Text>}
                  </View>
                )}

                {/* Icon (optional) */}
                <View className="mb-6">
                  <Text className="text-sm font-medium text-gray-700 mb-2">Icon (Optional)</Text>
                  <TextInput
                    className="px-4 py-3 rounded-lg border-2 border-gray-200 text-base"
                    style={{ color: '#1F2937' }}
                    placeholder="e.g., 🛒"
                    value={formData.icon}
                    onChangeText={(text) => setFormData({ ...formData, icon: text })}
                    maxLength={2}
                  />
                  <Text className="text-xs text-gray-500 mt-1">Enter an emoji or leave blank</Text>
                </View>

                {/* Color (optional) */}
                <View className="mb-6">
                  <Text className="text-sm font-medium text-gray-700 mb-2">Color (Optional)</Text>
                  <TextInput
                    className="px-4 py-3 rounded-lg border-2 border-gray-200 text-base"
                    style={{ color: '#1F2937' }}
                    placeholder="e.g., #FF6B6B"
                    value={formData.color}
                    onChangeText={(text) => setFormData({ ...formData, color: text })}
                  />
                  <Text className="text-xs text-gray-500 mt-1">Optional hex color code</Text>
                </View>
              </ScrollView>

              {/* Footer buttons */}
              <View className="px-6 py-4 border-t border-gray-100 gap-3">
                <Pressable
                  onPress={handleSubmit}
                  disabled={createMutation.isPending || updateMutation.isPending}
                  className="py-4 rounded-full bg-teal-600 items-center justify-center"
                >
                  {createMutation.isPending || updateMutation.isPending ? (
                    <ActivityIndicator color="white" />
                  ) : (
                    <Text className="text-base font-semibold text-white">
                      {editingCategory ? 'Save Changes' : 'Add Category'}
                    </Text>
                  )}
                </Pressable>

                <Pressable
                  onPress={() => setShowModal(false)}
                  className="py-4 rounded-full border-2 border-gray-200 items-center justify-center"
                >
                  <Text className="text-base font-semibold text-gray-700">Cancel</Text>
                </Pressable>
              </View>
            </View>
          </SafeAreaView>
        </View>
      </Modal>
    </View>
  );
}
