import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createStackNavigator } from '@react-navigation/stack';
import { createDrawerNavigator } from '@react-navigation/drawer';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from './contexts/AuthContext';

// Import screens
import OnboardingScreen from './screens/OnboardingScreen';
import SignUpScreen from './screens/SignUpScreen';
import DashboardScreen from './screens/DashboardScreen';
import CallScreen from './screens/CallScreen';
import ChatsScreen from './screens/ChatsScreen';
import ChatScreen from './screens/ChatScreen';
import CreditsScreen from './screens/CreditsScreen';
import SettingsScreen from './screens/SettingsScreen';
import LoadingScreen from './components/LoadingScreen';

const Tab = createBottomTabNavigator();
const Stack = createStackNavigator();
const Drawer = createDrawerNavigator();

// Main Tab Navigator
function MainTabs() {
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
        tabBarActiveTintColor: '#3B82F6',
        tabBarInactiveTintColor: '#666',
        tabBarStyle: {
          backgroundColor: '#fff',
          borderTopWidth: 1,
          borderTopColor: '#f0f0f0',
          paddingBottom: 5,
          paddingTop: 5,
          height: 60,
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
        options={{
          tabBarLabel: 'Home',
        }}
      />
      <Tab.Screen 
        name="Calls" 
        component={CallScreen}
        options={{
          tabBarLabel: 'Calls',
        }}
      />
      <Tab.Screen 
        name="Chats" 
        component={ChatsScreen}
        options={{
          tabBarLabel: 'Chats',
        }}
      />
      <Tab.Screen 
        name="Credits" 
        component={CreditsScreen}
        options={{
          tabBarLabel: 'Credits',
        }}
      />
    </Tab.Navigator>
  );
}

// Drawer Navigator
function MainDrawer() {
  return (
    <Drawer.Navigator
      screenOptions={{
        headerShown: false,
        drawerStyle: {
          backgroundColor: '#fff',
          width: 280,
        },
        drawerActiveTintColor: '#3B82F6',
        drawerInactiveTintColor: '#666',
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

// Main Stack Navigator
function AppNavigator() {
  const { isAuthenticated, isLoading, user } = useAuth();

  console.log('🔍 Navigation State:', { isAuthenticated, isLoading, hasUser: !!user });

  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
        cardStyle: { backgroundColor: '#fff' },
      }}
    >
      {!isAuthenticated ? (
        // Auth Stack - shown when user is not authenticated
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
        // Main App Stack - shown when user is authenticated
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
              presentation: 'modal',
            }}
          />
          <Stack.Screen 
            name="Chat" 
            component={ChatScreen}
          />
          <Stack.Screen 
            name="CallSummary" 
            component={CallScreen}
            options={{
              presentation: 'modal',
            }}
          />
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
