import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  FlatList,
  TextInput,
  Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../contexts/ThemeContext';
import { scale, verticalScale, moderateScale } from '../utils/responsive';

interface Chat {
  id: string;
  name: string;
  flag: string;
  lastMessage: string;
  translatedMessage: string;
  time: string;
  unreadCount: number;
  isOnline: boolean;
}

interface ChatsScreenProps {
  navigation: any;
}

interface CountryInfo { country: string; flag: string; code: string; localDigits: number; }
const contactCountryMap: Record<string, CountryInfo> = {
  '1': { country: 'US/Canada', flag: '🇺🇸', code: '1', localDigits: 10 },
  '234': { country: 'Nigeria', flag: '🇳🇬', code: '234', localDigits: 10 },
  '44': { country: 'UK', flag: '🇬🇧', code: '44', localDigits: 10 },
  '34': { country: 'Spain', flag: '🇪🇸', code: '34', localDigits: 9 },
  '33': { country: 'France', flag: '🇫🇷', code: '33', localDigits: 9 },
  '49': { country: 'Germany', flag: '🇩🇪', code: '49', localDigits: 11 },
  '81': { country: 'Japan', flag: '🇯🇵', code: '81', localDigits: 10 },
  '91': { country: 'India', flag: '🇮🇳', code: '91', localDigits: 10 },
  '55': { country: 'Brazil', flag: '🇧🇷', code: '55', localDigits: 11 },
  '61': { country: 'Australia', flag: '🇦🇺', code: '61', localDigits: 9 },
  '27': { country: 'South Africa', flag: '🇿🇦', code: '27', localDigits: 9 },
};

const detectCountryFromNumber = (num: string) => {
  const clean = num.replace(/[^0-9+]/g, '');
  if (!clean.startsWith('+')) return null;
  const withoutPlus = clean.slice(1);
  for (const [code, info] of Object.entries(contactCountryMap)) {
    if (withoutPlus.startsWith(code)) return info;
  }
  return null;
};

const formatPhoneNumber = (num: string) => {
  if (!num) return num;
  const info = detectCountryFromNumber(num);
  if (!info) return num;
  const withoutPlus = num.startsWith('+') ? num.slice(1) : num;
  if (!withoutPlus.startsWith(info.code)) return num;
  const local = withoutPlus.slice(info.code.length).replace(/[^0-9]/g, '');
  if (local.length === 0) return '+' + info.code;
  const parts: string[] = [];
  let r = local;
  const take = (n: number) => { const p = r.slice(0, n); parts.push(p); r = r.slice(n); };
  take(3);
  if (r.length > 0) { take(3); if (r.length > 0) parts.push(r); }
  return '+' + info.code + ' ' + parts.filter(p => p).join(' ');
};

