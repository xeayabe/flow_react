import React, { useState } from 'react';
import { View, Text, TextInput, Pressable, ScrollView, KeyboardAvoidingView, Platform, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { Eye, EyeOff, Mail, Lock, User, CheckCircle2 } from 'lucide-react-native';
import { useMutation } from '@tanstack/react-query';
import { signup } from '@/lib/auth-api';
import { db } from '@/lib/db';
import { cn } from '@/lib/cn';

interface FormData {
  email: string;
  password: string;
  confirmPassword: string;
  name: string;
  acceptTerms: boolean;
}

interface ValidationErrors {
  email?: string;
  password?: string;
  confirmPassword?: string;
  name?: string;
  acceptTerms?: string;
}

export default function SignupScreen() {
  const [formData, setFormData] = useState<FormData>({
    email: '',
    password: '',
    confirmPassword: '',
    name: '',
    acceptTerms: false,
  });

  const [showPassword, setShowPassword] = useState<boolean>(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState<boolean>(false);
  const [errors, setErrors] = useState<ValidationErrors>({});
  const [touched, setTouched] = useState<Record<string, boolean>>({});

  const signupMutation = useMutation({
    mutationFn: signup,
    onSuccess: async (response) => {
      if (response.success && response.token) {
        // Sign in with the token
        await db.auth.signInWithToken(response.token);
        // Navigate to dashboard
        router.replace('/(tabs)');
      } else if (response.error) {
        setErrors({ email: response.error });
      }
    },
    onError: () => {
      setErrors({ email: 'Something went wrong. Please try again' });
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
    if (password.length < 8) return 'Password must be at least 8 characters';
    if (!/[A-Z]/.test(password)) return 'Password must contain at least one uppercase letter';
    if (!/[0-9]/.test(password)) return 'Password must contain at least one number';
    return undefined;
  };

  const validateConfirmPassword = (confirmPassword: string): string | undefined => {
    if (!confirmPassword) return 'Please confirm your password';
    if (confirmPassword !== formData.password) return 'Passwords do not match';
    return undefined;
  };

  const validateName = (name: string): string | undefined => {
    if (!name) return 'Name is required';
    if (name.length < 2) return 'Name must be at least 2 characters';
    return undefined;
  };

  const validateForm = (): boolean => {
    const newErrors: ValidationErrors = {
      email: validateEmail(formData.email),
      password: validatePassword(formData.password),
      confirmPassword: validateConfirmPassword(formData.confirmPassword),
      name: validateName(formData.name),
      acceptTerms: !formData.acceptTerms ? 'You must accept the terms and conditions' : undefined,
    };

    setErrors(newErrors);
    return !Object.values(newErrors).some((error) => error !== undefined);
  };

  const handleBlur = (field: keyof FormData) => {
    setTouched({ ...touched, [field]: true });

    // Validate specific field
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
      case 'name':
        error = validateName(formData.name);
        break;
    }

    setErrors({ ...errors, [field]: error });
  };

  const handleSubmit = () => {
    // Mark all fields as touched
    setTouched({
      email: true,
      password: true,
      confirmPassword: true,
      name: true,
      acceptTerms: true,
    });

    if (validateForm()) {
      signupMutation.mutate({
        email: formData.email,
        password: formData.password,
        name: formData.name,
      });
    }
  };

  const isFormValid =
    !validateEmail(formData.email) &&
    !validatePassword(formData.password) &&
    !validateConfirmPassword(formData.confirmPassword) &&
    !validateName(formData.name) &&
    formData.acceptTerms;

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
            contentContainerClassName="px-6 py-8"
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

              {/* Password Input */}
              <View className="mb-5">
                <Text className="text-sm font-semibold text-slate-700 mb-2">Password</Text>
                <View className="flex-row items-center bg-slate-50 rounded-xl px-4 py-4 border border-slate-200">
                  <Lock size={20} color="#64748b" />
                  <TextInput
                    className="flex-1 ml-3 text-base text-slate-900"
                    placeholder="••••••••"
                    placeholderTextColor="#94a3b8"
                    value={formData.password}
                    onChangeText={(text) => setFormData({ ...formData, password: text })}
                    onBlur={() => handleBlur('password')}
                    secureTextEntry={!showPassword}
                    autoCapitalize="none"
                    autoCorrect={false}
                  />
                  <Pressable onPress={() => setShowPassword(!showPassword)} className="ml-2">
                    {showPassword ? (
                      <EyeOff size={20} color="#64748b" />
                    ) : (
                      <Eye size={20} color="#64748b" />
                    )}
                  </Pressable>
                </View>
                {touched.password && errors.password && (
                  <Text className="text-red-500 text-xs mt-1 ml-1">{errors.password}</Text>
                )}
              </View>

              {/* Confirm Password Input */}
              <View className="mb-5">
                <Text className="text-sm font-semibold text-slate-700 mb-2">Confirm Password</Text>
                <View className="flex-row items-center bg-slate-50 rounded-xl px-4 py-4 border border-slate-200">
                  <Lock size={20} color="#64748b" />
                  <TextInput
                    className="flex-1 ml-3 text-base text-slate-900"
                    placeholder="••••••••"
                    placeholderTextColor="#94a3b8"
                    value={formData.confirmPassword}
                    onChangeText={(text) => setFormData({ ...formData, confirmPassword: text })}
                    onBlur={() => handleBlur('confirmPassword')}
                    secureTextEntry={!showConfirmPassword}
                    autoCapitalize="none"
                    autoCorrect={false}
                  />
                  <Pressable onPress={() => setShowConfirmPassword(!showConfirmPassword)} className="ml-2">
                    {showConfirmPassword ? (
                      <EyeOff size={20} color="#64748b" />
                    ) : (
                      <Eye size={20} color="#64748b" />
                    )}
                  </Pressable>
                </View>
                {touched.confirmPassword && errors.confirmPassword && (
                  <Text className="text-red-500 text-xs mt-1 ml-1">{errors.confirmPassword}</Text>
                )}
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
                <Text className="text-red-500 text-xs mt-1 ml-1 -mt-4 mb-4">{errors.acceptTerms}</Text>
              )}

              {/* Sign Up Button */}
              <Pressable
                onPress={handleSubmit}
                disabled={!isFormValid || signupMutation.isPending}
                className={cn(
                  "rounded-xl py-4 items-center justify-center",
                  isFormValid && !signupMutation.isPending
                    ? "bg-cyan-500 active:bg-cyan-600"
                    : "bg-slate-200"
                )}
              >
                {signupMutation.isPending ? (
                  <ActivityIndicator color="white" />
                ) : (
                  <Text className={cn(
                    "text-base font-bold",
                    isFormValid ? "text-white" : "text-slate-400"
                  )}>
                    Sign Up
                  </Text>
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
