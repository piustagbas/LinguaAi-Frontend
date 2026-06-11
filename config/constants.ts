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
  MY_NUMBERS: 'my_numbers',
  ACTIVE_NUMBER_ID: 'active_number_id',
  DIAL_NUMBER: 'dial_number',
  LOCAL_CALL_HISTORY: 'local_call_history',
};

// Scoped storage keys per user — prevents data leaking between accounts on same device
export const scopedKey = (key: string, userId: string): string => `${key}_${userId}`;

// App Constants
export const APP_CONSTANTS = {
  DEFAULT_CREDITS: 0,
  MIN_PASSWORD_LENGTH: 6,
  OTP_LENGTH: 6,
  OTP_EXPIRY_MINUTES: 10,
};


