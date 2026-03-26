import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  Alert,
  Modal,
  FlatList,
  TextInput,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface CallScreenProps {
  navigation: any;
  route?: any;
}

type CallState = 'dialer' | 'incoming' | 'outgoing' | 'active' | 'ended';

const CallScreen: React.FC<CallScreenProps> = ({ navigation, route }) => {
  const [callState, setCallState] = useState<CallState>('dialer');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [callDuration, setCallDuration] = useState(0);
  const [isMuted, setIsMuted] = useState(false);
  const [isSpeaker, setIsSpeaker] = useState(false);
  const [translationEnabled, setTranslationEnabled] = useState(true);
  const [translateFrom, setTranslateFrom] = useState('English');
  const [translateTo, setTranslateTo] = useState('Spanish');
  const [showLanguageModal, setShowLanguageModal] = useState(false);
  const [selectedLanguageType, setSelectedLanguageType] = useState<'from' | 'to'>('to');
  const [showVoiceModal, setShowVoiceModal] = useState(false);
  const [selectedVoice, setSelectedVoice] = useState('Default');

  // Available languages for translation
  const availableLanguages = [
    'English',
    'Spanish',
    'French',
    'German',
    'Italian',
    'Portuguese',
    'Chinese',
    'Japanese',
    'Korean',
    'Arabic',
    'Hindi',
    'Russian',
    'Dutch',
    'Swedish',
    'Norwegian',
    'Danish',
    'Finnish',
    'Polish',
    'Czech',
    'Turkish',
    'Greek',
    'Hebrew',
    'Thai',
    'Vietnamese',
    'Indonesian',
    'Malay',
  ];

  // Available voices for text-to-speech
  const availableVoices = [
    'Default',
    'Male Voice',
    'Female Voice',
    'Deep Voice',
    'High Voice',
    'Robotic Voice',
    'British Accent',
    'American Accent',
    'Australian Accent',
    'French Accent',
    'Spanish Accent',
  ];

  // Mock call duration timer
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (callState === 'active') {
      interval = setInterval(() => {
        setCallDuration(prev => prev + 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [callState]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}.${secs.toString().padStart(2, '0')}`;
  };

  const handleNumberPress = (number: string) => {
    setPhoneNumber(prev => prev + number);
  };

  const handleDeleteNumber = () => {
    setPhoneNumber(prev => prev.slice(0, -1));
  };

  const handleCall = () => {
    if (phoneNumber.length === 0) {
      Alert.alert('Error', 'Please enter a phone number');
      return;
    }
    setCallState('outgoing');
    // Simulate call connection
    setTimeout(() => {
      setCallState('active');
    }, 2000);
  };

  const handleEndCall = () => {
    setCallState('ended');
    setCallDuration(0);
    // Call summary will be shown automatically when callState is 'ended'
  };

  const handleAnswerCall = () => {
    setCallState('active');
  };

  const handleLanguageSelect = (languageType: 'from' | 'to') => {
    setSelectedLanguageType(languageType);
    setShowLanguageModal(true);
  };

  const selectLanguage = (language: string) => {
    if (selectedLanguageType === 'from') {
      setTranslateFrom(language);
    } else {
      setTranslateTo(language);
    }
    setShowLanguageModal(false);
  };

  const handleVoiceChange = () => {
    setShowVoiceModal(true);
  };

  const selectVoice = (voice: string) => {
    setSelectedVoice(voice);
    setShowVoiceModal(false);
  };

  const renderLanguageModal = () => (
    <Modal
      visible={showLanguageModal}
      transparent={true}
      animationType="slide"
      onRequestClose={() => setShowLanguageModal(false)}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>
              Select {selectedLanguageType === 'from' ? 'Translate them to' : 'Translate me to'}
            </Text>
            <TouchableOpacity
              style={styles.closeButton}
              onPress={() => setShowLanguageModal(false)}
            >
              <Ionicons name="close" size={24} color="#666" />
            </TouchableOpacity>
          </View>
          
          <FlatList
            data={availableLanguages}
            keyExtractor={(item) => item}
            renderItem={({ item }) => (
              <TouchableOpacity
                style={[
                  styles.languageItem,
                  ((selectedLanguageType === 'from' && item === translateFrom) ||
                   (selectedLanguageType === 'to' && item === translateTo)) && styles.languageItemSelected
                ]}
                onPress={() => selectLanguage(item)}
              >
                <Text style={[
                  styles.languageItemText,
                  ((selectedLanguageType === 'from' && item === translateFrom) ||
                   (selectedLanguageType === 'to' && item === translateTo)) && styles.languageItemTextSelected
                ]}>
                  {item}
                </Text>
                {((selectedLanguageType === 'from' && item === translateFrom) ||
                  (selectedLanguageType === 'to' && item === translateTo)) && (
                  <Ionicons name="checkmark" size={20} color="#3B82F6" />
                )}
              </TouchableOpacity>
            )}
            style={styles.languageList}
          />
        </View>
      </View>
    </Modal>
  );

  const renderVoiceModal = () => (
    <Modal
      visible={showVoiceModal}
      transparent={true}
      animationType="slide"
      onRequestClose={() => setShowVoiceModal(false)}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Select Voice</Text>
            <TouchableOpacity
              style={styles.closeButton}
              onPress={() => setShowVoiceModal(false)}
            >
              <Ionicons name="close" size={24} color="#666" />
            </TouchableOpacity>
          </View>
          
          <FlatList
            data={availableVoices}
            keyExtractor={(item) => item}
            renderItem={({ item }) => (
              <TouchableOpacity
                style={[
                  styles.languageItem,
                  item === selectedVoice && styles.languageItemSelected
                ]}
                onPress={() => selectVoice(item)}
              >
                <View style={styles.voiceItemContent}>
                  <Ionicons 
                    name="volume-high" 
                    size={20} 
                    color={item === selectedVoice ? "#3B82F6" : "#666"} 
                  />
                  <Text style={[
                    styles.languageItemText,
                    item === selectedVoice && styles.languageItemTextSelected
                  ]}>
                    {item}
                  </Text>
                </View>
                {item === selectedVoice && (
                  <Ionicons name="checkmark" size={20} color="#3B82F6" />
                )}
              </TouchableOpacity>
            )}
            style={styles.languageList}
          />

          {/* Add Voice Options */}
          <View style={styles.addVoiceContainer}>
            <TouchableOpacity
              style={styles.addVoiceButton}
              onPress={() => {
                setShowVoiceModal(false);
                Alert.alert(
                  'Record Custom Voice',
                  'You can record your own voice or clone a voice sample',
                  [
                    { text: 'Cancel', style: 'cancel' },
                    { text: 'Start Recording', onPress: () => {} }
                  ]
                );
              }}
            >
              <Ionicons name="mic-circle" size={24} color="#3B82F6" />
              <Text style={styles.addVoiceButtonText}>Record Your Voice</Text>
            </TouchableOpacity>

            <View style={styles.addVoiceDivider} />

            <TouchableOpacity
              style={styles.addVoiceButton}
              onPress={() => {
                setShowVoiceModal(false);
                Alert.alert(
                  'Celebrity Voices',
                  'Search and select from a library of celebrity voice models',
                  [
                    { text: 'Cancel', style: 'cancel' },
                    { text: 'Browse Library', onPress: () => {} }
                  ]
                );
              }}
            >
              <Ionicons name="star" size={24} color="#3B82F6" />
              <Text style={styles.addVoiceButtonText}>Search Celebrity Voice</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );

  const renderDialer = () => (
    <View style={styles.container}>
      {/* Fixed Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color="#000" />
        </TouchableOpacity>
        <TouchableOpacity>
          <Ionicons name="person-circle" size={24} color="#3B82F6" />
        </TouchableOpacity>
      </View>

      <View style={styles.titleRow}>
        <Text style={styles.title}>Dialer</Text>
        <TouchableOpacity style={styles.changeVoiceButton} onPress={handleVoiceChange}>
          <Ionicons name="volume-high" size={20} color="#3B82F6" />
          <Text style={styles.changeVoiceText}>Change Voice</Text>
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Translation Settings */}
        <View style={styles.translationSettings}>
          <View style={styles.languageRow}>
            <Text style={styles.languageLabel}>Translate me to:</Text>
            <TouchableOpacity 
              style={styles.languageButton}
              onPress={() => handleLanguageSelect('to')}
            >
              <Text style={styles.languageText}>{translateTo}</Text>
              <Ionicons name="chevron-down" size={16} color="#666" />
            </TouchableOpacity>
          </View>

          <View style={styles.languageRow}>
            <Text style={styles.languageLabel}>Translate them to:</Text>
            <TouchableOpacity 
              style={styles.languageButton}
              onPress={() => handleLanguageSelect('from')}
            >
              <Text style={styles.languageText}>{translateFrom}</Text>
              <Ionicons name="chevron-down" size={16} color="#666" />
            </TouchableOpacity>
          </View>

          <View style={styles.toggleRow}>
            <Text style={styles.toggleLabel}>Real-time translation</Text>
            <TouchableOpacity
              style={[styles.toggle, translationEnabled && styles.toggleActive]}
              onPress={() => setTranslationEnabled(!translationEnabled)}
            >
              <View style={[styles.toggleThumb, translationEnabled && styles.toggleThumbActive]} />
            </TouchableOpacity>
          </View>
        </View>

        {/* Phone Number Display */}
        <View style={styles.numberDisplay}>
          <TextInput
            style={styles.phoneNumber}
            value={phoneNumber}
            onChangeText={setPhoneNumber}
            placeholder="Enter number"
            keyboardType="phone-pad"
            selectTextOnFocus={true}
            multiline={false}
            textAlign="center"
          />
          {phoneNumber.length > 0 && (
            <TouchableOpacity 
              style={styles.clearButton}
              onPress={() => setPhoneNumber('')}
            >
              <Ionicons name="close-circle" size={24} color="#666" />
            </TouchableOpacity>
          )}
        </View>

        {/* Keypad */}
        <View style={styles.keypad}>
          {[
            ['1', '2', '3'],
            ['4', '5', '6'],
            ['7', '8', '9'],
            ['*', '0', '#'],
          ].map((row, rowIndex) => (
            <View key={rowIndex} style={styles.keypadRow}>
              {row.map((key) => (
                <TouchableOpacity
                  key={key}
                  style={styles.keypadButton}
                  onPress={() => handleNumberPress(key)}
                >
                  <Text style={styles.keypadButtonText}>{key}</Text>
                </TouchableOpacity>
              ))}
            </View>
          ))}
        </View>
      </ScrollView>

      {/* Fixed Call Button */}
      <View style={styles.callButtonContainer}>
        <TouchableOpacity style={styles.callButton} onPress={handleCall}>
          <Ionicons name="call" size={20} color="#fff" />
        </TouchableOpacity>
      </View>
    </View>
  );

  const renderInCall = () => (
    <View style={styles.inCallContainer}>
      {/* Floating Back Button */}
      <TouchableOpacity 
        style={styles.floatingBackButton} 
        onPress={() => navigation.goBack()}
      >
        <Ionicons name="arrow-back" size={24} color="#000" />
      </TouchableOpacity>

      <View style={styles.inCallContent}>
        <Text style={styles.inCallTitle}>In-Call</Text>
        
        <View style={styles.callerInfo}>
          <Text style={styles.callerName}>John</Text>
          <Text style={styles.callDuration}>{formatTime(callDuration)}</Text>
        </View>

        {/* Call Controls */}
        <View style={styles.callControls}>
          <TouchableOpacity
            style={[styles.controlButton, isMuted && styles.controlButtonActive]}
            onPress={() => setIsMuted(!isMuted)}
          >
            <Ionicons 
              name={isMuted ? "mic-off" : "mic"} 
              size={24} 
              color={isMuted ? "#fff" : "#000"} 
            />
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.controlButton, isSpeaker && styles.controlButtonActive]}
            onPress={() => setIsSpeaker(!isSpeaker)}
          >
            <Ionicons 
              name="volume-high" 
              size={24} 
              color={isSpeaker ? "#fff" : "#000"} 
            />
          </TouchableOpacity>

          <TouchableOpacity style={styles.controlButton}>
            <Ionicons name="checkmark-circle" size={24} color="#000" />
          </TouchableOpacity>
        </View>

        {/* Hang Up Button */}
        <TouchableOpacity style={styles.hangUpButton} onPress={handleEndCall}>
          <Ionicons name="call" size={32} color="#fff" />
        </TouchableOpacity>

        {/* Translation Feature Button */}
        <TouchableOpacity style={styles.translationFeatureButton}>
          <Text style={styles.translationFeatureText}>Exrocaura</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  const renderCallSummary = () => (
    <ScrollView style={styles.content}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => setCallState('dialer')}>
          <Ionicons name="arrow-back" size={24} color="#000" />
        </TouchableOpacity>
        <TouchableOpacity>
          <Ionicons name="information-circle" size={24} color="#3B82F6" />
        </TouchableOpacity>
      </View>

      <Text style={styles.title}>Call Summary</Text>

      {/* Call Ended Card */}
      <View style={styles.callEndedCard}>
        <Text style={styles.callEndedText}>Call Ended</Text>
        <Text style={styles.callEndedTime}>15:42</Text>
      </View>

      {/* Add Contact Button */}
      <TouchableOpacity style={styles.addContactButton}>
        <Text style={styles.addContactButtonText}>Add Contact</Text>
      </TouchableOpacity>

      {/* Rating Section */}
      <View style={styles.ratingSection}>
        <Text style={styles.ratingLabel}>Rate translation quality</Text>
        <View style={styles.starsContainer}>
          {[1, 2, 3, 4, 5].map((star) => (
            <TouchableOpacity key={star}>
              <Ionicons
                name={star <= 3 ? "star" : "star-outline"}
                size={24}
                color="#3B82F6"
              />
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* Cost Information */}
      <View style={styles.costSection}>
        <View style={styles.costRow}>
          <Text style={styles.costLabel}>Call Cost</Text>
          <Text style={styles.costValue}>2.45</Text>
        </View>
        <View style={styles.costRow}>
          <Text style={styles.costLabel}>Credits Remaining</Text>
          <Text style={styles.costValue}>28.55</Text>
        </View>
      </View>

      {/* Back to Dialer Button */}
      <TouchableOpacity 
        style={styles.backToHomeButton}
        onPress={() => setCallState('dialer')}
      >
        <Text style={styles.backToHomeButtonText}>Back to Dialer</Text>
      </TouchableOpacity>
    </ScrollView>
  );

  if (callState === 'active') {
    return renderInCall();
  }

  if (callState === 'ended') {
    return renderCallSummary();
  }

  return (
    <>
      {renderDialer()}
      {renderLanguageModal()}
      {renderVoiceModal()}
    </>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 40,
    paddingBottom: 16,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  titleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 20,
    marginBottom: 24,
    paddingHorizontal: 20,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#000',
  },
  changeVoiceButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f0f8ff',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#3B82F6',
  },
  changeVoiceText: {
    fontSize: 13,
    color: '#3B82F6',
    fontWeight: '600',
    marginLeft: 4,
  },
  translationSettings: {
    backgroundColor: '#f8f8f8',
    borderRadius: 12,
    padding: 16,
    marginBottom: 24,
  },
  languageRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  languageLabel: {
    fontSize: 16,
    color: '#000',
  },
  languageButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
  },
  languageText: {
    fontSize: 16,
    color: '#000',
    marginRight: 8,
  },
  toggleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  toggleLabel: {
    fontSize: 16,
    color: '#000',
  },
  toggle: {
    width: 50,
    height: 30,
    backgroundColor: '#e0e0e0',
    borderRadius: 15,
    justifyContent: 'center',
    paddingHorizontal: 2,
  },
  toggleActive: {
    backgroundColor: '#3B82F6',
  },
  toggleThumb: {
    width: 26,
    height: 26,
    backgroundColor: '#fff',
    borderRadius: 13,
    alignSelf: 'flex-start',
  },
  toggleThumbActive: {
    alignSelf: 'flex-end',
  },
  numberDisplay: {
    alignItems: 'center',
    marginBottom: 40,
    position: 'relative',
  },
  phoneNumber: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#000',
    letterSpacing: 2,
    textAlign: 'center',
    paddingHorizontal: 20,
    minHeight: 40,
  },
  clearButton: {
    position: 'absolute',
    right: 10,
    top: '50%',
    marginTop: -12,
    padding: 4,
  },
  keypad: {
    marginBottom: 100,
  },
  keypadRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 15,
  },
  keypadButton: {
    width: 65,
    height: 65,
    borderRadius: 32.5,
    backgroundColor: '#f0f0f0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  keypadButtonText: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#000',
  },
  callButtonContainer: {
    position: 'absolute',
    bottom: 20,
    left: 20,
    right: 20,
    alignItems: 'center',
  },
  callButton: {
    width: 65,
    height: 65,
    borderRadius: 32.5,
    backgroundColor: '#3B82F6',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  callButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
  },
  inCallContainer: {
    flex: 1,
    backgroundColor: '#fff',
  },
  safeArea: {
    backgroundColor: '#fff',
  },
  floatingBackButton: {
    position: 'absolute',
    top: 60,
    left: 20,
    zIndex: 1000,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
  inCallHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  inCallContent: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 20,
    paddingTop: 60,
  },
  inCallTitle: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#000',
    marginBottom: 40,
  },
  callerInfo: {
    alignItems: 'center',
    marginBottom: 60,
  },
  callerName: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#000',
    marginBottom: 8,
  },
  callDuration: {
    fontSize: 18,
    color: '#666',
  },
  callControls: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    width: '100%',
    marginBottom: 60,
  },
  controlButton: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#f0f0f0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  controlButtonActive: {
    backgroundColor: '#3B82F6',
  },
  hangUpButton: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#FF4444',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 30,
  },
  translationFeatureButton: {
    backgroundColor: '#3B82F6',
    paddingHorizontal: 32,
    paddingVertical: 12,
    borderRadius: 12,
  },
  translationFeatureText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  callEndedCard: {
    backgroundColor: '#f8f8f8',
    padding: 20,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 20,
  },
  callEndedText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#000',
    marginBottom: 8,
  },
  callEndedTime: {
    fontSize: 16,
    color: '#666',
  },
  addContactButton: {
    backgroundColor: '#fff',
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    alignItems: 'center',
    marginBottom: 30,
  },
  addContactButtonText: {
    fontSize: 16,
    color: '#000',
    fontWeight: '600',
  },
  ratingSection: {
    alignItems: 'center',
    marginBottom: 30,
  },
  ratingLabel: {
    fontSize: 16,
    color: '#000',
    marginBottom: 16,
  },
  starsContainer: {
    flexDirection: 'row',
    gap: 8,
  },
  costSection: {
    backgroundColor: '#f8f8f8',
    padding: 20,
    borderRadius: 12,
    marginBottom: 30,
  },
  costRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  costLabel: {
    fontSize: 16,
    color: '#000',
  },
  costValue: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#000',
  },
  backToHomeButton: {
    backgroundColor: '#3B82F6',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 40,
  },
  backToHomeButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '70%',
    minHeight: '50%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#000',
    flex: 1,
  },
  closeButton: {
    padding: 4,
  },
  languageList: {
    flex: 1,
  },
  languageItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f8f8f8',
  },
  languageItemSelected: {
    backgroundColor: '#f0f8ff',
  },
  languageItemText: {
    fontSize: 16,
    color: '#000',
    flex: 1,
  },
  languageItemTextSelected: {
    color: '#3B82F6',
    fontWeight: '600',
  },
  voiceItemContent: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  addVoiceContainer: {
    borderTopWidth: 2,
    borderTopColor: '#e0e0e0',
    backgroundColor: '#f8f8f8',
    paddingVertical: 16,
    paddingHorizontal: 20,
  },
  addVoiceButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: '#fff',
    borderRadius: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#3B82F6',
  },
  addVoiceButtonText: {
    fontSize: 16,
    color: '#3B82F6',
    fontWeight: '600',
    marginLeft: 12,
    flex: 1,
  },
  addVoiceDivider: {
    height: 8,
  },
});

export default CallScreen;

