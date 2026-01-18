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
import { Stack, router } from 'expo-router';
import { ChevronLeft, Plus, Edit2, Trash2, X } from 'lucide-react-native';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { db } from '@/lib/db';
import {
  getCategoryGroups,
  updateCategoryGroupName,
  createCustomCategoryGroup,
  deleteCategoryGroup,
  type CategoryGroup,
} from '@/lib/category-groups-api';
import { cn } from '@/lib/cn';

export default function CategoryGroupsManagementScreen() {
  const queryClient = useQueryClient();
  const { user } = db.useAuth();
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingGroupId, setEditingGroupId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState('');
  const [newGroupName, setNewGroupName] = useState('');
  const [selectedType, setSelectedType] = useState<'expense' | 'income'>('expense');
  const [errorMessage, setErrorMessage] = useState('');

  // Get household data
  const householdQuery = useQuery({
    queryKey: ['household', user?.email],
    queryFn: async () => {
      if (!user?.email) throw new Error('No user email');

      const userResult = await db.queryOnce({
        users: { $: { where: { email: user.email } } },
      });

      const userRecord = userResult.data.users?.[0];
      if (!userRecord) throw new Error('User not found');

      const householdsResult = await db.queryOnce({
        households: { $: { where: { createdByUserId: userRecord.id } } },
      });

      const household = householdsResult.data.households?.[0];
      if (!household) throw new Error('No household found');

      return { userRecord, household };
    },
    enabled: !!user?.email,
  });

  // Get category groups
  const categoryGroupsQuery = useQuery({
    queryKey: ['categoryGroups', householdQuery.data?.household?.id],
    queryFn: async () => {
      if (!householdQuery.data?.household?.id) return [];
      return getCategoryGroups(householdQuery.data.household.id);
    },
    enabled: !!householdQuery.data?.household?.id,
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
      if (!householdQuery.data?.userRecord?.id) throw new Error('No user');
      return createCustomCategoryGroup(
        householdQuery.data.household.id,
        householdQuery.data.userRecord.id,
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
      <View className="flex-1 bg-white justify-center items-center">
        <ActivityIndicator size="large" color="#006A6A" />
      </View>
    );
  }

  const groups = categoryGroupsQuery.data || [];
  const expenseGroups = groups.filter((g) => g.type === 'expense');
  const incomeGroups = groups.filter((g) => g.type === 'income');

  return (
    <>
      <Stack.Screen
        options={{
          title: 'Category Groups',
          headerLeft: () => (
            <Pressable onPress={() => router.back()} className="mr-4">
              <ChevronLeft size={24} color="#006A6A" />
            </Pressable>
          ),
          headerStyle: { backgroundColor: '#FFFFFF' },
          headerTintColor: '#006A6A',
          headerTitleStyle: { fontSize: 18, fontWeight: '600' },
        }}
      />

      <SafeAreaView className="flex-1 bg-gray-50" edges={['bottom']}>
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 100 }}>
          <View className="px-6 py-6">
            {/* Description */}
            <Text className="text-sm text-gray-600 mb-6">
              Customize your budget category groups. Needs, Wants, and Savings are default groups that cannot be deleted, but you
              can rename them and create new custom groups.
            </Text>

            {/* Expense Groups Section */}
            {expenseGroups.length > 0 && (
              <View className="mb-8">
                <Text className="text-xs font-bold text-gray-500 mb-4 uppercase">Expense Groups</Text>

                <View className="gap-3">
                  {expenseGroups.map((group) => (
                    <View
                      key={group.id}
                      className="bg-white rounded-lg p-4 border border-gray-200 flex-row items-center justify-between"
                    >
                      <View className="flex-row items-center gap-3 flex-1">
                        {group.icon && <Text className="text-2xl">{group.icon}</Text>}
                        {editingGroupId === group.id ? (
                          <View className="flex-1">
                            <TextInput
                              value={editingName}
                              onChangeText={setEditingName}
                              placeholder="Group name"
                              maxLength={50}
                              className="px-3 py-2 rounded-lg bg-gray-100 text-sm font-medium text-gray-900"
                              autoFocus
                            />
                          </View>
                        ) : (
                          <View className="flex-1">
                            <Text className="text-sm font-semibold text-gray-900">{group.name}</Text>
                            {group.isDefault && <Text className="text-xs text-gray-500 mt-1">Default</Text>}
                          </View>
                        )}
                      </View>

                      <View className="flex-row gap-2">
                        {editingGroupId === group.id ? (
                          <>
                            <Pressable
                              onPress={() => handleSaveEdit(group.id)}
                              disabled={updateMutation.isPending}
                              className="p-2 rounded-lg bg-teal-50"
                            >
                              <Text className="text-xs font-semibold text-teal-600">Save</Text>
                            </Pressable>
                            <Pressable
                              onPress={() => {
                                setEditingGroupId(null);
                                setEditingName('');
                                setErrorMessage('');
                              }}
                              className="p-2 rounded-lg bg-gray-100"
                            >
                              <X size={18} color="#6B7280" />
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
                              className="p-2 rounded-lg bg-blue-50"
                            >
                              <Edit2 size={18} color="#3B82F6" />
                            </Pressable>
                            {!group.isDefault && (
                              <Pressable
                                onPress={() => handleDeleteGroup(group)}
                                className="p-2 rounded-lg bg-red-50"
                              >
                                <Trash2 size={18} color="#EF4444" />
                              </Pressable>
                            )}
                          </>
                        )}
                      </View>
                    </View>
                  ))}
                </View>
              </View>
            )}

            {/* Income Groups Section */}
            {incomeGroups.length > 0 && (
              <View className="mb-8">
                <Text className="text-xs font-bold text-gray-500 mb-4 uppercase">Income Groups</Text>

                <View className="gap-3">
                  {incomeGroups.map((group) => (
                    <View
                      key={group.id}
                      className="bg-white rounded-lg p-4 border border-gray-200 flex-row items-center justify-between"
                    >
                      <View className="flex-row items-center gap-3 flex-1">
                        {group.icon && <Text className="text-2xl">{group.icon}</Text>}
                        {editingGroupId === group.id ? (
                          <View className="flex-1">
                            <TextInput
                              value={editingName}
                              onChangeText={setEditingName}
                              placeholder="Group name"
                              maxLength={50}
                              className="px-3 py-2 rounded-lg bg-gray-100 text-sm font-medium text-gray-900"
                              autoFocus
                            />
                          </View>
                        ) : (
                          <View className="flex-1">
                            <Text className="text-sm font-semibold text-gray-900">{group.name}</Text>
                            {group.isDefault && <Text className="text-xs text-gray-500 mt-1">Default</Text>}
                          </View>
                        )}
                      </View>

                      <View className="flex-row gap-2">
                        {editingGroupId === group.id ? (
                          <>
                            <Pressable
                              onPress={() => handleSaveEdit(group.id)}
                              disabled={updateMutation.isPending}
                              className="p-2 rounded-lg bg-teal-50"
                            >
                              <Text className="text-xs font-semibold text-teal-600">Save</Text>
                            </Pressable>
                            <Pressable
                              onPress={() => {
                                setEditingGroupId(null);
                                setEditingName('');
                                setErrorMessage('');
                              }}
                              className="p-2 rounded-lg bg-gray-100"
                            >
                              <X size={18} color="#6B7280" />
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
                              className="p-2 rounded-lg bg-blue-50"
                            >
                              <Edit2 size={18} color="#3B82F6" />
                            </Pressable>
                            {!group.isDefault && (
                              <Pressable
                                onPress={() => handleDeleteGroup(group)}
                                className="p-2 rounded-lg bg-red-50"
                              >
                                <Trash2 size={18} color="#EF4444" />
                              </Pressable>
                            )}
                          </>
                        )}
                      </View>
                    </View>
                  ))}
                </View>
              </View>
            )}

            {/* Error Message */}
            {errorMessage && (
              <View className="mb-6 p-4 bg-red-50 rounded-lg border border-red-200">
                <Text className="text-sm text-red-700">{errorMessage}</Text>
              </View>
            )}
          </View>
        </ScrollView>

        {/* Create New Group Button */}
        <View className="absolute bottom-0 left-0 right-0 p-6 bg-white border-t border-gray-200">
          <Pressable
            onPress={() => {
              setShowCreateModal(true);
              setErrorMessage('');
              setNewGroupName('');
              setSelectedType('expense');
            }}
            className="bg-teal-600 py-4 rounded-xl flex-row items-center justify-center gap-2"
          >
            <Plus size={20} color="white" />
            <Text className="text-base font-semibold text-white">Create New Group</Text>
          </Pressable>
        </View>

        {/* Create Group Modal */}
        <Modal visible={showCreateModal} transparent animationType="slide">
          <SafeAreaView className="flex-1 bg-white">
            <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} className="flex-1">
              <ScrollView showsVerticalScrollIndicator={false} className="flex-1">
                <View className="px-6 py-6">
                  {/* Header */}
                  <View className="flex-row items-center justify-between mb-6">
                    <Text className="text-2xl font-bold text-gray-900">Create Category Group</Text>
                    <Pressable onPress={() => setShowCreateModal(false)}>
                      <X size={24} color="#6B7280" />
                    </Pressable>
                  </View>

                  {/* Error Message */}
                  {errorMessage && (
                    <View className="mb-6 p-4 bg-red-50 rounded-lg border border-red-200">
                      <Text className="text-sm text-red-700">{errorMessage}</Text>
                    </View>
                  )}

                  {/* Name Input */}
                  <View className="mb-6">
                    <Text className="text-sm font-semibold text-gray-700 mb-2">Group Name</Text>
                    <TextInput
                      value={newGroupName}
                      onChangeText={(text) => {
                        setNewGroupName(text);
                        setErrorMessage('');
                      }}
                      placeholder="e.g., Education, Transportation"
                      placeholderTextColor="#D1D5DB"
                      maxLength={50}
                      className="px-4 py-3 rounded-lg text-base font-medium text-gray-900 bg-gray-50"
                      style={{ borderWidth: 1, borderColor: '#E5E7EB' }}
                    />
                    <Text className="text-xs text-gray-500 mt-1">{newGroupName.length}/50</Text>
                  </View>

                  {/* Type Selection */}
                  <View className="mb-8">
                    <Text className="text-sm font-semibold text-gray-700 mb-3">Type</Text>
                    <View className="flex-row gap-3">
                      {(['expense', 'income'] as const).map((type) => (
                        <Pressable
                          key={type}
                          onPress={() => setSelectedType(type)}
                          className={cn(
                            'flex-1 py-3 px-4 rounded-lg border-2',
                            selectedType === type ? 'bg-teal-50 border-teal-600' : 'bg-white border-gray-200'
                          )}
                        >
                          <Text
                            className={cn(
                              'font-semibold text-center',
                              selectedType === type ? 'text-teal-700' : 'text-gray-700'
                            )}
                          >
                            {type === 'expense' ? '💸 Expense' : '💰 Income'}
                          </Text>
                        </Pressable>
                      ))}
                    </View>
                  </View>

                  {/* Info */}
                  <View className="mb-6 p-4 bg-blue-50 rounded-lg border border-blue-200">
                    <Text className="text-sm text-blue-700">
                      Create custom groups to organize your categories however you like. You can rename default groups but cannot
                      delete them.
                    </Text>
                  </View>
                </View>
              </ScrollView>

              {/* Action Buttons */}
              <View className="p-6 border-t border-gray-200 gap-3">
                <Pressable
                  onPress={handleCreateGroup}
                  disabled={createMutation.isPending || !newGroupName.trim()}
                  className={cn(
                    'py-4 rounded-xl items-center justify-center',
                    newGroupName.trim() && !createMutation.isPending ? 'bg-teal-600' : 'bg-gray-300'
                  )}
                >
                  <Text
                    className={cn(
                      'text-base font-semibold',
                      newGroupName.trim() && !createMutation.isPending ? 'text-white' : 'text-gray-500'
                    )}
                  >
                    {createMutation.isPending ? 'Creating...' : 'Create Group'}
                  </Text>
                </Pressable>

                <Pressable
                  onPress={() => setShowCreateModal(false)}
                  className="py-3 rounded-lg items-center justify-center bg-gray-100"
                >
                  <Text className="text-base font-semibold text-gray-700">Cancel</Text>
                </Pressable>
              </View>
            </KeyboardAvoidingView>
          </SafeAreaView>
        </Modal>
      </SafeAreaView>
    </>
  );
}
