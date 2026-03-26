// API Configuration
export const API_CONFIG = {
  BASE_URL: __DEV__ 
    ? 'http://localhost:5000/api' // For iOS Simulator
    // ? 'http://10.0.2.2:5000/api' // For Android Emulator
    : 'https://your-production-api.com/api',
  TIMEOUT: 10000,
};

// Storage Keys
export const STORAGE_KEYS = {
  TOKEN: 'token',
  USER: 'user',
  LANGUAGE_PREFERENCE: 'language_preference',
  ONBOARDING_COMPLETED: 'onboarding_completed',
};

// App Constants
export const APP_CONSTANTS = {
  DEFAULT_CREDITS: 100,
  MIN_PASSWORD_LENGTH: 6,
  OTP_LENGTH: 6,
  OTP_EXPIRY_MINUTES: 10,
};


