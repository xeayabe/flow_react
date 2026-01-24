import React from 'react';
import { View, Text, Pressable, Share, Alert } from 'react-native';
import { useMutation } from '@tanstack/react-query';
import { Copy, Share2, ArrowLeft } from 'lucide-react-native';
import * as Clipboard from 'expo-clipboard';
import { router } from 'expo-router';
import { createInvite } from '@/lib/invites-api';
import { db } from '@/lib/db';

export default function InviteScreen() {
  const [generatedLink, setGeneratedLink] = React.useState<string | null>(null);

  // Get current user from InstantDB auth
  const { isLoading: authLoading, user, error: authError } = db.useAuth();

  const createInviteMutation = useMutation({
    mutationFn: async () => {
      console.log('=== DEBUG: Starting invite creation ===');
      console.log('Current user:', user);
      console.log('User ID:', user?.id);
      console.log('User email:', user?.email);

      if (!user?.id) {
        console.error('User not authenticated!');
        throw new Error('User not authenticated');
      }

      // First, query ALL householdMembers to see what's in the table
      console.log('Querying ALL household members...');
      const { data: allMembers } = await db.queryOnce({
        householdMembers: {}
      });
      console.log('ALL household members:', allMembers.householdMembers);
      console.log('Total members in database:', allMembers.householdMembers?.length || 0);

      // Now query for this specific user's household
      console.log('Querying for user household with userId:', user.id);
      const { data: memberData } = await db.queryOnce({
        householdMembers: {
          $: { where: { userId: user.id, status: 'active' } }
        }
      });

      console.log('Query result:', memberData);
      console.log('HouseholdMembers found:', memberData.householdMembers);
      console.log('Number of members:', memberData.householdMembers?.length || 0);

      const member = memberData.householdMembers[0];

      console.log('First member:', member);
      console.log('Household ID:', member?.householdId);

      if (!member) {
        console.error('No member found!');
        console.error('User may not have a household record. Check if householdMembers was created during signup.');
        throw new Error('No household found');
      }

      console.log('Creating invite for household:', member.householdId);
      return createInvite(user.id, member.householdId);
    },
    onSuccess: ({ inviteLink }) => {
      console.log('Invite created successfully:', inviteLink);
      setGeneratedLink(inviteLink);
    },
    onError: (error: Error) => {
      console.error('Error creating invite:', error);
      Alert.alert('Error', error.message || 'Could not generate invite link');
    }
  });

  const handleCopyLink = async () => {
    if (!generatedLink) return;
    await Clipboard.setStringAsync(generatedLink);
    Alert.alert('Copied!', 'Invite link copied to clipboard');
  };

  const handleShareLink = async () => {
    if (!generatedLink) return;
    try {
      await Share.share({
        message: `Join my household on Flow! ${generatedLink}`,
        title: 'Invite to Flow'
      });
    } catch (error) {
      console.error('Share error:', error);
    }
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
          Share this link with your partner to join your household
        </Text>

        {!generatedLink ? (
          <Pressable
            onPress={() => createInviteMutation.mutate()}
            disabled={createInviteMutation.isPending}
            className="bg-teal-600 py-4 px-6 rounded-xl active:bg-teal-700"
          >
            <Text className="text-white text-center font-semibold text-lg">
              {createInviteMutation.isPending ? 'Generating...' : 'Generate Invite Link'}
            </Text>
          </Pressable>
        ) : (
          <View>
            <View className="bg-gray-50 p-4 rounded-xl mb-4">
              <Text className="text-sm text-gray-600 mb-2">Invite Link:</Text>
              <Text className="text-sm font-mono" numberOfLines={3}>
                {generatedLink}
              </Text>
            </View>

            <View className="flex-row gap-3">
              <Pressable
                onPress={handleCopyLink}
                className="flex-1 flex-row items-center justify-center gap-2 bg-gray-100 py-4 rounded-xl active:bg-gray-200"
              >
                <Copy size={20} color="#374151" />
                <Text className="font-semibold text-gray-700">Copy</Text>
              </Pressable>

              <Pressable
                onPress={handleShareLink}
                className="flex-1 flex-row items-center justify-center gap-2 bg-teal-600 py-4 rounded-xl active:bg-teal-700"
              >
                <Share2 size={20} color="white" />
                <Text className="font-semibold text-white">Share</Text>
              </Pressable>
            </View>

            <Text className="text-xs text-gray-500 text-center mt-4">
              Link expires in 7 days
            </Text>

            <View className="mt-6 bg-blue-50 p-4 rounded-xl">
              <Text className="text-blue-900 font-semibold mb-1">💡 How it works</Text>
              <Text className="text-blue-700 text-sm">
                Send this link to your partner via WhatsApp or SMS. They'll sign up and automatically join your household!
              </Text>
            </View>
          </View>
        )}
      </View>
    </View>
  );
}
