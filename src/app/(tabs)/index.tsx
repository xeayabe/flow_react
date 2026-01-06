import React from 'react';
import { Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function DashboardScreen() {
  return (
    <SafeAreaView className="flex-1 bg-white" edges={['top']}>
      <View className="flex-1 justify-center items-center px-6">
        <Text className="text-2xl font-bold text-gray-900 text-center mb-3">
          Dashboard
        </Text>
        <Text className="text-base text-gray-500 text-center leading-6">
          Coming soon. More features will be added here.
        </Text>
      </View>
    </SafeAreaView>
  );
}
