import React, { useState } from 'react';
import { View, Text, TextInput, Pressable, ScrollView, KeyboardAvoidingView, Platform, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { Mail, User, CheckCircle2, ArrowRight } from 'lucide-react-native';
import { useMutation } from '@tanstack/react-query';
import { sendMagicCode, verifyMagicCode, createUserProfile, checkUserProfile } from '@/lib/auth-api';
import { cn } from '@/lib/cn';

type Step = 'details' | 'verify';

interface FormData {
  email: string;
  name: string;
  acceptTerms: boolean;
  code: string;
}

interface ValidationErrors {
  email?: string;
  name?: string;
  acceptTerms?: string;
  code?: string;
}

export default function SignupScreen() {
  const [step, setStep] = useState<Step>('details');
  const [formData, setFormData] = useState<FormData>({
    email: '',
    name: '',
    acceptTerms: false,
    code: '',
  });

  const [errors, setErrors] = useState<ValidationErrors>({});
  const [touched, setTouched] = useState<Record<string, boolean>>({});

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
          await createUserProfile(formData.email, formData.name);
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
      acceptTerms: !formData.acceptTerms ? 'You must accept the terms and conditions' : undefined,
    };

    setErrors(newErrors);
    return !Object.values(newErrors).some((error) => error !== undefined);
  };

  const handleBlur = (field: keyof FormData) => {
    setTouched({ ...touched, [field]: true });

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

  const handleSendCode = async () => {
    // Check if user already exists
    const profileCheck = await checkUserProfile(formData.email);
    if (profileCheck.exists) {
      setErrors({ email: 'This email is already registered. Please log in instead.' });
      return;
    }

    setTouched({
      email: true,
      name: true,
      acceptTerms: true,
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
    !validateName(formData.name) &&
    formData.acceptTerms;

  const isCodeValid = !validateCode(formData.code);

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
                  We sent a verification code to{'\n'}
                  <Text className="font-semibold">{formData.email}</Text>
                </Text>
              </View>

              {/* Form Container */}
              <View className="bg-white rounded-3xl p-6 shadow-lg">
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
                        setErrors({ ...errors, code: undefined });
                      }}
                      onBlur={() => handleBlur('code')}
                      keyboardType="number-pad"
                      maxLength={6}
                      autoFocus
                    />
                  </View>
                  {touched.code && errors.code && (
                    <Text className="text-red-500 text-xs mt-1 ml-1">{errors.code}</Text>
                  )}
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
                  <Text className="text-cyan-600 text-sm font-semibold">
                    {sendCodeMutation.isPending ? 'Sending...' : "Didn't receive the code? Resend"}
                  </Text>
                </Pressable>
              </View>

              {/* Back Link */}
              <Pressable onPress={() => setStep('details')} className="items-center mt-6">
                <Text className="text-white text-base font-semibold">Back to details</Text>
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
            contentContainerStyle={{ paddingHorizontal: 24, paddingVertical: 32 }}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
            {/* Header */}
            <View className="mb-8">
              <Text className="text-4xl font-bold text-white mb-2">Create Account</Text>
              <Text className="text-lg text-sky-100">Start tracking expenses with your team</Text>
            </View>

            {/* Form Container */}
            <View className="bg-white rounded-3xl p-6 shadow-lg">
              {/* Name Input */}
              <View className="mb-5">
                <Text className="text-sm font-semibold text-slate-700 mb-2">Full Name</Text>
                <View className="flex-row items-center bg-slate-50 rounded-xl px-4 py-4 border border-slate-200">
                  <User size={20} color="#64748b" />
                  <TextInput
                    className="flex-1 ml-3 text-base text-slate-900"
                    placeholder="John Doe"
                    placeholderTextColor="#94a3b8"
                    value={formData.name}
                    onChangeText={(text) => setFormData({ ...formData, name: text })}
                    onBlur={() => handleBlur('name')}
                    autoCapitalize="words"
                    autoCorrect={false}
                  />
                </View>
                {touched.name && errors.name && (
                  <Text className="text-red-500 text-xs mt-1 ml-1">{errors.name}</Text>
                )}
              </View>

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
                    onChangeText={(text) => setFormData({ ...formData, email: text })}
                    onBlur={() => handleBlur('email')}
                    keyboardType="email-address"
                    autoCapitalize="none"
                    autoCorrect={false}
                  />
                </View>
                {touched.email && errors.email && (
                  <Text className="text-red-500 text-xs mt-1 ml-1">{errors.email}</Text>
                )}
              </View>

              {/* Info Box */}
              <View className="bg-cyan-50 rounded-xl p-4 mb-5">
                <Text className="text-cyan-800 text-sm">
                  We'll send you a verification code via email. No password needed!
                </Text>
              </View>

              {/* Terms Checkbox */}
              <Pressable
                onPress={() => setFormData({ ...formData, acceptTerms: !formData.acceptTerms })}
                className="flex-row items-start mb-6"
              >
                <View className={cn(
                  "w-5 h-5 rounded border-2 mr-3 items-center justify-center mt-0.5",
                  formData.acceptTerms ? "bg-cyan-500 border-cyan-500" : "bg-white border-slate-300"
                )}>
                  {formData.acceptTerms && <CheckCircle2 size={16} color="white" />}
                </View>
                <Text className="flex-1 text-sm text-slate-600">
                  I agree to the{' '}
                  <Text className="text-cyan-600 font-semibold">Terms and Conditions</Text> and{' '}
                  <Text className="text-cyan-600 font-semibold">Privacy Policy</Text>
                </Text>
              </Pressable>
              {touched.acceptTerms && errors.acceptTerms && (
                <Text className="text-red-500 text-xs -mt-4 mb-4 ml-1">{errors.acceptTerms}</Text>
              )}

              {/* Continue Button */}
              <Pressable
                onPress={handleSendCode}
                disabled={!isDetailsValid || sendCodeMutation.isPending}
                className={cn(
                  "rounded-xl py-4 flex-row items-center justify-center",
                  isDetailsValid && !sendCodeMutation.isPending
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
                      isDetailsValid ? "text-white" : "text-slate-400"
                    )}>
                      Continue
                    </Text>
                    <ArrowRight size={20} color={isDetailsValid ? "white" : "#94a3b8"} />
                  </>
                )}
              </Pressable>
            </View>

            {/* Login Link */}
            <View className="flex-row justify-center mt-6">
              <Text className="text-white text-base">Already have an account? </Text>
              <Pressable onPress={() => router.push('/login')}>
                <Text className="text-white text-base font-bold underline">Log in</Text>
              </Pressable>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </View>
  );
}
