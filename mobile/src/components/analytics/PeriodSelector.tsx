import React, { useState } from 'react';
import { View, Text, StyleSheet, Pressable, Modal } from 'react-native';
import { colors } from '@/constants/colors';
import { DateRangeOption } from '@/lib/analytics-api';

interface PeriodOption {
  value: DateRangeOption;
  label: string;
}

const PERIOD_OPTIONS: PeriodOption[] = [
  { value: 'this_month', label: 'This Period' },
  { value: 'last_month', label: 'Last Period' },
  { value: 'last_3_months', label: 'Last 3 Months' },
  { value: 'last_6_months', label: 'Last 6 Months' },
  { value: 'this_year', label: 'This Year' },
  { value: 'all_time', label: 'All Time' },
];

interface PeriodSelectorProps {
  selectedPeriod: DateRangeOption;
  onPeriodChange: (period: DateRangeOption) => void;
}

export function PeriodSelector({ selectedPeriod, onPeriodChange }: PeriodSelectorProps) {
  const [modalVisible, setModalVisible] = useState(false);

  const selectedOption = PERIOD_OPTIONS.find(opt => opt.value === selectedPeriod);

  const handleSelect = (period: DateRangeOption) => {
    onPeriodChange(period);
    setModalVisible(false);
  };

  return (
    <>
      <Pressable
        style={styles.selector}
        onPress={() => setModalVisible(true)}
      >
        <Text style={styles.selectorText}>{selectedOption?.label || 'This Period'}</Text>
        <Text style={styles.chevron}>▼</Text>
      </Pressable>

      <Modal
        visible={modalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setModalVisible(false)}
      >
        <Pressable
          style={styles.modalOverlay}
          onPress={() => setModalVisible(false)}
        >
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Select Period</Text>

            {PERIOD_OPTIONS.map((option) => (
              <Pressable
                key={option.value}
                style={[
                  styles.option,
                  selectedPeriod === option.value && styles.optionSelected,
                ]}
                onPress={() => handleSelect(option.value)}
              >
                <Text
                  style={[
                    styles.optionText,
                    selectedPeriod === option.value && styles.optionTextSelected,
                  ]}
                >
                  {option.label}
                </Text>
                {selectedPeriod === option.value && (
                  <Text style={styles.checkmark}>✓</Text>
                )}
              </Pressable>
            ))}
          </View>
        </Pressable>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  selector: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    marginBottom: 16,
  },
  selectorText: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.textWhite,
  },
  chevron: {
    fontSize: 10,
    color: colors.textWhiteSecondary,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: colors.contextDark,
    borderRadius: 16,
    padding: 8,
    width: '80%',
    maxWidth: 320,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.textWhite,
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.1)',
  },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderRadius: 8,
  },
  optionSelected: {
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
  },
  optionText: {
    fontSize: 16,
    color: colors.textWhite,
  },
  optionTextSelected: {
    fontWeight: '600',
    color: colors.contextTeal,
  },
  checkmark: {
    fontSize: 18,
    color: colors.contextTeal,
  },
});
