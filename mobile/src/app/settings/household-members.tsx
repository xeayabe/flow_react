import React, { useState } from 'react';
import { View, Text, Pressable, ScrollView, Modal, ActivityIndicator } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { router } from 'expo-router';
import { ArrowLeft, Crown, UserMinus, AlertTriangle, X, AlertCircle, Users } from 'lucide-react-native';
import Animated, { FadeIn, FadeInDown, useSharedValue } from 'react-native-reanimated';
import { db } from '@/lib/db';
import { colors, spacing, borderRadius } from '@/lib/design-tokens';
import { formatCurrency } from '@/lib/formatCurrency';
import StickyStatusBar from '@/components/layout/StickyStatusBar';
import {
  getHouseholdMembers,
  checkCanRemoveMember,
  removeMemberFromHousehold,
  getCurrentUserHouseholdInfo,
  type HouseholdMemberWithUser,
  type RemovalCheckResult
} from '@/lib/household-members-api';

export default function HouseholdMembersScreen() {
  const insets = useSafeAreaInsets();
  const scrollY = useSharedValue(0);
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

  // Loading state
  if (isLoading) {
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
            Loading members...
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
        <Text className="text-white text-xl font-semibold">Household Members</Text>
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
            Manage who has access to shared expenses
          </Text>
        </Animated.View>

        {/* Members List */}
        {members && members.length > 0 ? (
          <View className="gap-3">
            {members.map((member, index) => (
              <Animated.View
                key={member.id}
                entering={FadeInDown.delay(200 + index * 100).duration(400)}
              >
                <View
                  style={{
                    backgroundColor: colors.glassWhite,
                    borderWidth: 1,
                    borderColor: colors.glassBorder,
                    borderRadius: borderRadius.lg,
                    padding: 16,
                  }}
                >
                  <View className="flex-row items-start justify-between">
                    <View className="flex-1">
                      {/* Name */}
                      <Text
                        style={{ color: colors.textWhite }}
                        className="text-base font-semibold mb-1"
                      >
                        {member.name}
                        {member.isCurrentUser && (
                          <Text style={{ color: colors.textWhiteSecondary }} className="font-normal">
                            {' '}(You)
                          </Text>
                        )}
                      </Text>

                      {/* Email */}
                      <Text
                        style={{ color: colors.textWhiteSecondary }}
                        className="text-sm"
                      >
                        {member.email}
                      </Text>
                    </View>

                    {/* Right side - Admin Badge and Remove Button */}
                    <View style={{ gap: 8, alignItems: 'flex-end' }}>
                      {/* Admin Badge */}
                      {member.role === 'admin' && (
                        <View
                          style={{
                            backgroundColor: 'rgba(227, 160, 93, 0.15)',
                            borderWidth: 1,
                            borderColor: 'rgba(227, 160, 93, 0.3)',
                            paddingHorizontal: 8,
                            paddingVertical: 2,
                            borderRadius: 12,
                            flexDirection: 'row',
                            alignItems: 'center',
                            gap: 4,
                          }}
                        >
                          <Crown size={10} color="#E3A05D" />
                          <Text style={{ color: '#E3A05D', fontSize: 10, fontWeight: '600' }}>
                            ADMIN
                          </Text>
                        </View>
                      )}

                      {/* Remove Button - Only visible to admin for non-self members */}
                      {userInfo?.isAdmin && !member.isCurrentUser && (
                        <Pressable
                          onPress={() => handleRemovePress(member)}
                          style={{
                            backgroundColor: 'rgba(227, 160, 93, 0.1)',
                            borderWidth: 1,
                            borderColor: 'rgba(227, 160, 93, 0.3)',
                            paddingHorizontal: 12,
                            paddingVertical: 8,
                            borderRadius: borderRadius.sm,
                            flexDirection: 'row',
                            alignItems: 'center',
                            gap: 6,
                          }}
                        >
                          <UserMinus size={14} color="#E3A05D" />
                          <Text style={{ color: '#E3A05D', fontSize: 13, fontWeight: '500' }}>
                            Remove
                          </Text>
                        </Pressable>
                      )}
                    </View>
                  </View>
                </View>
              </Animated.View>
            ))}
          </View>
        ) : (
          /* Empty State */
          <Animated.View entering={FadeInDown.delay(200).duration(400)}>
            <View
              style={{
                backgroundColor: colors.glassWhite,
                borderWidth: 1,
                borderColor: colors.glassBorder,
                borderRadius: borderRadius.lg,
                padding: 40,
                alignItems: 'center',
              }}
            >
              <Text className="text-5xl mb-4">👥</Text>
              <Text
                style={{ color: colors.textWhiteSecondary }}
                className="text-sm text-center"
              >
                No members found
              </Text>
            </View>
          </Animated.View>
        )}

        {/* Info Card */}
        <Animated.View
          entering={FadeInDown.delay(300 + (members?.length || 0) * 100).duration(400)}
          style={{ marginTop: 16 }}
        >
          <View
            style={{
              backgroundColor: 'rgba(168, 181, 161, 0.1)',
              borderWidth: 1,
              borderColor: 'rgba(168, 181, 161, 0.2)',
              borderRadius: borderRadius.lg,
              padding: 16,
            }}
          >
            <View className="flex-row items-start gap-3">
              <AlertCircle size={18} color={colors.sageGreen} />
              <View className="flex-1">
                <Text
                  style={{ color: colors.sageGreen }}
                  className="font-semibold mb-1"
                >
                  About Household Members
                </Text>
                <Text
                  style={{ color: colors.textWhiteSecondary }}
                  className="text-sm leading-5"
                >
                  The household admin can remove members. Before removing a member, all shared debts must be settled.
                </Text>
              </View>
            </View>
          </View>
        </Animated.View>
      </ScrollView>

      {/* Removal Confirmation Modal */}
      <Modal
        visible={showRemovalModal}
        transparent
        animationType="fade"
        onRequestClose={closeModal}
      >
        <View
          style={{
            flex: 1,
            backgroundColor: 'rgba(0, 0, 0, 0.7)',
            alignItems: 'center',
            justifyContent: 'center',
            paddingHorizontal: 24,
          }}
        >
          <Animated.View
            entering={FadeIn.duration(200)}
            style={{
              backgroundColor: colors.contextDark,
              borderRadius: borderRadius.xl,
              width: '100%',
              maxWidth: 400,
              borderWidth: 1,
              borderColor: colors.glassBorder,
            }}
          >
            {/* Modal Header */}
            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'space-between',
                paddingHorizontal: 20,
                paddingVertical: 16,
                borderBottomWidth: 1,
                borderBottomColor: colors.glassBorder,
              }}
            >
              <Text
                style={{ color: colors.textWhite }}
                className="text-lg font-semibold"
              >
                {isCheckingRemoval
                  ? 'Checking...'
                  : removalCheck?.canRemove
                  ? 'Remove Member'
                  : 'Cannot Remove Member'}
              </Text>
              <Pressable
                onPress={closeModal}
                style={{
                  width: 32,
                  height: 32,
                  borderRadius: 16,
                  backgroundColor: colors.glassWhite,
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <X size={18} color={colors.textWhite} />
              </Pressable>
            </View>

            {/* Modal Content */}
            <View style={{ paddingHorizontal: 20, paddingVertical: 20 }}>
              {isCheckingRemoval ? (
                <View className="items-center py-6">
                  <ActivityIndicator size="large" color={colors.contextTeal} />
                  <Text
                    style={{ color: colors.textWhiteSecondary, marginTop: 12 }}
                  >
                    Checking debt status...
                  </Text>
                </View>
              ) : removalCheck?.canRemove ? (
                // Can Remove - Confirmation
                <View>
                  <Text
                    style={{ color: colors.textWhiteSecondary }}
                    className="text-base mb-4"
                  >
                    Remove <Text style={{ color: colors.textWhite, fontWeight: '600' }}>{selectedMember?.name}</Text> from the household?
                  </Text>

                  <View
                    style={{
                      backgroundColor: 'rgba(227, 160, 93, 0.1)',
                      borderWidth: 1,
                      borderColor: 'rgba(227, 160, 93, 0.3)',
                      borderRadius: borderRadius.md,
                      padding: 12,
                      marginBottom: 16,
                    }}
                  >
                    <View className="flex-row items-start gap-2">
                      <AlertTriangle size={18} color="#E3A05D" />
                      <Text style={{ color: '#E3A05D', fontSize: 14, fontWeight: '500' }}>
                        This action cannot be undone
                      </Text>
                    </View>
                  </View>

                  <View className="gap-2 mb-4">
                    <Text style={{ color: colors.textWhiteSecondary, fontSize: 14 }}>
                      {selectedMember?.name} will:
                    </Text>
                    <Text style={{ color: colors.textWhiteSecondary, fontSize: 14 }}>
                      • Lose access to shared expenses
                    </Text>
                    <Text style={{ color: colors.textWhiteSecondary, fontSize: 14 }}>
                      • Keep their personal data
                    </Text>
                  </View>

                  {/* Debt Status - Cleared */}
                  <View
                    style={{
                      backgroundColor: 'rgba(168, 181, 161, 0.15)',
                      borderWidth: 1,
                      borderColor: 'rgba(168, 181, 161, 0.3)',
                      borderRadius: borderRadius.sm,
                      padding: 12,
                      flexDirection: 'row',
                      alignItems: 'center',
                      gap: 8,
                    }}
                  >
                    <Text style={{ color: colors.sageGreen, fontSize: 16 }}>✓</Text>
                    <Text style={{ color: colors.sageGreen, fontWeight: '500' }}>
                      No outstanding debt (CHF 0.00)
                    </Text>
                  </View>
                </View>
              ) : (
                // Cannot Remove - Show Reason
                <View>
                  {removalCheck?.debtAmount && removalCheck.debtAmount > 0 ? (
                    // Debt Exists
                    <View>
                      <View
                        style={{
                          backgroundColor: 'rgba(227, 160, 93, 0.15)',
                          borderWidth: 1,
                          borderColor: 'rgba(227, 160, 93, 0.3)',
                          borderRadius: borderRadius.md,
                          padding: 16,
                          marginBottom: 16,
                        }}
                      >
                        <View className="flex-row items-start gap-2">
                          <AlertTriangle size={18} color="#E3A05D" />
                          <Text style={{ color: '#E3A05D', fontWeight: '500', flex: 1 }}>
                            {selectedMember?.name} has unsettled debt
                          </Text>
                        </View>
                      </View>

                      <View
                        style={{
                          backgroundColor: colors.glassWhite,
                          borderWidth: 1,
                          borderColor: colors.glassBorder,
                          borderRadius: borderRadius.md,
                          padding: 20,
                          alignItems: 'center',
                          marginBottom: 16,
                        }}
                      >
                        <Text
                          style={{ color: colors.textWhiteSecondary, fontSize: 12 }}
                        >
                          Current debt
                        </Text>
                        <Text
                          style={{ color: colors.textWhite }}
                          className="text-2xl font-bold mt-1"
                        >
                          {formatCurrency(removalCheck.debtAmount)}
                        </Text>
                        <Text
                          style={{ color: colors.textWhiteSecondary, fontSize: 13, marginTop: 4 }}
                        >
                          {removalCheck.debtDirection === 'owes'
                            ? `${selectedMember?.name} owes you`
                            : `You owe ${selectedMember?.name}`}
                        </Text>
                      </View>

                      <Text
                        style={{ color: colors.textWhiteSecondary }}
                        className="text-sm text-center"
                      >
                        Please settle all debts before removing this member.
                      </Text>
                    </View>
                  ) : (
                    // Other reason
                    <View
                      style={{
                        backgroundColor: 'rgba(227, 160, 93, 0.15)',
                        borderWidth: 1,
                        borderColor: 'rgba(227, 160, 93, 0.3)',
                        borderRadius: borderRadius.md,
                        padding: 16,
                      }}
                    >
                      <View className="flex-row items-start gap-2">
                        <AlertTriangle size={18} color="#E3A05D" />
                        <Text style={{ color: '#E3A05D', flex: 1 }}>
                          {removalCheck?.reason}
                        </Text>
                      </View>
                    </View>
                  )}
                </View>
              )}
            </View>

            {/* Modal Actions */}
            <View
              style={{
                paddingHorizontal: 20,
                paddingBottom: 20,
                flexDirection: 'row',
                gap: 12,
              }}
            >
              {isCheckingRemoval ? (
                <Pressable
                  onPress={closeModal}
                  style={{
                    flex: 1,
                    paddingVertical: 14,
                    borderRadius: borderRadius.md,
                    backgroundColor: colors.glassWhite,
                    borderWidth: 1,
                    borderColor: colors.glassBorder,
                    alignItems: 'center',
                  }}
                >
                  <Text style={{ color: colors.textWhite, fontWeight: '600' }}>
                    Cancel
                  </Text>
                </Pressable>
              ) : removalCheck?.canRemove ? (
                <>
                  <Pressable
                    onPress={closeModal}
                    style={{
                      flex: 1,
                      paddingVertical: 14,
                      borderRadius: borderRadius.md,
                      backgroundColor: colors.glassWhite,
                      borderWidth: 1,
                      borderColor: colors.glassBorder,
                      alignItems: 'center',
                    }}
                  >
                    <Text style={{ color: colors.textWhite, fontWeight: '600' }}>
                      Cancel
                    </Text>
                  </Pressable>
                  <Pressable
                    onPress={handleConfirmRemoval}
                    disabled={removeMemberMutation.isPending}
                    style={{
                      flex: 1,
                      paddingVertical: 14,
                      borderRadius: borderRadius.md,
                      backgroundColor: '#E3A05D',
                      alignItems: 'center',
                      opacity: removeMemberMutation.isPending ? 0.6 : 1,
                    }}
                  >
                    {removeMemberMutation.isPending ? (
                      <ActivityIndicator size="small" color="#FFFFFF" />
                    ) : (
                      <Text style={{ color: '#FFFFFF', fontWeight: '600' }}>
                        Remove Member
                      </Text>
                    )}
                  </Pressable>
                </>
              ) : removalCheck?.debtAmount && removalCheck.debtAmount > 0 ? (
                <>
                  <Pressable
                    onPress={closeModal}
                    style={{
                      flex: 1,
                      paddingVertical: 14,
                      borderRadius: borderRadius.md,
                      backgroundColor: colors.glassWhite,
                      borderWidth: 1,
                      borderColor: colors.glassBorder,
                      alignItems: 'center',
                    }}
                  >
                    <Text style={{ color: colors.textWhite, fontWeight: '600' }}>
                      Cancel
                    </Text>
                  </Pressable>
                  <Pressable
                    onPress={() => {
                      closeModal();
                      router.push('/settlement');
                    }}
                    style={{
                      flex: 1,
                      paddingVertical: 14,
                      borderRadius: borderRadius.md,
                      backgroundColor: colors.contextTeal,
                      alignItems: 'center',
                    }}
                  >
                    <Text style={{ color: '#FFFFFF', fontWeight: '600' }}>
                      Go to Settlement
                    </Text>
                  </Pressable>
                </>
              ) : (
                <Pressable
                  onPress={closeModal}
                  style={{
                    flex: 1,
                    paddingVertical: 14,
                    borderRadius: borderRadius.md,
                    backgroundColor: colors.glassWhite,
                    borderWidth: 1,
                    borderColor: colors.glassBorder,
                    alignItems: 'center',
                  }}
                >
                  <Text style={{ color: colors.textWhite, fontWeight: '600' }}>
                    Close
                  </Text>
                </Pressable>
              )}
            </View>
          </Animated.View>
        </View>
      </Modal>
    </LinearGradient>
  );
}
