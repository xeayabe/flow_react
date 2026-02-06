import React, { useState } from 'react';
import { View, Text, Pressable, ScrollView, Alert, ActivityIndicator, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { ChevronRight, Tag, LogOut, Wallet, User, Calendar, PieChart, Upload, Download, Layers, UserPlus, Users, FileText } from 'lucide-react-native';
import { useQuery } from '@tanstack/react-query';
import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';
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
  const [isDownloading, setIsDownloading] = useState(false);

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
  const { data: showSplitSettings } = useQuery({
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

  const handleDownloadReadme = async () => {
    try {
      setIsDownloading(true);

      if (Platform.OS === 'web') {
        // Web download
        const response = await fetch('/README.md');
        const content = await response.text();
        const blob = new Blob([content], { type: 'text/markdown' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = 'Flow_README.md';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
        Alert.alert('Success', 'README file downloaded successfully!');
      } else {
        // Native - copy the pre-created README_DOWNLOAD.md
        const sourcePath = FileSystem.documentDirectory + '../README_DOWNLOAD.md';
        const destPath = FileSystem.documentDirectory + 'Flow_README.md';

        try {
          // Try to copy from the workspace
          const info = await FileSystem.getInfoAsync(sourcePath);
          if (info.exists) {
            await FileSystem.copyAsync({
              from: sourcePath,
              to: destPath,
            });
          } else {
            // If file doesn't exist in expected location, show helpful message
            Alert.alert(
              'README Available',
              'The README file is available at:\n/home/user/workspace/README.md\n\nYou can access it from the Vibecode interface.',
              [{ text: 'OK' }]
            );
            setIsDownloading(false);
            return;
          }
        } catch (err) {
          // Fallback: show where to find it
          Alert.alert(
            'README Available',
            'The README file is available at:\n/home/user/workspace/README_DOWNLOAD.md\n\nYou can download it from the Vibecode interface.',
            [{ text: 'OK' }]
          );
          setIsDownloading(false);
          return;
        }

        // Share the file
        const canShare = await Sharing.isAvailableAsync();
        if (canShare) {
          await Sharing.shareAsync(destPath, {
            mimeType: 'text/markdown',
            dialogTitle: 'Download Flow README',
            UTI: 'public.plain-text',
          });
          Alert.alert('Success', 'README file ready to download!');
        } else {
          Alert.alert('Success', `README saved to: ${destPath}`);
        }
      }
    } catch (error) {
      console.error('Download error:', error);
      Alert.alert(
        'README Available',
        'The README file is available at:\n/home/user/workspace/README_DOWNLOAD.md\n\nYou can download it from the Vibecode interface.',
        [{ text: 'OK' }]
      );
    } finally {
      setIsDownloading(false);
    }
  };

  const menuItems: MenuItem[] = [
    {
      icon: <Wallet size={24} color="#006A6A" />,
      label: 'Wallets',
      description: 'Manage your accounts and wallets',
      onPress: () => router.push('/wallets'),
    },
    // Household & Members Section
    {
      icon: <UserPlus size={24} color="#006A6A" />,
      label: 'Invite Partner',
      description: 'Share a code to invite someone to your household',
      onPress: () => router.push('/settings/invite'),
    },
    // Show household members if 2+ members
    ...(showSplitSettings
      ? [
          {
            icon: <Users size={24} color="#006A6A" />,
            label: 'Household Members',
            description: 'View and manage household members',
            onPress: () => router.push('/settings/household-members'),
          },
        ]
      : []),
    {
      icon: <Calendar size={24} color="#006A6A" />,
      label: 'Payday & Budget Period',
      description: 'Set when you get paid each month',
      onPress: () => router.push('/settings/payday'),
    },
    // Only show split settings if household has 2+ members
    ...(showSplitSettings
      ? [
          {
            icon: <PieChart size={24} color="#006A6A" />,
            label: 'Expense Splitting',
            description: 'Manage how shared expenses are divided',
            onPress: () => router.push('/settings/split-settings'),
          },
        ]
      : []),
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
      icon: <FileText size={24} color="#F59E0B" />,
      label: 'Download README',
      description: 'Download complete documentation',
      onPress: handleDownloadReadme,
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
                disabled={isDownloading && item.label === 'Download README'}
                className="flex-row items-center justify-between py-4 border-b border-gray-100"
              >
                <View className="flex-row items-center gap-4 flex-1">
                  {item.icon}
                  <View className="flex-1">
                    <Text className="text-base font-semibold text-gray-900">{item.label}</Text>
                    <Text className="text-sm text-gray-500 mt-0.5">{item.description}</Text>
                  </View>
                </View>
                {isDownloading && item.label === 'Download README' ? (
                  <ActivityIndicator size="small" color="#F59E0B" />
                ) : (
                  <ChevronRight size={20} color="#9CA3AF" />
                )}
              </Pressable>
            ))}
          </View>

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
