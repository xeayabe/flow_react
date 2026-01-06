import React from 'react';
import { View, Text, Pressable, Dimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { router } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
  withSequence,
  Easing,
  FadeInDown,
  FadeIn
} from 'react-native-reanimated';

const { height } = Dimensions.get('window');

// Animated droplet component
function AnimatedDroplet({ delay = 0, x = 0 }: { delay?: number; x?: number }) {
  const translateY = useSharedValue(-20);
  const opacity = useSharedValue(0);
  const scale = useSharedValue(0.5);

  React.useEffect(() => {
    // Stagger the animation start
    setTimeout(() => {
      translateY.value = withRepeat(
        withSequence(
          withTiming(40, { duration: 2000, easing: Easing.bezier(0.25, 0.1, 0.25, 1) }),
          withTiming(-20, { duration: 0 })
        ),
        -1,
        false
      );

      opacity.value = withRepeat(
        withSequence(
          withTiming(1, { duration: 400 }),
          withTiming(1, { duration: 1200 }),
          withTiming(0, { duration: 400 })
        ),
        -1,
        false
      );

      scale.value = withRepeat(
        withSequence(
          withTiming(1, { duration: 2000, easing: Easing.bezier(0.25, 0.1, 0.25, 1) }),
          withTiming(0.5, { duration: 0 })
        ),
        -1,
        false
      );
    }, delay);
  }, []);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [
      { translateY: translateY.value },
      { scale: scale.value }
    ],
    opacity: opacity.value,
  }));

  return (
    <Animated.View
      style={[
        {
          position: 'absolute',
          left: x,
          top: height * 0.15,
        },
        animatedStyle,
      ]}
    >
      <View className="items-center justify-center">
        {/* Droplet shape */}
        <View className="w-16 h-20 rounded-full rounded-tl-full rotate-45"
          style={{
            backgroundColor: 'rgba(0, 106, 106, 0.1)',
            transform: [{ rotate: '45deg' }]
          }}
        />
        {/* Currency symbol inside */}
        <View className="absolute items-center justify-center">
          <Text className="text-2xl font-bold" style={{ color: '#006A6A', transform: [{ rotate: '-45deg' }] }}>$</Text>
        </View>
      </View>
    </Animated.View>
  );
}

export default function WelcomeScreen() {
  const [buttonPressed, setButtonPressed] = React.useState<boolean>(false);

  const handleGetStarted = () => {
    router.push('/signup');
  };

  return (
    <View className="flex-1 bg-white">
      <StatusBar style="dark" />
      {/* Top section with animated illustration (40%) */}
      <View style={{ height: height * 0.4 }} className="relative overflow-hidden">
        {/* Subtle gradient background */}
        <LinearGradient
          colors={['rgba(0, 106, 106, 0.03)', 'rgba(255, 255, 255, 0)']}
          style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}
        />

        {/* Animated droplets forming currency symbols */}
        <AnimatedDroplet delay={0} x={50} />
        <AnimatedDroplet delay={600} x={150} />
        <AnimatedDroplet delay={1200} x={250} />

        {/* Decorative flowing lines */}
        <Animated.View
          entering={FadeIn.delay(400).duration(1000)}
          className="absolute top-32 left-0 right-0"
        >
          <View className="h-1 mx-8 rounded-full opacity-10" style={{ backgroundColor: '#006A6A' }} />
        </Animated.View>
        <Animated.View
          entering={FadeIn.delay(800).duration(1000)}
          className="absolute top-40 left-0 right-0"
        >
          <View className="h-0.5 mx-16 rounded-full opacity-5" style={{ backgroundColor: '#006A6A' }} />
        </Animated.View>
      </View>

      {/* Middle section with branding */}
      <View className="flex-1 px-6 pt-4">
        <Animated.View entering={FadeInDown.delay(200).duration(800)}>
          <Text
            className="text-center font-bold mb-3"
            style={{
              fontSize: 48,
              letterSpacing: -1,
              color: '#006A6A',
              fontFamily: 'System'
            }}
          >
            Flow
          </Text>
        </Animated.View>

        <Animated.View entering={FadeInDown.delay(400).duration(800)}>
          <Text
            className="text-center mb-12"
            style={{
              fontSize: 16,
              color: 'rgba(0, 106, 106, 0.6)',
              fontFamily: 'System',
              fontWeight: '400'
            }}
          >
            Calm Financial Control
          </Text>
        </Animated.View>
      </View>

      {/* Bottom section with CTA buttons */}
      <SafeAreaView edges={['bottom']} className="px-6 pb-4">
        {/* Get Started Button */}
        <Animated.View entering={FadeInDown.delay(600).duration(800)}>
          <Pressable
            onPressIn={() => setButtonPressed(true)}
            onPressOut={() => setButtonPressed(false)}
            onPress={handleGetStarted}
            className="rounded-full py-5 items-center justify-center shadow-lg mb-3"
            style={{
              backgroundColor: '#006A6A',
              shadowColor: '#006A6A',
              shadowOffset: { width: 0, height: 8 },
              shadowOpacity: buttonPressed ? 0.15 : 0.3,
              shadowRadius: 16,
              elevation: 8,
              transform: [{ scale: buttonPressed ? 0.98 : 1 }],
            }}
          >
            <Text
              className="text-white font-semibold tracking-wide"
              style={{ fontSize: 17 }}
            >
              Get Started
            </Text>
          </Pressable>
        </Animated.View>

        {/* Login Link */}
        <Animated.View entering={FadeInDown.delay(800).duration(800)}>
          <Pressable
            onPress={() => router.push('/login')}
            className="py-3 items-center"
          >
            <Text
              className="font-medium"
              style={{ fontSize: 15, color: '#006A6A' }}
            >
              Already have an account? <Text className="font-semibold underline">Log in</Text>
            </Text>
          </Pressable>
        </Animated.View>

        {/* Terms hint */}
        <Animated.View entering={FadeIn.delay(1000).duration(800)}>
          <Text
            className="text-center mt-2 px-8 text-xs"
            style={{ color: 'rgba(0, 106, 106, 0.4)' }}
          >
            By continuing, you agree to our Terms of Service and Privacy Policy
          </Text>
        </Animated.View>
      </SafeAreaView>
    </View>
  );
}
