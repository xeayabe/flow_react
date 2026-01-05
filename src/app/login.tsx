import React, { useState } from 'react';
import { View, Text, TextInput, Pressable, ScrollView, KeyboardAvoidingView, Platform, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { Eye, EyeOff, Mail, Lock } from 'lucide-react-native';
import { useMutation } from '@tanstack/react-query';
import { login } from '@/lib/auth-api';
import { db } from '@/lib/db';
import { cn } from '@/lib/cn';

interface LoginFormData {
  email: string;
  password: string;
}

export default function LoginScreen() {
  const [formData, setFormData] = useState<LoginFormData>({
    email: '',
    password: '',
  });

  const [showPassword, setShowPassword] = useState<boolean>(false);
  const [error, setError] = useState<string>('');

  const loginMutation = useMutation({
    mutationFn: login,
    onSuccess: async (response) => {
      if (response.success && response.token) {
        // Sign in with the token
        await db.auth.signInWithToken(response.token);
        // Navigate to dashboard
        router.replace('/(tabs)');
      } else if (response.error) {
        setError(response.error);
      }
    },
    onError: () => {
      setError('Something went wrong. Please try again');
    },
  });

  const handleLogin = () => {
    setError('');

    if (!formData.email || !formData.password) {
      setError('Please enter both email and password');
      return;
    }

    loginMutation.mutate(formData);
  };

  const isFormValid = formData.email.length > 0 && formData.password.length > 0;

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
            contentContainerClassName="px-6 py-8 justify-center"
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
              {error && (
                <View className="bg-red-50 border border-red-200 rounded-xl p-4 mb-5">
                  <Text className="text-red-600 text-sm font-medium">{error}</Text>
                </View>
              )}

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

              {/* Password Input */}
              <View className="mb-6">
                <Text className="text-sm font-semibold text-slate-700 mb-2">Password</Text>
                <View className="flex-row items-center bg-slate-50 rounded-xl px-4 py-4 border border-slate-200">
                  <Lock size={20} color="#64748b" />
                  <TextInput
                    className="flex-1 ml-3 text-base text-slate-900"
                    placeholder="••••••••"
                    placeholderTextColor="#94a3b8"
                    value={formData.password}
                    onChangeText={(text) => {
                      setFormData({ ...formData, password: text });
                      setError('');
                    }}
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
              </View>

              {/* Login Button */}
              <Pressable
                onPress={handleLogin}
                disabled={!isFormValid || loginMutation.isPending}
                className={cn(
                  "rounded-xl py-4 items-center justify-center mb-4",
                  isFormValid && !loginMutation.isPending
                    ? "bg-cyan-500 active:bg-cyan-600"
                    : "bg-slate-200"
                )}
              >
                {loginMutation.isPending ? (
                  <ActivityIndicator color="white" />
                ) : (
                  <Text className={cn(
                    "text-base font-bold",
                    isFormValid ? "text-white" : "text-slate-400"
                  )}>
                    Log In
                  </Text>
                )}
              </Pressable>

              {/* Forgot Password Link */}
              <Pressable className="items-center">
                <Text className="text-cyan-600 text-sm font-semibold">Forgot Password?</Text>
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
