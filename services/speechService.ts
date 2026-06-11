import { LANGUAGE_CODES } from './translationService';

let ExpoSpeechRecognitionModule: any = null;
let useSpeechRecognitionEventHook: any = null;

try {
  const mod = require('expo-speech-recognition');
  ExpoSpeechRecognitionModule = mod.ExpoSpeechRecognitionModule;
  useSpeechRecognitionEventHook = mod.useSpeechRecognitionEvent;
} catch {
  console.warn(
    'expo-speech-recognition native module not found. ' +
    'Speech recognition requires a development build (npx expo run:ios or npx expo run:android). ' +
    'Falling back to mock implementation.',
  );
}

export type SpeechRecognitionResult = {
  transcript: string;
  isFinal: boolean;
  confidence: number;
};

export type SpeechRecognitionHandler = {
  onResult?: (result: SpeechRecognitionResult) => void;
  onError?: (error: string) => void;
  onSpeechStart?: () => void;
  onSpeechEnd?: () => void;
  onStart?: () => void;
  onEnd?: () => void;
};

let currentHandler: SpeechRecognitionHandler | null = null;
let isRecognizing = false;
let mockTimer: ReturnType<typeof setTimeout> | null = null;

function getLangCode(language: string): string {
  return LANGUAGE_CODES[language] || 'en-US';
}

export async function startListening(
  language: string,
  handler: SpeechRecognitionHandler,
): Promise<void> {
  if (isRecognizing) {
    await stopListening();
  }

  currentHandler = handler;
  isRecognizing = true;

  const langCode = getLangCode(language);

  if (ExpoSpeechRecognitionModule) {
    try {
      ExpoSpeechRecognitionModule.start({
        lang: langCode,
        interimResults: true,
        continuous: false,
        maxAlternatives: 1,
        addsPunctuation: true,
        volumeChangeEventOptions: { enabled: true, intervalMillis: 100 },
      });
      return;
    } catch (e) {
      console.warn('Native speech recognition failed, using mock:', e);
    }
  }

  startMockRecognition(handler);
}

function startMockRecognition(handler: SpeechRecognitionHandler): void {
  const mockPhrases = [
    'Hello, how are you?',
    'I am doing great, thanks!',
    'This is a test message.',
    'Can you hear me?',
    'Let us meet tomorrow.',
  ];

  let phraseIndex = 0;

  handler.onStart?.();
  handler.onSpeechStart?.();

  const speakInterval = () => {
    if (!isRecognizing || phraseIndex >= mockPhrases.length) {
      handler.onSpeechEnd?.();
      handler.onEnd?.();
      return;
    }

    const phrase = mockPhrases[phraseIndex];

    handler.onResult?.({
      transcript: phrase,
      isFinal: true,
      confidence: 0.95,
    });

    phraseIndex++;

    if (phraseIndex < mockPhrases.length) {
      handler.onSpeechEnd?.();
      mockTimer = setTimeout(() => {
        if (isRecognizing) {
          handler.onSpeechStart?.();
          speakInterval();
        }
      }, 2000);
    } else {
      handler.onSpeechEnd?.();
      handler.onEnd?.();
      isRecognizing = false;
    }
  };

  setTimeout(speakInterval, 1500);
}

export async function stopListening(): Promise<void> {
  isRecognizing = false;
  if (mockTimer) {
    clearTimeout(mockTimer);
    mockTimer = null;
  }
  if (ExpoSpeechRecognitionModule) {
    try {
      ExpoSpeechRecognitionModule.stop();
    } catch {
      try {
        ExpoSpeechRecognitionModule.abort();
      } catch {}
    }
  }
  currentHandler = null;
}

export function abortListening(): void {
  isRecognizing = false;
  if (mockTimer) {
    clearTimeout(mockTimer);
    mockTimer = null;
  }
  if (ExpoSpeechRecognitionModule) {
    try {
      ExpoSpeechRecognitionModule.abort();
    } catch {}
  }
  currentHandler = null;
}

export function isListening(): boolean {
  return isRecognizing;
}

export { useSpeechRecognitionEventHook as useSpeechRecognitionEvent };
