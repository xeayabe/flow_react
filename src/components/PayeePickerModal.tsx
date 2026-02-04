import React, { useState } from 'react';
import { View, Text, Pressable, Modal, TextInput, ScrollView } from 'react-native';
import Animated, { FadeIn, FadeOut, SlideInDown, SlideOutDown } from 'react-native-reanimated';
import { X, Search, Plus, Store, Check } from 'lucide-react-native';
import { useQuery } from '@tanstack/react-query';
import { db } from '@/lib/db';

interface PayeePickerModalProps {
  visible: boolean;
  onClose: () => void;
  onSelectPayee: (payee: string) => void;
  userId: string;
  currentPayee?: string;
}

interface PayeeWithStats {
  payee: string;
  usageCount: number;
  lastUsedAt: number;
}

export default function PayeePickerModal({
  visible,
  onClose,
  onSelectPayee,
  userId,
  currentPayee
}: PayeePickerModalProps) {
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Load all payees with usage stats
  const { data: payees } = useQuery({
    queryKey: ['all-payees', userId],
    queryFn: async () => {
      // Get all payee mappings (has usage stats) - personal to user
      const { data: mappingData } = await db.queryOnce({
        payee_category_mappings: {
          $: {
            where: { userId }
          }
        }
      });

      // Also get payees from user's transactions not yet in mappings
      const { data: txData } = await db.queryOnce({
        transactions: {
          $: {
            where: { userId },
            limit: 200
          }
        }
      });

      // Combine both sources
      const mappedPayees = new Map<string, PayeeWithStats>();

      // Add from mappings (has accurate usage count)
      mappingData.payee_category_mappings?.forEach(mapping => {
        const normalized = mapping.payee.trim().toLowerCase();
        mappedPayees.set(normalized, {
          payee: mapping.displayName || mapping.payee, // Use displayName if available
          usageCount: mapping.usageCount || 1,
          lastUsedAt: mapping.lastUsedAt
        });
      });

      // Add any transaction payees not in mappings
      txData.transactions.forEach(tx => {
        if (tx.payee) {
          const normalized = tx.payee.trim().toLowerCase();
          if (!mappedPayees.has(normalized)) {
            mappedPayees.set(normalized, {
              payee: tx.payee, // Use original casing
              usageCount: 1,
              lastUsedAt: Date.now(), // Use current time since createdAt doesn't exist
            });
          }
        }
      });

      // Convert to array and sort alphabetically (A-Z)
      return Array.from(mappedPayees.values())
        .sort((a, b) => a.payee.localeCompare(b.payee));
    },
    enabled: visible && !!userId
  });

  // Filter payees based on search
  const filteredPayees = payees?.filter(p =>
    p.payee.toLowerCase().includes(searchQuery.toLowerCase())
  ) || [];

  // Check if search query exactly matches any payee
  const exactMatch = filteredPayees.find(
    p => p.payee.toLowerCase() === searchQuery.toLowerCase()
  );

  const handleSelectPayee = (payee: string) => {
    onSelectPayee(payee);
    setSearchQuery('');
    onClose();
  };

  const handleCreateNew = () => {
    if (searchQuery.trim()) {
      onSelectPayee(searchQuery.trim());
      setSearchQuery('');
      onClose();
    }
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      onRequestClose={onClose}
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
          onPress={onClose}
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
              Select Payee
            </Text>
          </View>

          {/* Search Bar */}
          <View className="px-4 pb-3">
            <View
              className="flex-row items-center rounded-xl px-3 py-3"
              style={{
                backgroundColor: 'rgba(255,255,255,0.05)',
                borderWidth: 1,
                borderColor: 'rgba(255,255,255,0.1)',
              }}
            >
              <Search size={18} color="rgba(255,255,255,0.5)" />
              <TextInput
                value={searchQuery}
                onChangeText={setSearchQuery}
                placeholder="Search or add new payee..."
                placeholderTextColor="rgba(255,255,255,0.3)"
                autoFocus
                autoCapitalize="words"
                className="flex-1 ml-2 text-sm"
                style={{ color: 'rgba(255,255,255,0.9)' }}
              />
              {searchQuery.length > 0 && (
                <Pressable onPress={() => setSearchQuery('')}>
                  <X size={18} color="rgba(255,255,255,0.5)" />
                </Pressable>
              )}
            </View>
          </View>

          {/* Payee List */}
          <ScrollView
            style={{ maxHeight: '100%' }}
            contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 20 }}
            showsVerticalScrollIndicator={false}
          >
            {filteredPayees.length > 0 && (
              <>
                <Text
                  className="text-xs font-semibold mb-2 px-1"
                  style={{
                    color: 'rgba(255,255,255,0.5)',
                    textTransform: 'uppercase',
                    letterSpacing: 1,
                  }}
                >
                  {searchQuery ? 'Matches' : 'All Payees (A-Z)'}
                </Text>

                {filteredPayees.map((payee) => {
                  const isSelected = currentPayee?.toLowerCase() === payee.payee.toLowerCase();

                  return (
                    <Pressable
                      key={payee.payee}
                      onPress={() => handleSelectPayee(payee.payee)}
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
                      <View className="flex-row items-center flex-1">
                        <Store size={20} color="rgba(168,181,161,0.8)" style={{ marginRight: 12 }} />
                        <View className="flex-1">
                          <Text
                            className="text-sm font-medium"
                            style={{ color: 'rgba(255,255,255,0.9)' }}
                          >
                            {payee.payee}
                          </Text>
                          <Text className="text-xs mt-0.5" style={{ color: 'rgba(255,255,255,0.5)' }}>
                            {payee.usageCount} {payee.usageCount === 1 ? 'use' : 'uses'}
                          </Text>
                        </View>
                      </View>

                      {isSelected && (
                        <Check size={20} color="#2C5F5D" strokeWidth={3} />
                      )}
                    </Pressable>
                  );
                })}
              </>
            )}

            {/* Create New Option */}
            {searchQuery.trim() && !exactMatch && (
              <>
                <Text
                  className="text-xs font-semibold mb-2 px-1 mt-3"
                  style={{
                    color: 'rgba(255,255,255,0.5)',
                    textTransform: 'uppercase',
                    letterSpacing: 1,
                  }}
                >
                  Create New
                </Text>
                <Pressable
                  onPress={handleCreateNew}
                  className="flex-row items-center rounded-xl"
                  style={{
                    backgroundColor: 'rgba(44,95,93,0.15)',
                    borderWidth: 2,
                    borderStyle: 'dashed',
                    borderColor: '#2C5F5D',
                    padding: 14,
                  }}
                >
                  <Plus size={20} color="#A8B5A1" style={{ marginRight: 12 }} />
                  <Text
                    className="text-sm font-semibold"
                    style={{ color: 'rgba(168,181,161,0.95)' }}
                  >
                    Add "{searchQuery.trim()}"
                  </Text>
                </Pressable>
              </>
            )}

            {/* Empty State */}
            {!searchQuery && filteredPayees.length === 0 && (
              <View className="items-center py-8">
                <Store size={48} color="rgba(255,255,255,0.2)" />
                <Text className="text-center mt-4" style={{ color: 'rgba(255,255,255,0.7)' }}>
                  No payees yet
                </Text>
                <Text className="text-center text-xs mt-1" style={{ color: 'rgba(255,255,255,0.5)' }}>
                  Start typing to create your first payee
                </Text>
              </View>
            )}
          </ScrollView>
        </Animated.View>
      </Animated.View>
    </Modal>
  );
}
