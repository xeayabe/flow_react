import React, { useEffect } from 'react';
import { View, Text, Pressable, Alert, ScrollView } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { useMutation } from '@tanstack/react-query';
import { ArrowLeft, RefreshCw, Copy, Clock, Info } from 'lucide-react-native';
import { router } from 'expo-router';
import * as Clipboard from 'expo-clipboard';
import Animated, { FadeIn, FadeInDown, useSharedValue } from 'react-native-reanimated';
import { createInviteCode } from '@/lib/invites-api';
import { db } from '@/lib/db';
import { colors, spacing, borderRadius } from '@/lib/design-tokens';
import StickyStatusBar from '@/components/layout/StickyStatusBar';

export default function InviteScreen() {
  const insets = useSafeAreaInsets();
  const scrollY = useSharedValue(0);

  const [inviteCode, setInviteCode] = React.useState<string | null>(null);
  const [expiresAt, setExpiresAt] = React.useState<number | null>(null);
  const [timeRemaining, setTimeRemaining] = React.useState<number>(300);

  // Get current user from InstantDB auth
  const { isLoading: authLoading, user, error: authError } = db.useAuth();

  const createCodeMutation = useMutation({
    mutationFn: async () => {
      if (!user?.email) {
        throw new Error('User not authenticated');
      }

      // Get user profile from the users table using email
      const { data: userData } = await db.queryOnce({
        users: {
          $: { where: { email: user.email } }
        }
      });

      const userProfile = userData.users?.[0];

      if (!userProfile) {
        throw new Error('User profile not found');
      }

      // Query householdMembers using the profile ID
      const { data: memberData } = await db.queryOnce({
        householdMembers: {
          $: { where: { userId: userProfile.id, status: 'active' } }
        }
      });

      const member = memberData.householdMembers[0];

      if (!member) {
        throw new Error('No household found');
      }

      return createInviteCode(userProfile.id, member.householdId);
    },
    onSuccess: ({ inviteCode: code, expiresAt: expires }) => {
      setInviteCode(code);
      setExpiresAt(expires);
    },
    onError: (error: Error) => {
      Alert.alert('Error', error.message || 'Could not generate code');
    }
  });

  // Countdown timer
  useEffect(() => {
    if (!expiresAt) return;

    const interval = setInterval(() => {
      const remaining = Math.max(0, Math.floor((expiresAt - Date.now()) / 1000));
      setTimeRemaining(remaining);

      if (remaining === 0) {
        setInviteCode(null);
        setExpiresAt(null);
        Alert.alert('Code Expired', 'The invite code has expired. Generate a new one.');
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [expiresAt]);

  const handleGenerateNew = () => {
    setInviteCode(null);
    setExpiresAt(null);
    createCodeMutation.mutate();
  };

  const handleCopyCode = async () => {
    if (!inviteCode) return;
    await Clipboard.setStringAsync(inviteCode);
    Alert.alert('Copied!', 'Invite code copied to clipboard');
  };

  // Loading state
  if (authLoading) {
    return (
      <LinearGradient
        colors={[colors.contextDark, colors.contextTeal]}
        start={{ x: 0, y: 0 }}
        end={{ x: 0, y: 1 }}
        style={{ flex: 1, paddingTop: insets.top }}
      >
        <View className="flex-1 items-center justify-center">
          <Animated.View entering={FadeIn.duration(500)}>
            <Text className="text-4xl mb-4">👥</Text>
          </Animated.View>
          <Text style={{ color: colors.textWhiteSecondary }} className="text-sm">
            Loading...
          </Text>
        </View>
      </LinearGradient>
    );
  }

  // Error state
  if (authError || !user) {
    return (
      <LinearGradient
        colors={[colors.contextDark, colors.contextTeal]}
        start={{ x: 0, y: 0 }}
        end={{ x: 0, y: 1 }}
        style={{ flex: 1, paddingTop: insets.top }}
      >
        <View className="flex-1 items-center justify-center px-6">
          <Text className="text-4xl mb-4">⚠️</Text>
          <Text style={{ color: colors.textWhite }} className="text-lg font-semibold mb-2">
            Authentication Error
          </Text>
          <Text style={{ color: colors.textWhiteSecondary }} className="text-sm text-center">
            Please try again
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
        <Text className="text-white text-xl font-semibold">Invite Your Partner</Text>
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
            Generate a code and share it with your partner to join your household
          </Text>
        </Animated.View>

        {!inviteCode ? (
          /* Generate Code Button */
          <Animated.View entering={FadeInDown.delay(200).duration(400)}>
            <Pressable
              onPress={() => createCodeMutation.mutate()}
              disabled={createCodeMutation.isPending}
              style={{
                backgroundColor: colors.contextTeal,
                borderRadius: borderRadius.md,
                paddingVertical: 16,
                paddingHorizontal: 24,
                alignItems: 'center',
                opacity: createCodeMutation.isPending ? 0.6 : 1,
              }}
            >
              <Text
                style={{ color: colors.textWhite }}
                className="font-semibold text-base"
              >
                {createCodeMutation.isPending ? 'Generating...' : 'Generate Invite Code'}
              </Text>
            </Pressable>
          </Animated.View>
        ) : (
          <View className="gap-4">
            {/* Invite Code Display */}
            <Animated.View entering={FadeInDown.delay(200).duration(400)}>
              <Pressable
                onPress={handleCopyCode}
                style={{
                  backgroundColor: colors.glassWhite,
                  borderWidth: 2,
                  borderColor: colors.borderTeal,
                  borderRadius: borderRadius.lg,
                  padding: 24,
                  alignItems: 'center',
                }}
              >
                <View className="flex-row items-center mb-3">
                  <Copy size={14} color={colors.textWhiteSecondary} />
                  <Text
                    style={{ color: colors.textWhiteSecondary }}
                    className="text-xs ml-2"
                  >
                    Tap to copy
                  </Text>
                </View>
                <Text
                  style={{
                    color: colors.sageGreen,
                    letterSpacing: 8,
                  }}
                  className="text-5xl font-bold"
                >
                  {inviteCode}
                </Text>
              </Pressable>
            </Animated.View>

            {/* Timer Card */}
            <Animated.View entering={FadeInDown.delay(300).duration(400)}>
              <View
                style={{
                  backgroundColor: 'rgba(227, 160, 93, 0.1)',
                  borderWidth: 1,
                  borderColor: 'rgba(227, 160, 93, 0.3)',
                  borderRadius: borderRadius.md,
                  padding: 16,
                }}
              >
                <View className="flex-row items-center justify-center mb-3">
                  <Clock size={16} color="#E3A05D" />
                  <Text
                    style={{ color: '#E3A05D' }}
                    className="font-semibold ml-2"
                  >
                    Expires in {Math.floor(timeRemaining / 60)}:{String(timeRemaining % 60).padStart(2, '0')}
                  </Text>
                </View>

                {/* Progress bar */}
                <View
                  style={{
                    height: 6,
                    backgroundColor: 'rgba(227, 160, 93, 0.2)',
                    borderRadius: 3,
                    overflow: 'hidden',
                  }}
                >
                  <Animated.View
                    style={{
                      height: '100%',
                      backgroundColor: '#E3A05D',
                      borderRadius: 3,
                      width: `${(timeRemaining / 300) * 100}%`,
                    }}
                  />
                </View>
              </View>
            </Animated.View>

            {/* Generate New Button */}
            <Animated.View entering={FadeInDown.delay(400).duration(400)}>
              <Pressable
                onPress={handleGenerateNew}
                style={{
                  backgroundColor: colors.glassWhite,
                  borderWidth: 1,
                  borderColor: colors.glassBorder,
                  borderRadius: borderRadius.md,
                  paddingVertical: 14,
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 8,
                }}
              >
                <RefreshCw size={18} color={colors.textWhite} strokeWidth={2} />
                <Text
                  style={{ color: colors.textWhite }}
                  className="font-semibold"
                >
                  Generate New Code
                </Text>
              </Pressable>
            </Animated.View>

            {/* Instructions Card */}
            <Animated.View entering={FadeInDown.delay(500).duration(400)}>
              <View
                style={{
                  backgroundColor: colors.glassWhite,
                  borderWidth: 1,
                  borderColor: colors.glassBorder,
                  borderRadius: borderRadius.lg,
                  padding: 20,
                }}
              >
                <View className="flex-row items-center mb-4">
                  <Info size={18} color={colors.sageGreen} />
                  <Text
                    style={{ color: colors.textWhite }}
                    className="font-semibold ml-2"
                  >
                    How to use
                  </Text>
                </View>

                <View className="gap-3">
                  <View className="flex-row">
                    <Text style={{ color: colors.textWhiteSecondary }} className="text-sm mr-2">
                      1.
                    </Text>
                    <Text style={{ color: colors.textWhiteSecondary }} className="text-sm flex-1">
                      Share this code with your partner (call, text, or in person)
                    </Text>
                  </View>

                  <View className="flex-row">
                    <Text style={{ color: colors.textWhiteSecondary }} className="text-sm mr-2">
                      2.
                    </Text>
                    <Text style={{ color: colors.textWhiteSecondary }} className="text-sm flex-1">
                      They open Flow and tap "Have an invite code?"
                    </Text>
                  </View>

                  <View className="flex-row">
                    <Text style={{ color: colors.textWhiteSecondary }} className="text-sm mr-2">
                      3.
                    </Text>
                    <Text style={{ color: colors.textWhiteSecondary }} className="text-sm flex-1">
                      They enter the code within 5 minutes to join your household
                    </Text>
                  </View>
                </View>
              </View>
            </Animated.View>
          </View>
        )}
      </ScrollView>
    </LinearGradient>
  );
}
