import * as Speech from 'expo-speech';
import { LANGUAGE_CODES } from './translationService';
import { speakWithElevenLabs, isElevenLabsConfigured } from './elevenLabsService';

// Per language — ensures exactly 5 male + 5 female options
const LANGUAGE_VOICES: Record<string, { male: string[]; female: string[] }> = {
  'English': {
    male: ['com.apple.voice.compact.en-GB.Daniel', 'com.apple.voice.compact.en-US.Alex', 'com.apple.voice.compact.en-US.Fred', 'com.apple.voice.compact.en-GB.Richard', 'com.apple.voice.compact.en-GB.Oliver'],
    female: ['com.apple.voice.compact.en-GB.Serena', 'com.apple.voice.compact.en-US.Samantha', 'com.apple.voice.compact.en-AU.Karen', 'com.apple.voice.compact.en-IE.Moira', 'com.apple.voice.compact.en-ZA.Tessa'],
  },
  'Spanish': {
    male: ['com.apple.voice.compact.es-ES.Jorge', 'com.apple.voice.compact.es-ES.Jose'],
    female: ['com.apple.voice.compact.es-ES.Monica', 'com.apple.voice.compact.es-ES.Elena', 'com.apple.voice.compact.es-MX.Paula'],
  },
  'French': {
    male: ['com.apple.voice.compact.fr-FR.Thomas'],
    female: ['com.apple.voice.compact.fr-FR.Amelie', 'com.apple.voice.compact.fr-FR.Julie', 'com.apple.voice.compact.fr-FR.Marie'],
  },
  'German': {
    male: ['com.apple.voice.compact.de-DE.Markus'],
    female: ['com.apple.voice.compact.de-DE.Anna', 'com.apple.voice.compact.de-DE.Petra', 'com.apple.voice.compact.de-DE.Maren'],
  },
  'Italian': {
    male: ['com.apple.voice.compact.it-IT.Luca'],
    female: ['com.apple.voice.compact.it-IT.Alice', 'com.apple.voice.compact.it-IT.Federica'],
  },
  'Portuguese': {
    male: ['com.apple.voice.compact.pt-BR.Felipe'],
    female: ['com.apple.voice.compact.pt-BR.Luciana', 'com.apple.voice.compact.pt-BR.Catarina', 'com.apple.voice.compact.pt-PT.Maria'],
  },
  'Japanese': {
    male: ['com.apple.voice.compact.ja-JP.Otoya'],
    female: ['com.apple.voice.compact.ja-JP.Kyoko'],
  },
  'Chinese': {
    male: [],
    female: ['com.apple.voice.compact.zh-CN.Tingting'],
  },
};

const EFFECT_PRESETS: Record<string, { pitch?: number; rate?: number }> = {
  'Deep Voice': { pitch: 0.6, rate: 0.75 },
  'High Voice': { pitch: 1.4, rate: 0.85 },
  'Robotic Voice': { pitch: 0.3, rate: 1.5 },
};

const LANGUAGE_PITCH: Record<string, number> = {
  'English': 1.0, 'Spanish': 0.95, 'French': 0.95, 'German': 0.9,
  'Italian': 0.95, 'Portuguese': 0.95, 'Chinese': 1.1, 'Japanese': 1.0,
  'Korean': 1.0, 'Arabic': 0.9, 'Hindi': 1.0, 'Russian': 0.85,
  'Dutch': 1.0, 'Swedish': 1.0, 'Norwegian': 1.0, 'Danish': 1.0,
  'Finnish': 1.0, 'Polish': 0.9, 'Czech': 0.95, 'Turkish': 1.05,
  'Greek': 0.9, 'Hebrew': 1.0, 'Thai': 1.1, 'Vietnamese': 1.05,
  'Indonesian': 1.0, 'Malay': 1.0,
};

const GENDER_PITCH_OFFSET: Record<string, number> = {
  'Default': 0, 'Male': -0.3, 'Female': 0.25,
};

type VoiceGender = 'Default' | 'Male' | 'Female';

// Cache of installed voices, keyed by language code prefix
let installedVoiceMap: Record<string, Speech.Voice[]> | null = null;

export async function initVoices(): Promise<void> {
  try {
    const voices = await Speech.getAvailableVoicesAsync();
    installedVoiceMap = {};
    for (const v of voices) {
      const prefix = v.language.split('-')[0];
      if (!installedVoiceMap[prefix]) installedVoiceMap[prefix] = [];
      installedVoiceMap[prefix]!.push(v);
    }
  } catch {
    installedVoiceMap = {};
  }
}

function extractVoiceName(voiceId: string): string {
  return voiceId.split('.').pop() || voiceId;
}

export function getVoiceDisplayName(voiceId: string): string {
  return extractVoiceName(voiceId);
}

