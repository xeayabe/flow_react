import React from 'react';
import { Pressable, View, ActivityIndicator } from 'react-native';
import Animated, { useAnimatedStyle, withSpring, useSharedValue, withTiming } from 'react-native-reanimated';
import { Check } from 'lucide-react-native';

interface SaveFABProps {
  onSave: () => void;
  disabled?: boolean;
  isLoading?: boolean;
}

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

export default function SaveFAB({ onSave, disabled = false, isLoading = false }: SaveFABProps) {
  const scale = useSharedValue(1);
  const shadowRadius = useSharedValue(24);

  const animatedStyle = useAnimatedStyle(() => {
    return {
      transform: [{ scale: scale.value }],
      shadowRadius: shadowRadius.value,
    };
  });

  const handlePressIn = () => {
    if (!disabled && !isLoading) {
      scale.value = withSpring(0.95, { damping: 15, stiffness: 400 });
    }
  };

  const handlePressOut = () => {
    if (!disabled && !isLoading) {
      scale.value = withSpring(1, { damping: 15, stiffness: 400 });
      shadowRadius.value = withTiming(24, { duration: 200 });
    }
  };

  const handleHoverIn = () => {
    if (!disabled && !isLoading) {
      scale.value = withSpring(1.1, { damping: 15, stiffness: 400 });
      shadowRadius.value = withTiming(32, { duration: 200 });
    }
  };

  const handleHoverOut = () => {
    if (!disabled && !isLoading) {
      scale.value = withSpring(1, { damping: 15, stiffness: 400 });
      shadowRadius.value = withTiming(24, { duration: 200 });
    }
  };

  return (
    <AnimatedPressable
      onPress={onSave}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      onHoverIn={handleHoverIn}
      onHoverOut={handleHoverOut}
      disabled={disabled || isLoading}
      className="items-center justify-center"
      style={[
        {
          position: 'absolute',
          bottom: 24,
          right: 24,
          width: 64,
          height: 64,
          borderRadius: 32,
          backgroundColor: 'rgba(255,255,255,0.9)',
          borderWidth: 2,
          borderColor: '#2C5F5D',
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 8 },
          shadowOpacity: 0.3,
          elevation: 8,
          opacity: disabled && !isLoading ? 0.4 : 1,
          zIndex: 1000,
        },
        animatedStyle,
      ]}
    >
      {isLoading ? (
        <ActivityIndicator color="#2C5F5D" size="small" />
      ) : (
        <Check size={28} color="#2C5F5D" strokeWidth={2.5} />
      )}
    </AnimatedPressable>
  );
}
