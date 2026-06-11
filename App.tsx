import React, { useEffect } from 'react';
import { StatusBar } from 'expo-status-bar';
import 'react-native-gesture-handler';
import { Platform } from 'react-native';
if (Platform.OS === 'web') {
  require('./global.css');
}
import Navigation from './navigation';
import { AuthProvider } from './contexts/AuthContext';
import { ThemeProvider, useTheme } from './contexts/ThemeContext';
import { initVoices } from './services/ttsService';
import { registerForPushNotifications } from './services/notificationService';

function AppContent() {
  const { isDark } = useTheme();

  return (
    <>
      <Navigation />
      <StatusBar style={isDark ? 'light' : 'dark'} />
    </>
  );
}

export default function App() {
  useEffect(() => {
    initVoices();
    registerForPushNotifications();
  }, []);

  return (
    <AuthProvider>
      <ThemeProvider>
        <AppContent />
      </ThemeProvider>
    </AuthProvider>
  );
}
