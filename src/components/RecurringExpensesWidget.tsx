import React, { useState } from 'react';
import { View, Text, Pressable, ActivityIndicator, Alert } from 'react-native';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { RefreshCcw, Plus, Calendar, Edit2 } from 'lucide-react-native';
import { useRouter } from 'expo-router';
import { db } from '@/lib/db';
import { getUserProfileAndHousehold } from '@/lib/household-utils';
import {
  getActiveRecurringTemplates,
  shouldCreateThisMonth,
  createTransactionFromTemplate,
  type RecurringTemplate,
} from '@/lib/recurring-api';
import { cn } from '@/lib/cn';

export default function RecurringExpensesWidget() {
  const queryClient = useQueryClient();
  const router = useRouter();
  const { user } = db.useAuth();
  const [creatingTemplateId, setCreatingTemplateId] = useState<string | null>(null);

  // Get user household info
  const { data: householdInfo } = useQuery({
    queryKey: ['user-household', user?.email],
    queryFn: () => getUserProfileAndHousehold(user?.email || ''),
    enabled: !!user?.email,
  });

  // Get recurring templates
  const { data: templates, isLoading } = useQuery({
    queryKey: ['recurring-templates', householdInfo?.userRecord?.id, householdInfo?.householdId],
    queryFn: async () => {
      if (!householdInfo?.userRecord?.id || !householdInfo?.householdId) return [];
      const allTemplates = await getActiveRecurringTemplates(
        householdInfo.userRecord.id,
        householdInfo.householdId
      );
      // Filter to show only those that should be created this month
      return allTemplates.filter((t) => shouldCreateThisMonth(t));
    },
    enabled: !!householdInfo?.userRecord?.id && !!householdInfo?.householdId,
  });

  // Get categories for display
  const { data: categoriesData } = useQuery({
    queryKey: ['categories', householdInfo?.householdId],
    queryFn: async () => {
      if (!householdInfo?.householdId) return [];
      const { data } = await db.queryOnce({
        categories: {
          $: { where: { householdId: householdInfo.householdId, isActive: true } },
        },
      });
      return data.categories || [];
    },
    enabled: !!householdInfo?.householdId,
  });

  // Create transaction from template mutation
  const createFromTemplateMutation = useMutation({
    mutationFn: async ({ templateId, date }: { templateId: string; date?: Date }) => {
      setCreatingTemplateId(templateId);
      return await createTransactionFromTemplate(templateId, date);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['recurring-templates'] });
      queryClient.invalidateQueries({ queryKey: ['transactions'] });
      queryClient.invalidateQueries({ queryKey: ['accounts'] });
      queryClient.invalidateQueries({ queryKey: ['wallets'] });

      Alert.alert('Success', 'Recurring expense added for this month!');
      setCreatingTemplateId(null);
    },
    onError: (error) => {
      console.error('Failed to create transaction from template:', error);
      Alert.alert('Error', 'Failed to add recurring expense. Please try again.');
      setCreatingTemplateId(null);
    },
  });

  const handleAddThisMonth = (templateId: string) => {
    const today = new Date();
    createFromTemplateMutation.mutate({ templateId, date: today });
  };

  const handleEditTemplate = (templateId: string) => {
    router.push(`/recurring/edit/${templateId}`);
  };

  // Get category name helper
  const getCategoryName = (categoryId: string) => {
    const category = categoriesData?.find((c: any) => c.id === categoryId);
    return category?.name || 'Unknown Category';
  };

  // Get month name
  const getMonthName = () => {
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    return months[new Date().getMonth()];
  };

  if (isLoading) {
    return null; // Don't show widget while loading
  }

  if (!templates || templates.length === 0) {
    return null; // Don't show widget if no recurring expenses are due
  }

  return (
    <View className="mx-4 mb-4 bg-amber-50 border-2 border-amber-200 rounded-xl p-4">
      {/* Header */}
      <View className="flex-row items-center mb-3">
        <View className="w-10 h-10 rounded-full bg-amber-100 items-center justify-center mr-3">
          <RefreshCcw size={20} color="#D97706" />
        </View>
        <View className="flex-1">
          <Text className="text-base font-bold text-amber-900">Recurring Expenses</Text>
          <Text className="text-xs text-amber-700">Ready to add this month</Text>
        </View>
      </View>

      {/* Recurring templates list */}
      {templates.map((template: RecurringTemplate) => {
        const isCreating = creatingTemplateId === template.id;
        const categoryName = getCategoryName(template.categoryId);

        return (
          <View
            key={template.id}
            className="flex-row items-center justify-between p-3 mb-2 bg-white rounded-lg border border-amber-200"
          >
            <View className="flex-1 mr-3">
              <Text className="text-base font-semibold text-gray-900">
                {template.payee || categoryName}
              </Text>
              <View className="flex-row items-center mt-1">
                <Text className="text-sm text-gray-600">
                  {template.amount.toFixed(2)} CHF
                </Text>
                <Text className="text-gray-400 mx-2">•</Text>
                <View className="flex-row items-center">
                  <Calendar size={12} color="#9CA3AF" />
                  <Text className="text-xs text-gray-500 ml-1">
                    Due: {getMonthName()} {template.recurringDay}
                  </Text>
                </View>
              </View>
            </View>

            <View className="flex-row items-center gap-2">
              {/* Edit Button */}
              <Pressable
                onPress={() => handleEditTemplate(template.id)}
                className="p-2 rounded-lg bg-gray-100 active:bg-gray-200"
              >
                <Edit2 size={16} color="#6B7280" />
              </Pressable>

              {/* Add Now Button */}
              <Pressable
                onPress={() => handleAddThisMonth(template.id)}
                disabled={isCreating}
                className={cn(
                  'px-4 py-2 rounded-lg flex-row items-center',
                  isCreating ? 'bg-gray-300' : 'bg-teal-600 active:bg-teal-700'
                )}
              >
                {isCreating ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <>
                    <Plus size={16} color="#FFFFFF" />
                    <Text className="text-sm font-semibold text-white ml-1">Add</Text>
                  </>
                )}
              </Pressable>
            </View>
          </View>
        );
      })}

      {/* Helper text */}
      <Text className="text-xs text-amber-700 mt-2">
        These expenses will appear again next month on the specified day.
      </Text>
    </View>
  );
}
