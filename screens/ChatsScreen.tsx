import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  FlatList,
  TextInput,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

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

const ChatsScreen: React.FC<ChatsScreenProps> = ({ navigation }) => {
  const [searchQuery, setSearchQuery] = useState('');
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
        {item.isOnline && <View style={styles.onlineIndicator} />}
      </View>

      <View style={styles.chatContent}>
        <View style={styles.chatHeader}>
          <Text style={styles.chatName}>{item.name}</Text>
          <Text style={styles.chatTime}>{item.time}</Text>
        </View>

        <View style={styles.messageContainer}>
          <Text style={styles.originalMessage} numberOfLines={1}>
            {item.lastMessage}
          </Text>
          <Text style={styles.translatedMessage} numberOfLines={1}>
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
    // In real app, this would open a contact picker or new chat screen
    navigation.navigate('NewChat');
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <TouchableOpacity onPress={() => navigation.openDrawer()}>
            <Ionicons name="menu" size={24} color="#000" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Chats</Text>
        </View>
        <TouchableOpacity>
          <Ionicons name="search" size={24} color="#3B82F6" />
        </TouchableOpacity>
      </View>

      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <Ionicons name="search" size={20} color="#666" style={styles.searchIcon} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search chats..."
          value={searchQuery}
          onChangeText={setSearchQuery}
          placeholderTextColor="#999"
        />
        {searchQuery.length > 0 && (
          <TouchableOpacity onPress={() => setSearchQuery('')}>
            <Ionicons name="close-circle" size={20} color="#666" />
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
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#000',
    marginLeft: 16,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8f8f8',
    marginHorizontal: 20,
    marginVertical: 16,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
  },
  searchIcon: {
    marginRight: 12,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: '#000',
  },
  chatsList: {
    flex: 1,
  },
  chatsListContent: {
    paddingHorizontal: 20,
  },
  chatItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 16,
    backgroundColor: '#f8f8f8',
    borderRadius: 12,
    marginBottom: 12,
  },
  avatarContainer: {
    position: 'relative',
    marginRight: 16,
  },
  avatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#e0e0e0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  flagEmoji: {
    fontSize: 24,
  },
  onlineIndicator: {
    position: 'absolute',
    bottom: 2,
    right: 2,
    width: 12,
    height: 12,
    borderRadius: 6,
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
    marginBottom: 4,
  },
  chatName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000',
  },
  chatTime: {
    fontSize: 12,
    color: '#666',
  },
  messageContainer: {
    gap: 2,
  },
  originalMessage: {
    fontSize: 14,
    color: '#666',
    fontStyle: 'italic',
  },
  translatedMessage: {
    fontSize: 14,
    color: '#000',
    fontWeight: '500',
  },
  unreadBadge: {
    backgroundColor: '#3B82F6',
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 6,
  },
  unreadText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
  },
  fab: {
    position: 'absolute',
    bottom: 20,
    right: 20,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#3B82F6',
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
});

export default ChatsScreen;

