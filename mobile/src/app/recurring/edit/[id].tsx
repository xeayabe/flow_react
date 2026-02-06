import React, { useState } from 'react';
import { View, Text, ScrollView, Pressable, ActivityIndicator, TextInput, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams, Stack } from 'expo-router';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Trash2 } from 'lucide-react-native';
import { db } from '@/lib/db';
import { getRecurringTemplate, updateRecurringTemplate, deactivateRecurringTemplate } from '@/lib/recurring-api';
import { getCategories } from '@/lib/categories-api';
import { getUserAccounts } from '@/lib/accounts-api';
import { cn } from '@/lib/cn';

export default function EditRecurringTemplatePage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { user } = db.useAuth();

  const [amount, setAmount] = useState<string>('');
  const [categoryId, setCategoryId] = useState<string>('');
  const [accountId, setAccountId] = useState<string>('');
  const [recurringDay, setRecurringDay] = useState<number>(1);
  const [payee, setPayee] = useState<string>('');
  const [note, setNote] = useState<string>('');

  // Get user household info
  const { data: householdInfo } = useQuery({
    queryKey: ['user-household', user?.email],
    queryFn: async () => {
      if (!user?.email) throw new Error('No user email');

      const userResult = await db.queryOnce({
        users: { $: { where: { email: user.email } } },
      });

      const userRecord = userResult.data.users?.[0];
      if (!userRecord) throw new Error('User not found');

      const memberResult = await db.queryOnce({
        householdMembers: {
          $: { where: { userId: userRecord.id, status: 'active' } },
        },
      });

      const member = memberResult.data.householdMembers?.[0];
      if (!member) throw new Error('No household membership found');

      return { userRecord, householdId: member.householdId };
    },
    enabled: !!user?.email,
  });

  // Load template
  const templateQuery = useQuery({
    queryKey: ['recurring-template', id],
    queryFn: async () => {
      if (!id) throw new Error('No template ID');
      return await getRecurringTemplate(id);
    },
    enabled: !!id,
  });

  // Load categories
  const categoriesQuery = useQuery({
    queryKey: ['categories', householdInfo?.householdId, householdInfo?.userRecord?.id],
    queryFn: async () => {
      if (!householdInfo?.householdId || !householdInfo?.userRecord?.id) return [];
      return getCategories(householdInfo.householdId, householdInfo.userRecord.id);
    },
    enabled: !!householdInfo?.householdId && !!householdInfo?.userRecord?.id,
  });

  // Load accounts
  const accountsQuery = useQuery({
    queryKey: ['user-accounts', user?.email],
    queryFn: async () => {
      if (!user?.email) return [];
      return getUserAccounts(user.email);
    },
    enabled: !!user?.email,
  });

  // Set form values when template loads
  React.useEffect(() => {
    if (templateQuery.data) {
      setAmount(templateQuery.data.amount.toString());
      setCategoryId(templateQuery.data.categoryId);
      setAccountId(templateQuery.data.accountId);
      setRecurringDay(templateQuery.data.recurringDay);
      setPayee(templateQuery.data.payee || '');
      setNote(templateQuery.data.note || '');
    }
  }, [templateQuery.data]);

  // Update mutation
  const updateMutation = useMutation({
    mutationFn: async () => {
      if (!id) throw new Error('No template ID');

      const parsedAmount = parseFloat(amount);
      if (isNaN(parsedAmount) || parsedAmount <= 0) {
        throw new Error('Please enter a valid amount');
      }

      if (!categoryId) {
        throw new Error('Please select a category');
      }

      if (!accountId) {
        throw new Error('Please select an account');
      }

      await updateRecurringTemplate(id, {
        amount: parsedAmount,
        categoryId,
        accountId,
        recurringDay,
        payee: payee || undefined,
        note: note || undefined,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['recurring-templates'] });
      queryClient.invalidateQueries({ queryKey: ['recurring-template', id] });
      Alert.alert('Success', 'Recurring expense updated successfully!', [
        { text: 'OK', onPress: () => router.back() },
      ]);
    },
    onError: (error: any) => {
      Alert.alert('Error', error.message || 'Failed to update recurring expense');
    },
  });

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: async () => {
      if (!id) throw new Error('No template ID');
      await deactivateRecurringTemplate(id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['recurring-templates'] });
      Alert.alert('Success', 'Recurring expense deleted successfully!', [
        { text: 'OK', onPress: () => router.back() },
      ]);
    },
    onError: (error: any) => {
      Alert.alert('Error', error.message || 'Failed to delete recurring expense');
    },
  });

  const handleSave = () => {
    updateMutation.mutate();
  };

  const handleDelete = () => {
    Alert.alert(
      'Delete Recurring Expense',
      'Are you sure you want to delete this recurring expense? Past transactions will not be affected.',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Delete', style: 'destructive', onPress: () => deleteMutation.mutate() },
      ]
    );
  };

  const isLoading = templateQuery.isLoading || categoriesQuery.isLoading || accountsQuery.isLoading;
  const isSaving = updateMutation.isPending || deleteMutation.isPending;

  if (isLoading) {
    return (
      <SafeAreaView className="flex-1 bg-white">
        <Stack.Screen options={{ title: 'Edit Recurring Expense' }} />
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" color="#0D9488" />
        </View>
      </SafeAreaView>
    );
  }

  const categories = categoriesQuery.data || [];
  const accounts = accountsQuery.data || [];

  return (
    <SafeAreaView className="flex-1 bg-white">
      <Stack.Screen
        options={{
          title: 'Edit Recurring Expense',
          headerRight: () => (
            <Pressable onPress={handleDelete} disabled={isSaving} className="mr-2">
              <Trash2 size={22} color={isSaving ? '#D1D5DB' : '#EF4444'} />
            </Pressable>
          ),
        }}
      />

      <ScrollView className="flex-1 px-6 py-6">
        {/* Amount */}
        <View className="mb-6">
          <Text className="text-sm font-semibold text-gray-700 mb-2">Amount (CHF)</Text>
          <TextInput
            value={amount}
            onChangeText={setAmount}
            keyboardType="decimal-pad"
            placeholder="0.00"
            className="bg-gray-50 border border-gray-300 rounded-xl px-4 py-3 text-base text-gray-900"
          />
        </View>

        {/* Category */}
        <View className="mb-6">
          <Text className="text-sm font-semibold text-gray-700 mb-2">Category</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} className="flex-row gap-2">
            {categories.map((category: any) => (
              <Pressable
                key={category.id}
                onPress={() => setCategoryId(category.id)}
                className={cn(
                  'px-4 py-3 rounded-xl border',
                  categoryId === category.id
                    ? 'bg-teal-600 border-teal-600'
                    : 'bg-gray-50 border-gray-300'
                )}
              >
                <Text
                  className={cn(
                    'text-sm font-medium',
                    categoryId === category.id ? 'text-white' : 'text-gray-900'
                  )}
                >
                  {category.icon} {category.name}
                </Text>
              </Pressable>
            ))}
          </ScrollView>
        </View>

        {/* Account */}
        <View className="mb-6">
          <Text className="text-sm font-semibold text-gray-700 mb-2">Account</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} className="flex-row gap-2">
            {accounts.map((account: any) => (
              <Pressable
                key={account.id}
                onPress={() => setAccountId(account.id)}
                className={cn(
                  'px-4 py-3 rounded-xl border',
                  accountId === account.id
                    ? 'bg-teal-600 border-teal-600'
                    : 'bg-gray-50 border-gray-300'
                )}
              >
                <Text
                  className={cn(
                    'text-sm font-medium',
                    accountId === account.id ? 'text-white' : 'text-gray-900'
                  )}
                >
                  {account.name}
                </Text>
              </Pressable>
            ))}
          </ScrollView>
        </View>

        {/* Recurring Day */}
        <View className="mb-6">
          <Text className="text-sm font-semibold text-gray-700 mb-2">Day of Month</Text>
          <View className="flex-row flex-wrap gap-2">
            {Array.from({ length: 31 }, (_, i) => i + 1).map((day) => (
              <Pressable
                key={day}
                onPress={() => setRecurringDay(day)}
                className={cn(
                  'w-12 h-12 rounded-lg items-center justify-center border',
                  recurringDay === day
                    ? 'bg-teal-600 border-teal-600'
                    : 'bg-gray-50 border-gray-300'
                )}
              >
                <Text
                  className={cn(
                    'text-sm font-semibold',
                    recurringDay === day ? 'text-white' : 'text-gray-900'
                  )}
                >
                  {day}
                </Text>
              </Pressable>
            ))}
          </View>
          <Text className="text-xs text-gray-500 mt-2">
            Select the day of the month when this expense recurs
          </Text>
        </View>

        {/* Payee (optional) */}
        <View className="mb-6">
          <Text className="text-sm font-semibold text-gray-700 mb-2">Payee (Optional)</Text>
          <TextInput
            value={payee}
            onChangeText={setPayee}
            placeholder="e.g., Landlord, Netflix, etc."
            className="bg-gray-50 border border-gray-300 rounded-xl px-4 py-3 text-base text-gray-900"
          />
        </View>

        {/* Note (optional) */}
        <View className="mb-6">
          <Text className="text-sm font-semibold text-gray-700 mb-2">Note (Optional)</Text>
          <TextInput
            value={note}
            onChangeText={setNote}
            placeholder="e.g., Monthly rent payment"
            multiline
            numberOfLines={3}
            className="bg-gray-50 border border-gray-300 rounded-xl px-4 py-3 text-base text-gray-900"
            style={{ textAlignVertical: 'top' }}
          />
        </View>
      </ScrollView>

      {/* Action Buttons */}
      <View className="px-6 pb-6 gap-3">
        <Pressable
          onPress={handleSave}
          disabled={isSaving}
          className={cn(
            'py-4 rounded-xl items-center justify-center',
            isSaving ? 'bg-gray-300' : 'bg-teal-600'
          )}
        >
          {isSaving ? (
            <ActivityIndicator size="small" color="#FFFFFF" />
          ) : (
            <Text className="text-base font-bold text-white">Save Changes</Text>
          )}
        </Pressable>

        <Pressable
          onPress={() => router.back()}
          disabled={isSaving}
          className="py-4 rounded-xl items-center justify-center border border-gray-300"
        >
          <Text className="text-base font-semibold text-gray-700">Cancel</Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}
