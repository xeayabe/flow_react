import React, { useState } from 'react';
import { View, Text, Pressable, Modal, TextInput, ScrollView } from 'react-native';
import { X, Search, Plus, Store } from 'lucide-react-native';
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
        mappedPayees.set(mapping.payee, {
          payee: mapping.payee,
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
              lastUsedAt: tx.createdAt
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
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <View className="flex-1 bg-white">
        {/* Header */}
        <View className="flex-row items-center justify-between p-4 border-b border-gray-200">
          <Text className="text-xl font-bold">Choose Payee</Text>
          <Pressable onPress={onClose} className="p-2">
            <X size={24} color="#374151" />
          </Pressable>
        </View>

        {/* Search Bar */}
        <View className="p-4 border-b border-gray-200">
          <View className="flex-row items-center bg-gray-100 rounded-xl px-3 py-2">
            <Search size={20} color="#6B7280" />
            <TextInput
              value={searchQuery}
              onChangeText={setSearchQuery}
              placeholder="Search or create payee..."
              autoFocus
              autoCapitalize="words"
              className="flex-1 ml-2 text-base"
            />
            {searchQuery.length > 0 && (
              <Pressable onPress={() => setSearchQuery('')}>
                <X size={20} color="#6B7280" />
              </Pressable>
            )}
          </View>
        </View>

        {/* Payee List */}
        <ScrollView className="flex-1">
          {filteredPayees.length > 0 && (
            <View className="p-4">
              <Text className="text-xs text-gray-500 font-semibold mb-2 uppercase">
                {searchQuery ? 'Matches' : 'All Payees (A-Z)'}
              </Text>

              {filteredPayees.map((payee) => (
                <Pressable
                  key={payee.payee}
                  onPress={() => handleSelectPayee(payee.payee)}
                  className={`flex-row items-center justify-between p-4 rounded-xl mb-2 ${
                    currentPayee?.toLowerCase() === payee.payee.toLowerCase()
                      ? 'bg-teal-50 border-2 border-teal-600'
                      : 'bg-gray-50'
                  }`}
                >
                  <View className="flex-row items-center gap-3 flex-1">
                    <Store size={20} color="#006A6A" />
                    <Text className="text-base font-medium text-gray-900">
                      {payee.payee}
                    </Text>
                  </View>
                  <Text className="text-xs text-gray-500">
                    {payee.usageCount} {payee.usageCount === 1 ? 'use' : 'uses'}
                  </Text>
                </Pressable>
              ))}
            </View>
          )}

          {/* Create New Option */}
          {searchQuery.trim() && !exactMatch && (
            <View className="p-4">
              <Text className="text-xs text-gray-500 font-semibold mb-2 uppercase">
                Create New
              </Text>
              <Pressable
                onPress={handleCreateNew}
                className="flex-row items-center gap-3 p-4 rounded-xl bg-teal-50 border-2 border-dashed border-teal-600"
              >
                <Plus size={20} color="#006A6A" />
                <Text className="text-base font-semibold text-teal-900">
                  Create "{searchQuery.trim()}"
                </Text>
              </Pressable>
            </View>
          )}

          {/* Empty State */}
          {!searchQuery && filteredPayees.length === 0 && (
            <View className="p-8 items-center">
              <Store size={48} color="#D1D5DB" />
              <Text className="text-gray-500 text-center mt-4">
                No payees yet
              </Text>
              <Text className="text-gray-400 text-center text-sm mt-1">
                Start typing to create your first payee
              </Text>
            </View>
          )}
        </ScrollView>
      </View>
    </Modal>
  );
}
