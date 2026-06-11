import { Audio } from 'expo-av';

let ringtoneSound: Audio.Sound | null = null;
let currentRingtoneIndex = 0;

type Note = { f: number; d: number; a?: number };

const R = 0;
const C3 = 130.81, D3 = 146.83, E3 = 164.81, F3 = 174.61, G3 = 196.00, A3 = 220.00, B3 = 246.94;
const C4 = 261.63, D4 = 293.66, E4 = 329.63, F4 = 349.23, G4 = 392.00, A4 = 440.00, B4 = 493.88;
const C5 = 523.25, D5 = 587.33, E5 = 659.25, F5 = 698.46, G5 = 783.99, A5 = 880.00, B5 = 987.77;
const C6 = 1046.5, D6 = 1174.66, E6 = 1318.51, F6 = 1396.91, G6 = 1567.98, A6 = 1760.00;

export const RINGTONES: { name: string; notes: Note[] }[] = [
  {
    name: 'Electro',
    notes: [
      { f: E5, d: 0.15 }, { f: D5, d: 0.15 },
      { f: R, d: 0.1 },
      { f: E5, d: 0.15 }, { f: D5, d: 0.15 },
      { f: R, d: 0.3 },
    ],
  },
  {
    name: 'Dance',
    notes: [
      { f: C5, d: 0.1, a: 0.4 }, { f: E5, d: 0.1, a: 0.4 }, { f: G5, d: 0.1, a: 0.4 },
      { f: R, d: 0.05 },
      { f: C5, d: 0.1, a: 0.4 }, { f: E5, d: 0.1, a: 0.4 }, { f: G5, d: 0.1, a: 0.4 },
      { f: R, d: 0.05 },
      { f: C5, d: 0.1 }, { f: D5, d: 0.1 }, { f: E5, d: 0.1 },
      { f: R, d: 0.1 },
      { f: G5, d: 0.15, a: 0.35 }, { f: E5, d: 0.15, a: 0.35 },
      { f: R, d: 0.2 },
    ],
  },
  {
    name: 'Hip Hop',
    notes: [
      { f: D3, d: 0.2, a: 0.45 }, { f: R, d: 0.1 },
      { f: D3, d: 0.1, a: 0.45 }, { f: R, d: 0.1 },
      { f: G3, d: 0.15, a: 0.35 },
      { f: R, d: 0.15 },
      { f: D3, d: 0.2, a: 0.45 }, { f: R, d: 0.1 },
      { f: A3, d: 0.15, a: 0.3 },
      { f: R, d: 0.25 },
    ],
  },
  {
    name: 'Pop',
    notes: [
      { f: G4, d: 0.12 }, { f: A4, d: 0.12 }, { f: C5, d: 0.12 }, { f: D5, d: 0.12 },
      { f: R, d: 0.12 },
      { f: G4, d: 0.12 }, { f: A4, d: 0.12 }, { f: C5, d: 0.12 }, { f: D5, d: 0.15 },
      { f: R, d: 0.1 },
      { f: G5, d: 0.2, a: 0.3 }, { f: R, d: 0.15 },
      { f: D5, d: 0.12 }, { f: C5, d: 0.12 }, { f: A4, d: 0.12 }, { f: G4, d: 0.2 },
      { f: R, d: 0.2 },
    ],
  },
  {
    name: 'Club',
    notes: [
      { f: D3, d: 0.15, a: 0.5 }, { f: R, d: 0.05 },
      { f: A4, d: 0.08, a: 0.3 }, { f: R, d: 0.05 },
      { f: D3, d: 0.15, a: 0.5 }, { f: R, d: 0.05 },
      { f: A4, d: 0.08, a: 0.3 }, { f: R, d: 0.05 },
      { f: D3, d: 0.15, a: 0.5 },
      { f: R, d: 0.08 },
      { f: G4, d: 0.12, a: 0.35 }, { f: R, d: 0.08 },
      { f: D3, d: 0.15, a: 0.5 }, { f: R, d: 0.05 },
      { f: A4, d: 0.12, a: 0.35 },
      { f: R, d: 0.1 },
      { f: D3, d: 0.2, a: 0.5 },
      { f: R, d: 0.2 },
    ],
  },
];

export function getActiveRingtone(): number {
  return currentRingtoneIndex;
}

export function setActiveRingtone(index: number): void {
  currentRingtoneIndex = Math.max(0, Math.min(index, RINGTONES.length - 1));
}

function buildWav(notes: Note[]): string {
  const sr = 16000;
  const totalDur = notes.reduce((s, n) => s + n.d, 0);
  const numSamples = Math.ceil(sr * totalDur);
  const NS = numSamples * 2;
  const buf = new Uint8Array(44 + NS);
  const v = new DataView(buf.buffer);

  const w = (o: number, s: string) => { for (let i = 0; i < s.length; i++) v.setUint8(o + i, s.charCodeAt(i)); };
  w(0, 'RIFF');
  v.setUint32(4, 44 + NS - 8, true);
  w(8, 'WAVE');
  w(12, 'fmt ');
  v.setUint32(16, 16, true);
  v.setUint16(20, 1, true);
  v.setUint16(22, 1, true);
  v.setUint32(24, sr, true);
  v.setUint32(28, sr * 2, true);
  v.setUint16(32, 2, true);
  v.setUint16(34, 16, true);
  w(36, 'data');
  v.setUint32(40, NS, true);

  let sampleIdx = 0;
  for (const note of notes) {
    const nSamples = Math.floor(sr * note.d);
    const amp = note.a ?? 0.3;
    for (let j = 0; j < nSamples; j++) {
      const t = j / sr;
      const envelope = note.f === R ? 0 : amp * Math.sin(Math.PI * t / note.d);
      const s = note.f === R ? 0 : Math.sin(2 * Math.PI * note.f * t) * envelope * 32767;
      v.setInt16(44 + sampleIdx * 2, s | 0, true);
      sampleIdx++;
    }
  }

  let bin = '';
  for (let i = 0; i < buf.length; i++) bin += String.fromCharCode(buf[i]);
  return btoa(bin);
}

export async function startRingtone(): Promise<void> {
  await stopRingtone();
  try {
    await Audio.setAudioModeAsync({
      allowsRecordingIOS: false,
      playsInSilentModeIOS: true,
      staysActiveInBackground: true,
      interruptionModeIOS: 1,
      shouldDuckAndroid: true,
    });

    const b64 = buildWav(RINGTONES[currentRingtoneIndex].notes);
    const { sound } = await Audio.Sound.createAsync(
      { uri: `data:audio/wav;base64,${b64}` },
      { shouldPlay: true, isLooping: true, volume: 1.0 },
    );
    ringtoneSound = sound;
  } catch (e: any) {
    console.warn('Ringtone error:', e?.message);
  }
}

export async function stopRingtone(): Promise<void> {
  if (ringtoneSound) {
    try {
      await ringtoneSound.stopAsync();
      await ringtoneSound.unloadAsync();
    } catch {}
    ringtoneSound = null;
  }
}
