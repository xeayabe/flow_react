import React, { useState } from 'react';
import { View, Text, Pressable, ScrollView, TextInput, Alert, ActivityIndicator, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { ArrowLeft, User, Mail, Info } from 'lucide-react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { db } from '@/lib/db';
import { colors, borderRadius } from '@/lib/design-tokens';
import Constants from 'expo-constants';

export default function ProfileScreen() {
  const insets = useSafeAreaInsets();
  const queryClient = useQueryClient();
  const { user } = db.useAuth();

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [isEditing, setIsEditing] = useState(false);

  // Query user profile
  const { data: profileData } = db.useQuery({
    users: {
      $: {
        where: {
          email: user?.email || '',
        },
      },
    },
  });

  const userProfile = profileData?.users?.[0];

  // Initialize form fields when profile loads
  React.useEffect(() => {
    if (userProfile && !isEditing) {
      setName(userProfile.name || '');
      setEmail(user?.email || '');
    }
  }, [userProfile, user?.email, isEditing]);

  // Update profile mutation
  const updateProfileMutation = useMutation({
    mutationFn: async (data: { name?: string; email?: string }) => {
      if (!userProfile?.id) throw new Error('No user profile found');

      await db.transact([
        db.tx.users[userProfile.id].update(data)
      ]);

      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['user-profile'] });
      setIsEditing(false);
      Alert.alert('Success', 'Profile updated successfully');
    },
    onError: (error) => {
      console.error('Error updating profile:', error);
      Alert.alert('Error', 'Failed to update profile. Please try again.');
    },
  });

  const handleSave = () => {
    if (!name.trim()) {
      Alert.alert('Required', 'Please enter your name');
      return;
    }

    if (!email.trim()) {
      Alert.alert('Required', 'Please enter your email');
      return;
    }

    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      Alert.alert('Invalid Email', 'Please enter a valid email address');
      return;
    }

    updateProfileMutation.mutate({ name: name.trim(), email: email.trim() });
  };

  const handleCancel = () => {
    setName(userProfile?.name || '');
    setEmail(user?.email || '');
    setIsEditing(false);
  };

  const displayName = userProfile?.name || user?.email?.split('@')[0] || 'User';
  const appVersion = Constants.expoConfig?.version || '1.0.0';

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
          <Text className="text-white text-xl font-semibold">Profile</Text>
        </View>

        {!isEditing && (
          <Pressable
            onPress={() => setIsEditing(true)}
            style={{
              paddingHorizontal: 16,
              paddingVertical: 8,
              borderRadius: borderRadius.sm,
              backgroundColor: 'rgba(168, 181, 161, 0.2)',
              borderWidth: 1,
              borderColor: 'rgba(168, 181, 161, 0.3)',
            }}
          >
            <Text style={{ color: colors.sageGreen }} className="font-semibold text-sm">
              Edit
            </Text>
          </Pressable>
        )}
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{
          paddingHorizontal: 20,
          paddingBottom: insets.bottom + 24,
        }}
      >
        {/* Profile Avatar Section */}
        <Animated.View entering={FadeInDown.delay(0).duration(400)}>
          <View
            style={{
              backgroundColor: colors.glassWhite,
              borderWidth: 1,
              borderColor: colors.glassBorder,
              borderRadius: borderRadius.lg,
              padding: 20,
              marginBottom: 24,
              alignItems: 'center',
            }}
          >
            <View
              style={{
                width: 80,
                height: 80,
                borderRadius: 40,
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: 'rgba(168, 181, 161, 0.2)',
                borderWidth: 2,
                borderColor: 'rgba(168, 181, 161, 0.3)',
                marginBottom: 16,
              }}
            >
              <Text className="text-3xl font-bold" style={{ color: colors.sageGreen }}>
                {displayName.charAt(0).toUpperCase()}
              </Text>
            </View>
            <Text className="text-xl font-semibold" style={{ color: colors.textWhite }}>
              {displayName}
            </Text>
            <Text className="text-sm mt-1" style={{ color: colors.textWhiteSecondary }}>
              {user?.email}
            </Text>
          </View>
        </Animated.View>

        {/* Personal Information */}
        <Animated.View entering={FadeInDown.delay(100).duration(400)}>
          <Text
            style={{ color: colors.sageGreen }}
            className="text-xs font-semibold mb-3"
          >
            PERSONAL INFORMATION
          </Text>

          {/* Name Field */}
          <View
            style={{
              backgroundColor: colors.glassWhite,
              borderWidth: 1,
              borderColor: colors.glassBorder,
              borderRadius: borderRadius.lg,
              padding: 16,
              marginBottom: 12,
            }}
          >
            <View className="flex-row items-center gap-3 mb-2">
              <User size={20} color={colors.sageGreen} />
              <Text style={{ color: colors.textWhiteSecondary }} className="text-xs">
                Full Name
              </Text>
            </View>
            {isEditing ? (
              <TextInput
                value={name}
                onChangeText={setName}
                placeholder="Enter your name"
                placeholderTextColor={colors.textWhiteDisabled}
                style={{
                  color: colors.textWhite,
                  fontSize: 16,
                  fontWeight: '600',
                  padding: 0,
                }}
              />
            ) : (
              <Text style={{ color: colors.textWhite }} className="text-base font-semibold">
                {userProfile?.name || 'Not set'}
              </Text>
            )}
          </View>

          {/* Email Field */}
          <View
            style={{
              backgroundColor: colors.glassWhite,
              borderWidth: 1,
              borderColor: colors.glassBorder,
              borderRadius: borderRadius.lg,
              padding: 16,
              marginBottom: 24,
            }}
          >
            <View className="flex-row items-center gap-3 mb-2">
              <Mail size={20} color={colors.sageGreen} />
              <Text style={{ color: colors.textWhiteSecondary }} className="text-xs">
                Email Address
              </Text>
            </View>
            {isEditing ? (
              <TextInput
                value={email}
                onChangeText={setEmail}
                placeholder="Enter your email"
                placeholderTextColor={colors.textWhiteDisabled}
                keyboardType="email-address"
                autoCapitalize="none"
                style={{
                  color: colors.textWhite,
                  fontSize: 16,
                  fontWeight: '600',
                  padding: 0,
                }}
              />
            ) : (
              <Text style={{ color: colors.textWhite }} className="text-base font-semibold">
                {user?.email}
              </Text>
            )}
          </View>
        </Animated.View>

        {/* App Information */}
        <Animated.View entering={FadeInDown.delay(200).duration(400)}>
          <Text
            style={{ color: colors.sageGreen }}
            className="text-xs font-semibold mb-3"
          >
            APP INFORMATION
          </Text>

          <View
            style={{
              backgroundColor: colors.glassWhite,
              borderWidth: 1,
              borderColor: colors.glassBorder,
              borderRadius: borderRadius.lg,
              padding: 16,
              marginBottom: 24,
            }}
          >
            <View className="flex-row items-center gap-3 mb-2">
              <Info size={20} color={colors.sageGreen} />
              <Text style={{ color: colors.textWhiteSecondary }} className="text-xs">
                Version
              </Text>
            </View>
            <Text style={{ color: colors.textWhite }} className="text-base font-semibold">
              {appVersion}
            </Text>
          </View>
        </Animated.View>

        {/* Action Buttons (when editing) */}
        {isEditing && (
          <Animated.View entering={FadeInDown.delay(300).duration(400)}>
            <View className="flex-row gap-3">
              <Pressable
                onPress={handleCancel}
                style={{
                  flex: 1,
                  padding: 16,
                  borderRadius: borderRadius.md,
                  backgroundColor: colors.glassWhite,
                  borderWidth: 1,
                  borderColor: colors.glassBorder,
                  alignItems: 'center',
                }}
              >
                <Text style={{ color: colors.textWhite }} className="font-semibold text-base">
                  Cancel
                </Text>
              </Pressable>

              <Pressable
                onPress={handleSave}
                disabled={updateProfileMutation.isPending}
                style={{
                  flex: 1,
                  padding: 16,
                  borderRadius: borderRadius.md,
                  backgroundColor: 'rgba(168, 181, 161, 0.3)',
                  borderWidth: 1,
                  borderColor: 'rgba(168, 181, 161, 0.5)',
                  alignItems: 'center',
                  opacity: updateProfileMutation.isPending ? 0.5 : 1,
                }}
              >
                {updateProfileMutation.isPending ? (
                  <ActivityIndicator color={colors.textWhite} />
                ) : (
                  <Text style={{ color: colors.textWhite }} className="font-semibold text-base">
                    Save
                  </Text>
                )}
              </Pressable>
            </View>
          </Animated.View>
        )}
      </ScrollView>
    </LinearGradient>
  );
}
