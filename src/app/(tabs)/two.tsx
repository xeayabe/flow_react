import React, { useState } from 'react';
import { View, Text, Pressable, ScrollView, Alert, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { ChevronRight, Tag, LogOut, Wallet, User, Calendar, PieChart, Upload, Download, Layers, UserPlus } from 'lucide-react-native';
import { useQuery } from '@tanstack/react-query';
import { db } from '@/lib/db';
import { signOut } from '@/lib/auth-api';

interface MenuItem {
  icon: React.ReactNode;
  label: string;
  description: string;
  onPress: () => void;
}

export default function TabTwoScreen() {
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
      const role = memberData.householdMembers[0]?.role || null;
      console.log('User role:', role);
      return role;
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

  const menuItems: MenuItem[] = [
    {
      icon: <Wallet size={24} color="#006A6A" />,
      label: 'Wallets',
      description: 'Manage your accounts and wallets',
      onPress: () => router.push('/accounts'),
    },
    // Only show invite button for admins (Phase 2)
    ...(userRole === 'admin'
      ? [
          {
            icon: <UserPlus size={24} color="#006A6A" />,
            label: 'Invite Partner',
            description: 'Share a code to invite your partner',
            onPress: () => router.push('/settings/invite'),
          },
        ]
      : []),
    {
      icon: <Calendar size={24} color="#006A6A" />,
      label: 'Payday & Budget Period',
      description: 'Set when you get paid each month',
      onPress: () => router.push('/settings/payday'),
    },
    {
      icon: <Tag size={24} color="#006A6A" />,
      label: 'Categories',
      description: 'Organize your income and expenses',
      onPress: () => router.push('/settings/categories'),
    },
    {
      icon: <Layers size={24} color="#006A6A" />,
      label: 'Category Groups',
      description: 'Create and manage budget category groups',
      onPress: () => router.push('/settings/category-groups'),
    },
    {
      icon: <Upload size={24} color="#006A6A" />,
      label: 'Import Data',
      description: 'Import transactions from CSV or Excel',
      onPress: () => router.push('/settings/import'),
    },
    {
      icon: <Download size={24} color="#006A6A" />,
      label: 'Export Data',
      description: 'Export your transactions to CSV or Excel',
      onPress: () => router.push('/settings/export'),
    },
    {
      icon: <User size={24} color="#006A6A" />,
      label: 'Profile',
      description: 'Edit your personal information',
      onPress: () => {
        Alert.alert('Coming Soon', 'Profile editing will be available soon.');
      },
    },
  ];

  return (
    <View className="flex-1 bg-white">
      <SafeAreaView edges={['bottom']} className="flex-1">
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 32 }}>
          {/* User Profile Section */}
          <View className="px-6 py-8 border-b border-gray-100">
            <View className="flex-row items-center gap-4">
              <View
                className="w-16 h-16 rounded-full items-center justify-center"
                style={{ backgroundColor: 'rgba(0, 106, 106, 0.1)' }}
              >
                <Text className="text-2xl font-bold" style={{ color: '#006A6A' }}>
                  {displayName.charAt(0).toUpperCase()}
                </Text>
              </View>
              <View className="flex-1">
                <Text className="text-xl font-semibold text-gray-900">{displayName}</Text>
                <Text className="text-sm text-gray-500 mt-1">{user?.email}</Text>
              </View>
            </View>
          </View>

          {/* Menu Items */}
          <View className="mt-8 px-6">
            {menuItems.map((item, index) => (
              <Pressable
                key={index}
                onPress={item.onPress}
                className="flex-row items-center justify-between py-4 border-b border-gray-100"
              >
                <View className="flex-row items-center gap-4 flex-1">
                  {item.icon}
                  <View className="flex-1">
                    <Text className="text-base font-semibold text-gray-900">{item.label}</Text>
                    <Text className="text-sm text-gray-500 mt-0.5">{item.description}</Text>
                  </View>
                </View>
                <ChevronRight size={20} color="#9CA3AF" />
              </Pressable>
            ))}
          </View>

          {/* Show message for members (Phase 2) */}
          {userRole === 'member' && (
            <View className="p-4 bg-gray-50 rounded-xl mx-6 my-4">
              <Text className="text-gray-600 text-sm text-center">
                💡 Only the household admin can invite new members
              </Text>
            </View>
          )}

          {/* Sign Out Button */}
          <View className="mt-12 px-6">
            <Pressable
              onPress={handleSignOut}
              disabled={isSigningOut}
              className="flex-row items-center justify-center gap-2 py-3 rounded-lg bg-red-50"
            >
              {isSigningOut ? (
                <ActivityIndicator size="small" color="#EF4444" />
              ) : (
                <>
                  <LogOut size={20} color="#EF4444" />
                  <Text className="text-base font-semibold text-red-600">Sign Out</Text>
                </>
              )}
            </Pressable>
          </View>
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}
