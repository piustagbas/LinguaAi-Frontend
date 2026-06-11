import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  TextInput,
  ScrollView,
  Modal,
  Alert,
  Pressable,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { STORAGE_KEYS, scopedKey } from '../config/constants';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import { callApi } from '../services/api';
import { scale, verticalScale, moderateScale } from '../utils/responsive';

interface CallRecord {
  id: string;
  name: string;
  phoneNumber: string;
  duration: string;
  time: string;
  type: 'incoming' | 'outgoing' | 'missed';
}

interface Contact {
  id: string;
  name: string;
  country: string;
  flag: string;
  phoneNumber: string;
  lastCall: string;
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

interface ContactsScreenProps {
  navigation: any;
}

const ContactsScreen: React.FC<ContactsScreenProps> = ({ navigation }) => {
  const { user } = useAuth();
  const { colors, isDark } = useTheme();
  const userId = user?.id || 'anonymous';
  const [filter, setFilter] = useState<'all' | 'missed'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [showSearch, setShowSearch] = useState(false);
  const [calls, setCalls] = useState<CallRecord[]>([]);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [favorites, setFavorites] = useState<string[]>([]);
  const [contactsExpanded, setContactsExpanded] = useState(false);
  const [actionItem, setActionItem] = useState<{ phoneNumber: string; name: string; flag?: string } | null>(null);
  const [showActionSheet, setShowActionSheet] = useState(false);
  const [actionIsContact, setActionIsContact] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    const unsub = navigation.addListener('focus', loadData);
    return unsub;
  }, [navigation]);

  const loadData = async () => {
    try {
      const stored = await AsyncStorage.getItem(scopedKey(STORAGE_KEYS.MY_NUMBERS, userId));
      const activeId = await AsyncStorage.getItem(scopedKey(STORAGE_KEYS.ACTIVE_NUMBER_ID, userId));
      const parsed: VoipNumber[] = stored ? JSON.parse(stored) : [];
      const active = parsed.find((n) => n.id === activeId) || parsed[0];
      if (active) {
        setContacts(active.contacts || []);
      }
    } catch (e) {}

    let backendCalls: any[] = [];
    try {
      const callsRes = await callApi.getCallHistory();
      const data = callsRes?.data?.calls ?? callsRes?.data ?? [];
      if (Array.isArray(data)) backendCalls = data;
    } catch (e) {}

    let localCalls: any[] = [];
    try {
      const stored = await AsyncStorage.getItem(scopedKey(STORAGE_KEYS.LOCAL_CALL_HISTORY, userId));
      if (stored) localCalls = JSON.parse(stored);
    } catch (e) {}

    const allCalls = [...localCalls, ...backendCalls];
    setCalls(allCalls.map((c: any) => ({
      id: c._id || c.id || Math.random().toString(),
      name: c.name || c.receiverNumber || c.callerNumber || 'Unknown',
      phoneNumber: c.phoneNumber || c.receiverNumber || '',
      duration: c.duration
        ? `${Math.floor(c.duration / 60)}:${(c.duration % 60).toString().padStart(2, '0')}`
        : '',
      time: c.createdAt
        ? new Date(c.createdAt).toLocaleString()
        : c.time || '',
      type: c.type || 'outgoing',
    })));
  };

  const filteredCalls = calls.filter((c) => {
    if (filter === 'missed' && c.type !== 'missed') return false;
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return c.name.toLowerCase().includes(q) || c.phoneNumber.includes(q);
  });

  const filteredContacts = contacts.filter((c) => {
    if (filter === 'missed') return false;
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (
      c.name.toLowerCase().includes(q) ||
      c.phoneNumber.includes(q) ||
      c.country.toLowerCase().includes(q)
    );
  });

  const mergedCalls = React.useMemo(() => {
    const contactMap = new Map<string, Contact>();
    contacts.forEach((c) => contactMap.set(c.phoneNumber, c));

    const enriched = filteredCalls.map((call) => {
      const match = contactMap.get(call.phoneNumber);
      return {
        ...call,
        contactName: match?.name,
        flag: match?.flag,
        isFavorite: favorites.includes(call.phoneNumber),
      };
    });

    return enriched.sort((a, b) => {
      const da = new Date(a.time).getTime();
      const db = new Date(b.time).getTime();
      return (isNaN(db) ? 0 : db) - (isNaN(da) ? 0 : da);
    });
  }, [filteredCalls, contacts, favorites]);

  const dialNumber = async (phoneNumber: string) => {
    await AsyncStorage.setItem(scopedKey(STORAGE_KEYS.DIAL_NUMBER, userId), phoneNumber || '');
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
    const isContact = contacts.some((c) => c.phoneNumber === phoneNumber);
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
      setCalls((prev) => prev.filter((c) => c.phoneNumber !== phoneNumber));
    } catch (e) {}
  };

  const handleBlock = (phoneNumber: string) => {
    Alert.alert('Blocked', `${phoneNumber} has been blocked.`);
  };

  const handleAddToContacts = (phoneNumber: string) => {
    navigation.navigate('AddContact', { phoneNumber });
  };

  const handleAddContact = () => {
    navigation.navigate('AddContact');
  };

  const toggleFavorite = (phoneNumber: string) => {
    setFavorites((prev) =>
      prev.includes(phoneNumber)
        ? prev.filter((f) => f !== phoneNumber)
        : [...prev, phoneNumber]
    );
  };

  const renderCallItem = ({ item }: any) => {
    const isMissed = item.type === 'missed';
    const iconName = isMissed ? 'call' : item.type === 'incoming' ? 'call' : 'call-outline';
    const iconColor = isMissed ? '#EF4444' : item.type === 'incoming' ? '#4CAF50' : '#3B82F6';

    return (
      <TouchableOpacity
        style={styles.callItem}
        onPress={() => dialNumber(item.phoneNumber)}
        onLongPress={() => handleLongPress(item.phoneNumber, item.contactName || item.name, item.flag)}
        activeOpacity={0.6}
      >
        <View style={[styles.avatar, isMissed && styles.avatarMissed]}>
          <Text style={styles.avatarText}>{item.flag || '📞'}</Text>
        </View>
        <View style={styles.callInfo}>
          <View style={styles.callRow}>
            <Text style={[styles.callName, isMissed && styles.callNameMissed]} numberOfLines={1}>
              {item.contactName || item.name}
            </Text>
            {isMissed && (
              <View style={styles.missedBadge}>
                <Text style={styles.missedBadgeText}>Missed</Text>
              </View>
            )}
          </View>
          <View style={styles.callSubRow}>
            <Ionicons name={iconName as any} size={13} color={iconColor} style={{ marginRight: 4 }} />
            <Text style={styles.callMeta}>
              {item.type === 'incoming' ? 'Incoming' : item.type === 'outgoing' ? 'Outgoing' : ''}
              {item.duration ? ` · ${item.duration}` : ''}
            </Text>
            <Text style={styles.callTime}>{item.time}</Text>
          </View>
        </View>
        <TouchableOpacity
          style={styles.chatBtn}
          onPress={() => chatWithUser(item.phoneNumber)}
        >
          <Ionicons name="chatbubble-outline" size={20} color="#3B82F6" />
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.callBtn}
          onPress={() => dialNumber(item.phoneNumber)}
        >
          <Ionicons name="call-outline" size={22} color="#22C55E" />
        </TouchableOpacity>
      </TouchableOpacity>
    );
  };

  const renderContactItem = ({ item }: { item: Contact }) => {
    const isFav = favorites.includes(item.phoneNumber);
    return (
      <TouchableOpacity
        style={styles.callItem}
        onPress={() => dialNumber(item.phoneNumber)}
        onLongPress={() => handleLongPress(item.phoneNumber, item.name, item.flag)}
        activeOpacity={0.6}
      >
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>{item.flag}</Text>
        </View>
        <View style={styles.callInfo}>
          <Text style={styles.callName} numberOfLines={1}>{item.name}</Text>
          <Text style={styles.callMeta}>{item.country} · {item.phoneNumber}</Text>
        </View>
        <TouchableOpacity
          style={styles.favBtn}
          onPress={() => toggleFavorite(item.phoneNumber)}
        >
          <Ionicons
            name={isFav ? 'star' : 'star-outline'}
            size={20}
            color={isFav ? '#F59E0B' : '#ccc'}
          />
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.chatBtn}
          onPress={() => chatWithUser(item.phoneNumber)}
        >
          <Ionicons name="chatbubble-outline" size={20} color="#3B82F6" />
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.callBtn}
          onPress={() => dialNumber(item.phoneNumber)}
        >
          <Ionicons name="call-outline" size={22} color="#22C55E" />
        </TouchableOpacity>
      </TouchableOpacity>
    );
  };

  const ListHeader = () => {
    if (mergedCalls.length === 0) return null;
    return (
      <View style={styles.listHeader}>
        <Text style={styles.listHeaderText}>
          {filter === 'missed' ? 'Missed Calls' : 'Recent Calls'}
        </Text>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color="#111" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Calls</Text>
        <View style={{ width: scale(36) }} />
      </View>

      {/* Icons Row */}
      <View style={styles.iconsRow}>
        <TouchableOpacity
          onPress={() => setShowSearch(!showSearch)}
          style={styles.iconItem}
        >
          <Ionicons name="search" size={24} color="#3B82F6" />
          <Text style={styles.iconLabel}>Search</Text>
        </TouchableOpacity>
        <TouchableOpacity
          onPress={() => navigation.navigate('Call')}
          style={styles.iconItem}
        >
          <Ionicons name="keypad-outline" size={24} color="#3B82F6" />
          <Text style={styles.iconLabel}>Keypad</Text>
        </TouchableOpacity>
        <TouchableOpacity
          onPress={() => setFilter(filter === 'all' ? 'missed' : 'all')}
          style={styles.iconItem}
        >
          <Ionicons
            name={favorites.length > 0 ? 'star' : 'star-outline'}
            size={24}
            color={favorites.length > 0 ? '#F59E0B' : '#3B82F6'}
          />
          <Text style={styles.iconLabel}>
            {favorites.length > 0 ? 'Starred' : 'Favorites'}
          </Text>
        </TouchableOpacity>
      </View>

      {/* Search Bar */}
      {showSearch && (
        <View style={styles.searchContainer}>
          <Ionicons name="search" size={18} color="#999" style={{ marginRight: 8 }} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search contacts & calls..."
            placeholderTextColor="#999"
            value={searchQuery}
            onChangeText={setSearchQuery}
            autoCapitalize="none"
            autoCorrect={false}
            autoFocus
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery('')}>
              <Ionicons name="close-circle" size={18} color="#999" />
            </TouchableOpacity>
          )}
        </View>
      )}

      {/* Filter Tabs */}
      <View style={styles.filterRow}>
        <TouchableOpacity
          style={[styles.filterTab, filter === 'all' && styles.filterTabActive]}
          onPress={() => setFilter('all')}
        >
          <Text style={[styles.filterTabText, filter === 'all' && styles.filterTabTextActive]}>
            All
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.filterTab, filter === 'missed' && styles.filterTabActive]}
          onPress={() => setFilter('missed')}
        >
          <Text style={[styles.filterTabText, filter === 'missed' && styles.filterTabTextActive]}>
            Missed
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.filterTab, contactsExpanded && styles.filterTabActive]}
          onPress={() => setContactsExpanded(!contactsExpanded)}
        >
          <Ionicons
            name="people-outline"
            size={16}
            color={contactsExpanded ? '#fff' : '#666'}
            style={{ marginRight: 4 }}
          />
          <Text style={[styles.filterTabText, contactsExpanded && styles.filterTabTextActive]}>
            Contacts
          </Text>
        </TouchableOpacity>
      </View>

      {/* Contacts List (toggled by Contacts tab) */}
      {contactsExpanded && (
        <View style={styles.contactsSection}>
          {filteredContacts.length > 0 ? (
            <ScrollView
              style={{ maxHeight: verticalScale(240) }}
              showsVerticalScrollIndicator={false}
              nestedScrollEnabled
            >
              {filteredContacts.map((contact) => (
                <TouchableOpacity
                  key={contact.id}
                  style={styles.callItem}
                  onPress={() => dialNumber(contact.phoneNumber)}
                  onLongPress={() => handleLongPress(contact.phoneNumber, contact.name, contact.flag)}
                  activeOpacity={0.6}
                >
                  <View style={styles.avatar}>
                    <Text style={styles.avatarText}>{contact.flag}</Text>
                  </View>
                  <View style={styles.callInfo}>
                    <Text style={styles.callName} numberOfLines={1}>{contact.name}</Text>
                    <Text style={styles.callMeta}>{contact.country} · {contact.phoneNumber}</Text>
                  </View>
                  <TouchableOpacity
                    style={styles.favBtn}
                    onPress={() => toggleFavorite(contact.phoneNumber)}
                  >
                    <Ionicons
                      name={favorites.includes(contact.phoneNumber) ? 'star' : 'star-outline'}
                      size={20}
                      color={favorites.includes(contact.phoneNumber) ? '#F59E0B' : '#ccc'}
                    />
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.chatBtn}
                    onPress={() => chatWithUser(contact.phoneNumber)}
                  >
                    <Ionicons name="chatbubble-outline" size={20} color="#3B82F6" />
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.callBtn}
                    onPress={() => dialNumber(contact.phoneNumber)}
                  >
                    <Ionicons name="call-outline" size={22} color="#22C55E" />
                  </TouchableOpacity>
                </TouchableOpacity>
              ))}
            </ScrollView>
          ) : (
            <View style={styles.emptyContacts}>
              <Text style={styles.emptyContactsText}>No contact</Text>
            </View>
          )}
        </View>
      )}

      {/* Calls List */}
      {mergedCalls.length > 0 ? (
        <FlatList
          data={mergedCalls}
          renderItem={renderCallItem}
          keyExtractor={(item) => item.id}
          style={styles.list}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          ListHeaderComponent={ListHeader}
        />
      ) : filter === 'missed' ? (
        <View style={styles.emptyState}>
          <Ionicons name="call-outline" size={64} color="#ddd" />
          <Text style={styles.emptyTitle}>No contact</Text>
        </View>
      ) : null}

      {/* Action Sheet Modal */}
      <Modal
        visible={showActionSheet}
        transparent
        animationType="fade"
        onRequestClose={() => setShowActionSheet(false)}
      >
        <Pressable style={styles.overlay} onPress={() => setShowActionSheet(false)}>
          <Pressable style={styles.actionSheet}>
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
              <Ionicons name="trash-outline" size={22} color="#EF4444" />
              <Text style={[styles.actionText, { color: '#EF4444' }]}>Delete</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.actionRow}
              onPress={() => {
                setShowActionSheet(false);
                if (actionItem) handleBlock(actionItem.phoneNumber);
              }}
            >
              <Ionicons name="ban-outline" size={22} color="#EF4444" />
              <Text style={[styles.actionText, { color: '#EF4444' }]}>Block</Text>
            </TouchableOpacity>

            {!actionIsContact && (
              <TouchableOpacity
                style={styles.actionRow}
                onPress={() => {
                  setShowActionSheet(false);
                  if (actionItem) handleAddToContacts(actionItem.phoneNumber);
                }}
              >
                <Ionicons name="person-add-outline" size={22} color="#3B82F6" />
                <Text style={[styles.actionText, { color: '#3B82F6' }]}>Add to Contact</Text>
              </TouchableOpacity>
            )}

            <View style={styles.actionDivider} />

            <TouchableOpacity
              style={[styles.actionRow, { justifyContent: 'center' }]}
              onPress={() => setShowActionSheet(false)}
            >
              <Text style={{ fontSize: moderateScale(16), color: '#666', fontWeight: '500' }}>Cancel</Text>
            </TouchableOpacity>
          </Pressable>
        </Pressable>
      </Modal>

      {/* FAB - Add Contact */}
      <TouchableOpacity
        style={styles.fab}
        onPress={handleAddContact}
        activeOpacity={0.8}
      >
        <Ionicons name="person-add" size={28} color="#fff" />
      </TouchableOpacity>
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
  headerTitle: {
    fontSize: moderateScale(22),
    fontWeight: '700',
    color: '#111',
  },
  iconsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    paddingVertical: verticalScale(10),
    borderBottomWidth: 0.5,
    borderBottomColor: '#e8e8e8',
  },
  iconItem: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: verticalScale(4),
  },
  iconLabel: {
    fontSize: moderateScale(11),
    color: '#3B82F6',
    marginTop: verticalScale(2),
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
    marginHorizontal: scale(16),
    marginTop: verticalScale(10),
    marginBottom: verticalScale(6),
    paddingHorizontal: scale(12),
    height: verticalScale(40),
    borderRadius: scale(10),
  },
  searchInput: {
    flex: 1,
    fontSize: moderateScale(15),
    color: '#111',
  },
  filterRow: {
    flexDirection: 'row',
    paddingHorizontal: scale(16),
    paddingVertical: verticalScale(8),
    gap: scale(8),
    borderBottomWidth: 0.5,
    borderBottomColor: '#e8e8e8',
  },
  filterTab: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: scale(16),
    paddingVertical: verticalScale(6),
    borderRadius: scale(20),
    backgroundColor: '#f0f0f0',
  },
  filterTabActive: {
    backgroundColor: '#3B82F6',
  },
  filterTabText: {
    fontSize: moderateScale(13),
    fontWeight: '500',
    color: '#666',
  },
  filterTabTextActive: {
    color: '#fff',
  },
  list: {
    flex: 1,
  },
  listContent: {
    paddingBottom: verticalScale(80),
  },
  listHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: scale(16),
    paddingVertical: verticalScale(10),
  },
  listHeaderText: {
    fontSize: moderateScale(13),
    fontWeight: '600',
    color: '#888',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  contactCount: {
    fontSize: moderateScale(12),
    color: '#bbb',
    marginLeft: scale(4),
  },
  emptyContacts: {
    alignItems: 'center',
    paddingVertical: verticalScale(30),
    paddingHorizontal: scale(16),
  },
  emptyContactsText: {
    fontSize: moderateScale(14),
    color: '#bbb',
    marginBottom: verticalScale(16),
  },
  addContactBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#3B82F6',
    paddingHorizontal: scale(20),
    paddingVertical: verticalScale(10),
    borderRadius: scale(24),
  },
  addContactBtnText: {
    fontSize: moderateScale(14),
    fontWeight: '600',
    color: '#fff',
  },
  contactsSection: {
    borderBottomWidth: 0.5,
    borderBottomColor: '#e8e8e8',
  },
  contactsScroll: {
    paddingLeft: scale(16),
    paddingBottom: verticalScale(12),
  },
  contactsScrollContent: {
    gap: scale(10),
  },
  contactChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
    paddingHorizontal: scale(12),
    paddingVertical: verticalScale(6),
    borderRadius: scale(20),
  },
  contactChipFlag: {
    fontSize: moderateScale(16),
    marginRight: scale(6),
  },
  contactChipName: {
    fontSize: moderateScale(13),
    fontWeight: '500',
    color: '#111',
    maxWidth: scale(100),
  },
  callItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: verticalScale(10),
    paddingHorizontal: scale(16),
    borderBottomWidth: 0.5,
    borderBottomColor: '#f0f0f0',
  },
  avatar: {
    width: scale(44),
    height: scale(44),
    borderRadius: scale(22),
    backgroundColor: '#f0f0f0',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: scale(12),
  },
  avatarMissed: {
    backgroundColor: '#FEF2F2',
  },
  avatarText: {
    fontSize: moderateScale(20),
  },
  callInfo: {
    flex: 1,
  },
  callRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: verticalScale(2),
  },
  callName: {
    fontSize: moderateScale(16),
    fontWeight: '500',
    color: '#111',
    flex: 1,
  },
  callNameMissed: {
    color: '#EF4444',
  },
  missedBadge: {
    backgroundColor: '#FEF2F2',
    paddingHorizontal: scale(8),
    paddingVertical: verticalScale(2),
    borderRadius: scale(10),
    marginLeft: scale(6),
  },
  missedBadgeText: {
    fontSize: moderateScale(11),
    color: '#EF4444',
    fontWeight: '500',
  },
  callSubRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  callMeta: {
    fontSize: moderateScale(13),
    color: '#888',
  },
  callTime: {
    fontSize: moderateScale(12),
    color: '#aaa',
    marginLeft: 'auto',
  },
  chatBtn: {
    width: scale(36),
    height: scale(36),
    borderRadius: scale(18),
    backgroundColor: '#EFF6FF',
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: scale(4),
  },
  callBtn: {
    width: scale(38),
    height: scale(38),
    borderRadius: scale(19),
    backgroundColor: '#F0FDF4',
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: scale(4),
  },
  favBtn: {
    width: scale(36),
    height: scale(36),
    borderRadius: scale(18),
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: scale(4),
  },
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
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
  fab: {
    position: 'absolute',
    bottom: verticalScale(24),
    right: scale(20),
    width: scale(56),
    height: scale(56),
    borderRadius: scale(28),
    backgroundColor: '#22C55E',
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 6,
    shadowColor: '#22C55E',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: verticalScale(100),
  },
  emptyTitle: {
    fontSize: moderateScale(18),
    fontWeight: '600',
    color: '#999',
    marginTop: verticalScale(12),
  },
  emptySub: {
    fontSize: moderateScale(14),
    color: '#bbb',
    marginTop: verticalScale(4),
  },
});

export default ContactsScreen;
