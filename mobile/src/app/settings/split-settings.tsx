import React, { useState, useEffect } from 'react';
import { View, Text, Pressable, ScrollView, TextInput, Alert, ActivityIndicator } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, Zap, Edit3, AlertCircle, Info } from 'lucide-react-native';
import Animated, { FadeIn, FadeInDown, useSharedValue } from 'react-native-reanimated';
import { router } from 'expo-router';
import { db } from '@/lib/db';
import { getSplitSettings, updateSplitSettings } from '@/lib/split-settings-api';
import { getUserProfileAndHousehold } from '@/lib/household-utils';
import { colors, spacing, borderRadius } from '@/lib/design-tokens';
import StickyStatusBar from '@/components/layout/StickyStatusBar';

export default function SplitSettingsScreen() {
  const insets = useSafeAreaInsets();
  const scrollY = useSharedValue(0);
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
      <LinearGradient
        colors={[colors.contextDark, colors.contextTeal]}
        start={{ x: 0, y: 0 }}
        end={{ x: 0, y: 1 }}
        style={{ flex: 1, paddingTop: insets.top }}
      >
        <View className="flex-1 items-center justify-center">
          <Animated.View entering={FadeIn.duration(500)}>
            <Text className="text-4xl mb-4">⚖️</Text>
          </Animated.View>
          <Text style={{ color: colors.textWhiteSecondary }} className="text-sm">
            Loading settings...
          </Text>
        </View>
      </LinearGradient>
    );
  }

  if (!settingsData?.settings) {
    return (
      <LinearGradient
        colors={[colors.contextDark, colors.contextTeal]}
        start={{ x: 0, y: 0 }}
        end={{ x: 0, y: 1 }}
        style={{ flex: 1 }}
      >
        <StickyStatusBar scrollY={scrollY} />

        <View style={{ paddingTop: insets.top + 16, paddingHorizontal: 20 }}>
          {/* Header */}
          <Animated.View
            entering={FadeInDown.delay(0).duration(400)}
            className="flex-row items-center justify-between mb-6"
          >
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
              }}
            >
              <ArrowLeft size={20} color={colors.textWhite} strokeWidth={2} />
            </Pressable>
          </Animated.View>

          <View className="flex-1 items-center justify-center" style={{ marginTop: 100 }}>
            <Animated.View entering={FadeIn.duration(500)}>
              <Text className="text-4xl mb-4">⚖️</Text>
            </Animated.View>
            <Text style={{ color: colors.textWhiteSecondary }} className="text-sm text-center px-6">
              Split settings are only available for households with 2+ members
            </Text>
          </View>
        </View>
      </LinearGradient>
    );
  }

  const { settings } = settingsData;
  const totalManual = Object.values(manualPercentages).reduce(
    (sum, val) => sum + (parseFloat(val) || 0),
    0
  );

  return (
    <LinearGradient
      colors={[colors.contextDark, colors.contextTeal]}
      start={{ x: 0, y: 0 }}
      end={{ x: 0, y: 1 }}
      style={{ flex: 1 }}
    >
      <StickyStatusBar scrollY={scrollY} />

      {/* Header */}
      <View
        className="flex-row items-center px-5 pb-4"
        style={{ paddingTop: insets.top + 16 }}
      >
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
        <Text className="text-white text-xl font-semibold">Expense Splitting</Text>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{
          paddingBottom: insets.bottom + 24,
          paddingHorizontal: 20,
        }}
      >
        {/* Description */}
        <Animated.View entering={FadeInDown.delay(0).duration(400)}>
          <Text
            style={{ color: colors.textWhiteSecondary }}
            className="text-sm mb-6"
          >
            How shared expenses are divided
          </Text>
        </Animated.View>

        {/* Current Split Display */}
        <Animated.View entering={FadeInDown.delay(200).duration(400)}>
          <View
            style={{
              backgroundColor: colors.glassWhite,
              borderWidth: 1,
              borderColor: colors.glassBorder,
              borderRadius: borderRadius.lg,
              padding: 20,
              marginBottom: 16,
            }}
          >
            <View className="flex-row items-center mb-4">
              {isManualMode ? (
                <Edit3 size={18} color={colors.sageGreen} />
              ) : (
                <Zap size={18} color={colors.sageGreen} />
              )}
              <Text
                style={{ color: colors.sageGreen }}
                className="text-xs ml-2 font-semibold"
              >
                {isManualMode ? 'MANUAL SPLIT' : 'AUTOMATIC SPLIT'}
              </Text>
            </View>

            {settings.members.map((member: any) => {
              const percentage = isManualMode
                ? parseFloat(manualPercentages[member.userId] || '0')
                : member.percentage;

              return (
                <View key={member.userId} className="flex-row items-center justify-between mb-3">
                  <Text style={{ color: colors.textWhite }} className="text-base">
                    {member.name}
                  </Text>
                  <Text
                    style={{ color: colors.textWhite }}
                    className="text-2xl font-bold"
                  >
                    {percentage.toFixed(1)}%
                  </Text>
                </View>
              );
            })}

            {!isManualMode && (
              <Text
                style={{ color: colors.textWhiteSecondary }}
                className="text-xs mt-2"
              >
                Calculated from monthly income ratio
              </Text>
            )}
          </View>
        </Animated.View>

        {/* Manual Mode Editor */}
        {isManualMode && (
          <Animated.View entering={FadeInDown.delay(300).duration(400)}>
            <View
              style={{
                backgroundColor: colors.glassWhite,
                borderWidth: 1,
                borderColor: colors.glassBorder,
                borderRadius: borderRadius.lg,
                padding: 20,
                marginBottom: 16,
              }}
            >
              <Text
                style={{ color: colors.sageGreen }}
                className="text-xs mb-4 font-semibold"
              >
                ADJUST PERCENTAGES
              </Text>

              {settings.members.map((member: any, index: number) => (
                <View key={member.userId} className="mb-4">
                  <Text
                    style={{ color: colors.textWhiteSecondary }}
                    className="text-sm mb-2"
                  >
                    {member.name}
                  </Text>
                  <View className="flex-row items-center">
                    <TextInput
                      value={manualPercentages[member.userId] || ''}
                      onChangeText={(value) => handlePercentageChange(member.userId, value)}
                      keyboardType="decimal-pad"
                      editable={index === 0} // Only first person editable, second auto-calculates
                      style={{
                        flex: 1,
                        borderWidth: 2,
                        borderColor: index === 0 ? colors.contextTeal : colors.glassBorder,
                        backgroundColor: index === 0 ? 'rgba(255,255,255,0.05)' : colors.glassWhite,
                        borderRadius: borderRadius.md,
                        padding: 12,
                        fontSize: 20,
                        fontWeight: '600',
                        color: colors.textWhite,
                      }}
                      placeholderTextColor={colors.textWhiteSecondary}
                    />
                    <Text
                      style={{ color: colors.textWhiteSecondary }}
                      className="text-xl font-bold ml-2"
                    >
                      %
                    </Text>
                  </View>
                  {index === 0 && (
                    <Text
                      style={{ color: colors.textWhiteSecondary }}
                      className="text-xs mt-1"
                    >
                      Other percentage auto-calculated
                    </Text>
                  )}
                </View>
              ))}

              <View
                style={{
                  padding: 12,
                  borderRadius: borderRadius.md,
                  backgroundColor:
                    Math.abs(totalManual - 100) < 0.1
                      ? 'rgba(168, 181, 161, 0.15)'
                      : 'rgba(227, 160, 93, 0.15)',
                  borderWidth: 1,
                  borderColor:
                    Math.abs(totalManual - 100) < 0.1
                      ? 'rgba(168, 181, 161, 0.3)'
                      : 'rgba(227, 160, 93, 0.3)',
                }}
              >
                <Text
                  style={{
                    color: Math.abs(totalManual - 100) < 0.1 ? colors.sageGreen : '#E3A05D',
                    fontSize: 14,
                    fontWeight: '600',
                  }}
                >
                  Total: {totalManual.toFixed(1)}%
                  {Math.abs(totalManual - 100) < 0.1 ? ' ✓' : ' (must equal 100%)'}
                </Text>
              </View>
            </View>
          </Animated.View>
        )}

        {/* Toggle Button */}
        <Animated.View entering={FadeInDown.delay(400).duration(400)}>
          <Pressable
            onPress={() => setIsManualMode(!isManualMode)}
            style={{
              backgroundColor: colors.glassWhite,
              borderWidth: 1,
              borderColor: colors.glassBorder,
              borderRadius: borderRadius.md,
              paddingVertical: 14,
              paddingHorizontal: 16,
              marginBottom: 16,
            }}
          >
            <Text
              style={{ color: colors.textWhite }}
              className="text-center font-semibold"
            >
              {isManualMode ? '⚡ Switch to Automatic' : '✏️ Switch to Manual'}
            </Text>
          </Pressable>
        </Animated.View>

        {/* Save Button */}
        <Animated.View entering={FadeInDown.delay(500).duration(400)}>
          <Pressable
            onPress={() => saveSettingsMutation.mutate()}
            disabled={saveSettingsMutation.isPending || (isManualMode && Math.abs(totalManual - 100) > 0.1)}
            style={{
              backgroundColor:
                saveSettingsMutation.isPending || (isManualMode && Math.abs(totalManual - 100) > 0.1)
                  ? 'rgba(255,255,255,0.1)'
                  : colors.contextTeal,
              borderRadius: borderRadius.md,
              paddingVertical: 16,
              opacity:
                saveSettingsMutation.isPending || (isManualMode && Math.abs(totalManual - 100) > 0.1)
                  ? 0.5
                  : 1,
            }}
          >
            {saveSettingsMutation.isPending ? (
              <ActivityIndicator color={colors.textWhite} />
            ) : (
              <Text
                style={{ color: colors.textWhite }}
                className="text-center font-semibold text-lg"
              >
                Save Split Settings
              </Text>
            )}
          </Pressable>
        </Animated.View>

        {/* Info Card */}
        <Animated.View
          entering={FadeInDown.delay(600).duration(400)}
          style={{ marginTop: 16 }}
        >
          <View
            style={{
              backgroundColor: 'rgba(168, 181, 161, 0.1)',
              borderWidth: 1,
              borderColor: 'rgba(168, 181, 161, 0.2)',
              borderRadius: borderRadius.lg,
              padding: 16,
            }}
          >
            <View className="flex-row items-start gap-3">
              <Info size={18} color={colors.sageGreen} />
              <View className="flex-1">
                <Text
                  style={{ color: colors.sageGreen }}
                  className="font-semibold mb-2"
                >
                  How it works
                </Text>
                <Text
                  style={{ color: colors.textWhiteSecondary }}
                  className="text-sm leading-5 mb-1"
                >
                  • Automatic: Split based on income ratio
                </Text>
                <Text
                  style={{ color: colors.textWhiteSecondary }}
                  className="text-sm leading-5 mb-1"
                >
                  • Manual: Set custom percentages
                </Text>
                <Text
                  style={{ color: colors.textWhiteSecondary }}
                  className="text-sm leading-5"
                >
                  • Only affects NEW shared expenses (existing debt unchanged)
                </Text>
              </View>
            </View>
          </View>
        </Animated.View>
      </ScrollView>
    </LinearGradient>
  );
}
