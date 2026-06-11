import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  FlatList,
  TextInput,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { STORAGE_KEYS, scopedKey } from '../config/constants';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import { scale, verticalScale, moderateScale } from '../utils/responsive';

interface Message {
  id: string;
  text: string;
  translatedText: string;
  isMe: boolean;
  timestamp: string;
  isVoiceNote: boolean;
  isLocked: boolean;
}

interface ChatScreenProps {
  navigation: any;
  route: any;
}

const ChatScreen: React.FC<ChatScreenProps> = ({ navigation, route }) => {
  const { user } = useAuth();
  const { colors, isDark } = useTheme();
  const userId = user?.id || 'anonymous';
  const { chatId, chatName, phoneNumber } = route.params;
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      text: 'Hola, ¿cómo estás?',
      translatedText: 'Hello, how are you?',
      isMe: false,
      timestamp: '10:30',
      isVoiceNote: false,
      isLocked: false,
    },
    {
      id: '2',
      text: 'Estoy bien, gracias. ¿Y tú?',
      translatedText: 'I am fine, thank you. And you?',
      isMe: true,
      timestamp: '10:32',
      isVoiceNote: false,
      isLocked: false,
    },
    {
      id: '3',
      text: 'Voice note',
      translatedText: 'Voice note',
      isMe: false,
      timestamp: '10:35',
      isVoiceNote: true,
      isLocked: false,
    },
    {
      id: '4',
      text: 'Premium voice note',
      translatedText: 'Premium voice note',
      isMe: false,
      timestamp: '10:36',
      isVoiceNote: true,
      isLocked: true,
    },
  ]);
  
  const [inputText, setInputText] = useState('');
  const [isRecording, setIsRecording] = useState(false);
  const [isPremiumUser, setIsPremiumUser] = useState(false); // Mock user tier
  const [translateFrom, setTranslateFrom] = useState('Spanish');
  const [translateTo, setTranslateTo] = useState('English');
  const [showLangModal, setShowLangModal] = useState(false);
  const [langPickerMode, setLangPickerMode] = useState<'from' | 'to'>('from');

  const callUser = async () => {
    const num = phoneNumber || chatName;
    if (!num || num === 'Unknown') return;
    await AsyncStorage.setItem(scopedKey(STORAGE_KEYS.DIAL_NUMBER, userId), num);
    navigation.navigate('Call');
  };
  const [autoTranslate, setAutoTranslate] = useState(true);
  const flatListRef = useRef<FlatList>(null);

  const availableLanguages = [
    'English', 'Spanish', 'French', 'German', 'Italian', 'Portuguese',
    'Chinese', 'Japanese', 'Korean', 'Arabic', 'Hindi', 'Russian',
    'Dutch', 'Swedish', 'Norwegian', 'Danish', 'Finnish', 'Polish',
    'Turkish', 'Greek', 'Hebrew', 'Thai', 'Vietnamese', 'Indonesian',
  ];

  const sendMessage = () => {
    if (inputText.trim().length === 0) return;

    const newMessage: Message = {
      id: Date.now().toString(),
      text: inputText,
      translatedText: `Translated: ${inputText}`, // Mock translation
      isMe: true,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      isVoiceNote: false,
      isLocked: false,
    };

    setMessages(prev => [...prev, newMessage]);
    setInputText('');
    
    // Auto scroll to bottom
    setTimeout(() => {
      flatListRef.current?.scrollToEnd({ animated: true });
    }, 100);
  };

  const handleVoiceNote = () => {
    if (isRecording) {
      setIsRecording(false);
      const newMessage: Message = {
        id: Date.now().toString(),
        text: '🎤 Voice note recorded',
        translatedText: `[Translated voice note]`,
        isMe: true,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        isVoiceNote: true,
        isLocked: false,
      };
      setMessages(prev => [...prev, newMessage]);
      setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: true });
      }, 100);
    } else {
      setIsRecording(true);
    }
  };

  const handlePlayVoiceNote = (item: Message) => {
    Alert.alert(
      'Voice Note',
      item.isLocked
        ? 'Upgrade to Premium to translate this voice note.'
        : `Playing voice note...\n\nTranslation: ${item.translatedText}`,
      item.isLocked
        ? [
            { text: 'Cancel', style: 'cancel' },
            { text: 'Upgrade', onPress: () => navigation.navigate('Credits') },
          ]
        : [{ text: 'OK' }],
    );
  };

  const openLangPicker = (mode: 'from' | 'to') => {
    setLangPickerMode(mode);
    setShowLangModal(true);
  };

  const selectLanguage = (lang: string) => {
    if (langPickerMode === 'from') setTranslateFrom(lang);
    else setTranslateTo(lang);
    setShowLangModal(false);
  };

  const renderMessage = ({ item }: { item: Message }) => (
    <View style={[styles.messageContainer, item.isMe ? styles.myMessage : styles.theirMessage]}>
      {!item.isMe && (
        <View style={styles.messageHeader}>
          <Text style={[styles.senderName, { color: colors.textSecondary }]}>{chatName}</Text>
          <Text style={[styles.timestamp, { color: colors.textMuted }]}>{item.timestamp}</Text>
        </View>
      )}
      
      <View style={[styles.messageBubble, item.isMe ? [styles.myBubble, { backgroundColor: colors.primary }] : [styles.theirBubble, { backgroundColor: colors.card }]]}>
        {item.isVoiceNote ? (
          <View style={styles.voiceNoteContainer}>
            <TouchableOpacity
              style={[styles.voiceNoteButton, { backgroundColor: colors.cardAlt }]}
              onPress={() => handlePlayVoiceNote(item)}
            >
              <Ionicons
                name={item.isLocked ? "lock-closed" : "play"}
                size={20}
                color={item.isLocked ? colors.textMuted : colors.primary}
              />
            </TouchableOpacity>
            <View style={styles.voiceNoteInfo}>
              <Text style={[styles.voiceNoteText, { color: item.isMe ? '#fff' : colors.text }, item.isLocked && styles.lockedText]}>
                {item.isLocked ? '🔒 Premium Voice Note' : '🎤 Voice Note'}
              </Text>
              <Text style={[styles.voiceNoteDuration, { color: colors.textSecondary }]}>0:15</Text>
            </View>
          </View>
        ) : (
          <>
            {!item.isMe && (
              <Text style={[styles.originalMessage, { color: colors.textSecondary }]} numberOfLines={2}>
                {item.text}
              </Text>
            )}
            <Text style={[styles.translatedMessage, { color: item.isMe ? '#fff' : colors.text }, item.isMe && styles.myTranslatedMessage]}>
              {item.translatedText}
            </Text>
          </>
        )}
        {autoTranslate && (
          <View style={[styles.translateBadge, item.isMe ? styles.translateBadgeMine : styles.translateBadgeTheirs]}>
            <Ionicons name="language" size={10} color={item.isMe ? "rgba(255,255,255,0.8)" : colors.primary} />
            <Text style={[styles.translateBadgeText, { color: item.isMe ? 'rgba(255,255,255,0.7)' : colors.primary }, item.isMe && styles.translateBadgeTextMine]}>
              {item.isMe ? translateTo : translateFrom} → {item.isMe ? translateFrom : translateTo}
            </Text>
          </View>
        )}
      </View>
      
      {item.isMe && (
        <Text style={[styles.myTimestamp, { color: colors.textMuted }]}>{item.timestamp}</Text>
      )}
    </View>
  );

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <KeyboardAvoidingView 
        style={styles.keyboardAvoidingView}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        {/* Header */}
        <View style={[styles.header, { backgroundColor: colors.headerBg, borderBottomColor: colors.border }]}>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <Ionicons name="arrow-back" size={24} color={colors.text} />
          </TouchableOpacity>
          <View style={styles.headerCenter}>
            <Text style={[styles.headerTitle, { color: colors.text }]}>{chatName}</Text>
            <Text style={[styles.headerSubtitle, { color: colors.success }]}>Online</Text>
          </View>
          <TouchableOpacity onPress={callUser}>
            <Ionicons name="call" size={24} color={colors.primary} />
          </TouchableOpacity>
        </View>

        {/* Messages */}
        <FlatList
          ref={flatListRef}
          data={messages}
          renderItem={renderMessage}
          keyExtractor={(item) => item.id}
          style={styles.messagesList}
          contentContainerStyle={styles.messagesContent}
          showsVerticalScrollIndicator={false}
        />

        {/* Language Bar */}
        {autoTranslate && (
          <View style={[styles.langBar, { backgroundColor: colors.cardAlt, borderTopColor: colors.border }]}>
            <TouchableOpacity style={styles.langPill} onPress={() => openLangPicker('from')}>
              <Text style={[styles.langPillLabel, { color: colors.textMuted }]}>From</Text>
              <Text style={[styles.langPillValue, { color: colors.primaryDark }]}>{translateFrom}</Text>
              <Ionicons name="chevron-down" size={12} color={colors.primary} />
            </TouchableOpacity>
            <Ionicons name="arrow-forward" size={14} color={colors.textMuted} />
            <TouchableOpacity style={styles.langPill} onPress={() => openLangPicker('to')}>
              <Text style={[styles.langPillLabel, { color: colors.textMuted }]}>To</Text>
              <Text style={[styles.langPillValue, { color: colors.primaryDark }]}>{translateTo}</Text>
              <Ionicons name="chevron-down" size={12} color={colors.primary} />
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.langToggleBtn}
              onPress={() => setAutoTranslate(!autoTranslate)}
            >
              <Ionicons
                name={autoTranslate ? "checkmark-circle" : "close-circle"}
                size={18}
                color={autoTranslate ? colors.success : colors.textMuted}
              />
            </TouchableOpacity>
          </View>
        )}
        {!autoTranslate && (
          <TouchableOpacity style={[styles.langDisabledBar, { backgroundColor: colors.cardAlt, borderTopColor: colors.border }]} onPress={() => setAutoTranslate(true)}>
            <Ionicons name="language" size={16} color={colors.textMuted} />
            <Text style={[styles.langDisabledText, { color: colors.textMuted }]}>Real-time translation off — tap to enable</Text>
          </TouchableOpacity>
        )}

        {/* Input Area */}
        <View style={[styles.inputContainer, { backgroundColor: colors.inputBg, borderTopColor: colors.border }]}>
          <View style={styles.inputRow}>
            <TextInput
              style={[styles.textInput, { color: colors.text, borderColor: colors.border }]}
              placeholder="Type a message..."
              placeholderTextColor={colors.textMuted}
              value={inputText}
              onChangeText={setInputText}
              multiline
              maxLength={500}
            />
            
            <TouchableOpacity
              style={[styles.voiceButton, { backgroundColor: colors.cardAlt }, isRecording && styles.recordingButton]}
              onPress={handleVoiceNote}
            >
              <Ionicons 
                name={isRecording ? "stop" : "mic"} 
                size={24} 
                color={isRecording ? "#fff" : colors.primary} 
              />
            </TouchableOpacity>
            
            <TouchableOpacity
              style={[styles.sendButton, { backgroundColor: colors.cardAlt }, inputText.length > 0 && [styles.sendButtonActive, { backgroundColor: colors.primary }]]}
              onPress={sendMessage}
              disabled={inputText.trim().length === 0}
            >
              <Ionicons 
                name="send" 
                size={20} 
                color={inputText.length > 0 ? "#fff" : colors.textMuted} 
              />
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>

      {/* Language Picker Modal */}
      <Modal
        visible={showLangModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowLangModal(false)}
      >
        <View style={[styles.modalOverlay, { backgroundColor: colors.overlay }]}>
          <View style={[styles.modalContent, { backgroundColor: colors.card }]}>
            <View style={[styles.modalHeader, { borderBottomColor: colors.border }]}>
              <Text style={[styles.modalTitle, { color: colors.text }]}>
                {langPickerMode === 'from'
                  ? `Translate from ${chatName}'s language`
                  : `Translate to my language`}
              </Text>
              <TouchableOpacity onPress={() => setShowLangModal(false)}>
                <Ionicons name="close" size={24} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>
            <FlatList
              data={availableLanguages}
              keyExtractor={(item) => item}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={[
                    styles.langItem,
                    (langPickerMode === 'from' && item === translateFrom) ||
                    (langPickerMode === 'to' && item === translateTo)
                      ? styles.langItemSelected
                      : undefined,
                  ]}
                  onPress={() => selectLanguage(item)}
                >
                  <Text style={[
                    styles.langItemText,
                    { color: (langPickerMode === 'from' && item === translateFrom) ||
                    (langPickerMode === 'to' && item === translateTo) ? colors.primary : colors.text },
                    (langPickerMode === 'from' && item === translateFrom) ||
                    (langPickerMode === 'to' && item === translateTo)
                      ? styles.langItemTextSelected
                      : undefined,
                  ]}>
                    {item}
                  </Text>
                  {((langPickerMode === 'from' && item === translateFrom) ||
                    (langPickerMode === 'to' && item === translateTo)) && (
                    <Ionicons name="checkmark" size={20} color={colors.primary} />
                  )}
                </TouchableOpacity>
              )}
            />
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  keyboardAvoidingView: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: scale(20),
    paddingVertical: verticalScale(16),
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  headerCenter: {
    flex: 1,
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: moderateScale(18),
    fontWeight: 'bold',
    color: '#000',
  },
  headerSubtitle: {
    fontSize: moderateScale(12),
    color: '#4CAF50',
    marginTop: verticalScale(2),
  },
  messagesList: {
    flex: 1,
  },
  messagesContent: {
    paddingHorizontal: scale(20),
    paddingVertical: verticalScale(16),
  },
  messageContainer: {
    marginBottom: verticalScale(16),
  },
  myMessage: {
    alignItems: 'flex-end',
  },
  theirMessage: {
    alignItems: 'flex-start',
  },
  messageHeader: {
    marginBottom: verticalScale(4),
  },
  senderName: {
    fontSize: moderateScale(12),
    fontWeight: '600',
    color: '#666',
  },
  timestamp: {
    fontSize: moderateScale(12),
    color: '#999',
  },
  messageBubble: {
    maxWidth: '80%',
    padding: scale(12),
    borderRadius: scale(16),
  },
  myBubble: {
    backgroundColor: '#3B82F6',
    borderBottomRightRadius: scale(4),
  },
  theirBubble: {
    backgroundColor: '#fff',
    borderBottomLeftRadius: scale(4),
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  originalMessage: {
    fontSize: moderateScale(12),
    color: '#666',
    fontStyle: 'italic',
    marginBottom: verticalScale(4),
    lineHeight: verticalScale(16),
  },
  translatedMessage: {
    fontSize: moderateScale(16),
    color: '#000',
    fontWeight: '500',
    lineHeight: verticalScale(20),
  },
  myTranslatedMessage: {
    color: '#fff',
  },
  voiceNoteContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  voiceNoteButton: {
    width: scale(40),
    height: verticalScale(40),
    borderRadius: scale(20),
    backgroundColor: '#f0f0f0',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  voiceNoteInfo: {
    flex: 1,
  },
  voiceNoteText: {
    fontSize: moderateScale(14),
    color: '#000',
    fontWeight: '500',
    marginBottom: verticalScale(2),
  },
  lockedText: {
    color: '#999',
  },
  voiceNoteDuration: {
    fontSize: moderateScale(12),
    color: '#666',
  },
  myTimestamp: {
    fontSize: moderateScale(12),
    color: '#999',
    marginTop: verticalScale(4),
    textAlign: 'right',
  },
  inputContainer: {
    backgroundColor: '#fff',
    paddingHorizontal: scale(20),
    paddingVertical: verticalScale(16),
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
  },
  textInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: scale(20),
    paddingHorizontal: scale(16),
    paddingVertical: verticalScale(12),
    fontSize: moderateScale(16),
    maxHeight: verticalScale(100),
    marginRight: 12,
  },
  voiceButton: {
    width: scale(44),
    height: verticalScale(44),
    borderRadius: scale(22),
    backgroundColor: '#f0f0f0',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  recordingButton: {
    backgroundColor: '#FF4444',
  },
  sendButton: {
    width: scale(44),
    height: verticalScale(44),
    borderRadius: scale(22),
    backgroundColor: '#f0f0f0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  sendButtonActive: {
    backgroundColor: '#3B82F6',
  },

  // ── Language Bar ──
  langBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: scale(16),
    paddingVertical: verticalScale(10),
    backgroundColor: '#f8f9ff',
    borderTopWidth: 1,
    borderTopColor: '#e8ecf4',
    gap: scale(8),
  },
  langPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: scale(16),
    paddingHorizontal: scale(12),
    paddingVertical: verticalScale(6),
    borderWidth: 1,
    borderColor: '#dbeafe',
    gap: scale(4),
  },
  langPillLabel: {
    fontSize: moderateScale(11),
    color: '#999',
    marginRight: 2,
  },
  langPillValue: {
    fontSize: moderateScale(13),
    fontWeight: '600',
    color: '#1D4ED8',
  },
  langToggleBtn: {
    padding: scale(4),
  },
  langDisabledBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: verticalScale(10),
    backgroundColor: '#f5f5f5',
    borderTopWidth: 1,
    borderTopColor: '#eee',
    gap: scale(6),
  },
  langDisabledText: {
    fontSize: moderateScale(13),
    color: '#999',
  },

  // ── Translate Badge on Messages ──
  translateBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: verticalScale(6),
    gap: scale(4),
  },
  translateBadgeMine: {
    justifyContent: 'flex-end',
  },
  translateBadgeTheirs: {
    justifyContent: 'flex-start',
  },
  translateBadgeText: {
    fontSize: moderateScale(10),
    color: '#3B82F6',
    fontWeight: '500',
  },
  translateBadgeTextMine: {
    color: 'rgba(255,255,255,0.7)',
  },

  // ── Language Modal ──
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderTopLeftRadius: scale(20),
    borderTopRightRadius: scale(20),
    maxHeight: '70%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: scale(20),
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  modalTitle: {
    fontSize: moderateScale(17),
    fontWeight: 'bold',
    color: '#000',
    flex: 1,
    marginRight: 12,
  },
  langItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: scale(20),
    paddingVertical: verticalScale(16),
    borderBottomWidth: 1,
    borderBottomColor: '#f8f8f8',
  },
  langItemSelected: {
    backgroundColor: '#f0f8ff',
  },
  langItemText: {
    fontSize: moderateScale(16),
    color: '#000',
    flex: 1,
  },
  langItemTextSelected: {
    color: '#3B82F6',
    fontWeight: '600',
  },
});

export default ChatScreen;






