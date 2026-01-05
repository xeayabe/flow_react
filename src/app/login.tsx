import React, { useState } from 'react';
import { View, Text, TextInput, Pressable, ScrollView, KeyboardAvoidingView, Platform, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { Mail, ArrowRight } from 'lucide-react-native';
import { useMutation } from '@tanstack/react-query';
import { sendMagicCode, verifyMagicCode } from '@/lib/auth-api';
import { cn } from '@/lib/cn';

type Step = 'email' | 'verify';

interface FormData {
  email: string;
  code: string;
}

export default function LoginScreen() {
  const [step, setStep] = useState<Step>('email');
  const [formData, setFormData] = useState<FormData>({
    email: '',
    code: '',
  });

  const [error, setError] = useState<string>('');

  const sendCodeMutation = useMutation({
    mutationFn: () => sendMagicCode(formData.email),
    onSuccess: (response) => {
      if (response.success) {
        setStep('verify');
        setError('');
      } else {
        setError(response.error || 'Failed to send verification code');
      }
    },
    onError: () => {
      setError('Something went wrong. Please try again');
    },
  });

  const verifyCodeMutation = useMutation({
    mutationFn: () => verifyMagicCode(formData.email, formData.code),
    onSuccess: async (response) => {
      if (response.success) {
        // Check if user profile exists
        const { checkUserProfile } = await import('@/lib/auth-api');
        const profileCheck = await checkUserProfile(formData.email);

        if (!profileCheck.exists) {
          // User authenticated but no profile exists - redirect to signup
          setError('No account found with this email. Please sign up first.');
          setTimeout(() => {
            router.replace('/signup');
          }, 2000);
          return;
        }

        // Profile exists, proceed to dashboard
        router.replace('/(tabs)');
      } else {
        setError(response.error || 'Invalid verification code');
      }
    },
    onError: () => {
      setError('Something went wrong. Please try again');
    },
  });

  const validateEmail = (email: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const handleSendCode = () => {
    setError('');

    if (!formData.email) {
      setError('Please enter your email address');
      return;
    }

    if (!validateEmail(formData.email)) {
      setError('Please enter a valid email address');
      return;
    }

    sendCodeMutation.mutate();
  };

  const handleVerifyCode = () => {
    setError('');

    if (!formData.code || formData.code.length < 6) {
      setError('Please enter the 6-digit code');
      return;
    }

    verifyCodeMutation.mutate();
  };

  const isEmailValid = formData.email.length > 0 && validateEmail(formData.email);
  const isCodeValid = formData.code.length === 6;

  if (step === 'verify') {
    return (
      <View className="flex-1 bg-slate-50">
        <LinearGradient
          colors={['#0ea5e9', '#06b6d4', '#14b8a6']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}
        />

        <SafeAreaView className="flex-1">
          <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            className="flex-1"
          >
            <ScrollView
              className="flex-1"
              contentContainerStyle={{ paddingHorizontal: 24, paddingVertical: 32, justifyContent: 'center', flexGrow: 1 }}
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
            >
              {/* Header */}
              <View className="mb-8">
                <Text className="text-4xl font-bold text-white mb-2">Check Your Email</Text>
                <Text className="text-lg text-sky-100">
                  We sent a verification code to{'\n'}<Text className="font-semibold">{formData.email}</Text>
                </Text>
              </View>

              {/* Form Container */}
              <View className="bg-white rounded-3xl p-6 shadow-lg">
                {/* Error Message */}
                {error ? (
                  <View className="bg-red-50 border border-red-200 rounded-xl p-4 mb-5">
                    <Text className="text-red-600 text-sm font-medium">{error}</Text>
                  </View>
                ) : null}

                {/* Code Input */}
                <View className="mb-5">
                  <Text className="text-sm font-semibold text-slate-700 mb-2">Verification Code</Text>
                  <View className="flex-row items-center bg-slate-50 rounded-xl px-4 py-4 border border-slate-200">
                    <TextInput
                      className="flex-1 text-2xl text-slate-900 text-center tracking-widest"
                      placeholder="000000"
                      placeholderTextColor="#94a3b8"
                      value={formData.code}
                      onChangeText={(text) => {
                        setFormData({ ...formData, code: text.replace(/\D/g, '').slice(0, 6) });
                        setError('');
                      }}
                      keyboardType="number-pad"
                      maxLength={6}
                      autoFocus
                    />
                  </View>
                </View>

                {/* Verify Button */}
                <Pressable
                  onPress={handleVerifyCode}
                  disabled={!isCodeValid || verifyCodeMutation.isPending}
                  className={cn(
                    "rounded-xl py-4 items-center justify-center mb-4",
                    isCodeValid && !verifyCodeMutation.isPending
                      ? "bg-cyan-500 active:bg-cyan-600"
                      : "bg-slate-200"
                  )}
                >
                  {verifyCodeMutation.isPending ? (
                    <ActivityIndicator color="white" />
                  ) : (
                    <Text className={cn(
                      "text-base font-bold",
                      isCodeValid ? "text-white" : "text-slate-400"
                    )}>
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
                  <Text className="text-cyan-600 text-sm font-semibold">
                    {sendCodeMutation.isPending ? 'Sending...' : "Didn't receive the code? Resend"}
                  </Text>
                </Pressable>
              </View>

              {/* Back Link */}
              <Pressable onPress={() => setStep('email')} className="items-center mt-6">
                <Text className="text-white text-base font-semibold">Use different email</Text>
              </Pressable>
            </ScrollView>
          </KeyboardAvoidingView>
        </SafeAreaView>
      </View>
    );
  }

  return (
    <View className="flex-1 bg-slate-50">
      <LinearGradient
        colors={['#0ea5e9', '#06b6d4', '#14b8a6']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}
      />

      <SafeAreaView className="flex-1">
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          className="flex-1"
        >
          <ScrollView
            className="flex-1"
            contentContainerStyle={{ paddingHorizontal: 24, paddingVertical: 32, justifyContent: 'center', flexGrow: 1 }}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
            {/* Header */}
            <View className="mb-12">
              <Text className="text-5xl font-bold text-white mb-3">Welcome Back</Text>
              <Text className="text-lg text-sky-100">Log in to continue tracking expenses</Text>
            </View>

            {/* Form Container */}
            <View className="bg-white rounded-3xl p-6 shadow-lg">
              {/* Error Message */}
              {error ? (
                <View className="bg-red-50 border border-red-200 rounded-xl p-4 mb-5">
                  <Text className="text-red-600 text-sm font-medium">{error}</Text>
                </View>
              ) : null}

              {/* Email Input */}
              <View className="mb-5">
                <Text className="text-sm font-semibold text-slate-700 mb-2">Email Address</Text>
                <View className="flex-row items-center bg-slate-50 rounded-xl px-4 py-4 border border-slate-200">
                  <Mail size={20} color="#64748b" />
                  <TextInput
                    className="flex-1 ml-3 text-base text-slate-900"
                    placeholder="you@example.com"
                    placeholderTextColor="#94a3b8"
                    value={formData.email}
                    onChangeText={(text) => {
                      setFormData({ ...formData, email: text });
                      setError('');
                    }}
                    keyboardType="email-address"
                    autoCapitalize="none"
                    autoCorrect={false}
                  />
                </View>
              </View>

              {/* Info Box */}
              <View className="bg-cyan-50 rounded-xl p-4 mb-6">
                <Text className="text-cyan-800 text-sm">
                  We'll send you a verification code via email. No password needed!
                </Text>
              </View>

              {/* Continue Button */}
              <Pressable
                onPress={handleSendCode}
                disabled={!isEmailValid || sendCodeMutation.isPending}
                className={cn(
                  "rounded-xl py-4 flex-row items-center justify-center",
                  isEmailValid && !sendCodeMutation.isPending
                    ? "bg-cyan-500 active:bg-cyan-600"
                    : "bg-slate-200"
                )}
              >
                {sendCodeMutation.isPending ? (
                  <ActivityIndicator color="white" />
                ) : (
                  <>
                    <Text className={cn(
                      "text-base font-bold mr-2",
                      isEmailValid ? "text-white" : "text-slate-400"
                    )}>
                      Continue
                    </Text>
                    <ArrowRight size={20} color={isEmailValid ? "white" : "#94a3b8"} />
                  </>
                )}
              </Pressable>
            </View>

            {/* Sign Up Link */}
            <View className="flex-row justify-center mt-8">
              <Text className="text-white text-base">Don't have an account? </Text>
              <Pressable onPress={() => router.push('/signup')}>
                <Text className="text-white text-base font-bold underline">Sign up</Text>
              </Pressable>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </View>
  );
}
