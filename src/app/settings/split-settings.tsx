import React, { useState, useEffect } from 'react';
import { View, Text, Pressable, ScrollView, TextInput, Alert, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ChevronLeft, Zap, Edit3 } from 'lucide-react-native';
import { router, Stack } from 'expo-router';
import { db } from '@/lib/db';
import { getSplitSettings, updateSplitSettings } from '@/lib/split-settings-api';
import { getUserProfileAndHousehold } from '@/lib/household-utils';
import { cn } from '@/lib/cn';

export default function SplitSettingsScreen() {
  const { user } = db.useAuth();
  const queryClient = useQueryClient();
  const [isManualMode, setIsManualMode] = useState(false);
  const [manualPercentages, setManualPercentages] = useState<Record<string, string>>({});

  // Load household and current settings
  const { data: settingsData, isLoading } = useQuery({
    queryKey: ['split-settings', user?.email],
    queryFn: async () => {
      if (!user?.email) throw new Error('No user email');
      const result = await getUserProfileAndHousehold(user.email);
      if (!result) throw new Error('No household found');

      // Get all household members with names
      const { data: allMembersData } = await db.queryOnce({
        householdMembers: {
          $: { where: { householdId: result.householdId, status: 'active' } }
        },
        users: {}
      });

      const membersWithNames = (allMembersData.householdMembers || []).map((m: any) => {
        const memberUser = (allMembersData.users || []).find((u: any) => u.id === m.userId);
        return {
          ...m,
          userName: memberUser?.name || 'Unknown'
        };
      });

      const settings = await getSplitSettings(result.householdId);

      return {
        householdId: result.householdId,
        settings,
        members: membersWithNames
      };
    },
    enabled: !!user?.email
  });

  // Initialize manual mode state
  useEffect(() => {
    if (settingsData?.settings) {
      setIsManualMode(settingsData.settings.splitMethod === 'manual');

      // Initialize manual percentages
      const initialPercentages: Record<string, string> = {};
      settingsData.settings.members.forEach((m: any) => {
        initialPercentages[m.userId] = m.percentage.toFixed(1);
      });
      setManualPercentages(initialPercentages);
    }
  }, [settingsData]);

  // Calculate second person's percentage automatically
  const handlePercentageChange = (userId: string, value: string) => {
    const newPercentages = { ...manualPercentages };
    newPercentages[userId] = value;

    // Auto-calculate other person's percentage
    if (settingsData?.settings?.members.length === 2) {
      const firstUserId = userId;
      const secondUserId = settingsData.settings.members.find((m: any) => m.userId !== userId)?.userId;

      if (secondUserId) {
        const firstValue = parseFloat(value) || 0;
        const secondValue = 100 - firstValue;
        newPercentages[secondUserId] = secondValue.toFixed(1);
      }
    }

    setManualPercentages(newPercentages);
  };

  // Save settings mutation
  const saveSettingsMutation = useMutation({
    mutationFn: async () => {
      if (!settingsData?.householdId) return;

      if (isManualMode) {
        // Validate and save manual ratios
        const ratios: Record<string, number> = {};
        let total = 0;

        Object.entries(manualPercentages).forEach(([userId, percentage]) => {
          const value = parseFloat(percentage);
          ratios[userId] = value;
          total += value;
        });

        if (Math.abs(total - 100) > 0.1) {
          throw new Error('Percentages must total 100%');
        }

        await updateSplitSettings(settingsData.householdId, 'manual', ratios);
      } else {
        // Save automatic mode
        await updateSplitSettings(settingsData.householdId, 'automatic');
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['split-settings'] });
      queryClient.invalidateQueries({ queryKey: ['split-ratios'] });
      Alert.alert('Success', 'Split settings updated');
    },
    onError: (error: any) => {
      Alert.alert('Error', error.message || 'Could not update settings');
    }
  });

  if (isLoading) {
    return (
      <View className="flex-1 bg-white items-center justify-center">
        <ActivityIndicator size="large" color="#006A6A" />
      </View>
    );
  }

  if (!settingsData?.settings) {
    return (
      <View className="flex-1 bg-white">
        <Stack.Screen
          options={{
            title: 'Expense Splitting',
            headerLeft: () => (
              <Pressable onPress={() => router.back()} className="pl-4">
                <ChevronLeft size={24} color="#006A6A" />
              </Pressable>
            ),
          }}
        />
        <SafeAreaView edges={['bottom']} className="flex-1 items-center justify-center">
          <Text className="text-gray-500">Split settings are only available for households with 2+ members</Text>
        </SafeAreaView>
      </View>
    );
  }

  const { settings } = settingsData;
  const totalManual = Object.values(manualPercentages).reduce(
    (sum, val) => sum + (parseFloat(val) || 0),
    0
  );

  return (
    <View className="flex-1 bg-white">
      <Stack.Screen
        options={{
          title: 'Expense Splitting',
          headerLeft: () => (
            <Pressable onPress={() => router.back()} className="pl-4">
              <ChevronLeft size={24} color="#006A6A" />
            </Pressable>
          ),
        }}
      />

      <SafeAreaView edges={['bottom']} className="flex-1">
        <ScrollView className="flex-1">
          <View className="p-6">
            <Text className="text-2xl font-bold mb-2" style={{ color: '#006A6A' }}>
              Split Settings
            </Text>
            <Text className="text-gray-600 mb-6">
              How shared expenses are divided
            </Text>

            {/* Current Split Display */}
            <View className="bg-gray-50 rounded-2xl p-4 mb-4">
              <View className="flex-row items-center mb-3">
                {isManualMode ? (
                  <Edit3 size={20} color="#6B7280" />
                ) : (
                  <Zap size={20} color="#10B981" />
                )}
                <Text className="text-sm text-gray-600 ml-2 font-semibold">
                  {isManualMode ? 'MANUAL SPLIT' : 'AUTOMATIC SPLIT'}
                </Text>
              </View>

              {settings.members.map((member: any) => {
                const percentage = isManualMode
                  ? parseFloat(manualPercentages[member.userId] || '0')
                  : member.percentage;

                return (
                  <View key={member.userId} className="flex-row items-center justify-between mb-2">
                    <Text className="text-base text-gray-700">{member.name}</Text>
                    <Text className="text-2xl font-bold text-gray-900">
                      {percentage.toFixed(1)}%
                    </Text>
                  </View>
                );
              })}

              {!isManualMode && (
                <Text className="text-xs text-gray-500 mt-2">
                  Calculated from monthly income ratio
                </Text>
              )}
            </View>

            {/* Manual Mode Editor */}
            {isManualMode && (
              <View className="bg-white rounded-2xl p-4 border-2 border-gray-200 mb-4">
                <Text className="text-sm text-gray-600 mb-3 font-semibold">
                  ADJUST PERCENTAGES
                </Text>

                {settings.members.map((member: any, index: number) => (
                  <View key={member.userId} className="mb-4">
                    <Text className="text-sm text-gray-600 mb-2">{member.name}</Text>
                    <View className="flex-row items-center">
                      <TextInput
                        value={manualPercentages[member.userId] || ''}
                        onChangeText={(value) => handlePercentageChange(member.userId, value)}
                        keyboardType="decimal-pad"
                        editable={index === 0} // Only first person editable, second auto-calculates
                        className={cn(
                          'flex-1 border-2 rounded-xl p-3 text-xl font-semibold',
                          index === 0 ? 'border-teal-600' : 'border-gray-200 bg-gray-50'
                        )}
                      />
                      <Text className="text-xl font-bold text-gray-600 ml-2">%</Text>
                    </View>
                    {index === 0 && (
                      <Text className="text-xs text-gray-500 mt-1">
                        Other percentage auto-calculated
                      </Text>
                    )}
                  </View>
                ))}

                <View
                  className={cn(
                    'p-3 rounded-xl',
                    Math.abs(totalManual - 100) < 0.1 ? 'bg-green-50' : 'bg-red-50'
                  )}
                >
                  <Text
                    className={cn(
                      'text-sm font-semibold',
                      Math.abs(totalManual - 100) < 0.1 ? 'text-green-900' : 'text-red-900'
                    )}
                  >
                    Total: {totalManual.toFixed(1)}%
                    {Math.abs(totalManual - 100) < 0.1 ? ' ✓' : ' (must equal 100%)'}
                  </Text>
                </View>
              </View>
            )}

            {/* Toggle Button */}
            <Pressable
              onPress={() => setIsManualMode(!isManualMode)}
              className="bg-gray-100 py-3 px-4 rounded-xl mb-4"
              style={({ pressed }) => [{ opacity: pressed ? 0.7 : 1 }]}
            >
              <Text className="text-center font-semibold text-gray-700">
                {isManualMode ? '⚡ Switch to Automatic' : '✏️ Switch to Manual'}
              </Text>
            </Pressable>

            {/* Save Button */}
            <Pressable
              onPress={() => saveSettingsMutation.mutate()}
              disabled={saveSettingsMutation.isPending || (isManualMode && Math.abs(totalManual - 100) > 0.1)}
              className={cn(
                'py-4 rounded-xl',
                saveSettingsMutation.isPending || (isManualMode && Math.abs(totalManual - 100) > 0.1)
                  ? 'bg-gray-300'
                  : 'bg-teal-600'
              )}
              style={({ pressed }) => [
                { opacity: pressed ? 0.7 : 1 }
              ]}
            >
              {saveSettingsMutation.isPending ? (
                <ActivityIndicator color="white" />
              ) : (
                <Text className="text-white text-center font-semibold text-lg">
                  Save Split Settings
                </Text>
              )}
            </Pressable>

            {/* Info */}
            <View className="bg-blue-50 p-4 rounded-xl mt-6">
              <Text className="text-blue-900 font-semibold mb-1">💡 How it works</Text>
              <Text className="text-blue-700 text-sm mb-2">
                • Automatic: Split based on income ratio
              </Text>
              <Text className="text-blue-700 text-sm mb-2">
                • Manual: Set custom percentages
              </Text>
              <Text className="text-blue-700 text-sm">
                • Only affects NEW shared expenses (existing debt unchanged)
              </Text>
            </View>
          </View>
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}
