import React from 'react';
import {
  View,
  Text,
  Pressable,
  ScrollView,
  Modal,
} from 'react-native';
import { useSharedValue, useAnimatedStyle, withSpring } from 'react-native-reanimated';
import Animated from 'react-native-reanimated';
import { type AccountType } from '@/lib/accounts-api';
import { colors } from '@/lib/design-tokens';

const ACCOUNT_TYPE_ICONS: Record<string, string> = {
  'Checking': '💳',
  'Savings': '🏦',
  'Credit Card': '💳',
  'Cash': '💵',
  'Investment': '📈',
};

interface WalletTypePickerProps {
  visible: boolean;
  selectedAccountType: AccountType | '';
  accountTypes: readonly AccountType[];
  onSelect: (accountType: AccountType) => void;
  onClose: () => void;
}

export function WalletTypePicker({
  visible,
  selectedAccountType,
  accountTypes,
  onSelect,
  onClose,
}: WalletTypePickerProps) {
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

  const handleSelectAccountType = (accountType: AccountType) => {
    onSelect(accountType);
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
        className="absolute inset-0"
        style={{ backgroundColor: 'rgba(0, 0, 0, 0.5)' }}
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
          className="rounded-t-3xl"
          style={{
            minHeight: 400,
            maxHeight: '80%',
            backgroundColor: colors.contextDark,
            borderTopWidth: 1,
            borderTopColor: 'rgba(255, 255, 255, 0.1)',
          }}
        >
          {/* Handle Indicator */}
          <View className="pt-3 pb-2 items-center">
            <View
              style={{
                width: 32,
                height: 4,
                backgroundColor: 'rgba(255, 255, 255, 0.2)',
                borderRadius: 2,
              }}
            />
          </View>

          {/* Header */}
          <View className="px-6 py-5 border-b" style={{ borderBottomColor: 'rgba(255, 255, 255, 0.05)' }}>
            <Text
              className="text-xl font-semibold text-center"
              style={{ color: colors.textWhite }}
            >
              Select Wallet Type
            </Text>
          </View>

          {/* List */}
          <ScrollView
            className="flex-1"
            contentContainerStyle={{ paddingVertical: 8, paddingBottom: 40 }}
            showsVerticalScrollIndicator={false}
          >
            {accountTypes.map((accountType: AccountType) => {
              const isSelected = selectedAccountType === accountType;
              const icon = ACCOUNT_TYPE_ICONS[accountType] || '💼';

              return (
                <Pressable
                  key={accountType}
                  onPress={() => handleSelectAccountType(accountType)}
                  className="px-4 py-2"
                >
                  {({ pressed }) => (
                    <View
                      className="flex-row items-center px-4 py-3 rounded-xl"
                      style={{
                        backgroundColor: pressed
                          ? 'rgba(44, 95, 93, 0.3)'
                          : isSelected
                            ? 'rgba(44, 95, 93, 0.2)'
                            : 'transparent',
                        height: 56,
                      }}
                    >
                      {/* Icon */}
                      <Text className="text-2xl mr-4">{icon}</Text>

                      {/* Account Type Name */}
                      <Text
                        className="text-base flex-1 font-medium"
                        style={{
                          color: isSelected ? colors.sageGreen : colors.textWhite,
                        }}
                      >
                        {accountType}
                      </Text>

                      {/* Radio Button */}
                      <View
                        className="w-5 h-5 rounded-full border-2 items-center justify-center"
                        style={{
                          borderColor: isSelected ? colors.sageGreen : colors.textWhiteDisabled,
                          backgroundColor: isSelected ? colors.contextTeal : 'transparent',
                        }}
                      >
                        {isSelected && (
                          <View
                            className="w-2 h-2 rounded-full"
                            style={{ backgroundColor: colors.sageGreen }}
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

// Backward compatibility export
export { WalletTypePicker as AccountTypePicker };
