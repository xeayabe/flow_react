import React, { useMemo } from 'react';
import {
  View,
  Text,
  Pressable,
  ScrollView,
  Modal,
} from 'react-native';
import { useSharedValue, useAnimatedStyle, withSpring } from 'react-native-reanimated';
import Animated from 'react-native-reanimated';
import { type Institution } from '@/lib/accounts-api';

const INSTITUTION_EMOJIS: Record<string, string> = {
  'UBS': '🏦',
  'Credit Suisse': '🏦',
  'Revolut': '💳',
  'PostFinance': '📮',
  'Raiffeisen': '🏦',
  'Cash': '💵',
  'Other': '➕',
};

interface InstitutionPickerProps {
  visible: boolean;
  selectedInstitution: Institution | '';
  institutions: readonly Institution[];
  onSelect: (institution: Institution) => void;
  onClose: () => void;
}

export function InstitutionPicker({
  visible,
  selectedInstitution,
  institutions,
  onSelect,
  onClose,
}: InstitutionPickerProps) {
  const translateY = useSharedValue(600);

  React.useEffect(() => {
    if (visible) {
      translateY.value = withSpring(0, {
        damping: 14,
        mass: 1,
        stiffness: 100,
      });
    } else {
      translateY.value = withSpring(600, {
        damping: 14,
        mass: 1,
        stiffness: 100,
      });
    }
  }, [visible]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
  }));

  const handleSelectInstitution = (institution: Institution) => {
    onSelect(institution);
    onClose();
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      onRequestClose={onClose}
    >
      {/* Dimmed Overlay */}
      <Pressable
        className="absolute inset-0 bg-black/30"
        onPress={onClose}
      />

      {/* Bottom Sheet */}
      <Animated.View
        style={[
          {
            position: 'absolute',
            bottom: 0,
            left: 0,
            right: 0,
          },
          animatedStyle,
        ]}
      >
        <View
          className="bg-white rounded-t-3xl"
          style={{
            minHeight: 400,
            maxHeight: '80%',
            shadowColor: '#000',
            shadowOffset: { width: 0, height: -4 },
            shadowOpacity: 0.1,
            shadowRadius: 20,
            elevation: 10,
          }}
        >
          {/* Handle Indicator */}
          <View className="pt-3 pb-2 items-center">
            <View
              style={{
                width: 32,
                height: 4,
                backgroundColor: '#D1D5DB',
                borderRadius: 2,
              }}
            />
          </View>

          {/* Header */}
          <View className="px-6 py-6 border-b" style={{ borderBottomColor: '#F3F4F6' }}>
            <Text
              className="text-2xl font-bold text-center"
              style={{ color: '#006A6A' }}
            >
              Select Institution
            </Text>
          </View>

          {/* List */}
          <ScrollView
            className="flex-1"
            contentContainerStyle={{ paddingVertical: 8 }}
            showsVerticalScrollIndicator={false}
          >
            {institutions.map((institution) => {
              const isSelected = selectedInstitution === institution;
              const emoji = INSTITUTION_EMOJIS[institution] || '🏦';

              return (
                <Pressable
                  key={institution}
                  onPress={() => handleSelectInstitution(institution)}
                  className="px-4 py-4"
                >
                  {({ pressed }) => (
                    <View
                      className="flex-row items-center px-4 py-3 rounded-2xl"
                      style={{
                        backgroundColor: pressed
                          ? 'rgba(196, 181, 253, 0.15)'
                          : isSelected
                            ? 'rgba(196, 181, 253, 0.1)'
                            : 'transparent',
                        height: 56,
                      }}
                    >
                      {/* Emoji Icon */}
                      <Text className="text-2xl mr-4">{emoji}</Text>

                      {/* Institution Name */}
                      <Text
                        className="text-base flex-1 font-medium"
                        style={{
                          color: isSelected ? '#006A6A' : '#374151',
                        }}
                      >
                        {institution}
                      </Text>

                      {/* Radio Button */}
                      <View
                        className="w-5 h-5 rounded-full border-2 items-center justify-center"
                        style={{
                          borderColor: isSelected ? '#006A6A' : '#D1D5DB',
                          backgroundColor: isSelected ? '#006A6A' : 'transparent',
                        }}
                      >
                        {isSelected && (
                          <View
                            className="w-2 h-2 rounded-full"
                            style={{ backgroundColor: 'white' }}
                          />
                        )}
                      </View>
                    </View>
                  )}
                </Pressable>
              );
            })}
          </ScrollView>
        </View>
      </Animated.View>
    </Modal>
  );
}
