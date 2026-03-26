import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  Switch,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../contexts/AuthContext';

interface SettingsScreenProps {
  navigation: any;
}

const SettingsScreen: React.FC<SettingsScreenProps> = ({ navigation }) => {
  const { user, logout } = useAuth();
  const [notifications, setNotifications] = useState(true);
  const [translationEnabled, setTranslationEnabled] = useState(true);
  const [autoTranslate, setAutoTranslate] = useState(false);
  const [darkMode, setDarkMode] = useState(false);

  // Use real user data from auth context
  const userProfile = {
    name: user?.name || 'John Doe',
    email: user?.email || 'john.doe@example.com',
    voipNumber: user?.voipNumber || '+1 (555) 123-4567',
    preferredLanguages: ['English', 'Spanish'],
  };

  const handleLogout = () => {
    Alert.alert(
      'Logout',
      'Are you sure you want to logout?',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Logout', 
          onPress: () => {
            logout();
            navigation.navigate('Onboarding');
          }
        },
      ]
    );
  };

  const handleDeleteAccount = () => {
    Alert.alert(
      'Delete Account',
      'This action cannot be undone. Are you sure?',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Delete', style: 'destructive', onPress: () => {} },
      ]
    );
  };

  const renderSettingItem = (
    icon: string,
    title: string,
    subtitle?: string,
    onPress?: () => void,
    rightElement?: React.ReactNode
  ) => (
    <TouchableOpacity style={styles.settingItem} onPress={onPress}>
      <View style={styles.settingLeft}>
        <View style={styles.settingIcon}>
          <Ionicons name={icon as any} size={24} color="#3B82F6" />
        </View>
        <View style={styles.settingContent}>
          <Text style={styles.settingTitle}>{title}</Text>
          {subtitle && <Text style={styles.settingSubtitle}>{subtitle}</Text>}
        </View>
      </View>
      {rightElement || <Ionicons name="chevron-forward" size={20} color="#666" />}
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.openDrawer()}>
          <Ionicons name="menu" size={24} color="#000" />
        </TouchableOpacity>
        <TouchableOpacity>
          <Ionicons name="person-circle" size={24} color="#3B82F6" />
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.content}>
        <Text style={styles.title}>Settings</Text>

        {/* Profile Section */}
        <View style={styles.section}>
          <View style={styles.profileCard}>
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>{userProfile.name.charAt(0)}</Text>
            </View>
            <View style={styles.profileInfo}>
              <Text style={styles.profileName}>{userProfile.name}</Text>
              <Text style={styles.profileEmail}>{userProfile.email}</Text>
              <Text style={styles.profileNumber}>{userProfile.voipNumber}</Text>
            </View>
          </View>
        </View>

        {/* Account Settings */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Account</Text>
          
          {renderSettingItem(
            'person-outline',
            'Edit Profile',
            'Update your personal information',
            () => navigation.navigate('EditProfile')
          )}
          
          {renderSettingItem(
            'shield-checkmark-outline',
            'Privacy & Security',
            'Manage your privacy settings'
          )}
          
          {renderSettingItem(
            'card-outline',
            'Payment Methods',
            'Manage your payment information'
          )}
        </View>

        {/* Language & Translation */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Language & Translation</Text>
          
          {renderSettingItem(
            'language-outline',
            'Preferred Languages',
            userProfile.preferredLanguages.join(', '),
            () => navigation.navigate('LanguageSettings')
          )}
          
          {renderSettingItem(
            'swap-horizontal-outline',
            'Auto Translation',
            'Automatically translate messages',
            undefined,
            <Switch
              value={autoTranslate}
              onValueChange={setAutoTranslate}
              trackColor={{ false: '#f0f0f0', true: '#3B82F6' }}
              thumbColor="#fff"
            />
          )}
          
          {renderSettingItem(
            'mic-outline',
            'Voice Translation',
            'Enable voice message translation'
          )}
        </View>

        {/* Audio Settings */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Audio</Text>
          
          {renderSettingItem(
            'volume-high-outline',
            'Call Audio Quality',
            'High quality'
          )}
          
          {renderSettingItem(
            'headset-outline',
            'Audio Device',
            'Default device'
          )}
          
          {renderSettingItem(
            'mic-outline',
            'Microphone Settings',
            'Adjust microphone sensitivity'
          )}
          
          {renderSettingItem(
            'musical-notes-outline',
            'Ringtone',
            'Default ringtone'
          )}
        </View>

        {/* Notifications */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Notifications</Text>
          
          {renderSettingItem(
            'notifications-outline',
            'Push Notifications',
            'Receive notifications for calls and messages',
            undefined,
            <Switch
              value={notifications}
              onValueChange={setNotifications}
              trackColor={{ false: '#f0f0f0', true: '#3B82F6' }}
              thumbColor="#fff"
            />
          )}
          
          {renderSettingItem(
            'call-outline',
            'Call Notifications',
            'Get notified of incoming calls'
          )}
          
          {renderSettingItem(
            'chatbubble-outline',
            'Message Notifications',
            'Get notified of new messages'
          )}
        </View>

        {/* App Settings */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>App</Text>
          
          {renderSettingItem(
            'contrast-outline',
            'Dark Mode',
            'Switch to dark theme',
            undefined,
            <Switch
              value={darkMode}
              onValueChange={setDarkMode}
              trackColor={{ false: '#f0f0f0', true: '#3B82F6' }}
              thumbColor="#fff"
            />
          )}
          
          {renderSettingItem(
            'language-outline',
            'App Language',
            'English'
          )}
          
          {renderSettingItem(
            'help-circle-outline',
            'Help & Support',
            'Get help and contact support'
          )}
          
          {renderSettingItem(
            'information-circle-outline',
            'About',
            'App version and information'
          )}
        </View>

        {/* Account Actions */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Account Actions</Text>
          
          <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
            <Ionicons name="log-out-outline" size={24} color="#fff" />
            <Text style={styles.logoutButtonText}>Logout</Text>
          </TouchableOpacity>
          
          <TouchableOpacity style={styles.deleteButton} onPress={handleDeleteAccount}>
            <Ionicons name="trash-outline" size={24} color="#FF4444" />
            <Text style={styles.deleteButtonText}>Delete Account</Text>
          </TouchableOpacity>
        </View>

        {/* App Version */}
        <View style={styles.versionSection}>
          <Text style={styles.versionText}>LinguaCall v1.0.0</Text>
          <Text style={styles.copyrightText}>© 2024 LinguaCall. All rights reserved.</Text>
        </View>
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
  content: {
    flex: 1,
    paddingHorizontal: 20,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#000',
    marginTop: 20,
    marginBottom: 24,
  },
  section: {
    marginBottom: 32,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#000',
    marginBottom: 16,
  },
  profileCard: {
    backgroundColor: '#f8f8f8',
    borderRadius: 16,
    padding: 20,
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatar: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#3B82F6',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  avatarText: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
  },
  profileInfo: {
    flex: 1,
  },
  profileName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#000',
    marginBottom: 4,
  },
  profileEmail: {
    fontSize: 14,
    color: '#666',
    marginBottom: 2,
  },
  profileNumber: {
    fontSize: 14,
    color: '#3B82F6',
    fontWeight: '500',
  },
  settingItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#f8f8f8',
    paddingVertical: 16,
    paddingHorizontal: 16,
    borderRadius: 12,
    marginBottom: 8,
  },
  settingLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  settingIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#fff',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  settingContent: {
    flex: 1,
  },
  settingTitle: {
    fontSize: 16,
    color: '#000',
    fontWeight: '500',
    marginBottom: 2,
  },
  settingSubtitle: {
    fontSize: 12,
    color: '#666',
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#3B82F6',
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderRadius: 12,
    marginBottom: 12,
  },
  logoutButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  deleteButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fff',
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#FF4444',
  },
  deleteButtonText: {
    color: '#FF4444',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  versionSection: {
    alignItems: 'center',
    paddingVertical: 20,
    marginBottom: 20,
  },
  versionText: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4,
  },
  copyrightText: {
    fontSize: 12,
    color: '#999',
  },
});

export default SettingsScreen;