export function getVoiceOptions(language: string): { key: string; label: string }[] {
  const options: { key: string; label: string }[] = [];
  const langVoices = LANGUAGE_VOICES[language];

  if (langVoices?.female?.length) {
    options.push({ key: 'Default', label: `${extractVoiceName(langVoices.female[0])} (Auto)` });
  } else if (langVoices?.male?.length) {
    options.push({ key: 'Default', label: `${extractVoiceName(langVoices.male[0])} (Auto)` });
  } else {
    options.push({ key: 'Default', label: 'Default' });
  }

  if (langVoices?.male?.length) {
    options.push({ key: 'Male', label: extractVoiceName(langVoices.male[0]) });
  }
  if (langVoices?.female?.length) {
    options.push({ key: 'Female', label: extractVoiceName(langVoices.female[0]) });
  }

  options.push({ key: 'Deep Voice', label: 'Deep Voice' });
  options.push({ key: 'High Voice', label: 'High Voice' });
  options.push({ key: 'Robotic Voice', label: 'Robotic Voice' });

  return options;
}

const MALE_NAMES = /daniel|jorge|thomas|markus|luca|felipe|otoya|maged|xander|alex|fred|bruce|richard|tom|hector|eddy|junior|rishi|aaron|nick|oliver|jack|harry|james|william|henry|noah|liam|mason|ethan|logan|lucas|ben|victor|sam|ray|sasha|mikhail|hakon|magnus|nikolai|dmitri|eitan|matteo|giovanni|paolo/i;
const FEMALE_NAMES = /serena|monica|amelie|anna|alice|luciana|tingting|kyoko|yuna|lekh|milena|alva|nora|ida|sanna|ewa|zuzana|aylin|melina|carmit|kanya|ngan|damai|zhiyu|samantha|karen|susan|victoria|vicki|alexa|ava|emma|olivia|sophia|isabella|mia|charlotte|amelia|harper|evelyn|ella|avery|abigail|emily|ella|aaliyah|zoe|elena|maria|catarina|tessa|bella|aisha|fatima|layla|nadia|sarah|nina|lena|mila|sonia|maya|julia|clara|leah|stella|iris|hannah|sophie|chantal|marie|julie|helena|paula|maren|daria|moira/i;

// extra known voices to pad any language to 5 male + 5 female
const EXTRA_MALE = ['com.apple.voice.compact.en-US.Nick', 'com.apple.voice.compact.en-US.Ray', 'com.apple.voice.compact.en-US.Tom', 'com.apple.ttsbundle.Daniel-compact', 'com.apple.ttsbundle.Alex-compact', 'com.apple.ttsbundle.Fred-compact'];
const EXTRA_FEMALE = ['com.apple.voice.compact.en-US.Ava', 'com.apple.voice.compact.en-US.Emma', 'com.apple.voice.compact.en-US.Olivia', 'com.apple.ttsbundle.Samantha-compact', 'com.apple.ttsbundle.Karen-compact', 'com.apple.ttsbundle.Serena-compact'];

// Returns exactly 10 voice options (5 male + 5 female) per language, plus gender tag
export async function getInstalledVoiceOptions(language: string): Promise<{ identifier: string; name: string; gender: 'male' | 'female'; quality: string }[]> {
  if (!installedVoiceMap) await initVoices();

  const langCode = LANGUAGE_CODES[language] || 'en';
  const prefix = langCode.split('-')[0];
  const candidates = installedVoiceMap?.[prefix] || [];

  const maleResult: { identifier: string; name: string; gender: 'male'; quality: string }[] = [];
  const femaleResult: { identifier: string; name: string; gender: 'female'; quality: string }[] = [];

  const seen = new Set<string>();

  // 1. Classify installed voices by gender
  for (const v of candidates) {
    const searchStr = `${v.identifier} ${v.name}`;
    if (MALE_NAMES.test(searchStr)) {
      if (maleResult.length < 5 && !seen.has(v.identifier)) {
        maleResult.push({ identifier: v.identifier, name: extractVoiceName(v.identifier), gender: 'male', quality: v.quality });
        seen.add(v.identifier);
      }
    } else if (FEMALE_NAMES.test(searchStr)) {
      if (femaleResult.length < 5 && !seen.has(v.identifier)) {
        femaleResult.push({ identifier: v.identifier, name: extractVoiceName(v.identifier), gender: 'female', quality: v.quality });
        seen.add(v.identifier);
      }
    }
  }

  // 2. Pad with hardcoded male voices for this language
  const langMale = LANGUAGE_VOICES[language]?.male || [];
  for (const id of langMale) {
    if (maleResult.length >= 5) break;
    if (!seen.has(id)) {
      maleResult.push({ identifier: id, name: extractVoiceName(id), gender: 'male', quality: 'Enhanced' });
      seen.add(id);
    }
  }

  // 3. Pad with extra male voices
  for (const id of EXTRA_MALE) {
    if (maleResult.length >= 5) break;
    if (!seen.has(id)) {
      maleResult.push({ identifier: id, name: extractVoiceName(id), gender: 'male', quality: 'Enhanced' });
      seen.add(id);
    }
  }

  // 4. Pad with hardcoded female voices for this language
  const langFemale = LANGUAGE_VOICES[language]?.female || [];
  for (const id of langFemale) {
    if (femaleResult.length >= 5) break;
    if (!seen.has(id)) {
      femaleResult.push({ identifier: id, name: extractVoiceName(id), gender: 'female', quality: 'Enhanced' });
      seen.add(id);
    }
  }

  // 5. Pad with extra female voices
  for (const id of EXTRA_FEMALE) {
    if (femaleResult.length >= 5) break;
    if (!seen.has(id)) {
      femaleResult.push({ identifier: id, name: extractVoiceName(id), gender: 'female', quality: 'Enhanced' });
      seen.add(id);
    }
  }

  return [...maleResult, ...femaleResult];
}

