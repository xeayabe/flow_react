import React, { useEffect } from 'react';
import { View, Text, Pressable, Modal, Dimensions } from 'react-native';
import { CheckCircle2 } from 'lucide-react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  withSequence,
  withDelay,
  Easing,
  FadeIn,
  FadeInDown,
} from 'react-native-reanimated';

const { width, height } = Dimensions.get('window');

interface ConfettiParticle {
  id: number;
  x: number;
  delay: number;
  color: string;
  rotation: number;
}

function ConfettiPiece({ particle }: { particle: ConfettiParticle }) {
  const translateY = useSharedValue(-50);
  const translateX = useSharedValue(0);
  const opacity = useSharedValue(0);
  const rotate = useSharedValue(particle.rotation);

  useEffect(() => {
    const startAnimation = () => {
      translateY.value = withDelay(
        particle.delay,
        withTiming(height, {
          duration: 3000 + Math.random() * 2000,
          easing: Easing.bezier(0.25, 0.1, 0.25, 1),
        })
      );

      translateX.value = withDelay(
        particle.delay,
        withSequence(
          withTiming(20, { duration: 1000 }),
          withTiming(-20, { duration: 1000 }),
          withTiming(10, { duration: 1000 })
        )
      );

      opacity.value = withDelay(
        particle.delay,
        withSequence(
          withTiming(1, { duration: 300 }),
          withDelay(2000, withTiming(0, { duration: 1000 }))
        )
      );

      rotate.value = withDelay(
        particle.delay,
        withTiming(particle.rotation + 360, {
          duration: 3000,
          easing: Easing.linear,
        })
      );
    };

    startAnimation();
  }, []);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [
      { translateY: translateY.value },
      { translateX: translateX.value },
      { rotate: `${rotate.value}deg` },
    ],
    opacity: opacity.value,
  }));

  return (
    <Animated.View
      style={[
        {
          position: 'absolute',
          left: particle.x,
          top: 0,
          width: 8,
          height: 8,
          borderRadius: 2,
          backgroundColor: particle.color,
        },
        animatedStyle,
      ]}
    />
  );
}

function CheckmarkAnimation() {
  const scale = useSharedValue(0);
  const rotate = useSharedValue(-180);
  const circleScale = useSharedValue(0);

  useEffect(() => {
    circleScale.value = withDelay(
      200,
      withSpring(1, {
        damping: 12,
        stiffness: 100,
      })
    );

    scale.value = withDelay(
      400,
      withSpring(1, {
        damping: 10,
        stiffness: 150,
      })
    );

    rotate.value = withDelay(
      400,
      withSpring(0, {
        damping: 12,
        stiffness: 100,
      })
    );
  }, []);

  const checkmarkStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }, { rotate: `${rotate.value}deg` }],
  }));

  const circleStyle = useAnimatedStyle(() => ({
    transform: [{ scale: circleScale.value }],
  }));

  return (
    <Animated.View style={[{ width: 120, height: 120 }, circleStyle]}>
      <View
        className="items-center justify-center rounded-full"
        style={{
          width: 120,
          height: 120,
          backgroundColor: '#006A6A',
        }}
      >
        <Animated.View style={checkmarkStyle}>
          <CheckCircle2 size={64} color="white" fill="white" />
        </Animated.View>
      </View>
    </Animated.View>
  );
}

interface SuccessModalProps {
  visible: boolean;
  onContinue: () => void;
}

export default function SuccessModal({ visible, onContinue }: SuccessModalProps) {
  const [confetti, setConfetti] = React.useState<ConfettiParticle[]>([]);

  useEffect(() => {
    if (visible) {
      // Generate confetti particles
      const particles: ConfettiParticle[] = [];
      const colors = ['#8B9D8B', '#C4B5FD', '#006A6A']; // sage green, soft lavender, deep teal

      for (let i = 0; i < 25; i++) {
        particles.push({
          id: i,
          x: Math.random() * width,
          delay: Math.random() * 800,
          color: colors[Math.floor(Math.random() * colors.length)],
          rotation: Math.random() * 360,
        });
      }

      setConfetti(particles);
    }
  }, [visible]);

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      statusBarTranslucent
    >
      <View
        className="flex-1 items-center justify-center"
        style={{ backgroundColor: 'rgba(0, 0, 0, 0.2)' }}
      >
        {/* Confetti Background */}
        {confetti.map((particle) => (
          <ConfettiPiece key={particle.id} particle={particle} />
        ))}

        {/* Modal Card */}
        <Animated.View
          entering={FadeIn.delay(100).duration(300)}
          className="mx-6 rounded-3xl bg-white p-8"
          style={{
            width: width - 48,
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 8 },
            shadowOpacity: 0.15,
            shadowRadius: 24,
            elevation: 12,
          }}
        >
          {/* Animated Checkmark */}
          <View className="items-center mb-6">
            <CheckmarkAnimation />
          </View>

          {/* Header */}
          <Animated.View entering={FadeInDown.delay(600).duration(600)}>
            <Text
              className="text-center font-bold mb-3"
              style={{
                fontSize: 20,
                color: '#006A6A',
                letterSpacing: -0.5,
              }}
            >
              Welcome to Flow!
            </Text>
          </Animated.View>

          {/* Body Text */}
          <Animated.View entering={FadeInDown.delay(800).duration(600)}>
            <Text
              className="text-center mb-8"
              style={{
                fontSize: 14,
                color: 'rgba(31, 41, 55, 0.7)',
                lineHeight: 20,
              }}
            >
              Your account is ready. Let's build your first budget together.
            </Text>
          </Animated.View>

          {/* CTA Button */}
          <Animated.View entering={FadeInDown.delay(1000).duration(600)}>
            <Pressable
              onPress={onContinue}
              className="rounded-full py-4 items-center justify-center"
              style={{
                backgroundColor: '#006A6A',
                shadowColor: '#006A6A',
                shadowOffset: { width: 0, height: 4 },
                shadowOpacity: 0.3,
                shadowRadius: 12,
                elevation: 6,
              }}
            >
              <Text
                className="text-base font-semibold text-white"
                style={{ fontSize: 16 }}
              >
                Start Budgeting
              </Text>
            </Pressable>
          </Animated.View>
        </Animated.View>
      </View>
    </Modal>
  );
}
