import React, { useEffect } from 'react';
import { View, Text, Pressable, Alert } from 'react-native';
import { useMutation } from '@tanstack/react-query';
import { ArrowLeft, RefreshCw } from 'lucide-react-native';
import { router } from 'expo-router';
import { createInviteCode } from '@/lib/invites-api';
import { db } from '@/lib/db';

export default function InviteScreen() {
  const [inviteCode, setInviteCode] = React.useState<string | null>(null);
  const [expiresAt, setExpiresAt] = React.useState<number | null>(null);
  const [timeRemaining, setTimeRemaining] = React.useState<number>(300);

  // Get current user from InstantDB auth
  const { isLoading: authLoading, user, error: authError } = db.useAuth();

  const createCodeMutation = useMutation({
    mutationFn: async () => {
      console.log('=== DEBUG: Starting invite code creation ===');
      console.log('Current user (from auth):', user);
      console.log('User email:', user?.email);

      if (!user?.email) {
        console.error('User email not found!');
        throw new Error('User not authenticated');
      }

      // First, get the user profile from the users table using email
      console.log('Looking up user profile by email:', user.email);
      const { data: userData } = await db.queryOnce({
        users: {
          $: { where: { email: user.email } }
        }
      });

      console.log('User profile found:', userData.users);
      const userProfile = userData.users?.[0];

      if (!userProfile) {
        console.error('No user profile found for email:', user.email);
        throw new Error('User profile not found');
      }

      console.log('User profile ID:', userProfile.id);

      // Now query householdMembers using the profile ID
      console.log('Querying household members with profile userId:', userProfile.id);
      const { data: memberData } = await db.queryOnce({
        householdMembers: {
          $: { where: { userId: userProfile.id, status: 'active' } }
        }
      });

      console.log('HouseholdMembers found:', memberData.householdMembers);
      const member = memberData.householdMembers[0];

      if (!member) {
        console.error('No household member found!');
        throw new Error('No household found');
      }

      console.log('Creating invite code for household:', member.householdId);
      return createInviteCode(userProfile.id, member.householdId);
    },
    onSuccess: ({ inviteCode: code, expiresAt: expires }) => {
      console.log('Invite code created successfully:', code);
      setInviteCode(code);
      setExpiresAt(expires);
    },
    onError: (error: Error) => {
      console.error('Error creating invite code:', error);
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

  if (authLoading) {
    return (
      <View className="flex-1 bg-white items-center justify-center">
        <Text className="text-gray-500">Loading...</Text>
      </View>
    );
  }

  if (authError || !user) {
    return (
      <View className="flex-1 bg-white items-center justify-center p-4">
        <Text className="text-red-600 text-center">Authentication error. Please try again.</Text>
      </View>
    );
  }

  return (
    <View className="flex-1 bg-white">
      <View className="flex-row items-center p-4 border-b border-gray-200">
        <Pressable onPress={() => router.back()}>
          <ArrowLeft size={24} color="#374151" />
        </Pressable>
        <Text className="text-lg font-semibold ml-3">Invite Partner</Text>
      </View>

      <View className="p-4">
        <Text className="text-2xl font-bold mb-2">Invite Your Partner</Text>
        <Text className="text-gray-600 mb-6">
          Generate a code and share it with your partner
        </Text>

        {!inviteCode ? (
          <Pressable
            onPress={() => createCodeMutation.mutate()}
            disabled={createCodeMutation.isPending}
            className="bg-teal-600 py-4 px-6 rounded-xl active:bg-teal-700"
          >
            <Text className="text-white text-center font-semibold text-lg">
              {createCodeMutation.isPending ? 'Generating...' : 'Generate Invite Code'}
            </Text>
          </Pressable>
        ) : (
          <View>
            {/* Large code display */}
            <View className="bg-teal-50 border-2 border-teal-600 rounded-2xl p-8 mb-4">
              <Text className="text-center text-sm text-teal-700 mb-2">
                Invite Code
              </Text>
              <Text className="text-center text-5xl font-bold text-teal-900 tracking-widest">
                {inviteCode}
              </Text>
            </View>

            {/* Timer */}
            <View className="bg-amber-50 p-4 rounded-xl mb-4">
              <Text className="text-center text-amber-900 font-semibold">
                ⏱️ Expires in {Math.floor(timeRemaining / 60)}:{String(timeRemaining % 60).padStart(2, '0')}
              </Text>
              <View className="mt-2 h-2 bg-amber-200 rounded-full overflow-hidden">
                <View
                  className="h-full bg-amber-600 rounded-full"
                  style={{ width: `${(timeRemaining / 300) * 100}%` }}
                />
              </View>
            </View>

            {/* Generate new button */}
            <Pressable
              onPress={handleGenerateNew}
              className="flex-row items-center justify-center gap-2 bg-gray-100 py-4 rounded-xl active:bg-gray-200"
            >
              <RefreshCw size={20} color="#374151" />
              <Text className="font-semibold text-gray-700">Generate New Code</Text>
            </Pressable>

            {/* Instructions */}
            <View className="mt-6 bg-blue-50 p-4 rounded-xl">
              <Text className="text-blue-900 font-semibold mb-2">
                💡 How to use
              </Text>
              <Text className="text-blue-700 text-sm mb-1">
                1. Tell your partner this code (call, text, or in person)
              </Text>
              <Text className="text-blue-700 text-sm mb-1">
                2. They open the app and tap "Have an invite code?"
              </Text>
              <Text className="text-blue-700 text-sm">
                3. They enter the code within 5 minutes
              </Text>
            </View>
          </View>
        )}
      </View>
    </View>
  );
}
