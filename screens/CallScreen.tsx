import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert,
  Modal,
  FlatList,
  TextInput,
  Keyboard,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as Clipboard from 'expo-clipboard';
import { Audio } from 'expo-av';
import * as FileSystem from 'expo-file-system/legacy';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { STORAGE_KEYS, scopedKey } from '../config/constants';
import { callApi, creditsApi } from '../services/api';
import {
  configureCallAudio,
  startUserSpeechRecognition,
  stopCallAudio,
  processIncomingSpeech,
  isListening,
} from '../services/callAudioService';
import { translateText } from '../services/translationService';
import { speakTranslation, queueTranslation, getVoiceOptions } from '../services/ttsService';
import { createClonedVoice, isElevenLabsConfigured, speakWithElevenLabs } from '../services/elevenLabsService';
import { voiceApi } from '../services/api';
import { startRingtone, stopRingtone } from '../services/ringtoneService';
import { isRingtoneEnabled } from '../services/volumeService';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import { scale, verticalScale, moderateScale } from '../utils/responsive';

interface CallScreenProps {
  navigation: any;
  route?: any;
}

type CallState = 'dialer' | 'incoming' | 'outgoing' | 'active' | 'ended';
type AutoMuteStatus = 'listening' | 'speaking' | 'translating' | 'idle';

