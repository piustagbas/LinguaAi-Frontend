import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Audio } from 'expo-av';
import * as FileSystem from 'expo-file-system/legacy';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import { getInstalledVoiceOptions, speakTranslation } from '../services/ttsService';
import { getVolume } from '../services/volumeService';
import { speakWithElevenLabs, isElevenLabsConfigured, createClonedVoice, CELEBRITY_VOICES } from '../services/elevenLabsService';
import { voiceApi } from '../services/api';
import { scale, verticalScale, moderateScale } from '../utils/responsive';

const LANGUAGES = ['English', 'Spanish', 'French', 'German', 'Italian', 'Portuguese', 'Japanese', 'Chinese'];

interface VoiceSettingsScreenProps {
  navigation: any;
}

const VoiceSettingsScreen: React.FC<VoiceSettingsScreenProps> = ({ navigation }) => {
  const { user } = useAuth();
  const { colors, isDark } = useTheme();
  const userId = user?.id || 'anonymous';
  const [selectedLang, setSelectedLang] = useState('English');
  const [selectedVoice, setSelectedVoice] = useState('');
  const [installedVoices, setInstalledVoices] = useState<{ identifier: string; name: string; gender: string; quality: string }[]>([]);
  const [recordedVoices, setRecordedVoices] = useState<{ name: string; uri: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingInstance, setRecordingInstance] = useState<Audio.Recording | null>(null);
  const [recordingDuration, setRecordingDuration] = useState(0);
  const [playingVoiceUri, setPlayingVoiceUri] = useState<string | null>(null);
  const recordingTimerRef = useRef<NodeJS.Timeout | null>(null);
  const soundRef = useRef<Audio.Sound | null>(null);

  const RECORDED_VOICES_KEY = `@recorded_voices_${userId}`;
  const SELECTED_VOICE_KEY = `@settings_selected_voice_${userId}`;

  useEffect(() => {
    Audio.setAudioModeAsync({
      allowsRecordingIOS: false,
      playsInSilentModeIOS: true,
      staysActiveInBackground: false,
      interruptionModeIOS: 1,
      shouldDuckAndroid: true,
    });
    loadAll();
  }, []);

  useEffect(() => {
    loadVoicesForLang();
  }, [selectedLang]);

  const loadAll = async () => {
    try {
      const saved = await AsyncStorage.getItem(SELECTED_VOICE_KEY);
      if (saved) setSelectedVoice(saved);
      await loadRecordedVoices();
    } catch {}
    await loadVoicesForLang();
  };

  const loadRecordedVoices = async () => {
    try {
      const json = await AsyncStorage.getItem(RECORDED_VOICES_KEY);
      if (json) setRecordedVoices(JSON.parse(json));
    } catch {}
  };

  const saveRecordedVoices = async (voices: { name: string; uri: string }[]) => {
    await AsyncStorage.setItem(RECORDED_VOICES_KEY, JSON.stringify(voices));
    setRecordedVoices(voices);
  };

  const loadVoicesForLang = async () => {
    setLoading(true);
    try {
      const voices = await getInstalledVoiceOptions(selectedLang);
      setInstalledVoices(voices);
    } catch {}
    setLoading(false);
  };

  const selectVoice = async (identifier: string) => {
    setSelectedVoice(identifier);
    await AsyncStorage.setItem(SELECTED_VOICE_KEY, identifier);
  };

  const playVoiceSample = async (voiceIdentifier: string) => {
    try {
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: false,
        playsInSilentModeIOS: true,
        staysActiveInBackground: false,
        interruptionModeIOS: 1,
        shouldDuckAndroid: true,
      });
      const ok = await speakWithElevenLabs('Hello, this is my voice.', voiceIdentifier);
      if (!ok) {
        await speakTranslation('Hello, this is my voice.', selectedLang, voiceIdentifier);
      }
    } catch (e: any) {
      Alert.alert('Error', e?.message || 'Could not play voice sample.');
    }
  };

  const playRecordedSample = async (uri: string) => {
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
      await sound.setVolumeAsync(getVolume());
      setPlayingVoiceUri(uri);
    } catch (e: any) {
      Alert.alert('Playback Error', e?.message || 'Could not play recording.');
    }
  };

  const deleteRecordedVoice = async (uri: string) => {
    const filtered = recordedVoices.filter((v) => v.uri !== uri);
    await saveRecordedVoices(filtered);
    if (selectedVoice === uri) {
      setSelectedVoice('');
    }
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
      const { recording } = await Audio.Recording.createAsync(
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

      const fileInfo = await FileSystem.getInfoAsync(localUri);
      if (!fileInfo.exists || fileInfo.size === 0) {
        Alert.alert('Empty Recording', 'No audio data captured. Please check microphone and try again.');
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

      if (isElevenLabsConfigured()) {
        await createClonedVoice(localUri, name);
      }
    } catch (err: any) {
      if (localUri) {
        const name = `My Voice ${recordedVoices.length + 1}`;
        const newVoices = [...recordedVoices, { name, uri: localUri }];
        await saveRecordedVoices(newVoices);
      }
      setIsRecording(false);
      setRecordingDuration(0);
      setRecordingInstance(null);
    }
  };

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  const isSelected = (id: string) => selectedVoice === id;

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color="#000" />
        </TouchableOpacity>
        <Text style={styles.title}>Change Voice</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView style={styles.content}>
        <Text style={styles.sectionTitle}>Language</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.langRow}>
          {LANGUAGES.map((lang) => (
            <TouchableOpacity
              key={lang}
              style={[styles.langChip, selectedLang === lang && styles.langChipActive]}
              onPress={() => setSelectedLang(lang)}
            >
              <Text style={[styles.langChipText, selectedLang === lang && styles.langChipTextActive]}>
                {lang}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        <Text style={styles.sectionTitle}>Voices</Text>
        {loading ? (
          <Text style={styles.loadingText}>Loading voices...</Text>
        ) : installedVoices.length === 0 ? (
          <Text style={styles.loadingText}>No voices installed for {selectedLang}. Download voices in your device settings.</Text>
        ) : (
          installedVoices.map((v) => {
            const active = isSelected(v.identifier);
            const genderIcon = v.gender === 'male' ? 'man' : v.gender === 'female' ? 'woman' : 'person';
            const genderColor = v.gender === 'male' ? '#3B82F6' : v.gender === 'female' ? '#EC4899' : '#666';
            return (
              <TouchableOpacity
                key={v.identifier}
                style={[styles.voiceItem, active && styles.voiceItemActive]}
                onPress={() => selectVoice(v.identifier)}
              >
                <View style={[styles.voiceIcon, { backgroundColor: genderColor + '20' }]}>
                  <Ionicons name={genderIcon} size={20} color={genderColor} />
                </View>
                <View style={styles.voiceInfo}>
                  <Text style={[styles.voiceName, active && styles.voiceNameSelected]}>{v.name}</Text>
                  <Text style={styles.voiceSub}>{v.gender} · {v.quality}</Text>
                </View>
                <TouchableOpacity style={styles.playBtn} onPress={() => playVoiceSample(v.identifier)}>
                  <Ionicons name="play-circle" size={32} color="#3B82F6" />
                </TouchableOpacity>
                {active && <Ionicons name="checkmark-circle" size={22} color="#3B82F6" style={{ marginLeft: 8 }} />}
              </TouchableOpacity>
            );
          })
        )}

        {recordedVoices.length > 0 && (
          <>
            <Text style={styles.sectionTitle}>Recorded Voices</Text>
            {recordedVoices.map((rv) => {
              const active = isSelected(rv.uri);
              return (
                <TouchableOpacity
                  key={rv.uri}
                  style={[styles.voiceItem, active && styles.voiceItemActive]}
                  onPress={() => selectVoice(rv.uri)}
                >
                  <View style={styles.voiceIcon}>
                    <Ionicons name="mic" size={20} color="#3B82F6" />
                  </View>
                  <Text style={[styles.voiceName, active && styles.voiceNameSelected]}>{rv.name}</Text>
                  <TouchableOpacity style={styles.playBtn} onPress={() => playRecordedSample(rv.uri)}>
                    <Ionicons name={playingVoiceUri === rv.uri ? 'pause-circle' : 'play-circle'} size={32} color="#3B82F6" />
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.deleteBtn} onPress={() => deleteRecordedVoice(rv.uri)}>
                    <Ionicons name="trash-outline" size={20} color="#EF4444" />
                  </TouchableOpacity>
                  {active && <Ionicons name="checkmark-circle" size={22} color="#3B82F6" style={{ marginLeft: 8 }} />}
                </TouchableOpacity>
              );
            })}
          </>
        )}

        <Text style={styles.sectionTitle}>Celebrity Voices</Text>
        {CELEBRITY_VOICES.map((name) => {
          const active = isSelected(name);
          return (
            <TouchableOpacity
              key={name}
              style={[styles.voiceItem, active && styles.voiceItemActive]}
              onPress={() => selectVoice(name)}
            >
              <View style={[styles.voiceIcon, { backgroundColor: '#F59E0B20' }]}>
                <Ionicons name="star" size={20} color="#F59E0B" />
              </View>
              <Text style={[styles.voiceName, active && styles.voiceNameSelected]}>{name}</Text>
              <TouchableOpacity style={styles.playBtn} onPress={() => playVoiceSample(name)}>
                <Ionicons name="play-circle" size={32} color="#3B82F6" />
              </TouchableOpacity>
              {active && <Ionicons name="checkmark-circle" size={22} color="#3B82F6" style={{ marginLeft: 8 }} />}
            </TouchableOpacity>
          );
        })}

        <View style={styles.actionContainer}>
          <TouchableOpacity
            style={styles.actionButton}
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
              color={isRecording ? '#EF4444' : '#3B82F6'}
            />
            <Text style={[styles.actionButtonText, isRecording && { color: '#EF4444' }]}>
              {isRecording ? `Stop Recording (${formatTime(recordingDuration)})` : 'Record Your Voice'}
            </Text>
          </TouchableOpacity>

          <View style={styles.actionDivider} />

          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => {
              Alert.alert('Celebrity Voices', 'Celebrity voice packs coming soon!');
            }}
          >
            <Ionicons name="star" size={24} color="#3B82F6" />
            <Text style={styles.actionButtonText}>Search Celebrity Voice</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: scale(20),
    paddingVertical: verticalScale(16),
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  title: { fontSize: moderateScale(20), fontWeight: 'bold', color: '#000' },
  content: { flex: 1, padding: scale(20) },
  sectionTitle: {
    fontSize: moderateScale(16),
    fontWeight: '700',
    color: '#000',
    marginBottom: verticalScale(12),
    marginTop: verticalScale(8),
  },
  langRow: { marginBottom: verticalScale(16) },
  langChip: {
    paddingHorizontal: scale(18),
    paddingVertical: verticalScale(10),
    borderRadius: scale(20),
    backgroundColor: '#f0f0f0',
    marginRight: scale(10),
  },
  langChipActive: { backgroundColor: '#3B82F6' },
  langChipText: { fontSize: moderateScale(14), color: '#666', fontWeight: '500' },
  langChipTextActive: { color: '#fff' },
  loadingText: { fontSize: moderateScale(14), color: '#666', textAlign: 'center', marginTop: verticalScale(20) },
  voiceItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8f8f8',
    padding: scale(14),
    borderRadius: scale(12),
    marginBottom: verticalScale(8),
  },
  voiceItemActive: {
    backgroundColor: '#EFF6FF',
    borderWidth: 1,
    borderColor: '#3B82F6',
  },
  voiceIcon: {
    width: scale(40),
    height: scale(40),
    borderRadius: scale(20),
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  voiceInfo: { flex: 1 },
  voiceName: { fontSize: moderateScale(16), color: '#000', fontWeight: '500' },
  voiceNameSelected: { color: '#3B82F6' },
  voiceSub: { fontSize: moderateScale(12), color: '#999', marginTop: 2 },
  playBtn: { padding: 4 },
  deleteBtn: { padding: 4, marginLeft: 4 },
  actionContainer: {
    marginTop: verticalScale(16),
    marginBottom: verticalScale(32),
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
    paddingTop: verticalScale(16),
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: verticalScale(14),
    paddingHorizontal: scale(4),
  },
  actionButtonText: {
    fontSize: moderateScale(15),
    color: '#3B82F6',
    fontWeight: '500',
    marginLeft: 12,
  },
  actionDivider: {
    height: 1,
    backgroundColor: '#f0f0f0',
    marginVertical: verticalScale(4),
    marginLeft: scale(36),
  },
});

export default VoiceSettingsScreen;
