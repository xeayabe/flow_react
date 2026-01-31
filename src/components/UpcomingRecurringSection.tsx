import React, { useState, useEffect } from 'react';
import { View, Text, Pressable, ActivityIndicator } from 'react-native';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ChevronRight, ChevronDown, RefreshCw, Edit2 } from 'lucide-react-native';
import { useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  getActiveRecurringTemplates,
  createTransactionFromTemplate,
  RecurringTemplate,
  shouldCreateThisMonth,
} from '@/lib/recurring-api';
import { getCategories } from '@/lib/categories-api';
import { formatCurrency } from '@/lib/transactions-api';
import { cn } from '@/lib/cn';

const STORAGE_KEY = 'recurringSection_collapsed';

interface UpcomingRecurringSectionProps {
  userId: string;
  householdId: string;
}

interface TemplateWithCategory extends RecurringTemplate {
  categoryName?: string;
}

/**
 * Get the next occurrence date for a recurring template
 */
function getNextOccurrenceDate(recurringDay: number): Date {
  const today = new Date();
  const currentDay = today.getDate();
  const currentMonth = today.getMonth();
  const currentYear = today.getFullYear();

  if (currentDay < recurringDay) {
    // Recurring day hasn't arrived yet this month
    return new Date(currentYear, currentMonth, recurringDay);
  } else {
    // Recurring day has passed, return next month's date
    return new Date(currentYear, currentMonth + 1, recurringDay);
  }
}

/**
 * Format date as "MMM DD"
 */
function formatDueDate(date: Date): string {
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

/**
 * Check if a date is overdue
 */
function isOverdue(date: Date): boolean {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  date.setHours(0, 0, 0, 0);
  return date < today;
}

export default function UpcomingRecurringSection({
  userId,
  householdId,
}: UpcomingRecurringSectionProps) {
  const queryClient = useQueryClient();
  const router = useRouter();
  const [isCollapsed, setIsCollapsed] = useState<boolean>(true);

  // Load collapsed state from AsyncStorage
  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY).then((value) => {
      if (value !== null) {
        setIsCollapsed(JSON.parse(value));
      }
    });
  }, []);

  // Load recurring templates
  const templatesQuery = useQuery({
    queryKey: ['recurring-templates', userId, householdId],
    queryFn: async () => {
      const allTemplates = await getActiveRecurringTemplates(userId, householdId);

      // Filter to show only those due (not yet created this month)
      const dueTemplates = allTemplates.filter((t) => shouldCreateThisMonth(t));

      // Sort by next occurrence date (earliest first)
      const sorted = dueTemplates.sort((a, b) => {
        const dateA = getNextOccurrenceDate(a.recurringDay);
        const dateB = getNextOccurrenceDate(b.recurringDay);
        return dateA.getTime() - dateB.getTime();
      });

      return sorted;
    },
    enabled: !!userId && !!householdId,
  });

  // Load categories to show category names
  const categoriesQuery = useQuery({
    queryKey: ['categories', householdId, userId],
    queryFn: async () => {
      return getCategories(householdId, userId);
    },
    enabled: !!householdId && !!userId,
  });

  // Enrich templates with category names
  const enrichedTemplates: TemplateWithCategory[] =
    templatesQuery.data?.map((template) => {
      const category = categoriesQuery.data?.find((c) => c.id === template.categoryId);
      return {
        ...template,
        categoryName: category?.name || 'Unknown',
      };
    }) || [];

  // Mutation to create transaction from template
  const createMutation = useMutation({
    mutationFn: ({ templateId, date }: { templateId: string; date?: Date }) =>
      createTransactionFromTemplate(templateId, date),
    onSuccess: () => {
      // Refetch templates and transactions
      queryClient.invalidateQueries({ queryKey: ['recurring-templates', userId, householdId] });
      queryClient.invalidateQueries({ queryKey: ['transactions-household', householdId, userId] });
      queryClient.invalidateQueries({ queryKey: ['accounts'] });
      queryClient.invalidateQueries({ queryKey: ['wallets'] });
    },
  });

  // Toggle collapsed state
  const toggleCollapsed = async () => {
    const newState = !isCollapsed;
    setIsCollapsed(newState);
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(newState));
  };

  // Handle "Add Now" button press - uses TODAY's date
  const handleAddNow = (templateId: string) => {
    const today = new Date();
    createMutation.mutate({ templateId, date: today });
  };

  const handleEditTemplate = (templateId: string) => {
    router.push(`/recurring/edit/${templateId}`);
  };

  // Don't render if no templates
  if (!templatesQuery.data || templatesQuery.data.length === 0) {
    return null;
  }

  const templateCount = enrichedTemplates.length;

  return (
    <View className="mx-4 mb-4">
      {/* Collapsible Header */}
      <Pressable
        onPress={toggleCollapsed}
        className="flex-row items-center justify-between p-4 rounded-t-2xl border border-blue-200"
        style={{ backgroundColor: '#EFF6FF' }}
      >
        <View className="flex-row items-center gap-2">
          {isCollapsed ? (
            <ChevronRight size={18} color="#1E40AF" />
          ) : (
            <ChevronDown size={18} color="#1E40AF" />
          )}
          <Text className="font-semibold text-blue-900">
            Upcoming Recurring ({templateCount})
          </Text>
        </View>
        {isCollapsed && (
          <Text className="text-xs text-blue-600">Tap to view</Text>
        )}
      </Pressable>

      {/* Expanded Content */}
      {!isCollapsed && (
        <View
          className="border border-t-0 border-blue-200 rounded-b-2xl p-3"
          style={{ backgroundColor: '#EFF6FF' }}
        >
          {enrichedTemplates.map((template, idx) => {
            const nextDate = getNextOccurrenceDate(template.recurringDay);
            const overdueStatus = isOverdue(nextDate);
            const isCreating = createMutation.isPending && createMutation.variables?.templateId === template.id;

            return (
              <View
                key={template.id}
                className={cn(
                  'p-3 bg-white rounded-xl mb-2 flex-row items-center justify-between',
                  idx === enrichedTemplates.length - 1 && 'mb-0'
                )}
              >
                <View className="flex-1">
                  <View className="flex-row items-center gap-2 mb-1">
                    <RefreshCw size={14} color="#3B82F6" />
                    <Text className="font-semibold text-gray-900">
                      {template.categoryName}
                    </Text>
                  </View>
                  <View className="flex-row items-center gap-2">
                    <Text className="text-sm text-gray-600">
                      {formatCurrency(template.amount)}
                    </Text>
                    <Text className="text-xs text-gray-400">•</Text>
                    <Text className="text-sm text-gray-600">
                      Due: {formatDueDate(nextDate)}
                    </Text>
                    {overdueStatus && (
                      <>
                        <Text className="text-xs text-gray-400">•</Text>
                        <Text className="text-xs text-orange-600 font-semibold">
                          ⚠️ Overdue
                        </Text>
                      </>
                    )}
                  </View>
                  {template.payee && (
                    <Text className="text-xs text-gray-500 mt-1">
                      {template.payee}
                    </Text>
                  )}
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
                    onPress={() => handleAddNow(template.id)}
                    disabled={isCreating}
                    className={cn(
                      'px-4 py-2 rounded-lg',
                      isCreating ? 'bg-gray-300' : 'bg-blue-600'
                    )}
                  >
                    {isCreating ? (
                      <ActivityIndicator size="small" color="white" />
                    ) : (
                      <Text className="text-xs font-semibold text-white">Add Now</Text>
                    )}
                  </Pressable>
                </View>
              </View>
            );
          })}
        </View>
      )}
    </View>
  );
}
