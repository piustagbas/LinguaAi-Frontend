import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ScrollView,
  ActivityIndicator,
  BackHandler,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import { useFocusEffect } from '@react-navigation/native';
import { scale, verticalScale, moderateScale } from '../utils/responsive';

interface SignUpScreenProps {
  navigation: any;
  route?: any;
}

const SignUpScreen: React.FC<SignUpScreenProps> = ({ navigation, route }) => {
  const { login, register, verifyOTP, resendOTP, forgotPassword, resetPassword, isLoading, pendingEmail, pendingPassword, loginWithGoogle, loginWithApple } = useAuth();
  const { colors, isDark } = useTheme();
  const [step, setStep] = useState<'signup' | 'login' | 'otp' | 'forgot' | 'reset-code' | 'reset-password'>('signup');

  const handleGoogleSignIn = async () => {
    try {
      console.log('🔄 Initiating Google Sign In simulation...');
      await loginWithGoogle();
      console.log('✅ Google Sign In simulation completed');
    } catch (error: any) {
      console.error('❌ Google Sign In simulation error:', error);
      Alert.alert('Google Sign In Failed', error.message || 'Please try again');
    }
  };

  const handleAppleSignIn = async () => {
    try {
      console.log('🔄 Initiating Apple Sign In simulation...');
      await loginWithApple();
      console.log('✅ Apple Sign In simulation completed');
    } catch (error: any) {
      console.error('❌ Apple Sign In simulation error:', error);
      Alert.alert('Apple Sign In Failed', error.message || 'Please try again');
    }
  };
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [otp, setOtp] = useState('');
  const [resetCode, setResetCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // Debug: Show current step
  useEffect(() => {
    console.log('Step changed to:', step);
  }, [step]);

  // Debug: Force log current step
  console.log('Current step in render:', step);

  // Ensure OTP step when coming from onboarding with pendingEmail or explicit mode
  useEffect(() => {
    const mode = route?.params?.mode;
    if (mode === 'login') {
      setStep('login');
    } else if (mode === 'otp' || (!!pendingEmail && step !== 'otp')) {
      setStep('otp');
    }
  }, [route?.params?.mode, pendingEmail]);

  // Handle Android hardware back button
  useFocusEffect(
    React.useCallback(() => {
      const onBackPress = () => {
        if (step === 'otp') {
          // Prevent going back from OTP screen
          return true; // Prevent default behavior
        } else if (step === 'login') {
          setStep('signup');
          return true; // Prevent default behavior
        }
        return false; // Allow default behavior (go back)
      };

      const subscription = BackHandler.addEventListener('hardwareBackPress', onBackPress);

      return () => subscription.remove();
    }, [step])
  );

  const handleSignUp = async () => {
    try {
      if (!name.trim()) {
        Alert.alert('Error', 'Please enter your name');
        return;
      }
      
      if (!email.trim()) {
        Alert.alert('Error', 'Please enter your email');
        return;
      }
      
      // Simple email validation
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        Alert.alert('Error', 'Please enter a valid email address');
        return;
      }
      
      if (!password || password.length < 6) {
        Alert.alert('Error', 'Password must be at least 6 characters');
        return;
      }

      // Register user
      console.log('About to call register...');
      await register(name, email, password);
      console.log('✅ Register completed successfully, setting step to OTP...');
      
      // Show success message
      Alert.alert(
        'Verification Code Sent',
        'Please check your email for the 6-digit verification code. If email is not configured, check the backend console.',
        [
          {
            text: 'OK',
            onPress: () => {
              console.log('Alert dismissed, now showing OTP screen');
              setStep('otp');
            }
          }
        ]
      );
      
    } catch (error: any) {
      console.error('❌ Registration error:', error);
      Alert.alert('Sign Up Failed', error.message || 'Please try again');
    }
  };

  const handleLogin = async () => {
    try {
      if (!email.trim() || !password) {
        Alert.alert('Error', 'Please enter email and password');
        return;
      }

      await login(email, password);
      // The navigation will automatically update due to isAuthenticated change
      // No need to manually navigate - the AppNavigator will handle it
    } catch (error: any) {
      Alert.alert('Login Failed', error.message || 'Please try again');
    }
  };

  const handleOTPVerification = async () => {
    try {
      const sanitizedOtp = (otp || '').replace(/\D/g, '');
      if (sanitizedOtp.length !== 6) {
        Alert.alert('Invalid OTP', 'Please enter a 6-digit code');
        return;
      }

      const emailToVerify = pendingEmail || email;
      console.log('🔐 Starting OTP verification for:', emailToVerify, 'otp:', sanitizedOtp);
      
      const isValid = await verifyOTP(emailToVerify.trim(), sanitizedOtp);
      console.log('✅ OTP verification result:', isValid);
      
      if (isValid) {
        // After OTP verification, login the user
        console.log('🔐 Starting login after OTP verification...');
        const passwordToUse = password || pendingPassword || '';
        if (!passwordToUse) {
          console.warn('⚠️ Missing password for login after OTP; cannot proceed');
          Alert.alert('Error', 'Missing password to complete login. Please go back and log in.');
          return;
        }
        await login(emailToVerify, passwordToUse);
        console.log('✅ Login completed successfully!');
        console.log('📱 Navigation should automatically switch to Dashboard now');
        // The navigation will automatically update due to isAuthenticated change
        // No need to manually navigate - the AppNavigator will handle it
      } else {
        Alert.alert('Invalid OTP', 'Please enter a valid verification code');
      }
    } catch (error: any) {
      console.error('❌ OTP Verification error:', error);
      Alert.alert('Verification Failed', error.message || 'Failed to verify OTP');
    }
  };

  const handleResendOTP = async () => {
    try {
      const emailToResend = (pendingEmail || email || '').trim();
      if (!emailToResend) {
        Alert.alert('Error', 'Missing email to resend code');
        return;
      }
      // Use dedicated resend endpoint
      await resendOTP(emailToResend);
      Alert.alert('Success', 'A new verification code has been sent');
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to resend code');
    }
  };


  const renderSignUpStep = () => (
    <View style={styles.content}>
      <Text style={styles.title}>Sign Up</Text>
      <Text style={styles.subtitle}>Create your account</Text>

      
      <View style={styles.oauthRowContainer}>
        <TouchableOpacity style={styles.oauthButtonHalf} onPress={handleGoogleSignIn} disabled={isLoading}>
          <Ionicons name="logo-google" size={20} color="#EA4335" />
          <Text style={styles.oauthButtonTextHalf}>Google</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.oauthButtonHalf} onPress={handleAppleSignIn} disabled={isLoading}>
          <Ionicons name="logo-apple" size={20} color="#000000" />
          <Text style={styles.oauthButtonTextHalf}>Apple</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.dividerContainer}>
        <View style={styles.dividerLine} />
        <Text style={styles.dividerText}>or register with email</Text>
        <View style={styles.dividerLine} />
      </View>

      <View style={styles.inputContainer}>
        <Text style={styles.label}>Name</Text>
        <TextInput
          style={styles.input}
          value={name}
          onChangeText={setName}
          placeholder="Enter your name"
          autoCapitalize="words"
        />
      </View>

      <View style={styles.inputContainer}>
        <Text style={styles.label}>Email</Text>
        <TextInput
          style={styles.input}
          value={email}
          onChangeText={setEmail}
          placeholder="your@email.com"
          keyboardType="email-address"
          autoCapitalize="none"
          autoCorrect={false}
        />
      </View>

      <View style={styles.inputContainer}>
        <Text style={styles.label}>Password</Text>
        <View style={styles.passwordContainer}>
          <TextInput
            style={styles.passwordInput}
            value={password}
            onChangeText={setPassword}
            placeholder="At least 6 characters"
            secureTextEntry={!showPassword}
            autoCapitalize="none"
          />
          <TouchableOpacity 
            onPress={() => setShowPassword(!showPassword)}
            style={styles.passwordToggle}
          >
            <Ionicons 
              name={showPassword ? "eye-off" : "eye"} 
              size={20} 
              color="#666" 
            />
          </TouchableOpacity>
        </View>
      </View>

      <TouchableOpacity 
        style={[styles.signupButton, isLoading && styles.signupButtonDisabled]} 
        onPress={handleSignUp}
        disabled={isLoading}
      >
        {isLoading ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={styles.signupButtonText}>Sign Up</Text>
        )}
      </TouchableOpacity>

      <TouchableOpacity 
        style={styles.loginLink} 
        onPress={() => setStep('login')}
      >
        <Text style={styles.loginLinkText}>
          Already have an account? <Text style={styles.loginLinkBold}>Log in</Text>
        </Text>
      </TouchableOpacity>

    </View>
  );

  const renderLoginStep = () => (
    <View style={styles.content}>
      <Text style={styles.title}>Welcome Back</Text>
      <Text style={styles.subtitle}>Log in to your account</Text>
      
      <View style={styles.inputContainer}>
        <Text style={styles.label}>Email</Text>
        <TextInput
          style={styles.input}
          value={email}
          onChangeText={setEmail}
          placeholder="your@email.com"
          keyboardType="email-address"
          autoCapitalize="none"
          autoCorrect={false}
        />
      </View>

      <View style={styles.inputContainer}>
        <Text style={styles.label}>Password</Text>
        <View style={styles.passwordContainer}>
          <TextInput
            style={styles.passwordInput}
            value={password}
            onChangeText={setPassword}
            placeholder="Enter your password"
            secureTextEntry={!showPassword}
            autoCapitalize="none"
          />
          <TouchableOpacity 
            onPress={() => setShowPassword(!showPassword)}
            style={styles.passwordToggle}
          >
            <Ionicons 
              name={showPassword ? "eye-off" : "eye"} 
              size={20} 
              color="#666" 
            />
          </TouchableOpacity>
        </View>
      </View>
      
      <View style={styles.forgotLinkContainer}>
        <TouchableOpacity onPress={() => setStep('forgot')}>
          <Text style={styles.forgotLinkText}>Forgot Password?</Text>
        </TouchableOpacity>
      </View>

      <TouchableOpacity 
        style={[styles.loginButton, isLoading && styles.loginButtonDisabled]} 
        onPress={handleLogin}
        disabled={isLoading}
      >
        {isLoading ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={styles.loginButtonText}>Log In</Text>
        )}
      </TouchableOpacity>

      <View style={styles.dividerContainer}>
        <View style={styles.dividerLine} />
        <Text style={styles.dividerText}>or continue with</Text>
        <View style={styles.dividerLine} />
      </View>

      <View style={styles.oauthRowContainer}>
        <TouchableOpacity style={styles.oauthButtonHalf} onPress={handleGoogleSignIn} disabled={isLoading}>
          <Ionicons name="logo-google" size={20} color="#EA4335" />
          <Text style={styles.oauthButtonTextHalf}>Google</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.oauthButtonHalf} onPress={handleAppleSignIn} disabled={isLoading}>
          <Ionicons name="logo-apple" size={20} color="#000000" />
          <Text style={styles.oauthButtonTextHalf}>Apple</Text>
        </TouchableOpacity>
      </View>

      <TouchableOpacity 
        style={styles.loginLink} 
        onPress={() => setStep('signup')}
      >
        <Text style={styles.loginLinkText}>
          Don't have an account? <Text style={styles.loginLinkBold}>Sign up</Text>
        </Text>
      </TouchableOpacity>
    </View>
  );

  const renderOTPStep = () => (
    <View style={styles.content}>
      <Text style={styles.title}>Verify Email</Text>
      <Text style={styles.subtitle}>
        Enter the 6-digit code sent to your email
      </Text>

      <View style={styles.otpContainer}>
        <TextInput
          style={styles.otpInput}
          value={otp}
          onChangeText={setOtp}
          placeholder="000000"
          keyboardType="numeric"
          maxLength={6}
          textAlign="center"
        />
      </View>

      <TouchableOpacity 
        style={[styles.verifyButton, isLoading && styles.verifyButtonDisabled]} 
        onPress={handleOTPVerification}
        disabled={isLoading}
      >
        {isLoading ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={styles.verifyButtonText}>Verify</Text>
        )}
      </TouchableOpacity>

      <TouchableOpacity 
        style={styles.resendButton}
        onPress={handleResendOTP}
        disabled={isLoading}
      >
        <Text style={styles.resendButtonText}>Resend Code</Text>
      </TouchableOpacity>
    </View>
  );

  const renderForgotStep = () => (
    <View style={styles.content}>
      <Text style={styles.title}>Forgot Password</Text>
      <Text style={styles.subtitle}>Enter your account email to receive a reset code</Text>
      <View style={styles.inputContainer}>
        <Text style={styles.label}>Email</Text>
        <TextInput
          style={styles.input}
          value={email}
          onChangeText={setEmail}
          placeholder="you@example.com"
          autoCapitalize="none"
          keyboardType="email-address"
        />
      </View>

      <TouchableOpacity 
        style={[styles.verifyButton, isLoading && styles.verifyButtonDisabled]} 
        onPress={async () => {
          try {
            if (!email.trim()) {
              Alert.alert('Error', 'Please enter your email');
              return;
            }
            await forgotPassword(email.trim());
            Alert.alert('Reset Code Sent', 'Please check your email for the reset code', [
              { text: 'OK', onPress: () => setStep('reset-code') }
            ]);
          } catch (e: any) {
            Alert.alert('Error', e.message || 'Failed to send reset code');
          }
        }}
        disabled={isLoading}
      >
        {isLoading ? <ActivityIndicator color="#fff" /> : <Text style={styles.verifyButtonText}>Send Code</Text>}
      </TouchableOpacity>

      <TouchableOpacity style={styles.resendButton} onPress={() => setStep('login')} disabled={isLoading}>
        <Text style={styles.resendButtonText}>Back to Log In</Text>
      </TouchableOpacity>
    </View>
  );

  const renderResetCodeStep = () => (
    <View style={styles.content}>
      <Text style={styles.title}>Reset Password</Text>
      <Text style={styles.subtitle}>Enter the 6-digit code sent to your email</Text>

      <View style={styles.otpContainer}>
        <TextInput
          style={styles.otpInput}
          value={resetCode}
          onChangeText={setResetCode}
          placeholder="000000"
          keyboardType="numeric"
          maxLength={6}
          textAlign="center"
        />
      </View>

      <TouchableOpacity 
        style={[styles.verifyButton, isLoading && styles.verifyButtonDisabled]} 
        onPress={async () => {
          try {
            const token = (resetCode || '').replace(/\D/g, '');
            if (token.length !== 6) {
              Alert.alert('Error', 'Please enter a valid 6-digit code');
              return;
            }
            // Verify the code and proceed to password reset
            setStep('reset-password');
          } catch (e: any) {
            Alert.alert('Error', e.message || 'Invalid reset code');
          }
        }}
        disabled={isLoading}
      >
        {isLoading ? <ActivityIndicator color="#fff" /> : <Text style={styles.verifyButtonText}>Verify Code</Text>}
      </TouchableOpacity>

      <TouchableOpacity style={styles.resendButton} onPress={() => setStep('forgot')} disabled={isLoading}>
        <Text style={styles.resendButtonText}>Resend Code</Text>
      </TouchableOpacity>

      <TouchableOpacity style={styles.resendButton} onPress={() => setStep('login')} disabled={isLoading}>
        <Text style={styles.resendButtonText}>Back to Log In</Text>
      </TouchableOpacity>
    </View>
  );

  const renderResetPasswordStep = () => (
    <View style={styles.content}>
      <Text style={styles.title}>Set New Password</Text>
      <Text style={styles.subtitle}>Enter your new password and confirm it</Text>

      <View style={styles.inputContainer}>
        <Text style={styles.label}>New Password</Text>
        <View style={styles.passwordContainer}>
          <TextInput
            style={styles.passwordInput}
            value={newPassword}
            onChangeText={setNewPassword}
            placeholder="Enter new password"
            secureTextEntry={!showNewPassword}
            autoCapitalize="none"
          />
          <TouchableOpacity 
            onPress={() => setShowNewPassword(!showNewPassword)}
            style={styles.passwordToggle}
          >
            <Ionicons 
              name={showNewPassword ? "eye-off" : "eye"} 
              size={20} 
              color="#666" 
            />
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.inputContainer}>
        <Text style={styles.label}>Confirm New Password</Text>
        <View style={styles.passwordContainer}>
          <TextInput
            style={styles.passwordInput}
            value={confirmPassword}
            onChangeText={setConfirmPassword}
            placeholder="Confirm new password"
            secureTextEntry={!showConfirmPassword}
            autoCapitalize="none"
          />
          <TouchableOpacity 
            onPress={() => setShowConfirmPassword(!showConfirmPassword)}
            style={styles.passwordToggle}
          >
            <Ionicons 
              name={showConfirmPassword ? "eye-off" : "eye"} 
              size={20} 
              color="#666" 
            />
          </TouchableOpacity>
        </View>
      </View>

      <TouchableOpacity 
        style={[styles.verifyButton, isLoading && styles.verifyButtonDisabled]} 
        onPress={async () => {
          try {
            if (!newPassword || newPassword.length < 6) {
              Alert.alert('Error', 'Password must be at least 6 characters');
              return;
            }
            if (newPassword !== confirmPassword) {
              Alert.alert('Error', 'Passwords do not match');
              return;
            }
            
            const token = (resetCode || '').replace(/\D/g, '');
            if (!email.trim() || token.length !== 6) {
              Alert.alert('Error', 'Invalid reset session');
              return;
            }
            
            await resetPassword(email.trim(), token, newPassword);
            // Auto-login
            await login(email.trim(), newPassword);
          } catch (e: any) {
            Alert.alert('Error', e.message || 'Failed to reset password');
          }
        }}
        disabled={isLoading}
      >
        {isLoading ? <ActivityIndicator color="#fff" /> : <Text style={styles.verifyButtonText}>Reset & Log In</Text>}
      </TouchableOpacity>

      <TouchableOpacity style={styles.resendButton} onPress={() => setStep('reset-code')} disabled={isLoading}>
        <Text style={styles.resendButtonText}>Back to Code</Text>
      </TouchableOpacity>
    </View>
  );


  const handleBackPress = () => {
    if (step === 'otp') {
      // Don't allow going back from OTP screen
      // User must verify or use resend
      return;
    } else if (step === 'login') {
      setStep('signup');
    } else {
      navigation.goBack();
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={handleBackPress}>
          <Ionicons name="arrow-back" size={24} color="#000" />
        </TouchableOpacity>
        <Ionicons name="chatbubble" size={24} color="#3B82F6" />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        {step === 'signup' && renderSignUpStep()}
        {step === 'login' && renderLoginStep()}
        {step === 'otp' && renderOTPStep()}
        {step === 'forgot' && renderForgotStep()}
        {step === 'reset-code' && renderResetCodeStep()}
        {step === 'reset-password' && renderResetPasswordStep()}
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: scale(20),
    paddingVertical: verticalScale(16),
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  scrollContent: {
    flexGrow: 1,
  },
  content: {
    flex: 1,
    paddingHorizontal: scale(20),
    paddingTop: verticalScale(40),
  },
  title: {
    fontSize: moderateScale(32),
    fontWeight: 'bold',
    color: '#000',
    marginBottom: verticalScale(32),
  },
  subtitle: {
    fontSize: moderateScale(15),
    color: '#999',
    marginBottom: verticalScale(32),
    marginTop: verticalScale(-24),
    lineHeight: verticalScale(22),
  },
  inputContainer: {
    marginBottom: verticalScale(24),
  },
  label: {
    fontSize: moderateScale(16),
    color: '#000',
    marginBottom: verticalScale(8),
  },
  input: {
    backgroundColor: '#f8f8f8',
    paddingHorizontal: scale(20),
    paddingVertical: verticalScale(16),
    borderRadius: scale(28),
    borderWidth: 1,
    borderColor: '#e0e0e0',
    fontSize: moderateScale(16),
    color: '#000',
  },
  passwordContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8f8f8',
    borderRadius: scale(28),
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  passwordInput: {
    flex: 1,
    paddingHorizontal: scale(16),
    paddingVertical: verticalScale(16),
    fontSize: moderateScale(16),
    color: '#000',
  },
  passwordToggle: {
    paddingHorizontal: scale(16),
  },
  signupButton: {
    backgroundColor: '#3B82F6',
    paddingVertical: verticalScale(16),
    borderRadius: scale(28),
    alignItems: 'center',
    marginTop: verticalScale(8),
  },
  signupButtonText: {
    color: '#fff',
    fontSize: moderateScale(18),
    fontWeight: '600',
  },
  signupButtonDisabled: {
    backgroundColor: '#ccc',
  },
  loginButton: {
    backgroundColor: '#3B82F6',
    paddingVertical: verticalScale(16),
    borderRadius: scale(28),
    alignItems: 'center',
    marginTop: verticalScale(24),
  },
  loginButtonText: {
    color: '#fff',
    fontSize: moderateScale(18),
    fontWeight: '600',
  },
  loginButtonDisabled: {
    backgroundColor: '#ccc',
  },
  loginLink: {
    alignItems: 'center',
    marginTop: verticalScale(24),
  },
  loginLinkText: {
    fontSize: moderateScale(16),
    color: '#666',
  },
  loginLinkBold: {
    color: '#3B82F6',
    fontWeight: '600',
  },
  forgotLinkContainer: {
    alignItems: 'flex-start',
    marginTop: verticalScale(2),
    marginBottom: verticalScale(8),
  },
  forgotLinkText: {
    color: '#3B82F6',
    fontSize: moderateScale(14),
    fontWeight: '600',
  },
  otpContainer: {
    alignItems: 'center',
    marginBottom: verticalScale(32),
  },
  otpInput: {
    fontSize: moderateScale(32),
    fontWeight: 'bold',
    color: '#000',
    borderBottomWidth: 2,
    borderBottomColor: '#3B82F6',
    paddingBottom: verticalScale(8),
    width: scale(200),
    letterSpacing: 8,
  },
  verifyButton: {
    backgroundColor: '#3B82F6',
    paddingVertical: verticalScale(16),
    borderRadius: scale(28),
    alignItems: 'center',
    marginBottom: verticalScale(16),
  },
  verifyButtonText: {
    color: '#fff',
    fontSize: moderateScale(18),
    fontWeight: '600',
  },
  verifyButtonDisabled: {
    backgroundColor: '#ccc',
  },
  resendButton: {
    alignItems: 'center',
  },
  resendButtonText: {
    color: '#3B82F6',
    fontSize: moderateScale(16),
  },
  voipContainer: {
    alignItems: 'center',
    backgroundColor: '#f8f8f8',
    paddingVertical: verticalScale(40),
    paddingHorizontal: scale(20),
    borderRadius: scale(16),
    marginBottom: verticalScale(32),
  },
  voipNumber: {
    fontSize: moderateScale(24),
    fontWeight: 'bold',
    color: '#000',
    marginTop: verticalScale(16),
    marginBottom: verticalScale(8),
  },
  voipDescription: {
    fontSize: moderateScale(14),
    color: '#666',
    textAlign: 'center',
    lineHeight: verticalScale(20),
  },
  assignButton: {
    backgroundColor: '#3B82F6',
    paddingVertical: verticalScale(16),
    borderRadius: scale(28),
    alignItems: 'center',
  },
  assignButtonText: {
    color: '#fff',
    fontSize: moderateScale(18),
    fontWeight: '600',
  },
  assignButtonDisabled: {
    backgroundColor: '#ccc',
  },
  dividerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: verticalScale(20),
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: '#e0e0e0',
  },
  dividerText: {
    color: '#666',
    paddingHorizontal: scale(12),
    fontSize: moderateScale(14),
  },
  oauthRowContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: scale(12),
    marginBottom: verticalScale(8),
  },
  oauthButtonHalf: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#e0e0e0',
    paddingVertical: verticalScale(14),
    borderRadius: scale(28),
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  oauthButtonTextHalf: {
    color: '#000',
    fontSize: moderateScale(15),
    fontWeight: '600',
    marginLeft: 8,
  },
});

export default SignUpScreen;
