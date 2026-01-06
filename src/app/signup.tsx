import React, { useState } from 'react';
import { View, Text, TextInput, Pressable, ScrollView, KeyboardAvoidingView, Platform, ActivityIndicator, Keyboard } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { router } from 'expo-router';
import { Eye, EyeOff, CheckCircle2, ArrowLeft, AlertCircle, Info } from 'lucide-react-native';
import { useMutation } from '@tanstack/react-query';
import { sendMagicCode, verifyMagicCode, createUserProfile, checkUserProfile } from '@/lib/auth-api';
import { cn } from '@/lib/cn';
import Animated, { FadeInDown, FadeIn, FadeInLeft } from 'react-native-reanimated';

type Step = 'details' | 'verify';

interface FormData {
  email: string;
  password: string;
  confirmPassword: string;
  code: string;
}

interface ValidationErrors {
  email?: string;
  password?: string;
  confirmPassword?: string;
  code?: string;
}

export default function SignupScreen() {
  const [step, setStep] = useState<Step>('details');
  const [formData, setFormData] = useState<FormData>({
    email: '',
    password: '',
    confirmPassword: '',
    code: '',
  });

  const [errors, setErrors] = useState<ValidationErrors>({});
  const [touched, setTouched] = useState<Record<string, boolean>>({});
  const [focusedField, setFocusedField] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState<boolean>(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState<boolean>(false);

  const sendCodeMutation = useMutation({
    mutationFn: () => sendMagicCode(formData.email),
    onSuccess: (response) => {
      if (response.success) {
        setStep('verify');
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
        // Check if profile exists, if not create it
        const profileCheck = await checkUserProfile(formData.email);
        if (!profileCheck.exists) {
          // Extract name from email for now (we can add a name field later if needed)
          const name = formData.email.split('@')[0];
          await createUserProfile(formData.email, name);
        }
        // Navigate to dashboard
        router.replace('/(tabs)');
      } else {
        setErrors({ code: response.error });
      }
    },
    onError: () => {
      setErrors({ code: 'Something went wrong. Please try again' });
    },
  });

  const validateEmail = (email: string): string | undefined => {
    if (!email) return 'Email is required';
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) return 'Please enter a valid email address';
    return undefined;
  };

  const validatePassword = (password: string): string | undefined => {
    if (!password) return 'Password is required';
    if (password.length < 8) return 'Must be 8+ characters';

    // Check for numbers or special characters
    const hasNumberOrSpecial = /[0-9!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password);
    if (!hasNumberOrSpecial && password.length >= 8) return 'Try adding numbers or special characters';

    return undefined;
  };

  const validateConfirmPassword = (confirmPassword: string): string | undefined => {
    if (!confirmPassword) return 'Please confirm your password';
    if (confirmPassword !== formData.password) return 'Passwords do not match';
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
      password: validatePassword(formData.password),
      confirmPassword: validateConfirmPassword(formData.confirmPassword),
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
      case 'password':
        error = validatePassword(formData.password);
        break;
      case 'confirmPassword':
        error = validateConfirmPassword(formData.confirmPassword);
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
      password: true,
      confirmPassword: true,
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
    !validatePassword(formData.password) &&
    !validateConfirmPassword(formData.confirmPassword);

  const isCodeValid = !validateCode(formData.code);
  const isEmailValid = !validateEmail(formData.email);
  const passwordError = validatePassword(formData.password);
  const confirmPasswordError = validateConfirmPassword(formData.confirmPassword);

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
                    <Text className="text-red-500 text-xs mt-2 ml-4">{errors.code}</Text>
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
                  disabled={sendCodeMutation.isPending}
                  className="items-center"
                >
                  <Text className="text-sm font-medium" style={{ color: '#006A6A' }}>
                    {sendCodeMutation.isPending ? 'Sending...' : "Didn't receive the code? Resend"}
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

            {/* Email Field */}
            <Animated.View entering={FadeInDown.delay(100).duration(600)} className="mb-4">
              <View className="relative overflow-hidden rounded-3xl">
                <TextInput
                  className="text-base px-4 pt-6 pb-4 rounded-3xl border-2"
                  style={{
                    borderColor: focusedField === 'email' ? '#006A6A' : '#E5E7EB',
                    color: '#1F2937',
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

            {/* Password Field */}
            <Animated.View entering={FadeInDown.delay(200).duration(600)} className="mb-4">
              <View className="relative overflow-hidden rounded-3xl">
                <TextInput
                  className="text-base px-4 pt-6 pb-4 pr-12 rounded-3xl border-2"
                  style={{
                    borderColor: focusedField === 'password' ? '#006A6A' : '#E5E7EB',
                    color: '#1F2937',
                  }}
                  placeholder=" "
                  value={formData.password}
                  onChangeText={(text) => {
                    setFormData({ ...formData, password: text });
                    setErrors({ ...errors, password: undefined });
                  }}
                  onFocus={() => setFocusedField('password')}
                  onBlur={() => handleBlur('password')}
                  secureTextEntry={!showPassword}
                  autoCapitalize="none"
                  autoCorrect={false}
                  textContentType="newPassword"
                  passwordRules="minlength: 8;"
                />
                {/* Floating Label */}
                <Text
                  className="absolute left-4 text-xs font-medium"
                  style={{
                    top: 10,
                    color: focusedField === 'password' ? '#006A6A' : '#9CA3AF',
                  }}
                >
                  Password
                </Text>
                {/* Eye Icon */}
                <Pressable
                  onPress={() => setShowPassword(!showPassword)}
                  className="absolute right-4"
                  style={{ top: 20 }}
                >
                  {showPassword ? (
                    <EyeOff size={20} color="#9CA3AF" />
                  ) : (
                    <Eye size={20} color="#9CA3AF" />
                  )}
                </Pressable>
              </View>

              {/* Helper Text - Default state */}
              {!touched.password && !errors.password && (
                <Text className="text-xs mt-2 ml-4" style={{ color: '#C4B5FD' }}>
                  Must be 8+ characters
                </Text>
              )}

              {/* Empathetic suggestion chip - when password needs improvement */}
              {touched.password && passwordError === 'Try adding numbers or special characters' && (
                <View
                  className="flex-row items-center mt-2 px-3 py-2 rounded-2xl mx-4"
                  style={{ backgroundColor: '#F3E8FF' }}
                >
                  <Info size={16} color="#006A6A" />
                  <Text className="text-xs ml-2 flex-1" style={{ color: '#006A6A' }}>
                    Try adding numbers or special characters
                  </Text>
                </View>
              )}

              {/* Other password errors */}
              {touched.password && passwordError && passwordError !== 'Try adding numbers or special characters' && (
                <View className="flex-row items-center mt-2 ml-4">
                  <Info size={14} color="#006A6A" />
                  <Text className="text-xs ml-1.5" style={{ color: '#006A6A' }}>
                    {passwordError}
                  </Text>
                </View>
              )}
            </Animated.View>

            {/* Confirm Password Field */}
            <Animated.View entering={FadeInDown.delay(300).duration(600)} className="mb-8">
              <View className="relative overflow-hidden rounded-3xl">
                <TextInput
                  className="text-base px-4 pt-6 pb-4 pr-12 rounded-3xl border-2"
                  style={{
                    borderColor: focusedField === 'confirmPassword' ? '#006A6A' : '#E5E7EB',
                    color: '#1F2937',
                  }}
                  placeholder=" "
                  value={formData.confirmPassword}
                  onChangeText={(text) => {
                    setFormData({ ...formData, confirmPassword: text });
                    setErrors({ ...errors, confirmPassword: undefined });
                  }}
                  onFocus={() => setFocusedField('confirmPassword')}
                  onBlur={() => handleBlur('confirmPassword')}
                  secureTextEntry={!showConfirmPassword}
                  autoCapitalize="none"
                  autoCorrect={false}
                  textContentType="newPassword"
                />
                {/* Floating Label */}
                <Text
                  className="absolute left-4 text-xs font-medium"
                  style={{
                    top: 10,
                    color: focusedField === 'confirmPassword' ? '#006A6A' : '#9CA3AF',
                  }}
                >
                  Confirm Password
                </Text>
                {/* Eye Icon */}
                <Pressable
                  onPress={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-4"
                  style={{ top: 20 }}
                >
                  {showConfirmPassword ? (
                    <EyeOff size={20} color="#9CA3AF" />
                  ) : (
                    <Eye size={20} color="#9CA3AF" />
                  )}
                </Pressable>
              </View>

              {/* Gentle mismatch indicator with animation */}
              {formData.confirmPassword.length > 0 && confirmPasswordError === 'Passwords do not match' && (
                <Animated.View
                  entering={FadeInLeft.duration(400)}
                  className="flex-row items-center mt-2 ml-4"
                >
                  <Info size={14} color="#006A6A" />
                  <Text className="text-xs ml-1.5" style={{ color: '#006A6A' }}>
                    Passwords don't match yet
                  </Text>
                </Animated.View>
              )}

              {/* Other confirm password errors */}
              {touched.confirmPassword && confirmPasswordError && confirmPasswordError !== 'Passwords do not match' && (
                <View className="flex-row items-center mt-2 ml-4">
                  <Info size={14} color="#006A6A" />
                  <Text className="text-xs ml-1.5" style={{ color: '#006A6A' }}>
                    {confirmPasswordError}
                  </Text>
                </View>
              )}
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
    </View>
  );
}
