import React from 'react';
import { Text, View, Pressable, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { Wallet, Users, TrendingUp, Plus, LogOut } from 'lucide-react-native';
import { db } from '@/lib/db';

export default function DashboardScreen() {
  const { user } = db.useAuth();

  // Query user profile from database
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
    await db.auth.signOut();
    router.replace('/login');
  };

  return (
    <SafeAreaView className="flex-1 bg-slate-50" edges={['top']}>
      {/* Header */}
      <View className="px-6 pt-4 pb-6">
        <View className="flex-row justify-between items-center mb-2">
          <View>
            <Text className="text-sm text-slate-500">Welcome back,</Text>
            <Text className="text-2xl font-bold text-slate-900">{displayName}</Text>
          </View>
          <Pressable
            onPress={handleSignOut}
            className="bg-white rounded-full p-3 shadow-sm active:opacity-70"
          >
            <LogOut size={20} color="#64748b" />
          </Pressable>
        </View>
      </View>

      <ScrollView className="flex-1" showsVerticalScrollIndicator={false}>
        {/* Balance Card */}
        <View className="px-6 mb-6">
          <View className="overflow-hidden rounded-3xl shadow-lg">
            <LinearGradient
              colors={['#0ea5e9', '#06b6d4', '#14b8a6']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={{ padding: 24 }}
            >
              <View className="flex-row items-center mb-3">
                <Wallet size={24} color="white" />
                <Text className="text-white text-sm font-semibold ml-2">Total Balance</Text>
              </View>
              <Text className="text-white text-5xl font-bold mb-2">CHF 0.00</Text>
              <Text className="text-sky-100 text-sm">No expenses yet</Text>
            </LinearGradient>
          </View>
        </View>

        {/* Quick Actions */}
        <View className="px-6 mb-6">
          <Text className="text-lg font-bold text-slate-900 mb-3">Quick Actions</Text>
          <View className="flex-row gap-3">
            <Pressable className="flex-1 bg-white rounded-2xl p-5 shadow-sm active:opacity-70">
              <View className="w-12 h-12 bg-cyan-50 rounded-full items-center justify-center mb-3">
                <Plus size={24} color="#06b6d4" />
              </View>
              <Text className="text-base font-semibold text-slate-900 mb-1">Add Expense</Text>
              <Text className="text-xs text-slate-500">Record a new expense</Text>
            </Pressable>

            <Pressable className="flex-1 bg-white rounded-2xl p-5 shadow-sm active:opacity-70">
              <View className="w-12 h-12 bg-emerald-50 rounded-full items-center justify-center mb-3">
                <Users size={24} color="#10b981" />
              </View>
              <Text className="text-base font-semibold text-slate-900 mb-1">Invite</Text>
              <Text className="text-xs text-slate-500">Add household members</Text>
            </Pressable>
          </View>
        </View>

        {/* Empty State */}
        <View className="px-6 mb-6">
          <View className="bg-white rounded-2xl p-8 items-center shadow-sm">
            <View className="w-20 h-20 bg-slate-100 rounded-full items-center justify-center mb-4">
              <TrendingUp size={40} color="#94a3b8" />
            </View>
            <Text className="text-lg font-bold text-slate-900 mb-2">No expenses yet</Text>
            <Text className="text-sm text-slate-500 text-center mb-5">
              Start tracking your expenses by adding your first transaction
            </Text>
            <Pressable className="bg-cyan-500 rounded-xl px-6 py-3 active:bg-cyan-600">
              <Text className="text-white font-bold text-sm">Add Your First Expense</Text>
            </Pressable>
          </View>
        </View>

        {/* Success Message - Only show if profile exists */}
        {userProfile ? (
          <View className="px-6 mb-8">
            <View className="bg-emerald-50 border border-emerald-200 rounded-2xl p-4">
              <Text className="text-emerald-800 font-semibold text-base mb-1">Welcome, {userProfile.name}!</Text>
              <Text className="text-emerald-700 text-sm">Your default household has been set up.</Text>
            </View>
          </View>
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
}
