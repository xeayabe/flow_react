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
  Modal,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { StatusBar } from 'expo-status-bar';
import { router, useLocalSearchParams } from 'expo-router';
import { Info, ChevronDown, Trash2, Eye, EyeOff, ArrowLeft, CheckCircle2, Lock } from 'lucide-react-native';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  getAccountById,
  updateAccount,
  deleteAccount,
  parseBalance,
  ACCOUNT_TYPES,
  type AccountType,
  type UpdateAccountData,
} from '@/lib/accounts-api';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { WalletTypePicker } from '@/components/AccountTypePicker';
import { GlassCard, GlassButton, GlassInputContainer } from '@/components/ui/Glass';
import { colors } from '@/lib/design-tokens';
import { getCurrencyConfig } from '@/constants/currencies';

interface FormData {
  name: string;
  accountType: AccountType | '';
  balance: string;
  last4Digits: string;
  isDefault: boolean;
  isExcludedFromBudget: boolean;
}

interface ValidationErrors {
  name?: string;
  accountType?: string;
  balance?: string;
  last4Digits?: string;
}

export default function EditWalletScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const queryClient = useQueryClient();
  const insets = useSafeAreaInsets();

  const [formData, setFormData] = useState<FormData>({
    name: '',
    accountType: '',
    balance: '',
    last4Digits: '',
    isDefault: false,
    isExcludedFromBudget: false,
  });

  const [errors, setErrors] = useState<ValidationErrors>({});
  const [touched, setTouched] = useState<Record<string, boolean>>({});
  const [focusedField, setFocusedField] = useState<string | null>(null);
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
    if (digits && digits.length !== 4) return 'Should be 4 digits';
    if (digits && !/^\d{4}$/.test(digits)) return 'Should be 4 digits';
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

    setTouched({
      name: true,
      balance: true,
      last4Digits: true,
    });

    const newErrors: ValidationErrors = {
      name: validateName(formData.name),
      balance: validateBalance(formData.balance),
      last4Digits: validateLast4Digits(formData.last4Digits),
    };

    setErrors(newErrors);

    if (Object.values(newErrors).some((error) => error !== undefined)) {
      return;
    }

    const parsedBalance = parseBalance(formData.balance);
    if (parsedBalance === null) {
      setErrors({ ...errors, balance: 'Please enter a valid number' });
      return;
    }

    const updateData: UpdateAccountData = {
      name: formData.name.trim(),
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
      <LinearGradient
        colors={[colors.contextDark, colors.contextTeal]}
        style={{ flex: 1 }}
      >
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" color="white" />
          <Text className="mt-4" style={{ color: colors.textWhiteSecondary }}>
            Loading wallet...
          </Text>
        </View>
      </LinearGradient>
    );
  }

  if (!account) {
    return (
      <LinearGradient
        colors={[colors.contextDark, colors.contextTeal]}
        style={{ flex: 1 }}
      >
        <View className="flex-1 items-center justify-center px-6">
          <Text className="text-lg font-semibold mb-2" style={{ color: colors.textWhite }}>
            Wallet not found
          </Text>
          <Pressable onPress={() => router.back()}>
            <Text style={{ color: colors.sageGreen }}>Go back</Text>
          </Pressable>
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
      <StatusBar style="light" />

      {/* Header */}
      <View
        className="flex-row items-center justify-between px-5 pb-4"
        style={{ paddingTop: insets.top + 16 }}
      >
        <Pressable
          onPress={() => router.back()}
          className="items-center justify-center rounded-xl mr-4"
          style={{
            width: 40,
            height: 40,
            backgroundColor: 'rgba(255,255,255,0.03)',
            borderWidth: 1,
            borderColor: 'rgba(255,255,255,0.05)',
          }}
        >
          <ArrowLeft size={20} color="rgba(255,255,255,0.9)" strokeWidth={2} />
        </Pressable>
        <Text className="text-white text-xl font-semibold flex-1">Edit Wallet</Text>
        <Pressable
          onPress={handleDelete}
          className="items-center justify-center rounded-xl"
          style={{
            width: 40,
            height: 40,
            backgroundColor: 'rgba(200,168,168,0.1)',
            borderWidth: 1,
            borderColor: 'rgba(200,168,168,0.15)',
          }}
        >
          <Trash2 size={18} color={colors.error} />
        </Pressable>
      </View>

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        className="flex-1"
      >
        <ScrollView
          className="flex-1"
          contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 24 }}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          <Animated.View entering={FadeInDown.delay(0).duration(400)}>
            <Text className="text-center mb-6" style={{ color: colors.textWhiteSecondary, fontSize: 14 }}>
              Update your wallet details
            </Text>
          </Animated.View>

          {/* Wallet Name */}
          <Animated.View entering={FadeInDown.delay(100).duration(400)} className="mb-5">
            <Text className="text-xs font-medium mb-2" style={{ color: colors.textWhiteDisabled, textTransform: 'uppercase', letterSpacing: 0.8 }}>
              Wallet Name
            </Text>
            <GlassInputContainer focused={focusedField === 'name'}>
              <View className="flex-row items-center justify-between">
                <TextInput
                  className="flex-1 text-base"
                  style={{ color: colors.textWhite }}
                  placeholder="e.g., My Checking, Savings"
                  placeholderTextColor={colors.textWhiteDisabled}
                  value={formData.name}
                  onChangeText={(text) => {
                    setFormData({ ...formData, name: text });
                    setErrors({ ...errors, name: undefined });
                  }}
                  onFocus={() => setFocusedField('name')}
                  onBlur={() => handleBlur('name')}
                  maxLength={50}
                />
                <Text className="text-xs ml-2" style={{ color: colors.textWhiteDisabled }}>
                  {formData.name.length}/50
                </Text>
              </View>
            </GlassInputContainer>
            {touched.name && errors.name && (
              <View className="flex-row items-center mt-2 ml-1">
                <Info size={12} color={colors.warning} />
                <Text className="text-xs ml-1.5" style={{ color: colors.warning }}>
                  {errors.name}
                </Text>
              </View>
            )}
          </Animated.View>

          {/* Account Type Selector */}
          <Animated.View entering={FadeInDown.delay(150).duration(400)} className="mb-5">
            <Text className="text-xs font-medium mb-2" style={{ color: colors.textWhiteDisabled, textTransform: 'uppercase', letterSpacing: 0.8 }}>
              Wallet Type
            </Text>
            <Pressable onPress={() => setShowAccountTypePicker(true)}>
              <GlassInputContainer focused={!!formData.accountType}>
                <View className="flex-row items-center justify-between">
                  <Text
                    className="text-base flex-1"
                    style={{ color: formData.accountType ? colors.textWhite : colors.textWhiteDisabled }}
                  >
                    {formData.accountType || 'Select wallet type'}
                  </Text>
                  <ChevronDown size={18} color={colors.textWhiteDisabled} />
                </View>
              </GlassInputContainer>
            </Pressable>
          </Animated.View>

          {/* Currency (Read-only — locked after wallet creation) */}
          <Animated.View entering={FadeInDown.delay(200).duration(400)} className="mb-5">
            <Text className="text-xs font-medium mb-2" style={{ color: colors.textWhiteDisabled, textTransform: 'uppercase', letterSpacing: 0.8 }}>
              Currency
            </Text>
            <GlassInputContainer>
              <View className="flex-row items-center justify-between">
                <Text className="text-base" style={{ color: colors.textWhiteSecondary }}>
                  {account.currency} — {getCurrencyConfig(account.currency).displayName}
                </Text>
                <Lock size={16} color={colors.textWhiteDisabled} />
              </View>
            </GlassInputContainer>
            <Text className="text-xs mt-1.5 ml-1" style={{ color: colors.textWhiteDisabled }}>
              Currency cannot be changed after wallet creation
            </Text>
          </Animated.View>

          {/* Current Balance */}
          <Animated.View entering={FadeInDown.delay(250).duration(400)} className="mb-5">
            <Text className="text-xs font-medium mb-2" style={{ color: colors.textWhiteDisabled, textTransform: 'uppercase', letterSpacing: 0.8 }}>
              Current Balance
            </Text>
            <GlassInputContainer focused={focusedField === 'balance'}>
              <View className="flex-row items-center">
                <Text className="text-base font-medium mr-3" style={{ color: colors.textWhiteDisabled }}>
                  {account.currency}
                </Text>
                <TextInput
                  className="flex-1 text-base"
                  style={{ color: colors.textWhite }}
                  placeholder="0.00"
                  placeholderTextColor={colors.textWhiteDisabled}
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
            </GlassInputContainer>
            {touched.balance && errors.balance && (
              <View className="flex-row items-center mt-2 ml-1">
                <Info size={12} color={colors.warning} />
                <Text className="text-xs ml-1.5" style={{ color: colors.warning }}>
                  {errors.balance}
                </Text>
              </View>
            )}
          </Animated.View>

          {/* Last 4 Digits */}
          <Animated.View entering={FadeInDown.delay(300).duration(400)} className="mb-5">
            <View className="flex-row items-center justify-between mb-2">
              <Text className="text-xs font-medium" style={{ color: colors.textWhiteDisabled, textTransform: 'uppercase', letterSpacing: 0.8 }}>
                Last 4 Digits
              </Text>
              <View className="px-2 py-0.5 rounded-full" style={{ backgroundColor: 'rgba(44, 95, 93, 0.3)' }}>
                <Text className="text-xs" style={{ color: colors.sageGreen }}>Optional</Text>
              </View>
            </View>
            <GlassInputContainer focused={focusedField === 'last4Digits'}>
              <TextInput
                className="text-base"
                style={{ color: colors.textWhite }}
                placeholder="e.g., 1234"
                placeholderTextColor={colors.textWhiteDisabled}
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
            </GlassInputContainer>
            {touched.last4Digits && errors.last4Digits && (
              <View className="flex-row items-center mt-2 ml-1">
                <Info size={12} color={colors.warning} />
                <Text className="text-xs ml-1.5" style={{ color: colors.warning }}>
                  {errors.last4Digits}
                </Text>
              </View>
            )}
          </Animated.View>

          {/* Default Wallet Toggle */}
          <Animated.View entering={FadeInDown.delay(350).duration(400)} className="mb-5">
            {!account.isDefault ? (
              <Pressable
                onPress={() => setFormData({ ...formData, isDefault: !formData.isDefault })}
              >
                <GlassCard className="p-4">
                  <View className="flex-row items-center">
                    <View
                      className="w-6 h-6 rounded-md border-2 mr-3 items-center justify-center"
                      style={{
                        borderColor: formData.isDefault ? colors.sageGreen : colors.textWhiteDisabled,
                        backgroundColor: formData.isDefault ? colors.contextTeal : 'transparent',
                      }}
                    >
                      {formData.isDefault && <CheckCircle2 size={14} color={colors.sageGreen} />}
                    </View>
                    <Text className="text-sm font-medium" style={{ color: colors.textWhite }}>
                      Set as default wallet
                    </Text>
                  </View>
                </GlassCard>
              </Pressable>
            ) : (
              <GlassCard className="p-4">
                <Text className="text-xs text-center" style={{ color: colors.textWhiteSecondary }}>
                  This is your default wallet
                </Text>
              </GlassCard>
            )}
          </Animated.View>

          {/* Exclude from Budget Toggle */}
          <Animated.View entering={FadeInDown.delay(400).duration(400)} className="mb-8">
            <Pressable
              onPress={() => setFormData({ ...formData, isExcludedFromBudget: !formData.isExcludedFromBudget })}
            >
              <GlassCard
                className="p-4"
                style={formData.isExcludedFromBudget ? { borderColor: 'rgba(200, 168, 168, 0.3)', borderWidth: 1 } : undefined}
              >
                <View className="flex-row items-center">
                  <View className="mr-3">
                    {formData.isExcludedFromBudget ? (
                      <EyeOff size={20} color={colors.error} />
                    ) : (
                      <Eye size={20} color={colors.sageGreen} />
                    )}
                  </View>
                  <View className="flex-1">
                    <Text className="text-sm font-medium" style={{ color: colors.textWhite }}>
                      Exclude from Budget
                    </Text>
                    <Text className="text-xs mt-1" style={{ color: colors.textWhiteDisabled }}>
                      {formData.isExcludedFromBudget
                        ? 'This wallet will not affect your budget'
                        : 'Include this wallet in budget tracking'}
                    </Text>
                  </View>
                  <View
                    className="w-6 h-6 rounded-md border-2 items-center justify-center"
                    style={{
                      borderColor: formData.isExcludedFromBudget ? colors.error : colors.textWhiteDisabled,
                      backgroundColor: formData.isExcludedFromBudget ? 'rgba(200, 168, 168, 0.3)' : 'transparent',
                    }}
                  >
                    {formData.isExcludedFromBudget && (
                      <View className="w-3 h-3 bg-white rounded-sm" />
                    )}
                  </View>
                </View>
              </GlassCard>
            </Pressable>
          </Animated.View>

          {/* Submit Button */}
          <Animated.View entering={FadeInDown.delay(450).duration(400)} className="gap-3">
            <GlassButton
              variant="primary"
              onPress={handleSubmit}
              disabled={!isValid || updateAccountMutation.isPending}
              style={{
                opacity: isValid && !updateAccountMutation.isPending ? 1 : 0.4,
                height: 56,
              }}
              className="items-center justify-center"
            >
              {updateAccountMutation.isPending ? (
                <ActivityIndicator color="white" />
              ) : (
                <Text className="text-base font-semibold text-center" style={{ color: 'white' }}>
                  Save Changes
                </Text>
              )}
            </GlassButton>
          </Animated.View>

          {/* Bottom padding */}
          <View className="h-10" />
        </ScrollView>
      </KeyboardAvoidingView>

      {/* Delete Confirmation Modal */}
      <Modal visible={showDeleteConfirm} transparent animationType="fade">
        <View className="flex-1 items-center justify-center" style={{ backgroundColor: 'rgba(0, 0, 0, 0.6)' }}>
          <View
            className="mx-6 p-6 rounded-2xl"
            style={{
              backgroundColor: colors.contextDark,
              borderWidth: 1,
              borderColor: 'rgba(255, 255, 255, 0.1)',
              maxWidth: 320,
              width: '100%',
            }}
          >
            <View className="items-center mb-4">
              <View
                className="w-12 h-12 rounded-full items-center justify-center mb-3"
                style={{ backgroundColor: 'rgba(200, 168, 168, 0.2)' }}
              >
                <Trash2 size={24} color={colors.error} />
              </View>
              <Text className="text-lg font-semibold text-center mb-1" style={{ color: colors.textWhite }}>
                Delete Wallet?
              </Text>
              <Text className="text-sm text-center" style={{ color: colors.textWhiteSecondary }}>
                Are you sure you want to delete "{account.name}"? This action cannot be undone.
              </Text>
            </View>

            <View className="gap-3">
              <GlassButton
                variant="secondary"
                onPress={() => setShowDeleteConfirm(false)}
                className="items-center justify-center py-3"
              >
                <Text className="font-semibold" style={{ color: colors.textWhite }}>Cancel</Text>
              </GlassButton>

              <Pressable
                onPress={confirmDelete}
                disabled={deleteAccountMutation.isPending}
                className="py-3 rounded-xl items-center justify-center"
                style={{ backgroundColor: 'rgba(200, 168, 168, 0.3)' }}
              >
                {deleteAccountMutation.isPending ? (
                  <ActivityIndicator color="white" size="small" />
                ) : (
                  <Text className="font-semibold" style={{ color: colors.error }}>Delete</Text>
                )}
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>

      {/* Bottom Sheet Picker */}
      <WalletTypePicker
        visible={showAccountTypePicker}
        selectedAccountType={formData.accountType}
        accountTypes={ACCOUNT_TYPES}
        onSelect={(accountType: AccountType) => {
          setFormData({ ...formData, accountType });
        }}
        onClose={() => setShowAccountTypePicker(false)}
      />
    </LinearGradient>
  );
}
