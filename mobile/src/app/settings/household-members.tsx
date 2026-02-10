import React, { useState } from 'react';
import { View, Text, Pressable, ScrollView, Modal, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { router } from 'expo-router';
import { ArrowLeft, Crown, UserMinus, AlertTriangle, X, AlertCircle } from 'lucide-react-native';
import { db } from '@/lib/db';
import {
  getHouseholdMembers,
  checkCanRemoveMember,
  removeMemberFromHousehold,
  getCurrentUserHouseholdInfo,
  type HouseholdMemberWithUser,
  type RemovalCheckResult
} from '@/lib/household-members-api';

export default function HouseholdMembersScreen() {
  const queryClient = useQueryClient();
  const { user } = db.useAuth();

  // State for removal modal
  const [selectedMember, setSelectedMember] = useState<HouseholdMemberWithUser | null>(null);
  const [removalCheck, setRemovalCheck] = useState<RemovalCheckResult | null>(null);
  const [showRemovalModal, setShowRemovalModal] = useState(false);
  const [isCheckingRemoval, setIsCheckingRemoval] = useState(false);

  // Get current user's household info
  const { data: userInfo, isLoading: isLoadingUserInfo } = useQuery({
    queryKey: ['user-household-info', user?.email],
    queryFn: () => getCurrentUserHouseholdInfo(user?.email || ''),
    enabled: !!user?.email
  });

  // Get household members
  const { data: members, isLoading: isLoadingMembers, refetch: refetchMembers } = useQuery({
    queryKey: ['household-members', userInfo?.householdId, userInfo?.userId],
    queryFn: () => getHouseholdMembers(userInfo!.householdId, userInfo!.userId),
    enabled: !!userInfo?.householdId && !!userInfo?.userId
  });

  // Remove member mutation
  const removeMemberMutation = useMutation({
    mutationFn: async (member: HouseholdMemberWithUser) => {
      return removeMemberFromHousehold(
        userInfo!.userId,
        member.memberId,
        member.userId,
        userInfo!.householdId
      );
    },
    onSuccess: (result) => {
      if (result.success) {
        setShowRemovalModal(false);
        setSelectedMember(null);
        setRemovalCheck(null);
        // Refresh members list
        queryClient.invalidateQueries({ queryKey: ['household-members'] });
        queryClient.invalidateQueries({ queryKey: ['show-split-settings'] });
        refetchMembers();
      }
    }
  });

  const handleRemovePress = async (member: HouseholdMemberWithUser) => {
    if (!userInfo) return;

    setSelectedMember(member);
    setIsCheckingRemoval(true);
    setShowRemovalModal(true);

    // Check if member can be removed
    const check = await checkCanRemoveMember(
      userInfo.userId,
      member.userId,
      userInfo.householdId
    );

    setRemovalCheck(check);
    setIsCheckingRemoval(false);
  };

  const handleConfirmRemoval = () => {
    if (!selectedMember || !removalCheck?.canRemove) return;
    removeMemberMutation.mutate(selectedMember);
  };

  const closeModal = () => {
    setShowRemovalModal(false);
    setSelectedMember(null);
    setRemovalCheck(null);
  };

  const isLoading = isLoadingUserInfo || isLoadingMembers;

  if (isLoading) {
    return (
      <View className="flex-1 bg-white items-center justify-center">
        <ActivityIndicator size="large" color="#006A6A" />
        <Text className="text-gray-500 mt-4">Loading members...</Text>
      </View>
    );
  }

  return (
    <View className="flex-1 bg-gray-50">
      <SafeAreaView edges={['top']} className="flex-1">
        {/* Header */}
        <View className="bg-white flex-row items-center px-4 py-4 border-b border-gray-200">
          <Pressable onPress={() => router.back()} className="p-2 -ml-2">
            <ArrowLeft size={24} color="#374151" />
          </Pressable>
          <Text className="text-lg font-semibold ml-2 text-gray-900">Household Members</Text>
        </View>

        <ScrollView className="flex-1" contentContainerStyle={{ paddingBottom: 32 }}>
          {/* Members List */}
          <View className="mt-4 mx-4">
          {members?.map((member) => (
            <View
              key={member.id}
              className="bg-white rounded-xl p-4 mb-3 border border-gray-100"
            >
              <View className="flex-row items-start justify-between">
                <View className="flex-1">
                  {/* Name and Role */}
                  <View className="flex-row items-center gap-2">
                    <Text className="text-base font-semibold text-gray-900">
                      {member.name}
                      {member.isCurrentUser && (
                        <Text className="text-gray-500 font-normal"> (You)</Text>
                      )}
                    </Text>
                    {member.role === 'admin' && (
                      <View className="flex-row items-center bg-amber-100 px-2 py-0.5 rounded-full">
                        <Crown size={12} color="#D97706" />
                        <Text className="text-xs text-amber-700 ml-1 font-medium">Admin</Text>
                      </View>
                    )}
                  </View>

                  {/* Email */}
                  <Text className="text-sm text-gray-500 mt-1">{member.email}</Text>
                </View>

                {/* Remove Button - Only visible to admin for non-self members */}
                {userInfo?.isAdmin && !member.isCurrentUser && (
                  <Pressable
                    onPress={() => handleRemovePress(member)}
                    className="bg-red-50 px-3 py-2 rounded-lg flex-row items-center active:bg-red-100"
                  >
                    <UserMinus size={16} color="#DC2626" />
                    <Text className="text-red-600 text-sm font-medium ml-1.5">Remove</Text>
                  </Pressable>
                )}
              </View>
            </View>
          ))}

          {/* Empty State */}
          {(!members || members.length === 0) && (
            <View className="bg-white rounded-xl p-8 items-center">
              <Text className="text-gray-500 text-center">No members found</Text>
            </View>
          )}
        </View>

        {/* Info Card */}
        <View className="mx-4 mt-4 bg-blue-50 rounded-xl p-4">
          <View className="flex-row items-start gap-3">
            <AlertCircle size={20} color="#2563EB" />
            <View className="flex-1">
              <Text className="text-blue-900 font-medium">About Household Members</Text>
              <Text className="text-blue-700 text-sm mt-1">
                The household admin can remove members. Before removing a member, all shared debts must be settled.
              </Text>
            </View>
          </View>
        </View>
      </ScrollView>
      </SafeAreaView>

      {/* Removal Confirmation Modal */}
      <Modal
        visible={showRemovalModal}
        transparent
        animationType="fade"
        onRequestClose={closeModal}
      >
        <View className="flex-1 bg-black/50 items-center justify-center px-6">
          <View className="bg-white rounded-2xl w-full max-w-sm overflow-hidden">
            {/* Modal Header */}
            <View className="flex-row items-center justify-between px-4 py-4 border-b border-gray-100">
              <Text className="text-lg font-semibold text-gray-900">
                {isCheckingRemoval
                  ? 'Checking...'
                  : removalCheck?.canRemove
                  ? 'Remove Member'
                  : 'Cannot Remove Member'}
              </Text>
              <Pressable onPress={closeModal} className="p-1">
                <X size={24} color="#6B7280" />
              </Pressable>
            </View>

            {/* Modal Content */}
            <View className="px-4 py-5">
              {isCheckingRemoval ? (
                <View className="items-center py-4">
                  <ActivityIndicator size="large" color="#006A6A" />
                  <Text className="text-gray-500 mt-3">Checking debt status...</Text>
                </View>
              ) : removalCheck?.canRemove ? (
                // Can Remove - Confirmation
                <View>
                  <Text className="text-base text-gray-700 mb-4">
                    Remove <Text className="font-semibold">{selectedMember?.name}</Text> from the household?
                  </Text>

                  <View className="bg-amber-50 rounded-xl p-4 mb-4">
                    <View className="flex-row items-start gap-2">
                      <AlertTriangle size={20} color="#D97706" />
                      <View className="flex-1">
                        <Text className="text-amber-800 font-medium">This action cannot be undone</Text>
                      </View>
                    </View>
                  </View>

                  <View className="space-y-2">
                    <Text className="text-gray-600 text-sm">
                      {selectedMember?.name} will:
                    </Text>
                    <Text className="text-gray-600 text-sm">• Lose access to shared expenses</Text>
                    <Text className="text-gray-600 text-sm">• Keep their personal data</Text>
                  </View>

                  {/* Debt Status - Cleared */}
                  <View className="mt-4 bg-green-50 rounded-xl p-3 flex-row items-center gap-2">
                    <Text className="text-green-700">✓</Text>
                    <Text className="text-green-700 font-medium">
                      No outstanding debt (0 CHF)
                    </Text>
                  </View>
                </View>
              ) : (
                // Cannot Remove - Show Reason
                <View>
                  {removalCheck?.debtAmount && removalCheck.debtAmount > 0 ? (
                    // Debt Exists
                    <View>
                      <View className="bg-red-50 rounded-xl p-4 mb-4">
                        <View className="flex-row items-start gap-2">
                          <AlertTriangle size={20} color="#DC2626" />
                          <View className="flex-1">
                            <Text className="text-red-800 font-medium">
                              {selectedMember?.name} has unsettled debt
                            </Text>
                          </View>
                        </View>
                      </View>

                      <View className="bg-gray-100 rounded-xl p-4 items-center mb-4">
                        <Text className="text-gray-500 text-sm">Current debt</Text>
                        <Text className="text-2xl font-bold text-gray-900 mt-1">
                          {removalCheck.debtAmount.toFixed(2)} CHF
                        </Text>
                        <Text className="text-gray-500 text-sm mt-1">
                          {removalCheck.debtDirection === 'owes'
                            ? `${selectedMember?.name} owes you`
                            : `You owe ${selectedMember?.name}`}
                        </Text>
                      </View>

                      <Text className="text-gray-600 text-sm text-center">
                        Please settle all debts before removing this member.
                      </Text>
                    </View>
                  ) : (
                    // Other reason
                    <View className="bg-red-50 rounded-xl p-4">
                      <View className="flex-row items-start gap-2">
                        <AlertTriangle size={20} color="#DC2626" />
                        <Text className="text-red-800 flex-1">{removalCheck?.reason}</Text>
                      </View>
                    </View>
                  )}
                </View>
              )}
            </View>

            {/* Modal Actions */}
            <View className="px-4 pb-4 flex-row gap-3">
              {isCheckingRemoval ? (
                <Pressable
                  onPress={closeModal}
                  className="flex-1 py-3 rounded-xl bg-gray-100"
                >
                  <Text className="text-center font-semibold text-gray-700">Cancel</Text>
                </Pressable>
              ) : removalCheck?.canRemove ? (
                <>
                  <Pressable
                    onPress={closeModal}
                    className="flex-1 py-3 rounded-xl bg-gray-100"
                  >
                    <Text className="text-center font-semibold text-gray-700">Cancel</Text>
                  </Pressable>
                  <Pressable
                    onPress={handleConfirmRemoval}
                    disabled={removeMemberMutation.isPending}
                    className="flex-1 py-3 rounded-xl bg-red-600 active:bg-red-700"
                  >
                    {removeMemberMutation.isPending ? (
                      <ActivityIndicator size="small" color="#FFFFFF" />
                    ) : (
                      <Text className="text-center font-semibold text-white">Remove Member</Text>
                    )}
                  </Pressable>
                </>
              ) : removalCheck?.debtAmount && removalCheck.debtAmount > 0 ? (
                <>
                  <Pressable
                    onPress={closeModal}
                    className="flex-1 py-3 rounded-xl bg-gray-100"
                  >
                    <Text className="text-center font-semibold text-gray-700">Cancel</Text>
                  </Pressable>
                  <Pressable
                    onPress={() => {
                      closeModal();
                      // Navigate to settlement screen
                      router.push('/settlement');
                    }}
                    className="flex-1 py-3 rounded-xl bg-teal-600 active:bg-teal-700"
                  >
                    <Text className="text-center font-semibold text-white">Go to Settlement</Text>
                  </Pressable>
                </>
              ) : (
                <Pressable
                  onPress={closeModal}
                  className="flex-1 py-3 rounded-xl bg-gray-100"
                >
                  <Text className="text-center font-semibold text-gray-700">Close</Text>
                </Pressable>
              )}
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}
