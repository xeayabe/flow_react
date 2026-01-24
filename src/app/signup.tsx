import React, { useState } from 'react';
import { View, Text, TextInput, Pressable, ScrollView, KeyboardAvoidingView, Platform, ActivityIndicator, Keyboard, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { router, useLocalSearchParams } from 'expo-router';
import { CheckCircle2, ArrowLeft, Info } from 'lucide-react-native';
import { useMutation, useQuery } from '@tanstack/react-query';
import { sendMagicCode, verifyMagicCode, createUserProfile, checkUserProfile } from '@/lib/auth-api';
import { getInviteCodePreview, acceptInviteCode } from '@/lib/invites-api';
import Animated, { FadeInDown } from 'react-native-reanimated';
import SuccessModal from '@/components/SuccessModal';

type Step = 'details' | 'verify';

interface FormData {
  email: string;
  name: string;
  code: string;
}

interface ValidationErrors {
  email?: string;
  name?: string;
  code?: string;
}

export default function SignupScreen() {
  const { invite: inviteToken } = useLocalSearchParams<{ invite?: string }>();

  console.log('SignupScreen mounted with inviteToken:', inviteToken);

  const [step, setStep] = useState<Step>('details');
  const [formData, setFormData] = useState<FormData>({
    email: '',
    name: '',
    code: '',
  });

  const [errors, setErrors] = useState<ValidationErrors>({});
  const [touched, setTouched] = useState<Record<string, boolean>>({});
  const [focusedField, setFocusedField] = useState<string | null>(null);
  const [showSuccessModal, setShowSuccessModal] = useState<boolean>(false);
  const [resendCooldown, setResendCooldown] = useState<number>(0);

  // Fetch invite preview if token exists
  const { data: invitePreview } = useQuery({
    queryKey: ['invite-preview', inviteToken],
    queryFn: () => getInviteCodePreview(inviteToken!),
    enabled: !!inviteToken,
  });

  // Cooldown timer for resend
  React.useEffect(() => {
    if (resendCooldown > 0) {
      const timer = setTimeout(() => {
        setResendCooldown(resendCooldown - 1);
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [resendCooldown]);

  const sendCodeMutation = useMutation({
    mutationFn: () => sendMagicCode(formData.email),
    onSuccess: (response) => {
      if (response.success) {
        setStep('verify');
        setResendCooldown(60); // Start 60-second cooldown
      } else {
        setErrors({ email: response.error });
      }
    },
    onError: () => {
      setErrors({ email: 'Something went wrong. Please try again' });
    },
  });

  const verifyCodeMutation = useMutation({
    mutationFn: () => verifyMagicCode(formData.email, formData.code),
    onSuccess: async (response) => {
      if (response.success) {
        console.log('=== SIGNUP FLOW START ===');
        console.log('Email:', formData.email);
        console.log('Name:', formData.name);
        console.log('Has inviteToken:', !!inviteToken);
        console.log('InviteToken value:', inviteToken);

        // Check if profile exists, if not create it
        const profileCheck = await checkUserProfile(formData.email);
        console.log('Profile check result:', profileCheck);

        let userId: string;
        if (!profileCheck.exists) {
          // Create profile with user-provided name
          console.log('Step 1: Creating user profile...');
          await createUserProfile(formData.email, formData.name);
          const updatedCheck = await checkUserProfile(formData.email);
          userId = updatedCheck.profile!.id;
          console.log('User profile created with ID:', userId);
        } else {
          userId = profileCheck.profile!.id;
          console.log('User profile already exists with ID:', userId);
        }

        // Accept invite if token exists
        if (inviteToken && inviteToken.trim() !== '') {
          try {
            console.log('Step 2a: User has invite code, accepting invite...');
            console.log('Calling acceptInviteCode with code:', inviteToken, 'userId:', userId);

            await acceptInviteCode(inviteToken, userId);

            console.log('Invite accepted successfully!');
            console.log('User should have role: member');

            Alert.alert('Success!', "You've joined the household!");
          } catch (error) {
            console.error('Failed to accept invite:', error);
            // Don't block signup if invite fails
          }
        } else {
          console.log('Step 2b: No invite code, household already created during signup');
          console.log('User should have role: admin (created by createUserProfile)');
        }

        console.log('=== SIGNUP FLOW COMPLETE ===');
        // Show success modal instead of navigating immediately
        setShowSuccessModal(true);
      } else {
        setErrors({ code: response.error });
      }
    },
    onError: () => {
      console.error('=== SIGNUP ERROR ===');
      setErrors({ code: 'Something went wrong. Please try again' });
    },
  });

  const validateEmail = (email: string): string | undefined => {
    if (!email) return 'Email is required';
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) return 'Please enter a valid email address';
    return undefined;
  };

  const validateName = (name: string): string | undefined => {
    if (!name) return 'Name is required';
    if (name.length < 2) return 'Name must be at least 2 characters';
    return undefined;
  };

  const validateCode = (code: string): string | undefined => {
    if (!code) return 'Verification code is required';
    if (code.length < 6) return 'Enter the 6-digit code';
    return undefined;
  };

  const validateDetailsForm = (): boolean => {
    const newErrors: ValidationErrors = {
      email: validateEmail(formData.email),
      name: validateName(formData.name),
    };

    setErrors(newErrors);
    return !Object.values(newErrors).some((error) => error !== undefined);
  };

  const handleBlur = (field: keyof FormData) => {
    setTouched({ ...touched, [field]: true });
    setFocusedField(null);

    let error: string | undefined;
    switch (field) {
      case 'email':
        error = validateEmail(formData.email);
        break;
      case 'name':
        error = validateName(formData.name);
        break;
      case 'code':
        error = validateCode(formData.code);
        break;
    }

    setErrors({ ...errors, [field]: error });
  };

  const handleCreateAccount = async () => {
    Keyboard.dismiss();

    // Check if user already exists
    const profileCheck = await checkUserProfile(formData.email);
    if (profileCheck.exists) {
      setErrors({ email: 'This email is already registered. Please log in instead.' });
      return;
    }

    setTouched({
      email: true,
      name: true,
    });

    if (validateDetailsForm()) {
      sendCodeMutation.mutate();
    }
  };

  const handleVerifyCode = () => {
    setTouched({ ...touched, code: true });

    const codeError = validateCode(formData.code);
    if (codeError) {
      setErrors({ code: codeError });
      return;
    }

    verifyCodeMutation.mutate();
  };

  const isDetailsValid =
    !validateEmail(formData.email) &&
    !validateName(formData.name);

  const isCodeValid = !validateCode(formData.code);
  const isEmailValid = !validateEmail(formData.email);
  const isNameValid = !validateName(formData.name);

  // Verification screen
  if (step === 'verify') {
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
              contentContainerStyle={{ paddingHorizontal: 24, paddingTop: 16, paddingBottom: 24 }}
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
            >
              {/* Back button */}
              <Pressable onPress={() => setStep('details')} className="mb-8">
                <ArrowLeft size={24} color="#006A6A" />
              </Pressable>

              {/* Header */}
              <Animated.View entering={FadeInDown.duration(600)}>
                <Text className="text-2xl font-semibold mb-2" style={{ color: '#006A6A' }}>
                  Verify Your Email
                </Text>
                <Text className="text-sm mb-8" style={{ color: '#8B9D8B' }}>
                  We sent a verification code to{'\n'}
                  <Text className="font-semibold">{formData.email}</Text>
                </Text>
              </Animated.View>

              {/* Code Input */}
              <Animated.View entering={FadeInDown.delay(200).duration(600)}>
                <View className="mb-6">
                  <TextInput
                    className="text-3xl text-center tracking-widest py-6 px-4 rounded-3xl border-2"
                    style={{
                      borderColor: focusedField === 'code' ? '#006A6A' : '#E5E7EB',
                      color: '#006A6A',
                    }}
                    placeholder="000000"
                    placeholderTextColor="#D1D5DB"
                    value={formData.code}
                    onChangeText={(text) => {
                      setFormData({ ...formData, code: text.replace(/\D/g, '').slice(0, 6) });
                      setErrors({ ...errors, code: undefined });
                    }}
                    onFocus={() => setFocusedField('code')}
                    onBlur={() => handleBlur('code')}
                    keyboardType="number-pad"
                    maxLength={6}
                    autoFocus
                  />
                  {touched.code && errors.code && (
                    <View className="flex-row items-center mt-2 ml-4">
                      <Info size={14} color="#006A6A" />
                      <Text className="text-xs ml-1.5" style={{ color: '#006A6A' }}>
                        {errors.code}
                      </Text>
                    </View>
                  )}
                </View>

                {/* Verify Button */}
                <Pressable
                  onPress={handleVerifyCode}
                  disabled={!isCodeValid || verifyCodeMutation.isPending}
                  className="rounded-full py-4 items-center justify-center mb-4"
                  style={{
                    backgroundColor: isCodeValid && !verifyCodeMutation.isPending ? '#006A6A' : '#E5E7EB',
                    height: 56,
                  }}
                >
                  {verifyCodeMutation.isPending ? (
                    <ActivityIndicator color="white" />
                  ) : (
                    <Text
                      className="text-base font-semibold"
                      style={{ color: isCodeValid ? 'white' : '#9CA3AF' }}
                    >
                      Verify & Create Account
                    </Text>
                  )}
                </Pressable>

                {/* Resend Code */}
                <Pressable
                  onPress={() => sendCodeMutation.mutate()}
                  disabled={sendCodeMutation.isPending || resendCooldown > 0}
                  className="items-center"
                >
                  <Text
                    className="text-sm font-medium"
                    style={{ color: resendCooldown > 0 ? '#9CA3AF' : '#006A6A' }}
                  >
                    {sendCodeMutation.isPending
                      ? 'Sending...'
                      : resendCooldown > 0
                      ? `Resend code in ${resendCooldown}s`
                      : "Didn't receive the code? Resend"}
                  </Text>
                </Pressable>
              </Animated.View>
            </ScrollView>
          </KeyboardAvoidingView>
        </SafeAreaView>
      </View>
    );
  }

  // Signup form screen
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
            {/* Back button */}
            <Pressable onPress={() => router.back()} className="mb-8">
              <ArrowLeft size={24} color="#006A6A" />
            </Pressable>

            {/* Header */}
            <Animated.View entering={FadeInDown.duration(600)} className="mb-10">
              <Text className="text-2xl font-semibold mb-2" style={{ color: '#006A6A' }}>
                Create Your Account
              </Text>
              <Text className="text-sm" style={{ color: '#8B9D8B' }}>
                Start your journey to financial calm
              </Text>
            </Animated.View>

            {/* Invite Banner */}
            {invitePreview && (
              <Animated.View entering={FadeInDown.delay(50).duration(600)} className="mb-6">
                <View className="bg-teal-50 p-4 rounded-2xl border-2 border-teal-100">
                  <Text className="text-teal-900 font-semibold mb-1">
                    You're invited! 🎉
                  </Text>
                  <Text className="text-teal-700 text-sm">
                    {invitePreview.inviterName} invited you to join "{invitePreview.householdName}"
                  </Text>
                </View>
              </Animated.View>
            )}

            {/* Name Field */}
            <Animated.View entering={FadeInDown.delay(100).duration(600)} className="mb-4">
              <View className="relative rounded-3xl" style={{ overflow: 'hidden' }}>
                <TextInput
                  className="text-base px-4 pt-6 pb-4 rounded-3xl border-2 bg-white"
                  style={{
                    borderColor: focusedField === 'name' ? '#006A6A' : '#E5E7EB',
                    color: '#1F2937',
                    backgroundColor: '#FFFFFF',
                  }}
                  placeholder=" "
                  value={formData.name}
                  onChangeText={(text) => {
                    setFormData({ ...formData, name: text });
                    setErrors({ ...errors, name: undefined });
                  }}
                  onFocus={() => setFocusedField('name')}
                  onBlur={() => handleBlur('name')}
                  autoCapitalize="words"
                  autoCorrect={false}
                  textContentType="name"
                />
                {/* Floating Label */}
                <Text
                  className="absolute left-4 text-xs font-medium"
                  style={{
                    top: 10,
                    color: focusedField === 'name' ? '#006A6A' : '#9CA3AF',
                  }}
                >
                  Full Name
                </Text>
                {/* Validation Checkmark */}
                {touched.name && isNameValid && (
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

            {/* Email Field */}
            <Animated.View entering={FadeInDown.delay(200).duration(600)} className="mb-8">
              <View className="relative rounded-3xl" style={{ overflow: 'hidden' }}>
                <TextInput
                  className="text-base px-4 pt-6 pb-4 rounded-3xl border-2 bg-white"
                  style={{
                    borderColor: focusedField === 'email' ? '#006A6A' : '#E5E7EB',
                    color: '#1F2937',
                    backgroundColor: '#FFFFFF',
                  }}
                  placeholder=" "
                  value={formData.email}
                  onChangeText={(text) => {
                    setFormData({ ...formData, email: text });
                    setErrors({ ...errors, email: undefined });
                  }}
                  onFocus={() => setFocusedField('email')}
                  onBlur={() => handleBlur('email')}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoCorrect={false}
                  textContentType="username"
                  autoComplete="email"
                />
                {/* Floating Label */}
                <Text
                  className="absolute left-4 text-xs font-medium"
                  style={{
                    top: 10,
                    color: focusedField === 'email' ? '#006A6A' : '#9CA3AF',
                  }}
                >
                  Email
                </Text>
                {/* Validation Checkmark */}
                {touched.email && isEmailValid && (
                  <View className="absolute right-4" style={{ top: 20 }}>
                    <CheckCircle2 size={20} color="#8B9D8B" />
                  </View>
                )}
              </View>
              {touched.email && errors.email && (
                <View className="flex-row items-center mt-2 ml-4">
                  <Info size={14} color="#006A6A" />
                  <Text className="text-xs ml-1.5" style={{ color: '#006A6A' }}>
                    {errors.email}
                  </Text>
                </View>
              )}
            </Animated.View>

            {/* Info Message */}
            <Animated.View entering={FadeInDown.delay(300).duration(600)} className="mb-8">
              <View className="px-4 py-3 rounded-2xl" style={{ backgroundColor: 'rgba(0, 106, 106, 0.05)' }}>
                <Text className="text-xs text-center" style={{ color: 'rgba(0, 106, 106, 0.7)' }}>
                  No password needed! We'll send a secure verification code to your email.
                </Text>
              </View>
            </Animated.View>
          </ScrollView>

          {/* Bottom Button - Fixed at bottom */}
          <View className="px-6 pb-6 pt-4 bg-white">
            <Animated.View entering={FadeInDown.delay(400).duration(600)}>
              <Pressable
                onPress={handleCreateAccount}
                disabled={!isDetailsValid || sendCodeMutation.isPending}
                className="rounded-full py-4 items-center justify-center"
                style={{
                  backgroundColor: isDetailsValid && !sendCodeMutation.isPending ? '#006A6A' : '#E5E7EB',
                  height: 56,
                  shadowColor: '#006A6A',
                  shadowOffset: { width: 0, height: 4 },
                  shadowOpacity: isDetailsValid ? 0.2 : 0,
                  shadowRadius: 12,
                  elevation: isDetailsValid ? 4 : 0,
                  opacity: isDetailsValid && !sendCodeMutation.isPending ? 1 : 0.4,
                }}
              >
                {sendCodeMutation.isPending ? (
                  <ActivityIndicator color="white" />
                ) : (
                  <Text
                    className="text-base font-semibold"
                    style={{ color: isDetailsValid ? 'white' : '#9CA3AF' }}
                  >
                    Create Account
                  </Text>
                )}
              </Pressable>

              {/* Login Link */}
              <View className="flex-row justify-center mt-4">
                <Text className="text-sm" style={{ color: '#6B7280' }}>
                  Already have an account?{' '}
                </Text>
                <Pressable onPress={() => router.push('/login')}>
                  <Text className="text-sm font-semibold" style={{ color: '#006A6A' }}>
                    Log in
                  </Text>
                </Pressable>
              </View>
            </Animated.View>
          </View>
        </KeyboardAvoidingView>
      </SafeAreaView>

      {/* Success Modal */}
      <SuccessModal
        visible={showSuccessModal}
        onContinue={() => {
          setShowSuccessModal(false);
          router.replace('/(tabs)');
        }}
      />
    </View>
  );
}
