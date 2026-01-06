import React, { useState } from 'react';
import { View, Text, TextInput, Pressable, ScrollView, KeyboardAvoidingView, Platform, ActivityIndicator, Keyboard } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { router } from 'expo-router';
import { ArrowLeft, Info } from 'lucide-react-native';
import * as LocalAuthentication from 'expo-local-authentication';
import { useMutation } from '@tanstack/react-query';
import { sendMagicCode, verifyMagicCode, checkUserProfile } from '@/lib/auth-api';
import Animated, { FadeInDown } from 'react-native-reanimated';

type Step = 'details' | 'verify';

interface FormData {
  email: string;
  code: string;
}

interface ValidationErrors {
  email?: string;
  code?: string;
}

export default function LoginScreen() {
  const [step, setStep] = useState<Step>('details');
  const [formData, setFormData] = useState<FormData>({
    email: '',
    code: '',
  });

  const [errors, setErrors] = useState<ValidationErrors>({});
  const [touched, setTouched] = useState<Record<string, boolean>>({});
  const [focusedField, setFocusedField] = useState<string | null>(null);
  const [biometricAvailable, setBiometricAvailable] = useState<boolean>(false);

  React.useEffect(() => {
    checkBiometricAvailability();
  }, []);

  const checkBiometricAvailability = async () => {
    const compatible = await LocalAuthentication.hasHardwareAsync();
    const enrolled = await LocalAuthentication.isEnrolledAsync();
    setBiometricAvailable(compatible && enrolled);
  };

  const handleBiometricAuth = async () => {
    try {
      const result = await LocalAuthentication.authenticateAsync({
        promptMessage: 'Log in to Flow',
        fallbackLabel: 'Use email',
        disableDeviceFallback: false,
      });

      if (result.success) {
        // In a real app, you'd retrieve stored credentials here
        console.log('Biometric authentication successful');
      }
    } catch (error) {
      console.error('Biometric auth error:', error);
    }
  };

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

  const validateCode = (code: string): string | undefined => {
    if (!code) return 'Verification code is required';
    if (code.length < 6) return 'Enter the 6-digit code';
    return undefined;
  };

  const handleBlur = (field: keyof FormData) => {
    setTouched({ ...touched, [field]: true });
    setFocusedField(null);

    let error: string | undefined;
    switch (field) {
      case 'email':
        error = validateEmail(formData.email);
        break;
      case 'code':
        error = validateCode(formData.code);
        break;
    }

    setErrors({ ...errors, [field]: error });
  };

  const handleLogin = async () => {
    Keyboard.dismiss();

    // Check if user exists
    const profileCheck = await checkUserProfile(formData.email);
    if (!profileCheck.exists) {
      setErrors({ email: 'No account found with this email. Please sign up first.' });
      return;
    }

    setTouched({ email: true });

    const emailError = validateEmail(formData.email);

    if (emailError) {
      setErrors({ email: emailError });
      return;
    }

    // Send magic code for verification
    sendCodeMutation.mutate();
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

  const isDetailsValid = !validateEmail(formData.email);
  const isCodeValid = !validateCode(formData.code);

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
                  Check Your Email
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
                    opacity: isCodeValid && !verifyCodeMutation.isPending ? 1 : 0.4,
                  }}
                >
                  {verifyCodeMutation.isPending ? (
                    <ActivityIndicator color="white" />
                  ) : (
                    <Text
                      className="text-base font-semibold"
                      style={{ color: isCodeValid ? 'white' : '#9CA3AF' }}
                    >
                      Log In
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

  // Login form screen
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
              <Text className="text-3xl font-semibold mb-2" style={{ color: '#006A6A' }}>
                Welcome Back
              </Text>
              <Text className="text-sm" style={{ color: 'rgba(139, 157, 139, 0.6)' }}>
                Enter your email to receive a login code
              </Text>
            </Animated.View>

            {/* Email Field */}
            <Animated.View entering={FadeInDown.delay(100).duration(600)} className="mb-8">
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
            <Animated.View entering={FadeInDown.delay(200).duration(600)} className="mb-8">
              <View className="px-4 py-3 rounded-2xl" style={{ backgroundColor: 'rgba(0, 106, 106, 0.05)' }}>
                <Text className="text-xs text-center" style={{ color: 'rgba(0, 106, 106, 0.7)' }}>
                  We'll send a secure verification code to your email. No password needed!
                </Text>
              </View>
            </Animated.View>
          </ScrollView>

          {/* Bottom Button - Fixed at bottom */}
          <View className="px-6 pb-6 pt-4 bg-white">
            <Animated.View entering={FadeInDown.delay(300).duration(600)}>
              <View className="flex-row items-center">
                {/* Login Button */}
                <Pressable
                  onPress={handleLogin}
                  disabled={!isDetailsValid || sendCodeMutation.isPending}
                  className="flex-1 rounded-full py-4 items-center justify-center"
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
                      Send Login Code
                    </Text>
                  )}
                </Pressable>

                {/* Biometric Button */}
                {biometricAvailable && (
                  <Pressable
                    onPress={handleBiometricAuth}
                    className="w-14 h-14 rounded-full items-center justify-center ml-3"
                    style={{
                      backgroundColor: '#F3E8FF',
                    }}
                  >
                    <Text style={{ fontSize: 20 }}>🔒</Text>
                  </Pressable>
                )}
              </View>

              {/* Sign Up Link */}
              <View className="flex-row justify-center mt-4">
                <Text className="text-sm" style={{ color: '#6B7280' }}>
                  Don't have an account?{' '}
                </Text>
                <Pressable onPress={() => router.push('/signup')}>
                  <Text className="text-sm font-semibold" style={{ color: '#006A6A' }}>
                    Sign up
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
