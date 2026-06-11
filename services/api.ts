import axios, { AxiosInstance, AxiosRequestConfig, AxiosError } from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';

// API Configuration
const API_BASE_URL = __DEV__ 
  ? (process.env.EXPO_PUBLIC_API_BASE_URL || 'http://10.0.2.2:5000/api') // Android emulator
  : 'https://your-production-api.com/api'; // For production

// Create axios instance
const apiClient: AxiosInstance = axios.create({
  baseURL: API_BASE_URL,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor - Add auth token to requests
apiClient.interceptors.request.use(
  async (config) => {
    const token = await AsyncStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor - Handle errors globally
apiClient.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    if (error.response?.status === 401) {
      // Token expired or invalid - clear storage
      await AsyncStorage.multiRemove(['token', 'user']);
    }
    return Promise.reject(error);
  }
);

// API Response Types
export interface ApiResponse<T = any> {
  status: 'success' | 'error';
  message?: string;
  data?: T;
  token?: string;
}

export interface UserData {
  id: string;
  name: string;
  email: string;
  phone?: string;
  voipNumber?: string;
  credits: number;
  isVerified: boolean;
  preferredLanguages?: string[];
  numbers?: string[];
  activeNumber?: string;
  trialActive?: boolean;
  trialStartDate?: string;
  isPremium?: boolean;
}

// Auth API calls
export const authApi = {
  register: async (data: { name: string; email: string; password: string; phone?: string }) => {
    const response = await apiClient.post<ApiResponse>('/auth/register', data);
    return response.data;
  },

  login: async (email: string, password: string) => {
    const response = await apiClient.post<ApiResponse<{ user: UserData }>>('/auth/login', {
      email,
      password,
    });
    return response.data;
  },

  verifyOTP: async (email: string, otp: string) => {
    const response = await apiClient.post<ApiResponse>('/auth/verify-otp', {
      email,
      otp,
    });
    return response.data;
  },

  resendOTP: async (email: string) => {
    const response = await apiClient.post<ApiResponse>('/auth/resend-otp', {
      email,
    });
    return response.data;
  },

  assignVoIPNumber: async () => {
    const response = await apiClient.post<ApiResponse<{ numbers: string[]; activeNumber: string }>>('/auth/assign-voip');
    return response.data;
  },

  forgotPassword: async (email: string) => {
    const response = await apiClient.post<ApiResponse>('/auth/forgot-password', {
      email,
    });
    return response.data;
  },

  resetPassword: async (email: string, code: string, password: string) => {
    const response = await apiClient.post<ApiResponse>('/auth/reset-password', {
      email,
      code,
      password,
    });
    return response.data;
  },

  changePassword: async (currentPassword: string, newPassword: string) => {
    const response = await apiClient.put<ApiResponse>('/auth/change-password', {
      currentPassword,
      newPassword,
    });
    return response.data;
  },

  googleLogin: async (idToken: string) => {
    const response = await apiClient.post<ApiResponse<{ user: UserData }>>('/auth/google', { idToken });
    return response.data;
  },

  appleLogin: async (identityToken: string, userData?: { fullName?: any; email?: string; user?: string }) => {
    const response = await apiClient.post<ApiResponse<{ user: UserData }>>('/auth/apple', {
      identityToken,
      user: userData,
    });
    return response.data;
  },
};

// User API calls
export const userApi = {
  getProfile: async () => {
    const response = await apiClient.get<ApiResponse<{ user: UserData }>>('/user/profile');
    return response.data;
  },

  updateProfile: async (data: Partial<UserData>) => {
    const response = await apiClient.put<ApiResponse<{ user: UserData }>>('/user/profile', data);
    return response.data;
  },

  deleteAccount: async () => {
    const response = await apiClient.delete<ApiResponse>('/user/account');
    return response.data;
  },
};

// Chat API calls
export const chatApi = {
  getChats: async () => {
    const response = await apiClient.get<ApiResponse>('/chat');
    return response.data;
  },

  getChatById: async (chatId: string) => {
    const response = await apiClient.get<ApiResponse>(`/chat/${chatId}`);
    return response.data;
  },

  sendMessage: async (chatId: string, message: string) => {
    const response = await apiClient.post<ApiResponse>(`/chat/${chatId}/message`, {
      message,
    });
    return response.data;
  },
};

// Call API calls
export const callApi = {
  initiateCall: async (phoneNumber: string, language: string) => {
    const response = await apiClient.post<ApiResponse>('/call/initiate', {
      receiverNumber: phoneNumber,
      sourceLanguage: 'English',
      targetLanguage: language,
    });
    return response.data;
  },

  getCallHistory: async () => {
    const response = await apiClient.get<ApiResponse>('/call');
    return response.data;
  },

  endCall: async (callId: string) => {
    const response = await apiClient.post<ApiResponse>(`/call/${callId}/end`);
    return response.data;
  },
};

// Numbers API calls
export const numbersApi = {
  getAvailable: async (country: string = 'US') => {
    const response = await apiClient.get<ApiResponse>('/numbers/available', { params: { country } });
    return response.data;
  },

  getMine: async () => {
    const response = await apiClient.get<ApiResponse>('/numbers/mine');
    return response.data;
  },

  addNumber: async (phoneNumber: string) => {
    const response = await apiClient.post<ApiResponse>('/numbers/add', { phoneNumber });
    return response.data;
  },

  switchNumber: async (phoneNumber: string) => {
    const response = await apiClient.post<ApiResponse>('/numbers/switch', { phoneNumber });
    return response.data;
  },

  removeNumber: async (phoneNumber: string) => {
    const response = await apiClient.post<ApiResponse>('/numbers/remove', { phoneNumber });
    return response.data;
  },
};

// Credits API calls
export const creditsApi = {
  getCredits: async () => {
    const response = await apiClient.get<ApiResponse>('/credit');
    return response.data;
  },

  purchaseCredits: async (amount: number) => {
    const response = await apiClient.post<ApiResponse>('/credit/purchase', {
      amount,
    });
    return response.data;
  },

  getStatus: async () => {
    const response = await apiClient.get<ApiResponse>('/payments/status');
    return response.data;
  },

  subscribe: async () => {
    const response = await apiClient.post<ApiResponse>('/payments/subscribe');
    return response.data;
  },

  getPackages: async () => {
    const response = await apiClient.get<ApiResponse>('/payments/packages');
    return response.data;
  },

  createStripePayment: async (type: 'credits' | 'premium', packageId?: number) => {
    const response = await apiClient.post<ApiResponse>('/payments/stripe', { type, packageId });
    return response.data;
  },

  confirmStripePayment: async (paymentIntentId: string) => {
    const response = await apiClient.post<ApiResponse>('/payments/stripe/confirm', { paymentIntentId });
    return response.data;
  },

  createCryptoPayment: async (type: 'credits' | 'premium', packageId?: number) => {
    const response = await apiClient.post<ApiResponse>('/payments/crypto', { type, packageId });
    return response.data;
  },

  confirmCryptoPayment: async (chargeId: string) => {
    const response = await apiClient.post<ApiResponse>('/payments/crypto/confirm', { chargeId });
    return response.data;
  },

  getTransactions: async (page = 1, limit = 20) => {
    const response = await apiClient.get<ApiResponse>(`/credit/transactions?page=${page}&limit=${limit}`);
    return response.data;
  },
};

// Voice API calls
export const voiceApi = {
  upload: async (audioUri: string, name: string): Promise<{ url: string; filename: string } | null> => {
    try {
      const formData = new FormData();
      formData.append('audio', {
        uri: audioUri,
        type: 'audio/m4a',
        name: `${name.replace(/\s+/g, '_')}.m4a`,
      } as any);
      formData.append('name', name);

      const response = await apiClient.post<ApiResponse<{ url: string; filename: string; name: string }>>(
        '/voices/upload',
        formData,
        {
          headers: { 'Content-Type': 'multipart/form-data' },
          timeout: 30000,
        },
      );
      if (response.data.status === 'success' && response.data.data) {
        return response.data.data;
      }
      return null;
    } catch {
      return null;
    }
  },
};

export default apiClient;

