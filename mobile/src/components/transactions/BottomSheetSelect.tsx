import React, { useState } from 'react';
import { View, Text, Pressable, Modal, ScrollView } from 'react-native';
import Animated, { FadeIn, FadeOut, SlideInDown, SlideOutDown } from 'react-native-reanimated';
import { ChevronRight, Check } from 'lucide-react-native';

interface BottomSheetSelectProps {
  label: string;
  options: Array<{
    id: string;
    name: string;
    icon?: string; // emoji or icon
    meta?: string; // secondary text (e.g., "UBS • Checking")
  }>;
  value: string | null;
  onChange: (value: string) => void;
  placeholder?: string;
}

export default function BottomSheetSelect({
  label,
  options,
  value,
  onChange,
  placeholder = '-- Select --',
}: BottomSheetSelectProps) {
  const [isOpen, setIsOpen] = useState(false);

  const selectedOption = options.find((opt) => opt.id === value);

  const handleSelect = (optionId: string) => {
    onChange(optionId);
    setIsOpen(false);
  };

  return (
    <>
      {/* Trigger Button */}
      <Pressable
        onPress={() => setIsOpen(true)}
        className="flex-row items-center justify-between rounded-xl"
        style={{
          backgroundColor: 'rgba(255,255,255,0.05)',
          borderWidth: 1,
          borderColor: 'rgba(255,255,255,0.1)',
          padding: 12,
        }}
      >
        <View className="flex-1">
          <Text
            className="text-sm"
            style={{ color: selectedOption ? 'rgba(255,255,255,0.9)' : 'rgba(255,255,255,0.5)' }}
          >
            {selectedOption ? selectedOption.name : placeholder}
          </Text>
          {selectedOption?.meta && (
            <Text className="text-xs mt-0.5" style={{ color: 'rgba(255,255,255,0.5)' }}>
              {selectedOption.meta}
            </Text>
          )}
        </View>
        <ChevronRight size={20} color="rgba(255,255,255,0.5)" />
      </Pressable>

      {/* Bottom Sheet Modal */}
      <Modal
        visible={isOpen}
        transparent
        animationType="none"
        onRequestClose={() => setIsOpen(false)}
      >
        {/* Backdrop */}
        <Animated.View
          entering={FadeIn.duration(300)}
          exiting={FadeOut.duration(200)}
          style={{
            flex: 1,
            backgroundColor: 'rgba(0,0,0,0.6)',
          }}
        >
          <Pressable
            style={{ flex: 1 }}
            onPress={() => setIsOpen(false)}
          />

          {/* Bottom Sheet */}
          <Animated.View
            entering={SlideInDown.duration(300).springify()}
            exiting={SlideOutDown.duration(200)}
            style={{
              position: 'absolute',
              bottom: 0,
              left: 0,
              right: 0,
              maxHeight: '70%',
              backgroundColor: '#1A1C1E',
              borderTopLeftRadius: 24,
              borderTopRightRadius: 24,
              paddingBottom: 40,
            }}
          >
            {/* Handle */}
            <View className="items-center pt-3 pb-2">
              <View
                style={{
                  width: 40,
                  height: 4,
                  backgroundColor: 'rgba(255,255,255,0.3)',
                  borderRadius: 2,
                }}
              />
            </View>

            {/* Header */}
            <View className="px-5 pb-3">
              <Text
                className="text-lg font-bold"
                style={{ color: 'rgba(255,255,255,0.95)' }}
              >
                {label}
              </Text>
            </View>

            {/* Options List */}
            <ScrollView
              style={{ maxHeight: '100%' }}
              contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 20 }}
              showsVerticalScrollIndicator={false}
            >
              {options.map((option) => {
                const isSelected = option.id === value;

                return (
                  <Pressable
                    key={option.id}
                    onPress={() => handleSelect(option.id)}
                    className="flex-row items-center justify-between rounded-xl mb-2"
                    style={{
                      backgroundColor: isSelected
                        ? 'rgba(44,95,93,0.2)'
                        : 'rgba(255,255,255,0.03)',
                      borderWidth: 1,
                      borderColor: isSelected ? '#2C5F5D' : 'rgba(255,255,255,0.05)',
                      padding: 14,
                    }}
                  >
                    <View className="flex-1">
                      <Text
                        className="text-sm font-medium"
                        style={{ color: 'rgba(255,255,255,0.9)' }}
                      >
                        {option.name}
                      </Text>
                      {option.meta && (
                        <Text
                          className="text-xs mt-0.5"
                          style={{ color: 'rgba(255,255,255,0.5)' }}
                        >
                          {option.meta}
                        </Text>
                      )}
                    </View>

                    {isSelected && (
                      <Check size={20} color="#2C5F5D" strokeWidth={3} />
                    )}
                  </Pressable>
                );
              })}
            </ScrollView>
          </Animated.View>
        </Animated.View>
      </Modal>
    </>
  );
}
