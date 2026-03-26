import React, { createContext, useContext, useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { authApi, userApi, UserData } from '../services/api';
import { STORAGE_KEYS } from '../config/constants';

interface User {
  id: string;
  name: string;
  email: string;
  voipNumber?: string;
  credits: number;
  isVerified: boolean;
  phone?: string;
  preferredLanguages?: string[];
}

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  pendingEmail: string | null;
  pendingPassword: string | null;
  login: (email: string, password: string) => Promise<void>;
  register: (name: string, email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  verifyOTP: (email: string, otp: string) => Promise<boolean>;
  resendOTP: (email: string) => Promise<void>;
  assignVoIPNumber: () => Promise<string>;
  updateUser: () => Promise<void>;
  forgotPassword: (email: string) => Promise<void>;
  resetPassword: (email: string, code: string, password: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

interface AuthProviderProps {
  children: React.ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [pendingEmail, setPendingEmail] = useState<string | null>(null);
  const [pendingPassword, setPendingPassword] = useState<string | null>(null);

  // Check if user is already logged in on app start
  useEffect(() => {
    checkAuthState();
  }, []);

  const checkAuthState = async () => {
    try {
      setIsLoading(true);
      const token = await AsyncStorage.getItem(STORAGE_KEYS.TOKEN);
      const storedUser = await AsyncStorage.getItem(STORAGE_KEYS.USER);
      
      if (token && storedUser) {
        // Verify token is still valid by fetching user profile
        try {
          const response = await userApi.getProfile();
          if (response.status === 'success' && response.data?.user) {
            setUser(response.data.user as User);
          } else {
            // Invalid token, clear storage
            await clearStorage();
          }
        } catch (error) {
          // Token invalid or expired
          await clearStorage();
        }
      }
    } catch (error) {
      console.error('Error checking auth state:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const clearStorage = async () => {
    await AsyncStorage.multiRemove([STORAGE_KEYS.TOKEN, STORAGE_KEYS.USER]);
    setUser(null);
  };

  const register = async (name: string, email: string, password: string) => {
    setIsLoading(true);
    try {
      console.log('AuthContext: Starting registration...');
      const response = await authApi.register({ name, email, password });
      console.log('AuthContext: Registration response:', response);
      
      if (response.status === 'success') {
        // Store email for OTP verification
        setPendingEmail(email);
        // Store password temporarily so we can log in after OTP verify
        setPendingPassword(password);
        console.log('AuthContext: Registration successful, email stored');
      } else {
        console.log('AuthContext: Registration failed:', response.message);
        throw new Error(response.message || 'Registration failed');
      }
    } catch (error: any) {
      console.log('AuthContext: Registration error:', error);
      const errorMessage = error.response?.data?.message || error.message || 'Registration failed';
      throw new Error(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const login = async (email: string, password: string) => {
    setIsLoading(true);
    try {
      console.log('🔐 AuthContext: Attempting login for:', email);
      const response = await authApi.login(email, password);
      console.log('📥 AuthContext: Login response:', response);
      
      if (response.status === 'success' && response.token && response.data?.user) {
        // Store token and user data
        await AsyncStorage.setItem(STORAGE_KEYS.TOKEN, response.token);
        await AsyncStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(response.data.user));
        
        console.log('✅ AuthContext: Setting user state:', response.data.user);
        setUser(response.data.user as User);
        console.log('✅ AuthContext: User state set, isAuthenticated should now be true');
      } else {
        throw new Error(response.message || 'Login failed');
      }
    } catch (error: any) {
      console.error('❌ AuthContext: Login error:', error);
      const errorMessage = error.response?.data?.message || error.message || 'Login failed';
      throw new Error(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const verifyOTP = async (email: string, otp: string): Promise<boolean> => {
    setIsLoading(true);
    try {
      const response = await authApi.verifyOTP(email, otp);
      
      if (response.status === 'success') {
        setPendingEmail(null);
        // keep pendingPassword until successful login completes
        return true;
      }
      return false;
    } catch (error: any) {
      const errorMessage = error.response?.data?.message || error.message || 'OTP verification failed';
      throw new Error(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const resendOTP = async (email: string) => {
    setIsLoading(true);
    try {
      const response = await authApi.resendOTP(email);
      
      if (response.status !== 'success') {
        throw new Error(response.message || 'Failed to resend OTP');
      }
    } catch (error: any) {
      const errorMessage = error.response?.data?.message || error.message || 'Failed to resend OTP';
      throw new Error(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const forgotPassword = async (email: string) => {
    setIsLoading(true);
    try {
      const response = await authApi.forgotPassword(email);
      if (response.status !== 'success') {
        throw new Error(response.message || 'Failed to send reset code');
      }
    } catch (error: any) {
      const errorMessage = error.response?.data?.message || error.message || 'Failed to send reset code';
      throw new Error(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const resetPassword = async (email: string, code: string, password: string) => {
    setIsLoading(true);
    try {
      const response = await authApi.resetPassword(email, code, password);
      if (response.status !== 'success') {
        throw new Error(response.message || 'Failed to reset password');
      }
    } catch (error: any) {
      const errorMessage = error.response?.data?.message || error.message || 'Failed to reset password';
      throw new Error(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const assignVoIPNumber = async (): Promise<string> => {
    setIsLoading(true);
    try {
      const response = await authApi.assignVoIPNumber();
      
      if (response.status === 'success' && response.data?.voipNumber) {
        const voipNumber = response.data.voipNumber;
        
        // Update user with new VoIP number
        if (user) {
          const updatedUser = { ...user, voipNumber };
          setUser(updatedUser);
          await AsyncStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(updatedUser));
        }
        
        return voipNumber;
      } else {
        throw new Error(response.message || 'Failed to assign VoIP number');
      }
    } catch (error: any) {
      const errorMessage = error.response?.data?.message || error.message || 'Failed to assign VoIP number';
      throw new Error(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const updateUser = async () => {
    try {
      const response = await userApi.getProfile();
      if (response.status === 'success' && response.data?.user) {
        setUser(response.data.user as User);
        await AsyncStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(response.data.user));
      }
    } catch (error) {
      console.error('Error updating user:', error);
    }
  };

  const logout = async () => {
    setIsLoading(true);
    try {
      await clearStorage();
      setPendingEmail(null);
      setPendingPassword(null);
    } catch (error) {
      console.error('Error logging out:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const value: AuthContextType = {
    user,
    isAuthenticated: !!user,
    isLoading,
    pendingEmail,
    pendingPassword,
    login,
    register,
    logout,
    verifyOTP,
    resendOTP,
    assignVoIPNumber,
    updateUser,
    forgotPassword,
    resetPassword,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};
