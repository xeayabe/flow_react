import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  Pressable,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Keyboard,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { router, useLocalSearchParams } from 'expo-router';
import { Info, ChevronDown, Trash2, Eye, EyeOff } from 'lucide-react-native';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  getAccountById,
  updateAccount,
  deleteAccount,
  parseBalance,
  formatBalance,
  INSTITUTIONS,
  ACCOUNT_TYPES,
  type Institution,
  type AccountType,
  type UpdateAccountData,
} from '@/lib/accounts-api';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { InstitutionPicker } from '@/components/InstitutionPicker';
import { WalletTypePicker } from '@/components/AccountTypePicker';

interface FormData {
  name: string;
  institution: Institution | '';
  accountType: AccountType | '';
  balance: string;
  last4Digits: string;
  isDefault: boolean;
  isExcludedFromBudget: boolean;
}

interface ValidationErrors {
  name?: string;
  institution?: string;
  accountType?: string;
  balance?: string;
  last4Digits?: string;
}

export default function EditWalletScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const queryClient = useQueryClient();

  const [formData, setFormData] = useState<FormData>({
    name: '',
    institution: '',
    accountType: '',
    balance: '',
    last4Digits: '',
    isDefault: false,
    isExcludedFromBudget: false,
  });

  const [errors, setErrors] = useState<ValidationErrors>({});
  const [touched, setTouched] = useState<Record<string, boolean>>({});
  const [focusedField, setFocusedField] = useState<string | null>(null);
  const [showInstitutionPicker, setShowInstitutionPicker] = useState<boolean>(false);
  const [showAccountTypePicker, setShowAccountTypePicker] = useState<boolean>(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<boolean>(false);

  // Fetch existing account
  const { data: account, isLoading: isLoadingAccount } = useQuery({
    queryKey: ['account', id],
    queryFn: async () => {
      if (!id) return null;
      return getAccountById(id);
    },
    enabled: !!id,
  });

  // Populate form when account loads
  useEffect(() => {
    if (account) {
      setFormData({
        name: account.name,
        institution: account.institution,
        accountType: account.accountType,
        balance: account.balance.toString(),
        last4Digits: account.last4Digits || '',
        isDefault: account.isDefault,
        isExcludedFromBudget: account.isExcludedFromBudget || false,
      });
    }
  }, [account]);

  const updateAccountMutation = useMutation({
    mutationFn: async (data: UpdateAccountData) => {
      if (!id) throw new Error('Account ID not found');
      return updateAccount(id, data);
    },
    onSuccess: (response) => {
      if (response.success) {
        queryClient.invalidateQueries({ queryKey: ['wallets'] });
        queryClient.invalidateQueries({ queryKey: ['account', id] });
        router.back();
      } else {
        setErrors({ name: response.error });
      }
    },
    onError: () => {
      setErrors({ name: 'Something went wrong. Please try again' });
    },
  });

  const deleteAccountMutation = useMutation({
    mutationFn: async () => {
      if (!id) throw new Error('Account ID not found');
      return deleteAccount(id);
    },
    onSuccess: (response) => {
      if (response.success) {
        queryClient.invalidateQueries({ queryKey: ['wallets'] });
        router.replace('/wallets');
      } else {
        Alert.alert('Error', response.error || 'Failed to delete account');
      }
    },
    onError: () => {
      Alert.alert('Error', 'Something went wrong. Please try again');
    },
  });

  const validateName = (name: string): string | undefined => {
    if (!name.trim()) return 'Please enter a wallet name';
    if (name.trim().length < 2) return 'Minimum 2 characters';
    if (name.length > 50) return 'Maximum 50 characters';
    return undefined;
  };

  const validateBalance = (balance: string): string | undefined => {
    if (!balance.trim()) return 'Please enter a balance';
    const parsed = parseBalance(balance);
    if (parsed === null) return 'Please enter a valid number';
    return undefined;
  };

  const validateLast4Digits = (digits: string): string | undefined => {
    if (digits && digits.length !== 4) return 'Card/Account number should be 4 digits';
    if (digits && !/^\d{4}$/.test(digits)) return 'Card/Account number should be 4 digits';
    return undefined;
  };

  const handleBlur = (field: keyof FormData) => {
    setTouched({ ...touched, [field]: true });
    setFocusedField(null);

    let error: string | undefined;
    switch (field) {
      case 'name':
        error = validateName(formData.name);
        break;
      case 'balance':
        error = validateBalance(formData.balance);
        break;
      case 'last4Digits':
        error = validateLast4Digits(formData.last4Digits);
        break;
    }

    setErrors({ ...errors, [field]: error });
  };

  const handleSubmit = async () => {
    Keyboard.dismiss();

    // Mark relevant fields as touched
    setTouched({
      name: true,
      balance: true,
      last4Digits: true,
    });

    // Validate fields
    const newErrors: ValidationErrors = {
      name: validateName(formData.name),
      balance: validateBalance(formData.balance),
      last4Digits: validateLast4Digits(formData.last4Digits),
    };

    setErrors(newErrors);

    // Check if any errors
    if (Object.values(newErrors).some((error) => error !== undefined)) {
      return;
    }

    // Parse balance
    const parsedBalance = parseBalance(formData.balance);
    if (parsedBalance === null) {
      setErrors({ ...errors, balance: 'Please enter a valid number' });
      return;
    }

    // Submit
    const updateData: UpdateAccountData = {
      name: formData.name.trim(),
      institution: formData.institution as Institution,
      accountType: formData.accountType as AccountType,
      balance: parsedBalance,
      last4Digits: formData.last4Digits || undefined,
      isDefault: formData.isDefault,
      isExcludedFromBudget: formData.isExcludedFromBudget,
    };

    updateAccountMutation.mutate(updateData);
  };

  const handleDelete = () => {
    setShowDeleteConfirm(true);
  };

  const confirmDelete = () => {
    setShowDeleteConfirm(false);
    deleteAccountMutation.mutate();
  };

  const isValid =
    !validateName(formData.name) &&
    !validateBalance(formData.balance) &&
    !validateLast4Digits(formData.last4Digits);

  if (isLoadingAccount) {
    return (
      <View className="flex-1 bg-white items-center justify-center">
        <ActivityIndicator size="large" color="#006A6A" />
        <Text className="text-sm mt-4" style={{ color: '#9CA3AF' }}>
          Loading wallet...
        </Text>
      </View>
    );
  }

  if (!account) {
    return (
      <View className="flex-1 bg-white items-center justify-center px-6">
        <Text className="text-lg font-semibold mb-2" style={{ color: '#1F2937' }}>
          Wallet not found
        </Text>
        <Pressable onPress={() => router.back()}>
          <Text style={{ color: '#006A6A' }}>Go back</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <View className="flex-1 bg-white">
      <StatusBar style="dark" />
      <SafeAreaView edges={['top']} className="flex-1">
        <View className="flex-1 rounded-t-3xl" style={{ overflow: 'hidden' }}>
          {/* Modal Handle */}
          <View className="pt-3 pb-2 items-center bg-white">
            <View style={{ width: 32, height: 4, backgroundColor: '#D1D5DB', borderRadius: 2 }} />
          </View>

          <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            className="flex-1"
          >
          <ScrollView
            className="flex-1"
            contentContainerStyle={{ paddingHorizontal: 16, paddingTop: 8, paddingBottom: 24 }}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
            {/* Header Section */}
            <View className="mb-8">
              <View className="flex-row items-center justify-between mb-3">
                <Pressable onPress={() => router.back()} className="py-2">
                  <Text style={{ color: '#006A6A', fontSize: 16, fontWeight: '600' }}>Cancel</Text>
                </Pressable>
                <Pressable onPress={handleDelete} className="py-2 px-3">
                  <Trash2 size={22} color="#DC2626" />
                </Pressable>
              </View>
              <Text className="text-3xl font-bold text-center" style={{ color: '#006A6A' }}>
                Edit Wallet
              </Text>
              <Text className="text-base text-center mt-2" style={{ color: '#8B9D8B', opacity: 0.6 }}>
                Update your wallet details
              </Text>
            </View>

            {/* Wallet Name */}
            <Animated.View entering={FadeInDown.delay(100).duration(600)} className="mb-6">
              <View className="relative">
                <TextInput
                  className="text-base px-4 pt-6 pb-4 rounded-3xl border-2 bg-white"
                  style={{
                    borderColor: focusedField === 'name' ? '#006A6A' : '#E5E7EB',
                    color: '#1F2937',
                  }}
                  placeholder="e.g., My Checking, Savings Account"
                  placeholderTextColor="#D1D5DB"
                  value={formData.name}
                  onChangeText={(text) => {
                    setFormData({ ...formData, name: text });
                    setErrors({ ...errors, name: undefined });
                  }}
                  onFocus={() => setFocusedField('name')}
                  onBlur={() => handleBlur('name')}
                  maxLength={50}
                />
                <Text
                  className="absolute left-4 text-xs font-medium"
                  style={{
                    top: 8,
                    color: focusedField === 'name' ? '#006A6A' : '#9CA3AF',
                  }}
                >
                  Wallet Name
                </Text>
                <Text className="absolute right-4 text-xs font-medium" style={{ color: '#9CA3AF', top: 8 }}>
                  {formData.name.length}/50
                </Text>
              </View>
              {touched.name && errors.name && (
                <View className="flex-row items-center mt-2 ml-4">
                  <Info size={14} color="#DC2626" />
                  <Text className="text-xs ml-1.5" style={{ color: '#DC2626' }}>
                    {errors.name}
                  </Text>
                </View>
              )}
            </Animated.View>

            {/* Institution Selector */}
            <Animated.View entering={FadeInDown.delay(200).duration(600)} className="mb-6">
              <Pressable
                onPress={() => setShowInstitutionPicker(true)}
                className="relative rounded-3xl border-2"
                style={{
                  borderColor: formData.institution ? '#006A6A' : '#E5E7EB',
                  backgroundColor: '#FFFFFF',
                }}
              >
                <View className="px-4 pt-6 pb-4">
                  <Text className="text-base" style={{ color: formData.institution ? '#1F2937' : '#9CA3AF' }}>
                    {formData.institution || ' '}
                  </Text>
                </View>
                <Text
                  className="absolute left-4 text-xs font-medium"
                  style={{
                    top: 8,
                    color: '#9CA3AF',
                  }}
                >
                  Institution
                </Text>
                <View className="absolute right-4" style={{ top: 16 }}>
                  <ChevronDown size={20} color="#9CA3AF" />
                </View>
              </Pressable>
            </Animated.View>

            {/* Account Type Selector */}
            <Animated.View entering={FadeInDown.delay(300).duration(600)} className="mb-6">
              <Pressable
                onPress={() => setShowAccountTypePicker(true)}
                className="relative rounded-3xl border-2"
                style={{
                  borderColor: formData.accountType ? '#006A6A' : '#E5E7EB',
                  backgroundColor: '#FFFFFF',
                }}
              >
                <View className="px-4 pt-6 pb-4">
                  <Text className="text-base" style={{ color: formData.accountType ? '#1F2937' : '#9CA3AF' }}>
                    {formData.accountType || ' '}
                  </Text>
                </View>
                <Text
                  className="absolute left-4 text-xs font-medium"
                  style={{
                    top: 8,
                    color: '#9CA3AF',
                  }}
                >
                  Wallet Type
                </Text>
                <View className="absolute right-4" style={{ top: 16 }}>
                  <ChevronDown size={20} color="#9CA3AF" />
                </View>
              </Pressable>
            </Animated.View>

            {/* Current Balance */}
            <Animated.View entering={FadeInDown.delay(400).duration(600)} className="mb-6">
              <View className="relative">
                <Text
                  className="absolute left-4 text-xs font-medium"
                  style={{
                    top: 8,
                    color: focusedField === 'balance' ? '#006A6A' : '#9CA3AF',
                    zIndex: 1,
                  }}
                >
                  Current Balance
                </Text>
                <View className="flex-row items-center">
                  <Text className="absolute left-4 pt-6 text-base font-medium" style={{ color: '#9CA3AF', zIndex: 1 }}>
                    {account.currency}
                  </Text>
                  <TextInput
                    className="text-base pl-16 pr-4 pt-6 pb-4 rounded-3xl border-2 bg-white flex-1"
                    style={{
                      borderColor: focusedField === 'balance' ? '#006A6A' : '#E5E7EB',
                      color: '#1F2937',
                    }}
                    placeholder="e.g., 1,000"
                    placeholderTextColor="#D1D5DB"
                    value={formData.balance}
                    onChangeText={(text) => {
                      setFormData({ ...formData, balance: text });
                      setErrors({ ...errors, balance: undefined });
                    }}
                    onFocus={() => setFocusedField('balance')}
                    onBlur={() => handleBlur('balance')}
                    keyboardType="decimal-pad"
                  />
                </View>
              </View>
              {touched.balance && errors.balance && (
                <View className="flex-row items-center mt-2 ml-4">
                  <Info size={14} color="#DC2626" />
                  <Text className="text-xs ml-1.5" style={{ color: '#DC2626' }}>
                    {errors.balance}
                  </Text>
                </View>
              )}
            </Animated.View>

            {/* Card/Account Number (Optional) */}
            <Animated.View entering={FadeInDown.delay(500).duration(600)} className="mb-6">
              <View className="relative">
                <Text
                  className="absolute left-4 text-xs font-medium"
                  style={{
                    top: 8,
                    color: focusedField === 'last4Digits' ? '#006A6A' : '#9CA3AF',
                    zIndex: 1,
                  }}
                >
                  Last 4 Digits (Optional)
                </Text>
                <TextInput
                  className="text-base px-4 pt-6 pb-4 rounded-3xl border-2 bg-white"
                  style={{
                    borderColor: focusedField === 'last4Digits' ? '#006A6A' : '#E5E7EB',
                    color: '#1F2937',
                  }}
                  placeholder=" "
                  value={formData.last4Digits}
                  onChangeText={(text) => {
                    const cleaned = text.replace(/\D/g, '').slice(0, 4);
                    setFormData({ ...formData, last4Digits: cleaned });
                    setErrors({ ...errors, last4Digits: undefined });
                  }}
                  onFocus={() => setFocusedField('last4Digits')}
                  onBlur={() => handleBlur('last4Digits')}
                  keyboardType="number-pad"
                  maxLength={4}
                />
                <View className="absolute right-4" style={{ top: 8 }}>
                  <View
                    className="px-2 py-1 rounded-full"
                    style={{ backgroundColor: 'rgba(0, 106, 106, 0.1)' }}
                  >
                    <Text className="text-xs font-medium" style={{ color: '#006A6A' }}>
                      Optional
                    </Text>
                  </View>
                </View>
              </View>
              {touched.last4Digits && errors.last4Digits && (
                <View className="flex-row items-center mt-2 ml-4">
                  <Info size={14} color="#DC2626" />
                  <Text className="text-xs ml-1.5" style={{ color: '#DC2626' }}>
                    {errors.last4Digits}
                  </Text>
                </View>
              )}
            </Animated.View>

            {/* Default Wallet Switch */}
            {!account.isDefault && (
              <Animated.View entering={FadeInDown.delay(600).duration(600)} className="mb-8">
                <Pressable
                  onPress={() => setFormData({ ...formData, isDefault: !formData.isDefault })}
                  className="flex-row items-center py-3 px-4 rounded-2xl"
                  style={{ backgroundColor: 'rgba(0, 106, 106, 0.05)' }}
                >
                  <View
                    className="w-6 h-6 rounded-md border-2 mr-3 items-center justify-center"
                    style={{
                      borderColor: '#006A6A',
                      backgroundColor: formData.isDefault ? '#006A6A' : 'transparent',
                    }}
                  >
                    {formData.isDefault && (
                      <View className="w-3 h-3 bg-white rounded-sm" />
                    )}
                  </View>
                  <Text className="text-sm font-medium flex-1" style={{ color: '#006A6A' }}>
                    Set as default wallet
                  </Text>
                </Pressable>
              </Animated.View>
            )}

            {account.isDefault && (
              <Animated.View entering={FadeInDown.delay(600).duration(600)} className="mb-8">
                <View className="px-4 py-3 rounded-2xl" style={{ backgroundColor: 'rgba(0, 106, 106, 0.05)' }}>
                  <Text className="text-xs text-center" style={{ color: 'rgba(0, 106, 106, 0.7)' }}>
                    This is your default wallet
                  </Text>
                </View>
              </Animated.View>
            )}

            {/* Exclude from Budget Toggle */}
            <Animated.View entering={FadeInDown.delay(650).duration(600)} className="mb-8">
              <Pressable
                onPress={() => setFormData({ ...formData, isExcludedFromBudget: !formData.isExcludedFromBudget })}
                className="flex-row items-center justify-between py-3 px-4 rounded-2xl"
                style={{ backgroundColor: formData.isExcludedFromBudget ? 'rgba(239, 68, 68, 0.05)' : 'rgba(0, 106, 106, 0.05)' }}
              >
                <View className="flex-row items-center flex-1">
                  {formData.isExcludedFromBudget ? (
                    <EyeOff size={20} color="#DC2626" style={{ marginRight: 12 }} />
                  ) : (
                    <Eye size={20} color="#006A6A" style={{ marginRight: 12 }} />
                  )}
                  <View className="flex-1">
                    <Text className="text-sm font-medium" style={{ color: formData.isExcludedFromBudget ? '#DC2626' : '#006A6A' }}>
                      Exclude from Budget
                    </Text>
                    <Text className="text-xs mt-1" style={{ color: formData.isExcludedFromBudget ? '#DC2626' : '#6B7280' }}>
                      {formData.isExcludedFromBudget
                        ? 'This wallet will not affect your budget'
                        : 'Include this wallet in budget tracking'}
                    </Text>
                  </View>
                </View>
                <View
                  className="w-6 h-6 rounded-md border-2 items-center justify-center"
                  style={{
                    borderColor: formData.isExcludedFromBudget ? '#DC2626' : '#006A6A',
                    backgroundColor: formData.isExcludedFromBudget ? '#DC2626' : 'transparent',
                  }}
                >
                  {formData.isExcludedFromBudget && (
                    <View className="w-3 h-3 bg-white rounded-sm" />
                  )}
                </View>
              </Pressable>
            </Animated.View>
          </ScrollView>

          {/* Bottom Submit Button */}
          <View className="px-6 pb-6 pt-4 bg-white" style={{ borderTopWidth: 1, borderTopColor: '#E5E7EB' }}>
            <Animated.View entering={FadeInDown.delay(700).duration(600)}>
              <Pressable
                onPress={handleSubmit}
                disabled={!isValid || updateAccountMutation.isPending}
                className="rounded-full py-4 items-center justify-center"
                style={{
                  backgroundColor: isValid && !updateAccountMutation.isPending ? '#006A6A' : '#E5E7EB',
                  height: 56,
                  shadowColor: '#006A6A',
                  shadowOffset: { width: 0, height: 4 },
                  shadowOpacity: isValid ? 0.2 : 0,
                  shadowRadius: 12,
                  elevation: isValid ? 4 : 0,
                  opacity: isValid && !updateAccountMutation.isPending ? 1 : 0.4,
                }}
              >
                {updateAccountMutation.isPending ? (
                  <ActivityIndicator color="white" />
                ) : (
                  <Text className="text-base font-semibold" style={{ color: isValid ? 'white' : '#9CA3AF' }}>
                    Save Changes
                  </Text>
                )}
              </Pressable>
            </Animated.View>
          </View>
        </KeyboardAvoidingView>
      </View>
      </SafeAreaView>

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <View
          className="absolute inset-0 items-center justify-center"
          style={{ backgroundColor: 'rgba(0, 0, 0, 0.5)' }}
        >
          <View className="bg-white rounded-3xl mx-6 p-6" style={{ maxWidth: 320, width: '100%' }}>
            <Text className="text-xl font-bold text-center mb-2" style={{ color: '#1F2937' }}>
              Delete Wallet?
            </Text>
            <Text className="text-sm text-center mb-6" style={{ color: '#6B7280' }}>
              Are you sure you want to delete "{account.name}"? This action cannot be undone.
            </Text>
            <View className="flex-row gap-3">
              <Pressable
                onPress={() => setShowDeleteConfirm(false)}
                className="flex-1 py-3 rounded-full items-center"
                style={{ backgroundColor: '#F3F4F6' }}
              >
                <Text className="font-semibold" style={{ color: '#6B7280' }}>
                  Cancel
                </Text>
              </Pressable>
              <Pressable
                onPress={confirmDelete}
                className="flex-1 py-3 rounded-full items-center"
                style={{ backgroundColor: '#DC2626' }}
                disabled={deleteAccountMutation.isPending}
              >
                {deleteAccountMutation.isPending ? (
                  <ActivityIndicator color="white" size="small" />
                ) : (
                  <Text className="font-semibold text-white">Delete</Text>
                )}
              </Pressable>
            </View>
          </View>
        </View>
      )}

      {/* Bottom Sheet Pickers */}
      <InstitutionPicker
        visible={showInstitutionPicker}
        selectedInstitution={formData.institution}
        institutions={INSTITUTIONS}
        onSelect={(institution) => {
          setFormData({ ...formData, institution });
        }}
        onClose={() => setShowInstitutionPicker(false)}
      />

      <WalletTypePicker
        visible={showAccountTypePicker}
        selectedAccountType={formData.accountType}
        accountTypes={ACCOUNT_TYPES}
        onSelect={(accountType: AccountType) => {
          setFormData({ ...formData, accountType });
        }}
        onClose={() => setShowAccountTypePicker(false)}
      />
    </View>
  );
}
