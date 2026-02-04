import React, { useState } from 'react';
import { View, Text, Pressable } from 'react-native';
import Animated, { FadeIn, FadeOut, SlideInDown, SlideOutUp } from 'react-native-reanimated';
import { Calendar, ChevronLeft, ChevronRight } from 'lucide-react-native';

interface ExpandableCalendarProps {
  value: Date;
  onChange: (date: Date) => void;
  minDate?: Date;
  maxDate?: Date;
}

export default function ExpandableCalendar({
  value,
  onChange,
  minDate,
  maxDate,
}: ExpandableCalendarProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [displayMonth, setDisplayMonth] = useState(new Date(value));

  const handleDateSelect = (date: Date) => {
    onChange(date);
    setIsExpanded(false);
  };

  const goToPreviousMonth = () => {
    const prev = new Date(displayMonth);
    prev.setMonth(prev.getMonth() - 1);
    setDisplayMonth(prev);
  };

  const goToNextMonth = () => {
    const next = new Date(displayMonth);
    next.setMonth(next.getMonth() + 1);
    setDisplayMonth(next);
  };

  // Format date for display
  const formatDateDisplay = (date: Date): string => {
    const today = new Date();
    const isToday =
      date.getDate() === today.getDate() &&
      date.getMonth() === today.getMonth() &&
      date.getFullYear() === today.getFullYear();

    if (isToday) {
      return `Today, ${date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`;
    }

    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  // Generate calendar days
  const generateCalendarDays = () => {
    const year = displayMonth.getFullYear();
    const month = displayMonth.getMonth();
    const firstDay = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();

    const days: (number | null)[] = [];

    // Empty cells for days before month starts
    for (let i = 0; i < firstDay; i++) {
      days.push(null);
    }

    // Days in month
    for (let i = 1; i <= daysInMonth; i++) {
      days.push(i);
    }

    return days;
  };

  const days = generateCalendarDays();
  const year = displayMonth.getFullYear();
  const month = displayMonth.getMonth();

  const isDateDisabled = (day: number): boolean => {
    const date = new Date(year, month, day);
    if (minDate && date < minDate) return true;
    if (maxDate && date > maxDate) return true;
    return false;
  };

  const isDateSelected = (day: number): boolean => {
    return (
      day === value.getDate() &&
      month === value.getMonth() &&
      year === value.getFullYear()
    );
  };

  return (
    <View>
      {/* Date Field */}
      <Pressable
        onPress={() => setIsExpanded(!isExpanded)}
        className="flex-row items-center justify-between rounded-xl"
        style={{
          backgroundColor: 'rgba(255,255,255,0.05)',
          borderWidth: 1,
          borderColor: 'rgba(255,255,255,0.1)',
          padding: 14,
        }}
      >
        <View className="flex-row items-center">
          <Calendar size={18} color="rgba(168,181,161,0.8)" style={{ marginRight: 10 }} />
          <Text className="text-base" style={{ color: 'rgba(255,255,255,0.9)' }}>
            {formatDateDisplay(value)}
          </Text>
        </View>
        <Text
          className="text-lg"
          style={{
            color: 'rgba(255,255,255,0.4)',
            transform: [{ rotate: isExpanded ? '90deg' : '0deg' }],
          }}
        >
          ›
        </Text>
      </Pressable>

      {/* Expandable Calendar */}
      {isExpanded && (
        <Animated.View
          entering={SlideInDown.duration(300).springify()}
          exiting={SlideOutUp.duration(200)}
          className="mt-3 rounded-xl overflow-hidden"
          style={{
            backgroundColor: 'rgba(255,255,255,0.03)',
            borderWidth: 1,
            borderColor: 'rgba(255,255,255,0.05)',
            padding: 16,
          }}
        >
          {/* Calendar Header */}
          <View className="flex-row items-center justify-between mb-4">
            <Pressable
              onPress={goToPreviousMonth}
              className="items-center justify-center rounded-lg"
              style={{
                width: 32,
                height: 32,
                backgroundColor: 'rgba(255,255,255,0.05)',
              }}
            >
              <ChevronLeft size={20} color="rgba(255,255,255,0.7)" />
            </Pressable>

            <Text className="text-sm font-semibold" style={{ color: 'rgba(255,255,255,0.9)' }}>
              {displayMonth.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
            </Text>

            <Pressable
              onPress={goToNextMonth}
              className="items-center justify-center rounded-lg"
              style={{
                width: 32,
                height: 32,
                backgroundColor: 'rgba(255,255,255,0.05)',
              }}
            >
              <ChevronRight size={20} color="rgba(255,255,255,0.7)" />
            </Pressable>
          </View>

          {/* Day Labels */}
          <View className="flex-row mb-2">
            {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((day, i) => (
              <View key={i} className="flex-1 items-center">
                <Text
                  className="text-xs font-semibold"
                  style={{ color: 'rgba(255,255,255,0.5)' }}
                >
                  {day}
                </Text>
              </View>
            ))}
          </View>

          {/* Calendar Grid */}
          <View className="flex-row flex-wrap">
            {days.map((day, index) => {
              const isDisabled = day !== null && isDateDisabled(day);
              const isSelected = day !== null && isDateSelected(day);
              const isToday =
                day !== null &&
                day === new Date().getDate() &&
                month === new Date().getMonth() &&
                year === new Date().getFullYear();

              return (
                <View key={index} style={{ width: '14.28%' }} className="mb-2">
                  {day !== null ? (
                    <Pressable
                      onPress={() => {
                        if (!isDisabled) {
                          handleDateSelect(new Date(year, month, day));
                        }
                      }}
                      disabled={isDisabled}
                      className="items-center justify-center rounded-lg"
                      style={{
                        aspectRatio: 1,
                        backgroundColor: isSelected
                          ? '#2C5F5D'
                          : isToday
                          ? 'rgba(168,181,161,0.2)'
                          : 'transparent',
                        opacity: isDisabled ? 0.3 : 1,
                      }}
                    >
                      <Text
                        className="text-sm"
                        style={{
                          color: isSelected ? '#fff' : 'rgba(255,255,255,0.9)',
                          fontWeight: isSelected ? '600' : '400',
                        }}
                      >
                        {day}
                      </Text>
                    </Pressable>
                  ) : (
                    <View style={{ aspectRatio: 1 }} />
                  )}
                </View>
              );
            })}
          </View>
        </Animated.View>
      )}
    </View>
  );
}
