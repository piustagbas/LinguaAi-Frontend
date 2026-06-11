import {
  readAsStringAsync,
  writeAsStringAsync,
  cacheDirectory,
  EncodingType,
} from 'expo-file-system/legacy';
import { Audio } from 'expo-av';
import { getVolume } from './volumeService';

const API_KEY = process.env.EXPO_PUBLIC_ELEVENLABS_API_KEY || '';
const API_BASE = 'https://api.elevenlabs.io/v1';

let clonedVoiceIds: Record<string, string> = {};

const ELEVENLABS_PRESET_VOICES: Record<string, string> = {
  'Default': '21m00Tcm4TlvDq8ikWAM',
  'Male': 'pNInz6obpgDQGcFmaJgB',
  'Female': '21m00Tcm4TlvDq8ikWAM',
  'Deep Voice': 'nPczCjzI2devNBz1zQrb',
  'High Voice': 'LcfcDJNUP1GQjkzn1xUU',
};

export const CELEBRITY_VOICES: string[] = [
  'Ronaldo',
  'Elon Musk',
  'Trump',
  'Morgan Freeman',
  'Joe Rogan',
  'Obama',
  'Taylor Swift',
  'David Attenborough',
];

function isConfigured(): boolean {
  return !!API_KEY;
}

async function playAudioStream(res: Response): Promise<boolean> {
  const buffer = await res.arrayBuffer();
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  const b64 = btoa(binary);
  const audioUri = cacheDirectory + `tts_${Date.now()}.mp3`;
  await writeAsStringAsync(audioUri, b64, {
    encoding: EncodingType.Base64,
  });

  const { sound } = await Audio.Sound.createAsync(
    { uri: audioUri },
    { shouldPlay: true },
  );
  await sound.setVolumeAsync(getVolume());
  await new Promise<void>((resolve) => {
    sound.setOnPlaybackStatusUpdate((status) => {
      if (status.isLoaded && !status.isPlaying) {
        sound.unloadAsync();
        resolve();
      }
    });
  });
  return true;
}

export async function speakWithElevenLabs(
  text: string,
  voiceName: string,
): Promise<boolean> {
  if (!isConfigured()) return false;

  const voiceId = clonedVoiceIds[voiceName] || ELEVENLABS_PRESET_VOICES[voiceName];
  if (!voiceId) return false;

  try {
    const res = await fetch(`${API_BASE}/text-to-speech/${voiceId}/stream`, {
      method: 'POST',
      headers: {
        'xi-api-key': API_KEY,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        text,
        model_id: 'eleven_turbo_v2_5',
        voice_settings: {
          stability: 0.7,
          similarity_boost: 0.75,
          style: 0.3,
          use_speaker_boost: true,
        },
      }),
    });

    if (!res.ok) return false;
    return await playAudioStream(res);
  } catch {
    return false;
  }
}

export async function createClonedVoice(
  audioUri: string,
  voiceName: string,
): Promise<string | null> {
  if (!isConfigured()) return null;

  try {
    const base64 = await readAsStringAsync(audioUri, {
      encoding: EncodingType.Base64,
    });

    const res = await fetch(`${API_BASE}/voices/add`, {
      method: 'POST',
      headers: {
        'xi-api-key': API_KEY,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        name: voiceName,
        files: [base64],
      }),
    });

    const data = await res.json();
    if (data.voice_id) {
      clonedVoiceIds[voiceName] = data.voice_id;
      return data.voice_id;
    }
    return null;
  } catch {
    return null;
  }
}

export async function speakWithClonedVoice(
  text: string,
  voiceName: string,
): Promise<boolean> {
  return speakWithElevenLabs(text, voiceName);
}

export function getClonedVoiceIds(): Record<string, string> {
  return { ...clonedVoiceIds };
}

export function setClonedVoiceIds(ids: Record<string, string>): void {
  clonedVoiceIds = { ...ids };
}

export { isConfigured as isElevenLabsConfigured };
