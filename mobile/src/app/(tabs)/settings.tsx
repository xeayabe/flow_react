import React, { useState } from 'react';
import { View, Text, Pressable, ScrollView, Alert, ActivityIndicator } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { ChevronRight, Tag, LogOut, Wallet, Calendar, PieChart, Download, Layers, UserPlus, Users } from 'lucide-react-native';
import { useQuery } from '@tanstack/react-query';
import { db } from '@/lib/db';
import { signOut } from '@/lib/auth-api';
import { colors, borderRadius } from '@/lib/design-tokens';

interface MenuItem {
  icon: React.ReactNode;
  label: string;
  description: string;
  onPress: () => void;
}

export default function TabTwoScreen() {
  const insets = useSafeAreaInsets();
  const { user } = db.useAuth();
  const [isSigningOut, setIsSigningOut] = useState(false);

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
  const displayName = userProfile?.name || user?.email?.split('@')[0] || 'User';

  // Get user's role in household
  const { data: userRole, isLoading: isLoadingRole } = useQuery({
    queryKey: ['user-role', userProfile?.id],
    queryFn: async () => {
      console.log('Fetching user role for user ID:', userProfile?.id);

      // Get household member record
      const { data: memberData } = await db.queryOnce({
        householdMembers: {
          $: { where: { userId: userProfile!.id, status: 'active' } }
        }
      });

      console.log('Household members found:', memberData.householdMembers);
      return null; // Role field no longer exists
    },
    enabled: !!userProfile?.id
  });

  // Check if household has 2+ members (for split settings visibility)
  const { data: showSplitSettings, isLoading: isLoadingSplitSettings } = useQuery({
    queryKey: ['show-split-settings', userProfile?.id],
    queryFn: async () => {
      if (!userProfile?.id) return false;

      const { data: memberData } = await db.queryOnce({
        householdMembers: {
          $: { where: { userId: userProfile.id, status: 'active' } }
        }
      });

      const member = memberData.householdMembers?.[0];
      if (!member) return false;

      const { data: allMembers } = await db.queryOnce({
        householdMembers: {
          $: { where: { householdId: member.householdId, status: 'active' } }
        }
      });

      return (allMembers.householdMembers?.length || 0) >= 2;
    },
    enabled: !!userProfile?.id
  });

  const handleSignOut = async () => {
    Alert.alert('Sign Out', 'Are you sure you want to sign out?', [
      { text: 'Cancel', onPress: () => {}, style: 'cancel' },
      {
        text: 'Sign Out',
        onPress: async () => {
          setIsSigningOut(true);
          try {
            await signOut();
            router.replace('/login');
          } catch (error) {
            Alert.alert('Error', 'Failed to sign out. Please try again.');
            setIsSigningOut(false);
          }
        },
        style: 'destructive',
      },
    ]);
  };

  // Show loading screen until all data is ready
  if (isLoadingSplitSettings || !userProfile) {
    return (
      <LinearGradient
        colors={[colors.contextDark, colors.contextTeal]}
        start={{ x: 0, y: 0 }}
        end={{ x: 0, y: 1 }}
        style={{ flex: 1 }}
      >
        <View
          className="flex-row items-center px-5 pb-4"
          style={{ paddingTop: insets.top + 16 }}
        >
          <Text className="text-white text-xl font-semibold">Settings</Text>
        </View>
        <View className="flex-1 items-center justify-center">
          <Animated.View entering={FadeInDown.duration(400)}>
            <Text className="text-4xl mb-4">⚙️</Text>
          </Animated.View>
          <Text style={{ color: colors.textWhiteSecondary }} className="text-sm">
            Loading settings...
          </Text>
        </View>
      </LinearGradient>
    );
  }

  const menuItems: MenuItem[] = [
    {
      icon: <Wallet size={24} color={colors.sageGreen} />,
      label: 'Wallets',
      description: 'Manage your accounts and wallets',
      onPress: () => router.push('/wallets'),
    },
    // Household & Members Section
    {
      icon: <UserPlus size={24} color={colors.sageGreen} />,
      label: 'Invite Partner',
      description: 'Share a code to invite someone to your household',
      onPress: () => router.push('/settings/invite'),
    },
    // Show household members if 2+ members
    ...(showSplitSettings
      ? [
          {
            icon: <Users size={24} color={colors.sageGreen} />,
            label: 'Household Members',
            description: 'View and manage household members',
            onPress: () => router.push('/settings/household-members'),
          },
        ]
      : []),
    {
      icon: <Calendar size={24} color={colors.sageGreen} />,
      label: 'Payday & Budget Period',
      description: 'Set when you get paid each month',
      onPress: () => router.push('/settings/payday'),
    },
    // Only show split settings if household has 2+ members
    ...(showSplitSettings
      ? [
          {
            icon: <PieChart size={24} color={colors.sageGreen} />,
            label: 'Expense Splitting',
            description: 'Manage how shared expenses are divided',
            onPress: () => router.push('/settings/split-settings'),
          },
        ]
      : []),
    {
      icon: <Tag size={24} color={colors.sageGreen} />,
      label: 'Categories',
      description: 'Organize your income and expenses',
      onPress: () => router.push('/settings/categories'),
    },
    {
      icon: <Layers size={24} color={colors.sageGreen} />,
      label: 'Category Groups',
      description: 'Create and manage budget category groups',
      onPress: () => router.push('/settings/category-groups'),
    },
    {
      icon: <Download size={24} color={colors.sageGreen} />,
      label: 'Export Data',
      description: 'Export your transactions to CSV or Excel',
      onPress: () => router.push('/settings/export'),
    },
  ];

  return (
    <LinearGradient
      colors={[colors.contextDark, colors.contextTeal]}
      start={{ x: 0, y: 0 }}
      end={{ x: 0, y: 1 }}
      style={{ flex: 1 }}
    >
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{
          paddingTop: insets.top + 20,
          paddingHorizontal: 20,
          paddingBottom: insets.bottom + 32,
        }}
      >
        {/* User Profile Section */}
        <Animated.View entering={FadeInDown.delay(0).duration(400)}>
          <Pressable
            onPress={() => router.push('/settings/profile')}
            style={{
              backgroundColor: colors.glassWhite,
              borderWidth: 1,
              borderColor: colors.glassBorder,
              borderRadius: borderRadius.lg,
              padding: 20,
              marginBottom: 24,
            }}
          >
            <View className="flex-row items-center gap-4">
              <View
                style={{
                  width: 64,
                  height: 64,
                  borderRadius: 32,
                  alignItems: 'center',
                  justifyContent: 'center',
                  backgroundColor: 'rgba(168, 181, 161, 0.2)',
                  borderWidth: 2,
                  borderColor: 'rgba(168, 181, 161, 0.3)',
                }}
              >
                <Text className="text-2xl font-bold" style={{ color: colors.sageGreen }}>
                  {displayName.charAt(0).toUpperCase()}
                </Text>
              </View>
              <View className="flex-1">
                <Text className="text-xl font-semibold" style={{ color: colors.textWhite }}>
                  {displayName}
                </Text>
                <Text className="text-sm mt-1" style={{ color: colors.textWhiteSecondary }}>
                  {user?.email}
                </Text>
              </View>
              <ChevronRight size={20} color={colors.textWhiteSecondary} />
            </View>
          </Pressable>
        </Animated.View>

        {/* Menu Items */}
        <View style={{ gap: 12, marginBottom: 24 }}>
          {menuItems.map((item, index) => (
            <Animated.View
              key={index}
              entering={FadeInDown.delay(100 + index * 50).duration(400)}
            >
              <Pressable
                onPress={item.onPress}
                style={{
                  backgroundColor: colors.glassWhite,
                  borderWidth: 1,
                  borderColor: colors.glassBorder,
                  borderRadius: borderRadius.md,
                  padding: 16,
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                }}
              >
                <View className="flex-row items-center gap-4 flex-1">
                  {item.icon}
                  <View className="flex-1">
                    <Text className="text-base font-semibold" style={{ color: colors.textWhite }}>
                      {item.label}
                    </Text>
                    <Text className="text-sm mt-0.5" style={{ color: colors.textWhiteSecondary }}>
                      {item.description}
                    </Text>
                  </View>
                </View>
                <ChevronRight size={20} color={colors.textWhiteSecondary} />
              </Pressable>
            </Animated.View>
          ))}
        </View>

        {/* Sign Out Button */}
        <Animated.View entering={FadeInDown.delay(100 + menuItems.length * 50).duration(400)}>
          <Pressable
            onPress={handleSignOut}
            disabled={isSigningOut}
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 8,
              padding: 16,
              borderRadius: borderRadius.md,
              backgroundColor: 'rgba(227, 160, 93, 0.2)',
              borderWidth: 1,
              borderColor: 'rgba(227, 160, 93, 0.4)',
              opacity: isSigningOut ? 0.5 : 1,
            }}
          >
            {isSigningOut ? (
              <ActivityIndicator size="small" color={colors.textWhite} />
            ) : (
              <>
                <LogOut size={20} color={colors.textWhite} />
                <Text className="text-base font-semibold" style={{ color: colors.textWhite }}>
                  Sign Out
                </Text>
              </>
            )}
          </Pressable>
        </Animated.View>
      </ScrollView>
    </LinearGradient>
  );
}
