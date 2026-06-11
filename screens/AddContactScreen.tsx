import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  TouchableWithoutFeedback,
  Keyboard,
  StyleSheet,
  TextInput,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { STORAGE_KEYS, scopedKey } from '../config/constants';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import { scale, verticalScale, moderateScale } from '../utils/responsive';

interface AddContactScreenProps {
  navigation: any;
  route?: { params?: { phoneNumber?: string } };
}

const COUNTRY_CODES: [string, string, number][] = [
  ['380', '🇺🇦', 9], ['358', '🇫🇮', 9], ['353', '🇮🇪', 9], ['352', '🇱🇺', 9], ['351', '🇵🇹', 9],
  ['971', '🇦🇪', 9], ['972', '🇮🇱', 9], ['966', '🇸🇦', 9], ['420', '🇨🇿', 9], ['234', '🇳🇬', 10],
  ['86', '🇨🇳', 11], ['84', '🇻🇳', 10], ['82', '🇰🇷', 10], ['81', '🇯🇵', 10], ['66', '🇹🇭', 9],
  ['65', '🇸🇬', 8], ['63', '🇵🇭', 10], ['62', '🇮🇩', 10], ['61', '🇦🇺', 9], ['60', '🇲🇾', 10],
  ['57', '🇨🇴', 10], ['56', '🇨🇱', 9], ['55', '🇧🇷', 11], ['54', '🇦🇷', 10], ['52', '🇲🇽', 10],
  ['51', '🇵🇪', 9], ['49', '🇩🇪', 11], ['48', '🇵🇱', 9], ['47', '🇳🇴', 8], ['46', '🇸🇪', 9],
  ['45', '🇩🇰', 8], ['44', '🇬🇧', 10], ['41', '🇨🇭', 9], ['40', '🇷🇴', 10], ['39', '🇮🇹', 10],
  ['36', '🇭🇺', 9], ['34', '🇪🇸', 9], ['33', '🇫🇷', 9], ['31', '🇳🇱', 9], ['30', '🇬🇷', 10],
  ['27', '🇿🇦', 9], ['91', '🇮🇳', 10], ['90', '🇹🇷', 10], ['7', '🇷🇺', 10], ['1', '🇺🇸', 10],
];

const detectCountry = (num: string) => {
  const digits = num.replace(/[^0-9+]/g, '');
  if (!digits.startsWith('+')) return null;
  const withoutPlus = digits.slice(1);
  for (const [code, flag, maxLocal] of COUNTRY_CODES) {
    if (withoutPlus.startsWith(code)) return { flag, maxLocal, codeLen: code.length };
  }
  return null;
};

const formatPhone = (text: string, maxLocal: number) => {
  const digits = text.replace(/[^0-9+]/g, '');
  if (!digits.startsWith('+')) return digits;
  const codeMatch = digits.match(/^(\+?\d{1,3})(.*)/);
  if (!codeMatch) return digits;
  const cc = codeMatch[1];
  let rest = codeMatch[2].replace(/[^0-9]/g, '').slice(0, maxLocal);
  if (cc === '+1') {
    const area = rest.slice(0, 3);
    const mid = rest.slice(3, 6);
    const last = rest.slice(6, 10);
    let out = cc;
    if (area) {
      out += ` (${area}`;
      if (area.length === 3 && (mid || last)) out += `)`;
      if (mid) out += ` ${mid}`;
      if (last) out += `-${last}`;
    }
    return out;
  }
  const parts: string[] = [cc];
  while (rest.length > 0) {
    const take = parts.length === 1 ? 3 : 4;
    parts.push(rest.slice(0, take));
    rest = rest.slice(take);
  }
  return parts.join(' ');
};