// Dynamically find the best installed voice for the given language & gender
async function findVoice(gender: string, language: string): Promise<string | undefined> {
  if (!installedVoiceMap) await initVoices();

  const langCode = LANGUAGE_CODES[language] || 'en';
  const prefix = langCode.split('-')[0];

  const candidates = installedVoiceMap?.[prefix];
  if (!candidates || candidates.length === 0) return undefined;

  let male: Speech.Voice | undefined;
  let female: Speech.Voice | undefined;

  for (const v of candidates) {
    const searchStr = `${v.identifier} ${v.name}`;
    if (!male && MALE_NAMES.test(searchStr)) male = v;
    if (!female && FEMALE_NAMES.test(searchStr)) female = v;
    if (male && female) break;
  }

  if (gender === 'Male' && male) return male.identifier;
  if (gender === 'Female' && female) return female.identifier;

  if (gender === 'Male' && female && !male) return female.identifier;
  if (gender === 'Female' && male && !female) return male.identifier;

  return candidates[0].identifier;
}

let currentQueue: string[] = [];
let isSpeaking = false;

function isRecordedVoice(voiceName: string): boolean {
  return voiceName.includes('(Recorded)');
}

function getPresetVoiceName(voiceName: string): string {
  return voiceName.replace(' (Recorded)', '').trim();
}

export async function speakTranslation(
  text: string,
  language: string,
  voiceName: string = 'Default',
): Promise<void> {
  if (!text.trim()) return;

  const presetName = getPresetVoiceName(voiceName);

  if (isElevenLabsConfigured()) {
    const ok = await speakWithElevenLabs(text, presetName);
    if (ok) {
      isSpeaking = false;
      processQueue();
      return;
    }
  }

  const isEffect = EFFECT_PRESETS[presetName];
  const langCode = language === 'English' ? 'en-GB' : (LANGUAGE_CODES[language] || 'en');

  let voice: string | undefined;
  let pitch: number | undefined;
  const rate = 0.85;

  if (isEffect) {
    pitch = isEffect.pitch;
  } else {
    const basePitch = LANGUAGE_PITCH[language] ?? 1.0;
    const genderOffset = GENDER_PITCH_OFFSET[presetName] ?? 0;
    pitch = Math.max(0.3, Math.min(2.0, basePitch + genderOffset));

    const isDirectVoice = presetName.includes('.') && installedVoiceMap &&
      Object.values(installedVoiceMap).some(arr => arr.some(v => v.identifier === presetName));

    if (isDirectVoice) {
      voice = presetName;
    } else {
      const found = await findVoice(presetName, language);
      if (found) {
        voice = found;
      }
    }
  }

  return new Promise<void>((resolve) => {
    let resolved = false;
    const finish = () => {
      if (resolved) return;
      resolved = true;
      isSpeaking = false;
      processQueue();
      resolve();
    };

    const timeout = setTimeout(finish, 8000);

    try {
      const speakOptions: Speech.SpeechOptions = {
        language: langCode,
        rate,
        useApplicationAudioSession: false,
        ...(voice ? { voice } : {}),
        ...(pitch !== undefined ? { pitch } : {}),
        onDone: () => {
          clearTimeout(timeout);
          finish();
        },
        onError: () => {
          clearTimeout(timeout);
          finish();
        },
        onStart: () => {
          isSpeaking = true;
        },
      };
      Speech.speak(text, speakOptions);
    } catch {
      clearTimeout(timeout);
      finish();
    }
  });
}

export function stopSpeaking(): void {
  currentQueue = [];
  Speech.stop();
  isSpeaking = false;
}

export function queueTranslation(
  text: string,
  language: string,
  voiceName: string = 'Default',
): void {
  currentQueue.push(JSON.stringify({ text, language, voiceName }));
  if (!isSpeaking) {
    processQueue();
  }
}

async function processQueue(): Promise<void> {
  if (currentQueue.length === 0) return;
  const item = JSON.parse(currentQueue.shift()!);
  await speakTranslation(item.text, item.language, item.voiceName);
}

export function clearQueue(): void {
  currentQueue = [];
}

export { isSpeaking as isTtsSpeaking };
