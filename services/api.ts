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
    const response = await apiClient.post<ApiResponse<{ voipNumber: string }>>('/auth/assign-voip');
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
      phoneNumber,
      language,
    });
    return response.data;
  },

  getCallHistory: async () => {
    const response = await apiClient.get<ApiResponse>('/call/history');
    return response.data;
  },

  endCall: async (callId: string) => {
    const response = await apiClient.post<ApiResponse>(`/call/${callId}/end`);
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
};

export default apiClient;

