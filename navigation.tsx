import React from 'react';
import { Platform } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createStackNavigator } from '@react-navigation/stack';
import { createDrawerNavigator } from '@react-navigation/drawer';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from './contexts/AuthContext';
import { useTheme } from './contexts/ThemeContext';
import { scale, moderateScale } from './utils/responsive';

import OnboardingScreen from './screens/OnboardingScreen';
import SignUpScreen from './screens/SignUpScreen';
import DashboardScreen from './screens/DashboardScreen';
import CallScreen from './screens/CallScreen';
import ChatsScreen from './screens/ChatsScreen';
import ChatScreen from './screens/ChatScreen';
import CreditsScreen from './screens/CreditsScreen';
import SettingsScreen from './screens/SettingsScreen';
import ContactsScreen from './screens/ContactsScreen';
import AddContactScreen from './screens/AddContactScreen';
import PrivacyPolicyScreen from './screens/PrivacyPolicyScreen';
import TermsOfServiceScreen from './screens/TermsOfServiceScreen';
import SubscriptionScreen from './screens/SubscriptionScreen';
import VoiceSettingsScreen from './screens/VoiceSettingsScreen';
import LoadingScreen from './components/LoadingScreen';

const Tab = createBottomTabNavigator();
const Stack = createStackNavigator();
const Drawer = createDrawerNavigator();

function MainTabs() {
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        tabBarIcon: ({ focused, color, size }) => {
          let iconName: string;

          if (route.name === 'Dashboard') {
            iconName = focused ? 'home' : 'home-outline';
          } else if (route.name === 'Calls') {
            iconName = focused ? 'call' : 'call-outline';
          } else if (route.name === 'Chats') {
            iconName = focused ? 'chatbubble' : 'chatbubble-outline';
          } else if (route.name === 'Credits') {
            iconName = focused ? 'diamond' : 'diamond-outline';
          } else {
            iconName = 'circle';
          }

          return <Ionicons name={iconName as any} size={size} color={color} />;
        },
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textSecondary,
        tabBarStyle: {
          backgroundColor: colors.tabBar,
          borderTopWidth: 1,
          borderTopColor: colors.border,
          paddingBottom: Platform.OS === 'android' ? insets.bottom + 8 : 0,
          paddingTop: 5,
          height: Platform.OS === 'android' ? 56 + insets.bottom : 56,
        },
        tabBarLabelStyle: {
          fontSize: 12,
          fontWeight: '500',
        },
        headerShown: false,
      })}
    >
      <Tab.Screen
        name="Dashboard"
        component={DashboardScreen}
        options={{ tabBarLabel: 'Home' }}
      />
      <Tab.Screen
        name="Calls"
        component={CallScreen}
        options={{ tabBarLabel: 'Calls' }}
      />
      <Tab.Screen
        name="Chats"
        component={ChatsScreen}
        options={{ tabBarLabel: 'Chats' }}
      />
      <Tab.Screen
        name="Credits"
        component={CreditsScreen}
        options={{ tabBarLabel: 'Credits' }}
      />
    </Tab.Navigator>
  );
}

function MainDrawer() {
  const { colors } = useTheme();
  return (
    <Drawer.Navigator
      screenOptions={{
        headerShown: false,
        drawerStyle: {
          backgroundColor: colors.drawerBg,
          width: 280,
        },
        drawerActiveTintColor: colors.primary,
        drawerInactiveTintColor: colors.textSecondary,
        drawerLabelStyle: {
          fontSize: 16,
          fontWeight: '500',
        },
      }}
    >
      <Drawer.Screen
        name="MainTabs"
        component={MainTabs}
        options={{
          drawerLabel: 'Home',
          drawerIcon: ({ color, size }) => (
            <Ionicons name="home" size={size} color={color} />
          ),
        }}
      />
      <Drawer.Screen
        name="Settings"
        component={SettingsScreen}
        options={{
          drawerLabel: 'Settings',
          drawerIcon: ({ color, size }) => (
            <Ionicons name="settings" size={size} color={color} />
          ),
        }}
      />
    </Drawer.Navigator>
  );
}

function AppNavigator() {
  const { isAuthenticated, isLoading, user } = useAuth();
  const { colors } = useTheme();

  console.log('🔍 Navigation State:', { isAuthenticated, isLoading, hasUser: !!user });

  if (isLoading) {
    return <LoadingScreen />;
  }

  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
        cardStyle: { backgroundColor: colors.background },
      }}
    >
      {!isAuthenticated ? (
        <>
          <Stack.Screen
            name="Onboarding"
            component={OnboardingScreen}
            options={{
              gestureEnabled: false,
              animationTypeForReplace: 'push',
            }}
          />
          <Stack.Screen
            name="SignUp"
            component={SignUpScreen}
            options={{
              gestureEnabled: false,
              animationTypeForReplace: 'push',
            }}
          />
        </>
      ) : (
        <>
          <Stack.Screen
            name="MainDrawer"
            component={MainDrawer}
            options={{
              gestureEnabled: false,
              animationTypeForReplace: 'pop',
            }}
          />
          <Stack.Screen
            name="Call"
            component={CallScreen}
            options={{
              headerShown: false,
              cardStyle: { backgroundColor: colors.background },
              cardStyleInterpolator: ({ current, layouts }) => ({
                cardStyle: {
                  transform: [{
                    translateY: current.progress.interpolate({
                      inputRange: [0, 1],
                      outputRange: [layouts.screen.height, 0],
                    }),
                  }],
                },
              }),
            }}
          />
          <Stack.Screen name="Chat" component={ChatScreen} />
          <Stack.Screen name="Contacts" component={ContactsScreen} />
          <Stack.Screen name="AddContact" component={AddContactScreen} />
          <Stack.Screen
            name="CallSummary"
            component={CallScreen}
            options={{
              headerShown: false,
              cardStyle: { backgroundColor: colors.background },
              cardStyleInterpolator: ({ current, layouts }) => ({
                cardStyle: {
                  transform: [{
                    translateY: current.progress.interpolate({
                      inputRange: [0, 1],
                      outputRange: [layouts.screen.height, 0],
                    }),
                  }],
                },
              }),
            }}
          />
          <Stack.Screen name="PrivacyPolicy" component={PrivacyPolicyScreen} />
          <Stack.Screen name="TermsOfService" component={TermsOfServiceScreen} />
          <Stack.Screen name="Subscription" component={SubscriptionScreen} />
          <Stack.Screen name="VoiceSettings" component={VoiceSettingsScreen} />
        </>
      )}
    </Stack.Navigator>
  );
}

export default function Navigation() {
  return (
    <NavigationContainer>
      <AppNavigator />
    </NavigationContainer>
  );
}
