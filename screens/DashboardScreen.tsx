import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  FlatList,
  TextInput,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface DashboardScreenProps {
  navigation: any;
}

interface Contact {
  id: string;
  name: string;
  country: string;
  flag: string;
  lastCall: string;
}

const DashboardScreen: React.FC<DashboardScreenProps> = ({ navigation }) => {
  const [activeTab, setActiveTab] = useState<'contacts' | 'history'>('contacts');
  const [searchQuery, setSearchQuery] = useState('');

  // Mock data - in real app this would come from API
  const contacts: Contact[] = [
    { id: '1', name: 'Maria', country: 'Spain', flag: '🇪🇸', lastCall: 'Semimes' },
    { id: '2', name: 'John', country: 'France', flag: '🇫🇷', lastCall: 'Renanes' },
    { id: '3', name: 'Fohn', country: 'Netherlands', flag: '🇳🇱', lastCall: 'sortr' },
  ];

  const recentCalls = [
    { id: '1', name: 'Maria', duration: '5:23', time: '2 hours ago', type: 'outgoing' },
    { id: '2', name: 'John', duration: '12:45', time: '1 day ago', type: 'incoming' },
    { id: '3', name: 'Fohn', duration: '3:12', time: '2 days ago', type: 'outgoing' },
  ];

  const renderContactItem = ({ item }: { item: Contact }) => (
    <TouchableOpacity style={styles.contactItem}>
      <View style={styles.contactAvatar}>
        <Text style={styles.flagEmoji}>{item.flag}</Text>
      </View>
      <View style={styles.contactInfo}>
        <Text style={styles.contactName}>{item.name}</Text>
        <Text style={styles.contactSubtext}>{item.lastCall}</Text>
      </View>
      <Ionicons name="chevron-down" size={20} color="#666" />
    </TouchableOpacity>
  );

  const renderCallHistoryItem = ({ item }: { item: any }) => (
    <TouchableOpacity style={styles.callItem}>
      <View style={styles.callAvatar}>
        <Ionicons 
          name={item.type === 'incoming' ? 'call' : 'call-outline'} 
          size={24} 
          color={item.type === 'incoming' ? '#4CAF50' : '#2196F3'} 
        />
      </View>
      <View style={styles.callInfo}>
        <Text style={styles.callName}>{item.name}</Text>
        <Text style={styles.callSubtext}>{item.time}</Text>
      </View>
      <View style={styles.callDuration}>
        <Text style={styles.durationText}>{item.duration}</Text>
      </View>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.openDrawer()}>
          <Ionicons name="menu" size={24} color="#000" />
        </TouchableOpacity>
        
        {/* Search Bar in Header */}
        <View style={styles.headerSearchBar}>
          <Ionicons name="search" size={16} color="#666" style={styles.headerSearchIcon} />
          <TextInput
            style={styles.headerSearchInput}
            placeholder="Search..."
            placeholderTextColor="#999"
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery('')}>
              <Ionicons name="close-circle" size={16} color="#666" />
            </TouchableOpacity>
          )}
        </View>

        <TouchableOpacity>
          <Ionicons name="ellipsis-vertical" size={24} color="#000" />
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.content}>
        <Text style={styles.title}>Dashboard</Text>

        {/* Credits Card */}
        <View style={styles.creditsCard}>
          <View style={styles.creditsLeft}>
            <View style={styles.progressCircle}>
              <Text style={styles.progressText}>30</Text>
            </View>
            <Text style={styles.creditsText}>You have 50 free minutes left</Text>
          </View>
        </View>

        {/* VoIP Number Display */}
        <View style={styles.voipCard}>
          <View style={styles.voipInfo}>
            <Ionicons name="phone-portrait" size={24} color="#3B82F6" />
            <View style={styles.voipDetails}>
              <Text style={styles.voipLabel}>Your LinguaCall Number</Text>
              <Text style={styles.voipNumber}>+1 (555) 123-4567</Text>
            </View>
          </View>
        </View>


        {/* Tabs */}
        <View style={styles.tabsContainer}>
          <TouchableOpacity
            style={[styles.tab, activeTab === 'contacts' && styles.activeTab]}
            onPress={() => setActiveTab('contacts')}
          >
            <Text style={[styles.tabText, activeTab === 'contacts' && styles.activeTabText]}>
              Contacts
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tab, activeTab === 'history' && styles.activeTab]}
            onPress={() => setActiveTab('history')}
          >
            <Text style={[styles.tabText, activeTab === 'history' && styles.activeTabText]}>
              Call History
            </Text>
          </TouchableOpacity>
        </View>

        {/* Content based on active tab */}
        {activeTab === 'contacts' ? (
          <FlatList
            data={contacts}
            renderItem={renderContactItem}
            keyExtractor={(item) => item.id}
            scrollEnabled={false}
            style={styles.list}
          />
        ) : (
          <FlatList
            data={recentCalls}
            renderItem={renderCallHistoryItem}
            keyExtractor={(item) => item.id}
            scrollEnabled={false}
            style={styles.list}
          />
        )}
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
  headerSearchBar: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8f8f8',
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginHorizontal: 16,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  headerSearchIcon: {
    marginRight: 8,
  },
  headerSearchInput: {
    flex: 1,
    fontSize: 14,
    color: '#000',
    paddingVertical: 0,
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
  creditsCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 20,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  creditsLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  progressCircle: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#3B82F6',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  progressText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  creditsText: {
    fontSize: 16,
    color: '#000',
    flex: 1,
  },
  voipCard: {
    backgroundColor: '#f8f8f8',
    borderRadius: 12,
    padding: 16,
    marginBottom: 24,
  },
  voipInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  voipDetails: {
    marginLeft: 12,
  },
  voipLabel: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4,
  },
  voipNumber: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#000',
  },
  tabsContainer: {
    flexDirection: 'row',
    marginBottom: 20,
  },
  tab: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  activeTab: {
    borderBottomColor: '#3B82F6',
  },
  tabText: {
    fontSize: 16,
    color: '#666',
    fontWeight: '500',
  },
  activeTabText: {
    color: '#000',
    fontWeight: 'bold',
  },
  list: {
    marginBottom: 20,
  },
  contactItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 16,
    backgroundColor: '#f8f8f8',
    borderRadius: 12,
    marginBottom: 12,
  },
  contactAvatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#e0e0e0',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  flagEmoji: {
    fontSize: 24,
  },
  contactInfo: {
    flex: 1,
  },
  contactName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000',
    marginBottom: 4,
  },
  contactSubtext: {
    fontSize: 14,
    color: '#666',
  },
  callItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 16,
    backgroundColor: '#f8f8f8',
    borderRadius: 12,
    marginBottom: 12,
  },
  callAvatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#e0e0e0',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  callInfo: {
    flex: 1,
  },
  callName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000',
    marginBottom: 4,
  },
  callSubtext: {
    fontSize: 14,
    color: '#666',
  },
  callDuration: {
    alignItems: 'flex-end',
  },
  durationText: {
    fontSize: 14,
    color: '#666',
    fontWeight: '500',
  },
});

export default DashboardScreen;

