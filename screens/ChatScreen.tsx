import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  FlatList,
  TextInput,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

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
  const { chatId, chatName } = route.params;
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
  const flatListRef = useRef<FlatList>(null);

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
      // Stop recording
      setIsRecording(false);
      // In real app, this would process the recorded audio
      Alert.alert('Voice Note', 'Voice note recorded and sent');
    } else {
      // Start recording
      setIsRecording(true);
      Alert.alert('Recording', 'Voice note recording started...');
    }
  };

  const handleLockedFeature = () => {
    Alert.alert(
      'Upgrade to Premium',
      'Voice note translation is a premium feature. Upgrade now to unlock advanced translation features.',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Upgrade', onPress: () => navigation.navigate('Credits') },
      ]
    );
  };

  const renderMessage = ({ item }: { item: Message }) => (
    <View style={[styles.messageContainer, item.isMe ? styles.myMessage : styles.theirMessage]}>
      {!item.isMe && (
        <View style={styles.messageHeader}>
          <Text style={styles.senderName}>{chatName}</Text>
          <Text style={styles.timestamp}>{item.timestamp}</Text>
        </View>
      )}
      
      <View style={[styles.messageBubble, item.isMe ? styles.myBubble : styles.theirBubble]}>
        {item.isVoiceNote ? (
          <View style={styles.voiceNoteContainer}>
            <TouchableOpacity 
              style={styles.voiceNoteButton}
              onPress={item.isLocked ? handleLockedFeature : undefined}
            >
              <Ionicons 
                name={item.isLocked ? "lock-closed" : "play"} 
                size={20} 
                color={item.isLocked ? "#999" : "#3B82F6"} 
              />
            </TouchableOpacity>
            <View style={styles.voiceNoteInfo}>
              <Text style={[styles.voiceNoteText, item.isLocked && styles.lockedText]}>
                {item.isLocked ? '🔒 Premium Voice Note' : '🎤 Voice Note'}
              </Text>
              <Text style={styles.voiceNoteDuration}>0:15</Text>
            </View>
          </View>
        ) : (
          <>
            {!item.isMe && (
              <Text style={styles.originalMessage} numberOfLines={2}>
                {item.text}
              </Text>
            )}
            <Text style={[styles.translatedMessage, item.isMe && styles.myTranslatedMessage]}>
              {item.translatedText}
            </Text>
          </>
        )}
      </View>
      
      {item.isMe && (
        <Text style={styles.myTimestamp}>{item.timestamp}</Text>
      )}
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView 
        style={styles.keyboardAvoidingView}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <Ionicons name="arrow-back" size={24} color="#000" />
          </TouchableOpacity>
          <View style={styles.headerCenter}>
            <Text style={styles.headerTitle}>{chatName}</Text>
            <Text style={styles.headerSubtitle}>Online</Text>
          </View>
          <TouchableOpacity>
            <Ionicons name="call" size={24} color="#3B82F6" />
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

        {/* Input Area */}
        <View style={styles.inputContainer}>
          <View style={styles.inputRow}>
            <TextInput
              style={styles.textInput}
              placeholder="Type a message..."
              value={inputText}
              onChangeText={setInputText}
              multiline
              maxLength={500}
            />
            
            <TouchableOpacity
              style={[styles.voiceButton, isRecording && styles.recordingButton]}
              onPress={handleVoiceNote}
            >
              <Ionicons 
                name={isRecording ? "stop" : "mic"} 
                size={24} 
                color={isRecording ? "#fff" : "#3B82F6"} 
              />
            </TouchableOpacity>
            
            <TouchableOpacity
              style={[styles.sendButton, inputText.length > 0 && styles.sendButtonActive]}
              onPress={sendMessage}
              disabled={inputText.trim().length === 0}
            >
              <Ionicons 
                name="send" 
                size={20} 
                color={inputText.length > 0 ? "#fff" : "#999"} 
              />
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
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
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  headerCenter: {
    flex: 1,
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#000',
  },
  headerSubtitle: {
    fontSize: 12,
    color: '#4CAF50',
    marginTop: 2,
  },
  messagesList: {
    flex: 1,
  },
  messagesContent: {
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  messageContainer: {
    marginBottom: 16,
  },
  myMessage: {
    alignItems: 'flex-end',
  },
  theirMessage: {
    alignItems: 'flex-start',
  },
  messageHeader: {
    marginBottom: 4,
  },
  senderName: {
    fontSize: 12,
    fontWeight: '600',
    color: '#666',
  },
  timestamp: {
    fontSize: 12,
    color: '#999',
  },
  messageBubble: {
    maxWidth: '80%',
    padding: 12,
    borderRadius: 16,
  },
  myBubble: {
    backgroundColor: '#3B82F6',
    borderBottomRightRadius: 4,
  },
  theirBubble: {
    backgroundColor: '#fff',
    borderBottomLeftRadius: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  originalMessage: {
    fontSize: 12,
    color: '#666',
    fontStyle: 'italic',
    marginBottom: 4,
    lineHeight: 16,
  },
  translatedMessage: {
    fontSize: 16,
    color: '#000',
    fontWeight: '500',
    lineHeight: 20,
  },
  myTranslatedMessage: {
    color: '#fff',
  },
  voiceNoteContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  voiceNoteButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#f0f0f0',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  voiceNoteInfo: {
    flex: 1,
  },
  voiceNoteText: {
    fontSize: 14,
    color: '#000',
    fontWeight: '500',
    marginBottom: 2,
  },
  lockedText: {
    color: '#999',
  },
  voiceNoteDuration: {
    fontSize: 12,
    color: '#666',
  },
  myTimestamp: {
    fontSize: 12,
    color: '#999',
    marginTop: 4,
    textAlign: 'right',
  },
  inputContainer: {
    backgroundColor: '#fff',
    paddingHorizontal: 20,
    paddingVertical: 16,
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
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    maxHeight: 100,
    marginRight: 12,
  },
  voiceButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#f0f0f0',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  recordingButton: {
    backgroundColor: '#FF4444',
  },
  sendButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#f0f0f0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  sendButtonActive: {
    backgroundColor: '#3B82F6',
  },
});

export default ChatScreen;






