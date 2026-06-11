import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  FlatList,
  TextInput,
  Modal,
  Dimensions,
  ActivityIndicator,
  Alert,
  Pressable,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { STORAGE_KEYS, scopedKey } from '../config/constants';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import { numbersApi, creditsApi, callApi } from '../services/api';
import { scale, verticalScale, moderateScale } from '../utils/responsive';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

interface DashboardScreenProps {
  navigation: any;
}

interface Contact {
  id: string;
  name: string;
  country: string;
  flag: string;
  phoneNumber: string;
  lastCall: string;
}

interface CallRecord {
  id: string;
  name: string;
  phoneNumber: string;
  duration: string;
  time: string;
  type: 'incoming' | 'outgoing';
}

interface VoipNumber {
  id: string;
  country: string;
  flag: string;
  dialCode: string;
  number: string;
  rawNumber: string;
  contacts: Contact[];
  recentCalls: CallRecord[];
}

interface CountryOption {
  country: string;
  flag: string;
  dialCode: string;
  code: string;
  localDigits: number;
}

interface AvailablePhoneNumber {
  id: string;
  number: string;
  formattedNumber: string;
  description: string;
}

const MAX_NUMBERS = 3;

const COUNTRIES: CountryOption[] = [
  { country: 'United States', flag: '🇺🇸', dialCode: '+1', code: 'US', localDigits: 10 },
  { country: 'United Kingdom', flag: '🇬🇧', dialCode: '+44', code: 'GB', localDigits: 10 },
  { country: 'Spain', flag: '🇪🇸', dialCode: '+34', code: 'ES', localDigits: 9 },
  { country: 'France', flag: '🇫🇷', dialCode: '+33', code: 'FR', localDigits: 9 },
  { country: 'Germany', flag: '🇩🇪', dialCode: '+49', code: 'DE', localDigits: 11 },
  { country: 'Nigeria', flag: '🇳🇬', dialCode: '+234', code: 'NG', localDigits: 10 },
  { country: 'Canada', flag: '🇨🇦', dialCode: '+1', code: 'CA', localDigits: 10 },
  { country: 'Australia', flag: '🇦🇺', dialCode: '+61', code: 'AU', localDigits: 9 },
  { country: 'India', flag: '🇮🇳', dialCode: '+91', code: 'IN', localDigits: 10 },
  { country: 'Brazil', flag: '🇧🇷', dialCode: '+55', code: 'BR', localDigits: 11 },
  { country: 'Japan', flag: '🇯🇵', dialCode: '+81', code: 'JP', localDigits: 10 },
  { country: 'South Africa', flag: '🇿🇦', dialCode: '+27', code: 'ZA', localDigits: 9 },
];

// Map backend country codes to flag/dialCode
const COUNTRY_MAP: Record<string, CountryOption> = {};
COUNTRIES.forEach(c => { COUNTRY_MAP[c.code] = c; });

// Map dial codes (without +) to country info for contact detection
const DIAL_CODE_MAP: Record<string, CountryOption> = {};
COUNTRIES.forEach(c => {
  const key = c.dialCode.replace('+', '');
  // Don't overwrite — first entry wins (US over Canada for +1)
  if (!DIAL_CODE_MAP[key]) DIAL_CODE_MAP[key] = c;
});

const detectCountryFromNumber = (num: string) => {
  const clean = num.replace(/[^0-9+]/g, '');
  if (!clean.startsWith('+')) return null;
  const withoutPlus = clean.slice(1);
  for (const [code, info] of Object.entries(DIAL_CODE_MAP)) {
    if (withoutPlus.startsWith(code)) return info;
  }
  return null;
};

const formatPhoneNumber = (num: string) => {
  if (!num) return num;
  const info = detectCountryFromNumber(num);
  if (!info) return num;
  const withoutPlus = num.startsWith('+') ? num.slice(1) : num;
  const dialCode = info.dialCode.replace('+', '');
  if (!withoutPlus.startsWith(dialCode)) return num;
  const local = withoutPlus.slice(dialCode.length).replace(/[^0-9]/g, '');
  if (local.length === 0) return '+' + dialCode;
  const parts: string[] = [];
  let r = local;
  const take = (n: number) => { const p = r.slice(0, n); parts.push(p); r = r.slice(n); };
  take(3);
  if (r.length > 0) { take(3); if (r.length > 0) parts.push(r); }
  return '+' + dialCode + ' ' + parts.filter(p => p).join(' ');
};