const AddContactScreen: React.FC<AddContactScreenProps> = ({ navigation, route }) => {
  const { user } = useAuth();
  const { colors, isDark } = useTheme();
  const userId = user?.id || 'anonymous';
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [maxDigits, setMaxDigits] = useState(15);
  const phoneRef = useRef<TextInput>(null);

  // Pre-fill phone if passed via params
  React.useEffect(() => {
    if (route?.params?.phoneNumber) {
      let raw = route.params.phoneNumber.replace(/[^0-9+]/g, '');
      if (raw.length > 0 && !raw.startsWith('+')) raw = '+' + raw;
      const detected = detectCountry(raw);
      const maxLocal = detected?.maxLocal ?? 15;
      setMaxDigits(maxLocal);
      setPhone(formatPhone(raw, maxLocal));
    }
  }, []);

  const handlePhoneChange = (text: string) => {
    let raw = text.replace(/[^0-9+]/g, '');
    if (raw.length > 0 && !raw.startsWith('+')) raw = '+' + raw;
    const detected = detectCountry(raw);
    const maxLocal = detected?.maxLocal ?? 15;
    setMaxDigits(maxLocal);
    setPhone(formatPhone(raw, maxLocal));
  };

  const handleSave = async () => {
    if (!name.trim() || !phone.trim()) return;

    const clean = phone.replace(/[^0-9+]/g, '');
    const finalPhone = clean.startsWith('+') ? clean : `+${clean.replace(/^0+/, '')}`;

    try {
      const stored = await AsyncStorage.getItem(scopedKey(STORAGE_KEYS.MY_NUMBERS, userId));
      const activeId = await AsyncStorage.getItem(scopedKey(STORAGE_KEYS.ACTIVE_NUMBER_ID, userId));
      const parsed = stored ? JSON.parse(stored) : [];
      const updated = parsed.map((n: any) =>
        n.id === activeId
          ? { ...n, contacts: [...(n.contacts || []), { id: Date.now().toString(), name: name.trim(), phoneNumber: finalPhone, country: '', flag: '👤', lastCall: 'Just added' }] }
          : n,
      );
      await AsyncStorage.setItem(scopedKey(STORAGE_KEYS.MY_NUMBERS, userId), JSON.stringify(updated));
    } catch (e) {}

    navigation.goBack();
  };

  return (
    <SafeAreaView style={styles.container}>
      <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
        <View style={{ flex: 1 }}>
          <View style={styles.header}>
            <TouchableOpacity onPress={() => navigation.goBack()}>
              <Text style={styles.cancelText}>Cancel</Text>
            </TouchableOpacity>
            <Text style={styles.headerTitle}>New Contact</Text>
            <TouchableOpacity
              onPress={handleSave}
              disabled={!name.trim() || !phone.trim()}
            >
              <Text style={[styles.saveText, (!name.trim() || !phone.trim()) && styles.saveTextDisabled]}>Save</Text>
            </TouchableOpacity>
          </View>

          <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.body}>
            <View style={styles.avatarSection}>
              <View style={styles.avatarCircle}>
                <Text style={styles.avatarLetter}>
                  {name.trim() ? name.charAt(0).toUpperCase() : '?'}
                </Text>
              </View>
            </View>

            <View style={styles.fieldGroup}>
              <View style={styles.fieldRow}>
                <Text style={styles.fieldLabel}>Name</Text>
                <TextInput
                  style={styles.fieldInput}
                  placeholder="Full name"
                  placeholderTextColor="#ccc"
                  value={name}
                  onChangeText={setName}
                  autoCapitalize="words"
                  autoFocus
                />
              </View>
              <View style={styles.divider} />
              <View style={styles.fieldRow}>
                <Text style={styles.fieldLabel}>Phone</Text>
                <View style={styles.phoneInputRow}>
                  {(() => { const d = detectCountry(phone); return d ? <Text style={styles.countryFlag}>{d.flag}</Text> : null; })()}
                  <TextInput
                    style={styles.fieldInput}
                    placeholder="+1 555 123 4567"
                    placeholderTextColor="#ccc"
                    value={phone}
                    onChangeText={handlePhoneChange}
                    keyboardType="phone-pad"
                    ref={phoneRef}
                  />
                  {phone.length > 0 && (
                    <Text style={styles.digitCount}>
                      {phone.replace(/[^0-9]/g, '').length}/{maxDigits}
                    </Text>
                  )}
                </View>
              </View>
            </View>
          </KeyboardAvoidingView>
        </View>
      </TouchableWithoutFeedback>
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
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: scale(16),
    paddingVertical: verticalScale(12),
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  cancelText: {
    fontSize: moderateScale(16),
    color: '#3B82F6',
  },
  headerTitle: {
    fontSize: moderateScale(18),
    fontWeight: '700',
    color: '#111',
  },
  saveText: {
    fontSize: moderateScale(16),
    fontWeight: '700',
    color: '#3B82F6',
  },
  saveTextDisabled: {
    color: '#ccc',
  },
  body: {
    flex: 1,
  },
  avatarSection: {
    alignItems: 'center',
    paddingVertical: verticalScale(30),
  },
  avatarCircle: {
    width: scale(80),
    height: scale(80),
    borderRadius: scale(40),
    backgroundColor: '#f0f0f0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarLetter: {
    fontSize: moderateScale(36),
    fontWeight: '600',
    color: '#999',
  },
  fieldGroup: {
    backgroundColor: '#f8f8f8',
    marginHorizontal: scale(16),
    borderRadius: scale(12),
  },
  fieldRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: scale(16),
    paddingVertical: verticalScale(14),
  },
  fieldLabel: {
    fontSize: moderateScale(15),
    fontWeight: '600',
    color: '#111',
    width: scale(60),
  },
  phoneInputRow: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  countryFlag: {
    fontSize: moderateScale(20),
    marginRight: scale(6),
  },
  fieldInput: {
    flex: 1,
    fontSize: moderateScale(15),
    color: '#111',
  },
  digitCount: {
    fontSize: moderateScale(12),
    color: '#bbb',
    marginLeft: scale(6),
  },
  divider: {
    height: 1,
    backgroundColor: '#e8e8e8',
    marginLeft: scale(76),
  },
});

export default AddContactScreen;
