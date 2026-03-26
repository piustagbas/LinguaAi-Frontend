import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  Alert,
  ScrollView,
  ActivityIndicator,
  BackHandler,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../contexts/AuthContext';
import { useFocusEffect } from '@react-navigation/native';

interface SignUpScreenProps {
  navigation: any;
  route?: any;
}

const SignUpScreen: React.FC<SignUpScreenProps> = ({ navigation, route }) => {
  const { login, register, verifyOTP, resendOTP, forgotPassword, resetPassword, isLoading, pendingEmail, pendingPassword } = useAuth();
  const [step, setStep] = useState<'signup' | 'login' | 'otp' | 'forgot' | 'reset-code' | 'reset-password'>('signup');
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
      <Text style={{ color: 'red', textAlign: 'center', marginBottom: 10 }}>
        Step: {step}
      </Text>
      
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
        <Text style={styles.inputLabel}>Email</Text>
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
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  scrollContent: {
    flexGrow: 1,
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 40,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#000',
    marginBottom: 32,
  },
  subtitle: {
    fontSize: 15,
    color: '#999',
    marginBottom: 32,
    marginTop: -24,
    lineHeight: 22,
  },
  inputContainer: {
    marginBottom: 24,
  },
  label: {
    fontSize: 16,
    color: '#000',
    marginBottom: 8,
  },
  input: {
    backgroundColor: '#f8f8f8',
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    fontSize: 16,
    color: '#000',
  },
  passwordContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8f8f8',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  passwordInput: {
    flex: 1,
    paddingHorizontal: 16,
    paddingVertical: 16,
    fontSize: 16,
    color: '#000',
  },
  passwordToggle: {
    paddingHorizontal: 16,
  },
  signupButton: {
    backgroundColor: '#3B82F6',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 8,
  },
  signupButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
  },
  signupButtonDisabled: {
    backgroundColor: '#ccc',
  },
  loginButton: {
    backgroundColor: '#3B82F6',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 24,
  },
  loginButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
  },
  loginButtonDisabled: {
    backgroundColor: '#ccc',
  },
  loginLink: {
    alignItems: 'center',
    marginTop: 24,
  },
  loginLinkText: {
    fontSize: 16,
    color: '#666',
  },
  loginLinkBold: {
    color: '#3B82F6',
    fontWeight: '600',
  },
  forgotLinkContainer: {
    alignItems: 'flex-start',
    marginTop: 2,
    marginBottom: 8,
  },
  forgotLinkText: {
    color: '#3B82F6',
    fontSize: 14,
    fontWeight: '600',
  },
  otpContainer: {
    alignItems: 'center',
    marginBottom: 32,
  },
  otpInput: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#000',
    borderBottomWidth: 2,
    borderBottomColor: '#3B82F6',
    paddingBottom: 8,
    width: 200,
    letterSpacing: 8,
  },
  verifyButton: {
    backgroundColor: '#3B82F6',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 16,
  },
  verifyButtonText: {
    color: '#fff',
    fontSize: 18,
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
    fontSize: 16,
  },
  voipContainer: {
    alignItems: 'center',
    backgroundColor: '#f8f8f8',
    paddingVertical: 40,
    paddingHorizontal: 20,
    borderRadius: 16,
    marginBottom: 32,
  },
  voipNumber: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#000',
    marginTop: 16,
    marginBottom: 8,
  },
  voipDescription: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    lineHeight: 20,
  },
  assignButton: {
    backgroundColor: '#3B82F6',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  assignButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
  },
  assignButtonDisabled: {
    backgroundColor: '#ccc',
  },
});

export default SignUpScreen;