const CallScreen: React.FC<CallScreenProps> = ({ navigation, route }) => {
  const { user } = useAuth();
  const { colors, isDark } = useTheme();
  const userId = user?.id || 'anonymous';
  const [callState, setCallState] = useState<CallState>('dialer');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [callerName, setCallerName] = useState('');
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
  const [voiceTranslate, setVoiceTranslate] = useState(true);
  const [transcript, setTranscript] = useState<{ role: 'me' | 'them'; original: string; translated: string }[]>([]);
  const [isTranslating, setIsTranslating] = useState(false);
  const [autoMuteEnabled, setAutoMuteEnabled] = useState(true);
  const [autoMuteStatus, setAutoMuteStatus] = useState<AutoMuteStatus>('idle');
  const [isUserSpeaking, setIsUserSpeaking] = useState(false);
  const [isReceiverSpeaking, setIsReceiverSpeaking] = useState(false);
  const transcriptRef = useRef(transcript);
  const autoMuteRef = useRef(autoMuteEnabled);
  const translatingRef = useRef(false);
  const inputRef = useRef<TextInput>(null);
  const callIdRef = useRef<string>('');
  const [showAddContactModal, setShowAddContactModal] = useState(false);
  const [newContactName, setNewContactName] = useState('');
  const [newContactPhone, setNewContactPhone] = useState('');
  const [newContactCountry, setNewContactCountry] = useState('');
  const [isRecording, setIsRecording] = useState(false);
  const [recordingInstance, setRecordingInstance] = useState<Audio.Recording | null>(null);
  const [recordedVoices, setRecordedVoices] = useState<{ name: string; uri: string }[]>([]);
  const [playingVoiceUri, setPlayingVoiceUri] = useState<string | null>(null);
  const [recordingDuration, setRecordingDuration] = useState(0);
  const soundRef = useRef<Audio.Sound | null>(null);
  const recordingTimerRef = useRef<NodeJS.Timeout | null>(null);
  const RECORDED_VOICES_KEY = `@recorded_voices_${userId}`;

  // Subscription gate
  const [subStatus, setSubStatus] = useState<{ trialActive: boolean; isPremium: boolean } | null>(null);
  const canUseTranslation = subStatus?.trialActive || subStatus?.isPremium;

  useEffect(() => {
    creditsApi.getStatus().then((res: any) => {
      if (res?.data) {
        setSubStatus(res.data);
        if (!res.data.trialActive && !res.data.isPremium) {
          setTranslationEnabled(false);
        }
      }
    }).catch(() => {});
    AsyncStorage.getItem(`@settings_voice_translate_${userId}`).then((v) => {
      if (v !== null) setVoiceTranslate(JSON.parse(v));
    }).catch(() => {});
    AsyncStorage.getItem(`@settings_selected_voice_${userId}`).then((v) => {
      if (v) setSelectedVoice(v);
    }).catch(() => {});
  }, []);

  // Set phone number from navigation params or AsyncStorage
  useEffect(() => {
    if (route?.params?.phoneNumber) {
      setPhoneNumber(route.params.phoneNumber);
    } else {
      AsyncStorage.getItem(scopedKey(STORAGE_KEYS.DIAL_NUMBER, userId)).then((num) => {
        if (num) {
          setPhoneNumber(num);
          AsyncStorage.removeItem(scopedKey(STORAGE_KEYS.DIAL_NUMBER, userId));
        }
      });
    }
  }, [route?.params?.phoneNumber]);

  // Resolve caller name from saved contacts
  useEffect(() => {
    const loadContact = async () => {
      if (!phoneNumber) { setCallerName(''); return; }
      const raw = phoneNumber.replace(/[^0-9+]/g, '');
      try {
        const stored = await AsyncStorage.getItem(scopedKey(STORAGE_KEYS.MY_NUMBERS, userId));
        if (!stored) { setCallerName(formatPhoneNumber(raw)); return; }
        const numbers: any[] = JSON.parse(stored);
        for (const num of numbers) {
          if (!num.contacts) continue;
          const match = num.contacts.find((c: any) => {
            const clean = (c.phoneNumber || '').replace(/[^0-9+]/g, '');
            return clean === raw;
          });
          if (match) { setCallerName(match.name); return; }
        }
        setCallerName(formatPhoneNumber(raw));
      } catch {
        setCallerName(formatPhoneNumber(raw));
      }
    };
    loadContact();
  }, [phoneNumber]);

  // Keep refs in sync with state
  useEffect(() => {
    transcriptRef.current = transcript;
  }, [transcript]);

  useEffect(() => {
    autoMuteRef.current = autoMuteEnabled;
  }, [autoMuteEnabled]);

  // Load recorded voices and init audio on mount
  useEffect(() => {
    Audio.setAudioModeAsync({
      allowsRecordingIOS: false,
      playsInSilentModeIOS: true,
      staysActiveInBackground: false,
      interruptionModeIOS: 1,
      shouldDuckAndroid: true,
    });
    loadRecordedVoices();
    return () => {
      if (recordingTimerRef.current) {
        clearInterval(recordingTimerRef.current);
      }
    };
  }, []);

  // Start/stop speech recognition when call becomes active or auto-mute toggles
  useEffect(() => {
    if (callState === 'active' && autoMuteEnabled && translationEnabled) {
      configureCallAudio(translateFrom, translateTo, selectedVoice, voiceTranslate);
      startListeningForUser();
    }
    if (callState !== 'active' || !autoMuteEnabled || !translationEnabled) {
      if (isListening()) {
        stopCallAudio();
      }
      setAutoMuteStatus('idle');
      setIsUserSpeaking(false);
    }
    return () => {
      if (isListening()) {
        stopCallAudio();
      }
    };
  }, [callState, autoMuteEnabled, translationEnabled]);

  // Update audio config when languages/voice change mid-call
  useEffect(() => {
    if (callState === 'active') {
      configureCallAudio(translateFrom, translateTo, selectedVoice, voiceTranslate);
    }
  }, [translateFrom, translateTo, selectedVoice, voiceTranslate, callState]);

  const startListeningForUser = useCallback(async () => {
    configureCallAudio(translateFrom, translateTo, selectedVoice, voiceTranslate);
    await startUserSpeechRecognition({
      onUserSpeechStart: () => {
        setIsUserSpeaking(true);
        setAutoMuteStatus('speaking');
      },
      onUserSpeechEnd: () => {
        setIsUserSpeaking(false);
        setAutoMuteStatus('translating');
      },
      onTranscriptionComplete: (entry) => {
        setTranscript(prev => [...prev, entry]);
        setAutoMuteStatus('listening');
      },
      onTranslationStart: () => {
        setIsTranslating(true);
      },
      onTranslationEnd: () => {
        setIsTranslating(false);
        if (!isUserSpeaking) {
          setAutoMuteStatus('listening');
        }
      },
      onError: (error) => {
        console.warn('Speech recognition error:', error);
        setIsTranslating(false);
        setIsUserSpeaking(false);
        setAutoMuteStatus('listening');
      },
    });
  }, [translateFrom, translateTo, selectedVoice]);

  // Incoming speech mock samples for simulation
  const incomingMockPhrases = [
    { text: 'Hola, ¿cómo estás?', lang: 'Spanish' },
    { text: 'Bonjour, comment allez-vous?', lang: 'French' },
    { text: 'Guten Tag, wie geht es Ihnen?', lang: 'German' },
  ];

  const handleSimulateIncomingSpeech = useCallback(async () => {
    const phrase = incomingMockPhrases[Math.floor(Math.random() * incomingMockPhrases.length)];
    setIsTranslating(true);
    setIsReceiverSpeaking(true);
    await processIncomingSpeech(phrase.text, phrase.lang, {
      onTranscriptionComplete: (entry) => {
        setTranscript(prev => [...prev, entry]);
      },
      onTranslationStart: () => setIsTranslating(true),
      onTranslationEnd: () => setIsTranslating(false),
      onUserSpeechStart: () => {},
      onUserSpeechEnd: () => {},
      onError: (error) => console.warn('Incoming speech error:', error),
    });
    setIsTranslating(false);
    setIsReceiverSpeaking(false);
  }, []);

  const handleToggleTranslation = useCallback(() => {
    if (!translationEnabled && !canUseTranslation) {
      Alert.alert(
        'Translation Locked',
        'Your 72-hour trial has ended. Subscribe for $3/month to use voice translation.',
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Subscribe', onPress: () => navigation.navigate('Subscription') },
        ],
      );
      return;
    }
    setTranslationEnabled(!translationEnabled);
  }, [translationEnabled, canUseTranslation, navigation]);

  const handleToggleAutoMute = useCallback(() => {
    if (!autoMuteEnabled && !canUseTranslation) {
      Alert.alert(
        'Translation Locked',
        'Auto-mute requires voice translation. Your 72-hour trial has ended. Subscribe for $3/month to continue.',
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Subscribe', onPress: () => navigation.navigate('Subscription') },
        ],
      );
      return;
    }
    setAutoMuteEnabled(!autoMuteEnabled);
  }, [autoMuteEnabled, canUseTranslation, navigation]);

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

  // Available voices for text-to-speech — dynamically generated per language
  const voiceOptions = getVoiceOptions(translateTo);

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
    setPhoneNumber(prev => {
      const next = prev + number;
      const info = detectCountryFromNumber(next);
      if (info) {
        const withoutPlus = next.startsWith('+') ? next.slice(1) : next;
        const local = withoutPlus.slice(info.code.length);
        if (local.length > info.localDigits) return prev;
      }
      return next;
    });
  };

  const handleDeleteNumber = () => {
    Keyboard.dismiss();
    setPhoneNumber(prev => prev.slice(0, -1));
  };

  const contactCountryMap: Record<string, { country: string; flag: string; code: string; localDigits: number }> = {
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

  const detectedCountry = detectCountryFromNumber(phoneNumber);

  const handlePaste = async () => {
    const text = await Clipboard.getStringAsync();
    if (text) {
      const raw = text.replace(/[^0-9+]/g, '');
      const info = detectCountryFromNumber(raw);
      if (info) {
        const withoutPlus = raw.startsWith('+') ? raw.slice(1) : raw;
        const local = withoutPlus.slice(info.code.length);
        if (local.length > info.localDigits) {
          Alert.alert('Invalid Number', `${info.country} numbers have at most ${info.localDigits} digits`);
          return;
        }
      }
      setPhoneNumber(raw);
    }
  };

  const keypadRows: { key: string; letters?: string }[][] = [
    [{ key: '1', letters: '' }, { key: '2', letters: 'ABC' }, { key: '3', letters: 'DEF' }],
    [{ key: '4', letters: 'GHI' }, { key: '5', letters: 'JKL' }, { key: '6', letters: 'MNO' }],
    [{ key: '7', letters: 'PQRS' }, { key: '8', letters: 'TUV' }, { key: '9', letters: 'WXYZ' }],
    [{ key: '+', letters: '' }, { key: '0', letters: '+' }, { key: '⌫', letters: '' }],
  ];

  const handleCall = async () => {
    if (phoneNumber.length === 0) {
      Alert.alert('Error', 'Please enter a phone number');
      return;
    }
    const detected = detectCountryFromNumber(phoneNumber);
    if (!detected) {
      Alert.alert('Invalid Number', 'Please enter a valid international number starting with + and a country code');
      return;
    }
    const withoutPlus = phoneNumber.replace(/^\+/, '');
    const localDigits = withoutPlus.slice(detected.code.length);
    if (localDigits.length !== detected.localDigits) {
      Alert.alert('Invalid Number', `${detected.country} numbers must have exactly ${detected.localDigits} digits after +${detected.code}`);
      return;
    }
    setCallState('outgoing');
    try {
      const res = await callApi.initiateCall(phoneNumber, translateTo);
      callIdRef.current = res.data?.call?._id || res.data?.call?.id || '';
      setCallState('active');
    } catch (error: any) {
      const msg = (error.response?.data?.message || error.message || '').toLowerCase();
      // If error is about no active number, mock the call instead
      if (msg.includes('no active number') || msg.includes('active number')) {
        setCallState('active');
      } else {
        Alert.alert('Call Failed', msg || 'Call failed');
        setCallState('dialer');
      }
    }
  };

  const handleAddContact = () => {
    setNewContactName('');
    setNewContactPhone(phoneNumber);
    setNewContactCountry('');
    setShowAddContactModal(true);
  };

  const handleSaveContact = async () => {
    const num = newContactPhone || phoneNumber;
    if (!newContactName.trim() || !num) return;
    try {
      const stored = await AsyncStorage.getItem(scopedKey(STORAGE_KEYS.MY_NUMBERS, userId));
      const activeId = await AsyncStorage.getItem(scopedKey(STORAGE_KEYS.ACTIVE_NUMBER_ID, userId));
      const parsed: any[] = stored ? JSON.parse(stored) : [];
      const activeNumber = parsed.find((n: any) => n.id === activeId);
      const detected = detectCountryFromNumber(num);
      const contact = {
        id: Date.now().toString(),
        name: newContactName.trim(),
        country: detected?.country || (activeNumber?.country || ''),
        flag: detected?.flag || (activeNumber?.flag || ''),
        phoneNumber: num,
        lastCall: 'Just added',
      };
      if (!activeNumber) {
        if (parsed.length > 0) {
          parsed[0].contacts = parsed[0].contacts || [];
          parsed[0].contacts.push(contact);
        }
      } else {
        activeNumber.contacts = activeNumber.contacts || [];
        activeNumber.contacts.push(contact);
      }
      await AsyncStorage.setItem(scopedKey(STORAGE_KEYS.MY_NUMBERS, userId), JSON.stringify(parsed));
      setShowAddContactModal(false);
      Alert.alert('Saved', `"${newContactName.trim()}" added to contacts`);
    } catch (e) {
      Alert.alert('Error', 'Failed to save contact');
    }
  };

  const handleEndCall = async () => {
    stopRingtone();
    stopCallAudio();
    try {
      if (callIdRef.current) {
        await callApi.endCall(callIdRef.current);
      }
    } catch (e) {
      // ignore backend error for now
    }
    // Save call locally so it shows in history even when backend doesn't record it
    try {
      const existing = await AsyncStorage.getItem(scopedKey(STORAGE_KEYS.LOCAL_CALL_HISTORY, userId));
      const calls: any[] = existing ? JSON.parse(existing) : [];
      calls.unshift({
        id: 'local_' + Date.now(),
        receiverNumber: phoneNumber,
        callerNumber: phoneNumber,
        duration: callDuration,
        createdAt: new Date().toISOString(),
        type: 'outgoing',
      });
      // Keep only last 50
      await AsyncStorage.setItem(scopedKey(STORAGE_KEYS.LOCAL_CALL_HISTORY, userId), JSON.stringify(calls.slice(0, 50)));
    } catch (e) {
      // ignore
    }
    callIdRef.current = '';
    setCallState('ended');
    setCallDuration(0);
    setTranscript([]);
    setIsTranslating(false);
    setIsUserSpeaking(false);
    setAutoMuteStatus('idle');
  };

  const handleAnswerCall = () => {
    stopRingtone();
    setCallState('active');
  };

  const handleDeclineCall = () => {
    stopRingtone();
    setCallState('dialer');
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
    navigation.navigate('VoiceSettings');
  };

  const selectVoice = (voice: string) => {
    setSelectedVoice(voice);
  };

  const loadRecordedVoices = async () => {
    try {
      // Migrate from old shared key if present
      const oldKey = '@recorded_voices';
      if (oldKey !== RECORDED_VOICES_KEY) {
        const oldJson = await AsyncStorage.getItem(oldKey);
        if (oldJson) {
          await AsyncStorage.setItem(RECORDED_VOICES_KEY, oldJson);
          await AsyncStorage.removeItem(oldKey);
        }
      }
      const json = await AsyncStorage.getItem(RECORDED_VOICES_KEY);
      if (json) setRecordedVoices(JSON.parse(json));
    } catch {}
  };

  const saveRecordedVoices = async (voices: { name: string; uri: string }[]) => {
    await AsyncStorage.setItem(RECORDED_VOICES_KEY, JSON.stringify(voices));
    setRecordedVoices(voices);
  };

  const startRecording = async () => {
    try {
      const { granted } = await Audio.requestPermissionsAsync();
      if (!granted) {
        Alert.alert('Permission Required', 'Microphone access is needed to record your voice.');
        return;
      }
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
        staysActiveInBackground: false,
        interruptionModeIOS: 1,
        interruptionModeAndroid: 1,
        shouldDuckAndroid: true,
        playThroughEarpieceAndroid: false,
      });
      const { recording, status } = await Audio.Recording.createAsync(
        Audio.RecordingOptionsPresets.HIGH_QUALITY,
      );
      setRecordingInstance(recording);
      setRecordingDuration(0);
      setIsRecording(true);
      recordingTimerRef.current = setInterval(() => {
        setRecordingDuration((prev) => prev + 1);
      }, 1000);
    } catch (err: any) {
      Alert.alert('Recording Error', err?.message || 'Failed to start recording.');
    }
  };

  const stopRecording = async () => {
    if (!recordingInstance) return;
    if (recordingTimerRef.current) {
      clearInterval(recordingTimerRef.current);
      recordingTimerRef.current = null;
    }
    let localUri = '';
    let fileInfo: FileSystem.FileInfo | null = null;
    try {
      await recordingInstance.stopAndUnloadAsync();
      localUri = recordingInstance.getURI() || '';
      if (!localUri) {
        Alert.alert('Error', 'Recording produced no audio file. Try again.');
        setRecordingInstance(null);
        setIsRecording(false);
        setRecordingDuration(0);
        return;
      }

      fileInfo = await FileSystem.getInfoAsync(localUri);
      if (!fileInfo.exists || fileInfo.size === 0) {
        Alert.alert('Empty Recording', 'No audio data captured. Please check microphone and try again.');
        setRecordingInstance(null);
        setIsRecording(false);
        setRecordingDuration(0);
        return;
      }

      // Quick playback test to verify file is playable
      try {
        const { sound: testSound } = await Audio.Sound.createAsync(
          { uri: localUri },
          { shouldPlay: true },
        );
        // Stop after 500ms to avoid disturbing the user
        setTimeout(async () => {
          await testSound.stopAsync();
          await testSound.unloadAsync();
        }, 500);
      } catch (testErr: any) {
        Alert.alert('Playback Test Failed', `File exists but cannot play: ${testErr?.message}`);
        setRecordingInstance(null);
        setIsRecording(false);
        setRecordingDuration(0);
        return;
      }

      const name = `My Voice ${recordedVoices.length + 1}`;

      const result = await voiceApi.upload(localUri, name);
      const playUri = result?.url || localUri;

      const newVoices = [...recordedVoices, { name, uri: playUri }];
      await saveRecordedVoices(newVoices);
      setRecordingInstance(null);
      setIsRecording(false);
      setRecordingDuration(0);

      if (result) {
        Alert.alert('Saved', `"${name}" uploaded! (${(fileInfo.size / 1024).toFixed(1)} KB)`);
      } else {
        Alert.alert('Saved', `"${name}" saved locally (upload to backend failed).`);
      }

      if (isElevenLabsConfigured()) {
        const voiceId = await createClonedVoice(localUri, name);
        if (voiceId) {
          Alert.alert('Done', `"${name}" cloned successfully! Select it in the voice list.`);
        }
      }
    } catch (err: any) {
      if (localUri) {
        const name = `My Voice ${recordedVoices.length + 1}`;
        const newVoices = [...recordedVoices, { name, uri: localUri }];
        await saveRecordedVoices(newVoices);
        Alert.alert('Saved Locally', `"${name}" saved on device (server upload failed).`);
      } else {
        Alert.alert('Save Error', err?.message || 'Failed to save recording.');
      }
      setIsRecording(false);
      setRecordingDuration(0);
      setRecordingInstance(null);
    }
  };

  const playRecordedVoice = async (uri: string) => {
    try {
      if (playingVoiceUri === uri) {
        if (soundRef.current) {
          await soundRef.current.stopAsync();
          await soundRef.current.unloadAsync();
          soundRef.current = null;
        }
        setPlayingVoiceUri(null);
        return;
      }

      if (soundRef.current) {
        await soundRef.current.stopAsync();
        await soundRef.current.unloadAsync();
        soundRef.current = null;
      }

      await Audio.setAudioModeAsync({
        allowsRecordingIOS: false,
        playsInSilentModeIOS: true,
        staysActiveInBackground: false,
        interruptionModeIOS: 1,
        shouldDuckAndroid: true,
      });

      const sound = new Audio.Sound();
      soundRef.current = sound;

      let playStarted = false;
      sound.setOnPlaybackStatusUpdate((status) => {
        if (status.isLoaded) {
          if (!playStarted && status.isPlaying) {
            playStarted = true;
          }
          if (playStarted && !status.isPlaying) {
            setPlayingVoiceUri(null);
            if (soundRef.current === sound) {
              soundRef.current = null;
            }
            sound.unloadAsync();
          }
        }
      });

      await sound.loadAsync({ uri }, { shouldPlay: true });
      setPlayingVoiceUri(uri);
    } catch (err: any) {
      Alert.alert('Playback Error', err?.message || 'Could not play recording.');
    }
  };

  const deleteRecordedVoice = async (uri: string) => {
    const filtered = recordedVoices.filter((v) => v.uri !== uri);
    await saveRecordedVoices(filtered);
    if (selectedVoice === `Recorded: ${uri}`) {
      setSelectedVoice('Default');
    }
  };

  const useRecordedVoice = (voice: { name: string; uri: string }) => {
    setSelectedVoice(`${voice.name} (Recorded)`);
  };

  const playVoiceSample = async (voiceName: string) => {
    try {
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: false,
        playsInSilentModeIOS: true,
        staysActiveInBackground: false,
        interruptionModeIOS: 1,
        shouldDuckAndroid: true,
      });
      const ok = await speakWithElevenLabs('Hello, this is my voice.', voiceName);
      if (!ok) {
        await speakTranslation('Hello, this is my voice.', 'English', voiceName);
      }
    } catch (e: any) {
      Alert.alert('Error', e?.message || 'Could not play voice sample.');
    }
  };

  const renderLanguageModal = () => (
    <Modal
      visible={showLanguageModal}
      transparent={true}
      animationType="slide"
      onRequestClose={() => setShowLanguageModal(false)}
    >
      <View style={[styles.modalOverlay, { backgroundColor: colors.overlay }]}>
        <View style={[styles.modalContent, { backgroundColor: colors.card }]}>
          <View style={styles.modalHeader}>
            <Text style={[styles.modalTitle, { color: colors.text }]}>
              Select {selectedLanguageType === 'from' ? 'Translate them to' : 'Translate me to'}
            </Text>
            <TouchableOpacity
              style={styles.closeButton}
              onPress={() => setShowLanguageModal(false)}
            >
              <Ionicons name="close" size={24} color={colors.textSecondary} />
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
                  <Ionicons name="checkmark" size={20} color={colors.primary} />
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
      <View style={[styles.modalOverlay, { backgroundColor: colors.overlay }]}>
        <View style={[styles.modalContent, { backgroundColor: colors.card }]}>
          <View style={styles.modalHeader}>
            <Text style={[styles.modalTitle, { color: colors.text }]}>Select Voice</Text>
            <TouchableOpacity
              style={styles.closeButton}
              onPress={() => setShowVoiceModal(false)}
            >
              <Ionicons name="close" size={24} color={colors.textSecondary} />
            </TouchableOpacity>
          </View>
          
          <FlatList
            data={[
              ...voiceOptions.map((v) => ({ type: 'preset' as const, name: v.key, label: v.label })),
              ...recordedVoices.map((v) => ({ type: 'recorded' as const, name: v.name, uri: v.uri })),
            ]}
            keyExtractor={(item, i) => `${item.type}-${i}`}
            renderItem={({ item }) => {
              if (item.type === 'preset') {
                return (
                  <View style={[styles.languageItem, styles.recordedVoiceItem]}>
                    <TouchableOpacity
                      style={styles.voiceItemContent}
                      onPress={() => selectVoice(item.name)}
                    >
                      <Ionicons
                        name="volume-high"
                        size={20}
                        color={item.name === selectedVoice ? colors.primary : colors.textSecondary}
                      />
                      <Text style={[
                        styles.languageItemText,
                        { flex: 1 },
                        item.name === selectedVoice && styles.languageItemTextSelected,
                      ]}>
                        {(item as any).label || item.name}
                      </Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={styles.voicePlayBtn}
                      onPress={() => playVoiceSample(item.name)}
                    >
                      <Ionicons
                        name="play-circle"
                        size={28}
                        color={colors.primary}
                      />
                    </TouchableOpacity>
                    {item.name === selectedVoice && (
                      <Ionicons name="checkmark" size={20} color={colors.primary} style={{ marginLeft: 4 }} />
                    )}
                  </View>
                );
              }
              const isActive = selectedVoice.includes(item.name);
              return (
                <View style={[styles.languageItem, styles.recordedVoiceItem]}>
                  <TouchableOpacity
                    style={styles.voiceItemContent}
                    onPress={() => useRecordedVoice(item)}
                  >
                    <Ionicons
                      name="volume-high"
                      size={20}
                      color={isActive || playingVoiceUri === item.uri ? colors.primary : colors.textSecondary}
                    />
                    <Text style={[
                      styles.languageItemText,
                      { flex: 1 },
                      isActive && styles.languageItemTextSelected,
                    ]}>
                      {item.name}
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.voicePlayBtn}
                    onPress={() => playRecordedVoice(item.uri!)}
                  >
                    <Ionicons
                      name={playingVoiceUri === item.uri ? 'pause-circle' : 'play-circle'}
                      size={28}
                      color={playingVoiceUri === item.uri ? colors.primary : colors.textSecondary}
                    />
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.voiceDeleteBtn}
                    onPress={() => deleteRecordedVoice(item.uri!)}
                  >
                    <Ionicons name="trash-outline" size={20} color={colors.danger} />
                  </TouchableOpacity>
                </View>
              );
            }}
            style={styles.languageList}
            ListFooterComponent={() => (
              <View style={styles.addVoiceContainer}>
                <TouchableOpacity
                  style={styles.addVoiceButton}
                  onPress={() => {
                    if (isRecording) {
                      stopRecording();
                    } else {
                      startRecording();
                    }
                  }}
                >
                  <Ionicons
                    name={isRecording ? 'stop-circle' : 'mic-circle'}
                    size={24}
                    color={isRecording ? colors.danger : colors.primary}
                  />
                  <Text style={[styles.addVoiceButtonText, isRecording && { color: colors.danger }]}>
                    {isRecording ? `Stop Recording (${formatTime(recordingDuration)})` : 'Record Your Voice'}
                  </Text>
                </TouchableOpacity>

                <View style={styles.addVoiceDivider} />

                <TouchableOpacity
                  style={styles.addVoiceButton}
                  onPress={() => {
                    setShowVoiceModal(false);
                    Alert.alert('Celebrity Voices', 'Celebrity voice packs coming soon!');
                  }}
                >
                  <Ionicons name="star" size={24} color={colors.primary} />
                  <Text style={styles.addVoiceButtonText}>Search Celebrity Voice</Text>
                </TouchableOpacity>
              </View>
            )}
          />
        </View>
      </View>
    </Modal>
  );

  const renderIncomingCall = () => (
    <SafeAreaView style={styles.incomingContainer}>
      <View style={styles.incomingContent}>
        <View style={styles.incomingAvatar}>
          <Ionicons name="person" size={64} color="#fff" />
        </View>
        <Text style={styles.incomingName}>{callerName || 'Incoming Call'}</Text>
        <Text style={styles.incomingStatus}>Incoming Call...</Text>

        <View style={styles.incomingActions}>
          <TouchableOpacity style={styles.declineBtn} onPress={handleDeclineCall}>
            <View style={styles.declineCircle}>
              <Ionicons name="call" size={28} color="#fff" style={{ transform: [{ rotate: '135deg' }] }} />
            </View>
            <Text style={styles.incomingActionLabel}>Decline</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.answerBtn} onPress={handleAnswerCall}>
            <View style={styles.answerCircle}>
              <Ionicons name="call" size={28} color="#fff" />
            </View>
            <Text style={styles.incomingActionLabel}>Answer</Text>
          </TouchableOpacity>
        </View>
      </View>
    </SafeAreaView>
  );

  const renderAddContactModal = () => (
    <Modal
      visible={showAddContactModal}
      animationType="slide"
      transparent={false}
      onRequestClose={() => setShowAddContactModal(false)}
    >
      <SafeAreaView style={[styles.addContactFullModal, { backgroundColor: colors.background }]}>
        <View style={styles.addContactFullHeader}>
          <View style={{ width: 32 }} />
          <Text style={styles.addContactFullTitle}>Add Contact</Text>
          <TouchableOpacity onPress={() => setShowAddContactModal(false)} style={styles.addContactFullClose}>
              <Ionicons name="close" size={22} color={colors.textSecondary} />
          </TouchableOpacity>
        </View>

        <View style={styles.addContactForm}>
          <Text style={styles.addContactLabel}>Full Name</Text>
          <View style={styles.addContactPhoneRow}>
            <View style={{ width: 34, marginRight: 10 }} />
            <TextInput
              style={styles.addContactInput}
              placeholder="e.g. John Doe"
              placeholderTextColor={colors.textMuted}
              value={newContactName}
              onChangeText={setNewContactName}
              autoFocus
            />
          </View>

          <Text style={styles.addContactLabel}>Phone Number</Text>
          <View style={styles.addContactPhoneRow}>
            {detectCountryFromNumber(newContactPhone) && (
              <Text style={styles.addContactFlag}>{detectCountryFromNumber(newContactPhone)!.flag}</Text>
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
                  const withoutPlus = raw.startsWith('+') ? raw.slice(1) : raw;
                  const local = withoutPlus.slice(info.code.length);
                  if (local.length > info.localDigits) return;
                }
                setNewContactPhone(raw);
              }}
              keyboardType="phone-pad"
            />
          </View>

          <TouchableOpacity
            style={[
              styles.addContactSaveContactBtn,
              (!newContactName.trim() || !newContactPhone) && styles.addContactSaveContactBtnDisabled,
            ]}
            onPress={handleSaveContact}
            disabled={!newContactName.trim() || !newContactPhone}
          >
            <Ionicons name="person-add" size={20} color="#fff" style={{ marginRight: 8 }} />
            <Text style={styles.addContactSaveContactText}>Save Contact</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    </Modal>
  );

  const renderDialer = () => (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.headerBtn}>
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.text }]}>Dialer</Text>
        <TouchableOpacity onPress={handleVoiceChange} style={styles.headerBtn}>
          <Ionicons name="volume-high" size={24} color={colors.primary} />
        </TouchableOpacity>
      </View>

      {/* Number Display */}
      <View style={styles.numberSection}>
        <View style={styles.numberInputRow}>
          {detectedCountry && (
            <Text style={styles.dialerFlag}>{detectedCountry.flag}</Text>
          )}
          <TextInput
            ref={inputRef}
            style={[styles.phoneNumber, { color: colors.text }]}
            value={formatPhoneNumber(phoneNumber)}
            onChangeText={(t) => {
              const raw = t.replace(/[^0-9+]/g, '');
              const info = detectCountryFromNumber('+' + raw.replace(/^\+/, ''));
              if (info) {
                const withoutPlus = raw.startsWith('+') ? raw.slice(1) : raw;
                const local = withoutPlus.slice(info.code.length);
                if (local.length > info.localDigits) return;
              }
              setPhoneNumber(raw);
            }}
            placeholder="+234 801 234 5678"
            placeholderTextColor={colors.textMuted}
            keyboardType="phone-pad"
            showSoftInputOnFocus={false}
            multiline={false}
          />
          <TouchableOpacity onPress={handlePaste} style={styles.pasteBtn}>
            <Ionicons name="clipboard-outline" size={20} color={colors.primary} />
          </TouchableOpacity>
          {phoneNumber.length > 0 && (
            <TouchableOpacity onPress={() => setPhoneNumber('')} style={styles.clearBtn}>
              <Ionicons name="close-circle" size={22} color={colors.textMuted} />
            </TouchableOpacity>
          )}
        </View>
        {detectedCountry && (
          <Text style={[styles.dialerCountryName, { color: colors.textSecondary }]}>{detectedCountry.country}</Text>
        )}
        <View style={styles.languageChips}>
          <TouchableOpacity style={styles.langChip} onPress={() => handleLanguageSelect('to')}>
            <Ionicons name="language" size={14} color={colors.primary} />
            <Text style={styles.langChipText}>{translateTo}</Text>
            <Ionicons name="chevron-down" size={12} color={colors.primary} />
          </TouchableOpacity>
          <TouchableOpacity style={styles.langChip} onPress={() => handleLanguageSelect('from')}>
            <Text style={styles.langChipLabel}>Them:</Text>
            <Text style={styles.langChipText}>{translateFrom}</Text>
            <Ionicons name="chevron-down" size={12} color={colors.primary} />
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.langChip, translationEnabled && styles.langChipActive, !canUseTranslation && !translationEnabled && styles.langChipLocked]}
            onPress={handleToggleTranslation}
          >
            <Ionicons
              name={translationEnabled ? 'mic' : 'mic-off'}
              size={14}
              color={translationEnabled ? colors.success : colors.textMuted}
            />
            <Text style={[styles.langChipText, !translationEnabled && { color: colors.textMuted }]}>
              {translationEnabled ? 'ON' : 'OFF'}
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Keypad */}
      <View style={styles.keypadSection}>
        {keypadRows.map((row, idx) => (
          <View key={idx} style={styles.keypadRow}>
            {row.map((item) => (
              item.key === '⌫' ? (
                <TouchableOpacity
                  key={item.key}
                  style={[styles.keypadBtn, { backgroundColor: isDark ? '#2C2C2E' : '#f5f5f5' }]}
                  onPress={handleDeleteNumber}
                  activeOpacity={0.4}
                >
                  <Ionicons name="backspace-outline" size={26} color={colors.text} />
                </TouchableOpacity>
              ) : (
                <TouchableOpacity
                  key={item.key}
                  style={[styles.keypadBtn, { backgroundColor: isDark ? '#2C2C2E' : '#f5f5f5' }]}
                  onPress={() => handleNumberPress(item.key)}
                  activeOpacity={0.4}
                >
                  <Text style={[styles.keypadBtnMain, { color: colors.text }]}>{item.key}</Text>
                  {item.letters ? (
                    <Text style={[styles.keypadBtnSub, { color: colors.textMuted }]}>{item.letters}</Text>
                  ) : (
                    <Text style={[styles.keypadBtnSub, { color: colors.textMuted }]}> </Text>
                  )}
                </TouchableOpacity>
              )
            ))}
          </View>
        ))}
      </View>

      {/* Call Button */}
      <View style={styles.callBtnContainer}>
        <TouchableOpacity style={styles.callBtn} onPress={handleCall} activeOpacity={0.8}>
          <Ionicons name="call" size={28} color="#fff" />
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.testCallBtn}
          onPress={() => {
            if (isRingtoneEnabled()) startRingtone();
            setCallState('incoming');
          }}
        >
          <Ionicons name="call-outline" size={20} color={colors.textSecondary} />
          <Text style={styles.testCallBtnText}>Test Incoming</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );

  const renderInCall = () => (
    <View style={[styles.inCallContainer, { backgroundColor: colors.background }]}>
      {/* Gradient overlay - dark modern background */}
      <View style={styles.inCallBgTop} />
      <View style={styles.inCallBgBottom} />

      {/* Floating Back Button */}
      <TouchableOpacity 
        style={styles.floatingBackButton} 
        onPress={() => navigation.goBack()}
      >
        <Ionicons name="chevron-down" size={24} color={colors.text} />
      </TouchableOpacity>

      {/* Caller Info */}
      <View style={styles.callerInfo}>
        <View style={styles.callerAvatar}>
          <Ionicons name="person" size={48} color={colors.primary} />
        </View>
        <Text style={[styles.callerName, { color: colors.text }]}>{callerName}</Text>
        <Text style={[styles.callDuration, { color: colors.textMuted }]}>{formatTime(callDuration)}</Text>
      </View>

      {/* Translation Flow Visualization */}
      {!translationEnabled ? (
        <View style={styles.flowColumn}>
          <View style={styles.translationOffBadge}>
            <Ionicons name="mic-off" size={16} color={colors.danger} />
            <Text style={styles.translationOffText}>Translation is off</Text>
          </View>
        </View>
      ) : (
        <View style={styles.flowColumn}>
          {isReceiverSpeaking ? (
            <View style={styles.flowContainer}>
              <View style={[styles.flowStep, styles.flowStepActive]}>
                <Ionicons name="mic" size={16} color={colors.warning} />
                <Text style={[styles.flowLabel, styles.flowLabelActive]}>They Speak</Text>
              </View>
              <View style={styles.flowArrow}>
                <Ionicons name="arrow-forward" size={14} color={colors.textSecondary} />
              </View>
              <View style={[styles.flowStep, styles.flowStepActive]}>
                <Ionicons name="sync" size={16} color={colors.warning} />
                <Text style={[styles.flowLabel, styles.flowLabelActive]}>Translate</Text>
              </View>
              <View style={styles.flowArrow}>
                <Ionicons name="arrow-forward" size={14} color={colors.textSecondary} />
              </View>
              <View style={[styles.flowStep, styles.flowStepActive]}>
                <Ionicons name="volume-high" size={16} color={colors.primary} />
                <Text style={[styles.flowLabel, styles.flowLabelActive]}>You Hear</Text>
              </View>
            </View>
          ) : autoMuteEnabled ? (
            <View style={styles.flowContainer}>
              <View style={[styles.flowStep, autoMuteStatus === 'speaking' && styles.flowStepActive]}>
                <Ionicons name="mic" size={16} color={autoMuteStatus === 'speaking' ? colors.primary : colors.textSecondary} />
                <Text style={[styles.flowLabel, autoMuteStatus === 'speaking' && styles.flowLabelActive]}>Speak</Text>
              </View>
              <View style={[styles.flowArrow, (autoMuteStatus === 'speaking' || autoMuteStatus === 'translating') && styles.flowArrowActive]}>
                <Ionicons name="arrow-forward" size={14} color={colors.textSecondary} />
              </View>
              <View style={[styles.flowStep, autoMuteStatus === 'speaking' && styles.flowStepActive]}>
                <Ionicons name="mic-off" size={16} color={autoMuteStatus === 'speaking' ? colors.danger : colors.textSecondary} />
                <Text style={[styles.flowLabel, autoMuteStatus === 'speaking' && styles.flowLabelActive]}>Mute</Text>
              </View>
              <View style={[styles.flowArrow, (autoMuteStatus === 'speaking' || autoMuteStatus === 'translating') && styles.flowArrowActive]}>
                <Ionicons name="arrow-forward" size={14} color={colors.textSecondary} />
              </View>
              <View style={[styles.flowStep, autoMuteStatus === 'translating' && styles.flowStepActive]}>
                <Ionicons name="sync" size={16} color={autoMuteStatus === 'translating' ? colors.warning : colors.textSecondary} />
                <Text style={[styles.flowLabel, autoMuteStatus === 'translating' && styles.flowLabelActive]}>Translate</Text>
              </View>
              <View style={[styles.flowArrow, (autoMuteStatus === 'translating' || autoMuteStatus === 'listening') && styles.flowArrowActive]}>
                <Ionicons name="arrow-forward" size={14} color={colors.textSecondary} />
              </View>
              <View style={[styles.flowStep, autoMuteStatus === 'listening' && styles.flowStepActive]}>
                <Ionicons name="volume-high" size={16} color={autoMuteStatus === 'listening' ? colors.success : colors.textSecondary} />
                <Text style={[styles.flowLabel, autoMuteStatus === 'listening' && styles.flowLabelActive]}>Hear</Text>
              </View>
            </View>
          ) : (
            <View style={styles.flowContainer}>
              <View style={[styles.flowStep, autoMuteStatus === 'speaking' && styles.flowStepActive]}>
                <Ionicons name="mic" size={16} color={autoMuteStatus === 'speaking' ? colors.primary : colors.textSecondary} />
                <Text style={[styles.flowLabel, autoMuteStatus === 'speaking' && styles.flowLabelActive]}>Speak</Text>
              </View>
              <View style={styles.flowArrow}>
                <Ionicons name="arrow-forward" size={14} color={colors.textSecondary} />
              </View>
              <View style={[styles.flowStep, autoMuteStatus === 'translating' && styles.flowStepActive]}>
                <Ionicons name="sync" size={16} color={autoMuteStatus === 'translating' ? colors.warning : colors.textSecondary} />
                <Text style={[styles.flowLabel, autoMuteStatus === 'translating' && styles.flowLabelActive]}>Translate</Text>
              </View>
              <View style={styles.flowArrow}>
                <Ionicons name="arrow-forward" size={14} color={colors.textSecondary} />
              </View>
              <View style={[styles.flowStep, autoMuteStatus === 'listening' && styles.flowStepActive]}>
                <Ionicons name="volume-high" size={16} color={autoMuteStatus === 'listening' ? colors.success : colors.textSecondary} />
                <Text style={[styles.flowLabel, autoMuteStatus === 'listening' && styles.flowLabelActive]}>Hear</Text>
              </View>
            </View>
          )}
        </View>
      )}

      {/* Translation Status Message */}
      {!translationEnabled ? (
        <View style={styles.statusMessageBar}>
          <Ionicons name="mic-off-circle" size={16} color={colors.danger} />
          <Text style={styles.statusMessageText}>
            Translation disabled — no speech recognition or translation
          </Text>
        </View>
      ) : autoMuteEnabled ? (
        <View style={styles.statusMessageBar}>
          <Ionicons
            name={
              autoMuteStatus === 'speaking' ? 'mic-off-circle' :
              autoMuteStatus === 'translating' ? 'sync-circle' :
              'checkmark-circle'
            }
            size={16}
            color={
              autoMuteStatus === 'speaking' ? colors.danger :
              autoMuteStatus === 'translating' ? colors.warning :
              colors.success
            }
          />
          <Text style={styles.statusMessageText}>
            {autoMuteStatus === 'speaking' ? 'You are speaking — muted, translating...' :
             autoMuteStatus === 'translating' ? 'Translating your speech...' :
             'Auto-mute active — speak to translate'}
          </Text>
        </View>
      ) : (
        <View style={styles.statusMessageBar}>
          <Ionicons name="language" size={16} color={colors.primary} />
          <Text style={styles.statusMessageText}>
            Translation active — auto-mute is off
          </Text>
        </View>
      )}

      {/* Translation Direction */}
      <TouchableOpacity
        style={styles.translationDirectionBtn}
        onPress={() => { setSelectedLanguageType('to'); setShowLanguageModal(true); }}
      >
        <Ionicons name="language" size={14} color="#fff" />
        <Text style={styles.translationDirectionText}>
          {translateFrom} → {translateTo}
        </Text>
        <Ionicons name="chevron-down" size={12} color="rgba(255,255,255,0.6)" />
      </TouchableOpacity>

      {/* Live Translation Transcript */}
      <View style={styles.transcriptContainer}>
        <View style={styles.transcriptHeader}>
          <Ionicons name="chatbubbles" size={14} color={colors.textMuted} />
          <Text style={styles.transcriptTitle}>Live Translation</Text>
          {isTranslating && <Text style={styles.translatingDot}>●</Text>}
        </View>
        <FlatList
          data={transcript}
          keyExtractor={(_, i) => i.toString()}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <View style={styles.transcriptEmpty}>
              <Ionicons name="chatbubble-ellipses-outline" size={32} color={colors.text} />
              <Text style={styles.transcriptEmptyText}>
                Translations appear here
              </Text>
            </View>
          }
          renderItem={({ item }) => (
            <View style={styles.transcriptBubble}>
              <View style={styles.transcriptBubbleHeader}>
                <Ionicons
                  name={item.role === 'me' ? 'person' : 'person-circle'}
                  size={12}
                  color={item.role === 'me' ? colors.primary : colors.warning}
                />
                <Text style={[styles.transcriptBubbleRole, item.role === 'me' ? styles.transcriptBubbleRoleMine : styles.transcriptBubbleRoleTheirs]}>
                  {item.role === 'me' ? 'You' : callerName}
                </Text>
                <Text style={styles.transcriptBubbleLang}>
                  ({item.role === 'me' ? translateFrom : translateTo})
                </Text>
              </View>
              <Text style={styles.transcriptBubbleOriginal}>{item.original}</Text>
              <View style={styles.transcriptBubbleDivider} />
              <Text style={styles.transcriptBubbleLangLabel}>
                → {item.role === 'me' ? translateTo : translateFrom}
              </Text>
              <View style={styles.transcriptBubbleTransRow}>
                <Ionicons name="arrow-forward" size={10} color={colors.primary} />
                <Text style={styles.transcriptBubbleTranslated}>{item.translated}</Text>
              </View>
            </View>
          )}
        />
      </View>

      {/* Call Controls */}
      <View style={styles.callControls}>
        <TouchableOpacity
          style={styles.controlButton}
          onPress={() => setIsMuted(!isMuted)}
        >
          <View style={[styles.controlIconWrap, isMuted && styles.controlIconWrapActive]}>
            <Ionicons name={isMuted ? "mic-off" : "mic"} size={22} color={isMuted ? "#fff" : colors.text} />
          </View>
          <Text style={[styles.controlLabel, { color: colors.textSecondary }, isMuted && styles.controlLabelActive]}>{isMuted ? 'Muted' : 'Mute'}</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.controlButton}
          onPress={() => setIsSpeaker(!isSpeaker)}
        >
          <View style={[styles.controlIconWrap, isSpeaker && styles.controlIconWrapActive]}>
            <Ionicons name="volume-high" size={22} color={isSpeaker ? "#fff" : colors.text} />
          </View>
          <Text style={[styles.controlLabel, { color: colors.textSecondary }, isSpeaker && styles.controlLabelActive]}>{isSpeaker ? 'Speaker' : 'Speaker'}</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.controlButton}
          onPress={handleToggleAutoMute}
        >
          <View style={[styles.controlIconWrap, autoMuteEnabled && styles.controlIconWrapActive]}>
            <Ionicons name="flash" size={22} color={autoMuteEnabled ? "#fff" : colors.text} />
          </View>
          <Text style={[styles.controlLabel, { color: colors.textSecondary }, autoMuteEnabled && styles.controlLabelActive]}>Auto-Mute</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.controlButton}
          onPress={handleToggleTranslation}
        >
          <View style={[styles.controlIconWrap, translationEnabled && styles.controlIconWrapActive]}>
            <Ionicons name="language" size={22} color={translationEnabled ? "#fff" : colors.text} />
          </View>
          <Text style={[styles.controlLabel, { color: colors.textSecondary }, translationEnabled && styles.controlLabelActive]}>Translate</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.controlButton}
          onPress={handleSimulateIncomingSpeech}
          disabled={isTranslating}
        >
          <View style={[styles.controlIconWrap, isTranslating && styles.controlIconWrapActive]}>
            <Ionicons name="language" size={22} color={isTranslating ? "#fff" : colors.text} />
          </View>
          <Text style={[styles.controlLabel, { color: colors.textSecondary }, isTranslating && styles.controlLabelActive]}>Test</Text>
        </TouchableOpacity>
      </View>

      {/* Hang Up Button */}
      <TouchableOpacity style={styles.hangUpButton} onPress={handleEndCall}>
        <Ionicons name="call" size={28} color="#fff" />
      </TouchableOpacity>
    </View>
  );

  const renderCallSummary = () => (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
      <ScrollView style={styles.content}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => setCallState('dialer')}>
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <TouchableOpacity>
          <Ionicons name="information-circle" size={24} color={colors.primary} />
        </TouchableOpacity>
      </View>

      <Text style={styles.title}>Call Summary</Text>

      {/* Call Ended Card */}
      <View style={styles.callEndedCard}>
        <Text style={styles.callEndedText}>Call Ended</Text>
        <Text style={styles.callEndedTime}>15:42</Text>
      </View>

      {/* Add Contact Button */}
      <TouchableOpacity style={styles.addContactButton} onPress={handleAddContact}>
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
                color={colors.primary}
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
    </SafeAreaView>
  );

  if (callState === 'incoming') {
    return renderIncomingCall();
  }

  if (callState === 'active') {
    return renderInCall();
  }

  return (
    <>
      {renderDialer()}
      {renderLanguageModal()}
      {renderVoiceModal()}
      {renderAddContactModal()}
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
    paddingHorizontal: scale(20),
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: verticalScale(10),
    paddingHorizontal: scale(20),
  },
  headerBtn: {
    width: scale(40),
    height: verticalScale(40),
    borderRadius: scale(20),
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    fontSize: moderateScale(32),
    fontWeight: 'bold',
    color: '#000',
  },
  headerTitle: {
    fontSize: moderateScale(18),
    fontWeight: '700',
    color: '#111',
  },

  // ── Number Display ──
  numberSection: {
    paddingHorizontal: scale(24),
    paddingTop: verticalScale(12),
    paddingBottom: verticalScale(8),
  },
  numberInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8f9fa',
    borderRadius: scale(16),
    paddingHorizontal: scale(16),
    paddingVertical: verticalScale(4),
    marginBottom: verticalScale(8),
    borderWidth: 1,
    borderColor: '#e8eaed',
  },
  phoneNumber: {
    flex: 1,
    fontSize: moderateScale(24),
    fontWeight: '700',
    color: '#111',
    paddingVertical: verticalScale(14),
    textAlign: 'center',
  },
  dialerFlag: {
    fontSize: moderateScale(22),
    marginRight: scale(8),
  },
  dialerCountryName: {
    fontSize: moderateScale(12),
    color: '#666',
    textAlign: 'center',
    marginBottom: verticalScale(10),
  },
  pasteBtn: {
    padding: scale(6),
    marginRight: scale(2),
  },
  clearBtn: {
    padding: scale(4),
  },
  languageChips: {
    flexDirection: 'row',
    gap: scale(8),
    justifyContent: 'center',
  },
  langChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f0f4ff',
    paddingHorizontal: scale(12),
    paddingVertical: verticalScale(7),
    borderRadius: scale(16),
    gap: scale(5),
  },
  langChipActive: {
    backgroundColor: '#E8F5E9',
  },
  langChipLocked: {
    opacity: 0.5,
    borderColor: '#EF4444',
    borderWidth: 1,
  },
  langChipLabel: {
    fontSize: moderateScale(12),
    color: '#999',
    fontWeight: '500',
  },
  langChipText: {
    fontSize: moderateScale(12),
    color: '#3B82F6',
    fontWeight: '600',
  },

  // ── Keypad ──
  keypadSection: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: scale(24),
    paddingBottom: verticalScale(10),
  },
  keypadRow: {
    flexDirection: 'row',
    justifyContent: 'space-evenly',
    marginBottom: verticalScale(10),
  },
  keypadBtn: {
    width: scale(72),
    height: verticalScale(72),
    borderRadius: scale(36),
    backgroundColor: '#f0f2f5',
    justifyContent: 'center',
    alignItems: 'center',
  },
  keypadBtnMain: {
    fontSize: moderateScale(28),
    fontWeight: '600',
    color: '#111',
    lineHeight: verticalScale(32),
  },
  keypadBtnSub: {
    fontSize: moderateScale(8),
    color: '#888',
    letterSpacing: 0.8,
    marginTop: 1,
  },

  // ── Call Button ──
  callBtnContainer: {
    alignItems: 'center',
    paddingBottom: verticalScale(34),
    paddingTop: verticalScale(8),
  },
  callBtn: {
    width: scale(72),
    height: verticalScale(72),
    borderRadius: scale(36),
    backgroundColor: '#34C759',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#34C759',
    shadowOffset: { width: 0, height: verticalScale(4) },
    shadowOpacity: 0.35,
    shadowRadius: scale(10),
    elevation: 8,
  },
  inCallContainer: {
    flex: 1,
    backgroundColor: '#fff',
    alignItems: 'center',
    paddingTop: verticalScale(60),
    paddingBottom: verticalScale(40),
    paddingHorizontal: scale(20),
  },
  inCallBgTop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: '50%',
    backgroundColor: '#f5f7fa',
  },
  inCallBgBottom: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: '50%',
    backgroundColor: '#fff',
  },
  safeArea: {
    backgroundColor: '#fff',
  },
  floatingBackButton: {
    position: 'absolute',
    top: verticalScale(60),
    left: scale(20),
    zIndex: 1000,
    width: scale(40),
    height: verticalScale(40),
    borderRadius: scale(20),
    backgroundColor: 'rgba(0, 0, 0, 0.05)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  inCallHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: scale(20),
    paddingVertical: verticalScale(16),
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  callerInfo: {
    alignItems: 'center',
    marginBottom: verticalScale(20),
    zIndex: 1,
  },
  callerAvatar: {
    width: scale(80),
    height: verticalScale(80),
    borderRadius: scale(40),
    backgroundColor: 'rgba(59, 130, 246, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: verticalScale(12),
    borderWidth: scale(2),
    borderColor: 'rgba(59, 130, 246, 0.2)',
  },
  callerName: {
    fontSize: moderateScale(24),
    fontWeight: '700',
    color: '#000',
    marginBottom: verticalScale(4),
  },
  callDuration: {
    fontSize: moderateScale(16),
    color: '#999',
    fontVariant: ['tabular-nums'],
  },
  callControls: {
    flexDirection: 'row',
    justifyContent: 'space-evenly',
    width: '100%',
    marginBottom: verticalScale(24),
    zIndex: 1,
  },
  controlButton: {
    alignItems: 'center',
    gap: scale(4),
  },
  controlIconWrap: {
    width: scale(52),
    height: verticalScale(52),
    borderRadius: scale(26),
    backgroundColor: '#f0f2f5',
    justifyContent: 'center',
    alignItems: 'center',
  },
  controlIconWrapActive: {
    backgroundColor: '#3B82F6',
  },
  controlButtonActive: {
    backgroundColor: 'transparent',
  },
  controlLabel: {
    fontSize: moderateScale(11),
    color: '#999',
    fontWeight: '500',
  },
  controlLabelActive: {
    color: '#3B82F6',
  },
  hangUpButton: {
    width: scale(72),
    height: verticalScale(72),
    borderRadius: scale(36),
    backgroundColor: '#EF4444',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1,
    shadowColor: '#EF4444',
    shadowOffset: { width: 0, height: verticalScale(4) },
    shadowOpacity: 0.4,
    shadowRadius: scale(12),
    elevation: 8,
  },
  flowContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: scale(4),
  },
  flowColumn: {
    alignItems: 'center',
    marginBottom: verticalScale(12),
    zIndex: 1,
    gap: scale(6),
  },
  translationOffBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: scale(6),
    paddingHorizontal: scale(16),
    paddingVertical: verticalScale(8),
    borderRadius: scale(20),
    backgroundColor: 'rgba(239,68,68,0.1)',
    borderWidth: 1,
    borderColor: 'rgba(239,68,68,0.2)',
  },
  translationOffText: {
    fontSize: moderateScale(12),
    color: '#EF4444',
    fontWeight: '600',
  },
  flowDivider: {
    width: '60%',
    height: 1,
    backgroundColor: '#e0e0e0',
  },
  flowStep: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: scale(3),
    backgroundColor: 'rgba(0,0,0,0.04)',
    paddingHorizontal: scale(10),
    paddingVertical: verticalScale(6),
    borderRadius: scale(16),
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.06)',
  },
  flowStepActive: {
    backgroundColor: 'rgba(0,0,0,0.08)',
    borderColor: 'rgba(0,0,0,0.12)',
  },
  flowLabel: {
    fontSize: moderateScale(10),
    color: '#999',
    fontWeight: '600',
  },
  flowLabelActive: {
    color: '#000',
  },
  flowArrow: {
    paddingHorizontal: scale(2),
  },
  flowArrowActive: {
    opacity: 1,
  },
  statusMessageBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: scale(6),
    paddingHorizontal: scale(14),
    paddingVertical: verticalScale(8),
    borderRadius: scale(20),
    backgroundColor: 'rgba(0,0,0,0.04)',
    marginBottom: verticalScale(12),
    zIndex: 1,
  },
  statusMessageText: {
    fontSize: moderateScale(12),
    color: '#666',
    fontWeight: '500',
  },
  translationDirectionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: scale(6),
    paddingHorizontal: scale(14),
    paddingVertical: verticalScale(6),
    borderRadius: scale(16),
    backgroundColor: 'rgba(0,0,0,0.04)',
    marginBottom: verticalScale(14),
    zIndex: 1,
  },
  translationDirectionText: {
    fontSize: moderateScale(12),
    color: '#333',
    fontWeight: '600',
  },
  callEndedCard: {
    backgroundColor: '#f8f8f8',
    padding: scale(20),
    borderRadius: scale(12),
    alignItems: 'center',
    marginBottom: verticalScale(20),
  },
  callEndedText: {
    fontSize: moderateScale(18),
    fontWeight: 'bold',
    color: '#000',
    marginBottom: verticalScale(8),
  },
  callEndedTime: {
    fontSize: moderateScale(16),
    color: '#666',
  },
  addContactButton: {
    backgroundColor: '#fff',
    paddingVertical: verticalScale(16),
    paddingHorizontal: scale(24),
    borderRadius: scale(12),
    borderWidth: 1,
    borderColor: '#e0e0e0',
    alignItems: 'center',
    marginBottom: verticalScale(30),
  },
  addContactButtonText: {
    fontSize: moderateScale(16),
    color: '#000',
    fontWeight: '600',
  },
  ratingSection: {
    alignItems: 'center',
    marginBottom: verticalScale(30),
  },
  ratingLabel: {
    fontSize: moderateScale(16),
    color: '#000',
    marginBottom: verticalScale(16),
  },
  starsContainer: {
    flexDirection: 'row',
    gap: scale(8),
  },
  costSection: {
    backgroundColor: '#f8f8f8',
    padding: scale(20),
    borderRadius: scale(12),
    marginBottom: verticalScale(30),
  },
  costRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: verticalScale(12),
  },
  costLabel: {
    fontSize: moderateScale(16),
    color: '#000',
  },
  costValue: {
    fontSize: moderateScale(16),
    fontWeight: 'bold',
    color: '#000',
  },
  backToHomeButton: {
    backgroundColor: '#3B82F6',
    paddingVertical: verticalScale(16),
    borderRadius: scale(12),
    alignItems: 'center',
    marginBottom: verticalScale(40),
  },
  backToHomeButtonText: {
    color: '#fff',
    fontSize: moderateScale(18),
    fontWeight: '600',
  },

  // ── In-Call Transcript ──
  transcriptContainer: {
    flex: 1,
    alignSelf: 'stretch',
    backgroundColor: '#f8f9fb',
    borderRadius: scale(16),
    padding: scale(14),
    marginBottom: verticalScale(16),
    zIndex: 1,
    borderWidth: 1,
    borderColor: '#e8ecf0',
  },
  transcriptHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: scale(6),
    marginBottom: verticalScale(12),
  },
  transcriptTitle: {
    fontSize: moderateScale(12),
    fontWeight: '700',
    color: '#999',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    flex: 1,
  },
  transcriptEmptyText: {
    fontSize: moderateScale(13),
    color: '#bbb',
  },
  transcriptBubble: {
    backgroundColor: '#fff',
    borderRadius: scale(12),
    padding: scale(12),
    marginBottom: verticalScale(8),
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: scale(3),
    elevation: 1,
  },
  transcriptBubbleHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: scale(4),
    marginBottom: verticalScale(6),
  },
  transcriptBubbleRole: {
    fontSize: moderateScale(11),
    fontWeight: '600',
    color: '#666',
  },
  transcriptBubbleLang: {
    fontSize: moderateScale(10),
    color: '#bbb',
    fontWeight: '500',
  },
  transcriptBubbleLangLabel: {
    fontSize: moderateScale(10),
    color: '#93C5FD',
    fontWeight: '600',
    marginBottom: verticalScale(3),
  },
  translatingDot: {
    fontSize: moderateScale(14),
    color: '#F59E0B',
  },
  transcriptEmpty: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: verticalScale(30),
    gap: scale(8),
  },
  transcriptBubbleRoleMine: {
    color: '#60A5FA',
  },
  transcriptBubbleRoleTheirs: {
    color: '#FBBF24',
  },
  transcriptBubbleOriginal: {
    fontSize: moderateScale(14),
    color: '#333',
    marginBottom: verticalScale(4),
  },
  transcriptBubbleDivider: {
    height: 1,
    backgroundColor: '#f0f0f0',
    marginVertical: verticalScale(6),
  },
  transcriptBubbleTransRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: scale(4),
  },
  transcriptBubbleTranslated: {
    fontSize: moderateScale(13),
    color: '#93C5FD',
    fontWeight: '500',
    flex: 1,
  },

  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderTopLeftRadius: scale(20),
    borderTopRightRadius: scale(20),
    maxHeight: '70%',
    minHeight: '50%',
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
    fontSize: moderateScale(18),
    fontWeight: 'bold',
    color: '#000',
    flex: 1,
  },
  closeButton: {
    padding: scale(4),
  },
  languageList: {
    flex: 1,
  },
  languageItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: scale(20),
    paddingVertical: verticalScale(16),
    borderBottomWidth: 1,
    borderBottomColor: '#f8f8f8',
  },
  languageItemSelected: {
    backgroundColor: '#f0f8ff',
  },
  languageItemText: {
    fontSize: moderateScale(16),
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
    borderTopWidth: scale(2),
    borderTopColor: '#e0e0e0',
    backgroundColor: '#f8f8f8',
    paddingVertical: verticalScale(16),
    paddingHorizontal: scale(20),
  },
  addVoiceButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: verticalScale(12),
    paddingHorizontal: scale(16),
    backgroundColor: '#fff',
    borderRadius: scale(12),
    marginBottom: verticalScale(8),
    borderWidth: 1,
    borderColor: '#3B82F6',
  },
  addVoiceButtonText: {
    fontSize: moderateScale(16),
    color: '#3B82F6',
    fontWeight: '600',
    marginLeft: scale(12),
    flex: 1,
  },
  addVoiceDivider: {
    height: verticalScale(8),
  },
  recordedVoiceItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingRight: scale(8),
  },
  voicePlayBtn: {
    padding: scale(4),
    marginRight: scale(4),
  },
  voiceDeleteBtn: {
    padding: scale(4),
  },
  // ── Add Contact Modal (full-page) ──
  addContactFullModal: {
    flex: 1,
    backgroundColor: '#fff',
  },
  addContactFullHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: scale(20),
    paddingVertical: verticalScale(14),
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  addContactFullTitle: {
    fontSize: moderateScale(18),
    fontWeight: '700',
    color: '#000',
  },
  addContactFullClose: {
    width: scale(32),
    height: verticalScale(32),
    borderRadius: scale(16),
    backgroundColor: '#f0f0f0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  addContactForm: {
    flex: 1,
    paddingHorizontal: scale(24),
    paddingTop: verticalScale(24),
  },
  addContactLabel: {
    fontSize: moderateScale(14),
    fontWeight: '600',
    color: '#333',
    marginBottom: verticalScale(8),
    marginTop: verticalScale(12),
  },
  addContactPhoneRow: {
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
  addContactFlag: {
    fontSize: moderateScale(24),
    marginRight: scale(10),
  },
  addContactInput: {
    flex: 1,
    fontSize: moderateScale(16),
    color: '#111',
  },
  addContactSaveContactBtn: {
    backgroundColor: '#3B82F6',
    borderRadius: scale(14),
    paddingVertical: verticalScale(16),
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: verticalScale(32),
  },
  addContactSaveContactBtnDisabled: {
    backgroundColor: '#A0C4FF',
  },
  addContactSaveContactText: {
    fontSize: moderateScale(16),
    fontWeight: '700',
    color: '#fff',
  },

  // ── Test Call Button ──
  testCallBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: verticalScale(16),
    paddingVertical: verticalScale(8),
    paddingHorizontal: scale(16),
    borderRadius: scale(20),
    backgroundColor: '#f0f0f0',
  },
  testCallBtnText: {
    fontSize: moderateScale(13),
    color: '#666',
    marginLeft: 6,
  },

  // ── Incoming Call Screen ──
  incomingContainer: {
    flex: 1,
    backgroundColor: '#1A1A2E',
  },
  incomingContent: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: scale(32),
  },
  incomingAvatar: {
    width: scale(100),
    height: scale(100),
    borderRadius: scale(50),
    backgroundColor: '#3B82F6',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: verticalScale(24),
  },
  incomingName: {
    fontSize: moderateScale(28),
    fontWeight: '700',
    color: '#fff',
    marginBottom: verticalScale(8),
  },
  incomingStatus: {
    fontSize: moderateScale(16),
    color: 'rgba(255,255,255,0.6)',
    marginBottom: verticalScale(60),
  },
  incomingActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: scale(60),
  },
  declineBtn: {
    alignItems: 'center',
  },
  declineCircle: {
    width: scale(64),
    height: scale(64),
    borderRadius: scale(32),
    backgroundColor: '#EF4444',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: verticalScale(8),
  },
  answerBtn: {
    alignItems: 'center',
  },
  answerCircle: {
    width: scale(64),
    height: scale(64),
    borderRadius: scale(32),
    backgroundColor: '#34C759',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: verticalScale(8),
  },
  incomingActionLabel: {
    fontSize: moderateScale(14),
    color: 'rgba(255,255,255,0.8)',
  },
});

export default CallScreen;
