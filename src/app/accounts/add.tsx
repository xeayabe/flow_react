import React, { useState } from 'react';
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
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { router } from 'expo-router';
import { ArrowLeft, Info, CheckCircle2, ChevronDown } from 'lucide-react-native';
import { useMutation } from '@tanstack/react-query';
import {
  createAccount,
  checkAccountNameExists,
  getUserAccountsCount,
  parseBalance,
  INSTITUTIONS,
  ACCOUNT_TYPES,
  type Institution,
  type AccountType,
  type CreateAccountData,
} from '@/lib/accounts-api';
import { db } from '@/lib/db';
import Animated, { FadeInDown } from 'react-native-reanimated';

interface FormData {
  name: string;
  institution: Institution | '';
  accountType: AccountType | '';
  startingBalance: string;
  last4Digits: string;
  isDefault: boolean;
}

interface ValidationErrors {
  name?: string;
  institution?: string;
  accountType?: string;
  startingBalance?: string;
  last4Digits?: string;
}

export default function AddAccountScreen() {
  const { user } = db.useAuth();
  const [formData, setFormData] = useState<FormData>({
    name: '',
    institution: '',
    accountType: '',
    startingBalance: '',
    last4Digits: '',
    isDefault: false,
  });

  const [errors, setErrors] = useState<ValidationErrors>({});
  const [touched, setTouched] = useState<Record<string, boolean>>({});
  const [focusedField, setFocusedField] = useState<string | null>(null);
  const [showInstitutionPicker, setShowInstitutionPicker] = useState<boolean>(false);
  const [showAccountTypePicker, setShowAccountTypePicker] = useState<boolean>(false);
  const [isFirstAccount, setIsFirstAccount] = useState<boolean>(false);

  // Check if this is user's first account
  React.useEffect(() => {
    checkIfFirstAccount();
  }, [user]);

  const checkIfFirstAccount = async () => {
    if (!user?.email) return;

    // Get user's household info first
    const result = await db.queryOnce({
      users: {
        $: {
          where: {
            email: user.email.toLowerCase(),
          },
        },
      },
    });

    const userData = result.data.users?.[0];
    if (!userData) return;

    const count = await getUserAccountsCount(userData.id);
    const isFirst = count === 0;
    setIsFirstAccount(isFirst);

    // If first account, set isDefault to true
    if (isFirst) {
      setFormData((prev) => ({ ...prev, isDefault: true }));
    }
  };

  const createAccountMutation = useMutation({
    mutationFn: async (data: CreateAccountData) => {
      if (!user?.email) throw new Error('User not authenticated');
      return createAccount(user.email, data);
    },
    onSuccess: (response) => {
      if (response.success) {
        router.replace('/accounts');
      } else {
        setErrors({ name: response.error });
      }
    },
    onError: () => {
      setErrors({ name: 'Something went wrong. Please try again' });
    },
  });

  const validateName = (name: string): string | undefined => {
    if (!name.trim()) return 'Please enter an account name';
    if (name.trim().length < 2) return 'Minimum 2 characters';
    if (name.length > 50) return 'Maximum 50 characters';
    return undefined;
  };

  const validateInstitution = (institution: string): string | undefined => {
    if (!institution) return 'Please select an institution';
    return undefined;
  };

  const validateAccountType = (accountType: string): string | undefined => {
    if (!accountType) return 'Please select an account type';
    return undefined;
  };

  const validateStartingBalance = (balance: string): string | undefined => {
    if (!balance.trim()) return 'Please enter a starting balance';
    const parsed = parseBalance(balance);
    if (parsed === null) return 'Please enter a valid number';
    return undefined;
  };

  const validateLast4Digits = (digits: string): string | undefined => {
    if (digits && digits.length !== 4) return 'Account number should be 4 digits';
    if (digits && !/^\d{4}$/.test(digits)) return 'Account number should be 4 digits';
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
      case 'institution':
        error = validateInstitution(formData.institution);
        break;
      case 'accountType':
        error = validateAccountType(formData.accountType);
        break;
      case 'startingBalance':
        error = validateStartingBalance(formData.startingBalance);
        break;
      case 'last4Digits':
        error = validateLast4Digits(formData.last4Digits);
        break;
    }

    setErrors({ ...errors, [field]: error });
  };

  const handleSubmit = async () => {
    Keyboard.dismiss();

    // Mark all fields as touched
    setTouched({
      name: true,
      institution: true,
      accountType: true,
      startingBalance: true,
      last4Digits: true,
    });

    // Validate all fields
    const newErrors: ValidationErrors = {
      name: validateName(formData.name),
      institution: validateInstitution(formData.institution),
      accountType: validateAccountType(formData.accountType),
      startingBalance: validateStartingBalance(formData.startingBalance),
      last4Digits: validateLast4Digits(formData.last4Digits),
    };

    setErrors(newErrors);

    // Check if any errors
    if (Object.values(newErrors).some((error) => error !== undefined)) {
      return;
    }

    // Parse balance
    const parsedBalance = parseBalance(formData.startingBalance);
    if (parsedBalance === null) {
      setErrors({ ...errors, startingBalance: 'Please enter a valid number' });
      return;
    }

    // Submit
    const accountData: CreateAccountData = {
      name: formData.name.trim(),
      institution: formData.institution as Institution,
      accountType: formData.accountType as AccountType,
      startingBalance: parsedBalance,
      last4Digits: formData.last4Digits || undefined,
      isDefault: formData.isDefault,
    };

    createAccountMutation.mutate(accountData);
  };

  const isValid =
    !validateName(formData.name) &&
    !validateInstitution(formData.institution) &&
    !validateAccountType(formData.accountType) &&
    !validateStartingBalance(formData.startingBalance) &&
    !validateLast4Digits(formData.last4Digits);

  return (
    <View className="flex-1 bg-white">
      <StatusBar style="dark" />
      <SafeAreaView className="flex-1" edges={['top']}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          className="flex-1"
        >
          <ScrollView
            className="flex-1"
            contentContainerStyle={{ paddingHorizontal: 24, paddingTop: 16 }}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
            {/* Header */}
            <View className="flex-row items-center mb-8">
              <Pressable onPress={() => router.back()} className="mr-4">
                <ArrowLeft size={24} color="#006A6A" />
              </Pressable>
              <View className="flex-1">
                <Text className="text-2xl font-semibold" style={{ color: '#006A6A' }}>
                  Add Account
                </Text>
                <Text className="text-sm mt-1" style={{ color: '#8B9D8B' }}>
                  Track your finances across multiple accounts
                </Text>
              </View>
            </View>

            {/* Account Name */}
            <Animated.View entering={FadeInDown.delay(100).duration(600)} className="mb-4">
              <View className="relative rounded-3xl" style={{ overflow: 'hidden' }}>
                <TextInput
                  className="text-base px-4 pt-6 pb-4 rounded-3xl border-2 bg-white"
                  style={{
                    borderColor: focusedField === 'name' ? '#006A6A' : '#E5E7EB',
                    color: '#1F2937',
                  }}
                  placeholder=" "
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
                    top: 10,
                    color: focusedField === 'name' ? '#006A6A' : '#9CA3AF',
                  }}
                >
                  Account Name
                </Text>
                {touched.name && !errors.name && formData.name.length >= 2 && (
                  <View className="absolute right-4" style={{ top: 20 }}>
                    <CheckCircle2 size={20} color="#8B9D8B" />
                  </View>
                )}
              </View>
              {touched.name && errors.name && (
                <View className="flex-row items-center mt-2 ml-4">
                  <Info size={14} color="#006A6A" />
                  <Text className="text-xs ml-1.5" style={{ color: '#006A6A' }}>
                    {errors.name}
                  </Text>
                </View>
              )}
            </Animated.View>

            {/* Institution Picker */}
            <Animated.View entering={FadeInDown.delay(200).duration(600)} className="mb-4">
              <Pressable
                onPress={() => setShowInstitutionPicker(!showInstitutionPicker)}
                className="relative rounded-3xl border-2"
                style={{
                  borderColor: focusedField === 'institution' ? '#006A6A' : '#E5E7EB',
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
                    top: 10,
                    color: '#9CA3AF',
                  }}
                >
                  Institution
                </Text>
                <View className="absolute right-4" style={{ top: 20 }}>
                  <ChevronDown size={20} color="#9CA3AF" />
                </View>
              </Pressable>

              {showInstitutionPicker && (
                <View className="mt-2 rounded-2xl border" style={{ borderColor: '#E5E7EB', backgroundColor: '#F9FAFB' }}>
                  {INSTITUTIONS.map((institution) => (
                    <Pressable
                      key={institution}
                      onPress={() => {
                        setFormData({ ...formData, institution });
                        setShowInstitutionPicker(false);
                        setErrors({ ...errors, institution: undefined });
                      }}
                      className="px-4 py-3 border-b"
                      style={{ borderBottomColor: '#E5E7EB' }}
                    >
                      <Text className="text-base" style={{ color: '#1F2937' }}>
                        {institution}
                      </Text>
                    </Pressable>
                  ))}
                </View>
              )}

              {touched.institution && errors.institution && (
                <View className="flex-row items-center mt-2 ml-4">
                  <Info size={14} color="#006A6A" />
                  <Text className="text-xs ml-1.5" style={{ color: '#006A6A' }}>
                    {errors.institution}
                  </Text>
                </View>
              )}
            </Animated.View>

            {/* Account Type Picker */}
            <Animated.View entering={FadeInDown.delay(300).duration(600)} className="mb-4">
              <Pressable
                onPress={() => setShowAccountTypePicker(!showAccountTypePicker)}
                className="relative rounded-3xl border-2"
                style={{
                  borderColor: focusedField === 'accountType' ? '#006A6A' : '#E5E7EB',
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
                    top: 10,
                    color: '#9CA3AF',
                  }}
                >
                  Account Type
                </Text>
                <View className="absolute right-4" style={{ top: 20 }}>
                  <ChevronDown size={20} color="#9CA3AF" />
                </View>
              </Pressable>

              {showAccountTypePicker && (
                <View className="mt-2 rounded-2xl border" style={{ borderColor: '#E5E7EB', backgroundColor: '#F9FAFB' }}>
                  {ACCOUNT_TYPES.map((accountType) => (
                    <Pressable
                      key={accountType}
                      onPress={() => {
                        setFormData({ ...formData, accountType });
                        setShowAccountTypePicker(false);
                        setErrors({ ...errors, accountType: undefined });
                      }}
                      className="px-4 py-3 border-b"
                      style={{ borderBottomColor: '#E5E7EB' }}
                    >
                      <Text className="text-base" style={{ color: '#1F2937' }}>
                        {accountType}
                      </Text>
                    </Pressable>
                  ))}
                </View>
              )}

              {touched.accountType && errors.accountType && (
                <View className="flex-row items-center mt-2 ml-4">
                  <Info size={14} color="#006A6A" />
                  <Text className="text-xs ml-1.5" style={{ color: '#006A6A' }}>
                    {errors.accountType}
                  </Text>
                </View>
              )}
            </Animated.View>

            {/* Starting Balance */}
            <Animated.View entering={FadeInDown.delay(400).duration(600)} className="mb-4">
              <View className="relative rounded-3xl" style={{ overflow: 'hidden' }}>
                <TextInput
                  className="text-base px-4 pt-6 pb-4 rounded-3xl border-2 bg-white"
                  style={{
                    borderColor: focusedField === 'startingBalance' ? '#006A6A' : '#E5E7EB',
                    color: '#1F2937',
                  }}
                  placeholder=" "
                  value={formData.startingBalance}
                  onChangeText={(text) => {
                    setFormData({ ...formData, startingBalance: text });
                    setErrors({ ...errors, startingBalance: undefined });
                  }}
                  onFocus={() => setFocusedField('startingBalance')}
                  onBlur={() => handleBlur('startingBalance')}
                  keyboardType="numeric"
                />
                <Text
                  className="absolute left-4 text-xs font-medium"
                  style={{
                    top: 10,
                    color: focusedField === 'startingBalance' ? '#006A6A' : '#9CA3AF',
                  }}
                >
                  Starting Balance (CHF)
                </Text>
              </View>
              {!touched.startingBalance && !errors.startingBalance && (
                <Text className="text-xs mt-2 ml-4" style={{ color: '#C4B5FD' }}>
                  Can be positive or negative
                </Text>
              )}
              {touched.startingBalance && errors.startingBalance && (
                <View className="flex-row items-center mt-2 ml-4">
                  <Info size={14} color="#006A6A" />
                  <Text className="text-xs ml-1.5" style={{ color: '#006A6A' }}>
                    {errors.startingBalance}
                  </Text>
                </View>
              )}
            </Animated.View>

            {/* Last 4 Digits (Optional) */}
            <Animated.View entering={FadeInDown.delay(500).duration(600)} className="mb-4">
              <View className="relative rounded-3xl" style={{ overflow: 'hidden' }}>
                <TextInput
                  className="text-base px-4 pt-6 pb-4 rounded-3xl border-2 bg-white"
                  style={{
                    borderColor: focusedField === 'last4Digits' ? '#006A6A' : '#E5E7EB',
                    color: '#1F2937',
                  }}
                  placeholder=" "
                  value={formData.last4Digits}
                  onChangeText={(text) => {
                    // Only allow numbers, max 4 digits
                    const cleaned = text.replace(/\D/g, '').slice(0, 4);
                    setFormData({ ...formData, last4Digits: cleaned });
                    setErrors({ ...errors, last4Digits: undefined });
                  }}
                  onFocus={() => setFocusedField('last4Digits')}
                  onBlur={() => handleBlur('last4Digits')}
                  keyboardType="number-pad"
                  maxLength={4}
                />
                <Text
                  className="absolute left-4 text-xs font-medium"
                  style={{
                    top: 10,
                    color: focusedField === 'last4Digits' ? '#006A6A' : '#9CA3AF',
                  }}
                >
                  Account Number (Optional)
                </Text>
              </View>
              {!touched.last4Digits && !errors.last4Digits && (
                <Text className="text-xs mt-2 ml-4" style={{ color: '#C4B5FD' }}>
                  Last 4 digits only
                </Text>
              )}
              {touched.last4Digits && errors.last4Digits && (
                <View className="flex-row items-center mt-2 ml-4">
                  <Info size={14} color="#006A6A" />
                  <Text className="text-xs ml-1.5" style={{ color: '#006A6A' }}>
                    {errors.last4Digits}
                  </Text>
                </View>
              )}
            </Animated.View>

            {/* Set as Default Checkbox */}
            {!isFirstAccount && (
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
                    {formData.isDefault && <CheckCircle2 size={16} color="white" />}
                  </View>
                  <Text className="text-sm font-medium flex-1" style={{ color: '#006A6A' }}>
                    Set as default account
                  </Text>
                </Pressable>
              </Animated.View>
            )}

            {isFirstAccount && (
              <Animated.View entering={FadeInDown.delay(600).duration(600)} className="mb-8">
                <View className="px-4 py-3 rounded-2xl" style={{ backgroundColor: 'rgba(0, 106, 106, 0.05)' }}>
                  <Text className="text-xs text-center" style={{ color: 'rgba(0, 106, 106, 0.7)' }}>
                    This will be your default account
                  </Text>
                </View>
              </Animated.View>
            )}
          </ScrollView>

          {/* Bottom Buttons */}
          <View className="px-6 pb-6 pt-4 bg-white border-t" style={{ borderTopColor: '#E5E7EB' }}>
            <Animated.View entering={FadeInDown.delay(700).duration(600)}>
              <Pressable
                onPress={handleSubmit}
                disabled={!isValid || createAccountMutation.isPending}
                className="rounded-full py-4 items-center justify-center mb-3"
                style={{
                  backgroundColor: isValid && !createAccountMutation.isPending ? '#006A6A' : '#E5E7EB',
                  height: 56,
                  shadowColor: '#006A6A',
                  shadowOffset: { width: 0, height: 4 },
                  shadowOpacity: isValid ? 0.2 : 0,
                  shadowRadius: 12,
                  elevation: isValid ? 4 : 0,
                  opacity: isValid && !createAccountMutation.isPending ? 1 : 0.4,
                }}
              >
                {createAccountMutation.isPending ? (
                  <ActivityIndicator color="white" />
                ) : (
                  <Text className="text-base font-semibold" style={{ color: isValid ? 'white' : '#9CA3AF' }}>
                    Add Account
                  </Text>
                )}
              </Pressable>

              <Pressable onPress={() => router.back()} className="py-3 items-center">
                <Text className="text-sm font-medium" style={{ color: '#6B7280' }}>
                  Cancel
                </Text>
              </Pressable>
            </Animated.View>
          </View>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </View>
  );
}
