import React, { createContext, useContext, useState, useEffect, useMemo } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

export interface ThemeColors {
  background: string;
  card: string;
  cardAlt: string;
  text: string;
  textSecondary: string;
  textMuted: string;
  border: string;
  borderLight: string;
  primary: string;
  primaryLight: string;
  primaryDark: string;
  danger: string;
  success: string;
  warning: string;
  inputBg: string;
  overlay: string;
  tabBar: string;
  drawerBg: string;
  headerBg: string;
  statusBar: 'dark' | 'light';
}

export const lightColors: ThemeColors = {
  background: '#fff',
  card: '#f8f8f8',
  cardAlt: '#F2F4F7',
  text: '#000',
  textSecondary: '#666',
  textMuted: '#999',
  border: '#f0f0f0',
  borderLight: '#E5E7EB',
  primary: '#3B82F6',
  primaryLight: '#EFF6FF',
  primaryDark: '#2563EB',
  danger: '#EF4444',
  success: '#22C55E',
  warning: '#F59E0B',
  inputBg: '#F9FAFB',
  overlay: 'rgba(0,0,0,0.5)',
  tabBar: '#fff',
  drawerBg: '#fff',
  headerBg: '#fff',
  statusBar: 'dark',
};

export const darkColors: ThemeColors = {
  background: '#0F0F0F',
  card: '#1C1C1E',
  cardAlt: '#2C2C2E',
  text: '#F2F2F7',
  textSecondary: '#AEAEB2',
  textMuted: '#636366',
  border: '#2C2C2E',
  borderLight: '#38383A',
  primary: '#5A9CFE',
  primaryLight: '#1C2D4A',
  primaryDark: '#3B82F6',
  danger: '#FF453A',
  success: '#30D158',
  warning: '#FFD60A',
  inputBg: '#1C1C1E',
  overlay: 'rgba(0,0,0,0.7)',
  tabBar: '#1C1C1E',
  drawerBg: '#1C1C1E',
  headerBg: '#1C1C1E',
  statusBar: 'light',
};

interface ThemeContextType {
  isDark: boolean;
  colors: ThemeColors;
  toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const useTheme = (): ThemeContextType => {
  const context = useContext(ThemeContext);
  if (!context) throw new Error('useTheme must be used within a ThemeProvider');
  return context;
};

interface ThemeProviderProps {
  children: React.ReactNode;
}

export const ThemeProvider: React.FC<ThemeProviderProps> = ({ children }) => {
  const [isDark, setIsDark] = useState(false);

  useEffect(() => {
    AsyncStorage.getItem('@settings_dark_mode').then((val) => {
      if (val !== null) setIsDark(JSON.parse(val));
    }).catch(() => {});
  }, []);

  const toggleTheme = () => {
    setIsDark((prev) => {
      const next = !prev;
      AsyncStorage.setItem('@settings_dark_mode', JSON.stringify(next)).catch(() => {});
      return next;
    });
  };

  const colors = useMemo(() => (isDark ? darkColors : lightColors), [isDark]);

  const value: ThemeContextType = { isDark, colors, toggleTheme };

  return (
    <ThemeContext.Provider value={value}>
      {children}
    </ThemeContext.Provider>
  );
};
