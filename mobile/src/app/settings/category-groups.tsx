import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  Pressable,
  TextInput,
  ActivityIndicator,
  Alert,
  Modal,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { ArrowLeft, Plus, Edit2, Trash2, X } from 'lucide-react-native';
import Animated, { FadeIn, FadeInDown } from 'react-native-reanimated';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { db } from '@/lib/db';
import {
  getCategoryGroups,
  updateCategoryGroupName,
  createCustomCategoryGroup,
  deleteCategoryGroup,
  type CategoryGroup,
} from '@/lib/category-groups-api';
import { getUserProfileAndHousehold } from '@/lib/household-utils';
import { colors, borderRadius } from '@/lib/design-tokens';
import { cn } from '@/lib/cn';

export default function CategoryGroupsManagementScreen() {
  const insets = useSafeAreaInsets();
  const queryClient = useQueryClient();
  const { user } = db.useAuth();
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingGroupId, setEditingGroupId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState('');
  const [newGroupName, setNewGroupName] = useState('');
  const [selectedType, setSelectedType] = useState<'expense' | 'income'>('expense');
  const [errorMessage, setErrorMessage] = useState('');

  // Get user profile and household (works for both admin and members)
  const householdQuery = useQuery({
    queryKey: ['user-household', user?.email],
    queryFn: async () => {
      if (!user?.email) throw new Error('No user email');
      const result = await getUserProfileAndHousehold(user.email);
      if (!result) throw new Error('No household found');
      return result;
    },
    enabled: !!user?.email,
  });

  const householdId = householdQuery.data?.householdId;
  const userId = householdQuery.data?.userRecord?.id;

  // Get category groups
  const categoryGroupsQuery = useQuery({
    queryKey: ['categoryGroups', householdId, userId],
    queryFn: async () => {
      if (!householdId || !userId) return [];
      return getCategoryGroups(householdId, userId);
    },
    enabled: !!householdId && !!userId,
  });

  // Update group name mutation
  const updateMutation = useMutation({
    mutationFn: async ({ groupId, name }: { groupId: string; name: string }) => {
      return updateCategoryGroupName(groupId, name);
    },
    onSuccess: (result) => {
      if (result.success) {
        setEditingGroupId(null);
        setEditingName('');
        queryClient.invalidateQueries({ queryKey: ['categoryGroups'] });
      } else {
        setErrorMessage(result.error || 'Failed to update');
      }
    },
    onError: (error) => {
      setErrorMessage('Failed to update category group');
    },
  });

  // Create group mutation
  const createMutation = useMutation({
    mutationFn: async () => {
      if (!userId || !householdId) throw new Error('No user or household');
      return createCustomCategoryGroup(
        householdId,
        userId,
        newGroupName,
        selectedType
      );
    },
    onSuccess: (result) => {
      if (result.success) {
        setShowCreateModal(false);
        setNewGroupName('');
        setSelectedType('expense');
        setErrorMessage('');
        queryClient.invalidateQueries({ queryKey: ['categoryGroups'] });
      } else {
        setErrorMessage(result.error || 'Failed to create');
      }
    },
    onError: (error) => {
      setErrorMessage('Failed to create category group');
    },
  });

  // Delete group mutation
  const deleteMutation = useMutation({
    mutationFn: deleteCategoryGroup,
    onSuccess: (result) => {
      if (result.success) {
        queryClient.invalidateQueries({ queryKey: ['categoryGroups'] });
      } else {
        Alert.alert('Error', result.error || 'Failed to delete');
      }
    },
  });

  const handleSaveEdit = (groupId: string) => {
    if (!editingName.trim()) {
      setErrorMessage('Name cannot be empty');
      return;
    }
    updateMutation.mutate({ groupId, name: editingName });
  };

  const handleCreateGroup = () => {
    if (!newGroupName.trim()) {
      setErrorMessage('Group name is required');
      return;
    }
    createMutation.mutate();
  };

  const handleDeleteGroup = (group: CategoryGroup) => {
    if (group.isDefault) {
      Alert.alert('Cannot Delete', 'Default category groups cannot be deleted');
      return;
    }

    Alert.alert(
      'Delete Category Group',
      `Are you sure you want to delete "${group.name}"? Categories in this group will need to be reassigned.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => deleteMutation.mutate(group.id),
        },
      ]
    );
  };

  if (householdQuery.isLoading || categoryGroupsQuery.isLoading) {
    return (
      <LinearGradient
        colors={[colors.contextDark, colors.contextTeal]}
        start={{ x: 0, y: 0 }}
        end={{ x: 0, y: 1 }}
        style={{ flex: 1, paddingTop: insets.top }}
      >
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" color={colors.sageGreen} />
        </View>
      </LinearGradient>
    );
  }

  const groups = categoryGroupsQuery.data || [];
  const expenseGroups = groups.filter((g) => g.type === 'expense');
  const incomeGroups = groups.filter((g) => g.type === 'income');

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
          <Text className="text-white text-xl font-semibold">Category Groups</Text>
        </View>
        <Pressable
          onPress={() => setShowCreateModal(true)}
          style={{
            width: 40,
            height: 40,
            borderRadius: borderRadius.sm,
            backgroundColor: colors.glassWhite,
            borderWidth: 1,
            borderColor: colors.glassBorder,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Plus size={20} color={colors.textWhite} strokeWidth={2} />
        </Pressable>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{
          paddingHorizontal: 20,
          paddingBottom: insets.bottom + 24,
        }}
      >
        {/* Description */}
        <Animated.View entering={FadeInDown.delay(0).duration(400)}>
          <Text style={{ color: colors.textWhiteSecondary }} className="text-sm mb-6">
            Customize your budget category groups. Needs, Wants, and Savings are default groups that cannot be deleted, but you
            can rename them and create new custom groups.
          </Text>
        </Animated.View>

        {/* Expense Groups Section */}
        {expenseGroups.length > 0 && (
          <View className="mb-8">
            <Text style={{ color: colors.sageGreen }} className="text-xs font-bold mb-4 uppercase">
              Expense Groups
            </Text>

            <View className="gap-3">
              {expenseGroups.map((group, index) => (
                <Animated.View
                  key={group.id}
                  entering={FadeInDown.delay(100 + index * 50).duration(400)}
                >
                  <View
                    style={{
                      backgroundColor: colors.glassWhite,
                      borderWidth: 1,
                      borderColor: colors.glassBorder,
                      borderRadius: borderRadius.md,
                      padding: 16,
                    }}
                  >
                    <View className="flex-row items-center justify-between">
                      <View className="flex-row items-center gap-3 flex-1">
                        {group.icon && <Text className="text-2xl">{group.icon}</Text>}
                        {editingGroupId === group.id ? (
                          <View className="flex-1">
                            <TextInput
                              value={editingName}
                              onChangeText={setEditingName}
                              placeholder="Group name"
                              placeholderTextColor={colors.textWhiteSecondary}
                              maxLength={50}
                              style={{
                                paddingHorizontal: 12,
                                paddingVertical: 8,
                                borderRadius: borderRadius.sm,
                                backgroundColor: 'rgba(255,255,255,0.05)',
                                fontSize: 14,
                                fontWeight: '600',
                                color: colors.textWhite,
                              }}
                              autoFocus
                            />
                          </View>
                        ) : (
                          <View className="flex-1">
                            <Text style={{ color: colors.textWhite }} className="text-sm font-semibold">
                              {group.name}
                            </Text>
                            {group.isDefault && (
                              <Text style={{ color: colors.textWhiteSecondary }} className="text-xs mt-1">
                                Default
                              </Text>
                            )}
                          </View>
                        )}
                      </View>

                      <View className="flex-row gap-2">
                        {editingGroupId === group.id ? (
                          <>
                            <Pressable
                              onPress={() => handleSaveEdit(group.id)}
                              disabled={updateMutation.isPending}
                              style={{
                                padding: 8,
                                borderRadius: borderRadius.sm,
                                backgroundColor: 'rgba(168, 181, 161, 0.15)',
                              }}
                            >
                              <Text style={{ color: colors.sageGreen }} className="text-xs font-semibold">
                                Save
                              </Text>
                            </Pressable>
                            <Pressable
                              onPress={() => {
                                setEditingGroupId(null);
                                setEditingName('');
                                setErrorMessage('');
                              }}
                              style={{
                                padding: 8,
                                borderRadius: borderRadius.sm,
                                backgroundColor: colors.glassWhite,
                              }}
                            >
                              <X size={18} color={colors.textWhiteSecondary} />
                            </Pressable>
                          </>
                        ) : (
                          <>
                            <Pressable
                              onPress={() => {
                                setEditingGroupId(group.id);
                                setEditingName(group.name);
                                setErrorMessage('');
                              }}
                              style={{
                                padding: 8,
                                borderRadius: borderRadius.sm,
                                backgroundColor: colors.glassWhite,
                              }}
                            >
                              <Edit2 size={18} color={colors.sageGreen} />
                            </Pressable>
                            {!group.isDefault && (
                              <Pressable
                                onPress={() => handleDeleteGroup(group)}
                                style={{
                                  padding: 8,
                                  borderRadius: borderRadius.sm,
                                  backgroundColor: 'rgba(227, 160, 93, 0.1)',
                                }}
                              >
                                <Trash2 size={18} color="#E3A05D" />
                              </Pressable>
                            )}
                          </>
                        )}
                      </View>
                    </View>
                  </View>
                </Animated.View>
                  ))}
                </View>
              </View>
            )}

            {/* Income Groups Section */}
            {incomeGroups.length > 0 && (
              <View className="mb-8">
                <Text style={{ color: colors.sageGreen }} className="text-xs font-bold mb-4 uppercase">
                  Income Groups
                </Text>

                <View className="gap-3">
                  {incomeGroups.map((group, index) => (
                    <Animated.View
                      key={group.id}
                      entering={FadeInDown.delay(100 + expenseGroups.length * 50 + index * 50).duration(400)}
                    >
                      <View
                        style={{
                          backgroundColor: colors.glassWhite,
                          borderWidth: 1,
                          borderColor: colors.glassBorder,
                          borderRadius: borderRadius.md,
                          padding: 16,
                        }}
                      >
                        <View className="flex-row items-center justify-between">
                          <View className="flex-row items-center gap-3 flex-1">
                            {group.icon && <Text className="text-2xl">{group.icon}</Text>}
                            {editingGroupId === group.id ? (
                              <View className="flex-1">
                                <TextInput
                                  value={editingName}
                                  onChangeText={setEditingName}
                                  placeholder="Group name"
                                  placeholderTextColor={colors.textWhiteSecondary}
                                  maxLength={50}
                                  style={{
                                    paddingHorizontal: 12,
                                    paddingVertical: 8,
                                    borderRadius: borderRadius.sm,
                                    backgroundColor: 'rgba(255,255,255,0.05)',
                                    fontSize: 14,
                                    fontWeight: '600',
                                    color: colors.textWhite,
                                  }}
                                  autoFocus
                                />
                              </View>
                            ) : (
                              <View className="flex-1">
                                <Text style={{ color: colors.textWhite }} className="text-sm font-semibold">
                                  {group.name}
                                </Text>
                                {group.isDefault && (
                                  <Text style={{ color: colors.textWhiteSecondary }} className="text-xs mt-1">
                                    Default
                                  </Text>
                                )}
                              </View>
                            )}
                          </View>

                          <View className="flex-row gap-2">
                            {editingGroupId === group.id ? (
                              <>
                                <Pressable
                                  onPress={() => handleSaveEdit(group.id)}
                                  disabled={updateMutation.isPending}
                                  style={{
                                    padding: 8,
                                    borderRadius: borderRadius.sm,
                                    backgroundColor: 'rgba(168, 181, 161, 0.15)',
                                  }}
                                >
                                  <Text style={{ color: colors.sageGreen }} className="text-xs font-semibold">
                                    Save
                                  </Text>
                                </Pressable>
                                <Pressable
                                  onPress={() => {
                                    setEditingGroupId(null);
                                    setEditingName('');
                                    setErrorMessage('');
                                  }}
                                  style={{
                                    padding: 8,
                                    borderRadius: borderRadius.sm,
                                    backgroundColor: colors.glassWhite,
                                  }}
                                >
                                  <X size={18} color={colors.textWhiteSecondary} />
                                </Pressable>
                              </>
                            ) : (
                              <>
                                <Pressable
                                  onPress={() => {
                                    setEditingGroupId(group.id);
                                    setEditingName(group.name);
                                    setErrorMessage('');
                                  }}
                                  style={{
                                    padding: 8,
                                    borderRadius: borderRadius.sm,
                                    backgroundColor: colors.glassWhite,
                                  }}
                                >
                                  <Edit2 size={18} color={colors.sageGreen} />
                                </Pressable>
                                {!group.isDefault && (
                                  <Pressable
                                    onPress={() => handleDeleteGroup(group)}
                                    style={{
                                      padding: 8,
                                      borderRadius: borderRadius.sm,
                                      backgroundColor: 'rgba(227, 160, 93, 0.1)',
                                    }}
                                  >
                                    <Trash2 size={18} color="#E3A05D" />
                                  </Pressable>
                                )}
                              </>
                            )}
                          </View>
                        </View>
                      </View>
                    </Animated.View>
                  ))}
                </View>
              </View>
            )}

        {/* Error Message */}
        {errorMessage && (
          <View
            style={{
              marginBottom: 24,
              padding: 16,
              backgroundColor: 'rgba(227, 160, 93, 0.1)',
              borderRadius: borderRadius.md,
              borderWidth: 1,
              borderColor: 'rgba(227, 160, 93, 0.3)',
            }}
          >
            <Text style={{ color: '#E3A05D' }} className="text-sm">
              {errorMessage}
            </Text>
          </View>
        )}
      </ScrollView>

      {/* Create Group Modal */}
      <Modal visible={showCreateModal} transparent animationType="slide">
        <LinearGradient
          colors={[colors.contextDark, colors.contextTeal]}
          start={{ x: 0, y: 0 }}
          end={{ x: 0, y: 1 }}
          style={{ flex: 1 }}
        >
          <SafeAreaView style={{ flex: 1, paddingTop: insets.top }} edges={['bottom']}>
            <KeyboardAvoidingView
              behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
              style={{ flex: 1 }}
              keyboardVerticalOffset={0}
            >
              <ScrollView
                showsVerticalScrollIndicator={false}
                style={{ flex: 1 }}
                contentContainerStyle={{ paddingHorizontal: 24, paddingVertical: 24 }}
              >
                {/* Header */}
                <View className="flex-row items-center justify-between mb-6">
                  <Text
                    style={{ color: colors.textWhite }}
                    className="text-2xl font-bold"
                  >
                    Create Category Group
                  </Text>
                  <Pressable
                    onPress={() => setShowCreateModal(false)}
                    style={{
                      width: 36,
                      height: 36,
                      borderRadius: borderRadius.sm,
                      backgroundColor: colors.glassWhite,
                      borderWidth: 1,
                      borderColor: colors.glassBorder,
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <X size={20} color={colors.textWhite} />
                  </Pressable>
                </View>

                {/* Error Message */}
                {errorMessage && (
                  <View
                    style={{
                      marginBottom: 24,
                      padding: 16,
                      backgroundColor: 'rgba(227, 160, 93, 0.1)',
                      borderRadius: borderRadius.md,
                      borderWidth: 1,
                      borderColor: 'rgba(227, 160, 93, 0.3)',
                    }}
                  >
                    <Text style={{ color: colors.softAmber }} className="text-sm">
                      {errorMessage}
                    </Text>
                  </View>
                )}

                {/* Name Input */}
                <View className="mb-6">
                  <Text
                    style={{ color: colors.textWhite }}
                    className="text-sm font-semibold mb-2"
                  >
                    Group Name
                  </Text>
                  <TextInput
                    value={newGroupName}
                    onChangeText={(text) => {
                      setNewGroupName(text);
                      setErrorMessage('');
                    }}
                    placeholder="e.g., Education, Transportation"
                    placeholderTextColor={colors.textWhiteSecondary}
                    maxLength={50}
                    style={{
                      paddingHorizontal: 16,
                      paddingVertical: 12,
                      borderRadius: borderRadius.md,
                      fontSize: 16,
                      fontWeight: '500',
                      color: colors.textWhite,
                      backgroundColor: 'rgba(255,255,255,0.05)',
                      borderWidth: 1,
                      borderColor: 'rgba(255,255,255,0.1)',
                    }}
                  />
                  <Text
                    style={{ color: colors.textWhiteSecondary }}
                    className="text-xs mt-1"
                  >
                    {newGroupName.length}/50
                  </Text>
                </View>

                {/* Type Selection */}
                <View className="mb-8">
                  <Text
                    style={{ color: colors.textWhite }}
                    className="text-sm font-semibold mb-3"
                  >
                    Type
                  </Text>
                  <View style={{ flexDirection: 'row', gap: 12 }}>
                    {(['expense', 'income'] as const).map((type) => (
                      <Pressable
                        key={type}
                        onPress={() => setSelectedType(type)}
                        style={{
                          flex: 1,
                          paddingVertical: 12,
                          paddingHorizontal: 16,
                          borderRadius: borderRadius.md,
                          borderWidth: 2,
                          borderColor:
                            selectedType === type ? colors.sageGreen : 'rgba(255,255,255,0.1)',
                          backgroundColor:
                            selectedType === type
                              ? 'rgba(168,181,161,0.1)'
                              : 'rgba(255,255,255,0.03)',
                        }}
                      >
                        <Text
                          style={{
                            fontWeight: '600',
                            textAlign: 'center',
                            color:
                              selectedType === type ? colors.sageGreen : colors.textWhite,
                          }}
                        >
                          {type === 'expense' ? '💸 Expense' : '💰 Income'}
                        </Text>
                      </Pressable>
                    ))}
                  </View>
                </View>

                {/* Info */}
                <View
                  style={{
                    marginBottom: 24,
                    padding: 16,
                    backgroundColor: 'rgba(168,181,161,0.1)',
                    borderRadius: borderRadius.md,
                    borderWidth: 1,
                    borderColor: 'rgba(168,181,161,0.3)',
                  }}
                >
                  <Text style={{ color: colors.sageGreen }} className="text-sm">
                    Create custom groups to organize your categories however you like. You can
                    rename default groups but cannot delete them.
                  </Text>
                </View>
              </ScrollView>

              {/* Action Button */}
              <View
                style={{
                  padding: 24,
                  borderTopWidth: 1,
                  borderTopColor: 'rgba(255,255,255,0.05)',
                }}
              >
                <Pressable
                  onPress={handleCreateGroup}
                  disabled={createMutation.isPending || !newGroupName.trim()}
                  style={{
                    paddingVertical: 16,
                    borderRadius: borderRadius.md,
                    alignItems: 'center',
                    justifyContent: 'center',
                    backgroundColor:
                      newGroupName.trim() && !createMutation.isPending
                        ? colors.contextTeal
                        : 'rgba(255,255,255,0.1)',
                    opacity:
                      newGroupName.trim() && !createMutation.isPending ? 1 : 0.5,
                  }}
                >
                  <Text
                    style={{
                      fontSize: 16,
                      fontWeight: '600',
                      color: colors.textWhite,
                    }}
                  >
                    {createMutation.isPending ? 'Creating...' : 'Create Group'}
                  </Text>
                </Pressable>
              </View>
            </KeyboardAvoidingView>
          </SafeAreaView>
        </LinearGradient>
      </Modal>
    </LinearGradient>
  );
}