const ChatsScreen: React.FC<ChatsScreenProps> = ({ navigation }) => {
  const { colors, isDark } = useTheme();
  const [searchQuery, setSearchQuery] = useState('');
  const [showNewChatModal, setShowNewChatModal] = useState(false);
  const [newChatNumber, setNewChatNumber] = useState('');
  const newChatDetected = detectCountryFromNumber(newChatNumber);
  const [chats] = useState<Chat[]>([
    {
      id: '1',
      name: 'Maria',
      flag: '🇪🇸',
      lastMessage: 'Hola, ¿cómo estás?',
      translatedMessage: 'Hello, how are you?',
      time: '2m',
      unreadCount: 2,
      isOnline: true,
    },
    {
      id: '2',
      name: 'John',
      flag: '🇫🇷',
      lastMessage: 'Bonjour, comment allez-vous?',
      translatedMessage: 'Good morning, how are you?',
      time: '1h',
      unreadCount: 0,
      isOnline: false,
    },
    {
      id: '3',
      name: 'Fohn',
      flag: '🇳🇱',
      lastMessage: 'Hallo, hoe gaat het?',
      translatedMessage: 'Hello, how are you?',
      time: '3h',
      unreadCount: 1,
      isOnline: true,
    },
    {
      id: '4',
      name: 'Anna',
      flag: '🇩🇪',
      lastMessage: 'Guten Tag!',
      translatedMessage: 'Good day!',
      time: '1d',
      unreadCount: 0,
      isOnline: false,
    },
  ]);

  const filteredChats = chats.filter(chat =>
    chat.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    chat.lastMessage.toLowerCase().includes(searchQuery.toLowerCase()) ||
    chat.translatedMessage.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const renderChatItem = ({ item }: { item: Chat }) => (
    <TouchableOpacity
      style={styles.chatItem}
      onPress={() => navigation.navigate('Chat', { chatId: item.id, chatName: item.name })}
    >
      <View style={styles.avatarContainer}>
        <View style={styles.avatar}>
          <Text style={styles.flagEmoji}>{item.flag}</Text>
        </View>
        {item.isOnline && <View style={[styles.onlineIndicator, { backgroundColor: colors.success, borderColor: colors.background }]} />}
      </View>

      <View style={styles.chatContent}>
        <View style={styles.chatHeader}>
          <Text style={[styles.chatName, { color: colors.text }]}>{item.name}</Text>
          <Text style={[styles.chatTime, { color: colors.textSecondary }]}>{item.time}</Text>
        </View>

        <View style={styles.messageContainer}>
            <Text style={[styles.originalMessage, { color: colors.textSecondary }]} numberOfLines={1}>
              {item.lastMessage}
            </Text>
            <Text style={[styles.translatedMessage, { color: colors.text }]} numberOfLines={1}>
              {item.translatedMessage}
            </Text>
        </View>
      </View>

      {item.unreadCount > 0 && (
        <View style={styles.unreadBadge}>
          <Text style={styles.unreadText}>{item.unreadCount}</Text>
        </View>
      )}
    </TouchableOpacity>
  );

  const startNewChat = () => {
    setNewChatNumber('');
    setShowNewChatModal(true);
  };

  const handleStartChat = () => {
    const num = newChatNumber.trim();
    if (!num) return;
    setShowNewChatModal(false);
    navigation.navigate('Chat', { chatId: 'new_' + Date.now(), chatName: num, phoneNumber: num });
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <TouchableOpacity onPress={() => navigation.openDrawer()}>
            <Ionicons name="menu" size={24} color={colors.text} />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: colors.text }]}>Chats</Text>
        </View>
        <TouchableOpacity>
          <Ionicons name="search" size={24} color={colors.primary} />
        </TouchableOpacity>
      </View>

      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <Ionicons name="search" size={20} color={colors.textSecondary} style={styles.searchIcon} />
          <TextInput
            style={[styles.searchInput, { color: colors.text }]}
            placeholder="Search chats..."
          value={searchQuery}
          onChangeText={setSearchQuery}
          placeholderTextColor={colors.textMuted}
        />
        {searchQuery.length > 0 && (
          <TouchableOpacity onPress={() => setSearchQuery('')}>
            <Ionicons name="close-circle" size={20} color={colors.textSecondary} />
          </TouchableOpacity>
        )}
      </View>

      {/* Chats List */}
      <FlatList
        data={filteredChats}
        renderItem={renderChatItem}
        keyExtractor={(item) => item.id}
        style={styles.chatsList}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.chatsListContent}
      />

      {/* Floating Action Button */}
      <TouchableOpacity style={styles.fab} onPress={startNewChat}>
        <Ionicons name="add" size={24} color="#fff" />
      </TouchableOpacity>

      {/* New Chat Modal */}
      <Modal
        visible={showNewChatModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowNewChatModal(false)}
      >
        <View style={[styles.newChatOverlay, { backgroundColor: colors.overlay }]}>
          <View style={[styles.newChatContainer, { backgroundColor: colors.card }]}>
            <View style={styles.newChatInputRow}>
              {newChatDetected && (
                <Text style={styles.newChatFlag}>{newChatDetected.flag}</Text>
              )}
              <TextInput
                style={[styles.newChatInput, { color: colors.text }, newChatDetected ? { marginLeft: 0 } : null]}
                value={formatPhoneNumber(newChatNumber)}
                onChangeText={(t) => {
                const cleaned = t.replace(/[^0-9+]/g, '');
                if (!cleaned.startsWith('+')) { setNewChatNumber(cleaned); return; }
                const info = detectCountryFromNumber(cleaned);
                if (!info) { setNewChatNumber(cleaned); return; }
                const local = cleaned.slice(1).replace(info.code, '');
                const digits = local.replace(/[^0-9]/g, '');
                if (digits.length > info.localDigits) return;
                setNewChatNumber(cleaned);
              }}
                placeholder="+234 801 234 5678"
                placeholderTextColor={colors.textMuted}
                keyboardType="phone-pad"
                autoFocus
              />
            </View>
            {newChatDetected && (
              <Text style={[styles.newChatCountryName, { color: colors.textSecondary }]}>
                {newChatDetected.country} · {(() => {
                  const local = newChatNumber.slice(1).replace(newChatDetected.code, '').replace(/[^0-9]/g, '');
                  const remaining = newChatDetected.localDigits - local.length;
                  return remaining > 0 ? `${remaining} more digit${remaining > 1 ? 's' : ''}` : 'Complete ✓';
                })()}
              </Text>
            )}
            <View style={styles.newChatActions}>
              <TouchableOpacity
                style={styles.newChatCancelBtn}
                onPress={() => setShowNewChatModal(false)}
              >
                <Text style={[styles.newChatCancelText, { color: colors.textSecondary }]}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.newChatStartBtn, !newChatNumber.trim() && { opacity: 0.5 }]}
                onPress={handleStartChat}
                disabled={!newChatNumber.trim()}
              >
                <Text style={styles.newChatStartText}>Chat</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
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
    paddingHorizontal: scale(20),
    paddingVertical: verticalScale(16),
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: moderateScale(24),
    fontWeight: 'bold',
    color: '#000',
    marginLeft: scale(16),
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8f8f8',
    marginHorizontal: scale(20),
    marginVertical: verticalScale(16),
    paddingHorizontal: scale(16),
    paddingVertical: verticalScale(12),
    borderRadius: scale(12),
  },
  searchIcon: {
    marginRight: scale(12),
  },
  searchInput: {
    flex: 1,
    fontSize: moderateScale(16),
    color: '#000',
  },
  chatsList: {
    flex: 1,
  },
  chatsListContent: {
    paddingHorizontal: scale(20),
  },
  chatItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: verticalScale(16),
    paddingHorizontal: scale(16),
    backgroundColor: '#f8f8f8',
    borderRadius: scale(12),
    marginBottom: verticalScale(12),
  },
  avatarContainer: {
    position: 'relative',
    marginRight: scale(16),
  },
  avatar: {
    width: scale(50),
    height: verticalScale(50),
    borderRadius: scale(25),
    backgroundColor: '#e0e0e0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  flagEmoji: {
    fontSize: moderateScale(24),
  },
  onlineIndicator: {
    position: 'absolute',
    bottom: verticalScale(2),
    right: scale(2),
    width: scale(12),
    height: verticalScale(12),
    borderRadius: scale(6),
    backgroundColor: '#4CAF50',
    borderWidth: 2,
    borderColor: '#fff',
  },
  chatContent: {
    flex: 1,
  },
  chatHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: verticalScale(4),
  },
  chatName: {
    fontSize: moderateScale(16),
    fontWeight: '600',
    color: '#000',
  },
  chatTime: {
    fontSize: moderateScale(12),
    color: '#666',
  },
  messageContainer: {
    gap: scale(2),
  },
  originalMessage: {
    fontSize: moderateScale(14),
    color: '#666',
    fontStyle: 'italic',
  },
  translatedMessage: {
    fontSize: moderateScale(14),
    color: '#000',
    fontWeight: '500',
  },
  unreadBadge: {
    backgroundColor: '#3B82F6',
    borderRadius: scale(10),
    minWidth: scale(20),
    height: verticalScale(20),
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: scale(6),
  },
  unreadText: {
    color: '#fff',
    fontSize: moderateScale(12),
    fontWeight: 'bold',
  },
  fab: {
    position: 'absolute',
    bottom: verticalScale(24),
    right: scale(20),
    width: scale(56),
    height: verticalScale(56),
    borderRadius: scale(28),
    backgroundColor: '#3B82F6',
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
  },
  newChatOverlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.4)',
  },
  newChatContainer: {
    backgroundColor: '#fff',
    borderRadius: scale(20),
    padding: scale(28),
    width: '85%',
    maxWidth: scale(360),
    alignItems: 'center',
  },
  newChatTitle: {
    fontSize: moderateScale(20),
    fontWeight: '700',
    color: '#000',
    marginBottom: verticalScale(20),
  },
  newChatInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '100%',
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: scale(12),
    paddingHorizontal: scale(12),
    marginBottom: verticalScale(8),
  },
  newChatFlag: {
    fontSize: moderateScale(22),
    marginRight: scale(6),
  },
  newChatInput: {
    flex: 1,
    paddingVertical: verticalScale(12),
    fontSize: moderateScale(16),
    color: '#000',
  },
  newChatCountryName: {
    fontSize: moderateScale(12),
    color: '#666',
    alignSelf: 'flex-start',
    marginBottom: verticalScale(20),
    marginLeft: scale(4),
  },
  newChatActions: {
    flexDirection: 'row',
    gap: scale(12),
    width: '100%',
  },
  newChatCancelBtn: {
    flex: 1,
    paddingVertical: verticalScale(12),
    borderRadius: scale(12),
    backgroundColor: '#f0f0f0',
    alignItems: 'center',
  },
  newChatCancelText: {
    fontSize: moderateScale(16),
    fontWeight: '600',
    color: '#666',
  },
  newChatStartBtn: {
    flex: 1,
    paddingVertical: verticalScale(12),
    borderRadius: scale(12),
    backgroundColor: '#3B82F6',
    alignItems: 'center',
  },
  newChatStartText: {
    fontSize: moderateScale(16),
    fontWeight: '600',
    color: '#fff',
  },
});

export default ChatsScreen;

