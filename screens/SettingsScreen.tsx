import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Switch,
  Alert,
  Modal,
  TextInput,
  Pressable,
  KeyboardAvoidingView,
  Platform,
  PanResponder,
  LayoutChangeEvent,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAuth } from '../contexts/AuthContext';
import { useTheme, ThemeColors } from '../contexts/ThemeContext';
import { userApi, authApi } from '../services/api';
import { setVolume as setTtsVolume, setRingtoneEnabled as setTtsRingtone } from '../services/volumeService';
import { RINGTONES, setActiveRingtone as setTtsRingtoneIndex, getActiveRingtone, startRingtone, stopRingtone } from '../services/ringtoneService';
import { scale, verticalScale, moderateScale } from '../utils/responsive';

interface SettingsScreenProps {
  navigation: any;
}

const LANGUAGES = ['English', 'Spanish', 'French', 'German', 'Italian', 'Portuguese', 'Russian', 'Japanese', 'Korean', 'Chinese', 'Arabic', 'Hindi'];

const SettingsScreen: React.FC<SettingsScreenProps> = ({ navigation }) => {
  const { user, logout, updateUser } = useAuth();
  const { isDark, colors, toggleTheme } = useTheme();
  const userId = user?.id || 'anonymous';
  const sk = (key: string) => `${key}_${userId}`;
  const [notifications, setNotifications] = useState(true);
  const [callNotifications, setCallNotifications] = useState(true);
  const [messageNotifications, setMessageNotifications] = useState(true);
  const [autoTranslate, setAutoTranslate] = useState(false);
  const [voiceTranslate, setVoiceTranslate] = useState(true);
  const [callVolume, setCallVolume] = useState(0.85);
  const [ringtoneEnabled, setRingtoneEnabled] = useState(true);
  const [ringtoneIndex, setRingtoneIndex] = useState(0);
  const [showVolumeSlider, setShowVolumeSlider] = useState(false);
  const [showRingtonePicker, setShowRingtonePicker] = useState(false);
  const [ringtonePlaying, setRingtonePlaying] = useState(false);
  const [showEditProfile, setShowEditProfile] = useState(false);
  const [editName, setEditName] = useState('');
  const [showLanguages, setShowLanguages] = useState(false);
  const [selectedLangs, setSelectedLangs] = useState<string[]>(['English', 'Spanish']);
  const [langSearch, setLangSearch] = useState('');
  const [showPrivacy, setShowPrivacy] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [twoFactorEnabled, setTwoFactorEnabled] = useState(false);
  const [showBlocked, setShowBlocked] = useState(false);
  const [blockedContacts, setBlockedContacts] = useState<string[]>([]);
  const [showAppLang, setShowAppLang] = useState(false);
  const [appLang, setAppLang] = useState('English');
  const APP_LANGUAGES = ['English', 'Spanish', 'French', 'German', 'Chinese', 'Japanese', 'Arabic', 'Hindi', 'Portuguese', 'Russian'];

  useEffect(() => {
    loadPrefs();
    return () => { stopRingtone().catch(() => {}); setRingtonePlaying(false); };
  }, []);

  const loadPrefs = async () => {
    try {
      const notif = await AsyncStorage.getItem(sk('@settings_notifications'));
      if (notif !== null) setNotifications(JSON.parse(notif));
      const callNotif = await AsyncStorage.getItem(sk('@settings_call_notifications'));
      if (callNotif !== null) setCallNotifications(JSON.parse(callNotif));
      const msgNotif = await AsyncStorage.getItem(sk('@settings_message_notifications'));
      if (msgNotif !== null) setMessageNotifications(JSON.parse(msgNotif));
      const trans = await AsyncStorage.getItem(sk('@settings_auto_translate'));
      if (trans !== null) setAutoTranslate(JSON.parse(trans));
      const vtrans = await AsyncStorage.getItem(sk('@settings_voice_translate'));
      if (vtrans !== null) setVoiceTranslate(JSON.parse(vtrans));
      const langs = await AsyncStorage.getItem(sk('@settings_preferred_languages'));
      if (langs) setSelectedLangs(JSON.parse(langs));
      const tfa = await AsyncStorage.getItem(sk('@settings_two_factor'));
      if (tfa !== null) setTwoFactorEnabled(JSON.parse(tfa));
      const blocked = await AsyncStorage.getItem(sk('@blocked_contacts'));
      if (blocked) setBlockedContacts(JSON.parse(blocked));
      const vol = await AsyncStorage.getItem(sk('@settings_volume'));
      if (vol !== null) {
        setCallVolume(JSON.parse(vol));
        setTtsVolume(JSON.parse(vol));
      }
      const ring = await AsyncStorage.getItem(sk('@settings_ringtone'));
      if (ring !== null) {
        setRingtoneEnabled(JSON.parse(ring));
        setTtsRingtone(JSON.parse(ring));
      }
      const ringIdx = await AsyncStorage.getItem(sk('@settings_ringtone_index'));
      if (ringIdx !== null) {
        setRingtoneIndex(JSON.parse(ringIdx));
        setTtsRingtoneIndex(JSON.parse(ringIdx));
      }
      const appLanguage = await AsyncStorage.getItem(sk('@settings_app_language'));
      if (appLanguage !== null) setAppLang(JSON.parse(appLanguage));
    } catch {}
  };

  const savePref = async (key: string, value: any) => {
    try {
      await AsyncStorage.setItem(sk(key), JSON.stringify(value));
    } catch {}
  };

  const userProfile = {
    name: user?.name || 'User',
    email: user?.email || 'No email',
    voipNumber: user?.voipNumber || '',
  };

  const handleLogout = () => {
    Alert.alert('Logout', 'Are you sure you want to logout?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Logout',
        onPress: () => {
          logout();
          navigation.navigate('Onboarding');
        },
      },
    ]);
  };

  const handleDeleteAccount = () => {
    Alert.alert('Delete Account', 'This action cannot be undone. All your data will be permanently removed. Are you sure?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            await userApi.deleteAccount();
            await logout();
            navigation.navigate('Onboarding');
          } catch (e) {
            Alert.alert('Error', 'Failed to delete account. Please try again.');
          }
        },
      },
    ]);
  };

  const handleSaveProfile = async () => {
    if (!editName.trim()) return;
    try {
      await userApi.updateProfile({ name: editName.trim() });
      await updateUser();
      Alert.alert('Success', 'Profile updated');
      setShowEditProfile(false);
    } catch (e) {
      Alert.alert('Error', 'Failed to update profile');
    }
  };

  const toggleLanguage = (lang: string) => {
    setSelectedLangs((prev) =>
      prev.includes(lang) ? prev.filter((l) => l !== lang) : [...prev, lang]
    );
  };

  const saveLanguages = () => {
    savePref('@settings_preferred_languages', selectedLangs);
    setShowLanguages(false);
  };

  const handleChangePassword = async () => {
    if (!currentPassword.trim()) { Alert.alert('Error', 'Enter your current password'); return; }
    if (!newPassword.trim() || newPassword.length < 6) { Alert.alert('Error', 'New password must be at least 6 characters'); return; }
    if (newPassword !== confirmPassword) { Alert.alert('Error', 'Passwords do not match'); return; }
    try {
      await authApi.changePassword(currentPassword, newPassword);
      Alert.alert('Success', 'Password changed successfully');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (e) {
      Alert.alert('Error', 'Failed to change password. Check your current password.');
    }
  };

  const unblockContact = (phone: string) => {
    const updated = blockedContacts.filter((b) => b !== phone);
    setBlockedContacts(updated);
    savePref('@blocked_contacts', updated);
  };

  const renderSettingItem = (
    icon: string,
    title: string,
    subtitle?: string,
    onPress?: () => void,
    rightElement?: React.ReactNode
  ) => (
    <TouchableOpacity style={[styles.settingItem, { backgroundColor: colors.card }]} onPress={onPress}>
      <View style={styles.settingLeft}>
        <View style={[styles.settingIcon, { backgroundColor: isDark ? '#2C2C2E' : '#fff' }]}>
          <Ionicons name={icon as any} size={22} color={colors.primary} />
        </View>
        <View style={styles.settingContent}>
          <Text style={[styles.settingTitle, { color: colors.text }]}>{title}</Text>
          {subtitle && <Text style={[styles.settingSubtitle, { color: colors.textSecondary }]}>{subtitle}</Text>}
        </View>
      </View>
      {rightElement !== undefined ? rightElement : (onPress ? <Ionicons name="chevron-forward" size={20} color={colors.textMuted} /> : null)}
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { backgroundColor: colors.headerBg, borderBottomColor: colors.border }]}>
        <TouchableOpacity onPress={() => navigation.openDrawer()}>
          <Ionicons name="menu" size={24} color={colors.text} />
        </TouchableOpacity>
        <TouchableOpacity onPress={() => { loadPrefs(); Alert.alert('Refreshed', 'Settings refreshed'); }}>
          <Ionicons name="refresh" size={24} color={colors.primary} />
        </TouchableOpacity>
      </View>

      <ScrollView style={[styles.content, { backgroundColor: colors.background }]} showsVerticalScrollIndicator={false}>
        <Text style={[styles.title, { color: colors.text }]}>Settings</Text>

        {/* Profile Section */}
        <View style={styles.section}>
          <TouchableOpacity style={[styles.profileCard, { backgroundColor: colors.card }]} onPress={() => { setEditName(userProfile.name); setShowEditProfile(true); }}>
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>{userProfile.name.charAt(0).toUpperCase()}</Text>
            </View>
            <View style={styles.profileInfo}>
              <Text style={[styles.profileName, { color: colors.text }]}>{userProfile.name}</Text>
              <Text style={[styles.profileEmail, { color: colors.textSecondary }]}>{userProfile.email}</Text>
              {userProfile.voipNumber ? <Text style={[styles.profileNumber, { color: colors.primary }]}>{userProfile.voipNumber}</Text> : null}
            </View>
            <Ionicons name="chevron-forward" size={20} color={colors.textMuted} />
          </TouchableOpacity>
        </View>

        {/* Account Settings */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Account</Text>
          {renderSettingItem('person-outline', 'Edit Profile', 'Update your personal information', () => {
            setEditName(userProfile.name);
            setShowEditProfile(true);
          })}
          {renderSettingItem('shield-checkmark-outline', 'Privacy & Security', 'Manage your privacy settings', () => setShowPrivacy(true))}
          {renderSettingItem('card-outline', 'Payment Methods', 'Manage your payment information', () => navigation.navigate('MainTabs', { screen: 'Credits' }))}
        </View>

        {/* Language & Translation */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Language & Translation</Text>
          {renderSettingItem('language-outline', 'Preferred Languages', selectedLangs.join(', '), () => setShowLanguages(true))}
          {renderSettingItem('swap-horizontal-outline', 'Auto Translation', 'Automatically translate messages', undefined, (
            <Switch
              value={autoTranslate}
              onValueChange={(v) => { setAutoTranslate(v); savePref('@settings_auto_translate', v); }}
              trackColor={{ false: '#f0f0f0', true: colors.primary }}
              thumbColor="#fff"
            />
          ))}
          {renderSettingItem('mic-outline', 'Voice Translation', 'Enable voice message translation', undefined, (
            <Switch
              value={voiceTranslate}
              onValueChange={(v) => { setVoiceTranslate(v); savePref('@settings_voice_translate', v); }}
              trackColor={{ false: '#f0f0f0', true: colors.primary }}
              thumbColor="#fff"
            />
          ))}
        </View>

        {/* Audio Settings */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Audio</Text>
          {renderSettingItem('mic-outline', 'Change Voice', 'Select your preferred voice for calls', () => navigation.navigate('VoiceSettings'))}
          {renderSettingItem('volume-high-outline', 'Volume', `Call volume: ${Math.round(callVolume * 100)}%`, () => setShowVolumeSlider(!showVolumeSlider))}
          {showVolumeSlider && (
            <View style={[styles.volumeSliderContainer, { backgroundColor: colors.background }]}>
              <Ionicons name="volume-low" size={20} color={colors.textMuted} />
              <VolumeSlider
                value={callVolume}
                colors={colors}
                onChange={(v) => {
                  setCallVolume(v);
                  setTtsVolume(v);
                  savePref('@settings_volume', v);
                }}
              />
              <Ionicons name="volume-high" size={20} color={colors.textMuted} />
            </View>
          )}
          {renderSettingItem('musical-notes-outline', 'Ringtone', ringtoneEnabled ? RINGTONES[ringtoneIndex].name : 'Silent', () => {
            if (showRingtonePicker) {
              stopRingtone();
              setRingtonePlaying(false);
            }
            setShowRingtonePicker(!showRingtonePicker);
          }, (
            <Switch
              value={ringtoneEnabled}
              onValueChange={(v) => { setRingtoneEnabled(v); setTtsRingtone(v); savePref('@settings_ringtone', v); }}
              trackColor={{ false: '#f0f0f0', true: colors.primary }}
              thumbColor="#fff"
            />
          ))}
          {showRingtonePicker && ringtoneEnabled && (
            <View style={styles.ringtonePicker}>
              {RINGTONES.map((rt, i) => (
                <TouchableOpacity
                  key={i}
                  style={[styles.ringtoneOption, ringtoneIndex === i && { backgroundColor: colors.primaryLight }]}
                  onPress={() => {
                    setRingtoneIndex(i);
                    setTtsRingtoneIndex(i);
                    savePref('@settings_ringtone_index', i);
                    stopRingtone();
                    setRingtonePlaying(false);
                  }}
                >
                  <TouchableOpacity
                    onPress={async () => {
                      if (ringtonePlaying) {
                        await stopRingtone();
                        setRingtonePlaying(false);
                      } else {
                        setTtsRingtoneIndex(i);
                        await stopRingtone();
                        await startRingtone();
                        setRingtonePlaying(true);
                      }
                    }}
                    style={styles.ringtonePlayBtn}
                  >
                    <Ionicons name={ringtonePlaying ? "stop-circle" : "play-circle"} size={24} color={colors.primary} />
                  </TouchableOpacity>
                  <Ionicons
                    name={ringtoneIndex === i ? 'radio-button-on' : 'radio-button-off'}
                    size={20}
                    color={ringtoneIndex === i ? colors.primary : colors.textMuted}
                  />
                  <Text style={[styles.ringtoneOptionText, { color: colors.textSecondary }, ringtoneIndex === i && { color: colors.primary, fontWeight: '600' }]}>
                    {rt.name}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          )}
        </View>

        {/* Notifications */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Notifications</Text>
          {renderSettingItem('notifications-outline', 'Push Notifications', 'Receive notifications for calls and messages', undefined, (
            <Switch
              value={notifications}
              onValueChange={(v) => { setNotifications(v); savePref('@settings_notifications', v); }}
              trackColor={{ false: '#f0f0f0', true: colors.primary }}
              thumbColor="#fff"
            />
          ))}
          {renderSettingItem('call-outline', 'Call Notifications', 'Get notified of incoming calls', undefined, (
            <Switch
              value={callNotifications}
              onValueChange={(v) => { setCallNotifications(v); savePref('@settings_call_notifications', v); }}
              trackColor={{ false: '#f0f0f0', true: colors.primary }}
              thumbColor="#fff"
            />
          ))}
          {renderSettingItem('chatbubble-outline', 'Message Notifications', 'Get notified of new messages', undefined, (
            <Switch
              value={messageNotifications}
              onValueChange={(v) => { setMessageNotifications(v); savePref('@settings_message_notifications', v); }}
              trackColor={{ false: '#f0f0f0', true: colors.primary }}
              thumbColor="#fff"
            />
          ))}
        </View>

        {/* App Settings */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>App</Text>
          {renderSettingItem('contrast-outline', 'Dark Mode', 'Switch to dark theme', undefined, (
            <Switch
              value={isDark}
              onValueChange={toggleTheme}
              trackColor={{ false: '#f0f0f0', true: colors.primary }}
              thumbColor="#fff"
            />
          ))}
          {renderSettingItem('language-outline', 'App Language', appLang, () => setShowAppLang(true))}
          {renderSettingItem('help-circle-outline', 'Help & Support', 'Get help and contact support', () => {
            const url = 'mailto:support@linguacall.app';
            Alert.alert('Help & Support', `Contact us at:\n${url}\n\nWe typically respond within 24 hours.`, [
              { text: 'OK' },
            ]);
          })}
          {renderSettingItem('information-circle-outline', 'About', 'App version and information', () => {
            Alert.alert('About', 'LinguaCall v1.0.0\n\nReal-time translation calling app\n\n© 2024 LinguaCall');
          })}
        </View>

        {/* Account Actions */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Account Actions</Text>
          <TouchableOpacity style={[styles.logoutButton, { backgroundColor: colors.primary }]} onPress={handleLogout}>
            <Ionicons name="log-out-outline" size={24} color="#fff" />
            <Text style={styles.logoutButtonText}>Logout</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.deleteButton, { borderColor: colors.danger }]} onPress={handleDeleteAccount}>
            <Ionicons name="trash-outline" size={24} color={colors.danger} />
            <Text style={[styles.deleteButtonText, { color: colors.danger }]}>Delete Account</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.versionSection}>
          <Text style={[styles.versionText, { color: colors.textSecondary }]}>LinguaCall v1.0.0</Text>
          <Text style={[styles.copyrightText, { color: colors.textMuted }]}>© 2024 LinguaCall. All rights reserved.</Text>
        </View>
      </ScrollView>

      {/* Privacy & Security Modal */}
      <Modal visible={showPrivacy} transparent animationType="slide" onRequestClose={() => setShowPrivacy(false)}>
        <View style={[styles.privacyFullOverlay, { backgroundColor: isDark ? '#000' : '#fff' }]}>
          <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.privacyFullFlex}>
            <View style={[styles.privacyContainer, { backgroundColor: isDark ? colors.background : '#F2F4F7' }]}>
              <View style={[styles.privacyHeader, { backgroundColor: colors.headerBg, borderBottomColor: colors.border }]}>
                <TouchableOpacity onPress={() => setShowPrivacy(false)}>
                  <Text style={[styles.privacyHeaderCancel, { color: colors.primary }]}>Close</Text>
                </TouchableOpacity>
                <View style={styles.privacyHeaderCenter}>
                  <View style={[styles.privacyHeaderIcon, { backgroundColor: colors.primaryLight }]}>
                    <Ionicons name="shield-checkmark" size={20} color={colors.primary} />
                  </View>
                  <Text style={[styles.privacyHeaderTitle, { color: colors.text }]}>Privacy & Security</Text>
                </View>
                <View style={{ width: scale(50) }} />
              </View>

              <ScrollView style={styles.privacyScroll} showsVerticalScrollIndicator={false} contentContainerStyle={styles.privacyScrollContent}>
                {/* Change Password */}
                <View style={[styles.privacyCard, { backgroundColor: colors.card }]}>
                  <View style={styles.privacyCardHeader}>
                    <Ionicons name="lock-closed-outline" size={18} color={colors.primary} />
                    <Text style={[styles.privacyCardTitle, { color: colors.text }]}>Change Password</Text>
                  </View>
                  <View style={[styles.privacyInputWrapper, { backgroundColor: colors.inputBg, borderColor: colors.borderLight }]}>
                    <Ionicons name="key-outline" size={18} color={colors.textMuted} style={styles.privacyInputIcon} />
                    <TextInput
                      style={[styles.privacyInput, { color: colors.text }]}
                      value={currentPassword}
                      onChangeText={setCurrentPassword}
                      placeholder="Current password"
                      placeholderTextColor={colors.textMuted}
                    />
                  </View>
                  <View style={[styles.privacyInputWrapper, { backgroundColor: colors.inputBg, borderColor: colors.borderLight }]}>
                    <Ionicons name="lock-open-outline" size={18} color={colors.textMuted} style={styles.privacyInputIcon} />
                    <TextInput
                      style={[styles.privacyInput, { color: colors.text }]}
                      value={newPassword}
                      onChangeText={setNewPassword}
                      placeholder="New password (min 6 chars)"
                      placeholderTextColor={colors.textMuted}
                    />
                  </View>
                  <View style={[styles.privacyInputWrapper, { backgroundColor: colors.inputBg, borderColor: colors.borderLight }]}>
                    <Ionicons name="checkmark-circle-outline" size={18} color={colors.textMuted} style={styles.privacyInputIcon} />
                    <TextInput
                      style={[styles.privacyInput, { color: colors.text }]}
                      value={confirmPassword}
                      onChangeText={setConfirmPassword}
                      placeholder="Confirm new password"
                      placeholderTextColor={colors.textMuted}
                    />
                  </View>
                  <TouchableOpacity style={[styles.privacyActionBtn, { backgroundColor: colors.text }]} onPress={handleChangePassword}>
                    <Ionicons name="refresh-outline" size={18} color="#fff" style={{ marginRight: 6 }} />
                    <Text style={styles.privacyActionBtnText}>Update Password</Text>
                  </TouchableOpacity>
                </View>

                {/* Two-Factor Authentication */}
                <View style={[styles.privacyCard, { backgroundColor: colors.card }]}>
                  <View style={styles.privacyToggleRow}>
                    <View style={styles.privacyToggleLeft}>
                      <View style={[styles.privacyCardHeader, { marginBottom: 0 }]}>
                        <Ionicons name="shield-half-outline" size={18} color={colors.primary} />
                        <Text style={[styles.privacyCardTitle, { color: colors.text }]}>Two-Factor Auth</Text>
                      </View>
                      <Text style={[styles.privacyCardSub, { color: colors.textSecondary }]}>Add an extra layer of security to your account</Text>
                    </View>
                    <Switch
                      value={twoFactorEnabled}
                      onValueChange={(v) => { setTwoFactorEnabled(v); savePref('@settings_two_factor', v); }}
                      trackColor={{ false: '#E5E7EB', true: '#93C5FD' }}
                      thumbColor={twoFactorEnabled ? colors.primary : '#fff'}
                      ios_backgroundColor="#E5E7EB"
                    />
                  </View>
                </View>

                {/* Blocked Contacts */}
                <View style={[styles.privacyCard, { backgroundColor: colors.card }]}>
                  <TouchableOpacity onPress={() => setShowBlocked(!showBlocked)} style={styles.privacyBlockedHeader}>
                    <View style={styles.privacyCardHeader}>
                      <Ionicons name="ban-outline" size={18} color={colors.danger} />
                      <Text style={[styles.privacyCardTitle, { color: colors.text }]}>Blocked Contacts</Text>
                    </View>
                    <View style={styles.privacyBlockedRight}>
                      <View style={styles.blockedBadge}>
                        <Text style={styles.blockedBadgeText}>{blockedContacts.length}</Text>
                      </View>
                      <Ionicons name={showBlocked ? 'chevron-up' : 'chevron-down'} size={18} color={colors.textMuted} />
                    </View>
                  </TouchableOpacity>
                  {showBlocked && (
                    <View style={[styles.privacyBlockedList, { borderTopColor: colors.borderLight }]}>
                      {blockedContacts.length > 0 ? (
                        blockedContacts.map((phone) => (
                          <View key={phone} style={styles.blockedRow}>
                            <View style={styles.blockedRowLeft}>
                              <View style={styles.blockedAvatar}>
                                <Ionicons name="person-remove-outline" size={18} color={colors.danger} />
                              </View>
                              <Text style={[styles.blockedPhone, { color: colors.text }]}>{phone}</Text>
                            </View>
                            <TouchableOpacity style={[styles.unblockBtn, { backgroundColor: colors.primaryLight }]} onPress={() => unblockContact(phone)}>
                              <Text style={[styles.unblockText, { color: colors.primary }]}>Unblock</Text>
                            </TouchableOpacity>
                          </View>
                        ))
                      ) : (
                        <View style={styles.noBlockedWrap}>
                          <Ionicons name="checkmark-circle" size={36} color={colors.borderLight} />
                          <Text style={[styles.noBlocked, { color: colors.textMuted }]}>No blocked contacts</Text>
                        </View>
                      )}
                    </View>
                  )}
                </View>

                {/* Privacy & Legal */}
                <View style={[styles.privacyCard, { backgroundColor: colors.card }]}>
                  <View style={styles.privacyCardHeader}>
                    <Ionicons name="document-text-outline" size={18} color={colors.primary} />
                    <Text style={[styles.privacyCardTitle, { color: colors.text }]}>Privacy & Legal</Text>
                  </View>
                  <TouchableOpacity
                    style={styles.privacyLinkRow}
                    onPress={() => { setShowPrivacy(false); navigation.navigate('PrivacyPolicy'); }}
                  >
                    <Text style={[styles.privacyLinkText, { color: colors.text }]}>Privacy Policy</Text>
                    <Ionicons name="chevron-forward" size={16} color={colors.textMuted} />
                  </TouchableOpacity>
                  <View style={[styles.privacyLinkDivider, { backgroundColor: colors.borderLight }]} />
                  <TouchableOpacity
                    style={styles.privacyLinkRow}
                    onPress={() => { setShowPrivacy(false); navigation.navigate('TermsOfService'); }}
                  >
                    <Text style={[styles.privacyLinkText, { color: colors.text }]}>Terms of Service</Text>
                    <Ionicons name="chevron-forward" size={16} color={colors.textMuted} />
                  </TouchableOpacity>
                  <View style={[styles.privacyLinkDivider, { backgroundColor: colors.borderLight }]} />
                  <TouchableOpacity
                    style={styles.privacyLinkRow}
                    onPress={() => Alert.alert('Data & Storage', 'You can request your data export or deletion from the Account Actions section below.')}
                  >
                    <Text style={[styles.privacyLinkText, { color: colors.text }]}>Data & Storage</Text>
                    <Ionicons name="chevron-forward" size={16} color={colors.textMuted} />
                  </TouchableOpacity>
                </View>

                <View style={{ height: verticalScale(24) }} />
              </ScrollView>
            </View>
          </KeyboardAvoidingView>
        </View>
      </Modal>

      {/* Edit Profile Modal */}
      <Modal visible={showEditProfile} transparent animationType="slide" onRequestClose={() => setShowEditProfile(false)}>
        <View style={[styles.privacyFullOverlay, { backgroundColor: isDark ? '#000' : '#fff' }]}>
          <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.privacyFullFlex}>
            <View style={[styles.editContainer, { backgroundColor: colors.cardAlt }]}>
              <View style={[styles.editHeader, { backgroundColor: colors.headerBg, borderBottomColor: colors.border }]}>
                <TouchableOpacity onPress={() => setShowEditProfile(false)}>
                  <Text style={[styles.editCancel, { color: colors.primary }]}>Cancel</Text>
                </TouchableOpacity>
                <Text style={[styles.editHeaderTitle, { color: colors.text }]}>Edit Profile</Text>
                <TouchableOpacity onPress={handleSaveProfile} disabled={!editName.trim()}>
                  <Text style={[styles.editSave, { color: colors.primary }, !editName.trim() && { color: '#A0C4FF' }]}>Save</Text>
                </TouchableOpacity>
              </View>

              <ScrollView style={styles.privacyScroll} contentContainerStyle={styles.editScrollContent}>
                <View style={styles.editAvatarSection}>
                  <View style={styles.editAvatarOuter}>
                    <View style={styles.editAvatarCircle}>
                      <Text style={styles.editAvatarText}>{editName.charAt(0).toUpperCase() || '?'}</Text>
                    </View>
                    <TouchableOpacity style={styles.editAvatarBadge}>
                      <Ionicons name="camera" size={18} color="#fff" />
                    </TouchableOpacity>
                  </View>
                  <Text style={[styles.editAvatarLabel, { color: colors.primary }]}>Change Photo</Text>
                </View>

                <View style={[styles.privacyCard, { backgroundColor: colors.card }]}>
                  <Text style={[styles.editLabel, { color: colors.textSecondary }]}>Full Name</Text>
                  <View style={[styles.privacyInputWrapper, { backgroundColor: colors.inputBg, borderColor: colors.borderLight }]}>
                    <Ionicons name="person-outline" size={18} color={colors.textMuted} style={styles.privacyInputIcon} />
                    <TextInput
                      style={[styles.privacyInput, { color: colors.text }]}
                      value={editName}
                      onChangeText={setEditName}
                      placeholder="Enter your name"
                      placeholderTextColor={colors.textMuted}
                      autoFocus
                    />
                  </View>

                  <Text style={[styles.editLabel, { marginTop: verticalScale(12), color: colors.textSecondary }]}>Email</Text>
                  <View style={[styles.privacyInputWrapper, { backgroundColor: isDark ? '#2C2C2E' : '#F3F4F6', borderColor: colors.borderLight }]}>
                    <Ionicons name="mail-outline" size={18} color={colors.textMuted} style={styles.privacyInputIcon} />
                    <Text style={[styles.privacyInput, { color: colors.textMuted }]}>{userProfile.email}</Text>
                  </View>

                  <Text style={[styles.editLabel, { marginTop: verticalScale(12), color: colors.textSecondary }]}>Phone Number</Text>
                  <View style={[styles.privacyInputWrapper, { backgroundColor: isDark ? '#2C2C2E' : '#F3F4F6', borderColor: colors.borderLight }]}>
                    <Ionicons name="call-outline" size={18} color={colors.textMuted} style={styles.privacyInputIcon} />
                    <Text style={[styles.privacyInput, { color: colors.textMuted }]}>{userProfile.voipNumber || 'Not set'}</Text>
                  </View>
                </View>
              </ScrollView>
            </View>
          </KeyboardAvoidingView>
        </View>
      </Modal>

      {/* Language Selection Modal */}
      <Modal visible={showLanguages} transparent animationType="slide" onRequestClose={() => setShowLanguages(false)}>
        <View style={[styles.privacyFullOverlay, { backgroundColor: isDark ? '#000' : '#fff' }]}>
          <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.privacyFullFlex}>
            <View style={[styles.editContainer, { backgroundColor: colors.cardAlt }]}>
              <View style={[styles.editHeader, { backgroundColor: colors.headerBg, borderBottomColor: colors.border }]}>
                <TouchableOpacity onPress={() => setShowLanguages(false)}>
                  <Text style={[styles.editCancel, { color: colors.primary }]}>Cancel</Text>
                </TouchableOpacity>
                <Text style={[styles.editHeaderTitle, { color: colors.text }]}>Preferred Languages</Text>
                <TouchableOpacity onPress={saveLanguages}>
                  <Text style={[styles.editSave, { color: colors.primary }]}>Done</Text>
                </TouchableOpacity>
              </View>

              <TextInput
                style={[styles.langSearchInput, { backgroundColor: isDark ? '#2C2C2E' : '#F3F4F6', color: colors.text }]}
                value={langSearch}
                onChangeText={setLangSearch}
                placeholder="Search languages..."
                placeholderTextColor={colors.textMuted}
              />

              <ScrollView style={styles.privacyScroll} showsVerticalScrollIndicator={false} contentContainerStyle={styles.langListContent}>
                {LANGUAGES.filter((l) => l.toLowerCase().includes(langSearch.toLowerCase())).map((lang) => (
                  <TouchableOpacity key={lang} style={[styles.langRow, { borderBottomColor: colors.borderLight }]} onPress={() => toggleLanguage(lang)}>
                    <Text style={[styles.langRowText, { color: colors.text }]}>{lang}</Text>
                    <Ionicons
                      name={selectedLangs.includes(lang) ? 'checkbox' : 'square-outline'}
                      size={22}
                      color={selectedLangs.includes(lang) ? colors.primary : colors.textMuted}
                    />
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
          </KeyboardAvoidingView>
        </View>
      </Modal>

      {/* App Language Modal */}
      <Modal visible={showAppLang} transparent animationType="slide" onRequestClose={() => setShowAppLang(false)}>
        <View style={[styles.privacyFullOverlay, { backgroundColor: isDark ? '#000' : '#fff' }]}>
          <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.privacyFullFlex}>
            <View style={[styles.editContainer, { backgroundColor: colors.cardAlt }]}>
              <View style={[styles.editHeader, { backgroundColor: colors.headerBg, borderBottomColor: colors.border }]}>
                <TouchableOpacity onPress={() => setShowAppLang(false)}>
                  <Text style={[styles.editCancel, { color: colors.primary }]}>Cancel</Text>
                </TouchableOpacity>
                <Text style={[styles.editHeaderTitle, { color: colors.text }]}>App Language</Text>
                <TouchableOpacity onPress={() => setShowAppLang(false)}>
                  <Text style={[styles.editSave, { color: colors.primary }]}>Done</Text>
                </TouchableOpacity>
              </View>

              <ScrollView style={styles.privacyScroll} showsVerticalScrollIndicator={false} contentContainerStyle={styles.langListContent}>
                {APP_LANGUAGES.map((lang) => (
                  <TouchableOpacity key={lang} style={[styles.langRow, { borderBottomColor: colors.borderLight }]} onPress={() => { setAppLang(lang); savePref('@settings_app_language', lang); setShowAppLang(false); }}>
                    <Text style={[styles.langRowText, { color: colors.text }]}>{lang}</Text>
                    <Ionicons
                      name={appLang === lang ? 'radio-button-on' : 'radio-button-off'}
                      size={22}
                      color={appLang === lang ? colors.primary : colors.textMuted}
                    />
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
          </KeyboardAvoidingView>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

interface VolumeSliderProps {
  value: number;
  onChange: (val: number) => void;
  colors: ThemeColors;
}

const VolumeSlider: React.FC<VolumeSliderProps> = ({ value, onChange, colors }) => {
  const barRef = useRef<View>(null);
  const barWidthRef = useRef(0);
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;

  const onLayout = (e: LayoutChangeEvent) => {
    barWidthRef.current = e.nativeEvent.layout.width;
  };

  const updateFromX = (x: number) => {
    const w = barWidthRef.current;
    if (w <= 0) return;
    const clamped = Math.max(0, Math.min(x, w));
    const v = Math.round((clamped / w) * 20) / 20;
    onChangeRef.current(v);
  };

  const panResponder = React.useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => true,
        onMoveShouldSetPanResponder: () => true,
        onPanResponderGrant: (evt) => {
          updateFromX(evt.nativeEvent.locationX);
        },
        onPanResponderMove: (evt) => {
          updateFromX(evt.nativeEvent.locationX);
        },
      }),
    [],
  );

  const segments = 20;
  const fillSegments = Math.round(value * segments);

  return (
    <View
      ref={barRef}
      style={[styles.sliderBar, { backgroundColor: colors.background }]}
      onLayout={onLayout}
      {...panResponder.panHandlers}
    >
      <View style={[styles.sliderTrack, { backgroundColor: colors.border }]}>
        <View style={[styles.sliderFill, { backgroundColor: colors.primary, width: `${(fillSegments / segments) * 100}%` }]} />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: scale(20),
    paddingVertical: verticalScale(16),
    borderBottomWidth: 1,
  },
  content: { flex: 1, paddingHorizontal: scale(20) },
  title: {
    fontSize: moderateScale(32),
    fontWeight: 'bold',
    marginTop: verticalScale(20),
    marginBottom: verticalScale(24),
  },
  section: { marginBottom: verticalScale(32) },
  sectionTitle: {
    fontSize: moderateScale(18),
    fontWeight: 'bold',
    marginBottom: verticalScale(16),
  },
  profileCard: {
    borderRadius: scale(16),
    padding: scale(20),
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatar: {
    width: scale(60),
    height: verticalScale(60),
    borderRadius: scale(30),
    backgroundColor: '#3B82F6',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  avatarText: { fontSize: moderateScale(24), fontWeight: 'bold', color: '#fff' },
  profileInfo: { flex: 1 },
  profileName: {
    fontSize: moderateScale(18), fontWeight: 'bold', marginBottom: verticalScale(4),
  },
  profileEmail: { fontSize: moderateScale(14), marginBottom: verticalScale(2) },
  profileNumber: { fontSize: moderateScale(14), fontWeight: '500' },
  settingItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: verticalScale(16),
    paddingHorizontal: scale(16),
    borderRadius: scale(12),
    marginBottom: verticalScale(8),
  },
  settingLeft: { flexDirection: 'row', alignItems: 'center', flex: 1 },
  settingIcon: {
    width: scale(40),
    height: verticalScale(40),
    borderRadius: scale(20),
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  settingContent: { flex: 1 },
  settingTitle: { fontSize: moderateScale(16), fontWeight: '500', marginBottom: verticalScale(2) },
  settingSubtitle: { fontSize: moderateScale(12) },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: verticalScale(16),
    paddingHorizontal: scale(20),
    borderRadius: scale(28),
    marginBottom: verticalScale(12),
  },
  logoutButtonText: { color: '#fff', fontSize: moderateScale(16), fontWeight: '600', marginLeft: 8 },
  deleteButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fff',
    paddingVertical: verticalScale(16),
    paddingHorizontal: scale(20),
    borderRadius: scale(28),
    borderWidth: 1,
  },
  deleteButtonText: { fontSize: moderateScale(16), fontWeight: '600', marginLeft: 8 },
  versionSection: { alignItems: 'center', paddingVertical: verticalScale(20), marginBottom: verticalScale(20) },
  versionText: { fontSize: moderateScale(14), marginBottom: verticalScale(4) },
  copyrightText: { fontSize: moderateScale(12) },
  editOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)' },
  editContainer: { flex: 1 },
  editHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: scale(20),
    paddingTop: verticalScale(56),
    paddingBottom: verticalScale(14),
    borderBottomWidth: 1,
  },
  editCancel: { fontSize: moderateScale(16), fontWeight: '500' },
  editHeaderTitle: { fontSize: moderateScale(18), fontWeight: '700' },
  editSave: { fontSize: moderateScale(16), fontWeight: '600' },
  editScrollContent: {
    padding: scale(16),
    paddingBottom: verticalScale(40),
  },
  editAvatarSection: {
    alignItems: 'center',
    paddingVertical: verticalScale(32),
    backgroundColor: '#f8f9ff',
  },
  editAvatarOuter: {
    position: 'relative',
    marginBottom: verticalScale(8),
  },
  editAvatarCircle: {
    width: scale(96),
    height: scale(96),
    borderRadius: scale(48),
    backgroundColor: '#3B82F6',
    justifyContent: 'center',
    alignItems: 'center',
  },
  editAvatarText: { fontSize: moderateScale(40), fontWeight: 'bold', color: '#fff' },
  editAvatarBadge: {
    position: 'absolute',
    bottom: 0,
    right: -2,
    width: scale(32),
    height: scale(32),
    borderRadius: scale(16),
    backgroundColor: '#3B82F6',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: '#fff',
  },
  editAvatarLabel: { fontSize: moderateScale(14), fontWeight: '500' },
  editForm: { padding: scale(24), gap: verticalScale(16) },
  editLabel: { fontSize: moderateScale(13), fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.5 },
  langListContent: { paddingBottom: verticalScale(40) },
  langRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: verticalScale(12),
    borderBottomWidth: 0.5,
    paddingHorizontal: scale(20),
  },
  langRowText: { fontSize: moderateScale(16) },
  langSearchInput: {
    marginHorizontal: scale(20),
    marginTop: verticalScale(8),
    marginBottom: verticalScale(12),
    borderRadius: scale(10),
    paddingHorizontal: scale(16),
    paddingVertical: verticalScale(12),
    fontSize: moderateScale(15),
  },

  // Privacy & Security
  privacyFullOverlay: { flex: 1 },
  privacyFullFlex: { flex: 1 },
  privacyContainer: { flex: 1 },
  privacyHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: scale(20),
    paddingTop: verticalScale(56),
    paddingBottom: verticalScale(14),
    borderBottomWidth: 1,
  },
  privacyHeaderCancel: { fontSize: moderateScale(16), fontWeight: '500' },
  privacyHeaderCenter: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: scale(8),
  },
  privacyHeaderIcon: {
    width: scale(32),
    height: scale(32),
    borderRadius: scale(16),
    justifyContent: 'center',
    alignItems: 'center',
  },
  privacyHeaderTitle: { fontSize: moderateScale(17), fontWeight: '700' },
  privacyScroll: { flex: 1 },
  privacyScrollContent: {
    padding: scale(16),
    paddingBottom: verticalScale(40),
  },
  privacyCard: {
    borderRadius: scale(16),
    padding: scale(16),
    marginBottom: verticalScale(12),
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  privacyCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: scale(8),
    marginBottom: verticalScale(14),
  },
  privacyCardTitle: { fontSize: moderateScale(15), fontWeight: '600' },
  privacyCardSub: { fontSize: moderateScale(13), marginTop: verticalScale(2) },
  privacyInputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: scale(12),
    paddingHorizontal: scale(14),
    marginBottom: verticalScale(10),
  },
  privacyInputIcon: { marginRight: scale(10) },
  privacyInput: {
    flex: 1,
    paddingVertical: verticalScale(13),
    fontSize: moderateScale(15),
  },
  privacyActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: verticalScale(13),
    borderRadius: scale(12),
    marginTop: verticalScale(6),
  },
  privacyActionBtnText: { fontSize: moderateScale(15), fontWeight: '600', color: '#fff' },
  privacyToggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  privacyToggleLeft: { flex: 1, marginRight: scale(12) },
  privacyBlockedHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  privacyBlockedRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: scale(8),
  },
  privacyBlockedList: {
    marginTop: verticalScale(4),
    borderTopWidth: 1,
  },
  blockedBadge: {
    backgroundColor: '#FEF2F2',
    borderRadius: scale(10),
    paddingHorizontal: scale(9),
    paddingVertical: verticalScale(2),
    minWidth: scale(22),
    alignItems: 'center',
  },
  blockedBadgeText: { fontSize: moderateScale(12), color: '#EF4444', fontWeight: '700' },
  blockedRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: verticalScale(12),
    paddingLeft: scale(4),
  },
  blockedRowLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: scale(12),
  },
  blockedAvatar: {
    width: scale(36),
    height: scale(36),
    borderRadius: scale(18),
    backgroundColor: '#FEF2F2',
    justifyContent: 'center',
    alignItems: 'center',
  },
  blockedPhone: { fontSize: moderateScale(15), fontWeight: '500' },
  unblockBtn: {
    paddingHorizontal: scale(14),
    paddingVertical: verticalScale(6),
    borderRadius: scale(20),
  },
  unblockText: { fontSize: moderateScale(13), fontWeight: '600' },
  noBlockedWrap: { alignItems: 'center', paddingVertical: verticalScale(20), gap: verticalScale(6) },
  noBlocked: { fontSize: moderateScale(14) },
  privacyLinkRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: verticalScale(10),
    paddingHorizontal: scale(4),
  },
  privacyLinkDivider: { height: 1, marginLeft: scale(4) },
  privacyLinkText: { fontSize: moderateScale(15) },
  volumeSliderContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: scale(20),
    paddingBottom: verticalScale(12),
    gap: scale(10),
  },
  sliderBar: {
    flex: 1,
    height: 32,
    justifyContent: 'center',
  },
  sliderTrack: {
    height: 6,
    borderRadius: 3,
    overflow: 'hidden',
  },
  sliderFill: {
    height: 6,
    borderRadius: 3,
  },
  ringtonePicker: {
    paddingHorizontal: scale(20),
    paddingBottom: verticalScale(12),
  },
  ringtoneOption: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: verticalScale(6),
    paddingHorizontal: scale(4),
    borderRadius: scale(8),
  },
  ringtonePlayBtn: {
    padding: 4,
    marginRight: 8,
  },
  ringtoneOptionText: {
    fontSize: moderateScale(15),
    marginLeft: 10,
  },
});

export default SettingsScreen;
