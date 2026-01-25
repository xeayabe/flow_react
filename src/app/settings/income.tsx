import React, { useState } from 'react';
import { View, Text, TextInput, Pressable, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, DollarSign, Info } from 'lucide-react-native';
import { router } from 'expo-router';
import { db } from '@/lib/db';

export default function IncomeScreen() {
  const { user } = db.useAuth();
  const queryClient = useQueryClient();
  const [income, setIncome] = useState('');
  const [showSuccess, setShowSuccess] = useState(false);

  // Load current income
  const memberQuery = useQuery({
    queryKey: ['member-income', user?.email],
    queryFn: async () => {
      if (!user?.email) throw new Error('No user email');
      const { data: userData } = await db.queryOnce({
        users: { $: { where: { email: user.email } } }
      });
      const userProfile = userData.users?.[0];
      if (!userProfile) throw new Error('User profile not found');

      const { data: memberData } = await db.queryOnce({
        householdMembers: {
          $: { where: { userId: userProfile.id, status: 'active' } }
        }
      });

      const member = memberData.householdMembers?.[0];
      if (!member) throw new Error('Household member not found');

      return member;
    },
    enabled: !!user?.email,
  });

  // Initialize income from current value
  React.useEffect(() => {
    if (memberQuery.data?.monthlyIncome !== undefined && memberQuery.data?.monthlyIncome !== null) {
      setIncome(memberQuery.data.monthlyIncome.toString());
    }
  }, [memberQuery.data?.monthlyIncome]);

  const updateIncomeMutation = useMutation({
    mutationFn: async (newIncome: number) => {
      if (!memberQuery.data?.id) throw new Error('Member not found');

      await db.transact([
        db.tx.householdMembers[memberQuery.data.id].update({
          monthlyIncome: newIncome
        })
      ]);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['member-income'] });
      setShowSuccess(true);
      setTimeout(() => {
        router.back();
      }, 1500);
    },
    onError: (error) => {
      console.error('Failed to update income:', error);
    }
  });

  const handleSave = () => {
    const amount = parseFloat(income.replace(/[^0-9.]/g, ''));
    if (isNaN(amount) || amount < 0) {
      return;
    }
    updateIncomeMutation.mutate(amount);
  };

  const isValidAmount = () => {
    const amount = parseFloat(income.replace(/[^0-9.]/g, ''));
    return !isNaN(amount) && amount >= 0;
  };

  const formatDisplayIncome = (value: number) => {
    return new Intl.NumberFormat('de-CH', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(value);
  };

  if (memberQuery.isLoading) {
    return (
      <SafeAreaView className="flex-1 bg-white" edges={['top']}>
        <View className="flex-1 items-center justify-center">
          <Text className="text-gray-500">Loading...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-white" edges={['top']}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        className="flex-1"
      >
        {/* Header */}
        <View className="flex-row items-center px-4 py-4 border-b border-gray-100">
          <Pressable
            onPress={() => router.back()}
            className="p-2 -ml-2 active:opacity-60"
          >
            <ArrowLeft size={24} color="#374151" />
          </Pressable>
          <Text className="text-lg font-semibold text-gray-900 ml-2">Monthly Income</Text>
        </View>

        <ScrollView
          className="flex-1"
          contentContainerStyle={{ padding: 24 }}
          keyboardShouldPersistTaps="handled"
        >
          {/* Title */}
          <View className="mb-6">
            <Text className="text-2xl font-bold text-gray-900 mb-2">
              Set Your Monthly Income
            </Text>
            <Text className="text-gray-600 leading-5">
              This is used to calculate fair expense splits with your household partner.
            </Text>
          </View>

          {/* Income Input */}
          <View className="mb-6">
            <Text className="text-sm font-medium text-gray-700 mb-2">
              Monthly Income (CHF)
            </Text>
            <View className="flex-row items-center border-2 border-gray-200 rounded-xl bg-gray-50 focus:border-teal-500">
              <View className="pl-4">
                <DollarSign size={24} color="#6B7280" />
              </View>
              <TextInput
                value={income}
                onChangeText={setIncome}
                placeholder="0.00"
                keyboardType="decimal-pad"
                className="flex-1 p-4 text-2xl font-semibold text-gray-900"
                placeholderTextColor="#9CA3AF"
              />
              <View className="pr-4">
                <Text className="text-lg text-gray-500 font-medium">CHF</Text>
              </View>
            </View>
            {memberQuery.data?.monthlyIncome !== undefined && memberQuery.data?.monthlyIncome > 0 && (
              <Text className="text-sm text-gray-500 mt-2">
                Current: {formatDisplayIncome(memberQuery.data.monthlyIncome)} CHF
              </Text>
            )}
          </View>

          {/* Save Button */}
          <Pressable
            onPress={handleSave}
            disabled={updateIncomeMutation.isPending || !isValidAmount() || showSuccess}
            className={`py-4 px-6 rounded-xl ${
              showSuccess
                ? 'bg-green-500'
                : isValidAmount() && !updateIncomeMutation.isPending
                  ? 'bg-teal-600 active:bg-teal-700'
                  : 'bg-gray-300'
            }`}
          >
            <Text className="text-white text-center font-semibold text-lg">
              {showSuccess
                ? '✓ Saved!'
                : updateIncomeMutation.isPending
                  ? 'Saving...'
                  : 'Save Income'}
            </Text>
          </Pressable>

          {/* Error message */}
          {updateIncomeMutation.isError && (
            <View className="mt-4 p-3 bg-red-50 rounded-lg">
              <Text className="text-red-600 text-center text-sm">
                Could not update income. Please try again.
              </Text>
            </View>
          )}

          {/* Info Card */}
          <View className="mt-8 bg-blue-50 p-4 rounded-xl border border-blue-100">
            <View className="flex-row items-start gap-3">
              <Info size={20} color="#1D4ED8" />
              <View className="flex-1">
                <Text className="text-blue-900 font-semibold mb-1">
                  Fair Expense Splitting
                </Text>
                <Text className="text-blue-700 text-sm leading-5">
                  Shared expenses will be split proportionally based on income.
                  For example, if you earn 60% of the household income, you'll
                  contribute 60% toward shared expenses.
                </Text>
              </View>
            </View>
          </View>

          {/* Privacy Note */}
          <View className="mt-4 p-3 bg-gray-50 rounded-lg">
            <Text className="text-gray-500 text-xs text-center">
              Your income is only visible to members of your household
            </Text>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
