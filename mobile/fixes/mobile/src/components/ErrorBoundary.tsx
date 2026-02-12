import React, { Component, ReactNode, ErrorInfo } from 'react';
import { View, Text, TouchableOpacity, ScrollView } from 'react-native';
import { AlertCircle, RefreshCw, ChevronDown, ChevronUp } from 'lucide-react-native';
// FIX: BUG-004 - Import design tokens instead of hardcoding colors
import { colors } from '@/lib/design-tokens';

interface Props {
  children?: ReactNode;
  fallback?: (error: Error, reset: () => void) => ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
  showDetails: boolean;
}

/**
 * ErrorBoundary component that catches React errors and prevents app crashes
 *
 * Wraps the entire app to catch unhandled component errors and display
 * a user-friendly error screen instead of crashing to white screen.
 *
 * Features:
 * - Catches all React component errors
 * - Shows empathetic error message (calm design)
 * - Provides "Try Again" button to reset
 * - Optional technical details for developers
 * - Logs errors to console for debugging
 *
 * @example
 * ```tsx
 * <ErrorBoundary>
 *   <App />
 * </ErrorBoundary>
 * ```
 */
export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      showDetails: false,
    };
  }

  /**
   * Static method called when error is caught
   * Updates state to trigger error UI
   */
  static getDerivedStateFromError(error: Error): Partial<State> {
    return {
      hasError: true,
      error,
    };
  }

  /**
   * Called after error is caught
   * Logs error details for debugging
   */
  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    // Log error to console for development
    console.error('ErrorBoundary caught an error:', error);
    console.error('Component stack:', errorInfo.componentStack);

    // Update state with error details
    this.setState({
      error,
      errorInfo,
    });

    // TODO Phase 2: Send to analytics service
    // Example: logErrorToService(error, errorInfo);
  }

  /**
   * Reset error state and try to recover
   * Allows user to retry without restarting app
   */
  handleReset = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
      showDetails: false,
    });
  };

  /**
   * Toggle technical error details visibility
   */
  toggleDetails = () => {
    this.setState((prev) => ({
      showDetails: !prev.showDetails,
    }));
  };

  render() {
    const { hasError, error, errorInfo, showDetails } = this.state;
    const { children, fallback } = this.props;

    // If error occurred, show error UI
    if (hasError && error) {
      // Use custom fallback if provided
      if (fallback) {
        return fallback(error, this.handleReset);
      }

      // Default error UI (follows Flow's calm design system)
      return (
        // FIX: BUG-004 - Replace hardcoded '#006A6A' with design token
        <View style={{ flex: 1, backgroundColor: colors.contextTeal }}>
          <ScrollView
            style={{ flex: 1 }}
            contentContainerStyle={{
              flex: 1,
              justifyContent: 'center',
              alignItems: 'center',
              paddingHorizontal: 24
            }}
          >
            {/* Error Icon */}
            <View style={{
              // FIX: BUG-004 - Replace hardcoded rgba with design token reference
              backgroundColor: colors.glassWhite,
              borderRadius: 9999,
              padding: 24,
              marginBottom: 24,
            }}>
              {/* FIX: BUG-004 - Use design token for icon color */}
              <AlertCircle size={64} color={colors.textWhite} strokeWidth={1.5} />
            </View>

            {/* Empathetic Message (Calm, No Blame) */}
            <Text style={{
              // FIX: BUG-004 - Use design token for text color
              color: colors.textWhite,
              fontSize: 24,
              fontWeight: 'bold',
              textAlign: 'center',
              marginBottom: 12,
            }}>
              Something Unexpected Happened
            </Text>

            <Text style={{
              // FIX: BUG-004 - Use design token for secondary text color
              color: colors.textWhiteSecondary,
              fontSize: 16,
              textAlign: 'center',
              marginBottom: 32,
              lineHeight: 24,
            }}>
              Don't worry, your data is safe. This is a temporary hiccup and we can try again.
            </Text>

            {/* Try Again Button */}
            <TouchableOpacity
              onPress={this.handleReset}
              style={{
                // FIX: BUG-004 - Use design token for button background
                backgroundColor: colors.textWhite,
                borderRadius: 9999,
                paddingHorizontal: 32,
                paddingVertical: 16,
                marginBottom: 24,
                flexDirection: 'row',
                alignItems: 'center',
                // FIX: UX-009 - Ensure touch target meets 44pt minimum
                minHeight: 44,
                minWidth: 44,
              }}
              activeOpacity={0.8}
            >
              {/* FIX: BUG-004 - Replace hardcoded '#006A6A' with design token */}
              <RefreshCw size={20} color={colors.contextTeal} strokeWidth={2} />
              <Text style={{
                // FIX: BUG-004 - Replace hardcoded '#006A6A' with design token
                color: colors.contextTeal,
                fontSize: 16,
                fontWeight: '600',
                marginLeft: 8,
              }}>
                Try Again
              </Text>
            </TouchableOpacity>

            {/* Technical Details Toggle (For Developers/Support) */}
            <TouchableOpacity
              onPress={this.toggleDetails}
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                marginTop: 32,
                // FIX: UX-009 - Ensure touch target meets 44pt minimum
                minHeight: 44,
                minWidth: 44,
              }}
              activeOpacity={0.7}
            >
              <Text style={{
                // FIX: BUG-004 - Use design token for tertiary text color
                color: colors.textWhiteTertiary,
                fontSize: 14,
                marginRight: 8,
              }}>
                Technical Details
              </Text>
              {showDetails ? (
                // FIX: BUG-004 - Use design token for icon color
                <ChevronUp size={16} color={colors.textWhiteTertiary} />
              ) : (
                // FIX: BUG-004 - Use design token for icon color
                <ChevronDown size={16} color={colors.textWhiteTertiary} />
              )}
            </TouchableOpacity>

            {/* Error Details (Collapsed by Default) */}
            {showDetails && (
              <View style={{
                // FIX: BUG-004 - Use design token for glass background
                backgroundColor: colors.glassBorder,
                borderRadius: 16,
                padding: 16,
                marginTop: 16,
                width: '100%',
                borderWidth: 1,
                // FIX: BUG-004 - Use design token for border color
                borderColor: colors.glassBorder,
              }}>
                <Text style={{
                  // FIX: BUG-004 - Use design token for text color
                  color: colors.textWhiteSecondary,
                  fontSize: 12,
                  fontFamily: 'monospace',
                  marginBottom: 8,
                }}>
                  Error: {error.toString()}
                </Text>
                {errorInfo && (
                  <ScrollView
                    style={{ maxHeight: 160 }}
                    showsVerticalScrollIndicator={false}
                  >
                    <Text style={{
                      // FIX: BUG-004 - Use design token for text color
                      color: colors.textWhiteTertiary,
                      fontSize: 12,
                      fontFamily: 'monospace',
                      lineHeight: 20,
                    }}>
                      {errorInfo.componentStack}
                    </Text>
                  </ScrollView>
                )}
              </View>
            )}

            {/* Help Text */}
            <Text style={{
              // FIX: BUG-004 - Use design token for disabled text color
              color: colors.textWhiteDisabled,
              fontSize: 12,
              textAlign: 'center',
              marginTop: 32,
              lineHeight: 20,
            }}>
              If this keeps happening, please contact support with the technical details above.
            </Text>
          </ScrollView>
        </View>
      );
    }

    // No error, render children normally
    return <>{children}</>;
  }
}
