import React, { useState } from 'react';
import { View, Text, Pressable, LayoutAnimation, Platform, UIManager } from 'react-native';
import { useRouter } from 'expo-router';
import { Receipt, ChevronDown, Plus } from 'lucide-react-native';
import { GlassCard } from '@/components/ui/Glass';
import { TransactionItem } from './TransactionItem';
import { colors } from '@/lib/design-tokens';

// Enable LayoutAnimation on Android
if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

interface Transaction {
  id: string;
  name: string;
  emoji: string;
  category: string;
  amount: number;
  date: string; // ISO date string
  isShared?: boolean;
}

interface RecentTransactionsCardProps {
  transactions: Transaction[];
  maxItems?: number;
}

/**
 * Format date for display
 * Returns "Today", "Yesterday", or formatted date like "Jan 15"
 */
function formatDisplayDate(dateString: string): string {
  const date = new Date(dateString);
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);

  // Reset times for comparison
  const dateOnly = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const todayOnly = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  const yesterdayOnly = new Date(yesterday.getFullYear(), yesterday.getMonth(), yesterday.getDate());

  if (dateOnly.getTime() === todayOnly.getTime()) {
    return 'Today';
  }
  if (dateOnly.getTime() === yesterdayOnly.getTime()) {
    return 'Yesterday';
  }

  // Format as "Jan 15"
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

/**
 * Recent Transactions Card - Collapsible card showing latest transactions
 * Uses neutral colors for amounts (NO RED for expenses!)
 */
export function RecentTransactionsCard({
  transactions,
  maxItems = 10,
}: RecentTransactionsCardProps) {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(true);

  // Sort by date (newest first) and limit
  const sortedTransactions = [...transactions]
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    .slice(0, maxItems);

  const toggleOpen = () => {
    LayoutAnimation.configureNext(
      LayoutAnimation.create(
        300,
        LayoutAnimation.Types.easeInEaseOut,
        LayoutAnimation.Properties.opacity
      )
    );
    setIsOpen(!isOpen);
  };

  const handleTransactionPress = (transactionId: string) => {
    router.push(`/transactions/${transactionId}/edit`);
  };

  const handleAddTransaction = () => {
    router.push('/transactions/add');
  };

  const handleViewAll = () => {
    router.push('/(tabs)/transactions');
  };

  return (
    <GlassCard hover={false}>
      {/* Header */}
      <Pressable
        onPress={toggleOpen}
        className="w-full flex-row justify-between items-center p-5"
        style={({ pressed }) => ({
          backgroundColor: pressed ? 'rgba(255, 255, 255, 0.05)' : 'transparent',
        })}
      >
        <View className="flex-row items-center">
          <Receipt
            size={20}
            color={colors.contextSage}
            strokeWidth={1.5}
          />
          <Text
            className="text-white font-medium ml-3"
            style={{
              fontSize: 15,
              letterSpacing: 0.5,
            }}
          >
            Recent Transactions
          </Text>
        </View>

        <View className="flex-row items-center">
          <Text
            className="text-white/60 mr-3"
            style={{ fontSize: 12 }}
          >
            {transactions.length} total
          </Text>
          <ChevronDown
            size={16}
            color="white"
            strokeWidth={1.5}
            style={{
              transform: [{ rotate: isOpen ? '180deg' : '0deg' }],
            }}
          />
        </View>
      </Pressable>

      {/* Collapsible Content */}
      {isOpen && (
        <View className="border-t border-white/5">
          {/* Transaction List */}
          {sortedTransactions.length > 0 ? (
            <>
              {sortedTransactions.map((transaction, index) => (
                <TransactionItem
                  key={transaction.id}
                  emoji={transaction.emoji}
                  name={transaction.name}
                  category={transaction.category}
                  date={formatDisplayDate(transaction.date)}
                  amount={transaction.amount}
                  isShared={transaction.isShared}
                  onPress={() => handleTransactionPress(transaction.id)}
                  animationDelay={index * 50}
                />
              ))}

              {/* View All / Add buttons */}
              <View className="flex-row gap-3 px-4 pb-4 pt-2">
                <Pressable
                  onPress={handleViewAll}
                  className="flex-1 py-3 rounded-xl bg-white/[0.03] border border-white/5 items-center"
                  style={({ pressed }) => ({
                    backgroundColor: pressed ? 'rgba(255, 255, 255, 0.06)' : 'rgba(255, 255, 255, 0.03)',
                  })}
                >
                  <Text className="text-white/60 font-medium" style={{ fontSize: 14 }}>
                    View All
                  </Text>
                </Pressable>
                <Pressable
                  onPress={handleAddTransaction}
                  className="flex-1 flex-row py-3 rounded-xl items-center justify-center gap-2"
                  style={({ pressed }) => ({
                    backgroundColor: pressed ? colors.contextTeal : 'rgba(44, 95, 93, 0.8)',
                  })}
                >
                  <Plus size={16} color="white" />
                  <Text className="text-white font-medium" style={{ fontSize: 14 }}>
                    Add New
                  </Text>
                </Pressable>
              </View>
            </>
          ) : (
            /* Empty state */
            <View className="items-center py-8 px-4">
              <Text className="text-4xl mb-3">📝</Text>
              <Text className="text-white/70 text-sm text-center mb-4">
                No transactions yet. Add your first transaction to start tracking!
              </Text>
              <Pressable
                onPress={handleAddTransaction}
                className="flex-row py-3 px-6 rounded-xl items-center justify-center gap-2"
                style={({ pressed }) => ({
                  backgroundColor: pressed ? colors.contextTeal : 'rgba(44, 95, 93, 0.8)',
                })}
              >
                <Plus size={16} color="white" />
                <Text className="text-white font-medium" style={{ fontSize: 14 }}>
                  Add Transaction
                </Text>
              </Pressable>
            </View>
          )}
        </View>
      )}
    </GlassCard>
  );
}
