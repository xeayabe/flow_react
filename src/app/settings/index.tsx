import React, { useState } from 'react';
import { View, Text, Pressable, ScrollView, Alert, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Stack, router } from 'expo-router';
import { ChevronRight, Tag, LogOut, Wallet, User } from 'lucide-react-native';
import { db } from '@/lib/db';
import { signOut } from '@/lib/auth-api';
import { useQuery } from '@tanstack/react-query';

interface MenuItem {
  icon: React.ReactNode;
  label: string;
  description: string;
  onPress: () => void;
  color?: string;
}

export default function SettingsScreen() {
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
    {
      icon: <Tag size={24} color="#006A6A" />,
      label: 'Categories',
      description: 'Organize your income and expenses',
      onPress: () => router.push('/settings/categories'),
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
      <Stack.Screen
        options={{
          title: 'Settings',
        }}
      />

      <SafeAreaView edges={['bottom']} className="flex-1">
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 32 }}>
          {/* User Profile Section */}
          <View className="px-6 py-8 border-b border-gray-100">
            <View className="flex-row items-center gap-4 mb-6">
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
