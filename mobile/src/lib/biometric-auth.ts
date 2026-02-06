import * as LocalAuthentication from 'expo-local-authentication';
import * as SecureStore from 'expo-secure-store';

const BIOMETRIC_EMAIL_KEY = 'flow_biometric_email';
const BIOMETRIC_ENABLED_KEY = 'flow_biometric_enabled';

export interface BiometricCapability {
  hasHardware: boolean;
  isEnrolled: boolean;
  supportedTypes: LocalAuthentication.AuthenticationType[];
}

/**
 * Check if biometric authentication is available on this device
 */
export async function checkBiometricCapability(): Promise<BiometricCapability> {
  try {
    const hasHardware = await LocalAuthentication.hasHardwareAsync();
    const isEnrolled = await LocalAuthentication.isEnrolledAsync();
    const supportedTypes = await LocalAuthentication.supportedAuthenticationTypesAsync();

    return {
      hasHardware,
      isEnrolled,
      supportedTypes,
    };
  } catch (error) {
    console.error('Biometric capability check error:', error);
    return {
      hasHardware: false,
      isEnrolled: false,
      supportedTypes: [],
    };
  }
}

/**
 * Get user-friendly biometric type name
 */
export function getBiometricTypeName(types: LocalAuthentication.AuthenticationType[]): string {
  if (types.includes(LocalAuthentication.AuthenticationType.FACIAL_RECOGNITION)) {
    return 'Face ID';
  }
  if (types.includes(LocalAuthentication.AuthenticationType.FINGERPRINT)) {
    return 'Touch ID';
  }
  if (types.includes(LocalAuthentication.AuthenticationType.IRIS)) {
    return 'Iris';
  }
  return 'Biometric';
}

/**
 * Authenticate user with biometrics
 */
export async function authenticateWithBiometrics(
  promptMessage?: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const capability = await checkBiometricCapability();

    if (!capability.hasHardware) {
      return { success: false, error: 'Biometric hardware not available' };
    }

    if (!capability.isEnrolled) {
      return { success: false, error: 'No biometrics enrolled on this device' };
    }

    const result = await LocalAuthentication.authenticateAsync({
      promptMessage: promptMessage || 'Authenticate to continue',
      fallbackLabel: 'Use passcode',
      disableDeviceFallback: false,
      cancelLabel: 'Cancel',
    });

    if (result.success) {
      return { success: true };
    } else {
      return {
        success: false,
        error: result.error === 'user_cancel' ? 'Authentication cancelled' : 'Authentication failed',
      };
    }
  } catch (error) {
    console.error('Biometric authentication error:', error);
    return { success: false, error: 'Biometric authentication error' };
  }
}

/**
 * Save email for biometric quick-login
 */
export async function enableBiometricLogin(email: string): Promise<boolean> {
  try {
    // First authenticate to enable biometric login
    const authResult = await authenticateWithBiometrics('Enable biometric login for Flow');

    if (!authResult.success) {
      return false;
    }

    // Store email securely
    await SecureStore.setItemAsync(BIOMETRIC_EMAIL_KEY, email.toLowerCase());
    await SecureStore.setItemAsync(BIOMETRIC_ENABLED_KEY, 'true');

    console.log('Biometric login enabled for:', email);
    return true;
  } catch (error) {
    console.error('Enable biometric login error:', error);
    return false;
  }
}

/**
 * Get saved email for biometric quick-login
 */
export async function getBiometricEmail(): Promise<string | null> {
  try {
    const enabled = await SecureStore.getItemAsync(BIOMETRIC_ENABLED_KEY);
    if (enabled !== 'true') {
      return null;
    }

    const email = await SecureStore.getItemAsync(BIOMETRIC_EMAIL_KEY);
    return email;
  } catch (error) {
    console.error('Get biometric email error:', error);
    return null;
  }
}

/**
 * Check if biometric login is enabled
 */
export async function isBiometricLoginEnabled(): Promise<boolean> {
  try {
    const enabled = await SecureStore.getItemAsync(BIOMETRIC_ENABLED_KEY);
    const email = await SecureStore.getItemAsync(BIOMETRIC_EMAIL_KEY);
    return enabled === 'true' && !!email;
  } catch (error) {
    console.error('Check biometric enabled error:', error);
    return false;
  }
}

/**
 * Disable biometric login and clear stored email
 */
export async function disableBiometricLogin(): Promise<void> {
  try {
    await SecureStore.deleteItemAsync(BIOMETRIC_EMAIL_KEY);
    await SecureStore.deleteItemAsync(BIOMETRIC_ENABLED_KEY);
    console.log('Biometric login disabled');
  } catch (error) {
    console.error('Disable biometric login error:', error);
  }
}

/**
 * Perform biometric quick-login flow
 * Returns the email if successful, null otherwise
 */
export async function performBiometricQuickLogin(): Promise<string | null> {
  try {
    // Check if biometric login is enabled
    const isEnabled = await isBiometricLoginEnabled();
    if (!isEnabled) {
      return null;
    }

    // Get saved email
    const email = await getBiometricEmail();
    if (!email) {
      return null;
    }

    // Authenticate with biometrics
    const authResult = await authenticateWithBiometrics(`Log in as ${email}`);
    if (!authResult.success) {
      return null;
    }

    return email;
  } catch (error) {
    console.error('Biometric quick-login error:', error);
    return null;
  }
}