const DashboardScreen: React.FC<DashboardScreenProps> = ({ navigation }) => {
  const { user } = useAuth();
  const { colors, isDark } = useTheme();
  const userId = user?.id || 'anonymous';
  const [activeTab, setActiveTab] = useState<'contacts' | 'history'>('contacts');
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoaded, setIsLoaded] = useState(false);

  // No number by default — user must pick from inline list
  const [myNumbers, setMyNumbers] = useState<VoipNumber[]>([]);
  const [activeNumberId, setActiveNumberId] = useState<string | null>(null);
  const [credits, setCredits] = useState(0);
  const [trialRemainingMs, setTrialRemainingMs] = useState(0);
  const [trialActive, setTrialActive] = useState(false);
  const [isPremium, setIsPremium] = useState(false);
  const [premiumUntil, setPremiumUntil] = useState<Date | null>(null);
  const [backendCallHistory, setBackendCallHistory] = useState<CallRecord[]>([]);
  const [actionItem, setActionItem] = useState<{ phoneNumber: string; name: string; flag?: string } | null>(null);
  const [showActionSheet, setShowActionSheet] = useState(false);
  const [actionIsContact, setActionIsContact] = useState(false);

  const fetchCallHistory = useCallback(async () => {
    try {
      // Fetch backend calls
      let backendCalls: any[] = [];
      try {
        const callsRes = await callApi.getCallHistory();
        const calls = callsRes?.data?.calls ?? callsRes?.data ?? [];
        if (Array.isArray(calls)) backendCalls = calls;
      } catch (e) {
        // ignore
      }

      // Fetch local calls
      let localCalls: any[] = [];
      try {
        const stored = await AsyncStorage.getItem(scopedKey(STORAGE_KEYS.LOCAL_CALL_HISTORY, userId));
        if (stored) localCalls = JSON.parse(stored);
      } catch (e) {
        // ignore
      }

      // Merge: local calls first (newest), then backend calls
      const allCalls = [...localCalls, ...backendCalls];
      setBackendCallHistory(allCalls.map((c: any) => ({
        id: c._id || c.id,
        name: c.receiverNumber || c.callerNumber || 'Unknown',
        phoneNumber: c.receiverNumber || '',
        duration: c.duration ? `${Math.floor(c.duration / 60)}:${(c.duration % 60).toString().padStart(2, '0')}` : '',
        time: c.createdAt ? new Date(c.createdAt).toLocaleString() : '',
        type: 'outgoing',
      })));
    } catch (e) {
      // ignore
    }
  }, []);

  // Refresh numbers and call history when screen gains focus
  useEffect(() => {
    const unsub = navigation.addListener('focus', async () => {
      await fetchCallHistory();
      // Re-read numbers from AsyncStorage to pick up newly saved contacts
      try {
        const stored = await AsyncStorage.getItem(scopedKey(STORAGE_KEYS.MY_NUMBERS, userId));
        const activeId = await AsyncStorage.getItem(scopedKey(STORAGE_KEYS.ACTIVE_NUMBER_ID, userId));
        const parsed: VoipNumber[] = stored ? JSON.parse(stored) : [];
        if (parsed.length > 0) {
          setMyNumbers(parsed);
          if (activeId && parsed.find((n) => n.id === activeId)) {
            setActiveNumberId(activeId);
          } else {
            setActiveNumberId(parsed[0].id);
          }
        }
      } catch (e) {
        // ignore
      }
    });
    return unsub;
  }, [navigation, fetchCallHistory]);

  // Load persisted numbers on mount, then sync with backend
  useEffect(() => {
    (async () => {
      try {
        const stored = await AsyncStorage.getItem(scopedKey(STORAGE_KEYS.MY_NUMBERS, userId));
        const activeId = await AsyncStorage.getItem(scopedKey(STORAGE_KEYS.ACTIVE_NUMBER_ID, userId));
        const parsed: VoipNumber[] = stored ? JSON.parse(stored) : [];
        setMyNumbers(parsed);
        if (activeId && parsed.find((n) => n.id === activeId)) {
          setActiveNumberId(activeId);
        } else if (parsed.length > 0) {
          setActiveNumberId(parsed[0].id);
        }
        // Sync with backend — merge with local data to preserve contacts/calls
        try {
          const res = await numbersApi.getMine();
          const backendNumbers: string[] = res?.data?.numbers ?? [];
          if (Array.isArray(backendNumbers) && backendNumbers.length > 0) {
            const localByRaw = new Map<string, VoipNumber>();
            parsed.forEach((n) => {
              if (n.rawNumber) localByRaw.set(n.rawNumber, n);
            });

            const mapped: VoipNumber[] = backendNumbers.map((raw: string, i: number) => {
              const existing = localByRaw.get(raw);
              const countryInfo = COUNTRY_MAP['US'];
              const localNumber = raw.replace(/^\+\d+\s*/, '');
              return {
                id: existing?.id || `be_${i}`,
                country: existing?.country || countryInfo.country,
                flag: existing?.flag || countryInfo.flag,
                dialCode: existing?.dialCode || countryInfo.dialCode,
                number: existing?.number || localNumber,
                rawNumber: raw,
                contacts: existing?.contacts || [],
                recentCalls: existing?.recentCalls || [],
              };
            });
            setMyNumbers(mapped);
            if (mapped.length > 0) {
              setActiveNumberId(mapped[0].id);
            }
          }
        } catch (e) {
          // Backend unavailable — keep local data
        }

        // Fetch real credit & subscription status
        try {
          const statusRes = await creditsApi.getStatus();
          const d = statusRes?.data ?? {};
          setCredits(d.credits ?? 0);
          setTrialActive(d.trialActive ?? false);
          setTrialRemainingMs(d.trialRemainingMs ?? 0);
          setIsPremium(d.isPremium ?? false);
          setPremiumUntil(d.premiumUntil ? new Date(d.premiumUntil) : null);
        } catch (e) {
          // ignore
        }

      } catch (e) {
        // ignore
      }
      setIsLoaded(true);
    })();
  }, []);

  // Save numbers whenever they change
  useEffect(() => {
    if (!isLoaded) return;
    AsyncStorage.setItem(scopedKey(STORAGE_KEYS.MY_NUMBERS, userId), JSON.stringify(myNumbers)).catch(() => {});
  }, [myNumbers, isLoaded]);

  // Save active number id whenever it changes
  useEffect(() => {
    if (!isLoaded) return;
    if (activeNumberId) {
      AsyncStorage.setItem(scopedKey(STORAGE_KEYS.ACTIVE_NUMBER_ID, userId), activeNumberId).catch(() => {});
    } else {
      AsyncStorage.removeItem(scopedKey(STORAGE_KEYS.ACTIVE_NUMBER_ID, userId)).catch(() => {});
    }
  }, [activeNumberId, isLoaded]);

  // Add Number modal (used after first number is chosen)
  const [showAddModal, setShowAddModal] = useState(false);
  const [showSwitchModal, setShowSwitchModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showAddContactModal, setShowAddContactModal] = useState(false);
  const [newContactName, setNewContactName] = useState('');
  const [newContactPhone, setNewContactPhone] = useState('');
  const [newContactCountry, setNewContactCountry] = useState('');
  const [countrySearch, setCountrySearch] = useState('');
  const [step, setStep] = useState<'country' | 'number'>('country');
  const [selectedCountry, setSelectedCountry] = useState<CountryOption | null>(null);
  const [availableNumbers, setAvailableNumbers] = useState<AvailablePhoneNumber[]>([]);
  const [loadingNumbers, setLoadingNumbers] = useState(false);

  const activeNumber = myNumbers.find((n) => n.id === activeNumberId) ?? null;
  const hasNumbers = myNumbers.length > 0;
  const canAddMore = myNumbers.length < MAX_NUMBERS;
  const slotsRemaining = MAX_NUMBERS - myNumbers.length;

  const filteredContacts = (activeNumber?.contacts ?? []).filter(
    (c) =>
      searchQuery === '' ||
      c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.country.toLowerCase().includes(searchQuery.toLowerCase()),
  );

  const filteredCalls = ((activeNumber?.recentCalls?.length ?? 0) > 0
    ? (activeNumber?.recentCalls ?? [])
    : backendCallHistory
  ).filter(
    (c) => searchQuery === '' || c.name.toLowerCase().includes(searchQuery.toLowerCase()),
  );

  // Countries not yet added (for the Add Number modal)
  const availableToAdd = COUNTRIES.filter(
    (c) =>
      !myNumbers.find((n) => n.country === c.country) &&
      (countrySearch === '' ||
        c.country.toLowerCase().includes(countrySearch.toLowerCase()) ||
        c.dialCode.includes(countrySearch)),
  );

  const handlePickNumber = async (option: CountryOption) => {
    if (!canAddMore) return;
    setSelectedCountry(option);
    setStep('number');
    setLoadingNumbers(true);
    setAvailableNumbers([]);
    try {
      const res = await numbersApi.getAvailable(option.code);
      const numbers = res?.data?.numbers ?? res?.data ?? [];
      const mapped: AvailablePhoneNumber[] = (Array.isArray(numbers) ? numbers : []).map((n: any) => ({
        id: n.sid || n.phoneNumber,
        number: n.phoneNumber,
        formattedNumber: n.friendlyName || n.phoneNumber,
        description: n.locality || n.region || '',
      }));
      setAvailableNumbers(mapped);
    } catch (e) {
      setAvailableNumbers([]);
    }
    setLoadingNumbers(false);
    if (!hasNumbers) {
      setShowAddModal(true);
    }
  };

  const handleSelectNumber = async (phone: AvailablePhoneNumber) => {
    if (!selectedCountry) return;
    try {
      await numbersApi.addNumber(phone.number);
    } catch (e) {
      // backend may fall back to mock when Twilio isn't configured
      console.warn('Number purchase API failed, continuing with local mock');
    }
    const newNum: VoipNumber = {
      id: Date.now().toString(),
      country: selectedCountry.country,
      flag: selectedCountry.flag,
      dialCode: selectedCountry.dialCode,
      number: phone.formattedNumber.replace(selectedCountry.dialCode, '').trim(),
      rawNumber: phone.number,
      contacts: [],
      recentCalls: [],
    };
    setMyNumbers((prev) => [...prev, newNum]);
    setActiveNumberId(newNum.id);
    setShowAddModal(false);
    setCountrySearch('');
    setStep('country');
    setSelectedCountry(null);
  };

  const handleCloseAddModal = () => {
    setShowAddModal(false);
    setCountrySearch('');
    setStep('country');
    setSelectedCountry(null);
  };

  const handleBackToCountries = () => {
    setStep('country');
    setSelectedCountry(null);
  };

  const handleSwitchTo = async (id: string) => {
    const num = myNumbers.find(n => n.id === id);
    if (num) {
      try {
        await numbersApi.switchNumber(num.rawNumber || num.number);
      } catch (e) {
        // ignore
      }
    }
    setActiveNumberId(id);
    setShowSwitchModal(false);
  };

  const handleDeleteNumber = async (id: string) => {
    const num = myNumbers.find(n => n.id === id);
    if (num) {
      try {
        await numbersApi.removeNumber(num.rawNumber || num.number);
      } catch (e) {
        // ignore
      }
    }
    setMyNumbers((prev) => prev.filter((n) => n.id !== id));
    if (activeNumberId === id) {
      const remaining = myNumbers.filter((n) => n.id !== id);
      setActiveNumberId(remaining.length > 0 ? remaining[0].id : null);
    }
    if (myNumbers.length <= 1) {
      setShowDeleteModal(false);
    }
  };

  const handleAddContact = () => {
    if (!newContactName.trim() || !newContactPhone.trim() || !activeNumber) return;
    const detected = detectCountryFromNumber(newContactPhone);
    const contact: Contact = {
      id: Date.now().toString(),
      name: newContactName.trim(),
      country: detected?.country || newContactCountry.trim() || activeNumber.country,
      flag: detected?.flag || activeNumber.flag,
      phoneNumber: newContactPhone,
      lastCall: 'Just added',
    };
    setMyNumbers((prev) =>
      prev.map((n) =>
        n.id === activeNumberId
          ? { ...n, contacts: [...n.contacts, contact] }
          : n,
      ),
    );
    setShowAddContactModal(false);
    setNewContactName('');
    setNewContactPhone('');
    setNewContactCountry('');
  };

  const dialContact = async (item: Contact) => {
    const num = item.phoneNumber || `${activeNumber?.dialCode || '+1'} 555-0000`;
    await AsyncStorage.setItem(scopedKey(STORAGE_KEYS.DIAL_NUMBER, userId), num);
    navigation.navigate('Call');
  };

  const dialRecord = async (item: CallRecord) => {
    const num = item.phoneNumber || `${activeNumber?.dialCode || '+1'} 555-0000`;
    await AsyncStorage.setItem(scopedKey(STORAGE_KEYS.DIAL_NUMBER, userId), num);
    navigation.navigate('Call');
  };

  const chatWithUser = (phoneNumber: string) => {
    navigation.navigate('Chat', {
      chatId: 'new_' + Date.now(),
      chatName: phoneNumber,
      phoneNumber,
    });
  };

  const handleLongPress = (phoneNumber: string, name: string, flag?: string) => {
    const isContact = activeNumber?.contacts?.some((c) => c.phoneNumber === phoneNumber) ?? false;
    setActionItem({ phoneNumber, name, flag });
    setActionIsContact(isContact);
    setShowActionSheet(true);
  };

  const handleDeleteFromHistory = async (phoneNumber: string) => {
    try {
      const stored = await AsyncStorage.getItem(scopedKey(STORAGE_KEYS.LOCAL_CALL_HISTORY, userId));
      if (stored) {
        const history = JSON.parse(stored);
        const filtered = history.filter((c: any) => c.phoneNumber !== phoneNumber);
        await AsyncStorage.setItem(scopedKey(STORAGE_KEYS.LOCAL_CALL_HISTORY, userId), JSON.stringify(filtered));
      }
      setBackendCallHistory((prev) => prev.filter((c) => c.phoneNumber !== phoneNumber));
    } catch (e) {}
  };

  const handleBlock = (phoneNumber: string) => {
    Alert.alert('Blocked', `${phoneNumber} has been blocked.`);
  };

  const handleAddToContacts = (phoneNumber: string) => {
    navigation.navigate('AddContact', { phoneNumber });
  };

  const renderContactItem = ({ item }: { item: Contact }) => (
    <View style={styles.listItem}>
      <TouchableOpacity style={styles.listItemLeft} onPress={() => dialContact(item)}>
        <View style={styles.listAvatar}>
          <Text style={styles.flagEmoji}>{item.flag}</Text>
        </View>
        <View style={styles.listInfo}>
          <Text style={[styles.listName, { color: colors.text }]}>{item.name}</Text>
          <Text style={[styles.listSub, { color: colors.textMuted }]}>{item.country} · {item.lastCall}</Text>
        </View>
      </TouchableOpacity>
      <View style={styles.listActions}>
        <TouchableOpacity
          style={styles.actionBtn}
          onPress={() => navigation.navigate('Chat', { chatId: item.id, chatName: item.name })}
        >
          <Ionicons name="chatbubble-outline" size={20} color={colors.primary} />
        </TouchableOpacity>
        <TouchableOpacity style={styles.actionBtn} onPress={() => dialContact(item)}>
          <Ionicons name="call-outline" size={20} color={colors.success} />
        </TouchableOpacity>
      </View>
    </View>
  );

  const renderCallItem = ({ item }: { item: CallRecord }) => {
    const callCountry = detectCountryFromNumber(item.phoneNumber);
    return (
    <TouchableOpacity
      style={styles.listItem}
      onPress={() => dialRecord(item)}
      onLongPress={() => handleLongPress(item.phoneNumber, item.name, callCountry?.flag)}
      activeOpacity={0.6}
    >
      <View style={[
        styles.listAvatar,
        { backgroundColor: callCountry ? colors.background : (item.type === 'incoming' ? colors.cardAlt : colors.cardAlt) },
      ]}>
        {callCountry ? (
          <Text style={{ fontSize: 22 }}>{callCountry.flag}</Text>
        ) : (
          <Ionicons
            name={item.type === 'incoming' ? 'call' : 'call-outline'}
            size={22}
            color={item.type === 'incoming' ? colors.success : colors.primary}
          />
        )}
      </View>
      <View style={styles.listInfo}>
        <Text style={[styles.listName, { color: colors.text }]}>{item.name}</Text>
        <Text style={[styles.listSub, { color: colors.textMuted }]}>
          {callCountry ? `${callCountry.country} · ` : ''}{item.type === 'incoming' ? 'Incoming' : 'Outgoing'} · {item.time}
        </Text>
      </View>
      <Text style={[styles.durationText, { color: colors.textSecondary }]}>{item.duration}</Text>
      <TouchableOpacity
        style={styles.chatBtn}
        onPress={() => chatWithUser(item.phoneNumber)}
      >
        <Ionicons name="chatbubble-outline" size={18} color={colors.primary} />
      </TouchableOpacity>
      <TouchableOpacity style={styles.actionBtn} onPress={() => dialRecord(item)}>
        <Ionicons name="call-outline" size={20} color={colors.success} />
      </TouchableOpacity>
    </TouchableOpacity>
  );
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      {/* ── Header ── */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.openDrawer()}>
          <Ionicons name="menu" size={24} color={colors.text} />
        </TouchableOpacity>
        <View style={styles.headerSearchBar}>
          <Ionicons name="search" size={16} color={colors.textMuted} style={{ marginRight: 8 }} />
          <TextInput
            style={styles.headerSearchInput}
            placeholder="Search..."
            placeholderTextColor={colors.textMuted}
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery('')}>
              <Ionicons name="close-circle" size={16} color={colors.textMuted} />
            </TouchableOpacity>
          )}
        </View>
        <TouchableOpacity onPress={() => navigation.navigate('Contacts')}>
          <Ionicons name="person-add-outline" size={24} color={colors.text} />
        </TouchableOpacity>
      </View>

      <View style={styles.content}>
        <Text style={[styles.title, { color: colors.text }]}>Dashboard</Text>

        {/* ── Credits Card ── */}
        <View style={styles.creditsCard}>
          <View style={styles.creditsLeft}>
            <View style={styles.progressCircle}>
              <Text style={styles.progressText}>{credits}</Text>
            </View>
            <Text style={[styles.creditsText, { color: colors.text }]}>
              {isPremium
                ? `Premium active${premiumUntil ? ' until ' + premiumUntil.toISOString().split('T')[0] : ''}`
                : trialActive
                  ? `You have ${Math.ceil(trialRemainingMs / 3600000)}h trial remaining · ${credits} credits`
                  : `${credits} credits remaining`}
            </Text>
          </View>
        </View>

        {/* ════════════════════════════════════════
            MY NUMBERS SECTION
        ════════════════════════════════════════ */}
        <Text style={[styles.numberSectionTitle, { color: colors.text }]}>My LinguaCall Numbers</Text>

        {/* Active number card (or inline picker if none) */}
        {activeNumber ? (
          <View style={styles.activeNumberCard}>
            <View style={styles.activeLeft}>
              <View style={styles.activeIcon}>
                <Text style={styles.activeFlag}>{activeNumber.flag}</Text>
              </View>
              <View>
                <View style={styles.activeLabelRow}>
                  <View style={styles.activeDot} />
                  <Text style={styles.activeLabel}>Active · {activeNumber.country}</Text>
                </View>
                <Text style={styles.activeNumber}>
                  {activeNumber.dialCode} {activeNumber.number}
                </Text>
              </View>
            </View>
            <Ionicons name="checkmark-circle" size={22} color={colors.primary} />
          </View>
        ) : (
          <ScrollView style={styles.countryPickerScroll} showsVerticalScrollIndicator={false}>
            <View style={styles.pickerSection}>
              <View style={styles.pickerHeader}>
                <View style={styles.pickerIconWrap}>
                  <Ionicons name="globe-outline" size={22} color={colors.primary} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.pickerTitle, { color: colors.text }]}>Choose a Number</Text>
                  <Text style={[styles.pickerSub, { color: colors.textSecondary }]}>
                    Pick a country to get your virtual number
                  </Text>
                </View>
              </View>
              {COUNTRIES.map((item) => (
                <TouchableOpacity
                  key={item.country}
                  style={styles.countryCard}
                  onPress={() => handlePickNumber(item)}
                  activeOpacity={0.75}
                >
                  <Text style={styles.countryCardFlag}>{item.flag}</Text>
                  <View style={styles.countryCardInfo}>
                    <Text style={[styles.countryCardName, { color: colors.text }]}>{item.country}</Text>
                    <Text style={[styles.countryCardNumber, { color: colors.textMuted }]}>
                      {item.dialCode} · Available numbers
                    </Text>
                  </View>
                  <View style={styles.selectPill}>
                    <Text style={styles.selectPillText}>Select</Text>
                    <Ionicons name="chevron-forward" size={13} color={colors.primary} />
                  </View>
                </TouchableOpacity>
              ))}
            </View>
          </ScrollView>
        )}

        {/* Action buttons row */}
        <View style={styles.numberBtnRow}>
          {canAddMore ? (
            <TouchableOpacity
              style={styles.addBtn}
              onPress={() => setShowAddModal(true)}
            >
              <Ionicons name="add" size={15} color="#fff" />
              <Text style={styles.addBtnText}>{hasNumbers ? 'Select New Number' : 'Select Number'}</Text>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity
              style={styles.deleteBtn}
              onPress={() => setShowDeleteModal(true)}
            >
              <Ionicons name="trash-outline" size={15} color="#fff" />
              <Text style={styles.addBtnText}>Delete Number</Text>
            </TouchableOpacity>
          )}
          {myNumbers.length >= 2 && (
            <TouchableOpacity
              style={styles.switchBtn}
              onPress={() => setShowSwitchModal(true)}
            >
              <Ionicons name="swap-horizontal" size={15} color={colors.primary} />
              <Text style={styles.switchBtnText}>Switch Number</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Slots indicator */}
        <Text style={styles.slotsHint}>
          {myNumbers.length}/{MAX_NUMBERS} numbers used{slotsRemaining > 0 ? ` · ${slotsRemaining} slot${slotsRemaining > 1 ? 's' : ''} remaining` : ' · Maximum reached'}
        </Text>

        {/* Tabs + Contacts/Calls — only when a number is active */}
        {hasNumbers && activeNumber && (
          <View style={styles.listSection}>
            <View style={styles.tabsContainer}>
              <TouchableOpacity
                style={[styles.tab, activeTab === 'contacts' && styles.activeTab]}
                onPress={() => setActiveTab('contacts')}
              >
                <Ionicons
                  name="people"
                  size={15}
                  color={activeTab === 'contacts' ? '#3B82F6' : '#aaa'}
                  style={{ marginRight: 5 }}
                />
                <Text style={[styles.tabText, activeTab === 'contacts' && styles.activeTabText, { color: activeTab === 'contacts' ? colors.primary : colors.textMuted }]}>
                  Contacts
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.tab, activeTab === 'history' && styles.activeTab]}
                onPress={() => setActiveTab('history')}
              >
                <Ionicons
                  name="time"
                  size={15}
                  color={activeTab === 'history' ? '#3B82F6' : '#aaa'}
                  style={{ marginRight: 5 }}
                />
                <Text style={[styles.tabText, activeTab === 'history' && styles.activeTabText, { color: activeTab === 'history' ? colors.primary : colors.textMuted }]}>
                  Call History
                </Text>
              </TouchableOpacity>
            </View>

            <View style={styles.contextRow}>
              <Text style={styles.contextFlag}>{activeNumber.flag}</Text>
              <Text style={styles.contextText}>
                {activeTab === 'contacts' ? 'Contacts' : 'Calls'} for your{' '}
                <Text style={styles.contextBold}>{activeNumber.country}</Text> number
              </Text>
            </View>

            {activeTab === 'contacts' ? (
              filteredContacts.length > 0 ? (
                <FlatList
                  data={filteredContacts}
                  renderItem={renderContactItem}
                  keyExtractor={(item) => item.id}
                  style={styles.list}
                  showsVerticalScrollIndicator={false}
                />
              ) : (
                <View style={styles.emptyList}>
                  <Ionicons name="person-outline" size={40} color={colors.textMuted} />
                  <Text style={styles.emptyText}>No contacts found</Text>
                </View>
              )
            ) : filteredCalls.length > 0 ? (
              <FlatList
                data={filteredCalls}
                renderItem={renderCallItem}
                keyExtractor={(item) => item.id}
                style={styles.list}
                showsVerticalScrollIndicator={false}
              />
            ) : (
              <View style={styles.emptyList}>
                <Ionicons name="call-outline" size={40} color={colors.textMuted} />
                <Text style={styles.emptyText}>No call history</Text>
              </View>
            )}
          </View>
        )}
      </View>

      {/* ════════════════════════════════
          ADD NUMBER MODAL (full-screen, two-step flow)
      ════════════════════════════════ */}
      <Modal
        visible={showAddModal}
        animationType="slide"
        transparent={false}
        onRequestClose={handleCloseAddModal}
      >
        <SafeAreaView style={[styles.fullModal, { backgroundColor: colors.background }]}>
          {/* ── Header ── */}
          <View style={styles.fullModalHeader}>
            {step === 'number' ? (
              <TouchableOpacity onPress={handleBackToCountries} style={styles.fullModalBack}>
                <Ionicons name="arrow-back" size={24} color={colors.text} />
              </TouchableOpacity>
            ) : (
              <View style={{ width: 32 }} />
            )}
            <View style={{ flex: 1 }}>
              <Text style={styles.fullModalTitle}>
                {step === 'country' ? 'Select a Country' : 'Choose Your Number'}
              </Text>
              <Text style={styles.fullModalSub}>
                {step === 'country'
                  ? `${myNumbers.length}/${MAX_NUMBERS} slots used · tap a country to see available numbers`
                  : `${selectedCountry?.flag} ${selectedCountry?.country}`}
              </Text>
            </View>
            <TouchableOpacity onPress={handleCloseAddModal} style={styles.fullModalClose}>
              <Ionicons name="close" size={22} color={colors.textSecondary} />
            </TouchableOpacity>
          </View>

          {/* ── Step 1: Country List ── */}
          {step === 'country' && (
            <FlatList
              data={availableToAdd}
              keyExtractor={(item) => item.country}
              contentContainerStyle={styles.fullModalList}
              showsVerticalScrollIndicator={false}
              ListEmptyComponent={
                <View style={styles.emptyState}>
                  <Ionicons name="checkmark-circle" size={48} color={colors.primary} />
                  <Text style={styles.emptyText}>You have reached the maximum of {MAX_NUMBERS} numbers.</Text>
                </View>
              }
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={styles.fullCountryItem}
                  onPress={() => handlePickNumber(item)}
                  activeOpacity={0.7}
                >
                  <Text style={styles.fullCountryFlag}>{item.flag}</Text>
                  <View style={styles.fullCountryInfo}>
                    <Text style={styles.fullCountryName}>{item.country}</Text>
                    <Text style={styles.fullCountryCode}>
                      {item.dialCode} · Tap to browse numbers
                    </Text>
                  </View>
                  <Ionicons name="chevron-forward" size={20} color={colors.textMuted} />
                </TouchableOpacity>
              )}
            />
          )}

          {/* ── Step 2: Available Numbers ── */}
          {step === 'number' && selectedCountry && (
            loadingNumbers ? (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color={colors.primary} />
                <Text style={styles.loadingText}>Loading available numbers...</Text>
              </View>
            ) : availableNumbers.length > 0 ? (
              <FlatList
                data={availableNumbers}
                keyExtractor={(item) => item.id}
                contentContainerStyle={styles.fullModalList}
                showsVerticalScrollIndicator={false}
                renderItem={({ item }) => (
                  <TouchableOpacity
                    style={styles.fullNumberItem}
                    onPress={() => handleSelectNumber(item)}
                    activeOpacity={0.7}
                  >
                    <View style={styles.fullNumberLeft}>
                      <View style={styles.fullNumberIcon}>
                        <Text style={styles.fullNumberFlag}>{selectedCountry.flag}</Text>
                      </View>
                      <View style={styles.fullNumberInfo}>
                        <Text style={styles.fullNumberText}>
                          {selectedCountry.dialCode} {item.formattedNumber}
                        </Text>
                        <Text style={styles.fullNumberDesc}>{item.description}</Text>
                      </View>
                    </View>
                    <View style={styles.selectNumberPill}>
                      <Text style={styles.selectNumberPillText}>Select</Text>
                    </View>
                  </TouchableOpacity>
                )}
              />
            ) : (
              <View style={styles.loadingContainer}>
                <Ionicons name="alert-circle-outline" size={48} color={colors.textMuted} />
                <Text style={styles.loadingText}>No numbers available for this country.</Text>
              </View>
            )
          )}
        </SafeAreaView>
      </Modal>

      {/* ════════════════════════════════
          SWITCH NUMBER MODAL
      ════════════════════════════════ */}
      <Modal
        visible={showSwitchModal}
        animationType="slide"
        transparent
        onRequestClose={() => setShowSwitchModal(false)}
      >
        <View style={[styles.overlay, { backgroundColor: colors.overlay }]}>
          <View style={[styles.sheet, { backgroundColor: colors.card, maxHeight: '55%' }]}>
            <View style={styles.sheetHandle} />

            <View style={styles.sheetHeaderRow}>
              <View>
                <Text style={styles.sheetTitle}>Switch Number</Text>
                <Text style={styles.sheetSub}>Tap to switch your active number</Text>
              </View>
              <TouchableOpacity
                onPress={() => setShowSwitchModal(false)}
                style={styles.closeBtn}
              >
                <Ionicons name="close" size={20} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>

            {myNumbers.map((num) => {
              const isActive = num.id === activeNumberId;
              return (
                <TouchableOpacity
                  key={num.id}
                  style={[styles.switchItem, isActive && styles.switchItemActive]}
                  onPress={() => handleSwitchTo(num.id)}
                >
                  <View style={[styles.switchIcon, isActive && styles.switchIconActive]}>
                    <Text style={{ fontSize: 22 }}>{num.flag}</Text>
                  </View>
                  <View style={styles.switchInfo}>
                    <Text style={[styles.switchCountry, isActive && styles.switchCountryActive]}>
                      {num.country}
                    </Text>
                    <Text style={[styles.switchNumber, isActive && styles.switchNumberActive]}>
                      {num.dialCode} {num.number}
                    </Text>
                  </View>
                  {isActive
                    ? <Ionicons name="checkmark-circle" size={22} color={colors.primary} />
                    : <Ionicons name="radio-button-off" size={22} color={colors.textMuted} />}
                </TouchableOpacity>
              );
            })}
          </View>
        </View>
      </Modal>

      {/* ════════════════════════════════
          DELETE NUMBER MODAL
      ════════════════════════════════ */}
      <Modal
        visible={showDeleteModal}
        animationType="slide"
        transparent
        onRequestClose={() => setShowDeleteModal(false)}
      >
        <View style={[styles.overlay, { backgroundColor: colors.overlay }]}>
          <View style={[styles.sheet, { backgroundColor: colors.card, maxHeight: '55%' }]}>
            <View style={styles.sheetHandle} />

            <View style={styles.sheetHeaderRow}>
              <View>
                <Text style={styles.sheetTitle}>Delete Number</Text>
                <Text style={styles.sheetSub}>Tap a number to remove it</Text>
              </View>
              <TouchableOpacity
                onPress={() => setShowDeleteModal(false)}
                style={styles.closeBtn}
              >
                <Ionicons name="close" size={20} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>

            {myNumbers.map((num) => {
              const isActive = num.id === activeNumberId;
              return (
                <TouchableOpacity
                  key={num.id}
                  style={[styles.switchItem, isActive && styles.switchItemActive]}
                  onPress={() => handleDeleteNumber(num.id)}
                >
                  <View style={[styles.switchIcon, isActive && styles.switchIconActive]}>
                    <Text style={{ fontSize: 22 }}>{num.flag}</Text>
                  </View>
                  <View style={styles.switchInfo}>
                    <Text style={[styles.switchCountry, isActive && styles.switchCountryActive]}>
                      {num.country}
                    </Text>
                    <Text style={[styles.switchNumber, isActive && styles.switchNumberActive]}>
                      {num.dialCode} {num.number}
                    </Text>
                  </View>
                  <View style={styles.deletePill}>
                    <Ionicons name="trash-outline" size={14} color={colors.danger} />
                    <Text style={styles.deletePillText}>Remove</Text>
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>
      </Modal>

      {/* ════════════════════════════════
          ADD CONTACT MODAL
      ════════════════════════════════ */}
      <Modal
        visible={showAddContactModal}
        animationType="slide"
        transparent={false}
        onRequestClose={() => setShowAddContactModal(false)}
      >
        <SafeAreaView style={[styles.fullModal, { backgroundColor: colors.background }]}>
          <View style={styles.fullModalHeader}>
            <View style={{ width: 32 }} />
            <View style={{ flex: 1 }}>
              <Text style={styles.fullModalTitle}>Add Contact</Text>
              <Text style={styles.fullModalSub}>
                {activeNumber ? `for ${activeNumber.flag} ${activeNumber.number}` : 'Select a number first'}
              </Text>
            </View>
            <TouchableOpacity
              onPress={() => setShowAddContactModal(false)}
              style={styles.fullModalClose}
            >
              <Ionicons name="close" size={22} color={colors.textSecondary} />
            </TouchableOpacity>
          </View>

          <View style={styles.addContactForm}>
            <Text style={styles.addContactLabel}>Full Name</Text>
            <View style={styles.phoneInputRow}>
              <View style={{ width: 34, marginRight: 10 }} />
              <TextInput
                style={styles.addContactInput}
                placeholder="e.g. John Doe"
                placeholderTextColor={colors.textMuted}
                value={newContactName}
                onChangeText={setNewContactName}
              />
            </View>

            <Text style={styles.addContactLabel}>Phone Number</Text>
            <View style={styles.phoneInputRow}>
              {detectCountryFromNumber(newContactPhone) && (
                <Text style={styles.contactFlag}>{detectCountryFromNumber(newContactPhone)!.flag}</Text>
              )}
              <TextInput
                style={styles.addContactInput}
                placeholder="e.g. +1 555 123 4567"
                placeholderTextColor={colors.textMuted}
                value={formatPhoneNumber(newContactPhone)}
                onChangeText={(t) => {
                  const digits = t.replace(/[^0-9]/g, '');
                  if (!digits) { setNewContactPhone(''); return; }
                  const raw = '+' + digits;
                  const info = detectCountryFromNumber(raw);
                  if (info) {
                    const local = digits.slice(info.dialCode.replace('+', '').length);
                    if (local.length > info.localDigits) return;
                  }
                  setNewContactPhone(raw);
                }}
                keyboardType="phone-pad"
              />
            </View>

            <TouchableOpacity
              style={[
                styles.addContactSaveBtn,
                (!newContactName.trim() || !newContactPhone.trim()) && styles.addContactSaveBtnDisabled,
              ]}
              onPress={handleAddContact}
              disabled={!newContactName.trim() || !newContactPhone.trim()}
            >
              <Ionicons name="person-add" size={20} color="#fff" style={{ marginRight: 8 }} />
              <Text style={styles.addContactSaveText}>Save Contact</Text>
            </TouchableOpacity>
          </View>
        </SafeAreaView>
      </Modal>

      {/* Action Sheet Modal */}
      <Modal
        visible={showActionSheet}
        transparent
        animationType="fade"
        onRequestClose={() => setShowActionSheet(false)}
      >
        <Pressable style={[styles.overlay, { backgroundColor: colors.overlay }]} onPress={() => setShowActionSheet(false)}>
          <Pressable style={[styles.actionSheet, { backgroundColor: colors.card }]}>
            <Text style={styles.actionSheetTitle} numberOfLines={1}>
              {actionItem?.name || actionItem?.phoneNumber}
            </Text>
            <Text style={styles.actionSheetSub}>{actionItem?.phoneNumber}</Text>

            <View style={styles.actionDivider} />

            <TouchableOpacity
              style={styles.actionRow}
              onPress={() => {
                setShowActionSheet(false);
                if (actionItem) handleDeleteFromHistory(actionItem.phoneNumber);
              }}
            >
              <Ionicons name="trash-outline" size={22} color={colors.danger} />
              <Text style={[styles.actionText, { color: colors.danger }]}>Delete</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.actionRow}
              onPress={() => {
                setShowActionSheet(false);
                if (actionItem) handleBlock(actionItem.phoneNumber);
              }}
            >
              <Ionicons name="ban-outline" size={22} color={colors.danger} />
              <Text style={[styles.actionText, { color: colors.danger }]}>Block</Text>
            </TouchableOpacity>

            {!actionIsContact && (
              <TouchableOpacity
                style={styles.actionRow}
                onPress={() => {
                  setShowActionSheet(false);
                  if (actionItem) handleAddToContacts(actionItem.phoneNumber);
                }}
              >
                <Ionicons name="person-add-outline" size={22} color={colors.primary} />
                <Text style={[styles.actionText, { color: colors.primary }]}>Add to Contact</Text>
              </TouchableOpacity>
            )}

            <View style={styles.actionDivider} />

            <TouchableOpacity
              style={[styles.actionRow, { justifyContent: 'center' }]}
              onPress={() => setShowActionSheet(false)}
            >
              <Text style={{ fontSize: moderateScale(16), color: colors.textSecondary, fontWeight: '500' }}>Cancel</Text>
            </TouchableOpacity>
          </Pressable>
        </Pressable>
      </Modal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },

  // ── Header ──
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: scale(20),
    paddingVertical: verticalScale(14),
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  headerSearchBar: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
    borderRadius: scale(20),
    paddingHorizontal: scale(12),
    paddingVertical: verticalScale(8),
    marginHorizontal: scale(14),
    borderWidth: 1,
    borderColor: '#ebebeb',
  },
  headerSearchInput: { flex: 1, fontSize: moderateScale(14), color: '#111', paddingVertical: 0 },
  content: { flex: 1, paddingHorizontal: scale(20) },
  countryPickerScroll: { flex: 1, marginBottom: verticalScale(10) },
  listSection: { flex: 1, marginTop: verticalScale(4) },
  emptyList: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingBottom: verticalScale(40) },
  title: {
    fontSize: moderateScale(32),
    fontWeight: 'bold',
    color: '#111',
    marginTop: verticalScale(20),
    marginBottom: verticalScale(22),
  },

  // ── Credits ──
  creditsCard: {
    backgroundColor: '#fff',
    borderRadius: scale(16),
    paddingVertical: verticalScale(10),
    paddingHorizontal: scale(14),
    marginBottom: verticalScale(22),
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.07,
    shadowRadius: 8,
    elevation: 3,
  },
  creditsLeft: { flexDirection: 'row', alignItems: 'center' },
  progressCircle: {
    width: scale(44),
    height: verticalScale(44),
    borderRadius: scale(22),
    backgroundColor: '#3B82F6',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: scale(12),
  },
  progressText: { color: '#fff', fontSize: moderateScale(15), fontWeight: 'bold' },
  creditsText: { fontSize: moderateScale(14), color: '#222', flex: 1 },

  // ── Inline Country Picker (State A) ──
  pickerSection: { marginBottom: verticalScale(24) },
  pickerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#EFF6FF',
    borderRadius: scale(14),
    padding: scale(14),
    marginBottom: verticalScale(14),
    gap: scale(12),
  },
  pickerIconWrap: {
    width: scale(40),
    height: verticalScale(40),
    borderRadius: scale(20),
    backgroundColor: '#DBEAFE',
    justifyContent: 'center',
    alignItems: 'center',
  },
  pickerTitle: { fontSize: moderateScale(17), fontWeight: '700', color: '#1E3A5F', marginBottom: verticalScale(2) },
  pickerSub: { fontSize: moderateScale(13), color: '#5B8DB8' },

  countryCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fafafa',
    borderRadius: scale(14),
    paddingVertical: verticalScale(13),
    paddingHorizontal: scale(14),
    marginBottom: verticalScale(9),
    borderWidth: 1,
    borderColor: '#f0f0f0',
  },
  countryCardFlag: { fontSize: moderateScale(28), marginRight: scale(14) },
  countryCardInfo: { flex: 1 },
  countryCardName: { fontSize: moderateScale(15), fontWeight: '600', color: '#111', marginBottom: verticalScale(2) },
  countryCardNumber: { fontSize: moderateScale(13), color: '#999' },
  selectPill: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: '#3B82F6',
    borderRadius: scale(14),
    paddingHorizontal: scale(10),
    paddingVertical: verticalScale(5),
    gap: scale(2),
  },
  selectPillText: { fontSize: moderateScale(12), color: '#3B82F6', fontWeight: '600' },

  numberSectionTitle: { fontSize: moderateScale(16), fontWeight: '700', color: '#111', marginBottom: verticalScale(12) },

  numberBtnRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: scale(10),
    marginTop: verticalScale(10),
    marginBottom: verticalScale(6),
  },

  switchBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: '#3B82F6',
    paddingHorizontal: scale(10),
    paddingVertical: verticalScale(6),
    borderRadius: scale(18),
    gap: scale(4),
  },
  switchBtnText: { color: '#3B82F6', fontSize: moderateScale(12), fontWeight: '600' },

  addBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#3B82F6',
    paddingHorizontal: scale(10),
    paddingVertical: verticalScale(6),
    borderRadius: scale(18),
    gap: scale(4),
  },
  addBtnText: { color: '#fff', fontSize: moderateScale(12), fontWeight: '600' },

  deleteBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#EF4444',
    paddingHorizontal: scale(10),
    paddingVertical: verticalScale(6),
    borderRadius: scale(18),
    gap: scale(4),
  },

  activeNumberCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#EFF6FF',
    borderRadius: scale(16),
    padding: scale(16),
    borderWidth: 1,
    borderColor: '#BFDBFE',
    marginBottom: verticalScale(12),
  },
  activeLeft: { flexDirection: 'row', alignItems: 'center' },
  activeIcon: {
    width: scale(46),
    height: verticalScale(46),
    borderRadius: scale(23),
    backgroundColor: '#DBEAFE',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: scale(12),
  },
  activeFlag: { fontSize: moderateScale(22) },
  activeLabelRow: { flexDirection: 'row', alignItems: 'center', marginBottom: verticalScale(3) },
  activeDot: {
    width: scale(7),
    height: verticalScale(7),
    borderRadius: scale(3.5),
    backgroundColor: '#22C55E',
    marginRight: scale(5),
  },
  activeLabel: { fontSize: moderateScale(12), color: '#3B82F6', fontWeight: '600' },
  activeNumber: { fontSize: moderateScale(17), fontWeight: 'bold', color: '#1E3A5F' },

  pillRow: { flexDirection: 'row', flexWrap: 'wrap', gap: scale(8), marginBottom: verticalScale(6) },
  miniPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f2f4f7',
    paddingHorizontal: scale(12),
    paddingVertical: verticalScale(7),
    borderRadius: scale(20),
    borderWidth: 1.5,
    borderColor: 'transparent',
    gap: scale(6),
  },
  miniPillActive: { backgroundColor: '#EFF6FF', borderColor: '#3B82F6' },
  miniPillFlag: { fontSize: moderateScale(15) },
  miniPillText: { fontSize: moderateScale(13), fontWeight: '600', color: '#666' },
  miniPillTextActive: { color: '#1D4ED8' },
  slotsHint: { fontSize: moderateScale(11), color: '#bbb', textAlign: 'right', marginBottom: verticalScale(18) },

  // ── Tabs ──
  tabsContainer: {
    flexDirection: 'row',
    backgroundColor: '#f2f4f7',
    borderRadius: scale(12),
    padding: scale(4),
    marginBottom: verticalScale(12),
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    paddingVertical: verticalScale(10),
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: scale(10),
  },
  activeTab: {
    backgroundColor: '#fff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.07,
    shadowRadius: 4,
    elevation: 2,
  },
  tabText: { fontSize: moderateScale(14), color: '#aaa', fontWeight: '500' },
  activeTabText: { color: '#111', fontWeight: '700' },

  contextRow: { flexDirection: 'row', alignItems: 'center', marginBottom: verticalScale(12) },
  contextFlag: { fontSize: moderateScale(15), marginRight: scale(6) },
  contextText: { fontSize: moderateScale(13), color: '#999' },
  contextBold: { fontWeight: '700', color: '#444' },

  // ── Lists ──
  list: { flex: 1 },
  listItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8f8f8',
    borderRadius: scale(14),
    paddingLeft: scale(14),
    paddingRight: scale(6),
    paddingVertical: verticalScale(13),
    marginBottom: verticalScale(9),
  },
  listItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  listActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: scale(2),
  },
  actionBtn: {
    width: scale(36),
    height: verticalScale(36),
    borderRadius: scale(18),
    justifyContent: 'center',
    alignItems: 'center',
  },
  listAvatar: {
    width: scale(46),
    height: verticalScale(46),
    borderRadius: scale(23),
    backgroundColor: '#e8e8e8',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: scale(13),
  },
  flagEmoji: { fontSize: moderateScale(22) },
  listInfo: { flex: 1 },
  listName: { fontSize: moderateScale(15), fontWeight: '600', color: '#111', marginBottom: verticalScale(3) },
  listSub: { fontSize: moderateScale(13), color: '#999' },
  durationText: { fontSize: moderateScale(13), fontWeight: '600', color: '#555' },
  emptyState: { alignItems: 'center', paddingVertical: verticalScale(36) },
  emptyText: { fontSize: moderateScale(14), color: '#ccc', marginTop: verticalScale(10), textAlign: 'center' },

  // ── Modals ──
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'flex-end',
  },
  actionSheet: {
    backgroundColor: '#fff',
    borderTopLeftRadius: scale(16),
    borderTopRightRadius: scale(16),
    paddingVertical: verticalScale(20),
    paddingHorizontal: scale(20),
  },
  actionSheetTitle: {
    fontSize: moderateScale(16),
    fontWeight: '600',
    color: '#111',
    textAlign: 'center',
  },
  actionSheetSub: {
    fontSize: moderateScale(13),
    color: '#888',
    textAlign: 'center',
    marginTop: verticalScale(4),
  },
  actionDivider: {
    height: 1,
    backgroundColor: '#f0f0f0',
    marginVertical: verticalScale(12),
  },
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: verticalScale(12),
    gap: scale(12),
  },
  actionText: {
    fontSize: moderateScale(16),
    fontWeight: '500',
  },
  chatBtn: {
    width: scale(32),
    height: scale(32),
    borderRadius: scale(16),
    backgroundColor: '#EFF6FF',
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: scale(6),
  },
  sheet: {
    backgroundColor: '#fff',
    borderTopLeftRadius: scale(26),
    borderTopRightRadius: scale(26),
    paddingHorizontal: scale(20),
    paddingBottom: verticalScale(34),
    maxHeight: '82%',
  },
  sheetHandle: {
    width: scale(38),
    height: verticalScale(4),
    borderRadius: scale(2),
    backgroundColor: '#e0e0e0',
    alignSelf: 'center',
    marginTop: verticalScale(12),
    marginBottom: verticalScale(18),
  },
  sheetHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: verticalScale(16),
  },
  sheetTitle: { fontSize: moderateScale(20), fontWeight: '700', color: '#111' },
  sheetSub: { fontSize: moderateScale(13), color: '#999', marginTop: verticalScale(3) },
  closeBtn: {
    width: scale(32),
    height: verticalScale(32),
    borderRadius: scale(16),
    backgroundColor: '#f2f2f2',
    justifyContent: 'center',
    alignItems: 'center',
  },
  sheetSearch: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
    borderRadius: scale(12),
    paddingHorizontal: scale(14),
    paddingVertical: verticalScale(10),
    marginBottom: verticalScale(14),
    gap: scale(8),
  },
  sheetSearchInput: { flex: 1, fontSize: moderateScale(14), color: '#111' },
  countryList: { flex: 1 },

  modalCountryItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: verticalScale(13),
    borderBottomWidth: 1,
    borderBottomColor: '#f5f5f5',
  },
  modalCountryFlag: { fontSize: moderateScale(26), marginRight: scale(14) },
  modalCountryInfo: { flex: 1 },
  modalCountryName: { fontSize: moderateScale(15), fontWeight: '600', color: '#111', marginBottom: verticalScale(2) },
  modalCountryCode: { fontSize: moderateScale(13), color: '#999' },
  addPill: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: '#3B82F6',
    borderRadius: scale(14),
    paddingHorizontal: scale(10),
    paddingVertical: verticalScale(5),
    gap: scale(3),
  },
  addPillText: { fontSize: moderateScale(12), color: '#3B82F6', fontWeight: '600' },

  // ── Loading ──
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingBottom: verticalScale(80),
  },
  loadingText: { fontSize: moderateScale(14), color: '#999', marginTop: verticalScale(12) },

  // ── Full-Screen Add Number Modal ──
  fullModal: {
    flex: 1,
    backgroundColor: '#fff',
  },
  fullModalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: scale(20),
    paddingTop: verticalScale(16),
    paddingBottom: verticalScale(16),
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  fullModalBack: {
    width: scale(32),
    height: verticalScale(32),
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: scale(8),
  },
  fullModalTitle: {
    fontSize: moderateScale(18),
    fontWeight: '700',
    color: '#111',
  },
  fullModalSub: {
    fontSize: moderateScale(13),
    color: '#999',
    marginTop: verticalScale(2),
  },
  fullModalClose: {
    width: scale(32),
    height: verticalScale(32),
    borderRadius: scale(16),
    backgroundColor: '#f2f2f2',
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: scale(8),
  },
  fullModalList: {
    paddingHorizontal: scale(20),
    paddingTop: verticalScale(12),
    paddingBottom: verticalScale(40),
  },
  fullCountryItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fafafa',
    borderRadius: scale(14),
    paddingVertical: verticalScale(15),
    paddingHorizontal: scale(16),
    marginBottom: verticalScale(10),
    borderWidth: 1,
    borderColor: '#f0f0f0',
  },
  fullCountryFlag: { fontSize: moderateScale(32), marginRight: scale(16) },
  fullCountryInfo: { flex: 1 },
  fullCountryName: { fontSize: moderateScale(16), fontWeight: '600', color: '#111', marginBottom: verticalScale(3) },
  fullCountryCode: { fontSize: moderateScale(14), color: '#999' },
  fullNumberItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#fafafa',
    borderRadius: scale(14),
    paddingVertical: verticalScale(16),
    paddingHorizontal: scale(16),
    marginBottom: verticalScale(10),
    borderWidth: 1,
    borderColor: '#f0f0f0',
  },
  fullNumberLeft: { flexDirection: 'row', alignItems: 'center', flex: 1 },
  fullNumberIcon: {
    width: scale(48),
    height: verticalScale(48),
    borderRadius: scale(24),
    backgroundColor: '#EFF6FF',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: scale(14),
  },
  fullNumberFlag: { fontSize: moderateScale(22) },
  fullNumberInfo: { flex: 1 },
  fullNumberText: { fontSize: moderateScale(16), fontWeight: '700', color: '#111', marginBottom: verticalScale(3) },
  fullNumberDesc: { fontSize: moderateScale(13), color: '#999' },
  selectNumberPill: {
    backgroundColor: '#3B82F6',
    borderRadius: scale(16),
    paddingHorizontal: scale(16),
    paddingVertical: verticalScale(8),
  },
  selectNumberPillText: { fontSize: moderateScale(13), color: '#fff', fontWeight: '600' },

  // ── Switch Modal ──
  switchItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fafafa',
    borderRadius: scale(16),
    padding: scale(14),
    marginBottom: verticalScale(10),
    borderWidth: 1.5,
    borderColor: 'transparent',
  },
  switchItemActive: { backgroundColor: '#EFF6FF', borderColor: '#3B82F6' },
  switchIcon: {
    width: scale(48),
    height: verticalScale(48),
    borderRadius: scale(24),
    backgroundColor: '#f0f0f0',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: scale(14),
  },
  switchIconActive: { backgroundColor: '#DBEAFE' },
  switchInfo: { flex: 1 },
  switchCountry: { fontSize: moderateScale(15), fontWeight: '600', color: '#333', marginBottom: verticalScale(3) },
  switchCountryActive: { color: '#1D4ED8' },
  switchNumber: { fontSize: moderateScale(13), color: '#999' },
  switchNumberActive: { color: '#3B82F6' },

  deletePill: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: '#EF4444',
    borderRadius: scale(14),
    paddingHorizontal: scale(10),
    paddingVertical: verticalScale(5),
    gap: scale(3),
  },
  deletePillText: { fontSize: moderateScale(12), color: '#EF4444', fontWeight: '600' },

  // ── Add Contact Modal ──
  addContactForm: { flex: 1, paddingHorizontal: scale(24), paddingTop: verticalScale(24) },
  addContactLabel: { fontSize: moderateScale(14), fontWeight: '600', color: '#333', marginBottom: verticalScale(8), marginTop: verticalScale(12) },
  phoneInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: scale(12),
    borderWidth: 1,
    borderColor: '#d0d0d0',
    paddingHorizontal: scale(16),
    paddingVertical: verticalScale(14),
    marginBottom: verticalScale(20),
  },
  contactFlag: { fontSize: moderateScale(24), marginRight: scale(10) },
  addContactInput: {
    flex: 1,
    fontSize: moderateScale(16),
    color: '#111',
  },
  addContactSaveBtn: {
    backgroundColor: '#3B82F6',
    borderRadius: scale(14),
    paddingVertical: verticalScale(16),
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: verticalScale(32),
  },
  addContactSaveBtnDisabled: { backgroundColor: '#A0C4FF' },
  addContactSaveText: { fontSize: moderateScale(16), fontWeight: '700', color: '#fff' },
});

export default DashboardScreen;
