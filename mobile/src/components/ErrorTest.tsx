import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';

export function ErrorTest() {
  const [shouldError, setShouldError] = React.useState(false);

  if (shouldError) {
    throw new Error('🧪 Test error - ErrorBoundary should catch this!');
  }

  return (
    <View style={styles.container}>
      <TouchableOpacity
        style={styles.button}
        onPress={() => setShouldError(true)}
      >
        <Text style={styles.buttonText}>
          🧪 Test Error Boundary (Tap to Crash)
        </Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 16,
    backgroundColor: '#f0f0f0',
    borderRadius: 8,
    marginBottom: 16,
  },
  button: {
    backgroundColor: '#dc2626',
    padding: 12,
    borderRadius: 6,
    alignItems: 'center',
  },
  buttonText: {
    color: '#ffffff',
    fontWeight: '600',
  },
});